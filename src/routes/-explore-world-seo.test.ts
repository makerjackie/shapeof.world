import { describe, expect, test } from 'vitest'

import { getWorldSearchProfile, searchPilotWorldIds } from '../data/world-search-profiles'
import { getWorld } from '../data/worlds'
import { getExperienceDiscoveryPolicy, Route } from './$worldId'

type Locale = 'zh' | 'en'
type Visibility = 'public' | 'archived'

type RenderedHead = {
  meta: Array<{ name?: string; content?: string; title?: string }>
  links: Array<{ rel?: string; href?: string; hrefLang?: string }>
  scripts: Array<{ type?: string; children?: string }>
}

const SITE = 'https://shapeof.world'

function headFor(worldId: string, locale: Locale = 'zh', visibility: Visibility = 'public'): RenderedHead {
  const world = getWorld(worldId)
  if (!world) throw new Error(`unknown world ${worldId}`)
  const head = Route.options.head?.({ loaderData: { locale, visibility, world } } as never)
  if (!head) throw new Error('route produced no head')
  return head as unknown as RenderedHead
}

function jsonLd(head: RenderedHead): Record<string, unknown> {
  return JSON.parse(head.scripts[0]?.children ?? '{}')
}

function robotsMeta(head: RenderedHead) {
  return head.meta.filter((entry) => entry.name === 'robots')
}

describe('discovery policy by visibility', () => {
  test('public worlds are indexable and describe themselves as a LearningResource', () => {
    expect(getExperienceDiscoveryPolicy('public')).toEqual({ robots: undefined, includeLearningResource: true })

    const head = headFor('eclipses')
    expect(robotsMeta(head)).toHaveLength(0)
    expect(head.scripts).toHaveLength(1)
    expect(jsonLd(head)['@type']).toBe('LearningResource')
  })

  test('archived worlds stay reachable but ask crawlers not to index them', () => {
    expect(getExperienceDiscoveryPolicy('archived')).toEqual({
      robots: 'noindex,follow',
      includeLearningResource: false,
    })

    const head = headFor('eclipses', 'zh', 'archived')
    expect(robotsMeta(head)).toEqual([{ name: 'robots', content: 'noindex,follow' }])
    expect(head.scripts).toEqual([])
  })
})

describe('pilot worlds', () => {
  test.each(['zh', 'en'] as const)('carry their %s search copy into meta and structured data', (locale) => {
    const copy = getWorldSearchProfile('moon-voyage')![locale]
    const head = headFor('moon-voyage', locale)

    expect(head.meta[0]?.title).toContain(copy.title)
    expect(head.meta.find((entry) => entry.name === 'description')?.content).toBe(copy.description)
    expect(head.meta.find((entry) => entry.name === 'keywords')?.content).toBe(copy.queries.join(', '))

    const data = jsonLd(head)
    expect(data.name).toBe(copy.title)
    expect(data.abstract).toBe(copy.answer)
    expect(data.teaches).toEqual(copy.teaches)
    expect(data.about).toEqual(copy.queries.map((name) => ({ '@type': 'Thing', name })))
  })

  test.each(searchPilotWorldIds)('%s exposes complete indexing metadata in Chinese', (worldId) => {
    const head = headFor(worldId)
    const zhUrl = `${SITE}/${worldId}`
    const enUrl = `${SITE}/en/${worldId}`

    expect(robotsMeta(head)).toHaveLength(0)
    expect(head.meta[0]?.title).toBeTruthy()
    expect(head.meta.find((entry) => entry.name === 'description')?.content).toBeTruthy()

    expect(head.links.filter((link) => link.rel === 'canonical')).toEqual([{ rel: 'canonical', href: zhUrl }])
    const alternates = Object.fromEntries(
      head.links.filter((link) => link.rel === 'alternate').map((link) => [link.hrefLang, link.href]),
    )
    expect(alternates).toEqual({ 'zh-Hans': zhUrl, en: enUrl, 'x-default': zhUrl })

    expect(head.scripts).toHaveLength(1)
    expect(jsonLd(head)).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'LearningResource',
      url: zhUrl,
      inLanguage: 'zh-Hans',
      isAccessibleForFree: true,
    })
  })

  test('the English page canonicalizes to itself while hreflang still points both ways', () => {
    const head = headFor('solar-system', 'en')
    const zhUrl = `${SITE}/solar-system`
    const enUrl = `${SITE}/en/solar-system`

    expect(head.links.filter((link) => link.rel === 'canonical')).toEqual([{ rel: 'canonical', href: enUrl }])
    const alternates = Object.fromEntries(
      head.links.filter((link) => link.rel === 'alternate').map((link) => [link.hrefLang, link.href]),
    )
    expect(alternates).toEqual({ 'zh-Hans': zhUrl, en: enUrl, 'x-default': zhUrl })

    expect(jsonLd(head)).toMatchObject({ url: enUrl, inLanguage: 'en' })
  })
})
