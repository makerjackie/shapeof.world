import { describe, expect, it } from 'vitest'
import { buildShapeInstances, mobiusPoint, shapeFrame } from './equation-wormhole-shapes'
import { portraitFrame } from './equation-wormhole-model'
import { PORTRAITS } from './equation-wormhole-portraits'
import { MIXED_FORMULAS, FORMULA_SUBJECTS } from './equation-wormhole-data'
import { buildPortraitTiles, buildWormholeInstances, buildRushInstances, buildRainInstances } from './equation-wormhole-model'

describe('formula geometry', () => {
  it('every scene contains equations from every subject, with readable foreground and fine background scales', () => {
    const widths = MIXED_FORMULAS.map(f => Math.max(2, f.tex.length / 3))
    const scenes = [buildWormholeInstances(widths), buildRushInstances(widths.length), buildRainInstances(widths.length), buildPortraitTiles(widths.map(wEm => ({ wEm, hEm: 2 }))), ...(['blackhole', 'mobius'] as const).map(id => buildShapeInstances(id, widths))]
    for (const instances of scenes) {
      const ids = new Set(instances.map(p => MIXED_FORMULAS[p.formula]?.id))
      expect(instances.every(p => p.formula >= 0 && p.formula < MIXED_FORMULAS.length)).toBe(true)
      for (const subject of FORMULA_SUBJECTS) expect(subject.formulas.every(f => ids.has(f.id))).toBe(true)
    }
    const blackhole = buildShapeInstances('blackhole', widths)
    const sizes = blackhole.map(p => p.size * widths[p.formula])
    expect(Math.max(...sizes) / Math.min(...sizes)).toBeGreaterThan(12)
    expect(blackhole.some(p => Math.abs(shapeFrame('blackhole', p, 0).pos[1]) > 4)).toBe(true)
  })
  it('black-hole equations fill a volume and keep world-space orientations during camera orbit', () => {
    const floating = buildShapeInstances('blackhole', Array(56).fill(6)).filter(p => p.c >= 10)
    expect(floating.length).toBeGreaterThan(300)
    expect(new Set(floating.map(p => p.formula)).size).toBe(56)
    const front = { right: [1, 0, 0], up: [0, 1, 0], forward: [0, 0, 1], inclination: 0 }
    const side = { right: [0, 0, -1], up: [0, 1, 0], forward: [1, 0, 0], inclination: 0 }
    const frames = floating.map(p => shapeFrame('blackhole', p, 0))
    expect(frames.filter(f => f.pos[1] > 8 && f.opacity > 0.5).length).toBeGreaterThan(40)
    expect(frames.filter(f => f.pos[1] < -8 && f.opacity > 0.5).length).toBeGreaterThan(40)
    expect(frames.some(f => f.pos[2] > 30)).toBe(true)
    expect(frames.some(f => f.pos[2] < -30)).toBe(true)
    for (const p of floating.slice(0, 20)) {
      expect(shapeFrame('blackhole', p, 2, front as Parameters<typeof shapeFrame>[3])).toEqual(shapeFrame('blackhole', p, 2, side as Parameters<typeof shapeFrame>[3]))
    }
  })
  it('Möbius seam reverses the transverse coordinate and closes after two circuits', () => {
    for (const width of [-4, 0, 4]) {
      const a = mobiusPoint(0, width), b = mobiusPoint(2 * Math.PI, -width), c = mobiusPoint(4 * Math.PI, width)
      a.forEach((v, i) => { expect(b[i]).toBeCloseTo(v, 10); expect(c[i]).toBeCloseTo(v, 10) })
    }
  })
  it('new scenes preserve finite pickable frames across prolonged playback', () => {
    for (const id of ['blackhole', 'mobius'] as const) {
      const instances = buildShapeInstances(id, [2, 5, 12])
      for (const time of [0, 30, 3600]) for (const p of instances.filter((_, i) => i % 37 === 0)) {
        const f = shapeFrame(id, p, time)
        expect([...f.pos, ...f.u, ...f.v, f.opacity].every(Number.isFinite)).toBe(true)
        expect(f.opacity).toBeGreaterThanOrEqual(0); expect(f.opacity).toBeLessThanOrEqual(1)
        expect(Math.hypot(...f.u)).toBeCloseTo(1, 8)
        expect(Math.hypot(...f.v)).toBeCloseTo(1, 8)
      }
    }
  })
  it('portrait grids retain dark facial detail, undistorted spacing and a stable plane', () => {
    for (const portrait of Object.values(PORTRAITS)) {
      expect(portrait.points.length).toBe(8000)
      expect(portrait.points.some(p => p[2] < 15)).toBe(true)
      expect(portrait.points.some(p => p[2] > 180)).toBe(true)
    }
    expect(portraitFrame(2, 3, 0.6, 1, 0)).toEqual(portraitFrame(2, 3, 0.6, 1, 999))
    expect(portraitFrame(2, 3, 0.6, 1, 999).pos[2]).toBe(0)
  })
})
