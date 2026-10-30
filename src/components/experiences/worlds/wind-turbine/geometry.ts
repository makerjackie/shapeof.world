import * as T from 'three'
import { FOILS, RAD, SECTIONS, SPEC } from './model'

/** Loft of reference airfoil perimeters through the actual chord/twist stations. */
export function bladeGeometry(maxSpan = Infinity): T.BufferGeometry {
  const vertices: number[] = [], indices: number[] = [], uv: number[] = [], n = 96
  const stations = SECTIONS.filter(s => s.span <= maxSpan)
  stations.forEach((section, i) => {
    const foil = FOILS[section.foil], theta = section.twist * RAD
    for (let j = 0; j < n; j++) {
      const p = foil.profile[j], tangential = (p[0] - foil.reference[0]) * section.chord, axial = p[1] * section.chord
      vertices.push(axial * Math.cos(theta) + tangential * Math.sin(theta), section.span + SPEC.hubRadius, -axial * Math.sin(theta) + tangential * Math.cos(theta))
      uv.push(j / n, section.span / 61.5)
      if (i < stations.length - 1) { const a = i * n + j, b = i * n + (j + 1) % n, c = (i + 1) * n + j, d = (i + 1) * n + (j + 1) % n; indices.push(a, c, b, b, c, d) }
    }
  })
  for (const row of [0, stations.length - 1]) {
    const center = vertices.length / 3, s = stations[row]; vertices.push(0, s.span + SPEC.hubRadius, 0); uv.push(.5, row ? 1 : 0)
    for (let j = 0; j < n; j++) { const a = row * n + j, b = row * n + (j + 1) % n; indices.push(...(row ? [center, a, b] : [center, b, a])) }
  }
  const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3)); geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry
}
export function foilGeometry(index: number, depth = .35): T.ExtrudeGeometry {
  const s = SECTIONS[index], f = FOILS[s.foil], shape = new T.Shape()
  f.profile.forEach((p, i) => { const x = (p[0] - f.reference[0]) * s.chord, y = p[1] * s.chord; if (i) shape.lineTo(x, y); else shape.moveTo(x, y) }); shape.closePath()
  return new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1 })
}
export function gearGeometry(teeth: number, module: number, depth: number, internal = false): T.ExtrudeGeometry {
  const r = teeth * module / 2, shape = new T.Shape(), tooth = new T.Path()
  for (let i = 0; i < teeth * 4; i++) {
    const a = i / (teeth * 4) * Math.PI * 2, radius = r + (i % 4 < 2 ? .7 : -.9) * module
    const x = radius * Math.cos(a), y = radius * Math.sin(a)
    if (!i) tooth.moveTo(x, y); else tooth.lineTo(x, y)
  }
  tooth.closePath()
  if (internal) { shape.absarc(0, 0, r + module * 3, 0, Math.PI * 2); shape.holes.push(tooth) }
  else {
    shape.moveTo(tooth.currentPoint.x, tooth.currentPoint.y); shape.curves = tooth.curves
    const hole = new T.Path(); hole.absarc(0, 0, Math.min(.09, r * .2), 0, Math.PI * 2, true); shape.holes.push(hole)
    if (r > .3) for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2 + .18, b = a + .87, inner = r * .3, outer = r * .72, window = new T.Path()
      window.moveTo(inner * Math.cos(a), inner * Math.sin(a)); window.lineTo(outer * Math.cos(a), outer * Math.sin(a)); window.absarc(0, 0, outer, a, b, false); window.lineTo(inner * Math.cos(b), inner * Math.sin(b)); window.absarc(0, 0, inner, b, a, true); window.closePath(); shape.holes.push(window)
    }
  }
  return new T.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: module * .12, bevelThickness: module * .15, bevelSegments: 1, curveSegments: 36 })
}
export const groundHeight = (x: number, z: number) => {
  const coast = T.MathUtils.smoothstep(z, -200, -60)
  return -4 + coast * (13 + 8 * Math.sin(x * .0045 + z * .008) + 5 * Math.cos(x * .011 - z * .006))
}
export function landscapeGeometry(): T.PlaneGeometry {
  const geometry = new T.PlaneGeometry(2100, 1600, 150, 120); geometry.rotateX(-Math.PI / 2)
  const positions = geometry.attributes.position, colors = new Float32Array(positions.count * 3), color = new T.Color()
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i), h = groundHeight(x, z)
    positions.setY(i, h)
    color.set(h < 2 ? '#727263' : h < 5 ? '#7a7762' : h > 19 ? '#5b6651' : '#455a4c'); color.multiplyScalar(.88 + .08 * Math.sin(x * .055 + z * .09) + .06 * Math.cos(x * .017 - z * .03))
    colors.set([color.r, color.g, color.b], i * 3)
  }
  geometry.setAttribute('color', new T.BufferAttribute(colors, 3)); geometry.computeVertexNormals(); return geometry
}

/** Cross-section ribs use the exact loft coordinates, expanded 0.6% to avoid z fighting. */
export function stationOutline(index: number, expand = 1.006): [number, number, number][] {
  const section = SECTIONS[index], foil = FOILS[section.foil], a = section.twist * RAD
  return [...foil.profile, foil.profile[0]].map(p => {
    const tangent = (p[0] - foil.reference[0]) * section.chord * expand, axial = p[1] * section.chord * expand
    return [axial * Math.cos(a) + tangent * Math.sin(a), section.span + SPEC.hubRadius, -axial * Math.sin(a) + tangent * Math.cos(a)]
  })
}
