import { describe, expect, it } from 'vitest'
import { DESIGNS } from './designs'
const createNetwork=(id:string)=>DESIGNS.find(design=>design.id===id)!.build()
import { TrafficSimulation } from './sim/simulation'
import type { Vehicle, Lane } from './sim/types'
interface Body { vehicle:Vehicle; s:number }
interface Leader { gap:number; speed:number; vehicle?:Vehicle }
interface Index { bodies:Map<string,Body[]>; laneMap:Map<string,Lane>; predecessors:Map<string,string[]>; leader:typeof linearLeader; follower:typeof linearFollower }
// The previous linear lookup is an independent oracle. Exact vehicle equality
// protects lane-change safety, tie ordering and seeded replay, not just averages.
function linearLeader(this: Index, vehicle: Vehicle, laneId = vehicle.laneId, s = vehicle.s, route = vehicle.route, routeIndex = vehicle.routeIndex): Leader {
    let result: Leader = { gap: Infinity, speed: vehicle.v }
    for (const body of this.bodies.get(laneId) ?? []) {
      if (body.vehicle.id === vehicle.id || body.s < s - 1e-7) continue
      const gap = body.s - body.vehicle.length - s
      if (gap < result.gap) result = { gap, speed: body.vehicle.v, vehicle: body.vehicle }
      break
    }
    if (result.vehicle) return result
    let offset = this.laneMap.get(laneId)!.length - s
    for (let i = routeIndex + 1; i < route.length && offset < 220; i++) {
      if (!this.laneMap.get(route[i - 1])!.next.includes(route[i])) break
      for (const body of this.bodies.get(route[i]) ?? []) {
        if (body.vehicle.id === vehicle.id) continue
        const gap = offset + body.s - body.vehicle.length
        if (gap < result.gap) result = { gap, speed: body.vehicle.v, vehicle: body.vehicle }
        break
      }
      if (result.vehicle) break
      offset += this.laneMap.get(route[i])!.length
    }
    return result
  }

  /** Nearest following front, including cars just before a longitudinal node. */
function linearFollower(this: Index, vehicle: Vehicle, laneId: string, s: number): Body | undefined {
    let nearest: Body | undefined
    const inspect = (id: string, offset: number, next?: string) => {
      const bodies = this.bodies.get(id) ?? []
      for (let index = bodies.length - 1; index >= 0; index--) {
        const body = bodies[index], position = body.s - offset
        if (body.vehicle.id === vehicle.id || position >= s) continue
        if (next && body.vehicle.route[body.vehicle.routeIndex + 1] !== next && body.vehicle.laneChange?.fromLaneId !== id) continue
        if (!nearest || position > nearest.s) nearest = { vehicle: body.vehicle, s: position }
        break
      }
    }
    inspect(laneId, 0)
    if (nearest || s >= 220) return nearest
    const pending = [{ id: laneId, offset: 0 }], visited = new Set([laneId])
    while (pending.length) {
      const current = pending.shift()!
      for (const id of this.predecessors.get(current.id) ?? []) {
        if (visited.has(id)) continue
        visited.add(id)
        const offset = current.offset + this.laneMap.get(id)!.length
        inspect(id, offset, current.id)
        if (s + offset < 220) pending.push({ id, offset })
      }
    }
    return nearest
  }


describe('ordered lane lookup preserves deterministic driving',()=>{
  for(const id of ['cloverleaf','huangjuewan','crossroads-signal','ddi'])it(id,()=>{
    const fast=new TrafficSimulation(createNetwork(id),{seed:271828,demandMultiplier:2.5})
    const reference=new TrafficSimulation(createNetwork(id),{seed:271828,demandMultiplier:2.5})
    const index=reference as unknown as Index
    index.leader=linearLeader;index.follower=linearFollower
    for(let block=0;block<8;block++){
      fast.advance(30);reference.advance(30)
      expect(fast.vehicles).toEqual(reference.vehicles)
      expect(fast.refreshMetrics()).toEqual(reference.refreshMetrics())
    }
  },60000)
})
