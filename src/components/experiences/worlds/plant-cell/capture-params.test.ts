import { describe, expect, it } from 'vitest'
import { parseCaptureParams } from './capture-params'
import { createPhysiology } from './model'
import { ENTRY_SCALE } from './scale-model'

describe('read-only capture state', () => {
  it('starts both devices at the leaf while preserving molecular slow motion', () => {
    expect(parseCaptureParams('').scale).toBe(ENTRY_SCALE)
    expect(parseCaptureParams('', true).scale).toBe(ENTRY_SCALE)
    expect(parseCaptureParams('?scale=-7.4').inputs.timeScale).toBe(.001)
    expect(parseCaptureParams('?scale=-7.4&speed=60').inputs.timeScale).toBe(60)
    expect(parseCaptureParams('?speed=7').manualSpeed).toBe(false)
  })
  it('clamps finite inputs, wraps clock/azimuth, and keeps darkness and pause', () => {
    const result = parseCaptureParams('?scale=-99&light=0&speed=0&t=41.5&az=450&el=100&capture=1')
    expect(result.scale).toBe(-7.7)
    expect(result.inputs.I).toBe(0)
    expect(result.inputs.playing).toBe(false)
    expect(result.daySeconds).toBe(17.5 * 3600)
    expect(result.orbit?.azimuth).toBeCloseTo(Math.PI / 2)
    expect(result.orbit?.elevation).toBeCloseTo(70 * Math.PI / 180)
    expect(result.capture).toBe(true)
    const state = createPhysiology(result.inputs, result.daySeconds)
    expect(state.daySeconds).toBe(result.daySeconds)
    expect(state.actualPPFD).toBe(0)
    expect(state.simulationSeconds).toBe(0) // Clock selection does not invent elapsed adaptation.
  })
  it('ignores malformed and empty numbers', () => {
    const result = parseCaptureParams('?scale=NaN&light=Infinity&t=&az=no&el=')
    expect(result.scale).toBe(ENTRY_SCALE)
    expect(result.inputs.I).toBe(400)
    expect(result.daySeconds).toBe(28800)
    expect(result.orbit).toBeUndefined()
  })
})
