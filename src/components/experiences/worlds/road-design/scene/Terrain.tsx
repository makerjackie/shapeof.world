import { useEffect, useMemo } from 'react'
import * as T from 'three'
import type { Network } from '../sim/types'
import { scenicGround } from './chongqing-context'

export function Terrain({ network, material }: { network: Network; material: T.Material }) {
  const geometry = useMemo(() => {
    const grid = network.terrain
    if (!grid) return null
    // Keep the source's 25 m central spacing, extending its edge elevations
    // beneath the distant context buildings so no skyline floats above a plane.
    const padding=[-6000,-4500,-3200,-2500,-2000,-1800]
    const xs=[...padding,...Array.from({length:grid.width},(_,i)=>grid.originX+i*grid.step),...padding.map(x=>-x).reverse()]
    const zs=[...padding,...Array.from({length:grid.height},(_,i)=>grid.originZ+i*grid.step),...padding.map(x=>-x).reverse()]
    const geometry = new T.PlaneGeometry(1,1,xs.length-1,zs.length-1)
    geometry.rotateX(-Math.PI/2)
    const positions=geometry.getAttribute('position')
    for(let iz=0;iz<zs.length;iz++)for(let ix=0;ix<xs.length;ix++) {
      const x=xs[ix],z=zs[iz]
      positions.setXYZ(iz*xs.length+ix,x,scenicGround(network,x,z)-.18,z)
    }
    geometry.computeVertexNormals();geometry.computeBoundingSphere()
    return geometry
  },[network])
  useEffect(()=>()=>geometry?.dispose(),[geometry])
  return geometry ? <mesh geometry={geometry} material={material}/> : null
}
