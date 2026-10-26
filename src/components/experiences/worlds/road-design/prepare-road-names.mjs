// Display metadata only: preserve the imported topology and inferred geometry.
import {readFileSync,writeFileSync} from 'node:fs'
const {roads}=JSON.parse(readFileSync(new URL('./data/huangjuewan-runtime.json',import.meta.url)))
const english={'包茂高速':'Baomao Expressway','峡江路':'Xiajiang Road','渝航大道':'Yuhang Avenue'}
const forward=new Map(),backward=new Map(),named=new Map()
for(const road of roads){
 for(const node of road.nodes)if(road.name)named.set(node,[...new Set([...(named.get(node)??[]),road.name])])
 for(let i=1;i<road.nodes.length;i++){
  const a=road.nodes[i-1],b=road.nodes[i]
  forward.set(a,[...(forward.get(a)??[]),b]);backward.set(b,[...(backward.get(b)??[]),a])
 }
}
function nearestNames(node,graph){
 let queue=[node];const seen=new Set(queue)
 while(queue.length){
  const names=[...new Set(queue.flatMap(n=>named.get(n)??[]))].sort()
  if(names.length)return names
  queue=queue.flatMap(n=>(graph.get(n)??[]).filter(next=>{if(seen.has(next))return false;seen.add(next);return true}))
 }
 return []
}
const data=Object.fromEntries(roads.map(road=>{
 let name=road.name,nameEn=english[name]
 if(!name){
  const from=nearestNames(road.nodes[0],backward),to=nearestNames(road.nodes.at(-1),forward)
  const pair=[...new Set([...from,...to])].sort(),en=pair.map(n=>english[n])
  name=pair.length?`${pair.join('／')}连接匝道`:'黄桷湾边界连接匝道'
  nameEn=pair.length?`${en.join(' / ')} connector ramp`:'Huangjuewan boundary connector ramp'
 }
 return [`hjw-road-${road.id}`,{name,nameEn}]
}))
writeFileSync(new URL('./data/huangjuewan-road-names.json',import.meta.url),JSON.stringify(data,null,2)+'\n')
console.log(`${roads.length} road labels; ${Object.values(data).filter(n=>n.name.includes('边界')).length} boundary-only labels`)
