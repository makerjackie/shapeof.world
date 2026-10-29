import data from './refrigerant-data.json'
export const TAU=2*Math.PI
export const SPEC={displacement:12e-6,baseRps:50,volumetricEfficiency:.8,airMassIndoor:.27,airMassOutdoor:.68,airCp:1006,indoorUA:650,outdoorUA:700,indoorFanW:28,outdoorFanW:42,roomAirCapacity:72000,roomMassCapacity:2e6,massCoupling:160,envelopeUA:95,windowUA:160,peopleW:150,solarW:350,etaIsentropic:.72} as const
export type Mode='cooling'|'heating'
export type ViewId='room'|'teardown'|'compressor'|'refrigerant'
export type PartId='indoor'|'outdoor'|'compressor'|'evaporator'|'condenser'|'valve'|'reversing'|'fan'
export type Inputs={mode:Mode;outside:number;setpoint:number;fan:number;maxSpeed:number;thermostat:boolean;window:number;curtains:boolean}
export const DEFAULT_INPUTS:Inputs={mode:'cooling',outside:35,setpoint:22,fan:1,maxSpeed:1,thermostat:true,window:0,curtains:false}
export type State={elapsed:number;room:number;mass:number;speed:number;integral:number;running:boolean;compressorTurns:number;fanTurns:number;outdoorFanTurns:number;energyKWh:number}
export function initialState(mode:Mode='cooling'):State{return{elapsed:0,room:mode==='cooling'?28:18,mass:mode==='cooling'?28:18,speed:1,integral:0,running:true,compressorTurns:0,fanTurns:0,outdoorFanTurns:0,energyKWh:0}}
export const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n))
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t
export function saturation(temperature:number){const samples=data.saturation,t=clamp(temperature,-35,70),i=Math.min(samples.length-2,Math.floor((t+35)/2.5)),u=(t-samples[i][0])/2.5,a=samples[i],b=samples[i+1];return{t,p:Math.exp(lerp(Math.log(a[1]),Math.log(b[1]),u)),hf:lerp(a[2],b[2],u),hg:lerp(a[3],b[3],u),sf:lerp(a[4],b[4],u),sg:lerp(a[5],b[5],u)}}
/** Offline HEOS/R32 surface. Enthalpies are interpolated first so first-law differences remain exact. */
export function properties(evaporating:number,condensing:number){
 const tc=clamp(condensing,20,70),te=clamp(evaporating,-35,Math.min(32.5,tc-7.5)),limited=Math.abs(tc-condensing)>.001||Math.abs(te-evaporating)>.001
 const i=Math.min(data.evaporating.length-2,Math.floor((te+35)/2.5)),j=Math.min(data.condensing.length-2,Math.floor((tc-20)/2.5)),u=(te-data.evaporating[i])/2.5,v=(tc-data.condensing[j])/2.5
 const corners=[data.cells[i][j],data.cells[i+1][j],data.cells[i][j+1],data.cells[i+1][j+1]]
 if(corners.some(c=>c===null))throw new Error('R32 property surface sampled outside its valid compression domain')
 const a=corners as number[][],value=(k:number)=>lerp(lerp(a[0][k],a[1][k],u),lerp(a[2][k],a[3][k],u),v)
 const low=saturation(te),high=saturation(tc),h1=value(0),h2s=value(1),h2=value(2),h3=value(3)
 return{te,tc,limited,low,high,h1,h2s,h2,h3,h4:h3,t1:te+5,t2:value(4),t3:tc-3,t4:te,rho1:value(5),s1:value(6),s2:value(7),s3:value(8),s4:value(9),x4:clamp((h3-low.hf)/(low.hg-low.hf),0,1),qCold:h1-h3,work:h2-h1,qHot:h2-h3}
}
function conductance(ua:number,capacity:number){return capacity*(1-Math.exp(-ua/capacity))}
export function machine(room:number,input:Inputs,speed:number){
 const active=speed>=.12,actual=active?speed:0,indoorCapacity=SPEC.airMassIndoor*input.fan*SPEC.airCp,outdoorCapacity=SPEC.airMassOutdoor*SPEC.airCp
 const indoorG=conductance(SPEC.indoorUA*input.fan**.8,indoorCapacity),outdoorG=conductance(SPEC.outdoorUA,outdoorCapacity)
 const source=input.mode==='cooling'?room:input.outside,sink=input.mode==='cooling'?input.outside:room,sourceG=input.mode==='cooling'?indoorG:outdoorG,sinkG=input.mode==='cooling'?outdoorG:indoorG
 let te=source-12,tc=sink+12,cycle=properties(te,tc),massFlow=0,residual=0
 for(let n=0;n<45;n++){
  cycle=properties(te,tc);massFlow=SPEC.displacement*SPEC.baseRps*SPEC.volumetricEfficiency*actual*cycle.rho1
  const targetTe=source-massFlow*cycle.qCold/sourceG,targetTc=sink+massFlow*cycle.qHot/sinkG
  residual=Math.max(Math.abs(te-targetTe),Math.abs(tc-targetTc));te=lerp(te,targetTe,.2);tc=lerp(tc,targetTc,.2)
 }
 cycle=properties(te,tc);massFlow=SPEC.displacement*SPEC.baseRps*SPEC.volumetricEfficiency*actual*cycle.rho1
 const cold=massFlow*cycle.qCold,compression=massFlow*cycle.work,hot=massFlow*cycle.qHot,indoorFan=SPEC.indoorFanW*input.fan**3,outdoorFan=active?SPEC.outdoorFanW:0,electrical=compression+indoorFan+outdoorFan
 const toRoom=(input.mode==='cooling'?-cold:hot)+indoorFan,toOutside=(input.mode==='cooling'?hot:-cold)+outdoorFan,useful=input.mode==='cooling'?-toRoom:toRoom
 const supply=room+toRoom/indoorCapacity
 return{...cycle,active,speed:actual,massFlow,cold,hot,compression,indoorFan,outdoorFan,electrical,toRoom,toOutside,supply,cop:active?Math.max(0,useful/electrical):0,rawColdCOP:cycle.qCold/cycle.work,rawHotCOP:cycle.qHot/cycle.work,residual,modelLimited:active&&(cycle.limited||residual>.5),indoorG,outdoorG}
}
export function readings(state:State,input:Inputs){const m=machine(state.room,input,state.speed),envelope=(SPEC.envelopeUA+SPEC.windowUA*input.window)*(input.outside-state.room),massGain=SPEC.massCoupling*(state.mass-state.room),solar=SPEC.solarW*(input.curtains?.12:1),roomNet=envelope+massGain+solar+SPEC.peopleW+m.toRoom;return{...m,envelope,massGain,solar,people:SPEC.peopleW,roomNet,roomRate:roomNet/SPEC.roomAirCapacity,massRate:SPEC.massCoupling*(state.room-state.mass)/SPEC.roomMassCapacity,compressorRPM:m.speed*SPEC.baseRps*60,indoorFanRPM:900*input.fan,outdoorFanRPM:m.active?800:0,temperatureError:input.mode==='cooling'?state.room-input.setpoint:input.setpoint-state.room}}
export function advance(previous:State,seconds:number,input:Inputs):State{
 if(!Number.isFinite(seconds)||seconds<=0)return previous
 const state={...previous};let left=Math.min(seconds,300)
 while(left>.000001){const dt=Math.min(left,1);left-=dt;const error=input.mode==='cooling'?state.room-input.setpoint:input.setpoint-state.room
  if(input.thermostat){if(state.running&&error<-.15)state.running=false;else if(!state.running&&error>.35)state.running=true}else state.running=true
  const demand=error/3+state.integral
  if(input.thermostat&&state.running&&(demand<1||error<0)&&(demand>0||error>0))state.integral=clamp(state.integral+error*dt/300,0,1)
  const target=state.running?input.maxSpeed*(input.thermostat?clamp(error/3+state.integral,.35,1):1):0
  state.speed+=(target-state.speed)*(1-Math.exp(-dt/1.5));if(state.speed<.001)state.speed=0
  const r=readings(state,input);state.room+=r.roomRate*dt;state.mass+=r.massRate*dt
  state.compressorTurns+=r.compressorRPM/60*dt;state.fanTurns+=r.indoorFanRPM/60*dt;state.outdoorFanTurns+=r.outdoorFanRPM/60*dt;state.energyKWh+=r.electrical*dt/3.6e6;state.elapsed+=dt
 }
 return state
}
export type Phase='vapor'|'mixture'|'liquid'
export function sampleCoil(c:ReturnType<typeof properties>,kind:'evaporator'|'condenser',progress:number){
 const t=clamp(progress,0,1),evap=kind==='evaporator',sat=evap?c.low:c.high,h=evap?lerp(c.h4,c.h1,t):lerp(c.h2,c.h3,t),quality=(h-sat.hf)/(sat.hg-sat.hf)
 const phase:Phase=quality<=0?'liquid':quality>=1?'vapor':'mixture'
 const temperature=phase==='mixture'?sat.t:evap?lerp(sat.t,c.t1,clamp((h-sat.hg)/(c.h1-sat.hg),0,1)):phase==='vapor'?lerp(sat.t,c.t2,clamp((h-sat.hg)/(c.h2-sat.hg),0,1)):lerp(sat.t,c.t3,clamp((sat.hf-h)/(sat.hf-c.h3),0,1))
 return{h,temperature,pressure:sat.p,quality:clamp(quality,0,1),phase}
}
export const SATURATION=data.saturation
