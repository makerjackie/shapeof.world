import type { DemandOD, Network, SimulationMetrics } from './types'
import { balanceThroughEntries, cityMovementShares } from './demand'
export const CAPACITY_METHOD = {
  version: 2, seed: 271828, stepSeconds: 1/30, warmupSeconds: 600, stageSeconds: 600, windowSeconds: 300,
  multipliers: [.5,1,1.5,2,2.5,3,4,5,6,8], turnShares: { left:.2,straight:.6,right:.2 },
  plateauTolerance:.05, confirmingStages:2,
  note:'40% turning where all turns exist; unavailable turns renormalized. Fixed OD proportions at each origin; 10-minute demand steps, last five minutes measured. Two successive <5% gains with oversupply and growing queues confirm saturation. Report highest full-window correctly delivered total and turning flows (separate windows); an unconfirmed run is only a lower bound. Not engineering capacity.'
} as const
export function capacityOD(network: Network): DemandOD[] {
  const rates=new Map(network.defaultOD!.map(r=>[r.movementId,r.vehiclesPerHour]))
  const lanes=new Map(network.lanes.map(l=>[l.id,l]))
  const rows=[...new Set(network.movements.map(m=>m.from))].flatMap(from=>{
    const moves=network.movements.filter(m=>m.from===from),total=moves.reduce((s,m)=>s+(rates.get(m.id)??0),0)
    // Equal left/right weights, independent of the display scenario's loop load.
    const directDestinations=new Set(moves.filter(m=>m.turn==='straight'&&m.lanes.every(id=>lanes.get(id)?.kind==='main')).map(m=>m.to))
    // A ramp-through path that exits then rejoins the same motorway is an
    // alternative route, not another O-D. Keep it for conflict diagrams, but
    // don't send a third of all motorway through demand around that detour.
    const shares=cityMovementShares(moves.map(m=>({...m,weight:m.turn==='straight'&&directDestinations.has(m.to)&&m.lanes.some(id=>lanes.get(id)?.kind!=='main')?0:1})),CAPACITY_METHOD.turnShares)
    return moves.map(m=>({movementId:m.id,vehiclesPerHour:total*shares.get(m.id)!}))
  })
  balanceThroughEntries(network,rows)
  return rows
}
export function turningThroughput(network: Network, metrics: SimulationMetrics): number {
  return network.movements.reduce((sum,m)=>sum+(m.turn==='straight'?0:metrics.throughputByMovement[m.id]??0),0)
}
export interface CapacityStage { multiplier:number; demand:number; total:number; turning:number; delay:number; queue:number; queueGrowth:number; backlogSeconds:number; missed:number }
export function isPlateau(stages: CapacityStage[]): boolean {
  const count = CAPACITY_METHOD.confirmingStages
  if(stages.length<count+1)return false
  return stages.slice(-count).every((stage,i)=>{
    const previous=stages[stages.length-count-1+i]
    return stage.total<=previous.total*(1+CAPACITY_METHOD.plateauTolerance) && stage.demand>stage.total*1.2 && stage.queueGrowth>0 &&
      (stage.delay>stages[0].delay+5 || stage.backlogSeconds>30)
  })
}
