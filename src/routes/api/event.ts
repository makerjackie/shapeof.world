import { env } from 'cloudflare:workers'
import { createFileRoute } from '@tanstack/react-router'

import { handleEventPost } from './-event-handler'

export { handleEventPost } from './-event-handler'

export const Route = createFileRoute('/api/event')({
  server: {
    handlers: {
      POST: ({ request }) => handleEventPost(
        request,
        env.OW_ANALYTICS,
        env.EVENT_RATE_LIMITER,
        env.CF_VERSION_METADATA?.id,
      ),
    },
  },
})
