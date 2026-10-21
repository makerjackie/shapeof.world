// Chapter 3 · bars 30, 32, 33, 36, 37: what the home costs after you move
// in. A paper bill on the right collects every line the film has added so far.
import { W, H, M, C, NUM, MONO, bt, BEAT, BAR, spring, count, txt, hero, line, rect, scaled, prog, clamp, easeIn, easeOut, easeInOut, lerp, lineWidth, measure, enter, shown, frame } from '../lib.js'
import { F } from '../facts.js'
import { INTEREST } from './s3_bank.js'

const CH = ['03', '买完以后']
const PAPER = '#f1ede3', INK = '#17161a'

// The bill. `at` is when the line is written (bar, beat); earlier lines are
// already there.
export const LINES = [
  { name: '房价', v: F.price.total, color: C.gold, at: [0, 1] },
  { name: '房贷利息（30 年）', v: F.loan.interest, color: INTEREST, at: [0, 1] },
  { name: '首套贴息', v: -F.subsidy.save, color: INTEREST, at: [0, 1] },
  { name: '契税', v: F.deed.v, color: C.gov, at: [30, 2] },
  { name: '维修资金', v: F.fund.v, color: C.keep, at: [30, 3] },
  { name: '物业费（30 年）', v: F.fee.v, color: C.keep, at: [32, 3] },
]
const UNKNOWN = ['换电梯', '大修', '续期费']
const fmt = (v) => `${v < 0 ? '−' : ''}${Math.abs(v)} 万`

export function bill(ctx, t, { x = 1150, y = 170, w = 650, alpha = 1, unknown = 0, hot = null, total = 0 } = {}) {
  if (alpha <= 0) return
  const rows = LINES.length + (unknown > 0 ? UNKNOWN.length : 0)
  const h = 120 + (rows + (total ? 1 : 0)) * 74 + 30
  ctx.save(); ctx.globalAlpha *= alpha
  rect(ctx, x, y, w, h, PAPER, 1, 14)
  // Torn edge at the bottom.
  ctx.fillStyle = PAPER; ctx.beginPath(); ctx.moveTo(x, y + h - 2)
  for (let i = 0; i <= 26; i++) ctx.lineTo(x + (w * i) / 26, y + h - 2 + (i % 2 ? 12 : 0))
  ctx.lineTo(x + w, y + h - 20); ctx.lineTo(x, y + h - 20); ctx.fill()
  txt(ctx, '这套房的账单', x + 40, y + 74, { size: 40, color: INK })
  rect(ctx, x + 40, y + 100, w - 80, 3, INK, 0.25)
  LINES.forEach((l, i) => {
    const t0 = l.at[0] ? bt(...l.at) : -1
    const e = t0 < 0 ? { a: 1, dy: 0 } : enter(t, t0, 16)
    if (e.a <= 0) return
    const yy = y + 166 + i * 74
    if (hot && hot.includes(i)) rect(ctx, x + 20, yy - 50, w - 40, 68, l.color, 0.22 * e.a, 8)
    rect(ctx, x + 40, yy - 30, 18, 18, l.color, e.a, 3)
    txt(ctx, l.name, x + 76, yy - 8 + e.dy, { size: 36, weight: 700, color: INK, alpha: e.a })
    line(ctx, fmt(l.v), x + w - 40, yy - 6 + e.dy, { size: 40, color: INK, align: 'right', alpha: e.a })
  })
  if (total) {
    const e = enter(t, total, 16), yy = y + 166 + LINES.length * 74 - 6
    rect(ctx, x + 40, yy - 58, w - 80, 3, INK, 0.5 * e.a)
    txt(ctx, '合计', x + 40, yy + e.dy, { size: 40, color: INK, alpha: e.a })
    line(ctx, `${F.bill.total} 万`, x + w - 40, yy + e.dy, { size: 48, color: INK, align: 'right', alpha: e.a })
  }
  if (unknown > 0) UNKNOWN.forEach((s, j) => {
    const e = enter(t, unknown + j * BEAT * 0.4, 16)
    const yy = y + 166 + (LINES.length + (total ? 1 : 0) + j) * 74
    frame(ctx, x + 40, yy - 30, 18, 18, INK, e.a * 0.6, 2, [4, 3])
    txt(ctx, s, x + 76, yy - 8 + e.dy, { size: 36, weight: 700, color: INK, alpha: e.a * 0.6 })
    txt(ctx, '？', x + w - 40, yy - 6 + e.dy, { size: 40, color: C.gov, align: 'right', alpha: e.a })
  })
  ctx.restore()
}

function head(ctx, t, t0, top, big, sub, color = C.ink, note = null) {
  const a = enter(t, t0), b = enter(t, t0 + BEAT * 0.4), c = enter(t, t0 + BEAT), d = enter(t, t0 + BEAT * 2)
  if (top) txt(ctx, top, M, 280 + a.dy, { size: 46, color: C.dim, alpha: a.a })
  if (big) line(ctx, big, M, 400 + b.dy, { size: 88, color, alpha: b.a })
  if (sub) line(ctx, sub, M, 480 + c.dy, { size: 40, alpha: c.a, weight: 700 })
  if (note) line(ctx, note, M, 545 + d.dy, { size: 34, color: C.dim, alpha: d.a, weight: 700 })
}

// ── Bars 30 and 32: deed tax and repair fund, then management fees ──────
function deed(ctx, t) {
  bill(ctx, t, { hot: t < bt(30, 3) ? [3] : [3, 4] })
  head(ctx, t, bt(30), '拿到房本前', `契税 ${F.deed.v} 万 · 维修资金 ${F.fund.v} 万`, '维修资金存进专户，将来修电梯、换水管', C.gov, '契税：首套、140㎡ 以下按房价的 1%')
}
function fee(ctx, t) {
  bill(ctx, t, { hot: [5] })
  head(ctx, t, bt(32), '住进去以后，每个月', `物业费：30 年约 ${F.fee.v} 万`, `全国平均每月每平方米 ${F.fee.perSqm} 元`, C.keep, '按 100㎡、价格 30 年不变估算')
}

// ── Bar 33: the building gets old ───────────────────────────────────────
function lift(ctx, x, y, w, h, old, a) {
  rect(ctx, x, y, w, h, old ? C.gov : C.faint, a * (old ? 0.95 : 1), 6)
  rect(ctx, x + w / 2 - 1.5, y + 12, 3, h - 12, C.bg, a * 0.8)
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = old ? C.bg : C.dim
  ctx.beginPath(); ctx.moveTo(x + w / 2, y - 22); ctx.lineTo(x + w / 2 - 10, y - 8); ctx.lineTo(x + w / 2 + 10, y - 8); ctx.fill()
  ctx.restore()
}
function lifts(ctx, t) {
  const cols = 11, rows = 4, x0 = 1020, y0 = 300, pw = 70, ph = 130
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const k = r * cols + c, p = spring(t, bt(33, 1.2) + k * 0.012, 3.2, 0.6)
    const old = c === (r * 4 + 3) % cols && t >= bt(33, 2.2) // one in eleven
    lift(ctx, x0 + c * pw, y0 + r * ph + (1 - clamp(p)) * 30, 52, 92, old, clamp(p * 2))
  }
  head(ctx, t, bt(33), '房子也会变老', `${F.lifts.old} 万台电梯`, '用了 15 年以上：约每 11 台里有 1 台', C.gov, `换一台约 ${F.lifts.cost[0]}–${F.lifts.cost[1]} 万，全楼分摊`)
}

// ── Bar 36: 50 years and 70 years ───────────────────────────────────────
function life(ctx, t) {
  const x0 = M + 40, x1 = W - M - 40, y = 600
  const px = (x1 - x0) / 75
  const p = easeOut(prog(t, bt(36, 1), bt(36, 2.4)))
  rect(ctx, x0, y - 3, (x1 - x0) * p, 6, C.line)
  const a0 = enter(t, bt(36, 1), 0)
  rect(ctx, x0 - 4, y - 30, 8, 60, C.dim, a0.a)
  txt(ctx, '交房', x0, y + 70, { size: 36, weight: 700, color: C.dim, alpha: a0.a })
  // 50 years: labels above the line; 70 years: below. Both end at their mark.
  ;[[F.life.design, '第 50 年', '结构设计使用年限', '到期做安全评估，不是拆', C.build, bt(36, 1.8), -1], [F.life.land, '第 70 年', '土地使用权到期', '自动续期（《民法典》第 359 条）', C.hi, bt(36, 2.6), 1]].forEach(([yr, a, b, c, col, ti, side]) => {
    const e = enter(t, ti, 30 * side), x = x0 + yr * px
    rect(ctx, x - 4, side < 0 ? y - 230 : y, 8, 230, col, e.a)
    const ys = side < 0 ? [y - 170, y - 110, y - 60] : [y + 90, y + 150, y + 200]
    line(ctx, a, x - 24, ys[0] + e.dy, { size: 56, color: col, align: 'right', alpha: e.a })
    txt(ctx, b, x - 24, ys[1] + e.dy, { size: 40, align: 'right', alpha: e.a })
    txt(ctx, c, x - 24, ys[2] + e.dy, { size: 34, weight: 700, color: C.dim, align: 'right', alpha: e.a })
  })
  const h = enter(t, bt(36))
  txt(ctx, '房子能住多久？', M, 250 + h.dy, { size: 60, alpha: h.a })
  const n = enter(t, bt(36, 3.4))
  txt(ctx, '续期要不要交钱：还没有全国统一的规定', M, 940 + n.dy, { size: 40, color: C.gov, alpha: n.a })
}

// ── Bar 37: chapter close ───────────────────────────────────────────────
function close(ctx, t) {
  bill(ctx, t, { y: 140, hot: [3, 4, 5], unknown: bt(37, 2.2), total: bt(37, 3.2) })
  const v = F.deed.v + F.fund.v + F.fee.v
  head(ctx, t, bt(37), '加起来', `30 年，再付约 ${Math.round(v)} 万`, '契税、维修资金、物业费', C.keep)
  const n = enter(t, bt(37, 2.6))
  txt(ctx, '还有现在算不出来的钱', M, 640 + n.dy, { size: 56, color: C.gov, alpha: n.a })
}

export const SHOTS = [
  { from: 30, to: 30, chapter: CH, open: true, src: `${F.deed.src} · ${F.fund.src}`, draw: deed },
  { from: 32, to: 32, chapter: CH, src: F.fee.src, draw: fee },
  { from: 33, to: 33, chapter: CH, src: F.lifts.src, draw: lifts },
  { from: 36, to: 36, chapter: CH, src: F.life.src, draw: life },
  { from: 37, to: 37, chapter: CH, src: '', draw: close },
]
