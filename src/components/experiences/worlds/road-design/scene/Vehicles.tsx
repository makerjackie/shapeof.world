import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as T from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { TrafficRuntime } from './runtime'

const CAPACITY = 6000
const PAINT = ['#a7aaa8', '#252c32', '#4e5960', '#48555e', '#5c3331', '#c4bfb1', '#1a242e']
export function Vehicles({ runtime }: { runtime: TrafficRuntime }) {
  const body = useRef<T.InstancedMesh>(null), cabin = useRef<T.InstancedMesh>(null), lights = useRef<T.InstancedMesh>(null), indicators = useRef<T.InstancedMesh>(null)
  const { o, color, cameraDirection } = useMemo(() => ({ o: new T.Object3D(), color: new T.Color(), cameraDirection: new T.Vector3() }), [])
  const shell = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 1, 0.08), [])
  useEffect(() => () => shell.dispose(), [shell])
  useFrame(({ camera }) => {
    if (!body.current || !cabin.current || !lights.current || !indicators.current) return
    const cars = runtime.simulation.vehicles
    let lamp = 0, indicator = 0
    const count = Math.min(cars.length, CAPACITY)
    for (let i = 0; i < count; i++) {
      const car = cars[i], { position: p, tangent: t } = runtime.simulation.sampleVehicle(car)
      const angle = Math.atan2(t.x, t.z)
      o.rotation.set(-Math.atan2(t.y, Math.hypot(t.x, t.z)), angle, 0)
      o.position.set(p.x, p.y + (car.heavy ? 1.05 : 0.58), p.z)
      o.scale.set(car.width, car.heavy ? 1.7 : 0.65, car.length); o.updateMatrix()
      body.current.setMatrixAt(i, o.matrix); body.current.setColorAt(i, color.set(PAINT[car.id % PAINT.length]))
      o.position.set(p.x - t.x * 0.15, p.y + (car.heavy ? 2.1 : 1.14), p.z - t.z * 0.15)
      o.scale.set(car.width * 0.84, car.heavy ? 0.75 : 0.6, car.length * (car.heavy ? 0.73 : 0.52)); o.updateMatrix(); cabin.current.setMatrixAt(i, o.matrix)
      cameraDirection.set(camera.position.x - p.x, camera.position.y - p.y, camera.position.z - p.z).normalize()
      const facing = t.x * cameraDirection.x + t.y * cameraDirection.y + t.z * cameraDirection.z
      for (const head of [-1, 1]) for (const side of [-1, 1]) {
        o.position.set(p.x + t.x * car.length / 2 * head - t.z * side * car.width * 0.36, p.y + 0.70, p.z + t.z * car.length / 2 * head + t.x * side * car.width * 0.36)
        o.scale.set(0.3, 0.16, 0.14); o.updateMatrix(); lights.current.setMatrixAt(lamp, o.matrix)
        const gain = 0.10 + Math.pow(Math.max(0, facing * head), 1.6)
        color.setRGB(...(head > 0 ? [7 * gain, 6.1 * gain, 4.7 * gain] : [5 * gain * (car.a < -0.6 ? 1.8 : 1), 0.2 * gain, 0.08 * gain]) as [number, number, number])
        lights.current.setColorAt(lamp++, color)
      }
      if (car.laneChange && Math.floor(runtime.simulation.time * 3) % 2 === 0) {
        const side = car.laneChange.direction === 'left' ? -1 : 1
        for (const end of [-1, 1]) {
          o.position.set(p.x + t.x * car.length * 0.48 * end - t.z * side * car.width * 0.48, p.y + 0.8, p.z + t.z * car.length * 0.48 * end + t.x * side * car.width * 0.48)
          o.scale.set(0.22, 0.18, 0.2); o.updateMatrix(); indicators.current.setMatrixAt(indicator++, o.matrix)
        }
      }
    }
    body.current.count = cabin.current.count = count; lights.current.count = lamp; indicators.current.count = indicator
    for (const mesh of [body.current, cabin.current, lights.current, indicators.current]) { mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true }
  })
  return <>
    <instancedMesh ref={body} args={[shell, undefined, CAPACITY]} frustumCulled={false}><meshStandardMaterial roughness={0.35} metalness={0.35} /></instancedMesh>
    <instancedMesh ref={cabin} args={[shell, undefined, CAPACITY]} frustumCulled={false}><meshStandardMaterial color="#1c2b35" roughness={0.18} metalness={0.6} /></instancedMesh>
    <instancedMesh ref={lights} args={[undefined, undefined, CAPACITY * 4]} frustumCulled={false}><boxGeometry /><meshBasicMaterial toneMapped={false} /></instancedMesh>
    <instancedMesh ref={indicators} args={[undefined, undefined, CAPACITY * 2]} frustumCulled={false}><boxGeometry /><meshBasicMaterial color={[6, 2.4, 0.1]} toneMapped={false} /></instancedMesh>
  </>
}
