import * as T from 'three'
import type { Network } from '../sim/types'

/** Rasterize highest physical deck into a top-down height field (no shadow lights).
 * 1.76 m cells cover the junction core; source geometry remains unmodified. */
export function highestDeckTexture(network: Network) {
  const size = 2048, extent = 1800, cell = extent * 2 / size
  const heights = new Float32Array(size * size).fill(-1000)
  for (const road of network.carriageways) {
    const half = (road.laneCount * road.laneWidth + (road.medianWidth ?? 0)) / 2 + (road.shoulder ?? 0)
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1], b = road.points[i], dx = b.x - a.x, dz = b.z - a.z, length2 = dx * dx + dz * dz
      const loX = Math.max(0, Math.floor((Math.min(a.x,b.x)-half+extent)/cell)), hiX = Math.min(size-1, Math.ceil((Math.max(a.x,b.x)+half+extent)/cell))
      const loZ = Math.max(0, Math.floor((Math.min(a.z,b.z)-half+extent)/cell)), hiZ = Math.min(size-1, Math.ceil((Math.max(a.z,b.z)+half+extent)/cell))
      for (let z=loZ; z<=hiZ; z++) for (let x=loX; x<=hiX; x++) {
        const px=(x+.5)*cell-extent, pz=(z+.5)*cell-extent
        const t=Math.max(0,Math.min(1,((px-a.x)*dx+(pz-a.z)*dz)/(length2||1)))
        if (Math.hypot(px-a.x-dx*t,pz-a.z-dz*t)>half) continue
        const k=z*size+x; heights[k]=Math.max(heights[k],a.y+(b.y-a.y)*t)
      }
    }
  }
  const texture = new T.DataTexture(heights,size,size,T.RedFormat,T.FloatType)
  texture.needsUpdate=true
  return texture
}
