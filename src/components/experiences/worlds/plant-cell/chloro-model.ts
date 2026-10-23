/** All lengths are micrometres. These are seeded statistical shapes, not a scan. */
export const CHLOROPLAST_RADII = [3, 1.9, 1.15] as const
export const GRANUM_REPEAT_UM = 0.018

export type ChloroplastPoint = readonly [number, number, number]
export type Granum = {
  center: ChloroplastPoint
  radius: number
  layers: number
  phase: number
}

export function chloroplastRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

export function createChloroplastMorphology() {
  const random = chloroplastRandom(623014)
  const grana: Granum[] = []
  // Fifty stacks fall within the design's 40–60 range. Leave a stromal margin
  // and enough separation that individual stacks remain legible in three dimensions.
  for (let attempt = 0; grana.length < 50 && attempt < 5000; attempt++) {
    const center: ChloroplastPoint = [
      (random() * 2 - 1) * 2.48,
      (random() * 2 - 1) * 1.38,
      (random() * 2 - 1) * 0.65,
    ]
    if ((center[0] / 2.53) ** 2 + (center[1] / 1.53) ** 2 + (center[2] / 0.83) ** 2 > 1) continue
    // Reserve stromal space for the three starch inclusions in the renderer.
    if ([[-1.25, -0.53, 0.16, 0.72, 0.5, 0.37], [0.98, 0.7, -0.23, 0.58, 0.44, 0.34], [1.65, -0.55, 0.12, 0.44, 0.34, 0.29]]
      .some(([x, y, z, rx, ry, rz]) => ((center[0] - x) / rx) ** 2 + ((center[1] - y) / ry) ** 2 + ((center[2] - z) / rz) ** 2 < 1)) continue
    if (grana.some(({ center: other }) => Math.hypot(center[0] - other[0], center[1] - other[1], center[2] - other[2]) < 0.49)) continue
    grana.push({ center, radius: 0.15 + random() * 0.125, layers: 7 + Math.floor(random() * 17), phase: random() * Math.PI * 2 })
  }
  const connections: [number, number][] = []
  const connected = new Set<string>()
  grana.forEach((granum, index) => {
    const nearest = grana
      .map((other, otherIndex) => ({ index: otherIndex, distance: Math.hypot(...granum.center.map((v, axis) => v - other.center[axis])) }))
      .filter((other) => other.index !== index)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 2)
    for (const other of nearest) {
      const pair: [number, number] = [Math.min(index, other.index), Math.max(index, other.index)]
      const key = pair.join(':')
      if (!connected.has(key)) {
        connections.push(pair)
        connected.add(key)
      }
    }
  })
  return { grana, connections }
}
