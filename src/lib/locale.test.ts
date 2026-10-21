import { describe, expect, it } from 'vitest'

import {
  isEnglishPath,
  isPublicPagePath,
  localeCookieName,
  localeFromPathname,
  localizePathname,
  publicPathnameFromHref,
  readLocaleCookie,
  readLocaleSearch,
  resolveInitialLocale,
  resolveRequestLocale,
  stripLocalePrefix,
} from './locale'

describe('initial locale negotiation', () => {
  it('lets a valid locale cookie override browser preferences', () => {
    expect(resolveInitialLocale('en', 'zh-CN,zh;q=0.9')).toBe('en')
    expect(resolveInitialLocale('zh', 'en-US,en;q=0.9')).toBe('zh')
  })

  it('uses the highest-quality supported Accept-Language entry', () => {
    expect(resolveInitialLocale(null, 'fr-FR, zh-CN;q=0.8, en-US;q=0.6')).toBe('zh')
    expect(resolveInitialLocale(undefined, 'zh-CN;q=0.5, en-US;q=0.9')).toBe('en')
    expect(resolveInitialLocale('invalid', 'zh-Hant-TW, en;q=0.8')).toBe('zh')
  })

  it('ignores disabled or malformed preferences and defaults to Chinese', () => {
    expect(resolveInitialLocale(null, 'zh;q=0, fr-FR;q=1')).toBe('zh')
    expect(resolveInitialLocale(null, 'zh;q=unexpected')).toBe('zh')
    expect(resolveInitialLocale(null, null)).toBe('zh')
  })

  it('reads only the supported locale cookie', () => {
    expect(readLocaleCookie(`session=opaque; ${localeCookieName}=en; theme=dark`)).toBe('en')
    expect(readLocaleCookie(`${localeCookieName}=zh`)).toBe('zh')
    expect(readLocaleCookie(`${localeCookieName}=fr`)).toBeUndefined()
    expect(readLocaleCookie(`${localeCookieName}=%E0%A4%A`)).toBeUndefined()
    expect(readLocaleCookie(null)).toBeUndefined()
  })

  it('reads an explicit share locale from the query string', () => {
    expect(readLocaleSearch('?issue=today&lang=zh')).toBe('zh')
    expect(readLocaleSearch('lang=en')).toBe('en')
    expect(readLocaleSearch('?lang=fr')).toBeUndefined()
    expect(readLocaleSearch(undefined)).toBeUndefined()
  })

  it('treats /en as the English site prefix', () => {
    expect(isEnglishPath('/en')).toBe(true)
    expect(isEnglishPath('/en/explore/solar-system')).toBe(true)
    expect(isEnglishPath('/explore/solar-system')).toBe(false)
    expect(localeFromPathname('/en/explore/solar-system')).toBe('en')
    expect(localeFromPathname('/explore/solar-system')).toBe('zh')
    expect(stripLocalePrefix('/en/explore/solar-system')).toBe('/explore/solar-system')
    expect(localizePathname('/explore/solar-system', 'en')).toBe('/en/explore/solar-system')
    expect(localizePathname('/', 'en')).toBe('/en')
    expect(localizePathname('/en/about', 'zh')).toBe('/about')
  })

  it('keeps explicit Chinese content URLs even when English is preferred', () => {
    expect(resolveRequestLocale({
      requestPathname: '/explore/moon-voyage',
      cookie: 'en',
      acceptLanguage: 'en-US,en;q=0.9',
    })).toEqual({ locale: 'zh' })
    expect(resolveRequestLocale({
      requestPathname: '/explore/solar-system',
      acceptLanguage: 'en-US,en;q=0.9',
    })).toEqual({ locale: 'zh' })
    expect(resolveRequestLocale({
      requestPathname: '/en/explore/moon-voyage',
      cookie: 'zh',
    })).toEqual({ locale: 'en' })
  })

  it('honors explicit share language over the path and saved preference', () => {
    for (const requestPathname of ['/explore/photon', '/en/explore/photon']) {
      for (const locale of ['zh', 'en'] as const) {
        expect(resolveRequestLocale({
          requestPathname,
          search: `?lang=${locale}&ghost=0`,
          hash: '#light-clock',
          cookie: locale === 'zh' ? 'en' : 'zh',
        })).toEqual({
          locale,
          redirectTo: `${locale === 'en' ? '/en' : ''}/explore/photon?ghost=0#light-clock`,
        })
      }
    }
    expect(resolveRequestLocale({ requestPathname: '/', search: '?lang=zh', cookie: 'en' }))
      .toEqual({ locale: 'zh', redirectTo: '/' })
    expect(resolveRequestLocale({ requestPathname: '/en/about', search: '?lang=invalid', cookie: 'zh' }))
      .toEqual({ locale: 'en' })
  })

  it('keeps the Chinese homepage stable regardless of saved or browser language', () => {
    expect(resolveRequestLocale({
      requestPathname: '/',
      cookie: 'en',
    })).toEqual({ locale: 'zh' })
    expect(resolveRequestLocale({
      requestPathname: '/',
      acceptLanguage: 'en-US,en;q=0.9',
    })).toEqual({ locale: 'zh' })
    expect(resolveRequestLocale({
      requestPathname: '/',
      acceptLanguage: 'zh-CN,zh;q=0.9',
    })).toEqual({ locale: 'zh' })
  })

  it('uses the cookie when the request URL is not a public page', () => {
    expect(isPublicPagePath('/_serverFn/getInitialLocale')).toBe(false)
    expect(resolveRequestLocale({
      requestPathname: '/_serverFn/getInitialLocale',
      cookie: 'en',
    })).toEqual({ locale: 'en' })
    expect(resolveRequestLocale({
      publicPathname: '/explore/moon-voyage',
      requestPathname: '/_serverFn/getInitialLocale',
      cookie: 'en',
    })).toEqual({ locale: 'zh' })
  })

  it('reads English from the public URL, not the delocalized router path', () => {
    expect(publicPathnameFromHref('/en/explore/moon-voyage')).toBe('/en/explore/moon-voyage')
    expect(publicPathnameFromHref('https://shapeof.world/en/about?q=1#top')).toBe('/en/about')
    expect(localeFromPathname('/explore/moon-voyage')).toBe('zh')
    expect(resolveRequestLocale({
      publicPathname: publicPathnameFromHref('/en/explore/moon-voyage'),
      requestPathname: '/_serverFn/getInitialLocale',
      cookie: 'zh',
    })).toEqual({ locale: 'en' })
  })
})
