import { describe, expect, it } from 'vitest'
import { atmosphere, AIR, compressorStages, DEFAULT_SETTINGS, engineCycle, nozzle, PRESETS } from './model'

describe('reference turbofan energy and momentum', () => {
  it('resolves a standard atmosphere and a continuous tropopause', () => {
    expect(atmosphere(0).pressure).toBeCloseTo(101325)
    expect(atmosphere(11000).temperature).toBeCloseTo(216.65)
    expect(atmosphere(11000).pressure).toBeCloseTo(atmosphere(11000.001).pressure, 0)
  })
  it('balances both shaft powers independently', () => {
    for (const { settings } of PRESETS) {
      const s = engineCycle(settings)
      expect(s.hptPower).toBeCloseTo(s.compressorPower, 5)
      expect(s.lptPower).toBeCloseTo(s.fanPower, 5)
      expect(s.thrust).toBeCloseTo(s.coreThrust + s.fanThrust, 6)
      expect(s.bypassFlow).toBeCloseTo(s.coreFlow * settings.bypass)
    }
  })
  it('preserves total pressure and temperature ordering through each component', () => {
    const s = engineCycle(DEFAULT_SETTINGS)
    const [inlet, fan, compressor, burner, hpt, lpt] = s.stations
    expect(fan.pressure).toBeGreaterThan(inlet.pressure)
    expect(compressor.pressure).toBeGreaterThan(fan.pressure)
    expect(burner.temperature).toBeGreaterThan(compressor.temperature)
    expect(burner.pressure).toBeLessThan(compressor.pressure)
    expect(hpt.temperature).toBeLessThan(burner.temperature)
    expect(lpt.temperature).toBeLessThan(hpt.temperature)
    expect(s.feasible).toBe(true)
  })
  it('includes pressure thrust for a choked nozzle and none for an unchoked nozzle', () => {
    const a = nozzle(400, 140000, 101325, 20)
    expect(a.choked).toBe(false)
    expect(a.pressureThrust).toBe(0)
    const b = nozzle(600, 400000, 101325, 20)
    expect(b.choked).toBe(true)
    expect(b.pressureThrust).toBeGreaterThan(0)
    expect(b.speed / Math.sqrt(AIR.gamma * AIR.R * 600 / 1.2)).toBeCloseTo(Math.sqrt(.98), 4)
    expect(nozzle(300, 90000, 101325, 20).speed).toBe(0)
  })
  it('changes fuel, momentum and mass flow under physically meaningful interventions', () => {
    const full = engineCycle({ ...DEFAULT_SETTINGS, throttle: 1 })
    const low = engineCycle({ ...DEFAULT_SETTINGS, throttle: .3 })
    expect(full.thrust).toBeGreaterThan(low.thrust)
    expect(full.fuelFlow).toBeGreaterThan(low.fuelFlow)
    const high = engineCycle({ ...DEFAULT_SETTINGS, altitude: 11000 })
    expect(high.coreFlow).toBeLessThan(full.coreFlow)
    const turbojet = engineCycle({ ...DEFAULT_SETTINGS, bypass: 0 })
    expect(turbojet.fanThrust).toBe(0)
    expect(turbojet.fanPower).toBeGreaterThan(0) // The core still passes the fan stage.
  })
  it('remains finite over the entire control envelope, exposing infeasible cycles', () => {
    for (const throttle of [.1, .5, 1]) for (const bypass of [0, 8, 12]) for (const altitude of [0, 11000, 12000]) {
      const s = engineCycle({ ...DEFAULT_SETTINGS, throttle, bypass, altitude })
      for (const n of [s.thrust, s.fuelFlow, s.fanPower, ...s.stations.map(p => p.temperature)]) expect(Number.isFinite(n)).toBe(true)
    }
  })
  it('allocates stage states without inventing or losing compressor work', () => {
    const cycle = engineCycle(DEFAULT_SETTINGS), stages = compressorStages(cycle)
    expect(stages.length).toBe(9)
    expect(stages.at(-1)!.temperature).toBeCloseTo(cycle.stations[2].temperature, 8)
    expect(stages.at(-1)!.pressure).toBeCloseTo(cycle.stations[2].pressure, 5)
    expect(stages.reduce((sum, stage) => sum + stage.power, 0)).toBeCloseTo(cycle.compressorPower, 5)
    for (let i = 1; i < stages.length; i++) expect(stages[i].pressure).toBeGreaterThan(stages[i - 1].pressure)
  })
})
