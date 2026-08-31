import { useEffect } from 'react'

import { useI18n, type Locale } from './index'

export type LocalizedSeoRoute = 'home' | 'worlds' | 'atlas' | 'story' | 'about' | 'changelog' | 'sources' | 'failures' | 'making'

type SeoCopy = {
  title: string
  description: string
}

const routeSeo: Record<LocalizedSeoRoute, Record<Locale, SeoCopy>> = {
  home: {
    zh: {
      title: '世界的形状 — 一个可玩的知识宇宙',
      description: '看见世界如何运行：改变参数，观察结果，亲手理解宇宙、生命、数学、AI 与人类世界背后的规律。',
    },
    en: {
      title: 'Shape of the World — A Playable Universe of Knowledge',
      description: 'See how the world works: change parameters, observe results, and explore the rules behind space, life, mathematics, AI, and engineering.',
    },
  },
  worlds: {
    zh: {
      title: '全部互动世界 — 世界的形状',
      description: '一个可玩的知识宇宙：进入宇宙地图、细胞、航线、数学与 AI 的互动世界，点进去就能玩。',
    },
    en: {
      title: 'All Interactive Worlds — Shape of the World',
      description: 'Explore a playable universe of astronomy, cells, flight networks, mathematics, AI, and more.',
    },
  },
  atlas: {
    zh: {
      title: '我的图鉴 — 世界的形状',
      description: '回到你完成、收藏和愿意再次探索的互动世界。',
    },
    en: {
      title: 'My Atlas — Shape of the World',
      description: 'Return to the interactive worlds you completed, saved, and want to explore again.',
    },
  },
  story: {
    zh: {
      title: '为什么做世界的形状 — 创作故事',
      description: '记录我们从数据可视化走向互动世界图鉴时的初心、怀疑、选择与重建。',
    },
    en: {
      title: 'Why We Made Shape of the World — Our Story',
      description: 'The questions, choices, and rebuild that turned data visualization into an atlas of interactive worlds.',
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
  about: {
    zh: {
      title: '关于我们 — 世界的形状',
      description: '这个可玩的知识宇宙为什么存在：创作缘起、创作者，以及 01MVP 制作教程入口。',
    },
    en: {
      title: 'About Us — Shape of the World',
      description: 'Why this playable universe of knowledge exists, who makes it, and how-to notes on 01MVP.',
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
      description: '还没有进入公开目录的互动世界。直达链接仍然可以打开。',
    },
    en: {
      title: 'Worlds in the Making — Shape of the World',
      description: 'Interactive worlds that are not in the public catalogue yet. Direct links still open.',
    },
  },
}

export function getLocalizedSeo(route: LocalizedSeoRoute, locale: Locale): SeoCopy {
  return routeSeo[route][locale]
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
  const rootMatch = matches.find((match) => (
    match.routeId === '__root__'
    || (typeof match.id === 'string' && match.id.startsWith('__root__'))
  ))
  if (
    rootMatch?.context
    && typeof rootMatch.context === 'object'
    && 'locale' in rootMatch.context
    && (rootMatch.context.locale === 'zh' || rootMatch.context.locale === 'en')
  ) {
    return rootMatch.context.locale
  }
  if (
    rootMatch?.search
    && typeof rootMatch.search === 'object'
    && 'lang' in rootMatch.search
    && (rootMatch.search.lang === 'zh' || rootMatch.search.lang === 'en')
  ) {
    return rootMatch.search.lang
  }
  return rootMatch?.loaderData === 'en' ? 'en' : 'zh'
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
