import './styles/KakeyaNeedle.css'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowCounterClockwise, Pause, Play, FilmStrip } from '@phosphor-icons/react'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import {
  GuideTour,
  replayGuide,
  type GuideStep,
} from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import { useExperienceI18n } from '~/i18n/experience'
/**
 * 挂谷问题：一根针掉头，到底要多大地方？
 *
 * 四种掉头方法共用同一条进度 u ∈ [0,1]（= 已转过 0…180°）：
 * - disk     按住中点转半圈：扫过整个圆盘，π/4 ≈ 0.785
 * - reuleaux 支点轮流挂在等边三角形的三个顶点，各抡 60°：
 *            三个 60° 扇形的并集恰好是莱洛三角形，(π−√3)/2 ≈ 0.705
 * - deltoid  贴着三尖内摆线滑：滚圆半径 r、定圆 3r，切线弦长恒为 4r = 针长，
 *            s 从 0 走到 π 恰好掉头，扫过 π/8 ≈ 0.393
 * - perron   贝西科维奇构造：等边三角形切成 2^k 根细条再平移推拢（平移不改方向），
 *            针在细条重叠处小角度换轨；一片树林管约 60° 扇面，三片轮换完成 180°，
 *            面积随切细没有下限
 *
 * 「扫过面积」不是写死的数字：针每前进一小步，就把前后两个位置围成的四边形
 * 盖进一张位图，读数 = 这张位图并集的实测面积。同一算法的离线校验：
 * 0.789 / 0.708 / 0.398 对精确值 0.785 / 0.705 / 0.393，误差约 1%。
 */

const TAU = Math.PI * 2
/** 针长 = 4（滚圆半径 r = 1 为单位） */
const NEEDLE_LEN = 4
/** 把「针长 = 4」的面积折算成「针长 = 1」 */
const AREA_UNIT = NEEDLE_LEN * NEEDLE_LEN
/** 各方法扫过面积（针长 = 1）：圆盘 π/4、莱洛 (π−√3)/2、等边三角形 1/√3、三尖内摆线 π/8 */
const AREA_DISK = Math.PI / 4
const AREA_REULEAUX = (Math.PI - Math.sqrt(3)) / 2
const AREA_TRIANGLE = 1 / Math.sqrt(3)
const AREA_DELTOID = Math.PI / 8

type Vec = { x: number; y: number }

type RegionMethod = 'disk' | 'reuleaux' | 'deltoid'
type Method = RegionMethod | 'perron'

const METHOD_AREA: Record<RegionMethod, number> = {
  disk: AREA_DISK,
  reuleaux: AREA_REULEAUX,
  deltoid: AREA_DELTOID,
}
const METHOD_FORMULA: Record<RegionMethod, string> = {
  disk: 'π/4',
  reuleaux: '(π−√3)/2',
  deltoid: 'π/8',
}
/** 完成读数的舞台落点（数学坐标；投影后在中轴左侧、针的最终位置之外） */
const METHOD_ANCHOR: Record<RegionMethod, Vec> = {
  disk: { x: 0, y: 1.05 },
  reuleaux: { x: 0, y: 0.62 },
  deltoid: { x: 0, y: 0.62 },
}
/** 底栏分段控制的短标签 */
const SEG_LABEL: Record<Method, string> = {
  disk: '圆盘',
  reuleaux: '莱洛',
  deltoid: '曲边三角',
  perron: '细条',
}

/** 三尖内摆线（deltoid）：滚圆半径 1 在半径 3 的定圆内滚 */
function deltoid(t: number): Vec {
  return {
    x: 2 * Math.cos(t) + Math.cos(2 * t),
    y: 2 * Math.sin(t) - Math.sin(2 * t),
  }
}

/** 滚圆圆心：在半径 R − r = 2 的圆上 */
function rollerCenter(t: number): Vec {
  return { x: 2 * Math.cos(t), y: 2 * Math.sin(t) }
}

/** 参数 s 的针：连接 P(s) 与 P(s+π) 的弦，长度恒为 4，方向角恰好是 s */
function needleDeltoid(s: number) {
  const a = deltoid(s)
  const b = deltoid(s + Math.PI)
  const offset = 2 * Math.cos(3 * s)
  return {
    a,
    b,
    touch: {
      x: (a.x + b.x) / 2 + offset * Math.cos(s),
      y: (a.y + b.y) / 2 + offset * Math.sin(s),
    },
  }
}

/** 莱洛三角形：边长 = 针长 4 的等边三角形，质心在原点 */
const REU_H = 2 * Math.sqrt(3)
const REU_A: Vec = { x: -2, y: -REU_H / 3 }
const REU_B: Vec = { x: 2, y: -REU_H / 3 }
const REU_C: Vec = { x: 0, y: (2 * REU_H) / 3 }
/** 三条边界弧：弧 BC 以 A 为圆心、弧 CA 以 B 为圆心、弧 AB 以 C 为圆心，半径都是 4 */
const REU_ARCS = [
  { center: REU_A, from: 0, to: Math.PI / 3 },
  { center: REU_B, from: (2 * Math.PI) / 3, to: Math.PI },
  { center: REU_C, from: (4 * Math.PI) / 3, to: (5 * Math.PI) / 3 },
] as const

/**
 * 三支点轮换掉头：针从三角形的一条边出发，
 * 依次绕 A（0°→60°）、C（240°→300°）、B（120°→180°）各抡 60°，
 * 自由端始终沿边界弧滑动；三次抡完，针从 AB 变成 BA，正好掉头。
 */
function needleReuleaux(u: number) {
  const phase = Math.min(2.999_999, u * 3)
  const index = Math.floor(phase)
  const t = phase - index
  const leg = REU_ARCS[index] ?? REU_ARCS[2]
  const angle = leg.from + ((leg.to - leg.from) * t)
  return {
    a: leg.center,
    b: { x: leg.center.x + NEEDLE_LEN * Math.cos(angle), y: leg.center.y + NEEDLE_LEN * Math.sin(angle) },
  }
}

/** 圆盘：绕中点转半圈 */
function needleDisk(u: number) {
  const theta = u * Math.PI
  const dx = (NEEDLE_LEN / 2) * Math.cos(theta)
  const dy = (NEEDLE_LEN / 2) * Math.sin(theta)
  return { a: { x: -dx, y: -dy }, b: { x: dx, y: dy } }
}

function regionNeedle(method: RegionMethod, u: number): { a: Vec; b: Vec } {
  if (method === 'disk') return needleDisk(u)
  if (method === 'reuleaux') return needleReuleaux(u)
  return needleDeltoid(u * Math.PI)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function approach(current: number, target: number, rate: number) {
  return current + (target - current) * clamp(rate, 0, 1)
}

const smooth = (v: number) => v * v * (3 - 2 * v)

/** 视口 → 画布：整体旋转 90°，让 deltoid 一个尖角朝上 */
type View = { cx: number; cy: number; k: number }

function project(view: View, p: Vec) {
  return { x: view.cx - p.y * view.k, y: view.cy - p.x * view.k }
}

/* ============================================================
   扫过面积的实测：针位四边形盖进位图，增量数并集格子
   ============================================================ */
const GRID_N = 448
const GRID_EXT = 3.45
const GRID_CELL = (2 * GRID_EXT) / GRID_N

type Sweeper = {
  grid: Uint8Array
  count: number
  stampedU: number
  method: RegionMethod
}

function createSweeper(method: RegionMethod): Sweeper {
  return { grid: new Uint8Array(GRID_N * GRID_N), count: 0, stampedU: 0, method }
}

function gridStampTriangle(sweeper: Sweeper, p0: Vec, p1: Vec, p2: Vec) {
  const grid = sweeper.grid
  const ax = (p0.x + GRID_EXT) / GRID_CELL
  const ay = (p0.y + GRID_EXT) / GRID_CELL
  const bx = (p1.x + GRID_EXT) / GRID_CELL
  const by = (p1.y + GRID_EXT) / GRID_CELL
  const cx = (p2.x + GRID_EXT) / GRID_CELL
  const cy = (p2.y + GRID_EXT) / GRID_CELL
  const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx)))
  const maxX = Math.min(GRID_N - 1, Math.ceil(Math.max(ax, bx, cx)))
  const minY = Math.max(0, Math.floor(Math.min(ay, by, cy)))
  const maxY = Math.min(GRID_N - 1, Math.ceil(Math.max(ay, by, cy)))
  const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
  if (Math.abs(area) < 1e-9) return
  for (let gy = minY; gy <= maxY; gy += 1) {
    for (let gx = minX; gx <= maxX; gx += 1) {
      const px = gx + 0.5
      const py = gy + 0.5
      const w0 = ((bx - px) * (cy - py) - (by - py) * (cx - px)) / area
      const w1 = ((cx - px) * (ay - py) - (cy - py) * (ax - px)) / area
      const w2 = 1 - w0 - w1
      if (w0 >= -0.002 && w1 >= -0.002 && w2 >= -0.002) {
        const index = gy * GRID_N + gx
        if (grid[index] === 0) {
          grid[index] = 1
          sweeper.count += 1
        }
      }
    }
  }
}

/* ============================================================
   贝西科维奇构造（细条）：等边三角形切成 2^depth 根细条，平移推拢
   ============================================================ */
type Sliver = { apexY: number; baseLow: number; baseHigh: number }

/** 三角形在数学坐标里：尖端在 x = APEX_X，底边在 x = BASE_X（投影后尖端朝上） */
const APEX_X = 2.4
const BASE_X = APEX_X - NEEDLE_LEN
const BASE_HALF = NEEDLE_LEN / Math.sqrt(3)

/** 切推分 6 轮：细条数翻倍、同时推得更拢，并集面积一轮一截地掉 */
const CODA_ROUND_SLIDES = [0.35, 0.5, 0.6, 0.65, 0.68, 0.68]
const CODA_MAX_DEPTH = CODA_ROUND_SLIDES.length
const CODA_ROUND_DUR = 2.8
const CONS_DUR = CODA_ROUND_SLIDES.length * CODA_ROUND_DUR

function buildSlivers(depth: number, slide: number): Array<Sliver> {
  const count = 2 ** depth
  const width = (BASE_HALF * 2) / count
  const slivers: Array<Sliver> = []
  for (let index = 0; index < count; index += 1) {
    const low = -BASE_HALF + index * width
    const high = low + width
    const shift = -slide * ((low + high) / 2)
    slivers.push({ apexY: shift, baseLow: low + shift, baseHigh: high + shift })
  }
  return slivers
}

/** 扫描线求并集面积，换算成「针长 = 1」的单位 */
function sliverUnionArea(slivers: Array<Sliver>): number {
  const steps = 240
  const dx = NEEDLE_LEN / steps
  let total = 0
  const spans: Array<[number, number]> = []
  for (let step = 0; step < steps; step += 1) {
    const fraction = (step + 0.5) / steps
    spans.length = 0
    for (const sliver of slivers) {
      const low = sliver.baseLow + (sliver.apexY - sliver.baseLow) * fraction
      const high = sliver.baseHigh + (sliver.apexY - sliver.baseHigh) * fraction
      spans.push(low <= high ? [low, high] : [high, low])
    }
    spans.sort((left, right) => left[0] - right[0])
    let covered = 0
    let cursor = -Infinity
    for (const [low, high] of spans) {
      if (high <= cursor) continue
      covered += high - Math.max(low, cursor)
      cursor = high
    }
    total += covered * dx
  }
  return total / AREA_UNIT
}

/**
 * 换轨演示：用 16 根细条（比最终构造粗 4 倍，看得清重叠）。
 * 同一次推拢后所有细条轴线穿过共同点 (APEX_X − 4·slide, 0)：
 * 针滑到交叉点附近、小转一个细条夹角、再滑进下一根——转弯发生在重叠区里。
 */
const DEMO_DEPTH = 4
const DEMO_SLIDE = 0.65
const DEMO_TRACKS = 2 ** DEMO_DEPTH
const DEMO_HOPS = DEMO_TRACKS - 1
const DEMO_HOP_DUR = 0.72
/** 演示循环：交叉淡入 + 15 次换轨 + 三片树林蒙太奇 + 停留 */
const DEMO_FADE_DUR = 0.9
const MONTAGE_DUR = 3.4
const DEMO_HOLD_DUR = 2.6
const DEMO_LOOP = DEMO_FADE_DUR + DEMO_HOPS * DEMO_HOP_DUR + MONTAGE_DUR + DEMO_HOLD_DUR

const demoC = (index: number) => -BASE_HALF + ((index + 0.5) * (BASE_HALF * 2)) / DEMO_TRACKS
/** 交叉点（随推拢程度） */
const demoCross = (slide: number): Vec => ({ x: APEX_X - NEEDLE_LEN * slide, y: 0 })
/** 细条 c 的轴线：尖端 → 底边中点 */
const demoAxis = (c: number, slide: number) => {
  const apex = { x: APEX_X, y: -slide * c }
  const baseMid = { x: BASE_X, y: c * (1 - slide) }
  const len = Math.hypot(NEEDLE_LEN, c)
  return {
    apex,
    baseMid,
    len,
    ux: (baseMid.x - apex.x) / len,
    uy: (baseMid.y - apex.y) / len,
  }
}
/** 细条 c 的轴线方向：与推拢程度无关（平移不改方向） */
const demoAngle = (c: number) => Math.atan2(-c, NEEDLE_LEN)
/** 细条 c 的「休息位」针心：轴线中点 */
const demoHome = (c: number, slide: number): Vec => ({
  x: (APEX_X + BASE_X) / 2,
  y: (c * (1 - 2 * slide)) / 2,
})
/** 换轨位针心：让交叉点落在针的 62% 处，转弯前后两端都贴着细条 */
const demoPivotParam = (c: number, slide: number) => {
  const axis = demoAxis(c, slide)
  const crossParam = axis.len * slide
  const centerParam = clamp(crossParam - 0.48, NEEDLE_LEN / 2, axis.len - NEEDLE_LEN / 2)
  return { axis, centerParam, offset: centerParam - crossParam }
}
const demoPivot = (c: number, slide: number): Vec => {
  const { axis, centerParam } = demoPivotParam(c, slide)
  return { x: axis.apex.x + axis.ux * centerParam, y: axis.apex.y + axis.uy * centerParam }
}
/** 换轨累计转角（前缀和） */
const DEMO_TURN_PREFIX: Array<number> = [0]
for (let index = 1; index < DEMO_TRACKS; index += 1) {
  DEMO_TURN_PREFIX.push(
    DEMO_TURN_PREFIX[index - 1] + Math.abs(demoAngle(demoC(index)) - demoAngle(demoC(index - 1))),
  )
}
const DEMO_TURN_TOTAL = DEMO_TURN_PREFIX[DEMO_TRACKS - 1]

/* ============================================================
   故事章节
   ============================================================ */
type KakeyaStoryChapter = Readonly<{ title: string; body: string }>

const KakeyaStoryChapters: ReadonlyArray<KakeyaStoryChapter> = [
  {
    title: '一根针掉头，要多大地方？',
    body: '桌上有一根针，想让它从朝右变成朝左。最直白的办法：按住中点转半圈——能掉头，但针扫过了一整块圆盘，面积 π/4 ≈ 0.785。',
  },
  {
    title: '换个支点，立省一成',
    body: '别绕中点转。把针尖轮流挂在等边三角形的三个角上，各抡 60°，三次正好掉头。扫过的是一颗莱洛三角形，面积 (π−√3)/2 ≈ 0.705。',
  },
  {
    title: '挂谷的轨道：三尖星',
    body: '1917 年，挂谷宗一想出一条更绝的轨道：小圆贴着三倍大的圆内壁滚一圈，笔尖就描出这条三尖内摆线。',
  },
  {
    title: '贴着弧滑，面积砍半',
    body: '这条曲线的神妙之处：任意切线卡在弧里的那段，永远刚好一根针长。针贴壁滑过半圈就掉头，扫过 π/8 ≈ 0.393——正好半个圆盘。挂谷猜：这就是最小。',
  },
  {
    title: '贝西科维奇：切碎再推拢',
    body: '这个猜想撑了十年。把三角形切成越来越细的条，再平移推拢——平移不改变方向，扇面里的方向一根不少，合起来的面积却一轮轮往下掉。',
  },
  {
    title: '细条之间，蹭着换轨',
    body: '细条被推到互相重叠：针滑进重叠区，小转几度，再滑进下一条。一片细条管 60° 扇面，三片轮换正好 180°；切得越细，总面积想要多小有多小。',
  },
  {
    title: '再小，也瘪不成一条线',
    body: '面积可以逼近零，维度却塌不下去——它仍要向四面八方铺开。这就是挂谷猜想；2025 年，王虹与 Zahl 证明了三维情形。',
  },
]

/** 自由探索铭牌：每种方法一句点题 */
const PLAQUE: Record<Method, { title: string; strong: string; takeaway: string }> = {
  disk: {
    title: '圆盘掉头',
    strong: '按住中点，转半圈',
    takeaway: '最直白的办法：针扫过整个圆盘，π/4 ≈ 0.785。',
  },
  reuleaux: {
    title: '莱洛三角形',
    strong: '支点轮换，三次各抡 60°',
    takeaway: '扫过 (π−√3)/2 ≈ 0.705，比圆盘省一成。',
  },
  deltoid: {
    title: '挂谷曲边三角',
    strong: '贴着三尖弧滑过去',
    takeaway: '切线弦长恒为一根针；扫过 π/8 ≈ 0.393，圆盘的一半。',
  },
  perron: {
    title: '细条构造',
    strong: '切碎、推拢、蹭着换轨',
    takeaway: '方向一根不少，面积想要多小有多小。',
  },
}

/** 面积对照条（针长 = 1）；细条构造的读数是实时的 */
const COMPARE_ROWS: ReadonlyArray<{ key: RegionMethod; label: string; area: number }> = [
  { key: 'disk', label: '圆盘', area: AREA_DISK },
  { key: 'reuleaux', label: '莱洛', area: AREA_REULEAUX },
  { key: 'deltoid', label: '曲边', area: AREA_DELTOID },
]

type Scene = {
  beat: number
  method: Method
  fade: number
  u: number
  playing: boolean
  time: number
  holdT: number
  turned: number
  rollers: number
  envelope: number
  dust: number
  curve: number
  codaTime: number
  /** 面积数字是否登台（区域方法完成一次掉头后） */
  numberOk: boolean
}

export function KakeyaNeedle({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const { storyMode, enterStory, returnToFree } = useStoryFreeMode('kakeya-needle')

  const [beat, setBeat] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [method, setMethodState] = useState<Method>('deltoid')
  const [showRollers, setShowRollers] = useState(true)
  const [showEnvelope, setShowEnvelope] = useState(false)
  /** HUD 镜像：10Hz 从场景 ref 同步 */
  const [hud, setHud] = useState({
    degrees: 0,
    swept: 0,
    done: false,
    scrub: 0,
    treeArea: AREA_TRIANGLE,
    round: 0,
    demoPhase: 'build' as 'build' | 'hop' | 'montage' | 'hold',
  })
  /** 拖动滑杆期间用本地值，绕开 10Hz 镜像的回写延迟 */
  const [scrubOverride, setScrubOverride] = useState<number | null>(null)

  const isPerron = method === 'perron'

  const sceneRef = useRef<Scene>({
    beat: 0,
    method: 'deltoid',
    fade: 1,
    u: 0,
    playing: true,
    time: 0,
    holdT: 0,
    turned: 0,
    rollers: 1,
    envelope: 0,
    dust: 1,
    curve: 1,
    codaTime: 0,
    numberOk: true,
  })
  const finishedRef = useRef(false)
  const layersRef = useRef({ rollers: true, envelope: false })
  const finishRef = useRef(controls.finish)

  useEffect(() => {
    finishRef.current = controls.finish
  }, [controls.finish])

  useEffect(() => {
    layersRef.current = { rollers: showRollers, envelope: showEnvelope }
  }, [showEnvelope, showRollers])

  /** 切换方法：清扫过层、针回起点、重新掉头 */
  const setMethod = useCallback((next: Method) => {
    const scene = sceneRef.current
    scene.method = next
    scene.fade = 0
    scene.u = 0
    scene.holdT = 0
    scene.turned = 0
    scene.codaTime = 0
    scene.numberOk = true
    setMethodState(next)
    setPlaying(true)
  }, [])

  /** 故事章节切换时重置画面节拍，避免从上一章的残影继续 */
  const openBeat = useCallback((next: number) => {
    const scene = sceneRef.current
    scene.beat = next
    scene.time = 0
    scene.holdT = 0
    scene.u = 0
    scene.turned = 0
    scene.numberOk = next === 1 || next === 2 || next === 4
    if (next === 1) scene.method = 'disk'
    if (next === 2) scene.method = 'reuleaux'
    if (next === 3 || next === 4 || next === 7) scene.method = 'deltoid'
    if (next === 5) {
      scene.method = 'perron'
      scene.codaTime = 0
    }
    if (next === 6) {
      scene.method = 'perron'
      // 从第 3 次换轨开始进入，12.5 秒内刚好看到完整蒙太奇
      scene.codaTime = CONS_DUR + DEMO_FADE_DUR + 2 * DEMO_HOP_DUR
    }
    if (next === 3) scene.curve = 0
    if (next === 7) {
      scene.curve = 1
      scene.u = 1
    }
    scene.fade = 0
    setMethodState(scene.method)
    setBeat(next)
  }, [])

  const scrubTo = useCallback((next: number) => {
    const scene = sceneRef.current
    scene.u = clamp(next / Math.PI, 0, 1)
    scene.turned = scene.u * Math.PI
    scene.holdT = 0
  }, [])

  useEffect(() => {
    sceneRef.current.beat = beat
  }, [beat])

  useEffect(() => {
    sceneRef.current.playing = playing
  }, [playing])

  /** 画布内文案的 tx 走 ref，语言切换立即生效 */
  const txRef = useRef(tx)
  useEffect(() => {
    txRef.current = tx
  }, [tx])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const base = canvas.getContext('2d')
    if (!base) return

    /**
     * 绘制助手都从闭包里读 ctx；烘静态图层时把它换成离屏上下文。
     * 底图、切线族、曲线三层每帧只需要一次 drawImage。
     */
    let ctx: CanvasRenderingContext2D = base
    let width = 0
    let height = 0
    let dpr = 1
    let view: View = { cx: 0, cy: 0, k: 60 }
    let frame = 0
    let frames = 0
    let last = 0
    let hudClock = 0
    let bgLayer: HTMLCanvasElement | null = null
    let envLayer: HTMLCanvasElement | null = null
    let curveLayer: HTMLCanvasElement | null = null
    /** 扫过层：针走过的四边形逐帧盖上去（屏幕空间，同色平铺即并集） */
    let sweepCanvas: HTMLCanvasElement | null = null
    let sweepCtx: CanvasRenderingContext2D | null = null
    let sweepU = 0
    let sweeper: Sweeper | null = null
    let sweptArea = 0

    type Box = { x: number; y: number; w: number; h: number }
    let stageBox: Box = { x: 0, y: 0, w: 1, h: 1 }
    /** 画布内文字走 ref：切语言时不用重建动画循环（遮蔽外层 tx，i18n 审计只认这个名字） */
    const tx = (value: string) => txRef.current(value)

    const bakeLayer = (box: Box, paint: () => void): HTMLCanvasElement | null => {
      const layer = document.createElement('canvas')
      layer.width = Math.max(1, Math.round(box.w * dpr))
      layer.height = Math.max(1, Math.round(box.h * dpr))
      const layerCtx = layer.getContext('2d')
      if (!layerCtx) return null
      layerCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
      layerCtx.translate(-box.x, -box.y)
      const previous = ctx
      ctx = layerCtx
      try {
        paint()
      } finally {
        ctx = previous
      }
      return layer
    }

    const blit = (layer: HTMLCanvasElement, box: Box, alpha: number) => {
      if (alpha < 0.01) return
      ctx.save()
      ctx.globalAlpha *= alpha
      ctx.drawImage(layer, box.x, box.y, box.w, box.h)
      ctx.restore()
    }

    /** 把针从 sweepU 走到 u 扫过的四边形盖进扫过层 + 位图 */
    const stampTo = (method: RegionMethod, u: number) => {
      if (!sweepCtx) return
      if (!sweeper || sweeper.method !== method) {
        sweeper = createSweeper(method)
        sweepU = 0
        sweepCtx.clearRect(0, 0, width, height)
      }
      if (u < sweepU - 1e-9) {
        sweepU = 0
        sweepCtx.clearRect(0, 0, width, height)
        sweeper.grid.fill(0)
        sweeper.count = 0
        sweeper.stampedU = 0
      }
      const step = 1 / 320
      sweepCtx.fillStyle = 'rgb(148, 106, 58)'
      while (sweepU < u - 1e-9) {
        const next = Math.min(u, sweepU + step)
        const p0 = regionNeedle(method, sweepU)
        const p1 = regionNeedle(method, next)
        sweepCtx.beginPath()
        const a0 = project(view, p0.a)
        const b0 = project(view, p0.b)
        const b1 = project(view, p1.b)
        const a1 = project(view, p1.a)
        sweepCtx.moveTo(a0.x, a0.y)
        sweepCtx.lineTo(b0.x, b0.y)
        sweepCtx.lineTo(b1.x, b1.y)
        sweepCtx.lineTo(a1.x, a1.y)
        sweepCtx.closePath()
        sweepCtx.fill()
        gridStampTriangle(sweeper, p0.a, p0.b, p1.b)
        gridStampTriangle(sweeper, p0.a, p1.b, p1.a)
        sweepU = next
        sweeper.stampedU = sweepU
      }
      sweptArea = (sweeper.count * GRID_CELL * GRID_CELL) / AREA_UNIT
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = Math.max(1, Math.round(rect.width))
      height = Math.max(1, Math.round(rect.height))
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      base.setTransform(dpr, 0, 0, dpr, 0, 0)
      const k = Math.min(width * 0.9, height * 0.82) / 6.3
      // 手机上底栏更高，舞台整体抬一点，上下留白才对称
      view = { cx: width / 2, cy: height * (width < 720 ? 0.43 : 0.46), k }
      // 尖角光晕与曲线外发光都要留边
      const half = 3 * k * 1.04 + 34
      const left = Math.max(0, Math.floor(view.cx - half))
      const top = Math.max(0, Math.floor(view.cy - half))
      stageBox = {
        x: left,
        y: top,
        w: Math.min(width, Math.ceil(view.cx + half)) - left,
        h: Math.min(height, Math.ceil(view.cy + half)) - top,
      }
      bgLayer = null
      envLayer = null
      curveLayer = null
      if (!sweepCanvas) sweepCanvas = document.createElement('canvas')
      sweepCanvas.width = Math.round(width * dpr)
      sweepCanvas.height = Math.round(height * dpr)
      sweepCtx = sweepCanvas.getContext('2d')
      if (sweepCtx) sweepCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
      // 尺寸变了，扫过层按当前进度重盖
      const scene = sceneRef.current
      sweepU = 0
      if (sweeper) {
        sweeper.grid.fill(0)
        sweeper.count = 0
        sweeper.stampedU = 0
      }
      if (scene.method !== 'perron' && scene.u > 0) stampTo(scene.method, scene.u)
    }

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()

    const path = (points: Array<Vec>, close = false) => {
      ctx.beginPath()
      points.forEach((point, index) => {
        const screen = project(view, point)
        if (index === 0) ctx.moveTo(screen.x, screen.y)
        else ctx.lineTo(screen.x, screen.y)
      })
      if (close) ctx.closePath()
    }

    const circle = (center: Vec, radius: number) => {
      const screen = project(view, center)
      ctx.beginPath()
      ctx.arc(screen.x, screen.y, radius * view.k, 0, TAU)
    }

    const line = (from: Vec, to: Vec) => {
      const a = project(view, from)
      const b = project(view, to)
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
    }

    const arcPoints = (center: Vec, radius: number, from: number, to: number, steps = 40) => {
      const points: Array<Vec> = []
      for (let step = 0; step <= steps; step += 1) {
        const angle = from + ((to - from) * step) / steps
        points.push({ x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) })
      }
      return points
    }

    /** 底图：蓝晒图式的深靛底 + 极淡的同心刻度（静态，烘一次） */
    const paintField = () => {
      const glow = ctx.createRadialGradient(
        view.cx,
        view.cy,
        view.k * 0.4,
        view.cx,
        view.cy,
        Math.max(width, height) * 0.82,
      )
      glow.addColorStop(0, '#0d2a48')
      glow.addColorStop(0.45, '#081c31')
      glow.addColorStop(1, '#030a14')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, width, height)

      ctx.save()
      ctx.globalAlpha = 0.5
      ctx.strokeStyle = 'rgba(126, 186, 255, 0.07)'
      ctx.lineWidth = 1
      for (let ring = 1; ring <= 6; ring += 1) {
        circle({ x: 0, y: 0 }, ring * 0.62)
        ctx.stroke()
      }
      ctx.lineWidth = 0.8
      for (let spoke = 0; spoke < 36; spoke += 1) {
        const a = (spoke / 36) * TAU
        const reach = spoke % 3 === 0 ? 3.96 : 3.86
        line({ x: Math.cos(a) * 3.72, y: Math.sin(a) * 3.72 }, { x: Math.cos(a) * reach, y: Math.sin(a) * reach })
        ctx.stroke()
      }
      ctx.restore()
    }

    /** 论文记号当灰尘用：慢慢漂，会呼吸 */
    const dust = (() => {
      const glyphs = [
        'dimH', 'Nδ', 'δ', 'Tδ', '⊂ K', '|E| = 0', 'ε', 'π/8', 'ℝ³', '∂', 'Σ',
        'θ', 'μ', 'sup', '≥ 3', 'log 1/δ', 'A ⊆ ℝⁿ', '∫', 'λ', 'x·ω',
      ]
      const specks: Array<{ glyph: string; x: number; y: number; size: number; drift: number; phase: number }> = []
      let seed = 20250611
      const rand = () => {
        seed = (seed * 1_664_525 + 1_013_904_223) % 4_294_967_296
        return seed / 4_294_967_296
      }
      for (let index = 0; index < 46; index += 1) {
        const radius = 0.5 + rand() * 3.4
        const angle = rand() * TAU
        specks.push({
          glyph: glyphs[index % glyphs.length],
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          size: 0.1 + rand() * 0.11,
          drift: 0.1 + rand() * 0.22,
          phase: rand() * TAU,
        })
      }
      return specks
    })()

    const paintDust = (scene: Scene) => {
      if (scene.dust < 0.01) return
      ctx.save()
      ctx.globalAlpha = scene.dust
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (const speck of dust) {
        const bob = Math.sin(scene.time * speck.drift + speck.phase) * 0.09
        const sway = Math.cos(scene.time * speck.drift * 0.7 + speck.phase) * 0.07
        const screen = project(view, { x: speck.x + bob, y: speck.y + sway })
        const twinkle = 0.055 + 0.045 * (0.5 + 0.5 * Math.sin(scene.time * 0.6 + speck.phase))
        ctx.fillStyle = `rgba(168, 214, 255, ${twinkle.toFixed(3)})`
        ctx.font = `${(speck.size * view.k).toFixed(1)}px "Cormorant Garamond", Georgia, serif`
        ctx.fillText(speck.glyph, screen.x, screen.y)
      }
      ctx.restore()
    }

    /** 圆盘方法的边界：虚线圆 + 中点支点 */
    const paintDiskBoundary = (scene: Scene) => {
      const center = project(view, { x: 0, y: 0 })
      const radius = (NEEDLE_LEN / 2) * view.k
      ctx.save()
      ctx.setLineDash([5, 7])
      ctx.strokeStyle = 'rgba(150, 205, 255, 0.4)'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.arc(center.x, center.y, radius, 0, TAU)
      ctx.stroke()
      ctx.setLineDash([])

      const pulse = 0.75 + 0.25 * Math.sin(scene.time * 2.4)
      const dot = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, 10)
      dot.addColorStop(0, `rgba(255, 244, 220, ${0.95 * pulse})`)
      dot.addColorStop(0.4, `rgba(255, 210, 140, ${0.6 * pulse})`)
      dot.addColorStop(1, 'rgba(255, 180, 96, 0)')
      ctx.fillStyle = dot
      ctx.beginPath()
      ctx.arc(center.x, center.y, 10, 0, TAU)
      ctx.fill()
      ctx.restore()
    }

    /** 莱洛方法的边界：三条弧 + 虚线三角形 + 支点高亮 + 已描出的弧 */
    const paintReuleauxBoundary = (scene: Scene) => {
      const u = Math.min(scene.u, 1)
      const phaseIndex = Math.min(2, Math.floor(Math.min(0.999_999, u) * 3))
      ctx.save()

      // 虚线等边三角形
      ctx.setLineDash([4, 6])
      ctx.strokeStyle = 'rgba(150, 205, 255, 0.28)'
      ctx.lineWidth = 1
      path([REU_A, REU_B, REU_C], true)
      ctx.stroke()
      ctx.setLineDash([])

      // 三条边界弧
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.shadowColor = 'rgba(118, 196, 255, 0.65)'
      ctx.shadowBlur = 16
      ctx.strokeStyle = 'rgba(214, 238, 255, 0.6)'
      ctx.lineWidth = 2.6
      for (const arc of REU_ARCS) {
        path(arcPoints(arc.center, NEEDLE_LEN, arc.from, arc.to))
        ctx.stroke()
      }
      ctx.shadowBlur = 0

      // 已被针尖描过的弧：暖色描边，一段段长出来
      ctx.strokeStyle = 'rgba(255, 206, 138, 0.85)'
      ctx.lineWidth = 2
      for (let index = 0; index <= phaseIndex; index += 1) {
        const arc = REU_ARCS[index]
        const done = index < phaseIndex || u >= 0.999_999
        const to = done ? arc.to : arc.from + ((arc.to - arc.from) * (u * 3 - index))
        path(arcPoints(arc.center, NEEDLE_LEN, arc.from, to))
        ctx.stroke()
      }

      // 三个顶点；当前支点亮起来（描弧顺序是 A → C → B）
      const vertices = [REU_A, REU_C, REU_B]
      for (let index = 0; index < 3; index += 1) {
        const vertex = vertices[index]
        const active = index === phaseIndex && u < 0.999_999
        const screen = project(view, vertex)
        if (active) {
          const pulse = 0.7 + 0.3 * Math.sin(scene.time * 3.2)
          const glow = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, 15)
          glow.addColorStop(0, `rgba(255, 240, 210, ${0.9 * pulse})`)
          glow.addColorStop(0.4, `rgba(255, 205, 130, ${0.45 * pulse})`)
          glow.addColorStop(1, 'rgba(255, 180, 96, 0)')
          ctx.fillStyle = glow
          ctx.beginPath()
          ctx.arc(screen.x, screen.y, 15, 0, TAU)
          ctx.fill()
        }
        ctx.fillStyle = active ? 'rgba(255, 244, 220, 0.98)' : 'rgba(190, 222, 255, 0.65)'
        ctx.beginPath()
        ctx.arc(screen.x, screen.y, active ? 4 : 3, 0, TAU)
        ctx.fill()
      }
      ctx.restore()
    }

    /** 定圆：deltoid 的三个尖角都落在它上面 */
    const paintFixedCircle = (alpha: number) => {
      if (alpha < 0.01) return
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.setLineDash([3, 7])
      ctx.strokeStyle = 'rgba(150, 205, 255, 0.3)'
      ctx.lineWidth = 1
      circle({ x: 0, y: 0 }, 3)
      ctx.stroke()
      ctx.restore()
    }

    /** 所有针的族 = 曲线的切线族，叠起来就是曲线本身（静态，烘一次） */
    const paintEnvelope = () => {
      ctx.save()
      ctx.strokeStyle = 'rgba(146, 206, 255, 0.13)'
      ctx.lineWidth = 0.7
      const count = 132
      for (let index = 0; index < count; index += 1) {
        const s = (index / count) * Math.PI
        const { a, b } = needleDeltoid(s)
        line(a, b)
        ctx.stroke()
      }
      ctx.restore()
    }

    const deltoidPoints = (progress: number) => {
      const total = 300
      const span = Math.max(2, Math.round(total * clamp(progress, 0, 1)))
      const points: Array<Vec> = []
      for (let index = 0; index <= span; index += 1) {
        points.push(deltoid((index / total) * TAU))
      }
      return points
    }

    const paintDeltoid = (progress: number) => {
      if (progress < 0.02) return
      const points = deltoidPoints(progress)

      if (progress > 0.98) {
        ctx.save()
        const center = project(view, { x: 0, y: 0 })
        const wash = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, view.k * 3)
        wash.addColorStop(0, 'rgba(96, 176, 255, 0.16)')
        wash.addColorStop(0.6, 'rgba(70, 140, 220, 0.07)')
        wash.addColorStop(1, 'rgba(40, 90, 160, 0)')
        ctx.fillStyle = wash
        path(points, true)
        ctx.fill()
        ctx.restore()
      }

      ctx.save()
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.shadowColor = 'rgba(118, 196, 255, 0.75)'
      ctx.shadowBlur = 22
      ctx.strokeStyle = 'rgba(214, 238, 255, 0.55)'
      ctx.lineWidth = 3.4
      path(points)
      ctx.stroke()
      ctx.shadowBlur = 8
      ctx.strokeStyle = 'rgba(240, 250, 255, 0.96)'
      ctx.lineWidth = 1.5
      path(points)
      ctx.stroke()
      ctx.restore()

      if (progress < 0.995) {
        const tip = project(view, deltoid(progress * TAU))
        const spark = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, 16)
        spark.addColorStop(0, 'rgba(255, 255, 255, 0.95)')
        spark.addColorStop(0.35, 'rgba(170, 220, 255, 0.6)')
        spark.addColorStop(1, 'rgba(120, 190, 255, 0)')
        ctx.fillStyle = spark
        ctx.beginPath()
        ctx.arc(tip.x, tip.y, 16, 0, TAU)
        ctx.fill()
      }

      if (progress > 0.34) {
        for (let cusp = 0; cusp < 3; cusp += 1) {
          const t = (cusp * TAU) / 3
          if (progress < t / TAU) continue
          const screen = project(view, deltoid(t))
          const flare = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, 13)
          flare.addColorStop(0, 'rgba(255, 255, 255, 0.9)')
          flare.addColorStop(0.4, 'rgba(160, 215, 255, 0.42)')
          flare.addColorStop(1, 'rgba(120, 190, 255, 0)')
          ctx.fillStyle = flare
          ctx.beginPath()
          ctx.arc(screen.x, screen.y, 13, 0, TAU)
          ctx.fill()
        }
      }
    }

    /** 三个小圆在大圆里滚：半径恰好是大圆的三分之一 */
    const paintRollers = (scene: Scene) => {
      if (scene.rollers < 0.02) return
      ctx.save()
      ctx.globalAlpha = scene.rollers
      const phase = scene.curve < 0.995 ? scene.curve * TAU : scene.time * 0.32
      for (let copy = 0; copy < 3; copy += 1) {
        const t = phase + (copy * TAU) / 3
        const center = rollerCenter(t)
        const pen = deltoid(t)

        ctx.strokeStyle = 'rgba(178, 220, 255, 0.34)'
        ctx.lineWidth = 1.1
        circle(center, 1)
        ctx.stroke()

        ctx.strokeStyle = 'rgba(178, 220, 255, 0.14)'
        ctx.lineWidth = 0.8
        for (let spoke = 0; spoke < 9; spoke += 1) {
          const a = -2 * t + (spoke / 9) * TAU
          line(center, { x: center.x + Math.cos(a), y: center.y + Math.sin(a) })
          ctx.stroke()
        }

        ctx.strokeStyle = 'rgba(226, 244, 255, 0.42)'
        ctx.lineWidth = 1.2
        line(center, pen)
        ctx.stroke()

        const screen = project(view, pen)
        const dot = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, 9)
        dot.addColorStop(0, 'rgba(255, 255, 255, 1)')
        dot.addColorStop(0.4, 'rgba(190, 230, 255, 0.7)')
        dot.addColorStop(1, 'rgba(140, 200, 255, 0)')
        ctx.fillStyle = dot
        ctx.beginPath()
        ctx.arc(screen.x, screen.y, 9, 0, TAU)
        ctx.fill()

        const hub = project(view, center)
        ctx.fillStyle = 'rgba(214, 238, 255, 0.55)'
        ctx.beginPath()
        ctx.arc(hub.x, hub.y, 1.8, 0, TAU)
        ctx.fill()
      }
      ctx.restore()
    }

    /** 针本体：冷蓝场里唯一的暖色 */
    const paintNeedle = (from: Vec, to: Vec, glow: number) => {
      const a = project(view, from)
      const b = project(view, to)

      ctx.save()
      ctx.lineCap = 'round'
      ctx.shadowColor = `rgba(255, 178, 96, ${0.55 * glow})`
      ctx.shadowBlur = 26 * glow
      ctx.strokeStyle = `rgba(255, 196, 120, ${0.34 * glow})`
      ctx.lineWidth = 7
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()

      const shaft = ctx.createLinearGradient(a.x, a.y, b.x, b.y)
      shaft.addColorStop(0, 'rgba(255, 250, 238, 0.98)')
      shaft.addColorStop(0.5, 'rgba(255, 214, 152, 1)')
      shaft.addColorStop(1, 'rgba(255, 244, 224, 0.98)')
      ctx.shadowBlur = 10 * glow
      ctx.strokeStyle = shaft
      ctx.lineWidth = 2.4
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
      ctx.restore()

      for (const end of [a, b]) {
        const bead = ctx.createRadialGradient(end.x, end.y, 0, end.x, end.y, 8)
        bead.addColorStop(0, 'rgba(255, 255, 255, 1)')
        bead.addColorStop(0.35, 'rgba(255, 222, 168, 0.85)')
        bead.addColorStop(1, 'rgba(255, 180, 96, 0)')
        ctx.fillStyle = bead
        ctx.beginPath()
        ctx.arc(end.x, end.y, 8, 0, TAU)
        ctx.fill()
      }
    }

    /** 切点 + 「这段永远一样长」的端记号 */
    const paintChordMarks = (from: Vec, to: Vec, touch: Vec, alpha: number) => {
      if (alpha < 0.02) return
      ctx.save()
      ctx.globalAlpha = alpha
      const a = project(view, from)
      const b = project(view, to)
      const dx = b.x - a.x
      const dy = b.y - a.y
      const len = Math.hypot(dx, dy) || 1
      const nx = -dy / len
      const ny = dx / len
      ctx.strokeStyle = 'rgba(255, 232, 190, 0.75)'
      ctx.lineWidth = 1.2
      for (const end of [a, b]) {
        ctx.beginPath()
        ctx.moveTo(end.x - nx * 7, end.y - ny * 7)
        ctx.lineTo(end.x + nx * 7, end.y + ny * 7)
        ctx.stroke()
      }

      const mid = { x: (a.x + b.x) / 2 + nx * 18, y: (a.y + b.y) / 2 + ny * 18 }
      ctx.fillStyle = 'rgba(255, 232, 190, 0.82)'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = `${Math.max(11, view.k * 0.1).toFixed(0)}px ui-monospace, Menlo, monospace`
      ctx.fillText('4r', mid.x, mid.y)

      const point = project(view, touch)
      ctx.strokeStyle = 'rgba(150, 220, 255, 0.9)'
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.arc(point.x, point.y, 5.5, 0, TAU)
      ctx.stroke()
      ctx.restore()
    }

    /**
     * 转角量角器：贴着定圆外沿的半圈刻度。
     * 数学角 0 投影到正上方、π 投影到正下方，弧的端点方向就是针当前的指向。
     */
    const GAUGE_R = 3.12

    const gaugePoint = (angle: number, radius = GAUGE_R) =>
      project(view, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius })

    const gaugeArc = (from: number, to: number) => {
      ctx.beginPath()
      const steps = 72
      for (let step = 0; step <= steps; step += 1) {
        const point = gaugePoint(from + ((to - from) * step) / steps)
        if (step === 0) ctx.moveTo(point.x, point.y)
        else ctx.lineTo(point.x, point.y)
      }
    }

    const paintTurnGauge = (scene: Scene, alpha: number) => {
      if (alpha < 0.02) return
      const swept = clamp(scene.turned, 0, Math.PI)
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.lineCap = 'butt'

      ctx.strokeStyle = 'rgba(198, 226, 255, 0.28)'
      for (let tick = 0; tick <= 12; tick += 1) {
        const angle = (tick / 12) * Math.PI
        const long = tick === 0 || tick === 12
        const inner = gaugePoint(angle, GAUGE_R - (long ? 0.16 : 0.07))
        const outer = gaugePoint(angle, GAUGE_R)
        ctx.lineWidth = long ? 1.6 : 0.9
        ctx.beginPath()
        ctx.moveTo(inner.x, inner.y)
        ctx.lineTo(outer.x, outer.y)
        ctx.stroke()
      }

      ctx.lineCap = 'round'
      ctx.strokeStyle = 'rgba(198, 226, 255, 0.2)'
      ctx.lineWidth = 1.4
      gaugeArc(0, Math.PI)
      ctx.stroke()

      if (swept > 0.015) {
        ctx.strokeStyle = 'rgba(255, 206, 138, 0.72)'
        ctx.lineWidth = 2.2
        gaugeArc(0, swept)
        ctx.stroke()
        const head = gaugePoint(swept)
        ctx.fillStyle = 'rgba(255, 240, 214, 0.9)'
        ctx.beginPath()
        ctx.arc(head.x, head.y, 2.6, 0, TAU)
        ctx.fill()
      }
      ctx.restore()
    }

    /** 掉头完成：把扫过面积的公式与数值戴上舞台 */
    const paintCompletionNumber = (scene: Scene, alpha: number) => {
      if (alpha < 0.02 || scene.method === 'perron') return
      const method = scene.method as RegionMethod
      const screen = project(view, METHOD_ANCHOR[method])
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = 'rgba(3, 10, 20, 0.9)'
      ctx.shadowBlur = 14
      ctx.fillStyle = 'rgba(226, 240, 255, 0.66)'
      ctx.font = `${Math.max(11, view.k * 0.115).toFixed(0)}px ui-monospace, Menlo, monospace`
      ctx.fillText(tx('扫过面积'), screen.x, screen.y - view.k * 0.42)
      ctx.fillStyle = 'rgba(255, 226, 178, 0.98)'
      ctx.font = `600 ${(view.k * 0.44).toFixed(0)}px "Cormorant Garamond", Georgia, serif`
      ctx.fillText(METHOD_FORMULA[method], screen.x, screen.y)
      ctx.fillStyle = 'rgba(255, 226, 178, 0.75)'
      ctx.font = `${Math.max(12, view.k * 0.13).toFixed(0)}px ui-monospace, Menlo, monospace`
      ctx.fillText(`≈ ${METHOD_AREA[method].toFixed(3)}`, screen.x, screen.y + view.k * 0.38)
      ctx.restore()
    }

    /* ---------------- 细条构造（perron） ---------------- */

    const rotatePoint = (p: Vec, angle: number): Vec => ({
      x: p.x * Math.cos(angle) - p.y * Math.sin(angle),
      y: p.x * Math.sin(angle) + p.y * Math.cos(angle),
    })

    const paintSliverSet = (slivers: Array<Sliver>, rot: number, alpha: number, withNeedles: boolean, warm = false) => {
      if (alpha < 0.02) return
      ctx.save()
      ctx.globalAlpha = alpha
      const fill = warm ? 'rgba(255, 205, 130, 0.16)' : 'rgba(120, 190, 255, 0.13)'
      const stroke = warm ? 'rgba(255, 220, 170, 0.42)' : 'rgba(178, 222, 255, 0.3)'
      for (const sliver of slivers) {
        const apex = rotatePoint({ x: APEX_X, y: sliver.apexY }, rot)
        const baseLow = rotatePoint({ x: BASE_X, y: sliver.baseLow }, rot)
        const baseHigh = rotatePoint({ x: BASE_X, y: sliver.baseHigh }, rot)
        path([apex, baseLow, baseHigh], true)
        ctx.fillStyle = fill
        ctx.fill()
        ctx.strokeStyle = stroke
        ctx.lineWidth = 0.7
        ctx.stroke()

        if (withNeedles) {
          const baseMid = rotatePoint({ x: BASE_X, y: (sliver.baseLow + sliver.baseHigh) / 2 }, rot)
          const a = project(view, apex)
          const b = project(view, baseMid)
          ctx.strokeStyle = 'rgba(255, 208, 140, 0.6)'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
      }
      ctx.restore()
    }

    /** 切推阶段：三角形碎成细条滑到一起，方向一根不少，面积一路掉 */
    const paintConstruction = (depth: number, slide: number, alpha: number) => {
      if (alpha < 0.02) return
      ctx.save()
      ctx.globalAlpha = alpha

      // 起点三角形的轮廓留着当参照，看得出面积掉了多少
      ctx.setLineDash([4, 6])
      ctx.strokeStyle = 'rgba(255, 200, 130, 0.32)'
      ctx.lineWidth = 1
      path(
        [
          { x: APEX_X, y: 0 },
          { x: BASE_X, y: -BASE_HALF },
          { x: BASE_X, y: BASE_HALF },
        ],
        true,
      )
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()

      paintSliverSet(buildSlivers(depth, slide), 0, alpha, depth <= 2)
    }

    /**
     * 换轨演示：针沿细条滑到交叉点附近 → 小转一个细条夹角 → 滑进下一根。
     * 15 次换轨扫完约 57° 扇面；蒙太奇阶段两片幽灵树林转进来，凑满 180°。
     */
    const paintHopDemo = (scene: Scene, demoT: number, depth: number, slide: number) => {
      const loopT = demoT % DEMO_LOOP
      const fadeIn = clamp(loopT / DEMO_FADE_DUR, 0, 1)
      const hopsT = loopT - DEMO_FADE_DUR
      const montageT = clamp((loopT - DEMO_FADE_DUR - DEMO_HOPS * DEMO_HOP_DUR) / MONTAGE_DUR, 0, 1)
      const inMontage = montageT > 0
      const cross = demoCross(slide)

      paintSliverSet(buildSlivers(depth, slide), 0, fadeIn, false)

      // 幽灵树林：±60° 两片，蒙太奇时转进来（暖色，区别于主树林）
      if (inMontage) {
        const ghostAlpha = smooth(clamp(montageT * 1.6, 0, 1)) * 0.85 * fadeIn
        paintSliverSet(buildSlivers(depth, slide), Math.PI / 3, ghostAlpha, false, true)
        paintSliverSet(buildSlivers(depth, slide), -Math.PI / 3, ghostAlpha, false, true)
      }

      // 针的位置与累计转角
      let center = demoHome(demoC(0), slide)
      let angle = demoAngle(demoC(0))
      let turned = 0
      let switchPulse = 0
      let needleAlpha = fadeIn

      if (hopsT > 0 && !inMontage) {
        const hop = Math.min(DEMO_HOPS - 1, Math.floor(hopsT / DEMO_HOP_DUR))
        const ph = (hopsT - hop * DEMO_HOP_DUR) / DEMO_HOP_DUR
        const c0 = demoC(hop)
        const c1 = demoC(hop + 1)
        const a0 = demoAngle(c0)
        const a1 = demoAngle(c1)
        const home0 = demoHome(c0, slide)
        const home1 = demoHome(c1, slide)
        const pivot0 = demoPivot(c0, slide)
        const { offset: offset0 } = demoPivotParam(c0, slide)
        const axis1 = demoAxis(c1, slide)
        // 绕交叉点转过去后，交叉点在针上的相对位置不变
        const arrive1 = { x: cross.x + axis1.ux * offset0, y: cross.y + axis1.uy * offset0 }
        turned = DEMO_TURN_PREFIX[hop]
        if (ph < 0.3) {
          const s = smooth(ph / 0.3)
          center = { x: home0.x + (pivot0.x - home0.x) * s, y: home0.y + (pivot0.y - home0.y) * s }
          angle = a0
        } else if (ph < 0.7) {
          const s = smooth((ph - 0.3) / 0.4)
          center = pivot0
          angle = a0 + (a1 - a0) * s
          turned += Math.abs(angle - a0)
          switchPulse = Math.sin(s * Math.PI)
        } else {
          const s = smooth((ph - 0.7) / 0.3)
          center = { x: arrive1.x + (home1.x - arrive1.x) * s, y: arrive1.y + (home1.y - arrive1.y) * s }
          angle = a1
          turned = DEMO_TURN_PREFIX[hop + 1]
        }
      } else if (inMontage) {
        turned = DEMO_TURN_TOTAL + (Math.PI - DEMO_TURN_TOTAL) * smooth(montageT)
        needleAlpha = fadeIn * (1 - smooth(clamp(montageT * 1.8, 0, 1)))
        const last = demoC(DEMO_TRACKS - 1)
        center = demoHome(last, slide)
        angle = demoAngle(last)
      }
      scene.turned = turned

      if (needleAlpha > 0.02) {
        ctx.save()
        ctx.globalAlpha = needleAlpha
        const ux = Math.cos(angle)
        const uy = Math.sin(angle)
        const half = NEEDLE_LEN / 2
        paintNeedle(
          { x: center.x - ux * half, y: center.y - uy * half },
          { x: center.x + ux * half, y: center.y + uy * half },
          1,
        )
        ctx.restore()
      }

      // 交叉点脉冲：换轨的那一下
      if (switchPulse > 0.01) {
        const spot = project(view, cross)
        const pulse = ctx.createRadialGradient(spot.x, spot.y, 0, spot.x, spot.y, 30)
        pulse.addColorStop(0, `rgba(255, 236, 200, ${(0.55 * switchPulse).toFixed(3)})`)
        pulse.addColorStop(0.5, `rgba(255, 196, 120, ${(0.22 * switchPulse).toFixed(3)})`)
        pulse.addColorStop(1, 'rgba(255, 180, 96, 0)')
        ctx.fillStyle = pulse
        ctx.beginPath()
        ctx.arc(spot.x, spot.y, 30, 0, TAU)
        ctx.fill()
      }

      // 蒙太奇字幕（自由模式；故事模式由 GuideTour 说）
      if (inMontage && scene.beat === 0) {
        const spot = project(view, { x: 2.75, y: 0 })
        ctx.save()
        ctx.globalAlpha = clamp(montageT * 2, 0, 1)
        ctx.fillStyle = 'rgba(226, 240, 255, 0.85)'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.font = `${Math.max(12, view.k * 0.14).toFixed(0)}px "Cormorant Garamond", Georgia, serif`
        ctx.shadowColor = 'rgba(3, 10, 20, 0.9)'
        ctx.shadowBlur = 12
        ctx.fillText(tx('三片树林，各管 60° 的扇面'), spot.x, spot.y)
        ctx.restore()
      }
    }

    const paintFrame = (now: number) => {
      const scene = sceneRef.current
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016
      last = now
      frames += 1
      scene.time += dt

      const inStory = scene.beat > 0
      const isPerronScene = scene.method === 'perron'
      const layers = layersRef.current
      scene.fade = approach(scene.fade, 1, 1 - Math.pow(0.0001, dt))

      // 图层目标
      const targets = {
        rollers: inStory
          ? (scene.beat === 3 ? 1 : scene.beat === 4 ? 0.25 : 0)
          : !isPerronScene && scene.method === 'deltoid' && layers.rollers ? 0.9 : 0,
        envelope: inStory
          ? (scene.beat === 7 ? 1 : 0)
          : !isPerronScene && scene.method === 'deltoid' && layers.envelope ? 1 : 0,
        dust: inStory ? (scene.beat >= 5 ? 0.85 : 0.5) : 1,
      }
      const ease = 1 - Math.pow(0.001, dt)
      scene.rollers = approach(scene.rollers, targets.rollers, ease)
      scene.envelope = approach(scene.envelope, targets.envelope, ease)
      scene.dust = approach(scene.dust, targets.dust, ease)

      if (!isPerronScene) {
        // 第 3 幕：曲线跟着滚圆慢慢画出来；针在已成形的轨道上慢慢骑
        if (inStory && scene.beat === 3) {
          scene.curve = clamp(scene.curve + dt / 9, 0, 1)
          scene.u = (scene.u + dt / 14) % 1
          scene.turned = scene.u * Math.PI
        } else if (inStory && scene.beat === 7) {
          scene.curve = approach(scene.curve, 1, ease)
          scene.u = 1
          scene.turned = Math.PI
        } else {
          scene.curve = approach(scene.curve, 1, ease)
          // 区域方法的掉头循环：扫过去 → 停留读数 → 淡出 → 再来
          const turnDur = inStory ? 5.8 : 7
          const holding = scene.u >= 1
          if (scene.playing) {
            if (!holding) {
              scene.u = Math.min(1, scene.u + dt / turnDur)
              if (scene.u >= 1) {
                scene.holdT = 0
                if (!finishedRef.current) {
                  finishedRef.current = true
                  finishRef.current()
                }
              }
            } else {
              scene.holdT += dt
              if (scene.holdT > 2.6 + 0.9) {
                scene.u = 0
                scene.holdT = 0
              }
            }
          }
          scene.turned = scene.u * Math.PI
        }
        stampTo(scene.method as RegionMethod, Math.min(scene.u, 1))
      } else {
        // 细条构造：先切推，再循环换轨演示
        if (scene.playing) scene.codaTime += dt
      }

      /* ---------------- 绘制 ---------------- */
      const fullBox: Box = { x: 0, y: 0, w: width, h: height }
      if (!bgLayer) bgLayer = bakeLayer(fullBox, paintField)
      if (!envLayer) envLayer = bakeLayer(stageBox, paintEnvelope)
      if (!curveLayer) curveLayer = bakeLayer(stageBox, () => paintDeltoid(1))

      if (bgLayer) ctx.drawImage(bgLayer, 0, 0, width, height)
      else ctx.clearRect(0, 0, width, height)
      paintDust(scene)

      if (!isPerronScene) {
        const region = scene.method as RegionMethod
        ctx.save()
        ctx.globalAlpha = scene.fade

        // 区域边界
        if (region === 'disk') paintDiskBoundary(scene)
        else if (region === 'reuleaux') paintReuleauxBoundary(scene)
        else {
          paintFixedCircle(scene.fade * (inStory && scene.beat >= 4 ? 0.5 : 1))
          if (scene.curve > 0.995 && curveLayer) blit(curveLayer, stageBox, 1)
          else paintDeltoid(scene.curve)
          paintRollers(scene)
          if (envLayer) blit(envLayer, stageBox, scene.envelope)
        }

        // 扫过层：掉头循环的停留尾声淡出；构造幕与终幕压低
        const holdingNow = scene.u >= 1 && scene.playing
        const sweepFade = holdingNow && scene.holdT > 2.6
          ? clamp(1 - (scene.holdT - 2.6) / 0.9, 0, 1)
          : 1
        const sweepAlpha = inStory
          ? scene.beat === 3
            ? 0
            : scene.beat === 7
              ? 0.3
              : 0.5
          : 0.5
        if (sweepCanvas && sweepU > 0 && sweepFade > 0.01 && sweepAlpha > 0.01) {
          ctx.save()
          ctx.globalAlpha = sweepAlpha * sweepFade * scene.fade
          ctx.drawImage(sweepCanvas, 0, 0, width, height)
          ctx.restore()
        }

        // 针
        const needle = regionNeedle(region, Math.min(scene.u, 1))
        paintNeedle(needle.a, needle.b, 1)
        if (region === 'deltoid') {
          const { a, b, touch } = needleDeltoid(Math.min(scene.u, 1) * Math.PI)
          paintChordMarks(a, b, touch, inStory ? (scene.beat === 3 ? 1 : 0.35) : 0.45)
        }

        paintTurnGauge(scene, scene.fade)

        // 完成读数：掉头走满且允许登台时（暂停拖到终点也直接显示）
        const numberAlpha = scene.numberOk && scene.u >= 0.995
          ? scene.playing
            ? clamp((scene.holdT - 0.15) / 0.6, 0, 1) * (scene.holdT > 2.6 ? sweepFade : 1)
            : 1
          : 0
        paintCompletionNumber(scene, numberAlpha)
        ctx.restore()
      } else {
        // 细条构造
        const ct = Math.min(scene.codaTime, CONS_DUR)
        const round = Math.min(CODA_ROUND_SLIDES.length - 1, Math.floor(ct / CODA_ROUND_DUR))
        const from = round === 0 ? 0 : CODA_ROUND_SLIDES[round - 1]
        const to = CODA_ROUND_SLIDES[round]
        const phase = clamp((ct - round * CODA_ROUND_DUR) / CODA_ROUND_DUR, 0, 1)
        const push = clamp((phase - 0.12) / 0.78, 0, 1)
        const consDepth = round + 1
        const consSlide = from + (to - from) * smooth(push)
        const demoT = scene.codaTime - CONS_DUR
        const inDemo = demoT >= 0

        ctx.save()
        ctx.globalAlpha = scene.fade
        if (!inDemo) {
          scene.turned = 0
          paintConstruction(consDepth, consSlide, 1)
        } else {
          const demoFade = clamp(demoT / DEMO_FADE_DUR, 0, 1)
          paintConstruction(CODA_MAX_DEPTH, CODA_ROUND_SLIDES[CODA_MAX_DEPTH - 1], 1 - demoFade)
          paintHopDemo(scene, Math.max(0, demoT), DEMO_DEPTH, DEMO_SLIDE)
          paintTurnGauge(scene, demoFade)
        }
        ctx.restore()
      }

      hudClock += dt
      if (hudClock > 0.1) {
        hudClock = 0
        const sceneNow = sceneRef.current
        const isPerronNow = sceneNow.method === 'perron'
        let treeArea = AREA_TRIANGLE
        let round = 0
        let demoPhase: 'build' | 'hop' | 'montage' | 'hold' = 'build'
        if (isPerronNow) {
          const demoT = sceneNow.codaTime - CONS_DUR
          if (demoT < 0) {
            const ct = Math.min(sceneNow.codaTime, CONS_DUR)
            round = Math.min(CODA_ROUND_SLIDES.length - 1, Math.floor(ct / CODA_ROUND_DUR))
            const from = round === 0 ? 0 : CODA_ROUND_SLIDES[round - 1]
            const to = CODA_ROUND_SLIDES[round]
            const ph2 = clamp((ct - round * CODA_ROUND_DUR) / CODA_ROUND_DUR, 0, 1)
            const push = clamp((ph2 - 0.12) / 0.78, 0, 1)
            treeArea = sliverUnionArea(buildSlivers(round + 1, from + (to - from) * smooth(push)))
          } else {
            round = CODA_ROUND_SLIDES.length - 1
            treeArea = sliverUnionArea(buildSlivers(DEMO_DEPTH, DEMO_SLIDE))
            const loopT = demoT % DEMO_LOOP
            demoPhase = loopT < DEMO_FADE_DUR + DEMO_HOPS * DEMO_HOP_DUR
              ? 'hop'
              : loopT < DEMO_FADE_DUR + DEMO_HOPS * DEMO_HOP_DUR + MONTAGE_DUR
                ? 'montage'
                : 'hold'
          }
        }
        setHud({
          degrees: Math.round((clamp(sceneNow.turned, 0, Math.PI) * 180) / Math.PI),
          swept: sweptArea,
          done: !isPerronNow && sceneNow.u >= 1,
          scrub: Math.min(sceneNow.u, 1) * Math.PI,
          treeArea,
          round,
          demoPhase,
        })
        canvas.dataset.debug = JSON.stringify({
          frames,
          beat: sceneNow.beat,
          method: sceneNow.method,
          u: Number(sceneNow.u.toFixed(2)),
          turned: Number(((sceneNow.turned * 180) / Math.PI).toFixed(1)),
        })
      }
    }

    const render = (now: number) => {
      frame = window.requestAnimationFrame(render)
      try {
        paintFrame(now)
      } catch (error) {
        console.error('[kakeya-needle] render failed', error)
      }
    }

    frame = window.requestAnimationFrame(render)
    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(frame)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [false])

  const guideSteps = useMemo<Array<GuideStep>>(
    () => KakeyaStoryChapters.map((chapter, index) => {
      const beatNumber = index + 1
      const replay = () => openBeat(beatNumber)
      return {
        title: tx(chapter.title),
        body: tx(chapter.body),
        action: replay,
        replay,
        durationMs: [11_000, 11_000, 11_000, 11_500, 11_000, 12_500, 10_000][index] ?? 10_000,
      }
    }),
    [openBeat, tx],
  )

  const regionMethod = isPerron ? null : (method as RegionMethod)
  const plaque = PLAQUE[method]
  const status = hud.done ? '掉头完成' : '掉头中'
  const perronStatus = hud.demoPhase === 'build'
    ? '切碎推拢中'
    : hud.demoPhase === 'hop'
      ? '换轨掉头中'
      : hud.demoPhase === 'montage'
        ? '三片树林轮换'
        : '掉头完成'

  return (
    <div className={`oss-experience kak-experience${storyMode ? ' is-story' : ' is-free'}`}>
      <canvas
        ref={canvasRef}
        className="kak-canvas"
        aria-label={tx('一根针在四种区域里掉头：圆盘、莱洛三角、曲边三角与细条构造')}
        onPointerDown={() => {
          controls.registerInteraction()
        }}
      />

      {!storyMode && (
        <header className="kak-plaque" data-experience-overlay="true">
          <h1>{tx(plaque.title)}</h1>
          <strong>{tx(plaque.strong)}</strong>
          <p className="kak-plaque-takeaway">{tx(plaque.takeaway)}</p>
        </header>
      )}

      {storyMode && beat === 0 && (
        <header className="kak-plaque kak-plaque-story" data-experience-overlay="true">
          <h1>{tx('一根针掉头')}</h1>
          <p>{tx('最少需要多大地方？')}</p>
        </header>
      )}

      {!storyMode && !isPerron && regionMethod && (
        <aside className="kak-readout" data-experience-overlay="true" data-freebar-clearance="true" aria-live="polite">
          <div className={`kak-readout-status${hud.done ? ' is-done' : ''}`}>{tx(status)}</div>
          <div className="kak-readout-row">
            <small>{tx('已转过')}</small>
            <strong>{hud.degrees}°</strong>
          </div>
          <div className="kak-readout-row">
            <small>{tx('已扫过')}</small>
            <strong>{hud.done ? METHOD_AREA[regionMethod].toFixed(3) : `≈ ${hud.swept.toFixed(3)}`}</strong>
          </div>
          <div className="kak-readout-row is-area">
            <small>{tx('区域面积')}</small>
            <strong>{METHOD_FORMULA[regionMethod]} ≈ {METHOD_AREA[regionMethod].toFixed(3)}</strong>
          </div>
          <div className="kak-compare" role="presentation">
            <small>{tx('面积对照 · 针长 = 1')}</small>
            {COMPARE_ROWS.map((row) => (
              <div
                key={row.key}
                className={`kak-compare-row${method === row.key ? ' is-on' : ''}`}
              >
                <span>{tx(row.label)}</span>
                <i style={{ width: `${(row.area / AREA_DISK) * 100}%` }} />
                <b>{row.area.toFixed(3)}</b>
              </div>
            ))}
            <div className="kak-compare-row">
              <span>{tx('细条')}</span>
              <i style={{ width: '3%' }} />
              <b>→ 0</b>
            </div>
          </div>
        </aside>
      )}

      {!storyMode && isPerron && (
        <aside className="kak-readout" data-experience-overlay="true" data-freebar-clearance="true" aria-live="polite">
          <div className="kak-readout-status">
            {hud.demoPhase === 'build' ? tx(`第 ${hud.round + 1} 轮`) : tx(perronStatus)}
          </div>
          <div className="kak-readout-row">
            <small>{tx('已转过')}</small>
            <strong>{hud.degrees}°</strong>
          </div>
          <div className="kak-readout-row is-area">
            <small>{tx('这片树林')}</small>
            <strong>{hud.treeArea.toFixed(3)}</strong>
          </div>
          <div className="kak-readout-row">
            <small>{tx('掉头要 3 片')}</small>
            <strong>≈ {(hud.treeArea * 3).toFixed(3)}</strong>
          </div>
          <p className="kak-readout-note">{tx('切得越细，这个数越小——没有下限。')}</p>
        </aside>
      )}

      {storyMode && regionMethod && (beat === 1 || beat === 2 || beat === 4) && (
        <aside className="kak-coda-readout" data-experience-overlay="true" aria-live="polite">
          <small>{tx('已扫过')}</small>
          <strong>{hud.done ? METHOD_AREA[regionMethod].toFixed(3) : `≈ ${hud.swept.toFixed(3)}`}</strong>
          <p>{`${METHOD_FORMULA[regionMethod]} ≈ ${METHOD_AREA[regionMethod].toFixed(3)}`}</p>
        </aside>
      )}

      {storyMode && (beat === 5 || beat === 6) && (
        <aside className="kak-coda-readout" data-experience-overlay="true" aria-live="polite">
          <small>{tx('这片树林')}</small>
          <strong>{hud.treeArea.toFixed(3)}</strong>
          <em>{tx(`从 ${AREA_TRIANGLE.toFixed(3)} 往下掉`)}</em>
          <p>{tx('掉头要 3 片')} ≈ {(hud.treeArea * 3).toFixed(2)}</p>
          <p className="kak-coda-claim">{tx('切得越细，面积越小——没有下限')}</p>
        </aside>
      )}

      {!storyMode && (
        <Freebar
          className="kak-freebar"
          mainClassName="kak-freebar-main"
          ariaLabel={tx('探索')}
          primaryControlBudget={5}
          secondaryDefault="auto"
          secondary={
            <div className="kak-tray-row">
              {!isPerron ? (
                <label className="kak-freebar-field experience-freebar-field">
                  <span>{tx('掉头进度')}</span>
                  <input
                    className="kak-scrub"
                    type="range"
                    min={0}
                    max={Math.PI}
                    step={0.004}
                    value={scrubOverride ?? hud.scrub}
                    aria-label={tx('拖动看针扫过的面积')}
                    onChange={(event) => {
                      controls.registerInteraction()
                      const next = Number(event.target.value)
                      setScrubOverride(next)
                      setPlaying(false)
                      scrubTo(next)
                    }}
                    onPointerUp={() => setScrubOverride(null)}
                    onPointerCancel={() => setScrubOverride(null)}
                    onBlur={() => setScrubOverride(null)}
                  />
                  <b>{scrubOverride !== null ? Math.round((scrubOverride * 180) / Math.PI) : hud.degrees}°</b>
                </label>
              ) : (
                <button
                  type="button"
                  className="kak-btn kak-replay-perron experience-freebar-reset"
                  onClick={() => {
                    controls.registerInteraction()
                    const scene = sceneRef.current
                    scene.codaTime = 0
                    scene.turned = 0
                    setPlaying(true)
                  }}
                >
                  <ArrowCounterClockwise weight="bold" aria-hidden="true" />
                  <span>{tx('重播演示')}</span>
                </button>
              )}
              {method === 'deltoid' && (
                <div className="kak-layer-toggles" role="group" aria-label={tx('图层')}>
                  <button
                    type="button"
                    className={`kak-chip${showRollers ? ' is-on' : ''}`}
                    onClick={() => {
                      controls.registerInteraction()
                      setShowRollers((value) => !value)
                    }}
                  >
                    {tx('小圆')}
                  </button>
                  <button
                    type="button"
                    className={`kak-chip${showEnvelope ? ' is-on' : ''}`}
                    onClick={() => {
                      controls.registerInteraction()
                      setShowEnvelope((value) => !value)
                    }}
                  >
                    {tx('全方向')}
                  </button>
                </div>
              )}
              <button
                type="button"
                className="experience-freebar-story"
                onClick={() => {
                  controls.registerInteraction()
                  enterStory()
                  replayGuide('kakeya-needle')
                }}
                aria-label={tx('重播故事')}
              >
                <FilmStrip weight="fill" aria-hidden="true" />
                <span>{tx('故事')}</span>
              </button>
            </div>
          }
        >
          <div className="experience-freebar-seg kak-method-seg" role="group" aria-label={tx('切换解法')}>
            {(['disk', 'reuleaux', 'deltoid', 'perron'] as const).map((key) => (
              <button
                key={key}
                type="button"
                className={method === key ? 'is-active' : undefined}
                aria-pressed={method === key}
                onClick={() => {
                  controls.registerInteraction()
                  if (method !== key) setMethod(key)
                }}
              >
                {tx(SEG_LABEL[key])}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="experience-freebar-play"
            data-playing={playing ? 'true' : 'false'}
            aria-label={playing ? tx('暂停') : tx('继续')}
            onClick={() => {
              controls.registerInteraction()
              setPlaying((value) => !value)
            }}
          >
            {playing ? <Pause weight="fill" aria-hidden="true" /> : <Play weight="fill" aria-hidden="true" />}
          </button>
        </Freebar>
      )}

      <GuideTour
        worldId="kakeya-needle"
        steps={guideSteps}
        placement="stage"
        stagePlan={[
          { position: 'top-left', mobilePosition: 'bottom-left', width: 'wide', treatment: 'monumental' },
          { position: 'bottom-left', mobilePosition: 'bottom-left', motion: 'drift-right', width: 'wide', treatment: 'editorial' },
          { position: 'top-right', mobilePosition: 'bottom-center', motion: 'rise', width: 'wide', treatment: 'caption' },
          { position: 'bottom-right', mobilePosition: 'bottom-center', motion: 'drift-left', width: 'wide', treatment: 'editorial' },
          { position: 'top-left', mobilePosition: 'bottom-left', motion: 'fade', width: 'wide', treatment: 'caption' },
          { position: 'bottom-left', mobilePosition: 'bottom-left', motion: 'scale', width: 'wide', treatment: 'editorial' },
          { position: 'top-left', mobilePosition: 'bottom-center', motion: 'fade', width: 'wide', treatment: 'annotation' },
        ]}
        defaultOpen={storyMode}
        showReplayChip={false}
        replayLabel={tx('重播故事')}
        onExit={() => {
          openBeat(0)
          setMethod('deltoid')
          returnToFree()
        }}
      />
      {!storyMode && !isPerron && (
        <GhostHint
          worldId="kakeya-needle"
          gesture={{ type: 'scrub', target: '.kak-scrub', label: tx('拖动看针扫过的面积') }}
        />
      )}
      {!storyMode && isPerron && (
        <GhostHint
          worldId="kakeya-needle-perron"
          gesture={{ type: 'tap', target: '.kak-replay-perron', label: tx('点这里重播切碎与换轨') }}
        />
      )}
    </div>
  )
}
