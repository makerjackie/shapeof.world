/** Qualitative visual mapping, not a solution of reacting-flow equations. */
export function flameShape(gravity: number) {
  const g = Number.isFinite(gravity) ? Math.max(0, Math.min(1, gravity)) : 1
  const buoyancy = Math.sqrt(g)
  return { gravity: g, buoyancy, height: 0.78 + 0.92 * buoyancy, radius: 0.60 - 0.29 * buoyancy }
}
export function relax(current: number, target: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-Math.max(0, dt) * 3))
}
