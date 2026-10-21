import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { jointAngle, separation } from './flybody-model'

describe('flybody source geometry and articulation', () => {
  it('preserves the pinned model hierarchy and independently verifies its shipped digest', () => {
    const root = 'public/assets/worlds/flybody/'
    const manifest = JSON.parse(readFileSync(root + 'manifest.json', 'utf8'))
    const bytes = readFileSync(root + manifest.output)
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(manifest.sha256)
    expect(bytes.length).toBeLessThan(6 * 1024 * 1024)
    const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString())
    const nodes = gltf.nodes as Array<{ name: string; children?: number[] }>
    const tibia = nodes.find(n => n.name === 'tibia_T1_left')!
    expect(tibia).toBeDefined()
    expect(tibia.children!.map(i => nodes[i].name)).toContain('tarsus_T1_left')
    expect(nodes.filter(n => /^coxa_T[123]_(left|right)$/.test(n.name))).toHaveLength(6)
    expect(nodes.map(n => n.name)).toContain('wing_right')
    expect(gltf.buffers.every((b: { uri?: string }) => !b.uri)).toBe(true)
  })
  it('stays inside the upstream joint range, including invalid input', () => {
    expect(jointAngle(0)).toBe(-1.35)
    expect(jointAngle(1)).toBeCloseTo(1.3)
    expect(jointAngle(1.35 / 2.65)).toBeCloseTo(0)
    for (const input of [-100, 100, NaN, Infinity]) {
      expect(jointAngle(input)).toBeGreaterThanOrEqual(-1.35)
      expect(jointAngle(input)).toBeLessThanOrEqual(1.3)
    }
  })
  it('separates paired wings symmetrically and does not explode downstream foot joints', () => {
    expect(separation('wing_left')[1]).toBe(-separation('wing_right')[1])
    expect(separation('tarsus_T1_left')).toEqual([0, 0, 0])
  })
})
