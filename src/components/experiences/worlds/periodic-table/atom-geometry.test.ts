import { describe, expect, it } from 'vitest'
import { nucleusGeometry, rotatePoint, shellPoint } from './atom-geometry'
import { isotopesFor } from './isotopes'

describe('atom counting geometry', () => {
 it('keeps every reference isotope centred, finite and inside the nucleus', () => {
  for (let protons = 1; protons <= 118; protons++) for (const { mass } of isotopesFor(protons)) {
   const particles = nucleusGeometry(protons, mass - protons)
   expect(particles).toHaveLength(mass)
   expect(particles.filter(p => p.kind === 'proton')).toHaveLength(protons)
   expect(new Set(particles.map(p => p.key)).size).toBe(mass)
   for (const p of particles) {
    expect(p.radius).toBeGreaterThan(0)
    expect(Math.hypot(p.x, p.y, p.z) + p.radius).toBeLessThanOrEqual(29.000001)
   }
   for (const axis of ['x', 'y', 'z'] as const) expect(particles.reduce((sum, p) => sum + p[axis], 0)).toBeCloseTo(0, 7)
  }
 })

 it('gives a heavy nucleus depth even when viewed edge-on', () => {
  const particles = nucleusGeometry(83, 126)
  for (const pose of [{ x: 0, y: 0 }, { x: 90, y: 0 }, { x: 0, y: 90 }]) {
   const projected = particles.map(p => rotatePoint(p, pose))
   for (const axis of ['x', 'y', 'z'] as const) {
    const values = projected.map(p => p[axis])
    expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(35)
   }
  }
 })

 it('preserves particle identities across isotope changes', () => {
  const original = nucleusGeometry(6, 6), heavier = nucleusGeometry(6, 8)
  expect(heavier.filter(p => p.kind === 'proton').map(p => p.key)).toEqual(original.filter(p => p.kind === 'proton').map(p => p.key))
  expect(heavier.filter(p => !original.some(old => old.key === p.key)).map(p => p.key)).toEqual(['neutron-6', 'neutron-7'])
 })

 it('preserves shell radii through rotation and fits the maximum zoom', () => {
  for (let count = 1; count <= 7; count++) for (let shell = 0; shell < count; shell++) {
   const radius = count === 1 ? 88 : 55 + shell * 65 / (count - 1)
   for (let angle = 0; angle < Math.PI * 2; angle += .2) {
    const point = rotatePoint(shellPoint(shell, count, angle), { x: 75, y: 137 })
    expect(Math.hypot(point.x, point.y, point.z)).toBeCloseTo(radius, 8)
    expect((Math.hypot(point.x, point.y) + 3.4) * 1.4).toBeLessThan(184)
   }
  }
 })
})
