import { describe, expect, it } from 'vitest'

import { Route as CategoryRoute } from './category.$categoryId'
import { Route as HomeRoute } from './index'

describe('discovery page structured data', () => {
  it('adds WebSite SearchAction and Organization to the homepage', () => {
    const head = HomeRoute.options.head?.({
      loaderData: { locale: 'en', bootstrap: {} },
      matches: [],
    } as never) as {
      scripts: Array<{ type?: string; children?: string }>
    }
    const graph = JSON.parse(head.scripts[0]?.children ?? '{}')
    expect(graph['@graph']).toEqual(expect.arrayContaining([
      expect.objectContaining({ '@type': 'WebSite' }),
      expect.objectContaining({ '@type': 'Organization' }),
    ]))
  })

  it('adds BreadcrumbList and ItemList to a category page', () => {
    const head = CategoryRoute.options.head?.({
      loaderData: {
        locale: 'zh',
        category: { id: 'physics', title: '物理', titleEn: 'Physics' },
        trail: [{ id: 'physics', title: '物理', titleEn: 'Physics' }],
        worlds: [{
          id: 'double-pendulum',
          posterTitle: '差 0.1° 的两次放手，为什么结局完全不同？',
          translations: { en: { posterTitle: 'Why do two releases 0.1° apart end so differently?' } },
        }],
        page: 1,
        pageCount: 1,
      },
    } as never) as {
      scripts: Array<{ children?: string }>
    }
    const graph = JSON.parse(head.scripts[0]?.children ?? '{}')
    expect(graph['@graph']).toEqual(expect.arrayContaining([
      expect.objectContaining({ '@type': 'BreadcrumbList' }),
      expect.objectContaining({ '@type': 'ItemList', numberOfItems: 1 }),
    ]))
  })
  it.each(['zh', 'en'] as const)('keeps %s pagination and alternates on the same language and page', (locale) => {
    const head = CategoryRoute.options.head?.({
      loaderData: {
        locale,
        category: { id: 'physics', title: '物理', titleEn: 'Physics' },
        trail: [], worlds: [], page: 2, pageCount: 3,
      },
    } as never) as {
      meta: Array<{ title?: string }>
      links: Array<{ rel: string; href: string; hrefLang?: string }>
    }
    const base = `https://shapeof.world/${locale === 'en' ? 'en/' : ''}category/physics`
    expect(head.links).toContainEqual({ rel: 'canonical', href: `${base}?page=2` })
    expect(head.links).toContainEqual({ rel: 'prev', href: base })
    expect(head.links).toContainEqual({ rel: 'next', href: `${base}?page=3` })
    expect(head.links).toContainEqual({ rel: 'alternate', hrefLang: 'en', href: 'https://shapeof.world/en/category/physics?page=2' })
    expect(head.links).toContainEqual({ rel: 'alternate', hrefLang: 'zh-Hans', href: 'https://shapeof.world/category/physics?page=2' })
    expect(head.meta.find((tag) => tag.title)?.title).toContain(locale === 'en' ? 'Page 2' : '第 2 页')
  })

})
