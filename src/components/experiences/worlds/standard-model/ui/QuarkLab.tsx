import {useState} from 'react'
import {ArrowRight} from '@phosphor-icons/react'
import {combine,labSources,quarkMassMeV,quarkSum,type QuarkFlavour} from '../front-door/weight-model'
import '../styles/QuarkLab.css'

const allCombinations=['proton','neutron','delta-plus-plus','delta-minus'] as const

/** Three slots, two kinds of quark: which triples hold together, and how little of their mass the quarks carry. */
export function QuarkLab({en,onInteract}:{en:boolean;onInteract:()=>void}) {
 const [slots,setSlots]=useState<QuarkFlavour[]>([])
 const [found,setFound]=useState<Set<string>>(new Set())
 const result=combine(slots)
 const add=(q:QuarkFlavour)=>{onInteract();const next=slots.length>=3?[q]:[...slots,q];setSlots(next);const made=combine(next);if(made.id!=='incomplete')setFound(v=>new Set([...v,made.id]))}
 const sum=quarkSum(slots)
 const lang=en?1:0
 return <div className="smq-lab">
  <div className="smq-bench" aria-live="polite">
   <div className="smq-slots" data-result={result.id}>{[0,1,2].map(i=><span key={i} className="smq-slot" data-flavour={slots[i]}>{slots[i]??''}</span>)}</div>
   <div className="smq-result">
    <strong>{result.name[lang]}{result.charge&&<small>{en?'charge ':'电荷 '}{result.charge}</small>}</strong>
    <p>{result.fate[lang]}</p>
    {result.massMeV&&<div className="smq-bars" role="img" aria-label={(en?'Whole particle ':'整个粒子 ')+result.massMeV+' MeV; '+(en?'quarks ':'夸克 ')+sum.toFixed(2)+' MeV'}>
     <div><span>{en?'Whole particle':'整个粒子'}</span><i style={{width:'100%'}}/><b>{result.massMeV.toFixed(1)} MeV</b></div>
     <div><span>{en?'Its quarks':'里面的夸克'}</span><i className="is-quarks" style={{width:`${sum/result.massMeV*100}%`}}/><b>{sum.toFixed(2)} MeV · {(sum/result.massMeV*100).toFixed(1)}%</b></div>
    </div>}
   </div>
  </div>
  <div className="smm-lab-controls">
   {(['u','d'] as const).map(q=><button key={q} className="smq-add" data-flavour={q} onClick={()=>add(q)}><b>{q}</b>{q==='u'?(en?'up':'上夸克'):(en?'down':'下夸克')} · {quarkMassMeV[q].toFixed(2)} MeV</button>)}
   <button onClick={()=>{onInteract();setSlots([])}}>{en?'Clear':'清空'}</button>
  </div>
  <p className="smq-found">{en?'Combinations found':'找到的组合'} <b>{found.size}/{allCombinations.length}</b> {allCombinations.map(id=><span key={id} data-found={found.has(id)}>{combine(id==='proton'?['u','u','d']:id==='neutron'?['u','d','d']:id==='delta-plus-plus'?['u','u','u']:['d','d','d']).name[lang]}</span>)}</p>
  <p>{en?'Whatever you build, the quarks’ own mass is one percent or less. The rest is the energy of quarks and gluons moving inside. A Δ holds the same quarks with even more of that energy, and sheds it within about 10⁻²³ s.':'不管拼出哪一种，夸克本身都只占 1% 或更少。剩下的是夸克和胶子在里面运动的能量。Δ 粒子用的是同样的夸克，只是装了更多这样的能量，约 10⁻²³ 秒内就把它放掉了。'}</p>
  <p className="smm-boundary">{en?'Ground states only: uud and udd also have short-lived excited forms (Δ⁺, Δ⁰). Quark masses are PDG 2024 MS-bar values at 2 GeV, inferred indirectly because quarks never appear alone.':'只列基态：uud 和 udd 也有短命的激发态（Δ⁺、Δ⁰）。夸克质量取 PDG 2024 在 2 GeV 下的 MS-bar 值；夸克从不单独出现，这些数是间接推得的。'}</p>
  <a className="smm-primary-link" href="#museum/u">{en?'Try pulling one quark out':'试试把一颗夸克拉出来'}<ArrowRight size={17}/></a>
  <span className="smm-references">{labSources.map(source=><a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a>)}</span>
 </div>
}
