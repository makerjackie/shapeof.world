import './styles/RobotIK.css'

import { useCallback, useEffect, useRef, useState } from 'react'
import { CircleDashed, FilmStrip, Play, Record, Stop, Swap, HourglassLow } from '@phosphor-icons/react'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { GuideTour, replayGuide, type GuideStep } from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import { useExperienceI18n } from '~/i18n/experience'

const WORLD_ID = 'robot-ik'
const SANS = "'Manrope', 'PingFang SC', 'Hiragino Sans GB', system-ui, sans-serif"
const SERIF = "'Cormorant Garamond', Georgia, 'Songti SC', serif"

/**
 * 真实逆运动学，不做假动画：
 * - FABRIK（Aristidou & Lasenby 2011, DOI 10.1016/j.gmod.2011.03.001）：
 *   向后传递把手钉到目标、逐节回摆；向前传递把基座钉回原位、逐节装回。
 *   慢放模式下播放的每一帧都是求解器真实的迭代序列（逐关节关键帧），
 *   角度空间插值保证连杆长度始终精确。
 * - CCD 循环坐标下降（Wang & Chen 1991）：从指尖到基座逐关节转向目标。
 * - 雅可比转置（Buss 2004）：θ ← θ + α·Jᵀ·e，每帧只走固定步数，
 *   所以它的「慢」和绕路是算法自己的性格，不是表演。
 * 关节限位在每次前向传递后钳制（原论文建议的约束扩展）；目标超出工作
 * 空间时手臂伸直指向目标——不可达就是不可达。
 */

const TAU = Math.PI * 2
const UP = Math.PI / 2
const DEG = 180 / Math.PI

/** 工作半径（世界单位 ≈ cm），总杆长恒定，关节数只改变分段 */
const REACH = 120
/** 基座关节相对竖直向上的限位：±100°——落地式机械臂不能穿过地板；
 * 其余关节相对上一节 ±150°（常见工业臂肘/腕限位） */
const BASE_LIMIT = (100 * Math.PI) / 180
const JOINT_LIMIT = (150 * Math.PI) / 180
/** 收敛容差：0.12 个世界单位，约 1 mm 显示尺度 */
const TOL = 0.12
const MAX_FABRIK_ITER = 26
const MAX_CCD_SWEEP = 30
const MAX_JACOBIAN_STEP = 260

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const lerp = (from: number, to: number, t: number) => from + (to - from) * t

const wrapAngle = (angle: number) => {
  let value = angle % TAU
  if (value > Math.PI) value -= TAU
  if (value < -Math.PI) value += TAU
  return value
}

type Vec = { x: number; y: number }
type Solver = 'fabrik' | 'ccd' | 'jacobian'
type Mode = 'follow' | 'fk' | 'multi' | 'showcase' | 'trace'
type Phase = 'back' | 'forward' | 'clamp' | 'stretch' | 'sweep' | 'step'
type Key = { a: Array<number>; phase: Phase }

type SolveResult = {
  angles: Array<number>
  track: Array<Key>
  iterations: number
  reached: boolean
  locked: Array<boolean>
}

/* ── 运动学 ───────────────────────────────────────────────────── */

function makeLengths(n: number): Array<number> {
  const weights: Array<number> = []
  let sum = 0
  for (let i = 0; i < n; i += 1) {
    const w = Math.pow(0.9, i)
    weights.push(w)
    sum += w
  }
  return weights.map((w) => (w / sum) * REACH)
}

function forwardKinematics(base: Vec, angles: Array<number>, lengths: Array<number>): Array<Vec> {
  const points: Array<Vec> = [{ x: base.x, y: base.y }]
  for (let i = 0; i < lengths.length; i += 1) {
    const prev = points[i]
    points.push({
      x: prev.x + Math.cos(angles[i]) * lengths[i],
      y: prev.y + Math.sin(angles[i]) * lengths[i],
    })
  }
  return points
}

function pointsToAngles(points: Array<Vec>): Array<number> {
  const angles: Array<number> = []
  for (let i = 0; i < points.length - 1; i += 1) {
    angles.push(Math.atan2(points[i + 1].y - points[i].y, points[i + 1].x - points[i].x))
  }
  return angles
}

/** 把绝对角度按限位钳制；返回钳制后的角度与每个关节是否触限 */
function clampRelatives(angles: Array<number>): { angles: Array<number>; locked: Array<boolean> } {
  const out = angles.slice()
  const locked = new Array<boolean>(angles.length).fill(false)
  for (let i = 0; i < out.length; i += 1) {
    const prev = i === 0 ? UP : out[i - 1]
    const limit = i === 0 ? BASE_LIMIT : JOINT_LIMIT
    const rel = wrapAngle(out[i] - prev)
    const clamped = clamp(rel, -limit, limit)
    if (Math.abs(clamped - rel) > 1e-9) locked[i] = true
    out[i] = wrapAngle(prev + clamped)
  }
  return { angles: out, locked }
}

function relativeAngles(angles: Array<number>): Array<number> {
  const relatives: Array<number> = []
  for (let i = 0; i < angles.length; i += 1) {
    relatives.push(wrapAngle(angles[i] - (i === 0 ? UP : angles[i - 1])))
  }
  return relatives
}

/** 目标不可达：手臂伸直指向目标，基座关节触限为止——这是诚实反馈 */
function stretchAngles(dirAngle: number, n: number): { angles: Array<number>; locked: Array<boolean> } {
  const rel0 = clamp(wrapAngle(dirAngle - UP), -BASE_LIMIT, BASE_LIMIT)
  const a0 = wrapAngle(UP + rel0)
  const angles = new Array<number>(n).fill(a0)
  const locked = new Array<boolean>(n).fill(false)
  if (Math.abs(rel0) >= BASE_LIMIT - 1e-9) locked[0] = true
  return { angles, locked }
}

const unit = (from: Vec, to: Vec): Vec => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy)
  if (length < 1e-9) return { x: 1, y: 0 }
  return { x: dx / length, y: dy / length }
}

/* ── FABRIK ───────────────────────────────────────────────────── */

function solveFabrik(
  seed: Array<number>,
  lengths: Array<number>,
  base: Vec,
  target: Vec,
  recordTrack: boolean,
): SolveResult {
  const n = lengths.length
  const total = lengths.reduce((sum, length) => sum + length, 0)
  const distance = Math.hypot(target.x - base.x, target.y - base.y)

  if (distance > total - 1e-9) {
    const { angles, locked } = stretchAngles(Math.atan2(target.y - base.y, target.x - base.x), n)
    return {
      angles,
      track: [{ a: angles.slice(), phase: 'stretch' }],
      iterations: 0,
      reached: false,
      locked,
    }
  }

  let points = forwardKinematics(base, seed, lengths)
  const track: Array<Key> = []
  let iterations = 0
  let reached = false
  let locked = new Array<boolean>(n).fill(false)

  for (let k = 0; k < MAX_FABRIK_ITER; k += 1) {
    iterations = k + 1
    // 向后传递：手钉到目标，从指尖逐节回摆到基座
    points[n] = { x: target.x, y: target.y }
    if (recordTrack) track.push({ a: pointsToAngles(points), phase: 'back' })
    for (let i = n - 1; i >= 0; i -= 1) {
      const dir = unit(points[i + 1], points[i])
      points[i] = { x: points[i + 1].x + dir.x * lengths[i], y: points[i + 1].y + dir.y * lengths[i] }
      if (recordTrack) track.push({ a: pointsToAngles(points), phase: 'back' })
    }
    // 向前传递：基座钉回原位，逐节装回去
    points[0] = { x: base.x, y: base.y }
    for (let i = 0; i < n; i += 1) {
      const dir = unit(points[i], points[i + 1])
      points[i + 1] = { x: points[i].x + dir.x * lengths[i], y: points[i].y + dir.y * lengths[i] }
      if (recordTrack) track.push({ a: pointsToAngles(points), phase: 'forward' })
    }
    // 关节限位：钳制相对角后重新排出各节位置（原论文的约束扩展）
    const clamped = clampRelatives(pointsToAngles(points))
    points = forwardKinematics(base, clamped.angles, lengths)
    locked = clamped.locked
    if (recordTrack) track.push({ a: clamped.angles.slice(), phase: 'clamp' })
    const err = Math.hypot(points[n].x - target.x, points[n].y - target.y)
    if (err < TOL) {
      reached = true
      break
    }
  }

  return { angles: pointsToAngles(points), track, iterations, reached, locked }
}

/* ── CCD 循环坐标下降 ─────────────────────────────────────────── */

function ccdSweep(
  angles: Array<number>,
  lengths: Array<number>,
  base: Vec,
  target: Vec,
  track: Array<Key> | null,
): { err: number; locked: Array<boolean> } {
  const n = lengths.length
  let locked = new Array<boolean>(n).fill(false)
  for (let i = n - 1; i >= 0; i -= 1) {
    const points = forwardKinematics(base, angles, lengths)
    const joint = points[i]
    const tip = points[n]
    const v1x = tip.x - joint.x
    const v1y = tip.y - joint.y
    const v2x = target.x - joint.x
    const v2y = target.y - joint.y
    if (Math.hypot(v1x, v1y) < 1e-9 || Math.hypot(v2x, v2y) < 1e-9) continue
    const delta = Math.atan2(v1x * v2y - v1y * v2x, v1x * v2x + v1y * v2y)
    angles[i] = wrapAngle(angles[i] + delta)
    const prev = i === 0 ? UP : angles[i - 1]
    const limit = i === 0 ? BASE_LIMIT : JOINT_LIMIT
    const rel = wrapAngle(angles[i] - prev)
    const clamped = clamp(rel, -limit, limit)
    if (Math.abs(clamped - rel) > 1e-9) locked[i] = true
    angles[i] = wrapAngle(prev + clamped)
    if (track) track.push({ a: angles.slice(), phase: 'sweep' })
  }
  const tip = forwardKinematics(base, angles, lengths)[n]
  return { err: Math.hypot(tip.x - target.x, tip.y - target.y), locked }
}

function solveCcdTracked(
  seed: Array<number>,
  lengths: Array<number>,
  base: Vec,
  target: Vec,
): SolveResult {
  const total = lengths.reduce((sum, length) => sum + length, 0)
  if (Math.hypot(target.x - base.x, target.y - base.y) > total - 1e-9) {
    const { angles, locked } = stretchAngles(Math.atan2(target.y - base.y, target.x - base.x), lengths.length)
    return { angles, track: [{ a: angles.slice(), phase: 'stretch' }], iterations: 0, reached: false, locked }
  }
  const angles = seed.slice()
  const track: Array<Key> = []
  let iterations = 0
  let reached = false
  let locked = new Array<boolean>(lengths.length).fill(false)
  for (let k = 0; k < MAX_CCD_SWEEP; k += 1) {
    iterations = k + 1
    const result = ccdSweep(angles, lengths, base, target, track)
    locked = result.locked
    if (result.err < TOL) {
      reached = true
      break
    }
  }
  return { angles, track, iterations, reached, locked }
}

/* ── 雅可比转置 ───────────────────────────────────────────────── */

function jacobianStep(
  angles: Array<number>,
  lengths: Array<number>,
  base: Vec,
  target: Vec,
): { err: number; locked: Array<boolean> } {
  const n = lengths.length
  const points = forwardKinematics(base, angles, lengths)
  const tip = points[n]
  const ex = target.x - tip.x
  const ey = target.y - tip.y
  const err = Math.hypot(ex, ey)
  if (err < 1e-9) return { err, locked: new Array<boolean>(n).fill(false) }
  let denom = 0
  const gradients: Array<number> = []
  for (let i = 0; i < n; i += 1) {
    // J_i = 关节 i 到末端的向量旋转 90°；dθ_i = α·J_i·e
    const jx = -(tip.y - points[i].y)
    const jy = tip.x - points[i].x
    gradients.push(jx * ex + jy * ey)
    denom += jx * jx + jy * jy
  }
  const alpha = Math.min(2.4e-4, 0.55 / Math.max(denom, 1e-6))
  for (let i = 0; i < n; i += 1) angles[i] = wrapAngle(angles[i] + alpha * gradients[i])
  const clamped = clampRelatives(angles)
  for (let i = 0; i < n; i += 1) angles[i] = clamped.angles[i]
  return { err, locked: clamped.locked }
}

function solveJacobianTracked(
  seed: Array<number>,
  lengths: Array<number>,
  base: Vec,
  target: Vec,
): SolveResult {
  const total = lengths.reduce((sum, length) => sum + length, 0)
  if (Math.hypot(target.x - base.x, target.y - base.y) > total - 1e-9) {
    const { angles, locked } = stretchAngles(Math.atan2(target.y - base.y, target.x - base.x), lengths.length)
    return { angles, track: [{ a: angles.slice(), phase: 'stretch' }], iterations: 0, reached: false, locked }
  }
  const angles = seed.slice()
  const track: Array<Key> = []
  let iterations = 0
  let reached = false
  let locked = new Array<boolean>(lengths.length).fill(false)
  for (let k = 0; k < MAX_JACOBIAN_STEP; k += 1) {
    iterations = k + 1
    const result = jacobianStep(angles, lengths, base, target)
    locked = result.locked
    if (k % 2 === 0) track.push({ a: angles.slice(), phase: 'step' })
    if (result.err < 0.35) {
      reached = true
      break
    }
  }
  return { angles, track, iterations, reached, locked }
}

/* ── 解的分支 ─────────────────────────────────────────────────── */

/** 镜像所有相对角：同一个手位的另一支解（肘上 ⇄ 肘下） */
function mirrorAngles(angles: Array<number>): Array<number> {
  const out = angles.slice()
  let prev = UP
  for (let i = 0; i < out.length; i += 1) {
    const rel = wrapAngle(out[i] - prev)
    out[i] = wrapAngle(prev - rel)
    prev = out[i]
  }
  return out
}

/** 给定肘部偏置 b∈[-1,1] 构造一个种子姿势；FABRIK 会收敛到附近的解 */
function elbowBiasSeed(b: number, lengths: Array<number>, base: Vec, target: Vec): Array<number> {
  const n = lengths.length
  const dir = Math.atan2(target.y - base.y, target.x - base.x)
  const angles: Array<number> = []
  angles.push(wrapAngle(dir - b * 0.85))
  if (n > 1) angles.push(wrapAngle(angles[0] + b * 1.9))
  const points = forwardKinematics(base, angles, lengths.slice(0, angles.length))
  let cursor = points[points.length - 1]
  for (let i = angles.length; i < n; i += 1) {
    const toward = Math.atan2(target.y - cursor.y, target.x - cursor.x)
    angles.push(toward)
    cursor = { x: cursor.x + Math.cos(toward) * lengths[i], y: cursor.y + Math.sin(toward) * lengths[i] }
  }
  return angles
}

/** 默认姿势：一条好看的 S 曲线 */
function defaultPose(n: number): Array<number> {
  const relatives = [0.52, -1.02, 0.82, -0.46, 0.3, -0.18, 0.12]
  const angles: Array<number> = []
  let prev = UP
  for (let i = 0; i < n; i += 1) {
    const rel = relatives[i % relatives.length] * (i < relatives.length ? 1 : 0.6)
    angles.push(wrapAngle(prev + rel))
    prev = angles[i]
  }
  return angles
}

/* ── 轨迹 ─────────────────────────────────────────────────────── */

function samplePolyline(points: Array<Vec>, spacing: number): Array<Vec> {
  const out: Array<Vec> = []
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i]
    const b = points[i + 1]
    const length = Math.hypot(b.x - a.x, b.y - a.y)
    const steps = Math.max(1, Math.round(length / spacing))
    for (let s = 0; s < steps; s += 1) {
      out.push({ x: lerp(a.x, b.x, s / steps), y: lerp(a.y, b.y, s / steps) })
    }
  }
  out.push(points[points.length - 1])
  return out
}

function circlePath(): Array<Vec> {
  const center = { x: 0, y: 56 }
  const points: Array<Vec> = []
  for (let i = 0; i <= 160; i += 1) {
    const t = (i / 160) * TAU
    points.push({ x: center.x + Math.cos(t) * 33, y: center.y + Math.sin(t) * 33 })
  }
  return points
}

function starPath(): Array<Vec> {
  const center = { x: 0, y: 58 }
  const vertices: Array<Vec> = []
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? 34 : 14.5
    const t = Math.PI / 2 + (i / 10) * TAU
    vertices.push({ x: center.x + Math.cos(t) * r, y: center.y + Math.sin(t) * r })
  }
  vertices.push(vertices[0])
  return samplePolyline(vertices, 1.4)
}

/** 「IK」两个字母的刻写轨迹：绘图仪式的一笔连写 */
function lettersPath(): Array<Vec> {
  const strokes: Array<Vec> = [
    // I
    { x: -33, y: 74 }, { x: -9, y: 74 },
    { x: -21, y: 74 }, { x: -21, y: 40 },
    { x: -33, y: 40 }, { x: -9, y: 40 },
    // 连笔到 K
    { x: 9, y: 40 },
    // K
    { x: 9, y: 74 },
    { x: 11, y: 55 },
    { x: 33, y: 74 },
    { x: 11, y: 55 },
    { x: 33, y: 40 },
  ]
  return samplePolyline(strokes, 1.2)
}

function pathLength(path: Array<Vec>): number {
  let total = 0
  for (let i = 0; i < path.length - 1; i += 1) total += Math.hypot(path[i + 1].x - path[i].x, path[i + 1].y - path[i].y)
  return total
}

function pointAtLength(path: Array<Vec>, distance: number): Vec {
  let remaining = distance
  for (let i = 0; i < path.length - 1; i += 1) {
    const segment = Math.hypot(path[i + 1].x - path[i].x, path[i + 1].y - path[i].y)
    if (remaining <= segment) {
      const t = segment < 1e-9 ? 0 : remaining / segment
      return { x: lerp(path[i].x, path[i + 1].x, t), y: lerp(path[i].y, path[i + 1].y, t) }
    }
    remaining -= segment
  }
  return path[path.length - 1]
}

/* ── 调色 ─────────────────────────────────────────────────────── */

const INK_SOFT = 'rgba(228, 235, 244, 0.52)'
const INK_FAINT = 'rgba(228, 235, 244, 0.26)'
const AMBER = '#f2b267'
const AMBER_SOFT = 'rgba(242, 178, 103, 0.55)'
const WARN = '#ff7a59'
const GHOST_BLUE = 'rgba(150, 178, 208, 0.85)'

/* ── 场景 ─────────────────────────────────────────────────────── */

type Scene = {
  n: number
  lengths: Array<number>
  angles: Array<number>
  base: Vec
  target: Vec
  prevTarget: Vec
  solver: Solver
  mode: Mode
  slowmo: boolean
  track: Array<Key> | null
  cursor: number
  trackRate: number
  phase: Phase | null
  pending: { reached: boolean; locked: Array<boolean>; iterations: number } | null
  approachIters: number
  converged: boolean
  reached: boolean
  locked: Array<boolean>
  tipErr: number
  elbow: 1 | -1
  showWorkspace: boolean
  recording: boolean
  path: Array<Vec>
  playing: boolean
  playDist: number
  playLoop: boolean
  dragging: boolean
  idle: boolean
  trail: Array<{ x: number; y: number; age: number }>
  bloom: number
  grip: number
  time: number
  calm: boolean
  hopTimer: number
  hopIndex: number
  waitTimer: number
  showIndex: number
  fkBase: Array<number>
  lastBuild: number
}

type Layout = {
  width: number
  height: number
  narrow: boolean
  scale: number
  baseX: number
  baseY: number
  stageTop: number
  stageBottom: number
}

type Backdrop = { key: string; canvas: HTMLCanvasElement }

function buildBackdrop(width: number, height: number, key: string): Backdrop {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(64, width)
  canvas.height = Math.max(64, height)
  const ctx = canvas.getContext('2d')!
  const w = canvas.width
  const h = canvas.height
  const base = ctx.createLinearGradient(0, 0, w * 0.35, h)
  base.addColorStop(0, '#0a0d13')
  base.addColorStop(1, '#04050a')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, w, h)

  // 工程图纸细网格
  ctx.strokeStyle = 'rgba(150, 180, 214, 0.045)'
  ctx.lineWidth = 1
  const step = 38
  ctx.beginPath()
  for (let x = step; x < w; x += step) {
    ctx.moveTo(x, 0)
    ctx.lineTo(x, h)
  }
  for (let y = step; y < h; y += step) {
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
  }
  ctx.stroke()

  // 舞台聚光：打在机械臂将要出现的中区
  const glow = ctx.createRadialGradient(w * 0.5, h * 0.44, 0, w * 0.5, h * 0.44, Math.max(w, h) * 0.58)
  glow.addColorStop(0, 'rgba(96, 116, 142, 0.22)')
  glow.addColorStop(0.55, 'rgba(60, 76, 98, 0.08)')
  glow.addColorStop(1, 'rgba(4, 5, 10, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, w, h)
  return { key, canvas }
}

/* ── 组件 ─────────────────────────────────────────────────────── */

type Hud = {
  x: number
  y: number
  iters: number
  status: 'ok' | 'chasing' | 'far' | 'limit'
  relatives: Array<number>
  locked: Array<boolean>
}

export function RobotIK({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const { storyMode, enterFree, enterStory } = useStoryFreeMode(WORLD_ID)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const backdropRef = useRef<Backdrop | null>(null)
  const layoutRef = useRef<Layout | null>(null)
  const errorLogged = useRef(false)

  const [joints, setJoints] = useState(5)
  const [solver, setSolver] = useState<Solver>('fabrik')
  const [slowmo, setSlowmo] = useState(false)
  const [elbow, setElbow] = useState<1 | -1>(1)
  const [showWorkspace, setShowWorkspace] = useState(false)
  const [recording, setRecording] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [hasPath, setHasPath] = useState(false)
  const [hud, setHud] = useState<Hud>({ x: 0, y: 0, iters: 0, status: 'chasing', relatives: [], locked: [] })

  const initialLengths = makeLengths(5)
  const initialAngles = defaultPose(5)
  const st = useRef<Scene>({
    n: 5,
    lengths: initialLengths,
    angles: initialAngles,
    base: { x: 0, y: 0 },
    target: forwardKinematics({ x: 0, y: 0 }, initialAngles, initialLengths)[5],
    prevTarget: { x: 0, y: 0 },
    solver: 'fabrik',
    mode: 'follow',
    slowmo: false,
    track: null,
    cursor: 0,
    trackRate: 10.5,
    phase: null,
    pending: null,
    approachIters: 0,
    converged: false,
    reached: true,
    locked: new Array<boolean>(5).fill(false),
    tipErr: 0,
    elbow: 1,
    showWorkspace: false,
    recording: false,
    path: [],
    playing: false,
    playDist: 0,
    playLoop: false,
    dragging: false,
    idle: true,
    trail: [],
    bloom: 0,
    grip: 0,
    time: 0,
    calm: false,
    hopTimer: 0.8,
    hopIndex: 0,
    waitTimer: 0.6,
    showIndex: 0,
    fkBase: initialAngles.slice(),
    lastBuild: 0,
  })
  st.current.solver = solver
  st.current.slowmo = slowmo
  st.current.elbow = elbow
  st.current.showWorkspace = showWorkspace
  st.current.recording = recording
  const storyRef = useRef(storyMode)
  storyRef.current = storyMode
  const controlsRef = useRef(controls)
  controlsRef.current = controls
  const txRef = useRef(tx)
  txRef.current = tx

  const clampTarget = useCallback((p: Vec): Vec => {
    let { x, y } = p
    if (y < -14) y = -14
    const r = Math.hypot(x, y)
    const max = REACH * 1.06
    if (r > max) {
      x *= max / r
      y *= max / r
    }
    return { x, y }
  }, [])

  /** 生成一条完整求解轨道并从头慢放（FABRIK / CCD / 雅可比共用） */
  const buildTrack = useCallback((target: Vec, rate?: number) => {
    const s = st.current
    const seed = s.angles.slice()
    const result = s.solver === 'fabrik'
      ? solveFabrik(seed, s.lengths, s.base, target, true)
      : s.solver === 'ccd'
        ? solveCcdTracked(seed, s.lengths, s.base, target)
        : solveJacobianTracked(seed, s.lengths, s.base, target)
    if (result.track.length === 0) return
    s.track = [{ a: seed, phase: result.track[0].phase }, ...result.track]
    s.cursor = 0
    s.trackRate = rate ?? (s.solver === 'jacobian' ? 34 : 10.5)
    s.pending = { reached: result.reached, locked: result.locked, iterations: result.iterations }
    s.approachIters = 0
    s.converged = false
    s.lastBuild = s.time
  }, [])

  const toWorld = useCallback((clientX: number, clientY: number): Vec | null => {
    const canvas = canvasRef.current
    const layout = layoutRef.current
    if (!canvas || !layout) return null
    const rect = canvas.getBoundingClientRect()
    const wx = (clientX - rect.left - layout.baseX) / layout.scale
    const wy = (layout.baseY - (clientY - rect.top)) / layout.scale
    return clampTarget({ x: wx, y: wy })
  }, [clampTarget])

  /* ---- 指针与键盘 --------------------------------------------- */
  const draggingRef = useRef(false)

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (storyRef.current) return
    const world = toWorld(event.clientX, event.clientY)
    if (!world) return
    event.currentTarget.setPointerCapture(event.pointerId)
    draggingRef.current = true
    st.current.dragging = true
    st.current.idle = false
    controls.registerInteraction()
    if (st.current.mode !== 'follow') st.current.mode = 'follow'
    if (st.current.playing) {
      st.current.playing = false
      setPlaying(false)
    }
    st.current.target = world
    if (st.current.slowmo) buildTrack(world)
  }

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggingRef.current || storyRef.current) return
    const world = toWorld(event.clientX, event.clientY)
    if (!world) return
    const s = st.current
    s.target = world
    if (s.recording) {
      const last = s.path[s.path.length - 1]
      if (!last || Math.hypot(world.x - last.x, world.y - last.y) > 2.2) {
        if (s.path.length < 1400) {
          s.path.push(world)
          setHasPath(true)
        }
      }
    }
    if (s.slowmo && !s.track && s.time - s.lastBuild > 0.38) buildTrack(world)
  }

  const endDrag = () => {
    draggingRef.current = false
    st.current.dragging = false
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (storyRef.current) return
    const step = event.shiftKey ? 1.5 : 5
    const delta: Record<string, Vec> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: step },
      ArrowDown: { x: 0, y: -step },
    }
    const d = delta[event.key]
    if (!d) return
    event.preventDefault()
    st.current.idle = false
    controls.registerInteraction()
    st.current.target = clampTarget({ x: st.current.target.x + d.x, y: st.current.target.y + d.y })
  }

  /* ---- 底栏操作 ----------------------------------------------- */

  const resetArm = (n: number) => {
    const s = st.current
    s.n = n
    s.lengths = makeLengths(n)
    s.angles = defaultPose(n)
    s.locked = new Array<boolean>(n).fill(false)
    s.track = null
    s.target = clampTarget(forwardKinematics(s.base, s.angles, s.lengths)[n])
    s.approachIters = 0
    s.converged = false
  }

  const flipElbow = () => {
    controls.registerInteraction()
    const s = st.current
    const next = s.elbow === 1 ? -1 : 1
    setElbow(next as 1 | -1)
    s.elbow = next as 1 | -1
    // 用镜像种子重新求解：FABRIK 停在种子附近 → 另一支解，轨道快放
    const seed = mirrorAngles(s.angles)
    const result = solveFabrik(seed, s.lengths, s.base, s.target, true)
    if (result.track.length > 0) {
      s.track = [{ a: s.angles.slice(), phase: result.track[0].phase }, ...result.track]
      s.cursor = 0
      s.trackRate = s.slowmo ? 10.5 : 30
      s.pending = { reached: result.reached, locked: result.locked, iterations: result.iterations }
    }
  }

  const toggleRecord = () => {
    controls.registerInteraction()
    const s = st.current
    if (s.recording) {
      setRecording(false)
      return
    }
    s.path = []
    setHasPath(false)
    if (s.playing) {
      s.playing = false
      setPlaying(false)
    }
    setRecording(true)
  }

  const togglePlay = () => {
    controls.registerInteraction()
    const s = st.current
    if (s.playing) {
      s.playing = false
      setPlaying(false)
      return
    }
    if (s.path.length < 2) return
    if (s.recording) setRecording(false)
    s.playLoop = false
    s.playDist = 0
    s.playing = true
    s.idle = false
    setPlaying(true)
  }

  const loadPreset = (preset: 'circle' | 'star' | 'letters') => {
    controls.registerInteraction()
    const s = st.current
    s.path = preset === 'circle' ? circlePath() : preset === 'star' ? starPath() : lettersPath()
    setHasPath(true)
    if (s.recording) setRecording(false)
    s.playLoop = false
    s.playDist = 0
    s.playing = true
    s.idle = false
    setPlaying(true)
  }

  /* ---- 渲染循环 ------------------------------------------------ */

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const calmQuery = { matches: false, addEventListener() {}, removeEventListener() {} }
    const syncCalm = () => {
      st.current.calm = calmQuery.matches
    }
    syncCalm()
    calmQuery.addEventListener('change', syncCalm)

    let frameId = 0
    let previous = performance.now()
    let measuredAt = -1000
    let measuredInset = 210
    let lastUi = 0

    const showcaseTargets: Array<Vec> = [
      { x: -56, y: 88 },
      { x: 58, y: 62 },
      { x: 92, y: 96 },
    ]
    const hopTargets: Array<Vec> = [
      { x: 56, y: 72 },
      { x: -48, y: 84 },
      { x: 24, y: 36 },
    ]

    const frame = (now: number) => {
      try {
        const s = st.current
        const dt = Math.min(0.05, Math.max(0, (now - previous) / 1000))
        previous = now
        s.time += dt

        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const width = canvas.clientWidth
        const height = canvas.clientHeight
        if (width < 2 || height < 2) {
          frameId = window.requestAnimationFrame(frame)
          return
        }
        if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
          canvas.width = Math.round(width * dpr)
          canvas.height = Math.round(height * dpr)
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

        // 实测底区高度：底栏 / 读数 / 故事轨不会让位时主体自动收缩
        if (now - measuredAt > 200) {
          measuredAt = now
          const bottom = canvas.getBoundingClientRect().bottom
          const selectors = storyRef.current
            ? ['.guide-card']
            : width < 720
              ? ['.rik-freebar', '.rik-readout']
              : ['.rik-freebar']
          let highest = bottom
          let mounted = false
          for (const selector of selectors) {
            const element = document.querySelector(selector)
            if (!(element instanceof HTMLElement)) continue
            mounted = true
            const box = element.getBoundingClientRect()
            const visible = box.height > 0 && Number(window.getComputedStyle(element).opacity) > 0.05
            if (visible) highest = Math.min(highest, box.top)
          }
          measuredInset = mounted && highest < bottom ? bottom - highest + 14 : 46
        }

        const narrow = width < 720
        const safeTop = storyRef.current ? (narrow ? 60 : 78) : (narrow ? 66 : 84)
        const stageTop = safeTop + 8
        const stageBottom = height - measuredInset
        const stageH = Math.max(220, stageBottom - stageTop)
        // 落地式构图：地板钉在舞台下沿，手臂立在地上；上方留白是「舞台天空」，
        // 不像悬空的工作空间那样在地板下留出解释不通的黑洞
        const widthScale = width / (REACH * 1.9)
        const scale = Math.min(widthScale, (stageH - 14) / (REACH + 24))
        const floorY = stageBottom - 20
        const layout: Layout = {
          width,
          height,
          narrow,
          scale,
          baseX: width / 2,
          baseY: floorY - 18 * scale,
          stageTop,
          stageBottom,
        }
        layoutRef.current = layout
        const toScreen = (p: Vec): Vec => ({ x: layout.baseX + p.x * scale, y: layout.baseY - p.y * scale })

        /* ── 行为状态机 ─────────────────────────────────────── */
        const interacted = controlsRef.current.interacted || !s.idle
        if (s.mode === 'follow' || s.mode === 'trace') {
          if (s.playing && s.path.length > 1) {
            // 轨迹回放：目标点以恒定速度沿路径前进，手臂实时跟踪
            s.playDist += 26 * dt
            const total = pathLength(s.path)
            if (s.playDist >= total) {
              if (s.playLoop) {
                s.playDist = 0
              } else {
                s.playDist = total
                s.playing = false
                setPlaying(false)
              }
            }
            s.target = clampTarget(pointAtLength(s.path, s.playDist))
          } else if (!interacted && !storyRef.current && !s.calm) {
            // 未被碰过：目标缓缓漂移，第一眼就是活的
            const t = s.time
            s.target = clampTarget({ x: 46 * Math.sin(t * 0.45), y: 58 + 30 * Math.sin(t * 0.31 + 1.2) })
          }
        } else if (s.mode === 'fk') {
          // 正运动学演示：只有基座关节在转，其余关节保持相对角
          const swing = s.calm ? 0.4 : Math.sin(s.time * 0.85) * 1.02
          const relatives = relativeAngles(s.fkBase)
          s.angles[0] = wrapAngle(UP + swing)
          for (let i = 1; i < s.n; i += 1) s.angles[i] = wrapAngle(s.angles[i - 1] + relatives[i])
          s.target = forwardKinematics(s.base, s.angles, s.lengths)[s.n]
        } else if (s.mode === 'multi') {
          // 同一手位：肘部偏置缓慢扫过解空间，手臂在无数真实解之间游动
          const b = s.calm ? 0.6 : Math.sin(s.time * 0.5) * 0.92
          const seed = elbowBiasSeed(b, s.lengths, s.base, s.target)
          s.angles = solveFabrik(seed, s.lengths, s.base, s.target, false).angles
        } else if (s.mode === 'showcase') {
          // FABRIK 慢放演示：在几个目标之间循环，每次放一条完整迭代轨道
          if (!s.track) {
            s.waitTimer -= dt
            if (s.waitTimer <= 0) {
              const target = showcaseTargets[s.showIndex % showcaseTargets.length]
              s.showIndex += 1
              s.target = target
              buildTrack(target)
              s.waitTimer = 1.35
            }
          }
        }

        /* ── 求解与播放 ─────────────────────────────────────── */
        const total = s.lengths.reduce((sum, length) => sum + length, 0)
        const targetDist = Math.hypot(s.target.x - s.base.x, s.target.y - s.base.y)
        const unreachable = targetDist > total - 1e-9
        const targetMoved = Math.hypot(s.target.x - s.prevTarget.x, s.target.y - s.prevTarget.y) > 0.35
        if (targetMoved && !s.track) {
          s.approachIters = 0
          s.converged = false
        }
        s.prevTarget = { x: s.target.x, y: s.target.y }

        if (s.track) {
          // 迭代轨道慢放：相邻关键帧在角度空间插值，杆长始终精确
          if (s.calm) {
            s.angles = s.track[s.track.length - 1].a.slice()
            s.track = null
            s.phase = null
          } else {
            s.cursor += s.trackRate * dt
            if (s.cursor >= s.track.length - 1) {
              s.angles = s.track[s.track.length - 1].a.slice()
              if (s.pending) {
                s.reached = s.pending.reached
                s.locked = s.pending.locked
                s.approachIters = s.pending.iterations
                s.pending = null
              }
              s.converged = s.reached
              if (s.reached) s.bloom = 1
              s.track = null
              s.phase = null
            } else {
              const i = Math.floor(s.cursor)
              const f = s.cursor - i
              const ease = f * f * (3 - 2 * f)
              const a = s.track[i].a
              const b = s.track[i + 1].a
              for (let j = 0; j < s.n; j += 1) s.angles[j] = wrapAngle(a[j] + wrapAngle(b[j] - a[j]) * ease)
              s.phase = s.track[i].phase
            }
          }
        } else if (s.mode !== 'fk' && s.mode !== 'multi') {
          if (unreachable) {
            const { angles: goal, locked } = stretchAngles(Math.atan2(s.target.y - s.base.y, s.target.x - s.base.x), s.n)
            const k = 1 - Math.exp(-dt / 0.09)
            for (let i = 0; i < s.n; i += 1) s.angles[i] = wrapAngle(s.angles[i] + wrapAngle(goal[i] - s.angles[i]) * k)
            s.locked = locked
            s.reached = false
            s.converged = false
          } else if (s.solver === 'fabrik') {
            const result = solveFabrik(s.angles, s.lengths, s.base, s.target, false)
            const k = 1 - Math.exp(-dt / 0.065)
            for (let i = 0; i < s.n; i += 1) s.angles[i] = wrapAngle(s.angles[i] + wrapAngle(result.angles[i] - s.angles[i]) * k)
            // FABRIK 每帧整体重解：读数显示最新这次求解用了几轮迭代
            s.approachIters = result.iterations
            s.reached = result.reached
            s.locked = result.locked
          } else if (s.solver === 'ccd') {
            let err = Number.POSITIVE_INFINITY
            for (let sweep = 0; sweep < 2; sweep += 1) {
              const result = ccdSweep(s.angles, s.lengths, s.base, s.target, null)
              err = result.err
              s.locked = result.locked
            }
            if (!s.converged) s.approachIters += 2
            s.reached = err < 0.18
            s.converged = s.reached
          } else {
            let err = Number.POSITIVE_INFINITY
            for (let step = 0; step < 26; step += 1) {
              const result = jacobianStep(s.angles, s.lengths, s.base, s.target)
              err = result.err
              s.locked = result.locked
            }
            if (!s.converged) s.approachIters += 26
            s.reached = err < 0.4
            s.converged = s.reached
          }
        }

        const points = forwardKinematics(s.base, s.angles, s.lengths)
        const tip = points[s.n]
        s.tipErr = Math.hypot(tip.x - s.target.x, tip.y - s.target.y)
        if (s.solver === 'fabrik' && !s.track && s.mode !== 'fk' && s.mode !== 'multi') {
          const was = s.converged
          s.converged = s.reached && s.tipErr < 0.6
          if (!was && s.converged) s.bloom = 1
        }
        if (s.mode === 'multi') {
          s.converged = true
          s.reached = true
        }
        s.bloom = Math.max(0, s.bloom - dt / 1.2)
        const gripTarget = s.converged && s.tipErr < 1 ? 1 : 0
        s.grip = lerp(s.grip, gripTarget, 1 - Math.exp(-dt / 0.18))

        // 指尖拖尾：只在拖动或回放时记录
        if (s.dragging || s.playing) {
          s.trail.push({ x: tip.x, y: tip.y, age: 0 })
          if (s.trail.length > 90) s.trail.shift()
        }
        for (const dot of s.trail) dot.age += dt
        while (s.trail.length > 0 && s.trail[0].age > 0.9) s.trail.shift()

        // 故事第一步：目标在三个点之间跳跃
        if (s.mode === 'follow' && storyRef.current) {
          s.hopTimer -= dt
          if (s.hopTimer <= 0) {
            s.target = hopTargets[s.hopIndex % hopTargets.length]
            s.hopIndex += 1
            s.hopTimer = s.calm ? 999 : 1.7
          }
        }

        /* ── 绘制 ───────────────────────────────────────────── */
        const bucketW = Math.max(64, Math.round(width / 64) * 64)
        const bucketH = Math.max(64, Math.round(height / 64) * 64)
        const bucket = bucketW + 'x' + bucketH
        if (!backdropRef.current || backdropRef.current.key !== bucket) {
          backdropRef.current = buildBackdrop(bucketW, bucketH, bucket)
        }
        ctx.clearRect(0, 0, width, height)
        ctx.drawImage(backdropRef.current.canvas, 0, 0, width, height)

        const txx = txRef.current
        drawFloor(ctx, layout, toScreen)
        if (s.showWorkspace) drawWorkspace(ctx, layout, toScreen, s, txx)
        if (s.path.length > 1) drawPath(ctx, toScreen, s)
        if (s.mode === 'multi') drawMultiGhosts(ctx, layout, toScreen, s, txx)
        if (s.track && s.phase) drawTrackGhost(ctx, toScreen, s)
        drawTrail(ctx, toScreen, s)
        drawTarget(ctx, toScreen, s, txx, unreachable)
        drawArm(ctx, toScreen, s, points, scale)
        drawBase(ctx, toScreen, s, layout)
        drawAnnotations(ctx, layout, toScreen, s, txx, points, storyRef.current)

        /* ── HUD 节流同步 ───────────────────────────────────── */
        if (now - lastUi > 200) {
          lastUi = now
          const status: Hud['status'] = unreachable && s.mode !== 'fk' && s.mode !== 'multi'
            ? 'far'
            : s.locked.some(Boolean)
              ? 'limit'
              : s.converged
                ? 'ok'
                : 'chasing'
          const relatives = relativeAngles(s.angles).map((rel) => Math.round(rel * DEG))
          setHud((prev) => {
            const sameAngles = prev.relatives.length === relatives.length && prev.relatives.every((v, i) => v === relatives[i])
            if (
              prev.status === status
              && prev.iters === s.approachIters
              && Math.abs(prev.x - tip.x) < 0.15
              && Math.abs(prev.y - tip.y) < 0.15
              && sameAngles
            ) return prev
            return {
              x: Math.round(tip.x * 2) / 2,
              y: Math.round(tip.y * 2) / 2,
              iters: s.approachIters,
              status,
              relatives,
              locked: s.locked.slice(),
            }
          })
        }
      } catch (error) {
        if (!errorLogged.current) {
          errorLogged.current = true
          console.error('[robot-ik] frame failed', error)
        }
      }
      frameId = window.requestAnimationFrame(frame)
    }
    frameId = window.requestAnimationFrame(frame)
    return () => {
      window.cancelAnimationFrame(frameId)
      calmQuery.removeEventListener('change', syncCalm)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---- 故事 ---------------------------------------------------- */

  const exitToFree = useCallback(() => {
    const s = st.current
    s.mode = 'follow'
    s.playing = false
    s.playLoop = false
    s.track = null
    s.phase = null
    setPlaying(false)
    setSlowmo(false)
    s.slowmo = false
    enterFree()
  }, [enterFree])

  const guideSteps: Array<GuideStep> = [
    {
      title: tx('你只说「抓住这里」，它怎么知道每个关节转多少？'),
      body: tx('这条机械臂有五个关节，可你拖动的那只「手」只有一个目标点。控制器从没背过任何姿势——目标每换一次，它都要现场算出：基座、肩、肘、腕各自该转多少度。看着目标点跳动，手臂一次次跟上。'),
      durationMs: 8600,
      action: () => {
        const s = st.current
        s.mode = 'follow'
        s.track = null
        s.hopIndex = 0
        s.hopTimer = 0.4
        setShowWorkspace(false)
      },
    },
    {
      title: tx('正着算，只是一道加法题'),
      body: tx('知道每个关节的角度，手在哪儿是完全确定的：从基座出发，一节的向量接一节加到头。现在只有基座关节在来回转——盯住那只手，它划出的只是一段圆弧。这就是正运动学。'),
      durationMs: 8800,
      action: () => {
        const s = st.current
        s.mode = 'fk'
        s.track = null
        s.fkBase = s.angles.slice()
        s.trail = []
      },
    },
    {
      title: tx('反着算，答案有无穷多个'),
      body: tx('给定手的位置反推关节角度，就叫逆运动学。难的地方在于：同一个手位，手臂能摆出无数种姿势——肘朝上是一种，肘朝下又是一种。看，手钉在原地没动，身体却在一族真实的解之间游动。要机器人干活，必须每时每刻从无穷多解里挑出一个。'),
      durationMs: 9600,
      action: () => {
        const s = st.current
        s.mode = 'multi'
        s.track = null
        s.target = clampTarget({ x: 38, y: 66 })
      },
    },
    {
      title: tx('FABRIK：拉直一根绳，再一节一节装回去'),
      body: tx('这个 2011 年发表的算法不解方程，只做几何。向后传递：把「手」钉到目标上，从指尖朝基座一节一节摆回去——手臂先被拉成一根绳；向前传递：把基座钉回原位，再一节一节装回来。反复几轮，关节们就自己商量出了一个姿势。第三个目标太远——够不着就是够不着，它只能伸直了指向那里。'),
      durationMs: 15000,
      action: () => {
        const s = st.current
        s.mode = 'showcase'
        s.track = null
        s.showIndex = 0
        s.waitTimer = 0.5
        setShowWorkspace(true)
      },
    },
    {
      title: tx('焊接、喷漆、火星采样，都靠这道题'),
      body: tx('工厂里机械臂沿焊缝匀速走过时，控制器每毫秒都在解逆运动学；火星车的采样臂把钻头送到科学家指定的岩石上，解的也是它。现在这条手臂正在跟踪一条「IK」字形轨迹——那不是动画，是一连串被实时求解的目标点。轮到你了。'),
      durationMs: 12000,
      action: () => {
        const s = st.current
        s.mode = 'trace'
        s.path = lettersPath()
        setHasPath(true)
        s.playLoop = true
        s.playDist = 0
        s.playing = true
        setPlaying(true)
      },
    },
  ]

  /* ---- UI ------------------------------------------------------ */

  const solverLabels: Array<{ id: Solver; label: string }> = [
    { id: 'fabrik', label: 'FABRIK' },
    { id: 'ccd', label: tx('CCD 循环下降') },
    { id: 'jacobian', label: tx('雅可比转置') },
  ]

  const statusLabel = hud.status === 'far'
    ? tx('目标不可达 · 伸直指向')
    : hud.status === 'limit'
      ? tx('限位介入')
      : hud.status === 'ok'
        ? tx('已收敛')
        : tx('逼近中…')

  return (
    <div className={`oss-experience rik-experience${storyMode ? ' is-story' : ' is-free'}`}>
      <canvas
        ref={canvasRef}
        className="rik-canvas"
        tabIndex={0}
        role="application"
        aria-label={tx('平面机械臂逆运动学：点击或拖动设定手爪目标点，求解器实时算出每个关节角度；方向键可微调目标')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
      />

      {!storyMode && (
        <header className="rik-plaque" data-experience-overlay="true">
          <span>{tx('机械与算法')}</span>
          <h1>{tx('你指哪儿，手到哪儿')}</h1>
          <p>{tx('拖动发光的手爪——每个关节该转多少，由求解器现场商量出来。')}</p>
        </header>
      )}

      {!storyMode && (
        <aside className="rik-readout" data-experience-overlay="true" data-freebar-clearance="true" aria-live="polite">
          <div className="rik-readout-row">
            <span>{tx('末端位置')}</span>
            <strong>{'x ' + hud.x.toFixed(1) + ' · y ' + hud.y.toFixed(1) + ' cm'}</strong>
          </div>
          <div className="rik-readout-row">
            <span>{tx('求解')}</span>
            <strong className={hud.status === 'ok' ? 'is-ok' : hud.status === 'chasing' ? undefined : 'is-warn'}>
              {statusLabel + ' · ' + hud.iters + ' ' + tx('次迭代')}
            </strong>
          </div>
          <div className="rik-readout-joints" aria-label={tx('各关节角度')}>
            {hud.relatives.map((deg, index) => (
              <i key={index} className={hud.locked[index] ? 'is-locked' : undefined}>
                {'θ' + (index + 1) + ' ' + deg + '°'}
              </i>
            ))}
          </div>
        </aside>
      )}

      {!storyMode && (
        <Freebar
          className="rik-freebar"
          mainClassName="rik-freebar-main"
          ariaLabel={tx('机械臂控制')}
          primaryControlBudget={2}
          secondaryDefault="closed"
          secondary={(
            <div className="rik-tray">
              <label className="rik-field experience-freebar-field rik-tray-field">
                <div>
                  <span>{tx('关节数')}</span>
                  <strong>{joints}</strong>
                </div>
                <input
                  type="range"
                  min={5}
                  max={7}
                  step={1}
                  value={joints}
                  aria-label={tx('关节数')}
                  onChange={(event) => {
                    controls.registerInteraction()
                    const n = Number(event.target.value)
                    setJoints(n)
                    resetArm(n)
                  }}
                />
              </label>
              <div className="rik-chip-rail experience-freebar-chips" role="group" aria-label={tx('求解器与预设')}>
                {solverLabels.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={solver === item.id ? 'rik-chip is-on' : 'rik-chip'}
                    aria-pressed={solver === item.id}
                    onClick={() => {
                      controls.registerInteraction()
                      setSolver(item.id)
                      st.current.approachIters = 0
                      st.current.converged = false
                      st.current.track = null
                    }}
                  >
                    {item.label}
                  </button>
                ))}
                <button type="button" className="rik-chip" onClick={() => loadPreset('circle')}>{tx('圆形')}</button>
                <button type="button" className="rik-chip" onClick={() => loadPreset('star')}>{tx('星形')}</button>
                <button type="button" className="rik-chip" onClick={() => loadPreset('letters')}>{tx('IK 字样')}</button>
                <button
                  type="button"
                  className={slowmo ? 'rik-chip is-on' : 'rik-chip'}
                  aria-pressed={slowmo}
                  onClick={() => {
                    controls.registerInteraction()
                    const next = !slowmo
                    setSlowmo(next)
                    st.current.slowmo = next
                    if (next && !st.current.track) buildTrack(st.current.target)
                  }}
                >
                  <HourglassLow weight="bold" aria-hidden="true" /> {tx('慢放')}
                </button>
                <button
                  type="button"
                  className="rik-chip"
                  onClick={flipElbow}
                  aria-label={tx('切换肘上 / 肘下解')}
                >
                  <Swap weight="bold" aria-hidden="true" /> {elbow === 1 ? tx('肘上') : tx('肘下')}
                </button>
                <button
                  type="button"
                  className={showWorkspace ? 'rik-chip is-on' : 'rik-chip'}
                  aria-pressed={showWorkspace}
                  onClick={() => {
                    controls.registerInteraction()
                    setShowWorkspace((value) => !value)
                  }}
                >
                  <CircleDashed weight="bold" aria-hidden="true" /> {tx('工作空间')}
                </button>
                <button
                  type="button"
                  className="rik-replay experience-freebar-story"
                  onClick={() => {
                    controls.registerInteraction()
                    enterStory()
                    replayGuide(WORLD_ID)
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
            className={recording ? 'rik-chip is-on is-rec' : 'rik-chip'}
            aria-pressed={recording}
            onClick={toggleRecord}
            aria-label={recording ? tx('停止记录') : tx('记录轨迹')}
          >
            {recording ? <Stop weight="fill" aria-hidden="true" /> : <Record weight="bold" aria-hidden="true" />}
          </button>
          <button
            type="button"
            className={playing ? 'rik-play is-on' : 'rik-play'}
            onClick={togglePlay}
            disabled={!playing && !hasPath}
            aria-label={playing ? tx('停止回放') : tx('回放轨迹')}
          >
            {playing ? <Stop weight="fill" aria-hidden="true" /> : <Play weight="fill" aria-hidden="true" />}
          </button>
        </Freebar>
      )}

      <GuideTour
        worldId={WORLD_ID}
        steps={guideSteps}
        defaultOpen={storyMode}
        placement="stage"
        stagePlan={[
          { position: 'top-left', mobilePosition: 'top-left', width: 'wide', treatment: 'monumental', cue: 'right' },
          { position: 'top-right', mobilePosition: 'top-left', treatment: 'annotation', cue: 'left' },
          { position: 'bottom-left', mobilePosition: 'bottom-left', treatment: 'caption' },
          { position: 'bottom-right', mobilePosition: 'bottom-left', width: 'wide', treatment: 'editorial' },
          { position: 'top-left', mobilePosition: 'top-left', treatment: 'monumental' },
        ]}
        showReplayChip={false}
        onExit={exitToFree}
      />
      {!storyMode && (
        <GhostHint
          worldId={WORLD_ID}
          gesture={{ type: 'drag', target: '.rik-canvas', dx: 90, dy: -64, label: tx('拖动手爪，看关节自己商量出姿势') }}
        />
      )}
    </div>
  )
}

/* ── 绘制函数 ─────────────────────────────────────────────────── */

type Translate = <T>(value: T) => T

function drawFloor(ctx: CanvasRenderingContext2D, layout: Layout, toScreen: (p: Vec) => Vec) {
  const floor = toScreen({ x: 0, y: -18 })
  const floorY = floor.y
  const gradient = ctx.createLinearGradient(0, floorY - 2, 0, layout.height)
  gradient.addColorStop(0, 'rgba(70, 84, 104, 0.34)')
  gradient.addColorStop(0.12, 'rgba(34, 42, 54, 0.2)')
  gradient.addColorStop(1, 'rgba(6, 8, 12, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, floorY, layout.width, layout.height - floorY)
  ctx.strokeStyle = 'rgba(160, 186, 216, 0.22)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, floorY)
  ctx.lineTo(layout.width, floorY)
  ctx.stroke()
}

function drawWorkspace(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  toScreen: (p: Vec) => Vec,
  s: Scene,
  tx: Translate,
) {
  const base = toScreen(s.base)
  const radius = REACH * layout.scale
  const floorY = toScreen({ x: 0, y: -18 }).y
  ctx.save()
  // 可达区域只有地板以上这一段：圆环在地板处被裁断
  ctx.beginPath()
  ctx.rect(0, 0, layout.width, floorY)
  ctx.clip()
  ctx.strokeStyle = 'rgba(242, 178, 103, 0.34)'
  ctx.lineWidth = 1.2
  ctx.setLineDash([7, 8])
  ctx.beginPath()
  ctx.arc(base.x, base.y, radius, 0, TAU)
  ctx.stroke()
  ctx.setLineDash([])
  const glow = ctx.createRadialGradient(base.x, base.y, radius * 0.82, base.x, base.y, radius)
  glow.addColorStop(0, 'rgba(242, 178, 103, 0)')
  glow.addColorStop(1, 'rgba(242, 178, 103, 0.05)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(base.x, base.y, radius, 0, TAU)
  ctx.fill()
  ctx.restore()
  ctx.save()
  ctx.font = `600 ${layout.narrow ? 10 : 11}px ${SANS}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.fillStyle = 'rgba(242, 178, 103, 0.66)'
  ctx.fillText(tx('工作空间'), base.x, base.y - radius - 8)
  ctx.restore()
}

function drawPath(ctx: CanvasRenderingContext2D, toScreen: (p: Vec) => Vec, s: Scene) {
  ctx.save()
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.beginPath()
  s.path.forEach((point, index) => {
    const screen = toScreen(point)
    if (index === 0) ctx.moveTo(screen.x, screen.y)
    else ctx.lineTo(screen.x, screen.y)
  })
  ctx.strokeStyle = 'rgba(242, 178, 103, 0.16)'
  ctx.lineWidth = 5
  ctx.stroke()
  ctx.strokeStyle = 'rgba(242, 178, 103, 0.62)'
  ctx.lineWidth = 1.6
  ctx.stroke()
  if (s.playing) {
    const head = toScreen(pointAtLength(s.path, s.playDist))
    const glow = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 18)
    glow.addColorStop(0, 'rgba(255, 214, 150, 0.85)')
    glow.addColorStop(1, 'rgba(255, 190, 110, 0)')
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(head.x, head.y, 18, 0, TAU)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
  }
  ctx.restore()
}

function ghostStroke(ctx: CanvasRenderingContext2D, toScreen: (p: Vec) => Vec, points: Array<Vec>, alpha: number, tint: string) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = tint
  ctx.lineCap = 'round'
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = toScreen(points[i])
    const b = toScreen(points[i + 1])
    ctx.lineWidth = 9
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  }
  for (const point of points) {
    const screen = toScreen(point)
    ctx.beginPath()
    ctx.arc(screen.x, screen.y, 3.2, 0, TAU)
    ctx.fillStyle = tint
    ctx.fill()
  }
  ctx.restore()
}

function drawMultiGhosts(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  toScreen: (p: Vec) => Vec,
  s: Scene,
  tx: Translate,
) {
  void layout
  void tx
  const upSolution = solveFabrik(elbowBiasSeed(1, s.lengths, s.base, s.target), s.lengths, s.base, s.target, false)
  const downSolution = solveFabrik(elbowBiasSeed(-1, s.lengths, s.base, s.target), s.lengths, s.base, s.target, false)
  const upPoints = forwardKinematics(s.base, upSolution.angles, s.lengths)
  const downPoints = forwardKinematics(s.base, downSolution.angles, s.lengths)
  ghostStroke(ctx, toScreen, upPoints, 0.2, GHOST_BLUE)
  ghostStroke(ctx, toScreen, downPoints, 0.2, GHOST_BLUE)
}

/** 多解标签画在主臂之后：幽灵分支的标注不能被连杆盖住 */
function drawMultiLabels(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  toScreen: (p: Vec) => Vec,
  s: Scene,
  tx: Translate,
) {
  const upSolution = solveFabrik(elbowBiasSeed(1, s.lengths, s.base, s.target), s.lengths, s.base, s.target, false)
  const downSolution = solveFabrik(elbowBiasSeed(-1, s.lengths, s.base, s.target), s.lengths, s.base, s.target, false)
  const upPoints = forwardKinematics(s.base, upSolution.angles, s.lengths)
  const downPoints = forwardKinematics(s.base, downSolution.angles, s.lengths)

  // 哪一支是「肘上」由几何决定：肘关节在基座→指尖连线之上
  const tip = toScreen(upPoints[s.n])
  const baseScreen = toScreen(s.base)
  const side = (points: Array<Vec>) => {
    const elbow = toScreen(points[Math.min(2, s.n - 1)])
    return (tip.x - baseScreen.x) * (elbow.y - baseScreen.y) - (tip.y - baseScreen.y) * (elbow.x - baseScreen.x)
  }
  const upIsAbove = side(upPoints) < 0
  const labelFor = (points: Array<Vec>, text: string, dy: number) => {
    const elbow = toScreen(points[Math.min(2, s.n - 1)])
    ctx.save()
    ctx.font = `600 ${layout.narrow ? 10 : 11}px ${SANS}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(3, 5, 9, 0.95)'
    ctx.shadowBlur = 7
    ctx.fillStyle = 'rgba(176, 202, 230, 0.92)'
    ctx.fillText(text, elbow.x, elbow.y + dy)
    ctx.restore()
  }
  // 上解的标签放在它肘部上方、下解的放下方：主臂夹在中间，互不遮挡
  labelFor(upIsAbove ? upPoints : downPoints, tx('肘上解'), -26)
  labelFor(upIsAbove ? downPoints : upPoints, tx('肘下解'), 34)

  const targetScreen = toScreen(s.target)
  const captionX = clamp(targetScreen.x + 96, 84, layout.width - 84)
  ctx.save()
  ctx.font = `600 ${layout.narrow ? 10.5 : 11.5}px ${SANS}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.shadowColor = 'rgba(3, 5, 9, 0.95)'
  ctx.shadowBlur = 7
  ctx.fillStyle = 'rgba(228, 235, 244, 0.88)'
  ctx.fillText(tx('同一手位 · 无数姿态'), captionX, targetScreen.y - 34)
  ctx.restore()
}

function drawTrackGhost(ctx: CanvasRenderingContext2D, toScreen: (p: Vec) => Vec, s: Scene) {
  if (!s.track || s.cursor < 1) return
  const index = Math.max(0, Math.floor(s.cursor) - 1)
  const ghost = forwardKinematics(s.base, s.track[index].a, s.lengths)
  ghostStroke(ctx, toScreen, ghost, 0.14, GHOST_BLUE)
}

function drawTrail(ctx: CanvasRenderingContext2D, toScreen: (p: Vec) => Vec, s: Scene) {
  if (s.trail.length < 2) return
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (let i = 1; i < s.trail.length; i += 1) {
    const a = toScreen(s.trail[i - 1])
    const b = toScreen(s.trail[i])
    const alpha = clamp(1 - s.trail[i].age / 0.9, 0, 1) * 0.4
    ctx.strokeStyle = `rgba(242, 178, 103, ${alpha})`
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  }
  ctx.restore()
}

function drawTarget(
  ctx: CanvasRenderingContext2D,
  toScreen: (p: Vec) => Vec,
  s: Scene,
  tx: Translate,
  unreachable: boolean,
) {
  const target = toScreen(s.target)
  const tip = toScreen(forwardKinematics(s.base, s.angles, s.lengths)[s.n])
  ctx.save()
  if (unreachable) {
    ctx.strokeStyle = 'rgba(255, 122, 89, 0.55)'
    ctx.lineWidth = 1.2
    ctx.setLineDash([4, 6])
    ctx.beginPath()
    ctx.moveTo(tip.x, tip.y)
    ctx.lineTo(target.x, target.y)
    ctx.stroke()
    ctx.setLineDash([])
  }
  const colour = unreachable ? WARN : AMBER
  const pulse = s.dragging ? 1 : 0.82 + Math.sin(s.time * 3.2) * 0.18
  const glow = ctx.createRadialGradient(target.x, target.y, 0, target.x, target.y, 22 * pulse)
  glow.addColorStop(0, unreachable ? 'rgba(255, 122, 89, 0.4)' : 'rgba(242, 178, 103, 0.4)')
  glow.addColorStop(1, 'rgba(242, 178, 103, 0)')
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(target.x, target.y, 22 * pulse, 0, TAU)
  ctx.fill()
  ctx.globalCompositeOperation = 'source-over'
  ctx.strokeStyle = colour
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.arc(target.x, target.y, 8.5, 0, TAU)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(target.x - 13, target.y)
  ctx.lineTo(target.x - 5, target.y)
  ctx.moveTo(target.x + 5, target.y)
  ctx.lineTo(target.x + 13, target.y)
  ctx.moveTo(target.x, target.y - 13)
  ctx.lineTo(target.x, target.y - 5)
  ctx.moveTo(target.x, target.y + 5)
  ctx.lineTo(target.x, target.y + 13)
  ctx.stroke()
  ctx.fillStyle = colour
  ctx.beginPath()
  ctx.arc(target.x, target.y, 2, 0, TAU)
  ctx.fill()
  if (unreachable) {
    ctx.font = `600 10.5px ${SANS}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillStyle = 'rgba(255, 122, 89, 0.85)'
    ctx.fillText(tx('目标不可达'), target.x, target.y - 18)
  }
  ctx.restore()
}

function drawLink(ctx: CanvasRenderingContext2D, a: Vec, b: Vec, width: number) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const length = Math.hypot(dx, dy)
  if (length < 1) return
  const nx = -dy / length
  const ny = dx / length
  // 光从左上来：让渐变的亮端始终落在屏幕上侧
  const flip = ny < 0 ? 1 : -1
  const midX = (a.x + b.x) / 2
  const midY = (a.y + b.y) / 2
  const gradient = ctx.createLinearGradient(
    midX + nx * width * flip,
    midY + ny * width * flip,
    midX - nx * width * flip,
    midY - ny * width * flip,
  )
  gradient.addColorStop(0, '#eef2f7')
  gradient.addColorStop(0.34, '#b9c2cd')
  gradient.addColorStop(0.72, '#6e7987')
  gradient.addColorStop(1, '#363e48')
  ctx.lineCap = 'round'
  ctx.strokeStyle = gradient
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.moveTo(a.x, a.y)
  ctx.lineTo(b.x, b.y)
  ctx.stroke()
  // 轮廓线
  ctx.strokeStyle = 'rgba(16, 20, 26, 0.55)'
  ctx.lineWidth = 1
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(a.x + nx * width * 0.5 * side, a.y + ny * width * 0.5 * side)
    ctx.lineTo(b.x + nx * width * 0.5 * side, b.y + ny * width * 0.5 * side)
    ctx.stroke()
  }
  // 高光：偏向受光一侧的一道细亮线
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
  ctx.lineWidth = Math.max(1, width * 0.14)
  ctx.beginPath()
  ctx.moveTo(a.x - nx * width * 0.26 * flip, a.y - ny * width * 0.26 * flip)
  ctx.lineTo(b.x - nx * width * 0.26 * flip, b.y - ny * width * 0.26 * flip)
  ctx.stroke()
}

function drawJoint(
  ctx: CanvasRenderingContext2D,
  p: Vec,
  radius: number,
  locked: boolean,
  prevDir: number,
  limit: number,
  glowScale: number,
) {
  ctx.save()
  // 限位范围弧：常显但极淡；触限时端点亮红
  ctx.strokeStyle = locked ? 'rgba(255, 122, 89, 0.6)' : 'rgba(170, 196, 224, 0.14)'
  ctx.lineWidth = locked ? 1.8 : 1
  ctx.beginPath()
  ctx.arc(p.x, p.y, radius + 5.5, -prevDir - limit, -prevDir + limit)
  ctx.stroke()

  const ring = ctx.createRadialGradient(p.x - radius * 0.4, p.y - radius * 0.45, radius * 0.1, p.x, p.y, radius * 1.15)
  ring.addColorStop(0, '#d7dee7')
  ring.addColorStop(0.5, '#7c8794')
  ring.addColorStop(1, '#232a33')
  ctx.fillStyle = ring
  ctx.beginPath()
  ctx.arc(p.x, p.y, radius, 0, TAU)
  ctx.fill()
  ctx.strokeStyle = locked ? 'rgba(255, 122, 89, 0.9)' : 'rgba(14, 18, 24, 0.8)'
  ctx.lineWidth = locked ? 1.6 : 1
  ctx.stroke()
  ctx.fillStyle = '#141922'
  ctx.beginPath()
  ctx.arc(p.x, p.y, radius * 0.52, 0, TAU)
  ctx.fill()
  // 关节轴的暖光轴芯：克制的一小点暖，不糊成光斑
  const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 1.9 * glowScale)
  glow.addColorStop(0, locked ? 'rgba(255, 122, 89, 0.6)' : 'rgba(255, 178, 92, 0.42)')
  glow.addColorStop(1, 'rgba(255, 178, 92, 0)')
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(p.x, p.y, radius * 1.9 * glowScale, 0, TAU)
  ctx.fill()
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = locked ? '#ff9a7a' : '#ffc98a'
  ctx.beginPath()
  ctx.arc(p.x, p.y, radius * 0.22, 0, TAU)
  ctx.fill()
  ctx.restore()
}

function drawArm(
  ctx: CanvasRenderingContext2D,
  toScreen: (p: Vec) => Vec,
  s: Scene,
  points: Array<Vec>,
  scale: number,
) {
  const screens = points.map(toScreen)
  const n = s.n
  const thickness = (i: number) => clamp((13 - i * 0.9) * (scale / 3.4), 5.5, 16)
  // 投影到地板方向的柔和体影
  ctx.save()
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'
  ctx.lineCap = 'round'
  for (let i = 0; i < n; i += 1) {
    ctx.lineWidth = thickness(i)
    ctx.beginPath()
    ctx.moveTo(screens[i].x + 9, screens[i].y + 13)
    ctx.lineTo(screens[i + 1].x + 9, screens[i + 1].y + 13)
    ctx.stroke()
  }
  ctx.restore()

  for (let i = 0; i < n; i += 1) drawLink(ctx, screens[i], screens[i + 1], thickness(i))

  for (let i = 0; i < n; i += 1) {
    const prevDir = i === 0 ? UP : s.angles[i - 1]
    const limit = i === 0 ? BASE_LIMIT : JOINT_LIMIT
    const radius = clamp((8.6 - i * 0.55) * (scale / 3.4), 4.5, 10)
    drawJoint(ctx, screens[i], radius, s.locked[i], prevDir, limit, 1 + s.bloom * 0.4)
  }

  drawGripper(ctx, screens, s, scale)
}

function drawGripper(ctx: CanvasRenderingContext2D, screens: Array<Vec>, s: Scene, scale: number) {
  const n = s.n
  const wrist = screens[n]
  const dir = s.angles[n - 1]
  const length = clamp(4.1 * scale, 11, 20)
  const open = 0.62 - s.grip * 0.28
  ctx.save()
  ctx.lineCap = 'round'
  for (const side of [-1, 1]) {
    const a1 = dir + side * open
    const knuckle = { x: wrist.x + Math.cos(a1) * length * 0.62, y: wrist.y - Math.sin(a1) * length * 0.62 }
    const a2 = dir + side * open * 0.42
    const fingertip = { x: knuckle.x + Math.cos(a2) * length * 0.5, y: knuckle.y - Math.sin(a2) * length * 0.5 }
    ctx.strokeStyle = '#b4bfcc'
    ctx.lineWidth = 4.2
    ctx.beginPath()
    ctx.moveTo(wrist.x, wrist.y)
    ctx.lineTo(knuckle.x, knuckle.y)
    ctx.lineTo(fingertip.x, fingertip.y)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(20, 25, 33, 0.6)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(wrist.x, wrist.y)
    ctx.lineTo(knuckle.x, knuckle.y)
    ctx.lineTo(fingertip.x, fingertip.y)
    ctx.stroke()
  }
  // 指尖的暖光信标：这就是被求解的那个点
  const glow = ctx.createRadialGradient(wrist.x, wrist.y, 0, wrist.x, wrist.y, 12 + s.bloom * 12)
  glow.addColorStop(0, `rgba(255, 200, 130, ${0.42 + s.bloom * 0.4})`)
  glow.addColorStop(1, 'rgba(255, 190, 110, 0)')
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(wrist.x, wrist.y, 12 + s.bloom * 12, 0, TAU)
  ctx.fill()
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = '#ffd9a0'
  ctx.beginPath()
  ctx.arc(wrist.x, wrist.y, 2.6, 0, TAU)
  ctx.fill()
  ctx.restore()
}

function drawBase(ctx: CanvasRenderingContext2D, toScreen: (p: Vec) => Vec, s: Scene, layout: Layout) {
  const pivot = toScreen(s.base)
  const scale = layout.scale
  const floorY = toScreen({ x: 0, y: -18 }).y
  ctx.save()
  // 接触阴影
  const shadow = ctx.createRadialGradient(pivot.x, floorY, 0, pivot.x, floorY, 44 * scale * 0.32)
  shadow.addColorStop(0, 'rgba(0, 0, 0, 0.5)')
  shadow.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = shadow
  ctx.beginPath()
  ctx.ellipse(pivot.x, floorY, 46 * scale * 0.34, 9 * scale * 0.34 + 4, 0, 0, TAU)
  ctx.fill()
  // 立柱
  const columnW = 15 * scale * 0.32 + 4
  const column = ctx.createLinearGradient(pivot.x - columnW, 0, pivot.x + columnW, 0)
  column.addColorStop(0, '#3a434e')
  column.addColorStop(0.45, '#98a3b1')
  column.addColorStop(1, '#2a313b')
  ctx.fillStyle = column
  ctx.beginPath()
  ctx.roundRect(pivot.x - columnW, pivot.y, columnW * 2, floorY - pivot.y, 3)
  ctx.fill()
  // 底座法兰与地脚螺栓
  const flangeW = columnW * 1.9
  const flangeH = 6 * scale * 0.32 + 3
  const flange = ctx.createLinearGradient(0, floorY - flangeH, 0, floorY)
  flange.addColorStop(0, '#8b96a4')
  flange.addColorStop(1, '#2c333d')
  ctx.fillStyle = flange
  ctx.beginPath()
  ctx.roundRect(pivot.x - flangeW, floorY - flangeH, flangeW * 2, flangeH, 2)
  ctx.fill()
  ctx.fillStyle = '#c9d2dc'
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.arc(pivot.x + side * flangeW * 0.72, floorY - flangeH / 2, 1.6, 0, TAU)
    ctx.fill()
  }
  ctx.restore()
}

function drawAnnotations(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  toScreen: (p: Vec) => Vec,
  s: Scene,
  tx: Translate,
  points: Array<Vec>,
  story: boolean,
) {
  // 正运动学演示：基座摆角弧 + 向量求和公式
  if (s.mode === 'fk') {
    const base = toScreen(s.base)
    const radius = 54
    ctx.save()
    ctx.strokeStyle = AMBER_SOFT
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.arc(base.x, base.y, radius, -UP - 1.02, -UP + 1.02)
    ctx.stroke()
    const tipOfArc = { x: base.x + Math.cos(s.angles[0]) * radius, y: base.y - Math.sin(s.angles[0]) * radius }
    ctx.strokeStyle = AMBER
    ctx.beginPath()
    ctx.moveTo(base.x, base.y)
    ctx.lineTo(tipOfArc.x, tipOfArc.y)
    ctx.stroke()
    const theta = Math.round(wrapAngle(s.angles[0] - UP) * DEG)
    ctx.font = `600 ${layout.narrow ? 11 : 12.5}px ${SANS}`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = AMBER
    ctx.fillText('θ₁ = ' + theta + '°', tipOfArc.x + 10, tipOfArc.y)

    // 公式：桌面放顶右，手机放顶左且避开「下一世界」悬浮卡的高度
    const fx = layout.narrow ? 14 : layout.width - 26
    const fy = layout.stageTop + (layout.narrow ? 66 : 30)
    ctx.textAlign = layout.narrow ? 'left' : 'right'
    ctx.font = `500 ${layout.narrow ? 12 : 14}px ${SERIF}`
    ctx.fillStyle = 'rgba(228, 235, 244, 0.78)'
    ctx.fillText('x = L₁cosθ₁ + L₂cos(θ₁+θ₂) + …', fx, fy)
    ctx.fillText('y = L₁sinθ₁ + L₂sin(θ₁+θ₂) + …', fx, fy + (layout.narrow ? 17 : 20))
    ctx.font = `600 ${layout.narrow ? 10 : 11}px ${SANS}`
    ctx.fillStyle = INK_SOFT
    ctx.fillText(tx('正运动学：角度加出位置'), fx, fy + (layout.narrow ? 34 : 40))
    ctx.restore()
  }

  // 故事第一步：给跳动的目标点配一句旁白
  if (s.mode === 'follow' && story && s.hopTimer > 0 && !s.dragging) {
    const target = toScreen(s.target)
    ctx.save()
    ctx.font = `600 ${layout.narrow ? 10.5 : 11.5}px ${SANS}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillStyle = 'rgba(242, 178, 103, 0.85)'
    ctx.fillText(tx('抓住这里'), target.x, target.y - 18)
    ctx.restore()
  }

  // 迭代慢放：当前相位 + 轨道进度
  if (s.track && s.phase) {
    const label = s.phase === 'back'
      ? tx('向后传递 · 指尖 → 基座')
      : s.phase === 'forward'
        ? tx('向前传递 · 基座 → 指尖')
        : s.phase === 'clamp'
          ? tx('关节限位检查')
          : s.phase === 'stretch'
            ? tx('目标太远 · 伸直指向')
            : s.phase === 'sweep'
              ? tx('逐关节转向 · 指尖到基座')
              : tx('沿误差方向走一小步')
    const progress = Math.min(s.track.length, Math.floor(s.cursor) + 1) + ' / ' + s.track.length
    ctx.save()
    ctx.font = `600 ${layout.narrow ? 11 : 12}px ${SANS}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillStyle = 'rgba(228, 235, 244, 0.85)'
    ctx.fillText(label, layout.baseX, layout.stageBottom - 24)
    ctx.font = `500 ${layout.narrow ? 9.5 : 10.5}px ${SANS}`
    ctx.fillStyle = INK_FAINT
    ctx.fillText(progress, layout.baseX, layout.stageBottom - 9)
    ctx.restore()
  }

  // 慢放且静止时的求解器铭牌
  if (!s.track && s.mode === 'showcase') {
    ctx.save()
    ctx.font = `600 ${layout.narrow ? 10.5 : 11.5}px ${SANS}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillStyle = INK_FAINT
    ctx.fillText('FABRIK · Aristidou & Lasenby 2011', layout.baseX, layout.stageBottom - 9)
    ctx.restore()
  }

  // 多解演示：主臂肘部虚线圈 + 幽灵分支标注（画在主臂之后）
  if (s.mode === 'multi') {
    const elbow = toScreen(points[Math.min(2, s.n - 1)])
    ctx.save()
    ctx.strokeStyle = 'rgba(242, 178, 103, 0.5)'
    ctx.lineWidth = 1
    ctx.setLineDash([3, 4])
    ctx.beginPath()
    ctx.arc(elbow.x, elbow.y, 12, 0, TAU)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
    drawMultiLabels(ctx, layout, toScreen, s, tx)
  }
}
