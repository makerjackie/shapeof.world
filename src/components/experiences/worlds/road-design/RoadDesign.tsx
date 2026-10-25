import './styles/RoadDesign.css'
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer, N8AO, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { Pause, Play } from '@phosphor-icons/react'
import * as T from 'three'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GuideTour, GUIDE_REPLAY_EVENT, GUIDE_AUTOPLAY_STATE_EVENT } from '~/components/experiences/GuideTour'
import { TOUR } from './tour'
import { GhostHint } from '~/components/experiences/GhostHint'
import { isWorldPaused } from '~/lib/world-playback'
import { useExperienceI18n } from '~/i18n/experience'
import { CATALOGUE as DESIGNS, type DesignInfo } from './designs/catalogue'
import { summarizeConflicts } from './sim/conflicts'
import type { Network } from './sim/types'
import { NightWorld, makeLightingAtlas } from './scene/NightWorld'
import { RoadMeshes } from './scene/RoadMeshes'
import { Vehicles } from './scene/Vehicles'
import { LightTrails } from './scene/LightTrails'
import { ConflictMarkers } from './scene/ConflictMarkers'
import { CameraRig, type CameraPreset } from './scene/CameraRig'
import { WorkerTrafficRuntime as TrafficRuntime } from './scene/worker-runtime'
import { Blueprint, BlueprintGround } from './scene/Blueprint'
import { FrameBudget } from './scene/FrameBudget'
import { RenderProbe } from './scene/RenderProbe'
import { PreparePrograms } from './scene/PreparePrograms'
import { ComposerResources } from './scene/ComposerResources'
import { PressurePanel, type PressureCurves } from './PressurePanel'
import { CompareTable } from './CompareTable'
import { PRESENTATIONS, defaultOverlays } from './presentation'
import { PhaseRings } from './PhaseRings'
import { DisplayStretch } from './scene/DisplayStretch'
import { highestDeckTexture } from './scene/deck-shadow'
import { CityLights } from './scene/CityLights'
import { LeftRoutes } from './scene/LeftRoutes'
import { WaitingOutline } from './scene/WaitingOutline'

function query(name: string) { return typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get(name) }
function numberQuery(name: string, fallback: number, max: number) {
  const value = Number(query(name) ?? fallback)
  return Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : fallback
}
const PRESETS: { id: CameraPreset; name: string }[] = [{ id: 'overview', name: '鸟瞰' }, { id: 'top', name: '俯视' }, { id: 'close', name: '近看' }, { id: 'low', name: '路面' }]

const Scene = memo(function Scene({ design, network, runtime, speed, playing, shutter, showConflicts, highlightLeft, stretch, showWeaving, preset, revision, reducedMotion, blueprint, interact, onDprChange }: {
  design: DesignInfo; network: Network; runtime: TrafficRuntime; speed: number; playing: boolean; shutter: number; showConflicts: boolean; highlightLeft: boolean; stretch: boolean; showWeaving: boolean; preset: CameraPreset; revision: number; reducedMotion: boolean; blueprint: boolean; interact: () => void; onDprChange?:(dpr:number)=>void
}) {
  const seenBlueprint = useMemo(()=>({current:false}),[network])
  if(blueprint)seenBlueprint.current=true
  const lamps = runtime.lamps
  const atlas = useMemo(() => makeLightingAtlas(lamps,runtime.lighting), [lamps,runtime])
  const conflicts = runtime.conflicts
  const roof = useMemo(() => highestDeckTexture(runtime.roof), [runtime])
  useEffect(() => () => roof.dispose(), [roof])
  useEffect(() => () => atlas.dispose(), [atlas])
  useFrame((_, delta) => {
    runtime.frameMs = runtime.frameMs * 0.9 + delta * 1000 * 0.1
    const frozen=!playing||document.hidden||isWorldPaused()
    runtime.setFrozen(frozen)
    if(!frozen)runtime.advance(Math.min(delta,0.1)*speed)
  }, -2)
  return <>
    <FrameBudget version={`${network.id}:${blueprint}:${stretch}:${preset}:${revision}`} onDprChange={onDprChange} />
    {query('profile')==='1' && <RenderProbe runtime={runtime} />}
    <NightWorld network={network} atlas={atlas} visible={!blueprint} />
    {blueprint && <><color attach="background" args={['#07121f']} /><fogExp2 attach="fog" args={['#07121f',.00015]} /><ambientLight intensity={.65} color="#8ab4ff" /><BlueprintGround network={network} /></>}
    <DisplayStretch network={network} enabled={stretch}>
      {seenBlueprint.current && <group visible={blueprint}><Blueprint key={network.id} network={network} prepared={runtime.blueprint} /></group>}
      <group visible={!blueprint}>
        <RoadMeshes network={network} atlas={atlas} prepared={runtime.geometry} simulation={runtime.simulation} roof={roof} />
        <CityLights lamps={lamps} network={network} />
        {design.id === 'crossroads-channelized' && <WaitingOutline network={network} />}
      </group>
      {highlightLeft && !blueprint && <LeftRoutes network={network} />}
      <Vehicles runtime={runtime} />
      <LightTrails runtime={runtime} shutter={shutter} blueprint={blueprint} highlightLeft={highlightLeft} />
      {(showConflicts || showWeaving || blueprint) && <ConflictMarkers network={network} conflicts={showConflicts || blueprint ? conflicts : []} showWeaving={showWeaving || blueprint} />}
    </DisplayStretch>
    <CameraRig design={design} preset={preset} revision={revision} reducedMotion={reducedMotion} onInteract={interact} />
    <EffectComposer multisampling={0}>
      <ComposerResources />
      <PreparePrograms version={`${network.id}:${blueprint}:${stretch}`} />
      {!blueprint && !stretch && query('ao')!=='0' ? <N8AO key="ao" aoRadius={1.6} intensity={0.35} distanceFalloff={1} aoSamples={12} denoiseSamples={6} denoiseRadius={12} halfRes /> : <></>}
      <Bloom luminanceThreshold={1.25} luminanceSmoothing={0.18} intensity={0.30} radius={0.45} mipmapBlur resolutionScale={0.6} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.25} darkness={0.32} />
    </EffectComposer>
  </>
})

// Readouts tick twice a second. Keep them outside Canvas reconciliation, so
// changing a number cannot reconfigure DPR or re-run instance ref callbacks.
const RoadCanvas = memo(function RoadCanvas(props:ComponentProps<typeof Scene>) {
  const dpr=useRef(Math.min(1.5,devicePixelRatio))
  const rememberDpr=useCallback((value:number)=>{dpr.current=value},[])
  return <Canvas camera={{position:[350,250,380],fov:35,near:.3,far:10000}} dpr={dpr.current} gl={{antialias:false,alpha:false,powerPreference:'high-performance',toneMapping:T.NoToneMapping}}><Scene {...props} onDprChange={rememberDpr} /></Canvas>
})

const Diagram = memo(function Diagram({ id }: { id: string }) {
  const { range, roads } = DESIGNS.find(design=>design.id===id)!.diagram
  return <svg viewBox={`${-range} ${-range} ${range*2} ${range*2}`} aria-hidden="true">{roads.map((road,i)=><polyline key={i} points={road.points} fill="none" stroke="currentColor" strokeWidth={road.width} opacity={road.opacity} />)}</svg>
})

export function RoadDesign({ controls }: { controls: ExperienceControls }) {
  const [requested, requestDesign] = useState(() => DESIGNS.find(d=>d.id===query('design'))?.id ?? 'cloverleaf')
  const [runtime, setRuntime] = useState<TrafficRuntime | null>(null)
  const active = useRef<TrafficRuntime | null>(null)
  const [error, setError] = useState<Error | null>(null)
  useEffect(() => {
    if(active.current?.network.id===requested)return
    let cancelled=false
    const next=new TrafficRuntime(requested, active.current ? 1 : Math.max(.25,numberQuery('multiplier',1,2.5)),error=>{if(!cancelled)setError(error)})
    next.ready.then(()=>{
      if(cancelled){next.dispose();return}
      const previous=active.current;active.current=next;setRuntime(next);previous?.dispose()
    }).catch(error=>{if(!cancelled)setError(error instanceof Error?error:new Error(String(error)))})
    return ()=>{cancelled=true;if(active.current!==next)next.dispose()}
  },[requested])
  useEffect(()=>()=>{active.current?.dispose()},[])
  if(error)throw error
  if(!runtime)return <div className="road-design-experience" data-loading="true" />
  return <RoadDesignSession controls={controls} runtime={runtime} requestDesign={requestDesign} pendingId={requested===runtime.network.id?null:requested} />
}

function RoadDesignSession({controls,runtime,requestDesign,pendingId}:{controls:ExperienceControls;runtime:TrafficRuntime;requestDesign:(id:string)=>void;pendingId:string|null}) {
  const tx = useExperienceI18n()
  const designId = runtime.network.id
  const design = DESIGNS.find(d => d.id === designId)!
  const network = runtime.network
  const [demand, setDemand] = useState(() => Math.max(0.25, numberQuery('multiplier', 1, 2.5)))
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [playing, setPlaying] = useState(!reducedMotion), [speed, setSpeed] = useState(1)
  const manualShutter = useRef(query('shutter') !== null)
  const [shutter, setShutter] = useState(() => numberQuery('shutter', designId === 'cloverleaf' ? 8 : 6, 15))
  const [initialOverlays] = useState(() => defaultOverlays(designId, designId === 'cloverleaf'))
  const manualOverlays = useRef<Partial<Record<keyof typeof initialOverlays, boolean>>>({})
  const [showConflicts, setShowConflicts] = useState(query('conflicts') === null ? initialOverlays.conflicts : query('conflicts') === '1')
  const [highlightLeft, setHighlightLeft] = useState(query('left') === null ? initialOverlays.left : query('left') === '1')
  const [stretch, setStretch] = useState(query('stretch') === null ? initialOverlays.stretch : query('stretch') === '1')
  const [showWeaving, setShowWeaving] = useState(initialOverlays.weaving)
  const [preset, setPreset] = useState<CameraPreset>(() => PRESETS.find(p => p.id === query('camera'))?.id ?? 'overview')
  const [revision, setRevision] = useState(0)
  const [blueprint, setBlueprint] = useState(query('blueprint') === '1')
  const [renderBlueprint, setRenderBlueprint] = useState(blueprint)
  const [viewChanging, setViewChanging] = useState(false)
  const [curves, setCurves] = useState<PressureCurves>({})
  const [showPressure, setShowPressure] = useState(false)
  const [showCompare, setShowCompare] = useState(query('compare') === '1')
  const [expanded, setExpanded] = useState(false)
  const [tourActive, setTourActive] = useState(false)
  useEffect(() => {
    const listener = (event: Event) => { const state=(event as CustomEvent<{worldId: string; active: boolean}>).detail; if(state.worldId==='road-design')setTourActive(state.active) }
    window.addEventListener(GUIDE_AUTOPLAY_STATE_EVENT,listener)
    return ()=>window.removeEventListener(GUIDE_AUTOPLAY_STATE_EVENT,listener)
  },[])
  const firstView = useRef(true)
  const [readout, setReadout] = useState(runtime.simulation.metrics)
  const stage = useRef<HTMLDivElement>(null)
  const capture = query('capture') === '1'
  const interact = useCallback(() => controls.registerInteraction(), [controls])
  const conflicts = useMemo(() => summarizeConflicts(runtime.conflicts), [network])
  const cost = design.cost
  useEffect(() => { controls.completeOnboarding() }, [controls])
  useEffect(() => {
    if (firstView.current) { firstView.current = false; return }
    setViewChanging(true)
    const switchView = window.setTimeout(() => setRenderBlueprint(blueprint), 300)
    const settle = window.setTimeout(() => setViewChanging(false), 650)
    return () => { clearTimeout(switchView); clearTimeout(settle) }
  }, [blueprint])
  useEffect(() => {
    if (runtime.pressure?.status !== 'running') {
      runtime.simulation.setDemandMultiplier(demand)
      setReadout({ ...runtime.simulation.refreshMetrics() })
    }
  }, [runtime, demand])
  useEffect(() => {
    setReadout(runtime.simulation.metrics)
    const timer = window.setInterval(() => {
      setReadout({ ...runtime.simulation.metrics })
      if (runtime.pressure) {
        if(runtime.pressure.status!=='stopped')setDemand(runtime.simulation.demandMultiplier)
        setCurves(previous => ({ ...previous, [designId]: [...runtime.pressure!.samples] }))
      }
      if (stage.current) {
        stage.current.dataset.vehicles = String(runtime.simulation.vehicles.length)
        stage.current.dataset.stepMs = runtime.stepMs.toFixed(3)
        stage.current.dataset.frameMs = runtime.frameMs.toFixed(2)
        stage.current.dataset.warmupMs = runtime.warmupMs.toFixed(1)
        stage.current.dataset.simTime = runtime.simulation.time.toFixed(2)
        stage.current.dataset.pendingSimSeconds = runtime.pendingSimSeconds.toFixed(2)
        stage.current.dataset.packets = String(runtime.revision)
        stage.current.dataset.pressure = runtime.pressure?.status ?? 'idle'
        stage.current.dataset.pressureSamples = String(runtime.pressure?.samples.length ?? 0)
      }
    }, 500)
    return () => clearInterval(timer)
  }, [runtime, designId])
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const listener = () => { setReducedMotion(media.matches); if (media.matches) setPlaying(false) }
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [])
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setShowCompare(false); setExpanded(false); return }
      if ((event.target as HTMLElement)?.matches('input,select,textarea,button') || event.metaKey || event.ctrlKey || event.altKey) return
      if (event.code === 'Space') { event.preventDefault(); setPlaying(p => !p); interact() }
      if (event.key === '[') { setSpeed(s => s === 16 ? 4 : 1); interact() }
      if (event.key === ']') { setSpeed(s => s === 1 ? 4 : 16); interact() }
      if (event.key.toLowerCase() === 'b') { setBlueprint(value => !value); interact() }
      const index = Number(event.key) - 1
      if (index >= 0 && index < 4) { setPreset(PRESETS[index].id); setRevision(r => r + 1); interact() }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [interact])
  const selectDesign = (next: DesignInfo) => {
    if (runtime.pressure?.status === 'running') setSpeed(1)
    runtime.stopPressure()
    if (runtime.pressure) setCurves(previous => ({ ...previous, [designId]: [...runtime.pressure!.samples] }))
    if (!manualShutter.current) setShutter(next.id === 'cloverleaf' ? 8 : 6)
    const defaults = defaultOverlays(next.id)
    setShowConflicts(manualOverlays.current.conflicts ?? defaults.conflicts)
    setHighlightLeft(manualOverlays.current.left ?? defaults.left)
    setStretch(next.chapter > 1 && (manualOverlays.current.stretch ?? defaults.stretch))
    setShowWeaving(manualOverlays.current.weaving ?? defaults.weaving)
    requestDesign(next.id); setDemand(1); setPreset('overview'); setRevision(r => r + 1); interact()
  }
  const pressureRunning = runtime.pressure?.status === 'running'
  const pressureProgress = runtime.pressure ? Math.min(1, (runtime.simulation.time - runtime.pressure.startedAt) / runtime.pressure.duration) : 0
  useEffect(() => { if (runtime.pressure?.status === 'complete') setSpeed(1) }, [runtime.pressure?.status])
  useEffect(() => {
    const selected = stage.current?.querySelector<HTMLButtonElement>('.rd-catalog button[aria-pressed=true]')
    const catalog = stage.current?.querySelector<HTMLElement>('.rd-catalog')
    if (selected && catalog) catalog.scrollTo({ left: selected.offsetLeft - catalog.clientWidth / 2 + selected.clientWidth / 2, behavior: 'smooth' })
  }, [designId])
  const startPressure = () => {
    if (pressureRunning) { runtime.stopPressure(); setSpeed(1); setReadout({ ...runtime.simulation.metrics }) }
    else { runtime.startPressure(2.5); setShowPressure(true); setExpanded(true); setPlaying(true); setSpeed(16); setReadout({ ...runtime.simulation.metrics }) }
    interact()
  }
  const format = (value: number) => Math.round(value).toLocaleString('en-US')
  const overlayButtons = <>
    <button type="button" data-overlay="left" aria-pressed={highlightLeft} onClick={() => { manualOverlays.current.left = !highlightLeft; setHighlightLeft(!highlightLeft); interact() }}>{tx('左转高亮')}</button>
    {design.chapter > 1 && <button type="button" data-overlay="stretch" aria-pressed={stretch} onClick={() => { manualOverlays.current.stretch = !stretch; setStretch(!stretch); interact() }}>{tx('层高拉伸')}</button>}
    {!!network.weaving.length && <button type="button" data-overlay="weaving" aria-pressed={showWeaving} onClick={() => { manualOverlays.current.weaving = !showWeaving; setShowWeaving(!showWeaving); interact() }}>{tx('交织段')}</button>}
  </>
  const overlayTools = <div className="rd-overlay-tools rd-mobile-overlays">{overlayButtons}</div>
  const tools = <div className="rd-tools">
    {overlayTools}
    <div className="rd-mobile-tools">
      <button type="button" aria-pressed={blueprint} onClick={() => { setBlueprint(value => !value); interact() }}>{tx('图纸')}</button>
      <button type="button" aria-pressed={showCompare} onClick={() => { setShowCompare(value => !value); interact() }}>{tx('对比')}</button>
      <button type="button" className="rd-tour-button" onClick={() => { setBlueprint(false); setShowCompare(false); window.dispatchEvent(new CustomEvent(GUIDE_REPLAY_EVENT,{detail:{worldId:'road-design'}})); interact() }}>{tx('导览')}</button>
    </div>
    <label>{tx('需求倍率')}<input aria-label={tx('需求倍率')} type="range" min="0.25" max="2.5" step="0.05" value={demand} onChange={e => { if (runtime.pressure?.status === 'running') setSpeed(1); runtime.stopPressure(); setDemand(Number(e.target.value)); interact() }} /><output>{demand.toFixed(2)}×</output></label>
    <label>{tx('快门')}<input aria-label={tx('快门')} type="range" min="0" max="15" step="0.5" value={shutter} onChange={e => { manualShutter.current = true; setShutter(Number(e.target.value)); interact() }} /><output>{shutter.toFixed(1)} s</output></label>
    <button type="button" className="rd-pressure-toggle" aria-pressed={pressureRunning} onClick={startPressure}>{tx(pressureRunning ? '停止压力测试' : '压力测试')}</button>
    <div className="rd-camera-presets experience-freebar-seg" role="group" aria-label={tx('镜头')}>
      {PRESETS.map(p => <button key={p.id} type="button" aria-pressed={preset === p.id} onClick={() => { setPreset(p.id); setRevision(r => r + 1); interact() }}>{tx(p.name)}</button>)}
    </div>
  </div>
  return <div ref={stage} className="road-design-experience" data-design={designId} data-capture={capture} data-blueprint={renderBlueprint} data-left-highlight={highlightLeft} data-stretch={stretch} data-conflicts={showConflicts} data-weaving={showWeaving} data-guide={tourActive}>
    <RoadCanvas design={design} network={network} runtime={runtime} playing={playing} speed={speed} shutter={shutter} showConflicts={showConflicts} highlightLeft={highlightLeft} stretch={stretch} showWeaving={showWeaving} preset={preset} revision={revision} reducedMotion={reducedMotion} blueprint={renderBlueprint} interact={interact} />
    <div className="rd-view-transition" data-changing={viewChanging} aria-hidden="true" />
    {designId === 'huangjuewan' && <div className="rd-attribution"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a><small>{tx('高度由图层与净空约束反推，非实测高程')}</small></div>}
    {!capture && <>
      <GuideTour worldId="road-design" placement="stage" steps={DESIGNS.map(d=>({title:tx(d.name),body:tx(TOUR[d.id]),durationMs:12000,action:()=>{selectDesign(d);setPlaying(true);setSpeed(1)}}))} kicker={tx('道路图鉴')} exitLabel={tx('结束导览')} stagePlan={DESIGNS.map(()=>({position:'center-left',mobilePosition:'bottom-center',tone:'dark',width:'narrow',treatment:'caption'}))} />
      <header className="rd-heading" data-experience-overlay="true"><h1>{tx('路口与立交')}</h1><p>{tx(design.name)}</p><button type="button" className="rd-tour-button" onClick={() => { setBlueprint(false); setShowCompare(false); window.dispatchEvent(new CustomEvent(GUIDE_REPLAY_EVENT,{detail:{worldId:'road-design'}})); interact() }}>{tx('导览')}</button></header>
      <aside className="rd-instruments" data-expanded={expanded} aria-label={tx('交通读数')} data-experience-overlay="true">
        <button className="rd-summary" type="button" aria-expanded={expanded} onClick={() => { setExpanded(value => !value); interact() }}><span>{tx('冲突点')} <b>{conflicts.total}</b></span><span>{format(readout.throughput)} <small>{tx('辆/时')}</small></span><span>+{Math.round(readout.averageDelay)} s</span><i>{expanded ? '−' : '+'}</i></button>
        <div className="rd-instrument-detail">
        <div className="rd-conflict-count"><span>{tx('冲突点')}</span><strong>{conflicts.total}</strong></div>
        <div className="rd-conflict-key"><span><i className="is-crossing" />{tx('交叉')} {conflicts.crossing}</span><span><i className="is-merge" />{tx('合流')} {conflicts.merge}</span><span><i className="is-diverge" />{tx('分流')} {conflicts.diverge}</span></div>
        <div className="rd-flow-pair"><div><span>{tx('需求')}</span><strong>{format(readout.demand)}</strong></div><i>/</i><div><span>{tx('通过量')}</span><strong>{format(readout.throughput)}</strong></div><small>{tx('辆/时')}</small></div>
        <dl>
          <div><dt>{tx('平均速度')}</dt><dd>{Math.round(readout.averageSpeed * 3.6)} <small>km/h</small></dd></div>
          <div><dt>{tx('平均延误')}</dt><dd>+{Math.round(readout.averageDelay)} <small>s</small></dd></div>
          <div><dt>{tx('在网车辆')}</dt><dd>{format(readout.vehicles)}</dd></div>
          <div><dt>{tx('画面外排队')}</dt><dd>{format(readout.outsideQueue)}</dd></div>
        </dl>
        <div className="rd-cost"><h2>{tx('代价')}</h2><dl><div><dt>{tx('层数')}</dt><dd>{cost.layers}</dd></div><div><dt>{tx('最高路面')}</dt><dd>{cost.maximumHeight.toFixed(1)} <small>m</small></dd></div><div><dt>{tx('桥面面积')}</dt><dd>{format(cost.bridgeArea)} <small>m²</small></dd></div><div><dt>{tx('匝道总长')}</dt><dd>{(cost.rampLength / 1000).toFixed(2)} <small>km</small></dd></div></dl><p>{tx('占地（路面 + 围死的地）')} <b>{(cost.landArea / 10000).toFixed(1)} ha</b></p></div>
        {stretch && <p className="rd-stretch-note">{tx('竖向已放大 2.5×')}</p>}
        {PRESENTATIONS[designId].phases && <PhaseRings control={network.control} time={runtime.simulation.time} dual={designId === 'diamond'} />}
        <p className="rd-why">{tx(design.description)}</p>
        <small className="rd-window">{tx('核心区断面 · 最长 5 分钟')}</small>
        {showPressure && <PressurePanel curves={curves} designs={DESIGNS} current={designId} running={pressureRunning} progress={pressureProgress} speed={speed} />}
        </div>
      </aside>
      {showCompare && <CompareTable designs={DESIGNS} curves={curves} current={designId} onSelect={next => { selectDesign(next); setShowCompare(false) }} onClose={() => setShowCompare(false)} />}
      <nav className="rd-catalog" aria-label={tx('道路图鉴')} data-experience-overlay="true">
        {[{ chapter: 1, name: '平面交叉' }, { chapter: 2, name: '服务型立交' }, { chapter: 3, name: '枢纽型立交' }, { chapter: 4, name: '真实案例' }].filter(group => DESIGNS.some(d => d.chapter === group.chapter)).map(group => <div className="rd-catalog-group" key={group.chapter}>
          <span className="rd-chapter">{tx(group.name)}</span>
          <div>{DESIGNS.filter(d => d.chapter === group.chapter).map(d => <button key={d.id} type="button" data-design-id={d.id} aria-busy={pendingId===d.id} aria-pressed={designId === d.id} onClick={() => selectDesign(d)}><Diagram id={d.id} /><span>{tx(d.name)}</span></button>)}</div>
        </div>)}
      </nav>
      <Freebar ariaLabel={tx('交通与镜头')} className="rd-freebar" mainClassName="rd-freebar-main" secondary={tools} secondaryDefault="closed">
        <button type="button" className="experience-freebar-play" aria-label={tx(playing ? '暂停' : '播放')} data-playing={playing} onClick={() => { setPlaying(!playing); interact() }}>{playing ? <Pause weight="fill" /> : <Play weight="fill" />}</button>
        <div className="experience-freebar-seg" role="group" aria-label={tx('模拟速度')}>{[1, 4, 16].map(s => <button key={s} type="button" aria-pressed={speed === s} onClick={() => { setSpeed(s); interact() }}>{s}×</button>)}</div>
        <button type="button" className="rd-conflicts-toggle" aria-pressed={showConflicts} onClick={() => { manualOverlays.current.conflicts = !showConflicts; setShowConflicts(!showConflicts); interact() }}>{tx('冲突点')}</button>
        <div className="rd-desktop-control rd-overlay-main">{overlayButtons}</div>
        <button type="button" className="rd-desktop-control" aria-pressed={blueprint} onClick={() => { setBlueprint(value => !value); interact() }}>{tx('图纸')}</button>
        <button type="button" className="rd-desktop-control" aria-pressed={showCompare} onClick={() => { setShowCompare(value => !value); interact() }}>{tx('对比')}</button>
      </Freebar>
      {designId === 'cloverleaf' && revision === 0 && <GhostHint worldId="road-design" delay={45000} gesture={{ type: 'tap', target: '[data-design-id="t-junction"]', label: tx('换一种路口，看车流怎样改变') }} />}
    </>}
  </div>
}
