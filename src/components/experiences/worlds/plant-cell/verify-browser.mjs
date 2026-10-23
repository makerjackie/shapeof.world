// Run after starting this worktree on 3241:
// node src/components/experiences/worlds/plant-cell/verify-browser.mjs <output-directory>
// Uses a new headed Chrome instance and closes only that instance. No server lifecycle changes.
import { chromium } from 'playwright'
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const base = 'http://127.0.0.1:3241'
if (!process.argv[2]) throw new Error('Pass an output directory for private screenshots and verification logs.')
const output = resolve(process.argv[2])
const shots = join(output, 'shots')
const reportPath = join(output, 'logs/round-1.browser.json')
const start = Date.now()
const report = {
  startedAt: new Date().toISOString(), base,
  browser: { channel: 'chrome', headed: true, dedicatedInstance: true },
  screenshots: [], performance: {}, checks: {}, pageErrors: [], httpErrors: [], requestFailures: [], consoleErrors: [],
  limitations: [
    'Desktop and mobile viewport tests run in desktop Chrome; they are not iPhone device evidence.',
    'Frame timing measures browser requestAnimationFrame intervals for three seconds, not an external GPU profiler.',
    'Black-frame checks inspect the captured transition frames, not every frame in the zoom.',
    'Screenshot hashes include the animated scene and film grain; camera state is the primary rotation evidence.',
    'Streaming checks measure one instance’s endpoint displacement in local micrometres, not mean path speed or population-averaged velocity.',
  ],
}
let browser
let watchdog
let timedOut = false
await mkdir(shots, { recursive: true })
await mkdir(join(output, 'logs'), { recursive: true })

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const hash = (buffer) => createHash('sha256').update(buffer).digest('hex')

function observe(page, label) {
  page.on('pageerror', (error) => report.pageErrors.push({ page: label, url: page.url(), message: error.message }))
  page.on('response', (response) => {
    if (response.status() < 400) return
    const url = response.url()
    report.httpErrors.push({ page: label, url, status: response.status(), scope: url.includes('favicon') ? 'favicon' : url.startsWith(base) ? 'local' : 'external' })
  })
  page.on('requestfailed', (request) => report.requestFailures.push({ page: label, url: request.url(), error: request.failure()?.errorText }))
  page.on('console', (message) => {
    if (message.type() === 'error') report.consoleErrors.push({ page: label, text: message.text() })
  })
}

async function navigate(page, path, settle = 1200) {
  const response = await page.goto(base + path + (path.includes('?') ? '&ghost=0' : '?ghost=0'), { waitUntil: 'domcontentloaded', timeout: 20_000 })
  if (!response?.ok()) throw new Error(`Navigation failed: ${response?.status()} ${path}`)
  await page.locator('.pc-scene canvas[data-scale]').waitFor({ state: 'visible', timeout: 15_000 })
  await page.waitForFunction(() => Number.isFinite(Number(document.querySelector('.pc-scene canvas')?.dataset.scale)), undefined, { timeout: 8000 })
  await sleep(settle)
}

async function sceneState(page) {
  return page.evaluate(async () => {
    const canvas = document.querySelector('.pc-scene canvas')
    const lightButton = document.querySelector('.pc-light-switch')
    const lightSvg = lightButton?.querySelector('svg')
    const buttonStyle = lightButton ? getComputedStyle(lightButton) : null
    const result = {
      scale: Number(canvas?.dataset.scale), layer: document.querySelector('[data-plant-cell-layer]')?.dataset.plantCellLayer,
      heading: document.querySelector('.pc-heading h1')?.textContent,
      scaleBar: document.querySelector('.pc-scale-bar span')?.textContent,
      canvas: canvas ? { width: canvas.width, height: canvas.height, cssWidth: canvas.clientWidth, cssHeight: canvas.clientHeight } : null,
      lightButton: buttonStyle && lightSvg ? {
        padding: buttonStyle.padding, display: buttonStyle.display, color: buttonStyle.color,
        svgWidth: lightSvg.getBoundingClientRect().width, svgHeight: lightSvg.getBoundingClientRect().height,
        svgFlexShrink: getComputedStyle(lightSvg).flexShrink,
      } : null,
      camera: null, render: null, renderer: null, instances: null, probeError: null,
    }
    try {
      const urls = performance.getEntriesByType('resource').map((entry) => entry.name)
      const moduleUrl = urls.find((url) => /\/[^/]*react-three[_+]fiber[^/]*\.js(?:\?|$)/.test(url))
      if (!moduleUrl) throw new Error('Loaded react-three/fiber module URL was not found')
      const fiber = await import(moduleUrl)
      const root = fiber._roots?.get(canvas)
      const state = root?.store?.getState()
      if (!state) throw new Error('No fiber store found for this canvas')
      result.camera = { position: state.camera.position.toArray(), quaternion: state.camera.quaternion.toArray(), zoom: state.camera.zoom }
      const instance = (name) => {
        const mesh = state.scene.getObjectByName(name)
        if (!mesh?.instanceMatrix) return null
        const matrix = Array.from(mesh.instanceMatrix.array.slice(0, 16))
        return { name, index: 0, matrix, translationUm: matrix.slice(12, 15) }
      }
      result.instances = { mitochondrion: instance('streaming-mitochondria'), chloroplast: instance('wall-chloroplasts') }
      result.render = { ...state.gl.info.render }
      const gl = state.gl.getContext()
      const debug = gl.getExtension('WEBGL_debug_renderer_info')
      result.renderer = debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)
    } catch (error) { result.probeError = String(error) }
    return result
  })
}

async function pixelSummary(page, buffer) {
  return page.evaluate(async (base64) => {
    const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
    const image = await createImageBitmap(new Blob([bytes], { type: 'image/png' }))
    const canvas = new OffscreenCanvas(100, 100)
    const ctx = canvas.getContext('2d')
    // Centre crop avoids the instrument panel and browser viewport edges.
    ctx.drawImage(image, image.width * 0.25, image.height * 0.2, image.width * 0.5, image.height * 0.6, 0, 0, 100, 100)
    image.close()
    const pixels = ctx.getImageData(0, 0, 100, 100).data
    let luminance = 0, bright = 0, nonBlack = 0
    for (let i = 0; i < pixels.length; i += 4) {
      const value = (0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2]) / 255
      luminance += value
      if (value > 0.09) bright++
      if (value > 0.025) nonBlack++
    }
    return { meanLuminance: luminance / 10_000, brightFraction: bright / 10_000, nonBlackFraction: nonBlack / 10_000, blackFrameSuspected: luminance / 10_000 < 0.018 }
  }, buffer.toString('base64'))
}

async function capture(page, name) {
  const path = join(shots, `round-1-${name}.png`)
  const buffer = await page.screenshot({ path, type: 'png', timeout: 10_000 })
  const result = { name, path, sha256: hash(buffer), state: await sceneState(page), pixels: await pixelSummary(page, buffer) }
  report.screenshots.push(result)
  return result
}

async function frameTiming(page) {
  await page.bringToFront()
  return page.evaluate(() => new Promise((resolve) => {
    const intervals = []
    let first, previous
    const frame = (now) => {
      first ??= now
      if (previous !== undefined) intervals.push(now - previous)
      previous = now
      if (now - first < 3000) { requestAnimationFrame(frame); return }
      const sorted = [...intervals].sort((a, b) => a - b)
      const percentile = (p) => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))]
      resolve({ durationMs: now - first, frames: intervals.length, fps: intervals.length * 1000 / (now - first), medianMs: percentile(0.5), p95Ms: percentile(0.95), maxMs: Math.max(...intervals) })
    }
    requestAnimationFrame(frame)
  }))
}

async function instanceMotion(page, durationMs) {
  const before = await sceneState(page)
  const started = performance.now()
  await sleep(durationMs)
  const after = await sceneState(page)
  const elapsedWallSeconds = (performance.now() - started) / 1000
  const compare = (key) => {
    const a = before.instances?.[key], b = after.instances?.[key]
    if (!a || !b) return { available: false }
    return {
      available: true, instanceName: a.name, index: a.index,
      beforeTranslationUm: a.translationUm, afterTranslationUm: b.translationUm,
      displacementUm: Math.hypot(...a.translationUm.map((value, i) => b.translationUm[i] - value)),
      matrixMaxDelta: Math.max(...a.matrix.map((value, i) => Math.abs(b.matrix[i] - value))),
    }
  }
  return { requestedDurationMs: durationMs, elapsedWallSeconds, measurement: 'First instance endpoint displacement in local micrometres; not mean path speed.', mitochondrion: compare('mitochondrion'), chloroplast: compare('chloroplast') }
}

async function zoomSweep(page) {
  await navigate(page, '/plant-cell?scale=-0.62', 900)
  await page.mouse.move(800, 500)
  await page.evaluate(() => {
    const original = document.querySelector('.pc-scene canvas')
    window.__plantSweep = { running: true, frames: [], wheelEvents: [] }
    original.addEventListener('wheel', (event) => {
      window.__plantSweep.wheelEvents.push({ deltaY: event.deltaY, deltaMode: event.deltaMode, time: performance.now(), target: event.target.tagName })
    }, { capture: true, passive: true })
    const sample = (time) => {
      const state = window.__plantSweep
      if (!state.running) return
      const canvas = document.querySelector('.pc-scene canvas')
      state.frames.push({ time, scale: Number(canvas?.dataset.scale), sameCanvas: canvas === original })
      requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  })
  const crossings = [-2.8, -3.6, -5.1]
  const goals = [...new Set([...Array.from({ length: 30 }, (_, i) => Math.max(-6.5, -0.62 - (i + 1) * 0.2)), ...crossings, -6.5])].sort((a, b) => b - a)
  const result = report.checks.continuousZoom = { waypoints: [] }
  let expectedTarget = -0.62
  const waitForScale = (target) => page.waitForFunction((value) => Math.abs(Number(document.querySelector('.pc-scene canvas')?.dataset.scale) - value) < 0.025, target, { timeout: 2500 })
  try {
    // Headed Chrome on macOS can multiply Playwright wheel pixels (2× on the
    // reference display). Observe the actual DOM event before predicting scale.
    await page.mouse.wheel(0, -20)
    await page.waitForFunction(() => window.__plantSweep.wheelEvents.length > 0, undefined, { timeout: 2000 })
    const calibration = await page.evaluate(() => window.__plantSweep.wheelEvents.at(-1))
    const multiplier = calibration.deltaY / -20
    if (!(multiplier > 0) || calibration.deltaMode !== 0) throw new Error(`Unexpected wheel calibration: ${JSON.stringify(calibration)}`)
    expectedTarget += Math.max(-260, Math.min(260, calibration.deltaY)) * 0.00125
    result.calibration = { requestedDeltaY: -20, ...calibration, multiplier, expectedTarget }
    await waitForScale(expectedTarget)
    for (const goal of goals) {
      if (goal >= expectedTarget) continue
      const requestedDeltaY = (goal - expectedTarget) / 0.00125 / multiplier
      const countBefore = await page.evaluate(() => window.__plantSweep.wheelEvents.length)
      const waypoint = { goal, expectedBefore: expectedTarget, requestedDeltaY }
      result.waypoints.push(waypoint)
      await page.mouse.wheel(0, requestedDeltaY)
      await page.waitForFunction((count) => window.__plantSweep.wheelEvents.length > count, countBefore, { timeout: 1500 })
      const delivered = await page.evaluate((count) => window.__plantSweep.wheelEvents.slice(count), countBefore)
      waypoint.deliveredEvents = delivered
      expectedTarget = Math.max(-6.5, expectedTarget + delivered.reduce((sum, event) => sum + Math.max(-260, Math.min(260, event.deltaY)) * 0.00125, 0))
      waypoint.expectedTarget = expectedTarget
      await waitForScale(expectedTarget)
      waypoint.actual = Number(await page.locator('.pc-scene canvas').getAttribute('data-scale'))
      if (crossings.includes(goal)) await capture(page, `zoom-handoff-${String(Math.abs(goal)).replace('.', '-')}`)
    }
    // Let damping converge before the final molecular-edge view; no navigation
    // or canvas replacement is involved in this last capture.
    await page.waitForFunction(() => Number(document.querySelector('.pc-scene canvas')?.dataset.scale) <= -6.499, undefined, { timeout: 2000 })
    await capture(page, 'granum-edge')
  } catch (error) {
    result.failure = { message: String(error), goal: result.waypoints.at(-1)?.goal, expectedTarget, actual: Number(await page.locator('.pc-scene canvas').getAttribute('data-scale')) }
  } finally {
    const { frames, wheelEvents } = await page.evaluate(() => { window.__plantSweep.running = false; return window.__plantSweep })
    const steps = frames.slice(1).map((frame, i) => frame.scale - frames[i].scale)
    Object.assign(result, {
      frames, wheelEvents, endScale: frames.at(-1)?.scale,
      sameCanvasThroughout: frames.every((frame) => frame.sameCanvas),
      finiteThroughout: frames.every((frame) => Number.isFinite(frame.scale)),
      monotonicInward: steps.every((delta) => delta <= 0.0001),
      maxFrameStepDex: Math.max(...steps.map(Math.abs)),
      sampledTransitionFrames: report.screenshots.filter((shot) => shot.name.startsWith('zoom-handoff-')).map(({ name, pixels }) => ({ name, ...pixels })),
    })
  }
}

async function mobileGestures(page, context) {
  const cdp = await context.newCDPSession(page)
  const touch = (id, x, y) => ({ id, x, y, radiusX: 3, radiusY: 3, force: 1 })
  try {
    const before = await sceneState(page)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch(1, 155, 440), touch(2, 235, 440)] })
    for (let i = 1; i <= 10; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [touch(1, 155 - i * 3, 440), touch(2, 235 + i * 3, 440)] })
      await sleep(28)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await sleep(600)
    const pinched = await capture(page, 'mobile-pinched')
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch(1, 150, 440)] })
    for (let i = 1; i <= 10; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [touch(1, 150 + i * 7, 440 + i * 2)] })
      await sleep(28)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await sleep(600)
    const rotated = await capture(page, 'mobile-rotated')
    const a = pinched.state.camera?.position, b = rotated.state.camera?.position
    const c = before.camera?.position
    report.checks.mobileGestures = {
      before, afterPinch: pinched.state, afterDrag: rotated.state,
      pinchScaleDelta: pinched.state.scale - before.scale,
      pinchZoomedIn: pinched.state.scale < before.scale - 0.1,
      pinchCameraDistance: c && a ? Math.hypot(...c.map((value, i) => a[i] - value)) : null,
      dragCameraDistance: a && b ? Math.hypot(...a.map((value, i) => b[i] - value)) : null,
      screenshotsDiffer: pinched.sha256 !== rotated.sha256,
    }
  } finally { await cdp.detach() }
}

try {
  browser = await chromium.launch({
    channel: 'chrome', headless: false, timeout: 15_000,
    args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--mute-audio', '--hide-scrollbars', '--window-size=1800,1200', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
  })
  watchdog = setTimeout(() => { timedOut = true; void browser.close() }, Math.max(1000, 110_000 - (Date.now() - start)))
  const desktop = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1, locale: 'zh-CN' })
  await desktop.addInitScript(() => performance.setResourceTimingBufferSize(10_000))
  const page = await desktop.newPage()
  observe(page, 'desktop')
  await navigate(page, '/plant-cell?scale=-3.83')
  await capture(page, 'hero-desktop')
  report.performance.desktopHero = await frameTiming(page)
  report.checks.daylightStreaming = await instanceMotion(page, 2000)
  await page.locator('.pc-light-switch').click()
  await sleep(700)
  report.checks.nightStreaming = await instanceMotion(page, 2000)
  const night = await capture(page, 'hero-night')
  report.checks.night = { inputValue: await page.locator('#pc-light').inputValue(), screenshot: night.path }
  await page.locator('.pc-tools button').filter({ hasText: '暂停' }).click()
  await sleep(120)
  report.checks.pausedStreaming = await instanceMotion(page, 1000)
  await page.locator('.pc-tools button').filter({ hasText: '继续' }).click()
  for (const [name, scale] of [['leaf', -0.62], ['section', -3.0], ['chloroplast', -5.3], ['transition', -3.6]]) {
    await navigate(page, `/plant-cell?scale=${scale}`)
    await capture(page, name)
  }
  await navigate(page, '/en/plant-cell?scale=-3.83')
  const english = await capture(page, 'hero-english')
  report.checks.english = { heading: english.state.heading, translated: english.state.heading === 'Mesophyll cell' }
  await zoomSweep(page)
  await desktop.close()
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'zh-CN' })
  await mobile.addInitScript(() => performance.setResourceTimingBufferSize(10_000))
  const phone = await mobile.newPage()
  observe(phone, 'mobile')
  await navigate(phone, '/plant-cell')
  await capture(phone, 'hero-mobile')
  report.performance.mobileHero = await frameTiming(phone)
  await mobileGestures(phone, mobile)
  await mobile.close()
  report.status = report.checks.continuousZoom.failure ? 'completed-with-failures' : 'completed'
  if (report.status !== 'completed') process.exitCode = 1
} catch (error) {
  report.status = timedOut ? 'timeout' : 'failed'
  report.failure = String(error?.stack ?? error)
  process.exitCode = 1
} finally {
  clearTimeout(watchdog)
  if (browser) await browser.close().catch(() => {})
  report.finishedAt = new Date().toISOString()
  report.elapsedMs = Date.now() - start
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n')
  console.log(`${report.status}: ${reportPath} (${(report.elapsedMs / 1000).toFixed(1)}s)`)
}
