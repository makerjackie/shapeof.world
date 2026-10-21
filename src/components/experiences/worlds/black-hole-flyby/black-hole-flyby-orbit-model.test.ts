import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

const demo = readFileSync(resolve('public/vendor/black-hole/demo.html'), 'utf8')
const solverSource = demo.slice(
  demo.indexOf('        function findJourneyClosestRadius('),
  demo.indexOf('        function applyScene(index)'),
)
const closestRadius = new Function(`${solverSource}; return findJourneyClosestRadius;`)() as (
  radius: number, energy: number, momentum: number,
) => number | null

type UpstreamOrbit = {
  r: number
  e: number
  l: number
  startRadius: { setValue(value: number): void }
  startDirection: { setValue(value: number): void }
  startSpeed: { setValue(value: number): void }
}

function initialOrbit(requestedRadius: number) {
  const context: { BlackHoleShaderDemoApp?: { model: UpstreamOrbit } } = {}
  runInNewContext(readFileSync(resolve('vendor/black-hole-shader/black_hole/demo/model/model.js'), 'utf8'), context)
  const { model } = context.BlackHoleShaderDemoApp!
  model.startRadius.setValue(requestedRadius)
  model.startDirection.setValue(0.35)
  model.startSpeed.setValue(0.2)
  return model
}

const radialSpeedSquared = (r: number, energy: number, momentum: number) => (
  energy * energy - (1 - 1 / r) * (1 + momentum * momentum / (r * r))
)

describe('black-hole flyby geodesic turning point', () => {
  it.each([42, 86])('solves the actual upstream-quantized orbit requested at r=%s', (requestedRadius) => {
    const model = initialOrbit(requestedRadius)
    const closest = closestRadius(model.r, model.e, model.l)!
    // Both requested radii are capped by Bruneton’s r<=40 camera control.
    expect(model.r).toBe(40)
    expect(closest).toBeCloseTo(5.83806, 4)
    expect(Math.abs(radialSpeedSquared(closest, model.e, model.l))).toBeLessThan(1e-12)
    expect(radialSpeedSquared(closest + 0.01, model.e, model.l)).toBeGreaterThan(0)
    expect(radialSpeedSquared(closest - 0.01, model.e, model.l)).toBeLessThan(0)
  })

  it('returns the first inward root when more than one exterior root exists', () => {
    const energy = 1.01
    const momentum = 4
    const closest = closestRadius(80, energy, momentum)!
    expect(closest).toBeGreaterThan(10)
    expect(Math.abs(radialSpeedSquared(closest, energy, momentum))).toBeLessThan(1e-12)
    expect(radialSpeedSquared(closest + 0.01, energy, momentum)).toBeGreaterThan(0)
    expect(radialSpeedSquared(closest - 0.01, energy, momentum)).toBeLessThan(0)
  })

  it('does not invent an exterior turning point for capture or invalid inputs', () => {
    expect(closestRadius(40, 1.1, 0)).toBeNull()
    expect(closestRadius(1, 1, 4)).toBeNull()
    expect(closestRadius(40, Number.NaN, 4)).toBeNull()
  })
})
