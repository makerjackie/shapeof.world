// Chapter 1 · bars 12–21 and the cities (bars 9–10, in s1): where the 100 万
// goes, answering the opening question first. The blocks leave a pile on the
// right and land in one stack per recipient: the building's 33 first, then
// the 67, then all of it lines up as one strip. Play order: 12, 15, 16, 13,
// 14, 17, 18, 20, 21, 19.
import { W, H, M, C, NUM, bt, BEAT, BAR, spring, count, txt, hero, line, rect, scaled, prog, clamp, easeIn, easeOut, easeInOut, lerp, lineWidth, measure, enter, shown, bracket } from '../lib.js'
import { F } from '../facts.js'
import * as B from '../blocks.js'
import { HOUSE } from './s0_open.js'

export const CH = ['01', '钱去哪了']
const TAX = '#ff8f7a', KIT = '#1fa3b8'
const COLOR = { land: C.gov, build: C.build, tax: TAX, kit: KIT, fin: C.bank, sell: C.rest, dev: C.dev }
const G = F.split.groups
// Block i belongs to group GROUP[i], as the jth block of it.
const GROUP = [], NTH = []
G.forEach((g) => { for (let j = 0; j < g.n; j++) { GROUP.push(g.key); NTH.push(j) } })
const FIRST = Object.fromEntries(G.map((g) => [g.key, GROUP.indexOf(g.key)]))

// One stack per recipient, and on the right the pile the money leaves from.
// Pile and stacks are all five blocks wide on one baseline, so heights
// compare honestly. Block 0 sits on top of the pile and leaves first.
const ST = { x0: M, step: 194, base: 960, cols: 5, s: 30, gap: 6 }
const PILE_X = 1640
const PILE = [...Array(B.N)].map((_, i) => {
  const j = B.N - 1 - i, p = ST.s + ST.gap
  return { x: PILE_X + (j % ST.cols) * p, y: ST.base - ST.s - Math.floor(j / ST.cols) * p, s: ST.s, c: C.gold, a: 1 }
})
const stackX = (key) => ST.x0 + G.findIndex((g) => g.key === key) * ST.step
const STACK = GROUP.map((key, i) => {
  const j = NTH[i], p = ST.s + ST.gap
  return { x: stackX(key) + (j % ST.cols) * p, y: ST.base - ST.s - Math.floor(j / ST.cols) * p, s: ST.s, c: COLOR[key], a: 1 }
})
const stackTop = (key) => ST.base - Math.ceil(G.find((g) => g.key === key).n / ST.cols) * (ST.s + ST.gap)

// When each group pours from the pile into its stack.
const POUR = { land: bt(13, 1), build: bt(15, 1.2), tax: bt(17, 1), kit: bt(17, 2), fin: bt(17, 2.5), sell: bt(17, 3), dev: bt(18, 1.2) }
const pourDur = 0.5, pourGap = 0.018

// Where block i is at time t during the chapter, in pile or stack.
function blocks(t) {
  const start = B.tint(HOUSE, () => C.gold)
  const settle = B.move(t, start, PILE, bt(12, 1.8), 0.6, 0.003)
  return settle.map((b, i) => {
    const key = GROUP[i], t0 = POUR[key] + NTH[i] * pourGap
    if (t < t0) return { ...b, c: C.gold }
    const p = easeInOut(prog(t, t0, t0 + pourDur))
    const s = STACK[i]
    return { x: lerp(b.x, s.x, p), y: lerp(b.y, s.y, p) - Math.sin(p * Math.PI) * 140, s: s.s, c: p < 0.3 ? C.gold : s.c, a: 1 }
  })
}

// Name and amount over each stack once it has landed.
function labels(ctx, t, dim = 1, focus = null) {
  for (const g of G) {
    const t0 = POUR[g.key] + g.n * pourGap + pourDur * 0.6
    const k = enter(t, t0, 24)
    if (k.a <= 0) continue
    const x = stackX(g.key) + 69, top = stackTop(g.key)
    const d = focus && g.key !== focus ? 0.3 : dim
    txt(ctx, g.name, x, top - 82 + k.dy, { size: 32, weight: 700, color: C.ink, align: 'center', alpha: k.a * d })
    line(ctx, `${g.n} 万`, x, top - 22 + k.dy, { size: 54, color: COLOR[g.key], align: 'center', alpha: k.a * d })
  }
}

// Over the pile: what has not been handed out yet.
function pileLabel(ctx, t, alpha = 1) {
  let left = 0
  for (let i = 0; i < B.N; i++) if (t < POUR[GROUP[i]] + NTH[i] * pourGap + pourDur * 0.5) left++
  if (left <= 0) return
  const top = ST.base - Math.ceil(left / ST.cols) * (ST.s + ST.gap)
  const a = alpha * clamp((t - bt(12, 2.4)) / 0.3)
  const x = PILE_X + 87
  txt(ctx, '还没分的', x, top - 82, { size: 32, weight: 700, color: C.dim, align: 'center', alpha: a })
  line(ctx, `${left} 万`, x, top - 22, { size: 54, color: C.gold, align: 'center', alpha: a })
}

// One reading zone at the top: header (dim), punchline, support.
function head(ctx, t, t0, top, big, sub, color = C.ink, out = 1) {
  const a = enter(t, t0), b = enter(t, t0 + BEAT * 0.4), c = enter(t, t0 + BEAT)
  if (top) txt(ctx, top, M, 200 + a.dy, { size: 44, color: C.dim, alpha: a.a * out })
  if (big) line(ctx, big, M, 300 + b.dy, { size: 84, color, alpha: b.a * out })
  if (sub) line(ctx, sub, M, 378 + c.dy, { size: 42, alpha: c.a * out, weight: 700 })
}

// ── Bar 12: the pile (the chapter card says the rest) ───────────────────
function open(ctx, t) {
  B.draw(ctx, blocks(t))
  pileLabel(ctx, t)
}

// ── Bar 13: the land, the biggest piece of the 67 ───────────────────────
function land(ctx, t) {
  B.draw(ctx, blocks(t))
  labels(ctx, t)
  pileLabel(ctx, t)
  head(ctx, t, bt(13, 1.6), '剩下的 67 万里，最大的一块', '土地：38 万', '交给地方政府的土地出让金', C.gov)
}

// ── Bar 14: and where the land money goes next ──────────────────────────
function gov(ctx, t) {
  B.draw(ctx, blocks(t).map((b, i) => ({ ...b, a: GROUP[i] === 'land' ? 1 : 0.3 })))
  labels(ctx, t, 1, 'land')
  pileLabel(ctx, t, 0.3)
  head(ctx, t, bt(14), '政府拿到的土地钱，又去了哪？', '修路、通水电、城市建设', '还有征地补偿和农业农村')
  // 2025: what land sales brought in, and what went out against them.
  const x0 = 620, w = 160
  ;[['2025 年，全国卖地收入', F.landUse.income, C.gov, bt(14, 2)], ['相关支出', F.landUse.spend, C.dim, bt(14, 2.6)]].forEach(([s, v, col, ti], j) => {
    const p = spring(t, ti, 2.6, 0.6)
    const y = 640 + j * 130
    txt(ctx, s, x0, y - 16, { size: 36, weight: 700, alpha: clamp(p * 2) })
    rect(ctx, x0, y, w * v * clamp(p, 0, 1.04), 56, col, 1, 4)
    line(ctx, `${v} 万亿`, x0 + w * v * clamp(p, 0, 1.04) + 20, y + 48, { size: 52, color: col === C.dim ? C.ink : col, alpha: clamp(p * 2) })
  })
  const r = enter(t, bt(14, 3.4))
  txt(ctx, '花的比收的还多', x0, 920 + r.dy, { size: 52, color: C.hi, alpha: r.a })
  const n = enter(t, bt(14, 3.8))
  txt(ctx, '支出可以动用往年结余', x0 + measure(ctx, '花的比收的还多', 52) + 30, 918 + n.dy, { size: 32, weight: 700, color: C.dim, alpha: n.a })
}

// ── Bars 15–16: the building, and the people who build it ──────────────
function build(ctx, t) {
  const work = t >= bt(16)
  const L = blocks(t).map((b, i) => {
    if (!work) return b
    const hot = GROUP[i] === 'build' && NTH[i] < Math.round(F.build.labor)
    return { ...b, c: hot ? C.hi : b.c, a: GROUP[i] === 'build' ? 1 : 0.35 }
  })
  B.draw(ctx, L)
  labels(ctx, t)
  pileLabel(ctx, t, work ? 0.3 : 1)
  if (!work) head(ctx, t, bt(15), '先分出开头说的', '盖楼：33 万', `${F.build.steel} 吨钢筋 · ${F.build.concrete} 立方米混凝土`, C.build)
  else {
    head(ctx, t, bt(16), '这 33 万里', `工人的工资：约 ${F.build.labor} 万`, `≈ 一个建筑工人 ${F.build.months} 个月的收入`, C.hi)
    const n = enter(t, bt(16, 3))
    line(ctx, `建筑工人平均月收入 ${F.build.wage} 元`, M, 444 + n.dy, { size: 34, color: C.dim, alpha: n.a, weight: 700 })
  }
}

// ── Bar 17: taxes, roads and pipes, interest, selling ───────────────────
function others(ctx, t) {
  B.draw(ctx, blocks(t))
  labels(ctx, t)
  pileLabel(ctx, t)
  head(ctx, t, bt(17), '然后是税和其他', `税 11 万，给政府`, null, TAX)
}

// ── Bar 18: what is left for the developer ──────────────────────────────
function dev(ctx, t) {
  B.draw(ctx, blocks(t).map((b, i) => ({ ...b, a: GROUP[i] === 'dev' || t < bt(18, 2) ? 1 : 0.45 })))
  labels(ctx, t)
  pileLabel(ctx, t)
  head(ctx, t, bt(18), '最后：开发商', '只剩约 4 万', `还常常亏：2025 年，万科平均每天亏 ${F.dev.perDay} 亿`, C.dev)
}

// ── Bar 19: why big cities cost more ─────────────────────────────────────
const TIERS = [['一线城市', F.landShare.tier1], ['二线城市', F.landShare.tier2], ['都市圈三线', 32], ['其他三线', F.landShare.low]]
function why(ctx, t) {
  const t0 = bt(19)
  const fade = 1 - easeOut(prog(t, t0, t0 + 0.3))
  B.draw(ctx, STRIP, fade)
  const a = enter(t, t0)
  txt(ctx, '近一半是地和税。所以，为什么大城市的房子贵？', M, 220 + a.dy, { size: 44, color: C.dim, alpha: a.a })
  const b = enter(t, bt(19, 3))
  line(ctx, '城市越大，房价里“地”占得越多', M, 320 + b.dy, { size: 72, color: C.gov, alpha: b.a })
  const x0 = 520, w = 1200
  TIERS.forEach(([name, v], j) => {
    const ti = bt(19, 1.3 + j * 0.4), p = spring(t, ti, 2.8, 0.6)
    const y = 470 + j * 110
    txt(ctx, name, x0 - 30, y + 46, { size: 40, align: 'right', alpha: clamp(p * 2) })
    rect(ctx, x0, y, w, 64, C.faint, clamp(p * 2), 4)
    rect(ctx, x0, y, w * v / 100 * clamp(p, 0, 1.03), 64, C.gov, 1, 4)
    line(ctx, `${v}%`, x0 + w * v / 100 * clamp(p, 0, 1.03) + 20, y + 52, { size: 54, color: C.gov, alpha: clamp(p * 2) })
  })
  const n = enter(t, bt(19, 2.5))
  txt(ctx, '红色：地价占房价的比例', x0, 940 + n.dy, { size: 34, weight: 700, color: C.dim, alpha: n.a })
}

// ── Bars 20–21: the whole split as one strip (chapter close) ────────────
// Government = land + tax, building = construction + fittings, then the
// banks and sales, then the developer. Three rows, column by column.
const PARTS = [
  { name: '土地和税', keys: ['land', 'tax'], color: C.gov },
  { name: '盖楼和配套', keys: ['build', 'kit'], color: C.build },
  { name: '利息、卖房', keys: ['fin', 'sell'], color: C.bank },
  { name: '开发商', keys: ['dev'], color: C.dev },
]
const SP = { pitch: 45, s: 39, rows: 3, gap: 30, y: 600 }
const STRIP = (() => {
  const out = Array(B.N), spans = []
  const cols = PARTS.map((p) => Math.ceil(p.keys.reduce((n, k) => n + G.find((g) => g.key === k).n, 0) / SP.rows))
  const total = cols.reduce((a, b) => a + b, 0) * SP.pitch - SP.s * 0 + (PARTS.length - 1) * SP.gap
  let x = (W - total) / 2
  PARTS.forEach((p, k) => {
    let j = 0
    for (const key of p.keys) for (let i = FIRST[key]; i < FIRST[key] + G.find((g) => g.key === key).n; i++) {
      out[i] = { x: x + Math.floor(j / SP.rows) * SP.pitch, y: SP.y + (j % SP.rows) * SP.pitch, s: SP.s, c: COLOR[key], a: 1 }
      j++
    }
    spans.push([x, x + cols[k] * SP.pitch - (SP.pitch - SP.s), j])
    x += cols[k] * SP.pitch + SP.gap
  })
  out.spans = spans
  return out
})()
function summary(ctx, t) {
  const t0 = bt(20)
  B.draw(ctx, B.move(t, STACK, STRIP, t0 + 0.1, 0.6, 0.004))
  PARTS.forEach((p, k) => {
    const [x0, x1, n] = STRIP.spans[k]
    const e = enter(t, bt(20, 1.6 + k * 0.4), 20)
    bracket(ctx, x0, x1, 570, p.color, e.a)
    const cx = (x0 + x1) / 2
    txt(ctx, p.name, cx, 500 + e.dy, { size: k < 2 ? 40 : 30, weight: 700, align: 'center', alpha: e.a })
    line(ctx, `${n} 万`, cx, 552 + e.dy, { size: k < 2 ? 56 : 44, color: p.color, align: 'center', alpha: e.a })
  })
  const a = enter(t, t0 + 0.2)
  txt(ctx, '你付的 100 万，大致这样分', M, 220 + a.dy, { size: 44, color: C.dim, alpha: a.a })
  const b = enter(t, bt(21))
  line(ctx, '开头那 67 万里，49 万是地和税', M, 330 + b.dy, { size: 72, alpha: b.a })
  const n = enter(t, bt(21, 2.5))
  txt(ctx, '按全国均价 1 万元/㎡ 估算；大城市地价占比更高，小城市更低', M, 860 + n.dy, { size: 34, weight: 700, color: C.dim, alpha: n.a })
}

export const SHOTS = [
  { from: 12, to: 12, chapter: CH, open: true, src: F.split.src, draw: open },
  { from: 13, to: 13, chapter: CH, src: F.landShare.src, draw: land },
  { from: 14, to: 14, chapter: CH, src: `${F.landUse.src} · 支出范围：财综〔2006〕68 号`, draw: gov },
  { from: 15, to: 16, chapter: CH, src: F.build.src, draw: build },
  { from: 17, to: 17, chapter: CH, src: F.split.src, draw: others },
  { from: 18, to: 18, chapter: CH, src: F.dev.src, draw: dev },
  { from: 19, to: 19, chapter: CH, src: F.landShare.src, draw: why },
  { from: 20, to: 21, chapter: CH, src: F.split.src, draw: summary },
]
export { STRIP, COLOR, GROUP }
