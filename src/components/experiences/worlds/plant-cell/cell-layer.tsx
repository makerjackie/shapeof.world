import { OrganelleSections } from './organelle-sections'
import { CortexLedges } from './cortex-ledges'
import { CellSlice } from './cell-slice'
import { CellNucleus, ReticulumSheets, Plasmodesmata } from './cell-detail'
import { CorticalCrowding } from './cortical-crowding'
import { PaintMaterial } from './illustration'
import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as T from 'three'
import { cellRadius, cellSurface, curveGeometry, cytoplasmicTracks, erNetwork } from './cell-geometry'
import { Membrane, ParticleMaterial } from './cell-materials'
import { Cutaway, TissueMaterial } from './cutaway'
import type { PhysiologyState } from './model'
import { getWaterReadings } from './water-model'
import { updateCellFolds, createHechtianStrands } from './water-geometry'
import { CellInspection } from './cell-inspection'

function random(seed: number) {
  let n = seed
  return () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296 }
}

function visibleInHierarchy(object: T.Object3D | null) {
  for (let node = object; node; node = node.parent) if (!node.visible) return false
  return object !== null
}

/** All 200 lenses are solid volumes; the camera-facing cut also clips organelles. */
function WallChloroplasts({ opacity, physiology, starch, light }: { opacity: number; physiology: MutableRefObject<PhysiologyState>; starch: number; light: number }) {
  const ref=useRef<T.InstancedMesh>(null)
  const geometry=useMemo(()=>new T.SphereGeometry(1,28,18).scale(3,1.9,1.15),[])
  const body=useMemo(()=>new T.Object3D(),[])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  useLayoutEffect(()=>{if(ref.current)ref.current.boundingSphere=new T.Sphere(new T.Vector3(),50)},[])
  useFrame(()=>{
    if(!ref.current||!visibleInHierarchy(ref.current))return
    for(let i=0;i<120;i++){
      const pose=physiology.current.chloroplasts.poses[Math.floor(i*200/120)]
      body.position.fromArray(pose.positionUm);body.quaternion.fromArray(pose.quaternion);body.scale.setScalar(pose.sizeScale)
      body.updateMatrix();ref.current.setMatrixAt(i,body.matrix)
    }
    ref.current.instanceMatrix.needsUpdate=true
  })
  return <>
    <instancedMesh name="wall-chloroplasts" ref={ref} args={[geometry,undefined,120]} castShadow receiveShadow frustumCulled={false}>
      <TissueMaterial color="#4f9b39" kind="chloroplast" clipped={false} selectiveCut opacity={opacity} starch={starch} glow={light*1.5}/>
    </instancedMesh>
    <OrganelleSections source={ref} count={120} stride={4} radii={[3,1.9,1.15]} name="wall-chloroplasts" color="#4b973d" opacity={opacity} kind="chloroplast-cut"/>
  </>
}

function WallPores({ opacity }: { opacity: number }) {
  const ref = useRef<T.InstancedMesh>(null)
  useLayoutEffect(() => {
    const o = new T.Object3D(), rand = random(1342)
    for (let i = 0; i < 240; i++) {
      const patch = Math.floor(i / 12), y = -24 + (patch % 10) * 5.2 + (rand() - 0.5) * 0.5
      const angle = patch < 10 ? 0.12 : Math.PI - 0.15
      const a = angle + (rand() - 0.5) * 0.045
      o.position.set(cellRadius(y) * Math.cos(a), y, -cellRadius(y) * Math.sin(a))
      o.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), new T.Vector3(Math.cos(a), 0, -Math.sin(a)))
      o.updateMatrix(); ref.current?.setMatrixAt(i, o.matrix)
    }
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true
  }, [])
  return <instancedMesh raycast={() => {}} ref={ref} args={[undefined, undefined, 240]}><torusGeometry args={[0.025, 0.007, 4, 8]} /><TissueMaterial color="#c5c9ae" opacity={opacity * 0.7} /></instancedMesh>
}

function StreamingOrganelles({ opacity, clock, mobile, timeScale, physiology }: { opacity: number; clock: MutableRefObject<number>; mobile: boolean; timeScale: number; physiology: MutableRefObject<PhysiologyState> }) {
  const mitochondria = useRef<T.InstancedMesh>(null), peroxisomes = useRef<T.InstancedMesh>(null), golgi = useRef<T.InstancedMesh>(null)
  const particles = useRef<T.Points>(null)
  const golgiGeometry=useMemo(()=>{
    const geometry=new T.SphereGeometry(1,20,10), positions=geometry.getAttribute('position')
    for(let i=0;i<positions.count;i++) positions.setY(i,positions.getY(i)+3*(positions.getX(i)**2-0.5))
    geometry.computeVertexNormals();return geometry
  },[])
  useEffect(()=>()=>golgiGeometry.dispose(),[golgiGeometry])
  const tracks = useMemo(cytoplasmicTracks, [])
  const tracksMesh = useMemo(() => curveGeometry(tracks, 0.017, 120), [tracks])
  const trails = useMemo(() => curveGeometry(tracks, 0.075, 120), [tracks])
  useEffect(() => () => trails.dispose(), [trails])
  const fast = timeScale >= 3600
  useEffect(() => () => tracksMesh.dispose(), [tracksMesh])
  const particleCount = mobile ? 950 : 2400
  const data = useMemo(() => {
    const rand = random(51312)
    return Array.from({ length: particleCount + 500 }, () => ({ phase: rand(), track: Math.floor(rand() * tracks.length), speed: 1.3 + rand() * 3, offset: new T.Vector3((rand() - 0.5) * 0.8, (rand() - 0.5) * 0.8, (rand() - 0.5) * 0.8), jitter:new T.Vector3() }))
  }, [particleCount, tracks.length])
  const docking = useMemo(() => Array.from({ length: 100 }, (_, i) => ({
    distance: 0, wait: 0, cooldown: data[i + 240].phase * 4, visits: 0,
  })), [data])
  const dockingPoint = useMemo(() => new T.Vector3(), [])
  const particleGeometry = useMemo(() => {
    const geo = new T.BufferGeometry()
    geo.setAttribute('position', new T.BufferAttribute(new Float32Array(particleCount * 3), 3))
    return geo
  }, [particleCount])
  // A breakpoint replaces only the particle buffer, not the shared flow tracks.
  useEffect(() => () => particleGeometry.dispose(), [particleGeometry])
  const lastTime=useRef(0), brownian=useMemo(()=>random(99417),[])
  const o = useMemo(() => new T.Object3D(), []), tangent = useMemo(() => new T.Vector3(), []), axis = useMemo(() => new T.Vector3(0, 1, 0), [])
  useFrame(() => {
    const time = clock.current, dt=Math.max(0,time-lastTime.current)
    if (time < lastTime.current) docking.forEach((state, i) => {
      state.distance=0;state.wait=0;state.cooldown=data[i+240].phase*4;state.visits=0
    })
    lastTime.current=time
    const visible = visibleInHierarchy(mitochondria.current)
    if (dt > 0) docking.forEach((state, i) => {
      const datum=data[i+240], track=tracks[datum.track], speed=datum.speed*0.7
      const cooldown=6+datum.phase*8
      let remaining=dt
      // At ×3600 only trails are drawn. Advance hidden cargo analytically;
      // individual encounters resume when the real organelles become visible.
      if (!visible) {
        const stopped=Math.min(remaining,state.wait)
        state.wait-=stopped;remaining-=stopped
        if(stopped>0&&state.wait===0)state.cooldown=cooldown
        state.distance+=speed*remaining;state.cooldown=Math.max(0,state.cooldown-remaining)
        return
      }
      while (remaining > 1e-9) {
        if (state.wait > 0) {
          const stopped=Math.min(remaining,state.wait)
          state.wait-=stopped;remaining-=stopped
          if(state.wait===0)state.cooldown=cooldown
          continue
        }
        if (state.cooldown <= 0) {
          const phase=datum.phase+state.distance/track.getLength()
          const t=datum.track>=12?1-Math.abs((phase%2)-1):phase%1
          track.getPointAt(t,dockingPoint).add(datum.offset)
          const nearby=physiology.current.chloroplasts.poses.some(({positionUm})=>{
            const dx=dockingPoint.x-positionUm[0],dy=dockingPoint.y-positionUm[1],dz=dockingPoint.z-positionUm[2]
            return Math.abs(dx)<=3&&Math.abs(dy)<=3&&Math.abs(dz)<=3&&dx*dx+dy*dy+dz*dz<=9
          })
          if(nearby) {
            state.visits++
            state.wait=1+2*((datum.phase+state.visits*0.61803398875)%1)
            continue
          }
        }
        // Substeps catch encounters at ×60 without jumping the stored distance.
        const step=Math.min(0.5,remaining)
        state.distance+=speed*step;state.cooldown=Math.max(0,state.cooldown-step);remaining-=step
      }
    })
    if (!visible) return
    const decay=Math.exp(-dt), noise=Math.sqrt(0.018*(1-decay*decay))
    const place = (index: number, orient = true) => {
      const datum = data[index], track = tracks[datum.track]
      // Stop-and-go integrated time retains monotonic forward travel.
      const cargoTime=index>=340&&index<390 ? time*0.55+Math.sin(time*0.8+index)*0.55/0.8 : time
      const distance=index>=240&&index<340?docking[index-240].distance:cargoTime*datum.speed
      const phase=datum.phase+distance/track.getLength()
      const t=datum.track>=12 ? 1-Math.abs((phase%2)-1) : phase%1
      track.getPointAt(t, o.position).add(datum.offset)
      if (orient) {
        track.getTangentAt(t, tangent)
        o.quaternion.setFromUnitVectors(axis, tangent); o.rotateY(Math.sin(time*0.7+index)*0.3)
      }
      return datum
    }
    for (let i = 0; i < 240; i++) {
      place(i); o.scale.set(.27, .45 + (i % 5) * .12, .27); o.updateMatrix(); mitochondria.current?.setMatrixAt(i, o.matrix)
    }
    for (let i = 0; i < 100; i++) {
      place(i + 240); o.scale.setScalar(0.26 + (i % 4) * 0.06); o.updateMatrix(); peroxisomes.current?.setMatrixAt(i, o.matrix)
    }
    for (let i = 0; i < 50; i++) {
      place(i + 340)
      // Five slightly curved flattened cisternae per moving Golgi stack.
      const center = o.position.clone()
      for (let j = 0; j < 5; j++) {
        o.position.copy(center).addScaledVector(tangent, (j-2)*0.09); o.position.x+=Math.abs(j-2)*0.045
        o.scale.set(.60-Math.abs(j-2)*.055,.045,.34); o.updateMatrix(); golgi.current?.setMatrixAt(i * 5 + j, o.matrix)
      }
    }
    for (const mesh of [mitochondria.current, peroxisomes.current, golgi.current]) if (mesh) mesh.instanceMatrix.needsUpdate = true
    const positions = particleGeometry.getAttribute('position') as T.BufferAttribute
    for (let i = 0; i < particleCount; i++) {
      place(i + 500, false)
      const jitter=data[i+500].jitter
      if(dt>0) { jitter.multiplyScalar(decay);jitter.x+=(brownian()*2-1)*noise;jitter.y+=(brownian()*2-1)*noise;jitter.z+=(brownian()*2-1)*noise }
      positions.setXYZ(i,o.position.x+jitter.x,o.position.y+jitter.y,o.position.z+jitter.z)
    }
    positions.needsUpdate = true
  })
  return <>
    <OrganelleSections source={mitochondria} count={240} color="#e48c37" name="streaming-mitochondria" opacity={opacity} />
    <OrganelleSections source={peroxisomes} count={100} color="#3398a7" name="streaming-peroxisomes" opacity={opacity} />
    <mesh raycast={() => {}} geometry={tracksMesh}><TissueMaterial color="#6b4a9d" opacity={opacity*0.48} depthWrite={false} /></mesh>
    <mesh raycast={() => {}} geometry={trails} visible={fast}><TissueMaterial color="#b59f80" opacity={opacity*0.48} depthWrite={false} /></mesh>
    <instancedMesh visible={!fast} name="streaming-mitochondria" ref={mitochondria} args={[undefined, undefined, 240]} frustumCulled={false}><sphereGeometry args={[1, 12, 8]} /><TissueMaterial color="#e48c37" clipped={false} selectiveCut roughness={0.6} opacity={opacity} /></instancedMesh>
    <instancedMesh visible={!fast} name="streaming-peroxisomes" ref={peroxisomes} args={[undefined, undefined, 100]} frustumCulled={false}><sphereGeometry args={[1, 10, 7]} /><TissueMaterial color="#3398a7" clipped={false} selectiveCut opacity={opacity} /></instancedMesh>
    <instancedMesh visible={!fast} name="streaming-golgi" ref={golgi} args={[golgiGeometry, undefined, 250]} frustumCulled={false}><TissueMaterial color="#cb558f" clipped={false} selectiveCut opacity={opacity} /></instancedMesh>
    <points raycast={() => {}} visible={!fast} ref={particles} geometry={particleGeometry} frustumCulled={false}><ParticleMaterial opacity={opacity*0.45} /></points>
  </>
}

// Neighbouring palisade cells, kept out of focus: two flanking the hero cell,
// two further back on the left so the frame reads as tissue, not a lone cell.
const NEIGHBOR_CELLS: Array<[number, number, number]> = [[-36,-2,-30],[36,2,-30],[-18,0,-64],[18,1,-64],[-54,-1,-64],[54,0,-64]]

function Neighbors({ opacity }: { opacity: number }) {
  const geometry = useMemo(() => cellSurface(true), [])
  useEffect(() => () => geometry.dispose(), [geometry])
  const chloroplasts = useRef<T.InstancedMesh>(null)
  useLayoutEffect(() => {
    const rand = random(45), o = new T.Object3D()
    for (let i = 0; i < NEIGHBOR_CELLS.length * 72; i++) {
      const [cx, cy, cz] = NEIGHBOR_CELLS[Math.floor(i / 72)]
      const y = (rand() - 0.5) * 61, a = rand() * Math.PI * 2
      o.position.set(cx + Math.cos(a) * 13, y + cy, cz + Math.sin(a) * 13)
      o.rotation.set(rand(), rand(), rand()); o.scale.set(2.3, 1.5, 0.8); o.updateMatrix()
      chloroplasts.current?.setMatrixAt(i, o.matrix)
    }
    if (chloroplasts.current) chloroplasts.current.instanceMatrix.needsUpdate = true
  }, [])
  return <group>
    {NEIGHBOR_CELLS.map((position,i)=><group key={i} position={position}>
      <mesh geometry={geometry}><PaintMaterial color="#8c7b43" transparent opacity={opacity*.26}/></mesh>
      <mesh geometry={geometry} scale={[.94,.985,.94]}><PaintMaterial color="#66578b" transparent opacity={opacity*.36}/></mesh>
      <mesh geometry={geometry} scale={[.78,.91,.78]}><PaintMaterial color="#7a9297" transparent opacity={opacity*.82}/></mesh>
    </group>)}
    <instancedMesh ref={chloroplasts} args={[undefined, undefined, NEIGHBOR_CELLS.length * 72]}><sphereGeometry args={[1, 10, 6]} /><PaintMaterial color="#53733c" emissive="#173010" emissiveIntensity={0} roughness={0.8} transparent opacity={opacity * .92} /></instancedMesh>
  </group>
}

function CellContext({ opacity }: { opacity: number }) {
  const epidermis = useMemo(() => {
    const geometry = new T.SphereGeometry(1, 32, 24)
    const position = geometry.getAttribute('position')
    // Rounded, tightly packed epidermal tiles: a continuous sheet above the
    // palisade, rather than a collection of spherical bubbles.
    const round = (value: number) => Math.sign(value) * Math.abs(value) ** 0.38
    for (let i = 0; i < position.count; i++) {
      const x = round(position.getX(i)), y = round(position.getY(i)), z = round(position.getZ(i))
      position.setXYZ(i, x * (1 + 0.025 * Math.sin(z * 6)), y, z * (1 + 0.025 * Math.sin(x * 5)))
    }
    geometry.computeVertexNormals()
    return geometry
  }, [])
  useEffect(() => () => epidermis.dispose(), [epidermis])
  return <group>
    <Neighbors opacity={opacity} />
    {Array.from({length:9},(_,i)=><mesh key={i} geometry={epidermis} position={[(i%3-1)*31,47.5,-35-Math.floor(i/3)*31]} scale={[15,12.5,15]}><Membrane color="#bbc3b8" strength={0.045} base={0.0015} opacity={opacity*0.4} /></mesh>)}
    <mesh position={[0,60,-55]} scale={[96,0.4,80]}><boxGeometry /><PaintMaterial color="#ded8be" roughness={0.6} transparent opacity={opacity*0.05} /></mesh>
    {Array.from({length:12},(_,i)=><mesh key={i} position={[(i%4-1.5)*31,-65-Math.floor(i/4)*34,-35-Math.sin(i)*15]} scale={[12,10,11]}><sphereGeometry args={[1,16,12]} /><Membrane color="#354833" strength={0.07} base={0.005} opacity={opacity*0.5} /></mesh>)}
  </group>
}

export function CellLayer({ opacity, light, clock, mobile = false, physiology, timeScale, starch, inspectable = true }: {
  opacity: number; light: number; clock: MutableRefObject<number>; mobile?: boolean; physiology: MutableRefObject<PhysiologyState>; timeScale: number; starch: number; inspectable?: boolean
}) {
  const wall=useMemo(()=>cellSurface(true),[]), membrane=useMemo(()=>cellSurface(true,0.22),[])
  const vacuole=useMemo(()=>cellSurface(true),[]), er=useMemo(erNetwork,[])
  const strands=useMemo(()=>curveGeometry(cytoplasmicTracks().slice(12),0.09,90),[])
  useEffect(()=>()=>{for(const geometry of [wall,membrane,vacuole,er,strands]) geometry.dispose()},[wall,membrane,vacuole,er,strands])
  const water = getWaterReadings(physiology.current.water)
  const hechtian = useMemo(() => createHechtianStrands(water), [water.radial, water.axial, water.wallRadial, water.wallAxial, water.immersion, water.concavity, water.wrinkles])
  useEffect(() => () => hechtian.dispose(), [hechtian])
  useLayoutEffect(() => {
    updateCellFolds(wall, water.wrinkles)
    updateCellFolds(membrane, water.wrinkles, water.concavity)
    updateCellFolds(vacuole, water.wrinkles, water.concavity)
  }, [wall, membrane, vacuole, water.wrinkles, water.concavity])
  return <group>
    <CellContext opacity={opacity} />
    <Cutaway wedge reveal={18}>
      <CellInspection enabled={inspectable} physiology={physiology}>
      <group name="cell-water-wall" scale={[water.wallRadial,water.wallAxial,water.wallRadial]}>
      <mesh name="cell-wall" geometry={wall} receiveShadow><TissueMaterial color="#b8a248" kind="wall" opacity={opacity} roughness={0.96} /></mesh>
      <CellSlice part="wall" opacity={opacity} wrinkles={water.wrinkles} concavity={0} />

      <WallPores opacity={opacity} />
      <Plasmodesmata opacity={opacity} />
      </group>
      {water.immersion > .001 && <>
        <mesh name="cell-saline-gap" geometry={wall} scale={[.985, .99, .985]}><TissueMaterial color="#8ca7a9" opacity={opacity * .035} depthWrite={false} /></mesh>
        <mesh name="cell-hechtian-strands" geometry={hechtian}><TissueMaterial color="#c1cec0" opacity={opacity * .85} /></mesh>
      </>}
    <group name="cell-water-protoplast" scale={[water.radial,water.axial,water.radial]}>
    <Cutaway wedge reveal={18}>
      <CellSlice part="contents" opacity={opacity} wrinkles={water.wrinkles} concavity={water.concavity} />
      <mesh geometry={membrane}><Membrane color="#d6dcc6" opacity={opacity} strength={water.immersion > .01 ? .23 : .11} base={.001 + .012 * water.immersion} fibers /></mesh>
      <mesh geometry={vacuole} scale={[0.84,0.94,0.84]} receiveShadow><TissueMaterial color="#acd9e1" kind="vacuole" opacity={opacity} /></mesh>
      <mesh geometry={vacuole} scale={[0.84,0.94,0.84]}><Membrane color="#cfe2e6" opacity={opacity} strength={0.035} base={0.0003} /></mesh>
      <mesh geometry={strands}><Membrane color="#c4cabb" opacity={opacity} strength={0.13} base={0.02} /></mesh>
      <mesh geometry={membrane} scale={[.975,.995,.975]}><TissueMaterial color="#7862ad" opacity={opacity} /></mesh>
      <mesh name="cell-er" geometry={er}><TissueMaterial color="#7466b9" opacity={opacity*0.48} /></mesh>

      <CorticalCrowding mobile={mobile} physiology={physiology} clock={clock} />
      <WallChloroplasts opacity={opacity} physiology={physiology} starch={starch} light={light} />
      <CellNucleus opacity={opacity} />
      <ReticulumSheets opacity={opacity} />
      <CortexLedges opacity={opacity} />
      <StreamingOrganelles opacity={opacity} clock={clock} mobile={mobile} timeScale={timeScale} physiology={physiology} />

    </Cutaway>
    </group>
      </CellInspection>
    </Cutaway>
  </group>
}
