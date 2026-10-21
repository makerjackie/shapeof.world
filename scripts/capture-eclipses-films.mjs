import { worldPath } from '../src/lib/world-urls.ts'
/**
 * Record original eclipse films from the live simulation.
 *
 * Usage:
 *   BASE_URL=http://127.0.0.1:5231 node scripts/capture-eclipses-films.mjs
 *
 * Writes public/assets/eclipses/{ground,close,orbit}.webm
 * These are recordings of this world's renderer, not observational footage.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const root = resolve(import.meta.dirname, '..')
const base = process.env.BASE_URL ?? 'http://127.0.0.1:3000'
const outDir = resolve(root, 'public/assets/eclipses')
const tmpDir = resolve(outDir, '.capture')
mkdirSync(outDir, { recursive: true })
rmSync(tmpDir, { recursive: true, force: true })
mkdirSync(tmpDir, { recursive: true })

const fps = 12
const shots = [
  { id: 'ground', seconds: 6, viewport: { width: 720, height: 960 } },
  { id: 'close', seconds: 6, viewport: { width: 800, height: 800 } },
  { id: 'orbit', seconds: 8, viewport: { width: 1280, height: 720 } },
]
const only = process.env.ONEWORLD_FILM
const selected = only ? shots.filter((shot) => shot.id === only) : shots
if (selected.length === 0) {
  throw new Error(`Unknown ONEWORLD_FILM=${only}`)
}

function hideChrome() {
  document.querySelectorAll(
    '.experience-header, .guide-tour, .ghost-hint, [data-experience-overlay="true"], .next-world, .experience-chrome, .eclipses-sky-music',
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
  const page = await browser.newPage({
    viewport: selected[0].viewport,
    deviceScaleFactor: 1,
  })
  await page.addInitScript(() => {
    try {
      localStorage.setItem('oneworld.guide.eclipses.v1', 'done')
      localStorage.setItem('oneworld.ghost.eclipses.v1', 'done')
    } catch { /* ignore */ }
  })
  await page.goto(`${base}${worldPath('eclipses')}?ghost=0&lang=zh`, { waitUntil: 'load', timeout: 90_000 })
  await page.waitForFunction(() => {
    const skip = document.querySelector('.guide-skip, .guide-close, .guide-stage-exit')
    if (skip instanceof HTMLElement) skip.click()
    return Boolean(window.__eclipsesFilm)
  }, undefined, { timeout: 45_000 })

  for (const shot of selected) {
    await page.setViewportSize(shot.viewport)
    await page.evaluate((id) => {
      window.__eclipsesFilm?.prepare(id)
    }, shot.id)
    await page.waitForTimeout(2400)
    await page.evaluate(hideChrome)
    await page.waitForTimeout(400)
    const frameDir = resolve(tmpDir, shot.id)
    mkdirSync(frameDir, { recursive: true })
    const frames = shot.seconds * fps
    for (let i = 0; i < frames; i += 1) {
      const png = await page.screenshot({ type: 'png' })
      writeFileSync(resolve(frameDir, `${String(i).padStart(4, '0')}.png`), png)
      await page.waitForTimeout(Math.round(1000 / fps))
    }
    const outPath = resolve(outDir, `${shot.id}.webm`)
    const encoded = spawnSync('ffmpeg', [
      '-y',
      '-framerate', String(fps),
      '-i', resolve(frameDir, '%04d.png'),
      '-an',
      '-c:v', 'libvpx-vp9',
      '-b:v', '0',
      '-crf', '36',
      '-pix_fmt', 'yuv420p',
      outPath,
    ], { encoding: 'utf8' })
    if (encoded.status !== 0) {
      throw new Error(`${shot.id}: ffmpeg failed\n${encoded.stderr}`)
    }
    rmSync(frameDir, { recursive: true, force: true })
    console.log(`[film] ${shot.id} → ${outPath}`)
  }
} finally {
  await browser.close()
  rmSync(tmpDir, { recursive: true, force: true })
}
