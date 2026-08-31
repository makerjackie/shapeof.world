import './styles/LightningLab.css'

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

import { FilmStrip } from '@phosphor-icons/react'

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
type LightningBeat = 0 | 1 | 2 | 3 | 4 | 5

type Pt = { x: number; y: number }

type Branch = {
  pts: Array<Pt>
  depth: number
  /** 0–1：沿主通道何处分叉（回击时按此延迟亮起） */
  attachT: number
}

type Bolt = {
  pts: Array<Pt>
  branches: Array<Branch>
  age: number
  phase: 'leader' | 'return' | 'glow' | 'restrike' | 'dead'
  leaderFrac: number
  returnFrac: number
  restrikeFrac: number
  restrikeCount: number
  restrikesLeft: number
  speed: number
  stepAccum: number
  flash: number
  branchCount: number
  peakKa: number
  showSteps: boolean
  originX: number
  groundX: number
  thickness: number
  hue: number
}

type RainDrop = { x: number; y: number; speed: number; len: number; alpha: number }

type SheetFlash = { x: number; y: number; r: number; age: number; dur: number; double: boolean }

type CloudBlob = {
  x: number
  y: number
  rx: number
  ry: number
  shade: number
  drift: number
  layer: number
}

type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number }

const GROUND_Y = 0.86
const CLOUD_TOP = 0.02
const CLOUD_BASE = 0.28

function rand(a = 0, b = 1) {
  return a + Math.random() * (b - a)
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v))
}

function displaceSegment(pts: Array<Pt>, offset: number): Array<Pt> {
  const next: Array<Pt> = [pts[0]]
  for (let i = 0; i < pts.length - 1; i += 1) {
    const a = pts[i]
    const b = pts[i + 1]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy) || 1
    // 偏向水平扰动 → 更像真实阶梯先导的“锯齿”
    const nx = -dy / len
    const ny = dx / len
    const bias = (Math.random() * 2 - 1) * 0.35
    const disp = (Math.random() * 2 - 1 + bias) * offset * len
    next.push(
      {
        x: (a.x + b.x) / 2 + nx * disp,
        y: (a.y + b.y) / 2 + ny * disp * 0.85,
      },
      b,
    )
  }
  return next
}

function fractalPolyline(start: Pt, end: Pt, chaos: number, iterations: number): Array<Pt> {
  let pts: Array<Pt> = [start, end]
  let offset = 0.11 + chaos * 0.28
  for (let level = 0; level < iterations; level += 1) {
    pts = displaceSegment(pts, offset)
    offset *= 0.48
  }
  return pts
}

function generateBranch(
  origin: Pt,
  angle: number,
  length: number,
  chaos: number,
  depth: number,
  attachT: number,
): Branch {
  const end = {
    x: origin.x + Math.cos(angle) * length,
    y: origin.y + Math.sin(angle) * length,
  }
  // 分叉略向下偏，避免横飞出画面
  end.y = Math.min(GROUND_Y - 0.04, end.y)
  const pts = fractalPolyline(origin, end, chaos * 0.9, 5 + depth)
  return { pts, depth, attachT }
}

function generateBolt(
  targetX: number,
  chaos: number,
  branchDensity: number,
): { pts: Array<Pt>; branches: Array<Branch>; branchCount: number; groundX: number } {
  const start = {
    x: clamp(targetX + rand(-0.1, 0.1), 0.06, 0.94),
    y: CLOUD_BASE + rand(-0.05, 0.01),
  }
  // 终点可略偏移：真实闪电不会笔直落地
  const groundX = clamp(targetX + rand(-0.08, 0.08) * (0.4 + chaos), 0.05, 0.95)
  const end = { x: groundX, y: GROUND_Y + rand(-0.005, 0.012) }

  // 先做粗糙折线，再细分 → 大尺度弯折 + 小锯齿
  const midY = rand(0.42, 0.58)
  const midX = clamp((start.x + end.x) / 2 + rand(-0.12, 0.12) * chaos, 0.05, 0.95)
  let coarse: Array<Pt> = [start, { x: midX, y: midY }, end]
  coarse = displaceSegment(coarse, 0.14 + chaos * 0.1)
  coarse = displaceSegment(coarse, 0.09 + chaos * 0.08)

  let pts = coarse
  let offset = 0.09 + chaos * 0.2
  const iterations = 8
  const branches: Array<Branch> = []

  for (let level = 0; level < iterations; level += 1) {
    const next: Array<Pt> = [pts[0]]
    for (let i = 0; i < pts.length - 1; i += 1) {
      const a = pts[i]
      const b = pts[i + 1]
      const dx = b.x - a.x
      const dy = b.y - a.y
      const len = Math.hypot(dx, dy) || 1
      const disp = (Math.random() * 2 - 1) * offset * len
      const mid = {
        x: (a.x + b.x) / 2 + (-dy / len) * disp,
        y: (a.y + b.y) / 2 + (dx / len) * disp * 0.9,
      }

      // 只在粗尺度层级分叉，控制在「看得见的几根」而不是几百根细刺
      const tAlong = i / Math.max(1, pts.length - 1)
      const midHeight = (a.y + b.y) / 2
      const primaryForks = branches.filter((b) => b.depth === 1).length
      const branchChance =
        level >= 2 &&
        level <= 4 &&
        primaryForks < 2 + Math.floor(branchDensity * 5) &&
        midHeight > 0.34 &&
        midHeight < 0.7
          ? branchDensity * 0.055 * (1.2 - level * 0.15)
          : 0

      if (Math.random() < branchChance) {
        const baseAngle = Math.atan2(dy, dx)
        const side = Math.random() > 0.5 ? 1 : -1
        const forkAngle = baseAngle + side * rand(0.45, 1.0)
        const forkLen = len * rand(2.2, 4.5) * (0.75 + branchDensity * 0.4)
        const attachT = clamp(tAlong + rand(-0.04, 0.04), 0.1, 0.88)
        branches.push(
          generateBranch(mid, forkAngle, Math.min(forkLen, 0.42), chaos, 1, attachT),
        )
        if (Math.random() < branchDensity * 0.35) {
          const sub = branches[branches.length - 1]
          const sp = sub.pts[Math.floor(sub.pts.length * rand(0.35, 0.7))]
          branches.push(
            generateBranch(
              sp,
              forkAngle + side * rand(0.25, 0.65),
              forkLen * rand(0.28, 0.48),
              chaos,
              2,
              attachT + 0.05,
            ),
          )
        }
      }

      next.push(mid, b)
    }
    pts = next
    offset *= 0.5
  }

  // HUD 只报「主分叉」数量，避免把碎裂细枝算进去
  // 随机生长偶尔会得到几乎笔直的主通道。为每一次落雷保留可读的“竞争通道”，
  // 再沿主通道补足少量大分叉；它们仍然从局部通道方向向下生长。
  const desiredPrimary = Math.max(1, Math.round(1.5 + branchDensity * 4.5))
  let primaryCount = branches.filter((branch) => branch.depth === 1).length
  let guard = 0
  while (primaryCount < desiredPrimary && guard < 10) {
    const attachT = clamp(0.24 + primaryCount * 0.115 + rand(-0.035, 0.035), 0.2, 0.8)
    const index = Math.min(pts.length - 2, Math.max(1, Math.floor(attachT * (pts.length - 1))))
    const origin = pts[index]
    const before = pts[Math.max(0, index - 1)]
    const after = pts[Math.min(pts.length - 1, index + 1)]
    const baseAngle = Math.atan2(after.y - before.y, after.x - before.x)
    const side = primaryCount % 2 === 0 ? 1 : -1
    const branch = generateBranch(
      origin,
      baseAngle + side * rand(0.48, 0.9),
      rand(0.11, 0.2) * (0.82 + branchDensity * 0.45),
      chaos,
      1,
      attachT,
    )
    branches.push(branch)
    primaryCount += 1
    guard += 1

    if (branchDensity > 0.68 && primaryCount % 2 === 0) {
      const subOrigin = branch.pts[Math.floor(branch.pts.length * 0.62)]
      branches.push(
        generateBranch(
          subOrigin,
          baseAngle + side * rand(0.75, 1.12),
          rand(0.045, 0.085),
          chaos,
          2,
          Math.min(0.92, attachT + 0.08),
        ),
      )
    }
  }

  const branchCount = primaryCount
  return { pts, branches, branchCount, groundX }
}

function makeClouds(): Array<CloudBlob> {
  const blobs: Array<CloudBlob> = []
  // 远层薄云
  for (let i = 0; i < 8; i += 1) {
    blobs.push({
      x: (i / 8) * 1.35 - 0.18 + rand(-0.05, 0.05),
      y: rand(CLOUD_TOP, 0.12),
      rx: rand(0.18, 0.34),
      ry: rand(0.04, 0.07),
      shade: rand(0.35, 0.55),
      drift: rand(0.001, 0.004) * (Math.random() > 0.5 ? 1 : -1),
      layer: 0,
    })
  }
  // 中层体积云
  for (let i = 0; i < 12; i += 1) {
    blobs.push({
      x: (i / 12) * 1.4 - 0.2 + rand(-0.06, 0.06),
      y: rand(0.08, CLOUD_BASE - 0.04),
      rx: rand(0.14, 0.3),
      ry: rand(0.05, 0.1),
      shade: rand(0.55, 0.95),
      drift: rand(0.002, 0.007) * (Math.random() > 0.5 ? 1 : -1),
      layer: 1,
    })
  }
  // 近层压低的砧状云底
  for (let i = 0; i < 7; i += 1) {
    blobs.push({
      x: (i / 7) * 1.2 - 0.1 + rand(-0.04, 0.04),
      y: rand(CLOUD_BASE - 0.08, CLOUD_BASE + 0.01),
      rx: rand(0.16, 0.28),
      ry: rand(0.035, 0.065),
      shade: rand(0.7, 1),
      drift: rand(0.0015, 0.004),
      layer: 2,
    })
  }
  return blobs
}

function makeRain(count: number): Array<RainDrop> {
  return Array.from({ length: count }, () => ({
    x: Math.random(),
    y: Math.random(),
    speed: rand(0.65, 1.35),
    len: rand(0.02, 0.055),
    alpha: rand(0.05, 0.14),
  }))
}

export function LightningLab({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [branchDensity, setBranchDensity] = useState(62)
  const [chaos, setChaos] = useState(58)
  const [autoStorm, setAutoStorm] = useState(true)
  const [beat, setBeat] = useState<LightningBeat>(0)
  const [lastStrike, setLastStrike] = useState<{ branches: number; ka: number } | null>(null)
  const { storyMode, enterFree, enterStory } = useStoryFreeMode('lightning-lab')

  const sim = useRef({
    bolts: [] as Array<Bolt>,
    sparks: [] as Array<Spark>,
    clouds: makeClouds(),
    rain: makeRain(180),
    sheets: [] as Array<SheetFlash>,
    sheetTimer: rand(1.2, 3.2),
    charge: 0,
    chargeTarget: rand(2.4, 4.8),
    showCharge: false,
    welcomeFired: false,
    beat: 0 as LightningBeat,
    branchDensity: 0.62,
    chaos: 0.58,
    autoStorm: true,
    storyMode: true,
    time: 0,
    lastNow: 0,
    flashGlobal: 0,
    shake: 0,
    pendingHud: null as { branches: number; ka: number } | null,
  })

  sim.current.beat = beat
  sim.current.branchDensity = branchDensity / 100
  sim.current.chaos = chaos / 100
  sim.current.autoStorm = autoStorm
  sim.current.storyMode = storyMode

  const returnToFree = useCallback(() => {
    enterFree()
    setBeat(0)
    sim.current.beat = 0
    sim.current.showCharge = false
  }, [enterFree])

  useEffect(() => {
    controls.completeOnboarding()
  }, [controls])

  const strike = useCallback(
    (
      targetX: number,
      opts?: {
        speed?: number
        branches?: number
        showSteps?: boolean
        restrikes?: number
        thickness?: number
      },
    ) => {
      const s = sim.current
      const density = opts?.branches !== undefined ? opts.branches : s.branchDensity
      const { pts, branches, branchCount, groundX } = generateBolt(targetX, s.chaos, density)
      const bolt: Bolt = {
        pts,
        branches,
        age: 0,
        phase: 'leader',
        leaderFrac: 0,
        returnFrac: 0,
        restrikeFrac: 0,
        restrikeCount: 0,
        restrikesLeft: opts?.restrikes ?? (Math.random() < 0.55 ? 1 : Math.random() < 0.25 ? 2 : 0),
        speed: opts?.speed ?? 1,
        stepAccum: 0,
        flash: 0,
        branchCount,
        peakKa: Math.round(rand(40, 280) * (0.7 + density * 0.6)),
        showSteps: opts?.showSteps ?? false,
        originX: targetX,
        groundX,
        thickness: opts?.thickness ?? rand(0.85, 1.25),
        hue: rand(0, 1),
      }
      s.bolts.push(bolt)
      if (s.bolts.length > 5) s.bolts.shift()
      return bolt
    },
    [],
  )

  useEffect(() => {
    const timers: Array<number> = []
    const later = (delay: number, action: () => void) => {
      timers.push(window.setTimeout(action, delay))
    }

    if (beat === 0) {
      sim.current.showCharge = false
      return () => timers.forEach(window.clearTimeout)
    }
    if (beat === 1) {
      sim.current.showCharge = false
      sim.current.bolts = []
      strike(0.5, { speed: 1.15, branches: 0.76, restrikes: 1, thickness: 1.28 })
      later(2100, () => {
        if (sim.current.beat === 1) strike(0.47, { speed: 1.28, branches: 0.68, restrikes: 1, thickness: 1.12 })
      })
      later(4200, () => {
        if (sim.current.beat === 1) strike(0.55, { speed: 1.18, branches: 0.82, restrikes: 0, thickness: 1.22 })
      })
    } else if (beat === 2) {
      sim.current.showCharge = true
      sim.current.sheets.push({ x: 0.5, y: 0.18, r: 0.42, age: 0, dur: 0.9, double: true })
      later(2900, () => {
        if (sim.current.beat === 2) {
          sim.current.sheets.push({ x: 0.42, y: 0.2, r: 0.35, age: 0, dur: 0.72, double: true })
        }
      })
    } else if (beat === 3) {
      sim.current.showCharge = false
      sim.current.bolts = []
      strike(0.5, { speed: 0.3, branches: 0.12, showSteps: true, restrikes: 0, thickness: 1.05 })
    } else if (beat === 4) {
      sim.current.bolts = []
      strike(0.54, { branches: 0.98, restrikes: 2, thickness: 1.38, speed: 1.16 })
      later(520, () => {
        if (sim.current.beat === 4) strike(0.28, { branches: 0.74, restrikes: 0, thickness: 0.92, speed: 1.2 })
      })
      later(2850, () => {
        if (sim.current.beat === 4) strike(0.72, { branches: 0.88, restrikes: 1, thickness: 1.06, speed: 1.28 })
      })
    } else if (beat === 5) {
      sim.current.showCharge = false
    }

    return () => timers.forEach(window.clearTimeout)
  }, [beat, strike])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    let width = 1
    let height = 1
    let dpr = 1
    let frame = 0

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

    const toPx = (p: Pt): [number, number] => [p.x * width, p.y * height]

    const hillY = (xNorm: number) => {
      const groundTop = height * GROUND_Y
      return (
        groundTop +
        Math.sin(xNorm * Math.PI * 2.2 + 0.8) * height * 0.016 +
        Math.sin(xNorm * Math.PI * 5.1) * height * 0.007 +
        Math.sin(xNorm * Math.PI * 11.3 + 1.2) * height * 0.003
      )
    }

    const drawPolyline = (pts: Array<Pt>, count: number, fromEnd = false) => {
      const start = fromEnd ? Math.max(0, pts.length - count) : 0
      const end = fromEnd ? pts.length : Math.min(count, pts.length)
      if (end - start < 2) return
      ctx.beginPath()
      for (let i = start; i < end; i += 1) {
        const [px, py] = toPx(pts[i])
        if (i === start) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
    }

    const bloomStroke = (
      pts: Array<Pt>,
      count: number,
      intensity: number,
      thickness: number,
      fromEnd = false,
      purple = 0,
    ) => {
      if (count < 2) return
      const r = Math.round(180 + purple * 40)
      const g = Math.round(210 - purple * 70)
      const b = 255
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      // Outer soft bloom
      drawPolyline(pts, count, fromEnd)
      ctx.strokeStyle = `rgba(${r - 40}, ${g - 20}, ${b}, ${0.08 * intensity})`
      ctx.lineWidth = 22 * thickness * (0.7 + intensity * 0.4)
      ctx.shadowColor = `rgba(${r}, ${g}, 255, ${0.55 * intensity})`
      ctx.shadowBlur = 42 * intensity
      ctx.stroke()

      // Mid corona
      drawPolyline(pts, count, fromEnd)
      ctx.strokeStyle = `rgba(${Math.min(255, r + 20)}, ${Math.min(255, g + 15)}, 255, ${0.22 * intensity})`
      ctx.lineWidth = 9 * thickness
      ctx.shadowBlur = 18 * intensity
      ctx.stroke()

      // Bright sheath
      drawPolyline(pts, count, fromEnd)
      ctx.strokeStyle = `rgba(230, 242, 255, ${0.55 * intensity})`
      ctx.lineWidth = 3.4 * thickness
      ctx.shadowBlur = 8
      ctx.stroke()

      // White-hot core
      drawPolyline(pts, count, fromEnd)
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * intensity})`
      ctx.lineWidth = 1.35 * thickness
      ctx.shadowBlur = 0
      ctx.stroke()
    }

    const paint = (now: number) => {
      const s = sim.current
      const dt = s.lastNow ? Math.min(0.05, (now - s.lastNow) / 1000) : 0.016
      s.lastNow = now
      s.time += dt

      // Welcome strike
      if (!s.welcomeFired && !s.storyMode && s.time > 0.45) {
        s.welcomeFired = true
        if (s.bolts.length === 0) {
          strike(rand(0.38, 0.62), { branches: 0.65, speed: 1.4, restrikes: 1, thickness: 1.2 })
        }
      }

      // Auto storm
      if (s.autoStorm && s.beat === 0) {
        s.charge += dt
        if (s.charge >= s.chargeTarget) {
          s.charge = 0
          s.chargeTarget = rand(1.8, 4.2)
          strike(rand(0.1, 0.9), { speed: rand(1.05, 1.45), restrikes: Math.random() < 0.4 ? 1 : 0 })
        }
      } else if (s.beat !== 0) {
        s.charge = 0
      }

      // Sheet lightning
      s.sheetTimer -= dt
      if (s.sheetTimer <= 0) {
        s.sheetTimer = rand(1.8, 5.5)
        s.sheets.push({
          x: rand(0.12, 0.88),
          y: rand(CLOUD_TOP + 0.04, CLOUD_BASE - 0.06),
          r: rand(0.18, 0.4),
          age: 0,
          dur: rand(0.28, 0.65),
          double: Math.random() > 0.45,
        })
      }
      s.sheets = s.sheets.filter((f) => f.age < f.dur)
      for (const f of s.sheets) f.age += dt

      // Bolt phase machine
      for (const bolt of s.bolts) {
        bolt.age += dt
        if (bolt.phase === 'leader') {
          // 阶梯：离散步进感
          bolt.stepAccum += dt * bolt.speed
          const steps = 18
          const stepDur = bolt.showSteps ? 0.09 : 0.042
          bolt.leaderFrac = Math.min(1, bolt.stepAccum / (steps * stepDur))
          if (bolt.leaderFrac >= 1) {
            bolt.phase = 'return'
            bolt.flash = 1
            s.flashGlobal = Math.max(s.flashGlobal, 1.15)
            s.shake = Math.max(s.shake, 0.85)
            s.pendingHud = { branches: bolt.branchCount, ka: bolt.peakKa }
            // 接地火花
            const gx = bolt.groundX
            const gy = GROUND_Y
            for (let i = 0; i < 14; i += 1) {
              const a = rand(-Math.PI * 0.9, -Math.PI * 0.1)
              s.sparks.push({
                x: gx + rand(-0.01, 0.01),
                y: gy,
                vx: Math.cos(a) * rand(0.08, 0.28),
                vy: Math.sin(a) * rand(0.05, 0.2),
                life: 0,
                max: rand(0.25, 0.55),
                r: rand(1.2, 2.8),
              })
            }
          }
        } else if (bolt.phase === 'return') {
          bolt.returnFrac += dt * (bolt.showSteps ? 4.5 : 14) * Math.max(bolt.speed, 0.7)
          if (bolt.returnFrac >= 1) {
            if (bolt.restrikesLeft > 0) {
              bolt.phase = 'restrike'
              bolt.restrikeFrac = 0
              bolt.restrikesLeft -= 1
              bolt.restrikeCount += 1
              // 短暗期后二次回击
              bolt.returnFrac = 0
            } else {
              bolt.phase = 'glow'
            }
          }
        } else if (bolt.phase === 'restrike') {
          bolt.restrikeFrac += dt * 3.2
          if (bolt.restrikeFrac >= 0.12) {
            bolt.phase = 'return'
            bolt.returnFrac = 0
            bolt.flash = 1
            s.flashGlobal = Math.max(s.flashGlobal, 0.95)
            s.shake = Math.max(s.shake, 0.55)
          }
        }
        bolt.flash = Math.max(0, bolt.flash - dt * 2.6)
      }
      s.bolts = s.bolts.filter((b) => !(b.phase === 'glow' && b.age > 5.2))
      s.flashGlobal = Math.max(0, s.flashGlobal - dt * 2.1)
      s.shake = Math.max(0, s.shake - dt * 3.4)

      // Sparks
      for (const sp of s.sparks) {
        sp.life += dt
        sp.x += sp.vx * dt
        sp.y += sp.vy * dt
        sp.vy += dt * 0.35
      }
      s.sparks = s.sparks.filter((sp) => sp.life < sp.max)

      // Rain
              for (const drop of s.rain) {
          drop.y += drop.speed * dt * 1.05
          drop.x -= dt * 0.045
          if (drop.y > 1.05) {
            drop.y = -0.06
            drop.x = Math.random()
          }
          if (drop.x < -0.05) drop.x = 1.05
        }


      const flash = s.flashGlobal
      const shakeX = (Math.random() - 0.5) * s.shake * 10
      const shakeY = (Math.random() - 0.5) * s.shake * 7

      ctx.save()
      ctx.translate(shakeX, shakeY)

      // ---- Sky ----
      const sky = ctx.createLinearGradient(0, 0, 0, height)
      sky.addColorStop(0, '#02040a')
      sky.addColorStop(0.35, '#070d1c')
      sky.addColorStop(0.7, '#10182c')
      sky.addColorStop(1, '#0a101c')
      ctx.fillStyle = sky
      ctx.fillRect(-20, -20, width + 40, height + 40)

      // Horizon atmospheric band
      const horizon = ctx.createLinearGradient(0, height * 0.55, 0, height * GROUND_Y)
      horizon.addColorStop(0, 'rgba(30, 50, 90, 0)')
      horizon.addColorStop(0.7, `rgba(40, 70, 120, ${0.12 + flash * 0.2})`)
      horizon.addColorStop(1, `rgba(20, 40, 70, ${0.22 + flash * 0.15})`)
      ctx.fillStyle = horizon
      ctx.fillRect(0, height * 0.5, width, height * 0.4)

      // Distant sheet flashes first (behind clouds)
      for (const f of s.sheets) {
        const p = f.age / f.dur
        let pulse = Math.sin(Math.min(1, p) * Math.PI)
        if (f.double && p > 0.38 && p < 0.62) pulse = Math.max(pulse, 0.55 + Math.sin((p - 0.38) * 30) * 0.35)
        const gx = f.x * width
        const gy = f.y * height
        const gr = f.r * width
        const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr)
        grad.addColorStop(0, `rgba(170, 200, 255, ${0.28 * pulse})`)
        grad.addColorStop(0.45, `rgba(110, 150, 220, ${0.12 * pulse})`)
        grad.addColorStop(1, 'rgba(60, 90, 150, 0)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.ellipse(gx, gy, gr, gr * 0.55, 0, 0, Math.PI * 2)
        ctx.fill()
      }

      // Clouds (layered)
      const layers = [0, 1, 2]
      for (const layer of layers) {
        for (const c of s.clouds) {
          if (c.layer !== layer) continue
          const cx =
            ((((c.x + Math.sin(s.time * c.drift * 5 + c.shade) * 0.012) % 1.4) + 1.4) % 1.4) * width -
            width * 0.18
          const cy = c.y * height
          const rx = c.rx * width
          const ry = c.ry * height
          // 闪电从下方照亮云底
          const underlit = flash * (0.35 + c.layer * 0.25) * c.shade
          const base = 18 + c.layer * 6
          const grad = ctx.createRadialGradient(cx, cy + ry * 0.3, rx * 0.08, cx, cy, rx)
          grad.addColorStop(
            0,
            `rgba(${base + underlit * 160}, ${base + 8 + underlit * 170}, ${base + 28 + underlit * 180}, ${0.55 + c.shade * 0.35})`,
          )
          grad.addColorStop(
            0.55,
            `rgba(${12 + underlit * 90}, ${16 + underlit * 100}, ${28 + underlit * 120}, ${0.45 * c.shade})`,
          )
          grad.addColorStop(1, 'rgba(6, 10, 20, 0)')
          ctx.save()
          ctx.translate(cx, cy)
          ctx.scale(1, ry / Math.max(rx, 1))
          ctx.translate(-cx, -cy)
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(cx, cy, rx, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }
      }

      // Charge separation (story)
      if (s.showCharge) {
        const pulse = 0.72 + 0.28 * Math.sin(s.time * 2.6)
        const topY = height * (CLOUD_TOP + 0.07)
        const botY = height * (CLOUD_BASE - 0.05)
        const topGrad = ctx.createLinearGradient(0, topY - height * 0.04, 0, topY + height * 0.06)
        topGrad.addColorStop(0, 'rgba(255, 150, 90, 0)')
        topGrad.addColorStop(0.5, `rgba(255, 150, 90, ${0.14 * pulse})`)
        topGrad.addColorStop(1, 'rgba(255, 150, 90, 0)')
        ctx.fillStyle = topGrad
        ctx.fillRect(width * 0.12, topY - height * 0.04, width * 0.76, height * 0.1)
        const botGrad = ctx.createLinearGradient(0, botY - height * 0.04, 0, botY + height * 0.06)
        botGrad.addColorStop(0, 'rgba(90, 170, 255, 0)')
        botGrad.addColorStop(0.5, `rgba(90, 170, 255, ${0.16 * pulse})`)
        botGrad.addColorStop(1, 'rgba(90, 170, 255, 0)')
        ctx.fillStyle = botGrad
        ctx.fillRect(width * 0.12, botY - height * 0.04, width * 0.76, height * 0.1)

        // Field lines between layers
        ctx.lineWidth = 1
        for (let i = 0; i < 9; i += 1) {
          const gx = width * (0.2 + i * 0.075)
          const wobble = Math.sin(s.time * 1.8 + i) * 8
          ctx.strokeStyle = `rgba(180, 210, 255, ${0.12 * pulse})`
          ctx.beginPath()
          ctx.moveTo(gx + wobble, topY + 8)
          ctx.lineTo(gx - wobble * 0.5, botY - 8)
          ctx.stroke()
        }

        ctx.font = `600 ${Math.max(13, width * 0.014)}px system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        for (let i = 0; i < 8; i += 1) {
          const gx = width * (0.2 + i * 0.08 + Math.sin(s.time * 0.55 + i * 1.4) * 0.012)
          ctx.fillStyle = `rgba(255, 190, 140, ${0.6 * pulse})`
          ctx.fillText('+', gx, topY + Math.cos(s.time * 0.8 + i) * 5)
          ctx.fillStyle = `rgba(140, 205, 255, ${0.65 * pulse})`
          ctx.fillText('−', gx + width * 0.035, botY + Math.sin(s.time * 0.7 + i * 1.8) * 5)
        }
        ctx.font = `500 ${Math.max(11, width * 0.011)}px system-ui, sans-serif`
        ctx.fillStyle = `rgba(255, 200, 160, ${0.8 * pulse})`
        ctx.fillText(tx('正电荷聚集'), width * 0.86, topY)
        ctx.fillStyle = `rgba(150, 210, 255, ${0.85 * pulse})`
        ctx.fillText(tx('负电荷聚集'), width * 0.86, botY)
      }

      // Rain (brightens on flash)
      ctx.lineWidth = 1.1
      for (const drop of s.rain) {
        const dx = drop.x * width
        const dy = drop.y * height
        const a = drop.alpha + flash * 0.12
        ctx.strokeStyle = `rgba(170, 200, 240, ${a})`
        ctx.beginPath()
        ctx.moveTo(dx, dy)
        ctx.lineTo(dx - drop.len * height * 0.18, dy + drop.len * height)
        ctx.stroke()
      }

      // Bolts
      for (const bolt of s.bolts) {
        const glowAge =
          bolt.phase === 'glow' ? Math.min(1, Math.max(0, (bolt.age - 1.4) / 3.2)) : 0
        const baseAlpha = bolt.phase === 'glow' ? Math.max(0, 1 - glowAge) : 1
        if (baseAlpha <= 0.01) continue
        const purple = glowAge

        const revealed =
          bolt.phase === 'leader'
            ? Math.max(2, Math.floor(bolt.leaderFrac * bolt.pts.length))
            : bolt.pts.length

        const isReturn = bolt.phase === 'return' || bolt.phase === 'glow' || bolt.phase === 'restrike'
        const returnPts =
          bolt.phase === 'return'
            ? Math.max(2, Math.floor(bolt.returnFrac * bolt.pts.length))
            : bolt.pts.length

        // Volumetric column during return
        if (isReturn && bolt.phase !== 'restrike') {
          const mid = bolt.pts[Math.floor(bolt.pts.length * 0.45)]
          const [mx, my] = toPx(mid)
          const col = ctx.createRadialGradient(mx, my, 0, mx, my, width * 0.22)
          const inten = bolt.phase === 'return' ? 0.18 : 0.1 * baseAlpha
          col.addColorStop(0, `rgba(190, 220, 255, ${inten})`)
          col.addColorStop(0.4, `rgba(120, 160, 230, ${inten * 0.35})`)
          col.addColorStop(1, 'rgba(40, 70, 120, 0)')
          ctx.fillStyle = col
          ctx.fillRect(mx - width * 0.25, 0, width * 0.5, height * GROUND_Y)
        }

        // Branches (reveal with return progress)
        if (isReturn) {
          for (const br of bolt.branches) {
            const revealGate =
              bolt.phase === 'return' ? bolt.returnFrac : bolt.phase === 'restrike' ? 0.2 : 1
            if (revealGate < br.attachT * 0.85) continue
            const brAlpha = baseAlpha * (br.depth === 1 ? 0.7 : 0.4) * (0.5 + revealGate * 0.5)
            bloomStroke(br.pts, br.pts.length, brAlpha * 0.75, bolt.thickness * (br.depth === 1 ? 0.55 : 0.35), false, purple)
          }
        }

        if (bolt.phase === 'leader') {
          const flicker = 0.55 + 0.45 * Math.sin(s.time * 55 + bolt.originX * 20)
          // Dim stepped channel
          drawPolyline(bolt.pts, revealed)
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.strokeStyle = `rgba(120, 160, 230, ${0.22 * flicker})`
          ctx.lineWidth = 5.5 * bolt.thickness
          ctx.shadowColor = 'rgba(140, 180, 255, 0.4)'
          ctx.shadowBlur = 12
          ctx.stroke()
          drawPolyline(bolt.pts, revealed)
          ctx.strokeStyle = `rgba(200, 225, 255, ${0.55 * flicker})`
          ctx.lineWidth = 1.6 * bolt.thickness
          ctx.shadowBlur = 4
          ctx.stroke()
          ctx.shadowBlur = 0

          // Tip spark
          const tip = bolt.pts[Math.min(revealed, bolt.pts.length) - 1]
          const [tx2, ty2] = toPx(tip)
          const sparkR = 10 + flicker * 8
          const spark = ctx.createRadialGradient(tx2, ty2, 0, tx2, ty2, sparkR)
          spark.addColorStop(0, `rgba(255, 255, 255, ${0.9 * flicker})`)
          spark.addColorStop(0.35, `rgba(180, 210, 255, ${0.45 * flicker})`)
          spark.addColorStop(1, 'rgba(100, 140, 220, 0)')
          ctx.fillStyle = spark
          ctx.beginPath()
          ctx.arc(tx2, ty2, sparkR, 0, Math.PI * 2)
          ctx.fill()

          if (bolt.showSteps) {
            const stepSize = Math.max(4, Math.floor(bolt.pts.length / 16))
            for (let i = stepSize; i < revealed; i += stepSize) {
              const [sx, sy] = toPx(bolt.pts[i])
              ctx.strokeStyle = 'rgba(255, 220, 140, 0.7)'
              ctx.lineWidth = 1.4
              ctx.beginPath()
              ctx.arc(sx, sy, 5.5, 0, Math.PI * 2)
              ctx.stroke()
            }
          }
        } else if (bolt.phase === 'restrike') {
          // Brief dark channel remnant
          bloomStroke(bolt.pts, bolt.pts.length, 0.15 * baseAlpha, bolt.thickness * 0.6, false, 0.2)
        } else {
          const intensity = bolt.phase === 'return' ? 1 : baseAlpha
          // Return paints from ground upward
          if (bolt.phase === 'return') {
            bloomStroke(bolt.pts, returnPts, intensity, bolt.thickness, true, purple)
            // Wavefront bead
            if (returnPts < bolt.pts.length) {
              const [wx, wy] = toPx(bolt.pts[bolt.pts.length - returnPts])
              const wave = ctx.createRadialGradient(wx, wy, 0, wx, wy, 28)
              wave.addColorStop(0, 'rgba(255,255,255,1)')
              wave.addColorStop(0.35, 'rgba(200,230,255,0.7)')
              wave.addColorStop(1, 'rgba(120,170,255,0)')
              ctx.fillStyle = wave
              ctx.beginPath()
              ctx.arc(wx, wy, 28, 0, Math.PI * 2)
              ctx.fill()
            }
          } else {
            bloomStroke(bolt.pts, bolt.pts.length, intensity, bolt.thickness, false, purple)
          }

          // Ground impact
          if (bolt.phase === 'return' || glowAge < 0.5) {
            const [gx, gy] = toPx(bolt.pts[bolt.pts.length - 1])
            const impactR = (55 + intensity * 40) * bolt.thickness
            const impact = ctx.createRadialGradient(gx, gy, 0, gx, gy, impactR)
            impact.addColorStop(0, `rgba(255, 255, 255, ${0.65 * intensity})`)
            impact.addColorStop(0.25, `rgba(190, 220, 255, ${0.35 * intensity})`)
            impact.addColorStop(0.6, `rgba(100, 150, 230, ${0.12 * intensity})`)
            impact.addColorStop(1, 'rgba(40, 80, 140, 0)')
            ctx.fillStyle = impact
            ctx.beginPath()
            ctx.arc(gx, gy, impactR, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }

      // Ground sparks
      for (const sp of s.sparks) {
        const p = 1 - sp.life / sp.max
        const sx = sp.x * width
        const sy = sp.y * height
        ctx.fillStyle = `rgba(220, 240, 255, ${0.85 * p})`
        ctx.beginPath()
        ctx.arc(sx, sy, sp.r * p, 0, Math.PI * 2)
        ctx.fill()
      }

      // Ground silhouette
      ctx.fillStyle = '#03050a'
      ctx.beginPath()
      ctx.moveTo(0, height + 20)
      ctx.lineTo(0, hillY(0))
      for (let x = 0; x <= width; x += Math.max(6, width / 48)) {
        ctx.lineTo(x, hillY(x / width))
      }
      ctx.lineTo(width, height + 20)
      ctx.closePath()
      ctx.fill()

      // Flash rim on terrain
      if (flash > 0.04) {
        ctx.strokeStyle = `rgba(150, 190, 255, ${flash * 0.55})`
        ctx.lineWidth = 2
        ctx.shadowColor = `rgba(140, 180, 255, ${flash * 0.6})`
        ctx.shadowBlur = 12
        ctx.beginPath()
        for (let x = 0; x <= width; x += Math.max(6, width / 48)) {
          const y = hillY(x / width)
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
        ctx.shadowBlur = 0

        const latest = s.bolts[s.bolts.length - 1]
        if (latest) {
          const gx = latest.groundX * width
          const gy = hillY(latest.groundX)
          const wet = ctx.createRadialGradient(gx, gy, 0, gx, gy, width * 0.24)
          wet.addColorStop(0, `rgba(205, 225, 255, ${flash * 0.2})`)
          wet.addColorStop(0.28, `rgba(105, 150, 220, ${flash * 0.08})`)
          wet.addColorStop(1, 'rgba(40, 70, 130, 0)')
          ctx.fillStyle = wet
          ctx.fillRect(gx - width * 0.28, gy - height * 0.025, width * 0.56, height * 0.09)
        }
      }

      // Trees
      const tree = (xNorm: number, h: number) => {
        const bx = xNorm * width
        const by = hillY(xNorm)
        const lit = flash * 0.4
        ctx.fillStyle = `rgb(${4 + lit * 40}, ${6 + lit * 50}, ${10 + lit * 70})`
        ctx.beginPath()
        ctx.moveTo(bx, by - h)
        ctx.lineTo(bx - h * 0.3, by)
        ctx.lineTo(bx + h * 0.3, by)
        ctx.closePath()
        ctx.fill()
        ctx.beginPath()
        ctx.moveTo(bx, by - h * 1.4)
        ctx.lineTo(bx - h * 0.22, by - h * 0.4)
        ctx.lineTo(bx + h * 0.22, by - h * 0.4)
        ctx.closePath()
        ctx.fill()
      }
      tree(0.07, height * 0.06)
      tree(0.13, height * 0.045)
      tree(0.2, height * 0.035)
      tree(0.8, height * 0.065)
      tree(0.88, height * 0.048)
      tree(0.94, height * 0.055)

      // Fog over ground
      const fog = ctx.createLinearGradient(0, height * 0.72, 0, height)
      fog.addColorStop(0, 'rgba(10, 16, 30, 0)')
      fog.addColorStop(1, `rgba(8, 12, 22, ${0.35 + flash * 0.1})`)
      ctx.fillStyle = fog
      ctx.fillRect(0, height * 0.72, width, height * 0.3)

      // Global flash
      if (flash > 0.01) {
        const latest = s.bolts[s.bolts.length - 1]
        const fx = latest ? latest.originX * width : width / 2
        const fy = height * 0.38
        const fr = Math.max(width, height) * 1.05
        const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr)
        fg.addColorStop(0, `rgba(220, 235, 255, ${flash * 0.28})`)
        fg.addColorStop(0.35, `rgba(150, 190, 255, ${flash * 0.12})`)
        fg.addColorStop(1, `rgba(40, 70, 130, ${flash * 0.04})`)
        ctx.fillStyle = fg
        ctx.fillRect(-20, -20, width + 40, height + 40)

        // Full-screen white punch for peak return
        if (flash > 0.75) {
          ctx.fillStyle = `rgba(255, 255, 255, ${(flash - 0.75) * 0.35})`
          ctx.fillRect(-20, -20, width + 40, height + 40)
        }
      }

      // Auto-storm charge glow under cloud base
      if (s.autoStorm && s.beat === 0 && s.charge > 0.25) {
        const p = Math.min(1, s.charge / s.chargeTarget)
        const mg = ctx.createLinearGradient(0, height * (CLOUD_BASE - 0.05), 0, height * (CLOUD_BASE + 0.06))
        const flicker = 0.65 + 0.35 * Math.sin(s.time * 10)
        mg.addColorStop(0, 'rgba(130,160,255,0)')
        mg.addColorStop(0.5, `rgba(140, 180, 255, ${0.16 * p * flicker})`)
        mg.addColorStop(1, 'rgba(130,160,255,0)')
        ctx.fillStyle = mg
        ctx.fillRect(0, height * (CLOUD_BASE - 0.05), width, height * 0.12)
      }

      // Vignette
      const vig = ctx.createRadialGradient(
        width * 0.5,
        height * 0.45,
        height * 0.2,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.72,
      )
      vig.addColorStop(0, 'rgba(0,0,0,0)')
      vig.addColorStop(1, 'rgba(0,0,0,0.45)')
      ctx.fillStyle = vig
      ctx.fillRect(-20, -20, width + 40, height + 40)

      ctx.restore()
    }

    const loop = (now: number) => {
      frame = window.requestAnimationFrame(loop)
      try {
        paint(now)
        const hud = sim.current.pendingHud
        if (hud) {
          sim.current.pendingHud = null
          window.setTimeout(() => setLastStrike(hud), 0)
        }
      } catch (error) {
        console.error('[lightning-lab] render failed', error)
      }
    }
    frame = window.requestAnimationFrame(loop)
    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(frame)
    }
  }, [false, strike, tx])

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const x = Math.min(0.95, Math.max(0.05, (event.clientX - rect.left) / rect.width))
      controls.registerInteraction()
      if (storyMode || sim.current.beat > 0) {
        returnToFree()
      }
      strike(x, { speed: 1.35, restrikes: Math.random() < 0.5 ? 1 : 0, thickness: rand(0.95, 1.3) })
    },
    [controls, returnToFree, storyMode, strike],
  )

  const guideSteps = useMemo<Array<GuideStep>>(
    () => [
      {
        title: tx('天空劈下一道锯齿'),
        body: tx('闪电从不走直线。同一片云到同一块地，它偏要拐几十个弯——为什么？'),
        action: () => setBeat(1),
        durationMs: 5_400,
      },
      {
        title: tx('云是一座倒置的电池'),
        body: tx('冰晶与霰粒碰撞，把电荷分开：上层积正电，下层积负电。电压差足够大时，空气被击穿。'),
        action: () => setBeat(2),
        durationMs: 6_200,
      },
      {
        title: tx('先导：一步一步试探'),
        body: tx('一道暗淡的阶梯先导以大约 50 米一步的节奏向下跳。每一步的落点由局部电场随机决定，路径就此弯折成锯齿。'),
        action: () => setBeat(3),
        durationMs: 7_200,
      },
      {
        title: tx('回击：光向上冲'),
        body: tx('先导接通地面的一刻，电流沿通道向上回击。你看到的耀眼光柱，其实是从地面冲向云层的。分叉是多条通道同时竞争的结果。'),
        action: () => setBeat(4),
        durationMs: 6_800,
      }
    ],
    [tx],
  )

  return (
    <div className={`oss-experience lightning-experience lightning-beat-${beat}`}>
      <canvas
        ref={canvasRef}
        className="lightning-canvas"
        aria-label={tx('点击天空召唤闪电的暴风雨模拟')}
        onPointerDown={onPointerDown}
      />

      {!storyMode && (
        <header className="lightning-plaque" data-experience-overlay="true">
          <h1>{tx('闪电实验室')}</h1>
          <p>{tx('闪电为什么是锯齿形的？')}</p>
        </header>
      )}

      {!storyMode && lastStrike && (
        <div className="lightning-readout" data-experience-overlay="true" data-freebar-clearance="true" aria-live="polite">
          <span>
            {tx('分支')} ×{lastStrike.branches} · {tx('峰值')} ~{lastStrike.ka} kA
          </span>
        </div>
      )}

      {!storyMode && (
        <Freebar
          className="lightning-freebar"
          mainClassName="lightning-freebar-main"
          ariaLabel={tx('参数')}
          primaryControlBudget={3}
          secondary={(
            <div className="lightning-chip-rail experience-freebar-chips" role="group" aria-label={tx('次级工具')}>
              <button
                type="button"
                className="experience-freebar-story"
                onClick={() => {
                  controls.registerInteraction()
                  enterStory()
                  replayGuide('lightning-lab')
                }}
                aria-label={tx('重播故事')}
              >
                <FilmStrip weight="fill" aria-hidden="true" />
                <span>{tx('故事')}</span>
              </button>
            </div>
          )}
        >
          <div className="experience-freebar-field lightning-field">
            <div>
              <span>{tx('分叉密度')}</span>
              <strong>{branchDensity}</strong>
            </div>
            <input
              className="lightning-branch"
              type="range"
              min={0}
              max={100}
              step={1}
              value={branchDensity}
              aria-label={tx('分叉密度')}
              onChange={(event) => {
                controls.registerInteraction()
                setBranchDensity(Number(event.target.value))
                returnToFree()
              }}
            />
          </div>
          <div className="experience-freebar-field lightning-field">
            <div>
              <span>{tx('混沌度')}</span>
              <strong>{chaos}</strong>
            </div>
            <input
              className="lightning-chaos"
              type="range"
              min={10}
              max={100}
              step={1}
              value={chaos}
              aria-label={tx('混沌度')}
              onChange={(event) => {
                controls.registerInteraction()
                setChaos(Number(event.target.value))
                returnToFree()
              }}
            />
          </div>
          <button
            type="button"
            className={autoStorm ? 'is-accent' : undefined}
            onClick={() => {
              controls.registerInteraction()
              setAutoStorm((v) => !v)
              returnToFree()
            }}
          >
            {autoStorm ? tx('停风暴') : tx('风暴')}
          </button>
        </Freebar>
      )}

      <GuideTour
        worldId="lightning-lab"
        steps={guideSteps}
        defaultOpen={storyMode}
        placement="stage"
        stagePlan={[
          { position: 'bottom-left', mobilePosition: 'bottom-left', motion: 'rise', tone: 'light', treatment: 'monumental', width: 'normal', cue: 'up' },
          { position: 'top-left', mobilePosition: 'top-left', motion: 'fade', tone: 'light', treatment: 'editorial', width: 'normal' },
          { position: 'bottom-right', mobilePosition: 'bottom-right', motion: 'drift-left', tone: 'light', treatment: 'caption', width: 'narrow', cue: 'down' },
          { position: 'top-right', mobilePosition: 'top-right', motion: 'scale', tone: 'light', treatment: 'monumental', width: 'normal', cue: 'down' },
        ]}
        showReplayChip={false}
        replayLabel={tx('重播故事')}
        onExit={returnToFree}
      />
      {!storyMode && (
        <GhostHint
          worldId="lightning-lab"
          gesture={{ type: 'tap', target: '.lightning-canvas', label: tx('点击天空召唤闪电') }}
        />
      )}
    </div>
  )
}
