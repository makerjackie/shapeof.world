import {useEffect,useRef,useState} from 'react'
import {clampProgress} from './reaction-model'

/** Presentation time, never a claim about physical reaction kinetics. */
export function advanceReaction(progress:number,elapsedMs:number) {
 return clampProgress(progress+Math.max(0,Math.min(elapsedMs,100))/4200)
}
export function useReactionPlayback(experimentId:string,reduced:boolean,onDiscovery:(id:string)=>void,active=true) {
 const [progress,setProgress]=useState(0),[running,setRunning]=useState(false),[started,setStarted]=useState(false)
 const position=useRef(0),completed=useRef(false),discovery=useRef(onDiscovery)
 useEffect(()=>{discovery.current=onDiscovery},[onDiscovery])
 const update=(value:number)=>{position.current=value;setProgress(value)}
 const reset=()=>{update(0);setRunning(false);setStarted(false);completed.current=false}
 useEffect(()=>{
  if(!running||!active)return
  let frame=0,previous:number|undefined
  const tick=(now:number)=>{
   frame=0
   if(document.hidden)return
   const next=reduced?1:advanceReaction(position.current,previous===undefined?0:now-previous)
   previous=now;position.current=next;setProgress(next)
   if(next<1)frame=requestAnimationFrame(tick)
   else setRunning(false)
  }
  const visibility=()=>{cancelAnimationFrame(frame);frame=0;previous=undefined;if(!document.hidden)frame=requestAnimationFrame(tick)}
  frame=requestAnimationFrame(tick);document.addEventListener('visibilitychange',visibility)
  return()=>{cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',visibility)}
 },[running,reduced,experimentId,active])
 useEffect(()=>{if(started&&progress===1&&!completed.current){completed.current=true;discovery.current(experimentId)}},[progress,started,experimentId])
 return {progress,running,started,reset,pause:()=>setRunning(false),seek:(value:number)=>{setRunning(false);setStarted(true);update(clampProgress(value))},play:()=>{if(position.current===1)update(0);setStarted(true);setRunning(true)}}
}
