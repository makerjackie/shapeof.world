import { TrafficSimulation } from '../sim/simulation'
import { signalState } from '../sim/control'
import type { Network, Vec3 } from '../sim/types'
import { distance } from '../designs/kit'

export type DemoStatus = 'driving' | 'red' | 'yield' | 'queue' | 'done' | 'loading' | 'failed'
export interface DemoSample { at: number; time: number; position: Vec3; tangent: Vec3; status: DemoStatus; laneId: string; speed: number; others?: number[] }
export interface DemoReplay { movementId: string; samples: DemoSample[]; duration: number; complete: boolean }
export interface DemoState extends DemoSample { progress: number }
export const DEMO_STATUS: Record<DemoStatus,string> = {driving:'示范车行驶中',red:'红灯 · 在停止线前等候',yield:'绿灯 · 等对向直行的空当',queue:'等前车或合流空当',done:'已走完全程',loading:'正在准备示范车',failed:'本次示范未能驶出，可重播'}

/** An isolated seeded simulation, using the SAME IDM/MOBIL/signals and road
 * graph as ambient traffic. It never changes live queues or measured capacity.
 * Keep a small deterministic background for gap acceptance at city junctions.
 * Only the time axis is compressed for the explanatory replay. */
export function recordDemo(network: Network, movementId: string): DemoReplay {
  const movement = network.movements.find(m=>m.id===movementId)!
  const sim = new TrafficSimulation(network,{demandMultiplier:network.control.kind==='free'?0:.2,seed:18181})
  const sameDestination=()=>{const current=sim.movementMap.get(car.movementId)!;return current.from===movement.from&&current.to===movement.to&&current.turn===movement.turn}
  const first = sim.laneMap.get(movement.lanes[0])!
  const car = sim.createVehicle(movementId,{speed:Math.min(first.speedLimit,18)})
  // Start far enough into a red phase that the north/east/etc demonstration
  // reaches a red signal. This changes the replay epoch, not the signal plan.
  if(network.control.kind==='signal') {
    const travel=first.length/Math.min(first.speedLimit,18)
    for(let t=0;t<180;t++) if(signalState(network.control,t,movement.signalGroup??movement.from)==='red'&&signalState(network.control,t+travel,movement.signalGroup??movement.from)==='red') {sim.time=t;break}
  }
  if(network.id==='crossroads-signal'&&movement.turn==='left') {
    const opposite=network.movements.find(m=>m.from===({north:'south',south:'north',east:'west',west:'east'} as Record<string,string>)[movement.from]&&m.turn==='straight')
    if(opposite){const incoming=sim.laneMap.get(opposite.lanes[0])!;for(let n=0;n<5;n++)sim.createVehicle(opposite.id,{s:incoming.length-18-n*22,speed:0})}
  }
  const samples:DemoSample[]=[]
  let at=0, last:DemoSample|undefined, active=true
  for(let i=0;i<18000;i++) {
    if(i%6===0) {
      const pose=sim.sampleVehicle(car)
      const color=signalState(network.control,sim.time,movement.signalGroup??movement.from)
      const status:DemoStatus=car.v<.8 ? car.permissiveWaiting&&!car.admitted?'yield':color!=='green'&&!car.admitted?'red':'queue':'driving'
      const sample:DemoSample={at,time:sim.time,...pose,status,laneId:car.laneId,speed:car.v,
        others:network.control.kind==='free'?undefined:sim.vehicles.filter(v=>v!==car).flatMap(v=>{const p=sim.sampleVehicle(v);return [v.id,p.position.x,p.position.y,p.position.z,Math.atan2(p.tangent.x,p.tangent.z),v.length,v.width]})}
      if(last) {
        // Highway leads fast-forward; turning and waiting remain readable.
        const d=distance(last.position,pose.position), lane=sim.laneMap.get(car.laneId)!
        const presentationSpeed=lane.kind==='connector'?12:lane.id.startsWith('loop-')?42:lane.kind==='ramp'?85:lane.kind==='urban'?100:310
        at+=d<.06?.2/5:Math.max(.2/14,d/presentationSpeed)
        sample.at=at
      }
      samples.push(sample);last=sample
    }
    sim.step(1/30)
    if(!sim.vehicles.includes(car)){active=false;break}
    // A misrouted car must never silently stand in for the requested path.
    if(!sameDestination())break
  }
  // A brief real gap can be invisible at compressed speed. Stretch a stopped
  // interval to a readable minimum without inventing a stop or a signal state.
  for(let i=0;i<samples.length-1;){
    const status=samples[i].status
    if(status==='driving'){i++;continue}
    let end=i+1;while(end<samples.length-1&&samples[end].status===status)end++
    const old=samples[end].at-samples[i].at,min=status==='yield'?2.2:status==='red'?2.5:1
    if(old<min&&old>0){const extra=min-old,start=samples[i].at;for(let j=i+1;j<=end;j++)samples[j].at=start+(samples[j].at-start)*min/old;for(let j=end+1;j<samples.length;j++)samples[j].at+=extra;at+=extra}
    i=end
  }
  return {movementId,samples,duration:at,complete:!active && sameDestination()}
}

export function replayAt(replay:DemoReplay, at:number):DemoState {
  const samples=replay.samples
  let lo=0,hi=samples.length-1
  while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(samples[mid].at<=at)lo=mid;else hi=mid-1}
  const a=samples[lo],b=samples[Math.min(lo+1,samples.length-1)]
  const t=Math.min(1,Math.max(0,(at-a.at)/Math.max(.0001,b.at-a.at)))
  return {...a,at,time:a.time+(b.time-a.time)*t,position:{x:a.position.x+(b.position.x-a.position.x)*t,y:a.position.y+(b.position.y-a.position.y)*t,z:a.position.z+(b.position.z-a.position.z)*t},tangent:b.tangent,
    status:at>=replay.duration?replay.complete?'done':'failed':a.status,progress:Math.min(1,at/Math.max(.01,replay.duration))}
}
