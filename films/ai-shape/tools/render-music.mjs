// Render the score offline in Chromium, then normalise loudness for the web
// with a two-pass linear loudnorm so the sections keep their dynamics.
// Usage: node tools/render-music.mjs  -> music/score-raw.wav, music/score.wav
import { writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { chromium, BASE } from './pw.mjs'

const dir = new URL('../music/', import.meta.url).pathname
if (!process.argv.includes('--norm-only')) {
  const b = await chromium.launch()
  const p = await b.newPage()
  p.on('pageerror', (e) => console.log('pageerror', String(e)))
  p.on('console', (m) => console.log('console', m.text()))
  await p.goto(`${BASE}/music/index.html`)
  await p.waitForFunction(() => window.ready)
  const { b64, ms } = await p.evaluate(() => window.renderWav())
  await b.close()
  writeFileSync(dir + 'score-raw.wav', Buffer.from(b64, 'base64'))
  console.log(`rendered in ${(ms / 1000).toFixed(1)}s`)
}
const target = 'I=-14:TP=-1.0:LRA=11'
const m = spawnSync('ffmpeg', ['-hide_banner', '-i', dir + 'score-raw.wav', '-af', `loudnorm=${target}:print_format=json`, '-f', 'null', '-'], { encoding: 'utf8' })
const j = JSON.parse(m.stderr.match(/\{[^{}]*\}/g).pop())
console.log('measured', j.input_i, 'LUFS, TP', j.input_tp, 'LRA', j.input_lra)
const af = `loudnorm=${target}:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true:print_format=summary`
const r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-i', dir + 'score-raw.wav', '-af', af, '-ar', '48000', dir + 'score.wav'], { encoding: 'utf8' })
console.log(r.stderr.split('\n').filter((l) => /Output|Normalization/.test(l)).join('\n'))
process.exit(r.status)
