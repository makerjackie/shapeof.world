import reference from './reference-data.json'
export const TAU = 2 * Math.PI, RAD = Math.PI / 180
export const SPEC = { radius: 63, hubRadius: 1.5, hubHeight: 90, blades: 3, ratedMW: 5, ratedRpm: 12.1, minimumRpm: 6.9, gearbox: 97, generatorEfficiency: .944, density: 1.225, cutIn: 3, cutOut: 25, yawRate: .3, pitchRate: 8, brakeTorqueHSS: 28116.2, inertia: 4e7, optimumTSR: 7.55, referenceCp: .482, voltage: 690, gridVoltage: 33000, polePairs: 3 } as const
export const AREA = Math.PI * SPEC.radius ** 2, BETZ = 16 / 27
export const SECTIONS = reference.sections
export const FOILS = reference.foils
export type PartId = 'rotor' | 'pitch' | 'shaft' | 'gearbox' | 'generator' | 'brake' | 'yaw' | 'converter' | 'tower'
export type ViewId = 'farm' | 'nacelle' | 'blade' | 'electric'
export type Inputs = { wind: number; direction: number; manualPitch: number; manualYaw: number; autoPitch: boolean; autoYaw: boolean; load: number; brake: boolean }
export const DEFAULT_INPUTS: Inputs = { wind: 9, direction: 0, manualPitch: 0, manualYaw: 0, autoPitch: true, autoYaw: true, load: 1, brake: false }
export type State = { elapsed: number; wind: number; omega: number; theta: number; pitch: number; yaw: number; integral: number; energyKWh: number; brakeFraction: number; trip: boolean }
export function initialState(): State { return { elapsed: 0, wind: 9, omega: 9.8 * TAU / 60, theta: .17, pitch: 0, yaw: 0, integral: 0, energyKWh: 0, brakeFraction: 0, trip: false } }
export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))
export const rpm = (omega: number) => omega * 60 / TAU
export function angleDifference(a: number, b: number): number { return ((a - b + 540) % 360 + 360) % 360 - 180 }
export function polar(foil: number, alpha: number): { cl: number; cd: number } {
  const table = FOILS[clamp(Math.round(foil), 0, FOILS.length - 1)].polar
  const a = clamp(alpha, -180, 180)
  let lo = 0, hi = table.length - 1
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (table[mid][0] > a) hi = mid; else lo = mid }
  const t = clamp((a - table[lo][0]) / (table[hi][0] - table[lo][0] || 1), 0, 1)
  return { cl: table[lo][1] + t * (table[hi][1] - table[lo][1]), cd: table[lo][2] + t * (table[hi][2] - table[lo][2]) }
}
export type Element = { r: number; dr: number; chord: number; twist: number; foil: number; alpha: number; inflow: number; cl: number; cd: number; speed: number; induction: number; swirl: number; lift: number; drag: number; thrust: number; torque: number }
/** Quasi-steady, annular BEM with axial/swirl induction and Prandtl tip/root losses. No dynamic stall, shear, structural motion or wake interaction. */
export function aerodynamic(omega: number, pitch: number, wind: number, misalignment = 0) {
  const normalWind = Math.max(0, wind * Math.cos(misalignment * RAD))
  const elements: Element[] = []
  let torque = 0, thrust = 0
  for (let i = 0; i < SECTIONS.length - 1; i++) {
    const p = SECTIONS[i], q = SECTIONS[i + 1], r = (p.span + q.span) / 2 + SPEC.hubRadius, dr = q.span - p.span
    if (dr < .001) continue
    const chord = (p.chord + q.chord) / 2, twist = (p.twist + q.twist) / 2, foil = p.foil
    const solidity = SPEC.blades * chord / (TAU * r)
    let a = .25, swirl = 0, phi = 0, alpha = 0, cl = 0, cd = 0
    for (let iteration = 0; iteration < 18; iteration++) {
      phi = Math.atan2(normalWind * (1 - a), Math.max(.00001, omega * r * (1 + swirl)))
      alpha = phi / RAD - twist - pitch
      ;({ cl, cd } = polar(foil, alpha))
      const sin = Math.max(.001, Math.abs(Math.sin(phi))), cos = Math.cos(phi)
      const tip = 2 / Math.PI * Math.acos(Math.exp(-SPEC.blades * (SPEC.radius - r) / (2 * r * sin)))
      const root = 2 / Math.PI * Math.acos(Math.exp(-SPEC.blades * (r - SPEC.hubRadius) / (2 * SPEC.hubRadius * sin)))
      const loss = Math.max(.04, tip * root), cn = cl * cos + cd * Math.sin(phi), ct = cl * Math.sin(phi) - cd * cos
      const nextA = normalWind < .1 || cn <= 0 ? 0 : clamp(1 / (4 * loss * sin * sin / (solidity * cn) + 1), -.15, .48)
      const nextSwirl = normalWind < .1 || Math.abs(ct) < .00001 ? 0 : clamp(1 / (4 * loss * sin * cos / (solidity * ct) - 1), -.2, .4)
      a = .7 * a + .3 * nextA; swirl = .7 * swirl + .3 * nextSwirl
    }
    phi = Math.atan2(normalWind * (1 - a), Math.max(.00001, omega * r * (1 + swirl)))
    alpha = phi / RAD - twist - pitch
    ;({ cl, cd } = polar(foil, alpha))
    const speed = Math.hypot(normalWind * (1 - a), omega * r * (1 + swirl))
    const lift = .5 * SPEC.density * speed * speed * chord * cl * dr * SPEC.blades
    const drag = .5 * SPEC.density * speed * speed * chord * cd * dr * SPEC.blades
    const normal = lift * Math.cos(phi) + drag * Math.sin(phi), tangential = lift * Math.sin(phi) - drag * Math.cos(phi)
    const moment = tangential * r
    thrust += normal; torque += moment
    elements.push({ r, dr, chord, twist, foil, alpha, inflow: phi / RAD, cl, cd, speed, induction: a, swirl, lift, drag, thrust: normal, torque: moment })
  }
  const windPower = .5 * SPEC.density * AREA * wind ** 3
  const rawPower = torque * omega, rawCp = windPower > 1 ? rawPower / windPower : 0
  // The elementary fixed-point solution is not reliable in high-induction states.
  // Keep a visible, documented energy bound instead of presenting an impossible Cp.
  const limit = BETZ * windPower * Math.max(0, Math.cos(misalignment * RAD)) ** 3
  const scale = rawPower > limit && rawPower > 0 ? limit / rawPower : 1
  return { torque: torque * scale, thrust: thrust * scale, power: rawPower * scale, rawCp, limited: scale < .999, cp: windPower > 1 ? rawPower * scale / windPower : 0, windPower, elements: elements.map(e => ({ ...e, lift: e.lift * scale, drag: e.drag * scale, thrust: e.thrust * scale, torque: e.torque * scale })) }
}
const RATED_OMEGA = SPEC.ratedRpm * TAU / 60
const TORQUE_K = .5 * SPEC.density * AREA * SPEC.referenceCp * SPEC.radius ** 3 / SPEC.optimumTSR ** 3
export function operatingState(state: State, input: Inputs): 'parked' | 'braking' | 'low' | 'starting' | 'limited' | 'generating' {
  if (state.trip || input.brake || state.brakeFraction > .05) return state.omega < .05 ? 'parked' : 'braking'
  if (state.wind < SPEC.cutIn) return 'low'
  if (rpm(state.omega) < SPEC.minimumRpm) return 'starting'
  if (state.pitch > .5) return 'limited'
  return 'generating'
}
export function generatorTorque(state: State, input: Inputs): number {
  if (state.trip || input.brake || state.wind < SPEC.cutIn || state.wind >= SPEC.cutOut) return 0
  const startup = clamp((rpm(state.omega) - 4) / 2.9, 0, 1)
  const ratedTorque = SPEC.ratedMW * 1e6 / (SPEC.generatorEfficiency * Math.max(.2, state.omega))
  const region2 = TORQUE_K * state.omega ** 2
  const transition = clamp((rpm(state.omega) / SPEC.ratedRpm - .92) / .08, 0, 1)
  return Math.min((region2 + (ratedTorque - region2) * transition) * input.load * startup, ratedTorque)
}
export function readings(state: State, input: Inputs) {
  const misalignment = angleDifference(input.direction, state.yaw)
  const aero = aerodynamic(state.omega, state.pitch, state.wind, misalignment)
  const genTorque = generatorTorque(state, input)
  const brakeTorque = state.brakeFraction * SPEC.brakeTorqueHSS * SPEC.gearbox
  const shaftPower = genTorque * state.omega, electricalPower = shaftPower * SPEC.generatorEfficiency, brakePower = brakeTorque * state.omega
  const storagePower = aero.power - shaftPower - brakePower
  return { ...aero, genTorque, brakeTorque, shaftPower, electricalPower, generatorLoss: shaftPower - electricalPower, brakePower, storagePower, rotorRPM: rpm(state.omega), generatorRPM: rpm(state.omega) * SPEC.gearbox, tipSpeed: state.omega * SPEC.radius, tsr: state.wind > .01 ? state.omega * SPEC.radius / state.wind : 0, misalignment, frequency: rpm(state.omega) * SPEC.gearbox * SPEC.polePairs / 60, current: electricalPower / (Math.sqrt(3) * SPEC.voltage), status: operatingState(state, input) }
}
const pitchSchedule = new Map<string, number>()
/** Teaching feed-forward schedule solved from this model's own BEM, plus speed feedback. Not the OpenFAST controller. */
function feedForward(wind: number, load: number): number {
  if (wind < 11) return 0
  const v = Math.round(wind * 10) / 10, l = Math.round(load * 20) / 20, key = `${v}:${l}`
  const cached = pitchSchedule.get(key); if (cached !== undefined) return cached
  const target = SPEC.ratedMW * 1e6 / SPEC.generatorEfficiency * Math.min(1, l)
  let lo = 0, hi = 45
  if (aerodynamic(RATED_OMEGA, 0, v).power <= target) return 0
  for (let i = 0; i < 9; i++) { const mid = (lo + hi) / 2; if (aerodynamic(RATED_OMEGA, mid, v).power > target) lo = mid; else hi = mid }
  const result = (lo + hi) / 2; pitchSchedule.set(key, result); return result
}
export function advance(previous: State, seconds: number, input: Inputs): State {
  if (!Number.isFinite(seconds) || seconds <= 0) return previous
  let state = { ...previous }, remaining = Math.min(seconds, 120)
  while (remaining > .000001) {
    const dt = Math.min(.15, remaining); remaining -= dt
    state.wind += (input.wind - state.wind) * (1 - Math.exp(-dt / 3))
    state.trip ||= state.wind >= SPEC.cutOut || rpm(state.omega) > SPEC.ratedRpm * 1.2
    state.brakeFraction += clamp((state.trip || input.brake ? 1 : 0) - state.brakeFraction, -dt / .6, dt / .6)
    const safe = state.trip || input.brake || state.wind < SPEC.cutIn
    const yawTarget = input.autoYaw ? input.direction : input.manualYaw
    state.yaw += clamp(angleDifference(yawTarget, state.yaw), -SPEC.yawRate * dt, SPEC.yawRate * dt)
    const error = state.omega - RATED_OMEGA
    if (input.autoPitch && !safe) state.integral = clamp(state.integral + error * dt * 12, 0, 75)
    const targetPitch = safe ? 90 : input.autoPitch ? clamp(feedForward(state.wind, input.load) + 30 * error + state.integral, 0, 85) : input.manualPitch
    state.pitch += clamp(targetPitch - state.pitch, -SPEC.pitchRate * dt, SPEC.pitchRate * dt)
    const r = readings(state, input)
    const acceleration = (r.torque - r.genTorque - r.brakeTorque) / SPEC.inertia
    const before = state.omega
    state.omega = Math.max(0, before + acceleration * dt)
    state.theta += (before + state.omega) * .5 * dt
    state.elapsed += dt; state.energyKWh += r.electricalPower * dt / 3.6e6
  }
  return state
}
export function restart(state: State, input: Inputs): State { return input.wind < SPEC.cutOut && state.wind < SPEC.cutOut && !input.brake ? { ...state, trip: false, integral: 0 } : state }

export const PLANETARY = [{sun:18,ring:72,module:1/36,x:.4,inputRatio:1},{sun:24,ring:96,module:1.76/96,x:1.5,inputRatio:5}] as const
export const FINAL_MESH = {wheel:97,pinion:25,module:.012} as const

/** Nodal section readouts use their own radius, twist and foil, with nearby annular induction. */
export function sectionSample(state: State, input: Inputs, index: number, aero = aerodynamic(state.omega, state.pitch, state.wind, angleDifference(input.direction, state.yaw))) {
  const section = SECTIONS[clamp(Math.round(index), 0, SECTIONS.length - 1)], e = aero.elements[Math.min(index, aero.elements.length - 1)]
  const r = section.span + SPEC.hubRadius, axial = Math.max(0, state.wind * Math.cos(angleDifference(input.direction, state.yaw) * RAD)) * (1 - e.induction), tangential = state.omega * r * (1 + e.swirl)
  const inflow = Math.atan2(axial, Math.max(.00001, tangential)) / RAD, alpha = inflow - section.twist - state.pitch
  return { ...section, r, inflow, alpha, speed: Math.hypot(axial, tangential), ...polar(section.foil, alpha) }
}
