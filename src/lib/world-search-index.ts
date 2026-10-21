import { useCallback, useEffect, useState } from 'react'
import { worldSearchIndexPath, type WorldSearchDocument } from '~/data/world-artifacts'
import { fetchWorldJson, isWorldSummary } from './world-json'

type Locale = 'zh' | 'en'
type SearchIndex = ReadonlyArray<WorldSearchDocument>
const indexes = new Map<Locale, Promise<SearchIndex>>()

export function loadWorldSearchIndex(locale: Locale): Promise<SearchIndex> {
  const cached = indexes.get(locale)
  if (cached) return cached
  const request = fetchWorldJson(worldSearchIndexPath(locale), (value): value is SearchIndex =>
    Array.isArray(value) && value.every(document => document && typeof document.text === 'string' && isWorldSummary(document.world)),
  ).catch((error: unknown) => {
    indexes.delete(locale)
    throw error
  })
  indexes.set(locale, request)
  return request
}

export function useWorldSearchIndex(locale: Locale, enabled: boolean) {
  const [state, setState] = useState<{
    locale: Locale
    documents?: SearchIndex
    error: boolean
  }>({ locale, error: false })
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt((current) => current + 1), [])

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setState({ locale, error: false })
    void loadWorldSearchIndex(locale).then((documents) => {
      if (!cancelled) setState({ locale, documents, error: false })
    }).catch(() => {
      if (!cancelled) setState({ locale, error: true })
    })
    // Another search surface may still be awaiting the shared request.
    return () => { cancelled = true }
  }, [attempt, enabled, locale])

  const documents = state.locale === locale ? state.documents : undefined
  const error = enabled && state.locale === locale && state.error
  return { documents, error, loading: enabled && !documents && !error, retry }
}
