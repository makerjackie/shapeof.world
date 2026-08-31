import './styles/StrangeAttractors.css'

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Question, X, FilmStrip } from '@phosphor-icons/react'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { GuideTour, replayGuide, type GuideStep } from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import { useI18n } from '~/i18n/index'
import { useExperienceI18n } from '~/i18n/experience'

/* ============================================================
   Attractor definitions
   ============================================================ */

type AttractorDef = {
  id: string
  name: string
  nameEn: string
  note: string
  noteEn: string
  equations: Array<string>
  accent: [number, number, number]
  params: Array<{ key: string; label: string; min: number; max: number; step: number; default: number }>
  deriv: (x: number, y: number, z: number, p: Record<string, number>, out: Float64Array) => void
  dt: number
  scale: number
  initSpread: number
  center: [number, number, number]
  view: [number, number]
  stepsPerFrame: number
}

const ATTRACTORS: Array<AttractorDef> = [
  {
    id: 'lorenz',
    name: '洛伦兹',
    nameEn: 'Lorenz',
    note: '双翼形状 · 简化大气方程长时间跑出的轨迹',
    noteEn: 'Twin wings · the long-run trail of a simplified weather equation',
    equations: ['ẋ = σ(y − x)', 'ẏ = x(ρ − z) − y', 'ż = xy − βz'],
    accent: [174, 105, 255],
    params: [
      { key: 'sigma', label: 'σ', min: 5, max: 20, step: 0.1, default: 10 },
      { key: 'rho', label: 'ρ', min: 15, max: 40, step: 0.1, default: 28 },
      { key: 'beta', label: 'β', min: 1, max: 5, step: 0.01, default: 2.67 },
    ],
    deriv: (x, y, z, p, out) => {
      out[0] = p.sigma * (y - x)
      out[1] = x * (p.rho - z) - y
      out[2] = x * y - p.beta * z
    },
    dt: 0.003,
    scale: 6.2,
    initSpread: 15,
    center: [0, 0, 25],
    view: [0.42, -0.1],
    stepsPerFrame: 4,
  },
  {
    id: 'rossler',
    name: '罗斯勒',
    nameEn: 'Rössler',
    note: '单条螺旋带 · 一次拉伸再折回留下的痕迹',
    noteEn: 'A single spiral band · the trace of one stretch-and-fold cycle',
    equations: ['ẋ = −y − z', 'ẏ = x + ay', 'ż = b + z(x − c)'],
    accent: [75, 211, 238],
    params: [
      { key: 'a', label: 'a', min: 0.1, max: 0.4, step: 0.005, default: 0.2 },
      { key: 'b', label: 'b', min: 0.1, max: 0.5, step: 0.005, default: 0.2 },
      { key: 'c', label: 'c', min: 2, max: 8, step: 0.1, default: 5.7 },
    ],
    deriv: (x, y, z, p, out) => {
      out[0] = -(y + z)
      out[1] = x + p.a * y
      out[2] = p.b + z * (x - p.c)
    },
    dt: 0.008,
    scale: 10.2,
    initSpread: 0.4,
    center: [0, 0, 3],
    view: [0.1, 0],
    stepsPerFrame: 3,
  },
  {
    id: 'halvorsen',
    name: '哈尔沃森',
    nameEn: 'Halvorsen',
    note: '三支旋臂 · 循环对称方程织出的图案',
    noteEn: 'Three spiral arms · woven by a cyclically symmetric equation',
    equations: [
      'ẋ = −ax − 4y − 4z − y²',
      'ẏ = −ay − 4z − 4x − z²',
      'ż = −az − 4x − 4y − x²',
    ],
    accent: [255, 132, 102],
    params: [
      { key: 'a', label: 'a', min: 1, max: 2.5, step: 0.01, default: 1.4 },
    ],
    deriv: (x, y, z, p, out) => {
      out[0] = -p.a * x - 4 * y - 4 * z - y * y
      out[1] = -p.a * y - 4 * z - 4 * x - z * z
      out[2] = -p.a * z - 4 * x - 4 * y - x * x
    },
    dt: 0.004,
    scale: 11.8,
    initSpread: 6,
    center: [-2, -2, -2],
    view: [-0.55, 0.65],
    stepsPerFrame: 4,
  },
  {
    id: 'aizawa',
    name: '朗福德',
    nameEn: 'Langford',
    note: '空心球壳 · 方程把状态绕成一层薄壳',
    noteEn: 'A hollow shell · the equation wraps states into a thin sphere',
    equations: [
      'ẋ = (z − b)x − dy',
      'ẏ = dx + (z − b)y',
      'ż = c + az − z³/3 − (x² + y²)(1 + ez) + fzx³',
    ],
    accent: [151, 117, 255],
    params: [
      { key: 'a', label: 'a', min: 0.5, max: 1.2, step: 0.01, default: 0.95 },
      { key: 'b', label: 'b', min: 0.5, max: 1.0, step: 0.01, default: 0.7 },
      { key: 'c', label: 'c', min: 0.1, max: 1.0, step: 0.01, default: 0.6 },
    ],
    deriv: (x, y, z, p, out) => {
      const d = 3.5
      const e = 0.25
      const f = 0.1
      out[0] = (z - p.b) * x - d * y
      out[1] = d * x + (z - p.b) * y
      out[2] = p.c + p.a * z - (z * z * z) / 3 - (x * x + y * y) * (1 + e * z) + f * z * x * x * x
    },
    dt: 0.006,
    scale: 112,
    initSpread: 0.1,
    center: [0, 0, 0],
    view: [0.15, 0],
    stepsPerFrame: 4,
  },
  {
    id: 'thomas',
    name: '托马斯',
    nameEn: 'Thomas',
    note: '三向波纹 · 正弦反馈织出的循环结构',
    noteEn: 'Three-way ripples · a loop woven by sine feedback',
    equations: ['ẋ = sin(y) − bx', 'ẏ = sin(z) − by', 'ż = sin(x) − bz'],
    accent: [91, 224, 185],
    params: [
      { key: 'b', label: 'b', min: 0.1, max: 0.3, step: 0.002, default: 0.19 },
    ],
    deriv: (x, y, z, p, out) => {
      out[0] = Math.sin(y) - p.b * x
      out[1] = Math.sin(z) - p.b * y
      out[2] = Math.sin(x) - p.b * z
    },
    dt: 0.02,
    scale: 36,
    initSpread: 1.0,
    center: [0, 0, 0],
    view: [-0.7, 0.45],
    stepsPerFrame: 3,
  },
  {
    id: 'dadras',
    name: '达德拉斯',
    nameEn: 'Dadras',
    note: '双卷涡旋 · 交叉耦合方程留下的双环',
    noteEn: 'Double scroll · twin loops from cross-coupled equations',
    equations: ['ẋ = y − ax + byz', 'ẏ = cy − xz + z', 'ż = 2xy − 9z'],
    accent: [255, 188, 86],
    params: [
      { key: 'a', label: 'a', min: 1, max: 4, step: 0.05, default: 3 },
      { key: 'b', label: 'b', min: 2, max: 4, step: 0.05, default: 2.7 },
      { key: 'c', label: 'c', min: 1, max: 2.5, step: 0.05, default: 1.7 },
    ],
    deriv: (x, y, z, p, out) => {
      const d = 2
      const e = 9
      out[0] = y - p.a * x + p.b * y * z
      out[1] = p.c * y - x * z + z
      out[2] = d * x * y - e * z
    },
    dt: 0.004,
    scale: 13,
    initSpread: 0.5,
    center: [0, 0, 0],
    view: [-0.4, 0.55],
    stepsPerFrame: 4,
  },
]

/* ============================================================
   Particle system types
   ============================================================ */

type Particle = {
  x: number
  y: number
  z: number
  trail: Float32Array
  trailHead: number
  trailCount: number
}

const TRAIL_LENGTH = 22
const DRAW_BUCKETS = 12
const TRAIL_AGE_BUCKETS = 5
const WARMUP_STEPS = 1_600
const SEED_STREAMS = 48
const SEED_SPACING_STEPS = 3
const FOV = 600
const CAM_DIST = 220

/* ============================================================
   Component
   ============================================================ */

export function StrangeAttractors({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const { locale } = useI18n()
  const { storyMode, enterFree, enterStory } = useStoryFreeMode('strange-attractors')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const [whyOpen, setWhyOpen] = useState(false)
  const [paramValues, setParamValues] = useState<Record<string, number>>(() => {
    const vals: Record<string, number> = {}
    for (const a of ATTRACTORS) {
      for (const p of a.params) vals[`${a.id}.${p.key}`] = p.default
    }
    return vals
  })

  const interactedRef = useRef(false)
  const activeIdxRef = useRef(0)
  const storyModeRef = useRef(storyMode)
  const paramRef = useRef(paramValues)
  const rotRef = useRef({ rx: 0.42, ry: -0.1, autoRy: 0, dragging: false, lastX: 0, lastY: 0 })
  const particlesRef = useRef<Array<Particle>>([])

  activeIdxRef.current = activeIdx
  storyModeRef.current = storyMode
  paramRef.current = paramValues

  /* ---- Initialize particles ---- */
  const initParticles = useCallback((def: AttractorDef) => {
    const canvas = canvasRef.current
    const width = canvas?.clientWidth ?? window.innerWidth
    const height = canvas?.clientHeight ?? window.innerHeight
    const reducedMotion = false
    const particleCount = reducedMotion
      ? 900
      : width < 720
        ? 2_400
        : Math.max(3_600, Math.min(4_600, Math.round((width * height) / 320)))
    const values = Object.fromEntries(
      def.params.map((param) => [
        param.key,
        paramRef.current[`${def.id}.${param.key}`] ?? param.default,
      ]),
    )
    const delta = new Float64Array(3)
    const particles: Array<Particle> = []
    const streamCount = reducedMotion ? 20 : SEED_STREAMS
    const streams = new Float64Array(streamCount * 3)
    const seedSpread = Math.max(0.04, def.initSpread * 0.7)
    let randomState = 0x9e3779b9 ^ def.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
    const random = () => {
      randomState |= 0
      randomState = (randomState + 0x6d2b79f5) | 0
      let value = Math.imul(randomState ^ (randomState >>> 15), 1 | randomState)
      value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296
    }
    const resetStream = (stream: number) => {
      const offset = stream * 3
      streams[offset] = def.center[0] + (random() - 0.5) * seedSpread * 2
      streams[offset + 1] = def.center[1] + (random() - 0.5) * seedSpread * 2
      streams[offset + 2] = def.center[2] + (random() - 0.5) * seedSpread * 2
    }
    const advanceStream = (stream: number) => {
      const offset = stream * 3
      const x = streams[offset]
      const y = streams[offset + 1]
      const z = streams[offset + 2]
      def.deriv(x, y, z, values, delta)
      const nextX = x + delta[0] * def.dt
      const nextY = y + delta[1] * def.dt
      const nextZ = z + delta[2] * def.dt
      if (!Number.isFinite(nextX + nextY + nextZ) || Math.max(Math.abs(nextX), Math.abs(nextY), Math.abs(nextZ)) > 200) {
        resetStream(stream)
        return
      }
      streams[offset] = nextX
      streams[offset + 1] = nextY
      streams[offset + 2] = nextZ
    }

    const warmupSteps = def.id === 'rossler' ? WARMUP_STEPS * 2 : WARMUP_STEPS
    for (let stream = 0; stream < streamCount; stream++) {
      resetStream(stream)
      for (let step = 0; step < warmupSteps + stream * 11; step++) advanceStream(stream)
    }

    for (let i = 0; i < particleCount; i++) {
      const stream = i % streamCount
      for (let step = 0; step < SEED_SPACING_STEPS + (i % 3); step++) advanceStream(stream)
      const offset = stream * 3
      const jitter = Math.max(0.00002, def.initSpread * 0.00035)
      particles.push({
        x: streams[offset] + (random() - 0.5) * jitter,
        y: streams[offset + 1] + (random() - 0.5) * jitter,
        z: streams[offset + 2] + (random() - 0.5) * jitter,
        trail: new Float32Array(TRAIL_LENGTH * 3),
        trailHead: 0,
        trailCount: 0,
      })
    }
    particlesRef.current = particles
  }, [])

  /* ---- Switch attractor with morph ---- */
  const switchAttractor = useCallback((idx: number) => {
    if (idx === activeIdxRef.current) return
    setActiveIdx(idx)
    activeIdxRef.current = idx
    const def = ATTRACTORS[idx]
    rotRef.current.rx = def.view[0]
    rotRef.current.ry = def.view[1]
    rotRef.current.autoRy = 0
    initParticles(def)
  }, [initParticles])

  /* ---- Mount: complete onboarding, init particles, auto-cycle ---- */
  useEffect(() => {
    controls.completeOnboarding()
    initParticles(ATTRACTORS[0])

    let cycleTimer: number
    let cycleIdx = 0
    const startCycle = () => {
      cycleTimer = window.setInterval(() => {
        if (storyModeRef.current) return
        if (interactedRef.current) {
          window.clearInterval(cycleTimer)
          return
        }
        cycleIdx = (cycleIdx + 1) % ATTRACTORS.length
        switchAttractor(cycleIdx)
      }, 5000)
    }
    const t = window.setTimeout(startCycle, 2000)

    return () => {
      window.clearTimeout(t)
      window.clearInterval(cycleTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls])

  /* ---- Register interaction helper ---- */
  const registerOnce = useCallback(() => {
    if (!interactedRef.current) {
      interactedRef.current = true
      controls.registerInteraction()
    }
  }, [controls])

  /* ---- Main render loop ---- */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const reducedMotion = false
    const delta = new Float64Array(3)
    let raf = 0
    let w = 0
    let h = 0
    let dpr = 1
    let backgroundGradient: CanvasGradient | null = null
    let averageFrameCost = 16
    /**
     * Pressure and recovery are measured in milliseconds, not frames.
     *
     * Counting frames made the relief arrive slowest exactly where it was
     * needed most: ninety frames is a second and a half at 60fps, but well
     * over two minutes on a device managing one frame a second. Anyone on
     * hardware that struggles had left long before the thinning began.
     */
    let pressureMs = 0
    let recoveryMs = 0
    let reducedDensity = false
    const PRESSURE_BEFORE_THINNING_MS = 1_500
    const CALM_BEFORE_RESTORING_MS = 4_000

    const resize = () => {
      w = canvas.clientWidth
      h = canvas.clientHeight
      dpr = Math.min(window.devicePixelRatio || 1, w < 720 ? 1.15 : 1.35)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      backgroundGradient = ctx.createRadialGradient(
        w * 0.5,
        h * 0.44,
        0,
        w * 0.5,
        h * 0.44,
        Math.max(w, h) * 0.58,
      )
      backgroundGradient.addColorStop(0, '#090713')
      backgroundGradient.addColorStop(0.42, '#04050a')
      backgroundGradient.addColorStop(1, '#010205')
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)
    resize()

    const frame = () => {
      const frameStartedAt = performance.now()
      const rot = rotRef.current
      if (!rot.dragging && !reducedMotion) {
        rot.autoRy += 0.0012
      }
      const ry = rot.ry + rot.autoRy
      const rx = rot.rx

      const cosRy = Math.cos(ry)
      const sinRy = Math.sin(ry)
      const cosRx = Math.cos(rx)
      const sinRx = Math.sin(rx)

      const def = ATTRACTORS[activeIdxRef.current]
      const params: Record<string, number> = {}
      for (const p of def.params) {
        params[p.key] = paramRef.current[`${def.id}.${p.key}`] ?? p.default
      }

      const particles = particlesRef.current
      const dt = def.dt
      const stageScale = w < 720
        ? 0.68
        : Math.max(0.84, Math.min(1, h / 900))
      const scale = def.scale * stageScale

      /* -- Physics step. Reuse one derivative buffer and ring-buffer trails. -- */
      const stepCount = reducedMotion ? 1 : def.stepsPerFrame
      for (let step = 0; step < stepCount; step++) {
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i]
          def.deriv(p.x, p.y, p.z, params, delta)
          p.x += delta[0] * dt
          p.y += delta[1] * dt
          p.z += delta[2] * dt

          if (!isFinite(p.x) || !isFinite(p.y) || !isFinite(p.z) ||
              Math.abs(p.x) > 200 || Math.abs(p.y) > 200 || Math.abs(p.z) > 200) {
            p.x = def.center[0] + (Math.random() - 0.5) * def.initSpread * 2
            p.y = def.center[1] + (Math.random() - 0.5) * def.initSpread * 2
            p.z = def.center[2] + (Math.random() - 0.5) * def.initSpread * 2
            p.trailHead = 0
            p.trailCount = 0
            continue
          }

          if (step === stepCount - 1) {
            const offset = p.trailHead * 3
            p.trail[offset] = p.x
            p.trail[offset + 1] = p.y
            p.trail[offset + 2] = p.z
            p.trailHead = (p.trailHead + 1) % TRAIL_LENGTH
            p.trailCount = Math.min(TRAIL_LENGTH, p.trailCount + 1)
          }
        }
      }

      /* -- Clear -- */
      ctx.fillStyle = backgroundGradient ?? '#030508'
      ctx.fillRect(0, 0, w, h)

      /* -- Keep the original luminous density while batching tens of
             thousands of trail segments by age, depth, and velocity. -- */
      const cx = w / 2
      const cy = h * (w < 720 ? 0.4 : 0.45)
      const minDepth = CAM_DIST - 150
      const maxDepth = CAM_DIST + 150
      const trailPaths = Array.from(
        { length: DRAW_BUCKETS * TRAIL_AGE_BUCKETS },
        () => new Path2D(),
      )
      const headPaths = Array.from({ length: DRAW_BUCKETS }, () => new Path2D())

      for (let i = 0; i < particles.length; i++) {
        // Keep the full simulation state, but on a persistently slow device
        // omit one in four draws. This is gentler than shortening every trail
        // or collapsing the attractor to one sparse orbit.
        if (reducedDensity && i % 4 === 0) continue
        const p = particles[i]
        const sx3 = (p.x - def.center[0]) * scale
        const sy3 = (p.y - def.center[1]) * scale
        const sz3 = (p.z - def.center[2]) * scale

        const rx1 = sx3 * cosRy - sz3 * sinRy
        const rz1 = sx3 * sinRy + sz3 * cosRy
        const ry1 = sy3 * cosRx - rz1 * sinRx
        const rz2 = sy3 * sinRx + rz1 * cosRx

        const depth = rz2 + CAM_DIST
        if (depth < 10) continue
        const persp = FOV / depth
        const screenX = cx + rx1 * persp
        const screenY = cy + ry1 * persp

        let vel = 0
        if (p.trailCount >= 2) {
          const last = (p.trailHead - 1 + TRAIL_LENGTH) % TRAIL_LENGTH
          const prev = (p.trailHead - 2 + TRAIL_LENGTH) % TRAIL_LENGTH
          const lastOffset = last * 3
          const prevOffset = prev * 3
          vel = Math.hypot(
            p.trail[lastOffset] - p.trail[prevOffset],
            p.trail[lastOffset + 1] - p.trail[prevOffset + 1],
            p.trail[lastOffset + 2] - p.trail[prevOffset + 2],
          )
        }

        const depthNorm = Math.max(0, Math.min(1, (depth - minDepth) / (maxDepth - minDepth)))
        const brightness = 0.15 + 0.85 * (1 - depthNorm)
        const velocity = Math.min(1, vel * 8)
        const headBucket = Math.min(
          DRAW_BUCKETS - 1,
          Math.floor((brightness * 0.62 + velocity * 0.38) * DRAW_BUCKETS),
        )

        let hasPreviousPoint = false
        let previousX = 0
        let previousY = 0
        const oldest = (p.trailHead - p.trailCount + TRAIL_LENGTH) % TRAIL_LENGTH
        for (let t = 0; t < p.trailCount; t++) {
          const trailIndex = (oldest + t) % TRAIL_LENGTH
          const trailOffset = trailIndex * 3
          const tx3 = (p.trail[trailOffset] - def.center[0]) * scale
          const ty3 = (p.trail[trailOffset + 1] - def.center[1]) * scale
          const tz3 = (p.trail[trailOffset + 2] - def.center[2]) * scale
          const trx = tx3 * cosRy - tz3 * sinRy
          const trz = tx3 * sinRy + tz3 * cosRy
          const try_ = ty3 * cosRx - trz * sinRx
          const trz2 = ty3 * sinRx + trz * cosRx
          const td = trz2 + CAM_DIST
          if (td < 10) continue
          const trailPerspective = FOV / td
          const trailX = cx + trx * trailPerspective
          const trailY = cy + try_ * trailPerspective

          if (hasPreviousPoint) {
            const trailDepthNorm = Math.max(0, Math.min(1, (td - minDepth) / (maxDepth - minDepth)))
            const trailBrightness = 0.12 + 0.88 * (1 - trailDepthNorm)
            const trailBucket = Math.min(
              DRAW_BUCKETS - 1,
              Math.floor((trailBrightness * 0.68 + velocity * 0.32) * DRAW_BUCKETS),
            )
            const age = t / Math.max(1, p.trailCount - 1)
            const ageBucket = Math.min(
              TRAIL_AGE_BUCKETS - 1,
              Math.floor(age * TRAIL_AGE_BUCKETS),
            )
            const path = trailPaths[ageBucket * DRAW_BUCKETS + trailBucket]
            path.moveTo(previousX, previousY)
            path.lineTo(trailX, trailY)
          }
          previousX = trailX
          previousY = trailY
          hasPreviousPoint = true
        }

        const size = Math.max(0.5, 1.8 * brightness)
        const headPath = headPaths[headBucket]
        headPath.moveTo(screenX + size, screenY)
        headPath.arc(screenX, screenY, size, 0, Math.PI * 2)
      }

      ctx.globalCompositeOperation = 'lighter'
      for (let ageBucket = 0; ageBucket < TRAIL_AGE_BUCKETS; ageBucket++) {
        const age = (ageBucket + 1) / TRAIL_AGE_BUCKETS
        for (let bucket = 0; bucket < DRAW_BUCKETS; bucket++) {
          const intensity = (bucket + 0.5) / DRAW_BUCKETS
          const whiten = 0.2 + intensity * 0.72
          const r = Math.round(def.accent[0] + (255 - def.accent[0]) * whiten)
          const g = Math.round(def.accent[1] + (255 - def.accent[1]) * whiten)
          const b = Math.round(def.accent[2] + (255 - def.accent[2]) * whiten)
          const path = trailPaths[ageBucket * DRAW_BUCKETS + bucket]

          // The broad halo matters most around the recent bright segment.
          // The old trail keeps its fine line, avoiding an expensive full
          // canvas overdraw while preserving the shape and information.
          if (ageBucket >= TRAIL_AGE_BUCKETS - 2) {
            ctx.strokeStyle = `rgba(${r},${g},${b},${(0.018 + intensity * 0.064) * age})`
            ctx.lineWidth = 1.8 + intensity * 1.55
            ctx.stroke(path)
          }

          ctx.strokeStyle = `rgba(${r},${g},${b},${(0.055 + intensity * 0.23) * age})`
          ctx.lineWidth = 0.42 + intensity * 0.78
          ctx.stroke(path)
        }
      }

      for (let bucket = 0; bucket < DRAW_BUCKETS; bucket++) {
        const intensity = (bucket + 0.5) / DRAW_BUCKETS
        const whiten = 0.38 + intensity * 0.6
        const r = Math.round(def.accent[0] + (255 - def.accent[0]) * whiten)
        const g = Math.round(def.accent[1] + (255 - def.accent[1]) * whiten)
        const b = Math.round(def.accent[2] + (255 - def.accent[2]) * whiten)
        ctx.fillStyle = `rgba(${r},${g},${b},${0.22 + intensity * 0.72})`
        ctx.fill(headPaths[bucket])
      }

      ctx.globalCompositeOperation = 'source-over'

      const frameCost = performance.now() - frameStartedAt
      averageFrameCost = averageFrameCost * 0.96 + frameCost * 0.04
      if (!reducedMotion && averageFrameCost > 30) {
        pressureMs += frameCost
        recoveryMs = 0
        if (pressureMs > PRESSURE_BEFORE_THINNING_MS) reducedDensity = true
      } else if (reducedDensity && averageFrameCost < 21) {
        recoveryMs += frameCost
        pressureMs = 0
        if (recoveryMs > CALM_BEFORE_RESTORING_MS) reducedDensity = false
      } else {
        pressureMs = Math.max(0, pressureMs - frameCost)
        recoveryMs = Math.max(0, recoveryMs - frameCost)
      }

      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)
    return () => {
      resizeObserver.disconnect()
      cancelAnimationFrame(raf)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---- Pointer handlers for orbit ---- */
  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLCanvasElement>) => {
    registerOnce()
    const rot = rotRef.current
    rot.dragging = true
    rot.lastX = e.clientX
    rot.lastY = e.clientY
    canvasRef.current?.setPointerCapture(e.pointerId)
  }, [registerOnce])

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLCanvasElement>) => {
    const rot = rotRef.current
    if (!rot.dragging) return
    const dx = e.clientX - rot.lastX
    const dy = e.clientY - rot.lastY
    rot.ry += dx * 0.005
    rot.rx += dy * 0.005
    rot.rx = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rot.rx))
    rot.lastX = e.clientX
    rot.lastY = e.clientY
  }, [])

  const onPointerUp = useCallback(() => {
    rotRef.current.dragging = false
  }, [])

  /* ---- Param change ---- */
  const onParamChange = useCallback((key: string, value: number) => {
    registerOnce()
    setParamValues((prev) => ({ ...prev, [key]: value }))
  }, [registerOnce])

  /* ---- Guide steps ---- */
  const guideSteps: Array<GuideStep> = [
    {
      title: tx('这些图形是咋来的？'),
      body: tx('不是随机涂鸦，也不是预画好的 3D 模型。有一套公式在说：「状态下一刻往哪走」。光点跟着规则跑，跑久了就留下这团形状。'),
      action: () => switchAttractor(0),
      durationMs: 5600,
    },
    {
      title: tx('光点 = 状态，不是星星'),
      body: tx('每个光点代表系统此刻的三个数 (x, y, z)。位置不是前后左右的真实空间，而是「状态地图」上的坐标。右上角公式只做一件事：根据此刻算出下一小步。'),
      action: () => switchAttractor(0),
      durationMs: 5800,
    },
    {
      title: tx('被吸住，却停不下'),
      body: tx('无论从附近哪点出发，轨迹都会被吸进同一片区域——像碗底。但不会停在一点，也不会画出完全相同的一圈。这就是「吸引子」。'),
      action: () => switchAttractor(1),
      durationMs: 5600,
    },
    {
      title: tx('换方程，换肖像'),
      body: tx('洛伦兹长出双翼，罗斯勒像一条螺旋带，朗福德绕成空心球壳……点底部名字切换，右上角公式会跟着换。形状是方程长时间运行后留下的几何痕迹。'),
      action: () => switchAttractor(3),
      durationMs: 5200,
    },
    {
      title: tx('拉伸再折回'),
      body: tx('方程把相邻状态拉开，又折回有限区域——像揉面。所以形状有界却永不闭合。规则里没有骰子，长期却仍难精确预测。拖动画布旋转，再自己换一种方程。'),
      action: () => switchAttractor(0),
      durationMs: 6200,
    },
  ]

  const activeDef = ATTRACTORS[activeIdx]
  const isEnglish = locale === 'en'

  return (
    <div className={`oss-experience sa-experience${storyMode ? ' is-story' : ' is-free'}`}>
      <canvas
        ref={canvasRef}
        className="sa-canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />

      {!storyMode && (
        <header className="sa-header" data-experience-overlay="true">
          <h1>{tx('这些发光的形状从哪来？')}</h1>
          <p>{tx('每套公式规定状态如何更新；光点跟着跑，久了就织成永不重复的几何肖像。点底部名字切换方程，拖动画布旋转。')}</p>
        </header>
      )}

      <div className="sa-name-display" data-experience-overlay="true">
        <div className="sa-name-main">{isEnglish ? activeDef.nameEn : activeDef.name}</div>
        <div className="sa-name-sub">{isEnglish ? activeDef.name : activeDef.nameEn}</div>
        <div className="sa-name-note">{isEnglish ? activeDef.noteEn : activeDef.note}</div>
        <div className="sa-equation" aria-label={tx('当前吸引子的微分方程')}>
          {activeDef.equations.map((equation) => (
            <span key={equation}>{equation}</span>
          ))}
          <small>{tx('ẋ 表示 x 此刻变化得有多快')}</small>
        </div>
      </div>

      {!storyMode && (
        <Freebar
          className="sa-freebar"
          mainClassName="sa-freebar-main"
          ariaLabel={tx('参数')}
          primaryControlBudget={1}
          secondaryDefault="closed"
          secondary={(
            <div className="sa-params">
              {activeDef.params.map((p) => {
                const key = `${activeDef.id}.${p.key}`
                const val = paramValues[key] ?? p.default
                return (
                  <label className="sa-param-row experience-freebar-field" key={key}>
                    <span>
                      <i>{p.label}</i>
                      <strong className="sa-param-val">{val.toFixed(2)}</strong>
                    </span>
                    <input
                      type="range"
                      min={p.min}
                      max={p.max}
                      step={p.step}
                      value={val}
                      aria-label={`${isEnglish ? activeDef.nameEn : activeDef.name} ${p.label}`}
                      onChange={(e) => onParamChange(key, Number(e.target.value))}
                    />
                  </label>
                )
              })}
              <button type="button" className="sa-why-chip" onClick={() => setWhyOpen(true)}>
                <Question weight="bold" /> {tx('看懂')}
              </button>
            </div>
          )}
        >
          <nav className="sa-selector experience-freebar-rail" aria-label={tx('选择一种奇异吸引子')}>
            {ATTRACTORS.map((a, idx) => (
              <button
                key={a.id}
                type="button"
                className={`sa-pill${idx === activeIdx ? ' is-active' : ''}`}
                onClick={() => {
                  registerOnce()
                  switchAttractor(idx)
                }}
              >
                {isEnglish ? a.nameEn : a.name}
              </button>
            ))}
            <button
              type="button"
              className="experience-freebar-story"
              onClick={() => {
                registerOnce()
                enterStory()
                replayGuide('strange-attractors')
              }}
              aria-label={tx('重播故事')}
            >
              <FilmStrip weight="fill" aria-hidden="true" />
              <span>{tx('故事')}</span>
            </button>
          </nav>
        </Freebar>
      )}

      {whyOpen && (
        <div className="sa-why" role="dialog" aria-label={tx('奇异吸引子原理解释')} data-experience-overlay="true">
          <div className="sa-why-card">
            <button type="button" className="sa-why-close" onClick={() => setWhyOpen(false)} aria-label={tx('关闭')}>
              <X weight="bold" />
            </button>
            <h2>{tx('图形是怎么画出来的？')}</h2>
            <p>
              {tx('先选一套微分方程——它只回答「状态下一刻往哪走」。从某个起点开始，按公式一小步一小步往前算，把经过的状态连成轨迹。跑够久，轨迹就会被吸进一片有限区域，留下你看到的双翼、螺旋或球壳。')}
            </p>
            <p>
              <strong>{tx('为什么叫「吸引子」？')}</strong>
              {tx('许多不同的起点经过一段时间后，都会被带到同一片区域附近。轨迹被它吸住，却不会停下，也不会画出完全相同的一圈。')}
            </p>
            <p>
              <strong>{tx('为什么又叫「奇异」？')}</strong>
              {tx('方程会把靠得很近的状态拉开，再把它们折回有限区域——像揉面。两条起初几乎重合的轨迹，后来可能去往双翼的不同一侧。规则没有随机数，长期结果却难以精确预测。')}
            </p>
            <p>
              {tx('1963 年，气象学家爱德华·洛伦兹用简化的大气对流方程展示了这种「确定但难以预测」的运动。相邻轨迹的快速分离，数学上可用正的李雅普诺夫指数描述；反复拉伸与折回留下的集合则具有分形结构。')}
            </p>
            <div className="sa-why-equation">
              <strong>{isEnglish ? activeDef.nameEn : activeDef.name}</strong>
              {activeDef.equations.map((equation) => (
                <code key={equation}>{equation}</code>
              ))}
              <small>{tx('圆点不是装饰：每一帧都在按这三行规则向前走。')}</small>
            </div>
            <p>
              <span className="is-red">{tx('边界条件：')}</span>
              {tx('本页用有限粒子和欧拉法近似计算，再把三维状态投影到屏幕。它展示的是方程的几何行为，不是天气预报器；经典参数下洛伦兹吸引子的分形维数约为 2.06。')}
            </p>
            <small>{tx('继续探索：切换六种方程，再轻轻拖动参数，观察稳定形状如何变形或消失。')}</small>
          </div>
        </div>
      )}

      <GuideTour
        worldId="strange-attractors"
        steps={guideSteps}
        defaultOpen={storyMode}
        placement="stage"
        stagePlan={[
          { position: 'top-left', mobilePosition: 'top-left', treatment: 'monumental', width: 'wide' },
          { position: 'top-right', mobilePosition: 'top-left', treatment: 'annotation', cue: 'left' },
          { position: 'bottom-left', mobilePosition: 'bottom-left', treatment: 'caption', cue: 'right' },
          { position: 'bottom-right', mobilePosition: 'bottom-left', treatment: 'editorial' },
          { position: 'top-left', mobilePosition: 'top-left', treatment: 'monumental' },
        ]}
        showReplayChip={false}
        onExit={enterFree}
      />
      {!storyMode && (
        <GhostHint
          worldId="strange-attractors"
          gesture={{ type: 'drag', target: '.sa-canvas', dx: 80, dy: -30, label: tx('拖拽旋转') }}
        />
      )}
    </div>
  )
}
