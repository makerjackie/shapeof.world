import * as T from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/** Bake rigid repetitions without changing their topology, normals or material.
 * The source is owned by this helper; the caller owns the returned geometry. */
export function radialGeometry(
	source: T.BufferGeometry,
	count: number,
	radius: number,
	axis: 'x' | 'z' = 'z',
) {
	const copies: T.BufferGeometry[] = []
	for (let i = 0; i < count; i++) {
		const angle = (i * Math.PI * 2) / count
		const g = source.clone()
		if (axis === 'x') {
			g.rotateX(angle)
			g.translate(0, radius * Math.cos(angle), radius * Math.sin(angle))
		} else {
			g.rotateZ(angle)
			g.translate(radius * Math.cos(angle), radius * Math.sin(angle), 0)
		}
		copies.push(g)
	}
	const merged = mergeGeometries(copies)!
	copies.forEach((g) => g.dispose())
	source.dispose()
	return merged
}
export function mergeOwned(pieces: T.BufferGeometry[]) {
	const merged = mergeGeometries(pieces)!
	pieces.forEach((g) => g.dispose())
	return merged
}
