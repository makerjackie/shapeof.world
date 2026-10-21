import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { ArrowCounterClockwise, FilmStrip, Pause, Play } from '@phosphor-icons/react'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { GuideTour, type GuideStagePlan, type GuideStep } from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import { useExperienceI18n } from '~/i18n/experience'
import { photonProperties, polarizationVisibility, properTimeRatio, simultaneousClockEvents, type ClockObserver } from './photon-model'
import { PhotonScene, type PhotonMode, type SceneReadout, type SceneSettings } from './photon-scene'
import './styles/Photon.css'

const WORLD_ID = 'photon'
const STAGE_PLAN: GuideStagePlan = Array.from({ length: 6 }, () => ({
  position: 'top-left', mobilePosition: 'top-center', width: 'normal',
  treatment: 'editorial', tone: 'light', motion: 'rise',
}))

export function Photon({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const { storyMode, enterFree, enterStory } = useStoryFreeMode(WORLD_ID)
  const [mode, setMode] = useState<PhotonMode>('detect')
  const [wavelength, setWavelength] = useState(520)
  const [slitDistance, setSlitDistance] = useState(0.3)
  const [twoSlits, setTwoSlits] = useState(true)
  const [whichPath, setWhichPath] = useState(false)
  const [markerAngle, setMarkerAngle] = useState(90)
  const [compareColors, setCompareColors] = useState(false)
  const [clockObserver, setClockObserver] = useState<ClockObserver>('ground')
  const [beta, setBeta] = useState(0.8)
  const [running, setRunning] = useState(true)
  const [held, setHeld] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [error, setError] = useState(false)
  const [readout, setReadout] = useState<SceneReadout>({ detections: 0, sourceX: -100, sourceY: -100, groundTime: 0, movingTime: 0, groundTicks: 0, movingTicks: 0, pulseProgress: 0, previousBins: [], currentBins: [], previousCount: 0 })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<PhotonScene | null>(null)
  const drag = useRef<{ x: number; wavelength: number; beta: number } | null>(null)
  const storyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const settingsRef = useRef<SceneSettings>({ mode, wavelength, slitDistance, twoSlits, whichPath, markerAngle, compareColors, clockObserver, beta, running, held, reducedMotion })
  const { frequencyTHz, energyEv } = photonProperties(wavelength)
  const ratio = properTimeRatio(beta)
  const events = simultaneousClockEvents(readout.movingTime, beta, clockObserver)
  const horizon = Math.max(10, events.ship.t * 1.2)
  const plotX = (x: number) => 35 + x / horizon * 170
  const plotY = (t: number) => 105 - t / horizon * 90
  const histogramPath = (bins: number[]) => {
    const peak = Math.max(1, ...bins)
    return bins.map((value, i) => `${i ? 'L' : 'M'}${i * 240 / Math.max(1, bins.length - 1)},${29 - value / peak * 26}`).join(' ')
  }

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReducedMotion(query.matches)
    apply(); query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    if (!canvasRef.current) return
    try {
      const scene = new PhotonScene(canvasRef.current, settingsRef.current, setReadout)
      sceneRef.current = scene
      return () => { scene.destroy(); sceneRef.current = null }
    } catch (cause) {
      console.error('Photon stage could not initialize', cause)
      setError(true)
    }
  }, [])

  useEffect(() => {
    const next = { mode, wavelength, slitDistance, twoSlits, whichPath, markerAngle, compareColors, clockObserver, beta, running, held, reducedMotion }
    settingsRef.current = next
    sceneRef.current?.update(next)
  }, [mode, wavelength, slitDistance, twoSlits, whichPath, markerAngle, compareColors, clockObserver, beta, running, held, reducedMotion])

  useEffect(() => () => clearTimeout(storyTimer.current), [])

  const interact = useCallback(() => controls.registerInteraction(), [controls])
  const openMode = (next: PhotonMode) => {
    clearTimeout(storyTimer.current)
    setMode(next); setRunning(true); setHeld(false); interact()
  }
  const reset = () => { sceneRef.current?.reset(); interact() }
  const onePhoton = () => { setRunning(false); sceneRef.current?.fire(1); interact() }
  const launchPulse = () => { sceneRef.current?.launchPulse(); setRunning(true); interact() }

  const stage = useCallback((index: number) => {
    clearTimeout(storyTimer.current)
    setRunning(true); setHeld(false)
    if (index === 0 || index === 1) {
      setMode('detect'); setWavelength(520); setSlitDistance(0.3); setTwoSlits(true); setWhichPath(index === 1); setMarkerAngle(90)
      if (index === 0) sceneRef.current?.reset()
      sceneRef.current?.reducedSnapshot()
    } else if (index === 2) {
      setMode('color'); setCompareColors(false); setWavelength(650)
      storyTimer.current = setTimeout(() => setWavelength(430), 2100)
    } else if (index === 3) {
      setMode('color'); setCompareColors(true); sceneRef.current?.launchPulse()
    } else {
      setMode('clock'); setWavelength(520); setBeta(0.8); setClockObserver(index === 4 ? 'ground' : 'moving')
      if (index === 4) sceneRef.current?.reset()
      else {
        setRunning(false)
        storyTimer.current = setTimeout(() => setRunning(true), 2500)
      }
    }
  }, [])

  const steps = useMemo<GuideStep[]>(() => [
    { title: tx('光点落下，条纹浮现'), body: tx('每次探测只留下一个点。许多同样准备的光子抵达后，落点积成明暗条纹。'), action: () => stage(0), durationMs: 6500 },
    { title: tx('两条缝都开着，条纹却没了'), body: tx('两缝加上方向垂直的偏振标记，新落点的条纹消失。旧曝光留作对照，过去没有改变。'), action: () => stage(1), durationMs: 6500 },
    { title: tx('蓝光的每一粒，能量更高'), body: tx('光变蓝，波峰变密，频率升高。每个光子的能量随之增加：E = hf。'), action: () => stage(2), durationMs: 6500 },
    { title: tx('颜色不同，同时抵达'), body: tx('红蓝两束光同时发出，走过同样的真空距离。能量不同，传播速度相同。'), action: () => stage(3), durationMs: 6500 },
    { title: tx('运动的钟，往返更久'), body: tx('光完整往返一次，钟走一拍。地面参考系中，飞船钟里的光走更长的斜线；光速相同，滴答就更慢。'), action: () => stage(4), durationMs: 8000 },
    { title: tx('换个参考系，“现在”不同了'), body: tx('固定飞船钟上的同一个事件，切换“现在”线。地面钟上与它同时的事件变了，钟没有倒走。'), action: () => stage(5), durationMs: 8000 },
  ], [stage, tx])

  const closeStory = () => { clearTimeout(storyTimer.current); enterFree() }
  const startStory = () => { clearTimeout(storyTimer.current); enterStory(); interact() }

  const pointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (storyMode) return
    if (mode === 'detect') { setHeld(true); sceneRef.current?.fire(1) }
    else if (mode === 'color' && compareColors) { sceneRef.current?.launchPulse(); setRunning(true) }
    else drag.current = { x: event.clientX, wavelength, beta }
    event.currentTarget.setPointerCapture(event.pointerId)
    interact()
  }
  const pointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drag.current || storyMode) return
    const delta = (event.clientX - drag.current.x) / event.currentTarget.clientWidth
    if (mode === 'color') setWavelength(Math.round(Math.min(700, Math.max(400, drag.current.wavelength + delta * 380))))
    if (mode === 'clock') setBeta(Math.round(Math.min(0.95, Math.max(0, drag.current.beta + delta * 1.2)) * 100) / 100)
  }
  const pointerUp = () => { setHeld(false); drag.current = null }

  const title = mode === 'detect' ? tx('光子，一次一粒') : mode === 'color' ? compareColors ? tx('真空中的光速') : tx('颜色与能量') : tx('光速与时间')
  const description = mode === 'detect'
    ? tx('光子是电磁场的量子，单次探测留下光点，落点分布由概率幅决定。')
    : mode === 'color'
      ? compareColors ? tx('轻点画面让红蓝脉冲同时出发，比较它们走过相同距离的时刻。') : tx('左右拖动光带，改变颜色；波长越短，每个光子的能量越高。')
      : beta >= 0.9 ? tx('有质量的钟无法加速到光速，光子也没有静止参考系。')
        : clockObserver === 'ground' ? tx('以地面为参考，飞船钟在移动；光速相同，更长的光程需要更多时间。') : tx('以飞船为参考，地面钟在移动；每个人自己的钟都照常走。')

  return (
    <div className="photon-experience" data-photon-mode={mode} data-photon-paired={mode === 'color' && compareColors ? 'true' : 'false'} data-photon-story={storyMode ? 'true' : 'false'}>
      <canvas
        ref={canvasRef} className="photon-canvas" role="img"
        aria-label={tx('光子的概率波面、探测屏、红蓝光脉冲与光钟。使用下方控件或拖动画面探索。')}
        onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}
      />
      {error && <div className="photon-error" role="alert" data-experience-overlay="true">{tx('当前设备无法绘制光的场景，请刷新后重试。')}</div>}
      {!storyMode && <>
        <div className="photon-nameplate" data-experience-overlay="true">
          <div className="photon-eyebrow">{tx('光子 · 光 · 时间')}</div>
          <h1>{title}</h1><p>{description}</p>
        </div>
        {mode === 'detect' && <button
          type="button" className="photon-source-hit" style={{ left: readout.sourceX, top: readout.sourceY }}
          data-experience-overlay="true" aria-label={tx('按住光源连续曝光')}
          onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setHeld(true); sceneRef.current?.fire(1); interact() }}
          onPointerUp={pointerUp} onPointerCancel={pointerUp}
          onClick={(event) => { if (event.detail === 0) onePhoton() }}
        ><span className="photon-source-ring" /><span className="photon-source-label">{tx('按住发光')}</span></button>}
        <GhostHint key={`${mode}-${compareColors}`} worldId={`photon-${mode}-${compareColors ? 'paired' : 'single'}`} gesture={mode === 'detect'
          ? { type: 'tap', target: '.photon-source-hit', label: tx('按住光源，让光点积起来') }
          : mode === 'color' && compareColors ? { type: 'tap', target: '.photon-canvas', label: tx('轻点画面，同时发出两束光') }
          : { type: 'drag', target: '.photon-canvas', dx: 100, dy: 0, label: mode === 'color' ? tx('左右拖动，改变颜色') : tx('左右拖动，改变速度') }} />
      </>}

      <div className={`photon-readout ${storyMode ? 'photon-readout-story' : ''}`} data-experience-overlay="true" data-freebar-clearance={storyMode ? undefined : 'true'} aria-live="off">
        {mode === 'detect' && <>
          <div className="photon-readout-top"><span className="photon-live-dot" /><span>{tx('探测记录')}</span><strong>{readout.detections.toLocaleString()}</strong></div>
          <p>{!twoSlits ? tx('单缝开放 · 宽光斑仍有衍射') : whichPath ? markerAngle === 90 ? tx('双缝开放 · 路径记录无需被人读取') : tx('偏振方向逐渐分开，条纹逐渐变淡') : held ? tx('光子更多，每个光子的能量不变') : tx('两缝开放 · 明暗条纹正在累积')}</p>
          {readout.previousCount > 0 && <div className="photon-exposure-comparison">
            <svg viewBox="0 0 240 32" role="img" aria-label={tx('前次曝光与本次曝光的落点分布，各自按峰值缩放')}>
              <path d={histogramPath(readout.previousBins)} className="photon-old-exposure" />
              <path d={histogramPath(readout.currentBins)} className="photon-new-exposure" />
            </svg>
            <span>{tx('虚线：前次曝光')} · {readout.previousCount.toLocaleString()}　{tx('实线：本次曝光')}</span>
          </div>}
          {!storyMode && <div className="photon-equation">{whichPath && twoSlits ? <>{markerAngle === 90 ? tx('路径可区分，概率分别相加') : tx('干涉项随偏振重合程度减小')}<span>V = cos θ = {polarizationVisibility(markerAngle).toFixed(2)}</span></> : !twoSlits ? <>{tx('只保留一条通路')}<span>P ∝ |A₁|²</span></> : <>{tx('先叠加振幅，再求概率')}<span>P ∝ |A₁ + A₂|²</span></>}</div>}
        </>}
        {mode === 'color' && !compareColors && <>
          <div className="photon-energy"><div><span>{tx('每个光子')}</span><strong>{energyEv.toFixed(2)} <small>eV</small></strong></div><div><span>{tx('波长')}</span><strong>{wavelength} <small>nm</small></strong></div></div>
          <p>{tx('频率')} {frequencyTHz.toFixed(0)} THz <span className="photon-times">·</span> E = hf = hc / λ</p>
          {!storyMode && <div className="photon-equation">{tx('真空光速始终相同')}<span>c = 299,792,458 m/s</span></div>}
        </>}
        {mode === 'color' && compareColors && <>
          <div className="photon-energy photon-paired-readings"><div><span>{tx('红光')} · 650 nm</span><strong>≈{photonProperties(650).energyEv.toFixed(2)} <small>eV</small></strong></div><div><span>{tx('蓝光')} · 450 nm</span><strong>≈{photonProperties(450).energyEv.toFixed(2)} <small>eV</small></strong></div></div>
          <p className="photon-arrival" data-arrived={readout.pulseProgress >= 1 ? 'true' : 'false'}>{readout.pulseProgress >= 1 ? tx('同时抵达 · 能量不同，速度相同') : tx('同时出发 · 经过相同的真空距离')}</p>
          {!storyMode && <div className="photon-equation">{tx('两束光的速度')}<span>c = 299,792,458 m/s</span></div>}
        </>}
        {mode === 'clock' && <>
          <div className="photon-clock-readings"><div><span>{tx('地面钟')} · {clockObserver === 'ground' ? tx('静止') : `${beta.toFixed(2)} c`}</span><strong>{readout.groundTime.toFixed(2)} <small>s</small><small className="photon-ticks">{tx('拍数')} {readout.groundTicks}</small></strong></div><div><span>{tx('飞船钟')} · {clockObserver === 'moving' ? tx('静止') : `${beta.toFixed(2)} c`}</span><strong>{readout.movingTime.toFixed(2)} <small>s</small><small className="photon-ticks">{tx('拍数')} {readout.movingTicks}</small></strong></div></div>
          <div className="photon-simultaneity">
            <svg viewBox="0 0 240 120" role="img" aria-label={tx('固定地面坐标的时空图：两条钟的历史与两种同时线')}>
              <path d="M35 8V105H226" className="photon-diagram-axis" />
              <text x="5" y="15">t</text><text x="208" y="118">x/c</text>
              <path d="M35 105V15" className="photon-ground-history" />
              <path d={`M35 105L${plotX(beta * horizon)} 15`} className="photon-ship-history" />
              <path d={`M35 ${plotY(events.ship.t)}H${plotX(events.ship.x)}`} className={clockObserver === 'ground' ? 'photon-now' : 'photon-other-now'} />
              <path d={`M35 ${plotY(readout.movingTime * ratio)}L${plotX(events.ship.x)} ${plotY(events.ship.t)}`} className={clockObserver === 'moving' ? 'photon-now' : 'photon-other-now'} />
              <circle cx="35" cy={plotY(events.ground.t)} r="3.8" className="photon-ground-event" />
              <circle cx={plotX(events.ship.x)} cy={plotY(events.ship.t)} r="3.8" className="photon-ship-event" />
              <text x="43" y="14">{tx('地面')}</text><text x={Math.min(205, plotX(beta * horizon) + 8)} y={beta < 0.2 ? 29 : 14}>{tx('飞船')}</text>
            </svg>
            <span>{tx('地面坐标 · 实线为当前的“现在”')}</span>
          </div>
          <p>{clockObserver === 'ground' ? tx('地面参考系 · 同一时刻比较两只钟') : tx('飞船参考系 · 同一时刻比较两只钟')}</p>
          <p className="photon-model-note">{tx('光路局部窗口循环 · 累计时间不归零')}</p>
          {!storyMode && <div className="photon-equation">{tx('运动钟与静止钟的时间比')}<span>√(1 − v²/c²) = {ratio.toFixed(2)}</span></div>}
        </>}
        {mode !== 'clock' && <p className="photon-model-note">{tx('光幕示意场与相位，光点表示探测事件')}</p>}
      </div>

      {!storyMode && <Freebar
        ariaLabel={tx('光子探索控件')} className="photon-freebar" primaryControlBudget={3}
        secondaryDefault="auto" secondaryClassName="photon-secondary"
        secondary={<>
          <div className="photon-adjust-row">
          {mode === 'detect' && <>
            {whichPath ? <label className="photon-slider"><span>{tx('偏振夹角')} <b>{markerAngle}°</b></span><input type="range" aria-label={tx('两条路径的偏振夹角')} min="0" max="90" step="1" value={markerAngle} onChange={(e) => { setMarkerAngle(Number(e.target.value)); interact() }} /></label> : <label className="photon-slider"><span>{tx('缝距')} <b>{slitDistance.toFixed(2)} mm</b></span><input type="range" aria-label={tx('双缝间距')} min="0.20" max="0.50" step="0.01" value={slitDistance} onChange={(e) => { setSlitDistance(Number(e.target.value)); interact() }} /></label>}
          </>}
          {mode === 'color' && !compareColors && <label className="photon-slider photon-spectrum-slider"><span>{tx('波长')} <b>{wavelength} nm</b></span><input id="photon-wavelength" type="range" aria-label={tx('光的波长')} min="400" max="700" step="1" value={wavelength} onChange={(e) => { setWavelength(Number(e.target.value)); interact() }} /></label>}
          {mode === 'color' && compareColors && <button type="button" className="photon-chip photon-relaunch" onClick={launchPulse}>{tx('同时发射')}</button>}
          {mode === 'clock' && <label className="photon-slider photon-speed-slider"><span>{tx('新实验速度')} <b>{beta.toFixed(2)} c</b></span><input type="range" aria-label={tx('两只光钟的相对速度')} min="0" max="0.95" step="0.01" value={beta} onChange={(e) => { setBeta(Number(e.target.value)); interact() }} /></label>}
          <button type="button" className="experience-freebar-play" aria-label={running ? tx('暂停') : tx('播放')} onClick={() => { setRunning(!running); interact() }}>{running ? <Pause size={18} /> : <Play size={18} />}</button>
          <button type="button" className="experience-freebar-reset" aria-label={tx('重置')} onClick={reset}><ArrowCounterClockwise size={18} /><span>{tx('重置')}</span></button>
          <button type="button" className="experience-freebar-story" aria-label={tx('故事')} onClick={startStory}><FilmStrip size={18} /><span>{tx('故事')}</span></button>
          </div>
          <div className="photon-option-row">
            {mode === 'detect' && <>
              <button type="button" className={`photon-chip ${!twoSlits ? 'is-active' : ''}`} aria-pressed={!twoSlits} onClick={() => { setTwoSlits(!twoSlits); setWhichPath(false); interact() }}>{twoSlits ? tx('遮住一缝') : tx('打开双缝')}</button>
              <button type="button" className={`photon-chip photon-path-toggle ${whichPath ? 'is-active' : ''}`} disabled={!twoSlits} aria-pressed={whichPath} onClick={() => { setWhichPath(!whichPath); setMarkerAngle(90); interact() }}>{whichPath ? tx('移除标记') : tx('偏振标记')}</button>
              <button type="button" className="photon-chip photon-single-shot" onClick={onePhoton}>{tx('一个光子')}</button>
            </>}
            {mode === 'color' && <button type="button" className={`photon-chip photon-compare-toggle ${compareColors ? 'is-active' : ''}`} aria-pressed={compareColors} onClick={() => { setCompareColors(!compareColors); setRunning(true); interact() }}>{compareColors ? tx('返回单色') : tx('对比红蓝')}</button>}
            {mode === 'clock' && <div className="photon-observers" aria-label={tx('参考系')}>
              <button type="button" className={`photon-chip ${clockObserver === 'ground' ? 'is-active' : ''}`} aria-pressed={clockObserver === 'ground'} onClick={() => { setClockObserver('ground'); interact() }}>{tx('地面参考系')}</button>
              <button type="button" className={`photon-chip ${clockObserver === 'moving' ? 'is-active' : ''}`} aria-pressed={clockObserver === 'moving'} onClick={() => { setClockObserver('moving'); interact() }}>{tx('飞船参考系')}</button>
            </div>}
          </div>
        </>}
      >
        <div className="experience-freebar-seg photon-modes" aria-label={tx('探索内容')}>
          <button type="button" className={mode === 'detect' ? 'is-active' : undefined} aria-pressed={mode === 'detect'} onClick={() => openMode('detect')}>{tx('探测')}</button>
          <button type="button" className={mode === 'color' ? 'is-active' : undefined} aria-pressed={mode === 'color'} onClick={() => openMode('color')}>{tx('颜色')}</button>
          <button type="button" className={mode === 'clock' ? 'is-active' : undefined} aria-pressed={mode === 'clock'} onClick={() => openMode('clock')}>{tx('光钟')}</button>
        </div>
      </Freebar>}
      <GuideTour worldId={WORLD_ID} steps={steps} placement="stage" stagePlan={STAGE_PLAN} defaultOpen={storyMode} onExit={closeStory} showReplayChip={false} />
    </div>
  )
}
