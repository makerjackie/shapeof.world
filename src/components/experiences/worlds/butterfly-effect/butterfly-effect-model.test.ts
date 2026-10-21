import { describe, expect, it } from 'vitest'

import {
  ATTRACTOR_ORDER,
  ATTRACTORS,
  buildShareQuery,
  deriv,
  generateCustomAttractor,
  isFiniteState,
  mulberry32,
  paramsModified,
  resolveShareDef,
  rk4Step,
  separation,
  speedOf,
  survives,
  toWorld,
  withParam,
  type Vec3,
} from './butterfly-effect-model'

function clone(p: Vec3): Vec3 {
  return { x: p.x, y: p.y, z: p.z }
}

describe('butterfly-effect model', () => {
  it('keeps every attractor bounded over long RK4 runs', () => {
    for (const id of ATTRACTOR_ORDER) {
      const def = ATTRACTORS[id]
      const p = clone(def.seed)
      const steps = Math.round(400 / def.dt) // 400 个模型时间单位
      for (let i = 0; i < steps; i += 1) rk4Step(def, p, def.dt)
      expect(isFiniteState(p), `${id} diverged`).toBe(true)
    }
  })

  it('is deterministic: same seed, same trajectory', () => {
    const def = ATTRACTORS.lorenz
    const a = clone(def.seed)
    const b = clone(def.seed)
    for (let i = 0; i < 2000; i += 1) {
      rk4Step(def, a, def.dt)
      rk4Step(def, b, def.dt)
    }
    expect(separation(a, b)).toBe(0)
  })

  it('amplifies a 1e-6 twin offset by orders of magnitude (sensitive dependence)', () => {
    const def = ATTRACTORS.lorenz
    const a = clone(def.seed)
    const b = { x: def.seed.x + def.twinOffset, y: def.seed.y, z: def.seed.z }
    const early = separation(a, b)
    expect(early).toBeCloseTo(1e-6, 9)
    const steps = Math.round(18 / def.dt) // 约 18 个时间单位，λ≈0.9 → e^16 ≈ 9e6 倍上限
    for (let i = 0; i < steps; i += 1) {
      rk4Step(def, a, def.dt)
      rk4Step(def, b, def.dt)
    }
    const late = separation(a, b)
    expect(late).toBeGreaterThan(early * 100)
  })

  it('RK4 stays consistent under step refinement (数值稳定，不爆炸)', () => {
    const def = ATTRACTORS.thomas
    const coarse = clone(def.seed)
    rk4Step(def, coarse, def.dt)
    const fine = clone(def.seed)
    for (let i = 0; i < 4; i += 1) rk4Step(def, fine, def.dt / 4)
    expect(separation(coarse, fine)).toBeLessThan(1e-8)
  })

  it('maps attractor coordinates into a compact world volume', () => {
    for (const id of ATTRACTOR_ORDER) {
      const def = ATTRACTORS[id]
      const p = clone(def.seed)
      const w = { x: 0, y: 0, z: 0 }
      let maxR = 0
      const steps = Math.round(200 / def.dt)
      for (let i = 0; i < steps; i += 1) {
        rk4Step(def, p, def.dt)
        toWorld(def, p, w)
        maxR = Math.max(maxR, Math.hypot(w.x, w.y, w.z))
      }
      expect(maxR, `${id} world radius ${maxR}`).toBeGreaterThan(0.5)
      expect(maxR, `${id} world radius ${maxR}`).toBeLessThan(6)
    }
  })

  it('produces positive, finite speeds along the flow', () => {
    for (const id of ATTRACTOR_ORDER) {
      const def = ATTRACTORS[id]
      const p = clone(def.seed)
      for (let i = 0; i < 100; i += 1) rk4Step(def, p, def.dt)
      const v = speedOf(def, p)
      expect(Number.isFinite(v)).toBe(true)
      expect(v).toBeGreaterThan(0)
    }
  })

  it('exposes three display equations per attractor', () => {
    for (const id of ATTRACTOR_ORDER) {
      expect(ATTRACTORS[id].equations).toHaveLength(3)
    }
    const out = { x: 0, y: 0, z: 0 }
    deriv(ATTRACTORS.lorenz, { x: 1, y: 1, z: 1 }, out)
    expect(out.x).toBe(0)
    expect(out.y).toBe(26)
    expect(out.z).toBeCloseTo(1 - 8 / 3, 9)
  })
})

describe('random attractor generator (Sprott search + Lyapunov filter)', () => {
  it('mulberry32 is deterministic', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    for (let i = 0; i < 100; i += 1) expect(a()).toBe(b())
  })

  it('finds bounded, confirmed-chaotic custom systems for a seed range', { timeout: 120_000 }, () => {
    // 连试 8 个种子：大多数必须命中；命中的系统要满足全部展示约束。
    let hits = 0
    for (let seed = 1; seed <= 8; seed += 1) {
      const def = generateCustomAttractor(seed)
      if (!def) continue
      hits += 1
      expect(def.lyapunov, `seed ${seed} λ`).toBeGreaterThan(0.04)
      expect(def.poly).toHaveLength(30)
      // 归一化后的展示约束：长期运行有界、落在紧凑世界体积内
      const p = clone(def.seed)
      const w = { x: 0, y: 0, z: 0 }
      let maxR = 0
      const steps = Math.round(120 / def.dt)
      for (let i = 0; i < steps; i += 1) {
        rk4Step(def, p, def.dt)
        toWorld(def, p, w)
        maxR = Math.max(maxR, Math.hypot(w.x, w.y, w.z))
      }
      expect(isFiniteState(p), `seed ${seed} diverged on display`).toBe(true)
      expect(maxR, `seed ${seed} world radius ${maxR}`).toBeLessThan(8)
      expect(def.speedHi).toBeGreaterThan(def.speedLo)
    }
    expect(hits).toBeGreaterThanOrEqual(4)
  })

  it('generates the same system twice for the same seed (可分享)', () => {
    const a = generateCustomAttractor(7)
    const b = generateCustomAttractor(7)
    expect(a).not.toBeNull()
    expect(b).not.toBeNull()
    expect(Array.from(a!.poly!)).toEqual(Array.from(b!.poly!))
    expect(a!.lyapunov).toBeCloseTo(b!.lyapunov, 12)
  })
})

describe('sensitive params on custom systems', () => {
  it('exposes exactly 3 coefficient sliders, deterministic per seed', () => {
    const a = generateCustomAttractor(42)
    expect(a).not.toBeNull()
    expect(a!.paramDefs).toHaveLength(3)
    for (const pd of a!.paramDefs!) {
      expect(pd.key).toMatch(/^c([0-9]|[12][0-9])$/)
      expect(a!.params![pd.key]).toBeCloseTo(pd.default, 12)
      expect(pd.min).toBeLessThan(pd.default)
      expect(pd.max).toBeGreaterThan(pd.default)
      expect(pd.step).toBeGreaterThan(0)
    }
    const b = generateCustomAttractor(42)!
    expect(b.paramDefs!.map((pd) => pd.key)).toEqual(a!.paramDefs!.map((pd) => pd.key))
  })

  it('clamps every slider’s travel to the probed survival window', () => {
    const def = generateCustomAttractor(42)!
    for (const pd of def.paramDefs!) {
      // 两端都是扫描时实测存活的取值：整个行程怎么拧都活着
      expect(survives(withParam(def, pd.key, pd.min), def.seed), `${pd.key} min`).toBe(true)
      expect(survives(withParam(def, pd.key, pd.max), def.seed), `${pd.key} max`).toBe(true)
    }
  })

  it('withParam rewrites the polynomial, params and display equations', () => {
    const def = generateCustomAttractor(42)!
    const pd = def.paramDefs![0]
    const index = Number(pd.key.slice(1))
    const next = withParam(def, pd.key, pd.default + 0.1)
    expect(next.poly![index]).toBeCloseTo(pd.default + 0.1, 12)
    expect(next.params![pd.key]).toBeCloseTo(pd.default + 0.1, 12)
    expect(next.equations.join('\n')).not.toBe(def.equations.join('\n'))
    expect(paramsModified(next)).toBe(true)
    // 原对象不被改动
    expect(def.poly![index]).toBeCloseTo(pd.default, 12)
  })

  it('survives flags an exploding quadratic field but not the classics', () => {
    const base = generateCustomAttractor(42)!
    // ẋ = x²：从 x=1 出发在有限时间内爆炸
    const poly = new Float64Array(30)
    poly[3] = 1
    const bad: typeof base = { ...base, poly, params: undefined, paramDefs: undefined }
    expect(survives(bad, { x: 1, y: 0, z: 0 })).toBe(false)
    for (const id of ATTRACTOR_ORDER) {
      expect(survives(ATTRACTORS[id], ATTRACTORS[id].seed), `${id} should survive`).toBe(true)
    }
  })
})

describe('share link encoding', () => {
  it('plain defaults encode to a bare attractor id', () => {
    expect(buildShareQuery(ATTRACTORS.lorenz)).toBe('attractor=lorenz')
  })

  it('round-trips tweaked classic params', () => {
    const tweaked = withParam(ATTRACTORS.lorenz, 'rho', 40.5)
    const query = buildShareQuery(tweaked)
    expect(query).toContain('attractor=lorenz')
    expect(query).toContain('rho:40.5')
    const restored = resolveShareDef(new URLSearchParams(query))
    expect(restored.id).toBe('lorenz')
    expect(restored.params!.rho).toBeCloseTo(40.5, 9)
    expect(restored.params!.sigma).toBeCloseTo(10, 9)
  })

  it('round-trips custom seed plus coefficient overrides', { timeout: 120_000 }, () => {
    const custom = generateCustomAttractor(7)!
    const pd = custom.paramDefs![0]
    const tweaked = withParam(custom, pd.key, pd.default + 0.2)
    const query = buildShareQuery(tweaked)
    expect(query).toContain('seed=7')
    expect(query).toContain('adj=')
    const restored = resolveShareDef(new URLSearchParams(query))
    const index = Number(pd.key.slice(1))
    expect(restored.poly![index]).toBeCloseTo(tweaked.poly![index], 3)
    expect(restored.params![pd.key]).toBeCloseTo(tweaked.params![pd.key], 3)
    // 未拧动的系数与原版一致
    const untouched = custom.paramDefs![1]
    const ui = Number(untouched.key.slice(1))
    expect(restored.poly![ui]).toBeCloseTo(custom.poly![ui], 12)
  })

  it('clamps malicious or out-of-range share values', () => {
    const restored = resolveShareDef(new URLSearchParams('attractor=lorenz&p=rho:9999,sigma:abc,beta:2'))
    expect(restored.params!.rho).toBe(99) // 钳到滑杆上限
    expect(restored.params!.sigma).toBe(10) // 非数字忽略
    expect(restored.params!.beta).toBe(2)
  })
})
