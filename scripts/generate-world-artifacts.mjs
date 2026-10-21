import { assertWorldRouteNames } from '../src/lib/world-route-names.ts'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import {
  compileWorld,
  projectOfflineWorldRecord,
  projectPublicWorldCard,
  projectPublicWorldDetail,
  projectWorldSearchDocument,
} from './lib/compile-world.mjs'
import officialWorldIndex from '../src/data/generated/official-world-index.json' with { type: 'json' }

import { readWorldCatalogFiles } from './lib/world-catalog-source.mjs'
import { findStaticVariable, readStaticDefaultExport, staticLiteralValue } from './lib/static-typescript-data.mjs'
import { isWorldDiscoverable, resolveWorldState } from './lib/world-lifecycle.mjs'
import { worldFirstSeen, worldLastModified } from './lib/world-poster-dates.mjs'

const root = resolve(import.meta.dirname, '..')
const pageSize = 48
// A remainder this small is folded into the previous page instead of hiding behind a "show more" button.
const tailAbsorb = 12
const bucketCount = 256

function writeJson(path, value) {
  mkdirSync(resolve(path, '..'), {recursive: true})
  const output = `${JSON.stringify(value, null, 2)}\n`
  if (!existsSync(path) || readFileSync(path, 'utf8') !== output) writeFileSync(path, output)
}

function hashWorldId(worldId) {
  let hash = 0x811c9dc5
  for (let index = 0; index < worldId.length; index += 1) {
    hash ^= worldId.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

function paginate(items) {
  const pages = []
  for (let index = 0; index < items.length; index += pageSize) pages.push(items.slice(index, index + pageSize))
  if (pages.length > 1 && pages[pages.length - 1].length <= tailAbsorb) {
    const tail = pages.pop()
    pages[pages.length - 1] = [...pages[pages.length - 1], ...tail]
  }
  return pages
}

function normalizeSearch(value) {
  return value.normalize('NFKC').toLocaleLowerCase().replace(/\s+/gu, ' ').trim()
}

const catalogFiles = readWorldCatalogFiles(root)
const catalogWorlds = catalogFiles.map(({path}) => readStaticDefaultExport(path))
assertWorldRouteNames(catalogWorlds.map(world => world.id))
const catalogPathById = new Map(catalogFiles.map((file, index) => [
  catalogWorlds[index].id,
  relative(root, file.path),
]))
const summaries = JSON.parse(readFileSync(join(root, 'src/data/generated/world-summaries.json'), 'utf8'))
const summaryById = new Map(summaries.map((world) => [world.id, world]))
const publicIds = new Set(summaries.map((world) => world.id))

const categoriesDirectory = join(root, 'src/data/content-graph/categories')
const categories = readdirSync(categoriesDirectory, {withFileTypes: true})
  .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
  .map((entry) => readStaticDefaultExport(join(categoriesDirectory, entry.name)))
const categoryById = new Map(categories.map((category) => [category.id, category]))
const recommendedWorldIds = staticLiteralValue(
  findStaticVariable(join(root, 'src/data/home-recommended.ts'), 'recommendedWorldIds'),
)
const FLAGSHIP_CAPACITY = 20
const flagshipIds = new Set(recommendedWorldIds.slice(0, FLAGSHIP_CAPACITY))
const DEFAULT_CATALOG_QUALITY = 0.35
const DEFAULT_CATALOG_FRESHNESS = 0.5
const DEFAULT_CATALOG_JITTER = 0.12
const DEFAULT_CATALOG_HALF_LIFE_DAYS = 90
const HOME_FRESH_LIMIT = 6

function categoryAncestors(categoryId) {
  const result = new Set()
  const visit = (id) => {
    if (result.has(id)) return
    result.add(id)
    const category = categoryById.get(id)
    if (!category) throw new Error(`Unknown Category ${id}`)
    for (const parentId of [category.primaryParentId, ...(category.additionalParentIds ?? [])]) {
      if (parentId) visit(parentId)
    }
  }
  visit(categoryId)
  return result
}

function worldState(world) {
  return resolveWorldState(world)
}

const publicWorlds = summaries.map((summary) => {
  const source = catalogWorlds.find((world) => world.id === summary.id)
  if (!source) throw new Error(`Missing source catalogue record for ${summary.id}`)
  return {
    ...source,
    ...summary,
    // Directory summaries intentionally omit long-form copy. Keep the complete
    // translations in detail artifacts used by the experience and SSR metadata.
    translations: {
      ...source.translations,
      en: {...source.translations.en, ...summary.translations.en},
    },
    related: source.related.filter((id) => publicIds.has(id)),
  }
})
const publicIndexById = new Map(publicWorlds.map((world, index) => [world.id, index]))

const artifactDirectory = join(root, 'public/generated/world-artifacts')
rmSync(artifactDirectory, {recursive: true, force: true})
mkdirSync(artifactDirectory, {recursive: true})
writeJson(join(artifactDirectory, 'exploration.json'), summaries.map((world) => world.id))

const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim()
const releaseId = `local-${sourceCommit.slice(0, 8)}`
const compileReports = []
const buckets = Array.from({length: bucketCount}, () => ({}))
let artifactCount = 0
for (const sourceWorld of catalogWorlds) {
  const state = worldState(sourceWorld)
  if (state === 'rights-blocked') continue
  const publicIndex = publicIndexById.get(sourceWorld.id)
  const sourceArtifactWorld = publicIndex === undefined ? sourceWorld : publicWorlds[publicIndex]
  const world = {
    ...sourceArtifactWorld,
    related: sourceArtifactWorld.related.filter((id) => resolveWorldState({id}) !== 'rights-blocked'),
  }
  const navigationIndex = publicIndex ?? 0
  const navigation = publicWorlds.length === 0
    ? undefined
    : {
        previousWorldId: publicWorlds[(navigationIndex - 1 + publicWorlds.length) % publicWorlds.length]?.id,
        nextWorldId: publicWorlds[(navigationIndex + (publicIndex === undefined ? 0 : 1)) % publicWorlds.length]?.id,
        randomWorldIds: Array.from({length: Math.min(12, Math.max(0, publicWorlds.length - 1))}, (_, offset) => (
          publicWorlds[(navigationIndex + offset + 1) % publicWorlds.length].id
        )).filter((id) => id !== sourceWorld.id),
      }
  const packId = officialWorldIndex.worlds[sourceWorld.id]?.packId
  const ir = compileWorld({
    world,
    state,
    sourceCommit,
    releaseId,
    packId,
  })
  const card = projectPublicWorldCard(ir)
  const detail = projectPublicWorldDetail(ir)
  const search = projectWorldSearchDocument(ir)
  const offline = projectOfflineWorldRecord(ir, packId)
  compileReports.push({
    id: ir.id,
    adapter: ir.adapter,
    capabilities: ir.runtime.capabilities,
    contentRevision: ir.contentRevision,
  })
  const bucket = hashWorldId(sourceWorld.id) % bucketCount
  buckets[bucket][sourceWorld.id] = {
    schemaVersion: 1,
    state,
    world,
    card,
    detail,
    search,
    offline,
    sourceCommit,
    contentRevision: ir.contentRevision,
    releaseId,
    navigation,
  }
  artifactCount += 1
}
writeJson(join(artifactDirectory, 'compile-report.json'), {
  schemaVersion: 1,
  sourceCommit,
  releaseId,
  reports: compileReports,
})
for (const [bucket, records] of buckets.entries()) {
  if (Object.keys(records).length === 0) continue
  writeJson(join(artifactDirectory, 'details', `${bucket.toString(16).padStart(2, '0')}.json`), records)
}

const firstSeenDates = JSON.parse(readFileSync(join(root, 'src/data/generated/world-first-seen.json'), 'utf8'))
const releaseDates = { ...firstSeenDates }
const releases = staticLiteralValue(findStaticVariable(join(root, 'src/data/changelog.ts'), 'changelogReleases'))
for (const release of releases) {
  for (const id of release.majorUpdateWorldIds ?? []) {
    if (publicIds.has(id) && release.date > (releaseDates[id] ?? '')) releaseDates[id] = release.date
  }
}
function defaultCatalogScore(worldId) {
  const quality = flagshipIds.has(worldId) ? DEFAULT_CATALOG_QUALITY : 0
  const released = releaseDates[worldId]
  const ageDays = released ? Math.max(0, (Date.now() - Date.parse(released)) / 86_400_000) : 400
  const freshness = Math.exp(-ageDays / DEFAULT_CATALOG_HALF_LIFE_DAYS)
  const jitter = ((hashWorldId(worldId) % 1000) / 1000) * DEFAULT_CATALOG_JITTER
  return quality + freshness * DEFAULT_CATALOG_FRESHNESS + jitter
}
const sortedSummaries = {
  catalogue: summaries,
  newest: [...summaries].sort((left, right) => (releaseDates[right.id] ?? '').localeCompare(releaseDates[left.id] ?? '') || left.id.localeCompare(right.id)),
  recommended: [...summaries].sort((left, right) => (
    defaultCatalogScore(right.id) - defaultCatalogScore(left.id)
    || Number(left.index) - Number(right.index)
  )),
}

const allPages = paginate(sortedSummaries.catalogue)
for (const [sort, sortedWorlds] of Object.entries(sortedSummaries)) {
  for (const [index, page] of paginate(sortedWorlds).entries()) {
    writeJson(join(artifactDirectory, 'pages', sort, `${String(index + 1).padStart(4, '0')}.json`), page)
  }
}

const categoryEntries = []
for (const category of categories.filter((item) => (item.publication ?? 'draft') === 'public')) {
  const categoryWorlds = summaries.filter((world) => {
    const memberships = [world.primaryCategoryId, ...(world.additionalCategoryIds ?? [])]
    return memberships.some((membership) => categoryAncestors(membership).has(category.id))
  })
  const pages = paginate(categoryWorlds)
  for (const [sort, sortedWorlds] of Object.entries(sortedSummaries)) {
    const categoryIds = new Set(categoryWorlds.map((world) => world.id))
    const sortedCategoryWorlds = sortedWorlds.filter((world) => categoryIds.has(world.id))
    for (const [index, page] of paginate(sortedCategoryWorlds).entries()) {
      writeJson(join(artifactDirectory, 'pages', 'categories', category.id, sort, `${String(index + 1).padStart(4, '0')}.json`), page)
    }
  }
  categoryEntries.push({id: category.id, count: categoryWorlds.length, pageCount: pages.length})
}

for (const locale of ['zh', 'en']) {
  const searchDocuments = summaries.map((world) => {
    const copy = locale === 'zh' ? world : world.translations.en
    return {
      text: normalizeSearch([
        world.id,
        copy.title,
        copy.posterTitle,
        copy.posterHook,
        copy.question,
        copy.topicLabel,
      ].filter(Boolean).join(' ')),
      world,
    }
  })
  writeJson(join(artifactDirectory, 'search', `${locale}.json`), searchDocuments)
}

const pathWorldIds = readdirSync(join(root, 'src/data/content-graph/paths'), {withFileTypes: true})
  .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
  .map((entry) => readStaticDefaultExport(join(root, 'src/data/content-graph/paths', entry.name)))
  .filter((path) => path.publication === 'public')
  .flatMap((path) => path.worldIds)
const freshWorldIds = summaries.map((world) => world.id)
  .sort((left, right) => (releaseDates[right] ?? '').localeCompare(releaseDates[left] ?? '') || left.localeCompare(right))
  .slice(0, HOME_FRESH_LIMIT)
const bootstrapIds = new Set([
  ...recommendedWorldIds.filter((id) => publicIds.has(id)),
  ...sortedSummaries.recommended.slice(0, 64).map((world) => world.id),
  ...pathWorldIds,
  ...freshWorldIds,
])
for (const category of categories.filter((item) => !item.primaryParentId && (item.publication ?? 'draft') === 'public')) {
  const rootWorlds = summaries.filter((world) => (
    [world.primaryCategoryId, ...(world.additionalCategoryIds ?? [])]
      .some((membership) => categoryAncestors(membership).has(category.id))
  ))
  for (const world of rootWorlds.slice(0, 6)) bootstrapIds.add(world.id)
}
function slimHomeBootstrapWorld(world) {
  if (!world) return world
  const english = world.translations?.en ?? {}
  return {
    id: world.id,
    index: world.index,
    title: world.title,
    posterTitle: world.posterTitle,
    posterHook: world.posterHook,
    posterPosition: world.posterPosition,
    topicLabel: world.topicLabel,
    primaryCategoryId: world.primaryCategoryId,
    accent: world.accent,
    duration: world.duration,
    translations: {
      en: {
        title: english.title,
        posterTitle: english.posterTitle,
        posterHook: english.posterHook,
        topicLabel: english.topicLabel,
      },
    },
  }
}

writeJson(join(artifactDirectory, 'home-bootstrap.json'), {
  worlds: [...bootstrapIds].map((worldId) => slimHomeBootstrapWorld(summaryById.get(worldId))).filter(Boolean),
  initialPageIds: paginate(sortedSummaries.recommended)[0].map((world) => world.id),
  freshWorldIds,
})

writeJson(join(artifactDirectory, 'curated.json'), {
  about: sortedSummaries.recommended.slice(0, 14),
})

const evidenceLevels = ['live', 'verified', 'compiled', 'modeled']
writeJson(join(artifactDirectory, 'sources.json'), {
  worldCounts: Object.fromEntries(evidenceLevels.map((level) => [
    level,
    publicWorlds.filter((world) => world.evidence === level).length,
  ])),
  worlds: publicWorlds.map((world) => ({
    id: world.id,
    title: world.title,
    titleEn: world.translations.en.title,
    topicLabel: world.topicLabel,
    topicLabelEn: world.translations.en.topicLabel,
    evidence: world.evidence,
    accent: world.accent,
    sources: world.sources,
  })),
})

writeJson(join(artifactDirectory, 'making.json'), catalogWorlds
  .filter((world) => ['making', 'failed'].includes(worldState(world)))
  .map((world) => {
    const firstSeen = worldFirstSeen(
      root,
      world.id,
      `src/components/experiences/worlds/${world.id}/index.tsx`,
      world.poster,
    ) ?? '1970-01-01'
    const lastModified = worldLastModified(root, [
      `src/components/experiences/worlds/${world.id}`,
      catalogPathById.get(world.id),
      `src/i18n/experience-en-overrides/${world.id}.json`,
      typeof world.poster === 'string' && world.poster.startsWith('/') ? world.poster.slice(1) : undefined,
      typeof world.posterMobile === 'string' && world.posterMobile.startsWith('/')
        ? world.posterMobile.slice(1)
        : undefined,
    ]) ?? firstSeen
    return {
      id: world.id,
      title: world.title,
      poster: world.poster,
      posterMobile: world.posterMobile,
      primaryCategoryId: world.primaryCategoryId,
      translations: {en: {title: world.translations.en.title}},
      firstSeen,
      lastModified: lastModified < firstSeen ? firstSeen : lastModified,
    }
  })
  .sort((left, right) => {
    const dateDelta = right.firstSeen.localeCompare(left.firstSeen)
    return dateDelta !== 0 ? dateDelta : left.id.localeCompare(right.id)
  }))

const manifest = {
  schemaVersion: 1,
  pageSize,
  tailAbsorb,
  bucketCount,
  total: summaries.length,
  pageCount: allPages.length,
  categories: categoryEntries.sort((left, right) => left.id.localeCompare(right.id)),
  fallbackWorlds: sortedSummaries.recommended
    .filter((world) => world.runtime.endsWith('-2d'))
    .slice(0, 2),
}
writeJson(join(artifactDirectory, 'manifest.json'), manifest)
writeJson(join(root, 'src/data/generated/world-artifact-manifest.json'), manifest)

console.log(`Generated ${artifactCount} World artifacts, ${summaries.length} public summaries, and ${allPages.length} catalogue pages.`)
