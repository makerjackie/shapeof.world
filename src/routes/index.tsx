import { createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { HomeDiscovery } from '~/components/HomeDiscovery'
import { heroPoster, heroWorldId } from '~/lib/home-hero'
import { languageDiscoveryLinks, localeFromRouteMatches } from '~/i18n/seo'
import { homeStructuredData, jsonLdScript } from '~/lib/structured-data'

const getHomeBootstrap = createServerFn({ method: 'GET' }).handler(async () => {
  const { loadHomeBootstrap } = await import('~/data/world-artifacts.server')
  return loadHomeBootstrap()
})

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): { issue?: string; q?: string; viewed?: 'all' | 'unviewed' | 'viewed' } => ({
    ...(['all', 'unviewed', 'viewed'].includes(String(search.viewed)) ? { viewed: search.viewed as 'all' | 'unviewed' | 'viewed' } : {}),
    ...(typeof search.issue === 'string' ? { issue: search.issue } : {}),
    ...(typeof search.q === 'string' && search.q.trim() ? { q: search.q } : {}),
  }),
  loader: async ({ context }) => {
    const bootstrap = await getHomeBootstrap()
    if (!bootstrap) throw notFound()
    return { bootstrap, locale: context.locale }
  },
  head: ({ loaderData, matches }) => {
    const locale = loaderData?.locale ?? localeFromRouteMatches(matches)
    return {
      links: [
        ...languageDiscoveryLinks('https://shapeof.world/', locale),
        { rel: 'preload', as: 'image', href: heroPoster(heroWorldId()), fetchPriority: 'high' },
      ],
      scripts: [jsonLdScript(homeStructuredData(locale))],
    }
  },
  component: Home,
})

function Home() {
  const { bootstrap } = Route.useLoaderData()
  return <HomeDiscovery bootstrap={bootstrap} />
}
