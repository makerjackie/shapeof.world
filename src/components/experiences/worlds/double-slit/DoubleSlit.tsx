import './styles/DoubleSlit.css'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, ArrowCounterClockwise, Question, X, Eye, FilmStrip } from '@phosphor-icons/react'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { GuideTour, replayGuide, type GuideStep } from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import { useExperienceI18n } from '~/i18n/experience'
import { cancelWorldFrame, requestWorldFrame } from '~/lib/world-playback'

const CYAN = '#4dd0e1'
const YELLOW = '#ffd166'
const PURPLE = '#b15cff'
const RED = '#ff6b6b'

type Mode = 'wave' | 'quantum'

const L_SCREEN = 1 // 屏距（米）
const SLIT_WIDTH = 5e-6 // 缝宽（米），用于单缝包络

function wavelengthToRgb(nm: number): string {
  // 近似可见光颜色
  let r = 0
  let g = 0
  let b = 0
  if (nm < 440) { r = (440 - nm) / 60; b = 1 }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1 }
  else if (nm < 510) { g = 1; b = (510 - nm) / 20 }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1 }
  else if (nm < 645) { r = 1; g = (645 - nm) / 65 }
  else { r = 1 }
  const f = nm < 420 ? 0.55 + (0.45 * (nm - 380)) / 40 : nm > 660 ? 0.6 + (0.4 * (780 - nm)) / 120 : 1
  return `rgb(${Math.round(r * 255 * f)},${Math.round(g * 255 * f)},${Math.round(b * 255 * f)})`
}

/** 屏幕位置 y（米，中心为 0）处的相对光强 */
function screenIntensity(y: number, lambdaNm: number, slitDUm: number, observe: boolean) {
  const lambda = lambdaNm * 1e-9
  const d = slitDUm * 1e-6
  const envelopeArg = (Math.PI * SLIT_WIDTH * y) / (lambda * L_SCREEN)
  const envelope = envelopeArg === 0 ? 1 : Math.sin(envelopeArg) / envelopeArg
  const e2 = envelope * envelope
  if (observe) return e2 // 被观测：只剩单缝包络，无干涉项
  const phase = (Math.PI * d * y) / (lambda * L_SCREEN)
  return e2 * Math.cos(phase) * Math.cos(phase)
}

function fringeSpacingMm(lambdaNm: number, slitDUm: number) {
  return ((lambdaNm * 1e-9 * L_SCREEN) / (slitDUm * 1e-6)) * 1000
}

type FlyingParticle = {
  t: number // 0..1 飞行进度
  slit: 0 | 1
  hitY: number // 命中屏幕的 y（米）
  speed: number
}

export function DoubleSlit({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { storyMode, enterFree, enterStory } = useStoryFreeMode('double-slit')
  const [mode, setMode] = useState<Mode>('wave')
  const [lambda, setLambda] = useState(550)
  const [slitD, setSlitD] = useState(30)
  const [observe, setObserve] = useState(false)
  const [playing, setPlaying] = useState(true)
  const [whyOpen, setWhyOpen] = useState(false)
  const [particleCount, setParticleCount] = useState(0)

  const st = useRef({
    mode, lambda, slitD, observe, playing,
    time: 0, lastNow: 0,
    flying: [] as Array<FlyingParticle>,
    count: 0,
    bins: new Float32Array(160),
    accum: null as HTMLCanvasElement | null,
    spawnAcc: 0,
    gridKey: '',
    r1Grid: new Float32Array(0),
    r2Grid: new Float32Array(0),
  })
  st.current.mode = mode
  st.current.lambda = lambda
  st.current.slitD = slitD
  st.current.observe = observe
  st.current.playing = playing

  useEffect(() => {
    controls.completeOnboarding()
  }, [controls])

  // 重置探测屏
  const resetScreen = () => {
    st.current.count = 0
    st.current.bins = new Float32Array(160)
    st.current.flying = []
    st.current.accum = null
    setParticleCount(0)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf = 0
    const fieldImage = document.createElement('canvas')

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

      const dt = s.lastNow ? Math.min((now - s.lastNow) / 1000, 0.08) : 0
      s.lastNow = now
      if (s.playing) s.time += dt

      // 背景
      ctx.fillStyle = '#05070f'
      ctx.fillRect(0, 0, w, h)

      const mobile = w < 720
      const srcX = w * 0.055
      const barrierX = mobile ? w * 0.3 : w * 0.32
      const screenX = mobile ? w * 0.86 : w * 0.84
      const midY = h * (mobile ? 0.4 : 0.44)
      const slitSepPx = 12 + ((s.slitD - 10) / 50) * 46 // 14..58 px
      const slit1Y = midY - slitSepPx / 2
      const slit2Y = midY + slitSepPx / 2
      const screenHalfH = h * (mobile ? 0.26 : 0.3)
      const yToPx = (ym: number) => midY + (ym / 0.12) * screenHalfH
      const pxToY = (px: number) => ((px - midY) / screenHalfH) * 0.12
      const color = wavelengthToRgb(s.lambda)

      // ===== 波模式：双源干涉场（距离场缓存，逐帧只做 cos） =====
      if (s.mode === 'wave') {
        const fieldW = Math.max(60, Math.floor((screenX - barrierX) / 5))
        const fieldH = Math.max(60, Math.floor((screenHalfH * 2) / 5))
        const gridKey = `${fieldW}x${fieldH}-${slitSepPx.toFixed(1)}-${midY.toFixed(1)}-${barrierX.toFixed(1)}-${screenX.toFixed(1)}`
        if (s.gridKey !== gridKey) {
          s.gridKey = gridKey
          s.r1Grid = new Float32Array(fieldW * fieldH)
          s.r2Grid = new Float32Array(fieldW * fieldH)
          for (let iy = 0; iy < fieldH; iy++) {
            const py = midY - screenHalfH + (iy / fieldH) * screenHalfH * 2
            const dy1 = py - slit1Y
            const dy2 = py - slit2Y
            for (let ix = 0; ix < fieldW; ix++) {
              const dx = (ix / fieldW) * (screenX - barrierX)
              const idx = iy * fieldW + ix
              s.r1Grid[idx] = Math.sqrt(dx * dx + dy1 * dy1)
              s.r2Grid[idx] = Math.sqrt(dx * dx + dy2 * dy2)
            }
          }
        }
        fieldImage.width = fieldW
        fieldImage.height = fieldH
        const fctx = fieldImage.getContext('2d')!
        const img = fctx.createImageData(fieldW, fieldH)
        const k = (2 * Math.PI) / (26 + ((s.lambda - 400) / 280) * 26) // 像素波长 26..52
        const omega = 2.4
        const phase0 = omega * s.time
        for (let idx = 0; idx < s.r1Grid.length; idx++) {
          const r1 = s.r1Grid[idx]
          const r2 = s.r2Grid[idx]
          const a1 = Math.cos(k * r1 - phase0) / (1 + r1 * 0.006)
          const a2 = Math.cos(k * r2 - phase0) / (1 + r2 * 0.006)
          let amp = s.observe ? (a1 + a2) * 0.5 : (a1 + a2) * 0.72
          if (s.observe) amp = (Math.abs(a1) + Math.abs(a2)) * 0.35 // 退相干：无条纹
          const v = Math.max(-1, Math.min(1, amp))
          const i4 = idx * 4
          if (v >= 0) {
            img.data[i4] = 120 + v * 135
            img.data[i4 + 1] = 60 + v * 130
            img.data[i4 + 2] = 200 + v * 55
          } else {
            img.data[i4] = 30 + -v * 20
            img.data[i4 + 1] = 16 + -v * 40
            img.data[i4 + 2] = 70 + -v * 90
          }
          img.data[i4 + 3] = 215
        }
        fctx.putImageData(img, 0, 0)
        ctx.imageSmoothingEnabled = true
        ctx.drawImage(fieldImage, barrierX, midY - screenHalfH, screenX - barrierX, screenHalfH * 2)

        // 屏障前的入射波（动态横线）
        ctx.strokeStyle = 'rgba(177,92,255,0.35)'
        ctx.lineWidth = 1.5
        for (let i = 0; i < 4; i++) {
          const px = srcX + ((s.time * 60 + i * 34) % (barrierX - srcX - 8))
          ctx.beginPath()
          ctx.moveTo(px, midY - screenHalfH * 0.42)
          ctx.lineTo(px, midY + screenHalfH * 0.42)
          ctx.stroke()
        }
      }

      // ===== 屏障与双缝 =====
      ctx.fillStyle = 'rgba(225,233,245,0.95)'
      ctx.shadowColor = 'rgba(200,220,255,0.5)'
      ctx.shadowBlur = 6
      const slitHalfPx = 6
      ctx.fillRect(barrierX - 4, midY - screenHalfH, 8, slit1Y - slitHalfPx - (midY - screenHalfH))
      ctx.fillRect(barrierX - 4, slit1Y + slitHalfPx, 8, slit2Y - slitHalfPx - (slit1Y + slitHalfPx))
      ctx.fillRect(barrierX - 4, slit2Y + slitHalfPx, 8, midY + screenHalfH - (slit2Y + slitHalfPx))
      ctx.shadowBlur = 0

      // 观测装置（红色）
      if (s.observe) {
        ctx.fillStyle = RED
        ctx.beginPath()
        ctx.arc(barrierX - 14, midY, 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.font = '10px sans-serif'
        ctx.fillText(tx('观测中'), barrierX - 34, midY - 12)
      }

      // ===== 光源 =====
      ctx.beginPath()
      ctx.fillStyle = color
      ctx.shadowColor = color
      ctx.shadowBlur = 16
      ctx.arc(srcX, midY, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.fillStyle = 'rgba(255,255,255,0.55)'
      ctx.font = '11px sans-serif'
      ctx.fillText(tx(s.mode === 'wave' ? '波源' : '粒子源'), srcX - 14, midY + 24)

      // ===== 量子模式：粒子飞行 + 屏上累积 =====
      if (s.mode === 'quantum') {
        if (!s.accum) {
          s.accum = document.createElement('canvas')
          s.accum.width = Math.round(w * dpr)
          s.accum.height = Math.round(h * dpr)
        }
        const actx = s.accum.getContext('2d')!
        actx.setTransform(dpr, 0, 0, dpr, 0, 0)

        // 发射与飞行
        if (s.playing) {
          s.spawnAcc += dt * 26 // 每秒约 26 个
          while (s.spawnAcc > 1 && s.flying.length < 40) {
            s.spawnAcc -= 1
            // 拒绝采样命中位置
            let hitY = 0
            for (let tries = 0; tries < 60; tries++) {
              const cand = (Math.random() * 2 - 1) * 0.12
              if (Math.random() < screenIntensity(cand, s.lambda, s.slitD, s.observe)) {
                hitY = cand
                break
              }
            }
            s.flying.push({ t: 0, slit: Math.random() < 0.5 ? 0 : 1, hitY, speed: 2.6 + Math.random() * 1.2 })
          }
        }
        for (let i = s.flying.length - 1; i >= 0; i--) {
          const p = s.flying[i]
          p.t += dt * p.speed
          const slitY = p.slit === 0 ? slit1Y : slit2Y
          const hitPx = yToPx(p.hitY)
          let px: number
          let py: number
          if (p.t < 0.5) {
            const u = p.t / 0.5
            px = srcX + (barrierX - srcX) * u
            py = midY + (slitY - midY) * u
          } else {
            const u = (p.t - 0.5) / 0.5
            px = barrierX + (screenX - barrierX) * u
            py = slitY + (hitPx - slitY) * u
          }
          ctx.beginPath()
          ctx.fillStyle = color
          ctx.shadowColor = color
          ctx.shadowBlur = 8
          ctx.arc(px, py, 2.2, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowBlur = 0
          if (p.t >= 1) {
            s.flying.splice(i, 1)
            s.count += 1
            const bin = Math.max(0, Math.min(s.bins.length - 1, Math.floor(((hitPx - (midY - screenHalfH)) / (screenHalfH * 2)) * s.bins.length)))
            s.bins[bin] += 1
            actx.beginPath()
            actx.fillStyle = color
            actx.globalAlpha = 0.9
            actx.arc(screenX, hitPx, 1.6, 0, Math.PI * 2)
            actx.fill()
            actx.globalAlpha = 1
            if (s.count % 20 === 0) setParticleCount(s.count)
          }
        }
        ctx.drawImage(s.accum, 0, 0, w, h)
      }

      // ===== 探测屏 =====
      ctx.fillStyle = 'rgba(225,233,245,0.55)'
      ctx.fillRect(screenX - 2.5, midY - screenHalfH, 5, screenHalfH * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.55)'
      ctx.font = '11px sans-serif'
      ctx.fillText(tx('探测屏'), screenX - 16, midY + screenHalfH + 18)

      // 理论强度曲线（青色）叠加在屏旁
      ctx.beginPath()
      ctx.strokeStyle = CYAN
      ctx.lineWidth = 1.6
      let first = true
      for (let i = 0; i <= 120; i++) {
        const ym = -0.12 + (i / 120) * 0.24
        const inten = screenIntensity(ym, s.lambda, s.slitD, s.observe)
        const px = screenX + 6 + inten * (w * 0.09)
        const py = yToPx(ym)
        if (first) { ctx.moveTo(px, py); first = false } else ctx.lineTo(px, py)
      }
      ctx.stroke()
      ctx.lineWidth = 1

      // 量子模式：实测直方图（黄色描边）
      if (s.mode === 'quantum' && s.count > 30) {
        let maxBin = 0
        for (let i = 0; i < s.bins.length; i++) maxBin = Math.max(maxBin, s.bins[i])
        if (maxBin > 0) {
          ctx.beginPath()
          ctx.strokeStyle = 'rgba(255,209,102,0.75)'
          for (let i = 0; i < s.bins.length; i++) {
            const py = midY - screenHalfH + (i / s.bins.length) * screenHalfH * 2
            const px = screenX + 6 + (s.bins[i] / maxBin) * (w * 0.09)
            if (i === 0) ctx.moveTo(px, py)
            else ctx.lineTo(px, py)
          }
          ctx.stroke()
        }
      }

      // 条纹间距标注
      const spacingMm = fringeSpacingMm(s.lambda, s.slitD)
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.font = '11px sans-serif'
      ctx.fillText(tx(`理论条纹间距 ${spacingMm.toFixed(1)} mm`), screenX - 30, midY - screenHalfH - 12)

      // 缝距标注（黄色）
      ctx.strokeStyle = 'rgba(255,209,102,0.8)'
      ctx.beginPath()
      ctx.moveTo(barrierX - 12, slit1Y)
      ctx.lineTo(barrierX - 12, slit2Y)
      ctx.stroke()
      ctx.fillStyle = YELLOW
      ctx.fillText(tx(`d=${s.slitD}μm`), barrierX - 52, midY + 3)

      // 粒子计数
      if (s.mode === 'quantum') {
        ctx.fillStyle = 'rgba(255,255,255,0.65)'
        ctx.font = '12px sans-serif'
        ctx.fillText(tx(`已探测 ${s.count} 个粒子`), barrierX + 10, midY - screenHalfH - 32)
      }

      // 干涉消失警告
      if (s.observe) {
        ctx.fillStyle = RED
        ctx.font = '12px sans-serif'
        ctx.fillText(tx('被观测：干涉条纹消失，只剩两团单缝衍射'), barrierX + 10, midY - screenHalfH - 12)
      }

      raf = requestWorldFrame(frame)
    }
    raf = requestWorldFrame(frame)
    return () => cancelWorldFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const spacingMm = useMemo(() => fringeSpacingMm(lambda, slitD), [lambda, slitD])

  const guideSteps: Array<GuideStep> = [
    {
      title: tx('同一束光，为什么会有明暗条纹？'),
      body: tx('先让两列波从双缝出发：有的位置相长变亮，有的位置相消变暗。波的叠加在屏幕上形成明暗条纹。'),
      action: () => {
        setMode('wave')
        setPlaying(true)
        setObserve(false)
      },
      durationMs: 6000,
    },
    {
      title: '再换个玩法：逐个发射',
      body: '每个粒子只在屏上留一个点。几百个点累积起来，仍是同一组条纹。',
      action: () => {
        setMode('quantum')
        setPlaying(true)
        setObserve(false)
      },
      durationMs: 7000,
    },
    {
      title: '一偷看路径，条纹就没了',
      body: '打开「观测路径」后，路径信息存在，干涉会消失。',
      action: () => {
        setMode('quantum')
        setObserve(true)
        setPlaying(true)
      },
      durationMs: 6500,
    },
  ]

  return (
    <div className={`oss-experience dslit-experience${storyMode ? ' is-story' : ' is-free'}`}>
      <canvas ref={canvasRef} className="dslit-canvas" />

      {!storyMode && (
        <header className="dslit-question" data-experience-overlay="true">
          <h1>{tx("一颗一颗发射的粒子，也会和自己干涉吗？")}</h1>
          <p>{tx("把粒子逐个打向双缝，屏幕上会慢慢长出波纹——除非有人偷看它走了哪条缝。")}</p>
          <button type="button" className="dslit-why-btn" onClick={() => setWhyOpen(true)}>
            <Question weight="bold" /> {tx("为什么")}</button>
        </header>
      )}

      {!storyMode && (
      <aside className="dslit-readout" data-experience-overlay="true" data-freebar-clearance="true">
        <div className="dslit-readout-row">
          <small>{tx("条纹间距")}</small>
          <strong className="is-cyan">{tx(spacingMm.toFixed(1))} mm</strong>
        </div>
        <div className="dslit-readout-row">
          <small>{tx("已探测粒子")}</small>
          <strong className="is-cyan">{tx(particleCount)}</strong>
        </div>
        {observe && (
          <div className="dslit-critical">
            <strong>{tx("干涉消失")}</strong>
            <span>{tx("获取路径信息的代价：概率波坍缩为经典叠加。")}</span>
          </div>
        )}
      </aside>
      )}

      {!storyMode && (
        <Freebar
          className="dslit-freebar"
          mainClassName="dslit-freebar-main"
          ariaLabel={tx('参数')}
          primaryControlBudget={3}
          secondaryDefault="closed"
          secondary={(
            <div className="dslit-tray">
              <div className="dslit-chip-rail experience-freebar-chips" role="group" aria-label={tx('次级工具')}>
                <button
                  type="button"
                  className={`dslit-observe ${observe ? 'is-on' : ''}`}
                  onClick={() => {
                    controls.registerInteraction()
                    setObserve((o) => !o)
                  }}
                >
                  <Eye weight={observe ? 'fill' : 'regular'} />
                  {tx('观测')}
                </button>
                <button
                  type="button"
                  className="experience-freebar-reset"
                  aria-label={tx('重置')}
                  onClick={resetScreen}
                >
                  <ArrowCounterClockwise weight="bold" aria-hidden="true" />
                  <span>{tx('重置')}</span>
                </button>
                <button
                  type="button"
                  className="experience-freebar-story"
                  onClick={() => {
                    controls.registerInteraction()
                    enterStory()
                    replayGuide('double-slit')
                  }}
                  aria-label={tx('重播故事')}
                >
                  <FilmStrip weight="fill" aria-hidden="true" />
                  <span>{tx('故事')}</span>
                </button>
              </div>
              <div className="dslit-param-rail">
                <label className="dslit-freebar-field experience-freebar-field">
                  <span>{tx('波长')}</span>
                  <input type="range" min={400} max={680} step={5} value={lambda} onChange={(e) => { controls.registerInteraction(); setLambda(Number(e.target.value)) }} aria-label={tx('波长')} />
                  <b>{tx(lambda)} nm</b>
                </label>
                <label className="dslit-freebar-field experience-freebar-field">
                  <span>{tx('缝距')}</span>
                  <input type="range" min={10} max={60} step={1} value={slitD} onChange={(e) => { controls.registerInteraction(); setSlitD(Number(e.target.value)) }} aria-label={tx('缝距')} />
                  <b>{tx(slitD)} μm</b>
                </label>
              </div>
            </div>
          )}
        >
          <button
            type="button"
            className="experience-freebar-play"
            data-playing={playing ? 'true' : 'false'}
            onClick={() => setPlaying((p) => !p)}
            aria-label={tx(playing ? '暂停' : '播放')}
          >
            {playing ? <Pause weight="fill" aria-hidden="true" /> : <Play weight="fill" aria-hidden="true" />}
          </button>
          <div className="dslit-modes experience-freebar-seg" role="group" aria-label={tx('模式')}>
            <button type="button" className={mode === 'wave' ? 'is-active' : undefined} onClick={() => { controls.registerInteraction(); setMode('wave') }}>{tx('波')}</button>
            <button type="button" className={mode === 'quantum' ? 'is-active' : undefined} onClick={() => { controls.registerInteraction(); setMode('quantum') }}>{tx('粒子')}</button>
          </div>
        </Freebar>
      )}

      {whyOpen && (
        <div className="dslit-why" role="dialog" aria-label={tx("双缝干涉解释")} data-experience-overlay="true">
          <div className="dslit-why-card">
            <button type="button" className="dslit-why-close" onClick={() => setWhyOpen(false)} aria-label={tx("关闭")}>
              <X weight="bold" />
            </button>
            <h2>{tx("条纹从哪里来，又为什么会消失？")}</h2>
            <p>
              {tx("波同时穿过两条缝，到达屏幕上同一点时走过的路程不同。路程差是波长整数倍的地方")}<strong>{tx("相长叠加")}</strong>{tx("（亮纹），差半个波长的地方")}<strong>{tx("相消")}</strong>{tx("（暗纹）。 条纹间距")}<strong>Δx = λL/d</strong>{tx("：波长越长、缝距越小，条纹越疏——用滑块验证它。")}</p>
            <p>
              {tx("换成逐个发射的电子或光子，怪事发生了：每个粒子只在屏上留一个点，但成千上万个点累积起来，")}<span className="is-cyan">{tx("分布竟然和波的干涉条纹完全一致")}</span>{tx("。仿佛每个粒子同时走了两条路， 和「自己」发生了干涉——量子力学用")}<strong>{tx("概率幅的叠加")}</strong>{tx("描述这件事。")}</p>
            <p>
              {tx("更怪的在后面：一旦在缝旁放置探测器，确认粒子走了哪条缝，")}<span className="is-red">{tx("干涉条纹立刻消失")}</span>{tx("，只剩两团经典分布。不是仪器「碰坏了」粒子， 而是路径信息本身会摧毁量子叠加——这就是费曼口中「量子力学唯一的谜团」。")}</p>
            <small>{tx("模型：夫琅禾费远场近似，强度 I ∝ cos²(πdy/λL)·sinc²(πay/λL)；屏距 L = 1 m，缝宽 a = 5 μm。粒子命中位置按该分布拒绝采样。")}</small>
          </div>
        </div>
      )}

      <GuideTour
        worldId="double-slit"
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
        <GhostHint worldId="double-slit" gesture={{ type: 'tap', target: '.dslit-modes button:last-child', label: '切到逐个粒子' }} />
      )}
    </div>
  )
}
