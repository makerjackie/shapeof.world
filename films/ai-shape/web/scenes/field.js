// The people field: 8,300 dots, one per million humans. Shared so the next
// section can morph these exact dots into the world map.
import { rng } from '../lib.js'

export const FIELD = { x: 760, y: 150, w: 1050, h: 830, n: 8300 }
const cols = 103
const cell = FIELD.w / cols
export const DOT_R = 3.5

// Dots in reading order by column (left to right), so "the first k dots"
// lights a clean left-hand share of the field.
export const dots = []
const rows = Math.ceil(FIELD.n / cols)
for (let c = 0; c < cols; c++) {
  for (let r = 0; r < rows; r++) {
    if (dots.length >= FIELD.n) break
    dots.push({ x: FIELD.x + (c + 0.5) * cell, y: FIELD.y + (r + 0.5) * (FIELD.h / rows), c, r })
  }
}
const r = rng(7)
for (const d of dots) d.k = r() // per-dot jitter for staggered motion
