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
    title: '先从远处，看清黑洞怎样把光弯成环',
    body: '黑洞把盘背面的光弯到视线里，才形成上下两道光弧。盘没有弯，弯的是光。',
    durationMs: 6_200,
  },
  {
    key: 'near',
    demoIndex: 3,
    baseIntensity: 0.26,
    label: '近看',
    title: '越靠近，时间流速差越明显',
    body: '距离变小时，远方时钟相对走得更快；盘面朝你运动的一侧也会更亮、更偏蓝。',
    durationMs: 6_400,
  },
  {
    key: 'flyby',
    demoIndex: 2,
    baseIntensity: 0.34,
    label: '掠过',
    title: '关掉发动机，让黑洞从身边掠过',
    body: '自由落体时飞船沿测地线前进。拖动画面，可以从不同方向追踪这次近掠。',
    durationMs: 7_000,
  },
  {
    key: 'journey',
    demoIndex: 4,
    baseIntensity: 0.38,
    label: '飞越',
    title: '从深空靠近，再远离到只剩一点光',
    body: '这是一条不会被捕获的测地线：先落向黑洞，在最近点转弯，然后一路离开到深空。',
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

function compactNumber(value: number, locale: string) {
  if (!Number.isFinite(value)) return '—'
  return new Intl.NumberFormat(locale, {
    notation: value >= 100_000 ? 'compact' : 'standard',
    maximumFractionDigits: value >= 1000 ? 0 : 1,
  }).format(value)
}

function getBridge(frame: HTMLIFrameElement | null) {
  return (frame?.contentWindow as BlackHoleWindow | null)?.OneWorldBlackHole
}

export function BlackHoleFlyby({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
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
  controlsRef.current = controls

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
        controlsRef.current.registerInteraction()
        startMusicOnFirstGesture()
        return
      }
      if (event.data?.type !== 'oneworld:black-hole:ready') return
      setReady(true)
      setStats(getBridge(frameRef.current)?.getStats())
      controlsRef.current.completeOnboarding()
    }

    window.addEventListener('message', receiveMessage)
    return () => window.removeEventListener('message', receiveMessage)
  }, [sceneIndex])

  useEffect(() => {
    // Some embedded WebKit builds can render the scene but never complete the
    // optional high-resolution Gaia tile readiness signal. Do not leave the
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
  const motionLabel = stats?.state === 'playing'
    ? '暂停'
    : stats?.state === 'paused'
      ? '继续'
      : '重跑'

  return (
    <div className={`oss-experience bh-flyby black-hole-experience black-hole-flyby-experience${storyMode ? ' is-story' : ' is-free'}`}>
      {!ready && (
        <div className="bh-flyby-loading" role="status">
          <i />
          <span>{tx('正在铺设光路')}</span>
          <small>{tx('载入相对论光线模型与 Gaia 星空')}</small>
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

      {!storyMode && (
        <div className="bh-flyby-plaque" data-experience-overlay="true" data-experience-plaque="true" aria-live="polite">
          <span>{tx('黑洞掠过')}</span>
          <strong>{tx(scene.title)}</strong>
        </div>
      )}

      {!storyMode && stats && (
        <div className={`bh-flyby-readout${scene.key === 'journey' ? ' is-journey' : ''}`} data-experience-overlay="true" data-freebar-clearance="true" aria-live="polite">
          <span>
            <small>{tx('距离')}</small>
            <strong>{compactNumber(stats.distanceKm, locale)} km</strong>
          </span>
          <span>
            <small>{tx('速度')}</small>
            <strong>{stats.speedC.toFixed(2)} c</strong>
          </span>
          {scene.key === 'journey' && (
            <span>
              <small>{tx('航段')}</small>
              <strong>{stats.journeyPhase
                ? tx(journeyPhaseLabels[stats.journeyPhase])
                : tx('飞近黑洞')}</strong>
            </span>
          )}
          <span>
            <small>{tx('时间比')}</small>
            <strong>{stats.timeDilation.toFixed(2)}×</strong>
          </span>
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
                        {tx('透镜')}
                      </button>
                      <button
                        type="button"
                        aria-pressed={stats?.doppler ?? false}
                        className={stats?.doppler ? 'is-active' : undefined}
                        onClick={() => toggleOptic('doppler')}
                      >
                        {tx('光变')}
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
          {position: 'top-left', mobilePosition: 'top-left', motion: 'rise', tone: 'light', width: 'wide', treatment: 'editorial'},
          {position: 'top-right', mobilePosition: 'top-right', motion: 'drift-left', tone: 'light', width: 'normal', treatment: 'annotation'},
          {position: 'bottom-left', mobilePosition: 'bottom-left', motion: 'drift-right', tone: 'light', width: 'normal', treatment: 'monumental'},
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
          gesture={{ type: 'tap', target: '.bh-flyby-scene-button[data-scene="journey"]', label: tx('点飞越，一步看完靠近、掠过与远离') }}
        />
      )}
    </div>
  )
}
