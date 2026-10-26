import { useEffect, useRef, useState } from 'react'
import { useExperienceI18n } from '~/i18n/experience'
import { nadirUntil, type Run } from './model'

export function FrequencyChart({ run, time, previous, windowSeconds }: { run: Run | null; time: number; previous: Run | null; windowSeconds: number }) {
  const tx = useExperienceI18n()
  const ref=useRef<SVGSVGElement>(null), [width,setWidth]=useState(930)
  useEffect(()=>{const node=ref.current;if(!node)return;const observer=new ResizeObserver(([e])=>setWidth(Math.max(300,e.contentRect.width)));observer.observe(node);return()=>observer.disconnect()},[])
  const right=width-14, left=42, plotWidth=right-left
  const min = Math.floor(Math.min(48, run ? nadirUntil(run, time).hz - .2 : 48, previous?.nadir.hz ? previous.nadir.hz - .2 : 48) * 2) / 2
  const observed=run?.samples.filter(p=>p.t<=time)??[]
  const high=Math.max(50.1,...observed.map(p=>p.hz),...(previous?.samples.map(p=>p.hz)??[]))
  const height=width<500?148:180, bottom=height-28
  const max = Math.ceil((high+.1)*2)/2, x = (t: number) => left + t / windowSeconds * plotWidth, y = (hz: number) => 16 + (max - hz) / (max - min) * (bottom-16)
  const path = (r: Run, until: number) => r.samples.filter((p, i) => p.t <= Math.min(until, windowSeconds) && (windowSeconds === 30 || i % 3 === 0)).map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.hz).toFixed(1)}`).join(' ')
  const nadir = run ? nadirUntil(run, time) : null
  return <svg ref={ref} className="pg-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={tx('频率随时间变化；最低值显示在图上方')} preserveAspectRatio="none">
    {[max, 50, 49, min].filter((v,i,a) => a.indexOf(v)===i).map(hz => <g key={hz}><line x1={left} x2={right} y1={y(hz)} y2={y(hz)} stroke={hz===49?'#bd6556':'#b8c6bf'} strokeDasharray={hz===49?'5 5':undefined}/><text x={left-8} y={y(hz)+4} textAnchor="end">{hz.toFixed(1)}</text></g>)}
    <text x={left} y="12">Hz</text>
    <text x={right} y={y(49)-7} textAnchor="end" className="pg-threshold">{tx('49.0 Hz · 教学切负荷线')}</text>
    {Array.from({length:width<500?4:7},(_,i)=>i*windowSeconds/(width<500?3:6)).map(t=><g key={t}><line x1={x(t)} x2={x(t)} y1="16" y2={bottom} stroke="#849b8c" opacity=".13"/><text x={x(t)} y={height-7} textAnchor="middle">{t}{t===windowSeconds?' s':''}</text></g>)}
    {previous&&<path d={path(previous, windowSeconds)} fill="none" stroke="#8e9a97" strokeWidth="2" strokeDasharray="5 5"/>}
    {run ? <>
      <path d={path(run,time)} fill="none" stroke="var(--pg-accent)" strokeWidth="3" strokeLinejoin="round"/>
      {time<=windowSeconds&&<line x1={x(time)} x2={x(time)} y1="16" y2={bottom} stroke="var(--pg-ink)" opacity=".35"/>}
      {nadir&&nadir.t<=windowSeconds&&<circle cx={x(nadir.t)} cy={y(nadir.hz)} r="4.5" fill="var(--pg-alert)"/>}
      {run.events.filter(e=>e.type==='shed'&&e.t<=Math.min(time,windowSeconds)).map(e=><circle key={e.t} cx={x(e.t)} cy={y(e.hz)} r="5" fill="var(--pg-alert)" stroke="white" strokeWidth="2"/>)}
    </>:<line x1={left} x2={right} y1={y(50)} y2={y(50)} stroke="var(--pg-accent)" strokeWidth="3"/>}
  </svg>
}
