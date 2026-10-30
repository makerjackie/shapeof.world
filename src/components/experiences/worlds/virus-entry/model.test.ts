import { describe, expect, it } from 'vitest'
import { advanceProgress, fibonacciSphere, frameAt, STAGES } from './model'

describe('generic membrane-entry exhibition, not an infection model', () => {
  it('keeps every display state finite and bounded', () => {
    for (const t of [-1, 0, .18, .36, .56, .78, 1, 3, NaN, Infinity]) for (const route of ['surface', 'endosome'] as const) {
      const f = frameAt(t, route)
      for (const value of [f.progress, f.approach, f.uptake, f.fusion, f.release, f.virusY, f.pore]) expect(Number.isFinite(value)).toBe(true)
      expect(f.progress).toBeGreaterThanOrEqual(0); expect(f.progress).toBeLessThanOrEqual(1)
    }
  })
  it('makes scrubbing exactly reversible without a hidden simulation state', () => {
    const before = frameAt(.63, 'endosome')
    frameAt(.98, 'endosome'); frameAt(.1, 'surface')
    expect(frameAt(.63, 'endosome')).toEqual(before)
  })
  it('separates vesicle uptake from access to the cytoplasm', () => {
    expect(frameAt(.53, 'endosome').vesicleVisible).toBe(true)
    expect(frameAt(.53, 'endosome').hasReachedCytoplasm).toBe(false)
    expect(frameAt(.9, 'endosome').hasReachedCytoplasm).toBe(true)
    expect(frameAt(.53, 'surface').vesicleVisible).toBe(false)
  })
  it('only releases cargo after the fusion transition', () => {
    for (let i = 0; i <= 100; i++) {
      const f = frameAt(i / 100, 'surface')
      if (f.release > 0) expect(f.fusion).toBe(1)
    }
  })
  it('does not skip chapters or run forever when a browser tab resumes', () => {
    expect(advanceProgress(.5, 500, 1)).toBeCloseTo(.5 + .1 / 70)
    expect(advanceProgress(1, .1, 8)).toBe(1)
    expect(STAGES.every((s, i) => i === 0 || s.at > STAGES[i - 1].at)).toBe(true)
  })
  it('positions the original structural instances on the displayed shell', () => {
    const points = fibonacciSphere(300, 2)
    expect(points.length).toBe(300)
    for (const p of points) expect(Math.hypot(...p)).toBeCloseTo(2, 10)
    expect(fibonacciSphere(1).flat().every(Number.isFinite)).toBe(true)
  })
})
