// Chapter 2 · bars 4–8 and 11: where the 100 万 comes from (it plays after
// the turn, bar 22). Bars 9–10, the cities, play in chapter 1 after bar 19.
import { W, H, M, C, NUM, bt, BEAT, BAR, spring, count, txt, hero, line, rect, scaled, prog, clamp, easeIn, easeOut, easeInOut, lerp, lineWidth, measure, enter, shown, frame } from '../lib.js'
import { F } from '../facts.js'
import * as B from '../blocks.js'
import { HOUSE } from './s0_open.js'

const CH = ['02', '钱从哪来']
const CITY_CH = ['01', '钱去哪了']

// ── Bars 4–5: 100 万 against a life of saving ────────────────────────────
// An age ruler from 22 to 72, one column per year. The same 100 blocks are
// first piled at a whole year's income per column (17.7 columns), then
// spread at what a year actually leaves over (48.5 columns, to age 70).
const AX = { x0: 300, y: 890, px: 30, from: 22, to: 72 }
const perYear = (rate) => [...Array(B.N)].map((_, i) => {
  const col = Math.floor(i / rate), row = i - Math.ceil(col * rate - 1e-9)
  return { x: AX.x0 + col * AX.px + 3, y: AX.y - (row + 1) * AX.px + 3, s: AX.px - 6, c: C.gold, a: 1 }
})
const ALL = perYear(F.income.urban / 1e4) // 5.65 a year
const SAVE = perYear(F.income.save / 1e4) // 2.06 a year
export const YEARS_END = SAVE

function ruler(ctx, t, age, a) {
  rect(ctx, AX.x0, AX.y + 4, (AX.to - AX.from) * AX.px, 3, C.line, a)
  for (const y of [22, 30, 40, 50, 60, 70]) {
    const x = AX.x0 + (y - AX.from) * AX.px
    rect(ctx, x, AX.y + 4, 3, 14, C.dim, a)
    txt(ctx, `${y} 岁`, x, AX.y + 58, { size: 34, weight: 700, color: C.dim, align: 'center', alpha: a })
  }
  // The flag: how old you are when the pile is done.
  const x = AX.x0 + (age - AX.from) * AX.px
  rect(ctx, x, 640, 4, AX.y - 636, C.hi, a)
  line(ctx, `${Math.floor(age)} 岁`, x + 14, 676, { size: 44, color: C.hi, alpha: a })
}

function years(ctx, t) {
  const t0 = bt(4), tA = bt(4, 2), tB = bt(5)
  const fill = prog(t, tA, tA + BEAT * 2.2)
  let L = ALL.map((b, i) => ({ ...b, a: clamp((fill * 100 - i) / 3) }))
  if (t >= tB) L = B.move(t, ALL, SAVE, tB + 0.1, 0.7, 0.005)
  B.draw(ctx, L)
  const age = t < tB ? AX.from + F.income.yearsAll * fill : lerp(AX.from + F.income.yearsAll, AX.from + F.income.yearsSave, easeInOut(prog(t, tB + 0.1, tB + 1.3)))
  ruler(ctx, t, age, clamp((t - tA) / 0.3))

  const k = enter(t, tA)
  const sw = clamp((t - tB) / 0.2)
  txt(ctx, '100 万，按城镇居民的人均收入算', M, 250 + k.dy, { size: 52, color: C.dim, alpha: k.a * (1 - sw) })
  txt(ctx, '可人要吃饭。每年能攒下的，只有约 2 万', M, 250, { size: 52, color: C.dim, alpha: sw })
  const h1 = enter(t, bt(4, 3.6))
  if (t < tB) {
    hero(ctx, String(F.income.yearsAll), '年', M, 500 + h1.dy, { size: 190, color: C.gold, alpha: h1.a })
    txt(ctx, '不吃不喝的全部收入', M, 590 + h1.dy, { size: 50, alpha: h1.a })
  } else {
    const h2 = spring(t, tB + 0.2, 3, 0.55)
    scaled(ctx, 1.1 - 0.1 * h2, M, 460, () => hero(ctx, count(t, tB + 0.1, 1.2, F.income.yearsSave, F.income.yearsAll).toFixed(1), '年', M, 500, { size: 190, color: C.hi }))
    const s2 = enter(t, bt(5, 3))
    txt(ctx, '从 22 岁，攒到 70 岁', M, 590 + s2.dy, { size: 50, alpha: s2.a })
  }
}

// ── Bar 6: so you borrow ─────────────────────────────────────────────────
const GRID = B.gridC({ cx: 1350, cy: 560, cols: 10, s: 46, gap: 10 })
const OWN = F.down.pay
function split(ctx, t) {
  const t0 = bt(6)
  const L = B.move(t, SAVE, GRID, t0 - 0.05, 0.55, 0.004).map((b, i) => ({ ...b, c: i >= OWN && t >= bt(6, 2) + (i - OWN) * 0.006 ? C.bank : C.gold }))
  B.draw(ctx, L)
  const k = enter(t, t0)
  txt(ctx, '所以，几乎没人全款买', M, 280 + k.dy, { size: 52, color: C.dim, alpha: k.a })
  const a = enter(t, bt(6, 1.5))
  line(ctx, `首付 ${OWN} 万`, M, 450 + a.dy, { size: 96, color: C.gold, alpha: a.a })
  txt(ctx, '你自己出', M, 520 + a.dy, { size: 44, alpha: a.a })
  const b = enter(t, bt(6, 2))
  line(ctx, `贷款 ${F.down.loan} 万`, M, 660 + b.dy, { size: 96, color: C.bank, alpha: b.a })
  txt(ctx, '银行借你', M, 730 + b.dy, { size: 44, alpha: b.a })
  const n = enter(t, bt(6, 3))
  line(ctx, `首付最低可以只付 ${F.down.min}%，这里按 3 成算`, M, 830 + n.dy, { size: 34, color: C.dim, alpha: n.a, weight: 700 })
}

// ── Bar 7: how long the down payment takes ───────────────────────────────
function savings(ctx, t) {
  const L = GRID.map((b, i) => ({ ...b, c: i < OWN ? C.gold : C.bank, a: i < OWN ? 1 : 0.22 }))
  B.draw(ctx, L)
  const k = enter(t, bt(7))
  txt(ctx, `${OWN} 万首付，要攒多久？`, M, 280 + k.dy, { size: 60, alpha: k.a })
  ;[['一个人', F.down.single, bt(7, 1.5)], ['两口子', F.down.couple, bt(7, 2.5)]].forEach(([who, y, ti], j) => {
    const p = spring(t, ti, 2.6, 0.6)
    const yy = 450 + j * 150
    txt(ctx, who, M, yy, { size: 48, alpha: clamp(p * 2) })
    const w = 36 * y * clamp(p, 0, 1.05)
    rect(ctx, M + 180, yy - 46, w, 56, C.gold, 1, 4)
    line(ctx, `${y} 年`, M + 180 + w + 24, yy + 4, { size: 72, color: C.gold, alpha: clamp(p * 2) })
  })
  const n = enter(t, bt(7, 3.5))
  txt(ctx, '按城镇居民每人每年结余约 2 万元算', M, 760 + n.dy, { size: 36, weight: 700, color: C.dim, alpha: n.a })
}

// ── Bar 8: or six wallets ───────────────────────────────────────────────
function wallet(ctx, x, y, w, a, open) {
  rect(ctx, x, y, w, w * 0.66, C.ink, a, 10)
  rect(ctx, x + w * 0.55, y + w * 0.2, w * 0.45, w * 0.26, C.faint, a, 6)
  rect(ctx, x + w * 0.66, y + w * 0.29, w * 0.08, w * 0.08, C.gold, a, 2)
  if (open > 0) rect(ctx, x + 8, y - 6 * open, w - 16, 10, C.gold, a * open, 3)
}
const WALLETS = [...Array(6)].map((_, k) => ({ x: M + k * 150 + (k >> 1) * 30, y: 430, w: 112 }))
function wallets(ctx, t) {
  const t0 = bt(8), go = bt(8, 2.5)
  // The 30 slots wait empty; each wallet sends its five blocks into them.
  GRID.forEach((b, i) => {
    if (i < OWN) frame(ctx, b.x + 2, b.y + 2, b.s - 4, b.s - 4, C.gold, 0.5, 3, [6, 5])
    else rect(ctx, b.x, b.y, b.s, b.s, C.bank, 0.22, 4)
  })
  WALLETS.forEach((wl, k) => {
    const p = spring(t, t0 + 0.15 + k * 0.08, 3.2, 0.6)
    wallet(ctx, wl.x, wl.y + (1 - p) * 40, wl.w, clamp(p * 2), clamp((t - go + 0.3) / 0.2))
  })
  for (let i = 0; i < OWN; i++) {
    const wl = WALLETS[Math.floor(i / F.wallets.per)], g = GRID[i]
    const ts = go + (i % F.wallets.per) * 0.05 + Math.floor(i / F.wallets.per) * 0.04
    const p = easeInOut(prog(t, ts, ts + 0.55))
    if (t < ts - 0.25) continue
    const x0 = wl.x + wl.w / 2 - 12, y0 = wl.y - 10
    const x = lerp(x0, g.x, p), y = lerp(y0, g.y, p) - Math.sin(p * Math.PI) * 120, s = lerp(24, g.s, p)
    rect(ctx, x, y, s, s, C.gold, clamp((t - ts + 0.25) / 0.2), 4)
  }
  const k = enter(t, t0)
  txt(ctx, '或者，靠家里凑：“六个钱包”', M, 280 + k.dy, { size: 60, alpha: k.a })
  const l = enter(t, bt(8, 1.5))
  ;['双方父母', '双方爷爷奶奶', '双方外公外婆'].forEach((s, j) => txt(ctx, s, WALLETS[j * 2].x + 131, 560 + l.dy, { size: 34, weight: 700, color: C.dim, align: 'center', alpha: l.a }))
  const a = enter(t, bt(8, 3))
  line(ctx, `每个钱包 ${F.wallets.per} 万`, M, 700 + a.dy, { size: 72, color: C.gold, alpha: a.a })
  const n = enter(t, bt(8, 3.5))
  line(ctx, `问卷：约 1/4 的年轻人，首付有父母帮忙`, M, 790 + n.dy, { size: 36, weight: 700, color: C.dim, alpha: n.a })
}

// ── Bars 9–10: what 100 万 buys, city by city ─────────────────────────────
// Squares drawn to scale (k px per metre of side); the frame pulls back for
// Hegang.
const BASE_Y = 830
function cities(ctx, t) {
  const zoom = easeInOut(prog(t, bt(10, 2), bt(10, 2) + 0.55))
  const k = lerp(26, 18, zoom)
  const rows = F.cities.rows
  const at = [1.5, 2, 2.5, 3, 3.5, 4, 5].map((b) => bt(9, b)).concat([bt(10, 3)])
  let x = M
  rows.forEach(([name, area, note], i) => {
    const side = Math.sqrt(area) * k
    const slot = Math.max(side, 132)
    const p = spring(t, at[i], i === 7 ? 2.2 : 3.2, i === 7 ? 0.45 : 0.6)
    if (p > 0) {
      const s = side * clamp(p, 0, 1.08)
      const cx = x + slot / 2
      const big = i === 7
      rect(ctx, cx - s / 2, BASE_Y - s, s, s, big ? C.hi : C.gold, big ? 0.95 : 0.92, 4)
      const a = clamp(p * 2)
      txt(ctx, name, cx, BASE_Y - s - 22, { size: big ? 52 : 38, align: 'center', alpha: a })
      line(ctx, `${area}㎡`, cx, BASE_Y + 52, { size: big ? 48 : 38, color: big ? C.hi : C.gold, align: 'center', alpha: a })
      if (note) txt(ctx, note, cx, BASE_Y + 100, { size: 34, weight: 700, color: C.dim, align: 'center', alpha: a })
    }
    x += slot + 26
  })
  const h = enter(t, bt(9))
  txt(ctx, '同样 100 万，在不同城市能买多大？', M, 230 + h.dy, { size: 60, alpha: h.a })
  const r = enter(t, bt(10, 3.6))
  line(ctx, '差 32 倍', W - M, 330 + r.dy, { size: 72, color: C.hi, align: 'right', alpha: r.a })
  const d = enter(t, bt(10, 5))
  txt(ctx, '差出来的，主要是地价', M, 330 + d.dy, { size: 52, color: C.hi, alpha: d.a })
}

// ── Bar 11: chapter close, and you sign ─────────────────────────────────
function sign(ctx, t) {
  const t0 = bt(11)
  const from = GRID.map((b, i) => ({ ...b, x: 960 + (i % 10 - 5) * 120, y: H + 80 + Math.floor(i / 10) * 30, a: 0 }))
  const to = B.tint(HOUSE, (i) => (i < OWN ? C.gold : C.bank))
  B.draw(ctx, B.move(t, from, to, t0 + 0.1, 0.7, 0.006))
  const a = enter(t, t0)
  txt(ctx, '钱从哪来？', M, 300 + a.dy, { size: 52, color: C.dim, alpha: a.a })
  const b = enter(t, bt(11, 1.5))
  txt(ctx, '首付：靠攒，靠家', M, 450 + b.dy, { size: 80, color: C.gold, alpha: b.a })
  const c = enter(t, bt(11, 2.2))
  txt(ctx, '剩下的：靠借', M, 570 + c.dy, { size: 80, color: C.bank, alpha: c.a })
}

export const SHOTS = [
  { from: 4, to: 5, chapter: CH, open: true, src: F.income.src, draw: years },
  { from: 6, to: 6, chapter: CH, src: F.down.src, draw: split },
  { from: 7, to: 7, chapter: CH, src: F.down.src, draw: savings },
  { from: 8, to: 8, chapter: CH, src: F.wallets.src, draw: wallets },
  { from: 9, to: 10, chapter: CITY_CH, src: F.cities.src, draw: cities },
  { from: 11, to: 11, chapter: CH, draw: sign },
]
