import * as T from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/** All cell geometry is in micrometres. The cut removes the +z half. */
export function cellRadius(y: number) {
  const cap = Math.max(0, Math.abs(y) - 23) / 12
  return 15 * Math.sqrt(Math.max(0.00001, 1 - cap * cap)) * (0.985 + 0.015 * Math.cos(y * 0.14))
}

export function cellSurface(full = false, inset = 0) {
  const positions: number[] = [], indices: number[] = [], uv: number[] = []
  const rows = 80, columns = full ? 96 : 64
  for (let j = 0; j <= rows; j++) {
    const y = -35 + j / rows * 70
    const radius = Math.max(0.02, cellRadius(y) - inset)
    for (let i = 0; i <= columns; i++) {
      const angle = i / columns * Math.PI * (full ? 2 : 1)
      const ripple = 1 + 0.008 * Math.sin(angle * 9 + y * 0.28)
      positions.push(radius * Math.cos(angle) * ripple, y, -radius * Math.sin(angle) * ripple)
      uv.push(i / columns, j / rows)
      if (j < rows && i < columns) {
        const a = j * (columns + 1) + i, b = a + columns + 1
        indices.push(a, b, a + 1, b, b + 1, a + 1)
      }
    }
  }
  const geometry = new T.BufferGeometry()
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

export function cutRim() {
  const points: T.Vector3[] = []
  for (let i = 0; i <= 100; i++) {
    const y = -35 + i * 0.7
    points.push(new T.Vector3(cellRadius(y), y, 0))
  }
  for (let i = 0; i <= 100; i++) {
    const y = 35 - i * 0.7
    points.push(new T.Vector3(-cellRadius(y), y, 0))
  }
  return new T.TubeGeometry(new T.CatmullRomCurve3(points, true), 400, 0.065, 5, true)
}

export function curveGeometry(curves: T.Curve<T.Vector3>[], radius: number, segments = 80) {
  const parts = curves.map((curve) => new T.TubeGeometry(curve, segments, radius, 4, false))
  const merged = mergeGeometries(parts)!
  parts.forEach((part) => part.dispose())
  return merged
}

export function cytoplasmicTracks() {
  return Array.from({ length: 6 }, (_, i) => {
    const points = Array.from({ length: 28 }, (_, k) => {
      const a = k / 28 * Math.PI * 2
      const y = Math.cos(a) * (28 - i * 0.6)
      const x = Math.sin(a) * (12 - i * 0.65)
      const z = i < 3 ? -Math.sqrt(Math.max(1, cellRadius(y) ** 2 - x * x)) + 1.8 + i * 0.4 : -2.2 - (i - 3) * 2 + Math.sin(a * 2 + i) * 1.1
      return new T.Vector3(x, y, z)
    })
    const curve = new T.CatmullRomCurve3(points, true)
    curve.arcLengthDivisions = 400
    return curve
  })
}

export function erNetwork() {
  const curves: T.Curve<T.Vector3>[] = []
  // A tubular polygon network on the inner wall, with irregular junctions.
  const rows = 19, cols = 15
  const point = (r: number, c: number) => {
    const y = -28 + r * 3.05 + Math.sin(c * 8 + r) * 0.7
    const a = 0.06 + c / cols * (Math.PI - 0.12) + Math.sin(r * 4 + c) * 0.023
    const radius = cellRadius(y) - 0.9
    return new T.Vector3(radius * Math.cos(a), y, -radius * Math.sin(a))
  }
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const p = point(r, c)
    for (const q of [point(r, c + 1), point(r + 1, c + (r % 2 ? 0 : 1))]) {
      const mid = p.clone().lerp(q, 0.5)
      mid.z += 0.18
      curves.push(new T.CatmullRomCurve3([p, mid, q]))
    }
  }
  return curveGeometry(curves, 0.035, 4)
}
