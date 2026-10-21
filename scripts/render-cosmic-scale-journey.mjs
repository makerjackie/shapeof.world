/**
 * Render a Powers-of-Ten continuous log zoom from proton to the
 * observable universe. One camera move. No cuts, no plate hops.
 */
import { createServer } from 'node:http'
import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const root = resolve(import.meta.dirname, '..')
const publicDir = resolve(root, 'public')
const outVideo = resolve(publicDir, 'assets/cosmic-scale/journey-micro-to-macro.mp4')
const frameDir = resolve('/tmp/cosmic-scale-journey-frames')

const WIDTH = 1280
const HEIGHT = 720
const FPS = 24
const DURATION_S = 72
const FRAMES = DURATION_S * FPS

const LY = 9.460_730_472_580_8e15
const AU = 149_597_870_700
const PROTON = 2 * 8.4075e-16
const LOG_START = Math.log10(PROTON / 0.72)
const LOG_END = 26.88

const PLATES = [
  { id: 'observable', src: '/assets/cosmic-scale/plate-observable.webp', metres: 8.8e26, shape: 'field' },
  { id: 'wall', src: '/assets/cosmic-scale/plate-wall.webp', metres: 1.37e9 * LY, shape: 'field' },
  { id: 'web', src: '/assets/cosmic-scale/plate-web.webp', metres: 1.1e24, shape: 'field' },
  { id: 'local-group', src: '/assets/cosmic-scale/plate-local-group.webp', metres: 1.0e7 * LY, shape: 'field' },
  { id: 'milky-way', src: '/assets/cosmic-scale/plate-galaxy.webp', metres: 1.0e5 * LY, shape: 'field' },
  { id: 'milkyway-band', src: '/assets/cosmic-scale/plate-milkyway.webp', metres: 1.2e18, shape: 'field' },
  { id: 'proxima', src: '/assets/cosmic-scale/plate-stars.webp', metres: 4.246 * LY, shape: 'field' },
  { id: 'oort', src: '/assets/cosmic-scale/plate-oort.webp', metres: 100_000 * AU, shape: 'field' },
  { id: 'neptune-orbit', src: '/assets/cosmic-scale/plate-solar.webp', metres: 9.0e12, shape: 'field' },
  { id: 'earth-orbit', src: '/assets/cosmic-scale/plate-earth-orbit.webp', metres: 2 * AU, shape: 'field' },
  { id: 'sun', src: '/assets/cosmic-scale/plate-sun.webp', metres: 1.3914e9, shape: 'sphere' },
  { id: 'earth', src: '/assets/cosmic-scale/plate-earth.webp', metres: 12_756_274, shape: 'sphere' },
  { id: 'city', src: '/assets/cosmic-scale/plate-city.webp', metres: 3.0e4, shape: 'field' },
  { id: 'human', src: '/assets/cosmic-scale/plate-human.webp', metres: 1.7, shape: 'field' },
  { id: 'skin', src: '/assets/cosmic-scale/plate-skin.webp', metres: 8e-3, shape: 'field' },
  { id: 'cell', src: '/assets/cosmic-scale/plate-cell.webp', metres: 2.0e-5, shape: 'field' },
  { id: 'virus', src: '/assets/cosmic-scale/plate-virus.webp', metres: 1.0e-7, shape: 'field' },
  { id: 'dna', src: '/assets/cosmic-scale/plate-dna.webp', metres: 2e-9, shape: 'field' },
  { id: 'atom', src: '/assets/cosmic-scale/plate-atom.webp', metres: 2 * 5.291_772_105_44e-11, shape: 'sphere' },
  { id: 'proton', src: '/assets/cosmic-scale/plate-proton.webp', metres: PROTON, shape: 'sphere' },
]

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
}

function pageHtml() {
  return `<!doctype html>
<meta charset="utf-8">
<style>
  html, body { margin: 0; background: #02040a; }
  canvas { display: block; }
</style>
<canvas id="c" width="${WIDTH}" height="${HEIGHT}"></canvas>
<script>
const PLATES = ${JSON.stringify(PLATES)}
const MAX_FIELD_ZOOM = 2.75
const MIN_FIELD_CROP = 1 / MAX_FIELD_ZOOM
const images = new Map()

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}
function plateLog(plate) { return Math.log10(plate.metres) }
function platesLargeFirst() {
  return [...PLATES].sort((a, b) => b.metres - a.metres)
}
function bracketPlates(logWidth) {
  const plates = platesLargeFirst()
  const last = plates.length - 1
  if (logWidth >= plateLog(plates[0])) return { outer: plates[0], inner: plates[Math.min(1, last)], t: 1 }
  if (logWidth <= plateLog(plates[last])) return { outer: plates[Math.max(0, last - 1)], inner: plates[last], t: 0 }
  for (let i = 0; i < last; i++) {
    const outer = plates[i]
    const inner = plates[i + 1]
    const outerLog = plateLog(outer)
    const innerLog = plateLog(inner)
    if (logWidth <= outerLog && logWidth >= innerLog) {
      const span = outerLog - innerLog
      return { outer, inner, t: span === 0 ? 1 : (logWidth - innerLog) / span }
    }
  }
  return { outer: plates[0], inner: plates[Math.min(1, last)], t: 1 }
}
function fieldPastSharp(outerZoom) {
  const logZoom = Math.log10(Math.max(outerZoom, 1e-9))
  return clamp((logZoom - Math.log10(MAX_FIELD_ZOOM)) / 1.15, 0, 1)
}
function sourceSize(image) {
  return { width: image.naturalWidth, height: image.naturalHeight, ready: image.complete && image.naturalWidth > 1 }
}
function drawPlate(ctx, plate, source, size, width, height, alpha, keepVisible) {
  const media = sourceSize(source)
  if (alpha < 0.02 || !media.ready) return
  const canvasMin = Math.min(width, height)
  const cover = Math.max(width, height)
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  if (plate.shape === 'sphere') {
    const maxSphere = canvasMin * 0.9
    if (size > maxSphere && !keepVisible) { ctx.restore(); return }
    const drawSize = clamp(size, 0, maxSphere)
    if (drawSize <= 6) {
      ctx.fillStyle = 'rgba(230, 236, 255, 0.9)'
      ctx.beginPath()
      ctx.arc(0, 0, Math.max(1.2, drawSize), 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      return
    }
    const half = drawSize / 2
    ctx.beginPath()
    ctx.arc(0, 0, half, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(source, -half, -half, size, size)
    ctx.restore()
    return
  }
  if (size >= canvasMin * 0.92) {
    const zoom = Math.max(size / Math.max(cover, 1), 1)
    const crop = clamp(1 / zoom, MIN_FIELD_CROP, 1)
    const src = Math.min(media.width, media.height)
    const srcSize = src * crop
    const sx = (media.width - srcSize) / 2
    const sy = (media.height - srcSize) / 2
    const dest = cover * 1.02
    ctx.drawImage(source, sx, sy, srcSize, srcSize, -dest / 2, -dest / 2, dest, dest)
  } else if (size > 6) {
    const half = size / 2
    ctx.beginPath()
    ctx.roundRect(-half, -half, size, size, size * 0.02)
    ctx.clip()
    ctx.drawImage(source, -half, -half, size, size)
    const edge = ctx.createRadialGradient(0, 0, half * 0.78, 0, 0, half)
    edge.addColorStop(0, 'rgba(0,0,0,0)')
    edge.addColorStop(1, 'rgba(2, 4, 10, 0.28)')
    ctx.fillStyle = edge
    ctx.fillRect(-half, -half, size, size)
  } else {
    ctx.fillStyle = 'rgba(230, 236, 255, 0.9)'
    ctx.beginPath()
    ctx.arc(0, 0, Math.max(1.2, size), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}
function drawFrame(logWidth) {
  const canvas = document.getElementById('c')
  const ctx = canvas.getContext('2d', { alpha: false })
  const width = canvas.width
  const height = canvas.height
  ctx.fillStyle = '#02040a'
  ctx.fillRect(0, 0, width, height)
  const cx = width * 0.5
  const cy = height * 0.5
  const canvasMin = Math.min(width, height)
  const view = 10 ** logWidth
  const { outer, inner, t } = bracketPlates(logWidth)
  const coverFor = (plate) => plate.shape === 'sphere' ? canvasMin * 0.9 : Math.max(width, height) * 1.05
  ctx.save()
  ctx.translate(cx, cy)
  const outerImage = images.get(outer.id)
  const innerImage = images.get(inner.id)
  const outerCover = coverFor(outer)
  const innerCover = coverFor(inner)
  const outerPhysical = (outer.metres / view) * outerCover
  const outerZoom = outerPhysical / Math.max(outerCover, 1)
  const pastSharp = fieldPastSharp(outerZoom)
  if (outerImage) {
    const outerAlpha = outer.shape === 'sphere'
      ? clamp(0.2 + t * 0.8, 0.2, 1)
      : clamp(0.22 + t * 0.78, 0.22, 1) * (1 - pastSharp * 0.88)
    drawPlate(ctx, outer, outerImage, outerPhysical, width, height, outerAlpha)
  }
  if (inner.id !== outer.id && innerImage) {
    const physical = (inner.metres / view) * innerCover
    const handoff = Math.max(1 - t, pastSharp)
    const eased = inner.shape === 'sphere'
      ? physical
      : innerCover * (0.12 + 0.88 * Math.pow(handoff, 0.52))
    const innerIsFloor = inner.id === platesLargeFirst().at(-1)?.id
    drawPlate(ctx, inner, innerImage, Math.max(physical, eased), width, height, clamp(handoff * 1.55, 0, 1), innerIsFloor)
  }
  ctx.restore()
  const vignette = ctx.createRadialGradient(cx, cy, canvasMin * 0.28, cx, cy, canvasMin * 0.96)
  vignette.addColorStop(0, 'rgba(0,0,0,0)')
  vignette.addColorStop(0.78, 'rgba(0,0,0,0.08)')
  vignette.addColorStop(1, 'rgba(0,0,0,0.42)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, width, height)
}

async function loadImages() {
  await Promise.all(PLATES.map((plate) => new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => { images.set(plate.id, image); resolve() }
    image.onerror = () => reject(new Error(plate.src))
    image.src = plate.src
  })))
}

window.ready = loadImages()
window.renderFrame = drawFrame
</script>`
}

function startServer() {
  return new Promise((resolvePromise) => {
    const server = createServer((request, response) => {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1')
      if (url.pathname === '/' || url.pathname === '/render.html') {
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
        response.end(pageHtml())
        return
      }
      const file = resolve(publicDir, `.${url.pathname}`)
      if (!file.startsWith(publicDir) || !existsSync(file)) {
        response.writeHead(404)
        response.end()
        return
      }
      response.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
      createReadStream(file).pipe(response)
    })
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      resolvePromise({ server, port: address.port })
    })
  })
}

function encodeVideo() {
  return new Promise((resolvePromise, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-y',
      '-framerate', String(FPS),
      '-i', resolve(frameDir, 'f%05d.jpg'),
      '-c:v', 'libx264',
      '-preset', 'slow',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-g', '12',
      '-keyint_min', '12',
      '-sc_threshold', '0',
      '-an',
      '-movflags', '+faststart',
      outVideo,
    ], { stdio: 'inherit' })
    ffmpeg.on('exit', (code) => {
      if (code === 0) resolvePromise()
      else reject(new Error(`ffmpeg exited ${code}`))
    })
  })
}

const { server, port } = await startServer()
mkdirSync(frameDir, { recursive: true })
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 })
await page.goto(`http://127.0.0.1:${port}/render.html`, { waitUntil: 'load' })
await page.evaluate(() => window.ready)

console.log(`Rendering ${FRAMES} frames (${DURATION_S}s @ ${FPS}fps)`)
const started = Date.now()
for (let index = 0; index < FRAMES; index += 1) {
  const u = index / (FRAMES - 1)
  const logWidth = LOG_START + u * (LOG_END - LOG_START)
  await page.evaluate((log) => window.renderFrame(log), logWidth)
  const buffer = await page.locator('canvas').screenshot({ type: 'jpeg', quality: 92 })
  writeFileSync(resolve(frameDir, `f${String(index + 1).padStart(5, '0')}.jpg`), buffer)
  if (index % 48 === 0) {
    const elapsed = (Date.now() - started) / 1000
    const rate = (index + 1) / Math.max(elapsed, 0.01)
    console.log(`  ${index + 1}/${FRAMES}  ${rate.toFixed(1)} fps  log=${logWidth.toFixed(2)}`)
  }
}

await browser.close()
server.close()
console.log('Encoding')
await encodeVideo()
console.log(`Wrote ${outVideo}`)
console.log(JSON.stringify({ duration: DURATION_S, fps: FPS, frames: FRAMES, logStart: LOG_START, logEnd: LOG_END }))
