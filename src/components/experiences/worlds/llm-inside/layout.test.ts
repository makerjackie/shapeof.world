import {describe,it,expect} from 'vitest'
import {PerspectiveCamera,Vector3} from 'three'
import {SCENE_FRAMES,SCENE_ITEMS,contextHead,sceneCamera,phasePosition,phaseLayer,attentionRowZ,type View} from './layout'
describe('readable numerical exhibit layout',()=>{
 it('fits every view in wide, square and narrow actual camera frusta',()=>{
  for(const view of Object.keys(SCENE_FRAMES) as View[])for(const aspect of [.35,.65,1,1.8,2.8]){
   const {position,target}=sceneCamera(view,aspect),camera=new PerspectiveCamera(34,aspect,.05,400),frame=SCENE_FRAMES[view];camera.position.set(...position);camera.lookAt(new Vector3(...target));camera.updateMatrixWorld();
   for(const frame of SCENE_ITEMS[view])for(const x of [frame.min[0],frame.max[0]])for(const y of [frame.min[1],frame.max[1]])for(const z of [frame.min[2],frame.max[2]]){const point=new Vector3(x,y,z).project(camera);expect(Math.abs(point.x)).toBeLessThan(.97);expect(Math.abs(point.y)).toBeLessThan(.97);expect(point.z).toBeLessThan(1)}
  }
 })
 it('places the display marker at the actual selected stage, including manual output steps',()=>{
  const ys=Array.from({length:22},(_,i)=>phasePosition(i));expect(ys[0]).toBe(-11.3);expect(ys[2]).toBeCloseTo(-7.15);expect(ys[8]).toBeCloseTo(-.85);expect(ys[14]).toBeCloseTo(5.45);expect(ys[21]).toBe(11.7);expect(ys.every((y,i)=>i===0||y>ys[i-1])).toBe(true);expect(phasePosition(NaN)).toBe(ys[0]);expect(phaseLayer(0)).toBe(-1);expect(phaseLayer(18)).toBe(2)
 })
 it('keeps each displayed head output matched to its actual concatenated feature columns',()=>{const source={shape:[2,48],data:Float32Array.from({length:96},(_,i)=>i<48?i:i+52)};const h=contextHead(source,2);expect(h.shape).toEqual([2,16]);expect(Array.from(h.data.slice(0,16))).toEqual(Array.from({length:16},(_,i)=>i+32));expect(Array.from(h.data.slice(16))).toEqual(Array.from({length:16},(_,i)=>i+132))})
 it('aligns attention links with the visible query and value row centres',()=>{for(const n of[6,11]){expect(attentionRowZ(0,n,3.4,-3)).toBeCloseTo(-3-1.7+1.7/n);expect(attentionRowZ(n-1,n,3.4,-3)).toBeCloseTo(-3+1.7-1.7/n);expect(attentionRowZ(99,n,3.4,-3)).toBe(attentionRowZ(n-1,n,3.4,-3))}})
})
