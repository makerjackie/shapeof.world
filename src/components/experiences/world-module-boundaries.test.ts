import { readdirSync, readFileSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import { worldCatalog } from '../../data/worlds/catalog'

const worldsDirectory = resolve(import.meta.dirname, 'worlds')
const registrySource = readFileSync(resolve(import.meta.dirname, '../../worlds/experience-registry.ts'), 'utf8')

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = resolve(directory, entry.name)
    if (entry.isDirectory()) return collectSourceFiles(file)
    return /\.(?:ts|tsx)$/.test(entry.name) ? [file] : []
  })
}

function importSpecifiers(file: string): string[] {
  const sourceFile = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
  const specifiers: string[] = []
  const visit = (node: ts.Node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
      && node.moduleSpecifier
      && ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text)
    }
    if (
      ts.isCallExpression(node)
      && node.expression.kind === ts.SyntaxKind.ImportKeyword
      && node.arguments.length === 1
      && ts.isStringLiteral(node.arguments[0])
    ) {
      specifiers.push(node.arguments[0].text)
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return specifiers
}

function isWithin(directory: string, file: string): boolean {
  const path = relative(directory, file)
  return path === '' || (!isAbsolute(path) && path !== '..' && !path.startsWith('../'))
}

describe('world package module boundaries', () => {
  it('discovers world entrypoints and pairs dictionaries by the directory id', () => {
    expect(registrySource).toContain("import.meta.glob('../components/experiences/worlds/*/index.tsx')")
    expect(registrySource).toContain('module.worldRenderer')
    expect(registrySource).toContain('`../i18n/experience-en/${id}.json`')
    expect(registrySource).toContain(
      'export const rendererRegistry = automaticRendererRegistry',
    )
    expect(registrySource).not.toContain('legacyRendererRegistry')
  })

  it('requires each world entrypoint to expose worldRenderer', () => {
    const worldIds = readdirSync(worldsDirectory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)

    expect(worldIds.length).toBeGreaterThan(0)
    for (const worldId of worldIds) {
      const entrypoint = resolve(worldsDirectory, worldId, 'index.tsx')
      const source = readFileSync(entrypoint, 'utf8')
      expect(source, `${worldId}/index.tsx`).toMatch(/\bworldRenderer\b/)
      const catalogWorld = worldCatalog.find((world) => world.id === worldId || world.renderer === worldId)
      expect(catalogWorld, `${worldId}: missing catalog record`).toBeDefined()
      expect(catalogWorld?.renderer, `${worldId}: renderer must match directory id`).toBe(worldId)
    }
  })

  it('does not duplicate automatic world ids in the legacy registry', () => {
    const legacyIds = new Set(
      [...registrySource.matchAll(/^\s*'([^']+)':\s*lazyExperience\(/gmu)].map((match) => match[1]),
    )
    const automaticIds = readdirSync(worldsDirectory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)

    expect(automaticIds.filter((worldId) => legacyIds.has(worldId))).toEqual([])
  })

  it('keeps world modules inside their own directory or the shared layer', { timeout: 60_000 }, () => {
    const worldEntries = readdirSync(worldsDirectory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())

    for (const entry of worldEntries) {
      const worldId = entry.name
      const worldDirectory = resolve(worldsDirectory, worldId)
      for (const file of collectSourceFiles(worldDirectory)) {
        for (const specifier of importSpecifiers(file)) {
          if (specifier.startsWith('.')) {
            const target = resolve(dirname(file), specifier)
            expect(
              isWithin(worldDirectory, target),
              `${worldId}: ${relative(worldDirectory, file)} imports ${specifier}`,
            ).toBe(true)
          }

          const otherWorld = specifier.match(/^~\/components\/experiences\/worlds\/([^/]+)/)?.[1]
          if (otherWorld && otherWorld !== worldId) {
            expect(otherWorld, `${worldId}: ${relative(worldDirectory, file)} imports ${specifier}`).toBeUndefined()
          }
        }
      }
    }
  })
})
