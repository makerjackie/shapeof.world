import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { CHLOROPLAST_RADII, ENTRY_GRANUM, GRANUM_SECTION_Y, STARCH_LENSES, chloroplastRandom, createChloroplastMorphology, getThylakoidDimensions } from './chloro-model'
import { buildLamellae, makeMembraneDisk } from './chloro-geometry'

interface ChloroplastLayerProps { opacity: number; mobile?: boolean; light?: number; starch?: number; detailOnly?: boolean }
type Instance = { position: THREE.Vector3; scale: THREE.Vector3; rotation?: THREE.Euler; color?: THREE.Color }

function OrganicInstances({ instances, geometry, color, opacity, clippingPlanes, roughness = 0.9, depthWrite = true, membrane = false }: {
  instances: Instance[]; geometry: THREE.BufferGeometry; color: string; opacity: number
  clippingPlanes?: THREE.Plane[]; roughness?: number; depthWrite?: boolean; membrane?: boolean
}) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    if (!ref.current) return
    const dummy = new THREE.Object3D()
    instances.forEach((instance, i) => {
      dummy.position.copy(instance.position); dummy.scale.copy(instance.scale)
      dummy.rotation.copy(instance.rotation ?? new THREE.Euler())
      dummy.updateMatrix(); ref.current!.setMatrixAt(i, dummy.matrix)
      if (instance.color) ref.current!.setColorAt(i, instance.color)
    })
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [instances])
  return <instancedMesh ref={ref} args={[geometry, undefined, instances.length]} frustumCulled={false}>
    <meshStandardMaterial color={color} roughness={roughness} metalness={0} transparent opacity={opacity} depthWrite={depthWrite} clippingPlanes={clippingPlanes} side={THREE.DoubleSide} forceSinglePass
      customProgramCacheKey={() => `chloroplast-membrane-grain-3-${membrane}`} onBeforeCompile={(shader) => {
        shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vOrganic;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvOrganic = position;')
        shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vOrganic;')
          .replace('#include <color_fragment>', `#include <color_fragment>
          float grain = fract(sin(dot(floor(vOrganic * 170.0), vec3(12.9898,78.233,43.317))) * 43758.5453);
          diffuseColor.rgb *= 0.94 + 0.10 * grain;`)
        if (membrane) shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
          float grazing = pow(clamp(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0), 2.1);
          outgoingLight += vec3(0.009, 0.025, 0.005) * grazing;
          diffuseColor.a *= 0.91 + 0.09 * grazing;
          #include <opaque_fragment>`)
      }} />
  </instancedMesh>
}

/** Full three-dimensional, damped camera-facing cut, independent of the cell cut. */
function Envelope({ opacity, mobile }: { opacity: number; mobile: boolean }) {
  const ref = useRef<THREE.Group>(null)
  const state = useMemo(() => ({ plane: new THREE.Plane(), direction: new THREE.Vector3(0.15, -0.95, 0.25).normalize(), eye: new THREE.Vector3(), normal: new THREE.Vector3(), localPlane: new THREE.Plane(), planeUniform: new THREE.Vector4(), scale: { value: 1 } }), [])
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: '#83956d', roughness: 0.96, transparent: true, opacity: opacity * 0.44, side: THREE.DoubleSide, depthWrite: false, clippingPlanes: [state.plane] })
    m.onBeforeCompile = (shader) => {
      shader.uniforms.envelopePlane = { value: state.planeUniform }
      shader.uniforms.envelopeScale = state.scale
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vEnvelopeWorld;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvEnvelopeWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;')
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vEnvelopeWorld; uniform vec4 envelopePlane; uniform float envelopeScale;')
        .replace('#include <alphatest_fragment>', `
        float edge = pow(clamp(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 0.0, 1.0), 2.3);
        float cutDistance = abs(dot(vec4(vEnvelopeWorld, 1.0), envelopePlane)) / max(envelopeScale, 0.0001);
        float rim = 1.0 - smoothstep(0.0015, 0.008, cutDistance);
        diffuseColor.a *= max(mix(0.035, 0.78, edge), rim * 0.9);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.60, 0.66, 0.40), rim * 0.48);
        #include <alphatest_fragment>`)
    }
    return m
  }, [state, opacity])
  useEffect(() => () => material.dispose(), [material])
  useFrame(({ camera }, dt) => {
    if (!ref.current) return
    const group = ref.current
    group.updateWorldMatrix(true, false)
    group.worldToLocal(state.eye.copy(camera.position)).normalize()
    state.direction.lerp(state.eye, 1 - Math.exp(-Math.min(dt, 0.05) * 5)).normalize()
    state.localPlane.set(state.normal.copy(state.direction).negate(), 0.015)
    state.plane.copy(state.localPlane).applyMatrix4(group.matrixWorld)
    state.planeUniform.set(state.plane.normal.x, state.plane.normal.y, state.plane.normal.z, state.plane.constant)
    state.scale.value = group.matrixWorld.elements[0] ** 2 + group.matrixWorld.elements[1] ** 2 + group.matrixWorld.elements[2] ** 2
    state.scale.value = Math.sqrt(state.scale.value)
  })
  return <group ref={ref}>{[0, 0.02].map((inset) => <mesh key={inset} scale={CHLOROPLAST_RADII.map((r) => r - inset) as [number, number, number]} material={material} renderOrder={4}>
    <sphereGeometry args={[1, mobile ? 40 : 72, mobile ? 24 : 48]} />
  </mesh>)}</group>
}

/** Physically sized Rubisco / ribosome representatives, not screen-sized sparkles. */
function StromalParticles({ mobile, opacity, light }: { mobile: boolean; opacity: number; light: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const count = mobile ? 10000 : 30000
  const data = useMemo(() => {
    const random = chloroplastRandom(813201), dummy = new THREE.Object3D()
    const { grana } = createChloroplastMorphology()
    const matrices: THREE.Matrix4[] = []
    for (let i = 0; i < count; i++) {
      const x = (random() * 2 - 1) * 2.9, y = (random() * 2 - 1) * 1.8, z = (random() * 2 - 1) * 1.04
      if ((x / 2.9) ** 2 + (y / 1.8) ** 2 + (z / 1.04) ** 2 > 1) { i--; continue }
      if (grana.some((g) => Math.hypot(x - g.center[0], y - g.center[1]) < g.radius && Math.abs(z - g.center[2]) < g.layers * 0.0191 / 2)) { i--; continue }
      if (STARCH_LENSES.some(({ center, radii }) => ((x - center[0]) / radii[0]) ** 2 + ((y - center[1]) / radii[1]) ** 2 + ((z - center[2]) / radii[2]) ** 2 < 1)) { i--; continue }
      // Ribosomes comprise a sparse, slightly larger population (25 versus 11 nm).
      dummy.position.set(x, y, z); dummy.scale.setScalar(i % 83 === 0 ? 0.025 : 0.011)
      dummy.updateMatrix(); matrices.push(dummy.matrix.clone())
    }
    return matrices
  }, [count])
  const uniforms = useMemo(() => ({ alpha: { value: opacity * 0.035 }, illumination: { value: 1 } }), [opacity])
  useEffect(() => { uniforms.illumination.value = 0.32 + Math.sqrt(Math.max(0, light) / 2000) * 0.75 }, [light, uniforms])
  useLayoutEffect(() => {
    if (!ref.current) return
    data.forEach((matrix, i) => ref.current!.setMatrixAt(i, matrix))
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [data])
  return <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false} renderOrder={2}>
    <planeGeometry args={[1, 1]} />
    <shaderMaterial uniforms={uniforms} transparent depthWrite={false} toneMapped={false}
      vertexShader={`varying vec2 vParticle; varying float vDepth;
      void main() {
        vec4 center = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        vec4 mv = modelViewMatrix * center;
        float diameter = length(instanceMatrix[0].xyz) * length(modelMatrix[0].xyz);
        mv.xy += position.xy * diameter;
        vParticle = uv * 2.0 - 1.0;
        // Floating origin is the optical target. The visible stromal slice
        // narrows continuously on approach, keeping distant proteins a mist.
        vDepth = abs(mv.z - viewMatrix[3].z) * 0.12;
        gl_Position = projectionMatrix * mv;
      }`}
      fragmentShader={`uniform float alpha; uniform float illumination; varying vec2 vParticle; varying float vDepth;
      void main() {
        float r = dot(vParticle, vParticle); if (r > 1.0) discard;
        float softness = pow(1.0-r, 1.6);
        float shade = 0.64 + 0.30 * sqrt(max(0.0, 1.0-r));
        float visibility = alpha * softness * exp(-2.0 * vDepth * vDepth);
        if (visibility < 0.0008) discard;
        gl_FragColor = vec4(vec3(0.26,0.32,0.22) * shade * illumination, visibility);
        #include <colorspace_fragment>
      }`} />
  </instancedMesh>
}

/** L3 in micrometres; the parent places this lens with an Rz(90°) transform. */
export function ChloroplastLayer({ opacity, mobile = false, light = 400, starch = 0.35, detailOnly = false }: ChloroplastLayerProps) {
  const ref = useRef<THREE.Group>(null)
  const section = useMemo(() => ({ local: new THREE.Plane(new THREE.Vector3(0, 1, 0), -GRANUM_SECTION_Y), world: new THREE.Plane() }), [])
  const clippingPlanes = useMemo(() => [section.world], [section])
  useFrame(() => {
    if (ref.current) { ref.current.updateWorldMatrix(true, false); section.world.copy(section.local).applyMatrix4(ref.current.matrixWorld) }
  })
  const morphology = useMemo(createChloroplastMorphology, [])
  // Eight equilibrium intervals keep the heavy membrane network stable while
  // physiological time updates at 5 Hz. Illumination itself remains continuous.
  const spacingLight = Math.round(Math.max(0, Math.min(500, Number.isFinite(light) ? light : 400)) / 62.5) * 62.5
  const dimensions = getThylakoidDimensions(spacingLight)
  const resources = useMemo(() => {
    const random = chloroplastRandom(22506)
    const bulk: Instance[] = [], focused: Instance[] = [], rims: Instance[] = [], focusedRims: Instance[] = [], caps: Instance[] = [], proteins: Instance[] = [], oil: Instance[] = []
    const { membrane, lumen, repeat } = getThylakoidDimensions(spacingLight)
    morphology.grana.forEach((granum, index) => {
      for (let layer = 0; layer < granum.layers; layer++) {
        const z = granum.center[2] + (layer - (granum.layers - 1) / 2) * repeat
        const radius = granum.radius * (0.985 + 0.015 * Math.sin(layer * 0.43 + granum.phase))
        for (const side of [-1, 1]) {
          const membraneZ = z + side * (lumen + membrane) / 2
          const instance: Instance = { position: new THREE.Vector3(granum.center[0], granum.center[1], membraneZ), scale: new THREE.Vector3(radius, radius, membrane), color: new THREE.Color().setHSL(0.28 + random() * 0.025, 0.10, 0.77 + random() * 0.055) }
          ;(index === 0 ? focused : bulk).push(instance)
          if (index === 0) {
            const width = 2 * Math.sqrt(radius ** 2 - (GRANUM_SECTION_Y - granum.center[1]) ** 2)
            caps.push({ position: new THREE.Vector3(granum.center[0], GRANUM_SECTION_Y + 0.00008, membraneZ), scale: new THREE.Vector3(width, 0.00032, membrane) })
            // Subtle 4–10 nm protein relief; no individual named molecular machinery yet.
            for (let p = 0; p < (mobile ? 16 : 38); p++) {
              const theta = random() * Math.PI * 2, r = Math.sqrt(random()) * radius * 0.96
              const x = granum.center[0] + Math.cos(theta) * r, y = granum.center[1] + Math.sin(theta) * r
              if (y < GRANUM_SECTION_Y) continue
              const size = 0.002 + random() * 0.003
              proteins.push({ position: new THREE.Vector3(x, y, membraneZ + side * membrane / 2), scale: new THREE.Vector3(size, size, 0.0014 + random() * 0.0012) })
            }
          }
        }
        ;(index === 0 ? focusedRims : rims).push({ position: new THREE.Vector3(...granum.center.slice(0, 2) as [number, number], z), scale: new THREE.Vector3(radius, radius, lumen + 2 * membrane) })
      }
      if (index > 0 && index % 4 === 0) {
        const radius = 0.025 + random() * 0.055
        oil.push({ position: new THREE.Vector3(granum.center[0] + Math.cos(granum.phase) * (granum.radius - radius * 0.2), granum.center[1] + Math.sin(granum.phase) * (granum.radius - radius * 0.2), granum.center[2] + (granum.layers - 1) * repeat / 2 + radius * 0.4), scale: new THREE.Vector3(radius, radius, radius) })
      }
    })
    return { bulk, focused, rims, focusedRims, caps, proteins, oil,
      lamellae: buildLamellae(morphology.grana, morphology.connections.filter(([a, b]) => a !== 0 && b !== 0), spacingLight, mobile),
      focusedLamellae: buildLamellae(morphology.grana, morphology.connections.filter(([a, b]) => a === 0 || b === 0), spacingLight, mobile),
    }
  }, [morphology, mobile, spacingLight])
  const geometry = useMemo(() => {
    const dnaGeometries: THREE.BufferGeometry[] = []
    const random = chloroplastRandom(83129)
    for (let strand = 0; strand < 16; strand++) {
      const patch = Math.floor(strand / 4), angle = patch * 2.399
      const center = new THREE.Vector3(Math.cos(angle) * 2.03, Math.sin(angle) * 1.18, -0.34 + patch * 0.16)
      const points = Array.from({ length: 33 }, (_, i) => {
        const t = i / 32 * Math.PI * 2
        return center.clone().add(new THREE.Vector3(Math.cos(t * 1.4 + strand) * (0.12 + random() * 0.02), Math.sin(t * 1.8 + strand) * 0.08, Math.sin(t * 2.1) * 0.027))
      })
      dnaGeometries.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), mobile ? 24 : 48, 0.0012, 3, false))
    }
    const dna = mergeGeometries(dnaGeometries)!
    dnaGeometries.forEach((g) => g.dispose())
    return { disk: makeMembraneDisk(mobile ? 24 : 48), focusDisk: makeMembraneDisk(mobile ? 64 : 112), rim: new THREE.CylinderGeometry(1, 1, 1, mobile ? 24 : 48, 1, true).rotateX(Math.PI / 2), sphere: new THREE.SphereGeometry(1, mobile ? 28 : 48, mobile ? 20 : 32), cap: new THREE.BoxGeometry(1, 1, 1), protein: new THREE.IcosahedronGeometry(1, 1), dna }
  }, [mobile])
  const starchInstances = useMemo(() => {
    const size = Math.cbrt(Math.max(0, Math.min(1, starch)))
    return STARCH_LENSES.map(({ center, radii, angle }) => ({ position: new THREE.Vector3(...center), scale: new THREE.Vector3(...radii).multiplyScalar(size), rotation: new THREE.Euler(0, 0, angle) }))
  }, [starch])
  useEffect(() => () => { resources.lamellae.dispose(); resources.focusedLamellae.dispose() }, [resources])
  useEffect(() => () => Object.values(geometry).forEach((g) => g.dispose()), [geometry])
  return <group ref={ref} visible={opacity > 0.001} userData={{ repeatNm: dimensions.repeat * 1000, lumenNm: dimensions.lumen * 1000, entryGranum: ENTRY_GRANUM.id }}>
    <group visible={!detailOnly}><Envelope opacity={opacity} mobile={mobile} /></group>
    <group visible={!detailOnly}><OrganicInstances instances={resources.bulk} geometry={geometry.disk} color="#2f5a24" opacity={opacity * 0.9} membrane /></group>
    <OrganicInstances instances={resources.focused} geometry={geometry.focusDisk} color="#2f5a24" opacity={opacity * 0.9} clippingPlanes={clippingPlanes} membrane />
    <group visible={!detailOnly}><OrganicInstances instances={resources.rims} geometry={geometry.rim} color="#314e2b" opacity={opacity * 0.75} membrane /></group>
    <OrganicInstances instances={resources.focusedRims} geometry={geometry.rim} color="#314e2b" opacity={opacity * 0.75} clippingPlanes={clippingPlanes} membrane />
    <OrganicInstances instances={resources.caps} geometry={geometry.cap} color="#709163" opacity={opacity} />
    <OrganicInstances instances={resources.proteins} geometry={geometry.protein} color="#34582e" opacity={opacity} />
    <group visible={!detailOnly}><mesh geometry={resources.lamellae}><meshStandardMaterial color="#36572b" side={THREE.DoubleSide} roughness={0.94} transparent opacity={opacity * 0.82} /></mesh></group>
    <mesh geometry={resources.focusedLamellae}><meshStandardMaterial color="#36572b" side={THREE.DoubleSide} roughness={0.94} transparent opacity={opacity * 0.82} clippingPlanes={clippingPlanes} /></mesh>
    <group visible={!detailOnly}><OrganicInstances instances={starchInstances} geometry={geometry.sphere} color="#b8c4bb" opacity={opacity * 0.67} roughness={0.98} /></group>
    <group visible={!detailOnly}><OrganicInstances instances={resources.oil} geometry={geometry.sphere} color="#aaa68c" opacity={opacity * 0.82} roughness={0.9} /></group>
    <group visible={!detailOnly}><StromalParticles mobile={mobile} opacity={opacity} light={light} /></group>
    <group visible={!detailOnly}><mesh geometry={geometry.dna}><meshStandardMaterial color="#a5ad91" roughness={0.96} transparent opacity={opacity * 0.28} depthWrite={false} /></mesh></group>
  </group>
}
