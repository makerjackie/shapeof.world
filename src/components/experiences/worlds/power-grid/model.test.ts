import { describe, expect, it } from 'vitest'
import { DEFAULT, simulate, sampleAt } from './model'
describe('coherent-area frequency dynamics', () => {
  it('stays exactly at 50 Hz without a disturbance', () => {
    const r = simulate({ ...DEFAULT, lossMW: 0 })
    expect(r.samples.every(s => s.hz === 50 && s.shedMW === 0 && s.mechanicalMW === 0)).toBe(true)
  })
  it('matches the analytical initial swing slope and doubles it at half the inertia', () => {
    const a = simulate(DEFAULT), b = simulate({ ...DEFAULT, inertia: 2.5 })
    expect(a.initialRocof).toBeCloseTo(-.5, 10)
    expect(b.initialRocof).toBeCloseTo(a.initialRocof * 2, 10)
    expect(sampleAt(b, .1).hz).toBeLessThan(sampleAt(a, .1).hz)
  })
  it('droop leaves an offset without AGC; secondary control restores nominal', () => {
    const a = simulate({ ...DEFAULT, agc: false, protection: false }), b = simulate({ ...DEFAULT, protection: false })
    expect(a.samples.at(-1)!.hz).toBeCloseTo(50 - 50 * .1 / (1 + 1 / .05), 3)
    expect(Math.abs(b.samples.at(-1)!.hz - 50)).toBeLessThan(.02)
    expect(Math.max(...b.samples.map(s => s.mechanicalMW))).toBeLessThanOrEqual(DEFAULT.reserveMW)
  })
  it('low inertia triggers delayed, latched load shedding; disabling it does not', () => {
    const a = simulate({ ...DEFAULT, inertia: 1.5 }), b = simulate({ ...DEFAULT, inertia: 1.5, protection: false })
    expect(a.events.some(e => e.type === 'shed')).toBe(true)
    expect(a.events.filter(e => e.type === 'shed').every(e => e.t >= .2 && e.hz < 49)).toBe(true)
    expect(b.events).toHaveLength(1)
    expect(a.samples.at(-1)!.shedMW).toBeGreaterThan(0)
    expect(Math.abs(a.samples.at(-1)!.hz - 50)).toBeLessThan(.02)
    const firstRelay = a.events.find(e => e.type === 'shed')!
    expect(sampleAt(a, firstRelay.t - .001).shedMW).toBe(0)
    expect(sampleAt(a, firstRelay.t).shedMW).toBe(500)
  })
  it('converges under half steps and respects limited reserve', () => {
    const a = simulate(DEFAULT), b = simulate(DEFAULT, .005)
    expect(Math.abs(a.nadir.hz - b.nadir.hz)).toBeLessThan(.002)
    const c = simulate({ ...DEFAULT, reserveMW: 400 })
    expect(Math.max(...c.samples.map(s => s.mechanicalMW))).toBeLessThanOrEqual(400.001)
    expect(c.events.filter(e => e.type === 'shed').length).toBeGreaterThan(0)
  })
})
