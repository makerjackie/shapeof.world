import * as T from 'three'
import { BRAKE_GEOMETRY as B, VEHICLE_SPEC as S } from './vehicle-spec'
import { brakePad, brakeRing, floatingCaliperBody } from './brake-geometry'
import { mergeOwned, radialGeometry } from './repeated-geometry'

type GeometrySet = Record<string, T.BufferGeometry>
const templates = new Map<string, GeometrySet>()

/** Four bounded templates (front/rear rotor and caliper), populated by the car.
 * Scene instances own copies, so unmount/disposal and highlighting remain local.
 * The CPU-only templates never acquire WebGL buffers. */
function copyTemplate<TSet extends GeometrySet>(key: string, build: () => TSet): TSet {
	let template = templates.get(key)
	if (!template) {
		template = build()
		templates.set(key, template)
	}
	return Object.fromEntries(
		Object.entries(template).map(([name, geometry]) => [
			name,
			new T.BufferGeometry().copy(geometry),
		]),
	) as TSet
}

export function rotorGeometry(front: boolean) {
	return copyTemplate(`rotor-${front}`, () => {
		const spec = front ? S.brakes.front : S.brakes.rear
		const radius = spec.diameter / 2
		return {
			ring: brakeRing(B.rotorInnerRadius, radius, front ? B.rotorFaceThickness : spec.thickness),
			hat: brakeRing(B.rotorBoreRadius, B.rotorHatRadius, B.rotorHatDepth),
			vanes: front
				? radialGeometry(
						new T.BoxGeometry(
							radius - B.rotorInnerRadius,
							B.rotorVaneThickness,
							spec.thickness - B.rotorFaceThickness * 2,
						),
						B.rotorVanes,
						(radius + B.rotorInnerRadius) / 2,
					)
				: new T.BufferGeometry(),
			grooves: mergeOwned(
				[-1, 1].flatMap((side) =>
					Array.from({ length: B.rotorGrooveCount }, (_, i) => {
						const r =
							B.rotorInnerRadius +
							((radius - B.rotorInnerRadius) * (i + 1)) / (B.rotorGrooveCount + 1)
						return new T.TorusGeometry(r, B.rotorGrooveWidth, 4, 96).translate(
							0,
							0,
							side * (spec.thickness / 2 + B.rotorGrooveWidth),
						)
					}),
				),
			),
		}
	})
}

export function caliperGeometry(front: boolean) {
	return copyTemplate(`caliper-${front}`, () => {
		const spec = front ? S.brakes.front : S.brakes.rear
		const casting = floatingCaliperBody(front)
		return {
			casting,
			edges: new T.EdgesGeometry(casting, 40),
			boot: mergeOwned(
				Array.from({ length: 5 }, (_, j) =>
					new T.TorusGeometry(B.guidePinRadius * 1.6, B.guidePinRadius * 0.42, 8, 24).translate(
						0,
						0,
						(j - 2) * B.guidePinRadius * 0.8,
					),
				),
			),
			pad: brakePad(front),
			piston: brakeRing(
				spec.pistonDiameter / 2 - B.pistonWall,
				spec.pistonDiameter / 2,
				B.pistonLength,
			),
		}
	})
}
