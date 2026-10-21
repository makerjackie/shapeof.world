import * as T from 'three'

export type VillagePoint = [number, number, number]
export type VillageHouse = readonly [x: number, z: number, scale: number]
export interface VillageApi {
  mesh: (geometry: T.BufferGeometry, material: T.Material, position?: VillagePoint, scale?: VillagePoint) => T.Mesh
  line: (points: VillagePoint[], color?: string) => void
  segment: (a: VillagePoint, b: VillagePoint, radius: number, material?: T.Material, tip?: number) => void
  roof: (x: number, y: number, z: number, halfWidth: number, halfDepth: number, height: number) => void
  materials: { plaster: T.Material; stone: T.Material; timber: T.Material; dark: T.Material; roofInk: T.Material }
}

/** Every building fits the shared house footprint. Only tile eaves overhang it. */
export function buildVillage(api: VillageApi, houses: readonly VillageHouse[]) {
  const { plaster, stone, timber, dark, roofInk } = api.materials

  houses.forEach(([x, z, s], index) => {
    const p = (u: number, y: number, v: number): VillagePoint => [x + u * s, 2.2 + y * s, z + v * s]
    const box = (w: number, h: number, d: number, u: number, y: number, v: number, material: T.Material = plaster) =>
      api.mesh(new T.BoxGeometry(w * s, h * s, d * s), material, p(u, y, v))
    const stroke = (points: VillagePoint[], color = '#81765f') => api.line(points.map(([u, y, v]) => p(u, y, v)), color)
    const beam = (a: VillagePoint, b: VillagePoint, radius = .06, material: T.Material = timber) =>
      api.segment(p(...a), p(...b), radius * s, material, radius * s)
    const hipRoof = (u: number, y: number, v: number, w: number, d: number, h: number) =>
      api.roof(x + u * s, 2.2 + y * s, z + v * s, w * s, d * s, h * s)
    const floor = (w: number, d: number) => {
      // Grounded masonry, including the back: there are no floating porch slabs.
      api.mesh(new T.BoxGeometry(w * s, 3, d * s), stone, [x, .7, z])
      box(w, .18, d, 0, .09, 0, stone)
      for (let j = 0; j < 3; j++) {
        const y = 2.2 - j * .75
        api.line([[x - w * s / 2, y, z + d * s / 2 + .01], [x + w * s / 2, y, z + d * s / 2 + .01]], '#938672')
      }
    }
    const posts = (w: number, d: number, height: number) => {
      for (const u of [-w, w]) for (const v of [-d, d]) beam([u, .15, v], [u, height, v], .095)
    }

    /** Lattice is drawn on both street-facing sides, not just the entrance. */
    const window = (u: number, y: number, v: number, w: number, h: number, axis: 'x' | 'z' = 'z') => {
      box(axis === 'z' ? w : .04, h, axis === 'z' ? .04 : w, u, y, v, dark)
      const face = (a: number, b: number): VillagePoint => axis === 'z'
        ? [u + a, y + b, v + Math.sign(v) * .03]
        : [u + Math.sign(u) * .03, y + b, v + a]
      for (let j = 0; j <= 4; j++) stroke([face(-w / 2 + j * w / 4, -h / 2), face(-w / 2 + j * w / 4, h / 2)], '#c1b397')
      for (let j = 0; j <= 3; j++) stroke([face(-w / 2, -h / 2 + j * h / 3), face(w / 2, -h / 2 + j * h / 3)], '#b4a589')
      for (const yy of [-h / 2, h / 2]) {
        const q = face(0, yy)
        box(axis === 'z' ? w + .14 : .12, .10, axis === 'z' ? .12 : w + .14, ...q, timber)
      }
    }
    const door = (u: number, v: number, w = 1.25, h = 2.7) => {
      box(w, h, .06, u, h / 2 + .16, v, dark)
      box(w + .32, .16, .22, u, h + .25, v, timber)
      for (const side of [-1, 1]) box(.13, h + .2, .17, u + side * (w / 2 + .05), h / 2 + .10, v, timber)
      stroke([[u, .18, v + Math.sign(v) * .05], [u, h + .1, v + Math.sign(v) * .05]], '#9d8e72')
      for (const side of [-1, 1]) {
        const ring = new T.TorusGeometry(.065 * s, .016 * s, 4, 12)
        api.mesh(ring, stone, p(u + side * .13, h * .47, v + Math.sign(v) * .065))
      }
    }
    const steps = (u: number, v: number, width = 1.8) => {
      const sign = Math.sign(v)
      for (let j = 0; j < 3; j++) box(width, .19, .32, u, -.08 - j * .17, v + sign * j * .25, stone)
    }

    // Unlike the pavilion hip roof, a village gable keeps its full ridge length.
    // The plaster gable ends below are solids, so side passes cannot see a hole.
    const gableRoof = (y: number, w: number, d: number, rise: number, straw = false) => {
      const rows = 16, cols = 20, positions: number[] = [], indices: number[] = []
      const at = (u: number, v: number): VillagePoint => [u * w, y + rise * (1 - Math.abs(v)) ** 1.25 + Math.abs(v) ** 7 * .14, v * d]
      for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) positions.push(...p(...at(i / cols * 2 - 1, j / rows * 2 - 1)))
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const a = j * (cols + 1) + i
        indices.push(a, a + cols + 1, a + 1, a + 1, a + cols + 1, a + cols + 2)
      }
      const g = new T.BufferGeometry()
      g.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); g.setIndex(indices); g.computeVertexNormals()
      api.mesh(g, roofInk)
      const count = straw ? 48 : 24
      for (let i = 0; i <= count; i++) {
        const u = i / count * 2 - 1
        const points = Array.from({ length: 17 }, (_, j): VillagePoint => {
          const q = at(u, j / 8 - 1)
          q[1] += .025 + (straw ? Math.sin(i * 7.3) * .035 : 0)
          q[0] += straw ? Math.sin(j * 1.7 + i) * .017 : 0
          return q
        })
        stroke(points, straw ? '#a89978' : '#a69b84')
      }
      if (!straw) for (let j = 0; j <= rows; j += 2) stroke(Array.from({ length: 17 }, (_, i) => {
        const q = at(i / 8 - 1, j / 8 - 1); q[1] += .03; return q
      }), '#746c5c')
      for (const side of [-1, 1]) {
        stroke(Array.from({ length: 17 }, (_, i) => at(i / 8 - 1, side)), '#3e4137')
        beam([-w, y + .05, side * d], [w, y + .05, side * d], straw ? .09 : .06)
      }
      beam([-w, y + rise + .06, 0], [w, y + rise + .06, 0], straw ? .13 : .07, straw ? timber : roofInk)
    }
    const gableEnd = (u: number, y: number, d: number, rise: number) => {
      const shape = new T.Shape()
      shape.moveTo(-d, 0)
      for (let j = 0; j <= 16; j++) {
        const t = j / 8 - 1
        shape.lineTo(t * d, rise * (1 - Math.abs(t)) ** 1.25 + .16)
      }
      shape.lineTo(d, 0); shape.closePath()
      const m = api.mesh(new T.ExtrudeGeometry(shape, { depth: .18, bevelEnabled: false }), plaster, p(u - .09, y, 0), [s, s, s])
      m.rotation.y = Math.PI / 2
      beam([u, y + .12, -d], [u, y + .12, d], .06)
    }
    const rails = (u: number, y: number, v: number, length: number, axis: 'x' | 'z') => {
      const a: VillagePoint = axis === 'x' ? [u - length / 2, y, v] : [u, y, v - length / 2]
      const b: VillagePoint = axis === 'x' ? [u + length / 2, y, v] : [u, y, v + length / 2]
      beam([a[0], y + .85, a[2]], [b[0], y + .85, b[2]], .065)
      beam([a[0], y + .2, a[2]], [b[0], y + .2, b[2]], .035)
      const n = Math.ceil(length / .5)
      for (let j = 0; j <= n; j++) {
        const uu = a[0] + (b[0] - a[0]) * j / n, vv = a[2] + (b[2] - a[2]) * j / n
        beam([uu, y, vv], [uu, y + .88, vv], j % 3 ? .025 : .05)
      }
    }
    const roundWindow = (u: number, y: number, v: number, r: number, side: 'x' | 'z') => {
      const disc = api.mesh(new T.CylinderGeometry(r * s, r * s, .055 * s, 24), dark, p(u, y, v))
      if (side === 'x') disc.rotation.z = Math.PI / 2
      else disc.rotation.x = Math.PI / 2
      const face = (a: number, b: number): VillagePoint => side === 'x' ? [u + Math.sign(u) * .04, y + b, v + a] : [u + a, y + b, v + Math.sign(v) * .04]
      stroke(Array.from({ length: 33 }, (_, j) => face(Math.cos(j / 32 * Math.PI * 2) * r, Math.sin(j / 32 * Math.PI * 2) * r)), '#c4b699')
      for (let j = -2; j <= 2; j++) {
        const v0 = j * r / 3, edge = Math.sqrt(r * r - v0 * v0)
        stroke([face(v0, -edge), face(v0, edge)], '#b9a88a')
        stroke([face(-edge, v0), face(edge, v0)], '#b9a88a')
      }
    }

    // Mix neighbours rather than repeating six models in the same order per row.
    const kind = (index + Math.floor(index / 6) * 3) % 6
    if (kind === 0) {
      // A low, broad white cottage with full-length tiled gables and a side shed.
      floor(7.8, 6.2)
      box(7.5, 3.55, 5.6, 0, 1.95, 0)
      gableRoof(3.73, 4.05, 3.10, 2.10)
      for (const side of [-1, 1]) gableEnd(side * 3.75, 3.73, 2.80, 1.88)
      for (const side of [-1, 1]) {
        window(-2.1, 2.05, side * 2.8, 1.15, 1.35)
        window(1.35, 2.05, side * 2.8, 1.4, 1.35)
        door(-.4, side * 2.8, 1.13, 2.5)
        window(side * 3.76, 1.9, -.25, 1.65, 1.45, 'x')
        stroke([[side * 3.76, .55, -2.62], [side * 3.76, .55, 2.62]], '#9d927a')
      }
      posts(3.7, 2.73, 3.75)
    } else if (kind === 1) {
      // A tea house: the upper room is set back from a real, supported gallery.
      floor(7.8, 6.4)
      box(7.2, 3.45, 5.8, 0, 1.9, 0)
      box(5.3, 3.25, 4.0, 0, 5.5, -.25)
      box(7.7, .22, 6.15, 0, 3.75, 0, timber)
      box(7.3, .15, 5.85, 0, 7.20, 0, timber)
      hipRoof(0, 7.22, 0, 4.45, 3.65, 2.80)
      posts(3.6, 2.9, 7.61)
      for (const side of [-1, 1]) {
        rails(side * 3.65, 3.85, 0, 5.8, 'z')
        rails(0, 3.85, side * 2.93, 7.2, 'x')
        window(side * 2.68, 5.65, -.25, 2.9, 2.1, 'x')
        for (const u of [-1.7, 1.7]) window(u, 5.6, side > 0 ? 1.79 : -2.29, 1.1, 2.0)
        window(side * 3.62, 2.0, .55, 2.5, 1.55, 'x')
        for (const u of [-2.25, 2.25]) window(u, 2.0, side * 2.93, 1.45, 1.55)
        door(0, side * 2.94, 1.45, 2.8)
        // Brackets meet the wall and the gallery edge; none end in empty air.
        for (const v of [-2.45, 0, 2.45]) beam([side * 2.6, 2.95, v], [side * 3.66, 3.70, v], .065)
      }
      for (const v of [-2.86, 2.86]) beam([-3.6, 7.51, v], [3.6, 7.51, v], .13)
      for (const u of [-3.6, 3.6]) beam([u, 7.51, -2.86], [u, 7.51, 2.86], .13)
    } else if (kind === 2) {
      // Stepped firewalls rise above a recessed roof, giving an unmistakable
      // silhouette instead of another hip roof at a different scale.
      floor(7.8, 6.3)
      box(7.1, 4.35, 5.8, 0, 2.35, 0)
      gableRoof(4.52, 3.70, 2.91, 2.35)
      for (const side of [-1, 1]) {
        const wall = new T.Shape()
        wall.moveTo(-3.15, 0); wall.lineTo(3.15, 0)
        wall.lineTo(3.15, 5.08); wall.lineTo(2.30, 5.08)
        wall.lineTo(2.30, 5.85); wall.lineTo(1.20, 5.85)
        wall.lineTo(1.20, 6.65); wall.lineTo(.37, 6.65)
        wall.lineTo(.37, 7.05); wall.lineTo(-.37, 7.05)
        wall.lineTo(-.37, 6.65); wall.lineTo(-1.20, 6.65)
        wall.lineTo(-1.20, 5.85); wall.lineTo(-2.30, 5.85)
        wall.lineTo(-2.30, 5.08); wall.lineTo(-3.15, 5.08); wall.closePath()
        const m = api.mesh(new T.ExtrudeGeometry(wall, { depth: .26, bevelEnabled: false }), plaster, p(side * 3.63 - .13, .15, 0), [s, s, s])
        m.rotation.y = Math.PI / 2
        const steps: VillagePoint[] = [[side * 3.63, 5.23, -3.15], [side * 3.63, 5.23, -2.30], [side * 3.63, 6, -2.30], [side * 3.63, 6, -1.2], [side * 3.63, 6.8, -1.2], [side * 3.63, 6.8, -.37], [side * 3.63, 7.2, -.37], [side * 3.63, 7.2, .37], [side * 3.63, 6.8, .37], [side * 3.63, 6.8, 1.2], [side * 3.63, 6, 1.2], [side * 3.63, 6, 2.3], [side * 3.63, 5.23, 2.3], [side * 3.63, 5.23, 3.15]]
        for (let j = 1; j < steps.length; j++) beam(steps[j - 1], steps[j], .07, roofInk)
        roundWindow(side * 3.78, 3.4, 0, .67, 'x')
        window(-2.1, 2.3, side * 2.94, 1.1, 1.5)
        window(2.1, 2.3, side * 2.94, 1.1, 1.5)
        door(0, side * 2.95, 1.5, 3.0)
        hipRoof(0, 3.50, side * 2.95, 1.13, .25, .45)
      }
    } else if (kind === 3) {
      // Open carpentry / weaving shop: a dark, empty front bay, stacked timber,
      // shutters and a workbench below a low lean-to overhang.
      floor(7.8, 6.4)
      box(7.3, 3.75, .26, 0, 2.03, -2.95)
      for (const side of [-1, 1]) box(.24, 3.75, 5.9, side * 3.53, 2.03, 0)
      hipRoof(0, 3.91, -.2, 4.25, 3.55, 2.05)
      posts(3.5, 2.9, 3.98)
      beam([-3.5, 3.7, 2.9], [3.5, 3.7, 2.9], .16)
      for (const u of [-1.65, 1.65]) beam([u, .15, 2.9], [u, 3.9, 2.9], .095)
      // Side shutters leave a broad real opening in the centre.
      for (const side of [-1, 1]) {
        box(1.37, 2.7, .12, side * 2.58, 1.95, 2.80, timber)
        for (let j = 0; j < 6; j++) stroke([[side * 2.58 - .58 + j * .23, .7, 2.89], [side * 2.58 - .58 + j * .23, 3.2, 2.89]], '#b2a081')
        window(side * 3.67, 2.0, -.5, 2.2, 1.5, 'x')
      }
      box(3.0, .18, .94, 0, 1.26, 1.62, timber)
      for (const u of [-1.3, 1.3]) for (const v of [1.28, 1.94]) beam([u, .17, v], [u, 1.22, v], .065)
      for (let j = 0; j < 5; j++) {
        const m = api.mesh(new T.CylinderGeometry(.12 * s, .12 * s, 3.5 * s, 7), timber, p(-2.4, .4 + j * .23, -.4))
        m.rotation.x = Math.PI / 2
      }
      for (const u of [-.65, .2, 1.0]) {
        const basket = api.mesh(new T.CylinderGeometry(.25 * s, .18 * s, .36 * s, 9), stone, p(u, 1.54, 1.62))
        basket.rotation.z = u * .05
      }
      for (const u of [-1.65, 1.65]) window(u, 2.0, -3.11, 1.3, 1.35)
    } else if (kind === 4) {
      // A compact walled court with a real moon-gate opening and a rear hall.
      floor(7.8, 6.5)
      box(6.7, 3.6, 2.5, 0, 1.98, -1.82)
      hipRoof(0, 3.83, -1.82, 3.95, 1.48, 2.0)
      for (const side of [-1, 1]) {
        box(.25, 2.3, 3.55, side * 3.55, 1.33, 1.07)
        box(.38, .14, 3.63, side * 3.55, 2.54, 1.07, roofInk)
        window(side * 3.39, 2, -1.8, 1.0, 1.4, 'x')
        window(side * 1.9, 2.0, -3.10, 1.2, 1.25)
        roundWindow(side * 3.7, 1.43, 1.0, .54, 'x')
      }
      const shape = new T.Shape()
      shape.moveTo(-3.68, .15); shape.lineTo(-3.68, 2.77); shape.lineTo(3.68, 2.77); shape.lineTo(3.68, .15)
      // The opening reaches the courtyard floor. Its arch sides are circular,
      // but its threshold is genuinely traversable rather than a painted disc.
      const r = 1.08, cy = 1.27
      shape.lineTo(.66, .15)
      shape.lineTo(.66, cy - Math.sqrt(r * r - .66 * .66))
      const a0 = Math.acos(-.66 / r), a1 = Math.acos(.66 / r)
      for (let j = 0; j <= 40; j++) {
        const a = -a1 + (Math.PI * 2 - a0 + a1) * j / 40
        shape.lineTo(Math.cos(a) * r, cy + Math.sin(a) * r)
      }
      shape.lineTo(-.66, .15); shape.closePath()
      api.mesh(new T.ExtrudeGeometry(shape, { depth: .26, bevelEnabled: false }), plaster, p(0, 0, 2.90), [s, s, s])
      box(7.65, .17, .48, 0, 2.84, 3.03, roofInk)
      door(0, -.53, 1.1, 2.7)
      // A small supported stone table and stools give the empty court scale.
      api.mesh(new T.CylinderGeometry(.63 * s, .63 * s, .16 * s, 14), stone, p(1.75, .96, .85))
      api.mesh(new T.CylinderGeometry(.21 * s, .31 * s, .73 * s, 10), stone, p(1.75, .52, .85))
      for (const v of [-.05, 1.73]) api.mesh(new T.CylinderGeometry(.24 * s, .3 * s, .42 * s, 10), stone, p(1.75, .38, v))
      for (let j = 0; j < 5; j++) box(.7, .045, .53, 0, .22, -.12 + j * .61, stone)
    } else {
      // Fisherman's hut: a steep reed roof, timber frame and woven reed walls.
      // The straw is drawn as irregular fibres on solid double-sided roof mesh.
      floor(7.6, 6.2)
      box(6.5, 2.55, 5.4, 0, 1.46, 0)
      gableRoof(2.85, 3.95, 3.08, 2.8, true)
      for (const side of [-1, 1]) {
        gableEnd(side * 3.29, 2.85, 2.70, 2.31)
        for (let j = 0; j < 13; j++) stroke([[side * 3.31, .23, -2.55 + j * .38], [side * 3.31, 2.7, -2.55 + j * .38]], '#a28c6d')
        for (const yy of [.5, 1.2, 1.9, 2.6]) stroke([[side * 3.32, yy, -2.6], [side * 3.32, yy, 2.25]], '#736449')
        roundWindow(side * 3.34, 1.70, -.35, .47, 'x')
        door(-.8, side * 2.71, .93, 2.25)
        window(1.55, 1.6, side * 2.71, 1.2, .95)
      }
      posts(3.28, 2.7, 2.85)
      // Nets are hung between real posts, within the existing plot boundary.
      for (const u of [-2.7, 2.5]) beam([u, .2, 3.04], [u, 2.4, 3.04], .055)
      beam([-2.7, 2.38, 3.04], [2.5, 2.38, 3.04], .03)
      for (let j = 0; j <= 10; j++) {
        const u = -2.55 + j * .49, sag = .18 * (1 - (u / 2.6) ** 2)
        stroke([[u, 2.32 - sag, 3.05], [u + .17, .85 - sag, 3.08]], '#8c7d62')
      }
      for (let j = 0; j < 5; j++) stroke(Array.from({ length: 11 }, (_, k): VillagePoint => [-2.55 + k * .49, 2.28 - j * .3 - .18 * Math.sin(k / 10 * Math.PI), 3.07]), '#99886b')
      for (const u of [2.1, 2.85]) api.mesh(new T.CylinderGeometry(.26 * s, .32 * s, .50 * s, 9), timber, p(u, .4, 1.7))
    }
    if (kind !== 4) steps(0, 2.55)
  })
}
