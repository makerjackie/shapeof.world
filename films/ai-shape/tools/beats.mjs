// Review sheet: one still per beat (or per half-beat) over a bar range.
// Usage: node tools/beats.mjs out/beats-1-12.webp 1 12 [step=1]
import { spawnSync } from 'node:child_process'
const [out, a, b, step = '1'] = process.argv.slice(2)
const marks = []
for (let bar = Number(a); bar <= Number(b); bar++) for (let beat = 1; beat < 5; beat += Number(step)) marks.push(`${bar}:${beat + 0.25}`)
spawnSync('node', [new URL('./frames.mjs', import.meta.url).pathname, out, ...marks], { stdio: 'inherit' })
