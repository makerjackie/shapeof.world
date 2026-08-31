import './styles/PendulumWave.css'

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
import { cancelWorldFrame, requestWorldFrame } from '~/lib/world-playback'

/** 小角度单摆：T = 2π√(L/g) */
const G = 9.81
/** 最短摆在一个回归周期内完成的振荡次数 */
const BASE_CYCLES = 15
const TRAIL_LEN = 18

type WaveBeat = 0 | 1 | 2 | 3 | 4 | 5 | 6

type PendulumSpec = {
  length: number
  period: number
  color: string
  glow: string
}

type BobPoint = {
  x: number
  y: number
  color: string
  glow: string
  angle: number
  lengthPx: number
  pivotX: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function hslToHex(h: number, s: number, l: number) {
  const sat = clamp(s, 0, 100) / 100
  const light = clamp(l, 0, 100) / 100
  const chroma = (1 - Math.abs(2 * light - 1)) * sat
  const hp = (((h % 360) + 360) % 360) / 60
  const x = chroma * (1 - Math.abs((hp % 2) - 1))
  let r = 0
  let g = 0
  let b = 0
  if (hp < 1) [r, g, b] = [chroma, x, 0]
  else if (hp < 2) [r, g, b] = [x, chroma, 0]
  else if (hp < 3) [r, g, b] = [0, chroma, x]
  else if (hp < 4) [r, g, b] = [0, x, chroma]
  else if (hp < 5) [r, g, b] = [x, 0, chroma]
  else [r, g, b] = [chroma, 0, x]
  const m = light - chroma / 2
  const toByte = (channel: number) => Math.round((channel + m) * 255)
  return `#${[toByte(r), toByte(g), toByte(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/** 博物馆金属色：暖铜 → 香槟金 → 冷银，不做霓虹彩虹 */
function metalColor(t: number) {
  const hue = 28 + t * 18
  const sat = 42 - t * 18
  const light = 58 + Math.sin(t * Math.PI) * 6
  return {
    color: hslToHex(hue, sat, light),
    glow: hslToHex(hue + 8, sat + 8, light + 12),
  }
}

/**
 * 在回归时间 τ 内，第 i 个摆恰好完成 (BASE_CYCLES + i) 次振荡。
 * 相位差线性累积 → 行波、交错、回归。
 */
function buildPendulums(count: number, cycleSeconds: number): Array<PendulumSpec> {
  return Array.from({ length: count }, (_, index) => {
    const cycles = BASE_CYCLES + index
    const period = cycleSeconds / cycles
    const length = G * (period / (2 * Math.PI)) ** 2
    const metal = metalColor(count <= 1 ? 0 : index / (count - 1))
    return { length, period, color: metal.color, glow: metal.glow }
  })
}

function phaseLabel(progress: number) {
  if (progress < 0.04) return '同相出发'
  if (progress < 0.18) return '波浪成形'
  if (progress < 0.38) return '行波掠过'
  if (progress < 0.62) return '节拍交错'
  if (progress < 0.84) return '看似混乱'
  if (progress < 0.96) return '正在汇合'
  return '再次整齐'
}

function withAlpha(hex: string, alphaHex: string) {
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? `${hex}${alphaHex}` : hex
}

function makeSphereSprite(color: string, glow: string) {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  const c = size / 2

  // soft outer bloom
  const bloom = ctx.createRadialGradient(c, c, 4, c, c, c)
  bloom.addColorStop(0, withAlpha(glow, '55'))
  bloom.addColorStop(0.35, withAlpha(glow, '18'))
  bloom.addColorStop(1, withAlpha(glow, '00'))
  ctx.fillStyle = bloom
  ctx.fillRect(0, 0, size, size)

  // metal body
  const bodyR = size * 0.28
  const body = ctx.createRadialGradient(c - bodyR * 0.35, c - bodyR * 0.4, bodyR * 0.08, c, c + bodyR * 0.1, bodyR)
  body.addColorStop(0, '#fff7ea')
  body.addColorStop(0.18, glow)
  body.addColorStop(0.55, color)
  body.addColorStop(0.85, '#2a2118')
  body.addColorStop(1, '#0c0907')
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.arc(c, c, bodyR, 0, Math.PI * 2)
  ctx.fill()

  // specular
  ctx.fillStyle = 'rgba(255, 250, 240, 0.55)'
  ctx.beginPath()
  ctx.ellipse(c - bodyR * 0.28, c - bodyR * 0.32, bodyR * 0.22, bodyR * 0.14, -0.5, 0, Math.PI * 2)
  ctx.fill()

  // rim light
  ctx.strokeStyle = 'rgba(255, 236, 200, 0.22)'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.arc(c, c, bodyR - 0.6, 0, Math.PI * 2)
  ctx.stroke()

  return canvas
}

export function PendulumWave({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [count, setCount] = useState(18)
  const [cycleSeconds, setCycleSeconds] = useState(36)
  const [amplitudeDeg, setAmplitudeDeg] = useState(26)
  const [running, setRunning] = useState(true)
  const [beat, setBeat] = useState<WaveBeat>(0)
  const { storyMode, enterFree, enterStory } = useStoryFreeMode('pendulum-wave')
  const [hud, setHud] = useState({ progress: 0, phase: '同相出发', time: 0 })

  const sim = useRef({
    time: 0,
    lastNow: 0,
    running: true,
    cycleSeconds: 36,
    amplitude: (26 * Math.PI) / 180,
    beat: 0 as WaveBeat,
    pendulums: buildPendulums(18, 36),
    revealLengths: 0,
    showRibbon: true,
    speedBoost: 1,
    /** 0→1 settle envelope after re-release (physical “let go”) */
    releaseAge: 1,
    releaseDuration: 0.85,
    trails: [] as Array<Array<{ x: number; y: number }>>,
    lastPhaseKey: '',
  })

  sim.current.running = running
  sim.current.cycleSeconds = cycleSeconds
  sim.current.amplitude = (amplitudeDeg * Math.PI) / 180
  sim.current.beat = beat

  const rebuild = useCallback((nextCount: number, nextCycle: number) => {
    sim.current.pendulums = buildPendulums(nextCount, nextCycle)
    sim.current.trails = Array.from({ length: nextCount }, () => [])
    sim.current.time = 0
    sim.current.lastNow = 0
  }, [])

  const release = useCallback(() => {
    sim.current.time = 0
    sim.current.lastNow = 0
    sim.current.trails = sim.current.pendulums.map(() => [])
    // Physical let-go: amplitude eases in, time starts slightly slow then settles
    sim.current.releaseAge = 0
    sim.current.releaseDuration = 0.9
    sim.current.speedBoost = 0.55
    sim.current.lastPhaseKey = '同相出发'
    setRunning(true)
    setHud({ progress: 0, phase: '同相出发', time: 0 })
  }, [])

  const returnToFree = useCallback(() => {
    enterFree()
    setBeat(0)
    sim.current.revealLengths = 0
    sim.current.showRibbon = true
    sim.current.speedBoost = 1
  }, [enterFree])

  useEffect(() => {
    controls.completeOnboarding()
  }, [controls])

  useEffect(() => {
    rebuild(count, cycleSeconds)
  }, [count, cycleSeconds, rebuild])

  useEffect(() => {
    const s = sim.current
    if (beat === 0) {
      s.revealLengths = 0
      s.showRibbon = true
      s.speedBoost = 1
      return
    }
    if (beat === 1) {
      s.time = 0
      s.trails = s.pendulums.map(() => [])
      setRunning(true)
      s.running = true
      s.revealLengths = 0
      s.showRibbon = true
      s.speedBoost = 0.9
      s.releaseAge = 0
      s.releaseDuration = 0.75
    } else if (beat === 2) {
      s.time = s.cycleSeconds * 0.14
      s.revealLengths = 0
      s.showRibbon = true
      s.speedBoost = 1.05
      s.releaseAge = 1
    } else if (beat === 3) {
      s.time = s.cycleSeconds * 0.2
      s.revealLengths = 1
      s.showRibbon = false
      s.speedBoost = 0.5
      s.releaseAge = 1
    } else if (beat === 4) {
      s.time = s.cycleSeconds * 0.1
      s.revealLengths = 0.2
      s.showRibbon = true
      s.speedBoost = 1.1
      s.releaseAge = 1
    } else if (beat === 5) {
      s.time = s.cycleSeconds * 0.52
      s.revealLengths = 0
      s.showRibbon = true
      s.speedBoost = 1.25
      s.releaseAge = 1
    } else if (beat === 6) {
      s.time = s.cycleSeconds * 0.93
      s.revealLengths = 0
      s.showRibbon = true
      s.speedBoost = 0.85
      s.releaseAge = 1
    }
  }, [beat])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const spriteCache = new Map<string, HTMLCanvasElement>()
    const getSprite = (color: string, glow: string) => {
      const key = `${color}|${glow}`
      let sprite = spriteCache.get(key)
      if (!sprite) {
        sprite = makeSphereSprite(color, glow)
        spriteCache.set(key, sprite)
      }
      return sprite
    }

    let width = 1
    let height = 1
    let dpr = 1
    let frame = 0
    let lastHud = -1
    let trailTick = 0

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

    const paintRoom = () => {
      // deep museum stage
      const sky = ctx.createLinearGradient(0, 0, 0, height)
      sky.addColorStop(0, '#0b0910')
      sky.addColorStop(0.35, '#100e17')
      sky.addColorStop(0.7, '#0a0810')
      sky.addColorStop(1, '#040308')
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, width, height)

      // tungsten key light from ceiling center
      const key = ctx.createRadialGradient(width * 0.5, height * 0.05, 0, width * 0.5, height * 0.2, width * 0.5)
      key.addColorStop(0, 'rgba(255, 214, 150, 0.24)')
      key.addColorStop(0.32, 'rgba(200, 150, 80, 0.09)')
      key.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = key
      ctx.fillRect(0, 0, width, height)

      // soft cool fill from lower right
      const fill = ctx.createRadialGradient(width * 0.82, height * 0.7, 0, width * 0.82, height * 0.7, width * 0.45)
      fill.addColorStop(0, 'rgba(90, 120, 150, 0.055)')
      fill.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = fill
      ctx.fillRect(0, 0, width, height)

      // floor plane with subtle sheen
      const floorY = height * 0.9
      const floor = ctx.createLinearGradient(0, floorY - 48, 0, height)
      floor.addColorStop(0, 'rgba(0, 0, 0, 0)')
      floor.addColorStop(0.3, 'rgba(18, 14, 22, 0.5)')
      floor.addColorStop(0.7, 'rgba(10, 8, 14, 0.82)')
      floor.addColorStop(1, 'rgba(3, 2, 5, 0.97)')
      ctx.fillStyle = floor
      ctx.fillRect(0, floorY - 48, width, height - floorY + 48)

      // faint horizon + soft floor specular
      ctx.strokeStyle = 'rgba(255, 230, 190, 0.05)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(width * 0.08, floorY)
      ctx.lineTo(width * 0.92, floorY)
      ctx.stroke()
      const sheen = ctx.createLinearGradient(width * 0.2, floorY, width * 0.8, floorY + 24)
      sheen.addColorStop(0, 'rgba(255, 230, 190, 0)')
      sheen.addColorStop(0.5, 'rgba(255, 230, 190, 0.035)')
      sheen.addColorStop(1, 'rgba(255, 230, 190, 0)')
      ctx.fillStyle = sheen
      ctx.fillRect(width * 0.15, floorY, width * 0.7, 28)
    }

    const paintFrame = (now: number) => {
      const s = sim.current
      const dt = s.lastNow ? Math.min(0.05, (now - s.lastNow) / 1000) : 0
      s.lastNow = now

      // Release envelope: ease-out amplitude + recover speed after “let go”
      if (s.running && s.releaseAge < 1) {
        s.releaseAge = Math.min(1, s.releaseAge + dt / Math.max(0.2, s.releaseDuration))
        // speed eases from slow cinematic start back toward 1
        const ease = s.releaseAge * s.releaseAge * (3 - 2 * s.releaseAge)
        if (s.beat === 0 || s.beat === 1) {
          s.speedBoost = 0.55 + ease * 0.45
        }
      }

      if (s.running) s.time += dt * s.speedBoost
      if (s.time > s.cycleSeconds) s.time %= s.cycleSeconds

      const pendulums = s.pendulums
      const n = pendulums.length
      if (n === 0 || width < 2 || height < 2) return
      if (s.trails.length !== n) s.trails = Array.from({ length: n }, () => [])

      const mobile = width < 720
      // 视觉主体严格水平居中；上下只留壳层/字幕/参数的安全边，不人为空出右半屏
      const topY = height * (mobile ? 0.28 : 0.24)
      const usableWidth = width * (mobile ? 0.88 : 0.74)
      const leftX = (width - usableWidth) / 2
      const spacing = n > 1 ? usableWidth / (n - 1) : 0
      const maxLength = Math.max(...pendulums.map((p) => p.length), 1e-6)
      // 底部为 GuideTour / 底栏留白，摆球不要压到字幕区
      const lengthScale = (height * (mobile ? 0.38 : 0.44)) / maxLength
      const bobR = Math.max(7, Math.min(13.5, spacing * 0.33))

      // Physical release: amplitude ramps with overshoot settle (not hard cut)
      const releaseEase = s.releaseAge >= 1
        ? 1
        : (() => {
          const t = s.releaseAge
          // ease-out cubic with tiny overshoot then settle
          const base = 1 - Math.pow(1 - t, 3)
          const overshoot = t < 0.7 ? 0 : Math.sin((t - 0.7) / 0.3 * Math.PI) * 0.04 * (1 - t)
          return Math.min(1.04, base + overshoot)
        })()
      const liveAmplitude = s.amplitude * releaseEase

      paintRoom()

      // suspension beam — richer polished brass with depth
      const beamY = topY - 14
      const beamLeft = leftX - 36
      const beamWidth = usableWidth + 72
      // soft contact shadow under bar
      ctx.fillStyle = 'rgba(0, 0, 0, 0.42)'
      ctx.beginPath()
      ctx.ellipse(width / 2, beamY + 20, beamWidth * 0.5, 12, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)'
      ctx.beginPath()
      ctx.ellipse(width / 2, beamY + 28, beamWidth * 0.42, 8, 0, 0, Math.PI * 2)
      ctx.fill()

      const bar = ctx.createLinearGradient(beamLeft, 0, beamLeft + beamWidth, 0)
      bar.addColorStop(0, '#2a2218')
      bar.addColorStop(0.08, '#7a6038')
      bar.addColorStop(0.22, '#c4a060')
      bar.addColorStop(0.38, '#f4deb0')
      bar.addColorStop(0.5, '#fff6d8')
      bar.addColorStop(0.62, '#f0d8a4')
      bar.addColorStop(0.8, '#b89458')
      bar.addColorStop(0.92, '#6a5230')
      bar.addColorStop(1, '#2a2218')
      ctx.fillStyle = bar
      {
        const bx = beamLeft
        const by = beamY
        const bw = beamWidth
        const bh = 12
        const br = 5.5
        ctx.beginPath()
        ctx.moveTo(bx + br, by)
        ctx.lineTo(bx + bw - br, by)
        ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + br)
        ctx.lineTo(bx + bw, by + bh - br)
        ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - br, by + bh)
        ctx.lineTo(bx + br, by + bh)
        ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - br)
        ctx.lineTo(bx, by + br)
        ctx.quadraticCurveTo(bx, by, bx + br, by)
        ctx.closePath()
        ctx.fill()
      }
      // vertical metal gradient overlay
      const barShade = ctx.createLinearGradient(0, beamY, 0, beamY + 12)
      barShade.addColorStop(0, 'rgba(255, 255, 255, 0.22)')
      barShade.addColorStop(0.35, 'rgba(255, 255, 255, 0)')
      barShade.addColorStop(0.75, 'rgba(0, 0, 0, 0.12)')
      barShade.addColorStop(1, 'rgba(0, 0, 0, 0.28)')
      ctx.fillStyle = barShade
      ctx.fillRect(beamLeft, beamY, beamWidth, 12)
      // top specular edge
      ctx.fillStyle = 'rgba(255, 255, 255, 0.34)'
      ctx.fillRect(beamLeft + 10, beamY + 1.2, beamWidth - 20, 1.8)
      // underside rim light
      ctx.fillStyle = 'rgba(255, 220, 150, 0.12)'
      ctx.fillRect(beamLeft + 14, beamY + 10, beamWidth - 28, 1)

      // end caps with richer metal
      for (const side of [-1, 1] as const) {
        const cx = side < 0 ? beamLeft + 6 : beamLeft + beamWidth - 6
        const cap = ctx.createRadialGradient(cx - 2.5, beamY + 1.5, 1, cx, beamY + 6, 11)
        cap.addColorStop(0, '#fff4d0')
        cap.addColorStop(0.35, '#e8c880')
        cap.addColorStop(0.75, '#8a6a38')
        cap.addColorStop(1, '#3a2c18')
        ctx.fillStyle = cap
        ctx.beginPath()
        ctx.arc(cx, beamY + 5.5, 8.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = 'rgba(255, 236, 200, 0.2)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(cx, beamY + 5.5, 8, 0, Math.PI * 2)
        ctx.stroke()
      }

      const progress = (s.time % s.cycleSeconds) / s.cycleSeconds
      // Phase-driven visual emphasis: ribbon/trail strength shifts with the story of the wave
      const phaseKey = phaseLabel(progress)
      let phaseGlow = 0.22
      let trailAlpha = 0.22
      let ribbonWidth = 1.4
      if (progress < 0.04) {
        // 同相出发 — tight gold line
        phaseGlow = 0.38
        trailAlpha = 0.12
        ribbonWidth = 2.1
      } else if (progress < 0.18) {
        // 波浪成形
        phaseGlow = 0.32
        trailAlpha = 0.2
        ribbonWidth = 1.9
      } else if (progress < 0.38) {
        // 行波掠过 — stronger traveling ribbon
        phaseGlow = 0.36
        trailAlpha = 0.28
        ribbonWidth = 2.2
      } else if (progress < 0.62) {
        // 节拍交错
        phaseGlow = 0.24
        trailAlpha = 0.32
        ribbonWidth = 1.5
      } else if (progress < 0.84) {
        // 看似混乱 — trails tell the story
        phaseGlow = 0.16
        trailAlpha = 0.38
        ribbonWidth = 1.1
      } else if (progress < 0.96) {
        // 正在汇合
        phaseGlow = 0.3
        trailAlpha = 0.24
        ribbonWidth = 1.8
      } else {
        // 再次整齐
        phaseGlow = 0.42
        trailAlpha = 0.14
        ribbonWidth = 2.3
      }

      const bobs: Array<BobPoint> = []
      for (let i = 0; i < n; i += 1) {
        const pend = pendulums[i]
        const pivotX = leftX + i * spacing
        const omega = (2 * Math.PI) / pend.period
        const angle = liveAmplitude * Math.cos(omega * s.time)
        const lengthPx = pend.length * lengthScale
        // 引导章轻微拉开长度差，帮助看见“每根都不一样”
        const reveal = s.revealLengths
        const displayLength = lengthPx * (1 + reveal * 0.12 * ((i / Math.max(1, n - 1)) - 0.5) * 2)
        const x = pivotX + Math.sin(angle) * displayLength
        const y = topY + Math.cos(angle) * displayLength
        bobs.push({
          x,
          y,
          color: pend.color,
          glow: pend.glow,
          angle,
          lengthPx: displayLength,
          pivotX,
        })
      }

      // motion trails (behind wires) — stronger in chaotic mid-cycle
      trailTick += 1
      if (trailTick % 2 === 0) {
        for (let i = 0; i < n; i += 1) {
          const trail = s.trails[i]
          trail.push({ x: bobs[i].x, y: bobs[i].y })
          if (trail.length > TRAIL_LEN) trail.splice(0, trail.length - TRAIL_LEN)
        }
      }
      for (let i = 0; i < n; i += 1) {
        const trail = s.trails[i]
        if (trail.length < 2) continue
        for (let t = 1; t < trail.length; t += 1) {
          const a = (t / trail.length) * trailAlpha
          ctx.strokeStyle = withAlpha(bobs[i].glow, Math.round(a * 255).toString(16).padStart(2, '0'))
          ctx.lineWidth = bobR * 0.55 * (t / trail.length)
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(trail[t - 1].x, trail[t - 1].y)
          ctx.lineTo(trail[t].x, trail[t].y)
          ctx.stroke()
        }
      }

      // silk ribbon connecting bobs — phase-modulated so wave transitions read clearly
      if (s.showRibbon && n > 1) {
        ctx.save()
        ctx.globalCompositeOperation = 'screen'
        ctx.lineWidth = ribbonWidth
        ctx.lineJoin = 'round'
        ctx.lineCap = 'round'
        const ribbon = ctx.createLinearGradient(bobs[0].x, 0, bobs[n - 1].x, 0)
        ribbon.addColorStop(0, `rgba(232, 180, 100, ${phaseGlow})`)
        ribbon.addColorStop(0.5, `rgba(240, 220, 170, ${phaseGlow * 0.85})`)
        ribbon.addColorStop(1, `rgba(180, 200, 220, ${phaseGlow * 0.95})`)
        ctx.strokeStyle = ribbon
        ctx.beginPath()
        ctx.moveTo(bobs[0].x, bobs[0].y)
        for (let i = 1; i < n; i += 1) {
          const prev = bobs[i - 1]
          const curr = bobs[i]
          const cpx = (prev.x + curr.x) / 2
          const cpy = (prev.y + curr.y) / 2
          ctx.quadraticCurveTo(prev.x, prev.y, cpx, cpy)
        }
        ctx.lineTo(bobs[n - 1].x, bobs[n - 1].y)
        ctx.stroke()
        // soft double ribbon on regroup / departure for museum-stage emphasis
        if (progress < 0.06 || progress > 0.94) {
          ctx.lineWidth = ribbonWidth * 2.4
          ctx.strokeStyle = `rgba(255, 230, 170, ${phaseGlow * 0.22})`
          ctx.stroke()
        }
        ctx.restore()
      }

      // soft stage wash on phase boundary (regroup / launch)
      if (progress < 0.035 || progress > 0.97) {
        const flash = progress > 0.97 ? (progress - 0.97) / 0.03 : 1 - progress / 0.035
        const wash = ctx.createRadialGradient(width * 0.5, topY + height * 0.2, 0, width * 0.5, topY + height * 0.22, width * 0.42)
        wash.addColorStop(0, `rgba(255, 220, 150, ${0.05 * flash})`)
        wash.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = wash
        ctx.fillRect(0, 0, width, height)
      }

      // wires then spheres
      for (let i = 0; i < n; i += 1) {
        const bob = bobs[i]

        // wire
        const wire = ctx.createLinearGradient(bob.pivotX, topY, bob.x, bob.y)
        wire.addColorStop(0, 'rgba(230, 220, 200, 0.55)')
        wire.addColorStop(1, 'rgba(180, 170, 150, 0.28)')
        ctx.strokeStyle = wire
        ctx.lineWidth = 1.05
        ctx.beginPath()
        ctx.moveTo(bob.pivotX, topY)
        ctx.lineTo(bob.x, bob.y)
        ctx.stroke()

        // pivot bead
        ctx.fillStyle = '#e8d2a0'
        ctx.beginPath()
        ctx.arc(bob.pivotX, topY + 1, 2.4, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
        ctx.beginPath()
        ctx.arc(bob.pivotX - 0.5, topY + 0.4, 0.8, 0, Math.PI * 2)
        ctx.fill()

        // length callouts only in the "why length" beat
        if (s.revealLengths > 0.25 && (i === 0 || i === n - 1 || i === Math.floor((n - 1) / 2))) {
          ctx.save()
          ctx.globalAlpha = clamp(s.revealLengths, 0, 1) * 0.85
          ctx.strokeStyle = 'rgba(232, 194, 122, 0.35)'
          ctx.setLineDash([3, 5])
          ctx.beginPath()
          ctx.moveTo(bob.pivotX + 12, topY)
          ctx.lineTo(bob.pivotX + 12, topY + bob.lengthPx)
          ctx.stroke()
          ctx.setLineDash([])
          ctx.fillStyle = 'rgba(242, 215, 162, 0.75)'
          ctx.font = '500 11px ui-monospace, Menlo, monospace'
          ctx.fillText(`L${i + 1}`, bob.pivotX + 16, topY + bob.lengthPx * 0.48)
          ctx.restore()
        }

        // soft shadow under bob (in air) + floor contact
        const floorY = height * 0.9
        const lift = Math.max(0, floorY - bob.y)
        const shadowScale = clamp(1 - lift / (height * 0.55), 0.15, 1)
        ctx.save()
        ctx.globalAlpha = 0.12
        ctx.fillStyle = '#000'
        ctx.beginPath()
        ctx.ellipse(bob.x + 1.5, bob.y + bobR * 0.85, bobR * 0.95, bobR * 0.28, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        ctx.save()
        ctx.globalAlpha = 0.22 * shadowScale
        ctx.fillStyle = '#000'
        ctx.beginPath()
        ctx.ellipse(bob.x, floorY + 2, bobR * 1.25 * shadowScale, bobR * 0.32 * shadowScale, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        // soft floor reflection
        ctx.save()
        ctx.globalAlpha = 0.1 * shadowScale
        const sprite = getSprite(bob.color, bob.glow)
        const refSize = bobR * 2.2
        ctx.translate(bob.x, floorY + lift * 0.08 + 6)
        ctx.scale(1, 0.28)
        ctx.drawImage(sprite, -refSize, -refSize, refSize * 2, refSize * 2)
        ctx.restore()

        // sphere
        const drawSize = bobR * 2.9
        ctx.drawImage(sprite, bob.x - drawSize, bob.y - drawSize, drawSize * 2, drawSize * 2)
      }

      if (Math.abs(progress - lastHud) > 0.003 || phaseKey !== s.lastPhaseKey) {
        lastHud = progress
        s.lastPhaseKey = phaseKey
        setHud({
          progress,
          phase: phaseKey,
          time: s.time % s.cycleSeconds,
        })
      }
    }

    const render = (now: number) => {
      frame = requestWorldFrame(render)
      try {
        paintFrame(now)
      } catch (error) {
        console.error('[pendulum-wave] render failed', error)
      }
    }

    frame = requestWorldFrame(render)
    return () => {
      observer.disconnect()
      cancelWorldFrame(frame)
    }
  }, [false])

  const guideSteps = useMemo<Array<GuideStep>>(() => [
    {
      title: tx('一排摆，为什么会散成波'),
      body: tx('它们明明从同一刻、同一角度出发，先整齐得像一条金线。只要绳长差一点点，节拍就会慢慢错开，波形于是从队伍里浮出来。'),
      action: () => setBeat(1),
      durationMs: 4_800,
    },
    {
      title: tx('短绳摆得快，长绳摆得慢'),
      body: tx('每根绳子的长度只差一点点。短摆先赶到前面，长摆慢慢落后，原本整齐的一排开始错开。'),
      action: () => setBeat(3),
      durationMs: 6_000,
    },
    {
      title: tx('波浪只是时间差'),
      body: tx('没有谁沿着队伍推了一把。你看到的波，是每个摆用不同节拍来回运动后，排成的形状。'),
      action: () => setBeat(4),
      durationMs: 5_800,
    },
    {
      title: tx('等一会儿，它们还会重新对齐'),
      body: tx('绳长按 T = 2π√(L/g) 精确安排，让每个摆在同一时刻完成整数次摆动。于是散开的队伍最终又站成一排。'),
      action: () => setBeat(6),
      durationMs: 5_500,
    },
    // 末步不绑 target：避免字幕框跳到底栏控件

  ], [tx])

  return (
    <div className={`oss-experience pwave-experience pwave-beat-${beat}${storyMode ? ' is-story' : ' is-free'}`}>
      <canvas
        ref={canvasRef}
        className="pwave-canvas"
        aria-label={tx('一排不同长度的摆从同一角度放开，形成移动的波浪')}
        onPointerDown={() => {
          controls.registerInteraction()
        }}
      />

      {/* 被动读数：回归周期进度 · 顶中 */}
      <div className="pwave-topline" data-experience-overlay="true" data-freebar-clearance="true" aria-live="polite">
        <span className="pwave-topline-name">{tx('摆波')}</span>
        <strong className="pwave-topline-phase">{tx(hud.phase)}</strong>
        <i className="pwave-topline-bar" aria-hidden="true">
          <b style={{ width: `${Math.max(3, hud.progress * 100)}%` }} />
        </i>
        <em className="pwave-topline-time">
          {hud.time.toFixed(1)}s · {cycleSeconds}s
        </em>
      </div>

      {!storyMode && (
        <header className="pwave-plaque" data-experience-overlay="true">
          <span>{tx('MOTION / RHYTHM')}</span>
          <h1>{tx('摆波')}</h1>
          <p>{tx('一齐放开，它们怎么自己走出波浪？')}</p>
        </header>
      )}

      {!storyMode && (
        <Freebar
          className="pwave-freebar"
          mainClassName="pwave-freebar-main"
          ariaLabel={tx('参数')}
          primaryControlBudget={3}
          secondaryDefault="closed"
          secondaryClassName="pwave-freebar-secondary"
          secondary={(
            <div className="pwave-tray">
              <div className="pwave-tray-head">
                <div className="pwave-field-rail" role="group" aria-label={tx('次级参数')}>
                  <label className="pwave-freebar-field">
                    <span>{tx('回归周期')}</span>
                    <input
                      className="pwave-cycle"
                      type="range"
                      min={20}
                      max={70}
                      step={1}
                      value={cycleSeconds}
                      aria-label={tx('回归周期，单位秒')}
                      onChange={(event) => {
                        controls.registerInteraction()
                        setCycleSeconds(Number(event.target.value))
                      }}
                    />
                    <b>{cycleSeconds}s</b>
                  </label>
                  <label className="pwave-freebar-field">
                    <span>{tx('放开角度')}</span>
                    <input
                      className="pwave-amplitude"
                      type="range"
                      min={12}
                      max={36}
                      step={1}
                      value={amplitudeDeg}
                      aria-label={tx('初始放开角度')}
                      onChange={(event) => {
                        controls.registerInteraction()
                        setAmplitudeDeg(Number(event.target.value))
                      }}
                    />
                    <b>{amplitudeDeg}°</b>
                  </label>
                </div>
                <div className="pwave-tray-tools">
                  <button
                    type="button"
                    className="pwave-freebar-replay experience-freebar-story"
                    onClick={() => {
                      controls.registerInteraction()
                      enterStory()
                      replayGuide('pendulum-wave')
                    }}
                    aria-label={tx('重播故事')}
                  >
                    <FilmStrip weight="fill" aria-hidden="true" />
                    <span>{tx('故事')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        >
          <button
            type="button"
            className="experience-freebar-play"
            data-playing={running ? 'true' : 'false'}
            onClick={() => {
              controls.registerInteraction()
              setRunning((value) => !value)
            }}
            aria-label={running ? tx('暂停') : tx('播放')}
          >
            {running
              ? <Pause weight="fill" aria-hidden="true" />
              : <Play weight="fill" aria-hidden="true" />}
          </button>
          <button
            type="button"
            className="experience-freebar-reset pwave-release"
            onClick={() => {
              controls.registerInteraction()
              release()
            }}
            aria-label={tx('重新放开')}
          >
            <ArrowCounterClockwise weight="bold" aria-hidden="true" />
            <span>{tx('重新放开')}</span>
          </button>
          <label className="pwave-freebar-field pwave-count-field">
            <span>{tx('摆的数量')}</span>
            <input
              className="pwave-count"
              type="range"
              min={10}
              max={24}
              step={1}
              value={count}
              aria-label={tx('摆的数量')}
              onChange={(event) => {
                controls.registerInteraction()
                setCount(Number(event.target.value))
              }}
            />
            <b>{count}</b>
          </label>
        </Freebar>
      )}

      <GuideTour
        worldId="pendulum-wave"
        steps={guideSteps}
        defaultOpen={storyMode}
        placement="stage"
        stagePlan={[
          { position: 'bottom-right', mobilePosition: 'top-left', motion: 'rise', tone: 'light', width: 'normal', treatment: 'monumental' },
          { position: 'bottom-right', mobilePosition: 'bottom-right', motion: 'drift-left', tone: 'light', width: 'normal', treatment: 'editorial', cue: 'left' },
          { position: 'top-left', mobilePosition: 'top-left', motion: 'fade', tone: 'light', width: 'wide', treatment: 'caption' },
          { position: 'bottom-left', mobilePosition: 'bottom-left', motion: 'scale', tone: 'light', width: 'normal', treatment: 'editorial' },
        ]}
        showReplayChip={false}
        replayLabel={tx('重播故事')}
        onExit={returnToFree}
      />
      {!storyMode && (
        <GhostHint
          worldId="pendulum-wave"
          gesture={{ type: 'scrub', target: '.pwave-count', label: tx('拨动摆的数量') }}
        />
      )}
    </div>
  )
}
