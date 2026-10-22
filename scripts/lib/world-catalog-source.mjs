import { basename, relative, resolve, sep } from 'node:path'
import { readFileSync, readdirSync } from 'node:fs'

import { isPublicWorld } from '../../src/data/worlds/types.ts'

function collectTypeScriptFiles(directory) {
  return readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) return collectTypeScriptFiles(path)
    if (entry.isFile() && entry.name.endsWith('.ts') && entry.name !== 'index.ts') return [path]
    return []
  })
}

/** Root Category for works: art and math pieces that answer no single everyday question. */
export const WORKS_CATEGORY_ID = 'works'

export function readWorldCatalogFiles(root) {
  const catalogDirectory = resolve(root, 'src/data/worlds/catalog')
  return collectTypeScriptFiles(catalogDirectory)
    .sort((left, right) => relative(catalogDirectory, left).localeCompare(relative(catalogDirectory, right)))
    .map((path) => {
      const relativePath = relative(catalogDirectory, path)
      const [rootCategoryId] = relativePath.split(sep)
      return {
        rootCategoryId,
        file: basename(path),
        path,
        source: readFileSync(path, 'utf8'),
      }
    })
}

export function readWorldCatalogSource(root) {
  return readWorldCatalogFiles(root).map(({source}) => source).join('\n')
}

export function isPublicWorldSource(source) {
  const publication = source.match(/^\s*publication:\s*'(public|making)'/mu)?.[1]
  return isPublicWorld({publication})
}

export function readArchivedWorldIds(root) {
	const ledger = JSON.parse(readFileSync(resolve(root, 'src/data/world-lifecycle-ledger.json'), 'utf8'))
	return new Set(ledger.archivedWorldIds ?? [])
}
