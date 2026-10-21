import { expect, it } from 'vitest'
import { EARTH_ORBIT_RADIUS, SUN_RADIUS, earthSunAt } from './earth-sun-model'
it('uses one physical scale for Sun, Earth and separation', () => {
  expect(SUN_RADIUS).toBeCloseTo(109.2, 1)
  expect(EARTH_ORBIT_RADIUS).toBeGreaterThan(23000)
  const winter = earthSunAt(Date.UTC(2026, 0, 3))
  const summer = earthSunAt(Date.UTC(2026, 6, 4))
  expect(winter.distanceKm).toBeGreaterThan(147000000)
  expect(winter.distanceKm).toBeLessThan(147300000)
  expect(summer.distanceKm).toBeGreaterThan(152000000)
  expect(summer.distanceKm).toBeLessThan(152300000)
  expect(Math.hypot(winter.x, winter.y, winter.z) * 6371).toBeCloseTo(winter.distanceKm, 5)
})
it('keeps solstice positions consistent with the fixed tilted axis', () => {
  expect(earthSunAt(Date.UTC(2026, 11, 21)).x).toBeGreaterThan(23000)
  expect(earthSunAt(Date.UTC(2026, 5, 21)).x).toBeLessThan(-23000)
})
