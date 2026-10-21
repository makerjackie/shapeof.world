import { describe, expect, it } from 'vitest'

import { worldCatalog } from './worlds/catalog'

const titleFields = ['title', 'posterTitle', 'question'] as const

describe('English title style', () => {
  it('keeps spaces around em dashes in English titles', () => {
    for (const world of worldCatalog) {
      for (const field of titleFields) {
        const value = world.translations.en[field]
        if (!value?.includes('—')) continue
        expect(value, `${world.id} ${field}`).not.toMatch(/\S—|—\S/)
      }
    }
  })
})
