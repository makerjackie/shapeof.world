import { BufferGeometry, Float32BufferAttribute } from 'three'

export type Mountain = readonly [
  x: number, z: number, width: number, height: number, depth: number, seed: number,
  form?: 'spire' | 'ridge' | 'shoulder' | 'crag', yaw?: number,
]

type Form = NonNullable<Mountain[6]>
const clamp = (n: number) => Math.max(0, Math.min(1, n))
const smooth = (a: number, b: number, n: number) => {
  const q = clamp((n - a) / (b - a))
  return q * q * (3 - 2 * q)
}
const signedPower = (n: number, exponent: number) => Math.sign(n) * Math.abs(n) ** exponent

const crestHeight = (u: number, seed: number, form: Form) => {
  if (form === 'spire') return 1
  const direction = Math.cos(seed * .37) > 0 ? 1 : -1
  const along = u * direction, summit = .19 + .12 * Math.sin(seed * .47)
  const reach = along < summit ? 1.01 : .70
  const crown = Math.exp(-(Math.abs((along - summit) / reach) ** (form === 'crag' ? 3.2 : 2.1)))
  const arm = Math.exp(-(((along + .68) / .35) ** 2))
  // A broad offset crown continues into a lower arm. Alternating the lean
  // prevents every mountain from repeating the same slanted silhouette.
  const height = form === 'crag' ? .43 + .55 * crown + .09 * arm : .24 + .69 * crown + .08 * arm
  const capBreak = .017 * Math.sin(u * 13 + seed) + .011 * Math.sin(u * 23 + seed * .61)
  return Math.min(1, height + capBreak * (form === 'shoulder' ? .25 : 1))
}

const section = (q: number, form: Form) => {
  const rise = smooth(0, 1, q)
  if (form === 'crag') return [1 - .32 * rise, (1 - .33 * q) * (1 - smooth(.80, 1, q))]
  if (form === 'ridge') return [1 - .63 * q ** 1.06, (1 - q) ** .81]
  if (form === 'shoulder') return [1 - .72 * rise, (1 - q) ** 1.07]
  const taper = (1 - q) ** .84
  return [taper, taper]
}

/** Closed rock surface, also used to attach brushwork and test flight clearance. */
export function mountainSurface(m: Mountain, t: number, a: number): [number, number, number] {
  const [x, z, w, h, d, seed, form = 'spire', yaw = 0] = m
  const q = clamp(t), u = Math.cos(a), v = Math.sin(a)
  const rise = smooth(0, 1, q), wall = Math.sin(q * Math.PI) ** .55
  const crag = form === 'crag', shoulder = form === 'shoulder'
  const bend = .12 * Math.sin(q * 3.7 + seed * .13) * wall
  const azimuth = a + bend
  let grooves = 0
  // A few deep, bent fissures make readable ribs on each face. Their depth
  // fades at the shared crest so its two sides still meet exactly.
  for (let k = 0; k < 5; k++) {
    const centre = k * Math.PI * 2 / 5 + .29 * Math.sin(seed * .29 + k * 2.1)
    const delta = Math.atan2(Math.sin(azimuth - centre), Math.cos(azimuth - centre))
    grooves += Math.exp(-((delta / (.075 + .025 * Math.sin(seed + k) ** 2)) ** 2))
  }
  const folds = 1 + wall * (.038 * Math.sin(azimuth * 3 + seed * .23) - (crag ? .19 : .12) * grooves)
  const [span, depth] = section(q, form)
  let buttress = 0
  // Separate anchored shoulders occupy only parts of the circumference.
  // Their rims rise obliquely across the rock, never forming a contour ring.
  for (let k = 0; k < 3; k++) {
    const centre = 1.15 + k * 2.14 + .27 * Math.sin(seed * .21 + k)
    const delta = Math.atan2(Math.sin(a - centre), Math.cos(a - centre))
    const sector = Math.exp(-((delta / (.48 + k * .08)) ** 4))
    const rim = .28 + k * .17 + .10 * Math.sin(delta * 1.8 + seed * .39 + k)
    buttress += (.15 - k * .022) * sector * smooth(0, .13, q) * (1 - smooth(rim - .015, rim + .085, q))
  }
  const rib = folds + buttress * (shoulder ? .55 : 1)
  // Squarer cliff sections expose long rock planes; the outer shoulder stays
  // softer. A tilted spine breaks bilateral symmetry without a noisy outline.
  const ux = signedPower(u, crag ? .76 : .91)
  const vz = signedPower(v, crag ? .43 : shoulder ? .89 : .66)
  const lean = (form === 'spire' ? .34 : crag ? .19 : .11) * Math.sin(seed * .53)
  const px = w * (ux * span * rib + lean * rise)
  const spineU = form === 'spire' ? u * (1 - rise) : u
  const pz = d * (vz * depth * rib + .10 * Math.sin(spineU * 2.1 + seed * .19) * rise)
  const py = q * h * crestHeight(u, seed, form) - 1.3
  const c = Math.cos(yaw), s = Math.sin(yaw)
  return [x + px * c - pz * s, py, z + px * s + pz * c]
}

export function createMountainGeometry(m: Mountain) {
  const positions: number[] = [], indices: number[] = [], sides = 96, rings = 56
  for (let j = 0; j <= rings; j++) for (let i = 0; i <= sides; i++) {
    positions.push(...mountainSurface(m, j / rings, i / sides * Math.PI * 2))
  }
  for (let j = 0; j < rings; j++) for (let i = 0; i < sides; i++) {
    const a = j * (sides + 1) + i, b = a + sides + 1
    indices.push(a, b, a + 1, a + 1, b, b + 1)
  }
  // Both sides meet at t=1; the bed-facing fan closes the submerged foot.
  const bottom = positions.length / 3
  positions.push(m[0], -2, m[1])
  for (let i = 0; i < sides; i++) indices.push(i + 1, bottom, i)
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices); geometry.computeVertexNormals()
  return geometry
}
