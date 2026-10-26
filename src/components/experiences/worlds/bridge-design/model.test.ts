import { describe, expect, it } from 'vitest'
import { beamResponse, bridgeResponse, deckLoads, DEAD_LOAD, SPAN, RISE, SAG } from './model'

describe('bridge load paths: independent equilibrium and closed-form checks', () => {
  it('recovers simply supported central point-load and uniform-load solutions', () => {
    const b = beamResponse(.5, 320)
    expect(b.left).toBeCloseTo(DEAD_LOAD * SPAN / 2 + 160)
    expect(b.moment(60)).toBeCloseTo(DEAD_LOAD * SPAN ** 2 / 8 + 320 * SPAN / 4)
    expect(b.moment(0)).toBeCloseTo(0)
    expect(b.moment(120)).toBeCloseTo(0)
    expect(beamResponse(.5, 0, SPAN * 2).moment(SPAN)).toBeCloseTo(4 * beamResponse(.5, 0).moment(SPAN / 2))
  })
  it.each([0, .13, .5, .84, 1])('conserves force and moment at truck position %s', (p) => {
    const b = beamResponse(p, 320)
    expect(b.left + b.right).toBeCloseTo(DEAD_LOAD * SPAN + 320)
    expect(b.right * SPAN).toBeCloseTo(DEAD_LOAD * SPAN ** 2 / 2 + 320 * p * SPAN)
    const loads = deckLoads(p, 320)
    expect(loads.reduce((a, f) => a + f, 0)).toBeCloseTo(DEAD_LOAD * SPAN + 320)
    expect(loads.reduce((a, f, i) => a + f * i * 6, 0)).toBeCloseTo(DEAD_LOAD * SPAN ** 2 / 2 + 320 * p * SPAN)
  })
  it('three-hinged arch has zero crown moment and uniform-load H = wL²/8f', () => {
    const arch = bridgeResponse('arch', .5, 0)
    expect(arch.horizontal).toBeCloseTo(DEAD_LOAD * SPAN ** 2 / (8 * RISE))
    expect(arch.horizontal * RISE).toBeCloseTo(beamResponse(.5, 0).moment(SPAN / 2))
    expect(arch.members.filter(m => m.family === 'arch').every(m => m.force < 0)).toBe(true)
  })
  it.each([0, .23, .5, .91, 1])('suspension polygon balances every hanger and the ground at %s', (p) => {
    const s = bridgeResponse('suspension', p, 320)
    const cables = s.members.filter(m => m.family === 'cable')
    expect(cables[9].b[1]).toBeCloseTo(60 - SAG)
    for (let i = 1; i < cables.length; i++) {
      const before = cables[i - 1], after = cables[i]
      const v1 = s.horizontal * (before.b[1] - before.a[1]) / 6
      const v2 = s.horizontal * (after.b[1] - after.a[1]) / 6
      expect(v2 - v1).toBeCloseTo(s.loads[i])
      expect(after.force).toBeGreaterThan(0)
    }
    expect(s.towerLeft + s.towerRight - 2 * s.anchorUplift).toBeCloseTo(DEAD_LOAD * SPAN + 320)
  })
  it('stayed fan balances vertical panel loads, horizontal components and base moment', () => {
    const s = bridgeResponse('stayed', .2, 320)
    const stays = s.members.filter(m => m.family === 'cable')
    const vertical = stays.reduce((sum, m) => sum + m.force * 36 / Math.hypot(m.a[0], 36), 0)
    const horizontal = stays.reduce((sum, m) => sum + m.force * m.a[0] / Math.hypot(m.a[0], 36), 0)
    expect(vertical + s.loads[10]).toBeCloseTo(s.towerLeft)
    expect(horizontal * 36).toBeCloseTo(s.foundationMoment)
  })
})


describe('off-centre loading regressions', () => {
  it.each([0, .013, .37, .5, .81, 1])('arch posts conserve load and crown equilibrium at %s', p => {
    const a = bridgeResponse('arch', p, 640)
    const posts = a.members.filter(m => m.family === 'hanger')
    expect(-posts.reduce((s, m) => s + m.force, 0) + a.loads[0] + a.loads[20]).toBeCloseTo(DEAD_LOAD * SPAN + 640)
    expect(a.horizontal * RISE).toBeCloseTo(beamResponse(p, 640).moment(SPAN / 2))
  })
  it('reflecting the truck reflects tower reactions and all cable tensions', () => {
    const left = bridgeResponse('suspension', .173, 640)
    const right = bridgeResponse('suspension', .827, 640)
    expect(left.towerLeft).toBeCloseTo(right.towerRight)
    expect(left.horizontal).toBeCloseTo(right.horizontal)
    const a = left.members.filter(m => m.family === 'cable')
    const b = right.members.filter(m => m.family === 'cable').reverse()
    a.forEach((m, i) => expect(m.force).toBeCloseTo(b[i].force))
  })
  it('finds the interior zero-shear peak, including pure point load', () => {
    const b = beamResponse(.1, 320)
    const x = (b.left - 320) / DEAD_LOAD
    expect(b.maxMoment).toBeCloseTo(b.moment(x))
    const point = beamResponse(.37, 320, SPAN, 0)
    expect(point.maxMoment).toBeCloseTo(320 * (.37 * SPAN) * (.63 * SPAN) / SPAN)
  })
})
