import { useCallback, useState, type CSSProperties } from 'react'
import { particles, familyInfo, type Particle, type ParticleFamily } from '../particle-data'
import { museumHash } from '../museum-route'
import { ParticleReveal } from './ParticleReveal'
import { ExhibitPreview } from './ExhibitPreview'
import '../styles/ParticleTable.css'

/** Positions encode generations and families, never mass or discovery order. */
export function ParticleTable({ en, onInteract, collection, initiallyCollected = false }: { en: boolean; onInteract: () => void; collection: Set<string>; initiallyCollected?: boolean }) {
  const [family, setFamily] = useState<ParticleFamily | null>(null)
  const [onlyCollected, setOnlyCollected] = useState(initiallyCollected && collection.size > 0)
  const [revealing, setRevealing] = useState<Particle | null>(null)
  const closeReveal = useCallback(() => setRevealing(null), [])
  const card = (p: Particle) => <a key={p.id} href={museumHash(p.id)}
    className="smm-periodic-card" data-family={p.family}
    data-dimmed={(family !== null && family !== p.family) || (onlyCollected && !collection.has(p.id))}
    style={{ '--family-color': familyInfo[p.family].color, gridColumn: p.generation || undefined, gridRow: p.generation ? p.row : undefined } as CSSProperties}
    aria-label={en ? `Observe ${p.nameEn}` : `观察${p.name}`} onClick={event => { if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return; event.preventDefault();onInteract();setRevealing(p) }}>
    <span className="smm-periodic-symbol">{p.symbol}</span>
    <span className="smm-periodic-art" aria-hidden="true"><ExhibitPreview particle={p}/></span>
    <span className="smm-periodic-name">{en ? p.nameEn : p.name}</span>
    <span className="smm-periodic-role">{en ? p.roleEn : p.role}</span>
    <span className="smm-periodic-open" aria-hidden="true">{collection.has(p.id)?'✓':'↗'}</span>
  </a>
  return <section className="smm-periodic" aria-label={en ? 'Standard Model particle atlas' : '标准模型粒子全景'}>
    <div className="smm-periodic-layout">
      <section className="smm-periodic-matter">
        <h3>{en ? 'Matter particles' : '组成物质的粒子'}<span>{en ? 'Quarks & leptons' : '夸克与轻子'}</span></h3>
        <div className="smm-periodic-generations">{[1,2,3].map((n)=><span key={n}>{en ? `Generation ${['I','II','III'][n-1]}` : `第${['一','二','三'][n-1]}代`}</span>)}</div>
        <div className="smm-periodic-matter-grid">{particles.filter(p=>p.generation).map(card)}</div>
      </section>
      <section className="smm-periodic-carriers">
        <h3>{en ? 'Carry interactions' : '传递相互作用'}<span>{en ? 'Gauge bosons' : '规范玻色子'}</span></h3>
        <div className="smm-periodic-carrier-grid">{particles.filter(p=>p.family==='gauge').map(card)}</div>
      </section>
      <section className="smm-periodic-higgs">
        <h3>{en ? 'The Higgs field' : '希格斯场'}<span>{en ? 'Scalar boson' : '标量玻色子'}</span></h3>
        <div>{particles.filter(p=>p.family==='scalar').map(card)}</div>
        <p>{en ? 'An excitation of the field associated with the masses of elementary particles.' : '与基本粒子质量有关的场，它的激发就是希格斯玻色子。'}</p>
        <a className="smm-periodic-question" href="#museum/read/higgs-field" onClick={onInteract}>{en ? 'Where does mass come from?' : '质量从哪里来？'} →</a>
      </section>
    </div>
    <div className="smm-periodic-bottom"><div className="smm-periodic-legend" aria-label={en ? 'Highlight a family' : '突出显示粒子家族'}>{Object.entries(familyInfo).map(([id,f])=><button key={id} aria-pressed={family===id} style={{'--family-color':f.color} as CSSProperties} onClick={()=>{onInteract();setFamily(family===id?null:id as ParticleFamily)}}><i/>{en?f.labelEn:f.label}</button>)}<button aria-pressed={onlyCollected} disabled={collection.size===0} className="smm-periodic-collected" onClick={()=>{onInteract();setOnlyCollected(v=>!v)}}>{en?'Collected':'我的收藏'} {collection.size}/17</button></div><span>{en ? '17 groups · W⁺ / W⁻ share a tile' : '17 个分组 · W⁺ / W⁻ 合列'}</span></div>
    {revealing&&<ParticleReveal particle={revealing} en={en} onClose={closeReveal}/> }
  </section>
}
