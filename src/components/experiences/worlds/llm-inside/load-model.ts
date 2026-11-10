import {decodeModel,WEIGHT_SHA256,type RawModel} from './model'
export async function loadModel(signal:AbortSignal,onProgress:(loaded:number,total?:number)=>void){
 const response=await fetch('/assets/llm-inside/gpt-nano-sort-model.json',{signal})
 if(!response.ok)throw new Error(`Model download HTTP ${response.status}`)
 const size=Number(response.headers.get('content-length')),total=size>0&&!response.headers.get('content-encoding')?size:undefined
 onProgress(0,total)
 const reader=response.body?.getReader(),chunks:Uint8Array[]=[];let loaded=0
 if(reader){for(;;){const chunk=await reader.read();if(chunk.done)break;chunks.push(chunk.value);loaded+=chunk.value.byteLength;onProgress(loaded,total)}}else{const buffer=new Uint8Array(await response.arrayBuffer());chunks.push(buffer);loaded=buffer.byteLength;onProgress(loaded,total)}
 const bytes=new Uint8Array(loaded);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
 if(globalThis.crypto?.subtle){const digest=await crypto.subtle.digest('SHA-256',bytes),hash=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');if(hash!==WEIGHT_SHA256)throw new Error('Published model checksum mismatch')}
 return decodeModel(JSON.parse(new TextDecoder().decode(bytes)) as RawModel)
}
