import {ExtrudeGeometry, Path, Shape, Vector2} from 'three'
import {VEHICLE_SPEC} from './vehicle-spec'

export interface GearParameters {
	teeth: number
	/** Normal module in metres, the common module for a meshing pair. */
	module?: number
	pressureAngle?: number
	/** Helix angle in degrees; opposite signs mesh on parallel shafts. */
	helixAngle?: number
	/** Tangential tooth-thickness reduction at the pitch circle, in metres. */
	backlash?: number
}

export function gearDimensions({
	teeth,
	module = VEHICLE_SPEC.transmission.gearModule,
	pressureAngle = VEHICLE_SPEC.transmission.pressureAngle,
	helixAngle = 0,
}: GearParameters) {
	if (!Number.isInteger(teeth) || teeth < 8)
		throw new RangeError('A gear needs an integer tooth count of at least 8')
	if (!(module > 0) || !(pressureAngle > 0 && pressureAngle < 45) || Math.abs(helixAngle) >= 45) {
		throw new RangeError('Invalid module, pressure angle or helix angle')
	}
	const helix = (helixAngle * Math.PI) / 180
	const transverseModule = module / Math.cos(helix)
	const transversePressure = Math.atan(Math.tan((pressureAngle * Math.PI) / 180) / Math.cos(helix))
	const pitchRadius = (transverseModule * teeth) / 2
	const baseRadius = pitchRadius * Math.cos(transversePressure)
	return {
		pitchRadius,
		baseRadius,
		addendumRadius: pitchRadius + module,
		rootRadius: pitchRadius - 1.25 * module,
		transversePressure,
		transverseModule,
		pitchHalfAngle: Math.PI / (2 * teeth),
	}
}

/** Polar angle swept by the string unwinding from the base circle. */
export function involuteAngle(radius: number, baseRadius: number): number {
	if (radius <= baseRadius) return 0
	const alpha = Math.acos(baseRadius / radius)
	return Math.tan(alpha) - alpha
}

/** Analytic involute flank angle about a tooth centre, at the given radius. */
export function toothHalfAngle(radius: number, parameters: GearParameters): number {
	const d = gearDimensions(parameters)
	return (
		d.pitchHalfAngle +
		involuteAngle(d.pitchRadius, d.baseRadius) -
		involuteAngle(radius, d.baseRadius) -
		(parameters.backlash ?? 0) / (2 * d.pitchRadius)
	)
}

/**
 * A true involute working flank, sampled densely enough for extrusion.
 * Below the base circle the flank joins the dedendum radially. Tool-generated
 * trochoidal root fillets/undercut are intentionally not represented.
 */
export function involuteGearOutline(parameters: GearParameters, flankSteps = 12): Vector2[] {
	const d = gearDimensions(parameters)
	const points: Vector2[] = []
	const pitch = (2 * Math.PI) / parameters.teeth
	const flankStart = Math.max(d.rootRadius, d.baseRadius)
	const rootHalf = toothHalfAngle(flankStart, parameters)
	const polar = (radius: number, angle: number) =>
		new Vector2(radius * Math.cos(angle), radius * Math.sin(angle))
	const steps = Math.max(3, Math.floor(flankSteps))

	for (let tooth = 0; tooth < parameters.teeth; tooth++) {
		const centre = tooth * pitch
		points.push(polar(d.rootRadius, centre - rootHalf))
		for (let step = 0; step <= steps; step++) {
			const radius = flankStart + ((d.addendumRadius - flankStart) * step) / steps
			points.push(polar(radius, centre - toothHalfAngle(radius, parameters)))
		}
		const tipHalf = toothHalfAngle(d.addendumRadius, parameters)
		for (let step = 1; step <= 4; step++) {
			points.push(polar(d.addendumRadius, centre - tipHalf + (2 * tipHalf * step) / 4))
		}
		for (let step = steps - 1; step >= 0; step--) {
			const radius = flankStart + ((d.addendumRadius - flankStart) * step) / steps
			points.push(polar(radius, centre + toothHalfAngle(radius, parameters)))
		}
		points.push(polar(d.rootRadius, centre + rootHalf))
		const gap = pitch - 2 * rootHalf
		for (let step = 1; step < 4; step++) {
			points.push(polar(d.rootRadius, centre + rootHalf + (gap * step) / 4))
		}
	}
	return points
}

export function involuteGearShape(parameters: GearParameters, boreRadius = 0): Shape {
	const outline = involuteGearOutline(parameters)
	const shape = new Shape(outline)
	if (boreRadius > 0) {
		if (boreRadius >= gearDimensions(parameters).rootRadius)
			throw new RangeError('Bore must fit inside the gear root')
		const bore = new Path()
		bore.absarc(0, 0, boreRadius, 0, Math.PI * 2, true)
		shape.holes.push(bore)
	}
	return shape
}

/** Extruded along +Z, centred on z = 0, optionally with a helical twist. */
export function createInvoluteGearGeometry(
	parameters: GearParameters,
	thickness: number,
	boreRadius = 0,
): ExtrudeGeometry {
	if (!(thickness > 0)) throw new RangeError('Gear thickness must be positive')
	const helix = ((parameters.helixAngle ?? 0) * Math.PI) / 180
	const d = gearDimensions(parameters)
	const geometry = new ExtrudeGeometry(involuteGearShape(parameters, boreRadius), {
		depth: thickness,
		steps: helix ? 12 : 1,
		bevelEnabled: false,
		curveSegments: 48,
	})
	const vertices = geometry.attributes.position
	for (let i = 0; i < vertices.count; i++) {
		const z = vertices.getZ(i) - thickness / 2
		const twist = (z * Math.tan(helix)) / d.pitchRadius
		const x = vertices.getX(i)
		const y = vertices.getY(i)
		vertices.setXYZ(
			i,
			x * Math.cos(twist) - y * Math.sin(twist),
			x * Math.sin(twist) + y * Math.cos(twist),
			z,
		)
	}
	vertices.needsUpdate = true
	geometry.computeVertexNormals()
	geometry.computeBoundingBox()
	geometry.computeBoundingSphere()
	return geometry
}

/** Initial angles for a +X centre-to-centre spur pair: tooth faces a gap. */
export function meshingPhase(drivenTeeth: number): number {
	return Math.PI - Math.PI / drivenTeeth
}
