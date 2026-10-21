import { parseWorldPath, worldPath } from './world-urls'
import { localizePathname, stripLocalePrefix, type SupportedLocale } from './locale'

const campaignParameter = /^(?:utm_.+|gclid|fbclid|msclkid)$/i

export function publicUrlWithoutLocale(rawUrl: string): string {
  const url = new URL(rawUrl)
  url.searchParams.delete('lang')
  url.pathname = stripLocalePrefix(url.pathname)
  const world = parseWorldPath(url.pathname)
  if (world?.legacy) url.pathname = worldPath(world.worldId)
  return url.toString()
}

export function localizedPublicUrl(rawUrl: string, locale: SupportedLocale): string {
  const url = new URL(publicUrlWithoutLocale(rawUrl))
  url.pathname = localizePathname(url.pathname, locale)
  return url.toString()
}

/** Chinese keeps the pretty default URL. English self-canonicalizes under `/en`. */
export function languageCanonicalUrl(rawUrl: string, locale: SupportedLocale): string {
  const xDefault = publicUrlWithoutLocale(rawUrl)
  return locale === 'en' ? localizedPublicUrl(xDefault, 'en') : xDefault
}

export function localizedShareUrl(rawUrl: string, locale: SupportedLocale): string {
  const url = new URL(publicUrlWithoutLocale(rawUrl))
  for (const key of [...url.searchParams.keys()]) {
    if (campaignParameter.test(key)) url.searchParams.delete(key)
  }
  url.searchParams.delete('lang')
  url.pathname = localizePathname(url.pathname, locale)
  return url.toString()
}

/**
 * Outbound share links drop inherited campaign tags, then stamp this share so
 * the next visit is attributed to `share` rather than "direct".
 */
export function attributedShareUrl(
  rawUrl: string,
  locale: SupportedLocale,
  attribution: { worldId: string; content?: string },
): string {
  const url = new URL(localizedShareUrl(rawUrl, locale))
  url.searchParams.set('utm_source', 'share')
  url.searchParams.set('utm_campaign', attribution.worldId)
  url.searchParams.set('utm_content', attribution.content ?? 'moment')
  return url.toString()
}
