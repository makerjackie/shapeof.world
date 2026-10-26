import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import { maskVisible, transistorState, type Layout } from './model'
import manifest from './data/manifest.json'
import { decodeLayout } from './load-layout'

describe('NMOS causal model', () => {
  it('requires both an inversion channel and drain-source bias to carry current', () => {
    expect(transistorState(0, 1.8).flowing).toBe(false)
    expect(transistorState(0.65, 1.8).channel).toBe(false)
    expect(transistorState(1.8, 0)).toMatchObject({ channel: true, flowing: false, relativeCurrent: 0 })
    expect(transistorState(1.8, 1.8).relativeCurrent).toBeCloseTo(1)
  })
  it('is continuous at the linear/saturation boundary and increases with gate voltage', () => {
    const boundary = 1.2 - 0.65
    expect(transistorState(1.2, boundary - 1e-6).relativeCurrent).toBeCloseTo(transistorState(1.2, boundary + 1e-6).relativeCurrent, 8)
    expect(transistorState(1, 1.8).relativeCurrent).toBeLessThan(transistorState(1.4, 1.8).relativeCurrent)
    expect(transistorState(NaN, Infinity).relativeCurrent).toBe(0)
  })
})

describe('real layout and peel order', () => {
  const data = (name: string) => readFileSync(`src/components/experiences/worlds/chip-zoom/data/${name}`)
  const layout: Layout = JSON.parse(gunzipSync(data('alu-layout.json.gz')).toString())
  it('accepts both static gzip and browser-decoded HTTP gzip without double decompression', () => {
    for (const bytes of [data('alu-layout.json.gz'), gunzipSync(data('alu-layout.json.gz'))]) {
      expect(decodeLayout(Uint8Array.from(bytes).buffer).bounds).toEqual(layout.bounds)
    }
  })
  it('pins the original GDS hash, planar units, all selected masks and placed inverter', () => {
    expect(createHash('sha256').update(gunzipSync(data('alu_top.gds.gz'))).digest('hex')).toBe(manifest.gdsSha256)
    expect(layout.bounds).toEqual([0, 0, 150000, 170000])
    expect(layout.unit).toBe('nm')
    for (const [mask, count] of Object.entries(manifest.polygonCounts)) expect(layout.layers[mask as keyof Layout['layers']]).toHaveLength(count)
    expect(layout.cell.name).toBe('sky130_fd_sc_hd__inv_2')
    expect(layout.layers).not.toHaveProperty('m5')
  })
  it('removes each contact with its upper layer, and preserves the transistor masks', () => {
    expect(maskVisible('v3', 0)).toBe(true)
    expect(maskVisible('v3', 1)).toBe(false)
    expect(maskVisible('m3', 1)).toBe(true)
    expect(maskVisible('mcon', 4)).toBe(false)
    expect(maskVisible('licon', 4)).toBe(true)
    for (const mask of ['nwell', 'diff', 'poly'] as const) expect(maskVisible(mask, 5)).toBe(true)
    expect(maskVisible('li', 5)).toBe(false)
  })
})
