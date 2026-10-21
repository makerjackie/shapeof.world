import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'

const root = resolve(import.meta.dirname, '..')
const sourceRoot = join(root, 'src')
const experienceRoot = join(sourceRoot, 'components/experiences')
const newWorldRoot = join(experienceRoot, 'worlds')
const registryPath = join(sourceRoot, 'worlds/experience-registry.ts')
const masterPath = join(sourceRoot, 'i18n/experience-en.json')
const overrideRoot = join(sourceRoot, 'i18n/experience-en-overrides')
const outputRoot = join(sourceRoot, 'i18n/experience-en')
const sourceExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json']
export const WORLD_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

export function validateWorldId(id, source) {
  if (!WORLD_ID_PATTERN.test(id)) {
    throw new Error(`Invalid world id "${id}" in ${source}`)
  }
}

function validateUniqueIds(entries, source) {
  const seen = new Set()
  for (const entry of entries) {
    validateWorldId(entry.id, source ?? entry.source)
    if (seen.has(entry.id)) throw new Error(`Duplicate renderer id: ${entry.id}`)
    seen.add(entry.id)
  }
  return entries
}

export function registryEntries(path = registryPath) {
  const entries = readFileSync(path, 'utf8')
    .split('\n')
    .flatMap((line) => {
      const match = line.match(/^\s*(['"])([^'"]+)\1:\s*lazyExperience\(\s*(['"])([^'"]+)\3,\s*\(\)\s*=>\s*import\(\s*(['"])([^'"]+)\5\s*\)/u)
      if (!match) return []
      const [, , id, , declaredId, , moduleId] = match
      if (id !== declaredId) throw new Error(`Registry renderer id mismatch: ${id} !== ${declaredId}`)
      return [{ id, moduleId, source: path }]
    })
  return validateUniqueIds(entries, path)
}

export function directoryRendererEntries(directory = newWorldRoot) {
  if (!existsSync(directory)) return []

  const entries = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right))
    .map((id) => {
      validateWorldId(id, directory)
      const indexPath = join(directory, id, 'index.tsx')
      if (!existsSync(indexPath)) throw new Error(`Missing renderer entry: ${indexPath}`)
      return {
        id,
        moduleId: `~/components/experiences/worlds/${id}/index.tsx`,
        source: indexPath,
      }
    })

  return validateUniqueIds(entries, directory)
}

export function rendererEntries({ registry = registryPath, worlds = newWorldRoot } = {}) {
  const directoryEntries = directoryRendererEntries(worlds)
  return validateUniqueIds([
    ...registryEntries(registry),
    ...directoryEntries,
  ], 'renderer entries')
}

export function overrideEntries(directory = overrideRoot) {
  if (!existsSync(directory)) return []

  const entries = readdirSync(directory)
    .sort((left, right) => left.localeCompare(right))
    .map((filename) => {
      if (!filename.endsWith('.json')) throw new Error(`Invalid override file: ${join(directory, filename)}`)
      const id = filename.slice(0, -'.json'.length)
      validateWorldId(id, join(directory, filename))
      const phrases = readJson(join(directory, filename))
      if (!phrases || Array.isArray(phrases) || typeof phrases !== 'object') {
        throw new Error(`Invalid override dictionary: ${join(directory, filename)}`)
      }
      for (const [source, translation] of Object.entries(phrases)) {
        if (typeof source !== 'string' || typeof translation !== 'string') {
          throw new Error(`Invalid override phrase in ${join(directory, filename)}`)
        }
      }
      return { id, phrases, path: join(directory, filename) }
    })

  return validateUniqueIds(entries, directory)
}

export function validateOverrideEntries(entries, renderers) {
  validateUniqueIds(entries, 'override entries')
  const rendererIds = new Set(renderers.map((entry) => entry.id))
  for (const entry of entries) {
    if (!rendererIds.has(entry.id)) throw new Error(`Orphan experience override: ${entry.id}`)
  }
  return entries
}

function candidatePaths(basePath) {
  if (extname(basePath)) return [basePath]
  return [
    ...sourceExtensions.map((extension) => `${basePath}${extension}`),
    ...sourceExtensions.map((extension) => join(basePath, `index${extension}`)),
  ]
}

function resolveImport(importer, specifier) {
  // Raw HTML/CSS imports also contain authored experience copy.
  specifier = specifier.replace(/\?raw$/, '')
  if (specifier.startsWith('~/')) {
    return candidatePaths(join(sourceRoot, specifier.slice(2))).find(existsSync)
  }
  if (specifier.startsWith('.')) {
    return candidatePaths(resolve(dirname(importer), specifier)).find(existsSync)
  }
  return undefined
}

function shouldFollow(path) {
  const relativePath = relative(sourceRoot, path)
  return !relativePath.startsWith('i18n/')
    && !relativePath.startsWith('data/worlds/catalog/')
    && relativePath !== 'data/issues.ts'
    && relativePath !== 'data/failed-worlds.ts'
    && relativePath !== 'data/world-search-profiles.ts'
    // Catalog summaries aggregate every world's question/hook/payoff. Following
    // this edge would pull those phrases into every per-world dictionary and
    // double its size for no runtime benefit (shell cards read summaries
    // directly), so keep dictionaries scoped to the experience's own copy.
    && relativePath !== 'data/world-summaries.ts'
    && !relativePath.startsWith('data/generated/')
    // WorldExperience references the registry only to derive its renderer union.
    // Following that type-only edge would pull every experience into every
    // generated dictionary and defeat the per-world split.
    && relativePath !== 'worlds/experience-registry.ts'
    && !relativePath.endsWith('.test.ts')
    && !relativePath.endsWith('.test.tsx')
}

export function dependencySpecifiers(path, source) {
  const scriptKind = path.endsWith('.tsx')
    ? ts.ScriptKind.TSX
    : path.endsWith('.jsx')
      ? ts.ScriptKind.JSX
      : path.endsWith('.js')
        ? ts.ScriptKind.JS
        : ts.ScriptKind.TS
  const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, scriptKind)
  const specifiers = []

  const visit = (node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = node.importClause
      const namedBindings = clause?.namedBindings
      const hasRuntimeBinding = !clause
        || (!clause.isTypeOnly && (
          Boolean(clause.name)
          || !namedBindings
          || ts.isNamespaceImport(namedBindings)
          || namedBindings.elements.some((element) => !element.isTypeOnly)
        ))
      if (hasRuntimeBinding) specifiers.push(node.moduleSpecifier.text)
      return
    }
    if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const hasRuntimeExport = !node.isTypeOnly
        && (!node.exportClause
          || ts.isNamespaceExport(node.exportClause)
          || node.exportClause.elements.some((element) => !element.isTypeOnly))
      if (hasRuntimeExport) specifiers.push(node.moduleSpecifier.text)
      return
    }
    if (
      ts.isCallExpression(node)
      && node.expression.kind === ts.SyntaxKind.ImportKeyword
      && node.arguments.length === 1
      && ts.isStringLiteral(node.arguments[0])
    ) {
      specifiers.push(node.arguments[0].text)
      return
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return specifiers
}

function dependencySources(entryPath) {
  const pending = [entryPath]
  const visited = new Set()
  const sources = []

  while (pending.length > 0) {
    const path = pending.pop()
    if (!path || visited.has(path) || !shouldFollow(path)) continue
    visited.add(path)

    const source = readFileSync(path, 'utf8')
    sources.push(source)
    // Dictionaries store decoded strings. A source literal containing \n or
    // escaped quotes is still authored copy, even if its raw spelling differs.
    if (sourceExtensions.includes(extname(path))) {
      const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true)
      const collect = (node) => {
        if (ts.isStringLiteralLike(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) sources.push(node.text)
        ts.forEachChild(node, collect)
      }
      collect(ast)
    }
    for (const specifier of dependencySpecifiers(path, source)) {
      const dependency = resolveImport(path, specifier)
      if (dependency && shouldFollow(dependency)) pending.push(dependency)
    }
  }

  return sources.join('\n')
}

function componentPath(moduleId) {
  if (!moduleId.startsWith('~/')) throw new Error(`Unsupported experience module: ${moduleId}`)
  const path = candidatePaths(join(sourceRoot, moduleId.slice(2))).find(existsSync)
  if (!path || !path.startsWith(experienceRoot)) throw new Error(`Missing experience module: ${moduleId}`)
  return path
}

function writeIfChanged(path, value) {
  const next = `${JSON.stringify(value, null, 2)}\n`
  if (!existsSync(path) || readFileSync(path, 'utf8') !== next) writeFileSync(path, next)
}

export function generateExperienceDictionaries() {
  const master = readJson(masterPath)
  const allEntries = rendererEntries()
  const overrides = validateOverrideEntries(overrideEntries(), allEntries)
  const overridesById = new Map(overrides.map((entry) => [entry.id, entry.phrases]))
  const requestedIdsList = (process.env.ONEWORLD_I18N_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
  for (const id of requestedIdsList) validateWorldId(id, 'ONEWORLD_I18N_IDS')
  const requestedIds = new Set(requestedIdsList)
  const entries = requestedIds.size > 0 ? allEntries.filter((entry) => requestedIds.has(entry.id)) : allEntries
  if (allEntries.length === 0) throw new Error('No renderer entries found; refusing to generate empty dictionaries')
  if (requestedIds.size > 0 && entries.length !== requestedIds.size) {
    const found = new Set(entries.map((entry) => entry.id))
    const missing = [...requestedIds].filter((id) => !found.has(id))
    throw new Error(`Unknown renderer id(s): ${missing.join(', ')}`)
  }

  mkdirSync(outputRoot, { recursive: true })
  const expectedFiles = new Set()
  let largest = { id: '', count: 0 }

  for (const entry of entries) {
    const source = dependencySources(componentPath(entry.moduleId))
    const scopedOverrides = overridesById.get(entry.id) ?? {}
    for (const chinese of Object.keys(scopedOverrides)) {
      if (!source.includes(chinese)) {
        throw new Error(`${entry.id}: scoped English override is absent from its experience source: ${chinese}`)
      }
    }
    const dictionary = {
      ...Object.fromEntries(Object.entries(master).filter(([chinese]) => source.includes(chinese))),
      ...scopedOverrides,
    }
    const filename = `${entry.id}.json`
    expectedFiles.add(filename)
    writeIfChanged(join(outputRoot, filename), dictionary)
    if (Object.keys(dictionary).length > largest.count) largest = { id: entry.id, count: Object.keys(dictionary).length }
  }

  if (requestedIds.size === 0) {
    for (const filename of readdirSync(outputRoot)) {
      if (filename.endsWith('.json') && !expectedFiles.has(filename)) {
        throw new Error(`Stale generated dictionary: ${filename}. Remove it after confirming the renderer was retired.`)
      }
    }
  }

  console.log(`Generated ${entries.length} lazy experience dictionaries; largest is ${largest.id} (${largest.count} phrases).`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  generateExperienceDictionaries()
}
