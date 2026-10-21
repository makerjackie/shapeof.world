/// <reference types="vite/client" />
import {
  HeadContent,
  Scripts,
  createRootRoute,
  redirect,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader, setCookie, setResponseHeader } from '@tanstack/react-start/server'
import * as React from 'react'
import { ClientRuntime } from '~/components/ClientRuntime'
import { DefaultCatchBoundary } from '~/components/DefaultCatchBoundary'
import { NotFound } from '~/components/NotFound'
import { SiteSearchProvider } from '~/components/SiteSearch'
import { I18nProvider, type Locale } from '~/i18n'
import { contentSecurityPolicy, contentUsage } from '~/lib/security'
import { localeCookieName, publicPathnameFromHref, readLocaleCookie, readLocaleSearch, resolveRequestLocale } from '~/lib/locale'
import { resolveLegacyEntryHref } from '~/lib/legacy-entry-paths'
import { localizedPublicUrl } from '~/lib/share-url'
import { legacyWorldRedirects } from '~/data/legacy-redirects'
import firstSeen from '~/data/generated/world-first-seen.json'
import { parseWorldPath } from '~/lib/world-urls'
import { stripLocalePrefix } from '~/lib/locale'
import { getRequest } from '@tanstack/react-start/server'
import { AtlasProvider } from '~/state/atlas'
import appCss from '~/styles/app.css?url'
import shellOverridesCss from '~/styles/shell-overrides.css?url'
import { seo } from '~/utils/seo'

const permissionsPolicy = Object.entries({
  camera: '()',
  microphone: '()',
  geolocation: '(self)',
  payment: '()',
  usb: '()',
}).map(([feature, allowlist]) => `${feature}=${allowlist}`).join(', ')

const getInitialLocale = createServerFn({ method: 'GET' })
  .validator((input: { pathname: string; search: string; hash: string }) => ({
    pathname: input.pathname,
    search: input.search,
    hash: input.hash,
  }))
  .handler(({ data }): { locale: Locale; redirectTo?: string } => {
    setResponseHeader('x-content-type-options', 'nosniff')
    setResponseHeader('referrer-policy', 'strict-origin-when-cross-origin')
    // Geolocation stays available to this origin only, because the observing
    // planner asks for it after an explicit tap (the browser still prompts).
    // Everything else sensitive is switched off, and embedded frames get none.
    setResponseHeader('permissions-policy', permissionsPolicy)
    setResponseHeader('x-frame-options', 'DENY')
    setResponseHeader('strict-transport-security', 'max-age=31536000; includeSubDomains')
    setResponseHeader(
      'content-security-policy',
      contentSecurityPolicy,
    )
    setResponseHeader('content-usage', contentUsage)

    const requestUrl = new URL(getRequest().url)
    const requestedWorld = parseWorldPath(data.pathname)
    const missingWorld = requestedWorld && !Object.hasOwn(firstSeen, requestedWorld.worldId)
    const resolved = resolveRequestLocale({
      publicPathname: data.pathname,
      requestPathname: requestUrl.pathname,
      // Compatibility URLs must reach their 301/404 handler before language-query cleanup.
      search: /^\/(?:en\/)?explore(?:\/|$)/.test(data.pathname)
        || missingWorld || Object.hasOwn(legacyWorldRedirects, stripLocalePrefix(data.pathname).slice(1)) ? '' : data.search,
      hash: data.hash,
      cookie: readLocaleCookie(getRequestHeader('cookie')),
      acceptLanguage: getRequestHeader('accept-language'),
    })
    if (resolved.redirectTo && readLocaleSearch(data.search)) {
      // Preserve an explicit language choice for requests without a page URL.
      setCookie(localeCookieName, resolved.locale, { path: '/', maxAge: 34560000, sameSite: 'lax' })
      setResponseHeader('cache-control', 'private, no-store')
    }
    return resolved
  })

const setDocumentCachePolicy = createServerFn({ method: 'GET' })
  .validator((input: { pathname: string }) => input)
  .handler(({ data }) => {
  const cookie = getRequestHeader('cookie')
  if (cookie) {
    setResponseHeader('cache-control', 'private, no-store')
    setResponseHeader('vary', 'Cookie')
    return
  }
  // First-time video visitors have no locale cookie. Caching that HTML at the
  // edge is the cheapest TTFB cut for the traffic that currently bounces.
  setResponseHeader('cache-control', 'public, s-maxage=120, stale-while-revalidate=600')
  setResponseHeader('vary', 'Cookie')
})

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    const searchStr = 'searchStr' in location && typeof location.searchStr === 'string'
      ? location.searchStr
      : ''
    const publicPathname = publicPathnameFromHref(location.publicHref, location.pathname)
    const legacyHref = resolveLegacyEntryHref(publicPathname, searchStr)
    if (legacyHref) throw redirect({ href: legacyHref, replace: true, statusCode: 301 })

    const { locale, redirectTo } = await getInitialLocale({
      data: { pathname: publicPathname, search: searchStr, hash: location.hash },
    })
    if (redirectTo) throw redirect({ href: redirectTo, replace: true })
    if (!publicPathname.startsWith('/api/')) {
      await setDocumentCachePolicy({ data: { pathname: publicPathname } })
    }
    return { locale }
  },
  loader: ({ context }) => context.locale,
  head: ({ loaderData }) => {
    const locale = loaderData ?? 'zh'
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
        title: chinese ? '世界的形状 — 看见世界如何运行' : 'Shape of the World — See how the world works',
        description: chinese
          ? '看见世界如何运行：改变参数，观察结果，亲手理解宇宙、生命、数学、AI 与人类世界背后的规律。'
          : 'See how the world works: change a parameter, observe the result, and explore the rules behind space, life, mathematics, AI, and engineering.',
        keywords: chinese
          ? '互动知识, 数据可视化, 3D 科学, 实时地球, 世界探索'
          : 'interactive learning, data visualization, 3D science, live Earth, world exploration',
        image: 'https://shapeof.world/assets/oneworld-og.jpg',
        imageAlt: chinese ? '世界的形状：看见世界如何运行' : 'Shape of the World: See how the world works',
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
        href: '/apple-touch-icon.png?v=6',
      },
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/favicon.svg?v=6',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/favicon-32x32.png?v=6',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        href: '/favicon-16x16.png?v=6',
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
