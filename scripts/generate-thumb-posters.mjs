import {existsSync, mkdirSync, statSync} from 'node:fs'
import {basename, resolve} from 'node:path'
import {spawnSync} from 'node:child_process'

import {isPublicWorldSource, readArchivedWorldIds, readWorldCatalogFiles} from './lib/world-catalog-source.mjs'

/**
 * 生成目录卡 384×256 缩略图，以及首页知识星球用的 128×86 小图。
 * 源图与桌面海报一致（world catalogue 的 poster 字段），按 posterPosition 裁剪。
 * ONEWORLD_POSTER_KIND=thumb|orb 只生成其中一种。
 */
const root = resolve(import.meta.dirname, '..')
const catalogFiles = readWorldCatalogFiles(root)
const catalogSourceById = new Map(catalogFiles.map(({source}) => [source.match(/^\s*id:\s*'([^']+)'/mu)?.[1], source]))
const kind = process.env.ONEWORLD_POSTER_KIND
const variants = [
  {
    name: 'thumb',
    directory: resolve(root, 'public/assets/posters/thumb'),
    width: 384,
    height: 256,
    quality: '72',
    warnBytes: 25_000,
  },
  {
    name: 'orb',
    directory: resolve(root, 'public/assets/posters/orb'),
    width: 128,
    height: 86,
    quality: '58',
    warnBytes: 6_000,
  },
].filter((variant) => !kind || kind === variant.name)

const cropOverrides = {
  // The trajectory comparison occupies the upper half of the globe; a closer
  // crop keeps all three paths legible in the catalogue card.
  // 对准偏左下的黑洞口取景：大字更清楚，文件也压进 25KB 预算。
  'equation-wormhole': '1100x734+560+700',
  // Keep the spiral core in the small catalogue crop; the landscape master
  // leaves empty stage on the left for overlays.
  // 峡谷四球竞速的中段轨迹集中在画面中上：收紧裁剪让四条彩色轨迹在缩略图里可辨。
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

if (variants.length === 0) throw new Error(`Unknown ONEWORLD_POSTER_KIND=${kind}`)

for (const variant of variants) {
  mkdirSync(variant.directory, {recursive: true})
}

let totalBytes = 0
let generated = 0
for (const poster of posters) {
  const source = resolve(root, 'public', poster.poster.replace(/^\/+/, ''))
  if (!existsSync(source)) {
    console.warn(`${poster.id}: missing source ${source}, skipped`)
    continue
  }

  const crop = cropOverrides[poster.id]
  for (const variant of variants) {
    const output = resolve(variant.directory, `${poster.id}.webp`)
    runMagick(crop
      ? [
          source,
          '-crop', crop,
          '+repage',
          '-filter', 'Lanczos',
          '-resize', `${variant.width}x${variant.height}!`,
          '-strip',
          '-define', 'webp:method=6',
          '-quality', variant.quality,
          output,
        ]
      : [
          source,
          '-filter', 'Lanczos',
          '-resize', `${variant.width}x${variant.height}^`,
          '-gravity', imageGravity(poster.position),
          '-extent', `${variant.width}x${variant.height}`,
          '-strip',
          '-define', 'webp:method=6',
          '-quality', variant.quality,
          output,
        ], `${poster.id} ${variant.name}`)

    const bytes = statSync(output).size
    totalBytes += bytes
    generated += 1
    if (bytes > variant.warnBytes) {
      console.warn(`${poster.id}: ${variant.name} larger than ${Math.round(variant.warnBytes / 1024)} KB (${Math.round(bytes / 1024)} KB)`)
    }
    console.log(`${poster.id.padEnd(30)} ${variant.name}/${basename(output)} ${Math.round(bytes / 1024)} KB`)
  }
}

console.log(`Generated ${generated} images, ${Math.round(totalBytes / 1024)} KB total.`)
