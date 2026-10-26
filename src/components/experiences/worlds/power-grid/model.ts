/** Single coherent area, on a 10 GW system base. See SOURCES.md for units and limitations. */
export const BASE_MW = 10_000
export const F0 = 50
export const DT = 0.01
export const END_TIME = 180
export interface Settings {
  inertia: number // seconds; surviving aggregate, on BASE_MW
  lossMW: number
  reserveMW: number
  governor: boolean
  agc: boolean
  protection: boolean
}
export const DEFAULT: Settings = { inertia: 5, lossMW: 1000, reserveMW: 2500, governor: true, agc: true, protection: true }
export interface Sample { t: number; hz: number; mechanicalMW: number; shedMW: number; agcMW: number; rocof: number }
export interface TripEvent { t: number; type: 'trip' | 'shed'; mw: number; hz: number }
export interface Run { samples: Sample[]; events: TripEvent[]; nadir: Sample; initialRocof: number; settings: Settings }
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x))
type Vector = [number, number, number, number] // frequency deviation pu, valve pu, turbine pu, AGC pu
const add = (a: Vector, b: Vector, scale: number) => a.map((v, i) => v + b[i] * scale) as Vector

/** RK4, fixed 10 ms. Relay timers are evaluated at every integration step, not render frames. */
export function simulate(input: Settings, step = DT): Run {
  if (!(step > 0 && step <= .02) || input.inertia <= 0 || input.lossMW < 0 || input.lossMW > 3000 || input.reserveMW < 0) throw new Error('Invalid grid settings')
  const s = { ...input }, reserve = s.reserveMW / BASE_MW, loss = s.lossMW / BASE_MW
  let y: Vector = [0, 0, 0, 0], shed = 0
  const thresholds = [49, 48.7, 48.4], timers = [0, 0, 0], fired = [false, false, false]
  const events: TripEvent[] = [{ t: 0, type: 'trip', mw: s.lossMW, hz: F0 }]
  const derivative = (time: number, v: Vector): Vector => {
    const target = s.governor ? clamp(-v[0] / .05 + v[3], 0, reserve) : 0
    const integral = s.agc && s.governor && time >= 15 ? -.4 * v[0] : 0
    // Conditional integration avoids wind-up at both reserve limits.
    const agcRate = (v[3] >= reserve && integral > 0) || (v[3] <= 0 && integral < 0) ? 0 : integral
    return [(-loss + v[2] + shed - v[0]) / (2 * s.inertia), (target - v[1]) / .25, (v[1] - v[2]) / 3, agcRate]
  }
  const sample = (t: number): Sample => ({ t, hz: F0 * (1 + y[0]), mechanicalMW: y[2] * BASE_MW, shedMW: shed * BASE_MW, agcMW: y[3] * BASE_MW, rocof: derivative(t, y)[0] * F0 })
  const samples = [sample(0)]
  let nadir = samples[0]
  for (let i = 1; i <= Math.round(END_TIME / step); i++) {
    const t = (i - 1) * step
    const k1 = derivative(t, y), k2 = derivative(t + step / 2, add(y, k1, step / 2)), k3 = derivative(t + step / 2, add(y, k2, step / 2)), k4 = derivative(t + step, add(y, k3, step))
    y = y.map((v, j) => v + step / 6 * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j])) as Vector
    y[3] = clamp(y[3], 0, reserve)
    const hz = F0 * (1 + y[0])
    if (s.protection) thresholds.forEach((threshold, j) => {
      if (fired[j]) return
      timers[j] = hz < threshold ? timers[j] + step : 0
      if (timers[j] >= .2 - 1e-9) { fired[j] = true; shed += .05; events.push({ t: i * step, type: 'shed', mw: 500, hz }) }
    })
    const point = sample(i * step)
    if (point.hz < nadir.hz) nadir = point
    if (i % Math.round(.1 / step) === 0) samples.push(point)
  }
  return { settings: s, samples, events, nadir, initialRocof: -F0 * loss / (2 * s.inertia) }
}

export function sampleAt(run: Run, t: number): Sample {
  const at = clamp(t, 0, END_TIME) * 10, index = Math.floor(at), a = run.samples[index], b = run.samples[Math.min(index + 1, run.samples.length - 1)]
  const mix = at - index
  const interpolated = Object.fromEntries(Object.entries(a).map(([key, value]) => [key, value + (b[key as keyof Sample] - value) * mix])) as unknown as Sample
  // Relays act in discrete blocks. Interpolation must not shed load before the event.
  interpolated.shedMW = run.events.filter(e => e.type === 'shed' && e.t <= t).reduce((total, e) => total + e.mw, 0)
  return interpolated
}
export function nadirUntil(run: Run, t: number): Sample {
  if (t >= run.nadir.t) return run.nadir
  return run.samples.slice(0, Math.floor(Math.max(0, t) * 10) + 1).reduce((a, b) => a.hz < b.hz ? a : b)
}
