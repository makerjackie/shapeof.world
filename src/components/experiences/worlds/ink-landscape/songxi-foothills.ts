import * as T from 'three'
import { HOUSES, riverCenter, riverHalfWidth } from './songxi-layout'
import { createPaintMaterial } from './songxi-textures'

type Point = [number, number, number]
type FoothillsApi = {
  mesh: (geometry: T.BufferGeometry, material: T.Material, position?: Point, scale?: Point) => T.Mesh
  line: (points: Point[], color?: string) => void
  pine: (x: number, y: number, z: number, size: number, lean?: number) => void
  brush: T.Texture
  paper: T.Color
}

const smooth = (a: number, b: number, value: number) => {
  const t = T.MathUtils.clamp((value - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}
const bankDistance = (x: number, z: number) => Math.abs(x - riverCenter(z)) - riverHalfWidth(z)
const originalBank = (x: number, z: number) => {
  const u = Math.max(0, bankDistance(x, z) / 950)
  return -.15 + Math.sqrt(u) * 4 + Math.sin(z * .09 + u * 5) * u * .75
}
const clearings = (x: number, z: number) => {
  let mask = 1
  for (const [hx, hz, scale] of HOUSES) {
    const distance = Math.hypot((x - hx) / (scale * 1.1), z - hz)
    mask = Math.min(mask, smooth(9.5, 20, distance))
  }
  // Preserve the inhabited street, its entry/exit, and the low river flight.
  if (z > -158 && z < 17) mask *= smooth(12, 24, Math.abs(x - 31.5))
  return mask
}
const ground = (x: number, z: number) => {
  const side = Math.sign(x - riverCenter(z)) || 1, d = bankDistance(x, z)
  const envelope = smooth(13, 36, d) * (1 - smooth(200, 250, d)) * smooth(-260, -210, z) * (1 - smooth(125, 177, z))
  const hill = (cx: number, cz: number, w: number, depth: number, h: number) =>
    h * Math.exp(-(((d - cx) / w) ** 2) - ((z - cz) / depth) ** 2)
  // Unequal, overlapping shoulders; narrow saddles break the former lawn-like dome.
  const rise = side > 0
    ? hill(91, -18, 55, 78, 9) + hill(170, -152, 60, 76, 13) + hill(110, 106, 54, 60, 8)
    : hill(69, 16, 52, 72, 9) + hill(138, -150, 64, 89, 13) + hill(106, 109, 59, 64, 8)
  const folds = 1 + .13 * Math.sin(z * .062 + d * .023) + .07 * Math.sin(d * .17 - z * .035)
  return originalBank(x, z) - .16 + rise * folds * envelope * clearings(x, z)
}
const surface = (x: number, z: number) => Math.max(originalBank(x, z), ground(x, z))
const canPlant = (x: number, z: number, radius: number) =>
  bankDistance(x, z) > radius + 8 && clearings(x, z) > .82 && z > -217 && z < 161

/** Broken ink slopes and rooted thickets connect village, rock banks and peaks. */
export function buildFoothills({ mesh, line, pine, brush, paper }: FoothillsApi) {
  const hillside = createPaintMaterial(brush, paper, .027, .80, '#555c49', .13, 'earth')
  const stone = createPaintMaterial(brush, paper, .06, 1.25, '#3b4034', .22, 'rock')
  const leaves = createPaintMaterial(brush, paper, .19, .93, '#394333', .66)
  leaves.side = T.DoubleSide
  let seed = 71612
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
  const range = (a: number, b: number) => a + (b - a) * random()
  const geometry = (positions: number[], indices: number[], material: T.Material) => {
    const g = new T.BufferGeometry()
    g.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); g.setIndex(indices); g.computeVertexNormals()
    mesh(g, material)
  }
  for (const side of [-1, 1]) {
    const positions: number[] = [], indices: number[] = [], rows = 108, columns = 62
    for (let j = 0; j <= rows; j++) {
      const z = 177 - j / rows * 437
      for (let i = 0; i <= columns; i++) {
        const d = 8 + i / columns * 242, x = riverCenter(z) + side * (riverHalfWidth(z) + d)
        positions.push(x, ground(x, z), z)
      }
    }
    for (let j = 0; j < rows; j++) for (let i = 0; i < columns; i++) {
      const a = j * (columns + 1) + i
      const faces = [a, a + 1, a + columns + 1, a + 1, a + columns + 2, a + columns + 1]
      indices.push(...(side > 0 ? faces : faces.reverse()))
    }
    geometry(positions, indices, hillside)
  }

  // Rock pieces overlap below the local ground. There are no painted field grids:
  // pale gaps between thickets remain the paths and uncultivated parts of the slope.
  const rockPiece = (x: number, z: number, width: number, height: number, depth: number, angle: number) => {
    if (!canPlant(x, z, Math.max(width, depth) * .72)) return
    const g = new T.IcosahedronGeometry(1, 1), p = g.getAttribute('position')
    for (let i = 0; i < p.count; i++) {
      const px = p.getX(i), py = p.getY(i), pz = p.getZ(i)
      const r = 1 + .13 * Math.sin(px * 8.1 + pz * 5.7) + .055 * Math.sin(py * 12 - px * 9)
      p.setXYZ(i, px * r + py * .16, py * (.82 + px * .13), pz * r)
    }
    g.computeVertexNormals()
    const m = mesh(g, stone, [x, surface(x, z) + height * .16, z], [width, height, depth])
    m.rotation.y = angle
  }
  // Hide the two shallow foreground rock rafts: viewed obliquely, their merged
  // tops looked like floating tree bases. The trees already root in real terrain.
  // Keep their seeded samples so accepted tree groups do not move.
  const rockGroups: readonly (readonly [number, number, number, number, number, boolean?])[] = [
    [-63, -150, 18, 9, 5, false], [-78, -79, 23, 12, 6], [-53, 12, 18, 10, 5],
    [-77, 83, 20, 11, 5], [-116, -28, 25, 16, 5], [-104, -177, 23, 12, 6, false],
    [85, -138, 21, 11, 5], [95, -71, 19, 13, 5], [75, 32, 21, 10, 5], [124, 109, 23, 14, 6],
  ]
  for (const [cx, cz, width, depth, count, visible = true] of rockGroups) for (let i = 0; i < count; i++) {
    const u = i / Math.max(1, count - 1), x = cx + (u - .5) * width, z = cz + Math.sin(u * 4.8 + cx) * depth * .45
    const w = range(3.5, 7.2), h = range(1.5, 4.1), d = range(2.8, 6), angle = range(-.7, .7)
    if (visible) rockPiece(x, z, w, h, d, angle)
  }

  // Narrow leaves belong only to the upright bamboo. Broad low shrub blades
  // read as detached ground decals in the return view and are deliberately absent.
  const leafPositions: number[] = [], leafIndices: number[] = []
  const leaf = (origin: Point, angle: number, length: number, width: number, rise: number) => {
    const direction = new T.Vector3(Math.cos(angle), rise, Math.sin(angle)).normalize()
    const across = new T.Vector3(-Math.sin(angle), .10, Math.cos(angle))
    const base = new T.Vector3(...origin), middle = base.clone().addScaledVector(direction, length * .53)
    const tip = base.clone().addScaledVector(direction, length), fold = middle.clone(); fold.y += width * .25
    const a = leafPositions.length / 3
    for (const v of [base, middle.clone().addScaledVector(across, width), tip, middle.clone().addScaledVector(across, -width), fold]) leafPositions.push(...v.toArray())
    leafIndices.push(a, a + 1, a + 4, a + 1, a + 2, a + 4, a + 2, a + 3, a + 4, a + 3, a, a + 4)
  }
  const reserveShrubSeed = (x: number, z: number, size: number) => {
    if (!canPlant(x, z, size * .8)) return
    // Keep the established grove positions and crown sizes exactly unchanged
    // when removing the failed decoration from their deterministic random stream.
    for (let i = 0; i < 66; i++) random()
  }
  const bamboo = (x: number, z: number, height: number) => {
    if (!canPlant(x, z, 3.5)) return
    const y = surface(x, z) - .10, lean = range(-.8, .8)
    const nodes: Point[] = Array.from({ length: 7 }, (_, i) => [x + lean * (i / 6) ** 2, y + height * i / 6, z + .28 * i / 6])
    line(nodes, '#4b5540')
    for (let i = 3; i < nodes.length; i++) {
      const angle = i * 2.35 + x, o = nodes[i]
      const twig: Point = [o[0] + Math.cos(angle) * height * .23, o[1] + height * .06, o[2] + Math.sin(angle) * height * .23]
      line([o, twig], '#535d45')
      for (let j = 0; j < 5; j++) {
        const t = (j + 1) / 5, p: Point = [o[0] + (twig[0] - o[0]) * t, o[1] + (twig[1] - o[1]) * t, o[2] + (twig[2] - o[2]) * t]
        leaf(p, angle + (j % 2 ? .7 : -.7), height * .19, height * .025, -.14)
      }
    }
  }

  // Three interlocking bands on each side: clustered crowns, lower growth at their
  // feet, and quiet openings. All placements use the same height and exclusion masks.
  const groves = [
    [-67, -147, 26, 17, 19, 12], [-89, -71, 29, 24, 22, 13], [-65, 38, 25, 22, 18, 11],
    [-96, 113, 34, 20, 16, 10], [-137, -19, 29, 29, 12, 13],
    [-107, -167, 24, 17, 14, 8], [-70, -193, 18, 12, 10, 7],
    [86, -132, 25, 21, 17, 11], [93, -35, 27, 25, 18, 12], [82, 49, 29, 19, 17, 10],
    [129, 118, 32, 20, 13, 10],
  ] as const
  for (const [cx, cz, width, depth, count, tall] of groves) {
    for (let i = 0; i < count; i++) {
      const angle = range(0, Math.PI * 2), radius = Math.sqrt(random())
      const x = cx + Math.cos(angle) * width * radius, z = cz + Math.sin(angle) * depth * radius
      const size = tall * range(.5, 1.3)
      if (!canPlant(x, z, size * .3)) continue
      pine(x, surface(x, z) + .12, z, size, range(-1.2, 1.2))
    }
    for (let i = 0; i < 12; i++) {
      const angle = range(0, Math.PI * 2), radius = range(.45, 1.1)
      reserveShrubSeed(cx + Math.cos(angle) * width * radius, cz + Math.sin(angle) * depth * radius, range(1.1, 2.8))
    }
  }
  // Retain layout seeds for the removed village-margin decoration as well.
  for (const [cx, cz] of [[72, -105], [72, -57], [51, 17], [-57, -37], [-61, -168], [-40, 42]]) {
    for (let i = 0; i < 9; i++) reserveShrubSeed(cx + range(-8, 8), cz + range(-10, 10), range(.7, 1.7))
  }
  // Short, overlapping crowns make two darker foothill patches near the reveal,
  // with an open diagonal saddle between them instead of another uniform forest.
  for (const [cx, cz, width, depth] of [[-95, -177, 18, 9], [-64, -165, 14, 10], [77, -130, 11, 8]]) {
    for (let i = 0; i < 15; i++) {
      const angle = range(0, Math.PI * 2), r = Math.sqrt(random())
      const x = cx + Math.cos(angle) * width * r, z = cz + Math.sin(angle) * depth * r
      if (canPlant(x, z, 3)) pine(x, surface(x, z) + .08, z, range(2.3, 5.1), range(-1, 1))
      if (i % 2 === 0) reserveShrubSeed(x + range(-2, 2), z + range(-2, 2), range(1.8, 2.8))
    }
  }
  for (const [cx, cz] of [[75, -66], [65, 37], [-74, -28], [-63, 95]]) {
    for (let i = 0; i < 8; i++) bamboo(cx + range(-3.2, 3.2), cz + range(-4, 4), range(4, 7.5))
  }
  geometry(leafPositions, leafIndices, leaves)
  return { materials: [hillside, stone, leaves] }
}
