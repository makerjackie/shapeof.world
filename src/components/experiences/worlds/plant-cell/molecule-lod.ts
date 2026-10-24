import type { MoleculeSurface } from './molecule-data'

/** Vertex-cluster LOD for repeated, subpixel molecular surface detail. The
 * downloaded PDB-derived mesh and the 39,204-atom motor remain unchanged. */
export function clusterMoleculeSurface(source: MoleculeSurface, cellNm = .6): MoleculeSurface {
  const clusters = new Map<string, number>(), remap = new Uint16Array(source.positions.length / 3)
  const positions: number[] = [], normals: number[] = [], colors: number[] = [], counts: number[] = []
  for (let i = 0; i < remap.length; i++) {
    const p = i * 3
    const key = [0, 1, 2].map(k => Math.floor(source.positions[p + k] / cellNm)).join(',')
    let id = clusters.get(key)
    if (id === undefined) {
      id = counts.length; clusters.set(key, id); counts.push(0)
      positions.push(0, 0, 0); normals.push(0, 0, 0); colors.push(0, 0, 0)
    }
    remap[i] = id; counts[id]++
    for (let k = 0; k < 3; k++) {
      positions[id * 3 + k] += source.positions[p + k]
      normals[id * 3 + k] += source.normals[p + k]
      colors[id * 3 + k] += source.colors[p + k]
    }
  }
  counts.forEach((count, id) => {
    const p = id * 3, length = Math.hypot(normals[p], normals[p + 1], normals[p + 2]) || 1
    for (let k = 0; k < 3; k++) { positions[p + k] /= count; colors[p + k] /= count; normals[p + k] /= length }
  })
  const indices: number[] = [], seen = new Set<string>()
  for (let i = 0; i < source.indices.length; i += 3) {
    const a = remap[source.indices[i]], b = remap[source.indices[i + 1]], c = remap[source.indices[i + 2]]
    if (a === b || b === c || a === c) continue
    const key = [a, b, c].sort((x, y) => x - y).join(',')
    if (seen.has(key)) continue
    seen.add(key); indices.push(a, b, c)
  }
  return { ...source, positions: new Float32Array(positions), normals: new Float32Array(normals), colors: new Float32Array(colors), indices: new Uint16Array(indices) }
}
