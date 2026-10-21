import { readBoundedBody, type BodyReadResult } from '~/lib/bounded-body'
import {
  type AnalyticsPayload,
  validateAnalyticsPayload,
} from '~/lib/analytics'

function requestCountry(request: Request): string {
  const rawCountry = request.cf?.country
  if (typeof rawCountry !== 'string') return ''
  const country = rawCountry.toUpperCase()
  return country && /^[A-Z0-9]{2}$/.test(country) ? country : ''
}

function requestDevice(request: Request): 'mobile' | 'tablet' | 'desktop' | 'unknown' {
  const mobileHint = request.headers.get('sec-ch-ua-mobile')
  if (mobileHint === '?1') return 'mobile'
  const userAgent = request.headers.get('user-agent') ?? ''
  if (!userAgent) return 'unknown'
  if (/iPad|Tablet|Silk|Android(?!.*Mobile)/i.test(userAgent)) return 'tablet'
  if (/Mobile|iPhone|iPod|Android/i.test(userAgent)) return 'mobile'
  return 'desktop'
}

function requestBrowser(request: Request): 'edge' | 'chrome' | 'safari' | 'firefox' | 'samsung' | 'bot' | 'other' {
  const userAgent = request.headers.get('user-agent') ?? ''
  if (/bot|crawler|spider|headless/i.test(userAgent)) return 'bot'
  if (/Edg(?:A|iOS)?\//i.test(userAgent)) return 'edge'
  if (/SamsungBrowser\//i.test(userAgent)) return 'samsung'
  if (/Firefox\/|FxiOS\//i.test(userAgent)) return 'firefox'
  if (/Chrome\/|CriOS\//i.test(userAgent)) return 'chrome'
  if (/Safari\//i.test(userAgent)) return 'safari'
  return 'other'
}

function analyticsDataPoint(payload: AnalyticsPayload, request: Request, release: string): AnalyticsEngineDataPoint {
  const valueType = payload.value === undefined ? '' : typeof payload.value
  const value = payload.value === undefined ? '' : String(payload.value)

  // Ordered columns: event, anonymous id, session id, editorial day, locale,
  // referrer host, path, world id, issue id, value, value type, occurred at,
  // campaign source/name/content, request country, low-cardinality device and
  // browser families, receiving release, and metric id. double4 is the event
  // timestamp in milliseconds for latest-value metric deduplication.
  // The raw User-Agent is never stored.
  return {
    indexes: [payload.anonymousId],
    blobs: [
      payload.event,
      payload.anonymousId,
      payload.sessionId,
      payload.editorialDay,
      payload.locale,
      payload.referrerHost,
      payload.path,
      payload.worldId ?? '',
      payload.issueId ?? '',
      value,
      valueType,
      payload.occurredAt,
      payload.campaignSource ?? '',
      payload.campaignName ?? '',
      payload.campaignContent ?? '',
      requestCountry(request),
      requestDevice(request),
      requestBrowser(request),
      release.slice(0, 80),
      payload.metricId ?? '',
    ],
    doubles: [
      payload.schemaVersion,
      typeof payload.value === 'number' ? payload.value : 0,
      typeof payload.value === 'boolean' ? Number(payload.value) : 0,
      Date.parse(payload.occurredAt),
    ],
  }
}

function logFallback(payload: AnalyticsPayload, reason: 'binding_unavailable' | 'binding_write_failed'): void {
  console.warn(JSON.stringify({
    type: 'oneworld_event_fallback',
    reason,
    ...payload,
  }))
}

export async function handleEventPost(
  request: Request,
  analytics: Pick<AnalyticsEngineDataset, 'writeDataPoint'> | undefined = undefined,
  rateLimiter: Pick<RateLimit, 'limit'> | undefined = undefined,
  release = '',
): Promise<Response> {
  if (new URL(request.url).hostname !== 'shapeof.world' || requestBrowser(request) === 'bot') {
    return new Response(null, { status: 204 })
  }
  // Browsers always send `Origin` on a cross-site POST or `sendBeacon`, so a
  // mismatching value means third-party ingestion. Same-origin `fetch` may
  // legitimately omit the header, so an absent one is still accepted.
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: 'origin' }, { status: 403, headers: { 'cache-control': 'no-store' } })
  }
  const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase()
  if (contentType !== 'application/json') {
    return Response.json({ error: 'Content-Type must be application/json' }, { status: 415 })
  }

  let body: BodyReadResult
  try {
    body = await readBoundedBody(request)
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!body.ok) return Response.json({ error: body.error }, { status: body.status })

  let input: unknown
  try {
    input = JSON.parse(body.value)
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const validated = validateAnalyticsPayload(input)
  if (!validated.ok) {
    return Response.json({ error: validated.error }, { status: 400 })
  }

  if (rateLimiter) {
    // The client mints its own `anonymousId`, so keying on it alone let a caller
    // rotate ids to bypass the limit. Bind the bucket to the connecting client
    // (never stored, matching `/api/feedback`) and keep the
    // anonymous id only as a fallback for environments without the header.
    const clientKey = request.headers.get('cf-connecting-ip') ?? `anonymous:${validated.value.anonymousId}`
    let success = false
    try {
      ({ success } = await rateLimiter.limit({ key: `event:${clientKey}` }))
    } catch {
      return Response.json(
        { error: 'Analytics ingestion is temporarily unavailable' },
        { status: 503, headers: { 'retry-after': '60' } },
      )
    }
    if (!success) {
      return Response.json(
        { error: 'Too many analytics events' },
        { status: 429, headers: { 'retry-after': '60' } },
      )
    }
  }

  if (!analytics) {
    logFallback(validated.value, 'binding_unavailable')
  } else {
    try {
      analytics.writeDataPoint(analyticsDataPoint(validated.value, request, release))
    } catch {
      logFallback(validated.value, 'binding_write_failed')
    }
  }

  return new Response(null, { status: 204 })
}
