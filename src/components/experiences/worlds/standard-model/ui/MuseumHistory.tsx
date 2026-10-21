import {useState} from 'react'
import {discoveryMilestones} from '../museum-history'
import {RelatedParticles} from './RelatedParticles'
export function MuseumHistory({en,onInteract}:{en:boolean;onInteract:()=>void}){
 const [index,setIndex]=useState(0)
 const item=discoveryMilestones[index]
 const kinds={proposal:en?'Theoretical proposal':'理论提出',observation:en?'Experimental observation':'实验观测',confirmation:en?'Experimental confirmation':'实验证实'}
 return <section className="smm-history"><div className="smm-history-years" role="group" aria-label={en?'Discovery milestones':'发现史里程碑'}>{discoveryMilestones.map((m,i)=><button key={m.id} aria-pressed={index===i} onClick={()=>{onInteract();setIndex(i)}}><b>{m.year}</b><span>{m.title[en?'en':'zh']}</span></button>)}</div><div className="smm-history-exhibit" key={item.id}><div><span className="smm-kicker">{item.year} · {kinds[item.kind]}</span><h3>{item.title[en?'en':'zh']}</h3><p>{item.summary[en?'en':'zh']}</p><div className="smm-history-sources">{item.sourceLinks.map(source=><a href={source.url} key={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a>)}</div></div><RelatedParticles ids={item.particleIds} en={en}/></div></section>
}
