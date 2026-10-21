import type { Locale } from '~/i18n'

export function browserLocale(): Locale {
  if (typeof navigator === 'undefined') return 'en'
  const tags = navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const tag of tags) {
    const language = tag.toLowerCase().split('-')[0]
    if (language === 'zh' || language === 'en') return language
  }
  return 'en'
}

export function preferredLocale(): Locale {
  try {
    const saved = localStorage.getItem('music.language')
    if (saved === 'zh' || saved === 'en') return saved
  } catch { /* Browser language is available even if storage is blocked. */ }
  return browserLocale()
}

export function cleanSearch(): Record<string, never> { return {} }

export function worldUrl(worldId: string, _locale: Locale): string {
  return `https://shapeof.world/explore/${encodeURIComponent(worldId)}`
}

export function worldLabel(worldId: string): string { return worldId.replaceAll('-', ' ') }
