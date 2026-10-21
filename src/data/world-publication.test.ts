import { describe, expect, it } from 'vitest'

import { worldCatalog } from './worlds/catalog'
import { getWorldPublication, isPublicWorld } from './worlds/types'

describe('world publication', () => {
  it('defaults omitted publication to making', () => {
    expect(getWorldPublication({})).toBe('making')
    expect(isPublicWorld({})).toBe(false)
  })

  it('requires explicit public publication', () => {
    expect(getWorldPublication({ publication: 'public' })).toBe('public')
    expect(isPublicWorld({ publication: 'public' })).toBe(true)
  })

  it('accepts catalog entries that omit publication as making', () => {
    expect(worldCatalog.length).toBeGreaterThan(0)
    expect(worldCatalog.every((world) => (
      world.publication === undefined
      || world.publication === 'public'
      || world.publication === 'making'
    ))).toBe(true)
    expect(worldCatalog.every((world) => (
      getWorldPublication(world) === 'public'
      || getWorldPublication(world) === 'making'
    ))).toBe(true)
  })
})
