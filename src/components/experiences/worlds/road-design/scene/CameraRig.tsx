import type { MutableRefObject } from 'react'
import type { ExploreRoute } from '../explorer/routes'
import type { DemoState } from '../explorer/replay'
import { useEffect, useRef, type ComponentRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as T from 'three'
import { PRESENTATIONS } from '../presentation'
import type { DesignInfo } from '../designs/catalogue'

export type CameraPreset = 'overview' | 'top' | 'close' | 'low'
export function CameraRig({ design, preset, revision, reducedMotion, onInteract, route, follow = false, demo, onStopFollow }: { design: DesignInfo; preset: CameraPreset; revision: number; reducedMotion: boolean; onInteract: () => void; route?: ExploreRoute; follow?:boolean; demo?:MutableRefObject<DemoState>; onStopFollow?:()=>void }) {
  const control = useRef<ComponentRef<typeof OrbitControls>>(null)
  const { camera, size, gl } = useThree()
  const flight = useRef<{ from: T.Vector3; to: T.Vector3; targetFrom: T.Vector3; target: T.Vector3; elapsed: number } | null>(null)
  const mounted = useRef(false)
  const coreFocused=useRef(false),manual=useRef(false)
  useEffect(() => {
    coreFocused.current=false;manual.current=false
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
    if (route) {
      const box=new T.Box3().setFromPoints(route.path.points.map(p=>new T.Vector3(p.x,p.y,p.z)))
      const center=box.getCenter(new T.Vector3()), span=box.getSize(new T.Vector3())
      const radius=span.length()/2
      perspective.fov=mobile?52:42
      const available=mobile ? .66 : .84
      const angle=Math.min(perspective.fov*Math.PI/360,Math.atan(Math.tan(perspective.fov*Math.PI/360)*size.width/size.height))
      const distance=Math.max(150,radius/Math.sin(angle)/Math.max(.24,available))
      target.copy(center)
      to.copy(center).add((preset==='top'?new T.Vector3(0,1,.001):new T.Vector3(.28,.87,.40)).normalize().multiplyScalar(distance))
      // Move the projected route into the unobstructed upper half on phones.
      if(mobile){const shift=distance*.12;target.z+=shift;to.z+=shift}
    }
    perspective.updateProjectionMatrix()
    if (!mounted.current || reducedMotion) {
      camera.position.copy(to); control.current?.target.copy(target); camera.lookAt(target)
      mounted.current = true
    } else flight.current = { from: camera.position.clone(), to, targetFrom: control.current?.target.clone() ?? new T.Vector3(), target, elapsed: 0 }
  }, [design, preset, revision, camera, size.width, size.height, reducedMotion, route])
  useFrame((_, delta) => {
    const controls = control.current
    if (!controls) return
    if(follow&&route&&demo&&demo.current.status!=='loading') {
      const {position:p,tangent:t}=demo.current,urban=design.chapter===1,back=urban?44:105,height=urban?37:72
      const target=new T.Vector3(p.x+t.x*12,p.y+2,p.z+t.z*12)
      const to=new T.Vector3(p.x-t.x*back,p.y+height,p.z-t.z*back)
      const ease=1-Math.exp(-Math.min(delta,.1)*3)
      camera.position.lerp(to,ease);controls.target.lerp(target,ease);controls.autoRotate=false;controls.update();flight.current=null;return
    }
    if(route&&demo&&!coreFocused.current&&!manual.current&&demo.current.at>3) {
      const box=new T.Box3().setFromPoints(route.focusPoints.map(p=>new T.Vector3(p.x,p.y,p.z)))
      const p=demo.current.position
      if(box.clone().expandByScalar(80).containsPoint(new T.Vector3(p.x,p.y,p.z))) {
        const mobile=size.width<720, center=box.getCenter(new T.Vector3()),span=box.getSize(new T.Vector3())
        // Frame the junction at useful scale, while the full route remains lit.
        const r=Math.max(45,span.length()*.5),available=mobile?.82:.82
        const fov=(camera as T.PerspectiveCamera).fov*Math.PI/360
        const angle=Math.min(fov,Math.atan(Math.tan(fov)*size.width/size.height))
        const distance=r/Math.sin(angle)/available
        const target=center.clone(),to=center.clone().add((preset==='top'?new T.Vector3(0,1,.001):new T.Vector3(.38,.79,.48)).normalize().multiplyScalar(distance))
        if(mobile){target.z+=distance*.12;to.z+=distance*.12}
        else {target.x+=distance*.09;to.x+=distance*.09}
        flight.current={from:camera.position.clone(),to,targetFrom:controls.target.clone(),target,elapsed:0};coreFocused.current=true
      }
    }
    const move = flight.current
    if (move) {
      move.elapsed += Math.min(delta, 0.1)
      const t = Math.min(1, move.elapsed / 1.5), ease = t * t * (3 - 2 * t)
      camera.position.lerpVectors(move.from, move.to, ease)
      camera.position.y += Math.sin(t * Math.PI) * (design.id === 'cloverleaf' ? 65 : 25)
      controls.target.lerpVectors(move.targetFrom, move.target, ease)
      controls.autoRotate = false; controls.update()
      if (t === 1) flight.current = null
    } else controls.autoRotate = false // Keep entry targets still while the reader chooses a flow.
  })
  return <OrbitControls ref={control} makeDefault enableDamping dampingFactor={0.08} minDistance={30} maxDistance={12000} maxPolarAngle={Math.PI / 2 - 0.025} minPolarAngle={0.015} autoRotateSpeed={0.1} touches={{ ONE: T.TOUCH.ROTATE, TWO: T.TOUCH.DOLLY_PAN }}
    onChange={() => { gl.domElement.dataset.camera = camera.position.toArray().map(n=>n.toFixed(2)).join(',') }}
    onStart={() => { flight.current = null; manual.current=true; onStopFollow?.(); onInteract() }} />
}
