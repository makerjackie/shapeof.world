import './styles/Campfire.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, SpeakerHigh, SpeakerSlash, ArrowCounterClockwise, Scan, X } from '@phosphor-icons/react'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { GuideTour } from '~/components/experiences/GuideTour'
import { Freebar } from '~/components/experiences/Freebar'
import { useExperienceI18n } from '~/i18n/experience'
import { FIELDS, INITIAL_SLICE, explainReading, type Reading, type Slice } from './fields'
import { createCampfire, type CampfireRuntime, type CampfireStats } from './runtime.js'

// Remote URL is a handoff target; availability is checked by the video element. No fictitious live data in fallback.
const FALLBACK_URL = import.meta.env.VITE_CAMPFIRE_VIDEO_URL || (import.meta.env.DEV ? '/.local/campfire/campfire-loop.mp4' : '/assets/campfire/campfire-loop.mp4')
export function Campfire({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const canvas = useRef<HTMLCanvasElement>(null), video = useRef<HTMLVideoElement>(null), runtime = useRef<CampfireRuntime | null>(null)
  const planeDrag = useRef<{x:number;y:number;offset:number} | null>(null)
  const interact = useRef(controls.registerInteraction)
  interact.current = controls.registerInteraction
  const [stage,setStage] = useState(0), [failure,setFailure] = useState(false), [videoFailed,setVideoFailed] = useState(false)
  const [slice,setSlice] = useState<Slice>({...INITIAL_SLICE}), [reading,setReading] = useState<Reading | null>(null), [saved,setSaved] = useState<Reading | null>(null)
  const [paused,setPaused] = useState(false), [speed,setSpeed] = useState(1), [sound,setSound] = useState(false), [soundBusy,setSoundBusy] = useState(false), [soundError,setSoundError] = useState(false)
  const [stats,setStats] = useState<CampfireStats>({fps:0,time:0,grid:'',pixelScale:1})
  const [guide,setGuide] = useState(false), [bounds,setBounds] = useState(false), [details,setDetails] = useState(false), [style,setStyle] = useState('night')
  useEffect(()=>{
    const abort=new AbortController()
    setStyle(new URLSearchParams(location.search).get('style')==='paper'?'paper':'night')
    if(new URLSearchParams(location.search).has('fallback')){setFailure(true);return;}
    createCampfire(canvas.current!,{signal:abort.signal,onProgress:setStage,onReading:setReading,onStats:setStats,onInteract:()=>interact.current(),onError:(e)=>{console.error('Campfire runtime:',e);setFailure(true);runtime.current?.dispose();}}).then(r=>{
      if(abort.signal.aborted){r.dispose();return;}
      runtime.current=r
      if(import.meta.env.DEV)Object.assign(window,{__campfire:r})
    }).catch(e=>{if(!abort.signal.aborted){console.error('Campfire initialization:',e);setFailure(true);}})
    return()=>{abort.abort();runtime.current?.dispose();runtime.current=null;if(import.meta.env.DEV)delete (window as Window & {__campfire?:unknown}).__campfire;}
  },[])
  useEffect(()=>{runtime.current?.setPlayback(paused,speed);if(video.current){video.current.playbackRate=speed;if(paused)video.current.pause();else video.current.play().catch(()=>{});}},[paused,speed,failure,stage])
  const updateSlice=(patch: Partial<Slice>)=>{interact.current();setSlice(current=>({...current,...patch}));runtime.current?.setSlice(patch)}
  const openSlice=()=>updateSlice({enabled:true,field:'temperature',opacity:.92})
  const field=FIELDS.find(f=>f.id===slice.field)!
  const changeOrientation=(horizontal: boolean)=>updateSlice({horizontal,offset:horizontal?.3:0})
  const guideSteps=useMemo(()=>[
    {title:tx('围着火走一圈'),body:tx('拖动旋转，滚动或双指缩放。火焰、木柴、烟和火星都在同一个三维空间里。'),action:()=>{runtime.current?.setSlice({enabled:false});setSlice(s=>({...s,enabled:false}));},durationMs:7000},
    {title:tx('切开看温度'),body:tx('剖面颜色是温度，不是火焰原来的颜色。点一下剖面，读出这一点有多热。'),action:()=>{runtime.current?.setSlice({enabled:true,field:'temperature'});setSlice(s=>({...s,enabled:true,field:'temperature'}));},durationMs:9000},
    {title:tx('最亮的地方，不一定最热'),body:tx('暂停后留下一个对照点，再点另一个位置。一起比较温度和烟炱；实景亮光是整条视线的叠加。'),action:()=>{setPaused(true);runtime.current?.setPlayback(true,speed);},durationMs:10000},
  ],[tx,speed])
  const toggleSound=async()=>{interact.current();setSoundBusy(true);setSoundError(false);try{setSound(await runtime.current!.setSound(!sound));}catch{setSoundError(true);setSound(false);}finally{setSoundBusy(false);}}
  const valid=reading && !reading.solid
  return <div className="cf-world" data-style={style} data-section={slice.enabled} data-ready={stage===3&&!failure} data-fallback={failure}>
    <div className="cf-viewport">
      <canvas ref={canvas} className="cf-canvas" tabIndex={0} aria-label={tx('篝火三维场景；拖动旋转，方向键转动，加减键缩放')} />
      {slice.enabled&&<button className="cf-plane-handle" data-cf-plane-handle aria-label={tx('拖动剖面')} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);planeDrag.current={x:e.clientX,y:e.clientY,offset:slice.offset}}} onPointerMove={e=>{const d=planeDrag.current;if(d)updateSlice({offset:Math.max(slice.horizontal?.03:-.55,Math.min(slice.horizontal?1.5:.55,d.offset+(slice.horizontal?d.y-e.clientY:e.clientX-d.x)/240))})}} onPointerUp={()=>{planeDrag.current=null}} onPointerCancel={()=>{planeDrag.current=null}} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();updateSlice({offset:Math.max(slice.horizontal?.03:-.55,Math.min(slice.horizontal?1.5:.55,slice.offset+(e.key==='ArrowRight'?.02:-.02)))})}}}>{tx('拖动剖面')}</button>}
      <span className="cf-probe-marker" data-cf-probe-marker aria-hidden="true"><i/><b/></span>
    </div>
    {failure && <video ref={video} className="cf-fallback-video" src={FALLBACK_URL} autoPlay muted loop playsInline poster="/assets/posters/campfire.webp" onError={()=>setVideoFailed(true)} />}
    <header className="cf-heading" data-experience-overlay="true">
      <h1>{tx('篝火')}</h1>
      <p>{tx('一团火，里面有什么？')}</p>
      {!failure && <button className="cf-cut" disabled={stage!==3} aria-pressed={slice.enabled} onClick={()=>slice.enabled?updateSlice({enabled:false}):openSlice()}><Scan size={19}/>{tx(slice.enabled?'回到火边':'切开看温度')}</button>}
    </header>
    {!failure && stage<3 && <div className="cf-loading" role="status"><span>{tx(['准备点火','建立燃烧网格','让火烧起来'][stage])}</span><progress max={3} value={stage}/><small>{stage} / 3</small></div>}
    {failure && <aside className="cf-fallback-note" data-experience-overlay="true"><strong>{tx(videoFailed?'火焰预览':'火焰录像')}</strong><p>{tx('换 Chrome / Edge / Safari 26 可以玩实时的火；也需要设备支持相应的 WebGPU 功能。')}</p><p>{tx('录像不能读出实时温度。黄色来自发光的烟炱，蓝色包含化学发光；颜色不能单独当温度计。')}</p>{videoFailed&&<p>{tx('循环视频暂时未能加载，正在显示静态预览。')}</p>}<button onClick={()=>setBounds(true)}>{tx('了解这团火')}</button></aside>}
    {!failure && slice.enabled && <aside className={`cf-panel ${details?'cf-expanded':''}`} data-experience-overlay="true" aria-label={tx('剖面与探针')}>
      <div className="cf-panel-heading"><h2>{tx('透视这团火')}</h2><button aria-label={tx('关闭剖面')} onClick={()=>updateSlice({enabled:false})}><X size={18}/></button></div>
      <label className="cf-field-label" htmlFor="cf-field">{tx('剖面显示')}</label>
      <select id="cf-field" value={slice.field} onChange={e=>updateSlice({field:e.target.value as Slice['field']})}>{FIELDS.map(f=><option key={f.id} value={f.id}>{tx(f.label)}</option>)}</select>
      <div className="cf-colorbar" style={{background:`linear-gradient(90deg,${field.colors.join(',')})`}}/>
      <div className="cf-scale"><span>{field.min}</span><span>{field.unit}</span><span>≥ {field.max}</span></div>
      {slice.field==='temperature'&&<div className="cf-scale cf-celsius"><span>20 °C</span><span>1527 °C</span></div>}
      <div className="cf-compare-row"><button aria-pressed={slice.opacity===0} onClick={()=>updateSlice({opacity:slice.opacity===0?.92:0})}>{tx(slice.opacity===0?'显示场图':'原色对照')}</button><button onClick={()=>{interact.current();runtime.current?.focusRoot()}}>{tx('靠近火根')}</button><span>{tx(slice.opacity===0?'原来的火色 · 探针仍在剖面上':'颜色表示读数')}</span></div>
      <details className="cf-geometry"><summary>{tx('移动或横切剖面')}</summary>
      <div className="cf-section-tools"><button aria-pressed={!slice.horizontal} onClick={()=>changeOrientation(false)}>{tx('竖切')}</button><button aria-pressed={slice.horizontal} onClick={()=>changeOrientation(true)}>{tx('横切')}</button><output>{slice.horizontal?'y':'z'} = {slice.offset.toFixed(2)} m</output></div>
      <input className="cf-position" aria-label={tx('移动剖面')} type="range" min={slice.horizontal?.03:-.55} max={slice.horizontal?1.5:.55} step={.01} value={slice.offset} onChange={e=>updateSlice({offset:Number(e.target.value)})}/></details>
      <div className="cf-probe-head"><strong>{tx('探针')}</strong><span>{tx(paused?'时间已冻结':'跟随火焰变化')}</span></div>
      {!reading?<p className="cf-probe-empty">{tx('点剖面上的任何位置，看看那里有多热。')}</p>:<>
        <div className="cf-main-reading"><div><span>{tx('温度')}</span><strong>{valid?Math.round(reading.temperature):'—'} <small>K</small></strong><span>{valid?Math.round(reading.celsius):'—'} °C</span></div><div><span>{tx('烟炱')}</span><strong>{valid?reading.soot.toFixed(3):'—'} <small>ppm</small></strong><span>{tx('体积分数')}</span></div></div>
        <p className="cf-explanation">{tx(explainReading(reading))}</p>
        <div className="cf-more-readings">
          <dl><div><dt>{tx('速度')}</dt><dd>{valid?reading.speed.toFixed(2):'—'} m/s</dd></div>
          <div><dt>{tx('燃料气')}</dt><dd>{valid?(reading.fuel*100).toFixed(2):'—'} %</dd></div>
          <div><dt>{tx('可用空气（含氧）')}</dt><dd>{valid?(reading.air*100).toFixed(1):'—'} %</dd></div>
          <div><dt>{tx('氧质量分数（估算）')}</dt><dd>{valid?(reading.oxygenMassEstimate*100).toFixed(2):'—'} %</dd></div>
          <div><dt>{tx('燃烧升温率')}</dt><dd>{valid?Math.round(reading.heatingRate).toLocaleString():'—'} K/s</dd></div>
          <div><dt>{tx('涡量')}</dt><dd>{valid?reading.vorticity.toFixed(1):'—'} s⁻¹</dd></div></dl>
          <p className="cf-coordinate">x {reading.position[0].toFixed(2)} / y {reading.position[1].toFixed(2)} / z {reading.position[2].toFixed(2)} m<br/>t {reading.time.toFixed(2)} s</p>
        </div>
        <div className="cf-probe-actions"><button disabled={!valid} onClick={()=>{setSaved(reading);setPaused(true);runtime.current?.setPlayback(true,speed)}}>{tx('留下对照点')}</button><button className="cf-details-toggle" aria-expanded={details} onClick={()=>setDetails(!details)}>{tx(details?'收起读数':'全部读数')}</button></div>
      </>}
      {saved && <div className="cf-saved"><span>{tx('对照点')} · {saved.time.toFixed(2)} s</span><strong>{Math.round(saved.temperature)} K / {saved.soot.toFixed(3)} ppm</strong><button aria-label={tx('清除对照点')} onClick={()=>setSaved(null)}><X size={14}/></button></div>}
      <button className="cf-model-link" onClick={()=>setBounds(true)}>{tx('这些数是怎么来的？')}</button>
    </aside>}
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
    {!failure && <p className="cf-gesture" data-experience-overlay="true">{tx(slice.enabled?'点剖面读数 · 拖动旋转 · 双指缩放':'拖动旋转 · 滚动或双指缩放')}</p>}
    <Freebar className="cf-freebar" ariaLabel={tx('火焰时间与声音')} primaryControlBudget={3} secondaryDefault="closed" mobileDensity="comfortable" secondary={<div className="cf-secondary"><button onClick={()=>{interact.current();setGuide(true)}} disabled={failure}>{tx('三站导览')}</button><button onClick={()=>runtime.current?.resetCamera()} disabled={failure}><ArrowCounterClockwise/>{tx('回到正面')}</button><button onClick={()=>setBounds(true)}>{tx('模型与读数')}</button><button onClick={()=>setStyle(style==='night'?'paper':'night')}>{tx(style==='night'?'实验记录样式':'夜间观察样式')}</button></div>}>
      <button aria-label={tx(paused?'继续燃烧':'暂停燃烧')} onClick={()=>{interact.current();setPaused(!paused)}}>{paused?<Play size={20}/>:<Pause size={20}/>}<span>{tx(paused?'继续':'暂停')}</span></button>
      <div className="cf-speed"><label htmlFor="cf-speed">{tx('时间')} <output>{speed.toFixed(1)}×</output></label><input id="cf-speed" type="range" min={.1} max={1} step={.1} value={speed} onChange={e=>{interact.current();setSpeed(Number(e.target.value))}}/></div>
      <button disabled={failure||stage!==3||soundBusy} aria-pressed={sound} aria-label={tx(sound?'关闭声音':'打开声音')} onClick={toggleSound}>{sound?<SpeakerHigh size={20}/>:<SpeakerSlash size={20}/>}<span>{tx(sound?'声音开':'声音关')}</span></button>
    </Freebar>
    {soundError&&<p className="cf-audio-error" role="status">{tx('声音未能开启，请再点一次。')}</p>}
    <span className="cf-time" data-experience-overlay="true">{failure?tx('预渲染画面'):`t ${stats.time.toFixed(1)} s`}</span>
    {guide&&!failure&&<GuideTour worldId="campfire" steps={guideSteps} defaultOpen placement="stage" kicker={tx('导览')} exitLabel={tx('自由探索')} onExit={()=>setGuide(false)} stagePlan={[{position:'bottom-left',mobilePosition:'top-left',treatment:'caption',tone:'light',width:'narrow',motion:'fade'}]}/>}
  </div>
}
