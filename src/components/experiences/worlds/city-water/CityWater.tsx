import {useCallback, useEffect, useMemo, useRef, useState, type CSSProperties} from 'react'
import type {ExperienceControls} from '~/components/ExperienceShell'
import {GuideTour, GUIDE_REPLAY_EVENT} from '~/components/experiences/GuideTour'
import {useExperienceI18n} from '~/i18n/experience'
import {isWorldPaused} from '~/lib/world-playback'
import {WaterScene, type CameraView, type Layer, type SceneState} from './Scene'
import {advanceSimulation, createSimulation, DEFAULTS, formatClock, minimumPressure, solveHydraulics, supplyFraction, treatment, type Settings, type Simulation} from './model'
import {CLEARWELL_CAPACITY, ISOLATION_PIPE, NODES, PIPES, RESERVOIR_CAPACITY, SITES, TOWER_CAPACITY, TOUR} from './network'
import './styles/CityWater.css'

type Mission = {id:'blackout'|'morning'|'leak';start:number;passed:boolean|null}
const OVERVIEW={position:[25,24,30],target:[-1,0,-1]} as const
function Slider({label,value,min,max,step=1,unit='',digits=0,onChange}:{label:string;value:number;min:number;max:number;step?:number;unit?:string;digits?:number;onChange:(v:number)=>void}) {
  const tx=useExperienceI18n()
  return <label className="cw-slider"><span>{tx(label)}<output>{value.toFixed(digits)} <small>{unit}</small></output></span><input type="range" min={min} max={max} step={step} value={value} aria-label={tx(label)} style={{'--cw-fill':`${(value-min)/(max-min)*100}%`} as CSSProperties} onChange={e=>onChange(Number(e.target.value))}/></label>
}
function Gauge({label,value,max,unit='m³',digits=0}:{label:string;value:number;max:number;unit?:string;digits?:number}) {
  const tx=useExperienceI18n()
  return <div className="cw-gauge"><span>{tx(label)}<b>{value.toLocaleString('en',{maximumFractionDigits:digits})}<small> / {max.toLocaleString('en')} {unit}</small></b></span><i><em style={{width:`${Math.min(100,value/max*100)}%`}}/></i></div>
}
function Trend({simulation}:{simulation:Simulation}) {
  const tx=useExperienceI18n(),history=simulation.history.slice(-180)
  const start=history[0]?.time??0,end=Math.max(start+3600,history.at(-1)?.time??3600)
  const path=(fn:(h:Simulation['history'][number])=>number)=>history.map((h,i)=>`${i?'L':'M'}${(h.time-start)/(end-start)*270+3},${91-Math.min(1,Math.max(0,fn(h)))*82}`).join(' ')
  return <div className="cw-trend"><div className="cw-small-heading">{tx('这座城的记录')}<span>{tx('最近 12 小时')}</span></div><svg viewBox="0 0 280 104" role="img" aria-label={tx('储水与最低水压的历史曲线')}>
    {[.25,.5,.75,1].map(v=><path key={v} d={`M3,${91-v*82}H273`} stroke="#263b42" strokeWidth=".6"/>)}
    <path d={path(h=>h.tower/TOWER_CAPACITY)} fill="none" stroke="#71bcc6" strokeWidth="1.8"/>
    <path d={path(h=>h.pressure/50)} fill="none" stroke="#d4b17c" strokeWidth="1.5"/>
    <text x="3" y="102">{formatClock(start)}</text><text x="273" y="102" textAnchor="end">{formatClock(end)}</text>
  </svg><p><span className="cw-cyan">{tx('水塔储量')} 0–720 m³</span><span className="cw-gold">{tx('最低水压')} 0–50 m</span></p></div>
}
function TreatmentStrip({simulation,settings}:{simulation:Simulation;settings:Settings}) {
  const tx=useExperienceI18n(),p=treatment(simulation,settings)
  return <div className="cw-treatment-strip">{[['原水',p.rawTurbidity],['絮凝后',p.coagulated],['沉淀后',p.settled],['过滤后',p.filtered]].map(([label,value],i)=><div key={label} style={{'--dot-color':['#a99b70','#a2a579','#79aaa5','#76c2ce'][i]} as CSSProperties}><i/><span>{tx(label as string)}</span><b>{(value as number).toFixed((value as number)<1?2:1)}</b></div>)}<small>{tx('NTU · 代表性响应，不是实测水质')}</small></div>
}
export function CityWater({controls}:{controls:ExperienceControls}) {
  const tx=useExperienceI18n()
  const simulation=useRef<Simulation>(null!)
  if(!simulation.current)simulation.current=createSimulation()
  const [settings,setSettings]=useState<Settings>({...DEFAULTS})
  const [playing,setPlaying]=useState(()=>typeof window==='undefined'||!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [speed,setSpeed]=useState(120),[layer,setLayer]=useState<Layer>('water'),[selected,setSelected]=useState('reservoir')
  const [tab,setTab]=useState<'inspect'|'dispatch'|'experiments'>('inspect'),[frame,setFrame]=useState(0)
  const [view,setView]=useState<CameraView>({position:[...OVERVIEW.position],target:[...OVERVIEW.target],revision:0})
  const [mission,setMission]=useState<Mission|null>(null),[trace,setTrace]=useState<{start:number;durations:number[]}|null>(null)
  const [reduced]=useState(()=>typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const runtime=useRef({settings,playing,speed}),scene=useRef<SceneState>({simulation:simulation.current,settings,playing,layer,selected,trace:null,reduced})
  runtime.current={settings,playing,speed}
  const register=controls.registerInteraction
  const change=useCallback((patch:Partial<Settings>)=>{register();setSettings(s=>({...s,...patch}))},[register])
  const select=useCallback((id:string,move=true)=>{
    register();setSelected(id);setTab('inspect')
    const site=SITES.find(s=>s.id===id)
    if(move&&site)setView(v=>({position:[...site.camera],target:[...site.target],revision:v.revision+1}))
    if(move&&id.startsWith('node:')){
      const n=NODES[Number(id.slice(5))];if(n)setView(v=>({position:[n.x+8,9,n.z+9],target:[n.x,1,n.z],revision:v.revision+1}))
    }
  },[register])
  const reset=useCallback(()=>{
    register();simulation.current=createSimulation();setSettings({...DEFAULTS});setPlaying(!reduced);setMission(null);setTrace(null);setFrame(v=>v+1)
  },[register,reduced])
  useEffect(()=>{
    simulation.current.hydraulic=solveHydraulics(simulation.current,settings);setFrame(f=>f+1)
  },[settings])
  useEffect(()=>{
    let raf=0,last=performance.now(),update=0,accumulator=0
    const tick=(now:number)=>{
      const dt=Math.min(.08,(now-last)/1000);last=now
      if(runtime.current.playing&&!document.hidden&&!isWorldPaused())accumulator+=dt*runtime.current.speed
      if(accumulator>=3){advanceSimulation(simulation.current,runtime.current.settings,Math.min(90,accumulator));accumulator=0}
      update+=dt
      if(update>.16){setFrame(f=>f+1);update=0}
      raf=requestAnimationFrame(tick)
    }
    raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf)
  },[])
  const s=simulation.current,h=s.hydraulic,plant=treatment(s,settings)
  const supplied=supplyFraction(h),pressure=minimumPressure(h),requested=h.requested.reduce((a,b)=>a+b,0),delivered=h.delivered.reduce((a,b)=>a+b,0)
  const site=SITES.find(v=>v.id===selected),pipeIndex=selected.startsWith('pipe:')?Number(selected.slice(5)):null
  const nodeIndex=selected.startsWith('node:')?Number(selected.slice(5)):selected==='hospital'?9:selected==='industry'?14:null
  const pipe=pipeIndex!==null?PIPES[pipeIndex]:null,node=nodeIndex!==null?NODES[nodeIndex]:null
  const journey=['intake','mixing','settling','filters','disinfection','clearwell','pump','district'] as const
  let traceIndex=-1,traceProgress=0
  if(trace){let until=trace.start;for(let i=0;i<trace.durations.length;i++){until+=trace.durations[i];if(s.time<until){traceIndex=i;traceProgress=1-(until-s.time)/trace.durations[i];break}}}
  scene.current={simulation:s,settings,playing,layer,selected,trace:traceIndex<0?null:traceIndex,reduced}
  useEffect(()=>{if(traceIndex>=0)select(journey[traceIndex]);else if(trace)setTrace(null)},[traceIndex]) // Only move when crossing a process, not every hydraulic step.
  useEffect(()=>{
    if(!mission||mission.passed!==null)return
    const elapsed=s.time-mission.start
    if(mission.id==='blackout'&&settings.power){setMission(null);return}
    if(mission.id==='blackout'&&(supplied<.92||elapsed>=3600))setMission(m=>m?{...m,passed:elapsed>=3600&&supplied>=.92}:null)
    if(mission.id==='morning'&&(supplied<.92||elapsed>=7200))setMission(m=>m?{...m,passed:elapsed>=7200&&supplied>=.92}:null)
    if(mission.id==='leak'&&elapsed>120&&settings.leak===0)setMission(m=>m?{...m,passed:true}:null)
  },[frame,mission,supplied,settings.leak,settings.power,s.time])
  const startMission=(id:Mission['id'])=>{
    register();const next=createSimulation();next.time=2*3600
    const config={...DEFAULTS,closedPipes:[]}
    if(id==='blackout'){next.tower=240;config.power=false;config.demand=1.3}
    if(id==='morning'){next.tower=350;next.clearwell=700;config.pumpSpeed=.8;config.automatic=false;config.demand=1.5}
    if(id==='leak'){config.leak=.0012;next.tower=480}
    next.hydraulic=solveHydraulics(next,config);simulation.current=next;setSettings(config);setMission({id,start:next.time,passed:null});setTrace(null);setSpeed(120);setPlaying(true);setLayer('pressure');
    if(id==='blackout')select('tower');if(id==='morning')select('pump');if(id==='leak'){select('district');setTab('experiments')}
  }
  const startTrace=()=>{
    register();setTrace({start:s.time,durations:[90,900,1800,420,1200,Math.max(900,Math.min(20000,s.clearwell/Math.max(.02,h.pumpFlow))),60,1200]});setSpeed(600);setPlaying(true);select('intake')
  }
  const guide=useMemo(()=>TOUR.map(id=>{const item=SITES.find(s=>s.id===id)!;return {title:item.title,body:item.body,action:()=>select(item.id),durationMs:10000}}),[select])
  return <div className="cw-world" data-testid="city-water" data-sim-time={s.time.toFixed(0)} data-supply={supplied.toFixed(4)} data-playing={playing} data-layer={layer}>
    <section className="cw-stage" aria-label={tx('可旋转的城市供水模型')}>
      <WaterScene state={scene} onSelect={select} view={view} onInteract={register}/>
      <div className="cw-title"><span>WATER / 01</span><h1>{tx('一座城市的水')}</h1><p>{tx('从山里的水库，到你拧开的水龙头。')}</p></div>
      <div className="cw-clock"><span>{tx('模拟日')} {Math.floor(s.time/86400)+1}</span><strong>{formatClock(s.time)}</strong><small>{tx('虚构参考城市')}</small></div>
      <div className="cw-facility-nav" aria-label={tx('供水系统设施')}>
        {SITES.filter(v=>!['hospital','industry','clearwell','intake'].includes(v.id)).map((item,i)=><button key={item.id} aria-pressed={selected===item.id} onClick={()=>select(item.id)}><span>{String(i+1).padStart(2,'0')}</span>{tx(item.title)}</button>)}
      </div>
      <div className="cw-camera"><button onClick={()=>{register();setView(v=>({position:[...OVERVIEW.position],target:[...OVERVIEW.target],revision:v.revision+1}))}}>{tx('全景')}</button><button onClick={()=>{register();setView(v=>({position:[0,41,.01],target:[0,0,-1],revision:v.revision+1}))}}>{tx('俯视')}</button><button onClick={()=>window.dispatchEvent(new CustomEvent(GUIDE_REPLAY_EVENT,{detail:{worldId:'city-water'}}))}>{tx('带我看')}</button></div>
      <div className="cw-dock">
        <div className="cw-layers" role="group" aria-label={tx('显示层')}>{([['water','水流'],['pressure','水压'],['age','水龄'],['surface','地表']] as const).map(([id,label])=><button key={id} aria-pressed={layer===id} onClick={()=>{register();setLayer(id)}}>{tx(label)}</button>)}</div>
        <div className="cw-time"><button aria-label={tx(playing?'暂停模拟':'继续模拟')} onClick={()=>{register();setPlaying(v=>!v)}}><span aria-hidden="true">{playing?'Ⅱ':'▷'}</span>{tx(playing?'暂停':'继续')}</button><select aria-label={tx('时间倍率')} value={speed} onChange={e=>{register();setSpeed(Number(e.target.value))}}>{[30,120,600].map(v=><option key={v} value={v}>{v}×</option>)}</select><button onClick={reset}>{tx('重置')}</button></div>
      </div>
      <p className="cw-stage-note">{tx(layer==='age'?'青色较新 · 铜色较久 · 管线与高程为显示而放大':layer==='pressure'?'铜红低压 · 青色供水 · 管线与高程为显示而放大':'拖动旋转 · 滚轮缩放 · 点击设施或管道')}<span>{tx('流点加速显示方向')}</span></p>
      {trace&&traceIndex>=0&&<div className="cw-trace" role="status"><span>{tx('一滴水的路线导览')} <b>{traceIndex+1} / 8</b><button aria-label={tx('结束路线导览')} onClick={()=>setTrace(null)}>×</button></span><strong>{tx(SITES.find(v=>v.id===journey[traceIndex])!.title)}</strong><i><em style={{width:`${traceProgress*100}%`}}/></i><small>{tx('混合池按平均停留时间示意，非单个水分子的轨迹')}</small></div>}
    </section>
    <aside className="cw-panel" aria-label={tx('供水仪表与操作')}>
      <div className="cw-panel-heading"><span>{tx('城市供水调度台')}</span><i data-live={playing}/></div>
      <div className="cw-supply" data-alert={supplied<.95}><div><span>{tx('需求满足率')}</span><strong data-testid="supply">{(supplied*100).toFixed(1)}<small>%</small></strong></div><svg viewBox="0 0 70 70" aria-hidden="true"><circle cx="35" cy="35" r="28" fill="none" stroke="#263941" strokeWidth="3"/><circle cx="35" cy="35" r="28" fill="none" stroke={supplied>.95?'#77bfc8':'#d4a17c'} strokeWidth="3" strokeDasharray={`${supplied*176} 176`} transform="rotate(-90 35 35)"/><path d="M35 18C35 18 24 32 24 39a11 11 0 0022 0c0-7-11-21-11-21Z" fill="none" stroke="#94c3c7" strokeWidth="1.2"/></svg></div>
      <dl className="cw-instruments"><div><dt>{tx('城市用水')}</dt><dd>{(delivered*1000).toFixed(1)}<small>L/s</small></dd></div><div><dt>{tx('最低水压')}</dt><dd data-testid="pressure">{pressure.toFixed(1)}<small>m</small></dd></div><div><dt>{tx('泵站功率')}</dt><dd>{h.pumpKW.toFixed(1)}<small>kW</small></dd></div><div><dt>{tx('水塔流向')}</dt><dd>{tx(h.towerFlow>=0?'补水':'供水')}<small>{(Math.abs(h.towerFlow)*1000).toFixed(1)} L/s</small></dd></div></dl>
      <nav className="cw-panel-tabs" aria-label={tx('调度台页签')}>{([['inspect','近看'],['dispatch','调度'],['experiments','实验']] as const).map(([id,label])=><button key={id} aria-pressed={tab===id} onClick={()=>{register();setTab(id)}}>{tx(label)}</button>)}</nav>
      <div className="cw-panel-content">
        {mission&&<div className="cw-mission-status" data-result={mission.passed===null?'active':mission.passed?'passed':'ended'} role="status"><span>{tx(mission.id==='blackout'?'停电一小时':mission.id==='morning'?'守住早高峰':'找到漏掉的水')}<button aria-label={tx('退出实验')} onClick={()=>setMission(null)}>×</button></span><b>{mission.passed===null?tx('正在运行'):mission.passed?tx('这次守住了供水'):tx('供水开始不足')}</b><small>{tx('已观察')} {Math.floor((s.time-mission.start)/60)} {tx('分钟')}{mission.passed===null?` / ${mission.id==='blackout'?60:mission.id==='morning'?120:'—'}`:''}</small>{mission.passed===false&&<button className="cw-link" onClick={()=>startMission(mission.id)}>{tx('调整策略，再来一次')}</button>}</div>}
        {tab==='inspect'&&<>
          <div className="cw-inspector-heading"><span>{tx(pipe?'管道档案':node?'街区节点':'设施档案')}</span><select aria-label={tx('选择设施')} value={site?.id??''} onChange={e=>select(e.target.value)}><option value="" disabled>{tx('点击场景选择')}</option>{SITES.map(v=><option key={v.id} value={v.id}>{tx(v.title)}</option>)}</select></div>
          <h2>{tx(site?.title??(pipe?pipe.pump?'供水泵':'环网管道':node?.label??'城市管网'))}</h2>
          {site&&<><p className="cw-kicker">{tx(site.short)}</p><p className="cw-body">{tx(site.body)}</p></>}
          {selected==='reservoir'&&<><Gauge label={tx('水库储量')} value={s.reservoir} max={RESERVOIR_CAPACITY}/><Slider label={tx('上游来水')} min={0} max={160} step={2} value={settings.inflow*1000} unit="L/s" onChange={v=>change({inflow:v/1000})}/><div className="cw-data-row"><span>{tx('正在取水')}</span><b>{(plant.flow*1000).toFixed(1)} L/s</b></div><button className="cw-action" onClick={startTrace}>{tx('跟随一滴水')}<span>→</span></button></>}
          {selected==='intake'&&<><Slider label={tx('取水闸门')} min={0} max={100} value={settings.intake*100} unit="%" onChange={v=>change({intake:v/100})}/><div className="cw-data-row"><span>{tx('原水流量')}</span><b>{(plant.flow*1000).toFixed(1)} L/s</b></div></>}
          {['mixing','settling','filters','disinfection'].includes(selected)&&<><TreatmentStrip simulation={s} settings={settings}/>{selected==='mixing'&&<Slider label={tx('混凝强度')} min={0} max={1.5} step={.05} digits={2} value={settings.coagulant} onChange={v=>change({coagulant:v})}/>}<p className="cw-limit">{tx('净化响应是教学曲线，不判断是否达到饮用水标准。')}</p></>}
          {selected==='filters'&&<><Gauge label={tx('滤层负荷')} value={s.filterLoad*100} max={100} unit="%"/><button className="cw-action" disabled={s.backwash>0} onClick={()=>{register();s.backwash=900;setFrame(v=>v+1)}}>{tx(s.backwash>0?'正在反冲洗':'启动反冲洗')}<span>{s.backwash>0?`${Math.ceil(s.backwash/60)} min`:'15 min'}</span></button><p className="cw-limit">{tx('反冲洗期间产水量减半；清洗用水未单独建模。')}</p></>}
          {selected==='disinfection'&&<><Slider label={tx('出厂余氯参照')} min={0} max={1.5} step={.05} digits={2} value={settings.disinfectant} unit="mg/L" onChange={v=>change({disinfectant:v})}/><div className="cw-data-row"><span>{tx('清水池余氯')}</span><b>{s.clearChlorine.toFixed(2)} mg/L</b></div></>}
          {selected==='clearwell'&&<><Gauge label={tx('清水池储量')} value={s.clearwell} max={CLEARWELL_CAPACITY}/><div className="cw-data-row"><span>{tx('产水 / 抽水')}</span><b>{(plant.flow*1000).toFixed(1)} / {(h.pumpFlow*1000).toFixed(1)} L/s</b></div><div className="cw-data-row"><span>{tx('平均水龄')}</span><b>{(s.clearAge/3600).toFixed(1)} h</b></div></>}
          {selected==='pump'&&<><Slider label={tx('泵相对转速')} min={.55} max={1.25} step={.01} digits={2} value={settings.pumpSpeed} onChange={v=>change({pumpSpeed:v})}/><label className="cw-check"><span>{tx('随水塔水位自动调速')}</span><input type="checkbox" checked={settings.automatic} onChange={e=>change({automatic:e.target.checked})}/></label><div className="cw-data-row"><span>{tx('泵扬程')}</span><b>{h.pumpHead.toFixed(1)} m</b></div><div className="cw-data-row"><span>{tx('供水流量')}</span><b>{(h.pumpFlow*1000).toFixed(1)} L/s</b></div><button className="cw-action" data-alert={settings.power} onClick={()=>change({power:!settings.power})}>{tx(settings.power?'切断泵站电源':'恢复泵站电源')}<span>{settings.power?'OFF':'ON'}</span></button></>}
          {selected==='tower'&&<><Gauge label={tx('水塔储量')} value={s.tower} max={TOWER_CAPACITY}/><div className="cw-data-row"><span>{tx('水面高程')}</span><b>{(43+s.tower/90).toFixed(1)} m</b></div><div className="cw-data-row"><span>{tx('平均水龄 / 余氯')}</span><b>{(s.towerAge/3600).toFixed(1)} h / {s.towerChlorine.toFixed(2)} mg/L</b></div><button className="cw-action" onClick={()=>change({power:!settings.power})}>{tx(settings.power?'停泵，看看还能供多久':'重新开泵')}<span>→</span></button></>}
          {pipe&&pipeIndex!==null&&<><dl className="cw-detail-readings"><div><dt>{tx('长度 / 内径')}</dt><dd>{pipe.length.toFixed(0)} m / {(pipe.diameter*1000).toFixed(0)} mm</dd></div><div><dt>{tx('有向流量')}</dt><dd>{(h.flows[pipeIndex]*1000).toFixed(2)} L/s</dd></div><div><dt>{tx('流速')}</dt><dd>{(Math.abs(h.flows[pipeIndex])/(Math.PI*pipe.diameter**2/4)).toFixed(2)} m/s</dd></div><div><dt>{tx('管内平均水龄')}</dt><dd>{(s.pipes[pipeIndex].age.reduce((a,b)=>a+b,0)/14400).toFixed(1)} h</dd></div></dl><p className="cw-limit">{tx('流量正负按模型中的起点与终点定义，流点显示实际方向。')}</p>{!pipe.pump&&<button className="cw-action" onClick={()=>change({closedPipes:settings.closedPipes.includes(pipeIndex)?settings.closedPipes.filter(v=>v!==pipeIndex):[...settings.closedPipes,pipeIndex]})}>{tx(settings.closedPipes.includes(pipeIndex)?'重新打开这段管道':'关闭这段管道')}<span>{settings.closedPipes.includes(pipeIndex)?'OPEN':'CLOSE'}</span></button>}</>}
          {node&&nodeIndex!==null&&<><p className="cw-body">{tx('这个街区连接在环网的一个节点上。压力取决于地面高程、邻接管道的损失，以及此刻整个城市的用水。')}</p><dl className="cw-detail-readings"><div><dt>{tx('地面高程')}</dt><dd>{node.elevation.toFixed(1)} m</dd></div><div><dt>{tx('节点水压')}</dt><dd>{Math.max(0,h.heads[nodeIndex]-node.elevation).toFixed(1)} m</dd></div><div><dt>{tx('需求 / 实供')}</dt><dd>{(h.requested[nodeIndex]*1000).toFixed(1)} / {(h.delivered[nodeIndex]*1000).toFixed(1)} L/s</dd></div><div><dt>{tx('水龄 / 余氯')}</dt><dd>{(s.nodeAge[nodeIndex]/3600).toFixed(1)} h / {s.nodeChlorine[nodeIndex].toFixed(2)} mg/L</dd></div></dl>{nodeIndex===8&&settings.leak>0&&<button className="cw-action" onClick={()=>change({leak:0})}>{tx('修复这处漏水')}<span>→</span></button>}</>}
          {selected==='district'&&<><Slider label={tx('全城用水倍率')} min={.5} max={2.5} step={.05} digits={2} value={settings.demand} onChange={v=>change({demand:v})}/><div className="cw-data-row"><span>{tx('当前需求')}</span><b>{(requested*1000).toFixed(1)} L/s</b></div><p className="cw-limit">{tx('点任一街角的铜色节点，查看当地水压、水龄和供水。')}</p></>}
        </>}
        {tab==='dispatch'&&<>
          <h2>{tx('让整座城市一起回应')}</h2><p className="cw-body">{tx('改变一个地方，观察储水、流向与每个街区的压力。模拟会继续，不会替你重置。')}</p>
          <div className="cw-section-title">{tx('供水与用水')}</div>
          <Slider label={tx('泵相对转速')} min={.55} max={1.25} step={.01} digits={2} value={settings.pumpSpeed} onChange={v=>change({pumpSpeed:v})}/>
          <label className="cw-check"><span>{tx('自动调速')}</span><input type="checkbox" checked={settings.automatic} onChange={e=>change({automatic:e.target.checked})}/></label>
          <label className="cw-check"><span>{tx('泵站与水厂有电')}</span><input type="checkbox" checked={settings.power} onChange={e=>change({power:e.target.checked})}/></label>
          <Slider label={tx('取水闸门')} min={0} max={100} value={settings.intake*100} unit="%" onChange={v=>change({intake:v/100})}/>
          <Slider label={tx('全城用水倍率')} min={.5} max={2.5} step={.05} digits={2} value={settings.demand} onChange={v=>change({demand:v})}/>
          <Gauge label={tx('水库储量')} value={s.reservoir} max={RESERVOIR_CAPACITY}/><Gauge label={tx('清水池储量')} value={s.clearwell} max={CLEARWELL_CAPACITY}/><Gauge label={tx('水塔储量')} value={s.tower} max={TOWER_CAPACITY}/>
          <div className="cw-section-title">{tx('原水与处理')}</div><Slider label={tx('上游来水')} min={0} max={160} step={2} value={settings.inflow*1000} unit="L/s" onChange={v=>change({inflow:v/1000})}/>
          <Slider label={tx('混凝强度')} min={0} max={1.5} step={.05} digits={2} value={settings.coagulant} onChange={v=>change({coagulant:v})}/>
          <TreatmentStrip simulation={s} settings={settings}/><Slider label={tx('出厂余氯参照')} min={0} max={1.5} step={.05} digits={2} value={settings.disinfectant} unit="mg/L" onChange={v=>change({disinfectant:v})}/>
          <button className="cw-action" disabled={s.backwash>0} onClick={()=>{register();s.backwash=900;setFrame(f=>f+1)}}>{tx(s.backwash>0?'正在反冲洗':'启动反冲洗')}<span>15 min</span></button>
        </>}
        {tab==='experiments'&&<>
          <h2>{tx('换一个条件，重新看这座城')}</h2><p className="cw-body">{tx('三份可重玩的调度任务。它们会重新布置水量和时间，你仍可自由转动镜头、开关阀门与调整策略。')}</p>
          <div className="cw-experiments">{([
            ['blackout','01','停电一小时','早高峰前，只剩 240 m³ 高位储水。试着靠节水撑过一小时；恢复供电会结束这次停电条件。'],
            ['morning','02','守住早高峰','从清晨六点开始，连续两小时满足至少 92% 需求。调泵、补水，也可以让城市少用一点。'],
            ['leak','03','找到漏掉的水','城市有一处破管。沿着水流和压力找到它，点街角节点修复，再看管网怎样恢复。'],
          ] as const).map(([id,num,title,body])=><button key={id} className="cw-experiment" onClick={()=>startMission(id)}><span>{num} <b>↗</b></span><strong>{tx(title)}</strong><p>{tx(body)}</p></button>)}</div>
          <div className="cw-section-title">{tx('自由制造变化')}</div>
          <Slider label={tx('裂口面积')} min={0} max={1500} step={50} value={settings.leak*1e6} unit="mm²" onChange={v=>change({leak:v/1e6})}/>
          <label className="cw-check"><span>{tx('开启消防取水')}<small>+35 L/s</small></span><input type="checkbox" checked={settings.fire} onChange={e=>change({fire:e.target.checked})}/></label>
          <label className="cw-check"><span>{tx('隔离一段横向干管')}</span><input type="checkbox" checked={settings.isolation} onChange={e=>change({isolation:e.target.checked})}/></label>
          <button className="cw-link" onClick={()=>select(`pipe:${ISOLATION_PIPE}`)}>{tx('找到这段管道')} →</button>
          <p className="cw-limit">{tx('也可以直接点任意管道，再单独关闭或打开它。')}</p>
        </>}
        <details className="cw-network-list"><summary>{tx('按编号检查管网')}</summary>
          <label>{tx('街区节点')}<select aria-label={tx('选择街区节点')} value={nodeIndex??''} onChange={e=>select(`node:${e.target.value}`)}><option value="" disabled>{tx('选择节点')}</option>{NODES.map((n,i)=>n.demand?<option key={n.id} value={i}>J{String(i).padStart(2,'0')} · {tx(n.label)}</option>:null)}</select></label>
          <label>{tx('环网管道')}<select aria-label={tx('选择管道')} value={pipeIndex??''} onChange={e=>select(`pipe:${e.target.value}`)}><option value="" disabled>{tx('选择管道')}</option>{PIPES.map((p,i)=><option key={p.id} value={i}>P{String(i).padStart(2,'0')} · {Math.round(p.length)} m / {p.diameter*1000} mm</option>)}</select></label>
        </details>
        <Trend simulation={s}/>
        <details className="cw-record"><summary>{tx('水量账本与模型边界')}</summary><dl className="cw-detail-readings"><div><dt>{tx('累计供给城市')}</dt><dd>{s.delivered.toFixed(0)} m³</dd></div><div><dt>{tx('累计漏失')}</dt><dd>{s.leaked.toFixed(0)} m³</dd></div><div><dt>{tx('累计溢流')}</dt><dd>{s.overflowed.toFixed(0)} m³</dd></div><div><dt>{tx('累计泵耗电')}</dt><dd>{s.energy.toFixed(1)} kWh</dd></div><div><dt>{tx('节点守恒残差')}</dt><dd>{(h.residual*1000).toExponential(1)} L/s</dd></div></dl><p>{tx('原创参考城市。采用定摩阻 Darcy–Weisbach、压力相关供水、泵曲线、储水守恒和四单元迎风输运。忽略水锤、楼内管路、管壁反应与病原体。几何、工艺效率、需求与反应参数为教学假设。')}</p><a href="https://www.epa.gov/water-research/epanet" target="_blank" rel="noreferrer">EPA · EPANET ↗</a></details>
      </div>
    </aside>
    <GuideTour worldId="city-water" defaultOpen={false} steps={guide} placement="stage" kicker={tx('一座城怎样喝到水')} exitLabel={tx('自由探索')} stagePlan={guide.map(()=>({position:'bottom-left',mobilePosition:'bottom-center',tone:'light',width:'narrow',treatment:'caption'}))}/>
  </div>
}
