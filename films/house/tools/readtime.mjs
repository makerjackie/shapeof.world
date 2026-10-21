// Reading-time audit: steps through the film at 10 fps, records every line of
// text that is clearly visible (alpha ≥ 0.5), and lists the ones that leave
// the screen before a viewer could read them. The rule is in reading.mjs;
// holds.mjs checks the opposite, bars held with nothing left to read.
// Usage: node tools/readtime.mjs [--all | --plan]
// --plan suggests extra hold bars: a line that runs short and leaves at the
// end of storyboard bar n is fixed by holding bar n longer.
import { chromium, BASE } from './pw.mjs'
import { DURATION, BAR, BEAT, bt, bend, ORDER } from '../web/timeline.js'
import { need as needFor, CARD } from './reading.mjs'

const STEP = 0.1
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } })
p.on('pageerror', (e) => console.log('pageerror', String(e)))
await p.goto(`${BASE}/web/index.html?render`, { waitUntil: 'load' })
await p.waitForFunction(() => window.ready, null, { timeout: 60000 })
const frames = await p.evaluate(([dur, step]) => {
  const out = []
  for (let t = 0; t <= dur + 1e-6; t += step) {
    window.__textLog = []
    window.seek(t)
    out.push(window.__textLog.filter(([, a]) => a >= 0.5).map(([s, , size]) => [s, size]))
  }
  window.__textLog = null
  return out
}, [DURATION, STEP])
await b.close()

// Continuous runs per string.
const runs = []
const open = new Map()
const SIZE = new Map()
frames.forEach((list, i) => {
  for (const [s, size] of list) SIZE.set(s, Math.max(SIZE.get(s) || 0, size))
  const now = new Set(list.map(([s]) => s))
  for (const s of now) if (!open.has(s)) open.set(s, i)
  for (const [s, i0] of [...open]) if (!now.has(s)) { runs.push({ s, a: i0 * STEP, b: i * STEP }); open.delete(s) }
})
for (const [s, i0] of open) runs.push({ s, a: i0 * STEP, b: frames.length * STEP })

const need = (s) => needFor(s, SIZE.get(s) || 0)
// Played time → storyboard bar:beat, for finding the scene.
const inv = (t) => {
  const bar = ORDER.find((b) => t >= bt(b) - 1e-6 && t < bend(b)) ?? ORDER.at(-1)
  return `${bar}:${((t - bt(bar)) / BEAT + 1).toFixed(1)}`
}
const mmss = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`
const rows = runs
  .filter((r) => r.b - r.a >= 0.25 || !/\d/.test(r.s)) // counting digits change every frame
  .map((r) => ({ ...r, dur: r.b - r.a, need: need(r.s) }))
  .filter((r) => process.argv.includes('--all') || r.dur < r.need)
  .sort((x, y) => x.a - y.a)
if (process.argv.includes('--plan')) {
  const add = {}, loose = []
  for (const r of rows) {
    if (CARD.test(r.s)) continue
    let n = 0
    for (const k of ORDER) if (Math.abs(bend(k) - r.b) <= 0.15) { n = k; break }
    if (!n) { loose.push(r); continue }
    add[n] = Math.max(add[n] || 0, Math.ceil((r.need - r.dur + 0.3) / BAR))
  }
  console.log('建议加停（分镜小节号: 再加几小节）:', JSON.stringify(add))
  console.log('不在小节线上离场的（要手动处理）:')
  for (const r of loose) console.log(`  ${mmss(r.a)} ${inv(r.a)} ${r.dur.toFixed(1)}s / 需 ${r.need.toFixed(1)}s  ${r.s}`)
} else {
  for (const r of rows) console.log(`${mmss(r.a)}  ${inv(r.a).padEnd(7)} ${r.dur.toFixed(1).padStart(4)}s / 需 ${r.need.toFixed(1)}s  ${r.s}`)
  console.log(`\n${rows.length} 条不足（共 ${runs.length} 段文字）`)
}
