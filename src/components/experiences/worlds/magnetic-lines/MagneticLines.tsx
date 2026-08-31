import './styles/MagneticLines.css'

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { ArrowCounterClockwise, FilmStrip } from '@phosphor-icons/react'

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
type MagBeat = 0 | 1 | 2 | 3 | 4 | 5 | 6

type Filing = {
  x: number
  y: number
  angle: number
  target: number
}

function clamp(v: number, a: number, b: number) {
  return Math.min(b, Math.max(a, v))
}

/** Magnetic dipole field in 2D plane (moment along +x). Returns [Bx, By]. */
function dipoleField(
  x: number,
  y: number,
  mx: number,
  my: number,
  m: number,
  strength: number,
): [number, number] {
  const dx = x - mx
  const dy = y - my
  const r2 = dx * dx + dy * dy + 0.012
  const r = Math.sqrt(r2)
  const r5 = r2 * r2 * r
  // Moment vector (m, 0) in magnet frame: horizontal bar magnet along x
  const mDotR = m * dx
  const bx = strength * ((3 * mDotR * dx) / r5 - m / (r2 * r))
  const by = strength * ((3 * mDotR * dy) / r5)
  return [bx, by]
}

function rk4Line(
  x0: number,
  y0: number,
  mx: number,
  my: number,
  m: number,
  strength: number,
  steps: number,
  dt: number,
  forward: boolean,
): Array<[number, number]> {
  const pts: Array<[number, number]> = [[x0, y0]]
  let x = x0
  let y = y0
  const sign = forward ? 1 : -1
  // Stop when entering the painted bar magnet body (half-width ≈ 0.16, half-height ≈ 0.055)
  const insideMagnet = (px: number, py: number) =>
    Math.abs(px - mx) < 0.14 && Math.abs(py - my) < 0.07
  for (let i = 0; i < steps; i += 1) {
    const step = (px: number, py: number) => {
      const [bx, by] = dipoleField(px, py, mx, my, m, strength)
      const mag = Math.hypot(bx, by) || 1
      return [(sign * dt * bx) / mag, (sign * dt * by) / mag]
    }
    const [k1x, k1y] = step(x, y)
    const [k2x, k2y] = step(x + k1x * 0.5, y + k1y * 0.5)
    const [k3x, k3y] = step(x + k2x * 0.5, y + k2y * 0.5)
    const [k4x, k4y] = step(x + k3x, y + k3y)
    x += (k1x + 2 * k2x + 2 * k3x + k4x) / 6
    y += (k1y + 2 * k2y + 2 * k3y + k4y) / 6
    pts.push([x, y])
    if (insideMagnet(x, y)) break
    if (Math.hypot(x - mx, y - my) < 0.05) break
    if (Math.abs(x - mx) > 2.4 || Math.abs(y - my) > 1.7) break
  }
  return pts
}

export function MagneticLines({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [strength, setStrength] = useState(1)
  const [filingsOn, setFilingsOn] = useState(true)
  const [beat, setBeat] = useState<MagBeat>(0)
  const { storyMode, enterFree, enterStory } = useStoryFreeMode('magnetic-lines')

  const sim = useRef({
    mx: 0,
    my: 0,
    strength: 1,
    filings: [] as Array<Filing>,
    lines: [] as Array<Array<[number, number]>>,
    /** Tracer beads that stream along field lines for living motion */
    tracers: [] as Array<{ line: number; t: number; speed: number }>,
    linesDirty: true,
    dragging: false,
    beat: 0 as MagBeat,
    time: 0,
    lastNow: 0,
    showLabels: false,
    autoOrbit: 0,
  })

  if (sim.current.strength !== strength) {
    sim.current.strength = strength
    sim.current.linesDirty = true
  }
  sim.current.beat = beat

  const returnToFree = useCallback(() => {
    enterFree()
    setBeat(0)
    sim.current.showLabels = false
    sim.current.autoOrbit = 0
  }, [enterFree])

  useEffect(() => {
    controls.completeOnboarding()
  }, [controls])

  useEffect(() => {
    // Seed iron filings in a soft cloud around the magnet
    const filings: Array<Filing> = []
    const n = 520
    for (let i = 0; i < n; i += 1) {
      const a = Math.random() * Math.PI * 2
      const r = 0.18 + Math.random() * 1.2
      filings.push({
        x: Math.cos(a) * r * (0.75 + Math.random() * 0.45),
        y: Math.sin(a) * r * 0.62,
        angle: Math.random() * Math.PI,
        target: 0,
      })
    }
    sim.current.filings = filings
    // Field-line tracers (re-seeded when lines recompute)
    sim.current.tracers = Array.from({ length: 36 }, () => ({
      line: Math.floor(Math.random() * 18),
      t: Math.random(),
      speed: 0.12 + Math.random() * 0.22,
    }))
  }, [])

  useEffect(() => {
    const s = sim.current
    if (beat === 0) {
      s.showLabels = false
      s.autoOrbit = 0
      return
    }
    if (beat === 1) {
      s.mx = 0
      s.my = 0
      setStrength(1)
      setFilingsOn(false)
      s.linesDirty = true
    } else if (beat === 2) {
      setFilingsOn(true)
      s.showLabels = false
    } else if (beat === 3) {
      s.showLabels = true
      setStrength(1.15)
    } else if (beat === 4) {
      s.autoOrbit = 1
      setStrength(1)
    } else if (beat === 5) {
      s.autoOrbit = 0
      setStrength(1.4)
    } else if (beat === 6) {
      s.autoOrbit = 0
      s.showLabels = false
      setStrength(1)
    }
  }, [beat])

  const recomputeLines = useCallback((mx: number, my: number, str: number) => {
    const lines: Array<Array<[number, number]>> = []
    // Seed outside the bar magnet body (half-width ~0.16) so loops do not die instantly.
    // Mix polar seeds (closed N→S arcs) with a few equatorial rays for classic dipole look.
    const polarSeeds = 12
    for (let i = 0; i < polarSeeds; i += 1) {
      // Prefer upper / lower hemispheres where closed loops are most visible
      const t = (i + 0.5) / polarSeeds
      const a = -Math.PI * 0.75 + t * Math.PI * 1.5
      const r = 0.2 + (i % 3) * 0.045
      const sx = mx + Math.cos(a) * r
      const sy = my + Math.sin(a) * r * 0.72
      const forward = rk4Line(sx, sy, mx, my, 1, str, 140, 0.028, true)
      const backward = rk4Line(sx, sy, mx, my, 1, str, 140, 0.028, false)
      const merged = [...backward.reverse().slice(0, -1), ...forward]
      if (merged.length > 10) lines.push(merged)
    }
    // A few long equatorial lines that leave N and return from far field
    for (const side of [-1, 1] as const) {
      for (const lift of [0.12, 0.28, 0.44] as const) {
        const sx = mx + side * 0.22
        const sy = my + lift * (side > 0 ? 1 : -1) * 0.15
        const forward = rk4Line(sx, sy, mx, my, 1, str, 160, 0.032, true)
        const backward = rk4Line(sx, sy, mx, my, 1, str, 160, 0.032, false)
        const merged = [...backward.reverse().slice(0, -1), ...forward]
        if (merged.length > 10) lines.push(merged)
      }
    }
    return lines
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
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

    const paint = (now: number) => {
      const s = sim.current
      const dt = s.lastNow ? Math.min(0.05, (now - s.lastNow) / 1000) : 0.016
      s.lastNow = now
      if (true) s.time += dt
      else s.time += dt * 0.1

      if (s.autoOrbit > 0 && !s.dragging) {
        s.mx = Math.cos(s.time * 0.45) * 0.35
        s.my = Math.sin(s.time * 0.45) * 0.22
        s.linesDirty = true
      }

      const mobile = width < 720
      const cx = width * 0.5
      const cy = height * (mobile ? 0.42 : 0.46)
      const span = Math.min(width, height) * (mobile ? 0.4 : 0.44)
      const toPx = (x: number, y: number): [number, number] => [cx + x * span, cy - y * span]
      const toField = (px: number, py: number): [number, number] => [
        (px - cx) / span,
        -(py - cy) / span
      ]

      if (s.linesDirty) {
        s.lines = recomputeLines(s.mx, s.my, s.strength)
        s.linesDirty = false
      }

      // Stage — deep lab night, cyan key light, no edge vignette
      const bg = ctx.createRadialGradient(cx, cy * 0.78, 0, cx, cy, Math.max(width, height) * 0.82)
      bg.addColorStop(0, '#0d1c30')
      bg.addColorStop(0.4, '#071018')
      bg.addColorStop(1, '#03060c')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, width, height)

      // Subtle floating dust (living field of the room)
      for (let i = 0; i < 28; i += 1) {
        const px = ((Math.sin(s.time * 0.11 + i * 1.9) * 0.5 + 0.5) * width)
        const py = ((Math.cos(s.time * 0.08 + i * 2.3) * 0.5 + 0.5) * height)
        ctx.fillStyle = `rgba(160, 210, 240, ${0.04 + (i % 5) * 0.012})`
        ctx.beginPath()
        ctx.arc(px, py, 0.7 + (i % 3) * 0.5, 0, Math.PI * 2)
        ctx.fill()
      }

      // Soft ambient glow at magnet — cyan + amber dipole aura
      const [mgx, mgy] = toPx(s.mx, s.my)
      const str = s.strength
      const glow = ctx.createRadialGradient(mgx, mgy, 0, mgx, mgy, span * 0.72)
      glow.addColorStop(0, `rgba(110, 231, 242, ${0.14 * str})`)
      glow.addColorStop(0.35, `rgba(240, 180, 90, ${0.07 * str})`)
      glow.addColorStop(0.7, `rgba(40, 80, 120, ${0.04 * str})`)
      glow.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, width, height)

      // Pole glows (S warm / N cool) so the dipole reads instantly
      const poleR = span * 0.22
      const sGlow = ctx.createRadialGradient(mgx - span * 0.08, mgy, 0, mgx - span * 0.08, mgy, poleR)
      sGlow.addColorStop(0, `rgba(255, 120, 100, ${0.16 * str})`)
      sGlow.addColorStop(1, 'rgba(255,80,60,0)')
      ctx.fillStyle = sGlow
      ctx.beginPath()
      ctx.arc(mgx - span * 0.08, mgy, poleR, 0, Math.PI * 2)
      ctx.fill()
      const nGlow = ctx.createRadialGradient(mgx + span * 0.08, mgy, 0, mgx + span * 0.08, mgy, poleR)
      nGlow.addColorStop(0, `rgba(100, 200, 255, ${0.16 * str})`)
      nGlow.addColorStop(1, 'rgba(80,180,255,0)')
      ctx.fillStyle = nGlow
      ctx.beginPath()
      ctx.arc(mgx + span * 0.08, mgy, poleR, 0, Math.PI * 2)
      ctx.fill()

      // Field lines — soft bloom underlay + bright cyan/amber core
      for (let li = 0; li < s.lines.length; li += 1) {
        const line = s.lines[li]
        if (line.length < 3) continue
        const t = li / Math.max(1, s.lines.length - 1)
        // Mix cyan → amber along line index so the field has depth of color
        const r = Math.round(90 + t * 150)
        const g = Math.round(200 + (1 - t) * 35)
        const b = Math.round(220 + (1 - t) * 30)
        const pulse = 0.85 + 0.15 * Math.sin(s.time * 1.2 + li * 0.4)

        // Wide soft under-glow
        ctx.beginPath()
        for (let i = 0; i < line.length; i += 1) {
          const [px, py] = toPx(line[i][0], line[i][1])
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.14 * pulse})`
        ctx.lineWidth = 6.5
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.stroke()

        // Core filament
        ctx.beginPath()
        for (let i = 0; i < line.length; i += 1) {
          const [px, py] = toPx(line[i][0], line[i][1])
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.72 * pulse})`
        ctx.lineWidth = 1.65
        ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.65)`
        ctx.shadowBlur = 12
        ctx.stroke()
        ctx.shadowBlur = 0

        // Direction chevrons (amber so they read against cyan)
        for (let i = 12; i < line.length - 12; i += 18) {
          const [x0, y0] = line[i]
          const [x1, y1] = line[i + 1]
          const [px, py] = toPx(x0, y0)
          const ang = Math.atan2(-(y1 - y0), x1 - x0)
          ctx.save()
          ctx.translate(px, py)
          ctx.rotate(ang)
          ctx.strokeStyle = `rgba(255, 210, 130, ${0.45 + 0.25 * pulse})`
          ctx.lineWidth = 1.35
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(-5.5, -3.8)
          ctx.lineTo(0, 0)
          ctx.lineTo(-5.5, 3.8)
          ctx.stroke()
          ctx.restore()
        }
      }

      // Streaming tracers — beads travel along field lines
      if (s.lines.length > 0) {
        for (const tr of s.tracers) {
          tr.line = tr.line % s.lines.length
          const line = s.lines[tr.line]
          if (!line || line.length < 4) continue
          tr.t += dt * tr.speed * (0.7 + str * 0.5)
          if (tr.t > 1) tr.t -= 1
          const idx = Math.min(line.length - 2, Math.floor(tr.t * (line.length - 1)))
          const [px, py] = toPx(line[idx][0], line[idx][1])
          const bead = ctx.createRadialGradient(px, py, 0, px, py, 7)
          bead.addColorStop(0, 'rgba(255, 248, 220, 0.95)')
          bead.addColorStop(0.35, 'rgba(110, 231, 242, 0.7)')
          bead.addColorStop(1, 'rgba(110, 231, 242, 0)')
          ctx.fillStyle = bead
          ctx.beginPath()
          ctx.arc(px, py, 7, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Iron filings — metallic needles that lag into alignment
      if (filingsOn) {
        for (const f of s.filings) {
          const [bx, by] = dipoleField(f.x, f.y, s.mx, s.my, 1, s.strength)
          const ang = Math.atan2(-by, bx)
          // unwrap angle for smooth lerp
          let dAng = ang - f.angle
          while (dAng > Math.PI / 2) dAng -= Math.PI
          while (dAng < -Math.PI / 2) dAng += Math.PI
          const blend = 0.1
          f.angle += dAng * blend
          const [px, py] = toPx(f.x, f.y)
          const dist = Math.hypot(f.x - s.mx, f.y - s.my)
          if (dist < 0.11) continue
          const fieldMag = Math.hypot(bx, by)
          const len = 4.5 + clamp(fieldMag * 2.4, 0, 8)
          const alpha = 0.18 + clamp(fieldMag * 0.18, 0, 0.42)
          ctx.save()
          ctx.translate(px, py)
          ctx.rotate(f.angle)
          // Needle body
          const needle = ctx.createLinearGradient(-len, 0, len, 0)
          needle.addColorStop(0, `rgba(180, 160, 120, ${alpha * 0.4})`)
          needle.addColorStop(0.5, `rgba(230, 215, 175, ${alpha})`)
          needle.addColorStop(1, `rgba(180, 160, 120, ${alpha * 0.4})`)
          ctx.strokeStyle = needle
          ctx.lineWidth = 1.25
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(-len, 0)
          ctx.lineTo(len, 0)
          ctx.stroke()
          ctx.restore()
        }
      }

      // Bar magnet — museum brass body with painted poles
      const mw = span * 0.18
      const mh = span * 0.062
      ctx.save()
      ctx.translate(mgx, mgy)
      // Contact shadow
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.beginPath()
      ctx.ellipse(2, mh * 0.65, mw * 0.55, mh * 0.55, 0, 0, Math.PI * 2)
      ctx.fill()
      // Rounded body path
      const rx = mw * 0.5
      const ry = mh * 0.5
      const drawBody = () => {
        ctx.beginPath()
        ctx.roundRect(-rx, -ry, mw, mh, mh * 0.28)
      }
      // S half (warm red)
      ctx.save()
      ctx.beginPath()
      ctx.rect(-rx, -ry, mw * 0.5, mh)
      ctx.clip()
      drawBody()
      const left = ctx.createLinearGradient(-rx, -ry, -rx, ry)
      left.addColorStop(0, '#e86868')
      left.addColorStop(0.45, '#c03535')
      left.addColorStop(1, '#6a1414')
      ctx.fillStyle = left
      ctx.fill()
      ctx.restore()
      // N half (cool blue)
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, -ry, mw * 0.5, mh)
      ctx.clip()
      drawBody()
      const right = ctx.createLinearGradient(0, -ry, 0, ry)
      right.addColorStop(0, '#6aa8f0')
      right.addColorStop(0.45, '#2e6ec8')
      right.addColorStop(1, '#143a80')
      ctx.fillStyle = right
      ctx.fill()
      ctx.restore()
      // Metal rim + highlight
      drawBody()
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx.lineWidth = 1.4
      ctx.stroke()
      ctx.strokeStyle = 'rgba(255, 250, 230, 0.35)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(-rx + 4, -ry + 3)
      ctx.lineTo(rx - 4, -ry + 3)
      ctx.stroke()
      // Seam
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, -ry + 1)
      ctx.lineTo(0, ry - 1)
      ctx.stroke()
      // N / S glyphs
      ctx.fillStyle = 'rgba(255,255,255,0.92)'
      ctx.font = `700 ${Math.max(12, mh * 0.58)}px system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = 'rgba(0,0,0,0.5)'
      ctx.shadowBlur = 4
      ctx.fillText('S', -mw * 0.25, 0.5)
      ctx.fillText('N', mw * 0.25, 0.5)
      ctx.shadowBlur = 0
      if (s.showLabels) {
        ctx.font = '600 11px system-ui, sans-serif'
        ctx.fillStyle = 'rgba(255, 180, 180, 0.9)'
        ctx.fillText(tx('南极'), -mw * 0.25, mh * 1.45)
        ctx.fillStyle = 'rgba(160, 210, 255, 0.9)'
        ctx.fillText(tx('北极'), mw * 0.25, mh * 1.45)
      }
      ctx.restore()

      // Store transform helpers on sim for pointer
      ;(s as typeof s & { _toField?: typeof toField; _cx?: number; _cy?: number; _span?: number })._toField = toField
    }

    const loop = (now: number) => {
      frame = window.requestAnimationFrame(loop)
      try {
        paint(now)
      } catch (error) {
        console.error('[magnetic-lines] render failed', error)
      }
    }
    frame = window.requestAnimationFrame(loop)
    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(frame)
    }
  }, [filingsOn, recomputeLines, false, tx])

  const pointerToField = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const px = event.clientX - rect.left
    const py = event.clientY - rect.top
    const mobile = rect.width < 720
    const cx = rect.width * 0.5
    const cy = rect.height * (mobile ? 0.42 : 0.46)
    const span = Math.min(rect.width, rect.height) * (mobile ? 0.4 : 0.44)
    return {
      x: (px - cx) / span,
      y: -(py - cy) / span,
    }
  }, [])

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const p = pointerToField(event)
      if (!p) return
      sim.current.dragging = true
      sim.current.mx = clamp(p.x, -1.2, 1.2)
      sim.current.my = clamp(p.y, -0.85, 0.85)
      sim.current.linesDirty = true
      sim.current.autoOrbit = 0
      controls.registerInteraction()
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [controls, pointerToField],
  )

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!sim.current.dragging) return
    const p = pointerToField(event)
    if (!p) return
    sim.current.mx = clamp(p.x, -1.2, 1.2)
    sim.current.my = clamp(p.y, -0.85, 0.85)
    sim.current.linesDirty = true
  }, [pointerToField])

  const onPointerUp = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    sim.current.dragging = false
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      /* ignore */
    }
  }, [])

  const guideSteps = useMemo<Array<GuideStep>>(() => [
    {
      title: tx('看不见的力，为什么会长出线？'),
      body: tx('磁铁周围本来没有线，只有一个会推拉指南针的场。我们把它显影成青色与琥珀色的曲线——先看这些“线”会不会随磁铁一起重排。'),
      action: () => setBeat(1),
      durationMs: 5_200,
    },
    {
      title: tx('铁屑为什么会排队？'),
      body: tx('每一粒细小的铁，都像一只微型指南针。场把它们沿局部方向排齐，就勾出了磁力线的纹理。'),
      action: () => setBeat(2),
      durationMs: 6_000,
    },
    {
      title: tx('从 N 到 S，是同一条回路'),
      body: tx('在磁铁外部，线从北极出发、回到南极；在内部它们继续闭合。磁单极至今没有被找到。'),
      action: () => setBeat(3),
      durationMs: 6_200,
    },
    {
      title: tx('移动磁铁，场跟着走'),
      body: tx('拖动磁铁。线不是贴纸——它们会在新的位置重新组织。场是空间里的状态，不是画在纸上的固定图案。'),
      action: () => setBeat(4),
      durationMs: 5_800,
    },
    {
      title: tx('强度改变疏密'),
      body: tx('磁力越强，近处的线越“密”，对指南针的扭转也越明显。拨动强度，看同样的形状被拉得更紧。'),
      action: () => setBeat(5),
      durationMs: 5_500,
    }
  ], [tx])

  return (
    <div className={`oss-experience mag-experience mag-beat-${beat}`}>
      <canvas
        ref={canvasRef}
        className="mag-canvas"
        aria-label={tx('可拖动磁铁观察偶极磁力线与铁屑取向')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />

      {!storyMode && (
        <div className="mag-readout" data-experience-overlay="true" aria-live="polite">
          <strong>{Math.round(strength * 100)}%</strong>
          <span>{tx('磁场强度')}</span>
        </div>
      )}

      {!storyMode && (
        <header className="mag-plaque" data-experience-overlay="true">
          <h1>{tx('看不见的磁力线')}</h1>
          <p>{tx('铁屑为什么会自己排成花纹？')}</p>
        </header>
      )}

      {!storyMode && (
        <Freebar
          className="mag-freebar"
          mainClassName="mag-freebar-main"
          ariaLabel={tx('参数')}
          primaryControlBudget={2}
          secondary={(
            <>
              <div className="mag-chip-rail experience-freebar-chips" role="group" aria-label={tx('次级工具')}>
                <button
                  type="button"
                  className="experience-freebar-reset"
                  aria-label={tx('重置')}
                  onClick={() => {
                    controls.registerInteraction()
                    sim.current.mx = 0
                    sim.current.my = 0
                    sim.current.linesDirty = true
                    setStrength(1)
                    returnToFree()
                  }}
                >
                  <ArrowCounterClockwise weight="bold" aria-hidden="true" />
                  <span>{tx('重置')}</span>
                </button>
                <button
                  type="button"
                  className="mag-freebar-replay experience-freebar-story"
                  onClick={() => {
                    controls.registerInteraction()
                    enterStory()
                    replayGuide('magnetic-lines')
                  }}
                  aria-label={tx('重播故事')}
                >
                  <FilmStrip weight="fill" aria-hidden="true" />
                  <span>{tx('故事')}</span>
                </button>
              </div>
            </>
          )}
        >
          <div className="experience-freebar-field">
            <div>
              <span>{tx('磁场强度')}</span>
              <strong>{Math.round(strength * 100)}</strong>
            </div>
            <input
              className="mag-strength"
              type="range"
              min={0.35}
              max={1.6}
              step={0.01}
              value={strength}
              aria-label={tx('磁场强度')}
              onChange={(event) => {
                controls.registerInteraction()
                setStrength(Number(event.target.value))
                sim.current.linesDirty = true
                returnToFree()
              }}
            />
          </div>
          <button
            type="button"
            className={filingsOn ? 'is-accent' : undefined}
            onClick={() => {
              controls.registerInteraction()
              setFilingsOn((v) => !v)
              returnToFree()
            }}
          >
            {filingsOn ? tx('藏铁屑') : tx('铁屑')}
          </button>
        </Freebar>
      )}

      <GuideTour
        worldId="magnetic-lines"
        steps={guideSteps}
        defaultOpen={storyMode}
        placement="stage"
        stagePlan={[
          { position: 'top-left', mobilePosition: 'top-left', motion: 'rise', tone: 'light', treatment: 'monumental', width: 'normal' },
          { position: 'top-right', mobilePosition: 'top-right', motion: 'drift-left', tone: 'light', treatment: 'editorial', width: 'normal', cue: 'left' },
          { position: 'bottom-left', mobilePosition: 'bottom-left', motion: 'scale', tone: 'light', treatment: 'caption', width: 'normal' },
          { position: 'bottom-right', mobilePosition: 'bottom-right', motion: 'drift-right', tone: 'light', treatment: 'annotation', width: 'narrow', cue: 'left' },
          { position: 'top-center', mobilePosition: 'bottom-center', motion: 'fade', tone: 'light', treatment: 'editorial', width: 'wide' },
        ]}
        replayLabel={tx('重播故事')}
        onExit={returnToFree}
      />
      {!storyMode && (
        <GhostHint
          worldId="magnetic-lines"
          gesture={{ type: 'drag', target: '.mag-canvas', dx: 120, dy: -40, label: tx('拖动磁铁') }}
        />
      )}
    </div>
  )
}
