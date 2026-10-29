/** All dimensions are millimetres. Original teaching design, not a production calibre. */
export const TAU = Math.PI * 2
export type WheelId = 'barrel' | 'center' | 'third' | 'fourth' | 'escape'
export type PartId = WheelId | 'balance' | 'fork' | 'spring' | 'crown' | 'motion' | 'bridge' | 'jewel'
export type ViewId = 'movement' | 'escapement' | 'spring' | 'dial'
export type Point = [number, number]
export type Wheel = { id: WheelId; teeth: number; pinion: number; module: number; x: number; y: number; z: number; ratio: number; phase: number }
const center: Point = [-1.4, 2.2]
function beside(at: Point, distance: number, degrees: number): Point {
  const a = degrees * Math.PI / 180
  return [at[0] + Math.cos(a) * distance, at[1] + Math.sin(a) * distance]
}
const barrel = beside(center, .1 * (96 + 12) / 2, 140)
const third = beside(center, .075 * (80 + 10) / 2, 10)
const fourth = beside(third, .065 * (75 + 10) / 2, -58)
const escape = beside(fourth, .035 * (96 + 6) / 2, -118)
/** Ratios are signed revolutions relative to the center (minute) wheel. */
export const WHEELS: Wheel[] = [
  { id: 'barrel', teeth: 96, pinion: 0, module: .1, x: barrel[0], y: barrel[1], z: 1.05, ratio: -1 / 8, phase: .012 },
  { id: 'center', teeth: 80, pinion: 12, module: .075, x: center[0], y: center[1], z: 1.8, ratio: 1, phase: .03 },
  { id: 'third', teeth: 75, pinion: 10, module: .065, x: third[0], y: third[1], z: 2.55, ratio: -8, phase: .018 },
  { id: 'fourth', teeth: 96, pinion: 10, module: .035, x: fourth[0], y: fourth[1], z: 3.3, ratio: 60, phase: .013 },
  { id: 'escape', teeth: 15, pinion: 6, module: .18, x: escape[0], y: escape[1], z: 4.05, ratio: -960, phase: 0 },
]
// Choose initial phases so tooth centres face the neighbouring gaps at every mesh.
for (let i = 1; i < WHEELS.length; i++) {
  const a = WHEELS[i - 1], b = WHEELS[i]
  const theta = Math.atan2(b.y - a.y, b.x - a.x)
  b.phase = ((a.teeth + b.pinion) * theta + b.pinion * Math.PI - Math.PI - a.teeth * a.phase) / b.pinion
}
export const BALANCE: Point = [-1.8, -5.1]
export const FORK: Point = [1.12, -2.38]
export const REFERENCE_HZ = 4
export const RESERVE_HOURS = 40
export const ESCAPE_TEETH = 15
export const BEATS_PER_ESCAPE_TURN = ESCAPE_TEETH * 2
export type Settings = { length: number; inertia: number; friction: number }
export const DEFAULT_SETTINGS: Settings = { length: 1, inertia: 1, friction: 1 }
export type WatchState = { elapsed: number; beats: number; phase: number; reserve: number; indicated: number; winding: number }
export function initialState(): WatchState {
  return { elapsed: 0, beats: 0, phase: 0, reserve: .76, indicated: 0, winding: 0 }
}
export function frequency(s: Settings): number {
  return REFERENCE_HZ / Math.sqrt(Math.max(.1, s.length) * Math.max(.1, s.inertia))
}
export function dailyRate(s: Settings): number { return (frequency(s) / REFERENCE_HZ - 1) * 86400 }
/** Reserve is a deliberately simple energy store. Wear/friction changes the load, not the ideal natural frequency. */
export function advance(state: WatchState, dt: number, settings: Settings): WatchState {
  if (!Number.isFinite(dt) || dt <= 0 || state.reserve <= 0) return state
  const load = Math.max(.25, settings.friction)
  const availableSeconds = state.reserve * RESERVE_HOURS * 3600 / load
  const running = Math.min(dt, availableSeconds)
  const f = frequency(settings)
  const totalPhase = state.phase + running * f * 2
  const newBeats = Math.floor(totalPhase)
  const beatCount = state.beats + newBeats
  return {
    ...state, elapsed: state.elapsed + running, beats: beatCount,
    phase: totalPhase - newBeats,
    reserve: Math.max(0, state.reserve - running * load / (RESERVE_HOURS * 3600)),
    indicated: beatCount / (REFERENCE_HZ * 2),
  }
}
export function wind(state: WatchState, turns = 1): WatchState {
  return { ...state, reserve: Math.min(1, state.reserve + Math.max(0, turns) / 24), winding: state.winding + Math.max(0, turns) }
}
/** A tooth advances half a pitch per beat. Release occupies 18% of a beat; lock holds the remainder. */
export function escapeAdvance(state: WatchState): number {
  const release = Math.min(1, state.phase / .18)
  const smooth = release * release * (3 - 2 * release)
  return state.beats + smooth
}
/** Hands share the train's exact release interpolation, rather than an independent ticking clock. */
export function indicationSeconds(state: WatchState): number { return escapeAdvance(state) / (REFERENCE_HZ * 2) }
export function wheelAngle(wheel: Wheel, state: WatchState): number {
  return wheel.phase - escapeAdvance(state) / (REFERENCE_HZ * 2 * 3600) * TAU * wheel.ratio
}
export function amplitude(state: WatchState, s: Settings): number {
  if (state.reserve <= 0) return 0
  return Math.min(300, 165 + 130 * Math.sqrt(state.reserve) / Math.sqrt(s.friction)) * Math.PI / 180
}
export function balanceAngle(state: WatchState, s: Settings): number {
  return Math.sin((state.beats + state.phase) * Math.PI) * amplitude(state, s)
}
export function forkAngle(state: WatchState): number {
  const phase = state.phase
  const sign = state.beats % 2 ? -1 : 1
  if (phase < .18) {
    const t = Math.max(0, phase / .18)
    return sign * (-1 + 2 * t * t * (3 - 2 * t)) * .14
  }
  return sign * .14
}
export type EscapementStage = 'release' | 'impulse' | 'lock'
export function escapementStage(state: WatchState): EscapementStage {
  return state.phase < .06 ? 'release' : state.phase < .18 ? 'impulse' : 'lock'
}
export function formatTime(seconds: number): string {
  const value = ((seconds + 10 * 3600 + 8 * 60) % 86400 + 86400) % 86400
  return [Math.floor(value / 3600), Math.floor(value / 60) % 60, Math.floor(value) % 60].map(v => String(v).padStart(2, '0')).join(':')
}
export function remainingHours(state: WatchState, s: Settings): number { return state.reserve * RESERVE_HOURS / Math.max(.25, s.friction) }
export function ratioFor(id: WheelId): number { return WHEELS.find(w => w.id === id)!.ratio }
export const TRAIN_MESHES = [
  { driver: 'barrel', driven: 'center', driving: 96, pinion: 12, module: .1 },
  { driver: 'center', driven: 'third', driving: 80, pinion: 10, module: .075 },
  { driver: 'third', driven: 'fourth', driving: 75, pinion: 10, module: .065 },
  { driver: 'fourth', driven: 'escape', driving: 96, pinion: 6, module: .035 },
] as const
