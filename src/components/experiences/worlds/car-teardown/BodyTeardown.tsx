import { useEffect, useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { BODY_GEOMETRY as B, BODY_TEARDOWN_SPEC as S, VEHICLE_SPEC as V } from './vehicle-spec'
import {
	applyBodyClip,
	bodyDepthMaterial,
	bodySide,
	cabinPoint,
	createBodyCap,
	createIntakeSurface,
	createRearPanel,
	curveTube,
} from './body-geometry'
import { createBodyPanelGeometry, type BodyPanelId } from './body-teardown-geometry'
import { BodyStructure } from './BodyStructure'
import { TeardownPart } from './TeardownPart'
import { Interior, Lamps, IntakeMesh } from './Body'

export function BodyTeardown() {
	const panels = useMemo(createBodyPanelGeometry, [])
	const resources = useMemo(
		() => ({
			paint: applyBodyClip(
				new THREE.MeshPhysicalMaterial({ ...V.materials.paint, side: THREE.DoubleSide }),
				'shell',
			),
			inner: applyBodyClip(
				new THREE.MeshStandardMaterial({
					color: S.steel.mild.color,
					metalness: 0.67,
					roughness: 0.46,
					side: THREE.BackSide,
				}),
				'shell',
			),
			roof: applyBodyClip(
				new THREE.MeshPhysicalMaterial({ ...V.materials.paint, side: THREE.DoubleSide }),
				'cabin',
			),
			glass: applyBodyClip(
				new THREE.MeshPhysicalMaterial({
					...V.materials.glass,
					transparent: true,
					opacity: 0.62,
					depthWrite: false,
					side: THREE.DoubleSide,
					clearcoat: 0,
					specularIntensity: 0.25,
				}),
				'glass',
			),
			depth: bodyDepthMaterial('shell'),
			roofDepth: bodyDepthMaterial('cabin'),
			front: createBodyCap(true),
			rear: createBodyCap(false),
			intakes: [B.grille, B.lowerIntake].map(createIntakeSurface),
			rearPanels: [createRearPanel(false), createRearPanel(true)],
		}),
		[],
	)
	useEffect(
		() => () => {
			panels.forEach((g) => g.dispose())
			Object.values(resources).forEach((v) =>
				Array.isArray(v) ? v.forEach((r) => r.dispose()) : v.dispose(),
			)
		},
		[panels, resources],
	)
	const skin = (id: BodyPanelId, material: THREE.Material = resources.paint) => (
		<mesh
			name={id}
			geometry={panels.get(id)}
			material={material}
			customDepthMaterial={material === resources.roof ? resources.roofDepth : resources.depth}
			castShadow
			receiveShadow
		/>
	)
	const glass = (id: BodyPanelId) => (
		<mesh name={id} geometry={panels.get(id)} material={resources.glass} renderOrder={2} />
	)
	return (
		<group name="Body panel teardown">
			<BodyStructure />
			<TeardownPart
				id="body-hood"
				pivot={[B.doorFrontX, bodySide(B.doorFrontX, B.cabinOpening.minimumY).y, 0]}
				rotation={[0, 0, S.panel.hoodTilt]}
			>
				{skin('hood')}
				<PanelReinforcement kind="hood" />
			</TeardownPart>
			<TeardownPart
				id="body-trunk"
				pivot={[S.cuts.deckFrontX, S.panel.trunkHingeY, 0]}
				rotation={[0, 0, S.panel.trunkTilt]}
			>
				{skin('trunk')}
				<PanelReinforcement kind="trunk" />
			</TeardownPart>
			<TeardownPart id="body-roof">{skin('roof', resources.roof)}</TeardownPart>
			{[-1, 1].map((side) => {
				const end = side < 0 ? 'left' : 'right'
				return (
					<group key={side}>
						{(['front', 'rear'] as const).map((row, i) => {
							const hingeX = row === 'front' ? B.doorFrontX : B.doorMiddleX
							return (
								<TeardownPart
									key={row}
									id="body-doors"
									representative={side < 0 && row === 'front'}
									pivot={[hingeX, B.rockerY, side * S.door.hingeZ]}
									rotation={[0, side * S.door.angle, 0]}
									offset={[
										row === 'front' ? S.door.frontX : S.door.rearX,
										0,
										side * (row === 'front' ? S.door.frontOutward : S.door.rearOutward),
									]}
								>
									{skin(`door-${row}-${end}`)}
									<DoorInner side={side} front={row === 'front'} />
									<DoorFrame side={side} front={row === 'front'} />
									<RoundedBox
										position={bodySide(B.handleXs[i], B.handleY, side, B.seamRadius).toArray()}
										args={[B.handleLength, B.seamRadius * 6, B.seamRadius * 4]}
										radius={B.seamRadius * 2}
										smoothness={3}
									>
										<meshStandardMaterial color="#56616b" metalness={0.8} roughness={0.26} />
									</RoundedBox>
									{row === 'front' && <Mirror side={side} />}
								</TeardownPart>
							)
						})}
						<TeardownPart
							id="body-fenders"
							representative={side < 0}
							offset={[S.offsets.fender[0], S.offsets.fender[1], side * S.offsets.fender[2]]}
						>
							{skin(`fender-${end}`)}
						</TeardownPart>
						<TeardownPart
							id="body-quarters"
							representative={side < 0}
							offset={[S.offsets.quarter[0], S.offsets.quarter[1], side * S.offsets.quarter[2]]}
						>
							{skin(`quarter-${end}`)}
						</TeardownPart>
						{(['front', 'rear', 'quarter'] as const).map((row, i) => (
							<TeardownPart
								key={row}
								id="body-side-glass"
								representative={side < 0 && row === 'rear'}
								offset={[
									row === 'front'
										? S.panel.sideGlassFrontX
										: row === 'quarter'
											? S.panel.sideGlassRearX
											: 0,
									S.offsets.sideGlass[1],
									side * (S.offsets.sideGlass[2] + i * S.panel.sideGlassStagger),
								]}
							>
								{glass(`glass-${row}-${end}`)}
							</TeardownPart>
						))}
					</group>
				)
			})}
			<TeardownPart id="body-bumper-front">
				{skin('bumper-front')}
				<mesh geometry={resources.front} castShadow>
					<meshPhysicalMaterial {...V.materials.paint} />
				</mesh>
				{resources.intakes.map((g, i) => (
					<mesh key={i} geometry={g}>
						<meshStandardMaterial color="#090c10" roughness={0.9} />
					</mesh>
				))}
				<IntakeMesh />
				<Lamps frontOnly />
			</TeardownPart>
			<TeardownPart id="body-bumper-rear">
				{skin('bumper-rear')}
				<mesh geometry={resources.rear} castShadow>
					<meshPhysicalMaterial {...V.materials.paint} />
				</mesh>
				{resources.rearPanels.map((g, i) => (
					<mesh key={i} geometry={g}>
						<meshStandardMaterial color={i ? '#141b22' : '#11161a'} roughness={0.7} />
					</mesh>
				))}
				<Lamps frontOnly={false} />
			</TeardownPart>
			<TeardownPart id="body-windscreen">{glass('windscreen')}</TeardownPart>
			<TeardownPart id="body-backlight">{glass('backlight')}</TeardownPart>
			<Interior teardown />
		</group>
	)
}
function DoorInner({ side, front }: { side: number; front: boolean }) {
	const start = front ? B.doorMiddleX : B.doorRearX,
		end = front ? B.doorFrontX : B.doorMiddleX,
		x = (start + end) / 2
	return (
		<group>
			<RoundedBox
				position={[x, S.door.innerY, side * S.door.innerZ]}
				args={[(end - start) * S.door.innerLengthRatio, S.door.innerHeight, S.door.innerThickness]}
				radius={S.door.innerRadius}
				smoothness={3}
			>
				<meshStandardMaterial color={S.steel.mild.color} roughness={0.5} metalness={0.65} />
			</RoundedBox>
			<RoundedBox
				position={[x, S.door.beamY, side * S.door.beamZ]}
				args={[(end - start) * S.door.beamLengthRatio, S.door.beamHeight, S.door.beamDepth]}
				radius={S.door.beamRadius}
				smoothness={3}
			>
				<meshStandardMaterial color={S.steel.high.color} roughness={0.4} metalness={0.7} />
			</RoundedBox>
			<mesh position={[x, S.door.accessY, side * S.door.beamZ]}>
				<boxGeometry
					args={[(end - start) * S.door.accessLengthRatio, S.door.accessHeight, S.door.accessDepth]}
				/>
				<meshStandardMaterial color="#232b31" roughness={0.65} />
			</mesh>
		</group>
	)
}
function Mirror({ side }: { side: number }) {
	const stem = useMemo(
		() =>
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
		[side],
	)
	useEffect(() => () => stem.dispose(), [stem])
	return (
		<group>
			<mesh geometry={stem}>
				<meshStandardMaterial {...V.materials.plastic} />
			</mesh>
			<RoundedBox
				position={[B.mirrorX, B.mirrorY, side * B.mirrorZ]}
				args={[...B.mirrorSize]}
				radius={B.mirrorSize[1] / 2.2}
				smoothness={5}
			>
				<meshPhysicalMaterial {...V.materials.paint} />
			</RoundedBox>
		</group>
	)
}
function PanelReinforcement({ kind }: { kind: 'hood' | 'trunk' }) {
	const R = kind === 'hood' ? S.panel.hoodReinforcement : S.panel.trunkReinforcement,
		{ x, y, length } = R
	return (
		<group>
			{[-1, 1].map((side) => (
				<RoundedBox
					key={side}
					position={[x, y - S.panel.ribDrop, side * S.panel.ribZ]}
					args={[length, S.panel.ribHeight, S.panel.ribWidth]}
					radius={S.panel.ribRadius}
					smoothness={3}
					rotation={[0, 0, R.tilt]}
				>
					<meshStandardMaterial color={S.steel.mild.color} metalness={0.67} roughness={0.46} />
				</RoundedBox>
			))}
			<RoundedBox
				position={[x, y - S.panel.ribDrop, 0]}
				args={[S.panel.ribWidth, S.panel.ribHeight, S.panel.crossRibWidth]}
				radius={S.panel.ribRadius}
				smoothness={3}
			>
				<meshStandardMaterial color={S.steel.mild.color} metalness={0.67} roughness={0.46} />
			</RoundedBox>
		</group>
	)
}

function DoorFrame({ side, front }: { side: number; front: boolean }) {
	const lines = useMemo(() => {
		const G = B.glazing,
			x0 = front ? G.pillarEnd : G.quarterPillarX,
			x1 = front ? G.sideFrontTop : G.pillarStart
		const bottomX1 = front ? G.sideFrontBottom : G.pillarStart
		const samples = (fn: (t: number) => THREE.Vector3) =>
			Array.from({ length: 41 }, (_, i) => fn(i / 40))
		return [
			samples((t) => cabinPoint(THREE.MathUtils.lerp(x0, x1, t), side * G.sideTopAngle)),
			samples((t) => cabinPoint(THREE.MathUtils.lerp(x0, bottomX1, t), side * G.sideBottomAngle)),
			samples((t) =>
				cabinPoint(x0, side * THREE.MathUtils.lerp(G.sideTopAngle, G.sideBottomAngle, t)),
			),
			samples((t) =>
				cabinPoint(
					THREE.MathUtils.lerp(x1, bottomX1, t),
					side * THREE.MathUtils.lerp(G.sideTopAngle, G.sideBottomAngle, t),
				),
			),
		].map((points) => curveTube(points, B.windowTrimRadius * S.door.frameRadiusRatio, 40))
	}, [side, front])
	useEffect(() => () => lines.forEach((g) => g.dispose()), [lines])
	return (
		<group>
			{lines.map((g, i) => (
				<mesh key={i} geometry={g}>
					<meshStandardMaterial color="#20272e" metalness={0.3} roughness={0.55} />
				</mesh>
			))}
		</group>
	)
}
