#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import ts from 'typescript'

const repositoryRoot = resolve(import.meta.dirname, '..')
const argumentsList = process.argv.slice(2)
const idFlag = argumentsList.indexOf('--id')
const json = argumentsList.includes('--json')
const worldId = idFlag >= 0 ? argumentsList[idFlag + 1] : argumentsList.find((value) => !value.startsWith('-'))

if (argumentsList.includes('--help') || !worldId) {
  console.log('Usage: node scripts/validate-world.mjs --id <world-id> [--json]')
  process.exit(argumentsList.includes('--help') ? 0 : 1)
}

if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(worldId)) {
  throw new Error(`Invalid world id "${worldId}". Use lowercase kebab-case.`)
}

const results = {
  id: worldId,
  passed: [],
  warnings: [],
  errors: [],
}

function pass(message) {
  results.passed.push(message)
}

function warn(message) {
  results.warnings.push(message)
}

function fail(message) {
  results.errors.push(message)
}

function read(path) {
  return readFileSync(resolve(repositoryRoot, path), 'utf8')
}

function propertyName(node) {
  if (!node) return undefined
  if (ts.isIdentifier(node) || ts.isStringLiteralLike(node)) return node.text
  return undefined
}

function property(object, name) {
  if (!object || !ts.isObjectLiteralExpression(object)) return undefined
  return object.properties.find((candidate) => (
    ts.isPropertyAssignment(candidate) && propertyName(candidate.name) === name
  ))
}

function initializer(object, name) {
  return property(object, name)?.initializer
}

function stringValue(object, name) {
  const value = initializer(object, name)
  return value && ts.isStringLiteralLike(value) ? value.text : undefined
}

function objectValue(object, name) {
  const value = initializer(object, name)
  return value && ts.isObjectLiteralExpression(value) ? value : undefined
}

function arrayValue(object, name) {
  const value = initializer(object, name)
  return value && ts.isArrayLiteralExpression(value) ? value : undefined
}

function findCatalogEntries() {
  const catalogRoot = resolve(repositoryRoot, 'src/data/worlds/catalog')
  const matches = []
  for (const categoryShard of readdirSync(catalogRoot, { withFileTypes: true })) {
    if (!categoryShard.isDirectory()) continue
    const categoryDirectory = resolve(catalogRoot, categoryShard.name)
    for (const file of readdirSync(categoryDirectory).filter((name) => name.endsWith('.ts'))) {
      if (file === 'index.ts') {
        fail(`catalog: per-category index is obsolete under ${categoryShard.name}/; use the root automatic glob`)
        continue
      }
      const path = resolve(categoryDirectory, file)
      const source = readFileSync(path, 'utf8')
      const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
      const visit = (node) => {
        if (ts.isObjectLiteralExpression(node) && stringValue(node, 'id') === worldId) {
          matches.push({
            rootCategoryId: categoryShard.name,
            file,
            relativePath: `src/data/worlds/catalog/${categoryShard.name}/${file}`,
            path,
            source,
            sourceFile,
            object: node,
          })
        }
        ts.forEachChild(node, visit)
      }
      visit(sourceFile)
    }
  }
  return matches
}

function readCategoryParents() {
  const categoryRoot = resolve(repositoryRoot, 'src/data/content-graph/categories')
  const parents = new Map()
  for (const file of readdirSync(categoryRoot).filter((name) => name.endsWith('.ts'))) {
    const path = resolve(categoryRoot, file)
    const source = readFileSync(path, 'utf8')
    const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
    for (const statement of sourceFile.statements) {
      if (!ts.isExportAssignment(statement)) continue
      let value = statement.expression
      if (ts.isSatisfiesExpression(value)) value = value.expression
      if (!ts.isObjectLiteralExpression(value)) continue
      const id = stringValue(value, 'id')
      if (id) parents.set(id, stringValue(value, 'primaryParentId'))
    }
  }
  return parents
}

function rootCategoryId(categoryId, parents) {
  const visited = new Set()
  let current = categoryId
  while (current) {
    if (visited.has(current)) return undefined
    visited.add(current)
    if (!parents.has(current)) return undefined
    const parent = parents.get(current)
    if (!parent) return current
    current = parent
  }
  return undefined
}

function readUint24LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16)
}

function readWebpDimensions(buffer) {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') return undefined
  let chunkOffset = 12
  while (chunkOffset + 8 <= buffer.length) {
    const chunkType = buffer.toString('ascii', chunkOffset, chunkOffset + 4)
    const chunkSize = buffer.readUInt32LE(chunkOffset + 4)
    const dataOffset = chunkOffset + 8
    if (chunkType === 'VP8X' && dataOffset + 10 <= buffer.length) {
      return {
        width: readUint24LE(buffer, dataOffset + 4) + 1,
        height: readUint24LE(buffer, dataOffset + 7) + 1,
      }
    }
    if (chunkType === 'VP8 ' && dataOffset + 10 <= buffer.length) {
      const keyFrame = buffer[dataOffset + 3] === 0x9d
        && buffer[dataOffset + 4] === 0x01
        && buffer[dataOffset + 5] === 0x2a
      if (keyFrame) {
        return {
          width: buffer.readUInt16LE(dataOffset + 6) & 0x3fff,
          height: buffer.readUInt16LE(dataOffset + 8) & 0x3fff,
        }
      }
    }
    if (chunkType === 'VP8L' && dataOffset + 5 <= buffer.length && buffer[dataOffset] === 0x2f) {
      const dimensions = buffer.readUInt32LE(dataOffset + 1)
      return {
        width: (dimensions & 0x3fff) + 1,
        height: ((dimensions >>> 14) & 0x3fff) + 1,
      }
    }
    chunkOffset = dataOffset + chunkSize + (chunkSize % 2)
  }
  return undefined
}

function readJpegDimensions(buffer) {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return undefined
  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3,
    0xc5, 0xc6, 0xc7,
    0xc9, 0xca, 0xcb,
    0xcd, 0xce, 0xcf,
  ])
  let markerOffset = 2
  while (markerOffset + 9 < buffer.length) {
    if (buffer[markerOffset] !== 0xff) {
      markerOffset += 1
      continue
    }
    const marker = buffer[markerOffset + 1]
    if (startOfFrameMarkers.has(marker)) {
      return {
        width: buffer.readUInt16BE(markerOffset + 7),
        height: buffer.readUInt16BE(markerOffset + 5),
      }
    }
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      markerOffset += 2
      continue
    }
    const segmentLength = buffer.readUInt16BE(markerOffset + 2)
    if (segmentLength < 2) break
    markerOffset += segmentLength + 2
  }
  return undefined
}

function checkPoster(label, relativePath, expectedWidth, expectedHeight, minimumBytes, maximumBytes) {
  const path = resolve(repositoryRoot, relativePath)
  if (!existsSync(path)) {
    fail(`${label}: missing ${relativePath}`)
    return
  }
  const bytes = statSync(path).size
  const buffer = readFileSync(path)
  const jpeg = /\.jpe?g$/iu.test(relativePath)
  const dimensions = jpeg ? readJpegDimensions(buffer) : readWebpDimensions(buffer)
  if (bytes < minimumBytes || bytes > maximumBytes) {
    fail(`${label}: ${bytes} bytes; expected ${minimumBytes}-${maximumBytes}`)
  }
  if (!dimensions) {
    fail(`${label}: could not read ${jpeg ? 'JPEG' : 'WebP'} dimensions`)
  } else if (dimensions.width !== expectedWidth || dimensions.height !== expectedHeight) {
    fail(`${label}: ${dimensions.width}x${dimensions.height}; expected ${expectedWidth}x${expectedHeight}`)
  }
  if (
    bytes >= minimumBytes
    && bytes <= maximumBytes
    && dimensions?.width === expectedWidth
    && dimensions?.height === expectedHeight
  ) {
    pass(`${label}: ${expectedWidth}x${expectedHeight}, ${bytes} bytes`)
  }
}

function registeredModelIds() {
  const path = resolve(repositoryRoot, 'src/data/ai-models.ts')
  const source = readFileSync(path, 'utf8')
  const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const ids = new Set()
  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.name.text === 'aiModels'
      && node.initializer
    ) {
      const value = ts.isAsExpression(node.initializer) ? node.initializer.expression : node.initializer
      if (ts.isObjectLiteralExpression(value)) {
        for (const item of value.properties) {
          if (ts.isPropertyAssignment(item)) {
            const name = propertyName(item.name)
            if (name) ids.add(name)
          }
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return ids
}

const catalogEntries = findCatalogEntries()
const categoryParents = readCategoryParents()
if (catalogEntries.length !== 1) {
  fail(`catalog: expected one entry for ${worldId}, found ${catalogEntries.length}`)
}

const catalogEntry = catalogEntries[0]
if (catalogEntry) {
  const world = catalogEntry.object
  const primaryCategoryId = stringValue(world, 'primaryCategoryId')
  const expectedRootCategoryId = catalogEntry.rootCategoryId
  const expectedFile = `${worldId}.ts`
  if (catalogEntry.file !== expectedFile) {
    fail(`catalog: file is ${catalogEntry.file}; expected ${expectedFile} under ${expectedRootCategoryId}/`)
  } else {
    pass(`catalog: ${catalogEntry.relativePath}`)
  }
  const actualRootCategoryId = rootCategoryId(primaryCategoryId, categoryParents)
  if (actualRootCategoryId === expectedRootCategoryId) {
    pass(`catalog: primary Category ${primaryCategoryId} belongs to root ${expectedRootCategoryId}`)
  } else {
    fail(`catalog: primary Category ${primaryCategoryId ?? '<missing>'} does not belong to root ${expectedRootCategoryId}`)
  }

  const requiredFields = [
    'title', 'poster', 'posterTitle', 'posterHook', 'posterSource', 'question', 'hook', 'payoff',
    'topicLabel', 'primaryCategoryId', 'runtime', 'difficulty', 'lane', 'renderer', 'duration', 'evidence', 'accent',
    'related', 'sources', 'provenance', 'presentation', 'transferBudgetMb', 'fallback',
  ]
  if (property(world, 'index')) {
    fail('catalog: do not allocate a display index; public order is generated from first-seen data')
  }
  if (property(world, 'catalogOrder')) {
    fail('catalog: catalogOrder is obsolete; automatic glob discovery does not use per-world order')
  }
  const missingFields = requiredFields.filter((name) => !property(world, name))
  if (missingFields.length === 0) pass('catalog: required fields are present')
  else fail(`catalog: missing required fields ${missingFields.join(', ')}`)

  const renderer = stringValue(world, 'renderer')
  if (renderer === worldId) pass('catalog: renderer matches world id')
  else fail(`catalog: renderer is ${renderer ?? '<missing>'}; expected ${worldId}`)

  const translations = objectValue(world, 'translations')
  const english = objectValue(translations, 'en')
  const localizedFields = ['title', 'posterTitle', 'posterHook', 'posterSource', 'question', 'hook', 'payoff', 'topicLabel']
  const invalidChinese = localizedFields.filter((name) => !stringValue(world, name)?.trim())
  const invalidEnglish = localizedFields.filter((name) => {
    const value = stringValue(english, name)
    return !value?.trim() || /[\u3400-\u9fff]/u.test(value)
  })
  if (invalidChinese.length === 0) pass('catalog: eight Chinese metadata fields are complete')
  else fail(`catalog: invalid Chinese metadata ${invalidChinese.join(', ')}`)
  if (invalidEnglish.length === 0) pass('catalog: eight English metadata fields are complete')
  else fail(`catalog: invalid English metadata ${invalidEnglish.join(', ')}`)

  const sources = arrayValue(world, 'sources')
  if (!sources || sources.elements.length === 0) {
    fail('catalog: at least one source is required')
  } else {
    const invalidSources = []
    for (const [index, source] of sources.elements.entries()) {
      if (!ts.isObjectLiteralExpression(source)) {
        invalidSources.push(index + 1)
        continue
      }
      const label = stringValue(source, 'label')
      const labelEn = stringValue(source, 'labelEn')
      const url = stringValue(source, 'url')
      if (!label?.trim() || !labelEn?.trim() || /[\u3400-\u9fff]/u.test(labelEn) || !/^https?:\/\//u.test(url ?? '')) {
        invalidSources.push(index + 1)
      }
    }
    if (invalidSources.length === 0) pass(`catalog: ${sources.elements.length} bilingual source record(s)`)
    else fail(`catalog: invalid source record(s) ${invalidSources.join(', ')}`)
  }

  const provenance = objectValue(world, 'provenance')
  const origin = stringValue(provenance, 'origin')
  const allowedOrigins = new Set(['ai-prototype', 'multi-model', 'open-source-adaptation', 'human-led', 'supplied-prototype'])
  const provenanceErrorCount = results.errors.length
  if (!allowedOrigins.has(origin)) {
    fail(`catalog: invalid or missing provenance origin ${origin ?? '<missing>'}`)
  } else {
    const modelIds = registeredModelIds()
    const initialModel = stringValue(provenance, 'initialModel')
    const adaptationModel = stringValue(provenance, 'adaptationModel')
    if (origin === 'ai-prototype' && !initialModel) fail('catalog: ai-prototype requires initialModel')
    if (initialModel && !modelIds.has(initialModel)) fail(`catalog: unregistered initialModel ${initialModel}`)
    if (adaptationModel && !modelIds.has(adaptationModel)) fail(`catalog: unregistered adaptationModel ${adaptationModel}`)
    if (origin === 'open-source-adaptation') {
      if (!stringValue(provenance, 'sourceProject')?.trim()) fail('catalog: open-source adaptation requires sourceProject')
      if (!/^https?:\/\//u.test(stringValue(provenance, 'sourceUrl') ?? '')) {
        fail('catalog: open-source adaptation requires an HTTP(S) sourceUrl')
      }
    }
    if (results.errors.length === provenanceErrorCount) pass(`catalog: provenance ${origin}`)
  }

  const expectedPosterPaths = {
    poster: `/assets/posters/${worldId}.webp`,
    posterMobile: `/assets/posters/mobile/${worldId}.webp`,
    posterDesktop: `/assets/posters/desktop/${worldId}.webp`,
  }
  for (const [field, expected] of Object.entries(expectedPosterPaths)) {
    const actual = stringValue(world, field)
    if (actual !== expected) fail(`catalog: ${field} is ${actual ?? '<missing>'}; expected ${expected}`)
  }
  if (!results.errors.some((message) => message.startsWith('catalog: poster'))) {
    pass('catalog: poster paths use the standard preview set')
  }
}

const registrySource = read('src/worlds/experience-registry.ts')
const escapedWorldId = worldId.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
const registryPattern = new RegExp(
  `^\\s*['"]${escapedWorldId}['"]:\\s*lazyExperience\\(\\s*['"]${escapedWorldId}['"]\\s*,\\s*\\(\\)\\s*=>\\s*import\\(\\s*['"]([^'"]+)['"]\\s*\\)`,
  'mu',
)
const registryMatch = registrySource.match(registryPattern)
const worldEntrypoint = resolve(repositoryRoot, `src/components/experiences/worlds/${worldId}/index.tsx`)
const usesWorldDirectory = existsSync(worldEntrypoint)

if (!usesWorldDirectory) {
  fail(`renderer: missing src/components/experiences/worlds/${worldId}/index.tsx`)
} else if (registryMatch) {
  fail('renderer: world-directory renderers must not also keep a lazyExperience entry')
} else {
  pass(`renderer: automatic world directory worlds/${worldId}/`)
  const entrySource = readFileSync(worldEntrypoint, 'utf8')
  if (!/\bworldRenderer\b/u.test(entrySource)) {
    fail('renderer: worlds/<id>/index.tsx must export worldRenderer')
  } else {
    pass('renderer: worldRenderer export is present')
  }

  const worldDir = resolve(repositoryRoot, `src/components/experiences/worlds/${worldId}`)
  const stagePath = resolve(worldDir, 'stage.html')
  if (existsSync(stagePath)) {
    const stage = readFileSync(stagePath, 'utf8')
    const hasPrivateTopbar = /<header\b[^>]*(?:class=["'][^"']*(?:topbar|header)|id=["']header)/iu.test(stage)
    const legacyHeaders = new Set(['cafe-terrace', 'qingming-riverside', 'starry-night', 'vegetation-atlas', 'water-land-lab'])
    if (hasPrivateTopbar && legacyHeaders.has(worldId)) warn('shell: legacy world has a private topbar; move lesson actions into the world content')
    else if (hasPrivateTopbar) fail('shell: do not add a second header inside a world; use ExperienceShell and place lesson actions in the world content')
    else pass('shell: no duplicate world header')
  }
  const siblingComponents = readdirSync(worldDir)
    .filter((name) => name.endsWith('.tsx') && name !== 'index.tsx')
    .map((name) => resolve(worldDir, name))
  const componentPath = siblingComponents[0] ?? worldEntrypoint
  const componentSource = readFileSync(componentPath, 'utf8')
  pass(`renderer: ${componentPath.slice(repositoryRoot.length + 1)}`)
  if (!componentSource.includes('ExperienceControls') && !entrySource.includes('ExperienceControls')) {
    fail('renderer: missing ExperienceControls contract')
  }
  if (!componentSource.includes('useExperienceI18n') && !entrySource.includes('useExperienceI18n')) {
    fail('renderer: missing useExperienceI18n()')
  }
  if (!/\btx\s*\(/u.test(componentSource) && !/\btx\s*\(/u.test(entrySource)) {
    fail('renderer: no tx() usage found')
  }
  // ShadowRoot renderers import their private stylesheet as text so styles do
  // not leak into the site's document. This is also a private CSS import.
  const privateCssImport = /import\s+(?:\w+\s+from\s+)?['"][^'"]*styles\/[^'"]+\.css(?:\?raw)?['"]/u
  const hasCss = privateCssImport.test(componentSource)
    || privateCssImport.test(entrySource)
    || siblingComponents.some((file) => privateCssImport.test(readFileSync(file, 'utf8')))
  if (!hasCss) {
    fail('renderer: missing world-private CSS import from styles/')
  }
  if (!results.errors.some((message) => message.startsWith('renderer:'))) {
    pass('renderer: controls, i18n, and private CSS contracts are present')
  }
}

const overridePath = resolve(repositoryRoot, `src/i18n/experience-en-overrides/${worldId}.json`)
if (existsSync(overridePath)) {
  try {
    const phrases = JSON.parse(readFileSync(overridePath, 'utf8'))
    if (!phrases || Array.isArray(phrases) || typeof phrases !== 'object') {
      fail(`i18n: invalid override object src/i18n/experience-en-overrides/${worldId}.json`)
    } else {
      pass(`i18n: override file src/i18n/experience-en-overrides/${worldId}.json`)
    }
  } catch (error) {
    fail(`i18n: invalid override JSON (${error.message})`)
  }
} else {
    fail(`i18n: missing per-world override file src/i18n/experience-en-overrides/${worldId}.json`)
}

const dictionaryPath = resolve(repositoryRoot, `src/i18n/experience-en/${worldId}.json`)
if (!existsSync(dictionaryPath)) {
  fail(`i18n: missing generated dictionary src/i18n/experience-en/${worldId}.json`)
} else {
  try {
    const dictionaryBytes = statSync(dictionaryPath).size
    const dictionary = JSON.parse(readFileSync(dictionaryPath, 'utf8'))
    if (dictionaryBytes > 25_000) fail(`i18n: generated dictionary is ${dictionaryBytes} bytes; maximum is 25000`)
    if (Object.keys(dictionary).length === 0) fail('i18n: generated English dictionary is empty')
    if (Object.values(dictionary).some((value) => typeof value !== 'string' || /[\u3400-\u9fff]/u.test(value))) {
      fail('i18n: generated English dictionary contains invalid values or Chinese fallback')
    }
    if (!results.errors.some((message) => message.startsWith('i18n:'))) {
      pass(`i18n: generated dictionary ${dictionaryBytes} bytes`)
    }
  } catch (error) {
    fail(`i18n: invalid generated dictionary (${error.message})`)
  }
}

checkPoster('poster master', `public/assets/posters/${worldId}.webp`, 2560, 1600, 30_000, 320_000)
checkPoster('poster desktop', `public/assets/posters/desktop/${worldId}.webp`, 3200, 2000, 30_000, 1_600_000)
checkPoster('poster mobile', `public/assets/posters/mobile/${worldId}.webp`, 1170, 2532, 20_000, 800_000)
checkPoster('poster thumbnail', `public/assets/posters/thumb/${worldId}.webp`, 384, 256, 1, 25_000)
checkPoster('poster social', `public/assets/posters/social/${worldId}.jpg`, 1200, 630, 8_000, 200_000)

try {
  const summaries = JSON.parse(read('src/data/generated/world-summaries.json'))
  if (Array.isArray(summaries) && summaries.some((world) => world.id === worldId)) {
    pass('generated data: world summary is present')
  } else {
    warn('generated data: world summary is not on this branch yet; generate it during main integration')
  }
} catch (error) {
  warn(`generated data: could not read world summaries (${error.message})`)
}

try {
  const sitemap = read('public/sitemap.xml')
  if (sitemap.includes(`https://shapeof.world/explore/${worldId}`)) {
    pass('generated data: sitemap route is present')
  } else {
    warn('generated data: sitemap route is not on this branch yet; generate it during main integration')
  }
} catch (error) {
  warn(`generated data: could not read sitemap (${error.message})`)
}

const worldStateSource = read('src/data/world-state.ts')
const archivedBlock = worldStateSource.match(/export const archivedWorldIds:[^=]+=[\s\S]*?new Set\(\[([\s\S]*?)\]\)/u)?.[1] ?? ''
const rightsBlockedBlock = worldStateSource.match(/export const rightsBlockedWorldIds:[^=]+=[\s\S]*?new Set\(\[([\s\S]*?)\]\)/u)?.[1] ?? ''
if (new RegExp(`['"]${escapedWorldId}['"]`, 'u').test(archivedBlock)) {
  fail('catalog: world remains in archivedWorldIds')
}
if (new RegExp(`['"]${escapedWorldId}['"]`, 'u').test(rightsBlockedBlock)) {
  fail('catalog: world remains in rightsBlockedWorldIds')
}

pass('git: validator ignores unrelated dirty files; review and stage the owned slice separately')

if (results.passed.length === 0) warn('No checks passed; confirm the command is running from the oneworld repository.')

if (json) {
  console.log(JSON.stringify(results, null, 2))
} else {
  console.log(`World validation: ${worldId}`)
  for (const message of results.passed) console.log(`  PASS  ${message}`)
  for (const message of results.warnings) console.warn(`  WARN  ${message}`)
  for (const message of results.errors) console.error(`  FAIL  ${message}`)
  console.log(`Result: ${results.errors.length === 0 ? 'PASS' : 'FAIL'} (${results.passed.length} passed, ${results.warnings.length} warnings, ${results.errors.length} errors)`)
}

if (results.errors.length > 0) process.exitCode = 1
