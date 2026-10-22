/**
 * Pure geometry for the coffee-cup scene: where the cup sits on the canvas,
 * and where the virtual spoon is during each demo stroke.
 *
 * Coordinates are simulation UV (0..1, y up). Radii and distances are in
 * "height units": a UV x offset is converted with `dx * aspect`.
 */

export type Cup = {
  /** centre, UV */
  cx: number
  cy: number
  /** radius of the liquid surface, in canvas-height units */
  r: number
}

export type SpoonMode = 'stir' | 'push'

export type SpoonPoint = { x: number; y: number }

/** Portrait phones: the cup fills the width and sits a little above centre. */
export function cupGeometry(width: number, height: number): Cup {
  if (width <= 0 || height <= 0) return { cx: 0.5, cy: 0.5, r: 0.3 }
  const aspect = width / height
  const portrait = aspect < 0.9
  const byWidth = aspect * 0.5 * (portrait ? 0.9 : 0.82)
  const byHeight = portrait ? 0.29 : 0.35
  const r = Math.min(byWidth, byHeight)
  // On wide screens, slide the cup right so the story card on the left stays clear of it.
  const cx = aspect > 1.1 ? 0.5 + Math.min(0.09, (aspect - 1.1) * 0.18) : 0.5
  return { cx, cy: portrait ? 0.44 : 0.49, r }
}

/** Is a UV point inside the liquid surface? */
export function insideCup(cup: Cup, aspect: number, x: number, y: number, margin = 0): boolean {
  const dx = (x - cup.cx) * aspect
  const dy = y - cup.cy
  return Math.hypot(dx, dy) <= cup.r * (1 - margin)
}

export const SPOON_DURATION: Record<SpoonMode, number> = {
  stir: 3.6,
  push: 0.55,
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
}

/**
 * Where the spoon is `t` seconds into a stroke, or null once it has been
 * lifted out of the cup.
 * - stir: two clockwise laps around the cup, starting slow.
 * - push: one straight, quick stroke from left of centre to right.
 */
export function spoonPosition(mode: SpoonMode, t: number, cup: Cup, aspect: number): SpoonPoint | null {
  const duration = SPOON_DURATION[mode]
  if (t < 0 || t > duration) return null
  if (mode === 'stir') {
    const lapSeconds = 1.6
    // Ease in over the first half lap so the stroke starts gently.
    const ramp = Math.min(1, t / 0.6)
    const travelled = t < 0.6 ? 0.3 * ramp * ramp : 0.3 + (t - 0.6)
    const angle = Math.PI / 2 - (travelled / lapSeconds) * Math.PI * 2
    const radius = cup.r * 0.56
    return { x: cup.cx + (Math.cos(angle) * radius) / aspect, y: cup.cy + Math.sin(angle) * radius }
  }
  const k = easeInOut(t / duration)
  const from = -0.72
  const to = 0.38
  return { x: cup.cx + ((from + (to - from) * k) * cup.r) / aspect, y: cup.cy - cup.r * 0.04 }
}

export type LiquidKind = 'water' | 'oil' | 'honey'

/** The viscosity slider is a damping factor, named by everyday liquids. */
export function liquidKind(viscosity: number): LiquidKind {
  if (viscosity < 0.5) return 'water'
  if (viscosity < 1.2) return 'oil'
  return 'honey'
}
