#!/usr/bin/env node
/**
 * Move every legacy experience into src/components/experiences/worlds/<id>/.
 *
 * Shared shell files stay at src/components/experiences/. A file imported by
 * more than one world also stays shared. Re-run is idempotent for worlds that
 * already have a directory entry.
 *
 * Usage:
 *   node scripts/migrate-worlds-to-directories.mjs --dry-run
 *   node scripts/migrate-worlds-to-directories.mjs
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'

import ts from 'typescript'

import {
  dependencySpecifiers,
  directoryRendererEntries,
  registryEntries,
} from './generate-experience-dictionaries.mjs'

const root = resolve(import.meta.dirname, '..')
const sourceRoot = join(root, 'src')
const experienceRoot = join(sourceRoot, 'components/experiences')
const worldsRoot = join(experienceRoot, 'worlds')
const registryPath = join(sourceRoot, 'worlds/experience-registry.ts')
const dryRun = process.argv.includes('--dry-run')

const SHARED_FILES = new Set([
  'ExperienceFallback.tsx',
  'ExperienceOpeningPoster.tsx',
  'ExperiencePanel.test.ts',
  'ExperiencePanel.tsx',
  'ExperienceRenderer.client.tsx',
  'ExperienceRenderer.tsx',
  'Freebar.test.ts',
  'Freebar.tsx',
  'FreebarSelectiveMigration.test.ts',
  'GhostHint.tsx',
  'GuideTour.test.ts',
  'GuideTour.tsx',
  'experience-modularity.test.ts',
  'freebar-coverage.test.ts',
  'world-module-boundaries.test.ts',
])

const SHARED_DIRS = new Set([
  'worlds',
  'styles',
  'illusion-kit',
  'course',
])

const SHARED_PREFIXES = [
  'Experience',
  'Freebar',
  'GhostHint',
  'GuideTour',
  'IllusionSpotlight',
  'IllusionSpotlights',
  'RemoteExperienceStatus',
  'CellArchitecture',
  'cell-architecture',
  'modern-coastline',
  'useShareableState',
  'useStoryFreeMode',
  'solar-system-textures',
  'world-story-border-data',
]

const FILE_ALIASES = {
  'andromeda-journey': 'andromeda-deep-zoom',
  'apollo-tour': 'model-viewer-rover',
  'apollonian-model': 'descartes-circle-packing',
  'pocket-beaker-model': 'beaker-reactions',
  'flight-network-journey': 'global-flight-flow',
  'manhattan-journey': 'allmaps-manhattan',
  'hook-length-model': 'young-hook-length',
  'entanglement-model': 'quantum-entanglement',
  'residue-theorem-model': 'residue-contour-lab',
  'schelling-model': 'schelling-segregation',
  'snell-model': 'snell-window',
  'nullschool-continuity': 'nullschool-earth',
  'la-linear-transform-model': 'la-intro',
  'la-systems-01-model': 'la-01-solution-count',
  'global-quake-model': 'global-quake-pulse',
  'human-anatomy-camera': 'human-anatomy-explorer',
  'human-anatomy-names': 'human-anatomy-explorer',
  'pin-tumbler-model': 'pin-tumbler-lock',
  'living-earth-model': 'global-quake-pulse',
  'BlackHoleFlybyMobileLayout': 'black-hole-flyby',
  'BlackHoleFlybyTouch': 'black-hole-flyby',
  'NullschoolEarthMobileLayout': 'nullschool-earth',
  'cranial-volume-loading': 'cranial-volume',
}

const sourceExtensions = ['.ts', '.tsx', '.js', '.jsx', '.css', '.json']

function walkFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return walkFiles(path)
    return [path]
  })
}

function candidatePaths(basePath) {
  if (extname(basePath)) return [basePath]
  return [
    ...sourceExtensions.map((extension) => `${basePath}${extension}`),
    ...sourceExtensions.map((extension) => join(basePath, `index${extension}`)),
  ]
}

function resolveImport(importer, specifier) {
  if (specifier.startsWith('~/')) {
    return candidatePaths(join(sourceRoot, specifier.slice(2))).find(existsSync)
  }
  if (specifier.startsWith('.')) {
    return candidatePaths(resolve(dirname(importer), specifier)).find(existsSync)
  }
  return undefined
}

function isWithin(directory, file) {
  const path = relative(directory, file)
  return path === '' || (!path.startsWith('..') && path !== '..')
}

function collectReachable(entryPath) {
  const pending = [entryPath]
  const visited = new Set()
  while (pending.length > 0) {
    const path = pending.pop()
    if (!path || visited.has(path) || !existsSync(path)) continue
    if (!isWithin(experienceRoot, path)) continue
    visited.add(path)
    if (!/\.(?:ts|tsx|js|jsx)$/.test(path)) continue
    const source = readFileSync(path, 'utf8')
    for (const specifier of dependencySpecifiers(path, source)) {
      const dependency = resolveImport(path, specifier)
      if (dependency) pending.push(dependency)
    }
  }
  return visited
}

function parseLegacyRegistry() {
  return registryEntries().map((entry) => {
    const file = candidatePaths(join(sourceRoot, entry.moduleId.slice(2))).find(existsSync)
    if (!file) throw new Error(`Missing registry module ${entry.moduleId}`)
    const source = readFileSync(registryPath, 'utf8')
    const escaped = entry.moduleId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const match = source.match(new RegExp(
      `'${entry.id}':\\s*lazyExperience\\('${entry.id}',\\s*\\(\\)\\s*=>\\s*import\\('${escaped}'\\),\\s*\\(\\w+\\)\\s*=>\\s*\\w+\\.([A-Za-z0-9_]+)\\)`,
    ))
    const fallbackExport = file.replace(/\\/g, '/').split('/').pop()?.replace(/\.(tsx|ts)$/u, '')
    return {
      ...entry,
      file,
      exportName: match?.[1] ?? fallbackExport ?? null,
    }
  })
}

function fileStem(file) {
  return relative(experienceRoot, file)
    .split('/')
    .pop()
    .replace(/\.(?:test\.)?(?:ts|tsx|js|jsx|css)$/u, '')
}

function kebab(value) {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

function assignByName(worlds, leftover) {
  const byId = new Map(worlds.map((world) => [world.id, world]))
  const assigned = new Map(worlds.map((world) => [world.id, new Set()]))
  for (const file of leftover) {
    const rel = relative(experienceRoot, file)
    const top = rel.split('/')[0]
    if (SHARED_DIRS.has(top) || SHARED_PREFIXES.some((prefix) => top.startsWith(prefix))) continue
    if (top === 'visual-illusions' && byId.has('visual-illusions')) {
      assigned.get('visual-illusions').add(file)
      continue
    }
    const stem = fileStem(file)
    const alias = FILE_ALIASES[stem] || FILE_ALIASES[kebab(stem)]
    if (alias && byId.has(alias)) {
      assigned.get(alias).add(file)
      continue
    }
    const needle = kebab(stem).replace(/-(?:model|data|visuals|audio|copy|styles|journey|optics)$/u, '')
    const hits = worlds.filter((world) => {
      const exportKebab = world.exportName ? kebab(world.exportName) : ''
      return (
        world.id === needle
        || world.id.startsWith(`${needle}-`)
        || world.id.endsWith(`-${needle}`)
        || world.id.includes(needle)
        || exportKebab === needle
        || exportKebab.startsWith(`${needle}-`)
      )
    })
    if (hits.length === 1) assigned.get(hits[0].id).add(file)
  }
  return assigned
}

function isAllowedSharedLeftover(file) {
  const rel = relative(experienceRoot, file)
  const top = rel.split('/')[0]
  if (SHARED_DIRS.has(top)) return true
  if (SHARED_FILES.has(rel) || SHARED_FILES.has(top)) return true
  return SHARED_PREFIXES.some((prefix) => top.startsWith(prefix) || rel.startsWith(`styles/${prefix}`))
}

function posix(path) {
  return path.split('\\').join('/')
}

function rewriteSpecifier(importer, specifier, fileMoves) {
  const resolved = resolveImport(importer, specifier)
  if (!resolved) return specifier
  const dest = fileMoves.get(resolved) ?? resolved
  if (specifier.startsWith('~/')) {
    return `~/${posix(relative(sourceRoot, dest)).replace(/\.(tsx|ts|jsx|js)$/u, '')}`
  }
  if (!specifier.startsWith('.')) return specifier
  let next = posix(relative(dirname(fileMoves.get(importer) ?? importer), dest))
  if (!next.startsWith('.')) next = `./${next}`
  next = next.replace(/\.(tsx|ts|jsx|js)$/u, '')
  return next
}

function rewriteFileImports(path, fileMoves) {
  const original = readFileSync(path, 'utf8')
  const destPath = fileMoves.get(path) ?? path
  const specifiers = dependencySpecifiers(path, original)
  let next = original
  for (const specifier of specifiers) {
    const rewritten = rewriteSpecifier(path, specifier, fileMoves)
    if (rewritten !== specifier) {
      next = next.replaceAll(`'${specifier}'`, `'${rewritten}'`)
      next = next.replaceAll(`"${specifier}"`, `"${rewritten}"`)
    }
  }
  if (next !== original && destPath === path && !dryRun) writeFileSync(path, next)
  return next
}

function renderIndex(world) {
  if (!world.exportName) throw new Error(`Cannot infer export name for ${world.id}`)
  const dest = fileMoves.get(world.file) ?? world.file
  const specifier = posix(relative(join(worldsRoot, world.id), dest)).replace(/\.(tsx|ts)$/u, '')
  const importPath = specifier.startsWith('.') ? specifier : `./${specifier}`
  return `export { ${world.exportName}, ${world.exportName} as worldRenderer } from '${importPath}'\n`
}

function renderRegistry(automaticOnly) {
  const source = readFileSync(registryPath, 'utf8')
  if (automaticOnly) {
    const start = source.indexOf('const legacyRendererRegistry = {')
    const end = source.indexOf('} satisfies Record<string, LazyExoticComponent<RendererComponent>>')
    if (start < 0 || end < 0) throw new Error('Could not locate legacyRendererRegistry')
    return `${source.slice(0, start)}const legacyRendererRegistry = {
} satisfies Record<string, LazyExoticComponent<RendererComponent>>${source.slice(end + '} satisfies Record<string, LazyExoticComponent<RendererComponent>>'.length)}`
  }
  return source
}

const worlds = parseLegacyRegistry()
const already = new Set(directoryRendererEntries().map((entry) => entry.id))
const pending = worlds.filter((world) => !already.has(world.id))
const owners = new Map()

for (const world of pending) {
  const files = collectReachable(world.file)
  // Also collect tests that import this world or sit beside its files.
  for (const file of walkFiles(experienceRoot)) {
    if (!file.endsWith('.test.ts') && !file.endsWith('.test.tsx')) continue
    if (SHARED_FILES.has(relative(experienceRoot, file).split('/')[0])) continue
    const source = existsSync(file) ? readFileSync(file, 'utf8') : ''
    const rel = relative(experienceRoot, file)
    if (
      files.has(file)
      || rel.startsWith(`${world.id}/`)
      || rel.startsWith(`${world.exportName}/`)
      || specifiersPointTo(file, source, world.file)
    ) {
      files.add(file)
    }
  }
  owners.set(world.id, files)
}

function specifiersPointTo(importer, source, target) {
  try {
    return dependencySpecifiers(importer, source).some((specifier) => resolveImport(importer, specifier) === target)
  } catch {
    return false
  }
}

const reachCount = new Map()
for (const files of owners.values()) {
  for (const file of files) {
    reachCount.set(file, (reachCount.get(file) ?? 0) + 1)
  }
}

const unique = new Map()
const leftover = new Set()
for (const file of walkFiles(experienceRoot)) {
  const rel = relative(experienceRoot, file)
  const top = rel.split('/')[0]
  if (top === 'worlds') continue
  if (SHARED_FILES.has(rel) || SHARED_FILES.has(top)) continue
  leftover.add(file)
}

for (const world of pending) {
  const mine = new Set()
  for (const file of owners.get(world.id)) {
    const rel = relative(experienceRoot, file)
    const top = rel.split('/')[0]
    if (top === 'worlds') continue
    if (SHARED_FILES.has(rel) || SHARED_FILES.has(top)) continue
    if ((reachCount.get(file) ?? 0) === 1) mine.add(file)
  }
  unique.set(world.id, mine)
  for (const file of mine) leftover.delete(file)
}

const named = assignByName(pending, leftover)
for (const world of pending) {
  for (const file of named.get(world.id)) {
    unique.get(world.id).add(file)
    leftover.delete(file)
  }
}

for (const file of [...leftover]) {
  if (isAllowedSharedLeftover(file) || !/\.(?:ts|tsx)$/.test(file)) continue
  const source = readFileSync(file, 'utf8')
  const importedWorlds = pending.filter((world) => (
    [...unique.get(world.id)].some((owned) => specifiersPointTo(file, source, owned))
  ))
  if (importedWorlds.length === 1) {
    unique.get(importedWorlds[0].id).add(file)
    leftover.delete(file)
  }
}

const fileMoves = new Map()
for (const world of pending) {
  for (const file of unique.get(world.id)) {
    const rel = relative(experienceRoot, file)
    let destRel = rel
    if (rel.startsWith('styles/')) destRel = join('styles', rel.slice('styles/'.length))
    fileMoves.set(file, join(worldsRoot, world.id, destRel))
  }
}

const unexpectedLeftover = [...leftover].filter((file) => !isAllowedSharedLeftover(file))

if (dryRun) {
  console.log(`pending worlds: ${pending.length}`)
  console.log(`already migrated: ${already.size}`)
  console.log(`allowed shared leftovers: ${leftover.size - unexpectedLeftover.length}`)
  console.log(`unexpected leftovers: ${unexpectedLeftover.length}`)
  for (const file of unexpectedLeftover.map((item) => relative(experienceRoot, item)).sort()) {
    console.log(`  leftover ${file}`)
  }
  let moved = 0
  let indexOnly = 0
  for (const world of pending) {
    const files = [...unique.get(world.id)]
    moved += files.length
    if (files.length === 0) indexOnly += 1
  }
  console.log(`files to move: ${moved}`)
  console.log(`index-only shared renderers: ${indexOnly}`)
  process.exit(unexpectedLeftover.length > 0 ? 1 : 0)
}

for (const world of pending) {
  mkdirSync(join(worldsRoot, world.id, 'styles'), { recursive: true })
  for (const file of unique.get(world.id)) {
    const dest = fileMoves.get(file)
    mkdirSync(dirname(dest), { recursive: true })
    const next = rewriteFileImports(file, fileMoves)
    writeFileSync(dest, next)
    rmSync(file)
  }
  writeFileSync(join(worldsRoot, world.id, 'index.tsx'), renderIndex({
    ...world,
    file: world.file,
  }))
}

for (const file of walkFiles(experienceRoot)) {
  if (!/\.(?:ts|tsx|js|jsx)$/.test(file)) continue
  if (fileMoves.has(file)) continue
  rewriteFileImports(file, fileMoves)
}

for (const file of walkFiles(join(root, 'src'))) {
  if (isWithin(experienceRoot, file)) continue
  if (!/\.(?:ts|tsx|js|jsx)$/.test(file)) continue
  rewriteFileImports(file, fileMoves)
}

for (const file of walkFiles(join(root, 'scripts'))) {
  if (!/\.(?:mjs|js|ts)$/.test(file)) continue
  rewriteFileImports(file, fileMoves)
}

writeFileSync(registryPath, renderRegistry(true))

// Remove emptied style leftovers that were moved.
if (existsSync(join(experienceRoot, 'styles'))) {
  for (const name of readdirSync(join(experienceRoot, 'styles'))) {
    const path = join(experienceRoot, 'styles', name)
    if (statSync(path).isFile() && statSync(path).size === 0) rmSync(path)
  }
}

console.log(`migrated ${pending.length} worlds, ${fileMoves.size} files`)
