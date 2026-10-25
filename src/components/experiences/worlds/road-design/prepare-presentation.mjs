/** Regenerate the lightweight UI catalogue. Audit/model data stays out of its
 * initial download; numbers are derived from precisely the same geometry. */
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import { writeFileSync } from 'node:fs'
// Douglas–Peucker, at most 0.16 screen pixels on a 48 px catalogue thumbnail.
function diagramPoints(points,epsilon){
 const keep=new Set([0,points.length-1]),stack=[[0,points.length-1]]
 while(stack.length){const [a,b]=stack.pop(),p=points[a],q=points[b],dx=q.x-p.x,dz=q.z-p.z,length2=dx*dx+dz*dz;let far=-1,best=epsilon*epsilon
  for(let i=a+1;i<b;i++){const r=points[i],t=Math.max(0,Math.min(1,((r.x-p.x)*dx+(r.z-p.z)*dz)/(length2||1))),d=(r.x-p.x-t*dx)**2+(r.z-p.z-t*dz)**2;if(d>best){best=d;far=i}}
  if(far>=0){keep.add(far);stack.push([a,far],[far,b])}
 }
 return [...keep].sort((a,b)=>a-b).map(i=>`${Math.round(points[i].x*10)/10},${Math.round(points[i].z*10)/10}`).join(' ')
}
const root=fileURLToPath(new URL('../../../../../',import.meta.url))
const server=await createServer({root,configFile:false,server:{middlewareMode:true,hmr:false,ws:false,watch:null},appType:'custom'})
try{
 const {DESIGNS}=await server.ssrLoadModule('/src/components/experiences/worlds/road-design/designs/index.ts')
 const {measureGeometry}=await server.ssrLoadModule('/src/components/experiences/worlds/road-design/sim/geometry-costs.ts')
 const {calculateConflicts,summarizeConflicts}=await server.ssrLoadModule('/src/components/experiences/worlds/road-design/sim/conflicts.ts')
 const rows=DESIGNS.map(({build,...design})=>{
  const network=build(), range=network.id==='huangjuewan'?1200:network.carriageways.some(r=>r.kind==='main')?(network.id==='cloverleaf'?230:450):network.id==='crossroads-channelized'?105:network.id==='continuous-flow'?170:63
  // Diagram strokes are integer metre coordinates: subpixel at catalogue size.
  const diagram={range,roads:network.carriageways.map(road=>({points:diagramPoints(road.points,range/150),width:road.laneCount*road.laneWidth+(road.medianWidth??0),opacity:road.level>0?.95:.4}))}
  return {...design,cost:measureGeometry(network),conflicts:summarizeConflicts(calculateConflicts(network)),diagram}
 })
 writeFileSync(new URL('./data/presentation.json',import.meta.url),JSON.stringify(rows)+'\n')
 console.log(`Prepared ${rows.length} catalogue entries`)
}finally{await server.close()}
