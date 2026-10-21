import { createFileRoute } from '@tanstack/react-router'

type UsgsFeature = {
  id: string
  geometry?: { coordinates?: Array<number> }
  properties?: {
    mag?: number | null
    place?: string | null
    time?: number | null
    url?: string | null
  }
}

type UsgsFeed = {
  features?: Array<UsgsFeature>
  metadata?: { generated?: number; count?: number }
}

export const Route = createFileRoute('/api/live-earth')({
  server: {
    handlers: {
      GET: async () => {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 8_000)
        try {
          const response = await fetch(
            'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson',
            {
              headers: { accept: 'application/geo+json, application/json' },
              signal: controller.signal,
            },
          )
          if (!response.ok) throw new Error(`USGS responded ${response.status}`)

          const feed = (await response.json()) as UsgsFeed
          const events = (feed.features ?? [])
            .slice(0, 80)
            .map((feature) => {
              const coordinates = feature.geometry?.coordinates ?? []
              return {
                id: feature.id,
                longitude: Number(coordinates[0] ?? 0),
                latitude: Number(coordinates[1] ?? 0),
                depth: Number(coordinates[2] ?? 0),
                magnitude: Number(feature.properties?.mag ?? 0),
                place: feature.properties?.place ?? 'Unknown region',
                time: Number(feature.properties?.time ?? 0),
                url: feature.properties?.url ?? 'https://earthquake.usgs.gov/',
              }
            })
            .filter(
              (event) =>
                Number.isFinite(event.longitude) &&
                Number.isFinite(event.latitude) &&
                event.magnitude >= 2.5,
            )

          return Response.json(
            {
              generatedAt: feed.metadata?.generated ?? Date.now(),
              events,
              source: 'USGS Earthquake Hazards Program',
            },
            {
              headers: {
                // Match the sibling data proxies (`epic`, `satellites`,
                // `tree-of-life`): without `s-maxage` every cold visitor pays a
                // round trip to USGS instead of being served from the edge.
                'cache-control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=900',
              },
            },
          )
        } catch (error) {
          console.error(JSON.stringify({
            type: 'live_earth_error',
            message: error instanceof Error ? error.message : 'Unknown USGS error',
          }))
          return Response.json(
            { generatedAt: Date.now(), events: [], source: 'USGS unavailable' },
            { status: 502 },
          )
        } finally {
          clearTimeout(timeout)
        }
      },
    },
  },
})
