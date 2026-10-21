import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Edges, OrbitControls } from '@react-three/drei'
import { Color, Group, IcosahedronGeometry, MathUtils, Mesh, MeshPhysicalMaterial, MeshBasicMaterial, PMREMGenerator, Vector3, CatmullRomCurve3 } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { Study } from './procedural-studies'

type Props = { study: Study; liquid: number; powered: boolean; diamond: boolean; rotation: number; reduced: boolean; onInteract: () => void; fallback: ReactNode }
class SceneBoundary extends Component<{children: ReactNode; fallback: ReactNode}, {failed: boolean}> {
  state = {failed:false}
  static getDerivedStateFromError() { return {failed:true} }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}
function Studio() {
  const {gl,scene} = useThree()
  useEffect(() => {
    const generator = new PMREMGenerator(gl)
    const room = new RoomEnvironment()
    const env = generator.fromScene(room, 0.04)
    const previous = scene.environment
    scene.environment = env.texture
    return () => { scene.environment = previous; env.dispose(); room.dispose(); generator.dispose() }
  }, [gl,scene])
  return <><ambientLight intensity={0.65}/><directionalLight position={[-3,5,4]} intensity={3}/><directionalLight position={[4,1,-3]} intensity={2} color="#ffe6bd"/></>
}
function MaterialSample({study,liquid,powered,diamond,rotation,reduced}: Omit<Props,'onInteract'|'fallback'>) {
  const root = useRef<Group>(null)
  const mesh = useRef<Mesh>(null)
  const material = useRef<MeshPhysicalMaterial>(null)
  const neonMaterial=useRef<MeshBasicMaterial>(null)
  const progress = useRef(liquid)
  const previousProgress = useRef(-1)
  const glow = useRef(powered ? 1 : 0)
  const sample = useMemo(() => {
    const geometry = new IcosahedronGeometry(1, 4)
    const source = Float32Array.from(geometry.attributes.position.array)
    const solid = new Float32Array(source.length)
    const fluid = new Float32Array(source.length)
    for (let i=0;i<source.length;i+=3) {
      const x=source[i],y=source[i+1],z=source[i+2]
      // Original geometric material study, deliberately not a mineral crystal model.
      const r = 1 + .15*Math.sin(x*6+y*3)*Math.cos(z*5-y*2) + .08*Math.cos(y*8-z*4)
      solid[i]=x*r*.85; solid[i+1]=y*r*.82+.05; solid[i+2]=z*r
      fluid[i]=x*1.17; fluid[i+1]=y*.43-.44; fluid[i+2]=z*.97
    }
    return {geometry,solid,fluid}
  },[])
  useEffect(() => () => sample.geometry.dispose(),[sample])
  const neonCurve = useMemo(() => new CatmullRomCurve3([
    new Vector3(-.6,.95,0),new Vector3(-.6,-.48,0),new Vector3(-.4,-.78,0),new Vector3(.4,-.78,0),new Vector3(.6,-.48,0),new Vector3(.6,.95,0),
  ]),[])
  useFrame((_,delta) => {
    const dt = Math.min(delta,.05)
    progress.current = reduced ? liquid : MathUtils.damp(progress.current,liquid,3,dt)
    glow.current = reduced ? (powered?1:0) : MathUtils.damp(glow.current,powered?1:0,6,dt)
    if (root.current) {
      root.current.rotation.y = reduced ? rotation : MathUtils.damp(root.current.rotation.y, rotation,5,dt)
      root.current.scale.setScalar(reduced ? 1 : MathUtils.damp(root.current.scale.x,1,5,dt))
    }
    if (mesh.current && Math.abs(previousProgress.current-progress.current)>0.00001 && study.kind !== 'carbon' && study.kind !== 'neon') {
      const position = sample.geometry.attributes.position
      const t=progress.current
      for (let i=0;i<position.array.length;i++) position.array[i] = sample.solid[i]*(1-t)+sample.fluid[i]*t
      position.needsUpdate=true
      sample.geometry.computeVertexNormals()
      const normals = sample.geometry.attributes.normal
      const normal = new Vector3()
      for (let i=0;i<position.count;i++) {
        const ix=i*3
        normal.set(sample.fluid[ix]/(1.17*1.17),(sample.fluid[ix+1]+.44)/(.43*.43),sample.fluid[ix+2]/(.97*.97)).normalize()
        normal.set(MathUtils.lerp(normals.getX(i),normal.x,t),MathUtils.lerp(normals.getY(i),normal.y,t),MathUtils.lerp(normals.getZ(i),normal.z,t)).normalize()
        normals.setXYZ(i,normal.x,normal.y,normal.z)
      }
      normals.needsUpdate=true
      previousProgress.current=t
      if (material.current) material.current.roughness = MathUtils.lerp(.23,.08,t)
    }
    if (study.kind==='neon' && neonMaterial.current) {
      neonMaterial.current.opacity=.12+glow.current*.88
      neonMaterial.current.color.copy(new Color('#e2e6e7')).lerp(new Color('#ff692b'),glow.current)
    }
  })
  return <group ref={root} scale={reduced?1:.88}>
    {study.kind==='neon' ? <group>
      <mesh><tubeGeometry args={[neonCurve,80,.105,12,false]}/><meshPhysicalMaterial color="#dce4e4" metalness={.05} roughness={.1} transparent opacity={.18} depthWrite={false} side={2}/></mesh>
      <mesh><tubeGeometry args={[neonCurve,80,.057,12,false]}/><meshBasicMaterial ref={neonMaterial} color={powered?'#ff692b':'#e2e6e7'} toneMapped={false} transparent opacity={powered?1:.12}/></mesh>
      {[-.6,.6].map(x=><mesh key={x} position={[x,.9,0]}><cylinderGeometry args={[.12,.12,.25,24]}/><meshStandardMaterial color="#777b7c" metalness={.8} roughness={.25}/></mesh>)}
    </group> : study.kind==='carbon' ? <group rotation={[.15,.3,-.15]}>
      {diamond ? <mesh><octahedronGeometry args={[1.06,0]}/><meshPhysicalMaterial color="#577277" metalness={0} roughness={.1} transmission={.7} thickness={.4} ior={2.417} envMapIntensity={.5}/><Edges color="#829b98" transparent opacity={.4}/></mesh>
      : [0,1,2,3,4,5].map(i=><mesh key={i} position={[Math.sin(i)*.035,-.48+i*.19,0]}><cylinderGeometry args={[.94,.94,.14,6]}/><meshStandardMaterial color="#3d4245" metalness={.3} roughness={.43}/></mesh>)}
    </group> : <mesh ref={mesh} geometry={sample.geometry} rotation={[.1,0,-.13]}>
      <meshPhysicalMaterial ref={material} color={study.color} metalness={study.color==='#711f0f'?.08:1} roughness={.2} clearcoat={.6} clearcoatRoughness={.13} envMapIntensity={1.5}/>
    </mesh>}
  </group>
}
export function SpecimenScene(props: Props) {
  return <SceneBoundary fallback={props.fallback}><Suspense fallback={props.fallback}>
    <Canvas dpr={[1,1.7]} camera={{position:[0,1.05,4.5],fov:34}} gl={{alpha:true,antialias:true}} fallback={props.fallback}>
      <Studio/>
      <MaterialSample {...props}/>
      <OrbitControls enablePan={false} enableZoom={false} enableDamping={!props.reduced} dampingFactor={.08} minPolarAngle={.6} maxPolarAngle={2.1} onStart={props.onInteract}/>
    </Canvas>
  </Suspense></SceneBoundary>
}
