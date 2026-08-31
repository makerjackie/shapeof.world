/*
 * Catalog copy (for parent wiring into math-signals catalog):
 *
 * id: formula-bloom
 * title: 一万个点被一条公式唤醒，在黑暗里游动
 * posterTitle: 一条公式，怎么变成会呼吸的生物？
 * question: 一串三角公式，怎么长成一只会游的白影？
 * hook: 每个点只是 sin、cos 和距离；合在一起却像一条发光的脊骨在深海里游过。
 * payoff: 参数方程把时间与索引映射到平面；嵌套的周期函数让形状在闭合与开放之间缓慢变形——这就是「公式粒子」生成艺术的核心。
 *
 * provenance: open-source-adaptation spirit of @yuruyurau #つぶやきProcessing
 *   (tweet golfed p5; reimplemented + expanded for Shape of the World)
 */

import './styles/FormulaBloom.css'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { FilmStrip } from '@phosphor-icons/react'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { GuideTour, replayGuide, type GuideStep } from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import { useExperienceI18n } from '~/i18n/experience'
import { cancelWorldFrame, requestWorldFrame } from '~/lib/world-playback'

const WORLD_ID = 'formula-bloom'

/** Original reference particle count (tweet: 1e4). */
const DESKTOP_COUNT = 12_000
const MOBILE_COUNT = 6_500
const PROBE_POSITION = 0.42

/**
 * Coefficient sets that reshape the living form while keeping the same
 * nested sin/cos/mag skeleton from the original tweet code.
 */
type PresetId = 'jellyfish' | 'spine' | 'ribbon'

type FormulaCoeffs = {
  id: PresetId
  label: string
  /** Amplitude of the radial breathing term (orig 4). */
  kAmp: number
  /** Index frequency inside cos for k (orig 1/9). */
  kFreqI: number
  /** Time frequency inside cos for k (orig 2). */
  kFreqT: number
  /** Secondary index frequency for k (orig 1/35). */
  kFreqI2: number
  /** y→e scale (orig 1/7). */
  eScale: number
  /** e vertical offset (orig 13). */
  eOffset: number
  /** d = mag + sinAmp*sin(...) - dOffset (orig 1, 4). */
  dSinAmp: number
  dOffset: number
  /** q = qSin*sin(k*3) - … (orig 2). */
  qSin: number
  /** y-scale inside q (orig 1/35). */
  qYScale: number
  /** Inner product term base (orig 9). */
  qInner: number
  /** Orbital radius around the form (orig 40). */
  orbitR: number
  /** Vertical stretch of d (orig 35). */
  dY: number
  /** Horizontal center bias in original 400-space (orig 200). */
  originX: number
}

const PRESETS: Array<FormulaCoeffs> = [
  {
    id: 'jellyfish',
    label: '水母',
    kAmp: 4,
    kFreqI: 1 / 9,
    kFreqT: 2,
    kFreqI2: 1 / 35,
    eScale: 1 / 7,
    eOffset: 13,
    dSinAmp: 1,
    dOffset: 4,
    qSin: 2,
    qYScale: 1 / 35,
    qInner: 9,
    orbitR: 40,
    dY: 35,
    originX: 200,
  },
  {
    id: 'spine',
    label: '脊骨',
    kAmp: 3.2,
    kFreqI: 1 / 11,
    kFreqT: 1.4,
    kFreqI2: 1 / 28,
    eScale: 1 / 6.2,
    eOffset: 14.5,
    dSinAmp: 0.72,
    dOffset: 3.4,
    qSin: 1.35,
    qYScale: 1 / 42,
    qInner: 11,
    orbitR: 28,
    dY: 42,
    originX: 200,
  },
  {
    id: 'ribbon',
    label: '丝带',
    kAmp: 5.1,
    kFreqI: 1 / 7.5,
    kFreqT: 2.6,
    kFreqI2: 1 / 42,
    eScale: 1 / 8.2,
    eOffset: 12,
    dSinAmp: 1.35,
    dOffset: 4.6,
    qSin: 2.8,
    qYScale: 1 / 30,
    qInner: 7.5,
    orbitR: 52,
    dY: 30,
    originX: 200,
  },
]

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

function mixCoeffs(a: FormulaCoeffs, b: FormulaCoeffs, t: number): FormulaCoeffs {
  const u = clamp(t, 0, 1)
  return {
    id: u < 0.5 ? a.id : b.id,
    label: u < 0.5 ? a.label : b.label,
    kAmp: lerp(a.kAmp, b.kAmp, u),
    kFreqI: lerp(a.kFreqI, b.kFreqI, u),
    kFreqT: lerp(a.kFreqT, b.kFreqT, u),
    kFreqI2: lerp(a.kFreqI2, b.kFreqI2, u),
    eScale: lerp(a.eScale, b.eScale, u),
    eOffset: lerp(a.eOffset, b.eOffset, u),
    dSinAmp: lerp(a.dSinAmp, b.dSinAmp, u),
    dOffset: lerp(a.dOffset, b.dOffset, u),
    qSin: lerp(a.qSin, b.qSin, u),
    qYScale: lerp(a.qYScale, b.qYScale, u),
    qInner: lerp(a.qInner, b.qInner, u),
    orbitR: lerp(a.orbitR, b.orbitR, u),
    dY: lerp(a.dY, b.dY, u),
    originX: lerp(a.originX, b.originX, u),
  }
}

/**
 * Core parametric map — port of @yuruyurau's golfed p5, with coefficient
 * knobs and optional pointer warp. Returns original 400-space coordinates.
 */
type PointTrace = {
  indexY: number
  k: number
  e: number
  d: number
  q: number
  x: number
  y: number
}

function samplePoint(
  i: number,
  t: number,
  c: FormulaCoeffs,
  morph: number,
  warpX: number,
  warpY: number,
  trace?: PointTrace,
): { x: number; y: number } {
  // morph stretches nested frequencies slightly without breaking continuity
  const m = 0.55 + morph * 0.9
  const indexY = i / 235
  const k =
    (c.kAmp + Math.cos(i * c.kFreqI * m - t * c.kFreqT + warpX * 0.9)) *
    Math.cos(i * c.kFreqI2 + warpY * 0.35)
  const e = indexY * c.eScale - c.eOffset
  const d =
    Math.hypot(k, e) + c.dSinAmp * Math.sin(e / 9 + t / 2 + warpX * 0.4) - c.dOffset
  const inner = Math.sin(Math.cos(e) * c.qInner - d * 2 * m + t + warpY)
  const q = c.qSin * Math.sin(k * 3) - indexY * c.qYScale * k * (c.qInner + k * inner)
  const ang = d - t + warpX * 0.15
  const point = {
    x: q + c.orbitR * Math.cos(ang) + c.originX,
    y: q * Math.sin(ang) + d * c.dY,
  }
  if (trace) {
    trace.indexY = indexY
    trace.k = k
    trace.e = e
    trace.d = d
    trace.q = q
    trace.x = point.x
    trace.y = point.y
  }
  return point
}

type LoopState = {
  t: number
  lastNow: number
  speed: number
  density: number
  morph: number
  /** Display coeffs (smoothly lerped toward target preset). */
  coeffs: FormulaCoeffs
  targetId: PresetId
  /** Pointer warp, smoothed. */
  warpX: number
  warpY: number
  targetWarpX: number
  targetWarpY: number
  dragging: boolean
  /** Story-driven one-shot morph pulse. */
  morphBoost: number
  hudAt: number
  count: number
  /** Soft trail strength 0..1 (higher = longer afterimage). */
  trail: number
}

export function FormulaBloom({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // 科学可视化：首次用故事把「公式 → 点 → 形」讲清楚
  const { storyMode, enterFree, enterStory } = useStoryFreeMode(WORLD_ID, {
    firstVisit: 'story',
  })

  const [speed, setSpeed] = useState(1)
  const [density, setDensity] = useState(0.85)
  const [morph, setMorph] = useState(0.55)
  const [presetId, setPresetId] = useState<PresetId>('jellyfish')
  const [hud, setHud] = useState({ t: 0, points: DESKTOP_COUNT, form: '水母' })
  const [probe, setProbe] = useState({
    ready: false,
    screenX: 0,
    screenY: 0,
    i: 0,
    indexY: 0,
    k: 0,
    e: 0,
    d: 0,
    q: 0,
    x: 0,
    y: 0,
  })
  /**
   * 简洁版 = 只列公式，不解释符号。
   * 详细版 = 解释 i / y / k / e / d / q 各是什么。
   * 自由探索默认简洁；故事模式用详细版配合分镜高亮。
   */
  const [showDetailedFormula, setShowDetailedFormula] = useState(false)
  const detailedFormulaVisible = storyMode || showDetailedFormula
  /** 故事分镜：控制粒子预算，用来演示「点如何堆出形」 */
  const [storyCap, setStoryCap] = useState(0) // 0 = 不限
  const [formulaStage, setFormulaStage] = useState(0) // 0..3 公式高亮步骤

  const interactedRef = useRef(false)
  const markInteraction = useCallback(() => {
    if (interactedRef.current) return
    interactedRef.current = true
    controls.registerInteraction()
  }, [controls])

  const st = useRef<LoopState | null>(null)
  if (!st.current) {
    st.current = {
      t: 1.2, // non-zero so first frame already shows a full creature
      lastNow: 0,
      speed: 1,
      density: 0.85,
      morph: 0.55,
      coeffs: { ...PRESETS[0] },
      targetId: 'jellyfish',
      warpX: 0,
      warpY: 0,
      targetWarpX: 0,
      targetWarpY: 0,
      dragging: false,
      morphBoost: 0,
      hudAt: 0,
      count: DESKTOP_COUNT,
      trail: 0.22,
    }
  }

  // Mirror React state into the rAF loop (no re-bind of the loop).
  st.current.speed = speed
  st.current.density = density
  st.current.morph = morph
  st.current.targetId = presetId
  const detailedFormulaVisibleRef = useRef(false)
  detailedFormulaVisibleRef.current = detailedFormulaVisible
  const storyCapRef = useRef(0)
  storyCapRef.current = storyCap

  useEffect(() => {
    controls.completeOnboarding()
  }, [controls])

  const applyPreset = useCallback(
    (id: PresetId, byUser: boolean) => {
      if (byUser) markInteraction()
      setPresetId(id)
      st.current!.targetId = id
    },
    [markInteraction],
  )

  /* ---------- pointer warp on canvas ---------- */
  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    markInteraction()
    const s = st.current!
    s.dragging = true
    const rect = event.currentTarget.getBoundingClientRect()
    const nx = (event.clientX - rect.left) / rect.width - 0.5
    const ny = (event.clientY - rect.top) / rect.height - 0.5
    s.targetWarpX = nx * 1.6
    s.targetWarpY = ny * 1.4
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const s = st.current!
    if (!s.dragging) return
    const rect = event.currentTarget.getBoundingClientRect()
    const nx = (event.clientX - rect.left) / rect.width - 0.5
    const ny = (event.clientY - rect.top) / rect.height - 0.5
    s.targetWarpX = nx * 1.6
    s.targetWarpY = ny * 1.4
  }

  const onPointerUp = () => {
    const s = st.current!
    s.dragging = false
    // Ease warp back so the creature slowly returns to rest
    s.targetWarpX = 0
    s.targetWarpY = 0
  }

  /* ---------- animation loop ---------- */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    let raf = 0
    let width = 1
    let height = 1
    let dpr = 1

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()

    // Pure black stage — first paint before any points so no flash of empty CSS bg.
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, width, height)

    const frame = (now: number) => {
      const s = st.current!
      const dt = s.lastNow ? Math.min((now - s.lastNow) / 1000, 0.05) : 1 / 60
      s.lastNow = now
      const mobile = width < 720

      // Soft-follow target preset coefficients
      const target = PRESETS.find((p) => p.id === s.targetId) ?? PRESETS[0]
      s.coeffs = mixCoeffs(s.coeffs, target, 1 - Math.exp(-dt * 1.8))

      // Time advance — original used PI/80 ≈ 0.039 per frame @60fps ≈ 2.36/s
      const baseOmega = Math.PI / 80 * 60
      s.t += dt * baseOmega * s.speed * (0.85 + s.morph * 0.3)

      // Warp ease
      const warpTau = s.dragging ? 10 : 2.4
      const wEase = 1 - Math.exp(-dt * warpTau)
      s.warpX += (s.targetWarpX - s.warpX) * wEase
      s.warpY += (s.targetWarpY - s.warpY) * wEase

      if (s.morphBoost > 0) s.morphBoost = Math.max(0, s.morphBoost - dt * 0.55)

      const liveMorph = clamp(s.morph + s.morphBoost * 0.45, 0, 1.4)
      s.count = mobile ? MOBILE_COUNT : DESKTOP_COUNT
      const cap = storyCapRef.current
      const budget = cap > 0 ? Math.min(s.count, cap) : s.count
      const n = Math.max(120, Math.floor(budget * s.density))

      // Trail: near-black fade keeps the creature solid but motion feels continuous
      const fade = 0.16 + s.trail * 0.5
      ctx.fillStyle = `rgba(0,0,0,${fade})`
      ctx.fillRect(0, 0, width, height)

      // Fit original 400-space form into the stage with breathing room
      const fit = mobile ? 0.92 : 0.88
      const scale = (Math.min(width, height) / 400) * fit
      const cx = width * 0.5
      // Slightly above geometric center so freebar doesn't clip the tail
      const cy = height * (mobile ? 0.46 : 0.48)

      // Use one of the indices actually drawn in this frame, so the circled
      // sample and its numeric trace always describe the same white point.
      const maxI = 10_000
      const step = maxI / n
      const probeOrdinal = Math.min(n - 1, Math.max(0, Math.round(n * PROBE_POSITION)))
      const probeIndex = probeOrdinal * step
      const probeTrace: PointTrace = {
        indexY: 0,
        k: 0,
        e: 0,
        d: 0,
        q: 0,
        x: 0,
        y: 0,
      }
      const probePoint = samplePoint(probeIndex, s.t, s.coeffs, liveMorph, s.warpX, s.warpY, probeTrace)
      const probePx = cx + (probePoint.x - 200) * scale
      const probePy = cy + (probePoint.y - 220) * scale * -1

      // Single fillStyle for all particles — soft warm white, not pure #fff glare
      ctx.fillStyle = 'rgba(245, 245, 242, 0.78)'

      // Point size: denser → smaller so the silhouette stays lace-like
      const baseSize = mobile
        ? s.density > 0.75
          ? 1.15
          : 1.35
        : s.density > 0.75
          ? 1.25
          : 1.55

      // Stride through index space so density trims evenly, not just the tail
      for (let p = 0; p < n; p += 1) {
        const i = p * step
        const pt = samplePoint(i, s.t, s.coeffs, liveMorph, s.warpX, s.warpY)
        // Original y grows downward in p5; flip so the creature "floats" upright
        const px = cx + (pt.x - 200) * scale
        const py = cy + (pt.y - 220) * scale * -1

        // Tiny size modulation along the body — denser core, softer fringe
        const fringe = (p % 7) / 7
        const size = baseSize * (0.75 + fringe * 0.55)
        ctx.fillRect(px, py, size, size)
      }

      // Occasional brighter "nerve" subsample for depth without extra style changes
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'
      const nerves = Math.floor(n * 0.08)
      const nerveStep = maxI / nerves
      for (let p = 0; p < nerves; p += 1) {
        const i = p * nerveStep + 0.5
        const pt = samplePoint(i, s.t, s.coeffs, liveMorph, s.warpX, s.warpY)
        const px = cx + (pt.x - 200) * scale
        const py = cy + (pt.y - 220) * scale * -1
        ctx.fillRect(px, py, baseSize * 0.85, baseSize * 0.85)
      }

      if (detailedFormulaVisibleRef.current) {
        ctx.save()
        ctx.strokeStyle = 'rgba(250, 250, 244, 0.9)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(probePx, probePy, 7, 0, Math.PI * 2)
        ctx.stroke()
        ctx.fillStyle = 'rgba(250, 250, 244, 0.96)'
        ctx.fillRect(probePx - 1, probePy - 1, 2, 2)
        ctx.restore()
      }

      if (now - s.hudAt > 220) {
        s.hudAt = now
        setHud({
          t: s.t,
          points: n,
          form: target.label,
        })
        if (detailedFormulaVisibleRef.current) {
          setProbe({
            ready: true,
            screenX: probePx,
            screenY: probePy,
            i: probeIndex,
            indexY: probeTrace.indexY,
            k: probeTrace.k,
            e: probeTrace.e,
            d: probeTrace.d,
            q: probeTrace.q,
            x: probeTrace.x,
            y: probeTrace.y,
          })
        }
      }

      raf = requestWorldFrame(frame)
    }

    raf = requestWorldFrame(frame)
    return () => {
      cancelWorldFrame(raf)
      observer.disconnect()
    }
  }, [])

  /* ---------- story: 公式 → 点 → 形 → 自由 ---------- */
  const guideSteps: Array<GuideStep> = useMemo(
    () => [
      {
        title: tx('每个点，只是算了一次公式'),
        body: tx('右边是参数方程。粒子编号 i 与时间 t 代进去，就得到一个平面坐标 (x, y)。没有贴图、没有手绘轮廓——白影完全由公式吐出来。'),
        action: () => {
          applyPreset('jellyfish', false)
          setFormulaStage(1)
          setStoryCap(900)
          setSpeed(0.55)
          setMorph(0.4)
          setDensity(1)
        },
        durationMs: 7200,
      },
      {
        title: tx('距离项 d：把点拧出“厚度”'),
        body: tx('k 与 e 先各自用 cos 算出，再取 √(k²+e²) 得到 d。这一步像量半径：远处的点被推开，近处的点挤成脊线，生物才有体积感。'),
        action: () => {
          applyPreset('jellyfish', false)
          setFormulaStage(2)
          setStoryCap(2800)
          setSpeed(0.7)
          setMorph(0.55)
        },
        durationMs: 7000,
      },
      {
        title: tx('时间 t：公式开始呼吸'),
        body: tx('t 每帧往前走一点点，套在 sin/cos 里。同一串 i 的落点随之缓慢移动，画面因此持续变化。'),
        action: () => {
          applyPreset('jellyfish', false)
          setFormulaStage(3)
          setStoryCap(0)
          setSpeed(1.15)
          setMorph(0.75)
          st.current!.morphBoost = 0.8
        },
        durationMs: 7000,
      },
      {
        title: tx('改系数 = 换一种生物'),
        body: tx('公式骨架不变，只改振幅与频率：水母、脊骨、丝带。数学上这叫同一参数族里的不同成员——形态差很多，规则只有一套。'),
        action: () => {
          setFormulaStage(0)
          setStoryCap(0)
          applyPreset('spine', false)
          setMorph(0.6)
          setSpeed(1)
          window.setTimeout(() => applyPreset('ribbon', false), 2600)
        },
        durationMs: 7800,
      },
      {
        title: tx('轮到你：改形变，转相位'),
        body: tx('自由探索时可以拧形变/密度，或拖动画布弯折相位。记住：画面再怪，也只是 i 与 t 代进公式的结果——这就是生成艺术背后的数学。'),
        action: () => {
          applyPreset('jellyfish', false)
          setFormulaStage(0)
          setStoryCap(0)
          setMorph(0.55)
          setSpeed(1)
          setDensity(0.85)
        },
        durationMs: 6500,
      },
    ],
    [applyPreset, tx],
  )

  const formLabel = PRESETS.find((p) => p.id === presetId)?.label ?? '水母'
  const live = PRESETS.find((p) => p.id === presetId) ?? PRESETS[0]

  const formulaLines = useMemo(
    () => [
      {
        stage: 1,
        symbol: 'i → y',
        title: tx('给每个点一个位置'),
        code: 'y = i / 235',
        note: tx('i 是点的编号；y 把这个编号排到一条纵向序列里。'),
      },
      {
        stage: 1,
        symbol: 'k',
        title: tx('制造横向起伏'),
        code: `k = (${live.kAmp.toFixed(1)}+cos(i·${live.kFreqI.toFixed(2)}−${live.kFreqT.toFixed(1)}t))·cos(i·${live.kFreqI2.toFixed(2)})`,
        note: tx('两层 cos 让不同编号的点左右摆动；数字越大，波纹越密。'),
      },
      {
        stage: 2,
        symbol: 'e',
        title: tx('制造纵向起伏'),
        code: `e = y·${live.eScale.toFixed(2)} − ${live.eOffset.toFixed(0)}`,
        note: tx('e 把这条序列映射成上下位置。它不是另一个对象，只是计算中的中间结果。'),
      },
      {
        stage: 2,
        symbol: 'd',
        title: tx('量出离中心多远'),
        code: `d = √(k²+e²) + ${live.dSinAmp.toFixed(1)}sin(e/9+t/2) − ${live.dOffset.toFixed(1)}`,
        note: tx('把左右的 k 和上下的 e 合成一个距离 d，决定点离中心有多远。'),
      },
      {
        stage: 3,
        symbol: 'q',
        title: tx('加上轮廓细节'),
        code: `q = ${live.qSin.toFixed(1)}sin(3k) − y·${Math.abs(live.qYScale).toFixed(3)}·k(${live.qInner.toFixed(1)} + k·sin(${live.qInner.toFixed(1)}cos(e)−2d+t))`,
        note: tx('q 是一小段细节扰动，让轮廓从光滑的圆变成有纹理的生物。'),
      },
      {
        stage: 3,
        symbol: '(x, y)',
        title: tx('得到画布上的落点'),
        code: `x = q + ${live.orbitR.toFixed(0)}·cos(d−t) + ${live.originX.toFixed(0)};  y = q·sin(d−t) + ${live.dY.toFixed(0)}·d`,
        note: tx('把 q 和 d 变成一个最终坐标；t 每帧变化，所以同一个点会慢慢移动。'),
      },
    ],
    [
      live.dOffset,
      live.dSinAmp,
      live.dY,
      live.eOffset,
      live.eScale,
      live.kAmp,
      live.kFreqI,
      live.kFreqI2,
      live.kFreqT,
      live.orbitR,
      live.originX,
      live.qInner,
      live.qSin,
      live.qYScale,
      tx,
    ],
  )

  const formulaMap = useMemo(
    () => [
      { stage: 1, symbol: 'i', label: tx('点编号') },
      { stage: 1, symbol: 'y', label: tx('纵向位置') },
      { stage: 1, symbol: 'k / e', label: tx('左右与上下起伏') },
      { stage: 2, symbol: 'd', label: tx('离中心的距离') },
      { stage: 3, symbol: 'q', label: tx('轮廓细节') },
      { stage: 3, symbol: '(x, y)', label: tx('最终落点') },
    ],
    [tx],
  )

  return (
    <div className={`oss-experience formula-bloom-experience${storyMode ? ' is-story' : ' is-free'}`}>
      <canvas
        ref={canvasRef}
        className="fb-canvas"
        role="img"
        aria-label={tx('公式粒子生物：拖动画布可轻轻扭曲形态')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />

      {!storyMode && (
        <header className="fb-plaque" data-experience-overlay="true">
          <h1>{tx('一万个点被一条公式唤醒')}</h1>
          <p>{tx('参数方程把索引 i 与时间 t 映射成平面上的白影')}</p>
        </header>
      )}

      {detailedFormulaVisible && probe.ready && (
        <div
          className="fb-probe"
          data-experience-overlay="true"
          style={{ left: probe.screenX, top: probe.screenY }}
          aria-hidden="true"
        >
          <span className="fb-probe-label">
            {tx('示范点')} · i = {probe.i.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          </span>
        </div>
      )}

      {/* 简洁版只列公式；详细版解释 i / y / k / e 等符号。默认简洁。 */}
      <aside
        className={`fb-formula${storyMode ? ' is-story' : ''}${detailedFormulaVisible ? ' is-detailed' : ' is-simple'}${storyMode && formulaStage === 0 ? ' is-summary' : ''}`}
        data-experience-overlay="true"
        data-freebar-clearance={!storyMode ? 'true' : undefined}
        aria-label={tx('参数方程')}
      >
        <div className="fb-formula-head">
          <span>{detailedFormulaVisible ? tx('详细公式') : tx('简洁公式')}</span>
          <strong>t = {hud.t.toFixed(1)}</strong>
          {!storyMode && (
            <button
              type="button"
              className="fb-formula-toggle"
              onClick={() => {
                markInteraction()
                setShowDetailedFormula((value) => !value)
              }}
              aria-expanded={showDetailedFormula}
            >
              {showDetailedFormula ? tx('简洁版') : tx('详细版')}
            </button>
          )}
        </div>
        {detailedFormulaVisible && (
          <>
            <p className="fb-formula-lead">
              {tx('这些字母不是不同的东西，而是同一个点在计算过程中的中间结果。')}
            </p>
            <div className="fb-formula-map" aria-label={tx('从公式到白影的计算路径')}>
              {formulaMap.map((item, index) => (
                <span key={item.symbol} className={`fb-formula-map-item${formulaStage === 0 || formulaStage === item.stage ? ' is-active' : ' is-dim'}${formulaStage > 0 && formulaStage === item.stage ? ' is-hot' : ''}`}>
                  <b>{item.symbol}</b>
                  <small>{item.label}</small>
                  {index < formulaMap.length - 1 && <i aria-hidden="true">→</i>}
                </span>
              ))}
            </div>
          </>
        )}
        <ol className="fb-formula-list">
          {formulaLines.map((line) => {
            const active = formulaStage === 0 || formulaStage === line.stage
            const hot = formulaStage > 0 && formulaStage === line.stage
            return (
              <li
                key={line.symbol}
                className={`fb-formula-line${active ? ' is-active' : ' is-dim'}${hot ? ' is-hot' : ''}`}
              >
                {detailedFormulaVisible ? (
                  <div className="fb-formula-line-head">
                    <b>{line.symbol}</b>
                    <span>{line.title}</span>
                  </div>
                ) : (
                  <div className="fb-formula-line-head">
                    <b>{line.symbol}</b>
                  </div>
                )}
                <code>{line.code}</code>
                {detailedFormulaVisible && <small>{line.note}</small>}
              </li>
            )
          })}
        </ol>
        <p className="fb-formula-foot">
          {tx('形态')} · {tx(formLabel)} · {hud.points.toLocaleString()} {tx('点')}
        </p>
        {detailedFormulaVisible && (
          <p className="fb-formula-result">
            {tx('这条路径会对每个 i 重复一遍：每次得到一个 (x, y)，所有落点叠在一起，就是中间的白影。')}{' '}
            {tx('最后，坐标会被缩放并移到画布中央；画面中的每一颗白点都来自一个这样的落点。')}
          </p>
        )}
      </aside>

      {!storyMode && (
        <aside className="fb-hud" data-experience-overlay="true" data-freebar-clearance="true">
          <div className="fb-hud-row">
            <small>{tx('形态')}</small>
            <strong>{tx(formLabel)}</strong>
          </div>
          <div className="fb-hud-row">
            <small>{tx('粒子')}</small>
            <strong>{hud.points.toLocaleString()}</strong>
          </div>
          <div className="fb-hud-row">
            <small>{tx('时间 t')}</small>
            <strong>{hud.t.toFixed(1)}</strong>
          </div>
        </aside>
      )}

      {!storyMode && (
        <Freebar
          className="fb-freebar"
          ariaLabel={tx('公式潮控制')}
          primaryControlBudget={3}
          secondaryDefault="auto"
          mobileDensity="comfortable"
          secondary={(
            <div className="fb-secondary experience-freebar-chips" role="group" aria-label={tx('形态预设')}>
              <div className="experience-freebar-seg" role="group" aria-label={tx('生物形态')}>
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={presetId === p.id ? 'is-active' : undefined}
                    aria-pressed={presetId === p.id}
                    onClick={() => applyPreset(p.id, true)}
                  >
                    {tx(p.label)}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="experience-freebar-story"
                onClick={() => {
                  markInteraction()
                  enterStory()
                  replayGuide(WORLD_ID)
                }}
                aria-label={tx('重播故事')}
              >
                <FilmStrip weight="fill" aria-hidden="true" />
                <span>{tx('故事')}</span>
              </button>
            </div>
          )}
        >
          <label className="fb-field fb-field--speed experience-freebar-field">
            <span>{tx('速度')}</span>
            <input
              type="range"
              min={0.2}
              max={2.4}
              step={0.05}
              value={speed}
              aria-label={tx('动画速度')}
              onChange={(e) => {
                markInteraction()
                setSpeed(Number(e.target.value))
              }}
            />
            <b>{speed.toFixed(1)}×</b>
          </label>
          <label className="fb-field fb-field--morph experience-freebar-field">
            <span>{tx('形变')}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={morph}
              aria-label={tx('形变强度')}
              onChange={(e) => {
                markInteraction()
                setMorph(Number(e.target.value))
              }}
            />
            <b>{Math.round(morph * 100)}</b>
          </label>
          <label className="fb-field fb-field--density experience-freebar-field">
            <span>{tx('密度')}</span>
            <input
              type="range"
              min={0.35}
              max={1}
              step={0.01}
              value={density}
              aria-label={tx('粒子密度')}
              onChange={(e) => {
                markInteraction()
                setDensity(Number(e.target.value))
              }}
            />
            <b>{Math.round(density * 100)}%</b>
          </label>
        </Freebar>
      )}

      <GuideTour
        worldId={WORLD_ID}
        steps={guideSteps}
        defaultOpen={storyMode}
        placement="stage"
        stagePlan={[
          { position: 'top-left', mobilePosition: 'bottom-left', motion: 'rise', tone: 'light', width: 'normal', treatment: 'editorial' },
          { position: 'center-left', mobilePosition: 'bottom-right', motion: 'drift-right', tone: 'light', width: 'narrow', treatment: 'annotation', cue: 'right' },
          { position: 'bottom-left', mobilePosition: 'bottom-left', motion: 'fade', tone: 'light', width: 'normal', treatment: 'caption' },
          { position: 'top-left', mobilePosition: 'bottom-right', motion: 'scale', tone: 'light', width: 'normal', treatment: 'caption' },
          { position: 'bottom-left', mobilePosition: 'bottom-center', motion: 'rise', tone: 'light', width: 'wide', treatment: 'editorial' },
        ]}
        showReplayChip={false}
        onExit={() => {
          setStoryCap(0)
          setFormulaStage(0)
          enterFree()
        }}
      />
      {!storyMode && (
        <GhostHint
          worldId={WORLD_ID}
          gesture={{
            type: 'scrub',
            target: '.fb-field--morph input',
            label: tx('拧「形变」，看白影慢慢翻开'),
          }}
        />
      )}
    </div>
  )
}
