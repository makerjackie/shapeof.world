import { X } from '@phosphor-icons/react'
import { useExperienceI18n } from '~/i18n/experience'
import { ANATOMY, type AnatomyId } from '../anatomy'
import type { Reading } from '../fields'
import type { Instruments } from '../measurements'
export function AnatomyPins({ active, onSelect }: { active: AnatomyId | null; onSelect(id: AnatomyId): void }) {
  const tx=useExperienceI18n()
  return <div className="cf-anatomy" data-focused={active??undefined}><svg aria-hidden="true">{ANATOMY.map(a=><path key={a.id} data-cf-leader={a.id}/>)}</svg>{ANATOMY.map((a,i)=><button key={a.id} className="cf-pin" data-cf-pin={a.id} aria-pressed={active===a.id} onClick={()=>onSelect(a.id)}><span>{String(i+1).padStart(2,'0')}</span>{tx(a.title)}</button>)}</div>
}
export function AnatomyCard({ id, reading, data, onClose, onSection }: { id: AnatomyId; reading: Reading | null; data: Instruments | null; onClose(): void; onSection(): void }) {
  const tx=useExperienceI18n(),a=ANATOMY.find(a=>a.id===id)!, valid=reading&&!reading.solid
  let label='气体温度',value=valid?`${Math.round(reading.temperature)} K`:'—'
  if(id==='wood'){label='邻近可燃气';value=valid?`${(reading.fuel*100).toFixed(2)} %`:'—'}
  if(id==='coal')label='炭床上方气温'
  if(id==='root'){label='气体年龄';value=valid&&reading.age!==null?`${(reading.age*1000).toFixed(1)} ms`:'—'}
  if(id==='yellow'||id==='tip'){label='烟炱';value=valid?`${reading.soot.toFixed(3)} ppm`:'—'}
  if(id==='smoke'){label='有机烟示踪量';value=valid?reading.smoke.toFixed(4):'—'}
  if(id==='plume'){label='气流速度';value=valid?`${reading.speed.toFixed(2)} m/s`:'—'}
  if(id==='spark'){label='存活火星';value=data?`${data.spark.count}`:'—'}
  return <aside className="cf-anatomy-card" data-experience-overlay="true" aria-label={tx('解剖说明')}>
    <div className="cf-panel-heading"><h2>{tx(a.title)}</h2><button aria-label={tx('关闭讲解')} onClick={onClose}><X size={19}/></button></div>
    <p>{tx(a.body)}</p><div className="cf-station-reading"><span>{tx(label)}</span><strong>{value}</strong>{id==='smoke'&&<small>{tx('模型单位，不是质量浓度')}</small>}
      {id==='spark'&&data&&data.spark.count>0&&<small>{Math.round(data.spark.temperature)} K · {data.spark.diameter.toFixed(2)} mm</small>}</div>
    <button className="cf-section-link" onClick={onSection}>{tx('在剖面上看')} →</button>
  </aside>
}
