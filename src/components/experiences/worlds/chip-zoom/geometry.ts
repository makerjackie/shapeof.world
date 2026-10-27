import { BufferGeometry, Float32BufferAttribute, ShapeUtils, Vector2 } from 'three'

/** A single batch per mask. GDS XY becomes X/-Z; Y is a display extrusion.
 * Top and sides only: bottom faces are hidden by the substrate/underlying mask.
 */
export function maskGeometry(polygons: number[][], center: [number, number], scale: number, thickness: number) {
  const positions: number[] = [], uvs: number[] = []
  // UVs in GDS micrometres (one texture tile per 4 μm) carry the aluminium grain.
  const vertex = (p: Vector2, y: number) => { positions.push((p.x - center[0]) * scale, y, -(p.y - center[1]) * scale); uvs.push(p.x / 4, p.y / 4) }
  for (const coordinates of polygons) {
    const points: Vector2[] = []
    for (let i = 0; i < coordinates.length; i += 2) points.push(new Vector2(coordinates[i] / 1000, coordinates[i + 1] / 1000))
    if (ShapeUtils.isClockWise(points)) points.reverse()
    for (const [a, b, c] of ShapeUtils.triangulateShape(points, [])) {
      vertex(points[a], thickness); vertex(points[b], thickness); vertex(points[c], thickness)
    }
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length]
      vertex(a, 0); vertex(b, 0); vertex(b, thickness)
      vertex(a, 0); vertex(b, thickness); vertex(a, thickness)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}
