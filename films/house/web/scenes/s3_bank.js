// Bar 22 (the turn) and the second half of chapter 2 · bars 23–28 and 60:
// the bank. Play order: 23, 24, 25, 60, 26, 27, 28.
import { W, H, M, C, NUM, bt, BEAT, BAR, spring, count, txt, hero, line, rect, scaled, prog, clamp, easeIn, easeOut, easeInOut, lerp, lineWidth, measure, enter, shown, arrow, frame } from '../lib.js'
import { F } from '../facts.js'
import * as B from '../blocks.js'
import { STRIP } from './s2_split.js'

const CH = ['02', '钱从哪来']
export const INTEREST = '#9cc0ff' // interest: a paler blue than the principal

// Where the running bill sits (top-right), for blocks that fly into it.
export const BILL_AT = { x: W - M - 180, y: 79 }

// ── Bar 22 (+2): "paid off?" — "it has only begun" ──────────────────────
function turn(ctx, t) {
  const t0 = bt(22), go = bt(22, 5.6)
  // The strip from chapter 2 gathers and flies into the bill.
  const L = STRIP.map((b, i) => {
    const ts = go + i * 0.004, p = easeIn(prog(t, ts, ts + 0.45))
    return { x: lerp(b.x, BILL_AT.x, p), y: lerp(b.y, BILL_AT.y, p), s: lerp(b.s, 6, p), c: b.c, a: (0.25 * clamp((t - t0) / 0.4) + 0.6 * p) * (1 - p * p) }
  })
  B.draw(ctx, L)
  const q = spring(t, t0 + 0.05, 3, 0.55)
  if (t < bt(22, 6)) scaled(ctx, 1.1 - 0.1 * q, W / 2, 520, () => txt(ctx, '100 万，付完了吗？', W / 2, 560, { size: 120, align: 'center', alpha: clamp(q * 2) * (1 - clamp((t - bt(22, 5.8)) / 0.2)) }))
  const r = spring(t, bt(22, 6), 3.2, 0.5)
  if (r > 0) scaled(ctx, 1.25 - 0.25 * r, W / 2, 520, () => txt(ctx, '才刚开始。', W / 2, 560, { size: 150, color: C.hi, align: 'center', alpha: clamp(r * 2) }))
}

// ── Bar 23: the loan ────────────────────────────────────────────────────
const LOAN = B.grid({ x: 1100, y: 300, cols: 10, s: 52, gap: 10, n: F.loan.p, c: C.bank })
function loan(ctx, t) {
  B.draw(ctx, B.popIn(t, LOAN, bt(23, 1.2), 0.6))
  const a = enter(t, bt(23, 1.2))
  txt(ctx, `银行借你 ${F.loan.p} 万，还 ${F.loan.years} 年`, M, 300 + a.dy, { size: 52, color: C.dim, alpha: a.a })
  const b = enter(t, bt(23, 2))
  txt(ctx, '每个月还', M, 400 + b.dy, { size: 60, alpha: b.a })
  hero(ctx, String(Math.round(count(t, bt(23, 2), 0.8, F.loan.monthly))), '元', M, 640 + b.dy, { size: 220, color: C.bank, alpha: b.a })
  const n = enter(t, bt(23, 3))
  line(ctx, `利率 ${F.loan.rate}%，是现在新房贷的平均水平`, M, 740 + n.dy, { size: 36, weight: 700, color: C.dim, alpha: n.a })
}

// ── Bar 24: 360 payments ────────────────────────────────────────────────
const MON = { x: 860, y: 330, cols: 30, rows: 12, p: 30, s: 24 }
function months(ctx, t) {
  const t0 = bt(24), fill = prog(t, bt(24, 1.4), bt(24, 3.6))
  const done = Math.floor(fill * 360)
  for (let c = 0; c < MON.cols; c++) for (let r = 0; r < MON.rows; r++) {
    const k = c * 12 + r
    rect(ctx, MON.x + c * MON.p, MON.y + r * MON.p, MON.s, MON.s, k < done ? C.bank : C.faint, 1, 3)
  }
  // Ages under the columns: one column a year.
  ;[[0, '30 岁'], [10, '40 岁'], [20, '50 岁'], [29, '60 岁']].forEach(([c, s]) => txt(ctx, s, MON.x + c * MON.p + 12, MON.y + MON.rows * MON.p + 44, { size: 34, weight: 700, color: C.dim, align: 'center' }))
  const a = enter(t, t0)
  txt(ctx, '一格 = 一个月', MON.x, MON.y - 30 + a.dy, { size: 32, weight: 700, color: C.dim, alpha: a.a })
  const b = enter(t, t0 + 0.1)
  hero(ctx, String(Math.max(1, done)), '个月', M, 560 + b.dy, { size: 200, color: C.bank, alpha: b.a })
  const n = enter(t, bt(24, 3))
  txt(ctx, '从 30 岁，还到 60 岁', M, 670 + n.dy, { size: 56, alpha: n.a })
}

// ── Bar 25: the interest ────────────────────────────────────────────────
const INT_N = Math.round(F.loan.interest) // 38 blocks
const PRIN = B.grid({ x: 1000, y: 260, cols: 12, s: 44, gap: 8, n: F.loan.p, c: C.bank })
function interest(ctx, t) {
  B.draw(ctx, PRIN)
  // Interest blocks pour in after the principal, continuing the grid.
  const L = B.grid({ x: 1000, y: 260, cols: 12, s: 44, gap: 8, n: F.loan.p + INT_N, c: INTEREST }).slice(F.loan.p)
  B.draw(ctx, B.popIn(t, L, bt(25, 1.6), 0.9))
  const a = enter(t, bt(25))
  txt(ctx, '30 年下来，除了还 70 万本金', M, 300 + a.dy, { size: 52, color: C.dim, alpha: a.a })
  const b = enter(t, bt(25, 1.6))
  txt(ctx, '你的房贷利息', M, 400 + b.dy, { size: 64, alpha: b.a })
  hero(ctx, count(t, bt(25, 1.6), 0.9, F.loan.interest).toFixed(1), '万', M, 640 + b.dy, { size: 220, color: INTEREST, alpha: b.a })
  const n = enter(t, bt(25, 3))
  txt(ctx, `比你的首付（${F.down.pay} 万）还多`, M, 750 + n.dy, { size: 56, color: C.hi, alpha: n.a })
}

// ── Bar 60: the comparison the film is built on ────────────────────────
// Down payment, the building and the interest as honest stacks, one scale.
const CMP = [
  { name: '首付', v: F.down.pay, n: F.down.pay, c: C.gold, ti: 1.4 },
  { name: '盖楼', v: 33, n: 33, c: C.build, ti: 2 },
  { name: '利息', v: F.loan.interest, n: INT_N, c: INTEREST, ti: 2.6 },
]
const CMP_X = [800, 1150, 1500], CMP_BASE = 960
const CMP_L = CMP.map((g, k) => B.stacks([{ ...g, x: CMP_X[k] }], { base: CMP_BASE, s: 44, gap: 8 }))
function compare(ctx, t) {
  CMP.forEach((g, k) => {
    B.draw(ctx, B.popIn(t, CMP_L[k], bt(60, g.ti), 0.45))
    const e = enter(t, bt(60, g.ti) + 0.4, 20)
    const top = Math.min(...CMP_L[k].map((b) => b.y)), cx = CMP_X[k] + 128
    txt(ctx, g.name, cx, top - 92 + e.dy, { size: 40, weight: 700, align: 'center', alpha: e.a })
    line(ctx, `${g.v} 万`, cx, top - 26 + e.dy, { size: 60, color: g.c, align: 'center', alpha: e.a })
  })
  const a = enter(t, bt(60))
  txt(ctx, '三个数，放在一起', M, 260 + a.dy, { size: 48, color: C.dim, alpha: a.a })
  const q = spring(t, bt(60, 3.4), 3, 0.55)
  if (q > 0) scaled(ctx, 1.1 - 0.1 * q, M, 380, () => {
    txt(ctx, '你付给银行的利息，', M, 400, { size: 76, alpha: clamp(q * 2) })
    txt(ctx, '比盖这栋楼的钱还多', M, 500, { size: 76, color: C.hi, alpha: clamp(q * 2) })
  })
}

// ── Bar 26: and that is after rates halved ──────────────────────────────
function rate2021(ctx, t) {
  const a = enter(t, bt(26))
  txt(ctx, `同样借 ${F.loan.p} 万、还 30 年，利息一共`, M, 260 + a.dy, { size: 52, color: C.dim, alpha: a.a })
  const k = 9 // px per 万
  ;[['2021 年底', F.rate2021.rate, F.rate2021.interest, bt(26, 1.3)], ['现在', F.loan.rate, F.loan.interest, bt(26, 2.1)]].forEach(([when, r, v, ti], j) => {
    const p = spring(t, ti, 2.6, 0.6)
    const y = 400 + j * 200
    line(ctx, `${when} · ${r}%`, M, y + 10, { size: 48, alpha: clamp(p * 2) })
    rect(ctx, 560, y - 50, k * v * clamp(p, 0, 1.04), 80, j ? INTEREST : C.dim, 1, 4)
    line(ctx, `${v} 万`, 560 + k * v * clamp(p, 0, 1.04) + 24, y + 14, { size: 72, color: j ? INTEREST : C.ink, alpha: clamp(p * 2) })
  })
  // The principal as a reference mark: in 2021 the interest beat it.
  const m = enter(t, bt(26, 1.8), 0)
  rect(ctx, 560 + k * F.loan.p, 330, 4, 360, C.hi, m.a)
  txt(ctx, `本金 ${F.loan.p} 万`, 560 + k * F.loan.p, 316, { size: 30, weight: 700, color: C.hi, align: 'center', alpha: m.a })
  const n = enter(t, bt(26, 3.2))
  txt(ctx, `${F.loan.interest} 万，已经是少了一半之后`, M, 880 + n.dy, { size: 72, color: C.hi, alpha: n.a })
}

// ── Bars 27–28: the 2026 mortgage subsidy ───────────────────────────────
function chip(ctx, s, x, y, a, color = C.ink) {
  const w = lineWidth(ctx, s, 44) + 48
  rect(ctx, x, y - 56, w, 76, color, a * 0.14, 38)
  line(ctx, s, x + 24, y, { size: 44, color, alpha: a })
  return w
}
function subsidy(ctx, t) {
  const a = enter(t, bt(27))
  txt(ctx, '新政策：2026 年 10 月 1 日起', M, 260 + a.dy, { size: 52, color: C.hi, alpha: a.a })
  const b = enter(t, bt(27, 1.6))
  line(ctx, '首套房贷，每年贴息 1%，最长 5 年', M, 380 + b.dy, { size: 80, alpha: b.a })
  let x = M
  ;['首套', '≤ 120㎡', '≤ 150 万', '新发放的商业贷款'].forEach((s, j) => {
    const e = enter(t, bt(27, 2.5 + j * 0.3), 20)
    x += chip(ctx, s, x, 500 + e.dy, e.a) + 20
  })
  const c = enter(t, bt(28))
  txt(ctx, '这套 100 平、100 万的房子，正好符合', M, 640 + c.dy, { size: 48, alpha: c.a })
  const d = spring(t, bt(28, 2), 3, 0.55)
  if (d > 0) scaled(ctx, 1.15 - 0.15 * d, M, 760, () => line(ctx, `省下约 ${F.subsidy.save} 万利息`, M, 800, { size: 110, color: C.hi, alpha: clamp(d * 2) }))
  const r = enter(t, bt(28, 3.4))
  txt(ctx, `利息还剩 ${(F.loan.interest - F.subsidy.save).toFixed(1)} 万，依然比盖楼的 33 万多`, M, 890 + r.dy, { size: 52, alpha: r.a })
  const n = enter(t, bt(28, 4.4))
  txt(ctx, '政策暂定实施 1 年；以银行和当地财政的规定为准', M, 950 + n.dy, { size: 30, weight: 700, color: C.dim, alpha: n.a })
  // Three blocks leave the bill as the saving lands.
  for (let i = 0; i < 3; i++) {
    const ts = bt(28, 2.6) + i * 0.08, p = easeOut(prog(t, ts, ts + 0.6))
    if (p <= 0 || p >= 1) continue
    rect(ctx, BILL_AT.x - 20 + i * 18, BILL_AT.y + 50 + p * 140, 22, 22, INTEREST, 1 - p, 3)
  }
}

export const SHOTS = [
  { from: 22, to: 22, push: false, draw: turn },
  { from: 23, to: 23, chapter: CH, src: F.loan.src, draw: loan },
  { from: 24, to: 24, chapter: CH, src: F.loan.src, draw: months },
  { from: 25, to: 25, chapter: CH, src: F.loan.src, draw: interest },
  { from: 60, to: 60, chapter: CH, src: '盖楼 33 万：第 1 章的估算 · 利息：等额本息，70 万、30 年、3.1%', draw: compare },
  { from: 26, to: 26, chapter: CH, src: F.rate2021.src, draw: rate2021 },
  { from: 27, to: 28, chapter: CH, src: F.subsidy.src, draw: subsidy },
]
