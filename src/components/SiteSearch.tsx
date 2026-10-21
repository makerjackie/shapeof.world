import { worldRoute } from '~/lib/world-urls'
import { trackEvent } from '~/lib/analytics'
import '~/styles/site-forms.css'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowRight, MagnifyingGlass, X } from '@phosphor-icons/react'

import { useI18n } from '~/i18n'
import { isSiteSearchShortcut } from '~/lib/site-search-shortcut'
import { normalizeWorldSearch, worldMatchesSearch } from '~/lib/world-search'
import { useWorldSearchIndex } from '~/lib/world-search-index'
import { worldThumbnail } from '~/lib/posters'
import { worldIntentHandlers } from '~/lib/world-prefetch'

type SiteSearchContextValue = {
  open: boolean
  openSearch: () => void
}

const SiteSearchContext = createContext<SiteSearchContextValue | null>(null)
const VISIBLE_RESULT_COUNT = 6

function currentHomeQuery(): string {
  if (typeof window === 'undefined' || window.location.pathname !== '/') return ''
  return new URLSearchParams(window.location.search).get('q') ?? ''
}

function useSiteSearch() {
  const value = useContext(SiteSearchContext)
  if (!value) throw new Error('SiteSearchButton must be rendered inside SiteSearchProvider')
  return value
}

export function SiteSearchButton() {
  const { t } = useI18n()
  const { open, openSearch } = useSiteSearch()

  return (
    <button
      type="button"
      className="site-search-trigger"
      onClick={openSearch}
      aria-label={`${t('header.search.open')} (Ctrl K)`}
      aria-haspopup="dialog"
      aria-expanded={open}
      title={`${t('header.search.open')} (Ctrl K)`}
    >
      <MagnifyingGlass aria-hidden="true" weight="thin" />
      <span>{t('header.search.open')}</span>
    </button>
  )
}

export function SiteSearchProvider({ children }: { children: ReactNode }) {
  const { locale, t, worldText } = useI18n()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const searchIndex = useWorldSearchIndex(locale, open)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const openRef = useRef(false)
  const titleId = useId()
  const statusId = useId()

  useEffect(() => {
    openRef.current = open
  }, [open])

  const openSearch = useCallback(() => {
    if (openRef.current) {
      inputRef.current?.focus()
      inputRef.current?.select()
      return
    }
    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    setQuery(currentHomeQuery())
    trackEvent({ event: 'search_open' })
    setOpen(true)
  }, [])

  const closeSearch = useCallback(() => {
    setOpen(false)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isSiteSearchShortcut(event)) return
      event.preventDefault()
      openSearch()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openSearch])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (!open) {
      if (dialog.open) dialog.close()
      return
    }
    if (!dialog.open) dialog.showModal()
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open])

  const normalizedQuery = normalizeWorldSearch(query)
  const currentIndex = searchIndex.documents
  const matchingDocuments = useMemo(() => {
    if (!normalizedQuery || !currentIndex) return []
    return currentIndex.filter((document) => (
      document.text.includes(normalizedQuery)
      || worldMatchesSearch(document.world, normalizedQuery)
    ))
  }, [currentIndex, normalizedQuery])
  const visibleDocuments = matchingDocuments.slice(0, VISIBLE_RESULT_COUNT)
  const loading = Boolean(normalizedQuery && searchIndex.loading)
  useEffect(() => {
    if (!open || !normalizedQuery || !currentIndex) return
    const timer = window.setTimeout(() => trackEvent({ event: 'search_results', value: matchingDocuments.length === 0 ? 'none' : matchingDocuments.length <= 6 ? 'few' : 'many' }), 800)
    return () => window.clearTimeout(timer)
  }, [open, normalizedQuery, currentIndex, matchingDocuments.length])

  const goToAllResults = useCallback((event?: FormEvent) => {
    event?.preventDefault()
    // Read the submitted control directly so an immediate Enter after autofill,
    // IME completion, or scripted fill cannot observe one render-old state.
    const normalized = inputRef.current?.value.trim() ?? ''
    if (!normalized) {
      inputRef.current?.focus()
      return
    }
    closeSearch()
    void navigate({
      to: '/',
      search: (previous: Record<string, unknown>) => ({
        ...previous,
        issue: undefined,
        q: normalized,
      }),
      hash: 'home-worlds',
    })
  }, [closeSearch, navigate])

  const restorePreviousFocus = () => {
    setOpen(false)
    const previous = previousFocusRef.current
    if (previous?.isConnected) window.requestAnimationFrame(() => previous.focus())
  }

  return (
    <SiteSearchContext.Provider value={{ open, openSearch }}>
      {children}
      <dialog
        ref={dialogRef}
        className="site-search-dialog"
        aria-labelledby={titleId}
        aria-describedby={statusId}
        onClose={restorePreviousFocus}
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return
          event.preventDefault()
          closeSearch()
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeSearch()
        }}
      >
        <div className="site-search-panel">
          <header className="site-search-heading">
            <h2 id={titleId}>{t('header.search.title')}</h2>
            <button type="button" className="site-search-close" onClick={closeSearch} aria-label={t('header.search.close')}>
              <X aria-hidden="true" weight="thin" />
            </button>
          </header>

          <form className="site-search-form" role="search" onSubmit={goToAllResults}>
            <MagnifyingGlass aria-hidden="true" weight="thin" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
                event.preventDefault()
                goToAllResults()
              }}
              placeholder={t('worlds.search')}
              aria-label={t('worlds.search')}
              aria-controls={statusId}
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                className="site-search-clear"
                onClick={() => {
                  setQuery('')
                  inputRef.current?.focus()
                }}
                aria-label={t('worlds.clearSearch')}
              >
                <X aria-hidden="true" weight="thin" />
              </button>
            )}
          </form>

          <div id={statusId} className="site-search-status" aria-live="polite">
            {loading && <span>{t('header.search.loading')}</span>}
            {normalizedQuery && searchIndex.error && (
              <>
                <span>{t('header.search.unavailable')}</span>
                <button type="button" onClick={searchIndex.retry}>{t('system.retry')}</button>
              </>
            )}
            {normalizedQuery && currentIndex && (
              <span>{t('worlds.results', { value: matchingDocuments.length })}</span>
            )}
          </div>

          {visibleDocuments.length > 0 && (
            <ul className="site-search-results">
              {visibleDocuments.map(({ world }) => (
                <li key={world.id}>
                  <Link
                    to={worldRoute}
                    params={{ worldId: world.id }}
                    onClick={() => { trackEvent({ event: 'search_result_click', worldId: world.id }); closeSearch() }}
                    {...worldIntentHandlers(world.id)}
                  >
                    <img src={worldThumbnail(world)} alt="" loading="lazy" decoding="async" />
                    <span>
                      <strong>{worldText(world, 'posterTitle')}</strong>
                      <small>{worldText(world, 'posterHook')}</small>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {normalizedQuery && currentIndex && matchingDocuments.length === 0 && (
            <div>
              <p className="site-search-empty">{t('worlds.empty')}</p>
              <div className="site-search-empty-actions">
                <button type="button" className="btn-text" onClick={() => { setQuery(''); inputRef.current?.focus() }}>{t('worlds.clearSearch')}</button>
                <Link className="btn-text" to="/" hash="home-worlds" search={{}} onClick={closeSearch}>{t('search.browse')}</Link>
                <Link className="btn-text" to="/feedback" search={{ kind: 'topic' }} onClick={closeSearch}>{t('search.suggest')}</Link>
              </div>
            </div>
          )}

          {matchingDocuments.length > VISIBLE_RESULT_COUNT && (
            <button type="button" className="site-search-all" onClick={() => goToAllResults()}>
              <span>{t('header.search.allResults')}</span>
              <ArrowRight aria-hidden="true" weight="thin" />
            </button>
          )}

          <footer className="site-search-footer">
            <span>Ctrl K</span>
            <span>Esc</span>
          </footer>
        </div>
      </dialog>
    </SiteSearchContext.Provider>
  )
}
