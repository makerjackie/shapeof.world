import { OrbitControls, useGLTF, useTexture } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Component, Suspense, useEffect, useMemo, useRef, type ErrorInfo, type ReactNode } from 'react'
import * as THREE from 'three'

import type { ExperienceControls } from '~/components/ExperienceShell'
import { advancePulseCoupling, generateEcologyLayout, getStoryCoupling, seededRandom, shouldAdvanceFlight, type EcologyFly } from './firefly-ecology'
import { canopyFlyCount, makeOnlineFireflies, onlineStoryParams, stepOnlineFireflies, type OnlineFirefly } from './online-firefly-model'

type SceneParams = { sync: boolean; pull: number; radius: number; clockSpeed: number; showClocks: boolean }
type RuntimeFly = EcologyFly & { position: THREE.Vector3; velocity: THREE.Vector3; heading: number; flash: number; pausedUntil: number; nextTurn: number }
const TREE_URL = '/assets/experiences/firefly-sync/jacaranda-tree.glb'
const ONLINE_SPRITE_URL = '/assets/experiences/firefly-sync/firefly.png'
const TAU = Math.PI * 2

function makeGlowTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 96; canvas.height = 96
  const context = canvas.getContext('2d')
  if (context) {
    context.clearRect(0, 0, 96, 96)
    const gradient = context.createRadialGradient(48, 48, 1, 48, 48, 46)
    gradient.addColorStop(0, '#fff2a0'); gradient.addColorStop(0.09, '#dcff74')
    gradient.addColorStop(0.28, 'rgba(173,231,72,.6)'); gradient.addColorStop(0.82, 'rgba(92,156,40,.08)'); gradient.addColorStop(1, 'rgba(0,0,0,0)')
    context.fillStyle = gradient; context.fillRect(0, 0, 96, 96)
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.ClampToEdgeWrapping; texture.wrapT = THREE.ClampToEdgeWrapping
  texture.premultiplyAlpha = true; texture.needsUpdate = true
  return texture
}

const glowVertex = `attribute vec3 instanceColor; varying vec2 vUv; varying float vIntensity; void main(){vUv=uv;vIntensity=instanceColor.r;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}`
const glowFragment = `varying vec2 vUv; varying float vIntensity; uniform vec3 glowColor; uniform float strength; void main(){vec2 p=vUv*2.0-1.0;float d=length(p);if(d>0.96)discard;float core=smoothstep(.46,.02,d);float halo=smoothstep(.96,.18,d);float a=(halo*.32+core*.68)*strength*clamp(vIntensity,0.12,1.0);if(a<.025)discard;gl_FragColor=vec4(glowColor*(.45+vIntensity),a);}`

function tuneTree(root: THREE.Object3D) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    object.castShadow = false; object.receiveShadow = false
    const list = Array.isArray(object.material) ? object.material : [object.material]
    const tuned = list.map((source) => {
      const material = source.clone() as THREE.MeshStandardMaterial
      const leaves = material.name.toLowerCase().includes('leaves')
      material.roughness = leaves ? 0.86 : Math.max(0.72, material.roughness); material.metalness = 0
      material.color.multiplyScalar(leaves ? 0.13 : 0.11)
      if (leaves) {
        material.alphaTest = 0.24; material.transparent = true; material.depthWrite = true
        material.side = THREE.DoubleSide; material.emissive.set('#02080a'); material.emissiveIntensity = 0.08
      }
      material.needsUpdate = true
      return material
    })
    object.material = Array.isArray(object.material) ? tuned : tuned[0]
  })
}

function RealTree({ position = [0.35, 0.08, -0.8], rotation = -0.46, scale = 0.78 }: { position?: [number, number, number]; rotation?: number; scale?: number }) {
  const gltf = useGLTF(TREE_URL)
  const tree = useMemo(() => { const clone = gltf.scene.clone(true); tuneTree(clone); return clone }, [gltf.scene])
  useEffect(() => () => tree.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const list = Array.isArray(object.material) ? object.material : [object.material]
    list.forEach((material) => material.dispose())
  }), [tree])
  return <primitive object={tree} position={position} rotation={[0, rotation, 0]} scale={scale} />
}

function TreeFallback() {
  const branches = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ angle: i * 2.19, y: 4.2 + (i % 5) * 1.05, length: 3.4 + (i % 4) * 0.7 })), [])
  return <group position={[0, 0, -0.8]}>
    <mesh position={[0, 4.1, 0]} castShadow><cylinderGeometry args={[0.6, 1.18, 8.2, 9]} /><meshStandardMaterial color="#1c2520" roughness={1} /></mesh>
    {branches.map((branch, index) => <mesh key={index} position={[Math.cos(branch.angle) * 1.2, branch.y, Math.sin(branch.angle) * 1.2]} rotation={[Math.sin(branch.angle) * 0.9, 0, Math.cos(branch.angle) * 0.9]}>
      <cylinderGeometry args={[0.12, 0.38, branch.length, 6]} /><meshStandardMaterial color="#17211b" roughness={1} />
    </mesh>)}
    <mesh position={[0, 10.2, 0]} scale={[6.6, 3.8, 4.8]}><icosahedronGeometry args={[1, 2]} /><meshStandardMaterial color="#0b251a" roughness={1} /></mesh>
  </group>
}

class TreeErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Firefly tree model failed to load.', error, info) }
  render() { return this.state.failed ? <TreeFallback /> : this.props.children }
}

function Environment() {
  const distant = useMemo(() => Array.from({ length: 17 }, (_, i) => {
    const rnd = seededRandom(900 + i); return { x: -25 + i * 3.1, z: -22 - rnd() * 13, h: 4 + rnd() * 5.5, r: 0.24 + rnd() * 0.38 }
  }), [])
  return <>
    <color attach="background" args={['#071923']} /><fogExp2 attach="fog" args={['#0b2734', 0.024]} />
    <mesh scale={70}><sphereGeometry args={[1, 32, 18]} /><shaderMaterial side={THREE.BackSide} depthWrite={false} vertexShader="varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}" fragmentShader="varying vec3 p;void main(){float haze=.5+.5*sin(p.x*2.1+p.y*.7)*sin(p.z*1.7-p.y*.9);haze=smoothstep(.18,.9,haze);vec3 deep=vec3(.027,.098,.137);vec3 open=vec3(.055,.176,.235);gl_FragColor=vec4(mix(deep,open,haze*.34),1.);}" /></mesh>
    <ambientLight intensity={0.055} color="#315162" /><hemisphereLight args={['#244957', '#010304', 0.16]} />
    <directionalLight position={[-8, 16, -8]} intensity={1.5} color="#4f8292" />
    <directionalLight position={[8, 11, 5]} intensity={0.3} color="#41676b" />
    <spotLight position={[0, 16, -9]} target-position={[0, 8, 0]} angle={0.7} penumbra={0.86} intensity={1.45} color="#315e70" />
    <mesh rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[32, 48]} /><meshStandardMaterial color="#06100d" roughness={0.46} metalness={0.04} /></mesh>
    <mesh position={[4.6, 0.025, 2.2]} rotation={[-Math.PI / 2, 0.12, 0]}><circleGeometry args={[5.2, 48]} /><meshStandardMaterial color="#0a2022" roughness={0.12} metalness={0.3} transparent opacity={0.56} /></mesh>
    {distant.map((tree, i) => <group key={i} position={[tree.x, 0, tree.z]}><mesh position={[0, tree.h / 2, 0]}><cylinderGeometry args={[tree.r * 0.35, tree.r, tree.h, 5]} /><meshBasicMaterial color="#020605" /></mesh><mesh position={[0, tree.h * 0.82, 0]} scale={[1.8, 1.15, 1.3]}><icosahedronGeometry args={[tree.r * 2.6, 1]} /><meshBasicMaterial color="#020706" /></mesh></group>)}
  </>
}

function updateMotion(fly: RuntimeFly, now: number, dt: number) {
  if (!shouldAdvanceFlight()) return
  if (now > fly.nextTurn) {
    const rnd = seededRandom((fly.id + 1) * 8191 + Math.floor(now * 2))
    fly.heading += (rnd() - 0.5) * 1.2; fly.nextTurn = now + 0.65 + rnd() * 2.1
    if (rnd() < 0.18) fly.pausedUntil = now + 0.18 + rnd() * 0.72
  }
  const homePull = new THREE.Vector3(...fly.home).sub(fly.position).multiplyScalar(0.13)
  const targetSpeed = now < fly.pausedUntil ? 0.035 : 0.22 * fly.speed
  const desired = new THREE.Vector3(Math.cos(fly.heading) * targetSpeed, Math.sin(now * 0.7 + fly.id) * 0.035, Math.sin(fly.heading) * targetSpeed).add(homePull)
  fly.velocity.lerp(desired, Math.min(1, dt * fly.turnRate * 3.2)); fly.position.addScaledVector(fly.velocity, dt)
  if (fly.position.y < 0.38) { fly.position.y = 0.38; fly.velocity.y = Math.abs(fly.velocity.y) }
}

function NearFirefly({ fly, glowMap }: { fly: RuntimeFly; glowMap: THREE.Texture }) {
  const group = useRef<THREE.Group>(null); const leftWing = useRef<THREE.Mesh>(null); const rightWing = useRef<THREE.Mesh>(null)
  const abdomen = useRef<THREE.MeshBasicMaterial>(null); const glow = useRef<THREE.SpriteMaterial>(null)
  const leftWingShape = useMemo(() => { const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.bezierCurveTo(-0.015, 0.025, -0.13, 0.052, -0.18, 0.012); shape.bezierCurveTo(-0.13, -0.035, -0.025, -0.025, 0, 0); return shape }, [])
  const rightWingShape = useMemo(() => { const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.bezierCurveTo(0.02, 0.026, 0.145, 0.045, 0.17, 0.004); shape.bezierCurveTo(0.13, -0.042, 0.03, -0.022, 0, 0); return shape }, [])
  useFrame(({ clock }) => {
    if (!group.current) return
    group.current.position.copy(fly.position); group.current.rotation.y = -Math.atan2(fly.velocity.z, fly.velocity.x) + Math.PI / 2
    const flap = Math.sin(clock.elapsedTime * 34 + fly.id) * 0.46
    if (leftWing.current) leftWing.current.rotation.z = 0.42 + flap
    if (rightWing.current) rightWing.current.rotation.z = -0.42 - flap
    if (abdomen.current) abdomen.current.color.set(fly.flash > 0.25 ? '#e2f06d' : '#7e8f35')
    if (glow.current) glow.current.opacity = 0.08 + fly.flash * 0.58
  })
  return <group ref={group}>
    <mesh rotation={[Math.PI / 2, 0, 0]}><capsuleGeometry args={[0.035, 0.12, 4, 7]} /><meshStandardMaterial color="#111812" roughness={0.9} /></mesh>
    <mesh position={[0, -0.075, 0.012]}><sphereGeometry args={[0.046, 8, 6]} /><meshBasicMaterial ref={abdomen} color="#7e8f35" toneMapped={false} /></mesh>
    <mesh ref={leftWing} position={[-0.025, 0.02, 0]} rotation={[0.12, 0.12, 0.42]}><shapeGeometry args={[leftWingShape, 5]} /><meshBasicMaterial color="#78928f" transparent opacity={0.16} side={THREE.DoubleSide} depthTest depthWrite={false} /></mesh>
    <mesh ref={rightWing} position={[0.025, 0.02, 0]} rotation={[0.12, -0.12, -0.42]}><shapeGeometry args={[rightWingShape, 5]} /><meshBasicMaterial color="#718c89" transparent opacity={0.14} side={THREE.DoubleSide} depthTest depthWrite={false} /></mesh>
    <sprite scale={[0.42 + fly.flash * 0.3, 0.42 + fly.flash * 0.3, 1]}><spriteMaterial ref={glow} map={glowMap} color="#bfe861" transparent opacity={0.08} depthTest depthWrite={false} blending={THREE.AdditiveBlending} /></sprite>
  </group>
}

function MidFireflies({ flies, glowMap }: { flies: RuntimeFly[]; glowMap: THREE.Texture }) {
  const cores = useRef<THREE.InstancedMesh>(null); const halos = useRef<THREE.InstancedMesh>(null); const { camera } = useThree()
  const matrix = useMemo(() => new THREE.Matrix4(), []); const quaternion = useMemo(() => new THREE.Quaternion(), []); const scale = useMemo(() => new THREE.Vector3(), [])
  const coreIntensity = useMemo(() => new Float32Array(flies.length * 3).fill(0.14), [flies.length])
  const haloIntensity = useMemo(() => new Float32Array(flies.length * 3).fill(0.1), [flies.length])
  useFrame(() => {
    flies.forEach((fly, index) => {
      quaternion.copy(camera.quaternion); quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.atan2(fly.velocity.y, Math.hypot(fly.velocity.x, fly.velocity.z))))
      scale.set(0.075, 0.18 + fly.flash * 0.07, 1); matrix.compose(fly.position, quaternion, scale); cores.current?.setMatrixAt(index, matrix)
      scale.set(0.34 + fly.flash * 0.18, 0.48 + fly.flash * 0.25, 1); matrix.compose(fly.position, quaternion, scale); halos.current?.setMatrixAt(index, matrix)
      const coreLight = 0.14 + fly.flash * 1.3; const haloLight = 0.1 + fly.flash * 0.95
      coreIntensity.fill(coreLight, index * 3, index * 3 + 3); haloIntensity.fill(haloLight, index * 3, index * 3 + 3)
    })
    if (cores.current) cores.current.instanceMatrix.needsUpdate = true
    if (halos.current) halos.current.instanceMatrix.needsUpdate = true
    if (cores.current) cores.current.geometry.getAttribute('instanceColor').needsUpdate = true
    if (halos.current) halos.current.geometry.getAttribute('instanceColor').needsUpdate = true
  })
  return <><instancedMesh ref={halos} args={[undefined, undefined, flies.length]} frustumCulled={false}><planeGeometry><instancedBufferAttribute attach="attributes-instanceColor" args={[haloIntensity, 3]} /></planeGeometry><shaderMaterial vertexShader={glowVertex} fragmentShader={glowFragment} uniforms={{ glowColor: { value: new THREE.Color('#a9d757') }, strength: { value: 0.55 } }} transparent depthTest depthWrite={false} blending={THREE.AdditiveBlending} /></instancedMesh><instancedMesh ref={cores} args={[undefined, undefined, flies.length]} frustumCulled={false}><planeGeometry><instancedBufferAttribute attach="attributes-instanceColor" args={[coreIntensity, 3]} /></planeGeometry><shaderMaterial vertexShader={glowVertex} fragmentShader={glowFragment} uniforms={{ glowColor: { value: new THREE.Color('#e1ed72') }, strength: { value: 1.0 } }} transparent depthTest depthWrite={false} /></instancedMesh></>
}

function FarFireflies({ flies, glowMap }: { flies: RuntimeFly[]; glowMap: THREE.Texture }) {
  const points = useRef<THREE.Points>(null); const positions = useMemo(() => new Float32Array(flies.length * 3), [flies.length]); const colors = useMemo(() => new Float32Array(flies.length * 3), [flies.length])
  useFrame(() => {
    flies.forEach((fly, index) => { positions[index * 3] = fly.position.x; positions[index * 3 + 1] = fly.position.y; positions[index * 3 + 2] = fly.position.z; const light = 0.18 + fly.flash * 1.3; colors[index * 3] = light; colors[index * 3 + 1] = light * (0.92 + fly.warmth * 0.22); colors[index * 3 + 2] = light * 0.24 })
    if (points.current) { points.current.geometry.attributes.position.needsUpdate = true; points.current.geometry.attributes.color.needsUpdate = true }
  })
  return <points ref={points} frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /><bufferAttribute attach="attributes-color" args={[colors, 3]} /></bufferGeometry><pointsMaterial map={glowMap} size={0.22} sizeAttenuation vertexColors transparent opacity={0.62} alphaTest={0.055} depthTest depthWrite={false} /></points>
}

function FireflyEcosystem({ beat, params, reducedMotion, onOrderChange, onTrigger }: { beat: number; params: SceneParams; reducedMotion: boolean; onOrderChange: (n: number) => void; onTrigger: () => void }) {
  const layout = useMemo(() => generateEcologyLayout(), [])
  const flies = useMemo<RuntimeFly[]>(() => layout.map((fly) => ({ ...fly, position: new THREE.Vector3(...fly.home), velocity: new THREE.Vector3(), heading: fly.id * 2.399, flash: 0, pausedUntil: 0, nextTurn: fly.id * 0.013 })), [layout])
  const glowMap = useMemo(makeGlowTexture, []); const lastEmit = useRef(0); const lastBeat = useRef(beat); const { gl } = useThree()
  useEffect(() => () => glowMap.dispose(), [glowMap])
  useEffect(() => {
    const scramble = () => { const rnd = seededRandom(Date.now()); flies.forEach((fly) => { fly.phase = rnd(); fly.flash = 0 }) }
    gl.domElement.addEventListener('firefly-scramble', scramble)
    return () => gl.domElement.removeEventListener('firefly-scramble', scramble)
  }, [flies, gl.domElement])
  useFrame(({ clock }, dt) => {
    const now = clock.elapsedTime; let sx = 0; let sy = 0
    if (lastBeat.current !== beat) {
      if (beat === 1) { const rnd = seededRandom(Math.floor(now * 1000) + 71); flies.forEach((fly) => { fly.phase = rnd(); fly.flash = 0 }) }
      if (beat === 2) { const focus = flies.reduce((best, fly) => Math.hypot(fly.home[0], fly.home[1] - 7, fly.home[2] - 1) < Math.hypot(best.home[0], best.home[1] - 7, best.home[2] - 1) ? fly : best); focus.phase = 0.97; focus.flash = 0.25 }
      lastBeat.current = beat
    }
    // The original model measured a 2D neighbourhood. The mapped 3D radius
    // keeps the same visible neighbour count while the pulse formula is intact.
    const coupling = getStoryCoupling(beat, params.pull, params.radius, params.sync)
    flies.forEach((fly, index) => { updateMotion(fly, now, dt); fly.phase += dt * params.clockSpeed; if (fly.phase >= 1) { fly.phase -= 1; fly.flash = 1; if (coupling.sync) advancePulseCoupling(flies, index, coupling.pull, coupling.radius) } fly.flash *= Math.exp(-dt / fly.flashDecay); const phase = fly.phase * TAU; sx += Math.cos(phase); sy += Math.sin(phase) })
    if (now - lastEmit.current > 0.18) { lastEmit.current = now; onOrderChange(Math.hypot(sx, sy) / flies.length) }
  })
  const handlePointer = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation(); const visible = flies.filter((fly) => fly.lod !== 'far'); let nearest = visible[0]; let best = Infinity
    visible.forEach((fly) => { const distance = fly.position.distanceToSquared(event.point); if (distance < best) { best = distance; nearest = fly } })
    if (!nearest || best > 10) return
    nearest.phase = 0.995; nearest.flash = 1; onTrigger()
  }
  const near = flies.filter((fly) => fly.lod === 'near'); const mid = flies.filter((fly) => fly.lod === 'mid'); const far = flies.filter((fly) => fly.lod === 'far')
  return <group>{near.map((fly) => <NearFirefly key={fly.id} fly={fly} glowMap={glowMap} />)}<MidFireflies flies={mid} glowMap={glowMap} /><FarFireflies flies={far} glowMap={glowMap} /><mesh position={[0, 7, 3.8]} onPointerDown={handlePointer}><planeGeometry args={[24, 16]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh></group>
}

type OnlineRuntimeFly = OnlineFirefly & { position: THREE.Vector3 }

function atlasFrame(atlas: THREE.Texture, col: number, row: number) {
  const texture = atlas.clone()
  texture.repeat.set(350 / 1024, 350 / 2048)
  texture.offset.set((col * 350) / 1024, 1 - ((row + 1) * 350) / 2048)
  texture.wrapS = THREE.ClampToEdgeWrapping; texture.wrapT = THREE.ClampToEdgeWrapping
  texture.needsUpdate = true
  return texture
}

function makeOnlineGlow(inner: string, mid: string) {
  const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128
  const context = canvas.getContext('2d')
  if (context) {
    context.clearRect(0, 0, 128, 128)
    const gradient = context.createRadialGradient(64, 64, 0.5, 64, 64, 62)
    gradient.addColorStop(0, '#fffef5'); gradient.addColorStop(0.05, inner); gradient.addColorStop(0.16, mid)
    gradient.addColorStop(0.38, `${mid}88`); gradient.addColorStop(0.62, `${mid}28`); gradient.addColorStop(0.85, `${mid}08`); gradient.addColorStop(1, 'rgba(0,0,0,0)')
    context.fillStyle = gradient; context.fillRect(0, 0, 128, 128)
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.ClampToEdgeWrapping; texture.wrapT = THREE.ClampToEdgeWrapping; texture.premultiplyAlpha = true
  return texture
}

function OnlineSpriteLayer({ flies, texture, visible, size, glow = false }: { flies: OnlineRuntimeFly[]; texture: THREE.Texture; visible: (fly: OnlineRuntimeFly, index: number) => boolean; size: (fly: OnlineRuntimeFly) => number; glow?: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null); const { camera } = useThree()
  const matrix = useMemo(() => new THREE.Matrix4(), []); const quaternion = useMemo(() => new THREE.Quaternion(), []); const scale = useMemo(() => new THREE.Vector3(), [])
  const turn = useMemo(() => new THREE.Quaternion(), []); const axis = useMemo(() => new THREE.Vector3(0, 0, 1), [])
  const colors = useMemo(() => new Float32Array(flies.length * 3).fill(glow ? 0.08 : 1), [flies.length, glow])
  useFrame(() => {
    flies.forEach((fly, index) => {
      const show = visible(fly, index); const amount = show ? size(fly) : 0
      turn.setFromAxisAngle(axis, fly.angle + Math.PI / 2); quaternion.copy(camera.quaternion).multiply(turn)
      scale.set(amount, amount, 1); matrix.compose(fly.position, quaternion, scale); mesh.current?.setMatrixAt(index, matrix)
      if (glow) { const light = Math.min(1, 0.08 + fly.flash * 0.95); colors.fill(light, index * 3, index * 3 + 3) }
    })
    if (mesh.current) { mesh.current.instanceMatrix.needsUpdate = true; mesh.current.geometry.getAttribute('instanceColor').needsUpdate = true }
  })
  return <instancedMesh ref={mesh} args={[undefined, undefined, flies.length]} frustumCulled={false}><planeGeometry><instancedBufferAttribute attach="attributes-instanceColor" args={[colors, 3]} /></planeGeometry><meshBasicMaterial map={texture} transparent opacity={glow ? 0.72 : 1} alphaTest={0.015} depthTest depthWrite={false} toneMapped={false} vertexColors={false} blending={glow ? THREE.AdditiveBlending : THREE.NormalBlending} /></instancedMesh>
}

function OnlineFireflyEcosystem({ beat, params, reducedMotion, onOrderChange, onTrigger }: { beat: number; params: SceneParams; reducedMotion: boolean; onOrderChange: (n: number) => void; onTrigger: () => void }) {
  const { size, gl } = useThree(); const count = canopyFlyCount(size.width, size.height)
  const flies = useMemo<OnlineRuntimeFly[]>(() => makeOnlineFireflies(count, size.width, size.height).map((fly) => ({ ...fly, position: new THREE.Vector3() })), [count, size.height, size.width])
  const atlas = useTexture(ONLINE_SPRITE_URL)
  const frames = useMemo(() => ({ body: atlasFrame(atlas, 0, 0), lit: atlasFrame(atlas, 1, 0), wingA: atlasFrame(atlas, 1, 1), wingB: atlasFrame(atlas, 0, 2) }), [atlas])
  const glows = useMemo(() => ({ lime: makeOnlineGlow('#e8ff9a', '#b8ff4a'), gold: makeOnlineGlow('#fff0a8', '#ffc857'), soft: makeOnlineGlow('#d0ffe0', '#6ad4a0') }), [])
  const pointer = useRef({ down: false, x: 0, y: 0 }); const lastBeat = useRef(beat); const lastEmit = useRef(0); const smoothedOrder = useRef(0); const frame = useRef(0)
  useEffect(() => () => { Object.values(frames).forEach((texture) => texture.dispose()); Object.values(glows).forEach((texture) => texture.dispose()) }, [frames, glows])
  useEffect(() => {
    const scramble = () => flies.forEach((fly) => { fly.clock = Math.random(); fly.flash = 0; fly.chaos = 1 })
    gl.domElement.addEventListener('firefly-scramble', scramble)
    return () => gl.domElement.removeEventListener('firefly-scramble', scramble)
  }, [flies, gl.domElement])
  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(0.05, Math.max(0.001, rawDt)); frame.current += 1
    if (lastBeat.current !== beat) {
      if (beat === 1) flies.forEach((fly) => { fly.clock = Math.random(); fly.flash = 0; fly.chaos = 1 })
      if (beat === 2) { const focus = flies.reduce((best, fly) => (fly.x - size.width * 0.5) ** 2 + (fly.y - size.height * 0.52) ** 2 < (best.x - size.width * 0.5) ** 2 + (best.y - size.height * 0.52) ** 2 ? fly : best); focus.clock = 0.97; focus.flash = 0.4 }
      lastBeat.current = beat
    }
    const order = stepOnlineFireflies(flies, onlineStoryParams(beat, params), size.width, size.height, dt, pointer.current, reducedMotion)
    smoothedOrder.current += (order - smoothedOrder.current) * Math.min(1, dt * 3.5)
    flies.forEach((fly, index) => {
      if (!reducedMotion && frame.current % 2 === 0) fly.wing = fly.wing ? 0 : 1
      const nx = fly.x / size.width; const ny = fly.y / size.height
      fly.position.set((nx - 0.5) * 24 - 0.8, 2.15 + (1 - ny) * 13.35, (fly.depth - 0.58) * 5.4 + Math.sin(index * 2.17) * 0.45)
    })
    if (clock.elapsedTime - lastEmit.current > 0.16) { lastEmit.current = clock.elapsedTime; onOrderChange(smoothedOrder.current) }
  })
  const toPointer = (event: ThreeEvent<PointerEvent>) => { pointer.current.x = ((event.point.x + 0.8) / 24 + 0.5) * size.width; pointer.current.y = (1 - (event.point.y - 2.15) / 13.35) * size.height }
  const bodySize = (fly: OnlineRuntimeFly) => (18 + fly.depth * 22) * (0.92 + fly.flash * 0.12) * 0.0135
  const glowSize = (fly: OnlineRuntimeFly) => (10 + fly.depth * 18) * (0.35 + fly.flash * 1.15) * 0.027
  return <group>
    <OnlineSpriteLayer flies={flies} texture={glows.lime} visible={(fly) => fly.hue > 0.62} size={glowSize} glow />
    <OnlineSpriteLayer flies={flies} texture={glows.gold} visible={(fly) => fly.hue < 0.28} size={glowSize} glow />
    <OnlineSpriteLayer flies={flies} texture={glows.soft} visible={(fly) => fly.hue >= 0.28 && fly.hue <= 0.62} size={glowSize} glow />
    <OnlineSpriteLayer flies={flies} texture={frames.body} visible={(fly) => fly.flash <= 0.35} size={bodySize} />
    <OnlineSpriteLayer flies={flies} texture={frames.lit} visible={(fly) => fly.flash > 0.35} size={bodySize} />
    <OnlineSpriteLayer flies={flies} texture={frames.wingA} visible={(fly) => fly.wing === 0} size={(fly) => bodySize(fly) * 1.05} />
    <OnlineSpriteLayer flies={flies} texture={frames.wingB} visible={(fly) => fly.wing === 1} size={(fly) => bodySize(fly) * 1.05} />
    <mesh position={[-0.8, 8.05, 4.2]} onPointerDown={(event) => { event.stopPropagation(); toPointer(event); pointer.current.down = true; onTrigger() }} onPointerMove={toPointer} onPointerUp={() => { pointer.current.down = false }} onPointerLeave={() => { pointer.current.down = false }}><planeGeometry args={[24, 14.7]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
  </group>
}

function CameraRig() {
  const { camera, size } = useThree()
  useEffect(() => { const mobile = size.width < 720; const perspective = camera as THREE.PerspectiveCamera; camera.position.set(mobile ? 1.12 : 0.72, mobile ? 0.12 : 0.1, mobile ? 10.45 : 8.15); perspective.fov = mobile ? 64 : 59; camera.lookAt(mobile ? new THREE.Vector3(0.9, 11.45, -1.0) : new THREE.Vector3(0.65, 11.85, -1.0)); perspective.updateProjectionMatrix() }, [camera, size.width])
  return null
}

function RootOrbitControls() {
  const { size } = useThree(); const mobile = size.width < 720; const polar = mobile ? 2.35 : 2.48
  return <OrbitControls makeDefault target={mobile ? [0.9, 11.45, -1] : [0.65, 11.85, -1]} enablePan={false} enableZoom={false} enableDamping dampingFactor={0.07} rotateSpeed={0.42} minPolarAngle={polar} maxPolarAngle={polar} />
}

function VisibilityPause() {
  const setFrameloop = useThree((state) => state.setFrameloop)
  useEffect(() => {
    const update = () => setFrameloop(document.hidden ? 'never' : 'always')
    document.addEventListener('visibilitychange', update); update()
    return () => document.removeEventListener('visibilitychange', update)
  }, [setFrameloop])
  return null
}

export function FireflyTreeScene({ beat, params, controls, reducedMotion, onOrderChange, onInteract, onUserGesture }: { beat: number; params: SceneParams; controls: ExperienceControls; reducedMotion: boolean; onOrderChange: (n: number) => void; onInteract: () => void; onUserGesture?: () => void }) {
  return <Canvas className="firefly-canvas" dpr={[1, 1.15]} camera={{ fov: 52, near: 0.08, far: 90 }} gl={{ antialias: false, powerPreference: 'high-performance' }} onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.76 }}><VisibilityPause /><CameraRig /><RootOrbitControls /><Environment /><TreeErrorBoundary><Suspense fallback={<TreeFallback />}><RealTree /><RealTree position={[-8.8, -0.1, -5.4]} rotation={0.82} scale={0.64} /></Suspense></TreeErrorBoundary><OnlineFireflyEcosystem beat={beat} params={params} reducedMotion={reducedMotion} onOrderChange={onOrderChange} onTrigger={() => { controls.registerInteraction(); onUserGesture?.(); onInteract() }} /></Canvas>
}

useGLTF.preload(TREE_URL)
