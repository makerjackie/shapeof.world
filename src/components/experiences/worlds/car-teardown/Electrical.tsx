import { RigidBatch } from './RigidBatch'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame } from './animation'
import * as T from 'three'
import {
	AUXILIARY_TEARDOWN_GEOMETRY as A,
	CHASSIS_GEOMETRY as G,
	VEHICLE_SPEC as S,
} from './vehicle-spec'
import { TeardownPart, useTeardown } from './TeardownPart'
import { Box } from './Systems'
import type { Point3 } from './parts'
const E = A.electrical,
	M = S.engine.geometry
function Pipe({
	points,
	radius,
	color,
	id,
}: {
	points: Point3[]
	radius: number
	color: string
	id?: string
}) {
	const geometry = useMemo(
		() =>
			new T.TubeGeometry(
				new T.CatmullRomCurve3(
					points.map((p) => new T.Vector3(...p)),
					false,
					'catmullrom',
					0.25,
				),
				64,
				radius,
				8,
				false,
			),
		[JSON.stringify(points), radius],
	)
	useEffect(() => () => geometry.dispose(), [geometry])
	return (
		<mesh geometry={geometry} userData={{ partId: id }}>
			<meshStandardMaterial color={color} metalness={0.35} roughness={0.55} />
		</mesh>
	)
}
export function Electrical({
	angleRef,
	detailed = false,
}: {
	angleRef?: RefObject<number>
	detailed?: boolean
}) {
	const y = G.harnessY,
		z = G.harnessZ,
		f = G.harnessFrontX,
		r = G.harnessRearX
	return (
		<>
			<TeardownPart id="electrical-battery">
				<RigidBatch>
					<Box
						id="battery"
						position={S.electrical.batteryPosition}
						size={G.batterySize}
						material="plastic"
					/>
					{[-1, 1].map((side) => (
						<mesh
							key={side}
							position={[
								S.electrical.batteryPosition[0] + side * G.batterySize[0] * 0.3,
								S.electrical.batteryPosition[1] + G.batterySize[1] / 2,
								S.electrical.batteryPosition[2],
							]}
						>
							<cylinderGeometry
								args={[G.batteryTerminal, G.batteryTerminal, G.batteryTerminal, 12]}
							/>
							<meshStandardMaterial color={side > 0 ? '#874937' : '#767c82'} metalness={0.6} />
						</mesh>
					))}
				</RigidBatch>
			</TeardownPart>
			<TeardownPart id="electrical-ecu">
				<RigidBatch>
					<Box id="ecu" position={G.ecuPosition} size={G.ecuSize} />
					{Array.from({ length: E.ecuFinCount }, (_, i) => (
						<Box
							key={i}
							position={[
								G.ecuPosition[0] + (i / (E.ecuFinCount - 1) - 0.5) * G.ecuSize[0] * 0.85,
								G.ecuPosition[1] + G.ecuSize[1] * 0.65,
								G.ecuPosition[2],
							]}
							size={[G.ecuSize[0] / (E.ecuFinCount * 3), G.ecuSize[1] * 0.3, G.ecuSize[2] * 0.9]}
						/>
					))}
				</RigidBatch>
			</TeardownPart>
			<TeardownPart id="electrical-fuse">
				<RigidBatch>
					<Box id="fuse-box" position={G.fusePosition} size={G.fuseSize} material="plastic" />
					{[-1, 0, 1].map((row) => (
						<Box
							key={row}
							position={[
								G.fusePosition[0] + row * G.fuseSize[0] * 0.25,
								G.fusePosition[1] + G.fuseSize[1] * 0.54,
								G.fusePosition[2],
							]}
							size={[G.fuseSize[0] * 0.14, G.fuseSize[1] * 0.08, G.fuseSize[2] * 0.65]}
						/>
					))}
				</RigidBatch>
			</TeardownPart>
			<TeardownPart id="electrical-harness">
				<RigidBatch>
					<group userData={{ partId: 'wiring-harness' }}>
						{[-1, 1].map((side) => (
							<group key={side}>
								<Pipe
									points={[
										[f, y, side * z],
										[f * 0.6, y, side * z],
										[0, y * 0.8, side * z],
										[r * 0.65, y * 0.9, side * z],
										[r, y, side * z],
									]}
									radius={G.wireRadius}
									color="#32383c"
								/>
								{[-1, 0, 1].map((strand) => (
									<Pipe
										key={strand}
										points={[
											[f, y + strand * G.branchRadius, side * z + G.wireRadius],
											[f * 0.6, y + strand * G.branchRadius, side * z + G.wireRadius],
											[0, y * 0.8 + strand * G.branchRadius, side * z + G.wireRadius],
											[r * 0.65, y * 0.9 + strand * G.branchRadius, side * z + G.wireRadius],
											[r, y + strand * G.branchRadius, side * z + G.wireRadius],
										]}
										radius={G.branchRadius * 0.42}
										color={strand === 0 ? '#8a7452' : '#4b5964'}
									/>
								))}
								{[
									f,
									S.engine.cylinder1X,
									S.transmission.clutchX,
									0,
									S.engine.fuelTankPosition[0],
									r,
								].map((x, i) => (
									<group key={x}>
										<Pipe
											points={[
												[x, y * (0.8 + 0.2 * Math.abs(x / f)), side * z],
												[x - G.ecuSize[0], y * 0.88, side * z * 0.62],
												[x - G.ecuSize[0], y * 0.9, side * z * 0.3],
											]}
											radius={G.branchRadius * (i % 2 ? 1.3 : 1.9)}
											color="#41494f"
										/>
										<Box
											position={[x - G.ecuSize[0], y * 0.9, side * z * 0.3]}
											size={G.connectorSize}
											material="plastic"
										/>
										<mesh
											position={[x, y * (0.8 + 0.2 * Math.abs(x / f)), side * z]}
											rotation={[0, 0, Math.PI / 2]}
										>
											<cylinderGeometry
												args={[G.wireRadius * 1.2, G.wireRadius * 1.2, G.harnessClipWidth, 12]}
											/>
											<meshStandardMaterial color="#74716b" roughness={0.65} />
										</mesh>
									</group>
								))}
							</group>
						))}
						<Pipe
							points={[
								[f * 0.6, y, -z],
								[f * 0.58, y, 0.0],
								[f * 0.6, y, z],
							]}
							radius={G.wireRadius}
							color="#32383c"
						/>
					</group>
				</RigidBatch>
			</TeardownPart>
			{detailed && (
				<>
					<Accessories angleRef={angleRef} />
					<Coils />
					<Lamps />
				</>
			)}
		</>
	)
}

function Accessories({ angleRef }: { angleRef?: RefObject<number> }) {
	const pulley = useRef<T.Group>(null)
	useFrame(() => {
		if (pulley.current && angleRef)
			pulley.current.rotation.x =
				((angleRef.current * Math.PI) / 180) * S.electrical.alternatorPulleyRatio
	})
	const ax = M.accessoryDriveX - M.alternatorLength / 2 - M.timingThickness
	const sx =
		S.engine.cylinder1X -
		S.engine.cylinderSpacing * 1.5 -
		M.blockLength / 2 -
		M.shaftEnd / 2 -
		M.flywheelThickness / 2 -
		M.starterLength / 2
	return (
		<>
			<TeardownPart id="electrical-alternator">
				<group userData={{ partId: 'alternator' }}>
					<mesh position={[ax, M.alternatorY, M.alternatorZ]} rotation-z={-Math.PI / 2}>
						<cylinderGeometry
							args={[M.alternatorRadius, M.alternatorRadius, M.alternatorLength, 40]}
						/>
						<meshStandardMaterial {...S.materials.aluminum} />
					</mesh>
					{Array.from({ length: 12 }, (_, i) => {
						const a = (i * Math.PI) / 6
						return (
							<mesh
								key={i}
								position={[
									ax,
									M.alternatorY + Math.cos(a) * M.alternatorRadius,
									M.alternatorZ + Math.sin(a) * M.alternatorRadius,
								]}
								rotation-x={a}
							>
								<boxGeometry
									args={[M.alternatorLength * 0.7, M.ringTube * 3, M.alternatorRadius * 0.2]}
								/>
								<meshStandardMaterial color="#343b42" metalness={0.8} roughness={0.35} />
							</mesh>
						)
					})}
					{[-1, 1].map((side) => (
						<mesh
							key={side}
							position={[ax + side * M.alternatorLength * 0.42, M.alternatorY, M.alternatorZ]}
							rotation-y={Math.PI / 2}
						>
							<torusGeometry args={[M.alternatorRadius, M.ringTube * 1.4, 8, 40]} />
							<meshStandardMaterial {...S.materials.steel} />
						</mesh>
					))}
					<group
						ref={pulley}
						position={[M.accessoryDriveX, M.alternatorY, M.alternatorZ]}
						userData={{ partId: 'alternator-pulley' }}
					>
						<mesh rotation-z={-Math.PI / 2}>
							<cylinderGeometry
								args={[
									M.crankPulleyRadius / S.electrical.alternatorPulleyRatio,
									M.crankPulleyRadius / S.electrical.alternatorPulleyRatio,
									M.timingThickness,
									32,
								]}
							/>
							<meshStandardMaterial {...S.materials.steel} />
						</mesh>
						<mesh position-x={M.timingThickness * 0.55}>
							<boxGeometry args={[M.ringTube, M.alternatorRadius * 0.7, M.ringTube * 2]} />
							<meshStandardMaterial color="#cfaf73" metalness={0.8} roughness={0.3} />
						</mesh>
					</group>
				</group>
			</TeardownPart>
			<TeardownPart id="electrical-starter">
				<group position={[sx, M.starterY, M.starterZ]} userData={{ partId: 'starter' }}>
					<mesh rotation-z={-Math.PI / 2}>
						<cylinderGeometry args={[M.starterRadius, M.starterRadius, M.starterLength, 32]} />
						<meshStandardMaterial {...S.materials.steel} color="#6a727a" />
					</mesh>
					<mesh position={[0, M.starterRadius * 1.2, 0]} rotation-z={-Math.PI / 2}>
						<cylinderGeometry
							args={[M.starterRadius * 0.45, M.starterRadius * 0.45, M.starterLength * 0.55, 24]}
						/>
						<meshStandardMaterial {...S.materials.aluminum} />
					</mesh>
					<mesh
						position-x={M.starterLength / 2 + M.flywheelThickness / 2}
						rotation-z={-Math.PI / 2}
					>
						<cylinderGeometry
							args={[M.starterRadius * 0.3, M.starterRadius * 0.3, M.flywheelThickness, 20]}
						/>
						<meshStandardMaterial {...S.materials.steel} />
					</mesh>
				</group>
			</TeardownPart>
		</>
	)
}
function Coils() {
	return (
		<TeardownPart id="electrical-coils">
			{[1, 2, 3, 4].map((cylinder) => (
				<group
					key={cylinder}
					position={[S.engine.cylinder1X - (cylinder - 1) * S.engine.cylinderSpacing, M.camY, 0]}
					userData={{ partId: `ignition-coil-${cylinder}` }}
				>
					<mesh position-y={-M.coilHeight / 2}>
						<cylinderGeometry
							args={[M.coilRadius * 0.6, M.coilRadius * 0.6, M.coilHeight * 2, 20]}
						/>
						<meshStandardMaterial {...S.materials.plastic} />
					</mesh>
					<mesh position-y={M.coilHeight * 0.5}>
						<boxGeometry args={[M.coilRadius * 2.1, M.coilHeight, M.coilRadius * 2]} />
						<meshStandardMaterial color="#484d52" metalness={0.15} roughness={0.5} />
					</mesh>
					<Box
						position={[0, M.coilHeight * 0.5, M.coilRadius * 1.4]}
						size={[M.coilRadius, M.coilHeight * 0.45, M.coilRadius]}
						material="plastic"
					/>
				</group>
			))}
		</TeardownPart>
	)
}
function Lamps() {
	const flat = useTeardown().assembly?.id === 'knolling'
	return (
		<>
			{[true, false].map((front) =>
				[-1, 1].map((side, i) => (
					<TeardownPart
						key={`${front}-${side}`}
						id={front ? 'electrical-headlights' : 'electrical-taillights'}
						representative={side > 0}
						anchor={[front ? E.lampFrontX : E.lampRearX, E.lampY, side * E.lampZ]}
						offset={[
							front ? E.frontLights[0] : E.rearLights[0],
							front ? E.frontLights[1] : E.rearLights[1],
							side * (front ? E.frontLights[2] : E.rearLights[2]),
						]}
					>
						<group
							position={[front ? E.lampFrontX : E.lampRearX, E.lampY, side * E.lampZ]}
							rotation-y={flat && !front ? Math.PI : 0}
							userData={{ partId: `${front ? 'headlight' : 'taillight'}-${i + 1}` }}
						>
							<Box position={[0, 0, 0]} size={E.lampSize} material="plastic" />
							<mesh position-x={(front ? 1 : -1) * (E.lampSize[0] / 2 + E.lensDepth / 2)}>
								<boxGeometry args={[E.lensDepth, E.lampSize[1] * 0.8, E.lampSize[2] * 0.92]} />
								<meshStandardMaterial
									color={front ? '#c9dced' : '#9d2020'}
									emissive={front ? '#d9e8ff' : '#f2281c'}
									emissiveIntensity={front ? 2 : 1.6}
									roughness={0.2}
									metalness={0.2}
								/>
							</mesh>
							{[-1, 0, 1].map((led) => (
								<mesh
									key={led}
									position={[
										(front ? 1 : -1) * (E.lampSize[0] / 2 + E.lensDepth),
										0,
										led * E.lampSize[2] * 0.23,
									]}
									rotation-z={Math.PI / 2}
								>
									<cylinderGeometry
										args={[E.lampSize[1] * 0.26, E.lampSize[1] * 0.26, E.lensDepth * 0.4, 16]}
									/>
									<meshStandardMaterial color="#ccd5dc" metalness={0.8} roughness={0.17} />
								</mesh>
							))}
						</group>
					</TeardownPart>
				)),
			)}
		</>
	)
}
