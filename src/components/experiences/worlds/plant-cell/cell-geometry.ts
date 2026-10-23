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

/** Flat ivory wall cross-section, displayed at 0.4 µm (2× the 0.2 µm reference wall). */
export function cutRim(offset = -1.2) {
  const positions: number[] = [], indices: number[] = []
  const rows = 240
  for (const side of [-1, 1]) {
    const start = positions.length / 3
    for (let i = 0; i <= rows; i++) {
      const y = -34.94 + i / rows * 69.88
      const r = cellRadius(y), outer = Math.sqrt(Math.max(0, r * r - offset * offset))
      for (const x of [outer, Math.max(0, outer - 0.4)]) positions.push(side * x, y, offset)
      if (i < rows) { const a=start+i*2; indices.push(a,a+1,a+2,a+1,a+3,a+2) }
    }
  }
  const geometry = new T.BufferGeometry()
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3)); geometry.setIndex(indices); geometry.computeVertexNormals()
  return geometry
}

export function curveGeometry(curves: T.Curve<T.Vector3>[], radius: number, segments = 80) {
  const parts = curves.map((curve) => new T.TubeGeometry(curve, segments, radius, 4, false))
  const merged = mergeGeometries(parts)!
  parts.forEach((part) => part.dispose())
  return merged
}

export function cytoplasmicTracks() {
  // Twelve staggered longitudinal streams lie in the cortical layer, winding
  // around the entire wall. The turnarounds live in different angular sectors.
  const tracks = Array.from({ length: 12 }, (_, i) => {
    const points = Array.from({ length: 64 }, (_, k) => {
      const phase = k / 64 * Math.PI * 2
      const y = 28.6 * Math.sin(phase)
      const angle = i / 12 * Math.PI * 2 + phase + 0.22 * Math.sin(phase * 3 + i)
      const r = cellRadius(y) - 2.25 - (i % 3) * 0.35
      return new T.Vector3(r*Math.cos(angle),y,r*Math.sin(angle))
    })
    const curve = new T.CatmullRomCurve3(points,true); curve.arcLengthDivisions=400; return curve
  })
  // Three transvacuolar streams; alternate cargo uses the opposite direction.
  for(let i=0;i<3;i++) {
    const curve=new T.CatmullRomCurve3([
      new T.Vector3(-11,-20+i*17,-3-i),new T.Vector3(-3,-8+i*10,-1),
      new T.Vector3(4,9-i*7,-3),new T.Vector3(12,23-i*20,-4),
    ]); curve.arcLengthDivisions=200; tracks.push(curve)
  }
  return tracks
}

export function erNetwork() {
  const curves: T.Curve<T.Vector3>[] = []
  // A tubular polygon network on the inner wall, with irregular junctions.
  const rows = 19, cols = 15
  const point = (r: number, c: number) => {
    const y = -28 + r * 3.05 + Math.sin(c * 8 + r) * 0.7
    const a = c / cols * Math.PI * 2 + Math.sin(r * 4 + c) * 0.023
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
