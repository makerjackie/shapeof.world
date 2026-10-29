import { gunzipSync } from 'fflate'

export const C = { model:0,age:1,mass:2,teff:3,lum:4,radius:5,coreT:6,coreRho:7,h:8,he:9,c:10,o:11,ne:12,si:13,heCore:14,coCore:15,oCore:16,siCore:17,feCore:18,lh:19,lhe:20,lz:21,lnuc:22 } as const
export type Phase = 'pms'|'main'|'giant'|'helium'|'agb'|'postagb'|'white'|'advanced'|'endpoint'
export type Track = {initialMass:number;sourceRows:number;retainedRows:number;sourceFile:string;sourceMD5:string;phases:{id:Phase;index:number}[];rows:number[][]}
export type Library = {schema:number;columns:string[];license:string;tracks:Track[]}
export type ClockMode = 'stages'|'years'
export type Sample = {row:number[];index:number;age:number;phase:Phase;progress:number}
export const clamp=(x:number,a=0,b=1)=>Math.max(a,Math.min(b,x))

export function decodeTracks(bytes:Uint8Array):Library {
  const plain=bytes[0]===31&&bytes[1]===139?gunzipSync(bytes):bytes
  const lib=JSON.parse(new TextDecoder().decode(plain)) as Library
  if(lib.schema!==1||lib.columns.length!==23||lib.tracks.length!==4)throw new Error('Invalid stellar track schema')
  for(const t of lib.tracks){
    if(t.rows.length!==t.retainedRows||t.rows.length<100)throw new Error('Incomplete stellar track')
    t.rows.forEach((r,i)=>{if(r.length!==23||r.some(x=>!Number.isFinite(x))||(i>0&&r[C.age]<=t.rows[i-1][C.age]))throw new Error('Invalid stellar track values')})
  }
  return lib
}

export function ageAtProgress(t:Track,p:number,mode:ClockMode):number {
  p=clamp(p)
  if(mode==='years')return t.rows[0][C.age]+p*(t.rows.at(-1)![C.age]-t.rows[0][C.age])
  const phases=t.phases, scaled=p*(phases.length-1),i=Math.min(phases.length-2,Math.floor(scaled))
  const a=t.rows[phases[i].index][C.age],b=t.rows[phases[i+1].index][C.age]
  return a+(b-a)*(scaled-i)
}
export function progressAtAge(t:Track,age:number,mode:ClockMode):number {
  if(mode==='years')return clamp((age-t.rows[0][C.age])/(t.rows.at(-1)![C.age]-t.rows[0][C.age]))
  let i=0;while(i<t.phases.length-2&&age>=t.rows[t.phases[i+1].index][C.age])i++
  const a=t.rows[t.phases[i].index][C.age],b=t.rows[t.phases[i+1].index][C.age]
  return clamp((i+clamp((age-a)/Math.max(Number.EPSILON,b-a)))/(t.phases.length-1))
}
export function atAge(t:Track,age:number,mode:ClockMode='stages'):Sample {
  age=clamp(age,t.rows[0][C.age],t.rows.at(-1)![C.age])
  let lo=0,hi=t.rows.length-1
  while(hi-lo>1){const m=(lo+hi)>>1;if(t.rows[m][C.age]>age)hi=m;else lo=m}
  const a=t.rows[lo],b=t.rows[hi],f=clamp((age-a[C.age])/(b[C.age]-a[C.age]))
  const row=a.map((v,i)=>v+(b[i]-v)*f)
  let phase:Phase=t.phases[0].id;for(const event of t.phases)if(age>=t.rows[event.index][C.age])phase=event.id
  return {row,index:f<.5?lo:hi,age,phase,progress:progressAtAge(t,age,mode)}
}
export function atProgress(t:Track,p:number,mode:ClockMode):Sample{return atAge(t,ageAtProgress(t,p,mode),mode)}
export function massBudget(t:Track,r:number[]){const initial=t.rows[0][C.mass],retained=r[C.mass];return {initial,retained,lost:Math.max(0,initial-retained)}}
export function stefanRadius(row:number[]){return Math.sqrt(10**row[C.lum])*(5772/10**row[C.teff])**2}
export function escapeSpeed(row:number[]){return Math.sqrt(2*1.3271244e20*row[C.mass]/(6.957e8*10**row[C.radius]))/1000}
export function peakWavelength(kelvin:number){return 2.897771955e6/kelvin}
export function displayRadius(logR:number,scale:'adaptive'|'linear',reference=1){return scale==='linear'?10**logR/reference:clamp(1.35+.30*logR,.62,2.3)}

export type Shell={id:'hydrogen'|'helium'|'carbon'|'oxygen'|'silicon'|'iron';mass:number;innerMass:number;outerMass:number;color:string}
export function massShells(row:number[]):Shell[] {
  const total=row[C.mass],he=clamp(row[C.heCore],0,total),co=clamp(row[C.coCore],0,he),o=clamp(row[C.oCore],0,co),si=clamp(row[C.siCore],0,o),fe=clamp(row[C.feCore],0,si)
  const specs=[['iron',0,fe,'#d7d9e2'],['silicon',fe,si,'#b39ccc'],['oxygen',si,o,'#7fc4cd'],['carbon',o,co,'#eac082'],['helium',co,he,'#f28c61'],['hydrogen',he,total,'#e4bb6f']] as const
  return specs.filter(([,a,b])=>b-a>1e-7).map(([id,a,b,color])=>({id,mass:b-a,innerMass:a,outerMass:b,color}))
}

export type XYZTable=number[][]
export function parseCIE(csv:string):XYZTable{return csv.trim().split(/\r?\n/).map(line=>line.split(',').map(Number)).filter(row=>row.length===4&&row.every(Number.isFinite))}
/** Planck spectrum integrated against CIE 1931 2° CMFs; relative XYZ -> linear sRGB, no photographic exposure. */
export function blackbodyRGB(temperature:number,cmf:XYZTable):[number,number,number] {
  let x=0,y=0,z=0;const T=clamp(temperature,1000,200000)
  for(const [nm,cx,cy,cz]of cmf){const m=nm*1e-9;const B=1/(m**5*Math.expm1(.01438776877/(m*T)));x+=B*cx;y+=B*cy;z+=B*cz}
  let r=3.2406*x-1.5372*y-.4986*z,g=-.9689*x+1.8758*y+.0415*z,b=.0557*x-.2040*y+1.057*z
  const max=Math.max(r,g,b,1e-30);r=Math.max(0,r/max);g=Math.max(0,g/max);b=Math.max(0,b/max)
  return [r,g,b]
}

export function hrPosition(logT:number,logL:number,width=420,height=250){return {x:42+(5.3-logT)/(5.3-3.35)*(width-62),y:16+(6.3-logL)/(6.3+1.5)*(height-46)}}
export function nearestHR(t:Track,x:number,y:number,width:number,height:number):number {
  let best=Infinity,index=0
  t.rows.forEach((r,i)=>{const p=hrPosition(r[C.teff],r[C.lum],width,height),d=(p.x-x)**2+(p.y-y)**2;if(d<best){best=d;index=i}})
  return index
}
