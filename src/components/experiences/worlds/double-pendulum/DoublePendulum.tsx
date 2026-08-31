import './styles/DoublePendulum.css'

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { ArrowCounterClockwise, Play, Question, X, FilmStrip } from '@phosphor-icons/react'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { GuideTour, replayGuide, type GuideStep } from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import {
  useIncomingShareState,
  useShareableState,
} from '~/components/experiences/useShareableState'
import { readNumber } from '~/lib/share-state'
import { useExperienceI18n } from '~/i18n/experience'

const CYAN = '#4dd0e1'
const YELLOW = '#ffd166'
const PURPLE = '#b15cff'
const RED = '#ff6b6b'

const G = 9.8

/** 等质量等长双摆的状态导数（θ1, θ2, ω1, ω2） */
function deriv(y: [number, number, number, number]): [number, number, number, number] {
  const [t1, t2, w1, w2] = y
  const d = t1 - t2
  const den = 3 - Math.cos(2 * d)
  const a1 = (-3 * G * Math.sin(t1) - G * Math.sin(t1 - 2 * t2) - 2 * Math.sin(d) * (w2 * w2 + w1 * w1 * Math.cos(d))) / den
  const a2 = (2 * Math.sin(d) * (2 * w1 * w1 + 2 * G * Math.cos(t1) + w2 * w2 * Math.cos(d))) / den
  return [w1, w2, a1, a2]
}

function rk4(y: [number, number, number, number], h: number) {
  const k1 = deriv(y)
  const y2: [number, number, number, number] = [y[0] + (h / 2) * k1[0], y[1] + (h / 2) * k1[1], y[2] + (h / 2) * k1[2], y[3] + (h / 2) * k1[3]]
  const k2 = deriv(y2)
  const y3: [number, number, number, number] = [y[0] + (h / 2) * k2[0], y[1] + (h / 2) * k2[1], y[2] + (h / 2) * k2[2], y[3] + (h / 2) * k2[3]]
  const k3 = deriv(y3)
  const y4: [number, number, number, number] = [y[0] + h * k3[0], y[1] + h * k3[1], y[2] + h * k3[2], y[3] + h * k3[3]]
  const k4 = deriv(y4)
  y[0] += (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0])
  y[1] += (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])
  y[2] += (h / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2])
  y[3] += (h / 6) * (k1[3] + 2 * k2[3] + 2 * k3[3] + k4[3])
}

type Pend = { y: [number, number, number, number]; ghost: [number, number, number, number] }

const wrapDeg = (a: number) => {
  let d = ((a * 180) / Math.PI) % 360
  if (d > 180) d -= 360
  if (d < -180) d += 360
  return Math.abs(d)
}

export function DoublePendulum({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const incoming = useIncomingShareState()
  const { storyMode, enterFree, enterStory } = useStoryFreeMode('double-pendulum', {
    firstVisit: Object.keys(incoming).length > 0 ? 'free' : 'story',
  })
  /**
   * The release angles are the entire experiment: two arms let go a tenth of a
   * degree apart end up in different worlds, so "here is exactly where I let
   * go" is the thing worth sending.
   */
  const [armed, setArmed] = useState(() => ({
    t1: readNumber(incoming, 'a', 2.2, { min: -6.3, max: 6.3 }),
    t2: readNumber(incoming, 'b', 1.4, { min: -6.3, max: 6.3 }),
  }))
  const [running, setRunning] = useState(false)
  const [whyOpen, setWhyOpen] = useState(false)
  const [hud, setHud] = useState({ div: 0, time: 0, burstAt: -1 })

  useShareableState({
    state: { a: armed.t1, b: armed.t2 },
    summary: `${tx('放手角度')} ${((armed.t1 * 180) / Math.PI).toFixed(0)}° / ${((armed.t2 * 180) / Math.PI).toFixed(0)}°`,
  })
  const dragRef = useRef<null | 'b1' | 'b2'>(null)

  const st = useRef({
    armed,
    running,
    pend: null as Pend | null,
    trail1: [] as Array<[number, number]>,
    trailG: [] as Array<[number, number]>,
    burstAt: -1,
    hudDiv: -1,
    lastNow: 0,
    elapsed: 0,
    L: 160,
    cx: 0,
    cy: 0,
  })
  st.current.armed = armed
  st.current.running = running

  const release = (t1 = st.current.armed.t1, t2 = st.current.armed.t2) => {
    const s = st.current
    s.pend = { y: [t1, t2, 0, 0], ghost: [t1 + 0.0017, t2, 0, 0] }
    s.trail1 = []
    s.trailG = []
    s.burstAt = -1
    setRunning(true)
  }

  const reset = () => {
    st.current.pend = null
    st.current.trail1 = []
    st.current.trailG = []
    st.current.burstAt = -1
    setRunning(false)
    setHud({ div: 0, time: 0, burstAt: -1 })
  }

  useEffect(() => {
    controls.completeOnboarding()
    // 入场自动演示（?ff=N 可快进 N 秒，用于深链与海报）
    const ff = Number(new URLSearchParams(window.location.search).get('ff'))
    const timer = setTimeout(() => {
      release()
      if (ff > 0) {
        const s = st.current
        if (s.pend) {
          const steps = Math.ceil(ff / 0.002)
          for (let i = 0; i < steps; i += 1) {
            rk4(s.pend.y, 0.002)
            rk4(s.pend.ghost, 0.002)
            if (i % 3 === 0) recordTrail(s)
          }
          s.elapsed = ff
        }
      }
    }, 900)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls])

  const recordTrail = (s: typeof st.current) => {
    if (!s.pend) return
    const p1 = bobPos(s.pend.y, s)
    const p2 = bobPos(s.pend.ghost, s)
    s.trail1.push(p1)
    s.trailG.push(p2)
    if (s.trail1.length > 480) s.trail1.splice(0, s.trail1.length - 480)
    if (s.trailG.length > 480) s.trailG.splice(0, s.trailG.length - 480)
  }

  const bobPos = (y: [number, number, number, number], s: typeof st.current): [number, number] => {
    const x1 = s.cx + s.L * Math.sin(y[0])
    const y1 = s.cy + s.L * Math.cos(y[0])
    return [x1 + s.L * Math.sin(y[1]), y1 + s.L * Math.cos(y[1])]
  }

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
      const dt = s.lastNow ? Math.min((now - s.lastNow) / 1000, 0.05) : 0
      s.lastNow = now

      const mobile = w < 720
      s.cx = w / 2
      s.cy = h * (mobile ? 0.3 : 0.28)
      s.L = Math.min(w, h) * (mobile ? 0.16 : 0.18)

      // 物理推进
      if (s.running && s.pend) {
        let rem = dt
        while (rem > 0) {
          const hStep = Math.min(0.002, rem)
          rk4(s.pend.y, hStep)
          rk4(s.pend.ghost, hStep)
          rem -= hStep
        }
        s.elapsed = (s.elapsed ?? 0) + dt
        recordTrail(s)
      }

      const div = s.pend ? wrapDeg(s.pend.y[0] - s.pend.ghost[0]) : 0
      if (div > 25 && s.burstAt < 0) s.burstAt = s.elapsed ?? 0
      if (Math.abs(div - s.hudDiv) > 0.5 || (s.burstAt >= 0) !== (hud.burstAt >= 0)) {
        s.hudDiv = div
        setHud({ div, time: s.elapsed ?? 0, burstAt: s.burstAt })
      }

      // ---- 绘制 ----
      ctx.fillStyle = '#05070f'
      ctx.fillRect(0, 0, w, h)

      // 参考竖线
      ctx.strokeStyle = 'rgba(125,139,176,0.15)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 6])
      ctx.beginPath(); ctx.moveTo(s.cx, s.cy - 20); ctx.lineTo(s.cx, s.cy + 2.4 * s.L); ctx.stroke()
      ctx.setLineDash([])

      const drawTrail = (trail: Array<[number, number]>, rgb: string, maxA: number) => {
        for (let i = 1; i < trail.length; i += 1) {
          const a = (i / trail.length) * maxA
          ctx.strokeStyle = `rgba(${rgb},${a})`
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(trail[i - 1][0], trail[i - 1][1])
          ctx.lineTo(trail[i][0], trail[i][1])
          ctx.stroke()
        }
      }
      drawTrail(s.trailG, '177,92,255', 0.5)
      drawTrail(s.trail1, '77,208,225', 0.85)

      const drawPend = (y: [number, number, number, number], main: boolean) => {
        const x1 = s.cx + s.L * Math.sin(y[0])
        const y1 = s.cy + s.L * Math.cos(y[0])
        const x2 = x1 + s.L * Math.sin(y[1])
        const y2 = y1 + s.L * Math.cos(y[1])
        const rodC = main ? 'rgba(232,238,247,0.85)' : 'rgba(177,92,255,0.4)'
        const bobC = main ? (s.running ? CYAN : YELLOW) : PURPLE
        ctx.strokeStyle = rodC
        ctx.lineWidth = main ? 3 : 2
        ctx.beginPath(); ctx.moveTo(s.cx, s.cy); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
        ctx.fillStyle = bobC
        ctx.shadowColor = bobC
        ctx.shadowBlur = main ? 14 : 8
        ctx.beginPath(); ctx.arc(x1, y1, main ? 10 : 7, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.arc(x2, y2, main ? 12 : 8, 0, Math.PI * 2); ctx.fill()
        ctx.shadowBlur = 0
        return { x1, y1, x2, y2 }
      }

      // 支点
      ctx.fillStyle = 'rgba(210,220,235,0.8)'
      ctx.beginPath(); ctx.arc(s.cx, s.cy, 6, 0, Math.PI * 2); ctx.fill()

      if (s.pend) {
        drawPend(s.pend.ghost, false)
        drawPend(s.pend.y, true)
      } else {
        // 待命态：可拖动的黄色摆球
        drawPend([s.armed.t1, s.armed.t2, 0, 0], true)
        ctx.fillStyle = 'rgba(255,209,102,0.9)'
        ctx.font = `700 ${mobile ? 12 : 14}px system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(tx('拖动黄色摆球设定角度，然后点「释放」'), s.cx, s.cy + 2.6 * s.L)
      }

      // 分离角仪表
      if (s.pend) {
        const bw = mobile ? 150 : 210
        const bx = s.cx - bw / 2
        const by = mobile ? 96 : 118
        const frac = Math.min(1, div / 180)
        ctx.fillStyle = 'rgba(255,255,255,0.08)'
        ctx.beginPath(); ctx.roundRect(bx, by, bw, 8, 4); ctx.fill()
        const grad = ctx.createLinearGradient(bx, 0, bx + bw, 0)
        grad.addColorStop(0, CYAN)
        grad.addColorStop(0.5, YELLOW)
        grad.addColorStop(1, RED)
        ctx.fillStyle = grad
        ctx.beginPath(); ctx.roundRect(bx, by, Math.max(6, bw * frac), 8, 4); ctx.fill()
        ctx.fillStyle = div > 25 ? RED : 'rgba(203,213,225,0.85)'
        ctx.font = `700 ${mobile ? 11 : 13}px system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(
          tx(div > 25 ? `混沌爆发：两个摆彻底分叉（${div.toFixed(0)}°）` : `两个摆的分离角：${div.toFixed(1)}°`),
          s.cx,
          by - 8,
        )
      }

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hud.burstAt >= 0])

  const armedPos = () => {
    const s = st.current
    const x1 = s.cx + s.L * Math.sin(s.armed.t1)
    const y1 = s.cy + s.L * Math.cos(s.armed.t1)
    return { x1, y1, x2: x1 + s.L * Math.sin(s.armed.t2), y2: y1 + s.L * Math.cos(s.armed.t2) }
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (st.current.running) return
    const rect = canvasRef.current!.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const p = armedPos()
    const d1 = Math.hypot(px - p.x1, py - p.y1)
    const d2 = Math.hypot(px - p.x2, py - p.y2)
    if (Math.min(d1, d2) > 90) return
    controls.registerInteraction()
    dragRef.current = d1 <= d2 ? 'b1' : 'b2'
    canvasRef.current?.setPointerCapture(e.pointerId)
    moveBob(e)
  }

  const moveBob = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (!drag) return
    const s = st.current
    const rect = canvasRef.current!.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    if (drag === 'b1') {
      const t1 = Math.atan2(px - s.cx, py - s.cy)
      setArmed((a) => ({ ...a, t1 }))
    } else {
      const p = armedPos()
      const t2 = Math.atan2(px - p.x1, py - p.y1)
      setArmed((a) => ({ ...a, t2 }))
    }
  }

  // 故事只点「下一步」；动手拖摆交给结束后的 GhostHint
  const guideSteps: Array<GuideStep> = [
    {
      title: '两个几乎一样的摆',
      body: '青色摆旁边有一个紫色影子摆——初始角只差 0.1°。看它们多久分道扬镳。',
      action: () => release(2.2, 1.4),
      durationMs: 6500,
    },
    {
      title: '盯住分离角',
      body: '起初几乎重合；某一时刻分离角突然炸开——0.1° 被指数放大。左下读数会跟着跳。',
      action: () => release(2.4, 1.6),
      durationMs: 7000,
    },
    {
      title: '这不是随机，是混沌',
      body: '每一步都由确定方程驱动，但长期对初值极端敏感。',
      action: () => release(2.6, 1.9),
      durationMs: 5500,
    },
  ]

  return (
    <div className={`oss-experience pend-experience${storyMode ? ' is-story' : ' is-free'}`}>
      <canvas
        ref={canvasRef}
        className="pend-canvas"
        style={{ cursor: running ? 'default' : 'grab', touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={(e) => moveBob(e)}
        onPointerUp={() => { dragRef.current = null }}
        onPointerCancel={() => { dragRef.current = null }}
      />

      {!storyMode && (
        <header className="pend-plaque" data-experience-overlay="true">
          <h1>{tx("差 0.1° 的两次放手，为什么结局完全不同？")}</h1>
          <strong>{tx("紫色影子摆只偏 0.1°。盯住它何时分道扬镳。")}</strong>
          <button type="button" className="pend-why-btn" onClick={() => setWhyOpen(true)}>
            <Question weight="bold" /> {tx("为什么")}
          </button>
        </header>
      )}

      {!storyMode && (
        <aside className="pend-readout" data-experience-overlay="true">
          <div className="pend-readout-row">
            <small>{tx("分离角")}</small>
            <strong className={hud.burstAt >= 0 ? 'is-red' : 'is-cyan'}>{tx(hud.div.toFixed(1))}°</strong>
          </div>
          <div className="pend-readout-row">
            <small>{tx("时间")}</small>
            <strong className="is-cyan">{tx(hud.time.toFixed(1))} s</strong>
          </div>
          {hud.burstAt >= 0 && (
            <div className="pend-critical">
              {tx("0.1° 之差，")}{tx(hud.burstAt.toFixed(1))}{tx(" 秒后分叉")}
            </div>
          )}
        </aside>
      )}

      {!storyMode && (
        <Freebar
          className="pend-freebar"
          mainClassName="pend-freebar-main"
          ariaLabel={tx('双摆控制')}
          primaryControlBudget={1}
        >
          {!running ? (
            <button
              type="button"
              className="pend-release"
              onClick={() => {
                controls.registerInteraction()
                release()
              }}
            >
              <Play weight="fill" /> {tx("释放双摆")}
            </button>
          ) : (
            <button
              type="button"
              className="experience-freebar-reset"
              onClick={() => {
                controls.registerInteraction()
                reset()
              }}
              aria-label={tx('重置')}
            >
              <ArrowCounterClockwise weight="bold" aria-hidden="true" />
              <span>{tx('重置')}</span>
            </button>
          )}
          <button
            type="button"
            className="experience-freebar-story"
            onClick={() => {
              controls.registerInteraction()
              enterStory()
              replayGuide('double-pendulum')
            }}
            aria-label={tx('重播故事')}
          >
            <FilmStrip weight="fill" aria-hidden="true" />
            <span>{tx('故事')}</span>
          </button>
        </Freebar>
      )}

      {whyOpen && (
        <div className="pend-why" role="dialog" aria-label={tx("双摆混沌原理解释")} data-experience-overlay="true">
          <div className="pend-why-card">
            <button type="button" className="pend-why-close" onClick={() => setWhyOpen(false)} aria-label={tx("关闭")}>
              <X weight="bold" />
            </button>
            <h2>{tx("确定的方程，为什么给出不可预测的结果？")}</h2>
            <p>
              {tx("双摆的每一步都由牛顿方程精确决定，没有任何随机数。 但在这个系统里，")}<strong>{tx("初值的微小差异会被指数放大")}</strong>{tx("（正的李雅普诺夫指数）： 0.1° 的差，每过一小段时间就翻一倍，几十步后吞掉全部信息。")}</p>
            <p>
              {tx("这就是")}<span className="is-purple">{tx("混沌")}</span>{tx("：确定性 ≠ 可预测。 短期你能逐帧算准，长期误差必然爆炸——天气预报的极限也来自同一个数学事实。")}</p>
            <p>
              <span className="is-red">{tx("边界条件：")}</span>{tx("本页是无阻尼、刚体杆的理想摆。 真实摆会因摩擦耗散而慢慢失去混沌、归于静止——混沌活在「能量足够」的窗口里。")}</p>
            <small>{tx("延伸阅读：Wikipedia 双摆 · 混沌理论 · 李雅普诺夫指数")}</small>
          </div>
        </div>
      )}

      <GuideTour
        worldId="double-pendulum"
        steps={guideSteps}
        defaultOpen={storyMode}
        placement="stage"
        stagePlan={[
          { position: 'top-left', mobilePosition: 'top-center', motion: 'rise', width: 'normal', treatment: 'editorial', cue: 'right' },
          { position: 'top-right', mobilePosition: 'top-center', motion: 'drift-left', width: 'normal', treatment: 'caption', cue: 'left' },
          { position: 'bottom-left', mobilePosition: 'bottom-center', motion: 'fade', width: 'wide', treatment: 'monumental', cue: 'right' },
        ]}
        showReplayChip={false}
        onExit={enterFree}
      />
      {!storyMode && (
        <GhostHint worldId="double-pendulum" delay={1600} gesture={{ type: 'drag', target: '.pend-canvas', dx: 50, dy: -70, label: tx('拖摆球到高处，再松手') }} />
      )}
    </div>
  )
}
