import { describe, expect, it } from 'vitest'

import { worlds } from './worlds'
import { worldSummaries } from './world-summaries'

describe('generated world summaries', () => {
  it('matches every public world without shipping full sources to catalogue routes', () => {
    expect(worldSummaries.map((world) => world.id)).toEqual(worlds.map((world) => world.id))
    for (const [index, world] of worlds.entries()) {
      expect(worldSummaries[index]).toEqual({
        id: world.id,
        index: world.index,
        poster: world.poster,
        ...(world.posterMobile ? { posterMobile: world.posterMobile } : {}),
        ...(world.posterDesktop ? { posterDesktop: world.posterDesktop } : {}),
        title: world.title,
        posterTitle: world.posterTitle,
        posterHook: world.posterHook,
        question: world.question,
        topicLabel: world.topicLabel,
        translations: {
          en: {
            title: world.translations.en.title,
            posterTitle: world.translations.en.posterTitle,
            posterHook: world.translations.en.posterHook,
            question: world.translations.en.question,
            topicLabel: world.translations.en.topicLabel,
          },
        },
        primaryCategoryId: world.primaryCategoryId,
        ...(world.additionalCategoryIds ? { additionalCategoryIds: world.additionalCategoryIds } : {}),
        renderer: world.renderer,
        runtime: world.runtime,
        difficulty: world.difficulty,
        duration: world.duration,
        evidence: world.evidence,
        accent: world.accent,
        ...(world.posterPosition ? { posterPosition: world.posterPosition } : {}),
      })
    }
  })
})
