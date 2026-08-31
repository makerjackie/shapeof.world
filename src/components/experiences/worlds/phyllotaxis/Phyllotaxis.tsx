import './styles/Phyllotaxis.css'
import { FilmStrip } from '@phosphor-icons/react'

import { useEffect, useMemo, useRef, useState } from 'react'

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

/** Botanical palette — seed golds, floret greens, warm disc (not cyber cyan/purple) */
const TIP_GOLD = '#f4d98a'
const SEED_GOLD = '#d4a84a'
const SEED_WARM = '#a86a32'
const SEED_CORE = '#6e4218'
const ARM_GREEN = '#8fbf6e'
const ARM_SAGE = '#b8d49a'
const PETAL = '#c8d89a'

const PHI = (1 + Math.sqrt(5)) / 2
/** 黄金角：360°/φ² ≈ 137.5077640…° */
const GOLDEN = 360 / (PHI * PHI)
const SEEDS = 820
/** 简单有理数角度：种子挤成辐条的反面教材 */
const RATIONAL = [45, 60, 72, 90, 120, 144]
const LOCK_TOL = 0.05

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

function readStartAngle(): number {
  if (typeof window === 'undefined') return GOLDEN
  const a = Number(new URLSearchParams(window.location.search).get('angle'))
  return Number.isFinite(a) && a >= 0 && a <= 180 ? a : GOLDEN
}

export function Phyllotaxis({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { storyMode, enterFree, enterStory } = useStoryFreeMode('phyllotaxis')
  // 默认黄金角：首屏即是完整螺线；故事章会切到有理数角度
  const [theta, setTheta] = useState(() => {
    const linked = readStartAngle()
    return linked === GOLDEN || typeof window === 'undefined' ? GOLDEN : linked
  })
  const [hud, setHud] = useState({ theta: GOLDEN, dev: 0, arms: true, rational: -1 })

  const st = useRef({
    target: theta,
    // 首屏先从接近黄金角生长，故事再演示辐条态
    disp: GOLDEN,
    reveal: 0,
    holdUntil: 0,
    userDrove: false,
    lastNow: 0,
    hudAt: 0,
    hudTheta: -1,
    hudArms: true,
    hudRational: -1,
    lockGlow: 0,
    wasLocked: false,
    lockFlash: 0,
  })
  st.current.target = theta

  useEffect(() => {
    controls.completeOnboarding()
    const hasLink = new URLSearchParams(window.location.search).has('angle')
    if (hasLink) {
      st.current.disp = st.current.target
      st.current.reveal = 420
      st.current.holdUntil = -1
    } else {
      // 快速铺满花盘，避免首屏只见几颗点
      st.current.reveal = 280
      st.current.holdUntil = performance.now() + 400
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
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

      if (s.holdUntil >= 0 && now > s.holdUntil) {
        s.disp += (s.target - s.disp) * (1 - Math.exp(-dt * 2.1))
        if (Math.abs(s.target - s.disp) < 0.002) s.disp = s.target
      }
      if (s.reveal < SEEDS) s.reveal = Math.min(SEEDS, s.reveal + dt * 420)

      const dev = Math.abs(s.disp - GOLDEN)
      const arms = dev < 0.5
      const armAlpha = arms ? Math.min(1, (0.5 - dev) / 0.3) : 0
      const locked = dev < LOCK_TOL
      // Soft lock glow + flash on first lock
      if (locked && !s.wasLocked) s.lockFlash = 1
      s.wasLocked = locked
      s.lockGlow += ((locked ? 1 : 0) - s.lockGlow) * (1 - Math.exp(-dt * 3.2))
      if (s.lockFlash > 0) s.lockFlash = Math.max(0, s.lockFlash - dt * 0.72)

      let rational = -1
      for (const r of RATIONAL) if (Math.abs(s.disp - r) < 0.35) rational = r
      const rationalProx =
        rational > 0 ? Math.max(0, 1 - Math.abs(s.disp - rational) / 0.35) : 0

      if (
        now - s.hudAt > 100 &&
        (Math.abs(s.disp - s.hudTheta) > 0.005 || arms !== s.hudArms || rational !== s.hudRational)
      ) {
        s.hudAt = now
        s.hudTheta = s.disp
        s.hudArms = arms
        s.hudRational = rational
        setHud({ theta: s.disp, dev, arms, rational })
      }

      // Botanical stage — moss key light, warm earth fill
      const sky = ctx.createRadialGradient(w * 0.5, h * 0.38, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.78)
      sky.addColorStop(0, '#1e2616')
      sky.addColorStop(0.35, '#10150e')
      sky.addColorStop(0.75, '#080b07')
      sky.addColorStop(1, '#040604')
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, w, h)

      // Soft overhead moss bloom + gentle warm fill under disc
      const moss = ctx.createRadialGradient(w * 0.5, h * 0.42, 12, w * 0.5, h * 0.48, Math.min(w, h) * 0.52)
      moss.addColorStop(0, 'rgba(110, 150, 70, 0.16)')
      moss.addColorStop(0.45, 'rgba(60, 95, 40, 0.06)')
      moss.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = moss
      ctx.fillRect(0, 0, w, h)
      const earth = ctx.createRadialGradient(w * 0.5, h * 0.72, 0, w * 0.5, h * 0.85, Math.max(w, h) * 0.5)
      earth.addColorStop(0, 'rgba(40, 32, 18, 0.18)')
      earth.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = earth
      ctx.fillRect(0, 0, w, h)

      // Golden lock backlight — soft multi-layer bloom that breathes
      if (s.lockGlow > 0.02 || s.lockFlash > 0) {
        const glow = Math.max(s.lockGlow, s.lockFlash)
        const pulse = 0.5 + 0.5 * Math.sin(now * 0.0016)
        const breathR = 1 + 0.04 * pulse * s.lockGlow
        // Outer warm halo
        const halo = ctx.createRadialGradient(
          w * 0.5,
          h * 0.42,
          0,
          w * 0.5,
          h * 0.44,
          Math.min(w, h) * 0.55 * breathR,
        )
        halo.addColorStop(0, `rgba(255, 230, 150, ${(0.07 + pulse * 0.04 + s.lockFlash * 0.12) * glow})`)
        halo.addColorStop(0.4, `rgba(220, 170, 70, ${(0.05 + s.lockFlash * 0.06) * glow})`)
        halo.addColorStop(0.75, `rgba(120, 90, 30, ${0.02 * glow})`)
        halo.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = halo
        ctx.fillRect(0, 0, w, h)
        // Tight golden core under disc
        const core = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, Math.min(w, h) * 0.22)
        core.addColorStop(0, `rgba(255, 244, 190, ${(0.1 + s.lockFlash * 0.18) * glow})`)
        core.addColorStop(0.55, `rgba(232, 196, 106, ${0.05 * glow})`)
        core.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = core
        ctx.fillRect(0, 0, w, h)
      }

      // Rational angle: cooler, emptier stage (intentionally sparse)
      if (rationalProx > 0.05) {
        const chill = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.45, Math.min(w, h) * 0.4)
        chill.addColorStop(0, `rgba(40, 28, 24, ${0.12 * rationalProx})`)
        chill.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = chill
        ctx.fillRect(0, 0, w, h)
      }

      const cx = w / 2
      const cy = mobile ? h * 0.38 : h * 0.46
      const maxR = Math.min(w * (mobile ? 0.4 : 0.36), h * (mobile ? 0.26 : 0.34))
      const c = maxR / Math.sqrt(SEEDS)
      const shown = Math.floor(s.reveal)
      const thetaRad = (s.disp * Math.PI) / 180
      // Lock: slow botanical breathe; rational: slightly contracted (sparse feel)
      const lockBreathe = 1 + Math.sin(now * 0.00085) * 0.014 * s.lockGlow
      const sparsePull = 1 - 0.035 * rationalProx
      const breathe = lockBreathe * sparsePull

      // Outer petal ring near golden angle — layered florets that bloom on lock
      if (armAlpha > 0.12 && shown > 160) {
        ctx.save()
        const petalN = 34
        const bloom = 1 + 0.06 * s.lockGlow + 0.04 * s.lockFlash
        for (let layer = 0; layer < 2; layer += 1) {
          const layerR = maxR * (1.08 + layer * 0.08) * breathe * bloom
          ctx.globalAlpha = (0.1 + layer * 0.04 + 0.06 * s.lockGlow) * armAlpha
          for (let p = 0; p < petalN; p += 1) {
            const ang = (p / petalN) * Math.PI * 2 + s.disp * 0.008 + layer * 0.09
            const px = cx + Math.cos(ang) * layerR
            const py = cy + Math.sin(ang) * layerR
            const pg = ctx.createRadialGradient(px - 2, py - 2, 0, px, py, maxR * 0.14)
            pg.addColorStop(0, s.lockGlow > 0.4 ? '#e8f0b8' : PETAL)
            pg.addColorStop(0.55, ARM_SAGE)
            pg.addColorStop(1, 'rgba(80, 100, 50, 0)')
            ctx.fillStyle = pg
            ctx.beginPath()
            ctx.ellipse(
              px,
              py,
              maxR * (0.05 + layer * 0.012) * (1 + 0.08 * s.lockGlow),
              maxR * (0.13 + layer * 0.02) * (1 + 0.05 * s.lockGlow),
              ang,
              0,
              Math.PI * 2,
            )
            ctx.fill()
          }
        }
        ctx.restore()
      }

      // Warm disc base with soft rim
      const disc = ctx.createRadialGradient(cx - maxR * 0.08, cy - maxR * 0.1, maxR * 0.05, cx, cy, maxR * 1.12)
      disc.addColorStop(0, `rgba(140, 90, 35, ${0.72 + 0.1 * s.lockGlow})`)
      disc.addColorStop(0.35, 'rgba(85, 55, 22, 0.52)')
      disc.addColorStop(0.72, 'rgba(40, 42, 22, 0.28)')
      disc.addColorStop(1, 'rgba(10, 14, 8, 0)')
      ctx.fillStyle = disc
      ctx.beginPath()
      ctx.arc(cx, cy, maxR * 1.12 * breathe, 0, Math.PI * 2)
      ctx.fill()

      // Disc edge whisper when locked — double gold ring
      if (s.lockGlow > 0.12) {
        const ringPulse = 0.5 + 0.5 * Math.sin(now * 0.0022)
        ctx.strokeStyle = `rgba(244, 214, 130, ${((0.16 + ringPulse * 0.1) * s.lockGlow).toFixed(3)})`
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.arc(cx, cy, maxR * 1.06 * breathe, 0, Math.PI * 2)
        ctx.stroke()
        ctx.strokeStyle = `rgba(255, 236, 170, ${(0.08 * s.lockGlow).toFixed(3)})`
        ctx.lineWidth = 3.5
        ctx.beginPath()
        ctx.arc(cx, cy, maxR * 1.1 * breathe, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Fibonacci spiral arms — botanical green + gold, brighter when locked
      if (armAlpha > 0.05 && shown > 50) {
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        for (const [mod, base, rgb, lw] of [
          [13, 0.52, '143,191,110', 1.55],
          [21, 0.36, '232,196,106', 1.35],
          [8, 0.18, '184,212,154', 1.1]
        ] as const) {
          const aMul = 0.85 + 0.25 * s.lockGlow
          ctx.strokeStyle = `rgba(${rgb},${(base * armAlpha * aMul).toFixed(3)})`
          ctx.lineWidth = lw * (1 + 0.12 * s.lockGlow)
          for (let m = 0; m < mod; m += 1) {
            ctx.beginPath()
            let started = false
            for (let k = m + mod; k < shown; k += mod) {
              const r = c * Math.sqrt(k) * breathe
              const a = k * thetaRad
              const x = cx + r * Math.cos(a)
              const y = cy + r * Math.sin(a)
              if (!started) {
                ctx.moveTo(x, y)
                started = true
              } else ctx.lineTo(x, y)
            }
            ctx.stroke()
          }
        }
      }

      // Rational spokes — sparse waste-of-space diagram
      const spokes = rational > 0 ? 360 / gcd(360, rational) : 0
      if (rational > 0) {
        // Soft wedge voids between spokes (emphasize emptiness)
        for (let i = 0; i < spokes; i += 1) {
          const a0 = (i * rational * Math.PI) / 180
          const a1 = ((i + 0.5) * rational * Math.PI) / 180
          const wedge = ctx.createRadialGradient(cx, cy, maxR * 0.15, cx, cy, maxR * 1.05)
          wedge.addColorStop(0, 'rgba(0,0,0,0)')
          wedge.addColorStop(1, `rgba(20, 12, 10, ${(0.14 * rationalProx).toFixed(3)})`)
          ctx.fillStyle = wedge
          ctx.beginPath()
          ctx.moveTo(cx, cy)
          ctx.arc(cx, cy, maxR * 1.05, a0 + 0.04, a1 - 0.04)
          ctx.closePath()
          ctx.fill()
        }
        ctx.strokeStyle = `rgba(224,122,106,${(0.42 * rationalProx).toFixed(3)})`
        ctx.lineWidth = 1.55
        ctx.setLineDash([5, 6])
        for (let i = 0; i < spokes; i += 1) {
          const a = (i * rational * Math.PI) / 180
          ctx.beginPath()
          ctx.moveTo(cx, cy)
          ctx.lineTo(cx + maxR * 1.05 * Math.cos(a), cy + maxR * 1.05 * Math.sin(a))
          ctx.stroke()
        }
        ctx.setLineDash([])
      }

      // Seeds as oriented florets — core → warm → gold → green rim
      const dot = Math.max(1.55, Math.min(3.8, maxR / 96))
      for (let k = 0; k < shown; k += 1) {
        const r = c * Math.sqrt(k) * breathe
        const a = k * thetaRad
        const x = cx + r * Math.cos(a)
        const y = cy + r * Math.sin(a)
        const newest = k === shown - 1
        const t = k / SEEDS
        // Rational: slightly larger seeds on spokes, emptier feel overall
        const sizeMul = rationalProx > 0.2 ? 1 + 0.18 * rationalProx : 1
        const size = (newest ? dot + 1.8 : dot * (0.78 + t * 0.48)) * sizeMul

        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(a + 0.55)

        if (newest) {
          ctx.fillStyle = TIP_GOLD
          ctx.shadowColor = `rgba(244, 217, 138, ${0.75 + 0.25 * s.lockGlow})`
          ctx.shadowBlur = 12 + 10 * s.lockGlow + 14 * s.lockFlash
          ctx.beginPath()
          ctx.ellipse(0, 0, size * 1.2, size * 0.78, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowBlur = 0
          // Inner tip core
          ctx.fillStyle = '#fff6d0'
          ctx.globalAlpha = 0.7
          ctx.beginPath()
          ctx.ellipse(-size * 0.12, -size * 0.1, size * 0.35, size * 0.22, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.globalAlpha = 1
        } else {
          let fill = SEED_CORE
          if (t > 0.78) fill = ARM_GREEN
          else if (t > 0.55) fill = SEED_GOLD
          else if (t > 0.28) fill = SEED_WARM
          else if (t > 0.12) fill = '#8a5428'

          // Soft radial seed body
          const sg = ctx.createRadialGradient(-size * 0.2, -size * 0.18, 0, 0, 0, size)
          if (t > 0.55) {
            sg.addColorStop(0, s.lockGlow > 0.5 ? '#f8ecc0' : '#f0e0a0')
            sg.addColorStop(0.35, fill)
            sg.addColorStop(1, SEED_WARM)
          } else {
            sg.addColorStop(0, t > 0.2 ? '#c09050' : '#8a5a28')
            sg.addColorStop(0.55, fill)
            sg.addColorStop(1, SEED_CORE)
          }
          // Rational: desaturate / dim mid-field so empty wedges read clearly
          const sparseDim = rationalProx > 0 ? 1 - 0.22 * rationalProx * (1 - t * 0.4) : 1
          const lockLift = 1 + 0.08 * s.lockGlow * t
          ctx.globalAlpha = (0.68 + 0.32 * t) * sparseDim * Math.min(1, lockLift)
          ctx.fillStyle = sg
          ctx.beginPath()
          ctx.ellipse(0, 0, size, size * 0.7, 0, 0, Math.PI * 2)
          ctx.fill()

          // Specular glint — brighter shimmer wave when locked
          if (t > 0.2) {
            const shimmer =
              s.lockGlow > 0.2
                ? 0.5 + 0.5 * Math.sin(now * 0.003 + k * 0.17 + t * 6)
                : 0
            ctx.globalAlpha = (0.28 + 0.22 * t + 0.18 * shimmer * s.lockGlow) * sparseDim
            ctx.fillStyle = '#fff8e0'
            ctx.beginPath()
            ctx.ellipse(-size * 0.28, -size * 0.22, size * 0.26, size * 0.14, -0.3, 0, Math.PI * 2)
            ctx.fill()
          }
          // Outer floret rim wash when locked
          if (s.lockGlow > 0.3 && t > 0.65) {
            ctx.globalAlpha = 0.14 * s.lockGlow * t
            ctx.strokeStyle = ARM_SAGE
            ctx.lineWidth = 0.85
            ctx.beginPath()
            ctx.ellipse(0, 0, size * 1.18, size * 0.84, 0, 0, Math.PI * 2)
            ctx.stroke()
          }
          ctx.globalAlpha = 1
        }
        ctx.restore()

        if (newest) {
          const frac = s.reveal - shown
          ctx.strokeStyle = `rgba(244,217,138,${(0.75 * (1 - frac)).toFixed(3)})`
          ctx.lineWidth = 1.4
          ctx.beginPath()
          ctx.arc(x, y, size + 3 + frac * 16, 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      // Lock flash — expanding multi-ring bloom
      if (s.lockFlash > 0.04) {
        for (let ring = 0; ring < 3; ring += 1) {
          const lag = ring * 0.12
          const f = Math.max(0, s.lockFlash - lag)
          if (f < 0.02) continue
          const flashR = maxR * (0.72 + (1 - f) * (0.55 + ring * 0.12))
          ctx.strokeStyle = `rgba(244, 214, 130, ${(0.42 * f * (1 - ring * 0.22)).toFixed(3)})`
          ctx.lineWidth = 2.2 - ring * 0.4
          ctx.beginPath()
          ctx.arc(cx, cy, flashR, 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [controls, tx])

  const onScrub = (value: number, trusted: boolean) => {
    controls.registerInteraction()
    if (trusted) st.current.userDrove = true
    st.current.holdUntil = -1
    setTheta(value)
    enterFree()
  }

  const guideSteps = useMemo<Array<GuideStep>>(
    () => [
      {
        title: tx('种子为什么不把自己挤死'),
        body: tx('一颗种子从中心落下，下一颗却总能找到空位。画面只给每颗新种子一个转角和一个距离，接下来看看这条小规则怎样排出大螺线。'),
        action: () => {
          st.current.userDrove = false
          st.current.holdUntil = -1
          st.current.reveal = Math.max(st.current.reveal, 480)
          setTheta(GOLDEN)
        },
        durationMs: 5_200,
      },
      {
        title: tx('大多数角度都在浪费空间'),
        body: tx('大多数角度下种子挤成辐条或乱成一团——空间被白白浪费。试试 60° 或 90°，会看到刺眼的几根辐条。'),
        action: () => {
          st.current.userDrove = false
          setTheta(60)
        },
        durationMs: 5_500,
      },
      {
        title: tx('黄金角让每颗都有空位'),
        body: tx('137.508° 是最难用分数逼近的角度，新种子永远落在空隙最大处，自动排成 13+21 条反向螺线。'),
        action: () => {
          st.current.userDrove = false
          setTheta(GOLDEN)
        },
        durationMs: 6_200,
      },
      {
        title: tx('斐波那契藏在螺线里'),
        body: tx('黄金比最好的分数逼近就是斐波那契之比，所以螺线臂数总是相邻斐波那契数：8 与 13、13 与 21……向日葵、松果和菠萝都在用同一套几何。'),
        action: () => {
          st.current.userDrove = false
          setTheta(GOLDEN)
        },
        durationMs: 5_800,
      }
    ],
    [tx],
  )

  const isGolden = Math.abs(theta - GOLDEN) < 0.02
  const isRational = (r: number) => Math.abs(theta - r) < 0.005

  return (
    <div className={`oss-experience phyllo-experience${storyMode ? ' is-story' : ' is-free'}`}>
      <canvas
        ref={canvasRef}
        className="phyllo-canvas"
        aria-label={tx('向日葵种子按固定发散角排列，黄金角形成斐波那契螺线')}
        onPointerDown={() => controls.registerInteraction()}
      />

      {!storyMode && (
        <header className="phyllo-plaque" data-experience-overlay="true">
          <h1>{tx('植物的螺旋')}</h1>
          <p>{tx('向日葵为什么把种子排成螺线？')}</p>
        </header>
      )}

      {!storyMode && (
        <aside className="phyllo-readout" data-experience-overlay="true" aria-live="polite">
          <div className="phyllo-readout-row">
            <small>{tx('发散角 θ')}</small>
            <strong className="is-yellow">{hud.theta.toFixed(2)}°</strong>
          </div>
          <div className="phyllo-readout-row">
            <small>{tx('螺线臂数')}</small>
            <strong className="is-sage">{hud.arms ? '13 + 21' : '—'}</strong>
          </div>
          <div className="phyllo-readout-row">
            <small>{tx('与黄金角偏差')}</small>
            <strong className={hud.dev < LOCK_TOL ? 'is-sage' : ''}>{hud.dev.toFixed(3)}°</strong>
          </div>
          {hud.rational > 0 && (
            <div className="phyllo-banner phyllo-critical" key={`crit-${hud.rational}`}>
              {tx('有理数角度')} {hud.rational}° · {tx('种子挤成辐条，空间浪费。')}
            </div>
          )}
          {hud.dev < LOCK_TOL && (
            <div className="phyllo-banner phyllo-success" key="lock">
              {tx('锁定黄金角：13+21 条螺线浮现')}
            </div>
          )}
        </aside>
      )}

      {!storyMode && (
        <Freebar
          className="phyllo-freebar"
          mainClassName="phyllo-freebar-main"
          ariaLabel={tx('参数')}
          primaryControlBudget={2}
          secondaryDefault="closed"
          secondaryClassName="phyllo-freebar-secondary"
          secondary={(
            <div className="phyllo-tray">
              <div className="phyllo-chip-rail experience-freebar-actions phyllo-presets experience-freebar-chips" role="group" aria-label={tx('有理数角度示例')}>
                {[60, 90, 120].map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`phyllo-chip${isRational(r) ? ' is-on' : ''}`}
                    onClick={() => onScrub(r, true)}
                  >
                    {r}°
                  </button>
                ))}
                <button
                  type="button"
                  className="experience-freebar-story"
                  onClick={() => {
                    controls.registerInteraction()
                    enterStory()
                    replayGuide('phyllotaxis')
                  }}
                  aria-label={tx('重播故事')}
                >
                  <FilmStrip weight="fill" aria-hidden="true" />
                  <span>{tx('故事')}</span>
                </button>
              </div>
            </div>
          )}
        >
          <button
            type="button"
            className={`phyllo-chip phyllo-chip-golden${isGolden ? ' is-on' : ''}`}
            onClick={() => onScrub(GOLDEN, true)}
          >
            {tx('黄金角')}
          </button>
          <div className="experience-freebar-field phyllo-param-theta">
            <div>
              <span>{tx('发散角 θ')}</span>
              <strong>{theta.toFixed(2)}°</strong>
            </div>
            <input
              type="range"
              min={0}
              max={180}
              step={0.01}
              value={theta}
              onChange={(e) => onScrub(Number(e.target.value), e.nativeEvent.isTrusted)}
              aria-label={tx('发散角 θ')}
            />
          </div>
        </Freebar>
      )}

      <GuideTour
        worldId="phyllotaxis"
        steps={guideSteps}
        defaultOpen={storyMode}
        placement="stage"
        stagePlan={[
          { position: 'top-left', mobilePosition: 'top-left', motion: 'rise', tone: 'light', width: 'normal', treatment: 'monumental' },
          { position: 'top-right', mobilePosition: 'top-right', motion: 'drift-left', tone: 'light', width: 'normal', treatment: 'editorial' },
          { position: 'bottom-left', mobilePosition: 'bottom-left', motion: 'fade', tone: 'light', width: 'wide', treatment: 'caption', cue: 'right' },
          { position: 'bottom-right', mobilePosition: 'bottom-right', motion: 'scale', tone: 'light', width: 'normal', treatment: 'annotation' },
        ]}
        showReplayChip={false}
        onExit={enterFree}
      />
      {!storyMode && (
        <GhostHint
          worldId="phyllotaxis"
          gesture={{
            type: 'scrub',
            target: '.phyllo-param-theta input',
            label: tx('拨动发散角，看种子重排'),
          }}
        />
      )}
    </div>
  )
}
