import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, DepthOfField, EffectComposer, Noise, SMAA, Vignette } from '@react-three/postprocessing'
import * as T from 'three'
import { BlendFunction } from 'postprocessing'
import { isWorldPaused } from '~/lib/world-playback'
import { CellLayer } from './cell-layer'
import { LeafLayer, SectionLayer } from './leaf-layers'
import { ChloroplastLayer } from './chloroplast-layer'
import { advancePhysiology, getPhysiologySnapshot, getLightAppearance, type PlantInputs, type PhysiologyState, type PhysiologySnapshot } from './model'
import { clampScale, getAnchorUm, getLayerWeights, zoomFlightDuration, CHLOROPLAST_ANCHOR_UM, CHLOROPLAST_ROTATION, CHLOROPLAST_QUATERNION, getCameraPose, smoothstep, type PlantLayer } from './scale-model'

export interface ScaleController {
  current: number
  target: number
  touched: boolean
  flight: { from: number; to: number; elapsed: number; duration: number } | null
  reset: number
}

interface SceneProps {
  controller: MutableRefObject<ScaleController>
  inputs: PlantInputs
  physiology: MutableRefObject<PhysiologyState>
  onPhysiology: (snapshot: PhysiologySnapshot) => void
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

function CameraAndScale({ controller, physiology, reducedMotion, onScale, onInteract }: Pick<SceneProps, 'controller' | 'physiology' | 'reducedMotion' | 'onScale' | 'onInteract'>) {
  const orbit = useRef({ yaw:0, pitch:0, currentYaw:0, currentPitch:0 })
  const focusFrame = useMemo(() => ({ rotation: new T.Quaternion(), blend: new T.Quaternion(), inverseInitial: CHLOROPLAST_QUATERNION.clone().invert() }), [])
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
    const pointers=new Map<number,{x:number;y:number}>()
    const down=(event:PointerEvent)=>{touch();pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});canvas.setPointerCapture(event.pointerId)}
    const drag=(event:PointerEvent)=>{
      const previous=pointers.get(event.pointerId);if(!previous)return
      pointers.set(event.pointerId,{x:event.clientX,y:event.clientY})
      if(pointers.size!==1)return
      orbit.current.yaw-=(event.clientX-previous.x)/size.height*Math.PI*2
      orbit.current.pitch+=(event.clientY-previous.y)/size.height*Math.PI*1.5
      const basePitch=getCameraPose(controller.current.current).pitch
      orbit.current.pitch=Math.max(-20*Math.PI/180-basePitch,Math.min(70*Math.PI/180-basePitch,orbit.current.pitch))
    }
    const up=(event:PointerEvent)=>{pointers.delete(event.pointerId);if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId)}
    let lastDistance = 0
    const start = (event: TouchEvent) => {
      touch()

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

    }
    const key = (event: KeyboardEvent) => {
      if (!['+', '=', '-', '_', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
      event.preventDefault(); touch()
      const inward = ['+', '=', 'ArrowUp'].includes(event.key)
      controller.current.target = clampScale(controller.current.target + (inward ? -0.2 : 0.2))
      controller.current.flight = null
    }
    canvas.addEventListener('wheel', wheel, { passive: false })
    canvas.addEventListener('pointerdown',down)
    canvas.addEventListener('pointermove',drag)
    canvas.addEventListener('pointerup',up)
    canvas.addEventListener('pointercancel',up)
    canvas.addEventListener('touchstart', start, { passive: false })
    canvas.addEventListener('touchmove', move, { passive: false })
    canvas.addEventListener('touchend', end)
    canvas.addEventListener('touchcancel', end)
    canvas.addEventListener('keydown', key)
    return () => {
      canvas.removeEventListener('wheel', wheel); canvas.removeEventListener('pointerdown',down); canvas.removeEventListener('pointermove',drag); canvas.removeEventListener('pointerup',up); canvas.removeEventListener('pointercancel',up)
      canvas.removeEventListener('touchstart', start); canvas.removeEventListener('touchmove', move); canvas.removeEventListener('touchend', end); canvas.removeEventListener('touchcancel', end); canvas.removeEventListener('keydown', key)
    }
  }, [gl, size.height, controller])
  const cameraDistance = 100 / (2 * Math.tan(Math.PI / 12) * (size.width / size.height))
  useLayoutEffect(() => {
    if (!(camera instanceof T.PerspectiveCamera)) return
    camera.fov=30; camera.aspect=size.width/size.height
    camera.setViewOffset(size.width,size.height,-size.width*(size.width>=720?0.085:0),0,size.width,size.height)
    camera.position.normalize().multiplyScalar(cameraDistance)
    camera.updateProjectionMatrix()
    onScale(controller.current.current,size.width)
  }, [camera,size,cameraDistance,onScale,controller])
  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.08), c = controller.current
    if (lastReset.current !== c.reset) {
      orbit.current={yaw:0,pitch:0,currentYaw:0,currentPitch:0}
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
      orbit.current.yaw+=delta*Math.PI/1800
    }
    const pose=getCameraPose(c.current), movement=orbit.current
    movement.currentYaw=T.MathUtils.damp(movement.currentYaw,movement.yaw,14,delta)
    movement.currentPitch=T.MathUtils.damp(movement.currentPitch,movement.pitch,14,delta)
    const yaw=pose.yaw+movement.currentYaw, pitch=Math.max(-20*Math.PI/180,Math.min(70*Math.PI/180,pose.pitch+movement.currentPitch))
    camera.position.set(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)).multiplyScalar(cameraDistance)
    camera.up.set(Math.sin(pose.roll),Math.cos(pose.roll),0)
    // The selected lens can migrate. Carry the last part of the dive with its
    // actual wall pose, so the same granum remains the optical target.
    focusFrame.rotation.fromArray(physiology.current.chloroplasts.poses[0].quaternion).multiply(focusFrame.inverseInitial)
    focusFrame.blend.identity().slerp(focusFrame.rotation,smoothstep(-4.85,-5.5,c.current))
    camera.position.applyQuaternion(focusFrame.blend);camera.up.applyQuaternion(focusFrame.blend);camera.lookAt(0,0,0)
    gl.domElement.dataset.yaw=(yaw*180/Math.PI).toFixed(2);gl.domElement.dataset.pitch=(pitch*180/Math.PI).toFixed(2)
    if (state.clock.elapsedTime - lastReport.current > 0.065) {
      onScale(c.current, size.width); lastReport.current = state.clock.elapsedTime
      gl.domElement.dataset.scale = c.current.toFixed(5)
    }
  }, -3)
  return null
}

function Contents(props: SceneProps) {
  const root = useRef<T.Group>(null), lens = useRef<T.Group>(null), clock = useRef(0), lastSnapshot = useRef(-1)
  const { mobile, controller, inputs, physiology, onPhysiology } = props
  const snapshot = getPhysiologySnapshot(physiology.current, inputs)
  const light = snapshot.actualPPFD, brightness = getLightAppearance(light).brightness
  const skipElapsed = useRef(false)
  useEffect(() => {
    const change=()=>{skipElapsed.current=true}
    document.addEventListener('visibilitychange',change)
    return ()=>document.removeEventListener('visibilitychange',change)
  }, [])
  useFrame(({clock: renderClock, gl}, delta) => {
    const paused=isWorldPaused()||document.hidden
    advancePhysiology(physiology.current, paused ? {...inputs,playing:false}:inputs, skipElapsed.current ? 0 : delta)
    skipElapsed.current=false
    clock.current=physiology.current.simulationSeconds
    gl.domElement.dataset.simulationSeconds=clock.current.toFixed(3)
    gl.domElement.dataset.actualPpfd=physiology.current.actualPPFD.toFixed(2)
    if(renderClock.elapsedTime-lastSnapshot.current>=.2){onPhysiology(getPhysiologySnapshot(physiology.current,inputs));lastSnapshot.current=renderClock.elapsedTime}
  },-4)
  useFrame((_, delta) => {
    const scale = controller.current.current
    const factor = 100 / 10 ** (scale + 6)
    const focus = physiology.current.chloroplasts.poses[0]
    const anchor = getAnchorUm(scale,focus)
    if (root.current) {
      root.current.scale.setScalar(factor)
      root.current.position.set(-anchor[0] * factor, -anchor[1] * factor, -anchor[2] * factor)
    }
    if(lens.current){lens.current.position.fromArray(focus.positionUm);lens.current.quaternion.fromArray(focus.quaternion)}
  }, -2)
  const layers = useMemo(() => <>
    <ScaleLayer layer="leaf" controller={controller}><LeafLayer opacity={1} mobile={mobile} stomataOpen={snapshot.stomatalOpening} /></ScaleLayer>
    <ScaleLayer layer="section" controller={controller}><SectionLayer opacity={1} mobile={mobile} stomataOpen={snapshot.stomatalOpening} /></ScaleLayer>
    <ScaleLayer layer="cell" controller={controller}><CellLayer opacity={1} light={brightness} clock={clock} mobile={mobile} physiology={physiology} timeScale={inputs.timeScale} starch={snapshot.starchFraction} /></ScaleLayer>
    <ScaleLayer layer="chloroplast" controller={controller}><group ref={lens} position={CHLOROPLAST_ANCHOR_UM} rotation={CHLOROPLAST_ROTATION}><ChloroplastLayer opacity={1} mobile={mobile} light={light} starch={snapshot.starchFraction} /></group></ScaleLayer>
  </>, [controller, mobile, brightness, physiology, inputs.timeScale, light, snapshot.starchFraction, snapshot.stomatalOpening])
  return <>
    <color attach="background" args={['#04080a']} />
    <ambientLight color="#879b91" intensity={0.08 + brightness * 0.16} />
    <hemisphereLight args={['#ddd8b7', '#304640', 0.1 + brightness * 0.18]} />
    <directionalLight position={[-12,85,26]} color="#ffecc8" intensity={0.08+brightness*4.3} castShadow shadow-mapSize={[mobile?1024:2048,mobile?1024:2048]} shadow-camera-left={-65} shadow-camera-right={65} shadow-camera-top={65} shadow-camera-bottom={-65} shadow-camera-near={1} shadow-camera-far={250} shadow-bias={-0.0004} shadow-normalBias={0.08} shadow-radius={4} />
    <directionalLight position={[35, 10, -30]} color="#cfe0c5" intensity={0.04 + brightness * 0.45} />
    <directionalLight position={[-20, -35, 10]} color="#3f6f78" intensity={0.07} />
    <group ref={root}>{layers}</group>
    <CameraAndScale {...props} />
    <EffectComposer multisampling={0}>
      <DepthOfField target={[0,0,0]} focusRange={42} bokehScale={mobile?2:4} height={mobile ? 400 : 700} />
      <Bloom intensity={0.06} luminanceThreshold={0.85} luminanceSmoothing={0.5} mipmapBlur />
      <Noise blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.1} />
      <Vignette offset={0.3} darkness={0.55} />
      <SMAA />
    </EffectComposer>
  </>
}

export function PlantScene(props: SceneProps) {
  return <div className="pc-scene">
    <Canvas shadows={{type:T.PCFShadowMap}} camera={{ position: [65,37,94], fov:30, near:0.1, far:2200 }} onCreated={({gl})=>{gl.localClippingEnabled=true}} dpr={props.mobile ? [1, 1.25] : [1, 1.5]} gl={{ antialias: false, powerPreference: 'high-performance', toneMapping: T.ACESFilmicToneMapping, toneMappingExposure: 1.25 }}>
      <Suspense fallback={null}><Contents {...props} /></Suspense>
    </Canvas>
  </div>
}

export function flyToScale(controller: ScaleController, target: number) {
  const to = clampScale(target)
  controller.touched = true; controller.target = to
  controller.flight = { from: controller.current, to, elapsed: 0, duration: zoomFlightDuration(controller.current, to) }
}
