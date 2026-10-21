import {useState} from 'react'
import {particles,type ParticleId} from '../particle-data'
import {particleContexts} from '../particle-context'
import {museumFacts} from '../museum-data'
import {museumHash} from '../museum-route'
export function ParticleComparison({en}:{en:boolean}){
 const [left,setLeft]=useState<ParticleId>('e'),[right,setRight]=useState<ParticleId>('mu')
 const a=particles.find(p=>p.id===left)!,b=particles.find(p=>p.id===right)!
 const rows=[{name:en?'Mass':'质量',get:(id:ParticleId)=>museumFacts[id]?.[en?'massEn':'mass']??'—'},{name:en?'Charge':'电荷',get:(id:ParticleId)=>`${particles.find(p=>p.id===id)!.charge} e`},{name:en?'Spin':'自旋',get:(id:ParticleId)=>`${particles.find(p=>p.id===id)!.spin} ℏ`},{name:en?'Lifetime':'寿命',get:(id:ParticleId)=>museumFacts[id]?.[en?'lifetimeEn':'lifetime']??'—'},{name:en?'Antiparticle':'反粒子',get:(id:ParticleId)=>particleContexts[id].antiparticle[en?'en':'zh']}]
 return <details className="smm-comparison"><summary>{en?'Compare two particles':'把两种粒子放在一起比较'}<span>＋</span></summary><div className="smm-compare-selectors">{[{id:left,set:setLeft,label:en?'First particle':'第一种粒子'},{id:right,set:setRight,label:en?'Second particle':'第二种粒子'}].map(s=><label key={s.label}>{s.label}<select value={s.id} onChange={e=>s.set(e.target.value as ParticleId)}>{particles.map(p=><option key={p.id} value={p.id}>{p.symbol} · {en?p.nameEn:p.name}</option>)}</select></label>)}</div><table><thead><tr><th>{en?'Property':'属性'}</th><th><a href={museumHash(left)}>{en?a.nameEn:a.name} ↗</a></th><th><a href={museumHash(right)}>{en?b.nameEn:b.name} ↗</a></th></tr></thead><tbody>{rows.map(row=><tr key={row.name}><th scope="row">{row.name}</th><td>{row.get(left)}</td><td>{row.get(right)}</td></tr>)}</tbody></table><p>{en?'PDG 2024 extract. Compare definitions as well as values: quark masses are scheme dependent; neutrino flavours have no single mass. The cards explain uncertainties and sources.':'PDG 2024 摘录。比较数值时也要比较定义：夸克质量依赖方案，中微子味态没有单一质量。误差、边界和来源见粒子档案。'}</p></details>
}
