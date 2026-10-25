import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { WorkerTrafficRuntime } from './worker-runtime'

interface FrameTiming { time:number; mainMs:number; submitMs:number; gpuMs:number|null; calls:number; triangles:number; textures:number; geometries:number; programs:number; postPixels:[number,number]; dpr:number; vehicles:number; stepMs:number; revision:number; pendingSimSeconds:number }
/** Opt-in diagnostics only (?profile=1), not part of the scored RAF benchmark.
 * GPU query completion is polled asynchronously; never readPixels/gl.finish. */
export function RenderProbe({runtime}:{runtime:WorkerTrafficRuntime}) {
  const renderer=useThree(state=>state.gl)
  const state=useMemo(()=>{
    const gl=renderer.getContext() as WebGL2RenderingContext
    const ext=gl.getExtension('EXT_disjoint_timer_query_webgl2')
    return {gl,ext,queries:[] as WebGLQuery[],active:null as WebGLQuery|null,start:0,submit:0,gpu:null as number|null,frames:[] as FrameTiming[]}
  },[renderer])
  useEffect(()=>{
    const original=renderer.render,autoReset=renderer.info.autoReset
    renderer.info.autoReset=false
    renderer.render=function(scene,camera){
      if(state.ext&&!state.active&&state.queries.length<6){state.active=state.gl.createQuery();state.gl.beginQuery(state.ext.TIME_ELAPSED_EXT,state.active!)}
      const start=performance.now();original.call(renderer,scene,camera);state.submit+=performance.now()-start
    }
    const target=window as unknown as {__roadPerf:FrameTiming[]};target.__roadPerf=state.frames
    return ()=>{renderer.render=original;renderer.info.autoReset=autoReset;for(const q of state.queries)state.gl.deleteQuery(q)}
  },[renderer,state])
  useFrame(()=>{state.start=performance.now();state.submit=0;renderer.info.reset()},-100)
  useFrame(()=>{
    if(state.active){state.gl.endQuery(state.ext.TIME_ELAPSED_EXT);state.queries.push(state.active);state.active=null}
    const query=state.queries[0]
    if(query&&state.gl.getQueryParameter(query,state.gl.QUERY_RESULT_AVAILABLE)){
      if(!state.gl.getParameter(state.ext.GPU_DISJOINT_EXT))state.gpu=state.gl.getQueryParameter(query,state.gl.QUERY_RESULT)/1e6
      state.gl.deleteQuery(query);state.queries.shift()
    }
    state.frames.push({time:performance.now(),mainMs:performance.now()-state.start,submitMs:state.submit,gpuMs:state.gpu,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries,programs:renderer.info.programs?.length??0,postPixels:[Number(renderer.domElement.dataset.postWidth),Number(renderer.domElement.dataset.postHeight)],dpr:renderer.getPixelRatio(),vehicles:runtime.simulation.vehicles.length,stepMs:runtime.stepMs,revision:runtime.revision,pendingSimSeconds:runtime.pendingSimSeconds})
    if(state.frames.length>1200)state.frames.splice(0,600)
  },2)
  return null
}
