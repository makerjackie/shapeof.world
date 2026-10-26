import { useEffect, useRef, useState } from 'react'
import { useExperienceI18n } from '~/i18n/experience'
import type { Network } from '../sim/types'
import { routeSignal } from './route-signal'
import { approachName, exitName, TURN_NAMES, TURN_SYMBOLS, turnKey, type ExploreRoute } from './routes'
import { DEMO_STATUS, type DemoState } from './replay'
import { COMPARISONS, type WhyPin } from './explanations'
import { ConflictLegend } from './ConflictLegend'
import { useEditorialText } from './use-editorial-text'

export function ExplorerPanel({network,routes,route,onSelect,onExit,onReplay,follow,onFollow,demo,pins,activePin,onPin,explaining,onExplain,onDesign}:{network:Network;routes:ExploreRoute[];route?:ExploreRoute;onSelect:(id:string)=>void;onExit:()=>void;onReplay:()=>void;follow:boolean;onFollow:()=>void;demo:DemoState;pins:WhyPin[];activePin:string|null;onPin:(id:string)=>void;explaining:boolean;onExplain:()=>void;onDesign:(id:string)=>void}) {
 const tx=useExperienceI18n(),copy=useEditorialText()
 const [from,setFrom]=useState(routes[0]?.movement.from??'north'),[picker,setPicker]=useState(false)
 const [expanded,setExpanded]=useState(false),[view,setView]=useState<'why'|'readings'|'choose'>('why')
 const gesture=useRef({y:0,dragged:false,active:false})
 useEffect(()=>{setExpanded(false);setPicker(false);setView('why')},[route?.movement.id])
 const approaches=[...new Set(routes.map(r=>r.movement.from))],current=approaches.includes(from)?from:approaches[0]
 const options=routes.filter(r=>r.movement.from===current),reading=route?.reading,active=pins.find(p=>p.id===activePin)??pins[0]
 const signal=route?routeSignal(network,route.movement,demo.laneId,demo.time):undefined,color=signal?.color
 const name=route?`${tx(approachName(route.movement.from))} · ${tx(TURN_NAMES[turnKey(route.movement)])}`:''
 const choose=<div className="rd-flow-select">
  <label>{tx('从哪里进')}<select aria-label={tx('从哪里进')} value={current} onChange={e=>setFrom(e.target.value)}>{approaches.map(a=><option key={a} value={a}>{tx(approachName(a))}</option>)}</select></label>
  <div className="rd-turns">{options.map(r=>{const key=turnKey(r.movement);return <button type="button" key={r.movement.id} data-route-id={r.movement.id} aria-label={`${tx(approachName(current))} · ${tx(TURN_NAMES[key])}${network.id==='huangjuewan'?` → ${tx(approachName(r.movement.to))}`:''}`} aria-pressed={route?.movement.id===r.movement.id} onClick={()=>onSelect(r.movement.id)}><b>{TURN_SYMBOLS[key]}</b><span>{tx(TURN_NAMES[key])}{network.id==='huangjuewan'&&<small>{tx(approachName(r.movement.to))}</small>}</span></button>})}</div>
  {network.id==='huangjuewan'&&<button className="rd-longest" type="button" onClick={()=>{const longest=[...routes].sort((a,b)=>b.reading.detour-a.reading.detour)[0];setFrom(longest.movement.from);onSelect(longest.movement.id)}}>{tx('找出最绕的路线')} <span>↗</span></button>}
  {!route&&<p className="rd-invitation">{tx('点一个方向，看示范车走完全程。')}</p>}
 </div>
 const why=active&&<section className="rd-explanation" aria-label={tx('为什么这样设计')}>
  <div className="rd-pin-pages">{pins.map((p,i)=><button type="button" key={p.id} aria-label={copy(p,'title')} aria-pressed={p.id===active.id} onClick={()=>onPin(p.id)}>{i+1}</button>)}<span>{tx('为什么这样设计')}</span></div>
  <h2>{copy(active,'title')}</h2><p className="rd-why-body">{copy(active,'body')}</p>
 </section>
 const notes=<details className="rd-reading-notes"><summary>{tx('读数口径')}</summary>
  <p>{tx('完整模型入口到出口；直线仅作距离基准。半径取车道线形，车速为该段模型设定，不代表安全限速。')}</p>
  <p>{tx('交叉：不同方向在同一高度横穿。合流：两股车接入同一股。分流：一股车分向不同出口。信号只分配通过时间，不删除几何交叉。')}</p>
  <p>{tx('交织区：驶入与驶出车辆在同一段路上交换位置，按路网标记单列。各类只计所选路线涉及的模型点位，不是危险程度或事故预测。')}</p>
  <p>{tx('示范车使用同一交通模型的独立回放；行驶加快，短暂停车放慢，便于观察。')}</p>
  {network.id==='huangjuewan'&&<p>{tx('OSM 未标出的交织区不计入；0 段不代表现实中不存在。高度为推断值。')}</p>}
 </details>
 const readings=reading&&<div className="rd-measurements" aria-label={tx('路线读数')}>
  <dl className="rd-route-readings">
   <div><dt>{tx('路线长度')}</dt><dd>{Math.round(reading.length).toLocaleString('en-US')} <small>m</small></dd></div>
   <div className="rd-detour"><dt>{tx('比直线多走')}</dt><dd>+{Math.round(reading.detour).toLocaleString('en-US')} <small>m</small></dd></div>
   <div><dt>{tx('最小转弯半径')}</dt><dd>{Number.isFinite(reading.radius)?Math.round(reading.radius):'∞'} <small>m</small></dd></div>
   <div><dt>{tx('该段模型车速')}</dt><dd>{Math.round(reading.speedKmh)} <small>km/h</small></dd></div>
   <div className="rd-levels"><dt>{tx('经过层级')}</dt><dd>{reading.levels.map(l=>l+1).join(' / ')} <small>{tx('层')}</small></dd></div>
   <div><dt>{tx('上行 / 下行')}</dt><dd>{reading.climbs} / {reading.descents}</dd></div>
   <div><dt>{tx('交织区')}</dt><dd>{reading.weaving.length} <small>{tx('段')}</small></dd></div>
  </dl>
  <div className="rd-route-conflicts"><ConflictLegend conflicts={reading.conflicts}/></div>
 </div>
 const neighbours=<details className="rd-neighbours"><summary>{tx('与相邻设计对比')}</summary>{COMPARISONS[network.id]?.map(c=><div key={c.id}><button type="button" onClick={()=>onDesign(c.id)}>{tx(c.label)} ↗</button><p>{copy(c,'body')}</p></div>)}</details>
 return <>
  {route&&active&&!expanded&&<button className="rd-why-subtitle" type="button" onClick={()=>{setView('why');setExpanded(true)}}><span>{copy(active,'title')} · {copy(active,'body')}</span><b>⌃</b></button>}
  <aside className="rd-explorer" aria-label={tx('选车流')} data-has-route={!!route} data-expanded={expanded} data-view={view} data-experience-overlay="true">
   {route&&<div className="rd-mobile-route"
    onPointerDown={e=>{gesture.current={y:e.clientY,dragged:false,active:true}}}
    onPointerMove={e=>{if(!gesture.current.active)return;const dy=e.clientY-gesture.current.y;if(Math.abs(dy)>22){gesture.current.dragged=true;e.currentTarget.setPointerCapture(e.pointerId);setExpanded(dy<0)}}}
    onPointerUp={()=>{gesture.current.active=false}}
    onPointerCancel={()=>{gesture.current.active=false}}
    onClickCapture={e=>{if(gesture.current.dragged){e.preventDefault();e.stopPropagation();gesture.current.dragged=false}}}>
    <button className="rd-sheet-grip" type="button" aria-label={tx(expanded?'收起读数与说明':'展开读数与说明')} aria-expanded={expanded}
     onClick={()=>setExpanded(v=>!v)}><i/></button>
    <button className="rd-mobile-name" type="button" onClick={()=>setExpanded(v=>!v)} title={name}>{name}</button>
    <button type="button" onClick={onReplay}>{tx('重播')}</button><button type="button" aria-pressed={follow} onClick={onFollow}>{tx('跟车')}</button><button type="button" aria-label={tx('退出选车流')} onClick={onExit}>×</button>
   </div>}
   <div className="rd-desktop-tabs rd-panel-tabs"><button type="button" aria-pressed={!explaining} onClick={()=>{if(explaining)onExplain();else if(route)setPicker(v=>!v)}}>{tx('选车流')}</button><button type="button" aria-pressed={explaining} onClick={()=>!explaining&&onExplain()}>{tx('讲解')}<small>{pins.length}</small></button></div>
   {route&&<div className="rd-mobile-tabs rd-panel-tabs"><button type="button" aria-pressed={view==='why'} onClick={()=>setView('why')}>{tx('为什么这样设计')}</button><button type="button" aria-pressed={view==='readings'} onClick={()=>setView('readings')}>{tx('路线读数')}</button><button type="button" aria-pressed={view==='choose'} onClick={()=>setView('choose')}>{tx('换一股车流')}</button></div>}
   <div className="rd-panel-content">
    {!route&&!explaining&&choose}
    {route&&<div className={`rd-picker ${picker?'rd-picker-open':''}`}>{choose}</div>}
    {route&&<section className="rd-route-card" aria-label={tx('所选路线')}>
     <header><strong>{name}</strong><button type="button" aria-label={tx('退出选车流')} onClick={onExit}>×</button></header>
     <p className="rd-destination">→ {tx(exitName(route.movement.to))}</p>
     <div className="rd-demo-state" data-status={demo.status}><i/>{tx(DEMO_STATUS[demo.status])}</div>
     <progress aria-label={tx('示范进度')} value={demo.progress} max={1}/>
     <div className="rd-demo-controls"><button type="button" onClick={onReplay}>{tx('重播')}</button><button type="button" aria-pressed={follow} onClick={onFollow}>{tx('跟车')}</button><button type="button" onClick={onExit}>{tx('全部车流')}</button></div>
     {signal&&<div className="rd-signal-live" data-signal={color}><i/>{tx(color==='green'?'本方向绿灯':color==='yellow'?'本方向黄灯':'本方向红灯')}<span>{Number.isFinite(signal.remaining)?Math.ceil(signal.remaining):'—'} s</span></div>}
    </section>}
    {readings}
    {(route||explaining)&&why}
    {(route||explaining)&&<div className="rd-panel-foot">{notes}{neighbours}</div>}
   </div>
  </aside>
 </>
}
