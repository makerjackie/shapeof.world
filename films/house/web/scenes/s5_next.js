// Chapter 4 · bars 38–40, 61, 42, 44: what happens next. Nobody can promise
// a price, so the chapter shows what has already changed.
import { W, H, M, C, NUM, bt, BEAT, BAR, spring, count, txt, hero, line, rect, scaled, prog, clamp, easeIn, easeOut, easeInOut, lerp, lineWidth, measure, enter, shown } from '../lib.js'
import { F } from '../facts.js'

const CH = ['04', '以后呢']

// ── Bar 38: the question ────────────────────────────────────────────────
function question(ctx, t) {
  const t0 = bt(38)
  const q = spring(t, t0 + BEAT * 1.2, 3, 0.55)
  scaled(ctx, 1.1 - 0.1 * q, M, 460, () => txt(ctx, '房价会涨，还是跌？', M, 500, { size: 120, alpha: clamp(q * 2) }))
  const s = enter(t, bt(38, 3))
  line(ctx, '没人能打包票。先看三个“腰斩”', M, 620 + s.dy, { size: 56, color: C.dim, alpha: s.a })
}

// ── Bars 39–40: three things that halved ─────────────────────────────────
// Each row: the earlier value as a dim bar; the later one starts full length
// and is cut at its share, the cut-off piece dropping away. A row every two
// beats, each cut on the beat after it lands. (Bar 41 is cut.)
const ROW = { x0: 600, w: 1100, y0: 290, h: 210 }
const ROWS = () => [bt(39), bt(39, 3), bt(40)]
function halves(ctx, t) {
  const a = enter(t, bt(39))
  txt(ctx, '三个“腰斩”', M, 200 + a.dy, { size: 44, color: C.dim, alpha: a.a })
  txt(ctx, '各自从最高的一年算起', M + measure(ctx, '三个“腰斩”', 44) + 30, 198 + a.dy, { size: 32, weight: 700, color: C.dim, alpha: a.a })
  F.halves.forEach((r, j) => cutRow(ctx, t, r, ROW.y0 + j * ROW.h, ROWS()[j]))
}
// One row: name and years on the left, the earlier value as a dim bar, the
// later one cut at its share on the beat after it lands.
function cutRow(ctx, t, r, y, t0) {
  const cut = t0 + BEAT
  const e = enter(t, t0, 30)
  if (e.a <= 0) return
  const [y0, v0, u] = r.from, [y1, v1] = r.to
  const ratio = v1 / v0
  txt(ctx, r.name, M, y + 52 + e.dy, { size: 52, alpha: e.a })
  txt(ctx, `${y0} → ${y1}`, M, y + 112 + e.dy, { size: 34, weight: 700, color: C.dim, alpha: e.a })
  const grow = easeOut(prog(t, t0, t0 + 0.4))
  rect(ctx, ROW.x0, y + 6, ROW.w * grow, 56, C.faint, e.a, 4)
  line(ctx, `${v0} ${u}`, ROW.x0 + 20, y + 50, { size: 40, color: C.dim, alpha: e.a * grow })
  // The later bar, cut on beat 2.
  const keep = ROW.w * ratio
  rect(ctx, ROW.x0, y + 76, (t < cut ? ROW.w * grow : keep), 56, C.hi, e.a, 4)
  if (t >= cut) {
    const d = t - cut, fall = easeIn(clamp(d / 0.7))
    ctx.save(); ctx.globalAlpha *= 1 - fall
    ctx.translate(ROW.x0 + keep, y + 76 + 300 * fall * fall); ctx.rotate(0.25 * fall)
    rect(ctx, 6, 0, ROW.w - keep - 6, 56, C.hi, 0.7, 4)
    ctx.restore()
    rect(ctx, ROW.x0 + keep + 2, y + 66, 4, 76, C.ink, 1 - clamp(d / 0.4))
    const l = enter(t, cut + 0.2, 16)
    // A short cut leaves no room after the bar: the value goes inside its end.
    const inside = ROW.x0 + keep + 24 + lineWidth(ctx, `${v1} ${u}`, 48) > W - M - 220
    if (inside) line(ctx, `${v1} ${u}`, ROW.x0 + keep - 16, y + 122 + l.dy, { size: 48, color: C.bg, align: 'right', alpha: l.a })
    else line(ctx, `${v1} ${u}`, ROW.x0 + keep + 24, y + 122 + l.dy, { size: 48, color: C.hi, alpha: l.a })
    line(ctx, `−${Math.round((1 - ratio) * 100)}%`, W - M, y + 122 + l.dy, { size: 64, color: C.gov, align: 'right', alpha: l.a })
  }
}

// ── Bar 61: and the people who build ────────────────────────────────────
function workers(ctx, t) {
  const a = enter(t, bt(61))
  txt(ctx, '盖楼的人，也少了', M, 230 + a.dy, { size: 60, alpha: a.a })
  cutRow(ctx, t, F.workers, 420, bt(61, 1.2))
  const b = spring(t, bt(61, 3), 3, 0.55)
  if (b > 0) scaled(ctx, 1.1 - 0.1 * b, M, 780, () => line(ctx, `4 年少了 ${Math.round((F.workers.from[1] - F.workers.to[1]) / 100) * 100} 万人`, M, 820, { size: 96, color: C.gov, alpha: clamp(b * 2) }))
}

// ── Bar 42: where the market is now ─────────────────────────────────────
function now(ctx, t) {
  const a = enter(t, bt(42))
  txt(ctx, '今年前 9 个月', M, 230 + a.dy, { size: 44, color: C.dim, alpha: a.a })
  const b = enter(t, bt(42, 0.4))
  txt(ctx, '二手房卖得比新房多了', M, 340 + b.dy, { size: 80, alpha: b.a })
  const nb2 = enter(t, bt(42, 2))
  txt(ctx, '统计局 2023 年开始公布这项数据以来，第一次', M, 660 + nb2.dy, { size: 34, weight: 700, color: C.dim, alpha: nb2.a })
  const k = 160 // px per 亿㎡
  ;[['二手房', F.resale.used, C.gold], ['新房', F.resale.fresh, C.dim]].forEach(([s, v, col], j) => {
    const p = spring(t, bt(42, 1.2 + j * 0.4), 2.6, 0.6), y = 420 + j * 100
    txt(ctx, s, M, y + 52, { size: 44, alpha: clamp(p * 2) })
    rect(ctx, M + 170, y + 6, k * v * clamp(p, 0, 1.03), 60, col, 1, 4)
    line(ctx, `${v} 亿㎡`, M + 170 + k * v * clamp(p, 0, 1.03) + 20, y + 56, { size: 48, color: col === C.dim ? C.ink : col, alpha: clamp(p * 2) })
  })
  const c = enter(t, bt(42, 2.8))
  txt(ctx, '2025 年 12 月：70 个大中城市的二手房价，', M, 760 + c.dy, { size: 48, alpha: c.a })
  txt(ctx, '全部比一年前低', M, 830 + c.dy, { size: 48, color: C.gov, alpha: c.a })
}

// ── Bar 44: chapter close, into the bill ────────────────────────────────
function close(ctx, t) {
  const a = enter(t, bt(44))
  txt(ctx, '明天的房价，没人能打包票。', M, 440 + a.dy, { size: 80, alpha: a.a })
  const b = spring(t, bt(44, 2.5), 3, 0.55)
  if (b > 0) scaled(ctx, 1.12 - 0.12 * b, M, 560, () => txt(ctx, '但这笔账，现在就能算清：', M, 600, { size: 80, color: C.hi, alpha: clamp(b * 2) }))
}

export const SHOTS = [
  { from: 38, to: 38, chapter: CH, open: true, draw: question },
  { from: 39, to: 40, chapter: CH, src: (t) => F.halves[ROWS().filter((r) => t >= r).length - 1].src, draw: halves },
  { from: 61, to: 61, chapter: CH, src: F.workers.src, draw: workers },
  { from: 42, to: 42, chapter: CH, src: F.resale.src, draw: now },
  { from: 44, to: 44, chapter: CH, draw: close },
]
