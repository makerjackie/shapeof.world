import { createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { HomeDiscovery } from '~/components/HomeDiscovery'
import { homeUniverseLcpImage } from '~/components/HomeUniverse'

const getHomeBootstrap = createServerFn({ method: 'GET' }).handler(async () => {
  const { loadHomeBootstrap } = await import('~/data/world-artifacts.server')
  return loadHomeBootstrap()
})

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): { issue?: string; q?: string } => ({
    ...(typeof search.issue === 'string' ? { issue: search.issue } : {}),
    ...(typeof search.q === 'string' && search.q.trim() ? { q: search.q } : {}),
  }),
  loader: async () => {
    const bootstrap = await getHomeBootstrap()
    if (!bootstrap) throw notFound()
    return bootstrap
  },
  head: () => ({
    links: [
      { rel: 'canonical', href: 'https://shapeof.world/' },
      { rel: 'preload', as: 'image', href: homeUniverseLcpImage },
    ],
  }),
  component: Home,
})

function Home() {
  const bootstrap = Route.useLoaderData()
  return <HomeDiscovery bootstrap={bootstrap} />
}
