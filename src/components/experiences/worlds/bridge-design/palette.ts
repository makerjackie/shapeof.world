import type { CSSProperties } from 'react'

/** Force colours, lifted to read on the dark page. */
export const TENSION = '#4da3f5'
export const COMPRESSION = '#f0644a'

/** Dark-plaster scene palette shared by both views: page-coloured sky, dark banks, deep-blue water. */
export const PALETTE = {
  bg: '#07090b',
  plaster: '#959fab',
  plasterLow: '#6e7884',
  bank: '#3a434d',
  bankStep: '#333b45',
  water: '#0b2338',
  ripple: '#1f4c6c',
  bed: '#0c1117',
  dim: '#363f49',
  truck: '#e7b432',
}

/** Fraction of a range input, fed to CSS so the dark track can show its filled part. */
export const rangeFill = (value: number, min: number, max: number) => ({ '--fill': (value - min) / (max - min) }) as CSSProperties
