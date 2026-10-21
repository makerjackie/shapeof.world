import { useEffect, useRef, useState } from 'react'
import { ArrowCounterClockwise, ArrowRight, FilmStrip, Pause, Play, Swap, Triangle } from '@phosphor-icons/react'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { useRegisterExperienceCapabilities } from '~/components/experiences/ExperienceCapabilities'
import { useExperienceI18n } from '~/i18n/experience'
import { useWorldReducedMotion } from '~/lib/world-motion'
import { subscribeWorldPlayback } from '~/lib/world-playback'
import type { LightSceneState } from './light-speed-scene'
import { createLightWebGLScene as createLightScene } from './light-speed-webgl'
import { clampBeta, lightClockLegGeometry, lorentzFactor, properTimeRate } from './light-speed-model'
import { chapters, chapterIndex, FILM_DURATION, POSTER_TIME, formatTime, narrativeScene, story, storyIndex } from './light-speed-story'
import './styles/LightSpeed.css'

type Mode = 'film' | 'experiment'
type Experiment = 'clock' | 'spacetime'
type Runtime = {
  mode: Mode
  position: number
  time: number
  playing: boolean
  beta: number
  frame: 'lab' | 'ship'
  experiment: Experiment
  orbit: number
  reduced: boolean
  immersive: boolean
  panelOpen: boolean
  geometry: boolean
  pace: number
}

type Translate = (text: string) => string
const distanceText = (value: number) => Number(value.toFixed(2)).toString()

function ClockGeometry({ beta, tx }: { beta: number; tx: Translate }) {
  const leg = lightClockLegGeometry(beta)
  const rounded = [leg.vertical, leg.horizontal, leg.hypotenuse].map(value => Number(distanceText(value)))
  const equality = Math.abs(rounded[0] ** 2 + rounded[1] ** 2 - rounded[2] ** 2) < .001 ? '=' : '≈'
  return <div className="ls-geometry-proof">
    <div className="ls-triangle-sum" aria-label={tx('光钟半程的勾股关系')}>
      <span className="ls-vertical">{distanceText(leg.vertical)}<sup>2</sup><small>{tx('镜距')}</small></span><i>+</i>
      <span className="ls-horizontal">{distanceText(leg.horizontal)}<sup>2</sup><small>{tx('镜子位移')}</small></span><i>{equality}</i>
      <span className="ls-diagonal">{distanceText(leg.hypotenuse)}<sup>2</sup><small>{tx('光路')}</small></span>
    </div>
    <div className="ls-geometry-speed"><span>{distanceText(leg.hypotenuse)} / {distanceText(leg.tLab)}</span><i>=</i><span>3 / 3</span><i>=</i><b>c</b></div>
    <p className="ls-proof-caption">{tx('两套坐标，距离除以时间相同')} · {tx('光秒 / 秒')}</p>
  </div>
}

function LightMeasurements({ beta, frame, tx }: { beta: number; frame: 'lab' | 'ship'; tx: Translate }) {
  const distance = lorentzFactor(beta) * (1 - beta)
  return <div className="ls-measurement-proof">
    <div className="ls-light-measures">
      <div data-current={frame === 'lab'}><small>{tx('实验室')}</small><b>1.00 / 1.00</b><span>{tx('光秒 / 秒')}</span></div>
      <div className="ls-warm" data-current={frame === 'ship'}><small>{tx('飞船')}</small><b>{distance.toFixed(2)} / {distance.toFixed(2)}</b><span>{tx('光秒 / 秒')}</span></div>
      <strong className="ls-invariant">= c</strong>
    </div>
  </div>
}

export function LightSpeed({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const reduced = useWorldReducedMotion()
  // Use the shell's recording mode for a reproducible, clean light-cone poster.
  const captureMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('capture') === '1'
  const initialTime = captureMode ? POSTER_TIME : 0
  const root = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const runtime = useRef<Runtime>({ mode: 'film', position: initialTime, time: initialTime, playing: !captureMode, beta: .6, frame: 'lab', experiment: 'clock', orbit: 0, reduced: false, immersive: false, panelOpen: false, geometry: false, pace: 1 })
  const [mode, setMode] = useState<Mode>('film')
  const [position, setPosition] = useState(initialTime)
  const [playing, setPlaying] = useState(!captureMode)
  const [beta, setBeta] = useState(.6)
  const [frame, setFrame] = useState<'lab' | 'ship'>('lab')
  const [experiment, setExperiment] = useState<Experiment>('clock')
  const [geometry, setGeometry] = useState(false)
  const [pace, setPace] = useState(1)
  const [renderError, setRenderError] = useState(false)
  const drawRef = useRef<(() => void) | null>(null)
  const contentBottom = useRef(0)
  const copyHidden = useRef(false)
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const txRef = useRef(tx)
  txRef.current = tx
  useRegisterExperienceCapabilities('light-speed', { supportsImmersive: true })

  const markInteraction = () => {
    if (!document.documentElement.hasAttribute('data-oneworld-ghost-active')) controls.registerInteraction()
  }
  const updatePlay = (value: boolean) => {
    runtime.current.playing = value
    setPlaying(value)
  }
  const seek = (value: number) => {
    markInteraction()
    const next = Math.max(0, Math.min(FILM_DURATION, value))
    runtime.current.position = next
    runtime.current.time = next
    setPosition(next)
    drawRef.current?.()
  }
  const replay = () => {
    markInteraction()
    Object.assign(runtime.current, { mode: 'film', position: 0, time: 0, orbit: 0, frame: 'lab', geometry: false })
    setGeometry(false)
    setMode('film')
    setFrame('lab')
    setPosition(0)
    updatePlay(true)
    drawRef.current?.()
  }
  const enterExperiment = () => {
    markInteraction()
    const s = runtime.current
    const target = chapterIndex(s.position) >= 2 ? 'spacetime' : 'clock'
    s.beta = mode === 'film' ? Math.abs(narrativeScene(s.position).beta) : s.beta
    if (s.beta < .1) s.beta = .6
    s.experiment = target
    s.mode = 'experiment'
    setBeta(s.beta)
    setExperiment(target)
    setMode('experiment')
    updatePlay(!s.reduced)
    drawRef.current?.()
  }
  const changeBeta = (value: number) => {
    markInteraction()
    const next = Math.max(0, clampBeta(value))
    runtime.current.beta = next
    setBeta(next)
    drawRef.current?.()
  }
  const chooseExperiment = (next: Experiment) => {
    markInteraction()
    runtime.current.experiment = next
    setExperiment(next)
    drawRef.current?.()
  }
  const toggleGeometry = () => {
    markInteraction()
    runtime.current.geometry = !runtime.current.geometry
    setGeometry(runtime.current.geometry)
    drawRef.current?.()
  }
  const switchFrame = () => {
    markInteraction()
    const next = runtime.current.frame === 'lab' ? 'ship' : 'lab'
    runtime.current.frame = next
    setFrame(next)
    drawRef.current?.()
  }
  const togglePlay = () => {
    if (mode === 'film' && runtime.current.position >= FILM_DURATION) replay()
    else {
      markInteraction()
      updatePlay(!runtime.current.playing)
    }
  }

  useEffect(() => {
    runtime.current.reduced = reduced
    if (reduced) updatePlay(false)
    drawRef.current?.()
  }, [reduced])
  useEffect(() => { drawRef.current?.() }, [tx])

  useEffect(() => {
    const element = canvas.current
    if (!element) return
    let scene: ReturnType<typeof createLightScene>
    try { scene = createLightScene(element) } catch (error) {
      setRenderError(true)
      console.error('Light-speed scene could not initialize', error)
      return
    }
    let raf = 0
    let last = performance.now()
    let lastUi = 0
    let visualChapter = 0
    let failed = false
    let needsDraw = true
    const container = element.closest('.experience-page')
    const syncShell = () => {
      runtime.current.immersive = container?.getAttribute('data-overlays-hidden') === 'true'
      runtime.current.panelOpen = container?.getAttribute('data-panel-open') === 'true'
      needsDraw = true
    }
    const shellObserver = new MutationObserver(syncShell)
    if (container) shellObserver.observe(container, { attributes: true, attributeFilter: ['data-overlays-hidden', 'data-panel-open'] })
    syncShell()
    const resize = () => {
      const rect = element.getBoundingClientRect()
      scene.resize(rect.width, rect.height, Math.min(window.devicePixelRatio || 1, 2))
      needsDraw = true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(element)
    resize()

    const draw = (dt: number, force = false) => {
      if (failed) return
      const s = runtime.current
      const film = narrativeScene(s.position)
      const targetChapter = s.mode === 'film' ? film.chapter : s.experiment === 'clock' ? 1 : 3
      // Seeking the film is deterministic. Experiment switches keep one continuous sculpture.
      visualChapter = s.mode === 'film' || s.reduced || force ? targetChapter : visualChapter + (targetChapter - visualChapter) * (1 - Math.exp(-dt * 5))
      const state: LightSceneState = {
        time: s.mode === 'film' ? film.sceneTime : s.time,
        chapter: visualChapter,
        beta: s.mode === 'film' ? film.beta : s.beta,
        frame: s.mode === 'film' ? film.frame : s.frame,
        wavelength: 520,
        refractiveIndex: s.mode === 'film' ? film.refractiveIndex : 1.5,
        orbit: s.orbit,
        reducedMotion: s.reduced,
        immersive: s.immersive || copyHidden.current,
        contentBottom: contentBottom.current,
        experiment: s.mode === 'experiment',
        showGeometry: s.mode === 'film' ? film.showGeometry : s.geometry && s.experiment === 'clock',
        showMeasurements: s.mode === 'film' ? film.showMeasurements : s.experiment === 'spacetime',
        lesson: s.mode === 'film' ? film.lesson : undefined,
        lessonTime: film.lessonTime,
        lessonProgress: film.lessonProgress,
        tx: txRef.current,
      }
      try { scene.draw(state) } catch (error) {
        failed = true
        setRenderError(true)
        console.error('Light-speed scene failed', error)
      }
    }
    drawRef.current = () => { needsDraw = true; draw(1 / 60) }
    const resetClock = () => { last = performance.now(); needsDraw = true }
    const unsubscribe = subscribeWorldPlayback({ onPause: resetClock, onResume: resetClock })
    document.addEventListener('visibilitychange', resetClock)
    const animate = (now: number) => {
      const s = runtime.current
      const elapsed = Math.max(0, (now - last) / 1000)
      const dt = Math.min(.1, elapsed)
      last = now
      const advancing = s.playing && !s.panelOpen && !document.hidden
      if (advancing) {
        if (s.mode === 'film') {
          s.position = Math.min(FILM_DURATION, s.position + elapsed * s.pace)
          s.time = s.position
          if (s.position >= FILM_DURATION) { s.playing = false; setPlaying(false) }
        } else s.time += elapsed
      }
      if (!document.hidden && (advancing || needsDraw || Math.abs(visualChapter - (s.experiment === 'clock' ? 1 : 3)) > .002 && s.mode === 'experiment')) {
        draw(dt)
        needsDraw = false
      }
      if (now - lastUi > 100) { setPosition(s.position); lastUi = now }
      raf = requestAnimationFrame(animate)
    }
    draw(0, true)
    raf = requestAnimationFrame(animate)
    return () => {
      cancelAnimationFrame(raf)
      drawRef.current = null
      observer.disconnect()
      shellObserver.disconnect()
      unsubscribe()
      document.removeEventListener('visibilitychange', resetClock)
      scene.dispose()
    }
  }, [])

  const beatIndex = storyIndex(position)
  const beat = story[beatIndex]
  const chapter = chapterIndex(position)
  const ratio = properTimeRate(beta)
  const gamma = lorentzFactor(beta)
  const filmState = narrativeScene(position)
  const filmGeometry = beat.proof === 'clock'
  const filmMeasurements = beat.proof === 'measurements'
  const ended = position >= FILM_DURATION

  useEffect(() => {
    const copy = root.current?.querySelector('.ls-copy')
    const stage = canvas.current
    if (!copy || !stage) return
    const measure = () => {
      contentBottom.current = copy.getBoundingClientRect().bottom - stage.getBoundingClientRect().top
      // Poster capture hides the overlay itself. Give that space to the scene too.
      copyHidden.current = copy instanceof HTMLElement && copy.style.opacity === '0'
      drawRef.current?.()
    }
    const observer = new ResizeObserver(measure)
    observer.observe(copy)
    const visibilityObserver = new MutationObserver(measure)
    visibilityObserver.observe(copy, { attributes: true, attributeFilter: ['style'] })
    measure()
    return () => { observer.disconnect(); visibilityObserver.disconnect() }
  }, [mode, beatIndex, tx])

  return <div ref={root} className="ls-world" data-capture={captureMode} data-mode={mode} data-playing={playing} data-position={position.toFixed(2)} data-chapter={chapter}>
    <canvas ref={canvas} className="ls-canvas" aria-label={tx('光波、光钟与光锥的连续场景。拖动画面可进入实验，改变相对速度。')}
      onPointerDown={event => {
        if (runtime.current.panelOpen) return
        drag.current = { x: event.clientX, y: event.clientY, moved: false }
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={event => {
        const gesture = drag.current
        if (!gesture) return
        const dx = event.clientX - gesture.x
        const dy = event.clientY - gesture.y
        if (!gesture.moved && Math.hypot(dx, dy) < 6) return
        if (!gesture.moved && runtime.current.mode === 'film') enterExperiment()
        gesture.moved = true
        runtime.current.orbit = Math.max(-.7, Math.min(.7, runtime.current.orbit + dx * .003))
        if (runtime.current.mode === 'experiment') changeBeta(runtime.current.beta - dy * .002)
        gesture.x = event.clientX
        gesture.y = event.clientY
        drawRef.current?.()
      }}
      onPointerUp={() => {
        if (drag.current && !drag.current.moved && mode === 'experiment') { markInteraction(); updatePlay(!runtime.current.playing) }
        drag.current = null
      }}
      onPointerCancel={() => { drag.current = null }}
    />
    {renderError && <div className="ls-error" role="alert">{tx('画面未能绘制，请重新载入。')}<button onClick={() => window.location.reload()}>{tx('重新载入')}</button></div>}

    {mode === 'film' ? <>
      <article className="ls-copy" data-experience-overlay="true" key={beatIndex}>
        <span className="ls-kicker">{String(chapter + 1).padStart(2, '0')} / {String(chapters.length).padStart(2, '0')} <i /> {tx(chapters[chapter].label)}</span>
        <h1>{tx(beat.title)}</h1>
        <p>{tx(beat.body)}</p>
        {filmGeometry ? <ClockGeometry beta={filmState.beta} tx={tx}/> : filmMeasurements ? <LightMeasurements beta={filmState.beta} frame="ship" tx={tx}/> : beat.equation && <div className="ls-equation">{tx(beat.equation)}</div>}
        {beat.math && <details className="ls-math" onToggle={event => {
          if (event.currentTarget.open) { markInteraction(); updatePlay(false) }
        }}><summary>{tx('也可以用公式表示')}</summary><p>{tx(beat.math)}</p></details>}
      </article>
      <p className="ls-footnote" data-experience-overlay="true">{tx(beat.detail)}</p>
      <nav className="ls-film" aria-label={tx('光速短片')} data-experience-overlay="true">
        <div className="ls-chapters" role="group" aria-label={tx('章节定位')}>
          {chapters.map((item, index) => <button key={item.start} aria-current={chapter === index ? 'step' : undefined} onClick={() => seek(item.start)}>{tx(item.label)}</button>)}
        </div>
        <div className="ls-transport">
          <button className="ls-transport-button" aria-label={tx(ended ? '重播短片' : playing ? '暂停短片' : '播放短片')} onClick={togglePlay}>
            {ended ? <ArrowCounterClockwise size={19} /> : playing ? <Pause size={19} weight="fill" /> : <Play size={19} weight="fill" />}
          </button>
          <button className="ls-pace" aria-label={tx(pace === 1 ? '放慢播放' : '恢复正常速度')} aria-pressed={pace !== 1} onClick={() => {
            markInteraction()
            const next = runtime.current.pace === 1 ? .75 : 1
            runtime.current.pace = next
            setPace(next)
          }}>{pace === 1 ? '1×' : '0.75×'}</button>
          <input className="ls-progress" type="range" min="0" max={FILM_DURATION} step=".1" value={position} onChange={event => seek(Number(event.target.value))} aria-label={tx('短片进度')} aria-valuetext={`${formatTime(position)} / ${formatTime(FILM_DURATION)}`} />
          <span className="ls-time">{formatTime(position)} <i>/ {formatTime(FILM_DURATION)}</i></span>
          <button className="ls-experiment-link" onClick={enterExperiment}>{tx('亲手试试')}<ArrowRight size={16} /></button>
        </div>
      </nav>
    </> : <>
      <article className="ls-copy ls-copy-lab" data-experience-overlay="true">
        <span className="ls-kicker">{tx('亲手比较')} <i /> {tx(frame === 'lab' ? '实验室参考系' : '飞船参考系')}</span>
        <h1>{tx(experiment === 'clock' ? `光速一样，
滴答不同。` : `同一束光，
两种测量。`)}</h1>
        <p>{tx(experiment === 'clock' ? geometry ? '展开从下镜到上镜的半程。镜距、镜子位移与斜光路组成直角三角形；光走得越远，用时就越长。' : '提高相对速度，运动钟的斜路变长、滴答变慢。换到另一艘船，每个人自己的钟都照常走。' : '比较同一次发射与接收。换参考系，光走过的距离和用去的时间一起变，二者相除仍是 c。')}</p>
        {experiment === 'clock' && geometry ? <ClockGeometry beta={beta} tx={tx}/> : experiment === 'clock' ? <div className="ls-comparison">
          <span className={frame === 'ship' ? 'ls-warm' : undefined}><b>1.00</b><small>{tx('本参考系的秒')}</small></span><span className="ls-comparison-sign">→</span>
          <span className={frame === 'lab' ? 'ls-warm' : undefined}><b>{ratio.toFixed(2)}</b><small>{tx('运动钟的秒')}</small></span>
        </div> : <LightMeasurements beta={beta} frame={frame} tx={tx}/>}
        {!(experiment === 'clock' && geometry) && <div className="ls-equation">{experiment === 'clock' ? 'Δτ / Δt = √(1 − v²/c²)' : tx('距离 / 时间 = 1 光秒/秒 = c')}</div>}
      </article>
      <p className="ls-footnote" data-experience-overlay="true" data-freebar-clearance="true">{tx('每个速度对应一个匀速实验')} · γ = {gamma.toFixed(2)} · {tx('测得光速始终为 c')}</p>
      <Freebar ariaLabel={tx('光速实验')} className="ls-freebar" primaryControlBudget={3} secondaryDefault="closed"
        secondary={<div className="ls-secondary">
          <button className="experience-freebar-play" aria-label={tx(playing ? '暂停实验' : '播放实验')} onClick={togglePlay}>{playing ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}</button>
          <button className="ls-switch-frame" onClick={switchFrame}><Swap size={17}/>{tx(frame === 'lab' ? '换到飞船' : '换到实验室')}</button>
          {experiment === 'clock' && <button className="ls-geometry-toggle" aria-pressed={geometry} onClick={toggleGeometry}><Triangle size={17}/><span>{tx('拆开光路')}</span></button>}
          <button className="experience-freebar-reset" aria-label={tx('重置实验')} onClick={() => { changeBeta(.6); runtime.current.orbit = 0; runtime.current.time = 0; drawRef.current?.() }}><ArrowCounterClockwise size={18}/><span>{tx('重置')}</span></button>
          <button className="experience-freebar-story" aria-label={tx('重播短片')} onClick={replay}><FilmStrip size={18}/><span>{tx('故事')}</span></button>
        </div>}>
        <div className="experience-freebar-seg" role="group" aria-label={tx('实验场景')}>
          <button aria-pressed={experiment === 'clock'} className={experiment === 'clock' ? 'is-active' : undefined} onClick={() => chooseExperiment('clock')}>{tx('光钟')}</button>
          <button aria-pressed={experiment === 'spacetime'} className={experiment === 'spacetime' ? 'is-active' : undefined} onClick={() => chooseExperiment('spacetime')}>{tx('时空')}</button>
        </div>
        <label className="ls-speed"><span>{tx('相对速度')} <b>{beta.toFixed(2)}c</b></span><input id="ls-beta" type="range" min="0" max=".98" step=".01" value={beta} onChange={event => changeBeta(Number(event.target.value))} aria-label={tx('相对速度')} /></label>
      </Freebar>
      {!reduced && <GhostHint worldId="light-speed" gesture={{ type: 'scrub', target: '#ls-beta', label: tx('提高速度，看光钟变慢') }} />}
    </>}
  </div>
}
