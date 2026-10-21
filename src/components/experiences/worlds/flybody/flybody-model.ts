/** Joint limits from pinned flybody MJCF; this is kinematics, not locomotion physics. */
export const FRONT_TIBIA_RANGE = [-1.35, 1.3] as const
export function jointAngle(value: number): number {
  const safe = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.5
  return Math.min(FRONT_TIBIA_RANGE[1], FRONT_TIBIA_RANGE[0] + safe * (FRONT_TIBIA_RANGE[1] - FRONT_TIBIA_RANGE[0]))
}
export type FocusPart = 'all' | 'head' | 'wings'
export function belongsToPart(name: string, part: FocusPart): boolean {
  if (part === 'all') return true
  return part === 'wings' ? name.includes('wing') : /head|antenna|rostrum|haustellum|labrum/.test(name)
}
export function separation(name: string): [number, number, number] {
  if (name === 'head') return [0.09, 0, 0.025]
  if (name.startsWith('wing_')) return [-0.015, name.endsWith('left') ? 0.11 : -0.11, 0.06]
  if (name === 'abdomen') return [-0.095, 0, -0.015]
  if (name.startsWith('coxa_')) return [0, name.endsWith('left') ? 0.055 : -0.055, -0.04]
  return [0, 0, 0]
}
