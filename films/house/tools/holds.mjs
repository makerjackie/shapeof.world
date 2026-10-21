// Hold audit, the other half of readtime.mjs: for every inserted bar in
// HOLDS, is anything still happening? It samples the film at 10 fps, measures
// motion on a 96×54 grayscale thumbnail (the film grain averages out), and
// checks what removing the bar would cost the lines on screen.
// A held bar is dead when nothing moves, no new line appears and every line
// still gets its reading time without it. Dead bars are what make a cut drag.
// Usage: node tools/holds.mjs [--plan]
// --plan replans HOLDS from scratch: the fewest held bars that give every line
// its reading time, at most MAX_HOLD frozen bars per storyboard bar.
import { chromium, BASE } from './pw.mjs'
import { DURATION, BAR, nb, bt, bend, HOLDS, ORDER } from '../web/timeline.js'
import { need as needFor, CARD } from './reading.mjs'

const STEP = 0.1
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } })
p.on('pageerror', (e) => console.log('pageerror', String(e)))
await p.goto(`${BASE}/web/index.html?render`, { waitUntil: 'load' })
await p.waitForFunction(() => window.ready, null, { timeout: 60000 })
const { frames, motion } = await p.evaluate(([dur, step]) => {
  const src = document.getElementById('c')
  // Two-step downscale so the grain averages out instead of aliasing.
  const mid = new OffscreenCanvas(480, 270), mc = mid.getContext('2d')
  const th = new OffscreenCanvas(96, 54), tc = th.getContext('2d', { willReadFrequently: true })
  window.__still = true
  const frames = [], motion = []
  let prev = null
  for (let t = 0; t <= dur + 1e-6; t += step) {
    window.__textLog = []
    window.seek(t)
    frames.push(window.__textLog.filter(([, a]) => a >= 0.5).map(([s, , size]) => [s, size]))
    mc.drawImage(src, 0, 0, 480, 270)
    tc.drawImage(mid, 0, 0, 96, 54)
    const d = tc.getImageData(0, 0, 96, 54).data
    const g = new Float32Array(96 * 54)
    for (let i = 0; i < g.length; i++) g[i] = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 3
    let m = 0
    // Share of the picture that visibly changed since the last sample.
    if (prev) for (let i = 0; i < g.length; i++) if (Math.abs(g[i] - prev[i]) > 4) m++
    motion.push(prev ? m / g.length : 0)
    prev = g
  }
  window.__textLog = null
  return { frames, motion }
}, [DURATION, STEP])
await b.close()

// Same runs and reading times as readtime.mjs.
const runs = [], open = new Map(), SIZE = new Map()
frames.forEach((list, i) => {
  for (const [s, size] of list) SIZE.set(s, Math.max(SIZE.get(s) || 0, size))
  const now = new Set(list.map(([s]) => s))
  for (const s of now) if (!open.has(s)) open.set(s, i)
  for (const [s, i0] of [...open]) if (!now.has(s)) { runs.push({ s, a: i0 * STEP, b: i * STEP }); open.delete(s) }
})
for (const [s, i0] of open) runs.push({ s, a: i0 * STEP, b: frames.length * STEP })
const lines = runs
  .filter((r) => (r.b - r.a >= 0.25 || !/\d/.test(r.s)) && !CARD.test(r.s))
  .map((r) => ({ ...r, need: needFor(r.s, SIZE.get(r.s) || 0) }))
  .map((r) => ({ ...r, slack: r.b - r.a - r.need }))
const mmss = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(0).padStart(2, '0')}`
const held = Object.entries(HOLDS).map(([k, v]) => [Number(k), v]).filter(([, v]) => v > 0)

if (process.argv.includes('--plan')) {
  // A line's time splits into its core (unheld bars) and the share it spends in
  // each storyboard bar's held bars, which scales with how many bars are held.
  const wins = held.flatMap(([n, h]) => Array.from({ length: h }, (_, j) => ({ n, h, a: (nb(n) + j) * BAR, z: (nb(n) + j + 1) * BAR })))
  for (const r of lines) {
    r.over = {}
    let tot = 0
    for (const w of wins) {
      const o = Math.max(0, Math.min(r.b, w.z) - Math.max(r.a, w.a))
      if (o > 0) { r.over[w.n] = (r.over[w.n] || 0) + o / (w.h * BAR); tot += o }
    }
    r.core = r.b - r.a - tot
    // The bar whose hold keeps this line up: it leaves after that bar's beat 4.
    r.at = null
    for (const k of ORDER) if (r.b > bt(k, 4.9) && r.b <= bend(k) + 0.15) { r.at = k; break }
  }
  const FIXED = JSON.parse(process.env.FIXED || '{}') // bars whose scenes animate in held beats
  const MAX_HOLD = Number(process.env.MAX_HOLD || 1)
  const TOL = Number(process.env.TOL || 0.3) // a line may come up this much short
  const plan = { ...FIXED }
  const dur = (r) => r.core + Object.entries(r.over).reduce((t, [m, f]) => t + f * (plan[m] || 0) * BAR, 0)
  for (let pass = 0, changed = true; changed && pass < 20; pass++) {
    changed = false
    for (const r of lines) {
      if (!r.at) continue
      const d = r.need - TOL - dur(r)
      const cap = Math.max(MAX_HOLD, FIXED[r.at] || 0)
      if (d > 0 && (plan[r.at] || 0) < cap) { plan[r.at] = Math.min(cap, (plan[r.at] || 0) + Math.ceil(d / BAR)); changed = true }
    }
  }
  const total = Object.values(plan).reduce((a, b) => a + b, 0)
  const now = held.reduce((a, [, v]) => a + v, 0)
  console.log('HOLDS =', `{ ${ORDER.filter((b) => plan[b]).map((b) => `${b}: ${plan[b]}`).join(', ')} }`)
  console.log(`加停 ${total} 小节（现在 ${now}），全片约 ${(DURATION - (now - total) * BAR).toFixed(0)}s`)
  console.log('\n每个加停是为哪一行（不加时还差几秒）:')
  for (const k of ORDER.filter((b) => plan[b])) {
    if (FIXED[k]) { console.log(`  ${String(k).padStart(2)}  固定 ${FIXED[k]}`); continue }
    const keep = plan[k]; plan[k] = 0
    const worst = lines.filter((r) => r.at === k).map((r) => ({ r, d: r.need - dur(r) })).sort((x, y) => y.d - x.d)[0]
    plan[k] = keep
    console.log(`  ${String(k).padStart(2)}  差 ${worst ? worst.d.toFixed(1) : '?'}s  ${worst ? worst.r.s.slice(0, 30) : ''}`)
  }
  console.log('\n加满也读不完的（要删字或改镜头）:')
  for (const r of lines) { const d = r.need - dur(r); if (r.at && d > TOL) console.log(`  小节 ${r.at}  差 ${d.toFixed(1)}s  ${r.s}`) }
  console.log('\n不在加停处离场、又不够时间的:')
  for (const r of lines) { const d = r.need - dur(r); if (!r.at && d > TOL) console.log(`  ${mmss(r.a)}  差 ${d.toFixed(1)}s  ${r.s}`) }
  process.exit(0)
}

const MOVING = 0.003 // share of the picture changing per 0.1 s that a viewer notices
const rows = []
for (const [n, h] of held) {
  for (let j = h; j >= 1; j--) {
    const a = (nb(n) + j - 1) * BAR, z = a + BAR
    const i0 = Math.round(a / STEP), i1 = Math.round(z / STEP)
    const moving = motion.slice(i0 + 1, i1).filter((v) => v > MOVING).length * STEP
    const fresh = lines.filter((r) => r.a >= a - 0.05 && r.a < z - 0.05).map((r) => r.s)
    // Removing held bars j..h takes that many bars off every line spanning them.
    const span = lines.filter((r) => r.a <= a + 0.05 && r.b >= z - 0.05)
    const after = span.length ? Math.min(...span.map((r) => r.slack - (h - j + 1) * BAR)) : Infinity
    rows.push({ n, j, h, moving, fresh, after, worst: span.sort((x, y) => x.slack - y.slack)[0]?.s })
  }
}
rows.sort((x, y) => x.n - y.n || x.j - y.j)
let dead = 0
console.log('小节  加停   时间   动画(s)  新字  删到这一小节后最紧的一行还富余(s)')
for (const r of rows) {
  const t = (nb(r.n) + r.j - 1) * BAR
  const isDead = r.moving < 0.6 && !r.fresh.length && r.after >= -0.3
  if (isDead) dead++
  console.log(`${String(r.n).padStart(3)}  ${r.j}/${r.h}  ${mmss(t)}  ${r.moving.toFixed(1).padStart(5)}   ${r.fresh.length ? '有' : '  '}   ${Number.isFinite(r.after) ? r.after.toFixed(1).padStart(5) : '    —'}  ${isDead ? '← 空停' : ''}  ${r.worst ? r.worst.slice(0, 24) : ''}`)
}
console.log(`\n${rows.length} 个加停小节，其中 ${dead} 个空停（画面不动、没有新字、删了也读得完）。全片 ${DURATION.toFixed(0)}s。`)
