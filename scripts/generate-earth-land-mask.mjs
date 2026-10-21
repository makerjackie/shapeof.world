/** Shared Natural Earth 110m land mask used by earth-spin-orbit. Public domain.
 * Rebuilds only the retained mask; never recreates the withdrawn cable world.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const outDir = resolve(root, 'public/assets/submarine-cables')
const round2 = value => Math.round(value * 100) / 100

function ringArea(ring) {
  let area = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    area += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1])
  }
  return Math.abs(area / 2)
}

function simplify(ring, epsilon) {
  if (ring.length < 5) return ring
  const keep = new Uint8Array(ring.length)
  keep[0] = 1
  keep[ring.length - 1] = 1
  // A closed ring starts and ends on the same vertex, so the first chord has zero
  // length and every perpendicular distance collapses to 0. Anchor the vertex
  // farthest from the start first, then run Douglas-Peucker on the two halves.
  let pivot = 0
  let pivotDistance = -1
  for (let i = 1; i < ring.length - 1; i += 1) {
    const distance = Math.hypot(ring[i][0] - ring[0][0], ring[i][1] - ring[0][1])
    if (distance > pivotDistance) {
      pivotDistance = distance
      pivot = i
    }
  }
  if (pivot === 0) return ring
  keep[pivot] = 1
  const stack = [[0, pivot], [pivot, ring.length - 1]]
  while (stack.length > 0) {
    const [start, end] = stack.pop()
    if (end - start < 2) continue
    const [x0, y0] = ring[start]
    const [x1, y1] = ring[end]
    const dx = x1 - x0
    const dy = y1 - y0
    const norm = Math.hypot(dx, dy) || 1
    let worst = -1
    let worstIndex = -1
    for (let i = start + 1; i < end; i += 1) {
      const distance = Math.abs(dy * ring[i][0] - dx * ring[i][1] + x1 * y0 - y1 * x0) / norm
      if (distance > worst) {
        worst = distance
        worstIndex = i
      }
    }
    if (worst > epsilon && worstIndex > 0) {
      keep[worstIndex] = 1
      stack.push([start, worstIndex], [worstIndex, end])
    }
  }
  return ring.filter((_, index) => keep[index] === 1)
}

function bakeLand() {
  const source = JSON.parse(readFileSync(resolve(root, 'public/assets/flow/countries.geojson'), 'utf8'))
  const polygons = []
  for (const feature of source.features) {
    const groups = feature.geometry.type === 'Polygon'
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates
    for (const group of groups) {
      const outer = group[0]
      if (!outer || outer.length < 4) continue
      if (ringArea(outer) < 0.6) continue
      const simplified = simplify(outer, 0.16).map(([lon, lat]) => [round2(lon), round2(lat)])
      if (simplified.length < 4) continue
      polygons.push(simplified)
    }
  }
  polygons.sort((left, right) => ringArea(right) - ringArea(left))
  return polygons
}


mkdirSync(outDir, { recursive: true })
writeFileSync(resolve(outDir, 'land.json'), JSON.stringify({ polygons: bakeLand() }))
