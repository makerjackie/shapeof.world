// Export the release covers: PNG master, JPG for upload, light WebP, plus a
// side-by-side preview sheet. Usage: node tools/covers.mjs  -> out/release/
import { mkdirSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { chromium, BASE } from './pw.mjs'

const dir = new URL('../out/release/', import.meta.url).pathname
mkdirSync(dir, { recursive: true })
const b = await chromium.launch()
const p = await b.newPage()
p.on('pageerror', (e) => console.log('pageerror', String(e)))
await p.goto(`${BASE}/web/covers.html`, { waitUntil: 'load' })
await p.waitForFunction(() => window.ready, null, { timeout: 60000 })
const files = []
for (const [id, fmts] of [['A', ['4x3', '16x9', '3x4']], ['B', ['4x3', '16x9']]]) for (const fmt of fmts) {
  const url = await p.evaluate(([id, fmt]) => window.renderCover(id, fmt), [id, fmt])
  const base = `${dir}cover-${id}-${fmt}`
  writeFileSync(`${base}.png`, Buffer.from(url.split(',')[1], 'base64'))
  spawnSync('magick', [`${base}.png`, '-quality', '92', `${base}.jpg`])
  spawnSync('magick', [`${base}.png`, '-quality', '80', `${base}.webp`])
  files.push(base)
}
await b.close()
// Preview: each set's 4:3 and 16:9 side by side, one row per set.
spawnSync('magick', ['montage', ...files.map((f) => `${f}.png`), '-tile', '2x', '-geometry', '640x480+12+12', '-background', '#333', '-quality', '82', `${dir}covers-preview.webp`])
console.log(files.map((f) => f.split('/').pop()).join('\n'))
