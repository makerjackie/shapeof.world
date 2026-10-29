import type {Model,Trace,Tensor} from './model'
import type {MatrixKey} from './inspection'
export type Calculation={terms:{index:number;a:number;b:number;product:number}[];bias:number;scale:number;sum:number}
export function cellCalculation(matrix:MatrixKey,trace:Trace,model:Model,layer:number,head:number,row:number,column:number):Calculation|null{
 const block=trace.blocks[layer],prefix=`transformer.h.${layer}`,C=model.config.n_embd,A=C/model.config.n_head,w=model.weights
 let input:Tensor|undefined,weight:Tensor|undefined,bias:Tensor|undefined,out=column
 if(matrix==='query'||matrix==='key'||matrix==='value'){input=block.ln1;weight=w[`${prefix}.attn.c_attn.weight`];bias=w[`${prefix}.attn.c_attn.bias`];out=head*A+column+(matrix==='key'?C:matrix==='value'?2*C:0)}
 if(matrix==='up'){input=block.ln2;weight=w[`${prefix}.mlp.c_fc.weight`];bias=w[`${prefix}.mlp.c_fc.bias`]}
 if(matrix==='projection'){input=block.context;weight=w[`${prefix}.attn.c_proj.weight`];bias=w[`${prefix}.attn.c_proj.bias`]}
 if(matrix==='down'){input=block.gelu;weight=w[`${prefix}.mlp.c_proj.weight`];bias=w[`${prefix}.mlp.c_proj.bias`]}
 if(matrix==='logits'){input=trace.finalNorm;weight=w['lm_head.weight']}
 if(input&&weight){const n=input.shape[1],terms=Array.from({length:n},(_,index)=>{const a=input!.data[row*n+index],b=weight!.data[out*n+index];return {index,a,b,product:a*b}}),b=bias?.data[out]??0;return {terms,bias:b,scale:1,sum:terms.reduce((a,t)=>a+t.product,b)}}
 if(matrix==='scores'){
  const T=trace.ids.length,terms=Array.from({length:A},(_,index)=>{const a=block.q.data[(head*T+row)*A+index],b=block.k.data[(head*T+column)*A+index];return {index,a,b,product:a*b}})
  return {terms,bias:0,scale:Math.sqrt(A),sum:terms.reduce((a,t)=>a+t.product,0)/Math.sqrt(A)}
 }
 return null
}
