import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { X, Play, Pause } from '@phosphor-icons/react'
import { useExperienceI18n } from '~/i18n/experience'
import { MOLECULAR_STATIONS, moleculeScene, atomCounts, type MolecularStation } from '../molecules'
import type { Reading } from '../fields'
const Stage=lazy(()=>import('./MoleculeStage'))
export function MoleculePanel({ initial, reading, onClose }: { initial:MolecularStation; reading:Reading; onClose():void }) {
  const tx=useExperienceI18n(),[station,setStation]=useState(initial),[progress,setProgress]=useState(0),[playing,setPlaying]=useState(true),dialog=useRef<HTMLDivElement>(null)
  const data=MOLECULAR_STATIONS.find(s=>s.id===station)!,counts=useMemo(()=>atomCounts(moleculeScene(station)),[station])
  useEffect(()=>{const previous=document.activeElement as HTMLElement|null;dialog.current?.focus();return()=>previous?.focus()},[])
  useEffect(()=>{if(!playing)return;let raf=0,last=performance.now();const frame=(now:number)=>{const dt=Math.min(.05,(now-last)/1000);last=now;setProgress(p=>Math.min(1,p+dt/5));raf=requestAnimationFrame(frame)};raf=requestAnimationFrame(frame);return()=>cancelAnimationFrame(raf)},[playing,station])
  useEffect(()=>{if(progress>=1)setPlaying(false)},[progress])
  const choose=(id:MolecularStation)=>{setStation(id);setProgress(0);setPlaying(true)}
  return <div ref={dialog} className="cf-molecules" role="dialog" aria-modal="true" aria-label={tx('放大看分子')} tabIndex={-1} onKeyDown={e=>{if(e.key==='Escape')onClose();if(e.key==='Tab'){const nodes=[...dialog.current!.querySelectorAll<HTMLElement>('button:not(:disabled),input,a[href]')],first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog.current)){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}}}>
    <header className="cf-molecular-heading"><div><p>{tx('从这一点，走进分子')}</p><h2>{tx('原子怎样重新组合')}</h2></div><button aria-label={tx('返回这团火')} onClick={onClose}><X size={22}/></button></header>
    <nav className="cf-molecular-tabs" aria-label={tx('分子五站')}>{MOLECULAR_STATIONS.map((s,i)=><button key={s.id} aria-pressed={station===s.id} onClick={()=>choose(s.id)}><span>0{i+1}</span>{tx(s.title)}</button>)}</nav>
    <div className="cf-molecular-layout"><div className="cf-molecular-visual"><div className="cf-equation"><span>{tx(data.before)}</span><span className="cf-equation-arrow">→</span><span>{tx(data.after)}</span></div>
      <Suspense fallback={<p className="cf-molecule-loading">{tx('搭建分子模型')}</p>}><Stage station={station} progress={progress} label={tx('三维球棍模型；拖动旋转，滚动缩放')}/></Suspense>
      <p className="cf-molecular-hint">{tx('拖动旋转 · 字母旁的编号跟随同一个原子')}</p>
      <div className="cf-molecular-playback"><button aria-label={tx(playing?'暂停反应':'播放反应')} onClick={()=>{if(progress===1)setProgress(0);setPlaying(!playing)}}>{playing?<Pause size={17}/>:<Play size={17}/>}</button><button aria-pressed={progress===0} onClick={()=>{setPlaying(false);setProgress(0)}}>{tx('变化前')}</button><input aria-label={tx('反应进度')} type="range" min={0} max={1} step={.01} value={progress} onChange={e=>{setPlaying(false);setProgress(Number(e.target.value))}}/><button aria-pressed={progress===1} onClick={()=>{setPlaying(false);setProgress(1)}}>{tx('变化后')}</button></div>
      <div className="cf-atom-ledger" aria-label={tx('原子账本：变化前等于变化后')}>{(['C','H','O'] as const).map(e=><div key={e}><span className={`cf-element cf-element-${e}`}>{e}</span><span>{counts[e]} <i>=</i> {counts[e]}</span></div>)}</div><p className="cf-ledger-caption">{tx('画出的原子 · 变化前 = 变化后')}</p>
    </div><div className="cf-molecular-copy"><div className="cf-molecular-origin"><span>{tx('来自探针的线索')} · t {reading.time.toFixed(1)} s</span><strong>{reading.solid?tx('木柴内部'):Math.round(reading.temperature)+' K'}</strong><p>{tx('按这一点的场状态选择讲解；这里展示化学示意，不是分子实测。')}</p></div>
      <h3>{tx(data.title)}</h3><p>{tx(data.body)}</p><p className="cf-molecular-note">{tx(data.note)}</p>{station==='reaction'&&<p className="cf-molecular-energy-note">{tx('断开旧键需要能量，形成新键释放能量。甲烷燃烧时，后者更多，所以总体放热。')}</p>}
      {(station==='wood'||station==='exhaust')&&<div className="cf-energy"><span>{tx('木头里的能量，从哪里来？')}</span><h3>{tx('植物用阳光，把能量存进木头')}</h3><p>{tx('绝干木头的燃烧热约18–20 MJ/kg；这团火的模型按14 MJ/kg有效热值估算功率。')}</p><a href="https://research.fs.usda.gov/fpl/wood-handbook" target="_blank" rel="noreferrer">USDA · Wood Handbook ↗</a></div>}
      <div className="cf-molecular-key"><span><i className="cf-dot-C"/>{tx('碳')}</span><span><i className="cf-dot-H"/>{tx('氢')}</span><span><i className="cf-dot-O"/>{tx('氧')}</span></div>
    </div></div>
    <p className="cf-molecular-paused">{tx('观察分子时，篝火已暂停；返回后恢复原来的时间状态。')}</p>
  </div>
}
