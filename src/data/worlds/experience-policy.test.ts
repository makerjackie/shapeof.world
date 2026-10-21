import { readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { exampleExperiencePolicies, getWorldExperiencePolicy, isWorldExperiencePolicy } from './experience-policy'
import type { WorldExperiencePolicy } from './types'

const typesSource = readFileSync(resolve(import.meta.dirname, 'types.ts'), 'utf8')
const catalogRoot = resolve(import.meta.dirname, 'catalog')

function walk(dir: string, files: string[] = []) {
  for (const name of readdirSync(dir)) {
    const full = resolve(dir, name)
    if (statSync(full).isDirectory()) walk(full, files)
    else if (name.endsWith('.ts')) files.push(full)
  }
  return files
}

describe('open-ended experience policy', () => {
  it('removes ExperienceKind from catalog types', () => {
    expect(typesSource).not.toContain('ExperienceKind')
    expect(typesSource).not.toContain('experienceKind')
    expect(typesSource).toContain("export type WorldEntryMode = 'guided' | 'direct' | 'autoplay'")
    expect(typesSource).toContain("export type WorldShellMode = 'standard' | 'minimal' | 'cinematic'")
    expect(typesSource).toContain("export type WorldGuideStyle = 'story' | 'highlights' | 'demo'")
    expect(typesSource).toContain('experiencePolicy: WorldExperiencePolicy')
  })

  it('treats documented combinations as examples rather than a closed taxonomy', () => {
    expect(Object.keys(exampleExperiencePolicies)).toEqual([
      'causalNarrative',
      'highlightDemo',
      'directExplore',
      'cinematicObserve',
    ])
    expect(isWorldExperiencePolicy({ entryMode: 'direct', shellMode: 'cinematic' })).toBe(true)
    expect(isWorldExperiencePolicy({ entryMode: 'game', shellMode: 'standard' })).toBe(false)
    expect(isWorldExperiencePolicy({ entryMode: 'guided', shellMode: 'standard', guideStyle: 'story' })).toBe(true)
  })

  it('migrates every catalog record off experienceKind onto a behaviour policy', () => {
    const files = walk(catalogRoot)
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      expect(source, file).not.toContain('experienceKind')
      if (!source.includes("id:")) continue
      expect(source, file).toContain('experiencePolicy:')
      expect(source, file).toMatch(/entryMode: '(guided|direct|autoplay)'/)
      expect(source, file).toMatch(/shellMode: '(standard|minimal|cinematic)'/)
    }
  })

  it('returns the policy the shell reads instead of guessing from a kind field', () => {
    const policy: WorldExperiencePolicy = {
      entryMode: 'autoplay',
      shellMode: 'cinematic',
    }
    expect(getWorldExperiencePolicy({ experiencePolicy: policy })).toEqual(policy)
  })
})
