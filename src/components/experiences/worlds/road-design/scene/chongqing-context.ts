import type { Network } from '../sim/types'
import { terrainHeight } from '../sim/terrain'

// Scenic extension outside the 3.2 km DEM tile, not surveyed hydrography.
// The Yangtze is west / northwest of the interchange, never through its core.
export const RIVER_LEVEL = -59
export function riverCenter(z: number) { return -2180 + Math.sin((z + 200) / 1100) * 230 }
export function isRiver(x: number, z: number) { return z < -100 && z > -4600 && Math.abs(x - riverCenter(z)) < 245 }
export function scenicGround(network: Network | undefined, x: number, z: number) {
  const source = terrainHeight(network, x, z)
  if (network?.id !== 'huangjuewan' || x > -1700 || z > -100 || z < -4600) return source
  const distance = Math.abs(x - riverCenter(z)), t = Math.min(1, Math.max(0, (distance - 245) / 180))
  return RIVER_LEVEL - 1 + (source - RIVER_LEVEL + 1) * t * t * (3 - 2 * t)
}
