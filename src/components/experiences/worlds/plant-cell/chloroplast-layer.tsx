import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { CHLOROPLAST_RADII, GRANUM_REPEAT_UM, chloroplastRandom, createChloroplastMorphology, type Granum } from './chloro-model'

interface ChloroplastLayerProps {
  opacity: number
  mobile?: boolean
}

type Instance = { position: THREE.Vector3; scale: THREE.Vector3; rotation?: THREE.Euler; color?: THREE.Color }

/** A small, reusable instanced batch; instance transforms also work under the floating-origin parent. */
function OrganicInstances({ instances, geometry, color, opacity, roughness = 0.88 }: {
  instances: Instance[]
  geometry: THREE.BufferGeometry
  color: string
  opacity: number
  roughness?: number
}) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    instances.forEach((instance, index) => {
      dummy.position.copy(instance.position)
      dummy.scale.copy(instance.scale)
      dummy.rotation.copy(instance.rotation ?? new THREE.Euler())
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
      if (instance.color) mesh.setColorAt(index, instance.color)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [instances])
  return (
    <instancedMesh ref={ref} args={[geometry, undefined, instances.length]} frustumCulled={false}>
      <meshStandardMaterial color={color} roughness={roughness} metalness={0} transparent={opacity < 0.999} opacity={opacity} depthWrite={opacity > 0.94}
        customProgramCacheKey={() => 'plant-cell-organelle-grain-v1'}
        onBeforeCompile={(shader) => {
          shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vOrganellePosition;')
            .replace('#include <begin_vertex>', `#include <begin_vertex>
              vOrganellePosition = position;
              #ifdef USE_INSTANCING
                vOrganellePosition += instanceMatrix[3].xyz * 0.13;
              #endif`)
          shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vOrganellePosition;')
            .replace('#include <color_fragment>', `#include <color_fragment>
              float materialGrain = fract(sin(dot(floor(vOrganellePosition * 73.0), vec3(12.9898, 78.233, 43.317))) * 43758.5453);
              diffuseColor.rgb *= 0.91 + 0.14 * materialGrain;`)
        }} />
    </instancedMesh>
  )
}

function makeRibbon(points: THREE.Vector3[], width: number) {
  const positions: number[] = []
  const indices: number[] = []
  const tangent = new THREE.Vector3()
  const across = new THREE.Vector3()
  const axis = new THREE.Vector3(0, 0, 1)
  points.forEach((point, index) => {
    tangent.subVectors(points[Math.min(index + 1, points.length - 1)], points[Math.max(0, index - 1)]).normalize()
    across.crossVectors(tangent, axis).normalize().multiplyScalar(width / 2)
    positions.push(point.x + across.x, point.y + across.y, point.z + across.z)
    positions.push(point.x - across.x, point.y - across.y, point.z - across.z)
    if (index < points.length - 1) {
      const start = index * 2
      indices.push(start, start + 1, start + 2, start + 1, start + 3, start + 2)
    }
  })
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function buildLamellae(grana: Granum[], connections: [number, number][], mobile: boolean) {
  const ribbons: THREE.BufferGeometry[] = []
  for (const granum of grana) {
    const height = granum.layers * GRANUM_REPEAT_UM
    // Positive z advance with counter-clockwise azimuth is a right-handed helix.
    // Bussi 2019 also describes left-handed junction surfaces (below). This is
    // a schematic statistical arrangement, not a reconstruction of cryo-ET data.
    const turns = Math.max(1.25, granum.layers / 7)
    const steps = Math.ceil(turns * (mobile ? 14 : 24))
    const points = Array.from({ length: steps + 1 }, (_, index) => {
      const t = index / steps
      const angle = granum.phase + t * turns * Math.PI * 2
      const radius = granum.radius + 0.008
      return new THREE.Vector3(granum.center[0] + Math.cos(angle) * radius, granum.center[1] + Math.sin(angle) * radius, granum.center[2] + (t - 0.5) * height)
    })
    ribbons.push(makeRibbon(points, 0.035))
  }
  for (const [fromIndex, toIndex] of connections) {
    const from = grana[fromIndex]
    const to = grana[toIndex]
    const direction = new THREE.Vector3().fromArray(to.center).sub(new THREE.Vector3().fromArray(from.center)).normalize()
    for (let sheet = 0; sheet < 2; sheet++) {
      const zShift = (sheet - 0.5) * 0.075
      const start = new THREE.Vector3().fromArray(from.center).addScaledVector(direction, from.radius * 0.9)
      const end = new THREE.Vector3().fromArray(to.center).addScaledVector(direction, -to.radius * 0.9)
      start.z += zShift
      end.z += zShift
      const middle = start.clone().lerp(end, 0.5)
      middle.z += 0.045 * Math.sin(from.phase + sheet)
      const curve = new THREE.QuadraticBezierCurve3(start, middle, end)
      ribbons.push(makeRibbon(curve.getPoints(mobile ? 5 : 10), 0.07 + (fromIndex % 3) * 0.016))
    }
    if (fromIndex % 8 === 0) {
      // A few left-handed junctions balance the local right-handed granum wraps.
      const middle = new THREE.Vector3().fromArray(from.center).lerp(new THREE.Vector3().fromArray(to.center), 0.5)
      const points = Array.from({ length: 33 }, (_, index) => {
        const t = index / 32
        const angle = t * Math.PI * 2
        return middle.clone().add(new THREE.Vector3(Math.cos(angle) * 0.095, Math.sin(angle) * 0.095, (0.5 - t) * 0.09))
      })
      ribbons.push(makeRibbon(points, 0.05))
    }
  }
  const combined = mergeGeometries(ribbons)!
  ribbons.forEach((geometry) => geometry.dispose())
  return combined
}

function Envelope({ opacity, mobile }: { opacity: number; mobile: boolean }) {
  const membrane = useMemo(() => {
    const material = new THREE.MeshStandardMaterial({ color: '#759650', roughness: 0.94, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false })
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <alphatest_fragment>', `
        float membraneEdge = pow(clamp(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 0.0, 1.0), 2.8);
        diffuseColor.a *= mix(0.055, 1.0, membraneEdge);
        #include <alphatest_fragment>
      `)
    }
    return material
  }, [])
  useEffect(() => { membrane.opacity = 0.42 * opacity }, [membrane, opacity])
  useEffect(() => () => membrane.dispose(), [membrane])
  const rim = useMemo(() => {
    const points = Array.from({ length: 97 }, (_, index) => {
      const a = index / 96 * Math.PI * 2
      return new THREE.Vector3(Math.cos(a) * CHLOROPLAST_RADII[0], Math.sin(a) * CHLOROPLAST_RADII[1], 0)
    })
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), mobile ? 64 : 128, 0.008, 4, true)
  }, [mobile])
  useEffect(() => () => rim.dispose(), [rim])
  return (
    <group>
      {[0, 0.02].map((inset) => (
        <mesh key={inset} scale={CHLOROPLAST_RADII.map((radius) => radius - inset) as [number, number, number]} material={membrane} renderOrder={3}>
          <sphereGeometry args={[1, mobile ? 40 : 72, mobile ? 24 : 40, Math.PI, Math.PI]} />
        </mesh>
      ))}
      <mesh geometry={rim} renderOrder={4}>
        <meshStandardMaterial color="#b6c98c" roughness={0.8} transparent opacity={opacity * 0.72} depthWrite={false} />
      </mesh>
      <mesh geometry={rim} scale={[2.98 / 3, 1.88 / 1.9, 1]} renderOrder={4}>
        <meshStandardMaterial color="#769b63" roughness={0.9} transparent opacity={opacity * 0.65} depthWrite={false} />
      </mesh>
    </group>
  )
}

/** L3, in micrometres. The parent owns placement, camera scale, illumination and time. */
export function ChloroplastLayer({ opacity, mobile = false }: ChloroplastLayerProps) {
  const morphology = useMemo(createChloroplastMorphology, [])
  const resources = useMemo(() => {
    const random = chloroplastRandom(22506)
    const disks: Instance[] = []
    const oil: Instance[] = []
    morphology.grana.forEach((granum, index) => {
      for (let layer = 0; layer < granum.layers; layer++) {
        const centerZ = granum.center[2] + (layer - (granum.layers - 1) / 2) * GRANUM_REPEAT_UM
        const radius = granum.radius * (0.95 + 0.05 * Math.sin(layer * 0.7 + granum.phase))
        disks.push({
          position: new THREE.Vector3(granum.center[0], granum.center[1], centerZ),
          scale: new THREE.Vector3(radius, 0.0125, radius),
          rotation: new THREE.Euler(Math.PI / 2, 0, granum.phase),
          color: new THREE.Color().setHSL(0.235 + random() * 0.027, 0.28 + random() * 0.12, 0.20 + random() * 0.07),
        })
      }
      if (index % 2 === 0) {
        const radius = 0.025 + random() * 0.065
        oil.push({ position: new THREE.Vector3(granum.center[0] + Math.cos(granum.phase) * granum.radius, granum.center[1] + Math.sin(granum.phase) * granum.radius, granum.center[2] + granum.layers * GRANUM_REPEAT_UM / 2 + radius), scale: new THREE.Vector3(radius, radius, radius) })
      }
    })
    const particles: Instance[] = []
    const count = mobile ? 1200 : 3900
    for (let i = 0; i < count; i++) {
      const x = (random() * 2 - 1) * 2.87
      const y = (random() * 2 - 1) * 1.78
      const z = (random() * 2 - 1) * 0.98
      if ((x / 2.87) ** 2 + (y / 1.78) ** 2 + (z / 0.98) ** 2 > 1) { i--; continue }
      const radius = 0.004 + random() * 0.0035
      particles.push({ position: new THREE.Vector3(x, y, z), scale: new THREE.Vector3(radius, radius, radius), color: new THREE.Color().setHSL(0.21, 0.1 + random() * 0.1, 0.32 + random() * 0.16) })
    }
    const starch: Instance[] = [
      { position: new THREE.Vector3(-1.25, -0.53, 0.16), scale: new THREE.Vector3(0.58, 0.31, 0.20), rotation: new THREE.Euler(0.08, -0.25, 0.45) },
      { position: new THREE.Vector3(0.98, 0.7, -0.23), scale: new THREE.Vector3(0.40, 0.26, 0.16), rotation: new THREE.Euler(0.15, 0.4, -0.65) },
      { position: new THREE.Vector3(1.65, -0.55, 0.12), scale: new THREE.Vector3(0.27, 0.16, 0.11), rotation: new THREE.Euler(0.2, -0.18, 0.2) },
    ]
    const dnaGeometries: THREE.BufferGeometry[] = []
    for (let strand = 0; strand < 6; strand++) {
      const angle = strand * 2.399
      const center = new THREE.Vector3(Math.cos(angle) * 2.0, Math.sin(angle) * 1.15, -0.35 + (strand % 3) * 0.3)
      const points = Array.from({ length: 49 }, (_, i) => {
        const t = i / 48 * Math.PI * 2
        return center.clone().add(new THREE.Vector3(Math.cos(t) * (0.12 + 0.04 * Math.sin(t * 3 + strand)), Math.sin(t) * 0.08, Math.sin(t * 2 + strand) * 0.028))
      })
      dnaGeometries.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), mobile ? 24 : 48, 0.0035, 3, true))
    }
    const dna = mergeGeometries(dnaGeometries)!
    dnaGeometries.forEach((geometry) => geometry.dispose())
    return {
      disks, oil, particles, starch,
      diskGeometry: new THREE.LatheGeometry(
        [[0, -0.5], [0.88, -0.5], [0.98, -0.42], [1, -0.12], [1, 0.12], [0.98, 0.42], [0.88, 0.5], [0, 0.5]].map(([r, height]) => new THREE.Vector2(r, height)),
        mobile ? 16 : 28,
      ),
      organicGeometry: new THREE.SphereGeometry(1, mobile ? 12 : 20, mobile ? 8 : 12),
      particleGeometry: new THREE.IcosahedronGeometry(1, 0),
      lamellae: buildLamellae(morphology.grana, morphology.connections, mobile),
      dna,
    }
  }, [morphology, mobile])
  useEffect(() => () => {
    resources.diskGeometry.dispose()
    resources.organicGeometry.dispose()
    resources.particleGeometry.dispose()
    resources.lamellae.dispose()
    resources.dna.dispose()
  }, [resources])
  return (
    <group visible={opacity > 0.001}>
      <Envelope opacity={opacity} mobile={mobile} />
      <OrganicInstances instances={resources.disks} geometry={resources.diskGeometry} color="#d7dec4" opacity={opacity} />
      <mesh geometry={resources.lamellae}>
        <meshStandardMaterial color="#435b32" side={THREE.DoubleSide} roughness={0.94} transparent={opacity < 0.999} opacity={opacity} depthWrite={opacity > 0.94} />
      </mesh>
      <OrganicInstances instances={resources.starch} geometry={resources.organicGeometry} color="#d3cbb0" opacity={opacity} roughness={0.98} />
      <OrganicInstances instances={resources.oil} geometry={resources.organicGeometry} color="#ae8a3c" opacity={opacity} roughness={0.69} />
      <OrganicInstances instances={resources.particles} geometry={resources.particleGeometry} color="#ced2b4" opacity={opacity * 0.60} />
      <mesh geometry={resources.dna}>
        <meshStandardMaterial color="#b7b6a0" roughness={0.95} transparent opacity={opacity * 0.7} depthWrite={false} />
      </mesh>
    </group>
  )
}
