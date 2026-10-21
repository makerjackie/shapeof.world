import { describe, expect, it } from 'vitest'
import { EARTH_RADIUS_KM, MOON_RADIUS, earthMoonAt } from './earth-moon-model'

describe('calendar Moon ephemeris and shared physical scale', () => {
  it('keeps position, radius and distance on one scale throughout the year', () => {
    const distances = Array.from({ length: 365 }, (_, d) => {
      const m = earthMoonAt(Date.UTC(2026, 0, d + 1))
      expect(Math.hypot(m.moon.x, m.moon.y, m.moon.z) * EARTH_RADIUS_KM).toBeCloseTo(m.distanceKm, 6)
      expect(m.distanceKm).toBeGreaterThan(350000)
      expect(m.distanceKm).toBeLessThan(410000)
      expect(m.distanceKm / (2 * EARTH_RADIUS_KM)).toBeGreaterThan(27)
      return m.distanceKm
    })
    expect(Math.max(...distances) - Math.min(...distances)).toBeGreaterThan(40000)
    expect(MOON_RADIUS).toBeCloseTo(0.2727, 4)
  })
  it('matches the new Moon at the 2024 April 8 solar eclipse', () => {
    const m = earthMoonAt(Date.UTC(2024, 3, 8, 18, 21))
    expect(m.illumination).toBeLessThan(0.001)
    expect(Math.min(m.phase, 1 - m.phase)).toBeLessThan(0.001)
  })
  it('matches the full Moon at the 2025 March 14 lunar eclipse', () => {
    const m = earthMoonAt(Date.UTC(2025, 2, 14, 6, 59))
    expect(m.illumination).toBeGreaterThan(0.999)
    expect(m.phase).toBeCloseTo(0.5, 3)
  })
})

it('samples a single orbital plane instead of mixing rotating daily frames', async () => {
  const { moonOrbitAt } = await import('./earth-moon-model')
  const epoch = Date.UTC(2026, 8, 8)
  const points = moonOrbitAt(epoch)
  const actual = earthMoonAt(epoch).moon
  expect(points[80].x).toBeCloseTo(actual.x, 8)
  expect(points[80].y).toBeCloseTo(actual.y, 8)
  expect(points[80].z).toBeCloseTo(actual.z, 8)
  const dot = (a: typeof actual, b: typeof actual) => a.x * b.x + a.y * b.y + a.z * b.z
  const a = points[0], b = points[40]
  const normal = { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }
  for (const p of points) {
    expect(Math.hypot(p.x, p.y, p.z)).toBeGreaterThan(55)
    expect(Math.abs(dot(normal, p)) / Math.sqrt(dot(normal, normal))).toBeLessThan(1.5)
  }
})
