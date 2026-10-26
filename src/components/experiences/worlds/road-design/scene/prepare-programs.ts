import type { Camera, Material, Scene, WebGLRenderer } from 'three'

/** Three r183's compileAsync polls currentProgram after a timeout without a
 * disposal guard. Selecting a route can unmount its entry-arrow materials
 * during that interval. Watch their lifetime and cancel on scene replacement. */
export function preparePrograms(renderer:WebGLRenderer,scene:Scene,camera:Camera,onReady:()=>void):()=>void {
  const pending=renderer.compile(scene,camera)
  const listeners=new Map<Material,()=>void>()
  let timer:ReturnType<typeof setTimeout>|undefined,cancelled=false
  const cleanup=()=>{if(timer)clearTimeout(timer);for(const [m,fn] of listeners)m.removeEventListener('dispose',fn);listeners.clear()}
  for(const m of pending){const dispose=()=>pending.delete(m);m.addEventListener('dispose',dispose);listeners.set(m,dispose)}
  const check=()=>{
    if(cancelled)return
    for(const material of pending){
      const properties=renderer.properties.get(material) as {currentProgram?:{isReady:()=>boolean}}
      const program=properties.currentProgram
      if(!program||program.isReady())pending.delete(material)
    }
    if(pending.size===0){cleanup();onReady()}else timer=setTimeout(check,10)
  }
  check()
  return()=>{cancelled=true;cleanup()}
}
