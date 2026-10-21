import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation } from '@tanstack/react-router'

import { SiteFooter } from '~/components/SiteFooter'
import { SiteHeader } from '~/components/SiteHeader'
import { WorldCard } from '~/components/WorldCard'
import { useOptionalI18n } from '~/i18n'
import { homeFeaturedWeek } from '~/lib/home-featured'
import { selectNotFoundWorldIds } from '~/lib/not-found-worlds'
import { fetchWorldJson } from '~/lib/world-json'
import { legacyArchiveUrl } from '~/lib/legacy-site'

const HOME_BOOTSTRAP_PATH = '/generated/world-artifacts/home-bootstrap.json'

type SuggestedWorld = {
  id: string
  posterTitle: string
  posterPosition?: string
  translations: { en: { posterTitle: string } }
}

function isSuggestedWorld(value: unknown): value is SuggestedWorld {
  const world = value as SuggestedWorld
  return Boolean(world) && typeof world.id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(world.id)
    && typeof world.posterTitle === 'string' && typeof world.translations?.en?.posterTitle === 'string'
}

function isBootstrap(value: unknown): value is { worlds: SuggestedWorld[] } {
  const worlds = (value as { worlds?: unknown })?.worlds
  return Array.isArray(worlds) && worlds.every(isSuggestedWorld)
}

function NotFoundWorlds() {
  const i18n = useOptionalI18n()
  const pathname = useLocation({ select: (location) => location.pathname })
  const [worlds, setWorlds] = useState<readonly SuggestedWorld[]>([])

  useEffect(() => {
    const controller = new AbortController()
    void fetchWorldJson(HOME_BOOTSTRAP_PATH, isBootstrap, controller.signal).then((bootstrap) => {
      const byId = new Map(bootstrap.worlds.map((world) => [world.id, world]))
      const ids = selectNotFoundWorldIds([...byId.keys()], pathname, homeFeaturedWeek())
      setWorlds(ids.map((id) => byId.get(id)).filter((world): world is SuggestedWorld => Boolean(world)))
    }).catch(() => undefined)
    return () => controller.abort()
  }, [pathname])

  if (!i18n || !worlds.length) return null
  const { t, locale } = i18n
  return (
    <section className="nf-worlds" aria-labelledby="nf-worlds-title">
      <h2 id="nf-worlds-title" className="section-title">{t('notFound.worldsTitle')}</h2>
      <div className="work-card-grid nf-world-grid">
        {worlds.map((world) => (
          <WorldCard key={world.id} world={world} size="small" />
        ))}
      </div>
    </section>
  )
}

// Old links to a world that only the archived earlier site still has. Rendered
// inside the providers only, where the router location is available.
function LegacyArchive() {
  const i18n = useOptionalI18n()
  const archiveUrl = legacyArchiveUrl(useLocation({ select: (location) => location.pathname }))
  if (!i18n || !archiveUrl) return null
  return (
    <div className="nf-legacy">
      <p>{i18n.t('notFound.legacy')}</p>
      <a href={archiveUrl} className="btn-secondary" rel="nofollow">{i18n.t('notFound.legacyOpen')}</a>
    </div>
  )
}

export function NotFound({ children }: { children?: ReactNode }) {
  const i18n = useOptionalI18n()
  const t = i18n?.t ?? ((key: string) => ({
    'system.notFound.title': 'Page not found',
    'system.notFound.body': 'The path may have moved, but the worlds remain.',
    'system.back': 'Go back',
    'system.home': 'Return home',
  }[key] ?? key))
  const page = (
    <main className="nf-page">
      <div className="nf-hero">
        <div className="nf-watermark" aria-hidden="true">404</div>
        <div className="nf-content">
          <h1 className="page-title nf-title">{t('system.notFound.title')}</h1>
          <div className="nf-copy">
            {children || <p>{t('system.notFound.body')}</p>}
          </div>
          {i18n && <LegacyArchive />}
          <div className="nf-actions">
            <Link to="/" className="btn-primary">
              {t('system.home')}
            </Link>
            {i18n && (
              <>
                <Link to="/" hash="home-worlds" className="btn-secondary">{t('home.browseAll')}</Link>
                <Link to="/routes" className="btn-secondary">{t('nav.routes')}</Link>
              </>
            )}
            <button onClick={() => window.history.back()} className="btn-secondary">
              {t('system.back')}
            </button>
          </div>
        </div>
      </div>
      {i18n && <NotFoundWorlds />}
    </main>
  )
  // The shared header and footer need the site providers; a failure outside
  // them still gets the plain page.
  if (!i18n) return page
  return (
    <div className="nf-shell">
      <SiteHeader />
      {page}
      <SiteFooter />
    </div>
  )
}
