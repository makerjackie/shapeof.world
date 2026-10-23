#!/usr/bin/env node
/**
 * site-trailer capture tool — records clean, high-bitrate footage of live
 * shapeof.world worlds for the trailer edit.
 *
 *   node films/site-trailer/tools/capture.mjs --only black-hole-ring,fluid-stir
 *   node films/site-trailer/tools/capture.mjs --world galaxy-collision
 *   node films/site-trailer/tools/capture.mjs --all --skip-existing
 *   node films/site-trailer/tools/capture.mjs --list
 *
 * Flags
 *   --shots <file>       shot list (default: films/site-trailer/shots.json)
 *   --only a,b,c         shot ids to record (or --world <id> | --all)
 *   --out <dir>          media root (default: /Volumes/DevSSD/Projects/code/shapeof.world-reports/site-trailer)
 *   --base <url>         site origin (default https://shapeof.world, the live site)
 *   --size 1920x1080     output size (1080x1920 for vertical; shot.size overrides)
 *   --fps 60             output frame rate (shot.fps overrides)
 *   --ss 1|2             supersample: render at DPR n, lanczos-downscale (default 1)
 *   --mode step|realtime step (default) = deterministic virtual clock: rAF/timers/performance.now are
 *                        frozen and advanced exactly 1/fps per frame, then the frame is grabbed via
 *                        CDP Page.captureScreenshot -> perfectly smooth, no dropped frames, any render cost.
 *                        realtime = CDP Page.startScreencast at wall-clock speed, resampled to CFR
 *                        (fallback for worlds that misbehave under a fake clock: <video>, workers, CSS-only motion).
 *   Browser: system Google Chrome, HEADED (a window opens on the Mac mini's screen), ANGLE/Metal on the M4 GPU.
 *   --headless           Chrome new-headless instead (same GPU, but leaves an unpainted 87 px strip at the
 *                        bottom of a 1080p viewport on this Mac — debug only)
 *   --swiftshader        software GL (debug only: ~6 fps, washed-out)
 *   --suffix <s>         append to output file names (A/B tests)
 *   --duration <s>       override every shot's duration (quick validation: --fps 15 --duration 2 --suffix .pre)
 *   --prores             also write ProRes 422 HQ .mov
 *   --skip-existing      skip shots whose mp4 already exists
 *   --keep-going         do not stop the batch on a failed shot (implied by --all / --world)
 *
 * Output per shot in <out>/footage/: <id>.mp4 (H.264 High, CRF 14, yuv420p, faststart),
 * <id>.jpg (poster = middle frame), <id>.sheet.jpg (6-frame contact sheet), <id>.json (meta, luma, errors).
 *
 * Shot schema (shots.json -> { shots: [...] }):
 *   id, worldId, url? (path or absolute; default /<worldId>), query? {k:v|null} (merged over
 *   {capture:1, ghost:0}; capture=1 makes the shell hide its overlays), lang? 'zh'|'en',
 *   settle? ms after the stage is ready (default 5000), steps? [...setup...], duration? s (default 5),
 *   warmup? s stepped before frame 0 (default 0.4), actions? [...timeline during recording...],
 *   hide? [css selectors to hide], css? extra css, init? js run before the page's own scripts, mode?, fps?, size?, ss?,
 *   crop? [x,y,w,h] viewport fractions (keep 16:9; pair with ss:2 for a sharp punch-in),
 *   canvasOnly? true = hide every non-canvas element in page, iframes and shadow roots (clean plate;
 *   not for DOM/SVG worlds), shadowCss? css injected into shadow roots + iframes, why, label {zh, en}
 * Setup steps (real time, before recording):
 *   {wait: ms} {click: sel} {clickText: "regex"} {key: "Space"} {press: {key, ms}}
 *   {drag: {from:[x,y], to:[x,y], ms?, steps?, button?}} {move: [x,y]} {wheel: {at:[x,y], dy, n?}}
 *   {range: {sel, value}} {eval: "js"} {waitFor: sel} {frame: "iframe sel"} (scope later steps/evals to it)
 *   Coordinates <= 1 are viewport fractions, > 1 are CSS pixels.
 * Actions (during recording; seconds from frame 0; interpolated per frame):
 *   {at, type:'drag', from, to, dur, button?, ease?:'inout'|'linear'}   orbit / stir
 *   {at, type:'move', from, to, dur}                                    hover sweep
 *   {at, type:'click', pos} {at, type:'clickText', text} {at, type:'key', key}
 *   {at, type:'keyhold', key, dur} {at, type:'wheel', pos, dy, dur} {at, type:'eval', js}
 *   {at, type:'range', sel, from, to, dur, step?, ease?}                 sweep a slider (zoom, timeline...)
 * Selectors: input[aria-label="..."] works well for the world sliders (see inventory.json).
 */
import { createRequire } from 'node:module'
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

const require = createRequire('/Volumes/DevSSD/Projects/code/shapeof.world/package.json')
const { chromium } = require('playwright')
const FFMPEG = existsSync('/opt/homebrew/bin/ffmpeg') ? '/opt/homebrew/bin/ffmpeg' : 'ffmpeg'
const here = dirname(new URL(import.meta.url).pathname)

// ---------- args ----------
const argv = process.argv.slice(2)
const flag = (n) => argv.includes(`--${n}`)
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d }
const shotsFile = resolve(opt('shots', resolve(here, '../shots.json')))
const outRoot = resolve(opt('out', '/Volumes/DevSSD/Projects/code/shapeof.world-reports/site-trailer'))
const base = opt('base', 'https://shapeof.world').replace(/\/$/, '')
const defFps = Number(opt('fps', 60))
const defSs = Number(opt('ss', 1))
const defMode = opt('mode', 'step')
const defSize = opt('size', '1920x1080')
const suffix = opt('suffix', '')
const footDir = resolve(outRoot, 'footage')
mkdirSync(footDir, { recursive: true })

const doc = JSON.parse(readFileSync(shotsFile, 'utf8'))
const allShots = doc.shots ?? doc
if (flag('list')) {
  for (const s of allShots) console.log(`${s.id.padEnd(30)} ${s.worldId.padEnd(24)} ${String(s.duration ?? 5).padStart(3)}s  ${s.label?.en ?? ''}`)
  process.exit(0)
}
let shots = allShots
const only = opt('only'); const world = opt('world')
if (only) shots = only.split(',').map((id) => { const s = allShots.find((x) => x.id === id.trim()); if (!s) throw new Error(`unknown shot ${id}`); return s })
else if (world) shots = allShots.filter((s) => s.worldId === world)
else if (!flag('all')) { console.error('pass --only a,b | --world id | --all | --list'); process.exit(1) }
if (flag('skip-existing')) shots = shots.filter((s) => !existsSync(resolve(footDir, `${s.id}${suffix}.mp4`)))
const keepGoing = flag('keep-going') || flag('all') || !!world
console.log(`[capture] ${shots.length} shot(s) -> ${footDir}`)

// ---------- browser ----------
const launchOpts = (headed) => flag('swiftshader')
  ? { headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--mute-audio'] }
  : {
      // System Google Chrome. Its new-headless mode keeps the real Metal GPU (ANGLE Metal, Apple M4,
      // 60 fps rAF); Playwright's bundled headless shell falls back to SwiftShader (~6 fps, blurry).
      channel: 'chrome',
      headless: !headed,
      args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization',
        '--mute-audio', '--autoplay-policy=no-user-gesture-required', '--hide-scrollbars',
        '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
        ...(headed ? ['--window-size=2000,2000'] : [])],
    }
// Headed is the default. Chrome new-headless on this Mac has a 1920x993 window surface: the bottom
// 87 px of a 1920x1080 viewport are never painted (white/black strip in screenshots) and screencast
// frames come out 1920x993. A headed window on the 2560x1440 display paints the full viewport at any DPR.
const browsers = {}
const getBrowser = async (headed) => (browsers[headed] ??= await chromium.launch(launchOpts(headed)))

const BASE_CSS = `
  .experience-header, .experience-header-actions, .guide-tour, .ghost-hint, .next-world,
  [data-experience-overlay="true"], .experience-chrome, .experience-freebar, .moment-card,
  .site-bgm, .cookie-banner { opacity: 0 !important; pointer-events: none !important; }
  html, body, * { cursor: none !important; }
  ::-webkit-scrollbar { display: none !important; }
`
const cssFor = (s) => BASE_CSS + (s.hide?.length ? `${s.hide.join(',')}{opacity:0!important;pointer-events:none!important}` : '') + (s.css ?? '')

const jpegDim = (buf) => { let i = 2; while (i + 9 < buf.length) { if (buf[i] === 0xff && buf[i + 1] >= 0xc0 && buf[i + 1] <= 0xc2) return `${buf.readUInt16BE(i + 7)}x${buf.readUInt16BE(i + 5)}`; i += 2 + buf.readUInt16BE(i + 2) } return '?' }
const px = (v, total) => (v <= 1 ? v * total : v)
const ease = (t, kind) => (kind === 'linear' ? t : t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function shotUrl(s) {
  const raw = s.url ?? `/${s.worldId}`
  const u = new URL(/^https?:/.test(raw) ? raw : `${base}${s.lang === 'en' && !raw.startsWith('/en') ? '/en' : ''}${raw}`)
  const q = { capture: 1, ghost: 0, ...(s.query ?? {}) }
  for (const [k, v] of Object.entries(q)) if (v === null) u.searchParams.delete(k); else u.searchParams.set(k, String(v))
  return u.toString()
}

async function clickText(scope, text) {
  return scope.evaluate((src) => {
    const re = new RegExp(src, 'i')
    const roots = [document]
    for (const host of document.querySelectorAll('*')) if (host.shadowRoot) roots.push(host.shadowRoot)
    for (const root of roots) for (const el of root.querySelectorAll('button, [role="button"], a, label, [role="tab"], [role="radio"], summary')) {
      const t = (el.textContent || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim()
      if (re.test(t) || re.test(t.replace(/\s/g, '')) || re.test(el.getAttribute('aria-label') || '')) { el.click(); return t || 'aria' }
    }
    return null
  }, text)
}

// sel: css selector, searched in the document and one level of open shadow roots.
async function setRange(scope, sel, value) {
  return scope.evaluate(({ sel, value }) => {
    let el = document.querySelector(sel)
    if (!el) for (const h of document.querySelectorAll('*')) if (h.shadowRoot && (el = h.shadowRoot.querySelector(sel))) break
    if (!(el instanceof HTMLInputElement)) return false
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(value))
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  }, { sel, value })
}

async function runStep(page, scopeRef, st, W, H) {
  const scope = scopeRef.frame ?? page
  if (st.wait != null) return sleep(st.wait)
  if (st.frame) { const el = await page.waitForSelector(st.frame, { timeout: 60000 }); scopeRef.frame = await el.contentFrame(); return }
  if (st.click) return scope.locator(st.click).first().click({ timeout: 15000, force: true })
  if (st.clickText) { const r = await clickText(scope, st.clickText); if (!r) console.warn(`  ! clickText not found: ${st.clickText}`); return sleep(250) }
  if (st.key) return page.keyboard.press(st.key)
  if (st.press) { await page.keyboard.down(st.press.key); await sleep(st.press.ms ?? 500); return page.keyboard.up(st.press.key) }
  if (st.move) return page.mouse.move(px(st.move[0], W), px(st.move[1], H))
  if (st.drag) {
    const { from, to, ms = 800, steps = 40, button = 'left' } = st.drag
    await page.mouse.move(px(from[0], W), px(from[1], H)); await page.mouse.down({ button })
    for (let i = 1; i <= steps; i++) { const t = ease(i / steps); await page.mouse.move(px(from[0] + (to[0] - from[0]) * t, W), px(from[1] + (to[1] - from[1]) * t, H)); await sleep(ms / steps) }
    return page.mouse.up({ button })
  }
  if (st.wheel) { const { at = [0.5, 0.5], dy = 100, n = 1 } = st.wheel; await page.mouse.move(px(at[0], W), px(at[1], H)); for (let i = 0; i < n; i++) { await page.mouse.wheel(0, dy); await sleep(60) } return }
  if (st.range) { const ok = await setRange(scope, st.range.sel, st.range.value); if (!ok) console.warn(`  ! range not found: ${st.range.sel}`); return }
  if (st.eval) return scope.evaluate(st.eval)
  if (st.waitFor) return scope.waitForSelector(st.waitFor, { timeout: 60000 })
  console.warn('  ! unknown step', JSON.stringify(st))
}

// Per-frame action driver, called with t (s) before each frame is advanced.
function makeActionDriver(page, scopeRef, actions, W, H) {
  const state = actions.map(() => ({ started: false, done: false, sent: 0 }))
  return async (t) => {
    for (let i = 0; i < actions.length; i++) {
      const a = actions[i]; const s = state[i]; if (s.done) continue
      const at = a.at ?? 0; if (t < at) continue
      const dur = a.dur ?? 0; const k = dur > 0 ? Math.min(1, (t - at) / dur) : 1
      const scope = scopeRef.frame ?? page
      const lerp = (f, to) => { const e = ease(k, a.ease); return [px(f[0] + (to[0] - f[0]) * e, W), px(f[1] + (to[1] - f[1]) * e, H)] }
      if (a.type === 'drag' || a.type === 'move') {
        if (!s.started) { await page.mouse.move(px(a.from[0], W), px(a.from[1], H)); if (a.type === 'drag') await page.mouse.down({ button: a.button ?? 'left' }); s.started = true }
        const [x, y] = lerp(a.from, a.to); await page.mouse.move(x, y)
        if (k >= 1) { if (a.type === 'drag') await page.mouse.up({ button: a.button ?? 'left' }); s.done = true }
      } else if (a.type === 'wheel') {
        if (!s.started) { await page.mouse.move(px(a.pos?.[0] ?? 0.5, W), px(a.pos?.[1] ?? 0.5, H)); s.started = true }
        const target = (a.dy ?? 300) * ease(k, a.ease ?? 'linear'); const d = target - s.sent
        if (Math.abs(d) >= 1) { await page.mouse.wheel(0, d); s.sent = target }
        if (k >= 1) s.done = true
      } else if (a.type === 'range') {
        // sweep an <input type=range> from -> to (zoom level, timeline, explode, harmonics ...)
        const v = a.from + (a.to - a.from) * ease(k, a.ease ?? 'linear')
        await setRange(scope, a.sel, a.step ? Math.round(v / a.step) * a.step : v)
        if (k >= 1) s.done = true
      } else if (a.type === 'keyhold') {
        if (!s.started) { await page.keyboard.down(a.key); s.started = true }
        if (k >= 1) { await page.keyboard.up(a.key); s.done = true }
      } else {
        if (a.type === 'click') await page.mouse.click(px(a.pos[0], W), px(a.pos[1], H))
        else if (a.type === 'clickText') await clickText(scope, a.text)
        else if (a.type === 'key') await page.keyboard.press(a.key)
        else if (a.type === 'eval') await scope.evaluate(a.js)
        s.done = true
      }
    }
  }
}

function startEncoder(outMp4, fps, W, H, ss, crop) {
  // crop = [x, y, w, h] as viewport fractions; applied on the DPR-scaled frame, so with ss:2 a
  // half-size crop still has full 1080p native detail ("punch-in" on small subjects).
  const c = crop ? `crop=${Math.round(crop[2] * W * ss)}:${Math.round(crop[3] * H * ss)}:${Math.round(crop[0] * W * ss)}:${Math.round(crop[1] * H * ss)},` : ''
  const args = ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(fps), '-i', '-',
    '-vf', `${c}scale=${W}:${H}:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '14',
    '-profile:v', 'high', '-tune', 'film', '-g', String(fps), '-movflags', '+faststart', '-r', String(fps), outMp4]
  const p = spawn(FFMPEG, args, { stdio: ['pipe', 'inherit', 'inherit'] })
  let closed = null
  const done = new Promise((res, rej) => p.on('close', (c) => { closed = c; c === 0 ? res() : rej(new Error(`ffmpeg exit ${c}`)) }))
  done.catch(() => {})
  p.stdin.on('error', () => {}) // EPIPE when ffmpeg dies; surfaced via `closed` below
  return {
    write: (buf) => {
      if (closed !== null) return Promise.reject(new Error(`ffmpeg exited early (${closed})`))
      return new Promise((r) => { if (p.stdin.write(buf)) r(); else { p.stdin.once('drain', r); p.once('close', r) } })
    },
    end: async () => { if (closed === null) p.stdin.end(); await done },
  }
}

async function recordShot(s) {
  const fps = s.fps ?? defFps
  const ss = s.ss ?? defSs
  const mode = s.mode ?? defMode
  const [W, H] = (s.size ?? defSize).split('x').map(Number)
  const duration = Number(opt('duration', 0)) || s.duration || 5
  const url = shotUrl(s)
  const name = `${s.id}${suffix}`
  const outMp4 = resolve(footDir, `${name}.mp4`)
  const meta = { id: s.id, worldId: s.worldId, url, fps, ss, mode, size: `${W}x${H}`, duration, errors: [], startedAt: new Date().toISOString() }
  console.log(`\n[shot] ${name}  ${url}  (${mode}, ${fps}fps, ${duration}s, ss${ss})`)

  const headed = !flag('headless') && !flag('swiftshader')
  meta.headed = headed
  const browser = await getBrowser(headed)
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: ss, locale: s.lang === 'en' ? 'en-US' : 'zh-CN', colorScheme: 'dark' })
  await ctx.addInitScript((id) => {
    try {
      localStorage.setItem(`oneworld.guide.${id}.v1`, 'done'); localStorage.setItem(`oneworld.ghost.${id}.v1`, 'done')
      localStorage.setItem('oneworld.site-bgm.muted.v1', '1')
    } catch {}
  }, s.worldId)
  if (s.init) await ctx.addInitScript(s.init)
  await ctx.route('https://music-cdn.shapeof.world/**', (r) => r.abort())
  await ctx.route(/googletagmanager|google-analytics|plausible\.io|cloudflareinsights/, (r) => r.abort())
  if (mode === 'step') await ctx.clock.install()
  const page = await ctx.newPage()
  page.on('pageerror', (e) => meta.errors.push(`page: ${e.message}`.slice(0, 300)))
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|music-cdn/.test(m.text())) meta.errors.push(`console: ${m.text()}`.slice(0, 300)) })
  const t0 = Date.now()
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 90000 })
    await page.addStyleTag({ content: cssFor(s) })
    await page.waitForFunction(() => {
      const stage = document.querySelector('.experience-stage')
      if (!stage || stage.querySelector('.canvas-loading, .renderer-error')) return false
      return Boolean(stage.querySelector('canvas, iframe, svg, model-viewer, video, .oss-experience') || stage.querySelector('.scoped-world-stage')?.shadowRoot?.querySelector('canvas'))
    }, undefined, { timeout: 90000 }).catch(() => meta.errors.push('stage-ready timeout'))
    await page.evaluate(() => { const b = document.querySelector('.guide-skip, .guide-close, .guide-stage-exit'); if (b instanceof HTMLElement) b.click() })
    await sleep(s.settle ?? 5000)
    const scopeRef = { frame: null }
    for (const st of s.steps ?? []) await runStep(page, scopeRef, st, W, H)
    await page.addStyleTag({ content: cssFor(s) }) // again: some worlds mount chrome late
    if (s.canvasOnly || s.shadowCss) {
      // Clean plate for worlds whose own UI lives in a shadow root / iframe (starry-night, cafe-terrace,
      // black-hole): visibility is inherited but overridable, so everything hides except <canvas>.
      const css = (s.canvasOnly ? '*{visibility:hidden!important}canvas,canvas *,iframe{visibility:visible!important}' : '') + (s.shadowCss ?? '')
      for (const f of page.frames()) await f.evaluate((css) => {
        const add = (root) => { const st = document.createElement('style'); st.textContent = css; (root.head ?? root).appendChild(st) }
        if (window !== window.top) add(document)
        for (const h of document.querySelectorAll('*')) if (h.shadowRoot) add(h.shadowRoot)
        if (window === window.top && css.includes('visibility:hidden')) add(document)
      }, css).catch(() => {})
    }
    await sleep(300)
    meta.renderer = await page.evaluate(() => { const c = document.createElement('canvas').getContext('webgl'); const e = c?.getExtension('WEBGL_debug_renderer_info'); return e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL) : null })

    const cdp = await ctx.newCDPSession(page)
    const enc = startEncoder(outMp4, fps, W, H, ss, s.crop)
    const drive = makeActionDriver(page, scopeRef, s.actions ?? [], W, H)
    const total = Math.round(duration * fps)
    const rec0 = Date.now()
    try {
      if (mode === 'step') {
        const nowMs = await page.evaluate(() => Date.now())
        await page.clock.pauseAt(nowMs + 20)
        let simMs = 0
        const advance = async (targetMs) => { const d = Math.round(targetMs) - simMs; if (d > 0) { await page.clock.runFor(d); simMs += d } }
        const warm = Math.round((s.warmup ?? 0.4) * fps)
        for (let i = 0; i < warm; i++) await advance(simMs + 1000 / fps)
        const startMs = simMs
        for (let i = 0; i < total; i++) {
          await drive(i / fps)
          await advance(startMs + ((i + 1) * 1000) / fps)
          // Explicit clip: without it, new-headless Chrome returns the raw window surface (1920x993 here),
          // ignoring the emulated viewport and DPR. clip.scale is absolute (CSS px -> output px).
          const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 94, optimizeForSpeed: true, clip: { x: 0, y: 0, width: W, height: H, scale: ss } })
          const buf = Buffer.from(data, 'base64')
          if (i === 0) { meta.sourceSize = jpegDim(buf); if (meta.sourceSize !== `${W * ss}x${H * ss}`) throw new Error(`frame is ${meta.sourceSize}, expected ${W * ss}x${H * ss}`) }
          await enc.write(buf)
        }
      } else {
        const frames = []
        cdp.on('Page.screencastFrame', (f) => { frames.push({ t: f.metadata.timestamp, data: f.data }); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}) })
        await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 94, maxWidth: W * ss, maxHeight: H * ss, everyNthFrame: 1 })
        const start = Date.now()
        while (Date.now() - start < duration * 1000 + 300) { await drive((Date.now() - start) / 1000); await sleep(8) }
        await cdp.send('Page.stopScreencast')
        if (!frames.length) throw new Error('no screencast frames')
        const t0f = frames[0].t; let j = 0
        for (let i = 0; i < total; i++) { const t = t0f + i / fps; while (j + 1 < frames.length && frames[j + 1].t <= t) j++; await enc.write(Buffer.from(frames[j].data, 'base64')) }
        meta.sourceSize = jpegDim(Buffer.from(frames[0].data, 'base64'))
        if (meta.sourceSize !== `${W * ss}x${H * ss}`) meta.errors.push(`WARN screencast frame ${meta.sourceSize}, expected ${W * ss}x${H * ss} (rescaled)`)
        meta.sourceFrames = frames.length; meta.sourceFps = +(frames.length / ((frames.at(-1).t - t0f) || 1)).toFixed(1)
      }
    } finally { await enc.end() }
    meta.recordSeconds = +((Date.now() - rec0) / 1000).toFixed(1)
    meta.frames = total
  } finally {
    await ctx.close().catch(() => {})
  }
  // poster, contact sheet, luma sanity check
  spawnSync(FFMPEG, ['-loglevel', 'error', '-y', '-ss', (duration / 2).toFixed(2), '-i', outMp4, '-frames:v', '1', '-q:v', '2', resolve(footDir, `${name}.jpg`)])
  const every = Math.max(1, Math.floor((duration * fps) / 6))
  spawnSync(FFMPEG, ['-loglevel', 'error', '-y', '-i', outMp4, '-vf', `select='not(mod(n\\,${every}))',scale=480:-2,tile=3x2:padding=4`, '-frames:v', '1', '-q:v', '4', resolve(footDir, `${name}.sheet.jpg`)])
  const st = spawnSync(FFMPEG, ['-hide_banner', '-i', outMp4, '-vf', 'fps=4,signalstats,metadata=print:key=lavfi.signalstats.YAVG', '-f', 'null', '-'], { encoding: 'utf8' })
  const ys = [...(st.stderr ?? '').matchAll(/YAVG=([\d.]+)/g)].map((m) => Number(m[1]))
  meta.lumaAvg = ys.length ? +(ys.reduce((a, b) => a + b, 0) / ys.length).toFixed(1) : null
  if (meta.lumaAvg != null && meta.lumaAvg < 6) meta.errors.push('WARN nearly black footage')
  meta.totalSeconds = +((Date.now() - t0) / 1000).toFixed(1)
  writeFileSync(resolve(footDir, `${name}.json`), JSON.stringify(meta, null, 2))
  if (flag('prores')) spawnSync(FFMPEG, ['-loglevel', 'error', '-y', '-i', outMp4, '-c:v', 'prores_ks', '-profile:v', '3', '-pix_fmt', 'yuv422p10le', resolve(footDir, `${name}.mov`)])
  console.log(`[done] ${name}  ${meta.totalSeconds}s total, ${meta.recordSeconds}s rec, luma ${meta.lumaAvg}, ${meta.renderer ?? 'no-gl'}${meta.errors.length ? `, ${meta.errors.length} error(s): ${meta.errors.slice(0, 2).join(' | ')}` : ''}`)
}

const failed = []
for (const s of shots) {
  try { await recordShot(s) } catch (e) {
    failed.push(s.id); console.error(`[fail] ${s.id}: ${e.message}`)
    try { writeFileSync(resolve(footDir, `${s.id}${suffix}.json`), JSON.stringify({ id: s.id, failed: true, error: String(e.stack ?? e) }, null, 2)) } catch {}
    if (!keepGoing) break
  }
}
for (const b of Object.values(browsers)) await b.close().catch(() => {})
console.log(`\n[capture] finished: ${shots.length - failed.length} ok, ${failed.length} failed${failed.length ? ` (${failed.join(', ')})` : ''}`)
process.exit(failed.length ? 1 : 0)
