import {gunzipSync} from 'fflate'
import * as T from 'three'
import meta from './data-meta.json'
import {decodeGrid,type Grid} from './model'
export interface Fields {wind:Grid;ocean:Grid;texture:T.Texture}
export function unpackField(kind:'wind'|'ocean',bytes:Uint8Array){
  // Vite and some asset hosts set Content-Encoding:gzip and fetch decodes it.
  // Other hosts deliver the .gz body verbatim. Accept both, then validate size.
  return decodeGrid(kind,bytes[0]===31&&bytes[1]===139?gunzipSync(bytes):bytes)
}
export async function loadFields(signal:AbortSignal,onBytes:(loaded:number)=>void):Promise<Fields>{
  let downloaded=0
  async function bytes(path:string){
    const response=await fetch(path,{signal});if(!response.ok)throw new Error(`Resource ${response.status}: ${path}`)
    const reader=response.body?.getReader();if(!reader){const b=new Uint8Array(await response.arrayBuffer());downloaded+=b.length;onBytes(downloaded);return b}
    const parts:Uint8Array[]=[],lengths:number[]=[]
    while(true){const result=await reader.read();if(result.done)break;parts.push(result.value);lengths.push(result.value.length);downloaded+=result.value.length;onBytes(downloaded)}
    const data=new Uint8Array(lengths.reduce((a,b)=>a+b,0));let offset=0
    for(const part of parts){data.set(part,offset);offset+=part.length}return data
  }
  const [windBytes,oceanBytes,imageBytes]=await Promise.all([bytes(meta.fields[0].path),bytes(meta.fields[1].path),bytes('/assets/solar-system/earth-bmng-4k.jpg')])
  if(signal.aborted)throw new DOMException('Aborted','AbortError')
  const wind=unpackField('wind',windBytes),ocean=unpackField('ocean',oceanBytes)
  const url=URL.createObjectURL(new Blob([imageBytes as BlobPart],{type:'image/jpeg'}))
  try{
    const texture=await new T.TextureLoader().loadAsync(url)
    texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4
    if(signal.aborted){texture.dispose();throw new DOMException('Aborted','AbortError')}
    return {wind,ocean,texture}
  }finally{URL.revokeObjectURL(url)}
}
