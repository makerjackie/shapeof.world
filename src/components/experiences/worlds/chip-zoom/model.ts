export type View = 'layers' | 'cell' | 'transistor'
export type Palette = 'slice' | 'micrograph'
export type Mask = 'nwell' | 'diff' | 'poly' | 'licon' | 'li' | 'mcon' | 'm1' | 'v1' | 'm2' | 'v2' | 'm3' | 'v3' | 'm4'
export type Layout = {
  schema: number
  unit: string
  bounds: number[]
  layers: Record<Mask, number[][]>
  cell: { name: string; bounds: number[]; layers: Record<Mask, number[][]> }
}

export const PEEL_LAYERS = ['m4', 'm3', 'm2', 'm1', 'li'] as const
export const PALETTES = {
  slice: { background: '#e6edf0', substrate: '#8394a5', well: '#a99abd', diff: '#529879', poly: '#b16b93', li: '#438981', m1: '#4f9e97', m2: '#ac6a9b', m3: '#6285b0', m4: '#a6b9ca', via: '#82969e' },
  micrograph: { background: '#25283d', substrate: '#51566e', well: '#716e92', diff: '#82b793', poly: '#d8a4bd', li: '#64b4ac', m1: '#66c7b2', m2: '#c68ab2', m3: '#8da6dc', m4: '#b9c7e7', via: '#a7a8c4' },
} as const

export function clamp(value: number, min: number, max: number) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min
}

/** Long-channel teaching approximation, not a calibrated SKY130 device model.
 * The current is normalized, not quoted in amperes. Body tied to source.
 * Positive VDS, no leakage, body effect, capacitance, or channel-length modulation.
 */
export function transistorState(gateVoltage: number, drainVoltage: number) {
  const vgs = clamp(gateVoltage, 0, 1.8)
  const vds = clamp(drainVoltage, 0, 1.8)
  const threshold = 0.65
  const overdrive = Math.max(0, vgs - threshold)
  const channel = overdrive > 0
  const current = vds < overdrive ? overdrive * vds - vds * vds / 2 : overdrive * overdrive / 2
  const relativeCurrent = current / ((1.8 - threshold) ** 2 / 2)
  return { vgs, vds, threshold, channel, flowing: current > 0, relativeCurrent, region: !channel ? 'off' : vds < overdrive ? 'linear' : 'saturation' }
}

/** Each contact disappears with its upper conductor; nothing is left hanging. */
export function maskVisible(mask: Mask, peeled: number) {
  const owner: Partial<Record<Mask, typeof PEEL_LAYERS[number]>> = { v3: 'm4', v2: 'm3', v1: 'm2', mcon: 'm1', licon: 'li' }
  const layer = owner[mask] ?? mask
  const index = PEEL_LAYERS.indexOf(layer as typeof PEEL_LAYERS[number])
  return index < 0 || index >= clamp(peeled, 0, 5)
}
