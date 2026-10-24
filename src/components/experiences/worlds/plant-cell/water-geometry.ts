import * as T from 'three'
import { cellRadius, curveGeometry } from './cell-geometry'
import type { WaterReadings } from './water-model'

/** Schematic folds, applied identically to wall and membrane in air. */
export function cellFold(y: number, wrinkles: number, concavity = 0) {
  return 1 - .10 * wrinkles * (.5 + .5 * Math.sin(y * .75)) - concavity * Math.sin(y * .13 + .7) ** 2
}
export function updateCellFolds(geometry: T.BufferGeometry, wrinkles: number, concavity = 0) {
  const attr = geometry.getAttribute('position') as T.BufferAttribute
  geometry.userData.restPositions ??= new Float32Array(attr.array)
  const rest = geometry.userData.restPositions as Float32Array
  for (let i = 0; i < attr.count; i++) {
    const y = rest[i * 3 + 1], fold = cellFold(y, wrinkles, concavity)
    attr.setXYZ(i, rest[i * 3] * fold, y, rest[i * 3 + 2] * fold)
  }
  attr.needsUpdate = true; geometry.computeVertexNormals(); geometry.computeBoundingSphere()
}
export function createHechtianStrands(water: WaterReadings) {
  const curves: T.Curve<T.Vector3>[] = []
  for (let i = 0; i < 40; i++) {
    const y = -29 + (i % 8) * 8.2, a = Math.floor(i / 8) * Math.PI * 2 / 5 + .17 * Math.sin(i * 2.1)
    const radius = cellRadius(y) - .22, fold = cellFold(y, water.wrinkles, water.concavity)
    const wall = new T.Vector3(Math.cos(a) * radius * water.wallRadial, y * water.wallAxial, Math.sin(a) * radius * water.wallRadial)
    const inner = new T.Vector3(Math.cos(a) * radius * water.radial * fold, y * water.axial, Math.sin(a) * radius * water.radial * fold)
    const middle = inner.clone().lerp(wall, .5); middle.y -= .3 * water.immersion
    curves.push(new T.CatmullRomCurve3([inner, middle, wall]))
  }
  // 0.10 µm displayed diameter, upper end of the reported 50–100 nm range.
  return curveGeometry(curves, .05, 8)
}
