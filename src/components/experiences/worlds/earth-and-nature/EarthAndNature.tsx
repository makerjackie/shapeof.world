import './styles/EarthAndNature.css'

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { useI18n } from '~/i18n'
import { useExperienceI18n } from '~/i18n/experience'
import { worldPath } from '~/lib/world-urls'
import { observeWorldReducedMotion, worldPrefersReducedMotion } from '~/lib/world-motion'

import {
  GRID,
  MAX_UPLIFT_M_PER_YR,
  RAIN_MAX,
  RAIN_MIN,
  createLandscape,
  maxHeight,
  paintHardRock,
  pressUplift,
  step,
  type Landscape,
} from './landscape-model'
import { LandscapeScene } from './landscape-scene'

/** 时间比例：按住 1 秒 = 20 万年。 */
const YEARS_PER_SECOND = 200_000
/** 一帧最多前进的年数，掉帧时不让一步跨太大。 */
const MAX_STEP_YEARS = 8_000
/** 手掌的半径（格子）：约 9 公里。 */
const PALM_CELLS = 22
const ROCK_BRUSH_CELLS = 2.6
/** 推够这么久（模拟年），河网和“山不再长高”都已经看得见，进入“看”。 */
const SEE_AFTER_UPLIFT_YEARS = 1_300_000
/** 泰山主峰海拔（米），拿来比山高。 */
const MOUNT_TAI_M = 1545
/** 北京市面积（平方米），拿来比冲走的岩石。 */
const BEIJING_M2 = 16_410e6
const HISTORY_SAMPLES = 160
const NEXT_WORLD_ID = 'earth-spin-orbit'

type Beat = 'guess' | 'do' | 'see' | 'know' | 'lab'
type Guess = 'flat' | 'branches' | 'lake'
type Tool = 'uplift' | 'rock'

const BEAT_ORDER: Array<Beat> = ['guess', 'do', 'see', 'know']

/** 海报取景（?capture=1）：直接给一条已经被雨刻过的山脉，不显示界面。 */
function grownRange(): Landscape {
  const landscape = createLandscape()
  const from = { x: GRID * 0.36, y: GRID * 0.6 }
  const to = { x: GRID * 0.66, y: GRID * 0.42 }
  for (let years = 0; years < 1_500_000; years += 4000) {
    for (let k = 0; k <= 12; k += 1) {
      const t = k / 12
      pressUplift(landscape, from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, PALM_CELLS * 0.8, 0.6)
    }
    step(landscape, 4000)
  }
  return landscape
}

function isCaptureMode(): boolean {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('capture') === '1'
}

type Readout = {
  years: number
  summit: number
  erodedM3: number
  history: Array<number>
}

export function EarthAndNature({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const { locale } = useI18n()
  const en = locale === 'en'

  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)
  const hintRef = useRef<HTMLDivElement>(null)
  const handRef = useRef<HTMLDivElement>(null)

  const [beat, setBeat] = useState<Beat>('guess')
  const [guess, setGuess] = useState<Guess | null>(null)
  const [tool, setTool] = useState<Tool>('uplift')
  const [rain, setRain] = useState(1)
  const [paused, setPaused] = useState(false)
  const [pressing, setPressing] = useState(false)
  const [released, setReleased] = useState(false)
  const [readout, setReadout] = useState<Readout>({ years: 0, summit: 0, erodedM3: 0, history: [] })
  const [webglFailed, setWebglFailed] = useState(false)

  const [capture] = useState(isCaptureMode)
  const [initialLandscape] = useState(() => (capture ? grownRange() : createLandscape()))
  const landscapeRef = useRef<Landscape>(initialLandscape)
  const live = useRef({
    beat: 'guess' as Beat,
    tool: 'uplift' as Tool,
    rain: 1,
    paused: false,
    press: null as { x: number; y: number } | null,
    keyPress: false,
    upliftYears: 0,
    history: [] as Array<number>,
    /** 上一次给山顶曲线取样时的模拟年份。 */
    lastSample: 0,
    interacted: false,
    finished: false,
    capture,
  })

  useEffect(() => {
    live.current.beat = beat
    live.current.tool = tool
    live.current.rain = rain
    live.current.paused = paused
  }, [beat, tool, rain, paused])

  const markInteraction = useCallback(() => {
    if (live.current.interacted) return
    live.current.interacted = true
    controls.registerInteraction()
  }, [controls])

  // 场景和动画循环：模拟一直在跑，雨一直在下。
  useEffect(() => {
    const canvas = canvasRef.current
    const root = rootRef.current
    if (!canvas || !root) return
    let scene: LandscapeScene
    try {
      scene = new LandscapeScene(canvas, GRID)
    } catch {
      setWebglFailed(true)
      return
    }
    let reducedMotion = worldPrefersReducedMotion()
    const stopObserving = observeWorldReducedMotion(() => {
      reducedMotion = worldPrefersReducedMotion()
    })

    const resize = () => scene.resize(root.clientWidth, root.clientHeight)
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(root)

    let frameId = 0
    let last = performance.now()
    let lastReadout = 0
    let glow = 0
    const tick = (now: number) => {
      // rAF 的时间戳可能比 performance.now() 稍早，第一帧会是负数。
      const seconds = Math.max(0, Math.min(0.05, (now - last) / 1000))
      last = now
      const state = live.current
      const landscape = landscapeRef.current

      let pushing = false
      const target = state.press
        ? scene.pick(state.press.x, state.press.y)
        : state.keyPress
          ? { gx: (GRID - 1) / 2, gy: (GRID - 1) / 2 }
          : null
      if (target && state.beat !== 'guess') {
        if (state.tool === 'rock' && state.beat === 'lab') paintHardRock(landscape, target.gx, target.gy, ROCK_BRUSH_CELLS)
        else {
          pressUplift(landscape, target.gx, target.gy, PALM_CELLS)
          pushing = true
        }
      }

      // 猜的时候地还没被动过；读结论时停住，好截图。这两拍只下雨，不推进时间。
      if (!state.paused && !state.capture && state.beat !== 'guess' && state.beat !== 'know') {
        const years = Math.min(MAX_STEP_YEARS, YEARS_PER_SECOND * seconds)
        step(landscape, years, state.rain)
        if (pushing) state.upliftYears += years
        if (landscape.years - state.lastSample >= 20_000) {
          state.lastSample = landscape.years
          state.history.push(maxHeight(landscape))
          if (state.history.length > HISTORY_SAMPLES) state.history.shift()
        }
      }

      if (state.beat === 'do' && state.upliftYears >= SEE_AFTER_UPLIFT_YEARS) {
        state.beat = 'see'
        setBeat('see')
      }

      const wantGlow = state.capture || state.beat === 'see' || state.beat === 'know' ? 1 : 0
      glow += (wantGlow - glow) * Math.min(1, seconds * 3)

      const card = cardRef.current
      const top = topRef.current
      scene.render(landscape, {
        riverGlow: glow,
        rain: state.rain,
        bottomInset: card ? card.offsetHeight + 24 : 220,
        topInset: top ? top.offsetTop + top.offsetHeight : 140,
        reducedMotion,
      }, seconds)

      // “按住这里”：贴在地块中心，没按的时候才出现。
      const hint = hintRef.current
      if (hint) {
        const show = state.beat === 'do' && !state.press && !state.keyPress
        hint.hidden = !show
        if (show) {
          const centre = (GRID - 1) / 2
          const at = scene.project(centre, centre, landscape.height[Math.round(centre) * GRID + Math.round(centre)])
          hint.style.transform = `translate(${at.x}px, ${at.y}px)`
        }
      }
      const hand = handRef.current
      if (hand) {
        hand.hidden = !state.press
        if (state.press) hand.style.transform = `translate(${state.press.x}px, ${state.press.y}px)`
      }

      if (now - lastReadout > 180) {
        lastReadout = now
        setReadout({
          years: landscape.years,
          summit: maxHeight(landscape),
          erodedM3: landscape.erodedM3,
          history: state.history.slice(),
        })
      }
      frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frameId)
      observer.disconnect()
      stopObserving()
      scene.dispose()
    }
  }, [])

  // 进入“懂”时告诉外壳：这个世界已经走完。
  useEffect(() => {
    if ((beat === 'know' || beat === 'lab') && !live.current.finished) {
      live.current.finished = true
      controls.finish()
    }
  }, [beat, controls])

  const pointerPosition = (event: ReactPointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    return rect ? { x: event.clientX - rect.left, y: event.clientY - rect.top } : null
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (live.current.beat === 'guess') return
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // 合成事件或已经结束的指针没法捕获，按下照样生效。
    }
    live.current.press = pointerPosition(event)
    setReleased(false)
    setPressing(true)
    markInteraction()
  }
  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!live.current.press) return
    live.current.press = pointerPosition(event)
  }
  const onPointerUp = () => {
    if (!live.current.press) return
    live.current.press = null
    setReleased(true)
    setPressing(false)
  }

  // 键盘：聚焦画布后按住空格，等于按住地块中心。
  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (event.key !== ' ' || live.current.beat === 'guess') return
    event.preventDefault()
    live.current.keyPress = true
    setPressing(true)
    markInteraction()
  }
  const onKeyUp = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (event.key !== ' ') return
    live.current.keyPress = false
    setReleased(true)
    setPressing(false)
  }

  const choose = (value: Guess | null) => {
    setGuess(value)
    setBeat('do')
    markInteraction()
  }

  const restart = () => {
    landscapeRef.current = createLandscape()
    live.current.history = []
    live.current.lastSample = 0
    live.current.upliftYears = 0
  }

  const replayStory = () => {
    restart()
    setGuess(null)
    setTool('uplift')
    setRain(1)
    setPaused(false)
    setBeat('guess')
  }

  const formatYears = (years: number) => {
    if (en) {
      if (years < 1_000_000) return `${Math.round(years / 1000).toLocaleString('en')} thousand years`
      return `${(years / 1_000_000).toFixed(1)} million years`
    }
    if (years < 100_000_000) return `${Math.round(years / 10_000).toLocaleString('zh-CN')} 万年`
    return `${(years / 100_000_000).toFixed(2)} 亿年`
  }
  const formatMetres = (metres: number) => `${Math.round(metres).toLocaleString(en ? 'en' : 'zh-CN')} m`
  const taiRatio = (readout.summit / MOUNT_TAI_M).toFixed(1)
  const beijingMetres = Math.round(readout.erodedM3 / BEIJING_M2)
  const metresPerSecond = Math.round(MAX_UPLIFT_M_PER_YR * YEARS_PER_SECOND)

  const guesses: Array<{ id: Guess; text: string }> = [
    { id: 'flat', text: tx('被雨慢慢冲成一块平地') },
    { id: 'branches', text: tx('被刻出一道道像树枝一样分叉的山谷') },
    { id: 'lake', text: tx('雨水积在山上，变成一个大湖') },
  ]
  const myGuess = guesses.find((item) => item.id === guess)
  const beatIndex = beat === 'lab' ? BEAT_ORDER.length : BEAT_ORDER.indexOf(beat) + 1

  const sparkline = (() => {
    const values = readout.history
    if (values.length < 2) return null
    const top = Math.max(500, ...values) * 1.1
    const points = values
      .map((value, index) => `${((index / (HISTORY_SAMPLES - 1)) * 100).toFixed(1)},${(30 - (value / top) * 28).toFixed(1)}`)
      .join(' ')
    return (
      <svg className="ean-spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
        <polyline points={points} />
      </svg>
    )
  })()

  const stats = (
    <div className="ean-stats" aria-live="off">
      <div>
        <small>{tx('已过去')}</small>
        <strong>{formatYears(readout.years)}</strong>
      </div>
      <div>
        <small>{tx('最高峰')}</small>
        <strong>{formatMetres(readout.summit)}</strong>
        <em>≈ {taiRatio} {tx('座泰山')}</em>
      </div>
      <div className="ean-stats-chart">
        <small>{tx('山顶高度的变化')}</small>
        {sparkline}
      </div>
    </div>
  )

  return (
    <div ref={rootRef} className={`oss-experience ean-experience is-${beat}${pressing ? ' is-pressing' : ''}${capture ? ' is-capture' : ''}`}>
      <canvas
        ref={canvasRef}
        className="ean-canvas"
        tabIndex={0}
        aria-label={tx('一块正在下雨的地。按住地面把它推高；聚焦后也可以按住空格键。')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
      />
      {webglFailed && <p className="ean-fallback">{tx('这台设备没能启动三维画面。换一个浏览器，或者打开硬件加速再试。')}</p>}

      <div ref={hintRef} className="ean-hint" hidden aria-hidden="true">
        <span className="ean-hint-ring" />
        <span className="ean-hint-text">{tx('按住这里，把地推高')}</span>
      </div>
      <div ref={handRef} className="ean-hand" hidden aria-hidden="true">
        <span className="ean-hand-ring" />
        <span className="ean-hand-text">
          {tool === 'rock' && beat === 'lab' ? tx('你在画硬岩') : tx('你的手：把地往上推')}
        </span>
      </div>

      <div ref={topRef} className="ean-top">
        <ol className="ean-beats" aria-label={tx('五步')}>
          {[tx('问'), tx('猜'), tx('做'), tx('看'), tx('懂')].map((label, index) => (
            <li key={label} className={index === beatIndex ? 'is-on' : index < beatIndex ? 'is-done' : ''}>{label}</li>
          ))}
        </ol>
        <h1>{tx('把一块地推成山，再下一百万年雨，它会变成什么样？')}</h1>
        <p className="ean-sub">
          {beat === 'lab'
            ? tool === 'rock'
              ? tx('在河谷上画一道硬岩，看河流怎样对付它。')
              : tx('改变降雨，再推一座山，比较山能长多高。')
            : tx('雨一直在下。地块四周是海。')}
        </p>
      </div>

      <div ref={cardRef} className="ean-card" aria-live="polite">
        {beat === 'guess' && (
          <>
            <p className="ean-q">{tx('先猜一下：你一直往上推，雨一直往下冲，最后会是什么样？')}</p>
            <div className="ean-options">
              {guesses.map((item) => (
                <button key={item.id} type="button" className="ean-option" onClick={() => choose(item.id)}>
                  {item.text}
                </button>
              ))}
            </div>
            <button type="button" className="ean-skip" onClick={() => choose(null)}>{tx('不猜，直接玩')}</button>
          </>
        )}

        {beat === 'do' && (
          <>
            <p>
              <span className="ean-accent">{tx('按住地面不放')}</span>
              {tx('，把地往上推。手指可以拖动。')}
            </p>
            {stats}
            <p className="ean-note">
              {tx('按住 1 秒 = 20 万年，约推高')} {metresPerSecond} {tx('米。人类有文字的五千年，在这里只有 0.025 秒。')}
            </p>
            {!pressing && released && (
              <p className="ean-note ean-accent">{tx('继续按住，山还没长成。')}</p>
            )}
          </>
        )}

        {beat === 'see' && (
          <>
            {myGuess && (
              <p className="ean-mine">
                <span className={`ean-verdict ${guess === 'branches' ? 'is-right' : 'is-miss'}`}>
                  {guess === 'branches' ? tx('猜对了') : tx('和你猜的不一样')}
                </span>
                {' · '}{tx('你猜：')}{myGuess.text}
              </p>
            )}
            <p>{tx('没人画这些河。雨水往低处流，汇得越多冲得越狠，自己刻出了一道道山谷。')}</p>
            <p>{tx('你一直在推，山也没有无限长高：长到某个高度，雨水削掉的正好等于你推起来的。')}</p>
            {stats}
            <div className="ean-row">
              <button type="button" className="ean-primary" onClick={() => setBeat('know')}>{tx('所以，原来如此')}</button>
            </div>
          </>
        )}

        {beat === 'know' && (
          <>
            <p className="ean-big">{tx('河谷不是谁画上去的：雨水往低处流，越汇越多、越冲越深，自己在山上刻出了树枝的形状。')}</p>
            <p className="ean-source">
              {tx('河流下切的快慢 ∝ 汇水面积的平方根 × 坡度（河流功率模型，Whipple & Tucker 1999）；数值解法 Braun & Willett 2013。地块为程序生成，时间和高度按真实量级取值。')}
            </p>
            <a className="ean-next" href={worldPath(NEXT_WORLD_ID, en ? 'en' : 'zh')}>
              <small>{tx('下一个问题')}</small>
              <span>{tx('同一个瞬间，地球上的不同地方正在经历什么？')}</span>
            </a>
            <div className="ean-row">
              <button type="button" className="ean-ghost" onClick={() => setBeat('lab')}>{tx('打开实验室：改降雨、画硬岩')}</button>
            </div>
          </>
        )}

        {beat === 'lab' && (
          <>
            <div className="ean-tools" role="group" aria-label={tx('手指的作用')}>
              <button type="button" aria-pressed={tool === 'uplift'} onClick={() => setTool('uplift')}>{tx('推高地面')}</button>
              <button type="button" aria-pressed={tool === 'rock'} onClick={() => setTool('rock')}>{tx('画一道硬岩')}</button>
            </div>
            <label className="ean-slider">
              <span>{tx('降雨')}</span>
              <input
                type="range"
                min={RAIN_MIN}
                max={RAIN_MAX}
                step={0.05}
                value={rain}
                onChange={(event) => setRain(Number(event.target.value))}
              />
              <output>
                {rain < 0.6 ? tx('干旱') : rain < 1.4 ? tx('普通') : rain < 2.2 ? tx('多雨') : tx('季风')} · ×{rain.toFixed(1)}
              </output>
            </label>
            {stats}
            <p className="ean-note">
              {tx('冲进海里的岩石，已经够把整个北京市铺高')} {beijingMetres.toLocaleString(en ? 'en' : 'zh-CN')} {tx('米。')}
            </p>
            <div className="ean-row">
              <button type="button" className="ean-ghost" onClick={() => setPaused((value) => !value)}>
                {paused ? tx('继续') : tx('暂停')}
              </button>
              <button type="button" className="ean-ghost" onClick={restart}>{tx('换一块新地')}</button>
              <button type="button" className="ean-skip" onClick={replayStory}>{tx('从头再走一遍')}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
