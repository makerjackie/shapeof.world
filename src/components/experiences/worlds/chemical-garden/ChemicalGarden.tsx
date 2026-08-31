import './styles/ChemicalGarden.css'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ArrowCounterClockwise, FilmStrip } from '@phosphor-icons/react'
import * as THREE from 'three'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { GuideTour, replayGuide, type GuideStep } from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import { useExperienceI18n } from '~/i18n/experience'
import {
  advanceGarden,
  createGardenRuntime,
  createStagedGarden,
  plantGardenSeed,
  type GardenMineral,
  type GardenRuntime,
  type Vec3,
} from './chemical-garden-model'

const WORLD_ID = 'chemical-garden'
const MAX_SIMULATION_SEGMENTS = 1800
const MAX_DESKTOP_SEGMENTS = 1800
const MAX_MOBILE_SEGMENTS = 420
const MAX_SEEDS = 12
const MAX_TIPS = 96
const LATERAL_EXAGGERATION = 2.7
const OSMOSIS_PARTICLES = 28

type ShotKey = 'opening' | 'membrane' | 'osmosis' | 'rupture' | 'tube' | 'garden' | 'free'
type CueKey = 'none' | 'membrane' | 'osmosis' | 'rupture' | 'garden'

type Shot = {
  position: [number, number, number]
  target: [number, number, number]
  mobilePosition: [number, number, number]
  mobileTarget: [number, number, number]
  fov: number
}

const SHOTS: Record<ShotKey, Shot> = {
  opening: {
    position: [4.7, 1.4, 7.4],
    target: [0.2, -1.08, 0],
    mobilePosition: [4.4, 1.45, 10.2],
    mobileTarget: [0.1, -1.05, 0],
    fov: 40,
  },
  membrane: {
    position: [1.48, -1.18, 3.18],
    target: [-0.04, -2.3, 0.02],
    mobilePosition: [1.55, -1.08, 4.35],
    mobileTarget: [-0.04, -2.28, 0.02],
    fov: 37,
  },
  osmosis: {
    position: [-1.55, -1.08, 3.22],
    target: [0.02, -2.28, 0],
    mobilePosition: [-1.62, -0.98, 4.42],
    mobileTarget: [0.02, -2.26, 0],
    fov: 37,
  },
  rupture: {
    position: [1.72, -0.72, 3.7],
    target: [0.02, -1.92, 0],
    mobilePosition: [1.82, -0.56, 5.05],
    mobileTarget: [0.02, -1.88, 0],
    fov: 38,
  },
  tube: {
    position: [4.2, 1.3, 6.8],
    target: [0, -0.78, 0],
    mobilePosition: [3.85, 1.45, 9.35],
    mobileTarget: [0, -0.75, 0],
    fov: 39,
  },
  garden: {
    position: [6, 2.4, 9.2],
    target: [0, -0.22, 0],
    mobilePosition: [5.2, 2.7, 12.2],
    mobileTarget: [0, -0.38, 0],
    fov: 42,
  },
  free: {
    position: [5.8, 2.1, 8.8],
    target: [0, -0.24, 0],
    mobilePosition: [5.05, 2.4, 11.9],
    mobileTarget: [0, -0.4, 0],
    fov: 42,
  },
}

const MINERAL_COLORS: Record<GardenMineral, string> = {
  copper: '#1aa088',
  iron: '#b46732',
  cobalt: '#7650b8',
}

const MINERALS: Array<GardenMineral> = ['copper', 'iron', 'cobalt']

const unitY = new THREE.Vector3(0, 1, 0)
const unitZ = new THREE.Vector3(0, 0, 1)
const cylinderStart = new THREE.Vector3()
const cylinderDirection = new THREE.Vector3()
const tipDirection = new THREE.Vector3()
const renderedFrom: Vec3 = { x: 0, y: 0, z: 0 }
const renderedTo: Vec3 = { x: 0, y: 0, z: 0 }

function projectGardenPoint(point: Vec3, origin: Vec3, out: Vec3) {
  out.x = origin.x + (point.x - origin.x) * LATERAL_EXAGGERATION
  out.y = point.y
  out.z = origin.z + (point.z - origin.z) * LATERAL_EXAGGERATION
  return out
}

function setCylinderTransform(
  object: THREE.Object3D,
  from: Vec3,
  to: Vec3,
  radius: number,
) {
  cylinderStart.set(from.x, from.y, from.z)
  cylinderDirection.set(to.x, to.y, to.z).sub(cylinderStart)
  const length = Math.max(0.002, cylinderDirection.length())
  cylinderDirection.multiplyScalar(1 / length)
  object.position.set(
    (from.x + to.x) * 0.5,
    (from.y + to.y) * 0.5,
    (from.z + to.z) * 0.5,
  )
  object.quaternion.setFromUnitVectors(unitY, cylinderDirection)
  // The precipitation front advances in pulses, but the mineral wall remains
  // continuous. A generous axial overlap keeps the short instanced sections
  // from reading as a stack of disconnected beads at grazing angles.
  object.scale.set(Math.max(0.01, radius), length * 1.42, Math.max(0.01, radius))
  object.updateMatrix()
}

function selectRenderSegments(runtime: GardenRuntime, maxSegments: number) {
  const source = runtime.segments
  if (source.length <= maxSegments) return source

  // The model keeps every tube so newly planted salts can still react after a
  // dense opening tableau. On compact screens we only draw a fair prefix from
  // each seed: every plant remains rooted and a new seed immediately receives
  // visible growth instead of being hidden behind the old segment budget.
  const bySeed = new Map<number, typeof source>()
  for (const seed of runtime.seeds) bySeed.set(seed.id, [])
  for (const segment of source) bySeed.get(segment.seedId)?.push(segment)

  const selected: typeof source = []
  for (let depth = 0; selected.length < maxSegments; depth += 1) {
    let addedAtDepth = false
    for (const seed of runtime.seeds) {
      const segment = bySeed.get(seed.id)?.[depth]
      if (!segment) continue
      selected.push(segment)
      addedAtDepth = true
      if (selected.length >= maxSegments) break
    }
    if (!addedAtDepth) break
  }
  return selected
}

function CameraDirector({ shotRef, reducedMotion }: {
  shotRef: MutableRefObject<ShotKey>
  reducedMotion: boolean
}) {
  const { camera, size } = useThree()
  const target = useRef(new THREE.Vector3())
  const goal = useRef(new THREE.Vector3())
  const lookGoal = useRef(new THREE.Vector3())

  useFrame(({ clock }, delta) => {
    const compact = size.width <= 720
    const shot = SHOTS[shotRef.current]
    const sourcePosition = compact ? shot.mobilePosition : shot.position
    const sourceTarget = compact ? shot.mobileTarget : shot.target
    const drift = shotRef.current === 'free' || shotRef.current === 'garden'
      ? Math.sin(clock.elapsedTime * 0.12) * 0.28
      : 0

    goal.current.set(sourcePosition[0] + drift, sourcePosition[1], sourcePosition[2])
    lookGoal.current.set(sourceTarget[0], sourceTarget[1], sourceTarget[2])
    const cameraEase = reducedMotion ? 12 : 3.7
    camera.position.lerp(goal.current, 1 - Math.exp(-cameraEase * delta))
    target.current.lerp(lookGoal.current, 1 - Math.exp(-cameraEase * delta))
    camera.lookAt(target.current)
    const perspective = camera as THREE.PerspectiveCamera
    const wantedFov = compact ? shot.fov + 7 : shot.fov
    perspective.fov += (wantedFov - perspective.fov) * (1 - Math.exp(-4 * delta))
    perspective.updateProjectionMatrix()
  })

  return null
}

function TubeInstances({ runtimeRef, maxSegments }: {
  runtimeRef: MutableRefObject<GardenRuntime>
  maxSegments: number
}) {
  const shellRefs = useRef<Array<THREE.InstancedMesh | null>>([])
  const renderedRuntimeRef = useRef<GardenRuntime | null>(null)
  const renderedSourceCountRef = useRef(-1)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  useEffect(() => {
    renderedRuntimeRef.current = null
    renderedSourceCountRef.current = -1
    for (const mesh of shellRefs.current) mesh?.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  }, [maxSegments])

  useFrame(() => {
    if (shellRefs.current.some((mesh) => !mesh)) return
    const runtime = runtimeRef.current
    const sourceCount = runtime.segments.length
    if (renderedRuntimeRef.current === runtime && renderedSourceCountRef.current === sourceCount) return
    const segments = selectRenderSegments(runtime, maxSegments)
    const count = segments.length
    const seedOrigins = new Map(runtime.seeds.map((seed) => [seed.id, seed.position]))
    const mineralCounts = [0, 0, 0]

    for (let index = 0; index < count; index += 1) {
      const segment = segments[index]
      const origin = seedOrigins.get(segment.seedId) ?? segment.from
      projectGardenPoint(segment.from, origin, renderedFrom)
      projectGardenPoint(segment.to, origin, renderedTo)
      setCylinderTransform(dummy, renderedFrom, renderedTo, segment.radius * 1.86)
      const mineralIndex = segment.mineral === 'copper' ? 0 : segment.mineral === 'iron' ? 1 : 2
      shellRefs.current[mineralIndex]?.setMatrixAt(mineralCounts[mineralIndex], dummy.matrix)
      mineralCounts[mineralIndex] += 1
    }

    for (let index = 0; index < shellRefs.current.length; index += 1) {
      const shell = shellRefs.current[index]
      if (!shell) continue
      shell.count = mineralCounts[index]
      shell.instanceMatrix.needsUpdate = true
    }
    renderedRuntimeRef.current = runtime
    renderedSourceCountRef.current = sourceCount
  })

  return (
    <group>
      {MINERALS.map((mineral, mineralIndex) => (
        <instancedMesh
          key={mineral}
          ref={(mesh) => { shellRefs.current[mineralIndex] = mesh }}
          args={[undefined, undefined, maxSegments]}
          frustumCulled={false}
        >
          <cylinderGeometry args={[1, 1, 1, 10, 1, true]} />
          <meshLambertMaterial
            color={MINERAL_COLORS[mineral]}
            emissive={MINERAL_COLORS[mineral]}
            emissiveIntensity={0.035}
          />
        </instancedMesh>
      ))}
    </group>
  )
}

function SeedLife({ runtimeRef, cueRef }: {
  runtimeRef: MutableRefObject<GardenRuntime>
  cueRef: MutableRefObject<CueKey>
}) {
  const crystalRef = useRef<THREE.InstancedMesh>(null)
  const membraneRef = useRef<THREE.InstancedMesh>(null)
  const membraneHaloRef = useRef<THREE.InstancedMesh>(null)
  const tipRef = useRef<THREE.InstancedMesh>(null)
  const plumeRef = useRef<THREE.InstancedMesh>(null)
  const waterRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const color = useMemo(() => new THREE.Color(), [])
  const detailColor = useMemo(() => new THREE.Color(), [])
  const white = useMemo(() => new THREE.Color('#dffef7'), [])

  useEffect(() => {
    for (const mesh of [crystalRef.current, membraneRef.current, membraneHaloRef.current, tipRef.current, plumeRef.current, waterRef.current]) {
      mesh?.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    }
  }, [])

  useFrame(({ clock }) => {
    const crystals = crystalRef.current
    const membranes = membraneRef.current
    const membraneHalos = membraneHaloRef.current
    const tips = tipRef.current
    const plumes = plumeRef.current
    const water = waterRef.current
    if (!crystals || !membranes || !membraneHalos || !tips || !plumes || !water) return

    const seeds = runtimeRef.current.seeds
    const count = Math.min(MAX_SEEDS, seeds.length)
    for (let index = 0; index < count; index += 1) {
      const seed = seeds[index]
      color.set(MINERAL_COLORS[seed.mineral])

      dummy.position.set(seed.position.x, seed.position.y, seed.position.z)
      dummy.quaternion.setFromEuler(new THREE.Euler(
        clock.elapsedTime * 0.18 + index,
        index * 1.7,
        clock.elapsedTime * 0.11,
      ))
      const remainingFraction = THREE.MathUtils.clamp(seed.soluteRemaining / Math.max(0.001, seed.soluteInitial), 0, 1)
      const crystalSize = seed.stage === 'falling'
        ? 0.2
        : remainingFraction <= 0.002
          ? 0.001
          : 0.16 * Math.cbrt(remainingFraction)
      dummy.scale.setScalar(crystalSize)
      dummy.updateMatrix()
      crystals.setMatrixAt(index, dummy.matrix)
      crystals.setColorAt(index, color)

      const closeCue = cueRef.current === 'membrane' || cueRef.current === 'osmosis' || cueRef.current === 'rupture'
      const cueScale = closeCue && index === 0 ? 1.28 : 1
      const membrane = (0.045 + seed.membraneProgress * 0.085 + seed.osmoticPressure * 0.014) * cueScale
      dummy.position.set(seed.position.x, seed.position.y, seed.position.z)
      dummy.quaternion.identity()
      dummy.scale.setScalar(Math.max(0.001, membrane))
      dummy.updateMatrix()
      membranes.setMatrixAt(index, dummy.matrix)
      detailColor.copy(color).lerp(white, 0.34)
      membranes.setColorAt(index, detailColor)

      dummy.scale.setScalar(Math.max(0.001, membrane * 1.1))
      dummy.updateMatrix()
      membraneHalos.setMatrixAt(index, dummy.matrix)
      membraneHalos.setColorAt(index, detailColor)

    }

    crystals.count = count
    membranes.count = count
    membraneHalos.count = count
    for (const mesh of [crystals, membranes, membraneHalos]) {
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }

    let tipCount = 0
    const showOpenRims = cueRef.current === 'rupture'
    if (showOpenRims) {
      for (let seedIndex = 0; seedIndex < count && tipCount < MAX_TIPS; seedIndex += 1) {
        const seed = seeds[seedIndex]
        color.set(MINERAL_COLORS[seed.mineral])
        const storyRupture = cueRef.current === 'rupture' && seedIndex === 0
        const rupture = cueRef.current === 'rupture'
          ? Math.max(
              0,
              seed.rupturePulse,
              storyRupture ? 0.76 + Math.sin(clock.elapsedTime * 4.2) * 0.12 : 0,
            )
          : 0
        const sourceTips = seed.tips.length > 0
          ? seed.tips
          : [{ position: seed.tip, direction: { x: 0, y: 1, z: 0 }, radius: 0.055, active: true }]
        const visibleTips = cueRef.current === 'rupture'
          ? [...sourceTips].filter((tip) => tip.active).sort((a, b) => b.direction.y - a.direction.y).slice(0, 1)
          : sourceTips
        for (const tip of visibleTips) {
          if (!tip.active || tipCount >= MAX_TIPS) continue
          const tipPulse = Math.max(0.04, tip.radius * 1.62) + rupture * 0.012
          projectGardenPoint(tip.position, seed.position, renderedTo)
          dummy.position.set(renderedTo.x, renderedTo.y, renderedTo.z)
          tipDirection.set(
            tip.direction.x * LATERAL_EXAGGERATION,
            tip.direction.y,
            tip.direction.z * LATERAL_EXAGGERATION,
          ).normalize()
          dummy.quaternion.setFromUnitVectors(unitZ, tipDirection)
          dummy.scale.setScalar(tipPulse)
          dummy.updateMatrix()
          tips.setMatrixAt(tipCount, dummy.matrix)
          detailColor.copy(color).lerp(white, 0.38)
          tips.setColorAt(tipCount, detailColor)

          const plumeHeight = 0.18 + rupture * 0.72
          dummy.position.set(
            renderedTo.x + tipDirection.x * plumeHeight * 0.5,
            renderedTo.y + tipDirection.y * plumeHeight * 0.5,
            renderedTo.z + tipDirection.z * plumeHeight * 0.5,
          )
          dummy.quaternion.setFromUnitVectors(unitY, tipDirection)
          dummy.scale.set(
            rupture > 0.02 ? 0.036 + rupture * 0.018 : 0.001,
            rupture > 0.02 ? plumeHeight : 0.001,
            rupture > 0.02 ? 0.036 + rupture * 0.018 : 0.001,
          )
          dummy.updateMatrix()
          plumes.setMatrixAt(tipCount, dummy.matrix)
          detailColor.copy(color).lerp(white, 0.48)
          plumes.setColorAt(tipCount, detailColor)
          tipCount += 1
        }
      }
    }
    tips.count = tipCount
    plumes.count = tipCount
    for (const mesh of [tips, plumes]) {
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }

    const featured = seeds[0]
    const showOsmosis = cueRef.current === 'osmosis' && featured
    const dropCount = showOsmosis ? OSMOSIS_PARTICLES : 0
    if (featured) {
      for (let index = 0; index < dropCount; index += 1) {
        const phase = (clock.elapsedTime * 0.34 + index / dropCount) % 1
        const angle = index * 2.399 + clock.elapsedTime * 0.18
        const radius = 0.92 * (1 - phase) + 0.22
        dummy.position.set(
          featured.position.x + Math.cos(angle) * radius,
          featured.position.y + Math.sin(angle * 1.7) * radius * 0.42,
          featured.position.z + Math.sin(angle) * radius,
        )
        dummy.quaternion.identity()
        dummy.scale.setScalar(0.035 + phase * 0.025)
        dummy.updateMatrix()
        water.setMatrixAt(index, dummy.matrix)
        water.setColorAt(index, white)
      }
    }
    water.count = dropCount
    water.instanceMatrix.needsUpdate = true
    if (water.instanceColor) water.instanceColor.needsUpdate = true
  })

  return (
    <group>
      <instancedMesh ref={crystalRef} args={[undefined, undefined, MAX_SEEDS]} frustumCulled={false}>
        <octahedronGeometry args={[1, 1]} />
        <meshStandardMaterial vertexColors roughness={0.24} metalness={0.08} emissive="#1b5749" emissiveIntensity={0.92} />
      </instancedMesh>
      <instancedMesh ref={membraneRef} args={[undefined, undefined, MAX_SEEDS]} frustumCulled={false}>
        <sphereGeometry args={[1, 22, 16]} />
        <meshStandardMaterial
          color="#21b597"
          transparent
          opacity={0.32}
          depthWrite={false}
          roughness={0.24}
          emissive="#147b68"
          emissiveIntensity={0.72}
          side={THREE.DoubleSide}
        />
      </instancedMesh>
      <instancedMesh ref={membraneHaloRef} args={[undefined, undefined, MAX_SEEDS]} frustumCulled={false}>
        <sphereGeometry args={[1, 18, 12]} />
        <meshBasicMaterial
          color="#8affdf"
          transparent
          opacity={0.13}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </instancedMesh>
      <instancedMesh ref={tipRef} args={[undefined, undefined, MAX_TIPS]} frustumCulled={false}>
        <torusGeometry args={[1, 0.16, 7, 18]} />
        <meshBasicMaterial
          color="#b6ffef"
          transparent
          opacity={0.92}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </instancedMesh>
      <instancedMesh ref={plumeRef} args={[undefined, undefined, MAX_TIPS]} frustumCulled={false}>
        <cylinderGeometry args={[0.35, 1, 1, 10, 1, true]} />
        <meshBasicMaterial color="#63f4d2" transparent opacity={0.34} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={waterRef} args={[undefined, undefined, OSMOSIS_PARTICLES]} frustumCulled={false}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshBasicMaterial color="#d8fff6" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </instancedMesh>
    </group>
  )
}

function GlassTank({ compact }: { compact: boolean }) {
  const edges = useMemo(() => {
    const box = new THREE.BoxGeometry(7.25, 6.9, 4.5)
    const geometry = new THREE.EdgesGeometry(box, 24)
    box.dispose()
    return geometry
  }, [])
  useEffect(() => () => edges.dispose(), [edges])

  return (
    <group position={[0, 0.95, 0]}>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#bdebe0" transparent opacity={compact ? 0.025 : 0.035} />
      </lineSegments>
      <mesh position={[0, 0, 2.24]}>
        <planeGeometry args={[7.22, 6.86]} />
        <meshBasicMaterial
          color="#8cd8cf"
          transparent
          opacity={0.008}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, -3.42, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7.1, 4.35]} />
        <meshBasicMaterial color="#06110e" />
      </mesh>
    </group>
  )
}

function GalleryStage({
  runtimeRef,
  shotRef,
  cueRef,
  reducedMotion,
}: {
  runtimeRef: MutableRefObject<GardenRuntime>
  shotRef: MutableRefObject<ShotKey>
  cueRef: MutableRefObject<CueKey>
  reducedMotion: boolean
}) {
  const { size } = useThree()
  const compact = size.width <= 720
  const maxSegments = compact ? MAX_MOBILE_SEGMENTS : MAX_DESKTOP_SEGMENTS

  useFrame((_, delta) => {
    const cuePace = cueRef.current === 'membrane'
      ? 0.05
      : cueRef.current === 'osmosis'
        ? 0.08
        : 1
    const pace = cuePace * (reducedMotion ? 0.36 : 1)
    advanceGarden(runtimeRef.current, Math.min(delta, 1 / 20) * pace, { maxSegments: MAX_SIMULATION_SEGMENTS })
  })

  return (
    <>
      <CameraDirector shotRef={shotRef} reducedMotion={reducedMotion} />
      <color attach="background" args={['#020706']} />
      <ambientLight color="#91b8ad" intensity={1.05} />
      <directionalLight color="#d5fff2" intensity={2.8} position={[-5.5, 8, 6]} />
      <directionalLight color="#8c75d9" intensity={0.8} position={[5, 2, 4]} />

      <GlassTank compact={compact} />
      <TubeInstances runtimeRef={runtimeRef} maxSegments={maxSegments} />
      <SeedLife runtimeRef={runtimeRef} cueRef={cueRef} />

    </>
  )
}

function GardenFallback({ label }: { label: string }) {
  return (
    <div className="chemical-garden-fallback" role="img" aria-label={label}>
      <span className="chemical-garden-fallback-seed" />
      {Array.from({ length: 11 }, (_, index) => (
        <i
          key={index}
          style={{
            '--branch-angle': `${(index - 5) * 11}deg`,
            '--branch-height': `${16 + (index % 4) * 5}%`,
            '--branch-offset': `${(index - 5) * 5}px`,
          } as CSSProperties}
        />
      ))}
      <span className="chemical-garden-sr-only">{label}</span>
    </div>
  )
}

export function ChemicalGarden({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const reducedMotion = false
  const { storyMode, enterFree, enterStory } = useStoryFreeMode(WORLD_ID)
  const [mineral, setMineral] = useState<GardenMineral>('copper')
  const initialRuntime = useMemo(
    () => (storyMode ? createStagedGarden('spectacle', 8147) : createStagedGarden('garden', 8147)),
    // The initial scene is chosen once; GuideTour actions own later resets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const runtimeRef = useRef<GardenRuntime>(initialRuntime)
  const shotRef = useRef<ShotKey>(storyMode ? 'opening' : 'free')
  const cueRef = useRef<CueKey>(storyMode ? 'none' : 'garden')

  const mineralLabel = (item: GardenMineral) => {
    if (item === 'copper') return tx('铜盐')
    if (item === 'iron') return tx('铁盐')
    return tx('钴盐')
  }

  const stageStory = useCallback((preset: 'spectacle' | 'membrane' | 'rupture' | 'tube' | 'garden', shot: ShotKey, cue: CueKey) => {
    const runtime = createStagedGarden(preset, 8147)
    if (shot === 'opening') plantGardenSeed(runtime, 'copper', 0.25, 0.22)
    if (cue === 'osmosis') {
      for (let step = 0; step < 90 && runtime.seeds[0]?.stage === 'membrane'; step += 1) {
        advanceGarden(runtime, 1 / 60, { maxSegments: MAX_SIMULATION_SEGMENTS })
      }
      for (let step = 0; step < 22 && runtime.seeds[0]?.stage === 'pressurizing'; step += 1) {
        advanceGarden(runtime, 1 / 60, { maxSegments: MAX_SIMULATION_SEGMENTS })
      }
    }
    runtimeRef.current = runtime
    shotRef.current = shot
    cueRef.current = cue
  }, [])

  const plantAt = useCallback((x: number, z: number) => {
    if (runtimeRef.current.seeds.length >= MAX_SEEDS) return
    plantGardenSeed(runtimeRef.current, mineral, x, z)
    shotRef.current = 'free'
    cueRef.current = 'garden'
    controls.registerInteraction()
  }, [controls, mineral])

  const plantFromPointer = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (storyMode || event.button !== 0) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const nx = THREE.MathUtils.clamp((event.clientX - bounds.left) / Math.max(1, bounds.width), 0, 1)
    const ny = THREE.MathUtils.clamp((event.clientY - bounds.top) / Math.max(1, bounds.height), 0, 1)
    plantAt((nx - 0.5) * 5, (ny - 0.5) * 1.35)
  }, [plantAt, storyMode])

  const plantFromKeyboard = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (storyMode || (event.key !== 'Enter' && event.key !== ' ')) return
    event.preventDefault()
    plantAt(0, 0)
  }, [plantAt, storyMode])

  const guideSteps: Array<GuideStep> = [
    {
      title: tx('一粒金属盐，突然开花'),
      body: tx('它没有种子，也没有细胞。金属盐粒落进硅酸盐溶液后，彩色矿物管却会一截一截地向上生长，像一株醒来的水下珊瑚。'),
      durationMs: 6800,
      action: () => stageStory('spectacle', 'opening', 'none'),
    },
    {
      title: tx('它先给自己长出一层皮'),
      body: tx('金属离子一碰到硅酸根，就在金属盐粒表面沉淀成一层薄膜。它把浓溶液包在里面，却仍允许水慢慢穿过。'),
      durationMs: 6600,
      action: () => stageStory('membrane', 'membrane', 'membrane'),
    },
    {
      title: tx('水穿过膜，压力在里面上涨'),
      body: tx('膜内的溶液更浓，水会因渗透作用不断进入。体积想变大，薄膜却拦着它——内压于是像一次缓慢的吸气般积累。'),
      durationMs: 7000,
      action: () => stageStory('membrane', 'osmosis', 'osmosis'),
    },
    {
      title: tx('膜一破，喷流把管子向上顶'),
      body: tx('压力超过薄膜能承受的限度，浓溶液从裂口喷出；这里，较轻的内部溶液受浮力偏向上升，而喷流与外液接触的界面继续沉淀，留下空心的矿物管。'),
      durationMs: 7400,
      action: () => stageStory('rupture', 'rupture', 'rupture'),
    },
    {
      title: tx('无生命的盐，长成一座花园'),
      body: tx('在一些条件下，膜会重新封住、压力再次积累，让破裂与生长呈现脉冲式重复。海底热液喷口也会由沉淀和流动共同筑出矿物烟囱；这种相似只是一条线索，并不能证明生命如何起源。'),
      durationMs: 8200,
      action: () => stageStory('garden', 'garden', 'garden'),
    },
  ]

  return (
    <div className={`oss-experience chemical-garden-experience${storyMode ? ' is-story' : ' is-free'}`}>
      <div
        className="chemical-garden-stage"
        role={storyMode ? undefined : 'button'}
        tabIndex={storyMode ? -1 : 0}
        aria-label={storyMode ? undefined : tx('点击水中任意位置，种下一粒金属盐')}
        onPointerDown={plantFromPointer}
        onKeyDown={plantFromKeyboard}
      >
        <Canvas
          dpr={1}
          camera={{ position: [6, 3, 10], fov: 43, near: 0.05, far: 80 }}
          gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
          fallback={<GardenFallback label={tx('一座正在水中生长的彩色矿物花园')} />}
          onCreated={({ gl }) => {
            gl.outputColorSpace = THREE.SRGBColorSpace
            gl.toneMapping = THREE.ACESFilmicToneMapping
            gl.toneMappingExposure = 1.08
          }}
        >
          <GalleryStage
            runtimeRef={runtimeRef}
            shotRef={shotRef}
            cueRef={cueRef}
            reducedMotion={reducedMotion}
          />
        </Canvas>
      </div>

      <div className="chemical-garden-vignette" aria-hidden="true" />
      <div className="chemical-garden-caustics" aria-hidden="true" />

      {!storyMode && (
        <header className="chemical-garden-plate" data-experience-overlay="true">
          <span>{tx('化学花园')}</span>
          <strong>{tx('一粒金属盐，长成一座花园')}</strong>
          <p>{tx('点一下水中，让新的矿物枝脉从黑暗里长出来。')}</p>
        </header>
      )}

      {!storyMode && (
        <Freebar
          className="chemical-garden-freebar"
          ariaLabel={tx('化学花园自由探索控制')}
          primaryControlBudget={3}
          mobileDensity="comfortable"
          secondaryDefault="auto"
          secondary={(
            <div className="chemical-garden-tools experience-freebar-chips" role="group" aria-label={tx('花园工具')}>
              <button
                type="button"
                className="experience-freebar-reset"
                onClick={() => {
                  controls.registerInteraction()
                  runtimeRef.current = createGardenRuntime(8147)
                  shotRef.current = 'free'
                  cueRef.current = 'none'
                }}
                aria-label={tx('重置')}
              >
                <ArrowCounterClockwise weight="bold" aria-hidden="true" />
                <span>{tx('重置')}</span>
              </button>
              <button
                type="button"
                className="experience-freebar-story"
                onClick={() => {
                  controls.registerInteraction()
                  enterStory()
                  stageStory('spectacle', 'opening', 'none')
                  replayGuide(WORLD_ID)
                }}
                aria-label={tx('重播故事')}
              >
                <FilmStrip weight="fill" aria-hidden="true" />
                <span>{tx('故事')}</span>
              </button>
            </div>
          )}
        >
          <div className="chemical-garden-salts experience-freebar-seg" role="group" aria-label={tx('选择金属盐')}>
            {MINERALS.map((item) => (
              <button
                key={item}
                type="button"
                className={mineral === item ? 'is-active' : undefined}
                aria-pressed={mineral === item}
                onClick={() => {
                  controls.registerInteraction()
                  setMineral(item)
                }}
              >
                <i style={{ '--salt-color': MINERAL_COLORS[item] } as CSSProperties} aria-hidden="true" />
                <span>{mineralLabel(item)}</span>
              </button>
            ))}
          </div>
        </Freebar>
      )}

      <GuideTour
        worldId={WORLD_ID}
        steps={guideSteps}
        placement="stage"
        stagePlan={[
          { position: 'top-left', mobilePosition: 'top-left', width: 'normal', treatment: 'editorial', motion: 'rise' },
          { position: 'top-right', mobilePosition: 'bottom-right', width: 'normal', treatment: 'annotation', motion: 'drift-left', cue: 'down' },
          { position: 'center-right', mobilePosition: 'top-left', width: 'normal', treatment: 'editorial', motion: 'fade', cue: 'left' },
          { position: 'bottom-left', mobilePosition: 'bottom-left', width: 'normal', treatment: 'annotation', motion: 'rise', cue: 'up' },
          { position: 'top-right', mobilePosition: 'top-right', width: 'wide', treatment: 'caption', motion: 'drift-right' },
        ]}
        defaultOpen={storyMode}
        showReplayChip={false}
        onExit={() => {
          runtimeRef.current = createStagedGarden('garden', 8147)
          shotRef.current = 'free'
          cueRef.current = 'garden'
          enterFree()
        }}
      />

      {!storyMode && (
        <GhostHint
          worldId={WORLD_ID}
          gesture={{ type: 'tap', target: '.chemical-garden-stage', label: tx('点一下水中，种下一粒金属盐') }}
        />
      )}
    </div>
  )
}
