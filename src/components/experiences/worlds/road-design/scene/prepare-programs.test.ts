import {expect,it,vi} from 'vitest'
import {Camera,MeshBasicMaterial,Scene,type WebGLRenderer} from 'three'
import {preparePrograms} from './prepare-programs'
it('a disposed route material cannot strand shader preparation',()=>{
 vi.useFakeTimers()
 const material=new MeshBasicMaterial(),ready=vi.fn(),properties=new Map([[material,{currentProgram:{isReady:()=>false}}]])
 const renderer={compile:()=>new Set([material]),properties:{get:(m:MeshBasicMaterial)=>properties.get(m)??{}}} as unknown as WebGLRenderer
 preparePrograms(renderer,new Scene(),new Camera(),ready)
 material.dispose();properties.delete(material);vi.advanceTimersByTime(15)
 expect(ready).toHaveBeenCalledOnce();vi.useRealTimers()
})
it('a superseded scene cancels readiness and removes its timer',()=>{
 vi.useFakeTimers()
 const material=new MeshBasicMaterial(),ready=vi.fn()
 const renderer={compile:()=>new Set([material]),properties:{get:()=>({currentProgram:{isReady:()=>false}})}} as unknown as WebGLRenderer
 const cancel=preparePrograms(renderer,new Scene(),new Camera(),ready)
 cancel();vi.advanceTimersByTime(30);expect(ready).not.toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0);vi.useRealTimers()
})
