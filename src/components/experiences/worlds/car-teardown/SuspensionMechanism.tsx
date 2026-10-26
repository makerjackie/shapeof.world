import {useEffect, useMemo, useRef, type RefObject} from 'react'
import {useFrame} from './animation'
import * as T from 'three'
import {BODY_GEOMETRY as B, CHASSIS_GEOMETRY as C, SUSPENSION_GEOMETRY as G, VEHICLE_SPEC as S} from './vehicle-spec'
import {TeardownPart, useTeardownProgress, useTeardown} from './TeardownPart'
import {ROAD_TEARDOWN_SPEC as R, outwardOffset} from './road-teardown-spec'
import {bodyPoint, cabinPoint} from './body-geometry'
import type {SuspensionState} from './suspension-model'
import {Wheel} from './Wheels'

type Axle = 'front' | 'rear'
type Point = (state: SuspensionState, target: T.Vector3) => T.Vector3
type StateRef = RefObject<SuspensionState>
const up = new T.Vector3(0, 1, 0)
const bodyOffset = (state: SuspensionState, x: number) => state.heave + x * Math.tan(state.pitch)
const axleX = (axle: Axle) => (axle === 'front' ? S.dimensions.frontAxleX : S.dimensions.rearAxleX)
const anchor =
	(axle: Axle, side: number, p: readonly number[], attachedTo: 'body' | 'wheel'): Point =>
	(state, target) => {
		const x = axleX(axle) + p[0]
		return target.set(x, p[1] + (attachedTo === 'body' ? bodyOffset(state, x) : state[axle].wheel), side * p[2])
	}

/** One reusable unit cylinder; its endpoints follow the shared physical state. */
function MovingBar({
	stateRef,
	from,
	to,
	radius,
	color = G.armColor,
	id,
}: {
	stateRef: StateRef
	from: Point
	to: Point
	radius: number
	color?: string
	id?: string
}) {
	const mesh = useRef<T.Mesh>(null)
	const vectors = useMemo(() => ({a: new T.Vector3(), b: new T.Vector3(), direction: new T.Vector3()}), [])
	useFrame(() => {
		if (!mesh.current) return
		from(stateRef.current, vectors.a)
		to(stateRef.current, vectors.b)
		vectors.direction.subVectors(vectors.b, vectors.a)
		mesh.current.position.copy(vectors.a).add(vectors.b).multiplyScalar(0.5)
		mesh.current.scale.y = vectors.direction.length()
		mesh.current.quaternion.setFromUnitVectors(up, vectors.direction.normalize())
	})
	return (
		<mesh ref={mesh} castShadow userData={{partId: id}}>
			<cylinderGeometry args={[radius, radius, 1, 18]} />
			<meshStandardMaterial color={color} metalness={0.8} roughness={0.32} />
		</mesh>
	)
}

function MovingJoint({stateRef, point, id}: {stateRef: StateRef; point: Point; id?: string}) {
	const mesh = useRef<T.Mesh>(null)
	useFrame(() => {
		if (mesh.current) point(stateRef.current, mesh.current.position)
	})
	return (
		<mesh ref={mesh} userData={{partId: id}}>
			<sphereGeometry args={[G.jointRadius, 12, 8]} />
			<meshStandardMaterial color="#343e49" metalness={0.6} roughness={0.45} />
		</mesh>
	)
}

/** Fixed six turns and circular wire. Only the helix pitch changes with travel. */
function MovingSpring({stateRef, from, to, id}: {stateRef: StateRef; from: Point; to: Point; id: string}) {
	const mesh = useRef<T.Mesh>(null)
	const lowerSeat = useRef<T.Mesh>(null),
		upperSeat = useRef<T.Mesh>(null)
	const cache = useMemo(() => {
		const turns = G.springTurns,
			segments = turns * G.springSegmentsPerTurn,
			radial = G.springRadialSegments
		const geometry = new T.BufferGeometry()
		geometry.setAttribute(
			'position',
			new T.BufferAttribute(new Float32Array((segments + 1) * (radial + 1) * 3), 3).setUsage(T.DynamicDrawUsage),
		)
		geometry.setAttribute(
			'normal',
			new T.BufferAttribute(new Float32Array((segments + 1) * (radial + 1) * 3), 3).setUsage(T.DynamicDrawUsage),
		)
		const indices: number[] = []
		for (let i = 0; i < segments; i++)
			for (let j = 0; j < radial; j++) {
				const a = i * (radial + 1) + j,
					b = a + radial + 1
				indices.push(a, b, a + 1, a + 1, b, b + 1)
			}
		geometry.setIndex(indices)
		return {
			geometry,
			segments,
			radial,
			a: new T.Vector3(),
			b: new T.Vector3(),
			direction: new T.Vector3(),
			quaternion: new T.Quaternion(),
		}
	}, [])
	useEffect(() => () => cache.geometry.dispose(), [cache])
	useFrame(() => {
		if (!mesh.current) return
		from(stateRef.current, cache.a)
		to(stateRef.current, cache.b)
		cache.direction.subVectors(cache.b, cache.a)
		const length = cache.direction.length()
		cache.quaternion.setFromUnitVectors(up, cache.direction.normalize())
		mesh.current.position.copy(cache.a)
		mesh.current.quaternion.copy(cache.quaternion)
		for (const [seat, p] of [
			[lowerSeat.current, cache.a],
			[upperSeat.current, cache.b],
		] as const)
			if (seat) {
				seat.position.copy(p)
				seat.quaternion.copy(cache.quaternion)
			}
		const position = cache.geometry.getAttribute('position'),
			normal = cache.geometry.getAttribute('normal')
		const rotation = G.springTurns * Math.PI * 2,
			tangentLength = Math.hypot(G.springRadius * rotation, length)
		for (let i = 0; i <= cache.segments; i++) {
			const t = i / cache.segments,
				angle = rotation * t,
				ca = Math.cos(angle),
				sa = Math.sin(angle)
			for (let j = 0; j <= cache.radial; j++) {
				const phase = (j / cache.radial) * Math.PI * 2,
					cp = Math.cos(phase),
					sp = Math.sin(phase)
				const nx = ca * cp - ((length * sa) / tangentLength) * sp
				const ny = ((-G.springRadius * rotation) / tangentLength) * sp
				const nz = sa * cp + ((length * ca) / tangentLength) * sp
				const index = i * (cache.radial + 1) + j
				position.setXYZ(
					index,
					G.springRadius * ca + G.springWire * nx,
					length * t + G.springWire * ny,
					G.springRadius * sa + G.springWire * nz,
				)
				normal.setXYZ(index, nx, ny, nz)
			}
		}
		position.needsUpdate = normal.needsUpdate = true
		cache.geometry.computeBoundingSphere()
	})
	return (
		<group userData={{partId: id}}>
			<mesh ref={mesh} geometry={cache.geometry} castShadow>
				<meshStandardMaterial color={G.springColor} metalness={0.85} roughness={0.25} />
			</mesh>
			{[lowerSeat, upperSeat].map((ref, i) => (
				<mesh
					key={i}
					ref={ref}
					castShadow
					userData={{
						partId: `suspension-spring-seat-${(Number(id.split('-').at(-1)) - 1) * 2 + i + 1}`,
					}}
				>
					<cylinderGeometry args={[G.springSeatRadius, G.springSeatRadius, G.springSeatThickness, 40]} />
					<meshStandardMaterial color={G.armColor} metalness={0.8} roughness={0.35} />
				</mesh>
			))}
		</group>
	)
}

function Damper({stateRef, from, to, id, bodyLength}: {stateRef: StateRef; from: Point; to: Point; id: string; bodyLength: number}) {
	const middle = useMemo<Point>(() => {
		const end = new T.Vector3(),
			direction = new T.Vector3()
		return (state, target) => {
			from(state, target)
			to(state, end)
			return target.addScaledVector(direction.subVectors(end, target).normalize(), bodyLength)
		}
	}, [from, to, bodyLength])
	return (
		<group userData={{partId: id}}>
			<MovingBar stateRef={stateRef} from={from} to={middle} radius={G.shockRadius} color="#46596c" />
			<MovingBar
				stateRef={stateRef}
				from={middle}
				to={to}
				radius={G.shockRodRadius}
				color={G.rodColor}
				id={`suspension-damper-rod-${id.split('-').at(-1)}`}
			/>
			<MovingJoint stateRef={stateRef} point={to} />
		</group>
	)
}

function Corner({
	stateRef,
	axle,
	side,
	index,
	hideWheel = false,
}: {
	hideWheel?: boolean
	stateRef: StateRef
	axle: Axle
	side: -1 | 1
	index: number
}) {
	const compact = !!useTeardown().assembly
	const poseRef = useRef({steer: 0, heave: 0}),
		spinRef = useRef(0)
	const hub = useRef<T.Mesh>(null)
	const points = useMemo(() => {
		const make = (p: readonly number[], owner: 'body' | 'wheel') => anchor(axle, side, p, owner)
		const between = (a: Point, b: Point, t: number): Point => {
			const end = new T.Vector3()
			return (state, target) => a(state, target).lerp(b(state, end), t)
		}
		if (axle === 'front') {
			const f = G.front
			const bottom = make(f.strutBottom, 'wheel'),
				top = make(f.strutTop, 'body')
			const pivots = f.lowerPivots.map((p) => make(p, 'body'))
			const a = new T.Vector3(),
				b = new T.Vector3()
			const lengthSquared = new T.Vector3(...f.lowerPivots[0]).distanceToSquared(new T.Vector3(...f.lowerBall))
			// Intersect the two rigid lower-arm radii with the prescribed wheel
			// height. Both branches rotate about their body-side bushings.
			const ball: Point = (state, target) => {
				pivots[0](state, a)
				pivots[1](state, b)
				const y = f.lowerBall[1] + state.front.wheel
				const x = (b.x ** 2 + b.y ** 2 - a.x ** 2 - a.y ** 2 - 2 * (b.y - a.y) * y) / (2 * (b.x - a.x))
				const z = a.z + side * Math.sqrt(Math.max(0, lengthSquared - (x - a.x) ** 2 - (y - a.y) ** 2))
				return target.set(x, y, z)
			}
			return {
				arms: pivots.map((pivot) => [pivot, ball] as const),
				bottom,
				top,
				springBottom: between(bottom, top, f.springStart),
				springTop: between(bottom, top, f.springEnd),
				ball,
				shockBodyLength: new T.Vector3(...f.strutBottom).distanceTo(new T.Vector3(...f.strutTop)) * G.shockBodyFraction,
			}
		}
		const r = G.rear
		const arms = r.links.map((p) => {
			const from = make(p.slice(0, 3), 'body'),
				nominal = make(p.slice(3), 'wheel'),
				pivot = new T.Vector3()
			const lengthSquared = (p[3] - p[0]) ** 2 + (p[4] - p[1]) ** 2 + (p[5] - p[2]) ** 2
			const to: Point = (state, target) => {
				from(state, pivot)
				nominal(state, target)
				target.z = pivot.z + side * Math.sqrt(Math.max(0, lengthSquared - (target.x - pivot.x) ** 2 - (target.y - pivot.y) ** 2))
				return target
			}
			return [from, to] as const
		})
		return {
			arms,
			bottom: make(r.shockBottom, 'wheel'),
			top: make(r.shockTop, 'body'),
			springBottom: make(r.springBottom, 'wheel'),
			springTop: make(r.springTop, 'body'),
			ball: arms[2][1],
			shockBodyLength: new T.Vector3(...r.shockBottom).distanceTo(new T.Vector3(...r.shockTop)) * G.shockBodyFraction,
		}
	}, [axle, side])
	useFrame(() => {
		poseRef.current.heave = stateRef.current[axle].wheel
		spinRef.current = stateRef.current.wheelAngle
		if (hub.current) hub.current.position.y = S.wheels.radius + stateRef.current[axle].wheel
	}, -0.5)
	const track = axle === 'front' ? S.wheels.frontTrack : S.wheels.rearTrack
	return (
		<group>
			{!compact && !hideWheel && <Wheel axle={axle} side={side} poseRef={poseRef} spinRef={spinRef} />}
			<TeardownPart
				id="susp-hubs"
				representative={index % 2 === 0}
				offset={outwardOffset(R.suspension.hubs, side)}
				anchor={[axleX(axle), S.wheels.radius, side * (track / 2 - G.hubInset)]}
			>
				<mesh
					ref={hub}
					position={[axleX(axle), S.wheels.radius, side * (track / 2 - G.hubInset)]}
					rotation={[Math.PI / 2, 0, 0]}
					userData={{partId: `hub-${index}`}}
				>
					<cylinderGeometry args={[G.hubRadius, G.hubRadius, G.hubWidth, 40]} />
					<meshStandardMaterial color={G.armColor} metalness={0.85} roughness={0.3} />
				</mesh>
			</TeardownPart>
			{points.arms.map(([from, to], i) => (
				<TeardownPart
					key={i}
					id={axle === 'front' ? 'susp-arms' : 'susp-links'}
					representative={side > 0 && i === 0}
					offset={outwardOffset(axle === 'front' ? R.suspension.arms : R.suspension.links, side)}
					anchor={[axleX(axle), 0.3, side * 0.5]}
				>
					<MovingBar
						key={i}
						stateRef={stateRef}
						from={from}
						to={to}
						radius={G.armRadius}
						id={axle === 'front' ? `control-arm-${index}` : `rear-link-${(index - 3) * G.rear.links.length + i + 1}`}
					/>
				</TeardownPart>
			))}
			<TeardownPart
				id="susp-knuckles"
				representative={index % 2 === 0}
				offset={outwardOffset(R.suspension.knuckles, side)}
				anchor={[axleX(axle), S.wheels.radius, side * (track / 2 - G.hubInset)]}
			>
				{!compact && <MovingJoint stateRef={stateRef} point={points.ball} id={`suspension-ball-joint-${index}`} />}
				<MovingBar stateRef={stateRef} from={points.ball} to={points.bottom} radius={G.knuckleRadius} id={`suspension-knuckle-${index}`} />
			</TeardownPart>
			<TeardownPart
				id="susp-dampers"
				representative={index % 2 === 0}
				offset={outwardOffset(R.suspension.dampers, side)}
				anchor={[axleX(axle), 0.6, side * 0.65]}
			>
				<Damper stateRef={stateRef} from={points.bottom} to={points.top} bodyLength={points.shockBodyLength} id={`damper-${index}`} />
			</TeardownPart>
			<TeardownPart
				id="susp-springs"
				representative={index % 2 === 0}
				offset={outwardOffset(R.suspension.springs, side)}
				anchor={[axleX(axle), 0.72, side * 0.6]}
			>
				<MovingSpring stateRef={stateRef} from={points.springBottom} to={points.springTop} id={`spring-${index}`} />
			</TeardownPart>
			{compact && (
				<>
					<TeardownPart id="susp-top">
						<MovingMount stateRef={stateRef} point={points.top} />
					</TeardownPart>
					<TeardownPart id="susp-ball">
						<MovingJoint stateRef={stateRef} point={points.ball} id="corner-lower-ball" />
					</TeardownPart>
					<TeardownPart id="susp-drop-link">
						<MovingBar
							stateRef={stateRef}
							from={anchor(axle, side, [0.12, 0.28, 0.5], 'body')}
							to={anchor(axle, side, [0.12, 0.46, 0.63], 'wheel')}
							radius={G.armRadius * 0.45}
							id="corner-drop-link"
						/>
					</TeardownPart>
				</>
			)}
		</group>
	)
}

function Subframes({stateRef}: {stateRef: StateRef}) {
	const bars = useMemo(
		() =>
			(['front', 'rear'] as const).flatMap((axle, index) => {
				const length = axle === 'front' ? C.subframe.frontLength : C.subframe.rearLength
				const point = (x: number, z: number) => anchor(axle, 1, [x, C.crossmember.y, z], 'body')
				const bars = [-1, 1].flatMap((side) => [
					{
						from: point(-length / 2, side * C.rail.z),
						to: point(length / 2, side * C.rail.z),
						id: `subframe-${index + 1}`,
					},
					axle === 'front'
						? {
								from: point(-length / 2, side * C.rail.z),
								to: point(length / 2, 0),
								id: `subframe-${index + 1}`,
							}
						: {
								from: point((side * length) / 2, -C.rail.z),
								to: point((side * length) / 2, C.rail.z),
								id: `subframe-${index + 1}`,
							},
				])
				if (axle === 'front')
					bars.push({
						from: point(length / 2, -C.rail.z),
						to: point(length / 2, C.rail.z),
						id: 'subframe-1',
					})
				return bars
			}),
		[],
	)
	const stabilizers = useMemo(
		() =>
			(['front', 'rear'] as const).flatMap((axle, i) => {
				const cross = (side: number) => anchor(axle, side, [0, S.wheels.radius * 0.65, C.rail.z], 'body')
				const end = (side: number) => anchor(axle, side, [-C.subframe.stabilizerOffset, S.wheels.radius, C.rail.z * 1.45], 'wheel')
				return [
					{from: cross(-1), to: cross(1), id: `antiroll-${i + 1}`},
					...[-1, 1].map((side) => ({from: cross(side), to: end(side), id: `antiroll-${i + 1}`})),
				]
			}),
		[],
	)
	return (
		<>
			<TeardownPart id="susp-subframes">
				{bars.map((p, i) => (
					<MovingBar key={i} stateRef={stateRef} {...p} radius={C.subframe.beamRadius} />
				))}
			</TeardownPart>
			{stabilizers.map((p, i) => (
				<TeardownPart key={i} id="susp-stabilizers" anchor={[i < 3 ? S.dimensions.frontAxleX : S.dimensions.rearAxleX, 0.22, 0]}>
					<MovingBar key={`antiroll-${i}`} stateRef={stateRef} {...p} radius={C.subframe.antirollRadius} color="#7a818b" />
				</TeardownPart>
			))}
		</>
	)
}

function BodyOutline({stateRef}: {stateRef: StateRef}) {
	const group = useRef<T.Group>(null)
	const geometry = useMemo(() => {
		const vertices: number[] = []
		const add = (fn: (t: number) => T.Vector3) => {
			for (let i = 0; i < G.outlineSegments; i++)
				vertices.push(...fn(i / G.outlineSegments).toArray(), ...fn((i + 1) / G.outlineSegments).toArray())
		}
		const start = B.sections[0][0],
			end = B.sections[B.sections.length - 1][0]
		for (const side of [-1, 1]) {
			for (const angle of [B.shoulderParameter * Math.PI, B.flankParameter * Math.PI])
				add((t) => bodyPoint(T.MathUtils.lerp(start, end, t), side * angle))
			add((t) =>
				cabinPoint(
					T.MathUtils.lerp(B.cabinSections[0][0], B.cabinSections[B.cabinSections.length - 1][0], t),
					side * B.glazing.sideTopAngle,
				),
			)
		}
		for (const x of [start, end]) add((t) => bodyPoint(x, t * Math.PI * 2))
		const g = new T.BufferGeometry()
		g.setAttribute('position', new T.Float32BufferAttribute(vertices, 3))
		return g
	}, [])
	useEffect(() => () => geometry.dispose(), [geometry])
	useFrame(() => {
		if (group.current) {
			group.current.position.y = stateRef.current.heave
			group.current.rotation.z = stateRef.current.pitch
		}
	})
	return (
		<group ref={group} name="suspension-body-outline">
			<lineSegments geometry={geometry}>
				<lineBasicMaterial color="#91a5b8" transparent opacity={G.outlineOpacity} depthWrite={false} />
			</lineSegments>
		</group>
	)
}

function MovingRoad({stateRef}: {stateRef: StateRef}) {
	const asphalt = useMemo(() => {
		const material = new T.MeshPhysicalMaterial({
			color: R.suspension.asphaltColor,
			specularIntensity: 0.04,
			envMapIntensity: 0.06,
			roughness: 1,
			metalness: 0,
		})
		material.onBeforeCompile = (shader) => {
			shader.vertexShader = 'varying vec3 vRoadPosition;\n' + shader.vertexShader
			shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvRoadPosition=position;')
			shader.fragmentShader = 'varying vec3 vRoadPosition;\n' + shader.fragmentShader
			shader.fragmentShader = shader.fragmentShader.replace(
				'#include <color_fragment>',
				`#include <color_fragment>
float aggregate=fract(sin(dot(floor(vRoadPosition.xz*${R.suspension.grainFrequency.toFixed(1)}),vec2(127.1,311.7)))*43758.5453);
diffuseColor.rgb*=1.0+(aggregate-.5)*${R.suspension.grainStrength.toFixed(2)};`,
			)
		}
		material.customProgramCacheKey = () => 'car-asphalt-grain-r4'
		return material
	}, [])
	useEffect(() => () => asphalt.dispose(), [asphalt])
	const bump = useRef<T.Mesh>(null),
		marks = useRef<T.Group>(null)
	const geometry = useMemo(() => {
		const positions: number[] = [],
			indices: number[] = [],
			segments = G.outlineSegments
		for (let i = 0; i <= segments; i++) {
			const t = i / segments
			for (const side of [-1, 1]) positions.push(t * G.bumpWidth, (1 - Math.cos(t * Math.PI * 2)) / 2, (side * G.roadWidth) / 2)
			if (i < segments) {
				const a = i * 2
				indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
			}
		}
		const g = new T.BufferGeometry()
		g.setAttribute('position', new T.Float32BufferAttribute(positions, 3))
		g.setIndex(indices)
		g.computeVertexNormals()
		return g
	}, [])
	useEffect(() => () => geometry.dispose(), [geometry])
	useFrame(() => {
		const state = stateRef.current
		if (bump.current) {
			bump.current.position.x = S.dimensions.frontAxleX + (G.firstContactTime * state.parameters.speedKmh) / 3.6 - state.distance
			bump.current.scale.y = state.parameters.bumpHeight
			bump.current.visible = Math.abs(bump.current.position.x) < G.roadLength / 2
		}
		if (marks.current)
			for (let i = 0; i < marks.current.children.length; i++)
				marks.current.children[i].position.x =
					T.MathUtils.euclideanModulo(Math.floor(i / 2) * G.roadMarkSpacing - state.distance, G.roadLength) - G.roadLength / 2
	})
	return (
		<group name="suspension-moving-road">
			<mesh position={[0, -G.roadThickness / 2, 0]} receiveShadow material={asphalt}>
				<boxGeometry args={[G.roadLength, G.roadThickness, G.roadWidth]} />
			</mesh>
			<mesh ref={bump} geometry={geometry} receiveShadow>
				<meshPhysicalMaterial
					specularIntensity={0.04}
					color={R.suspension.bumpColor}
					envMapIntensity={0.06}
					roughness={1}
					metalness={0}
					side={T.DoubleSide}
				/>
			</mesh>
			<group ref={marks}>
				{Array.from({length: Math.ceil(G.roadLength / G.roadMarkSpacing)}, (_, i) =>
					[-1, 1].map((side) => (
						<mesh key={`${i}-${side}`} position={[0, G.roadMarkY, side * G.roadEdgeZ]} rotation={[-Math.PI / 2, 0, 0]}>
							<planeGeometry args={[G.roadMarkLength, G.roadMarkWidth]} />
							<meshBasicMaterial color="#687680" transparent opacity={0.4} depthWrite={false} />
						</mesh>
					)),
				)}
			</group>
		</group>
	)
}

/** All motion comes from stateRef: no independent oscillator or animation clock. */
export function SuspensionMechanism({stateRef, assembly, corner = false}: {corner?: boolean; stateRef: StateRef; assembly?: string}) {
	const amount = useTeardownProgress()
	return (
		<group name="suspension-mechanism">
			{!assembly && !corner && <MovingRoad stateRef={stateRef} />}
			{false && amount < 0.01 && <BodyOutline stateRef={stateRef} />}
			{!assembly && !corner && <Subframes stateRef={stateRef} />}
			{(['front', 'rear'] as const).flatMap((axle, a) =>
				([-1, 1] as const).map((side, i) =>
					(corner || assembly) && (side < 0 || axle !== (corner || assembly === 'susp-front' ? 'front' : 'rear')) ? null : (
						<Corner key={`${axle}-${side}`} stateRef={stateRef} axle={axle} side={side} index={a * 2 + i + 1} hideWheel={corner} />
					),
				),
			)}
		</group>
	)
}

function MovingMount({stateRef, point}: {stateRef: StateRef; point: Point}) {
	const ref = useRef<T.Mesh>(null)
	useFrame(() => {
		if (ref.current) point(stateRef.current, ref.current.position)
	})
	return (
		<mesh ref={ref} userData={{partId: 'strut-top-mount'}}>
			<cylinderGeometry args={[G.springRadius * 1.35, G.springRadius * 1.35, G.springRadius * 0.35, 40]} />
			<meshStandardMaterial color="#414951" metalness={0.65} roughness={0.48} />
		</mesh>
	)
}
