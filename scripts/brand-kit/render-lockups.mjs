import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const html = resolve(root, 'scripts/brand-kit/lockups.html')
const outDir = resolve(root, 'public/assets/brand/kit')
await mkdir(outDir, { recursive: true })

const ids = ['zh-dark', 'zh-light', 'en-dark', 'en-light', 'bi-dark', 'bi-light']
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1600, height: 3000 } })
await page.goto(`file://${html}`, { waitUntil: 'networkidle' })
await page.waitForFunction(async () => {
  await document.fonts.load('500 84px "Noto Serif SC"')
  await document.fonts.load('500 76px "Cormorant Garamond"')
  return document.fonts.check('500 84px "Noto Serif SC"')
    && document.fonts.check('500 76px "Cormorant Garamond"')
})
await page.waitForTimeout(200)

for (const id of ids) {
  const card = page.locator(`#${id}`)
  await card.screenshot({
    path: resolve(outDir, `lockup-${id}.png`),
    type: 'png',
  })
}

await browser.close()
console.log(`[brand-kit] wrote ${ids.length} lockups`)
