import * as T from 'three'

/** Truncated involute-style teeth, for legible motion rather than manufacturable tooth contact. */
export function gearGeometry(teeth: number, module: number, thickness: number, windows = true): T.ExtrudeGeometry {
  const r = teeth * module / 2, root = Math.max(module, r - module * 1.12), tip = r + module * .82
  const base = r * Math.cos(Math.PI / 9)
  const inv = (radius: number) => { const a = Math.acos(Math.min(1, base / radius)); return Math.tan(a) - a }
  const pitchInv = inv(r), half = Math.PI / (2 * teeth)
  const shape = new T.Shape()
  const point = (radius: number, angle: number, first = false) => {
    const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius
    if (first) shape.moveTo(x, y); else shape.lineTo(x, y)
  }
  for (let i = 0; i < teeth; i++) {
    const a = i * Math.PI * 2 / teeth
    point(root, a - Math.PI / teeth, i === 0)
    point(root, a - half - pitchInv)
    for (let j = 0; j <= 4; j++) {
      const rr = Math.max(root, base) + (tip - Math.max(root, base)) * j / 4
      point(rr, a - half - pitchInv + inv(rr))
    }
    for (let j = 4; j >= 0; j--) {
      const rr = Math.max(root, base) + (tip - Math.max(root, base)) * j / 4
      point(rr, a + half + pitchInv - inv(rr))
    }
    point(root, a + half + pitchInv)
    point(root, a + Math.PI / teeth)
  }
  shape.closePath()
  const center = new T.Path(); center.absarc(0, 0, Math.min(.2, r * .18), 0, Math.PI * 2, true); shape.holes.push(center)
  if (windows && r > 1.3) {
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * 2 * i / 5 + .09, b = a + Math.PI * 2 / 5 - .22
      const hole = new T.Path(), inner = r * .3, outer = root * .77
      hole.moveTo(Math.cos(a) * inner, Math.sin(a) * inner)
      hole.lineTo(Math.cos(a) * outer, Math.sin(a) * outer)
      hole.absarc(0, 0, outer, a, b, false)
      hole.lineTo(Math.cos(b) * inner, Math.sin(b) * inner)
      hole.absarc(0, 0, inner, b, a, true)
      hole.closePath(); shape.holes.push(hole)
    }
  }
  return new T.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: Math.min(.035, module * .18), bevelThickness: .025, curveSegments: 36 })
}

export function escapeGeometry(): T.ExtrudeGeometry {
  const shape = new T.Shape(), teeth = 15, r = 1.34
  for (let i = 0; i < teeth; i++) {
    const a = i / teeth * Math.PI * 2
    const coords = [[r * .82, a - .21], [r * .9, a - .04], [r * 1.14, a], [r * 1.14, a + .055], [r * .82, a + .14]]
    coords.forEach(([radius, angle], j) => {
      const x = radius * Math.cos(angle), y = radius * Math.sin(angle)
      if (!i && !j) shape.moveTo(x, y); else shape.lineTo(x, y)
    })
  }
  shape.closePath()
  const hub = new T.Path(); hub.absarc(0, 0, .16, 0, Math.PI * 2, true); shape.holes.push(hub)
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3, hole = new T.Path()
    hole.moveTo(Math.cos(a + .2) * .4, Math.sin(a + .2) * .4)
    hole.absarc(0, 0, .95, a + .2, a + 1.7, false)
    hole.lineTo(Math.cos(a + 1.7) * .4, Math.sin(a + 1.7) * .4)
    hole.absarc(0, 0, .4, a + 1.7, a + .2, true); shape.holes.push(hole)
  }
  return new T.ExtrudeGeometry(shape, { depth: .2, bevelEnabled: true, bevelSize: .025, bevelThickness: .02, bevelSegments: 1, curveSegments: 24 })
}

export function bridgeGeometry(points: [number, number][], holes: [number, number, number][] = []): T.ExtrudeGeometry {
  const shape = new T.Shape()
  points.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y)); shape.closePath()
  for (const [x, y, r] of holes) { const hole = new T.Path(); hole.absarc(x, y, r, 0, Math.PI * 2, true); shape.holes.push(hole) }
  return new T.ExtrudeGeometry(shape, { depth: .44, bevelEnabled: true, bevelSize: .12, bevelThickness: .08, bevelSegments: 2, curveSegments: 32 })
}

export function spiralGeometry(inner: number, outer: number, turns: number, width: number, angle: number, samples = 320): T.BufferGeometry {
  const positions = new Float32Array((samples + 1) * 2 * 3), normals = new Float32Array(positions.length), indices: number[] = []
  for (let i = 0; i <= samples; i++) {
    const t = i / samples, radius = inner + (outer - inner) * t
    const a = turns * Math.PI * 2 * t + angle * (1 - t)
    for (let side = 0; side < 2; side++) {
      const rr = radius + (side ? 1 : -1) * width / 2, n = (i * 2 + side) * 3
      positions[n] = Math.cos(a) * rr; positions[n + 1] = Math.sin(a) * rr; positions[n + 2] = 0
      normals[n + 2] = 1
    }
    if (i < samples) { const j = i * 2; indices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2) }
  }
  const geometry = new T.BufferGeometry()
  geometry.setAttribute('position', new T.BufferAttribute(positions, 3)); geometry.setAttribute('normal', new T.BufferAttribute(normals, 3)); geometry.setIndex(indices)
  return geometry
}

export function updateSpiral(geometry: T.BufferGeometry, inner: number, outer: number, turns: number, width: number, angle: number) {
  const position = geometry.attributes.position as T.BufferAttribute, samples = position.count / 2 - 1
  for (let i = 0; i <= samples; i++) {
    const t = i / samples, radius = inner + (outer - inner) * t, a = turns * Math.PI * 2 * t + angle * (1 - t)
    for (let side = 0; side < 2; side++) { const rr = radius + (side ? 1 : -1) * width / 2; position.setXY(i * 2 + side, Math.cos(a) * rr, Math.sin(a) * rr) }
  }
  position.needsUpdate = true
}

/** Winding compacts the ribbon toward the arbor; a legibility mapping, not an elastic-rod solution. */
export function updateMainspring(geometry: T.BufferGeometry, reserve: number) {
  const position = geometry.attributes.position as T.BufferAttribute, samples = position.count / 2 - 1
  for (let i = 0; i <= samples; i++) {
    const t = i / samples, r = .38 + 3.67 * Math.pow(t, .7 + reserve * 1.5), a = 7 * TAU_VALUE * t
    for (let side = 0; side < 2; side++) { const rr = r + (side ? 1 : -1) * .045; position.setXY(i * 2 + side, Math.cos(a) * rr, Math.sin(a) * rr) }
  }
  position.needsUpdate = true
}
const TAU_VALUE = Math.PI * 2

/** Original open-work plate; clearance pockets avoid every train and balance pivot. */
export const PLATE_POCKETS = [[5.1, -5.7, 2.9], [8.2, 3.1, 2.15], [-7, -4.8, 2], [-.1, -9.6, .9]] as const
export function mainplateGeometry() {
  const shape = new T.Shape(); shape.absarc(0, 0, 12.9, 0, Math.PI * 2, false)
  for (const [x, y, r] of PLATE_POCKETS) { const hole = new T.Path(); hole.absarc(x, y, r, 0, Math.PI * 2, true); shape.holes.push(hole) }
  const geometry = new T.ExtrudeGeometry(shape, {depth:.65, bevelEnabled:true, bevelSize:.11, bevelThickness:.08, bevelSegments:3, curveSegments:96})
  geometry.translate(0, 0, -.775)
  const uv = geometry.attributes.uv
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + 13) / 26, (uv.getY(i) + 13) / 26)
  return geometry
}
