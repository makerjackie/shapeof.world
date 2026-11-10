/** Original CPU inference, implementing the published minGPT/GPT block equations.
 * Weights/reference outputs: Brendan Bycroft, MIT; notices in public/assets/llm-inside/.
 * No dropout at inference. No remote model calls. */
export type Config={n_layer:number;n_head:number;n_embd:number;vocab_size:number;block_size:number;model_type:string}
export type RawTensor={shape:number[];dtype:string;data:string}
export type Tensor={shape:number[];data:Float32Array}
export type RawModel={config:Config}&Record<string,RawTensor|Config>
export type Model={config:Config;weights:Record<string,Tensor>;parameters:number}
export type Intervention={head?:{layer:number;head:number};ffnLayer?:number}
export type BlockTrace={input:Tensor;ln1:Tensor;qkv:Tensor;q:Tensor;k:Tensor;v:Tensor;scores:Tensor;attention:Tensor;context:Tensor;projection:Tensor;attentionResidual:Tensor;ln2:Tensor;up:Tensor;gelu:Tensor;down:Tensor;output:Tensor}
export type Trace={ids:number[];tokenEmbedding:Tensor;positionEmbedding:Tensor;embedding:Tensor;blocks:BlockTrace[];finalNorm:Tensor;logits:Tensor;probabilities:Tensor;operations:number;milliseconds:number}
export const LETTERS=['A','B','C'] as const
export const WEIGHT_SHA256='a38d5f450e0c808305973c587cdd389ca4de92bbf60fa6a4482bf9a03f0a6051'
export function decodeTensor(raw:RawTensor):Tensor{
 if(raw.dtype!=='torch.float32')throw new Error('Unsupported tensor dtype')
 const bytes=Uint8Array.from(atob(raw.data),v=>v.charCodeAt(0)),n=raw.shape.reduce((a,b)=>a*b,1)
 if(bytes.length!==n*4)throw new Error('Tensor byte count does not match shape')
 const view=new DataView(bytes.buffer),data=new Float32Array(n)
 for(let i=0;i<n;i++)data[i]=view.getFloat32(i*4,true)
 return {shape:[...raw.shape],data}
}
export function decodeModel(raw:RawModel):Model{
 const c=raw.config
 if(c.n_layer!==3||c.n_head!==3||c.n_embd!==48||c.vocab_size!==3||c.block_size!==11)throw new Error('Unexpected reference architecture')
 const weights:Record<string,Tensor>={};let parameters=0
 for(const [name,tensor] of Object.entries(raw)){if(name==='config')continue;weights[name]=decodeTensor(tensor as RawTensor);if(!/\.attn\.bias$/.test(name))parameters+=weights[name].data.length}
 return {config:{...c},weights,parameters}
}
const tensor=(shape:number[],data?:Float32Array):Tensor=>({shape,data:data??new Float32Array(shape.reduce((a,b)=>a*b,1))})
function linear(x:Tensor,w:Tensor,b?:Tensor):Tensor{
 const [rows,ins]=x.shape,outs=w.shape[0],out=tensor([rows,outs])
 if(w.shape[1]!==ins)throw new Error('Linear input shape mismatch')
 for(let r=0;r<rows;r++)for(let o=0;o<outs;o++){
  let v=b?.data[o]??0;const xi=r*ins,wi=o*ins
  for(let i=0;i<ins;i++)v+=x.data[xi+i]*w.data[wi+i]
  out.data[r*outs+o]=v
 }
 return out
}
function layerNorm(x:Tensor,gamma:Tensor,beta:Tensor):Tensor{
 const [rows,cols]=x.shape,out=tensor([rows,cols])
 for(let r=0;r<rows;r++){
  let mean=0,m2=0;for(let i=0;i<cols;i++){const value=x.data[r*cols+i],delta=value-mean;mean+=delta/(i+1);m2+=delta*(value-mean)}
  const inverse=1/Math.sqrt(m2/cols+1e-5)
  for(let i=0;i<cols;i++)out.data[r*cols+i]=(x.data[r*cols+i]-mean)*inverse*gamma.data[i]+beta.data[i]
 }
 return out
}
function add(a:Tensor,b:Tensor):Tensor{const out=tensor([...a.shape]);for(let i=0;i<a.data.length;i++)out.data[i]=a.data[i]+b.data[i];return out}
export function gelu(x:number){return .5*x*(1+Math.tanh(Math.sqrt(2/Math.PI)*(x+.044715*x*x*x)))}
export function softmax(values:ArrayLike<number>,temperature=1,topK=values.length):number[]{
 const indices=Array.from({length:values.length},(_,i)=>i).sort((a,b)=>values[b]-values[a])
 if(temperature<=0)return indices.map((_,i)=>i===indices[0]?1:0)
 const active=new Set(indices.slice(0,Math.max(1,Math.min(topK,values.length)))),max=values[indices[0]]
 const exp=Array.from(values,(v,i)=>active.has(i)?Math.exp((v-max)/temperature):0),sum=exp.reduce((a,b)=>a+b,0)
 return exp.map(v=>v/sum)
}
export function forward(model:Model,ids:readonly number[],intervention:Intervention={}):Trace{
 const start=performance.now(),{n_embd:C,n_head:H,n_layer:L,block_size:max}=model.config,T=ids.length,A=C/H,w=model.weights
 if(T<1||T>max||ids.some(id=>!Number.isInteger(id)||id<0||id>=3))throw new Error('Invalid input tokens')
 const tokenEmbedding=tensor([T,C]),positionEmbedding=tensor([T,C])
 for(let t=0;t<T;t++)for(let c=0;c<C;c++){tokenEmbedding.data[t*C+c]=w['transformer.wte.weight'].data[ids[t]*C+c];positionEmbedding.data[t*C+c]=w['transformer.wpe.weight'].data[t*C+c]}
 const embedding=add(tokenEmbedding,positionEmbedding),blocks:BlockTrace[]=[];let x=embedding,operations=0
 for(let layer=0;layer<L;layer++){
  const prefix=`transformer.h.${layer}`,ln1=layerNorm(x,w[`${prefix}.ln_1.weight`],w[`${prefix}.ln_1.bias`])
  const qkv=linear(ln1,w[`${prefix}.attn.c_attn.weight`],w[`${prefix}.attn.c_attn.bias`])
  const q=tensor([H,T,A]),k=tensor([H,T,A]),v=tensor([H,T,A]),scores=tensor([H,T,T]),attention=tensor([H,T,T]),context=tensor([T,C])
  for(let h=0;h<H;h++)for(let t=0;t<T;t++)for(let a=0;a<A;a++){const target=(h*T+t)*A+a,source=t*C*3+h*A+a;q.data[target]=qkv.data[source];k.data[target]=qkv.data[source+C];v.data[target]=qkv.data[source+C*2]}
  for(let h=0;h<H;h++)for(let t=0;t<T;t++){
   for(let s=0;s<T;s++){let value=0;if(s<=t)for(let a=0;a<A;a++)value+=q.data[(h*T+t)*A+a]*k.data[(h*T+s)*A+a];scores.data[(h*T+t)*T+s]=s<=t?value/Math.sqrt(A):-Infinity}
   const probs=softmax(scores.data.subarray((h*T+t)*T,(h*T+t+1)*T))
   for(let s=0;s<T;s++)attention.data[(h*T+t)*T+s]=probs[s]
   for(let a=0;a<A;a++){let value=0;for(let s=0;s<=t;s++)value+=probs[s]*v.data[(h*T+s)*A+a];context.data[t*C+h*A+a]=intervention.head?.layer===layer&&intervention.head.head===h?0:value}
  }
  const projection=linear(context,w[`${prefix}.attn.c_proj.weight`],w[`${prefix}.attn.c_proj.bias`]),attentionResidual=add(x,projection)
  const ln2=layerNorm(attentionResidual,w[`${prefix}.ln_2.weight`],w[`${prefix}.ln_2.bias`]),up=linear(ln2,w[`${prefix}.mlp.c_fc.weight`],w[`${prefix}.mlp.c_fc.bias`])
  const activated=tensor([...up.shape]);for(let i=0;i<up.data.length;i++)activated.data[i]=gelu(up.data[i])
  const down=linear(activated,w[`${prefix}.mlp.c_proj.weight`],w[`${prefix}.mlp.c_proj.bias`])
  if(intervention.ffnLayer===layer)down.data.fill(0)
  const output=add(attentionResidual,down)
  blocks.push({input:x,ln1,qkv,q,k,v,scores,attention,context,projection,attentionResidual,ln2,up,gelu:activated,down,output});x=output
  operations+=T*(C*3*C+C*C+C*4*C+C*4*C)+H*T*(T+1)*A
 }
 const finalNorm=layerNorm(x,w['transformer.ln_f.weight'],w['transformer.ln_f.bias']),logits=linear(finalNorm,w['lm_head.weight']),probabilities=tensor([T,3])
 for(let t=0;t<T;t++)probabilities.data.set(softmax(logits.data.subarray(t*3,t*3+3)),t*3)
 operations+=T*C*3
 return {ids:[...ids],tokenEmbedding,positionEmbedding,embedding,blocks,finalNorm,logits,probabilities,operations,milliseconds:performance.now()-start}
}
export function lastLogits(trace:Trace){return Array.from(trace.logits.data.subarray((trace.ids.length-1)*3))}
export function seededRandom(seed:number){let state=seed>>>0;return()=>{state=(state+0x6d2b79f5)|0;let t=state;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
export function sample(probs:readonly number[],u:number){let total=0;for(let i=0;i<probs.length;i++){total+=probs[i];if(u<total)return i}return probs.length-1}
export function encode(sequence:string){if(!/^[ABC]{6}$/.test(sequence))throw new Error('Use six A/B/C tokens');return Array.from(sequence,v=>LETTERS.indexOf(v as typeof LETTERS[number]))}
export function greedySort(model:Model,sequence:string){const input=encode(sequence),output:number[]=[];for(let i=0;i<6;i++){const trace=forward(model,[...input,...output]),p=softmax(lastLogits(trace),0);output.push(sample(p,.5))}return output.map(v=>LETTERS[v]).join('')}
export function headTensor(source:Tensor,head:number):Tensor{const [,rows,cols]=source.shape;return tensor([rows,cols],source.data.subarray(head*rows*cols,(head+1)*rows*cols))}
export function tensorRange(t:Tensor){let min=Infinity,max=-Infinity;for(const v of t.data)if(Number.isFinite(v)){min=Math.min(min,v);max=Math.max(max,v)}return {min,max,absolute:Math.max(Math.abs(min),Math.abs(max),1e-8)}}
