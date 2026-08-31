/// <reference types="vite/client" />
import {
  HeadContent,
  Scripts,
  createRootRoute,
  redirect,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader, setResponseHeader } from '@tanstack/react-start/server'
import * as React from 'react'
import { ClientRuntime } from '~/components/ClientRuntime'
import { DefaultCatchBoundary } from '~/components/DefaultCatchBoundary'
import { NotFound } from '~/components/NotFound'
import { SiteSearchProvider } from '~/components/SiteSearch'
import { I18nProvider, type Locale } from '~/i18n'
import { contentSecurityPolicy } from '~/lib/security'
import { readLocaleCookie, resolveInitialLocale } from '~/lib/locale'
import { resolveLegacyEntryHref } from '~/lib/legacy-entry-paths'
import { localizedPublicUrl } from '~/lib/share-url'
import { AtlasProvider } from '~/state/atlas'
import appCss from '~/styles/app.css?url'
import shellOverridesCss from '~/styles/shell-overrides.css?url'
import { seo } from '~/utils/seo'

const getInitialLocale = createServerFn({ method: 'GET' })
  .validator((input: { explicitLocale?: Locale }) => ({
    explicitLocale: input.explicitLocale === 'zh' || input.explicitLocale === 'en'
      ? input.explicitLocale
      : undefined,
  }))
  .handler(({ data }): Locale => {
    setResponseHeader('x-content-type-options', 'nosniff')
    setResponseHeader('referrer-policy', 'strict-origin-when-cross-origin')
    setResponseHeader('permissions-policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()')
    setResponseHeader('x-frame-options', 'DENY')
    setResponseHeader('strict-transport-security', 'max-age=31536000; includeSubDomains')
    setResponseHeader(
      'content-security-policy',
      contentSecurityPolicy,
    )
    return data.explicitLocale ?? resolveInitialLocale(
      readLocaleCookie(getRequestHeader('cookie')),
      getRequestHeader('accept-language'),
    )
  })

const setDocumentCachePolicy = createServerFn({ method: 'GET' }).handler(() => {
  const cookie = getRequestHeader('cookie')
  if (cookie) {
    setResponseHeader('cache-control', 'private, no-store')
    setResponseHeader('vary', 'Cookie, Accept-Language')
    return
  }
  // First-time video visitors have no locale cookie. Caching that HTML at the
  // edge is the cheapest TTFB cut for the traffic that currently bounces.
  setResponseHeader('cache-control', 'public, s-maxage=120, stale-while-revalidate=600')
  setResponseHeader('vary', 'Accept-Language')
})

export const Route = createRootRoute({
  validateSearch: (search: Record<string, unknown>): { lang?: Locale } => (
    search.lang === 'zh' || search.lang === 'en' ? { lang: search.lang } : {}
  ),
  beforeLoad: async ({ search, location }) => {
    const searchStr = 'searchStr' in location && typeof location.searchStr === 'string'
      ? location.searchStr
      : ''
    const legacyHref = resolveLegacyEntryHref(location.pathname, searchStr)
    if (legacyHref) throw redirect({ href: legacyHref, replace: true })

    const locale = await getInitialLocale({ data: { explicitLocale: search.lang } })
    if (!location.pathname.startsWith('/api/')) {
      await setDocumentCachePolicy()
    }
    return { locale }
  },
  loader: ({ context }) => context.locale,
  head: ({ loaderData }) => {
    const locale = loaderData ?? 'en'
    const chinese = locale === 'zh'
    return ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      ...seo({
        title: chinese ? '世界的形状 — 一个可玩的知识宇宙' : 'Shape of the World — A Playable Universe of Knowledge',
        description: chinese
          ? '看见世界如何运行：改变参数，观察结果，亲手理解宇宙、生命、数学、AI 与人类世界背后的规律。'
          : 'See how the world works: change a parameter, observe the result, and explore the rules behind space, life, mathematics, AI, and engineering.',
        keywords: chinese
          ? '互动知识, 数据可视化, 3D 科学, 实时地球, 世界探索'
          : 'interactive learning, data visualization, 3D science, live Earth, world exploration',
        image: 'https://shapeof.world/assets/oneworld-og.jpg',
        imageAlt: chinese ? '世界的形状：一个可玩的知识宇宙' : 'Shape of the World: A Playable Universe of Knowledge',
        imageHeight: 630,
        imageWidth: 1200,
        locale,
        url: localizedPublicUrl('https://shapeof.world/', locale),
      }),
      { name: 'theme-color', content: '#f2ede2' },
      { httpEquiv: 'content-language', content: chinese ? 'zh-CN' : 'en' },
      { name: 'application-name', content: 'Shape of the World' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-title', content: chinese ? '世界的形状' : 'Shape of the World' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'stylesheet', href: shellOverridesCss },
      {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: '/apple-touch-icon-compass.png',
      },
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/favicon-compass.svg?v=2',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/favicon-compass-32x32.png?v=2',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        href: '/favicon-compass-16x16.png?v=2',
      },
      { rel: 'manifest', href: '/site.webmanifest' },
    ],
    })
  },
  errorComponent: DefaultCatchBoundary,
  notFoundComponent: () => <NotFound />,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const initialLocale = Route.useLoaderData()
  return (
    <html lang={initialLocale === 'zh' ? 'zh-CN' : 'en'} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <I18nProvider initialLocale={initialLocale}>
          <SiteSearchProvider>
            <AtlasProvider>
              <ClientRuntime />
              {children}
            </AtlasProvider>
          </SiteSearchProvider>
        </I18nProvider>
        <Scripts />
      </body>
    </html>
  )
}
