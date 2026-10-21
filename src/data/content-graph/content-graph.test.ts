import { describe, expect, it } from 'vitest'

import {
  allCategories,
  allPaths,
  assertPublicPathWorlds,
  categories,
  getContentGraphPublication,
  getCategory,
  getCategoryParents,
  getPathBySlug,
  getExperimentalPathBySlug,
  getPathContext,
  getPrimaryCategoryTrail,
  isPublicContentGraphNode,
  paths,
  rootCategories,
  validatePublicPathWorlds,
} from '.'
import { getPublicWorld } from '../worlds'
import { worldCatalog } from '../worlds/catalog'

describe('content graph', () => {
  it('no longer ships the high-school experimental paths and exposes no ordinary drafts or public routes', () => {
    for (const slug of ['high-school-geography', 'high-school-physics']) {
      expect(getPathBySlug(slug)).toBeUndefined()
      expect(paths.some(path => path.slug === slug)).toBe(false)
      expect(getExperimentalPathBySlug(slug)).toBeUndefined()
    }
    expect(getExperimentalPathBySlug('a-life')).toBeUndefined()
    expect(getExperimentalPathBySlug('missing')).toBeUndefined()
    expect(getPathBySlug('always-falling')).toBeDefined()
  })
  it('discovers unique categories and paths from private files', () => {
    expect(new Set(allCategories.map((category) => category.id)).size).toBe(allCategories.length)
    expect(new Set(allPaths.map((path) => path.id)).size).toBe(allPaths.length)
    expect(new Set(allPaths.map((path) => path.slug)).size).toBe(allPaths.length)
    expect(new Set(categories.map((category) => category.id)).size).toBe(categories.length)
    expect(new Set(paths.map((path) => path.id)).size).toBe(paths.length)
    expect(categories.every(isPublicContentGraphNode)).toBe(true)
    expect(paths.every(isPublicContentGraphNode)).toBe(true)
    expect(rootCategories.length).toBeGreaterThan(0)
  })

  it('keeps the in-production life series discoverable to authors but out of public routes', () => {
    const series = allPaths.find(path => path.id === 'life-stories')
    expect(series).toBeUndefined()
    expect(paths.some(path => path.id === 'life-stories')).toBe(false)
    expect(getPathBySlug('a-life')).toBeUndefined()
  })

  it('defaults discovered nodes to draft until explicitly published', () => {
    expect(getContentGraphPublication({})).toBe('draft')
    expect(isPublicContentGraphNode({})).toBe(false)
    expect(getContentGraphPublication({ publication: 'public' })).toBe('public')
    expect(isPublicContentGraphNode({ publication: 'public' })).toBe(true)
  })

  it('keeps every public category parent in the public graph', () => {
    const publicCategoryIds = new Set(categories.map((category) => category.id))
    for (const category of categories) {
      for (const parentId of [category.primaryParentId, ...(category.additionalParentIds ?? [])]) {
        if (parentId) expect(publicCategoryIds.has(parentId), `${category.id}:${parentId}`).toBe(true)
      }
    }
  })

  it('keeps a stable primary trail and optional additional parents', () => {
    expect(getPrimaryCategoryTrail('waves').map((category) => category.id)).toEqual([
      'math-signals',
      'waves',
    ])
    expect(getCategoryParents('waves').map((category) => category.id)).toEqual([
      'math-signals',
      'physics',
    ])
    expect(getCategory('physics').primaryParentId).toBeUndefined()
  })

  it('resolves every World membership without duplicating its primary Category', () => {
    for (const world of worldCatalog) {
      expect(() => getCategory(world.primaryCategoryId), world.id).not.toThrow()
      const additional = world.additionalCategoryIds ?? []
      expect(new Set(additional).size, world.id).toBe(additional.length)
      expect(additional, world.id).not.toContain(world.primaryCategoryId)
      for (const categoryId of additional) {
        expect(() => getCategory(categoryId), `${world.id}:${categoryId}`).not.toThrow()
      }
    }
  })

  it('derives route context only from an explicit path id', () => {
    expect(getPathContext('earth-to-solar-system', 'eclipses')).toMatchObject({
      order: 2,
      total: 4,
      prevWorldId: 'earth-spin-orbit',
      nextWorldId: 'solar-system',
    })
    expect(getPathContext('ai-learning', 'moon-voyage')).toBeUndefined()
    expect(getPathContext('missing', 'next-token')).toBeUndefined()
    expect(getPathBySlug('always-falling')?.id).toBe('orbital-mechanics')
    expect(getPathBySlug('missing')).toBeUndefined()
  })

  it('validates public paths through an external World status resolver', () => {
    const resolveWorld = (worldId: string) => {
      return getPublicWorld(worldId)
        ? { publication: 'public', discoverable: true }
        : undefined
    }

    expect(validatePublicPathWorlds(resolveWorld)).toEqual([])
    expect(() => assertPublicPathWorlds(resolveWorld)).not.toThrow()

    const draftWorldPath = { ...paths[0], worldIds: ['draft-world'] }
    expect(validatePublicPathWorlds(() => ({ publication: 'making', discoverable: true }), [draftWorldPath])).toEqual([
      `Public path ${draftWorldPath.id} references non-public World draft-world`,
    ])
    expect(validatePublicPathWorlds(() => ({ publication: 'public', discoverable: false }), [draftWorldPath])).toEqual([
      `Public path ${draftWorldPath.id} references undiscoverable World draft-world`,
    ])
  })
})
