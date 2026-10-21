// The film's one object: 100 blocks, one per 10,000 yuan of the home. Every
// shot lays the same blocks out somewhere else, so the money visibly travels.
// A layout is an array of { x, y, s, c, a } (top-left, size, colour, alpha),
// one entry per block; `move` eases each block from one layout to the next
// with a small stagger.
import { C, clamp, lerp, prog, easeInOut, rect } from './lib.js'

export const N = 100

// A plain grid, filled row by row from the top-left.
export function grid({ x, y, cols = 10, s = 40, gap = 10, n = N, c = C.gold }) {
  return [...Array(n)].map((_, i) => ({ x: x + (i % cols) * (s + gap), y: y + Math.floor(i / cols) * (s + gap), s, c, a: 1 }))
}

// The same grid centred on (cx, cy).
export function gridC({ cx, cy, cols = 10, s = 40, gap = 10, n = N, c = C.gold }) {
  const rows = Math.ceil(n / cols)
  const w = cols * (s + gap) - gap, h = rows * (s + gap) - gap
  return grid({ x: cx - w / 2, y: cy - h / 2, cols, s, gap, n, c })
}

// A house of exactly 100 blocks: a 10 × 7 body with a 2 × 3 door left out
// (64), under a roof of rows 12, 10, 8, 6 (36). Bottom row first, so the
// house builds from the ground up when blocks arrive in order.
export const HOUSE_CELLS = (() => {
  const out = []
  for (let r = 0; r < 7; r++) for (let c = 0; c < 10; c++) {
    if (r < 3 && (c === 4 || c === 5)) continue // the door
    out.push([c, -r])
  }
  ;[12, 10, 8, 6].forEach((w, k) => { for (let c = 0; c < w; c++) out.push([c - (w - 10) / 2, -7 - k]) })
  return out
})()
export function house({ cx, base, s = 40, gap = 8, c = C.gold }) {
  const step = s + gap, x0 = cx - (10 * step - gap) / 2
  return HOUSE_CELLS.map(([col, row]) => ({ x: x0 + col * step, y: base - s + row * step, s, c, a: 1 }))
}

// Stacks: groups of blocks piled `cols` wide from a common baseline, one
// column per group. groups = [{ n, x, c }]; blocks are handed out in order.
export function stacks(groups, { base, cols = 5, s = 30, gap = 6 }) {
  const out = []
  for (const g of groups) for (let j = 0; j < g.n; j++) {
    out.push({ x: g.x + (j % cols) * (s + gap), y: base - s - Math.floor(j / cols) * (s + gap), s, c: g.c, a: 1 })
  }
  return out
}

// Recolour a layout: fn(i) → colour or null to keep.
export const tint = (L, fn) => L.map((b, i) => ({ ...b, c: fn(i) ?? b.c }))

// Ease every block from layout A to layout B starting at t0. Block i leaves
// `stagger * order(i)` seconds late, so a wave runs through the pile.
export function move(t, A, B, t0, dur = 0.6, stagger = 0.006, order = (i) => i) {
  return B.map((b, i) => {
    const a = A[i] || b
    const p = easeInOut(prog(t, t0 + stagger * order(i), t0 + stagger * order(i) + dur))
    return { x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), s: lerp(a.s, b.s, p), c: p < 0.5 ? a.c : b.c, a: lerp(a.a ?? 1, b.a ?? 1, p), p }
  })
}

export function draw(ctx, L, alpha = 1) {
  for (const b of L) if (b && b.a > 0) rect(ctx, b.x, b.y, b.s, b.s, b.c, b.a * alpha, Math.min(4, b.s * 0.08))
}

// Blocks that pop into place one after another from t0 over dur seconds.
export function popIn(t, L, t0, dur, from = 0) {
  return L.map((b, i) => {
    const ti = t0 + (dur * (i - from)) / Math.max(1, L.length - from)
    const p = i < from ? 1 : clamp((t - ti) / 0.12)
    return { ...b, a: (b.a ?? 1) * p, s: b.s * (0.6 + 0.4 * p), x: b.x + b.s * 0.2 * (1 - p), y: b.y + b.s * 0.2 * (1 - p) }
  })
}
