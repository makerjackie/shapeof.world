// Chapter 5 · bars 51–72: the two superpowers as a tug of war in which a
// bigger lead pulls harder, the verdict, the four small places both depend on,
// and the rest of the world.
import { W, H, M, C, NUM, bt, BEAT, BAR, spring, count, txt, hero, line, rect, prog, clamp, easeOut, easeInOut, lerp, scaled, lineWidth, measure } from '../lib.js'
import { F } from '../facts.js'
import { TUG_AT } from '../timeline.js'
import { map, setupMap, drawMap, drawCountry, drawLand } from './map.js'

const CH = ['05', '中美与世界']
const enter = (t, t0, d = 50) => { const s = spring(t, t0, 3.6, 0.62); return { a: clamp(s * 1.4), dy: (1 - s) * d } }
const yi = (v) => Math.round(v / 1e8)
export const setup = setupMap

// ── Bars 51–59: the tug of war ────────────────────────────────────────────
// Each pull moves the rope by log10 of how many times ahead the winner is, so
// a 23× lead counts for far more than a 1.6× one. The rope ends on the US side.
const UNIT = 50, ROPE_Y = 650, GROUND = 870
const pullAt = (i) => bt(...TUG_AT[i])
const sign = (it) => (it.side === 'us' ? -1 : 1) // the US pulls left
function offset(t) {
  let x = 0
  F.tug.forEach((it, i) => { x += sign(it) * UNIT * Math.log10(it.ratio) * spring(t, pullAt(i), 2.2, 0.45) })
  return x + 5 * Math.sin(t * 9.3) // a little tension in the line
}
// The side that scores jolts back; the other stumbles forward; both ease off.
function lean(t, side) {
  let l = 0.38
  F.tug.forEach((it, i) => {
    const d = t - pullAt(i)
    if (d < 0 || d > 1.2) return
    const k = Math.exp(-d * 3.5) * Math.sin(Math.min(d * 9, Math.PI / 2)) * Math.min(1.4, 0.5 + Math.log10(it.ratio) * 0.6)
    l += it.side === side ? 0.18 * k : -0.22 * k
  })
  return l
}
function figure(ctx, x, color, side, l, k) {
  const dir = side === 'us' ? -1 : 1, ang = dir * l
  const rot = (px, py) => [x + px * Math.cos(ang) - py * Math.sin(ang), GROUND + px * Math.sin(ang) + py * Math.cos(ang)]
  const [hx, hy] = rot(0, -105), [sx, sy] = rot(0, -185), [cx, cy] = rot(0, -225)
  ctx.save(); ctx.globalAlpha *= k; ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineCap = 'round'
  ctx.lineWidth = 16
  ctx.beginPath(); ctx.moveTo(x - 26 * dir, GROUND); ctx.lineTo(hx, hy); ctx.lineTo(x + 18 * dir, GROUND); ctx.stroke()
  ctx.lineWidth = 34
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(sx, sy); ctx.stroke()
  ctx.lineWidth = 12
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(x - dir * 70, ROPE_Y); ctx.stroke()
  ctx.beginPath(); ctx.arc(cx, cy, 27, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}
function rope(ctx, x0, x1, off) {
  ctx.save()
  ctx.strokeStyle = '#c9b48a'; ctx.lineWidth = 14; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(x0 + off, ROPE_Y); ctx.lineTo(x1 + off, ROPE_Y); ctx.stroke()
  ctx.strokeStyle = '#8e7a55'; ctx.lineWidth = 3
  for (let x = x0; x < x1; x += 22) { ctx.beginPath(); ctx.moveTo(x + off - 5, ROPE_Y - 6); ctx.lineTo(x + off + 5, ROPE_Y + 6); ctx.stroke() }
  ctx.restore()
}
function tug(ctx, t) {
  const t0 = bt(51), off = offset(t), k = enter(t, t0 + BEAT * 0.8)
  txt(ctx, '美国', M, 230, { size: 64, color: C.us, alpha: k.a })
  txt(ctx, '中国', W - M, 230, { size: 64, color: C.cn, align: 'right', alpha: k.a })
  txt(ctx, '中美拔河：差得越多，拉得越远', W / 2, 225, { size: 48, align: 'center', alpha: k.a })
  // Ground, the middle line, the rope and its flag, the two teams.
  rect(ctx, 0, GROUND, W, 3, C.line)
  ctx.save(); ctx.setLineDash([10, 10]); ctx.strokeStyle = C.dim; ctx.lineWidth = 2; ctx.globalAlpha = 0.7
  ctx.beginPath(); ctx.moveTo(W / 2, 560); ctx.lineTo(W / 2, GROUND); ctx.stroke(); ctx.restore()
  txt(ctx, '中线', W / 2, GROUND + 50, { size: 32, color: C.dim, align: 'center', alpha: k.a })
  const walk = easeOut(prog(t, t0, t0 + BEAT * 1.5))
  const usX = [360, 480, 600, 720].map((x) => x - (1 - walk) * 760)
  const cnX = [1200, 1320, 1440, 1560].map((x) => x + (1 - walk) * 760)
  rope(ctx, 200 - (1 - walk) * 760, 1720 + (1 - walk) * 760, off)
  const fx = W / 2 + off
  ctx.save(); ctx.fillStyle = C.hi
  ctx.fillRect(fx - 4, ROPE_Y, 8, 70)
  ctx.beginPath(); ctx.moveTo(fx, ROPE_Y + 8); ctx.lineTo(fx + 50, ROPE_Y + 30); ctx.lineTo(fx, ROPE_Y + 52); ctx.fill(); ctx.restore()
  const lu = lean(t, 'us'), lc = lean(t, 'cn')
  usX.forEach((x) => figure(ctx, x + off, C.us, 'us', lu, walk))
  cnX.forEach((x) => figure(ctx, x + off, C.cn, 'cn', lc, walk))
  // The current pull, on the side that won it.
  let cur = -1
  F.tug.forEach((_, i) => { if (t >= pullAt(i)) cur = i })
  if (cur >= 0 && t < bt(59)) {
    const it = F.tug[cur], e = enter(t, pullAt(cur), 30)
    const left = it.side === 'us', x = left ? M : W / 2 + 60, color = left ? C.us : C.cn
    rect(ctx, x, 300 + e.dy, W / 2 - M - 60, 200, C.faint, 0.75 * e.a, 12)
    rect(ctx, x, 300 + e.dy, 10, 200, color, e.a)
    txt(ctx, it.name, x + 36, 352 + e.dy, { size: 40, color: C.dim, alpha: e.a })
    line(ctx, it.claim, x + 36, 438 + e.dy, { size: 72, color: C.ink, alpha: e.a })
    txt(ctx, it.detail, x + 36, 482 + e.dy, { size: 30, color: C.dim, weight: 700, alpha: e.a })
  }
  // The rope has settled on the US side.
  const end = enter(t, bt(59))
  if (end.a > 0) {
    rect(ctx, M, 300, W - 2 * M, 200, C.us, 0.9 * end.a, 12)
    txt(ctx, '美国明显领先', W / 2, 440 + end.dy, { size: 120, align: 'center', alpha: end.a })
  }
}
const tugSrc = (t) => {
  let cur = -1
  F.tug.forEach((_, i) => { if (t >= pullAt(i)) cur = i })
  return cur >= 0 && t < bt(59) ? `本项：${F.tug[cur].src} · 绳子按差距倍数（取对数）移动` : '绳子按每项差距的倍数（取对数）移动 · 各项来源见视频简介'
}

// ── Bar 62 (+1): the verdict ──────────────────────────────────────────────
function verdict(ctx, t) {
  const s = spring(t, bt(62), 2.6, 0.5), a = clamp(s * 2)
  rect(ctx, 0, 0, W, 560, C.us, a)
  scaled(ctx, 1.08 - 0.08 * s, W / 2, 330, () => txt(ctx, 'AI 本身：美国明显领先', W / 2, 350, { size: 112, align: 'center', alpha: a }))
  txt(ctx, '最强的模型、钱、芯片、算力', W / 2, 460, { size: 52, align: 'center', alpha: a })
  const c = enter(t, bt(62, 2.5))
  rect(ctx, 0, 560, W, 200, C.cn, c.a)
  txt(ctx, '中国的底牌：人、电和开源', W / 2, 690 + c.dy * 0.5, { size: 76, align: 'center', alpha: c.a })
  const r = enter(t, bt(62, 4))
  rect(ctx, 0, 760, W, H - 760, C.bg, r.a)
  line(ctx, `能力：中国最强的模型，平均晚约 ${F.lag.months} 个月达到美国的水平`, W / 2, 870 + r.dy, { size: 56, align: 'center', alpha: r.a })
  const n = enter(t, bt(62, 5.5))
  line(ctx, '差距最小 4 个月，最大 14 个月（2023 年以来）', W / 2, 950 + n.dy, { size: 40, color: C.hi, align: 'center', alpha: n.a })
}

// ── Bars 63–68: four small places ─────────────────────────────────────────
const PLACES = [
  { at: bt(63), lonlat: [121, 23.7], id: 158 },
  { at: bt(64, 3), lonlat: [5.3, 52.2], id: 528 },
  { at: bt(66), lonlat: [127.8, 36.4], id: 410 },
  { at: bt(67, 3), lonlat: [138.5, 36.5], id: 392 },
]
// The card (and its source line) changes half a beat after the camera sets off.
const cardOf = (t) => { let i = 0; while (i < 3 && t >= PLACES[i + 1].at + BEAT * 0.5) i++; return i }
function chokepoints(ctx, t) {
  let i = 0
  while (i < 3 && t >= PLACES[i + 1].at) i++
  const P = PLACES[i], ci = cardOf(t), R = F.choke.rows[ci]
  const [px, py] = map.projection(P.lonlat)
  const zIn = easeInOut(prog(t, P.at, P.at + BEAT * 1.2))
  const prev = i > 0 ? map.projection(PLACES[i - 1].lonlat) : [W / 2, H / 2]
  const fx = lerp(prev[0], px, zIn), fy = lerp(prev[1], py, zIn)
  const nextAt = i < 3 ? PLACES[i + 1].at : bt(69)
  const drift = 1 + 0.06 * prog(t, P.at, nextAt)
  const z = (i === 0 ? lerp(1, 5.5, zIn) : 5.5) * drift
  // Map, scaled around the focus, pinned to the right half of the frame.
  ctx.save()
  ctx.translate(1340, 560); ctx.scale(z, z); ctx.translate(-fx, -fy)
  drawLand(ctx, 1.2 / z)
  drawMap(ctx, map, { tilt: 0, colors: new Map(), alpha: 0.5, reveal: 1, dotAlpha: 0.5 })
  drawCountry(ctx, P.id, C.hi, 0.95, 2 / z)
  ctx.restore()
  // Pulse on the place.
  const pulse = (t - P.at) % (BEAT * 2) / (BEAT * 2)
  ctx.save(); ctx.strokeStyle = C.hi; ctx.lineWidth = 4; ctx.globalAlpha = 1 - pulse
  ctx.beginPath(); ctx.arc(1340, 560, 30 + pulse * 120, 0, Math.PI * 2); ctx.stroke(); ctx.restore()
  // Left card.
  rect(ctx, 0, 0, 820, H, C.bg, 0.92)
  const k = enter(t, bt(63))
  txt(ctx, '两个超级大国，都离不开这四个地方', M, 230 + k.dy, { size: 44, color: C.dim, alpha: k.a })
  const e = enter(t, PLACES[ci].at + BEAT * 0.5)
  // The longest name (six characters) steps down to stay inside the card.
  txt(ctx, R.place, M, 380 + e.dy, { size: Math.min(120, Math.floor(640 / [...R.place].length)), alpha: e.a })
  txt(ctx, R.who, M, 460 + e.dy, { size: 52, color: C.hi, alpha: e.a })
  hero(ctx, R.num, '', M, 690 + e.dy, { size: 220, color: C.hi, alpha: e.a })
  const words = R.what.split('，')
  words.forEach((w, j) => txt(ctx, w, M, 780 + j * 60 + e.dy, { size: 44, alpha: e.a }))
  // Where we are among the four; names differ in length, so step by width.
  let x = M
  F.choke.rows.forEach((r, j) => { x += txt(ctx, r.place, x, 975, { size: 38, color: j === ci ? C.hi : C.dim, alpha: j <= ci ? 1 : 0.45 }) + 60 })
}
const chokeSrc = (t) => F.choke.rows[cardOf(t)].src

// ── Bars 69–72: everyone else, and the chapter line ───────────────────────
function rest(ctx, t) {
  if (t < bt(70)) {
    const k = enter(t, bt(69))
    txt(ctx, '其余的世界呢？欧洲', M, 260 + k.dy, { size: 60, alpha: k.a })
    const a = enter(t, bt(69, 1))
    hero(ctx, String(F.rest.europeModels), '个', M, 600 + a.dy, { size: 260, color: C.rest, alpha: a.a })
    txt(ctx, '2025 年欧洲发布的知名 AI 模型（美国 59，中国 35）', M, 690 + a.dy, { size: 40, alpha: a.a })
    const b = enter(t, bt(69, 2.75))
    line(ctx, `基于欧洲模型的新衍生模型占比：${F.rest.euDeriv[0]}% → ${F.rest.euDeriv[1]}%`, M, 860 + b.dy, { size: 52, color: C.hi, alpha: b.a })
  } else if (t < bt(71)) {
    const k = enter(t, bt(70))
    txt(ctx, '各国都想要自己的 AI', M, 260 + k.dy, { size: 60, alpha: k.a })
    const a = enter(t, bt(70, 1.25))
    hero(ctx, yi(F.rest.sovereign).toString(), '亿美元', M, 560 + a.dy, { size: 220, color: C.hi, alpha: a.a })
    txt(ctx, '各国“主权 AI”计划的承诺投入（部分统计）', M, 640 + a.dy, { size: 40, alpha: a.a })
  } else {
    const s = spring(t, bt(71), 2.6, 0.5)
    rect(ctx, 0, 0, W, H, C.hi, clamp(s * 2))
    scaled(ctx, 1.1 - 0.1 * s, W / 2, 470, () => {
      txt(ctx, '两个超级大国', W / 2, 440, { size: 160, color: C.bg, align: 'center', alpha: clamp(s * 2) })
      txt(ctx, '站在四个小地方的肩膀上', W / 2, 600, { size: 96, color: C.bg, align: 'center', alpha: clamp(s * 2) })
    })
    const n = enter(t, bt(72))
    txt(ctx, '那这一切，在物理世界有多大？', W / 2, 820 + n.dy, { size: 56, color: C.bg, align: 'center', alpha: n.a * 0.85 })
  }
}

export const SHOTS = [
  { from: 51, to: 59, push: false, chapter: CH, open: true, src: tugSrc, draw: tug },
  { from: 62, to: 62, src: F.lag.src, draw: verdict },
  { from: 63, to: 68, push: false, chapter: CH, src: chokeSrc, draw: chokepoints },
  { from: 69, to: 70, chapter: CH, src: F.rest.src, draw: rest },
  { from: 71, to: 72, src: '', draw: rest },
]
