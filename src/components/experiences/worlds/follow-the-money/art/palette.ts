/**
 * Banknote inks. The world is drawn in the language of security printing:
 * fine engraved lines on dark ink-green, cream paper and a few intaglio colours.
 */
export type ProfileId = 'cn' | 'us'
/** Where money ends up. China splits surplus into profit and depreciation; the U.S. tables do not. */
export type Dest = 'wages' | 'profit' | 'depreciation' | 'surplus' | 'tax' | 'imports'

export const INK = {
  ground: '#0b100e',
  groundDeep: '#040706',
  paper: '#efe4cc',
  paperShade: '#d8c8a4',
  gold: '#d9b56c',
  goldDim: 'rgba(217, 181, 108, 0.32)',
  cream: '#f4ecda',
  creamDim: 'rgba(244, 236, 218, 0.55)',
  line: 'rgba(244, 236, 218, 0.18)',
} as const

export const NOTE_INK: Record<ProfileId, { ink: string; deep: string; tint: string; glow: string }> = {
  cn: { ink: '#b4313d', deep: '#6d1626', tint: '#f3d6cf', glow: '#ff9b84' },
  us: { ink: '#2c6a4c', deep: '#173d2b', tint: '#d8e6d2', glow: '#9fdcb5' },
}

/** One ink per destination; each is legible on the dark ground and on paper. */
export const DEST_INK: Record<Dest, string> = {
  wages: '#f0b54e',
  profit: '#5fbf94',
  surplus: '#5fbf94',
  depreciation: '#9fb0c4',
  tax: '#b28ef0',
  imports: '#4fb0e0',
}

export function rgba(hex: string, alpha: number): string {
  const value = hex.replace('#', '')
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function mix(a: string, b: string, t: number): string {
  const pa = a.replace('#', '')
  const pb = b.replace('#', '')
  const channel = (i: number) => {
    const va = parseInt(pa.slice(i, i + 2), 16)
    const vb = parseInt(pb.slice(i, i + 2), 16)
    return Math.round(va + (vb - va) * t).toString(16).padStart(2, '0')
  }
  return `#${channel(0)}${channel(2)}${channel(4)}`
}
