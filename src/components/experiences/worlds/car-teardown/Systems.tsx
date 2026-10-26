import {MountingFrames} from './AssemblyHardware'
import {BrakeCorner} from './BrakeMechanism'
import {createBrakeState} from './brake-model'
import {mergeOwned} from './repeated-geometry'
import {useEffect, useMemo, useRef} from 'react'
import * as T from 'three'
import {CHASSIS_GEOMETRY as G, VEHICLE_SPEC as S} from './vehicle-spec'
import type {Point3} from './parts'

type Metal = 'steel' | 'aluminum' | 'rubber' | 'plastic' | 'caliper' | 'disc'
export function Bar({
	from,
	to,
	radius = G.armRadius,
	material = 'steel',
	id,
}: {
	from: Point3
	to: Point3
	radius?: number
	material?: Metal
	id?: string
}) {
	const {length, midpoint, quaternion} = useMemo(() => {
		const a = new T.Vector3(...from),
			b = new T.Vector3(...to),
			delta = b.clone().sub(a)
		return {
			length: delta.length(),
			midpoint: a.add(b).multiplyScalar(0.5),
			quaternion: new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize()),
		}
	}, [from.join(','), to.join(',')])
	return (
		<mesh position={midpoint} quaternion={quaternion} castShadow userData={{partId: id}}>
			<cylinderGeometry args={[radius, radius, length, 16]} />
			<meshStandardMaterial {...S.materials[material]} />
		</mesh>
	)
}
export function Box({
	position,
	size,
	material = 'aluminum',
	id,
}: {
	position: Point3 | readonly [number, number, number]
	size: readonly [number, number, number]
	material?: Metal
	id?: string
}) {
	return (
		<mesh position={[...position]} castShadow receiveShadow userData={{partId: id}}>
			<boxGeometry args={[...size]} />
			<meshStandardMaterial {...S.materials[material]} />
		</mesh>
	)
}
function Pipe({points, radius, color, id}: {points: Point3[]; radius: number; color: string; id?: string}) {
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
	return (
		<mesh geometry={geometry} userData={{partId: id}}>
			<meshStandardMaterial color={color} metalness={0.35} roughness={0.55} />
		</mesh>
	)
}
function Spring({from, to, id}: {from: Point3; to: Point3; id: string}) {
	const points = useMemo(
		() =>
			Array.from({length: 121}, (_, i) => {
				const t = i / 120,
					angle = t * Math.PI * 2 * G.springTurns
				return [
					from[0] + Math.sin(angle) * G.springRadius,
					from[1] + (to[1] - from[1]) * t,
					from[2] + (to[2] - from[2]) * t + Math.cos(angle) * G.springRadius,
				] as Point3
			}),
		[from.join(','), to.join(',')],
	)
	return <Pipe points={points} radius={G.springWire} color="#72777f" id={id} />
}
export const wheelLocations = [
	{x: S.dimensions.frontAxleX, z: -S.wheels.frontTrack / 2, front: true},
	{x: S.dimensions.frontAxleX, z: S.wheels.frontTrack / 2, front: true},
	{x: S.dimensions.rearAxleX, z: -S.wheels.rearTrack / 2, front: false},
	{x: S.dimensions.rearAxleX, z: S.wheels.rearTrack / 2, front: false},
]
export function Chassis() {
	const d = S.dimensions,
		y = S.wheels.radius
	return (
		<>
			<MountingFrames />
			{[d.frontAxleX, d.rearAxleX].map((x, i) => (
				<Pipe
					key={x}
					id={`antiroll-${i + 1}`}
					radius={G.subframe.antirollRadius}
					color="#7a818b"
					points={[
						[x - G.subframe.stabilizerOffset, y, -G.rail.z * 1.45],
						[x, y * 0.65, -G.rail.z],
						[x, y * 0.65, G.rail.z],
						[x - G.subframe.stabilizerOffset, y, G.rail.z * 1.45],
					]}
				/>
			))}
			{wheelLocations.map(({x, z, front}, i) => {
				const side = Math.sign(z),
					top = front ? G.frontTop : G.rearTop
				return (
					<group key={i}>
						<Bar from={[x, y, z * 0.9]} to={[x, top.y, side * top.z]} radius={G.damperRadius} id={`damper-${i + 1}`} />
						<Spring from={[x, y + (top.y - y) * 0.3, z * 0.9]} to={[x, top.y - G.damperRadius, side * top.z]} id={`spring-${i + 1}`} />
						<Bar from={[x, y, z - side * G.hubWidth]} to={[x, y, z]} radius={G.hubRadius} id={`hub-${i + 1}`} />
						{front ? (
							<group userData={{partId: `control-arm-${i + 1}`}}>
								<Bar from={[x - G.crossmember.length, G.crossmember.y, side * G.rail.z]} to={[x, y * 0.75, z * 0.92]} />
								<Bar from={[x + G.crossmember.length, G.crossmember.y, side * G.rail.z]} to={[x, y * 0.75, z * 0.92]} />
							</group>
						) : (
							Array.from({length: 5}, (_, j) => (
								<Bar
									key={j}
									from={[x + (j - 2) * G.crossmember.length * 0.6, G.crossmember.y + (j % 2) * G.crossmember.height, side * G.rail.z * 0.7]}
									to={[x + (j - 2) * G.crossmember.length * 0.35, y + (j % 2) * G.crossmember.height, z * 0.92]}
									radius={G.armRadius * 0.72}
									id={`rear-link-${(i - 2) * 5 + j + 1}`}
								/>
							))
						)}
					</group>
				)
			})}
		</>
	)
}
export function Brakes({explode}: {explode: number}) {
	const brakeRef = useRef(createBrakeState(0))
	return (
		<>
			{wheelLocations.map(({x, z, front}, i) => {
				const side = Math.sign(z)
				const dz = z - side * G.brakeInset + side * S.explosion.brakeOutward * explode
				return (
					<group key={i} position={[x, S.wheels.radius, dz]}>
						<group scale-z={side}>
							<BrakeCorner front={front} stateRef={brakeRef} index={i + 1} />
						</group>
					</group>
				)
			})}
			<mesh position={[...G.masterPosition]} rotation={[0, 0, Math.PI / 2]} userData={{partId: 'master-cylinder'}}>
				<cylinderGeometry args={[G.boosterRadius, G.boosterRadius, G.boosterRadius * 0.5, 32]} />
				<meshStandardMaterial {...S.materials.plastic} />
			</mesh>
			{[-1, 1].map((side) => (
				<Pipe
					key={side}
					id="brake-lines"
					points={[
						[S.dimensions.frontAxleX, G.rail.y, side * G.rail.z],
						[0, G.rail.y, side * G.rail.z],
						[S.dimensions.rearAxleX, G.rail.y, side * G.rail.z],
						[S.dimensions.rearAxleX, S.wheels.radius, (side * S.wheels.rearTrack) / 2],
					]}
					radius={G.branchRadius}
					color="#818785"
				/>
			))}
		</>
	)
}
export function Steering() {
	const [x, y] = S.steering.rackPosition,
		wheel = S.steering.wheelPosition
	return (
		<>
			<Bar from={[x, y, -G.rackLength / 2]} to={[x, y, G.rackLength / 2]} radius={G.rackRadius} id="steering-rack" />
			{[-1, 1].map((side, i) => (
				<Bar
					key={side}
					from={[x, y, (side * G.rackLength) / 2]}
					to={[S.dimensions.frontAxleX - G.armRadius, S.wheels.radius, (side * S.wheels.frontTrack) / 2]}
					radius={G.tieRodRadius}
					id={`tie-rod-${i + 1}`}
				/>
			))}
			<Bar from={[x, y, wheel[2]]} to={[...wheel]} radius={G.columnRadius} id="steering-column" />
			<group position={[...wheel]} rotation={[0, 0, -Math.PI / 3]} userData={{partId: 'steering-wheel'}}>
				<mesh rotation={[Math.PI / 2, 0, 0]}>
					<torusGeometry args={[G.steeringRimRadius, G.steeringRimTube, 12, 48]} />
					<meshStandardMaterial {...S.materials.rubber} />
				</mesh>
				<Box
					position={[0, 0, 0]}
					size={[G.steeringRimRadius * 1.5, G.steeringRimTube * 2, G.steeringRimRadius * 0.45]}
					material="plastic"
				/>
			</group>
		</>
	)
}
export function Electrical() {
	const y = G.harnessY,
		z = G.harnessZ,
		f = G.harnessFrontX,
		r = G.harnessRearX
	return (
		<>
			<Box id="battery" position={S.electrical.batteryPosition} size={G.batterySize} material="plastic" />
			{[-1, 1].map((side) => (
				<mesh
					key={side}
					position={[
						S.electrical.batteryPosition[0] + side * G.batterySize[0] * 0.3,
						S.electrical.batteryPosition[1] + G.batterySize[1] / 2,
						S.electrical.batteryPosition[2],
					]}
				>
					<cylinderGeometry args={[G.batteryTerminal, G.batteryTerminal, G.batteryTerminal, 12]} />
					<meshStandardMaterial color={side > 0 ? '#874937' : '#767c82'} metalness={0.6} />
				</mesh>
			))}
			<Box id="ecu" position={G.ecuPosition} size={G.ecuSize} />
			<Box id="fuse-box" position={G.fusePosition} size={G.fuseSize} material="plastic" />
			<group userData={{partId: 'wiring-harness'}}>
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
						{[f, S.engine.cylinder1X, S.transmission.clutchX, 0, S.engine.fuelTankPosition[0], r].map((x, i) => (
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
								<Box position={[x - G.ecuSize[0], y * 0.9, side * z * 0.3]} size={G.connectorSize} material="plastic" />
								<mesh position={[x, y * (0.8 + 0.2 * Math.abs(x / f)), side * z]} rotation={[0, 0, Math.PI / 2]}>
									<cylinderGeometry args={[G.wireRadius * 1.2, G.wireRadius * 1.2, G.harnessClipWidth, 12]} />
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
		</>
	)
}
export function PowertrainAccessories() {
	const rp = S.engine.radiatorPosition
	const fins = useMemo(
		() =>
			mergeOwned(
				Array.from({length: G.radiatorFins}, (_, i) =>
					new T.CylinderGeometry(G.radiatorFinRadius, G.radiatorFinRadius, G.radiatorSize[2], 16)
						.rotateX(Math.PI / 2)
						.translate(rp[0] + G.radiatorSize[0] * 0.55, rp[1] - G.radiatorSize[1] / 2 + (i / (G.radiatorFins - 1)) * G.radiatorSize[1], 0),
				),
			),
		[rp],
	)
	useEffect(() => () => fins.dispose(), [fins])
	return (
		<>
			<Box id="radiator" position={rp} size={G.radiatorSize} material="plastic" />
			<mesh geometry={fins} castShadow>
				<meshStandardMaterial {...S.materials.steel} />
			</mesh>
			<mesh position={[rp[0] - G.radiatorSize[0], rp[1], 0]} rotation={[0, Math.PI / 2, 0]}>
				<torusGeometry args={[G.fanRadius, G.radiatorFinRadius * 3, 8, 48]} />
				<meshStandardMaterial {...S.materials.plastic} />
			</mesh>
			<Box id="fuel-tank" position={S.engine.fuelTankPosition} size={G.tankSize} material="plastic" />
			<group userData={{partId: 'exhaust'}}>
				<Pipe
					points={[
						[S.engine.cylinder1X, S.engine.crankY, G.rail.z / 2],
						[S.transmission.outputX, G.rail.y, G.rail.z / 2],
						[S.dimensions.rearAxleX, G.rail.y, G.rail.z * 0.6],
						[...G.mufflerPosition],
					]}
					radius={G.exhaustRadius}
					color="#79716b"
				/>
				<Box position={G.mufflerPosition} size={G.mufflerSize} />
				<Bar
					from={[G.mufflerPosition[0], G.mufflerPosition[1], G.mufflerPosition[2]]}
					to={[-S.dimensions.wheelbase / 2 - S.dimensions.rearOverhang, G.mufflerPosition[1], G.mufflerPosition[2]]}
					radius={G.exhaustRadius}
				/>
			</group>
		</>
	)
}
