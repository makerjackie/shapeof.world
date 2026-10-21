import './styles/ButterflyEffect.css'
import { useWorldReducedMotion } from '~/lib/world-motion'

import { useEffect, useMemo, useRef, useState, type ComponentRef, type MutableRefObject } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import * as THREE from 'three'
import { Butterfly, Check, DiceFive, FilmStrip, Link as LinkIcon, Pause, Play, Question, X } from '@phosphor-icons/react'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { GuideTour, replayGuide, type GuideStep } from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import { useExperienceI18n } from '~/i18n/experience'

import {
  ATTRACTORS,
  ATTRACTOR_ORDER,
  buildShareQuery,
  generateCustomAttractor,
  isFiniteState,
  paramsModified,
  resolveShareDef,
  rk4Step,
  separation,
  speedOf,
  survives,
  toWorld,
  withParam,
  type AttractorDef,
  type Vec3,
} from './butterfly-effect-model'
import {
  DEFAULT_STYLE,
  VISUAL_STYLES,
  VISUAL_STYLE_ORDER,
  isVisualStyleId,
  type Rgb,
  type VisualStyle,
  type VisualStyleId,
} from './butterfly-effect-styles'

type Scene = 'seed' | 'grow' | 'split' | 'portrait' | 'free'

const GOLD: [number, number, number] = [1.0, 0.78, 0.4]
const CYAN: [number, number, number] = [0.45, 0.9, 1.0]

/** 故事分镜的机位预设。dist 会乘以 frameScale 适配窄屏。 */
const STORY_PRESETS: Record<Exclude<Scene, 'free'>, { dist: number; phi: number; drift: number; follow: boolean }> = {
  seed: { dist: 3.4, phi: 1.15, drift: 0.12, follow: true },
  grow: { dist: 6.2, phi: 0.9, drift: 0.1, follow: false },
  split: { dist: 9.6, phi: 0.85, drift: 0.06, follow: false },
  portrait: { dist: 9.2, phi: 0.9, drift: 0.18, follow: false },
}

const RIBBON_LEN = 420
const SPARK_WINDOW_MS = 45_000

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/* 拖尾/彗星的着色方案已迁入 butterfly-effect-styles.ts（余烬/极光/光谱/白瓷）。 */

/* ---------------- three.js 场景对象 ---------------- */

type Trail = {
  points: THREE.Points
  pos: THREE.BufferAttribute
  col: THREE.BufferAttribute
  /** 每点写入时的瞬时速度 |v|，切换视觉风格时据此重着色 */
  meta: Float32Array
  index: number
  count: number
}

type Ribbon = {
  points: THREE.Points
  pos: THREE.BufferAttribute
  col: THREE.BufferAttribute
  history: Float32Array
  head: number
  count: number
}

/** 连续丝线：世界坐标 + 瞬时速度的环形历史，每帧按时间序展开成 THREE.Line。 */
type Silk = {
  line: THREE.Line
  pos: THREE.BufferAttribute
  col: THREE.BufferAttribute
  histPos: Float32Array
  histSpeed: Float32Array
  head: number
  count: number
}

type SceneObjects = {
  root: THREE.Group
  trailA: Trail
  trailB: Trail
  ribbonA: Ribbon
  ribbonB: Ribbon
  silkA: Silk
  silkB: Silk
  headA: THREE.Sprite
  headB: THREE.Sprite
  tether: THREE.Line
  tetherMat: THREE.LineBasicMaterial
  grid: THREE.PolarGridHelper
}

function makeSoftTexture(): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 64
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.35, 'rgba(255,255,255,0.55)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}

function makeTrail(n: number, size: number, texture: THREE.Texture): Trail {
  const geometry = new THREE.BufferGeometry()
  const pos = new THREE.BufferAttribute(new Float32Array(n * 3), 3)
  const col = new THREE.BufferAttribute(new Float32Array(n * 3), 3)
  pos.setUsage(THREE.DynamicDrawUsage)
  col.setUsage(THREE.DynamicDrawUsage)
  geometry.setAttribute('position', pos)
  geometry.setAttribute('color', col)
  geometry.setDrawRange(0, 0)
  const material = new THREE.PointsMaterial({
    size,
    map: texture,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  })
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  return { points, pos, col, meta: new Float32Array(n), index: 0, count: 0 }
}

function makeRibbon(texture: THREE.Texture): Ribbon {
  const geometry = new THREE.BufferGeometry()
  const pos = new THREE.BufferAttribute(new Float32Array(RIBBON_LEN * 3), 3)
  const col = new THREE.BufferAttribute(new Float32Array(RIBBON_LEN * 3), 3)
  pos.setUsage(THREE.DynamicDrawUsage)
  col.setUsage(THREE.DynamicDrawUsage)
  geometry.setAttribute('position', pos)
  geometry.setAttribute('color', col)
  geometry.setDrawRange(0, 0)
  const material = new THREE.PointsMaterial({
    size: 0.07,
    map: texture,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  })
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  return { points, pos, col, history: new Float32Array(RIBBON_LEN * 3), head: 0, count: 0 }
}

function makeHead(color: [number, number, number], texture: THREE.Texture): THREE.Sprite {
  const material = new THREE.SpriteMaterial({
    map: texture,
    color: new THREE.Color(color[0], color[1], color[2]),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const sprite = new THREE.Sprite(material)
  sprite.scale.setScalar(0.26)
  sprite.frustumCulled = false
  return sprite
}

function makeSilk(n: number): Silk {
  const geometry = new THREE.BufferGeometry()
  const pos = new THREE.BufferAttribute(new Float32Array(n * 3), 3)
  const col = new THREE.BufferAttribute(new Float32Array(n * 3), 3)
  pos.setUsage(THREE.DynamicDrawUsage)
  col.setUsage(THREE.DynamicDrawUsage)
  geometry.setAttribute('position', pos)
  geometry.setAttribute('color', col)
  geometry.setDrawRange(0, 0)
  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const line = new THREE.Line(geometry, material)
  line.frustumCulled = false
  line.visible = false
  return { line, pos, col, histPos: new Float32Array(n * 3), histSpeed: new Float32Array(n), head: 0, count: 0 }
}

function makeBlueprintGrid(): THREE.PolarGridHelper {
  const grid = new THREE.PolarGridHelper(4.6, 16, 7, 72, 0x2a5a7a, 0x14334a)
  const material = grid.material as THREE.LineBasicMaterial
  material.transparent = true
  material.opacity = 0.5
  material.depthWrite = false
  grid.position.y = -2.7
  grid.visible = false
  return grid
}

function makeSceneObjects(trailLength: number, silkLength: number): SceneObjects {
  const texture = makeSoftTexture()
  const root = new THREE.Group()
  const trailA = makeTrail(trailLength, 0.03, texture)
  const trailB = makeTrail(trailLength, 0.03, texture)
  const ribbonA = makeRibbon(texture)
  const ribbonB = makeRibbon(texture)
  const silkA = makeSilk(silkLength)
  const silkB = makeSilk(silkLength)
  const headA = makeHead(GOLD, texture)
  const headB = makeHead(CYAN, texture)
  headB.visible = false
  const grid = makeBlueprintGrid()
  const tetherGeo = new THREE.BufferGeometry()
  const tetherPos = new THREE.BufferAttribute(new Float32Array(6), 3)
  tetherPos.setUsage(THREE.DynamicDrawUsage)
  tetherGeo.setAttribute('position', tetherPos)
  const tetherMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(1, 1, 1),
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const tether = new THREE.Line(tetherGeo, tetherMat)
  tether.frustumCulled = false
  tether.visible = false
  root.add(trailA.points, trailB.points, ribbonA.points, ribbonB.points, silkA.line, silkB.line, headA, headB, tether, grid)
  return { root, trailA, trailB, ribbonA, ribbonB, silkA, silkB, headA, headB, tether, tetherMat, grid }
}

function writeTrail(trail: Trail, w: Vec3, color: Rgb, speed: number) {
  const i = trail.index
  trail.pos.setXYZ(i, w.x, w.y, w.z)
  trail.col.setXYZ(i, color[0], color[1], color[2])
  trail.meta[i] = speed
  trail.index = (i + 1) % trail.pos.count
  trail.count = Math.min(trail.count + 1, trail.pos.count)
  trail.pos.addUpdateRange(i * 3, 3)
  trail.col.addUpdateRange(i * 3, 3)
  trail.pos.needsUpdate = true
  trail.col.needsUpdate = true
  trail.points.geometry.setDrawRange(0, trail.count)
}

function clearTrail(trail: Trail) {
  trail.index = 0
  trail.count = 0
  trail.points.geometry.setDrawRange(0, 0)
}

/** Collapse thousands of prefill ranges into one complete GPU upload. */
function flushPrefilledTrail(trail: Trail) {
  trail.pos.clearUpdateRanges()
  trail.col.clearUpdateRanges()
  trail.pos.addUpdateRange(0, trail.pos.count * 3)
  trail.col.addUpdateRange(0, trail.col.count * 3)
  trail.pos.needsUpdate = true
  trail.col.needsUpdate = true
}

function pushRibbon(ribbon: Ribbon, w: Vec3) {
  const i = ribbon.head
  ribbon.history[i * 3] = w.x
  ribbon.history[i * 3 + 1] = w.y
  ribbon.history[i * 3 + 2] = w.z
  ribbon.head = (i + 1) % RIBBON_LEN
  ribbon.count = Math.min(ribbon.count + 1, RIBBON_LEN)
}

function clearRibbon(ribbon: Ribbon) {
  ribbon.head = 0
  ribbon.count = 0
  ribbon.points.geometry.setDrawRange(0, 0)
}

function rebuildRibbon(ribbon: Ribbon, color: [number, number, number]) {
  const n = ribbon.count
  for (let k = 0; k < n; k += 1) {
    // k = 0 是最新点，向历史深处逐渐熄灭
    const src = (ribbon.head - 1 - k + RIBBON_LEN * 2) % RIBBON_LEN
    const fade = Math.pow(1 - k / RIBBON_LEN, 1.7)
    ribbon.pos.setXYZ(k, ribbon.history[src * 3], ribbon.history[src * 3 + 1], ribbon.history[src * 3 + 2])
    ribbon.col.setXYZ(k, color[0] * fade, color[1] * fade, color[2] * fade)
  }
  ribbon.pos.needsUpdate = true
  ribbon.col.needsUpdate = true
  ribbon.points.geometry.setDrawRange(0, n)
}

function pushSilk(silk: Silk, w: Vec3, speed: number) {
  const cap = silk.histSpeed.length
  const i = silk.head
  silk.histPos[i * 3] = w.x
  silk.histPos[i * 3 + 1] = w.y
  silk.histPos[i * 3 + 2] = w.z
  silk.histSpeed[i] = speed
  silk.head = (i + 1) % cap
  silk.count = Math.min(silk.count + 1, cap)
}

function clearSilk(silk: Silk) {
  silk.head = 0
  silk.count = 0
  silk.line.geometry.setDrawRange(0, 0)
}

/** 把环形历史按时间序展开写入 Line 几何体，并按当前风格逐点着色。 */
function rebuildSilk(silk: Silk, def: AttractorDef, style: VisualStyle, twin: 'a' | 'b') {
  const n = silk.count
  if (n < 2) {
    silk.line.geometry.setDrawRange(0, 0)
    return
  }
  const cap = silk.histSpeed.length
  const start = n < cap ? 0 : silk.head
  const posArr = silk.pos.array as Float32Array
  const colArr = silk.col.array as Float32Array
  const w: Vec3 = { x: 0, y: 0, z: 0 }
  for (let k = 0; k < n; k += 1) {
    const src = (start + k) % cap
    w.x = silk.histPos[src * 3]
    w.y = silk.histPos[src * 3 + 1]
    w.z = silk.histPos[src * 3 + 2]
    const [r, g, b] = style.color(def, w, silk.histSpeed[src], twin)
    posArr[k * 3] = w.x
    posArr[k * 3 + 1] = w.y
    posArr[k * 3 + 2] = w.z
    colArr[k * 3] = r
    colArr[k * 3 + 1] = g
    colArr[k * 3 + 2] = b
  }
  silk.pos.needsUpdate = true
  silk.col.needsUpdate = true
  silk.line.geometry.setDrawRange(0, n)
}

/** 切换视觉风格：换装材质（混合模式 / 点径 / 不透明度 / 彗星头与连线色）与图层可见性。 */
function applyVisualStyle(objects: SceneObjects, style: VisualStyle) {
  const blending = style.additive ? THREE.AdditiveBlending : THREE.NormalBlending
  for (const trail of [objects.trailA, objects.trailB]) {
    const material = trail.points.material as THREE.PointsMaterial
    material.blending = blending
    material.opacity = style.trailOpacity
    material.size = style.trailSize
    material.needsUpdate = true
    trail.points.visible = !style.lines
  }
  for (const ribbon of [objects.ribbonA, objects.ribbonB]) {
    const material = ribbon.points.material as THREE.PointsMaterial
    material.blending = blending
    material.opacity = style.additive ? 0.95 : 0.8
    material.needsUpdate = true
  }
  for (const silk of [objects.silkA, objects.silkB]) {
    const material = silk.line.material as THREE.LineBasicMaterial
    material.blending = blending
    material.opacity = style.additive ? 0.9 : 0.85
    material.needsUpdate = true
    silk.line.visible = !!style.lines
  }
  objects.grid.visible = !!style.grid
  for (const [head, rgb] of [
    [objects.headA, style.headA],
    [objects.headB, style.headB],
  ] as const) {
    const material = head.material as THREE.SpriteMaterial
    material.blending = blending
    material.color.setRGB(rgb[0], rgb[1], rgb[2])
    material.needsUpdate = true
  }
  objects.tetherMat.color.set(style.tether)
}

/** 用每点记住的速度与世界坐标重着色整条拖尾——风格切换不清空已长成的形状。 */
function recolorTrail(trail: Trail, def: AttractorDef, style: VisualStyle, twin: 'a' | 'b') {
  const w: Vec3 = { x: 0, y: 0, z: 0 }
  for (let i = 0; i < trail.count; i += 1) {
    w.x = trail.pos.getX(i)
    w.y = trail.pos.getY(i)
    w.z = trail.pos.getZ(i)
    const [r, g, b] = style.color(def, w, trail.meta[i], twin)
    trail.col.setXYZ(i, r, g, b)
  }
  trail.col.clearUpdateRanges()
  trail.col.addUpdateRange(0, trail.col.count * 3)
  trail.col.needsUpdate = true
}

/* ---------------- 仿真循环状态 ---------------- */

type HudSample = { t: number; sep: number; bActive: boolean }

type LoopState = {
  playing: boolean
  scene: Scene
  def: AttractorDef
  style: VisualStyle
  speedMult: number
  storySpeed: number
  a: Vec3
  b: Vec3
  bActive: boolean
  t: number
  sepSamples: Array<{ at: number; sep: number }>
  hudAt: number
  frameScale: number
  azimuth: number
  smoothTarget: THREE.Vector3
  /** A/B 上一帧拖尾写入的世界坐标（用于中点插值，避免点阵断点） */
  wa: Vec3
  wb: Vec3
  objects: SceneObjects | null
  controls: ComponentRef<typeof OrbitControls> | null
}

const scratchWorld: Vec3 = { x: 0, y: 0, z: 0 }
const scratchCamPos = new THREE.Vector3()
const scratchMid: Vec3 = { x: 0, y: 0, z: 0 }

/** 按世界间距自适应细分写入，保证高速段拖尾也是连续光丝。 */
function writeSegment(trail: Trail, from: Vec3, to: Vec3, color: Rgb, speed: number) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dz = to.z - from.z
  const dist = Math.hypot(dx, dy, dz)
  const parts = clamp(Math.ceil(dist / 0.045), 1, 8)
  for (let k = 1; k <= parts; k += 1) {
    scratchMid.x = from.x + (dx * k) / parts
    scratchMid.y = from.y + (dy * k) / parts
    scratchMid.z = from.z + (dz * k) / parts
    writeTrail(trail, scratchMid, color, speed)
  }
}

function stepOnce(loop: LoopState) {
  const def = loop.def
  const style = loop.style
  rk4Step(def, loop.a, def.dt)
  if (!isFiniteState(loop.a)) loop.a = { ...def.seed }
  if (loop.bActive) {
    rk4Step(def, loop.b, def.dt)
    if (!isFiniteState(loop.b)) loop.b = { ...def.seed }
  }
  loop.t += def.dt
  const o = loop.objects
  toWorld(def, loop.a, scratchWorld)
  if (o) {
    const speed = speedOf(def, loop.a)
    writeSegment(o.trailA, loop.wa, scratchWorld, style.color(def, scratchWorld, speed, 'a'), speed)
    pushRibbon(o.ribbonA, scratchWorld)
    pushSilk(o.silkA, scratchWorld, speed)
  }
  loop.wa.x = scratchWorld.x
  loop.wa.y = scratchWorld.y
  loop.wa.z = scratchWorld.z
  if (loop.bActive) {
    toWorld(def, loop.b, scratchWorld)
    if (o) {
      const speed = speedOf(def, loop.b)
      writeSegment(o.trailB, loop.wb, scratchWorld, style.color(def, scratchWorld, speed, 'b'), speed)
      pushRibbon(o.ribbonB, scratchWorld)
      pushSilk(o.silkB, scratchWorld, speed)
    }
    loop.wb.x = scratchWorld.x
    loop.wb.y = scratchWorld.y
    loop.wb.z = scratchWorld.z
  }
}

function advance(loop: LoopState, units: number) {
  const def = loop.def
  const steps = Math.min(Math.round(units / def.dt), 240_000)
  for (let i = 0; i < steps; i += 1) stepOnce(loop)
}

function spawnTwin(loop: LoopState) {
  const def = loop.def
  loop.b = { x: loop.a.x + def.twinOffset, y: loop.a.y, z: loop.a.z }
  loop.bActive = true
  loop.sepSamples = []
  toWorld(def, loop.b, scratchWorld)
  loop.wb.x = scratchWorld.x
  loop.wb.y = scratchWorld.y
  loop.wb.z = scratchWorld.z
  if (loop.objects) {
    clearTrail(loop.objects.trailB)
    clearRibbon(loop.objects.ribbonB)
    clearSilk(loop.objects.silkB)
  }
}

function resetSim(loop: LoopState, def: AttractorDef, paired: boolean) {
  loop.def = def
  loop.a = { ...def.seed }
  loop.bActive = false
  loop.t = 0
  loop.sepSamples = []
  toWorld(def, loop.a, scratchWorld)
  loop.wa.x = scratchWorld.x
  loop.wa.y = scratchWorld.y
  loop.wa.z = scratchWorld.z
  if (loop.objects) {
    clearTrail(loop.objects.trailA)
    clearTrail(loop.objects.trailB)
    clearRibbon(loop.objects.ribbonA)
    clearRibbon(loop.objects.ribbonB)
    clearSilk(loop.objects.silkA)
    clearSilk(loop.objects.silkB)
  }
  if (paired) spawnTwin(loop)
}

/**
 * 预跑成形：A 先独自跑一段，放入双胞胎后继续跑，并补跑到拖尾铺满
 * 12000 点（上限 400 模型单位）。切换/掷骰后立刻看到完整吸引子，
 * 双胞胎的分离仍在现场发生。
 */
function prefill(loop: LoopState, units: number) {
  loop.bActive = false
  advance(loop, units * 0.55)
  spawnTwin(loop)
  advance(loop, units * 0.45)
  let guard = 0
  while ((loop.objects?.trailA.count ?? 0) < 12000 && loop.t < 400 && guard < 60) {
    advance(loop, 5)
    guard += 1
  }
  if (loop.objects) {
    flushPrefilledTrail(loop.objects.trailA)
    flushPrefilledTrail(loop.objects.trailB)
  }
}

/* ---------------- 场景组件 ---------------- */

function ButterflyScene({
  loop,
  style,
  reducedMotion,
  onHud,
  onInteract,
}: {
  loop: MutableRefObject<LoopState>
  style: VisualStyle
  reducedMotion: boolean
  onHud: (hud: HudSample) => void
  onInteract: () => void
}) {
  const objects = useMemo(() => {
    const small = typeof window !== 'undefined' && window.innerWidth < 720
    return makeSceneObjects(small ? 16000 : 30000, small ? 5000 : 9000)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // React Strict Mode may invoke the memo calculator twice in development.
  // Always point the simulation at the instance that is actually rendered.
  loop.current.objects = objects

  // 首屏/海报预跑成形（?ff=70 可加大预跑量，上限 120 模型单位）
  useEffect(() => {
    const s = loop.current
    if (s.scene !== 'free' || s.t > 0) return
    const ff = Number(new URLSearchParams(window.location.search).get('ff') ?? '0')
    prefill(s, Math.min(ff > 0 ? ff : 45, 120))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 风格换装必须留在 R3F 子树里做：Canvas 用自己的 reconciler，
  // 外层 DOM 组件的 effect 先跑，那时 objects 还没创建。
  useEffect(() => {
    applyVisualStyle(objects, style)
    const def = loop.current.def
    recolorTrail(objects.trailA, def, style, 'a')
    recolorTrail(objects.trailB, def, style, 'b')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objects, style])

  useFrame((state, deltaRaw) => {
    const s = loop.current
    const delta = clamp(deltaRaw, 0, 0.05)
    const def = s.def
    const camera = state.camera

    if (s.playing) {
      const units = def.unitsPerSecond * s.speedMult * s.storySpeed * delta
      const steps = clamp(Math.round(units / def.dt), 0, 4000)
      for (let i = 0; i < steps; i += 1) stepOnce(s)
    }

    // 头部彗星与 tether
    toWorld(def, s.a, scratchWorld)
    objects.headA.position.set(scratchWorld.x, scratchWorld.y, scratchWorld.z)
    rebuildRibbon(objects.ribbonA, s.style.headA)
    let sepWorld = 0
    if (s.bActive) {
      toWorld(def, s.b, scratchWorld)
      objects.headB.visible = true
      objects.headB.position.set(scratchWorld.x, scratchWorld.y, scratchWorld.z)
      rebuildRibbon(objects.ribbonB, s.style.headB)
      sepWorld = separation(s.a, s.b) * def.scale
      const tetherAttr = objects.tether.geometry.getAttribute('position') as THREE.BufferAttribute
      toWorld(def, s.a, scratchWorld)
      tetherAttr.setXYZ(0, scratchWorld.x, scratchWorld.y, scratchWorld.z)
      toWorld(def, s.b, scratchWorld)
      tetherAttr.setXYZ(1, scratchWorld.x, scratchWorld.y, scratchWorld.z)
      tetherAttr.needsUpdate = true
      objects.tether.visible = sepWorld > 0.12
      objects.tetherMat.opacity = clamp(sepWorld * 0.22, 0, 0.5)
    } else {
      objects.headB.visible = false
      objects.tether.visible = false
      objects.ribbonB.count = 0
      objects.ribbonB.points.geometry.setDrawRange(0, 0)
    }

    // 丝线风格：把环形历史按时间序展开成连续线
    if (s.style.lines) {
      rebuildSilk(objects.silkA, def, s.style, 'a')
      if (s.bActive) rebuildSilk(objects.silkB, def, s.style, 'b')
    }

    // 相机：故事期走分镜预设，自由期交给 OrbitControls
    if (s.scene !== 'free') {
      const preset = STORY_PRESETS[s.scene]
      if (preset.follow) {
        toWorld(def, s.a, scratchWorld)
      } else {
        scratchWorld.x = 0
        scratchWorld.y = def.targetY
        scratchWorld.z = 0
      }
      const kTarget = 1 - Math.exp(-delta * (preset.follow ? 3.2 : 1.5))
      s.smoothTarget.x += (scratchWorld.x - s.smoothTarget.x) * kTarget
      s.smoothTarget.y += (scratchWorld.y - s.smoothTarget.y) * kTarget
      s.smoothTarget.z += (scratchWorld.z - s.smoothTarget.z) * kTarget
      if (!reducedMotion) s.azimuth += preset.drift * delta
      const dist = preset.dist * s.frameScale
      const sinPhi = Math.sin(preset.phi)
      scratchCamPos.set(
        s.smoothTarget.x + dist * sinPhi * Math.sin(s.azimuth),
        s.smoothTarget.y + dist * Math.cos(preset.phi),
        s.smoothTarget.z + dist * sinPhi * Math.cos(s.azimuth),
      )
      camera.position.lerp(scratchCamPos, 1 - Math.exp(-delta * 1.8))
      camera.lookAt(s.smoothTarget)
    }

    // HUD 节流
    const nowMs = performance.now()
    if (nowMs - s.hudAt > 200) {
      s.hudAt = nowMs
      s.sepSamples.push({ at: nowMs, sep: sepWorld })
      if (s.sepSamples.length > 420) s.sepSamples.splice(0, s.sepSamples.length - 420)
      onHud({ t: s.t, sep: sepWorld, bActive: s.bActive })
    }
  })

  return (
    <>
      <color attach="background" args={[style.background]} />
      <primitive object={objects.root} />
      <OrbitControls
        ref={(instance) => {
          loop.current.controls = instance
        }}
        makeDefault
        enabled={loop.current.scene === 'free'}
        enableDamping
        dampingFactor={0.06}
        enablePan={false}
        minDistance={2.2}
        maxDistance={30}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.55}
        onStart={onInteract}
      />
    </>
  )
}

/* ---------------- 火花线（间距对数仪表） ---------------- */

const SUPERSCRIPTS: Record<string, string> = {
  '-': '⁻',
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
}

function formatSep(sep: number): string {
  if (sep <= 0) return '0'
  if (sep >= 0.01) return sep.toFixed(2)
  const [mantissa, exponent] = sep.toExponential(1).split('e')
  const sup = exponent
    .split('')
    .map((ch) => SUPERSCRIPTS[ch] ?? ch)
    .join('')
  return `${mantissa}×10${sup}`
}

function drawSpark(canvas: HTMLCanvasElement, samples: Array<{ at: number; sep: number }>) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
  }
  const ctx = canvas.getContext('2d')!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)

  const yOf = (sep: number) => {
    const log = clamp(Math.log10(Math.max(sep, 1e-8)), -7, 0.6)
    return h - 3 - ((log + 7) / 7.6) * (h - 8)
  }

  // 十进位网格线：10⁻⁶ … 10⁰
  ctx.font = '600 7px ui-monospace, monospace'
  ctx.textAlign = 'left'
  for (let e = -6; e <= 0; e += 1) {
    const y = yOf(Math.pow(10, e))
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
    if (e % 2 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.34)'
      ctx.fillText(`10${String(e).split('').map((ch) => SUPERSCRIPTS[ch] ?? ch).join('')}`, 2, y - 2)
    }
  }

  const now = performance.now()
  const points = samples.filter((smp) => now - smp.at < SPARK_WINDOW_MS)
  if (points.length > 1) {
    ctx.beginPath()
    for (let i = 0; i < points.length; i += 1) {
      const x = (1 - (now - points[i].at) / SPARK_WINDOW_MS) * w
      const y = yOf(points[i].sep)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.strokeStyle = 'rgba(255,210,122,0.9)'
    ctx.lineWidth = 1.4
    ctx.shadowColor = 'rgba(255,170,80,0.8)'
    ctx.shadowBlur = 5
    ctx.stroke()
    ctx.shadowBlur = 0
    const last = points[points.length - 1]
    ctx.fillStyle = '#7de8ff'
    ctx.beginPath()
    ctx.arc(w - 1, yOf(last.sep), 2, 0, Math.PI * 2)
    ctx.fill()
  }
}

/* ---------------- 主组件 ---------------- */

export function ButterflyEffect({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const reducedMotion = useWorldReducedMotion()
  const { storyMode, enterFree, enterStory } = useStoryFreeMode('butterfly-effect')
  const [scene, setScene] = useState<Scene>(storyMode ? 'seed' : 'free')
  // 当前系统：四个经典，或 ?seed= / ?attractor=（含拧过的参数）深链还原的系统
  const [activeDef, setActiveDef] = useState<AttractorDef>(() => {
    if (typeof window === 'undefined') return ATTRACTORS.lorenz
    return resolveShareDef(new URLSearchParams(window.location.search))
  })
  const [styleId, setStyleId] = useState<VisualStyleId>(() => {
    if (typeof window === 'undefined') return DEFAULT_STYLE
    const raw = new URLSearchParams(window.location.search).get('style')
    return isVisualStyleId(raw) ? raw : DEFAULT_STYLE
  })
  const [playing, setPlaying] = useState(true)
  const [speedMult, setSpeedMult] = useState(1)
  const [searching, setSearching] = useState(false)
  const [copied, setCopied] = useState(false)
  const [paramBlocked, setParamBlocked] = useState(false)
  const [whyOpen, setWhyOpen] = useState(false)
  const [hud, setHud] = useState<HudSample>({ t: 0, sep: 0, bActive: false })

  const blockTimer = useRef(0)
  // 故事期强制余烬：分镜机位、字幕明暗、彗尾双色都按暗底霓虹调
  const effectiveStyle = storyMode ? VISUAL_STYLES.ember : VISUAL_STYLES[styleId]

  const loop = useRef<LoopState | null>(null)
  if (!loop.current) {
    const firstScene = storyMode ? ('seed' as Scene) : ('free' as Scene)
    const frameScale = typeof window !== 'undefined' && window.innerWidth < 720 ? 1.7 : 1
    loop.current = {
      playing: true,
      scene: firstScene,
      def: activeDef,
      style: effectiveStyle,
      speedMult: 1,
      storySpeed: 1,
      a: { ...activeDef.seed },
      b: { x: 0, y: 0, z: 0 },
      bActive: firstScene === 'free',
      t: 0,
      sepSamples: [],
      hudAt: 0,
      frameScale,
      azimuth: 0.6,
      smoothTarget: new THREE.Vector3(0, activeDef.targetY, 0),
      wa: { x: 0, y: 0, z: 0 },
      wb: { x: 0, y: 0, z: 0 },
      objects: null,
      controls: null,
    }
    toWorld(activeDef, loop.current.a, loop.current.wa)
    if (firstScene === 'free') {
      loop.current.b = {
        x: loop.current.a.x + activeDef.twinOffset,
        y: loop.current.a.y,
        z: loop.current.a.z,
      }
      toWorld(activeDef, loop.current.b, loop.current.wb)
    }
  }
  loop.current.playing = playing
  loop.current.scene = scene
  loop.current.speedMult = speedMult
  loop.current.def = activeDef
  loop.current.style = effectiveStyle

  const sparkRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    controls.completeOnboarding()
  }, [controls])

  useEffect(() => {
    const canvas = sparkRef.current
    if (canvas) drawSpark(canvas, loop.current!.sepSamples)
  }, [hud])

  const def = activeDef

  const syncFreeCamera = () => {
    const orbit = loop.current!.controls
    if (orbit) {
      orbit.target.set(0, loop.current!.def.targetY, 0)
      orbit.update()
    }
  }

  const resetFreeCamera = () => {
    const state = loop.current!
    const orbit = state.controls
    if (!orbit) return
    orbit.object.position.set(
      7.6 * state.frameScale,
      5.8 * state.frameScale,
      10.4 * state.frameScale,
    )
    orbit.target.set(0, state.def.targetY, 0)
    orbit.update()
  }

  const applyAttractor = (nextId: (typeof ATTRACTOR_ORDER)[number]) => {
    controls.registerInteraction()
    const next = ATTRACTORS[nextId]
    setActiveDef(next)
    const s = loop.current!
    resetSim(s, next, false)
    prefill(s, 45)
    setHud({ t: s.t, sep: separation(s.a, s.b) * next.scale, bActive: true })
    requestAnimationFrame(resetFreeCamera)
  }

  // 掷骰子：随机 30 系数多项式，Lyapunov 检验通过才端出来（同步搜索约几十到几百毫秒）
  const rollAttractor = () => {
    controls.registerInteraction()
    if (searching) return
    setSearching(true)
    setTimeout(() => {
      let generated: AttractorDef | null = null
      let seed = 0
      for (let tries = 0; tries < 40 && !generated; tries += 1) {
        seed = Math.floor(Math.random() * 10000)
        generated = generateCustomAttractor(seed)
      }
      setSearching(false)
      if (!generated) return
      setActiveDef(generated)
      const s = loop.current!
      resetSim(s, generated, false)
      prefill(s, 45)
      setHud({ t: s.t, sep: separation(s.a, s.b) * generated.scale, bActive: true })
      requestAnimationFrame(syncFreeCamera)
    }, 30)
  }

  // 拧参数：保留当前位置，清空拖尾，让轨迹在新场里长出新形状。
  // 随机系统的系数先快速试跑——会把轨迹甩到无穷的取值直接回弹，
  // 滑杆像撞上一堵橡皮墙，而不是看着光点消失。
  const applyParam = (key: string, value: number) => {
    controls.registerInteraction()
    const current = loop.current!.def
    if (!current.paramDefs || !current.params) return
    const next = withParam(current, key, value)
    if (next.poly && !survives(next, loop.current!.a)) {
      setParamBlocked(true)
      window.clearTimeout(blockTimer.current)
      blockTimer.current = window.setTimeout(() => setParamBlocked(false), 1800)
      return
    }
    setActiveDef(next)
    const s = loop.current!
    s.def = next
    if (s.objects) {
      clearTrail(s.objects.trailA)
      clearTrail(s.objects.trailB)
      clearRibbon(s.objects.ribbonA)
      clearRibbon(s.objects.ribbonB)
      clearSilk(s.objects.silkA)
      clearSilk(s.objects.silkB)
    }
    if (s.bActive) spawnTwin(s)
  }

  // 分享：深链即「导入复原」——随机系统由种子确定性复原，拧过的参数一并编码
  const shareLink = () => {
    controls.registerInteraction()
    const url = new URL(window.location.href.split('?')[0])
    url.search = buildShareQuery(def)
    if (styleId !== DEFAULT_STYLE) url.searchParams.set('style', styleId)
    const text = url.toString()
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => window.prompt(tx('复制链接'), text))
    } else {
      window.prompt(tx('复制链接'), text)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const repair = () => {
    controls.registerInteraction()
    spawnTwin(loop.current!)
  }

  const prepareScene = (next: Exclude<Scene, 'free'>) => {
    const s = loop.current!
    if (next === 'seed') {
      setActiveDef(ATTRACTORS.lorenz)
      resetSim(s, ATTRACTORS.lorenz, false)
      s.storySpeed = 0.7
    } else if (next === 'grow') {
      if (!s.bActive) spawnTwin(s)
      s.storySpeed = 0.75
    } else if (next === 'split') {
      s.storySpeed = 1.5
    } else {
      s.storySpeed = 0.9
    }
    setScene(next)
    setPlaying(true)
  }

  const leaveStory = () => {
    const s = loop.current!
    // Closing the story on its first beat must still reveal a finished attractor.
    // Otherwise the free stage begins as one white dot and needs tens of seconds
    // to grow into the phenomenon promised by the poster.
    if ((s.objects?.trailA.count ?? 0) < 4000 || s.t < 20) {
      resetSim(s, s.def, false)
      prefill(s, 45)
    } else if (!s.bActive) {
      spawnTwin(s)
    }
    s.storySpeed = 1
    setScene('free')
    enterFree()
    requestAnimationFrame(resetFreeCamera)
  }

  const guideSteps: Array<GuideStep> = [
    {
      title: tx('这道光不是画上去的'),
      body: tx('它是一个系统的状态：三个数 x、y、z，每一步都按同一组方程算出下一个位置。光走到哪里，过去的路就留成发光的轨迹。'),
      action: () => prepareScene('seed'),
      durationMs: 7000,
    },
    {
      title: tx('现在，放进它的双胞胎'),
      body: tx('第二个光点遵守完全相同的方程，起点只差 0.000001。此刻它们紧紧抱在一起，亮得像同一颗星——几乎相同的起点，理应走出几乎相同的未来。'),
      action: () => prepareScene('grow'),
      durationMs: 8000,
    },
    {
      title: tx('分道扬镳'),
      body: tx('没有任何随机，它们却飞向蝴蝶不同的翅膀。差别每一步都在被放大：这个系统里，间距大约每过一个时间单位就翻一倍。左下的仪表记录着这场撕裂。'),
      action: () => prepareScene('split'),
      durationMs: 10000,
    },
    {
      title: tx('这只蝴蝶叫洛伦兹吸引子'),
      body: tx('1963 年，气象学家洛伦兹把大气对流简化成三条方程，发现了它：轨迹永远被吸进这片双翼，却从不重复自己的路。规则完全确定，长期未来却不可预测——天气预报的极限由此而来。'),
      action: () => prepareScene('portrait'),
      durationMs: 11000,
    },
    {
      title: tx('轮到你了'),
      body: tx('退出故事后：拖动旋转，点「再并肩飞一次」重看分离；拧参数、换方程、掷骰子，或换种风格——同一只吸引子，可以是余烬、极光、光谱，也可以抽成一根发光的丝线、压成一张蓝图。系数的组合无穷无尽，骰子端出的每一只都经过 Lyapunov 检验，也带着自己的三个敏感旋钮。'),
      action: () => prepareScene('portrait'),
      durationMs: 8000,
    },
  ]

  const readoutVisible = scene === 'split' || scene === 'portrait' || scene === 'free'
  const saturated = hud.bActive && hud.sep > 2

  return (
    <div className={`oss-experience bf-experience${storyMode ? ' is-story' : ' is-free'} is-${scene} is-style-${effectiveStyle.id}`}>
      <div
        className="bf-stage"
        role="img"
        aria-label={tx('蝴蝶效应模拟：两个初始状态几乎相同的光点，在混沌吸引子上逐渐飞向不同的未来')}
      >
        <Canvas
          dpr={[1, 2]}
          frameloop="always"
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          camera={{
            position: [7.6 * loop.current.frameScale, 5.8 * loop.current.frameScale, 10.4 * loop.current.frameScale],
            fov: 42,
            near: 0.05,
            far: 220,
          }}
        >
          <ButterflyScene
            loop={loop as MutableRefObject<LoopState>}
            style={effectiveStyle}
            reducedMotion={reducedMotion}
            onHud={setHud}
            onInteract={() => controls.registerInteraction()}
          />
          <EffectComposer multisampling={0} enableNormalPass={false}>
            <Bloom
              mipmapBlur
              intensity={effectiveStyle.bloom}
              luminanceThreshold={0.16}
              luminanceSmoothing={0.32}
            />
          </EffectComposer>
        </Canvas>
      </div>
      <div className="bf-vignette" aria-hidden="true" />

      {!storyMode && (
        <header className="bf-plaque" data-experience-overlay="true">
          <p>{tx('混沌 · 对初值的敏感依赖')}</p>
          <h1>{tx('蝴蝶效应')}</h1>
          <strong>{tx('两个光点，起点只差 0.000001，未来能差多远？')}</strong>
          <button type="button" className="bf-why-btn" onClick={() => setWhyOpen(true)}>
            <Question weight="bold" /> {tx('看懂它')}
          </button>
        </header>
      )}

      {readoutVisible && (
        <aside className="bf-readout" data-experience-overlay="true" data-freebar-clearance="true" aria-live="polite">          <div className="bf-readout-row">
            <small>{tx('吸引子')}</small>
            <strong>{def.id === 'custom' ? def.name : tx(def.name)}</strong>
          </div>
          <div className="bf-readout-row">
            <small>{tx('模型时间')}</small>
            <strong>{hud.t.toFixed(1)}</strong>
          </div>
          <div className="bf-readout-row">
            <small>{tx('Lyapunov λ')}</small>
            <strong>{tx(`≈ +${def.lyapunov.toFixed(2)}`)}</strong>
          </div>
          <div className="bf-readout-row">
            <small>{tx('双胞胎间距（对数标尺）')}</small>
            <strong className={saturated ? 'is-hot' : ''}>
              {hud.bActive ? tx(formatSep(hud.sep)) : tx('等待出发')}
            </strong>
          </div>
          <canvas ref={sparkRef} className="bf-spark" aria-hidden="true" />
          <div className="bf-readout-note">
            {!hud.bActive && tx('第二个光点还未出发。')}
            {hud.bActive && !saturated && tx('间距每一步都在被放大。')}
            {saturated && tx('两种未来已完全不同。')}
          </div>
        </aside>
      )}

      {!storyMode && (
        <aside
          className="bf-equations"
          data-experience-overlay="true"
          data-freebar-clearance="true"
          aria-label={tx('当前方程')}
        >
          {def.equations.map((eq) => (
            <span key={eq} className="bf-eq-line">{eq}</span>
          ))}
          {def.paramDefs && def.params && (
            <span className="bf-eq-params">
              {def.paramDefs.map((pd) => `${pd.label} = ${def.params![pd.key].toFixed(pd.step < 0.01 ? 3 : 2)}`).join('   ')}
            </span>
          )}
        </aside>
      )}

      {!storyMode && (
        <Freebar
          ariaLabel={tx('自由探索控制')}
          className="bf-freebar"
          mainClassName="bf-freebar-main"
          primaryControlBudget={5}
          secondary={(
            <div className="bf-secondary">
              <div className="bf-secondary-actions">
                <button type="button" className="bf-freebar-pair" onClick={repair}>
                  <Butterfly weight="fill" aria-hidden="true" />
                  <span>{tx('再并肩飞一次')}</span>
                </button>
                <button
                  type="button"
                  className={def.id === 'custom' ? 'bf-freebar-dice is-live' : 'bf-freebar-dice'}
                  onClick={rollAttractor}
                  disabled={searching}
                  aria-label={tx('随机生成一只确认混沌的新吸引子')}
                >
                  <DiceFive weight="fill" aria-hidden="true" />
                  <span>{searching ? tx('寻找混沌中…') : def.id === 'custom' ? tx('再掷一次') : tx('随机吸引子')}</span>
                </button>
                <label className="bf-freebar-field experience-freebar-field">
                  <span>{tx('流速')}</span>
                  <input
                    type="range"
                    min={0.2}
                    max={6}
                    step={0.2}
                    value={speedMult}
                    onChange={(event) => {
                      controls.registerInteraction()
                      setSpeedMult(Number(event.target.value))
                    }}
                    aria-label={tx('流速')}
                  />
                  <b>{tx(`${speedMult.toFixed(1)}×`)}</b>
                </label>
                <button type="button" className="bf-freebar-share" onClick={shareLink} aria-label={tx('复制这只吸引子的分享链接')}>
                  {copied ? <Check weight="bold" aria-hidden="true" /> : <LinkIcon weight="bold" aria-hidden="true" />}
                  <span>{copied ? tx('已复制') : tx('分享')}</span>
                </button>
                <span className="bf-style-group" role="group" aria-label={tx('视觉风格')}>
                  <span className="bf-row-label" aria-hidden="true">{tx('风格')}</span>
                  <span className="bf-freebar-style-chips experience-freebar-seg">
                    {VISUAL_STYLE_ORDER.map((id) => (
                      <button
                        key={id}
                        type="button"
                        className={id === styleId ? 'is-active' : undefined}
                        aria-pressed={id === styleId}
                        onClick={() => {
                          controls.registerInteraction()
                          setStyleId(id)
                        }}
                      >
                        {tx(VISUAL_STYLES[id].name)}
                      </button>
                    ))}
                  </span>
                </span>
                <button
                  type="button"
                  className="bf-freebar-story experience-freebar-story"
                  onClick={() => {
                    controls.registerInteraction()
                    enterStory()
                    prepareScene('seed')
                    replayGuide('butterfly-effect')
                  }}
                  aria-label={tx('重播故事')}
                >
                  <FilmStrip weight="fill" aria-hidden="true" />
                  <span>{tx('故事')}</span>
                </button>
              </div>
              {def.paramDefs && def.params && (
                <div className="bf-freebar-params" role="group" aria-label={tx('方程参数')}>
                  {paramBlocked && <em className="bf-param-warn" role="status">{tx('再往外会飞散，滑杆已回弹')}</em>}
                  {def.paramDefs.map((pd) => (
                    <label key={pd.key} className="bf-freebar-field bf-param-field experience-freebar-field">
                      <span>{pd.label}</span>
                      <input
                        type="range"
                        min={pd.min}
                        max={pd.max}
                        step={pd.step}
                        value={def.params![pd.key]}
                        onChange={(event) => applyParam(pd.key, Number(event.target.value))}
                        aria-label={tx('方程参数') + ` ${pd.label}`}
                      />
                      <b>{def.params![pd.key].toFixed(pd.step < 0.01 ? 3 : 2)}</b>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        >
          <button
            type="button"
            className="bf-freebar-play"
            onClick={() => {
              controls.registerInteraction()
              setPlaying(!playing)
            }}
            aria-label={playing ? tx('暂停') : tx('继续')}
          >
            {playing ? <Pause weight="fill" aria-hidden="true" /> : <Play weight="fill" aria-hidden="true" />}
          </button>
          <div className="bf-freebar-chips experience-freebar-seg" role="group" aria-label={tx('选择吸引子')}>
            {ATTRACTOR_ORDER.map((id) => (
              <button
                key={id}
                type="button"
                className={id === def.id ? 'is-active' : undefined}
                onClick={() => applyAttractor(id)}
              >
                {tx(ATTRACTORS[id].name)}
              </button>
            ))}
          </div>
        </Freebar>
      )}

      {whyOpen && (
        <div className="bf-why" role="dialog" aria-label={tx('蝴蝶效应原理解释')} data-experience-overlay="true">
          <div className="bf-why-card">
            <button type="button" className="bf-why-close" onClick={() => setWhyOpen(false)} aria-label={tx('关闭')}>
              <X weight="bold" />
            </button>
            <h2>{tx('确定的规则，为什么算不准未来？')}</h2>
            <p className="bf-why-eq">
              {def.equations.map((eq) => (
                <span key={eq} className="bf-eq-line">{eq}</span>
              ))}
              <small>{tx(def.paramsNote)}</small>
            </p>
            <p>
              {tx('两个光点从相差 0.000001 出发。在混沌系统里，间距大约按 e 的 λt 次方增长：')}
              <strong>λ ≈ {def.lyapunov.toFixed(2)}</strong>
              {paramsModified(def) ? tx('（当前参数已被你拧动，实际 λ 随之改变）。') : tx('（当前系统）。')}
              {tx('0.000001 的差别，十几个时间单位后就会长成整个翅膀的尺度——这叫「对初值的敏感依赖」，是混沌的定义性特征。')}
            </p>
            <p>
              {tx('1963 年，气象学家洛伦兹正是用这样的玩具方程做天气实验时意外发现：哪怕规则完全确定、没有任何随机，长期精确预报仍然不可能。')}
              {tx('真实的大气也是混沌系统——两周后的天气报不准，不是算力不够，是原理不许。')}
            </p>
            <p>
              {tx('这样的吸引子有无穷多只：方程的每个系数都能连续变化，系数一变，形状和性格就跟着变。数学家 Sprott 曾让程序自动搜索随机多项式系统，一口气找到成千上万个混沌吸引子——这里的骰子用的就是同一类办法：随机生成 30 个系数，用 Lyapunov 指数验证「真的是混沌」才端出来。')}
            </p>
            {def.id === 'custom' && def.paramDefs && (
              <p>
                {tx('底栏这三个滑杆，是 30 个系数里对形状影响最大的三个（标签就是它在方程里的项）。行程已经截到这只吸引子能存活的区间：从一端拧到另一端，看它折叠、拉伸、近乎散开，却始终活着。「分享」会把种子和你拧过的参数一起编码进链接，别人打开就能复原你手里这一只。')}
              </p>
            )}
            <p>
              {tx('边界：这是三维理想化模型，真实大气有无穷多个自由度。吸引子本身是分形（洛伦兹的维数约 2.06），屏幕上的光点是它在三维空间里的投影。')}
            </p>
            <small>{tx('来源与延伸阅读见顶栏 ⓘ。')}</small>
          </div>
        </div>
      )}

      <GuideTour
        worldId="butterfly-effect"
        steps={guideSteps}
        defaultOpen={storyMode}
        placement="stage"
        stagePlan={[
          { position: 'top-left', mobilePosition: 'top-left', motion: 'rise', tone: 'light', treatment: 'monumental', width: 'normal' },
          { position: 'top-right', mobilePosition: 'top-right', motion: 'drift-left', tone: 'light', treatment: 'editorial', width: 'normal' },
          { position: 'bottom-right', mobilePosition: 'bottom-right', motion: 'rise', tone: 'light', treatment: 'annotation', width: 'normal', cue: 'left' },
          { position: 'top-left', mobilePosition: 'top-left', motion: 'fade', tone: 'light', treatment: 'editorial', width: 'normal' },
          { position: 'bottom-center', mobilePosition: 'bottom-center', motion: 'rise', tone: 'light', treatment: 'caption', width: 'normal' },
        ]}
        showReplayChip={false}
        onExit={leaveStory}
      />
      {!storyMode && (
        <GhostHint
          worldId="butterfly-effect"
          gesture={{ type: 'drag', target: '.bf-stage', dx: 130, dy: -40, label: tx('拖动，从另一边看这只蝴蝶') }}
        />
      )}
    </div>
  )
}
