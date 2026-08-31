import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { ArrowDown, ArrowRight, Check, MagnifyingGlass, Minus, Play, Plus, Shuffle, X } from '@phosphor-icons/react'

import { HomeUniverse } from '~/components/HomeUniverse'
import { SiteFooter } from '~/components/SiteFooter'
import { SiteHeader } from '~/components/SiteHeader'
import { getWorldReleaseDate } from '~/data/world-freshness'
import {
  worldArtifactManifest,
  worldCatalogPagePath,
  worldSearchIndexPath,
  type HomeBootstrapArtifact,
  type WorldCatalogSort,
  type WorldSearchDocument,
} from '~/data/world-artifacts'
import { getRootCategory, paths, rootCategories, type CategoryId } from '~/data/content-graph'
import { worldOfTheWeek } from '~/data/world-of-the-week'
import { flagshipWorldIds } from '~/data/world-tiers'
import type { WorldSummary } from '~/data/world-summaries'
import { useI18n } from '~/i18n'
import { useLocalizedRouteSeo } from '~/i18n/seo'
import { selectHomeWorld } from '~/lib/next-world'
import { worldThumbnail } from '~/lib/posters'
import { safeLocalStorage } from '~/lib/storage'
import { normalizeWorldSearch, worldMatchesSearch } from '~/lib/world-search'
import { warmWorldOnIntent } from '~/lib/world-prefetch'
import { useScrollReveal } from '~/lib/useScrollReveal'
import { useAtlas } from '~/state/atlas'

import './HomeDiscovery.css'

const rootCategoryById = new Map(rootCategories.map((category) => [category.id, category]))
const CATEGORY_FILTER_KEY = 'oneworld.home.category.v1'
/** 首页只完整展开前几条探索路线，其余收进「查看全部」。Paths 的顺序即编辑顺位。 */
const FEATURED_PATH_COUNT = 5

function rootCategoryId(world: Pick<WorldSummary, 'primaryCategoryId'>): CategoryId {
  return getRootCategory(world.primaryCategoryId).id
}

function pathMembers(pathId: string, worldById: ReadonlyMap<string, WorldSummary>): WorldSummary[] {
  const path = paths.find((item) => item.id === pathId)
  if (!path) return []
  return path.worldIds
    .map((id) => worldById.get(id))
    .filter((item): item is WorldSummary => Boolean(item))
}

/** 路线内按编辑顺序找到第一个未探索世界；全部探索完则回到 01。 */
function firstUnexploredWorldIndex(members: WorldSummary[], visited: string[]): number {
  const index = members.findIndex((world) => !visited.includes(world.id))
  return index >= 0 ? index : 0
}

/** 按 Paths 顺序打开第一条仍有未探索世界的路线。 */
function firstUnexploredPathId(visited: string[], worldById: ReadonlyMap<string, WorldSummary>): string {
  for (const path of paths) {
    const members = pathMembers(path.id, worldById)
    if (members.some((world) => !visited.includes(world.id))) return path.id
  }
  return paths[0]?.id ?? ''
}

function scrollStoryboardTo(viewport: HTMLDivElement | null, index: number) {
  const item = viewport?.querySelectorAll<HTMLElement>('[role="listitem"]')[index]
  if (!viewport || !item) return
  viewport.scrollLeft = item.offsetLeft
}

/** 与更新日志一致的日期格式：zh「2026 年 7 月 27 日」 / en「July 27, 2026」。 */
function formatWeeklySince(date: string, locale: 'zh' | 'en') {
  const [year, month, day] = date.split('-').map(Number)
  if (!year || !month || !day) return date
  if (locale === 'zh') return `${year} 年 ${month} 月 ${day} 日`
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

type HomeSortOrder = WorldCatalogSort

type CatalogState = {
  key: string
  page: number
  worlds: ReadonlyArray<WorldSummary>
  loading: boolean
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { headers: { accept: 'application/json' } })
  if (!response.ok) throw new Error(`Catalogue request failed: ${response.status}`)
  return response.json<T>()
}

function readSavedCategory(): CategoryId | 'all' {
  const saved = safeLocalStorage.get(CATEGORY_FILTER_KEY)
  if (saved === 'all') return 'all'
  return rootCategories.some((item) => item.id === saved) ? (saved as CategoryId) : 'all'
}

function HomeWorldCard({
  world,
  position = 0,
}: {
  world: WorldSummary
  position?: number
}) {
  const { worldText, categoryText } = useI18n()
  const worldCategory = rootCategoryById.get(rootCategoryId(world))

  return (
    <Link
      to="/explore/$worldId"
      params={{ worldId: world.id }}
      className="world-card"
      style={{
        '--world-accent': world.accent,
        '--world-poster-position': world.posterPosition ?? '50% 50%',
        '--reveal-delay': `${(position % 9) * 45}ms`,
      } as CSSProperties}
      onMouseEnter={() => warmWorldOnIntent(world.id)}
      onFocus={() => warmWorldOnIntent(world.id)}
      onPointerDown={() => warmWorldOnIntent(world.id)}
    >
      <span className="world-card-media">
        <img
          src={worldThumbnail(world)}
          alt=""
          loading="lazy"
          decoding="async"
          fetchPriority="low"
        />
        <span className="world-card-shade" aria-hidden="true" />
        <span className="world-card-number">{world.index}</span>
        <span className="world-card-meta">
          {worldCategory ? categoryText(worldCategory, 'title') : worldText(world, 'topicLabel')}
        </span>
      </span>
      <span className="world-card-copy">
        <span className="world-card-title">{worldText(world, 'posterTitle')}</span>
        <ArrowRight aria-hidden="true" weight="thin" />
      </span>
    </Link>
  )
}

/** 电影分镜风琴：保留路线顺序、进度与下一站，同时降低首页纵向密度。 */
function PathAccordion({
  pathId,
  order,
  isOpen,
  onToggle,
  worldById,
}: {
  pathId: string
  order: number
  isOpen: boolean
  onToggle: () => void
  worldById: ReadonlyMap<string, WorldSummary>
}) {
  const { t, pathText, worldText } = useI18n()
  const atlas = useAtlas()
  const storyboardRef = useRef<HTMLDivElement>(null)
  const path = paths.find((item) => item.id === pathId)
  const members = pathMembers(pathId, worldById)
  const nextWorldIndex = firstUnexploredWorldIndex(members, atlas.visited)
  const [activeWorldIndex, setActiveWorldIndex] = useState(nextWorldIndex)
  const visitedKey = atlas.visited.join('\0')

  useEffect(() => {
    if (!isOpen || !atlas.ready) return
    const worlds = pathMembers(pathId, worldById)
    if (worlds.length === 0) return
    const visited = visitedKey ? visitedKey.split('\0') : []
    const target = firstUnexploredWorldIndex(worlds, visited)
    setActiveWorldIndex(target)
    const viewport = storyboardRef.current
    const frame = window.requestAnimationFrame(() => {
      scrollStoryboardTo(viewport, target)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [atlas.ready, isOpen, pathId, visitedKey, worldById])

  if (!path) return null
  const exploredCount = members.filter((world) => atlas.visited.includes(world.id)).length
  const nextWorld = members[nextWorldIndex] ?? members[0]
  if (!nextWorld) return null
  const nextIndex = nextWorldIndex + 1

  const moveStoryboardWithPointer = (event: MouseEvent<HTMLDivElement>) => {
    const viewport = storyboardRef.current
    if (!viewport || viewport.scrollWidth <= viewport.clientWidth) return
    const bounds = viewport.getBoundingClientRect()
    const pointerProgress = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width))
    const maxScroll = viewport.scrollWidth - viewport.clientWidth
    viewport.scrollLeft = maxScroll * pointerProgress
  }

  const resetStoryboard = () => {
    setActiveWorldIndex(nextWorldIndex)
    scrollStoryboardTo(storyboardRef.current, nextWorldIndex)
  }

  return (
    <article className={isOpen ? 'path-accordion is-open' : 'path-accordion'}>
      {!isOpen ? (
        <button
          type="button"
          className="path-accordion-trigger"
          aria-expanded="false"
          aria-controls={`path-panel-${path.id}`}
          onClick={onToggle}
        >
          <span className="path-accordion-order">{String(order).padStart(2, '0')}</span>
          <span className="path-accordion-name">
            <strong>{pathText(path, 'title')}</strong>
            <small>{t('home.paths.label')} · {t('home.paths.exploredCount', { current: exploredCount, total: members.length })}</small>
          </span>
          <span className="path-accordion-symbol" aria-hidden="true"><Plus /></span>
        </button>
      ) : (
        <div className="path-accordion-expanded" id={`path-panel-${path.id}`}>
          <button
            type="button"
            className="path-accordion-collapse"
            aria-expanded="true"
            aria-controls={`path-panel-${path.id}`}
            aria-label={pathText(path, 'title')}
            onClick={onToggle}
          >
            <Minus aria-hidden="true" />
          </button>
          <aside className="path-accordion-info">
            <div className="path-accordion-identity">
              <span className="path-accordion-order">{String(order).padStart(2, '0')}</span>
              <span className="path-accordion-name">
                <strong>{pathText(path, 'title')}</strong>
                <em>{path.titleEn}</em>
                <small>{t('home.paths.label')} · {t('home.paths.exploredCount', { current: exploredCount, total: members.length })}</small>
              </span>
            </div>
            <p>{pathText(path, 'description')}</p>
            <div className="path-accordion-foot">
              <div className="path-accordion-progress" aria-hidden="true">
                {members.map((world, position) => (
                  <i key={world.id} className={position < exploredCount ? 'is-done' : position === nextIndex - 1 ? 'is-next' : undefined} />
                ))}
              </div>
              <Link
                to="/explore/$worldId"
                params={{ worldId: nextWorld.id }}
                search={{ path: path.id }}
                className="path-accordion-cta"
                onMouseEnter={() => warmWorldOnIntent(nextWorld.id)}
                onFocus={() => warmWorldOnIntent(nextWorld.id)}
              >
                <Play aria-hidden="true" weight="fill" />
                {exploredCount === 0
                  ? t('home.paths.start')
                  : exploredCount >= members.length
                    ? t('home.paths.again')
                    : t('home.paths.continue', { value: nextIndex })}
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </aside>
          <div className="path-accordion-panel">
            <div
              ref={storyboardRef}
              className="path-storyboard-viewport"
              onMouseMove={moveStoryboardWithPointer}
              onMouseLeave={resetStoryboard}
            >
              <div className="path-storyboard" role="list" aria-label={pathText(path, 'title')}>
                {members.map((world, position) => {
                  const explored = atlas.visited.includes(world.id)
                  return (
                    <Link
                      role="listitem"
                      key={world.id}
                      to="/explore/$worldId"
                      params={{ worldId: world.id }}
                      search={{ path: path.id }}
                      className={`${explored ? 'path-storyboard-item is-explored' : 'path-storyboard-item'}${activeWorldIndex === position ? ' is-active' : ''}`}
                      onMouseEnter={() => {
                        setActiveWorldIndex(position)
                        warmWorldOnIntent(world.id)
                      }}
                      onFocus={(event) => {
                        setActiveWorldIndex(position)
                        event.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
                        warmWorldOnIntent(world.id)
                      }}
                      onPointerDown={() => warmWorldOnIntent(world.id)}
                    >
                      <span className="path-storyboard-media">
                        <img src={worldThumbnail(world)} alt="" loading="lazy" decoding="async" fetchPriority="low" />
                        <span className="path-storyboard-order" aria-hidden="true">{String(position + 1).padStart(2, '0')}</span>
                        {explored && <span className="path-storyboard-done" aria-hidden="true"><Check weight="bold" /></span>}
                      </span>
                      <span className="path-storyboard-copy">
                        <strong>{worldText(world, 'posterTitle')}</strong>
                        {position === nextIndex - 1 && <small>{t('home.paths.continue', { value: nextIndex })}</small>}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </article>
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
  const weeklyPicks = useMemo(() => worldOfTheWeek.picks
    .map((pick) => {
      const world = bootstrapWorldById.get(pick.worldId)
      return world ? { world, coverTitle: pick.coverTitle } : null
    })
    .filter((item): item is { world: WorldSummary; coverTitle: { zh: string; en: string } } => Boolean(item)),
  [bootstrapWorldById])

  // 回访访客：至少玩过一个世界才在首屏显示细进度条；首次访问不打扰
  const { ready: atlasReady, visited } = useAtlas()
  const exploredCount = atlasReady ? Math.min(visited.length, worldArtifactManifest.total) : 0

  // 最近上新：公开世界按首次出现日期新→旧；失败馆与归档世界不会出现
  const freshWorlds = useMemo(() => bootstrap.freshWorldIds
    .map((id) => bootstrapWorldById.get(id))
    .filter((world): world is WorldSummary => Boolean(world)),
  [bootstrap.freshWorldIds, bootstrapWorldById])
  // 搜索词与 URL ?q= 同步：顶栏搜索框提交后直达结果，刷新/分享链接不丢状态。
  // IME 组字（中/日/韩）期间禁止回写 URL 或用 URL 覆盖输入，否则受控 value 会打断候选。
  const urlQuery = useSearch({ from: '/' }).q ?? ''
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
  const [pathExpanded, setPathExpanded] = useState(false)
  const [openPathId, setOpenPathId] = useState(paths[0]?.id ?? '')
  const locatedPathRef = useRef(false)
  const [catalogState, setCatalogState] = useState<CatalogState>({
    key: 'all\0recommended',
    page: 1,
    worlds: initialPage,
    loading: false,
  })
  const [searchDocuments, setSearchDocuments] = useState<ReadonlyArray<WorldSearchDocument>>([])

  useEffect(() => {
    setCategoryState(readSavedCategory())
  }, [])

  useEffect(() => {
    if (!atlasReady || locatedPathRef.current) return
    locatedPathRef.current = true
    const pathId = firstUnexploredPathId(visited, bootstrapWorldById)
    const pathIndex = paths.findIndex((item) => item.id === pathId)
    setOpenPathId(pathId)
    if (pathIndex >= FEATURED_PATH_COUNT) setPathExpanded(true)
  }, [atlasReady, bootstrapWorldById, visited])

  const setCategory = (next: CategoryId | 'all') => {
    setCategoryState(next)
    safeLocalStorage.set(CATEGORY_FILTER_KEY, next)
  }
  const normalizedQuery = normalizeWorldSearch(query)
  // 有搜索词时跨全站目录查找：学科筛选只在「浏览」时生效。
  // 否则 localStorage 里残留的「物理」等域会把「台风」等结果滤成空。
  const activeCategory: CategoryId | 'all' = normalizedQuery ? 'all' : category
  const catalogKey = `${activeCategory}\u0000${sortOrder}`
  const catalogTotal = activeCategory === 'all'
    ? worldArtifactManifest.total
    : worldArtifactManifest.categories.find((item) => item.id === activeCategory)?.count ?? 0

  useEffect(() => {
    if (normalizedQuery) return
    if (catalogKey === 'all\0recommended') {
      setCatalogState({ key: catalogKey, page: 1, worlds: initialPage, loading: false })
      return
    }
    let cancelled = false
    setCatalogState({ key: catalogKey, page: 0, worlds: [], loading: true })
    void fetchJson<ReadonlyArray<WorldSummary>>(
      worldCatalogPagePath(1, activeCategory === 'all' ? undefined : activeCategory, sortOrder),
    ).then((nextWorlds) => {
      if (!cancelled) setCatalogState({ key: catalogKey, page: 1, worlds: nextWorlds, loading: false })
    }).catch(() => {
      if (!cancelled) setCatalogState({ key: catalogKey, page: 0, worlds: [], loading: false })
    })
    return () => { cancelled = true }
  }, [activeCategory, catalogKey, initialPage, normalizedQuery, sortOrder])

  useEffect(() => {
    if (!normalizedQuery) {
      setSearchDocuments([])
      return
    }
    let cancelled = false
    void fetchJson<ReadonlyArray<WorldSearchDocument>>(worldSearchIndexPath(locale))
      .then((documents) => {
        if (!cancelled) setSearchDocuments(documents)
      })
      .catch(() => {
        if (!cancelled) setSearchDocuments([])
      })
    return () => { cancelled = true }
  }, [locale, normalizedQuery])

  const matchingWorlds = useMemo(() => normalizedQuery
    ? searchDocuments
        .filter((document) => document.text.includes(normalizedQuery) || worldMatchesSearch(document.world, normalizedQuery))
        .map((document) => document.world)
    : catalogState.key === catalogKey ? catalogState.worlds : [],
  [catalogKey, catalogState, normalizedQuery, searchDocuments])
  const visibleWorlds = matchingWorlds
  const matchingTotal = normalizedQuery ? matchingWorlds.length : catalogTotal
  const hasMoreWorlds = !normalizedQuery && visibleWorlds.length < catalogTotal
  const worldWindowKey = `${catalogKey}\u0000${normalizedQuery}`
  const revealMoreWorlds = useCallback(() => {
    if (normalizedQuery || catalogState.loading || catalogState.key !== catalogKey) return
    const nextPage = catalogState.page + 1
    setCatalogState((current) => ({ ...current, loading: true }))
    void fetchJson<ReadonlyArray<WorldSummary>>(
      worldCatalogPagePath(nextPage, activeCategory === 'all' ? undefined : activeCategory, sortOrder),
    ).then((nextWorlds) => {
      setCatalogState((current) => current.key === catalogKey
        ? {
            key: catalogKey,
            page: nextPage,
            worlds: [...current.worlds, ...nextWorlds],
            loading: false,
          }
        : current)
    }).catch(() => {
      setCatalogState((current) => current.key === catalogKey ? { ...current, loading: false } : current)
    })
  }, [activeCategory, catalogKey, catalogState, normalizedQuery, sortOrder])

  const gridRef = useScrollReveal<HTMLDivElement>('.world-card', {
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
    if (!trigger || !hasMoreWorlds || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) revealMoreWorlds()
      },
      { rootMargin: '600px 0px', threshold: 0 },
    )
    observer.observe(trigger)
    return () => observer.disconnect()
  }, [hasMoreWorlds, revealMoreWorlds])

  const visitRandomWorld = () => {
    const target = selectHomeWorld(bootstrap.worlds, visited, flagshipWorldIds)
    if (target) navigate({ to: '/explore/$worldId', params: { worldId: target.id } })
  }

  const scrollToWorlds = () => {
    document.getElementById('home-worlds')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const scrollToGrid = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    scrollToWorlds()
  }

  return (
    <main className="home-page">
      <section className="home-hero" aria-labelledby="home-hero-title">
        <SiteHeader inverse />

        <div className="home-stars" aria-hidden="true" />
        <HomeUniverse worlds={bootstrap.worlds} />

        <div className="home-hero-copy">
          <p className="home-hero-eyebrow">
            <i aria-hidden="true" /> {t('common.interactiveWorlds', { value: worldArtifactManifest.total })}
          </p>
          <h1 id="home-hero-title">{t('home.title')}</h1>
          <p className="home-hero-sub">
            {t('home.body')}
          </p>
          <div className="home-hero-actions">
            <button type="button" className="home-hero-primary" onClick={visitRandomWorld}>
              <Shuffle aria-hidden="true" /> {t('home.random')}
            </button>
            <a href="#home-worlds" className="home-hero-secondary" onClick={scrollToGrid}>
              {t('home.pickCategory')} <ArrowDown aria-hidden="true" />
            </a>
          </div>
          {exploredCount > 0 && (
            <Link to="/atlas" className="home-hero-progress">
              <span className="home-hero-progress-row">
                <span className="home-hero-progress-text">
                  {t('home.progress.explored', { done: exploredCount, total: worldArtifactManifest.total })}
                </span>
                <span className="home-hero-progress-cta">
                  {t('home.progress.cta')} <ArrowRight aria-hidden="true" />
                </span>
              </span>
              <span className="home-hero-progress-track" aria-hidden="true">
                <i style={{ width: `${Math.min(100, (exploredCount / Math.max(1, worldArtifactManifest.total)) * 100)}%` }} />
              </span>
            </Link>
          )}
        </div>

        <p className="home-hero-hint" aria-hidden="true">
          <ArrowDown aria-hidden="true" /> {t('home.drag')}
        </p>
      </section>

      <section className="home-galaxy" aria-labelledby="home-galaxy-title">
        <h2 id="home-galaxy-title" className="home-galaxy-heading">{t('home.galaxy.title')}</h2>
        <div className="home-galaxy-track">
          {rootCategories.map((item) => (
            <Link
              key={item.id}
              to="/category/$categoryId"
              params={{ categoryId: item.id }}
              className="home-galaxy-node"
              style={{ '--galaxy-accent': item.accent } as CSSProperties}
            >
              <span className="home-galaxy-star" aria-hidden="true"><i /></span>
              <span className="home-galaxy-name">{categoryText(item, 'title')}</span>
              <span className="home-galaxy-tagline">{categoryText(item, 'description')}</span>
            </Link>
          ))}
        </div>
      </section>

      {weeklyPicks.length > 0 && (
        <section
          className="home-section home-weekly"
          aria-labelledby="home-weekly-title"
          style={{ '--weekly-accent': weeklyPicks[0]?.world.accent } as CSSProperties}
        >
          <header className="home-section-head">
            <h2 id="home-weekly-title">{t('home.weekly.kicker')}</h2>
            <p>{formatWeeklySince(worldOfTheWeek.since, locale)}</p>
          </header>
          <div className="home-weekly-grid">
            {weeklyPicks.map(({ world, coverTitle }, index) => (
              <Link
                key={world.id}
                to="/explore/$worldId"
                params={{ worldId: world.id }}
                className="home-weekly-card"
                style={{ '--world-accent': world.accent } as CSSProperties}
                onMouseEnter={() => warmWorldOnIntent(world.id)}
                onFocus={() => warmWorldOnIntent(world.id)}
              >
                <span className="home-weekly-card-media">
                  <img
                    src={worldThumbnail(world)}
                    alt=""
                    loading={index === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    fetchPriority="low"
                    width={384}
                    height={256}
                  />
                  <span className="home-weekly-card-label">
                    {coverTitle[locale]}
                  </span>
                </span>
                <span className="home-weekly-card-body">
                  <span className="home-weekly-card-desc">
                    {worldText(world, 'posterTitle')}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="home-section home-path-section" aria-labelledby="home-path-title">
        <header className="home-section-head">
          <h2 id="home-path-title">{t('home.paths.title')}</h2>
          <button
            type="button"
            className={pathExpanded
              ? 'home-section-more home-path-toggle is-expanded'
              : 'home-section-more home-path-toggle'}
            aria-expanded={pathExpanded}
            onClick={() => setPathExpanded((value) => !value)}
          >
            {pathExpanded
              ? t('home.paths.collapse')
              : t('home.paths.viewAll', { value: paths.length })}
            <ArrowRight aria-hidden="true" />
          </button>
        </header>
        <div className="home-path-accordion">
          {(pathExpanded ? paths : paths.slice(0, FEATURED_PATH_COUNT)).map((path, index) => (
            <PathAccordion
              key={path.id}
              pathId={path.id}
              order={index + 1}
              isOpen={openPathId === path.id}
              onToggle={() => setOpenPathId((current) => current === path.id ? '' : path.id)}
              worldById={bootstrapWorldById}
            />
          ))}
        </div>
        {!pathExpanded && paths.length > FEATURED_PATH_COUNT && (
          <div className="home-path-foot">
            <p className="home-path-foot-note">
              {t('home.paths.moreFoot', {
                shown: FEATURED_PATH_COUNT,
                total: paths.length,
              })}
            </p>
            <button
              type="button"
              className="home-path-foot-cta"
              onClick={() => setPathExpanded(true)}
            >
              {t('home.paths.expandFoot', {
                value: paths.length - FEATURED_PATH_COUNT,
              })}
              <ArrowRight aria-hidden="true" />
            </button>
          </div>
        )}
        {pathExpanded && (
          <div className="home-path-foot">
            <button
              type="button"
              className="home-path-foot-cta is-quiet"
              onClick={() => setPathExpanded(false)}
            >
              {t('home.paths.collapse')}
            </button>
          </div>
        )}
      </section>

      {freshWorlds.length > 0 && (
        <section className="home-section home-fresh-section" aria-labelledby="home-fresh-title">
          <header className="home-section-head">
            <h2 id="home-fresh-title">{t('home.fresh.title')}</h2>
            <Link to="/changelog" className="home-section-more">
              {t('home.fresh.more')}
              <ArrowRight aria-hidden="true" />
            </Link>
          </header>
          <div className="home-fresh-world-rail" role="list" aria-label={t('home.fresh.title')}>
            {freshWorlds.slice(0, 10).map((world, position) => {
              const releasedOn = getWorldReleaseDate(world.id)
              return (
                <Link
                  role="listitem"
                  key={world.id}
                  to="/explore/$worldId"
                  params={{ worldId: world.id }}
                  className={position === 0 ? 'home-fresh-world is-latest' : 'home-fresh-world'}
                  onMouseEnter={() => warmWorldOnIntent(world.id)}
                  onFocus={() => warmWorldOnIntent(world.id)}
                >
                  <span className="home-fresh-world-media">
                    <img
                      src={worldThumbnail(world)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                    <span className="home-fresh-world-order" aria-hidden="true">{String(position + 1).padStart(2, '0')}</span>
                  </span>
                  <span className="home-fresh-world-copy">
                    <span className="home-fresh-world-meta">
                      <small>{categoryText(rootCategoryById.get(rootCategoryId(world))!, 'title')}</small>
                      {releasedOn && (
                        <time dateTime={releasedOn}>
                          {formatWeeklySince(releasedOn, locale)}
                        </time>
                      )}
                    </span>
                    <strong>{worldText(world, 'posterTitle')}</strong>
                  </span>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      <section className="home-section" id="home-worlds" aria-labelledby="home-worlds-title">
        <header className="home-section-head">
          <h2 id="home-worlds-title">{t('home.collection.title')}</h2>
          <p>{t('home.collection.body')}</p>
        </header>
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
                // 组字期间 debounce 被跳过；结束后立刻同步最终词，避免只靠 onChange 时 effect 不再触发
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
            <span aria-live="polite">{t('worlds.results', { value: matchingTotal })}</span>
            <div className="home-sort" role="group" aria-label={t('home.sort.label')}>
              <button
                type="button"
                className={sortOrder === 'recommended' ? 'is-active' : undefined}
                aria-pressed={sortOrder === 'recommended'}
                onClick={() => setSortOrder('recommended')}
              >
                {t('home.sort.recommended')}
              </button>
              <button
                type="button"
                className={sortOrder === 'newest' ? 'is-active' : undefined}
                aria-pressed={sortOrder === 'newest'}
                onClick={() => setSortOrder('newest')}
              >
                {t('home.sort.newest')}
              </button>
              <button
                type="button"
                className={sortOrder === 'catalogue' ? 'is-active' : undefined}
                aria-pressed={sortOrder === 'catalogue'}
                onClick={() => setSortOrder('catalogue')}
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
                  disabled={Boolean(normalizedQuery)}
                >
                  {categoryText(item, 'title')} <b>{count}</b>
                </button>
              )
            })}
          </div>
        </div>
        {matchingWorlds.length > 0 ? (
          <div className="home-collection-layout">
            <div className="world-card-grid" ref={gridRef}>
              {visibleWorlds.map((world, position) => (
                <HomeWorldCard key={world.id} world={world} position={position} />
              ))}
            </div>
          </div>
        ) : (
          <div className="home-search-empty">
            <MagnifyingGlass aria-hidden="true" />
            <p>{t('worlds.empty')}</p>
            <button type="button" onClick={() => {
              setQuery('')
              setCategory('all')
              setSortOrder('recommended')
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
              <button type="button" className="home-collection-more-btn" onClick={revealMoreWorlds}>
                {t('home.collection.more', {
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
