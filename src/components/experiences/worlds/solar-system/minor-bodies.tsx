import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useExperienceI18n } from '~/i18n/experience'
import records from './minor-data.json'
import { orbitalPosition, orbitPathPoints } from './orbital-model'
import { bodyRadius, orbitDisplayScale, UNITS_PER_AU, type ScaleMode } from './scale-model'
export const MINOR_BODIES = records
export type MinorBody = (typeof records)[number]
export function minorPosition(body: MinorBody, days: number, mode: ScaleMode): [number, number, number] {
	const scale = orbitDisplayScale(body.elements.a, mode)
	return orbitalPosition(body.elements, days - body.epochDays, body.periodDays).map((v) => v * scale) as [number, number, number]
}
function MinorNode({
	body,
	days,
	mode,
	labels,
	orbits,
	onSelect,
	registerBody,
}: {
	body: MinorBody
	days: MutableRefObject<number>
	mode: ScaleMode
	labels: boolean
	orbits: boolean
	onSelect: (id: string) => void
	registerBody: (id: string, obj: THREE.Object3D | null) => void
}) {
	const tx = useExperienceI18n(),
		root = useRef<THREE.Group>(null),
		tail = useRef<THREE.Group>(null)
	const geometry = useMemo(() => {
		const positions = orbitPathPoints(body.elements, 600),
			s = orbitDisplayScale(body.elements.a, mode)
		for (let i = 0; i < positions.length; i++) positions[i] *= s
		const g = new THREE.BufferGeometry()
		g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
		return g
	}, [body, mode])
	const material = useMemo(() => new THREE.LineBasicMaterial({ color: body.color, transparent: true, opacity: 0.2 }), [body])
	const line = useMemo(() => new THREE.LineLoop(geometry, material), [geometry, material])
	useEffect(
		() => () => {
			geometry.dispose()
			material.dispose()
		},
		[geometry, material],
	)
	useEffect(() => {
		registerBody(body.id, root.current)
		return () => registerBody(body.id, null)
	}, [registerBody, body.id])
	const radius = bodyRadius(body.radiusKm, mode)
	useFrame(() => {
		if (!root.current) return
		root.current.position.set(...minorPosition(body, days.current, mode))
		if (tail.current) {
			const distance = Math.hypot(...orbitalPosition(body.elements, days.current - body.epochDays, body.periodDays))
			tail.current.visible = distance < 4
			const away = root.current.position.clone().normalize()
			tail.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), away)
			const length =
				mode === 'physical' ? (UNITS_PER_AU * 0.05) / Math.max(0.3, distance) : Math.max(radius * 18, 20) / Math.max(0.3, distance)
			tail.current.scale.set(length * 0.065, length, length * 0.065)
		}
	})
	return (
		<>
			{orbits && <primitive object={line} />}
			<group ref={root}>
				<mesh
					onClick={(e) => {
						e.stopPropagation()
						onSelect(body.id)
					}}
				>
					<sphereGeometry args={[radius, 32, 24]} />
					<meshStandardMaterial color={body.color} roughness={1} />
				</mesh>
				{body.kind === 'comet' && (
					<group ref={tail}>
						<mesh position={[0, 0.5, 0]} rotation={[0, 0, Math.PI]}>
							<coneGeometry args={[1, 1, 18, 1, true]} />
							<meshBasicMaterial color="#a6d5df" transparent opacity={0.08} depthWrite={false} side={THREE.DoubleSide} />
						</mesh>
					</group>
				)}
				{labels && (
					<Html center zIndexRange={[7, 0]}>
						<button type="button" className="ss-body-label" data-experience-overlay="true" onClick={() => onSelect(body.id)}>
							<i />
							{tx(body.name)}
						</button>
					</Html>
				)}
			</group>
		</>
	)
}
export function MinorBodies({
	days,
	mode,
	selected,
	labels,
	orbits,
	onSelect,
	registerBody,
}: {
	days: MutableRefObject<number>
	mode: ScaleMode
	selected: string | null
	labels: boolean
	orbits: boolean
	onSelect: (id: string) => void
	registerBody: (id: string, obj: THREE.Object3D | null) => void
}) {
	return (
		<>
			{records
				.filter((b) => !selected || selected === b.id)
				.map((body) => (
					<MinorNode key={body.id} {...{ body, days, mode, labels, orbits, onSelect, registerBody }} />
				))}
		</>
	)
}
function RegionLabel({ au, name }: { au: number; name: string }) {
	const tx = useExperienceI18n()
	const [visible, setVisible] = useState(false)
	useFrame(({ camera }) => setVisible(camera.position.length() < au * UNITS_PER_AU * 12))
	return visible ? (
		<Html position={[au * UNITS_PER_AU, 0, 0]} center zIndexRange={[5, 0]}>
			<span className="ss-region-label" data-experience-overlay="true">
				{tx(name)}
				<small>{au.toLocaleString('en-US')} AU</small>
			</span>
		</Html>
	) : null
}

/** Sparse reference shells, never an opaque wall or a literal photograph of a cloud. */
export function OuterRegions() {
	const points = useMemo(() => {
		const p = new Float32Array(2400)
		let seed = 1337
		const random = () => {
			seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
			return seed / 4294967296
		}
		for (let i = 0; i < p.length; i += 3) {
			const a = random() * Math.PI * 2,
				z = random() * 2 - 1,
				r = (2000 + 98000 * random() ** 0.55) * UNITS_PER_AU,
				v = Math.sqrt(1 - z * z)
			p.set([r * v * Math.cos(a), r * z, r * v * Math.sin(a)], i)
		}
		return p
	}, [])
	return (
		<group>
			<points>
				<bufferGeometry>
					<bufferAttribute attach="attributes-position" args={[points, 3]} />
				</bufferGeometry>
				<pointsMaterial color="#8a9aae" size={1} sizeAttenuation={false} transparent opacity={0.35} depthWrite={false} />
			</points>
			{[
				{ au: 50, name: '柯伊伯带外缘参考', color: '#c6a56b' },
				{ au: 120, name: '日球层顶尺度参考', color: '#b997ce' },
				{ au: 2000, name: '奥尔特云内缘参考', color: '#7ba5ad' },
				{ au: 100000, name: '奥尔特云外缘参考', color: '#8a9aae' },
			].map((region) => (
				<group key={region.au}>
					<mesh rotation={[-Math.PI / 2, 0, 0]}>
						<ringGeometry args={[region.au * UNITS_PER_AU * 0.999, region.au * UNITS_PER_AU * 1.001, 256]} />
						<meshBasicMaterial color={region.color} transparent opacity={0.4} side={THREE.DoubleSide} />
					</mesh>
					<RegionLabel au={region.au} name={region.name} />
				</group>
			))}
		</group>
	)
}
