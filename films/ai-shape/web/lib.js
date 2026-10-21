// Design system for the film: colours, type, motion. Every helper is a pure
// function of time so any frame renders the same every time.
import { bt, BEAT, BAR } from './timeline.js'
export { bt, BEAT, BAR }

export const W = 1920, H = 1080
export const M = 112 // outer margin

export const C = {
  bg: '#0a0a0d', ink: '#f4f1ea', dim: '#8e8c86', faint: '#26262c', line: 'rgba(244,241,234,.16)',
  us: '#3d7bff', cn: '#ff3b30', rest: '#8a8f98', hi: '#e8ff3a', cyan: '#35e0ff', gold: '#ffc23d',
}

export const CJK = '"NotoSC", "PingFang SC", sans-serif'
export const NUM = '"Anton", "NotoSC", sans-serif'
export const MONO = '"Mono", "SF Mono", monospace'

// ── Math and easing ─────────────────────────────────────────────────────────
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x))
export const lerp = (a, b, t) => a + (b - a) * t
export const prog = (t, a, b) => clamp((t - a) / (b - a))
export const easeOut = (t) => 1 - (1 - t) ** 3
export const easeIn = (t) => t ** 3
export const easeInOut = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)
export const expoOut = (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t))
export const expoIn = (t) => (t <= 0 ? 0 : 2 ** (10 * t - 10))

// Closed-form damped spring step response: 0 before t0, settles at 1 with a
// small overshoot. `f` is the natural frequency in Hz, `z` the damping ratio.
export function spring(t, t0 = 0, f = 3.2, z = 0.55) {
  const x = t - t0
  if (x <= 0) return 0
  const w = 2 * Math.PI * f, wd = w * Math.sqrt(1 - z * z)
  return 1 - Math.exp(-z * w * x) * (Math.cos(wd * x) + (z * w / wd) * Math.sin(wd * x))
}
// A value that springs from a to b starting at t0.
export const springTo = (t, t0, a, b, f, z) => a + (b - a) * spring(t, t0, f, z)

// The render clock. During motion-blurred renders main.js sets `frame` to the
// frame's own time so discrete things (rolling digits, shake) don't ghost.
export const clock = { frame: null }

// Count a number up over `dur` seconds, landing exactly on `v`. Uses the frame
// time, not the subframe time, so digits stay sharp under motion blur.
export function count(t, t0, dur, v, from = 0) {
  const tt = clock.frame ?? t
  return tt >= t0 + dur ? v : from + (v - from) * expoOut(prog(tt, t0, t0 + dur))
}

// Opacity for an element that exists in [a, b): quick in, quick out.
export function life(t, a, b, fin = 0.12, fout = 0.1) {
  if (t < a || t > b) return 0
  return Math.min(easeOut(prog(t, a, a + fin)), 1 - easeIn(prog(t, b - fout, b)))
}

export function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let n = Math.imul(s ^ (s >>> 15), 1 | s)
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n)
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296
  }
}

// ── Type ────────────────────────────────────────────────────────────────────
function font(size, weight, family) { return `${weight} ${size}px ${family}` }

export function txt(ctx, s, x, y, o = {}) {
  const { size = 64, weight = 900, color = C.ink, align = 'left', base = 'alphabetic', alpha = 1, family = CJK, spacing = 0 } = o
  if (alpha <= 0.002 || !s) return 0
  ctx.save()
  ctx.globalAlpha *= alpha
  ctx.font = font(size, weight, family)
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = base
  ctx.letterSpacing = `${spacing}px`
  ctx.fillText(s, x, y)
  const w = ctx.measureText(s).width
  ctx.restore()
  return w
}

export function measure(ctx, s, size, weight = 900, family = CJK, spacing = 0) {
  ctx.save(); ctx.font = font(size, weight, family); ctx.letterSpacing = `${spacing}px`
  const w = ctx.measureText(s).width; ctx.restore(); return w
}

// Split a string into runs: digits and numeric symbols use the display face,
// everything else uses the CJK face. "2859 亿美元" -> ["2859", " 亿美元"].
const NUMERIC = /[0-9.,%$×+\-–~≈>]/
function runs(s) {
  const out = []
  for (const ch of s) {
    const num = NUMERIC.test(ch)
    if (out.length && out[out.length - 1].num === num) out[out.length - 1].s += ch
    else out.push({ s: ch, num })
  }
  return out
}

// Mixed line: numbers in Anton, words in Noto Sans SC Black. Returns width.
export function line(ctx, s, x, y, o = {}) {
  const { size = 64, color = C.ink, align = 'left', alpha = 1, weight = 900, numScale = 1.12, colors = null } = o
  const parts = runs(s)
  const widths = parts.map((p) => measure(ctx, p.s, p.num ? size * numScale : size, p.num ? 400 : weight, p.num ? NUM : CJK))
  const total = widths.reduce((a, b) => a + b, 0)
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x
  parts.forEach((p, i) => {
    txt(ctx, p.s, cx, y, { size: p.num ? size * numScale : size, weight: p.num ? 400 : weight, family: p.num ? NUM : CJK, color: colors?.[i] ?? (p.num && o.numColor ? o.numColor : color), alpha })
    cx += widths[i]
  })
  return total
}
export const lineWidth = (ctx, s, size, weight = 900, numScale = 1.12) =>
  runs(s).reduce((a, p) => a + measure(ctx, p.s, p.num ? size * numScale : size, p.num ? 400 : weight, p.num ? NUM : CJK), 0)

// Hero figure: a huge number with a smaller unit sitting on its baseline.
// Returns { w, numW }.
export function hero(ctx, num, unit, x, y, o = {}) {
  const { size = 360, color = C.ink, unitColor = color, align = 'left', alpha = 1, unitScale = 0.3, gap = 0.06, unitWeight = 900 } = o
  const nw = measure(ctx, num, size, 400, NUM)
  const us = size * unitScale
  const uw = unit ? lineWidth(ctx, unit, us, unitWeight) : 0
  const total = nw + (unit ? size * gap + uw : 0)
  const x0 = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x
  txt(ctx, num, x0, y, { size, weight: 400, family: NUM, color, alpha })
  if (unit) line(ctx, unit, x0 + nw + size * gap, y, { size: us, color: unitColor, alpha, weight: unitWeight })
  return { w: total, numW: nw, x0 }
}

// Format a count with Chinese units: 2.859e11 -> "2859", unit "亿".
export function zh(v, unit = 'auto', digits = 0) {
  const u = unit === 'auto' ? (v >= 1e12 ? '万亿' : v >= 1e8 ? '亿' : v >= 1e4 ? '万' : '') : unit
  const d = { 万亿: 1e12, 亿: 1e8, 万: 1e4, '': 1 }[u]
  const n = v / d
  const s = digits ? n.toFixed(digits) : String(Math.round(n))
  return [s, u]
}

// ── Frame furniture ─────────────────────────────────────────────────────────
// Source line, bottom-left. Every number on screen carries one. Shots on the
// acid-yellow ground pass a dark colour.
export function source(ctx, s, alpha = 1, color = C.dim) {
  if (!s) return
  txt(ctx, '数据', M, H - 58, { size: 22, weight: 700, color, alpha })
  txt(ctx, s, M + 58, H - 58, { size: 22, weight: 400, color, alpha })
}

// Chapter opening: the title lands big in the centre on the downbeat, then
// flies into the top-left chapter mark within a beat and a half.
export function chapterOpen(ctx, t, t0, n, label) {
  const p = easeInOut(prog(t, t0 + BEAT * 0.45, t0 + BEAT * 1.1))
  if (t < t0 || p >= 1) return p >= 1
  const s0 = spring(t, t0, 3, 0.6)
  const scrim = (1 - p) * 0.82
  rect(ctx, 0, 0, W, H, C.bg, scrim)
  const k = lerp(1, 36 / 150, p)
  const x = lerp(W / 2, M, p), y = lerp(H / 2 + 50, 94, p)
  ctx.save()
  ctx.translate(x, y); ctx.scale(k * (1.15 - 0.15 * s0), k * (1.15 - 0.15 * s0))
  const nw = measure(ctx, n, 150, 400, NUM)
  const lw = measure(ctx, label, 150, 900, CJK)
  const total = nw + 40 + lw
  const x0 = lerp(-total / 2, 0, p)
  txt(ctx, n, x0, 0, { size: 150, weight: 400, family: NUM, color: C.hi, alpha: clamp(s0 * 2) })
  txt(ctx, label, x0 + nw + 40, 0, { size: 150, color: C.ink, alpha: clamp(s0 * 2) })
  ctx.restore()
  return false
}

// Chapter mark, top-left: "02  两个超级大国".
export function chapter(ctx, n, label, alpha = 1) {
  txt(ctx, n, M, 94, { size: 38, weight: 400, family: NUM, color: C.hi, alpha })
  txt(ctx, label, M + 60, 94, { size: 36, weight: 900, color: C.dim, alpha })
}

// Solid bar with a crisp end; grows from x by w*p.
export function bar(ctx, x, y, w, h, color, alpha = 1) {
  if (w <= 0 || alpha <= 0) return
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color; ctx.fillRect(x, y, w, h); ctx.restore()
}

export function rect(ctx, x, y, w, h, color, alpha = 1, r = 0) {
  if (alpha <= 0) return
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color
  if (r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill() } else ctx.fillRect(x, y, w, h)
  ctx.restore()
}

// Scale everything drawn inside fn around (cx, cy).
export function scaled(ctx, s, cx, cy, fn) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy); fn(); ctx.restore()
}

// ── Zooming linear axis ─────────────────────────────────────────────────────
// A linear chart whose top keeps moving out as bigger values arrive, so the
// earlier ones visibly shrink towards zero. `steps` = [[time, max], ...]; the
// axis eases from one maximum to the next in log space over `dur` seconds.
export function axisMax(t, steps, dur) {
  let m = steps[0][1]
  for (const [t0, v] of steps.slice(1)) {
    if (t <= t0) break
    m = Math.exp(lerp(Math.log(m), Math.log(v), easeInOut(prog(t, t0, t0 + dur))))
  }
  return m
}

// Gridlines for that axis on 1–2–5 steps; finer steps fade in as they open
// up. Calls draw(value, offset in px along the axis, alpha, labelled) once per
// line; only multiples of the finest step at least 160 px apart get a label.
export function zoomGrid(max, len, draw) {
  const seen = new Map()
  const e = Math.floor(Math.log10(max))
  let label = Infinity
  for (let k = e - 2; k <= e; k++) for (const m of [1, 2, 5]) {
    const step = m * 10 ** k, gap = (len * step) / max, a = clamp((gap - 70) / 90)
    if (gap >= 160) label = Math.min(label, step)
    if (a <= 0) continue
    for (let j = 1; j * step <= max * 1.0001; j++) {
      const v = +(j * step).toPrecision(6)
      seen.set(v, Math.max(seen.get(v) || 0, a))
    }
  }
  for (const [v, a] of seen) draw(v, (len * v) / max, a, Math.abs(v / label - Math.round(v / label)) < 1e-6)
}

// 1.75e11 -> "1750 亿", 2.8e12 -> "2.8 万亿", 438 -> "438".
export function zhNum(v) {
  const [d, u] = v >= 1e12 ? [1e12, ' 万亿'] : v >= 1e8 ? [1e8, ' 亿'] : v >= 1e4 ? [1e4, ' 万'] : [1, '']
  const n = v / d
  return `${n >= 100 ? Math.round(n) : +n.toPrecision(3)}${u}`
}
