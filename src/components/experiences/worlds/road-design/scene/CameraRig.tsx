import { useEffect, useRef, type ComponentRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as T from 'three'
import { PRESENTATIONS } from '../presentation'
import type { DesignSpec } from '../sim/types'

export type CameraPreset = 'overview' | 'top' | 'close' | 'low'
export function CameraRig({ design, preset, revision, reducedMotion, onInteract }: { design: DesignSpec; preset: CameraPreset; revision: number; reducedMotion: boolean; onInteract: () => void }) {
  const control = useRef<ComponentRef<typeof OrbitControls>>(null)
  const { camera, size, gl } = useThree()
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
      if (['cloverleaf', 'stack', 'turbine'].includes(design.id)) {
        // Same metres per pixel for the three system interchanges. Offset so
        // all sixteen conflict markers stay clear of the bottom controls.
        target.set(0, 0, mobile ? 180 : 80)
        to.set(0, 2500, target.z + 1)
      }
    }
    if (preset === 'close') { to = new T.Vector3(urban ? 40 : 110, urban ? 45 : 74, urban ? 75 : 115); target = new T.Vector3(urban ? 0 : 40, 3, urban ? 0 : 25) }
    if (preset === 'low') { to = new T.Vector3(urban ? 15 : 78, urban ? 8 : 22, urban ? 80 : 230); target = new T.Vector3(0, 2, 0) }
    if (preset === 'overview') {
      const view = PRESENTATIONS[design.id]
      to.fromArray(mobile ? view.mobile : view.position)
      target.fromArray(mobile && view.mobileTarget ? view.mobileTarget : view.target)
    }
    if (design.id === 'continuous-flow' && preset === 'top') to.set(0,mobile ? 780 : 550,1)
    if (design.chapter === 4 && preset !== 'overview') {
      target.set(focus.x, focus.y, focus.z)
      if (preset === 'top') to.set(focus.x, focus.y + (mobile ? 2300 : 1900), focus.z + 1)
      if (preset === 'close') to.set(focus.x + 190, focus.y + 145, focus.z + 245)
      if (preset === 'low') to.set(focus.x + 220, focus.y + 38, focus.z + 360)
    }
    const perspective = camera as T.PerspectiveCamera
    const view = PRESENTATIONS[design.id]
    perspective.fov = preset === 'overview' ? (mobile ? view.mobileFov ?? view.fov + 6 : view.fov) : (mobile ? 54 : 42)
    perspective.updateProjectionMatrix()
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
  return <OrbitControls ref={control} makeDefault enableDamping dampingFactor={0.08} minDistance={30} maxDistance={2500} maxPolarAngle={Math.PI / 2 - 0.025} minPolarAngle={0.015} autoRotateSpeed={0.1} touches={{ ONE: T.TOUCH.ROTATE, TWO: T.TOUCH.DOLLY_PAN }}
    onChange={() => { gl.domElement.dataset.camera = camera.position.toArray().map(n=>n.toFixed(2)).join(',') }}
    onStart={() => { lastInteraction.current = performance.now(); flight.current = null; onInteract() }} onEnd={() => { lastInteraction.current = performance.now() }} />
}
