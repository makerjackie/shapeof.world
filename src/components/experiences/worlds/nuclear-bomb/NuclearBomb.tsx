import './styles/NuclearBomb.css'

import {ArrowCounterClockwise, ArrowLeft, ArrowRight, ArrowUUpLeft, Pause, Play, X} from '@phosphor-icons/react'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'

import type {ExperienceControls} from '~/components/ExperienceShell'
import {Freebar, FreebarTabs} from '~/components/experiences/Freebar'
import {GhostHint} from '~/components/experiences/GhostHint'
import {GuideTour, GUIDE_AUTOPLAY_STATE_EVENT, type GuideStep} from '~/components/experiences/GuideTour'
import {useI18n} from '~/i18n'
import {useExperienceI18n} from '~/i18n/experience'

import {advancePresentation, CHEMICAL_START, GENERATION_NS, chainSummary, DEFAULT_YIELD_KT, ENDING_PRESENTATION_SECONDS, lastGenerationsEnergyFraction, samplePresentation, sampleTimeline, slowdownFactor, stepTimeline} from './model'
import {PARTS} from './parts'
import {NuclearScene} from './scene'
import {ScaleView} from './ScaleView'
import {HistoryView} from './HistoryView'

type Anchor = {
  id: string
  x: number
  y: number
  visible: boolean
  occluded?: boolean
  side?: 'left' | 'right'
  bounds?: {left: number; right: number; top: number; bottom: number}
  avoid?: {left: number; right: number; top: number; bottom: number}
}
const SUMMARY = chainSummary(DEFAULT_YIELD_KT)
const SCHEMATIC = '示意图：只表现结构的层次和发生的先后，不按比例，不含工程细节。'

function ScientificNumber({value, digits = 2, decimalPlaces = 0}: {value: number; digits?: number; decimalPlaces?: number}) {
  if (!Number.isFinite(value) || value <= 0) return <>0</>
  const exponent = Math.floor(Math.log10(value))
  const coefficient = value / 10 ** exponent
  if (exponent >= 0 && exponent <= 3) return <>{value.toLocaleString('en-US', {maximumFractionDigits: decimalPlaces})}</>
  return <>{coefficient.toFixed(digits)}<span className="nb-times"> × 10</span><sup>{exponent}</sup></>
}

type ExhibitView = 'cutaway' | 'scale' | 'history'

type GuidePosition = {index: number; run: number}

export function NuclearBomb({controls}: {controls: ExperienceControls}) {
  const tx = useExperienceI18n()
  const [view, setView] = useState<ExhibitView>('cutaway')
  const [visited, setVisited] = useState<Set<ExhibitView>>(() => new Set(['cutaway']))
  const [guided, setGuided] = useState(false)
  const [guidePosition, setGuidePosition] = useState<GuidePosition | null>(null)
  const [guideYield, setGuideYield] = useState(15)
  const viewRef = useRef(view)
  const guidedRef = useRef(guided)
  const previousView = useRef<ExhibitView>('cutaway')
  viewRef.current = view
  guidedRef.current = guided

  const showView = useCallback((next: ExhibitView) => {
    setVisited((current) => new Set([...current, next]))
    setView(next)
  }, [])
  const beginGuide = useCallback(() => {
    if (!guidedRef.current) previousView.current = viewRef.current
    guidedRef.current = true
    setGuided(true)
  }, [])
  const endGuide = useCallback(() => {
    guidedRef.current = false
    setGuided(false)
    setGuidePosition(null)
    showView(previousView.current)
  }, [showView])
  const goToGuideStep = useCallback((index: number) => {
    beginGuide()
    if (index === 3) setGuideYield(15)
    setGuidePosition((current) => ({index, run: (current?.run ?? 0) + 1}))
    showView(index < 3 ? 'cutaway' : index === 3 ? 'scale' : 'history')
  }, [beginGuide, showView])

  useEffect(() => {
    const syncGuide = (event: Event) => {
      const detail = (event as CustomEvent<{worldId?: string; active?: boolean}>).detail
      if (detail?.worldId !== 'nuclear-bomb') return
      if (detail.active) beginGuide()
      else if (guidedRef.current) endGuide()
    }
    window.addEventListener(GUIDE_AUTOPLAY_STATE_EVENT, syncGuide)
    return () => window.removeEventListener(GUIDE_AUTOPLAY_STATE_EVENT, syncGuide)
  }, [beginGuide, endGuide])

  useEffect(() => {
    if (!guided || guidePosition?.index !== 3) return
    setGuideYield(15)
    const timer = window.setTimeout(() => setGuideYield(50000), 2300)
    return () => window.clearTimeout(timer)
  }, [guided, guidePosition])

  const guideSteps = useMemo<Array<GuideStep>>(() => [
    {title: '从外壳，看到核心。', body: '剖面把层次摊开。橙色的是可裂变核心，其余各层可以逐一查看。', durationMs: 6500},
    {title: '跟着一颗中子。', body: '裂变放出的中子触发下一次裂变。演示会停在第 8 代，留下正在扩展的前沿。', durationMs: 19000},
    {title: '能量集中在最后几代。', body: '现在是第 78 代。理想化净翻倍下，最后 7 代贡献总能量的 99% 以上。', durationMs: 6500},
    {title: '把能量，放回尺度里。', body: '从广岛的约 15 千吨，拉到沙皇炸弹的 50 百万吨。比较效应圈，也比较同等能量的 TNT 立方体。', durationMs: 9000},
    {title: '日期之间，还有一条曲线。', body: '中国的两次试验相隔 2 年 8 个月。沿同一条年份轴，查看全球库存怎样变化。', durationMs: 8500},
  ].map((step, index) => ({...step, action: () => goToGuideStep(index), replay: () => goToGuideStep(index)})), [goToGuideStep])

  const changeView = (next: ExhibitView) => {
    controls.registerInteraction()
    guidedRef.current = false
    setGuided(false)
    setGuidePosition(null)
    showView(next)
  }
  return <div className={`nb-experience${guided ? ' is-guided' : ''}`} data-exhibit-view={view} data-exhibit-guide-step={guided && guidePosition ? guidePosition.index + 1 : undefined}>
    <div className={`nb-view-layer${view === 'cutaway' ? ' is-active' : ''}`} aria-hidden={view !== 'cutaway'} inert={view !== 'cutaway'}><CutawayView controls={controls} active={view === 'cutaway'} guided={guided} guidePosition={guidePosition} /></div>
    {visited.has('scale') && <div className={`nb-view-layer${view === 'scale' ? ' is-active' : ''}`} aria-hidden={view !== 'scale'} inert={view !== 'scale'}><ScaleView controls={controls} active={view === 'scale'} guided={guided} guideYieldKt={guided && guidePosition?.index === 3 ? guideYield : undefined} /></div>}
    {visited.has('history') && <div className={`nb-view-layer${view === 'history' ? ' is-active' : ''}`} aria-hidden={view !== 'history'} inert={view !== 'history'}><HistoryView controls={controls} active={view === 'history'} guided={guided} guideFocus={guided && guidePosition?.index === 4 ? 'china' : undefined} /></div>}
    <nav className="nb-view-navigation" data-experience-overlay="true">
      <FreebarTabs activeId={view} onChange={changeView} ariaLabel={tx('展览视图')} tabs={[{id: 'cutaway', label: tx('剖面')}, {id: 'scale', label: tx('尺度')}, {id: 'history', label: tx('历史')}]} />
    </nav>
    {!guided && <button className="nb-guide-entry" type="button" data-experience-overlay="true" onClick={() => { controls.registerInteraction(); beginGuide() }}><span>{tx('五步导览')}</span><ArrowRight size={13} /></button>}
    <GuideTour worldId="nuclear-bomb" steps={guideSteps} defaultOpen={guided} placement="stage" showReplayChip={false} kicker={tx('导览')} replayLabel={tx('五步导览')} exitLabel={tx('退出导览')} onExit={endGuide} stagePlan={[{position: 'top-left', mobilePosition: 'top-left', motion: 'fade', tone: 'light', width: 'normal', treatment: 'annotation'}]} />
  </div>
}

function CutawayView({controls, active, guided, guidePosition}: {controls: ExperienceControls; active: boolean; guided: boolean; guidePosition: GuidePosition | null}) {
  const tx = useExperienceI18n()
  const {locale} = useI18n()
  const english = locale === 'en'
  const host = useRef<HTMLDivElement>(null)
  const touchedExplode = useRef(false)
  const introElapsed = useRef(0)
  const [freeExplode, setExplode] = useState(0)
  const [freeCutAngle, setCutAngle] = useState<0 | 90 | 180>(90)
  const [freeSelectedPart, setSelectedPart] = useState<string | null>(null)
  const [guideSelectedPart, setGuideSelectedPart] = useState<string | null>('core')
  const [freePresentation, setPresentation] = useState({time: CHEMICAL_START, endingSeconds: 0})
  const [guidePresentation, setGuidePresentation] = useState({time: CHEMICAL_START, endingSeconds: 0})
  const [freePlaying, setPlaying] = useState(false)
  const [reverse, setReverse] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [freeAutoCamera, setAutoCamera] = useState(true)
  const [freeManualMicro, setManualMicro] = useState<boolean | null>(null)
  const [anchors, setAnchors] = useState<Array<Anchor>>([])
  const [size, setSize] = useState({width: 1600, height: 1000})
  const [reducedMotion, setReducedMotion] = useState(false)
  const [error, setError] = useState('')
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const cutawayGuide = guided && guidePosition !== null && guidePosition.index < 3
  const {time, endingSeconds} = cutawayGuide ? guidePresentation : freePresentation
  const explode = cutawayGuide ? guidePosition.index === 0 ? 0.55 : 0 : freeExplode
  const cutAngle = cutawayGuide ? 90 : freeCutAngle
  const selectedPart = cutawayGuide ? guidePosition.index === 0 ? guideSelectedPart : null : freeSelectedPart
  const playing = cutawayGuide ? guidePosition.index === 1 && time < 8 * GENERATION_NS : freePlaying
  const autoCamera = cutawayGuide || freeAutoCamera
  const manualMicro = cutawayGuide ? null : freeManualMicro
  const sample = sampleTimeline(time)
  const presentation = samplePresentation(time, endingSeconds)
  const micro = manualMicro ?? (autoCamera && time >= 0)
  const forceMicro = manualMicro === true
  const microscopyVisible = forceMicro || (micro && time < 140)
  const showCompletion = presentation.complete && !forceMicro
  const reactionActive = time >= 0
  const selected = PARTS.find((part) => part.id === selectedPart)
  const slowdown = slowdownFactor(time, cutawayGuide ? 1 : speed)
  const mobile = size.width <= 720

  useEffect(() => {
    const element = host.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setSize({width: entry.contentRect.width, height: entry.contentRect.height}))
    observer.observe(element)
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReducedMotion(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => { observer.disconnect(); media.removeEventListener('change', sync) }
  }, [])

  useEffect(() => {
    if (!active || guided || touchedExplode.current || introElapsed.current >= 3200) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setExplode(0.55)
      introElapsed.current = 3200
      return
    }
    let frame = 0
    let previous = 0
    const animate = (stamp: number) => {
      if (touchedExplode.current) return
      if (previous) introElapsed.current += stamp - previous
      previous = stamp
      const progress = Math.max(0, Math.min(1, (introElapsed.current - 1000) / 2200))
      setExplode(0.55 * (1 - (1 - progress) ** 3))
      if (progress < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [active, guided])

  useEffect(() => {
    if (!playing || !active || guided) return
    let frame = 0
    let previous = 0
    const tick = (stamp: number) => {
      const delta = previous ? Math.max(0, (stamp - previous) / 1000) : 0
      previous = stamp
      setPresentation((current) => advancePresentation(current, reverse ? -delta : delta, speed))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, reverse, speed, active, guided])

  useEffect(() => {
    if (!guided && playing && ((!reverse && presentation.complete) || (reverse && time <= CHEMICAL_START))) setPlaying(false)
  }, [playing, presentation.complete, reverse, time, guided])

  useEffect(() => {
    if (!cutawayGuide || !guidePosition) return
    const start = guidePosition.index === 0 ? CHEMICAL_START : guidePosition.index === 1 ? 0 : 78 * GENERATION_NS
    setGuidePresentation({time: start, endingSeconds: 0})
    setGuideSelectedPart('core')
    if (guidePosition.index !== 1) return
    let frame = 0
    let previous = 0
    let position = {time: start, endingSeconds: 0}
    const animate = (stamp: number) => {
      const delta = previous ? Math.max(0, (stamp - previous) / 1000) : 0
      previous = stamp
      position = advancePresentation(position, delta)
      position.time = Math.min(8 * GENERATION_NS, position.time)
      setGuidePresentation(position)
      if (position.time < 8 * GENERATION_NS) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [cutawayGuide, guidePosition])

  const choosePart = useCallback((id: string | null) => {
    controls.registerInteraction()
    if (cutawayGuide) setGuideSelectedPart((current) => current === id ? null : id)
    else setSelectedPart((current) => current === id ? null : id)
  }, [controls, cutawayGuide])

  const scrub = useCallback((value: number) => {
    controls.registerInteraction()
    setPlaying(false)
    setPresentation({time: value, endingSeconds: 0})
    setManualMicro(null)
  }, [controls])

  const play = () => {
    controls.registerInteraction()
    if (!playing && !reverse && presentation.complete) setPresentation({time: CHEMICAL_START, endingSeconds: 0})
    if (!playing && reverse && time <= CHEMICAL_START) setPresentation({time: SUMMARY.durationNs, endingSeconds: ENDING_PRESENTATION_SECONDS})
    setManualMicro(null)
    setSelectedPart(null)
    setPlaying((value) => !value)
  }

  const currentTime = useRef(time)
  currentTime.current = time
  const step = useCallback((direction: -1 | 1) => {
    scrub(stepTimeline(currentTime.current, direction))
  }, [scrub])

  const sectionControls = useCallback((id: string) => <>
    <div className="nb-cut-controls"><span>{tx('剖开')}</span><div role="group" aria-label={tx('剖开角度')}>{([0, 90, 180] as const).map((angle) => <button type="button" key={angle} aria-pressed={cutAngle === angle} onClick={() => { controls.registerInteraction(); setCutAngle(angle) }}>{angle}°</button>)}</div></div>
    <label className="nb-explode"><span>{tx('拆开')}<output>{Math.round(explode * 100)}%</output></span><input id={id} type="range" min="0" max="1" step="0.01" value={explode} aria-label={tx('拆开程度')} onChange={(event) => { controls.registerInteraction(); touchedExplode.current = true; setExplode(Number(event.target.value)) }} /></label>
  </>, [controls, cutAngle, explode, tx])

  const labelPositions = useMemo(() => {
    const anchorById = new Map(anchors.map((anchor) => [anchor.id, anchor]))
    const visible = anchors.filter((anchor) => anchor.visible)
    const bounds = anchors.find((anchor) => anchor.bounds)?.bounds ?? {
      left: Math.min(...visible.map((anchor) => anchor.x), size.width * 0.35),
      right: Math.max(...visible.map((anchor) => anchor.x), size.width * 0.65),
      top: Math.min(...visible.map((anchor) => anchor.y), size.height * 0.28),
      bottom: Math.max(...visible.map((anchor) => anchor.y), size.height * 0.65),
    }
    const center = (bounds.left + bounds.right) / 2
    const sideOf = (id: string) => {
      const anchor = anchorById.get(id)
      return anchor?.side ?? ((anchor?.x ?? center) < center ? 'left' : 'right')
    }
    const result: Array<Anchor & {name: string; order: number; side: 'left' | 'right'; labelX: number; labelY: number; edgeX: number; elbowX: number}> = []
    for (const side of ['left', 'right'] as const) {
      const parts = PARTS.filter((part) => sideOf(part.id) === side)
      parts.sort((a, b) => (anchorById.get(a.id)?.y ?? a.order * 10) - (anchorById.get(b.id)?.y ?? b.order * 10))
      const edgeX = side === 'left' ? Math.max(190, bounds.left - 40) : Math.min(size.width - 190, bounds.right + 40)
      const elbowX = side === 'left' ? bounds.left - 12 : bounds.right + 12
      const labelX = side === 'left' ? edgeX - 158 : edgeX + 158
      const top = Math.max(230, bounds.top + 26)
      // Keep a column's labels clear of the tail shroud when it sits on that side.
      const avoid = anchors.find((anchor) => anchor.avoid)?.avoid
      const avoidOnSide = avoid && (side === 'left' ? avoid.left < center : avoid.right > center)
      const bottom = Math.min(size.height - 255, bounds.bottom - 10, avoidOnSide && parts.every((part) => (anchorById.get(part.id)?.y ?? 0) < avoid.top) ? avoid.top - 20 : Infinity)
      const gap = 52
      const heights = parts.map((part, index) => Math.max(top + index * gap, Math.min(bottom - (parts.length - 1 - index) * gap, anchorById.get(part.id)?.y ?? top + index * gap)))
      for (let index = 1; index < heights.length; index++) heights[index] = Math.max(heights[index], heights[index - 1] + gap)
      parts.forEach((part, index) => {
        const anchor = anchorById.get(part.id)
        if (!anchor) return
        result.push({...anchor, name: english ? part.nameEn : part.name, order: part.order, side, labelX, labelY: heights[index], edgeX, elbowX})
      })
    }
    return result
  }, [anchors, english, size])

  const leaders = useMemo(() => mobile || micro || reactionActive ? [] : labelPositions.filter((label) => label.visible).map((label) => ({
    id: label.id,
    points: [[label.edgeX, label.labelY], [label.elbowX, label.labelY], [label.x, label.y]] as Array<[number, number]>,
    opacity: label.occluded ? 0.16 : selectedPart && selectedPart !== label.id ? 0.22 : 1,
  })), [labelPositions, mobile, micro, reactionActive, selectedPart])

  const mobilePins = useMemo(() => {
    const placed: Array<{id: string; x: number; y: number}> = []
    for (const anchor of [...labelPositions].filter((item) => item.visible).sort((a, b) => a.order - b.order)) {
      let position = {x: anchor.x, y: anchor.y}
      let found = false
      for (let radius = 0; radius <= 72 && !found; radius += 12) {
        for (let index = 0; index < 16; index++) {
          const angle = (index / 16) * Math.PI * 2 - Math.PI / 2
          const candidate = {
            x: Math.max(23, Math.min(size.width - 23, anchor.x + Math.cos(angle) * radius)),
            y: Math.max(190, Math.min(size.height - 230, anchor.y + Math.sin(angle) * radius)),
          }
          if (placed.every((other) => Math.hypot(candidate.x - other.x, candidate.y - other.y) >= 27)) {
            position = candidate
            found = true
            break
          }
        }
      }
      placed.push({id: anchor.id, ...position})
    }
    return new Map(placed.map((pin) => [pin.id, pin]))
  }, [labelPositions, size])

  const energyPath = useMemo(() => {
    const points = Array.from({length: 121}, (_, index) => {
      const at = index / 120 * SUMMARY.durationNs
      return `${index * 2},${58 - sampleTimeline(at).energyFraction * 54}`
    })
    return `M${points.join(' L')}`
  }, [])

  const atStart = time <= CHEMICAL_START
  // Camera labels can move every frame without remeasuring the shared control tray.
  const secondaryControls = useMemo(() => (
    <div className="nb-secondary">
      {atStart && !micro && (mobile || selected) && sectionControls('nb-explode-secondary')}
      {!mobile && !micro && !reactionActive && !selected && <span className="nb-playback-caption">{tx('播放，把不到一微秒慢下来。')}</span>}
      <div className="nb-stepping" role="group" aria-label={tx('时间步进')}>
        <button type="button" aria-label={tx('回到开始')} title={tx('回到开始')} onClick={() => { scrub(CHEMICAL_START); setManualMicro(false) }}><ArrowCounterClockwise size={17} /></button>
        <button type="button" aria-label={tx('上一代')} title={tx('上一代')} onClick={() => step(-1)}><ArrowLeft size={15} /><span>1</span></button>
        <button type="button" aria-label={tx('下一代')} title={tx('下一代')} onClick={() => step(1)}><span>1</span><ArrowRight size={15} /></button>
        <button type="button" aria-pressed={reverse} aria-label={tx('倒放')} title={tx('倒放')} onClick={() => { controls.registerInteraction(); setReverse((value) => !value) }}><ArrowUUpLeft size={17} /><span>{tx('倒放')}</span></button>
      </div>
      <label className="nb-speed"><span>{tx('速度')}</span><select value={speed} aria-label={tx('播放速度')} onChange={(event) => { controls.registerInteraction(); setSpeed(Number(event.target.value)) }}>{[0.25, 0.5, 1, 2, 4].map((value) => <option key={value} value={value}>×{value}</option>)}</select></label>
      <label className="nb-camera"><input type="checkbox" checked={autoCamera} onChange={(event) => { controls.registerInteraction(); setAutoCamera(event.target.checked); setManualMicro(null) }} /><span>{tx('自动镜头')}</span></label>
    </div>
  ), [atStart, mobile, selected, micro, reactionActive, reverse, speed, autoCamera, controls, sectionControls, step, scrub, tx])

  return (
    <div className={`nb-world${microscopyVisible ? ' is-micro' : ''}${reactionActive ? ' is-reacting' : ''}${reactionActive && sample.energyFraction > 0.2 && !presentation.complete && !forceMicro ? ' is-bright' : ''}${showCompletion ? ' is-complete' : ''}${selected ? ' has-selection' : ''}`} ref={host} data-nuclear-time={time.toFixed(4)} data-nuclear-ending={endingSeconds.toFixed(4)} data-nuclear-view={microscopyVisible ? 'micro' : 'cutaway'}>
      <NuclearScene active={active} guideCamera={cutawayGuide} explode={explode} cutAngle={cutAngle} selectedPart={selectedPart} onSelectPart={choosePart} time={time} endingSeconds={endingSeconds} micro={micro} forceMicro={forceMicro} autoCamera={autoCamera && manualMicro === null} leaders={leaders} onAnchors={setAnchors} onInteract={controls.registerInteraction} onError={setError} reducedMotion={reducedMotion} />
      <div className="nb-vignette" aria-hidden="true" />

      <header className="nb-heading" data-experience-overlay="true">
        <p><span className="nb-live-dot" />{tx(showCompletion ? '时间停止在这里' : microscopyVisible ? '微观视图' : reactionActive ? '返回剖面' : '内爆式装置')}<i />01 / 03</p>
        <h1>{tx(showCompletion ? '不到一微秒。' : microscopyVisible ? '一颗，再到下一颗。' : reactionActive ? '能量，在最后几代显现。' : '原子弹，一层一层。')}</h1>
        <span>{tx(showCompletion ? '拖回时间轴，可以再看一次。' : forceMicro && time >= 120 ? '微观示意停在前 12 代，读数对应主时间轴。' : microscopyVisible ? '一颗原子核裂开，放出两三个中子。' : reactionActive ? '从微观回到整体。亮度表示累计能量。' : '「胖子」外形 · 结构示意')}</span>
      </header>

      {!mobile && time <= CHEMICAL_START && !micro && !selected && <aside className="nb-section-controls" data-experience-overlay="true" aria-label={tx('剖面控制')}><div className="nb-panel-eyebrow"><span>{tx('剖面控制')}</span><span>{tx('不按比例')}</span></div>{sectionControls('nb-explode')}</aside>}

      {!micro && !reactionActive && (
        <div className="nb-labels" data-experience-overlay="true">
          {!mobile && <svg className="nb-leaders" width={size.width} height={size.height} aria-hidden="true">
            {labelPositions.map((label) => {
              if (!label.visible) return null
              return <g key={label.id} className={selectedPart === label.id ? 'is-selected' : ''} opacity={label.occluded ? 0.16 : selectedPart && selectedPart !== label.id ? 0.22 : 1}>
                <circle cx={label.x} cy={label.y} r={3} />
              </g>
            })}
          </svg>}
          {mobile && <svg className="nb-leaders nb-pin-leaders" width={size.width} height={size.height} aria-hidden="true">{labelPositions.filter((label) => label.visible).map((label) => {
            const pin = mobilePins.get(label.id)
            if (!pin || Math.hypot(pin.x - label.x, pin.y - label.y) < 8) return null
            return <g key={label.id} opacity={label.occluded ? 0.2 : 0.8}><path d={`M${pin.x},${pin.y} L${label.x},${label.y}`} /><circle cx={label.x} cy={label.y} r={1.3} /></g>
          })}</svg>}
          {labelPositions.filter((label) => label.visible).map((label) => {
            const pin = mobilePins.get(label.id) ?? label
            return <button type="button" key={label.id} className={`nb-part-label is-${label.side}${mobile ? ' is-pin' : ''}${label.occluded ? ' is-occluded' : ''}${selectedPart === label.id ? ' is-selected' : ''}`} style={mobile ? {left: pin.x - 11, top: pin.y - 11} : {[label.side]: label.side === 'left' ? label.labelX : size.width - label.labelX, top: label.labelY - 17}} aria-label={label.name} aria-pressed={selectedPart === label.id} onClick={() => choosePart(label.id)}>
              <span>{String(label.order).padStart(2, '0')}</span>{!mobile && <strong>{label.name}</strong>}
            </button>
          })}
          {mobile && !selected && <div className="nb-mobile-legend" aria-label={tx('结构编号')}>
            {PARTS.map((part) => <button type="button" key={part.id} onClick={() => choosePart(part.id)}><span>{String(part.order).padStart(2, '0')}</span><strong>{english ? part.nameEn : part.name}</strong></button>)}
          </div>}
        </div>
      )}

      {selected && !micro && (
        <aside className="nb-plaque" data-experience-overlay="true">
          <div className="nb-panel-eyebrow"><span>{tx('结构展签')} / {String(selected.order).padStart(2, '0')}</span><button type="button" onClick={() => choosePart(null)} aria-label={tx('清除选择')}><X /></button></div>
          <h2>{english ? selected.nameEn : selected.name}</h2>
          <p>{english ? selected.descriptionEn : selected.description}</p>
          <small>{tx('点击其他层继续查看')}</small>
        </aside>
      )}

      {(micro || reactionActive) && (
        <aside className="nb-readout" data-experience-overlay="true" aria-label={tx('链式反应读数')}>
          <div className="nb-panel-eyebrow"><span>{tx('链式反应')}</span><span>{tx('理想化净翻倍')}</span></div>
          <div className="nb-generation"><span>{tx('代数')}</span><strong>{(sample.phase === 'disassembly' ? Math.ceil(SUMMARY.generations) : Math.floor(sample.generation)).toString().padStart(2, '0')}<small> / {Math.ceil(SUMMARY.generations)}</small></strong></div>
          <dl>
            <div><dt>{tx('本代裂变数')}</dt><dd><ScientificNumber value={sample.generationFissions} /></dd></div>
            <div className="nb-energy-reading"><dt>{tx('累计能量')}</dt><dd><ScientificNumber value={sample.energyJ} decimalPlaces={2} /> <small>J</small></dd></div>
            <div><dt>{tx('TNT 当量')}</dt><dd><ScientificNumber value={sample.energyKt} decimalPlaces={2} /> <small>kt</small></dd></div>
            <div><dt>{tx('经过时间')}</dt><dd>{showCompletion ? (sample.elapsedNs / 1000).toFixed(2) : sample.elapsedNs.toFixed(1)} <small>{showCompletion ? 'μs' : 'ns'}</small></dd></div>
            {showCompletion ? <div><dt>{tx('最后 7 代的能量')}</dt><dd>{(lastGenerationsEnergyFraction(7) * 100).toFixed(1)}<small>%</small></dd></div> : <div><dt>{tx('放慢倍数')}</dt><dd>{slowdown === null ? '—' : <><ScientificNumber value={slowdown} digits={1} /> <small>×</small></>}</dd></div>}
          </dl>
          <p className="nb-reference-yield">{tx('计算参照：15 kt。并非展品的实际当量。')}</p>
          <div className="nb-chart">
            <div><span>{tx('累计能量 · 线性坐标')}</span><span>{(sample.energyFraction * 100).toFixed(1)}%</span></div>
            <svg viewBox="0 0 240 66" role="img" aria-label={tx('累计能量随时间的线性曲线')}>
              <path className="nb-chart-grid" d="M0,4H240 M0,31H240 M0,58H240" />
              <path className="nb-chart-total" d={energyPath} />
              <clipPath id="nb-energy-clip"><rect width={Math.max(0, sample.elapsedNs / SUMMARY.durationNs) * 240} height="66" /></clipPath>
              <path className="nb-chart-current" d={energyPath} clipPath="url(#nb-energy-clip)" />
              <line className="nb-chart-cursor" x1={sample.elapsedNs / SUMMARY.durationNs * 240} x2={sample.elapsedNs / SUMMARY.durationNs * 240} y1="0" y2="60" />
              <circle className="nb-chart-point" cx={sample.elapsedNs / SUMMARY.durationNs * 240} cy={58 - sample.energyFraction * 54} r="2.6" />
            </svg>
            <div className="nb-chart-axis"><span>0 ns</span><span>{SUMMARY.durationNs.toFixed(0)} ns</span></div>
            <i className="nb-energy-track"><b style={{width: `${sample.energyFraction * 100}%`}} /></i>
          </div>
        </aside>
      )}

      <div className="nb-view-tools" data-experience-overlay="true">
        <button type="button" onClick={() => { controls.registerInteraction(); setManualMicro(!microscopyVisible); setSelectedPart(null) }}>{tx(microscopyVisible ? '回到剖面' : '进到核心')}<ArrowRight size={13} /></button>
      </div>

      <div className="nb-caption" data-experience-overlay="true">
        {microscopyVisible && <p className="nb-micro-note">{tx('示意：只画出前 12 代，之后返回剖面')}</p>}
        {!microscopyVisible && reactionActive && !presentation.complete && <p className="nb-micro-note">{tx('内部亮度表示累计能量，不是温度测量。')}</p>}
        {!micro && time >= -1 && time < 0 && <p className="nb-micro-note">{tx('③ 压紧、中子源放出中子')}</p>}
        {!micro && time > CHEMICAL_START && time < 0 && <p className="nb-micro-note">{tx('压缩量为视觉示意，不代表实际比例。')}</p>}
        <p>{tx(SCHEMATIC)} <button type="button" onClick={() => setSourcesOpen((open) => !open)}>{tx('资料来源')}</button></p>
      </div>

      {sourcesOpen && (
        <aside className="nb-sources nb-plaque" data-experience-overlay="true">
          <div className="nb-panel-eyebrow"><span>{tx('资料来源')}</span><button type="button" onClick={() => setSourcesOpen(false)} aria-label={tx('关闭')}><X /></button></div>
          <a href="https://en.wikipedia.org/wiki/Nuclear_fission" target="_blank" rel="noreferrer">Wikipedia · Nuclear fission ↗</a>
          <a href="https://en.wikipedia.org/wiki/Nuclear_chain_reaction" target="_blank" rel="noreferrer">Wikipedia · Nuclear chain reaction ↗</a>
          <a href="https://en.wikipedia.org/wiki/Shake_(unit)" target="_blank" rel="noreferrer">Wikipedia · Shake (unit) ↗</a>
          <a href="https://en.wikipedia.org/wiki/TNT_equivalent" target="_blank" rel="noreferrer">Wikipedia · TNT equivalent ↗</a>
          <a href="https://ahf.nuclearmuseum.org/ahf/history/science-behind-atom-bomb/" target="_blank" rel="noreferrer">Atomic Heritage Foundation · Fission ↗</a>
          <p>{tx('内部层次和压缩只作示意。链式反应按每代净翻倍计算。')}</p>
        </aside>
      )}

      {error && <div className="nb-error" role="alert"><p>{tx('三维视图暂时无法显示。请使用支持 WebGL 的浏览器。')}</p></div>}

      {active && !guided && <Freebar className="nb-freebar" ariaLabel={tx('剖面和时间控制')} primaryControlBudget={3} secondaryDefault="closed" secondary={secondaryControls}>
        <button type="button" className="nb-play" aria-label={tx(playing ? '暂停' : '播放')} onClick={play}>{playing ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}<span>{tx(playing ? '暂停' : '播放')}</span></button>
        <div className="nb-timeline">
          <div className="nb-chemical-axis">
            <label htmlFor="nb-chemical"><span>{tx('化学爆轰阶段')}</span><small>{tx('示意，不计时')}</small></label>
            <input id="nb-chemical" type="range" min={CHEMICAL_START} max="0" step="0.01" value={Math.min(0, time)} aria-label={tx('化学爆轰阶段（示意，不计时）')} onChange={(event) => scrub(Number(event.target.value))} />
            <div className="nb-chemical-steps">
              <span className={time > -3 ? 'is-on' : ''} aria-label={tx('① 起爆')}>{mobile ? `① ${tx('起爆')}` : tx('① 起爆')}</span>
              <span className={time > -2 ? 'is-on' : ''} aria-label={tx('② 汇聚')}>{mobile ? `② ${tx('汇聚')}` : tx('② 汇聚')}</span>
              <span className={time > -1 ? 'is-on' : ''} aria-label={tx('③ 压紧、中子源放出中子')} title={tx('③ 压紧、中子源放出中子')}>{mobile ? `③ ${tx('压紧')}` : tx('③ 压紧')}</span>
            </div>
          </div>
          <span className="nb-axis-break" aria-label={tx('断轴：两段使用不同的时间尺度')}>≈</span>
          <div className="nb-chain-axis">
            <label htmlFor="nb-chain"><span>{tx('④ 链式反应')}<small>{tx('每代 10 纳秒 · 理想化')}</small></span><span className={sample.phase === 'disassembly' ? 'is-on' : ''}>{tx('⑤ 解体')}</span></label>
            <input id="nb-chain" type="range" min="0" max={SUMMARY.durationNs} step="any" value={Math.max(0, time)} aria-label={tx('链式反应时间（纳秒）')} aria-valuetext={`${Math.max(0, time).toFixed(1)} ns`} onChange={(event) => scrub(Number(event.target.value))} />
            <div className="nb-ns-ticks">{[0, 200, 400, 600, 800].map((tick) => <span style={{left: `${tick / SUMMARY.durationNs * 100}%`}} key={tick}>{tick}{tick === 800 ? ' ns' : ''}</span>)}</div>
          </div>
        </div>
      </Freebar>}
      {active && !guided && <GhostHint worldId="nuclear-bomb" gesture={{type: 'drag', target: '.nb-scene', dx: 75, dy: -25, label: tx('拖动旋转，点一层看里面')}} delay={6000} />}
    </div>
  )
}
