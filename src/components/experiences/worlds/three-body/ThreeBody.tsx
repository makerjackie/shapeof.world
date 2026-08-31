import './styles/ThreeBody.css'

import { useEffect, useMemo, useRef, useState, type ComponentRef, type MutableRefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, Stars } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import * as THREE from 'three'
import { ArrowCounterClockwise, CaretLeft, Pause, Play, Question, X, FilmStrip } from '@phosphor-icons/react'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { GhostHint } from '~/components/experiences/GhostHint'
import { GuideTour, replayGuide, type GuideStep } from '~/components/experiences/GuideTour'
import { useStoryFreeMode } from '~/components/experiences/useStoryFreeMode'
import { useExperienceI18n } from '~/i18n/experience'
import { useI18n } from '~/i18n/index'

import {
  CHAOS_EPSILON,
  PERIODIC_EPSILON,
  STAR_COLORS,
  accelerations,
  clamp,
  makeSim,
  maxAbsZ,
  minPair,
  simulate,
  trailPairConnected,
  worldPosition,
  type Point,
  type Sim,
} from './three-body-model'
import {
  DEFAULT_FAMILY,
  DEFAULT_ORBIT_ID,
  DEFAULT_SPATIAL_MASS,
  PAGE_SIZE,
  SPATIAL_MASSES,
  UNEQUAL_MASSES,
  displayName,
  getOrbit,
  listOrbits,
  starsForOrbit,
  type OrbitFamily,
  type PeriodicOrbit,
} from './three-body-orbits'

const WORLD = 1.35
const HANDLE = 0.72
const TRAIL_SHORT = 420
const TRAIL_KEEP = 12000
const SPEED_OPTIONS = [1, 2, 4] as const
type Speed = (typeof SPEED_OPTIONS)[number]
const WORLD_ID = 'three-body'
const CELL = 4.35

type View = 'atlas' | 'watch' | 'perturb'
type Scene = 'wall' | 'dance' | 'flower' | 'break' | 'free'

let haloTexture: THREE.CanvasTexture | null = null

function getHaloTexture() {
  if (haloTexture) return haloTexture
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')!
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)')
  gradient.addColorStop(0.16, 'rgba(255, 255, 255, 0.5)')
  gradient.addColorStop(0.45, 'rgba(255, 255, 255, 0.13)')
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, size, size)
  haloTexture = new THREE.CanvasTexture(canvas)
  return haloTexture
}

type LiveSystem = { id: string; label: string; sim: Sim }

type LoopState = {
  playing: boolean
  view: View
  systems: Array<LiveSystem>
  hudAt: number
  dragging: null | 'pos' | 'vel'
  speed: number
  keepTrail: boolean
  showAxes: boolean
}

type HudSample = { t: number; minD: number; escaped: number | null; maxAbsZ: number }

type TrailMesh = {
  line: THREE.LineSegments
  geometry: THREE.BufferGeometry
  positions: Float32Array
  colors: Float32Array
  baseColor: THREE.Color
}

type DropLine = {
  line: THREE.Line
  geometry: THREE.BufferGeometry
  positions: Float32Array
}

type Rig = {
  group: THREE.Group
  stars: Array<{ group: THREE.Group; sprite: THREE.Sprite; core: THREE.Mesh }>
  trails: Array<TrailMesh>
  drops: Array<DropLine>
  grid: THREE.GridHelper
  axes: THREE.Group
}

const FAMILY_OPTIONS: Array<{ id: OrbitFamily; label: string }> = [
  { id: 'named', label: '经典舞' },
  { id: 'equal', label: '三颗一样重' },
  { id: 'unequal', label: '第三颗不同' },
  { id: 'spatial', label: '3D空间解' },
]

function disableRaycast(object: THREE.Object3D) {
  object.raycast = () => {}
}

function cellOffset(index: number): [number, number, number] {
  const col = index % 4
  const row = Math.floor(index / 4)
  return [(col - 1.5) * CELL, 0, (row - 0.45) * CELL * 1.08]
}

function makeTrail(color: string): TrailMesh {
  const vertexCap = TRAIL_KEEP * 2
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(vertexCap * 3)
  const colors = new Float32Array(vertexCap * 3)
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const line = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  )
  line.frustumCulled = false
  return { line, geometry, positions, colors, baseColor: new THREE.Color(color) }
}

function makeAxisSprite(text: string, color: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 96
  canvas.height = 96
  const context = canvas.getContext('2d')!
  context.font = '700 56px ui-sans-serif, system-ui, sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.strokeStyle = 'rgba(4, 8, 14, 0.7)'
  context.lineWidth = 8
  context.strokeText(text, 48, 52)
  context.fillStyle = color
  context.fillText(text, 48, 52)
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(canvas),
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    }),
  )
  sprite.scale.setScalar(0.3)
  disableRaycast(sprite)
  return sprite
}

function makeAxes(size = 1.42) {
  const group = new THREE.Group()
  const specs: Array<{ dir: THREE.Vector3; color: number; label: string; hex: string }> = [
    { dir: new THREE.Vector3(size, 0, 0), color: 0xff6d6d, label: 'X', hex: '#ff8a8a' },
    { dir: new THREE.Vector3(0, 0, size), color: 0x74e08a, label: 'Y', hex: '#8af0a0' },
    { dir: new THREE.Vector3(0, size, 0), color: 0x6ec4ff, label: 'Z', hex: '#8ad4ff' },
  ]
  for (const spec of specs) {
    const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), spec.dir])
    const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({
        color: spec.color,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        toneMapped: false,
      }),
    )
    disableRaycast(line)
    const label = makeAxisSprite(spec.label, spec.hex)
    label.position.copy(spec.dir).multiplyScalar(1.1)
    group.add(line, label)
  }
  group.visible = false
  return group
}

function makeDrop(color: string): DropLine {
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(6)
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const line = new THREE.Line(
    geometry,
    new THREE.LineDashedMaterial({
      color,
      transparent: true,
      opacity: 0.38,
      dashSize: 0.045,
      gapSize: 0.04,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  )
  line.frustumCulled = false
  return { line, geometry, positions }
}

function writeTrail(trail: TrailMesh, points: Array<Point>, scale: number, gain: number, keep = false) {
  const { positions, colors, baseColor, geometry } = trail
  const vertexCap = TRAIL_KEEP * 2
  const last = points.length
  let out = 0
  for (let i = 1; i < last; i += 1) {
    if (out + 2 > vertexCap) break
    const from = points[i - 1]
    const to = points[i]
    if (!trailPairConnected(from, to)) continue
    const start = worldPosition(from, scale)
    const end = worldPosition(to, scale)
    const fractionFrom = last <= 1 ? 1 : (i - 1) / (last - 1)
    const fractionTo = last <= 1 ? 1 : i / (last - 1)
    const fadeFrom = keep ? 0.84 + fractionFrom * 0.2 : 0.02 + Math.pow(fractionFrom, 2.4) * 1.7
    const fadeTo = keep ? 0.84 + fractionTo * 0.2 : 0.02 + Math.pow(fractionTo, 2.4) * 1.7
    const brightnessFrom = fadeFrom * gain
    const brightnessTo = fadeTo * gain
    positions[out * 3] = start[0]
    positions[out * 3 + 1] = start[1]
    positions[out * 3 + 2] = start[2]
    colors[out * 3] = baseColor.r * brightnessFrom
    colors[out * 3 + 1] = baseColor.g * brightnessFrom
    colors[out * 3 + 2] = baseColor.b * brightnessFrom
    out += 1
    positions[out * 3] = end[0]
    positions[out * 3 + 1] = end[1]
    positions[out * 3 + 2] = end[2]
    colors[out * 3] = baseColor.r * brightnessTo
    colors[out * 3 + 1] = baseColor.g * brightnessTo
    colors[out * 3 + 2] = baseColor.b * brightnessTo
    out += 1
  }
  geometry.setDrawRange(0, out)
  ;(geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
  ;(geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true
}

function atlasCameraPosition(zoom: number): [number, number, number] {
  return [8.8 * zoom, 6.2 * zoom, 11.2 * zoom]
}

function watchCameraPosition(zoom: number): [number, number, number] {
  return [3.28 * zoom, 0.92 * zoom, 2.48 * zoom]
}

function createSim(orbit: PeriodicOrbit, view: View, nudge = 0, keepTrail = false): Sim {
  return makeSim(starsForOrbit(orbit, nudge), {
    epsilon: view === 'perturb' ? CHAOS_EPSILON : PERIODIC_EPSILON,
    trailMax: view === 'atlas' ? 280 : keepTrail ? TRAIL_KEEP : TRAIL_SHORT,
    trailEvery: view === 'atlas' ? 0.02 : 0.005,
    maxStep: view === 'atlas' ? 0.004 : 0.003,
    period: view === 'perturb' ? null : orbit.period,
  })
}

function ThreeBodyScene({
  loop,
  view,
  reducedMotion,
  onHud,
  onInteract,
  onPick,
}: {
  loop: MutableRefObject<LoopState>
  view: View
  reducedMotion: boolean
  onHud: (sample: HudSample) => void
  onInteract: () => void
  onPick: (id: string) => void
}) {
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null)
  const { camera, gl, size } = useThree()
  const aspect = size.width / Math.max(size.height, 1)
  const zoomFactor = aspect < 0.92 ? 2.05 : aspect < 1.15 ? 1.12 : 1
  const scratch = useMemo(
    () => ({
      vec: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      ndc: new THREE.Vector2(),
      raycaster: new THREE.Raycaster(),
      plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    }),
    [],
  )

  const objects = useMemo(() => {
    const root = new THREE.Group()
    const halo = getHaloTexture()
    const rigs: Array<Rig> = []
    for (let r = 0; r < PAGE_SIZE; r += 1) {
      const group = new THREE.Group()
      group.userData.index = r
      const stars = STAR_COLORS.map((color) => {
        const starGroup = new THREE.Group()
        const core = new THREE.Mesh(
          new THREE.SphereGeometry(0.055, 24, 24),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.62), toneMapped: false }),
        )
        const sprite = new THREE.Sprite(
          new THREE.SpriteMaterial({ map: halo, color, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
        )
        sprite.scale.setScalar(0.7)
        starGroup.add(core, sprite)
        group.add(starGroup)
        return { group: starGroup, sprite, core }
      })
      const trails = STAR_COLORS.map((color) => {
        const trail = makeTrail(color)
        disableRaycast(trail.line)
        group.add(trail.line)
        return trail
      })
      const drops = STAR_COLORS.map((color) => {
        const drop = makeDrop(color)
        disableRaycast(drop.line)
        group.add(drop.line)
        return drop
      })
      const grid = new THREE.GridHelper(2.7, 8, 0x355064, 0x1a2732)
      const gridMaterial = grid.material as THREE.Material | Array<THREE.Material>
      const materials = Array.isArray(gridMaterial) ? gridMaterial : [gridMaterial]
      materials.forEach((material) => {
        material.transparent = true
        material.opacity = 0.42
        material.depthWrite = false
      })
      disableRaycast(grid)
      const axes = makeAxes()
      group.add(axes)
      const pick = new THREE.Mesh(
        new THREE.SphereGeometry(1.15, 16, 12),
        new THREE.MeshBasicMaterial({ visible: false }),
      )
      pick.userData.pick = true
      group.add(grid, pick)
      root.add(group)
      rigs.push({ group, stars, trails, drops, grid, axes })
    }

    const handleGeometry = new THREE.BufferGeometry()
    handleGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
    const handleLine = new THREE.Line(
      handleGeometry,
      new THREE.LineDashedMaterial({
        color: STAR_COLORS[2],
        transparent: true,
        opacity: 0.72,
        dashSize: 0.04,
        gapSize: 0.05,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    )
    handleLine.frustumCulled = false
    root.add(handleLine)
    const handleTip = new THREE.Group()
    handleTip.add(
      new THREE.Mesh(new THREE.SphereGeometry(0.055, 24, 24), new THREE.MeshBasicMaterial({ color: '#fff1c2', toneMapped: false })),
    )
    root.add(handleTip)
    return { root, rigs, handle: { line: handleLine, tip: handleTip } }
  }, [])

  useEffect(() => {
    const target = new THREE.Vector3(0, view === 'atlas' ? 0.28 : 0.16, 0)
    const position = view === 'atlas' ? atlasCameraPosition(zoomFactor) : watchCameraPosition(zoomFactor)
    camera.position.set(...position)
    const controls = controlsRef.current
    if (controls) {
      controls.target.copy(target)
      controls.update()
    }
  }, [camera, view, zoomFactor])

  useEffect(() => {
    const element = gl.domElement
    const onMove = (event: PointerEvent) => {
      const state = loop.current
      if (!state.dragging || state.view !== 'perturb' || !state.systems[0]) return
      const rect = element.getBoundingClientRect()
      scratch.ndc.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1)
      scratch.raycaster.setFromCamera(scratch.ndc, camera)
      if (!scratch.raycaster.ray.intersectPlane(scratch.plane, scratch.vec)) return
      const star = state.systems[0].sim.stars[2]
      if (state.dragging === 'pos') {
        star.x = scratch.vec.x / WORLD
        star.y = scratch.vec.z / WORLD
      } else {
        star.vx = clamp((scratch.vec.x / WORLD - star.x) / HANDLE, -3, 3)
        star.vy = clamp((scratch.vec.z / WORLD - star.y) / HANDLE, -3, 3)
      }
      state.systems[0].sim.acc = accelerations(state.systems[0].sim.stars, state.systems[0].sim.epsilon)
      state.systems[0].sim.minD = minPair(state.systems[0].sim.stars).d
      state.systems[0].sim.period = null
    }
    const onUp = () => {
      const state = loop.current
      if (!state.dragging) return
      state.dragging = null
      const controls = controlsRef.current
      if (controls) controls.enabled = true
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [gl, camera, loop, scratch])

  const beginDrag = (kind: 'pos' | 'vel') => (event: { stopPropagation: () => void }) => {
    const state = loop.current
    if (state.view !== 'perturb' || !state.systems[0] || state.systems[0].sim.escaped !== null) return
    event.stopPropagation()
    state.dragging = kind
    const controls = controlsRef.current
    if (controls) controls.enabled = false
    onInteract()
  }

  useFrame((_, delta) => {
    const state = loop.current
    const atlas = state.view === 'atlas'
    objects.rigs.forEach((rig, index) => {
      const system = state.systems[index]
      rig.group.visible = Boolean(system)
      if (!system) return
      if (state.playing && !state.dragging) {
        const lifted = system.sim.origin.some((star) => Math.abs(star.z) > 0.08 || Math.abs(star.vz) > 0.04)
        const period = system.sim.period ?? 8
        const tempo = atlas
          ? Math.min(period, 10) / (lifted ? 8.2 : 5.5)
          : state.view === 'perturb'
            ? 1.05
            : lifted
              ? Math.max(0.4, Math.min(period, 10) / 11)
              : Math.max(0.45, period / 8)
        simulate(system.sim, Math.min(0.05, delta) * tempo * state.speed)
      }
      system.sim.trailMax = atlas ? 280 : state.keepTrail ? TRAIL_KEEP : TRAIL_SHORT
      if (!atlas && !state.keepTrail) {
        for (const trail of system.sim.trails) {
          if (trail.length > TRAIL_SHORT) trail.splice(0, trail.length - TRAIL_SHORT)
        }
      }
      const scale = atlas ? 1.2 / Math.max(system.sim.extent, 0.8) : WORLD
      const [ox, oy, oz] = atlas ? cellOffset(index) : [0, 0, 0]
      rig.group.position.set(ox, oy, oz)
      rig.grid.scale.setScalar(atlas ? 1 : 1.65)
      rig.axes.visible = Boolean(system) && state.showAxes && !atlas
      system.sim.stars.forEach((star, starIndex) => {
        const [x, y, z] = worldPosition(star, scale)
        rig.stars[starIndex].group.position.set(x, y, z)
        const glow = (atlas ? 0.5 : 0.78) + 0.22 * Math.sqrt(star.m)
        rig.stars[starIndex].sprite.scale.setScalar(glow)
        const drop = rig.drops[starIndex]
        drop.positions[0] = x
        drop.positions[1] = y
        drop.positions[2] = z
        drop.positions[3] = x
        drop.positions[4] = 0
        drop.positions[5] = z
        drop.line.visible = Math.abs(y) > 0.03
        ;(drop.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
        drop.line.computeLineDistances()
      })
      rig.trails.forEach((trail, trailIndex) =>
        writeTrail(trail, system.sim.trails[trailIndex], scale, atlas ? 0.85 : 1, state.keepTrail && !atlas),
      )
    })

    const focused = state.systems[0]
    const showHandle = state.view === 'perturb' && focused && focused.sim.escaped === null
    objects.handle.line.visible = Boolean(showHandle)
    objects.handle.tip.visible = Boolean(showHandle)
    if (showHandle && focused) {
      const star = focused.sim.stars[2]
      const [x0, y0, z0] = worldPosition(star, WORLD)
      const tip = { x: star.x + star.vx * HANDLE, y: star.y + star.vy * HANDLE, z: star.z }
      const [x1, y1, z1] = worldPosition(tip, WORLD)
      const attribute = objects.handle.line.geometry.getAttribute('position') as THREE.BufferAttribute
      attribute.setXYZ(0, x0, y0, z0)
      attribute.setXYZ(1, x1, y1, z1)
      attribute.needsUpdate = true
      objects.handle.line.computeLineDistances()
      objects.handle.tip.position.set(x1, y1, z1)
    }

    const stamp = performance.now()
    if (stamp - state.hudAt > 220 && focused) {
      state.hudAt = stamp
      onHud({ t: focused.sim.t, minD: focused.sim.minD, escaped: focused.sim.escaped, maxAbsZ: maxAbsZ(focused.sim.stars) })
    }
  })

  return (
    <>
      <color attach="background" args={['#04060c']} />
      <Stars radius={100} depth={55} count={reducedMotion ? 1800 : 3600} factor={3.3} saturation={0.06} fade speed={reducedMotion ? 0 : 0.12} />
      <primitive object={objects.root} />
      {objects.rigs.map((rig, index) => (
        <primitive
          key={index}
          object={rig.group}
          onPointerDown={(event: { object?: { userData?: { pick?: boolean } }; stopPropagation: () => void }) => {
            const system = loop.current.systems[index]
            if (!system) return
            event.stopPropagation()
            if (loop.current.view === 'atlas') {
              onPick(system.id)
              return
            }
            beginDrag('pos')(event)
          }}
        >
          {view === 'atlas' && loop.current.systems[index] ? (
            <Html position={[0, 1.22, 0]} center sprite distanceFactor={14} zIndexRange={[20, 0]} className="tb-atlas-html">
              <button
                type="button"
                className="tb-atlas-label"
                onClick={(event) => {
                  event.stopPropagation()
                  const system = loop.current.systems[index]
                  if (system) onPick(system.id)
                }}
              >
                {loop.current.systems[index]?.label ?? ''}
              </button>
            </Html>
          ) : null}
        </primitive>
      ))}
      <primitive object={objects.handle.tip} onPointerDown={beginDrag('vel')} />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.06}
        enablePan={view !== 'atlas'}
        screenSpacePanning
        minDistance={view === 'atlas' ? 8 : 1.6}
        maxDistance={(view === 'atlas' ? 28 : 18) * zoomFactor}
        minPolarAngle={view === 'atlas' ? 0.32 : 0.04}
        maxPolarAngle={view === 'atlas' ? 1.28 : Math.PI - 0.06}
        autoRotate={!reducedMotion && view !== 'perturb'}
        autoRotateSpeed={view === 'atlas' ? 0.22 : 0.38}
        onStart={() => onInteract()}
      />
    </>
  )
}

export function ThreeBody({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const { locale } = useI18n()
  const english = locale === 'en'
  const reducedMotion = false
  const { storyMode, enterFree, enterStory } = useStoryFreeMode(WORLD_ID, { firstVisit: 'free' })
  const [view, setView] = useState<View>('atlas')
  const [family, setFamily] = useState<OrbitFamily>(DEFAULT_FAMILY)
  const [massFilter, setMassFilter] = useState<number>(0.5)
  const [spatialMass, setSpatialMass] = useState<number>(DEFAULT_SPATIAL_MASS)
  const [page, setPage] = useState(0)
  const [orbitId, setOrbitId] = useState(DEFAULT_ORBIT_ID)
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState<Speed>(2)
  const [keepTrail, setKeepTrail] = useState(false)
  const [showAxes, setShowAxes] = useState(false)
  const [whyOpen, setWhyOpen] = useState(false)
  const [legendOpen, setLegendOpen] = useState(false)
  const [hud, setHud] = useState<HudSample>({ t: 0, minD: 9, escaped: null, maxAbsZ: 0 })
  const [scene, setScene] = useState<Scene>('free')

  const orbit = getOrbit(orbitId)
  const catalog = listOrbits(
    family,
    family === 'unequal' ? massFilter : family === 'spatial' ? spatialMass : undefined,
  )
  const pageCount = Math.max(1, Math.ceil(catalog.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageOrbits = catalog.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  const loop = useRef<LoopState | null>(null)
  if (!loop.current) {
    const opening = listOrbits(DEFAULT_FAMILY, DEFAULT_SPATIAL_MASS).slice(0, PAGE_SIZE)
    loop.current = {
      playing,
      view,
      systems: opening.map((item) => ({
        id: item.id,
        label: displayName(item, english),
        sim: createSim(item, 'atlas'),
      })),
      hudAt: 0,
      dragging: null,
      speed: 2,
      keepTrail: false,
      showAxes: false,
    }
  }
  loop.current.playing = playing
  loop.current.view = view
  loop.current.speed = speed
  loop.current.keepTrail = keepTrail
  loop.current.showAxes = showAxes
  loop.current.systems.forEach((system) => {
    system.label = displayName(getOrbit(system.id), english)
  })

  useEffect(() => {
    controls.completeOnboarding()
  }, [controls])

  const loadPage = (orbits: Array<PeriodicOrbit>, nextView: View) => {
    setView(nextView)
    loop.current!.view = nextView
    loop.current!.systems = orbits.map((item) => ({
      id: item.id,
      label: displayName(item, english),
      sim: createSim(item, nextView, 0, keepTrail),
    }))
    loop.current!.dragging = null
    if (orbits[0]) {
      setOrbitId(orbits[0].id)
      setHud({
        t: 0,
        minD: loop.current!.systems[0].sim.minD,
        escaped: null,
        maxAbsZ: maxAbsZ(loop.current!.systems[0].sim.stars),
      })
    }
    setPlaying(true)
  }

  const loadOrbit = (id: string, nextView: View) => {
    const next = getOrbit(id)
    setOrbitId(id)
    setView(nextView)
    loop.current!.view = nextView
    const sim = createSim(next, nextView, nextView === 'perturb' ? 0.05 : 0, keepTrail)
    loop.current!.systems = [{ id: next.id, label: displayName(next, english), sim }]
    loop.current!.dragging = null
    setHud({ t: 0, minD: sim.minD, escaped: null, maxAbsZ: maxAbsZ(sim.stars) })
    setPlaying(true)
  }

  useEffect(() => {
    if (view !== 'atlas') return
    loadPage(pageOrbits, 'atlas')
    // pageOrbits identity changes every render; key by family/page/filter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family, massFilter, spatialMass, safePage, view])

  const guideSteps: Array<GuideStep> = [
    {
      title: tx('八组恒星在三维空间里跳'),
      body: tx('这些不是贴图。每一格都在用牛顿引力当场积分。虚线垂线标出离地高度：它们会离开水平面。'),
      action: () => {
        setScene('wall')
        setFamily('spatial')
        setSpatialMass(DEFAULT_SPATIAL_MASS)
        setPage(0)
        setView('atlas')
      },
      durationMs: 7800,
    },
    {
      title: tx('点进一组，看它离开地面'),
      body: tx('这是 2025 年李晓明、廖世俊发表的空间周期解。三颗星不在同一个平面里走。拖动画面可以绕着舞转。'),
      action: () => {
        setScene('dance')
        loadOrbit(DEFAULT_ORBIT_ID, 'watch')
      },
      durationMs: 8200,
    },
    {
      title: tx('有些发表解其实是平面的'),
      body: tx('8 字舞始终贴在一个平面上。转镜头会看出它像一张纸。名解、695 族、1349 族都是平面解；三维空间页才离开地面。'),
      action: () => {
        setScene('flower')
        loadOrbit('named-figure-eight', 'watch')
      },
      durationMs: 8000,
    },
    {
      title: tx('轻轻一碰，舞就会散'),
      body: tx('周期解是混沌海里的小岛。退出故事后，可以翻空间解、695 族和 1349 族，也可以自己拧乱一条。'),
      action: () => {
        setScene('break')
        loadOrbit(DEFAULT_ORBIT_ID, 'perturb')
      },
      durationMs: 9000,
    },
  ]

  const leaveStory = () => {
    setScene('free')
    setFamily(DEFAULT_FAMILY)
    setSpatialMass(DEFAULT_SPATIAL_MASS)
    setPage(0)
    setView('atlas')
    enterFree()
  }

  const massButtons = family === 'spatial' ? SPATIAL_MASSES : UNEQUAL_MASSES
  const massValue = family === 'spatial' ? spatialMass : massFilter
  const familyMeta = FAMILY_OPTIONS.find((item) => item.id === family) ?? FAMILY_OPTIONS[0]

  const goAtlas = () => {
    controls.registerInteraction()
    setView('atlas')
    loadPage(pageOrbits, 'atlas')
  }

  const turnPage = (next: number) => {
    controls.registerInteraction()
    setPage(next)
    setView('atlas')
  }

  useEffect(() => {
    if (view !== 'atlas' || storyMode) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      if (event.key === 'ArrowLeft' && safePage > 0) turnPage(safePage - 1)
      if (event.key === 'ArrowRight' && safePage < pageCount - 1) turnPage(safePage + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, storyMode, safePage, pageCount])

  return (
    <div className={`oss-experience tb-experience${storyMode ? ' is-story' : ' is-free'} is-${view}${legendOpen ? ' is-legend' : ''}`}>
      <div
        className="tb-stage"
        style={{ touchAction: 'none', cursor: view === 'perturb' ? 'grab' : 'default' }}
        role="img"
        aria-label={tx('三体周期轨道三维模拟：恒星在牛顿引力下当场积分并留下轨迹')}
      >
        <Canvas
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          camera={{ position: atlasCameraPosition(1), fov: 42, near: 0.05, far: 280 }}
        >
          <ThreeBodyScene
            loop={loop as MutableRefObject<LoopState>}
            view={view}
            reducedMotion={reducedMotion}
            onHud={setHud}
            onInteract={() => controls.registerInteraction()}
            onPick={(id) => {
              controls.registerInteraction()
              loadOrbit(id, 'watch')
            }}
          />
          <EffectComposer multisampling={0} enableNormalPass={false}>
            <Bloom mipmapBlur intensity={1.12} luminanceThreshold={0.28} luminanceSmoothing={0.3} />
          </EffectComposer>
        </Canvas>
      </div>
      <div className="tb-vignette" aria-hidden="true" />

      {!storyMode && (
        <header className="tb-plaque" data-experience-overlay="true">
          <p>{view === 'atlas' ? tx(familyMeta.label) : displayName(orbit, english)}</p>
          <h1>{view === 'atlas' ? tx('三颗星，能跳出这么多完美的舞吗？') : displayName(orbit, english)}</h1>
          <strong>
            {tx(
              view === 'atlas'
                ? family === 'named'
                  ? '8 字、蝴蝶、蛾这些有名字的平面周期解。点一簇恒星进入这一组，空白处可以转动镜头。'
                  : family === 'equal'
                    ? '三颗质量相同的平面周期解，一共 695 族。点一簇恒星细看。'
                    : family === 'unequal'
                      ? '前两颗质量为 1，第三颗更重或更轻。点一簇恒星细看。'
                      : '3D 空间周期解。虚线是离地高度。点一簇恒星细看。'
                : view === 'perturb'
                  ? '拖金色那颗，或拖它前面的速度手柄。周期解极脆，位置一变，舞就会散。'
                  : orbit.kind === 'spatial'
                    ? '三个点质量只受牛顿引力。这条空间周期解会离开水平面，虚线标出高度。'
                    : '三个点质量只受牛顿引力。这是平面周期解：转镜头会看出轨迹贴在一张纸上。',
            )}
          </strong>
          <button type="button" className="tb-why-btn" onClick={() => setWhyOpen(true)}>
            <Question weight="bold" /> {tx('看懂它')}
          </button>
        </header>
      )}

      {!storyMode && view !== 'atlas' && (
        <aside className="tb-readout" data-experience-overlay="true" data-freebar-clearance="true" aria-live="polite">
          <div className="tb-readout-row">
            <small>{tx('周期 T')}</small>
            <strong>{orbit.period.toFixed(2)}</strong>
          </div>
          <div className="tb-readout-row">
            <small>{tx('模型时间')}</small>
            <strong>{hud.t.toFixed(1)}</strong>
          </div>
          <div className="tb-readout-row">
            <small>{tx('质量')}</small>
            <strong>1 : 1 : {orbit.m3}</strong>
          </div>
          <div className="tb-readout-row">
            <small>{tx('离面 |z|')}</small>
            <strong>{hud.maxAbsZ.toFixed(2)}</strong>
          </div>
          <div className="tb-readout-row">
            <small>{tx('命运')}</small>
            <strong className={hud.escaped !== null ? 'is-danger' : ''}>
              {hud.escaped === null ? tx('仍在共舞') : tx('已逃逸')}
            </strong>
          </div>
        </aside>
      )}

      {!storyMode && (
        <Freebar
          className="tb-freebar"
          mainClassName="tb-freebar-main"
          ariaLabel={tx('三体轨道控制')}
          primaryControlBudget={view === 'atlas' ? 1 : 4}
          secondaryDefault="closed"
          secondary={
            <div className="tb-secondary">
              {view === 'atlas' ? (
                <>
                  <div className="tb-secondary-row tb-row-families">
                    <div className="tb-family-cluster">
                      <div className="tb-presets experience-freebar-seg" role="group" aria-label={tx('轨道家族')}>
                        {FAMILY_OPTIONS.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className={family === item.id ? 'is-active' : ''}
                            onClick={() => {
                              controls.registerInteraction()
                              setFamily(item.id)
                              setPage(0)
                              setView('atlas')
                              setLegendOpen(false)
                            }}
                          >
                            {tx(item.label)}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        className={`tb-legend-btn${legendOpen ? ' is-open' : ''}`}
                        aria-label={tx('这四栏是什么')}
                        aria-expanded={legendOpen}
                        onClick={() => {
                          controls.registerInteraction()
                          setLegendOpen((current) => !current)
                        }}
                      >
                        ?
                      </button>
                    </div>
                    <div className="tb-corner-actions">
                      <button
                        type="button"
                        className="experience-freebar-reset"
                        aria-label={tx('重置')}
                        onClick={() => {
                          controls.registerInteraction()
                          loadPage(pageOrbits, 'atlas')
                        }}
                      >
                        <ArrowCounterClockwise weight="bold" aria-hidden="true" />
                        <span>{tx('重置')}</span>
                      </button>
                      <button
                        type="button"
                        className="tb-freebar-replay experience-freebar-story"
                        onClick={() => {
                          controls.registerInteraction()
                          enterStory()
                          replayGuide(WORLD_ID)
                        }}
                        aria-label={tx('重播故事')}
                      >
                        <FilmStrip weight="fill" aria-hidden="true" />
                        <span>{tx('故事')}</span>
                      </button>
                    </div>
                  </div>
                  <div className="tb-secondary-row tb-row-tools">
                    {(family === 'unequal' || family === 'spatial') && (
                      <div className="tb-mass">
                        <span>{tx('第三颗质量')}</span>
                        <div className="tb-presets experience-freebar-seg" role="group" aria-label={tx('第三颗质量')}>
                          {massButtons.map((mass) => (
                            <button
                              key={mass}
                              type="button"
                              className={massValue === mass ? 'is-active' : ''}
                              onClick={() => {
                                controls.registerInteraction()
                                if (family === 'spatial') setSpatialMass(mass)
                                else setMassFilter(mass)
                                setPage(0)
                                setView('atlas')
                              }}
                            >
                              {mass}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {pageCount > 1 && (
                      <div className="tb-pager" role="navigation" aria-label={tx('翻到下一批')}>
                        <button
                          type="button"
                          aria-label={tx('上一页')}
                          disabled={safePage <= 0}
                          onClick={() => turnPage(Math.max(0, safePage - 1))}
                        >
                          ‹
                        </button>
                        <span>
                          {safePage + 1}/{pageCount}
                        </span>
                        <button
                          type="button"
                          aria-label={tx('下一页')}
                          disabled={safePage >= pageCount - 1}
                          onClick={() => turnPage(Math.min(pageCount - 1, safePage + 1))}
                        >
                          ›
                        </button>
                      </div>
                    )}
                    <div className="tb-speed">
                      <span>{tx('速度')}</span>
                      <div className="tb-presets experience-freebar-seg" role="group" aria-label={tx('播放速度')}>
                        {SPEED_OPTIONS.map((option) => (
                          <button
                            key={option}
                            type="button"
                            className={speed === option ? 'is-active' : ''}
                            onClick={() => {
                              controls.registerInteraction()
                              setSpeed(option)
                            }}
                          >
                            {option}×
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {legendOpen && (
                    <div className="tb-legend" role="region" aria-label={tx('这四栏是什么')}>
                      <p>{tx('这是四类发表过的周期轨道，不是四种不同的物理。')}</p>
                      <dl>
                        <div>
                          <dt>{tx('经典舞')}</dt>
                          <dd>{tx('8 字、蝴蝶、蛾这些有名字的平面解。')}</dd>
                        </div>
                        <div>
                          <dt>{tx('三颗一样重')}</dt>
                          <dd>{tx('三颗质量相同，695 族平面周期解。')}</dd>
                        </div>
                        <div>
                          <dt>{tx('第三颗不同')}</dt>
                          <dd>{tx('前两颗质量为 1，第三颗更重或更轻。下面的数字就是第三颗的质量。')}</dd>
                        </div>
                        <div>
                          <dt>{tx('3D空间解')}</dt>
                          <dd>{tx('2025 年找到的空间周期解，会离开地面。')}</dd>
                        </div>
                      </dl>
                    </div>
                  )}
                </>
              ) : (
                <div className="tb-secondary-row tb-row-watch">
                  <div className="tb-speed">
                    <span>{tx('速度')}</span>
                    <div className="tb-presets experience-freebar-seg" role="group" aria-label={tx('播放速度')}>
                      {SPEED_OPTIONS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={speed === option ? 'is-active' : ''}
                          onClick={() => {
                            controls.registerInteraction()
                            setSpeed(option)
                          }}
                        >
                          {option}×
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`tb-adv-toggle${showAxes ? ' is-active' : ''}`}
                    aria-pressed={showAxes}
                    onClick={() => {
                      controls.registerInteraction()
                      setShowAxes((current) => !current)
                    }}
                  >
                    {tx('坐标轴')}
                  </button>
                  <button
                    type="button"
                    className={`tb-adv-toggle${keepTrail ? ' is-active' : ''}`}
                    aria-pressed={keepTrail}
                    onClick={() => {
                      controls.registerInteraction()
                      setKeepTrail((current) => !current)
                    }}
                  >
                    {tx('轨迹全貌')}
                  </button>
                  <div className="tb-corner-actions">
                    <button
                      type="button"
                      className="experience-freebar-reset"
                      aria-label={tx('重置')}
                      onClick={() => {
                        controls.registerInteraction()
                        loadOrbit(orbitId, view)
                      }}
                    >
                      <ArrowCounterClockwise weight="bold" aria-hidden="true" />
                      <span>{tx('重置')}</span>
                    </button>
                    <button
                      type="button"
                      className="tb-freebar-replay experience-freebar-story"
                      onClick={() => {
                        controls.registerInteraction()
                        enterStory()
                        replayGuide(WORLD_ID)
                      }}
                      aria-label={tx('重播故事')}
                    >
                      <FilmStrip weight="fill" aria-hidden="true" />
                      <span>{tx('故事')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          }
        >
          <button
            type="button"
            className="experience-freebar-play"
            data-playing={playing ? 'true' : 'false'}
            aria-label={tx(playing ? '暂停轨道' : '播放轨道')}
            onClick={() => {
              controls.registerInteraction()
              setPlaying((current) => !current)
            }}
          >
            {playing ? <Pause weight="fill" aria-hidden="true" /> : <Play weight="fill" aria-hidden="true" />}
          </button>
          {view !== 'atlas' && (
            <>
              <button
                type="button"
                className="tb-panel-back"
                onClick={goAtlas}
                aria-label={tx('返回八组')}
              >
                <CaretLeft weight="bold" />
                {tx('返回')}
              </button>
              <div className="tb-presets experience-freebar-seg" role="group" aria-label={tx('三体视图')}>
                <button
                  type="button"
                  className={view === 'watch' ? 'is-active' : ''}
                  onClick={() => {
                    controls.registerInteraction()
                    loadOrbit(orbitId, 'watch')
                  }}
                >
                  {tx('这一组')}
                </button>
                <button
                  type="button"
                  className={`tb-preset-chaos${view === 'perturb' ? ' is-active' : ''}`}
                  onClick={() => {
                    controls.registerInteraction()
                    loadOrbit(orbitId, 'perturb')
                  }}
                >
                  {tx('拧乱')}
                </button>
              </div>
            </>
          )}
        </Freebar>
      )}

      {whyOpen && (
        <div className="tb-why" role="dialog" aria-modal="true" aria-label={tx('三体问题原理解释')} data-experience-overlay="true">
          <div className="tb-why-card">
            <button type="button" className="tb-why-close" onClick={() => setWhyOpen(false)} aria-label={tx('关闭')}>
              <X weight="bold" />
            </button>
            <span className="tb-why-kicker">{tx('从圆锥曲线到三维周期之舞')}</span>
            <h2>{tx('为什么三颗星会失控，又能共舞？')}</h2>
            <p>
              {tx('两个天体的轨迹是圆锥曲线。再加一颗星，微分方程仍然简洁，却没有同样能直接代入的通用公式。1890 年庞加莱证明一般三体问题不存在封闭解析解——不可解指的是没有通解，不是没有特解。')}
            </p>
            <h3>{tx('平面解和空间解不是一回事')}</h3>
            <p>
              {tx('三体问题本身在三维空间里。如果三颗星的起点和速度都贴在同一个平面，它们会一直走在这张纸上，这叫平面周期解。给一个离面的高度或离面速度，一般会离开这个平面。名解、等质量 695、不等质量 1349 都是平面族；打开「三维空间」才是 2025 年李晓明、廖世俊找到的空间周期解。')}
            </p>
            <h3>{tx('每一格都在积分，不是贴图')}</h3>
            <p>
              {tx('本页没有复制论文的图、动画或程序。每一格都用牛顿引力和三维自适应 RK4，对发表过的初值当场积分。恒星在动，轨迹是它们走出来的。空间页从 2025 年发现的 10059 条里收录全部线性稳定解、钢琴三重奏解和各质量最短轨道，共 2416 条。')}
            </p>
            <h3>{tx('底栏四族对应哪组文献')}</h3>
            <p>
              {tx('「名解」主要来自 Šuvakov 2013 的平面命名轨道，加上欧拉直线、拉格朗日正三角和摩尔的 8 字舞。「等质量 · 695」来自李、廖 2017；「不等质量 · 1349」来自李、井、廖 2018，都是平面表格。「三维空间」才是 2025 年的空间解：第三颗星有离面坐标 z₀，前两颗有相反的离面速度。')}
            </p>
            <p className="tb-why-more">
              {tx('论文链接和每一条在本页的用途，在 ⓘ 资料里。')}
            </p>
            <div className="tb-model-note">
              {tx('模型：三个点质量、牛顿引力、三维自适应 RK4。一个周期结束后回到发表的初值，轨迹在此处断开，不会拉出穿过空旷空间的直线。微扰模式关闭复位。真实恒星还有潮汐、质量损失与相对论修正。')}
            </div>
          </div>
        </div>
      )}

      <GuideTour
        worldId={WORLD_ID}
        steps={guideSteps}
        defaultOpen={storyMode}
        placement="stage"
        stagePlan={[
          { position: 'top-left', mobilePosition: 'top-left', treatment: 'monumental', width: 'wide' },
          { position: 'top-right', mobilePosition: 'top-left', treatment: 'annotation', cue: 'left' },
          { position: 'bottom-left', mobilePosition: 'bottom-left', treatment: 'caption' },
          { position: 'bottom-right', mobilePosition: 'bottom-left', treatment: 'editorial' },
        ]}
        showReplayChip={false}
        replayLabel={tx('重播故事')}
        onExit={leaveStory}
      />
      {!storyMode && view === 'atlas' && (
        <GhostHint
          worldId={WORLD_ID}
          delay={1600}
          gesture={{ type: 'tap', target: '.tb-stage', label: tx('点一簇恒星或它的名字') }}
        />
      )}
      {!storyMode && view === 'perturb' && (
        <GhostHint
          worldId={`${WORLD_ID}-nudge`}
          delay={700}
          gesture={{ type: 'drag', target: '.tb-stage', dx: 70, dy: -40, label: tx('拖金色那颗，看舞怎样散开') }}
        />
      )}
    </div>
  )
}
