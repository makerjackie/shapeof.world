import { assertWorldRouteNames } from '../src/lib/world-route-names.ts'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import { readWorldCatalogFiles } from './lib/world-catalog-source.mjs'
import { isWorldDiscoverable } from './lib/world-lifecycle.mjs'
import { worldFirstSeen } from './lib/world-poster-dates.mjs'
import { readStaticDefaultExport } from './lib/static-typescript-data.mjs'

const root = resolve(import.meta.dirname, '..')

const catalogWorlds = readWorldCatalogFiles(root).map(({path}) => readStaticDefaultExport(path))
assertWorldRouteNames(catalogWorlds.map(world => world.id))
const catalogIds = catalogWorlds.map((world) => world.id)
if (new Set(catalogIds).size !== catalogIds.length) {
  throw new Error('Duplicate World id in Category-sharded catalogues')
}

function rendererComponentPaths() {
  const source = readFileSync(join(root, 'src/worlds/experience-registry.ts'), 'utf8')
  const paths = new Map()
  for (const match of source.matchAll(
    /^\s*'([^']+)':\s*lazyExperience\([^,]+,\s*\(\)\s*=>\s*import\('([^']+)'\)/gm,
  )) {
    const specifier = match[2]
    if (!specifier.startsWith('~/')) continue
    const base = join(root, 'src', specifier.slice(2))
    const file = [`${base}.tsx`, `${base}.ts`, join(base, 'index.tsx'), join(base, 'index.ts')].find(existsSync)
    if (file) paths.set(match[1], relative(root, file))
  }
  const worldsDirectory = join(root, 'src/components/experiences/worlds')
  if (existsSync(worldsDirectory)) {
    for (const entry of readdirSync(worldsDirectory, {withFileTypes: true})) {
      if (!entry.isDirectory()) continue
      const file = join(worldsDirectory, entry.name, 'index.tsx')
      if (existsSync(file)) paths.set(entry.name, relative(root, file))
    }
  }
  return paths
}

const componentPaths = rendererComponentPaths()
const publicWorlds = catalogWorlds.filter((world) => isWorldDiscoverable(world))
const firstSeenPath = join(root, 'src/data/generated/world-first-seen.json')
const existingFirstSeen = existsSync(firstSeenPath)
  ? JSON.parse(readFileSync(firstSeenPath, 'utf8'))
  : {}
// Ids already recorded in world-first-seen.json keep their committed first-seen
// date. Moving a world to worlds/<id>/ must not rewrite history to "today".
const firstSeen = Object.fromEntries(
  publicWorlds.flatMap((world) => {
    const preserved = existingFirstSeen[world.id]
    if (typeof preserved === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(preserved)) {
      return [[world.id, preserved]]
    }
    const stamp = worldFirstSeen(
      root,
      world.id,
      componentPaths.get(world.id) ?? componentPaths.get(world.renderer),
      world.poster,
    )
    return stamp ? [[world.id, stamp]] : []
  }),
)

function comparePublic(left, right) {
  const leftDate = firstSeen[left.id]
  const rightDate = firstSeen[right.id]
  if (leftDate && rightDate && leftDate !== rightDate) return leftDate.localeCompare(rightDate)
  if (leftDate && !rightDate) return -1
  if (!leftDate && rightDate) return 1
  return left.id.localeCompare(right.id)
}

const summaries = publicWorlds
  .slice()
  .sort(comparePublic)
  .map((world, index) => ({
    id: world.id,
    index: String(index + 1).padStart(2, '0'),
    poster: world.poster,
    posterMobile: world.posterMobile,
    posterDesktop: world.posterDesktop,
    title: world.title,
    posterTitle: world.posterTitle,
    posterHook: world.posterHook,
    question: world.question,
    topicLabel: world.topicLabel,
    translations: {
      en: {
        title: world.translations.en.title,
        posterTitle: world.translations.en.posterTitle,
        posterHook: world.translations.en.posterHook,
        question: world.translations.en.question,
        topicLabel: world.translations.en.topicLabel,
      },
    },
    primaryCategoryId: world.primaryCategoryId,
    additionalCategoryIds: world.additionalCategoryIds,
    renderer: world.renderer,
    runtime: world.runtime,
    difficulty: world.difficulty,
    duration: world.duration,
    evidence: world.evidence,
    accent: world.accent,
    posterPosition: world.posterPosition,
  }))

const outputPath = join(root, 'src/data/generated/world-summaries.json')
const output = `${JSON.stringify(summaries, null, 2)}\n`
if (!existsSync(outputPath) || readFileSync(outputPath, 'utf8') !== output) writeFileSync(outputPath, output)

const engineSourcePattern =
  /\b(react[-\s]?three[-\s]?fiber|react three fiber|\br3f\b|three\.?js\b|\bdrei\b|@react-three|webgl2?\b(?!.*nasa)|webpack|vite\b|glsl\b(?!.*shader toy))/iu

function isEngineOnlySource(source) {
  const blob = `${source.label ?? ''} ${source.labelEn ?? ''} ${source.url ?? ''}`
  if (/nasa\.gov|esa\.int|arxiv\.org|doi\.org|wikipedia\.org|nature\.com|science\.org|aps\.org|gwosc|jpl\.nasa/i.test(source.url ?? '')) {
    if (!/react[-\s]?three|three\.js|pmndrs/i.test(blob)) return false
  }
  if (/github\.com\/(pmndrs|mrdoob|react-spring)/i.test(source.url ?? '')) return true
  return engineSourcePattern.test(blob)
}

function userFacingSources(sources) {
  if (!Array.isArray(sources) || sources.length === 0) return []
  const filtered = sources.filter((source) => !isEngineOnlySource(source))
  return filtered.length > 0 ? filtered : sources
}

function localizedPair(zh, en) {
  if (typeof zh !== 'string' || zh.length === 0) return null
  return {zh, en: typeof en === 'string' && en.length > 0 ? en : zh}
}

function snapshotProvenance(provenance) {
  if (!provenance || typeof provenance.origin !== 'string') return null
  const snapshot = {origin: provenance.origin}
  if (provenance.origin === 'open-source-adaptation') {
    if (typeof provenance.sourceProject === 'string') snapshot.sourceProject = provenance.sourceProject
    if (typeof provenance.sourceUrl === 'string') snapshot.sourceUrl = provenance.sourceUrl
  }
  return snapshot
}

const intros = {
  schemaVersion: 1,
  worlds: Object.fromEntries(
    publicWorlds.map((world) => {
      const en = world.translations?.en ?? {}
      const sources = userFacingSources(world.sources).flatMap((source) => {
        const label = localizedPair(source.label, source.labelEn)
        if (!label || typeof source.url !== 'string' || !source.url.startsWith('https://')) return []
        const note = localizedPair(source.note, source.noteEn)
        return [note ? {label, url: source.url, note} : {label, url: source.url}]
      })
      const fieldNotes = Array.isArray(world.fieldNotes)
        ? world.fieldNotes.flatMap((note) => {
            const label = localizedPair(note.label, note.labelEn)
            const body = localizedPair(note.body, note.bodyEn)
            return label && body ? [{label, body}] : []
          })
        : []
      return [world.id, {
        question: localizedPair(world.question ?? world.posterTitle, en.question ?? en.posterTitle),
        hook: localizedPair(world.hook, en.hook),
        payoff: localizedPair(world.payoff, en.payoff),
        topicLabel: localizedPair(world.topicLabel, en.topicLabel),
        evidence: world.evidence,
        fieldNotes,
        sources,
        provenance: snapshotProvenance(world.provenance),
      }]
    }),
  ),
}

const introsOutput = `${JSON.stringify(intros, null, 2)}\n`
const generatedIntrosPath = join(root, 'src/data/generated/world-intros.json')
if (!existsSync(generatedIntrosPath) || readFileSync(generatedIntrosPath, 'utf8') !== introsOutput) {
  writeFileSync(generatedIntrosPath, introsOutput)
}

const firstSeenOutput = `${JSON.stringify(
  Object.fromEntries(Object.entries(firstSeen).sort(([left], [right]) => left.localeCompare(right))),
  null,
  2,
)}\n`
if (!existsSync(firstSeenPath) || readFileSync(firstSeenPath, 'utf8') !== firstSeenOutput) {
  writeFileSync(firstSeenPath, firstSeenOutput)
}

console.log(`Generated ${summaries.length} public world summaries, ${Object.keys(intros.worlds).length} world intros, and ${Object.keys(firstSeen).length} first-seen dates.`)
