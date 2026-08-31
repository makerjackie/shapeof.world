export type SupportedLocale = 'en' | 'zh'

export const localeCookieName = 'oneworld.locale.v1'

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

  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=')
    if (separator < 0) continue
    const name = part.slice(0, separator).trim()
    if (name !== localeCookieName) continue
    let value: string
    try {
      value = decodeURIComponent(part.slice(separator + 1).trim())
    } catch {
      return
    }
    if (value === 'en' || value === 'zh') return value
    return
  }
}
