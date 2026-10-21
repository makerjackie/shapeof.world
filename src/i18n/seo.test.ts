import { describe, expect, it } from 'vitest'

import { languageDiscoveryLinks, localeFromRouteMatches } from './seo'

describe('route SEO locale', () => {
  it('reads the root loader locale when loader dependencies are part of the match id', () => {
    expect(localeFromRouteMatches([
      { id: '__root__', routeId: '__root__', loaderData: undefined, context: { locale: 'zh' } },
      { id: '/', routeId: '/', loaderData: undefined },
    ])).toBe('zh')
  })

  it('lets an explicit ?lang= win, then context, then the page loader locale', () => {
    expect(localeFromRouteMatches([
      { id: '__root__', search: { lang: 'en' }, context: { locale: 'zh' }, loaderData: 'zh' },
      { id: '/', loaderData: { locale: 'zh' } },
    ])).toBe('en')
    expect(localeFromRouteMatches([
      { id: '__root__', loaderData: undefined },
      { id: '/', loaderData: { locale: 'en' } },
    ])).toBe('en')
  })
})

describe('language discovery links', () => {
  it('keeps the Chinese homepage on the pretty URL and points English at /en', () => {
    expect(languageDiscoveryLinks('https://shapeof.world/', 'zh')).toEqual([
      { rel: 'canonical', href: 'https://shapeof.world/' },
      { rel: 'alternate', hrefLang: 'zh-Hans', href: 'https://shapeof.world/' },
      { rel: 'alternate', hrefLang: 'en', href: 'https://shapeof.world/en' },
      { rel: 'alternate', hrefLang: 'x-default', href: 'https://shapeof.world/' },
    ])
    expect(languageDiscoveryLinks('https://shapeof.world/en', 'en')).toEqual([
      { rel: 'canonical', href: 'https://shapeof.world/en' },
      { rel: 'alternate', hrefLang: 'zh-Hans', href: 'https://shapeof.world/' },
      { rel: 'alternate', hrefLang: 'en', href: 'https://shapeof.world/en' },
      { rel: 'alternate', hrefLang: 'x-default', href: 'https://shapeof.world/' },
    ])
  })
})
