import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from '@phosphor-icons/react'
import { useExperienceI18n } from '~/i18n/experience'
import { CANDLE_REGIONS, FRAME, type CandleRegion } from './model'
import { CandleStage } from './CandleStage'
export default function CandleScene({ onInteract }: {onInteract():void}) {
  const tx=useExperienceI18n(),[region,setRegion]=useState<CandleRegion>('whole'),[micro,setMicro]=useState(false),[paused,setPaused]=useState(false),[ready,setReady]=useState(false),[failed,setFailed]=useState(false)
  const stage=useRef<HTMLDivElement>(null),[size,setSize]=useState({w:0,h:0})
  const data=CANDLE_REGIONS.find(r=>r.id===region)!
  const pins=[...CANDLE_REGIONS.slice(1)].sort((a,b)=>b.y-a.y)
  useEffect(()=>{const ro=new ResizeObserver(([e])=>setSize({w:e.contentRect.width,h:e.contentRect.height}));ro.observe(stage.current!);return()=>ro.disconnect()},[])
  const select=(id:CandleRegion)=>{onInteract();setMicro(false);setRegion(id)}
  const project=(x:number,y:number)=>({x:size.w/2+x/FRAME.scale*size.h,y:size.h/2-(y-FRAME.offset)/FRAME.scale*size.h})
  return <div className="cf-world cf-candle" data-ready={ready} data-microgravity={micro}>
    <header className="cf-heading"><h1>{tx('蜡烛')}</h1><p>{tx('层流烛火，放大观察')}</p></header>
    <p className="cf-candle-disclosure">{tx(micro?'示意，依据 NASA 实验观察':'示意，不是模拟')}</p>
    <div className="cf-candle-stage" ref={stage}><CandleStage gravity={micro?0:1} peel={!micro&&region!=='whole'?1:0} focus={data.focus} transport={region==='core'||region==='outer'||micro} paused={paused} label={tx('烛火光学示意：点选焰心、内焰和外焰')} onReady={()=>setReady(true)} onError={()=>setFailed(true)}/>
      {!micro&&ready&&region!=='whole'&&<div className="cf-candle-pins"><svg aria-hidden="true">{pins.map((r,i)=>{const p=project(r.x,r.y),x=Math.min(size.w-100,size.w/2+70),y=project(0,1.15-i*.45).y;return <path key={r.id} d={`M${p.x} ${p.y} L${x} ${y+18}`}/>})}</svg>{pins.map((r,i)=>{const x=Math.min(size.w-100,size.w/2+70),y=project(0,1.15-i*.45).y;return <button key={r.id} style={{left:x,top:y}} aria-pressed={region===r.id} onClick={()=>select(r.id)}>{tx(r.label)}</button>})}</div>}
      {failed&&<p className="cf-candle-error">{tx('当前设备无法绘制烛火，仍可阅读各层说明。')}</p>}
    </div>
    <aside className="cf-candle-copy" data-experience-overlay="true">
      <nav className="cf-candle-tabs" aria-label={tx('烛火的各层')}>{CANDLE_REGIONS.map(r=><button key={r.id} aria-pressed={!micro&&region===r.id} onClick={()=>select(r.id)}>{tx(r.label)}</button>)}</nav>
      <h2>{tx(micro?'没有浮力，烛火变成蓝色圆顶':data.title)}</h2>
      <p>{tx(micro?'静止空气中的微重力烛火主要靠分子扩散补氧。这里依据实验做示意；篝火模型未算这种扩散。':data.body)}</p>
      <p className="cf-candle-fact">{tx(micro?'微重力形态是示意，不是篝火模型的计算结果':data.fact)}</p>
      {region!=='whole'&&!micro&&<small>{tx('冷热关系是定性解释，不提供模拟温度读数。')}</small>}
      <div className="cf-candle-actions"><button aria-pressed={micro} onClick={()=>{onInteract();setMicro(!micro);setRegion('whole')}}>{tx(micro?'回到地球':'看微重力')}</button><button aria-label={tx(paused?'播放烛火':'暂停烛火')} onClick={()=>{onInteract();setPaused(!paused)}}>{paused?<Play size={17}/>:<Pause size={17}/>}</button></div>
      {micro?<a href="https://www.nasa.gov/image-article/candle-flame-1g-vs-microgravity/" target="_blank" rel="noreferrer">{tx('NASA：查看真实实验图')} ↗</a>:<details><summary>{tx('蜡消失后，去了哪里？')}</summary><p>{tx('碳、氢与氧重组为二氧化碳和水。这里举甲烷的例子，蜡分子更复杂：')}</p><p className="cf-candle-equation">CH₄ + 2 O₂ → CO₂ + 2 H₂O</p><p>{tx('原子账本：碳 1=1，氢 4=4，氧 4=4。')}</p><p>{tx('断键需要能量，成键释放能量。整个燃烧反应释放得更多，能量差成为热。')}</p><p>{tx('高温下H、O、OH参与反应接力；传播、分支和终止决定燃烧能否继续。')}</p></details>}
    </aside>
    <p className="cf-candle-reference">{tx('文献蜡烛：77±9 W · 高42±1 mm，非本画面实测。')} <a href="https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=101159" target="_blank" rel="noreferrer">NIST ↗</a></p>
  </div>
}
