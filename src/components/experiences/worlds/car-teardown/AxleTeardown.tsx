import { useEffect, useMemo, useRef, type RefObject, type ReactNode } from 'react'
import { useFrame } from './animation'
import * as T from 'three'
import { createDifferentialResources } from './differential-geometry'
import { createAnnulus } from './transmission-geometry'
import { createCastAluminumMaterial } from './engine-geometry'
import { TeardownPart } from './TeardownPart'
import {
	AUXILIARY_TEARDOWN_GEOMETRY as A,
	STEERING_GEOMETRY as G,
	VEHICLE_SPEC as S,
} from './vehicle-spec'
import type { SteeringState } from './steering-model'

function Rotation({
	stateRef,
	axis = 'z',
	angle,
	children,
}: {
	stateRef: RefObject<SteeringState>
	axis?: 'x' | 'z'
	angle: (s: SteeringState) => number
	children: ReactNode
}) {
	const ref = useRef<T.Group>(null)
	useFrame(() => {
		if (ref.current) ref.current.rotation[axis] = angle(stateRef.current)
	})
	return <group ref={ref}>{children}</group>
}
/** Extraction transforms surround (and therefore never rotate with) the live mechanism. */
export function AxleTeardown({ stateRef }: { stateRef: RefObject<SteeringState> }) {
	const resources = useMemo(() => {
		const gears = createDifferentialResources()
		const ends = createAnnulus(
			G.carrierRadius,
			G.carrierRadius - G.carrierWall,
			G.carrierWall,
		).rotateY(Math.PI / 2)
		const shells = [-1, 1].map((side) => {
			const profile = [
				[G.axleHousingRadius, 0],
				[G.axleHousingRadius * 0.72, G.axleHousingLength * 0.6],
				[G.axleTubeRadius, G.axleHousingLength],
				[G.axleTubeRadius, A.drivetrain.detailHalfSpan - G.axleTubeInset],
			]
			return new T.LatheGeometry(
				[
					...profile,
					...profile
						.slice()
						.reverse()
						.map(([r, z]) => [r - G.axleHousingWall, z]),
					profile[0],
				].map(([r, z]) => new T.Vector2(r, z)),
				64,
			).rotateX((side * Math.PI) / 2)
		})
		return { ...gears, ends, shells, cast: createCastAluminumMaterial() }
	}, [])
	useEffect(
		() => () => {
			Object.values(resources)
				.flat()
				.forEach((g) => g.dispose())
		},
		[resources],
	)
	const metal = <meshStandardMaterial {...S.materials.steel} metalness={0.65} roughness={0.43} />
	return (
		<group position={[S.transmission.differentialX, S.wheels.radius, 0]}>
			{[-1, 1].map((side, i) => (
				<TeardownPart key={side} id="drive-axle" offset={[0, 0, side]} representative={side > 0}>
					<mesh
						geometry={resources.shells[i]}
						material={resources.cast}
						userData={{ partId: side < 0 ? 'drivetrain-axle-left' : 'drivetrain-axle-right' }}
					/>
				</TeardownPart>
			))}
			<TeardownPart id="drive-pinion">
				<Rotation stateRef={stateRef} axis="x" angle={(s) => s.drivePinionAngle}>
					<mesh geometry={resources.pinion} userData={{ partId: 'final-drive-pinion' }}>
						{metal}
					</mesh>
				</Rotation>
			</TeardownPart>
			<TeardownPart id="drive-ring">
				<Rotation stateRef={stateRef} angle={(s) => s.carrierAngle}>
					<mesh geometry={resources.ring} userData={{ partId: 'final-drive-ring' }}>
						{metal}
					</mesh>
				</Rotation>
			</TeardownPart>
			<TeardownPart id="drive-differential">
				<Rotation stateRef={stateRef} angle={(s) => s.carrierAngle}>
					<group userData={{ partId: 'differential' }}>
						{[-1, 1].map((side) => (
							<group key={side}>
								<mesh position-z={(side * G.carrierLength) / 2} geometry={resources.ends}>
									{metal}
								</mesh>
								<mesh position-x={side * (G.carrierRadius - G.carrierWall / 2)}>
									<boxGeometry args={[G.carrierWall, G.carrierWall * 3, G.carrierLength]} />
									{metal}
								</mesh>
							</group>
						))}
					</group>
				</Rotation>
			</TeardownPart>
			<TeardownPart id="drive-cross">
				<Rotation stateRef={stateRef} angle={(s) => s.carrierAngle}>
					<mesh userData={{ partId: 'differential-cross-pin' }}>
						<cylinderGeometry
							args={[G.planetAxleRadius, G.planetAxleRadius, G.carrierRadius * 2, 20]}
						/>
						{metal}
					</mesh>
				</Rotation>
			</TeardownPart>
			{[-1, 1].map((side, i) => (
				<TeardownPart
					key={side}
					id="drive-side-gears"
					offset={[0, 0, side]}
					representative={side > 0}
				>
					<Rotation
						stateRef={stateRef}
						angle={(s) => s.wheelAngles[side < 0 ? 'rearLeft' : 'rearRight']}
					>
						<mesh
							rotation-y={side < 0 ? Math.PI : 0}
							geometry={resources.side}
							userData={{ partId: `drivetrain-side-${i + 1}` }}
						>
							{metal}
						</mesh>
					</Rotation>
				</TeardownPart>
			))}
			{[-1, 1].map((side, i) => (
				<TeardownPart key={side} id="drive-planets" offset={[0, side, 0]} representative={side > 0}>
					<Rotation stateRef={stateRef} angle={(s) => s.carrierAngle}>
						<group rotation-x={(-side * Math.PI) / 2}>
							<Rotation stateRef={stateRef} angle={(s) => -s.planetSpinAngle}>
								<mesh
									geometry={resources.planet}
									userData={{ partId: `drivetrain-planet-${i + 1}` }}
								>
									<meshStandardMaterial
										{...S.materials.steel}
										color="#ac956f"
										metalness={0.6}
										roughness={0.42}
									/>
								</mesh>
							</Rotation>
						</group>
					</Rotation>
				</TeardownPart>
			))}
			{[-1, 1].map((side, i) => (
				<TeardownPart
					key={side}
					id="drive-halfshafts"
					offset={[0, 0, side]}
					representative={side > 0}
				>
					<Rotation
						stateRef={stateRef}
						angle={(s) => s.wheelAngles[side < 0 ? 'rearLeft' : 'rearRight']}
					>
						<mesh
							position-z={(side * (A.drivetrain.detailHalfSpan * 2 + G.carrierLength)) / 4}
							rotation-x={Math.PI / 2}
							userData={{ partId: `halfshaft-${i + 1}` }}
						>
							<cylinderGeometry
								args={[
									G.halfshaftRadius,
									G.halfshaftRadius,
									A.drivetrain.detailHalfSpan - G.carrierLength / 2,
									24,
								]}
							/>
							{metal}
						</mesh>
					</Rotation>
				</TeardownPart>
			))}
		</group>
	)
}
