// Chapter 6 · bars 73–83: the physical size of it, the chapter line, the
// flywheel that answers the opening question, the shape, and the close.
import { W, H, M, C, NUM, MONO, bt, BEAT, BAR, spring, count, txt, hero, line, rect, prog, clamp, easeOut, easeIn, easeInOut, lerp, scaled, rng, measure } from '../lib.js'
import { F } from '../facts.js'
import { DURATION, BODY } from '../timeline.js'
import { anchors, setupMap, drawTowers } from './map.js'

const CH = ['06', '物理世界']
const enter = (t, t0, d = 50) => { const s = spring(t, t0, 3.6, 0.62); return { a: clamp(s * 1.4), dy: (1 - s) * d } }
// The Shape of the World mark, used unchanged on the closing card.
const MARK = new Image()
export async function setup() {
  await setupMap()
  MARK.src = '../web/assets/mark-512.png'
  await MARK.decode()
}

// ── Bar 73: the biggest AI data centre and the homes it could power ───────
const CITY = (() => {
  const r = rng(73), out = []
  const cx = 1290, cy = 590
  for (let gx = 0; gx < 44; gx++) for (let gy = 0; gy < 30; gy++) {
    const x = 760 + gx * 24 + (r() - 0.5) * 6, y = 160 + gy * 27 + (r() - 0.5) * 6
    const d = Math.hypot(x - cx, (y - cy) * 1.3)
    if (d < 120 || out.length >= 1000) continue
    out.push({ x, y, d })
  }
  out.sort((a, b) => a.d - b.d)
  return out.slice(0, 1000)
})()
function colossus(ctx, t) {
  const t0 = bt(73)
  const lit = Math.floor(1000 * easeOut(prog(t, t0 + BEAT * 0.8, t0 + BEAT * 4.6)))
  CITY.forEach((h, i) => rect(ctx, h.x, h.y, 12, 12, i < lit ? C.gold : C.faint, i < lit ? 0.95 : 0.8))
  // The data centre itself: a block of halls at the centre.
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) rect(ctx, 1290 - 110 + c * 56, 590 - 50 + r * 34, 48, 26, C.ink, 0.95)
  rect(ctx, 0, 0, 720, H, C.bg, 0.9)
  const k = enter(t, bt(73, 1.4))
  txt(ctx, '世界最大的 AI 数据中心', M, 300 + k.dy, { size: 52, alpha: k.a })
  txt(ctx, 'Colossus 2 · 美国孟菲斯', M, 360 + k.dy, { size: 38, color: C.dim, alpha: k.a })
  hero(ctx, String(F.colossus.mw), '兆瓦', M, 590 + k.dy, { size: 200, alpha: k.a })
  const r2 = enter(t, bt(73, 4.5))
  txt(ctx, '够点亮约 100 万户', M, 720 + r2.dy, { size: 60, color: C.gold, alpha: r2.a })
  txt(ctx, '美国家庭', M, 790 + r2.dy, { size: 60, color: C.gold, alpha: r2.a })
  txt(ctx, '每个方块 = 1000 户', M, 870 + r2.dy, { size: 40, color: C.dim, alpha: r2.a })
}

// ── Bars 74–75: all of them, and the grid ─────────────────────────────────
function grid(ctx, t) {
  if (t < bt(75)) {
    const k = enter(t, bt(74))
    txt(ctx, `Epoch 追踪的 ${F.dcTotal.sites} 座 AI 数据中心，加起来用电`, M, 260 + k.dy, { size: 56, alpha: k.a })
    ;[[`${F.dcTotal.sites} 座 AI 数据中心`, F.dcTotal.gw, C.hi, bt(74, 1.25)], ['纽约市用电高峰', F.dcTotal.nyc, C.rest, bt(74, 2)]].forEach(([label, v, color, ti], i) => {
      const p = spring(t, ti, 2.8, 0.55)
      const h = 560 * v / F.dcTotal.gw * clamp(p, 0, 1.04), x = 400 + i * 520
      rect(ctx, x, 940 - h, 320, h, color)
      line(ctx, `${v} 吉瓦`, x + 160, 940 - h - 24, { size: 64, align: 'center', alpha: clamp(p * 2) })
      txt(ctx, label, x + 160, 990, { size: 40, color: C.dim, align: 'center', alpha: clamp(p * 2) })
    })
  } else {
    const k = enter(t, bt(75))
    txt(ctx, '数据中心占全国用电', M, 260 + k.dy, { size: 60, alpha: k.a })
    const rows = [
      ['中国 · 2025', F.dcShare.cn2025, C.cn, bt(75, 1)], ['中国 · 2030（预测）', F.dcShare.cn2030, C.cn, bt(75, 1.75)],
      ['美国 · 2030（预测）', F.dcShare.us2030, C.us, bt(75, 2.5)],
    ]
    rows.forEach(([label, v, color, ti], i) => {
      const p = spring(t, ti, 3, 0.6), y = 380 + i * 190
      const w = 1050 * v / 12 * clamp(p, 0, 1.04)
      rect(ctx, 560, y, w, 100, color, i === 0 ? 0.6 : 1)
      txt(ctx, label, 530, y + 68, { size: 46, align: 'right', alpha: Math.max(0.3, clamp(p * 2)) })
      line(ctx, `${v}%`, 560 + w + 24, y + 76, { size: 72, alpha: clamp(p * 2) })
    })
  }
}

// ── The bar added after 75: the chapter line ──────────────────────────────
function heavy(ctx, t) {
  const t0 = bt(75, 5), s = spring(t, t0, 2.6, 0.5)
  rect(ctx, 0, 0, W, H, C.hi, clamp(s * 2))
  scaled(ctx, 1.12 - 0.12 * s, W / 2, 470, () => {
    txt(ctx, 'AI 已经是重工业', W / 2, 500, { size: 170, color: C.bg, align: 'center', alpha: clamp(s * 2) })
  })
  ;['要芯片', '要厂房', '要电'].forEach((w, i) => {
    const n = enter(t, t0 + BEAT * (1.25 + i * 0.5))
    txt(ctx, w, W / 2 - 480 + i * 480, 760 + n.dy, { size: 96, color: C.bg, align: 'center', alpha: n.a })
  })
}

// ── Bars 76–79: back to the opening question, answered as a loop ──────────
// Five stations round an ellipse, one every two beats; each arrow draws in as
// the next station lands. On bar 79 the last arrow closes the loop and a spark
// starts to run round it, faster and faster.
const yi = (v) => Math.round(v / 1e8)
const FLY = { cx: 960, cy: 625, rx: 470, ry: 235 }
const onRing = (th) => [FLY.cx + FLY.rx * Math.cos(th), FLY.cy + FLY.ry * Math.sin(th)]
const STATIONS = [
  { head: '更便宜', sub: `每年便宜 ${F.cheaper.perYear} 倍`, color: C.cyan, place: 'above' },
  { head: '用得更多', sub: '两年涨 330～1500 倍', color: C.hi, place: 'right' },
  { head: '砸更多钱', sub: `四家公司今年 ${yi(F.capex.value)} 亿美元`, color: C.gold, place: 'below' },
  { head: '更多芯片和电', sub: `最大的数据中心 ${F.colossus.mw} 兆瓦`, color: C.gold, place: 'below' },
  { head: '更强的 AI', sub: `独立干 ${F.horizon.hours} 小时的活`, color: C.ink, place: 'left' },
].map((s, i) => ({ ...s, th: -Math.PI / 2 + i * 2 * Math.PI / 5, at: bt(76, 3 + i * 2) }))
const CLOSE = bt(79)
function arc(ctx, th0, th1, p, color, alpha) {
  if (p <= 0) return
  const end = lerp(th0, th1, p), n = 40
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 6; ctx.lineCap = 'round'
  ctx.beginPath()
  for (let k = 0; k <= n; k++) { const [x, y] = onRing(lerp(th0, end, k / n)); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y) }
  ctx.stroke()
  // Arrowhead along the tangent at the drawn end.
  const [x, y] = onRing(end), dir = Math.atan2(FLY.ry * Math.cos(end), -FLY.rx * Math.sin(end))
  ctx.translate(x, y); ctx.rotate(dir)
  ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-14, -14); ctx.lineTo(-14, 14); ctx.closePath(); ctx.fill()
  ctx.restore()
}
function flywheel(ctx, t) {
  const k = enter(t, bt(76))
  txt(ctx, '回到开头：越便宜，为什么越烧钱？', W / 2, 185 + k.dy, { size: 56, align: 'center', alpha: k.a })
  // The spark: from the close it runs clockwise from the top, speeding up.
  const d = t - CLOSE, spark = d > 0 ? -Math.PI / 2 + 2.2 * d + 2.6 * d * d : null
  const gap = 0.16
  STATIONS.forEach((st, i) => {
    const nx = STATIONS[(i + 1) % 5], th1 = i === 4 ? st.th + 2 * Math.PI / 5 : nx.th
    const p = easeInOut(prog(t, st.at + BEAT * 0.4, i === 4 ? CLOSE : nx.at))
    arc(ctx, st.th + gap, th1 - gap, p, C.dim, 0.9)
  })
  if (spark !== null) {
    for (let j = 14; j >= 0; j--) {
      const [x, y] = onRing(spark - j * 0.05)
      ctx.save(); ctx.globalAlpha = (1 - j / 15) * 0.9; ctx.fillStyle = C.hi
      ctx.beginPath(); ctx.arc(x, y, 14 - j * 0.6, 0, Math.PI * 2); ctx.fill(); ctx.restore()
    }
  }
  STATIONS.forEach((st) => {
    if (t < st.at) return
    const s = spring(t, st.at, 3.4, 0.55), a = clamp(s * 2)
    const [x, y] = onRing(st.th)
    // A station flares as the spark passes it.
    const near = spark === null ? 0 : Math.max(0, 1 - Math.abs(((spark - st.th) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI) / 0.35)
    const r = 22 * clamp(s, 0, 1.2) * (1 + 0.5 * near)
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = st.color
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore()
    const e = { a, dy: (1 - s) * 30 }
    const [lx, ly, align] = {
      above: [x, y - 100, 'center'], below: [x, y + 90, 'center'],
      right: [x + 50, y + 10, 'left'], left: [x - 50, y + 10, 'right'],
    }[st.place]
    txt(ctx, st.head, lx, ly + e.dy, { size: 64, color: st.color, align, alpha: e.a })
    line(ctx, st.sub, lx, ly + 52 + e.dy, { size: 34, align, alpha: e.a })
  })
  const c = spring(t, CLOSE, 2.8, 0.5)
  if (c > 0) scaled(ctx, 1.15 - 0.15 * c, W / 2, 645, () => txt(ctx, '这个轮子，越转越快', W / 2, 665, { size: 88, color: C.hi, align: 'center', alpha: clamp(c * 2) }))
}

// ── Bars 80–81 (bar 82 cut in v4.1): the shape ──────────────────────────
const SHAPE_H = (() => { const m = F.notableModels, k = 360 / m.us; return { us: m.us * k, cn: m.cn * k, eu: m.eu * k } })()
function shape(ctx, t) {
  const grow = spring(t, bt(80, 1.25), 2.2, 0.55)
  // "Next month it changes again": the towers start to move as the line lands.
  const amp = 0.32 * easeOut(prog(t, bt(81), bt(81, 2.5)))
  const wob = (k) => 1 + amp * Math.sin((t - bt(81)) * { us: 7.1, cn: 8.9, eu: 6.3 }[k] + { us: 0, cn: 2, eu: 4 }[k])
  ctx.save(); ctx.translate(0, 110)
  drawTowers(ctx, { heights: SHAPE_H, grow, wob })
  ctx.restore()
  const la = clamp(spring(t, bt(80, 2.5), 3.4, 0.6) * 1.5)
  const m = F.notableModels
  line(ctx, `美国 ${m.us}`, anchors.us.bx - 100, anchors.us.by + 130, { size: 56, color: C.us, align: 'right', alpha: la })
  line(ctx, `欧洲 ${m.eu}`, anchors.eu.bx, anchors.eu.by + 40, { size: 48, color: C.rest, align: 'center', alpha: la })
  line(ctx, `中国 ${m.cn}`, anchors.cn.bx + 90, anchors.cn.by + 130, { size: 56, color: C.cn, alpha: la })
  line(ctx, '柱高：2025 年各地发布的知名 AI 模型数', W / 2, 950, { size: 42, color: C.dim, align: 'center', alpha: la })
  if (t < bt(81)) {
    const e = enter(t, bt(80))
    txt(ctx, '这就是 AI 的形状', W / 2, 190 + e.dy, { size: 104, align: 'center', alpha: e.a })
  } else {
    scaled(ctx, 1.1 - 0.1 * spring(t, bt(81), 3.2, 0.5), W / 2, 190, () => txt(ctx, '下个月，它又会变', W / 2, 190, { size: 104, color: C.hi, align: 'center' }))
  }
}

// ── Bar 83 (+2): the title card, then AI becomes 世界 ─────────────────────
// Beats 1–8: the film's title and the token count paid off. Beat 9 (the last
// chord): "AI" rolls out, "世界" rolls in, and the hundred squares collapse
// into the Shape of the World mark. The card holds through the music's tail.
const SQ = { cols: 20, size: 40, gap: 10 }
function endCard(ctx, t) {
  const t0 = bt(83), tw = bt(83, 9)
  const gw = SQ.cols * (SQ.size + SQ.gap) - SQ.gap, x0 = (W - gw) / 2, y0 = 120
  const orb = { x: W / 2, y: 250, d: 280 }
  // Squares: fill in one by one, then fly into the mark.
  for (let i = 0; i < 100; i++) {
    const ti = t0 + BEAT * 0.5 + i * (BAR * 1.5 / 100)
    const a = clamp((t - ti) / 0.15)
    let x = x0 + (i % SQ.cols) * (SQ.size + SQ.gap), y = y0 + Math.floor(i / SQ.cols) * (SQ.size + SQ.gap), sz = SQ.size
    const fly = easeIn(prog(t, tw + BEAT * 0.25 + (i % 7) * 0.025, tw + BEAT * 1.05 + (i % 7) * 0.025))
    if (fly >= 1) continue
    x = lerp(x, orb.x - sz / 2, fly); y = lerp(y, orb.y - sz / 2, fly); sz *= 1 - 0.8 * fly
    rect(ctx, x, y, sz, sz, C.faint, 0.9 * (1 - fly))
    if (a > 0) rect(ctx, x, y, sz, sz, C.hi, a * (0.18 + 0.1 * Math.sin(t * 3 + i)) + 0.5 * fly)
  }
  // The mark blooms where the squares land.
  const m = spring(t, tw + BEAT * 1.0, 2.6, 0.55)
  if (m > 0) {
    const d = orb.d * (0.55 + 0.45 * m) * (1 + 0.015 * Math.sin((t - tw) * 1.3))
    ctx.save(); ctx.globalCompositeOperation = 'lighter'
    const flash = Math.max(0, 1 - (t - tw - BEAT) / 0.5)
    const g = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.d * 0.9)
    g.addColorStop(0, `rgba(255,190,110,${0.35 * flash})`); g.addColorStop(1, 'rgba(255,190,110,0)')
    ctx.fillStyle = g; ctx.fillRect(orb.x - orb.d, orb.y - orb.d, orb.d * 2, orb.d * 2); ctx.restore()
    // 'lighten' lets the mark's black field take the page colour.
    ctx.save(); ctx.globalAlpha = clamp(m * 1.6); ctx.globalCompositeOperation = 'lighten'
    ctx.translate(orb.x, orb.y); ctx.rotate(-0.04 + 0.03 * (t - tw) / 4)
    ctx.drawImage(MARK, -d / 2, -d / 2, d, d); ctx.restore()
  }
  // Title: settles in, then the first word swaps and the line drops a little.
  const q = easeInOut(prog(t, tw, tw + 0.42))
  const drop = easeInOut(prog(t, tw + BEAT * 0.5, tw + BEAT * 1.5)) * 60
  const s = 1.18 - 0.18 * spring(t, t0, 2.4, 0.55)
  const ty = 560 + drop, size = 200
  const wAI = measure(ctx, 'AI ', size), wSJ = measure(ctx, '世界', size), wRest = measure(ctx, '的形状', size)
  const xa = W / 2 - (wAI + wRest) / 2, xb = W / 2 - (wSJ + wRest) / 2
  const xr = lerp(xa + wAI, xb + wSJ, q)
  scaled(ctx, s, W / 2, ty - 60, () => {
    // A slot-machine roll: travel longer than the glyphs, inside a tight window.
    ctx.save(); ctx.beginPath(); ctx.rect(0, ty - 195, W, 240); ctx.clip()
    txt(ctx, 'AI ', xr - wAI, ty - 240 * q, { size })
    txt(ctx, '世界', xr - wSJ, ty + 240 * (1 - q), { size })
    ctx.restore()
    txt(ctx, '的形状', xr, ty, { size })
  })
  // The rule widens with the longer title and sits clear of 界's long stroke.
  const u = easeOut(prog(t, bt(83, 1.25), bt(83, 1.25) + 0.35)) * lerp(600, wSJ + wRest + 40, q)
  rect(ctx, W / 2 - u / 2, 600 + 22 * q + drop, u, 10, C.hi)
  // Beats 1–8: what the film was, and the count since you pressed play.
  const out = 1 - clamp((t - (tw - 0.12)) / 0.18)
  const a = enter(t, bt(83, 1.75))
  txt(ctx, '上百个数字，看懂 2026 年的 AI 世界', W / 2, 700 + a.dy, { size: 56, align: 'center', alpha: a.a * out })
  const b = enter(t, bt(83, 3))
  const secs = Math.round(DURATION), mm = Math.floor(secs / 60), ss = secs % 60
  const n = Math.round(F.googlePerSec.value * DURATION / 1e8)
  line(ctx, `这支视频的 ${ss ? `${mm} 分 ${ss} 秒` : `${mm} 分钟`}里，Google 处理了约 ${n} 亿个 token`, W / 2, 800 + b.dy, { size: 48, color: C.hi, align: 'center', alpha: b.a * out })
  const c = enter(t, bt(83, 4.5))
  txt(ctx, '数据截至 2026 年 10 月 19 日 · 全部来源见视频简介', W / 2, 880 + c.dy, { size: 36, color: C.dim, align: 'center', alpha: c.a * out })
  // From the swap: the series line, the address and the credit, on the beats.
  const l1 = enter(t, tw + BEAT * 1.5), l2 = enter(t, tw + BEAT * 2), l3 = enter(t, tw + BEAT * 2.5)
  txt(ctx, '看见世界如何运行', W / 2, 795 + l1.dy, { size: 56, align: 'center', alpha: l1.a })
  txt(ctx, 'shapeof.world', W / 2, 878 + l2.dy, { size: 48, color: C.hi, align: 'center', family: MONO, weight: 700, alpha: l2.a })
  txt(ctx, '制作  MakerJackie', W / 2, 950 + l3.dy, { size: 36, color: C.dim, align: 'center', weight: 700, alpha: l3.a })
  // Out to black with the last of the music.
  const fade = easeInOut(prog(t, DURATION - 0.5, DURATION))
  if (fade > 0) rect(ctx, 0, 0, W, H, '#000', fade)
}

export const SHOTS = [
  { from: 73, to: 73, push: false, chapter: CH, open: true, src: F.colossus.src, draw: colossus },
  { from: 74, end: [75, 5], chapter: CH, src: (t) => (t < bt(75) ? F.dcTotal.src : F.dcShare.src), draw: grid },
  { start: [75, 5], to: 75, src: '', draw: heavy },
  { from: 76, to: 79, src: '各项数字的来源见前文与视频简介', draw: flywheel },
  { from: 80, to: 82, src: F.notableModels.src, draw: shape },
  { from: 83, to: 83, post: DURATION - BODY, push: false, src: '', draw: endCard },
]
