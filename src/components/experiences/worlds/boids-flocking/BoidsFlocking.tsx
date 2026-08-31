import './styles/BoidsFlocking.css'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Question, X, Lightning, Spiral, FilmStrip } from '@phosphor-icons/react'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { GuideTour, replayGuide, type GuideStep } from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import { useExperienceI18n } from '~/i18n/experience'

/* ---------- constants ---------- */
const YELLOW = '#ffd166'
const CYAN = '#4dd0e1'
const PURPLE = '#b15cff'
const RED = '#ff6b6b'

const NUM_BOIDS = 2500
const MAX_SPEED = 3.2
const MIN_SPEED = 1.2
const PREDATOR_RADIUS = 120
const TRAIL_ALPHA = 0.15

/* ---------- spatial hash grid ---------- */
class SpatialGrid {
  cols: number
  rows: number
  cellSize: number
  cells: Int32Array
  counts: Int32Array
  maxPerCell: number

  constructor(w: number, h: number, cellSize: number, maxPerCell = 16) {
    this.cellSize = cellSize
    this.cols = Math.ceil(w / cellSize) + 1
    this.rows = Math.ceil(h / cellSize) + 1
    this.maxPerCell = maxPerCell
    this.cells = new Int32Array(this.cols * this.rows * maxPerCell)
    this.counts = new Int32Array(this.cols * this.rows)
  }

  clear() {
    this.counts.fill(0)
  }

  insert(idx: number, x: number, y: number) {
    const col = Math.max(0, Math.min(this.cols - 1, (x / this.cellSize) | 0))
    const row = Math.max(0, Math.min(this.rows - 1, (y / this.cellSize) | 0))
    const cellIdx = row * this.cols + col
    const count = this.counts[cellIdx]
    if (count < this.maxPerCell) {
      this.cells[cellIdx * this.maxPerCell + count] = idx
      this.counts[cellIdx] = count + 1
    }
  }

  query(x: number, y: number, radius: number, callback: (idx: number) => void) {
    const minCol = Math.max(0, ((x - radius) / this.cellSize) | 0)
    const maxCol = Math.min(this.cols - 1, ((x + radius) / this.cellSize) | 0)
    const minRow = Math.max(0, ((y - radius) / this.cellSize) | 0)
    const maxRow = Math.min(this.rows - 1, ((y + radius) / this.cellSize) | 0)
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const cellIdx = r * this.cols + c
        const count = this.counts[cellIdx]
        const base = cellIdx * this.maxPerCell
        for (let k = 0; k < count; k++) {
          callback(this.cells[base + k])
        }
      }
    }
  }
}

/* ---------- presets ---------- */
type Preset = { sep: number; ali: number; coh: number; vis: number }
const PRESETS: Record<string, Preset> = {
  fish: { sep: 0.8, ali: 2.4, coh: 1.2, vis: 60 },
  bird: { sep: 1.5, ali: 1.5, coh: 1.5, vis: 55 },
  swarm: { sep: 0.6, ali: 0.5, coh: 2.6, vis: 70 },
  chaos: { sep: 0.3, ali: 0.2, coh: 0.2, vis: 30 },
}

export function BoidsFlocking({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { storyMode, enterFree, enterStory } = useStoryFreeMode('boids-flocking')
  const [whyOpen, setWhyOpen] = useState(false)
  const [separation, setSeparation] = useState(1.5)
  const [alignment, setAlignment] = useState(1.5)
  const [cohesion, setCohesion] = useState(1.5)
  const [vision, setVision] = useState(55)
  const [activePreset, setActivePreset] = useState<string | null>('bird')
  const [hud, setHud] = useState({ count: NUM_BOIDS, avgSpeed: 0, order: 0 })
  const interactedRef = useRef(false)
  const vortexRef = useRef(0) // frames remaining for vortex force

  const st = useRef({
    px: null as Float32Array | null,
    py: null as Float32Array | null,
    vx: null as Float32Array | null,
    vy: null as Float32Array | null,
    sizes: null as Float32Array | null,
    grid: null as SpatialGrid | null,
    separation: 1.5,
    alignment: 1.5,
    cohesion: 1.5,
    vision: 55,
    mouseX: -9999,
    mouseY: -9999,
    mouseDown: false,
    lastNow: 0,
    vortex: 0,
    scatterPulse: 0,
  })

  st.current.separation = separation
  st.current.alignment = alignment
  st.current.cohesion = cohesion
  st.current.vision = vision
  st.current.vortex = vortexRef.current

  const markInteraction = useCallback(() => {
    if (!interactedRef.current) {
      interactedRef.current = true
      controls.registerInteraction()
    }
  }, [controls])

  useEffect(() => {
    controls.completeOnboarding()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls])

  const initBoids = useCallback((w: number, h: number) => {
    const s = st.current
    s.px = new Float32Array(NUM_BOIDS)
    s.py = new Float32Array(NUM_BOIDS)
    s.vx = new Float32Array(NUM_BOIDS)
    s.vy = new Float32Array(NUM_BOIDS)
    s.sizes = new Float32Array(NUM_BOIDS)
    for (let i = 0; i < NUM_BOIDS; i++) {
      s.px[i] = Math.random() * w
      s.py[i] = Math.random() * h
      const angle = Math.random() * Math.PI * 2
      const speed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED)
      s.vx[i] = Math.cos(angle) * speed
      s.vy[i] = Math.sin(angle) * speed
      s.sizes[i] = 3.5 + Math.random() * 2.5
    }
    s.grid = new SpatialGrid(w, h, s.vision)
  }, [])

  /* ---------- main animation loop ---------- */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf = 0
    let hudTick = 0

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

      if (!s.px) initBoids(w, h)
      const { px, py, vx, vy, sizes, grid } = s as {
        px: Float32Array; py: Float32Array; vx: Float32Array; vy: Float32Array
        sizes: Float32Array; grid: SpatialGrid
      }

      const dt = s.lastNow ? Math.min((now - s.lastNow) / 16.67, 2) : 1
      s.lastNow = now

      const sep = s.separation
      const ali = s.alignment
      const coh = s.cohesion
      const vis = s.vision
      const vis2 = vis * vis
      const sepDist = vis * 0.4
      const sepDist2 = sepDist * sepDist

      // Rebuild spatial grid
      if (grid.cellSize !== vis) {
        s.grid = new SpatialGrid(w, h, vis)
      }
      const g = s.grid!
      g.clear()
      for (let i = 0; i < NUM_BOIDS; i++) {
        g.insert(i, px[i], py[i])
      }

      // Physics update
      const cx = w / 2
      const cy = h / 2

      for (let i = 0; i < NUM_BOIDS; i++) {
        let sepX = 0, sepY = 0
        let aliX = 0, aliY = 0
        let cohX = 0, cohY = 0
        let neighbors = 0

        const xi = px[i]
        const yi = py[i]

        g.query(xi, yi, vis, (j: number) => {
          if (j === i) return
          const dx = px[j] - xi
          const dy = py[j] - yi
          const d2 = dx * dx + dy * dy
          if (d2 > vis2 || d2 < 0.01) return
          neighbors++
          aliX += vx[j]
          aliY += vy[j]
          cohX += px[j]
          cohY += py[j]
          if (d2 < sepDist2) {
            const d = Math.sqrt(d2)
            sepX -= dx / d
            sepY -= dy / d
          }
        })

        let ax = 0, ay = 0

        if (neighbors > 0) {
          // Separation
          ax += sepX * sep * 0.05
          ay += sepY * sep * 0.05
          // Alignment
          aliX /= neighbors
          aliY /= neighbors
          ax += (aliX - vx[i]) * ali * 0.02
          ay += (aliY - vy[i]) * ali * 0.02
          // Cohesion
          cohX /= neighbors
          cohY /= neighbors
          ax += (cohX - xi) * coh * 0.0004
          ay += (cohY - yi) * coh * 0.0004
        }

        // Mouse interaction: predator avoidance or attraction
        const mdx = xi - s.mouseX
        const mdy = yi - s.mouseY
        const md2 = mdx * mdx + mdy * mdy
        if (md2 < PREDATOR_RADIUS * PREDATOR_RADIUS && md2 > 1) {
          const md = Math.sqrt(md2)
          const force = (1 - md / PREDATOR_RADIUS) * 0.8
          if (s.mouseDown) {
            // Attract (food mode)
            ax -= (mdx / md) * force * 0.6
            ay -= (mdy / md) * force * 0.6
          } else {
            // Repel (predator)
            ax += (mdx / md) * force
            ay += (mdy / md) * force
          }
        }

        // Vortex force
        if (s.vortex > 0) {
          const vdx = xi - cx
          const vdy = yi - cy
          const vd = Math.sqrt(vdx * vdx + vdy * vdy) + 1
          // Tangential force (perpendicular to radius)
          ax += (-vdy / vd) * 0.15
          ay += (vdx / vd) * 0.15
          // Slight inward pull
          ax -= (vdx / vd) * 0.03
          ay -= (vdy / vd) * 0.03
        }

        // Scatter pulse
        if (s.scatterPulse > 0) {
          const sdx = xi - cx
          const sdy = yi - cy
          const sd = Math.sqrt(sdx * sdx + sdy * sdy) + 1
          ax += (sdx / sd) * 1.2
          ay += (sdy / sd) * 1.2
        }

        // Apply acceleration
        vx[i] += ax * dt
        vy[i] += ay * dt

        // Clamp speed
        const speed = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i])
        if (speed > MAX_SPEED) {
          vx[i] = (vx[i] / speed) * MAX_SPEED
          vy[i] = (vy[i] / speed) * MAX_SPEED
        } else if (speed < MIN_SPEED && speed > 0.01) {
          vx[i] = (vx[i] / speed) * MIN_SPEED
          vy[i] = (vy[i] / speed) * MIN_SPEED
        }

        // Update position
        px[i] += vx[i] * dt
        py[i] += vy[i] * dt

        // Wrap around edges
        if (px[i] < -10) px[i] += w + 20
        else if (px[i] > w + 10) px[i] -= w + 20
        if (py[i] < -10) py[i] += h + 20
        else if (py[i] > h + 10) py[i] -= h + 20
      }

      // Decay vortex and scatter
      if (s.vortex > 0) {
        s.vortex--
        vortexRef.current = s.vortex
      }
      if (s.scatterPulse > 0) s.scatterPulse--

      // Order parameter & average speed for scientific readout
      let totalSpeed = 0
      let orderRe = 0
      let orderIm = 0
      for (let i = 0; i < NUM_BOIDS; i++) {
        totalSpeed += Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i])
        const heading = Math.atan2(vy[i], vx[i])
        orderRe += Math.cos(heading)
        orderIm += Math.sin(heading)
      }
      const order = Math.sqrt(orderRe * orderRe + orderIm * orderIm) / NUM_BOIDS

      // HUD update (throttled)
      hudTick += dt
      if (hudTick > 10) {
        hudTick = 0
        setHud({
          count: NUM_BOIDS,
          avgSpeed: totalSpeed / NUM_BOIDS,
          order,
        })
      }

      // ---- Draw ----
      // Trail effect: semi-transparent overlay
      ctx.fillStyle = `rgba(3, 5, 8, ${TRAIL_ALPHA})`
      ctx.fillRect(0, 0, w, h)

      // Subtle radial gradient background (drawn faintly)
      if (Math.random() < 0.02) {
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.6)
        grad.addColorStop(0, 'rgba(15, 20, 35, 0.03)')
        grad.addColorStop(1, 'rgba(3, 5, 8, 0)')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, w, h)
      }

      // Draw boids as triangles colored by heading
      for (let i = 0; i < NUM_BOIDS; i++) {
        const heading = Math.atan2(vy[i], vx[i])
        const hue = ((heading + Math.PI) / (Math.PI * 2)) * 360
        const size = sizes[i]

        ctx.save()
        ctx.translate(px[i], py[i])
        ctx.rotate(heading)
        ctx.fillStyle = `hsl(${hue | 0}, 80%, 60%)`
        ctx.beginPath()
        ctx.moveTo(size, 0)
        ctx.lineTo(-size * 0.6, size * 0.45)
        ctx.lineTo(-size * 0.6, -size * 0.45)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      }

      // Draw faint connection lines between very close neighbors (sampled for perf)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)'
      ctx.lineWidth = 0.5
      const lineStep = 4 // sample every 4th boid for performance
      for (let i = 0; i < NUM_BOIDS; i += lineStep) {
        const xi = px[i]
        const yi = py[i]
        g.query(xi, yi, 15, (j: number) => {
          if (j <= i) return
          const dx = px[j] - xi
          const dy = py[j] - yi
          if (dx * dx + dy * dy < 225) { // 15px
            ctx.beginPath()
            ctx.moveTo(xi, yi)
            ctx.lineTo(px[j], py[j])
            ctx.stroke()
          }
        })
      }

      // Mouse cursor glow
      if (s.mouseX > -999) {
        const grad = ctx.createRadialGradient(s.mouseX, s.mouseY, 0, s.mouseX, s.mouseY, PREDATOR_RADIUS)
        if (s.mouseDown) {
          grad.addColorStop(0, 'rgba(77, 208, 225, 0.12)')
          grad.addColorStop(1, 'rgba(77, 208, 225, 0)')
        } else {
          grad.addColorStop(0, 'rgba(255, 107, 107, 0.08)')
          grad.addColorStop(1, 'rgba(255, 107, 107, 0)')
        }
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(s.mouseX, s.mouseY, PREDATOR_RADIUS, 0, Math.PI * 2)
        ctx.fill()
      }

      raf = requestAnimationFrame(frame)
    }

    // Initial full clear
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = '#030508'
    ctx.fillRect(0, 0, w, h)

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------- event handlers ---------- */
  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    st.current.mouseX = e.clientX - rect.left
    st.current.mouseY = e.clientY - rect.top
  }, [])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    markInteraction()
    st.current.mouseDown = true
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    st.current.mouseX = e.clientX - rect.left
    st.current.mouseY = e.clientY - rect.top
  }, [markInteraction])

  const onPointerUp = useCallback(() => {
    st.current.mouseDown = false
  }, [])

  const onPointerLeave = useCallback(() => {
    st.current.mouseX = -9999
    st.current.mouseY = -9999
    st.current.mouseDown = false
  }, [])

  const showPreset = useCallback((key: string) => {
    const p = PRESETS[key]
    if (!p) return
    setSeparation(p.sep)
    setAlignment(p.ali)
    setCohesion(p.coh)
    setVision(p.vis)
    setActivePreset(key)
  }, [])

  const applyPreset = useCallback((key: string) => {
    markInteraction()
    showPreset(key)
  }, [markInteraction, showPreset])

  const doScatter = useCallback(() => {
    markInteraction()
    st.current.scatterPulse = 30
  }, [markInteraction])

  const doVortex = useCallback(() => {
    markInteraction()
    st.current.vortex = 300
    vortexRef.current = 300
  }, [markInteraction])

  /* ---------- guide steps ---------- */
  const guideSteps: Array<GuideStep> = [
    {
      title: tx('没有领队，它们也能一起转弯'),
      body: tx('每只鸟只看附近的同伴，不知道整个鸟群要去哪里。先看它们怎样自己排成一支队伍。'),
      action: () => showPreset('bird'),
      durationMs: 5_200,
    },
    {
      title: tx('第一条：别撞上邻居'),
      body: tx('靠得太近就彼此让开。少了这一步，鸟群会挤成一团；有了它，每只鸟都留出一点空间。'),
      action: () => {
        setSeparation(2.8)
        setAlignment(0.2)
        setCohesion(0.3)
        setVision(48)
        setActivePreset(null)
      },
      durationMs: 5_400,
    },
    {
      title: tx('第二条：朝大家的方向飞'),
      body: tx('每只鸟轻轻调整方向，跟附近同伴差不多。许多很小的转向叠在一起，队伍就会像水流一样弯过去。'),
      action: () => showPreset('fish'),
      durationMs: 5_800,
    },
    {
      title: tx('第三条：别离队伍太远'),
      body: tx('落单时就往同伴中间靠一点。避让、跟随方向、回到队伍——只有这三件小事，就组成了完整鸟群。'),
      action: () => showPreset('swarm'),
      durationMs: 6_000,
    },
  ]

  return (
    <div className={`oss-experience bf-experience${storyMode ? ' is-story' : ' is-free'}`}>
      <canvas
        ref={canvasRef}
        className="bf-canvas"
        onPointerMove={onPointerMove}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        style={{ cursor: 'crosshair', touchAction: 'none' }}
      />

      {!storyMode && (
      <header className="bf-plaque" data-experience-overlay="true">
        <h1>{tx('没有领袖，鸟群如何飞出统一的形状？')}</h1>
        <p>{tx('每只鸟只做三件小事：别撞上、跟着飞、别掉队。')}</p>
        <button type="button" className="bf-why-btn" onClick={() => setWhyOpen(true)}>
          <Question weight="bold" /> {tx('为什么')}
        </button>
      </header>
      )}

      {!storyMode && (
      <aside className="bf-stats" data-experience-overlay="true" data-freebar-clearance="true">
        <div className="bf-stats-row">
          <small>{tx('个体数量')}</small>
          <strong>{hud.count}</strong>
        </div>
        <div className="bf-stats-row">
          <small>{tx('平均速度')}</small>
          <strong className="is-cyan">{hud.avgSpeed.toFixed(2)}</strong>
        </div>
        <div className="bf-stats-row">
          <small>{tx('秩序参数')}</small>
          <strong className="is-purple">{hud.order.toFixed(3)}</strong>
        </div>
      </aside>
      )}

      {!storyMode && (
        <Freebar
          className="bf-freebar"
          mainClassName="bf-freebar-main"
          ariaLabel={tx('参数')}
          primaryControlBudget={4}
          secondaryDefault="closed"
          secondary={(
            <div className="bf-tray">
              <div className="bf-chip-rail experience-freebar-chips" role="group" aria-label={tx('动作')}>
                <button type="button" className="bf-btn bf-btn--scatter" onClick={doScatter}>
                  <Lightning weight="fill" aria-hidden="true" /> {tx('惊扰')}
                </button>
                <button type="button" className="bf-btn bf-btn--vortex" onClick={doVortex}>
                  <Spiral weight="bold" aria-hidden="true" /> {tx('漩涡')}
                </button>
                <button
                  type="button"
                  className="experience-freebar-story"
                  onClick={() => {
                    markInteraction()
                    enterStory()
                    replayGuide('boids-flocking')
                  }}
                  aria-label={tx('重播故事')}
                >
                  <FilmStrip weight="fill" aria-hidden="true" />
                  <span>{tx('故事')}</span>
                </button>
              </div>
              <div className="bf-param-rail" role="group" aria-label={tx('参数')}>
                <label className="bf-freebar-field bf-slider--sep">
                  <span>{tx('分离')}</span>
                  <input type="range" min="0" max="3" step="0.1" value={separation} onChange={(e) => { markInteraction(); setSeparation(Number(e.target.value)); setActivePreset(null) }} aria-label={tx('分离')} />
                  <b>{separation.toFixed(1)}</b>
                </label>
                <label className="bf-freebar-field bf-slider--ali">
                  <span>{tx('对齐')}</span>
                  <input type="range" min="0" max="3" step="0.1" value={alignment} onChange={(e) => { markInteraction(); setAlignment(Number(e.target.value)); setActivePreset(null) }} aria-label={tx('对齐')} />
                  <b>{alignment.toFixed(1)}</b>
                </label>
                <label className="bf-freebar-field bf-slider--coh">
                  <span>{tx('聚合')}</span>
                  <input type="range" min="0" max="3" step="0.1" value={cohesion} onChange={(e) => { markInteraction(); setCohesion(Number(e.target.value)); setActivePreset(null) }} aria-label={tx('聚合')} />
                  <b>{cohesion.toFixed(1)}</b>
                </label>
                <label className="bf-freebar-field bf-slider--vis">
                  <span>{tx('视野')}</span>
                  <input type="range" min="20" max="100" step="5" value={vision} onChange={(e) => { markInteraction(); setVision(Number(e.target.value)); setActivePreset(null) }} aria-label={tx('视野')} />
                  <b>{vision}</b>
                </label>
              </div>
            </div>
          )}
        >
          <div className="bf-presets experience-freebar-seg" role="group" aria-label={tx('预设')}>
            <button type="button" className={activePreset === 'fish' ? 'is-active' : undefined} onClick={() => applyPreset('fish')}>{tx('鱼群')}</button>
            <button type="button" className={activePreset === 'bird' ? 'is-active' : undefined} onClick={() => applyPreset('bird')}>{tx('鸟群')}</button>
            <button type="button" className={activePreset === 'swarm' ? 'is-active' : undefined} onClick={() => applyPreset('swarm')}>{tx('蜂群')}</button>
            <button type="button" className={activePreset === 'chaos' ? 'is-active' : undefined} onClick={() => applyPreset('chaos')}>{tx('混沌')}</button>
          </div>
        </Freebar>
      )}

      {whyOpen && (
        <div className="bf-why" role="dialog" aria-label={tx('Boids 群体智能原理解释')} data-experience-overlay="true">
          <div className="bf-why-card">
            <button type="button" className="bf-why-close" onClick={() => setWhyOpen(false)} aria-label={tx('关闭')}>
              <X weight="bold" />
            </button>
            <h2>{tx('没有领袖，秩序从何而来？')}</h2>
            <p>
              {tx('1986 年，Craig Reynolds 提出 Boids 模型，用三条极简规则模拟鸟群运动：')}<span className="is-yellow">{tx('分离')}</span>{tx('（避免拥挤）、')}<span className="is-cyan">{tx('对齐')}</span>{tx('（匹配邻居方向）、')}<span className="is-purple">{tx('聚合')}</span>{tx('（靠近群体中心）。没有任何个体拥有全局视野，也没有领导者发号施令。')}
            </p>
            <p>
              {tx('复杂而优美的集体行为——分流、合流、漩涡、编队——完全从局部交互中')}<strong>{tx('涌现')}</strong>{tx('。这与统计物理中的相变、自组织临界性一脉相承：简单规则 + 大量个体 = 不可还原为个体的整体性质。')}
            </p>
            <p>
              {tx('秩序参数（order parameter）衡量所有个体运动方向的一致性：0 表示完全随机，1 表示完美对齐。当对齐力超过噪声时，系统发生「有序化相变」，类似铁磁体中自旋的自发排列。')}
            </p>
            <p>
              <span className="is-red">{tx('边界条件：')}</span>{tx('本模拟使用 2500 个二维粒子、空间哈希加速邻居查询，忽略三维深度、风场和个体差异。真实鸟群还受视觉遮挡、反应延迟和捕食压力影响。')}
            </p>
            <small>{tx('延伸阅读：Reynolds 1987 "Flocks, Herds, and Schools" · Vicsek 模型 · 自组织与涌现')}</small>
          </div>
        </div>
      )}

      <GuideTour worldId="boids-flocking" steps={guideSteps} defaultOpen={storyMode} placement="stage" stagePlan={[
        {position: 'top-left', mobilePosition: 'top-left', motion: 'rise', tone: 'light', width: 'normal', treatment: 'editorial'},
        {position: 'top-right', mobilePosition: 'top-right', motion: 'drift-left', tone: 'light', width: 'narrow', treatment: 'annotation'},
        {position: 'bottom-left', mobilePosition: 'bottom-left', motion: 'drift-right', tone: 'light', width: 'normal', treatment: 'monumental'},
        {position: 'bottom-right', mobilePosition: 'bottom-right', motion: 'fade', tone: 'light', width: 'normal', treatment: 'caption'},
      ]} showReplayChip={false} onExit={enterFree} />
      {!storyMode && (
        <GhostHint worldId="boids-flocking" gesture={{ type: 'drag', target: '.bf-canvas', dx: 80, dy: 0, label: tx('移动鼠标驱散鱼群') }} />
      )}
    </div>
  )
}
