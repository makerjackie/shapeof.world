import {ArrowRight} from '@phosphor-icons/react'
import type {CSSProperties} from 'react'
import {particles,familyInfo} from '../particle-data'
import {museumHash} from '../museum-route'
export function RelatedParticles({ids,en}:{ids:string[];en:boolean}){return <div className="smm-particle-connections"><h3>{en?'Particles in this story':'这里涉及的粒子'}</h3><div>{ids.map(id=>{const p=particles.find(p=>p.id===id);return p?<a href={museumHash(p.id)} key={id} style={{'--family-color':familyInfo[p.family].color} as CSSProperties}><b>{p.symbol}</b>{en?p.nameEn:p.name}<ArrowRight size={14}/></a>:null})}</div></div>}
