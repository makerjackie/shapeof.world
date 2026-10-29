import { describe, expect, it } from 'vitest'
import { advance, amplitude, dailyRate, DEFAULT_SETTINGS, escapeAdvance, frequency, indicationSeconds, initialState, TRAIN_MESHES, wheelAngle, WHEELS, wind } from './model'

describe('original 4 Hz hand-wound movement', () => {
  it('satisfies every signed gear ratio and pitch-center distance', () => {
    for (const mesh of TRAIN_MESHES) {
      const a = WHEELS.find(w => w.id === mesh.driver)!
      const b = WHEELS.find(w => w.id === mesh.driven)!
      expect(b.ratio / a.ratio).toBeCloseTo(-mesh.driving / mesh.pinion, 10)
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeCloseTo(mesh.module * (mesh.driving + mesh.pinion) / 2, 10)
    }
  })
  it('counts 28,800 half-swings per hour, 16 escape turns per minute, one fourth-wheel turn per minute', () => {
    const state = advance(initialState(), 60, DEFAULT_SETTINGS)
    expect(state.beats).toBe(480)
    expect(state.indicated).toBe(60)
    const fourth = WHEELS.find(w => w.id === 'fourth')!
    const escape = WHEELS.find(w => w.id === 'escape')!
    expect((wheelAngle(fourth, state) - fourth.phase) / (Math.PI * 2)).toBeCloseTo(-1)
    expect((wheelAngle(escape, state) - escape.phase) / (Math.PI * 2)).toBeCloseTo(16)
    expect(advance(initialState(), 3600, DEFAULT_SETTINGS).beats).toBe(28800)
  })
  it('holds the train while a pallet locks and releases exactly one half-tooth per beat', () => {
    const state = initialState()
    expect(escapeAdvance({ ...state, beats: 17, phase: .3 })).toBe(18)
    expect(escapeAdvance({ ...state, beats: 17, phase: .9 })).toBe(18)
    expect(escapeAdvance({ ...state, beats: 18, phase: 0 })).toBe(18)
  })
  it('drives hands and center wheel from the same release interpolation', () => {
    const center = WHEELS.find(w => w.id === 'center')!
    const state = { ...initialState(), beats: 331, phase: .09 }
    expect(wheelAngle(center, state) - center.phase).toBeCloseTo(-indicationSeconds(state) / 3600 * Math.PI * 2, 12)
  })
  it('slows down as the effective spring length or balance inertia increases', () => {
    expect(frequency(DEFAULT_SETTINGS)).toBe(4)
    expect(frequency({ ...DEFAULT_SETTINGS, length: 4 })).toBe(2)
    expect(frequency({ ...DEFAULT_SETTINGS, inertia: 4 })).toBe(2)
    expect(dailyRate(DEFAULT_SETTINGS)).toBe(0)
    expect(dailyRate({ ...DEFAULT_SETTINGS, length: 1.01 })).toBeLessThan(0)
  })
  it('conserves the reference energy store and stops at empty, even for a very large time jump', () => {
    const full = { ...initialState(), reserve: 1 }
    const empty = advance(full, 50 * 3600, DEFAULT_SETTINGS)
    expect(empty.reserve).toBe(0)
    expect(empty.elapsed).toBe(40 * 3600)
    expect(advance(empty, 1, DEFAULT_SETTINGS)).toBe(empty)
    expect(amplitude(empty, DEFAULT_SETTINGS)).toBe(0)
    expect(wind(empty, 24).reserve).toBe(1)
  })
  it('uses load for reserve and amplitude without inventing an intrinsic rate change', () => {
    const settings = { ...DEFAULT_SETTINGS, friction: 2 }
    const state = advance({ ...initialState(), reserve: 1 }, 3600, settings)
    expect(state.reserve).toBeCloseTo(.95)
    expect(state.indicated).toBe(3600)
    expect(amplitude(state, settings)).toBeLessThan(amplitude(state, DEFAULT_SETTINGS))
  })
  it('keeps results independent of animation-frame subdivision', () => {
    let stepped = initialState()
    for (let i = 0; i < 1000; i++) stepped = advance(stepped, .01, DEFAULT_SETTINGS)
    const direct = advance(initialState(), 10, DEFAULT_SETTINGS)
    expect(stepped.elapsed).toBeCloseTo(direct.elapsed, 8)
    expect(stepped.beats + stepped.phase).toBeCloseTo(direct.beats + direct.phase, 8)
  })
})
