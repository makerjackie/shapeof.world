import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as T from 'three'
import { useCutaway, TissueMaterial } from './cutaway'

/** Ellipsoid/plane intersections cap both live cut faces. The other plane clips
 * each cap to the wedge; no decorative organelles are pasted onto the vacuole. */
export function OrganelleSections({ source,count,color,name,opacity,radii=[1,1,1],kind='solid',stride=1 }: {
  source:RefObject<T.InstancedMesh|null>;count:number;color:string;name:string;opacity:number;radii?:[number,number,number];kind?:'solid'|'chloroplast-cut';stride?:number
}) {
  const a=useRef<T.InstancedMesh>(null),b=useRef<T.InstancedMesh>(null),cut=useCutaway()
  const scratch=useMemo(()=>({body:new T.Matrix4(),inverse:new T.Matrix4(),plane:new T.Plane(),cap:new T.Object3D(),z:new T.Vector3(0,0,1),radii:new T.Matrix4()}),[])
  const geometry=useMemo(()=>new T.CircleGeometry(1,24),[])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  useLayoutEffect(()=>{for(const m of[source.current,a.current,b.current])if(m)m.boundingSphere=new T.Sphere(new T.Vector3(),50)},[source])
  useFrame(()=>{
    if(!source.current||!cut)return
    for(const ref of[a,b])if(ref.current)ref.current.visible=source.current.visible
    for(let node:T.Object3D|null=source.current;node;node=node.parent)if(!node.visible)return
    source.current.updateWorldMatrix(true,false);scratch.radii.makeScale(...radii)
    for(const [face,ref]of[a,b].entries()){
      if(!ref.current)continue
      for(let i=0;i<count;i++){
        source.current.getMatrixAt(i,scratch.body);scratch.body.multiply(scratch.radii)
        scratch.inverse.multiplyMatrices(source.current.matrixWorld,scratch.body).invert()
        scratch.plane.copy(cut.planes[face]??cut.plane).applyMatrix4(scratch.inverse)
        const d=scratch.plane.constant,r=i%stride===0?Math.sqrt(Math.max(0,1-d*d)):0
        scratch.cap.position.copy(scratch.plane.normal).multiplyScalar(-d-.055)
        scratch.cap.quaternion.setFromUnitVectors(scratch.z,scratch.plane.normal)
        scratch.cap.scale.set(r,r,1);scratch.cap.updateMatrix()
        ref.current.setMatrixAt(i,scratch.body.multiply(scratch.cap.matrix))
      }
      ref.current.instanceMatrix.needsUpdate=true
    }
  })
  return <>{[a,b].map((ref,face)=><instancedMesh key={face} ref={ref} name={name} args={[geometry,undefined,count]} frustumCulled={false}>
    <TissueMaterial color={color} opacity={opacity} clipped={false} face={face} kind={kind}/>
  </instancedMesh>)}</>
}
