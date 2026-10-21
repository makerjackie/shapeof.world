import { describe, expect, it } from 'vitest'
import { MAX_ZOOM, OVERVIEW, escapeIterations, interpolateCamera, pan, readCamera, zoomAt } from './mandelbrot-model'

describe('Mandelbrot camera and iteration', () => {
  it('rejects partial/nonfinite links and clamps excessive magnification', () => {
    expect(readCamera('?zoom=20')).toBeNull()
    expect(readCamera('?cx=&cy=0&zoom=20')).toBeNull()
    expect(readCamera('?cx=Infinity&cy=0&zoom=20')).toBeNull()
    expect(readCamera('?cx=-.75&cy=.1&zoom=1e14')).toEqual({ cx: -.75, cy: .1, zoom: MAX_ZOOM })
  })
  it('keeps the point under the cursor fixed, even at the zoom limit', () => {
    const camera = { cx: -.75, cy: .1, zoom: MAX_ZOOM / 2 }
    const point = { x: 920, y: 180 }, w = 1200, h = 800
    const next = zoomAt(camera, 100, point, w, h)
    const coordinate = (c: typeof camera) => [c.cx + (point.x - w / 2) * 3 / c.zoom / h, c.cy - (point.y - h / 2) * 3 / c.zoom / h]
    expect(coordinate(next)[0]).toBeCloseTo(coordinate(camera)[0], 14)
    expect(coordinate(next)[1]).toBeCloseTo(coordinate(camera)[1], 14)
  })
  it('makes pan reversible and preserves magnification', () => {
    const moved = pan(OVERVIEW, 40, -30, 390, 844)
    const restored = pan(moved, -40, 30, 390, 844)
    expect(restored.cx).toBeCloseTo(OVERVIEW.cx, 14)
    expect(restored.cy).toBeCloseTo(OVERVIEW.cy, 14)
    expect(restored.zoom).toBe(OVERVIEW.zoom)
  })
  it('pulls back for distant flights and reaches both endpoints exactly', () => {
    const from = { cx: -.743, cy: .13, zoom: 20000 }, to = { cx: -1.75, cy: 0, zoom: 1000 }
    expect(interpolateCamera(from, to, 0).zoom).toBeCloseTo(from.zoom)
    expect(interpolateCamera(from, to, .5).zoom).toBeLessThan(2)
    expect(interpolateCamera(from, to, 1).cx).toBeCloseTo(to.cx, 14)
    expect(interpolateCamera(from, to, 1).zoom).toBeCloseTo(to.zoom)
  })
  it('distinguishes known bounded and escaping orbits', () => {
    expect(escapeIterations(0, 0)).toBe(1600)
    expect(escapeIterations(-1, 0)).toBe(1600)
    expect(escapeIterations(1, 0)).toBe(3)
    expect(escapeIterations(2, 2)).toBe(1)
  })
})
