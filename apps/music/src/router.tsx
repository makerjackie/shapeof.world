import {
  HeadContent,
  Link,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import type { Locale } from '~/i18n'

import { Footer } from '~/components/Footer'
import { Header } from '~/components/Header'
import { Player } from '~/components/Player'
import { I18nProvider, resolveLocale, useI18n } from '~/i18n'
import { cleanSearch } from '~/lib/locale'
import { PlayerProvider } from '~/state/player'
import { AlbumPage } from '~/routes/album'
import { HandoffPage } from '~/routes/handoff'
import { ShortsPage } from '~/routes/shorts'
import { HomePage } from '~/routes/home'
import { TrackPage } from '~/routes/track'
import { RightsPage } from '~/routes/rights'
import { PacksPage } from '~/routes/packs'

const SITE = 'https://music.shapeof.world'
const OG = 'https://shapeof.world/assets/oneworld-og.jpg'

function seoMeta(locale: 'en' | 'zh', title: string, path: string, description?: string) {
  const desc = description
    ?? (locale === 'zh'
      ? '配乐、音效与环境声素材库，按场景、风格、时长和使用权限检索，适合短视频、游戏与应用。'
      : 'Music, sound effects and ambience for videos, games and apps. Browse by scene, style, duration and usage permissions.')
  const url = `${SITE}${path}`
  return [
    { title },
    { name: 'description', content: desc },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: 'Shape of the World' },
    { property: 'og:title', content: title },
    { property: 'og:description', content: desc },
    { property: 'og:url', content: url },
    { property: 'og:image', content: OG },
    { property: 'og:locale', content: locale === 'zh' ? 'zh_CN' : 'en_US' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: desc },
    { name: 'twitter:image', content: OG },
  ]
}

function RootLayout() {
  const [locale, setLanguage] = useState(resolveLocale)
  const setLocale = useCallback((next: Locale) => {
    try { localStorage.setItem('music.language', next) } catch { /* Keep manual choice for this visit. */ }
    setLanguage(next)
  }, [])
  useEffect(() => {
    const followBrowser = () => setLanguage(resolveLocale())
    window.addEventListener('languagechange', followBrowser)
    return () => window.removeEventListener('languagechange', followBrowser)
  }, [])

  useEffect(() => {
    void router.invalidate()
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
    document.title = locale === 'zh'
      ? '世界的形状 — 原声'
      : 'Shape of the World — Original Soundtrack'
  }, [locale])

  return (
    <I18nProvider locale={locale} setLocale={setLocale}>
      <PlayerProvider>
        <div className="shell">
          <HeadContent />
          <SkipLink />
          <Header />
          <main id="content">
            <Outlet />
          </main>
          <Footer />
          <Player />
        </div>
      </PlayerProvider>
    </I18nProvider>
  )
}

function SkipLink() {
  const { t } = useI18n()
  return <a className="skip" href="#content">{t('nav.skip')}</a>
}

function NotFoundPage() {
  const { t } = useI18n()
  return (
    <div className="page">
      <h1>{t('notfound.title')}</h1>
      <p className="lede">{t('notfound.body')}</p>
      <Link to="/" search={cleanSearch}>{t('notfound.home')}</Link>
    </div>
  )
}

const rootRoute = createRootRoute({
  validateSearch: cleanSearch,
  component: RootLayout,
  notFoundComponent: NotFoundPage,
  head: () => {
    const locale = resolveLocale()
    const title = locale === 'zh'
      ? '世界的形状 — 原声'
      : 'Shape of the World — Original Soundtrack'
    return {
      meta: seoMeta(locale, title, '/'),
      links: [{ rel: 'canonical', href: `${SITE}/` }],
    }
  },
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
})

const soundsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/sounds', component: () => <HomePage key="sfx" kind="sfx" />, head: () => ({meta:seoMeta(resolveLocale(), resolveLocale() === 'zh' ? '音效 — 世界的形状' : 'Sound effects — Shape of the World', '/sounds'),links:[{rel:'canonical',href:SITE+'/sounds'}]}) })
const ambienceRoute = createRoute({ getParentRoute: () => rootRoute, path: '/ambience', component: () => <HomePage key="ambience" kind="ambience" />, head: () => ({meta:seoMeta(resolveLocale(), resolveLocale() === 'zh' ? '环境声 — 世界的形状' : 'Ambience — Shape of the World', '/ambience'),links:[{rel:'canonical',href:SITE+'/ambience'}]}) })
const gamesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/games', component: () => <HomePage key="games" games />, head: () => ({meta:seoMeta(resolveLocale(), resolveLocale() === 'zh' ? '游戏配乐 — 世界的形状' : 'Game music — Shape of the World', '/games'),links:[{rel:'canonical',href:SITE+'/games'}]}) })
const rightsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/rights', component: RightsPage, head: () => ({meta:seoMeta(resolveLocale(), resolveLocale() === 'zh' ? '音频使用说明 — 世界的形状' : 'Audio permissions — Shape of the World', '/rights'),links:[{rel:'canonical',href:SITE+'/rights'}]}) })
const packsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/packs', component: PacksPage, head: () => ({meta:seoMeta(resolveLocale(), resolveLocale() === 'zh' ? '场景套件 — 世界的形状' : 'Scene kits — Shape of the World', '/packs'),links:[{rel:'canonical',href:SITE+'/packs'}]}) })

const shortsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/shorts',
  component: ShortsPage,
  head: () => ({ meta: seoMeta(resolveLocale(), resolveLocale() === 'zh' ? '短片配乐 — 世界的形状' : 'Short promos — Shape of the World', '/shorts'), links: [{rel: 'canonical', href: SITE + '/shorts'}] }),
})

const albumRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/album/volume-1',
  component: AlbumPage,
  head: () => {
    const locale = resolveLocale()
    const title = locale === 'zh'
      ? '第一卷 — 世界的形状原声'
      : 'Volume 1 — Shape of the World Original Soundtrack'
    return {
      meta: seoMeta(locale, title, '/album/volume-1'),
      links: [{ rel: 'canonical', href: `${SITE}/album/volume-1` }],
    }
  },
})

const trackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/track/$trackId',
  component: function TrackRoutePage() {
    const { trackId } = trackRoute.useParams()
    return <TrackPage trackId={trackId} />
  },
  head: ({ params }) => {
    const locale = resolveLocale()
    const title = locale === 'zh'
      ? `${params.trackId} — 世界的形状原声`
      : `${params.trackId} — Shape of the World Original Soundtrack`
    return {
      meta: seoMeta(locale, title, `/track/${params.trackId}`),
      links: [{ rel: 'canonical', href: `${SITE}/track/${params.trackId}` }],
    }
  },
})

const handoffRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/handoff',
  component: HandoffPage,
  head: () => {
    const locale = resolveLocale()
    const title = locale === 'zh'
      ? '交接 — 世界的形状原声'
      : 'Handoff — Shape of the World Original Soundtrack'
    return {
      meta: seoMeta(locale, title, '/handoff'),
      links: [{ rel: 'canonical', href: `${SITE}/handoff` }],
    }
  },
})

const routeTree = rootRoute.addChildren([indexRoute, soundsRoute, ambienceRoute, gamesRoute, rightsRoute, packsRoute, shortsRoute, albumRoute, trackRoute, handoffRoute])

export const router = createRouter({
  routeTree,
  defaultPreload: false,
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
