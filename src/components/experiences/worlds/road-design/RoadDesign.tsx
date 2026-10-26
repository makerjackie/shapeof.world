import './styles/RoadDesign.css'
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer, N8AO, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { Pause, Play } from '@phosphor-icons/react'
import * as T from 'three'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { GuideTour, GUIDE_REPLAY_EVENT } from '~/components/experiences/GuideTour'
import { TOUR } from './tour'
import { isWorldPaused } from '~/lib/world-playback'
import { useExperienceI18n } from '~/i18n/experience'
import { useI18n } from '~/i18n'
import { CATALOGUE as DESIGNS, type DesignInfo } from './designs/catalogue'
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
import { PRESENTATIONS } from './presentation'
import { PhaseRings } from './PhaseRings'
import { DisplayStretch } from './scene/DisplayStretch'
import { highestDeckTexture } from './scene/deck-shadow'
import { CityLights } from './scene/CityLights'
import { buildExploreRoutes } from './explorer/routes'
import { ExplorerPanel } from './explorer/ExplorerPanel'
import { EntryArrows, RouteScene, WhyMarker, INITIAL_DEMO } from './explorer/RouteScene'
import { explanationPins, DESIGN_SUMMARY, DESIGN_SUMMARY_EN } from './explorer/explanations'
import type { DemoReplay, DemoState } from './explorer/replay'
import type { ExploreRoute } from './explorer/routes'
import type { WhyPin } from './explorer/explanations'
import { WaitingOutline } from './scene/WaitingOutline'
import { GroundNames, Navigation } from './explorer/Navigation'
import { ConflictLegend } from './explorer/ConflictLegend'

function query(name: string) { return typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get(name) }
function numberQuery(name: string, fallback: number, max: number) {
  const value = Number(query(name) ?? fallback)
  return Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : fallback
}
const PRESETS: { id: CameraPreset; name: string }[] = [{ id: 'overview', name: '鸟瞰' }, { id: 'top', name: '俯视' }, { id: 'close', name: '近看' }, { id: 'low', name: '路面' }]

interface ExplorerSceneState { routes:ExploreRoute[]; route?:ExploreRoute; replay:DemoReplay|null; revision:number; demo:React.MutableRefObject<DemoState>; follow:boolean; pins:WhyPin[]; activePin:string|null; explaining:boolean; onSelect:(id:string)=>void; onPin:(id:string)=>void; onStopFollow:()=>void }

const Scene = memo(function Scene({ design, network, runtime, speed, playing, shutter, showConflicts, stretch, showWeaving, preset, revision, reducedMotion, blueprint, interact, onDprChange, buildings, traffic, explorer }: {
  design: DesignInfo; network: Network; runtime: TrafficRuntime; speed: number; playing: boolean; shutter: number; showConflicts: boolean; buildings:boolean; traffic:boolean; explorer:ExplorerSceneState; stretch: boolean; showWeaving: boolean; preset: CameraPreset; revision: number; reducedMotion: boolean; blueprint: boolean; interact: () => void; onDprChange?:(dpr:number)=>void
}) {
  const seenBlueprint = useMemo(()=>({current:false}),[network])
  if(blueprint)seenBlueprint.current=true
  const signalTime=useMemo(()=>({time:0}),[runtime])
  const lamps = runtime.lamps
  const atlas = useMemo(() => makeLightingAtlas(lamps,runtime.lighting), [lamps,runtime])
  const conflicts = runtime.conflicts
  const roof = useMemo(() => highestDeckTexture(runtime.roof), [runtime])
  useEffect(() => () => roof.dispose(), [roof])
  useEffect(() => () => atlas.dispose(), [atlas])
  useFrame(({scene,camera}, delta) => {
    // A full O-D can put the camera kilometres above the interchange. Preserve
    // the night contrast instead of letting the original near-view fog wash it out.
    if(!blueprint&&scene.fog instanceof T.FogExp2)scene.fog.density=.00019*(explorer.route?Math.min(1,400/camera.position.length()):1)
    signalTime.time=explorer.route&&explorer.replay?explorer.demo.current.time:runtime.simulation.time
    runtime.frameMs = runtime.frameMs * 0.9 + delta * 1000 * 0.1
    const frozen=!playing||document.hidden||isWorldPaused()
    runtime.setFrozen(frozen)
    if(!frozen)runtime.advance(Math.min(delta,0.1)*speed)
  }, -2)
  return <>
    <FrameBudget version={`${network.id}:${blueprint}:${stretch}:${preset}:${revision}`} onDprChange={onDprChange} />
    {query('profile')==='1' && <RenderProbe runtime={runtime} />}
    <NightWorld network={network} atlas={atlas} visible={!blueprint} buildings={buildings} />
    {blueprint && <><color attach="background" args={['#07121f']} /><fogExp2 attach="fog" args={['#07121f',.00015]} /><ambientLight intensity={.65} color="#8ab4ff" /><BlueprintGround network={network} /></>}
    <DisplayStretch network={network} enabled={stretch}>
      {seenBlueprint.current && <group visible={blueprint}><Blueprint key={network.id} network={network} runtime={runtime} /></group>}
      <group visible={!blueprint}>
        <RoadMeshes network={network} atlas={atlas} runtime={runtime} simulation={signalTime} roof={roof} />
        <CityLights lamps={lamps} network={network} />
        {design.id === 'crossroads-channelized' && <WaitingOutline network={network} />}
      </group>
      {traffic&&(!explorer.route||network.control.kind==='free')&&<><Vehicles runtime={runtime} dim={!!explorer.route} /><LightTrails runtime={runtime} shutter={shutter} blueprint={blueprint} dim={!!explorer.route} /></>}
      {(showConflicts || showWeaving) && <ConflictMarkers network={network} conflicts={showConflicts ? conflicts : []} showWeaving={showWeaving} />}
    </DisplayStretch>
    {!explorer.route&&!explorer.explaining&&<EntryArrows routes={explorer.routes} onSelect={explorer.onSelect} />}
    <GroundNames network={network} routes={explorer.routes} route={explorer.route}/>
    <Navigation route={explorer.route}/>
    {explorer.route&&<RouteScene route={explorer.route} replay={explorer.replay} revision={explorer.revision} playing={playing&&!isWorldPaused()} demo={explorer.demo} pins={explorer.pins} activePin={explorer.activePin} onPin={explorer.onPin} explaining={explorer.explaining} traffic={traffic} />}
    {!explorer.route&&explorer.explaining&&explorer.pins.map((p,i)=><WhyMarker key={p.id} pin={p} number={i+1} active={explorer.activePin===p.id} onClick={()=>explorer.onPin(p.id)}/>)}
    <CameraRig route={explorer.route} follow={explorer.follow} demo={explorer.demo} onStopFollow={explorer.onStopFollow} design={design} preset={preset} revision={revision} reducedMotion={reducedMotion} onInteract={interact} />
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
  return <Canvas camera={{position:[350,250,380],fov:35,near:.3,far:24000}} dpr={dpr.current} gl={{antialias:false,alpha:false,powerPreference:'high-performance',toneMapping:T.NoToneMapping}}><Scene {...props} onDprChange={rememberDpr} /></Canvas>
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
  useEffect(()=>()=>{const previous=active.current;active.current=null;previous?.dispose()},[])
  if(error)throw error
  if(!runtime)return <div className="road-design-experience" data-loading="true" />
  return <RoadDesignSession controls={controls} runtime={runtime} requestDesign={requestDesign} pendingId={requested===runtime.network.id?null:requested} />
}

function RoadDesignSession({controls,runtime,requestDesign,pendingId}:{controls:ExperienceControls;runtime:TrafficRuntime;requestDesign:(id:string)=>void;pendingId:string|null}) {
  const {locale}=useI18n(),tx=useExperienceI18n(), network=runtime.network, designId=network.id, design=DESIGNS.find(d=>d.id===designId)!
  const [playing,setPlaying]=useState(()=>!window.matchMedia('(prefers-reduced-motion: reduce)').matches),[speed,setSpeed]=useState(1),[shutter,setShutter]=useState(8)
  const [demand,setDemand]=useState(1),[buildings,setBuildings]=useState(true),[traffic,setTraffic]=useState(true)
  const [blueprint,setBlueprint]=useState(false),[showConflicts,setShowConflicts]=useState(false),[showWeaving,setShowWeaving]=useState(false),[stretch,setStretch]=useState(false)
  const [preset,setPreset]=useState<CameraPreset>('overview'),[revision,setRevision]=useState(0)
  const [showMore,setShowMore]=useState(false),[showCompare,setShowCompare]=useState(false),[showPressure,setShowPressure]=useState(false)
  const [curves,setCurves]=useState<PressureCurves>({}),[readout,setReadout]=useState(runtime.simulation.metrics)
  const [selected,setSelected]=useState<string|null>(null),[follow,setFollow]=useState(false),[replay,setReplay]=useState<DemoReplay|null>(null),[replayRevision,setReplayRevision]=useState(0)
  const [explaining,setExplaining]=useState(false),[activePin,setActivePin]=useState<string|null>(null)
  const demo=useRef<DemoState>({...INITIAL_DEMO}),[demoReadout,setDemoReadout]=useState<DemoState>({...INITIAL_DEMO})
  const stage=useRef<HTMLDivElement>(null), capture=query('capture')==='1'
  const [reducedMotion]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const interact=useCallback(()=>controls.registerInteraction(),[controls])
  const routes=useMemo(()=>buildExploreRoutes(network,runtime.conflicts),[network,runtime])
  const route=routes.find(r=>`${designId}:${r.movement.id}`===selected)
  const pins=useMemo(()=>explanationPins(network,route).filter(p=>!route||explaining||p.laneIds.some(id=>route.laneIds.includes(id))&&(network.id!=='crossroads-signal'||p.id!=='gap'||route.movement.turn==='left')),[network,route,explaining])
  const exit=useCallback(()=>{setSelected(null);setFollow(false);setReplay(null);setActivePin(null);setRevision(r=>r+1);interact()},[interact])
  const selectRoute=useCallback((id:string)=>{setSelected(prev=>prev===`${designId}:${id}`?null:`${designId}:${id}`);setFollow(false);setReplay(null);setPlaying(true);setSpeed(1);setStretch(false);setExplaining(false);setActivePin(null);setRevision(r=>r+1);interact()},[interact,designId])
  const stopFollow=useCallback(()=>setFollow(false),[])
  const pin=useCallback((id:string)=>{setActivePin(id);interact()},[interact])
  useEffect(()=>{controls.completeOnboarding()},[controls])
  // Reset on the user's design-change event, not in an arrival effect. The
  // latter can erase a route selected immediately after the new panel appears.
  // Scope selection by design because many networks reuse north-east IDs.
  useEffect(()=>{
    if(!route)return
    let cancelled=false
    demo.current={...INITIAL_DEMO,position:route.path.points[0]};setDemoReadout({...demo.current})
    runtime.prepareDemo(route.movement.id).then(value=>{if(!cancelled)setReplay(value)})
    return()=>{cancelled=true}
  },[route,runtime])
  useEffect(()=>{if(runtime.pressure?.status!=='running')runtime.simulation.setDemandMultiplier(demand)},[runtime,demand])
  useEffect(()=>{
    const timer=setInterval(()=>{
      setReadout({...runtime.simulation.metrics});setDemoReadout({...demo.current,others:undefined})
      if(runtime.pressure){setCurves(c=>({...c,[designId]:[...runtime.pressure!.samples]}));if(runtime.pressure.status==='complete')setSpeed(1)}
      if(stage.current){stage.current.dataset.vehicles=String(runtime.simulation.vehicles.length);stage.current.dataset.frameMs=runtime.frameMs.toFixed(2);stage.current.dataset.demoStatus=demo.current.status;stage.current.dataset.demoProgress=demo.current.progress.toFixed(3);stage.current.dataset.demoLane=demo.current.laneId}
    },200)
    return()=>clearInterval(timer)
  },[runtime,designId])
  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){exit();setShowCompare(false);setShowMore(false);setExplaining(false);return}
      if((event.target as HTMLElement)?.matches('input,select,textarea,button')||event.metaKey||event.ctrlKey||event.altKey)return
      if(event.code==='Space'){event.preventDefault();setPlaying(p=>!p);interact()}
    }
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)
  },[exit,interact])
  const selectDesign=(next:DesignInfo)=>{runtime.stopPressure();exit();setExplaining(false);requestDesign(next.id);setDemand(1);setSpeed(1);setPreset('overview');setRevision(r=>r+1);interact()}
  const effectivePin=activePin??(designId==='crossroads-signal'&&demoReadout.status==='yield'?'gap':undefined)??pins.filter(p=>p.laneIds.includes(demoReadout.laneId)).sort((a,b)=>Math.hypot(a.position.x-demoReadout.position.x,a.position.z-demoReadout.position.z)-Math.hypot(b.position.x-demoReadout.position.x,b.position.z-demoReadout.position.z))[0]?.id??pins[0]?.id??null
  const explorer=useMemo(()=>({routes,route,replay,revision:replayRevision,demo,follow,pins,activePin:effectivePin,explaining,onSelect:selectRoute,onPin:pin,onStopFollow:stopFollow}),[routes,route,replay,replayRevision,follow,pins,effectivePin,explaining,selectRoute,pin,stopFollow])
  const pressureRunning=runtime.pressure?.status==='running'
  const startPressure=()=>{exit();if(pressureRunning){runtime.stopPressure();setSpeed(1)}else{runtime.startPressure(2.5);setShowPressure(true);setPlaying(true);setSpeed(16)};interact()}
  const layers=[{key:'buildings',name:'城市建筑',value:buildings,set:setBuildings},{key:'traffic',name:'车流',value:traffic,set:setTraffic},{key:'blueprint',name:'平面图纸',value:blueprint,set:setBlueprint},{key:'conflicts',name:'冲突点',value:showConflicts,set:setShowConflicts}]
  return <div ref={stage} className="road-design-experience" data-design={designId} data-capture={capture} data-buildings={buildings} data-traffic={traffic} data-blueprint={blueprint} data-selected-route={route?.movement.id??''} data-follow={follow} data-conflicts={showConflicts}>
    <RoadCanvas design={design} network={network} runtime={runtime} playing={playing} speed={speed} shutter={shutter} showConflicts={showConflicts} stretch={stretch} showWeaving={showWeaving} preset={preset} revision={revision} reducedMotion={reducedMotion} blueprint={blueprint} interact={interact} buildings={buildings} traffic={traffic} explorer={explorer}/>
    {designId==='huangjuewan'&&<div className="rd-attribution"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a><small>{tx('高度由图层与净空约束反推，非实测高程')}</small></div>}
    {!capture&&<>
      <GuideTour worldId="road-design" placement="stage" steps={DESIGNS.map(d=>({title:tx(d.name),body:tx(TOUR[d.id]),durationMs:12000,action:()=>{selectDesign(d);setPlaying(true)}}))} kicker={tx('道路图鉴')} exitLabel={tx('结束导览')} stagePlan={DESIGNS.map(()=>({position:'center-left',mobilePosition:'bottom-center',tone:'dark',width:'narrow',treatment:'caption'}))}/>
      <header className="rd-heading" data-experience-overlay="true"><label htmlFor="rd-design">{tx('选设计')}</label><select id="rd-design" aria-label={tx('选设计')} value={pendingId??designId} onChange={e=>selectDesign(DESIGNS.find(d=>d.id===e.target.value)!)}>{DESIGNS.map(d=><option key={d.id} value={d.id}>{tx(d.name)}</option>)}</select><p>{tx((locale==='en'?DESIGN_SUMMARY_EN[designId]:DESIGN_SUMMARY[designId])??design.description)}</p></header>
      <div className="rd-layers" role="group" aria-label={tx('图层')} data-experience-overlay="true">{layers.map(l=><button key={l.key} type="button" data-layer={l.key} title={l.key==='buildings'&&blueprint?tx('平面图纸暂不显示建筑，夜景保留此开关'):undefined} aria-pressed={l.value} onClick={()=>{l.set(!l.value);interact()}}><i/>{tx(l.name)}</button>)}{blueprint&&<small className="rd-layer-note">{tx('平面图纸暂不显示建筑，夜景保留此开关')}</small>}</div>
      {pendingId&&<div className="rd-pending" role="status">{tx('正在载入道路')}</div>}
      {showConflicts&&<div className="rd-conflict-legend" data-experience-overlay="true"><ConflictLegend/></div>}
      <ExplorerPanel key={designId} network={network} routes={routes} route={route} onSelect={selectRoute} onExit={exit} onReplay={()=>{setReplayRevision(v=>v+1);setRevision(v=>v+1);setPlaying(true);interact()}} follow={follow} onFollow={()=>{setFollow(v=>!v);if(follow)setRevision(r=>r+1);interact()}} demo={demoReadout} pins={pins} activePin={effectivePin} onPin={pin} explaining={explaining} onExplain={()=>{setExplaining(v=>!v);interact()}} onDesign={id=>selectDesign(DESIGNS.find(d=>d.id===id)!)}/>
      <nav className="rd-catalog" aria-label={tx('道路图鉴')} data-experience-overlay="true">{DESIGNS.map(d=><button key={d.id} type="button" data-design-id={d.id} aria-busy={pendingId===d.id} aria-pressed={designId===d.id} onClick={()=>selectDesign(d)}><Diagram id={d.id}/><span>{tx(d.name)}</span></button>)}</nav>
      <div className="rd-main-tools" data-experience-overlay="true"><button type="button" aria-label={tx(playing?'暂停':'播放')} onClick={()=>{setPlaying(v=>!v);interact()}}>{playing?<Pause weight="fill"/>:<Play weight="fill"/>}</button><button type="button" onClick={()=>{setFollow(false);setPreset(preset==='top'?'overview':'top');setRevision(r=>r+1);interact()}}>{tx(preset==='top'?'鸟瞰':'俯视')}</button><button type="button" aria-pressed={showCompare} onClick={()=>setShowCompare(v=>!v)}>{tx('设计对比')}</button><button type="button" aria-expanded={showMore} onClick={()=>setShowMore(v=>!v)}>{tx('更多')}</button></div>
      {showMore&&<section className="rd-more" aria-label={tx('更多')} data-experience-overlay="true"><header><strong>{tx('交通与镜头')}</strong><button type="button" aria-label={tx('关闭')} onClick={()=>setShowMore(false)}>×</button></header>
        <label>{tx('需求倍率')}<input aria-label={tx('需求倍率')} type="range" min="0.25" max="2.5" step="0.05" value={demand} onChange={e=>{runtime.stopPressure();setDemand(Number(e.target.value));interact()}}/><output>{demand.toFixed(2)}×</output></label>
        <label>{tx('快门')}<input aria-label={tx('快门')} type="range" min="0" max="15" step="0.5" value={shutter} onChange={e=>setShutter(Number(e.target.value))}/><output>{shutter.toFixed(1)} s</output></label>
        <div className="rd-more-row">{[1,4,16].map(v=><button key={v} type="button" aria-pressed={speed===v} onClick={()=>setSpeed(v)}>{v}×</button>)}<span>{tx('环境车流速度')}</span></div>
        <div className="rd-more-row">{PRESETS.map(p=><button key={p.id} type="button" aria-pressed={preset===p.id} disabled={!!route&&(p.id==='close'||p.id==='low')} onClick={()=>{setFollow(false);setPreset(p.id);setRevision(r=>r+1)}}>{tx(p.name)}</button>)}</div>
        <div className="rd-more-row"><button type="button" aria-pressed={showWeaving} onClick={()=>setShowWeaving(v=>!v)}>{tx('交织段')}</button><button type="button" disabled={!!route} aria-pressed={stretch} onClick={()=>setStretch(v=>!v)}>{tx('层高拉伸')}</button><button type="button" onClick={()=>window.dispatchEvent(new CustomEvent(GUIDE_REPLAY_EVENT,{detail:{worldId:'road-design'}}))}>{tx('导览')}</button></div>
        <dl className="rd-route-readings"><div><dt>{tx('需求')}</dt><dd>{Math.round(readout.demand)}</dd></div><div><dt>{tx('通过量')}</dt><dd>{Math.round(readout.throughput)} <small>{tx('辆/时')}</small></dd></div><div><dt>{tx('平均延误')}</dt><dd>{Math.round(readout.averageDelay)} s</dd></div><div><dt>{tx('画面外排队')}</dt><dd>{readout.outsideQueue}</dd></div></dl>
        <button type="button" className="rd-pressure-toggle" aria-pressed={pressureRunning} onClick={startPressure}>{tx(pressureRunning?'停止压力测试':'压力测试')}</button>
        {showPressure&&<PressurePanel curves={curves} designs={DESIGNS} current={designId} running={pressureRunning} progress={runtime.pressure?Math.min(1,(runtime.simulation.time-runtime.pressure.startedAt)/runtime.pressure.duration):0} speed={speed}/>}
        {PRESENTATIONS[designId].phases&&<PhaseRings control={network.control} time={runtime.simulation.time} dual={designId==='diamond'}/>}
      </section>}
      {showCompare&&<CompareTable designs={DESIGNS} curves={curves} current={designId} onSelect={next=>{selectDesign(next);setShowCompare(false)}} onClose={()=>setShowCompare(false)}/>}
    </>}
  </div>
}
