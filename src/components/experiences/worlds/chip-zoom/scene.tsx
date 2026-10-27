import { memo, useEffect, useRef, type ComponentRef, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Group, Mesh, Material, OrthographicCamera, PMREMGenerator, Vector3 } from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import type { Layout } from './model'
import { PALETTE } from './model'
import { LayoutModel } from './layout-scene'
import { Phone, Package, Die, Transistor, Atoms, phoneShift } from './specimens'
import { SCALES, STAGES, stageIndex, stageWeight, smooth, type TransistorKind } from './scale-model'
/** Where the specimen should sit inside the full-bleed canvas, in CSS pixels from each edge. */
export type Frame = {left:number;top:number;right:number;bottom:number}
type SceneProps = {
 layout:Layout;scale:number;fieldScale:number;peeled:number;spacing:number;frame:Frame;gate:number;drain:number;playing:boolean;speed:number
 tilt:number;revision:number;kind:TransistorKind;cutaway:boolean;phoneOpen:number;packageOpen:number;region:string;onRegion:(id:string)=>void
 onInteract:()=>void;onReady:()=>void;onNext:()=>void
}
function ReflectionStudio() {
 const {gl,scene}=useThree()
 useEffect(()=>{const generator=new PMREMGenerator(gl),room=new RoomEnvironment(),map=generator.fromScene(room,.04);scene.environment=map.texture;scene.environmentIntensity=.45;room.dispose();return()=>{scene.environment=null;map.dispose();generator.dispose()}},[gl,scene])
 return null
}
function Specimen({index,scale,fieldScale,children,layout,fadeMaterials=true,phoneOpen}:{index:number;scale:number;fieldScale:number;children:ReactNode;layout:Layout;fadeMaterials?:boolean;phoneOpen:number}) {
 const group=useRef<Group>(null!)
 const weight=stageWeight(index,scale),factor=2*STAGES[index].width/10**fieldScale
 const progress=index===6?0:smooth(SCALES[index],SCALES[index+1],scale)
 const anchor=index===0?[phoneShift(phoneOpen),0,-3.8]:index===3?[(layout.cell.bounds[0]+layout.cell.bounds[2]-layout.bounds[2])/2/15000,0,-(layout.cell.bounds[1]+layout.cell.bounds[3]-layout.bounds[3])/2/15000]:[0,0,0]
 useFrame(()=>{
  if(!fadeMaterials)return
  group.current.traverse(obj=>{if(!(obj instanceof Mesh))return;const materials=Array.isArray(obj.material)?obj.material:[obj.material];materials.forEach((m:Material)=>{m.userData.initialOpacity??=m.opacity;const base=m.userData.baseOpacity??m.userData.initialOpacity;m.opacity=base*weight;if(m.userData.fixedBlend)return;m.transparent=weight<.999||base<1;m.depthWrite=weight>.45})})
 })
 return <group ref={group} scale={factor} position={[-anchor[0]*factor*progress,0,-anchor[2]*factor*progress]}>{children}</group>
}
function Camera({index,tilt,revision,frame,onInteract}:{index:number;tilt:number;revision:number;frame:Frame;onInteract:()=>void}) {
 const orbit=useRef<ComponentRef<typeof OrbitControls>>(null!)
 const {camera,size}=useThree()
 const settling=useRef(true),angle=useRef(.01),azimuth=useRef(0)
 useEffect(()=>{settling.current=true},[index,tilt,revision,size.width,size.height,frame.left,frame.top,frame.right,frame.bottom])
 useFrame((_,dt)=>{
  const c=camera as OrthographicCamera
  // The canvas fills the world; twenty units span the framed area, so the specimen sits clear of the panels.
  const unit=20/Math.max(1,size.width-frame.left-frame.right),half=(size.height-frame.top-frame.bottom)/2
  c.left=-10-frame.left*unit;c.right=10+frame.right*unit;c.top=(half+frame.top)*unit;c.bottom=-(half+frame.bottom)*unit;c.near=.01;c.far=600;c.updateProjectionMatrix()
  if(!settling.current)return
  // Tilted layout: about 40° above the horizon and turned a third of the way round, so the wiring levels read as a stack.
  const target=Math.max(.01,index===3?tilt*.87:index===2?.15:index===0?.38:index===4?.5:.88)
  const d=1-Math.exp(-Math.min(dt,.05)*4)
  angle.current+=(target-angle.current)*d
  azimuth.current+=((index===3?tilt*.6:index===0||index===2?0:.38)-azimuth.current)*d
  const r=38
  camera.position.set(Math.sin(angle.current)*Math.sin(azimuth.current)*r,Math.cos(angle.current)*r,Math.sin(angle.current)*Math.cos(azimuth.current)*r)
  orbit.current.target.set(0,0,0);orbit.current.update()
  if(Math.abs(target-angle.current)<.002)settling.current=false
 })
 return <OrbitControls ref={orbit} makeDefault enableZoom={false} enablePan={false} enableDamping dampingFactor={.12} maxPolarAngle={Math.PI*.47} onStart={()=>{settling.current=false;onInteract()}} target={new Vector3(0,0,0)}/>
}
function Ready({onReady}:{onReady:()=>void}){const frames=useRef(0);useFrame(()=>{if(++frames.current===3)onReady()});return null}
export const ChipScene=memo(function ChipScene(props:SceneProps){
 const index=stageIndex(props.scale)
 // Layout ↔ cell: the macro dims to black before the cell rises out of black, so no pale double exposure appears mid-zoom.
 const u=Math.min(1,Math.max(0,(props.scale-SCALES[3])/(SCALES[4]-SCALES[3])))
 // The macro also dims as it grows to fill the screen, so a zoomed field of light metal never reads as a pale wash.
 const layoutLight=(i:number)=>i===3?smooth(SCALES[2],SCALES[3],props.scale)*(1-.58*smooth(.03,.35,u))*(1-smooth(.62,.84,u)):smooth(.8,.97,u)*(1-smooth(SCALES[4],SCALES[5],props.scale))
 // Tilted, the stack keeps its on-screen height while the plan view grows: vias stay short pillars instead of a wall.
 const zoomed=Math.max(1,10**(SCALES[3]-props.scale))
 return <Canvas orthographic dpr={[1,1.5]} camera={{position:[0,38,.01],zoom:1,near:.01,far:600}} gl={{antialias:true,alpha:false,powerPreference:'low-power'}}>
  <color attach="background" args={[PALETTE.background]}/><ambientLight intensity={.1}/><hemisphereLight args={['#c9d6e2','#0b0f13',.3]}/><directionalLight position={[-10,22,14]} intensity={1.4} color="#fff4e6"/><directionalLight position={[12,9,-22]} intensity={1.8} color="#9cc6ff"/><ReflectionStudio/>
  {STAGES.map((stage,i)=>{
   const weight=stageWeight(i,props.scale)
   if(weight<.008)return null
   const labels=index===i&&weight>.9
   return <Specimen key={stage.id} index={i} scale={props.scale} fieldScale={props.fieldScale} layout={props.layout} fadeMaterials={i!==3&&i!==4} phoneOpen={props.phoneOpen}>
    {i===0?<Phone open={props.phoneOpen} onChip={props.onNext} labels={labels}/>:i===1?<Package open={props.packageOpen} labels={labels}/>:i===2?<Die labels={labels} selected={props.region} onRegion={props.onRegion}/>:i===3||i===4?<LayoutModel layout={props.layout} view={i===3?'layers':'cell'} peeled={i===4?5:props.peeled} spacing={i===3&&props.tilt>0?props.spacing/zoomed:props.spacing} labels={labels} light={layoutLight(i)} field={10**props.fieldScale} tilt={props.tilt}/>:i===5?<Transistor {...props} labels={labels}/>:<Atoms labels={labels}/>}
   </Specimen>
  })}
  <Camera index={index} {...props}/><Ready onReady={props.onReady}/>
 </Canvas>
})
