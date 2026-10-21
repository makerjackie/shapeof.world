// Chapter 1 · bars 7–16: who uses AI, how much they use it, and why cheaper
// means more (the price fall itself is stated on the Jevons chart).
import { W, H, M, C, NUM, bt, BEAT, BAR, spring, count, txt, hero, line, rect, prog, clamp, easeOut, easeInOut, lerp, rng, scaled, lineWidth } from '../lib.js'
import { F } from '../facts.js'
import { dots, DOT_R } from './field.js'

const CH = ['01', '人与用量']
const LIT = Math.round(F.aiUsers.value / 1e6)        // 2000
const CN = Math.round(F.chinaUsers.value / 1e6)      // 700
const PAID = Math.round(F.paid.chatgpt / 1e6)        // 50
const paidSet = new Set()
for (const r = rng(2026); paidSet.size < PAID;) paidSet.add(Math.floor(r() * LIT))

// ── Bars 7–10: the field of humanity ──────────────────────────────────────
function dotStyle(i, d, t) {
  const appear = bt(7, 1.4) + (d.c / 103) * BEAT * 1.4 + d.k * 0.1
  const a0 = clamp((t - appear) / 0.15)
  if (a0 <= 0) return null
  const fall = (1 - spring(t, appear, 3.5, 0.6)) * -30
  let col = C.ink, a = 0.4 * a0, r = DOT_R
  const lit = i < LIT && t >= bt(7, 3) + (i / LIT) * 0.25
  if (lit) { col = C.cyan; a = 1 }
  if (lit && t >= bt(9) && i >= LIT - CN && t >= bt(9) + ((i - (LIT - CN)) / CN) * 0.2) col = C.cn
  // Bar 10: the lights go out; only the paying few stay on.
  if (t >= bt(10)) {
    const off = easeOut(prog(t, bt(10), bt(10) + 0.35))
    if (lit) { a = 1 - 0.8 * off; if (off > 0.5) col = C.ink }
    if (paidSet.has(i) && t >= bt(10, 3)) { col = C.gold; a = 1; r = DOT_R * (1.5 + 0.6 * (1 - spring(t, bt(10, 3), 3, 0.4))) }
    if (!lit) a = 0.4 * (1 - 0.4 * off)
  }
  return { x: d.x, y: d.y + fall, col, a, r }
}

function field(ctx, t) {
  for (let i = 0; i < dots.length; i++) {
    const s = dotStyle(i, dots[i], t)
    if (!s) continue
    ctx.globalAlpha = s.a; ctx.fillStyle = s.col
    ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2)
  }
  ctx.globalAlpha = 1
}

const enter = (t, t0) => { const s = spring(t, t0, 3.6, 0.62); return { a: clamp(s * 1.4), dy: (1 - s) * 50 } }
// A statement in the left column that lives for one bar.
function col(ctx, t, bar, fn) {
  if (t < bt(bar) || t >= bt(bar + 1)) return
  const out = 1 - clamp((t - (bt(bar + 1) - 0.07)) / 0.07)
  fn((tt) => { const e = enter(t, tt); return { a: e.a * out, dy: e.dy } })
}
const X = M, Y = 650, K = 350

function people(ctx, t) {
  field(ctx, t)
  col(ctx, t, 7, (e) => {
    const k = e(bt(7, 1.5)), h = e(bt(7, 3)), l = e(bt(7, 3.5))
    txt(ctx, '地球 83 亿人里', X, K + k.dy, { size: 56, color: C.dim, alpha: k.a })
    hero(ctx, '20', '亿人', X, Y + h.dy, { size: 250, color: C.cyan, alpha: h.a })
    line(ctx, '用过 AI', X, Y + 100 + l.dy, { size: 52, alpha: l.a })
    line(ctx, '1 个点 = 100 万人', X, Y + 170 + l.dy, { size: 44, color: C.dim, alpha: l.a })
  })
  col(ctx, t, 9, (e) => {
    const k = e(bt(9)), h = e(bt(9, 1.25)), l = e(bt(9, 3))
    txt(ctx, '其中中国', X, K + k.dy, { size: 56, color: C.cn, alpha: k.a })
    hero(ctx, '7', '亿+', X, Y + h.dy, { size: 250, color: C.cn, alpha: h.a })
    line(ctx, '超过一半人口', X, Y + 110 + l.dy, { size: 50, alpha: l.a })
  })
  col(ctx, t, 10, (e) => {
    const k = e(bt(10)), h = e(bt(10, 3)), l = e(bt(10, 3.5))
    txt(ctx, '付钱的有多少？', X, K + k.dy, { size: 72, alpha: k.a })
    hero(ctx, '5000', '万+', X, Y + h.dy, { size: 220, color: C.gold, alpha: h.a })
    line(ctx, 'ChatGPT 订阅用户', X, Y + 100 + l.dy, { size: 46, alpha: l.a })
    line(ctx, 'Claude、Gemini、豆包：不公布', X, Y + 170 + l.dy, { size: 40, color: C.dim, alpha: l.a })
  })
}

// ── Bars 11–12 (+1): tokens per day, on a linear scale ────────────────────
// Every series in tokens per day; Google's monthly figure is divided by 30.4.
const perDay = (v) => v / (365.25 / 12)
const SERIES = [
  { name: 'Google', color: C.us, pts: F.tokens.google.map(([d, v]) => [d, perDay(v)]), from: bt(11, 1.5), label: '330 倍', ly: 710 },
  { name: '豆包', color: C.cn, pts: F.tokens.doubao, from: bt(11, 4.5), label: '1500 倍', ly: 330 },
]
const yearOf = (d) => { const [y, m] = d.split('.').map(Number); return y + (m - 1) / 12 }
const CHART = { x0: 300, x1: 1240, y0: 900, y1: 300, tmin: 2024.3, tmax: 2026.7, vmax: 200e12 }
const LEG = { x: 1300 }
const cx = (yr) => lerp(CHART.x0, CHART.x1, (yr - CHART.tmin) / (CHART.tmax - CHART.tmin))
const cy = (v) => lerp(CHART.y0, CHART.y1, v / CHART.vmax)
const fmtTok = (v) => (v >= 1e12 ? `${Math.round(v / 1e12)} 万亿` : `${Math.round(v / 1e8)} 亿`)

function legend(ctx, ex, ey, ly, color, a, head, sub) {
  if (a <= 0) return
  ctx.save(); ctx.globalAlpha = a * 0.6; ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([6, 6])
  ctx.beginPath(); ctx.moveTo(ex + 14, ey); ctx.lineTo(LEG.x - 20, ly - 18); ctx.stroke(); ctx.restore()
  line(ctx, head, LEG.x, ly, { size: 42, color, alpha: a })
  line(ctx, sub, LEG.x, ly + 58, { size: 42, color: C.hi, alpha: a })
}

function tokens(ctx, t) {
  txt(ctx, '每天处理的 token（线性刻度）', M, 200, { size: 52, alpha: clamp(spring(t, bt(11), 3.4, 0.6) * 1.5) })
  for (let k = 0; k <= 4; k++) {
    const v = k * 50e12, y = cy(v)
    rect(ctx, CHART.x0, y, CHART.x1 - CHART.x0, k ? 1.5 : 3, k ? C.line : C.dim)
    if (k) txt(ctx, `${k * 50} 万亿`, CHART.x0 - 24, y + 11, { size: 30, color: C.dim, align: 'right', weight: 700 })
  }
  for (const yr of [2024.5, 2025.5, 2026.5]) txt(ctx, String(Math.floor(yr)) + ' 年中', cx(yr), CHART.y0 + 50, { size: 30, color: C.dim, align: 'center', weight: 700 })

  for (const s of SERIES) {
    const p = easeOut(prog(t, s.from, s.from + BEAT * 2.2))
    if (p <= 0) continue
    const pts = s.pts.map(([d, v]) => [cx(yearOf(d)), cy(v)])
    // Draw the polyline up to progress p.
    const seg = (pts.length - 1) * p
    ctx.save(); ctx.strokeStyle = s.color; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.shadowColor = s.color; ctx.shadowBlur = 24
    ctx.beginPath(); ctx.moveTo(...pts[0])
    for (let i = 1; i <= Math.ceil(seg); i++) {
      const u = Math.min(1, seg - (i - 1))
      ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u))
    }
    ctx.stroke(); ctx.restore()
    pts.forEach(([x, y], i) => {
      if (seg < i - 0.02) return
      ctx.beginPath(); ctx.fillStyle = s.color; ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill()
      // The first points sit on the floor; the closing caption names them.
      if (i > 0 && i < pts.length - 1) line(ctx, fmtTok(s.pts[i][1]), x - 22, y - 22, { size: 36, color: C.ink, align: 'right' })
    })
    // Legend row on the right, tied to the line's end by a leader.
    const a = clamp(prog(t, s.from + BEAT * 1.6, s.from + BEAT * 2.2) * 1.5)
    const [ex, ey] = pts[pts.length - 1]
    legend(ctx, ex, ey, s.ly, s.color, a, `${s.name} · ${fmtTok(s.pts[s.pts.length - 1][1])}/天`, `两年 ${s.label}`)
  }
  // The takeaway: two years ago is a line on the floor.
  const r = clamp(spring(t, bt(12, 5), 3.4, 0.6) * 1.5)
  if (r > 0) {
    line(ctx, '两年前的用量，几乎贴着 0', 340, 370 + (1 - r) * 40, { size: 56, color: C.hi, alpha: r })
    const g = perDay(F.tokens.google[0][1]), d = F.tokens.doubao[0][1]
    line(ctx, `2024 年：Google 每天 ${fmtTok(g)}`, 340, 430 + (1 - r) * 40, { size: 38, alpha: r })
    line(ctx, `豆包每天 ${fmtTok(d)}`, 340, 480 + (1 - r) * 40, { size: 38, alpha: r })
    ctx.save(); ctx.globalAlpha = r * 0.8; ctx.strokeStyle = C.hi; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(352, 510); ctx.lineTo(328, CHART.y0 - 30); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(312, CHART.y0 - 50); ctx.lineTo(326, CHART.y0 - 26); ctx.lineTo(344, CHART.y0 - 46); ctx.stroke()
    ctx.restore()
  }
}

// ── Bars 13–14: the price of thought ──────────────────────────────────────
function price(ctx, t) {
  const t13 = bt(13)
  txt(ctx, '在 GPQA 难题集上拿到 75% 分，每道题的成本', M, 230, { size: 52, alpha: clamp(spring(t, t13, 3.4, 0.6) * 1.5) })
  // A coin that shrinks 725 times (area), drawn as a disc.
  const shrink = easeInOut(prog(t, bt(13, 2), bt(13, 3.2)))
  const r = lerp(260, 260 / Math.sqrt(F.gpqa.ratio), shrink)
  ctx.save(); ctx.beginPath(); ctx.fillStyle = C.gold; ctx.shadowColor = C.gold; ctx.shadowBlur = 40
  ctx.arc(1400, 600, r, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  const a1 = clamp(spring(t, t13, 3, 0.6) * 1.5)
  txt(ctx, '2025 年 1 月 · o3', M, 420, { size: 44, color: C.dim, alpha: a1 })
  hero(ctx, '$0.30', '', M, 590, { size: 180, alpha: a1 * (1 - 0.6 * shrink) })
  const a2 = clamp(spring(t, bt(13, 3), 3, 0.6) * 1.5)
  txt(ctx, '18 个月后 · GPT-5.6 Luna', M, 700, { size: 44, color: C.dim, alpha: a2 })
  hero(ctx, '$0.0004', '', M, 870, { size: 180, color: C.cyan, alpha: a2 })
  if (t >= bt(14)) {
    // Bar 14: the general rule.
    const s = spring(t, bt(14), 2.8, 0.5)
    rect(ctx, 0, 0, W, H, C.bg, clamp(s * 2) * 0.92)
    scaled(ctx, 1.1 - 0.1 * s, W / 2, 560, () => {
      line(ctx, 'GPQA 这一项：18 个月便宜 725 倍', W / 2, 360, { size: 60, color: C.dim, align: 'center', alpha: clamp(s * 2) })
      txt(ctx, '五项基准平均：每年便宜', W / 2, 470, { size: 64, align: 'center', alpha: clamp(s * 2) })
      hero(ctx, '13', '倍', W / 2, 790, { size: 280, color: C.cyan, align: 'center', alpha: clamp(s * 2) })
    })
    const d = clamp(spring(t, bt(14, 3), 3.4, 0.6) * 1.5)
    line(ctx, `降价速度是 DNA 测序的 ${F.dnaFaster.value} 倍`, W / 2, 880, { size: 52, align: 'center', alpha: d })
  }
}

// ── Bars 15–16: the scissors, and the paradox named ───────────────────────
// The caption sits below the chart so the crossing stays in view.
const SC = { X0: 260, X1: 1660, Ytop: 250, Ybot: 720 }
const priceY = (u) => lerp(SC.Ytop, SC.Ybot, 1 - Math.exp(-u * 3.2))
const useY = (u) => lerp(SC.Ybot, SC.Ytop, (Math.exp(u * 3.2) - 1) / (Math.exp(3.2) - 1))
const CROSS = (() => { let best = 0; for (let i = 1; i < 1000; i++) if (Math.abs(priceY(i / 1000) - useY(i / 1000)) < Math.abs(priceY(best / 1000) - useY(best / 1000))) best = i; return best / 1000 })()
function scissors(ctx, t) {
  const p = easeInOut(prog(t, bt(15), bt(15, 4)))
  const { X0, X1, Ytop, Ybot } = SC
  rect(ctx, X0, Ybot, X1 - X0, 2, C.line)
  const curve = (f) => { ctx.beginPath(); for (let i = 0; i <= 60; i++) { const u = i / 60; if (u > p) break; const x = lerp(X0, X1, u), y = f(u); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y) } ctx.stroke() }
  ctx.save(); ctx.lineWidth = 12; ctx.lineCap = 'round'
  ctx.strokeStyle = C.cyan; ctx.shadowColor = C.cyan; ctx.shadowBlur = 24
  curve(priceY)
  ctx.strokeStyle = C.hi; ctx.shadowColor = C.hi
  curve(useY)
  ctx.restore()
  const a = clamp(p * 3)
  // The two numbers the chapter has been about, on the lines they belong to.
  line(ctx, '价格：每年便宜 13 倍', X0, Ytop - 20, { size: 52, color: C.cyan, alpha: a })
  line(ctx, '用量：两年涨 330～1500 倍', X1, Ytop - 20, { size: 52, color: C.hi, align: 'right', alpha: a })
  // The crossing, marked once both lines have passed it.
  const cx = lerp(X0, X1, CROSS), cy = priceY(CROSS), ca = clamp((p - CROSS) * 8)
  if (ca > 0) {
    const pulse = ((t - bt(15, 3)) % (BEAT * 2)) / (BEAT * 2)
    ctx.save(); ctx.globalAlpha = ca; ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.globalAlpha = ca * (1 - pulse)
    ctx.beginPath(); ctx.arc(cx, cy, 16 + pulse * 60, 0, Math.PI * 2); ctx.stroke(); ctx.restore()
  }
  if (t >= bt(16)) {
    const s = spring(t, bt(16), 2.6, 0.5)
    rect(ctx, 0, 770, W, 210, C.hi, clamp(s * 2))
    scaled(ctx, 1.1 - 0.1 * s, W / 2, 870, () => {
      txt(ctx, '越便宜，用得越多', W / 2, 880, { size: 120, color: C.bg, align: 'center', alpha: clamp(s * 2) })
    })
    const n = clamp(spring(t, bt(16, 2), 3.4, 0.6) * 1.5)
    txt(ctx, '这叫“杰文斯悖论”：1865 年，蒸汽机越省煤，英国烧的煤反而越多', W / 2, 950, { size: 40, color: C.bg, align: 'center', alpha: n })
  }
}

export const SHOTS = [
  { from: 7, to: 10, push: false, chapter: CH, open: true, src: (t) => (t < bt(9) ? F.aiUsers.src : t < bt(10) ? F.chinaUsers.src : F.paid.src), draw: people },
  { from: 11, to: 13, chapter: CH, src: `${F.tokens.src} · Google 按月换算到天 · 口径不同，仅示量级`, draw: tokens },
  { from: 15, to: 16, chapter: CH, src: '价格：Epoch AI 2026-09-22（同等能力的成本，五项基准平均）· 用量：Google I/O 2026、火山引擎 2026-06 · 曲线为示意', draw: scissors },
]
