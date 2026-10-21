import { describe, expect, it } from 'vitest'

import {
  cartesianGridLines,
  complexAbs,
  complexArg,
  complexExp,
  complexFunctionById,
  complexInverse,
  complexSin,
  complexSquare,
  complexTan,
  complexZeta,
  COMPLEX_FUNCTIONS,
  morphPoint,
  polarGridLines,
  projectSolid,
  SURFACE_HEIGHT_CAP,
  surfaceHeight,
  unprojectSolidGround,
} from './complex-mapping-model'

const close = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps

describe('complex elementary functions', () => {
  it('e^(iπ) = -1 (Euler)', () => {
    const w = complexExp({ re: 0, im: Math.PI })
    expect(close(w.re, -1)).toBe(true)
    expect(close(w.im, 0, 1e-9)).toBe(true)
  })

  it('exp maps vertical line x=1 to a circle of radius e', () => {
    const r0 = complexAbs(complexExp({ re: 1, im: 0.3 }))
    const r1 = complexAbs(complexExp({ re: 1, im: 2.4 }))
    expect(close(r0, Math.E, 1e-12)).toBe(true)
    expect(close(r1, Math.E, 1e-12)).toBe(true)
  })

  it('exp maps horizontal line y=b to a ray at angle b', () => {
    const w = complexExp({ re: 0.7, im: 1.05 })
    expect(close(complexArg(w), 1.05)).toBe(true)
  })

  it('sin(i) = i·sinh(1)', () => {
    const w = complexSin({ re: 0, im: 1 })
    expect(close(w.re, 0, 1e-12)).toBe(true)
    expect(close(w.im, Math.sinh(1))).toBe(true)
  })

  it('tan agrees with sin/cos away from poles', () => {
    const z = { re: 0.7, im: 0.4 }
    const s = complexSin(z)
    const c = complexSin({ re: Math.PI / 2 - z.re, im: -z.im })
    const t = complexTan(z)
    const qRe = (s.re * c.re + s.im * c.im) / (c.re * c.re + c.im * c.im)
    const qIm = (s.im * c.re - s.re * c.im) / (c.re * c.re + c.im * c.im)
    expect(close(t.re, qRe, 1e-9)).toBe(true)
    expect(close(t.im, qIm, 1e-9)).toBe(true)
  })

  it('tan(0) = 0 and is real on the real axis', () => {
    const w = complexTan({ re: 0.9, im: 0 })
    expect(close(w.re, Math.tan(0.9))).toBe(true)
    expect(close(w.im, 0, 1e-12)).toBe(true)
  })

  it('(1+i)² = 2i', () => {
    const w = complexSquare({ re: 1, im: 1 })
    expect(close(w.re, 0, 1e-12)).toBe(true)
    expect(close(w.im, 2)).toBe(true)
  })

  it('1/(1+i) = (1-i)/2', () => {
    const w = complexInverse({ re: 1, im: 1 })
    expect(close(w.re, 0.5)).toBe(true)
    expect(close(w.im, -0.5)).toBe(true)
  })

  it('registry exposes six functions with stable ids', () => {
    expect(COMPLEX_FUNCTIONS.map((fn) => fn.id)).toEqual(['exp', 'sin', 'tan', 'sq', 'inv', 'zeta'])
    expect(complexFunctionById('tan').poles.length).toBeGreaterThan(0)
    expect(complexFunctionById('exp').poles).toHaveLength(0)
  })
})

describe('zeta continuation in the displayed window', () => {
  it('reproduces real special values and the trivial zeros', () => {
    expect(complexZeta({ re: 0, im: 0 })).toEqual({ re: -0.5, im: 0 })
    expect(complexZeta({ re: -1, im: 0 }).re).toBeCloseTo(-1 / 12, 12)
    expect(complexZeta({ re: 2, im: 0 }).re).toBeCloseTo(Math.PI ** 2 / 6, 12)
    for (const re of [-2, -4]) expect(complexZeta({ re, im: 0 })).toEqual({ re: 0, im: 0 })
  })

  it('resolves the first conjugate pair of nontrivial zeros', () => {
    for (const im of [-14.13472514173469, 14.13472514173469]) {
      expect(complexAbs(complexZeta({ re: 0.5, im }))).toBeLessThan(1e-11)
    }
  })

  it('matches independent 50-digit mpmath 1.3.0 references across the display window', () => {
    const cases = [
      [0.5, 14, 0.02224114260999359, -0.10325812326645006],
      [0.5, 18, 2.329154873049202, -0.18886600580072347],
      [-4, 18, 113.89218399637061, 47.51900717259921],
      [-4, 7, -1.038694869244148, 1.8831012082872992],
      [-4, 12.5, 16.86807999379988, -16.701149431940413],
      [-4, 5.5, -0.5969098631006503, 0.5617412451270538],
      [-3.75, 0.2, 0.002092868302830963, 0.0018276326772031252],
      [2, 3, 0.7980219851462757, -0.1137443080529385],
      [4, 18, 1.0725984331924645, -0.0029386231925935195],
      [-1, 8, 1.3646895992455395, 0.8964299181153335],
    ]
    for (const [re, im, expectedRe, expectedIm] of cases) {
      const value = complexZeta({ re, im })
      expect(Math.hypot(value.re - expectedRe, value.im - expectedIm)).toBeLessThan(2e-8)
      const conjugate = complexZeta({ re, im: -im })
      expect(conjugate.re).toBe(value.re)
      expect(conjugate.im).toBe(-value.im)
    }
  })

  it('has a simple pole at one with residue one, approached from four directions', () => {
    expect(complexZeta({ re: 1, im: 0 }).re).toBe(Infinity)
    for (const offset of [{ re: 1e-6, im: 0 }, { re: -1e-6, im: 0 }, { re: 0, im: 1e-6 }, { re: 0, im: -1e-6 }]) {
      const value = complexZeta({ re: 1 + offset.re, im: offset.im })
      const residue = { re: offset.re * value.re - offset.im * value.im, im: offset.re * value.im + offset.im * value.re }
      expect(residue.re).toBeCloseTo(1, 5)
      expect(residue.im).toBeCloseTo(0, 5)
    }
    expect(complexFunctionById('zeta').poles).toEqual([{ re: 1, im: 0 }])
  })
})

describe('morph and grids', () => {
  it('morphPoint interpolates between z and f(z)', () => {
    const z = { re: 1, im: 2 }
    const fz = { re: 3, im: -2 }
    const mid = morphPoint(z, fz, 0.5)
    expect(close(mid.re, 2)).toBe(true)
    expect(close(mid.im, 0)).toBe(true)
  })

  it('cartesian grid covers the requested window symmetrically', () => {
    const { vertical, horizontal } = cartesianGridLines(4, 2.5, 0.5, 40)
    expect(vertical).toHaveLength(17)
    expect(horizontal).toHaveLength(11)
    expect(vertical[0][0].re).toBeCloseTo(-4)
    expect(horizontal[0][0].im).toBeCloseTo(-2.5)
  })

  it('polar grid rings sit at the requested radii', () => {
    const lines = polarGridLines(3, 0.5, 12, 64)
    expect(complexAbs(lines[0][0])).toBeCloseTo(0.5)
    expect(complexAbs(lines[5][0])).toBeCloseTo(3)
    expect(lines.length).toBe(6 + 12)
  })
})

describe('solid-view surface helpers', () => {
  it('surfaceHeight is monotone and capped, poles included', () => {
    expect(surfaceHeight(1)).toBeLessThan(surfaceHeight(10))
    expect(surfaceHeight(10)).toBeLessThan(surfaceHeight(100))
    expect(surfaceHeight(Infinity)).toBe(SURFACE_HEIGHT_CAP)
    expect(surfaceHeight(1e9)).toBeLessThanOrEqual(SURFACE_HEIGHT_CAP)
  })

  it('projectSolid/unprojectSolidGround round-trip a ground point', () => {
    const cam = { yaw: -0.7, pitch: 0.66, dist: 13 }
    const cx = 720
    const cy = 430
    const focal = 1000
    const target = { re: 1.4, im: -0.9 }
    const p = projectSolid({ x: target.re, y: target.im, h: 0 }, cam, cx, cy, focal)
    const back = unprojectSolidGround(p.x, p.y, cam, cx, cy, focal)
    expect(back).not.toBeNull()
    expect(close(back!.re, target.re, 1e-6)).toBe(true)
    expect(close(back!.im, target.im, 1e-6)).toBe(true)
  })
})
