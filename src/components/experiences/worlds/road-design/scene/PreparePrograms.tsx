import { preparePrograms } from './prepare-programs'
import { useContext, useLayoutEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { EffectComposerContext } from '@react-three/postprocessing'

/** Let the driver link new materials asynchronously before their first draw.
 * Keep the last composited frame while preparing; controls/model keep ticking.
 * The target must match the composer's linear offscreen buffer, otherwise Three
 * would compile a different output-colour-space variant on the first draw. */
export function PreparePrograms({version}:{version:string}) {
  const {composer,scene,camera}=useContext(EffectComposerContext)
  const gl=useThree(state=>state.gl)
  const state=useMemo(()=>({started:false,ready:false,disposed:false,cancel:undefined as (()=>void)|undefined}),[composer,version])
  useLayoutEffect(()=>{
    const render=composer.render
    composer.render=function(delta){if(state.ready)render.call(composer,delta)}
    return ()=>{state.disposed=true;state.cancel?.();composer.render=render}
  },[composer,state])
  // DisplayStretch installs its material hooks at -1. EffectComposer draws at 1.
  useFrame(()=>{
    if(state.started)return
    state.started=true
    const previous=gl.getRenderTarget()
    gl.setRenderTarget(composer.inputBuffer)
    try { state.cancel=preparePrograms(gl,scene,camera,()=>{if(!state.disposed)state.ready=true}) }
    finally {gl.setRenderTarget(previous)}
  },.5)
  return null
}
