import * as T from 'three'
import type { Vec3 } from '../sim/types'

/** Swept strips remain in world space, including longitudinal grade and banking. */
export function strip(points: Vec3[], width: number, offset = 0, lift = 0, bank = 0) {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = []
  let distance = 0
  for (let i = 0; i < points.length; i++) {
    const p = points[i], a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)]
    const length = Math.hypot(b.x - a.x, b.z - a.z) || 1
    const nx = -(b.z - a.z) / length, nz = (b.x - a.x) / length
    if (i) distance += Math.hypot(p.x - a.x, p.y - a.y, p.z - a.z)
    for (const side of [-1, 1]) {
      const w = offset + side * width / 2
      positions.push(p.x + nx * w, p.y + lift + bank * w, p.z + nz * w)
      uvs.push((side + 1) / 2, distance / 8)
    }
    if (i) { const k = i * 2; indices.push(k - 2, k, k - 1, k - 1, k, k + 1) }
  }
  const g = new T.BufferGeometry()
  g.setAttribute('position', new T.Float32BufferAttribute(positions, 3))
  g.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2))
  g.setIndex(indices); g.computeVertexNormals()
  return g
}

export function wall(points: Vec3[], offset: number, bottom: number, top: number, bank = 0) {
  const g = strip(points, 0, offset, 0, bank)
  const p = g.getAttribute('position')
  for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + (i % 2 ? top : bottom))
  g.computeVertexNormals()
  return g
}

export function mergeGeometry(geometries: T.BufferGeometry[]) {
  const positions: number[] = [], normals: number[] = [], uvs: number[] = []
  for (const geometry of geometries) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry
    positions.push(...g.getAttribute('position').array)
    normals.push(...g.getAttribute('normal').array)
    const uv = g.getAttribute('uv'); if (uv) uvs.push(...uv.array)
    if (g !== geometry) g.dispose()
    geometry.dispose()
  }
  const g = new T.BufferGeometry()
  g.setAttribute('position', new T.Float32BufferAttribute(positions, 3))
  g.setAttribute('normal', new T.Float32BufferAttribute(normals, 3))
  if (uvs.length) g.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2))
  g.computeBoundingSphere()
  return g
}

export function samplePath(points: Vec3[], spacing: number): { position: Vec3; tangent: Vec3 }[] {
  const samples: { position: Vec3; tangent: Vec3 }[] = []
  let next = spacing / 2, distance = 0
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i]
    const length = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)
    if (length < 1e-6) continue
    while (next <= distance + length) {
      const t = (next - distance) / length
      samples.push({ position: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t }, tangent: { x: (b.x - a.x) / length, y: (b.y - a.y) / length, z: (b.z - a.z) / length } })
      next += spacing
    }
    distance += length
  }
  return samples
}

export type Instance = { position: [number, number, number]; scale: [number, number, number]; rotation?: number; color?: T.ColorRepresentation }

export function fillInstances(mesh: T.InstancedMesh, instances: Instance[]) {
  const o = new T.Object3D(), c = new T.Color()
  instances.forEach((v, i) => {
    o.position.fromArray(v.position); o.scale.fromArray(v.scale); o.rotation.set(0, v.rotation ?? 0, 0); o.updateMatrix()
    mesh.setMatrixAt(i, o.matrix)
    if (v.color) mesh.setColorAt(i, c.set(v.color))
  })
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  mesh.computeBoundingSphere()
}
