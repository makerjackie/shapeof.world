import { useMemo, useState } from 'react'
import { useExperienceI18n } from '~/i18n/experience'
import { CATALOGUE } from '../designs/catalogue'
import type { Network } from '../sim/types'
import type { ExploreRoute } from './routes'
import type { DemoState } from './replay'
import { journeyDistance, corePoints, type Journey } from './journey'
import { useEditorialText } from './use-editorial-text'

export function RouteAtlas({network,route,journey,demo,onStep}:{network:Network;route:ExploreRoute;journey:Journey;demo:DemoState;onStep:(i:number,s?:number)=>void}){
 const tx=useExperienceI18n(),copy=useEditorialText(),[open,setOpen]=useState(false)
 const map=useMemo(()=>{
  const range=CATALOGUE.find(d=>d.id===network.id)!.diagram.range
  const ps=network.id==='huangjuewan'?corePoints(route):[{x:-range,z:-range},{x:range,z:range}],xs=ps.map(p=>p.x),zs=ps.map(p=>p.z),minX=Math.min(...xs)-100,minZ=Math.min(...zs)-100,w=Math.max(...xs)-minX+100,h=Math.max(...zs)-minZ+100,scale=220/Math.max(w,h)
  const point=(p:{x:number;z:number})=>[20+(220-w*scale)/2+(p.x-minX)*scale,14+(220-h*scale)/2+(p.z-minZ)*scale]
  return {point,roads:network.carriageways.map(r=>r.points.map(p=>point(p).join(',')).join(' ')),route:route.path.points.map(p=>point(p).join(',')).join(' ')}
 },[network,route])
 const s=journeyDistance(route,demo.position),p=map.point(demo.position).map(v=>Math.max(10,Math.min(240,v))),maxH=Math.max(10,...journey.heights.map(h=>h.h)),x=(n:number)=>26+208*n/route.path.length,y=(n:number)=>72-54*n/maxH
 const h=journey.heights[Math.min(160,Math.round(s/route.path.length*160))]?.h??0
 return <aside className="rd-atlas" data-open={open} data-experience-overlay="true">
  <button type="button" className="rd-atlas-toggle" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{tx('平面与高度')} <span>{open?'−':'+'}</span></button>
  <div className="rd-atlas-content">
   <svg className="rd-plan" viewBox="0 0 260 246" role="img" aria-label={tx('路线平面示意图')}>
    {map.roads.map((r,i)=><polyline key={i} points={r} fill="none" stroke="currentColor" strokeWidth="1" opacity=".3"/>)}
    <polyline points={map.route} fill="none" stroke="var(--route-ink)" strokeWidth="3"/>
    <circle cx={p[0]} cy={p[1]} r="5" fill="var(--route-ink)" stroke="white" strokeWidth="2"/>
    <path d="M240 40V14m-4 7 4-7 4 7" stroke="currentColor" fill="none"/><text x="240" y="10" textAnchor="middle">N</text>
    <text x="14" y="241">{tx('平面示意')}</text>
   </svg>
   <svg className="rd-profile" viewBox="0 0 260 100" role="img" aria-label={tx('路线高度剖面')}>
    <text x="8" y="12">{tx('离地高度')} · m</text><path d="M26 20V72H234" stroke="currentColor" fill="none" opacity=".35"/>
    <text x="3" y="26">{Math.round(maxH)}</text><text x="12" y="75">0</text>
    <polyline points={journey.heights.map(p=>`${x(p.s)},${y(p.h)}`).join(' ')} fill="none" stroke="var(--route-ink)" strokeWidth="2"/>
    {journey.crossings.map((c,i)=><g key={i}><line x1={x(c.s)} x2={x(c.s)} y1="24" y2="72" stroke="var(--cross-ink)" strokeDasharray="2 3"/><text x={x(c.s)} y={i%2?36:23} textAnchor="middle" fill="var(--cross-ink)">{c.over?'↑':'↓'}</text></g>)}
    <circle cx={x(s)} cy={y(h)} r="3.5" fill="var(--route-ink)" stroke="white"/>
    <text x="26" y="91">0</text><text x="234" y="91" textAnchor="end">{Math.round(route.path.length).toLocaleString('en-US')} m</text>
   </svg>
   <div className="rd-atlas-crossings">{journey.crossings.map((c,i)=><button key={i} type="button" onClick={()=>onStep(journey.steps.findIndex(step=>step.crossings.includes(c)),c.s)}>{c.over?'↑':'↓'} {copy(c,'title')}</button>)}</div>
  </div>
 </aside>
}
