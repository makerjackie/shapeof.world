import * as T from 'three'
/** Fit all eight corners in camera space, including their different depths. */
export function assemblyFrame(
	box: T.Box3,
	view: readonly [number, number, number],
	aspect: number,
	fov: number,
	mobile = false,
	vertices?: T.Vector3[],
) {
	const center = box.getCenter(new T.Vector3()),
		size = box.getSize(new T.Vector3())
	const direction = new T.Vector3(...view).normalize(),
		right = new T.Vector3().crossVectors(new T.Vector3(0, 1, 0), direction).normalize(),
		up = new T.Vector3().crossVectors(direction, right)
	const tan = Math.tan((fov * Math.PI) / 360),
		width = mobile ? 0.82 : 0.6,
		height = mobile ? 0.32 : 0.63
	const corners =
		vertices ??
		[box.min.x, box.max.x].flatMap((x) =>
			[box.min.y, box.max.y].flatMap((y) =>
				[box.min.z, box.max.z].map((z) => new T.Vector3(x, y, z)),
			),
		)
	const projected = corners.map((v) => {
		const p = v.clone().sub(center)
		return [p.dot(right), p.dot(up), p.dot(direction)] as const
	})
	let centreX = 0,
		centreY = 0
	const fit = () => {
		let d = size.length() * 0.55
		for (const [x, y, z] of projected)
			d = Math.max(
				d,
				z + Math.abs(x - centreX) / (tan * aspect * width),
				z + Math.abs(y - centreY) / (tan * height),
			)
		return d
	}
	// Balance the occupied screen area, not the empty corners of a world-axis box.
	for (let iteration = 0; iteration < 5; iteration++) {
		const d = fit()
		let minX = Infinity,
			maxX = -Infinity,
			minY = Infinity,
			maxY = -Infinity
		for (const [x, y, z] of projected) {
			const px = (x - centreX) / (d - z),
				py = (y - centreY) / (d - z)
			minX = Math.min(minX, px)
			maxX = Math.max(maxX, px)
			minY = Math.min(minY, py)
			maxY = Math.max(maxY, py)
		}
		centreX += ((minX + maxX) * d) / 2
		centreY += ((minY + maxY) * d) / 2
	}
	const distance = fit() * 1.025
	center.addScaledVector(right, centreX).addScaledVector(up, centreY)

	return {
		center,
		position: center.clone().addScaledVector(direction, distance),
		distance,
		widthFraction: width,
		heightFraction: height,
	}
}
/** Expand only visible, selectable pieces. Faint harness/context is excluded. */
export function explodedAssemblyBounds(root: T.Object3D) {
	root.updateWorldMatrix(true, true)
	const bounds = new T.Box3()
	const walk = (object: T.Object3D) => {
		if (!object.visible || object.userData.excludeFromFit) return
		if (object.userData.teardownId) {
			const piece = new T.Box3().setFromObject(object),
				shift = object.userData.extraction as number[] | undefined
			if (shift) {
				const delta = new T.Vector3(...shift).multiplyScalar(
					1 - (object.userData.extractionAmount ?? 1),
				)
				if (object.parent)
					delta.applyMatrix3(new T.Matrix3().setFromMatrix4(object.parent.matrixWorld))
				piece.translate(delta)
			}
			bounds.union(piece)
			return
		}
		object.children.forEach(walk)
	}
	walk(root)
	return bounds
}

/** Final transformed vertices avoid fitting empty corners or oversized spinning-disc boxes. */
export function explodedAssemblyPoints(root: T.Object3D) {
	root.updateWorldMatrix(true, true)
	const points: T.Vector3[] = []
	const walk = (object: T.Object3D, delta = new T.Vector3()) => {
		if (!object.visible || object.userData.excludeFromFit) return
		if (object.userData.teardownId && object.userData.extraction) {
			delta = new T.Vector3(...object.userData.extraction).multiplyScalar(
				1 - (object.userData.extractionAmount ?? 1),
			)
			if (object.parent)
				delta.applyMatrix3(new T.Matrix3().setFromMatrix4(object.parent.matrixWorld))
		}
		if (object instanceof T.Mesh) {
			const position = object.geometry.getAttribute('position')
			for (let i = 0; i < position.count; i++)
				points.push(
					new T.Vector3()
						.fromBufferAttribute(position, i)
						.applyMatrix4(object.matrixWorld)
						.add(delta),
				)
		}
		object.children.forEach((child) => walk(child, delta))
	}
	walk(root)
	return points
}
