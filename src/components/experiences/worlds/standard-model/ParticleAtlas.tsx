import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { ArrowLeft, ArrowRight, ArrowCounterClockwise, BookmarkSimple, Check } from '@phosphor-icons/react'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { useExperienceI18n } from '~/i18n/experience'
import { useI18n } from '~/i18n'
import { familyInfo, particles, type Particle, type ParticleId } from './particle-data'
import { readCollection, writeCollection, readMuseumCollection, writeMuseumCollection } from './particle-collection'
import { ParticleScene } from './ui/particle-scene'
import { exhibitLabels } from './ui/ExhibitPreview'
import { particleDossiers, museumSources, type MuseumClaim } from './particle-dossiers'
import { museumFacts } from './museum-data'
import { museumHash, useMuseumRoute } from './museum-route'
import { EvidenceEvent } from './evidence/EvidenceEvent'
import {MuseumExplore,MuseumNav} from './ui/MuseumExplore'
import {particleContexts} from './particle-context'
import {museumTopics} from './museum-topics'
import { ParticleTable } from './ui/ParticleTable'
import './styles/Museum.css'
import './styles/MuseumExplore.css'

type Chapter = 'identity' | 'life' | 'discovery' | 'data'
const chapterNames: Record<Chapter, [string,string]> = {identity:['认识它','Meet it'],life:['出现与变化','Where & how'],discovery:['发现与证据','Discovery'],data:['数据与来源','Data & sources']}

export function ParticleAtlas({ controls, onSelect }: { controls: ExperienceControls; onSelect: (id?: ParticleId) => void }) {
 const tx=useExperienceI18n(), {locale}=useI18n(), en=locale==='en'
 const currentRoute=useMuseumRoute()
 const route=currentRoute.view==='museum'?currentRoute:{view:'museum' as const}
 const particleId=route.particleId
 const routeKey=particleId?`#museum/${particleId}`:route.topicId?`#museum/read/${route.topicId}`:route.labId?`#museum/lab/${route.labId}`:route.section?`#museum/${route.section}`:'#museum'
 const positions=useRef<Record<string,number>>({})
 const returnTo=useRef('#museum')
 const selected=particles.find(p=>p.id===particleId)??null
 const [seen,setSeen]=useState(readCollection), [collection,setCollection]=useState(readMuseumCollection)
 const [chapter,setChapter]=useState<Chapter>('identity'),[replay,setReplay]=useState(0),[reduced,setReduced]=useState(false)
 const scroll=useRef<HTMLDivElement>(null), heading=useRef<HTMLHeadingElement>(null)
 useEffect(()=>{const m=matchMedia('(prefers-reduced-motion: reduce)');const sync=()=>setReduced(m.matches);sync();m.addEventListener('change',sync);return()=>m.removeEventListener('change',sync)},[])
 useEffect(()=>writeCollection(seen),[seen])
 useEffect(()=>writeMuseumCollection(collection),[collection])
 useEffect(()=>{if(particleId)setSeen(v=>new Set([...v,particleId]))},[particleId])
 useLayoutEffect(()=>{
  if(!particleId)returnTo.current=routeKey
  setChapter('identity');setReplay(0)
  if(scroll.current)scroll.current.scrollTop=positions.current[routeKey]??0
  if(particleId)heading.current?.focus({preventScroll:true})
  else {const title=scroll.current?.querySelector<HTMLElement>('.smm-topic-detail h2,.smm-reading>h2');if(title){title.tabIndex=-1;title.focus({preventScroll:true})}}
 },[routeKey])
 const interact=()=>controls.registerInteraction()
 const select=(particle:Particle)=>{interact();onSelect(particle.id)}
 const close=()=>{interact();window.location.hash=returnTo.current}
 const collect=()=>{if(!selected)return;interact();setCollection(v=>new Set([...v,selected.id]))}
 const dossier=selected?particleDossiers[selected.id]:null, facts=selected?museumFacts[selected.id]:null
 const sourceIds=dossier?[...new Set([dossier.summary,dossier.occurrence,dossier.behaviour,dossier.discovery,dossier.boundary].flatMap(c=>c.sourceIds))]:[]
 const claim=(value:MuseumClaim)=><div className="smm-claim"><p>{value.text[en?'en':'zh']}</p><span className="smm-references">{value.sourceIds.map((id,i)=><a key={id} href={museumSources[id].url} target="_blank" rel="noreferrer" title={museumSources[id].title}>{en?'Source':'来源'} {i+1} ↗</a>)}</span></div>
 return <div className="smm-world" data-locale={locale} data-page={selected?'particle':route.topicId?'topic':route.labId?'lab':route.section||'home'} ref={scroll} onScroll={()=>{if(scroll.current)positions.current[routeKey]=scroll.current.scrollTop}}>

  <div className="smm-gallery" hidden={!!selected}>
  <header className="smm-masthead" data-experience-content-start="true"><h1>{tx('基本粒子博物馆')}</h1><a className="smm-door-link" href="#" onClick={event=>{event.preventDefault();interact();history.replaceState(null,'',location.pathname+location.search);window.dispatchEvent(new HashChangeEvent('hashchange'))}}>{en?'Where does your weight come from?':'你的体重是从哪儿来的？'}<ArrowRight size={14}/></a></header>
  <MuseumNav route={route} en={en}/>
  {(!route.section||route.section==='collection')&&!route.topicId&&!route.labId&&<>
   <ParticleTable en={en} onInteract={interact} collection={collection} initiallyCollected={route.section==='collection'}/>
  </>}
  {(route.topicId||route.labId||(route.section&&route.section!=='collection'))&&<MuseumExplore key={routeKey} route={route} en={en} onInteract={interact}/>}
  </div>
  <article className="smm-detail" hidden={!selected} aria-label={selected?(en?selected.nameEn:selected.name):undefined} style={{'--sm-accent':selected?familyInfo[selected.family].color:'#608578'} as CSSProperties}>
   {selected&&dossier&&<>
    <div className="smm-detail-body" key={selected.id}>
     <section className="smm-specimen"><div className="smm-specimen-title"><button className="smm-back smm-return" data-experience-content-start="true" onClick={close}><ArrowLeft size={14}/>{en?'Back to the museum':'返回博物馆'}</button><h2 ref={heading} tabIndex={-1}>{en?selected.nameEn:selected.name}<b>{selected.symbol}</b></h2></div><div className="smm-live" key={`${selected.id}-${replay}`}><ParticleScene particle={selected} en={en} reduced={reduced} onInteract={interact}/></div><div className="smm-scene-caption"><span>{exhibitLabels[selected.scene][en?1:0]}</span><button aria-label={en?'Replay observation':'重新观察'} onClick={()=>{interact();setReplay(v=>v+1)}}><ArrowCounterClockwise size={18}/></button></div><p className="smm-scene-boundary">{en?'Illustrated behaviour · space and time are not to scale':'行为示意 · 空间与时间不按真实比例'}</p><button className="smm-collect" data-collected={collection.has(selected.id)} disabled={collection.has(selected.id)} onClick={collect}>{collection.has(selected.id)?<Check size={19}/>:<BookmarkSimple size={19}/>}<span>{collection.has(selected.id)?(en?'In your collection':'已收入卡册'):(en?'Add to my collection':'收入我的卡册')}</span></button></section>
     <section className="smm-knowledge"><nav className="smm-chapters" aria-label={en?'Card chapters':'卡片章节'}>{(Object.keys(chapterNames) as Chapter[]).map(c=><button key={c} aria-pressed={chapter===c} onClick={()=>{interact();setChapter(c)}}>{chapterNames[c][en?1:0]}</button>)}</nav>
      <div className="smm-page" key={`${selected.id}-${chapter}`}>
       {chapter==='identity'&&<><span className="smm-page-index">01 / 04</span><h3>{en?'Meet '+selected.nameEn:'认识'+selected.name}</h3>{claim(dossier.summary)}<div className="smm-context"><h4>{en?'Its place in the family':'在粒子家族中的位置'}</h4><p>{en?particleContexts[selected.id].connection.en:particleContexts[selected.id].connection.zh}</p><dl><div><dt>{en?'Generation':'代际'}</dt><dd>{particleContexts[selected.id].generation??(en?'Boson':'玻色子')}</dd></div><div><dt>{en?'Antiparticle':'反粒子关系'}</dt><dd>{particleContexts[selected.id].antiparticle[en?'en':'zh']}</dd></div></dl><span className="smm-references">{particleContexts[selected.id].sourceLinks.map(source=><a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a>)}</span></div><h4>{en?'What does it do?':'它会做什么？'}</h4>{claim(dossier.behaviour)}</>}
       {chapter==='life'&&<><span className="smm-page-index">02 / 04</span><h3>{en?'Where can we meet it?':'在哪里遇见它？'}</h3>{claim(dossier.occurrence)}<h4>{en?'Interactions and change':'相互作用与变化'}</h4>{claim(dossier.behaviour)}</>}
       {chapter==='discovery'&&<><span className="smm-page-index">03 / 04</span><h3>{en?'How did we find it?':'我们如何发现它？'}</h3>{claim(dossier.discovery)}<EvidenceEvent particleId={selected.id} en={en}/><h4>{en?'What the illustration leaves out':'画面的表达边界'}</h4>{claim(dossier.boundary)}</>}
       {chapter==='data'&&<><span className="smm-page-index">04 / 04</span><h3>{en?'The measured picture':'数据与证据'}</h3><dl className="smm-facts"><div><dt>{en?'Rest mass':'静止质量'}</dt><dd>{facts?(en?facts.massEn:facts.mass):(en?selected.massLabelEn:selected.massLabel)}</dd></div><div><dt>{en?'Charge':'电荷'}</dt><dd>{selected.charge} e</dd></div><div><dt>{en?'Spin':'自旋'}</dt><dd>{selected.spin} ℏ</dd></div><div><dt>{en?'Lifetime':'寿命'}</dt><dd>{facts?(en?facts.lifetimeEn:facts.lifetime):(en?'Not listed':'未列出')}</dd></div></dl>{facts&&<a className="smm-data-source" href={facts.sourceUrl} target="_blank" rel="noreferrer">{facts.edition} · PDG · CC BY 4.0 ↗</a>}{facts?.note&&<p className="smm-data-note">{en?facts.noteEn:facts.note}</p>}<p className="smm-data-note">{en?'Quark masses depend on the theoretical scheme. Neutrino flavours have no single definite mass. Spin is intrinsic angular momentum, not a spinning ball. ‘Not listed’ means this extract omits the property.':'夸克质量依赖理论方案。中微子味态没有单一确定质量。自旋是内禀角动量，不是小球自转。“未列出”仅表示本馆摘录未提供该项。'}</p><ul className="smm-source-list">{sourceIds.map(id=><li key={id}><a href={museumSources[id].url} target="_blank" rel="noreferrer">{museumSources[id].title} ↗</a></li>)}</ul></>}
      </div>
      <div className="smm-connected-topics"><h4>{en?'Across the museum':'在全馆继续探索'}</h4>{museumTopics.filter(t=>t.particleIds.includes(selected.id)).slice(0,3).map(t=><a href={`#museum/read/${t.id}`} key={t.id}>{t.title[en?'en':'zh']}<ArrowRight size={14}/></a>)}<a href={selected.id==='e'?'#museum/lab/atom':['ve','vmu','vtau'].includes(selected.id)?'#museum/lab/oscillation':['z','mu'].includes(selected.id)?'#museum/lab/event':'#museum/experiments'}>{en?'Visit the observation room':'进入实验与观察'}<ArrowRight size={14}/></a></div>
      <div className="smm-related"><span>{en?'Continue exploring':'继续发现'}</span>{dossier.related.map(id=>{const p=particles.find(p=>p.id===id)!;return <button key={id} onClick={()=>select(p)}><b>{p.symbol}</b>{en?p.nameEn:p.name}<ArrowRight size={13}/></button>})}</div>
     </section>
    </div>
   </>}
  </article>
 </div>
}
