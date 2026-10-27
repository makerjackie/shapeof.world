export type View = 'layers' | 'cell' | 'transistor'
export type Mask = 'nwell' | 'diff' | 'poly' | 'licon' | 'li' | 'mcon' | 'm1' | 'v1' | 'm2' | 'v2' | 'm3' | 'v3' | 'm4'
export type Layout = {
  schema: number
  unit: string
  bounds: number[]
  layers: Record<Mask, number[][]>
  cell: { name: string; bounds: number[]; layers: Record<Mask, number[][]> }
}

export const PEEL_LAYERS = ['m4', 'm3', 'm2', 'm1', 'li'] as const
/** One dark palette. Mask colours are an identification legend, not real material colours;
 * the four metals are tinted aluminium and the contacts/vias are warm tungsten-like plugs. */
export const PALETTE = {
  background: '#07090b', substrate: '#1a2030', well: '#4e4970', diff: '#2f9873', poly: '#c24886', li: '#3f9189',
  m1: '#5fb3a3', m2: '#c27aa6', m3: '#6f86c6', m4: '#8b96a8', via: '#cfa864',
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
