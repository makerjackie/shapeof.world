import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as T from 'three'
import { cellRadius, cellSurface, cutRim, curveGeometry, cytoplasmicTracks, erNetwork } from './cell-geometry'
import { ChloroplastMaterial, LightSheet, Membrane } from './cell-materials'

function random(seed: number) {
  let n = seed
  return () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296 }
}

/** 200 stationary chloroplasts; front-half specimens are removed by the cut. */
function WallChloroplasts({ opacity, light, detailFade }: { opacity: number; light: number; detailFade: number }) {
  const ref = useRef<T.InstancedMesh>(null)
  const grana = useRef<T.InstancedMesh>(null)
  const geometry = useMemo(() => new T.SphereGeometry(1, 24, 14).scale(3, 1.9, 1.15), [])
  // The wall instances and zoom proxy share this geometry until their owner unmounts.
  useEffect(() => () => geometry.dispose(), [geometry])
  useLayoutEffect(() => {
    if (!ref.current) return
    const rand = random(72018), o = new T.Object3D(), granum = new T.Object3D(), combined = new T.Matrix4()
    for (let i = 0; i < 200; i++) {
      const row = Math.floor(i / 13), col = i % 13
      const y = -29 + row * 3.9 + (rand() - 0.5) * 1.4
      const angle = col / 13 * Math.PI * 2 + (row % 2) * 0.24 + (rand() - 0.5) * 0.13
      const radius = cellRadius(y) - 1.25
      o.position.set(radius * Math.cos(angle), y, -radius * Math.sin(angle))
      o.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), new T.Vector3(Math.cos(angle), 0.02, -Math.sin(angle)).normalize())
      o.rotateZ((rand() - 0.5) * 0.6)
      o.scale.setScalar(0.84 + rand() * 0.2)
      // Reserve the zoom target, shown by its own matching proxy.
      if (o.position.distanceTo(new T.Vector3(12.2, 6, 0)) < 5) o.scale.setScalar(0)
      o.updateMatrix(); ref.current.setMatrixAt(i, o.matrix)
      const interior = random(i + 417)
      for (let j = 0; j < 40; j++) {
        const angle = j * 2.399963, r = Math.sqrt((j + 0.5) / 40) * 0.85
        granum.position.set(Math.cos(angle) * r * 2.65, Math.sin(angle) * r * 1.65, (interior() - 0.5) * 0.6)
        granum.rotation.set(0, 0, interior() * 0.5)
        granum.scale.set(0.18 + interior() * 0.07, 0.17 + interior() * 0.05, 0.06 + interior() * 0.08)
        if (o.position.z > 1.3) granum.scale.setScalar(0)
        granum.updateMatrix(); combined.multiplyMatrices(o.matrix, granum.matrix)
        grana.current?.setMatrixAt(i * 40 + j, combined)
      }
    }
    ref.current.instanceMatrix.needsUpdate = true
    if (grana.current) grana.current.instanceMatrix.needsUpdate = true
  }, [])
  return <>
    <instancedMesh ref={grana} args={[undefined, undefined, 8000]} frustumCulled={false}>
      <sphereGeometry args={[1, 8, 5]} /><meshStandardMaterial color="#274224" roughness={1} transparent opacity={opacity * 0.78} />
    </instancedMesh>
    <instancedMesh name="wall-chloroplasts" ref={ref} args={[geometry, undefined, 200]} frustumCulled={false}>
      <ChloroplastMaterial opacity={opacity} light={light} />
    </instancedMesh>
    <mesh geometry={geometry} position={[12.2, 6, 0]} rotation={[0, 0, Math.PI / 2]}>
      <ChloroplastMaterial opacity={opacity * (1 - detailFade)} light={light} />
    </mesh>
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
  return <instancedMesh ref={ref} args={[undefined, undefined, 240]}><torusGeometry args={[0.025, 0.007, 4, 8]} /><meshBasicMaterial color="#c5c9ae" transparent opacity={opacity * 0.7} /></instancedMesh>
}

function Nucleus({ opacity }: { opacity: number }) {
  const pores = useRef<T.InstancedMesh>(null)
  const chromatin = useRef<T.InstancedMesh>(null)
  useLayoutEffect(() => {
    const o = new T.Object3D(), rand = random(312)
    for (let i = 0; i < 340; i++) {
      const y = 1 - (i + 0.5) / 340 * 2, angle = i * 2.399963
      const r = Math.sqrt(1 - y * y), normal = new T.Vector3(r * Math.cos(angle), y, r * Math.sin(angle))
      o.position.copy(normal).multiplyScalar(4.02)
      o.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), normal)
      o.scale.setScalar(1); o.updateMatrix(); pores.current?.setMatrixAt(i, o.matrix)
    }
    for (let i = 0; i < 300; i++) {
      const phi = rand() * Math.PI * 2, c = rand() * 2 - 1, r = Math.cbrt(rand()) * 3.6
      o.position.set(Math.sqrt(1 - c * c) * Math.cos(phi) * r, c * r, Math.sqrt(1 - c * c) * Math.sin(phi) * r)
      o.scale.setScalar(0.035 + rand() * 0.1); o.updateMatrix(); chromatin.current?.setMatrixAt(i, o.matrix)
    }
    if (pores.current) pores.current.instanceMatrix.needsUpdate = true
    if (chromatin.current) chromatin.current.instanceMatrix.needsUpdate = true
  }, [])
  return <group position={[-8.2, -13, -1.8]} rotation={[0, 0.2, 0.16]}>
    <mesh><sphereGeometry args={[4, 40, 28]} /><Membrane color="#aebcc5" opacity={opacity} strength={0.44} base={0.085} /></mesh>
    <mesh><sphereGeometry args={[3.92, 32, 24]} /><Membrane color="#8197a5" opacity={opacity} strength={0.2} base={0.02} /></mesh>
    <mesh position={[-0.6, 0.25, 0.1]} scale={[1.2, 1, 0.9]}><sphereGeometry args={[1.25, 24, 20]} /><meshStandardMaterial color="#4c5866" roughness={0.95} transparent opacity={opacity * 0.9} /></mesh>
    <instancedMesh ref={pores} args={[undefined, undefined, 340]}>
      <torusGeometry args={[0.05, 0.013, 4, 8]} /><meshStandardMaterial color="#c3d1ca" roughness={0.85} transparent opacity={opacity * 0.85} />
    </instancedMesh>
    <instancedMesh ref={chromatin} args={[undefined, undefined, 300]}>
      <icosahedronGeometry args={[1, 0]} /><meshStandardMaterial color="#81919c" roughness={1} transparent opacity={opacity * 0.65} />
    </instancedMesh>
  </group>
}

function StreamingOrganelles({ opacity, clock, mobile }: { opacity: number; clock: MutableRefObject<number>; mobile: boolean }) {
  const mitochondria = useRef<T.InstancedMesh>(null), peroxisomes = useRef<T.InstancedMesh>(null), golgi = useRef<T.InstancedMesh>(null)
  const particles = useRef<T.Points>(null)
  const tracks = useMemo(cytoplasmicTracks, [])
  const tracksMesh = useMemo(() => curveGeometry(tracks, 0.017, 120), [tracks])
  useEffect(() => () => tracksMesh.dispose(), [tracksMesh])
  const particleCount = mobile ? 950 : 2400
  const data = useMemo(() => {
    const rand = random(51312)
    return Array.from({ length: particleCount + 500 }, () => ({ phase: rand(), track: Math.floor(rand() * tracks.length), speed: 1.3 + rand() * 3, offset: new T.Vector3((rand() - 0.5) * 0.8, (rand() - 0.5) * 0.8, (rand() - 0.5) * 0.8) }))
  }, [particleCount, tracks.length])
  const particleGeometry = useMemo(() => {
    const geo = new T.BufferGeometry()
    geo.setAttribute('position', new T.BufferAttribute(new Float32Array(particleCount * 3), 3))
    return geo
  }, [particleCount])
  // A breakpoint replaces only the particle buffer, not the shared flow tracks.
  useEffect(() => () => particleGeometry.dispose(), [particleGeometry])
  const o = useMemo(() => new T.Object3D(), []), tangent = useMemo(() => new T.Vector3(), []), axis = useMemo(() => new T.Vector3(0, 1, 0), [])
  useFrame(() => {
    if (!mitochondria.current?.parent?.parent?.visible) return
    const time = clock.current
    const place = (index: number) => {
      const datum = data[index], track = tracks[datum.track]
      const t = (datum.phase + time * datum.speed / track.getLength()) % 1
      track.getPointAt(t, o.position).add(datum.offset)
      track.getTangentAt(t, tangent)
      o.quaternion.setFromUnitVectors(axis, tangent)
      return datum
    }
    for (let i = 0; i < 240; i++) {
      place(i); o.scale.set(0.22, 0.45 + (i % 5) * 0.07, 0.22); o.updateMatrix(); mitochondria.current?.setMatrixAt(i, o.matrix)
    }
    for (let i = 0; i < 100; i++) {
      place(i + 240); o.scale.setScalar(0.33 + (i % 4) * 0.055); o.updateMatrix(); peroxisomes.current?.setMatrixAt(i, o.matrix)
    }
    for (let i = 0; i < 50; i++) {
      place(i + 340)
      // Five slightly curved flattened cisternae per moving Golgi stack.
      const center = o.position.clone()
      for (let j = 0; j < 5; j++) {
        o.position.copy(center).addScaledVector(tangent, (j - 2) * 0.105)
        o.scale.set(0.48 - Math.abs(j - 2) * 0.04, 0.04, 0.28); o.updateMatrix(); golgi.current?.setMatrixAt(i * 5 + j, o.matrix)
      }
    }
    for (const mesh of [mitochondria.current, peroxisomes.current, golgi.current]) if (mesh) mesh.instanceMatrix.needsUpdate = true
    const positions = particleGeometry.getAttribute('position') as T.BufferAttribute
    for (let i = 0; i < particleCount; i++) {
      place(i + 500)
      const t = time * 4 + i * 3.97
      positions.setXYZ(i, o.position.x + Math.sin(t) * 0.09, o.position.y + Math.cos(t * 1.3) * 0.09, o.position.z + Math.sin(t * 0.7) * 0.09)
    }
    positions.needsUpdate = true
  })
  return <>
    <mesh geometry={tracksMesh}><meshBasicMaterial color="#b8c9b9" transparent opacity={opacity * 0.09} depthWrite={false} /></mesh>
    <instancedMesh name="streaming-mitochondria" ref={mitochondria} args={[undefined, undefined, 240]} frustumCulled={false}><sphereGeometry args={[1, 10, 7]} /><meshStandardMaterial color="#b78952" roughness={0.72} emissive="#52351a" emissiveIntensity={0.14} transparent opacity={opacity} /></instancedMesh>
    <instancedMesh ref={peroxisomes} args={[undefined, undefined, 100]} frustumCulled={false}><sphereGeometry args={[1, 10, 7]} /><meshStandardMaterial color="#a5b9a4" roughness={0.86} transparent opacity={opacity * 0.75} /></instancedMesh>
    <instancedMesh ref={golgi} args={[undefined, undefined, 250]} frustumCulled={false}><sphereGeometry args={[1, 10, 6]} /><meshStandardMaterial color="#b78c7e" roughness={0.95} transparent opacity={opacity * 0.8} /></instancedMesh>
    <points ref={particles} geometry={particleGeometry} frustumCulled={false}><pointsMaterial color="#c9ccb0" size={0.085} transparent opacity={opacity * 0.53} depthWrite={false} sizeAttenuation /></points>
  </>
}

function Neighbors({ opacity }: { opacity: number }) {
  const geometry = useMemo(() => cellSurface(true), [])
  useEffect(() => () => geometry.dispose(), [geometry])
  const chloroplasts = useRef<T.InstancedMesh>(null)
  useLayoutEffect(() => {
    const rand = random(45), o = new T.Object3D()
    for (let i = 0; i < 320; i++) {
      const side = i < 160 ? -1 : 1
      const y = (rand() - 0.5) * 61, a = rand() * Math.PI * 2
      o.position.set(side * 34 + Math.cos(a) * 13, y + side * 8, (side === 1 ? -70 : -34) + Math.sin(a) * 13)
      o.rotation.set(rand(), rand(), rand()); o.scale.set(2.3, 1.5, 0.8); o.updateMatrix()
      chloroplasts.current?.setMatrixAt(i, o.matrix)
    }
    if (chloroplasts.current) chloroplasts.current.instanceMatrix.needsUpdate = true
  }, [])
  return <group>
    {[-1, 1].map((side) => <mesh key={side} geometry={geometry} position={[side * 34, side * 8, side === 1 ? -70 : -34]}><Membrane color="#547563" strength={0.15} base={0.012} opacity={opacity} /></mesh>)}
    <instancedMesh ref={chloroplasts} args={[undefined, undefined, 320]}><sphereGeometry args={[1, 10, 6]} /><meshStandardMaterial color="#263d24" roughness={1} transparent opacity={opacity * 0.65} /></instancedMesh>
  </group>
}

export function CellLayer({ opacity, light, clock, mobile = false, detailFade = 0 }: {
  opacity: number; light: number; clock: MutableRefObject<number>; mobile?: boolean; detailFade?: number
}) {
  const wall = useMemo(() => cellSurface(), [])
  const membrane = useMemo(() => cellSurface(false, 0.22), [])
  const vacuole = useMemo(() => cellSurface(true), [])
  const rim = useMemo(cutRim, [])
  const er = useMemo(erNetwork, [])
  const strands = useMemo(() => curveGeometry([
    new T.CatmullRomCurve3([new T.Vector3(-12, -20, -3), new T.Vector3(-4, -7, -1), new T.Vector3(2, 3, -1), new T.Vector3(12, 18, -4)]),
    new T.CatmullRomCurve3([new T.Vector3(-10, 24, -5), new T.Vector3(-5, 13, -1), new T.Vector3(-7, -2, -1), new T.Vector3(-10, -14, -2)]),
    new T.CatmullRomCurve3([new T.Vector3(-9, -13, -2), new T.Vector3(0, -20, -2), new T.Vector3(12, -24, -4)]),
  ], 0.11, 70), [])
  useEffect(() => () => {
    for (const geometry of [wall, membrane, vacuole, rim, er, strands]) geometry.dispose()
  }, [wall, membrane, vacuole, rim, er, strands])
  return <group>
    <Neighbors opacity={opacity} />
    <mesh geometry={wall}><Membrane color="#d9cfb5" opacity={opacity} strength={0.3} base={0.025} fibers /></mesh>
    <mesh geometry={membrane}><Membrane color="#e6eee4" opacity={opacity} strength={0.22} base={0.006} /></mesh>
    <mesh geometry={rim}><meshBasicMaterial color="#d7ceb5" transparent opacity={opacity * 0.78} /></mesh>
    <mesh geometry={vacuole} scale={[0.88, 0.94, 0.88]}><Membrane color="#cfe2e6" opacity={opacity} strength={0.075} base={0.002} /></mesh>
    <mesh geometry={strands}><Membrane color="#d7ddd0" opacity={opacity} strength={0.24} base={0.08} /></mesh>
    <mesh geometry={er}><meshStandardMaterial color="#9d9ab0" roughness={0.9} transparent opacity={opacity * 0.22} depthWrite={false} /></mesh>
    <WallPores opacity={opacity} />
    <WallChloroplasts opacity={opacity} light={light} detailFade={detailFade} />
    <Nucleus opacity={opacity} />
    <StreamingOrganelles opacity={opacity} clock={clock} mobile={mobile} />
    <mesh position={[-2, 7, -16]} rotation={[0, 0, -0.12]} scale={[82, 105, 1]}><planeGeometry /><LightSheet intensity={light * opacity} /></mesh>
    <mesh position={[0, 5, 2]} rotation={[0, 0, -0.12]} scale={[50, 90, 1]}><planeGeometry /><LightSheet intensity={light * opacity * 0.45} /></mesh>
  </group>
}
