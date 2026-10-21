import {act,createElement} from 'react'
import {createRoot} from 'react-dom/client'
import {afterEach,expect,it,vi} from 'vitest'
import {advanceReaction,useReactionPlayback} from './reaction-playback'

afterEach(()=>vi.unstubAllGlobals())
it('bounds elapsed presentation time so a hidden tab cannot skip the experiment',()=>{
 expect(advanceReaction(.5,420000)).toBeCloseTo(.5+100/4200)
 expect(advanceReaction(.5,-100)).toBe(.5)
 expect(advanceReaction(.999,100)).toBe(1)
})
it('pauses, seeks, resumes and records completion once without restarting on parent updates',()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true)
 let frame:FrameRequestCallback|undefined
 vi.stubGlobal('requestAnimationFrame',(cb:FrameRequestCallback)=>{frame=cb;return 1})
 vi.stubGlobal('cancelAnimationFrame',()=>{frame=undefined})
 const host=document.createElement('div'),root=createRoot(host),discover=vi.fn()
 let player:ReturnType<typeof useReactionPlayback>
 function Harness({id='Ga-warm',reduced=false}:{id?:string;reduced?:boolean}){player=useReactionPlayback(id,reduced,discover);return null}
 const tick=(now:number)=>act(()=>{const cb=frame;frame=undefined;cb?.(now)})
 try {
  act(()=>root.render(createElement(Harness)))
  act(()=>player.play());tick(0);tick(100)
  expect(player!.progress).toBeGreaterThan(0)
  act(()=>player.pause());const paused=player!.progress;tick(200)
  expect(player!.progress).toBe(paused)
  act(()=>player.seek(.6));expect(player!.progress).toBe(.6)
  act(()=>root.render(createElement(Harness)));expect(player!.progress).toBe(.6)
  act(()=>player.play());tick(300);tick(400);expect(player!.progress).toBeGreaterThan(.6)
  act(()=>player.seek(1));expect(discover).toHaveBeenCalledExactlyOnceWith('Ga-warm')
  act(()=>player.seek(.8));act(()=>player.seek(1));expect(discover).toHaveBeenCalledTimes(1)
  act(()=>{player.reset();root.render(createElement(Harness,{id:'Ne-power',reduced:true}))})
  expect(player!.progress).toBe(0);expect(player!.started).toBe(false)
  act(()=>player.play());tick(500)
  expect(player!.progress).toBe(1);expect(player!.running).toBe(false)
  expect(discover).toHaveBeenLastCalledWith('Ne-power')
 }finally{act(()=>root.unmount())}
})
