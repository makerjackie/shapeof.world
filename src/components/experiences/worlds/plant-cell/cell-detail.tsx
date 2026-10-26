import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { useFrame } from '@react-three/fiber'
import { TissueMaterial, useCutaway } from './cutaway'
import { cellRadius } from './cell-geometry'

export const NUCLEUS_CENTER: [number,number,number]=[-8.3,-10,7.7]

/** Open double envelope, a solid nucleolus, chromatin and actual pore rings. */
export function CellNucleus({opacity}:{opacity:number}) {
  const pores=useRef<T.InstancedMesh>(null),chromatin=useRef<T.InstancedMesh>(null)
  useLayoutEffect(()=>{
    const o=new T.Object3D(),z=new T.Vector3(0,0,1)
    for(let i=0;i<126;i++){
      const y=1-(i+.5)/126*2,a=i*2.399963,r=Math.sqrt(1-y*y),n=new T.Vector3(r*Math.cos(a),y,r*Math.sin(a))
      o.position.copy(n).multiplyScalar(4.04);o.quaternion.setFromUnitVectors(z,n);o.scale.setScalar(1);o.updateMatrix();pores.current?.setMatrixAt(i,o.matrix)
    }
    for(let i=0;i<120;i++){
      const a=i*2.399963,y=((i*37%121)/121*2-1),r=1.3+(i%11)*.21,rr=Math.sqrt(1-y*y)
      o.position.set(Math.cos(a)*r*rr,y*r,Math.sin(a)*r*rr);o.rotation.set(i*.3,i*.7,i);o.scale.set(.13+(i%4)*.04,.12,.19);o.updateMatrix();chromatin.current?.setMatrixAt(i,o.matrix)
    }
    for(const ref of[pores,chromatin])if(ref.current){ref.current.instanceMatrix.needsUpdate=true;ref.current.computeBoundingSphere()}
  },[])
  return <group name="cell-nucleus" position={NUCLEUS_CENTER}>
    <mesh><sphereGeometry args={[4,48,32]}/><TissueMaterial color="#bd65b9" kind="nucleus" opacity={opacity}/></mesh>
    <mesh><sphereGeometry args={[3.82,48,32]}/><TissueMaterial color="#ef9ecb" kind="nucleus" opacity={opacity}/></mesh>
    <mesh name="cell-nucleolus" position={[.4,.45,.45]} scale={[1.1,1,.9]}><sphereGeometry args={[1.35,28,20]}/><TissueMaterial color="#692c83" opacity={opacity}/></mesh>
    <instancedMesh ref={pores} name="cell-nuclear-pores" args={[undefined,undefined,126]}><torusGeometry args={[.15,.05,5,10]}/><TissueMaterial color="#e4ae47" opacity={opacity}/></instancedMesh>
    <instancedMesh ref={chromatin} args={[undefined,undefined,120]}><icosahedronGeometry args={[1,1]}/><TissueMaterial color="#9b448f" opacity={opacity}/></instancedMesh>
  </group>
}

/** Folded ER cisternae wrap the cortex; five flattened, bent sheets per patch. */
export function ReticulumSheets({opacity}:{opacity:number}) {
  const geometry=useMemo(()=>{
    const parts:T.BufferGeometry[]=[]
    for(let patch=0;patch<18;patch++)for(let layer=0;layer<4;layer++){
      const y=-25+(patch%6)*9,angle=Math.floor(patch/6)*2.1-.75
      const g=new T.PlaneGeometry(3.8,2.3,16,8),p=g.getAttribute('position')
      for(let i=0;i<p.count;i++)p.setZ(i,.32*Math.sin(p.getX(i)*1.6)+.20*Math.cos(p.getY(i)*2.5))
      g.computeVertexNormals();g.rotateY(angle);g.translate(Math.sin(angle)*(cellRadius(y)-1.4-layer*.19),y+layer*.28,Math.cos(angle)*(cellRadius(y)-1.4-layer*.19));parts.push(g)
    }
    const g=mergeGeometries(parts)!;parts.forEach(p=>p.dispose());return g
  },[])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  return <group name="cell-er">
    <mesh geometry={geometry}><TissueMaterial color="#4963ac" opacity={opacity}/></mesh>
    {Array.from({length:6},(_,i)=><mesh key={i} position={[-8,-4.5+i*.48,9.5]} rotation={[.25,.15,.18]} scale={[3.3,.09,1.2]}>
      <sphereGeometry args={[1,20,10]}/><TissueMaterial color={i%2?'#4d66b0':'#647fc3'} opacity={opacity} clipped={false}/>
    </mesh>)}
  </group>
}

/** Channels cross the wall at contact patches. Their diameter is enlarged for
 * visibility at whole-cell scale; the label retains the biological reference. */
export function Plasmodesmata({opacity}:{opacity:number}) {
  const ref=useRef<T.InstancedMesh>(null),root=useRef<T.Group>(null),cut=useCutaway()
  useFrame(()=>{if(root.current&&cut)root.current.rotation.y=cut.angle})
  useLayoutEffect(()=>{
    const o=new T.Object3D(),up=new T.Vector3(0,1,0)
    for(let i=0;i<56;i++){
      const y=-24+(i%14)*3.6,theta=Math.floor(i/14)*Math.PI/2+.3,r=cellRadius(y)-.35,n=new T.Vector3(Math.cos(theta),0,Math.sin(theta))
      o.position.copy(n).multiplyScalar(r);o.position.y=y;o.quaternion.setFromUnitVectors(up,n);o.updateMatrix();ref.current?.setMatrixAt(i,o.matrix)
    }
    if(ref.current){ref.current.instanceMatrix.needsUpdate=true;ref.current.computeBoundingSphere()}
  },[])
  return <>
    <instancedMesh ref={ref} name="cell-plasmodesmata" args={[undefined,undefined,56]}><cylinderGeometry args={[.18,.18,1.15,8,1,true]}/><TissueMaterial color="#2d8790" opacity={opacity}/></instancedMesh>
    <group ref={root} name="cell-plasmodesmata">{[-1,1].map(side=><group key={side} rotation={[0,side*(Math.PI/3-.035),0]}>
      {[-24,-12,0,12,24].map(y=><group key={y} position={[0,y,cellRadius(y)-.30]}>
        <mesh rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.18,.18,1.3,10,1,true]}/><TissueMaterial color="#2d8790" opacity={opacity} clipped={false}/></mesh>
        <mesh rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.055,.055,1.5,6]}/><TissueMaterial color="#15385a" opacity={opacity} clipped={false}/></mesh>
      </group>)}
    </group>)}</group>
  </>
}
