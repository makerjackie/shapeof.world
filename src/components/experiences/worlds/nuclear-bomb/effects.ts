import { KILOTON_TNT_J } from './model'

export const MIN_YIELD_KT = 0.001
export const MAX_YIELD_KT = 50_000
export const MIN_EFFECTS_YIELD_KT = 1
export const TNT_DENSITY_TONS_PER_CUBIC_METRE = 1.654

export interface YieldPreset {
  readonly id: string
  readonly name: string
  readonly nameEn: string
  readonly year: number | null
  readonly yieldKt: number
  readonly sourceUrl: string
}

export const YIELD_PRESETS: readonly YieldPreset[] = [
  { id: 'one-ton', name: '1 吨 TNT', nameEn: '1 ton of TNT', year: null, yieldKt: 0.001, sourceUrl: 'https://en.wikipedia.org/wiki/TNT_equivalent' },
  { id: 'one-kiloton', name: '1 千吨 TNT', nameEn: '1 kiloton of TNT', year: null, yieldKt: 1, sourceUrl: 'https://en.wikipedia.org/wiki/TNT_equivalent' },
  { id: 'little-boy', name: '广岛 · 小男孩', nameEn: 'Hiroshima · Little Boy', year: 1945, yieldKt: 15, sourceUrl: 'https://en.wikipedia.org/wiki/Little_Boy' },
  { id: 'fat-man', name: '长崎 · 胖子', nameEn: 'Nagasaki · Fat Man', year: 1945, yieldKt: 21, sourceUrl: 'https://en.wikipedia.org/wiki/Fat_Man' },
  { id: 'project-596', name: '中国首颗原子弹', nameEn: 'China’s first atomic bomb', year: 1964, yieldKt: 22, sourceUrl: 'https://en.wikipedia.org/wiki/596_(nuclear_test)' },
  { id: 'test-no-6', name: '中国首颗氢弹', nameEn: 'China’s first hydrogen bomb', year: 1967, yieldKt: 3_300, sourceUrl: 'https://en.wikipedia.org/wiki/Test_No._6' },
  { id: 'ivy-mike', name: '常春藤麦克', nameEn: 'Ivy Mike', year: 1952, yieldKt: 10_400, sourceUrl: 'https://en.wikipedia.org/wiki/Ivy_Mike' },
  { id: 'castle-bravo', name: '城堡喝彩', nameEn: 'Castle Bravo', year: 1954, yieldKt: 15_000, sourceUrl: 'https://en.wikipedia.org/wiki/Castle_Bravo' },
  { id: 'tsar-bomba', name: '沙皇炸弹', nameEn: 'Tsar Bomba', year: 1961, yieldKt: 50_000, sourceUrl: 'https://en.wikipedia.org/wiki/Tsar_Bomba' },
]

interface EnergySample {
  readonly yieldKt: number
  readonly energyJ: number
  readonly tntTons: number
  readonly tntCubeSideM: number
}

interface EffectDistances {
  readonly heightKm: number
  readonly fireballKm: number
  readonly blast20Km: number
  readonly blast5Km: number
  readonly blast1Km: number
  readonly burnKm: number
  readonly outerRadiusKm: number
}

type HiddenDistances = { readonly [K in keyof EffectDistances]: null }

export type EffectsSample = EnergySample & (
  | ({ readonly showEffects: true } & EffectDistances)
  | ({ readonly showEffects: false } & HiddenDistances)
)

const LOG_YIELD_RANGE = Math.log(MAX_YIELD_KT / MIN_YIELD_KT)
const BURN_ANCHORS = [[1, 0.6], [20, 2.5], [1_000, 12], [20_000, 38]] as const
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function finite(value: number): number {
  if (!Number.isFinite(value)) throw new RangeError('A finite value is required')
  return value
}

function boundedYield(yieldKt: number): number {
  return clamp(finite(yieldKt), MIN_YIELD_KT, MAX_YIELD_KT)
}

/** Equivalent TNT volume, shown only as an abstract solid comparison. */
export function tntCubeSideM(yieldKt: number): number {
  return Math.cbrt(boundedYield(yieldKt) * 1_000 / TNT_DENSITY_TONS_PER_CUBIC_METRE)
}

function burnRadiusKm(yieldKt: number): number {
  let segment = 0
  while (segment < BURN_ANCHORS.length - 2 && yieldKt > BURN_ANCHORS[segment + 1][0]) segment++
  const [yield0, radius0] = BURN_ANCHORS[segment]
  const [yield1, radius1] = BURN_ANCHORS[segment + 1]
  const fraction = Math.log(yieldKt / yield0) / Math.log(yield1 / yield0)
  return radius0 * (radius1 / radius0) ** fraction
}

/** Approximate, clear-sky exhibit distances; the supplied coefficients are fixed. */
export function sampleEffects(requestedYieldKt: number): EffectsSample {
  const yieldKt = boundedYield(requestedYieldKt)
  const energy = { yieldKt, energyJ: KILOTON_TNT_J * yieldKt, tntTons: 1_000 * yieldKt, tntCubeSideM: tntCubeSideM(yieldKt) }
  if (yieldKt < MIN_EFFECTS_YIELD_KT) {
    return { ...energy, showEffects: false, heightKm: null, fireballKm: null, blast20Km: null, blast5Km: null, blast1Km: null, burnKm: null, outerRadiusKm: null }
  }
  const cubeRoot = Math.cbrt(yieldKt)
  const heightKm = 0.2 * cubeRoot
  const fireballKm = 0.06096 * yieldKt ** 0.4
  const blast20Km = 0.24 * cubeRoot
  const blast5Km = 0.62 * cubeRoot
  const blast1Km = 1.70 * cubeRoot
  const burnKm = burnRadiusKm(yieldKt)
  return { ...energy, showEffects: true, heightKm, fireballKm, blast20Km, blast5Km, blast1Km, burnKm, outerRadiusKm: Math.max(blast1Km, burnKm) }
}

/** Slider positions are logarithmic; all displayed distance geometry stays linear. */
export function yieldToSlider(yieldKt: number): number {
  const value = boundedYield(yieldKt)
  if (value === MIN_YIELD_KT) return 0
  if (value === MAX_YIELD_KT) return 1
  return Math.log(value / MIN_YIELD_KT) / LOG_YIELD_RANGE
}

export function sliderToYield(position: number): number {
  const value = clamp(finite(position), 0, 1)
  if (value === 0) return MIN_YIELD_KT
  if (value === 1) return MAX_YIELD_KT
  return MIN_YIELD_KT * Math.exp(value * LOG_YIELD_RANGE)
}

export function snapYield(yieldKt: number, tolerance = 0.018): number {
  const value = boundedYield(yieldKt)
  const position = yieldToSlider(value)
  const distanceLimit = Math.max(0, finite(tolerance))
  let closestYield = value
  let closestDistance = distanceLimit
  for (const preset of YIELD_PRESETS) {
    const distance = Math.abs(position - yieldToSlider(preset.yieldKt))
    if (distance <= closestDistance) {
      closestYield = preset.yieldKt
      closestDistance = distance
    }
  }
  return closestYield
}
