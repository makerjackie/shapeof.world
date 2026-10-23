import { idmAcceleration } from './idm'
import type { IDMParameters, Lane } from './types'
export interface MobilInput {
  currentAcceleration: number
  targetAcceleration: number
  targetFollowerBefore: number
  targetFollowerAfter: number
  oldFollowerBefore: number
  oldFollowerAfter: number
  right: boolean
  mandatoryDistance?: number
  highway?: boolean
  acceleration?: number
}
export interface MobilDecision { safe: boolean; incentive: number; accepted: boolean }
/** Kesting, Treiber & Helbing (2007), including route urgency and keep-right bias. */
export function mobilDecision(input: MobilInput): MobilDecision {
  const d0 = input.highway ? 500 : 150
  const urgency = input.mandatoryDistance === undefined ? 0 : (input.acceleration ?? 1.5) * Math.max(0, 1 - input.mandatoryDistance / d0)
  const hardMerge = input.mandatoryDistance !== undefined && input.mandatoryDistance < 45
  const safe = input.targetFollowerAfter > -(hardMerge ? 6 : 4)
  const incentive = input.targetAcceleration - input.currentAcceleration + 0.2 * ((input.targetFollowerAfter - input.targetFollowerBefore) + (input.oldFollowerAfter - input.oldFollowerBefore)) + (input.right ? 0.2 : -0.2) + urgency
  return { safe, incentive, accepted: safe && incentive > 0.1 }
}
export function laneChangeAllowed(lane: Lane, s: number): boolean {
  return !lane.solid?.some(({ start, end }) => s >= start && s <= end)
}
export function followerAcceleration(speed: number, gap: number, leaderSpeed: number, parameters: IDMParameters): number {
  return idmAcceleration(speed, gap, leaderSpeed, parameters)
}
export function laneChangeBlend(elapsed: number, duration: number): number {
  const t = Math.min(1, Math.max(0, elapsed / duration))
  // Quintic smoothstep: continuous lateral velocity and acceleration at both ends.
  return t * t * t * (10 + t * (-15 + 6 * t))
}
