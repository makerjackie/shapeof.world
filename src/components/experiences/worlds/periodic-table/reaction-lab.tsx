import {elementPlayText} from './element-play-text'
import {useEffect,useId,useRef,useState,type CSSProperties} from 'react'
import {ArrowClockwise,ArrowUpRight,Play,Pause,Check,Sparkle} from '@phosphor-icons/react'
import {useI18n} from '~/i18n'
import {useExperienceI18n} from '~/i18n/experience'
import {experimentsFor,experimentText,clampProgress,type ExhibitEffect} from './reaction-model'
import {drawReactionScene} from './reaction-scene'
import {useReactionPlayback} from './reaction-playback'
import {reactionPresentation} from './reaction-presentation'

export function ReactionLab({symbol,reduced,onInteract,onDiscovery,discoveries,active=true}:{symbol:string;reduced:boolean;active?:boolean;onInteract:()=>void;onDiscovery:(id:string)=>void;discoveries:ReadonlySet<string>}){
 const {locale}=useI18n()
 const words=elementPlayText[locale==='en'?'en':'zh']
 const tx=useExperienceI18n(),experiments=experimentsFor(symbol)
 const [visible,setVisible]=useState(true)
 const [choice,setChoice]=useState(experiments[0]?.id??''),[guess,setGuess]=useState<ExhibitEffect|null>(null)
 const canvas=useRef<HTMLCanvasElement>(null),stage=useRef<HTMLDivElement>(null),id=useId()
 const experiment=experiments.find(e=>e.id===choice)??experiments[0]
 const playback=useReactionPlayback(choice,reduced,onDiscovery,active&&visible)
 const {progress,running,started}=playback,finished=progress===1
 const beat=!started?'ready':progress<.2?'contact':progress<.85?'change':'result'
 const render=useRef(()=>{})
 render.current=()=>{const c=canvas.current;if(!c||!experiment)return;const ctx=c.getContext('2d');if(!ctx)return;const box=c.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);const w=Math.round(box.width*dpr),h=Math.round(box.height*dpr);if(c.width!==w||c.height!==h){c.width=w;c.height=h}ctx.setTransform(dpr,0,0,dpr,0,0);drawReactionScene(ctx,box.width,box.height,experiment,progress,symbol)}
 useEffect(()=>{render.current()},[progress,experiment,symbol])
 useEffect(()=>{const c=canvas.current;if(!c)return;const ro=new ResizeObserver(()=>render.current());ro.observe(c);const io=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting));io.observe(c);return()=>{ro.disconnect();io.disconnect()}},[])
 if(!experiment)return null
 const presentation=reactionPresentation(experiment,locale)
 const start=()=>{onInteract();playback.play();requestAnimationFrame(()=>stage.current?.scrollIntoView({block:'start',behavior:reduced?'instant':'smooth'}))}
 const predictions:Record<ExhibitEffect,string>={bubbles:words.bubbles,deposit:words.deposit,oxide:words.oxide,burn:words.burn,melt:words.melt,glow:words.glow,still:words.still,decay:words.decay}
 const alternatives:Record<ExhibitEffect,ExhibitEffect[]>={bubbles:['still','bubbles','melt'],deposit:['deposit','still','bubbles'],oxide:['melt','oxide','still'],burn:['still','melt','burn'],melt:['bubbles','melt','still'],glow:['burn','still','glow'],still:['bubbles','deposit','still'],decay:['still','decay','glow']}
 const count=experiments.filter(e=>discoveries.has(e.id)).length
 return <section className="pm-lab" data-running={running} data-beat={beat} data-effect={experiment.effect} style={{'--reaction-color':presentation.color} as CSSProperties} aria-labelledby={`${id}-title`}>
  <div className="pm-lab-heading"><span><Sparkle size={16}/>{tx('变化实验')}</span><small>{count} / {experiments.length} {locale==='en'?'recorded':'已记录'}</small></div>
  <h3 id={`${id}-title`}>{locale==='en'?'What will you combine it with?':'让它遇见什么？'}</h3>
  <div className="pm-lab-partners" role="group" aria-label={tx('选择实验条件')}>{experiments.map(e=>{const card=reactionPresentation(e,locale);return <button key={e.id} aria-pressed={experiment.id===e.id} onClick={()=>{onInteract();setChoice(e.id);setGuess(null);playback.reset()}} style={{'--partner-color':card.color} as CSSProperties}><span className="pm-partner-glyph">{card.glyph}</span><span>{experimentText(e,'partner',locale)}</span>{discoveries.has(e.id)?<Check size={14}/>:<Play size={12} weight="fill"/>}</button>})}</div>
  <details className="pm-prediction"><summary>{words.predictionTitle}</summary><div role="group" aria-label={words.predictionLabel}>{alternatives[experiment.effect].map(effect=><button key={effect} aria-pressed={guess===effect} disabled={started} onClick={()=>{onInteract();setGuess(effect)}}>{tx(predictions[effect])}</button>)}</div><small>{words.predictionNote}</small></details>
  <div ref={stage} className="pm-lab-observation"><div className="pm-lab-stage" style={{'--reaction-progress':progress,'--reaction-contact':Math.min(1,progress/.22)} as CSSProperties}>
   <div className="pm-lab-stage-caption"><span>{presentation.kind}</span><small>{locale==='en'?'ILLUSTRATIVE · TIME COMPRESSED':'示意演出 · 时间压缩'}</small></div>
   <div className="pm-lab-combination" aria-hidden="true"><b>{symbol}</b><span>+</span><b>{presentation.glyph}</b></div>
   <canvas ref={canvas} aria-label={experimentText(experiment,'title',locale)} role="img"/>

   <div className="pm-lab-cue" key={`${choice}-${beat}-cue`}>{beat==='ready'?<small>{locale==='en'?'Choose a condition, then start':'选好条件，开始实验'}</small>:beat==='contact'?<small>{locale==='en'?'Making contact…':'条件正在加入…'}</small>:<strong>{presentation.cue}</strong>}</div>
   <div className="pm-lab-timeline" aria-hidden="true"><i/></div>
  </div>
  <p className="pm-lab-condition">{experimentText(experiment,'condition',locale)}</p>
  <div className="pm-lab-playback">
   <button aria-label={tx(running?words.pause:finished?'再看一次':started?words.continue:'开始实验')} onClick={()=>{if(running){onInteract();playback.pause()}else start()}}>{running?<Pause size={16}/>:finished?<ArrowClockwise size={16}/>:<Play size={16} weight="fill"/>}{tx(running?words.pause:finished?'再看一次':started?words.continue:'开始实验')}</button>
   <label><span>{words.scrub}</span><input type="range" min="0" max="1000" step="1" value={Math.round(progress*1000)} aria-label={words.progress} aria-valuetext={`${Math.round(progress*100)}%`} onChange={event=>{onInteract();playback.seek(clampProgress(Number(event.target.value)/1000))}}/></label>
   <output>{Math.round(progress*100)}%</output>
  </div>
  </div>
  <p className="pm-lab-replay-note">{words.replayNote}</p>
  <p className="pm-lab-replay-note">{tx('屏幕中的演示，请勿据此操作真实试剂。')}</p>
  <div className={`pm-lab-result${finished?' is-visible':''}`} aria-live="polite">{finished&&<>{guess&&<p className="pm-prediction-answer">{tx(guess===experiment.effect?words.predictionCorrect:words.predictionDifferent)}</p>}<span className="pm-result-seal"><Check size={14}/>{locale==='en'?'Observation recorded':'现象已记录'}</span><b>{experimentText(experiment,'result',locale)}</b>{experiment.equation!=='—'&&<div className="pm-lab-equation">{experiment.equation.includes('光')?experiment.equation.replace('光',tx('光')):experiment.equation}</div>}<p>{experimentText(experiment,'explanation',locale)}</p><a href={experiment.source} target="_blank" rel="noreferrer">{tx('查看现象依据')} <ArrowUpRight size={13}/></a></>}</div>
 </section>
}
