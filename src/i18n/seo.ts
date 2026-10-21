import { useEffect } from 'react'

import { languageCanonicalUrl, localizedPublicUrl, publicUrlWithoutLocale } from '~/lib/share-url'

import { useI18n, type Locale } from './index'

export function languageDiscoveryLinks(rawUrl: string, locale: Locale) {
  const xDefault = publicUrlWithoutLocale(rawUrl)
  return [
    { rel: 'canonical' as const, href: languageCanonicalUrl(xDefault, locale) },
    { rel: 'alternate' as const, hrefLang: 'zh-Hans' as const, href: localizedPublicUrl(xDefault, 'zh') },
    { rel: 'alternate' as const, hrefLang: 'en' as const, href: localizedPublicUrl(xDefault, 'en') },
    { rel: 'alternate' as const, hrefLang: 'x-default' as const, href: xDefault },
  ]
}

export type LocalizedSeoRoute = 'home' | 'worlds' | 'about' | 'changelog' | 'routes' | 'sources' | 'failures' | 'making' | 'logo'

type SeoCopy = {
  title: string
  description: string
}

const routeSeo: Record<LocalizedSeoRoute, Record<Locale, SeoCopy>> = {
  home: {
    zh: {
      title: '世界的形状 — 看见世界如何运行',
      description: '看见世界如何运行：改变参数，观察结果，亲手理解宇宙、生命、数学、AI 与人类世界背后的规律。',
    },
    en: {
      title: 'Shape of the World — See how the world works',
      description: 'See how the world works: change parameters, observe results, and explore the rules behind space, life, mathematics, AI, and engineering.',
    },
  },
  worlds: {
    zh: {
      title: '全部互动世界 — 世界的形状',
      description: '黑洞、星系、名画、钱的流向、数学与 AI——五十多个可以亲手玩的互动世界。',
    },
    en: {
      title: 'All Interactive Worlds — Shape of the World',
      description: 'Black holes, galaxies, paintings, where money goes, mathematics and AI: fifty-plus interactive worlds you can play with your own hands.',
    },
  },
  changelog: {
    zh: {
      title: '更新日志 — 世界的形状',
      description: '世界的形状新增了哪些互动世界、重做了哪些舞台，以及最近的产品变化。',
    },
    en: {
      title: 'Changelog — Shape of the World',
      description: 'Which interactive worlds joined Shape of the World, which stages were rebuilt, and what changed recently.',
    },
  },
  routes: {
    zh: {
      title: '策展路线 — 世界的形状',
      description: '把几个世界串成一条路线，从一个问题一路探索下去。',
    },
    en: {
      title: 'Curated routes — Shape of the World',
      description: 'A few worlds, in order, from one question to the next.',
    },
  },
  about: {
    zh: {
      title: '关于我们 — 世界的形状',
      description: '世界的形状为什么存在：创作缘起与创作者。',
    },
    en: {
      title: 'About Us — Shape of the World',
      description: 'Why Shape of the World exists, and who makes it.',
    },
  },
  sources: {
    zh: {
      title: '资料来源 — 世界的形状',
      description: '每个互动世界背后的论文、数据集与官方文档：完整来源账本，可搜索、可按主题与证据等级筛选。',
    },
    en: {
      title: 'Sources — Shape of the World',
      description: 'The papers, datasets, and official documentation behind every interactive world—a full ledger you can search and filter by theme or evidence level.',
    },
  },
  failures: {
    zh: {
      title: '失败主题纪念馆 — 世界的形状',
      description: '保存没有通过人工视觉验收的互动世界，以及它们的初始原型模型与创作时间。',
    },
    en: {
      title: 'Museum of Failed Worlds — Shape of the World',
      description: 'An archive of interactive worlds that did not pass visual review, with their initial prototype model and creation date.',
    },
  },
  making: {
    zh: {
      title: '制作中的世界 — 世界的形状',
      description: '尚未进入公开目录的互动世界与早期尝试，可以直接打开体验。',
    },
    en: {
      title: 'Worlds in the Making — Shape of the World',
      description: 'Explore interactive worlds and early experiments outside the public catalogue.',
    },
  },
  logo: {
    zh: {
      title: 'Logo — 世界的形状',
      description: '世界的形状 Logo、中英锁名、深色与浅色版本，以及 PNG 与 zip 下载。',
    },
    en: {
      title: 'Logo — Shape of the World',
      description: 'The Shape of the World mark, Chinese and English lockups, dark and paper versions, and PNG and zip downloads.',
    },
  },
}

export function getLocalizedSeo(route: LocalizedSeoRoute, locale: Locale): SeoCopy {
  return routeSeo[route][locale]
}

function localeFromUnknown(value: unknown): Locale | undefined {
  if (value === 'zh' || value === 'en') return value
  if (value && typeof value === 'object' && 'locale' in value) {
    const locale = value.locale
    if (locale === 'zh' || locale === 'en') return locale
  }
  return undefined
}

export function localeFromRouteMatches(
  matches: ReadonlyArray<{
    id?: unknown
    routeId?: unknown
    loaderData?: unknown
    search?: unknown
    context?: unknown
  }>,
): Locale {
  for (const match of matches) {
    if (
      match.search
      && typeof match.search === 'object'
      && 'lang' in match.search
      && (match.search.lang === 'zh' || match.search.lang === 'en')
    ) {
      return match.search.lang
    }
  }
  for (const match of matches) {
    const fromContext = localeFromUnknown(match.context)
    if (fromContext) return fromContext
  }
  for (const match of matches) {
    const fromLoader = localeFromUnknown(match.loaderData)
    if (fromLoader) return fromLoader
  }
  return 'zh'
}

function updateMeta(selector: string, content: string) {
  document.head.querySelector<HTMLMetaElement>(selector)?.setAttribute('content', content)
}

export function useLocalizedMetadata(copy: SeoCopy) {
  useEffect(() => {
    document.title = copy.title
    updateMeta('meta[name="description"]', copy.description)
    updateMeta('meta[name="twitter:title"]', copy.title)
    updateMeta('meta[name="twitter:description"]', copy.description)
    updateMeta('meta[property="og:title"]', copy.title)
    updateMeta('meta[property="og:description"]', copy.description)
  }, [copy.description, copy.title])
}

export function useLocalizedRouteSeo(route: LocalizedSeoRoute) {
  const { locale } = useI18n()
  useLocalizedMetadata(getLocalizedSeo(route, locale))
}
