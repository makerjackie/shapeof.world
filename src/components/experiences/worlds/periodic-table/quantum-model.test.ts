import { describe, expect, it } from 'vitest'
import { completeElementData } from './complete-element-data'
import { electronConfiguration, radialQuantile, radialWave, realHarmonic, sampleProbabilityCloud } from './quantum-model'

describe('orbital model', () => {
 it('uses all 118 verified configurations and reproduces their shell counts', () => {
  expect(Object.keys(completeElementData)).toHaveLength(118)
  for (const [symbol, element] of Object.entries(completeElementData)) {
   const configuration = electronConfiguration(symbol)
   expect(element.shells?.map((_, i) => configuration.filter(s => s.n === i + 1).reduce((a, s) => a + s.count, 0))).toEqual(element.shells)
   expect(configuration.every(s => s.charge > 0 && s.count <= 2 * (2 * s.l + 1))).toBe(true)
  }
  expect(electronConfiguration('Cr').find(s => s.key === '3d')?.count).toBe(5)
  expect(electronConfiguration('Cu').find(s => s.key === '4s')?.count).toBe(1)
  expect(electronConfiguration('Lr').find(s => s.key === '7p')?.count).toBe(1)
 })
 it('matches independent Slater shielding examples', () => {
  for (const [symbol, key, charge] of [['H', '1s', 1], ['He', '1s', 1.7], ['C', '2p', 3.25], ['Fe', '3d', 6.25]] as const) {
   expect(electronConfiguration(symbol).find(s => s.key === key)?.charge).toBeCloseTo(charge, 10)
  }
 })
 it('normalizes radial probability with the r squared volume factor and correct mean radius', () => {
  for (let n = 1; n <= 7; n++) for (let l = 0; l <= Math.min(3, n - 1); l++) {
   const step = n * (4 * n + 35) / 2 / 20000
   let norm = 0, mean = 0
   for (let i = 0; i < 20000; i++) { const r = (i + .5) * step, weight = r * r * radialWave(n, l, 1, r) ** 2 * step; norm += weight; mean += r * weight }
   expect(norm).toBeCloseTo(1, 5)
   expect(mean).toBeCloseTo((3 * n * n - l * (l + 1)) / 2, 4)
  }
 })
 it('matches analytic hydrogen quantiles and the 2s radial node', () => {
  for (const p of [.01, .1, .5, .9, .99]) {
   const r = radialQuantile(1, 0, 1, p)
   expect(1 - Math.exp(-2 * r) * (1 + 2 * r + 2 * r * r)).toBeCloseTo(p, 4)
   expect(radialQuantile(1, 0, 2, p)).toBeCloseTo(r / 2, 10)
  }
  expect(radialWave(2, 0, 1, 2)).toBe(0)
  expect(radialWave(2, 0, 1, 1) * radialWave(2, 0, 1, 3)).toBeLessThan(0)
 })
 it('normalizes every real s, p, d and f harmonic, preserving angular nodes', () => {
  for (let l = 0; l <= 3; l++) for (let m = -l; m <= l; m++) {
   let norm = 0
   for (let j = 0; j < 300; j++) for (let k = 0; k < 100; k++) norm += realHarmonic(l, m, -1 + (j + .5) * 2 / 300, (k + .5) * 2 * Math.PI / 100) ** 2 * 4 * Math.PI / 30000
   expect(norm).toBeCloseTo(1, 3)
  }
  expect(realHarmonic(1, 0, 0, 1)).toBe(0)
  expect(realHarmonic(2, -2, .5, 0)).toBe(0)
 })
 it('samples stationary density with a broad radial distribution and a directional p orbital', () => {
  const config = electronConfiguration('H'), a = sampleProbabilityCloud(config, null, 10000)
  expect(a.positions).toEqual(sampleProbabilityCloud(config, null, 10000).positions)
  const radii = Array.from({ length: a.count }, (_, i) => Math.hypot(...a.positions.slice(i * 3, i * 3 + 3)))
  expect(radii.reduce((a, b) => a + b, 0) / a.count).toBeCloseTo(1.5, 1)
  expect(radii.filter(r => r < .5).length).toBeGreaterThan(700)
  expect(radii.filter(r => r > 3).length).toBeGreaterThan(500)
  const p = sampleProbabilityCloud(electronConfiguration('C'), { subshell: '2p', m: 0 }, 10000)
  const moment = [0, 0, 0]
  p.positions.forEach((v, i) => { moment[i % 3] += v * v; expect(Number.isFinite(v)).toBe(true) })
  expect(moment[2] / moment[0]).toBeCloseTo(3, 0)
  expect(moment[2] / moment[1]).toBeCloseTo(3, 0)
 })
})
