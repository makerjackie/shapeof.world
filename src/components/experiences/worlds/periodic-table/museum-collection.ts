import { elements } from './element-model'
import { exhibitExperiments } from './reaction-model'
const key=(kind:string)=>`oneworld:periodic-table:museum:${kind}:v1`
export function readCollection(kind:'elements'|'experiments'):Set<string>{
 try{const parsed:unknown=JSON.parse(localStorage.getItem(key(kind))??'[]');const allowed=new Set(kind==='elements'?elements.map(e=>e.symbol):exhibitExperiments.map(e=>e.id));return new Set(Array.isArray(parsed)?parsed.filter((v):v is string=>typeof v==='string'&&allowed.has(v)):[])}catch{return new Set()}
}
export function writeCollection(kind:'elements'|'experiments',values:Set<string>){try{localStorage.setItem(key(kind),JSON.stringify([...values]))}catch{/* Collection remains usable for this visit when storage is unavailable. */}}
