// Grab stills into a contact sheet. Times are seconds, or bar:beat like 15:1.
// Usage: node tools/frames.mjs out/sheet.webp 1:1 1:3 2:1 ...
import { mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { chromium, BASE } from './pw.mjs'
import { bt } from '../web/timeline.js'

const [out, ...marks] = process.argv.slice(2)
const times = marks.map((m) => (m.includes(':') ? bt(...m.split(':').map(Number)) : Number(m)))
const dir = new URL(`../out/.frames/${out.split('/').pop().replace(/\.\w+$/, '')}/`, import.meta.url).pathname
mkdirSync(dir, { recursive: true })
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } })
p.on('console', (m) => m.type() === 'error' && console.log('console', m.text()))
p.on('pageerror', (e) => console.log('pageerror', String(e)))
await p.goto(`${BASE}/web/index.html?render`, { waitUntil: 'load' })
await p.waitForFunction(() => window.ready, null, { timeout: 60000 })
const files = []
for (const [i, t] of times.entries()) {
  await p.evaluate((t) => window.seek(t), t)
  const f = `${dir}f-${String(i).padStart(2, '0')}-${marks[i].replace(':', 'b')}.png`
  await p.screenshot({ path: f })
  files.push(f)
}
await b.close()
const cols = Math.min(3, files.length)
spawnSync('magick', ['montage', ...files, '-tile', `${cols}x`, '-geometry', '640x360+3+3', '-background', '#444', '-pointsize', '14', '-fill', 'white', '-quality', '82', out], { stdio: 'inherit' })
console.log(out)
