import type { BridgeKind } from './model'

/** Selected design envelopes, not universal bridge-type limits. SI: m, kN, kN/m². */
export const SPAN_MIN = 20
export const SLIDER_MAX = 2000
export const RECORD_MAX = 2023
export const SPAN_KINDS: BridgeKind[] = ['beam', 'arch', 'stayed', 'suspension']
export const DECK_LOAD = 180
export const POINT_LOAD = 320
const STEEL_WEIGHT = 78.5

export function spanResponse(kind: BridgeKind, span: number) {
  const L = Math.max(SPAN_MIN, span)
  if (kind === 'beam') {
    const depth = Math.min(22, Math.max(1, L / 12))
    const q = DECK_LOAD + 3.4 * STEEL_WEIGHT
    const demand = q * L ** 2 / 8 + POINT_LOAD * L / 4
    const capacity = 200_000 * 1.4 * depth
    return { utilization: demand / capacity, demand, capacity, depth, height: depth, unit: 'kN·m', limit: 'bending' }
  }
  if (kind === 'arch') {
    const rise = L / 5
    const q = DECK_LOAD + 50
    const horizontal = q * L ** 2 / (8 * rise) + POINT_LOAD * L / (4 * rise)
    const demand = Math.hypot(horizontal, (q * L + POINT_LOAD) / 2)
    const crushing = 45_000 * 3.2
    // Assumed effective buckling length, with an explicit teaching reduction factor.
    const buckling = Math.PI ** 2 * 35_000_000 * 150 / (.55 * L) ** 2 / 2.5
    const capacity = Math.min(crushing, buckling)
    return { utilization: demand / capacity, demand, capacity, depth: rise, height: rise, unit: 'kN', limit: buckling < crushing ? 'buckling' : 'compression' }
  }
  if (kind === 'stayed') {
    const height = Math.min(.22 * L, 240)
    const length = Math.hypot(L / 2, height)
    const tributary = Math.min(40, L / 8)
    const area = .015
    // One representative outer stay in one of two cable planes; half its weight at each end.
    const vertical = DECK_LOAD * tributary / 2 + POINT_LOAD / 2 + STEEL_WEIGHT * area * length / 2
    const demand = vertical * length / height
    const capacity = 750_000 * area
    return { utilization: demand / capacity, demand, capacity, depth: height, height, unit: 'kN', limit: 'stay-angle' }
  }
  const sag = .1 * L
  const cableArea = 1.2 // Sum of the two main-cable cross sections.
  const q = DECK_LOAD + STEEL_WEIGHT * cableArea * (1 + 8 * .1 ** 2 / 3)
  const horizontal = q * L ** 2 / (8 * sag) + POINT_LOAD * L / (4 * sag)
  const demand = Math.hypot(horizontal, (q * L + POINT_LOAD) / 2)
  const capacity = 800_000 * cableArea
  return { utilization: demand / capacity, demand, capacity, depth: sag, height: .15 * L + 10, unit: 'kN', limit: 'cable-tension' }
}

export function schemeLimit(kind: BridgeKind) {
  let low = SPAN_MIN, high = 5000
  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2
    if (spanResponse(kind, mid).utilization <= 1) low = mid
    else high = mid
  }
  return Math.floor(low)
}

export const SCHEME_LIMITS = Object.fromEntries(SPAN_KINDS.map(kind => [kind, schemeLimit(kind)])) as Record<BridgeKind, number>
export function feasibleKinds(span: number) { return SPAN_KINDS.filter(kind => spanResponse(kind, span).utilization <= 1) }
