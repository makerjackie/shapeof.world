export type FlyLod = 'near' | 'mid' | 'far'

export type EcologyFly = {
  id: number
  lod: FlyLod
  cluster: number
  home: [number, number, number]
  phase: number
  speed: number
  turnRate: number
  pausePeriod: number
  flashAttack: number
  flashDecay: number
  warmth: number
}

export type PhaseFly = Pick<EcologyFly, 'phase' | 'cluster'> & { home: [number, number, number] }

const CLUSTERS: ReadonlyArray<{ center: [number, number, number]; spread: [number, number, number]; weight: number }> = [
  { center: [-5.4, 6.2, 1.2], spread: [2.8, 2.1, 2.4], weight: 1.2 },
  { center: [3.8, 7.7, -1.5], spread: [3.2, 2.4, 2.6], weight: 1.3 },
  { center: [-1.8, 10.1, -2.4], spread: [3.8, 2.0, 2.4], weight: 0.72 },
  { center: [1.1, 3.8, 1.9], spread: [2.0, 2.9, 1.8], weight: 1.0 },
  { center: [-3.7, 1.25, 2.8], spread: [3.2, 0.9, 2.1], weight: 0.92 },
  { center: [4.7, 1.05, -0.6], spread: [3.4, 0.7, 2.8], weight: 0.78 },
  { center: [0.5, 13.4, -3.1], spread: [4.4, 1.3, 2.6], weight: 0.22 },
]

export function seededRandom(seed: number) {
  let value = seed >>> 0
  return () => {
    value += 0x6d2b79f5
    let t = value
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shouldAdvanceFlight(reducedMotion: boolean, pageHidden = false) {
  return !reducedMotion && !pageHidden
}

export function getStoryCoupling(beat: number, pull: number, radius: number, sync: boolean) {
  if (beat <= 1) return { sync: false, pull, radius: Math.max(1.2, radius / 62) }
  if (beat === 2) return { sync, pull: Math.max(pull, 0.06) * 1.2, radius: Math.max(radius / 62, 3.4) }
  if (beat === 3) return { sync, pull: Math.max(pull, 0.07) * 1.4, radius: Math.max(radius / 62, 5.8) }
  if (beat === 4) return { sync, pull: Math.max(pull, 0.09) * 1.6, radius: Math.max(radius / 62, 9.2) }
  return { sync, pull, radius: Math.max(1.2, radius / 62) }
}

function gaussian(rnd: () => number) {
  return Math.sqrt(-2 * Math.log(Math.max(1e-7, rnd()))) * Math.cos(Math.PI * 2 * rnd())
}

function trunkRadius(y: number) {
  return Math.max(0.36, 1.18 - y * 0.055)
}

export function isValidEcologyPosition([x, y, z]: [number, number, number]) {
  if (y < 0.34) return false
  if (y < 9 && Math.hypot(x + 0.35, z) < trunkRadius(y) + 0.42) return false
  return Math.abs(x) < 11.8 && y < 16.2 && Math.abs(z) < 7.2
}

export function generateEcologyLayout(count = 174, seed = 0x5f3759df): EcologyFly[] {
  const rnd = seededRandom(seed)
  const weights = CLUSTERS.map((cluster) => cluster.weight)
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  const flies: EcologyFly[] = []
  let attempts = 0
  while (flies.length < count && attempts < count * 90) {
    attempts += 1
    let pick = rnd() * totalWeight
    let cluster = 0
    for (; cluster < weights.length - 1; cluster += 1) {
      pick -= weights[cluster]
      if (pick <= 0) break
    }
    const spec = CLUSTERS[cluster]
    const organic = 0.58 + rnd() * 0.7
    const home: [number, number, number] = [
      spec.center[0] + gaussian(rnd) * spec.spread[0] * organic,
      spec.center[1] + gaussian(rnd) * spec.spread[1] * organic,
      spec.center[2] + gaussian(rnd) * spec.spread[2] * organic,
    ]
    if (!isValidEcologyPosition(home)) continue
    if (flies.some((fly) => {
      const dx = fly.home[0] - home[0]; const dy = fly.home[1] - home[1]; const dz = fly.home[2] - home[2]
      return dx * dx + dy * dy + dz * dz < 0.075
    })) continue
    const depth = home[2]
    const lod: FlyLod = depth > 1.7 && flies.filter((fly) => fly.lod === 'near').length < 20
      ? 'near' : depth > -2.4 && flies.filter((fly) => fly.lod === 'mid').length < 72 ? 'mid' : 'far'
    flies.push({
      id: flies.length, lod, cluster, home,
      phase: rnd(), speed: 0.82 + rnd() * 0.31, turnRate: 0.28 + rnd() * 0.42,
      pausePeriod: 2.4 + rnd() * 5.8, flashAttack: 0.035 + rnd() * 0.035,
      flashDecay: 0.48 + rnd() * 0.38, warmth: rnd(),
    })
  }
  return flies
}

export function advancePulseCoupling(flies: PhaseFly[], sourceIndex: number, pull: number, radius: number) {
  const source = flies[sourceIndex]
  if (!source) return []
  const affected: number[] = []
  const radius2 = radius * radius
  flies.forEach((fly, index) => {
    if (index === sourceIndex) return
    const dx = fly.home[0] - source.home[0]; const dy = fly.home[1] - source.home[1]; const dz = fly.home[2] - source.home[2]
    if (dx * dx + dy * dy + dz * dz > radius2) return
    fly.phase = Math.min(0.999, fly.phase + fly.phase * pull)
    affected.push(index)
  })
  return affected
}
