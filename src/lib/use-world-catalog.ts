import { useCallback, useEffect, useRef, useState } from 'react'
import { worldCatalogPagePath, type WorldCatalogSort } from '~/data/world-artifacts'
import type { WorldSummary } from '~/data/world-summaries'

type CatalogState = {
  key: string
  page: number
  worlds: ReadonlyArray<WorldSummary>
  loading: boolean
  error: boolean
}

const catalogueCache = new Map<string, { state: CatalogState; total: number }>()
const CACHE_LIMIT = 9

function rememberCatalogue(state: CatalogState, total: number) {
  if (typeof window === 'undefined' || state.loading || state.error || state.page === 0) return
  catalogueCache.delete(state.key)
  catalogueCache.set(state.key, { state, total })
  if (catalogueCache.size > CACHE_LIMIT) catalogueCache.delete(catalogueCache.keys().next().value!)
}

export function useWorldCatalog({ category, sort, initialPage, enabled, total }: {
  category: string
  sort: WorldCatalogSort
  initialPage: ReadonlyArray<WorldSummary>
  enabled: boolean
  total: number
}) {
  const key = `${category}\u0000${sort}`
  const [state, setState] = useState<CatalogState>({
    key: 'all\0recommended', page: 1, worlds: initialPage, loading: false, error: false,
  })
  const currentRef = useRef(state)
  const generationRef = useRef(0)
  const publish = useCallback((next: CatalogState) => {
    currentRef.current = next
    setState(next)
    rememberCatalogue(next, total)
  }, [total])

  const requestPage = useCallback(async (page: number, generation: number) => {
    publish({ ...currentRef.current, loading: true, error: false })
    try {
      const response = await fetch(worldCatalogPagePath(page, category === 'all' ? undefined : category, sort), {
        headers: { accept: 'application/json' },
      })
      if (!response.ok) throw new Error(`Catalogue request failed: ${response.status}`)
      const worlds = await response.json<ReadonlyArray<WorldSummary>>()
      if (generation !== generationRef.current) return
      const current = currentRef.current
      if (worlds.length === 0 && current.worlds.length < total) throw new Error('Catalogue page is empty')
      publish({ key, page, worlds: [...current.worlds, ...worlds], loading: false, error: false })
    } catch {
      if (generation === generationRef.current) publish({ ...currentRef.current, loading: false, error: true })
    }
  }, [category, key, publish, sort, total])

  useEffect(() => {
    const generation = ++generationRef.current
    if (enabled) {
      const cached = typeof window !== 'undefined' ? catalogueCache.get(key) : undefined
      if (cached && cached.total === total) {
        publish(cached.state)
      } else if (key === 'all\0recommended') {
        publish({ key, page: 1, worlds: initialPage, loading: false, error: false })
      } else {
        publish({ key, page: 0, worlds: [], loading: true, error: false })
        void requestPage(1, generation)
      }
    }
    return () => { generationRef.current += 1 }
  }, [enabled, initialPage, key, publish, requestPage, total])

  const loadNext = useCallback((manual: boolean) => {
    const current = currentRef.current
    if (!enabled || current.key !== key || current.loading || (!manual && current.error) || current.worlds.length >= total) return
    void requestPage(current.page + 1, generationRef.current)
  }, [enabled, key, requestPage, total])
  const loadMore = useCallback(() => loadNext(false), [loadNext])
  const retry = useCallback(() => loadNext(true), [loadNext])

  return {
    worlds: state.key === key ? state.worlds : [],
    loading: enabled && (state.key !== key || state.loading),
    error: enabled && state.key === key && state.error,
    loadMore,
    retry,
  }
}
