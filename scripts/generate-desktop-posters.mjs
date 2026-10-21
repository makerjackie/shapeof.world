import {existsSync, mkdirSync, statSync} from 'node:fs'
import {basename, resolve} from 'node:path'
import {spawnSync} from 'node:child_process'

import {isPublicWorldSource, readArchivedWorldIds, readWorldCatalogFiles} from './lib/world-catalog-source.mjs'

const root = resolve(import.meta.dirname, '..')
const catalogFiles = readWorldCatalogFiles(root)
const catalogSourceById = new Map(catalogFiles.map(({source}) => [source.match(/^\s*id:\s*'([^']+)'/mu)?.[1], source]))
const outputDirectory = resolve(root, 'public/assets/posters/desktop')
const width = 3200
const height = 2000
const minimumBytes = 30_000

const sourceOverrides = {
  perseverance: resolve(root, 'scripts/poster-sources/perseverance-nasa.png'),
}

// 极暗画面在高压缩下会低于体积下限，单独提高质量
const qualityOverrides = {
  tides: '100',
  'visual-illusions': '100',
  'illusion-lilac-chaser': '100',
}

const posterPattern = /\{\n\s+id: '([^']+)'[\s\S]*?\n\s+poster: '([^']+)'[\s\S]*?\n\s+posterPosition: '([^']+)'/g
const archivedIds = readArchivedWorldIds(root)
const requestedPosterIds = new Set((process.env.ONEWORLD_POSTER_IDS ?? '').split(',').map((id) => id.trim()).filter(Boolean))
const posters = catalogFiles.flatMap(({source}) => [...source.matchAll(posterPattern)]).map((match) => ({
  id: match[1],
  poster: match[2],
  position: match[3],
})).filter((poster) => requestedPosterIds.size > 0
  ? requestedPosterIds.has(poster.id)
  : isPublicWorldSource(catalogSourceById.get(poster.id) ?? '') && !archivedIds.has(poster.id))

if (posters.length === 0) throw new Error('No world posters found in the world catalogues')

function imageGravity(position) {
  const [x = 50, y = 50] = position.split(/\s+/).map((value) => Number.parseFloat(value))
  const horizontal = x < 44 ? 'West' : x > 56 ? 'East' : ''
  const vertical = y < 44 ? 'North' : y > 56 ? 'South' : ''
  return `${vertical}${horizontal}` || 'Center'
}

function runMagick(args, label) {
  const result = spawnSync('magick', args, {cwd: root, stdio: 'inherit'})
  if (result.error?.code === 'ENOENT') {
    throw new Error('ImageMagick is required. Install it with `brew install imagemagick`.')
  }
  if (result.status !== 0) throw new Error(`Failed to generate ${label}`)
}

mkdirSync(outputDirectory, {recursive: true})

for (const poster of posters) {
  const source = sourceOverrides[poster.id]
    ?? resolve(root, 'public', poster.poster.replace(/^\/+/, ''))
  const output = resolve(outputDirectory, `${poster.id}.webp`)

  if (!existsSync(source)) throw new Error(`${poster.id}: missing source ${source}`)

  runMagick([
    source,
    '-filter', 'Lanczos',
    '-resize', `${width}x${height}^`,
    '-gravity', imageGravity(poster.position),
    '-extent', `${width}x${height}`,
    '-adaptive-sharpen', '0x1.15',
    '-strip',
    '-define', 'webp:method=6',
    '-quality', qualityOverrides[poster.id] ?? '90',
    output,
  ], poster.id)

  if (statSync(output).size < minimumBytes) {
    runMagick([
      source,
      '-filter', 'Lanczos',
      '-resize', `${width}x${height}^`,
      '-gravity', imageGravity(poster.position),
      '-extent', `${width}x${height}`,
      '-adaptive-sharpen', '0x1.15',
      '-strip',
      '-define', 'webp:method=0',
      '-quality', '100',
      output,
    ], `${poster.id} sparse-scene fallback`)
  }

  const kilobytes = Math.round(statSync(output).size / 1024)
  console.log(`${poster.id.padEnd(30)} ${basename(output)} ${kilobytes} KB`)
}

console.log(`Generated ${posters.length} desktop posters at ${width} × ${height}.`)
