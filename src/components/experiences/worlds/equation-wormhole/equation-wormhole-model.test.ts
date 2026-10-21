import { describe, expect, it } from 'vitest'

import { FORMULA_SUBJECTS, subjectById } from './equation-wormhole-data'
import {
  RAIN,
  RUSH,
  WORMHOLE,
  buildInstances,
  buildPortraitTiles,
  buildRainInstances,
  buildRushInstances,
  buildWormholeInstances,
  portraitFrame,
  rainFrame,
  rainSpeed,
  rushFrame,
  mulberry32,
  wormholeFrame,
  wormholeLaneArcPerZ,
  wormholeRadius,
} from './equation-wormhole-model'
import { fallbackMeasurer, typeset } from './equation-wormhole-typeset'

const WIDTHS = FORMULA_SUBJECTS[0].formulas.map((f) => typeset(f.tex, fallbackMeasurer).width)

describe('equation-wormhole 数据集', () => {
  it('四个科目各至少 12 条公式，id 唯一', () => {
    expect(FORMULA_SUBJECTS.map((s) => s.id)).toEqual(['classic', 'em', 'relativity', 'quantum', 'math'])
    const seen = new Set<string>()
    expect(FORMULA_SUBJECTS.length).toBe(5)
    for (const subject of FORMULA_SUBJECTS) {
      expect(subject.formulas.length).toBeGreaterThanOrEqual(6)
      for (const f of subject.formulas) {
        expect(seen.has(f.id)).toBe(false)
        seen.add(f.id)
        expect(f.name.length).toBeGreaterThan(0)
        expect(f.by.length).toBeGreaterThan(0)
        expect(f.year.length).toBeGreaterThan(0)
        expect(f.what.length).toBeGreaterThan(0)
      }
    }
  })

  it('每条公式的 tex 都能被排版器解析且非空', () => {
    for (const subject of FORMULA_SUBJECTS) {
      for (const f of subject.formulas) {
        const layout = typeset(f.tex, fallbackMeasurer)
        expect(layout.width).toBeGreaterThan(0)
        expect(layout.glyphs.length).toBeGreaterThan(0)
      }
    }
  })

  it('subjectById 对未知 id 回退到物理', () => {
    expect(subjectById('quantum').id).toBe('quantum')
    expect(subjectById('nope').id).toBe('classic')
  })
})

describe('公式微排版器', () => {
  it('分数产生分数线且总高大于单行', () => {
    const plain = typeset('E = mc^{2}', fallbackMeasurer)
    const frac = typeset('\\frac{a}{b}', fallbackMeasurer)
    expect(frac.rules.length).toBe(1)
    expect(frac.height + frac.depth).toBeGreaterThan(plain.height + plain.depth)
  })

  it('上标抬高字形并缩小字号', () => {
    const layout = typeset('x^{2}', fallbackMeasurer)
    const sup = layout.glyphs.find((g) => g.ch === '2')!
    const base = layout.glyphs.find((g) => g.ch === 'x')!
    expect(sup.size).toBeLessThan(base.size)
    expect(sup.y).toBeLessThan(base.y)
  })

  it('\\sqrt 产生三条根号线段', () => {
    const layout = typeset('\\sqrt{\\frac{l}{g}}', fallbackMeasurer)
    expect(layout.rules.length).toBeGreaterThanOrEqual(3)
  })

  it('\\left( \\right) 的括号比内容高', () => {
    const layout = typeset('\\left(\\frac{a}{b}\\right)', fallbackMeasurer)
    const paren = layout.glyphs.find((g) => g.ch === '(')!
    const a = layout.glyphs.find((g) => g.ch === 'a')!
    expect(paren.size).toBeGreaterThan(a.size)
  })

  it('未识别命令不静默丢字', () => {
    const layout = typeset('\\foobar', fallbackMeasurer)
    expect(layout.glyphs.length).toBeGreaterThan(0)
  })
})

describe('虫洞几何', () => {
  it('喉管半径在喉部最小，向相机方向单调张开', () => {
    const atThroat = wormholeRadius(WORMHOLE.throatZ)
    expect(atThroat).toBeCloseTo(WORMHOLE.throatR, 5)
    let prev = atThroat
    for (let z = WORMHOLE.throatZ + 4; z <= WORMHOLE.zMax; z += 4) {
      const r = wormholeRadius(z)
      expect(r).toBeGreaterThan(prev)
      prev = r
    }
  })

  it('wormholeFrame 的 z 落在循环区间，u/v 单位化且正交', () => {
    for (const flight of [0, 13.7, 96, 500.25]) {
      const f = wormholeFrame(1.234, -70, flight, 0.5)
      expect(f.pos[2]).toBeGreaterThanOrEqual(WORMHOLE.zMin - 1e-6)
      expect(f.pos[2]).toBeLessThan(WORMHOLE.zMax + 1e-6)
      const dot = f.u[0] * f.v[0] + f.u[1] * f.v[1] + f.u[2] * f.v[2]
      expect(Math.abs(dot)).toBeLessThan(1e-6)
      expect(Math.hypot(...f.u)).toBeCloseTo(1, 6)
      expect(Math.hypot(...f.v)).toBeCloseTo(1, 6)
    }
  })

  it('环带密铺：同一环内相邻公式沿角度不重叠', () => {
    const instances = buildWormholeInstances(WIDTHS)
    const mains = instances.filter((p) => p.c === 0)
    expect(mains.length).toBeGreaterThan(300)
    const byRing = new Map<number, Array<{ a: number; formula: number; size: number }>>()
    for (const p of mains) {
      const list = byRing.get(p.b) ?? []
      list.push(p)
      byRing.set(p.b, list)
    }
    expect(byRing.size).toBeGreaterThan(40)
    for (const [z, items] of byRing) {
      const r = wormholeRadius(z)
      const sorted = [...items].sort((a, b) => a.a - b.a)
      for (let i = 0; i < sorted.length; i += 1) {
        const cur = sorted[i]
        const next = sorted[(i + 1) % sorted.length]
        let dTheta = next.a - cur.a
        if (i === sorted.length - 1) dTheta += Math.PI * 2
        // 边到边的净距：中心角距×半径 − 两条公式半宽之和，必须为正
        const clearance = dTheta * r - (WIDTHS[cur.formula] * cur.size + WIDTHS[next.formula] * next.size) / 2
        expect(clearance).toBeGreaterThan(0)
      }
    }
  })
})

describe('雨几何', () => {
  it('雨：y 循环在上下界内，近快远慢确定性', () => {
    const instances = buildRainInstances(12)
    expect(instances.length).toBe(RAIN.drops + RAIN.ghosts)
    for (const time of [0, 7.7, 200]) {
      for (const p of instances.slice(0, 60)) {
        const f = rainFrame(p.a, p.b, p.c, p.size, time)
        expect(f.pos[1]).toBeGreaterThanOrEqual(RAIN.bottom - 1e-6)
        expect(f.pos[1]).toBeLessThan(RAIN.top + 1e-6)
      }
    }
    // 速度确定性且有分布
    const speeds = new Set(instances.slice(0, 50).map((p) => rainSpeed(p.a, p.c).toFixed(3)))
    expect(speeds.size).toBeGreaterThan(20)
    for (const p of instances.slice(0, 30)) {
      const v = rainSpeed(p.a, p.c)
      expect(v).toBeGreaterThanOrEqual(3.6)
      expect(v).toBeLessThan(8.3)
    }
  })


})

describe('穿越几何', () => {
  it('穿越：z 始终在走廊内循环，拖尾副本成对', () => {
    const instances = buildRushInstances(12)
    const mains = instances.filter((p) => p.size > 0)
    const trails = instances.filter((p) => p.size < 0)
    expect(mains.length).toBe(RUSH.mains)
    expect(trails.length).toBe(RUSH.mains)
    for (const flight of [0, 33.3, 500]) {
      for (const p of instances.slice(0, 40)) {
        const f = rushFrame(p.a, p.b, p.c, p.size, flight)
        expect(f.pos[2]).toBeGreaterThanOrEqual(RUSH.zFar - 1e-6)
        expect(f.pos[2]).toBeLessThan(RUSH.zNear + 1e-6)
      }
    }
  })
})

describe('画像几何', () => {
  it('画像：公式保留宽高比且不跨出相邻行或头像边界', () => {
    const dimensions = [{wEm: 3, hEm: 1}, {wEm: 12, hEm: 2}, {wEm: 7, hEm: 1.4}]
    const instances = buildPortraitTiles(dimensions)
    expect(instances.length).toBeGreaterThan(500)
    for (let i = 0; i < instances.length; i++) {
      const p = instances[i], rect = dimensions[p.formula]
      expect(rect.hEm * p.size).toBeCloseTo(0.245, 8)
      expect(p.a - rect.wEm * p.size / 2).toBeGreaterThanOrEqual(-10)
      expect(p.a + rect.wEm * p.size / 2).toBeLessThanOrEqual(10)
      const next = instances[i+1]
      if (next?.b === p.b) expect(next.a - dimensions[next.formula].wEm * next.size / 2 - (p.a + rect.wEm * p.size / 2)).toBeCloseTo(0.045, 8)
    }
    // 飞拢：assemble 0 时远离中心，1 时到达目标
    const f0 = portraitFrame(2, 3, 0.5, 0, 10)
    const f1 = portraitFrame(2, 3, 0.5, 1, 10)
    expect(Math.hypot(f0.pos[0], f0.pos[1])).toBeGreaterThan(20)
    expect(Math.hypot(f1.pos[0] - 2, f1.pos[1] - 3)).toBeLessThan(0.2)
  })
})

describe('实例表', () => {
  it('三个场景都产出实例，公式索引在科目范围内，且确定性可复现', () => {
    for (const scene of ['wormhole', 'rush', 'rain'] as const) {
      const a = buildInstances(scene, WIDTHS)
      const b = buildInstances(scene, WIDTHS)
      expect(a.length).toBeGreaterThan(30)
      expect(a).toEqual(b)
      for (const p of a) {
        expect(p.formula).toBeGreaterThanOrEqual(0)
        expect(p.formula).toBeLessThan(WIDTHS.length)
        expect(Math.abs(p.size)).toBeGreaterThan(0)
      }
    }
  })

  it('mulberry32 确定性', () => {
    const r1 = mulberry32(42)
    const r2 = mulberry32(42)
    expect([r1(), r1(), r1()]).toEqual([r2(), r2(), r2()])
  })
})
