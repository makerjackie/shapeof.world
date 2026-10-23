#!/usr/bin/env node
/**
 * Quick framing probe: open live worlds in real time, run setup steps, and grab screenshots so a shot can be
 * chosen before it is recorded with capture.mjs. Same step syntax as capture.mjs, plus {css: "..."} and {dump: "js expression"} (prints the result).
 *
 *   node films/site-trailer/tools/probe.mjs probes.json <outDir> [--only a,b] [--ss 1]
 *
 * probes.json: [{ name, worldId, url?, query?, settle?, init? (js run before page scripts), chrome? (keep site UI), shots: [{ label, steps: [...] }] }]
 * Each world's shots run in order on one page (steps accumulate). Writes <outDir>/<name>-<i>.jpg
 * and <outDir>/<name>-buttons.txt (every button label and slider, to discover modes and cameras).
 */
import { createRequire } from 'node:module'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const require = createRequire('/Volumes/DevSSD/Projects/code/shapeof.world/package.json')
const { chromium } = require('playwright')
const argv = process.argv.slice(2)
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d }
const probes = JSON.parse(readFileSync(argv[0], 'utf8'))
const out = resolve(argv[1]); mkdirSync(out, { recursive: true })
const only = opt('only')?.split(',')
const ss = Number(opt('ss', 1))
const W = 1920, H = 1080
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const px = (v, t) => (v <= 1 ? v * t : v)
const CSS = `.experience-header, .experience-header-actions, .guide-tour, .ghost-hint, .next-world,
  [data-experience-overlay="true"], .experience-chrome, .experience-freebar, .moment-card, .site-bgm, .cookie-banner
  { opacity: 0 !important; pointer-events: none !important; } html, body, * { cursor: none !important; }`

const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio', '--hide-scrollbars', '--window-size=2000,2000', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] })

async function clickText(scope, text) {
  return scope.evaluate((src) => {
    const re = new RegExp(src, 'i'); const roots = [document]
    for (const h of document.querySelectorAll('*')) if (h.shadowRoot) roots.push(h.shadowRoot)
    for (const root of roots) for (const el of root.querySelectorAll('button, [role="button"], a, label, [role="tab"], [role="radio"], summary')) {
      const t = (el.textContent || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim()
      if (re.test(t) || re.test(t.replace(/\s/g, '')) || re.test(el.getAttribute('aria-label') || '')) { el.click(); return t || 'aria' }
    }
    return null
  }, text)
}
async function step(page, ref, st) {
  const scope = ref.frame ?? page
  if (st.wait != null) return sleep(st.wait)
  if (st.frame) { const el = await page.waitForSelector(st.frame, { timeout: 60000 }); ref.frame = await el.contentFrame(); return }
  if (st.click) return scope.locator(st.click).first().click({ timeout: 15000, force: true }).catch(() => console.warn('  ! click', st.click))
  if (st.clickText) { const r = await clickText(scope, st.clickText); if (!r) console.warn(`  ! clickText not found: ${st.clickText}`); return sleep(250) }
  if (st.key) return page.keyboard.press(st.key)
  if (st.press) { await page.keyboard.down(st.press.key); await sleep(st.press.ms ?? 500); return page.keyboard.up(st.press.key) }
  if (st.move) return page.mouse.move(px(st.move[0], W), px(st.move[1], H))
  if (st.drag) {
    const { from, to, ms = 800, steps = 40, button = 'left' } = st.drag
    await page.mouse.move(px(from[0], W), px(from[1], H)); await page.mouse.down({ button })
    for (let i = 1; i <= steps; i++) { const t = i / steps; await page.mouse.move(px(from[0] + (to[0] - from[0]) * t, W), px(from[1] + (to[1] - from[1]) * t, H)); await sleep(ms / steps) }
    return page.mouse.up({ button })
  }
  if (st.wheel) { const { at = [0.5, 0.5], dy = 100, n = 1 } = st.wheel; await page.mouse.move(px(at[0], W), px(at[1], H)); for (let i = 0; i < n; i++) { await page.mouse.wheel(0, dy); await sleep(60) } return }
  if (st.range) return scope.evaluate(({ sel, value }) => {
    let el = document.querySelector(sel)
    if (!el) for (const h of document.querySelectorAll('*')) if (h.shadowRoot && (el = h.shadowRoot.querySelector(sel))) break
    if (!(el instanceof HTMLInputElement)) return false
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(value))
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return true
  }, st.range)
  if (st.eval) return scope.evaluate(st.eval).catch((e) => console.warn('  ! eval', e.message))
  if (st.css) return page.addStyleTag({ content: st.css })
  if (st.dump) return console.log('  dump:', JSON.stringify(await scope.evaluate(st.dump)))
}

for (const p of probes) {
  if (only && !only.includes(p.name)) continue
  const t0 = Date.now()
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: ss, locale: p.lang === 'en' ? 'en-US' : 'zh-CN', colorScheme: 'dark' })
  await ctx.addInitScript((id) => { try { localStorage.setItem(`oneworld.guide.${id}.v1`, 'done'); localStorage.setItem(`oneworld.ghost.${id}.v1`, 'done'); localStorage.setItem('oneworld.site-bgm.muted.v1', '1') } catch {} }, p.worldId)
  if (p.init) await ctx.addInitScript(p.init)
  await ctx.route('https://music-cdn.shapeof.world/**', (r) => r.abort())
  const page = await ctx.newPage()
  try {
    const u = new URL(p.url ?? `https://shapeof.world/${p.worldId}`)
    for (const [k, v] of Object.entries({ capture: 1, ghost: 0, ...(p.query ?? {}) })) if (v === null) u.searchParams.delete(k); else u.searchParams.set(k, String(v))
    await page.goto(u.toString(), { waitUntil: 'load', timeout: 90000 })
    if (!p.chrome) await page.addStyleTag({ content: CSS })
    await page.evaluate(() => { const b = document.querySelector('.guide-skip, .guide-close, .guide-stage-exit'); if (b instanceof HTMLElement) b.click() })
    await sleep(p.settle ?? 6000)
    const labels = await page.evaluate(() => {
      const roots = [document]; for (const h of document.querySelectorAll('*')) if (h.shadowRoot) roots.push(h.shadowRoot)
      const out = []; for (const r of roots) for (const el of r.querySelectorAll('button, [role="button"], [role="tab"], input[type=range]')) out.push(el.tagName === 'INPUT' ? `[range ${el.getAttribute('aria-label')} ${el.min}-${el.max}=${el.value}]` : (el.textContent || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim())
      return out
    })
    writeFileSync(resolve(out, `${p.name}-buttons.txt`), labels.join('\n'))
    const ref = { frame: null }
    let i = 0
    for (const s of p.shots ?? [{ label: 'default' }]) {
      for (const st of s.steps ?? []) await step(page, ref, st)
      if (!p.chrome) await page.addStyleTag({ content: CSS })
      await page.screenshot({ path: resolve(out, `${p.name}-${i}.jpg`), type: 'jpeg', quality: 70 })
      console.log(`  ${p.name}-${i}: ${s.label}`)
      i++
    }
  } catch (e) { console.error(`[fail] ${p.name}: ${e.message}`) }
  await ctx.close().catch(() => {})
  console.log(`[probe] ${p.name} ${((Date.now() - t0) / 1000).toFixed(0)}s`)
}
await browser.close()
