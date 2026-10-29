// All dimensions are millimetres unless indicated. Rendering uses 10 mm/unit.
export const PHONE = {width: 71.5, height: 146.7, depth: 7.65, pixelsX: 1170, pixelsY: 2532, ppi: 460}
export type SystemId = 'body' | 'display' | 'compute' | 'camera' | 'power' | 'radio' | 'haptics'
export type Lab = 'assembly' | Exclude<SystemId, 'body'>
export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))
export function srgbToLinear(v: number) { const n = clamp(v / 255); return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4 }
export function displayLight(rgb: readonly number[]) {
  const linear = rgb.map(srgbToLinear)
  return {linear, luminance: .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2], rgb: `rgb(${rgb.map(v => Math.round(clamp(v, 0, 255))).join(',')})`}
}
/** Ideal thin lens, with a fixed f/1.6 entrance pupil. Not the iPhone lens prescription. */
export function cameraOptics(objectMetres: number, focusMetres: number, f = 4.2, fNumber = 1.6) {
  const object = Math.max(f + .001, objectMetres * 1000), focus = Math.max(f + .001, focusMetres * 1000)
  const image = f * object / (object - f), sensor = f * focus / (focus - f), aperture = f / fNumber
  return {image, sensor, aperture, blurMm: aperture * Math.abs(image - sensor) / image, magnification: image / object}
}
export type PowerSettings = {brightness: number; workload: number; radio: number; charging: boolean}
export const CELL = {energyWh: 12, resistanceOhm: .09, heatCapacity: 140, thermalResistance: 5, ambientC: 23}
export function phonePower(settings: PowerSettings, soc: number) {
  const powered=soc>0||settings.charging
  const display = powered?.12 + 1.8 * clamp(settings.brightness):0, compute = powered?.18 + 2.5 * clamp(settings.workload) ** 2:0
  const radio = powered?.08 + .95 * clamp(settings.radio):0, other = powered?.22:0
  const load = display + compute + radio + other, voltage = 3.3 + .85 * clamp(soc)
  // Illustrative CC/CV envelope: 12 W at low SOC; smoothly taper above 80%.
  const accepted = soc >= 1 ? 0 : 12 * (soc < .8 ? 1 : clamp((1 - soc) / .2))
  const batteryW = settings.charging ? -Math.min(accepted, Math.max(0, 20 * .9 - load)) : load
  const currentA = batteryW / voltage, heatW = currentA ** 2 * CELL.resistanceOhm
  return {display, compute, radio, other, load, voltage, batteryW, currentA, heatW, chargerW: settings.charging ? (load - batteryW) / .9 : 0, hours: soc<=0?0:load > 0 ? CELL.energyWh * clamp(soc) / load : Infinity}
}
/** An exhausted, unplugged phone has no fractions to display. */
export function powerShare(watts:number,load:number) { return Number.isFinite(watts)&&Number.isFinite(load)&&load>0?clamp(watts/load):0 }
/** Qualitative particle phase: current controls direction/zero flow, not a calibrated speed. */
export function advanceChargeFlow(phase:number,elapsed:number,currentA:number) {
  if(!Number.isFinite(elapsed)||elapsed<=0||!Number.isFinite(currentA)||Math.abs(currentA)<=1e-6)return phase
  return ((phase+elapsed*.13*Math.sign(currentA))%1+1)%1
}
export type CellState = {soc: number; temperature: number; seconds: number}
export function advanceCell(state: CellState, dt: number, settings: PowerSettings): CellState {
  if (!Number.isFinite(dt) || dt <= 0) return state
  const step = Math.min(dt, 5), p = phonePower(settings, state.soc)
  return {soc: clamp(state.soc - p.batteryW * step / (CELL.energyWh * 3600)), temperature: state.temperature + (p.heatW - (state.temperature - CELL.ambientC) / CELL.thermalResistance) * step / CELL.heatCapacity, seconds: state.seconds + step}
}
/** Ripple-carry full adder. Gates are an independent teaching circuit, not A15's netlist. */
export function addByte(a: number, b: number) {
  const aa = Math.floor(clamp(a, 0, 255)), bb = Math.floor(clamp(b, 0, 255)); let carry = 0
  const stages = Array.from({length: 8}, (_, i) => {
    const x = (aa >> i) & 1, y = (bb >> i) & 1, incoming = carry
    const sum = x ^ y ^ carry; carry = (x & y) | (incoming & (x ^ y))
    return {a: x, b: y, incoming, sum, carry}
  })
  return {stages, sum: (aa + bb) & 255, carry, total: aa + bb}
}
export function radioLink(frequencyGHz: number, distanceKm: number, bandwidthMHz = 20) {
  const loss = 32.44 + 20 * Math.log10(Math.max(.001, frequencyGHz) * 1000) + 20 * Math.log10(Math.max(.001, distanceKm))
  const receivedDbm = 23 + 15 - loss, noiseDbm = -174 + 10 * Math.log10(bandwidthMHz * 1e6) + 7
  const snrDb = receivedDbm - noiseDbm
  return {loss, receivedDbm, noiseDbm, snrDb, capacityMbps: bandwidthMHz * Math.log2(1 + 10 ** (snrDb / 10)), wavelengthM: .299792458 / frequencyGHz}
}
export function bpsk(samples: number, bits: readonly number[], cycles = 3) {
  return Array.from({length: samples}, (_, i) => { const t = i / (samples - 1) * bits.length, index = Math.min(bits.length - 1, Math.floor(t)); return {t, y: Math.cos(t * Math.PI * 2 * cycles + (bits[index] ? 0 : Math.PI))} })
}
export const ACTUATOR = {mass: .002, resonanceHz: 175, q: 6}
export function hapticMotion(hz: number, forceN: number, seconds: number) {
  const w0 = Math.PI * 2 * ACTUATOR.resonanceHz, w = Math.PI * 2 * hz, k = ACTUATOR.mass * w0 ** 2, c = ACTUATOR.mass * w0 / ACTUATOR.q
  const amplitude = Math.max(0, forceN) / Math.hypot(k - ACTUATOR.mass * w ** 2, c * w)
  const lag = Math.atan2(c * w, k - ACTUATOR.mass * w ** 2)
  return {amplitudeMm: amplitude * 1000, displacementMm: amplitude * Math.sin(w * seconds - lag) * 1000, springNPerM: k}
}
