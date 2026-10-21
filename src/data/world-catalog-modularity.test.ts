import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const dataDirectory = import.meta.dirname
const catalogDirectory = resolve(dataDirectory, 'worlds/catalog')
const rootCategoryIds = readdirSync(catalogDirectory, {withFileTypes: true})
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)

describe('world catalogue module boundaries', () => {
  it('uses one recursive eager glob for all catalog entries', () => {
    expect(readdirSync(catalogDirectory).filter((file) => file.endsWith('.ts'))).toEqual(['index.ts'])
    const rootIndex = readFileSync(resolve(catalogDirectory, 'index.ts'), 'utf8')
    expect(rootIndex).toContain("import.meta.glob<CatalogModule>(['./**/*.ts', '!./index.ts'], {eager: true})")
    expect(rootIndex).toContain('leftPath.localeCompare(rightPath)')
    expect(rootIndex).not.toMatch(/from ['"]\.\/(?:[^']+)['"]/u)

    const directories = readdirSync(catalogDirectory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)

    expect(directories.sort()).toEqual([...rootCategoryIds].sort())
    for (const rootCategoryId of rootCategoryIds) {
      const categoryDirectory = resolve(catalogDirectory, rootCategoryId)
      const files = readdirSync(categoryDirectory).filter((file) => file.endsWith('.ts') && file !== 'index.ts')
      expect(files.length).toBeGreaterThan(0)
      expect(readdirSync(categoryDirectory).filter((file) => file === 'index.ts')).toEqual([])

      for (const file of files) {
        const source = readFileSync(resolve(categoryDirectory, file), 'utf8')
        const id = source.match(/^\s+id: '([^']+)',$/m)?.[1]
        expect(id).toBe(file.replace(/\.ts$/u, ''))
        expect(source).toContain('export default')
        expect(source).toContain('satisfies WorldExperience')
        expect(source).toMatch(/primaryCategoryId: '[^']+'/u)
      }
    }
  })

  it('keeps worlds.ts as a small public facade', () => {
    const facade = readFileSync(resolve(dataDirectory, 'worlds.ts'), 'utf8')
    expect(facade.split('\n').length).toBeLessThan(100)
    expect(facade).toContain("import { worldCatalog } from './worlds/catalog'")
  })

  it('keeps build scripts aligned with the unified world state source', () => {
    const source = readFileSync(resolve(dataDirectory, '../../scripts/lib/world-catalog-source.mjs'), 'utf8')
    expect(source).toContain("resolve(root, 'src/data/world-lifecycle-ledger.json')")
    expect(source).not.toContain("resolve(root, 'src/data/worlds.ts')")
  })
})
