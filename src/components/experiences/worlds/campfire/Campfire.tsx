import './styles/Campfire.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, SpeakerHigh, SpeakerSlash, Fire, Scan, CirclesThree, X } from '@phosphor-icons/react'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { GuideTour } from '~/components/experiences/GuideTour'
import { Freebar } from '~/components/experiences/Freebar'
import { useExperienceI18n } from '~/i18n/experience'
import { INITIAL_SLICE, type Reading, type Slice } from './fields'
import { ANATOMY, type AnatomyId } from './anatomy'
import type { Instruments } from './measurements'
import { AnatomyPins, AnatomyCard } from './components/AnatomyOverlay'
import { InspectionPanel } from './components/InspectionPanel'
import { InstrumentPanel } from './components/InstrumentPanel'
import { createCampfire, type CampfireRuntime, type CampfireStats } from './runtime.js'

const FALLBACK_URL=import.meta.env.VITE_CAMPFIRE_VIDEO_URL||(import.meta.env.DEV?'/.local/campfire/campfire-loop.mp4':'/assets/campfire/campfire-loop.mp4')
export function Campfire({ controls }: { controls: ExperienceControls }) {
  const tx=useExperienceI18n()
  const canvas=useRef<HTMLCanvasElement>(null),video=useRef<HTMLVideoElement>(null),runtime=useRef<CampfireRuntime|null>(null)
  const menu=useRef<HTMLDetailsElement>(null),planeDrag=useRef<{x:number;y:number;offset:number}|null>(null)
  const interact=useRef(controls.registerInteraction);interact.current=controls.registerInteraction
  const [stage,setStage]=useState(0),[failure,setFailure]=useState(false),[videoFailed,setVideoFailed]=useState(false)
  const [slice,setSlice]=useState<Slice>({...INITIAL_SLICE}),[reading,setReading]=useState<Reading|null>(null),[saved,setSaved]=useState<Reading|null>(null)
  const [paused,setPaused]=useState(false),[speed,setSpeed]=useState(1),[sound,setSound]=useState(false),[soundBusy,setSoundBusy]=useState(false),[soundError,setSoundError]=useState(false)
  const [stats,setStats]=useState<CampfireStats>({fps:0,time:0,grid:'',pixelScale:1}),[meters,setMeters]=useState<Instruments|null>(null)
  const [guide,setGuide]=useState(false),[bounds,setBounds]=useState(false),[instrumentOpen,setInstrumentOpen]=useState(false)
  const [annotations,setAnnotations]=useState(false),[station,setStation]=useState<AnatomyId|null>(null),[blue,setBlue]=useState(false),[quality,setQuality]=useState<'low'|'med'>('low')
  useEffect(()=>{
    const abort=new AbortController();setStage(0);setFailure(false);setMeters(null);setReading(null);setSaved(null);setSound(false)
    createCampfire(canvas.current!,{signal:abort.signal,quality,onProgress:setStage,onReading:setReading,onStats:setStats,onMetrics:setMeters,onInteract:()=>interact.current(),onError:e=>{console.error('Campfire runtime:',e);setFailure(true);runtime.current?.dispose()}}).then(r=>{
      if(abort.signal.aborted){r.dispose();return}runtime.current=r
      r.setSlice(slice);r.setAnnotations(annotations);r.setBlue(blue)
      if(import.meta.env.DEV)Object.assign(window,{__campfire:r})
    }).catch(e=>{if(!abort.signal.aborted){console.error('Campfire initialization:',e);setFailure(true)}})
    return()=>{abort.abort();runtime.current?.dispose();runtime.current=null;if(import.meta.env.DEV)delete(window as Window&{__campfire?:unknown}).__campfire}
  },[quality])
  useEffect(()=>{runtime.current?.setPlayback(paused,speed);if(video.current){video.current.playbackRate=speed;if(paused)video.current.pause();else video.current.play().catch(()=>{})}},[paused,speed,failure,stage])
  const closeMenu=()=>{if(menu.current)menu.current.open=false}
  const updateSlice=(patch:Partial<Slice>)=>{interact.current();setSlice(s=>({...s,...patch}));runtime.current?.setSlice(patch)}
  const showFire=()=>{updateSlice({enabled:false});setAnnotations(false);setStation(null);runtime.current?.setAnnotations(false);runtime.current?.resetCamera();setInstrumentOpen(false)}
  const openSlice=()=>{setAnnotations(false);setStation(null);setInstrumentOpen(false);runtime.current?.setAnnotations(false);updateSlice({...INITIAL_SLICE,enabled:true})}
  const showAnatomy=()=>{updateSlice({enabled:false});setInstrumentOpen(false);setAnnotations(true);setStation(null);runtime.current?.setAnnotations(true);runtime.current?.resetCamera()}
  const selectStation=(id:AnatomyId)=>{interact.current();setAnnotations(true);runtime.current?.setAnnotations(true);setStation(id);setInstrumentOpen(false);const r=runtime.current?.selectAnnotation(id);if(r)setSlice(r.slice)}
  const stationSection=(id:AnatomyId)=>{interact.current();setAnnotations(false);setStation(null);setInstrumentOpen(false);runtime.current?.setAnnotations(false);const r=runtime.current?.selectAnnotation(id,true);if(r)setSlice(r.slice)}
  const guideSteps=useMemo(()=>ANATOMY.map(a=>({title:tx(a.title),body:tx(a.body),action:()=>a.id==='plume'?stationSection(a.id):selectStation(a.id),durationMs:8500})),[tx])
  const toggleSound=async()=>{interact.current();setSoundBusy(true);setSoundError(false);try{setSound(await runtime.current!.setSound(!sound))}catch{setSoundError(true);setSound(false)}finally{setSoundBusy(false)}}
  const saveReading=async()=>{const r=runtime.current;if(!r||!reading)return;setPaused(true);r.setPlayback(true,speed);const frozen=await r.probeAt(reading.position);if(frozen&&runtime.current===r){setSaved(frozen);setReading(frozen)}}
  const toggleBlue=()=>{setBlue(!blue);runtime.current?.setBlue(!blue)}
  const compact=!guide&&(slice.enabled||!!station||instrumentOpen)
  return <div className="cf-world" data-section={slice.enabled} data-card={compact} data-anatomy={annotations} data-ready={stage===3&&!failure} data-fallback={failure}>
    <div className="cf-viewport">
      <canvas ref={canvas} className="cf-canvas" tabIndex={0} aria-label={tx('篝火三维场景；拖动旋转，方向键转动，加减键缩放')}/>
      {slice.enabled&&<button className="cf-plane-handle" data-cf-plane-handle aria-label={tx('拖动剖面')} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);planeDrag.current={x:e.clientX,y:e.clientY,offset:slice.offset}}} onPointerMove={e=>{const d=planeDrag.current;if(d)updateSlice({offset:Math.max(slice.horizontal?.03:-.55,Math.min(slice.horizontal?1.5:.55,d.offset+(slice.horizontal?d.y-e.clientY:e.clientX-d.x)/240))})}} onPointerUp={()=>{planeDrag.current=null}} onPointerCancel={()=>{planeDrag.current=null}} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();updateSlice({offset:Math.max(slice.horizontal?.03:-.55,Math.min(slice.horizontal?1.5:.55,slice.offset+(e.key==='ArrowRight'?.02:-.02)))})}}}>{tx('拖动剖面')}</button>}
      <span className="cf-probe-marker" data-cf-probe-marker aria-hidden="true"><i/><b/></span>
      {annotations&&!failure&&<AnatomyPins active={station} onSelect={selectStation}/>}
    </div>
    {failure&&<video ref={video} className="cf-fallback-video" src={FALLBACK_URL} autoPlay muted loop playsInline poster="/assets/posters/campfire.webp" onError={()=>setVideoFailed(true)}/>}
    <header className="cf-heading" data-experience-overlay="true"><h1>{tx('篝火')}</h1><p>{tx('一团火，里面有什么？')}</p>
      <div className="cf-time-controls"><button aria-label={tx(paused?'继续燃烧':'暂停燃烧')} onClick={()=>{interact.current();setPaused(!paused)}}>{paused?<Play size={16}/>:<Pause size={16}/>}</button><div className="cf-speed"><label htmlFor="cf-speed">{tx('时间')} <output>{speed.toFixed(1)}×</output></label><input id="cf-speed" type="range" min={.1} max={1} step={.1} value={speed} onChange={e=>{interact.current();setSpeed(Number(e.target.value))}}/></div></div>
    </header>
    <details ref={menu} className="cf-more" data-experience-overlay="true"><summary>{tx('更多')}</summary><div>
      <button disabled={failure||stage!==3} onClick={()=>{setGuide(true);closeMenu()}}>{tx('八站导览')}</button>
      <button onClick={()=>{showFire();setInstrumentOpen(true);closeMenu()}} disabled={failure||stage!==3}>{tx('仪器面板')}</button>
      <button onClick={()=>{setBounds(true);closeMenu()}}>{tx('模型与读数')}</button>
      <button disabled={failure||stage!==3||soundBusy} aria-pressed={sound} aria-label={tx(sound?'关闭声音':'打开声音')} onClick={toggleSound}>{sound?<SpeakerHigh size={16}/>:<SpeakerSlash size={16}/>} {tx(sound?'声音开':'声音关')}</button>
      <label htmlFor="cf-quality">{tx('画质')}</label><select id="cf-quality" value={quality} onChange={e=>{setQuality(e.target.value as 'low'|'med');closeMenu()}}><option value="low">{tx('流畅（默认）')}</option><option value="med">{tx('精细（可能变慢）')}</option></select><small>{tx('更改画质会重新点火')}</small>
    </div></details>
    {!failure&&stage<3&&<div className="cf-loading" role="status"><span>{tx(['准备点火','建立燃烧网格','让火烧起来'][stage])}</span><progress max={3} value={stage}/><small>{stage} / 3</small></div>}
    {failure&&<aside className="cf-fallback-note" data-experience-overlay="true"><strong>{tx(videoFailed?'火焰预览':'火焰录像')}</strong><p>{tx('换 Chrome / Edge / Safari 26 可以玩实时的火；也需要设备支持相应的 WebGPU 功能。')}</p><p>{tx(videoFailed?'循环视频暂时未能加载，正在显示静态预览。':'录像不能读出实时温度。黄色来自发光的烟炱，蓝色包含化学发光；颜色不能单独当温度计。')}</p><button onClick={()=>setBounds(true)}>{tx('了解这团火')}</button></aside>}
    {slice.enabled&&!guide&&!failure&&<InspectionPanel slice={slice} reading={reading} saved={saved} paused={paused} blue={blue} onSlice={updateSlice} onSave={saveReading} onClear={()=>setSaved(null)} onBlue={toggleBlue} onCompare={id=>{stationSection(id);updateSlice({field:slice.field})}} onModel={()=>setBounds(true)}/>}
    {station&&!slice.enabled&&!guide&&!failure&&<AnatomyCard id={station} reading={reading} data={meters} onClose={()=>{setStation(null);runtime.current?.resetCamera()}} onSection={()=>stationSection(station)}/>}
    {instrumentOpen&&!failure&&<InstrumentPanel data={meters} onClose={()=>setInstrumentOpen(false)}/>}
    {blue&&!failure&&<p className="cf-blue-badge">{tx('蓝光增强显示')} ×40</p>}
    {bounds && <aside className="cf-boundaries" data-experience-overlay="true" aria-label={tx('模型与读数')}><button className="cf-close" aria-label={tx('关闭')} onClick={()=>setBounds(false)}><X/></button><h2>{tx('模型与读数')}</h2>
      <p>{tx('温度、燃料、烟炱和速度来自这团火的网格。点测使用相邻网格的插值，木柴内部不提供气体读数。')}</p>
      <p>{tx('可用空气 = 1 − 燃料 − 产物与惰性气体。它不是氧气浓度；若假设新鲜空气中氧的质量分数为 23.2%，可估算氧质量分数。')}</p>
      <p>{tx('放热图显示燃烧引起的升温率，单位 K/s，不是温度，也不是整团火的 kW。气体会同时辐射和混合冷却。')}</p>
      <p>{tx('蓝光是放热驱动的化学发光近似；模型没有逐个求解 CH*、C₂*、OH 或 CO₂ 分子。颜色和亮度经过相机式处理。')}</p>
      <p>{tx('剖面是一个位置的原始模拟场；实景是整条视线的光叠加，并加了细节噪声。两种颜色不能逐像素当作同一个量。')}</p>
      <p>{tx('热解气从固定的木柴表面供给。模型没有木柴内部传热、消耗、水或分子扩散，不能直接当作灭火或微重力预测。')}</p>
      <p>{tx('涡量由投影前的速度差分换算；它和最终速度的采样时刻相差一个求解步骤。')}</p>
      <a href="https://github.com/Leonxlnx/procedural-fire/tree/95ab0a9003e20f1b0a5556ac14b401dfa0a37596" target="_blank" rel="noreferrer">Leon Lin · procedural-fire · MIT</a>
    </aside>}
    {!failure&&!annotations&&!guide&&<p className="cf-gesture" data-experience-overlay="true">{tx(slice.enabled?'点剖面读数 · 拖动旋转 · 双指缩放':'拖动旋转 · 滚动或双指缩放')}</p>}
    {!guide&&<Freebar className="cf-freebar" ariaLabel={tx('看火、切开与解剖')} primaryControlBudget={3} mobileDensity="comfortable">
      <button aria-pressed={!slice.enabled&&!annotations} onClick={showFire}><Fire size={19}/>{tx('看火')}</button>
      <button disabled={failure||stage!==3} aria-pressed={slice.enabled} aria-label={tx('切开看温度')} onClick={openSlice}><Scan size={19}/>{tx('切开')}</button>
      <button disabled={failure||stage!==3} aria-pressed={annotations} onClick={showAnatomy}><CirclesThree size={19}/>{tx('解剖')}</button>
    </Freebar>}
    {soundError&&<p className="cf-audio-error" role="status">{tx('声音未能开启，请再点一次。')}</p>}
    <span className="cf-time" data-experience-overlay="true">{failure?tx('预渲染画面'):`t ${stats.time.toFixed(1)} s`}</span>
    {guide&&!failure&&<GuideTour worldId="campfire" steps={guideSteps} defaultOpen placement="stage" kicker={tx('火的解剖')} exitLabel={tx('自由探索')} onExit={()=>setGuide(false)} stagePlan={[{position:'bottom-left',mobilePosition:'bottom-center',treatment:'caption',tone:'light',width:'narrow',motion:'fade'}]}/>}
  </div>
}
