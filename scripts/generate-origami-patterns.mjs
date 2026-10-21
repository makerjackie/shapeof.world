import { createReadStream, existsSync } from 'node:fs'
import { mkdir, stat, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, normalize, relative, resolve } from 'node:path'
import { chromium } from 'playwright'

const PATTERNS = [
  { id: 'waterbomb', source: 'Tessellations/huffmanWaterbomb.svg' },
  { id: 'miura', source: 'Tessellations/miura-ori.svg' },
  { id: 'square-twist', source: 'Origami/singlesquaretwist.svg' },
  { id: 'traditional-crane', source: 'Origami/traditionalCrane.svg' },
  { id: 'flapping-bird', source: 'Origami/flappingBird.svg' },
  { id: 'paper-airplane', source: 'Origami/airplane.svg' },
  { id: 'cardinal', source: 'Origami/langCardinal.svg' },
  { id: 'dragon', source: 'Origami/langKnlDragon.svg' },
  { id: 'whirlpool', source: 'Tessellations/whirlpool.svg' },
  { id: 'huffman-boxes', source: 'Tessellations/huffmanExtrudedBoxes.svg' },
  { id: 'resch-barbell', source: 'Tessellations/reschBarbell.svg' },
  { id: 'origami-sphere', source: 'Curved/Origami_Sphere_16Flaps.svg', curved: true },
  { id: 'rotating-star', source: 'Curved/Rotating_Star.svg', curved: true },
  { id: 'leafy-opus', source: 'Curved/Leafy_Opus_T-69.svg', curved: true },
  { id: 'miyamoto-tower', source: 'Kirigami/miyamotoTower.svg' },
  { id: 'castle-popup', source: 'Popup/castlePopup.svg' },
  { id: 'bird-base', source: 'Bases/birdBase.svg' },
]

const args = process.argv.slice(2)
const upstreamArg = args[0]
const outputArg = args[1]

if (!upstreamArg || !outputArg) {
  console.error(
    'Usage: node scripts/generate-origami-patterns.mjs <OrigamiSimulator checkout> <output directory>',
  )
  process.exit(1)
}

const upstreamRoot = resolve(upstreamArg)
const outputRoot = resolve(outputArg)
const indexPath = join(upstreamRoot, 'index.html')

if (!existsSync(indexPath)) {
  console.error(`OrigamiSimulator index.html not found: ${indexPath}`)
  process.exit(1)
}

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.fold': 'application/json; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0])
  const candidate = normalize(join(upstreamRoot, decoded === '/' ? 'index.html' : decoded))
  return relative(upstreamRoot, candidate).startsWith('..') ? null : candidate
}

const server = createServer(async (request, response) => {
  const filePath = safePath(request.url ?? '/')
  if (!filePath) {
    response.writeHead(403).end('Forbidden')
    return
  }

  try {
    const fileStat = await stat(filePath)
    const resolvedPath = fileStat.isDirectory() ? join(filePath, 'index.html') : filePath
    response.writeHead(200, {
      'Content-Type': mimeTypes[extname(resolvedPath)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    })
    createReadStream(resolvedPath).pipe(response)
  } catch {
    response.writeHead(404).end('Not found')
  }
})

await new Promise((resolveServer) => server.listen(0, '127.0.0.1', resolveServer))
const address = server.address()
if (!address || typeof address === 'string') throw new Error('Unable to start local server')
const baseUrl = `http://127.0.0.1:${address.port}`

await mkdir(outputRoot, { recursive: true })
const browser = await chromium.launch({ headless: true })

try {
  for (const pattern of PATTERNS) {
    const page = await browser.newPage()
    page.on('console', (message) => {
      if (message.type() === 'error' && !message.text().includes('googletagmanager')) {
        console.warn(`[${pattern.id}] browser: ${message.text()}`)
      }
    })

    // Upstream's query parser does not decode `model`, so keep path
    // separators intact and only escape characters that cannot appear in a URL.
    const url = `${baseUrl}/?model=${encodeURI(pattern.source)}`
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await page.waitForFunction(
      ({ filename, curved }) => {
        const current = globalThis.globals
        if (!current || current.filename !== filename) return false
        const processor = curved ? current.curvedFolding : current.pattern
        const data = processor?.getFoldData?.()
        return Boolean(
          data?.vertices_coords?.length
          && data?.edges_vertices?.length
          && data?.faces_vertices?.length,
        )
      },
      {
        filename: pattern.source.split('/').at(-1).replace(/\.(svg|fold)$/i, ''),
        curved: Boolean(pattern.curved),
      },
      { timeout: 60_000 },
    )

    const data = await page.evaluate((curved) => {
      const processor = curved ? globalThis.globals.curvedFolding : globalThis.globals.pattern
      return processor.getFoldData()
    }, Boolean(pattern.curved))

    const outputPath = join(outputRoot, `${pattern.id}.json`)
    await writeFile(outputPath, `${JSON.stringify(data, null, 2)}\n`)
    console.log(
      `${pattern.id}: ${data.vertices_coords.length} vertices, `
      + `${data.faces_vertices.length} faces, ${data.edges_vertices.length} edges`,
    )
    await page.close()
  }
} finally {
  await browser.close()
  await new Promise((resolveServer, rejectServer) => {
    server.close((error) => (error ? rejectServer(error) : resolveServer()))
  })
}
