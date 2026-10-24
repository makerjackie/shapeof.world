import { useEffect, useRef, type ComponentRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as T from 'three'
import type { DesignSpec } from '../sim/types'

export type CameraPreset = 'overview' | 'top' | 'close' | 'low'
export function CameraRig({ design, preset, revision, reducedMotion, onInteract }: { design: DesignSpec; preset: CameraPreset; revision: number; reducedMotion: boolean; onInteract: () => void }) {
  const control = useRef<ComponentRef<typeof OrbitControls>>(null)
  const { camera, size } = useThree()
  const lastInteraction = useRef(-Infinity)
  const flight = useRef<{ from: T.Vector3; to: T.Vector3; targetFrom: T.Vector3; target: T.Vector3; elapsed: number } | null>(null)
  const mounted = useRef(false)
  useEffect(() => {
    const firstView = !mounted.current
    const urban = design.chapter === 1, service = design.chapter === 2, mobile = size.width < 720
    const position = design.camera.position, focus = design.camera.target
    let to = new T.Vector3(position.x, position.y, position.z), target = new T.Vector3(focus.x, focus.y, focus.z)
    if (preset === 'top') {
      to = new T.Vector3(0, urban ? 250 : service ? (mobile ? 700 : 450) : 850, 1)
      if (design.id === 'cloverleaf') {
        // Include the outer ramp terminals at ±330 m. Offset the nadir so
        // all sixteen conflict markers stay clear of the bottom controls.
        target.set(0, 0, mobile ? 180 : 80)
        to.set(0, mobile ? 2000 : 1300, target.z + 1)
      }
    }
    if (preset === 'close') { to = new T.Vector3(urban ? 40 : 110, urban ? 45 : 74, urban ? 75 : 115); target = new T.Vector3(urban ? 0 : 40, 3, urban ? 0 : 25) }
    if (preset === 'low') { to = new T.Vector3(urban ? 15 : 78, urban ? 8 : 22, urban ? 80 : 230); target = new T.Vector3(0, 2, 0) }
    if (preset === 'overview') {
      // A 22 degree view through a 60 degree vertical lens leaves the horizon
      // at 15% height while preserving the interchange in the lower two thirds.
      if (urban && design.id !== 'continuous-flow') { to.set(74, 72, 98); target.set(0, 0, 0) }
      else if (service) { to.set(0, 150, 280); target.set(0, 12, 0) }
      else if (design.id === 'cloverleaf') { to.set(225, 164, 290); target.set(0, 10, 0) }
      else if (design.chapter === 4) { to.set(250,170,310); target.set(0,28,-15) }
    }
    if (mobile && preset === 'overview') {
      if (urban && design.id !== 'continuous-flow') to.set(96, 98, 118)
      else if (service) { to.set(0, 230, 370); target.set(0, 8, 0) }
      else if (design.id === 'cloverleaf') { to.set(400, 360, 570); target.set(0, 16, 0) }
      else { to.sub(target).multiplyScalar(1.45).add(target) }
    }
    if (design.id === 'continuous-flow' && preset === 'top') to.set(0,mobile ? 780 : 550,1)
    if (design.chapter === 4 && preset !== 'overview') {
      target.set(focus.x, focus.y, focus.z)
      if (preset === 'top') to.set(focus.x, focus.y + (mobile ? 2300 : 1900), focus.z + 1)
      if (preset === 'close') to.set(focus.x + 190, focus.y + 145, focus.z + 245)
      if (preset === 'low') to.set(focus.x + 220, focus.y + 38, focus.z + 360)
    }
    const perspective = camera as T.PerspectiveCamera
    perspective.fov = preset === 'overview' ? (urban ? (mobile ? 58 : design.id === 'continuous-flow' ? 55 : 48) : (service ? (mobile ? 60 : 52) : (mobile ? 60 : design.id === 'cloverleaf' ? 60 : design.camera.fov ?? 55))) : (mobile ? 50 : 42); perspective.updateProjectionMatrix()
    if (!mounted.current || reducedMotion) {
      camera.position.copy(to); control.current?.target.copy(target); camera.lookAt(target)
      mounted.current = true
    } else flight.current = { from: camera.position.clone(), to, targetFrom: control.current?.target.clone() ?? new T.Vector3(), target, elapsed: 0 }
    lastInteraction.current = firstView ? -Infinity : performance.now()
  }, [design, preset, revision, camera, size.width, reducedMotion])
  useFrame((_, delta) => {
    const controls = control.current
    if (!controls) return
    const move = flight.current
    if (move) {
      move.elapsed += Math.min(delta, 0.1)
      const t = Math.min(1, move.elapsed / 1.5), ease = t * t * (3 - 2 * t)
      camera.position.lerpVectors(move.from, move.to, ease)
      camera.position.y += Math.sin(t * Math.PI) * (design.id === 'cloverleaf' ? 65 : 25)
      controls.target.lerpVectors(move.targetFrom, move.target, ease)
      controls.autoRotate = false; controls.update()
      if (t === 1) flight.current = null
    } else controls.autoRotate = !reducedMotion && performance.now() - lastInteraction.current > 8000 && preset !== 'top'
  })
  return <OrbitControls ref={control} makeDefault enableDamping dampingFactor={0.08} minDistance={30} maxDistance={2500} maxPolarAngle={Math.PI / 2 - 0.025} minPolarAngle={0.015} autoRotateSpeed={0.1}
    onStart={() => { lastInteraction.current = performance.now(); flight.current = null; onInteract() }} onEnd={() => { lastInteraction.current = performance.now() }} />
}
