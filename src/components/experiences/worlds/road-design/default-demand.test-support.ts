import { describe, expect, it } from 'vitest'
import { DESIGNS } from './designs'
import { TrafficSimulation } from './sim/simulation'

export function defaultDemandRegression(ids: string[]) {
describe('unchanged default OD at 1×',()=>{
 for(const design of DESIGNS.filter(d=>ids.includes(d.id)))it(`${design.id}: steady correctly delivered flow is within 10% of demand`,async()=>{
  const sim=new TrafficSimulation(design.build(),{seed:271828,demandMultiplier:1})
  sim.warmup(600);sim.resetMetrics()
  let completed=0
  for(let window=0;window<6;window++){
   sim.advance(300)
   completed+=sim.metricsWindow.completions.filter(c=>c.time>sim.time-300&&c.delivered!==false).length
   // Check all lane neighbours, and nonnegative finite speeds, at each full window.
   const lanes=new Map<string,typeof sim.vehicles>()
   for(const car of sim.vehicles){
    expect(Number.isFinite(car.v)&&car.v>=0).toBe(true)
    if(car.v<.1&&car.waitingSince!==undefined)expect(sim.time-car.waitingSince,`${design.id}: ${car.movementId} waiting on ${car.laneId}`).toBeLessThan(300)
    const list=lanes.get(car.laneId)??[];list.push(car);lanes.set(car.laneId,list)
   }
   for(const list of lanes.values()){list.sort((a,b)=>a.s-b.s);for(let i=1;i<list.length;i++)expect(list[i].s-list[i].length-list[i-1].s).toBeGreaterThanOrEqual(-.05)}
   await new Promise(resolve=>setTimeout(resolve,0))
  }
  const throughput=completed*2,error=Math.abs(throughput-sim.totalDemand)/sim.totalDemand
  console.info(`Default OD ${design.id}: demand ${sim.totalDemand.toFixed(0)}, delivered ${throughput}, error ${(error*100).toFixed(2)}%, queue ${sim.outsideQueue}`)
  expect(error).toBeLessThanOrEqual(.1)
 },180000)
})

}
