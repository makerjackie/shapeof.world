import './styles/BlackHoleFlyby.css'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FilmStrip, Pause, Play, SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar, FreebarTabs } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import {
  GuideTour,
  replayGuide,
  type GuideStep,
} from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import { useExperienceI18n } from '~/i18n/experience'

import { createFlybyAudio, type FlybyAudio } from './black-hole-flyby-audio'

type OrbitState = 'stopped' | 'playing' | 'paused'
type JourneyPhase = 'approach' | 'periapsis' | 'departure'
type FlybyToolTab = 'optics' | 'camera'

type BlackHoleStats = {
  radiusKm: number
  distanceKm: number
  speedC: number
  timeDilation: number
  localTime: number
  earthTime: number
  gForceG: number
  discTemperature: number
  lensing: boolean
  doppler: boolean
  rocket: boolean
  timeScale: number
  journeyPhase: JourneyPhase | null
  journeyProgress: number | null
  state: OrbitState
  moving: boolean
  viewIndex: number
  cameraYaw: number
  cameraPitch: number
}

type BlackHoleBridge = {
  applyScene: (index: number) => BlackHoleStats
  getStats: () => BlackHoleStats
  pause: () => BlackHoleStats
  play: () => BlackHoleStats
  restart: () => BlackHoleStats
  setDiscTemperature: (kelvin: number) => BlackHoleStats
  setDoppler: (enabled: boolean) => BlackHoleStats
  setLensing: (enabled: boolean) => BlackHoleStats
  setRocket: (enabled: boolean) => BlackHoleStats
  setTimeScale: (scale: number) => BlackHoleStats
  setView: (index: number) => BlackHoleStats
}

type BlackHoleWindow = Window & {
  OneWorldBlackHole?: BlackHoleBridge
}

/** demoIndex 对应 vendored Eric Bruneton demo 中的精选场景。 */
const scenes = [
  {
    key: 'far',
    demoIndex: 0,
    baseIntensity: 0.14,
    label: '远观',
    title: '黑洞周围那圈光，是从哪来的？',
    lead: '点“假如光走直线”，看盘本来的样子。',
    body: '顶上和底下那两道光弧，都是盘的背面：它的光绕过黑洞，弯进了你的眼睛。盘没有弯，弯的是光。',
    durationMs: 6_800,
  },
  {
    key: 'near',
    demoIndex: 3,
    baseIntensity: 0.26,
    label: '近看',
    title: '越靠近黑洞，你的时间走得越慢',
    lead: '看下方：你每过 1 小时，远方的钟会多走一截。',
    body: '悬停在这里要一直开着发动机。你过 1 小时，远方的钟会多走一截；朝你转过来的那侧盘，也更亮、更偏蓝。',
    durationMs: 6_800,
  },
  {
    key: 'flyby',
    demoIndex: 2,
    baseIntensity: 0.34,
    label: '掠过',
    title: '关掉发动机，让黑洞把你甩过去',
    lead: '熄火后自由下落。拖动画面，换个方向看。',
    body: '熄火后飞船自由下落，沿着时空里最“直”的路滑过黑洞。拖动画面，可以换个方向追着看。',
    durationMs: 7_000,
  },
  {
    key: 'journey',
    demoIndex: 4,
    baseIntensity: 0.38,
    label: '飞越',
    title: '从深空飞来，转个弯，再飞回深空',
    lead: '靠近、转弯、远去，直到黑洞缩成一点光。',
    body: '这条路线不会被黑洞吞掉：先落向它，在最近处转弯，再一路远去，直到它缩成一点光。',
    durationMs: 8_000,
  }
] as const

const viewLabels = ['侧舷', '正视', '俯看', '前向', '回望'] as const
const journeyPhaseLabels: Record<JourneyPhase, string> = {
  approach: '飞近黑洞',
  periapsis: '贴近掠过',
  departure: '飞向深空',
}

const temperatureMin = 2_000
const temperatureMax = 8_000
/** 距离刻度：从视界（1 倍半径）到飞越终点（100 倍半径），对数刻度。 */
const railMaxRadius = 100
/** 正视镜头下黑洞中心在画面中的竖直位置（画面高度的比例）。 */
const calloutCenterY = 0.495

function compactNumber(value: number, locale: string) {
  if (!Number.isFinite(value)) return '—'
  return new Intl.NumberFormat(locale, {
    notation: value >= 10_000 ? 'compact' : 'standard',
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value)
}

/**
 * 时间比 → “你过 1 小时，远方多过多久”。只是同一个模型数值换一种说法。
 * 中英文各自拼好（英文分支不经过词典）。
 */
function extraPerHour(timeDilation: number, en: boolean) {
  const seconds = Math.max(0, (timeDilation - 1) * 3_600)
  if (!Number.isFinite(seconds)) return '—'
  const units = en
    ? { lt1: 'under 1 s', h: ' h ', min: ' min', minS: ' min ', s: ' s' }
    : { lt1: '不到 1 秒', h: ' 小时 ', min: ' 分', minS: ' 分 ', s: ' 秒' }
  if (seconds < 1) return units.lt1
  if (seconds < 60) return String(Math.round(seconds)) + units.s
  if (seconds < 3_600) {
    return String(Math.floor(seconds / 60)) + units.minS + String(Math.round(seconds % 60)) + units.s
  }
  return String(Math.floor(seconds / 3_600)) + units.h + String(Math.round((seconds % 3_600) / 60)) + units.min
}

type Callout = {
  key: string
  /** 指向的点：相对黑洞中心，单位是画面高度。 */
  ax: number
  ay: number
  /** 文字的位置：同上。 */
  lx: number
  ly: number
  /** right：文字从锚点向右展开；center：文字居中压在锚点上。 */
  side: 'right' | 'center'
  title: string
  note?: string
}

/**
 * 只在“远观”且镜头正对、未被拖动时显示。位置按 vendored demo 在正视镜头下
 * 的成像量出来（黑洞影子半径约为画面高度的 7%），镜头一动就隐藏。
 */
const lensedCallouts: Array<Callout> = [
  { key: 'top', ax: 0.035, ay: -0.112, lx: 0.1, ly: -0.2, side: 'right', title: '盘的背面', note: '光从黑洞上方绕过来' },
  { key: 'bottom', ax: 0.03, ay: 0.104, lx: 0.09, ly: 0.175, side: 'right', title: '还是盘的背面', note: '这次从下方绕过来' },
  { key: 'front', ax: -0.15, ay: 0.012, lx: -0.2, ly: 0.075, side: 'right', title: '盘的正面', note: '离你最近的一段' },
  { key: 'shadow', ax: 0, ay: -0.036, lx: 0, ly: -0.036, side: 'center', title: '影子' },
]
const straightCallouts: Array<Callout> = [
  { key: 'disc', ax: -0.13, ay: 0.004, lx: -0.21, ly: -0.1, side: 'right', title: '盘其实是一张薄薄的平盘', note: '背面被黑洞挡住了' },
  { key: 'hole', ax: 0.02, ay: -0.02, lx: 0.08, ly: -0.15, side: 'right', title: '黑洞本身', note: '没有弯光，它只有这么大' },
]

function getBridge(frame: HTMLIFrameElement | null) {
  return (frame?.contentWindow as BlackHoleWindow | null)?.OneWorldBlackHole
}

export function BlackHoleFlyby({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const rootRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const controlsRef = useRef(controls)
  const audioRef = useRef<FlybyAudio | null>(null)
  const musicTouchedRef = useRef(false)
  const [ready, setReady] = useState(false)
  const { storyMode, enterFree: returnToFree, enterStory } = useStoryFreeMode('black-hole-flyby')
  const [sceneIndex, setSceneIndex] = useState(0)
  const [viewIndex, setViewIndex] = useState(1)
  const [toolTab, setToolTab] = useState<FlybyToolTab>('optics')
  const [stats, setStats] = useState<BlackHoleStats>()
  const [musicOn, setMusicOn] = useState(false)
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 })
  controlsRef.current = controls

  useEffect(() => {
    const root = rootRef.current
    if (!root || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setStageSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }))
    })
    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  function startMusicOnFirstGesture() {
    if (musicTouchedRef.current) return
    if (!audioRef.current) audioRef.current = createFlybyAudio()
    if (!audioRef.current.running) setMusicOn(audioRef.current.toggle())
  }

  const applyScene = useCallback((index: number, registerInteraction = true) => {
    const bridge = getBridge(frameRef.current)
    const next = Math.max(0, Math.min(scenes.length - 1, index))
    setSceneIndex(next)
    setToolTab(next >= 2 ? 'camera' : 'optics')
    if (bridge) {
      const nextStats = bridge.applyScene(scenes[next].demoIndex)
      setStats(nextStats)
      setViewIndex(nextStats.viewIndex)
    }
    if (registerInteraction) {
      controlsRef.current.registerInteraction()
      startMusicOnFirstGesture()
    }
  }, [])

  const openStory = useCallback(() => {
    controls.registerInteraction()
    enterStory()
    replayGuide('black-hole-flyby')
  }, [controls, enterStory])

  useEffect(() => {
    function receiveMessage(event: MessageEvent<{ type?: string }>) {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return
      if (event.data?.type === 'oneworld:black-hole:bridge-ready') {
        const nextStats = getBridge(frameRef.current)?.applyScene(scenes[sceneIndex].demoIndex)
        if (nextStats) {
          setStats(nextStats)
          setViewIndex(nextStats.viewIndex)
        }
      }
      if (event.data?.type === 'oneworld:black-hole:interaction') {
        returnToFree()
        controlsRef.current.registerInteraction()
        startMusicOnFirstGesture()
        return
      }
      if (event.data?.type !== 'oneworld:black-hole:ready') return
      window.dispatchEvent(new CustomEvent('shapeofworld:frame-ready', {
        detail: { worldId: 'black-hole-flyby' },
      }))
      setReady(true)
      setStats(getBridge(frameRef.current)?.getStats())
      controlsRef.current.completeOnboarding()
    }

    window.addEventListener('message', receiveMessage)
    return () => window.removeEventListener('message', receiveMessage)
  }, [returnToFree, sceneIndex])

  useEffect(() => {
    // Some embedded WebKit builds can render the scene but never complete the
    // optional high-resolution sky tile readiness signal. Do not leave the
    // branded loading veil over an otherwise interactive canvas forever; the
    // vendor keeps its own progress/error UI underneath until it is usable.
    const fallback = window.setTimeout(() => {
      setReady(true)
      controlsRef.current.completeOnboarding()
    }, 3_000)
    return () => window.clearTimeout(fallback)
  }, [])

  useEffect(() => {
    if (!ready) return
    const timer = window.setInterval(() => {
      const nextStats = getBridge(frameRef.current)?.getStats()
      if (!nextStats) return
      setStats(nextStats)
      audioRef.current?.setIntensity(
        scenes[sceneIndex].baseIntensity + nextStats.speedC * 1.1,
      )
    }, 400)
    return () => window.clearInterval(timer)
  }, [ready, sceneIndex])

  useEffect(() => () => {
    audioRef.current?.dispose()
    audioRef.current = null
  }, [])

  function toggleMotion() {
    const bridge = getBridge(frameRef.current)
    if (!bridge || !stats) return
    if (stats.state === 'playing') setStats(bridge.pause())
    else if (stats.state === 'paused') setStats(bridge.play())
    else setStats(bridge.restart())
    controls.registerInteraction()
    startMusicOnFirstGesture()
  }

  function toggleMusic() {
    musicTouchedRef.current = true
    if (!audioRef.current) audioRef.current = createFlybyAudio()
    setMusicOn(audioRef.current.toggle())
    controls.registerInteraction()
  }

  function toggleOptic(kind: 'lensing' | 'doppler') {
    const bridge = getBridge(frameRef.current)
    if (!bridge || !stats) return
    setStats(kind === 'lensing'
      ? bridge.setLensing(!stats.lensing)
      : bridge.setDoppler(!stats.doppler))
    controls.registerInteraction()
  }

  function changeTemperature(value: number) {
    const bridge = getBridge(frameRef.current)
    if (!bridge) return
    setStats(bridge.setDiscTemperature(value))
    controls.registerInteraction()
  }

  function toggleRocket() {
    const bridge = getBridge(frameRef.current)
    if (!bridge || !stats) return
    setStats(bridge.setRocket(!stats.rocket))
    controls.registerInteraction()
  }

  function changeTimeScale(value: number) {
    const bridge = getBridge(frameRef.current)
    if (!bridge) return
    setStats(bridge.setTimeScale(value))
    controls.registerInteraction()
  }

  function changeView(index: number) {
    const bridge = getBridge(frameRef.current)
    if (!bridge) return
    setViewIndex(index)
    setStats(bridge.setView(index))
    controls.registerInteraction()
  }

  const scene = scenes[sceneIndex]
  const guideSteps = useMemo<Array<GuideStep>>(() => [
    ...scenes.map((item, index) => {
      return {
        title: item.title,
        body: item.body,
        durationMs: item.durationMs,
        action: () => {
          enterStory()
          applyScene(index, false)
          const nextStats = getBridge(frameRef.current)?.setRocket(false)
          if (nextStats) setStats(nextStats)
        },
      }
    })
  ], [applyScene, enterStory])

  const locale = typeof document !== 'undefined' && document.documentElement.lang === 'en'
    ? 'en-US'
    : 'zh-CN'
  const en = locale === 'en-US'
  const radii = stats && stats.radiusKm > 0 ? stats.distanceKm / stats.radiusKm : null
  const railPosition = radii === null
    ? 0
    : Math.max(0, Math.min(1, Math.log(Math.max(1, radii)) / Math.log(railMaxRadius)))
  const hovering = stats?.state === 'stopped' && (stats?.speedC ?? 0) < 1e-6
  const cameraHome = Boolean(stats && stats.viewIndex === 1 &&
    Math.abs(stats.cameraYaw) < 0.01 && Math.abs(stats.cameraPitch) < 0.01)
  const showCallouts = ready && scene.key === 'far' && cameraHome && stageSize.height > 0
  const callouts = stats?.lensing === false ? straightCallouts : lensedCallouts

  function setLensingTo(enabled: boolean) {
    const bridge = getBridge(frameRef.current)
    if (!bridge || !stats || stats.lensing === enabled) return
    setStats(bridge.setLensing(enabled))
    controls.registerInteraction()
    startMusicOnFirstGesture()
  }

  const motionLabel = stats?.state === 'playing'
    ? '暂停'
    : stats?.state === 'paused'
      ? '继续'
      : '重跑'

  return (
    <div
      ref={rootRef}
      className={`oss-experience bh-flyby black-hole-experience black-hole-flyby-experience${storyMode ? ' is-story' : ' is-free'}`}
    >
      {!ready && (
        <div className="bh-flyby-loading" role="status">
          <i aria-hidden="true" />
          <span>{tx('黑洞掠过')}</span>
          <strong>{tx('如果从深空掠过黑洞，你会看见怎样的宇宙？')}</strong>
          <small>{tx('正在把星光弯成环…')}</small>
        </div>
      )}

      <iframe
        ref={frameRef}
        className="bh-flyby-frame"
        src="/vendor/black-hole/demo.html"
        title={tx('实时相对论黑洞飞掠')}
        loading="eager"
      >
        {tx('你的浏览器无法显示 WebGL2 黑洞实验。')}
      </iframe>

      <div className="bh-flyby-vignette" aria-hidden="true" />

      {showCallouts && (
        <div
          key={stats?.lensing === false ? 'straight' : 'lensed'}
          className="bh-flyby-callouts"
          data-experience-overlay="true"
          aria-hidden="true"
        >
          <svg width={stageSize.width} height={stageSize.height}>
            {callouts.filter((item) => item.side !== 'center').map((item, index) => {
              const h = stageSize.height
              const cx = stageSize.width / 2
              const cy = h * calloutCenterY
              return (
                <g key={item.key} style={{ animationDelay: `${index * 140}ms` }}>
                  <line x1={cx + item.ax * h} y1={cy + item.ay * h} x2={cx + item.lx * h} y2={cy + item.ly * h} />
                  <circle cx={cx + item.ax * h} cy={cy + item.ay * h} r={3} />
                </g>
              )
            })}
          </svg>
          {callouts.map((item, index) => {
            const h = stageSize.height
            const w = stageSize.width
            const x = w / 2 + item.lx * h
            const top = h * calloutCenterY + item.ly * h
            const edge = 14
            const style = item.side === 'center'
              ? { left: x, top }
              : { left: Math.max(edge, Math.min(x, w - edge - 150)), top }
            return (
              <div
                key={item.key}
                className={`bh-flyby-callout is-${item.side}`}
                style={{ ...style, animationDelay: `${120 + index * 140}ms` }}
              >
                <strong>{tx(item.title)}</strong>
                {item.note && <small>{tx(item.note)}</small>}
              </div>
            )
          })}
        </div>
      )}

      {!storyMode && (
        <div className="bh-flyby-plaque" data-experience-overlay="true" data-experience-plaque="true" aria-live="polite">
          <span>{tx('黑洞掠过')} · {sceneIndex + 1} / {scenes.length}</span>
          <strong key={scene.key}>{tx(scene.title)}</strong>
          {scene.key === 'far' ? (
            <div className="bh-flyby-compare" role="group" aria-label={tx('光线弯折')}>
              <button
                type="button"
                aria-pressed={stats?.lensing !== false}
                className={stats?.lensing !== false ? 'is-active' : undefined}
                onClick={() => setLensingTo(true)}
              >
                {tx('真实：光会弯')}
              </button>
              <button
                type="button"
                aria-pressed={stats?.lensing === false}
                className={stats?.lensing === false ? 'is-active' : undefined}
                onClick={() => setLensingTo(false)}
              >
                {tx('假如光走直线')}
              </button>
            </div>
          ) : (
            <p key={`${scene.key}-lead`}>{tx(scene.lead)}</p>
          )}
        </div>
      )}

      {!storyMode && stats && (
        <div className={`bh-flyby-readout${scene.key === 'journey' ? ' is-journey' : ''}`} data-experience-overlay="true" data-freebar-clearance="true" aria-live="polite">
          <div className="bh-flyby-readout-head">
            <small>{tx('你离黑洞')}</small>
            <strong>
              {radii === null ? '—' : radii >= 10 ? Math.round(radii) : radii.toFixed(1)} {tx('个黑洞半径')}
            </strong>
            <em>{compactNumber(stats.distanceKm, locale)} km</em>
            {scene.key === 'journey' && (
              <b className={`bh-flyby-phase is-${stats.journeyPhase ?? 'approach'}`}>
                {tx(journeyPhaseLabels[stats.journeyPhase ?? 'approach'])}
              </b>
            )}
          </div>
          <div className="bh-flyby-rail" aria-hidden="true">
            <i className="bh-flyby-rail-hole" />
            <span className="bh-flyby-rail-track">
              <span className="bh-flyby-rail-you" style={{ left: `${railPosition * 100}%` }}>
                <b>{tx('你')}</b>
              </span>
            </span>
            <small>{tx('深空')}</small>
          </div>
          <div className="bh-flyby-readout-stats">
            {hovering ? (
              <span>
                <small>{tx('悬停时你的体重')}</small>
                <strong>×{compactNumber(stats.gForceG, locale)}</strong>
              </span>
            ) : (
              <span>
                <small>{tx('你的速度')}</small>
                <strong>{Math.round(stats.speedC * 100)}% {tx('光速')}</strong>
              </span>
            )}
            <span>
              <small>{tx('你过 1 小时，远方多过')}</small>
              <strong>{extraPerHour(stats.timeDilation, en)}</strong>
            </span>
          </div>
        </div>
      )}

      {!storyMode && (
        <Freebar
          className="bh-flyby-freebar"
          mainClassName="bh-flyby-freebar-main"
          ariaLabel={tx('飞掠控制')}
          primaryControlBudget={scene.key === 'flyby' || scene.key === 'journey' ? 5 : 4}
          secondaryDefault="closed"
          secondaryClassName="bh-flyby-freebar-secondary"
          secondary={(
            <div className="bh-flyby-tray">
              <div className="bh-flyby-tray-head">
                <FreebarTabs
                  activeId={toolTab}
                  ariaLabel={tx('显示选项')}
                  className="bh-flyby-tool-tabs"
                  onChange={setToolTab}
                  tabs={[
                    { id: 'optics', label: tx('光学') },
                    { id: 'camera', label: tx('镜头') },
                  ]}
                />
                <div className="bh-flyby-tray-tools">
                  <button
                    type="button"
                    className="bh-flyby-music"
                    aria-pressed={musicOn}
                    aria-label={tx(musicOn ? '关闭配乐' : '开启配乐')}
                    title={tx(musicOn ? '关闭配乐' : '开启配乐')}
                    onClick={toggleMusic}
                  >
                    {musicOn ? <SpeakerHigh aria-hidden="true" weight="fill" /> : <SpeakerSlash aria-hidden="true" weight="fill" />}
                  </button>
                  <button
                    type="button"
                    className="experience-freebar-story"
                    onClick={openStory}
                    aria-label={tx('重播故事')}
                  >
                    <FilmStrip weight="fill" aria-hidden="true" />
                    <span>{tx('故事')}</span>
                  </button>
                </div>
              </div>

              <div className="bh-flyby-tool-row">
                {toolTab === 'optics' ? (
                  <>
                    <div className="bh-flyby-toggle-group experience-freebar-chips" role="group" aria-label={tx('显示选项')}>
                      <button
                        type="button"
                        aria-pressed={stats?.lensing ?? false}
                        className={stats?.lensing ? 'is-active' : undefined}
                        onClick={() => toggleOptic('lensing')}
                      >
                        {tx('光线弯折')}
                      </button>
                      <button
                        type="button"
                        aria-pressed={stats?.doppler ?? false}
                        className={stats?.doppler ? 'is-active' : undefined}
                        onClick={() => toggleOptic('doppler')}
                      >
                        {tx('明暗偏色')}
                      </button>
                    </div>
                    <label className="bh-flyby-temperature experience-freebar-field">
                      <div>
                        <span>{tx('盘温')}</span>
                        <strong>{Math.round(stats?.discTemperature ?? 2_700)} K</strong>
                      </div>
                      <input
                        type="range"
                        min={temperatureMin}
                        max={temperatureMax}
                        step={100}
                        value={Math.round(stats?.discTemperature ?? 2_700)}
                        onChange={(event) => changeTemperature(Number(event.target.value))}
                        aria-label={tx('吸积盘温度')}
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <div className="bh-flyby-view-group experience-freebar-seg" role="group" aria-label={tx('镜头')}>
                      {viewLabels.map((label, index) => (
                        <button
                          key={label}
                          type="button"
                          aria-pressed={viewIndex === index}
                          className={viewIndex === index ? 'is-active' : undefined}
                          onClick={() => changeView(index)}
                        >
                          {tx(label)}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className={`bh-flyby-rocket${stats?.rocket ? ' is-active' : ''}`}
                      aria-pressed={stats?.rocket ?? false}
                      onClick={toggleRocket}
                    >
                      {tx('飞行器')}
                    </button>
                    {scene.key === 'journey' && (
                      <label className="bh-flyby-timescale experience-freebar-field">
                        <div>
                          <span>{tx('飞越速度')}</span>
                          <strong>{(stats?.timeScale ?? 4).toFixed(1)}×</strong>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="6"
                          step="0.5"
                          value={stats?.timeScale ?? 4}
                          onChange={(event) => changeTimeScale(Number(event.target.value))}
                          aria-label={tx('飞越速度')}
                        />
                      </label>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        >
          <div className="bh-flyby-scenes experience-freebar-seg" role="tablist" aria-label={tx('选择旅程')}>
            {scenes.map((item, index) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                data-scene={item.key}
                aria-selected={sceneIndex === index}
                className={`bh-flyby-scene-button${sceneIndex === index ? ' is-active' : ''}`}
                onClick={() => applyScene(index)}
              >
                {tx(item.label)}
              </button>
            ))}
          </div>

          {(scene.key === 'flyby' || scene.key === 'journey') && (
            <button
              type="button"
              className="experience-freebar-play"
              data-playing={stats?.state === 'playing' ? 'true' : 'false'}
              onClick={toggleMotion}
              disabled={!stats}
              aria-label={tx(motionLabel)}
            >
              {stats?.state === 'playing' ? <Pause aria-hidden="true" weight="fill" /> : <Play aria-hidden="true" weight="fill" />}
            </button>
          )}
        </Freebar>
      )}

      <GuideTour
        worldId="black-hole-flyby"
        steps={guideSteps}
        placement="stage"
        stagePlan={[
          {position: 'top-left', mobilePosition: 'top-left', motion: 'rise', tone: 'light', width: 'wide', treatment: 'annotation'},
          {position: 'top-right', mobilePosition: 'top-right', motion: 'drift-left', tone: 'light', width: 'normal', treatment: 'annotation'},
          {position: 'bottom-left', mobilePosition: 'bottom-left', motion: 'drift-right', tone: 'light', width: 'wide', treatment: 'annotation'},
          {position: 'bottom-right', mobilePosition: 'bottom-right', motion: 'fade', tone: 'light', width: 'normal', treatment: 'caption'},
        ]}
        defaultOpen={storyMode}
        showReplayChip={false}
        replayLabel={tx('重播故事')}
        onExit={returnToFree}
      />

      {!storyMode && (
        <GhostHint
          worldId="black-hole-flyby"
          gesture={{ type: 'tap', target: '.bh-flyby-compare button:last-child', label: tx('点这里，看看光不弯时黑洞是什么样') }}
        />
      )}
    </div>
  )
}
