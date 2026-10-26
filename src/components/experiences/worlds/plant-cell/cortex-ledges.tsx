import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { useCutaway } from './cutaway'
import { PaintMaterial } from './illustration'
import { cellRadius } from './cell-geometry'

type Resident = {name:string;geometry:T.BufferGeometry;poses:T.Matrix4[]}
function pigment(g:T.BufferGeometry,hex:string) {
  const c=new T.Color(hex),colors=new Float32Array(g.getAttribute('position').count*3)
  for(let i=0;i<colors.length;i+=3)c.toArray(colors,i)
  g.setAttribute('color',new T.BufferAttribute(colors,3));return g
}
function merge(parts:T.BufferGeometry[]) {
  const g=mergeGeometries(parts)!;parts.forEach(p=>p.dispose());return g
}
function sphere(color:string,scale:[number,number,number],position:[number,number,number]=[0,0,0]) {
  return pigment(new T.SphereGeometry(1,18,10).scale(...scale).translate(...position),color)
}
function createResidents():Resident[] {
  const mitochondrion=merge([sphere('#e48c37',[.32,.88,.34]),...Array.from({length:4},(_,j)=>sphere('#8c471b',[.24,.07,.20],[.12,-.5+j*.31,.18]))])
  const peroxisome=sphere('#3398a7',[.43,.43,.43])
  const golgi=merge(Array.from({length:5},(_,j)=>sphere('#cb558f',[.75-Math.abs(j-2)*.06,.055,.42],[Math.abs(j-2)*.06,(j-2)*.21,0])))
  const er=merge(Array.from({length:3},(_,j)=>sphere('#4963ac',[.24,.06,1.4-j*.2],[.03*j,j*.26,0])))
  const residents=[{name:'streaming-mitochondria',geometry:mitochondrion,poses:[]},{name:'streaming-peroxisomes',geometry:peroxisome,poses:[]},{name:'streaming-golgi',geometry:golgi,poses:[]},{name:'cell-er',geometry:er,poses:[]}]as Resident[]
  const radial=new T.Matrix4(),body=new T.Object3D(),slot=new T.Matrix4()
  const add=(index:number,x:number,y:number,z:number,rotation:[number,number,number])=>{
    body.position.set(x,y,z);body.rotation.set(...rotation);body.updateMatrix();residents[index].poses.push(radial.clone().multiply(slot).multiply(body.matrix))
  }
  for(const side of[-1,1]){
    radial.makeRotationY(side*(Math.PI/3-.065))
    for(let i=0;i<10;i++){
      const y=-28+i*6.05,r=cellRadius(y)-1.55;slot.makeTranslation(0,y,r)
      add(0,-.28,0,0,[.1,0,side*.38]);add(1,.25,1.7,-.35,[0,0,0])
      if(i%2===0)add(2,.15,3.5,.1,[.1,.2,-.3])
    }
    for(const y of[-20,-8,5,18]){slot.makeTranslation(0,y,cellRadius(y)-1.4);add(3,0,0,0,[.2,0,.1])}
  }
  return residents
}
function Population({resident,opacity}:{resident:Resident;opacity:number}) {
  const ref=useRef<T.InstancedMesh>(null)
  useLayoutEffect(()=>{
    if(!ref.current)return
    resident.poses.forEach((m,i)=>ref.current!.setMatrixAt(i,m));ref.current.instanceMatrix.needsUpdate=true;ref.current.computeBoundingSphere()
  },[resident])
  return <instancedMesh ref={ref} name={resident.name} args={[resident.geometry,undefined,resident.poses.length]}>
    <PaintMaterial color="#ffffff" vertexColors transparent opacity={opacity}/>
  </instancedMesh>
}
/** Selected residents retained on the opening's ledges. Four instanced draws
 * replace hundreds of separate meshes, preserving the same 3D shapes and poses.
 * Locations follow the explanatory cut, not a measured organelle map. */
export function CortexLedges({opacity}:{opacity:number}) {
  const root=useRef<T.Group>(null),cut=useCutaway(),residents=useMemo(createResidents,[])
  useEffect(()=>()=>residents.forEach(r=>r.geometry.dispose()),[residents])
  useFrame(()=>{if(root.current&&cut)root.current.rotation.y=cut.angle})
  return <group ref={root}>{residents.map(r=><Population key={r.name} resident={r} opacity={opacity}/>)}</group>
}
