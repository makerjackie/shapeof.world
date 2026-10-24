import * as T from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { LEAF_ENTRY, LEAF_MIDRIB_X, leafHalfWidth, leafSurfaceY, seededLeafRandom } from './leaf-model'

export const EPIDERMIS_RADIUS = 1700
export type Stoma = { x: number; z: number; angle: number }

function join(geometries: T.BufferGeometry[]) {
  const merged = mergeGeometries(geometries, false) ?? new T.BufferGeometry()
  geometries.forEach((geometry) => geometry.dispose())
  return merged
}

/** Elliptic, tapering ridge with its underside embedded in the blade. */
function veinTube(points: T.Vector3[], radius: number, segments = 30) {
  const curve = new T.CatmullRomCurve3(points)
  const positions: number[] = [], indices: number[] = []
  const tangent = new T.Vector3(), across = new T.Vector3(), up = new T.Vector3(0, 1, 0)
  const sides = 6
  for (let j = 0; j <= segments; j++) {
    const t = j / segments, point = curve.getPoint(t)
    curve.getTangent(t, tangent); across.crossVectors(tangent, up).normalize()
    const r = radius * (.2 + .8 * (1 - t) ** .65)
    point.y = leafSurfaceY(point.x, point.z) - r * .8
    for (let k = 0; k <= sides; k++) {
      const angle = k / sides * Math.PI * 2
      positions.push(point.x + across.x * Math.sin(angle) * r, point.y + Math.cos(angle) * r, point.z + across.z * Math.sin(angle) * r)
      if (j < segments && k < sides) {
        const a = j * (sides + 1) + k, b = a + sides + 1
        indices.push(a, b, a + 1, b, b + 1, a + 1)
      }
    }
  }
  const geometry = new T.BufferGeometry()
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices); geometry.computeVertexNormals()
  return geometry
}

export function createLeafVeins() {
  const main: T.BufferGeometry[] = [], secondary: T.BufferGeometry[] = [], fine: T.BufferGeometry[] = []
  const mainPoints = Array.from({ length: 32 }, (_, i) => {
    const z = 60000 - i / 31 * 119000
    return new T.Vector3(LEAF_MIDRIB_X + 500 * Math.sin(z / 27000), 0, z)
  })
  main.push(veinTube(mainPoints, 380, 190))
  for (const side of [-1, 1]) {
    const ends: T.Vector3[] = []
    for (let row = 0; row < 10; row++) {
      const t = .14 + row * .071, rootZ = -(t - .5) * 120000
      const span = leafHalfWidth(t + .065) * .82
      const endZ = rootZ - span * .8
      const start = new T.Vector3(LEAF_MIDRIB_X + 500 * Math.sin(rootZ / 27000), 0, rootZ)
      const end = new T.Vector3(LEAF_MIDRIB_X + side * Math.min(span, leafHalfWidth(.5 - endZ / 120000) * .88), 0, endZ)
      const controls = [start, new T.Vector3(start.x + side * span * .4, 0, rootZ - span * .25), new T.Vector3(end.x * .82 + LEAF_MIDRIB_X * .18, 0, endZ + span * .25), end]
      const curve = new T.CatmullRomCurve3(controls)
      secondary.push(veinTube(controls, 125 * (1 - row * .055), 42))
      if (ends.length) {
        const previous = ends[ends.length - 1]
        secondary.push(veinTube([previous, previous.clone().lerp(end, .45).add(new T.Vector3(side * 850, 0, 0)), end], 64, 24))
      }
      ends.push(end)
      // Branches bend toward the tip and rejoin the next secondary, creating loops.
      if (row < 9) for (let j = 1; j <= 6; j++) {
        const a = curve.getPoint(j / 8), reach = 4200 * (1 - j / 13)
        const b = a.clone().add(new T.Vector3(side * reach * .4, 0, -reach))
        fine.push(veinTube([a, a.clone().lerp(b, .5).add(new T.Vector3(side * 450, 0, 0)), b], 18 + (7 - j) * 4, 12))
      }
    }
  }
  // Curved anastomosing minor veins, with tapering free endings in the areoles.
  for (let row = -12; row <= 12; row++) for (let column = -11; column <= 11; column++) {
    const cx = column * (Math.sqrt(3) * 380) + (Math.abs(row % 2)) * (Math.sqrt(3) * 190), cz = row * 570
    if (Math.hypot(cx, cz) > 7800) continue
    const vertex = (k: number) => {
      const a = Math.PI / 6 + k / 6 * Math.PI * 2
      const x = cx + 380 * Math.cos(a), z = cz + 380 * Math.sin(a)
      return new T.Vector3(x + 80 * Math.sin(z / 720), 0, z + 65 * Math.sin(x / 630))
    }
    const curves: T.CatmullRomCurve3[] = []
    for (let k = 0; k < 3; k++) {
      const a=vertex(k), b=vertex(k+1), across=new T.Vector3(b.z-a.z,0,a.x-b.x).normalize()
      const bend=40+25*Math.sin(cx*.008+cz*.005+k)
      const c1=a.clone().lerp(b,.32).addScaledVector(across,bend)
      const c2=a.clone().lerp(b,.72).addScaledVector(across,bend*.65)
      const radius=5.5+1.8*Math.sin(row*.63+column*.37+k)
      curves.push(new T.CatmullRomCurve3([a,c1,c2,b]))
      fine.push(veinTube([a,c1,c2,b],radius,14))
    }
    if ((row+column)%2===0) {
      const start=curves[1].getPoint(.45)
      const tip=new T.Vector3(cx+60*Math.sin(row*2.7),0,cz+50*Math.cos(column*2.1))
      const mid=start.clone().lerp(tip,.55).add(new T.Vector3(45*Math.sin(row+column),0,-40))
      fine.push(veinTube([start,mid,tip],3.4,12))
      if((row-column)%3===0) fine.push(veinTube([mid,mid.clone().lerp(tip,.5).add(new T.Vector3(45,0,45)),tip.clone().add(new T.Vector3(90,0,55))],1.8,10))
    }
  }
  return { main: join(main), secondary: join(secondary), fine: join(fine) }
}

function hash(x: number, y: number) { const t = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return t - Math.floor(t) }
const CELL_X = 44, CELL_Z = 52
function corner(x: number, z: number) {
  return new T.Vector2(LEAF_ENTRY[0] + x * CELL_X + (hash(x, z) - .5) * 24 + 8 * Math.sin(z * 1.7), LEAF_ENTRY[2] + z * CELL_Z + (hash(x + 19, z + 3) - .5) * 24 + 8 * Math.sin(x * 1.3))
}
/** Both adjacent cells sample the same edge, including its lobes. */
function edge(from: T.Vector2, to: T.Vector2, seed: number) {
  const points: T.Vector2[] = [], delta = to.clone().sub(from), across = new T.Vector2(-delta.y, delta.x).normalize()
  for (let i = 0; i <= 8; i++) {
    const t = i / 8, wave = (Math.sin(t * Math.PI * (2 + seed) + seed * 6.28) - Math.sin(seed * 6.28)) * Math.sin(t * Math.PI) * (3 + seed * 2)
    points.push(from.clone().lerp(to, t).addScaledVector(across, wave))
  }
  return points
}
function boundary(ix: number, iz: number) {
  const a = corner(ix, iz), b = corner(ix + 1, iz), c = corner(ix + 1, iz + 1), d = corner(ix, iz + 1)
  const top = edge(a, b, hash(ix, iz)), right = edge(b, c, hash(ix + 9, iz))
  const bottom = edge(d, c, hash(ix, iz + 1)).reverse(), left = edge(a, d, hash(ix + 8, iz)).reverse()
  return [...top.slice(0, -1), ...right.slice(0, -1), ...bottom.slice(0, -1), ...left.slice(0, -1)]
}

export function createEpidermis(mobile: boolean) {
  const radius = mobile ? 1350 : EPIDERMIS_RADIUS
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const stomata: Stoma[] = [{ x: LEAF_ENTRY[0], z: LEAF_ENTRY[2], angle: 0 }]
  const countX = Math.ceil(radius / CELL_X), countZ = Math.ceil(radius / CELL_Z)
  for (let iz = -countZ; iz < countZ; iz++) for (let ix = -countX; ix < countX; ix++) {
    const cx = LEAF_ENTRY[0] + (ix + .5) * CELL_X, cz = LEAF_ENTRY[2] + (iz + .5) * CELL_Z
    if (Math.hypot(cx - LEAF_ENTRY[0], cz - LEAF_ENTRY[2]) > radius) continue
    if ((ix % 4 + 4) % 4 === 1 && (iz % 3 + 3) % 3 === 1) stomata.push({ x: cx, z: cz, angle: (hash(ix, iz) - .5) * 1.3 })
  }
  const bins = new Map<string, Stoma[]>()
  for (const stoma of stomata) {
    const key = `${Math.floor(stoma.x / 64)},${Math.floor(stoma.z / 64)}`
    bins.set(key, [...(bins.get(key) ?? []), stoma])
  }
  const nearStoma = (x: number, z: number) => {
    const bx = Math.floor(x / 64), bz = Math.floor(z / 64)
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const hit = bins.get(`${bx + dx},${bz + dz}`)?.find((s) => Math.abs(s.x - x) < 18 && Math.abs(s.z - z) < 23)
      if (hit) return hit
    }
    return undefined
  }
  const isPore = (x: number, z: number) => {
    const stoma = nearStoma(x, z)
    if (!stoma) return false
    const dx = x - stoma.x, dz = z - stoma.z, c = Math.cos(stoma.angle), s = Math.sin(stoma.angle)
    return ((dx * c - dz * s) / 11) ** 2 + ((dx * s + dz * c) / 16) ** 2 < 1
  }
  const rings = mobile ? 2 : 3
  for (let iz = -countZ; iz < countZ; iz++) for (let ix = -countX; ix < countX; ix++) {
    const outline = boundary(ix, iz), center = outline.reduce((a, p) => a.add(p), new T.Vector2()).multiplyScalar(1 / outline.length)
    if (Math.hypot(center.x - LEAF_ENTRY[0], center.y - LEAF_ENTRY[2]) > radius) continue
    const offset = positions.length / 3, size = outline.length, dome = 2.0 + hash(ix + 11, iz) * 2.4
    for (let ring = 0; ring <= rings; ring++) {
      const r = ring / rings
      for (let k = 0; k < size; k++) {
        const p = center.clone().lerp(outline[k], r)
        const h = dome * (1 - r * r) ** .8
        positions.push(p.x, leafSurfaceY(p.x, p.y) + h + .25, p.y)
        const tone = .78 + hash(ix + 7, iz - 2) * .22
        colors.push(tone, tone, tone)
        if (ring < rings) {
          const a = offset + ring * size + k, b = offset + ring * size + (k + 1) % size, c = a + size, d = b + size
          indices.push(a, b, c, b, d, c)
        }
      }
    }
  }
  const kept: number[] = []
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i], b = indices[i + 1], c = indices[i + 2]
    const x = (positions[a * 3] + positions[b * 3] + positions[c * 3]) / 3
    const z = (positions[a * 3 + 2] + positions[b * 3 + 2] + positions[c * 3 + 2]) / 3
    if (!isPore(x, z)) kept.push(a, b, c)
  }
  const geometry = new T.BufferGeometry()
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3))
  geometry.setIndex(kept); geometry.computeVertexNormals()
  return { geometry, stomata, radius }
}

/** A bent solid, tapered at both ends: geometry is mirrored for the second guard. */
export function createGuardGeometry() {
  const positions: number[] = [], indices: number[] = []
  const rows = 20, sides = 10
  for (let row = 0; row <= rows; row++) {
    const t = row / rows, z = (t - .5) * 25
    const radius = .5 + 2.7 * Math.sin(t * Math.PI) ** .6
    const bend = 2.2 + 3.5 * Math.sin(t * Math.PI)
    for (let k = 0; k <= sides; k++) {
      const angle = k / sides * Math.PI * 2
      positions.push(bend + Math.sin(angle) * radius, Math.cos(angle) * radius * .88 + 3.3, z)
      if (row < rows && k < sides) {
        const a = row * (sides + 1) + k, b = a + sides + 1
        indices.push(a, a + 1, b, a + 1, b + 1, b)
      }
    }
  }
  const geometry = new T.BufferGeometry()
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals()
  return geometry
}

export function guardCellMatrices(stomata: Stoma[], open: number) {
  const guards: T.Matrix4[] = [], chloroplasts: T.Matrix4[] = [], dummy = new T.Object3D(), rand = seededLeafRandom(9113)
  for (const stoma of stomata) for (const side of [-1, 1]) {
    const c = Math.cos(stoma.angle), s = Math.sin(stoma.angle), shift = side * -2.5
    dummy.position.set(stoma.x + c * shift, leafSurfaceY(stoma.x, stoma.z), stoma.z - s * shift)
    dummy.rotation.set(0, stoma.angle, 0); dummy.scale.set(side, 1, 1); dummy.updateMatrix()
    guards.push(dummy.matrix.clone())
    const transform = dummy.matrix.clone()
    for (let i = 0; i < 7; i++) {
      const t = .14 + i / 6 * .72, center = new T.Vector3(2.2 + (3.5 + open * 4) * Math.sin(t * Math.PI) + (rand() - .5) * 1.2, 4.2 + rand() * 1.0, (t - .5) * 25).applyMatrix4(transform)
      dummy.position.copy(center); dummy.rotation.set(0, stoma.angle + rand(), 0); dummy.scale.set(.72, .45, 1.0); dummy.updateMatrix(); chloroplasts.push(dummy.matrix.clone())
    }
  }
  return { guards, chloroplasts }
}
