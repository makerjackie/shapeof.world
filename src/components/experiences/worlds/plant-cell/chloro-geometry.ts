import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { getThylakoidDimensions, type Granum } from './chloro-model'

/** Closed, thin ribbon. Its two broad surfaces are separated by the bilayer thickness. */
function ribbonVolume(points: THREE.Vector3[], width: number, thickness: number, offset: number) {
  const positions: number[] = [], indices: number[] = []
  const tangent = new THREE.Vector3(), across = new THREE.Vector3(), z = new THREE.Vector3(0, 0, 1)
  points.forEach((p, i) => {
    tangent.subVectors(points[Math.min(i + 1, points.length - 1)], points[Math.max(0, i - 1)]).normalize()
    across.crossVectors(tangent, z).normalize().multiplyScalar(width / 2)
    for (const h of [-0.5, 0.5]) for (const side of [-1, 1]) positions.push(p.x + across.x * side, p.y + across.y * side, p.z + offset + thickness * h)
    if (i < points.length - 1) {
      const a = i * 4, b = a + 4
      indices.push(a, b, a + 1, a + 1, b, b + 1, a + 2, a + 3, b + 2, a + 3, b + 3, b + 2)
      indices.push(a, a + 2, b, a + 2, b + 2, b, a + 1, b + 1, a + 3, a + 3, b + 1, b + 3)
    }
  })
  const last = (points.length - 1) * 4
  indices.push(0, 1, 2, 1, 3, 2, last, last + 2, last + 1, last + 1, last + 2, last + 3)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

/** Connected paired membrane sheets, with right-handed granum turns and small
 * left-handed junctions. Statistical topology inspired by Bussi et al. 2019,
 * not a cryo-ET reconstruction: https://pmc.ncbi.nlm.nih.gov/articles/PMC6825288/
 */
export function buildLamellae(grana: Granum[], connections: [number, number][], light: number, mobile: boolean) {
  const { membrane, lumen, repeat } = getThylakoidDimensions(light)
  const geometries: THREE.BufferGeometry[] = []
  const addPaired = (points: THREE.Vector3[], width: number) => {
    for (const side of [-1, 1]) geometries.push(ribbonVolume(points, width, membrane, side * (lumen + membrane) / 2))
  }
  connections.forEach(([ai, bi], connection) => {
    const a = grana[ai], b = grana[bi]
    const angle = Math.atan2(b.center[1] - a.center[1], b.center[0] - a.center[0])
    const sheets: THREE.Vector3[][] = []
    const low = Math.max(a.center[2] - (a.layers - 1) * repeat * 0.38, b.center[2] - (b.layers - 1) * repeat * 0.38)
    const high = Math.min(a.center[2] + (a.layers - 1) * repeat * 0.38, b.center[2] + (b.layers - 1) * repeat * 0.38)
    for (const level of [0.25, 0.5, 0.75]) {
      const sharedHeight = THREE.MathUtils.lerp(low, high, level)
      const nearestLayer = (g: Granum) => g.center[2] + (Math.round((sharedHeight - g.center[2]) / repeat + (g.layers - 1) / 2) - (g.layers - 1) / 2) * repeat
      const az = nearestLayer(a), bz = nearestLayer(b)
      const points: THREE.Vector3[] = []
      // These arcs overlap the granum discs, so the connection never floats free.
      for (let i = 0; i <= 6; i++) {
        const t = i / 6, theta = angle - 0.7 + 0.7 * t
        points.push(new THREE.Vector3(a.center[0] + Math.cos(theta) * (a.radius - 0.012), a.center[1] + Math.sin(theta) * (a.radius - 0.012), az + t * 0.022))
      }
      const start = points[points.length - 1]
      const end = new THREE.Vector3(b.center[0] - Math.cos(angle) * (b.radius - 0.012), b.center[1] - Math.sin(angle) * (b.radius - 0.012), bz - 0.022)
      const middle = start.clone().lerp(end, 0.5)
      middle.z += Math.sin(a.phase + level) * 0.025
      const bridge = new THREE.QuadraticBezierCurve3(start, middle, end).getPoints(mobile ? 5 : 10)
      points.push(...bridge.slice(1))
      for (let i = 1; i <= 6; i++) {
        const t = i / 6, theta = angle + Math.PI + 0.7 * t
        points.push(new THREE.Vector3(b.center[0] + Math.cos(theta) * (b.radius - 0.012), b.center[1] + Math.sin(theta) * (b.radius - 0.012), bz - 0.022 + t * 0.022))
      }
      addPaired(points, 0.105 + (connection % 3) * 0.020)
      sheets.push(bridge)
    }
    if (connection % 3 === 0) {
      // A left-handed half turn joins adjacent lamellae at their actual middle.
      const low = sheets[0][Math.floor(sheets[0].length / 2)], high = sheets[1][Math.floor(sheets[1].length / 2)]
      const center = low.clone().lerp(high, 0.5)
      const points = Array.from({ length: 17 }, (_, i) => {
        const t = i / 16, theta = -Math.PI * t
        return new THREE.Vector3(center.x + Math.cos(theta) * 0.027 * Math.cos(angle) - Math.sin(theta) * 0.027 * Math.sin(angle), center.y + Math.cos(theta) * 0.027 * Math.sin(angle) + Math.sin(theta) * 0.027 * Math.cos(angle), THREE.MathUtils.lerp(low.z, high.z, t))
      })
      addPaired(points, 0.026)
    }
  })
  const merged = mergeGeometries(geometries)!
  geometries.forEach((geometry) => geometry.dispose())
  return merged
}

/** Unit radius, unit thickness, normal +Z. No per-instance Euler rotation. */
export function makeMembraneDisk(segments: number) {
  const geometry = new THREE.LatheGeometry([
    [0, -0.5], [0.97, -0.5], [0.997, -0.42], [1, 0], [0.997, 0.42], [0.97, 0.5], [0, 0.5],
  ].map(([r, h]) => new THREE.Vector2(r, h)), segments).rotateX(Math.PI / 2)
  const p = geometry.getAttribute('position')
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), a = Math.atan2(y, x)
    const ripple = 1 + .018 * Math.sin(a * 5) + .009 * Math.sin(a * 9 + .7)
    p.setXYZ(i, x * ripple, y * ripple, p.getZ(i) + .10 * Math.sin(a * 3) * Math.hypot(x, y))
  }
  geometry.computeVertexNormals()
  return geometry
}
