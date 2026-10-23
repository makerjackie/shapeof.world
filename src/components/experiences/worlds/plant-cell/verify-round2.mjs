// Run after starting this worktree on 3241:
// node src/components/experiences/worlds/plant-cell/verify-round2.mjs <output-directory>
// Uses a dedicated headless GPU Chrome instance. Never opens a visible window.
import { chromium } from 'playwright'
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const base = 'http://127.0.0.1:3241'
if (!process.argv[2]) throw new Error('Pass an output directory for private screenshots and verification logs.')
const output = resolve(process.argv[2])
const shots = join(output, 'shots')
const reportPath = join(output, 'logs/round-2.browser.json')
const start = Date.now()
const report = {
  startedAt: new Date().toISOString(), base,
  browser: { channel: 'chrome', headed: false, gpu: 'Metal', dedicatedInstance: true },
  screenshots: [], performance: {}, checks: {}, pendingChecks: [], pageErrors: [], httpErrors: [], requestFailures: [], consoleErrors: [],
  limitations: [
    'Desktop and mobile viewport tests run in desktop Chrome; they are not iPhone device evidence.',
    'Frame timing measures browser requestAnimationFrame intervals for three seconds, not an external GPU profiler.',
    'Black-frame checks inspect captured transition and orbit images. Continuous geometry probes do not prove pixel correctness in every frame.',
    'Screenshot hashes include animation and film grain; canvas data-yaw and data-pitch provide rotation evidence.',
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
  const response = await page.goto(base + path + (path.includes('?') ? '&ghost=0' : '?ghost=0'), { waitUntil: 'domcontentloaded', timeout: 60_000 })
  if (!response?.ok()) throw new Error(`Navigation failed: ${response?.status()} ${path}`)
  await page.locator('.pc-scene canvas[data-scale]').waitFor({ state: 'visible', timeout: 60_000 })
  await page.waitForFunction(() => {
    const data = document.querySelector('.pc-scene canvas')?.dataset
    return data && ['scale', 'yaw', 'pitch'].every((key) => data[key] !== undefined && Number.isFinite(Number(data[key])))
  }, undefined, { timeout: 8000 })
  await sleep(settle)
}

async function sceneState(page) {
  return page.evaluate(async () => {
    const canvas = document.querySelector('.pc-scene canvas')
    const lightButton = document.querySelector('.pc-light-switch')
    const lightSvg = lightButton?.querySelector('svg')
    const buttonStyle = lightButton ? getComputedStyle(lightButton) : null
    const result = {
      scale: Number(canvas?.dataset.scale), yawDegrees: Number(canvas?.dataset.yaw), pitchDegrees: Number(canvas?.dataset.pitch),
      layer: document.querySelector('[data-plant-cell-layer]')?.dataset.plantCellLayer,
      heading: document.querySelector('.pc-heading h1')?.textContent,
      readouts: [...document.querySelectorAll('.pc-readout > div')].map((row) => row.textContent),
      lightInput: Number(document.querySelector('#pc-light')?.value),
      physiology: {
        simulationSeconds: Number(canvas?.dataset.simulationSeconds), actualPPFD: Number(canvas?.dataset.actualPpfd),
        timeControl: document.querySelector('#pc-time')?.value,
        dayCycle: document.querySelector('[data-pc-day-cycle]')?.getAttribute('aria-pressed'),
      },
      scaleBar: document.querySelector('.pc-scale-bar span')?.textContent,
      canvas: canvas ? { width: canvas.width, height: canvas.height, cssWidth: canvas.clientWidth, cssHeight: canvas.clientHeight } : null,
      lightButton: buttonStyle && lightSvg ? {
        padding: buttonStyle.padding, display: buttonStyle.display, color: buttonStyle.color,
        svgWidth: lightSvg.getBoundingClientRect().width, svgHeight: lightSvg.getBoundingClientRect().height,
        svgFlexShrink: getComputedStyle(lightSvg).flexShrink,
      } : null,
      camera: null, cutaway: null, render: null, renderer: null, instances: null, probeError: null,
    }
    try {
      const urls = performance.getEntriesByType('resource').map((entry) => entry.name)
      const moduleUrl = urls.find((url) => /\/[^/]*react-three[_+]fiber[^/]*\.js(?:\?|$)/.test(url))
      if (!moduleUrl) throw new Error('Loaded react-three/fiber module URL was not found')
      const fiber = await import(moduleUrl)
      const root = fiber._roots?.get(canvas)
      const state = root?.store?.getState()
      if (!state) throw new Error('No fiber store found for this canvas')
      result.camera = { type: state.camera.type, fovDegrees: state.camera.fov, position: state.camera.position.toArray(), quaternion: state.camera.quaternion.toArray(), zoom: state.camera.zoom }
      const instance = (name) => {
        const mesh = state.scene.getObjectByName(name)
        if (!mesh?.instanceMatrix) return null
        const matrix = Array.from(mesh.instanceMatrix.array.slice(0, 16))
        const translationsUm = Array.from({ length: mesh.count }, (_, index) => Array.from(mesh.instanceMatrix.array.slice(index * 16 + 12, index * 16 + 15)))
        return { name, index: 0, matrix, translationUm: matrix.slice(12, 15), count: mesh.count, translationsUm }
      }
      result.instances = { mitochondrion: instance('streaming-mitochondria'), peroxisome: instance('streaming-peroxisomes'), chloroplast: instance('wall-chloroplasts') }
      const wall = state.scene.getObjectByName('wall-chloroplasts')
      const plane = wall?.material?.clippingPlanes?.[0]
      if (plane && wall.parent) {
        const group = wall.parent
        const rim = group.children.find((object) => object.material?.color?.getHexString() === 'efe6cf')
        const caps = group.children.find((object) => object.isInstancedMesh && object.geometry?.type === 'CircleGeometry' && object.count === wall.count)
        const visible = (object) => {
          for (let ancestor = object; ancestor; ancestor = ancestor.parent) if (!ancestor.visible) return false
          return Boolean(object)
        }
        const center = state.camera.position.clone().setFromMatrixPosition(group.matrixWorld)
        const eye = state.camera.position.clone().sub(center)
        const eyeYaw = Math.atan2(eye.x, eye.z)
        const cutYaw = Math.atan2(-plane.normal.x, -plane.normal.z)
        const matrix = wall.matrix.clone(), point = state.camera.position.clone()
        let activeBodies = 0, retainedCenters = 0, activeCaps = 0, finiteMatrices = true
        for (let index = 0; index < wall.count; index++) {
          wall.getMatrixAt(index, matrix)
          finiteMatrices &&= matrix.elements.every(Number.isFinite)
          if (Math.hypot(matrix.elements[0], matrix.elements[1], matrix.elements[2]) > 1e-6) {
            activeBodies++
            point.setFromMatrixPosition(matrix).applyMatrix4(wall.matrixWorld)
            if (plane.distanceToPoint(point) >= 0) retainedCenters++
          }
          if (caps) {
            caps.getMatrixAt(index, matrix)
            finiteMatrices &&= matrix.elements.every(Number.isFinite)
            if (Math.hypot(matrix.elements[0], matrix.elements[1], matrix.elements[2]) > 1e-6) activeCaps++
          }
        }
        result.cutaway = {
          planeNormal: plane.normal.toArray(), planeConstant: plane.constant,
          cameraToCutDegrees: Math.atan2(Math.sin(eyeYaw - cutYaw), Math.cos(eyeYaw - cutYaw)) * 180 / Math.PI,
          rimVisible: visible(rim), rimVertexCount: rim?.geometry?.attributes?.position?.count ?? 0,
          wallVisible: visible(wall), capMeshVisible: visible(caps), activeBodies, retainedCenters, activeCaps,
          finiteMatrices, finitePlane: [...plane.normal.toArray(), plane.constant].every(Number.isFinite),
        }
      }
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
  const path = join(shots, `round-2-${name}.png`)
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
  return { requestedDurationMs: durationMs, elapsedWallSeconds, measurement: 'First instance endpoint displacement in local micrometres; not mean path speed.', mitochondrion: compare('mitochondrion'), peroxisome: compare('peroxisome'), chloroplast: compare('chloroplast') }
}

async function rotateQuarterTurn(page) {
  const canvas = page.locator('.pc-scene canvas')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas bounds unavailable for rotation test')
  const distance = box.height / 4
  const startX = box.x + box.width * 0.54
  const startY = box.y + box.height * 0.5
  if (startX + distance >= box.x + box.width) throw new Error('Quarter-turn drag would leave the canvas')
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  // Pointer-down stops the subtle automatic orbit; settle it before measuring.
  await sleep(250)
  const before = await sceneState(page)
  await page.mouse.move(startX + distance, startY, { steps: 24 })
  await page.mouse.up()
  await page.waitForFunction((yaw) => {
    const value = Number(document.querySelector('.pc-scene canvas')?.dataset.yaw)
    return Math.abs((value - yaw) + 90) < 1
  }, before.yawDegrees, { timeout: 2500 }).catch(() => {})
  const rotated = await capture(page, 'hero-rotated-90')
  const delta = rotated.state.yawDegrees - before.yawDegrees
  report.checks.desktopRotation = {
    start: [startX, startY], end: [startX + distance, startY], canvasHeightPx: box.height,
    requestedDragPx: distance, expectedYawDeltaDegrees: -90, actualYawDeltaDegrees: delta,
    pitchDeltaDegrees: rotated.state.pitchDegrees - before.pitchDegrees,
    quarterTurnPassed: Math.abs(delta + 90) < 1,
    pitchStable: Math.abs(rotated.state.pitchDegrees - before.pitchDegrees) < 0.5,
    before, after: rotated.state,
  }
}

async function verifyFreeOrbitAndCuts(page) {
  const box = await page.locator('.pc-scene canvas').boundingBox()
  if (!box) throw new Error('Canvas bounds unavailable for full orbit test')
  await page.evaluate(async () => {
    const original = document.querySelector('.pc-scene canvas')
    const moduleUrl = performance.getEntriesByType('resource').map((entry) => entry.name).find((url) => /\/[^/]*react-three[_+]fiber[^/]*\.js(?:\?|$)/.test(url))
    const fiber = moduleUrl ? await import(moduleUrl) : null
    const scene = fiber?._roots?.get(original)?.store?.getState()?.scene
    const wall = scene?.getObjectByName('wall-chloroplasts')
    const rim = wall?.parent?.children.find((object) => object.material?.color?.getHexString() === 'efe6cf')
    const visible = (object) => {
      for (let ancestor = object; ancestor; ancestor = ancestor.parent) if (!ancestor.visible) return false
      return Boolean(object)
    }
    window.__plantOrbitProbe = { running: true, frames: [] }
    const sample = (time) => {
      if (!window.__plantOrbitProbe.running) return
      const canvas = document.querySelector('.pc-scene canvas')
      const plane = wall?.material?.clippingPlanes?.[0]
      window.__plantOrbitProbe.frames.push({
        time, yawDegrees: Number(canvas?.dataset.yaw), pitchDegrees: Number(canvas?.dataset.pitch),
        sameCanvas: canvas === original, wallVisible: visible(wall), rimVisible: visible(rim),
        finitePlane: Boolean(plane && [...plane.normal.toArray(), plane.constant].every(Number.isFinite)),
      })
      requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  })
  const endpoints = []
  const drag = async (dx, dy, name) => {
    const x = box.x + box.width * 0.54
    const y = box.y + box.height * (dy > box.height * 0.4 ? 0.2 : 0.55)
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + dx, y + dy, { steps: 30 })
    await page.mouse.up()
    await sleep(950) // Settle both camera damping and the slower cut-plane damping.
    const shot = await capture(page, name)
    endpoints.push(shot)
    return shot.state
  }
  try {
    await sleep(700)
    const startState = await sceneState(page) // Already 90° from the quarter-turn test.
    for (const degrees of [180, 270, 360]) await drag(box.height / 4, 0, `hero-rotated-${degrees}`)
    const fullTurn = endpoints.at(-1).state
    const low = await drag(0, -box.height * 0.35, 'hero-pitch-minus20')
    const high = await drag(0, box.height * 0.6, 'hero-pitch70')
    const cutStates = [startState, ...endpoints.map((shot) => shot.state)]
    const geometryPresent = (state) => {
      const cut = state.cutaway
      return Boolean(cut && cut.finitePlane && cut.finiteMatrices && cut.wallVisible && cut.rimVisible && cut.rimVertexCount > 0 && cut.capMeshVisible && cut.activeCaps > 0 && cut.retainedCenters > 0 && cut.retainedCenters < cut.activeBodies)
    }
    report.checks.freeOrbitAndCuts = {
      cumulativeYawDeltaDegrees: report.checks.desktopRotation.actualYawDeltaDegrees + fullTurn.yawDegrees - startState.yawDegrees,
      fullTurnPassed: Math.abs(fullTurn.yawDegrees - startState.yawDegrees + 270) < 1,
      pitchMinimumDegrees: low.pitchDegrees, pitchMaximumDegrees: high.pitchDegrees,
      pitchRangePassed: Math.abs(low.pitchDegrees + 20) < 1 && Math.abs(high.pitchDegrees - 70) < 1,
      cutGeometryPresentAtEveryEndpoint: cutStates.every(geometryPresent),
      settledCutFollowsCamera: cutStates.every((state) => Math.abs((state.cutaway?.cameraToCutDegrees ?? Infinity) - 35) < 3),
      capturedFramesNonBlack: endpoints.every((shot) => !shot.pixels.blackFrameSuspected),
      endpoints: cutStates.map((state) => ({ yawDegrees: state.yawDegrees, pitchDegrees: state.pitchDegrees, cutaway: state.cutaway })),
    }
  } finally {
    const frames = await page.evaluate(() => { window.__plantOrbitProbe.running = false; return window.__plantOrbitProbe.frames })
    report.checks.freeOrbitAndCuts ??= {}
    Object.assign(report.checks.freeOrbitAndCuts, {
      frames,
      sameCanvasThroughout: frames.every((frame) => frame.sameCanvas),
      cutMeshesPresentThroughout: frames.every((frame) => frame.finitePlane && frame.wallVisible && frame.rimVisible),
      finiteCameraThroughout: frames.every((frame) => Number.isFinite(frame.yawDegrees) && Number.isFinite(frame.pitchDegrees)),
    })
  }
}

const physiologyControls = {
  async setLight(page, value) {
    await page.locator('#pc-light').evaluate((input, next) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, String(next))
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    }, value)
    await page.waitForFunction((expected) => Number(document.querySelector('#pc-light')?.value) === expected, value)
    await page.waitForFunction((expected) => Math.abs(Number(document.querySelector('.pc-scene canvas')?.dataset.actualPpfd) - expected) < 0.2, value, { timeout: 5000 })
  },
  async setTimeScale(page, value) { await page.locator('#pc-time').selectOption(String(value)) },
  async setDayCycle(page, enabled) {
    const disclosure = page.locator('.pc-freebar .experience-freebar-summary')
    const wasOpen = await disclosure.getAttribute('aria-expanded') === 'true'
    if (!wasOpen) await disclosure.click()
    const button = page.locator('[data-pc-day-cycle]')
    await button.waitFor({ state: 'visible' })
    if ((await button.getAttribute('aria-pressed') === 'true') !== enabled) await button.click()
    if (!wasOpen) await disclosure.click()
  },
  async readSimulationSeconds(page) { return Number(await page.locator('.pc-scene canvas').getAttribute('data-simulation-seconds')) },
}
async function verifyLightResponse(page) {
  if (!physiologyControls) {
    report.pendingChecks.push('E: light 400 / 1800 / 50 at 60× for five simulated minutes; time and day-cycle selectors pending.')
    report.checks.lightResponse = { status: 'pending-controls', plannedPPFD: [400, 1800, 50], timeScale: 60, simulatedSecondsPerSetting: 300 }
    return
  }
  const { setLight, setTimeScale, setDayCycle, readSimulationSeconds } = physiologyControls
  await navigate(page, '/plant-cell')
  await setDayCycle(page, false)
  await setTimeScale(page, 60)
  const results = []
  for (const [label, intensity] of [['reference', 400], ['strong', 1800], ['weak', 50]]) {
    await setLight(page, intensity)
    const before = await sceneState(page)
    const startSeconds = await readSimulationSeconds(page)
    const wallStart = Date.now()
    let elapsedSimulationSeconds = 0
    while (elapsedSimulationSeconds < 300 && Date.now() - wallStart < 9000) {
      await sleep(250)
      elapsedSimulationSeconds = (await readSimulationSeconds(page)) - startSeconds
    }
    const shot = await capture(page, `light-${label}-${intensity}`)
    results.push({ intensity, before, after: shot.state, elapsedSimulationSeconds, elapsedWallSeconds: (Date.now() - wallStart) / 1000, reachedFiveMinutes: elapsedSimulationSeconds >= 300 })
  }
  report.checks.lightResponse = { status: 'tested', timeScale: 60, sameCellWithoutNavigation: true, results }
  const meanTop = (state) => {
    const points = state.instances?.chloroplast?.translationsUm?.slice(1, 25)
    return points?.length ? points.reduce((sum, point) => sum + point[1], 0) / points.length : null
  }
  const strong = results.find((result) => result.intensity === 1800)
  const weak = results.find((result) => result.intensity === 50)
  report.checks.lightResponse.topPopulationMeanYUm = { strong: meanTop(strong.after), weak: meanTop(weak.after) }
  report.checks.lightResponse.weakRaisedTopPopulation = meanTop(weak.after) > meanTop(strong.after) + 0.5
  await setTimeScale(page, 0)
  await sleep(250)
  const pausedBefore = await readSimulationSeconds(page)
  report.checks.pausedStreaming = await instanceMotion(page, 1000)
  report.checks.pausedSimulation = { before: pausedBefore, after: await readSimulationSeconds(page) }
  report.checks.pausedSimulation.clockStopped = Math.abs(report.checks.pausedSimulation.after - pausedBefore) < 1e-6
  await setLight(page, 400)
  await setTimeScale(page, 3600)
  await sleep(700)
  const lamp = await sceneState(page)
  report.checks.fastConstantLamp = { actualPPFD: lamp.physiology.actualPPFD, unchanged: Math.abs(lamp.physiology.actualPPFD - 400) < 0.1 }
  await setDayCycle(page, true)
  const cycleStart = await readSimulationSeconds(page), cycleWallStart = Date.now(), samples = []
  let capturedNight = false, capturedDawn = false
  while ((await readSimulationSeconds(page)) - cycleStart < 86400 && Date.now() - cycleWallStart < 45_000) {
    const sample = await page.evaluate(() => {
      const canvas = document.querySelector('.pc-scene canvas')
      const rows = [...document.querySelectorAll('.pc-readout > div')]
      const value = (label) => rows.find((row) => row.querySelector('span')?.textContent === label)?.querySelector('strong')?.textContent ?? null
      return { simulationSeconds: Number(canvas?.dataset.simulationSeconds), actualPPFD: Number(canvas?.dataset.actualPpfd), starchPercent: Number.parseFloat(value('淀粉储量')), stomatalPercent: Number.parseFloat(value('气孔开度')), clock: value('一天中的时间') }
    })
    samples.push(sample)
    if (!capturedNight && sample.actualPPFD === 0) { await capture(page, 'cycle-night'); capturedNight = true }
    if (capturedNight && !capturedDawn && sample.actualPPFD > 0) { await capture(page, 'cycle-dawn'); capturedDawn = true }
    await sleep(200)
  }
  const elapsedSimulationSeconds = (await readSimulationSeconds(page)) - cycleStart
  const starch = samples.map((sample) => sample.starchPercent).filter(Number.isFinite)
  const changes = samples.slice(1).map((sample, i) => sample.starchPercent - samples[i].starchPercent)
  report.checks.dayCycle = {
    elapsedSimulationSeconds, elapsedWallSeconds: (Date.now() - cycleWallStart) / 1000, samples,
    completed24Hours: elapsedSimulationSeconds >= 86400,
    experiencedNight: samples.some((sample) => sample.actualPPFD === 0),
    experiencedDay: samples.some((sample) => sample.actualPPFD > 390),
    starchRangePercent: starch.length ? [Math.min(...starch), Math.max(...starch)] : null,
    starchGrewAndDepleted: changes.some((change) => change > 0) && changes.some((change) => change < 0),
  }
  await setDayCycle(page, false)
  await setTimeScale(page, 1)
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
      state.frames.push({ time, scale: Number(canvas?.dataset.scale), yawDegrees: Number(canvas?.dataset.yaw), pitchDegrees: Number(canvas?.dataset.pitch), sameCanvas: canvas === original })
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
    // Chrome on macOS can multiply Playwright wheel pixels (2× on the
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
    await capture(page, 'zoom-end-granum-edge')
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
      pinchYawDeltaDegrees: pinched.state.yawDegrees - before.yawDegrees,
      pinchPitchDeltaDegrees: pinched.state.pitchDegrees - before.pitchDegrees,
      pinchDidNotOrbit: Math.abs(pinched.state.yawDegrees - before.yawDegrees) < 1 && Math.abs(pinched.state.pitchDegrees - before.pitchDegrees) < 1,
      dragYawDeltaDegrees: rotated.state.yawDegrees - pinched.state.yawDegrees,
      dragExpectedYawDeltaDegrees: -70 / before.canvas.cssHeight * 360,
      dragRotated: Math.abs(rotated.state.yawDegrees - pinched.state.yawDegrees) > 20,
      pinchCameraDistance: c && a ? Math.hypot(...c.map((value, i) => a[i] - value)) : null,
      dragCameraDistance: a && b ? Math.hypot(...a.map((value, i) => b[i] - value)) : null,
      screenshotsDiffer: pinched.sha256 !== rotated.sha256,
    }
  } finally { await cdp.detach() }
}

try {
  browser = await chromium.launch({
    channel: 'chrome', headless: true, timeout: 15_000,
    args: ['--headless=new', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--mute-audio', '--hide-scrollbars', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
  })
  watchdog = setTimeout(() => { timedOut = true; void browser.close() }, Math.max(1000, 300_000 - (Date.now() - start)))
  const desktop = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1, locale: 'zh-CN' })
  await desktop.addInitScript(() => performance.setResourceTimingBufferSize(10_000))
  const page = await desktop.newPage()
  observe(page, 'desktop')
  await navigate(page, '/plant-cell')
  const hero = await capture(page, 'hero-desktop')
  report.checks.heroCamera = {
    perspective: hero.state.camera?.type === 'PerspectiveCamera',
    fovInRequestedRange: hero.state.camera?.fovDegrees >= 28 && hero.state.camera?.fovDegrees <= 32,
    yawDegrees: hero.state.yawDegrees, pitchDegrees: hero.state.pitchDegrees,
  }
  report.performance.desktopHero = await frameTiming(page)
  report.checks.daylightStreaming = await instanceMotion(page, 2000)
  await rotateQuarterTurn(page)
  await verifyFreeOrbitAndCuts(page)
  for (const [name, scale] of [
    ['cell-close-25um', -4.60206],
    ['leaf', -0.62],
    ['leaf-surface-3mm', -2.52288],
    ['section', -3.0],
    ['chloroplast-2-5um', -5.60206],
    ['granum-edge-316nm', -6.5],
  ]) {
    await navigate(page, `/plant-cell?scale=${scale}`)
    const shot = await capture(page, name)
    shot.requestedScale = scale
    shot.scaleWithinTolerance = Math.abs(shot.state.scale - scale) < 0.005
    report.performance[name] = await frameTiming(page)
  }
  await navigate(page, '/en/plant-cell')
  const english = await capture(page, 'hero-english')
  report.checks.english = { heading: english.state.heading, translated: english.state.heading === 'Mesophyll cell' }
  await verifyLightResponse(page)
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
  const zoom = report.checks.continuousZoom
  const gestures = report.checks.mobileGestures
  const orbit = report.checks.freeOrbitAndCuts
  report.failedChecks = [
    ...(!report.checks.heroCamera.perspective || !report.checks.heroCamera.fovInRequestedRange ? ['hero perspective / FOV'] : []),
    ...(!report.checks.desktopRotation.quarterTurnPassed || !report.checks.desktopRotation.pitchStable ? ['desktop 90-degree rotation'] : []),
    ...(!orbit.fullTurnPassed || !orbit.pitchRangePassed || !orbit.sameCanvasThroughout || !orbit.finiteCameraThroughout ? ['free yaw / pitch'] : []),
    ...(!orbit.cutGeometryPresentAtEveryEndpoint || !orbit.settledCutFollowsCamera || !orbit.cutMeshesPresentThroughout || !orbit.capturedFramesNonBlack ? ['rotating cutaway continuity'] : []),
    ...(zoom.failure || !zoom.sameCanvasThroughout || !zoom.finiteThroughout || !zoom.monotonicInward ? ['continuous zoom'] : []),
    ...(!gestures.pinchZoomedIn || !gestures.pinchDidNotOrbit || !gestures.dragRotated ? ['mobile pinch / drag'] : []),
    ...(!report.checks.english.translated ? ['English heading'] : []),
    ...(report.pageErrors.length ? ['browser page errors'] : []),
    ...(report.consoleErrors.some(({text}) => /Shader Error|WebGLProgram|not compiled|VALIDATE_STATUS/.test(text)) ? ['WebGL shader compilation'] : []),
    ...report.screenshots.filter((shot) => shot.scaleWithinTolerance === false).map((shot) => `scale ${shot.name}`),
    ...(report.checks.lightResponse.results?.some((result) => !result.reachedFiveMinutes) ? ['physiology simulation clock'] : []),
    ...(report.checks.lightResponse.weakRaisedTopPopulation === false ? ['chloroplast light relocation'] : []),
    ...(report.checks.pausedSimulation && (!report.checks.pausedSimulation.clockStopped || !report.checks.pausedStreaming.peroxisome.available || report.checks.pausedStreaming.peroxisome.displacementUm > 1e-6 || report.checks.pausedStreaming.mitochondrion.displacementUm > 1e-6 || report.checks.pausedStreaming.chloroplast.displacementUm > 1e-6) ? ['paused physiology / streaming'] : []),
    ...(report.checks.fastConstantLamp?.unchanged === false ? ['time speed changed the manual lamp'] : []),
    ...(report.checks.dayCycle && (!report.checks.dayCycle.completed24Hours || !report.checks.dayCycle.experiencedDay || !report.checks.dayCycle.experiencedNight || !report.checks.dayCycle.starchGrewAndDepleted) ? ['24-hour day cycle / starch'] : []),
  ]
  report.status = report.failedChecks.length ? 'completed-with-failures' : report.pendingChecks.length ? 'completed-with-pending-checks' : 'completed'
  if (report.failedChecks.length) process.exitCode = 1
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
