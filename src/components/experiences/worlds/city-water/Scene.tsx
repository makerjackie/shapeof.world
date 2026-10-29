import {memo, useEffect, useMemo, useRef, type RefObject, type ComponentRef} from 'react'
import {Canvas, useFrame, useThree} from '@react-three/fiber'
import {Edges, OrbitControls, PerspectiveCamera} from '@react-three/drei'
import * as T from 'three'
import {isWorldPaused} from '~/lib/world-playback'
import {NODES, PIPES, SITES, TOWER_CAPACITY, type Vec3} from './network'
import {pressureColor, type Settings, type Simulation} from './model'

export type Layer = 'water' | 'pressure' | 'age' | 'surface'
export interface SceneState {simulation: Simulation; settings: Settings; playing: boolean; layer: Layer; selected: string; trace: number | null; reduced: boolean}
export interface CameraView {position: Vec3; target: Vec3; revision: number}
const C={bg:'#0a1117',land:'#26372f',hill:'#39463b',edge:'#526155',water:'#528c9e',stone:'#777e79',concrete:'#737e7c',road:'#19252b',line:'#627072',steel:'#9aa9a7',copper:'#b99d70',pipe:'#64bbc4',building:'#64757b',roof:'#45555b',glass:'#a8ccd0',amber:'#d9b47d'}
function landHeight(x:number,z:number) {
  const r=Math.sqrt(((x+12.1)/4.3)**2+((z+7.55)/3.75)**2)
  const ridge=3.0*Math.exp(-(((r-1.06)/.34)**2))
  const notch=2.1*Math.exp(-((x+9.4)**2/.75+(z+5.1)**2/4.2))
  const works=Math.min(1,Math.max(0,(x+10.4)/1.6))*Math.min(1,Math.max(0,(z+5.8)/1.3))
  const hills=Math.max(0,ridge-notch)*(1-works)
  return .1+Math.max(0,x)*.035+hills+.035*Math.sin(x*.8)*Math.cos(z*.6)
}
function tubePath(index:number):Vec3[] {
  const p=PIPES[index],a=NODES[p.from],b=NODES[p.to]
  const ya=a.kind==='tank'?4.35:landHeight(a.x,a.z)-.1,yb=b.kind==='tank'?4.35:landHeight(b.x,b.z)-.1
  if(a.kind==='tank')return [[a.x,ya,a.z],[a.x,.15,a.z],[a.x,.15,b.z],[b.x,yb,b.z]]
  if(b.kind==='tank')return [[a.x,ya,a.z],[b.x,.15,a.z],[b.x,.15,b.z],[b.x,yb,b.z]]
  if(Math.abs(a.x-b.x)<.01||Math.abs(a.z-b.z)<.01)return [[a.x,ya,a.z],[b.x,yb,b.z]]
  return [[a.x,ya,a.z],[b.x,ya,a.z],[b.x,yb,b.z]]
}
function Beam({a,b,r=.025,color=C.steel}:{a:Vec3;b:Vec3;r?:number;color?:string}) {
  const tr=useMemo(()=>{
    const av=new T.Vector3(...a),bv=new T.Vector3(...b),d=bv.clone().sub(av)
    return {position:av.add(bv).multiplyScalar(.5),quaternion:new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.clone().normalize()),length:d.length()}
  },[a.join(','),b.join(',')])
  return <mesh position={tr.position} quaternion={tr.quaternion} castShadow><cylinderGeometry args={[r,r,tr.length,8]}/><meshStandardMaterial color={color} roughness={.42} metalness={.6}/></mesh>
}
function Box({position,size,color=C.concrete,metal=0,opacity=1,edge=false}:{position:Vec3;size:Vec3;color?:string;metal?:number;opacity?:number;edge?:boolean}) {
  return <mesh position={position} castShadow={opacity===1} receiveShadow><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={metal?.45:.86} metalness={metal} transparent={opacity<1} opacity={opacity} depthWrite={opacity===1}/>{edge&&<Edges color="#a1a9a5" threshold={25}/>}</mesh>
}
function WaterSurface({position,size,level=0,raw=false,state}:{position:Vec3;size:[number,number];level?:number;raw?:boolean;state:RefObject<SceneState>}) {
  const shader=useRef<T.ShaderMaterial>(null)
  const uniforms=useMemo(()=>({uTime:{value:0},uRaw:{value:raw?1:0},uColor:{value:new T.Color(raw?'#627f75':'#477e90')}}),[raw])
  useFrame(()=>{if(shader.current)shader.current.uniforms.uTime.value=state.current.reduced?0:state.current.simulation.time/90})
  return <mesh position={[position[0],position[1]+level,position[2]]} rotation={[-Math.PI/2,0,0]}>
    <planeGeometry args={[size[0],size[1],1,1]}/><shaderMaterial ref={shader} uniforms={uniforms} transparent depthWrite={false} side={T.DoubleSide}
      vertexShader={'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}'}
      fragmentShader={'varying vec2 vUv;uniform float uTime;uniform float uRaw;uniform vec3 uColor;void main(){vec2 p=vUv*18.;float w=sin(p.x*1.8+p.y*.8+uTime*.25)*sin(p.y*2.-uTime*.18);float fine=pow(max(0.,sin(p.x*5.+p.y*3.+w*.6+uTime*.14)),18.);float edge=smoothstep(.01,.09,min(min(vUv.x,1.-vUv.x),min(vUv.y,1.-vUv.y)));vec3 col=uColor*(.9+w*.06)+vec3(.32,.48,.48)*fine*.22;gl_FragColor=vec4(col,.72+.19*edge);}'} />
  </mesh>
}
function SlabGrid() {
  const geometry=useMemo(()=>{const v:number[]=[];for(let x=-16;x<=16;x+=.5)v.push(x,-.015,-11.5,x,-.015,11.5);for(let z=-11.5;z<=11.5;z+=.5)v.push(-16,-.015,z,16,-.015,z);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));return g},[])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  return <lineSegments geometry={geometry}><lineBasicMaterial color="#344a4f" transparent opacity={.45}/></lineSegments>
}
function TerrainSkirt() {
  const geometry=useMemo(()=>{const points:Vec3[]=[];for(let x=-16;x<=16;x+=.5)points.push([x,landHeight(x,-11.5),-11.5]);for(let z=-11;z<=11.5;z+=.5)points.push([16,landHeight(16,z),z]);for(let x=15.5;x>=-16;x-=.5)points.push([x,landHeight(x,11.5),11.5]);for(let z=11;z>=-11.5;z-=.5)points.push([-16,landHeight(-16,z),z]);const v:number[]=[];points.forEach((a,i)=>{const b=points[(i+1)%points.length];v.push(...a,...b,a[0],-.03,a[2],...b,b[0],-.03,b[2],a[0],-.03,a[2])});const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.computeVertexNormals();return g},[])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  return <mesh geometry={geometry} receiveShadow><meshStandardMaterial color="#3e4c40" roughness={1} side={T.DoubleSide}/></mesh>
}
function Terrain({state}:{state:RefObject<SceneState>}) {
  const mat=useRef<T.MeshStandardMaterial>(null)
  const geometry=useMemo(()=>{
    const g=new T.PlaneGeometry(32,23,90,65);g.rotateX(-Math.PI/2)
    const p=g.attributes.position,colors:number[]=[]
    const a=new T.Color(C.land),b=new T.Color(C.hill)
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),z=p.getZ(i),h=landHeight(x,z);p.setY(i,h)
      const c=a.clone().lerp(b,Math.min(1,h/2.5)).multiplyScalar(.92+.08*Math.sin(x*3.3+z*2.7));colors.push(c.r,c.g,c.b)
    }
    g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g
  },[])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  useFrame(()=>{if(mat.current){mat.current.opacity=state.current.layer==='surface'?1:.72;mat.current.depthWrite=state.current.layer==='surface'}})
  return <group>
    <Box position={[0,-.78,0]} size={[32,1.5,23]} color="#19272c"/>
    <Box position={[0,-1.57,0]} size={[32.15,.09,23.15]} color="#475553" metal={.45}/>
    <mesh geometry={geometry} receiveShadow><meshStandardMaterial ref={mat} vertexColors roughness={.96} transparent opacity={.72} depthWrite={false}/></mesh>
    <SlabGrid/><TerrainSkirt/>
    {[-15,-10,-5,0,5,10,15].map(x=><group key={x}><Box position={[x,-.16,11.53]} size={[.025,.24,.025]} color="#8e9a98"/><Box position={[x,-.16,-11.53]} size={[.025,.24,.025]} color="#8e9a98"/></group>)}
  </group>
}
function Reservoir({state,onSelect}:{state:RefObject<SceneState>;onSelect:(id:string)=>void}) {
  const lake=useMemo(()=>{
    const points:[number,number][]=[[-15.3,-9.9],[-13.3,-10.8],[-10.3,-10.4],[-8.5,-8.8],[-9.1,-6.4],[-10.1,-4.7],[-12.5,-4.1],[-15,-5.6]]
    const shape=new T.Shape();const first=points[0],last=points.at(-1)!;shape.moveTo((first[0]+last[0])/2,-(first[1]+last[1])/2);points.forEach((p,i)=>{const next=points[(i+1)%points.length];shape.quadraticCurveTo(p[0],-p[1],(p[0]+next[0])/2,-(p[1]+next[1])/2)});shape.closePath()
    const g=new T.ShapeGeometry(shape,20);g.rotateX(-Math.PI/2);return g
  },[])
  const water=useRef<T.Mesh>(null),dam=useRef<T.Group>(null),lakeShader=useRef<T.ShaderMaterial>(null)
  const lakeUniforms=useMemo(()=>({uTime:{value:0}}),[])
  const forest=useMemo(()=>Array.from({length:48},(_,i)=>{const a=i*2.399,r=1.02+(i%5)*.065,x=-12.1+Math.cos(a)*4.3*r,z=-7.55+Math.sin(a)*3.75*r;return {x,z,y:landHeight(x,z)}}).filter(t=>t.x>-15.8&&t.x<-8.9&&t.z>-11.25&&t.z<-4.5&&t.y>2),[])
  const trees=useRef<T.InstancedMesh>(null)
  useEffect(()=>{if(!trees.current)return;const item=new T.Object3D();forest.forEach((t,i)=>{item.position.set(t.x,t.y+.38,t.z);item.scale.set(.18+(i%3)*.035,.5+(i%5)*.065,.18+(i%3)*.035);item.updateMatrix();trees.current!.setMatrixAt(i,item.matrix);trees.current!.setColorAt(i,new T.Color(i%2?'#697f65':'#556d58'))});trees.current.instanceMatrix.needsUpdate=true;if(trees.current.instanceColor)trees.current.instanceColor.needsUpdate=true;trees.current.computeBoundingSphere()},[forest])
  useFrame(()=>{if(water.current)water.current.position.y=1.35+state.current.simulation.reservoir/180000*.7;if(lakeShader.current)lakeShader.current.uniforms.uTime.value=state.current.simulation.time/160})
  return <group>
    <mesh ref={water} geometry={lake} position={[0,1.8,0]} onClick={e=>{e.stopPropagation();onSelect('reservoir')}} receiveShadow><shaderMaterial ref={lakeShader} uniforms={lakeUniforms} side={T.DoubleSide} vertexShader={'varying vec3 vPosition;void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }'} fragmentShader={'varying vec3 vPosition;uniform float uTime;void main(){vec2 p=vPosition.xz;float r=length((p-vec2(-12.1,-7.55))/vec2(4.3,3.75));float ripple=sin(p.x*8.+p.y*3.+uTime)*sin(p.y*7.-p.x*2.-uTime*.65);float glint=pow(max(0.,sin(p.x*16.+p.y*9.+ripple*.6+uTime*.18)),32.);vec3 deep=vec3(.055,.24,.31);vec3 shallow=vec3(.15,.41,.44);vec3 color=mix(deep,shallow,smoothstep(.5,1.1,r));color+=vec3(.18,.3,.3)*glint*.5+ripple*.013;gl_FragColor=vec4(color,1.); }'}/></mesh>
    <instancedMesh ref={trees} args={[undefined,undefined,forest.length]} castShadow><icosahedronGeometry args={[1,1]}/><meshStandardMaterial color="#ffffff" roughness={1}/></instancedMesh>
    {[0,1,2,3,4].map(i=><mesh key={i} position={[-14.2+i*1.15,2.03,-7.3+Math.sin(i)*.6]} rotation={[-Math.PI/2,0,.2]}><planeGeometry args={[.65,.012]}/><meshBasicMaterial color="#a1b8ad" transparent opacity={.18}/></mesh>)}
    <group ref={dam} position={[-9.4,.4,-5.65]} rotation={[0,-.4,0]} onClick={e=>{e.stopPropagation();onSelect('intake')}}>
      <Box position={[0,.8,0]} size={[3.25,1.65,.48]} color="#8c9184"/>
      <Box position={[0,1.68,0]} size={[3.48,.12,.65]} color="#bac0ad"/>
      {[-1.3,-.65,0,.65,1.3].map(x=><group key={x}><Box position={[x,.9,.32]} size={[.12,1.8,.6]} color="#757c73"/><Box position={[x,1.93,.25]} size={[.035,.42,.035]} color="#bac5bb" metal={.3}/></group>)}
      <Beam a={[-1.55,2.12,.25]} b={[1.55,2.12,.25]} r={.025}/>
      <Box position={[1.2,2,0]} size={[.72,.55,.64]} color="#b0b7aa"/>
      <Box position={[1.2,2.05,.329]} size={[.38,.18,.015]} color="#385c68"/>
      <mesh position={[0,.3,.38]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.26,.26,.2,24]}/><meshStandardMaterial color="#1d3038" metalness={.6} roughness={.5}/></mesh>
    </group>
    <Beam a={[-9.3,1.4,-5.2]} b={[-9.3,.55,-3.1]} r={.09} color={C.pipe}/>
    <Beam a={[-9.3,.55,-3.1]} b={[-8.6,.55,-3.1]} r={.09} color={C.pipe}/>
  </group>
}
function Rail({x,z,width,depth,y=.7}:{x:number;z:number;width:number;depth:number;y?:number}) {
  const posts:Vec3[]=[]
  for(let i=0;i<=Math.ceil(width/.55);i++){const dx=-width/2+i*width/Math.ceil(width/.55);posts.push([x+dx,y,z-depth/2],[x+dx,y,z+depth/2])}
  return <group>
    {posts.map((p,i)=><Beam key={i} a={p} b={[p[0],p[1]+.25,p[2]]} r={.012} color="#bbc5b9"/>)}
    {[-1,1].map(sign=><Beam key={sign} a={[x-width/2,y+.25,z+sign*depth/2]} b={[x+width/2,y+.25,z+sign*depth/2]} r={.014} color="#bbc5b9"/>)}
  </group>
}
function OpenTank({position,size,water=.48,state,children,onSelect}:{position:Vec3;size:[number,number];water?:number;state:RefObject<SceneState>;children?:React.ReactNode;onSelect:()=>void}) {
  const [w,d]=size
  return <group position={position} onClick={e=>{e.stopPropagation();onSelect()}}>
    <Box position={[0,.1,0]} size={[w+.17,.2,d+.17]} color="#525f60"/>
    <Box position={[-w/2,.38,0]} size={[.09,.62,d]} color={C.concrete}/>
    <Box position={[w/2,.38,0]} size={[.09,.62,d]} color={C.concrete}/>
    <Box position={[0,.38,-d/2]} size={[w,.62,.09]} color={C.concrete}/>
    <Box position={[0,.38,d/2]} size={[w,.62,.07]} color={C.concrete} opacity={.6}/>
    <WaterSurface position={[0,water,0]} size={[w-.09,d-.09]} state={state}/>{children}
  </group>
}
function Mixer({position,state,index}:{position:Vec3;state:RefObject<SceneState>;index:number}) {
  const rot=useRef<T.Group>(null)
  useFrame(()=>{if(rot.current)rot.current.rotation.y=state.current.simulation.time*(index===0?.045:.008)})
  return <group position={position}>
    <Beam a={[-.55,.8,0]} b={[.55,.8,0]} r={.045}/>
    <Box position={[0,.93,0]} size={[.24,.24,.25]} color="#607b76" metal={.3}/>
    <group ref={rot}>
      <Beam a={[0,.15,0]} b={[0,.9,0]} r={.025}/>
      {[0,Math.PI/2].map(angle=><group key={angle} rotation={[0,angle,0]}><Box position={[0,.25,0]} size={[.85,.16,.04]} color="#899b91" metal={.4}/></group>)}
    </group>
  </group>
}
function TreatmentPlant({state,onSelect}:{state:RefObject<SceneState>;onSelect:(id:string)=>void}) {
  const rake=useRef<T.Group>(null),cwLevel=useRef<T.Mesh>(null)
  useFrame(()=>{if(rake.current)rake.current.rotation.y=state.current.simulation.time/600;if(cwLevel.current)cwLevel.current.scale.y=.08+state.current.simulation.clearwell/1800*.7})
  return <group>
    <Box position={[-6.95,.12,-.8]} size={[6.2,.18,8.5]} color="#3c4b49"/>
    <Rail x={-6.95} z={-.8} width={6.2} depth={8.5} y={.24}/>
    <OpenTank position={[-8.2,.25,-3]} size={[1.3,1.3]} state={state} onSelect={()=>onSelect('mixing')}><Mixer position={[0,0,0]} state={state} index={0}/></OpenTank>
    <OpenTank position={[-8.2,.25,-1.15]} size={[1.3,1.85]} state={state} onSelect={()=>onSelect('mixing')}>
      {[0,1].map(i=><Mixer key={i} position={[0,0,-.48+i*.96]} state={state} index={1}/>)}
      <Box position={[0,.38,0]} size={[1.1,.45,.04]} color="#9b9d84" opacity={.4}/>
    </OpenTank>
    <group position={[-5.7,.25,-1.95]} onClick={e=>{e.stopPropagation();onSelect('settling')}}>
      <mesh position={[0,.12,0]}><cylinderGeometry args={[1.42,1.5,.22,64]}/><meshStandardMaterial color="#697875" roughness={.85}/></mesh>
      <mesh position={[0,.43,0]}><cylinderGeometry args={[1.42,1.42,.5,64,1,true]}/><meshStandardMaterial color="#a0a59a" side={T.DoubleSide} roughness={.75}/></mesh>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,.51,0]}><circleGeometry args={[1.36,64]}/><meshPhysicalMaterial color="#537e7e" roughness={.27} transparent opacity={.88}/></mesh>
      <group ref={rake}>
        <Beam a={[-1.4,.73,0]} b={[1.4,.73,0]} r={.04}/>
        <Beam a={[0,.1,0]} b={[0,.92,0]} r={.04}/>
        <Box position={[0,.32,0]} size={[2.35,.13,.08]} color="#a59e80"/>
        {[-1.15,-.6,.6,1.15].map(x=><Beam key={x} a={[x,.32,-.35]} b={[x,.32,.35]} r={.025} color="#b7aa85"/>)}
        <Box position={[0,.82,0]} size={[.3,.25,.3]} color="#74897e" metal={.4}/>
      </group>
      {Array.from({length:28},(_,i)=>{const a=i/28*Math.PI*2;return <Box key={i} position={[Math.cos(a)*1.38,.7,Math.sin(a)*1.38]} size={[.025,.3,.025]} color="#a9b5aa"/>})}
      <mesh position={[0,.86,0]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[1.38,.016,6,64]}/><meshStandardMaterial color="#a9b5aa" metalness={.6} roughness={.5}/></mesh>
    </group>
    {[-.63,.63].map((dx,i)=><OpenTank key={dx} position={[-5.7+dx,.25,1.3]} size={[1.1,2.25]} state={state} onSelect={()=>onSelect('filters')}>
      <Box position={[0,.26,0]} size={[.98,.08,2.1]} color="#a99779"/>
      <Box position={[0,.17,0]} size={[.98,.08,2.1]} color="#5a5b51"/>
      <Beam a={[-.45,.8,-1.15]} b={[-.45,.8,1.15]} r={.025}/>
      {[-.8,0,.8].map(z=><Beam key={z} a={[-.45,.77,z]} b={[.45,.77,z]} r={.018}/>)}
      {i===1&&<Box position={[.55,.5,0]} size={[.03,.46,2.1]} color="#b6d0d2" opacity={.25}/>}
    </OpenTank>)}
    <OpenTank position={[-8.2,.25,1.85]} size={[1.35,2.25]} state={state} onSelect={()=>onSelect('disinfection')}>
      {[-.6,0,.6].map((z,i)=><Box key={z} position={[i%2?-.1:.1,.4,z]} size={[1,.43,.06]} color="#939e8d"/>)}
    </OpenTank>
    <group position={[-5.8,.12,-5.8]} onClick={e=>{e.stopPropagation();onSelect('clearwell')}}>
      <Box position={[0,.18,0]} size={[2.6,.36,1.65]} color="#5c7274"/>
      <mesh position={[0,.32,0]} ref={cwLevel}><boxGeometry args={[2.35,1,1.42]}/><meshStandardMaterial color="#76b1bc" transparent opacity={.7}/></mesh>
      <Box position={[0,.82,-.82]} size={[2.65,.12,.1]} color="#afb6ab"/>
      <Box position={[0,.82,.82]} size={[2.65,.12,.1]} color="#afb6ab"/>
      {[-1.3,1.3].map(x=><Box key={x} position={[x,.48,0]} size={[.1,.65,1.65]} color="#96a197"/>)}
      <Box position={[0,.85,0]} size={[2.55,.06,1.55]} color="#a7b1a4" opacity={.16}/>
    </group>
    <group position={[-4.3,.25,-4.6]} onClick={e=>{e.stopPropagation();onSelect('pump')}}>
      <Box position={[0,.15,0]} size={[1.35,.3,1.65]} color="#4c605f"/>
      {[-.38,.38].map(x=><group key={x} position={[x,.5,0]}>
        <mesh rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.2,.2,.6,24]}/><meshStandardMaterial color="#6c8c88" metalness={.45} roughness={.4}/></mesh>
        <mesh position={[0,0,.4]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.27,.27,.22,24]}/><meshStandardMaterial color="#b19e78" metalness={.55} roughness={.42}/></mesh>
        {[-.2,-.1,0,.1,.2].map(z=><mesh key={z} position={[0,0,z]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.2,.012,4,24]}/><meshStandardMaterial color="#9fb5a8" metalness={.55}/></mesh>)}
        <Beam a={[0,0,.52]} b={[0,.3,.52]} r={.065} color={C.pipe}/>
      </group>)}
      <Box position={[.8,.55,0]} size={[.22,.9,.62]} color="#919f92"/>
      <Box position={[.68,.7,-.12]} size={[.012,.15,.22]} color="#5aa6aa"/>
    </group>
    <Box position={[-9.2,.65,.3]} size={[.5,1.1,1.15]} color="#9eaa9a"/>
    <Box position={[-9.46,.77,.3]} size={[.015,.27,.75]} color="#486d72"/>
    {[[[-8.2,.6,-3.8],[-8.2,.6,-4.3],[-5.8,.6,-4.3],[-5.8,.6,-5.3]],
      [[-7.5,.61,-1.8],[-7.2,.61,-1.8],[-7.2,.61,-1.95],[-7.05,.61,-1.95]],
      [[-4.3,.6,-1.95],[-4.3,.6,.1],[-5.1,.6,.1]],
      [[-6.4,.6,2.5],[-7.4,.6,2.5],[-7.4,.6,1.8]]].map((path,i)=><group key={i}>{path.slice(1).map((p,j)=><Beam key={j} a={path[j] as Vec3} b={p as Vec3} r={.055} color={C.pipe}/>)}</group>)}
  </group>
}
type StaticBox = {position:Vec3;size:Vec3;color:string}
function StaticBoxes({boxes}:{boxes:StaticBox[]}) {
  const mesh=useRef<T.InstancedMesh>(null)
  useEffect(()=>{
    if(!mesh.current)return
    const item=new T.Object3D()
    boxes.forEach((b,i)=>{item.position.set(...b.position);item.scale.set(...b.size);item.updateMatrix();mesh.current!.setMatrixAt(i,item.matrix);mesh.current!.setColorAt(i,new T.Color(b.color))})
    mesh.current.instanceMatrix.needsUpdate=true;if(mesh.current.instanceColor)mesh.current.instanceColor.needsUpdate=true;mesh.current.computeBoundingSphere()
  },[boxes])
  return <instancedMesh ref={mesh} args={[undefined,undefined,boxes.length]} castShadow receiveShadow><boxGeometry args={[1,1,1]}/><meshStandardMaterial color="#ffffff" roughness={.84}/></instancedMesh>
}
function Buildings({state,onSelect}:{state:RefObject<SceneState>;onSelect:(id:string)=>void}) {
  const bodies=useRef<T.InstancedMesh>(null),material=useRef<T.MeshStandardMaterial>(null),crowns=useRef<T.InstancedMesh>(null)
  const buildings=useMemo(()=>NODES.flatMap((n,j)=>{
    if(!n.demand)return []
    return Array.from({length:j===9?3:5},(_,i)=>{
      const x=n.x+.52+(i%2)*.74,z=n.z+.82+Math.floor(i/2)*.83,y=landHeight(x,z)
      const h=j===5?1.35+(i%2)*.9:j===9?1.4:j===14?.65:.45+((j*17+i*7)%8)*.12
      return {x,z,y,h,j,i,w:j===9?.7:.5,d:j===14?.64:.51}
    })
  }),[])
  const details=useMemo(()=>{
    const result:StaticBox[]=[]
    const box=(position:Vec3,size:Vec3,color:string)=>result.push({position,size,color})
    buildings.forEach(b=>{
      box([b.x,b.y+b.h+.025,b.z],[b.w+.04,.05,b.d+.04],C.roof)
      box([b.x+b.w*.22,b.y+b.h+.12,b.z],[.16,.18,.18],'#8a9a90')
      for(let floor=0;floor<Math.max(1,Math.floor(b.h/.32));floor++){
        for(const sign of [-1,1])box([b.x+sign*b.w*.24,b.y+.2+floor*.31,b.z+b.d/2+.003],[.095,.12,.009],floor%3===1?C.amber:'#7da3a3')
        box([b.x+b.w/2+.004,b.y+.2+floor*.31,b.z],[.008,.115,b.d*.56],'#779b9a')
      }
      if(b.j===9&&b.i===0){box([b.x,b.y+b.h-.24,b.z+b.d/2+.012],[.075,.25,.012],'#a6c8c0');box([b.x,b.y+b.h-.24,b.z+b.d/2+.013],[.25,.075,.012],'#a6c8c0')}
      if(b.j===14){box([b.x+.17,b.y+b.h+.28,b.z-.16],[.08,.54,.08],'#9fa79a');box([b.x-.15,b.y+b.h+.045,b.z+.05],[.18,.03,.24],'#8bb1ad')}
    })
    NODES.forEach(n=>{if(n.demand)box([n.x+.9,landHeight(n.x,n.z)+.012,n.z+1.6],[2.04,.035,3.05],'#344742')})
    return result
  },[buildings])
  const trees=useMemo(()=>NODES.filter(n=>n.demand).flatMap((n,i)=>[0,1,2].map(k=>({x:n.x+.3+k*.7,z:n.z+3.02,y:landHeight(n.x,n.z),color:i%2?'#526d52':'#65806a'}))),[])
  const trunks=useMemo(()=>trees.map(t=>({position:[t.x,t.y+.22,t.z] as Vec3,size:[.035,.44,.035] as Vec3,color:'#8c8d72'})),[trees])
  useEffect(()=>{
    if(!bodies.current||!crowns.current)return
    const item=new T.Object3D()
    buildings.forEach((b,i)=>{item.position.set(b.x,b.y+b.h/2,b.z);item.scale.set(b.w,b.h,b.d);item.updateMatrix();bodies.current!.setMatrixAt(i,item.matrix)})
    bodies.current.instanceMatrix.needsUpdate=true;bodies.current.computeBoundingSphere()
    trees.forEach((t,i)=>{item.position.set(t.x,t.y+.55,t.z);item.scale.set(.18,.36,.18);item.updateMatrix();crowns.current!.setMatrixAt(i,item.matrix);crowns.current!.setColorAt(i,new T.Color(t.color))})
    crowns.current.instanceMatrix.needsUpdate=true;if(crowns.current.instanceColor)crowns.current.instanceColor.needsUpdate=true;crowns.current.computeBoundingSphere()
  },[buildings,trees])
  const lastLayer=useRef(''),lastTime=useRef(-1),color=useMemo(()=>new T.Color(),[])
  useFrame(()=>{
    const s=state.current;if(!bodies.current||!material.current)return
    if(lastLayer.current===s.layer&&lastTime.current===s.simulation.time)return
    lastLayer.current=s.layer;lastTime.current=s.simulation.time
    material.current.opacity=s.layer==='surface'?1:.76;material.current.depthWrite=s.layer==='surface'
    buildings.forEach((b,i)=>{const pressure=s.simulation.hydraulic.heads[b.j]-NODES[b.j].elevation;color.set(s.layer==='pressure'?pressureColor(pressure):b.j===9?'#899590':b.j===14?'#738b84':C.building);bodies.current!.setColorAt(i,color)})
    if(bodies.current.instanceColor)bodies.current.instanceColor.needsUpdate=true
  })
  return <group>
    <instancedMesh ref={bodies} args={[undefined,undefined,buildings.length]} castShadow receiveShadow onClick={e=>{e.stopPropagation();const b=buildings[e.instanceId??0];onSelect(b.j===9?'hospital':b.j===14?'industry':`node:${b.j}`)}}><boxGeometry args={[1,1,1]}/><meshStandardMaterial ref={material} color="#ffffff" transparent opacity={.76} depthWrite={false} roughness={.82}/></instancedMesh>
    <StaticBoxes boxes={details}/><StaticBoxes boxes={trunks}/>
    <instancedMesh ref={crowns} args={[undefined,undefined,trees.length]} castShadow><icosahedronGeometry args={[1,1]}/><meshStandardMaterial color="#ffffff" roughness={1}/></instancedMesh>
  </group>
}
function Streets() {
  const boxes=useMemo(()=>{
    const result:StaticBox[]=[]
    for(const x of [-2.7,-.05,2.6,5.25,7.9,10.55]){
      result.push({position:[x,.25+x*.02,.1],size:[.46,.07,15],color:C.road})
      for(let j=0;j<22;j++)result.push({position:[x,.292+x*.02,-6.8+j*.62],size:[.018,.006,.18],color:'#798077'})
    }
    for(const z of [-5.4,-1.2,3,7.2]){
      result.push({position:[3.9,.34,z],size:[14,.08,.46],color:C.road})
      for(let j=0;j<23;j++)result.push({position:[-2.5+j*.6,.385,z],size:[.18,.008,.018],color:'#798077'})
    }
    result.push({position:[-4.35,.27,4.6],size:[5.7,.08,.48],color:C.road})
    return result
  },[])
  return <StaticBoxes boxes={boxes}/>
}
function Tower({state,onSelect}:{state:RefObject<SceneState>;onSelect:(id:string)=>void}) {
  const water=useRef<T.Mesh>(null)
  useFrame(()=>{if(water.current){const fill=state.current.simulation.tower/TOWER_CAPACITY;water.current.scale.y=Math.max(.005,fill);water.current.position.y=3.62+fill*.45}})
  return <group position={[9.9,.35,-7.2]} onClick={e=>{e.stopPropagation();onSelect('tower')}}>
    <Box position={[0,.08,0]} size={[2.8,.16,2.8]} color="#5e6b63"/>
    {[-1,1].flatMap(sx=>[-1,1].map(sz=><group key={`${sx}:${sz}`}>
      <Beam a={[sx*.82,0,sz*.82]} b={[sx*.5,3.7,sz*.5]} r={.065} color="#91a59b"/>
      {[.7,1.65,2.6].map(y=><Beam key={y} a={[sx*.76,y,sz*.76]} b={[-sx*.63,y+.94,sz*.63]} r={.025} color="#81968a"/>)}
      <Box position={[sx*.84,.15,sz*.84]} size={[.34,.3,.34]} color="#a1aa96"/>
    </group>))}
    <mesh position={[0,3.55,0]}><cylinderGeometry args={[1.15,.9,.3,64]}/><meshStandardMaterial color="#b2baaa" metalness={.4} roughness={.5}/></mesh>
    <mesh position={[0,4.08,0]}><cylinderGeometry args={[1.15,1.15,.95,64,1,true]}/><meshPhysicalMaterial color="#b2c7c2" metalness={.12} roughness={.22} transparent opacity={.24} side={T.DoubleSide} depthWrite={false}/></mesh>
    <mesh ref={water}><cylinderGeometry args={[1.1,1.1,.9,48]}/><meshStandardMaterial color="#6fb6c3" metalness={.15} roughness={.26} transparent opacity={.9}/></mesh>
    <mesh position={[0,4.64,0]}><coneGeometry args={[1.25,.35,64]}/><meshStandardMaterial color="#b7beb0" metalness={.3} roughness={.54}/></mesh>
    {[3.62,4.52].map(y=><mesh key={y} rotation={[-Math.PI/2,0,0]} position={[0,y,0]}><torusGeometry args={[1.16,.035,8,64]}/><meshStandardMaterial color="#a9b6ac" metalness={.7} roughness={.36}/></mesh>)}
    <Beam a={[.6,0,-.3]} b={[.6,3.6,-.3]} r={.075} color={C.pipe}/>
    <Beam a={[-.75,.12,-.53]} b={[-.75,4.47,-.53]} r={.018}/>
    <Beam a={[-.95,.12,-.53]} b={[-.95,4.47,-.53]} r={.018}/>
    {Array.from({length:18},(_,i)=><Beam key={i} a={[-.95,.18+i*.24,-.53]} b={[-.75,.18+i*.24,-.53]} r={.013}/>)}
  </group>
}
function PipeNetwork({state,onSelect}:{state:RefObject<SceneState>;onSelect:(id:string)=>void}) {
  const paths=useMemo(()=>PIPES.map((_,i)=>tubePath(i)),[])
  const curves=useMemo(()=>paths.map(path=>new T.CatmullRomCurve3(path.map(p=>new T.Vector3(...p)),false,'catmullrom',.06)),[paths])
  const materials=useRef<T.MeshStandardMaterial[]>([]),flow=useRef<T.InstancedMesh>(null),marker=useRef<T.Group>(null),phase=useRef(PIPES.map(()=>0)),last=useRef(0)
  const helper=useMemo(()=>new T.Object3D(),[])
  useFrame(()=>{
    const s=state.current,sim=s.simulation,h=sim.hydraulic,dt=Math.max(0,sim.time-last.current);last.current=sim.time
    PIPES.forEach((p,i)=>{
      const m=materials.current[i],q=h.flows[i]
      if(m){const pressure=(h.heads[p.from]+h.heads[p.to]-NODES[p.from].elevation-NODES[p.to].elevation)/2
        const age=(sim.nodeAge[p.from]+sim.nodeAge[p.to])/7200
        m.color.set(s.selected===`pipe:${i}`?C.amber:s.layer==='pressure'?pressureColor(pressure):s.layer==='age'?new T.Color('#72c4c7').lerp(new T.Color('#c29770'),Math.min(1,age/18)):'#5bb3bf')
        m.emissive.copy(m.color);m.emissiveIntensity=s.selected===`pipe:${i}`?.45:.12;m.opacity=s.layer==='surface'?.1:1
      }
      if(dt<3600&&!s.reduced)phase.current[i]+=dt*q/(Math.PI*p.diameter**2/4)/p.length
      for(let j=0;j<5;j++){
        const t=((phase.current[i]+j/5)%1+1)%1
        helper.position.copy(curves[i].getPoint(t));helper.scale.setScalar(s.layer==='surface'||Math.abs(q)<1e-6?0:1)
        helper.updateMatrix();flow.current?.setMatrixAt(i*5+j,helper.matrix)
      }
    })
    if(flow.current)flow.current.instanceMatrix.needsUpdate=true
    if(marker.current){const id=s.selected.startsWith('node:')?Number(s.selected.slice(5)):s.selected==='hospital'?9:s.selected==='industry'?14:-1;marker.current.visible=id>0;if(id>0){const n=NODES[id];marker.current.position.set(n.x,landHeight(n.x,n.z)+.02,n.z)}}
  })
  return <group position={[0,.48,0]}>
    {curves.map((curve,i)=><mesh key={i} onClick={e=>{e.stopPropagation();onSelect(`pipe:${i}`)}}>
      <tubeGeometry args={[curve,Math.max(10,paths[i].length*10),PIPES[i].diameter*.22,10,false]}/><meshStandardMaterial ref={m=>{if(m)materials.current[i]=m}} color={C.pipe} roughness={.42} metalness={.55} transparent opacity={1}/>
    </mesh>)}
    <instancedMesh ref={flow} args={[undefined,undefined,PIPES.length*5]} frustumCulled={false}>
      <sphereGeometry args={[.052,8,6]}/><meshBasicMaterial color="#d7f5e9" toneMapped={false}/>
    </instancedMesh>
    {NODES.map((n,i)=>n.demand?<group key={n.id} position={[n.x,landHeight(n.x,n.z)+.02,n.z]} onClick={e=>{e.stopPropagation();onSelect(`node:${i}`)}}>
      <mesh rotation={[-Math.PI/2,0,0]}><cylinderGeometry args={[.12,.12,.055,16]}/><meshStandardMaterial color="#a1b7aa" metalness={.65} roughness={.36}/></mesh>
      <mesh position={[0,.13,0]}><cylinderGeometry args={[.028,.035,.22,8]}/><meshStandardMaterial color="#d0ad75" metalness={.65}/></mesh>
    </group>:null)}
    <group ref={marker}><mesh rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.28,.31,48]}/><meshBasicMaterial color={C.amber} side={T.DoubleSide}/></mesh></group>
    <group position={[-.05,.5,-1.2]} onClick={e=>{e.stopPropagation();onSelect(`pipe:7`)}}>
      <Beam a={[0,-.35,0]} b={[0,.02,0]} r={.028}/>
      <mesh rotation={[0,0,Math.PI/2]}><torusGeometry args={[.13,.025,6,24]}/><meshStandardMaterial color="#c9a775" metalness={.55}/></mesh>
    </group>
  </group>
}
function Leak({state}:{state:RefObject<SceneState>}) {
  const points=useRef<T.Points>(null)
  const geometry=useMemo(()=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(90*3),3));return g},[])
  useFrame(()=>{
    const s=state.current;if(!points.current)return
    points.current.visible=s.settings.leak>0
    if(!points.current.visible)return
    const pos=geometry.attributes.position,force=Math.min(1,s.simulation.hydraulic.leak/.02)
    for(let i=0;i<90;i++){const t=((s.simulation.time/8+i/90)%1),a=i*2.399;pos.setXYZ(i,Math.cos(a)*t*.65,Math.max(0,4*t*(1-t))*force*1.9,Math.sin(a)*t*.65)}pos.needsUpdate=true
  })
  useEffect(()=>()=>geometry.dispose(),[geometry])
  return <points ref={points} geometry={geometry} position={[2.6,.25,-1.2]}><pointsMaterial color="#b4decb" size={.045} transparent opacity={.75} depthWrite={false}/></points>
}
function Selection({state}:{state:RefObject<SceneState>}) {
  const ring=useRef<T.Group>(null)
  useFrame(()=>{
    const s=state.current,site=SITES.find(v=>v.id===s.selected)
    if(ring.current){ring.current.visible=!!site;if(site)ring.current.position.set(site.position[0],site.position[1]+.12,site.position[2])}
  })
  return <group ref={ring}>
    <mesh rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.45,.475,56]}/><meshBasicMaterial color={C.amber} side={T.DoubleSide} transparent opacity={.95}/></mesh>
    <mesh position={[0,.16,0]}><cylinderGeometry args={[.014,.014,.3,6]}/><meshBasicMaterial color={C.amber}/></mesh>
  </group>
}
function CameraRig({view,onInteract}:{view:CameraView;onInteract:()=>void}) {
  const orbit=useRef<ComponentRef<typeof OrbitControls>>(null),anim=useRef({active:false,p:new T.Vector3(),target:new T.Vector3()})
  const {camera,size}=useThree()
  useEffect(()=>{anim.current={active:true,p:new T.Vector3(...view.position),target:new T.Vector3(...view.target)}},[view.revision,view.position.join(','),view.target.join(',')])
  useFrame((_,dt)=>{
    const o=orbit.current,a=anim.current;if(!o||!a.active)return
    camera.position.lerp(a.p,1-Math.exp(-dt*4));o.target.lerp(a.target,1-Math.exp(-dt*4));o.update()
    if(camera.position.distanceTo(a.p)<.025&&o.target.distanceTo(a.target)<.025)a.active=false
  })
  useEffect(()=>{
    if(camera instanceof T.PerspectiveCamera){camera.fov=size.width/size.height<.8?54:43;camera.updateProjectionMatrix()}
  },[camera,size.width,size.height])
  return <OrbitControls ref={orbit} makeDefault target={[0,0,0]} enableDamping dampingFactor={.08} minDistance={2.5} maxDistance={68} maxPolarAngle={Math.PI*.49} minPolarAngle={.09} onStart={()=>{anim.current.active=false;onInteract()}}/>
}
function World({state,onSelect,view,onInteract}:{state:RefObject<SceneState>;onSelect:(id:string)=>void;view:CameraView;onInteract:()=>void}) {
  return <>
    <color attach="background" args={[C.bg]}/>
    <fog attach="fog" args={[C.bg,48,100]}/>
    <PerspectiveCamera makeDefault position={[25,24,30]} fov={43} near={.1} far={180}/>
    <ambientLight intensity={.48}/>
    <hemisphereLight args={['#d8e6df','#142d32',1.4]}/>
    <directionalLight position={[-13,25,6]} intensity={3.1} color="#f9e6c4" castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-25} shadow-camera-right={25} shadow-camera-top={22} shadow-camera-bottom={-22} shadow-camera-far={70} shadow-bias={-.0006}/>
    <directionalLight position={[15,9,-13]} intensity={2.7} color="#7caab9"/>
    <group position={[0,-.7,0]}><Terrain state={state}/><Reservoir state={state} onSelect={onSelect}/><TreatmentPlant state={state} onSelect={onSelect}/><Streets/><Buildings state={state} onSelect={onSelect}/><Tower state={state} onSelect={onSelect}/><PipeNetwork state={state} onSelect={onSelect}/><Leak state={state}/><Selection state={state}/></group>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-2.4,0]} receiveShadow><planeGeometry args={[180,180]}/><shadowMaterial transparent opacity={.2}/></mesh>
    <CameraRig view={view} onInteract={onInteract}/>
  </>
}
export const WaterScene=memo(function WaterScene({state,onSelect,view,onInteract}:{state:RefObject<SceneState>;onSelect:(id:string)=>void;view:CameraView;onInteract:()=>void}) {
  return <Canvas shadows dpr={[1,1.6]} gl={{antialias:true,alpha:false,powerPreference:'high-performance'}} onPointerMissed={(event:MouseEvent)=>{if(event.type==='click')onInteract()}}>
    <World state={state} onSelect={onSelect} view={view} onInteract={onInteract}/>
  </Canvas>
})
