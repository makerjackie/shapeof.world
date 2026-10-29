import {describe,it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {decodeModel,decodeTensor,forward,gelu,greedySort,lastLogits,seededRandom,sample,softmax,WEIGHT_SHA256,type RawModel,type Tensor} from './model'
import reference from './__fixtures__/reference-partials.json'
import {cellCalculation} from './cell-calculation'
import {matrixFor,type MatrixKey} from './inspection'
const bytes=readFileSync('public/assets/llm-inside/gpt-nano-sort-model.json'),model=decodeModel(JSON.parse(bytes.toString()) as RawModel)
const fixture=reference as unknown as Record<string,Parameters<typeof decodeTensor>[0]>
describe('published trained GPT inference',()=>{
 it('pins the exact trained export and excludes causal-mask buffers from parameter count',()=>{expect(createHash('sha256').update(bytes).digest('hex')).toBe(WEIGHT_SHA256);expect(model.parameters).toBe(85728)})
 it('matches all three upstream reference samples at every exported intermediate tensor',()=>{
  const input=decodeTensor(fixture.idx)
  for(let batch=0;batch<3;batch++){
   const trace=forward(model,Array.from(input.data.subarray(batch*11,(batch+1)*11))),b=trace.blocks[0]
   const actual:Record<string,Tensor>={tok_emb:trace.tokenEmbedding,pos_emb:trace.positionEmbedding,x:trace.embedding,ln1:b.ln1,q:b.q,k:b.k,v:b.v,qkv:b.qkv,att:b.scores,attSm:b.attention,y:b.context,yProj:b.projection,attnResid:b.attentionResidual,ln2:b.ln2,fc:b.up,gelu:b.gelu,mlp:b.down,mlpResid:b.output,block0:trace.blocks[0].output,block1:trace.blocks[1].output,block2:trace.blocks[2].output,ln_f:trace.finalNorm,lm_head:trace.logits,probs:trace.probabilities}
   for(const [name,value] of Object.entries(actual)){
    const expected=decodeTensor(fixture[name]),offset=name==='pos_emb'?0:batch*value.data.length
    let error=0;for(let i=0;i<value.data.length;i++){const a=value.data[i],e=expected.data[offset+i];if(Number.isFinite(a)&&Number.isFinite(e))error=Math.max(error,Math.abs(a-e));else expect(a).toBe(e)}
    expect(error,`${name}, sample ${batch}`).toBeLessThan(3e-6)
   }
  }
 })
 it('has exact causal zeros and remains invariant to edits at future positions',()=>{
  const a=forward(model,[0,1,2,0,1,2]),b=forward(model,[0,1,2,2,2,2])
  for(let layer=0;layer<3;layer++)for(let head=0;head<3;head++)for(let row=0;row<6;row++){
   let sum=0;for(let col=0;col<6;col++){const value=a.blocks[layer].attention.data[(head*6+row)*6+col];if(col>row)expect(value).toBe(0);sum+=value}expect(sum).toBeCloseTo(1,6)
  }
  for(let i=0;i<3*3;i++)expect(a.logits.data[i]).toBe(b.logits.data[i])
 })
 it('really changes downstream results when a head or FFN is intervened on',()=>{
  const ids=[2,1,0,1,0,2],base=forward(model,ids),head=forward(model,ids,{head:{layer:1,head:2}}),ffn=forward(model,ids,{ffnLayer:1})
  for(let t=0;t<6;t++)for(let c=32;c<48;c++)expect(head.blocks[1].context.data[t*48+c]).toBe(0)
  expect(ffn.blocks[1].down.data.every(v=>v===0)).toBe(true)
  expect(lastLogits(head)).not.toEqual(lastLogits(base));expect(lastLogits(ffn)).not.toEqual(lastLogits(base))
  for(let i=0;i<base.blocks[0].input.data.length;i++)expect(base.blocks[0].attentionResidual.data[i]).toBeCloseTo(base.blocks[0].input.data[i]+base.blocks[0].projection.data[i],6)
 })
 it('connects inspected dot products to the correct block, head and public weight row',()=>{
  const trace=forward(model,[2,1,0,1,0,2,0,0])
  for(let layer=0;layer<3;layer++)for(let head=0;head<3;head++)for(const key of ['query','key','value','up','projection','down','logits'] as MatrixKey[]){
   const value=matrixFor(key,trace,model,layer,head),row=7,column=value.shape[1]-1,calculation=cellCalculation(key,trace,model,layer,head,row,column)
   expect(calculation).not.toBeNull();expect(calculation!.sum).toBeCloseTo(value.data[row*value.shape[1]+column],5)
  }
  expect(matrixFor('input',trace,model,1,0)).toBe(trace.blocks[1].input)
 })
 it('sorts all 729 possible six-letter inputs by genuine autoregressive greedy inference',()=>{
  for(let i=0;i<729;i++){let v=i;const chars:string[]=[];for(let k=0;k<6;k++){chars.push('ABC'[v%3]);v=Math.floor(v/3)}const input=chars.join('');if(greedySort(model,input)!==chars.sort().join(''))throw new Error(`Failed ${input}`)}
 },15000)
 it('handles greedy, stable softmax, top-k and reproducible seeded sampling',()=>{
  expect(softmax([1,3,2],0)).toEqual([0,1,0]);expect(softmax([1000,1001,1002]).reduce((a,b)=>a+b,0)).toBeCloseTo(1)
  expect(softmax([1,3,2],1,1)).toEqual([0,1,0]);expect(softmax([1,3,2],2)[1]).toBeLessThan(softmax([1,3,2],.5)[1])
  const a=seededRandom(42),b=seededRandom(42);for(let i=0;i<10;i++)expect(sample([.2,.3,.5],a())).toBe(sample([.2,.3,.5],b()))
  expect(gelu(0)).toBe(0)
 })
})
