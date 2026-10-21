import { worldPath } from '../src/lib/world-urls.ts'
/**
 * Capture the dedicated portrait composition for flame-colors.
 *
 * Usage:
 *   BASE_URL=http://127.0.0.1:5233 node scripts/capture-flame-colors-mobile-poster.mjs
 */
import { unlinkSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

import { chromium } from 'playwright'

const root = resolve(import.meta.dirname, '..')
const base = process.env.BASE_URL ?? 'http://127.0.0.1:3000'
const output = resolve(root, 'public/assets/posters/mobile/flame-colors.webp')
const temporaryPng = resolve(root, 'public/assets/posters/mobile/flame-colors.capture.png')

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader'],
})
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
})
const errors = []

page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`)
})
page.on('pageerror', (error) => errors.push(`page: ${error.message}`))
page.on('response', (response) => {
  if (response.status() >= 400 && !response.url().includes('/assets/posters/')) {
    errors.push(`http ${response.status()}: ${response.url()}`)
  }
})

await page.addInitScript(() => {
  try {
    localStorage.setItem('oneworld.guide.flame-colors.v1', 'done')
  } catch { /* ignore */ }
})

await page.goto(`${base}${worldPath('flame-colors')}?ghost=0&lang=zh`, {
  waitUntil: 'domcontentloaded',
  timeout: 60_000,
})
await page.waitForFunction(() => {
  const canvas = document.querySelector('.flame-colors-canvas')
  return Boolean(canvas && !document.querySelector('.renderer-error'))
}, undefined, { timeout: 60_000 })
console.log('[poster] stage ready')

await page.locator('.flame-colors-salt', { hasText: '锶' }).click({ timeout: 20_000 })
const canvas = page.locator('.flame-colors-canvas')
for (let index = 0; index < 8; index += 1) {
  await canvas.click({ position: { x: 195 + (index % 3 - 1) * 10, y: 480 }, timeout: 10_000 })
  await page.waitForTimeout(160)
}
console.log('[poster] strontium dosed')
await page.waitForTimeout(2400)

await page.evaluate(() => {
  document.querySelectorAll(
    '.experience-header, .guide-tour, .ghost-hint, [data-experience-overlay="true"]',
  ).forEach((element) => {
    if (!(element instanceof HTMLElement)) return
    element.style.setProperty('opacity', '0', 'important')
    element.style.setProperty('pointer-events', 'none', 'important')
  })
})
await page.waitForTimeout(300)

if (errors.length > 0) throw new Error(errors.join('\n'))

const png = await page.screenshot({ type: 'png', fullPage: false })
writeFileSync(temporaryPng, png)
const converted = spawnSync('magick', [
  temporaryPng,
  '-strip',
  '-define', 'webp:method=6',
  '-quality', '90',
  output,
], { stdio: 'inherit' })
unlinkSync(temporaryPng)
if (converted.status !== 0) throw new Error('Failed to convert the mobile poster with ImageMagick')
console.log(`[poster] wrote ${output} (1170×2532)`)
