import type { IDMParameters } from './types'

export const CITY_PARAMETERS: IDMParameters = { v0: 50 / 3.6, T: 1.2, s0: 2, a: 1.5, b: 2 }
export const HIGHWAY_PARAMETERS: IDMParameters = { v0: 110 / 3.6, T: 1.3, s0: 2, a: 1.2, b: 2 }

/** Treiber, Hennecke & Helbing (2000), net bumper-to-bumper gap in metres. */
export function idmAcceleration(v: number, gap: number, leaderSpeed: number, p: IDMParameters): number {
  const speed = Math.max(0, v)
  const desiredGap = p.s0 + Math.max(0, speed * p.T + speed * (speed - leaderSpeed) / (2 * Math.sqrt(p.a * p.b)))
  const interaction = Number.isFinite(gap) ? (desiredGap / Math.max(0.05, gap)) ** 2 : 0
  // The physical emergency-deceleration cap keeps the fixed-step integrator finite.
  return Math.max(-9, p.a * (1 - (speed / Math.max(0.1, p.v0)) ** 4 - interaction))
}

/** Stationary, homogeneous IDM solution for a specified net gap. */
export function equilibriumSpeed(gap: number, p: IDMParameters = CITY_PARAMETERS): number {
  if (gap <= p.s0) return 0
  let lo = 0
  let hi = p.v0
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2
    if (idmAcceleration(mid, gap, mid, p) > 0) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}
