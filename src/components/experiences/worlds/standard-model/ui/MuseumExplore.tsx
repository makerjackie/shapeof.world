import {useState} from 'react'
import {ArrowLeft,ArrowRight,MagnifyingGlass} from '@phosphor-icons/react'
import {particles} from '../particle-data'
import {museumTopics,type MuseumTopic} from '../museum-topics'
import {museumHash,type MuseumRoute} from '../museum-route'
import {RelatedParticles} from './RelatedParticles'
import {ParticleComparison} from './ParticleComparison'
import {MuseumHistory} from './MuseumHistory'
import {MuseumLab,labNames} from './MuseumLabs'

export const museumAreas = [
 ['matter','物质与作用','Matter & forces'],['discovery','实验与发现','Experiments & discoveries'],['frontiers','未解问题','Open questions'],
] as const
const topicArea = (topic: MuseumTopic) => topic.section === 'interactions' ? 'matter' : topic.section
const areaCopy:Record<string,[string,string]>={matter:['物质由什么组成，粒子之间怎样相互作用。','What matter is made of and how particles interact.'],discovery:['从模拟观察到真实事件，理解我们如何认识粒子。','From model observations to real events: how we learn about particles.'],frontiers:['已知理论还不能回答的问题。','Questions our current theories cannot yet answer.']}
export function MuseumNav({route,en}:{route:Extract<MuseumRoute,{view:'museum'}>;en:boolean}){
 const topic= museumTopics.find(t=>t.id===route.topicId)
 const area=route.section||(route.labId?'discovery':topic?topicArea(topic):undefined)
 return <nav className="smm-area-nav" aria-label={en?'Museum sections':'博物馆分区'}><a href="#museum" aria-current={(!route.section||route.section==='collection')&&!route.topicId&&!route.labId?'page':undefined}>{en?'Particle atlas':'粒子全景'}</a>{museumAreas.map(([id,zh,english])=><a key={id} href={`#museum/${id}`} aria-current={area===id?'page':undefined}>{en?english:zh}</a>)}</nav>
}
export function MuseumExplore({route,en,onInteract}:{route:Extract<MuseumRoute,{view:'museum'}>;en:boolean;onInteract:()=>void}){
 const [query,setQuery]=useState('')
 const topic=route.topicId?museumTopics.find(t=>t.id===route.topicId):null
 if(route.topicId)return topic?<TopicDetail topic={topic} en={en}/>:<div className="smm-empty"><h2>{en?'Exhibit not found':'未找到这件展品'}</h2><a href="#museum">{en?'Return to the museum':'返回全馆导览'} →</a></div>
 if(route.labId)return <section className="smm-reading"><a className="smm-text-link" href="#museum/discovery"><ArrowLeft size={14}/>{en?'Experiments & discoveries':'实验与发现'}</a><h2>{labNames[route.labId as keyof typeof labNames][en?1:0]}</h2><MuseumLab key={route.labId} id={route.labId} en={en} onInteract={onInteract}/><RelatedParticles ids={route.labId==='atom'?['e','gamma']:route.labId==='oscillation'?['ve','vmu','vtau']:['z','mu']} en={en}/></section>
 const section=route.section
 const topics=section?museumTopics.filter(t=>topicArea(t)===section):museumTopics
 const q=query.trim().toLowerCase()
 const particleResults=q?particles.filter(p=>[p.name,p.nameEn,p.symbol,p.id,p.role,p.roleEn].join(' ').toLowerCase().includes(q)):[]
 const topicResults=q?museumTopics.filter(t=>[t.title.zh,t.title.en,t.question.zh,t.question.en,t.summary.zh,t.summary.en,...t.particleIds].join(' ').toLowerCase().includes(q)):[]
 return <>
 <div className="smm-section-tools"><p>{section?areaCopy[section]?.[en?1:0]:null}</p><label className="smm-search"><MagnifyingGlass size={19}/><input aria-label={en?'Search the museum':'搜索全馆'} placeholder={en?'Search a particle, idea or question':'搜索粒子、概念或问题'} value={query} onChange={e=>{setQuery(e.target.value);onInteract()}}/>{q&&<button onClick={()=>setQuery('')}>{en?'Clear':'清空'}</button>}</label></div>
 {q?<section className="smm-results" aria-live="polite"><h2>{en?'Search results':'搜索结果'} <small>{particleResults.length+topicResults.length}</small></h2><div className="smm-result-particles">{particleResults.map(p=><a key={p.id} href={museumHash(p.id)}><b>{p.symbol}</b>{en?p.nameEn:p.name}<ArrowRight size={15}/></a>)}</div><TopicList topics={topicResults} en={en}/>{!particleResults.length&&!topicResults.length&&<p>{en?'No matches. Try a particle name or a broader idea.':'暂无匹配内容，可以尝试粒子名称或更宽泛的概念。'}</p>}</section>:<>
 {section&&section!=='collection'&&<>
  {section==='discovery'?<>
   <section className="smm-content-group"><h3>{en?'Try an observation':'动手观察'}</h3><LabList en={en}/><ParticleComparison en={en}/></section>
   <section className="smm-content-group"><h3>{en?'How evidence reveals particles':'如何从证据认识粒子'}</h3><TopicList topics={topics} en={en}/></section>
   <details className="smm-history-disclosure"><summary>{en?'Discovery timeline':'发现时间线'}<span aria-hidden="true">＋</span></summary><MuseumHistory en={en} onInteract={onInteract}/></details>
  </>:section==='matter'?<>
   <section className="smm-content-group"><h3>{en?'Building matter':'物质的组成'}</h3><TopicList topics={topics.filter(t=>t.section==='matter')} en={en}/></section>
   <section className="smm-content-group"><h3>{en?'Forces and transformations':'作用与变化'}</h3><TopicList topics={topics.filter(t=>t.section==='interactions')} en={en}/></section>
  </>:<TopicList topics={topics} en={en}/>}
 </>}

 </>}
 <div className="smm-science-note"><span>ⓘ</span><p>{en?'The museum distinguishes established observations, simplified models and open questions. Illustrations show behaviour, not the appearance of elementary particles.':'馆内区分已建立的观测、简化模型与开放问题。图像表现行为和关系，不代表基本粒子的真实外貌。'}</p></div>
 </>
}
function LabList({en}:{en:boolean}) {
 return <div className="smm-topic-grid">{Object.entries(labNames).map(([id,names])=><a className="smm-topic-card" key={id} href={`#museum/lab/${id}`}>
  <TopicArt visual={id==='atom'?'matter':id==='oscillation'?'neutrino':'detector'}/>
  <span className="smm-kicker">{id==='event'?(en?'REAL EVENT':'真实事件'):(en?'MATHEMATICAL MODEL':'数学模型')}</span>
  <h3>{names[en?1:0]}</h3>
  <p>{id==='atom'?(en?'Many independent measurements reveal a distribution.':'让多次独立测量显露统计分布。'):id==='oscillation'?(en?'Explore how distance and energy affect flavour probabilities.':'观察距离与能量怎样影响味的概率。'):(en?'Read reconstructed momenta from a CMS candidate.':'阅读 CMS 候选事件的重建动量。')}</p>
  <span className="smm-topic-arrow">{en?'Open':'打开'}<ArrowRight size={18}/></span>
 </a>)}</div>
}
function TopicList({topics,en}:{topics:MuseumTopic[];en:boolean}){
 return <div className="smm-topic-grid">{topics.map(t=><a className="smm-topic-card" key={t.id} href={`#museum/read/${t.id}`}><TopicArt visual={t.visual} topicId={t.id}/><span className="smm-kicker">{t.year||museumAreas.find(a=>a[0]===topicArea(t))?.[en?2:1]}</span><h3>{t.title[en?'en':'zh']}</h3><p>{t.question[en?'en':'zh']}</p><span className="smm-topic-arrow">{en?'Explore':'继续探索'}<ArrowRight size={18}/></span></a>)}</div>
}
function TopicDetail({topic:t,en}:{topic:MuseumTopic;en:boolean}){
 const lang=en?'en':'zh'
 const related=museumTopics.filter(other=>other.id!==t.id&&other.particleIds.some(id=>t.particleIds.includes(id))).slice(0,3)
 return <article className="smm-topic-detail"><a className="smm-text-link" href={`#museum/${topicArea(t)}`}><ArrowLeft size={14}/>{museumAreas.find(a=>a[0]===topicArea(t))?.[en?2:1]}</a><div className="smm-topic-lead"><div><span className="smm-kicker">{t.year|| (en?'A CONNECTED STORY':'一段相连的故事')}</span><h2>{t.title[lang]}</h2><p>{t.question[lang]}</p></div><TopicArt visual={t.visual} topicId={t.id}/></div><div className="smm-reading-body"><p className="smm-topic-summary">{t.summary[lang]}</p>{t.body.map((p,i)=><p key={i}>{p[lang]}</p>)}<aside className="smm-boundary"><b>{en?'Reading the evidence':'理解证据与边界'}</b><p>{t.boundary[lang]}</p></aside><RelatedParticles ids={t.particleIds} en={en}/><div className="smm-topic-sources"><h3>{en?'Sources & further reading':'来源与延伸阅读'}</h3>{t.sourceLinks.map(s=><a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.title} ↗</a>)}</div>{(t.visual==='neutrino'||t.visual==='detector'||t.visual==='matter')&&<a className="smm-primary-link" href={`#museum/lab/${t.visual==='neutrino'?'oscillation':t.visual==='detector'?'event':'atom'}`}>{en?'Continue with an observation':'继续进入实验与观察'}<ArrowRight size={17}/></a>}</div><div className="smm-section-heading"><h3>{en?'Related stories':'相连的知识'}</h3></div><TopicList topics={related} en={en}/></article>
}
export function TopicArt({visual,topicId}:{visual:MuseumTopic['visual'];topicId?:string}){
 const specialized=['three-generations','strong-colour','higgs-field'].includes(topicId||'')
 return <svg className={`smm-topic-art smm-art-${visual}`} viewBox="0 0 420 200" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="1.2">
 {visual==='matter'&&!specialized&&<>{[0,1,2].flatMap(row=>[0,1,2,3,4].map(col=><g key={`${row}${col}`} transform={`translate(${95+col*56+(row%2)*20},${50+row*48})`}><path d="M-17 12L0 0L17 12" opacity=".6"/><circle r="7" fill="currentColor" opacity=".35"/><circle cx="-17" cy="12" r="3"/><circle cx="17" cy="12" r="3"/></g>))}</>}
 {topicId==='three-generations'&&<>{[0,1,2].map(i=><g key={i} transform={`translate(${110+i*100} 42)`}><rect x="-32" y="-10" width="64" height="143" rx="6" opacity=".2"/>{['u','d','ℓ','ν'].map((v,j)=><g key={v}><circle cy={j*32} r="7" opacity=".4"/><text x="20" y={j*32+4} fill="currentColor" stroke="none" fontSize="12">{v}</text></g>)}</g>)}</>}
 {topicId==='strong-colour'&&<><path d="M210 40L135 155L285 155Z" strokeWidth="3" opacity=".4"/>{[[210,40],[135,155],[285,155]].map(([x,y],i)=><g key={i}><circle cx={x} cy={y} r="13" fill="currentColor" opacity=".3"/><text x={x} y={y+4} textAnchor="middle" fill="currentColor" stroke="none" fontSize="12">q</text></g>)}<path d="M120 40Q210 110 300 40M100 170Q210 105 320 170" strokeDasharray="2 5" opacity=".25"/></>}
 {topicId==='higgs-field'&&<>{Array.from({length:9},(_,i)=><path key={i} d={`M40 ${38+i*16}Q135 ${12+i*16} 210 ${38+i*16}T380 ${38+i*16}`} opacity=".25"/>)}<circle cx="210" cy="100" r="24" fill="currentColor" opacity=".12"/><circle cx="210" cy="100" r="7" fill="currentColor"/></>}
 {visual==='cosmic'&&<><path d="M208 15L208 65L120 125M208 65L290 125M120 125L88 180M120 125L167 180M290 125L247 180M290 125L322 180"/><path d="M50 65H370M50 125H370" strokeDasharray="3 7" opacity=".2"/>{[88,167,247,322].map(x=><circle key={x} cx={x} cy="180" r="3" fill="currentColor"/>)}</>}
 {visual==='scatter'&&<>{[-1,0,1].map((v)=><path key={v} d={`M45 ${100+v*35}Q195 ${100+v*35} 210 100Q265 ${100+v*50} 375 ${100+v*80}`}/>)}<circle cx="210" cy="100" r="30" opacity=".2"/><circle cx="210" cy="100" r="8" fill="currentColor" opacity=".4"/></>}
 {visual==='decay'&&<><path d="M50 100H170L285 45M170 100L285 155M285 45L370 25M285 45L370 80"/>{[[50,100],[170,100],[285,155],[370,25],[370,80]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r={i===1?12:5} fill="currentColor" opacity=".5"/>)}</>}
 {visual==='detector'&&<g transform="translate(210 100)">{[25,48,70,88].map(r=><circle r={r} key={r} opacity=".35"/>)}<path d="M0 0Q30-20 74-70M0 0Q-45 15-75 60M0 0Q-20-30-38-82" strokeWidth="2"/><circle r="4" fill="currentColor"/></g>}
 {visual==='spectrum'&&<><path d="M45 155H380M45 155V30" opacity=".4"/><path d="M45 145L85 143L120 140Q145 140 165 133Q183 130 196 50Q204 8 214 50Q226 137 246 138L380 147" strokeWidth="2"/>{Array.from({length:28},(_,i)=>{const y=145-108*Math.exp(-(((i-12)/2.1)**2));return <circle key={i} cx={58+i*11} cy={y+Math.sin(i*7)*4} r="2" fill="currentColor"/>})}</>}
 {visual==='neutrino'&&<>{[0,1,2].map(i=><path key={i} opacity={1-i*.25} d={Array.from({length:101},(_,n)=>`${n?'L':'M'}${40+n*3.4} ${100+Math.sin(n*.075+i*2.1)*55}`).join(' ')}/>)}<path d="M40 175H380" opacity=".2"/></>}
 {visual==='frontier'&&<>{[35,55,75].map((r,i)=><circle key={r} cx="210" cy="100" r={r} strokeDasharray={`${70-i*15} 12`} opacity={.8-i*.2}/>)}<path d="M265 46L338 20M155 150L95 183" opacity=".4"/><circle cx="338" cy="20" r="4"/><circle cx="95" cy="183" r="4"/></>}
 </g></svg>
}
