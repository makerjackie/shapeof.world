import { createFileRoute } from '@tanstack/react-router'

import { handleGeoGet } from './-geo-handler'

export const Route = createFileRoute('/api/geo')({
  server: {
    handlers: {
      GET: ({ request }) => handleGeoGet(request),
    },
  },
})
