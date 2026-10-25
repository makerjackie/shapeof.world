export type PackedHuangjuewan = typeof import('../data/huangjuewan-runtime.json')
import type { TerrainGrid, Vec3 } from '../sim/types'
function bytes(encoded:string) {
  const binary=atob(encoded), array=new Uint8Array(binary.length)
  for(let i=0;i<binary.length;i++)array[i]=binary.charCodeAt(i)
  return new DataView(array.buffer)
}
export function decodeHuangjuewan(packed:PackedHuangjuewan) {
const coordinates=bytes(packed.coordinates), heights=bytes(packed.terrain.heights)
const previous=[0,0,0]
const HUANGJUEWAN_POINTS:Vec3[]=Array.from({length:coordinates.byteLength/12},(_,i)=>{
  for(let axis=0;axis<3;axis++)previous[axis]+=coordinates.getInt32(i*12+axis*4,true)
  return {x:previous[0]/1000,y:previous[1]/1000,z:previous[2]/1000}
})
const {heights:encoded,offset,scale,...grid}=packed.terrain
const quantized=new Int32Array(heights.byteLength/2)
for(let i=0;i<quantized.length;i++){
  const left=i%grid.width?quantized[i-1]:0,up=i>=grid.width?quantized[i-grid.width]:0,diagonal=i>=grid.width&&i%grid.width?quantized[i-grid.width-1]:0
  quantized[i]=heights.getInt16(i*2,true)+left+up-diagonal
}
const HUANGJUEWAN_GRID:TerrainGrid={...grid,values:Array.from(quantized,value=>(value+offset*100)/100)}
const HUANGJUEWAN_RUNTIME={metadata:packed.metadata,roads:packed.roads}
  return {nodes:HUANGJUEWAN_POINTS,terrainData:HUANGJUEWAN_GRID,roadData:HUANGJUEWAN_RUNTIME}
}
