import { createFileRoute } from '@tanstack/react-router'

import { handleEarthLocationGet } from './-earth-location-handler'

export const Route = createFileRoute('/api/earth-location')({
  server: {
    handlers: {
      GET: ({ request }) => handleEarthLocationGet(request),
    },
  },
})
