import { useEffect, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import * as T from 'three'
import { useExperienceI18n } from '~/i18n/experience'
import { COMPRESSION, PALETTE, TENSION } from './palette'
import type { BridgeKind, Point } from './model'
import { spanResponse } from './span-model'

function Bar({ a, b, r, color, glow = 0 }: { a: Point; b: Point; r: number; color: string; glow?: number }) {
  const start = new T.Vector3(...a), d = new T.Vector3(...b).sub(start)
  return <mesh position={start.addScaledVector(d, .5)} quaternion={new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d.clone().normalize())} scale={[r, d.length(), r]} castShadow>
    <cylinderGeometry args={[1, 1, 1, 8]} /><meshStandardMaterial color={color} roughness={glow ? .5 : .88} emissive={color} emissiveIntensity={glow} />
  </mesh>
}
function Box({ at, size, color = PALETTE.plaster }: { at: Point; size: Point; color?: string }) {
  return <mesh position={at} receiveShadow castShadow><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={.92} /></mesh>
}
function SpanCamera({ span, height, reset, front }: { span: number; height: number; reset: number; front: boolean }) {
  const { camera, size } = useThree()
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null)
  useEffect(() => {
    const verticalScale = size.width < 700 ? 2 : 1
    const target = new T.Vector3(0, (30 + height / 2) * verticalScale, 0)
    camera.position.copy(target).add(new T.Vector3(front ? 0 : 160, front ? 0 : 170, 700))
    camera.lookAt(target)
    if (camera instanceof T.OrthographicCamera) {
      camera.zoom = Math.min(size.width / Math.max(250, span * 1.5 + 160), size.height / (Math.max(160, height + 125) * verticalScale))
      camera.updateProjectionMatrix()
    }
    controls.current?.target.copy(target)
    controls.current?.update()
  }, [camera, size.width, size.height, span, height, reset, front])
  return <OrbitControls ref={controls} enablePan={false} enableDamping={false} minZoom={.08} maxZoom={30} minPolarAngle={.05} maxPolarAngle={Math.PI * .49} />
}
function Bridge({ kind, span }: { kind: BridgeKind; span: number }) {
  const tx = useExperienceI18n()
  const r = spanResponse(kind, span), viable = r.utilization <= 1
  const red = viable ? COMPRESSION : PALETTE.dim, blue = viable ? TENSION : PALETTE.dim, glow = viable ? .32 : 0
  const white = PALETTE.plaster, L = span, half = L / 2, deck = 40
  const radius = Math.max(.5, Math.min(2.7, L / 220))
  const arch = (x: number) => deck + 4 * r.height * (x + half) * (half - x) / L ** 2
  const cable = (x: number) => deck + r.height - .1 * L * (1 - (x / half) ** 2)
  const reach = L * .25 + 50
  return <>
    <Box at={[0, deck - 1.5, 0]} size={[L, 3, 20]} />
    {[-1, 1].map(sign => <group key={sign}>
      <Box at={[sign * (half + reach / 2), 12, -12]} size={[reach, 52, 55]} color={PALETTE.bank} />
      <Box at={[sign * half, 2, 0]} size={[14, 8, 32]} color={PALETTE.plasterLow} />
      <Box at={[sign * (half + reach / 2), deck - 1.5, 0]} size={[reach, 3, 20]} />
      {kind !== 'arch' && <Box at={[sign * half, 22, 0]} size={[4, 36, 18]} />}
    </group>)}
    {kind === 'beam' && <>
      <Box at={[0, deck - r.depth / 2, 0]} size={[L, r.depth, 17]} color={white} />
      <Bar a={[-half, deck, 10.5]} b={[half, deck, 10.5]} r={radius} color={red} glow={glow} />
      <Bar a={[-half, deck - r.depth, 10.5]} b={[half, deck - r.depth, 10.5]} r={radius} color={blue} glow={glow} />
    </>}
    {kind === 'arch' && Array.from({ length: 32 }, (_, i) => {
      const x = -half + i * L / 32, next = x + L / 32
      return <group key={i}>
        <Bar a={[x, arch(x), 10]} b={[next, arch(next), 10]} r={radius * 1.3} color={red} glow={glow} />
        <Bar a={[x, arch(x), -10]} b={[next, arch(next), -10]} r={radius * 1.3} color={white} />
        {i > 0 && <Bar a={[x, deck, 10]} b={[x, arch(x), 10]} r={radius * .35} color={blue} glow={glow} />}
      </group>
    })}
    {(kind === 'stayed' || kind === 'suspension') && [-1, 1].map(sign => <group key={sign}>
      {[-10, 10].map(z => <Box key={z} at={[sign * half, 20 + r.height / 2, z]} size={[4, 40 + r.height, 4]} />)}
      <Bar a={[sign * half, 4, 13]} b={[sign * half, deck + r.height, 13]} r={radius * 1.3} color={red} glow={glow} />
      <Box at={[sign * half, deck + r.height - 3, 0]} size={[5, 5, 26]} />
      {kind === 'stayed' && Array.from({ length: 12 }, (_, i) => {
        const x = sign * half * (1 - (i + 1) / 12)
        return <Bar key={i} a={[x, deck, 11]} b={[sign * half, deck + r.height, 11]} r={radius * .5} color={blue} glow={glow} />
      })}
      {kind === 'suspension' && <>
        <Bar a={[sign * half, deck + r.height, 10]} b={[sign * (half + reach * .85), deck, 10]} r={radius * 1.2} color={blue} glow={glow} />
        <Box at={[sign * (half + reach * .85), deck, 0]} size={[14, 10, 28]} />
      </>}
    </group>)}
    {kind === 'suspension' && Array.from({ length: 32 }, (_, i) => {
      const x = -half + i * L / 32, next = x + L / 32
      return <group key={i}>
        <Bar a={[x, cable(x), 10]} b={[next, cable(next), 10]} r={radius * 1.2} color={blue} glow={glow} />
        <Bar a={[x, cable(x), -10]} b={[next, cable(next), -10]} r={radius * 1.2} color={white} />
        {i > 0 && <Bar a={[x, deck, 10]} b={[x, cable(x), 10]} r={radius * .35} color={blue} glow={glow} />}
      </group>
    })}
    <Box at={[0, deck + 3, 0]} size={[8, 4, 3]} color={PALETTE.truck} />
    <Box at={[5, deck + 2.2, 0]} size={[2, 2.8, 3]} color={PALETTE.truck} />
    <Bar a={[-half, -8, 22]} b={[half, -8, 22]} r={.45} color="#a3a39d" glow={.25} />
    {[-half, half].map(x => <Bar key={x} a={[x, -12, 22]} b={[x, -4, 22]} r={.5} color="#a3a39d" glow={.25} />)}
    <Html center position={[0, -8, 24]} zIndexRange={[5, 1]}><span className="bs-span-label">{L.toLocaleString('en-US')} m <small>{tx('主跨')}</small></span></Html>
    <Box at={[0, -5, -8]} size={[L + 2 * reach, 2, 180]} color={PALETTE.water} />
  </>
}
function ScaledBridge({ kind, span }: { kind: BridgeKind; span: number }) {
  const { size } = useThree()
  return <group scale={[1, size.width < 700 ? 2 : 1, 1]}><Bridge kind={kind} span={span} /></group>
}
export function SpanScene({ kind, span, reset, front }: { kind: BridgeKind; span: number; reset: number; front: boolean }) {
  const height = spanResponse(kind, span).height
  return <Canvas orthographic shadows dpr={[1, 1.5]} camera={{ position: [160, 180, 700], near: .1, far: 15000 }} gl={{ antialias: true }}>
    <color attach="background" args={[PALETTE.bg]} />
    <ambientLight intensity={.16} /><hemisphereLight args={['#c9d6e4', '#06080a', .85]} />
    <directionalLight position={[-300, 600, 350]} intensity={2.5} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-1800} shadow-camera-right={1800} shadow-camera-top={1600} shadow-camera-bottom={-700} shadow-bias={-.001} />
    <directionalLight position={[600, 220, -480]} intensity={1.15} color="#9cc2ff" />
    <SpanCamera span={span} height={height} reset={reset} front={front} />
    <ScaledBridge kind={kind} span={span} />
  </Canvas>
}
