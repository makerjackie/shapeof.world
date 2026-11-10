import type {Tensor} from './model'
/** Reading layout only. Coordinates are not hardware dimensions or execution time. */
export type View='network'|'attention'|'ffn'|'residual'|'matrix'
type V3=[number,number,number]
export const SCENE_FRAMES:Record<View,{min:V3;max:V3;direction:V3}>={
 network:{min:[-10.8,-11.6,-4.3],max:[10.8,12.6,4.2],direction:[26,14,38]},
 attention:{min:[-7.4,-3,-5.2],max:[7.4,3.3,8.3],direction:[10,13,19]},
 ffn:{min:[-9.4,-1.3,-5.1],max:[9.4,3.8,4],direction:[9,14,22]},
 residual:{min:[-8.7,-.1,-3.8],max:[8.7,3.1,4],direction:[12,15,24]},
 matrix:{min:[-7.2,-.1,-6.3],max:[7.2,.6,7.6],direction:[5,15,18]},
}
/** Separate items avoid fitting empty corners of the whole exploded structure. */
export const SCENE_ITEMS:Record<View,{min:V3;max:V3}[]>={
 network:[{min:[-7.5,-11.5,-2],max:[7.5,-10.9,3.25]},{min:[-3.8,11.5,-2],max:[3.8,12.3,3.5]},...[-6.3,0,6.3].map(y=>({min:[-10.8,y-2.3,-4.3] as V3,max:[9.6,y+2.95,4.2] as V3}))],
 attention:[{min:[-7.4,1.7,-4.8],max:[-2.25,2.3,-.3]},{min:[2.25,1.7,-4.8],max:[7.4,2.3,-.3]},{min:[-2.5,-2.75,3.8],max:[2.5,-2.2,8.35]},{min:[-4.1,-.1,-2.65],max:[3.45,.5,5.25]},{min:[-2.4,.25,-4.8],max:[3.45,3.15,4.6]}],
 ffn:[{min:[-9.4,-.1,-2.9],max:[-4.9,.6,3.6]},{min:[-4.4,-.1,-2.9],max:[4.4,.6,3.6]},{min:[4.9,-.1,-2.9],max:[9.4,.6,3.6]},{min:[-4.15,-1.3,-5],max:[4.15,3.8,-4.5]}],
 residual:[{min:[-8.7,-.1,-3.8],max:[8.7,3.1,4]}],
 matrix:[{min:[-7.2,-.1,-6.3],max:[7.2,.5,6.3]},{min:[-3,.4,7],max:[3,.7,7.6]}],
}
const dot=(a:V3,b:V3)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2]
const unit=(a:V3):V3=>{const n=Math.hypot(...a);return a.map(v=>v/n) as V3}
export function sceneCamera(view:View,aspect:number,fov=34){
 const frame=SCENE_FRAMES[view],target=frame.min.map((v,i)=>(v+frame.max[i])/2) as V3,z=unit(frame.direction),x=unit([z[2],0,-z[0]]),y:V3=[z[1]*x[2],z[2]*x[0]-z[0]*x[2],-z[1]*x[0]],tan=Math.tan(fov*Math.PI/360),a=Number.isFinite(aspect)&&aspect>0?aspect:1
 let distance=0
 for(const item of SCENE_ITEMS[view])for(const px of [item.min[0],item.max[0]])for(const py of [item.min[1],item.max[1]])for(const pz of [item.min[2],item.max[2]]){const v:V3=[px-target[0],py-target[1],pz-target[2]];distance=Math.max(distance,dot(v,z)+Math.max(Math.abs(dot(v,x))/(tan*a),Math.abs(dot(v,y))/tan))}
 distance*=view==='network'?1.055:1.10
 return{target,position:target.map((v,i)=>v+z[i]*distance) as V3,distance}
}
/** The same 22 display steps used by the inspector; manual stepping also moves the marker. */
export function phasePosition(phase:number){
 const p=Math.min(21,Math.max(0,Math.trunc(Number.isFinite(phase)?phase:0)))
 if(p===0)return-11.3
 if(p>=19)return[10.1,10.9,11.7][p-19]
 const layer=Math.floor((p-1)/6),stage=(p-1)%6
 return(layer-1)*6.3+[-1.9,-.85,.45,1.2,1.7,2.65][stage]
}
export function phaseLayer(phase:number){return phase<1?-1:phase>18?3:Math.floor((phase-1)/6)}
export function attentionRowZ(row:number,count:number,depth:number,offset=0){return offset+(Math.min(count-1,Math.max(0,row))-(count-1)/2)*depth/count}

/** A head output is a feature slice of the real concatenated A·V tensor. */
export function contextHead(source:Tensor,head:number):Tensor{const[rows,cols]=source.shape,width=cols/3,data=new Float32Array(rows*width);for(let r=0;r<rows;r++)data.set(source.data.subarray(r*cols+head*width,r*cols+(head+1)*width),r*width);return{shape:[rows,width],data}}
