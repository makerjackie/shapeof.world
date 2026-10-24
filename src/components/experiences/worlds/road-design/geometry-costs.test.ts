import { describe, expect, it } from 'vitest'
import { measureGeometry } from './sim/geometry-costs'
import { terrainHeight } from './sim/terrain'
import type { Network, TerrainGrid } from './sim/types'

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
})
