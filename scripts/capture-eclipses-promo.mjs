/**
 * Record vertical promo clips from the eclipses world.
 *
 * Durations come from vo/*.wav when present, then padAfter from clips.json.
 * Each clip is a realtime Playwright video, not a screenshot sequence, so
 * playing simulations stay in sync with wall-clock VO length.
 *
 * Usage:
 *   BASE_URL=http://127.0.0.1:5174 \
 *   CLIPS=output/shape-video/eclipses-spain-2026/clips.json \
 *   node scripts/capture-eclipses-promo.mjs
 */
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { chromium } from 'playwright'

const root = resolve(import.meta.dirname, '..')
const clipsPath = resolve(root, process.env.CLIPS ?? 'output/shape-video/eclipses-spain-2026/clips.json')
const spec = JSON.parse(readFileSync(clipsPath, 'utf8'))
const projectDir = dirname(clipsPath)
const outDir = resolve(projectDir, 'clips')
const tmpDir = resolve(outDir, '.capture')
const base = process.env.BASE_URL ?? 'http://127.0.0.1:3000'
const only = process.env.ONEWORLD_FILM
const settleMs = Number(spec.settleMs) || 2400
const viewport = spec.viewport ?? { width: 1080, height: 1920 }

mkdirSync(outDir, { recursive: true })
rmSync(tmpDir, { recursive: true, force: true })
mkdirSync(tmpDir, { recursive: true })

const selected = spec.clips.filter((clip) => !only || clip.id === only)
if (selected.length === 0) {
  throw new Error(`No clips selected (ONEWORLD_FILM=${only ?? ''})`)
}

function wavDurationSeconds(path) {
  const ff = spawnSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=nw=1:nk=1',
    path,
  ], { encoding: 'utf8' })
  const value = Number.parseFloat(ff.stdout.trim())
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Could not read duration: ${path}\n${ff.stderr}`)
  }
  return value
}

function hideChrome() {
  document.querySelectorAll(
    '.experience-header, .guide-tour, .ghost-hint, [data-experience-overlay="true"], .next-world, .experience-chrome, .eclipses-sky-music, .eclipses-site-rail, .eclipses-zone-legend, .eclipses-globe-back',
  ).forEach((el) => {
    if (el instanceof HTMLElement) {
      el.style.setProperty('opacity', '0', 'important')
      el.style.setProperty('pointer-events', 'none', 'important')
    }
  })
}

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader'],
})

try {
  const timing = []
  for (const clip of selected) {
    const voPath = clip.vo ? resolve(projectDir, clip.vo) : null
    let voSeconds = null
    if (voPath) {
      try {
        statSync(voPath)
        voSeconds = wavDurationSeconds(voPath)
      } catch {
        voSeconds = null
      }
    }
    const seconds = Math.max(4, (voSeconds ?? clip.seconds ?? 6) + (clip.padAfter ?? 0.4))
    const clipTmp = resolve(tmpDir, clip.id)
    mkdirSync(clipTmp, { recursive: true })

    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: 1,
      recordVideo: { dir: clipTmp, size: viewport },
    })
    const page = await context.newPage()
    const startedAt = Date.now()
    await page.addInitScript(() => {
      try {
        localStorage.setItem('oneworld.guide.eclipses.v1', 'done')
        localStorage.setItem('oneworld.ghost.eclipses.v1', 'done')
      } catch { /* ignore */ }
    })
    await page.goto(`${base}${spec.url}`, { waitUntil: 'load', timeout: 90_000 })
    await page.waitForFunction(() => {
      const skip = document.querySelector('.guide-skip, .guide-close, .guide-stage-exit')
      if (skip instanceof HTMLElement) skip.click()
      return Boolean(window.__eclipsesFilm?.cue)
    }, undefined, { timeout: 45_000 })
    await page.evaluate((cue) => {
      window.__eclipsesFilm?.cue(cue)
    }, clip.cue)
    await page.waitForTimeout(settleMs)
    await page.evaluate(hideChrome)
    const readyAt = Date.now()
    await page.waitForTimeout(Math.round(seconds * 1000))
    const video = page.video()
    await page.close()
    await context.close()
    const rawPath = video ? await video.path() : ''
    if (!rawPath) throw new Error(`${clip.id}: Playwright did not write a video`)

    const outPath = resolve(outDir, `${clip.id}.mp4`)
    const trimStart = Math.max(0, (readyAt - startedAt) / 1000)
    const encoded = spawnSync('ffmpeg', [
      '-y',
      '-ss', trimStart.toFixed(3),
      '-t', seconds.toFixed(3),
      '-i', rawPath,
      '-an',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-crf', '18',
      '-movflags', '+faststart',
      outPath,
    ], { encoding: 'utf8' })
    if (encoded.status !== 0) {
      throw new Error(`${clip.id}: ffmpeg failed\n${encoded.stderr}`)
    }
    rmSync(clipTmp, { recursive: true, force: true })
    timing.push({
      id: clip.id,
      seconds: Number(seconds.toFixed(3)),
      voSeconds: voSeconds == null ? null : Number(voSeconds.toFixed(3)),
      file: `clips/${clip.id}.mp4`,
    })
    console.log(`[promo] ${clip.id} ${seconds.toFixed(2)}s → ${outPath}`)
  }
  writeFileSync(resolve(projectDir, 'capture-timing.json'), `${JSON.stringify(timing, null, 2)}\n`)
} finally {
  await browser.close()
  rmSync(tmpDir, { recursive: true, force: true })
}
