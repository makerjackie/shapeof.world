import { seededRandom } from './model'

type Point = [number, number, number]
/** Camera-facing clearance is a display cutaway, not biological protein migration. */
export function proteinClearance(position: Point, eye: Point, radius: number) {
  const target: Point = [28, 9, 116]
  const delta = target.map((v,i)=>v-eye[i]), offset = position.map((v,i)=>v-eye[i])
  const length2 = delta.reduce((s,v)=>s+v*v,0)
  const t = Math.max(0,Math.min(1,offset.reduce((s,v,i)=>s+v*delta[i],0)/Math.max(1e-9,length2)))
  const distance = Math.hypot(...offset.map((v,i)=>v-t*delta[i]))
  const nearEye = Math.hypot(...offset)
  const margin = Math.min(distance-radius-13,nearEye-radius-15)
  const u = Math.max(0,Math.min(1,margin/8))
  return u*u*(3-2*u)
}
/** Jittered hexagonal display samples; size +/-10%, independent monolayer seeds. */
export function createLipidHeadgroups(mobile: boolean, lumen: number, membrane: number) {
  const poses: {position: Point; scale: number; rotation: Point}[] = [], rand=seededRandom(631)
  const step=mobile?1.8:1.4, rowStep=step*Math.sqrt(3)/2
  for (const lower of [0,1]) for (const side of [-1,1]) {
    let row=0
    for (let z=79;z<=164;z+=rowStep,row++) for(let x=-79+(row%2)*step/2;x<=95;x+=step) {
      const px=x+(rand()-.5)*step*.55, pz=z+(rand()-.5)*rowStep*.55
      if(Math.abs(px)>75&&pz>145||Math.hypot(px-28,pz-116)<5.5)continue
      poses.push({position:[px,-lower*(lumen+membrane)+side*membrane/2+(rand()-.5)*.12,pz],scale:.9+rand()*.2,rotation:[rand()*3,rand()*3,rand()*3]})
    }
  }
  return poses
}
