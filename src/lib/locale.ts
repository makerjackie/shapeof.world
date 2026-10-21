export type SupportedLocale = 'en' | 'zh'

export const localeCookieName = 'oneworld.locale.v1'
const paraglideCookieName = 'PARAGLIDE_LOCALE'

export function isEnglishPath(pathname: string): boolean {
  return pathname === '/en' || pathname.startsWith('/en/')
}

export function localeFromPathname(pathname: string): SupportedLocale {
  return isEnglishPath(pathname) ? 'en' : 'zh'
}

export function isPublicPagePath(pathname: string): boolean {
  return !pathname.startsWith('/api/') && !pathname.startsWith('/_')
}

/**
 * Pathname of the user-facing URL.
 *
 * TanStack Router `rewrite.input` delocalizes `location.pathname` and
 * `location.href` (`/en/x` → `/x`). Locale must be read
 * from `location.publicHref`, which keeps the `/en` prefix.
 */
export function publicPathnameFromHref(href: string | undefined, fallback = '/'): string {
  if (!href) return fallback
  try {
    return new URL(href, 'https://shapeof.world').pathname || fallback
  } catch {
    const path = href.split(/[?#]/, 1)[0]
    return path.startsWith('/') ? path : fallback
  }
}

/**
 * Resolve the document locale from the public URL.
 *
 * An explicit supported `lang` query wins and redirects to a clean localized URL.
 * Otherwise `/en` and `/en/...` are English. Every other public page is Chinese and
 * must not be rewritten to `/en` just because a cookie or Accept-Language
 * prefers English. Cookies only fill in locale when the request URL is not a public page
 * (server functions). The Chinese homepage remains stable for all visitors.
 */
export function resolveRequestLocale(input: {
  publicPathname?: string | null
  requestPathname: string
  search?: string
  hash?: string
  cookie?: SupportedLocale
  acceptLanguage?: string | null
}): { locale: SupportedLocale; redirectTo?: string } {
  const pagePath = input.publicPathname && isPublicPagePath(input.publicPathname)
    ? input.publicPathname
    : isPublicPagePath(input.requestPathname)
      ? input.requestPathname
      : undefined

  if (!pagePath) return { locale: input.cookie ?? 'zh' }

  const explicitLocale = readLocaleSearch(input.search)
  if (explicitLocale) {
    const query = new URLSearchParams(input.search)
    query.delete('lang')
    const search = query.size ? `?${query.toString()}` : ''
    const hash = input.hash ? `#${input.hash.replace(/^#/, '')}` : ''
    return {
      locale: explicitLocale,
      redirectTo: `${localizePathname(pagePath, explicitLocale)}${search}${hash}`,
    }
  }
  if (isEnglishPath(pagePath)) return { locale: 'en' }

  return { locale: 'zh' }
}

export function stripLocalePrefix(pathname: string): string {
  if (pathname === '/en') return '/'
  if (pathname.startsWith('/en/')) {
    const stripped = pathname.slice(3)
    return stripped.startsWith('/') ? stripped : `/${stripped}`
  }
  return pathname || '/'
}

export function localizePathname(pathname: string, locale: SupportedLocale): string {
  const path = stripLocalePrefix(pathname) || '/'
  if (locale !== 'en') return path
  return path === '/' ? '/en' : `/en${path}`
}

export function readLocaleSearch(search: string | null | undefined): SupportedLocale | undefined {
  if (!search) return
  const value = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get('lang')
  return value === 'zh' || value === 'en' ? value : undefined
}

type LanguagePreference = {
  locale: SupportedLocale
  quality: number
  order: number
}

export function resolveInitialLocale(
  storedLocale: string | null | undefined,
  acceptLanguage: string | null | undefined,
): SupportedLocale {
  if (storedLocale === 'zh' || storedLocale === 'en') return storedLocale

  const preferences = (acceptLanguage ?? '')
    .split(',')
    .map((entry, order): LanguagePreference | undefined => {
      const [rawTag, ...parameters] = entry.trim().toLowerCase().split(';')
      const locale = rawTag === 'zh' || rawTag.startsWith('zh-')
        ? 'zh'
        : rawTag === 'en' || rawTag.startsWith('en-')
          ? 'en'
          : undefined
      if (!locale) return

      const qualityParameter = parameters.find((parameter) => parameter.trim().startsWith('q='))
      const quality = qualityParameter ? Number(qualityParameter.trim().slice(2)) : 1
      if (!Number.isFinite(quality) || quality <= 0 || quality > 1) return
      return { locale, quality, order }
    })
    .filter((preference): preference is LanguagePreference => Boolean(preference))
    .sort((left, right) => right.quality - left.quality || left.order - right.order)

  return preferences[0]?.locale ?? 'zh'
}

export function readLocaleCookie(cookieHeader: string | null | undefined): SupportedLocale | undefined {
  if (!cookieHeader) return

  let fallback: SupportedLocale | undefined
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=')
    if (separator < 0) continue
    const name = part.slice(0, separator).trim()
    if (name !== localeCookieName && name !== paraglideCookieName) continue
    let value: string
    try {
      value = decodeURIComponent(part.slice(separator + 1).trim())
    } catch {
      continue
    }
    if (value !== 'en' && value !== 'zh') continue
    if (name === localeCookieName) return value
    fallback = value
  }
  return fallback
}
