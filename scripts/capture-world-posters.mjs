import { worldPath } from '../src/lib/world-urls.ts'
/**
 * Capture museum-grade posters for selected worlds via Playwright.
 *
 * Usage:
 *   ONEWORLD_POSTER_IDS=lissajous,moire pnpm exec node scripts/capture-world-posters.mjs
 *   BASE_URL=http://127.0.0.1:3000 ONEWORLD_POSTER_IDS=... node scripts/capture-world-posters.mjs
 *   ONEWORLD_POSTER_RUNTIME=1 targets an exported offline runtime at BASE_URL.
 *   ONEWORLD_POSTER_FORMAT=mobile captures a real 390×844 viewport at 3×.
 *   Native portrait worlds are also captured by generate-mobile-posters.mjs;
 *   that command needs the same preview server and BASE_URL.
 *
 * Writes public/assets/posters/<id>.webp (2560×1600), then run:
 *   ONEWORLD_POSTER_IDS=... node scripts/generate-desktop-posters.mjs
 *   ONEWORLD_POSTER_IDS=... node scripts/generate-mobile-posters.mjs
 *   ONEWORLD_POSTER_IDS=... node scripts/generate-thumb-posters.mjs
 *   ONEWORLD_POSTER_IDS=... node scripts/generate-social-cards.mjs
 */
import { mkdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright'
import { nativePortraitWorldIds, prepareWorldPoster } from './lib/world-poster-recipes.mjs'

const root = resolve(import.meta.dirname, '..')
const mobilePoster = process.env.ONEWORLD_POSTER_FORMAT === 'mobile'
const posterSize = mobilePoster ? '1170x2532' : '2560x1600'
const base = process.env.BASE_URL ?? 'http://127.0.0.1:3000'
const ids = (process.env.ONEWORLD_POSTER_IDS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
const requestedPosterPaths = new Set(ids.flatMap((id) => [
  `/assets/posters/${id}.webp`,
  `/assets/posters/desktop/${id}.webp`,
  `/assets/posters/mobile/${id}.webp`,
  `/assets/posters/thumb/${id}.webp`,
]))
const settleMs = Math.max(0, Number.parseInt(process.env.ONEWORLD_POSTER_SETTLE_MS ?? '4200', 10) || 4200)
const minimumPosterBytes = 30_000
const maximumPosterBytes = 320_000

if (ids.length === 0) {
  console.error('Set ONEWORLD_POSTER_IDS=id1,id2,...')
  process.exit(1)
}

const outDir = resolve(root, mobilePoster ? 'public/assets/posters/mobile' : 'public/assets/posters')
mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH }
    : {}),
  // Match the runtime smoke audits so WebGL worlds render through a stable
  // software adapter on headless CI instead of falling back to a text frame.
  args: ids.every((id) => nativePortraitWorldIds.has(id) && id !== 'black-hole-flyby')
    ? [] // These Canvas 2D scenes do not need a software WebGL adapter.
    : ['--use-gl=angle', `--use-angle=${process.env.ONEWORLD_POSTER_ANGLE ?? 'swiftshader'}`],
})
const page = await browser.newPage({
  viewport: mobilePoster ? { width: 390, height: 844 } : { width: 1600, height: 1000 },
  deviceScaleFactor: mobilePoster ? 3 : 1.6,
})
// Install before navigation so animation callbacks can later be advanced one
// frame at a time for a repeatable, real simulation state.
if (ids.some((id) => nativePortraitWorldIds.has(id))) await page.clock.install()
// The local Worker can retain anonymous HTML across source changes. An
// isolated capture cookie bypasses that cache without changing the route.
await page.context().addCookies([{ name: 'oneworld-poster-capture', value: '1', url: base }])
await page.route('https://music-cdn.shapeof.world/**', (route) => route.abort())
await page.addInitScript(() => {
  try { localStorage.setItem('oneworld.site-bgm.muted.v1', '1') } catch { /* ignore */ }
})
function isIgnorablePosterNoise(text) {
  // Local poster capture is not allowed to fetch music-cdn previews; CORS
  // noise must not abort a frame that already rendered the stage.
  return /music-cdn\.shapeof\.world/iu.test(text)
    || /Access to audio at .+ blocked by CORS policy/iu.test(text)
}

let runtimeErrors = []
page.on('console', (message) => {
  if (message.type() !== 'error') return
  const text = message.text()
  // Chromium's generic resource error omits the URL. The response listener
  // below records actionable HTTP failures without double-reporting them.
  if (/^Failed to load resource: the server responded with a status of \d+/u.test(text)) return
  // Chromium omits the URL for CORS / net::ERR_FAILED. HTTP failures are
  // recorded by the response listener instead.
  if (/^Failed to load resource: net::ERR_/u.test(text)) return
  if (isIgnorablePosterNoise(text)) return
  runtimeErrors.push(`console: ${text}`)
})
page.on('pageerror', (error) => {
  if (isIgnorablePosterNoise(error.message)) return
  runtimeErrors.push(`page: ${error.message}`)
})
page.on('response', (response) => {
  if (response.status() < 400) return
  const url = response.url()
  if (isIgnorablePosterNoise(url)) return
  const pathname = new URL(url).pathname
  // A new world's own poster is allowed to be absent while that poster is
  // being created. Every other failed response still blocks the capture.
  if (response.status() === 404 && requestedPosterPaths.has(pathname)) return
  runtimeErrors.push(`http ${response.status()}: ${url}`)
})

// Force free explore before any selected world mounts (GuideTour hasCompletedGuide).
// Keeping this list in sync with the requested IDs prevents the capture from
// accidentally freezing on a first-visit story frame.
await page.addInitScript((worldIds) => {
  try {
    for (const id of worldIds) {
      localStorage.setItem(`oneworld.guide.${id}.v1`, 'done')
    }
  } catch {
    /* ignore */
  }
}, ids)

for (const id of ids) {
  runtimeErrors = []
  const url = process.env.ONEWORLD_POSTER_RUNTIME === '1'
    ? `${base}/?world=${id}&lang=zh&muted=1&ghost=0`
    : `${base}${worldPath(id)}?ghost=0${['cow-anatomy', 'creature-gallery', 'periodic-table', 'standard-model', 'light-speed', 'tshirt-world', 'dive-science', 'silkworm-life', 'earth-and-nature', 'vegetation-atlas', 'qingming-riverside', 'frontscope', 'starry-night', 'cafe-terrace'].includes(id) ? '&capture=1' : ''}`
  console.log(`[poster] ${id} ← ${url}`)
  // SPA pages often keep sockets/analytics open; networkidle hangs. Load + explicit stage wait is enough.
  await page.goto(url, { waitUntil: 'load', timeout: 90_000 })
  await page.waitForFunction((worldId) => {
    const stage = document.querySelector('.experience-stage')
    if (!stage || stage.querySelector('.canvas-loading, .renderer-error')) return false
    if (worldId === 'cow-anatomy') return stage.querySelectorAll('.ca-region').length === 11
    if (worldId === 'periodic-table') return stage.querySelectorAll('.pm-cell').length === 118
    if (worldId === 'creature-gallery') return stage.querySelectorAll('.cg-cell').length === 34
    if (worldId === 'snowflake-journey') return Boolean(stage.querySelector('.sj-world[data-ready="true"]'))
    if (worldId === 'standard-model') return Boolean(stage.querySelector('.smm-world'))
    if (worldId === 'tshirt-world') return Boolean(stage.querySelector('svg.et-town'))
    return Boolean(stage.querySelector('canvas, iframe, model-viewer, video, .oss-experience') || stage.querySelector('.scoped-world-stage')?.shadowRoot?.querySelector('canvas'))
  }, id, { timeout: 60_000 })
  if (['starry-night', 'cafe-terrace'].includes(id)) {
    await page.locator('.scoped-world-stage').locator(id === 'starry-night' ? '#boot' : '#loading').waitFor({ state: 'hidden', timeout: 90_000 })
  }
  if (id === 'human-atlas') {
    await page.waitForSelector('.ha-experience', { timeout: 60_000 })
    await page.waitForFunction(() => !document.querySelector('.ha-loading:not(.is-error)'), undefined, { timeout: 180_000 })
  }

  // A stale browser profile can still carry an open story from an older key.
  // Close it, then wait for the free stage instead of relying on a fixed delay.
  await page.evaluate(() => {
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('oneworld.guide.')) localStorage.setItem(key, 'done')
      }
    } catch { /* ignore */ }
    const skip = document.querySelector('.guide-skip, .guide-close, .guide-stage-exit')
    if (skip instanceof HTMLElement) skip.click()
  })
  await page.waitForFunction(() => !document.querySelector('.guide-tour:not([hidden])'), undefined, { timeout: 15_000 }).catch(() => {})

  // Nudge interactive worlds so the frame is not an idle black field
  await page.evaluate((worldId) => {
    const clickText = (re) => {
      for (const el of document.querySelectorAll('button')) {
        if (re.test((el.textContent || '').trim())) {
          el.click()
          return true
        }
      }
      return false
    }
    if (worldId === 'double-pendulum') {
      clickText(/^释放$|^Release$/i)
    }
    if (worldId === 'periodic-table') {
      // This DOM museum wall is ready before an inspector creates a canvas.
      // The full-table view preserves all 118 exhibits in portrait captures.
      document.querySelector('.pm-map-zoom[aria-pressed="true"]')?.click()
      document.querySelector('.pm-feature-choices button')?.click()
    }
    if (worldId === 'solar-system') {
      clickText(/^银河航行$|^Galactic travel$/i)
    }
    if (worldId === 'gravitational-waves') {
      clickText(/^播放$|^Play$/i)
    }
    if (worldId === 'three-body') {
      clickText(/^细看$|^Watch$/i)
    }
    if (worldId === 'neural-playground') {
      clickText(/训练|Train/i)
    }
    if (worldId === 'anai-backprop') {
      // 落定态海报帧：前向值、洋红反向流与局部导数全部就位（组件内 poster() 摆帧）。
      window.__anaiBackprop?.poster()
    }
    if (worldId === 'anai-neuron') {
      // 已收敛 + 持续点火帧：绿色分界线、亮核、脉冲循环，海报钩子「只会做加法却能分类」。
      window.__anaiNeuron?.poster()
    }
    if (worldId === 'anai-embedding') {
      // 成形星图 + 「国王−男人+女人」箭头完整落点（组件内 poster() 摆帧）。
      window.__anaiEmbedding?.poster()
    }
    if (worldId === 'sorting-race') {
      clickText(/开跑|Start|②/i) || clickText(/快排|Quick/i)
    }
    if (worldId === 'monte-carlo-pi') {
      clickText(/撒|Drop|开始|Start/i)
    }
    if (worldId === 'artificial-life') {
      const frame = document.querySelector('iframe')?.contentWindow
      frame?.postMessage({
        type: 'oneworld:artificial-life-command',
        command: 'parameters',
        parameters: {
          weather: 0,
          autoWeather: false,
          dayNight: false,
          timeSpeed: 2,
        },
      }, window.location.origin)
      frame?.postMessage({
        type: 'oneworld:artificial-life-command',
        command: 'auto-camera',
        value: false,
      }, window.location.origin)
    }
    if (worldId === 'sky-scattering') {
      clickText(/薄暮橙红|Dusk/i)
    }
    if (worldId === 'rainbow') {
      // Free mode opens on the observer's own view; both bows make the poster.
      clickText(/^天空$|^Sky$|^整片雨$|^The whole rain$/i)
      const secondary = [...document.querySelectorAll('button')]
        .find((button) => /第二道彩虹|Second bow/i.test(button.textContent ?? ''))
      if (secondary?.getAttribute('aria-pressed') === 'false') secondary.click()
    }
    if (worldId === 'vortex-ring') {
      // Two rings mid-leapfrog, cores drawn, is the frame worth putting on a poster.
      clickText(/两个环蛙跳|Two ring leapfrog/i)
      clickText(/显示芯线|Show the core/i)
    }
    if (worldId === 'stereo-depth') {
      clickText(/红青立体|Anaglyph/i)
    }
    if (worldId === 'gravitational-lensing') {
      // Cluster preset first (θ_E 31.6″ → a ring that fills the stage), then snap into it.
      clickText(/星系团|cluster/i)
      clickText(/对准成环|Snap into a ring/i)
    }
    if (worldId === 'typhoon-qoder') {
      clickText(/风场|Wind field/i)
      clickText(/副高|Subtropical ridge|ridge/i)
    }
    if (worldId === 'ising-model') {
      // Mid-anneal frame: domains grow while the ember glow rides the walls.
      clickText(/烧红再冷却|Heat red-hot/i)
    }
    if (worldId === 'quantum-decoherence') {
      // The chamber only leaks a visible record once there is gas in it. In the
      // default ultra-high vacuum a whole shot passes with almost no traffic.
      const pressure = document.querySelector('.qd-pressure')
      if (pressure instanceof HTMLInputElement) {
        const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
        setValue?.call(pressure, '-7')
        pressure.dispatchEvent(new Event('input', { bubbles: true }))
        pressure.dispatchEvent(new Event('change', { bubbles: true }))
      }
    }
    if (worldId === 'quantum-tunneling-lab') {
      // Quantum bench with a thicker chance of a visible through-count frame.
      clickText(/连发|Burst/i)
    }
    if (worldId === 'unbroken-wall') {
      // 撞击瞬间：波包撞上完好晶壁，反射溅回与墙内渗透同框。
      const uw = window.__uw
      if (uw && typeof uw.fire === 'function' && typeof uw.seek === 'function') {
        uw.fire()
        uw.seek(0.72)
      } else {
        clickText(/发射|Fire/i)
      }
    }
    if (worldId === 'human-atlas') {
      const explode = document.querySelector('#ha-explode')
      if (explode instanceof HTMLInputElement) {
        const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
        setValue?.call(explode, '42')
        explode.dispatchEvent(new Event('input', { bubbles: true }))
      }
    }
    if (worldId === 'sunlight-journey') {
      // 太空直飞全景帧：完整太阳圆面、光子彗尾与虚线轨迹同框，是全程最具辨识度的画面。
      const journey = document.querySelector('.slj-range input')
      if (journey instanceof HTMLInputElement) {
        const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
        setValue?.call(journey, '780')
        journey.dispatchEvent(new Event('input', { bubbles: true }))
        journey.dispatchEvent(new Event('change', { bubbles: true }))
      }
    }
    if (worldId === 'boost-glide') {
      // Capture after the three paths have separated enough to compare.
      clickText(/^60×$/)
      const scrub = document.querySelector('.bg-scrub')
      if (scrub instanceof HTMLInputElement) {
        const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
        setValue?.call(scrub, '580')
        scrub.dispatchEvent(new Event('input', { bubbles: true }))
        scrub.dispatchEvent(new Event('change', { bubbles: true }))
      }
    }
    if (worldId === 'quantum-century') {
      // Park the camera at the 1900 end: the furnace and the classical curve
      // escaping the chart carry the thesis, and the remaining nine bays
      // recede to the right as one continuous century.
      const scrub = document.querySelector('.qc-scrub')
      if (scrub instanceof HTMLInputElement) {
        const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
        setValue?.call(scrub, '0')
        scrub.dispatchEvent(new Event('input', { bubbles: true }))
        scrub.dispatchEvent(new Event('change', { bubbles: true }))
      }
    }
    if (worldId === 'cosmic-scale') {
      clickText(/^银河$|^Milky Way$/i)
    }
    if (worldId === 'earth-spin-orbit') {
      // Terminator-facing June solstice: half day, half night, not Beijing at 2am.
      const eso = window.__eso
      if (eso && typeof eso.poster === 'function') eso.poster()
    }
    if (worldId === 'inner-critic') {
      // Curated freeze-frame: pressing voice, incoming voices, thorns and one seen pebble.
      const ic = window.__ic
      if (ic && typeof ic.poster === 'function') ic.poster()
    }
    if (worldId === 'agent-scratchpad') {
      // Full pad just before compaction: refactor session with a skill loaded.
      const asp = window.__asp
      if (asp && typeof asp.poster === 'function') asp.poster()
    }
    if (worldId === 'moe-switchyard') {
      // 确定性海报帧：「+」字正在被路由到两条巷道的瞬间，前四个字已积累炉温。
      const msy = window.__msy
      if (msy && typeof msy.poster === 'function') msy.poster()
    }
    if (worldId === 'unseen-universe') {
      // Chapter 1 with the illustrative halo mostly revealed — the poster hook.
      const slider = document.querySelector('[data-universe-slider]')
      if (slider instanceof HTMLInputElement) {
        const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
        setValue?.call(slider, '82')
        slider.dispatchEvent(new Event('input', { bubbles: true }))
      }
    }
    if (worldId === 'company-from-one') {
      for (let i = 0; i < 6; i += 1) clickText(/^招人$|^Hire$/i)
      clickText(/打磨产品|Sharpen the product/i)
      clickText(/种子轮|^Seed$/i)
    }
    if (worldId === 'ukulele') {
      // 作品级海报帧：送别副歌里第 10 品的旋律音与低音同时亮起，英雄机位（琴头、琴颈与音孔同框）。
      window.__uke?.poster()
    }
    if (worldId === 'moon-voyage') {
      // 作品级构图：接近段——晨昏线附近的巨大月面 + 带尾焰的 CSM + 双曲线轨迹。
      // 本地 dev 有调试钩子可精确跳段；生产预览回退到点击流。
      const mv = window.__mv
      if (mv && typeof mv.jump === 'function') {
        mv.jump(272450, { mode: 'craft', playing: true, speed: 60 })
      } else {
        clickText(/^点火$|^Ignite$/i)
        const more = document.querySelector('.experience-freebar-summary')
        if (more instanceof HTMLElement) more.click()
        for (let i = 0; i < 5; i += 1) clickText(/跳到下一事件|Skip to next|Next event/i)
        clickText(/^远景$|^Wide$/i)
        clickText(/^6000×$/)
      }
    }
  }, id)
  // Give procedural simulations time to form a representative frame. Waiting
  // for the renderer above ensures this budget is spent on the world itself,
  // not on downloading its lazy chunk.
  // The high-DPI attention canvas intentionally reveals its nodes and arcs in
  // sequence. On a software renderer the animation advances slowly, so the
  // normal settle budget can capture an almost empty opening frame.
  const worldSettleMs = id === 'attention-theater'
    ? Math.max(settleMs, 30_000)
    : id === 'moon-voyage'
      ? Math.max(settleMs, 8_000)
      : id === 'three-body'
        ? Math.max(settleMs, 7_000)
        : id === 'double-pendulum' || id === 'gravitational-waves'
          ? Math.max(settleMs, 6_000)
          : id === 'unseen-universe'
            ? Math.max(settleMs, 6_000)
            : settleMs
  await page.waitForTimeout(worldSettleMs)

  // Fit the imported terrain to the poster aspect ratio using its own camera control.
  const scopedZoom = id === 'vegetation-atlas' ? (mobilePoster ? -440 : -180) : 0
  if (scopedZoom) {
    await page.locator('.scoped-world-stage canvas').first().dispatchEvent('wheel', { deltaY: scopedZoom })
    await page.waitForTimeout(1200)
  }

  const frozenPoster = await prepareWorldPoster(page, id)

  await page.evaluate(() => {
    document.querySelectorAll(
      '.experience-header, .guide-tour, .ghost-hint, .follow-stay, [data-experience-overlay="true"]',
    ).forEach((el) => {
      el.style.setProperty('transition', 'none', 'important')
      el.style.setProperty('animation', 'none', 'important')
      el.style.setProperty('opacity', '0', 'important')
      el.style.setProperty('pointer-events', 'none', 'important')
    })
  })
  if (!frozenPoster) await page.waitForTimeout(300)

  if (runtimeErrors.length > 0) {
    throw new Error(`${id}: browser errors during poster capture\n${runtimeErrors.join('\n')}`)
  }

  const png = await page.screenshot({ type: 'png', fullPage: false, timeout: 90_000 })
  if (frozenPoster) await page.clock.resume()
  // Write via sharp if available; else use magick convert from temp png
  const tmpPng = resolve(outDir, `${id}.capture.png`)
  writeFileSync(tmpPng, png)
  const { spawnSync } = await import('node:child_process')
  const stats = spawnSync(
    'magick',
    [tmpPng, '-colorspace', 'Gray', '-format', '%[fx:mean] %[fx:standard_deviation]', 'info:'],
    { encoding: 'utf8' },
  )
  if (stats.status === 0) {
    const [mean, deviation] = stats.stdout.trim().split(/\s+/).map(Number)
    if (
      Number.isFinite(mean)
      && Number.isFinite(deviation)
      && mean < 0.04
      && deviation < 0.015
      && !['gravitational-waves', 'impact-simulator'].includes(id)
    ) {
      throw new Error(`${id}: captured frame is nearly black (mean=${mean.toFixed(4)}, deviation=${deviation.toFixed(4)})`)
    }
  }
  const outWebp = resolve(outDir, `${id}.webp`)
  const convertWithMagick = (quality, method = 6) => spawnSync(
    'magick', [
      tmpPng, '-resize', `${posterSize}^`, '-gravity', 'center', '-extent', posterSize,
      '-strip', '-define', `webp:method=${method}`, '-quality', String(quality), outWebp,
    ], { stdio: 'inherit' },
  )

  let converted = false
  // Start at the highest normal quality, stepping down only for unusually
  // complex simulations that would exceed the source-poster transfer budget.
  for (const quality of [84, 78, 72, 66, 60, 54, 48, 42]) {
    const magick = convertWithMagick(quality)
    if (magick.status !== 0) break
    converted = true
    if (statSync(outWebp).size <= maximumPosterBytes) break
  }
  if (!converted) {
    // fallback: keep png renamed is not enough; try cwebp
    const cwebp = spawnSync('cwebp', ['-q', '82', tmpPng, '-o', outWebp], { stdio: 'inherit' })
    if (cwebp.status !== 0) {
      console.error(`[poster] FAILED ${id}: need ImageMagick or cwebp`)
      continue
    }
  }

  // Very sparse vector scenes can compress below the policy floor even at
  // quality 100. Method 0 intentionally favors visual fidelity over maximum
  // compression and keeps the master useful for later responsive crops.
  if (statSync(outWebp).size < minimumPosterBytes && converted) convertWithMagick(95, 0)
  const posterBytes = statSync(outWebp).size
  if (posterBytes < minimumPosterBytes || posterBytes > maximumPosterBytes) {
    throw new Error(`${id}: poster is ${posterBytes} bytes; expected ${minimumPosterBytes}–${maximumPosterBytes}`)
  }
  try { unlinkSync(tmpPng) } catch { /* ignore */ }
  console.log(`[poster] wrote ${outWebp} (${posterBytes} bytes)`)
}

await browser.close()
console.log('[poster] done')
