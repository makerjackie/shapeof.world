import { createFileRoute } from '@tanstack/react-router'

import {
  createEpicPayload,
  EPIC_API_URL,
  EPIC_FALLBACK_PAYLOAD,
  normalizeEpicFrames,
} from '~/lib/epic'

const UPSTREAM_TIMEOUT_MS = 8_000

export const Route = createFileRoute('/api/epic')({
  server: {
    handlers: {
      GET: async () => {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)

        try {
          const response = await fetch(EPIC_API_URL, {
            headers: { accept: 'application/json' },
            signal: controller.signal,
          })
          if (!response.ok) throw new Error(`NASA EPIC responded ${response.status}`)

          const frames = normalizeEpicFrames(await response.json())
          const payload = createEpicPayload(frames)
          if (!payload) throw new Error('NASA EPIC returned no valid natural-color frames')

          return Response.json(payload, {
            headers: {
              'cache-control': 'public, max-age=900, s-maxage=1800, stale-while-revalidate=21600, stale-if-error=86400',
              'x-content-type-options': 'nosniff',
            },
          })
        } catch (error) {
          console.error(JSON.stringify({
            type: 'epic_upstream_error',
            message: error instanceof Error ? error.message : 'Unknown NASA EPIC error',
          }))

          return Response.json(EPIC_FALLBACK_PAYLOAD, {
            headers: {
              'cache-control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600',
              'warning': '110 - "NASA EPIC upstream unavailable; serving last-known metadata"',
              'x-content-type-options': 'nosniff',
              'x-oneworld-data-mode': 'fallback',
            },
          })
        } finally {
          clearTimeout(timeout)
        }
      },
    },
  },
})
