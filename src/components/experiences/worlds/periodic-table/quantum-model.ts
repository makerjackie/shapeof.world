/** Probability samples, not electron trajectories.
 * Hydrogenic radial functions + normalized real spherical harmonics.
 * Multiple electrons use Slater-screened hydrogenic orbitals, not a many-body solver.
 * Sources and limitations are recorded in this world's source note.
 */
import { completeElementData } from './complete-element-data'

export type Subshell = { n: number; l: number; count: number; key: string; charge: number }
export type CloudSelection = { subshell: string; m: number } | null
export type ProbabilityCloud = { positions: Float32Array; radius: number; count: number }
const types = 'spdf'
const factorial = (n: number): number => { let result = 1; for (let i = 2; i <= n; i++) result *= i; return result }

/** Expand the verified configuration, including noble-gas cores and exceptions. */
export function electronConfiguration(symbol: string): Subshell[] {
 const config = completeElementData[symbol]?.config
 if (!config) return []
 const core = config.match(/\[([A-Z][a-z]?)\]/)?.[1]
 const result = core ? electronConfiguration(core).map(s => ({ ...s })) : []
 for (const match of config.matchAll(/(\d)([spdf])(\d+)/g)) {
  const n = Number(match[1]), l = types.indexOf(match[2])
  result.push({ n, l, count: Number(match[3]), key: `${n}${match[2]}`, charge: 0 })
 }
 result.sort((a, b) => a.n - b.n || a.l - b.l)
 const z = result.reduce((sum, s) => sum + s.count, 0)
 for (const s of result) s.charge = effectiveCharge(z, result, s)
 return result
}

/** Slater's grouping rules; intentionally do not fit radii to van der Waals data. */
export function effectiveCharge(z: number, configuration: Subshell[], target: Subshell): number {
 let shielding = 0
 for (const s of configuration) {
  const sameGroup = s.n === target.n && (target.l < 2 ? s.l < 2 : s.l === target.l)
  if (sameGroup) shielding += (s.count - (s.key === target.key ? 1 : 0)) * (target.n === 1 ? .3 : .35)
  else if (target.l < 2) {
   if (s.n === target.n - 1) shielding += .85 * s.count
   else if (s.n < target.n - 1) shielding += s.count
  } else if (s.n < target.n || (s.n === target.n && s.l < target.l)) shielding += s.count
 }
 return z - shielding
}

export function laguerre(k: number, alpha: number, x: number): number {
 if (k === 0) return 1
 let previous = 1, current = 1 + alpha - x
 for (let i = 2; i <= k; i++) { const next = ((2 * i - 1 + alpha - x) * current - (i - 1 + alpha) * previous) / i; previous = current; current = next }
 return current
}

/** Normalized R_nl(r), with r in Bohr radii and an effective nuclear charge. */
export function radialWave(n: number, l: number, charge: number, r: number): number {
 const rho = 2 * charge * r / n
 const norm = Math.sqrt((2 * charge / n) ** 3 * factorial(n - l - 1) / (2 * n * factorial(n + l)))
 return norm * Math.exp(-rho / 2) * rho ** l * laguerre(n - l - 1, 2 * l + 1, rho)
}

/** Real orthonormal basis: m<0 sine, m>0 cosine, m=0 zonal.
 * The index names a real basis function, not an Lz measurement for m != 0.
 */
export function realHarmonic(l: number, m: number, cosTheta: number, phi: number): number {
 const order = Math.abs(m)
 let pmm = 1
 for (let i = 1; i <= order; i++) pmm *= -(2 * i - 1) * Math.sqrt(Math.max(0, 1 - cosTheta * cosTheta))
 let p = pmm
 if (l > order) {
  let previous = pmm, current = cosTheta * (2 * order + 1) * pmm
  for (let i = order + 2; i <= l; i++) { const next = ((2 * i - 1) * cosTheta * current - (i + order - 1) * previous) / (i - order); previous = current; current = next }
  p = current
 }
 const norm = Math.sqrt((2 * l + 1) / (4 * Math.PI) * factorial(l - order) / factorial(l + order))
 return norm * p * (m === 0 ? 1 : Math.SQRT2 * (m < 0 ? Math.sin(order * phi) : Math.cos(order * phi)))
}

const radialTables = new Map<string, { cdf: Float64Array; step: number }>()
function radialTable(n: number, l: number) {
 const key = `${n}-${l}`
 const cached = radialTables.get(key)
 if (cached) return cached
 const bins = 4096, step = n * (4 * n + 35) / 2 / bins, cdf = new Float64Array(bins + 1)
 let previous = 0
 for (let i = 1; i <= bins; i++) {
  const r = i * step, density = r * r * radialWave(n, l, 1, r) ** 2
  cdf[i] = cdf[i - 1] + (previous + density) * step / 2; previous = density
 }
 const integral = cdf[bins]
 for (let i = 0; i <= bins; i++) cdf[i] /= integral
 const table = { cdf, step }; radialTables.set(key, table); return table
}

export function radialQuantile(n: number, l: number, charge: number, probability: number): number {
 const { cdf, step } = radialTable(n, l)
 const u = Math.min(1 - 1e-12, Math.max(1e-12, probability))
 let low = 0, high = cdf.length - 1
 while (high - low > 1) { const mid = (low + high) >>> 1; if (cdf[mid] < u) low = mid; else high = mid }
 return (low + (u - cdf[low]) / Math.max(1e-20, cdf[high] - cdf[low])) * step / charge
}

function randomSource(seed: number) {
 let state = seed >>> 0
 return () => { state += 0x6d2b79f5; let t = Math.imul(state ^ state >>> 15, 1 | state); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296 }
}

/** Whole atoms use a rotationally averaged density, weighted by electron count.
 * A selected orbital is a single normalized basis shape, not the whole atom.
 * Sampling never depends on mass number, camera pose or animation time.
 */
export function sampleProbabilityCloud(configuration: Subshell[], selection: CloudSelection, count = 16000, seed = 71): ProbabilityCloud {
 const selected = selection ? configuration.find(s => s.key === selection.subshell) : null
 const source = selected ? [selected] : configuration
 if (selected && selection && (!Number.isInteger(selection.m) || Math.abs(selection.m) > selected.l)) throw new RangeError('Invalid real orbital basis index')
 if (!source.length || count <= 0) return { positions: new Float32Array(), count: 0, radius: 1 }
 const random = randomSource(seed), positions = new Float32Array(count * 3), radii: number[] = []
 const total = source.reduce((sum, s) => sum + s.count, 0)
 for (let i = 0; i < count; i++) {
  let ticket = random() * total, s = source[source.length - 1]
  for (const candidate of source) { ticket -= candidate.count; if (ticket < 0) { s = candidate; break } }
  const radius = radialQuantile(s.n, s.l, s.charge, random())
  let cosine: number, phi: number
  do {
   cosine = 2 * random() - 1; phi = 2 * Math.PI * random()
  } while (selected && selection && random() * (2 * s.l + 1) / (4 * Math.PI) > realHarmonic(s.l, selection.m, cosine, phi) ** 2)
  const sine = Math.sqrt(1 - cosine * cosine)
  positions[i * 3] = radius * sine * Math.cos(phi)
  positions[i * 3 + 1] = radius * sine * Math.sin(phi)
  positions[i * 3 + 2] = radius * cosine
  radii.push(radius)
 }
 radii.sort((a, b) => a - b)
 return { positions, count, radius: radii[Math.floor(count * .985)] }
}
