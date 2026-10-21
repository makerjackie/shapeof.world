import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

import { worlds } from '~/data/worlds'

const experiencesRoot = resolve(import.meta.dirname)
const automaticWorldsRoot = resolve(experiencesRoot, 'worlds')
const registrySource = readFileSync(
  resolve(import.meta.dirname, '../../worlds/experience-registry.ts'),
  'utf8',
)

function resolveLocalModule(fromFile: string, specifier: string) {
  const base = specifier.startsWith('~/components/experiences/')
    ? resolve(experiencesRoot, specifier.slice('~/components/experiences/'.length))
    : resolve(dirname(fromFile), specifier)
  const candidates = [
    base,
    `${base}.tsx`,
    `${base}.ts`,
    resolve(base, 'index.tsx'),
    resolve(base, 'index.ts'),
  ]
  return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile())
}

function reachesSharedFreebar(file: string, seen = new Set<string>()): boolean {
  if (seen.has(file)) return false
  seen.add(file)

  const source = readFileSync(file, 'utf8')
  if (
    source.includes('<Freebar')
    && /from ['"](?:~\/components\/experiences\/Freebar|\.\/Freebar|.*\/Freebar)['"]/.test(source)
  ) {
    return true
  }

  for (const match of source.matchAll(/from ['"](\.[^'"]+|~\/components\/experiences\/[^'"]+)['"]/g)) {
    const dependency = resolveLocalModule(file, match[1])
    if (
      dependency
      && dependency.startsWith(`${experiencesRoot}${sep}`)
      && reachesSharedFreebar(dependency, seen)
    ) {
      return true
    }
  }
  return false
}

describe('public Freebar coverage', () => {
  it('keeps standard-shell migration coverage while allowing minimal and cinematic worlds without a Freebar', () => {
    const rendererModules = new Map<string, string>()
    for (const match of registrySource.matchAll(
      /'([^']+)':\s*lazyExperience\([^,]+,\s*\(\)\s*=>\s*import\('~\/components\/experiences\/([^']+)'\)/g,
    )) {
      rendererModules.set(match[1], match[2])
    }
    if (existsSync(automaticWorldsRoot)) {
      for (const entry of readdirSync(automaticWorldsRoot, { withFileTypes: true })) {
        if (entry.isDirectory()) rendererModules.set(entry.name, `worlds/${entry.name}/index.tsx`)
      }
    }

    const missing: string[] = []
    for (const world of worlds) {
      const moduleName = rendererModules.get(world.renderer)
      const moduleFile = moduleName && resolveLocalModule(
        resolve(experiencesRoot, '__registry__.ts'),
        `./${moduleName}`,
      )
      // PRODUCT_STANDARD permits collections and other self-contained stages without a Freebar.
      const standardShell = (world.experiencePolicy?.shellMode ?? 'standard') === 'standard'
      if (!moduleFile || (standardShell && !reachesSharedFreebar(moduleFile))) {
        missing.push(`${world.id}:${world.renderer}:${moduleName ?? 'unregistered'}`)
      }
    }

    expect(missing).toEqual([])
  })

  it('contains no private shell or retired control vocabulary', () => {
    const offenders: string[] = []
    const visit = (file: string) => {
      const source = readFileSync(file, 'utf8')
      if (source.includes('experience-dock')) {
        offenders.push(relative(experiencesRoot, file))
      }
    }

    for (const moduleName of new Set(
      [...registrySource.matchAll(/import\('~\/components\/experiences\/([^']+)'\)/g)]
        .map((match) => match[1]),
    )) {
      const file = resolveLocalModule(
        resolve(experiencesRoot, '__registry__.ts'),
        `./${moduleName}`,
      )
      if (file) visit(file)
    }
    if (existsSync(automaticWorldsRoot)) {
      for (const entry of readdirSync(automaticWorldsRoot, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue
        const file = resolveLocalModule(
          resolve(experiencesRoot, '__automatic__.ts'),
          `./worlds/${entry.name}/index.tsx`,
        )
        if (file) visit(file)
      }
    }

    expect(offenders).toEqual([])
  })
})
