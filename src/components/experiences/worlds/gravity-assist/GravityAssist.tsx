import './styles/GravityAssist.css'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowCounterClockwise, Question, X, Trophy, RocketLaunch, Planet, FilmStrip } from '@phosphor-icons/react'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { GuideTour, replayGuide, type GuideStep } from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import {
  clamp01,
  createJupiter,
  createStarLayers,
  drawJupiter,
  drawShip,
  drawStarfield,
  hexAlpha,
  limbWarp,
  smoothstep,
  strokeGlowTrail,
  type JupiterTex,
  type StarLayers,
} from '~/components/experiences/worlds/gravity-assist/gravity-assist-visuals'
import { useExperienceI18n } from '~/i18n/experience'

const CYAN = '#4dd0e1'
const YELLOW = '#ffd166'
const PURPLE = '#b15cff'
const RED = '#ff6b6b'
const GREEN = '#51cf66'

type Mode = 'assist' | 'lagrange'
type Side = 'behind' | 'ahead'
type Vec = { x: number; y: number }

// —— 弹弓模式常数（行星质心系双曲线飞掠，确定性演示）——
const MU_A = 0.6 // 行星引力常数（世界单位）：取较大值，让真实量级的飞掠距离仍有肉眼可见的偏转
const V_REL = 1.0 // 进入行星势力范围边界时的相对速度
const V_P = 1.0 // 行星公转速度（+y 方向，紫色箭头）↔ 13 km/s（木星）
const R_SOI = 2.8 // 势力范围边界（世界单位）：进入与离开都在此测量，保证能量账口径一致
const KM_S_PER_V = 13 // 速度定标：v = 1 ↔ 木星公转速度 13 km/s
// —— 拉格朗日模式常数（L4 稳定需 μ < 0.0385）——
const MU_L = 0.02
// —— 行星尺寸定标（飞掠高度的诚实标尺）——
const PLANET_R_WORLD = 0.5 // 行星物理半径（世界单位）：近点低于它就是撞击
const PLANET_R_KM = 71400 // 行星半径（km，木星赤道半径量级）
const KM_PER_WORLD = PLANET_R_KM / PLANET_R_WORLD
// —— 视觉常数（仅渲染，不影响物理）——
const PLANET_RW = 0.6 // 行星视觉半径（世界单位）：物理表面 PLANET_R_WORLD 经 limbWarp 映射到盘缘
const V_IN = Math.hypot(V_REL, V_P) // 进入势力范围时的日心系速度（常数）

/** 目标近点高度（云顶上方，行星半径单位）→ 世界单位近点距 */
function periapsisForAlt(altR: number): number {
  return PLANET_R_WORLD * (1 + altR)
}

/**
 * 由目标近点距反解进入瞄准高度 b（进入点与质心的横向距离）。
 * 进入条件固定：在边界 r = R_SOI 上以 v = (V_REL, 0) 出发，
 * 能量 E = V_REL²/2 − μ/R_SOI、角动量 L = b·V_REL 给定双曲线；
 * 渐近撞击参数 b_asym = L/v∞，b_asym² = r_p² + 2·(μ/v∞²)·r_p。
 */
function impactBForAlt(altR: number): number {
  const rp = periapsisForAlt(altR)
  const vInf2 = V_REL * V_REL - (2 * MU_A) / R_SOI
  const a = MU_A / vInf2
  const bAsym = Math.sqrt(Math.max(rp * rp + 2 * a * rp, 1e-8))
  return (bAsym * Math.sqrt(vInf2)) / V_REL
}

/** 进入点：边界圆 r = R_SOI 上、瞄准高度为 ±b 的位置 */
function entryXForB(b: number): number {
  return -Math.sqrt(Math.max(R_SOI * R_SOI - b * b, 0.01))
}

function makeAssistState(side: Side, altR: number) {
  const b = impactBForAlt(altR)
  const vel = { x: V_REL, y: 0 }
  return {
    probe: { x: entryXForB(b), y: side === 'behind' ? -b : b } as Vec,
    vel,
    time: 0,
    trail: [] as Array<Vec>,
    phase: 'cruise' as 'cruise' | 'done' | 'crashed',
    vIn: V_IN,
    vOut: 0,
    measured: false,
    periPoint: null as Vec | null,
  }
}

/** 与主循环同模型的快速预报：给定掠过侧与高度，算出实际近点（或撞击点） */
function predictPeriapsis(side: Side, altR: number): { point: Vec; d: number; crash: boolean } {
  const s = makeAssistState(side, altR)
  let x = s.probe.x
  let y = s.probe.y
  let vx = s.vel.x
  let vy = s.vel.y
  let prevD = Math.hypot(x, y)
  let minD = prevD
  let minP: Vec = { x, y }
  let crash = false
  const dt = 0.001
  for (let i = 0; i < 60000; i++) {
    const d2 = x * x + y * y + 1e-8
    const d = Math.sqrt(d2)
    vx += ((-MU_A * x) / (d2 * d)) * dt
    vy += ((-MU_A * y) / (d2 * d)) * dt
    x += vx * dt
    y += vy * dt
    const dn = Math.hypot(x, y)
    if (dn <= PLANET_R_WORLD) {
      crash = true
      minD = PLANET_R_WORLD
      minP = { x, y }
      break
    }
    if (dn < minD) {
      minD = dn
      minP = { x, y }
    }
    if (dn > prevD && dn > minD * 1.05) break // 已过近点
    prevD = dn
  }
  return { point: minP, d: minD, crash }
}

/** 距离读数：zh 用万公里/公里，en 由 i18n 动态模板换算为 km */
function formatKm(km: number): string {
  return km >= 10000 ? `${(km / 10000).toFixed(1)} 万公里` : `${Math.round(km).toLocaleString('en-US')} 公里`
}

/** 拉格朗日点（共线解用二分法） */
function lagrangePoints(mu: number) {
  const f = (x: number, s: number) => {
    // 共线方程：x - (1-μ)(x+μ)/|x+μ|³ - μ(x-1+μ)/|x-1+μ|³ = 0
    const r1 = Math.abs(x + mu)
    const r2 = Math.abs(x - 1 + mu)
    return x - ((1 - mu) * (x + mu)) / r1 ** 3 - (mu * (x - 1 + mu)) / r2 ** 3
  }
  const bisect = (a: number, b: number) => {
    let lo = a
    let hi = b
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2
      if (f(lo, 0) * f(mid, 0) <= 0) hi = mid
      else lo = mid
    }
    return (lo + hi) / 2
  }
  const l1 = bisect(0.5, 1 - mu - 0.01)
  const l2 = bisect(1 - mu + 0.01, 1.5)
  const l3 = bisect(-1.5, -0.5)
  return {
    L1: { x: l1, y: 0 },
    L2: { x: l2, y: 0 },
    L3: { x: l3, y: 0 },
    L4: { x: 0.5 - mu, y: Math.sqrt(3) / 2 },
    L5: { x: 0.5 - mu, y: -Math.sqrt(3) / 2 },
  }
}

export function GravityAssist({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const { storyMode, enterFree, enterStory } = useStoryFreeMode('gravity-assist')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mode, setMode] = useState<Mode>('assist')
  const [side, setSide] = useState<Side>('behind')
  const [alt, setAlt] = useState(1.0) // 飞掠高度：云顶上方，行星半径为单位
  const [launched, setLaunched] = useState(false)
  const [lPoint, setLPoint] = useState<'L4' | 'L1' | 'L2'>('L4')
  const [whyOpen, setWhyOpen] = useState(false)
  const [result, setResult] = useState<{ vIn: number; vOut: number; minD: number } | null>(null)
  const [crashed, setCrashed] = useState(false)
  const [lStatus, setLStatus] = useState<'stable' | 'escaped' | null>(null)
  const reducedMotion = false
  const dvRef = useRef<HTMLElement>(null)
  const dotRef = useRef<HTMLSpanElement>(null)

  const st = useRef({
    mode, side, alt, launched, lPoint,
    assist: makeAssistState('behind', 1.0),
    lag: null as null | { p: Vec; v: Vec; trail: Array<Vec>; time: number; status: 'stable' | 'escaped' | null },
    bg: null as HTMLCanvasElement | null,
    bgKey: '',
    running: true,
    // —— 电影化渲染状态（仅视觉）——
    cam: { fx: 0.1, fy: 0, zoom: 1.5, init: false },
    cruise: 1.2, // 待机巡航动画相位（秒），初始让飞船已在画面中
    flash: 0, // 掠过近点闪光（0–1 衰减）
    periFired: false, // 近点闪光只触发一次
    crashFlash: 0, // 撞击闪光（0–1 衰减）
    prevD: 0,
    minD: Infinity,
    previewPeri: null as { point: Vec; d: number; crash: boolean } | null,
    stars: null as StarLayers | null,
    jupiter: null as JupiterTex | null,
    lastNow: 0,
    reducedMotion: false,
  })
  st.current.mode = mode
  st.current.side = side
  st.current.alt = alt
  st.current.launched = launched
  st.current.lPoint = lPoint
  st.current.reducedMotion = reducedMotion

  const lPoints = useMemo(() => lagrangePoints(MU_L), [])
  const previewPeri = useMemo(() => predictPeriapsis(side, alt), [side, alt])
  st.current.previewPeri = previewPeri

  useEffect(() => {
    controls.completeOnboarding()
  }, [controls])

  // Δv 到账瞬间：读数闪青脉冲（能量账本的视觉强调）
  useEffect(() => {
    if (!result || reducedMotion) return
    dvRef.current?.animate(
      [
        { textShadow: '0 0 24px rgba(77,208,225,0.95)', filter: 'brightness(1.7)' },
        { textShadow: '0 0 0 rgba(77,208,225,0)', filter: 'brightness(1)' },
      ],
      { duration: 1100, easing: 'ease-out' },
    )
  }, [result, reducedMotion])

  // 待命状态灯呼吸（reduced-motion 时静止常亮）
  useEffect(() => {
    const el = dotRef.current
    if (!el || reducedMotion || mode !== 'assist') return
    const anim = el.animate([{ opacity: 0.3 }, { opacity: 1 }], {
      duration: 1100,
      direction: 'alternate',
      iterations: Infinity,
      easing: 'ease-in-out',
    })
    return () => anim.cancel()
  }, [reducedMotion, mode, launched])

  const launch = ({
    sideOverride = side,
    altOverride = alt,
    trackInteraction = true,
  }: {
    sideOverride?: Side
    altOverride?: number
    trackInteraction?: boolean
  } = {}) => {
    if (trackInteraction) controls.registerInteraction()
    setMode('assist')
    setSide(sideOverride)
    setAlt(altOverride)
    st.current.mode = 'assist'
    st.current.side = sideOverride
    st.current.alt = altOverride
    st.current.assist = makeAssistState(sideOverride, altOverride)
    st.current.flash = 0
    st.current.periFired = false
    st.current.crashFlash = 0
    st.current.prevD = 0
    st.current.minD = Infinity
    setResult(null)
    setCrashed(false)
    setLaunched(true)
    st.current.launched = true
  }

  const dropParticle = (point: 'L4' | 'L1' | 'L2', trackInteraction = true) => {
    if (trackInteraction) controls.registerInteraction()
    const lp = lPoints[point]
    st.current.lag = {
      p: { x: lp.x + 0.012, y: lp.y + 0.012 },
      v: { x: 0, y: 0 },
      trail: [],
      time: 0,
      status: null,
    }
    setLPoint(point)
    setLStatus(null)
  }

  // 主循环
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
      ctx.fillStyle = '#04060e'
      ctx.fillRect(0, 0, w, h)

      // 离屏资源懒加载 + 墙上时钟 dtWall（相机/巡航/闪光用；物理步进保持固定步长不变）
      if (!s.stars) s.stars = createStarLayers()
      if (!s.jupiter) s.jupiter = createJupiter()
      const stars = s.stars
      const jupiter = s.jupiter
      const nowS = now / 1000
      let dtWall = s.lastNow > 0 ? nowS - s.lastNow : 0.016
      s.lastNow = nowS
      dtWall = Math.min(Math.max(dtWall, 0.001), 0.05)
      const drift = !s.reducedMotion
      const mobile = w < 720
      const scale = Math.min(w, h) * 0.19

      // ============ 弹弓模式（行星质心系，电影化构图） ============
      if (s.mode === 'assist') {
        const a = s.assist
        const aimB = impactBForAlt(s.alt)
        const aimY = s.side === 'behind' ? -aimB : aimB

        // —— 物理推进（行星质心系二体，自适应步长）——
        if (s.launched && a.phase === 'cruise') {
          let remaining = 0.016
          let guard = 0
          while (remaining > 1e-7 && guard < 900) {
            guard += 1
            const dNow = Math.hypot(a.probe.x, a.probe.y)
            const dt = Math.min(remaining, Math.min(0.002, Math.max(0.00002, 0.001 * Math.max(0.008, dNow))))
            const d2 = a.probe.x * a.probe.x + a.probe.y * a.probe.y + 1e-8
            const d = Math.sqrt(d2)
            a.vel.x += (-MU_A * a.probe.x / (d2 * d)) * dt
            a.vel.y += (-MU_A * a.probe.y / (d2 * d)) * dt
            a.probe.x += a.vel.x * dt
            a.probe.y += a.vel.y * dt
            a.time += dt
            remaining -= dt
          }
          a.trail.push({ ...a.probe })
          if (a.trail.length > 2600) a.trail.splice(0, a.trail.length - 2600)

          // 撞击检测：低于云顶即坠毁，禁止穿模掠过
          const dImpact = Math.hypot(a.probe.x, a.probe.y)
          if (dImpact <= PLANET_R_WORLD) {
            const k = PLANET_R_WORLD / dImpact
            a.probe.x *= k
            a.probe.y *= k
            a.trail.push({ ...a.probe })
            a.phase = 'crashed'
            a.periPoint = { ...a.probe }
            s.minD = PLANET_R_WORLD
            s.flash = 1
            s.crashFlash = 1
            setCrashed(true)
          } else {
            // 飞出行星势力范围：结算太阳参考系速度（进入与离开同在 R_SOI 测量，能量账一致）
            const receding = a.probe.x * a.vel.x + a.probe.y * a.vel.y > 0
            if ((dImpact > R_SOI && receding) || a.time > 60) {
              a.vOut = Math.hypot(a.vel.x, a.vel.y + V_P)
              a.phase = 'done'
              setResult({ vIn: a.vIn, vOut: a.vOut, minD: s.minD })
              if (a.vOut > a.vIn) {
                controls.registerInteraction()
              }
            }
          }
        }

        // —— 近点检测：记录最近点，过近点瞬间触发一次行星表面光影响应 ——
        if (s.launched && a.phase === 'cruise') {
          const dTrue = Math.hypot(a.probe.x, a.probe.y)
          if (dTrue < s.minD) {
            s.minD = dTrue
            a.periPoint = { ...a.probe }
          }
          if (s.prevD > 0 && dTrue > s.prevD && !s.periFired && s.minD < PLANET_R_WORLD * 3.4) {
            s.flash = 1
            s.periFired = true
          }
          s.prevD = dTrue
        }
        s.flash *= Math.exp(-2.6 * dtWall)
        s.crashFlash *= Math.exp(-2.2 * dtWall)

        // —— 相机：待机黄金分割特写；发射后缓动跟拍，过近点推近再拉远 ——
        // 渲染坐标经 limbWarp 近场放大（物理仍在原始世界坐标，表面 r=PLANET_R_WORLD → 盘缘 PLANET_RW）
        const warpPoint = (p: Vec): Vec => {
          const r = Math.hypot(p.x, p.y)
          const k = limbWarp(r, PLANET_RW, PLANET_R_WORLD) / (r || 1e-9)
          return { x: p.x * k, y: p.y * k }
        }
        let anchorX = mobile ? w * 0.5 : w * 0.6
        let anchorY = h * (mobile ? 0.4 : 0.46)
        let focusT: Vec = { x: 0.1, y: aimY * 0.45 }
        let zoomT = mobile ? 1.22 : 1.55
        if (s.launched) {
          anchorX = w * 0.5
          anchorY = h * (mobile ? 0.42 : 0.5)
          if (a.phase === 'cruise') {
            const wp = warpPoint(a.probe)
            const d = Math.hypot(wp.x, wp.y)
            const near = smoothstep(1.5, 0.68, d)
            const vm = Math.hypot(a.vel.x, a.vel.y) || 1
            const lead = 0.35 * (1 - near)
            focusT = {
              x: (wp.x + (a.vel.x / vm) * lead) * (1 - 0.45 * near),
              y: (wp.y + (a.vel.y / vm) * lead) * (1 - 0.45 * near),
            }
            zoomT = Math.min(Math.max(2.1 / (d + 0.75), 0.95), mobile ? 1.35 : 1.5)
          } else {
            // 结算镜头：拉远看整条轨迹
            focusT = { x: 0.25, y: 0 }
            zoomT = 1.0
          }
        }
        if (s.reducedMotion || !s.cam.init) {
          s.cam.fx = focusT.x
          s.cam.fy = focusT.y
          s.cam.zoom = zoomT
          s.cam.init = true
        } else {
          const kf = 1 - Math.exp(-3.4 * dtWall)
          const kz = 1 - Math.exp(-2.4 * dtWall)
          s.cam.fx += (focusT.x - s.cam.fx) * kf
          s.cam.fy += (focusT.y - s.cam.fy) * kf
          s.cam.zoom += (zoomT - s.cam.zoom) * kz
        }
        const cam = s.cam
        const toPx = (p: Vec): [number, number] => {
          const wp = warpPoint(p)
          return [anchorX + (wp.x - cam.fx) * scale * cam.zoom, anchorY - (wp.y - cam.fy) * scale * cam.zoom]
        }
        const [plX, plY] = toPx({ x: 0, y: 0 })
        const plR = PLANET_RW * scale * cam.zoom

        // 多层视差星场（近亮远暗 + 极淡星云，随相机轻微视差）
        drawStarfield(ctx, stars, w, h, nowS, -cam.fx * scale, cam.fy * scale, drift)

        // 行星引力势阱（淡紫：看不见的场）
        const well = ctx.createRadialGradient(plX, plY, plR * 0.9, plX, plY, plR * 2.6)
        well.addColorStop(0, 'rgba(177,92,255,0.12)')
        well.addColorStop(0.55, 'rgba(177,92,255,0.045)')
        well.addColorStop(1, 'rgba(177,92,255,0)')
        ctx.fillStyle = well
        ctx.beginPath()
        ctx.arc(plX, plY, plR * 2.6, 0, Math.PI * 2)
        ctx.fill()

        // 待机：飞船带发光尾迹沿瞄准走廊巡航入场（循环演示；reduced-motion 关闭）
        if (!s.launched && !s.reducedMotion) {
          s.cruise += dtWall
          const period = 13
          const u = (s.cruise % period) / period
          const fade = smoothstep(0, 0.05, u) * smoothstep(1, 0.95, u)
          const cx0 = -3.0 + u * 6.4
          const pts: Array<[number, number]> = []
          for (let i = 26; i >= 0; i--) pts.push(toPx({ x: cx0 - i * 0.045, y: aimY }))
          strokeGlowTrail(ctx, pts, CYAN, { core: 1.6, glow: 5.5, coreAlpha: 0.7 * fade, glowAlpha: 0.13 * fade })
          const [sx, sy] = toPx({ x: cx0, y: aimY })
          const [sx2, sy2] = toPx({ x: cx0 + 0.06, y: aimY })
          drawShip(ctx, sx, sy, sx2 - sx, sy2 - sy, CYAN, fade)
        }

        // 行星（程序化木星：色带 + 大红斑 + 受光/暗角 + 微光晕与细环）
        const dTrueNow = Math.hypot(a.probe.x, a.probe.y)
        const prox = s.launched && a.phase === 'cruise' ? clamp01(1 - (dTrueNow - PLANET_R_WORLD) / 0.9) : 0
        const limbStrength = Math.min(1, Math.max(prox * 0.5, s.flash * (s.reducedMotion ? 0.4 : 1)))
        const [pxS, pyS] = toPx(a.probe)
        drawJupiter(ctx, jupiter, plX, plY, plR, {
          limbGlow: { angle: Math.atan2(pyS - plY, pxS - plX), strength: limbStrength },
        })
        ctx.fillStyle = 'rgba(255,255,255,0.6)'
        ctx.font = '11px sans-serif'
        ctx.fillText(tx('行星'), plX - 10, plY + plR + 20)

        // 行星公转速度箭头（紫色：看不见的参考系速度）
        const vpX = plX + plR + 28
        ctx.save()
        ctx.strokeStyle = PURPLE
        ctx.fillStyle = PURPLE
        ctx.shadowColor = PURPLE
        ctx.shadowBlur = 7
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(vpX, plY + 42)
        ctx.lineTo(vpX, plY - 42)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(vpX - 6, plY - 34)
        ctx.lineTo(vpX, plY - 48)
        ctx.lineTo(vpX + 6, plY - 34)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
        ctx.lineWidth = 1
        ctx.font = '11px sans-serif'
        const labelX = Math.min(vpX + 10, w - 128)
        ctx.fillStyle = PURPLE
        ctx.fillText(tx('行星公转速度 v_p'), labelX, plY - 8)
        ctx.fillStyle = 'rgba(255,255,255,0.55)'
        ctx.fillText(tx('（画面跟着行星走）'), labelX, plY + 8)

        // 轨迹（加法感发光：宽辉光 + 亮芯，末端彗尾增亮）
        if (a.trail.length > 1) {
          const pts: Array<[number, number]> = new Array(a.trail.length)
          for (let i = 0; i < a.trail.length; i++) pts[i] = toPx(a.trail[i])
          const color = a.phase === 'crashed' ? RED : a.phase === 'done' ? (a.vOut > a.vIn ? GREEN : RED) : CYAN
          strokeGlowTrail(ctx, pts, color, { core: 1.7, glow: 6, coreAlpha: 0.85, glowAlpha: 0.15 })
          const head = pts.slice(-90)
          for (let c = 0; c < 3; c++) {
            const seg = head.slice(c * 30, (c + 1) * 30 + 1)
            if (seg.length > 1) {
              strokeGlowTrail(ctx, seg, color, {
                core: 1.6 + c * 0.5,
                glow: 5 + c * 2,
                coreAlpha: 0.25 + c * 0.15,
                glowAlpha: 0.1 + c * 0.05,
              })
            }
          }
        }

        // 近点高度标注：行星盘缘 → 近点的径向标尺线 + 读数（发射前显示预报，飞掠后保留实测）
        const preview = !s.launched ? s.previewPeri : null
        const annot = preview
          ? { p: preview.point, crash: preview.crash, live: false }
          : a.periPoint && (a.phase !== 'cruise' || dTrueNow < 2.0)
            ? { p: a.periPoint, crash: a.phase === 'crashed', live: a.phase === 'cruise' }
            : null
        if (annot) {
          const pr = Math.hypot(annot.p.x, annot.p.y)
          const dirX = annot.p.x / pr
          const dirY = annot.p.y / pr
          const [lx1, ly1] = toPx({ x: dirX * PLANET_R_WORLD, y: dirY * PLANET_R_WORLD })
          const [lx2, ly2] = toPx(annot.p)
          const annotColor = annot.crash ? RED : 'rgba(255,255,255,0.8)'
          ctx.save()
          ctx.strokeStyle = annot.crash ? hexAlpha(RED, 0.85) : 'rgba(255,255,255,0.5)'
          ctx.lineWidth = 1
          if (!annot.crash) {
            ctx.setLineDash([3, 4])
            ctx.beginPath()
            ctx.moveTo(lx1, ly1)
            ctx.lineTo(lx2, ly2)
            ctx.stroke()
            ctx.setLineDash([])
            // 两端短垂线（标尺刻度）
            const tlen = 4
            const txp = -dirY
            const typ = dirX
            ctx.beginPath()
            ctx.moveTo(lx1 - txp * tlen, ly1 - typ * tlen)
            ctx.lineTo(lx1 + txp * tlen, ly1 + typ * tlen)
            ctx.moveTo(lx2 - txp * tlen, ly2 - typ * tlen)
            ctx.lineTo(lx2 + txp * tlen, ly2 + typ * tlen)
            ctx.stroke()
          } else {
            // 撞击点 × 标记
            ctx.lineWidth = 1.6
            ctx.beginPath()
            ctx.moveTo(lx2 - 5, ly2 - 5)
            ctx.lineTo(lx2 + 5, ly2 + 5)
            ctx.moveTo(lx2 + 5, ly2 - 5)
            ctx.lineTo(lx2 - 5, ly2 + 5)
            ctx.stroke()
          }
          const altKm = Math.max(0, (pr - PLANET_R_WORLD) * KM_PER_WORLD)
          const text = annot.crash
            ? tx(s.launched ? '撞击点' : '会撞上云顶')
            : `距云顶 ${formatKm(altKm)}`
          const labelAx = Math.min(Math.max(lx2 + dirX * 16, 8), w - 150)
          const labelAy = Math.min(Math.max(ly2 - dirY * 16, 14), h - 10)
          ctx.font = '11px sans-serif'
          ctx.lineWidth = 3
          ctx.strokeStyle = 'rgba(2,6,12,0.78)'
          ctx.strokeText(tx(text), labelAx, labelAy)
          ctx.fillStyle = annotColor
          ctx.fillText(tx(text), labelAx, labelAy)
          ctx.restore()
        }

        // 撞击闪光：橙白扩散环 + 余辉
        if (a.phase === 'crashed' && a.periPoint && s.crashFlash > 0.01) {
          const t = s.crashFlash
          const [cx2, cy2] = toPx(a.periPoint)
          const rr = plR * (0.2 + (1 - t) * 0.9)
          ctx.save()
          ctx.globalCompositeOperation = 'lighter'
          const g = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, rr)
          g.addColorStop(0, `rgba(255,214,150,${0.7 * t})`)
          g.addColorStop(0.5, `rgba(255,120,80,${0.38 * t})`)
          g.addColorStop(1, 'rgba(255,120,80,0)')
          ctx.fillStyle = g
          ctx.beginPath()
          ctx.arc(cx2, cy2, rr, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = `rgba(255,190,120,${0.75 * t})`
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(cx2, cy2, rr * 0.9, 0, Math.PI * 2)
          ctx.stroke()
          ctx.restore()
        }

        if (s.launched && a.phase !== 'crashed') {
          // 探针（发光小艇）+ 相对速度箭头（克制的细发光箭头）
          const vm = Math.hypot(a.vel.x, a.vel.y)
          if (vm > 1e-6) {
            const ax = pxS + (a.vel.x / vm) * 30
            const ay = pyS - (a.vel.y / vm) * 30
            const ux = a.vel.x / vm
            const uy = -a.vel.y / vm
            ctx.save()
            ctx.globalCompositeOperation = 'lighter'
            ctx.strokeStyle = 'rgba(207,240,248,0.55)'
            ctx.lineWidth = 1.2
            ctx.beginPath()
            ctx.moveTo(pxS, pyS)
            ctx.lineTo(ax, ay)
            ctx.stroke()
            ctx.fillStyle = 'rgba(207,240,248,0.75)'
            ctx.beginPath()
            ctx.moveTo(ax + ux * 7, ay + uy * 7)
            ctx.lineTo(ax - uy * 3, ay + ux * 3)
            ctx.lineTo(ax + uy * 3, ay - ux * 3)
            ctx.closePath()
            ctx.fill()
            ctx.restore()
          }
          drawShip(ctx, pxS, pyS, a.vel.x, -a.vel.y)
        } else if (!s.launched) {
          // 未发射：瞄准预览（虚线走廊随近场放大弯向行星 + 起点脉冲标记）
          const previewState = makeAssistState(s.side, s.alt)
          const [px, py] = toPx(previewState.probe)
          ctx.save()
          ctx.strokeStyle = hexAlpha(CYAN, 0.7)
          ctx.shadowColor = CYAN
          ctx.shadowBlur = 5
          ctx.setLineDash([6, 6])
          ctx.lineWidth = 1.4
          ctx.beginPath()
          let first = true
          for (let x = previewState.probe.x - 0.05; x <= -0.02; x += 0.11) {
            const [lx, ly] = toPx({ x, y: aimY })
            if (first) {
              ctx.moveTo(lx, ly)
              first = false
            } else {
              ctx.lineTo(lx, ly)
            }
          }
          ctx.stroke()
          ctx.restore()
          ctx.setLineDash([])
          const pulse = s.reducedMotion ? 0.5 : Math.sin(nowS * 3) * 0.5 + 0.5
          ctx.beginPath()
          ctx.fillStyle = 'rgba(255,255,255,0.9)'
          ctx.shadowColor = CYAN
          ctx.shadowBlur = 9
          ctx.arc(px, py, 3.6, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowBlur = 0
          ctx.beginPath()
          ctx.strokeStyle = hexAlpha(CYAN, 0.35 + 0.35 * pulse)
          ctx.arc(px, py, 7 + pulse * 3, 0, Math.PI * 2)
          ctx.stroke()
          ctx.fillStyle = CYAN
          ctx.font = '11px sans-serif'
          ctx.fillText(tx('飞船进入方向'), px + 10, py - 12)
        }
      }

      // ============ 拉格朗日模式 ============
      if (s.mode === 'lagrange') {
        drawStarfield(ctx, stars, w, h, nowS, 0, 0, drift)
        const cx = mobile ? w * 0.5 : w * 0.44
        const cy = h * (mobile ? 0.36 : 0.44)
        const toPx = (p: Vec): [number, number] => [cx + p.x * scale, cy - p.y * scale]
        // 有效势能背景（紫色等值带，缓存）
        const bgKey = `${Math.round(w)}-${Math.round(h)}-${scale}`
        if (!s.bg || s.bgKey !== bgKey) {
          s.bgKey = bgKey
          const res = 150
          s.bg = document.createElement('canvas')
          s.bg.width = res
          s.bg.height = res
          const bctx = s.bg.getContext('2d')!
          const img = bctx.createImageData(res, res)
          const sun = { x: -MU_L, y: 0 }
          const pla = { x: 1 - MU_L, y: 0 }
          const range = 1.6
          for (let iy = 0; iy < res; iy++) {
            for (let ix = 0; ix < res; ix++) {
              const x = (ix / (res - 1)) * 2 * range - range
              const y = (iy / (res - 1)) * 2 * range - range
              const r1 = Math.max(0.06, Math.hypot(x - sun.x, y - sun.y))
              const r2 = Math.max(0.06, Math.hypot(x - pla.x, y - pla.y))
              const omega = ((1 - MU_L) / r1 + MU_L / r2 + (x * x + y * y) / 2)
              const t = Math.max(0, Math.min(1, (omega - 1.4) / 1.4))
              const band = Math.floor(t * 13) / 13
              let r = 26 + band * 60
              let g = 18 + band * 46
              let b = 60 + band * 80
              const frac = t * 13 - Math.floor(t * 13)
              if (frac < 0.12) {
                r *= 0.55
                g *= 0.55
                b *= 0.75
              }
              const idx = (iy * res + ix) * 4
              img.data[idx] = r
              img.data[idx + 1] = g
              img.data[idx + 2] = b
              img.data[idx + 3] = 255
            }
          }
          bctx.putImageData(img, 0, 0)
        }
        const fieldW = scale * 3.2
        ctx.save()
        ctx.beginPath()
        ctx.roundRect(cx - fieldW / 2, cy - fieldW / 2, fieldW, fieldW, 14)
        ctx.clip()
        ctx.drawImage(s.bg, cx - fieldW / 2, cy - fieldW / 2, fieldW, fieldW)
        ctx.restore()

        // 太阳与行星（旋转系中固定，带微光晕）
        const [sunX, sunY] = toPx({ x: -MU_L, y: 0 })
        const [plX, plY] = toPx({ x: 1 - MU_L, y: 0 })
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        const sunGlow = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, 36)
        sunGlow.addColorStop(0, 'rgba(255,223,138,0.5)')
        sunGlow.addColorStop(1, 'rgba(255,223,138,0)')
        ctx.fillStyle = sunGlow
        ctx.beginPath()
        ctx.arc(sunX, sunY, 36, 0, Math.PI * 2)
        ctx.fill()
        const plGlow = ctx.createRadialGradient(plX, plY, 2, plX, plY, 22)
        plGlow.addColorStop(0, 'rgba(232,200,138,0.35)')
        plGlow.addColorStop(1, 'rgba(232,200,138,0)')
        ctx.fillStyle = plGlow
        ctx.beginPath()
        ctx.arc(plX, plY, 22, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
        ctx.fillStyle = '#ffdf8a'
        ctx.shadowColor = '#ffdf8a'
        ctx.shadowBlur = 10
        ctx.beginPath()
        ctx.arc(sunX, sunY, 10, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        const plGradL = ctx.createRadialGradient(plX - 3, plY - 3, 1, plX, plY, 10)
        plGradL.addColorStop(0, '#f0d9a8')
        plGradL.addColorStop(1, '#8a6238')
        ctx.fillStyle = plGradL
        ctx.beginPath()
        ctx.arc(plX, plY, 9, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.6)'
        ctx.font = '11px sans-serif'
        ctx.fillText(tx('太阳'), sunX - 12, sunY + 26)
        ctx.fillText(tx('行星'), plX - 12, plY + 24)
        // 行星轨道圈
        ctx.strokeStyle = 'rgba(255,255,255,0.12)'
        ctx.beginPath()
        ctx.arc(sunX, sunY, scale * 1, 0, Math.PI * 2)
        ctx.stroke()

        // L 点标记
        const marks: Array<{ key: 'L4' | 'L1' | 'L2'; p: Vec; stable: boolean }> = [
          { key: 'L4', p: lPoints.L4, stable: true },
          { key: 'L1', p: lPoints.L1, stable: false },
          { key: 'L2', p: lPoints.L2, stable: false },
        ]
        for (const m of marks) {
          const [mx, my] = toPx(m.p)
          ctx.save()
          ctx.strokeStyle = m.stable ? GREEN : RED
          ctx.shadowColor = m.stable ? GREEN : RED
          ctx.shadowBlur = 7
          ctx.lineWidth = 1.6
          ctx.beginPath()
          ctx.arc(mx, my, 8, 0, Math.PI * 2)
          ctx.stroke()
          ctx.restore()
          ctx.lineWidth = 1
          ctx.fillStyle = m.stable ? GREEN : RED
          ctx.font = '600 11px sans-serif'
          ctx.fillText(tx(m.key), mx + 11, my + 4)
        }

        // 粒子积分（旋转系，含科里奥利力）
        const lag = s.lag
        if (lag && !lag.status) {
          const sub = 12
          const dt = 0.002
          const sun = { x: -MU_L, y: 0 }
          const pla = { x: 1 - MU_L, y: 0 }
          for (let k = 0; k < sub; k++) {
            const r1 = Math.max(0.05, Math.hypot(lag.p.x - sun.x, lag.p.y - sun.y))
            const r2 = Math.max(0.05, Math.hypot(lag.p.x - pla.x, lag.p.y - pla.y))
            const dOx = (1 - MU_L) * (lag.p.x - sun.x) / r1 ** 3 + MU_L * (lag.p.x - pla.x) / r2 ** 3 - lag.p.x
            const dOy = (1 - MU_L) * lag.p.y / r1 ** 3 + MU_L * lag.p.y / r2 ** 3 - lag.p.y
            const ax = 2 * lag.v.y - dOx
            const ay = -2 * lag.v.x - dOy
            lag.v.x += ax * dt
            lag.v.y += ay * dt
            lag.p.x += lag.v.x * dt
            lag.p.y += lag.v.y * dt
            lag.time += dt
          }
          lag.trail.push({ ...lag.p })
          if (lag.trail.length > 2400) lag.trail.splice(0, lag.trail.length - 2400)
          const rNow = Math.hypot(lag.p.x, lag.p.y)
          if (rNow > 2.2 || lag.time > 60) {
            lag.status = rNow > 2.2 ? 'escaped' : 'stable'
            setLStatus(lag.status)
          }
        }
        if (lag) {
          if (lag.trail.length > 1) {
            const pts: Array<[number, number]> = new Array(lag.trail.length)
            for (let i = 0; i < lag.trail.length; i++) pts[i] = toPx(lag.trail[i])
            strokeGlowTrail(ctx, pts, lag.status === 'escaped' ? RED : CYAN, {
              core: 1.6,
              glow: 5,
              coreAlpha: 0.85,
              glowAlpha: 0.14,
            })
          }
          const [px, py] = toPx(lag.p)
          ctx.beginPath()
          ctx.fillStyle = '#fff'
          ctx.shadowColor = CYAN
          ctx.shadowBlur = 9
          ctx.arc(px, py, 4, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowBlur = 0
        }

        // 状态横幅
        if (lStatus === 'stable') {
          ctx.fillStyle = GREEN
          ctx.font = '600 13px sans-serif'
          ctx.fillText(tx('稳定：粒子被「锁」在拉格朗日点附近转圈'), cx - fieldW / 2 + 14, cy + fieldW / 2 - 18)
        }
        if (lStatus === 'escaped') {
          ctx.fillStyle = RED
          ctx.font = '600 13px sans-serif'
          ctx.fillText(tx('不稳定：粒子一点点偏移就漂走了'), cx - fieldW / 2 + 14, cy + fieldW / 2 - 18)
        }
      }

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lPoints, lStatus])

  const dv = result ? result.vOut - result.vIn : 0
  const altValue = (() => {
    // nbsp 连接：读数作为整体换行，避免窄面板里 CJK 逐字断开
    const join = (s: string) => s.replaceAll(' ', ' ')
    if (crashed) return { text: tx('撞上云顶'), red: true }
    if (result) {
      const altKm = Math.max(0, (result.minD - PLANET_R_WORLD) * KM_PER_WORLD)
      return { text: join(`${((result.minD - PLANET_R_WORLD) / PLANET_R_WORLD).toFixed(2)} R · ${tx(formatKm(altKm))}`), red: false }
    }
    if (previewPeri.crash) return { text: tx('会撞上云顶'), red: true }
    const altKm = Math.max(0, (previewPeri.d - PLANET_R_WORLD) * KM_PER_WORLD)
    return { text: join(`${((previewPeri.d - PLANET_R_WORLD) / PLANET_R_WORLD).toFixed(2)} R · ${tx(formatKm(altKm))}`), red: false }
  })()

  const guideSteps: Array<GuideStep> = [
    {
      title: tx('先看清行星自己的速度'),
      body: tx('画面跟着行星走（质心系）。紫色箭头是行星的公转速度——飞船能借走的能量就藏在它里面。'),
      action: () => {
        setMode('assist')
        setSide('behind')
        setAlt(1.0)
        setLaunched(false)
        setResult(null)
        setCrashed(false)
        st.current.mode = 'assist'
        st.current.side = 'behind'
        st.current.alt = 1.0
        st.current.launched = false
        st.current.assist = makeAssistState('behind', 1.0)
      },
    },
    {
      title: tx('从后方掠过：被顺手推一把'),
      body: tx('飞船从行星公转方向的尾侧通过，轨迹被掰向公转方向；回到太阳参考系，它带着更高的速度离开。这次近点距云顶约 1 个行星半径（约 7 万公里）——先驱者 11 号飞掠木星就是这个量级。'),
      action: () => launch({ sideOverride: 'behind', altOverride: 1.0, trackInteraction: false }),
    },
    {
      title: tx('从前方掠过：把速度还回去'),
      body: tx('换到行星迎面的一侧，飞船被掰向与公转相反的方向，于是减速。帕克太阳探测器正靠这种方式落向太阳。'),
      action: () => launch({ sideOverride: 'ahead', altOverride: 1.0, trackInteraction: false }),
    },
    {
      title: tx('L4：被引力锁住的三角点'),
      body: tx('在跟着行星一起转的参考系里，引力与离心力形成五个平衡位置。L4 附近的小偏移会绕着平衡点摆动，而不是立刻逃走。'),
      action: () => {
        setMode('lagrange')
        st.current.mode = 'lagrange'
        dropParticle('L4', false)
      },
    },
    {
      title: tx('L1：看似平衡，却会慢慢漂走'),
      body: tx('L1 也能短暂平衡，但任何细小误差都会被放大。现实中的望远镜必须定期点火修正，才能守在附近。'),
      action: () => {
        setMode('lagrange')
        st.current.mode = 'lagrange'
        dropParticle('L1', false)
      },
    },
  ]

  return (
    <div className={`oss-experience ga-experience${storyMode ? ' is-story' : ' is-free'}`}>
      <canvas ref={canvasRef} className="ga-canvas" />

      {!storyMode && (
        <header className="ga-question" data-experience-overlay="true">
          <h1>{tx('飞船如何不烧燃料，向行星「借」速度？')}</h1>
          <p>{tx('引力弹弓不是被「吸」过去加速，而是搭行星公转的便车。')}</p>
          <button type="button" className="ga-why-btn" onClick={() => setWhyOpen(true)}>
            <Question weight="bold" /> {tx('为什么')}
          </button>
        </header>
      )}

      {!storyMode && (
      <aside className="ga-readout" data-experience-overlay="true" data-freebar-clearance="true">
        {mode === 'assist' ? (
          <>
            <div className="ga-readout-row">
              <small>{tx("状态")}</small>
              <strong className="is-cyan" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span
                  ref={dotRef}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: CYAN,
                    boxShadow: '0 0 8px rgba(77,208,225,0.9)',
                    flex: 'none',
                  }}
                />
                {tx(launched ? (crashed ? '已坠毁' : result ? '完成' : '巡航中') : '待命 · 选择掠过方式')}
              </strong>
            </div>
            <div className="ga-readout-row ga-alt-row">
              <small>{tx("最近高度（云顶上方）")}</small>
              <strong className={altValue.red ? 'is-red' : 'is-cyan'}>{altValue.text}</strong>
            </div>
            <div className="ga-readout-row">
              <small>{tx("进入速度（日心系）")}</small>
              <strong className="is-cyan">{`${(V_IN * KM_S_PER_V).toFixed(1)} km/s`}</strong>
            </div>
            <div className="ga-readout-row">
              <small>{tx("离开速度（日心系）")}</small>
              <strong className="is-cyan">{result ? `${(result.vOut * KM_S_PER_V).toFixed(1)} km/s` : '—'}</strong>
            </div>
            <div className="ga-readout-row">
              <small>Δv</small>
              <strong ref={dvRef} className={dv > 0 ? 'is-green' : dv < 0 ? 'is-red' : 'is-cyan'}>
                {result ? `${dv >= 0 ? '+' : ''}${(dv * KM_S_PER_V).toFixed(1)} km/s` : '—'}
              </strong>
            </div>
            {crashed && (
              <div className="ga-critical">
                <strong>{tx("撞上云顶，飞船焚毁")}</strong>
                <span>{tx("近点低于行星表面，真实任务到此为止。调高飞掠高度再发射。")}</span>
              </div>
            )}
            {!crashed && result && (
              <div className={dv > 0 ? 'ga-success' : 'ga-critical'}>
                {dv > 0 ? (
                  <>
                    <Trophy weight="fill" /> {tx("能量增加。行星损失了同等能量（但几乎测不出）")}</>
                ) : (
                  <>
                    <strong>{tx("减速了")}</strong>
                    <span>{tx("从前方掠过，能量被还给了行星。")}</span>
                  </>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="ga-readout-row">
              <small>{tx("参考系")}</small>
              <strong className="is-cyan">{tx("随行星旋转")}</strong>
            </div>
            <div className="ga-readout-row">
              <small>{tx("当前放置")}</small>
              <strong className="is-cyan">{tx(lPoint)}</strong>
            </div>
            <div className="ga-readout-row">
              <small>{tx("稳定性")}</small>
              <strong className={lPoint === 'L4' ? 'is-green' : 'is-red'}>{tx(lPoint === 'L4' ? '稳定（μ 足够小）' : '不稳定')}</strong>
            </div>
            {lStatus && (
              <div className={lStatus === 'stable' ? 'ga-success' : 'ga-critical'}>
                {lStatus === 'stable' ? (
                  <>
                    <Trophy weight="fill" /> {tx("特洛伊小行星就这样在 L4/L5 扎了根")}</>
                ) : (
                  <>
                    <strong>{tx("漂走了")}</strong>
                    <span>{tx("L1/L2/L3 需要不断点火维持（光环计划轨道）。")}</span>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </aside>
      )}

      {!storyMode && (
        <Freebar
          className="ga-freebar"
          mainClassName="ga-freebar-main"
          ariaLabel={tx('参数')}
          primaryControlBudget={3}
          secondaryDefault="closed"
          secondary={(
            <div className="ga-tray">
              <div className="ga-chip-rail experience-freebar-chips" role="group" aria-label={tx('弹弓参数')}>
                {mode === 'assist' ? (
                  <>
                    <div className="experience-freebar-seg" role="group" aria-label={tx('掠过侧')}>
                      <button
                        type="button"
                        className={side === 'behind' ? 'is-active' : undefined}
                        onClick={() => {
                          controls.registerInteraction()
                          setSide('behind')
                          setLaunched(false)
                          setCrashed(false)
                        }}
                      >
                        {tx('后方')}
                      </button>
                      <button
                        type="button"
                        className={side === 'ahead' ? 'is-active' : undefined}
                        onClick={() => {
                          controls.registerInteraction()
                          setSide('ahead')
                          setLaunched(false)
                          setCrashed(false)
                        }}
                      >
                        {tx('前方')}
                      </button>
                    </div>
                    <div className="experience-freebar-field ga-param">
                      <div>
                        <span>{tx('飞掠高度')}</span>
                        <strong className={alt < 0 ? 'is-red' : 'is-yellow'}>{`${alt.toFixed(2)} R`}</strong>
                      </div>
                      <input
                        type="range"
                        min={-0.5}
                        max={1.5}
                        step={0.05}
                        value={alt}
                        onChange={(e) => {
                          controls.registerInteraction()
                          setAlt(Number(e.target.value))
                          setLaunched(false)
                          setCrashed(false)
                        }}
                        aria-label={tx('飞掠高度（行星半径，云顶上方）')}
                      />
                    </div>
                  </>
                ) : (
                  <button type="button" className="experience-freebar-reset" onClick={() => dropParticle(lPoint)} aria-label={tx('重放')}>
                    <ArrowCounterClockwise weight="bold" />
                    <span>{tx('重放')}</span>
                  </button>
                )}
                <button
                  type="button"
                  className="experience-freebar-story"
                  onClick={() => {
                    controls.registerInteraction()
                    enterStory()
                    replayGuide('gravity-assist')
                  }}
                  aria-label={tx('重播故事')}
                >
                  <FilmStrip weight="fill" />
                  <span>{tx('故事')}</span>
                </button>
              </div>
            </div>
          )}
        >
          <div className="experience-freebar-seg" role="group" aria-label={tx('模式')}>
            <button
              type="button"
              className={mode === 'assist' ? 'is-active' : undefined}
              onClick={() => {
                controls.registerInteraction()
                setMode('assist')
              }}
            >
              <RocketLaunch /> {tx('弹弓')}
            </button>
            <button
              type="button"
              className={mode === 'lagrange' ? 'is-active' : undefined}
              onClick={() => {
                controls.registerInteraction()
                setMode('lagrange')
                if (!st.current.lag) dropParticle('L4')
              }}
            >
              <Planet /> {tx('拉格朗日')}
            </button>
          </div>

          {mode === 'assist' ? (
            <button
              type="button"
              className="assist-launch is-accent"
              onClick={() => launch()}
            >
              <RocketLaunch weight="fill" /> {tx(launched ? '再发射' : '发射')}
            </button>
          ) : (
            <div className="experience-freebar-rail ga-l-points" role="group" aria-label={tx('放置粒子')}>
              {(['L4', 'L1', 'L2'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={lPoint === p ? 'is-active' : undefined}
                  onClick={() => dropParticle(p)}
                >
                  {tx(p)}
                </button>
              ))}
            </div>
          )}
        </Freebar>
      )}

      {whyOpen && (
        <div className="ga-why" role="dialog" aria-label={tx('引力弹弓与拉格朗日点解释')} data-experience-overlay="true">
          <div className="ga-why-card">
            <button type="button" className="ga-why-close" onClick={() => setWhyOpen(false)} aria-label={tx('关闭')}>
              <X weight="bold" />
            </button>
            <h2>{tx('「借」速度，借的到底是什么？')}</h2>
            <p>
              {tx('在行星自己的参考系里，飞船靠近再离开，速率其实')}<strong>{tx('没变')}</strong>{tx('——引力是保守力。 但行星在以 13 km/s（木星）绕太阳狂奔：飞船从')}<strong>{tx('后方')}</strong>{tx('绕过时， 轨迹被掰向行星运动的方向，回到太阳参考系一看，速度凭空多了一截。 能量守恒没有被打破：飞船多出的动能，就是行星损失的轨道动能——只是行星太重，损失测不出来。')}
            </p>
            <p>
              {tx('旅行者 1 号正是靠木星和土星的连续弹弓离开太阳系；卡西尼号靠两次金星弹弓才被甩向土星。 从')}<strong>{tx('前方')}</strong>{tx('掠过则相反：飞船被「刹车」，落向太阳系内侧——帕克太阳探测器就是这样贴近太阳的。')}
            </p>
            <p>
              {tx('真实的飞掠有多近？朱诺号 2013 年回掠地球，最近约 559 km；卡西尼号两次金星飞掠分别约 284 km 与 600 km。 气态巨行星通常保持数个行星半径：先驱者 11 号距木星云顶约 4.3 万公里，旅行者 2 号约 57 万公里。 本演示的行星半径取木星量级（约 7.1 万公里），把飞掠高度拖到 0 以下就会撞上云顶。')}
            </p>
            <p>
              {tx('拉格朗日点是旋转参考系里引力与离心力恰好抵消的 5 个平衡位置（')}<span className="is-purple">{tx('紫色等值面')}</span>{tx('的极值点）。L4/L5 在行星前后 60°， 质量比够悬殊时稳定——木星的特洛伊小行星群就聚在那里；L1/L2/L3 永远不稳定， 所以韦伯望远镜在 L2 需要定期点火维持。')}<span className="is-red">{tx('红色')}</span>{tx('轨迹是失稳漂走，')}<span className="is-cyan">{tx('青色')}</span>{tx('是被锁定。')}
            </p>
            <small>{tx('模型：平面圆轨道限制性三体；弹弓为行星质心系二体双曲线飞掠，行星半径按木星约 7.1 万公里、行星公转速度按 13 km/s 定标；拉格朗日模式质量比取 0.02（低于 L4 稳定上限 0.0385）。')}</small>
          </div>
        </div>
      )}

      <GuideTour
        worldId="gravity-assist"
        steps={guideSteps}
        placement="stage"
        stagePlan={[
          { position: 'top-left', mobilePosition: 'top-left', width: 'wide', treatment: 'monumental' },
          { position: 'top-right', mobilePosition: 'top-right', motion: 'drift-left', treatment: 'editorial' },
          { position: 'bottom-right', mobilePosition: 'bottom-right', motion: 'rise', treatment: 'caption' },
          { position: 'bottom-left', mobilePosition: 'bottom-left', motion: 'drift-right', treatment: 'editorial' },
          { position: 'top-right', mobilePosition: 'top-right', motion: 'fade', treatment: 'caption' },
        ]}
        defaultOpen={storyMode}
        onExit={enterFree}
      />
      {!storyMode && (
        <GhostHint worldId="gravity-assist" gesture={{ type: 'tap', target: '.assist-launch', label: tx('点「发射」扔出飞船') }} />
      )}
    </div>
  )
}
