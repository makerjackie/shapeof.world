import type { Vec3 } from './fields'
export const EFFECTIVE_DIAMETER = .6
export const FUEL_PLANE = .05
export const HEAT_OF_COMBUSTION = 14e6
export const MEASUREMENT_WINDOW = 40
export type InstantMeasurement = {
  time: number; layerOccupancy: number[]; dx: number; chemicalKw: number; thermalKw: number; tip: number; rawTip: number; centerTemperature: number;
  root: Vec3 | null; yellow: Vec3 | null; smoke: Vec3 | null; tipPosition: Vec3 | null;
  hotTop: number; topTemperature: number; maxTemperature: number;
  spark: { count: number; position: Vec3; temperature: number; diameter: number };
}
export type Frequency = { hz: number | null; prominence: number; samples: number; reason: 'collecting' | 'flat' | 'unstable' | 'resolved' }
export type FastMeasurement = { time: number; value: number; lower: number; upper: number; chemicalKw: number; tip: number }
export type Instruments = InstantMeasurement & {
  series: { time: number; chemicalKw: number; thermalKw: number }[];
  duration: number; height50: number | null; medianTip: number | null; heightCensored: boolean; predictedHeight: number;
  meanKw: number; frequency: Frequency; spectra: { signal: string; result: Frequency }[]; predictedFrequency: number;
}
export function heskestad(kw: number, diameter = EFFECTIVE_DIAMETER) {
  return Math.max(0, .235 * Math.max(0, kw) ** .4 - 1.02 * diameter)
}
export function median(values: number[]) {
  const s = [...values].sort((a, b) => a - b), i = Math.floor(s.length / 2)
  return s.length ? (s[i] + s[Math.max(0, i - (s.length % 2 === 0 ? 1 : 0))]) / 2 : null
}
// Simulation seconds, 20 Hz interpolation, linear detrend + Hann DFT. No empirical frequency is fed in.
export function dominantFrequency(rows: { time: number; value: number }[], minRms = 2): Frequency {
  const end = rows.at(-1)?.time ?? 0, data = rows.filter(r => r.time >= end - MEASUREMENT_WINDOW - .15)
  const empty = { hz: null, prominence: 0, samples: data.length }
  if (data.length < 600 || end - data[0].time < 39.8) return { ...empty, reason: 'collecting' }
  const n = 800, dt = .05, start = end - (n - 1) * dt, values: number[] = []
  let j = 0
  for (let i = 0; i < n; i++) {
    const t = start + i * dt
    while (j + 1 < data.length - 1 && data[j + 1].time < t) j++
    const a = data[j], b = data[j + 1]
    if (!b || b.time - a.time > .16) return { ...empty, reason: 'collecting' }
    values.push(a.value + (b.value - a.value) * Math.max(0, Math.min(1, (t - a.time) / (b.time - a.time))))
  }
  const mean = values.reduce((a, b) => a + b, 0) / n
  const slope = values.reduce((s, x, i) => s + (i - (n - 1) / 2) * (x - mean), 0) / (n * (n * n - 1) / 12)
  const residual = values.map((x, i) => x - mean - slope * (i - (n - 1) / 2))
  if (Math.sqrt(residual.reduce((s, x) => s + x * x, 0) / n) < minRms) return { ...empty, reason: 'flat' }
  const signal = residual.map((x, i) => x * (.5 - .5 * Math.cos(2 * Math.PI * i / (n - 1))))
  const powers: { hz: number; power: number }[] = []
  for (let k = 8; k <= 160; k++) {
    let re = 0, im = 0
    const angle = 2 * Math.PI * k / n, dc = Math.cos(angle), ds = Math.sin(angle)
    let c = 1, s = 0
    for (let i = 0; i < n; i++) { re += signal[i] * c; im -= signal[i] * s; const next = c * dc - s * ds; s = s * dc + c * ds; c = next }
    powers.push({ hz: k / (n * dt), power: re * re + im * im })
  }
  const peak = powers.reduce((a, b) => a.power > b.power ? a : b)
  const noise = median(powers.filter(p => Math.abs(p.hz - peak.hz) > .15).map(p => p.power)) ?? 0
  const prominence = peak.power / Math.max(noise, 1e-9), total = powers.reduce((s, p) => s + p.power, 0)
  const resolved = prominence >= 8 && peak.power / total >= .18 && peak.hz > .25 && peak.hz < 3.95
  return { hz: resolved ? peak.hz : null, prominence, samples: data.length, reason: resolved ? 'resolved' : 'unstable' }
}
export function intermittencyHeight(rows: Pick<InstantMeasurement, 'layerOccupancy' | 'dx'>[]) {
  if (!rows.length) return 0
  let height = 0
  for (let i = 0; i < rows[0].layerOccupancy.length; i++) {
    if (rows.reduce((sum, row) => sum + row.layerOccupancy[i], 0) / rows.length >= .5) height = Math.max(0, (i + .5) * rows[0].dx - FUEL_PLANE)
  }
  return height
}
export class MeasurementHistory {
  rows: InstantMeasurement[] = []
  fast: FastMeasurement[] = []
  private lastSpectrum = -Infinity
  private spectra: Instruments['spectra'] = []
  addFast(row: FastMeasurement) {
    this.fast.push(row); this.fast = this.fast.filter(r => r.time >= row.time - MEASUREMENT_WINDOW - .2)
  }
  add(row: InstantMeasurement): Instruments {
    this.rows.push(row); this.rows = this.rows.filter(r => r.time >= row.time - MEASUREMENT_WINDOW)
    const duration = row.time - this.rows[0].time
    const meanKw = this.rows.reduce((s, r) => s + r.chemicalKw, 0) / this.rows.length
    const height50 = duration >= MEASUREMENT_WINDOW - .5 ? intermittencyHeight(this.rows) : null
    if (row.time - this.lastSpectrum >= 1) {
      this.lastSpectrum = row.time
      const signals: [keyof Omit<FastMeasurement, 'time'>, number][] = [['chemicalKw', .5], ['tip', .005], ['lower', 2], ['value', 2], ['upper', 2]]
      this.spectra = signals.map(([key, min]) => ({ signal: key, result: dominantFrequency(this.fast.map(r => ({ time: r.time, value: r[key] })), min) }))
    }
    // Require a second independent signal to support a peak; never pick a convenient single maximum.
    const peaks = this.spectra.map(s => s.result).filter(f => f.hz !== null)
    const agreed = peaks.find(a => peaks.some(b => b !== a && Math.abs(a.hz! - b.hz!) <= .075))
    const first = this.spectra[0]?.result ?? { hz: null, prominence: 0, samples: 0, reason: 'collecting' as const }
    const frequency: Frequency = agreed ?? { ...first, hz: null, reason: first.reason === 'collecting' ? 'collecting' : 'unstable' }
    return { ...row, series: this.rows.filter(r => r.time >= row.time - 20).map(({ time, chemicalKw, thermalKw }) => ({ time, chemicalKw, thermalKw })),
      duration, height50, medianTip: median(this.rows.map(r => r.tip)), heightCensored: height50 !== null && height50 > 1.7,
      meanKw, predictedHeight: heskestad(meanKw), frequency, spectra: this.spectra, predictedFrequency: 1.5 / Math.sqrt(EFFECTIVE_DIAMETER) }
  }
}
