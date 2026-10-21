// Final render: N browser workers each render a slice of frames (with motion
// blur) into their own H.264 segment; segments are joined and the score muxed.
// The closing Shape of the World card is drawn by the film itself (s6_end.js).
// Usage: node tools/render.mjs out/ai-shape-v4.mp4 [--fps 60] [--workers 5] [--blur 3] [--from 0] [--to DURATION]
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium, BASE } from './pw.mjs'
import { DURATION } from '../web/timeline.js'

const args = process.argv.slice(2)
const out = args[0]
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? Number(args[i + 1]) : d }
const fps = opt('fps', 60), workers = opt('workers', 5), blur = opt('blur', 3)
const from = opt('from', 0), to = opt('to', DURATION)
const f0 = Math.round(from * fps), f1 = Math.round(to * fps), total = f1 - f0
const tmp = new URL('../out/.segments/', import.meta.url).pathname
mkdirSync(tmp, { recursive: true })
const music = new URL('../music/score.wav', import.meta.url).pathname

const started = Date.now()
let done = 0
async function worker(w) {
  const a = f0 + Math.floor((total * w) / workers), b = f0 + Math.floor((total * (w + 1)) / workers)
  const seg = `${tmp}seg-${w}.mp4`
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p', '-g', String(fps * 2), seg], { stdio: ['pipe', 'inherit', 'inherit'] })
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  page.on('pageerror', (e) => console.log('pageerror', String(e)))
  await page.goto(`${BASE}/web/index.html?render`, { waitUntil: 'load' })
  await page.waitForFunction(() => window.ready, null, { timeout: 120000 })
  for (let f = a; f < b; f++) {
    await page.evaluate(([t, n, fps]) => window.seekBlur(t, n, fps), [f / fps, blur, fps])
    const buf = await page.screenshot({ type: 'jpeg', quality: 94 })
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r))
    if (++done % (fps * 5) === 0) {
      const el = (Date.now() - started) / 1000
      console.log(`${done}/${total} frames  ${el.toFixed(0)}s  eta ${((el / done) * (total - done)).toFixed(0)}s`)
    }
  }
  ff.stdin.end()
  await new Promise((r) => ff.on('close', r))
  await browser.close()
  return seg
}

const segs = await Promise.all([...Array(workers)].map((_, w) => worker(w)))
writeFileSync(`${tmp}list.txt`, segs.map((s) => `file '${s}'`).join('\n'))
const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', `${tmp}list.txt`,
  '-ss', String(from), '-t', String(to - from), '-i', music,
  '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', '-shortest', out], { stdio: 'inherit' })
console.log(r.status === 0 ? `done ${out} in ${((Date.now() - started) / 1000).toFixed(0)}s` : 'mux failed')
