/**
 * Trade chokepoints — pure model.
 *
 * Everything numeric lives here: reading the baked payload, resolving which route a
 * lane takes once you shut a strait, resampling paths so two different routes can be
 * cross-faded point-for-point, and the arithmetic behind the readout band.
 *
 * No strings, no canvas, no React. The component owns all of those.
 */

export type GateId = 'malacca' | 'hormuz' | 'suez' | 'bab' | 'danish' | 'bosporus' | 'panama'
export type CargoId = 'container' | 'crude' | 'lng' | 'grain'

export type RawGate = {
  id: GateId
  lon: number
  lat: number
  labelAngle: number
  eia: Record<string, number>
  detour: 'cape' | 'lombok' | 'kiel' | 'pipeline' | 'long' | 'none'
}

export type RawVariant = {
  gates: Array<GateId>
  /** flat [lon, lat, lon, lat, …] */
  path: Array<number>
  km: number
  nm: number
  days: number
}

export type RawLane = {
  id: string
  cargo: CargoId
  weight: number
  variants: Array<RawVariant>
}

export type RawPayload = {
  meta: {
    generatedAt: string
    cruiseKnots: number
    eiaYears: Array<number>
    landSource: string
    volumeSource: string
    geometryNote: string
    everGiven: { grounded: string; refloated: string; days: number; dailyTradeUsdBillion: number }
    suezTransits2023: number
    panamaDailySlots: { normal: number; restricted: number; restrictedFrom: string }
    seaborneTradeShare: number
  }
  gates: Array<RawGate>
  capeOfGoodHope: { lon: number; lat: number; eia: Record<string, number> }
  pipelines: Array<{ id: string; path: Array<number> }>
  land: Array<Array<number>>
  lanes: Array<RawLane>
}

/** Every variant is resampled to the same point count so route A can morph into route B. */
export const SAMPLES = 132

export type Variant = {
  gates: Array<GateId>
  km: number
  nm: number
  days: number
  /** arc-length-uniform, longitude-unwrapped: [lon, lat] × SAMPLES */
  points: Float64Array
  /** where each gate sits along this variant, as a 0…1 arc position */
  gateAt: Partial<Record<GateId, number>>
  /** does this route round the Cape of Good Hope? drives the "corridor load" layer */
  viaCape: boolean
}

export type Lane = {
  id: string
  cargo: CargoId
  weight: number
  variants: Array<Variant>
  /** highest arc position of a gate on the base route — where a severed queue forms */
  baseGateOrder: Array<{ gate: GateId; at: number }>
}

export type Land = Array<Float64Array>

export type WorldModel = {
  meta: RawPayload['meta']
  gates: Array<RawGate>
  capeOfGoodHope: RawPayload['capeOfGoodHope']
  pipelines: Array<Float64Array>
  land: Land
  lanes: Array<Lane>
  totalEia2023: number
}

const EARTH_RADIUS_KM = 6371.0088
const toRadians = (degrees: number) => (degrees * Math.PI) / 180

export function clamp(value: number, low: number, high: number) {
  return Math.min(high, Math.max(low, value))
}

/** Exponential approach — frame-rate independent easing used all over the render loop. */
export function approach(current: number, target: number, dt: number, tau: number) {
  return current + (target - current) * (1 - Math.exp(-dt / tau))
}

export function haversineKm(lonA: number, latA: number, lonB: number, latB: number) {
  const dLat = toRadians(latB - latA)
  let dLon = lonB - lonA
  if (dLon > 180) dLon -= 360
  if (dLon < -180) dLon += 360
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(latA)) * Math.cos(toRadians(latB)) * Math.sin(toRadians(dLon) / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * Unwrap longitudes so a path that crosses the antimeridian keeps increasing
 * (175° → 190° rather than 175° → −170°). Drawing then only needs ±360 copies.
 */
function unwrap(flat: Array<number>) {
  const count = flat.length / 2
  const out = new Float64Array(count * 2)
  let previous = flat[0]
  out[0] = flat[0]
  out[1] = flat[1]
  for (let index = 1; index < count; index += 1) {
    let lon = flat[index * 2]
    while (lon - previous > 180) lon -= 360
    while (lon - previous < -180) lon += 360
    out[index * 2] = lon
    out[index * 2 + 1] = flat[index * 2 + 1]
    previous = lon
  }
  return out
}

/** Resample to SAMPLES points spaced evenly by great-circle distance. */
function resample(unwrapped: Float64Array) {
  const count = unwrapped.length / 2
  const cumulative = new Float64Array(count)
  for (let index = 1; index < count; index += 1) {
    cumulative[index] = cumulative[index - 1] + haversineKm(
      unwrapped[(index - 1) * 2],
      unwrapped[(index - 1) * 2 + 1],
      unwrapped[index * 2],
      unwrapped[index * 2 + 1],
    )
  }
  const total = cumulative[count - 1] || 1
  const out = new Float64Array(SAMPLES * 2)
  let cursor = 0
  for (let sample = 0; sample < SAMPLES; sample += 1) {
    const target = (sample / (SAMPLES - 1)) * total
    while (cursor < count - 2 && cumulative[cursor + 1] < target) cursor += 1
    const span = cumulative[cursor + 1] - cumulative[cursor]
    const t = span > 0 ? (target - cumulative[cursor]) / span : 0
    out[sample * 2] = unwrapped[cursor * 2] + (unwrapped[(cursor + 1) * 2] - unwrapped[cursor * 2]) * t
    out[sample * 2 + 1] = unwrapped[cursor * 2 + 1] + (unwrapped[(cursor + 1) * 2 + 1] - unwrapped[cursor * 2 + 1]) * t
  }
  return out
}

function nearestArcPosition(points: Float64Array, lon: number, lat: number) {
  let best = 0
  let bestDistance = Infinity
  for (let sample = 0; sample < SAMPLES; sample += 1) {
    let deltaLon = points[sample * 2] - lon
    while (deltaLon > 180) deltaLon -= 360
    while (deltaLon < -180) deltaLon += 360
    const distance = deltaLon * deltaLon + (points[sample * 2 + 1] - lat) ** 2
    if (distance < bestDistance) {
      bestDistance = distance
      best = sample
    }
  }
  return { at: best / (SAMPLES - 1), degrees: Math.sqrt(bestDistance) }
}

export function buildModel(raw: RawPayload): WorldModel {
  const gateById = new Map(raw.gates.map((gate) => [gate.id, gate]))

  const lanes: Array<Lane> = raw.lanes.map((lane) => {
    const variants: Array<Variant> = lane.variants.map((variant) => {
      const points = resample(unwrap(variant.path))
      const gateAt: Partial<Record<GateId, number>> = {}
      for (const gateId of variant.gates) {
        const gate = gateById.get(gateId)
        if (!gate) continue
        gateAt[gateId] = nearestArcPosition(points, gate.lon, gate.lat).at
      }
      const cape = nearestArcPosition(points, raw.capeOfGoodHope.lon, raw.capeOfGoodHope.lat)
      return {
        gates: variant.gates,
        km: variant.km,
        nm: variant.nm,
        days: variant.days,
        points,
        gateAt,
        viaCape: cape.degrees < 4.5,
      }
    })

    const base = variants[0]
    const baseGateOrder = base.gates
      .map((gate) => ({ gate, at: base.gateAt[gate] ?? 1 }))
      .sort((left, right) => left.at - right.at)

    return { id: lane.id, cargo: lane.cargo, weight: lane.weight, variants, baseGateOrder }
  })

  return {
    meta: raw.meta,
    gates: raw.gates,
    capeOfGoodHope: raw.capeOfGoodHope,
    pipelines: raw.pipelines.map((pipeline) => unwrap(pipeline.path)),
    land: raw.land.map((ring) => unwrap(ring)),
    lanes,
    totalEia2023: raw.gates.reduce((total, gate) => total + (gate.eia['2023'] ?? 0), 0),
  }
}

export type LaneState = {
  /** index into lane.variants, or −1 when nothing is navigable */
  variant: number
  severed: boolean
  /** arc position of the first closed gate on the base route (queue forms here) */
  blockAt: number
  extraKm: number
  extraDays: number
}

/** First variant whose gates are all open wins. None → the lane is cut. */
export function resolveLane(lane: Lane, closed: ReadonlySet<GateId>): LaneState {
  const base = lane.variants[0]
  for (let index = 0; index < lane.variants.length; index += 1) {
    const variant = lane.variants[index]
    if (variant.gates.every((gate) => !closed.has(gate))) {
      return {
        variant: index,
        severed: false,
        blockAt: 1,
        extraKm: variant.km - base.km,
        extraDays: Math.round((variant.days - base.days) * 10) / 10,
      }
    }
  }
  const blocked = lane.baseGateOrder.find((entry) => closed.has(entry.gate))
  return { variant: -1, severed: true, blockAt: blocked ? blocked.at : 0.5, extraKm: 0, extraDays: 0 }
}

export type Summary = {
  closedCount: number
  affected: number
  severed: number
  laneTotal: number
  averageExtraKm: number
  averageExtraDays: number
  maxExtraKm: number
  blockedMbd: number
  blockedShare: number
}

export function summarise(
  model: WorldModel,
  states: Array<LaneState>,
  closed: ReadonlySet<GateId>,
): Summary {
  let affected = 0
  let severed = 0
  let totalKm = 0
  let totalDays = 0
  let maxExtraKm = 0
  for (const state of states) {
    if (state.severed) {
      severed += 1
      affected += 1
      continue
    }
    if (state.variant === 0) continue
    affected += 1
    totalKm += state.extraKm
    totalDays += state.extraDays
    if (state.extraKm > maxExtraKm) maxExtraKm = state.extraKm
  }
  const rerouted = affected - severed
  const blockedMbd = model.gates
    .filter((gate) => closed.has(gate.id))
    .reduce((total, gate) => total + (gate.eia['2023'] ?? 0), 0)

  return {
    closedCount: closed.size,
    affected,
    severed,
    laneTotal: states.length,
    averageExtraKm: rerouted > 0 ? Math.round(totalKm / rerouted) : 0,
    averageExtraDays: rerouted > 0 ? Math.round((totalDays / rerouted) * 10) / 10 : 0,
    maxExtraKm,
    blockedMbd: Math.round(blockedMbd * 10) / 10,
    blockedShare: model.totalEia2023 > 0 ? blockedMbd / model.totalEia2023 : 0,
  }
}

/**
 * Where a lane is drawn right now. `morph` cross-fades the previous route into the
 * current one so ships slide across to the Cape instead of teleporting.
 */
export function blendLane(
  lane: Lane,
  fromVariant: number,
  toVariant: number,
  morph: number,
  out: Float64Array,
) {
  const from = lane.variants[fromVariant >= 0 ? fromVariant : 0].points
  const to = lane.variants[toVariant >= 0 ? toVariant : 0].points
  if (morph >= 1 || from === to) {
    out.set(to)
    return out
  }
  if (morph <= 0) {
    out.set(from)
    return out
  }
  for (let index = 0; index < SAMPLES * 2; index += 2) {
    let a = from[index]
    const b = to[index]
    // Interpolate the short way even when the two routes sit on opposite unwraps.
    while (b - a > 180) a += 360
    while (b - a < -180) a -= 360
    out[index] = a + (b - a) * morph
    out[index + 1] = from[index + 1] + (to[index + 1] - from[index + 1]) * morph
  }
  return out
}

/** Sample a blended polyline at arc position s ∈ [0, 1]. */
export function samplePath(points: Float64Array, s: number, out: { lon: number; lat: number }) {
  const position = clamp(s, 0, 1) * (SAMPLES - 1)
  const index = Math.min(SAMPLES - 2, Math.floor(position))
  const t = position - index
  out.lon = points[index * 2] + (points[(index + 1) * 2] - points[index * 2]) * t
  out.lat = points[index * 2 + 1] + (points[(index + 1) * 2 + 1] - points[index * 2 + 1]) * t
  return out
}

/** Heading in radians at arc position s, for orienting the light-points. */
export function pathHeading(points: Float64Array, s: number) {
  const position = clamp(s, 0, 1) * (SAMPLES - 1)
  const index = Math.min(SAMPLES - 2, Math.floor(position))
  const dx = points[(index + 1) * 2] - points[index * 2]
  const dy = points[(index + 1) * 2 + 1] - points[index * 2 + 1]
  return Math.atan2(-dy, dx)
}
