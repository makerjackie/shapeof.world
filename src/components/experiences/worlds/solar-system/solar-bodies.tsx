import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { MOON_TEXTURE_URL, SATURN_RING_TEXTURE_URL, planetTextureUrl, useLazyTexture } from '~/components/experiences/solar-system-textures'
import { useExperienceI18n } from '~/i18n/experience'
import { orbitalPosition, orbitPathPoints } from './orbital-model'
import { bodyRadius, orbitDisplayScale, moonRadius, moonPosition, spinAngle, type ScaleMode } from './scale-model'
import { EarthMaterial } from './private/earth-material'
import { MoonLocator } from './private/moon-locator'
import { type PlanetData, type MoonData } from './solar-data'
const RING_STRIP_INNER_KM = 74500
const RING_STRIP_OUTER_KM = 140385
function seededRandom(seed: number) {
	let t = seed >>> 0
	return () => {
		t |= 0
		t = (t + 1831565813) | 0
		let n = Math.imul(t ^ (t >>> 15), 1 | t)
		n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n
		return ((n ^ (n >>> 14)) >>> 0) / 4294967296
	}
}

class ValueNoise {
	private perm: Uint8Array
	constructor(seed = 1337, size = 256) {
		const rand = seededRandom(seed)
		const p = new Uint8Array(size)
		for (let i = 0; i < size; i++) p[i] = i
		for (let i = size - 1; i > 0; i--) {
			const j = Math.floor(rand() * (i + 1))
			;[p[i], p[j]] = [p[j], p[i]]
		}
		this.perm = new Uint8Array(size * 2)
		for (let i = 0; i < size * 2; i++) this.perm[i] = p[i & (size - 1)]
	}
	private lattice(ix: number, iy: number) {
		return this.perm[(this.perm[ix & 255] + iy) & 255] / 255
	}
	noise(x: number, y: number) {
		const ix = Math.floor(x)
		const iy = Math.floor(y)
		const fx = x - ix
		const fy = y - iy
		const ux = fx * fx * (3 - 2 * fx)
		const uy = fy * fy * (3 - 2 * fy)
		const a = this.lattice(ix, iy)
		const b = this.lattice(ix + 1, iy)
		const c = this.lattice(ix, iy + 1)
		const d = this.lattice(ix + 1, iy + 1)
		return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy
	}
}

function hexToRgb(hex: string): [number, number, number] {
	const n = parseInt(hex.replace('#', ''), 16)
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function smoothstep(edge0: number, edge1: number, x: number) {
	const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
	return t * t * (3 - 2 * t)
}

function makeCanvas(w: number, h: number) {
	const canvas = document.createElement('canvas')
	canvas.width = w
	canvas.height = h
	const ctx = canvas.getContext('2d')!
	return { canvas, ctx }
}

function canvasTexture(canvas: HTMLCanvasElement, srgb = true) {
	const tex = new THREE.CanvasTexture(canvas)
	if (srgb) tex.colorSpace = THREE.SRGBColorSpace
	tex.anisotropy = 16
	return tex
}

function paintTexture(w: number, h: number, paint: (u: number, v: number) => [number, number, number, number?]) {
	const { canvas, ctx } = makeCanvas(w, h)
	const img = ctx.createImageData(w, h)
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const [r, g, b, a = 255] = paint(x / w, y / h)
			const i = (y * w + x) * 4
			img.data[i] = r
			img.data[i + 1] = g
			img.data[i + 2] = b
			img.data[i + 3] = a
		}
	}
	ctx.putImageData(img, 0, 0)
	return canvasTexture(canvas)
}

/** 天王星细环 / 土星环贴图加载完成前的占位条带（径向 u 剖面） */
function createRingStripTexture(color: string, isSaturn: boolean) {
	const rgb = hexToRgb(color)
	const noise = new ValueNoise(42)
	return paintTexture(512, 16, (u) => {
		let alpha: number
		if (isSaturn) {
			const a = 0.22 * smoothstep(0, 0.08, u) * (1 - smoothstep(0.16, 0.22, u))
			const b = 0.92 * smoothstep(0.2, 0.28, u) * (1 - smoothstep(0.58, 0.62, u))
			const c = u >= 0.62 && u < 0.7 ? 0.06 : 0
			const d = 0.55 * smoothstep(0.7, 0.75, u) * (1 - smoothstep(0.92, 1, u))
			const e = u > 0.85 && u < 0.875 ? 0.5 : 1
			alpha = Math.max(a, b, c, d * e)
			alpha *= 0.88 + 0.12 * noise.noise(u * 220, 0.5)
		} else {
			alpha = 0.35 * Math.exp(-Math.pow((u - 0.55) * 4, 2))
		}
		const brightness = 0.9 + 0.1 * noise.noise(u * 140, 3.7)
		return [rgb[0] * brightness, rgb[1] * brightness, rgb[2] * brightness, alpha * 255]
	})
}

const WHITE = new THREE.Color('#ffffff')

export { Sun } from './private/solar-sun'

export function OrbitLine({
	elements,
	color,
	highlighted,
	mode,
}: {
	mode: ScaleMode
	elements: PlanetData['elements']
	color: string
	highlighted: boolean
}) {
	const geometry = useMemo(() => {
		const pts = orbitPathPoints(elements, 420)
		for (let i = 0; i < pts.length; i++) pts[i] *= orbitDisplayScale(elements.a, mode)
		return new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pts, 3))
	}, [elements, mode])

	useEffect(() => () => geometry.dispose(), [geometry])
	return (
		<lineLoop geometry={geometry}>
			<lineBasicMaterial
				color={new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.25)}
				transparent
				opacity={highlighted ? 0.8 : 0.48}
			/>
		</lineLoop>
	)
}

/**
 * 行星环：径向条带贴图按真实半径映射（C 环半透明、B 环不透明、卡西尼缝、A 环、细 F 环），
 * 相机处于背光面时整体变暗（环的透射光效果）。
 */
function PlanetRings({
	radius,
	radiusKm,
	rings,
	planetId,
	sunPositionAt,
}: {
	sunPositionAt?: () => [number, number, number]
	radius: number
	radiusKm: number
	rings: NonNullable<PlanetData['rings']>
	planetId: string
}) {
	const isSaturn = planetId === 'saturn'
	const stripTex = useLazyTexture(isSaturn ? SATURN_RING_TEXTURE_URL : null)
	const fallbackTex = useMemo(() => createRingStripTexture(rings.color, isSaturn), [rings.color, isSaturn])

	const innerKm = isSaturn ? RING_STRIP_INNER_KM : rings.inner * radiusKm
	const outerKm = isSaturn ? RING_STRIP_OUTER_KM : rings.outer * radiusKm

	const material = useMemo(() => {
		return new THREE.ShaderMaterial({
			uniforms: {
				uRingTex: { value: fallbackTex },
				uSunPosition: { value: new THREE.Vector3() },
				uStripInnerKm: { value: innerKm },
				uStripOuterKm: { value: outerKm },
				uPlanetRadiusKm: { value: radiusKm },
				uDisplayRadius: { value: radius },
				uOpacity: { value: rings.opacity },
			},
			transparent: true,
			side: THREE.DoubleSide,
			depthWrite: false,
			vertexShader: `
        #include <common>
        #include <logdepthbuf_pars_vertex>
        varying vec2 vRingPos;
        varying vec3 vWorldPos;
        varying vec3 vNormalW;
        void main() {
          vRingPos = position.xy;
          vNormalW = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
          #include <logdepthbuf_vertex>
        }`,
			fragmentShader: `
        #include <logdepthbuf_pars_fragment>
        uniform vec3 uSunPosition;
        uniform sampler2D uRingTex;
        uniform float uStripInnerKm;
        uniform float uStripOuterKm;
        uniform float uPlanetRadiusKm;
        uniform float uDisplayRadius;
        uniform float uOpacity;
        varying vec2 vRingPos;
        varying vec3 vWorldPos;
        varying vec3 vNormalW;
        void main() {
          #include <logdepthbuf_fragment>
          float km = length(vRingPos) / uDisplayRadius * uPlanetRadiusKm;
          float u = (km - uStripInnerKm) / (uStripOuterKm - uStripInnerKm);
          if (u < 0.0 || u > 1.0) discard;
          vec4 ring = texture2D(uRingTex, vec2(u, 0.5));
          vec3 n = normalize(vNormalW);
          vec3 sunDir = normalize(uSunPosition - vWorldPos);
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          // 相机与太阳分居环面两侧 → 背光面，环变暗且略透
          float backlit = step(dot(n, sunDir) * dot(n, viewDir), 0.0);
          float bright = mix(1.0, 0.32, backlit);
          float alpha = ring.a * uOpacity * mix(1.0, 0.7, backlit);
          float grazing = 0.55 + 0.45 * abs(dot(n, sunDir));
          // 条带原图（Voyager 反向散射）偏苍白，调色回水冰环的暖米色；
          // 亮度跟随光学深度（alpha）：B 环亮、A 环次之、C 环暗，贴近真实观感
          vec3 graded = pow(ring.rgb, vec3(1.25)) * vec3(1.06, 0.94, 0.72);
          graded *= 0.4 + 0.6 * ring.a;
          gl_FragColor = vec4(graded * bright * grazing, alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
		})
	}, [fallbackTex, isSaturn, radius, radiusKm, rings])

	useFrame(() => {
		material.uniforms.uSunPosition.value.set(...(sunPositionAt?.() ?? [0, 0, 0]))
	})

	useEffect(
		() => () => {
			material.dispose()
			fallbackTex.dispose()
		},
		[material, fallbackTex],
	)

	useEffect(() => {
		if (stripTex) material.uniforms.uRingTex.value = stripTex
	}, [stripTex, material])

	return (
		<mesh rotation={[Math.PI / 2, 0, 0]}>
			{/* 几何半径与条带物理跨度（km）对齐，否则外 A 环与 F 环会被裁掉 */}
			<ringGeometry args={[radius * (innerKm / radiusKm), radius * (outerKm / radiusKm), 128, 1]} />
			<primitive object={material} attach="material" />
		</mesh>
	)
}

export function PlanetNode({
	data,
	mode,
	labels,
	showMoons,
	moonLabels = labels,
	showOrbits,
	simDaysRef,
	selected,
	onSelect,
	registerBody,
	positionAt,
	sunPositionAt,
}: {
	data: PlanetData
	mode: ScaleMode
	labels: boolean
	showMoons: boolean
	moonLabels?: boolean
	showOrbits: boolean
	simDaysRef: React.MutableRefObject<number>
	selected: boolean
	onSelect: (id: string) => void
	registerBody: (id: string, obj: THREE.Object3D | null) => void
	sunPositionAt?: () => [number, number, number]
	positionAt?: () => [number, number, number]
}) {
	const rootRef = useRef<THREE.Group>(null)
	const spinRef = useRef<THREE.Mesh>(null)
	const cloudRef = useRef<THREE.Mesh>(null)
	const matRef = useRef<THREE.MeshStandardMaterial>(null)
	const tx = useExperienceI18n()
	const radius = bodyRadius(data.radiusKm, mode)
	const isEarth = data.id === 'earth'
	const dayTex = useLazyTexture(isEarth ? null : planetTextureUrl(data.texture))
	const sunDirection = useMemo(() => new THREE.Vector3(), [])
	const baseColor = useMemo(() => new THREE.Color(data.color), [data.color])
	const fadeRef = useRef(0)

	useEffect(() => {
		registerBody(data.id, rootRef.current)
		return () => registerBody(data.id, null)
	}, [data.id, registerBody])

	useFrame((_, delta) => {
		if (!rootRef.current || !spinRef.current) return
		const [x, y, z] = orbitalPosition(data.elements, simDaysRef.current)
		const scale = orbitDisplayScale(data.elements.a, mode)
		rootRef.current.position.set(...(positionAt ? positionAt() : ([x * scale, y * scale, z * scale] as [number, number, number])))
		sunDirection
			.set(...(sunPositionAt?.() ?? [0, 0, 0]))
			.sub(rootRef.current.position)
			.normalize()
		const rot = spinAngle(data.rotationHours, simDaysRef.current)
		spinRef.current.rotation.y = rot
		if (cloudRef.current) cloudRef.current.rotation.y = rot * 1.005
		// 贴图懒加载：先显示纯色低模，纹理 ready 后从基色淡入真实影像
		if (dayTex && matRef.current && fadeRef.current < 1) {
			if (!matRef.current.map) {
				matRef.current.map = dayTex
				matRef.current.needsUpdate = true
			}
			fadeRef.current = Math.min(1, fadeRef.current + delta / 0.9)
			const f = fadeRef.current
			const e = f * f * (3 - 2 * f)
			matRef.current.color.copy(baseColor).lerp(WHITE, e)
		}
	}, -2)

	return (
		<group ref={rootRef}>
			<group rotation={[0, 0, THREE.MathUtils.degToRad(data.obliquity)]}>
				<mesh
					ref={spinRef}
					onClick={(e) => {
						e.stopPropagation()
						onSelect(data.id)
					}}
					onPointerOver={(e) => {
						e.stopPropagation()
						document.body.style.cursor = 'pointer'
					}}
					onPointerOut={() => {
						document.body.style.cursor = 'auto'
					}}
				>
					<sphereGeometry args={[radius, isEarth ? 96 : 48, isEarth ? 64 : 32]} />
					{isEarth ? (
						<EarthMaterial layer="surface" sunDirection={sunDirection} />
					) : (
						<meshStandardMaterial
							ref={matRef}
							roughness={0.92}
							metalness={0.02}
							color={data.color}
							emissive={selected && mode === 'illustrated' ? data.color : '#000000'}
							emissiveIntensity={0.18}
						/>
					)}
				</mesh>
				{isEarth && (
					<mesh ref={cloudRef}>
						<sphereGeometry args={[radius * 1.0015, 96, 64]} />
						<EarthMaterial layer="clouds" sunDirection={sunDirection} />
					</mesh>
				)}
				{data.rings && (
					<PlanetRings radius={radius} radiusKm={data.radiusKm} rings={data.rings} planetId={data.id} sunPositionAt={sunPositionAt} />
				)}
				{isEarth && (
					<mesh>
						<sphereGeometry args={[radius * 1.012, 96, 64]} />
						<EarthMaterial layer="atmosphere" sunDirection={sunDirection} />
					</mesh>
				)}
				{selected && !isEarth && mode === 'illustrated' && (
					<mesh>
						<sphereGeometry args={[radius * 1.12, 32, 32]} />
						<meshBasicMaterial color={data.color} transparent opacity={0.045} depthWrite={false} blending={THREE.AdditiveBlending} />
					</mesh>
				)}
			</group>
			{labels && (
				<Html center zIndexRange={[7, 1]}>
					<button className="ss-body-label" data-experience-overlay="true" onClick={() => onSelect(data.id)}>
						<i style={{ borderColor: data.color }} />
						{tx(data.name)}
					</button>
				</Html>
			)}
			{showMoons &&
				data.moons.map((moon) => (
					<MoonNode
						key={moon.id}
						moon={moon}
						edgeLocator={selected && moon.id === 'moon'}
						planet={data}
						mode={mode}
						simDaysRef={simDaysRef}
						labels={moonLabels}
						showOrbits={showOrbits}
						onSelect={onSelect}
						registerBody={registerBody}
					/>
				))}
		</group>
	)
}

export function AsteroidBelt({
	simDaysRef,
	visible,
	mode,
}: {
	mode: ScaleMode
	simDaysRef: React.MutableRefObject<number>
	visible: boolean
}) {
	const pointsRef = useRef<THREE.Points>(null)
	const beltData = useMemo(() => {
		const arr: { a: number; phase: number; n: number; y: number; e: number }[] = []
		for (let i = 0; i < 2600; i++) {
			const a = 2.1 + Math.random() * 1.2
			const period = Math.pow(a, 1.5) * 365.25
			arr.push({
				a,
				phase: Math.random() * Math.PI * 2,
				n: (2 * Math.PI) / period,
				y: (Math.random() - 0.5) * 0.06 * a,
				e: Math.random() * 0.08,
			})
		}
		return arr
	}, [])

	useFrame(() => {
		if (!pointsRef.current || !visible) return
		const attr = pointsRef.current.geometry.attributes.position
		const arr = attr.array as Float32Array
		for (let i = 0; i < beltData.length; i++) {
			const d = beltData[i]
			const angle = d.phase + d.n * simDaysRef.current
			const r = d.a * (1 - d.e * Math.cos(angle)) * orbitDisplayScale(d.a, mode)
			arr[i * 3] = Math.cos(angle) * r
			arr[i * 3 + 1] = d.y * orbitDisplayScale(d.a, mode)
			arr[i * 3 + 2] = Math.sin(angle) * r
		}
		attr.needsUpdate = true
	})

	if (!visible) return null
	return (
		<points ref={pointsRef}>
			<bufferGeometry>
				<bufferAttribute attach="attributes-position" args={[new Float32Array(beltData.length * 3), 3]} />
			</bufferGeometry>
			<pointsMaterial color="#b09a80" size={0.55} sizeAttenuation transparent opacity={0.75} />
		</points>
	)
}

export function KuiperBelt({
	simDaysRef,
	visible,
	mode,
}: {
	mode: ScaleMode
	simDaysRef: React.MutableRefObject<number>
	visible: boolean
}) {
	const pointsRef = useRef<THREE.Points>(null)
	const beltData = useMemo(() => {
		const arr: { a: number; phase: number; n: number; y: number; e: number }[] = []
		for (let i = 0; i < 3200; i++) {
			const a = 30 + Math.random() * 20
			const period = Math.pow(a, 1.5) * 365.25
			arr.push({
				a,
				phase: Math.random() * Math.PI * 2,
				n: (2 * Math.PI) / period,
				y: (Math.random() - 0.5) * 0.15 * a,
				e: Math.random() * 0.12,
			})
		}
		return arr
	}, [])

	useFrame(() => {
		if (!pointsRef.current || !visible) return
		const attr = pointsRef.current.geometry.attributes.position
		const arr = attr.array as Float32Array
		for (let i = 0; i < beltData.length; i++) {
			const d = beltData[i]
			const angle = d.phase + d.n * simDaysRef.current
			const r = d.a * (1 - d.e * Math.cos(angle)) * orbitDisplayScale(d.a, mode)
			arr[i * 3] = Math.cos(angle) * r
			arr[i * 3 + 1] = d.y * orbitDisplayScale(d.a, mode)
			arr[i * 3 + 2] = Math.sin(angle) * r
		}
		attr.needsUpdate = true
	})

	if (!visible) return null
	return (
		<points ref={pointsRef}>
			<bufferGeometry>
				<bufferAttribute attach="attributes-position" args={[new Float32Array(beltData.length * 3), 3]} />
			</bufferGeometry>
			<pointsMaterial color="#8fa8c8" size={0.5} sizeAttenuation transparent opacity={0.45} />
		</points>
	)
}

/** 三层视差星场：近景亮星稀疏而大，中层银河带倾斜，远景暗星细小 */
export function StarField({ followCamera = false }: { followCamera?: boolean }) {
	const groupRef = useRef<THREE.Group>(null)
	const materials = useMemo(() => {
		const mats: THREE.ShaderMaterial[] = []
		const make = (count: number, minR: number, maxR: number, tilt: number | null, minSize: number, maxSize: number, brightness: number) => {
			const positions = new Float32Array(count * 3)
			const colors = new Float32Array(count * 3)
			const sizes = new Float32Array(count)
			const phases = new Float32Array(count)
			const palette = ['#9bb4ff', '#cfd8ff', '#ffffff', '#fff2d8', '#ffd9a0', '#ffb08a'].map((c) => new THREE.Color(c))
			const quat = new THREE.Quaternion()
			if (tilt !== null) quat.setFromEuler(new THREE.Euler(tilt, 0.4, 0.25))
			for (let i = 0; i < count; i++) {
				let v: THREE.Vector3
				if (tilt !== null) {
					const l = Math.random() * Math.PI * 2
					const b = () => (Math.random() + Math.random() + Math.random() - 1.5) * 0.22
					v = new THREE.Vector3(Math.cos(l), b(), Math.sin(l)).normalize().applyQuaternion(quat)
				} else {
					v = new THREE.Vector3().randomDirection()
				}
				const d = minR + Math.random() * (maxR - minR)
				v.multiplyScalar(d)
				positions.set([v.x, v.y, v.z], i * 3)
				const c = palette[Math.floor(Math.random() * palette.length)]
				colors.set([c.r * brightness, c.g * brightness, c.b * brightness], i * 3)
				sizes[i] = minSize + Math.pow(Math.random(), 2.5) * (maxSize - minSize)
				phases[i] = Math.random() * Math.PI * 2
			}
			const geo = new THREE.BufferGeometry()
			geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
			geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
			geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
			geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
			const mat = new THREE.ShaderMaterial({
				uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 } },
				transparent: true,
				depthWrite: false,
				blending: THREE.AdditiveBlending,
				vertexShader: `
          attribute vec3 aColor;
          attribute float aSize;
          attribute float aPhase;
          uniform float uTime;
          uniform float uPixelRatio;
          varying vec3 vColor;
          varying float vTw;
          void main() {
            vColor = aColor;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            float tw = 0.78 + 0.22 * sin(uTime * 1.6 + aPhase);
            vTw = tw;
            gl_PointSize = max(1.2, aSize) * uPixelRatio;
            gl_Position = projectionMatrix * mv;
            gl_Position.z = gl_Position.w * 0.999999;
          }`,
				fragmentShader: `
          varying vec3 vColor;
          varying float vTw;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.02, d);
            gl_FragColor = vec4(vColor * vTw, a);
            #include <colorspace_fragment>
          }`,
			})
			mats.push(mat)
			return { geo, mat }
		}
		const near = make(900, 5500, 9500, null, 1.4, 3.1, 0.85)
		const band = make(2400, 15000, 24000, 1.05, 1.2, 2.1, 0.45)
		const far = make(2600, 28000, 42000, null, 1.1, 1.6, 0.35)
		return [
			{ geometry: near.geo, material: near.mat },
			{ geometry: band.geo, material: band.mat },
			{ geometry: far.geo, material: far.mat },
		]
	}, [])

	useEffect(
		() => () => {
			for (const m of materials) {
				m.geometry.dispose()
				m.material.dispose()
			}
		},
		[materials],
	)
	useFrame(({ camera, gl }) => {
		if (followCamera) groupRef.current?.position.copy(camera.position)
		for (const m of materials) {
			m.material.uniforms.uTime.value = 0
			m.material.uniforms.uPixelRatio.value = gl.getPixelRatio()
			m.material.depthTest = true
		}
		// Star directions remain fixed; no fictitious rotating sky.
	})

	return (
		<group ref={groupRef}>
			{materials.map((m, i) => (
				<points key={i} geometry={m.geometry} material={m.material} renderOrder={-90} frustumCulled={false} />
			))}
		</group>
	)
}

function MoonNode({
	moon,
	edgeLocator,
	planet,
	mode,
	simDaysRef,
	labels,
	showOrbits,
	onSelect,
	registerBody,
}: {
	moon: MoonData
	edgeLocator: boolean
	planet: PlanetData
	mode: ScaleMode
	simDaysRef: React.MutableRefObject<number>
	labels: boolean
	showOrbits: boolean
	onSelect: (id: string) => void
	registerBody: (id: string, obj: THREE.Object3D | null) => void
}) {
	const ref = useRef<THREE.Group>(null)
	const tx = useExperienceI18n()
	const map = useLazyTexture(moon.id === 'moon' ? MOON_TEXTURE_URL : null)
	const radius = moonRadius(moon, planet, mode)
	const geometry = useMemo(() => {
		const points = Array.from(
			{ length: 161 },
			(_, i) => new THREE.Vector3(...moonPosition(moon, planet, mode, (i / 160) * moon.periodDays)),
		)
		return new THREE.BufferGeometry().setFromPoints(points)
	}, [moon, planet, mode])
	useEffect(() => () => geometry.dispose(), [geometry])
	useEffect(() => {
		registerBody(moon.id, ref.current)
		return () => registerBody(moon.id, null)
	}, [moon.id, registerBody])
	useFrame(() => {
		if (!ref.current) return
		ref.current.position.set(...moonPosition(moon, planet, mode, simDaysRef.current))
		// Selected moons are approximately synchronous. Orientation is schematic.
		ref.current.rotation.y = spinAngle(moon.periodDays * 24, simDaysRef.current)
	}, -1)
	return (
		<>
			{labels && edgeLocator && <MoonLocator body={ref} onSelect={onSelect} />}
			{showOrbits && (
				<lineLoop geometry={geometry}>
					<lineBasicMaterial color={moon.color} transparent opacity={0.23} />
				</lineLoop>
			)}
			<group ref={ref}>
				<mesh
					onClick={(e) => {
						e.stopPropagation()
						onSelect(moon.id)
					}}
				>
					<sphereGeometry args={[radius, 32, 24]} />
					<meshStandardMaterial map={map ?? undefined} color={map ? '#fff' : moon.color} roughness={1} />
				</mesh>
				{labels && !edgeLocator && (
					<Html center zIndexRange={[7, 1]} distanceFactor={undefined}>
						<button
							className={`ss-body-label ss-moon-label${planet.moons.length > 4 && moon.aKm < 600000 ? ' ss-tight-label' : ''}`}
							aria-label={tx(moon.name)}
							data-experience-overlay="true"
							onClick={() => onSelect(moon.id)}
						>
							<i />
							<span>{tx(moon.name)}</span>
						</button>
					</Html>
				)}
			</group>
		</>
	)
}
