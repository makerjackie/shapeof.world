import { describe, expect, it } from 'vitest'

import { ATTRACTOR_ORDER, ATTRACTORS, generateCustomAttractor } from './butterfly-effect-model'
import { DEFAULT_STYLE, VISUAL_STYLES, VISUAL_STYLE_ORDER, hsl, isVisualStyleId } from './butterfly-effect-styles'

describe('visual styles', () => {
  it('has a valid default and unique order entries', () => {
    expect(VISUAL_STYLE_ORDER).toContain(DEFAULT_STYLE)
    expect(new Set(VISUAL_STYLE_ORDER).size).toBe(VISUAL_STYLE_ORDER.length)
    for (const id of VISUAL_STYLE_ORDER) expect(VISUAL_STYLES[id].id).toBe(id)
  })

  it('validates style ids for share links', () => {
    expect(isVisualStyleId('ember')).toBe(true)
    expect(isVisualStyleId('porcelain')).toBe(false) // 已删除的风格安全回退
    expect(isVisualStyleId(null)).toBe(false)
  })

  it('produces finite in-gamut colors for every style and twin', () => {
    const defs = [...ATTRACTOR_ORDER.map((id) => ATTRACTORS[id]), generateCustomAttractor(42)!]
    const w = { x: 1.5, y: -0.5, z: 2 }
    for (const def of defs) {
      for (const id of VISUAL_STYLE_ORDER) {
        const style = VISUAL_STYLES[id]
        for (const twin of ['a', 'b'] as const) {
          for (const v of [0, def.speedLo, (def.speedLo + def.speedHi) / 2, def.speedHi, def.speedHi * 4]) {
            const rgb = style.color(def, w, v, twin)
            for (const c of rgb) {
              expect(Number.isFinite(c), `${id} ${twin} v=${v}`).toBe(true)
              expect(c, `${id} ${twin} v=${v}`).toBeGreaterThanOrEqual(0)
              expect(c, `${id} ${twin} v=${v}`).toBeLessThanOrEqual(1)
            }
          }
        }
      }
    }
  })

  it('hsl converts primary-ish hues sanely', () => {
    expect(hsl(0, 1, 0.5)).toEqual([1, 0, 0])
    expect(hsl(1 / 3, 1, 0.5)).toEqual([0, 1, 0])
    const [r, g, b] = hsl(0.5, 0.5, 0.5)
    expect(g).toBeGreaterThan(r)
    expect(b).toBeGreaterThan(r)
  })

  it('marks exactly the line-based styles', () => {
    expect(VISUAL_STYLES.silk.lines).toBe(true)
    expect(VISUAL_STYLES.blueprint.lines).toBe(true)
    expect(VISUAL_STYLES.blueprint.grid).toBe(true)
    expect(VISUAL_STYLES.ember.lines).toBeUndefined()
  })
})
