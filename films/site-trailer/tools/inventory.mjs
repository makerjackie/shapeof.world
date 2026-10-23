// Inventory of every public world: visible controls + a free-mode still (capture=1).
// node films/site-trailer/tools/inventory.mjs [ids...]  -> <media>/stills/inv-<id>.jpg + inventory.json
import { createRequire } from 'node:module'
import { readdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
const require = createRequire('/Volumes/DevSSD/Projects/code/shapeof.world/package.json')
const { chromium } = require('playwright')
const here = dirname(new URL(import.meta.url).pathname)
const catDir = resolve(here, '../../../src/data/worlds/catalog')
const media = '/Volumes/DevSSD/Projects/code/shapeof.world-reports/site-trailer'
let ids = process.argv.slice(2)
if (!ids.length) for (const d of readdirSync(catDir, { withFileTypes: true })) if (d.isDirectory()) for (const f of readdirSync(resolve(catDir, d.name))) if (f.endsWith('.ts')) {
  const src = readFileSync(resolve(catDir, d.name, f), 'utf8'); if (/publication:\s*'public'/.test(src)) ids.push(f.replace(/\.ts$/, ''))
}
const outFile = resolve(media, 'inventory.json')
const inv = existsSync(outFile) ? JSON.parse(readFileSync(outFile, 'utf8')) : {}
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio'] })
async function one(id) {
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, locale: 'zh-CN', colorScheme: 'dark' })
  await ctx.addInitScript((id) => { try { localStorage.setItem(`oneworld.guide.${id}.v1`, 'done'); localStorage.setItem(`oneworld.ghost.${id}.v1`, 'done'); localStorage.setItem('oneworld.site-bgm.muted.v1', '1') } catch {} }, id)
  await ctx.route('https://music-cdn.shapeof.world/**', (r) => r.abort())
  const p = await ctx.newPage()
  const t0 = Date.now()
  try {
    await p.goto(`https://shapeof.world/${id}?capture=1&ghost=0`, { waitUntil: 'load', timeout: 90000 })
    await p.waitForTimeout(10000)
    await p.addStyleTag({ content: '.experience-header{opacity:0!important}' })
    const info = await p.evaluate(() => {
      const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && +cs.opacity > 0.05 }
      const roots = [document]; for (const h of document.querySelectorAll('*')) if (h.shadowRoot) roots.push(h.shadowRoot)
      for (const f of document.querySelectorAll('iframe')) { try { if (f.contentDocument) roots.push(f.contentDocument) } catch {} }
      const btn = [], rng = [], all = []
      for (const r of roots) {
        for (const el of r.querySelectorAll('button,[role=button],[role=tab],summary')) { const t = ((el.textContent || '').trim() || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').slice(0, 40); all.push(t); if (vis(el)) btn.push(t) }
        for (const el of r.querySelectorAll('input[type=range]')) rng.push({ cls: el.className, id: el.id, aria: el.getAttribute('aria-label'), min: el.min, max: el.max, value: el.value, vis: vis(el) })
      }
      const stage = document.querySelector('.experience-stage')
      return { visibleButtons: [...new Set(btn)].slice(0, 60), hiddenButtons: [...new Set(all)].filter((x) => !btn.includes(x)).slice(0, 40), ranges: rng.slice(0, 12),
        canvases: document.querySelectorAll('canvas').length, iframes: [...document.querySelectorAll('iframe')].map((f) => f.className + ' ' + f.src.slice(0, 80)),
        stageClasses: stage ? [...stage.querySelectorAll(':scope > *')].map((e) => e.tagName.toLowerCase() + '.' + String(e.className).split(' ').join('.')).slice(0, 6) : null,
        globals: Object.keys(window).filter((k) => /^__/.test(k)).slice(0, 20) }
    })
    await p.screenshot({ path: resolve(media, 'stills', `inv-${id}.jpg`), quality: 70, type: 'jpeg' })
    inv[id] = { ...info, loadSec: (Date.now() - t0) / 1000 }
    console.log(`[inv] ${id} ok ${info.visibleButtons.length} btns`)
  } catch (e) { inv[id] = { error: e.message }; console.log(`[inv] ${id} FAIL ${e.message}`) }
  await ctx.close()
}
const queue = [...ids]
await Promise.all([0, 1, 2].map(async () => { while (queue.length) await one(queue.shift()) }))
writeFileSync(outFile, JSON.stringify(inv, null, 1))
await b.close()
console.log('[inv] done', Object.keys(inv).length)
