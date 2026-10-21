import { mulberry32, type InstanceParams } from './equation-wormhole-model'

export type ShapeId = 'blackhole' | 'mobius'
export type Vec3 = [number, number, number]
export type ShapeFrame = { pos: Vec3; u: Vec3; v: Vec3; opacity: number }
const TAU = Math.PI * 2
const unit = (v: Vec3): Vec3 => { const n = Math.hypot(...v); return v.map(x => x / n) as Vec3 }
const smooth = (a: number, b: number, x: number) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k) }
export const isShape = (id: string): id is ShapeId => id === 'blackhole' || id === 'mobius'

export function mobiusPoint(theta: number, width: number): Vec3 {
  const r = 12 + width * Math.cos(theta / 2)
  return [r * Math.cos(theta), width * Math.sin(theta / 2), r * Math.sin(theta)]
}

export type LensView = { right: Vec3; up: Vec3; forward: Vec3; inclination: number }

export function blackholeSheet(theta: number, r: number, time = 0): Vec3 {
  const lift = Math.pow(Math.max(0, r - 9) / 28, 1.6)
  return [r * Math.cos(theta), lift * (4.6 * Math.sin(theta * 2 + 0.5 + time * 0.12) + 2.2 * Math.cos(theta * 3 - time * 0.09)), r * Math.sin(theta)]
}

export function shapeFrame(id: ShapeId, p: InstanceParams, time: number, view?: LensView): ShapeFrame {
  if (id === 'mobius') {
    // A full material circuit takes 4π: after 2π the transverse coordinate reverses.
    const theta = p.a + time * 0.12
    const half = theta / 2
    const r = 12 + p.b * Math.cos(half)
    const dr = -0.5 * p.b * Math.sin(half)
    const u = unit([dr * Math.cos(theta) - r * Math.sin(theta), 0.5 * p.b * Math.cos(half), dr * Math.sin(theta) + r * Math.cos(theta)])
    const v = unit([Math.cos(half) * Math.cos(theta), Math.sin(half), Math.cos(half) * Math.sin(theta)])
    return { pos: mobiusPoint(theta, p.b), u, v, opacity: 1 }
  }
  const radius = p.c === 1 ? p.b : 6.6 + ((p.b - 6.6 - time * 0.48) % 43 + 43) % 43
  const theta = p.a + time * 0.32 * Math.pow(9 / Math.max(7, p.b), 1.5) + (p.b - radius) * 0.09
  if (p.c === 1) {
    // Optical arc is camera-facing: it depicts the bent image, not an upright material ring.
    const r = 6.15 + (p.b - 7) * 0.18
    const a = [r * Math.cos(theta), r * Math.sin(theta), -1] as Vec3
    const u = [-Math.sin(theta), Math.cos(theta), 0] as Vec3
    const v = [Math.cos(theta), Math.sin(theta), 0] as Vec3
    const transform = (p: Vec3): Vec3 => view ? p.map((_, i) => view.right[i] * p[0] + view.up[i] * p[1] + view.forward[i] * p[2]) as Vec3 : p
    return { pos: transform(a), u: transform(u), v: transform(v), opacity: 0.45 * (1 - (view?.inclination ?? 0)) }
  }
  if (p.c >= 10) {
    // Equations occupy a volume above and below the disk. Their orientation is
    // fixed in world space, so orbiting reveals foreshortening and real parallax.
    const band = p.c - 13
    const spread = smooth(8, 17, radius)
    const y = spread * (band * 4.2 + Math.sin(theta * 1.7 + p.c) * 2.4)
    const yaw = p.a * 0.22 + Math.sin(p.c * 7.1) * 0.7
    const roll = Math.sin(p.a * 2.3 + p.c) * 0.28
    const right: Vec3 = [Math.cos(yaw), 0, -Math.sin(yaw)]
    const u: Vec3 = [right[0] * Math.cos(roll), Math.sin(roll), right[2] * Math.cos(roll)]
    const v: Vec3 = [-right[0] * Math.sin(roll), Math.cos(roll), -right[2] * Math.sin(roll)]
    return {
      pos: [radius * Math.cos(theta), y, radius * Math.sin(theta)], u, v,
      opacity: smooth(8, 12, radius) * (1 - smooth(45, 49.6, radius)),
    }
  }
  const pos = blackholeSheet(theta, radius, time)
  const da = blackholeSheet(theta + 0.001, radius, time)
  const dr = blackholeSheet(theta, radius + 0.001, time)
  let u = unit(da.map((x, i) => x - pos[i]) as Vec3)
  let v = unit(dr.map((x, i) => x - pos[i]) as Vec3)
  if (view) {
    if (u.reduce((sum, x, i) => sum + x * view.right[i], 0) < 0) u = u.map(x => -x) as Vec3
    if (v.reduce((sum, x, i) => sum + x * view.up[i], 0) < 0) v = v.map(x => -x) as Vec3
  }
  return {
    pos, u, v,
    opacity: smooth(6.6, 8.2, radius) * (1 - smooth(46, 49.6, radius)) * (0.76 + 0.24 * (1 - Math.cos(theta)) / 2),
  }
}

export function buildShapeInstances(id: ShapeId, widths: number[]): InstanceParams[] {
  const rng = mulberry32(731)
  const out: InstanceParams[] = []
  const add = (a: number, b: number, c: number, width: number, bright: number) => {
    const formula = Math.floor(rng() * widths.length)
    out.push({ a, b, c, formula, size: width / Math.max(1, widths[formula]), bright })
  }
  if (id === 'mobius') {
    for (let row = 0; row < 13; row++) {
      const w = (row - 6) * 0.65
      for (let j = 0; j < 78; j++) add(j * TAU / 78, w, 0, 0.67 + rng() * 0.38, row === 0 || row === 12 ? 1 : 0.58 + rng() * 0.28)
    }
  } else {
    // Dense inner lines and much larger outer glyphs create real perspective, not a uniform text carpet.
    for (let row = 0; row < 36; row++) {
      const r = 7 + row * 0.35
      const n = Math.floor(TAU * r / 1.4)
      for (let j = 0; j < n; j++) add((j + rng() * 0.6) * TAU / n, r, 0, 0.7 + rng() * 0.9, 0.28 + rng() * 0.5)
    }
    for (let row = 0; row < 10; row++) {
      const r = 18 + row * 3.1
      const n = Math.floor(TAU * r / 5.5)
      for (let j = 0; j < n; j++) add((j + rng() * 0.6 + row * 0.35) * TAU / n, r, 2, 2.4 + rng() * 3.8, 0.45 + rng() * 0.5)
    }
    for (let row = 0; row < 10; row++) {
      const r = 19 + row * 2.7
      const n = Math.floor(TAU * r / 2.5)
      for (let j = 0; j < n; j++) add((j + row * 0.41) * TAU / n, r + 0.55, 2, 0.85 + rng() * 1.1, 0.12 + rng() * 0.18)
    }
    // Sparse, tall orbital streams: room between equations is as important as density.
    for (let band = 0; band < 7; band++) {
      for (let j = 0; j < 64; j++) {
        const r = 14 + rng() * 33
        add((j + rng() * 0.8) * TAU / 64, r, 10 + band,
          1.4 + rng() * 3.6, 0.4 + rng() * 0.55)
      }
    }
    for (let row = 0; row < 10; row++) {
      const r = 7 + row * 0.65
      for (let j = 0; j < 70; j++) add((j + row * 0.21) * TAU / 70, r, 1, 0.3 + rng() * 0.35, 0.35 + rng() * 0.4)
    }
  }
  return out
}
