import * as T from 'three'
import { riverCenter, riverHalfWidth } from './songxi-layout'

type Point = [number, number, number]

export interface DownstreamBuilder {
  mesh: (geometry: T.BufferGeometry, material: T.Material, position?: Point, scale?: Point) => T.Mesh
  line: (points: Point[], color?: string) => void
  segment: (a: Point, b: Point, radius: number, material?: T.Material, tip?: number) => void
  roof: (x: number, y: number, z: number, width: number, depth: number, height: number) => void
  pavilion: (x: number, z: number, base?: number) => void
  pine: (x: number, y: number, z: number, size: number, lean?: number) => void
  boulder: (x: number, y: number, z: number, width: number, height: number, depth: number) => void
  materials: { plaster: T.Material; stone: T.Material; paving: T.Material; timber: T.Material; dark: T.Material; roofInk: T.Material }
}

/** These architectural clearances are shared with the authored-flight checks. */
export const DOWNSTREAM = {
  bridge: { x: riverCenter(-195), z: -195, halfDepth: 4.8, halfOpening: 12, underside: 10.5, pierOffsets: [-33, -17, 17, 33] },
  teahouse: { x: riverCenter(-263) + riverHalfWidth(-263) + 1, z: -263, halfWidth: 14, halfDepth: 14, roof: 17.5 },
  shrine: { x: 46, z: -417, halfWidth: 13, halfDepth: 13, roof: 25.8 },
} as const

/** Three different silhouettes replace the long stretch of empty downstream water. */
export function buildDownstream(api: DownstreamBuilder) {
  const { mesh, line, segment, roof, pine, boulder, materials: m } = api
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, material: T.Material) =>
    mesh(new T.BoxGeometry(w, h, d), material, [x, y, z])
  const grounded = (w: number, top: number, d: number, x: number, z: number, material = m.stone) =>
    box(w, top + 1.5, d, x, (top - 1.5) / 2, z, material)
  const railing = (a: Point, b: Point, height = 1.15) => {
    const n = Math.max(2, Math.ceil(Math.hypot(a[0] - b[0], a[2] - b[2]) / .7))
    segment([a[0], a[1] + height, a[2]], [b[0], b[1] + height, b[2]], .065, m.timber, .065)
    segment([a[0], a[1] + .18, a[2]], [b[0], b[1] + .18, b[2]], .05, m.timber, .05)
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t, z = a[2] + (b[2] - a[2]) * t
      segment([x, y + .18, z], [x, y + height, z], .035, m.timber, .035)
    }
  }
  const lattice = (x: number, y: number, z: number, w: number, h: number, side = false) => {
    const p = (u: number, v: number): Point => side ? [x - .045, y + v, z + u] : [x + u, y + v, z + .045]
    box(side ? .06 : w, h, side ? w : .06, x, y, z, m.dark)
    for (let i = 0; i <= 5; i++) line([p(-w / 2 + w * i / 5, -h / 2), p(-w / 2 + w * i / 5, h / 2)], '#c4b89d')
    for (let j = 0; j <= 4; j++) line([p(-w / 2, -h / 2 + h * j / 4), p(w / 2, -h / 2 + h * j / 4)], '#baaf95')
  }
  const bamboo = (x: number, y: number, z: number, height: number) => {
    for (let k = 0; k < 6; k++) {
      const angle = k * 2.4, bx = x + Math.cos(angle) * .9, bz = z + Math.sin(angle) * .9, lean = (k - 2.5) * .15
      segment([bx, y - .3, bz], [bx + lean, y + height, bz], .055, m.timber, .025)
      for (let j = 2; j < 8; j++) {
        const t = j / 8, px = bx + lean * t, py = y + height * t, spread = (1 - t) * 2.8 + .4, side = j % 2 ? 1 : -1
        line([[px, py, bz], [px + side * spread, py + .6, bz + .4]], '#747966')
        for (let leaf = 0; leaf < 4; leaf++) {
          const q = (leaf + 1) / 5, lx = px + side * spread * q, ly = py + .6 * q
          line([[lx, ly, bz + .4 * q], [lx + side * .55, ly + .7, bz + .35]], '#5a6858')
          line([[lx, ly, bz + .4 * q], [lx + side * .45, ly - .5, bz - .25]], '#5a6858')
        }
      }
    }
  }

  // A timber corridor bridge: pile footings, curved deck, open sides and three roofs.
  // Its dark underside passes overhead; the water opening stays clear, floor to ceiling.
  const bridge = DOWNSTREAM.bridge
  const deck = (dx: number) => 10.72 + 2.0 * (1 - (dx / 38) ** 2)
  for (let j = 0; j < 70; j++) {
    const dx = -37.5 + j * 75 / 69, y = deck(dx)
    box(1.1, .4, 8.3, bridge.x + dx, y, bridge.z, m.timber)
    line([[bridge.x + dx, y + .215, bridge.z - 4.1], [bridge.x + dx, y + .215, bridge.z + 4.1]], '#a4997e')
  }
  for (const dz of [-3.35, 3.35]) {
    for (let j = 0; j < 30; j++) {
      const a = -38 + j * 76 / 30, b = -38 + (j + 1) * 76 / 30
      segment([bridge.x + a, deck(a) - .12, bridge.z + dz], [bridge.x + b, deck(b) - .12, bridge.z + dz], .25, m.timber, .25)
      railing([bridge.x + a, deck(a) + .2, bridge.z + dz], [bridge.x + b, deck(b) + .2, bridge.z + dz], 1.3)
    }
    for (let j = -6; j <= 6; j++) {
      const dx = j * 5.7, y = deck(dx) + .2, central = Math.abs(dx) < 8.5
      const u = central ? dx / 9.5 : (dx - Math.sign(dx) * 23) / 14.4, v = dz / (central ? 5 : 4.95)
      const fall = Math.max(Math.abs(v), Math.max(0, (Math.abs(u) - .54) / .46)), h = central ? 3 : 2.7
      const underside = (central ? 17 : 15.5) + h * (1 - fall) ** 1.65 + fall ** 8 * h * (.18 + .12 * Math.abs(u) ** 6) - .08
      segment([bridge.x + dx, y, bridge.z + dz], [bridge.x + dx, underside, bridge.z + dz], .14, m.timber, .14)
      for (const sign of [-1, 1]) segment([bridge.x + dx, underside - 1.05, bridge.z + dz], [bridge.x + dx + sign * .8, underside - .12, bridge.z + dz], .075, m.timber, .075)
    }
    for (const dx of bridge.pierOffsets) {
      grounded(2.2, 1.15, 2.4, bridge.x + dx, bridge.z + dz)
      segment([bridge.x + dx, .8, bridge.z + dz], [bridge.x + dx, deck(dx), bridge.z + dz], .42, m.timber, .34)
      const out = Math.sign(dx)
      segment([bridge.x + dx, 6.8, bridge.z + dz], [bridge.x + dx + out * 4.5, deck(dx + out * 4.5) - .2, bridge.z + dz], .20, m.timber, .16)
    }
  }
  roof(bridge.x, 17.0, bridge.z, 9.5, 5.0, 3.0)
  for (const sign of [-1, 1]) {
    roof(bridge.x + sign * 23, 15.5, bridge.z, 14.4, 4.95, 2.7)
    // The abutments and broad, supported stairs land on the riverbanks.
    grounded(5.5, 10.8, 9.2, bridge.x + sign * 37, bridge.z)
    for (let j = 0; j < 14; j++) grounded(1.0, 10.6 - j * .7, 8.1, bridge.x + sign * (40 + j * .9), bridge.z)
    boulder(bridge.x + sign * 37, 1.0, bridge.z + 7, 6, 4, 5)
    pine(bridge.x + sign * 45, 2.2, bridge.z - 7, 12, -sign)
  }

  // A two-storey riverside tea house wraps a small open courtyard. The gallery is
  // actual open architecture, so its columns, railings and windows read in parallax.
  const tea = DOWNSTREAM.teahouse, tx = tea.x, tz = tea.z
  grounded(26, 3.1, 27, tx, tz)
  box(26.4, .28, 27.4, tx, 3.23, tz, m.paving)
  box(11, 4.0, 14, tx + 3, 5.4, tz - 2, m.plaster)
  box(11, 4.15, 14, tx + 3, 9.7, tz - 2, m.plaster)
  box(11.35, .3, 14.35, tx + 3, 7.5, tz - 2, m.timber)
  roof(tx + 3, 11.8, tz - 2, 6.4, 8.3, 3.7)
  // River-facing balcony and lower verandah have independent eaves.
  for (const y of [3.45, 7.52]) {
    box(5.4, .3, 15.8, tx - 5.0, y, tz - 2, m.timber)
    for (const dz of [-9, -4.5, 0, 4.5, 5]) segment([tx - 7.2, 3.4, tz + dz], [tx - 7.2, 11.7, tz + dz], .13, m.timber, .12)
    railing([tx - 7.35, y + .2, tz - 9.8], [tx - 7.35, y + .2, tz + 5.8])
  }
  roof(tx - 4.9, 7.05, tz - 2, 3.4, 8.7, 1.1)
  roof(tx - 4.9, 11.45, tz - 2, 3.4, 8.7, 1.3)
  for (const dz of [-6, -1, 4]) for (const y of [5.7, 10.0]) lattice(tx - 2.55, y, tz + dz, 2.7, 2.1, true)
  for (const dx of [0, 5.5]) for (const y of [5.7, 10.0]) lattice(tx + dx, y, tz + 5.06, 2.3, 2.1)
  // Low side wing, a garden wall with a genuine open doorway, and stone planters.
  box(11, 3.8, 5.4, tx + 2.5, 5.4, tz + 10.2, m.plaster)
  roof(tx + 2.5, 7.3, tz + 10.2, 6.4, 3.5, 1.9)
  for (const dx of [-3.5, 3.5]) box(4.0, 2.3, .55, tx - 5 + dx, 4.55, tz + 11.9, m.plaster)
  box(3, .45, .7, tx - 5, 5.7, tz + 11.9, m.stone)
  for (const dz of [-8, 7.5]) { box(2.6, .7, 2.6, tx + 10.3, 3.85, tz + dz, m.stone); bamboo(tx + 10.3, 4.1, tz + dz, 7.5) }
  boulder(tx - 9.1, 4.15, tz + 7.8, 1.7, 1.2, 2.4)
  pine(tx + 10.4, 3.6, tz + 2.6, 8, -1)
  for (let j = 0; j < 7; j++) grounded(1.0, 3.0 - j * .33, 4.0, tx - 13.1 - j * .75, tz + 8.5)
  // Small timber landing remains tied to piles in the bed, not suspended on water.
  box(7.5, .24, 5.3, tx - 17.1, .85, tz + 8.5, m.timber)
  for (const dx of [-20, -14]) for (const dz of [6.5, 10.5]) segment([tx + dx, -1.5, tz + dz], [tx + dx, 1.7, tz + dz], .13, m.timber, .1)
  for (let j = 0; j < 12; j++) line([[tx - 20.7 + j * .63, .99, tz + 6], [tx - 20.7 + j * .63, .99, tz + 11]], '#a2967c')

  // A temple on a rock terrace gives the final approach a new double-eave silhouette.
  // Solid terraces reach below ground; stairs climb from the lower riverside path.
  const shrine = DOWNSTREAM.shrine, sx = shrine.x, sz = shrine.z
  boulder(sx + 9, 3, sz - 3, 12, 8, 12)
  boulder(sx - 8, 2, sz - 8, 8, 6, 9)
  grounded(25, 8.0, 23, sx, sz)
  grounded(21, 10.0, 19, sx, sz)
  box(22.2, .4, 20.2, sx, 10.2, sz, m.paving)
  box(13, 6.1, 11, sx, 13.45, sz - 1, m.plaster)
  // Open porch toward the incoming camera, with exposed column-to-beam joints.
  for (const dx of [-7.8, -3.9, 0, 3.9, 7.8]) {
    segment([sx + dx, 10.4, sz + 6.7], [sx + dx, 17.7, sz + 6.7], .18, m.timber, .17)
    segment([sx + dx, 16.3, sz + 6.7], [sx + dx + (dx < 0 ? .8 : -.8), 17.5, sz + 6.7], .10, m.timber, .09)
  }
  segment([sx - 8, 17.5, sz + 6.7], [sx + 8, 17.5, sz + 6.7], .19, m.timber, .19)
  roof(sx, 17.3, sz, 10.3, 8.5, 3.2)
  box(10.1, 2.6, 7.8, sx, 20.1, sz - 1, m.plaster)
  roof(sx, 21.4, sz - 1, 7.4, 6.5, 3.7)
  for (const dx of [-4.3, 4.3]) lattice(sx + dx, 13.55, sz + 4.57, 2.5, 3.1)
  box(2.5, 4.4, .08, sx, 12.6, sz + 4.58, m.dark)
  for (const dx of [-3, 0, 3]) lattice(sx + dx, 20.1, sz + 2.96, 1.7, 1.4)
  for (const side of [-1, 1]) railing([sx + side * 10.6, 10.4, sz - 9.5], [sx + side * 10.6, 10.4, sz + 9.5], 1.0)
  for (let j = 0; j < 15; j++) {
    const top = 9.9 - j * .6, z = sz + 10.2 + j * .72
    grounded(4.5, top, .9, sx + 6.5, z)
    if (j % 3 === 0) for (const side of [-1, 1]) segment([sx + 6.5 + side * 2.1, top, z], [sx + 6.5 + side * 2.1, top + 1, z], .07, m.stone, .07)
  }
  pine(sx + 13, 4.0, sz + 6, 18, 1)
  pine(sx + 7, 4.0, sz - 14, 13, 1)
  bamboo(sx + 9, 10.4, sz - 7, 7)
  // Outboard east-bank pines frame the temple approach beyond the final camera.
  for (const [z, size] of [[-414, 13], [-431, 16]]) {
    const x = riverCenter(z) + riverHalfWidth(z) + 5.5
    boulder(x, 1, z, 4.2, 3, 5.4)
    pine(x + 1.5, 2, z, size, 1)
  }
}
