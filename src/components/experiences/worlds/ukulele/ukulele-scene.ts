// Three.js scene: a first-person view over a concert ukulele, looking from above the bridge up the neck.
// Everything that moves (strings, fingers, glow, sparks) is a pure function of the note events and the
// clock, so the picture always matches whatever the audio engine is playing.
//
// Coordinates (metres): origin at the saddle, +x to the player's right, +y up, the nut at z = -SCALE_LENGTH.
import * as THREE from 'three'

import type { Arrangement, NoteEvent } from './ukulele-arranger'
import {
  BODY_DEPTH,
  FRET_COUNT,
  R_HOLE,
  SCALE_LENGTH as S,
  STRING_RADIUS,
  Y_BOARD,
  Y_BRIDGE,
  Y_FRET,
  Y_HOLE,
  Y_NUT,
  fretZ,
  fretboardWidth,
  pluckZ,
  stringX,
} from './ukulele-geometry'
import { UkulelePost } from './ukulele-post'
import type { Theme } from './ukulele-theme'
import {
  TOP,
  fretboardTexture,
  mahoganyTexture,
  makeEnvironment,
  noteGlyph,
  rng,
  rosetteTexture,
  softSprite,
  spruceTexture,
} from './ukulele-textures'

const V3 = THREE.Vector3

const NS = 8 // samples on the nut-side segment
const NV = 64 // samples on the vibrating segment
const NP = NS + NV
const RING = 8
const PULL = 0.085 // seconds the fingertip spends drawing a string aside before each note

// three r152 (the prototype) scaled every punctual light by pi; r183 only has physical units.
const PI = Math.PI
// The legacy falloff was (1 - d / distance) ^ decay. These are its values at the distances this scene
// uses, applied as flat factors with decay 0 so the look carries over without an inverse-square collapse.
const KEY_FALLOFF = 0.78
const INNER_FALLOFF = 0.5

const WHITE = new THREE.Color(1, 1, 1)
const smooth = (a: number, b: number, k: number) => a + (b - a) * k
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x))
const sstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

/** Extrude a 2D shape (x across, y = distance from the saddle toward the nut) into the XZ plane. */
function plate(shape: THREE.Shape, depth: number, uvBox: [number, number, number, number]): THREE.ExtrudeGeometry {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 48 })
  geo.rotateX(-Math.PI / 2) // (x, y, z) -> (x, z, -y)
  const pos = geo.attributes.position
  const uv = geo.attributes.uv
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) - uvBox[0]) / (uvBox[1] - uvBox[0]), (-pos.getZ(i) - uvBox[2]) / (uvBox[3] - uvBox[2]))
  }
  uv.needsUpdate = true
  return geo
}

type Preset = { pos: [number, number, number]; look: [number, number, number]; fov: number; focusZ: number }

/** Camera presets, one picked per song section. Roll stays at zero so the neck always stands upright. */
const PRESETS: ReadonlyArray<Preset> = [
  { pos: [0.0, 0.16, 0.1], look: [0.0, 0.0, -0.15], fov: 58, focusZ: -0.12 }, // wide: whole instrument
  { pos: [0.0, 0.12, 0.04], look: [0.0, 0.0, -0.14], fov: 62, focusZ: -0.11 }, // hero: strings through the hole, up the neck
  { pos: [0.0, 0.13, 0.0], look: [0.0, 0.0, -0.21], fov: 60, focusZ: -0.2 }, // neck: over the fretting position
  { pos: [0.0, 0.09, 0.03], look: [0.0, 0.0, -0.11], fov: 62, focusZ: -0.1 }, // close: soundhole and strings
  { pos: [0.0, 0.2, 0.06], look: [0.0, 0.0, -0.18], fov: 54, focusZ: -0.15 }, // high: nearly straight down
]

export type SceneState = {
  /** Song time, seconds. */
  time: number
  beat: number
  /** Free-running clock, seconds. */
  clock: number
  /** 1 while music is running (real or the silent preview), else 0. */
  playing: number
  reducedMotion?: boolean
}

type Rig = {
  mainGeo: THREE.BufferGeometry
  haloGeo: THREE.BufferGeometry
  main: THREE.Mesh
  halo: THREE.Mesh
  mat: THREE.MeshPhysicalMaterial
  haloMat: THREE.ShaderMaterial
  fingerAlpha: number
  fingerFret: number
  fingerZ: number
  seen: number
}
type Marker = { glow: THREE.Sprite; pos: THREE.Vector3; press: number; energy: number }
type Bokeh = { s: THREE.Sprite; base: number; vy: number; phase: number; x: number; y: number; z: number }
type Mote = { s: THREE.Sprite; vy: number; vx: number; phase: number; rate: number; x: number; y: number; z: number }
type Spark = { s: THREE.Sprite; life: number; ttl: number; vx: number; vy: number; vz: number; size: number }
type Ripple = { m: THREE.Mesh; life: number; ttl: number; vel: number }
type NoteFx = { s: THREE.Sprite; life: number; ttl: number; x: number; y: number; z: number; sway: number; size: number }
type Motion = {
  pull: { up: number; amt: number; e: number } | null
  vib: { up: number; amt: number; age: number; vel: number; f1: number; tau: number } | null
}

export class UkuleleScene {
  readonly renderer: THREE.WebGLRenderer
  readonly scene = new THREE.Scene()
  readonly camera = new THREE.PerspectiveCamera(60, 9 / 16, 0.02, 3)
  private post: UkulelePost | null

  private fog = new THREE.FogExp2(0x0a0604, 0.9)
  private cam = { pos: new V3(...PRESETS[0].pos), look: new V3(...PRESETS[0].look), fov: 62, focusZ: -0.115, vel: new Float32Array(8) }
  private presetIdx = 0
  private arr: Arrangement | null = null
  private intensity = 0
  private theme!: Theme
  private tint = false
  private strCol: Array<THREE.Color> = []
  private envs = new Map<string, THREE.WebGLRenderTarget>()
  private shadowFrames = 3
  private disposed = false
  private viewW = 0
  private viewH = 0
  private viewShift = 0
  private fovScale = 1

  // lights
  private hemi!: THREE.HemisphereLight
  private key!: THREE.SpotLight
  private fill!: THREE.DirectionalLight
  private rim!: THREE.DirectionalLight
  private inner!: THREE.PointLight
  private keyBase = 1.35

  // materials the theme recolours, and every lit material (they all need an explicit envMap, see applyTheme)
  private mahogany!: THREE.MeshPhysicalMaterial
  private topMat!: THREE.MeshPhysicalMaterial
  private tableMat!: THREE.MeshStandardMaterial
  private nut!: THREE.Mesh
  private fretMats: Array<THREE.MeshStandardMaterial | null> = [null]
  private litMaterials: Array<THREE.MeshStandardMaterial> = []
  private grid!: THREE.Mesh

  private strs: Array<Rig> = []
  private lf: Array<Marker> = []
  private tips: Array<THREE.Sprite> = []
  private pressRings: Array<THREE.Mesh> = []
  private glowTex!: THREE.Texture
  private glowTexN!: THREE.Texture
  private sparkTex!: THREE.Texture
  private sparkTexN!: THREE.Texture
  private poolTex!: THREE.Texture
  private poolTexN!: THREE.Texture
  private noteTex: Array<THREE.Texture> = []
  private bokeh: Array<Bokeh> = []
  private motes: Array<Mote> = []
  private sparks: Array<Spark> = []
  private sparkNext = 0
  private ripples: Array<Ripple> = []
  private rippleNext = 0
  private notes: Array<NoteFx> = []
  private noteNext = 0
  private haze!: THREE.Mesh
  private focusPoint = new V3()

  private mw = new Float32Array(8)
  private mc = new Float32Array(8)
  private ms = new Float32Array(8)

  constructor(canvas: HTMLCanvasElement, theme: Theme, options: { post?: boolean } = {}) {
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: options.post === false, powerPreference: 'high-performance' }))
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    r.setClearColor(0x070504, 1)
    r.outputColorSpace = THREE.SRGBColorSpace
    r.shadowMap.enabled = true
    r.shadowMap.type = THREE.PCFShadowMap
    r.shadowMap.autoUpdate = false
    this.post = options.post === false ? null : new UkulelePost(r)
    if (this.post && !this.post.ok) this.post = null
    if (!this.post) {
      r.toneMapping = THREE.ACESFilmicToneMapping
      r.toneMappingExposure = 1.0
    }

    this.scene.background = new THREE.Color(0x070504)
    this.scene.fog = this.fog
    this.camera.layers.enable(1) // layer 1 = glow / sprites (kept out of the depth pass)

    this.buildLights()
    this.buildInstrument()
    this.buildTable()
    this.buildStrings()
    this.buildMarkers()
    this.buildFx()
    this.applyTheme(theme)
  }

  // ---- theme -----------------------------------------------------------------------------------
  /** Recolours lights, materials and effects in place; nothing is rebuilt except a cached env map. */
  applyTheme(th: Theme) {
    const C = (c: number) => new THREE.Color(c)
    this.theme = th
    const tint = th.id !== 'amber' // amber keeps its hand-tuned warm sprites; other themes tint neutral ones
    this.tint = tint
    let env = this.envs.get(th.id)
    if (!env) {
      env = makeEnvironment(this.renderer, th.env)
      this.envs.set(th.id, env)
    }
    this.scene.environment = env.texture
    // r163+ ignores material.envMapIntensity unless the material owns its envMap, so hand it over explicitly.
    this.litMaterials.forEach((m) => {
      m.envMap = env.texture
      m.needsUpdate = true
    })
    ;(this.scene.background as THREE.Color).set(th.bg)
    this.fog.color.set(th.fog)
    this.fog.density = th.fogDensity
    this.renderer.setClearColor(th.bg, 1)
    if (this.post) {
      this.post.clearColor.set(th.bg)
      Object.assign(this.post.params, { bloom: th.post.bloom, threshold: th.post.threshold, vig: th.post.vig })
      this.post.grade = th.post
    }
    this.hemi.color.set(th.hemi[0])
    this.hemi.groundColor.set(th.hemi[1])
    this.hemi.intensity = th.hemi[2] * PI
    this.key.color.set(th.key[0])
    this.keyBase = th.key[1] * PI * KEY_FALLOFF
    this.fill.color.set(th.fill[0])
    this.fill.intensity = th.fill[1] * PI
    this.rim.color.set(th.rim[0])
    this.rim.intensity = th.rim[1] * PI
    this.inner.color.set(th.inner)
    this.topMat.color.set(th.topTint)
    this.mahogany.color.set(th.woodTint)
    this.tableMat.color.set(th.table)
    this.tableMat.envMapIntensity = th.tableEnv
    this.tableMat.roughness = th.tableRough
    this.strCol = th.strings.map((c) => new THREE.Color(c))
    this.strs.forEach((st, i) => {
      st.mat.color.set(th.string)
      st.mat.emissive.set(tint ? this.strCol[i] : C(th.stringGlow))
      if (tint) (st.haloMat.uniforms.color.value as THREE.Color).copy(this.strCol[i])
      else (st.haloMat.uniforms.color.value as THREE.Color).setRGB(1.0, 0.7, 0.34)
    })
    this.fretMats.forEach((m) => m?.emissive.set(th.fret))
    ;(this.nut.material as THREE.MeshPhysicalMaterial).emissive.set(th.fret)
    this.lf.forEach((f, i) => {
      f.glow.material.map = tint ? this.glowTexN : this.glowTex
      f.glow.material.color.set(tint ? this.strCol[i] : 0xffffff)
      f.glow.material.needsUpdate = true
    })
    this.tips.forEach((sp, i) => {
      sp.material.map = tint ? this.glowTexN : this.glowTex
      sp.material.color.set(tint ? this.strCol[i].clone().lerp(WHITE, 0.35) : C(0xffffff))
      sp.material.needsUpdate = true
    })
    this.pressRings.forEach((m, i) => (m.material as THREE.MeshBasicMaterial).color.set(tint ? this.strCol[i] : C(0xffc27a)))
    this.sparks.forEach((p) => {
      p.s.material.map = tint ? this.sparkTexN : this.sparkTex
      p.s.material.color.setRGB(1, 0.82, 0.5)
      p.s.material.needsUpdate = true
    })
    this.motes.forEach((p) => {
      p.s.material.map = tint ? this.sparkTexN : this.sparkTex
      p.s.material.color.set(tint ? th.mote : C(0xffd99a))
      p.s.material.needsUpdate = true
    })
    this.ripples.forEach((rp) => (rp.m.material as THREE.MeshBasicMaterial).color.set(th.ripple))
    this.notes.forEach((n, i) => {
      n.s.material.map = this.noteTex[(tint ? 2 : 0) + (i % 2)]
      n.s.material.color.set(tint ? th.note : C(0xffcc80))
      n.s.material.needsUpdate = true
    })
    const r = rng(5)
    this.bokeh.forEach((p) =>
      p.s.material.color.setHSL(th.bokeh.hues[Math.floor(r() * th.bokeh.hues.length)] + r() * th.bokeh.spread, th.bokeh.sat, 0.62),
    )
    const hazeMat = this.haze.material as THREE.MeshBasicMaterial
    hazeMat.map = tint ? this.poolTexN : this.poolTex
    hazeMat.color.set(tint ? th.pool : 0xffffff)
    hazeMat.needsUpdate = true
    this.grid.visible = th.grid
    this.shadowFrames = 3
  }

  // ---- build -----------------------------------------------------------------------------------
  private buildLights() {
    const sc = this.scene
    this.hemi = new THREE.HemisphereLight(0xffe0b8, 0x1b0e07, 0.12 * PI)
    sc.add(this.hemi)
    const key = (this.key = new THREE.SpotLight(0xffdcae, 1.5 * PI * KEY_FALLOFF, 1.6, 0.55, 0.9, 0))
    key.position.set(-0.2, 0.3, 0.02)
    key.target.position.set(0.0, 0.0, -0.13)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.camera.near = 0.15
    key.shadow.camera.far = 0.9
    key.shadow.bias = -0.00025
    key.shadow.normalBias = 0.0005
    sc.add(key)
    sc.add(key.target)
    this.fill = new THREE.DirectionalLight(0xffc88a, 0.12 * PI)
    this.fill.position.set(0.3, 0.4, 0.3)
    sc.add(this.fill)
    this.rim = new THREE.DirectionalLight(0xffd8a8, 0.3 * PI)
    this.rim.position.set(0.25, 0.25, -0.6)
    sc.add(this.rim)
    // warm light living inside the body; it pulses with the music and lights the strings from below
    this.inner = new THREE.PointLight(0xff8a3a, 0.5 * PI * INNER_FALLOFF, 0.085, 0)
    this.inner.position.set(0, -0.018, -Y_HOLE)
    sc.add(this.inner)
  }

  private lit<T extends THREE.MeshStandardMaterial>(m: T): T {
    this.litMaterials.push(m)
    return m
  }

  private buildInstrument() {
    const g = new THREE.Group()
    this.scene.add(g)
    const env = 0.9

    // outline of the body (x half-width, y distance from the saddle)
    const outline: Array<[number, number]> = [
      [-0.075, 0], [-0.073, 0.03], [-0.066, 0.056], [-0.052, 0.077], [-0.03, 0.09], [-0.005, 0.092],
      [0.02, 0.085], [0.042, 0.068], [0.06, 0.0585], [0.08, 0.062], [0.105, 0.067], [0.13, 0.0665],
      [0.15, 0.062], [0.169, 0.055], [0.178, 0.045],
    ]
    const pts = new THREE.SplineCurve(outline.map(([y, w]) => new THREE.Vector2(w, y))).getPoints(96)
    const full: Array<[number, number]> = pts.map((p) => [p.x, p.y] as [number, number]).concat(pts.slice().reverse().map((p) => [-p.x, p.y] as [number, number]))
    const mkShape = (scale: number, withHole: boolean) => {
      const sh = new THREE.Shape()
      const cx = 0
      const cy = 0.05
      full.forEach(([x, y], i) => {
        const px = cx + (x - cx) * scale
        const py = cy + (y - cy) * scale
        if (i) sh.lineTo(px, py)
        else sh.moveTo(px, py)
      })
      if (withHole) {
        const hole = new THREE.Path()
        hole.absarc(0, Y_HOLE, R_HOLE, 0, Math.PI * 2, true)
        sh.holes.push(hole)
      }
      return sh
    }

    const mahogany = (this.mahogany = this.lit(
      new THREE.MeshPhysicalMaterial({ map: mahoganyTexture(), roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.2, envMapIntensity: env * 0.8 }),
    ))
    const inside = new THREE.MeshStandardMaterial({ color: 0x3a1c0e, roughness: 0.85, side: THREE.DoubleSide, emissive: 0x120804, emissiveIntensity: 0.35 })

    // top plate with soundhole
    const topMat = (this.topMat = this.lit(
      new THREE.MeshPhysicalMaterial({
        map: spruceTexture({ outline: full, holeY: Y_HOLE, holeR: R_HOLE }),
        roughness: 0.55,
        clearcoat: 0.14,
        clearcoatRoughness: 0.35,
        envMapIntensity: env * 0.28,
      }),
    ))
    const top = new THREE.Mesh(plate(mkShape(1, true), 0.003, [TOP.x0, TOP.x1, TOP.y0, TOP.y1]), [topMat, mahogany])
    top.position.y = -0.003
    top.receiveShadow = true
    g.add(top)

    // rosette: a ring decal around the soundhole with polar UVs
    {
      const r0 = R_HOLE
      const r1 = R_HOLE + 0.0074
      const seg = 192
      const pos: Array<number> = []
      const uv: Array<number> = []
      const idx: Array<number> = []
      for (let i = 0; i <= seg; i++) {
        const a = (i / seg) * Math.PI * 2
        const c = Math.cos(a)
        const sn = Math.sin(a)
        pos.push(c * r0, 0, sn * r0, c * r1, 0, sn * r1)
        uv.push((i / seg) * 3, 0, (i / seg) * 3, 1)
        if (i < seg) {
          const k = i * 2
          idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3)
        }
      }
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
      geo.setIndex(idx)
      geo.computeVertexNormals()
      const rt = rosetteTexture()
      rt.repeat.set(1, 1)
      const rosette = new THREE.Mesh(
        geo,
        this.lit(
          new THREE.MeshPhysicalMaterial({
            map: rt,
            roughness: 0.38,
            clearcoat: 0.6,
            clearcoatRoughness: 0.2,
            envMapIntensity: env * 0.6,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2,
          }),
        ),
      )
      rosette.position.set(0, 0.0003, -Y_HOLE)
      rosette.receiveShadow = true
      g.add(rosette)
    }

    // hollow body: a wall ring (outer outline with an inset hole) and a floor, so the cavity seen through the hole is real
    const ring = mkShape(1, false)
    const innerPath = new THREE.Path()
    full
      .slice()
      .reverse()
      .forEach(([x, y], i) => {
        const px = x * 0.975
        const py = 0.05 + (y - 0.05) * 0.975
        if (i) innerPath.lineTo(px, py)
        else innerPath.moveTo(px, py)
      })
    ring.holes.push(innerPath)
    const wall = new THREE.Mesh(plate(ring, BODY_DEPTH - 0.003, [-0.1, 0.1, -0.08, 0.18]), [mahogany, inside])
    wall.position.y = -BODY_DEPTH
    wall.receiveShadow = true
    g.add(wall)
    const floor = new THREE.Mesh(plate(mkShape(0.985, false), 0.003, [-0.1, 0.1, -0.08, 0.18]), inside)
    floor.position.y = -BODY_DEPTH + 0.001
    g.add(floor)

    // bridge + saddle
    const fbTex = fretboardTexture()
    const bridgeMat = this.lit(new THREE.MeshPhysicalMaterial({ map: fbTex, color: 0xb89a8a, roughness: 0.36, clearcoat: 0.4, envMapIntensity: env }))
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.0085, 0.015), bridgeMat)
    bridge.position.set(0, 0.00425, 0.0062)
    bridge.castShadow = true
    bridge.receiveShadow = true
    g.add(bridge)
    const bone = this.lit(new THREE.MeshPhysicalMaterial({ color: 0xc9bea6, roughness: 0.42, clearcoat: 0.15, envMapIntensity: env * 0.5 }))
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.0108, 0.0022), bone)
    saddle.position.set(0, 0.0054, -0.0009)
    saddle.castShadow = true
    g.add(saddle)

    // neck + fretboard
    const yEnd = 0.145
    const wN = fretboardWidth(-S)
    const wE = fretboardWidth(-yEnd)
    const board = (inset: number) => {
      const sh = new THREE.Shape()
      sh.moveTo(-wN / 2 - inset, S)
      sh.lineTo(wN / 2 + inset, S)
      sh.lineTo(wE / 2 + inset, yEnd + 0.004)
      sh.lineTo(wE / 2 + inset - 0.004, yEnd)
      sh.lineTo(-wE / 2 - inset + 0.004, yEnd)
      sh.lineTo(-wE / 2 - inset, yEnd + 0.004)
      sh.closePath()
      return sh
    }
    const fbMat = this.lit(new THREE.MeshPhysicalMaterial({ map: fbTex, roughness: 0.4, clearcoat: 0.3, clearcoatRoughness: 0.3, envMapIntensity: env }))
    const fb = new THREE.Mesh(plate(board(0), 0.005, [-0.025, 0.025, yEnd, S]), fbMat)
    fb.position.y = Y_BOARD - 0.005
    fb.receiveShadow = true
    g.add(fb)
    const neck = new THREE.Mesh(plate(board(0.0018), 0.012, [-0.025, 0.025, yEnd, S]), mahogany)
    neck.position.y = Y_BOARD - 0.0052 - 0.012
    neck.receiveShadow = true
    g.add(neck)

    // headstock + tuners
    const hs = new THREE.Shape()
    ;[[-0.0175, S], [0.0175, S], [0.0215, S + 0.055], [0.0235, S + 0.078], [0, S + 0.09], [-0.0235, S + 0.078], [-0.0215, S + 0.055]].forEach((p, i) => {
      if (i) hs.lineTo(p[0], p[1])
      else hs.moveTo(p[0], p[1])
    })
    hs.closePath()
    const head = new THREE.Mesh(plate(hs, 0.008, [-0.03, 0.03, S, S + 0.09]), fbMat)
    head.position.y = Y_BOARD - 0.008
    head.receiveShadow = true
    g.add(head)
    const metal = this.lit(new THREE.MeshStandardMaterial({ color: 0xcfc8b8, metalness: 0.9, roughness: 0.28, envMapIntensity: 1.2 }))
    const btn = new THREE.MeshPhysicalMaterial({ color: 0xf1e8d4, roughness: 0.3, clearcoat: 0.4 })
    ;[[-1, S + 0.034], [-1, S + 0.062], [1, S + 0.034], [1, S + 0.062]].forEach(([side, y]) => {
      const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 0.014, 10), metal)
      peg.rotation.z = Math.PI / 2
      peg.position.set(side * (0.0245 + 0.004), -0.0005, -y)
      g.add(peg)
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.0028, 0.0028, 0.007, 14), metal)
      post.position.set(side * 0.0125, 0.0025, -y)
      g.add(post)
      const bt = new THREE.Mesh(new THREE.SphereGeometry(0.0042, 14, 10), btn)
      bt.scale.set(1.2, 0.8, 1)
      bt.position.set(side * (0.0245 + 0.0105), -0.0005, -y)
      g.add(bt)
    })

    // nut
    this.nut = new THREE.Mesh(
      new THREE.BoxGeometry(0.0345, 0.0018, 0.0024),
      this.lit(new THREE.MeshPhysicalMaterial({ color: 0xf4ecd8, roughness: 0.34, clearcoat: 0.3, emissive: 0xff9a40, emissiveIntensity: 0, envMapIntensity: env })),
    )
    this.nut.position.set(0, Y_BOARD + 0.0007, -S)
    g.add(this.nut)

    // frets: nickel silver wire at 2^(-n/12) of the string length, catching the softbox reflections
    for (let n = 1; n <= FRET_COUNT; n++) {
      const z = fretZ(n)
      const mat = this.lit(new THREE.MeshStandardMaterial({ color: 0xe6e0d0, roughness: 0.22, metalness: 0.95, emissive: 0xff9a40, emissiveIntensity: 0, envMapIntensity: 1.5 }))
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.00052, 0.00052, fretboardWidth(z) + 0.0012, 10), mat)
      m.rotation.z = Math.PI / 2
      m.position.set(0, Y_BOARD + 0.00045, z)
      g.add(m)
      this.fretMats.push(mat)
    }

    // pearl position dots
    const pearl = this.lit(
      new THREE.MeshPhysicalMaterial({ color: 0xf6f1e6, roughness: 0.22, clearcoat: 0.6, iridescence: 1, iridescenceIOR: 1.7, emissive: 0xfff0d0, emissiveIntensity: 0.12, envMapIntensity: 1.3 }),
    )
    const dot = (n: number, dx: number) => {
      const z = (fretZ(n - 1) + fretZ(n)) / 2
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.0023, 0.0023, 0.0006, 28), pearl)
      m.position.set(dx, Y_BOARD + 0.0002, z)
      g.add(m)
      const side = new THREE.Mesh(new THREE.SphereGeometry(0.0009, 10, 8), pearl) // side marker on the edge of the neck
      side.position.set(fretboardWidth(z) / 2 + 0.0004, Y_BOARD - 0.0016, z)
      g.add(side)
    }
    ;[5, 7, 10, 15].forEach((n) => dot(n, 0))
    dot(12, -0.0105)
    dot(12, 0.0105)
  }

  /** The instrument lies on a dark wooden table, so a top-down camera has something to look at around it. */
  private buildTable() {
    this.tableMat = this.lit(new THREE.MeshStandardMaterial({ color: 0x140e0a, roughness: 0.8, metalness: 0, envMapIntensity: 0.2 }))
    const table = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), this.tableMat)
    table.rotation.x = -Math.PI / 2
    table.position.set(0, -BODY_DEPTH - 0.0015, -2)
    this.scene.add(table)

    // neon floor grid (shown by themes that ask for it): procedural lines fading out from the instrument,
    // with a ring of light that rolls outward on every beat
    this.grid = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 1.6).rotateX(-Math.PI / 2),
      new THREE.ShaderMaterial({
        uniforms: { beat: { value: 0 }, level: { value: 0 }, cA: { value: new THREE.Color(0x3ee6ff) }, cB: { value: new THREE.Color(0xff3fb0) } },
        vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
        fragmentShader: `
          uniform float beat; uniform float level; uniform vec3 cA; uniform vec3 cB; varying vec3 vW;
          // anti-aliased line that fades out once a cell shrinks under a few pixels (else it turns into a solid wash)
          float line(float x, float w){ float f = abs(fract(x) - 0.5); float d = fwidth(x); return smoothstep(0.5 - w - d, 0.5 - w + d, f) * (1.0 - smoothstep(0.08, 0.3, d)); }
          void main(){
            vec2 p = vW.xz / 0.03;
            float g = max(line(p.x + 0.5, 0.035), line(p.y + 0.5, 0.035));
            vec2 q = vW.xz - vec2(0.0, -0.13);
            float r = length(q * vec2(1.0, 0.62));
            float fade = exp(-r * 5.5) * smoothstep(0.075, 0.13, r);
            float ph = fract(beat);
            float wave = exp(-pow((r - 0.07 - ph * 0.42) * 22.0, 2.0)) * (1.0 - ph);
            vec3 col = mix(cA, cB, smoothstep(0.08, 0.45, r + 0.06 * sin(vW.x * 9.0)));
            float a = g * fade * (0.22 + 0.4 * level) + g * wave * 0.9 * fade * smoothstep(0.08, 0.13, r);
            gl_FragColor = vec4(col * a, 1.0);
          }`,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )
    this.grid.position.set(0, -BODY_DEPTH - 0.0012, -0.15)
    this.grid.layers.set(1)
    this.grid.visible = false
    this.scene.add(this.grid)
  }

  private buildStrings() {
    const idx: Array<number> = []
    for (let k = 0; k < NP - 1; k++) {
      for (let j = 0; j < RING; j++) {
        const a = k * RING + j
        const b = k * RING + ((j + 1) % RING)
        const c = (k + 1) * RING + j
        const d = (k + 1) * RING + ((j + 1) % RING)
        idx.push(a, b, c, b, d, c)
      }
    }
    for (let i = 0; i < 4; i++) {
      const mk = (mat: THREE.Material) => {
        const geo = new THREE.BufferGeometry()
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NP * RING * 3), 3))
        const nrm = new Float32Array(NP * RING * 3)
        for (let k = 0; k < NP; k++) {
          for (let j = 0; j < RING; j++) {
            const th = (j / RING) * Math.PI * 2
            const o = (k * RING + j) * 3
            nrm[o] = Math.cos(th)
            nrm[o + 1] = Math.sin(th)
            nrm[o + 2] = 0
          }
        }
        geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3))
        geo.setAttribute('glow', new THREE.BufferAttribute(new Float32Array(NP * RING), 1))
        geo.setIndex(idx)
        const mesh = new THREE.Mesh(geo, mat)
        mesh.frustumCulled = false
        this.scene.add(mesh)
        return { geo, mesh }
      }
      const mat = this.lit(new THREE.MeshPhysicalMaterial({ color: 0xf4ecd8, roughness: 0.28, metalness: 0.0, clearcoat: 0.5, emissive: 0xffd08a, emissiveIntensity: 0.12, envMapIntensity: 1.4 }))
      // soft glow: brightest along the string's axis, fading to nothing at its silhouette. Its width is the
      // vibration envelope (what the eye sees of a fast-moving string) and `glow` carries the travelling light pulse.
      const haloMat = new THREE.ShaderMaterial({
        uniforms: { color: { value: new THREE.Color(1.0, 0.7, 0.34) }, opacity: { value: 1 } },
        vertexShader:
          'attribute float glow; varying vec3 vN; varying vec3 vV; varying float vG; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vG = glow; gl_Position = projectionMatrix * mv; }',
        fragmentShader:
          'uniform vec3 color; uniform float opacity; varying vec3 vN; varying vec3 vV; varying float vG; void main(){ float d = abs(dot(normalize(vN), normalize(vV))); float a = pow(d, 2.2) * min(vG, 1.6) * opacity; vec3 c = mix(color, vec3(1.0), clamp(vG - 1.0, 0.0, 0.6)); gl_FragColor = vec4(c * a, a); }',
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
      const main = mk(mat)
      const halo = mk(haloMat)
      main.mesh.castShadow = false
      halo.mesh.layers.set(1)
      this.strs.push({ mainGeo: main.geo, haloGeo: halo.geo, main: main.mesh, halo: halo.mesh, mat, haloMat, fingerAlpha: 0, fingerFret: 1, fingerZ: fretZ(1), seen: -1 })
    }
  }

  private spriteMaterial(map: THREE.Texture, color?: THREE.ColorRepresentation) {
    return new THREE.SpriteMaterial({ map, ...(color === undefined ? {} : { color }), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
  }

  /** A soft glow where each string is held down on the fretboard, the plucking fingertip and the press rings. */
  private buildMarkers() {
    this.glowTex = softSprite([[0, 'rgba(255,236,196,0.95)'], [0.3, 'rgba(255,180,100,0.5)'], [1, 'rgba(255,140,50,0)']])
    this.glowTexN = softSprite([[0, 'rgba(255,255,255,0.95)'], [0.3, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0)']])
    this.lf = [0, 1, 2, 3].map(() => {
      const glow = new THREE.Sprite(this.spriteMaterial(this.glowTex))
      glow.layers.set(1)
      this.scene.add(glow)
      return { glow, pos: new V3(0, 0, -0.25), press: 0, energy: 0 }
    })
    // the plucking fingertip: a small light that settles onto the string, pulls it aside and flicks away
    this.tips = [0, 1, 2, 3].map(() => {
      const sp = new THREE.Sprite(this.spriteMaterial(this.glowTex))
      sp.layers.set(1)
      this.scene.add(sp)
      return sp
    })
    // a ring that opens on the fretboard when a finger lands on a new fret
    const rg = new THREE.RingGeometry(0.78, 1.0, 48)
    rg.rotateX(-Math.PI / 2)
    this.pressRings = [0, 1, 2, 3].map(() => {
      const m = new THREE.Mesh(
        rg,
        new THREE.MeshBasicMaterial({ color: 0xffc27a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }),
      )
      m.layers.set(1)
      m.visible = false
      this.scene.add(m)
      return m
    })
  }

  private addSprite(map: THREE.Texture, color: THREE.ColorRepresentation): THREE.Sprite {
    const m = new THREE.Sprite(this.spriteMaterial(map, color))
    m.layers.set(1)
    this.scene.add(m)
    return m
  }

  private buildFx() {
    const r = rng(5)
    const disc = softSprite([[0, 'rgba(255,255,255,0.55)'], [0.7, 'rgba(255,255,255,0.35)'], [0.9, 'rgba(255,255,255,0.12)'], [1, 'rgba(255,255,255,0)']])
    const rim = softSprite([[0, 'rgba(255,255,255,0.12)'], [0.72, 'rgba(255,255,255,0.18)'], [0.88, 'rgba(255,255,255,0.65)'], [1, 'rgba(255,255,255,0)']])
    this.sparkTex = softSprite([[0, 'rgba(255,255,255,1)'], [0.2, 'rgba(255,230,180,0.6)'], [1, 'rgba(255,200,120,0)']])
    this.sparkTexN = softSprite([[0, 'rgba(255,255,255,1)'], [0.2, 'rgba(255,255,255,0.55)'], [1, 'rgba(255,255,255,0)']])

    // soft out-of-focus lights floating over the instrument
    for (let i = 0; i < 34; i++) {
      const size = 0.014 + r() ** 1.6 * 0.05
      const sp = this.addSprite(r() < 0.45 ? rim : disc, new THREE.Color().setHSL(0.07 + r() * 0.05, 0.75, 0.62))
      sp.scale.set(size, size, 1)
      this.bokeh.push({ s: sp, base: 0.05 + r() * 0.13, vy: 0.001 + r() * 0.003, phase: r() * 6.28, x: (r() - 0.5) * 0.32, y: 0.02 + r() * 0.08, z: -0.52 + r() * 0.58 })
    }
    // a warm pool of light lying on the table around the instrument
    this.poolTex = softSprite([[0, 'rgba(255,170,90,0.6)'], [0.45, 'rgba(255,120,50,0.25)'], [1, 'rgba(255,90,30,0)']], 256)
    this.poolTexN = softSprite([[0, 'rgba(255,255,255,0.6)'], [0.45, 'rgba(255,255,255,0.22)'], [1, 'rgba(255,255,255,0)']], 256)
    this.haze = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: this.poolTex, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
    )
    this.haze.layers.set(1)
    this.haze.position.set(0, -BODY_DEPTH - 0.001, -0.25)
    this.haze.scale.set(1.1, 1, 1.1)
    this.scene.add(this.haze)

    // dust motes in the light
    for (let i = 0; i < 50; i++) {
      const sp = this.addSprite(this.sparkTex, new THREE.Color(1, 0.85, 0.6))
      const size = 0.0012 + r() * 0.0035
      sp.scale.set(size, size, 1)
      this.motes.push({ s: sp, vy: 0.001 + r() * 0.004, vx: (r() - 0.5) * 0.003, phase: r() * 6.28, rate: 0.6 + r() * 1.8, x: (r() - 0.5) * 0.22, y: 0.005 + r() * 0.15, z: -0.4 + r() * 0.31 })
    }

    // burst sparks at the pluck point
    for (let i = 0; i < 90; i++) {
      this.sparks.push({ s: this.addSprite(this.sparkTex, new THREE.Color(1, 0.82, 0.5)), life: 0, ttl: 1, vx: 0, vy: 0, vz: 0, size: 0.002 })
    }

    // sound ripples spreading from the soundhole across the top
    const rg = new THREE.RingGeometry(0.93, 1.0, 96)
    rg.rotateX(-Math.PI / 2)
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(
        rg,
        new THREE.MeshBasicMaterial({ color: 0xffbe78, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }),
      )
      m.layers.set(1)
      m.position.set(0, 0.0007, -Y_HOLE)
      m.visible = false
      this.scene.add(m)
      this.ripples.push({ m, life: 0, ttl: 1.1, vel: 1 })
    }

    // floating notes
    this.noteTex = [noteGlyph(false), noteGlyph(true), noteGlyph(false, true), noteGlyph(true, true)]
    for (let i = 0; i < 14; i++) {
      this.notes.push({ s: this.addSprite(this.noteTex[i % 2], new THREE.Color(1, 0.8, 0.5)), life: 0, ttl: 2.6, x: 0, y: 0, z: 0, sway: 0, size: 0.016 })
    }
  }

  // ---- runtime ---------------------------------------------------------------------------------
  resize(w: number, h: number, pixelRatio?: number) {
    if (pixelRatio !== undefined) this.renderer.setPixelRatio(pixelRatio)
    this.renderer.setSize(w, h, false)
    this.viewW = w
    this.viewH = h
    this.camera.aspect = w / h
    this.applyView()
    if (this.post) {
      const pr = this.renderer.getPixelRatio()
      this.post.resize(Math.round(w * pr), Math.round(h * pr))
    }
  }

  /**
   * Slide the picture up by a fraction of the stage height, so the controls at the bottom do not sit on the
   * instrument. It moves the view window, not the camera, so perspective and depth of field are unchanged.
   */
  setViewShift(fraction: number) {
    if (Math.abs(fraction - this.viewShift) < 5e-4) return
    this.viewShift = fraction
    this.applyView()
  }

  /** Narrow portrait stages pull the camera's field of view wider so the whole instrument fits between the text and the controls. */
  setFovScale(scale: number) {
    if (Math.abs(scale - this.fovScale) < 1e-3) return
    this.fovScale = scale
    this.camera.fov = this.cam.fov * scale
    this.camera.updateProjectionMatrix()
  }

  private applyView() {
    if (this.viewShift === 0 || !this.viewW) this.camera.clearViewOffset()
    else this.camera.setViewOffset(this.viewW, this.viewH, 0, this.viewShift * this.viewH, this.viewW, this.viewH)
    this.camera.updateProjectionMatrix()
  }

  setArrangement(arr: Arrangement | null) {
    this.arr = arr
    this.strs.forEach((s) => {
      s.seen = -1
    })
  }

  setPreset(i: number) {
    this.presetIdx = ((i % PRESETS.length) + PRESETS.length) % PRESETS.length
  }

  snapCamera(i: number) {
    this.setPreset(i)
    const p = PRESETS[this.presetIdx]
    this.cam.pos.set(...p.pos)
    this.cam.look.set(...p.look)
    this.cam.fov = p.fov
    this.cam.focusZ = p.focusZ
    this.cam.vel.fill(0)
  }

  private lastIndexLE(list: Array<NoteEvent>, t: number): number {
    let lo = 0
    let hi = list.length
    while (lo < hi) {
      const m = (lo + hi) >> 1
      if (list[m].t <= t) lo = m + 1
      else hi = m
    }
    return lo - 1
  }

  /**
   * The camera glides between presets on a critically damped spring (eases in and out, never overshoots),
   * drifts very slowly on its own, and leans in a little when the music gets louder. No per-beat shake.
   */
  private updateCamera(st: SceneState, dt: number) {
    const p = PRESETS[this.presetIdx]
    const c = this.cam
    const tgt = [p.pos[0], p.pos[1], p.pos[2], p.look[0], p.look[1], p.look[2], p.fov, p.focusZ]
    const cur = [c.pos.x, c.pos.y, c.pos.z, c.look.x, c.look.y, c.look.z, c.fov, c.focusZ]
    const w = st.reducedMotion ? 6 : 1.7
    const ex = Math.exp(-w * dt)
    for (let n = 0; n < 8; n++) {
      const d = cur[n] - tgt[n]
      const tmp = (c.vel[n] + w * d) * dt
      c.vel[n] = (c.vel[n] - w * tmp) * ex
      cur[n] = tgt[n] + (d + tmp) * ex
    }
    c.pos.set(cur[0], cur[1], cur[2])
    c.look.set(cur[3], cur[4], cur[5])
    c.fov = cur[6]
    c.focusZ = cur[7]

    const t = st.clock
    const calm = st.reducedMotion ? 0 : 1
    const lean = 0.035 * this.intensity * calm
    const sway = (Math.sin(t * 0.31) * 0.0045 + Math.sin(t * 0.13) * 0.003) * calm
    const cam = this.camera
    cam.position.set(
      c.pos.x + sway + (c.look.x - c.pos.x) * lean,
      c.pos.y + Math.sin(t * 0.23) * 0.0025 * calm + (c.look.y - c.pos.y) * lean,
      c.pos.z + Math.sin(t * 0.17) * 0.004 * calm + (c.look.z - c.pos.z) * lean,
    )
    cam.up.set(0, 1, 0)
    cam.lookAt(c.look.x + sway * 0.4, c.look.y, c.look.z + Math.sin(t * 0.19) * 0.003 * calm)
    const fov = c.fov * this.fovScale
    if (Math.abs(cam.fov - fov) > 1e-3) {
      cam.fov = fov
      cam.updateProjectionMatrix()
    }
  }

  /**
   * Writes string i, held at `fret`. `m` describes its motion, all derived from the note clock:
   *   pull: the fingertip is drawing the string aside at `up` (0 = fret, 1 = saddle); e = 0..1
   *   vib:  ringing after the release, shown in slow motion
   * The ringing starts from exactly the pulled shape (a triangle), so the snap is seamless: it is the
   * sum of that triangle's harmonics, each decaying faster than the one below, which reads as a soft
   * rope-like wave instead of jitter. A light pulse runs out from the pluck point and bounces off the ends.
   */
  private writeString(i: number, fret: number, m: Motion, energy: number): number {
    const s = this.strs[i]
    const zB = fret > 0 ? fretZ(fret) : -S
    const Bx = stringX(i, zB)
    const By = fret > 0 ? Y_FRET + STRING_RADIUS[i] + 0.0001 : Y_NUT
    const Nx = stringX(i, -S)
    const Ny = Y_NUT
    const Nz = -S
    const Cx = stringX(i, 0)
    const Cy = Y_BRIDGE
    const Cz = 0
    const dir = i < 2 ? 1 : -1 // thumb pushes G/C toward the treble side, fingers pull E/A back

    // ringing: harmonic modes of the released triangle
    const NM = 8
    const { mw, mc, ms } = this
    let vibOn = false
    let vk = 1
    const v = m.vib
    if (v) {
      vk = 1 - (m.pull ? m.pull.e : 0)
      const up = clamp(v.up, 0.08, 0.92)
      for (let n = 1; n <= NM; n++) {
        // Fourier sine coefficients of a unit triangle peaked at `up`
        const b = (2 * Math.sin(n * Math.PI * up)) / (n * n * Math.PI * Math.PI * up * (1 - up))
        const dec = Math.exp(-v.age / (v.tau / (1 + 0.9 * (n - 1))))
        const w = 2 * Math.PI * v.f1 * n * v.age
        mw[n - 1] = b * dec * vk
        mc[n - 1] = Math.cos(w)
        ms[n - 1] = Math.cos(w + 0.9)
      }
      vibOn = vk > 0.001 && Math.exp(-v.age / v.tau) > 0.004
    }
    const P = m.pull
    const pUp = P ? clamp(P.up, 0.08, 0.92) : 0.5
    const tri = (u: number) => (u < pUp ? u / pUp : (1 - u) / (1 - pUp))

    // the light pulse: two beads leaving the pluck point in opposite directions, folded back at the ends
    let beadA = -1
    let beadB = -1
    let beadAmp = 0
    if (v && v.age < 1.4) {
      const fold = (x: number) => {
        const y = ((x % 2) + 2) % 2
        return y > 1 ? 2 - y : y
      }
      const d = v.age * 1.9
      beadA = fold(v.up + d)
      beadB = fold(v.up - d)
      beadAmp = v.vel * Math.exp(-v.age / 0.42) * Math.min(1, v.age / 0.015) * vk
    }

    const rad = STRING_RADIUS[i]
    const pa = s.mainGeo.attributes.position
    const ph = s.haloGeo.attributes.position
    const pg = s.haloGeo.attributes.glow
    const flash = v ? Math.exp(-v.age / 0.07) * v.vel * vk : 0
    let any = 0
    for (let k = 0; k < NP; k++) {
      let x: number
      let y: number
      let z: number
      if (k < NS) {
        const u = k / NS
        x = Nx + (Bx - Nx) * u
        y = Ny + (By - Ny) * u
        z = Nz + (zB - Nz) * u
        for (let j = 0; j < RING; j++) {
          const o = (k * RING + j) * 3
          ph.array[o] = x
          ph.array[o + 1] = y
          ph.array[o + 2] = z
          pg.array[k * RING + j] = 0
        }
      } else {
        const u = (k - NS) / (NV - 1)
        x = Bx + (Cx - Bx) * u
        y = By + (Cy - By) * u
        z = zB + (Cz - zB) * u
        let restX = x
        let restY = y
        // pulled shape (also the halo's centre line)
        if (P) {
          const tr = tri(u) * P.amt * P.e
          restX += dir * tr
          restY += tr * 0.25
        }
        x = restX
        y = restY
        let env = 0
        if (vibOn && v) {
          let gx = 0
          let gy = 0
          for (let n = 1; n <= NM; n++) {
            const sn = Math.sin(n * Math.PI * u)
            const w = mw[n - 1] * sn
            gx += w * mc[n - 1]
            gy += w * ms[n - 1]
            env += Math.abs(w)
          }
          x += dir * v.amt * gx
          y += v.amt * gy * 0.3
          env *= v.amt
        }
        // bead brightness at this point
        let bead = 0
        if (beadAmp > 0.004) {
          const da = (u - beadA) / 0.045
          const db = (u - beadB) / 0.045
          bead = beadAmp * (Math.exp(-da * da) + Math.exp(-db * db))
        }
        const slim = clamp((1 - u) / 0.4, 0.06, 1) // thinner glow close to the camera
        const rh = (rad * 2.6 + env * 1.1 + rad * 5 * bead + rad * 3 * energy * Math.sin(Math.PI * u)) * slim
        const gl = (energy * (0.35 + 0.65 * clamp(env / 0.0012, 0, 1)) + 1.25 * bead + (P ? 0.5 * P.e * tri(u) : 0) + 0.8 * flash * Math.sin(Math.PI * u)) * (0.4 + 0.6 * slim)
        any = Math.max(any, gl)
        for (let j = 0; j < RING; j++) {
          const th = (j / RING) * 6.2832
          const c = Math.cos(th)
          const sn = Math.sin(th)
          const o = (k * RING + j) * 3
          ph.array[o] = restX + c * rh + (x - restX) * 0.35
          ph.array[o + 1] = restY + sn * rh
          ph.array[o + 2] = z
          pg.array[k * RING + j] = gl
        }
      }
      for (let j = 0; j < RING; j++) {
        const th = (j / RING) * 6.2832
        const o = (k * RING + j) * 3
        pa.array[o] = x + Math.cos(th) * rad
        pa.array[o + 1] = y + Math.sin(th) * rad
        pa.array[o + 2] = z
      }
    }
    pa.needsUpdate = true
    s.halo.visible = any > 0.01
    if (any > 0.01) {
      ph.needsUpdate = true
      pg.needsUpdate = true
    }
    s.mat.emissiveIntensity = 0.1 + 1.0 * energy + 1.6 * flash + (P ? 0.35 * P.e : 0)
    return dir
  }

  private stringYAt(i: number, fret: number, z: number): number {
    const zB = fret > 0 ? fretZ(fret) : -S
    const By = fret > 0 ? Y_FRET + STRING_RADIUS[i] : Y_NUT
    const u = clamp((z - zB) / -zB, 0, 1)
    return By + (Y_BRIDGE - By) * u
  }

  // ---- fx spawners -----------------------------------------------------------------------------
  private spawnSparks(x: number, y: number, z: number, vel: number, si: number, dir: number) {
    const n = (2 + Math.round(vel * 2)) * (this.tint ? 2 : 1)
    for (let k = 0; k < n; k++) {
      const p = this.sparks[this.sparkNext++ % this.sparks.length]
      if (this.tint) p.s.material.color.copy(this.strCol[si]).lerp(WHITE, Math.random() * 0.35)
      p.life = 0
      p.ttl = 0.35 + Math.random() * 0.45
      p.s.position.set(x, y, z)
      // thrown off the string the way the fingertip leaves it: sideways and up, in a narrow fan
      p.vx = dir * (0.015 + Math.random() * 0.035)
      p.vy = 0.02 + Math.random() * 0.035
      p.vz = (Math.random() - 0.5) * 0.02
      p.size = 0.0012 + Math.random() * 0.0022
    }
  }

  private spawnRipple(vel: number) {
    const rp = this.ripples[this.rippleNext++ % this.ripples.length]
    rp.life = 0
    rp.ttl = 1.0 + vel * 0.5
    rp.vel = vel
    rp.m.visible = true
  }

  private spawnNote(x: number, z: number, vel: number, si: number) {
    const n = this.notes[this.noteNext++ % this.notes.length]
    if (this.tint) n.s.material.color.copy(this.strCol[si])
    n.life = 0
    n.ttl = 1.8 + Math.random() * 0.6
    n.x = x
    n.y = 0.014
    n.z = z
    n.sway = Math.random() * 6.28
    n.size = 0.011 + vel * 0.006
  }

  // ---- main ------------------------------------------------------------------------------------
  render(st: SceneState, dtIn: number) {
    if (this.disposed) return
    const dt = clamp(dtIn, 0, 0.1)
    const { time } = st
    const arr = this.arr
    const calm = st.reducedMotion === true
    this.updateCamera(st, dt)

    const fretGlow = new Array<number>(FRET_COUNT + 1).fill(0)
    const fretWho = new Array<number>(FRET_COUNT + 1).fill(-1)
    let total = 0
    const spawnOk = st.playing > 0 && arr !== null && !calm

    for (let i = 0; i < 4; i++) {
      const list = arr ? arr.perString[i] : []
      const idx = arr ? this.lastIndexLE(list, time) : -1
      const cur = idx >= 0 ? list[idx] : null
      const nxt = idx + 1 < list.length ? list[idx + 1] : null
      const age = cur ? time - cur.t : 99
      const tn = nxt ? nxt.t - time : 99
      const s = this.strs[i]

      // new note started on this string: sparks, ripple, floating note
      if (spawnOk && idx !== s.seen && idx > s.seen && cur && age < 0.1) {
        const zx = pluckZ(cur.f)
        this.spawnSparks(stringX(i, zx), this.stringYAt(i, cur.f, zx) + 0.002, zx, cur.vel, i, i < 2 ? 1 : -1)
        if (cur.kind !== 'comp' || cur.vel > 0.5) this.spawnRipple(cur.vel)
        if (cur.kind === 'melody' && Math.random() < 0.5) this.spawnNote(stringX(i, -0.1), -0.1, cur.vel, i)
      }
      s.seen = idx

      const energy = cur ? cur.vel * Math.exp(-age / 0.85) * Math.min(1, age / 0.01) : 0
      total += energy

      // ---- the string: pulled aside just before the note, released on it, then rings in slow motion ----
      const pulling = nxt !== null && tn < PULL
      const activeFret = pulling && nxt ? nxt.f : cur ? cur.f : 0
      const spanUp = (f: number, zp: number) => {
        const zB = f > 0 ? fretZ(f) : -S
        return (zp - zB) / -zB
      }
      const amtOf = (vel: number) => 0.0016 + 0.0022 * vel
      const motion: Motion = { pull: null, vib: null }
      if (pulling && nxt) motion.pull = { up: spanUp(nxt.f, pluckZ(nxt.f)), amt: amtOf(nxt.vel), e: sstep(0, 1, 1 - tn / PULL) }
      if (cur) {
        motion.vib = {
          up: spanUp(cur.f, pluckZ(cur.f)),
          amt: amtOf(cur.vel),
          age,
          vel: cur.vel,
          f1: 2.4 + 2.6 * clamp((cur.midi - 55) / 30, 0, 1),
          tau: 1.0,
        }
      }
      const dir = this.writeString(i, activeFret, motion, energy)
      if (cur && cur.f >= 0 && energy > fretGlow[cur.f]) {
        fretGlow[cur.f] = energy
        fretWho[cur.f] = i
      }

      // ---- fingertip light: settles onto the string, draws it aside, flicks off on the release -----
      const tip = this.tips[i]
      tip.material.opacity = 0
      if (nxt && tn < PULL + 0.12) {
        const a = sstep(0, 1, 1 - tn / (PULL + 0.12))
        const e = motion.pull ? motion.pull.e : 0
        const zp = pluckZ(nxt.f)
        const amt = amtOf(nxt.vel)
        tip.position.set(stringX(i, zp) + dir * (amt * e - 0.003 * (1 - a)), this.stringYAt(i, nxt.f, zp) + 0.0011 + 0.006 * (1 - a), zp)
        tip.material.opacity = 0.75 * a
        const sz = 0.0065 + 0.0015 * e
        tip.scale.set(sz, sz, 1)
      } else if (cur && age < 0.24) {
        const k = age / 0.24
        const zp = pluckZ(cur.f)
        const amt = amtOf(cur.vel)
        tip.position.set(stringX(i, zp) + dir * (amt + 0.007 * k), this.stringYAt(i, cur.f, zp) + 0.0011 + 0.009 * k * (2 - k), zp + 0.002 * k)
        tip.material.opacity = 0.75 * (1 - k) ** 2
        const sz = 0.0082 * (1 - 0.4 * k)
        tip.scale.set(sz, sz, 1)
      }

      // ---- a ring opens where a finger lands on a new fret -------------------------------------------
      const ring = this.pressRings[i]
      let pf = 0
      let pAge = 99
      if (pulling && nxt && nxt.f > 0 && (!cur || cur.f !== nxt.f)) {
        pf = nxt.f
        pAge = PULL - tn
      } else if (cur && cur.f > 0) {
        const prev = idx > 0 ? list[idx - 1] : null
        if (!prev || prev.f !== cur.f) {
          pf = cur.f
          pAge = age + PULL
        }
      }
      if (pf > 0 && pAge < 0.45) {
        const k = pAge / 0.45
        const zf = fretZ(pf) - 0.3 * (fretZ(pf) - fretZ(pf - 1))
        ring.visible = true
        ring.position.set(stringX(i, zf), Y_FRET + 0.0009, zf)
        const rr = 0.0022 + 0.0062 * (1 - (1 - k) ** 3)
        ring.scale.set(rr, 1, rr)
        ;(ring.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - k) ** 1.5
      } else ring.visible = false

      // ---- fretting marker ---------------------------------------------------------------------------
      const lf = this.lf[i]
      let tf = cur ? cur.f : 0
      if (nxt && tn < PULL + 0.1) tf = nxt.f
      if (tf > 0) s.fingerFret = tf
      const ff = s.fingerFret
      const zf = ff > 0 ? fretZ(ff) - 0.3 * (fretZ(ff) - fretZ(ff - 1)) : -S
      s.fingerZ = smooth(s.fingerZ, zf, 1 - Math.exp(-dt * 24))
      s.fingerAlpha = smooth(s.fingerAlpha, tf > 0 ? 1 : 0, 1 - Math.exp(-dt * 18))
      lf.pos.set(stringX(i, s.fingerZ), Y_FRET + 0.0016, s.fingerZ)
      lf.press = s.fingerAlpha
      lf.energy = Math.min(1, energy * 1.3)
    }
    for (let n = 1; n <= FRET_COUNT; n++) {
      const mat = this.fretMats[n]!
      mat.emissiveIntensity = fretGlow[n] * 2.0
      if (this.tint && fretWho[n] >= 0) mat.emissive.copy(this.strCol[fretWho[n]])
    }
    ;(this.nut.material as THREE.MeshPhysicalMaterial).emissiveIntensity = fretGlow[0] * 1.4
    this.intensity = smooth(this.intensity, clamp(total / 1.6, 0, 1), 1 - Math.exp(-dt * 3))

    // ---- fretting markers --------------------------------------------------------------------------
    this.lf.forEach((f) => {
      f.glow.position.copy(f.pos)
      const gs = 0.011 + 0.008 * f.energy
      f.glow.scale.set(gs, gs, 1)
      f.glow.material.opacity = f.press * (0.3 + 0.7 * f.energy)
    })

    // ---- fx ----------------------------------------------------------------------------------------
    const t = st.clock
    const pulse = calm ? 0 : Math.exp(-(((st.beat % 1) + 1) % 1) * 4.5) * st.playing
    this.key.intensity = this.keyBase + 0.45 * PI * KEY_FALLOFF * this.intensity + 0.25 * PI * KEY_FALLOFF * pulse
    if (this.grid.visible) {
      const u = (this.grid.material as THREE.ShaderMaterial).uniforms
      u.beat.value = st.playing || st.time > 0 ? st.beat : t * 0.5
      u.level.value = this.intensity
    }
    this.inner.intensity = (0.22 + 1.0 * this.intensity + 0.25 * pulse) * PI * INNER_FALLOFF
    ;(this.haze.material as THREE.MeshBasicMaterial).opacity = 0.03 + 0.1 * this.intensity + 0.03 * pulse

    // reduced motion: the lights hold still (the clock is frozen at 0) instead of drifting and twinkling
    const drift = calm ? 0 : 1
    const tt = calm ? 0 : t
    this.bokeh.forEach((p) => {
      p.y += p.vy * dt * drift
      if (p.y > 0.12) p.y = 0.02
      p.s.position.set(p.x + Math.sin(tt * 0.3 + p.phase) * 0.006, p.y, p.z)
      p.s.material.opacity = p.base * (0.55 + 0.45 * Math.sin(tt * 0.6 + p.phase)) * (0.5 + 0.9 * this.intensity + 0.3 * pulse)
    })
    this.motes.forEach((p) => {
      p.y += p.vy * dt * drift
      p.x += p.vx * dt * drift
      if (p.y > 0.2) p.y = 0.004
      p.s.position.set(p.x, p.y, p.z)
      p.s.material.opacity = Math.max(0, Math.sin(tt * p.rate + p.phase)) * (0.25 + 0.75 * this.intensity)
    })
    this.sparks.forEach((p) => {
      if (p.life >= p.ttl) {
        p.s.material.opacity = 0
        return
      }
      p.life += dt
      const k = Math.min(1, p.life / p.ttl) // (1 - k) must never go negative: pow() of that is NaN, and NaN turns into black squares in the bloom chain
      p.vy -= 0.09 * dt
      p.vx *= 1 - 1.8 * dt
      p.s.position.x += p.vx * dt
      p.s.position.y += p.vy * dt
      p.s.position.z += p.vz * dt
      p.s.material.opacity = 0.6 * (1 - k) ** 1.4
      const sz = p.size * (1 + 0.5 * k)
      p.s.scale.set(sz, sz, 1)
    })
    this.ripples.forEach((rp) => {
      if (!rp.m.visible) return
      rp.life += dt
      const k = rp.life / rp.ttl
      if (k >= 1) {
        rp.m.visible = false
        return
      }
      const rr = R_HOLE + 0.01 + 0.085 * (1 - (1 - k) ** 2)
      rp.m.scale.set(rr, 1, rr)
      ;(rp.m.material as THREE.MeshBasicMaterial).opacity = 0.42 * rp.vel * (1 - k) ** 1.6
    })
    this.notes.forEach((n) => {
      if (n.life >= n.ttl) {
        n.s.material.opacity = 0
        return
      }
      n.life += dt
      const k = Math.min(1, n.life / n.ttl)
      n.y += (0.01 + 0.008 * (1 - k)) * dt // drifts up only a few centimetres, never toward the camera
      n.s.position.set(n.x + Math.sin(n.sway + n.life * 2.1) * 0.012 * (0.4 + k), n.y, n.z - 0.02 * k)
      n.s.material.opacity = 0.5 * Math.max(0, Math.sin(Math.PI * Math.min(1, k * 1.15))) ** 0.7
      const sz = n.size * (0.8 + 0.4 * k)
      n.s.scale.set(sz, sz, 1)
    })

    // ---- render ------------------------------------------------------------------------------------
    // the instrument is static, so its shadow map only needs rendering a few times (start, theme change)
    if (this.shadowFrames > 0) {
      this.renderer.shadowMap.needsUpdate = true
      this.shadowFrames--
    }
    if (this.post) {
      this.focusPoint.set(0, 0.006, this.cam.focusZ)
      this.post.params.focus = this.camera.position.distanceTo(this.focusPoint)
      this.post.params.glow = this.intensity * 0.35
      this.post.render(this.scene, this.camera, calm ? 0 : st.clock) // film grain keys off this clock, so reduced motion freezes it too
    } else {
      this.renderer.render(this.scene, this.camera)
    }
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    const textures = new Set<THREE.Texture>()
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      mesh.geometry?.dispose()
      const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : []
      mats.forEach((m) => {
        Object.values(m).forEach((v) => {
          if (v instanceof THREE.Texture) textures.add(v)
        })
        m.dispose()
      })
    })
    textures.forEach((t) => t.dispose())
    ;[this.glowTex, this.glowTexN, this.sparkTex, this.sparkTexN, this.poolTex, this.poolTexN, ...this.noteTex].forEach((t) => t.dispose())
    this.envs.forEach((rt) => rt.dispose())
    this.envs.clear()
    this.post?.dispose()
    this.renderer.dispose()
    this.renderer.forceContextLoss()
  }
}
