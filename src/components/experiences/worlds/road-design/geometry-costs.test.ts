import { describe, expect, it } from 'vitest'
import { measureGeometry } from './sim/geometry-costs'
import { terrainHeight } from './sim/terrain'
import type { Network, TerrainGrid } from './sim/types'
import { DESIGNS } from './designs'
import capacities from './data/capacity.json'
import { CAPACITY_METHOD, isPlateau } from './sim/capacity-study'

describe('geometric cost measurements', () => {
  const terrain: TerrainGrid = { originX: 0, originZ: 0, step: 10, width: 2, height: 2, values: [0, 2, 4, 6] }
  it('interpolates terrain in both axes and clamps the map boundary', () => {
    expect(terrainHeight(terrain, 5, 5)).toBe(3)
    expect(terrainHeight(terrain, 10, 5)).toBe(4)
    expect(terrainHeight(terrain, -20, 20)).toBe(4)
  })
  it('measures a sloping deck and clips bridge area at 2.5 m above ground', () => {
    const network: Network = { id: 'cost-test', lanes: [], movements: [], schematicMovements: [], weaving: [], control: { kind: 'free' }, carriageways: [{ id: 'ramp', points: [{ x: 0, y: 0, z: 0 }, { x: 10, y: 4, z: 0 }], laneCount: 1, laneWidth: 4, speedLimit: 10, bridge: true, level: 1, kind: 'ramp' }] }
    const costs = measureGeometry(network)
    expect(costs.maximumHeight).toBe(4)
    expect(costs.rampLength).toBeCloseTo(Math.hypot(10, 4))
    expect(costs.bridgeArea).toBeCloseTo(Math.hypot(10, 4) * 4 * 0.375)
    expect(costs.hullArea).toBeCloseTo(40)
    const raisedGround = { ...network, terrain: { ...terrain, values: [2, 2, 2, 2] } }
    expect(measureGeometry(raisedGround).maximumHeight).toBe(2)
    expect(measureGeometry(raisedGround).bridgeArea).toBe(0)
  })
  it('does not change the core footprint when remote motorway leads are extended', () => {
    for (const id of ['cloverleaf', 'turbine', 'stack', 'diamond']) {
      const network = DESIGNS.find(d=>d.id===id)!.build(), before=measureGeometry(network).landArea
      for (const road of network.carriageways.filter(r=>r.kind==='main')) {
        road.points=road.points.map(p=>Math.hypot(p.x,p.z)>1400 ? {...p,x:p.x*2,z:p.z*2} : p)
      }
      expect(measureGeometry(network).landArea).toBeCloseTo(before, 3)
    }
  })
  it('does not fill the open quadrants of directional interchange leads', () => {
    for (const id of ['stack','turbine']) {
      const costs=measureGeometry(DESIGNS.find(d=>d.id===id)!.build())
      expect(costs.landArea).toBeLessThan(costs.hullArea * .5)
    }
    expect(measureGeometry(DESIGNS.find(d=>d.id==='crossroads-signal')!.build()).landArea).toBeLessThan(20000)
  })
  it('ships measured full-window capacities for the current fourteen geometries and OD tables', () => {
    expect(Object.keys(capacities.designs).sort()).toEqual(DESIGNS.map(d=>d.id).sort())
    expect(capacities.method).toEqual(CAPACITY_METHOD)
    for (const design of DESIGNS) {
      const network=design.build(), row=capacities.designs[design.id as keyof typeof capacities.designs]
      expect(row.landAreaM2).toBeCloseTo(measureGeometry(network).landArea, 1)
      expect(row.defaultDemand).toBeCloseTo(network.defaultOD!.reduce((n,r)=>n+r.vehiclesPerHour,0))
      expect(row.vehiclesPerHour).toBeGreaterThan(0)
      expect(row.vehiclesPerHour).toBe(Math.max(...row.stages.map(stage=>stage.total)))
      expect(row.turningVehiclesPerHour).toBe(Math.max(...row.stages.map(stage=>stage.turning)))
      expect(row.status==='saturated').toBe(isPlateau(row.stages))
      for (const stage of row.stages) expect(stage.turning).toBeLessThanOrEqual(stage.total)
    }
  })
})
