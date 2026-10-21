import { worldPath } from '../src/lib/world-urls.ts'
/**
 * Open every public world and report the ones a visitor would find broken.
 *
 * A first click that lands on a blank stage or a console full of red is worse
 * than not having the world at all — there is only one first impression, and
 * nothing else in the catalogue gets a chance to repair it. Nothing checked
 * this before, so a world could rot for months without anyone noticing.
 *
 * Reports rendering and runtime failures:
 *   dead      — nothing is drawn on the stage at all
 *   errors    — the page threw, or logged console errors
 * Stillness is diagnostic only: many valid worlds are intentionally static.
 * Use --strict-resources to also fail on asset request errors.
 *
 * Usage:
 *   node scripts/smoke-worlds.mjs                       # every public world
 *   node scripts/smoke-worlds.mjs --only fluid-sim,aurora
 *   BASE_URL=http://127.0.0.1:3000 node scripts/smoke-worlds.mjs
 */
import { resolve } from 'node:path'
import { chromium } from 'playwright'

import { readWorldCatalogFiles } from './lib/world-catalog-source.mjs'
import { readStaticDefaultExport } from './lib/static-typescript-data.mjs'
import { resolveWorldState } from './lib/world-lifecycle.mjs'
import { parseSmokeArguments, selectAuditWorldIds, smokeBudget } from './lib/world-audit-selection.mjs'

const root = resolve(import.meta.dirname, '..')
const base = process.env.BASE_URL ?? 'http://127.0.0.1:3000'
/**
 * Generous by default. Heavy worlds sharing a software renderer need time, and
 * an impatient sample reports healthy worlds as dead — lower SETTLE or raise
 * CONCURRENCY and the run gets flaky rather than faster. Re-check anything this
 * flags with `--only <id>` before believing it.
 */
const { settle, concurrency } = smokeBudget(process.env)
const { only, strictResources } = parseSmokeArguments(process.argv.slice(2))
// Use the same static parser and lifecycle resolver as the catalog generator.
// Formatting, quote style and lifecycle overrides must not change audit coverage.
const entries = readWorldCatalogFiles(root).map(({ path }) => {
  const world = readStaticDefaultExport(path)
  return { id: world.id, state: resolveWorldState(world) }
})
const ids = selectAuditWorldIds(entries, only)
console.log(`Selected ${ids.length} public worlds from ${entries.length} catalog entries.`)

const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader'] })

/** Small hash of the stage pixels, to tell a still frame from a live one. */
const STAGE_PROBE = `(() => {
  const stage = document.querySelector('.experience-stage')
  if (!stage) return { drawn: false, sample: null }
  const canvas = [...stage.querySelectorAll('canvas')]
    .filter((c) => c.width > 32 && c.height > 32)
    .sort((a, b) => b.width * b.height - a.width * a.height)[0]
  // SVG counts: several worlds draw their whole stage as SVG rather than a
  // canvas, and omitting it reported healthy worlds as dead.
  const rich = stage.querySelector('iframe, model-viewer, video, img, svg')
  if (!canvas) return { drawn: Boolean(rich), sample: null }
  try {
    const probe = document.createElement('canvas')
    probe.width = 16; probe.height = 16
    const ctx = probe.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(canvas, 0, 0, 16, 16)
    const data = ctx.getImageData(0, 0, 16, 16).data
    let lit = 0; let sum = 0
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 8 && (data[i] > 10 || data[i + 1] > 10 || data[i + 2] > 10)) lit++
      sum += data[i] * 3 + data[i + 1] * 5 + data[i + 2] * 7
    }
    // A WebGL canvas without preserveDrawingBuffer reads blank; that is not a
    // fault, so an unreadable canvas counts as drawn and simply cannot be
    // checked for motion.
    return { drawn: true, sample: lit === 0 ? null : sum }
  } catch {
    return { drawn: true, sample: null }
  }
})()`

async function checkWorld(id) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } })
  const errors = []
  const resourceFailures = new Set()
  const resourceName = (url) => {
    const parsed = new URL(url)
    return /^https?:$/.test(parsed.protocol)
      ? `${parsed.origin}${parsed.pathname}` // Do not print signed query parameters.
      : parsed.protocol
  }
  page.on('requestfailed', (request) => {
    const reason = request.failure()?.errorText ?? 'request failed'
    if (reason.includes('ERR_ABORTED')) return
    resourceFailures.add(`${reason}: ${resourceName(request.url())}`)
  })
  page.on('response', (response) => {
    if (response.status() >= 400) {
      resourceFailures.add(`HTTP ${response.status()}: ${resourceName(response.url())}`)
    }
  })
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    const text = message.text()
    // Asset failures are recorded separately below, including their URLs.
    if (text.includes('Failed to load resource')) return
    errors.push(`console: ${text.slice(0, 160)}`)
  })

  const issues = []
  let still = false
  try {
    await page.goto(`${base}${worldPath(id)}?ghost=0`, { waitUntil: 'domcontentloaded', timeout: 45_000 })
    await page.waitForSelector('.experience-stage', { state: 'attached', timeout: 45_000 })
    await page.waitForTimeout(settle)

    const loaderUp = () => page.evaluate(
      () => Boolean(document.querySelector('.canvas-loading, .renderer-error')),
    )
    let first = await page.evaluate(STAGE_PROBE)
    if (!first.drawn || await loaderUp()) {
      await page.waitForTimeout(8000)
      first = await page.evaluate(STAGE_PROBE)
    }
    if (await loaderUp()) issues.push('dead: still showing the loader or an error panel')
    if (!first.drawn) issues.push('dead: nothing drawn on the stage')

    /**
     * Stillness is reported, not failed. Plenty of worlds are static on
     * purpose — an optical illusion that drifted would be wrong, and the
     * geometry proofs only move when dragged. Treating "did not animate" as
     * broken flagged thirty healthy worlds on the first run.
     */
    if (first.sample !== null) {
      await page.waitForTimeout(1600)
      const second = await page.evaluate(STAGE_PROBE)
      if (second.sample === first.sample) still = true
    }

  } catch (error) {
    issues.push(`dead: ${String(error).split('\n')[0].slice(0, 120)}`)
  }

  if (errors.length) issues.push(`errors: ${errors.length} (${errors[0]})`)
  if (strictResources && resourceFailures.size) issues.push(`assets: ${resourceFailures.size} failed requests`)
  await page.close()
  return { id, issues, still, resourceFailures: [...resourceFailures] }
}

const queue = [...ids]
const results = []
try {
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (queue.length) {
        const id = queue.shift()
        const result = await checkWorld(id)
        results.push(result)
        process.stdout.write(result.issues.length ? 'x' : '.')
      }
    }),
  )
} finally {
  await browser.close()
}

const broken = results.filter((result) => result.issues.length)
const still = results.filter((result) => !result.issues.length && result.still)
console.log(`\n\n${results.length} worlds checked, ${broken.length} broken\n`)
for (const result of broken.sort((a, b) => a.id.localeCompare(b.id))) {
  console.log(`${result.id}`)
  for (const issue of result.issues) console.log(`   ${issue}`)
}
if (!broken.length) console.log('Selected-world smoke checks passed; interaction, scientific claims and visual quality remain unverified.')
for (const result of results.filter((item) => item.resourceFailures.length)) {
  console.log(`\nAsset warnings for ${result.id}:`)
  for (const failure of result.resourceFailures) console.log(`   ${failure}`)
}
if (still.length) {
  console.log(`\nStill on arrival (${still.length}) — fine when the world is static by design:`)
  console.log(`  ${still.map((result) => result.id).sort().join(', ')}`)
}
process.exitCode = broken.length ? 1 : 0
