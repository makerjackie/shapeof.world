import {useEffect, useMemo} from 'react'
import {RoundedBox} from '@react-three/drei'
import * as T from 'three'

export function Plate({size, color, position = [0,0,0], radius = .08, metalness = .4, opacity = 1, emissive = '#000000'}: {size:[number,number,number];color:string;position?:[number,number,number];radius?:number;metalness?:number;opacity?:number;emissive?:string}) {
  const flat=radius>size[2]/2
  const geometry=useMemo(()=>{if(!flat)return null;const [w,h,d]=size,r=Math.min(radius,w/2,h/2),s=new T.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);const g=new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:false,curveSegments:12,steps:1});g.translate(0,0,-d/2);return g},[size[0],size[1],size[2],radius,flat])
  useEffect(()=>()=>geometry?.dispose(),[geometry])
  if(geometry)return <mesh geometry={geometry} position={position} castShadow receiveShadow><meshStandardMaterial color={color} metalness={metalness} roughness={.36} transparent={opacity<1} opacity={opacity} depthWrite={opacity>=.8} emissive={emissive} emissiveIntensity={.35}/></mesh>
  return <RoundedBox args={size} radius={Math.min(radius,...size.map(v=>v/2-.0001))} smoothness={3} position={position} castShadow receiveShadow><meshStandardMaterial color={color} metalness={metalness} roughness={.36} transparent={opacity<1} opacity={opacity} depthWrite={opacity>=.8} emissive={emissive} emissiveIntensity={.35}/></RoundedBox>
}
export function Wire({points,color='#af956e',radius=.018,opacity=1}: {points:[number,number,number][];color?:string;radius?:number;opacity?:number}) {
  const curve=useMemo(()=>new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),[points])
  return <mesh><tubeGeometry args={[curve,Math.max(12,points.length*5),radius,5,false]}/><meshStandardMaterial color={color} roughness={.4} metalness={.6} transparent={opacity<1} opacity={opacity}/></mesh>
}
export function DiagramLine({points,color='#c0ad89',opacity=1}: {points:[number,number,number][];color?:string;opacity?:number}) {
  const geometry=useMemo(()=>new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(...p))),[points])
  const material=useMemo(()=>new T.LineBasicMaterial({color,transparent:opacity<1,opacity}),[color,opacity])
  const line=useMemo(()=>new T.Line(geometry,material),[geometry,material])
  useEffect(()=>()=>{geometry.dispose();material.dispose()},[geometry,material])
  return <primitive object={line}/>
}
export function Mark({text,width=1.4,position=[0,0,0],color='#c4cbd0',height=.36}: {text:string;width?:number;position?:[number,number,number];color?:string;height?:number}) {
  const texture=useMemo(()=>{
    const canvas=document.createElement('canvas');canvas.width=Math.min(2048,Math.max(64,Math.round(256*width/height)));canvas.height=256
    const c=canvas.getContext('2d')!;c.font='500 180px monospace';const font=Math.min(180,180*canvas.width*.92/Math.max(1,c.measureText(text).width));c.clearRect(0,0,canvas.width,256);c.font=`500 ${font}px monospace`;c.textAlign='center';c.textBaseline='middle';c.fillStyle=color;c.fillText(text,canvas.width/2,132)
    const t=new T.CanvasTexture(canvas);t.colorSpace=T.SRGBColorSpace;return t
  },[text,color,width,height]);useEffect(()=>()=>texture.dispose(),[texture])
  return <mesh position={position}><planeGeometry args={[width,height]}/><meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false}/></mesh>
}
export function Cylinder({position=[0,0,0],radius=.2,depth=.1,color='#858c92',rotation=[Math.PI/2,0,0],open=false}: {position?:[number,number,number];radius?:number;depth?:number;color?:string;rotation?:[number,number,number];open?:boolean}) {
  return <mesh position={position} rotation={rotation} castShadow><cylinderGeometry args={[radius,radius,depth,40,1,open]}/><meshStandardMaterial color={color} metalness={.85} roughness={.25} side={open?T.DoubleSide:T.FrontSide}/></mesh>
}
