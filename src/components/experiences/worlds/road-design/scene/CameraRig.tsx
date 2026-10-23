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
    const urban = design.id !== 'cloverleaf', mobile = size.width < 720
    const position = design.camera.position, focus = design.camera.target
    let to = new T.Vector3(position.x, position.y, position.z), target = new T.Vector3(focus.x, focus.y, focus.z)
    if (preset === 'top') to = new T.Vector3(0, urban ? 250 : 850, 1)
    if (preset === 'close') { to = new T.Vector3(urban ? 40 : 110, urban ? 45 : 74, urban ? 75 : 115); target = new T.Vector3(urban ? 0 : 40, 3, urban ? 0 : 25) }
    if (preset === 'low') { to = new T.Vector3(urban ? 15 : 78, urban ? 8 : 22, urban ? 80 : 230); target = new T.Vector3(0, 2, 0) }
    if (preset === 'overview' && !urban) { to.multiplyScalar(1.14); target.y = 35 }
    if (mobile && preset === 'overview') {
      if (urban) to.multiplyScalar(1.6)
      else to.set(475, 675, 495)
    }
    const perspective = camera as T.PerspectiveCamera
    perspective.fov = mobile ? 48 : (design.camera.fov ?? 35); perspective.updateProjectionMatrix()
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
