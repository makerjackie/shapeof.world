import {useCallback,useEffect,useMemo,useRef,useState,type CSSProperties} from 'react'
import type {ExperienceControls} from '~/components/ExperienceShell'
import {GuideTour,GUIDE_REPLAY_EVENT} from '~/components/experiences/GuideTour'
import {useWorldLoadProgress} from '~/components/experiences/WorldLoadProgress'
import {useExperienceI18n} from '~/i18n/experience'
import {isWorldPaused} from '~/lib/world-playback'
import {FlowScene,type FieldMode,type SceneState,type View} from './Scene'
import {loadFields,type Fields} from './load'
import {advanceDrifter,createDrifter,distance,formatCoordinate,MAX_TIME,sample,trackAt,vectorAngle,type Drifter,type FieldKind,type Location,type Velocity} from './model'
import {REGIONS,type Region} from './regions'
import './styles/FlowWorld.css'

function Compass({wind,ocean}:{wind:Velocity|null;ocean:Velocity|null}) {
  const tx=useExperienceI18n()
  return <svg className="wo-compass" viewBox="0 0 100 100" role="img" aria-label={tx('当地风和洋流的去向')}><circle cx="50" cy="50" r="33" fill="none" stroke="#284251" strokeWidth=".8"/><circle cx="50" cy="50" r="19" fill="none" stroke="#203542" strokeWidth=".6"/><path d="M50 13V87M13 50H87" stroke="#36515e" strokeWidth=".6"/><text x="50" y="8" textAnchor="middle">N</text><text x="50" y="98" textAnchor="middle">S</text><text x="96" y="53" textAnchor="middle">E</text><text x="5" y="53" textAnchor="middle">W</text>{[[wind,'#dfbb87',34],[ocean,'#81d4cf',25]].map(([v,c,l],i)=>v&&(v as Velocity).speed>.001&&<g key={i} transform={`rotate(${(v as Velocity).toward} 50 50)`}><path d={`M50 50V${50-(l as number)}`} stroke={c as string} strokeWidth="1.8"/><path d={`M46 ${56-(l as number)}L50 ${49-(l as number)}L54 ${56-(l as number)}`} fill="none" stroke={c as string} strokeWidth="1.8"/></g>)}<circle cx="50" cy="50" r="2" fill="#cedbcf"/></svg>
}
function SpeedReading({kind,value}:{kind:FieldKind;value:Velocity|null}) {
  const tx=useExperienceI18n()
  return <div className={`wo-speed wo-${kind}`}><div><span>{tx(kind==='wind'?'十米风':'近表层洋流')}</span><small>{kind==='wind'?'GFS · 1°':'OSCAR · ⅓°'}</small></div><strong>{value?value.speed.toFixed(2):'—'}<small>m/s</small></strong>{value?<p><span>{tx(kind==='wind'?'从':'流向')} {value.speed>.001?`${Math.round(kind==='wind'?value.from:value.toward)}°`:'—'}</span><span>{kind==='wind'?(value.speed*3.6).toFixed(1):(value.speed*1.943844).toFixed(2)} {kind==='wind'?'km/h':'kn'}</span></p>:<p>{tx('缺测 · 不补成零')}</p>}</div>
}
function Duration({seconds}:{seconds:number}) {return <>{Math.floor(seconds/86400).toString().padStart(2,'0')}<small>d</small> {Math.floor(seconds%86400/3600).toString().padStart(2,'0')}<small>h</small></>}
export function FlowWorld({controls}:{controls:ExperienceControls}) {
  const tx=useExperienceI18n(),{report,finish}=useWorldLoadProgress()
  const [fields,setFields]=useState<Fields|null>(null),[loadError,setLoadError]=useState(false),[retry,setRetry]=useState(0)
  const [mode,setMode]=useState<FieldMode>('both'),[probe,setProbe]=useState<Location>({...REGIONS[0].at}),[region,setRegion]=useState('atlantic')
  const [playing,setPlaying]=useState(()=>typeof window==='undefined'||!matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [speed,setSpeed]=useState(10800),[tool,setTool]=useState<'probe'|'release'>('probe'),[releaseKind,setReleaseKind]=useState<FieldKind>('ocean')
  const [grid,setGrid]=useState(true),[heat,setHeat]=useState(false),[arrows,setArrows]=useState(true),[spin,setSpin]=useState(false),[follow,setFollow]=useState(false),[density,setDensity]=useState(1)
  const [panel,setPanel]=useState(true),[tab,setTab]=useState<'measure'|'drift'|'atlas'>('measure'),[selected,setSelected]=useState<number|null>(null),[notice,setNotice]=useState('')
  const [,setFrame]=useState(0),[longitude,setLongitude]=useState(probe.lon.toFixed(2)),[latitude,setLatitude]=useState(probe.lat.toFixed(2))
  const [view,setView]=useState<View>({at:{lon:-35,lat:22},distance:3.7,revision:0})
  const [mobile]=useState(()=>typeof window!=='undefined'&&matchMedia('(max-width:700px)').matches)
  const [reduced]=useState(()=>typeof window!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches)
  const drifters=useRef<Drifter[]>([]),clock=useRef({elapsed:0,playhead:0}),nextId=useRef(1),releaseRef=useRef<(kind:FieldKind|'pair',count?:number,at?:Location)=>void>(()=>{})
  const runtime=useRef({fields,playing,speed,tool,releaseKind}),scene=useRef<SceneState>({mode,playing,grid,heat,arrows,time:0,drifters:[],probe,selected,spin,follow,reduced})
  runtime.current={fields,playing,speed,tool,releaseKind}
  const register=controls.registerInteraction
  useEffect(()=>{
    const abort=new AbortController();let texture:Fields['texture']|null=null
    setLoadError(false);report({loaded:0,label:tx('载入历史格点与地球底图')})
    loadFields(abort.signal,loaded=>report({loaded,label:tx('载入历史格点与地球底图')})).then(result=>{texture=result.texture;setFields(result);finish()}).catch(error=>{finish();if(error.name!=='AbortError'){console.warn('Historical field load failed',error);setLoadError(true)}})
    return()=>{abort.abort();texture?.dispose();finish()}
  },[retry])
  useEffect(()=>{
    let raf=0,last=performance.now(),update=0
    const tick=(now:number)=>{
      const dt=Math.min(.09,(now-last)/1000);last=now
      const r=runtime.current,c=clock.current
      if(r.fields&&r.playing&&drifters.current.length&&!document.hidden&&!isWorldPaused()){
        const step=dt*r.speed
        if(c.playhead<c.elapsed-.01)c.playhead=Math.min(c.elapsed,c.playhead+step)
        else{c.elapsed=Math.min(MAX_TIME,c.elapsed+step);drifters.current.forEach(d=>advanceDrifter(d,r.fields![d.kind],c.elapsed));c.playhead=c.elapsed}
        if(c.playhead>=MAX_TIME)setPlaying(false)
      }
      scene.current.time=c.playhead
      update+=dt;if(update>.14){setFrame(v=>v+1);update=0}
      raf=requestAnimationFrame(tick)
    }
    raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf)
  },[])
  const locate=useCallback((at:Location)=>{setProbe(at);setLongitude(at.lon.toFixed(2));setLatitude(at.lat.toFixed(2));setNotice('')},[])
  const onPoint=useCallback((at:Location)=>{
    register();locate(at);setFollow(false)
    if(runtime.current.tool==='release')releaseRef.current(runtime.current.releaseKind,1,at)
  },[register,locate])
  const onPick=useCallback((id:number)=>{register();setSelected(id);setTab('drift')},[register])
  const onOrbit=useCallback(()=>{register();setFollow(false);setSpin(false)},[register])
  const focus=useCallback((at:Location,distance=2.6)=>{setSpin(false);setFollow(false);setView(v=>({at:{...at},distance,revision:v.revision+1}))},[])
  const selectRegion=useCallback((r:Region)=>{register();setRegion(r.id);locate(r.at);setMode(r.kind);focus(r.camera,r.distance)},[register,locate,focus])
  const release=useCallback((kind:FieldKind|'pair',count=1,at=probe)=>{
    register();if(!fields)return
    if(clock.current.elapsed>=MAX_TIME){setNotice('已到观察上限，清除轨迹后再试。');return}
    if(kind==='pair'&&(!sample(fields.wind,at.lon,at.lat)||!sample(fields.ocean,at.lon,at.lat))){setNotice('这里缺少完整的两层数据，请换一个位置。');return}
    const wanted=kind==='pair'?2:count
    if(drifters.current.length+wanted>12){setNotice('最多保留十二个标记，先移除一些再放。');return}
    clock.current.playhead=clock.current.elapsed
    const group=nextId.current,added:Drifter[]=[]
    for(let i=0;i<wanted;i++){
      const type=kind==='pair'?(i===0?'wind':'ocean'):kind
      const point=count===1?at:{lon:at.lon+(i%3-1)*.22/Math.max(.2,Math.cos(at.lat*Math.PI/180)),lat:at.lat+(Math.floor(i/3)-1)*.22}
      const d=createDrifter(nextId.current++,type,point,clock.current.elapsed,fields[type],group);if(d)added.push(d)
    }
    if(!added.length){setNotice('这里没有完整格点，换到有数据的位置再放。');return}
    drifters.current=[...drifters.current,...added];setSelected(added[0].id);setTab('drift');setPlaying(true);setNotice(added.length<wanted?'有些起点缺测，只释放有数据的标记。':'');setFrame(v=>v+1)
  },[register,fields,probe])
  releaseRef.current=release
  const clear=()=>{register();drifters.current=[];clock.current={elapsed:0,playhead:0};setSelected(null);setFollow(false);setNotice('');setFrame(v=>v+1)}
  const seek=(time:number)=>{register();clock.current.playhead=Math.min(clock.current.elapsed,Math.max(0,time));setPlaying(false);setFrame(v=>v+1)}
  const submitCoordinate=(e:React.FormEvent)=>{
    e.preventDefault();const lon=Number(longitude),lat=Number(latitude)
    if(!Number.isFinite(lon)||!Number.isFinite(lat)||lon<-180||lon>180||lat<-90||lat>90){setNotice('经度需在 −180 到 180，纬度需在 −90 到 90。');return}
    register();locate({lon,lat});focus({lon,lat},2.6)
  }
  const valueWind=fields&&sample(fields.wind,probe.lon,probe.lat),valueOcean=fields&&sample(fields.ocean,probe.lon,probe.lat),angle=vectorAngle(valueWind,valueOcean)
  const picked=drifters.current.find(d=>d.id===selected),pickedAt=picked&&trackAt(picked,clock.current.playhead)
  const pickedVelocity=picked&&pickedAt&&fields?sample(fields[picked.kind],pickedAt.lon,pickedAt.lat):null
  const currentRegion=REGIONS.find(r=>r.id===region)!
  scene.current={mode,playing,grid,heat,arrows,time:clock.current.playhead,drifters:drifters.current,probe,selected,spin,follow,reduced}
  const guide=useMemo(()=>[
    {title:'先转动这颗地球',body:'它装着两份 2014 年 1 月 31 日的真实历史格点：近地风和近表层洋流。可以旋转、缩放，任何时候都能自己玩。',action:()=>{setMode('both');focus({lon:-35,lat:22},3.7)}},
    {title:'在一股强流上停一下',body:'走近北大西洋。青色线来自洋流格点；点击别处，仪表会读出当地的真实插值速度。',action:()=>selectRegion(REGIONS[0])},
    {title:'风从哪里来，水往哪里去',body:'铜色是风，青色是海水。风向仪表报告来向，箭头与轨迹显示去向；两种速度并不相同。',action:()=>{setMode('both');setTab('measure');setArrows(true)}},
    {title:'把两个标记放在同一处',body:'让空气与海水从相同经纬度出发。它们用同一个时钟，按各自的速度，在冻结的历史场里积分。',action:()=>releaseRef.current('pair',1,REGIONS[0].at)},
    {title:'去别的海域，再试一次',body:'从黑潮到南大洋，再到赤道太平洋。区域卡带你靠近，轨迹和读数仍来自同一份历史数据。',action:()=>{setTab('atlas');setMode('both')}},
    {title:'把路线留下来，回看途中',body:'下方的时间条可以回看已经算过的路线。缺测时标记停在最后一个有效点，不把它解释成真实搁浅。',action:()=>setTab('drift')},
  ].map(step=>({...step,durationMs:10000})),[focus,selectRegion])
  return <div className="wo-world" data-testid="wind-ocean" data-ready={!!fields} data-mode={mode} data-playing={playing} data-time={clock.current.playhead.toFixed(0)} data-drifters={drifters.current.length} data-panel={panel}>
    <section className={`wo-stage wo-tool-${tool}`} aria-label={tx('可旋转的风与洋流地球')}>
      <FlowScene fields={fields} state={scene} view={view} density={density} mobile={mobile} onPoint={onPoint} onPick={onPick} onInteract={onOrbit}/>
      <div className="wo-title"><span>THE MOVING PLANET / 2014</span><h1>{tx('风，与洋流')}</h1><p>{tx('同一颗地球，两层看不见的运动。')}</p></div>
      <div className="wo-snapshot"><span>{tx('历史切片')}</span><strong>2014.01.31</strong><small>GFS 03:00 UTC / OSCAR 5 d</small></div>
      <div className="wo-view-tools"><button onClick={()=>{register();focus({lon:-35,lat:22},3.7)}}>{tx('全景')}</button><button onClick={()=>{register();focus(probe,2.1)}}>{tx('近看这里')}</button><button onClick={()=>{register();setPanel(v=>!v)}}>{tx(panel?'隐藏仪表':'打开仪表')}</button></div>
      <nav className="wo-field-nav" aria-label={tx('选择运动层')}>{([['ocean','洋流','OSCAR'],['wind','风','GFS'],['both','叠加','U / V']] as const).map(([id,label,sub])=><button key={id} aria-pressed={mode===id} onClick={()=>{register();setMode(id)}}><i data-kind={id}/><span>{tx(label)}</span><small>{sub}</small></button>)}</nav>
      <div className="wo-legend" data-mode={mode}><span>{tx(mode==='wind'?'风速':'洋流速度')} <small>m/s</small></span><i/><div>{(mode==='wind'?[0,7,14,21,28]:[0,.6,1.2,1.8,2.4]).map((v,i)=><b key={v}>{i===4?`≥${v}`:v}</b>)}</div><p>{tx(mode==='both'?(heat?'叠加时色层表示洋流速度':'青色洋流 · 铜色风 · 色标为洋流'):'颜色表示速度，流线显示去向')}</p></div>
      <div className="wo-stage-actions"><button aria-pressed={tool==='probe'} onClick={()=>{register();setTool('probe')}}>{tx('测量')}</button><button aria-pressed={tool==='release'} onClick={()=>{register();setTool('release');setTab('drift')}}>{tx('放标记')}</button><button onClick={()=>window.dispatchEvent(new CustomEvent(GUIDE_REPLAY_EVENT,{detail:{worldId:'wind-ocean'}}))}>{tx('带我看')}</button></div>
      <div className="wo-time-bar"><button className="wo-play" aria-label={tx(playing?'暂停运动':'继续运动')} onClick={()=>{register();setPlaying(v=>!v)}}><span aria-hidden="true">{playing?'Ⅱ':'▷'}</span>{tx(playing?'暂停':'继续')}</button><div><span>{tx('漂流时钟')}</span><strong><Duration seconds={clock.current.playhead}/></strong></div><label><span>{tx('每秒推进')}</span><select aria-label={tx('漂流时间倍率')} value={speed} onChange={e=>{register();setSpeed(Number(e.target.value))}}>{[3600,10800,43200].map(v=><option key={v} value={v}>{v/3600} h/s</option>)}</select></label><button className="wo-clear" onClick={clear}>{tx('清除轨迹')}</button><input aria-label={tx('回看已计算的轨迹')} type="range" min={0} max={Math.max(1,clock.current.elapsed)} step={1} value={clock.current.playhead} disabled={!drifters.current.length} onChange={e=>seek(Number(e.target.value))} style={{'--wo-fill':`${clock.current.elapsed?clock.current.playhead/clock.current.elapsed*100:0}%`} as CSSProperties}/></div>
      <p className="wo-stage-note">{tx(tool==='release'?'点地球，放出所选介质的标记':'拖动旋转 · 滚轮缩放 · 点选经纬度')}<span>{tx('冻结场积分 · 流线循环只示方向')}</span></p>
      {!fields&&!loadError&&<p className="wo-loading" role="status">{tx('正在展开历史格点')}</p>}
      {loadError&&<div className="wo-load-error" role="alert"><p>{tx('格点暂时没有载入，请重试。')}</p><button onClick={()=>setRetry(v=>v+1)}>{tx('重新载入')}</button></div>}
    </section>
    <aside className="wo-panel" hidden={!panel} aria-label={tx('风与洋流观测台')}>
      <div className="wo-panel-heading"><span>{tx('地球流场观测台')}</span><i data-live={playing&&!!fields}/></div>
      <div className="wo-location"><span>{tx('当前测量点')}</span><strong><span>{formatCoordinate(probe.lat,true)}</span><small>/</small><span>{formatCoordinate(probe.lon)}</span></strong></div>
      <div className="wo-speed-pair"><SpeedReading kind="wind" value={valueWind}/><SpeedReading kind="ocean" value={valueOcean}/></div>
      <nav className="wo-tabs" aria-label={tx('观测台页签')}>{([['measure','测量'],['drift','漂流'],['atlas','海域']] as const).map(([id,label])=><button key={id} aria-pressed={tab===id} onClick={()=>{register();setTab(id)}}>{tx(label)}</button>)}</nav>
      <div className="wo-scroll">
        {notice&&<p className="wo-notice" role="status">{tx(notice)}</p>}
        {tab==='measure'&&<>
          <div className="wo-direction"><Compass wind={valueWind} ocean={valueOcean}/><div><span>{tx('两个去向的夹角')}</span><strong>{angle===null?'—':Math.round(angle)}<small>°</small></strong><p>{tx('铜色风 · 青色海水')}</p></div></div>
          <p className="wo-explanation">{tx('风向仪表按来向读数；罗盘、箭头和标记都朝运动去向。点击地球，可以逐点测量。')}</p><p className="wo-fine">{tx('箭头只指示去向，长度不比较速度。')}</p>
          <form className="wo-coordinate-form" onSubmit={submitCoordinate}><label>{tx('经度')}<input aria-label={tx('经度')} type="number" required min={-180} max={180} step=".01" value={longitude} onChange={e=>setLongitude(e.target.value)}/></label><label>{tx('纬度')}<input aria-label={tx('纬度')} type="number" required min={-90} max={90} step=".01" value={latitude} onChange={e=>setLatitude(e.target.value)}/></label><button type="submit">{tx('定位')}</button></form>
          <button className="wo-primary" disabled={!fields||!valueWind||!valueOcean||drifters.current.length>10} onClick={()=>release('pair')}>{tx('同处释放：空气与海水')}<span aria-hidden="true">↗</span></button>
          <div className="wo-section-title">{tx('显示与观察')}</div>
          <label className="wo-check"><span>{tx('经纬网')}</span><input type="checkbox" checked={grid} onChange={e=>{register();setGrid(e.target.checked)}}/></label>
          <label className="wo-check"><span>{tx('速度色层')}</span><input type="checkbox" checked={heat} onChange={e=>{register();setHeat(e.target.checked)}}/></label>
          <label className="wo-check"><span>{tx('当地去向箭头')}</span><input type="checkbox" checked={arrows} onChange={e=>{register();setArrows(e.target.checked)}}/></label>
          <label className="wo-check"><span>{tx('缓慢环看')}</span><input type="checkbox" checked={spin} onChange={e=>{register();setSpin(e.target.checked);setFollow(false)}}/></label>
          <label className="wo-density">{tx('流线密度')}<select aria-label={tx('流线密度')} value={density} onChange={e=>{register();setDensity(Number(e.target.value))}}><option value={.6}>{tx('疏')}</option><option value={1}>{tx('标准')}</option><option value={1.5}>{tx('密')}</option></select></label>
        </>}
        {tab==='drift'&&<>
          <h2>{tx('让一条路线自己长出来')}</h2><p className="wo-explanation">{tx('在选点放标记，或切换“放标记”后直接点地球。轨迹按真实速度积分；背景流线的循环不作计时。')}</p>
          <div className="wo-medium" role="group" aria-label={tx('选择漂流介质')}>{([['ocean','海水标记'],['wind','空气标记']] as const).map(([id,label])=><button key={id} aria-pressed={releaseKind===id} onClick={()=>{register();setReleaseKind(id)}}>{tx(label)}</button>)}</div>
          <button className="wo-primary" disabled={!fields||drifters.current.length>=12} onClick={()=>release(releaseKind)}>{tx('在这里释放一个')}<span aria-hidden="true">+</span></button>
          <button className="wo-secondary" disabled={!fields||drifters.current.length>3} onClick={()=>release(releaseKind,9)}>{tx('放一组相邻的九个标记')}<span aria-hidden="true">↗</span></button>
          <p className="wo-fine">{tx('相邻起点约隔二十多公里。这里的分散只来自冻结场的速度差，不含湍流扩散。')}</p>
          <div className="wo-track-heading"><span>{tx('留下的路线')}</span><small>{drifters.current.length} / 12</small></div>
          {!drifters.current.length&&<p className="wo-empty">{tx('还没有标记。先在一片有数据的海上放一个。')}</p>}
          <div className="wo-tracks">{drifters.current.map(d=>{const p=trackAt(d,clock.current.playhead);return <div className="wo-track" key={d.id} data-selected={selected===d.id}>
            <button className="wo-track-select" onClick={()=>{register();setSelected(d.id);if(p){locate(p);focus(p,2.5)}}}><i style={{background:d.color}}/><span>{tx(d.kind==='wind'?'空气':'海水')} <b>{String(d.id).padStart(2,'0')}</b></span><strong>{p?(p.distance/1000).toFixed(0):'—'}<small>km</small></strong></button>
            <button className="wo-remove" aria-label={tx('移除这个标记')} onClick={()=>{register();drifters.current=drifters.current.filter(item=>item.id!==d.id);if(selected===d.id){setSelected(null);setFollow(false)}setFrame(v=>v+1)}}>×</button>
          </div>})}</div>
          {picked&&<div className="wo-picked"><span>{tx('选中路线')} {String(picked.id).padStart(2,'0')}</span><p>{pickedAt?`${formatCoordinate(pickedAt.lat,true)} / ${formatCoordinate(pickedAt.lon)}`:tx('这时还没有释放')}</p><dl><div><dt>{tx('漂流用时')}</dt><dd><Duration seconds={Math.max(0,(pickedAt?.time??clock.current.playhead)-picked.created)}/></dd></div><div><dt>{tx('轨迹长度')}</dt><dd>{pickedAt?(pickedAt.distance/1000).toFixed(1):'—'} km</dd></div><div><dt>{tx('当前位置速度')}</dt><dd>{pickedVelocity?pickedVelocity.speed.toFixed(2):'—'} m/s</dd></div></dl><p className="wo-status">{tx(picked.reason==='calm'?'该点速度接近零':picked.active?'沿冻结场前进':picked.reason==='missing'?'到达缺测边界，停在最后有效点':'到达三十天观察上限')}</p><label className="wo-check"><span>{tx('镜头跟随这个标记')}</span><input type="checkbox" checked={follow} onChange={e=>{register();setFollow(e.target.checked);setSpin(false)}}/></label></div>}
          {drifters.current.length>=2&&<div className="wo-separation"><span>{tx('最前两个标记的间距')}</span><strong>{(()=>{const a=trackAt(drifters.current[0],clock.current.playhead),b=trackAt(drifters.current[1],clock.current.playhead);return a&&b?(distance(a,b)/1000).toFixed(1):'—'})()} <small>km</small></strong></div>}
        </>}
        {tab==='atlas'&&<>
          <h2>{tx('沿着运动，走遍海洋')}</h2><p className="wo-explanation">{tx('这些入口只是镜头位置。流线、探针和漂流仍来自同一组历史格点，没有预先画好的流向。')}</p>
          <div className="wo-regions">{REGIONS.map((r,i)=><button key={r.id} aria-pressed={region===r.id} onClick={()=>selectRegion(r)}><span>{String(i+1).padStart(2,'0')}<small>{r.kind==='wind'?'GFS':r.kind==='both'?'GFS + OSCAR':'OSCAR'}</small></span><strong>{tx(r.title)}</strong><p>{tx(r.kicker)}</p></button>)}</div><p className="wo-region-note">{tx(currentRegion.body)}</p>
        </>}
        <details className="wo-data-note"><summary>{tx('这份数据能告诉我们什么')}</summary><p>{tx('风：2014-01-31 00:00 UTC 起报、预报三小时的 GFS 十米风，1° 网格。洋流：标称 2014-01-31 的 OSCAR ⅓° 五日产品，代表上层 30 米平均流，原始文件深度标签为 15 米。')}</p><p>{tx('只各有一帧。播放不更新天气；漂流把这一帧保持不变，最长三十天，不是实际漂流预测。洋流缺测不补零，轨迹遇到缺测即停。')}</p><p>{tx('球面积分使用各产品的参考地球半径；相同位置的两种速度不代表瞬时因果关系。图层高度、箭头长度与地球照明为辨认而设计。')}</p><a href="https://doi.org/10.5067/OSCAR-03D01" target="_blank" rel="noreferrer">ESR / NASA PO.DAAC ↗</a><a href="https://www.ncei.noaa.gov/products/weather-climate-models/global-forecast" target="_blank" rel="noreferrer">NOAA / NCEP GFS ↗</a></details>
      </div>
    </aside>
    <GuideTour worldId="wind-ocean" defaultOpen={false} steps={guide} placement="stage" kicker={tx('看见地球的运动')} exitLabel={tx('自由探索')} stagePlan={guide.map(()=>({position:'bottom-left',mobilePosition:'bottom-center',tone:'light',treatment:'caption',width:'narrow'}))}/>
  </div>
}
