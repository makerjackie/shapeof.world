/** Source JSON stays unchanged for provenance and engineering tests. Runtime
 * uses millimetre Int32 road coordinates and centimetre Int16 terrain predictor residuals.
 * Both encodings are lossless relative to the source's decimal precision. */
import { readFileSync, writeFileSync } from 'node:fs'
const read=name=>JSON.parse(readFileSync(new URL(`./data/${name}.json`,import.meta.url),'utf8'))
const roads=read('huangjuewan-roads'), terrain=read('huangjuewan-terrain')
const coords=Buffer.alloc(roads.nodes.length*12)
const previous=[0,0,0]
roads.nodes.forEach((node,i)=>node.slice(1).forEach((n,j)=>{const value=Math.round(n*1000);coords.writeInt32LE(value-previous[j],i*12+j*4);previous[j]=value}))
const heights=Buffer.alloc(terrain.values.length*2), offset=-60
const quantized=terrain.values.map(n=>Math.round((n-offset)*100))
quantized.forEach((value,i)=>{const left=i%terrain.width?quantized[i-1]:0,up=i>=terrain.width?quantized[i-terrain.width]:0,diagonal=i>=terrain.width&&i%terrain.width?quantized[i-terrain.width-1]:0;heights.writeInt16LE(value-left-up+diagonal,i*2)})
const {rawValues,values,...grid}=terrain
const packed={version:2,metadata:roads.metadata,roads:roads.roads,coordinates:coords.toString('base64'),coordinateScale:.001,terrain:{...grid,offset,scale:.01,heights:heights.toString('base64')}}
writeFileSync(new URL('./data/huangjuewan-runtime.json',import.meta.url),JSON.stringify(packed)+'\n')
const capacity=read('capacity')
writeFileSync(new URL('./data/capacity-display.json',import.meta.url),JSON.stringify({designs:Object.fromEntries(Object.entries(capacity.designs).map(([id,row])=>[id,{vehiclesPerHour:row.vehiclesPerHour,turningVehiclesPerHour:row.turningVehiclesPerHour,status:row.status}]))})+'\n')
