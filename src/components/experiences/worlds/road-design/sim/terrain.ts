import type { Network, TerrainGrid } from './types'

/** Bilinear interpolation in local metres. Outside the DEM, clamp to its edge. */
export function terrainHeight(source: Network | TerrainGrid | undefined, x: number, z: number): number {
  const grid = source && ('lanes' in source ? source.terrain : source)
  if (!grid) return 0
  const u = Math.max(0, Math.min(grid.width - 1, (x - grid.originX) / grid.step))
  const v = Math.max(0, Math.min(grid.height - 1, (z - grid.originZ) / grid.step))
  const ix = Math.min(grid.width - 2, Math.floor(u)), iz = Math.min(grid.height - 2, Math.floor(v))
  const a = u - ix, b = v - iz, at = (dx: number, dz: number) => grid.values[(iz + dz) * grid.width + ix + dx]
  return (at(0, 0) * (1 - a) + at(1, 0) * a) * (1 - b) + (at(0, 1) * (1 - a) + at(1, 1) * a) * b
}
