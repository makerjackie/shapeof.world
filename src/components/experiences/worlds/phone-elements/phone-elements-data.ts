/**
 * Phone elements — shared types, periodic-table geometry and the exploded-view layout
 * of a generic smartphone.
 *
 * The atlas itself is baked by scripts/generate-phone-elements-data.mjs into
 * /assets/phone-elements/atlas.json. Nothing here is brand data: every compartment is
 * an ordinary rounded plate drawn from these normalised rectangles.
 */

export type PhonePartId =
  | 'glass'
  | 'display'
  | 'frame'
  | 'board'
  | 'soc'
  | 'camera'
  | 'speaker'
  | 'motor'
  | 'battery'
  | 'antenna'

export type AtlasPart = {
  id: PhonePartId
  zh: string
  en: string
  tagZh: string
  tagEn: string
}

export type ProductionBasis = 'mine' | 'smelter' | 'refinery'

export type AtlasElement = {
  z: number
  sym: string
  zh: string
  en: string
  /** Measured milligrams in one device, battery excluded. */
  mg: number
  /** Stoichiometric estimate for the cell, when the element also lives in the battery. */
  batteryMg?: number
  /** 1 when the headline mass is an estimate rather than an ICP measurement. */
  est?: 1
  /** Crustal abundance, ppm by mass. */
  crust?: number
  parts: Array<PhonePartId>
  roleZh?: string
  roleEn?: string
  basis?: ProductionBasis
  /** [ISO alpha-2, share of world production in percent] */
  top?: Array<[string, number]>
}

export type AtlasCountry = { zh: string; en: string; lon: number; lat: number }

export type Atlas = {
  meta: {
    deviceMassG: number
    magnetMassG: number
    boardMassG: number
    measuredMetals: number
    devicesPerTonne: number
    goldOreFactorDevice: number
    goldOreFactorBoard: number
    productionYear: number
    productionRelease: string
    measurementYears: string
  }
  parts: Array<AtlasPart>
  elements: Array<AtlasElement>
  countries: Record<string, AtlasCountry>
  /** Flattened lon/lat rings of the Natural Earth 110m land silhouette. */
  land: Array<Array<number>>
}

export const ATLAS_URL = '/assets/phone-elements/atlas.json'

/* ----------------------------------------------------------- periodic grid */

export type TableCell = { z: number; col: number; row: number }

/**
 * Standard 18-column layout. Lanthanides and actinides drop to two detached rows
 * so the main block keeps its familiar silhouette.
 */
function buildTable(): Array<TableCell> {
  const cells: Array<TableCell> = [
    { z: 1, col: 1, row: 1 },
    { z: 2, col: 18, row: 1 },
  ]
  const shortRows: Array<[number, number]> = [[3, 2], [11, 3]]
  for (const [start, row] of shortRows) {
    for (let i = 0; i < 8; i += 1) {
      cells.push({ z: start + i, col: i < 2 ? i + 1 : i + 11, row })
    }
  }
  for (const [start, row] of [[19, 4], [37, 5]] as Array<[number, number]>) {
    for (let i = 0; i < 18; i += 1) cells.push({ z: start + i, col: i + 1, row })
  }
  // Periods 6 and 7: two s-block cells, then the f-block detaches, then d and p blocks.
  for (const [start, row, fRow] of [[55, 6, 9], [87, 7, 10]] as Array<[number, number, number]>) {
    cells.push({ z: start, col: 1, row }, { z: start + 1, col: 2, row })
    for (let i = 0; i < 15; i += 1) cells.push({ z: start + 2 + i, col: i + 3, row: fRow })
    for (let i = 0; i < 15; i += 1) cells.push({ z: start + 17 + i, col: i + 4, row })
  }
  return cells
}

export const PERIODIC_CELLS = buildTable()
export const PERIODIC_COLUMNS = 18
/** Rows 1–7, a narrow gap, then the two detached f-block rows. */
export const PERIODIC_ROWS = 9.5

export function tableRowOffset(row: number): number {
  return row <= 7 ? row - 1 : row - 1 - 0.6
}

/* ---------------------------------------------------- exploded phone plates */

export type PlateShape = {
  id: PhonePartId
  /** Stack depth: 0 sits deepest, 9 is the cover glass nearest the viewer. */
  layer: number
  /** Footprint in phone-local units; u across the width, v along the length, both in [-1, 1]. */
  u: number
  v: number
  halfU: number
  halfV: number
  kind: 'plate' | 'module'
  radius: number
}

/**
 * A generic candy-bar handset: nothing here is measured from a shipping product,
 * it is the ordinary layer order of a smartphone teardown.
 */
export const PLATES: Array<PlateShape> = [
  { id: 'battery', layer: 0, u: 0, v: 0.26, halfU: 0.35, halfV: 0.45, kind: 'plate', radius: 0.04 },
  { id: 'antenna', layer: 1, u: 0, v: 0, halfU: 0.45, halfV: 0.99, kind: 'plate', radius: 0.09 },
  { id: 'speaker', layer: 2, u: -0.19, v: 0.79, halfU: 0.19, halfV: 0.09, kind: 'module', radius: 0.03 },
  { id: 'motor', layer: 2, u: 0.26, v: 0.74, halfU: 0.11, halfV: 0.11, kind: 'module', radius: 0.11 },
  { id: 'board', layer: 3, u: 0, v: -0.5, halfU: 0.41, halfV: 0.42, kind: 'plate', radius: 0.035 },
  { id: 'soc', layer: 4, u: -0.05, v: -0.5, halfU: 0.15, halfV: 0.13, kind: 'module', radius: 0.02 },
  { id: 'camera', layer: 5, u: 0.21, v: -0.78, halfU: 0.17, halfV: 0.14, kind: 'module', radius: 0.03 },
  { id: 'frame', layer: 6, u: 0, v: 0, halfU: 0.48, halfV: 1, kind: 'plate', radius: 0.1 },
  { id: 'display', layer: 7, u: 0, v: 0.02, halfU: 0.42, halfV: 0.93, kind: 'plate', radius: 0.06 },
  { id: 'glass', layer: 8, u: 0, v: 0, halfU: 0.47, halfV: 1, kind: 'plate', radius: 0.1 },
]

export const MAX_LAYER = 8

/* ------------------------------------------------------------------ helpers */

export function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value))
}

export function approach(current: number, target: number, dt: number, tau: number): number {
  return current + (target - current) * (1 - Math.exp(-dt / tau))
}

/** Total milligrams of an element in one device, battery included. */
export function totalMg(element: AtlasElement): number {
  return element.mg + (element.batteryMg ?? 0)
}

/** Share of world production held by the three largest producers, in percent. */
export function topThreeShare(element: AtlasElement): number | null {
  if (!element.top || element.top.length === 0) return null
  return element.top.slice(0, 3).reduce((sum, [, share]) => sum + share, 0)
}

/** Concentration of the whole selection, weighted by nothing but presence. */
export function averageConcentration(elements: Array<AtlasElement>): number | null {
  const shares = elements.map(topThreeShare).filter((share): share is number => share !== null)
  if (shares.length === 0) return null
  return shares.reduce((sum, share) => sum + share, 0) / shares.length
}

export function formatMass(mg: number): string {
  if (mg >= 1_000) return `${(mg / 1_000).toFixed(mg >= 10_000 ? 1 : 2)} g`
  if (mg >= 10) return `${mg.toFixed(0)} mg`
  if (mg >= 1) return `${mg.toFixed(1)} mg`
  return `${mg.toFixed(2)} mg`
}

export function formatCrust(ppm: number): string {
  if (ppm >= 10_000) return `${(ppm / 10_000).toFixed(1)}%`
  if (ppm >= 1) return `${ppm.toFixed(ppm >= 100 ? 0 : 1)} ppm`
  if (ppm >= 0.01) return `${ppm.toFixed(3)} ppm`
  return `${(ppm * 1_000).toFixed(1)} ppb`
}
