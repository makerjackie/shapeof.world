import type { SupportedLocale } from './locale'

const campaignParameter = /^(?:utm_.+|gclid|fbclid|msclkid)$/i

export function localizedPublicUrl(rawUrl: string, locale: SupportedLocale): string {
  const url = new URL(rawUrl)
  url.searchParams.set('lang', locale)
  return url.toString()
}

export function localizedShareUrl(rawUrl: string, locale: SupportedLocale): string {
  const url = new URL(rawUrl)
  for (const key of [...url.searchParams.keys()]) {
    if (campaignParameter.test(key)) url.searchParams.delete(key)
  }
  url.searchParams.set('lang', locale)
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
