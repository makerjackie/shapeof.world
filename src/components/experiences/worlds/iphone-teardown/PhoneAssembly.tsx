import {useEffect, useMemo, useRef} from 'react'
import {useFrame, type ThreeEvent} from '@react-three/fiber'
import {Html} from '@react-three/drei'
import * as T from 'three'
import {PARTS, type Part} from './parts'
import type {SystemId} from './model'
import {Cylinder, DiagramLine, Mark, Plate, Wire} from './render-kit'

function frameGeometry() {
  const rounded=(w:number,h:number,r:number)=>{
    const s=new T.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);return s
  }
  const shape=rounded(7.15,14.67,.88),hole=rounded(6.75,14.2,.67);shape.holes.push(new T.Path(hole.getPoints(40)))
  const geometry=new T.ExtrudeGeometry(shape,{depth:.67,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.035,bevelThickness:.035,curveSegments:16});geometry.translate(0,0,-.335);return geometry
}
export function partPosition(part:Part,explode:number):[number,number,number] {
  const result=[...part.p] as [number,number,number]
  if(part.system==='display') {result[0]-=11.5*explode;result[2]+=part.layer*explode*.72}
  else if(part.id==='back') {result[0]+=5.8*explode;result[2]-=2.5*explode}
  else if(part.id==='coil') {result[0]+=4*explode;result[2]-=.8*explode}
  else if(part.id==='shield') {result[0]+=3.5*explode;result[2]+=2.7*explode}
  else if(part.id==='ram') {result[0]-=1.2*explode;result[1]+=2.5*explode;result[2]+=part.layer*explode*.7}
  else if(part.system==='camera') {result[1]+=.7*explode;result[2]+=part.layer*explode*.8}
  else if(part.id==='battery') {result[0]-=.4*explode;result[2]+=.8*explode}
  else {result[2]+=part.layer*explode*.7}
  return result
}
function BoardTraces() {
  return <group>{Array.from({length:34},(_,i)=>{
    const y=-4.3+i*.287,x=-.65+(i%5)*.12
    return <DiagramLine key={i} points={[[x,y,.067],[x+.18,y,.067],[x+.18,y+.12,.067],[.65,y+.12,.067]]} color={i%3===0?'#b29b68':'#547865'}/>
  })}</group>
}
function CameraPart({part}:{part:Part}) {
  return <group><Plate size={part.size} color={part.color}/><Cylinder radius={.59} depth={.16} position={[0,0,.36]} color="#7a858b"/><Cylinder radius={.49} depth={.18} position={[0,0,.44]} color="#111b20"/>
    {[0,1,2,3].map(i=><mesh key={i} position={[0,0,.48+i*.022]}><sphereGeometry args={[.41-i*.018,32,16,0,Math.PI*2,0,Math.PI*.35]}/><meshPhysicalMaterial color={i%2?'#2c4270':'#173c4b'} metalness={.2} roughness={.04} clearcoat={1} transparent opacity={.5}/></mesh>)}
    <mesh position={[-.18,.22,.54]}><circleGeometry args={[.06,24]}/><meshBasicMaterial color="#90b5ce" transparent opacity={.6}/></mesh>
  </group>
}
function Coil(){
 const pts=useMemo(()=>Array.from({length:850},(_,i)=>{const t=i/849,a=t*Math.PI*2*13,r=1.1+t*1.18;return [Math.cos(a)*r,Math.sin(a)*r,0] as [number,number,number]}),[])
 return <group><Cylinder radius={2.41} depth={.035} color="#22292d"/><Wire points={pts} radius={.027} color="#b48457"/>{Array.from({length:18},(_,i)=>{const a=i/18*Math.PI*2;return <group key={i} position={[Math.cos(a)*2.55,Math.sin(a)*2.55,0]} rotation={[0,0,a]}><Plate size={[.23,.6,.06]} color="#6c7379" radius={.025}/></group>})}<Wire points={[[0,-1.2,0],[.1,-2.8,0],[1,-3.2,0],[1,-4,0]]} radius={.07}/></group>
}
function Battery({part}:{part:Part}) {
 return <group><Plate size={part.size} color={part.color} radius={.16} metalness={.25}/><Plate size={[4.15,8.23,.025]} position={[0,0,.21]} color="#343c3f" radius={.12} metalness={.1}/>
 <Mark text="Li-ion" width={2.1} height={.52} position={[0,.8,.231]}/><Mark text="RECHARGEABLE" width={2.8} height={.27} position={[0,.15,.232]} color="#90999c"/><Mark text="REFERENCE CELL" width={2.65} height={.24} position={[0,-.38,.232]} color="#707d83"/>
 <DiagramLine points={[[-1.65,-3.4,.24],[1.65,-3.4,.24],[1.65,3.4,.24]]} color="#626c70"/>
 {[0,1].map(i=><Plate key={i} size={[.4,.5,.035]} position={[i*.65-.33,4.4,.1]} color={i?'#a77d4c':'#8a9292'}/>)}
 </group>
}
function Motor({part}:{part:Part}) {
 return <group><Plate size={part.size} color={part.color} metalness={.9} radius={.12}/><Plate size={[2.65,.77,.025]} position={[0,0,.2]} color="#4a555a" metalness={.8}/><Mark text="TAPTIC ENGINE" width={2.4} height={.22} position={[0,0,.217]}/>{[-1,1].map(x=><Cylinder key={x} position={[x*1.25,0,.205]} radius={.07} depth={.025} color="#aab6b9"/>)}</group>
}
function Content({part,glass}:{part:Part;glass:boolean}) {
 const frame=useMemo(()=>part.kind==='frame'?frameGeometry():null,[part.kind])
 useEffect(()=>()=>frame?.dispose(),[frame])
 if(part.kind==='frame')return <group><mesh geometry={frame!} castShadow receiveShadow><meshStandardMaterial color="#697e88" metalness={.9} roughness={.24}/></mesh>
  {[-1,1].flatMap(x=>[-5.4,4.7].map(y=><Plate key={`${x}-${y}`} position={[x*3.584,y,0]} size={[.026,.1,.67]} color="#c4c9c9" radius={.005}/>))}
  {[-1,1].flatMap(x=>[-5,-3,-1,1,3,5].map(y=><Cylinder key={`${x}-${y}`} position={[x*3.22,y,.22]} radius={.07} depth={.14} color="#8c999f"/>))}
  <Plate size={[.09,1.6,.25]} position={[3.63,3.2,0]} color="#8a9ea7" radius={.035}/><Plate size={[.08,.85,.22]} position={[-3.63,3.4,0]} color="#8a9ea7" radius={.03}/><Plate size={[.08,.85,.22]} position={[-3.63,2.25,0]} color="#8a9ea7" radius={.03}/>
 </group>
 if(part.kind==='camera')return <CameraPart part={part}/>
 if(part.kind==='coil')return <Coil/>
 if(part.kind==='battery')return <Battery part={part}/>
 if(part.kind==='motor')return <Motor part={part}/>
 if(part.kind==='glass')return <group><Plate size={part.size} color={part.id==='oled'?'#101e28':part.color} radius={.55} opacity={part.id==='back'?1:part.id==='oled'?(glass?.12:.95):glass?.025:.12} metalness={part.id==='back'?.5:.1}/>
  {part.id==='oled'&&!glass&&<><mesh position={[0,-.3,.047]}><planeGeometry args={[5.9,11.9]}/><meshBasicMaterial color="#18252e"/></mesh><Mark text="09:41" width={3.7} height={1.15} position={[0,4.2,.058]} color="#dce8eb"/><Mark text="INSIDE THE PHONE" width={4.1} height={.42} position={[0,2.9,.06]} color="#86a6b7"/>{Array.from({length:10},(_,i)=><mesh key={i} position={[0,-1.1,.06]} rotation={[0,0,i*.025]}><ringGeometry args={[1+i*.23,1.012+i*.23,90,.4,Math.PI*1.65]}/><meshBasicMaterial color={i%2?'#31505b':'#375e6b'} transparent opacity={.8-i*.05}/></mesh>)}</>}
  {part.id==='touch'&&Array.from({length:16},(_,i)=><DiagramLine key={i} color="#618d94" opacity={.15} points={[[-3.1,-6.4+i*.84,.025],[3.1,-6.4+i*.84,.025]]}/>)}
  </group>
 if(part.id==='board')return <group><Plate size={part.size} color={part.color} radius={.08}/><BoardTraces/>{Array.from({length:28},(_,i)=>{const y=-4.8+Math.floor(i/2)*.7,x=(i%2?1:-1)*.62;return <Plate key={i} position={[x,y,.12]} size={[.15,.23,.13]} color={i%3?'#847b62':'#303a3c'} radius={.015}/>})}</group>
 if(part.kind==='chip')return <group><Plate size={part.size} color={part.color} radius={.06}/><Plate size={[part.size[0]*.88,part.size[1]*.88,.018]} position={[0,0,part.size[2]/2+.01]} color="#525d64" metalness={.75}/><Mark text={part.id==='soc'?'A15':part.id==='ram'?'DRAM':part.id==='nand'?'NAND':part.id==='modem'?'5G RF':part.id==='wifi'?'Wi-Fi':'PMIC'} width={part.size[0]*.82} height={.25} position={[0,0,part.size[2]/2+.024]}/>{Array.from({length:8},(_,i)=><Cylinder key={i} position={[(i%4-1.5)*.25,(Math.floor(i/4)*2-1)*part.size[1]*.4,-part.size[2]/2-.035]} radius={.035} depth={.05} color="#c5b287"/>)}</group>
 if(part.kind==='port')return <group><Plate size={part.size} color={part.color}/><Plate size={[.85,.34,.15]} position={[0,-.02,.04]} color="#141b20" radius={.03}/>{Array.from({length:8},(_,i)=><Plate key={i} size={[.04,.26,.025]} position={[(i-3.5)*.08,0,.135]} color="#bd9a60" radius={.005}/>)}</group>
 return <group><Plate size={part.size} color={part.color} radius={.06} metalness={part.id==='shield'?.9:.5}/>{part.id==='speaker'&&Array.from({length:10},(_,i)=><Cylinder key={i} position={[-.9+i*.2,-.4,.18]} radius={.055} depth={.025} color="#10161a"/>)}{part.id==='depth'&&[-1,0,1].map(i=><Cylinder key={i} position={[i*.9,0,.17]} radius={.15} depth={.025} color={i===0?'#322438':'#1b3440'}/>)}{part.id==='shield'&&<Mark text="RF SHIELD" width={1.3} height={.22} position={[0,0,.05]}/>}</group>
}
function AssemblyPart({part,explode,selected,glass,labels,onSelect,tx}:{part:Part;explode:number;selected:string|null;glass:boolean;labels:boolean;onSelect:(id:string)=>void;tx:(s:string)=>string}) {
 const ref=useRef<T.Group>(null),pos=partPosition(part,explode),isSelected=selected===part.id
 const target=useMemo(()=>new T.Vector3(...pos),[pos[0],pos[1],pos[2]])
 useFrame((_,dt)=>{if(ref.current)ref.current.position.lerp(target,1-Math.exp(-dt*7))})
 const pick=(e:ThreeEvent<MouseEvent>)=>{if(glass&&part.kind==='glass')return;e.stopPropagation();onSelect(part.id)}
 return <group ref={ref} position={pos} onClick={pick} onPointerOver={e=>{if(glass&&part.kind==='glass')return;e.stopPropagation();document.body.style.cursor='pointer'}} onPointerOut={()=>{document.body.style.cursor=''}}>
  <group rotation={[0,part.kind==='camera'?Math.PI*Math.max(0,1-explode/.45):0,0]}><Content part={part} glass={glass}/></group>
  {isSelected&&<mesh position={[0,0,part.size[2]/2+.04]}><boxGeometry args={[part.size[0]+.1,part.size[1]+.1,.035]}/><meshBasicMaterial color="#ddb98a" wireframe transparent opacity={.85}/></mesh>}
  {labels&&['battery','soc','wide','motor','oled','coil'].includes(part.id)&&<Html position={[part.size[0]/2+.12,part.size[1]/2,.1]} distanceFactor={25} style={{pointerEvents:'none'}}><span className="ip-part-tag">{tx(part.name)}</span></Html>}
 </group>
}
export function PhoneAssembly({explode,selected,glass,labels,onSelect,tx,highlight}:{explode:number;selected:string|null;glass:boolean;labels:boolean;onSelect:(id:string)=>void;tx:(s:string)=>string;highlight:SystemId|null}) {
 useEffect(()=>()=>{document.body.style.cursor=''},[])
 return <group>{PARTS.map(part=><group key={part.id} visible={!highlight||part.system===highlight||part.id==='frame'}><AssemblyPart {...{part,explode,selected,glass,labels,onSelect,tx}}/></group>)}
  {Array.from({length:28},(_,i)=>{const left=i%2===0,y=-6.6+Math.floor(i/2)*1.015;return <group key={`s${i}`} position={[left?-3.1:3.1,y,.35+explode*.8]}><Cylinder radius={.065} depth={.1} color="#adb7bc"/><DiagramLine points={[[-.04,0,.055],[.04,0,.055]]} color="#263137"/></group>})}
 </group>
}
