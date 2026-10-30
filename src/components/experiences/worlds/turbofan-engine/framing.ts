import * as T from 'three'
import type { EngineView, PartId } from './content'
import { CORE_PROFILE, NACELLE_PROFILE } from './geometry'

/** Fit the displayed silhouette, including separated assemblies; no cycle parameters change. */
export function engineFrame(view: EngineView, explode: number, selected: PartId | null, stage: number, aspect: number, fov = 38) {
  const e = Math.max(0, Math.min(1, explode)), points: T.Vector3[] = []
  const ring = (x: number, r: number, y = 0, z = 0) => {
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; points.push(new T.Vector3(x, y + Math.cos(a) * r, z + Math.sin(a) * r)) }
  }
  const focus = view === 'front' ? null : selected
  if (!focus) {
    for (const [x, r] of NACELLE_PROFILE) ring(x, r, e * 2.4, -e * .6)
    for (const [x, r] of CORE_PROFILE) ring(x, r, -e * 1.7)
    ring(-4.65 - e * 2, 2.1); ring(-3.45 - e * 2, 2.1); ring(4.9 + e * 2.2, .7)
  } else if (focus === 'fan') {
    ring(-5.13 - e * 2, .45); ring(-4.24 - e * 2, 2.1); ring(-3.45 - e * 2, 2.1)
  } else if (focus === 'compressor') {
    const x = -3.04 + Math.max(0, Math.min(8, stage)) * .285 - e * .7
    ring(x - .25, .94, 0, e * .35); ring(x + .25, .94, 0, e * .35)
  } else if (focus === 'combustor') {
    ring(-.45 + e * .4, .84, e * .45, e * .35); ring(1.2 + e * .4, .84, e * .45, e * .35)
  } else if (focus === 'turbine') {
    ring(1.15 + e * 1.2, .95); ring(3.6 + e * 1.2, .95)
  } else { ring(3.3 + e * 2.2, .7); ring(4.95 + e * 2.2, .7) }
  const target = new T.Box3().setFromPoints(points).getCenter(new T.Vector3())
  const direction = view === 'front' ? new T.Vector3(-1, .001, .001).normalize() : new T.Vector3(-.38, .28, .72).normalize()
  const right = new T.Vector3().crossVectors(new T.Vector3(0, 1, 0), direction).normalize(), up = new T.Vector3().crossVectors(direction, right).normalize()
  const tangent = Math.tan(T.MathUtils.degToRad(fov / 2)) * .86
  let distance = focus === 'compressor' ? 3.3 : 2.8
  for (const point of points) {
    const p = point.clone().sub(target), depth = p.dot(direction)
    distance = Math.max(distance, depth + Math.abs(p.dot(right)) / (tangent * Math.max(.2, aspect)), depth + Math.abs(p.dot(up)) / tangent)
  }
  return { position: target.clone().addScaledVector(direction, distance), target, points, direction, right, up, distance }
}
