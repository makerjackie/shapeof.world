import { useEffect, useMemo } from 'react'
import * as T from 'three'
import type { Network } from '../sim/types'
import { mergeGeometry, strip } from './mesh-kit'
export function WaitingOutline({ network }: { network: Network }) {
  const geometry=useMemo(()=>mergeGeometry(network.lanes.filter(l=>l.waitingArea).flatMap(l=>[-1,1].map(side=>strip(l.points,.24,side*l.width/2,.12)))),[network])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  return <mesh geometry={geometry}><meshBasicMaterial color={[1.8,1.05,.28]} transparent opacity={.7} toneMapped={false} side={T.DoubleSide}/></mesh>
}
