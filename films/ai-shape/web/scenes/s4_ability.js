// Chapter 4 · bars 39–50: what AI can do now, and how far apart the best and
// the cheapest are. Bars 49–50 wind up into chapter 5.
import { W, H, M, C, NUM, bt, BEAT, BAR, spring, count, txt, hero, line, rect, prog, clamp, easeOut, easeInOut, expoOut, lerp, scaled, lineWidth, clock } from '../lib.js'
import { F } from '../facts.js'

const CH = ['04', '能力']
const enter = (t, t0, d = 50) => { const s = spring(t, t0, 3.6, 0.62); return { a: clamp(s * 1.4), dy: (1 - s) * d } }

// ── Bar 39: how long a task AI can do alone ───────────────────────────────
function horizon(ctx, t) {
  const cx = 1360, cy = 590, R = 300
  ctx.save(); ctx.strokeStyle = C.line; ctx.lineWidth = 3
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke()
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2, r0 = i % 5 ? R - 14 : R - 34
    ctx.lineWidth = i % 5 ? 2 : 5; ctx.strokeStyle = i % 5 ? C.line : C.ink
    ctx.beginPath(); ctx.moveTo(cx + Math.sin(a) * r0, cy - Math.cos(a) * r0); ctx.lineTo(cx + Math.sin(a) * R, cy - Math.cos(a) * R); ctx.stroke()
  }
  ctx.restore()
  // Minutes elapsed on the clock face: 4 minutes, then a spin to 12 hours.
  const spin = expoOut(prog(t, bt(39, 2.5), bt(39, 3.5)))
  const minutes = lerp(4, 720, spin)
  const hand = (frac, len, w, col) => {
    const a = frac * Math.PI * 2
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(a) * len, cy - Math.cos(a) * len); ctx.stroke(); ctx.restore()
  }
  hand(minutes / 720, R * 0.55, 12, C.ink)
  hand((minutes % 60) / 60, R * 0.85, 7, C.hi)
  ctx.beginPath(); ctx.fillStyle = C.hi; ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.fill()

  const k = enter(t, bt(39, 1.4))
  txt(ctx, 'AI 能独立做完多长的任务？', M, 280 + k.dy, { size: 56, alpha: k.a })
  txt(ctx, '按人类专家要花的时间计，AI 有一半把握做完', M, 340 + k.dy, { size: 34, color: C.dim, alpha: k.a })
  if (t < bt(39, 3.5)) {
    const e = enter(t, bt(39, 1.6))
    txt(ctx, '2023 · GPT-4', M, 490 + e.dy, { size: 48, color: C.dim, alpha: e.a })
    hero(ctx, '4', '分钟', M, 790 + e.dy, { size: 280, alpha: e.a })
  } else {
    const e = enter(t, bt(39, 3.5))
    txt(ctx, '2026 · Claude Opus 4.6', M, 490 + e.dy, { size: 48, color: C.dim, alpha: e.a })
    hero(ctx, '12', '小时', M, 790 + e.dy, { size: 280, color: C.hi, alpha: e.a })
    const n = enter(t, bt(39, 4))
    txt(ctx, `约每 ${F.horizon.doublingMonths} 个月翻一倍`, M, 880 + n.dy, { size: 52, alpha: n.a })
  }
}

// ── Bar 40: research-level maths ──────────────────────────────────────────
function maths(ctx, t) {
  const k = enter(t, bt(40))
  txt(ctx, 'FrontierMath 4 级：43 道研究级数学难题', M, 260 + k.dy, { size: 56, alpha: k.a })
  const p = easeInOut(prog(t, bt(40, 2), bt(40, 2.9)))
  const v = lerp(F.frontierMath.from, F.frontierMath.to, p)
  rect(ctx, M, 480, W - 2 * M, 140, C.faint, 0.7)
  rect(ctx, M, 480, (W - 2 * M) * v / 100, 140, p >= 1 ? C.hi : C.ink)
  // 43 tick marks, one per problem.
  for (let i = 1; i < 43; i++) rect(ctx, M + (W - 2 * M) * i / 43, 480, 2, 140, C.bg, 0.5)
  hero(ctx, v < 10 ? v.toFixed(1) : String(Math.round(v)), '%', M, 840, { size: 220, color: p >= 1 ? C.hi : C.ink })
  line(ctx, `${F.frontierMath.fromWhen} · Claude Opus 4.1：${F.frontierMath.from}%`, M, 420, { size: 44, color: C.dim })
  if (p >= 1) line(ctx, `${F.frontierMath.toWhen} · GPT-6.1 Sol：43 道全对`, M + 560, 820, { size: 56, color: C.hi })
  line(ctx, '一年多', W - M, 440, { size: 48, color: C.dim, align: 'right', alpha: clamp(p * 3) })
}

// ── Bar 41: the Olympiad ──────────────────────────────────────────────────
function imo(ctx, t) {
  const k = enter(t, bt(41))
  txt(ctx, '2026 年国际数学奥林匹克（IMO）', M, 260 + k.dy, { size: 56, alpha: k.a })
  // 6 problems × 7 points = 42 cells.
  for (let p = 0; p < 6; p++) for (let s = 0; s < 7; s++) {
    const i = p * 7 + s, ti = bt(41, 1.25) + i * 0.022
    const a = clamp((t - ti) / 0.08)
    rect(ctx, 1000 + s * 98, 360 + p * 98, 84, 84, C.faint, 0.8)
    if (a > 0) rect(ctx, 1000 + s * 98, 360 + p * 98, 84, 84, C.hi, a)
  }
  const e = enter(t, bt(41, 2.25))
  hero(ctx, '42', '/ 42', M, 620 + e.dy, { size: 240, color: C.hi, alpha: e.a, unitScale: 0.36 })
  txt(ctx, '华为、小红书宣布：自家 AI 拿到满分', M, 700 + e.dy, { size: 44, alpha: e.a })
  const n = enter(t, bt(41, 3.25))
  line(ctx, `全部人类选手里，满分只有 ${F.imo.humansPerfect} 人`, M, 800 + n.dy, { size: 52, color: C.dim, alpha: n.a })
}

// ── Bars 42–43: the puzzle every human solves ─────────────────────────────
function arc(ctx, t) {
  const k = enter(t, bt(42))
  txt(ctx, 'ARC-AGI-3：一套人类能 100% 通关的推理小游戏', M, 260 + k.dy, { size: 56, alpha: k.a })
  const X = M, Wd = W - 2 * M
  rect(ctx, X, 380, Wd, 110, C.faint, 0.6); rect(ctx, X, 380, Wd * spring(t, bt(42), 3, 0.6), 110, C.ink)
  txt(ctx, '人类', X + 24, 455, { size: 52, color: C.bg })
  hero(ctx, '100', '%', W - M - 24, 465, { size: 100, color: C.bg, align: 'right', unitScale: 0.5 })
  const jump = spring(t, bt(43), 2.4, 0.55)
  const v = t < bt(43) ? F.arc3.launch : lerp(F.arc3.launch, F.arc3.now, clamp(jump, 0, 1.05))
  rect(ctx, X, 580, Wd, 110, C.faint, 0.6)
  rect(ctx, X, 580, Math.max(8, Wd * v / 100), 110, C.cn)
  txt(ctx, t < bt(43) ? 'AI · 2026 年 3 月' : 'AI · 2026 年 9 月', X, 560, { size: 44, color: C.cn })
  hero(ctx, v < 10 ? v.toFixed(1) : String(Math.round(v)), '%', W - M, 800, { size: 200, color: C.cn, align: 'right' })
  if (t >= bt(43, 2.5)) {
    const e = enter(t, bt(43, 2.5))
    line(ctx, '半年，0.5% → 63%', M, 860 + e.dy, { size: 72, color: C.hi, alpha: e.a })
  }
}

// ── Bar 44: the best and the cheapest ─────────────────────────────────────
function matchup(ctx, t) {
  const a = easeOut(prog(t, bt(44), bt(44) + 0.3)), b = easeOut(prog(t, bt(44, 1.5), bt(44, 1.5) + 0.3))
  rect(ctx, -W / 2 * (1 - a), 0, W / 2, H, '#13254d')
  rect(ctx, W / 2 + W / 2 * (1 - b), 0, W / 2, H, '#4a1512')
  txt(ctx, F.gap.a, W / 4, 420, { size: 80, align: 'center', alpha: a })
  txt(ctx, '最强之一', W / 4, 490, { size: 40, color: C.dim, align: 'center', alpha: a })
  txt(ctx, F.gap.b, W * 3 / 4, 420, { size: 72, align: 'center', alpha: b })
  txt(ctx, '最便宜之一', W * 3 / 4, 490, { size: 40, color: C.dim, align: 'center', alpha: b })
  const p = enter(t, bt(44, 2.5))
  hero(ctx, `$${F.gap.price.a}`, '', W / 4, 720 + p.dy, { size: 180, align: 'center', alpha: p.a })
  hero(ctx, `$${F.gap.price.b}`, '', W * 3 / 4, 720 + p.dy, { size: 180, align: 'center', alpha: p.a })
  txt(ctx, '每百万 token 输出', W / 4, 790 + p.dy, { size: 40, color: C.dim, align: 'center', alpha: p.a })
  txt(ctx, '每百万 token 输出', W * 3 / 4, 790 + p.dy, { size: 40, color: C.dim, align: 'center', alpha: p.a })
  const s = spring(t, bt(44, 3.25), 3.2, 0.5)
  if (s > 0) {
    rect(ctx, W / 2 - 300, 860, 600, 120, C.hi, clamp(s * 2))
    scaled(ctx, 1.15 - 0.15 * s, W / 2, 920, () => line(ctx, `便宜 ${F.gap.price.ratio} 倍`, W / 2, 950, { size: 80, color: C.bg, align: 'center', alpha: clamp(s * 2) }))
  }
  txt(ctx, 'vs', W / 2, 470, { size: 120, family: NUM, weight: 400, align: 'center', color: C.hi, alpha: clamp(b * 2) })
}

// ── Bars 45–47: harder problems, bigger gap ───────────────────────────────
const BX = 620, BW = 1060, BH = 58
const ROWS_Y = [400, 630, 860]
const GAPS = F.gap.rows.map((r) => Math.round(r.a - r.b))
function rows(ctx, t) {
  const k = enter(t, bt(45), 40)
  txt(ctx, '同一套题，各自最高分', M, 210 + k.dy, { size: 56, alpha: k.a })
  const lw = lineWidth(ctx, F.gap.b, 42)
  rect(ctx, W - M - lw - 52, 176, 34, 34, C.cn); line(ctx, F.gap.b, W - M, 208, { size: 42, align: 'right' })
  const lw2 = lineWidth(ctx, F.gap.a, 42), x2 = W - M - lw - 100
  rect(ctx, x2 - lw2 - 52, 176, 34, 34, C.us); line(ctx, F.gap.a, x2, 208, { size: 42, align: 'right' })
  F.gap.rows.forEach((row, i) => {
    const t0 = bt(45 + i)
    if (t < t0) return
    const cy = ROWS_Y[i], e = enter(t, t0, 34), p = clamp(spring(t, t0, 3, 0.58))
    const topY = cy - 90, botY = topY + BH + 10
    const xa = BX + BW * row.a / 100 * p, xb = BX + BW * row.b / 100 * p
    rect(ctx, BX, topY, BW, BH, C.faint, 0.5); rect(ctx, BX, botY, BW, BH, C.faint, 0.5)
    rect(ctx, BX, topY, xa - BX, BH, C.us); rect(ctx, BX, botY, xb - BX, BH, C.cn)
    txt(ctx, row.name, M, cy - 30 + e.dy, { size: 64, alpha: e.a })
    line(ctx, row.bench, M, cy + 20 + e.dy, { size: 36, color: C.dim, alpha: e.a })
    txt(ctx, ['●○○', '●●○', '●●●'][i], M, cy + 66 + e.dy, { size: 36, color: C.hi, alpha: e.a })
    txt(ctx, `${Math.round(row.a)}%`, xa + 14, topY + 52, { size: 60, weight: 400, family: NUM, alpha: e.a })
    txt(ctx, `${Math.round(row.b)}%`, xb + 14, botY + 52, { size: 60, weight: 400, family: NUM, color: C.cn, alpha: e.a })
    const by = topY - 22
    ctx.save(); ctx.globalAlpha = e.a; ctx.strokeStyle = C.hi; ctx.lineWidth = 5
    ctx.beginPath(); ctx.moveTo(xb, by + 12); ctx.lineTo(xb, by); ctx.lineTo(xa, by); ctx.lineTo(xa, by + 12); ctx.stroke(); ctx.restore()
    line(ctx, `差 ${GAPS[i]} 分`, (xa + xb) / 2, by - 12, { size: 48, color: C.hi, align: 'center', alpha: e.a })
  })
}

// ── Bar 48: the line ──────────────────────────────────────────────────────
function lesson(ctx, t) {
  const s = spring(t, bt(48), 2.6, 0.5)
  rect(ctx, 0, 0, W, H, C.hi, clamp(s * 2))
  scaled(ctx, 1.12 - 0.12 * s, W / 2, 470, () => txt(ctx, '题越难，差距越大', W / 2, 470, { size: 160, color: C.bg, align: 'center', alpha: clamp(s * 2) }))
  GAPS.forEach((g, i) => {
    const p = spring(t, bt(48, 2 + i * 0.5), 3, 0.6)
    const h = 260 * g / 68 * clamp(p, 0, 1.05), x = W / 2 - 300 + i * 240
    rect(ctx, x, 900 - h, 140, h, C.bg)
    line(ctx, `${g}`, x + 70, 900 - h - 18, { size: 52, color: C.bg, align: 'center', alpha: clamp(p * 2) })
    txt(ctx, F.gap.rows[i].name, x + 70, 950, { size: 36, color: C.bg, align: 'center', alpha: clamp(p * 2) })
  })
}

// ── Bars 49–50: wind-up into the superpowers ──────────────────────────────
// v4.1: one bar, four words (the scoreboard names the rest).
const WORDS = ['钱', '芯片', '人', '谁领先？']
function windup(ctx, t) {
  const i = clamp(Math.floor((t - bt(49)) / BEAT), 0, 3)
  const t0 = bt(49) + i * BEAT
  const split = W / 2 + Math.sin(i * 1.7) * 60
  rect(ctx, 0, 0, split, H, C.us); rect(ctx, split, 0, W - split, H, C.cn)
  const s = 1.25 - 0.25 * spring(t, t0, 4, 0.55)
  scaled(ctx, s, W / 2, 560, () => txt(ctx, WORDS[i], W / 2, 600, { size: i === 3 ? 200 : 240, align: 'center' }))
  txt(ctx, '美国', M, 980, { size: 52 }); txt(ctx, '中国', W - M, 980, { size: 52, align: 'right' })
}

export const SHOTS = [
  { from: 39, to: 39, chapter: CH, open: true, src: F.horizon.src, draw: horizon },
  { from: 40, to: 40, chapter: CH, src: F.frontierMath.src, draw: maths },
  { from: 41, to: 41, chapter: CH, src: F.imo.src, draw: imo },
  { from: 42, to: 43, chapter: CH, src: F.arc3.src, draw: arc },
  { from: 44, to: 44, chapter: CH, src: F.gap.src, draw: matchup },
  { from: 45, to: 47, chapter: CH, src: F.gap.src, draw: rows },
  { from: 48, to: 48, src: F.gap.src, srcColor: 'rgba(10,10,13,.7)', draw: lesson },
  { from: 49, to: 50, push: false, src: '', draw: windup },
]
