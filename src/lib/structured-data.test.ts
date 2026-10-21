import { describe, expect, it } from 'vitest'

import {
  categoryStructuredData,
  homeStructuredData,
  websiteJsonLd,
} from './structured-data'

describe('site structured data', () => {
  it('describes the homepage as a searchable WebSite plus Organization', () => {
    const chinese = homeStructuredData('zh')
    expect(chinese['@context']).toBe('https://schema.org')
    expect(chinese['@graph']).toEqual(expect.arrayContaining([
      expect.objectContaining({
        '@type': 'WebSite',
        url: 'https://shapeof.world/',
        inLanguage: 'zh-Hans',
        potentialAction: expect.objectContaining({
          '@type': 'SearchAction',
          target: expect.objectContaining({
            urlTemplate: 'https://shapeof.world/?q={search_term_string}',
          }),
        }),
      }),
      expect.objectContaining({
        '@type': 'Organization',
        name: 'Shape of the World',
        logo: 'https://shapeof.world/assets/brand/app-icon.png',
      }),
    ]))

    expect(websiteJsonLd('en').url).toBe('https://shapeof.world/en')
    expect(websiteJsonLd('en').potentialAction).toEqual(expect.objectContaining({
      target: expect.objectContaining({
        urlTemplate: 'https://shapeof.world/en?q={search_term_string}',
      }),
    }))
  })

  it('adds breadcrumbs and an ItemList to category pages', () => {
    const data = categoryStructuredData({
      locale: 'en',
      categoryId: 'physics',
      name: 'Physics',
      trail: [
        { id: 'science', title: '科学', titleEn: 'Science' },
        { id: 'physics', title: '物理', titleEn: 'Physics' },
      ],
      worlds: [
        { id: 'double-pendulum', name: 'Why do two releases 0.1° apart end so differently?' },
      ],
    })
    expect(data['@graph']).toEqual(expect.arrayContaining([
      expect.objectContaining({
        '@type': 'BreadcrumbList',
        itemListElement: [
          expect.objectContaining({ position: 1, name: 'Home', item: 'https://shapeof.world/en' }),
          expect.objectContaining({ position: 2, name: 'Science', item: 'https://shapeof.world/en/category/science' }),
          expect.objectContaining({ position: 3, name: 'Physics', item: 'https://shapeof.world/en/category/physics' }),
        ],
      }),
      expect.objectContaining({
        '@type': 'ItemList',
        numberOfItems: 1,
        itemListElement: [
          expect.objectContaining({
            position: 1,
            url: 'https://shapeof.world/en/double-pendulum',
          }),
        ],
      }),
    ]))
  })
})
