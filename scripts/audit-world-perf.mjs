import { worldPath } from '../src/lib/world-urls.ts'
/**
 * Rank public worlds by how hard they are to run.
 *
 * A world that crawls on a phone fails the product standard's own bar — the
 * first screen has to feel alive — and nothing measured it. This does not try
 * to produce a number you could quote: it runs under a software renderer, so
 * every figure is far below real hardware. What it gives you is an ordering.
 * The worlds at the bottom of this list are the ones to look at first, because
 * whatever makes them slowest here will make them slowest on a real phone too.
 *
 * Runs one world at a time on purpose. Measuring several at once means
 * measuring the contention between them.
 *
 *   node scripts/audit-world-perf.mjs
 *   node scripts/audit-world-perf.mjs --only fluid-sim,slime-mold
 *   node scripts/audit-world-perf.mjs --top 20
 */
import { resolve } from 'node:path'
import { chromium } from 'playwright'

import { isPublicWorldSource, readArchivedWorldIds, readWorldCatalogFiles } from './lib/world-catalog-source.mjs'

const root = resolve(import.meta.dirname, '..')
const base = process.env.BASE_URL ?? 'http://127.0.0.1:3000'
const settle = Number(process.env.SETTLE ?? 6000)
const sample = Number(process.env.SAMPLE ?? 3000)

const onlyIndex = process.argv.indexOf('--only')
const only = onlyIndex >= 0
  ? new Set(process.argv[onlyIndex + 1].split(',').map((id) => id.trim()).filter(Boolean))
  : null
const topIndex = process.argv.indexOf('--top')
const top = topIndex >= 0 ? Number(process.argv[topIndex + 1]) : 0

const archived = readArchivedWorldIds(root)

const ids = []
for (const { source } of readWorldCatalogFiles(root)) {
  const id = source.match(/^ {4}id: '([^']+)',$/mu)?.[1]
  if (id && isPublicWorldSource(source) && !archived.has(id) && (!only || only.has(id))) ids.push(id)
}

const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader'] })
const results = []

for (const id of ids) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
  try {
    await page.goto(`${base}${worldPath(id)}?ghost=0`, { waitUntil: 'networkidle', timeout: 45_000 })
    await page.waitForTimeout(settle)
    await page.click('.guide-close').catch(() => {})
    await page.waitForTimeout(2000)

    const measured = await page.evaluate(
      (duration) => new Promise((done) => {
        let frames = 0
        let worst = 0
        let previous = performance.now()
        const start = previous
        const tick = () => {
          const now = performance.now()
          const delta = now - previous
          previous = now
          // Ignore the first frame; it carries scheduling noise.
          if (frames > 0 && delta > worst) worst = delta
          frames += 1
          if (now - start < duration) requestAnimationFrame(tick)
          else done({ fps: frames / ((now - start) / 1000), worst })
        }
        requestAnimationFrame(tick)
      }),
      sample,
    )
    results.push({ id, fps: measured.fps, worst: measured.worst })
    process.stdout.write('.')
  } catch {
    results.push({ id, fps: null, worst: null })
    process.stdout.write('x')
  }
  await page.close()
}
await browser.close()

const ranked = results
  .filter((result) => result.fps !== null)
  .sort((a, b) => a.fps - b.fps)
const shown = top ? ranked.slice(0, top) : ranked

/**
 * Flag relative to the catalogue, never against an absolute frame rate. Under
 * a software renderer every world looks slow, so a fixed threshold marks all
 * of them and tells you nothing. Half the median is a world that is heavy
 * *for this project*, which is the thing worth acting on.
 */
const median = ranked.length ? ranked[Math.floor(ranked.length / 2)].fps : 0
const heavyBelow = median / 2

console.log(`\n\n${results.length} worlds, slowest first`)
console.log('software renderer: the ordering is meaningful, the numbers are not')
console.log(`median ${median.toFixed(1)} fps — flagging below ${heavyBelow.toFixed(1)}\n`)
console.log('  fps   worst frame   world')
for (const result of shown) {
  const flag = result.fps < heavyBelow ? ' <- heavy for this catalogue' : ''
  console.log(
    `  ${result.fps.toFixed(1).padStart(5)}   ${`${result.worst.toFixed(0)}ms`.padStart(9)}   ${result.id}${flag}`,
  )
}

const failed = results.filter((result) => result.fps === null)
if (failed.length) console.log(`\ncould not measure: ${failed.map((result) => result.id).join(', ')}`)
