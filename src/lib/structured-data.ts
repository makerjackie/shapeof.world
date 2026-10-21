import { worldPath } from '~/lib/world-urls'
import { languageCanonicalUrl, localizedPublicUrl } from '~/lib/share-url'
import type { Locale } from '~/i18n'

export const SITE_NAME = 'Shape of the World'
export const SITE_ORIGIN = 'https://shapeof.world'
export const ORGANIZATION_LOGO = `${SITE_ORIGIN}/assets/brand/app-icon.png`

type JsonLd = Record<string, unknown>

export function organizationJsonLd(): JsonLd {
  return {
    '@type': 'Organization',
    name: SITE_NAME,
    url: `${SITE_ORIGIN}/`,
    logo: ORGANIZATION_LOGO,
  }
}

export function websiteJsonLd(locale: Locale): JsonLd {
  const home = `${SITE_ORIGIN}/`
  const searchUrl = localizedPublicUrl(home, locale)
  const searchTarget = searchUrl.includes('?')
    ? `${searchUrl}&q={search_term_string}`
    : `${searchUrl}?q={search_term_string}`
  return {
    '@type': 'WebSite',
    name: SITE_NAME,
    url: languageCanonicalUrl(home, locale),
    inLanguage: locale === 'zh' ? 'zh-Hans' : 'en',
    publisher: organizationJsonLd(),
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: searchTarget,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

export function homeStructuredData(locale: Locale): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@graph': [websiteJsonLd(locale), organizationJsonLd()],
  }
}

export function categoryBreadcrumbList(input: {
  locale: Locale
  trail: ReadonlyArray<{ id: string; title: string; titleEn: string }>
}): JsonLd {
  const home = languageCanonicalUrl(`${SITE_ORIGIN}/`, input.locale)
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: input.locale === 'zh' ? '首页' : 'Home',
        item: home,
      },
      ...input.trail.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 2,
        name: input.locale === 'zh' ? item.title : item.titleEn,
        item: languageCanonicalUrl(`${SITE_ORIGIN}/category/${item.id}`, input.locale),
      })),
    ],
  }
}

export function categoryItemList(input: {
  locale: Locale
  categoryId: string
  name: string
  worlds: ReadonlyArray<{ id: string; name: string }>
}): JsonLd {
  return {
    '@type': 'ItemList',
    name: input.name,
    numberOfItems: input.worlds.length,
    itemListElement: input.worlds.map((world, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: world.name,
      url: languageCanonicalUrl(`${SITE_ORIGIN}${worldPath(world.id)}`, input.locale),
    })),
  }
}

export function categoryStructuredData(input: {
  locale: Locale
  categoryId: string
  name: string
  trail: ReadonlyArray<{ id: string; title: string; titleEn: string }>
  worlds: ReadonlyArray<{ id: string; name: string }>
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      categoryBreadcrumbList(input),
      categoryItemList(input),
    ],
  }
}

export function jsonLdScript(data: JsonLd) {
  return {
    type: 'application/ld+json' as const,
    children: JSON.stringify(data),
  }
}
