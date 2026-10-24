import { useEffect, useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { BODY_GEOMETRY as B, BODY_TEARDOWN_SPEC as S, VEHICLE_SPEC as V } from './vehicle-spec'
import { createArchLiner, curveTube } from './body-geometry'
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
	const geometry = useMemo(() => {
		const half = width / 2,
			h = (height ?? width) / 2,
			r = width * 0.15,
			shape = new THREE.Shape()
		shape.moveTo(-half + r, -h)
		shape.lineTo(half - r, -h)
		shape.quadraticCurveTo(half, -h, half, -h + r)
		shape.lineTo(half, h - r)
		shape.quadraticCurveTo(half, h, half - r, h)
		shape.lineTo(-half + r, h)
		shape.quadraticCurveTo(-half, h, -half, h - r)
		shape.lineTo(-half, -h + r)
		shape.quadraticCurveTo(-half, -h, -half + r, -h)
		return new THREE.ExtrudeGeometry(shape, {
			steps: 40,
			bevelEnabled: false,
			extrudePath: new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
		})
	}, [points, width, height])
	useEffect(() => () => geometry.dispose(), [geometry])
	return (
		<mesh geometry={geometry} castShadow receiveShadow>
			<meshStandardMaterial color={color} metalness={0.72} roughness={0.43} />
		</mesh>
	)
}
const mirror = (points: readonly Point[], side: number) =>
	points.map(([x, y, z]) => [x, y, z * side] as const)
export function BodyStructure() {
	const U = B.unibody,
		T = S.structure
	const resources = useMemo(
		() => ({
			liners: [V.dimensions.frontAxleX, V.dimensions.rearAxleX].flatMap((x) =>
				[-1, 1].map((side) => createArchLiner(x, side)),
			),
			beads: Array.from({ length: Math.floor(U.floorLength / U.beadSpacing) - 1 }, (_, i) =>
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
			).flat(),
			tunnel: (() => {
				const g = new THREE.CylinderGeometry(
					U.tunnelWidth / 2,
					U.tunnelWidth / 2,
					U.floorLength,
					32,
					1,
					true,
					0,
					Math.PI,
				)
				g.rotateZ(Math.PI / 2)
				g.scale(1, U.tunnelHeight / (U.tunnelWidth / 2), 1)
				return g
			})(),
			tower: (() => {
				const shape = new THREE.Shape()
				shape.absarc(0, 0, T.shockTowerRadius, 0, Math.PI * 2, false)
				const hole = new THREE.Path()
				hole.absarc(0, 0, T.towerBoreRadius, 0, Math.PI * 2, true)
				shape.holes.push(hole)
				const g = new THREE.ExtrudeGeometry(shape, {
					depth: U.sheetThickness * 2,
					bevelEnabled: true,
					bevelThickness: U.sheetThickness / 2,
					bevelSize: U.sheetThickness / 2,
					bevelSegments: 2,
					curveSegments: 48,
				})
				g.rotateX(-Math.PI / 2)
				return g
			})(),
		}),
		[],
	)
	useEffect(
		() => () => {
			resources.liners.forEach((g) => g.dispose())
			resources.beads.forEach((g) => g.dispose())
			resources.tunnel.dispose()
			resources.tower.dispose()
		},
		[resources],
	)
	const plateWidth = (U.floorWidth - U.tunnelWidth) / 2
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
				<mesh geometry={resources.tunnel} position={[U.floorX, U.floorY, 0]}>
					<meshStandardMaterial
						color={S.steel.hot.color}
						metalness={0.72}
						roughness={0.43}
						side={THREE.DoubleSide}
					/>
				</mesh>
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
								<mesh>
									<cylinderGeometry
										args={[
											T.shockTowerRadius,
											T.shockTowerRadius * 1.12,
											T.shockTowerHeight,
											48,
											1,
											true,
										]}
									/>
									<meshStandardMaterial
										color={S.steel.high.color}
										metalness={0.72}
										roughness={0.42}
										side={THREE.DoubleSide}
									/>
								</mesh>
								<mesh position={[0, T.shockTowerHeight / 2, 0]} geometry={resources.tower}>
									<meshStandardMaterial
										color={S.steel.high.color}
										metalness={0.72}
										roughness={0.42}
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
				{[-1, 1].map((side) => (
					<mesh
						key={side}
						position={[U.floorX, U.floorY, side * (U.tunnelWidth / 2 + plateWidth / 2)]}
						castShadow
						receiveShadow
					>
						<boxGeometry args={[U.floorLength, U.sheetThickness, plateWidth]} />
						<meshStandardMaterial color={S.steel.mild.color} metalness={0.67} roughness={0.46} />
					</mesh>
				))}
				{resources.beads.map((g, i) => (
					<mesh key={i} geometry={g}>
						<meshStandardMaterial color={S.steel.mild.color} metalness={0.67} roughness={0.46} />
					</mesh>
				))}
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
				<mesh position={[T.bulkheadX, T.bulkheadY, 0]} castShadow>
					<boxGeometry args={[T.bulkheadThickness, T.bulkheadHeight, T.bulkheadWidth]} />
					<meshStandardMaterial color={S.steel.mild.color} metalness={0.67} roughness={0.46} />
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
