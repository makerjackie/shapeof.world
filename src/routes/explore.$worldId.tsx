import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { worldPath } from '~/lib/world-urls'

const redirectWorld = createServerFn({ method: 'GET' })
  .validator((data: { worldId: string }) => data)
  .handler(async ({ data }) => {
    const [{ loadWorldArtifact }, { legacyWorldRedirects }, { isReservedWorldName }] = await Promise.all([
      import('~/data/world-artifacts.server'), import('~/data/legacy-redirects'), import('~/lib/world-route-names'),
    ])
    const target = Object.hasOwn(legacyWorldRedirects, data.worldId) ? legacyWorldRedirects[data.worldId] : data.worldId
    if (isReservedWorldName(target)) return null
    const artifact = await loadWorldArtifact(target)
    return artifact && artifact.state !== 'rights-blocked' ? target : null
  })

/** Compatibility entry only: unavailable worlds are real 404s, never redirects. */
export const Route = createFileRoute('/explore/$worldId')({
  beforeLoad: async ({ params, context, location }) => {
    const target = await redirectWorld({ data: { worldId: params.worldId } })
    if (!target) throw notFound()
    throw redirect({ href: `${worldPath(target, context.locale)}${location.searchStr}`, statusCode: 301, replace: true })
  },
})
