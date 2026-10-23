import type { Lane, Vec3 } from '../sim/types'

export const GROUND = 0.12
export const point = (x: number, z: number, y = GROUND): Vec3 => ({ x, y, z })
export const distance = (a: Vec3, b: Vec3) => Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)
export const lengthOf = (points: Vec3[]) => points.slice(1).reduce((sum, p, i) => sum + distance(points[i], p), 0)
export const smoothstep = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t) }
export const mix = (a: Vec3, b: Vec3, t: number): Vec3 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t })

export function line(a: Vec3, b: Vec3, spacing = 8): Vec3[] {
  const count = Math.max(1, Math.ceil(distance(a, b) / spacing))
  return Array.from({ length: count + 1 }, (_, i) => mix(a, b, i / count))
}

/** Cubic tangents give the road a continuous heading at its connections. */
export function bezier(a: Vec3, b: Vec3, c: Vec3, d: Vec3, count = 64): Vec3[] {
  return Array.from({ length: count + 1 }, (_, i) => {
    const t = i / count, s = 1 - t
    return { x: s ** 3 * a.x + 3 * s * s * t * b.x + 3 * s * t * t * c.x + t ** 3 * d.x, y: s ** 3 * a.y + 3 * s * s * t * b.y + 3 * s * t * t * c.y + t ** 3 * d.y, z: s ** 3 * a.z + 3 * s * s * t * b.z + 3 * s * t * t * c.z + t ** 3 * d.z }
  })
}

export function arc(center: Vec3, radius: number, start: number, sweep: number, count = 120): Vec3[] {
  return Array.from({ length: count + 1 }, (_, i) => point(center.x + radius * Math.cos(start + sweep * i / count), center.z + radius * Math.sin(start + sweep * i / count), center.y))
}

export function rotate(p: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle), s = Math.sin(angle)
  return { x: p.x * c - p.z * s, y: p.y, z: p.x * s + p.z * c }
}

export function offsetPath(points: Vec3[], offset: number): Vec3[] {
  return points.map((p, i) => {
    const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)]
    const length = Math.hypot(b.x - a.x, b.z - a.z) || 1
    return { x: p.x - (b.z - a.z) / length * offset, y: p.y, z: p.z + (b.x - a.x) / length * offset }
  })
}

export function joinPaths(...paths: Vec3[][]): Vec3[] {
  const result: Vec3[] = []
  for (const path of paths) for (const p of path) if (!result.length || distance(result[result.length - 1], p) > 0.00001) result.push(p)
  return result
}

export function lane(id: string, points: Vec3[], options: Omit<Lane, 'id' | 'points' | 'length' | 'cumulative'>): Lane {
  const cumulative = [0]
  for (let i = 1; i < points.length; i++) cumulative.push(cumulative[i - 1] + distance(points[i - 1], points[i]))
  return { id, points, length: cumulative[cumulative.length - 1], cumulative, ...options }
}

export function routePoints(lanes: Lane[], route: string[]): Vec3[] {
  const byId = new Map(lanes.map(l => [l.id, l]))
  return joinPaths(...route.map(id => byId.get(id)?.points ?? []))
}
