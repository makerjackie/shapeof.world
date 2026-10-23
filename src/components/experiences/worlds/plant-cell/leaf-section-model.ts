import * as T from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { LEAF_ENTRY, seededLeafRandom } from './leaf-model'

export const SECTION_BOUNDS = { min: [-407, -440, -60], max: [407, 60, 20] } as const
export type TissueCell = { center: T.Vector3; radii: T.Vector3; phase: number; kind: 'palisade' | 'sponge' | 'epidermis' | 'sheath' | 'phloem' }
export const LOWER_PORES = [[-140, -440, -26], [155, -440, -42]] as const

/** One 70 µm palisade layer, then 20–40 µm spongy cells and connected air spaces. */
export function createSectionCells(mobile = false): TissueCell[] {
  const rand = seededLeafRandom(7281), cells: TissueCell[] = []
  const add = (kind: TissueCell['kind'], x: number, y: number, z: number, rx: number, ry: number, rz: number, phase = rand() * Math.PI * 2) => cells.push({ kind, center: new T.Vector3(x, y, z), radii: new T.Vector3(rx, ry, rz), phase })
  const depths = mobile ? 1 : 2
  for (let depth = 0; depth < depths; depth++) for (let col = -12; col <= 12; col++) {
    const hero = depth === 0 && col === 0
    add('palisade', col * 31.5, 0, -depth * 31.5, hero ? 15 : 13.7 + rand() * 1.2, 35, hero ? 15 : 13.7 + rand() * 1.2, hero ? 0 : rand() * 6.28)
  }
  // A thin cut specimen keeps the main row readable. A sparse second row adds
  // depth without filling every air space with another cell's chloroplasts.
  for (let depth = 0; depth < (mobile ? 1 : 2); depth++) for (let row = 0; row < 10; row++) for (let col = -9; col <= 9; col++) {
    if (depth > 0 && rand() > .2) continue
    const x = col * 42 + (row % 2 ? 21 : 0) + (rand() - .5) * 12
    const y = -65 - row * 37 + (rand() - .5) * 10
    const z = -2 - depth * 33 + (rand() - .5) * 8
    if (Math.abs(x) > 386 || Math.hypot((x - 260) / 1.18, y + 205) < 72) continue
    if (LOWER_PORES.some(([px, , pz]) => ((x - px) / 23) ** 2 + ((y + 405) / 25) ** 2 + ((z - pz) / 22) ** 2 < 1)) continue
    add('sponge', x, y, z, 13.2 + rand() * 6.3, 12 + rand() * 7, 13.2 + rand() * 5.8)
  }
  for (let depth = 0; depth < 2; depth++) for (let col = -11; col <= 11; col++) {
    const x = col * 35 + (depth % 2 ? 3 : 0), z = -depth * 32
    add('epidermis', x, 47.5, z, 17.4, 12.5, 16, rand() * 6.28)
    add('epidermis', x, -427.5, z, 17.4, 12.5, 16, rand() * 6.28)
  }
  for (let i = 0; i < 20; i++) {
    const a = i / 20 * Math.PI * 2
    add('sheath', 260 + Math.cos(a) * 66, -205 + Math.sin(a) * 56, -18, 12 + rand() * 2, 13 + rand() * 2, 34, a)
  }
  for (let depth = 0; depth < 2; depth++) for (let i = 0; i < 27; i++) {
    const a = i * 2.399963, r = Math.sqrt((i + .5) / 27)
    add('phloem', 260 + Math.cos(a) * 43 * r, -226 + Math.sin(a) * 18 * r, -depth * 27, 4.6 + rand() * 1.8, 4.3 + rand() * 1.8, 12.3, rand() * 6.28)
  }
  return cells
}

/** Analytic organic shapes shared by cell surfaces and attached chloroplasts. */
export function sectionPoint(cell: TissueCell, point: T.Vector3, target = new T.Vector3()) {
  const { kind, radii: r, phase: p } = cell
  const x = point.x, y = point.y, z = point.z
  if (kind === 'palisade') {
    // An exact 30 × 70 capsule is retained at the hero anchor.
    const ripple = p === 0 ? 1 : 1 + .025 * Math.sin(y * 4 + p) * Math.sin(Math.atan2(z, x) * 3 + p)
    target.set(x * r.x * ripple, y * r.y, z * r.z * ripple)
  } else {
    const theta = Math.atan2(z, x)
    const lobes = kind === 'sponge' ? .16 * Math.sin(theta * 3 + p) * (1 - y * y) + .08 * Math.sin(y * 4 + p) : .025 * Math.sin(theta * 3 + p)
    // The divisor keeps the longest body dimension <= 40 µm including lobes.
    const dilation = kind === 'sponge' ? (1 + lobes) / 1.24 : 1 + lobes
    target.set(x * r.x * dilation, y * r.y * (kind === 'sponge' ? .93 + .07 * Math.sin(theta * 2 + p) : 1), z * r.z * dilation)
  }
  return target.add(cell.center)
}

export function createTissueGeometry(cells: TissueCell[]) {
  const sphere = new T.SphereGeometry(1, 14, 10)
  const capsule = new T.CapsuleGeometry(1, 8 / 3, 5, 18)
  const cp = capsule.getAttribute('position') as T.BufferAttribute
  for (let i = 0; i < cp.count; i++) cp.setY(i, cp.getY(i) / (7 / 3))
  const positions: number[] = [], colors: number[] = [], indices: number[] = [], point = new T.Vector3()
  for (const cell of cells) {
    const source = cell.kind === 'palisade' ? capsule : sphere
    const attr = source.getAttribute('position'), offset = positions.length / 3
    const tone = cell.kind === 'epidermis' ? new T.Color('#c0c3aa') : cell.kind === 'sheath' ? new T.Color('#a9b292') : cell.kind === 'phloem' ? new T.Color('#aaa394') : new T.Color('#839477')
    tone.multiplyScalar(.93 + .12 * Math.sin(cell.phase * 2))
    for (let i = 0; i < attr.count; i++) {
      sectionPoint(cell, point.fromBufferAttribute(attr, i), point)
      positions.push(point.x, point.y, point.z); colors.push(tone.r, tone.g, tone.b)
    }
    for (const index of source.index!.array) indices.push(offset + index)
  }
  sphere.dispose(); capsule.dispose()
  const geometry = new T.BufferGeometry()
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices); geometry.computeVertexNormals()
  return geometry
}

export function createSectionChloroplasts(cells: TissueCell[], mobile = false) {
  const rand = seededLeafRandom(1298), matrices: T.Matrix4[] = [], colors: T.Color[] = []
  const object = new T.Object3D(), point = new T.Vector3(), normal = new T.Vector3(), axis = new T.Vector3(0, 0, 1)
  for (const cell of cells) {
    if (cell.kind !== 'palisade' && cell.kind !== 'sponge') continue
    const behind = cell.center.z < -20
    const count = cell.kind === 'palisade' ? (behind ? 10 : mobile ? 18 : 26) : (behind ? 2 : mobile ? 4 : 6)
    for (let i = 0; i < count; i++) {
      const a = i * 2.399963 + cell.phase, y = ((i + .5) / count * 2 - 1) * .88
      const radius = cell.kind === 'palisade' ? Math.sqrt(Math.max(.05, 1 - Math.max(0, Math.abs(y) * (7 / 3) - 4 / 3) ** 2)) : Math.sqrt(1 - y * y)
      point.set(Math.cos(a) * radius * .91, y, Math.sin(a) * radius * .91)
      sectionPoint(cell, point, object.position)
      normal.set(Math.cos(a), y * .3, Math.sin(a)).normalize()
      object.quaternion.setFromUnitVectors(axis, normal)
      object.scale.set(2.3 + rand() * .4, 1.4 + rand() * .25, .65 + rand() * .15)
      object.updateMatrix(); matrices.push(object.matrix.clone())
      colors.push(new T.Color().setHSL(.25 + rand() * .025, .25 + rand() * .08, .20 + rand() * .06))
    }
  }
  return { matrices, colors }
}

export function createXylemGeometry() {
  const walls: T.BufferGeometry[] = [], spirals: T.BufferGeometry[] = []
  for (let i = 0; i < 8; i++) {
    const x = 260 + (i % 4 - 1.5) * 20, y = -188 + Math.floor(i / 4) * 20, radius = 7.3 + (i % 3) * .6
    const profile = [new T.Vector2(radius - 1.25, -34), new T.Vector2(radius, -34), new T.Vector2(radius, 34), new T.Vector2(radius - 1.25, 34), new T.Vector2(radius - 1.25, -34)]
    const tube = new T.LatheGeometry(profile, 20)
    tube.rotateX(Math.PI / 2); tube.translate(x, y, -18); walls.push(tube)
    const points = Array.from({length: 145}, (_, j) => {
      const a = j / 144 * Math.PI * 2 * 4
      return new T.Vector3(x + Math.cos(a) * (radius - 1.5), y + Math.sin(a) * (radius - 1.5), -52 + j / 144 * 68)
    })
    spirals.push(new T.TubeGeometry(new T.CatmullRomCurve3(points), 144, .43, 5, false))
  }
  const wall = mergeGeometries(walls), spiral = mergeGeometries(spirals)
  walls.forEach((part) => part.dispose()); spirals.forEach((part) => part.dispose())
  return { wall, spiral }
}

export const SECTION_STOMATA = [{ x: LEAF_ENTRY[0], z: LEAF_ENTRY[2], angle: 0 }]
