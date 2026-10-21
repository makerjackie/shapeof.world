import {existsSync, mkdirSync, statSync} from 'node:fs'
import {basename, resolve} from 'node:path'
import {spawnSync} from 'node:child_process'

import {readArchivedWorldIds, readWorldCatalogFiles} from './lib/world-catalog-source.mjs'

/**
 * 生成分享卡片（public/assets/posters/social/<id>.jpg）。
 *
 * 为什么单独一套，而不是复用桌面海报：
 * 1. **格式**：桌面海报是 WebP。微信内置浏览器与微信/微博的分享卡片对 WebP
 *    的 OG 预览支持不可靠——分享出去经常只剩一条光秃秃的链接。JPEG 到处都能渲染。
 * 2. **比例**：桌面海报是 16:10（3200×2000），而 OG 卡片是 1.91:1。
 *    按 1200×630 声明、却给一张 16:10 的图，各平台会自己裁，构图必然被切坏。
 * 3. **体积**：桌面海报单张 600 KB 上下，部分抓取器有超时和体积上限。
 *
 * 不在图上压标题：OG 的 title/description 已经由平台单独渲染，压上去会重复；
 * 而且中英双语会让卡片数量翻倍。只留一个角标，保证被截图转发时仍可归属。
 *
 * 默认为所有未归档世界补缺失卡片（制作中的世界仍可被直达分享）。
 * 指定 `ONEWORLD_POSTER_IDS` 或 `ONEWORLD_POSTER_FORCE=1` 时覆盖已有文件。
 */
const root = resolve(import.meta.dirname, '..')
const catalogFiles = readWorldCatalogFiles(root)
const outputDirectory = resolve(root, 'public/assets/posters/social')
const width = 1200
const height = 630
const maxKilobytes = 200

const posterPattern = /\bid:\s*'([^']+)'[\s\S]*?\bposter:\s*'([^']+)'[\s\S]*?\bposterPosition:\s*'([^']+)'/u
const archivedIds = readArchivedWorldIds(root)
const requestedIds = new Set((process.env.ONEWORLD_POSTER_IDS ?? '').split(',').map((id) => id.trim()).filter(Boolean))
const posters = catalogFiles.flatMap(({source}) => {
  const match = source.match(posterPattern)
  return match ? [{id: match[1], poster: match[2], position: match[3]}] : []
}).filter((poster) => requestedIds.size > 0
  ? requestedIds.has(poster.id)
  : !archivedIds.has(poster.id))

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

const forceExisting = requestedIds.size > 0 || process.env.ONEWORLD_POSTER_FORCE === '1'
let totalBytes = 0
let generated = 0
let skipped = 0
let oversize = 0
const missing = []

for (const poster of posters) {
  const source = resolve(root, 'public', poster.poster.replace(/^\/+/, ''))
  const output = resolve(outputDirectory, `${poster.id}.jpg`)

  if (!existsSync(source)) {
    missing.push(poster.id)
    continue
  }

  if (!forceExisting && existsSync(output)) {
    skipped += 1
    continue
  }

  const qualities = [82, 76, 70, 64]
  let bytes = 0
  let usedQuality = qualities[0]
  for (const quality of qualities) {
    usedQuality = quality
    // 先按 1.91:1 重心裁切，再压一层底部渐变承载角标，避免亮画面上的白字看不清。
    runMagick([
      source,
      '-filter', 'Lanczos',
      '-resize', `${width}x${height}^`,
      '-gravity', imageGravity(poster.position),
      '-extent', `${width}x${height}`,
      '(', '-size', `${width}x160`, 'gradient:none-rgba(0,0,0,0.55)', ')',
      '-gravity', 'South', '-composite',
      '-gravity', 'SouthWest',
      '-pointsize', '26',
      '-fill', 'rgba(255,255,255,0.82)',
      '-annotate', '+40+34', 'shapeof.world',
      '-strip',
      '-interlace', 'Plane',
      '-sampling-factor', '4:2:0',
      '-quality', String(quality),
      output,
    ], poster.id)
    bytes = statSync(output).size
    if (bytes <= maxKilobytes * 1024) break
  }

  totalBytes += bytes
  generated += 1
  const kilobytes = Math.round(bytes / 1024)
  if (kilobytes > maxKilobytes) {
    oversize += 1
    console.warn(`${poster.id}: social card larger than ${maxKilobytes} KB (${kilobytes} KB)`)
  }
  console.log(
    `${poster.id.padEnd(30)} ${basename(output)} ${kilobytes} KB`
    + (usedQuality !== qualities[0] ? ` q${usedQuality}` : ''),
  )
}

if (missing.length > 0) {
  console.warn(`\nMissing source posters, no card generated for: ${missing.join(', ')}`)
}
console.log(
  `\nGenerated ${generated} social cards at ${width} × ${height}, `
  + `${Math.round(totalBytes / 1024)} KB total`
  + (skipped > 0 ? `, ${skipped} already present` : '')
  + (oversize > 0 ? `, ${oversize} over ${maxKilobytes} KB` : '')
  + (missing.length > 0 ? `, ${missing.length} missing source` : '')
  + '.',
)
