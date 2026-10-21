import {useEffect,useRef,useState,type CSSProperties} from 'react'
import {Pause,Play,ArrowCounterClockwise} from '@phosphor-icons/react'
import type {ExperienceControls} from '~/components/ExperienceShell'
import {useExperienceI18n} from '~/i18n/experience'
import {CHAPTERS,FILM_SECONDS,chapterAt} from './model'
import {drawScene} from './scene'
import './styles/RiemannPrimes.css'
export function RiemannPrimes({controls}:{controls:ExperienceControls}){
 const tx=useExperienceI18n(),canvas=useRef<HTMLCanvasElement>(null),copy=useRef<HTMLElement>(null)
 const frame=useRef({time:0,playing:true}),[time,setTime]=useState(0),[playing,setPlaying]=useState(true)
 const titles=[tx('素数，藏着怎样的节奏？'),tx('每一级台阶，都有来处。'),tx('零点，竟能拼回素数的起伏。'),tx('无穷多个零点，会都在这条线上吗？')]
 const bodies=[tx('2、3、5、7、11……只能被 1 和自身整除的数，间距忽远忽近。'),tx('遇到素数 p 或它的幂，就抬高 ln p。金色阶梯减去平滑趋势，留下了起伏。'),tx('每加入一对零点，就多一层波。前 20 对零点已能描出部分细节，边缘仍有截断误差。'),tx('黎曼猜想：ζ 函数的所有非平凡零点，实部都等于 1/2。图中只有前 20 个正虚部零点。')]
 const captions=[tx('素数被点亮 · 螺旋只是排布方式'),tx('加权计数 ψ(x) − x · 包含素数幂'),tx('金色：实际起伏　紫色：有限零点近似'),tx('有限核验不能代替对无穷的证明')]
 const labels=[tx('素数'),tx('起伏'),tx('零点'),tx('猜想')]
 function seek(t:number){controls.registerInteraction();frame.current.time=t;frame.current.playing=false;setTime(t);setPlaying(false)}
 function toggle(){controls.registerInteraction();const s=frame.current;if(s.time>=FILM_SECONDS)s.time=0;s.playing=!s.playing;setPlaying(s.playing);setTime(s.time)}
 function replay(){controls.registerInteraction();frame.current={time:0,playing:true};setTime(0);setPlaying(true)}
 useEffect(()=>{
  const c=canvas.current,ctx=c?.getContext('2d');if(!c||!ctx)return
  const media=matchMedia('(prefers-reduced-motion: reduce)');const motion=()=>{if(media.matches){frame.current.playing=false;setPlaying(false)}};motion();media.addEventListener('change',motion)
  let raf=0,last=performance.now(),ui=0,signature=''
  const draw=(now:number)=>{const dt=Math.max(0,Math.min(.05,(now-last)/1000));last=now;const s=frame.current
   if(!document.hidden){if(s.playing){s.time=Math.min(FILM_SECONDS,s.time+dt);if(s.time===FILM_SECONDS){s.playing=false;setPlaying(false)}}
    const rect=c.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1),immersive=!!c.closest('[data-overlays-hidden="true"]'),bottom=(copy.current?.getBoundingClientRect().bottom??0)-rect.top
    const key=[s.time,rect.width,rect.height,bottom,immersive].join(':');if(signature!==key){if(c.width!==Math.round(rect.width*dpr)||c.height!==Math.round(rect.height*dpr)){c.width=Math.round(rect.width*dpr);c.height=Math.round(rect.height*dpr)}ctx.setTransform(dpr,0,0,dpr,0,0);drawScene(ctx,rect.width,rect.height,s.time,immersive,bottom);signature=key}
    if(now-ui>90){setTime(s.time);ui=now}}
   raf=requestAnimationFrame(draw)
  };raf=requestAnimationFrame(draw);return()=>{cancelAnimationFrame(raf);media.removeEventListener('change',motion)}
 },[])
 const act=chapterAt(time)
 return <div className="rp-world" data-act={act} data-playing={playing}>
  <canvas ref={canvas} aria-label={tx('素数光珠展开成加权计数阶梯，零点波形与它叠合，最后显现临界线。')}/>
  <article ref={copy} className="rp-copy" data-experience-overlay="true"><span>{tx('黎曼猜想')}</span><h2>{titles[act]}</h2><p>{bodies[act]}</p></article>
  <div className="rp-caption" data-experience-overlay="true">{captions[act]}</div>
  <nav className="rp-film" aria-label={tx('短片播放控制')} data-experience-overlay="true">
   <div className="rp-chapters">{labels.map((label,i)=><button key={label} aria-current={act===i?'step':undefined} onClick={()=>seek(CHAPTERS[i])}>{label}</button>)}</div>
   <div className="rp-transport"><button onClick={toggle} aria-label={playing?tx('暂停短片'):tx('播放短片')}>{playing?<Pause size={18}/>:<Play size={18}/>}</button><input aria-label={tx('叙事时间轴')} type="range" min="0" max={FILM_SECONDS} step=".05" value={time} style={{'--rp-progress':`${time/FILM_SECONDS*100}%`} as CSSProperties} onChange={e=>seek(Number(e.target.value))}/><span>{Math.floor(time).toString().padStart(2,'0')} / 64</span><button onClick={replay} aria-label={tx('重播短片')}><ArrowCounterClockwise size={18}/></button></div>
  </nav>
 </div>
}
