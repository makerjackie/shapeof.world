import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpRight, MagnifyingGlass, X, Plus, Minus, Shuffle, Check, Flask } from '@phosphor-icons/react'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { useExperienceI18n } from '~/i18n/experience'
import { useI18n } from '~/i18n'
import { elementStories } from './element-stories'
import { experimentSymbols } from './reaction-model'
// Styles of the lazily loaded views below are imported here, in their original
// cascade position, so they ship with the table's stylesheet.
import './styles/reaction-lab.css'
import './styles/reaction-theatre.css'
import './styles/element-detective.css'
import { readCollection, writeCollection } from './museum-collection'
import { elementPhotos } from './photo-data'
import { tileBounds, type CabinetBounds } from './cabinet-motion'
import { tableSeries } from './table-series'
import { displayImageFor } from './display-images'
import { specimenCutouts } from './cutout-images'
import { diagramThumbnails } from './diagram-thumbnails'
import { specimenImageVariants } from './image-variants'
import { synthesisReactions } from './synthesis-data'
import { reactionText } from './synthesis-graphic'
import { SynthesisStudy } from './synthesis-study'
import { elements, chineseNames, familyOf, sameFamily, sourceFor, type Element } from './element-model'
import { specimens } from './specimens'
import { materialProperties, materialPhase } from './material-properties'
import './styles/atom-specimen.css'
import { completeElementData } from './complete-element-data'
import { isotopesFor } from './isotopes'
import './styles/PeriodicTable.css'
import './styles/museum.css'
import './styles/glass.css'
import './styles/motion-polish.css'
import './styles/dossier.css'
import './styles/game-details.css'
import './styles/viewport.css'
import './styles/collection-game.css'
import './styles/element-dossier.css'
import {CardRating,cardRating} from './card-rating'
import {CardSound} from './card-sound'
import {useSiteBgm} from '~/lib/site-bgm'
import { SpecimenReveal } from './specimen-reveal'
import { SpecimenReturn, type SpecimenFlight } from './specimen-return'

// The table paints without the detail dialog's atom and experiment views or the
// detective and album modes. Their code loads afterwards; their styles stay
// imported above in the original order, so the cascade does not change.
const loadReactionLab=()=>import('./reaction-lab')
const loadElementDetective=()=>import('./element-detective')
const loadAtomSpecimen=()=>import('./atom-specimen')
const loadCardAlbum=()=>import('./card-album')
const ReactionLab=lazy(()=>loadReactionLab().then(m=>({default:m.ReactionLab})))
const ElementDetective=lazy(()=>loadElementDetective().then(m=>({default:m.ElementDetective})))
const AtomSpecimen=lazy(()=>loadAtomSpecimen().then(m=>({default:m.AtomSpecimen})))
const CardAlbum=lazy(()=>loadCardAlbum().then(m=>({default:m.CardAlbum})))
const preloadLaterViews=()=>{for(const load of [loadAtomSpecimen,loadReactionLab,loadElementDetective,loadCardAlbum])void load().catch(()=>undefined)}

const tableViews = [
 {id:'table',label:'完整周期表'},
 {id:'weight',label:'标准原子量'},
 {id:'melt',label:'熔点'},
 {id:'boil',label:'沸点'},
 {id:'density',label:'密度'},
 {id:'electronegativity',label:'电负性（鲍林标度）'},
 {id:'atomicRadius',label:'范德华半径'},
 {id:'ionization',label:'第一电离能'},
] as const

export function PeriodicTable({controls}:{controls:ExperienceControls}) {
 const capture=typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('capture')==='1'
 const tx=useExperienceI18n()
 const {muted}=useSiteBgm()
 const sound=useRef<CardSound|null>(null)
 useEffect(()=>{if(muted)sound.current?.dispose()},[muted])
 useEffect(()=>{const stop=()=>{if(document.hidden)sound.current?.dispose()};document.addEventListener('visibilitychange',stop);return()=>{sound.current?.dispose();document.removeEventListener('visibilitychange',stop)}},[])
 const {locale}=useI18n()
 const [view,setView]=useState<typeof tableViews[number]['id']>('table')
 const isHeatmap=view!=='table'
 const heat=isHeatmap?view:'weight'
 const viewLabel=tableViews.find(v=>v.id===view)!.label
 const [query,setQuery]=useState('')
 const [tableZoom,setTableZoom]=useState(false)
 const [collection,setCollection]=useState<Set<string>>(()=>readCollection('elements'))
 const [discoveries,setDiscoveries]=useState<Set<string>>(()=>readCollection('experiments'))
 const [filter,setFilter]=useState<'all'|'play'|'seen'|'hunt'>('all')
 const hoverTimer=useRef<ReturnType<typeof setTimeout>|null>(null)
 const previewElement=(e:Element)=>{if(hoverTimer.current)clearTimeout(hoverTimer.current);hoverTimer.current=setTimeout(()=>setPreview(e),65)}
 useEffect(()=>()=>{if(hoverTimer.current)clearTimeout(hoverTimer.current)},[])
 useEffect(()=>writeCollection('elements',collection),[collection])
 useEffect(()=>writeCollection('experiments',discoveries),[discoveries])
 const collect=(e:Element)=>setCollection(current=>new Set([...current,e.symbol]))
 const discover=(id:string)=>setDiscoveries(current=>new Set([...current,id]))
 const [seriesFocus,setSeriesFocus]=useState<string|null>(null)
 const [preview,setPreview]=useState(elements[82])
 const spotlight=useRef<HTMLButtonElement>(null)
 const [massChoice,setMassChoice]=useState<number|null>(null)
 const [shell,setShell]=useState<number|null>(null)
 const [family,setFamily]=useState(false)
 const [selected,setSelected]=useState<Element|null>(null)
 const [anchor,setAnchor]=useState(elements[28])
 const [closing,setClosing]=useState(false)
 const [extracting,setExtracting]=useState(false)
 const [newDiscovery,setNewDiscovery]=useState(false)
 const [tab,setTab]=useState('story')
 const [zoom,setZoom]=useState(false)
 const [original,setOriginal]=useState(false)
 const [reduced,setReduced]=useState(false)
 const origin=useRef<CabinetBounds|null>(null)
 const trigger=useRef<HTMLButtonElement|null>(null)
 const focusReturn=useRef<HTMLButtonElement|null>(null)
 const hero=useRef<HTMLDivElement>(null)
 const dialog=useRef<HTMLDivElement>(null)
 const closeButton=useRef<HTMLButtonElement>(null)
 const [returnFlight,setReturnFlight]=useState<SpecimenFlight|null>(null)
 const returnDestination=useRef<HTMLButtonElement|null>(null)
 const opened=useRef(false)
 const root=useRef<HTMLDivElement>(null)
 // Every element dialog mounts the atom and experiment views, so fetch those as
 // the table mounts; the detective and album follow once the page is idle, or
 // as soon as the visitor reaches for the table.
 useEffect(()=>{
  for(const load of [loadAtomSpecimen,loadReactionLab])void load().catch(()=>undefined)
  const idle=window.requestIdleCallback?.bind(window)
  let idleHandle=0
  const timer=window.setTimeout(()=>{if(idle)idleHandle=idle(preloadLaterViews,{timeout:4000});else preloadLaterViews()},1200)
  const reach=()=>preloadLaterViews()
  const node=root.current
  node?.addEventListener('pointerdown',reach,{once:true,capture:true})
  node?.addEventListener('keydown',reach,{once:true,capture:true})
  return()=>{window.clearTimeout(timer);if(idleHandle)window.cancelIdleCallback?.(idleHandle);node?.removeEventListener('pointerdown',reach,{capture:true});node?.removeEventListener('keydown',reach,{capture:true})}
 },[])
 useEffect(()=>{
  const node=root.current
  if(!node||reduced)return
  let frame=0,active:HTMLElement|null=null,x=0,y=0
  const reset=()=>{if(active){active.style.removeProperty('--glass-rx');active.style.removeProperty('--glass-ry');active.style.removeProperty('--glass-light')}active=null}
  const move=(event:PointerEvent)=>{
   if(event.pointerType!=='mouse')return
   const target=(event.target as HTMLElement).closest<HTMLElement>('.pm-cell')
   if(target!==active){reset();active=target}
   if(!active)return
   x=event.clientX;y=event.clientY
   if(!frame)frame=requestAnimationFrame(()=>{frame=0;if(!active)return;const b=active.getBoundingClientRect();const px=Math.max(-1,Math.min(1,2*(x-b.left)/b.width-1)),py=Math.max(-1,Math.min(1,2*(y-b.top)/b.height-1));active.style.setProperty('--glass-rx',`${-py*5}deg`);active.style.setProperty('--glass-ry',`${px*5}deg`);active.style.setProperty('--glass-light',`${50+px*35}%`)})
  }
  node.addEventListener('pointermove',move);node.addEventListener('pointerleave',reset)
  return()=>{cancelAnimationFrame(frame);reset();node.removeEventListener('pointermove',move);node.removeEventListener('pointerleave',reset)}
 },[reduced,selected])
 const interact=()=>controls.registerInteraction()
 const exactSearch=elements.find(e=>e.symbol.toLowerCase()===query.trim().toLowerCase()||String(e.atomicNumber)===query.trim())
 const match=(e:Element,includeUncollected=false)=>(exactSearch?e===exactSearch:!query.trim()||`${e.atomicNumber} ${e.symbol} ${e.name} ${chineseNames[e.atomicNumber-1]}`.toLowerCase().includes(query.trim().toLowerCase()))&&(!family||sameFamily(anchor,e))&&(filter==='all'||filter==='hunt'||(filter==='play'?experimentSymbols.has(e.symbol):includeUncollected||collection.has(e.symbol)))
 function choose(e:Element,node:HTMLButtonElement) {
  if(!muted&&!reduced)(sound.current??=new CardSound()).play(cardRating(e.symbol))
  setNewDiscovery(!collection.has(e.symbol))
  interact();collect(e);if(hoverTimer.current)clearTimeout(hoverTimer.current);origin.current=tileBounds(node.querySelector<HTMLElement>('.pm-feature-photo')??node);trigger.current=node;opened.current=false
  setExtracting(!reduced);setSelected(e);setAnchor(e);setPreview(e);setTab(experimentSymbols.has(e.symbol)?'lab':'story');setShell(null);setMassChoice(null);setZoom(false);setOriginal(false);setClosing(false)
 }
 function randomExhibit(){
  const reveal=()=>{const pool=elements.filter(e=>!collection.has(e.symbol));const e=(pool.length?pool:elements)[Math.floor(Math.random()*(pool.length||elements.length))];const node=root.current?.querySelector<HTMLButtonElement>(`.pm-cell[data-element="${e.symbol}"]`);if(node)choose(e,node)}
  if(filter==='seen'||filter==='hunt'){setFilter('all');requestAnimationFrame(reveal)}else reveal()
 }
 function finishReturn(){focusReturn.current=returnDestination.current;setSelected(null);setClosing(false);setExtracting(false);setReturnFlight(null)}
 function close() {
  if(closing||!selected)return
  sound.current?.dispose()
  const destination=trigger.current?.isConnected&&trigger.current.dataset.element===selected.symbol?trigger.current:root.current?.querySelector<HTMLButtonElement>(`${filter==='hunt'?'.pm-mystery-specimens button':filter==='seen'?'.pm-album-grid button':'.pm-cell'}[data-element="${selected.symbol}"]`)??root.current?.querySelector<HTMLButtonElement>('.pm-tabs button[aria-pressed=true]')
  returnDestination.current=destination??null
  const specimen=document.querySelector<HTMLImageElement>('.pm-reveal-object')??hero.current?.querySelector<HTMLImageElement>('.pm-hero-image img')
  const from=(specimen??hero.current?.querySelector('.pm-hero-image'))?.getBoundingClientRect()
  const target=destination?.querySelector<HTMLElement>('img')??destination
  if(!reduced&&from&&from.width>0&&from.height>0&&target){
   setReturnFlight({from:{left:from.left,top:from.top,width:from.width,height:from.height},to:tileBounds(target),src:specimen?.currentSrc||displayImageFor(selected.symbol)||elementPhotos[selected.symbol].src})
  }else setReturnFlight(null)
  setExtracting(false);setClosing(true)
 }
 useLayoutEffect(()=>{
  if(!selected||opened.current)return
  opened.current=true
  closeButton.current?.focus({preventScroll:true})
 },[selected,reduced])
 useEffect(()=>{if(reduced)setExtracting(false)},[reduced])
 useLayoutEffect(()=>{if(closing&&(reduced||!returnFlight))finishReturn()},[closing,reduced,returnFlight])
 useLayoutEffect(()=>{
  if(!selected&&focusReturn.current){focusReturn.current.focus({preventScroll:true});focusReturn.current=null}
 },[selected])
 useEffect(()=>{
  const m=matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReduced(m.matches)
  update();m.addEventListener('change',update);return()=>{m.removeEventListener('change',update)}
 },[])
 useEffect(()=>{
  if(!selected)return
  const onKey=(event:KeyboardEvent)=>{
   if(extracting&&!event.repeat&&(event.key==='Enter'||event.key===' ')){event.preventDefault();event.stopPropagation();sound.current?.dispose();setExtracting(false);closeButton.current?.focus({preventScroll:true});return}
   if(event.key==='Escape'){event.preventDefault();event.stopPropagation();const expanded=dialog.current?.querySelector<HTMLButtonElement>('.pm-atom-studio.is-expanded .pm-atom-expand');if(expanded)expanded.click();else close()}
   if(event.key==='Tab'){
    const nodes=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button,a,input,select,[tabindex]')??[]).filter(n=>n.getClientRects().length>0&&n.tabIndex>=0&&!n.closest('[inert]'))
    const first=nodes[0],last=nodes[nodes.length-1]
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}
    if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
   }
  }
  window.addEventListener('keydown',onKey,true);return()=>window.removeEventListener('keydown',onKey,true)
 })
 const featured=['Bi','Na','Ga','Ne','Rn','Og']
 const previewQuestion=locale==='en'?elementStories[preview.symbol].titleEn:elementStories[preview.symbol].title
 const previewNote=locale==='en'?elementStories[preview.symbol].usesEn:elementStories[preview.symbol].uses
 const previewProperties=completeElementData[preview.symbol]
 const previewColor=specimens[preview.symbol]?.color??(preview.symbol==='Ne'?'#e98a5a':'#b5aaa0')
 const s=selected?specimens[selected.symbol]:undefined
 const photo=selected?elementPhotos[selected.symbol]:undefined
 const illustration=selected?displayImageFor(selected.symbol):undefined
 const reaction=selected?synthesisReactions[selected.symbol]:undefined
 const caption=photo?(locale==='en'?photo.captionEn:photo.caption):''
 const kindLabel=(kind:string)=>tx(kind==='specimen'?'单质标本':kind==='discharge'?'放电实拍':kind==='mineral'?'含元素矿物':kind==='compound'?'化合物':kind==='sample'?'实验样品':kind==='observation'?'实验观测':kind==='diagram'?'合成示意':'研究关联图像')
 const properties=selected?completeElementData[selected.symbol]:undefined
 const editorial=selected?materialProperties[selected.symbol]:undefined
 const referenceIsotopes=selected?isotopesFor(selected.atomicNumber):[]
 const exhibitMass=reaction?.product.mass??photo?.isotopeMass
 const isotopeOptions=exhibitMass&&!referenceIsotopes.some(i=>i.mass===exhibitMass)?[...referenceIsotopes,{mass:exhibitMass,abundance:null}].sort((a,b)=>a.mass-b.mass):referenceIsotopes
 const isotope=isotopeOptions.find(i=>i.mass===massChoice)??isotopeOptions.reduce<typeof isotopeOptions[number]|undefined>((best,i)=>!best||(i.abundance??-1)>(best.abundance??-1)?i:best,undefined)
 const mass=massChoice??exhibitMass??isotope?.mass??(selected?.massKind==='isotope'?Number(selected.atomicMass.replace(/[\[\]]/g,'')):null)
 const heatValue=(e:Element)=>heat==='weight'?Number(e.atomicMass.replace(/[\[\]]/g,'')):completeElementData[e.symbol]?.[heat]??null
 const heatValues=elements.map(heatValue).filter((v):v is number=>v!==null)
 const heatMin=Math.min(...heatValues),heatMax=Math.max(...heatValues)
 const heatUnit=heat==='melt'||heat==='boil'?' °C':heat==='density'?' g/cm³':heat==='atomicRadius'?' pm':heat==='ionization'?' eV':''
 const picture=(e:Element,purpose:'thumbnail'|'preview'|'detail'|'album'='thumbnail',source=false,lead=false)=>{
  const p=elementPhotos[e.symbol],ai=source?undefined:displayImageFor(e.symbol)
  const cutout=source?undefined:specimenCutouts[e.symbol]
  const variant=purpose==='detail'||source?undefined:purpose==='thumbnail'?(diagramThumbnails[e.symbol]??specimenImageVariants[e.symbol]?.thumbnail):purpose==='album'?(diagramThumbnails[e.symbol]??specimenImageVariants[e.symbol]?.preview):specimenImageVariants[e.symbol]?.preview
  return p?<img draggable={false} loading={purpose==='thumbnail'||purpose==='album'?'lazy':'eager'} fetchPriority={lead?'high':undefined} decoding="async" src={variant?.src??cutout??ai??p.src} width={variant?.width} height={variant?.height} alt={ai?`${tx('AI 展示图 · 参考真实照片')} · ${tx(chineseNames[e.atomicNumber-1])}`:locale==='en'?p.captionEn:p.caption} data-image-source={source?'reference':ai?'ai':'photo'} data-image-alpha={Boolean(cutout)||undefined} className={purpose==='detail'&&zoom?'is-magnified':''}/>:<div className="pm-empty"><span>{e.symbol}</span></div>
 }


 return <div className={`pm-world${selected&&!closing?' is-inspecting':''}${closing?' is-returning':''}${extracting?' is-extracting':''}`} ref={root} data-capture={capture} data-locale={locale}>
  <div className="pm-room" data-view={filter} inert={Boolean(selected)}>
   <header className="pm-heading" data-experience-overlay="true"><div><span className="pm-kicker">{tx('物质的收藏 · 001—118')}</span><h1>{tx('元素周期表')}</h1></div><span className="pm-edition">{tx('元素收藏')}<small>{tx('已发现')} {collection.size} / 118</small></span></header>
   <nav className="pm-toolbar" data-experience-overlay="true" aria-label={tx('展厅视图')}>
    <div className="pm-tabs"><button aria-pressed={filter==='all'} onClick={()=>{interact();setFilter('all')}}>{tx('全部展品')}</button><button aria-pressed={filter==='hunt'} onClick={()=>{interact();setFilter('hunt')}}><MagnifyingGlass size={14}/>{tx('元素侦探')}</button><button aria-pressed={filter==='play'} onClick={()=>{interact();setFilter('play')}}><Flask size={14}/>{tx('可做实验')}</button><button aria-pressed={filter==='seen'} onClick={()=>{interact();setFilter('seen')}}>{tx('元素卡册')} <small>{collection.size}</small></button></div><label className="pm-view-select"><span>{tx('展厅视图')}</span><select aria-label={tx('展厅视图')} value={view} onChange={e=>{interact();setView(e.target.value as typeof view)}}>{tableViews.map(v=><option key={v.id} value={v.id}>{tx(v.label)}</option>)}</select></label><button className="pm-random" onClick={randomExhibit}><Shuffle size={15}/>{tx('随机取出')}</button>
    <label className="pm-search"><MagnifyingGlass size={16}/><input aria-label={tx('搜索元素')} placeholder={tx('名称 / 符号 / 序数')} value={query} onKeyDown={ev=>{if(ev.key==='Enter'){ev.preventDefault();ev.stopPropagation();const matches=elements.filter(e=>match(e,filter==='seen'));if(matches.length===1){const node=root.current?.querySelector<HTMLButtonElement>(`${filter==='seen'?'.pm-album-grid button':'.pm-cell'}[data-element="${matches[0].symbol}"]`);if(node)choose(matches[0],node)}}}} onChange={ev=>{interact();setQuery(ev.target.value)}}/>{query&&<button aria-label={tx('清除搜索')} onClick={()=>setQuery('')}><X size={15}/></button>}</label>
   </nav>
   <button hidden={filter==='hunt'} className="pm-map-zoom" data-experience-overlay="true" aria-pressed={tableZoom} onClick={()=>{interact();setTableZoom(!tableZoom)}}>{tableZoom?<Minus size={14}/>:<Plus size={14}/>} {tx(tableZoom?'查看全表':'放大表格')}</button>
   {filter==='seen'&&<Suspense fallback={null}><CardAlbum returning={closing?selected?.symbol:undefined} collected={collection} match={e=>match(e,true)} picture={e=>picture(e,'album')} onChoose={choose} onExplore={()=>{interact();setFilter('all');setQuery('')}}/></Suspense>}
   {filter==='hunt'&&<Suspense fallback={null}><ElementDetective picture={e=>picture(e,'preview')} onChoose={choose} onInteract={interact}/></Suspense>}
   <div className="pm-stage" hidden={filter==='seen'||filter==='hunt'}>
    <div className="pm-table-scroll" tabIndex={0} aria-label={tx('横向滚动查看完整周期表')}><div data-series-focus={seriesFocus??undefined} className={`pm-table${isHeatmap?' is-heatmap':''}${tableZoom?' is-expanded':''}`}>
     {isHeatmap?<div className="pm-table-title"><span>{tx(viewLabel)}</span><small>{tx('色深对应数值；— 表示缺少数据。密度与相变取决于测量条件。')}</small></div>:<section className="pm-spotlight" style={{'--specimen-color':previewColor} as CSSProperties} aria-label={tx('标本预览')}>
      <button data-element={preview.symbol} data-returning={closing&&selected?.symbol===preview.symbol||undefined} ref={spotlight} className="pm-feature" onClick={ev=>choose(preview,ev.currentTarget)} aria-label={`${tx('取出观察')} ${tx(chineseNames[preview.atomicNumber-1])}`}>
       <div className="pm-feature-photo" key={preview.symbol}>{picture(preview,'preview',false,true)}<span className="pm-feature-orbit"/></div>
       <div className="pm-feature-copy" key={`${preview.symbol}-copy`}><span className="pm-feature-index">{String(preview.atomicNumber).padStart(3,'0')} / {preview.symbol} <i/> {kindLabel(elementPhotos[preview.symbol].kind)}{displayImageFor(preview.symbol)&&<em>{tx('AI 展示图')}</em>}</span><h2>{tx(chineseNames[preview.atomicNumber-1])}{locale==='en'?': ':'：'}{previewQuestion}</h2><CardRating symbol={preview.symbol} locale={locale} note/><p>{previewNote}</p><div className="pm-preview-facts"><span>{tx('原子量')}<b>{preview.atomicMass}</b></span><span>{tx('熔点')}<b>{previewProperties?.melt??'—'}{previewProperties?.melt!=null?' °C':''}</b></span><span>{tx('电子层')}<b>{previewProperties?.shells?.join(' · ')??'—'}</b></span></div><span className="pm-feature-action">{tx('取出观察')} <ArrowUpRight size={17}/></span></div>
      </button>
      <div className="pm-feature-choices" aria-label={tx('从这些标本开始')}>{featured.map(symbol=><button key={symbol} aria-label={`${tx('预览')} ${tx(chineseNames[elements.find(e=>e.symbol===symbol)!.atomicNumber-1])}`} aria-pressed={preview.symbol===symbol} onPointerEnter={ev=>{if(ev.pointerType==='mouse')previewElement(elements.find(e=>e.symbol===symbol)!)}} onFocus={()=>setPreview(elements.find(e=>e.symbol===symbol)!)} onClick={()=>{interact();setPreview(elements.find(e=>e.symbol===symbol)!)}}>{symbol}<span>{tx(chineseNames[elements.find(e=>e.symbol===symbol)!.atomicNumber-1])}</span></button>)}</div>
     </section>}
     {tableSeries.map(series=><div className="pm-series-pair" key={series.first}>
      <button className="pm-series-gap" data-series={series.name} aria-label={`${tx('显示下方展开行')} · ${tx(series.name)} ${series.first}–${series.last}`} aria-pressed={seriesFocus===series.name} style={{gridColumn:3,gridRow:series.period,'--element-row':series.period} as CSSProperties} onClick={()=>{interact();setSeriesFocus(seriesFocus===series.name?null:series.name)}}><b>{series.first}–{series.last}</b><span><em>{series.marker}</em> {tx(series.name)}</span><i aria-hidden="true">↓</i></button>
      <button className="pm-series-label" data-series={series.name} aria-pressed={seriesFocus===series.name} style={{gridColumn:'1 / 4',gridRow:series.row,'--element-row':series.row} as CSSProperties} onClick={()=>{interact();setSeriesFocus(seriesFocus===series.name?null:series.name)}}><span>{series.marker} {tx(series.name)}</span><small>{series.first}–{series.last} <span aria-hidden="true">→</span></small></button>
     </div>)}
     {elements.map(e=><button className={`pm-cell${!match(e)?' is-dimmed':''}${preview.symbol===e.symbol?' is-featured':''}${collection.has(e.symbol)?' is-collected':''}`} data-element={e.symbol} data-returning={closing&&selected?.symbol===e.symbol||undefined} data-playable={experimentSymbols.has(e.symbol)||undefined} data-series={e.series} data-photo-kind={elementPhotos[e.symbol].kind} onPointerEnter={ev=>{if(ev.pointerType==='mouse')previewElement(e)}} onFocus={()=>{if(hoverTimer.current)clearTimeout(hoverTimer.current);setPreview(e)}} key={e.atomicNumber} style={{gridColumn:e.layoutColumn,gridRow:e.layoutRow,'--element-row':e.layoutRow,'--entry-delay':`${(e.layoutColumn+e.layoutRow)*12}ms`,'--weight':heatValue(e)===null?0:(heatValue(e)!-heatMin)/(heatMax-heatMin||1)} as CSSProperties} onClick={ev=>choose(e,ev.currentTarget)} aria-label={`${e.atomicNumber} ${e.symbol} ${tx(chineseNames[e.atomicNumber-1])}`}><small>{e.atomicNumber}</small><b>{e.symbol}</b>{picture(e)}{collection.has(e.symbol)&&<Check className="pm-collected-mark" size={9} aria-label={tx('已发现')}/>}{elementPhotos[e.symbol]&&!['specimen','discharge'].includes(elementPhotos[e.symbol].kind)&&<i className="pm-cell-kind">{kindLabel(elementPhotos[e.symbol].kind)}</i>}<span>{isHeatmap?(heatValue(e)===null?'—':`${heat==='weight'?e.atomicMass:heatValue(e)}${heatUnit}`):tx(chineseNames[e.atomicNumber-1])}</span></button>)}
    </div></div>
   </div>
   <div className="pm-no-results" hidden={filter==='seen'||elements.some(e=>match(e))} role="status">{tx('没有匹配的展品')}<button onClick={()=>{setQuery('');setFilter('all');setFamily(false)}}>{tx('显示全部')}</button></div><footer className="pm-footer" data-experience-overlay="true"><span>{tx('点击展柜，取出观察')} <ArrowUpRight size={13}/></span><button aria-pressed={family} onClick={()=>{interact();setFamily(!family)}}>{tx(family?'显示全部':'点亮同族')} · {anchor.symbol}</button><small aria-live="polite">{tx('已观察变化')} {discoveries.size} · {tx('AI 展示图参考实拍，标本不按比例。')}</small></footer>
  </div>
  {selected&&<div ref={dialog} className={`pm-inspector${closing?' is-closing':''}`} role="dialog" aria-modal="true" aria-labelledby="pm-detail-title">
   <button className="pm-backdrop" tabIndex={-1} aria-label={tx('返回展厅')} onClick={close}/>
   {extracting&&!closing&&<button className="pm-reveal-skip" ref={node=>node?.focus({preventScroll:true})} aria-label={locale==='en'?'Skip reveal':'跳过揭晓动画'} onClick={event=>{event.stopPropagation();sound.current?.dispose();setExtracting(false);closeButton.current?.focus({preventScroll:true})}}/>}
   <div className="pm-folio" data-tab={tab} data-stars={cardRating(selected.symbol)}>
   <div className="pm-close-anchor"><button ref={closeButton} className="pm-close pm-close-corner" aria-label={tx('放回展柜')} onClick={close}><ArrowLeft size={17}/><span>{tx('放回展柜')}</span></button>    <nav className="pm-neighbours" inert={extracting||closing} aria-label={locale==='en'?'Browse element cards':'浏览元素卡片'}><button onClick={()=>{interact();sound.current?.dispose();dialog.current?.scrollTo({top:0,behavior:'instant'});origin.current=null;collect(elements[(selected.atomicNumber+116)%118]);setSelected(elements[(selected.atomicNumber+116)%118]);setAnchor(elements[(selected.atomicNumber+116)%118]);setTab(experimentSymbols.has(elements[(selected.atomicNumber+116)%118].symbol)?'lab':'story');setPreview(elements[(selected.atomicNumber+116)%118]);setShell(null);setMassChoice(null);setZoom(false);setOriginal(false)}} aria-label={tx('上一个元素')}><ArrowLeft size={16}/><span>{locale==='en'?'Previous':'上一张'}</span><b>{elements[(selected.atomicNumber+116)%118].symbol}</b></button><span>{selected.atomicNumber} / 118</span><button onClick={()=>{interact();sound.current?.dispose();dialog.current?.scrollTo({top:0,behavior:'instant'});origin.current=null;collect(elements[selected.atomicNumber%118]);setSelected(elements[selected.atomicNumber%118]);setAnchor(elements[selected.atomicNumber%118]);setTab(experimentSymbols.has(elements[selected.atomicNumber%118].symbol)?'lab':'story');setPreview(elements[selected.atomicNumber%118]);setShell(null);setMassChoice(null);setZoom(false);setOriginal(false)}} aria-label={tx('下一个元素')}><span>{locale==='en'?'Next':'下一张'}</span><b>{elements[selected.atomicNumber%118].symbol}</b><ArrowRight size={16}/></button></nav></div>
   <div className="pm-folio-content" inert={extracting||closing}>
   <header className="pm-dossier-header" key={selected.symbol}><div className="pm-dossier-badge"><small>{selected.atomicNumber}</small><b>{selected.symbol}</b></div><div><span className="pm-kicker">{photo?kindLabel(photo.kind):tx('元素档案')}</span><h2 id="pm-detail-title">{locale==='en'?selected.name:chineseNames[selected.atomicNumber-1]}</h2><p className="pm-dossier-subtitle">{locale==='en'?elementStories[selected.symbol].titleEn:elementStories[selected.symbol].title}</p><span className="pm-exhibit-name">{tx(familyOf(selected))}<span><Check size={12}/>{tx('已收入发现册')}</span></span><CardRating symbol={selected.symbol} locale={locale} note/></div><dl className="pm-dossier-stats"><div><dt>{tx(selected.massKind==='isotope'?'同位素质量数':'标准原子量')}</dt><dd>{selected.atomicMass}</dd></div><div><dt>{tx('周期')}</dt><dd>{selected.period}</dd></div><div><dt>{tx('族')}</dt><dd>{selected.group??'—'}</dd></div></dl><p className="pm-dossier-intro">{locale==='en'?elementStories[selected.symbol].usesEn:elementStories[selected.symbol].uses}</p></header>
   <div className="pm-visuals"><span className="pm-stage-symbol" aria-hidden="true">{selected.symbol}</span>
   <div className="pm-hero" data-original={original} data-image-kind={photo?.kind} ref={hero} style={{'--mineral':s?.color??'#8b9591'} as CSSProperties}>
    <div className="pm-hero-top"><span>{selected.atomicNumber.toString().padStart(2,'0')}</span><b>{selected.symbol}</b><small>{photo?kindLabel(photo.kind):tx(familyOf(selected))}</small></div>
    <div className="pm-hero-image" key={`${selected.symbol}-${original}`}>{reaction?<SynthesisStudy key={selected.symbol} reaction={reaction} reduced={reduced} onInteract={interact}/>:<button className="pm-photo-zoom" aria-label={tx(zoom?'缩小照片':'放大照片')} aria-pressed={zoom} onClick={()=>{interact();setZoom(!zoom)}}>{picture(selected,'detail',original)}</button>}</div>
    {illustration&&<div className="pm-photo-mode" aria-label={tx('图像版本')}><button aria-pressed={!original} onClick={()=>{interact();setOriginal(false);setZoom(false)}}>{tx('AI 展示图')}</button><button aria-pressed={original} onClick={()=>{interact();setOriginal(true);setZoom(false)}}>{tx('真实参考照片')}</button></div>}

   </div>
    {properties?.shells&&<div className="pm-inline-atom"><Suspense fallback={null}><AtomSpecimen key={selected.symbol} symbol={selected.symbol} atomicNumber={selected.atomicNumber} massNumber={mass??undefined} shells={properties.shells} reduced={reduced} activeShell={shell} onShellChange={setShell} onInteract={interact}/></Suspense></div>}
    <p className="pm-isotope-caption">{tx('当前同位素')} · {selected.symbol}-{mass??'—'} <button onClick={()=>{interact();setTab('electrons');requestAnimationFrame(()=>dialog.current?.querySelector('.pm-isotopes')?.scrollIntoView({behavior:reduced?'instant':'smooth',block:'center'}))}}>{tx('切换同位素')}</button></p>
   </div>
   <section className="pm-reading" data-experience-overlay="true">
    <div className="pm-detail-tabs">{(experimentSymbols.has(selected.symbol)?['lab','story','electrons','data','source']:['story','electrons','data','source']).map((v)=><button key={v} aria-pressed={tab===v} onClick={()=>{interact();setTab(v)}}>{tx(({story:'观察与用途',lab:'变化实验',electrons:'同位素与排布',data:'物性',source:'来源'} as Record<string,string>)[v])}</button>)}</div>
    <div className="pm-details" hidden={tab!=='lab'}><Suspense fallback={null}><ReactionLab active={tab==='lab'&&!extracting&&!closing} key={selected.symbol} symbol={selected.symbol} reduced={reduced} onInteract={interact} onDiscovery={discover} discoveries={discoveries}/></Suspense></div>
    {tab==='lab'?null:tab==='story'?<div className="pm-copy"><h3>{tx('关于这件展品')}</h3><p>{reaction?(locale==='en'?reaction.contextEn:reaction.context):photo&&(!s?.text||['apparatus','observation','sample','mineral'].includes(photo.kind))?caption:tx(s?.text??'原子序数等于质子数，它确定了元素的身份。选择同族元素，可以比较它们在表中的位置。')}</p>{reaction&&<div className="pm-reaction-record"><h3>{tx('代表性合成反应')}</h3><p className="pm-reaction-equation">{reactionText(reaction)}</p><p>{tx('两个原子核融合，再逸出中子；图中演示的是一次成功反应。')}</p><div><span>{tx('质子数守恒')}</span><b>{reaction.target.protons} + {reaction.beam.protons} = {reaction.product.protons}</b></div><div><span>{tx('核子数守恒')}</span><b>{reaction.target.mass} + {reaction.beam.mass} = {reaction.product.mass} + {reaction.neutrons}</b></div><small>{tx('棕色代表质子，青色代表中子。一次动画只展示一种合成通道，不代表每次碰撞都能成功；反应产物随后仍可能衰变。')}</small><a href={reaction.sourceUrl} target="_blank" rel="noreferrer">{tx('查看实验依据')} <ArrowUpRight size={14}/></a></div>}{!editorial&&properties&&<div className="pm-story-properties"><h3>{tx('物性')}</h3><dl><div><dt>{tx('熔点')}</dt><dd>{properties.melt??'—'} <small>°C</small></dd></div><div><dt>{tx('沸点')}</dt><dd>{properties.boil??'—'} <small>°C</small></dd></div><div><dt>{tx('密度')}</dt><dd>{properties.density??'—'} <small>g/cm³</small></dd></div></dl><p>{tx('数值随压力、温度与同素异形体而异；详见来源。')}</p><h3>{tx('基态电子排布')}</h3><div className="pm-configuration">{properties.config?.split(/(\d+[spdf]\d+)/g).map((part,i)=>{const orbital=part.match(/^(\d+[spdf])(\d+)$/);return orbital?<span key={i}>{orbital[1]}<sup>{orbital[2]}</sup> </span>:part})??'—'}</div>{properties.configPredicted&&<small>{tx('此电子排布包含理论预测。')}</small>}</div>}{editorial&&<><h3>{tx('发现的足迹')}</h3><p>{tx(editorial.discovery)}</p></>}{editorial&&<div className="pm-quick-facts"><div><span>{tx('熔点')}</span><b>{editorial.melt??'—'}°C</b></div><div><span>{tx('20°C 时')}</span><b>{tx(materialPhase(selected.symbol,20))}</b></div><div><span>{tx('密度')}</span><b>{editorial.density??'—'}<small> g/cm³</small></b></div></div>}<span className="pm-small-note">{tx(reaction?'按已发表反应绘制；形状、颜色、距离与时间均为示意，非实拍。':photo?.kind==='apparatus'?'照片展示与该元素直接相关的研究装置；具体关系见图注。':photo?.kind==='observation'?'照片记录实验中的观测信号，不能据此推断单质的常态外观。':photo?.kind==='compound'||photo?.kind==='mineral'||photo?.kind==='sample'?'照片展示含有这种元素的材料或实验样品，不能据此推断纯净单质的外观。':illustration?'展示图由真实照片生成；切换到原图，可查看实际标本。':'真实照片；展柜与布光为界面设计，标本不按同一比例展示。')}</span></div>:tab==='data'?<dl className="pm-data"><div><dt>{tx('原子序数')}</dt><dd>{selected.atomicNumber}</dd></div><div><dt>{tx(selected.massKind==='isotope'?'同位素质量数':'标准原子量')}</dt><dd>{selected.atomicMass}</dd></div><div><dt>{tx('周期')}</dt><dd>{selected.period}</dd></div><div><dt>{tx('族')}</dt><dd>{selected.group??'—'}</dd></div>{properties&&<><div><dt>{tx('熔点')}</dt><dd>{properties.melt??'—'} °C</dd></div><div><dt>{tx('沸点')}</dt><dd>{properties.boil??'—'} °C</dd></div><div><dt>{tx('密度')}</dt><dd>{properties.density??'—'} g/cm³</dd></div><div><dt>{tx('电负性（鲍林标度）')}</dt><dd>{properties.electronegativity??'—'}</dd></div><div><dt>{tx(selected.atomicNumber>=104?'氧化态（含预测）':'参考氧化态')}</dt><dd>{properties.oxidation??'—'}</dd></div></>}<div><dt>{tx('范德华半径')}</dt><dd>{properties?.atomicRadius??'—'} pm</dd></div><div><dt>{tx('第一电离能')}</dt><dd>{properties?.ionization??'—'} eV</dd></div><div><dt>{tx('测量条件')}</dt><dd>{tx(selected.symbol==='C'?'碳在常压下升华；所列熔沸点不能作为常压加热顺序。':selected.symbol==='He'?'氦的熔点需要加压条件，常压下不能这样凝固。':selected.symbol==='As'?'砷在常压下升华；所列熔点约对应 28 个大气压。':'数值随压力、温度与同素异形体而异；详见来源。')}</dd></div>{s?.page&&<div><dt>{tx('原图标注尺寸')}</dt><dd>{s.size}</dd></div>}</dl>:tab==='electrons'?<div className="pm-electrons">{properties?.shells?<>

    <h3>{tx('选择同位素')}</h3><div className="pm-isotopes">{isotopeOptions.map(i=><button key={i.mass} aria-pressed={mass===i.mass} onClick={()=>{interact();setMassChoice(i.mass)}}><sup>{i.mass}</sup>{selected.symbol}</button>)}</div>
    <p>{mass!==null&&<b>{selected.symbol}-{mass} · {mass} − {selected.atomicNumber} = {mass-selected.atomicNumber}</b>}</p><small>{tx('同位素中子数不同；只列参考值，未标稳定性。')}</small>
    <h3>{tx('基态电子排布')}</h3><div className="pm-configuration">{properties.config?.split(/(\d+[spdf]\d+)/g).map((part,i)=>{const orbital=part.match(/^(\d+[spdf])(\d+)$/);return orbital?<span key={i}>{orbital[1]}<sup>{orbital[2]}</sup> </span>:part})??'—'}</div>{properties.configPredicted&&<small>{tx('此电子排布包含理论预测。')}</small>}
    <p>{tx('选择一层，查看其中的电子数。')}</p>
    <div className="pm-shells">{properties.shells.map((count,i)=><button key={i} aria-label={`${tx('电子层')} ${i+1}: ${count}`} aria-pressed={shell===i} onClick={()=>{interact();setShell(shell===i?null:i)}}><span>{i+1}</span><div>{Array.from({length:count},(_,j)=><i key={j}/>)}</div><b>{count}</b></button>)}</div>
    <small>{tx('分层计数示意，非真实轨道；尺寸不按比例。')}</small>
   </>:<p>{tx('暂无已核验电子排布，请查看 RSC 资料。')}</p>}</div>:<div className="pm-copy">{photo&&<><a className="pm-source-photo" href={photo.src} target="_blank" rel="noreferrer"><img src={photo.src} alt={caption}/><span>{tx(reaction?'原创合成示意':illustration?'生成时使用的真实参考照片':'真实照片')} <ArrowUpRight size={14}/></span></a><p>{caption}</p><p>{photo.credit}</p><a href={photo.sourceUrl} target="_blank" rel="noreferrer">{tx(reaction?'合成反应的实验依据':'照片原始来源')} <ArrowUpRight size={14}/></a><p><a href={photo.licenseUrl} target="_blank" rel="noreferrer">{photo.license}</a></p><small>{tx(reaction?'示意图为原创绘制，反应依据来自所链接的实验记录；没有用生成图片冒充元素照片。':illustration?'展示图以这张真实照片作为图像输入生成，保留参考照片的来源与许可。原图仅压缩，未用 AI 重绘。':'原始摄影；界面裁切与缩放，未使用 AI 重绘。')}</small></>}</div>}

    {tab==='source'&&<div className="pm-copy">    {illustration&&<p className="pm-source-caption"><span className="pm-render-badge">{tx('AI 展示图 · 参考真实照片')}</span>{tx(photo&&['observation','apparatus','sample'].includes(photo.kind)?'依据实拍统一版式；实验细节以原图为准。':'外观参考实拍，背景与布光经过生成处理。')}</p>}<p><a href="https://pubchem.ncbi.nlm.nih.gov/periodic-table/" target="_blank" rel="noreferrer">PubChem · {tx('物性与电子排布')}</a></p><p><a href="https://physics.nist.gov/PhysRefData/Compositions/" target="_blank" rel="noreferrer">NIST · {tx('参考同位素')}</a></p><p><a href="https://github.com/SeanWong17/Future-Style-Periodic-Table" target="_blank" rel="noreferrer">Future-Style-Periodic-Table · MIT</a></p></div>}
    {tab==='source'&&<a className="pm-rsc" href={sourceFor(selected)} target="_blank" rel="noreferrer">{tx('阅读元素资料')} · RSC <ArrowUpRight size={14}/></a>}

   </section>
   </div>
   </div>
   {closing&&returnFlight&&!reduced&&<SpecimenReturn flight={returnFlight} onComplete={finishReturn}/>}
   {extracting&&!reduced&&!closing&&<SpecimenReveal skipLabel={locale==='en'?'Click anywhere to skip · Enter':'点击任意位置跳过 · Enter'} discoveryLabel={newDiscovery?(locale==='en'?'NEW DISCOVERY':'新发现'):(locale==='en'?'IN YOUR COLLECTION':'已收藏')} origin={origin.current} target={hero} src={specimenCutouts[selected.symbol]??displayImageFor(selected.symbol)??elementPhotos[selected.symbol].src} symbol={selected.symbol} number={selected.atomicNumber} name={tx(chineseNames[selected.atomicNumber-1])} label={photo?kindLabel(photo.kind):tx('元素档案')} onComplete={()=>setExtracting(false)}/>}
  </div>}
 </div>
}
