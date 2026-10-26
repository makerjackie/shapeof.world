import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Line, RoundedBox } from '@react-three/drei'
import { Color, Group } from 'three'
import { useExperienceI18n } from '~/i18n/experience'
import { isWorldPaused } from '~/lib/world-playback'
import { PALETTES, transistorState, type Palette } from './model'
import { siliconLattice, type TransistorKind } from './scale-model'
export function Block({ position, size, color, metal = false, opacity = 1 }: { position: [number,number,number];size:[number,number,number];color:string;metal?:boolean;opacity?:number }) {
 return <mesh position={position}><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={metal?.25:.58} metalness={metal?.85:.08} transparent={opacity<1} opacity={opacity} userData={{ baseOpacity: opacity }}/></mesh>
}
function Label({position,children}:{position:[number,number,number];children:React.ReactNode}) { return <Html zIndexRange={[4,0]} position={position} center className="cz-part-label">{children}</Html> }
export function Phone({open,onChip,labels}:{open:number;onChip:()=>void;labels:boolean}) {
 const tx=useExperienceI18n()
 return <group>
  <RoundedBox args={[10,.65,20.83]} radius={.65} smoothness={3} position={[0,-.2,0]}><meshStandardMaterial color="#8397a1" metalness={.8} roughness={.25}/></RoundedBox>
  <Block position={[0,.18,0]} size={[9.6,.16,20.1]} color="#365c61"/>
  <Block position={[0,.6+open*4,3.8]} size={[8.6,.5,10.2]} color="#bec9ce" metal/>
  {[-3,3].map(x=><Block key={x} position={[x,.7,-7]} size={[2.1,.9,2.2]} color="#3d4e5a"/>)}
  <group position={[0,.55,-3.8]} onClick={e=>{e.stopPropagation();onChip()}}>
   <Block position={[0,0,0]} size={[2.2,.45,2.2]} color="#283b4b"/>
   <Line points={[[-1.2,.25,-1.2],[1.2,.25,-1.2],[1.2,.25,1.2],[-1.2,.25,1.2],[-1.2,.25,-1.2]]} color="#5bc2ac" lineWidth={2}/>
   {labels&&<Label position={[0,1.4,0]}>{tx('处理器封装')}</Label>}
  </group>
  <Block position={[-open*5,1.15+open*5,-8.2+open]} size={[2.4,.04,.22]} color="#526574"/>
  <Block position={[-open*5,1.15+open*5,9.1+open]} size={[2.6,.04,.16]} color="#526574"/>
  <RoundedBox args={[9.6,.14,20.1]} radius={.5} smoothness={3} position={[-open*4,1+open*5,open]}><meshPhysicalMaterial color="#7699aa" transparent opacity={.58} roughness={.15}/></RoundedBox>
 </group>
}
export function Package({open,labels}:{open:number;labels:boolean}) {
 const tx=useExperienceI18n()
 return <group>
  <Block position={[0,-.4,0]} size={[10,.55,10]} color="#477a73"/>
  {Array.from({length:49},(_,i)=><mesh key={i} position={[(i%7-3)*1.25,-1.1,(Math.floor(i/7)-3)*1.25]}><sphereGeometry args={[.33,12,8]}/><meshStandardMaterial color="#c2c9d1" metalness={.95} roughness={.25}/></mesh>)}
  <Block position={[0,.15,0]} size={[5.7,.35,5.7]} color="#8d84a7" metal/>
  <Block position={[0,.7+open*4,0]} size={[9.2,.65,9.2]} color="#a7b4be" metal/>
  {labels&&<><Label position={[0,.9,0]}>{tx('硅片')}</Label><Label position={[-4,-.5,4]}>{tx('封装基板与焊球')}</Label></>}
 </group>
}
const regions=[{id:'cpu',name:'CPU',x:-2.9,z:-2.2,w:3.5,h:4.3,color:'#649b99'},{id:'gpu',name:'GPU',x:1.4,z:-2.2,w:4.5,h:4.3,color:'#8c85ab'},{id:'cache',name:'缓存',x:-2,z:2.7,w:5.3,h:3.5,color:'#6488a8'},{id:'npu',name:'NPU',x:2.8,z:2.7,w:3.2,h:3.5,color:'#b484a6'}] as const
export function Die({labels,selected,onRegion}:{labels:boolean;selected:string;onRegion:(id:string)=>void}) {
 const tx=useExperienceI18n()
 return <group>
  <Block position={[0,-.2,0]} size={[10,.4,10]} color="#71758c" metal/>
  {regions.map(r=><group key={r.id} position={[r.x,.1,r.z]} onClick={e=>{e.stopPropagation();onRegion(r.id)}}>
   <Block position={[0,0,0]} size={[r.w,.17,r.h]} color={r.color} metal/>
   {Array.from({length:r.id==='cache'?12:6},(_,i)=><Block key={i} position={[-r.w/2+.3+(i%3)*(r.w-.6)/3,.11,-r.h/2+.35+Math.floor(i/3)*.8]} size={[(r.w-.9)/3,.03,.52]} color={r.id==='cache'?'#abc3d2':'#c1cbd1'} metal/>)}
   {labels&&<Label position={[0,.5,0]}>{r.name==='缓存'?tx('缓存'):r.name}</Label>}
   {selected===r.id&&<Line points={[[-r.w/2,.2,-r.h/2],[r.w/2,.2,-r.h/2],[r.w/2,.2,r.h/2],[-r.w/2,.2,r.h/2],[-r.w/2,.2,-r.h/2]]} color="#dfc7dc" lineWidth={3}/>}
  </group>)}
  {Array.from({length:40},(_,i)=><Block key={i} position={[-4.8+(i%10)*1.05,.12,i<10?-4.85:i<20?4.85:-4.85]} size={[.25,.08,.18]} color="#d5d9dd" metal/>)}
 </group>
}
function Electrons({flowing,current,playing,speed,kind}:{flowing:boolean;current:number;playing:boolean;speed:number;kind:TransistorKind}) {
 const group=useRef<Group>(null!),elapsed=useRef(0)
 useFrame((_,dt)=>{
  if(playing&&!isWorldPaused()&&!document.hidden)elapsed.current+=Math.min(dt,.05)*speed
  group.current.children.forEach((child,i)=>child.position.set(-4.8+((elapsed.current*(1+current*2)+i*.61)%9.6),kind==='planar'?1.05:kind==='fin'?1.7:.95+(i%3)*.85,kind==='planar'?1.55:0))
 })
 return <group ref={group} visible={flowing}>{Array.from({length:18},(_,i)=><mesh key={i}><sphereGeometry args={[.075,8,6]}/><meshBasicMaterial color="#fafffc"/></mesh>)}</group>
}
export function Transistor({gate,drain,playing,speed,palette,kind,cutaway,labels}:{gate:number;drain:number;playing:boolean;speed:number;palette:Palette;kind:TransistorKind;cutaway:boolean;labels:boolean}) {
 const tx=useExperienceI18n(),state=transistorState(gate,drain),c=PALETTES[palette]
 const channel=new Color('#7a9794').lerp(new Color('#57bfa5'),state.channel?.8:0).getStyle()
 return <group position={[0,-1.3,0]}>
  <Block position={[0,-.2,0]} size={[10,1.2,4.6]} color={c.substrate}/>
  {kind==='planar'?<>
   <Block position={[-3.25,.65,0]} size={[3.3,.85,3.6]} color={c.diff}/><Block position={[3.25,.65,0]} size={[3.3,.85,3.6]} color={c.diff}/>
   <Block position={[0,1,0]} size={[3.5,.12,3.6]} color={channel} opacity={state.channel?1:.18}/>
   <Block position={[0,1.2,cutaway?-.7:0]} size={[3.6,.18,cutaway?2.2:3.7]} color="#e8ecee"/>
   <Block position={[0,1.75,cutaway?-.7:0]} size={[3.35,.9,cutaway?1.9:3.4]} color={c.poly} metal/>
  </>:<>
   {[-3.9,3.9].map(x=><Block key={x} position={[x,1.5,0]} size={[2.2,2.8,2.1]} color={c.diff}/>)}
   {kind==='fin'?<>
    <Block position={[0,1.45,0]} size={[6,2.1,.55]} color={channel}/>
    <Block position={[0,2.7,0]} size={[2.5,.3,1.45]} color="#e7ecef"/>
    <Block position={[0,2.95,0]} size={[2.3,.25,1.4]} color={c.poly} metal/>
    {[-.62,.62].map(z=><group key={z} userData={{cutFace:cutaway&&z>0}}><Block position={[0,1.55,z]} size={[2.4,2.2,.25]} color="#e7ecef" opacity={cutaway&&z>0?.14:1}/><Block position={[0,1.55,z*1.35]} size={[2.3,2.3,.25]} color={c.poly} metal opacity={cutaway&&z>0?.14:1}/></group>)}
   </>:<>
    {[.85,1.7,2.55].map(y=><group key={y}>
     <Block position={[0,y,0]} size={[6,.3,1.7]} color={channel}/>
     <Block position={[0,y+.26,0]} size={[2.6,.18,2.2]} color="#e7ecef"/><Block position={[0,y-.26,0]} size={[2.6,.18,2.2]} color="#e7ecef"/>
     <Block position={[0,y+.4,0]} size={[2.4,.15,2.2]} color={c.poly} metal/><Block position={[0,y-.4,0]} size={[2.4,.15,2.2]} color={c.poly} metal/>
     {[-1.12,1.12].map(z=><group key={z} userData={{cutFace:cutaway&&z>0}}><Block position={[0,y,z]} size={[2.6,.65,.15]} color="#e7ecef" opacity={cutaway&&z>0?.14:1}/><Block position={[0,y,z*1.17]} size={[2.4,.8,.15]} color={c.poly} metal opacity={cutaway&&z>0?.14:1}/></group>)}
    </group>)}
   </>}
  </>}
  {[-3.9,3.9].map(x=><Block key={x} position={[x,kind==='planar'?1.5:3.25,-.45]} size={[1.4,.65,1.6]} color="#bac5cd" metal/>)}
  <Electrons flowing={state.flowing} current={state.relativeCurrent} playing={playing} speed={speed} kind={kind}/>
  {labels&&<><Label position={[0,4.2,0]}><b>{tx('栅极')}</b><span>{gate.toFixed(2)} V</span></Label><Label position={[-4.5,3.8,-.2]}><b>{tx('源极')}</b><span>0 V</span></Label><Label position={[4.5,3.8,-.2]}><b>{tx('漏极')}</b><span>{drain.toFixed(1)} V</span></Label><Label position={[0,.9,3]}>{state.channel?tx('沟道已形成'):tx('沟道尚未形成')}</Label></>}
 </group>
}
export function Atoms({labels}:{labels:boolean}) {
 const tx=useExperienceI18n(),lattice=useMemo(()=>siliconLattice(),[])
 return <group>
  {lattice.atoms.map((p,i)=><mesh key={i} position={p}><sphereGeometry args={[.21,10,8]}/><meshStandardMaterial color={i%8<4?'#a8bbcd':'#8cabc0'} metalness={.25} roughness={.4}/></mesh>)}
  <Line segments points={lattice.bonds.flatMap(([a,b])=>[lattice.atoms[a],lattice.atoms[b]])} color="#778f9e" lineWidth={1.3}/>
  {labels&&<Label position={[0,6,0]}>{tx('金刚石型硅晶格')}<span>a ≈ 0.543 nm</span></Label>}
 </group>
}
