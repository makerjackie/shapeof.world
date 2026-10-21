import { describe, expect, it } from 'vitest'

import {
  attributedShareUrl,
  languageCanonicalUrl,
  localizedPublicUrl,
  localizedShareUrl,
  publicUrlWithoutLocale,
} from './share-url'

describe('localized public URLs', () => {
  it('gives social crawlers a stable language URL', () => {
    expect(localizedPublicUrl('https://shapeof.world/explore/seasons?issue=today', 'zh'))
      .toBe('https://shapeof.world/seasons?issue=today')
  })

  it('strips an inherited lang or /en prefix before restamping the public URL', () => {
    expect(publicUrlWithoutLocale('https://shapeof.world/en?lang=en')).toBe('https://shapeof.world/')
    expect(localizedPublicUrl('https://shapeof.world/about?lang=zh', 'en'))
      .toBe('https://shapeof.world/en/about')
  })

  it('keeps Chinese on the pretty URL and self-canonicalizes English under /en', () => {
    expect(languageCanonicalUrl('https://shapeof.world/', 'zh')).toBe('https://shapeof.world/')
    expect(languageCanonicalUrl('https://shapeof.world/en/', 'zh')).toBe('https://shapeof.world/')
    expect(languageCanonicalUrl('https://shapeof.world/', 'en')).toBe('https://shapeof.world/en')
    expect(languageCanonicalUrl('https://shapeof.world/explore/solar-system?issue=today', 'en'))
      .toBe('https://shapeof.world/en/solar-system?issue=today')
  })

  it('keeps experience state while removing inherited campaign attribution', () => {
    expect(localizedShareUrl(
      'https://shapeof.world/explore/impact-simulator?diameter=100&utm_source=launch&gclid=opaque#result',
      'en',
    )).toBe('https://shapeof.world/en/impact-simulator?diameter=100#result')
  })

  it('stamps a share so the next visit is not recorded as direct', () => {
    expect(attributedShareUrl(
      'https://shapeof.world/explore/ferrofluid?utm_source=xhs&s=abc',
      'zh',
      { worldId: 'ferrofluid', content: 'moment' },
    )).toBe('https://shapeof.world/ferrofluid?s=abc&utm_source=share&utm_campaign=ferrofluid&utm_content=moment')
  })
})
