import type { Network, Vec3 } from './types'
import { terrainHeight } from './terrain'

export interface GeometryCosts { layers: number; maximumHeight: number; bridgeArea: number; pavementArea: number; rampLength: number; hullArea: number }
function hullArea(points: Vec3[]): number {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.z - b.z)
  const cross = (o: Vec3, a: Vec3, b: Vec3) => (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x)
  const chain = (items: Vec3[]) => { const result: Vec3[] = []; for (const p of items) { while (result.length > 1 && cross(result.at(-2)!, result.at(-1)!, p) <= 0) result.pop(); result.push(p) } return result }
  const polygon = [...chain(sorted).slice(0, -1), ...chain(sorted.reverse()).slice(0, -1)]
  return Math.abs(polygon.reduce((sum, a, i) => { const b = polygon[(i + 1) % polygon.length]; return sum + a.x * b.z - a.z * b.x }, 0)) / 2
}

/** Measures the rendered carriageways, including their leads. No monetary proxy. */
export function measureGeometry(network: Network): GeometryCosts {
  let maximumHeight = 0, bridgeArea = 0, pavementArea = 0, rampLength = 0
  const footprint: Vec3[] = []
  for (const road of network.carriageways) {
    const width = road.laneCount * road.laneWidth + (road.medianWidth ?? 0) + 2 * (road.shoulder ?? 0)
    for (let i = 0; i < road.points.length; i++) {
      const p = road.points[i], next = road.points[Math.min(i + 1, road.points.length - 1)], prev = road.points[Math.max(0, i - 1)]
      const dx = next.x - prev.x, dz = next.z - prev.z, norm = Math.hypot(dx, dz) || 1
      const height = p.y - terrainHeight(network, p.x, p.z)
      maximumHeight = Math.max(maximumHeight, height)
      for (const side of [-1, 1]) footprint.push({ x: p.x - dz / norm * width / 2 * side, y: 0, z: p.z + dx / norm * width / 2 * side })
      if (!i) continue
      const a = road.points[i - 1], length = Math.hypot(p.x - a.x, p.y - a.y, p.z - a.z)
      pavementArea += length * width
      if (road.kind === 'ramp') rampLength += length
      const startHeight = a.y - terrainHeight(network, a.x, a.z)
      const above = height > 2.5 && startHeight > 2.5 ? 1 : height <= 2.5 && startHeight <= 2.5 ? 0 : (Math.max(height, startHeight) - 2.5) / Math.abs(height - startHeight)
      bridgeArea += above * length * width
    }
  }
  return { layers: new Set(network.carriageways.filter(road => road.level >= 0).map(road => road.level)).size, maximumHeight, bridgeArea, pavementArea, rampLength, hullArea: hullArea(footprint) }
}
