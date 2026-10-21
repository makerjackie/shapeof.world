// Chapter 3 · bars 29–38: how big the models got — parameters, data, compute,
// cost — and how they compare with a brain.
import { W, H, M, C, NUM, bt, BEAT, BAR, spring, count, txt, hero, line, rect, prog, clamp, easeOut, easeInOut, lerp, scaled, rng, measure, lineWidth, axisMax, zoomGrid, zhNum } from '../lib.js'
import { F } from '../facts.js'

const CH = ['03', '模型有多大']
const enter = (t, t0, d = 50) => { const s = spring(t, t0, 3.6, 0.62); return { a: clamp(s * 1.4), dy: (1 - s) * d } }
const zhP = (v) => (v >= 1e12 ? `${+(v / 1e12).toFixed(2)} 万亿` : `${+(v / 1e8).toPrecision(3)} 亿`)

// ── Bars 29–31 (+1): parameters on a linear axis that keeps zooming out ───
// A log axis made eight years of growth look flat. Here each record-breaker
// first shoots off the chart, then the axis pulls back and everything before
// it shrinks towards zero.
const PC = { x0: 300, x1: 1760, y0: 890, h: 560 }
const PITCH = (PC.x1 - PC.x0) / F.params.rows.length
const P_AT = [[29, 2], [29, 3], [30, 1], [30, 3], [31, 1], [31, 1.5], [31, 2], [31, 2.5], [31, 3.5]]
const ZOOM = BEAT * 0.9
// Records: the axis moves out 0.6 beat after one lands. [row, headroom, tag]
const P_REC = [[0, 0.8], [1, 0.8, '×13'], [2, 0.8, '×117'], [3, 0.8, '×10'], [8, 0.92, '×2.7']]
const P_STEPS = P_REC.map(([i, room]) => [i ? bt(...P_AT[i]) + BEAT * 0.6 : -1, F.params.rows[i][2] / room])

// Column chart with a zooming axis; shared by parameters and compute. Every
// column's label is on screen from the first frame (dim until it arrives), the
// axis maximum is read out as it moves, and a column too tall for the chart is
// cut under the title with a break mark.
function columns(ctx, t, { rows, at, steps, x0, x1, y0, h, colW, fmt, grid, tags, clipTop, unit = '', readout = true }) {
  const max = axisMax(t, steps, ZOOM)
  const pitch = (x1 - x0) / rows.length
  zoomGrid(max, h, (v, px, a, major) => {
    rect(ctx, x0 - 10, y0 - px, x1 - x0 + 10, 1.5, C.line, a)
    if (major) txt(ctx, grid(v), x0 - 24, y0 - px + 11, { size: 30, color: C.dim, align: 'right', weight: 700, alpha: Math.max(a, 0.7) })
  })
  rect(ctx, x0 - 10, y0, x1 - x0 + 10, 3, C.dim)
  if (readout) line(ctx, `纵轴上限 ${grid(max)}${unit}`, M, y0 - h - 26, { size: 38, color: C.hi })
  rows.forEach((r, i) => {
    const ti = at[i]
    const p = spring(t, ti, 3.2, 0.62), a = t < ti ? 0.3 : Math.max(0.3, clamp(p * 2))
    const x = x0 + pitch * (i + 0.5)
    const nameSize = Math.min(40, (40 * (pitch - 14)) / measure(ctx, r.name, 40))
    txt(ctx, r.name, x, y0 + 52, { size: nameSize, align: 'center', alpha: a })
    txt(ctx, r.sub, x, y0 + 94, { size: 32, color: C.dim, align: 'center', weight: 700, alpha: a })
    if (t < ti) return
    if (r.v == null) {
      // Undisclosed: a dashed empty box at the foot of the axis.
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = r.color; ctx.lineWidth = 3; ctx.setLineDash([8, 7])
      ctx.strokeRect(x - colW / 2, y0 - 90, colW, 90); ctx.restore()
      txt(ctx, '?', x, y0 - 24, { size: 56, color: r.color, align: 'center', family: NUM, weight: 400, alpha: a })
      txt(ctx, '未公开', x, y0 - 110, { size: 36, color: C.dim, align: 'center', alpha: a })
      return
    }
    const full = Math.max(3, (h * r.v) / max) * clamp(p, 0, 1.04), hh = Math.min(full, y0 - clipTop)
    rect(ctx, x - colW / 2, y0 - hh, colW, hh, r.color)
    if (full > hh) {
      // Break mark: the column goes on above the frame of the chart.
      ctx.save(); ctx.strokeStyle = C.bg; ctx.lineWidth = 7
      for (const d of [26, 46]) { ctx.beginPath(); ctx.moveTo(x - colW / 2 - 4, y0 - hh + d + 10); ctx.lineTo(x + colW / 2 + 4, y0 - hh + d - 10); ctx.stroke() }
      ctx.restore()
    }
    // The value appears once the column fits on the chart.
    const fits = clamp((h + 30 - full) / 40)
    line(ctx, fmt(r.v), x, y0 - hh - 18, { size: 40, align: 'center', alpha: a * fits })
    const tag = tags?.[i]
    if (tag) {
      const ta = clamp((t - ti) / 0.12) * (1 - clamp((t - ti - BEAT * 2.2) / 0.3))
      const ty = Math.max(y0 - hh - 80, y0 - h - 10) + (full > hh ? 110 : 0), tw = lineWidth(ctx, tag, 72)
      rect(ctx, x - tw / 2 - 16, ty - 72, tw + 32, 90, C.bg, ta * 0.85, 12)
      line(ctx, tag, x, ty, { size: 72, color: C.hi, align: 'center', alpha: ta })
    }
  })
}

function params(ctx, t, _shot, bare = false) {
  const h = enter(t, bt(29, 1.4))
  txt(ctx, '参数量（线性刻度 · ×N：比前一个大几倍）', M, 200 + h.dy, { size: 52, alpha: h.a })
  // Long names break onto the year line.
  const rows = F.params.rows.map(([name, yr, v, who]) => ({ name: name.split('-V')[0], sub: name.includes('-V') ? `V${name.split('-V')[1]} · ${yr}` : String(yr), v, color: who === 'cn' ? C.cn : C.us }))
  const tags = {}; P_REC.forEach(([i, , tag]) => { if (tag) tags[i] = tag })
  columns(ctx, t, { rows, at: P_AT.map((b) => bt(...b)), steps: P_STEPS, ...PC, clipTop: 240, colW: 96, fmt: zhP, grid: zhNum, tags: bare ? null : tags, readout: !bare })
  if (bare) return
  const end = enter(t, bt(31, 5))
  line(ctx, '8 年，2.4 万倍', PC.x0 + 20, 470 + end.dy, { size: 110, color: C.hi, alpha: end.a })
  const n = enter(t, bt(31, 6))
  txt(ctx, 'GPT-1、GPT-2 也在图上', PC.x0 + 20, 556 + n.dy, { size: 36, alpha: n.a })
  txt(ctx, '只是矮得看不见了', PC.x0 + 20, 604 + n.dy, { size: 36, alpha: n.a })
  if (n.a > 0) {
    ctx.save(); ctx.globalAlpha = n.a * 0.8; ctx.strokeStyle = C.ink; ctx.lineWidth = 3
    const ax = PC.x0 + PITCH, ay = 650
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax, PC.y0 - 70); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(ax - 14, PC.y0 - 88); ctx.lineTo(ax, PC.y0 - 66); ctx.lineTo(ax + 14, PC.y0 - 88); ctx.stroke()
    ctx.restore()
  }
}

// ── Bar 32: mixture of experts ────────────────────────────────────────────
function moe(ctx, t) {
  const k = enter(t, bt(32))
  txt(ctx, 'Kimi K3 有 2.8 万亿参数，但每个字只用其中', M, 230 + k.dy, { size: 56, alpha: k.a })
  const cols = 50, rows = 20, cell = 19, gap = 5
  const gw = cols * (cell + gap), x0 = W - M - gw, y0 = 380
  const active = Math.round(1000 * F.moe.active / F.moe.total) // 37
  const lit = new Set(); for (const r = rng(32); lit.size < active;) lit.add(Math.floor(r() * 1000))
  for (let i = 0; i < 1000; i++) {
    const x = x0 + (i % cols) * (cell + gap), y = y0 + Math.floor(i / cols) * (cell + gap)
    const on = lit.has(i) && t >= bt(32, 2) + (i % 37) * 0.012
    rect(ctx, x, y, cell, cell, on ? C.hi : C.faint, on ? 1 : 0.8)
  }
  const r = enter(t, bt(32, 2.5))
  hero(ctx, '3.7', '%', M, 600 + r.dy, { size: 200, color: C.hi, alpha: r.a })
  line(ctx, '1040 亿参数在干活', M, 690 + r.dy, { size: 44, alpha: r.a })
  txt(ctx, '这叫“混合专家”（MoE）', M, 770 + r.dy, { size: 40, color: C.dim, alpha: r.a })
}

// ── Bar 33: training data vs all public human text ───────────────────────
function data(ctx, t) {
  const k = enter(t, bt(33))
  txt(ctx, '训练数据（token）', M, 230 + k.dy, { size: 60, alpha: k.a })
  const x0 = M + 40, w = W - M - x0, h = 96, stock = F.trainTokens.stock
  const rows = [
    ['人类所有公开文本（Epoch 估计）', '约 300 万亿', stock, C.faint, bt(33, 1.25)],
    ['GPT-3 · 2020', '3000 亿', F.trainTokens.gpt3, C.us, bt(33, 2.25)],
    ['DeepSeek V4.1 Flash · 2026', '45 万亿 · 150 倍', F.trainTokens.flash, C.cn, bt(33, 3.25)],
  ]
  rows.forEach(([label, num, v, color, ti], i) => {
    const p = spring(t, ti, 3, 0.6), y = 360 + i * 180
    const bw = Math.max(4, w * v / stock) * clamp(p, 0, 1.02)
    rect(ctx, x0, y, bw, h, color)
    if (i === 0) { ctx.save(); ctx.strokeStyle = C.dim; ctx.setLineDash([10, 8]); ctx.lineWidth = 2; ctx.strokeRect(x0, y, w, h); ctx.restore() }
    txt(ctx, label, x0, y - 16, { size: 38, color: C.dim, alpha: Math.max(0.35, clamp(p * 2)) })
    line(ctx, num, i === 0 ? x0 + w - 24 : x0 + bw + 24, y + 66, { size: 52, align: i === 0 ? 'right' : 'left', color: i === 0 ? C.ink : color, alpha: clamp(p * 2) })
  })
  const r = enter(t, bt(33, 5))
  line(ctx, '一个模型，已经读了人类公开文字的约 15%', M, 950 + r.dy, { size: 56, color: C.hi, alpha: r.a })
}

// ── Bar 34 (+1): training compute, linear ─────────────────────────────────
// In units of the 2017 Transformer, so the labels are plain multiples.
const STEPS = [['Transformer', 2017, 7.42e18], ['GPT-3', 2020, 3.14e23], ['GPT-4', 2023, 2.1e25], ['GPT-6 Astra', 2026, F.compute.astra]]
const C_AT = [[34, 1.25], [34, 2.25], [34, 3.25], [34, 4.25]]
const C_ROWS = STEPS.map(([name, yr, v], i) => ({ name, sub: String(yr), v: v / STEPS[0][2], color: i === 3 ? C.hi : C.ink }))
const C_STEPS = C_ROWS.map((r, i) => [i ? bt(...C_AT[i]) + BEAT * 0.5 : -1, r.v / (i === 3 ? 0.92 : 0.8)])
const times = (v) => (v < 1.5 ? '1' : `${zhNum(v)} 倍`)
function compute(ctx, t) {
  const k = enter(t, bt(34))
  txt(ctx, '训练一次要做多少次计算', M, 200 + k.dy, { size: 60, alpha: k.a })
  txt(ctx, '以 2017 年的 Transformer 为 1 · 线性刻度 · ×N：比前一个多几倍', M, 262 + k.dy, { size: 38, color: C.dim, alpha: k.a })
  columns(ctx, t, { rows: C_ROWS, at: C_AT.map((b) => bt(...b)), steps: C_STEPS, x0: 300, x1: 1760, y0: 890, h: 480, clipTop: 300, colW: 220, fmt: times, grid: (v) => `${zhNum(v)} 倍`, tags: { 1: '×4.2 万', 2: '×67', 3: '×45' } })
  const r = enter(t, bt(34, 5))
  line(ctx, '9 年，约 1.3 亿倍', 320, 520 + r.dy, { size: 120, color: C.hi, alpha: r.a })
  const n = enter(t, bt(34, 6))
  line(ctx, '2023 年的 GPT-4，只有它的 2%', 320, 610 + n.dy, { size: 44, alpha: n.a })
}

// ── Bar 35 (+1): training cost, linear, bars zooming out to the right ────
const K_AT = [[35, 1.25], [35, 2.25], [35, 3.25], [35, 4.25]]
const K_STEPS = F.trainCost.rows.map(([, , v], i) => [i ? bt(...K_AT[i]) + BEAT * 0.5 : -1, v / (i === 3 ? 0.78 : 0.8)])
const usd = (v) => (v >= 1e8 ? `${+(v / 1e8).toFixed(1)} 亿美元` : v >= 1e4 ? `${Math.round(v / 1e4)} 万美元` : `${v} 美元`)
function cost(ctx, t) {
  const k = enter(t, bt(35))
  txt(ctx, '训练一次要花多少钱（美元 · Epoch 估计 · 线性刻度）', M, 200 + k.dy, { size: 60, alpha: k.a })
  const x0 = 560, L = 1100, max = axisMax(t, K_STEPS, ZOOM)
  zoomGrid(max, L, (v, px, a, major) => {
    rect(ctx, x0 + px, 300, 1.5, 580, C.line, a)
    if (major) txt(ctx, zhNum(v), x0 + px, 930, { size: 30, color: C.dim, align: 'center', weight: 700, alpha: a })
  })
  rect(ctx, x0 - 3, 300, 3, 580, C.dim)
  txt(ctx, '×N：比上一行贵几倍', M, 262 + k.dy, { size: 38, color: C.dim, alpha: k.a })
  F.trainCost.rows.forEach(([name, yr, v], i) => {
    const ti = bt(...K_AT[i]), y = 330 + i * 140
    txt(ctx, `${name} · ${yr}`, x0 - 30, y + 58, { size: 42, align: 'right', alpha: t < ti ? 0.3 : 1 })
    if (t < ti) return
    const p = spring(t, ti, 3.2, 0.62), a = clamp(p * 2)
    const full = Math.max(3, (L * v) / max) * clamp(p, 0, 1.04), w = Math.min(full, W - 40 - x0)
    rect(ctx, x0, y, w, 84, i === 3 ? C.hi : C.ink, i === 3 ? 1 : 0.85)
    // Past the end of the axis: the value rides inside the bar, and a cut
    // mark shows it carries on beyond the frame.
    const over = clamp((full - L - 40) / 40)
    if (over > 0) line(ctx, usd(v), x0 + w - (full > w ? 90 : 24), y + 62, { size: 52, color: C.bg, align: 'right', alpha: over })
    if (full > w) {
      ctx.save(); ctx.strokeStyle = C.bg; ctx.lineWidth = 7
      for (const d of [44, 24]) { ctx.beginPath(); ctx.moveTo(x0 + w - d - 10, y - 4); ctx.lineTo(x0 + w - d + 10, y + 88); ctx.stroke() }
      ctx.restore()
    }
    // Otherwise the value (and how many times the row above it is) sits after the bar.
    const fits = 1 - over
    const lw = line(ctx, usd(v), x0 + w + 24, y + 62, { size: 52, alpha: a * fits })
    const tag = ['', '×4700', '×18', '×10'][i]
    if (tag) line(ctx, tag, x0 + w + 24 + lw + 22, y + 62, { size: 44, color: C.hi, alpha: a * fits })
  })
  const r = enter(t, bt(35, 5))
  line(ctx, '8 年，约 89 万倍', W - M, 420 + r.dy, { size: 110, color: C.hi, align: 'right', alpha: r.a })
  const n = enter(t, bt(35, 6))
  line(ctx, '438 美元 → 3.9 亿美元', W - M, 500 + n.dy, { size: 48, align: 'right', alpha: n.a })
}

// ── Bars 36–37: a brain for scale ─────────────────────────────────────────
function brain(ctx, t) {
  const k = enter(t, bt(36))
  txt(ctx, '和人脑比一比', M, 230 + k.dy, { size: 60, alpha: k.a })
  // Areas proportional: 150 trillion synapses vs 2.8 trillion parameters.
  const big = 560, small = big * Math.sqrt(2.8e12 / F.brain.synapses)
  const bx = W - M - big, by = 330
  const p1 = spring(t, bt(36, 1), 2.6, 0.6), p2 = spring(t, bt(36, 2), 3.4, 0.5)
  rect(ctx, bx, by, big * clamp(p1), big * clamp(p1), C.gold, 0.3)
  ctx.save(); ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.strokeRect(bx, by, big * clamp(p1), big * clamp(p1)); ctx.restore()
  rect(ctx, bx, by + big - small * clamp(p2), small * clamp(p2), small * clamp(p2), C.cn)
  line(ctx, '人脑新皮层的突触：约 150 万亿', bx + big, by - 24, { size: 40, color: C.gold, align: 'right', alpha: clamp(p1 * 2) })
  line(ctx, 'Kimi K3：2.8 万亿', bx + small + 20, by + big - 20, { size: 40, color: C.cn, alpha: clamp(p2 * 2) })
  const r = enter(t, bt(36, 2.75))
  txt(ctx, '最大的开源模型，参数量只有', M, 380 + r.dy, { size: 44, alpha: r.a })
  txt(ctx, '人脑突触数的', M, 440 + r.dy, { size: 44, alpha: r.a })
  hero(ctx, '1.9', '%', M, 640 + r.dy, { size: 220, color: C.cn, alpha: r.a })
  txt(ctx, '（参数和突触不是一回事，只比数量级）', M, 730 + r.dy, { size: 36, color: C.dim, alpha: r.a })
}

const LIVES = (() => {
  const r = rng(37), out = []
  for (let i = 0; i < 22000; i++) out.push([r(), r()])
  return out
})()
function energy(ctx, t) {
  const t0 = bt(37)
  // 22,000 dots fill the frame: one per human lifetime of brain energy.
  const n = Math.floor(22000 * easeOut(prog(t, t0 + BEAT * 0.5, t0 + BEAT * 2.5)))
  ctx.fillStyle = C.gold
  for (let i = 0; i < n; i++) { const [u, v] = LIVES[i]; ctx.globalAlpha = 0.55; ctx.fillRect(M + u * (W - 2 * M), 300 + v * 620, 3, 3) }
  ctx.globalAlpha = 1
  rect(ctx, 0, 150, W, 140, C.bg, 0.9)
  const k = enter(t, t0)
  line(ctx, `人脑功率约 ${F.brain.watts} 瓦。训练 Grok 4 用了 ${F.grok4Energy.gwh} GWh 电`, M, 240 + k.dy, { size: 52, alpha: k.a })
  const r = enter(t, bt(37, 2.5))
  rect(ctx, M - 20, 760, 1400, 210, C.bg, r.a * 0.92)
  line(ctx, `≈ ${F.grok4Energy.lifetimes / 1e4} 万个人一辈子的大脑耗能`, M, 860 + r.dy, { size: 80, color: C.gold, alpha: r.a })
  txt(ctx, '每个点 = 一个人一生（20 瓦 × 80 年）', M, 930 + r.dy, { size: 38, color: C.dim, alpha: r.a })
}

// ── Bar 38: they stopped telling us ───────────────────────────────────────
function secret(ctx, t) {
  const k = enter(t, bt(38))
  txt(ctx, '今天最强的模型有多大？', W / 2, 260 + k.dy, { size: 72, align: 'center', alpha: k.a })
  ;['GPT-6 Astra', 'Claude Opus 5.5', 'Gemini 4 Argon'].forEach((name, i) => {
    const ti = bt(38, 1.5 + i * 0.5)
    const e = enter(t, ti)
    const y = 440 + i * 170
    txt(ctx, name, W / 2 - 60, y + e.dy, { size: 80, align: 'right', alpha: e.a })
    const s = spring(t, ti + 0.1, 4.5, 0.45)
    if (s > 0) {
      ctx.save(); ctx.translate(W / 2 + 200, y - 28); ctx.rotate(-0.06); ctx.scale(1.5 - 0.5 * s, 1.5 - 0.5 * s)
      ctx.globalAlpha = clamp(s * 2); ctx.strokeStyle = C.cn; ctx.lineWidth = 6; ctx.strokeRect(-150, -48, 300, 96)
      txt(ctx, '未公开', 0, 22, { size: 60, color: C.cn, align: 'center' }); ctx.restore()
    }
  })
}

export const SHOTS = [
  { from: 29, to: 31, chapter: CH, open: true, src: F.params.src, draw: params },
  { from: 32, to: 32, chapter: CH, src: F.moe.src, draw: moe },
  { from: 33, to: 33, chapter: CH, src: F.trainTokens.src, draw: data },
  { from: 34, to: 34, chapter: CH, src: F.compute.src, draw: compute },
  { from: 35, to: 35, chapter: CH, src: F.trainCost.src, draw: cost },
  { from: 36, to: 36, chapter: CH, src: F.brain.src, draw: brain },
  { from: 37, to: 37, chapter: CH, src: F.grok4Energy.src, draw: energy },
  { from: 38, to: 38, chapter: CH, src: 'OpenAI、Anthropic、Google 均未公布这些模型的参数量（截至 2026-10-19）', draw: secret },
]
