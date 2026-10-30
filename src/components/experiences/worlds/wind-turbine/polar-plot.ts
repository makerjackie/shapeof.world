import {FOILS,polar} from './model'
/** Draw the actual reference table, sampled via the same interpolation as BEM. */
export function polarPlot(foil:number,alpha:number,range=30){
 const samples=Array.from({length:241},(_,i)=>{const a=-range+2*range*i/240;return {alpha:a,...polar(foil,a)}})
 const clMax=Math.max(1,Math.ceil(Math.max(...samples.map(p=>Math.abs(p.cl)))*2)/2)
 const cdMax=Math.max(.02,Math.ceil(Math.max(...samples.map(p=>p.cd))*100)/100)
 const x=(a:number)=>29+(a+range)/(2*range)*212,clY=(cl:number)=>78.5-cl/clMax*55.5,cdY=(cd:number)=>134-cd/cdMax*111
 const path=(key:'cl'|'cd')=>samples.map((p,i)=>`${i?'L':'M'}${x(p.alpha).toFixed(2)},${(key==='cl'?clY(p.cl):cdY(p.cd)).toFixed(2)}`).join(' ')
 const current=polar(foil,alpha)
 return {range,clMax,cdMax,lift:path('cl'),drag:path('cd'),x:x(alpha),clY:clY(current.cl),cdY:cdY(current.cd),outside:Math.abs(alpha)>range,source:FOILS[foil].name}
}
