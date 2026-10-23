import { createRequire } from 'node:module'
const require = createRequire('/Volumes/DevSSD/Projects/code/shapeof.world/package.json')
const { chromium } = require('playwright')
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] })
const ids = process.argv.slice(2)
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } })
await ctx.addInitScript((ids) => { try { for (const id of ids) { localStorage.setItem(`oneworld.guide.${id}.v1`, 'done'); localStorage.setItem(`oneworld.ghost.${id}.v1`, 'done') } localStorage.setItem('oneworld.site-bgm.muted.v1', '1') } catch {} }, ids)
for (const id of ids) {
  const p = await ctx.newPage()
  await p.goto(`https://shapeof.world/${id}?capture=1&ghost=0`, { waitUntil: 'load', timeout: 90000 })
  await p.waitForTimeout(9000)
  const r = await p.evaluate(() => {
    const out = new Map()
    const desc = (el) => { const path = []; let e = el; for (let i = 0; e && i < 4; i++, e = e.parentElement) path.push(e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0,2).join('.') : '')); return path.join(' < ') }
    for (let y = 20; y < innerHeight; y += 60) for (let x = 20; x < innerWidth; x += 80) {
      const el = document.elementFromPoint(x, y); if (!el) continue
      if (el.tagName === 'CANVAS') continue
      const k = desc(el); out.set(k, (out.get(k) || 0) + 1)
    }
    return [...out.entries()].sort((a,b)=>b[1]-a[1]).slice(0, 25)
  })
  console.log('==', id); for (const [k, n] of r) console.log(n, k)
  await p.screenshot({ path: `/Volumes/DevSSD/Projects/code/shapeof.world-reports/site-trailer/stills/dom-${id}.jpg`, quality: 70 })
  await p.close()
}
await b.close()
