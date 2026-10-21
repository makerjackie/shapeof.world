// Most worlds derive a portrait from the master. Worlds registered for native
// portrait composition are recaptured at BASE_URL (default localhost:3000), so
// run a preview server before generating a batch that includes them.
import {existsSync, mkdirSync, statSync} from 'node:fs'
import {basename, resolve} from 'node:path'
import {spawnSync} from 'node:child_process'

import {isPublicWorldSource, readArchivedWorldIds, readWorldCatalogFiles} from './lib/world-catalog-source.mjs'
import {nativePortraitWorldIds} from './lib/world-poster-recipes.mjs'

const root = resolve(import.meta.dirname, '..')
const catalogFiles = readWorldCatalogFiles(root)
const catalogSourceById = new Map(catalogFiles.map(({source}) => [source.match(/^\s*id:\s*'([^']+)'/mu)?.[1], source]))
const outputDirectory = resolve(root, 'public/assets/posters/mobile')
const width = 1170
const height = 2532
const minimumBytes = 20_000

const sourceOverrides = {
  perseverance: resolve(root, 'scripts/poster-sources/perseverance-nasa.png'),
  // 竖屏单独取景：黑洞口在左下，近处大字公式清晰。
  'equation-wormhole': resolve(root, 'scripts/poster-sources/equation-wormhole-mobile.png'),
  // 竖屏单独取景：浑仪主体窄高，横版母图裁切会切掉两侧金环。
  // 竖屏单独取景：横版母图居中裁切会把星系亮核放大到糊掉，竖版保留旋臂与晕。
  'dark-universe': resolve(root, 'scripts/poster-sources/dark-universe-mobile.png'),
  // 竖屏单独取景：横版母图把星系放在右侧留白，居中裁切会切掉核。
  // 竖屏单独取景：保留两道虹的顶部与地平线，避免横版居中裁切丢失副虹。
  rainbow: resolve(root, 'scripts/poster-sources/rainbow-mobile.webp'),
  // 竖屏独立取景：保留经济小镇的纵向产业链，横版裁切会丢失上游与家庭。
  'tshirt-world': resolve(root, 'scripts/poster-sources/tshirt-world-mobile.webp'),
  // 独立图鉴构图：保留完整粒子家族，避免竖屏裁掉两侧。
  'standard-model': resolve(root, 'scripts/poster-sources/standard-model-mobile.webp'),
  // 竖屏独立取景：保留雪花六个分枝和霜粒，横版裁切会截断冰枝。
  'snowflake-journey': resolve(root, 'scripts/poster-sources/snowflake-journey-mobile.webp'),
  // 竖屏独立取景：保留未来与过去光锥，避免横版裁切截断边界。
  'light-speed': resolve(root, 'scripts/poster-sources/light-speed-mobile.webp'),
  // 竖屏独立取景：琴头、琴颈、音孔与扩散的声波同框，横版母图居中裁切会切掉琴身两侧。
  ukulele: resolve(root, 'scripts/poster-sources/ukulele-mobile.webp'),
}

const stagedPosters = new Set(['cow-anatomy'])
const darkStages = {
  'cow-anatomy': 'xc:#050605',
}

const stagedGeometry = {
  'cow-anatomy': '-40+600',
}

const stagedResize = {
  'cow-anatomy': '1480x1200>',
}

// 极暗画面在高压缩下会低于体积下限，单独提高质量（但不可超过 800KB 上限）
const qualityOverrides = {
  tides: '95',
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

const nativePortraits = posters.filter(({id}) => nativePortraitWorldIds.has(id))
if (nativePortraits.length > 0) {
  const capture = spawnSync(process.execPath, ['scripts/capture-world-posters.mjs'], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      ONEWORLD_POSTER_IDS: nativePortraits.map(({id}) => id).join(','),
      ONEWORLD_POSTER_FORMAT: 'mobile',
    },
  })
  if (capture.status !== 0) throw new Error('Native portrait capture failed; start the preview server and set BASE_URL.')
}

for (const poster of posters) {
  if (nativePortraitWorldIds.has(poster.id)) continue
  const source = sourceOverrides[poster.id]
    ?? resolve(root, 'public', poster.poster.replace(/^\/+/, ''))
  const output = resolve(outputDirectory, `${poster.id}.webp`)

  if (!existsSync(source)) throw new Error(`${poster.id}: missing source ${source}`)

  if (stagedPosters.has(poster.id)) {
    runMagick([
      '-size', `${width}x${height}`,
      darkStages[poster.id],
      '(', source,
      '-filter', 'Lanczos',
      '-resize', stagedResize[poster.id],
      '-adaptive-sharpen', '0x0.8',
      ')',
      '-gravity', 'North',
      '-geometry', stagedGeometry[poster.id],
      '-composite',
      '-strip',
      '-define', 'webp:method=6',
      '-quality', poster.id === 'euler-characteristic-cabinet' || poster.id === 'continued-fraction-bakery' || poster.id === 'de-casteljau-atelier' ? '97' : '88',
      output,
    ], poster.id)
  } else {
    runMagick([
      source,
      '-filter', 'Lanczos',
      '-resize', `${width}x${height}^`,
      '-gravity', imageGravity(poster.position),
      '-extent', `${width}x${height}`,
      '-adaptive-sharpen', '0x0.9',
      '-strip',
      '-define', 'webp:method=6',
      '-quality', qualityOverrides[poster.id] ?? '93',
      output,
    ], poster.id)

    if (statSync(output).size < minimumBytes) {
      runMagick([
        source,
        '-filter', 'Lanczos',
        '-resize', `${width}x${height}^`,
        '-gravity', imageGravity(poster.position),
        '-extent', `${width}x${height}`,
        '-adaptive-sharpen', '0x0.9',
        '-strip',
        '-define', 'webp:method=0',
        '-quality', '100',
        output,
      ], `${poster.id} sparse-scene fallback`)
    }
  }

  const kilobytes = Math.round(statSync(output).size / 1024)
  console.log(`${poster.id.padEnd(30)} ${basename(output)} ${kilobytes} KB`)
}

console.log(`Generated ${posters.length} mobile posters at ${width} × ${height}.`)
