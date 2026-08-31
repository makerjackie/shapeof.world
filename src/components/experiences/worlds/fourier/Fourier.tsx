import './styles/Fourier.css'

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Pause, Play, ArrowCounterClockwise, Question, X, PencilLine, FilmStrip } from '@phosphor-icons/react'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { GuideTour, replayGuide, type GuideStep } from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import { useExperienceI18n } from '~/i18n/experience'

type Harmonic = { freq: number; amp: number; phase: number }
type WaveKind = 'square' | 'sawtooth' | 'triangle' | 'custom'

const MAX_TERMS = 32
const SAMPLE_COUNT = 256
const TAU = Math.PI * 2

const CYAN = '#4dd0e1'
const YELLOW = '#ffd166'
const PURPLE = '#b15cff'
const RED = '#ff6b6b'

/** 内置波形的解析傅里叶系数（基波周期 2π） */
function analyticHarmonics(kind: Exclude<WaveKind, 'custom'>, terms: number): Array<Harmonic> {
  const out: Array<Harmonic> = []
  for (let n = 1; out.length < terms && n <= 128; n++) {
    if (kind === 'square') {
      if (n % 2 === 0) continue
      out.push({ freq: n, amp: 4 / (Math.PI * n), phase: 0 })
    } else if (kind === 'sawtooth') {
      out.push({ freq: n, amp: (2 / (Math.PI * n)) * (n % 2 === 0 ? -1 : 1), phase: 0 })
    } else {
      // triangle：余弦级数，奇次项，±8/(π²n²)
      if (n % 2 === 0) continue
      const sign = ((n - 1) / 2) % 2 === 0 ? 1 : -1
      out.push({ freq: n, amp: (sign * 8) / (Math.PI * Math.PI * n * n), phase: Math.PI / 2 })
    }
  }
  return out
}

function targetValue(kind: Exclude<WaveKind, 'custom'>, x: number) {
  const p = ((x % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
  if (kind === 'square') return p < Math.PI ? 1 : -1
  if (kind === 'sawtooth') return p / Math.PI - 1
  // triangle
  return p < Math.PI ? (2 / Math.PI) * p - 1 : 3 - (2 / Math.PI) * p
}

/** 对手绘波形做实数 DFT */
function dftHarmonics(samples: Float32Array, terms: number): Array<Harmonic> {
  const n = samples.length
  let mean = 0
  for (let i = 0; i < n; i++) mean += samples[i]
  mean /= n
  const out: Array<Harmonic> = []
  for (let k = 1; k <= terms; k++) {
    let re = 0
    let im = 0
    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI * k * i) / n
      re += (samples[i] - mean) * Math.cos(angle)
      im -= (samples[i] - mean) * Math.sin(angle)
    }
    re = (re * 2) / n
    im = (im * 2) / n
    const amp = Math.hypot(re, im)
    if (amp > 1e-4) out.push({ freq: k, amp, phase: Math.atan2(im, re) })
  }
  return out
}

export function Fourier({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { storyMode, enterFree, enterStory } = useStoryFreeMode('fourier')
  const [terms, setTerms] = useState(3)
  const [kind, setKind] = useState<WaveKind>('square')
  const [playing, setPlaying] = useState(true)
  const [whyOpen, setWhyOpen] = useState(false)
  const [customSamples, setCustomSamples] = useState<Float32Array | null>(null)
  const [drawing, setDrawing] = useState(false)
  const [errorPct, setErrorPct] = useState(0)

  const stateRef = useRef({ terms, kind, customSamples, playing, phase: 0, lastNow: 0, errorPct: 0 })
  stateRef.current.terms = terms
  stateRef.current.kind = kind
  stateRef.current.customSamples = customSamples
  stateRef.current.playing = playing

  useEffect(() => {
    controls.completeOnboarding()
  }, [controls])

  // 当前谐波表
  const harmonics = useMemo(() => {
    if (kind === 'custom') {
      if (!customSamples) return []
      return dftHarmonics(customSamples, terms)
    }
    return analyticHarmonics(kind, terms)
  }, [kind, terms, customSamples])
  const harmonicsRef = useRef(harmonics)
  harmonicsRef.current = harmonics

  // 目标波形采样（用于误差与绘制）
  const targetSamples = useMemo(() => {
    const out = new Float32Array(SAMPLE_COUNT)
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      const x = (i / SAMPLE_COUNT) * Math.PI * 2
      out[i] = kind === 'custom' ? (customSamples ? customSamples[i] : 0) : targetValue(kind, x)
    }
    return out
  }, [kind, customSamples])
  const targetRef = useRef(targetSamples)
  targetRef.current = targetSamples

  // 拟合误差：纯函数，随谐波/目标即时计算（不依赖动画帧）
  const computedError = useMemo(() => {
    if (harmonics.length === 0) return 0
    let se = 0
    let ss = 0
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      const phase = (i / SAMPLE_COUNT) * Math.PI * 2
      let y = 0
      for (const hm of harmonics) y += hm.amp * Math.sin(hm.freq * phase + hm.phase)
      const diff = y - targetSamples[i]
      se += diff * diff
      ss += targetSamples[i] * targetSamples[i]
    }
    return ss > 1e-6 ? Math.sqrt(se / ss) * 100 : 0
  }, [harmonics, targetSamples])

  useEffect(() => {
    setErrorPct(computedError)
  }, [computedError])

  // 主渲染循环
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf = 0

    const frame = (now: number) => {
      const st = stateRef.current
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // 推进相位
      const dt = st.lastNow ? Math.min((now - st.lastNow) / 1000, 0.1) : 0
      st.lastNow = now
      if (st.playing) st.phase += dt * 0.9
      const cyclePhase = st.phase % TAU

      // 背景
      ctx.fillStyle = '#05070f'
      ctx.fillRect(0, 0, w, h)
      const grad = ctx.createRadialGradient(w * 0.26, h * 0.48, 10, w * 0.26, h * 0.48, h * 0.75)
      grad.addColorStop(0, 'rgba(177,92,255,0.07)')
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)

      const mobile = w < 720
      const cycX = mobile ? w * 0.5 : w * 0.23
      const cycY = mobile ? h * 0.28 : h * 0.46
      const baseR = mobile ? Math.min(w * 0.3, h * 0.13) : Math.min(w * 0.14, h * 0.16)
      const waveLeft = mobile ? w * 0.07 : w * 0.46
      const waveRight = w * 0.96
      const waveMidY = mobile ? h * 0.66 : h * 0.46 // 桌面端与圆链同一条水平基线
      const waveAmpPx = baseR // 振幅像素严格 1:1 —— 圆的高度就是波的高度
      const hs = harmonicsRef.current
      const target = targetRef.current

      // 级数合成值 f(phase)
      const synth = (phase: number) => {
        let y = 0
        for (const hm of hs) y += hm.amp * Math.sin(hm.freq * phase + hm.phase)
        return y
      }

      // 共享基线（圆与波的同一条水平参考线）
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'
      ctx.setLineDash([3, 6])
      ctx.beginPath()
      ctx.moveTo(cycX - baseR * 1.9, cycY)
      ctx.lineTo(waveRight, waveMidY)
      ctx.stroke()
      ctx.setLineDash([])

      // ===== 左：圆链（y 取数学向上，末端高度 = 合成值 × baseR） =====
      let cx = cycX
      let cy = cycY
      ctx.lineWidth = 1
      for (let i = 0; i < hs.length; i++) {
        const hm = hs[i]
        const r = hm.amp * baseR
        const angle = hm.freq * cyclePhase + hm.phase
        const nx = cx + r * Math.cos(angle)
        const ny = cy - r * Math.sin(angle)
        // 圆
        ctx.beginPath()
        ctx.strokeStyle = `rgba(177,92,255,${i === 0 ? 0.55 : 0.28})`
        ctx.arc(cx, cy, Math.abs(r), 0, TAU)
        ctx.stroke()
        // 半径臂
        ctx.beginPath()
        ctx.strokeStyle = i === hs.length - 1 ? YELLOW : 'rgba(255,255,255,0.5)'
        ctx.lineWidth = i === hs.length - 1 ? 1.8 : 1
        ctx.moveTo(cx, cy)
        ctx.lineTo(nx, ny)
        ctx.stroke()
        ctx.lineWidth = 1
        cx = nx
        cy = ny
      }
      // 末端光点
      ctx.beginPath()
      ctx.fillStyle = CYAN
      ctx.shadowColor = CYAN
      ctx.shadowBlur = 12
      ctx.arc(cx, cy, 4.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0

      // ===== 右：波形展开（前沿与圆链末端严格同高） =====
      const waveWidth = waveRight - waveLeft
      const frontX = waveLeft + waveWidth * 0.72
      const WINDOW = TAU * 1.4
      const pxPerRad = waveWidth / WINDOW

      // 目标波形（灰白虚线，全周期参考）
      if (!(st.kind === 'custom' && !st.customSamples)) {
        ctx.beginPath()
        ctx.strokeStyle = 'rgba(255,255,255,0.18)'
        ctx.setLineDash([4, 5])
        for (let i = 0; i <= SAMPLE_COUNT; i++) {
          const idx = i % SAMPLE_COUNT
          const px = waveLeft + (i / SAMPLE_COUNT) * waveWidth
          const py = waveMidY - target[idx] * waveAmpPx
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.stroke()
        ctx.setLineDash([])
      }

      // 当前波形的可见窗口（亮青，随相位持续向左流动）。
      // 每帧都按最新谐波重算，避免参数变化后把旧轨迹叠在新波形上。
      if (hs.length > 0) {
        ctx.beginPath()
        ctx.strokeStyle = CYAN
        ctx.lineWidth = 2.4
        ctx.shadowColor = 'rgba(77,208,225,0.65)'
        ctx.shadowBlur = 8
        const visibleSamples = Math.max(SAMPLE_COUNT, Math.ceil(frontX - waveLeft))
        for (let i = 0; i <= visibleSamples; i++) {
          const px = waveLeft + (i / visibleSamples) * (frontX - waveLeft)
          const phase = cyclePhase - (frontX - px) / pxPerRad
          const py = waveMidY - synth(phase) * waveAmpPx
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.stroke()
        ctx.shadowBlur = 0
        ctx.lineWidth = 1
      }

      // 水平连接线：圆链末端 → 波前沿（辅助参考线，两端实、中间淡出，避免误读为数据）
      if (hs.length > 0) {
        const fade = ctx.createLinearGradient(cx, 0, frontX, 0)
        fade.addColorStop(0, 'rgba(77,208,225,0.85)')
        fade.addColorStop(0.25, 'rgba(77,208,225,0.18)')
        fade.addColorStop(0.75, 'rgba(77,208,225,0.18)')
        fade.addColorStop(1, 'rgba(77,208,225,0.85)')
        ctx.strokeStyle = fade
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(frontX, cy)
        ctx.stroke()
        ctx.lineWidth = 1
        // 前沿光点（与末端同高）
        ctx.beginPath()
        ctx.fillStyle = CYAN
        ctx.shadowColor = CYAN
        ctx.shadowBlur = 12
        ctx.arc(frontX, cy, 4.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      }

      // 吉布斯过冲标注（有跳变且项数较高时）
      const isDiscontinuous = st.kind === 'square' || st.kind === 'sawtooth'
      if (isDiscontinuous && st.terms >= 8) {
        const jumpPhases = st.kind === 'square' ? [0, Math.PI] : [0]
        ctx.fillStyle = RED
        ctx.font = '10px sans-serif'
        for (const jp of jumpPhases) {
          const px = waveLeft + ((jp + 0.06) / (Math.PI * 2)) * waveWidth
          const over = waveMidY - 1.09 * waveAmpPx * (st.kind === 'square' ? 1 : 0.98)
          ctx.beginPath()
          ctx.arc(px, over, 3, 0, Math.PI * 2)
          ctx.fill()
        }
        const labelPx = waveLeft + 0.04 * waveWidth
        ctx.fillText(tx('吉布斯过冲 ≈9%（再多项也不会消失）'), labelPx, waveMidY - 1.18 * waveAmpPx)
      }

      // 高度标注：两侧同一条基线的含义
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.font = '11px sans-serif'
      ctx.fillText(tx('圆链末端的高度'), cycX - baseR * 1.6, cycY + baseR * 1.75 + 16)
      ctx.fillText(tx('= 波形前沿的高度'), waveLeft + 10, waveMidY + (mobile ? 90 : baseR * 1.75 + 16))

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 手绘波形
  const drawingRef = useRef<Float32Array | null>(null)
  const onDrawStart = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (kind !== 'custom') return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const w = rect.width
    const h = rect.height
    const mobile = w < 720
    const waveLeft = mobile ? w * 0.07 : w * 0.5
    const waveRight = w * 0.95
    const waveMidY = mobile ? h * 0.68 : h * 0.46
    const waveAmpPx = Math.min(h * 0.2, 130)
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    if (x < waveLeft - 20) return // 只响应波形区
    controls.registerInteraction()
    setDrawing(true)
    const samples = new Float32Array(SAMPLE_COUNT)
    drawingRef.current = samples
    const put = (px: number, py: number) => {
      const t = Math.min(1, Math.max(0, (px - waveLeft) / (waveRight - waveLeft)))
      const idx = Math.round(t * (SAMPLE_COUNT - 1))
      samples[idx] = Math.max(-1.2, Math.min(1.2, (waveMidY - py) / waveAmpPx))
    }
    put(x, y)
    const move = (ev: PointerEvent) => {
      put(ev.clientX - rect.left, ev.clientY - rect.top)
      setCustomSamples(new Float32Array(samples))
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      // 首尾闭合：未画的点做线性插值
      let lastIdx = -1
      for (let i = 0; i < SAMPLE_COUNT; i++) if (samples[i] !== 0) { lastIdx = i; break }
      // 简单前向填充空缺
      let lastVal = samples[0]
      for (let i = 0; i < SAMPLE_COUNT; i++) {
        if (samples[i] === 0) samples[i] = lastVal
        else lastVal = samples[i]
      }
      setCustomSamples(new Float32Array(samples))
      drawingRef.current = null
      setDrawing(false)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const waveButtons: Array<{ id: WaveKind; label: string }> = [
    { id: 'square', label: '方波' },
    { id: 'sawtooth', label: '锯齿波' },
    { id: 'triangle', label: '三角波' },
    { id: 'custom', label: '手绘' },
  ]

  const guideSteps: Array<GuideStep> = [
    {
      title: '一个圆，只能画出正弦',
      body: '左边的圆链首尾相接，末端的光点描出右边的波。现在只有 1 个圆在转，所以波形是一条正弦。',
      action: () => {
        setKind('square')
        setTerms(1)
        setPlaying(true)
      },
    },
    {
      title: '加圆，长出棱角',
      body: '拖动「谐波项数」加到 12 左右——看方波的平顶和棱角怎样从一堆圆里长出来。',

    },
    {
      title: '换一种波形',
      body: '锯齿波、三角波都可以——或者点「手绘」，直接画一条你自己的曲线让它现场分解。',

    },
    {
      title: '误差与过冲',
      body: '项数越多误差越小；但跳变处约 9% 的红色过冲（吉布斯现象）永远不会消失。点「为什么」看完整解释。',
      action: () => {
        setKind('square')
        setTerms(24)
      },
    },
  ]

  return (
    <div className={`oss-experience fourier-experience${storyMode ? ' is-story' : ' is-free'}`}>
      <canvas
        ref={canvasRef}
        className="fourier-canvas"
        style={{ touchAction: kind === 'custom' ? 'none' : 'pan-y', cursor: kind === 'custom' ? 'crosshair' : 'default' }}
        onPointerDown={onDrawStart}
      />

      {!storyMode && (
        <header className="fourier-question" data-experience-overlay="true">
          <h1>{tx("一串旋转的圆，能画出任何曲线？")}</h1>
          <p>{tx("每个圆是一个频率不同的正弦分量，首尾相接，末端就能描出方波、锯齿——甚至你随手画的线。")}</p>
          <button type="button" className="fourier-why-btn" onClick={() => setWhyOpen(true)}>
            <Question weight="bold" /> {tx("为什么")}</button>
        </header>
      )}

      <aside className="fourier-readout" data-experience-overlay="true">
        <div className="fourier-readout-row">
          <small>{tx("谐波项数")}</small>
          <strong className="is-yellow">{tx(terms)}</strong>
        </div>
        <div className="fourier-readout-row">
          <small>{tx("拟合误差")}</small>
          <strong className="is-cyan">{tx(errorPct.toFixed(1))}%</strong>
        </div>
        <div className="fourier-error-bar">
          <div style={{ width: `${Math.min(100, errorPct)}%` }} />
        </div>
        {errorPct > 0 && errorPct < 5 && (
          <div className="fourier-success">
            {tx("误差低于 5%，肉眼几乎分不出差别")}
          </div>
        )}
      </aside>

      {kind === 'custom' && !customSamples && (
        <div className="fourier-draw-hint" data-experience-overlay="true">
          <PencilLine weight="bold" />
          <span>{tx("在右侧波形区按住拖动，随手画一条曲线")}</span>
        </div>
      )}

      {!storyMode && (
        <Freebar
          className="fourier-freebar"
          mainClassName="fourier-freebar-main"
          ariaLabel={tx('参数')}
          primaryControlBudget={5}
          secondaryDefault="auto"
          secondary={(
            <div className="fourier-tray">
              <div className="fourier-chip-rail experience-freebar-chips" role="group" aria-label={tx('次级工具')}>
                <button
                  type="button"
                  className="experience-freebar-reset"
                  aria-label={tx('重置')}
                  onClick={() => {
                    controls.registerInteraction()
                    setTerms(3)
                    setKind('square')
                    setCustomSamples(null)
                    setPlaying(true)
                  }}
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
                    replayGuide('fourier')
                  }}
                  aria-label={tx('重播故事')}
                >
                  <FilmStrip weight="fill" aria-hidden="true" />
                  <span>{tx('故事')}</span>
                </button>
              </div>
              <div className="experience-freebar-field fourier-param-terms">
                <div>
                  <span>{tx('谐波项数')}</span>
                  <strong>{tx(terms)}</strong>
                </div>
                <input
                  type="range"
                  min={1}
                  max={MAX_TERMS}
                  step={1}
                  value={terms}
                  onChange={(e) => {
                    controls.registerInteraction()
                    setTerms(Number(e.target.value))
                  }}
                  aria-label={tx('谐波项数')}
                />
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

          <div className="fourier-waves experience-freebar-chips experience-freebar-seg" role="group" aria-label={tx('波形')}>
            {waveButtons.map((b) => (
              <button
                key={b.id}
                type="button"
                className={b.id === kind ? 'is-active' : undefined}
                onClick={() => {
                  controls.registerInteraction()
                  setKind(b.id)
                }}
              >
                {tx(b.label === '锯齿波' ? '锯齿' : b.label === '三角波' ? '三角' : b.label)}
              </button>
            ))}
          </div>
        </Freebar>
      )}

      {whyOpen && (
        <div className="fourier-why" role="dialog" aria-label={tx("傅里叶级数解释")} data-experience-overlay="true">
          <div className="fourier-why-card">
            <button type="button" className="fourier-why-close" onClick={() => setWhyOpen(false)} aria-label={tx("关闭")}>
              <X weight="bold" />
            </button>
            <h2>{tx("圆为什么会画画？")}</h2>
            <p>
              {tx("一个匀速转动的圆，它的末端在纵轴上的投影就是正弦波。把第 2 个圆架在第 1 个圆的末端、转速加倍， 第 3 个再架上去、转速 3 倍……末端点的轨迹就是一串正弦波的叠加：")}<strong> f(x) ≈ Σ Aₖ·sin(kx + φₖ)</strong>。
            </p>
            <p>
              {tx("傅里叶在 1822 年指出：")}<strong>{tx("任何周期曲线都能唯一分解成这样的正弦分量")}</strong>（
              <span className="is-purple">{tx("紫色圆")}</span>{tx("），每个分量的频率是基波的整数倍，幅度 Aₖ 由曲线形状决定。 方波只含奇次谐波、幅度按 1/k 衰减——所以前几个圆就搭出了轮廓，后面的圆只负责修棱角。")}</p>
            <p>
              {tx("项数再多，跳变处仍会出现约 9% 的过冲（")}<span className="is-red">{tx("吉布斯现象")}</span>{tx("）： 它不会消失，只会被挤到越来越窄的区间里。这不是画错了，而是无穷级数在不连续点的本性。")}</p>
            <small>{tx("假设：周期信号满足 Dirichlet 条件；手绘曲线经 256 点 DFT 分解。吉布斯过冲幅度约为跳变量的 8.95%。")}</small>
          </div>
        </div>
      )}

      <GuideTour
        worldId="fourier"
        steps={guideSteps}
        defaultOpen={storyMode}
        placement="stage"
        stagePlan={[
          { position: 'top-left', mobilePosition: 'top-center', motion: 'rise', width: 'normal', treatment: 'editorial', cue: 'right' },
          { position: 'bottom-left', mobilePosition: 'bottom-center', motion: 'drift-right', width: 'normal', treatment: 'caption', cue: 'right' },
          { position: 'top-right', mobilePosition: 'top-center', motion: 'fade', width: 'normal', treatment: 'annotation', cue: 'left' },
          { position: 'bottom-right', mobilePosition: 'bottom-center', motion: 'scale', width: 'wide', treatment: 'monumental', cue: 'up' },
        ]}
        onExit={enterFree}
      />
      {!storyMode && (
        <GhostHint worldId="fourier" gesture={{ type: 'scrub', target: '.fourier-param-terms input', label: '拨动谐波项数' }} />
      )}
    </div>
  )
}
