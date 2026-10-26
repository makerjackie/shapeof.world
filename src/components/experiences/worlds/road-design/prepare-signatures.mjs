// Regenerate after route geometry changes; keep builders out of the UI bundle.
import {createServer} from 'vite'
import {writeFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
const server=await createServer({root:fileURLToPath(new URL('../../../../../',import.meta.url)),configFile:false,server:{middlewareMode:true,hmr:false,ws:false,watch:null},appType:'custom'})
try{
 const dir='/src/components/experiences/worlds/road-design/'
 const {DESIGNS}=await server.ssrLoadModule(dir+'designs/index.ts'),{buildExploreRoutes}=await server.ssrLoadModule(dir+'explorer/routes.ts'),{signatureRoute,corePoints}=await server.ssrLoadModule(dir+'explorer/journey.ts'),{projectToLane,sampleLane}=await server.ssrLoadModule(dir+'sim/geometry.ts')
 const data=Object.fromEntries(DESIGNS.map(d=>{
  const n=d.build(),r=signatureRoute(buildExploreRoutes(n,[]),d.id),points=corePoints(r),xs=points.map(p=>p.x),zs=points.map(p=>p.z),x=Math.min(...xs),z=Math.min(...zs),w=Math.max(...xs)-x,h=Math.max(...zs)-z,scale=48/Math.max(w,h)
  return [d.id,points.map(p=>[8+(48-w*scale)/2+(p.x-x)*scale,8+(48-h*scale)/2+(p.z-z)*scale].map(v=>+v.toFixed(1)).join(',')).join(' ')]
 }))
 writeFileSync(new URL('./data/signatures.json',import.meta.url),JSON.stringify(data,null,2)+'\n')
}finally{await server.close()}
