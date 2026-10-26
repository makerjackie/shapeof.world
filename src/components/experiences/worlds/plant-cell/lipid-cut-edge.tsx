import { useLayoutEffect, useMemo, useRef } from 'react'
import * as T from 'three'
import { PaintMaterial } from './illustration'

/** Explicit two-leaflet molecules at the exposed cut. Heads face the water on
 * both sides, paired hydrocarbon tails face inward. All coordinates are nm. */
export function LipidCutEdge({opacity,membrane,lumen,section}:{opacity:number;membrane:number;lumen:number;section:number}) {
  const heads=useRef<T.InstancedMesh>(null),tails=useRef<T.InstancedMesh>(null)
  const positions=useMemo(()=>{
    const points:Array<[number,number,number,number]>=[]
    const z=Math.max(78,Math.min(165.6,section-.25))
    // The lamella occupies x=-75..95, z=78..166; show only its actual cut.
    for(const lower of[0,1])for(let i=0;i<140;i++)for(const side of[-1,1]){
      const x=-74.5+i*1.21
      points.push([x,-lower*(lumen+membrane)+side*(membrane/2+.10),z+(i%3)*.06,side])
    }
    return points
  },[membrane,lumen,section])
  useLayoutEffect(()=>{
    const o=new T.Object3D()
    positions.forEach(([x,y,z,side],i)=>{
      o.position.set(x,y,z);o.scale.setScalar(1);o.updateMatrix();heads.current?.setMatrixAt(i,o.matrix)
      for(let t=0;t<2;t++){
        o.position.set(x+(t-.5)*.40,y-side*membrane*.25,z+.65)
        o.rotation.set(0,0,(t-.5)*.12);o.scale.set(1,membrane*.44,1);o.updateMatrix();tails.current?.setMatrixAt(i*2+t,o.matrix)
      }
    })
    for(const r of[heads,tails])if(r.current){r.current.instanceMatrix.needsUpdate=true;r.current.computeBoundingSphere()}
  },[positions,membrane])
  return <group name="exposed-lipid-leaflets" visible={section>=78}>
    <instancedMesh ref={heads} args={[undefined,undefined,positions.length]}><sphereGeometry args={[.40,8,6]}/><PaintMaterial color="#86b848" transparent opacity={opacity}/></instancedMesh>
    <instancedMesh ref={tails} args={[undefined,undefined,positions.length*2]}><cylinderGeometry args={[.17,.14,1,6]}/><PaintMaterial color="#d5a544" transparent opacity={opacity}/></instancedMesh>
  </group>
}
