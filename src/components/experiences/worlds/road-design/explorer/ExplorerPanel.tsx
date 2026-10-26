import { useState } from 'react'
import { useExperienceI18n } from '~/i18n/experience'
import type { Network } from '../sim/types'
import { signalClock, signalState } from '../sim/control'
import { approachName, exitName, TURN_NAMES, TURN_SYMBOLS, turnKey, type ExploreRoute } from './routes'
import { DEMO_STATUS, type DemoState } from './replay'
import { COMPARISONS, type WhyPin } from './explanations'

export function ExplorerPanel({network,routes,route,onSelect,onExit,onReplay,follow,onFollow,demo,pins,activePin,onPin,explaining,onExplain,onDesign}:{network:Network;routes:ExploreRoute[];route?:ExploreRoute;onSelect:(id:string)=>void;onExit:()=>void;onReplay:()=>void;follow:boolean;onFollow:()=>void;demo:DemoState;pins:WhyPin[];activePin:string|null;onPin:(id:string)=>void;explaining:boolean;onExplain:()=>void;onDesign:(id:string)=>void}) {
  const tx=useExperienceI18n()
  const [from,setFrom]=useState(routes[0]?.movement.from??'north')
  const approaches=[...new Set(routes.map(r=>r.movement.from))]
  const current=approaches.includes(from)?from:approaches[0]
  const options=routes.filter(r=>r.movement.from===current)
  const reading=route?.reading
  const active=pins.find(p=>p.id===activePin)??pins[0]
  const clock=signalClock(network.control,demo.time)
  const color=route?signalState(network.control,demo.time,route.movement.signalGroup??route.movement.from):'red'
  return <aside className="rd-explorer" aria-label={tx('选车流')} data-has-route={!!route} data-experience-overlay="true">
    <div className="rd-panel-tabs"><button type="button" aria-pressed={!explaining} onClick={()=>explaining&&onExplain()}>{tx('选车流')}</button><button type="button" aria-pressed={explaining} onClick={()=>!explaining&&onExplain()} disabled={!pins.length}>{tx('讲解')}{!!pins.length&&<small>{pins.length}</small>}</button></div>
    {!explaining&&<div className="rd-flow-select" data-has-route={!!route}>
      <label>{tx('从哪里进')}<select aria-label={tx('从哪里进')} value={current} onChange={e=>setFrom(e.target.value)}>{approaches.map(a=><option key={a} value={a}>{tx(approachName(a))}</option>)}</select></label>
      <div className="rd-turns">{options.map(r=>{const key=turnKey(r.movement);return <button type="button" key={r.movement.id} data-route-id={r.movement.id} aria-label={`${tx(approachName(current))} · ${tx(TURN_NAMES[key])}${network.id==='huangjuewan'?` → ${tx(approachName(r.movement.to))}`:''}`} aria-pressed={route?.movement.id===r.movement.id} onClick={()=>onSelect(r.movement.id)}><b>{TURN_SYMBOLS[key]}</b><span>{tx(TURN_NAMES[key])}{network.id==='huangjuewan'&&<small>{tx(approachName(r.movement.to))}</small>}</span></button>})}</div>
      {network.id==='huangjuewan'&&<button className="rd-longest" type="button" onClick={()=>{const longest=[...routes].sort((a,b)=>b.reading.detour-a.reading.detour)[0];setFrom(longest.movement.from);onSelect(longest.movement.id)}}>{tx('找出最绕的路线')} <span>↗</span></button>}
      {!route&&<p className="rd-invitation">{tx('点一个方向，看示范车走完全程。')}</p>}
    </div>}
    {route&&<section className="rd-route-card" aria-label={tx('所选路线')}>
      <header><strong>{tx(approachName(route.movement.from))} · {tx(TURN_NAMES[turnKey(route.movement)])}</strong><button type="button" aria-label={tx('退出选车流')} onClick={onExit}>×</button></header>
      <p className="rd-destination">→ {tx(exitName(route.movement.to))}</p>
      <div className="rd-demo-state" data-status={demo.status}><i/>{tx(DEMO_STATUS[demo.status])}</div>
      <progress aria-label={tx('示范进度')} value={demo.progress} max={1}/>
      <div className="rd-demo-controls"><button type="button" onClick={onReplay}>{tx('重播')}</button><button type="button" aria-pressed={follow} onClick={onFollow}>{tx('跟车')}</button><button type="button" onClick={onExit}>{tx('全部车流')}</button></div>
      {network.control.kind==='signal'&&<div className="rd-signal-live" data-signal={color}><i/>{tx(color==='green'?'本方向绿灯':color==='yellow'?'本方向黄灯':'本方向红灯')}<span>{Number.isFinite(clock.remaining)?Math.ceil(clock.remaining):'—'} s</span></div>}
      <dl className="rd-route-readings">
        <div><dt>{tx('路线长度')}</dt><dd>{Math.round(reading!.length).toLocaleString('en-US')} <small>m</small></dd></div>
        <div className="rd-detour"><dt>{tx('比直线多走')}</dt><dd>+{Math.round(reading!.detour).toLocaleString('en-US')} <small>m</small></dd></div>
        <div><dt>{tx('最小转弯半径')}</dt><dd>{Number.isFinite(reading!.radius)?Math.round(reading!.radius):'∞'} <small>m</small></dd></div>
        <div><dt>{tx('该段模型车速')}</dt><dd>{Math.round(reading!.speedKmh)} <small>km/h</small></dd></div>
        <div><dt>{tx('经过层级')}</dt><dd>{reading!.levels.map(l=>l+1).join(' / ')} <small>{tx('层')}</small></dd></div>
        <div><dt>{tx('冲突点 / 交织区')}</dt><dd>{reading!.conflicts.length} / {reading!.weaving.length}</dd></div>
      </dl>
      <p className="rd-demo-note">{tx('时间压缩回放 · 先看全程，再看转弯')}</p><details className="rd-reading-notes"><summary>{tx('读数口径')}</summary><p>{tx('完整模型入口到出口；直线仅作距离基准。半径取车道线形，车速为该段模型设定，不代表安全限速。冲突包含交叉、合流和分流，交织另计。')}</p><p>{tx('示范车使用同一交通模型的独立回放；行驶加快，短暂停车放慢，便于观察。')}</p>{network.id==='huangjuewan'&&<p>{tx('OSM 未标出的交织区不计入；0 段不代表现实中不存在。高度为推断值。')}</p>}</details>
    </section>}
    {!!pins.length&&(route||explaining)&&active&&<section className="rd-explanation" aria-label={tx('为什么这样设计')}>
      <div className="rd-pin-pages">{pins.map((p,i)=><button type="button" key={p.id} aria-label={tx(p.title)} aria-pressed={p.id===active.id} onClick={()=>onPin(p.id)}>{i+1}</button>)}<span>{tx('为什么这样设计')}</span></div>
      <h2>{tx(active.title)}</h2><p>{tx(active.body)}</p>
      {explaining&&<div className="rd-neighbours">{COMPARISONS[network.id]?.map(c=><div key={c.id}><button type="button" onClick={()=>onDesign(c.id)}>{tx(c.label)} ↗</button><p>{tx(c.body)}</p></div>)}</div>}
    </section>}
  </aside>
}
