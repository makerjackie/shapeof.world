import { parseWorldPath, worldRoute } from '~/lib/world-urls'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { ArrowDown, ArrowLeft, ArrowRight, Check, MagnifyingGlass, Shuffle, X } from '@phosphor-icons/react'

import { HomeSeries } from '~/components/HomeSeries'
import { SiteFooter } from '~/components/SiteFooter'
import { SiteHeader } from '~/components/SiteHeader'
import { getWorldReleaseDate } from '~/data/world-freshness'
import { getWorldFirstSeen } from '~/data/world-order'
import {
  worldArtifactManifest,
  type HomeBootstrapArtifact,
  type WorldCatalogSort,
} from '~/data/world-artifacts'
import { compareDefaultCatalogOrder } from '~/data/world-default-rank'
import { getRootCategory, rootCategories, type CategoryId } from '~/data/content-graph'
import { recommendedWorldIds } from '~/data/home-recommended'
import type { WorldSummary } from '~/data/world-summaries'
import { useI18n } from '~/i18n'
import { useLocalizedRouteSeo } from '~/i18n/seo'
import { formatCompactMonthDay, HOME_FRESH_LIMIT } from '~/lib/path-progress'
import { useResumeWorld } from '~/lib/use-resume-world'
import { loadExplorationIds, selectUnvisitedId } from '~/lib/exploration'
import { worldThumbnail } from '~/lib/posters'
import { heroPoster, heroWorldId } from '~/lib/home-hero'
import { safeLocalStorage, safeSessionStorage } from '~/lib/storage'
import { normalizeWorldSearch, worldMatchesSearch } from '~/lib/world-search'
import { useWorldSearchIndex } from '~/lib/world-search-index'
import { useWorldCatalog } from '~/lib/use-world-catalog'
import { worldIntentHandlers } from '~/lib/world-prefetch'
import { useScrollReveal } from '~/lib/useScrollReveal'
import { useAtlas } from '~/state/atlas'
import { WorldCard } from '~/components/WorldCard'
import { trackEvent } from '~/lib/analytics'

import './HomeDiscovery.css'

const rootCategoryById = new Map(rootCategories.map((category) => [category.id, category]))
const CATEGORY_FILTER_KEY = 'oneworld.home.category.v1'
const VIEW_FILTER_KEY = 'oneworld.home.viewed.v1'
const SORT_KEY = 'oneworld.home.sort.v1'
const RETURN_POSITION_KEY = 'oneworld.home.return.v1'

function rootCategoryId(world: Pick<WorldSummary, 'primaryCategoryId'>): CategoryId {
  return getRootCategory(world.primaryCategoryId).id
}

type HomeSortOrder = WorldCatalogSort

function readSavedCategory(): CategoryId | 'all' {
  const saved = safeLocalStorage.get(CATEGORY_FILTER_KEY)
  if (saved === 'all') return 'all'
  return rootCategories.some((item) => item.id === saved) ? (saved as CategoryId) : 'all'
}

function HomeWorldCard({
  world,
  position = 0,
  viewed = false,
  searched = false,
  recent = false,
}: {
  world: WorldSummary
  position?: number
  viewed?: boolean
  searched?: boolean
  recent?: boolean
}) {
  const { t, worldText, categoryText } = useI18n()
  const worldCategory = rootCategoryById.get(rootCategoryId(world))
  const releasedOn = recent ? getWorldReleaseDate(world.id) : undefined

  return (
    <WorldCard
      world={world}
      viewed={viewed}
      delay={(position % 9) * 45}
      label={releasedOn ? (
        <time className="home-recent-date" dateTime={releasedOn}>
          {t(releasedOn === getWorldFirstSeen(world.id) ? 'home.fresh.added' : 'home.fresh.updated')} · {formatCompactMonthDay(releasedOn)}
        </time>
      ) : worldCategory ? categoryText(worldCategory, 'title') : worldText(world, 'topicLabel')}
      onClick={() => { if (searched) trackEvent({ event: 'search_result_click', worldId: world.id, value: 'home' }) }}
    />
  )
}

export function HomeDiscovery({ bootstrap }: { bootstrap: HomeBootstrapArtifact }) {
  const { locale, t, categoryText, worldText } = useI18n()
  useLocalizedRouteSeo('home')
  const navigate = useNavigate()
  const bootstrapWorldById = useMemo(
    () => new Map(bootstrap.worlds.map((world) => [world.id, world])),
    [bootstrap.worlds],
  )
  const initialPage = useMemo(() => bootstrap.initialPageIds
    .map((id) => bootstrapWorldById.get(id))
    .filter((world): world is WorldSummary => Boolean(world)),
  [bootstrap.initialPageIds, bootstrapWorldById])

  const { ready: atlasReady, visited, lastVisitedWorldId } = useAtlas()
  const [publicIds, setPublicIds] = useState<readonly string[]>()
  const [explorationBusy, setExplorationBusy] = useState(false)
  const [explorationError, setExplorationError] = useState(false)
  const visitedSet = useMemo(() => new Set(visited), [visited])
  const exploredCount = atlasReady && publicIds ? publicIds.filter((id) => visitedSet.has(id)).length : 0
  const progressReady = atlasReady && Boolean(publicIds)
  const totalWorlds = publicIds?.length ?? worldArtifactManifest.total
  const [progressAttempt, setProgressAttempt] = useState(0)
  const [newWorldCount, setNewWorldCount] = useState(0)
  const featuredPoolIds = useMemo(() => recommendedWorldIds.filter((id) => bootstrapWorldById.has(id)), [bootstrapWorldById])
  const heroWorld = bootstrapWorldById.get(heroWorldId(Date.now(), new Set(bootstrapWorldById.keys()))) ?? bootstrap.worlds[0]
  const resumeWorld = useResumeWorld(atlasReady ? lastVisitedWorldId ?? visited.at(-1) : undefined, publicIds, bootstrapWorldById)
  useEffect(() => {
    if (!atlasReady) return
    let cancelled = false
    setExplorationError(false)
    void loadExplorationIds().then((ids) => {
      if (cancelled) return
      setPublicIds(ids)
      const previous = safeLocalStorage.get('oneworld.home.public-ids.v1')
      if (previous) {
        try {
          const seen: unknown = JSON.parse(previous)
          if (Array.isArray(seen)) setNewWorldCount(ids.filter((id) => !seen.includes(id)).length)
        } catch { /* Invalid browser storage must not block the public directory. */ }
      }
      safeLocalStorage.set('oneworld.home.public-ids.v1', JSON.stringify(ids))
    }).catch(() => { if (!cancelled) setExplorationError(true) })
    return () => { cancelled = true }
  }, [atlasReady, progressAttempt])

  // Worlds added or updated in the last 30 days carry a date on their card.
  const recentIds = useMemo(() => new Set(bootstrap.freshWorldIds.slice(0, HOME_FRESH_LIMIT).filter((id) => {
    const releasedOn = getWorldReleaseDate(id)
    return Boolean(releasedOn) && Date.now() - Date.parse(releasedOn!) < 30 * 86_400_000
  })), [bootstrap.freshWorldIds])
  const homeSearch = useSearch({ from: '/' })
  const urlQuery = homeSearch.q ?? ''
  const [query, setQuery] = useState(urlQuery)
  const isComposingRef = useRef(false)
  const syncSearchQuery = useCallback((value: string) => {
    const normalized = value.trim()
    if (normalized === urlQuery.trim()) return
    navigate({
      to: '/',
      search: (prev: Record<string, unknown>) => ({ ...prev, q: normalized || undefined }),
      replace: true,
      resetScroll: false,
    })
  }, [navigate, urlQuery])
  useEffect(() => {
    if (isComposingRef.current) return
    setQuery((current) => (current === urlQuery ? current : urlQuery))
  }, [urlQuery])
  useEffect(() => {
    if (isComposingRef.current) return
    const normalized = query.trim()
    if (normalized === urlQuery.trim()) return
    const timer = window.setTimeout(() => {
      if (isComposingRef.current) return
      syncSearchQuery(query)
    }, 160)
    return () => window.clearTimeout(timer)
  }, [query, syncSearchQuery, urlQuery])

  const [category, setCategoryState] = useState<CategoryId | 'all'>('all')
  const [sortOrder, setSortOrder] = useState<HomeSortOrder>('recommended')
  const [viewFilter, setViewFilterState] = useState<'all' | 'unviewed' | 'viewed'>('all')
  const [preferencesReady, setPreferencesReady] = useState(false)
  const [resultLimit, setResultLimit] = useState(worldArtifactManifest.pageSize)

  useEffect(() => {
    setCategoryState(readSavedCategory())
    const savedView = homeSearch.viewed ?? safeLocalStorage.get(VIEW_FILTER_KEY)
    if (savedView === 'viewed' || savedView === 'unviewed') setViewFilterState(savedView)
    const savedSort = safeLocalStorage.get(SORT_KEY)
    if (savedSort === 'newest' || savedSort === 'catalogue') setSortOrder(savedSort)
    const savedLimit = Number(safeSessionStorage.get('oneworld.home.limit.v1'))
    if (savedLimit > 0) setResultLimit(savedLimit)
    if (safeSessionStorage.get(RETURN_POSITION_KEY) && !homeSearch.viewed) {
      try {
        const saved = JSON.parse(safeSessionStorage.get('oneworld.home.return-state.v1') ?? '{}')
        if (typeof saved.query === 'string') setQuery(saved.query)
      } catch { /* A malformed return snapshot must not prevent browsing. */ }
    }
    setPreferencesReady(true)
  }, [])

  useEffect(() => {
    if (homeSearch.viewed) setViewFilterState(homeSearch.viewed)
  }, [homeSearch.viewed])

  const setViewFilter = (next: 'all' | 'unviewed' | 'viewed') => {
    setViewFilterState(next)
    safeLocalStorage.set(VIEW_FILTER_KEY, next)
    setResultLimit(worldArtifactManifest.pageSize)
    void navigate({ to: '/', search: (prev) => ({ ...prev, viewed: next }), replace: true, resetScroll: false })
  }
  const changeSort = (next: HomeSortOrder) => {
    setSortOrder(next)
    safeLocalStorage.set(SORT_KEY, next)
  }

  const setCategory = (next: CategoryId | 'all') => {
    setCategoryState(next)
    safeLocalStorage.set(CATEGORY_FILTER_KEY, next)
  }
  const normalizedQuery = normalizeWorldSearch(query)
  const activeCategory = category
  const catalogKey = `${activeCategory}\u0000${sortOrder}`
  const catalogTotal = activeCategory === 'all'
    ? worldArtifactManifest.total
    : worldArtifactManifest.categories.find((item) => item.id === activeCategory)?.count ?? 0

  const catalog = useWorldCatalog({
    category: activeCategory, sort: sortOrder, initialPage,
    enabled: !normalizedQuery && viewFilter === 'all', total: catalogTotal,
  })
  const useIndexedResults = Boolean(normalizedQuery) || viewFilter !== 'all'
  const searchIndex = useWorldSearchIndex(locale, useIndexedResults)
  const matchingWorlds = useMemo(() => {
    if (!useIndexedResults) return catalog.worlds
    return (searchIndex.documents ?? [])
      .filter(({ world, text }) => (!normalizedQuery || text.includes(normalizedQuery) || worldMatchesSearch(world, normalizedQuery))
        && (activeCategory === 'all' || [world.primaryCategoryId, ...(world.additionalCategoryIds ?? [])].some((id) => getRootCategory(id).id === activeCategory))
        && (viewFilter === 'all' || visitedSet.has(world.id) === (viewFilter === 'viewed')))
      .map(({ world }) => world)
      .sort((a, b) => sortOrder === 'newest'
        ? (getWorldReleaseDate(b.id) ?? '').localeCompare(getWorldReleaseDate(a.id) ?? '') || a.id.localeCompare(b.id)
        : sortOrder === 'recommended'
          ? compareDefaultCatalogOrder(a, b)
          : Number(a.index) - Number(b.index))
  }, [activeCategory, catalog.worlds, normalizedQuery, searchIndex.documents, sortOrder, useIndexedResults, viewFilter, visitedSet])
  const indexedLimit = matchingWorlds.length - resultLimit <= worldArtifactManifest.tailAbsorb ? matchingWorlds.length : resultLimit
  const visibleWorlds = useIndexedResults ? matchingWorlds.slice(0, indexedLimit) : matchingWorlds
  const matchingTotal = useIndexedResults ? matchingWorlds.length : catalogTotal
  const hasMoreWorlds = visibleWorlds.length < matchingTotal
  const worldWindowKey = `${catalogKey}\u0000${normalizedQuery}\u0000${viewFilter}`
  const directoryLoading = useIndexedResults ? searchIndex.loading : catalog.loading
  const directoryError = useIndexedResults ? searchIndex.error : catalog.error
  const directoryLoadingText = t('home.collection.loading')
  const directoryErrorText = t('home.collection.unavailable')
  const retryDirectory = useIndexedResults ? searchIndex.retry : catalog.retry
  const revealMoreWorlds = useCallback(() => {
    if (useIndexedResults) setResultLimit((limit) => {
      const next = limit + worldArtifactManifest.pageSize
      safeSessionStorage.set('oneworld.home.limit.v1', String(next))
      return next
    })
    else catalog.loadMore()
  }, [catalog.loadMore, useIndexedResults])

  useEffect(() => {
    if (!preferencesReady || directoryLoading || directoryError) return
    const saved = safeSessionStorage.get(RETURN_POSITION_KEY)
    if (!saved) return
    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top: Number(saved), behavior: 'instant' })
      safeSessionStorage.remove(RETURN_POSITION_KEY)
    })
    return () => cancelAnimationFrame(frame)
  }, [preferencesReady, directoryLoading, directoryError, visibleWorlds.length])

  const gridRef = useScrollReveal<HTMLDivElement>('.work-card', {
    contentKey: worldWindowKey,
  })
  const filterRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const filter = filterRef.current
    if (!filter) return
    const keepActiveVisible = () => {
      const active = filter.querySelector<HTMLElement>('button.is-active')
      if (!active) return
      const filterRect = filter.getBoundingClientRect()
      const activeRect = active.getBoundingClientRect()
      const fadeWidth = Number.parseFloat(
        window.getComputedStyle(filter).getPropertyValue('--chip-scroller-fade'),
      )
      const edgePadding = (Number.isFinite(fadeWidth) ? fadeWidth : 0) + 4
      let nextLeft = filter.scrollLeft
      if (activeRect.left < filterRect.left + edgePadding) {
        nextLeft -= filterRect.left + edgePadding - activeRect.left
      } else if (activeRect.right > filterRect.right - edgePadding) {
        nextLeft += activeRect.right - (filterRect.right - edgePadding)
      }
      if (nextLeft !== filter.scrollLeft) {
        filter.scrollTo({ left: nextLeft, behavior: 'auto' })
      }
    }
    keepActiveVisible()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(keepActiveVisible)
    observer.observe(filter)
    return () => observer.disconnect()
  }, [category, locale])

  useEffect(() => {
    const trigger = loadMoreRef.current
    if (!trigger || !hasMoreWorlds || directoryLoading || directoryError || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) revealMoreWorlds()
      },
      { rootMargin: '600px 0px', threshold: 0 },
    )
    observer.observe(trigger)
    return () => observer.disconnect()
  }, [directoryError, directoryLoading, hasMoreWorlds, revealMoreWorlds])

  const visitRandomWorld = async () => {
    if (explorationBusy || !atlasReady) return
    setExplorationBusy(true)
    setExplorationError(false)
    try {
      const ids = await loadExplorationIds()
      setPublicIds(ids)
      const candidates = recommendedWorldIds.filter((id) => ids.includes(id))
      const id = selectUnvisitedId(candidates, visited)
      if (id) {
        saveHomePosition()
        await navigate({ to: worldRoute, params: { worldId: id }, search: { collection: 'featured' } })
      }
    } catch { setExplorationError(true) }
    finally { setExplorationBusy(false) }
  }

  const scrollToId = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const scrollToWorlds = () => scrollToId('home-worlds')
  const saveHomePosition = () => {
    safeSessionStorage.set(RETURN_POSITION_KEY, String(window.scrollY))
    safeSessionStorage.set('oneworld.home.return-state.v1', JSON.stringify({ query }))
  }

  return (
    <main className="home-page" onClickCapture={(event) => {
      const link = (event.target as Element).closest('a')
      if ((Boolean(link && parseWorldPath(link.pathname)) || link?.pathname.includes('/routes')) && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
        saveHomePosition()
      }
    }}>
      <section className="home-hero" aria-labelledby="home-hero-title">
        <SiteHeader />

        <div className="home-hero-copy">
          <p className="home-hero-eyebrow">
            <i aria-hidden="true" /> {t('common.interactiveWorlds', { value: worldArtifactManifest.total })}
          </p>
          <h1 id="home-hero-title">{t('home.title')}</h1>
          <p className="home-hero-lead">{t('home.lead')}</p>
          <div className="home-hero-actions">
            {heroWorld && <Link to={worldRoute} params={{ worldId: heroWorld.id }} search={{ collection: 'featured' }}
              className="btn-primary home-hero-primary" {...worldIntentHandlers(heroWorld.id)}>
              {t('home.hero.enter')} <ArrowRight aria-hidden="true" />
            </Link>}
            <button type="button" className="home-hero-random" onClick={visitRandomWorld} disabled={explorationBusy || !atlasReady}>
              <Shuffle aria-hidden="true" /> {t(explorationBusy ? 'home.collection.loading' : 'home.random')}
            </button>
          </div>
          {explorationError && <p role="alert" className="home-exploration-error">{t('exploration.loadError')} <button onClick={() => setProgressAttempt((attempt) => attempt + 1)}>{t('system.retry')}</button></p>}
          {resumeWorld && <Link to={worldRoute} params={{ worldId: resumeWorld.id }}
            search={featuredPoolIds.some((id) => id === resumeWorld.id) ? { collection: 'featured' } : {}}
            className="home-resume" {...worldIntentHandlers(resumeWorld.id)}>
            <img src={worldThumbnail(resumeWorld)} alt="" width={72} height={48} />
            <span><small>{t('home.featured.resume')}</small><strong>{worldText(resumeWorld, 'title')}</strong></span>
            <ArrowRight aria-hidden="true" />
          </Link>}
          {newWorldCount > 0 && <p className="home-new-worlds">{t('home.newWorlds', { value: newWorldCount })}</p>}
        </div>

        {heroWorld && <figure className="home-hero-media">
          <Link to={worldRoute} params={{ worldId: heroWorld.id }} search={{ collection: 'featured' }}
            className="home-hero-poster" aria-label={worldText(heroWorld, 'title')} {...worldIntentHandlers(heroWorld.id)}>
            <img src={heroPoster(heroWorld.id)} alt="" width={2560} height={1600} fetchPriority="high" decoding="async" />
          </Link>
          <figcaption>
            <span>{t('home.hero.today')}</span>
            <Link to={worldRoute} params={{ worldId: heroWorld.id }} search={{ collection: 'featured' }}>{worldText(heroWorld, 'title')}</Link>
          </figcaption>
        </figure>}
      </section>

      <HomeSeries worldById={bootstrapWorldById} />



      <section className="home-section" id="home-worlds" aria-labelledby="home-worlds-title">
        <header className="home-section-head">
          <div>
            <h2 id="home-worlds-title" tabIndex={-1}>{t('home.collection.title')}</h2>
          </div>
        </header>
        <div className="home-view-filter" role="group" aria-label={t('home.viewStatus')}>
          {(['all', 'unviewed', 'viewed'] as const).map((value) => <button key={value} aria-pressed={viewFilter === value} onClick={() => setViewFilter(value)}>
            {t(value === 'all' ? 'common.all' : value === 'viewed' ? 'home.viewed' : 'home.unviewed')}
            <span>{value === 'all' ? totalWorlds : progressReady ? value === 'viewed' ? exploredCount : totalWorlds - exploredCount : '—'}</span>
          </button>)}
        </div>
        <div className="home-discovery-search" role="search">
          <div className="home-search-field">
            <MagnifyingGlass aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onCompositionStart={() => {
                isComposingRef.current = true
              }}
              onCompositionEnd={(event) => {
                isComposingRef.current = false
                const next = event.currentTarget.value
                setQuery(next)
                syncSearchQuery(next)
              }}
              placeholder={t('worlds.search')}
              aria-label={t('worlds.search')}
              autoComplete="off"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label={t('worlds.clearSearch')}>
                <X aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="home-discovery-meta">
            <span aria-live="polite">{directoryLoading ? directoryLoadingText : directoryError ? directoryErrorText : t('worlds.results', { value: matchingTotal })}</span>
            <div className="home-sort" role="group" aria-label={t('home.sort.label')}>
              <button
                type="button"
                className={sortOrder === 'recommended' ? 'is-active' : undefined}
                aria-pressed={sortOrder === 'recommended'}
                onClick={() => changeSort('recommended')}
              >
                {t('home.sort.recommended')}
              </button>
              <button
                type="button"
                className={sortOrder === 'newest' ? 'is-active' : undefined}
                aria-pressed={sortOrder === 'newest'}
                onClick={() => changeSort('newest')}
              >
                {t('home.sort.newest')}
              </button>
              <button
                type="button"
                className={sortOrder === 'catalogue' ? 'is-active' : undefined}
                aria-pressed={sortOrder === 'catalogue'}
                onClick={() => changeSort('catalogue')}
              >
                {t('home.sort.catalogue')}
              </button>
            </div>
          </div>
        </div>
        <div className="home-filter-bar">
          <div ref={filterRef} className="home-filter chip-scroller" role="group" aria-label={t('home.filter')}>
            <button
              type="button"
              className={activeCategory === 'all' ? 'is-active' : undefined}
              aria-pressed={activeCategory === 'all'}
              onClick={() => setCategory('all')}
            >
              {t('common.all')} <b>{worldArtifactManifest.total}</b>
            </button>
            {rootCategories.map((item) => {
              const count = worldArtifactManifest.categories.find((entry) => entry.id === item.id)?.count ?? 0
              return (
                <button
                  key={item.id}
                  type="button"
                  className={activeCategory === item.id ? 'is-active' : undefined}
                  aria-pressed={activeCategory === item.id}
                  onClick={() => setCategory(item.id)}
                >
                  {categoryText(item, 'title')} <b>{count}</b>
                </button>
              )
            })}
          </div>
        </div>
        {matchingWorlds.length > 0 ? (
          <div className="home-collection-layout">
            <div className="work-card-grid" ref={gridRef}>
              {visibleWorlds.map((world, position) => (
                <HomeWorldCard key={world.id} world={world} position={position} viewed={visitedSet.has(world.id)} recent={recentIds.has(world.id)} />
              ))}
            </div>
          </div>
        ) : directoryLoading ? (
          <div className="home-search-empty" role="status" aria-busy="true">
            <p>{directoryLoadingText}</p>
          </div>
        ) : directoryError ? (
          <div className="home-search-empty" role="status">
            <p>{directoryErrorText}</p>
            <button type="button" onClick={retryDirectory}>{t('system.retry')}</button>
          </div>
        ) : (
          <div className="home-search-empty">
            <MagnifyingGlass aria-hidden="true" />
            <p>{t('worlds.empty')}</p>
            <div className="site-search-empty-actions"><button type="button" className="btn-text" onClick={() => setQuery('')}>{t('worlds.clearSearch')}</button><Link className="btn-text" to="/feedback" search={{ kind: 'topic' }}>{t('search.suggest')}</Link></div>
            <button type="button" onClick={() => {
              setQuery('')
              setCategory('all')
              changeSort('recommended')
              setViewFilter('all')
            }}>
              {t('worlds.resetFilters')}
            </button>
          </div>
        )}
        {matchingWorlds.length > 0 && (
          <div
            ref={loadMoreRef}
            className={hasMoreWorlds ? 'home-collection-progress has-more' : 'home-collection-progress'}
            aria-label={t('home.collection.progress', {
              current: visibleWorlds.length,
              total: matchingTotal,
            })}
          >
            <span aria-live="polite">
              {t('home.collection.progress', {
                current: visibleWorlds.length,
                total: matchingTotal,
              })}
            </span>
            {hasMoreWorlds && (
              <button type="button" className="btn-secondary home-collection-more-btn" onClick={directoryError ? retryDirectory : revealMoreWorlds} disabled={directoryLoading}>
                {directoryLoading ? directoryLoadingText : directoryError ? t('system.retry') : t('home.collection.more', {
                  value: Math.min(worldArtifactManifest.pageSize, matchingTotal - visibleWorlds.length),
                })}
                <ArrowDown aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  )
}
