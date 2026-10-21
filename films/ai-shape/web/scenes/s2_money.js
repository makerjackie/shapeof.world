// Chapter 2 · bars 17–28: where the money comes from and where it goes.
import { W, H, M, C, NUM, bt, BEAT, BAR, spring, count, txt, hero, line, rect, prog, clamp, easeOut, easeInOut, easeIn, lerp, scaled, lineWidth, measure } from '../lib.js'
import { F } from '../facts.js'

const CH = ['02', '钱']
const enter = (t, t0, d = 50) => { const s = spring(t, t0, 3.6, 0.62); return { a: clamp(s * 1.4), dy: (1 - s) * d } }
const yi = (v) => Math.round(v / 1e8) // dollars → 亿

// ── Bar 17: revenue of the two leading labs ───────────────────────────────
function revenue(ctx, t) {
  const t0 = bt(17)
  const k = enter(t, t0 + BEAT * 1.2)
  txt(ctx, 'OpenAI + Anthropic 的年化收入', M, 300 + k.dy, { size: 60, alpha: k.a })
  const base = 900, max = 420, bw = 300
  const items = [['2026 年初', F.labRevenue.from, C.rest, bt(17, 1.6)], ['2026 年夏末', F.labRevenue.to, C.hi, bt(17, 2.5)]]
  items.forEach(([label, v, color, ti], i) => {
    const p = spring(t, ti, 2.6, 0.55)
    const h = max * (v / F.labRevenue.to) * p
    const x = 260 + i * 440
    rect(ctx, x, base - h, bw, h, color)
    txt(ctx, label, x + bw / 2, base + 60, { size: 40, color: C.dim, align: 'center', alpha: clamp(p * 2) })
    line(ctx, `${Math.round(count(t, ti, BEAT, yi(v)))} 亿美元`, x + bw / 2, base - h - 24, { size: 60, align: 'center', alpha: clamp(p * 2) })
  })
  const r = enter(t, bt(17, 3.2))
  txt(ctx, '8 个月', 1340, 520 + r.dy, { size: 72, color: C.dim, alpha: r.a })
  hero(ctx, '3.5', '倍', 1340, 760 + r.dy, { size: 260, color: C.hi, alpha: r.a })
}

// ── Bar 18: two unlisted companies ────────────────────────────────────────
function valuation(ctx, t) {
  const k = enter(t, bt(18))
  txt(ctx, '两家都还没上市，估值', M, 300 + k.dy, { size: 60, alpha: k.a })
  const base = 930
  rect(ctx, 700, base, 1108, 3, C.line)
  ;[['Anthropic', F.valuation.anthropic, 980, bt(18, 1)], ['OpenAI', F.valuation.openai, 1480, bt(18, 2)]].forEach(([name, v, cx, ti]) => {
    const p = spring(t, ti, 2.4, 0.55)
    const h = 500 * (v / F.valuation.anthropic) * p
    rect(ctx, cx - 140, base - h, 280, h, C.ink)
    rect(ctx, cx - 140, base - h, 280, 10, C.hi)
    const top = base - h
    txt(ctx, name, cx, top - 110, { size: 52, align: 'center', alpha: clamp(p * 2) })
    line(ctx, `${Math.round(count(t, ti, BEAT, yi(v)))} 亿美元`, cx, top - 30, { size: 70, align: 'center', alpha: clamp(p * 2) })
  })
  const n = enter(t, bt(18, 3.2))
  line(ctx, '加起来超过 1.8 万亿美元', M, 470 + n.dy, { size: 48, color: C.hi, alpha: n.a })
}

// ── Bar 19: the company that sells the shovels ────────────────────────────
function nvidia(ctx, t) {
  const t0 = bt(19)
  rect(ctx, 0, 0, W, H, C.ink)
  const k = enter(t, t0)
  txt(ctx, '卖芯片的英伟达，市值', M, 280 + k.dy, { size: 64, color: C.bg, alpha: k.a })
  const s = 1.14 - 0.14 * spring(t, t0, 2.6, 0.5)
  scaled(ctx, s, M, 560, () => hero(ctx, count(t, t0, BEAT * 1.2, F.nvidia.cap / 1e12).toFixed(2), '万亿美元', M, 600, { size: 320, color: C.bg }))
  // One reading line, top to bottom: who, how much, what that makes it.
  const w = enter(t, bt(19, 2))
  txt(ctx, '世界上最值钱的公司', M, 760 + w.dy, { size: 72, color: C.bg, alpha: w.a })
}

// ── Bars 20–22: the build, in rockets and countries ───────────────────────
const STACK = { x: 520, w: 300, base: 940, h: 700 }
function capexStack(ctx, t, collapse = 0) {
  let y = STACK.base
  F.capex.parts.forEach(([name, v], i) => {
    const ti = bt(20, 1 + i * 0.5)
    const p = spring(t, ti, 3, 0.6)
    const h = STACK.h * (v / F.capex.value) * clamp(p, 0, 1.05)
    rect(ctx, STACK.x, y - h, STACK.w, h - 3, C.hi, [1, 0.8, 0.62, 0.46][i] * (1 - collapse))
    line(ctx, `${name} ${yi(v)} 亿`, STACK.x + STACK.w + 30, y - h / 2 + 16, { size: 42, alpha: clamp(p * 2) * (1 - collapse) })
    y -= h
  })
}
function capex(ctx, t) {
  const k = enter(t, bt(20))
  txt(ctx, '2026 年，四家公司建 AI 的资本开支', M, 230 + k.dy, { size: 60, alpha: k.a })
  capexStack(ctx, t)
  let total = 0
  F.capex.parts.forEach(([, v], i) => { if (t >= bt(20, 1 + i * 0.5)) total += v })
  const r = enter(t, bt(20, 1))
  hero(ctx, String(yi(total)), '亿美元', W - M, 700 + r.dy, { size: 240, color: C.hi, align: 'right', alpha: r.a })
}

function rocket(ctx, cx, base, w, h, clip = 1) {
  ctx.save()
  ctx.beginPath(); ctx.rect(cx - w * 2, base - h * clip, w * 4, h * clip); ctx.clip()
  ctx.fillStyle = C.ink
  const nose = h * 0.12, body = h - nose
  ctx.fillRect(cx - w / 2, base - body, w, body)
  ctx.beginPath(); ctx.moveTo(cx - w / 2, base - body); ctx.lineTo(cx, base - h); ctx.lineTo(cx + w / 2, base - body); ctx.fill()
  ctx.beginPath(); ctx.moveTo(cx - w / 2, base - h * 0.18); ctx.lineTo(cx - w * 1.1, base); ctx.lineTo(cx - w / 2, base); ctx.fill()
  ctx.beginPath(); ctx.moveTo(cx + w / 2, base - h * 0.18); ctx.lineTo(cx + w * 1.1, base); ctx.lineTo(cx + w / 2, base); ctx.fill()
  ctx.fillStyle = C.bg
  for (const f of [0.35, 0.62]) ctx.fillRect(cx - w / 2, base - h * f, w, 4)
  ctx.restore()
}
function apollo(ctx, t) {
  const k = enter(t, bt(21))
  txt(ctx, '这笔钱，约等于', M, 230 + k.dy, { size: 60, alpha: k.a })
  ;[1, 1, 0.3].forEach((clip, i) => {
    const p = spring(t, bt(21, 1 + i * 0.5), 2.6, 0.55)
    rocket(ctx, 260 + i * 220, 940 + (1 - clamp(p)) * 300, 70, 640, clip)
  })
  const r = enter(t, bt(21, 2))
  hero(ctx, String(F.apollo.ratio), '个阿波罗登月', W - M, 640 + r.dy, { size: 240, align: 'right', alpha: r.a })
  const n = enter(t, bt(21, 3))
  txt(ctx, '阿波罗计划 13 年的总花费，按通胀约 3230 亿美元', W - M, 740 + n.dy, { size: 40, color: C.dim, align: 'right', alpha: n.a })
}
let sweden = null
export async function setup() {
  const topo = await (await fetch('../node_modules/world-atlas/countries-50m.json')).json()
  const f = topojson.feature(topo, topo.objects.countries).features.find((x) => Number(x.id) === 752)
  const proj = d3.geoMercator().fitExtent([[160, 200], [700, 960]], f)
  sweden = new Path2D(d3.geoPath(proj)(f))
}
function swedenShot(ctx, t) {
  const p = spring(t, bt(22), 2.6, 0.55)
  ctx.save(); ctx.translate(430, 580); ctx.scale(0.6 + 0.4 * p, 0.6 + 0.4 * p); ctx.translate(-430, -580)
  ctx.globalAlpha = clamp(p * 2); ctx.fillStyle = C.hi; ctx.fill(sweden); ctx.restore()
  const r = enter(t, bt(22, 1.5))
  txt(ctx, '也约等于', 900, 420 + r.dy, { size: 60, color: C.dim, alpha: r.a })
  txt(ctx, '瑞典', 900, 640 + r.dy, { size: 240, alpha: r.a })
  txt(ctx, '一年的 GDP', 900, 750 + r.dy, { size: 72, alpha: r.a })
  const n = enter(t, bt(22, 3))
  line(ctx, `瑞典 2026 年 GDP：${yi(F.sweden.value)} 亿美元`, 900, 840 + n.dy, { size: 40, color: C.dim, alpha: n.a })
}

// ── Bar 23: the account doesn't balance (yet) ─────────────────────────────
function account(ctx, t) {
  const k = enter(t, bt(23))
  txt(ctx, '一边是投入，一边是收入（美元/年）', M, 230 + k.dy, { size: 56, alpha: k.a })
  const rows = [
    ['四家公司 2026 年资本开支', F.capex.value, C.hi, bt(23, 1.25)],
    ['OpenAI + Anthropic 年化收入', F.labRevenue.to, C.ink, bt(23, 2.25)],
    ['全球消费者一年的 AI 支出（估）', F.consumerSpend.value, C.cyan, bt(23, 3.25)],
  ]
  rows.forEach(([label, v, color, ti], i) => {
    const p = spring(t, ti, 3, 0.6)
    const y = 340 + i * 190, w = 1300 * (v / F.capex.value) * clamp(p, 0, 1.03)
    rect(ctx, M, y, w, 90, color)
    txt(ctx, label, M, y - 18, { size: 40, color: C.dim, alpha: clamp(p * 2) })
    line(ctx, `${yi(v)} 亿`, M + w + 24, y + 70, { size: 64, alpha: clamp(p * 2) })
  })
  const r = enter(t, bt(23, 5))
  line(ctx, '今年的投入，是两家头部公司年收入的 7 倍', M, 960 + r.dy, { size: 60, color: C.hi, alpha: r.a })
}

// ── Bar 24: who writes the code now ───────────────────────────────────────
function code(ctx, t) {
  const k = enter(t, bt(24))
  txt(ctx, 'AI 已经在写 AI 公司自己的代码', M, 230 + k.dy, { size: 60, alpha: k.a })
  ;[['Google', F.aiCode.google, '新代码由 AI 生成（去年秋天是 50%）', bt(24, 1.5)], ['Anthropic', F.aiCode.anthropic, '合并进代码库的代码由 Claude 编写', bt(24, 2.5)]].forEach(([name, v, label, ti], i) => {
    const p = spring(t, ti, 2.6, 0.55)
    const cx = 520 + i * 880, cy = 620, r = 210
    ctx.save(); ctx.lineWidth = 38; ctx.strokeStyle = C.faint
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke()
    ctx.strokeStyle = C.hi; ctx.lineCap = 'butt'
    ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (v / 100) * clamp(p)); ctx.stroke(); ctx.restore()
    hero(ctx, String(Math.round(count(t, ti, BEAT, v))), i ? '%+' : '%', cx, cy + 50, { size: 150, align: 'center', unitScale: 0.4, alpha: clamp(p * 2) })
    txt(ctx, name, cx, cy + r + 90, { size: 52, align: 'center', alpha: clamp(p * 2) })
    txt(ctx, label, cx, cy + r + 150, { size: 40, color: C.dim, align: 'center', alpha: clamp(p * 2) })
  })
}

// ── Bars 27–28: chapter line ──────────────────────────────────────────────
function money(ctx, t) {
  const s = spring(t, bt(27), 2.6, 0.5)
  rect(ctx, 0, 0, W, H, C.hi, clamp(s * 2))
  scaled(ctx, 1.12 - 0.12 * s, W / 2, 500, () => {
    txt(ctx, '这是一场押注', W / 2, 470, { size: 170, color: C.bg, align: 'center', alpha: clamp(s * 2) })
  })
  const r = enter(t, bt(27, 3))
  txt(ctx, '押的是：AI 会继续变强', W / 2, 640 + r.dy, { size: 80, color: C.bg, align: 'center', alpha: r.a })
  ;['AI 有多大？', '有多强？', '谁在造？'].forEach((q, i) => {
    const n = enter(t, bt(28, 1 + i))
    txt(ctx, q, W / 2 - 520 + i * 520, 830 + n.dy, { size: 80, color: C.bg, align: 'center', alpha: n.a })
  })
}

export const SHOTS = [
  { from: 17, to: 17, chapter: CH, open: true, src: F.labRevenue.src, draw: revenue },
  { from: 18, to: 18, chapter: CH, src: F.valuation.src, draw: valuation },
  { from: 19, to: 19, chapter: CH, src: F.nvidia.src, draw: nvidia },
  { from: 20, to: 20, chapter: CH, src: F.capex.src, draw: capex },
  { from: 21, to: 21, chapter: CH, src: F.apollo.src, draw: apollo },
  { from: 22, to: 22, chapter: CH, src: F.sweden.src, draw: swedenShot },
  { from: 23, to: 23, chapter: CH, src: `${F.capex.src.split(' · ')[0]} · State of AI Report 2026 · Menlo Ventures 2026-09-16`, draw: account },
  { from: 24, to: 24, chapter: CH, src: F.aiCode.src, draw: code },
  { from: 27, to: 28, src: '', draw: money },
]
