/**
 * Clifford Dust · 尘埃吸引子
 *
 * Catalog copy (for later registration):
 * id: clifford-dust
 * title: 四个数字反复折叠，在黑暗里落成一片尘埃
 * posterTitle: 四个参数，怎么撒出一整片星尘？
 * question: 为什么四个数字反复迭代，会落成一片星云？
 * hook: 每一步只是 sin 与 cos 的交错；十万次之后，平面上浮现出翅膀、丝带与暗涡。
 * payoff: Clifford 吸引子是二维迭代映射：有界却对初值敏感。参数 (a,b,c,d) 决定折叠方式——同一规则在不同系数下会长出完全不同的尘埃纹样。
 *
 * Map:
 *   x_{n+1} = sin(a y_n) + c cos(a x_n)
 *   y_{n+1} = sin(b x_n) + d cos(b y_n)
 */

import './styles/CliffordDust.css'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowCounterClockwise, FilmStrip } from '@phosphor-icons/react'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar, FreebarTabs } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { GuideTour, replayGuide, type GuideStep } from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import { useExperienceI18n } from '~/i18n/experience'

const WORLD_ID = 'clifford-dust'

/** Famous beautiful Clifford parameter sets (research / classic demos). */
type Preset = {
  id: string
  name: string
  a: number
  b: number
  c: number
  d: number
}

/**
 * Classic Clifford (a,b,c,d) sets — chosen so each silhouette is visually
 * distinct and fills the frame after auto-scale. 飞燕 uses a known bird-like
 * fold (not the collapsed thin set that looked empty).
 * Refs: Paul Bourke / common generative demos.
 */
const PRESETS: Array<Preset> = [
  { id: 'wings', name: '双翼', a: -1.4, b: 1.6, c: 1.0, d: 0.7 },
  { id: 'web', name: '丝网', a: -1.7, b: 1.3, c: -0.1, d: -1.2 },
  { id: 'swallow', name: '飞燕', a: -1.7, b: 1.8, c: -0.9, d: -0.4 },
  { id: 'vortex', name: '暗涡', a: -1.8, b: -2.0, c: -0.5, d: -0.9 },
  { id: 'shell', name: '贝壳', a: 1.6, b: -0.6, c: -1.2, d: 1.6 },
]

const DEFAULT = PRESETS[0]
const PARAM_MIN = -3
const PARAM_MAX = 3
const MARGIN = 0.08

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function formatParam(value: number) {
  const rounded = Math.round(value * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2)
}

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000) return `${Math.round(n / 1000)}k`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(Math.round(n))
}

function matchPreset(a: number, b: number, c: number, d: number): string | null {
  for (const preset of PRESETS) {
    if (
      Math.abs(preset.a - a) < 0.005
      && Math.abs(preset.b - b) < 0.005
      && Math.abs(preset.c - c) < 0.005
      && Math.abs(preset.d - d) < 0.005
    ) {
      return preset.id
    }
  }
  return null
}

type Sim = {
  a: number
  b: number
  c: number
  d: number
  x: number
  y: number
  /** Density accumulation buffer (device pixels). */
  dens: Float32Array | null
  bufW: number
  bufH: number
  maxDens: number
  total: number
  /** Soft auto-scale bounds in map space. */
  minX: number
  maxX: number
  minY: number
  maxY: number
  boundsReady: boolean
  /** Color temperature 0 = pure white, 1 = soft gold. */
  warmth: number
  /** Relative iteration density / speed 0.25–1.5. */
  density: number
  generation: number
  startedAt: number
  lastHudAt: number
  lastHudKey: string
  needsClear: boolean
  needsWarmup: boolean
}

function createSim(preset: Preset = DEFAULT): Sim {
  return {
    a: preset.a,
    b: preset.b,
    c: preset.c,
    d: preset.d,
    x: 0.1,
    y: 0.1,
    dens: null,
    bufW: 0,
    bufH: 0,
    maxDens: 1,
    total: 0,
    minX: -2,
    maxX: 2,
    minY: -2,
    maxY: 2,
    boundsReady: false,
    warmth: 0.35,
    density: 1,
    generation: 0,
    startedAt: 0,
    lastHudAt: 0,
    lastHudKey: '',
    needsClear: true,
    needsWarmup: true,
  }
}

function clearDensity(sim: Sim) {
  if (sim.dens) sim.dens.fill(0)
  sim.maxDens = 1
  sim.total = 0
  sim.x = 0.1
  sim.y = 0.1
  sim.boundsReady = false
  sim.needsWarmup = true
  sim.startedAt = performance.now()
  sim.needsClear = false
}

/** Warm up bounds by iterating without plotting. */
function warmupBounds(sim: Sim, steps = 12_000) {
  let x = 0.1
  let y = 0.1
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  const { a, b, c, d } = sim

  for (let i = 0; i < steps; i += 1) {
    const nx = Math.sin(a * y) + c * Math.cos(a * x)
    const ny = Math.sin(b * x) + d * Math.cos(b * y)
    x = nx
    y = ny
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      x = 0.1
      y = 0.1
      continue
    }
    // Skip short transient
    if (i < 80) continue
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }

  if (!Number.isFinite(minX) || maxX - minX < 1e-6 || maxY - minY < 1e-6) {
    sim.minX = -2
    sim.maxX = 2
    sim.minY = -2
    sim.maxY = 2
  } else {
    // Pad + enforce a minimum span so thin attractors (e.g. some bird folds)
    // still fill the canvas instead of collapsing to a hairline.
    let spanX = maxX - minX
    let spanY = maxY - minY
    const minSpan = 0.55
    if (spanX < minSpan) {
      const mid = (minX + maxX) * 0.5
      minX = mid - minSpan * 0.5
      maxX = mid + minSpan * 0.5
      spanX = minSpan
    }
    if (spanY < minSpan) {
      const mid = (minY + maxY) * 0.5
      minY = mid - minSpan * 0.5
      maxY = mid + minSpan * 0.5
      spanY = minSpan
    }
    const padX = spanX * 0.1 + 0.03
    const padY = spanY * 0.1 + 0.03
    sim.minX = minX - padX
    sim.maxX = maxX + padX
    sim.minY = minY - padY
    sim.maxY = maxY + padY
  }
  sim.x = x
  sim.y = y
  sim.boundsReady = true
  sim.needsWarmup = false
}

function accumulate(sim: Sim, steps: number) {
  if (!sim.dens || sim.bufW < 2 || sim.bufH < 2) return

  const dens = sim.dens
  const w = sim.bufW
  const h = sim.bufH
  const { a, b, c, d } = sim
  let x = sim.x
  let y = sim.y
  let maxDens = sim.maxDens
  let total = sim.total

  const spanX = sim.maxX - sim.minX
  const spanY = sim.maxY - sim.minY
  if (spanX < 1e-9 || spanY < 1e-9) return

  // Keep aspect: fit attractor into buffer with margin
  const drawW = w * (1 - 2 * MARGIN)
  const drawH = h * (1 - 2 * MARGIN)
  const scale = Math.min(drawW / spanX, drawH / spanY)
  const ox = (w - spanX * scale) * 0.5
  const oy = (h - spanY * scale) * 0.5

  for (let i = 0; i < steps; i += 1) {
    const nx = Math.sin(a * y) + c * Math.cos(a * x)
    const ny = Math.sin(b * x) + d * Math.cos(b * y)
    x = nx
    y = ny

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      x = (Math.random() - 0.5) * 0.2
      y = (Math.random() - 0.5) * 0.2
      continue
    }

    // Soft expand bounds if a rare point escapes (chaotic wander)
    if (x < sim.minX || x > sim.maxX || y < sim.minY || y > sim.maxY) {
      const expand = 0.04
      if (x < sim.minX) sim.minX = x - expand * spanX
      if (x > sim.maxX) sim.maxX = x + expand * spanX
      if (y < sim.minY) sim.minY = y - expand * spanY
      if (y > sim.maxY) sim.maxY = y + expand * spanY
    }

    const px = ox + (x - sim.minX) * scale
    const py = oy + (sim.maxY - y) * scale
    const ix = px | 0
    const iy = py | 0
    if (ix < 1 || iy < 1 || ix >= w - 1 || iy >= h - 1) continue

    // Soft 3×3 splat for glow + density core
    const idx = iy * w + ix
    dens[idx] += 1.0
    dens[idx - 1] += 0.28
    dens[idx + 1] += 0.28
    dens[idx - w] += 0.28
    dens[idx + w] += 0.28
    dens[idx - w - 1] += 0.1
    dens[idx - w + 1] += 0.1
    dens[idx + w - 1] += 0.1
    dens[idx + w + 1] += 0.1

    const peak = dens[idx]
    if (peak > maxDens) maxDens = peak
    total += 1
  }

  sim.x = x
  sim.y = y
  sim.maxDens = maxDens
  sim.total = total
}

function toneMapToImage(
  sim: Sim,
  image: ImageData,
) {
  const dens = sim.dens
  if (!dens) return

  const data = image.data
  const n = dens.length
  const maxD = Math.max(1, sim.maxDens)
  // Log tone map: reveals faint orbits while keeping bright cores soft
  const logMax = Math.log1p(maxD * 0.55)
  const warmth = clamp(sim.warmth, 0, 1)
  // White → soft gold
  const baseR = 255
  const baseG = 255 - warmth * 38
  const baseB = 255 - warmth * 105

  for (let i = 0; i < n; i += 1) {
    const d = dens[i]
    const o = i * 4
    if (d <= 0) {
      data[o] = 0
      data[o + 1] = 0
      data[o + 2] = 0
      data[o + 3] = 255
      continue
    }
    const t = Math.log1p(d * 0.55) / logMax
    // Gentle gamma — museum soft-print look, not harsh neon
    const v = Math.pow(clamp(t, 0, 1), 0.72)
    // Slight bloom lift on midtones
    const lift = v * (0.88 + 0.12 * v)
    data[o] = Math.min(255, (baseR * lift) | 0)
    data[o + 1] = Math.min(255, (baseG * lift) | 0)
    data[o + 2] = Math.min(255, (baseB * lift) | 0)
    data[o + 3] = 255
  }
}

export function CliffordDust({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { storyMode, enterFree, enterStory } = useStoryFreeMode(WORLD_ID, { firstVisit: 'story' })

  const [a, setA] = useState(DEFAULT.a)
  const [b, setB] = useState(DEFAULT.b)
  const [c, setC] = useState(DEFAULT.c)
  const [d, setD] = useState(DEFAULT.d)
  const [warmth, setWarmth] = useState(0.35)
  const [density, setDensity] = useState(1)
  const [activePreset, setActivePreset] = useState<string | null>(DEFAULT.id)
  const [controlTab, setControlTab] = useState<'shape' | 'material'>('shape')
  const [hud, setHud] = useState({ total: 0, a: DEFAULT.a, b: DEFAULT.b, c: DEFAULT.c, d: DEFAULT.d })

  const sim = useRef<Sim>(createSim(DEFAULT))
  const paramsGen = useRef(0)

  useEffect(() => {
    controls.completeOnboarding()
  }, [controls])

  const restartAccumulation = useCallback(() => {
    const s = sim.current
    s.needsClear = true
    s.generation += 1
    paramsGen.current = s.generation
  }, [])

  const applyParams = useCallback((next: { a: number; b: number; c: number; d: number }, restart = true) => {
    const s = sim.current
    s.a = next.a
    s.b = next.b
    s.c = next.c
    s.d = next.d
    setA(next.a)
    setB(next.b)
    setC(next.c)
    setD(next.d)
    setActivePreset(matchPreset(next.a, next.b, next.c, next.d))
    if (restart) restartAccumulation()
  }, [restartAccumulation])

  const applyPreset = useCallback((preset: Preset) => {
    controls.registerInteraction()
    applyParams(preset, true)
  }, [applyParams, controls])

  const onParamChange = useCallback((key: 'a' | 'b' | 'c' | 'd', value: number) => {
    controls.registerInteraction()
    const next = { a, b, c, d, [key]: value }
    applyParams(next, true)
  }, [a, b, c, d, applyParams, controls])

  // Keep sim mirrors in sync for non-structural params
  useEffect(() => {
    sim.current.warmth = warmth
  }, [warmth])

  useEffect(() => {
    sim.current.density = density
  }, [density])

  // Main loop: a fading, tinted dust field drawn directly on the display
  // canvas. A permanent additive layer quickly clips every channel to white,
  // so each frame leaves a short luminous trace instead.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    let raf = 0
    let width = 1
    let height = 1
    let dpr = 1
    let lastGen = -1
    let primed = false

    const clearStage = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, width, height)
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      const nextW = Math.round(width * dpr)
      const nextH = Math.round(height * dpr)
      const state = sim.current
      if (canvas.width !== nextW || canvas.height !== nextH) {
        canvas.width = nextW
        canvas.height = nextH
        state.needsClear = true
        state.needsWarmup = true
        state.total = 0
        state.startedAt = performance.now()
        primed = false
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      state.bufW = Math.round(width)
      state.bufH = Math.round(height)
    }

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()
    sim.current.startedAt = performance.now()

    const paint = (now: number) => {
      const state = sim.current

      if (state.needsClear || state.generation !== lastGen) {
        clearDensity(state)
        clearStage()
        lastGen = state.generation
        primed = true
      } else if (!primed) {
        clearStage()
        primed = true
      }

      if (state.needsWarmup) warmupBounds(state)

      // Let the attractor move visibly instead of turning the whole canvas
      // into a permanent white bitmap after a few seconds.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
      ctx.fillStyle = 'rgba(0, 0, 0, 0.085)'
      ctx.fillRect(0, 0, width, height)

      const mobile = width < 720
      const elapsed = now - (state.startedAt || now)
      const bootstrap = elapsed < 1500 ? 5 : elapsed < 3000 ? 2.2 : 1
      const baseSteps = mobile ? 6000 : 16_000
      const steps = Math.round(baseSteps * state.density * bootstrap)

      const spanX = state.maxX - state.minX
      const spanY = state.maxY - state.minY
      if (spanX > 1e-9 && spanY > 1e-9) {
        const drawW = width * (1 - 2 * MARGIN)
        const drawH = height * (1 - 2 * MARGIN)
        const scale = Math.min(drawW / spanX, drawH / spanY)
        const ox = (width - spanX * scale) * 0.5
        const oy = (height - spanY * scale) * 0.5

        const warmth = clamp(state.warmth, 0, 1)
        const r = Math.round(94 + warmth * 161)
        const g = Math.round(190 - warmth * 12)
        const b = Math.round(255 - warmth * 179)

        ctx.globalCompositeOperation = 'source-over'
        ctx.fillStyle = `rgba(${r},${g},${b},0.14)`

        let x = state.x
        let y = state.y
        const aa = state.a
        const bb = state.b
        const cc = state.c
        const dd = state.d
        let plotted = 0

        for (let i = 0; i < steps; i += 1) {
          const nx = Math.sin(aa * y) + cc * Math.cos(aa * x)
          const ny = Math.sin(bb * x) + dd * Math.cos(bb * y)
          x = nx
          y = ny
          if (!Number.isFinite(x) || !Number.isFinite(y)) {
            x = 0.1
            y = 0.1
            continue
          }
          const px = ox + (x - state.minX) * scale
          const py = oy + (state.maxY - y) * scale
          if (px < 0 || py < 0 || px >= width || py >= height) continue
          ctx.fillRect(px, py, 1.15, 1.15)
          plotted += 1
        }

        state.x = x
        state.y = y
        state.total += plotted
        state.maxDens = Math.max(state.maxDens, 1 + state.total / 40_000)
      }

      ctx.globalCompositeOperation = 'source-over'

      if (now - state.lastHudAt > 120) {
        const key = `${state.total}|${state.a.toFixed(2)}|${state.b.toFixed(2)}|${state.c.toFixed(2)}|${state.d.toFixed(2)}`
        if (key !== state.lastHudKey) {
          state.lastHudKey = key
          state.lastHudAt = now
          setHud({ total: state.total, a: state.a, b: state.b, c: state.c, d: state.d })
        } else {
          state.lastHudAt = now
        }
      }
    }

    const loop = (now: number) => {
      raf = window.requestAnimationFrame(loop)
      try {
        paint(now)
      } catch (error) {
        console.error('[clifford-dust] frame failed', error)
      }
    }

    raf = window.requestAnimationFrame(loop)

    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(raf)
    }
  }, [])

  const guideSteps = useMemo<Array<GuideStep>>(
    () => [
      {
        title: tx('没有随机数，尘埃怎么长出来？'),
        body: tx('下一步只改当前的 (x,y)，左下角两行 sin/cos 规则会把点反复折回。先看秩序怎样从确定迭代里长成一片尘埃。'),
        action: () => {
          applyParams(PRESETS[0], true)
          sim.current.warmth = 0.3
          setWarmth(0.3)
        },
        durationMs: 7_200,
      },
      {
        title: tx('重复十万次，点落成尘埃'),
        body: tx('每帧再叠成千上万个落点。亮的地方是点反复经过的「高速公路」，暗处几乎没人去——密度图就是吸引子的肖像。'),
        action: () => {
          applyParams(PRESETS[0], true)
          sim.current.warmth = 0.35
          setWarmth(0.35)
          setDensity(1.2)
        },
        durationMs: 7_000,
      },
      {
        title: tx('同一公式，飞燕与双翼'),
        body: tx('只改 a,b,c,d 四个系数。现在是「飞燕」：折叠方式像一对掠过的翅。再切回双翼、丝网——规则没变，参数族换了成员。'),
        action: () => {
          applyParams(PRESETS.find((p) => p.id === 'swallow') ?? PRESETS[2], true)
          sim.current.warmth = 0.42
          setWarmth(0.42)
          setDensity(1)
        },
        durationMs: 8_000,
      },
      {
        title: tx('有界却敏感：混沌的脾气'),
        body: tx('尘埃停在有限区域，却对起点极端敏感——相邻两点很快分到不同丝带。这就是混沌吸引子：可画、可玩，却难以长期预测。'),
        action: () => {
          applyParams(PRESETS[1], true)
          sim.current.warmth = 0.5
          setWarmth(0.5)
        },
        durationMs: 7_500,
      },
      {
        title: tx('拧参数，亲手折叠'),
        body: tx('自由探索里切换预设或拧 a–d。每次改动清空重落：你在调试一个二维动力系统，而不是换一张壁纸。'),
        action: () => {
          applyParams(PRESETS[0], true)
          sim.current.warmth = 0.35
          setWarmth(0.35)
          setDensity(1)
        },
        durationMs: 6_500,
      },
    ],
    [applyParams, tx],
  )

  const plaqueTitle = activePreset
    ? PRESETS.find((p) => p.id === activePreset)?.name ?? tx('尘埃吸引子')
    : tx('自定义')

  const parameterFields: Array<{
    key: 'a' | 'b' | 'c' | 'd'
    label: string
    value: number
    ariaLabel: string
  }> = [
    { key: 'a', label: 'a', value: a, ariaLabel: tx('参数 a') },
    { key: 'b', label: 'b', value: b, ariaLabel: tx('参数 b') },
    { key: 'c', label: 'c', value: c, ariaLabel: tx('参数 c') },
    { key: 'd', label: 'd', value: d, ariaLabel: tx('参数 d') },
  ]

  return (
    <div className={`oss-experience cd-experience${storyMode ? ' is-story' : ' is-free'}`}>
      <canvas
        ref={canvasRef}
        className="cd-canvas"
        role="img"
        aria-label={tx('Clifford 吸引子：四个参数迭代落下的发光尘埃')}
      />

      {!storyMode && (
        <header className="cd-plaque" data-experience-overlay="true">
          <h1>{tx('尘埃吸引子')}</h1>
          <p>
            {tx(plaqueTitle)}
            {' · '}
            {tx('四个数字折叠成星云')}
          </p>
        </header>
      )}

      {/* 公式 + 参数：故事/自由都显示，科学可视化要「看得见方程」 */}
      <aside
        className={`cd-formula-panel${storyMode ? ' is-story' : ''}`}
        data-experience-overlay="true"
        data-freebar-clearance={!storyMode ? 'true' : undefined}
        aria-label={tx('Clifford 映射公式')}
        aria-live="polite"
      >
        <div className="cd-formula-head">
          <span>{tx('迭代映射')}</span>
          <strong>{formatCount(hud.total)} {tx('落点')}</strong>
        </div>
        <div className="cd-formula-eq" aria-hidden="true">
          <div>x<sub>n+1</sub> = sin(a y<sub>n</sub>) + c cos(a x<sub>n</sub>)</div>
          <div>y<sub>n+1</sub> = sin(b x<sub>n</sub>) + d cos(b y<sub>n</sub>)</div>
        </div>
        <p className="cd-formula-note">
          {tx('每一步只用 sin 与 cos 折一次平面；重复足够多次，点就落成有形状的尘埃。')}
        </p>
        <div className="cd-formula-params">
          <span>a={formatParam(hud.a)}</span>
          <span>b={formatParam(hud.b)}</span>
          <span>c={formatParam(hud.c)}</span>
          <span>d={formatParam(hud.d)}</span>
        </div>
        {activePreset === 'swallow' && (
          <p className="cd-formula-hint">{tx('飞燕：这一组系数把折叠拧成掠翅形')}</p>
        )}
      </aside>

      {!storyMode && (
        <Freebar
          className="cd-freebar"
          mainClassName="cd-freebar-main"
          ariaLabel={tx('自由探索控制')}
          primaryControlBudget={2}
          secondaryDefault="closed"
          mobileDensity="comfortable"
          secondary={(
            <div className="cd-tray">
              <div className="cd-tray-head">
                <FreebarTabs
                  activeId={controlTab}
                  ariaLabel={tx('参数分类')}
                  className="cd-control-tabs"
                  onChange={setControlTab}
                  tabs={[
                    { id: 'shape', label: tx('形状') },
                    { id: 'material', label: tx('材料') },
                  ]}
                />
                <div className="cd-tray-actions">
                  <button
                    type="button"
                    className="experience-freebar-reset"
                    onClick={() => {
                      controls.registerInteraction()
                      restartAccumulation()
                    }}
                    aria-label={tx('清空重落')}
                  >
                    <ArrowCounterClockwise weight="bold" aria-hidden="true" />
                    <span>{tx('重落')}</span>
                  </button>
                  <button
                    type="button"
                    className="experience-freebar-story"
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
              {controlTab === 'shape' ? (
                <div className="cd-secondary-fields is-shape" aria-label={tx('形状')}>
                  {parameterFields.map(({ key, label, value, ariaLabel }) => (
                    <label key={key} className="cd-freebar-field experience-freebar-field">
                      <span>{label}</span>
                      <input
                        type="range"
                        min={PARAM_MIN}
                        max={PARAM_MAX}
                        step={0.01}
                        value={value}
                        aria-label={ariaLabel}
                        onChange={(event) => onParamChange(key, Number(event.target.value))}
                      />
                      <b>{formatParam(value)}</b>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="cd-secondary-fields is-material" aria-label={tx('材料')}>
                  <label className="cd-freebar-field experience-freebar-field">
                    <span>{tx('密度')}</span>
                    <input
                      type="range"
                      min={0.3}
                      max={1.5}
                      step={0.05}
                      value={density}
                      aria-label={tx('落点密度')}
                      onChange={(event) => {
                        controls.registerInteraction()
                        setDensity(Number(event.target.value))
                      }}
                    />
                    <b>{Math.round(density * 100)}%</b>
                  </label>
                  <label className="cd-freebar-field experience-freebar-field">
                    <span>{tx('色温')}</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={warmth}
                      aria-label={tx('色温：冷白到暖金')}
                      onChange={(event) => {
                        controls.registerInteraction()
                        setWarmth(Number(event.target.value))
                      }}
                    />
                    <b>{warmth < 0.33 ? tx('冷白') : warmth < 0.7 ? tx('暖白') : tx('暖金')}</b>
                  </label>
                </div>
              )}
            </div>
          )}
        >
          <div className="cd-presets experience-freebar-chips experience-freebar-rail" role="group" aria-label={tx('经典纹样')}>
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={activePreset === preset.id ? 'is-active' : undefined}
                aria-pressed={activePreset === preset.id}
                onClick={() => applyPreset(preset)}
              >
                {tx(preset.name)}
              </button>
            ))}
          </div>
        </Freebar>
      )}

      <GuideTour
        worldId={WORLD_ID}
        steps={guideSteps}
        placement="stage"
        stagePlan={[
          {position: 'top-left', mobilePosition: 'top-left', motion: 'rise', tone: 'light', width: 'normal', treatment: 'editorial'},
          {position: 'top-right', mobilePosition: 'top-right', motion: 'drift-left', tone: 'light', width: 'normal', treatment: 'annotation'},
          {position: 'bottom-left', mobilePosition: 'bottom-left', motion: 'drift-right', tone: 'light', width: 'narrow', treatment: 'monumental'},
          {position: 'bottom-right', mobilePosition: 'bottom-right', motion: 'fade', tone: 'light', width: 'normal', treatment: 'caption'},
          {position: 'top-center', mobilePosition: 'bottom-center', motion: 'scale', tone: 'light', width: 'wide', treatment: 'editorial'},
        ]}
        defaultOpen={storyMode}
        showReplayChip={false}
        onExit={enterFree}
      />

      {!storyMode && (
        <GhostHint
          worldId={WORLD_ID}
          gesture={{
            type: 'tap',
            target: '.cd-presets button:nth-child(3)',
            label: tx('点「飞燕」，看掠翅形尘埃'),
          }}
        />
      )}
    </div>
  )
}
