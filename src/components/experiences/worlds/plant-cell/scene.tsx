import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, type ComponentRef, type MutableRefObject, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Bloom, DepthOfField, EffectComposer, Noise, Vignette } from '@react-three/postprocessing'
import * as T from 'three'
import { BlendFunction } from 'postprocessing'
import { isWorldPaused } from '~/lib/world-playback'
import { CellLayer } from './cell-layer'
import { LeafLayer, SectionLayer } from './leaf-layers'
import { ChloroplastLayer } from './chloroplast-layer'
import { clampScale, getAnchorUm, getLayerWeights, zoomFlightDuration, CHLOROPLAST_ANCHOR_UM, CHLOROPLAST_ROTATION, type PlantLayer } from './scale-model'

export interface ScaleController {
  current: number
  target: number
  touched: boolean
  flight: { from: number; to: number; elapsed: number; duration: number } | null
  reset: number
}

interface SceneProps {
  controller: MutableRefObject<ScaleController>
  light: number
  playing: boolean
  mobile: boolean
  reducedMotion: boolean
  onScale: (scale: number, width: number) => void
  onInteract: () => void
}

/** Fade material alpha without rerendering the model or rebuilding geometry. */
function ScaleLayer({ layer, controller, children }: { layer: PlantLayer; controller: MutableRefObject<ScaleController>; children: ReactNode }) {
  const root = useRef<T.Group>(null)
  const materials = useRef<Array<{ material: T.Material; base: number; depth: boolean; uniform?: { value: number } }>>([])
  useLayoutEffect(() => {
    materials.current = []
    const seen = new Set<T.Material>()
    root.current?.traverse((object) => {
      if (!('material' in object)) return
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (!(material instanceof T.Material) || seen.has(material)) continue
        seen.add(material)
        const uniform = material instanceof T.ShaderMaterial ? material.uniforms.alpha : undefined
        material.userData.plantBaseOpacity ??= uniform?.value ?? material.opacity
        material.userData.plantDepthWrite ??= material.depthWrite
        materials.current.push({ material, base: material.userData.plantBaseOpacity, depth: material.userData.plantDepthWrite, uniform })
        material.transparent = true
      }
    })
  }, [children])
  useFrame(() => {
    const weight = getLayerWeights(controller.current.current)[layer]
    if (root.current) root.current.visible = weight > 0.0001
    for (const { material, base, uniform, depth } of materials.current) {
      if (uniform) uniform.value = base * weight
      else material.opacity = base * weight
      material.depthWrite = depth && weight > 0.98
    }
  }, -1)
  return <group ref={root}>{children}</group>
}

function CameraAndScale({ controller, reducedMotion, onScale, onInteract }: Pick<SceneProps, 'controller' | 'reducedMotion' | 'onScale' | 'onInteract'>) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  const { camera, size, gl } = useThree()
  const lastReport = useRef(0), autoTime = useRef(0), lastReset = useRef(-1)
  const interaction = useRef(onInteract)
  interaction.current = onInteract
  useEffect(() => {
    const canvas = gl.domElement
    canvas.setAttribute('aria-label', 'Plant cell. Drag to rotate; scroll or pinch to zoom.')
    canvas.tabIndex = 0
    const touch = () => {
      controller.current.touched = true
      if (controller.current.flight) { controller.current.flight = null; controller.current.target = controller.current.current }
      interaction.current()
    }
    const wheel = (event: WheelEvent) => {
      event.preventDefault(); touch()
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? size.height : 1)
      controller.current.target = clampScale(controller.current.target + Math.max(-260, Math.min(260, delta)) * 0.00125)
      controller.current.flight = null
    }
    let lastDistance = 0
    const start = (event: TouchEvent) => {
      touch()
      if (controls.current) controls.current.enableRotate = event.touches.length < 2
      if (event.touches.length === 2) lastDistance = Math.hypot(event.touches[0].clientX - event.touches[1].clientX, event.touches[0].clientY - event.touches[1].clientY)
    }
    const move = (event: TouchEvent) => {
      if (event.touches.length !== 2) return
      event.preventDefault()
      const distance = Math.hypot(event.touches[0].clientX - event.touches[1].clientX, event.touches[0].clientY - event.touches[1].clientY)
      if (lastDistance > 0 && distance > 0) controller.current.target = clampScale(controller.current.target + Math.log10(lastDistance / distance))
      controller.current.flight = null; lastDistance = distance
    }
    const end = (event: TouchEvent) => {
      lastDistance = 0
      if (controls.current) controls.current.enableRotate = event.touches.length < 2
    }
    const key = (event: KeyboardEvent) => {
      if (!['+', '=', '-', '_', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
      event.preventDefault(); touch()
      const inward = ['+', '=', 'ArrowUp'].includes(event.key)
      controller.current.target = clampScale(controller.current.target + (inward ? -0.2 : 0.2))
      controller.current.flight = null
    }
    canvas.addEventListener('wheel', wheel, { passive: false })
    canvas.addEventListener('pointerdown', touch)
    canvas.addEventListener('touchstart', start, { passive: false })
    canvas.addEventListener('touchmove', move, { passive: false })
    canvas.addEventListener('touchend', end)
    canvas.addEventListener('touchcancel', end)
    canvas.addEventListener('keydown', key)
    return () => {
      canvas.removeEventListener('wheel', wheel); canvas.removeEventListener('pointerdown', touch)
      canvas.removeEventListener('touchstart', start); canvas.removeEventListener('touchmove', move); canvas.removeEventListener('touchend', end); canvas.removeEventListener('touchcancel', end); canvas.removeEventListener('keydown', key)
    }
  }, [gl, size.height, controller])
  useLayoutEffect(() => {
    if (!(camera instanceof T.OrthographicCamera)) return
    camera.left = -50; camera.right = 50
    camera.top = 50 * size.height / size.width; camera.bottom = -camera.top
    camera.updateProjectionMatrix()
    onScale(controller.current.current, size.width)
  }, [camera, size, onScale, controller])
  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.08), c = controller.current
    if (lastReset.current !== c.reset) {
      camera.position.set(55, 25, 150); camera.lookAt(0, 0, 0)
      controls.current?.target.set(0, 0, 0); controls.current?.update()
      lastReset.current = c.reset; autoTime.current = 0
    }
    if (c.flight) {
      c.flight.elapsed += delta
      const t = Math.min(1, c.flight.elapsed / c.flight.duration), ease = t * t * (3 - 2 * t)
      c.current = c.flight.from + (c.flight.to - c.flight.from) * ease
      if (t === 1) c.flight = null
    } else c.current = T.MathUtils.damp(c.current, c.target, 10, delta)
    if (!c.touched && !reducedMotion && !isWorldPaused()) {
      autoTime.current += delta
      // 3% in 20 seconds, then hold; no unbounded automatic dive.
      const advance = Math.min(delta, Math.max(0, 20 - autoTime.current)) * Math.log10(1.03) / 20
      c.target -= advance
      camera.position.applyAxisAngle(T.Object3D.DEFAULT_UP, delta * Math.PI / 1800)
      camera.lookAt(0, 0, 0)
    }
    if (state.clock.elapsedTime - lastReport.current > 0.065) {
      onScale(c.current, size.width); lastReport.current = state.clock.elapsedTime
      gl.domElement.dataset.scale = c.current.toFixed(5)
    }
  }, -3)
  return <OrbitControls ref={controls} enableZoom={false} enablePan={false} enableDamping dampingFactor={0.12} rotateSpeed={0.5} maxPolarAngle={Math.PI * 0.9} minPolarAngle={0.1} onStart={() => { controller.current.touched = true; onInteract() }} />
}

function Contents(props: SceneProps) {
  const root = useRef<T.Group>(null), clock = useRef(0)
  const { light, mobile, playing, controller } = props
  const brightness = Math.sqrt(light / 2000)
  useFrame((_, delta) => {
    if (playing && !isWorldPaused()) clock.current += Math.min(delta, 0.08)
    const scale = controller.current.current
    const factor = 100 / 10 ** (scale + 6)
    const anchor = getAnchorUm(scale)
    if (root.current) {
      root.current.scale.setScalar(factor)
      root.current.position.set(-anchor[0] * factor, -anchor[1] * factor, -anchor[2] * factor)
    }
  }, -2)
  const layers = useMemo(() => <>
    <ScaleLayer layer="leaf" controller={controller}><LeafLayer opacity={1} mobile={mobile} /></ScaleLayer>
    <ScaleLayer layer="section" controller={controller}><SectionLayer opacity={1} mobile={mobile} /></ScaleLayer>
    <ScaleLayer layer="cell" controller={controller}><CellLayer opacity={1} light={brightness} clock={clock} mobile={mobile} /></ScaleLayer>
    <ScaleLayer layer="chloroplast" controller={controller}><group position={CHLOROPLAST_ANCHOR_UM} rotation={CHLOROPLAST_ROTATION}><ChloroplastLayer opacity={1} mobile={mobile} /></group></ScaleLayer>
  </>, [controller, mobile, brightness])
  return <>
    <color attach="background" args={['#060e10']} />
    <ambientLight color="#879b91" intensity={0.13 + brightness * 0.28} />
    <hemisphereLight args={['#ddd8b7', '#3f6f78', 0.12 + brightness * 0.25]} />
    <directionalLight position={[-25, 85, 35]} color="#ffecc8" intensity={0.06 + brightness * 2.6} />
    <directionalLight position={[35, 10, -30]} color="#cfe0c5" intensity={0.04 + brightness * 1.2} />
    <directionalLight position={[-20, -35, 10]} color="#3f6f78" intensity={0.18} />
    <group ref={root}>{layers}</group>
    <CameraAndScale {...props} />
    <EffectComposer multisampling={mobile ? 0 : 4}>
      <DepthOfField target={[0, 0, -4]} focusRange={28} bokehScale={mobile ? 2 : 3.5} height={mobile ? 400 : 700} />
      <Bloom intensity={0.12} luminanceThreshold={0.85} luminanceSmoothing={0.5} mipmapBlur />
      <Noise blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.16} />
      <Vignette offset={0.3} darkness={0.55} />
    </EffectComposer>
  </>
}

export function PlantScene(props: SceneProps) {
  return <div className="pc-scene">
    <Canvas orthographic camera={{ position: [55, 25, 150], near: 0.01, far: 1800 }} dpr={props.mobile ? [1, 1.25] : [1, 1.5]} gl={{ antialias: false, powerPreference: 'high-performance', toneMapping: T.ACESFilmicToneMapping, toneMappingExposure: 1.25 }}>
      <Suspense fallback={null}><Contents {...props} /></Suspense>
    </Canvas>
  </div>
}

export function flyToScale(controller: ScaleController, target: number) {
  const to = clampScale(target)
  controller.touched = true; controller.target = to
  controller.flight = { from: controller.current, to, elapsed: 0, duration: zoomFlightDuration(controller.current, to) }
}
