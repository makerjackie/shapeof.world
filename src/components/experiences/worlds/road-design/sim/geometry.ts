import type { Lane, Vec3 } from './types'
export interface LaneSample { position: Vec3; tangent: Vec3 }
export function cumulativeLengths(points: Vec3[]): number[] {
  const result = [0]
  for (let i = 1; i < points.length; i++) result.push(result[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y, points[i].z - points[i - 1].z))
  return result
}
export function sampleLane(lane: Lane, s: number): LaneSample {
  const lengths = lane.cumulative ?? (lane.cumulative = cumulativeLengths(lane.points))
  const at = Math.max(0, Math.min(lengths[lengths.length - 1], s))
  let lo = 0, hi = Math.max(0, lengths.length - 2)
  while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (lengths[mid] <= at) lo = mid; else hi = mid - 1 }
  const a = lane.points[lo], b = lane.points[lo + 1] ?? a
  const length = Math.max(1e-9, lengths[lo + 1] - lengths[lo])
  const t = Math.max(0, Math.min(1, (at - lengths[lo]) / length))
  return { position: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t }, tangent: { x: (b.x - a.x) / length, y: (b.y - a.y) / length, z: (b.z - a.z) / length } }
}
export function projectToLane(lane: Lane, point: Vec3): number {
  const lengths = lane.cumulative ?? (lane.cumulative = cumulativeLengths(lane.points))
  let nearest = Infinity, position = 0
  for (let i = 0; i < lane.points.length - 1; i++) {
    const a = lane.points[i], b = lane.points[i + 1]
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z
    const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy + (point.z - a.z) * dz) / Math.max(1e-9, dx * dx + dy * dy + dz * dz)))
    const distance = (point.x - a.x - t * dx) ** 2 + (point.y - a.y - t * dy) ** 2 + (point.z - a.z - t * dz) ** 2
    if (distance < nearest) { nearest = distance; position = lengths[i] + t * (lengths[i + 1] - lengths[i]) }
  }
  return position
}
