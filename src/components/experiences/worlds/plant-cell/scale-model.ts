import { GRANUM_SECTION_ANCHOR_LOCAL } from './chloro-model'
import { LEAF_ENTRY, LEAF_MIDRIB_X } from './leaf-model'
import { Euler, Quaternion, Vector3 } from 'three'

/** s = log10(horizontal field of view / metre). Smaller values move inward. */
export const SCALE_MIN = -6.5
export const SCALE_MAX = -0.58
// A 70 µm-tall cell occupies ~78% of a 1600 × 1000 perspective viewport.
export const HERO_SCALE = -3.86
export const MOBILE_HERO_SCALE = -4.22
export const SCALE_DEFAULT = HERO_SCALE
export const TRANSITION_WIDTH = 0.3

export type PlantLayer = 'leaf' | 'section' | 'cell' | 'chloroplast'
export type LayerWeights = Record<PlantLayer, number>
export type PositionUm = [number, number, number]

export const LAYERS = [
  { id: 'leaf', label: '叶片', labelEn: 'Leaf', scale: -0.62 },
  { id: 'section', label: '叶片截面', labelEn: 'Leaf section', scale: -3.0 },
  { id: 'cell', label: '叶肉细胞', labelEn: 'Mesophyll cell', scale: SCALE_DEFAULT },
  { id: 'chloroplast', label: '叶绿体', labelEn: 'Chloroplast', scale: -5.22 },
] as const

export const SCALE_TICKS = [
  { scale: -1, label: '10 cm' },
  { scale: -2, label: '1 cm' },
  { scale: -3, label: '1 mm' },
  { scale: -4, label: '100 μm' },
  { scale: -5, label: '10 μm' },
  { scale: -6, label: '1 μm' },
] as const

export const CHLOROPLAST_ANCHOR_UM: PositionUm = [13.55, 6, 0]
// The chosen lens lies on the +x wall: broad-face normal +x, long axis -y.
export const CHLOROPLAST_ROTATION: PositionUm = [0, Math.PI / 2, -Math.PI / 2]
export const CHLOROPLAST_RADII_UM: PositionUm = [3, 1.9, 1.15]
export const CHLOROPLAST_QUATERNION = new Quaternion().setFromEuler(new Euler(...CHLOROPLAST_ROTATION))
export const GRANUM_EDGE_OFFSET_UM: PositionUm = new Vector3(...GRANUM_SECTION_ANCHOR_LOCAL).applyQuaternion(CHLOROPLAST_QUATERNION).toArray()

const transitions = [
  { outer: 'leaf', inner: 'section', center: -2.8 },
  { outer: 'section', inner: 'cell', center: -3.6 },
  { outer: 'cell', inner: 'chloroplast', center: -5.1 },
] as const

export function clampScale(scale: number): number {
  return Number.isFinite(scale) ? Math.max(SCALE_MIN, Math.min(SCALE_MAX, scale)) : SCALE_DEFAULT
}

export function smoothstep(from: number, to: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - from) / (to - from)))
  return t * t * (3 - 2 * t)
}

/** Only adjacent layers overlap, and their weights form a partition of unity. */
export function getLayerWeights(scale: number): LayerWeights {
  const s = clampScale(scale)
  const weights: LayerWeights = { leaf: 0, section: 0, cell: 0, chloroplast: 0 }
  for (const { outer, inner, center } of transitions) {
    const halfWidth = TRANSITION_WIDTH / 2
    if (s >= center + halfWidth) {
      weights[outer] = 1
      return weights
    }
    if (s > center - halfWidth) {
      const innerWeight = smoothstep(center + halfWidth, center - halfWidth, s)
      weights[outer] = 1 - innerWeight
      weights[inner] = innerWeight
      return weights
    }
  }
  weights.chloroplast = 1
  return weights
}

export function getActiveLayer(scale: number): PlantLayer {
  const weights = getLayerWeights(scale)
  return LAYERS.reduce<PlantLayer>((current, layer) => weights[layer.id] > weights[current] ? layer.id : current, 'leaf')
}

export function scaleToMicrometers(scale: number): number {
  return 10 ** (clampScale(scale) + 6)
}

/** Frame the whole section, return to the upper cell, then align with its lens. */
export function getAnchorUm(scale: number, focus?: { positionUm: PositionUm; quaternion: [number, number, number, number] }): PositionUm {
  const s = clampScale(scale)
  const leafProgress = smoothstep(-1.7, -2.65, s)
  const surfaceWeight = 1 - smoothstep(-2.65, -3.05, s)
  const sectionProgress = smoothstep(-2.65, -3.05, s) * (1 - smoothstep(-3.05, -3.75, s))
  const chloroplastProgress = smoothstep(-4.35, -4.95, s)
  const granumProgress = smoothstep(-5.45, -6.3, s)
  const lens = focus?.positionUm ?? CHLOROPLAST_ANCHOR_UM
  const edge = focus ? new Vector3(...GRANUM_SECTION_ANCHOR_LOCAL).applyQuaternion(new Quaternion(...focus.quaternion)).toArray() : GRANUM_EDGE_OFFSET_UM
  return [
    (LEAF_MIDRIB_X * (1 - leafProgress) + LEAF_ENTRY[0] * leafProgress) * surfaceWeight + lens[0] * chloroplastProgress + edge[0] * granumProgress,
    LEAF_ENTRY[1] * surfaceWeight - 190 * sectionProgress + lens[1] * chloroplastProgress + edge[1] * granumProgress,
    (12000 * (1 - leafProgress) + LEAF_ENTRY[2] * leafProgress) * surfaceWeight + lens[2] * chloroplastProgress + edge[2] * granumProgress,
  ]
}

export function zoomFlightDuration(from: number, to: number): number {
  return Math.min(3, 1 + Math.abs(clampScale(to) - clampScale(from)) * 0.42)
}

export function formatLength(meters: number): string {
  if (!(meters > 0) || !Number.isFinite(meters)) return '0 μm'
  const [unit, divisor] = meters >= 0.01 - 1e-12 ? ['cm', 0.01] as const
    : meters >= 0.001 - 1e-12 ? ['mm', 0.001] as const
      : meters >= 1e-6 - 1e-15 ? ['μm', 1e-6] as const
        : ['nm', 1e-9] as const
  return `${Number((meters / divisor).toPrecision(3))} ${unit}`
}

/** Choose the largest 1–2–5 length no longer than the target screen width. */
export function getScaleBar(scale: number, viewportWidthPx: number, targetPx = 100) {
  const viewport = Number.isFinite(viewportWidthPx) && viewportWidthPx > 0 ? viewportWidthPx : 1
  const target = Number.isFinite(targetPx) && targetPx > 0 ? Math.min(targetPx, viewport) : 100
  const fieldMeters = 10 ** clampScale(scale)
  const desiredMeters = fieldMeters * target / viewport
  const power = 10 ** Math.floor(Math.log10(desiredMeters))
  const mantissa = desiredMeters / power
  const lengthMeters = (mantissa >= 5 - 1e-10 ? 5 : mantissa >= 2 - 1e-10 ? 2 : 1) * power
  return { lengthMeters, widthPx: viewport * lengthMeters / fieldMeters, label: formatLength(lengthMeters) }
}

/** The view changes continuously across the same anatomical axes; user orbit is additive. */
export function getCameraPose(scale: number) {
  const s=clampScale(scale)
  const dive=smoothstep(-1.7,-2.65,s), section=smoothstep(-2.65,-3.55,s), chloroplast=smoothstep(-4.85,-5.5,s)
  const membrane=smoothstep(-6.05,-6.5,s)
  const pitch=(70-30*dive-22*section)*(1-chloroplast)-9*chloroplast+3*membrane
  return {yaw:(35-27*chloroplast-6*membrane)*Math.PI/180,pitch:pitch*Math.PI/180,roll:chloroplast*Math.PI/2}
}
