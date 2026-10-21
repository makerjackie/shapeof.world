import './styles/GalaxyCollision.css'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import * as THREE from 'three'
import { ArrowCounterClockwise, Pause, Play, X, FilmStrip } from '@phosphor-icons/react'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { GuideTour, replayGuide, type GuideStep } from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import { useExperienceI18n } from '~/i18n/experience'
import {
  DEFAULT_CONFIG,
  DT,
  KPC_PER_UNIT,
  T_MAX,
  centersAt,
  createRuntime,
  fromGyr,
  rebuild,
  seek,
  sunRadiusKpc,
  toGyr,
  type EncounterConfig,
  type EncounterMode,
  type SimRuntime,
} from './galaxy-collision-model'

type FramingKey = 'auto' | 'approach' | 'wide' | 'contact' | 'burst' | 'remnant'

type ViewState = {
  /* shader note */
  goal: number
  /* shader note */
  target: number
  /* shader note */
  ceiling: number
  playing: boolean
  rate: number
  glide: boolean
  framing: FramingKey
  elevBias: 'auto' | 'top' | 'side'
  hostTint: number
  gasLevel: number
  sunFocus: number
}

type Hud = {
  gyr: number
  sepKpc: number
  approachKmS: number
  clusters: number
  sunKpc: number
  phase: string
  merged: boolean
}

/* shader note */
const GLIDE_SECONDS = 2.1
const STAR_DUP = 2

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const damp = (from: number, to: number, lambda: number, dt: number) =>
  from + (to - from) * (1 - Math.exp(-lambda * dt))

function dampAngle(from: number, to: number, lambda: number, dt: number) {
  let d = to - from
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return from + d * (1 - Math.exp(-lambda * dt))
}

function createGlowTexture() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.16, 'rgba(255,255,255,0.62)')
  grad.addColorStop(0.42, 'rgba(255,255,255,0.16)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

// ——————————————————————————————————————————————————————————————
// (shader note)
// ——————————————————————————————————————————————————————————————

const pointVertex = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aSeed;
  attribute float aHost;
  attribute float aKind;
  attribute float aAge;

  uniform float uTime;
  uniform float uScale;
  uniform float uRedden;
  uniform float uHostTint;
  uniform float uGasLevel;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 col = aColor;
    float alpha = 1.0;
    float size = aSize;

    if (aKind > 0.5) {
      if (aAge < 0.0) {
        // (shader note)
        alpha = 0.34 * uGasLevel;
        size = aSize * 1.7;
      } else {
        // (shader note)
        float young = smoothstep(0.0, 0.8, aAge) * (1.0 - smoothstep(1.5, 9.0, aAge));
        col = mix(vec3(0.68, 0.82, 1.0), vec3(1.0, 0.78, 0.54), smoothstep(2.0, 16.0, aAge));
        alpha = 0.22 * uGasLevel + young * 1.5 * uGasLevel;
        size = aSize * (0.8 + 1.9 * young);
      }
    } else {
      // (shader note)
      col = mix(col, vec3(1.0, 0.74, 0.50), uRedden * 0.5);
      vec3 ident = aHost < 0.5 ? vec3(1.0, 0.70, 0.36) : vec3(0.44, 0.66, 1.0);
      col = mix(col, ident, uHostTint);
    }

    float tw = 0.88 + 0.12 * sin(uTime * (0.6 + aSeed * 1.7) + aSeed * 43.0);
    vColor = col * tw;
    vAlpha = alpha;

    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp(size * uScale / max(0.4, -mv.z), 1.6, 15.0);
  }
`

const pointFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.0, d);
    float i = pow(core, 1.9) * 0.5 + core * 0.05;
    gl_FragColor = vec4(vColor, i * vAlpha);
  }
`

/* shader note */
const hazeVertex = /* glsl */ `
  uniform float uRadius;
  varying vec2 vLocal;
  void main() {
    // (shader note)
    vLocal = vec2(uv.x - 0.5, 0.5 - uv.y) * 2.0 * uRadius;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const hazeFragment = /* glsl */ `
  uniform float uArm;
  uniform float uBody;
  uniform float uRadius;
  uniform float uPhase;
  uniform vec3 uCore;
  uniform vec3 uEdge;
  varying vec2 vLocal;

  void main() {
    float r = length(vLocal);
    if (r > uRadius) discard;
    // (shader note)
    float ang = atan(vLocal.y, vLocal.x) - uPhase;
    float armPhase = log(max(r, 0.08) / 0.46) / 0.26795;
    float band = max(0.0, cos(2.0 * (ang - armPhase)));

    float disk = exp(-r / 0.42);
    float arm = pow(band, 3.0) * smoothstep(0.20, 0.50, r) * exp(-r / 0.70);
    float core = exp(-r / 0.115);
    float edge = smoothstep(uRadius, uRadius * 0.55, r);

    float v = (disk * 0.44 + arm * uArm * 1.05 + core * 1.25) * uBody * edge;
    vec3 col = mix(uCore, uEdge, smoothstep(0.08, 0.85, r));
    gl_FragColor = vec4(col * v, 1.0);
  }
`

// ——————————————————————————————————————————————————————————————
// (shader note)
// ——————————————————————————————————————————————————————————————

type SceneProps = {
  rtRef: { current: SimRuntime }
  view: ViewState
  onSample: (hud: Hud) => void
  reducedMotion: boolean
  dragRef: { current: { azi: number; elev: number; distScale: number; userAngle: boolean } }
}

function framingFor(key: Exclude<FramingKey, 'auto'>, rt: SimRuntime, sepAzi: number) {
  const c = centersAt(rt.track, rt.t)
  const bx = (c.x1 + c.x2) * 0.5
  const by = (c.y1 + c.y2) * 0.5
  const bz = (c.z1 + c.z2) * 0.5
  switch (key) {
    case 'approach': {
      // (shader note)
      const dx = c.x2 - c.x1
      const dy = c.y2 - c.y1
      const dz = c.z2 - c.z1
      const len = Math.max(1e-4, Math.hypot(dx, dy, dz))
      return {
        tx: c.x1 + (dx / len) * 2.4,
        ty: c.y1 + (dy / len) * 2.4,
        tz: c.z1 + (dz / len) * 2.4,
        dist: 7.6,
        elev: 0.32,
        azi: sepAzi + 2.5,
      }
    }
    case 'wide':
      return { tx: bx, ty: by, tz: bz, dist: clamp(6 + 2.3 * c.sep, 10, 22), elev: 1.06, azi: sepAzi + Math.PI / 2 }
    case 'contact':
      return { tx: bx, ty: by, tz: bz, dist: 3.5, elev: 0.26, azi: sepAzi + Math.PI / 2 }
    case 'burst':
      return { tx: bx, ty: by, tz: bz, dist: 6.6, elev: 0.62, azi: sepAzi + 1.85 }
    case 'remnant':
    default:
      return { tx: bx, ty: by, tz: bz, dist: 11.5, elev: 0.55, azi: sepAzi + 1.4 + rt.t * 0.004 }
  }
}

function Scene({ rtRef, view, onSample, reducedMotion, dragRef }: SceneProps) {
  const glow = useMemo(() => createGlowTexture(), [])
  useEffect(() => () => glow.dispose(), [glow])

  const rt = rtRef.current
  const set = rt.set

  // (shader note)
  const buffers = useMemo(() => {
    const renderCount = set.nStar * STAR_DUP + (set.n - set.nStar)
    const position = new Float32Array(renderCount * 3)
    const aColor = new Float32Array(renderCount * 3)
    const aSize = new Float32Array(renderCount)
    const aSeed = new Float32Array(renderCount)
    const aHost = new Float32Array(renderCount)
    const aKind = new Float32Array(renderCount)
    const aAge = new Float32Array(renderCount).fill(-1)
    const src = new Int32Array(renderCount)
    const jitter = new Float32Array(renderCount * 3)
    let w = 0
    for (let i = 0; i < set.n; i += 1) {
      const copies = i < set.nStar ? STAR_DUP : 1
      for (let k = 0; k < copies; k += 1) {
        src[w] = i
        aColor[w * 3] = set.color[i * 3]
        aColor[w * 3 + 1] = set.color[i * 3 + 1]
        aColor[w * 3 + 2] = set.color[i * 3 + 2]
        aSize[w] = set.size[i] * (k === 0 ? 1 : 0.78)
        aSeed[w] = (set.seed[i] + k * 0.41) % 1
        aHost[w] = set.host[i]
        aKind[w] = i < set.nStar ? 0 : 1
        if (k > 0) {
          const a = set.seed[i] * 6.283 + k
          const s = 0.018 + set.seed[i] * 0.022
          jitter[w * 3] = Math.cos(a) * s
          jitter[w * 3 + 1] = (set.seed[i] - 0.5) * 0.02
          jitter[w * 3 + 2] = Math.sin(a) * s
        }
        w += 1
      }
    }
    return { renderCount, position, aColor, aSize, aSeed, aHost, aKind, aAge, src, jitter }
  }, [set])

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(buffers.position, 3))
    g.setAttribute('aColor', new THREE.BufferAttribute(buffers.aColor, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(buffers.aSize, 1))
    g.setAttribute('aSeed', new THREE.BufferAttribute(buffers.aSeed, 1))
    g.setAttribute('aHost', new THREE.BufferAttribute(buffers.aHost, 1))
    g.setAttribute('aKind', new THREE.BufferAttribute(buffers.aKind, 1))
    g.setAttribute('aAge', new THREE.BufferAttribute(buffers.aAge, 1))
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 400)
    return g
  }, [buffers])
  useEffect(() => () => geometry.dispose(), [geometry])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uScale: { value: 26 },
          uRedden: { value: 0 },
          uHostTint: { value: 0 },
          uGasLevel: { value: 0.85 },
        },
        vertexShader: pointVertex,
        fragmentShader: pointFragment,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
      }),
    [],
  )
  useEffect(() => () => material.dispose(), [material])

  const trail = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(16 * 3), 3))
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(16 * 3), 3))
    g.setDrawRange(0, 0)
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 400)
    return g
  }, [])
  const trailObject = useMemo(
    () =>
      new THREE.Line(
        trail,
        new THREE.LineBasicMaterial({
          vertexColors: true,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          depthTest: false,
        }),
      ),
    [trail],
  )
  useEffect(
    () => () => {
      trail.dispose()
      ;(trailObject.material as THREE.Material).dispose()
    },
    [trail, trailObject],
  )

  const nucleus = useRef<Array<THREE.Group | null>>([null, null])
  const haze = useRef<Array<THREE.Group | null>>([null, null])
  const spheroid = useRef<THREE.Sprite>(null)
  const sunSprite = useRef<THREE.Sprite>(null)
  const cam = useRef({ azi: 0, elev: 0.34, dist: 9, tx: 0, ty: 0, tz: 0, ready: false })
  const sampleAt = useRef(0)

  const HAZE_RADIUS = 1.45
  const hazeMaterials = useMemo(
    () =>
      ([
        { core: '#ffdca6', edge: '#cbd6ec' },
        { core: '#f2f6ff', edge: '#6f9bff' },
      ] as const).map(
        (p) =>
          new THREE.ShaderMaterial({
            uniforms: {
              uArm: { value: 1 },
              uBody: { value: 1 },
              uRadius: { value: HAZE_RADIUS },
              uPhase: { value: 0 },
              uCore: { value: new THREE.Color(p.core) },
              uEdge: { value: new THREE.Color(p.edge) },
            },
            vertexShader: hazeVertex,
            fragmentShader: hazeFragment,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: false,
            side: THREE.DoubleSide,
          }),
      ),
    [],
  )
  useEffect(() => () => hazeMaterials.forEach((m) => m.dispose()), [hazeMaterials])

  const orientQuat = useMemo(() => [new THREE.Quaternion(), new THREE.Quaternion()], [])
  const orientMat = useMemo(() => new THREE.Matrix4(), [])

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.06)
    const runtime = rtRef.current
    const track = runtime.track

    // (shader note)
    if (view.playing) {
      const t = runtime.t
      // (shader note)
      const base = t < track.tHandoff - 6 ? 5.2 : t < track.tMerge + 14 ? 1.35 : 2.6
      view.goal = Math.min(T_MAX, view.ceiling, view.goal + dt * base * view.rate)
    }
    const gap = view.goal - view.target
    if (Math.abs(gap) > 1e-4) {
      if (view.glide) {
        const speed = Math.max(2.5, Math.abs(gap) / GLIDE_SECONDS)
        view.target += Math.sign(gap) * Math.min(Math.abs(gap), speed * dt)
        if (Math.abs(view.goal - view.target) < 1e-4) view.glide = false
      } else {
        view.target = view.goal
      }
    }

    const behind = view.target - runtime.t
    const budget = behind > 12 * DT ? 60 : 10
    const caught = seek(runtime, view.target, budget)
    if (!caught) {
      // (shader note)
      view.target = runtime.t
      if (!view.glide) view.goal = runtime.t
    }

    // (shader note)
    const { position, aAge, src, jitter } = buffers
    const pos = runtime.set.pos
    const ign = runtime.set.ign
    const nStar = runtime.set.nStar
    for (let r = 0; r < buffers.renderCount; r += 1) {
      const i = src[r]
      const a = i * 3
      const b = r * 3
      position[b] = pos[a] + jitter[b]
      position[b + 1] = pos[a + 1] + jitter[b + 1]
      position[b + 2] = pos[a + 2] + jitter[b + 2]
      if (i >= nStar) aAge[r] = ign[i] < 0 ? -1 : runtime.t - ign[i]
    }
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute
    posAttr.needsUpdate = true
    const ageAttr = geometry.getAttribute('aAge') as THREE.BufferAttribute
    ageAttr.needsUpdate = true

    // —— uniforms ——
    const merged = runtime.t >= track.tMerge
    const redden = clamp((runtime.t - track.tMerge) / 26, 0, 1)
    material.uniforms.uTime.value = reducedMotion ? 0 : state.clock.elapsedTime
    material.uniforms.uRedden.value = redden
    material.uniforms.uHostTint.value = damp(material.uniforms.uHostTint.value, view.hostTint, 3.4, dt)
    material.uniforms.uGasLevel.value = damp(material.uniforms.uGasLevel.value, view.gasLevel, 3.4, dt)
    const px = state.size.height * state.viewport.dpr
    material.uniforms.uScale.value = (px * 0.5 / Math.tan((42 * Math.PI) / 360)) * 0.0205

    // (shader note)
    const c = centersAt(track, runtime.t)
    const n0 = nucleus.current[0]
    const n1 = nucleus.current[1]
    if (n0) n0.position.set(c.x1, c.y1, c.z1)
    if (n1) n1.position.set(c.x2, c.y2, c.z2)

    // (shader note)
    const armFade = 1 - clamp((runtime.t - (track.tPeri - 7)) / 11, 0, 1)
    const bodyFade = 1 - clamp((runtime.t - (track.tPeri - 4)) / 14, 0, 1)
    for (let h = 0; h < 2; h += 1) {
      const g = haze.current[h]
      const m = hazeMaterials[h]
      m.uniforms.uArm.value = armFade
      m.uniforms.uBody.value = bodyFade
      m.uniforms.uPhase.value = runtime.spin[h] * runtime.patternOmega * runtime.t
      if (!g) continue
      g.visible = bodyFade > 0.004
      g.position.set(h === 0 ? c.x1 : c.x2, h === 0 ? c.y1 : c.y2, h === 0 ? c.z1 : c.z2)
      const o = runtime.orient[h]
      orientMat.set(o[0], o[1], o[2], 0, o[3], o[4], o[5], 0, o[6], o[7], o[8], 0, 0, 0, 0, 1)
      orientQuat[h].setFromRotationMatrix(orientMat)
      g.quaternion.copy(orientQuat[h])
    }
    if (spheroid.current) {
      const grow = clamp((runtime.t - track.tMerge) / 22, 0, 1)
      const s = 3.4 + grow * 4.2
      spheroid.current.position.set((c.x1 + c.x2) * 0.5, (c.y1 + c.y2) * 0.5, (c.z1 + c.z2) * 0.5)
      spheroid.current.scale.set(s, s, 1)
      const m = spheroid.current.material as THREE.SpriteMaterial
      m.opacity = 0.2 * clamp((runtime.t - track.tMerge + 10) / 18, 0, 1)
      spheroid.current.visible = m.opacity > 0.005
    }

    // (shader note)
    const si = runtime.set.sunIndex * 3
    if (sunSprite.current) {
      sunSprite.current.position.set(pos[si], pos[si + 1], pos[si + 2])
      const f = 0.15 + view.sunFocus * 0.2
      sunSprite.current.scale.set(f, f, 1)
      ;(sunSprite.current.material as THREE.SpriteMaterial).opacity = 0.55 + view.sunFocus * 0.45
    }
    const tp = trail.getAttribute('position') as THREE.BufferAttribute
    const tc = trail.getAttribute('color') as THREE.BufferAttribute
    const pts = runtime.sunTrail
    const count = Math.min(16, pts.length / 3)
    const from = pts.length / 3 - count
    const glowStrength = 0.12 + view.sunFocus * 0.5
    for (let k = 0; k < count; k += 1) {
      tp.array[k * 3] = pts[(from + k) * 3]
      tp.array[k * 3 + 1] = pts[(from + k) * 3 + 1]
      tp.array[k * 3 + 2] = pts[(from + k) * 3 + 2]
      // (shader note)
      const f = (k / Math.max(1, count - 1)) ** 2.2 * glowStrength
      tc.array[k * 3] = f
      tc.array[k * 3 + 1] = f * 0.68
      tc.array[k * 3 + 2] = f * 0.28
    }
    tp.needsUpdate = true
    tc.needsUpdate = true
    trail.setDrawRange(0, count)

    // (shader note)
    const sepAzi = Math.atan2(c.z2 - c.z1, c.x2 - c.x1)
    let key: Exclude<FramingKey, 'auto'>
    if (view.framing !== 'auto') key = view.framing
    else if (runtime.t >= track.tMerge - 8) key = 'remnant'
    else if (c.sep > 16) key = 'approach'
    else key = 'wide'
    const want = framingFor(key, runtime, sepAzi)
    const drag = dragRef.current
    if (!cam.current.ready) {
      cam.current.azi = want.azi + drag.azi
      cam.current.elev = want.elev
      cam.current.dist = want.dist
      cam.current.tx = want.tx
      cam.current.ty = want.ty
      cam.current.tz = want.tz
      cam.current.ready = true
    }
    const elevWant = view.elevBias === 'top' ? 1.36 : view.elevBias === 'side' ? 0.16 : want.elev
    cam.current.tx = damp(cam.current.tx, want.tx, 3, dt)
    cam.current.ty = damp(cam.current.ty, want.ty, 3, dt)
    cam.current.tz = damp(cam.current.tz, want.tz, 3, dt)
    cam.current.dist = damp(cam.current.dist, want.dist * drag.distScale, 2.2, dt)
    if (drag.userAngle) {
      cam.current.azi = drag.azi
      cam.current.elev = drag.elev
    } else {
      cam.current.azi = dampAngle(cam.current.azi, want.azi, 1.7, dt)
      cam.current.elev = damp(cam.current.elev, elevWant, 1.7, dt)
      drag.azi = cam.current.azi
      drag.elev = cam.current.elev
    }
    const ce = Math.cos(cam.current.elev)
    state.camera.position.set(
      cam.current.tx + cam.current.dist * ce * Math.cos(cam.current.azi),
      cam.current.ty + cam.current.dist * Math.sin(cam.current.elev),
      cam.current.tz + cam.current.dist * ce * Math.sin(cam.current.azi),
    )
    state.camera.lookAt(cam.current.tx, cam.current.ty, cam.current.tz)

    // (shader note)
    const now = state.clock.elapsedTime
    if (now - sampleAt.current > 0.12) {
      sampleAt.current = now
      const gyr = toGyr(runtime.t)
      const sepKpc = c.sep * KPC_PER_UNIT
      const phase = merged
        ? '已并合 · 椭圆星系'
        : runtime.t >= track.tPeri
          ? sepKpc < 40 ? '再次穿越' : '第一次擦身之后'
          : sepKpc > 250 ? '还在路上' : '即将擦身'
      onSample({
        gyr,
        sepKpc,
        approachKmS: runtime.cfg.approachKmS,
        clusters: runtime.ignited,
        sunKpc: sunRadiusKpc(runtime),
        phase,
        merged,
      })
    }
  })

  const nucleusGroup = (index: 0 | 1) => {
    const warm = index === 0 ? '#ffd9a0' : '#dbe6ff'
    const halo = index === 0 ? '#ffb86b' : '#7ea6ff'
    const scale = index === 0 ? 1 : 1.08
    return (
      <group key={index} ref={(g) => { nucleus.current[index] = g }}>
        <sprite scale={[0.42 * scale, 0.42 * scale, 1]}>
          <spriteMaterial map={glow} color={warm} transparent opacity={0.62} blending={THREE.AdditiveBlending} depthWrite={false} depthTest={false} />
        </sprite>
        <sprite scale={[1.35 * scale, 1.35 * scale, 1]}>
          <spriteMaterial map={glow} color={warm} transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} depthTest={false} />
        </sprite>
        <sprite scale={[3.8 * scale, 3.8 * scale, 1]}>
          <spriteMaterial map={glow} color={halo} transparent opacity={0.055} blending={THREE.AdditiveBlending} depthWrite={false} depthTest={false} />
        </sprite>
      </group>
    )
  }

  return (
    <group>
      <Stars radius={220} depth={90} count={reducedMotion ? 1800 : 3600} factor={5} saturation={0.06} fade speed={reducedMotion ? 0 : 0.18} />
      {[0, 1].map((h) => (
        <group key={h} ref={(g) => { haze.current[h] = g }}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} material={hazeMaterials[h]}>
            <planeGeometry args={[HAZE_RADIUS * 2, HAZE_RADIUS * 2, 1, 1]} />
          </mesh>
        </group>
      ))}
      {nucleusGroup(0)}
      {nucleusGroup(1)}
      <sprite ref={spheroid}>
        <spriteMaterial map={glow} color="#ffc98a" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} depthTest={false} />
      </sprite>
      <points geometry={geometry} material={material} frustumCulled={false} />
      <primitive object={trailObject} />
      <sprite ref={sunSprite} scale={[0.15, 0.15, 1]}>
        <spriteMaterial map={glow} color="#ffd166" transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} depthTest={false} />
      </sprite>
    </group>
  )
}

function Resize() {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    gl.setClearColor('#02030a', 1)
  }, [gl])
  return null
}

// (shader note)
// ——————————————————————————————————————————————————————————————

const MODE_LABEL: Record<EncounterMode, string> = {
  grazing: '擦边',
  'head-on': '对撞',
  retrograde: '逆行',
}

const MODE_HINT: Record<EncounterMode, string> = {
  grazing: '两条又长又细的潮汐尾，中间连着一座桥',
  'head-on': '几乎正面撞上：尾巴更短，外盘被打散成壳层',
  retrograde: '盘的自转与轨道反向，潮汐拉不动它——尾巴又短又粗',
}

function formatGyr(gyr: number) {
  return `${(gyr * 10).toFixed(1)} 亿年`
}

export function GalaxyCollision({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const reducedMotion = false
  const { storyMode, enterFree, enterStory } = useStoryFreeMode('galaxy-collision')

  const rootRef = useRef<HTMLDivElement>(null)
  const freebarRef = useRef<HTMLElement | null>(null)

  const rtRef = useRef<SimRuntime | null>(null)
  if (!rtRef.current) {
    const small = typeof window !== 'undefined'
      && (window.innerWidth < 760 || (navigator.hardwareConcurrency ?? 8) <= 4)
    rtRef.current = createRuntime({ ...DEFAULT_CONFIG }, small ? 3000 : 6200, small ? 800 : 1600)
  }

  const viewRef = useRef<ViewState>({
    goal: fromGyr(0.15),
    target: fromGyr(0.15),
    ceiling: T_MAX,
    playing: false,
    rate: 1,
    glide: false,
    framing: 'auto',
    elevBias: 'auto',
    hostTint: 0,
    gasLevel: 0.85,
    sunFocus: 0.35,
  })
  const dragRef = useRef({ azi: 0, elev: 0.34, distScale: 1, userAngle: false })

  const [playing, setPlaying] = useState(false)
  const [rate, setRate] = useState(1)
  const [mode, setMode] = useState<EncounterMode>(DEFAULT_CONFIG.mode)
  const [elevBias, setElevBias] = useState<'auto' | 'top' | 'side'>('auto')
  const [noteOpen, setNoteOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [hud, setHud] = useState<Hud>({
    gyr: 0.15, sepKpc: 780, approachKmS: 110, clusters: 0, sunKpc: 8, phase: '还在路上', merged: false,
  })

  useEffect(() => {
    controls.completeOnboarding()
  }, [controls])

  // (shader note)
  useEffect(() => {
    if (reducedMotion) return
    viewRef.current.playing = true
    setPlaying(true)
  }, [reducedMotion])

  useEffect(() => {
    viewRef.current.rate = rate
  }, [rate])
  useEffect(() => {
    viewRef.current.elevBias = elevBias
    if (elevBias !== 'auto') dragRef.current.userAngle = false
  }, [elevBias])

  // (shader note) — Freebar publishes --experience-freebar-height; mirror for readout clearance
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const apply = () => {
      const bar = root.querySelector('.experience-freebar') as HTMLElement | null
      freebarRef.current = bar
      if (!bar) {
        root.style.setProperty('--gcx-readout-bottom', '28px')
        return
      }
      root.style.setProperty('--gcx-readout-bottom', `${Math.round(bar.getBoundingClientRect().height) + 14}px`)
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(root)
    return () => ro.disconnect()
  }, [storyMode])

  const jumpTo = useCallback((gyr: number, glide = true, ceilingGyr = Infinity) => {
    const v = viewRef.current
    v.ceiling = Number.isFinite(ceilingGyr) ? clamp(fromGyr(ceilingGyr), 0, T_MAX) : T_MAX
    v.goal = clamp(fromGyr(gyr), 0, T_MAX)
    v.glide = glide
    if (!glide) v.target = v.goal
  }, [])

  const applyConfig = useCallback((next: Partial<EncounterConfig>) => {
    const rt = rtRef.current!
    // 接近速度固定为观测值 ~110 km/s，界面只切换交会几何
    const cfg: EncounterConfig = {
      mode: next.mode ?? rt.cfg.mode,
      approachKmS: DEFAULT_CONFIG.approachKmS,
    }
    if (cfg.mode === rt.cfg.mode && cfg.approachKmS === rt.cfg.approachKmS) return
    const wasEncounter = rt.t > rt.track.tHandoff - 4
    rebuild(rt, cfg)
    setMode(cfg.mode)
    const v = viewRef.current
    // (shader note)
    const gyr = wasEncounter ? toGyr(rt.track.tPeri) + 0.3 : toGyr(v.target)
    v.ceiling = T_MAX
    v.goal = clamp(fromGyr(gyr), 0, T_MAX)
    v.target = v.goal
    v.glide = false
  }, [])

  // (shader note)
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    let pointer: number | null = null
    let lastX = 0
    let lastY = 0
    let pinch = 0

    const isStage = (target: EventTarget | null) =>
      !(target instanceof HTMLElement) || !target.closest('[data-experience-overlay]')

    const down = (e: PointerEvent) => {
      if (!isStage(e.target)) return
      pointer = e.pointerId
      lastX = e.clientX
      lastY = e.clientY
      setDragging(true)
    }
    const move = (e: PointerEvent) => {
      if (pointer !== e.pointerId) return
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY
      if (Math.abs(dx) + Math.abs(dy) < 0.5) return
      const d = dragRef.current
      d.userAngle = true
      d.azi -= dx * 0.006
      d.elev = clamp(d.elev + dy * 0.005, 0.06, 1.48)
      controls.registerInteraction()
    }
    const up = (e: PointerEvent) => {
      if (pointer !== e.pointerId) return
      pointer = null
      setDragging(false)
    }
    const wheel = (e: WheelEvent) => {
      if (!isStage(e.target)) return
      e.preventDefault()
      const d = dragRef.current
      d.distScale = clamp(d.distScale * Math.exp(e.deltaY * 0.0012), 0.34, 2.6)
      controls.registerInteraction()
    }
    const touchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2) return
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      )
      if (pinch > 0) {
        const d = dragRef.current
        d.distScale = clamp(d.distScale * (pinch / dist), 0.34, 2.6)
      }
      pinch = dist
      controls.registerInteraction()
    }
    const touchEnd = () => { pinch = 0 }

    root.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    root.addEventListener('wheel', wheel, { passive: false })
    root.addEventListener('touchmove', touchMove, { passive: true })
    root.addEventListener('touchend', touchEnd)
    return () => {
      root.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      root.removeEventListener('wheel', wheel)
      root.removeEventListener('touchmove', touchMove)
      root.removeEventListener('touchend', touchEnd)
    }
  }, [controls])

  const setScene = useCallback((framing: FramingKey, opts: { hostTint?: number; gasLevel?: number; sunFocus?: number } = {}) => {
    const v = viewRef.current
    v.framing = framing
    v.hostTint = opts.hostTint ?? 0
    v.gasLevel = opts.gasLevel ?? 0.7
    v.sunFocus = opts.sunFocus ?? 0.35
    if (framing === 'auto') v.ceiling = T_MAX
    dragRef.current.userAngle = false
    dragRef.current.distScale = 1
    setElevBias('auto')
  }, [])

  const play = useCallback((on: boolean) => {
    viewRef.current.playing = on
    setPlaying(on)
  }, [])

  const guideSteps: Array<GuideStep> = [
    {
      title: '两张盘，正在互相靠近',
      body: '近处这张是银河系。右边那片斜着的盘是仙女座——250 万光年外，正以每秒 110 公里朝我们过来。快进 30 亿年：它明显变大了。',
      durationMs: 7600,
      action: () => {
        applyConfig({ mode: 'grazing', approachKmS: 110 })
        jumpTo(0.15, false, 0.2)
        setScene('approach')
        play(true)
        window.setTimeout(() => jumpTo(3.3, true, 3.72), 60)
      },
    },
    {
      title: '第一次擦身，先甩出两条尾巴',
      body: '40 亿年后它们第一次擦肩。引力拉近侧比拉远侧更狠，外盘的恒星被整段抽出去——两条几十万光年长的潮汐尾，中间还架着一座桥。星系相撞，首先是「形」的碰撞。',
      durationMs: 7600,
      action: () => {
        setScene('wide', { hostTint: 0.8, gasLevel: 0.3 })
        jumpTo(4.26, true, 4.36)
        play(true)
      },
    },
    {
      title: '穿过去了，但几乎没有相撞',
      body: '把时间倒回擦身那一刻，镜头推近：金色是银河系的恒星，蓝色是仙女座的。两群星直接穿过彼此——恒星之间的距离是它自己直径的三千万倍，像两群蜜蜂互相穿过。',
      durationMs: 8200,
      action: () => {
        setScene('contact', { hostTint: 1, sunFocus: 0.2 })
        jumpTo(3.99, true, 4.06)
        play(true)
      },
    },
    {
      title: '但气体撞得上，于是天空亮起来',
      body: '恒星穿得过去，气体云穿不过去。云与云正面相撞、被激波压缩，几百万年内就塌缩成一片新恒星——蓝白色的年轻星团在交会区亮成一串。这叫「星暴」。',
      durationMs: 7600,
      action: () => {
        setScene('burst', { gasLevel: 1.7 })
        jumpTo(4.09, true, 4.2)
        play(true)
      },
    },
    {
      title: '并成一个椭圆星系：Milkomeda',
      body: '又绕了几圈之后，两个核落到一起。旋涡盘没有了，气体也烧光了，剩下一团偏红的老年恒星——有人叫它 Milkomeda。金色那颗是太阳：它大概率被甩到离银心远得多的新轨道上。',
      durationMs: 9000,
      action: () => {
        setScene('remnant', { sunFocus: 1 })
        jumpTo(6.4, true, 7)
        play(true)
      },
    },
  ]

  const timeGyr = hud.gyr
  const sepText = hud.merged ? tx('已并合') : `${hud.sepKpc >= 100 ? Math.round(hud.sepKpc) : hud.sepKpc.toFixed(1)} ${tx('kpc')}`
  const showApproach = hud.sepKpc > 90 && !hud.merged

  return (
    <div
      ref={rootRef}
      className={`oss-experience gcx-experience${storyMode ? ' is-story' : ' is-free'}${dragging ? ' is-dragging' : ''}`}
    >
      <div className="gcx-stage">
        <Canvas
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          camera={{ position: [0, 4, 12], fov: 42, near: 0.05, far: 900 }}
        >
          <color attach="background" args={['#02030a']} />
          <Resize />
          <Scene rtRef={rtRef as { current: SimRuntime }} view={viewRef.current} onSample={setHud} reducedMotion={reducedMotion} dragRef={dragRef} />
        </Canvas>
      </div>
      <div className="gcx-vignette" aria-hidden="true" />

      {!storyMode && (
        <header className="gcx-plate" data-experience-overlay="true">
          <strong>{tx('把银河系推向仙女座')}</strong>
          <span>{tx('拖时间轴看 70 亿年：靠近、擦身、甩出潮汐尾，最后并成一个椭圆星系。拖动画面可以换视角。')}</span>
        </header>
      )}

      <aside className="gcx-readout" data-experience-overlay="true" aria-label={tx('星系碰撞读数')}>
        <div className="gcx-readout-row">
          <small>{tx('距今')}</small>
          <strong className="is-accent">{tx(formatGyr(timeGyr))}</strong>
        </div>
        <div className="gcx-readout-row">
          <small>{tx('两核间距')}</small>
          <strong>{sepText}</strong>
        </div>
        {showApproach && (
          <div className="gcx-readout-row">
            <small>{tx('接近速度')}</small>
            <strong>{Math.round(hud.approachKmS)} {tx('km/s')}</strong>
          </div>
        )}
        <div className="gcx-readout-row">
          <small>{tx('恒星相撞')}</small>
          <strong>{tx('0 次')}</strong>
        </div>
        <div className="gcx-readout-row">
          <small>{tx('新生星团')}</small>
          <strong className="is-burst">{hud.clusters}</strong>
        </div>
        <div className="gcx-readout-row">
          <small>{tx('太阳距中心')}</small>
          <strong className="is-sun">{hud.sunKpc.toFixed(0)} {tx('kpc')}</strong>
        </div>
        <p className="gcx-readout-phase">{tx(hud.phase)}</p>
      </aside>

      {!storyMode && (
        <Freebar
          className="gcx-freebar"
          mainClassName="gcx-freebar-main"
          ariaLabel={tx('时间与交会参数')}
          primaryControlBudget={2}
          secondaryDefault="closed"
          secondaryClassName="gcx-freebar-secondary"
          secondary={(
            <div className="gcx-tray">
              {/* 交会 / 流速 / 视角 / 重置·故事：一行横滑；接近速度固定 ~110 km/s，不提供旋钮 */}
              <div className="gcx-chip-rail experience-freebar-chips" role="group" aria-label={tx('交会与工具')}>
                {(Object.keys(MODE_LABEL) as Array<EncounterMode>).map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={mode === m ? 'is-on' : undefined}
                    aria-pressed={mode === m}
                    onClick={() => {
                      controls.registerInteraction()
                      applyConfig({ mode: m })
                    }}
                  >
                    {tx(MODE_LABEL[m])}
                  </button>
                ))}
                <span className="gcx-rail-sep" aria-hidden="true" />
                {[0.5, 1, 2].map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`gcx-rate-chip${rate === r ? ' is-on' : ''}`}
                    aria-pressed={rate === r}
                    onClick={() => {
                      controls.registerInteraction()
                      setRate(r)
                    }}
                  >
                    {tx(`${r}×`)}
                  </button>
                ))}
                <span className="gcx-rail-sep" aria-hidden="true" />
                <button
                  type="button"
                  className={elevBias === 'top' ? 'is-on' : undefined}
                  aria-pressed={elevBias === 'top'}
                  onClick={() => {
                    controls.registerInteraction()
                    setElevBias((v) => (v === 'top' ? 'side' : 'top'))
                  }}
                >
                  {tx(elevBias === 'top' ? '侧视' : '俯视')}
                </button>
                <button
                  type="button"
                  className="gcx-note-link"
                  onClick={() => {
                    controls.registerInteraction()
                    setNoteOpen(true)
                  }}
                >
                  {tx('模型说明')}
                </button>
                <button
                  type="button"
                  className="experience-freebar-reset"
                  onClick={() => {
                    controls.registerInteraction()
                    jumpTo(0.15, false)
                    setScene('auto')
                    play(true)
                  }}
                  aria-label={tx('重置')}
                >
                  <ArrowCounterClockwise weight="bold" aria-hidden="true" />
                  <span>{tx('重置')}</span>
                </button>
                <button
                  type="button"
                  className="experience-freebar-story"
                  onClick={() => {
                    controls.registerInteraction()
                    enterStory()
                    replayGuide('galaxy-collision')
                  }}
                  aria-label={tx('重播故事')}
                >
                  <FilmStrip weight="fill" aria-hidden="true" />
                  <span>{tx('故事')}</span>
                </button>
              </div>
            </div>
          )}
        >
          <button
            type="button"
            className="experience-freebar-play gcx-play"
            data-playing={playing ? 'true' : 'false'}
            onClick={() => {
              controls.registerInteraction()
              if (!playing && viewRef.current.goal >= T_MAX - 1e-3) jumpTo(0.15, false)
              play(!playing)
            }}
            aria-label={tx(playing ? '暂停' : '播放')}
          >
            {playing ? <Pause weight="fill" aria-hidden="true" /> : <Play weight="fill" aria-hidden="true" />}
          </button>

          <div className="gcx-time" role="group" aria-label={tx('时间轴：距今多少亿年')}>
            <span className="gcx-time-label">{tx('距今')}</span>
            <div className="gcx-time-track">
              <input
                type="range"
                min={0}
                max={1000}
                value={Math.round((timeGyr / toGyr(T_MAX)) * 1000)}
                style={{ '--fill': `${(timeGyr / toGyr(T_MAX)) * 100}%` } as CSSProperties}
                onChange={(e) => {
                  controls.registerInteraction()
                  play(false)
                  jumpTo((Number(e.target.value) / 1000) * toGyr(T_MAX), false)
                }}
                aria-label={tx('时间轴：距今多少亿年')}
              />
              <div className="gcx-time-ends" aria-hidden="true">
                <span>{tx('今天')}</span>
                <span>{tx('并合')}</span>
              </div>
            </div>
            <strong className="gcx-time-value">{tx(formatGyr(timeGyr))}</strong>
          </div>
        </Freebar>
      )}

      {noteOpen && (
        <div className="gcx-note" role="dialog" aria-label={tx('模型说明')} data-experience-overlay="true">
          <article>
            <button type="button" onClick={() => setNoteOpen(false)} aria-label={tx('关闭')}><X weight="bold" /></button>
            <h2>{tx('这是一台 1972 年的机器：限制性 N 体')}</h2>
            <p>
              {tx('阿拉尔·图姆雷与尤里·图姆雷兄弟在 1972 年那篇《Galactic Bridges and Tails》里做了一件很聪明的简化：只把两个星系的核当作')}
              <strong>{tx('质点')}</strong>
              {tx('，几千颗盘星当作只受这两个质点引力、彼此不互相吸引的「试验粒子」。当时的计算机跑不了真正的 N 体，但这台简化机器一次就复现了天文照片上那些桥与潮尾——潮汐尾的形状，几乎只取决于交会的几何。这个世界跑的就是同一套算法。')}
            </p>
            <p>
              {tx('时间轴按 NASA 与 Cox & Loeb (2008) 的结论标定：仙女座今天以约 110 km/s 靠近，40 亿年后第一次擦身，约 60 亿年后并合完成。仙女座的横向速度测量不确定度很大，所以「正撞 / 擦边」都在合理范围内——这也是三个交会方式都值得试的原因。')}
            </p>
            <p>
              {tx('恒星几乎不可能相撞不是艺术处理：太阳附近恒星的平均间距约 4 光年，是太阳直径的三千万倍。把太阳缩成一粒沙，最近的邻居在几十公里以外。而气体云的尺度是恒星的上亿倍，所以云会真的撞上、被压缩，点亮星暴。')}
            </p>
            <small>
              {tx('模型边界：质点势没有暗物质晕的延展结构，所以近距交会时的相对速度被高估，读数里只在两核相距 90 kpc 以上时显示接近速度；并合靠一项示意性的动力学摩擦项完成，不是自洽的 N 体计算；气体点火用的是两团气体在同一网格里相遇的判据，不是流体力学；粒子数、盘的厚度与颜色都做了可读性处理。轨道周期与真实值不成比例，只有时间轴上的关键时刻是标定过的。')}
            </small>
          </article>
        </div>
      )}

      <GuideTour
        worldId="galaxy-collision"
        steps={guideSteps}
        placement="stage"
        stagePlan={[
          { position: 'top-left', mobilePosition: 'top-left', width: 'wide', treatment: 'monumental' },
          { position: 'top-right', mobilePosition: 'top-right', motion: 'drift-left', treatment: 'editorial' },
          { position: 'bottom-left', mobilePosition: 'bottom-left', motion: 'rise', treatment: 'caption' },
          { position: 'bottom-right', mobilePosition: 'bottom-right', motion: 'drift-right', treatment: 'editorial' },
          { position: 'top-left', mobilePosition: 'top-left', motion: 'fade', treatment: 'caption' },
        ]}
        defaultOpen={storyMode}
        showReplayChip={false}
        onExit={() => {
          enterFree()
          setScene('auto')
          play(true)
        }}
      />
      {!storyMode && (
        <GhostHint
          worldId="galaxy-collision"
          gesture={{ type: 'scrub', target: '.gcx-time input', label: tx('拖时间轴，看 70 亿年') }}
        />
      )}
    </div>
  )
}
