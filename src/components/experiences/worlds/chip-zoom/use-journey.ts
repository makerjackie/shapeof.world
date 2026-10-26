import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { clampScale, SCALES, STAGES, type Stage } from './scale-model'
export function useJourney(initial:Stage, element:RefObject<HTMLDivElement|null>, interact:()=>void) {
 const [scale,setScale]=useState(SCALES[STAGES.findIndex(s=>s.id===initial)]),[flying,setFlying]=useState(false)
 const current=useRef(scale),flight=useRef(0)
 const set=useCallback((s:number)=>{current.current=clampScale(s);setScale(current.current)},[])
 const stop=useCallback(()=>{cancelAnimationFrame(flight.current);setFlying(false)},[])
 const fly=useCallback((stage:Stage)=>{
  stop();interact()
  const to=SCALES[STAGES.findIndex(s=>s.id===stage)],from=current.current,start=performance.now()
  const duration=window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:Math.min(2400,900+Math.abs(to-from)*360)
  if(!duration){set(to);return}
  setFlying(true)
  const tick=(now:number)=>{const t=Math.min(1,(now-start)/duration),e=t*t*(3-2*t);set(from+(to-from)*e);if(t<1)flight.current=requestAnimationFrame(tick);else setFlying(false)}
  flight.current=requestAnimationFrame(tick)
 },[interact,set,stop])
 const scrub=useCallback((s:number)=>{stop();interact();set(s)},[set,stop,interact])
 useEffect(()=>{
  const el=element.current;if(!el)return
  let pinch:{distance:number;scale:number}|null=null
  const wheel=(e:WheelEvent)=>{e.preventDefault();stop();interact();set(current.current-e.deltaY*.0012)}
  const distance=(e:TouchEvent)=>Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY)
  const start=(e:TouchEvent)=>{if(e.touches.length===2){e.preventDefault();e.stopPropagation();stop();interact();pinch={distance:distance(e),scale:current.current}}}
  const move=(e:TouchEvent)=>{if(e.touches.length===2&&pinch){e.preventDefault();e.stopPropagation();set(pinch.scale-Math.log10(distance(e)/pinch.distance)*2)}}
  const end=()=>{pinch=null}
  el.addEventListener('wheel',wheel,{passive:false});el.addEventListener('touchstart',start,{passive:false,capture:true});el.addEventListener('touchmove',move,{passive:false,capture:true});el.addEventListener('touchend',end,true)
  return()=>{el.removeEventListener('wheel',wheel);el.removeEventListener('touchstart',start,true);el.removeEventListener('touchmove',move,true);el.removeEventListener('touchend',end,true)}
 },[element,interact,set,stop])
 useEffect(()=>()=>cancelAnimationFrame(flight.current),[])
 return {scale,flying,fly,scrub}
}
