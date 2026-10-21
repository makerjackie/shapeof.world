/**
 * Report the narrative shape of every public world.
 *
 * The product standard allows two shapes — a story-driven world and an atlas —
 * and forbids a third: a pretty canvas with no path from "looks nice" to "oh,
 * that's why". This script cannot judge beauty, but it can tell you which
 * worlds have no story track, no hint, and no explanation, which is where that
 * third kind hides.
 *
 * Import following matters: several worlds delegate their whole shell to a
 * shared kit a level or two down. Checking only the top file reports those as
 * storyless, which is how an earlier version of this audit produced eighteen
 * false positives in one family.
 *
 *   node scripts/audit-world-shape.mjs
 *   node scripts/audit-world-shape.mjs --bare   # only the worlds worth a look
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { isPublicWorldSource, readArchivedWorldIds, readWorldCatalogFiles } from './lib/world-catalog-source.mjs'

const root = resolve(import.meta.dirname, '..')
const experienceDir = resolve(root, 'src/components/experiences')
const bareOnly = process.argv.includes('--bare')

const EXTENSIONS = ['.tsx', '.ts']

function resolveImport(fromFile, specifier) {
  let base
  if (specifier.startsWith('~/')) base = resolve(root, 'src', specifier.slice(2))
  else if (specifier.startsWith('.')) base = resolve(dirname(fromFile), specifier)
  else return undefined
  for (const ext of ['', ...EXTENSIONS, '/index.tsx', '/index.ts']) {
    if (existsSync(base + ext) && !existsSync(base + ext + '/')) return base + ext
  }
  return undefined
}

/** Concatenate a module and everything it pulls in, so shared shells count. */
function moduleWithDependencies(entry, depth = 3) {
  const seen = new Set()
  const pending = [[entry, 0]]
  let combined = ''
  while (pending.length) {
    const [file, level] = pending.pop()
    if (!file || seen.has(file) || level > depth) continue
    seen.add(file)
    const source = readFileSync(file, 'utf8')
    combined += source
    if (level === depth) continue
    for (const match of source.matchAll(/(?:from\s*|import\s*\()['"]([^'"]+)['"]/g)) {
      const next = resolveImport(file, match[1])
      // Only follow experience code; the shell and i18n would match everything.
      if (next && next.startsWith(experienceDir)) pending.push([next, level + 1])
    }
  }
  return combined
}

const registry = readFileSync(resolve(root, 'src/worlds/experience-registry.ts'), 'utf8')
const rendererFile = new Map()
for (const match of registry.matchAll(
  /'([^']+)': lazyExperience\('[^']+', \(\) => import\('~\/components\/experiences\/([^']+)'\)/g,
)) {
  rendererFile.set(match[1], match[2])
}
const automaticWorldsDirectory = resolve(experienceDir, 'worlds')
if (existsSync(automaticWorldsDirectory)) {
  for (const entry of readdirSync(automaticWorldsDirectory, { withFileTypes: true })) {
    if (entry.isDirectory() && existsSync(resolve(automaticWorldsDirectory, entry.name, 'index.tsx'))) {
      rendererFile.set(entry.name, `worlds/${entry.name}/index`)
    }
  }
}

const archived = readArchivedWorldIds(root)

const catalogue = new Map()
for (const { source } of readWorldCatalogFiles(root)) {
  const field = (key) => {
    const match = source.match(new RegExp(`^ {4}${key}: (['"])((?:(?!\\1)[^\\\\]|\\\\.)*)\\1`, 'm'))
    return match ? match[2] : ''
  }
  const id = field('id')
  if (id) catalogue.set(id, {
    renderer: field('renderer'),
    kind: field('entryMode') || '—',
    title: field('title'),
    source,
  })
}

const cache = new Map()
const rows = []

for (const [id, entry] of catalogue) {
  if (archived.has(id) || !isPublicWorldSource(entry.source)) continue
  const file = rendererFile.get(entry.renderer)
  if (!file) continue
  const path = [
    resolve(experienceDir, `${file}.tsx`),
    resolve(experienceDir, `${file}.ts`),
    resolve(experienceDir, file, 'index.tsx'),
    resolve(experienceDir, file, 'index.ts'),
  ].find(existsSync)
  if (!path) continue
  if (!cache.has(path)) cache.set(path, moduleWithDependencies(path))
  const source = cache.get(path)
  rows.push({
    id,
    kind: entry.kind || '—',
    guide: source.includes('GuideTour'),
    hint: source.includes('GhostHint'),
    why: /why|Why/.test(source),
    freebar: source.includes('Freebar') || source.includes('experience-freebar'),
  })
}

const bare = rows.filter((row) => !row.guide && !row.hint && !row.why && row.kind !== 'atlas')
const storyless = rows.filter((row) => !row.guide && row.kind !== 'atlas')

if (!bareOnly) {
  console.log(`${rows.length} public worlds\n`)
  console.log(`  with a story track   ${rows.filter((r) => r.guide).length}`)
  console.log(`  atlas (story optional) ${rows.filter((r) => r.kind === 'atlas').length}`)
  console.log(`  non-atlas, no story  ${storyless.length}`)
  console.log(`  no story, no hint, no explanation  ${bare.length}\n`)
}

if (bare.length === 0) {
  console.log('No world is missing every route from "looks nice" to "oh, that is why".')
} else {
  console.log('Worth a look — nothing guides the viewer to the point:\n')
  for (const row of bare) console.log(`  ${row.id.padEnd(32)} kind=${row.kind}`)
}

if (!bareOnly && storyless.length) {
  console.log('\nNon-atlas worlds without a story track (may still be fine if free-explore is obvious):\n')
  for (const row of storyless) {
    console.log(`  ${row.id.padEnd(32)} hint=${row.hint ? 'y' : 'n'} why=${row.why ? 'y' : 'n'}`)
  }
}
