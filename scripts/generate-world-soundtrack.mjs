import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import ts from 'typescript'

import { readWorldCatalogFiles } from './lib/world-catalog-source.mjs'

const root = resolve(import.meta.dirname, '..')
const WORLD_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u

function unwrap(node) {
  if (ts.isSatisfiesExpression(node) || ts.isAsExpression(node) || ts.isParenthesizedExpression(node)) {
    return unwrap(node.expression)
  }
  return node
}

function propertyName(node) {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return node.text
  throw new Error(`Unsupported catalogue property name: ${node.getText()}`)
}

function stringValue(node, description) {
  const value = unwrap(node)
  if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) return value.text
  throw new Error(`Expected a static string for ${description}: ${node.getText()}`)
}

function defaultExport(sourcePath) {
  const source = readFileSync(sourcePath, 'utf8')
  const sourceFile = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  if (sourceFile.parseDiagnostics.length > 0) {
    throw new Error(`Could not parse ${sourcePath}: ${sourceFile.parseDiagnostics[0].messageText}`)
  }
  let initializer
  sourceFile.forEachChild((node) => {
    if (ts.isExportAssignment(node) && !node.isExportEquals) initializer = unwrap(node.expression)
  })
  if (!initializer || !ts.isObjectLiteralExpression(initializer)) {
    throw new Error(`Expected a static object default export in ${sourcePath}`)
  }
  return initializer
}

function readProperty(object, name, sourcePath) {
  const matches = object.properties.filter((property) => (
    ts.isPropertyAssignment(property) && propertyName(property.name) === name
  ))
  if (matches.length > 1) throw new Error(`Duplicate ${name} in ${sourcePath}`)
  if (matches.length === 0) return undefined
  return stringValue(matches[0].initializer, `${name} in ${sourcePath}`)
}

function hashPick(worldId, pool) {
  let hash = 2166136261
  for (const char of worldId) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return pool[Math.abs(hash) % pool.length]
}

function writeIfChanged(path, contents) {
  if (!existsSync(path) || readFileSync(path, 'utf8') !== contents) writeFileSync(path, contents)
}

function previewUrl(cdnOrigin, trackId, version) {
  return `${cdnOrigin}/tracks/${trackId}/${version}/preview.mp3`
}

const catalog = JSON.parse(readFileSync(join(root, 'src/data/soundtrack.json'), 'utf8'))
const { fallbackTrackId, cdnOrigin, pageOrigin, tracks, categoryPools, overrides } = catalog
if (!tracks[fallbackTrackId]) throw new Error(`Fallback track is missing: ${fallbackTrackId}`)

for (const [trackId, track] of Object.entries(overrides)) {
  if (!tracks[track]) throw new Error(`Override ${trackId} points at unknown track ${track}`)
}
for (const [category, pool] of Object.entries(categoryPools)) {
  if (!Array.isArray(pool) || pool.length === 0) throw new Error(`Empty soundtrack pool: ${category}`)
  for (const trackId of pool) {
    if (!tracks[trackId]) throw new Error(`Pool ${category} includes unknown track ${trackId}`)
  }
}

const worlds = {}
for (const file of readWorldCatalogFiles(root)) {
  const object = defaultExport(file.path)
  const id = readProperty(object, 'id', file.path)
  if (!id || !WORLD_ID_PATTERN.test(id)) throw new Error(`Invalid or missing world id in ${file.path}`)
  const override = overrides[id]
  const pool = categoryPools[file.rootCategoryId]
  if (!override && !pool) throw new Error(`No soundtrack pool for ${file.rootCategoryId} (${id})`)
  worlds[id] = override ?? hashPick(id, pool)
}

const sortedWorldIds = Object.keys(worlds).sort()
const assignment = {
  fallbackTrackId,
  cdnOrigin,
  pageOrigin,
  worlds: Object.fromEntries(sortedWorldIds.map((id) => [id, worlds[id]])),
}

mkdirSync(join(root, 'src/data/generated'), { recursive: true })
writeIfChanged(
  join(root, 'src/data/generated/world-soundtrack.json'),
  `${JSON.stringify(assignment, null, 2)}\n`,
)

const versionEntries = Object.keys(tracks)
  .sort()
  .map((id) => `  '${id}': '${tracks[id].version}',`)

console.log(`[world-soundtrack] assigned ${sortedWorldIds.length} worlds; fallback ${fallbackTrackId}`)
