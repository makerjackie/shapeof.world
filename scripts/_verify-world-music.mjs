import { worldPath } from '../src/lib/world-urls.ts'
import { chromium, devices } from 'playwright'

const base = 'http://localhost:3000'

async function collect(page, url) {
  const audioRequests = []
  page.on('request', (req) => {
    if (req.url().includes('hidden-shapes') || req.url().includes('music-cdn.shapeof.world')) audioRequests.push(req.url())
  })
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 })
  await page.waitForTimeout(800)
  const toggle = page.locator('.site-bgm-toggle, .experience-mobile-sound, .experience-more-bgm')
  const toggleCount = await toggle.count()
  const labels = []
  for (let i = 0; i < toggleCount; i++) {
    labels.push(await toggle.nth(i).getAttribute('aria-label'))
  }
  const headerToggle = await page.locator('.experience-header-actions .site-bgm-toggle, .experience-header-icon.site-bgm-toggle').count()
  return { audioRequests, toggleCount, labels, headerToggle, url }
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const results = []

  const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const mobile = await browser.newContext({
    ...devices['iPhone 14'],
  })

  const cases = [
    { ctx: desktop, name: 'home-zh', url: `${base}/` },
    { ctx: desktop, name: 'home-en', url: `${base}/?lang=en` },
    { ctx: desktop, name: 'about-zh', url: `${base}/about` },
    { ctx: desktop, name: 'solar-zh', url: `${base}${worldPath('solar-system')}` },
    { ctx: desktop, name: 'solar-en', url: `${base}${worldPath('solar-system', 'en')}` },
    { ctx: desktop, name: 'eclipses-zh', url: `${base}${worldPath('eclipses')}` },
    { ctx: desktop, name: 'eclipses-en', url: `${base}${worldPath('eclipses', 'en')}` },
    { ctx: desktop, name: 'flyby-zh', url: `${base}${worldPath('black-hole-flyby')}` },
    { ctx: mobile, name: 'solar-mobile-zh', url: `${base}${worldPath('solar-system')}` },
    { ctx: mobile, name: 'eclipses-mobile-zh', url: `${base}${worldPath('eclipses')}` },
  ]

  for (const item of cases) {
    const page = await item.ctx.newPage()
    const result = await collect(page, item.url)
    results.push({ name: item.name, ...result })
    await page.close()
  }

  // Navigation yield: start on solar, go to eclipses, back to solar
  const page = await desktop.newPage()
  const navAudio = []
  page.on('request', (req) => {
    if (req.url().includes('hidden-shapes') || req.url().includes('music-cdn.shapeof.world')) navAudio.push(req.url())
  })
  await page.goto(`${base}${worldPath('solar-system')}`, { waitUntil: 'networkidle', timeout: 60_000 })
  await page.waitForTimeout(500)
  const solarToggle = await page.locator('.site-bgm-toggle').count()
  await page.goto(`${base}${worldPath('eclipses')}`, { waitUntil: 'networkidle', timeout: 60_000 })
  await page.waitForTimeout(500)
  const eclipseToggle = await page.locator('.site-bgm-toggle').count()
  await page.goto(`${base}${worldPath('solar-system')}`, { waitUntil: 'networkidle', timeout: 60_000 })
  await page.waitForTimeout(500)
  const solarAgain = await page.locator('.site-bgm-toggle').count()
  await page.click('.site-bgm-toggle')
  const pressed = await page.locator('.site-bgm-toggle').getAttribute('aria-pressed')
  const mutedLabel = await page.locator('.site-bgm-toggle').getAttribute('aria-label')

  results.push({
    name: 'navigate-yield',
    solarToggle,
    eclipseToggle,
    solarAgain,
    pressed,
    mutedLabel,
    navAudioCount: navAudio.length,
  })

  await browser.close()
  console.log(JSON.stringify(results, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
