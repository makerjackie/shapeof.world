import { describe, expect, it } from 'vitest'
import { advance, aerodynamic, AREA, BETZ, DEFAULT_INPUTS, initialState, PLANETARY, FINAL_MESH, polar, readings, restart, sectionSample, SECTIONS, SPEC, TAU } from './model'

describe('5 MW reference turbine teaching model', () => {
  it('uses assembleable planetary tooth counts and exactly 97:1 overall speed increase', () => {
    let ratio = 1
    for (const stage of PLANETARY) {
      const planet = (stage.ring - stage.sun) / 2
      expect(Number.isInteger(planet)).toBe(true)
      expect((stage.ring + stage.sun) % 3).toBe(0)
      expect(stage.sun + 2 * planet).toBe(stage.ring)
      ratio *= 1 + stage.ring / stage.sun
    }
    expect(ratio * FINAL_MESH.wheel / FINAL_MESH.pinion).toBe(SPEC.gearbox)
  })
  it('uses the reference blade dimensions, nonuniform radial stations and actual polars', () => {
    expect(SECTIONS).toHaveLength(19)
    expect(SECTIONS[0].chord).toBe(3.542)
    expect(SECTIONS.at(-1)!.span + SPEC.hubRadius).toBeCloseTo(63, 3)
    expect(polar(7, 0).cl).toBeGreaterThan(0)
    expect(polar(7, 0).cd).toBeGreaterThan(0)
    expect(AREA).toBeCloseTo(12468.981, 2)
  })
  it('produces finite, bounded Cp across wind, speed, pitch and yaw sweeps', () => {
    for (const wind of [0, 4, 9, 14, 24]) for (const omega of [.01, .5, 1, 1.5]) for (const pitch of [0, 8, 25, 90]) {
      const a = aerodynamic(omega, pitch, wind)
      expect(Number.isFinite(a.torque)).toBe(true)
      expect(a.cp).toBeLessThanOrEqual(BETZ + 1e-10)
      expect(a.elements.length).toBe(18)
    }
  })
  it('loses harvesting power with yaw misalignment and with feathering', () => {
    const omega = 10 * TAU / 60
    const facing = aerodynamic(omega, 0, 9)
    expect(aerodynamic(omega, 0, 9, 45).power).toBeLessThan(facing.power)
    expect(aerodynamic(omega, 85, 9).power).toBeLessThan(facing.power)
  })
  it('keeps displayed section angle identity consistent with the selected nodal twist and pitch', () => {
    const state = { ...initialState(), pitch: 12 }
    for (const index of [0, 10, 18]) {
      const e = sectionSample(state, DEFAULT_INPUTS, index)
      expect(e.alpha).toBeCloseTo(e.inflow - e.twist - state.pitch, 12)
      expect(e.r).toBeCloseTo(SECTIONS[index].span + SPEC.hubRadius, 12)
    }
    expect(sectionSample(state, DEFAULT_INPUTS, 0).cl).toBe(0)
  })
  it('keeps the 97:1 shaft ratio and exact instantaneous power ledger', () => {
    const r = readings(initialState(), DEFAULT_INPUTS)
    expect(r.generatorRPM / r.rotorRPM).toBeCloseTo(97, 12)
    expect(r.power).toBeCloseTo(r.electricalPower + r.generatorLoss + r.brakePower + r.storagePower, 6)
    expect(r.electricalPower).toBeLessThanOrEqual(5e6 + .0001)
  })
  it('settles near rated speed and 5 MW without exceeding the energy bound', () => {
    let s = initialState(); const input = { ...DEFAULT_INPUTS, wind: 14 }
    for (let i = 0; i < 160; i++) s = advance(s, 1, input)
    const r = readings(s, input)
    expect(s.trip).toBe(false)
    expect(r.rotorRPM).toBeCloseTo(12.1, 1)
    expect(r.electricalPower / 1e6).toBeCloseTo(5, 2)
    expect(s.pitch).toBeGreaterThan(0)
    expect(s.energyKWh).toBeGreaterThan(0)
  })
  it('applies finite yaw and pitch actuator rates', () => {
    const a = initialState(), b = advance(a, 1, { ...DEFAULT_INPUTS, direction: 90, autoPitch: false, manualPitch: 40 })
    expect(b.yaw - a.yaw).toBeCloseTo(.3, 8)
    expect(b.pitch - a.pitch).toBeCloseTo(8, 8)
  })
  it('feathers and stops on braking and latches high-wind shutdown until restart', () => {
    let s = initialState(); const input = { ...DEFAULT_INPUTS, brake: true }
    for (let i = 0; i < 40; i++) s = advance(s, 1, input)
    expect(s.omega).toBe(0); expect(s.pitch).toBe(90)
    const storm = advance({ ...initialState(), wind: 26 }, 1, { ...DEFAULT_INPUTS, wind: 26 })
    expect(storm.trip).toBe(true)
    expect(restart(storm, { ...DEFAULT_INPUTS, wind: 26 }).trip).toBe(true)
    expect(restart(storm, DEFAULT_INPUTS).trip).toBe(true)
    expect(restart({ ...storm, wind: 9 }, DEFAULT_INPUTS).trip).toBe(false)
  })
})
