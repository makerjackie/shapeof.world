import type { CSSProperties } from 'react'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { ArrowLeft, ArrowRight } from '@phosphor-icons/react'

import { SiteFooter } from '~/components/SiteFooter'
import { SiteHeader } from '~/components/SiteHeader'
import { categories, getPrimaryCategoryTrail } from '~/data/content-graph'
import { worldArtifactManifest } from '~/data/world-artifacts'
import { useI18n } from '~/i18n'
import { worldThumbnail } from '~/lib/posters'
import { localizedPublicUrl } from '~/lib/share-url'
import { seo } from '~/utils/seo'

import './category.css'

const getCategoryPageData = createServerFn({ method: 'GET' })
  .validator((input: { categoryId: string; page: number }) => ({
    categoryId: input.categoryId,
    page: Number.isSafeInteger(input.page) && input.page > 0 ? input.page : 1,
  }))
  .handler(async ({ data }) => {
    const category = categories.find((item) => item.id === data.categoryId)
    if (!category) return undefined
    const manifestEntry = worldArtifactManifest.categories.find((item) => item.id === category.id)
    if (!manifestEntry || data.page > Math.max(1, manifestEntry.pageCount)) return undefined
    const { loadWorldSummaryPage } = await import('~/data/world-artifacts.server')
    const worlds = manifestEntry.pageCount === 0
      ? []
      : await loadWorldSummaryPage(data.page, category.id)
    if (!worlds) return undefined
    return {
      category,
      trail: getPrimaryCategoryTrail(category.id),
      children: categories.filter((item) => item.primaryParentId === category.id),
      count: manifestEntry.count,
      pageCount: manifestEntry.pageCount,
      page: data.page,
      worlds,
    }
  })

export const Route = createFileRoute('/category/$categoryId')({
  validateSearch: (search: Record<string, unknown>): { page?: number } => {
    const page = typeof search.page === 'number'
      ? search.page
      : typeof search.page === 'string'
        ? Number.parseInt(search.page, 10)
        : undefined
    return Number.isSafeInteger(page) && (page ?? 0) > 1 ? { page } : {}
  },
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: async ({ params, deps, context }) => {
    const data = await getCategoryPageData({ data: { categoryId: params.categoryId, page: deps.page } })
    if (!data) throw notFound()
    return { ...data, locale: context.locale }
  },
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'zh'
    const category = loaderData?.category
    const title = category
      ? locale === 'zh' ? `${category.title} — 世界分类` : `${category.titleEn} — World category`
      : locale === 'zh' ? '世界分类' : 'World category'
    const description = category
      ? locale === 'zh' ? category.description : category.descriptionEn
      : undefined
    const categoryUrl = category
      ? `https://shapeof.world/category/${category.id}`
      : 'https://shapeof.world/'
    const page = loaderData?.page ?? 1
    const pageCount = loaderData?.pageCount ?? 1
    const canonicalUrl = page > 1 ? `${categoryUrl}?page=${page}` : categoryUrl
    const paginationLinks = category
      ? [
          ...(page > 1
            ? [{ rel: 'prev', href: page === 2 ? categoryUrl : `${categoryUrl}?page=${page - 1}` }]
            : []),
          ...(page < pageCount
            ? [{ rel: 'next', href: `${categoryUrl}?page=${page + 1}` }]
            : []),
        ]
      : []
    return {
      meta: seo({
        title,
        description,
        image: 'https://shapeof.world/assets/oneworld-og.jpg',
        locale,
        url: localizedPublicUrl(canonicalUrl, locale),
      }),
      links: [{ rel: 'canonical', href: canonicalUrl }, ...paginationLinks],
    }
  },
  component: CategoryPage,
})

function CategoryPage() {
  const { category, trail, children, count, pageCount, page, worlds } = Route.useLoaderData()
  const { categoryText, t, worldText } = useI18n()

  return (
    <main className="category-page">
      <SiteHeader />
      <header className="category-hero" style={{ '--category-accent': category.accent ?? '#5c7565' } as CSSProperties}>
        <nav className="category-breadcrumbs" aria-label={t('category.breadcrumb')}>
          <Link to="/">{t('nav.home')}</Link>
          {trail.map((item, index) => (
            <span key={item.id}>
              <ArrowRight aria-hidden="true" />
              {index === trail.length - 1
                ? <strong>{categoryText(item, 'title')}</strong>
                : <Link to="/category/$categoryId" params={{ categoryId: item.id }}>{categoryText(item, 'title')}</Link>}
            </span>
          ))}
        </nav>
        <p>{t('category.label')}</p>
        <h1>{categoryText(category, 'title')}</h1>
        <div>{categoryText(category, 'description')}</div>
        <small>{t('category.worldCount', { value: count })}</small>
      </header>

      {children.length > 0 && (
        <section className="category-children" aria-labelledby="category-children-title">
          <h2 id="category-children-title">{t('category.children')}</h2>
          <div>
            {children.map((item) => (
              <Link key={item.id} to="/category/$categoryId" params={{ categoryId: item.id }}>
                <strong>{categoryText(item, 'title')}</strong>
                <span>{categoryText(item, 'description')}</span>
                <ArrowRight aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="category-worlds" aria-labelledby="category-worlds-title">
        <header>
          <h2 id="category-worlds-title">{t('category.worlds')}</h2>
          <span>{t('category.page', { current: page, total: Math.max(1, pageCount) })}</span>
        </header>
        <div className="category-world-grid">
          {worlds.map((world) => (
            <Link key={world.id} to="/explore/$worldId" params={{ worldId: world.id }}>
              <img src={worldThumbnail(world)} alt="" loading="lazy" decoding="async" />
              <span>
                <small>{worldText(world, 'topicLabel')}</small>
                <strong>{worldText(world, 'posterTitle')}</strong>
              </span>
            </Link>
          ))}
        </div>
        {pageCount > 1 && (
          <nav className="category-pagination" aria-label={t('category.pagination')}>
            {page > 1
              ? <Link to="/category/$categoryId" params={{ categoryId: category.id }} search={{ page: page - 1 }}><ArrowLeft aria-hidden="true" /> {t('category.previous')}</Link>
              : <span />}
            {page < pageCount && (
              <Link to="/category/$categoryId" params={{ categoryId: category.id }} search={{ page: page + 1 }}>{t('category.next')} <ArrowRight aria-hidden="true" /></Link>
            )}
          </nav>
        )}
      </section>
      <SiteFooter />
    </main>
  )
}
