import { useMemo, useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import { useExperienceI18n } from '~/i18n/experience'
import { latLonToVec3, solarCoordsAt, type Place } from './earth-spin-orbit-model'
import type { Topic } from './earth-teaching'

const point = (lat: number, lon: number, r = 1.018): [number, number, number] => {
  const p = latLonToVec3(lat, lon, r); return [p.x, p.y, p.z]
}
function GlobeLabel({ lat, lon, text, color = '#e9d5a9' }: { lat: number; lon: number; text: string; color?: string }) {
  const anchor = useRef<THREE.Group>(null)
  const label = useRef<HTMLSpanElement>(null)
  const { camera } = useThree()
  const scratch = useMemo(() => ({ p: new THREE.Vector3(), centre: new THREE.Vector3(), normal: new THREE.Vector3(), eye: new THREE.Vector3() }), [])
  useFrame(() => {
    if (!anchor.current || !label.current || !anchor.current.parent) return
    anchor.current.getWorldPosition(scratch.p)
    anchor.current.parent.getWorldPosition(scratch.centre)
    scratch.normal.copy(scratch.p).sub(scratch.centre).normalize()
    scratch.eye.copy(camera.position).sub(scratch.p).normalize()
    label.current.style.visibility = scratch.normal.dot(scratch.eye) > 0.1 ? 'visible' : 'hidden'
  })
  return <group ref={anchor} position={point(lat, lon, 1.045)}><Html center zIndexRange={[3, 0]} style={{ pointerEvents: 'none' }}><span ref={label} className="eso-globe-label" style={{ color }} data-experience-overlay="true">{text}</span></Html></group>
}
export function EarthTeachingOverlays({ topic, epoch, lat, lon, labels, compare, projection }: {
  topic: Topic; epoch: number; lat: number; lon: number; labels: boolean; compare?: Place; projection: boolean
}) {
  const tx = useExperienceI18n()
  const solar = solarCoordsAt(epoch)
  const sun = new THREE.Vector3(...point(solar.subsolarLat, solar.subsolarLon, 1))
  const geometry = useMemo(() => {
    const positions: number[] = [], colors: number[] = []
    const light = new THREE.Color('#efc77d'), dark = new THREE.Color('#738fe0')
    const normal = new THREE.Vector3(...point(solar.subsolarLat, solar.subsolarLon, 1))
    for (let i = 0; i <= 240; i++) {
      const p = point(lat, i * 1.5)
      positions.push(...p)
      const c = new THREE.Vector3(...p).dot(normal) >= 0 ? light : dark
      colors.push(c.r, c.g, c.b)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    return g
  }, [lat, solar.subsolarLat, solar.subsolarLon])
  useEffect(() => () => geometry.dispose(), [geometry])
  const coordinates = topic === 'coordinates' || topic === 'time'
  const daylight = ['daylight', 'seasons', 'solar'].includes(topic)
  const width = projection ? 2.5 : 1.4
  const terminators = useMemo(() => {
    const n = new THREE.Vector3(...point(solar.subsolarLat, solar.subsolarLon, 1))
    const a = new THREE.Vector3(0, 1, 0).addScaledVector(n, -n.y).normalize()
    const b = new THREE.Vector3().crossVectors(n, a).normalize()
    return [1, -1].map(sign => Array.from({ length: 101 }, (_, i) => {
      const t = Math.PI * i / 100
      const p = a.clone().multiplyScalar(Math.cos(t)).addScaledVector(b, sign * Math.sin(t)).multiplyScalar(1.02)
      return p.toArray() as [number, number, number]
    }))
  }, [solar.subsolarLat, solar.subsolarLon])
  return <group>
    {coordinates && <>
      <Line points={Array.from({ length: 145 }, (_, i) => point(lat, i * 2.5))} color="#edc67e" lineWidth={width} />
      <Line points={Array.from({ length: 91 }, (_, i) => point(i * 2 - 90, lon))} color="#87d4f2" lineWidth={width} />
      <Line points={Array.from({ length: 91 }, (_, i) => point(i * 2 - 90, 0))} color="#d4dae5" lineWidth={1} dashed dashSize={0.05} gapSize={0.03} />
      {labels && <>
        <GlobeLabel lat={lat} lon={lon + 20} text={`${tx('纬度')} ${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}`} />
        <GlobeLabel lat={Math.min(80, lat + 20)} lon={lon} text={`${tx('经度')} ${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'}`} color="#87d4f2" />
        <GlobeLabel lat={0} lon={0} text={tx('本初子午线')} color="#d4dae5" />
      </>}
    </>}
    {daylight && <>
      <Line points={Array.from({ length: 26 }, (_, i) => point(0, lon - 18 + i, 1.07))} color="#d9dfe4" lineWidth={1.1} />
      <arrowHelper args={[new THREE.Vector3(...point(0, lon + 10, 1.07)).sub(new THREE.Vector3(...point(0, lon + 7, 1.07))).normalize(), new THREE.Vector3(...point(0, lon + 7, 1.07)), 0.07, '#d9dfe4', 0.04, 0.025]} />
      {labels && <GlobeLabel lat={-4} lon={lon} text={tx('自西向东')} color="#d9dfe4" />}
      <lineLoop geometry={geometry}><lineBasicMaterial vertexColors /></lineLoop>
      <Line points={terminators[0]} color="#e8bb78" lineWidth={width} />
      <Line points={terminators[1]} color="#a291d8" lineWidth={width} />
      {labels && <>
        <GlobeLabel lat={0} lon={solar.subsolarLon - 90} text={tx('晨线')} color="#e8bb78" />
        <GlobeLabel lat={0} lon={solar.subsolarLon + 90} text={tx('昏线')} color="#b5a2f0" />
      </>}
    </>}
    {topic !== 'explore' && topic !== 'coordinates' && <>
      <arrowHelper args={[sun.clone().negate(), sun.clone().multiplyScalar(1.4), 0.35, '#f6dc9b', 0.08, 0.045]} />
      <mesh position={sun.clone().multiplyScalar(1.027)}><sphereGeometry args={[0.012, 12, 8]} /><meshBasicMaterial color="#ffe3a0" /></mesh>
      {labels && <GlobeLabel lat={solar.subsolarLat} lon={solar.subsolarLon} text={tx('太阳直射点')} />}
    </>}
    {topic === 'zones' && <>
      {[{ low: -23.44, high: 23.44, color: '#e6bd71' }, { low: 23.44, high: 66.56, color: '#8bc9ab' }, { low: -66.56, high: -23.44, color: '#8bc9ab' }, { low: 66.56, high: 90, color: '#98b5ed' }, { low: -90, high: -66.56, color: '#98b5ed' }].map(b => <mesh key={b.low}>
        <sphereGeometry args={[1.013, 96, 24, 0, Math.PI * 2, (90 - b.high) * Math.PI / 180, (b.high - b.low) * Math.PI / 180]} />
        <meshBasicMaterial color={b.color} transparent opacity={0.16} depthWrite={false} />
      </mesh>)}
      {labels && [{ lat: 0, label: '赤道' }, { lat: 23.44, label: '北回归线' }, { lat: -23.44, label: '南回归线' }, { lat: 66.56, label: '北极圈' }, { lat: -66.56, label: '南极圈' }].map(l => <GlobeLabel key={l.label} lat={l.lat} lon={lon} text={`${tx(l.label)} · ${Math.abs(l.lat).toFixed(2)}°`} />)}
    </>}
    {compare && <>
      <mesh position={point(compare.lat, compare.lon, 1.025)}><sphereGeometry args={[0.013, 12, 8]} /><meshBasicMaterial color="#9cd8d5" /></mesh>
      {coordinates && <Line points={Array.from({ length: 91 }, (_, i) => point(i * 2 - 90, compare.lon))} color="#9cd8d5" lineWidth={1.2} />}
      {labels && <GlobeLabel lat={compare.lat} lon={compare.lon} text={tx(compare.name)} color="#9cd8d5" />}
    </>}
    {labels && topic !== 'explore' && <><GlobeLabel lat={89} lon={0} text={tx('北极')} /><GlobeLabel lat={-89} lon={0} text={tx('南极')} /></>}
  </group>
}
