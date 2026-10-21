import {elementPlayText} from './element-play-text'
import {useState,type ReactNode} from 'react'
import {ArrowRight,ArrowUpRight,Check,Lightbulb,MagnifyingGlass} from '@phosphor-icons/react'
import {useI18n} from '~/i18n'
import {useExperienceI18n} from '~/i18n/experience'
import {elements,chineseNames,type Element} from './element-model'
import {elementMysteries} from './element-mysteries'

export function ElementDetective({picture,onChoose,onInteract}:{picture:(e:Element)=>ReactNode;onChoose:(e:Element,node:HTMLButtonElement)=>void;onInteract:()=>void}) {
 const tx=useExperienceI18n()
 const {locale}=useI18n()
 const words=elementPlayText[locale==='en'?'en':'zh']
 const [index,setIndex]=useState(0),[attempts,setAttempts]=useState<string[]>([]),[hint,setHint]=useState(false)
 const [solved,setSolved]=useState<Set<number>>(()=>new Set())
 const mystery=elementMysteries[index],revealed=solved.has(index)
 const next=()=>{onInteract();setIndex((index+1)%elementMysteries.length);setAttempts([]);setHint(false)}
 return <section className="pm-detective" aria-label={tx('元素侦探')}>
  <header><span><MagnifyingGlass size={16}/>{words.detectiveIntro}</span><small>{words.solved} {solved.size} / {elementMysteries.length}</small></header>
  <div className="pm-mystery-question"><span>{String(index+1).padStart(2,'0')} / {String(elementMysteries.length).padStart(2,'0')}</span><h2>{locale==='en'?mystery.titleEn:mystery.title}</h2><p>{words.pickPrompt}</p></div>
  <div className="pm-mystery-specimens" key={index}>{mystery.choices.map(symbol=>{
   const e=elements.find(e=>e.symbol===symbol)!,correct=revealed&&symbol===mystery.symbol,miss=attempts.includes(symbol)&&!correct
   return <button key={symbol} data-element={symbol} data-correct={correct} data-miss={miss} disabled={miss||(revealed&&!correct)} aria-label={`${tx(correct?'取出观察':words.choose)} ${tx(chineseNames[e.atomicNumber-1])}`} onClick={event=>{
    if(correct){onChoose(e,event.currentTarget);return}
    onInteract()
    if(symbol===mystery.symbol)setSolved(current=>new Set([...current,index]))
    else {setAttempts(current=>[...current,symbol]);setHint(true)}
   }}><span className="pm-mystery-number">{String(e.atomicNumber).padStart(3,'0')}</span><div className="pm-mystery-image">{picture(e)}</div><span className="pm-mystery-name"><b>{symbol}</b>{tx(chineseNames[e.atomicNumber-1])}</span><span className="pm-mystery-pick">{correct?<><Check size={15}/>{tx('取出观察')}<ArrowUpRight size={15}/></>:miss?words.tryAnother:words.isThisIt}</span></button>
  })}</div>
  <div className="pm-mystery-feedback" aria-live="polite">{revealed?<><strong><Check size={16}/>{words.found}</strong><p>{locale==='en'?mystery.revealEn:mystery.reveal}</p></>:hint?<p>{locale==='en'?mystery.hintEn:mystery.hint}</p>:<p>{words.startWithClue}</p>}</div>
  <footer><button onClick={()=>{onInteract();setHint(!hint)}} disabled={revealed}><Lightbulb size={16}/>{tx(hint?words.hideHint:words.showHint)}</button><button onClick={next}>{tx(revealed?words.nextClue:words.changeClue)}<ArrowRight size={16}/></button></footer>
 </section>
}
