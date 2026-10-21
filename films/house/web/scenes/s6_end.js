// The close. Play order: 47–48 the whole bill as the same house with floors
// added; 62–63 who got the 145 万; 52–54 where all of it went; 49–51 the bill
// as years of a life; 55–56 the landing; 58–59 房子的形状 rolls into
// 世界的形状.
import { W, H, M, C, NUM, MONO, bt, BEAT, BAR, spring, count, txt, hero, line, rect, scaled, prog, clamp, easeIn, easeOut, easeInOut, lerp, lineWidth, measure, enter, shown } from '../lib.js'
import { F } from '../facts.js'
import { DURATION, BODY } from '../timeline.js'
import * as B from '../blocks.js'
import { HOUSE } from './s0_open.js'
import { INTEREST } from './s3_bank.js'

const MARK = new Image()
export async function setup() {
  MARK.src = '../web/assets/mark-512.png'
  await MARK.decode()
}

const TAX = '#ff8f7a', KIT = '#1fa3b8'

// The opening house in chapter 1's colours: the building's 33 in cyan, the
// other 67 by where they went. The bill starts from it.
const BUILD = 33
const REST = [
  ['土地', 38, C.gov], ['税', 11, TAX], ['小区配套', 5, KIT], ['开发商利息', 4, C.bank], ['卖房管理', 5, C.rest], ['开发商', 4, C.dev],
]
const REST_OF = [] // block index − 33 → line index
REST.forEach(([, n], k) => { for (let j = 0; j < n; j++) REST_OF.push(k) })
const COLORED = HOUSE.map((b, i) => ({ ...b, c: i < BUILD ? C.build : REST[REST_OF[i - BUILD]][2], a: 1 }))

// ── Bars 47–48: the bill — the same house, floors added ────────────────
// A house of 145: the original body (64) and roof (36) with four new floors
// of ten (40) between them and a five-block chimney. In order: body, roof,
// floors, chimney, so the first hundred are the price and the rest is what
// thirty years add: interest net of the subsidy, deed tax, repair fund, fees.
const PARTS = [['interest', Math.round(F.loan.interest - F.subsidy.save), INTEREST], ['deed', F.deed.v, C.gov], ['fund', F.fund.v, C.keep], ['fee', Math.round(F.fee.v), C.keep]]
const EXTRA = PARTS.flatMap(([, n, c]) => Array(n).fill(c)) // 45 colours
export function bigHouse({ cx, base, s = 32, gap = 6 }) {
  const step = s + gap, x0 = cx - (10 * step - gap) / 2
  const cells = []
  for (let r = 0; r < 7; r++) for (let c = 0; c < 10; c++) { if (r < 3 && (c === 4 || c === 5)) continue; cells.push([c, -r]) }
  ;[12, 10, 8, 6].forEach((w, k) => { for (let c = 0; c < w; c++) cells.push([c - (w - 10) / 2, -11 - k]) })
  for (let r = 7; r < 11; r++) for (let c = 0; c < 10; c++) cells.push([c, -r])
  for (let r = 14; r < 19; r++) cells.push([8, -r])
  return cells.map(([col, row]) => ({ x: x0 + col * step, y: base - s + row * step, s, c: C.gold, a: 1 }))
}
export const priced = (L) => L.map((b, i) => ({ ...b, c: i < 100 ? C.gold : EXTRA[i - 100] }))
const BIG = priced(bigHouse({ cx: 1390, base: 900 }))
const BIG_C = priced(bigHouse({ cx: W / 2, base: 960, s: 24, gap: 5 }))

function grow(t) {
  const t0 = bt(47)
  // The opening house pops back, then settles into the body and the raised roof...
  const base = t < t0 + 0.5 ? B.popIn(t, COLORED, t0, 0.35) : B.move(t, COLORED, BIG.slice(0, 100), t0 + 0.5, 0.65, 0.002)
  // ...then the new floors slide in from the right, bottom row first.
  const extra = BIG.slice(100).map((b, j) => {
    const ts = bt(47, 1.8) + j * 0.018, p = easeOut(prog(t, ts, ts + 0.4))
    return { ...b, x: b.x + (1 - p) * 520, a: clamp(p * 3) }
  })
  return [...base, ...extra]
}
function total(ctx, t) {
  B.draw(ctx, grow(t))
  const a = enter(t, bt(47))
  txt(ctx, '一套 100 万的房子', M, 280 + a.dy, { size: 56, color: C.dim, alpha: a.a })
  const b = enter(t, bt(47, 2))
  txt(ctx, '30 年里，你一共要付', M, 380 + b.dy, { size: 64, alpha: b.a })
  const h = spring(t, bt(47, 3), 3, 0.5)
  if (h > 0) scaled(ctx, 1.12 - 0.12 * h, M, 560, () => hero(ctx, count(t, bt(47, 3), 1.2, F.bill.total, 100).toFixed(1), '万', M, 610, { size: 230, color: C.hi, alpha: clamp(h * 2) }))
  ;[['房价', `${F.price.total} 万`, C.gold], ['房贷利息（已扣贴息）', `${(F.loan.interest - F.subsidy.save).toFixed(1)} 万`, INTEREST], ['契税、维修资金、物业费', `${(F.deed.v + F.fund.v + F.fee.v).toFixed(1)} 万`, C.keep]].forEach(([s, v, col], j) => {
    const e = enter(t, bt(48, 1 + j * 0.4), 16)
    rect(ctx, M, 690 + j * 62 - 26, 22, 22, col, e.a, 3)
    txt(ctx, s, M + 40, 690 + j * 62 + e.dy, { size: 38, weight: 700, alpha: e.a })
    line(ctx, v, M + 40 + measure(ctx, s, 38, 700) + 20, 690 + j * 62 + e.dy, { size: 40, color: col, alpha: e.a })
  })
  const n = enter(t, bt(48, 3))
  txt(ctx, '还没算装修、家电，和那些算不出来的钱', M, 920 + n.dy, { size: 40, color: C.dim, alpha: n.a })
}

// What each of the 145 blocks is: chapter 2's split of the price, then
// interest, deed tax, repair fund and fees (see PARTS).
const KIND = [...F.split.groups.flatMap((g) => Array(g.n).fill(g.key)), ...PARTS.flatMap(([k, n]) => Array(n).fill(k))]

// ── Bars 49–51: the bill as time ────────────────────────────────────────
// The age ruler from chapter 1 comes back. The down payment sits on the years
// before 30; the loan, its interest and the running costs fill 30 to 60.
const AX = { x0: 300, y: 900, px: 30, from: 22, to: 72 }
const ON_RULER = KIND.map((k, i) => {
  const own = i < F.down.pay, j = own ? i : i - F.down.pay
  const col = Math.floor(j / 4) + (own ? 0 : 8), row = j % 4
  const c = own ? C.gold : i < 100 ? C.bank : EXTRA[i - 100]
  return { x: AX.x0 + col * AX.px + 3, y: AX.y - (row + 1) * AX.px + 3, s: AX.px - 6, c, a: 1 }
})
function ruler(ctx, a) {
  rect(ctx, AX.x0, AX.y + 4, (AX.to - AX.from) * AX.px, 3, C.line, a)
  for (const y of [22, 30, 40, 50, 60, 70]) {
    const x = AX.x0 + (y - AX.from) * AX.px
    rect(ctx, x, AX.y + 4, 3, 14, C.dim, a)
    txt(ctx, `${y} 岁`, x, AX.y + 58, { size: 34, weight: 700, color: C.dim, align: 'center', alpha: a })
  }
}
function time(ctx, t) {
  const t0 = bt(49)
  const L = B.move(t, AT_NODE, ON_RULER, bt(49, 1), 0.6, 0.004)
  const dim = t >= bt(51) ? 1 - 0.7 * easeOut(prog(t, bt(51), bt(51) + 0.4)) : 1
  B.draw(ctx, L, dim)
  ruler(ctx, clamp((t - bt(49, 1.2)) / 0.4) * dim)
  const l1 = enter(t, bt(50, 1), 16), l2 = enter(t, bt(50, 2), 16)
  txt(ctx, '首付：自己攒，爸妈帮', AX.x0, 740 + l1.dy, { size: 36, weight: 700, color: C.gold, alpha: l1.a * dim })
  txt(ctx, '30 岁到 60 岁，每个月都在还', 720, 740 + l2.dy, { size: 36, weight: 700, color: INTEREST, alpha: l2.a * dim })
  if (t < bt(51)) {
    const a = enter(t, t0)
    txt(ctx, `${F.bill.total} 万，换成时间`, M, 250 + a.dy, { size: 48, color: C.dim, alpha: a.a })
    const b = enter(t, bt(49, 3))
    line(ctx, `≈ 城镇居民人均 ${Math.round(F.bill.years)} 年的全部收入`, M, 370 + b.dy, { size: 84, color: C.hi, alpha: b.a })
  } else {
    // The line the film is remembered by.
    const q = spring(t, bt(51), 2.4, 0.6)
    scaled(ctx, 1.08 - 0.08 * q, W / 2, 440, () => txt(ctx, '一套房，是两代人的半辈子', W / 2, 480, { size: 112, align: 'center', alpha: clamp(q * 2) }))
  }
}

// ── Bars 62–63: what the 145 万 became ──────────────────────────────────
// The bill regroups by what it became, one honest scale: land and taxes
// (roads, public services and so on), interest (net of the subsidy), the
// building itself, and the rest. The building is under a quarter of the
// whole; the bigger share went into the city, not nowhere.
const WHO = [
  { name: '地和税', v: 49, to: '道路、公共服务等', kinds: ['land', 'tax'], c: C.gov },
  { name: '利息', v: +(F.loan.interest - F.subsidy.save).toFixed(1), to: '付给银行', kinds: ['interest'], c: INTEREST },
  { name: '盖楼', v: 33, to: '变成房子', kinds: ['build'], c: C.build },
  { name: '其他', v: +(F.bill.total - 49 - (F.loan.interest - F.subsidy.save) - 33).toFixed(1), to: '配套、卖房、物业等', kinds: ['kit', 'fin', 'sell', 'dev', 'deed', 'fund', 'fee'], c: C.rest },
]
const WHO_OF = KIND.map((k) => WHO.findIndex((w) => w.kinds.includes(k)))
const WHO_X = [405, 705, 1005, 1305], WHO_BASE = 960, WHO_S = 32, WHO_P = 37
const BY_WHO = (() => {
  const fill = WHO.map(() => 0)
  return KIND.map((_, i) => {
    const g = WHO_OF[i], j = fill[g]++
    return { x: WHO_X[g] + (j % 5) * WHO_P, y: WHO_BASE - WHO_S - Math.floor(j / 5) * WHO_P, s: WHO_S, c: WHO[g].c, a: 1 }
  })
})()
const WHO_TOP = WHO.map((_, g) => Math.min(...BY_WHO.filter((_, i) => WHO_OF[i] === g).map((b) => b.y)))
function byWho(t) {
  const L = B.move(t, BIG, BY_WHO, bt(62, 1.2), 0.7, 0.004)
  // On the punch lines the building and what the city got stay lit.
  const k = easeOut(prog(t, bt(63, 2.5), bt(63, 2.5) + 0.4))
  return L.map((b, i) => ({ ...b, a: b.a * (WHO_OF[i] === 2 || WHO_OF[i] === 0 ? 1 : 1 - 0.6 * k) }))
}
function who(ctx, t) {
  B.draw(ctx, byWho(t))
  const k = easeOut(prog(t, bt(63, 2.5), bt(63, 2.5) + 0.4))
  WHO.forEach((w, g) => {
    const e = enter(t, bt(62, 2.6 + g * 0.4), 20), cx = WHO_X[g] + 2 * WHO_P + WHO_S / 2, top = WHO_TOP[g]
    const dim = g === 2 || g === 0 ? 1 : 1 - 0.6 * k
    txt(ctx, w.name, cx, top - 128 + e.dy, { size: 38, weight: 700, align: 'center', alpha: e.a * dim })
    line(ctx, `${w.v} 万`, cx, top - 66 + e.dy, { size: g < 3 ? 56 : 44, color: w.c, align: 'center', alpha: e.a * dim })
    txt(ctx, w.to, cx, top - 20 + e.dy, { size: g === 0 ? 30 : g < 3 ? 34 : 26, weight: 700, color: C.dim, align: 'center', alpha: e.a * dim })
  })
  const a = enter(t, bt(62))
  txt(ctx, `这 ${F.bill.total} 万，最后变成了什么？`, M, 200 + a.dy, { size: 48, color: C.dim, alpha: a.a })
  const q = spring(t, bt(63), 3, 0.55)
  if (q > 0) scaled(ctx, 1.1 - 0.1 * q, M, 280, () => line(ctx, '真正变成砖瓦的，不到四分之一', M, 310, { size: 84, color: C.hi, alpha: clamp(q * 2) }))
  const r = enter(t, bt(63, 2))
  txt(ctx, '更大的一块，变成了道路、城市建设和公共服务', M, 386 + r.dy, { size: 46, alpha: r.a })
}

// ── Bars 52–54: where all of it went ────────────────────────────────────
// The blocks gather into a small house, then stream out to the people and
// places the money became; none of it disappears.
// Ring order, clockwise from the top right: the people who build first; land
// compensation sits low on the ring, not up front.
const NODES = [
  { name: '盖楼的工人', kinds: ['labor'] },
  { name: '钢厂和水泥厂', kinds: ['build'] },
  { name: '道路和水电', kinds: ['land', 'kit'] },
  { name: '公共服务', kinds: ['tax', 'deed'] },
  { name: '征地补偿', kinds: ['land'] },
  { name: '存钱的人', kinds: ['fin', 'interest'] },
  { name: '开发商和销售', kinds: ['dev', 'sell'] },
  { name: '物业和维修', kinds: ['fund', 'fee'] },
]
const NODE = (name) => NODES.findIndex((n) => n.name === name)
// Land blocks alternate between land development and compensation; the
// first 8 building blocks are the workers' pay.
const NODE_OF = KIND.map((k, i) => {
  if (k === 'land') return NODE(i % 2 ? '征地补偿' : '道路和水电')
  if (k === 'build') return NODE(KIND.slice(0, i).filter((x) => x === 'build').length < Math.round(F.build.labor) ? '盖楼的工人' : '钢厂和水泥厂')
  return NODES.findIndex((n) => n.kinds.includes(k))
})
const RING = NODES.map((_, k) => {
  const a = -Math.PI / 2 + (k + 0.5) * (2 * Math.PI / NODES.length)
  return { x: W / 2 + Math.cos(a) * 690, y: 600 + Math.sin(a) * 300 }
})
const SMALL = priced(bigHouse({ cx: W / 2, base: 720, s: 14, gap: 3 }))
const AT_NODE = (() => {
  const fill = NODES.map(() => 0)
  return KIND.map((_, i) => {
    const k = NODE_OF[i], j = fill[k]++, p = 20
    const n = KIND.filter((_, ii) => NODE_OF[ii] === k).length, cols = Math.min(6, n)
    const w = cols * p, h = Math.ceil(n / cols) * p
    return { x: RING[k].x - w / 2 + (j % cols) * p, y: RING[k].y - h / 2 + Math.floor(j / cols) * p, s: 17, c: SMALL[i].c, a: 1 }
  })
})()
const NODE_TOP = NODES.map((_, k) => Math.min(...AT_NODE.filter((_, i) => NODE_OF[i] === k).map((b) => b.y)))
const NODE_BOTTOM = NODES.map((_, k) => Math.max(...AT_NODE.filter((_, i) => NODE_OF[i] === k).map((b) => b.y + b.s)))
const LEAVE = (i) => bt(52, 2) + i * 0.011
function streams(t) {
  const gather = B.move(t, byWho(bt(63, 8)), SMALL, bt(52), 0.6, 0.002)
  return gather.map((b, i) => {
    const ts = LEAVE(i), p = easeInOut(prog(t, ts, ts + 0.75))
    if (p <= 0) return b
    const to = AT_NODE[i], k = NODE_OF[i]
    // A curve that bows outward, so the streams fan out like spokes.
    const cx = (b.x + to.x) / 2 + (RING[k].x - W / 2) * 0.25, cy = (b.y + to.y) / 2 + (RING[k].y - 600) * 0.25
    const x = (1 - p) ** 2 * b.x + 2 * (1 - p) * p * cx + p * p * to.x
    const y = (1 - p) ** 2 * b.y + 2 * (1 - p) * p * cy + p * p * to.y
    return { x, y, s: lerp(b.s, to.s, p), c: to.c, a: 1 }
  })
}
function flow(ctx, t) {
  B.draw(ctx, streams(t))
  NODES.forEach((n, k) => {
    const first = Math.min(...KIND.map((_, i) => (NODE_OF[i] === k ? LEAVE(i) : Infinity))) + 0.6
    const e = enter(t, first, 14)
    const below = RING[k].y >= 600
    txt(ctx, n.name, RING[k].x, below ? NODE_BOTTOM[k] + 48 + e.dy : NODE_TOP[k] - 20 + e.dy, { size: 36, align: 'center', alpha: e.a })
  })
  const a = enter(t, bt(52, 1.2)), sw = clamp((t - bt(54)) / 0.25)
  txt(ctx, '这些钱，没有消失', W / 2, 180 + a.dy, { size: 72, align: 'center', alpha: a.a * (1 - sw) })
  if (t >= bt(54)) {
    const q = spring(t, bt(54), 2.6, 0.6)
    scaled(ctx, 1.08 - 0.08 * q, W / 2, 570, () => txt(ctx, '它们变成了别人的生活', W / 2, 610, { size: 100, color: C.hi, align: 'center', alpha: clamp(q * 2) }))
  }
}

// ── Bars 55–56: the landing ─────────────────────────────────────────────
// Everything comes home into the house; two windows light up.
const WINDOWS = [[1, 4], [2, 4], [1, 5], [2, 5], [7, 4], [8, 4], [7, 5], [8, 5]] // [col, row] in the body
const WIN_IDX = WINDOWS.map(([c, r]) => {
  let idx = 0
  for (let rr = 0; rr < 7; rr++) for (let cc = 0; cc < 10; cc++) { if (rr < 3 && (cc === 4 || cc === 5)) continue; if (cc === c && rr === r) return idx; idx++ }
  return -1
})
// Dusk falls on the house (the blocks dim a little) and the two windows
// turn warm, each with a small glow.
const dusk = (t) => easeOut(prog(t, bt(55, 3), bt(55, 3) + 0.8))
function homeHouse(t, from) {
  const L = B.move(t, from, BIG_C, bt(55), 0.9, 0.006), g = dusk(t)
  return L.map((b, i) => (WIN_IDX.includes(i) ? { ...b, c: g > 0.3 ? '#ffe7a3' : b.c } : { ...b, a: b.a * (1 - 0.45 * g) }))
}
function lights(ctx, t) {
  const glow = dusk(t)
  if (glow <= 0) return
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (const i of [WIN_IDX[0], WIN_IDX[4]]) {
    const b = BIG_C[i], x = b.x + b.s + 2.5, y = b.y + 2.5
    const g = ctx.createRadialGradient(x, y, 0, x, y, 70)
    g.addColorStop(0, `rgba(255,214,120,${0.35 * glow})`); g.addColorStop(1, 'rgba(255,214,120,0)')
    ctx.fillStyle = g; ctx.fillRect(x - 70, y - 70, 140, 140)
  }
  ctx.restore()
}
function home(ctx, t) {
  B.draw(ctx, homeHouse(t, ON_RULER.map((b) => ({ ...b, a: 0.3 }))))
  lights(ctx, t)
  const a = enter(t, bt(55, 2)), b = enter(t, bt(55, 3))
  txt(ctx, '看清这笔账，', W / 2, 250 + a.dy, { size: 96, align: 'center', alpha: a.a })
  txt(ctx, '再决定怎么安一个家', W / 2, 375 + b.dy, { size: 96, color: C.hi, align: 'center', alpha: b.a })
}

// ── Bars 58–59 (+ tail): 房子的形状 → 世界的形状 ──────────────────────────
// The house collapses into the Shape of the World mark; once it is in, the
// title arrives and holds; on beat 4 房子 rolls out and 世界 rolls in, then
// the line, the address and the credit, on the beats.
function endCard(ctx, t) {
  const t0 = bt(58), tw = bt(58, 4)
  const orb = { x: W / 2, y: 300, d: 300 }
  BIG_C.forEach((b, i) => {
    const ts = t0 + (i % 9) * 0.02, p = easeIn(prog(t, ts, ts + 0.5))
    if (p >= 1) return
    const s = b.s * (1 - 0.8 * p)
    rect(ctx, lerp(b.x, orb.x - s / 2, p), lerp(b.y, orb.y - s / 2, p), s, s, b.c, 1 - p * 0.7, 3)
  })
  const m = spring(t, t0 + 0.4, 2.6, 0.55)
  if (m > 0) {
    const d = orb.d * (0.55 + 0.45 * m) * (1 + 0.02 * Math.sin((t - t0) * 1.6))
    ctx.save(); ctx.globalCompositeOperation = 'lighter'
    const flash = Math.max(0, 1 - (t - t0 - 0.4) / 0.6)
    const g = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.d * 0.9)
    g.addColorStop(0, `rgba(255,194,61,${0.4 * flash})`); g.addColorStop(1, 'rgba(255,194,61,0)')
    ctx.fillStyle = g; ctx.fillRect(orb.x - orb.d, orb.y - orb.d, orb.d * 2, orb.d * 2); ctx.restore()
    // 'lighten' lets the mark's black field take the page colour.
    ctx.save(); ctx.globalAlpha = clamp(m * 1.6); ctx.globalCompositeOperation = 'lighten'
    ctx.translate(orb.x, orb.y); ctx.rotate(-0.04 + 0.05 * (t - t0) / 4)
    ctx.drawImage(MARK, -d / 2, -d / 2, d, d); ctx.restore()
  }
  const q = easeInOut(prog(t, tw, tw + 0.45))
  const s = 1.15 - 0.15 * spring(t, t0 + 0.7, 2.4, 0.55)
  const ty = 650, size = 180
  const wA = measure(ctx, '房子', size), wB = measure(ctx, '世界', size), wRest = measure(ctx, '的形状', size)
  const xr = lerp(W / 2 - (wA + wRest) / 2 + wA, W / 2 - (wB + wRest) / 2 + wB, q)
  const ta = clamp(spring(t, t0 + 0.7, 3, 0.6) * 2)
  scaled(ctx, s, W / 2, ty - 60, () => {
    ctx.save(); ctx.beginPath(); ctx.rect(0, ty - 180, W, 220); ctx.clip()
    txt(ctx, '房子', xr - wA, ty - 270 * q, { size, color: C.gold, alpha: ta })
    txt(ctx, '世界', xr - wB, ty + 270 * (1 - q), { size, alpha: ta })
    ctx.restore()
    txt(ctx, '的形状', xr, ty, { size, alpha: ta })
  })
  const u = easeOut(prog(t, t0 + 0.9, t0 + 1.25)) * lerp(wA + wRest + 40, wB + wRest + 40, q)
  rect(ctx, W / 2 - u / 2, ty + 36, u, 10, C.hi)
  const l1 = enter(t, tw + BEAT * 1), l2 = enter(t, tw + BEAT * 1.6), l3 = enter(t, tw + BEAT * 2.2)
  txt(ctx, '看见世界如何运行', W / 2, ty + 150 + l1.dy, { size: 56, align: 'center', alpha: l1.a })
  txt(ctx, 'shapeof.world', W / 2, ty + 232 + l2.dy, { size: 48, color: C.hi, align: 'center', family: MONO, weight: 700, alpha: l2.a })
  txt(ctx, '制作  MakerJackie', W / 2, ty + 304 + l3.dy, { size: 36, color: C.dim, align: 'center', weight: 700, alpha: l3.a })
  const fade = easeInOut(prog(t, DURATION - 0.5, DURATION))
  if (fade > 0) rect(ctx, 0, 0, W, H, '#000', fade)
}

export const SHOTS = [
  { from: 47, to: 48, src: '房价 100 + 房贷利息 37.6 − 首套贴息 3.3 + 契税 1 + 维修资金 2 + 物业费 8.1，见前几章', draw: total },
  { from: 62, to: 63, src: '地和税 = 土地 38 + 税 11 · 利息 = 37.6 − 贴息 3.3 · 其他 = 配套 5 + 开发商利息 4 + 卖房 5 + 开发商 4 + 契税 1 + 维修资金 2 + 物业费 8.1', draw: who },
  { from: 52, to: 54, src: '去向按前几章的拆分，是示意；土地出让收入的用途见财政部决算说明', draw: flow },
  { from: 49, to: 51, src: '145.4 万 ÷ 2025 年城镇居民人均可支配收入 56502 元 ≈ 25.7 年', draw: time },
  { from: 55, to: 56, src: '', draw: home },
  { from: 58, to: 59, post: DURATION - BODY, push: false, draw: endCard },
]
