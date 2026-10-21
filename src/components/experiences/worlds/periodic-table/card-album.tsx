import {useState,type ReactNode} from 'react'
import {elements,chineseNames,type Element} from './element-model'
import {CardRating,cardRating} from './card-rating'
import {cardCollections} from './card-collections'
import {useI18n} from '~/i18n'
export function CardAlbum({collected,match,picture,onChoose,onExplore,returning}:{collected:ReadonlySet<string>;match:(e:Element)=>boolean;picture:(e:Element)=>ReactNode;onChoose:(e:Element,node:HTMLButtonElement)=>void;onExplore:()=>void;returning?:string}){
 const {locale}=useI18n(),[stars,setStars]=useState<number|null>(null),[group,setGroup]=useState('all'),[missing,setMissing]=useState(false)
 const en=locale==='en',trail=cardCollections.find(c=>c.id===group)
 const pool=elements.filter(e=>(!trail||trail.symbols.includes(e.symbol))&&match(e))
 const cards=pool.filter(e=>collected.has(e.symbol)!==missing&&(!stars||cardRating(e.symbol)===stars))
 const found=trail?.symbols.filter(s=>collected.has(s)).length??collected.size,total=trail?.symbols.length??118
 return <section className="pm-album"><header><div><span>{en?'YOUR COLLECTION':'我的收藏'}</span><h2>{en?'Element card album':'元素卡册'}</h2></div><strong>{collected.size}<small> / 118</small></strong></header>
 <meter min={0} max={118} value={collected.size} aria-label={en?'Collection progress':'集卡进度'}/>
 <div className="pm-album-trails" role="group" aria-label={en?'Discovery collections':'探索专题'}><button aria-pressed={group==='all'} onClick={()=>{setGroup('all');setStars(null)}}>{en?'All collections':'全部藏品'}</button>{cardCollections.map(c=>{const n=c.symbols.filter(s=>collected.has(s)).length;return <button key={c.id} data-complete={n===c.symbols.length} aria-pressed={group===c.id} onClick={()=>{setGroup(c.id);setStars(null)}}><i>{n===c.symbols.length?'✓':c.glyph}</i><span>{en?c.nameEn:c.name}</span><small>{n}/{c.symbols.length}</small></button>})}</div>
 {trail&&<div className="pm-album-quest" aria-live="polite"><span>{trail.glyph}</span><div><b>{en?trail.nameEn:trail.name}</b><p>{en?trail.descriptionEn:trail.description}</p></div><strong>{found===total?(en?'Complete':'已集齐'):String(found)+' / '+String(total)}</strong></div>}
 <div className="pm-album-filters" role="group" aria-label={en?'Filter by entertainment rating':'按娱乐星级筛选'}><button aria-pressed={stars===null} onClick={()=>setStars(null)}>{en?'All stars':'全部星级'}</button>{[1,2,3,4,5].map(n=>{const all=pool.filter(e=>cardRating(e.symbol)===n),count=all.filter(e=>collected.has(e.symbol)).length;if(!all.length)return null;return <button key={n} data-stars={n} aria-pressed={stars===n} onClick={()=>setStars(n)}><span>{n} ★</span><small>{count}/{all.length}</small></button>})}</div>
 <div className="pm-album-view"><div role="group" aria-label={en?'Collection status':'收藏状态'}><button aria-pressed={!missing} onClick={()=>setMissing(false)}>{en?'Collected':'已收藏'}</button><button aria-pressed={missing} onClick={()=>setMissing(true)}>{en?'To discover':'待发现'}</button></div><span>{cards.length} {en?'cards':'张卡片'}</span></div>
 <p className="pm-rating-note">{en?'Stars and colours are for entertainment, not rarity or scientific value.':'星级与配色仅供娱乐，不代表稀有度或科学价值。'}</p>
 <div className="pm-album-grid" key={`${group}-${stars}-${missing}`}>{cards.map(e=><button key={e.symbol} data-element={e.symbol} data-stars={cardRating(e.symbol)} data-collected={collected.has(e.symbol)} data-returning={returning===e.symbol||undefined} onClick={ev=>onChoose(e,ev.currentTarget)}><span className="pm-album-number">{String(e.atomicNumber).padStart(3,'0')}</span><CardRating symbol={e.symbol} locale={locale}/><div className="pm-album-specimen">{collected.has(e.symbol)?picture(e):<span className="pm-undiscovered-mark">✧</span>}</div><b>{e.symbol}</b><span className="pm-album-name">{en?e.name:chineseNames[e.atomicNumber-1]}</span><small className="pm-card-action">{collected.has(e.symbol)?(en?'View specimen':'查看藏品'):(en?'Reveal specimen':'揭晓藏品')} ↗</small></button>)}</div>
 {!cards.length&&<div className="pm-album-empty"><p>{missing?(en?'All cards in this view have been discovered.':'这个分类里的卡片已经全部发现。'):(en?'Your next discovery is waiting.':'下一张发现，正在等你。')}</p><button onClick={()=>{if(missing)onExplore();else setMissing(true)}}>{missing?(en?'Explore the periodic table':'去周期表收集'):(en?'Find a new card':'寻找未发现的卡片')}</button></div>}
 </section>
}
