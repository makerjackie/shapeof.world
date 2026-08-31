import './styles/ElectricField.css'

import { useEffect, useRef, useState, useCallback, type PointerEvent as ReactPointerEvent } from 'react'
import { Question, X, Plus, Minus, Eraser, Lightning, CircleDashed, Waves, Atom, FilmStrip } from '@phosphor-icons/react'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { GuideTour, replayGuide, type GuideStep } from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import { useExperienceI18n } from '~/i18n/experience'

const YELLOW = '#ffd166'
const POS_COLOR = '#ff6b4a'
const NEG_COLOR = '#4a9eff'

type Charge = { x: number; y: number; q: number } // q > 0 positive, q < 0 negative
type Tool = 'positive' | 'negative' | 'test' | 'erase'
type ViewMode = 'lines' | 'equipotential' | 'both'

type Particle = {
  x: number
  y: number
  life: number
  maxLife: number
}

type TestCharge = {
  x: number
  y: number
  vx: number
  vy: number
  trail: Array<{ x: number; y: number }>
}

const K = 1.0 // Coulomb constant (normalized)
const PARTICLE_COUNT = 500
const MAX_CHARGES = 12
const FIELD_LINE_SEEDS = 24 // seeds per charge
const RK4_STEPS = 180
const RK4_DT = 0.012

/** Electric field at point (x, y) from all charges */
function fieldAt(charges: Array<Charge>, x: number, y: number): [number, number] {
  let ex = 0
  let ey = 0
  for (const c of charges) {
    const dx = x - c.x
    const dy = y - c.y
    const r2 = dx * dx + dy * dy + 0.0008 // softening
    const r = Math.sqrt(r2)
    const e = (K * c.q) / r2
    ex += (e * dx) / r
    ey += (e * dy) / r
  }
  return [ex, ey]
}

/** Electric potential at point (x, y) */
function potentialAt(charges: Array<Charge>, x: number, y: number): number {
  let v = 0
  for (const c of charges) {
    const dx = x - c.x
    const dy = y - c.y
    const r = Math.sqrt(dx * dx + dy * dy + 0.0008)
    v += (K * c.q) / r
  }
  return v
}

/** RK4 integration step for field line tracing */
function rk4Step(charges: Array<Charge>, x: number, y: number, dt: number): [number, number] {
  const [k1x, k1y] = fieldAt(charges, x, y)
  const m1 = Math.hypot(k1x, k1y) || 1
  const [k2x, k2y] = fieldAt(charges, x + (dt * k1x) / (2 * m1), y + (dt * k1y) / (2 * m1))
  const m2 = Math.hypot(k2x, k2y) || 1
  const [k3x, k3y] = fieldAt(charges, x + (dt * k2x) / (2 * m2), y + (dt * k2y) / (2 * m2))
  const m3 = Math.hypot(k3x, k3y) || 1
  const [k4x, k4y] = fieldAt(charges, x + (dt * k3x) / m3, y + (dt * k3y) / m3)
  const m4 = Math.hypot(k4x, k4y) || 1
  const nx = x + (dt / 6) * (k1x / m1 + 2 * k2x / m2 + 2 * k3x / m3 + k4x / m4)
  const ny = y + (dt / 6) * (k1y / m1 + 2 * k2y / m2 + 2 * k3y / m3 + k4y / m4)
  return [nx, ny]
}

export function ElectricField({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { storyMode, enterFree, enterStory } = useStoryFreeMode('electric-field')
  const [tool, setTool] = useState<Tool>('positive')
  const [magnitude, setMagnitude] = useState(5)
  const [viewMode, setViewMode] = useState<ViewMode>('both')
  const [whyOpen, setWhyOpen] = useState(false)
  const [chargeCount, setChargeCount] = useState(2)
  const [showHint, setShowHint] = useState(true)
  const interactedRef = useRef(false)

  const st = useRef({
    charges: [
      { x: -0.3, y: 0, q: 5 },
      { x: 0.3, y: 0, q: -5 },
    ] as Array<Charge>,
    particles: [] as Array<Particle>,
    testCharges: [] as Array<TestCharge>,
    tool: 'positive' as Tool,
    magnitude: 5,
    viewMode: 'both' as ViewMode,
    time: 0,
    lastNow: 0,
    dragging: -1, // index of charge being dragged
    fieldLines: [] as Array<Array<[number, number]>>,
    fieldLinesDirty: true,
  })
  st.current.tool = tool
  st.current.magnitude = magnitude
  st.current.viewMode = viewMode

  useEffect(() => {
    controls.completeOnboarding()
  }, [controls])

  // Hide hint after first interaction
  const registerFirstInteraction = useCallback(() => {
    if (!interactedRef.current) {
      interactedRef.current = true
      controls.registerInteraction()
      setShowHint(false)
    }
  }, [controls])

  // Compute field lines from positive charges using RK4
  const computeFieldLines = useCallback((charges: Array<Charge>) => {
    const lines: Array<Array<[number, number]>> = []
    const posCharges = charges.filter((c) => c.q > 0)
    for (const c of posCharges) {
      const seeds = Math.max(8, Math.round(FIELD_LINE_SEEDS * (Math.abs(c.q) / 5)))
      for (let i = 0; i < seeds; i++) {
        const angle = (2 * Math.PI * i) / seeds
        let x = c.x + 0.025 * Math.cos(angle)
        let y = c.y + 0.025 * Math.sin(angle)
        const line: Array<[number, number]> = [[x, y]]
        for (let step = 0; step < RK4_STEPS; step++) {
          const [nx, ny] = rk4Step(charges, x, y, RK4_DT)
          x = nx
          y = ny
          line.push([x, y])
          // Stop if out of bounds or near a negative charge
          if (Math.abs(x) > 1.6 || Math.abs(y) > 1.2) break
          let hitNeg = false
          for (const nc of charges) {
            if (nc.q < 0 && Math.hypot(x - nc.x, y - nc.y) < 0.03) {
              hitNeg = true
              break
            }
          }
          if (hitNeg) break
        }
        if (line.length > 3) lines.push(line)
      }
    }
    return lines
  }, [])

  // Main animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf = 0

    const frame = (now: number) => {
      const s = st.current
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Background
      ctx.fillStyle = '#05070f'
      ctx.fillRect(0, 0, w, h)

      const dt = s.lastNow ? Math.min((now - s.lastNow) / 1000, 0.05) : 0.016
      s.lastNow = now
      s.time += dt

      const mobile = w < 720
      const cx = w * 0.5
      const cy = h * (mobile ? 0.38 : 0.44)
      const halfSpan = Math.min(w, h) * (mobile ? 0.42 : 0.46)
      const toPx = (x: number, y: number): [number, number] => [cx + x * halfSpan, cy - y * halfSpan]
      const toField = (px: number, py: number): [number, number] => [(px - cx) / halfSpan, -(py - cy) / halfSpan]

      // Recompute field lines if dirty
      if (s.fieldLinesDirty) {
        s.fieldLines = computeFieldLines(s.charges)
        s.fieldLinesDirty = false
      }

      // Draw equipotential lines (purple dashed)
      if (s.viewMode === 'equipotential' || s.viewMode === 'both') {
        ctx.save()
        ctx.setLineDash([4, 6])
        ctx.lineWidth = 0.8
        const vLevels = [-8, -4, -2, -1, 1, 2, 4, 8]
        for (const vLevel of vLevels) {
          ctx.strokeStyle = `rgba(177, 92, 255, ${Math.abs(vLevel) <= 2 ? 0.35 : 0.18})`
          ctx.beginPath()
          let started = false
          // March along a grid to find contour points
          const gridN = 60
          for (let gi = 0; gi <= gridN; gi++) {
            const gx = -1.4 + (2.8 * gi) / gridN
            for (let gj = 0; gj <= gridN; gj++) {
              const gy = -1.0 + (2.0 * gj) / gridN
              const v = potentialAt(s.charges, gx, gy)
              const vNext = potentialAt(s.charges, gx + 2.8 / gridN, gy)
              if ((v - vLevel) * (vNext - vLevel) < 0) {
                const [px, py] = toPx(gx, gy)
                if (!started) {
                  ctx.moveTo(px, py)
                  started = true
                } else {
                  ctx.lineTo(px, py)
                }
              }
            }
          }
          ctx.stroke()
        }
        // Draw circular equipotential rings around individual charges
        for (const c of s.charges) {
          const [cpx, cpy] = toPx(c.x, c.y)
          const sign = c.q > 0 ? 1 : -1
          for (let ring = 1; ring <= 3; ring++) {
            const r = (0.08 * ring * 5) / Math.abs(c.q)
            const rPx = r * halfSpan
            if (rPx > 8 && rPx < halfSpan * 1.2) {
              ctx.strokeStyle = `rgba(177, 92, 255, ${0.25 - ring * 0.05})`
              ctx.beginPath()
              ctx.arc(cpx, cpy, rPx, 0, Math.PI * 2)
              ctx.stroke()
            }
          }
        }
        ctx.restore()
      }

      // Draw field lines (static traced lines with animated flow)
      if (s.viewMode === 'lines' || s.viewMode === 'both') {
        ctx.lineWidth = 2.2
        ctx.setLineDash([6, 4])
        ctx.lineDashOffset = -s.time * 30
        for (const line of s.fieldLines) {
          ctx.strokeStyle = 'rgba(77, 208, 225, 0.7)'
          ctx.beginPath()
          for (let i = 0; i < line.length; i++) {
            const [px, py] = toPx(line[i][0], line[i][1])
            if (i === 0) ctx.moveTo(px, py)
            else ctx.lineTo(px, py)
          }
          ctx.stroke()
        }
        ctx.setLineDash([])
      }

      // Animated particles flowing along field
      while (s.particles.length < PARTICLE_COUNT) {
        // Spawn near positive charges or random
        const posCharges = s.charges.filter((c) => c.q > 0)
        if (posCharges.length > 0 && Math.random() < 0.7) {
          const c = posCharges[Math.floor(Math.random() * posCharges.length)]
          const angle = Math.random() * Math.PI * 2
          const dist = 0.03 + Math.random() * 0.04
          s.particles.push({
            x: c.x + dist * Math.cos(angle),
            y: c.y + dist * Math.sin(angle),
            life: 0,
            maxLife: 80 + Math.random() * 120,
          })
        } else {
          s.particles.push({
            x: (Math.random() * 2 - 1) * 1.2,
            y: (Math.random() * 2 - 1) * 0.8,
            life: 0,
            maxLife: 60 + Math.random() * 100,
          })
        }
      }

      ctx.lineWidth = 1.4
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i]
        const [fx, fy] = fieldAt(s.charges, p.x, p.y)
        const mag = Math.hypot(fx, fy)
        if (mag < 1e-6) {
          p.life += 2
        } else {
          const speed = Math.min(mag * 0.6, 3.5) * dt
          p.x += (fx / mag) * speed
          p.y += (fy / mag) * speed
        }
        p.life += 1

        const [px, py] = toPx(p.x, p.y)
        const alpha = Math.min(0.9, 0.3 + mag * 0.15) * (1 - p.life / p.maxLife)
        const size = Math.min(3, 1.2 + mag * 0.35)

        ctx.fillStyle = `rgba(77, 208, 225, ${alpha.toFixed(3)})`
        ctx.beginPath()
        ctx.arc(px, py, size, 0, Math.PI * 2)
        ctx.fill()

        // Kill particle if out of bounds, near negative charge, or expired
        const outOfBounds = Math.abs(p.x) > 1.5 || Math.abs(p.y) > 1.1
        let hitNeg = false
        for (const c of s.charges) {
          if (c.q < 0 && Math.hypot(p.x - c.x, p.y - c.y) < 0.035) {
            hitNeg = true
            break
          }
        }
        if (p.life >= p.maxLife || outOfBounds || hitNeg) {
          s.particles.splice(i, 1)
        }
      }

      // Draw charges
      for (const c of s.charges) {
        const [cpx, cpy] = toPx(c.x, c.y)
        const isPos = c.q > 0
        const color = isPos ? POS_COLOR : NEG_COLOR
        const radius = 10 + Math.abs(c.q) * 0.8

        // Glow
        ctx.shadowColor = color
        ctx.shadowBlur = 18
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(cpx, cpy, radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0

        // Inner gradient
        const grad = ctx.createRadialGradient(cpx, cpy, 0, cpx, cpy, radius)
        grad.addColorStop(0, 'rgba(255,255,255,0.4)')
        grad.addColorStop(0.6, 'rgba(255,255,255,0.05)')
        grad.addColorStop(1, 'transparent')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(cpx, cpy, radius, 0, Math.PI * 2)
        ctx.fill()

        // Symbol
        ctx.fillStyle = '#fff'
        ctx.font = `700 ${Math.round(radius)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(isPos ? '+' : '−', cpx, cpy + 1)
      }

      // Test charges (yellow dots with trail)
      for (let ti = s.testCharges.length - 1; ti >= 0; ti--) {
        const tc = s.testCharges[ti]
        const [fx, fy] = fieldAt(s.charges, tc.x, tc.y)
        // F = qE, a = F/m (m=1 for test charge)
        tc.vx += fx * dt * 2.0
        tc.vy += fy * dt * 2.0
        // Damping
        tc.vx *= 0.998
        tc.vy *= 0.998
        tc.x += tc.vx * dt
        tc.y += tc.vy * dt
        tc.trail.push({ x: tc.x, y: tc.y })
        if (tc.trail.length > 40) tc.trail.shift()

        // Draw trail
        ctx.lineWidth = 2
        for (let t = 1; t < tc.trail.length; t++) {
          const [tx0, ty0] = toPx(tc.trail[t - 1].x, tc.trail[t - 1].y)
          const [tx1, ty1] = toPx(tc.trail[t].x, tc.trail[t].y)
          const alpha = (t / tc.trail.length) * 0.6
          ctx.strokeStyle = `rgba(255, 209, 102, ${alpha.toFixed(3)})`
          ctx.beginPath()
          ctx.moveTo(tx0, ty0)
          ctx.lineTo(tx1, ty1)
          ctx.stroke()
        }

        // Draw test charge
        const [tcpx, tcpy] = toPx(tc.x, tc.y)
        ctx.shadowColor = YELLOW
        ctx.shadowBlur = 10
        ctx.fillStyle = YELLOW
        ctx.beginPath()
        ctx.arc(tcpx, tcpy, 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0

        // Remove if out of bounds
        if (Math.abs(tc.x) > 1.8 || Math.abs(tc.y) > 1.4) {
          s.testCharges.splice(ti, 1)
        }
      }

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Canvas interaction
  const toFieldCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const w = rect.width
    const h = rect.height
    const mobile = w < 720
    const cx = w * 0.5
    const cy = h * (mobile ? 0.38 : 0.44)
    const halfSpan = Math.min(w, h) * (mobile ? 0.42 : 0.46)
    return {
      x: (clientX - rect.left - cx) / halfSpan,
      y: -(clientY - rect.top - cy) / halfSpan,
    }
  }

  const findChargeAt = (fx: number, fy: number): number => {
    const s = st.current
    for (let i = s.charges.length - 1; i >= 0; i--) {
      const c = s.charges[i]
      const r = (10 + Math.abs(c.q) * 0.8) / (Math.min(canvasRef.current?.clientWidth || 800, canvasRef.current?.clientHeight || 600) * 0.46)
      if (Math.hypot(c.x - fx, c.y - fy) < Math.max(r, 0.06)) return i
    }
    return -1
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const p = toFieldCoords(e.clientX, e.clientY)
    const s = st.current

    // Check if clicking on existing charge (for dragging)
    const hitIdx = findChargeAt(p.x, p.y)
    if (hitIdx >= 0 && s.tool !== 'erase' && s.tool !== 'test') {
      s.dragging = hitIdx
      registerFirstInteraction()
      return
    }

    registerFirstInteraction()

    if (s.tool === 'erase') {
      if (hitIdx >= 0) {
        s.charges.splice(hitIdx, 1)
        s.fieldLinesDirty = true
        setChargeCount(s.charges.length)
      }
      return
    }

    if (s.tool === 'test') {
      s.testCharges.push({ x: p.x, y: p.y, vx: 0, vy: 0, trail: [] })
      return
    }

    if (s.charges.length >= MAX_CHARGES) return
    const q = s.tool === 'positive' ? s.magnitude : -s.magnitude
    s.charges.push({ x: p.x, y: p.y, q })
    s.fieldLinesDirty = true
    setChargeCount(s.charges.length)
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const s = st.current
    if (s.dragging < 0) return
    const p = toFieldCoords(e.clientX, e.clientY)
    s.charges[s.dragging].x = Math.max(-1.4, Math.min(1.4, p.x))
    s.charges[s.dragging].y = Math.max(-1.0, Math.min(1.0, p.y))
    s.fieldLinesDirty = true
  }

  const onPointerUp = () => {
    st.current.dragging = -1
  }

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    const p = toFieldCoords(e.clientX, e.clientY)
    const s = st.current
    const hitIdx = findChargeAt(p.x, p.y)
    if (hitIdx >= 0) {
      s.charges.splice(hitIdx, 1)
      s.fieldLinesDirty = true
      setChargeCount(s.charges.length)
    }
  }

  const onDoubleClick = (e: React.MouseEvent) => {
    const p = toFieldCoords(e.clientX, e.clientY)
    const s = st.current
    const hitIdx = findChargeAt(p.x, p.y)
    if (hitIdx >= 0) {
      s.charges.splice(hitIdx, 1)
      s.fieldLinesDirty = true
      setChargeCount(s.charges.length)
    }
  }

  const clearAll = () => {
    const s = st.current
    s.charges = []
    s.testCharges = []
    s.particles = []
    s.fieldLinesDirty = true
    setChargeCount(0)
  }

  const resetDipole = () => {
    const s = st.current
    s.charges = [
      { x: -0.3, y: 0, q: 5 },
      { x: 0.3, y: 0, q: -5 },
    ]
    s.testCharges = []
    s.particles = []
    s.fieldLinesDirty = true
    setChargeCount(2)
  }

  const guideSteps: Array<GuideStep> = [
    {
      title: tx('看不见的力，怎样画出形状？'),
      body: tx('先放好一对正负电荷：青色粒子沿电场线从正电荷流向负电荷，把看不见的「场」变成可追踪的路径。'),
      action: () => {
        resetDipole()
        setViewMode('both')
        setTool('positive')
      },
      durationMs: 5_500,
    },
    {
      title: tx('放一个电荷'),
      body: tx('场会随电荷布局变形：选 + 或 − 点画布放置，拖动电荷可改场形。'),
      action: () => {
        setTool('positive')
        setViewMode('lines')
      },
      durationMs: 5_800,
    },
    {
      title: tx('叠加与抵消'),
      body: tx('多个电荷的场会矢量叠加：对称放置时某些点合场强可趋近零——这就是静电屏蔽的直觉。'),
      action: () => {
        setViewMode('both')
      },
      durationMs: 5_500,
    },
  ]

  return (
    <div className={`oss-experience ef-experience${storyMode ? ' is-story' : ' is-free'}`}>
      <canvas
        ref={canvasRef}
        className="ef-canvas"
        style={{ cursor: tool === 'erase' ? 'not-allowed' : tool === 'test' ? 'cell' : 'crosshair', touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onContextMenu={onContextMenu}
        onDoubleClick={onDoubleClick}
      />

      {!storyMode && (
        <header className="ef-question" data-experience-overlay="true">
          <h1>{tx('看不见的力，长什么形状？')}</h1>
          <p>{tx('放置正负电荷，看电场线如何从 + 流向 −，感受库仑力的 invisible architecture。')}</p>
          <button type="button" className="ef-why-btn" onClick={() => setWhyOpen(true)}>
            <Question weight="bold" /> {tx('为什么')}
          </button>
        </header>
      )}

      {!storyMode && (
        <aside className="ef-readout" data-experience-overlay="true" data-freebar-clearance="true" aria-live="polite">
          <div className="ef-readout-row">
            <small>{tx('电荷')}</small>
            <strong className="is-cyan">{chargeCount}</strong>
          </div>
        </aside>
      )}

      {!storyMode && (
        <div className={`ef-hint ${showHint ? '' : 'is-hidden'}`} data-experience-overlay="true">
          {tx('点击画布放置电荷 · 拖动移动 · 右键删除')}
        </div>
      )}

      {!storyMode && (
        <Freebar
          className="ef-freebar"
          mainClassName="ef-freebar-main"
          ariaLabel={tx('参数')}
          primaryControlBudget={4}
          secondaryDefault="closed"
          mobileDensity="comfortable"
          secondaryClassName="ef-freebar-secondary"
          secondary={(
            <div className="ef-tray">
              <div className="ef-chip-rail experience-freebar-chips" role="group" aria-label={tx('显示模式')}>
                <button
                  type="button"
                  className={viewMode === 'lines' ? 'is-on' : undefined}
                  aria-pressed={viewMode === 'lines'}
                  onClick={() => setViewMode('lines')}
                >
                  <Lightning weight="bold" /> {tx('力线')}
                </button>
                <button
                  type="button"
                  className={viewMode === 'equipotential' ? 'is-on' : undefined}
                  aria-pressed={viewMode === 'equipotential'}
                  onClick={() => setViewMode('equipotential')}
                >
                  <CircleDashed weight="bold" /> {tx('等势')}
                </button>
                <button
                  type="button"
                  className={viewMode === 'both' ? 'is-on' : undefined}
                  aria-pressed={viewMode === 'both'}
                  onClick={() => setViewMode('both')}
                >
                  <Waves weight="bold" /> {tx('叠加')}
                </button>
                <button
                  type="button"
                  className="ef-clear-btn experience-freebar-reset"
                  onClick={clearAll}
                  aria-label={tx('清空')}
                >
                  <Eraser weight="bold" aria-hidden="true" />
                  <span>{tx('清空')}</span>
                </button>
                <button
                  type="button"
                  className="ef-freebar-replay experience-freebar-story"
                  onClick={() => {
                    registerFirstInteraction()
                    enterStory()
                    replayGuide('electric-field')
                  }}
                  aria-label={tx('重播故事')}
                >
                  <FilmStrip weight="fill" aria-hidden="true" />
                  <span>{tx('故事')}</span>
                </button>
              </div>

              <label className="ef-freebar-field experience-freebar-field ef-param-mag">
                <span>{tx('电量')}</span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={magnitude}
                  onChange={(e) => {
                    if (e.nativeEvent.isTrusted) registerFirstInteraction()
                    setMagnitude(Number(e.target.value))
                  }}
                  aria-label={tx('电荷量大小')}
                />
                <b>{magnitude}</b>
              </label>
            </div>
          )}
        >
          <div className="ef-palette experience-freebar-chips" role="group" aria-label={tx('电荷工具')}>
            <button
              type="button"
              className={tool === 'positive' ? 'is-active-pos' : undefined}
              aria-pressed={tool === 'positive'}
              onClick={() => { registerFirstInteraction(); setTool('positive') }}
              aria-label={tx('正电荷')}
            >
              <Plus weight="bold" /> +
            </button>
            <button
              type="button"
              className={tool === 'negative' ? 'is-active-neg' : undefined}
              aria-pressed={tool === 'negative'}
              onClick={() => { registerFirstInteraction(); setTool('negative') }}
              aria-label={tx('负电荷')}
            >
              <Minus weight="bold" /> −
            </button>
            <button
              type="button"
              className={tool === 'test' ? 'is-active-test' : undefined}
              aria-pressed={tool === 'test'}
              onClick={() => { registerFirstInteraction(); setTool('test') }}
              aria-label={tx('试探电荷')}
            >
              <Atom weight="bold" /> {tx('试探')}
            </button>
            <button
              type="button"
              className={tool === 'erase' ? 'is-active-erase' : undefined}
              aria-pressed={tool === 'erase'}
              onClick={() => { registerFirstInteraction(); setTool('erase') }}
              aria-label={tx('擦除')}
            >
              <Eraser weight="bold" />
            </button>
          </div>
        </Freebar>
      )}

      {whyOpen && (
        <div className="ef-why" role="dialog" aria-label={tx('电场原理')} data-experience-overlay="true">
          <div className="ef-why-card">
            <button type="button" className="ef-why-close" onClick={() => setWhyOpen(false)} aria-label={tx('关闭')}>
              <X weight="bold" />
            </button>
            <h2>{tx('电场：看不见的力之建筑')}</h2>

            <h3>{tx('库仑定律')}</h3>
            <p>
              {tx('两个点电荷之间的力与电量乘积成正比，与距离平方成反比：')}
              <span className="formula">F = kQ₁Q₂ / r²</span>
              {tx('方向沿连线——同性相斥，异性相吸。你拖动电荷时看到粒子路径的改变，正是这个平方反比律在实时生效。')}
            </p>

            <h3>{tx('叠加原理')}</h3>
            <p>
              {tx('多个电荷共存时，空间每一点的电场是所有电荷贡献的矢量和：')}
              <span className="formula">E = Σ kQᵢ r̂ᵢ / rᵢ²</span>
              {tx('这就是为什么你能用多个电荷「屏蔽」中心——让各方向的贡献恰好抵消。')}
            </p>

            <h3>{tx('电场线与等势面')}</h3>
            <p>
              <span className="is-cyan">{tx('电场线')}</span>{tx('从正电荷出发、终止于负电荷，线密度正比于场强。')}
              <span className="is-purple">{tx('等势线')}</span>{tx('（V = kQ/r 的等高线）处处与电场线正交——沿等势面移动电荷不做功。')}
            </p>

            <h3>{tx('高斯定律')}</h3>
            <p>
              {tx('穿过任意封闭曲面的电通量只取决于内部净电荷：')}
              <span className="formula">∮ E·dA = Q_enclosed / ε₀</span>
              {tx('这就是为什么电场线只能从正电荷「产生」、在负电荷「消灭」——它们是场的源和汇。')}
            </p>

            <small>{tx('模型：二维点电荷解析场 E = Σ kQ·r̂/r²（含软化因子避免奇点），场线由 RK4 积分追踪，粒子沿瞬时场方向平流。')}</small>
          </div>
        </div>
      )}

      <GuideTour
        worldId="electric-field"
        steps={guideSteps}
        defaultOpen={storyMode}
        placement="stage"
        stagePlan={[
          { position: 'top-left', mobilePosition: 'top-center', motion: 'rise', width: 'normal', treatment: 'editorial', cue: 'right' },
          { position: 'bottom-right', mobilePosition: 'bottom-center', motion: 'drift-left', width: 'normal', treatment: 'caption', cue: 'left' },
          { position: 'top-right', mobilePosition: 'top-center', motion: 'scale', width: 'wide', treatment: 'monumental', cue: 'left' },
        ]}
        showReplayChip={false}
        onExit={enterFree}
      />
      {!storyMode && (
        <GhostHint worldId="electric-field" gesture={{ type: 'tap', target: '.ef-canvas', label: tx('点画布，放一个电荷') }} />
      )}
    </div>
  )
}
