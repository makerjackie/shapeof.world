import { env } from 'cloudflare:workers'
import { createFileRoute } from '@tanstack/react-router'

import { worldArtifactManifest } from '~/data/world-artifacts'
import { healthResponse } from './-health-handler'

export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: () => healthResponse(env.CF_VERSION_METADATA, worldArtifactManifest.total),
    },
  },
})
