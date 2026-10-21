import { describe, expect, it } from 'vitest'
import { distanceToSurfacePole, sampleComplexSurface, sampleSurfaceGrid } from './complex-surface-model'

describe('complex surface coordinates', () => {
  it('preserves the actual signed real or imaginary part as height', () => {
    const input = { re: 0, im: Math.PI }
    const real = sampleComplexSurface('exp', input)
    expect(real.x).toBe(0)
    expect(real.z).toBe(Math.PI)
    expect(real.height).toBeCloseTo(-1)
    expect(real.y).toBe(real.height)
    expect(real.visible).toBe(true)
    const imaginary = sampleComplexSurface('sin', { re: 0, im: -1 }, { component: 'im' })
    expect(imaginary.height).toBeCloseTo(-Math.sinh(1))
  })

  it('uses the modulus only when the modulus component is selected', () => {
    const sample = sampleComplexSurface('inv', { re: 1, im: 1 }, { component: 'abs' })
    expect(sample.height).toBeCloseTo(1 / Math.sqrt(2))
    expect(sample.phase).toBeCloseTo(-Math.PI / 4)
    expect(sample.phaseDefined).toBe(true)
  })

  it('does not assign a mathematical phase to a zero', () => {
    const sample = sampleComplexSurface('sin', { re: 0, im: 0 })
    expect(sample.visible).toBe(true)
    expect(sample.phaseDefined).toBe(false)
    expect(Number.isFinite(sample.phase)).toBe(true)
  })

  it('cuts the display window without flattening or compressing the function', () => {
    const positive = sampleComplexSurface('exp', { re: 2, im: 0 })
    const negative = sampleComplexSurface('exp', { re: 2, im: Math.PI })
    expect(positive.height).toBe(Math.exp(2))
    expect(negative.height).toBeCloseTo(-Math.exp(2))
    expect(positive.reason).toBe('height-clip')
    expect(negative.visible).toBe(false)
    expect(sampleComplexSurface('exp', { re: 2, im: 0 }, { heightClip: 8 }).visible).toBe(true)
  })

  it('keeps real-axis slices consistent with ordinary functions', () => {
    for (const x of [-1, -0.2, 0.3, 1]) {
      expect(sampleComplexSurface('exp', { re: x, im: 0 }).height).toBeCloseTo(Math.exp(x))
      expect(sampleComplexSurface('sin', { re: x, im: 0 }).height).toBeCloseTo(Math.sin(x))
      expect(sampleComplexSurface('tan', { re: x, im: 0 }).height).toBeCloseTo(Math.tan(x))
      expect(sampleComplexSurface('inv', { re: x, im: 0 }).height).toBeCloseTo(1 / x)
    }
  })
})

describe('surface exclusions', () => {
  it('cuts out the zeta pole while retaining its finite origin and trivial zeros', () => {
    expect(distanceToSurfacePole('zeta', { re: 1, im: 0 })).toBe(0)
    expect(sampleComplexSurface('zeta', { re: 1, im: 0 }).reason).toBe('pole')
    expect(sampleComplexSurface('zeta', { re: 1, im: 0.04 }, { component: 're' }).reason).toBe('pole')
    expect(sampleComplexSurface('zeta', { re: 0, im: 0 }).height).toBe(-0.5)
    const zero = sampleComplexSurface('zeta', { re: -2, im: 0 })
    expect(zero.visible).toBe(true)
    expect(zero.phaseDefined).toBe(false)
  })

  it('excludes every tangent pole, including outside the initial display window', () => {
    for (const k of [-10, -2, -1, 0, 1, 10]) {
      const re = Math.PI / 2 + k * Math.PI
      expect(distanceToSurfacePole('tan', { re, im: 0 })).toBeCloseTo(0)
      expect(sampleComplexSurface('tan', { re, im: 0 }).reason).toBe('pole')
      expect(sampleComplexSurface('tan', { re, im: 0.05 }, { component: 're' }).visible).toBe(false)
      expect(sampleComplexSurface('tan', { re, im: 0.2 }, { component: 're' }).visible).toBe(true)
    }
  })

  it('excludes the reciprocal pole even for a component that looks locally flat', () => {
    expect(sampleComplexSurface('inv', { re: 0, im: 0 }).reason).toBe('pole')
    expect(sampleComplexSurface('inv', { re: 0, im: 0.04 }).reason).toBe('pole')
    expect(sampleComplexSurface('inv', { re: 0, im: 0.2 }).visible).toBe(true)
  })

  it('rejects non-finite outputs instead of treating them as surface peaks', () => {
    const sample = sampleComplexSurface('exp', { re: 1000, im: 1 })
    expect(sample.visible).toBe(false)
    expect(sample.reason).toBe('non-finite')
    expect(sample.phaseDefined).toBe(false)
  })
})

describe('surface grid', () => {
  it('covers exact bounds in rows with x changing fastest', () => {
    const grid = sampleSurfaceGrid('sin', { xMin: -2, xMax: 2, yMin: -1, yMax: 1, xSteps: 4, ySteps: 2 })
    expect(grid.width).toBe(5)
    expect(grid.depth).toBe(3)
    expect(grid.points).toHaveLength(15)
    expect(grid.points[0].input).toEqual({ re: -2, im: -1 })
    expect(grid.points[1].input).toEqual({ re: -1, im: -1 })
    expect(grid.points[7].input).toEqual({ re: 0, im: 0 })
    expect(grid.points.at(-1)?.input).toEqual({ re: 2, im: 1 })
  })

  it('retains missing samples so renderers can break topology at poles and clipping', () => {
    const grid = sampleSurfaceGrid('inv', { xMin: -0.5, xMax: 0.5, yMin: -0.5, yMax: 0.5, xSteps: 10, ySteps: 10 })
    expect(grid.points[60].reason).toBe('pole')
    expect(grid.points.some((point) => point.reason === 'height-clip')).toBe(true)
    expect(grid.points.filter((point) => point.visible).every((point) => Number.isFinite(point.height))).toBe(true)
  })

  it('rejects invalid bounds and sample counts', () => {
    expect(() => sampleSurfaceGrid('exp', { xSteps: 0 })).toThrow(RangeError)
    expect(() => sampleSurfaceGrid('exp', { ySteps: 1.5 })).toThrow(RangeError)
    expect(() => sampleSurfaceGrid('exp', { xMin: 1, xMax: 1 })).toThrow(RangeError)
    expect(() => sampleSurfaceGrid('exp', { heightClip: 0 })).toThrow(RangeError)
  })
})
