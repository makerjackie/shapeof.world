/**
 * Bake the trade-chokepoints world payload.
 *
 *   node scripts/generate-trade-chokepoints-data.mjs
 *   → public/assets/trade-chokepoints/world.json
 *
 * Three ingredients, all public-domain or officially published:
 *
 * 1. Land silhouette — Natural Earth 1:110m Admin 0 Countries, already vendored at
 *    public/assets/flow/countries.geojson (public domain). Only outer rings are kept,
 *    simplified and quantised to 0.1°; it is scenery, not a boundary claim.
 * 2. Chokepoint throughput — U.S. EIA "World Oil Transit Chokepoints" (a U.S.
 *    government work, public domain), petroleum-liquids volumes in million b/d.
 * 3. Lane geometry — hand-built polylines through real ports, canals and straits.
 *    They are schematic trunk corridors, not per-ship AIS tracks. Distances are
 *    computed here with the haversine formula over those polylines.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const landSource = resolve(root, 'public/assets/flow/countries.geojson')
const outputDir = resolve(root, 'public/assets/trade-chokepoints')
const outputFile = resolve(outputDir, 'world.json')

/** Documented cruising speed used for every "extra days" estimate. */
const CRUISE_KNOTS = 14
const KM_PER_NM = 1.852

/* ------------------------------------------------------------------ land -- */

const round1 = (value) => Math.round(value * 10) / 10

/** Perpendicular-distance simplification in degrees; cheap and good enough at 0.1°. */
function simplifyRing(points, tolerance) {
  if (points.length < 4) return points
  const keep = new Uint8Array(points.length)
  keep[0] = 1
  keep[points.length - 1] = 1
  const stack = [[0, points.length - 1]]

  while (stack.length > 0) {
    const [first, last] = stack.pop()
    let farthest = -1
    let maxDistance = 0
    const [ax, ay] = points[first]
    const [bx, by] = points[last]
    const dx = bx - ax
    const dy = by - ay
    const lengthSquared = dx * dx + dy * dy

    for (let index = first + 1; index < last; index += 1) {
      const [px, py] = points[index]
      let distance
      if (lengthSquared === 0) {
        distance = Math.hypot(px - ax, py - ay)
      } else {
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared))
        distance = Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
      }
      if (distance > maxDistance) {
        maxDistance = distance
        farthest = index
      }
    }

    if (maxDistance > tolerance && farthest > 0) {
      keep[farthest] = 1
      stack.push([first, farthest], [farthest, last])
    }
  }

  return points.filter((_, index) => keep[index] === 1)
}

function ringSpan(points) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of points) {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  return (maxX - minX) * (maxY - minY)
}

async function buildLand() {
  const collection = JSON.parse(await readFile(landSource, 'utf8'))
  const rings = []

  for (const feature of collection.features) {
    const { type, coordinates } = feature.geometry
    const polygons = type === 'Polygon' ? [coordinates] : coordinates
    for (const polygon of polygons) {
      // Outer ring only. Holes (Lesotho, the Caspian cut-outs) are invisible at this scale.
      const outer = polygon[0]
      if (!outer || outer.length < 4) continue
      const simplified = simplifyRing(
        outer.map(([lon, lat]) => [round1(lon), round1(lat)]),
        0.24,
      )
      if (simplified.length < 4) continue
      // Drop specks that would render as sub-pixel noise on a world-wide chart.
      if (ringSpan(simplified) < 0.9) continue
      rings.push(simplified.flat())
    }
  }

  rings.sort((left, right) => right.length - left.length)
  return rings
}

/* ------------------------------------------------------------ chokepoints -- */

/**
 * EIA, "World Oil Transit Chokepoints" (last updated 3 March 2026).
 * Petroleum liquids, million barrels per day. Panama figures are fiscal years.
 */
const gates = [
  {
    id: 'malacca',
    lon: 100.9,
    lat: 2.9,
    labelAngle: -125,
    eia: { 2023: 24.0, 2024: 22.5 },
    detour: 'lombok',
  },
  {
    id: 'hormuz',
    lon: 56.5,
    lat: 26.55,
    labelAngle: -60,
    eia: { 2023: 21.8, 2024: 20.7 },
    detour: 'pipeline',
  },
  {
    id: 'suez',
    lon: 32.55,
    lat: 30.2,
    labelAngle: 152,
    eia: { 2023: 8.8, 2024: 4.8 },
    detour: 'cape',
  },
  {
    id: 'bab',
    lon: 43.4,
    lat: 12.6,
    labelAngle: 55,
    eia: { 2023: 9.3, 2024: 4.1 },
    detour: 'cape',
  },
  {
    id: 'danish',
    lon: 11.0,
    lat: 55.7,
    labelAngle: -130,
    eia: { 2023: 5.0, 2024: 4.9 },
    detour: 'kiel',
  },
  {
    id: 'bosporus',
    lon: 29.05,
    lat: 41.1,
    labelAngle: -128,
    eia: { 2023: 3.5, 2024: 3.6 },
    detour: 'none',
  },
  {
    id: 'panama',
    lon: -79.6,
    lat: 9.1,
    labelAngle: 150,
    eia: { 2023: 2.2, 2024: 2.0 },
    detour: 'long',
  },
]

/** Cape of Good Hope is not a gate — it is where the traffic goes. EIA tracks it too. */
const capeOfGoodHope = { lon: 18.4, lat: -34.9, eia: { 2023: 6.2, 2024: 9.3 } }

/* -------------------------------------------------------------------- legs -- */

/** Shared polyline fragments. Consecutive legs must share their junction point. */
const legs = {
  // East Asia ⇄ Malacca ⇄ Indian Ocean
  cnToMalacca: [[122.3, 30.6], [122.8, 25.5], [118.5, 21.5], [113.5, 16.0], [109.0, 8.0], [105.2, 2.4], [104.0, 1.2], [102.6, 1.6], [100.9, 2.9]],
  malaccaToIo: [[100.9, 2.9], [98.0, 5.4], [92.0, 6.2], [85.0, 5.6], [80.0, 5.0]],
  cnToLombokIo: [[122.3, 30.6], [122.8, 25.5], [121.5, 18.0], [120.0, 10.0], [119.0, 3.0], [118.6, -2.5], [117.4, -6.6], [115.8, -8.7], [113.0, -10.2], [105.0, -10.6], [95.0, -9.0], [86.0, -4.0], [80.5, 0.5], [80.0, 5.0]],
  sgToMalaccaIo: [[104.4, 1.15], [103.0, 1.4], [100.9, 2.9], [98.0, 5.4], [92.0, 6.2], [85.0, 5.6], [80.0, 5.0]],
  sgToSundaIo: [[104.4, 1.15], [105.6, -2.0], [105.9, -5.9], [105.0, -7.4], [100.0, -9.2], [92.0, -7.0], [84.0, -2.0], [80.0, 5.0]],

  ioToAs: [[80.0, 5.0], [72.0, 8.0], [66.0, 11.0], [62.0, 13.0]],

  // Gulf ⇄ Hormuz ⇄ Arabian Sea
  gulfToAs: [[50.2, 26.6], [52.2, 26.3], [54.5, 26.2], [56.5, 26.55], [57.3, 25.2], [58.8, 23.5], [60.5, 18.5], [62.0, 13.0]],
  qatarToGulf: [[51.6, 25.9], [51.4, 26.2], [50.2, 26.6]],

  // Arabian Sea ⇄ Bab el-Mandeb ⇄ Suez ⇄ Mediterranean
  asToBabSuezMed: [[62.0, 13.0], [56.0, 12.6], [50.5, 12.4], [45.5, 12.3], [43.4, 12.6], [41.0, 15.2], [38.5, 19.5], [36.0, 24.0], [33.8, 27.6], [32.55, 30.2], [32.3, 31.6], [30.5, 32.5]],
  medToGibraltar: [[30.5, 32.5], [26.0, 33.6], [20.0, 34.6], [14.0, 36.4], [8.0, 37.6], [1.0, 36.6], [-3.0, 36.0], [-5.6, 35.95]],
  gibraltarToNwe: [[-5.6, 35.95], [-9.3, 36.9], [-9.8, 40.5], [-9.6, 43.6], [-6.0, 47.4], [-2.5, 49.0], [1.6, 50.9], [3.5, 52.0]],
  gibraltarToUsec: [[-5.6, 35.95], [-12.0, 36.4], [-25.0, 37.0], [-40.0, 38.5], [-55.0, 39.5], [-67.0, 40.2], [-73.8, 40.3]],
  capeToUsec: [[18.4, -34.9], [13.0, -31.0], [8.0, -22.0], [3.0, -10.0], [-2.0, 1.0], [-14.0, 9.0], [-28.0, 15.0], [-45.0, 22.0], [-62.0, 31.0], [-72.0, 37.5], [-73.8, 40.3]],

  // The long way round
  asToCape: [[62.0, 13.0], [58.0, 6.0], [54.0, -4.0], [48.0, -14.0], [40.0, -24.0], [31.0, -32.5], [24.0, -35.6], [18.4, -34.9]],
  ioToCape: [[80.0, 5.0], [72.0, -2.0], [62.0, -12.0], [52.0, -22.0], [40.0, -30.5], [28.0, -35.4], [18.4, -34.9]],
  capeToNwe: [[18.4, -34.9], [13.0, -31.0], [8.0, -22.0], [3.0, -10.0], [-2.0, 1.0], [-9.0, 12.0], [-17.0, 22.0], [-17.5, 31.0], [-13.0, 37.0], [-9.8, 40.5], [-9.6, 43.6], [-6.0, 47.4], [-2.5, 49.0], [1.6, 50.9], [3.5, 52.0]],
  capeToGibraltar: [[18.4, -34.9], [13.0, -31.0], [8.0, -22.0], [3.0, -10.0], [-2.0, 1.0], [-9.0, 12.0], [-17.0, 22.0], [-14.0, 31.5], [-9.0, 35.0], [-5.6, 35.95]],
  gibraltarToMed: [[-5.6, 35.95], [-1.0, 36.2], [5.0, 37.4], [11.0, 37.4], [16.0, 35.2], [22.0, 33.6], [28.0, 33.2], [30.5, 32.5]],
  // The Mediterranean lane ends at Piraeus, not at the canal mouth: stopping at Port
  // Said would let the Suez route claim a destination it has not actually reached.
  medEToPiraeus: [[30.5, 32.5], [28.0, 33.6], [25.5, 35.2], [23.6, 37.9]],
  gibraltarToPiraeus: [[-5.6, 35.95], [-1.0, 36.2], [5.0, 37.4], [11.0, 37.4], [16.0, 36.0], [21.0, 36.4], [23.6, 37.9]],

  // Baltic ⇄ Danish Straits / Kiel Canal ⇄ North Sea
  balticToDanish: [[28.6, 60.2], [24.0, 59.3], [19.5, 57.5], [14.5, 55.6], [12.6, 55.9], [11.0, 55.7], [10.6, 57.4], [8.5, 57.6], [6.0, 56.4], [3.5, 52.0]],
  balticToKiel: [[28.6, 60.2], [24.0, 59.3], [19.5, 57.5], [14.5, 55.0], [11.5, 54.5], [10.1, 54.4], [9.1, 54.3], [8.4, 54.0], [7.0, 54.2], [5.0, 53.6], [3.5, 52.0]],

  // Black Sea ⇄ Turkish Straits ⇄ Mediterranean
  blackSeaToMed: [[30.8, 46.2], [31.5, 44.5], [30.0, 42.5], [29.05, 41.1], [27.0, 40.5], [26.2, 40.0], [25.0, 38.0], [26.0, 35.0], [28.5, 33.4], [30.5, 32.5]],

  // Pacific and Atlantic crossings
  cnToUswc: [[122.3, 30.6], [130.0, 33.5], [142.0, 37.0], [158.0, 42.0], [175.0, 45.5], [-170.0, 46.0], [-155.0, 44.0], [-138.0, 40.0], [-125.0, 35.0], [-118.4, 33.5]],
  cnToPanama: [[122.3, 30.6], [132.0, 30.0], [150.0, 26.0], [170.0, 20.0], [-172.0, 15.0], [-150.0, 11.0], [-125.0, 9.0], [-100.0, 8.0], [-85.0, 8.2], [-79.55, 8.9]],
  panamaToUsec: [[-79.55, 8.9], [-79.9, 9.4], [-77.0, 12.5], [-73.0, 17.5], [-74.5, 23.0], [-77.5, 28.0], [-75.0, 34.5], [-73.8, 40.3]],
  panamaToJp: [[-79.55, 8.9], [-85.0, 8.2], [-105.0, 12.0], [-130.0, 18.0], [-155.0, 24.0], [-175.0, 29.0], [160.0, 33.0], [148.0, 34.5], [140.0, 34.9]],
  usecToNwe: [[-73.8, 40.3], [-68.0, 42.5], [-55.0, 45.5], [-40.0, 48.0], [-25.0, 49.5], [-12.0, 49.5], [-4.0, 50.0], [1.6, 50.9], [3.5, 52.0]],
  usgToUsec: [[-94.7, 29.0], [-90.0, 27.5], [-84.0, 24.5], [-79.5, 26.5], [-77.5, 30.0], [-75.0, 34.5], [-73.8, 40.3]],
  usgToPanama: [[-94.7, 29.0], [-90.0, 25.5], [-85.0, 21.0], [-81.5, 16.0], [-79.9, 9.4], [-79.55, 8.9]],
  usgToCape: [[-94.7, 29.0], [-88.0, 24.0], [-80.0, 21.0], [-72.0, 18.0], [-58.0, 12.0], [-40.0, 2.0], [-25.0, -8.0], [-10.0, -22.0], [3.0, -32.0], [13.0, -35.4], [18.4, -34.9]],
  capeToIo: [[18.4, -34.9], [26.0, -35.4], [38.0, -30.5], [50.0, -22.0], [62.0, -12.0], [72.0, -2.0], [80.0, 5.0]],
  ioToMalaccaCn: [[80.0, 5.0], [85.0, 5.6], [92.0, 6.2], [98.0, 5.4], [100.9, 2.9], [102.6, 1.6], [104.0, 1.2], [105.2, 2.4], [109.0, 8.0], [113.5, 16.0], [118.5, 21.5], [122.8, 25.5], [122.3, 30.6]],
  ioToLombokCn: [[80.0, 5.0], [80.5, 0.5], [86.0, -4.0], [95.0, -9.0], [105.0, -10.6], [113.0, -10.2], [115.8, -8.7], [117.4, -6.6], [118.6, -2.5], [119.0, 3.0], [120.0, 10.0], [121.5, 18.0], [122.8, 25.5], [122.3, 30.6]],
  malaccaCnToJp: [[100.9, 2.9], [102.6, 1.6], [104.0, 1.2], [107.0, 5.0], [113.0, 13.0], [119.0, 20.0], [125.0, 26.0], [133.0, 31.5], [140.0, 34.9]],
  lombokToJp: [[115.8, -8.7], [117.4, -6.6], [119.5, -1.0], [123.0, 5.0], [128.0, 12.0], [133.0, 20.0], [136.0, 28.0], [140.0, 34.9]],
  wafToCape: [[7.0, 4.0], [7.5, -2.0], [9.0, -12.0], [12.0, -24.0], [15.5, -32.5], [18.4, -34.9]],
  brToCape: [[-46.2, -24.2], [-38.0, -27.0], [-25.0, -31.0], [-10.0, -34.0], [3.0, -35.5], [13.0, -35.8], [18.4, -34.9]],
  ausToCn: [[115.5, -21.0], [116.5, -16.0], [118.0, -10.0], [119.5, -3.0], [119.0, 3.0], [120.0, 10.0], [121.5, 18.0], [122.8, 25.5], [122.3, 30.6]],
}

/** Land-side bypasses drawn only when Hormuz closes; capacity is far below the sea route. */
const pipelines = [
  { id: 'east-west', path: [[49.7, 25.9], [45.0, 25.4], [41.0, 24.6], [38.05, 24.09]] },
  { id: 'adcop', path: [[53.7, 23.6], [55.0, 24.2], [56.35, 25.12]] },
]

function chain(...names) {
  const path = []
  for (const name of names) {
    const leg = legs[name]
    if (!leg) throw new Error(`unknown leg: ${name}`)
    for (const point of leg) {
      const last = path[path.length - 1]
      if (last && last[0] === point[0] && last[1] === point[1]) continue
      path.push(point)
    }
  }
  return path
}

/**
 * `cargo` drives the layer chips. `weight` is a schematic traffic weighting used to
 * decide how many light-points ride a lane; it is an editorial visual weighting
 * informed by published volumes, not a measured vessel count — the interface says so.
 * Variants resolve in order: the first one whose gates are all open becomes active.
 */
const laneDefinitions = [
  {
    id: 'cn-nwe', cargo: 'container', weight: 1.0,
    variants: [
      { gates: ['malacca', 'bab', 'suez'], legs: ['cnToMalacca', 'malaccaToIo', 'ioToAs', 'asToBabSuezMed', 'medToGibraltar', 'gibraltarToNwe'] },
      { gates: ['malacca'], legs: ['cnToMalacca', 'malaccaToIo', 'ioToCape', 'capeToNwe'] },
      { gates: [], legs: ['cnToLombokIo', 'ioToCape', 'capeToNwe'] },
    ],
  },
  {
    id: 'sg-nwe', cargo: 'container', weight: 0.62,
    variants: [
      { gates: ['malacca', 'bab', 'suez'], legs: ['sgToMalaccaIo', 'ioToAs', 'asToBabSuezMed', 'medToGibraltar', 'gibraltarToNwe'] },
      { gates: ['malacca'], legs: ['sgToMalaccaIo', 'ioToCape', 'capeToNwe'] },
      { gates: [], legs: ['sgToSundaIo', 'ioToCape', 'capeToNwe'] },
    ],
  },
  {
    id: 'cn-med', cargo: 'container', weight: 0.58,
    variants: [
      { gates: ['malacca', 'bab', 'suez'], legs: ['cnToMalacca', 'malaccaToIo', 'ioToAs', 'asToBabSuezMed', 'medEToPiraeus'] },
      { gates: ['malacca'], legs: ['cnToMalacca', 'malaccaToIo', 'ioToCape', 'capeToGibraltar', 'gibraltarToPiraeus'] },
      { gates: [], legs: ['cnToLombokIo', 'ioToCape', 'capeToGibraltar', 'gibraltarToPiraeus'] },
    ],
  },
  {
    id: 'cn-usec', cargo: 'container', weight: 0.72,
    variants: [
      { gates: ['panama'], legs: ['cnToPanama', 'panamaToUsec'] },
      { gates: ['malacca', 'bab', 'suez'], legs: ['cnToMalacca', 'malaccaToIo', 'ioToAs', 'asToBabSuezMed', 'medToGibraltar', 'gibraltarToUsec'] },
      { gates: ['malacca'], legs: ['cnToMalacca', 'malaccaToIo', 'ioToCape', 'capeToUsec'] },
      { gates: [], legs: ['cnToLombokIo', 'ioToCape', 'capeToUsec'] },
    ],
  },
  { id: 'cn-uswc', cargo: 'container', weight: 0.86, variants: [{ gates: [], legs: ['cnToUswc'] }] },
  { id: 'usec-nwe', cargo: 'container', weight: 0.46, variants: [{ gates: [], legs: ['usecToNwe'] }] },

  {
    id: 'gulf-cn', cargo: 'crude', weight: 0.94,
    variants: [
      { gates: ['hormuz', 'malacca'], legs: ['gulfToAs', 'ioToAs', 'ioToMalaccaCn'], reverseMiddle: true },
      { gates: ['hormuz'], legs: ['gulfToAs', 'ioToAs', 'ioToLombokCn'], reverseMiddle: true },
    ],
  },
  {
    id: 'gulf-nwe', cargo: 'crude', weight: 0.5,
    variants: [
      { gates: ['hormuz', 'bab', 'suez'], legs: ['gulfToAs', 'asToBabSuezMed', 'medToGibraltar', 'gibraltarToNwe'] },
      { gates: ['hormuz'], legs: ['gulfToAs', 'asToCape', 'capeToNwe'] },
    ],
  },
  {
    id: 'baltic-nwe', cargo: 'crude', weight: 0.4,
    variants: [
      { gates: ['danish'], legs: ['balticToDanish'] },
      { gates: [], legs: ['balticToKiel'] },
    ],
  },
  {
    id: 'waf-cn', cargo: 'crude', weight: 0.42,
    variants: [
      { gates: ['malacca'], legs: ['wafToCape', 'capeToIo', 'ioToMalaccaCn'] },
      { gates: [], legs: ['wafToCape', 'capeToIo', 'ioToLombokCn'] },
    ],
  },
  { id: 'usg-nwe', cargo: 'crude', weight: 0.44, variants: [{ gates: [], legs: ['usgToUsec', 'usecToNwe'] }] },

  {
    id: 'qatar-cn', cargo: 'lng', weight: 0.5,
    variants: [
      { gates: ['hormuz', 'malacca'], legs: ['qatarToGulf', 'gulfToAs', 'ioToAs', 'ioToMalaccaCn'], reverseMiddle: true },
      { gates: ['hormuz'], legs: ['qatarToGulf', 'gulfToAs', 'ioToAs', 'ioToLombokCn'], reverseMiddle: true },
    ],
  },
  {
    id: 'qatar-nwe', cargo: 'lng', weight: 0.36,
    variants: [
      { gates: ['hormuz', 'bab', 'suez'], legs: ['qatarToGulf', 'gulfToAs', 'asToBabSuezMed', 'medToGibraltar', 'gibraltarToNwe'] },
      { gates: ['hormuz'], legs: ['qatarToGulf', 'gulfToAs', 'asToCape', 'capeToNwe'] },
    ],
  },
  {
    id: 'usg-jp', cargo: 'lng', weight: 0.44,
    variants: [
      { gates: ['panama'], legs: ['usgToPanama', 'panamaToJp'] },
      { gates: ['malacca'], legs: ['usgToCape', 'capeToIo', 'malaccaToIo', 'malaccaCnToJp'], reverseMiddle: true },
      { gates: [], legs: ['usgToCape', 'capeToIo', 'ioToLombokCn'], swapTailForLombokJp: true },
    ],
  },

  {
    id: 'blacksea-med', cargo: 'grain', weight: 0.38,
    variants: [{ gates: ['bosporus'], legs: ['blackSeaToMed'] }],
  },
  {
    id: 'blacksea-cn', cargo: 'grain', weight: 0.3,
    variants: [
      { gates: ['bosporus', 'suez', 'bab', 'malacca'], legs: ['blackSeaToMed', 'asToBabSuezMed', 'ioToAs', 'ioToMalaccaCn'], reverseFirstTwo: true },
      { gates: ['bosporus', 'malacca'], legs: ['blackSeaToMed', 'gibraltarToMed', 'capeToGibraltar', 'capeToIo', 'ioToMalaccaCn'], reverseCapeChain: true },
    ],
  },
  {
    id: 'br-cn', cargo: 'grain', weight: 0.44,
    variants: [
      { gates: ['malacca'], legs: ['brToCape', 'capeToIo', 'ioToMalaccaCn'] },
      { gates: [], legs: ['brToCape', 'capeToIo', 'ioToLombokCn'] },
    ],
  },
  {
    id: 'usg-cn', cargo: 'grain', weight: 0.4,
    variants: [
      { gates: ['panama'], legs: ['usgToPanama', 'panamaToJp'], swapTailForCn: true },
      { gates: ['malacca'], legs: ['usgToCape', 'capeToIo', 'ioToMalaccaCn'] },
      { gates: [], legs: ['usgToCape', 'capeToIo', 'ioToLombokCn'] },
    ],
  },
  { id: 'aus-cn', cargo: 'grain', weight: 0.5, variants: [{ gates: [], legs: ['ausToCn'] }] },
]

const reverse = (points) => [...points].reverse()

/** A few variants reuse a leg in the opposite direction; resolve those here. */
function buildVariantPath(variant) {
  const names = variant.legs
  if (variant.reverseMiddle) {
    // …gulfToAs ends at the Arabian Sea; ioToAs is written IO→AS, so flip it.
    const parts = names.map((name, index) => (index === names.length - 2 ? reverse(legs[name]) : legs[name]))
    return joinParts(parts)
  }
  if (variant.reverseTail) {
    // …NWE, then back down the Atlantic to the US east coast.
    const parts = names.map((name, index) => (index === names.length - 1 ? reverse(legs[name]) : legs[name]))
    return joinParts(parts)
  }
  if (variant.reverseFirstTwo) {
    // Black Sea → Med, then Med → Suez → Arabian Sea (asToBabSuezMed runs the other way).
    const parts = [legs.blackSeaToMed, reverse(legs.asToBabSuezMed), legs.ioToAs, legs.ioToMalaccaCn]
    parts[2] = reverse(parts[2])
    return joinParts(parts)
  }
  if (variant.reverseCapeChain) {
    const parts = [
      legs.blackSeaToMed,
      reverse(legs.gibraltarToMed),
      reverse(legs.capeToGibraltar),
      legs.capeToIo,
      legs.ioToMalaccaCn,
    ]
    return joinParts(parts)
  }
  if (variant.swapTailForLombokJp) {
    return joinParts([legs.usgToCape, legs.capeToIo, reverse(legs.cnToLombokIo).slice(0, 8), legs.lombokToJp])
  }
  if (variant.swapTailForCn) {
    return joinParts([legs.usgToPanama, legs.panamaToJp.slice(0, -3), [[148.0, 34.5], [136.0, 32.0], [126.0, 31.5], [122.3, 30.6]]])
  }
  return joinParts(names.map((name) => legs[name]))
}

function joinParts(parts) {
  const path = []
  for (const part of parts) {
    for (const point of part) {
      const last = path[path.length - 1]
      if (last && Math.abs(last[0] - point[0]) < 1e-9 && Math.abs(last[1] - point[1]) < 1e-9) continue
      path.push([round1(point[0]), round1(point[1])])
    }
  }
  return path
}

/* --------------------------------------------------------------- distance -- */

const toRadians = (degrees) => (degrees * Math.PI) / 180

function haversineKm(a, b) {
  const R = 6371.0088
  const dLat = toRadians(b[1] - a[1])
  let dLon = b[0] - a[0]
  if (dLon > 180) dLon -= 360
  if (dLon < -180) dLon += 360
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(a[1])) * Math.cos(toRadians(b[1])) * Math.sin(toRadians(dLon) / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

function pathLengthKm(path) {
  let total = 0
  for (let index = 1; index < path.length; index += 1) total += haversineKm(path[index - 1], path[index])
  return total
}

/* ------------------------------------------------------------------ build -- */

const land = await buildLand()

const lanes = laneDefinitions.map((lane) => {
  const variants = lane.variants.map((variant) => {
    const path = buildVariantPath(variant)
    const km = pathLengthKm(path)
    return {
      gates: variant.gates,
      path: path.flat(),
      km: Math.round(km),
      nm: Math.round(km / KM_PER_NM),
      days: Math.round((km / KM_PER_NM / (CRUISE_KNOTS * 24)) * 10) / 10,
    }
  })
  return { id: lane.id, cargo: lane.cargo, weight: lane.weight, variants }
})

const payload = {
  meta: {
    generatedAt: new Date().toISOString().slice(0, 10),
    cruiseKnots: CRUISE_KNOTS,
    eiaYears: [2023, 2024],
    landSource: 'Natural Earth 1:110m Admin 0 Countries (public domain)',
    volumeSource: 'U.S. EIA, World Oil Transit Chokepoints (updated 2026-03-03), million b/d of petroleum liquids',
    geometryNote: 'Schematic trunk corridors through real ports, canals and straits. Not per-ship AIS tracks.',
    everGiven: { grounded: '2021-03-23', refloated: '2021-03-29', days: 6, dailyTradeUsdBillion: 9.6 },
    suezTransits2023: 26000,
    panamaDailySlots: { normal: 36, restricted: 24, restrictedFrom: '2023-11-07' },
    seaborneTradeShare: 0.8,
  },
  gates,
  capeOfGoodHope,
  pipelines: pipelines.map((pipeline) => ({ id: pipeline.id, path: pipeline.path.flat() })),
  land,
  lanes,
}

await mkdir(outputDir, { recursive: true })
const json = JSON.stringify(payload)
await writeFile(outputFile, json)

const laneStats = lanes
  .map((lane) => `${lane.id}: ${lane.variants.map((variant) => `${variant.km}km/${variant.days}d`).join(' → ')}`)
  .join('\n  ')
console.log(`[trade-chokepoints] ${outputFile}`)
console.log(`  land rings ${land.length}, bytes ${json.length.toLocaleString('en-US')}`)
console.log(`  ${laneStats}`)
