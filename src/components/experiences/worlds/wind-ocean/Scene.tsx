import {memo,useEffect,useMemo,useRef,type ComponentRef,type RefObject} from 'react'
import {Canvas,useFrame,useThree} from '@react-three/fiber'
import {OrbitControls,PerspectiveCamera} from '@react-three/drei'
import * as T from 'three'
import {isWorldPaused} from '~/lib/world-playback'
import {makeSpeedTexture,makeStreamlines,streamRadius} from './streamlines'
import {sample,toLocation,toVector,trackAt,type Drifter,type FieldKind,type Location} from './model'
import type {Fields} from './load'
export type FieldMode='ocean'|'wind'|'both'
export interface View {at:Location;distance:number;revision:number}
export interface SceneState {mode:FieldMode;playing:boolean;grid:boolean;heat:boolean;arrows:boolean;time:number;drifters:Drifter[];probe:Location;selected:number|null;spin:boolean;follow:boolean;reduced:boolean}
function Streams({grid,kind,count,state}:{grid:Fields['wind'];kind:FieldKind;count:number;state:RefObject<SceneState>}) {
  const geometry=useMemo(()=>makeStreamlines(grid,count),[grid,count]),material=useRef<T.ShaderMaterial>(null),group=useRef<T.Group>(null),time=useRef(0)
  const uniforms=useMemo(()=>({uTime:{value:0},uIntensity:{value:kind==='wind'?.78:.95},uCycle:{value:kind==='wind'?.1:.055}}),[kind])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  useFrame((_,dt)=>{
    const s=state.current;if(group.current)group.current.visible=s.mode==='both'||s.mode===kind
    if(s.playing&&!s.reduced&&!isWorldPaused())time.current+=Math.min(.1,dt)
    if(material.current){material.current.uniforms.uTime.value=time.current;material.current.uniforms.uIntensity.value=s.mode==='both'&&kind==='wind'?.42:kind==='wind'?.85:1}
  })
  return <group ref={group}><lineSegments geometry={geometry} frustumCulled={false}>
    <shaderMaterial ref={material} uniforms={uniforms} vertexColors transparent depthWrite={false} blending={T.AdditiveBlending}
      vertexShader={'attribute float aAge;attribute float aSeed;varying vec3 vColor;varying float vAge;varying float vSeed;void main(){vColor=color;vAge=aAge;vSeed=aSeed;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}'}
      fragmentShader={'uniform float uTime;uniform float uIntensity;uniform float uCycle;varying vec3 vColor;varying float vAge;varying float vSeed;void main(){float phase=fract(vAge-uTime*uCycle+vSeed);float head=pow(phase,2.3);float envelope=smoothstep(0.,.09,vAge)*(1.-smoothstep(.88,1.,vAge));gl_FragColor=vec4(vColor,(.24+.76*head)*envelope*uIntensity);\n#include <colorspace_fragment>\n}'}/>
  </lineSegments></group>
}
function Graticule({state}:{state:RefObject<SceneState>}) {
  const node=useRef<T.LineSegments>(null)
  const geometry=useMemo(()=>{
    const positions:number[]=[]
    const segment=(a:Location,b:Location)=>{const av=toVector(a,1.003),bv=toVector(b,1.003);positions.push(av.x,av.y,av.z,bv.x,bv.y,bv.z)}
    for(let lat=-60;lat<=60;lat+=30)for(let lon=-180;lon<180;lon+=2)segment({lon,lat},{lon:lon+2,lat})
    for(let lon=-180;lon<180;lon+=30)for(let lat=-88;lat<88;lat+=2)segment({lon,lat},{lon,lat:lat+2})
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));return g
  },[])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  useFrame(()=>{if(node.current)node.current.visible=state.current.grid})
  return <lineSegments ref={node} geometry={geometry}><lineBasicMaterial color="#6a98aa" transparent opacity={.17} depthWrite={false}/></lineSegments>
}
function Atmosphere() {
  return <mesh><sphereGeometry args={[1.035,80,48]}/><shaderMaterial side={T.BackSide} transparent depthWrite={false} blending={T.AdditiveBlending}
    vertexShader={'varying vec3 vNormal;varying vec3 vWorld;void main(){vNormal=normalize(mat3(modelMatrix)*normal);vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}'}
    fragmentShader={'varying vec3 vNormal;varying vec3 vWorld;void main(){float limb=pow(1.-abs(dot(normalize(vNormal),normalize(cameraPosition-vWorld))),3.5);gl_FragColor=vec4(vec3(.16,.4,.58),limb*.36);\n#include <colorspace_fragment>\n}'}/></mesh>
}
function Headlight() {
  const light=useRef<T.DirectionalLight>(null),{camera}=useThree()
  useFrame(()=>{if(light.current){light.current.position.copy(camera.position);light.current.position.x-=1.7;light.current.position.y+=2}})
  return <directionalLight ref={light} intensity={2.2} color="#e1e4dc"/>
}
function Globe({fields,state,onPoint}:{fields:Fields|null;state:RefObject<SceneState>;onPoint:(at:Location)=>void}) {
  const speedMesh=useRef<T.Mesh>(null),speedMaterial=useRef<T.MeshBasicMaterial>(null)
  const textures=useMemo(()=>fields?{wind:makeSpeedTexture(fields.wind),ocean:makeSpeedTexture(fields.ocean)}:null,[fields])
  useEffect(()=>()=>{textures?.wind.dispose();textures?.ocean.dispose()},[textures])
  useFrame(()=>{const s=state.current;if(speedMesh.current)speedMesh.current.visible=s.heat;if(textures&&speedMaterial.current){speedMaterial.current.map=s.mode==='wind'?textures.wind:textures.ocean;speedMaterial.current.opacity=.55}})
  return <>
    <mesh onClick={e=>{if(e.delta>4)return;e.stopPropagation();onPoint(toLocation(e.point))}}>
      <sphereGeometry args={[1,128,96]}/><meshStandardMaterial map={fields?.texture??null} color={fields?'#8e9fa3':'#263943'} roughness={.94} metalness={.03}/>
    </mesh>
    <mesh ref={speedMesh}><sphereGeometry args={[1.0015,96,64]}/><meshBasicMaterial ref={speedMaterial} map={textures?.ocean??null} transparent opacity={.55} depthWrite={false}/></mesh>
    <Graticule state={state}/><Atmosphere/>
  </>
}
function tangentArrow(at:Location,u:number,v:number,length:number,radius:number) {
  const p=toVector(at,radius),l=at.lon*Math.PI/180,a=at.lat*Math.PI/180
  const dir=new T.Vector3(-Math.sin(l)*u-Math.sin(a)*Math.cos(l)*v,Math.cos(a)*v,-Math.cos(l)*u+Math.sin(a)*Math.sin(l)*v).normalize()
  return {p:new T.Vector3(p.x,p.y,p.z),dir,length}
}
function Probe({fields,state}:{fields:Fields|null;state:RefObject<SceneState>}) {
  const marker=useRef<T.Group>(null),wind=useRef<T.Group>(null),ocean=useRef<T.Group>(null),up=useMemo(()=>new T.Vector3(0,0,1),[]),normal=useMemo(()=>new T.Vector3(),[])
  useFrame(()=>{
    const s=state.current,p=toVector(s.probe,1.027);normal.set(p.x,p.y,p.z).normalize()
    if(marker.current){marker.current.position.set(p.x,p.y,p.z);marker.current.quaternion.setFromUnitVectors(up,normal)}
    if(!fields)return
    for(const kind of ['wind','ocean'] as const){const node=kind==='wind'?wind.current:ocean.current;if(!node)continue
      const value=sample(fields[kind],s.probe.lon,s.probe.lat);node.visible=!!value&&s.arrows&&(s.mode==='both'||s.mode===kind)
      if(value){const arrow=tangentArrow(s.probe,value.u,value.v,.14,kind==='wind'?1.034:1.017);node.position.copy(arrow.p);node.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),arrow.dir);node.scale.y=arrow.length}
    }
  })
  return <>
    <group ref={marker}><mesh><ringGeometry args={[.018,.0195,48]}/><meshBasicMaterial color="#f0d8ae" transparent opacity={.95} side={T.DoubleSide} depthWrite={false}/></mesh>{[-1,1].flatMap(sign=>[0,1].map(axis=><mesh key={`${sign}:${axis}`} position={axis?[0,sign*.027,0]:[sign*.027,0,0]}><boxGeometry args={axis?[.001,.009,.001]:[.009,.001,.001]}/><meshBasicMaterial color="#d8bb87"/></mesh>))}</group>
    {(['wind','ocean'] as const).map(kind=><group key={kind} ref={kind==='wind'?wind:ocean}>
      <mesh position={[0,.42,0]}><cylinderGeometry args={[.0017,.0017,.84,7]}/><meshBasicMaterial color={kind==='wind'?'#ddb98a':'#8bdfd4'}/></mesh>
      <mesh position={[0,.88,0]}><coneGeometry args={[.008,.24,12]}/><meshBasicMaterial color={kind==='wind'?'#ddb98a':'#8bdfd4'}/></mesh>
    </group>)}
  </>
}
function DriftTracks({state,onPick}:{state:RefObject<SceneState>;onPick:(id:number)=>void}) {
  const segments=useMemo(()=>{
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array(12*4096*6),3));g.setAttribute('color',new T.BufferAttribute(new Float32Array(12*4096*6),3));g.setDrawRange(0,0);return g
  },[])
  const marker=useRef<T.InstancedMesh>(null),selected=useRef<T.Mesh>(null),last=useRef({time:-1,count:-1,selected:-2}),object=useMemo(()=>new T.Object3D(),[])
  useEffect(()=>{if(marker.current){marker.current.boundingSphere=new T.Sphere(new T.Vector3(),1.1);marker.current.count=0};return()=>segments.dispose()},[segments])
  useFrame(()=>{
    const s=state.current
    if(last.current.time===s.time&&last.current.count===s.drifters.length&&last.current.selected===(s.selected??-1))return
    last.current={time:s.time,count:s.drifters.length,selected:s.selected??-1}
    const positions=segments.attributes.position,colors=segments.attributes.color
    let cursor=0
    s.drifters.forEach((d,i)=>{
      const at=trackAt(d,s.time),color=new T.Color(d.color).multiplyScalar(s.selected===null||s.selected===d.id?1:.6),radius=streamRadius(d.kind)+.003
      object.scale.setScalar(at?1:0)
      if(at){const p=toVector(at,radius);object.position.set(p.x,p.y,p.z)}object.updateMatrix();marker.current?.setMatrixAt(i,object.matrix);marker.current?.setColorAt(i,color)
      if(at){
        const points=d.history.filter(p=>p.time<=s.time);if(!points.length)points.push({...at});points.push({...at})
        for(let j=1;j<points.length&&cursor<positions.count-2;j++){
          const a=toVector(points[j-1],radius),b=toVector(points[j],radius)
          positions.setXYZ(cursor,a.x,a.y,a.z);colors.setXYZ(cursor,color.r,color.g,color.b);cursor++
          positions.setXYZ(cursor,b.x,b.y,b.z);colors.setXYZ(cursor,color.r,color.g,color.b);cursor++
        }
      }
    })
    for(let i=s.drifters.length;i<12;i++){object.scale.setScalar(0);object.updateMatrix();marker.current?.setMatrixAt(i,object.matrix)}
    if(marker.current){marker.current.count=s.drifters.length;marker.current.instanceMatrix.needsUpdate=true;if(marker.current.instanceColor)marker.current.instanceColor.needsUpdate=true}
    positions.needsUpdate=true;colors.needsUpdate=true;segments.setDrawRange(0,cursor)
    if(selected.current){const d=s.drifters.find(d=>d.id===s.selected),at=d&&trackAt(d,s.time);selected.current.visible=!!at;if(at){const p=toVector(at,streamRadius(d!.kind)+.006),n=new T.Vector3(p.x,p.y,p.z).normalize();selected.current.position.set(p.x,p.y,p.z);selected.current.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),n)}}
  })
  return <>
    <lineSegments geometry={segments} frustumCulled={false}><lineBasicMaterial vertexColors transparent opacity={.9} depthWrite={false}/></lineSegments>
    <instancedMesh ref={marker} args={[undefined,undefined,12]} frustumCulled={false} onClick={e=>{e.stopPropagation();const d=state.current.drifters[e.instanceId??0];if(d)onPick(d.id)}}><sphereGeometry args={[.009,12,8]}/><meshBasicMaterial color="#ffffff" toneMapped={false}/></instancedMesh>
    <mesh ref={selected}><ringGeometry args={[.017,.019,40]}/><meshBasicMaterial color="#f0d9b0" side={T.DoubleSide} transparent opacity={.9} depthWrite={false}/></mesh>
  </>
}
function CameraRig({view,state,onInteract}:{view:View;state:RefObject<SceneState>;onInteract:()=>void}) {
  const orbit=useRef<ComponentRef<typeof OrbitControls>>(null),{camera,size}=useThree(),moving=useRef(false)
  const target=useMemo(()=>{const aspect=size.width/size.height,half=(aspect<.9?42:38)*Math.PI/360,angle=Math.min(half,Math.atan(Math.tan(half)*aspect)),fit=1.035/Math.sin(angle),distance=view.distance>=3.5?Math.max(view.distance,Math.min(5.95,fit)):view.distance;const p=toVector(view.at,distance);return new T.Vector3(p.x,p.y,p.z)},[view.at.lon,view.at.lat,view.distance,size.width,size.height])
  useEffect(()=>{moving.current=true},[view.revision,target])
  useEffect(()=>{if(camera instanceof T.PerspectiveCamera){camera.fov=size.width/size.height<.9?42:38;camera.updateProjectionMatrix()}},[camera,size.width,size.height])
  useFrame((_,dt)=>{
    const controls=orbit.current,s=state.current;if(!controls)return
    controls.autoRotate=s.spin&&s.playing&&!s.reduced&&!isWorldPaused();controls.autoRotateSpeed=.35
    const follow=s.follow?s.drifters.find(d=>d.id===s.selected):null,at=follow&&trackAt(follow,s.time)
    const destination=at?toVector(at,Math.max(1.7,camera.position.length())):target
    if(moving.current||at){
      const desired=new T.Vector3(destination.x,destination.y,destination.z),direction=camera.position.clone().normalize(),q=new T.Quaternion().setFromUnitVectors(direction,desired.clone().normalize()),step=new T.Quaternion().slerp(q,1-Math.exp(-dt*3))
      direction.applyQuaternion(step);const dist=T.MathUtils.lerp(camera.position.length(),desired.length(),1-Math.exp(-dt*3));camera.position.copy(direction.multiplyScalar(dist));controls.target.set(0,0,0);controls.update()
      if(camera.position.distanceTo(desired)<.002)moving.current=false
    }
  })
  return <OrbitControls ref={orbit} makeDefault enablePan={false} minDistance={1.22} maxDistance={6} enableDamping dampingFactor={.08} onStart={()=>{moving.current=false;onInteract()}}/>
}
function Stars() {
  const geometry=useMemo(()=>{const a:number[]=[];for(let i=0;i<130;i++){const angle=i*2.399,y=1-(i+.5)/65,r=Math.sqrt(1-y*y);a.push(Math.cos(angle)*r*30,y*30,Math.sin(angle)*r*30)}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(a,3));return g},[])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  return <points geometry={geometry}><pointsMaterial color="#6f8b9f" size={.025} transparent opacity={.35} sizeAttenuation/></points>
}
export const FlowScene=memo(function FlowScene({fields,state,view,density,mobile,onPoint,onPick,onInteract}:{fields:Fields|null;state:RefObject<SceneState>;view:View;density:number;mobile:boolean;onPoint:(at:Location)=>void;onPick:(id:number)=>void;onInteract:()=>void}) {
  const initial=toVector({lon:-35,lat:22},3.7)
  return <Canvas dpr={[1,1.6]} gl={{antialias:true,alpha:false,powerPreference:'high-performance'}}>
    <color attach="background" args={['#060d14']}/><PerspectiveCamera makeDefault position={[initial.x,initial.y,initial.z]} fov={38} near={.003} far={80}/>
    <ambientLight intensity={.9} color="#a3b6c9"/><Headlight/><Stars/>
    <Globe fields={fields} state={state} onPoint={onPoint}/>
    {fields&&<><Streams grid={fields.ocean} kind="ocean" count={Math.round((mobile?1000:2200)*density)} state={state}/><Streams grid={fields.wind} kind="wind" count={Math.round((mobile?700:1450)*density)} state={state}/></>}
    <Probe fields={fields} state={state}/><DriftTracks state={state} onPick={onPick}/><CameraRig view={view} state={state} onInteract={onInteract}/>
  </Canvas>
})
