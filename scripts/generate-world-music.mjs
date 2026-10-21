import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {join, resolve} from 'node:path'
import ts from 'typescript'

import {readWorldCatalogFiles} from './lib/world-catalog-source.mjs'

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

function readWorldMusicIds() {
  const worlds = readWorldCatalogFiles(root).map(({path}) => {
    const object = defaultExport(path)
    const id = readProperty(object, 'id', path)
    const audioPolicy = readProperty(object, 'audioPolicy', path)
    if (!id || !WORLD_ID_PATTERN.test(id)) throw new Error(`Invalid or missing world id in ${path}`)
    if (audioPolicy !== undefined && audioPolicy !== 'world-owned') {
      throw new Error(`Unsupported audioPolicy ${audioPolicy} in ${path}`)
    }
    return {id, audioPolicy}
  })

  const ids = worlds.filter(({audioPolicy}) => audioPolicy === 'world-owned').map(({id}) => id).sort()
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate world id with world-owned audio policy')
  return ids
}

function writeIfChanged(path, contents) {
  if (!existsSync(path) || readFileSync(path, 'utf8') !== contents) writeFileSync(path, contents)
}

const ids = readWorldMusicIds()
const jsonPath = join(root, 'src/data/generated/world-music.json')
mkdirSync(join(root, 'src/data/generated'), {recursive: true})
writeIfChanged(jsonPath, `${JSON.stringify(ids, null, 2)}\n`)


console.log(`[world-music] generated ${ids.length} world-owned music ids`)
