import { useEffect, useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { BODY_GEOMETRY as B, VEHICLE_SPEC as V } from './vehicle-spec'
import { TeardownPart, useTeardown } from './TeardownPart'
import { BodyTeardown } from './BodyTeardown'
import {
	applyBodyClip,
	bodyDepthMaterial,
	bodyPoint,
	bodySection,
	bodySide,
	cabinPoint,
	createArchLiner,
	createArchBack,
	createRearPanel,
	createBodyCap,
	createBodyGeometry,
	createCabinGeometry,
	createIntakeSurface,
	fasciaX,
	curveTube,
} from './body-geometry'

const sample = (count: number, callback: (t: number) => THREE.Vector3) =>
	Array.from({ length: count + 1 }, (_, i) => callback(i / count))

function outsideEnd(y: number, z: number, front: boolean) {
	const rows = B.sections
	const extremity = front ? rows[rows.length - 1][0] : rows[0][0]
	const inward = front ? -1 : 1
	const contains = (x: number) => {
		const p = bodySection(x)
		return y < p.top && y > p.bottom && Math.abs(z) <= Math.abs(bodySide(x, y).z)
	}
	if (contains(extremity)) return fasciaX(y, z, front) - inward * B.seamRadius * 2
	let outside: number = extremity
	// Bracket, then bisect the true smooth loft: a stepped axial scan leaves
	// visible stair-steps in a bright light guide on the rounded bumper corner.
	for (let i = 1; i <= 80; i++) {
		let inside = extremity + ((inward * i) / 80) * V.dimensions.frontOverhang
		if (contains(inside)) {
			for (let j = 0; j < 24; j++) {
				const middle = (outside + inside) / 2
				if (contains(middle)) inside = middle
				else outside = middle
			}
			return inside - inward * B.seamRadius * 2
		}
		outside = inside
	}
	return extremity
}

function DetailLines() {
	const lines = useMemo(() => {
		const seams: THREE.BufferGeometry[] = []
		const trims: THREE.BufferGeometry[] = []
		const archLips: THREE.BufferGeometry[] = []
		for (const side of [-1, 1]) {
			for (const x of [B.doorFrontX, B.doorMiddleX, B.doorRearX]) {
				seams.push(
					curveTube(
						sample(36, (t) => {
							const y = THREE.MathUtils.lerp(
								B.rockerY,
								x === B.doorRearX
									? B.rearDoorSeam[B.rearDoorSeam.length - 1][0]
									: B.cabinOpening.minimumY + B.sillBevelHeight,
								t,
							)
							let seamX: number = x
							if (x === B.doorRearX) {
								const points = B.rearDoorSeam
								let segment = 0
								while (segment < points.length - 2 && points[segment + 1][0] < y) segment++
								const a = points[segment],
									b = points[segment + 1]
								seamX = THREE.MathUtils.lerp(
									a[1],
									b[1],
									THREE.MathUtils.clamp((y - a[0]) / (b[0] - a[0]), 0, 1),
								)
							}
							return bodySide(seamX, y, side, B.seamRadius)
						}),
						B.seamRadius,
					),
				)
			}
			seams.push(
				curveTube(
					sample(60, (t) =>
						bodySide(
							THREE.MathUtils.lerp(B.rearDoorSeam[0][1], B.doorFrontX, t),
							B.rockerY,
							side,
							B.seamRadius,
						),
					),
					B.seamRadius,
				),
			)
			seams.push(
				curveTube(
					sample(60, (t) =>
						bodyPoint(
							THREE.MathUtils.lerp(
								B.cabinSections[B.cabinSections.length - 1][0],
								B.sections[B.sections.length - 2][0],
								t,
							),
							(side * Math.PI) / 5,
							B.seamRadius,
						),
					),
					B.seamRadius,
				),
			)
			seams.push(
				curveTube(
					sample(48, (t) =>
						bodyPoint(
							THREE.MathUtils.lerp(B.sections[2][0], B.cabinSections[0][0], t),
							(side * Math.PI) / 5,
							B.seamRadius,
						),
					),
					B.seamRadius,
				),
			)
			for (const axle of [V.dimensions.frontAxleX, V.dimensions.rearAxleX]) {
				archLips.push(
					curveTube(
						sample(90, (t) => {
							const angle = THREE.MathUtils.lerp(
								-B.archLipAngleOverrun,
								Math.PI + B.archLipAngleOverrun,
								t,
							)
							return bodySide(
								axle + B.wheelArchRadius * Math.cos(angle),
								V.wheels.radius + B.wheelArchRadius * Math.sin(angle),
								side,
								B.archLipRadius / 2,
							)
						}),
						B.archLipRadius,
					),
				)
			}
			const G = B.glazing
			trims.push(
				curveTube(
					sample(80, (t) =>
						cabinPoint(
							THREE.MathUtils.lerp(G.sideRearBottom, G.sideFrontBottom, t),
							side * G.sideBottomAngle,
							B.seamRadius,
						),
					),
					B.windowTrimRadius,
				),
			)
			trims.push(
				curveTube(
					sample(80, (t) =>
						cabinPoint(
							THREE.MathUtils.lerp(G.sideRearTop, G.sideFrontTop, t),
							side * G.sideTopAngle,
							B.seamRadius,
						),
					),
					B.windowTrimRadius,
				),
			)
			for (const front of [true, false]) {
				trims.push(
					curveTube(
						sample(48, (t) =>
							cabinPoint(
								THREE.MathUtils.lerp(
									front ? G.sideFrontTop : G.sideRearTop,
									front ? G.sideFrontBottom : G.sideRearBottom,
									t,
								),
								side * THREE.MathUtils.lerp(G.sideTopAngle, G.sideBottomAngle, t),
								B.seamRadius,
							),
						),
						B.windowTrimRadius,
					),
				)
			}
		}
		const G = B.glazing
		const edgeX = (x: number, angle: number) => {
			const height = THREE.MathUtils.clamp(
				(Math.abs(angle) - G.sideTopAngle) / (G.sideBottomAngle - G.sideTopAngle),
				0,
				1,
			)
			if (x === G.frontStart)
				return Math.max(
					x,
					THREE.MathUtils.lerp(G.sideFrontTop, G.sideFrontBottom, height) + G.quarterPillarWidth,
				)
			if (x === G.rearEnd)
				return Math.min(
					x,
					THREE.MathUtils.lerp(G.sideRearTop, G.sideRearBottom, height) - G.quarterPillarWidth,
				)
			return x
		}
		for (const x of [G.frontStart, G.frontEnd, G.rearStart, G.rearEnd]) {
			trims.push(
				curveTube(
					sample(72, (t) => {
						const angle = (t * 2 - 1) * G.windscreenHalfAngle
						return cabinPoint(edgeX(x, angle), angle, B.seamRadius)
					}),
					B.windowTrimRadius,
				),
			)
		}
		for (const side of [-1, 1]) {
			for (const front of [true, false]) {
				const angle = side * G.windscreenHalfAngle
				trims.push(
					curveTube(
						sample(48, (t) =>
							cabinPoint(
								THREE.MathUtils.lerp(
									edgeX(front ? G.frontStart : G.rearStart, angle),
									edgeX(front ? G.frontEnd : G.rearEnd, angle),
									t,
								),
								angle,
								B.seamRadius,
							),
						),
						B.windowTrimRadius,
					),
				)
			}
		}
		seams.push(
			curveTube(
				sample(96, (t) => {
					const z = ((t * 2 - 1) * B.grille.width) / 2
					return new THREE.Vector3(
						fasciaX(B.fascia.bumperSeamY, z, true) + B.seamRadius,
						B.fascia.bumperSeamY,
						z,
					)
				}),
				B.seamRadius,
			),
		)
		seams.push(
			curveTube(
				sample(96, (t) => {
					const z = ((t * 2 - 1) * B.rearDetail.hatchWidth) / 2
					return new THREE.Vector3(
						fasciaX(B.rearDetail.seamY, z, false) - B.seamRadius,
						B.rearDetail.seamY,
						z,
					)
				}),
				B.seamRadius,
			),
		)
		return { seams, trims, archLips }
	}, [])
	useEffect(
		() => () => {
			for (const geometry of Object.values(lines).flat()) geometry.dispose()
		},
		[lines],
	)
	return (
		<group userData={{ partId: 'body-shell' }}>
			{lines.seams.map((geometry, i) => (
				<mesh key={`s${i}`} geometry={geometry}>
					<meshStandardMaterial color="#080b0e" roughness={0.55} />
				</mesh>
			))}
			{lines.trims.map((geometry, i) => (
				<mesh key={`t${i}`} geometry={geometry}>
					<meshStandardMaterial color="#20272e" metalness={0.35} roughness={0.42} />
				</mesh>
			))}
			{lines.archLips.map((geometry, i) => (
				<mesh key={`a${i}`} geometry={geometry}>
					<meshPhysicalMaterial {...V.materials.paint} roughness={0.29} />
				</mesh>
			))}
		</group>
	)
}

export function Lamps({ frontOnly }: { frontOnly?: boolean } = {}) {
	const lamps = useMemo(
		() =>
			[-1, 1].flatMap((side) =>
				[true, false].map((front) => {
					const spec = front ? B.headlight : B.taillight
					const points = sample(48, (t) => {
						const z =
							side * THREE.MathUtils.lerp(spec.z - spec.width / 2, spec.z + spec.width / 2, t)
						const y = spec.y + (Math.sin(t * Math.PI) * spec.height) / 6
						return new THREE.Vector3(outsideEnd(y, z, front), y, z)
					})
					return {
						front,
						side,
						housing: curveTube(points, spec.height / 2),
						lens: curveTube(
							points.map((p) =>
								p
									.clone()
									.add(
										new THREE.Vector3(
											(front ? 1 : -1) * (spec.height / 2 + spec.height / 24),
											0,
											0,
										),
									),
							),
							spec.height / 6,
						),
					}
				}),
			),
		[],
	)
	useEffect(
		() => () => {
			for (const lamp of lamps) {
				lamp.housing.dispose()
				lamp.lens.dispose()
			}
		},
		[lamps],
	)
	return (
		<group>
			{lamps
				.filter((lamp) => frontOnly === undefined || lamp.front === frontOnly)
				.map(({ front, side, housing, lens }) => (
					<group
						key={`${front}-${side}`}
						userData={{
							partId: `${front ? 'headlight' : 'taillight'}-${side < 0 ? 'left' : 'right'}`,
						}}
					>
						<mesh geometry={housing}>
							<meshPhysicalMaterial
								color={front ? '#151a1e' : V.materials.taillight}
								metalness={0.4}
								roughness={0.15}
								clearcoat={1}
							/>
						</mesh>
						<mesh geometry={lens}>
							<meshStandardMaterial
								color={front ? V.materials.headlight : V.materials.taillightLit}
								emissive={front ? V.materials.headlight : V.materials.taillightLit}
								emissiveIntensity={front ? 4 : 2.2}
								toneMapped={false}
							/>
						</mesh>
					</group>
				))}
		</group>
	)
}

export function Interior({ teardown = false }: { teardown?: boolean }) {
	const I = B.interior
	return (
		<group>
			{!teardown && (
				<mesh position={[I.floorX, I.floorY, 0]} userData={{ partId: 'body-floor' }}>
					<boxGeometry args={[...I.floorSize]} />
					<meshStandardMaterial color={I.carpetColor} roughness={1} />
				</mesh>
			)}
			{[-1, 1].map((side) => (
				<TeardownPart key={side} id="body-seats" representative={side < 0}>
					<group userData={{ partId: `seat-front-${side < 0 ? 'left' : 'right'}` }}>
						<RoundedBox
							position={[I.seatFrontX, I.seatBaseY, side * I.seatZ]}
							args={[...I.seatBaseSize]}
							radius={I.seatBaseSize[1] / 4}
							smoothness={4}
							castShadow
						>
							<meshStandardMaterial color={I.leatherColor} roughness={0.8} />
						</RoundedBox>
						<RoundedBox
							position={[I.seatBackX, I.seatBackY, side * I.seatZ]}
							rotation={[0, 0, -Math.PI / 15]}
							args={[...I.seatBackSize]}
							radius={I.seatBackSize[0] / 3}
							smoothness={4}
							castShadow
						>
							<meshStandardMaterial color={I.leatherColor} roughness={0.8} />
						</RoundedBox>
						<RoundedBox
							position={[I.seatBackX - I.seatBackSize[0] / 2, I.headrestY, side * I.seatZ]}
							args={[...I.headrestSize]}
							radius={I.headrestSize[0] / 4}
							smoothness={4}
						>
							<meshStandardMaterial color={I.leatherColor} roughness={0.8} />
						</RoundedBox>
					</group>
				</TeardownPart>
			))}
			<TeardownPart id="body-seats" representative={false}>
				<group userData={{ partId: 'seat-rear' }}>
					<RoundedBox
						position={[I.seatRearX, I.seatBaseY, 0]}
						args={[...I.benchSize]}
						radius={I.benchSize[1] / 4}
						smoothness={4}
					>
						<meshStandardMaterial color={I.leatherColor} roughness={0.85} />
					</RoundedBox>
					<RoundedBox
						position={[I.seatRearX - I.benchSize[0] / 2, I.seatBackY, 0]}
						rotation={[0, 0, -Math.PI / 18]}
						args={[...I.rearBackSize]}
						radius={I.rearBackSize[0] / 4}
						smoothness={4}
					>
						<meshStandardMaterial color={I.leatherColor} roughness={0.85} />
					</RoundedBox>
				</group>
			</TeardownPart>
			<TeardownPart id="body-dashboard">
				<group userData={{ partId: 'dashboard' }}>
					<RoundedBox
						position={[I.dashboardX, I.dashboardY, 0]}
						args={[...I.dashboardSize]}
						radius={I.dashboardSize[1] / 3}
						smoothness={4}
					>
						<meshStandardMaterial color={I.carpetColor} roughness={0.75} />
					</RoundedBox>
					<RoundedBox
						position={[I.consoleX, I.consoleY, 0]}
						args={[...I.consoleSize]}
						radius={I.consoleSize[2] / 10}
						smoothness={4}
					>
						<meshStandardMaterial color={I.leatherColor} roughness={0.7} />
					</RoundedBox>
					<mesh position={[I.displayX, I.displayY, 0]}>
						<boxGeometry args={[...I.displaySize]} />
						<meshStandardMaterial
							color="#111a20"
							emissive="#58717e"
							emissiveIntensity={0.25}
							roughness={0.2}
							metalness={0.2}
						/>
					</mesh>
				</group>
			</TeardownPart>
		</group>
	)
}

/** Thin floor stampings, a transmission tunnel and short crumple rails belong
 * to the monocoque body. The suspension has only its separate subframes. */
function Unibody() {
	const U = B.unibody
	const geometry = useMemo(() => {
		const channel = new THREE.Shape()
		const wall = U.sheetThickness / 2
		channel.moveTo(-U.railWidth / 2, U.railHeight)
		channel.lineTo(-U.railWidth / 2, 0)
		channel.lineTo(U.railWidth / 2, 0)
		channel.lineTo(U.railWidth / 2, U.railHeight)
		channel.lineTo(U.railWidth / 2 - wall, U.railHeight)
		channel.lineTo(U.railWidth / 2 - wall, wall)
		channel.lineTo(-U.railWidth / 2 + wall, wall)
		channel.lineTo(-U.railWidth / 2 + wall, U.railHeight)
		channel.closePath()
		const rails = [-1, 1].flatMap((side) =>
			[true, false].map((front) => {
				const innerX = U.floorX + ((front ? 1 : -1) * U.floorLength) / 2
				const outerX = front ? U.railFrontX : U.railRearX
				const path = new THREE.CatmullRomCurve3([
					new THREE.Vector3(innerX, U.floorY, side * U.railZ),
					new THREE.Vector3((innerX + outerX) / 2, U.floorY + U.railHeight, side * U.railZ),
					new THREE.Vector3(outerX, U.floorY + U.railHeight * 1.4, side * U.railZ),
				])
				return new THREE.ExtrudeGeometry(channel, {
					steps: 24,
					bevelEnabled: false,
					extrudePath: path,
				})
			}),
		)
		const tunnel = new THREE.CylinderGeometry(
			U.tunnelWidth / 2,
			U.tunnelWidth / 2,
			U.floorLength,
			48,
			1,
			true,
			0,
			Math.PI,
		)
		tunnel.rotateZ(Math.PI / 2)
		tunnel.scale(1, U.tunnelHeight / (U.tunnelWidth / 2), 1)
		const beads = Array.from({ length: Math.floor(U.floorLength / U.beadSpacing) - 1 }, (_, i) =>
			[-1, 1].map((side) =>
				curveTube(
					[
						new THREE.Vector3(
							U.floorX - U.floorLength / 2 + (i + 1) * U.beadSpacing,
							U.floorY + U.sheetThickness,
							side * (U.tunnelWidth / 2 + U.beadRadius),
						),
						new THREE.Vector3(
							U.floorX - U.floorLength / 2 + (i + 1) * U.beadSpacing,
							U.floorY + U.sheetThickness,
							side * (U.floorWidth / 2 - U.sillWidth),
						),
					],
					U.beadRadius,
					8,
				),
			),
		).flat()
		return { rails, tunnel, beads }
	}, [])
	useEffect(
		() => () => {
			for (const resource of [...geometry.rails, geometry.tunnel, ...geometry.beads])
				resource.dispose()
		},
		[geometry],
	)
	const plateWidth = (U.floorWidth - U.tunnelWidth) / 2
	return (
		<group userData={{ partId: 'body-floor' }}>
			{[-1, 1].map((side) => (
				<group key={side}>
					<mesh
						position={[U.floorX, U.floorY, side * (U.tunnelWidth / 2 + plateWidth / 2)]}
						castShadow
						receiveShadow
					>
						<boxGeometry args={[U.floorLength, U.sheetThickness, plateWidth]} />
						<meshStandardMaterial color="#303b46" metalness={0.65} roughness={0.5} />
					</mesh>
					<RoundedBox
						position={[U.floorX, U.floorY + U.sillHeight / 2, side * U.sillZ]}
						args={[U.floorLength, U.sillHeight, U.sillWidth]}
						radius={U.sheetThickness}
						smoothness={3}
						castShadow
					>
						<meshStandardMaterial color="#303b46" metalness={0.65} roughness={0.5} />
					</RoundedBox>
				</group>
			))}
			<mesh geometry={geometry.tunnel} position={[U.floorX, U.floorY, 0]} castShadow>
				<meshStandardMaterial
					color="#303b46"
					metalness={0.65}
					roughness={0.5}
					side={THREE.DoubleSide}
				/>
			</mesh>
			{[...geometry.rails, ...geometry.beads].map((g, i) => (
				<mesh key={i} geometry={g} castShadow>
					<meshStandardMaterial color="#303b46" metalness={0.65} roughness={0.5} />
				</mesh>
			))}
		</group>
	)
}

export function IntakeMesh() {
	const geometry = useMemo(() => {
		const positions: number[] = []
		const intake = B.lowerIntake
		const ymin = intake.y - intake.height / 2 + B.intakeGridPitch / 3
		const ymax = intake.y + intake.height / 2 - B.intakeGridPitch / 3
		const halfWidth = intake.width / 2 - intake.height / 3
		const point = (y: number, z: number) => [fasciaX(y, z, true) + B.seamRadius * 2, y, z]
		for (let z = -halfWidth; z <= halfWidth; z += B.intakeGridPitch)
			positions.push(...point(ymin, z), ...point(ymax, z))
		for (let y = ymin; y <= ymax; y += B.intakeGridPitch) {
			for (let z = -halfWidth; z < halfWidth; z += B.intakeGridPitch)
				positions.push(...point(y, z), ...point(y, Math.min(halfWidth, z + B.intakeGridPitch)))
		}
		const mesh = new THREE.BufferGeometry()
		mesh.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
		return mesh
	}, [])
	useEffect(() => () => geometry.dispose(), [geometry])
	return (
		<lineSegments geometry={geometry} userData={{ partId: 'bumper-front' }}>
			<lineBasicMaterial color="#273039" transparent opacity={0.65} />
		</lineSegments>
	)
}

function AssembledBody() {
	const objects = useMemo(
		() => ({
			intakes: [B.grille, B.lowerIntake].map(createIntakeSurface),
			rearPanels: [createRearPanel(false), createRearPanel(true)],
			archBacks: [V.dimensions.frontAxleX, V.dimensions.rearAxleX].flatMap((x) =>
				[-1, 1].map((side) => createArchBack(x, side)),
			),
			ducktail: curveTube(
				sample(100, (t) =>
					bodyPoint(
						B.sections[0][0],
						(t * 2 - 1) * Math.PI * B.shoulderParameter * 0.72,
						B.ducktailRadius / 2,
					),
				),
				B.ducktailRadius,
			),
			frontLip: curveTube(
				sample(96, (t) => {
					const halfWidth = Math.min(
						B.grille.width / 2,
						Math.abs(bodySide(B.sections[B.sections.length - 1][0], B.fascia.lipY).z) * 0.95,
					)
					const z = (t * 2 - 1) * halfWidth
					return new THREE.Vector3(fasciaX(B.fascia.lipY, z, true) + B.seamRadius, B.fascia.lipY, z)
				}),
				B.fascia.lipRadius,
			),
			shell: createBodyGeometry(),
			cabin: createCabinGeometry(),
			front: createBodyCap(true),
			rear: createBodyCap(false),
			shellMaterial: applyBodyClip(
				new THREE.MeshPhysicalMaterial({ ...V.materials.paint, side: THREE.DoubleSide }),
				'shell',
			),
			roofMaterial: applyBodyClip(
				new THREE.MeshPhysicalMaterial({ ...V.materials.paint, side: THREE.DoubleSide }),
				'cabin',
			),
			glassMaterial: applyBodyClip(
				new THREE.MeshPhysicalMaterial({
					...V.materials.glass,
					transparent: true,
					depthWrite: false,
					side: THREE.DoubleSide,
					clearcoat: 0,
					specularIntensity: 0.65,
				}),
				'glass',
			),
			shellDepth: bodyDepthMaterial('shell'),
			cabinDepth: bodyDepthMaterial('cabin'),
			mirrorStems: [-1, 1].map((side) =>
				curveTube(
					[
						cabinPoint(B.mirrorX, side * B.glazing.sideBottomAngle),
						new THREE.Vector3(
							B.mirrorX,
							B.mirrorY - B.mirrorSize[1] / 4,
							side * (B.mirrorZ - B.mirrorSize[2] / 2),
						),
					],
					B.mirrorSize[1] / 7,
					12,
				),
			),
			liners: [V.dimensions.frontAxleX, V.dimensions.rearAxleX].flatMap((x) =>
				[-1, 1].map((side) => createArchLiner(x, side)),
			),
		}),
		[],
	)
	// Resources supplied as mesh props are owned here, unlike declarative JSX
	// geometries/materials whose disposal is managed by the R3F reconciler.
	useEffect(
		() => () => {
			for (const value of Object.values(objects)) {
				if (Array.isArray(value)) value.forEach((resource) => resource.dispose())
				else value.dispose()
			}
		},
		[objects],
	)
	return (
		<group name="Car body">
			<mesh
				geometry={objects.shell}
				material={objects.shellMaterial}
				customDepthMaterial={objects.shellDepth}
				castShadow
				receiveShadow
				userData={{ partId: 'body-shell' }}
			/>
			<mesh
				geometry={objects.cabin}
				material={objects.roofMaterial}
				customDepthMaterial={objects.cabinDepth}
				castShadow
				receiveShadow
				userData={{ partId: 'roof' }}
			/>
			<mesh
				geometry={objects.cabin}
				material={objects.glassMaterial}
				userData={{ partId: 'cabin-glazing' }}
				renderOrder={2}
			/>
			{[objects.front, objects.rear].map((geometry, i) => (
				<mesh
					key={i}
					geometry={geometry}
					castShadow
					receiveShadow
					userData={{ partId: i ? 'bumper-rear' : 'bumper-front' }}
				>
					<meshPhysicalMaterial {...V.materials.paint} />
				</mesh>
			))}
			{objects.liners.map((geometry, i) => (
				<mesh key={i} geometry={geometry} userData={{ partId: 'body-shell' }}>
					<meshStandardMaterial {...V.materials.rubber} side={THREE.DoubleSide} />
				</mesh>
			))}
			{objects.archBacks.map((geometry, i) => (
				<mesh key={`well-${i}`} geometry={geometry} userData={{ partId: 'body-shell' }}>
					<meshStandardMaterial color="#090b0e" roughness={0.94} side={THREE.DoubleSide} />
				</mesh>
			))}
			{objects.rearPanels.map((geometry, i) => (
				<mesh key={`rear-${i}`} geometry={geometry} userData={{ partId: 'bumper-rear' }}>
					<meshStandardMaterial color={i ? '#141b22' : '#11161a'} roughness={0.7} metalness={0.1} />
				</mesh>
			))}
			<DetailLines />
			<Lamps />
			<Interior />
			<Unibody />
			<IntakeMesh />
			{objects.intakes.map((geometry, i) => (
				<mesh key={i} geometry={geometry} userData={{ partId: 'bumper-front' }}>
					<meshStandardMaterial color="#090c10" roughness={0.9} metalness={0.05} />
				</mesh>
			))}
			<mesh geometry={objects.ducktail} userData={{ partId: 'bumper-rear' }}>
				<meshPhysicalMaterial {...V.materials.paint} />
			</mesh>
			<mesh geometry={objects.frontLip} userData={{ partId: 'bumper-front' }}>
				<meshPhysicalMaterial {...V.materials.paint} />
			</mesh>
			{[-1, 1].map((side, index) => (
				<group key={side}>
					<mesh
						geometry={objects.mirrorStems[index]}
						userData={{ partId: `mirror-${side < 0 ? 'left' : 'right'}` }}
					>
						<meshStandardMaterial {...V.materials.plastic} />
					</mesh>
					<RoundedBox
						position={[B.mirrorX, B.mirrorY, side * B.mirrorZ]}
						args={[...B.mirrorSize]}
						radius={B.mirrorSize[1] / 2.2}
						smoothness={5}
						rotation={[0, (side * Math.PI) / 15, 0]}
						userData={{ partId: `mirror-${side < 0 ? 'left' : 'right'}` }}
						castShadow
					>
						<meshPhysicalMaterial {...V.materials.paint} />
					</RoundedBox>
					<mesh
						position={[B.mirrorX - B.mirrorSize[0] / 2, B.mirrorY, side * B.mirrorZ]}
						rotation={[0, Math.PI / 2, 0]}
						userData={{ partId: `mirror-${side < 0 ? 'left' : 'right'}` }}
					>
						<planeGeometry args={[B.mirrorSize[2] * 0.78, B.mirrorSize[1] * 0.7]} />
						<meshStandardMaterial color="#9ca8af" metalness={1} roughness={0.08} />
					</mesh>
					{B.handleXs.map((x, i) => (
						<RoundedBox
							key={i}
							position={bodySide(x, B.handleY, side, B.seamRadius).toArray()}
							args={[B.handleLength, B.seamRadius * 6, B.seamRadius * 4]}
							radius={B.seamRadius * 2}
							smoothness={3}
							userData={{ partId: `door-${i ? 'rear' : 'front'}-${side < 0 ? 'left' : 'right'}` }}
						>
							<meshStandardMaterial color="#56616b" metalness={0.8} roughness={0.26} />
						</RoundedBox>
					))}
				</group>
			))}
		</group>
	)
}

export function Body() {
	const { system } = useTeardown()
	return system === 'body' ? <BodyTeardown /> : <AssembledBody />
}
