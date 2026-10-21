import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { findStaticVariable, staticLiteralValue } from './lib/static-typescript-data.mjs'

// Published cutouts are locked artifacts. --check verifies them without running ML.
// Regeneration requires macOS 14+, Swift, ImageMagick 7 and a fresh visual review.
const root = resolve(import.meta.dirname, '..')
const world = resolve(root, 'src/components/experiences/worlds/periodic-table')
const assetRoot = '/assets/worlds/periodic-table/cutouts'
const directory = resolve(root, `public${assetRoot}`)
const scratch = resolve(root, '.scratch/periodic-table-cutouts')
const check = process.argv.includes('--check')
const sourceImages = staticLiteralValue(findStaticVariable(resolve(world, 'display-images.ts'), 'displayImages'))
const sourcePath = (asset) => resolve(root, `public${asset}`)
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const run = (args, input) => execFileSync('magick', args, { input, maxBuffer: 16 * 1024 * 1024 })
const dimensions = (asset) => run(['identify', '-format', '%w %h', sourcePath(asset)]).toString().trim().split(' ').map(Number)
// These context plates must keep their complete experimental fields. Np's cork
// support is also part of the exhibit, although the instance detector misses it.
const borderOnly = { At: 8, Pa: 8, Po: 8, Np: 14 }
const manifestPath = resolve(directory, 'sources.json')
const prior = check ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null

function alphaStats(asset) {
  const alpha = run([sourcePath(asset), '-alpha', 'extract', '-depth', '8', 'gray:-'])
  let transparent = 0, opaque = 0
  for (const value of alpha) { if (value === 0) transparent++; if (value === 255) opaque++ }
  const result = { pixels: alpha.length, transparent, opaque, feathered: alpha.length - transparent - opaque }
  if (transparent < alpha.length * .1 || opaque < alpha.length * .02) throw new Error(`Invalid foreground mask: ${asset}`)
  return result
}

if (!check) {
  mkdirSync(directory, { recursive: true }); mkdirSync(scratch, { recursive: true })
  const reuse = process.argv.indexOf('--reviewed-inputs')
  if (reuse === -1) {
    execFileSync('swiftc', [resolve(root, 'scripts/lib/periodic-table-cutout.swift'), '-o', resolve(scratch, 'cutout')])
    execFileSync(resolve(scratch, 'cutout'), Object.entries(sourceImages).filter(([symbol]) => !borderOnly[symbol])
      .flatMap(([symbol, source]) => [sourcePath(source), resolve(scratch, `${symbol}.png`)]), { stdio: 'inherit', timeout: 300000 })
  }
}
const records = []
const map = {}
for (const [symbol, source] of Object.entries(sourceImages)) {
  const input = readFileSync(sourcePath(source))
  const sourceSha256 = hash(input)
  const [width, height] = dimensions(source)
  let record
  if (check) {
    record = prior.records.find(row => row.symbol === symbol)
    if (!record || record.source !== source || record.sourceSha256 !== sourceSha256) throw new Error(`Stale cutout source: ${symbol}`)
    const bytes = readFileSync(sourcePath(record.asset))
    if (hash(bytes) !== record.sha256 || bytes.length !== record.bytes) throw new Error(`Changed cutout: ${symbol}`)
    if (JSON.stringify(alphaStats(record.asset)) !== JSON.stringify(record.alpha)) throw new Error(`Changed alpha: ${symbol}`)
  } else {
    const reuse = process.argv.indexOf('--reviewed-inputs')
    const maskInput = borderOnly[symbol]
      ? run([sourcePath(source), '-fuzz', `${borderOnly[symbol]}%`, '-fill', 'none', '-draw', 'color 0,0 floodfill', 'png:-'])
      : readFileSync(resolve(reuse === -1 ? scratch : process.argv[reuse + 1], `${symbol}.png`))
    const mask = run(['-', '-alpha', 'extract', ...(borderOnly[symbol] ? ['-blur', '0x0.45'] : []), '-level', '1%,99%', 'png:-'], maskInput)
    // Copy only the mask onto the unchanged source RGB; never repaint material,
    // fill missing context, crop the photograph, or enlarge its resolution.
    const bytes = run([sourcePath(source), '-', '-alpha', 'off', '-compose', 'CopyOpacity', '-composite', '-strip',
      '-quality', '84', '-define', 'webp:method=6', 'webp:-'], mask)
    const sha256 = hash(bytes)
    const asset = `${assetRoot}/${symbol}-${sha256.slice(0, 12)}.webp`
    if (bytes.length > 250 * 1024) throw new Error(`Detail budget exceeded: ${symbol}`)
    writeFileSync(sourcePath(asset), bytes)
    record = { symbol, asset, sha256, bytes: bytes.length, width, height, source, sourceSha256,
      method: borderOnly[symbol] ? 'connected outer white background only' : 'Apple Vision foreground instances, all objects, revision 1',
      ...(borderOnly[symbol] ? { fuzzPercent: borderOnly[symbol], edgeBlur: .45 } : {}),
      alpha: alphaStats(asset) }
  }
  if (JSON.stringify(dimensions(record.asset)) !== JSON.stringify([width, height])) throw new Error(`Changed image bounds: ${symbol}`)
  records.push(record); map[symbol] = record.asset
}
const module = '// Generated by node scripts/generate-periodic-table-cutouts.mjs. Do not edit.\n' +
  `export const specimenCutouts: Readonly<Record<string, string>> = ${JSON.stringify(map, null, 2)}\n`
const modulePath = resolve(world, 'cutout-images.ts')
if (check) {
  if (prior.records.length !== records.length || readFileSync(modulePath, 'utf8') !== module) throw new Error('Stale cutout inventory')
} else {
  writeFileSync(modulePath, module)
  writeFileSync(manifestPath, JSON.stringify({
    tool: execFileSync('magick', ['-version'], { encoding: 'utf8' }).split('\n')[0],
    segmentation: 'Apple Vision VNGenerateForegroundInstanceMaskRequest revision 1',
    platform: execFileSync('sw_vers', ['-productVersion'], { encoding: 'utf8' }).trim(),
    recipe: 'Original RGB + foreground alpha; mask level 1%,99%; WebP quality 84, method 6. Original dimensions and sources retained.',
    records,
  }, null, 2) + '\n')
}
console.log(`${check ? 'Verified' : 'Generated'} ${records.length} real-alpha display images, ${records.reduce((n, row) => n + row.bytes, 0)} bytes.`)
