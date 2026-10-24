import { useEffect, useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { BODY_GEOMETRY as B, BODY_TEARDOWN_SPEC as S, VEHICLE_SPEC as V } from './vehicle-spec'
import { createArchLiner } from './body-geometry'
import {
	stampedBeam,
	stampedFlange,
	stampedTower,
	stampedFloor,
	stampedBulkhead,
} from './stamped-geometry'
import { TeardownPart } from './TeardownPart'

type Point = readonly [number, number, number]
function Beam({
	points,
	width,
	height,
	color,
}: {
	points: readonly Point[]
	width: number
	height?: number
	color: string
}) {
	const taper = width === S.structure.bPillarRadius * 2 ? 0.46 : 0.85
	const sectionKey = points.flat().join(',')
	const geometries = useMemo(
		() => [
			stampedBeam(points, width, height ?? width * 0.55, taper),
			...[-1, 1].map((side) => stampedFlange(points, width, height ?? width * 0.55, taper, side)),
		],
		[sectionKey, width, height],
	)
	useEffect(() => () => geometries.forEach((g) => g.dispose()), [geometries])
	return (
		<group>
			{geometries.map((g, i) => (
				<mesh key={i} geometry={g} castShadow receiveShadow>
					<meshStandardMaterial
						color={color}
						metalness={0.72}
						roughness={0.43}
						side={THREE.DoubleSide}
					/>
				</mesh>
			))}
		</group>
	)
}
const mirror = (points: readonly Point[], side: number) =>
	points.map(([x, y, z]) => [x, y, z * side] as const)
export function BodyStructure() {
	const U = B.unibody,
		T = S.structure
	const resources = useMemo(
		() => ({
			bowl: stampedTower(),
			floor: stampedFloor(),
			bulkhead: stampedBulkhead(),
			liners: [V.dimensions.frontAxleX, V.dimensions.rearAxleX].flatMap((x) =>
				[-1, 1].map((side) => createArchLiner(x, side)),
			),
		}),
		[],
	)
	useEffect(
		() => () => {
			resources.liners.forEach((g) => g.dispose())
			resources.bowl.dispose()
			resources.floor.dispose()
			resources.bulkhead.dispose()
		},
		[resources],
	)
	return (
		<group name="Body in white">
			<TeardownPart id="body-hot-steel">
				{[-1, 1].map((side) => (
					<group key={side}>
						<Beam
							points={mirror(T.aPillar, side)}
							width={T.pillarRadius * 2}
							color={S.steel.hot.color}
						/>
						<Beam
							points={mirror(T.bPillar, side)}
							width={T.bPillarRadius * 2}
							height={T.bPillarRadius * 1.25}
							color={S.steel.hot.color}
						/>
						<Beam
							points={mirror(T.roofRail, side)}
							width={T.roofRailRadius * 2}
							color={S.steel.hot.color}
						/>
						<RoundedBox
							position={[U.floorX, U.floorY + U.sillHeight / 2, side * U.sillZ]}
							args={[U.floorLength, U.sillHeight, U.sillWidth]}
							radius={U.sheetThickness}
							smoothness={3}
							castShadow
						>
							<meshStandardMaterial color={S.steel.hot.color} metalness={0.72} roughness={0.43} />
						</RoundedBox>
					</group>
				))}

				<Beam
					points={[
						[T.bulkheadX, T.bulkheadY + T.bulkheadHeight / 2, -U.sillZ],
						[T.bulkheadX, T.bulkheadY + T.bulkheadHeight / 2, U.sillZ],
					]}
					width={T.crossmemberWidth}
					color={S.steel.hot.color}
				/>
			</TeardownPart>
			<TeardownPart id="body-high-steel">
				{[-1, 1].map((side) => (
					<group key={side}>
						<Beam
							points={mirror(T.cPillar, side)}
							width={T.pillarRadius * 2.3}
							color={S.steel.high.color}
						/>
						<Beam
							points={[
								[T.bulkheadX, U.floorY + U.railHeight, side * U.railZ],
								[T.frontRailMidX, U.floorY + U.railHeight * 2, side * U.railZ],
								[U.railFrontX, U.floorY + U.railHeight * 2.3, side * U.railZ],
							]}
							width={U.railWidth}
							height={T.railHeight}
							color={S.steel.high.color}
						/>
						<Beam
							points={[
								[U.floorX - U.floorLength / 2, U.floorY + U.railHeight, side * U.railZ],
								[T.rearRailMidX, T.rearDeckY * 0.7, side * U.railZ],
								[U.railRearX, T.rearDeckY * 0.7, side * U.railZ],
							]}
							width={U.railWidth}
							height={T.railHeight}
							color={S.steel.high.color}
						/>
						{[V.dimensions.frontAxleX, V.dimensions.rearAxleX].map((x) => (
							<group key={x} position={[x, T.shockTowerY, side * T.shockTowerZ]}>
								<mesh geometry={resources.bowl}>
									<meshStandardMaterial
										color={S.steel.high.color}
										metalness={0.72}
										roughness={0.42}
										side={THREE.DoubleSide}
									/>
								</mesh>
							</group>
						))}
						{T.crumpleGroovesX.map((x) => (
							<mesh
								key={x}
								position={[x, U.floorY + U.railHeight * 2.25 + T.railHeight / 2, side * U.railZ]}
							>
								<boxGeometry
									args={[U.sheetThickness * 1.5, U.sheetThickness * 0.7, U.railWidth * 1.03]}
								/>
								<meshStandardMaterial color="#435866" metalness={0.6} roughness={0.5} />
							</mesh>
						))}
					</group>
				))}
				{T.crossmembersX.map((x) => (
					<Beam
						key={x}
						points={[
							[x, U.floorY + T.crossmemberHeight / 2, -U.sillZ],
							[x, U.floorY + T.crossmemberHeight / 2, U.sillZ],
						]}
						width={T.crossmemberWidth}
						height={T.crossmemberHeight}
						color={S.steel.high.color}
					/>
				))}
				{T.roofBowsX.map((x) => (
					<Beam
						key={x}
						points={[
							[x, T.roofBowEndY, -T.roofBowHalfWidth],
							[x, T.roofBowCenterY, 0],
							[x, T.roofBowEndY, T.roofBowHalfWidth],
						]}
						width={T.roofBowRadius * 2}
						height={T.roofBowRadius}
						color={S.steel.high.color}
					/>
				))}
				{[U.railFrontX + T.bumperBeamOffset, U.railRearX - T.bumperBeamOffset].map((x) => (
					<Beam
						key={x}
						points={[
							[x, T.bumperBeamEndY, -T.bumperBeamHalfWidth],
							[x, T.bumperBeamCenterY, 0],
							[x, T.bumperBeamEndY, T.bumperBeamHalfWidth],
						]}
						width={U.railWidth}
						height={T.railHeight}
						color={S.steel.high.color}
					/>
				))}
			</TeardownPart>
			<TeardownPart id="body-mild-steel">
				<mesh geometry={resources.floor} castShadow receiveShadow>
					<meshStandardMaterial
						color={S.steel.mild.color}
						metalness={0.67}
						roughness={0.46}
						side={THREE.DoubleSide}
					/>
				</mesh>
				{resources.liners.map((g, i) => (
					<mesh key={i} geometry={g}>
						<meshStandardMaterial
							color={S.steel.mild.color}
							metalness={0.67}
							roughness={0.46}
							side={THREE.DoubleSide}
						/>
					</mesh>
				))}
				<mesh geometry={resources.bulkhead} castShadow>
					<meshStandardMaterial
						color={S.steel.mild.color}
						metalness={0.67}
						roughness={0.46}
						side={THREE.DoubleSide}
					/>
				</mesh>
				<mesh position={[T.rearWallX, T.rearDeckY - T.rearWallHeight / 2, 0]}>
					<boxGeometry args={[U.sheetThickness, T.rearWallHeight, T.bulkheadWidth]} />
					<meshStandardMaterial color={S.steel.mild.color} metalness={0.67} roughness={0.46} />
				</mesh>
				<mesh position={[(T.rearWallX + U.railRearX) / 2, T.rearDeckY, 0]}>
					<boxGeometry
						args={[Math.abs(T.rearWallX - U.railRearX), U.sheetThickness, T.bulkheadWidth]}
					/>
					<meshStandardMaterial color={S.steel.mild.color} metalness={0.67} roughness={0.46} />
				</mesh>
			</TeardownPart>
		</group>
	)
}
