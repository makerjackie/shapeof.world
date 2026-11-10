import {useEffect, useMemo, useRef, type RefObject} from 'react'
import {useFrame} from '@react-three/fiber'
import * as T from 'three'
import {ACTUATOR, addByte, bpsk, cameraOptics, displayLight, hapticMotion, phonePower,advanceChargeFlow, radioLink, type CellState, type PowerSettings} from './model'
import {Cylinder, DiagramLine, Mark, Plate, Wire} from './render-kit'

export type LabSettings = {rgb:[number,number,number];touch:[number,number]|null;a:number;b:number;objectM:number;focusM:number;frequencyGHz:number;distanceKm:number;bits:number[];hapticHz:number;forceN:number;power:PowerSettings}
export type LabProps={settings:LabSettings;clock:RefObject<number>;cell:CellState;onTouch:(p:[number,number])=>void;computeBit?:number;onBit?:(bit:number)=>void}
function PixelArray({rgb,touch,clock}:{rgb:number[];touch:LabSettings['touch'];clock:RefObject<number>}) {
 const mesh=useRef<T.InstancedMesh>(null),scan=useRef<T.Mesh>(null),n=18,cols=16
 useEffect(()=>{
  const object=new T.Object3D(),c=new T.Color();let i=0
  for(let y=0;y<n;y++)for(let x=0;x<cols;x++)for(let ch=0;ch<3;ch++){
   object.position.set((x-cols/2+.5)*.44+(ch-1)*.12,(y-n/2+.5)*.44,.15);object.updateMatrix();mesh.current!.setMatrixAt(i,object.matrix)
   const v=displayLight(rgb).linear[ch];c.setRGB(ch===0?v:0,ch===1?v:0,ch===2?v:0);mesh.current!.setColorAt(i,c);i++
  }
  mesh.current!.instanceMatrix.needsUpdate=true;if(mesh.current!.instanceColor)mesh.current!.instanceColor.needsUpdate=true
 },[rgb]);useFrame(()=>{if(scan.current)scan.current.position.y=3.96-((clock.current*.5)%1)*7.92})
 return <group><Plate size={[7.7,8.8,.22]} color="#1e292d" radius={.24}/>
 <instancedMesh ref={mesh} args={[undefined,undefined,n*cols*3]}><boxGeometry args={[.083,.32,.035]}/><meshBasicMaterial toneMapped={false}/></instancedMesh>
 <mesh ref={scan} position={[0,3.96,.19]}><planeGeometry args={[7.2,.025]}/><meshBasicMaterial color="#e8e4cc" transparent opacity={.6}/></mesh>
 {touch&&Array.from({length:9},(_,i)=>{const a=i*Math.PI*2/9;return <mesh key={i} position={[touch[0]+Math.cos(a)*.6,touch[1]+Math.sin(a)*.6,.26]}><sphereGeometry args={[.045,8,8]}/><meshBasicMaterial color="#d6c39f"/></mesh>})}
 </group>
}
export function DisplayLab({settings,clock,onTouch}:LabProps){
 const linear=displayLight(settings.rgb)
 return <group><group position={[0,.4,0]}><PixelArray rgb={settings.rgb} touch={settings.touch} clock={clock}/>
 <mesh position={[0,0,.22]} onClick={e=>{e.stopPropagation();const local=e.object.worldToLocal(e.point.clone());onTouch([local.x,local.y])}}><planeGeometry args={[7.5,8.5]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
 {[0,1,2].map(i=><group key={i} position={[0,0,-.5-i*.3]}><Plate size={[7.4,8.5,.035]} color={['#8c7554','#507568','#7c8d98'][i]} radius={.15} opacity={.35}/>{Array.from({length:8},(_,j)=><DiagramLine key={j} points={i===1?[[-3.5+j, -4,.03],[-3.5+j,4,.03]]:[[-3.6,-3.5+j,.03],[3.6,-3.5+j,.03]]} color="#aac0b3" opacity={.35}/>)}</group>)}
 <Mark text="RGB EMISSION / TFT BACKPLANE" position={[0,-4.75,0]} width={6.8} height={.27}/></group>
 <group position={[0,-6,0]}><Plate size={[7.4,1.1,.2]} color="#1a252c"/><mesh position={[0,0,.12]}><planeGeometry args={[6.95,.7]}/><meshBasicMaterial color={linear.rgb} toneMapped={false}/></mesh></group>
 </group>
}
export function ComputeLab({settings,computeBit=0,onBit}:LabProps) {
 const sum=addByte(settings.a,settings.b)
 return <group><Plate size={[12.3,7.5,.35]} color="#1a302c" radius={.25}/><Plate size={[10.5,5.8,.18]} position={[0,.45,.32]} color="#4e535c" radius={.12}/><Plate size={[9.8,5.1,.05]} position={[0,.45,.45]} color="#222b36" radius={.08}/>
 {Array.from({length:48},(_,i)=>{const a=i/48*Math.PI*2;return <Cylinder key={i} position={[Math.cos(a)*5.65,Math.sin(a)*3.2,-.26]} radius={.09} depth={.12} color="#b7a276"/>})}
 <Mark text="A15 / FUNCTIONAL SCHEMATIC" width={8.1} height={.31} position={[0,3.55,.3]}/>
 {[{x:-3.65,y:1.95,w:2.7,h:1.2,t:'CPU',c:'#687a91'},{x:-3.65,y:.2,w:2.7,h:1.6,t:'GPU',c:'#77758e'},{x:-.4,y:1.95,w:2.5,h:1.2,t:'NEURAL',c:'#697f74'},{x:3,y:1.95,w:3,h:1.2,t:'MEMORY',c:'#8b7b68'},{x:3,y:.2,w:3,h:1.6,t:'ISP / VIDEO',c:'#8e8367'},{x:-.4,y:.2,w:2.5,h:1.6,t:'CACHE',c:'#67727c'}].map(block=><group key={block.t} position={[block.x,block.y,.56]}><Plate size={[block.w,block.h,.07]} color={block.c} radius={.04}/><Mark text={block.t} width={block.w*.8} height={.26} position={[0,0,.06]}/>{Array.from({length:8},(_,i)=><DiagramLine key={i} points={[[-block.w*.42,(i/7-.5)*block.h*.8,.07],[block.w*.42,(i/7-.5)*block.h*.8,.07]]} color="#b0b5bd" opacity={.18}/>)}</group>)}
 <Mark text="INDEPENDENT 8-BIT RIPPLE ADDER" width={8.9} height={.27} position={[0,-1.15,.56]} color="#bdb3c8"/>
 <group position={[0,-2.2,.65]}>{sum.stages.map((stage,i)=><group key={i} position={[-4.2+i*1.2,0,0]} onClick={e=>{e.stopPropagation();onBit?.(i)}} onPointerOver={e=>{e.stopPropagation();(e.nativeEvent.target as HTMLElement).style.cursor='pointer'}} onPointerOut={e=>{(e.nativeEvent.target as HTMLElement).style.cursor='grab'}}><Plate size={[1.02,1.5,.09]} color={computeBit===i?'#748a92':stage.sum?'#53796c':'#333e46'} radius={.04}/><Mark text={`${stage.sum}`} width={.55} height={.5} position={[0,.07,.065]}/><Mark text={`${stage.a} + ${stage.b}`} width={.81} height={.2} position={[0,.54,.065]} color="#c1c1c0"/><Mark text={`C${stage.carry}`} width={.65} height={.21} position={[0,-.48,.065]} color={stage.carry?'#e6bd81':'#78888f'}/>{i<7&&<DiagramLine points={[[.52,-.37,.08],[.72,-.37,.08],[.72,.37,.08],[.75,.37,.08]]} color={stage.carry?'#d6b587':'#5a646b'}/>}</group>)}
 <mesh position={[-4.2+computeBit*1.2,0,.06]}><boxGeometry args={[1.12,1.62,.05]}/><meshBasicMaterial color="#c5a6d4" wireframe/></mesh></group>
 <Mark text="LSB → MSB" width={2.3} height={.25} position={[-3.75,-4.28,0]}/>
 </group>
}
function chartTexture(blur:number,inverted:boolean){
 const target=document.createElement('canvas');target.width=384;target.height=512;const c=target.getContext('2d')!;c.fillStyle='#b8cabb';c.fillRect(0,0,384,512);c.fillStyle='#25453d';c.font='bold 340px serif';c.fillText('F',55,357);c.fillStyle='#c79b63';c.beginPath();c.arc(302,69,29,0,Math.PI*2);c.fill();c.fillStyle='#405b78';c.fillRect(35,441,315,20)
 const canvas=document.createElement('canvas');canvas.width=384;canvas.height=512;const p=canvas.getContext('2d')!;p.filter=`blur(${blur}px)`;if(inverted){p.translate(384,512);p.rotate(Math.PI)}p.drawImage(target,0,0);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;return texture
}
export function CameraLab({settings}:LabProps){
 const optics=cameraOptics(settings.objectM,settings.focusM),objectX=-3.5-Math.log10(settings.objectM/.2)*1.8,imageX=3.4,sensorX=imageX+(optics.sensor-optics.image)*30
 const rayEnds=[-1.12,0,1.12]
 const objectTexture=useMemo(()=>chartTexture(0,false),[]),imageTexture=useMemo(()=>chartTexture(Math.min(16,optics.blurMm/6*384),true),[optics.blurMm])
 useEffect(()=>()=>objectTexture.dispose(),[objectTexture]);useEffect(()=>()=>imageTexture.dispose(),[imageTexture])
 return <group><Plate size={[13.5,.12,5]} position={[0,-2.3,0]} color="#29343b" radius={.03}/><DiagramLine points={[[-7,0,0],[6,0,0]]} color="#6c828e"/>
 <group position={[objectX,0,0]}><Plate size={[.08,3.15,2.5]} color="#a0b8aa" radius={.02}/>{[-1,1].map(side=><mesh key={side} position={[side*.06,0,0]} rotation={[0,side*Math.PI/2,0]}><planeGeometry args={[2.2,2.9]}/><meshBasicMaterial map={objectTexture} toneMapped={false}/></mesh>)}<Mark text="OBJECT" position={[0,-2.8,0]} width={1.7} height={.3}/></group>
 <group><mesh rotation={[0,Math.PI/2,0]}><torusGeometry args={[1.36,.21,16,70]}/><meshStandardMaterial color="#6a7479" metalness={.9} roughness={.24}/></mesh>
 <mesh scale={[.24,1.13,1.13]}><sphereGeometry args={[1,48,24]}/><meshPhysicalMaterial color="#aec7d0" transparent opacity={.3} metalness={.1} roughness={.03} clearcoat={1} side={T.DoubleSide}/></mesh>
 <Mark text="IDEAL THIN LENS / ƒ1.6" position={[0,2.15,0]} width={4.7} height={.3}/></group>
 {rayEnds.map((y,i)=><DiagramLine key={i} color={['#d8c99a','#b8d2cd','#d9aa8a'][i]} opacity={.85} points={[[objectX,1.1,0],[0,y,0],[imageX,-1.1,0],[5.5,-1.1+(y+1.1)*(5.5-imageX)/(0-imageX),0]]}/>)}
 <group position={[sensorX,0,0]}><Plate size={[.11,3.4,2.7]} color="#57666b" radius={.04}/>{[-1,1].map(side=><group key={side} rotation={[0,side*Math.PI/2,0]} position={[side*.08,0,0]}>{Array.from({length:80},(_,i)=>{const x=i%8,y=Math.floor(i/8),ch=(x%2)+(y%2)*2;return <Plate key={i} size={[.245,.275,.035]} position={[(x-3.5)*.28,(y-4.5)*.3,0]} color={ch===0?'#8a514b':ch===3?'#4f658b':'#5c8066'} radius={.01}/>})}<mesh position={[0,0,.03]}><planeGeometry args={[1.6,2.35]}/><meshBasicMaterial map={imageTexture} toneMapped={false}/></mesh></group>)}<Mark text="RGGB / INVERTED TEST IMAGE" position={[0,-2.8,0]} width={4.2} height={.3}/></group>
 <group position={[imageX,0,0]}><mesh rotation={[0,Math.PI/2,0]}><ringGeometry args={[.03,.06+Math.min(1,optics.blurMm*20),48]}/><meshBasicMaterial color="#e1bd7b" side={T.DoubleSide}/></mesh></group>
 {Array.from({length:6},(_,i)=><Cylinder key={i} position={[(i-2.5)*.13,0,0]} rotation={[0,0,Math.PI/2]} radius={1.27} depth={.03} color="#59646a" open/>)}
 </group>
}
const ELECTRON_ROUTE:[number,number,number][]=[[-4,0,.1],[-4,-3.2,.1],[0,-4.2,.1],[4,-3.2,.1],[4,0,.1]]
function ElectronPath({dots}:{dots:RefObject<T.Group|null>}) {
 return <group><Wire points={ELECTRON_ROUTE} color="#a78a5c" radius={.045}/><group ref={dots}>{Array.from({length:12},(_,i)=><mesh key={i}><sphereGeometry args={[.085,12,12]}/><meshBasicMaterial color="#d1bd8b"/></mesh>)}</group></group>
}
export function PowerLab({settings,clock,cell}:LabProps){
 const ions=useRef<T.Group>(null),electrons=useRef<T.Group>(null),phase=useRef(0),lastClock=useRef(clock.current),p=phonePower(settings.power,cell.soc)
 const path=useMemo(()=>new T.CatmullRomCurve3(ELECTRON_ROUTE.map(p=>new T.Vector3(...p))),[])
 useFrame(()=>{const now=clock.current;phase.current=advanceChargeFlow(phase.current,now-lastClock.current,p.currentA);lastClock.current=now;ions.current?.children.forEach((dot,i)=>{const v=((phase.current+i/24)%1+1)%1;dot.position.set(-3.4+v*6.8,((i*7)%11-5)*.35,.2+(i%3)*.23)});electrons.current?.children.forEach((dot,i)=>dot.position.copy(path.getPoint(((phase.current+i/12)%1+1)%1)))})
 return <group><Plate size={[10,5.7,.3]} position={[0,.6,-.7]} color="#283138" radius={.18}/>
 <Plate size={[2.1,4.7,.5]} position={[-3.2,.6,0]} color="#506874"/><Plate size={[2.1,4.7,.5]} position={[3.2,.6,0]} color="#7e604e"/>
 {Array.from({length:15},(_,i)=><Plate key={i} size={[.08,4.5,.82]} position={[-2.1+i*.3,.6,-.1]} color={i%2?'#a79e85':'#6a8a83'} opacity={i%2?.28:.6} radius={.01}/>)}
 <Mark text="GRAPHITE / −" position={[-3.2,3.4,.3]} width={3.4} height={.32}/><Mark text="OXIDE / +" position={[3.2,3.4,.3]} width={3.2} height={.32}/><Mark text="Li+ / ELECTROLYTE" position={[0,-2.25,.35]} width={4.3} height={.3} color="#a9c9c4"/>
 <group ref={ions}>{Array.from({length:24},(_,i)=><mesh key={i}><sphereGeometry args={[.09,12,12]}/><meshStandardMaterial color="#90b8ad" emissive="#527d70" emissiveIntensity={.5}/></mesh>)}</group>
 <ElectronPath dots={electrons}/>
 {[{x:-2.7,t:'DISPLAY',w:p.display,c:'#638675'},{x:0,t:'SILICON',w:p.compute,c:'#88779c'},{x:2.7,t:'RADIO',w:p.radio,c:'#7388a6'}].map(load=><group key={load.t} position={[load.x,-4,.1]}><Plate size={[2.3,1.1,.25]} color={load.c}/><Mark text={load.t} width={1.9} height={.24} position={[0,.2,.15]}/><Mark text={`${load.w.toFixed(2)} W`} width={1.7} height={.25} position={[0,-.2,.15]}/></group>)}
 </group>
}
export function RadioLab({settings,clock}:LabProps){
 const signal=bpsk(480,settings.bits),wave=signal.map(v=>[v.t*1.45-5.8,v.y*1.13,0] as [number,number,number]),rings=useRef<T.Group>(null)
 const link=radioLink(settings.frequencyGHz,settings.distanceKm)
 useFrame(()=>rings.current?.children.forEach((ring,i)=>{const f=((clock.current*.12+i/5)%1);ring.scale.setScalar(.25+f*2.5);(ring as T.Mesh<T.RingGeometry,T.MeshBasicMaterial>).material.opacity=(1-f)*.38}))
 return <group><Plate size={[12.2,3.6,.3]} position={[0,.5,-.2]} color="#24313c"/>
 <DiagramLine points={wave.map(p=>[p[0],p[1]+.5,.05])} color="#a7bbda"/>
 {settings.bits.map((bit,i)=><group key={i}><Mark text={`${bit}`} position={[i*1.45-5.05,2.95,0]} width={.65} height={.45}/><DiagramLine points={[[i*1.45-5.8,-1,.06],[i*1.45-5.8,2,.06]]} color="#647082" opacity={.4}/></group>)}
 <group position={[-4,-3.7,0]}><Cylinder radius={.19} depth={2.1} rotation={[0,0,0]} color="#a9bbc5"/><Wire points={[[0,.8,0],[.7,1.2,0],[.7,.2,0]]} radius={.06} color="#b9c9d1"/><group ref={rings}>{Array.from({length:5},(_,i)=><mesh key={i} rotation={[0,Math.PI*.18,0]}><ringGeometry args={[.8,.822,64]}/><meshBasicMaterial color="#8cafd1" transparent opacity={.3} side={T.DoubleSide}/></mesh>)}</group></group>
 <group position={[4,-3.5,0]}><Cylinder radius={.1} depth={2.6} rotation={[0,0,0]} color="#a6aebb"/><Plate size={[1.1,.18,.55]} position={[0,-1.35,0]} color="#576776"/><Mark text="BASE STATION" width={3.4} height={.27} position={[0,-2.05,0]}/></group>
 <DiagramLine points={[[-3.8,-3.3,0],[3.8,-3.3,0]]} color="#819ab4" opacity={.55}/><Mark text={`${settings.distanceKm.toFixed(1)} km / ${(link.wavelengthM*100).toFixed(1)} cm λ`} width={6} height={.32} position={[0,-2.7,.1]}/>
 </group>
}
export function HapticsLab({settings,clock}:LabProps){
 const mass=useRef<T.Group>(null),springs=useRef<T.Group>(null)
 useFrame(()=>{const x=hapticMotion(settings.hapticHz,settings.forceN,clock.current/100).displacementMm*12;if(mass.current)mass.current.position.x=x;if(springs.current){springs.current.children[0].scale.x=1+x/2.2;springs.current.children[1].scale.x=1-x/2.2}})
 const spring=(left:boolean)=>Array.from({length:180},(_,i)=>{const t=i/179;return [(left?1:-1)*t*2.2,Math.sin(t*Math.PI*2*8)*.22,Math.cos(t*Math.PI*2*8)*.22] as [number,number,number]})
 const resonance=Array.from({length:160},(_,i)=>{const hz=80+i/159*180,a=hapticMotion(hz,settings.forceN,0).amplitudeMm;return [(hz-170)/16,-3.3+a*15,0] as [number,number,number]})
 return <group><Plate size={[11,3.8,.35]} position={[0,0,-.75]} color="#59656d" radius={.22}/><Plate size={[10.4,3.2,.2]} position={[0,0,-.5]} color="#26353d" radius={.12}/>
 <group ref={springs}><group position={[-4.6,0,0]}><Wire points={spring(true)} radius={.045} color="#acb9c0"/></group><group position={[4.6,0,0]}><Wire points={spring(false)} radius={.045} color="#acb9c0"/></group></group>
 <group ref={mass}><Plate size={[4.8,2.7,.8]} color="#a6aaac" metalness={.95} radius={.12}/><Plate size={[2,2,.05]} position={[0,0,.43]} color="#6e8388"/><Mark text="MOVING MASS" position={[0,0,.47]} width={2.9} height={.3}/>{Array.from({length:14},(_,i)=><Wire key={i} radius={.035} color="#bd8e62" points={[[-1.5+i*.23,-1.1,-.52],[-1.5+i*.23,-1.45,0],[-1.5+i*.23,-1.1,.53],[-1.5+i*.23,1.1,.53],[-1.5+i*.23,1.45,0],[-1.5+i*.23,1.1,-.52]]}/>)}</group>
 <Mark text="LINEAR RESONANT ACTUATOR" position={[0,2.65,0]} width={7.6} height={.36}/><DiagramLine points={resonance} color="#cdb899"/><DiagramLine points={[[-5.65,-3.3,0],[5.65,-3.3,0]]} color="#70818b"/>
 <Mark text={`80 Hz     ${ACTUATOR.resonanceHz} Hz     260 Hz`} position={[0,-4,0]} width={10.5} height={.3}/>
 <mesh position={[(settings.hapticHz-170)/16,-3.25,0]}><sphereGeometry args={[.095,16,16]}/><meshBasicMaterial color="#f0c796"/></mesh>
 </group>
}
