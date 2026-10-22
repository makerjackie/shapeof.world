/** Qualitative visual mapping, not a solution of reacting-flow equations. */
export function flameShape(gravity: number) {
  const g = Number.isFinite(gravity) ? Math.max(0, Math.min(1, gravity)) : 1
  const buoyancy = Math.sqrt(g)
  return { gravity: g, buoyancy, height: 0.78 + 0.92 * buoyancy, radius: 0.60 - 0.29 * buoyancy }
}
export function relax(current: number, target: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-Math.max(0, dt) * 3))
}

/**
 * Where the candle sits on screen. Portrait phones get a larger flame; the
 * chemistry views shrink it and lower it so the reaction card has room above.
 * The shader reads the same numbers, so DOM labels stay pinned to the flame.
 */
export function sceneFrame(aspect: number, chemistry = 0) {
  const c = Number.isFinite(chemistry) ? Math.max(0, Math.min(1, chemistry)) : 0
  if (!(aspect < .8)) return { scale: 3.1, offset: .62 }
  return { scale: 4.3 + .9 * c, offset: 1.12 + .72 * c }
}

/** Shader scene coordinates (candle top at y = 0) to CSS pixels in a w x h canvas. */
export function sceneToScreen(x: number, y: number, w: number, h: number, frame: { scale: number; offset: number }) {
  return { x: w / 2 + (x / frame.scale) * h, y: h / 2 - ((y - frame.offset) / frame.scale) * h }
}
