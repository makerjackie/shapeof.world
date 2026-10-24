/** Reproduce measured OSM examples after downloading raw Overpass files into
 * .local/road-design/round-5. Only numeric results and selection manifests ship. */
import {createServer} from 'vite'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
const folder='.local/road-design/round-5',world='src/components/experiences/worlds/road-design'
const configs=JSON.parse(await readFile(world+'/data/footprint-sites.json','utf8'))
const v=await createServer({configFile:false,server:{middlewareMode:true,hmr:false,ws:false,watch:null},appType:'custom'})
try {
 const {lockedLand,LAND_METHOD}=await v.ssrLoadModule('/'+world+'/sim/land-footprint.ts')
 const results=[]
 for(const site of configs){
  const raw=JSON.parse(await readFile(`${folder}/${site.id}.json`,'utf8')),ways=raw.elements.filter(w=>w.type==='way'&&w.geometry)
  const project=p=>({x:(p.lon-site.lon)*Math.PI/180*6371008.8*Math.cos(site.lat*Math.PI/180),z:-(p.lat-site.lat)*Math.PI/180*6371008.8,y:0})
  const links=ways.filter(w=>/^(motorway|trunk)_link$/.test(w.tags.highway)&&!site.excludeWays?.includes(w.id))
  const selected=new Set(site.includeWays??links.filter(w=>w.geometry.some(p=>{const q=project(p);return Math.hypot(q.x,q.z)<site.seedRadius})).map(w=>w.id))
  let changed=true
  while(changed){changed=false;const nodes=new Set(links.filter(w=>selected.has(w.id)).flatMap(w=>w.nodes))
   for(const w of links)if(!selected.has(w.id)&&w.nodes.some(n=>nodes.has(n))){selected.add(w.id);changed=true}}
  const main=ways.filter(w=>!w.tags.highway.endsWith('_link')&&((/^(motorway|trunk)$/.test(w.tags.highway)&&(!site.mainRefs||site.mainRefs.some(ref=>(w.tags.ref??'').split(';').includes(ref))))||site.crossroads?.some(name=>(w.tags.name??'').includes(name)||(w.tags.ref??'')===name)))
  const mainNodes=new Set(main.flatMap(w=>w.nodes)), candidates=links.filter(w=>selected.has(w.id))
  // Prune local access branches: a system ramp must connect the chosen main
  // roads at both ends. Nearby surface exits are not part of that interchange.
  const rampEdges=[],rampAdj=new Map()
  for(const w of candidates)for(let i=1;i<w.nodes.length;i++){
    const id=rampEdges.length,a=w.nodes[i-1],b=w.nodes[i];rampEdges.push({a,b,w,i,active:true})
    for(const n of [a,b]){if(!rampAdj.has(n))rampAdj.set(n,new Set());rampAdj.get(n).add(id)}
  }
  const prune=[...rampAdj.keys()].filter(n=>rampAdj.get(n).size<=1&&!mainNodes.has(n))
  for(let j=0;j<prune.length;j++){const n=prune[j];for(const id of rampAdj.get(n)??[]){const e=rampEdges[id];e.active=false;const other=e.a===n?e.b:e.a;rampAdj.get(other).delete(id);if(rampAdj.get(other).size<=1&&!mainNodes.has(other))prune.push(other)}rampAdj.get(n)?.clear()}
  const kept=new Set(rampEdges.filter(e=>e.active).map(e=>e.w.id))
  const ramps=candidates.filter(w=>kept.has(w.id)),rampNodes=new Set(ramps.flatMap(w=>w.nodes))
  // Remove every dead-end lead until its outermost actual shared ramp node.
  // The undirected plan graph is used only for footprint selection, not traffic.
  const edges=[],adj=new Map(),locations=new Map()
  const add=(n,id)=>{if(!adj.has(n))adj.set(n,new Set());adj.get(n).add(id)}
  for(const w of main)for(let i=1;i<w.nodes.length;i++){
   if([w.geometry[i-1],w.geometry[i]].some(p=>{const q=project(p);return Math.hypot(q.x,q.z)>site.downloadRadius}))continue
   const a=w.nodes[i-1],b=w.nodes[i],id=edges.length;edges.push({a,b,w,index:i-1,active:true});add(a,id);add(b,id);locations.set(a,project(w.geometry[i-1]));locations.set(b,project(w.geometry[i]))}
  const queue=[...adj.keys()].filter(n=>adj.get(n).size<=1&&!rampNodes.has(n))
  for(let j=0;j<queue.length;j++){const n=queue[j];for(const id of adj.get(n)??[]){const e=edges[id];e.active=false;const other=e.a===n?e.b:e.a;adj.get(other).delete(id);if(adj.get(other).size<=1&&!rampNodes.has(other))queue.push(other)}adj.get(n)?.clear()}
  // Components with fewer than two ramp attachments are unrelated roads.
  const visited=new Set()
  for(const n of adj.keys())if(!visited.has(n)&&adj.get(n).size){const pending=[n],component=[],anchors=new Set();visited.add(n)
   for(let j=0;j<pending.length;j++){const node=pending[j];if(rampNodes.has(node))anchors.add(node);for(const id of adj.get(node)){component.push(id);const e=edges[id],other=e.a===node?e.b:e.a;if(!visited.has(other)){visited.add(other);pending.push(other)}}}
   if(anchors.size<2)for(const id of component)edges[id].active=false}
  // Retain shortest main-road paths between ramp attachments, not remote
  // road cycles connected through the same arterial. This also handles large
  // shared downloads without measuring adjacent junctions.
  const pathEdges=new Set(),anchors=[...adj.keys()].filter(n=>rampNodes.has(n)&&adj.get(n).size)
  for(const start of anchors){
   const dist=new Map([[start,0]]),previous=new Map(),pending=[[0,start]],done=new Set()
   while(pending.length){pending.sort((a,b)=>b[0]-a[0]);const [distance,node]=pending.pop();if(done.has(node))continue;done.add(node)
    for(const id of adj.get(node)??[]){const e=edges[id];if(!e.active)continue;const other=e.a===node?e.b:e.a,a=locations.get(node),b=locations.get(other),candidate=distance+Math.hypot(a.x-b.x,a.z-b.z)
     if(candidate<(dist.get(other)??Infinity)){dist.set(other,candidate);previous.set(other,{node,id});pending.push([candidate,other])}}
   }
   for(const end of anchors)if(end!==start&&dist.has(end)){let node=end;while(node!==start){const step=previous.get(node);pathEdges.add(step.id);node=step.node}}
  }
  for(let i=0;i<edges.length;i++)if(!pathEdges.has(i))edges[i].active=false
  const width=w=>{const count=Number.parseFloat(w.tags.lanes)||(/_link$/.test(w.tags.highway)?1:w.tags.oneway==='yes'?2:2);return count*3.75+2*(/_link$/.test(w.tags.highway)?1.2:3)}
  const roads=ramps.map(w=>({points:w.geometry.map(project),width:width(w)}))
  const ranges={}
  for(const e of edges.filter(e=>e.active)){roads.push({points:[locations.get(e.a),locations.get(e.b)],width:width(e.w)});(ranges[e.w.id]??=[]).push(e.index)}
  if(!ramps.length||!edges.some(e=>e.active))throw new Error('Incomplete selection '+site.id)
  const measure=lockedLand(roads),fine=lockedLand(roads,1),coarse=lockedLand(roads,4)
  results.push({...site,date:raw.osm3s?.timestamp_osm_base,query:raw.query,rampWayIds:ramps.map(w=>w.id).sort((a,b)=>a-b),mainWaySegments:ranges,
   ...measure,gridSensitivity:{oneMetre:fine.area,fourMetres:coarse.area},widthAssumption:'lanes tag × 3.75 m; missing: link 1, road 2. Shoulders each side: link 1.2 m, road 3 m. 10 m boundary buffer; no cadastral assertion.'})
  await mkdir(folder+'/selected',{recursive:true});await writeFile(folder+'/selected/'+site.id+'.json',JSON.stringify(roads))
  console.log(site.id,ramps.length,Object.keys(ranges).length,(measure.area/10000).toFixed(2),'ha')
 }
 const intervals={};for(const type of new Set(results.map(s=>s.type))){const rows=results.filter(s=>s.type===type);intervals[type]={minHa:Math.min(...rows.map(s=>s.area))/10000,maxHa:Math.max(...rows.map(s=>s.area))/10000,sites:rows.map(s=>s.id)}}
 await writeFile(world+'/data/footprint-references.json',JSON.stringify({method:LAND_METHOD,license:'ODbL-1.0; © OpenStreetMap contributors. Produced database of derived areas and way selections.',intervals,sites:results},null,2)+'\n')
} finally{await v.close()}
