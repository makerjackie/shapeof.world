import {useMemo, useEffect} from 'react'
import * as T from 'three'
import {RoundedBox} from '@react-three/drei'
import {VEHICLE_SPEC as S} from './vehicle-spec'
function Beam({a, b}: {a: [number, number, number]; b: [number, number, number]}) {
	const pose = useMemo(() => {
		const start = new T.Vector3(...a),
			end = new T.Vector3(...b)
		return {
			center: start.clone().add(end).multiplyScalar(0.5),
			length: start.distanceTo(end),
			quaternion: new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), end.sub(start).normalize()),
		}
	}, [a, b])
	return (
		<mesh position={pose.center} quaternion={pose.quaternion} castShadow>
			<cylinderGeometry args={[0.025, 0.025, pose.length, 12]} />
			<meshStandardMaterial color="#69777a" metalness={0.72} roughness={0.43} />
		</mesh>
	)
}
/** Open U-frame: cross-members sit ahead of / behind the engine, not through its sump. */
export function MountingFrames() {
	return (
		<group name="engine-and-suspension-mounting-frames">
			{([-1, 1] as const).map((side) => (
				<group key={side}>
					<Beam a={[1.12, 0.19, side * 0.36]} b={[1.98, 0.19, side * 0.36]} />
					<Beam a={[1.25, 0.24, side * 0.48]} b={[1.12, 0.19, side * 0.36]} />
					<Beam a={[1.65, 0.24, side * 0.48]} b={[1.98, 0.19, side * 0.36]} />
					<Beam a={[1.37, 0.22, side * 0.145]} b={[1.37, 0.2, side * 0.36]} />
					<Beam a={[1.75, 0.22, side * 0.145]} b={[1.75, 0.2, side * 0.36]} />
				</group>
			))}
			{[1.12, 1.98, S.dimensions.rearAxleX - 0.28, S.dimensions.rearAxleX + 0.28].map((x) => (
				<Beam key={x} a={[x, 0.19, -0.36]} b={[x, 0.19, 0.36]} />
			))}
			{[-1, 1].map((side) => (
				<Beam key={side} a={[S.dimensions.rearAxleX - 0.28, 0.19, side * 0.36]} b={[S.dimensions.rearAxleX + 0.28, 0.19, side * 0.36]} />
			))}
		</group>
	)
}

/** Original mounting hardware for this fictional front-engine installation. */
export function EngineBayHardware() {
	return (
		<group name="engine-bay-hardware">
			<MountingFrames />
			<RoundedBox position={[2.07, 0.47, 0]} args={[0.045, 0.25, 0.57]} radius={0.009} smoothness={3} castShadow>
				<meshStandardMaterial color="#313d40" roughness={0.65} />
			</RoundedBox>
			{Array.from({length: 24}, (_, i) => (
				<mesh key={i} position={[2.098, 0.355 + i * 0.01, 0]}>
					<boxGeometry args={[0.003, 0.003, 0.51]} />
					<meshStandardMaterial color="#849496" metalness={0.8} roughness={0.48} />
				</mesh>
			))}
			<RoundedBox position={[1.22, 0.64, 0]} args={[0.018, 0.28, 0.86]} radius={0.005} smoothness={2}>
				<meshStandardMaterial color="#525d5f" metalness={0.6} roughness={0.58} />
			</RoundedBox>
			{[-1, 1].map((side) => (
				<RoundedBox key={side} position={[1.22, 0.29, side * 0.3]} args={[0.018, 0.42, 0.27]} radius={0.004} smoothness={2}>
					<meshStandardMaterial color="#525d5f" metalness={0.6} roughness={0.58} />
				</RoundedBox>
			))}
			<RoundedBox position={[1.82, 0.49, 0.42]} args={[0.14, 0.16, 0.13]} radius={0.018} smoothness={3}>
				<meshStandardMaterial color="#d6ddd4" roughness={0.4} transparent opacity={0.78} />
			</RoundedBox>
			<mesh position={[1.82, 0.58, 0.42]}>
				<cylinderGeometry args={[0.023, 0.023, 0.018, 24]} />
				<meshStandardMaterial color="#263437" roughness={0.8} />
			</mesh>
		</group>
	)
}
