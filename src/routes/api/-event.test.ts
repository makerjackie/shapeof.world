import { describe, expect, it } from 'vitest'

import { validateAnalyticsPayload } from '~/lib/analytics'
import { handleEventPost } from './-event-handler'

const validPayload = {
  schemaVersion: 1,
  event: 'experience_complete',
  anonymousId: 'ow_anon_00000000-0000-4000-8000-000000000001',
  sessionId: 'ow_session_00000000-0000-4000-8000-000000000002',
  editorialDay: '2026-07-11',
  locale: 'zh',
  referrerHost: 'shapeof.world',
  path: '/explore/living-earth',
  worldId: 'living-earth',
  issueId: 'earth-never-rests',
  value: true,
  occurredAt: '2026-07-11T12:00:00.000Z',
} as const

describe('event API validation', () => {
  it('accepts a bounded allowlisted event with the complete anonymous context', () => {
    expect(validateAnalyticsPayload(validPayload)).toEqual({ ok: true, value: validPayload })
    expect(validateAnalyticsPayload({
      ...validPayload,
      event: 'guide_complete',
      value: 'step_5_of_5',
    })).toMatchObject({ ok: true })
    expect(validateAnalyticsPayload({
      ...validPayload,
      event: 'follow_prompt_shown',
      value: 'share_card',
    })).toMatchObject({ ok: true })
    expect(validateAnalyticsPayload({
      ...validPayload,
      event: 'follow_prompt_click',
      value: 'wechat',
    })).toMatchObject({ ok: true })
    expect(validateAnalyticsPayload({
      ...validPayload,
      path: '/not-found',
    })).toMatchObject({ ok: true })
    expect(validateAnalyticsPayload({
      ...validPayload,
      path: '/legacy',
    })).toMatchObject({ ok: true })
    expect(validateAnalyticsPayload({
      ...validPayload,
      event: 'page_engaged',
      value: '30s',
      campaignSource: 'xhs',
      campaignName: 'phantom-jam-2026w31',
      campaignContent: 'hook-a',
    })).toMatchObject({ ok: true })
    expect(validateAnalyticsPayload({
      ...validPayload,
      event: 'experience_duration',
      value: 42.375,
    })).toMatchObject({ ok: true })
  })

  it('rejects unknown fields, non-allowlisted events and unsafe paths', () => {
    expect(validateAnalyticsPayload({ ...validPayload, path: '/about?email=private@example.com' })).toMatchObject({ ok: false })
    expect(validateAnalyticsPayload({ ...validPayload, email: 'private@example.com' })).toMatchObject({ ok: false })
    expect(validateAnalyticsPayload({ ...validPayload, event: 'arbitrary_event' })).toMatchObject({ ok: false })
    expect(validateAnalyticsPayload({ ...validPayload, path: '/w/living-earth?email=private' })).toMatchObject({ ok: false })
    expect(validateAnalyticsPayload({ ...validPayload, worldId: 'x'.repeat(81) })).toMatchObject({ ok: false })
    expect(validateAnalyticsPayload({ ...validPayload, referrerHost: '192.0.2.1' })).toMatchObject({ ok: false })
    expect(validateAnalyticsPayload({ ...validPayload, value: 'private@example.com' })).toMatchObject({ ok: false })
    expect(validateAnalyticsPayload({ ...validPayload, campaignSource: 'xhs/private' })).toMatchObject({ ok: false })
    expect(validateAnalyticsPayload({ ...validPayload, event: 'experience_duration', value: '42s' })).toMatchObject({ ok: false })
    expect(validateAnalyticsPayload({ ...validPayload, event: 'experience_duration', value: 0.1 })).toMatchObject({ ok: false })
    expect(validateAnalyticsPayload({ ...validPayload, event: 'experience_duration', value: 1_801 })).toMatchObject({ ok: false })
  })

  it('requires all retention context and validates dates and values', () => {
    const { anonymousId: _, ...missingIdentity } = validPayload
    expect(validateAnalyticsPayload(missingIdentity)).toMatchObject({ ok: false })
    expect(validateAnalyticsPayload({ ...validPayload, editorialDay: '2026-02-30' })).toMatchObject({ ok: false })
    expect(validateAnalyticsPayload({ ...validPayload, value: Number.POSITIVE_INFINITY })).toMatchObject({ ok: false })
    expect(validateAnalyticsPayload({ ...validPayload, value: 'x'.repeat(41) })).toMatchObject({ ok: false })
  })

  it('rejects an anonymous client that exceeds the ingestion limit', async () => {
    const rateLimiter = {
      limit: async () => ({ success: false }),
    } satisfies Pick<RateLimit, 'limit'>
    const response = await handleEventPost(
      new Request('https://shapeof.world/api/event', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(validPayload),
      }),
      { writeDataPoint: () => undefined },
      rateLimiter,
    )

    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('60')
  })

  it('fails closed when the rate-limit binding is unavailable', async () => {
    const response = await handleEventPost(
      new Request('https://shapeof.world/api/event', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(validPayload),
      }),
      { writeDataPoint: () => undefined },
      { limit: async () => { throw new Error('binding unavailable') } },
    )

    expect(response.status).toBe(503)
    expect(response.headers.get('retry-after')).toBe('60')
  })

  it('rejects cross-site ingestion instead of trusting the browser-supplied id', async () => {
    let writes = 0
    const response = await handleEventPost(
      new Request('https://shapeof.world/api/event', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
        body: JSON.stringify(validPayload),
      }),
      { writeDataPoint: () => { writes += 1 } },
      { limit: async () => ({ success: true }) },
    )

    expect(response.status).toBe(403)
    expect(writes).toBe(0)
  })

  it('accepts a same-origin submission and one without an Origin header', async () => {
    const cases: Array<Record<string, string>> = [
      { 'content-type': 'application/json', origin: 'https://shapeof.world' },
      { 'content-type': 'application/json' },
    ]
    for (const headers of cases) {
      const response = await handleEventPost(
        new Request('https://shapeof.world/api/event', { method: 'POST', headers, body: JSON.stringify(validPayload) }),
        { writeDataPoint: () => undefined },
        { limit: async () => ({ success: true }) },
      )
      expect(response.status).toBe(204)
    }
  })

  it('binds the ingestion bucket to the connecting client, not the client-chosen id', async () => {
    const keys: Array<string> = []
    const rateLimiter = {
      limit: async ({ key }: { key: string }) => {
        keys.push(key)
        return { success: true }
      },
    } satisfies Pick<RateLimit, 'limit'>

    for (const anonymousId of [
      validPayload.anonymousId,
      'ow_anon_00000000-0000-4000-8000-000000000009',
    ]) {
      await handleEventPost(
        new Request('https://shapeof.world/api/event', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.7' },
          body: JSON.stringify({ ...validPayload, anonymousId }),
        }),
        { writeDataPoint: () => undefined },
        rateLimiter,
      )
    }

    // Rotating the anonymous id must not buy a fresh bucket.
    expect(keys).toHaveLength(2)
    expect(keys[0]).toBe(keys[1])
    expect(keys[0]).toContain('203.0.113.7')
  })

  it('adds the Cloudflare request country without trusting a client field', async () => {
    let written: AnalyticsEngineDataPoint | undefined
    const request = new Request('https://shapeof.world/api/event', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validPayload),
    })
    Object.defineProperty(request, 'cf', { value: { country: 'cn' } })

    const response = await handleEventPost(
      request,
      { writeDataPoint: (point) => { written = point } },
      { limit: async () => ({ success: true }) },
    )

    expect(response.status).toBe(204)
    expect(written?.blobs?.[15]).toBe('CN')
  })

  it('stores only low-cardinality device and browser families', async () => {
    let written: AnalyticsEngineDataPoint | undefined
    const request = new Request('https://shapeof.world/api/event', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'sec-ch-ua-mobile': '?1',
        'user-agent': 'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
      },
      body: JSON.stringify(validPayload),
    })

    const response = await handleEventPost(
      request,
      { writeDataPoint: (point) => { written = point } },
      { limit: async () => ({ success: true }) },
    )

    expect(response.status).toBe(204)
    expect(written?.blobs?.[16]).toBe('mobile')
    expect(written?.blobs?.[17]).toBe('safari')
    expect(written?.blobs).not.toContain(request.headers.get('user-agent'))
  })
})

describe('production analytics isolation', () => {
  it('ignores bots and development hosts', async () => {
    let writes = 0
    const analytics = { writeDataPoint: () => { writes += 1 } }
    for (const [url, agent] of [['https://dev.shapeof.world/api/event', 'Chrome/150'], ['https://shapeof.world/api/event', 'HeadlessChrome/150']]) {
      const response = await handleEventPost(new Request(url, { method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': agent }, body: JSON.stringify(validPayload) }), analytics)
      expect(response.status).toBe(204)
    }
    expect(writes).toBe(0)
  })
  it('stores release and metric identity without accepting arbitrary diagnostic text', async () => {
    const payload = { ...validPayload, event: 'web_vital_lcp', value: 2000, metricId: 'v6-1234-5678' }
    let point: AnalyticsEngineDataPoint | undefined
    await handleEventPost(new Request('https://shapeof.world/api/event', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }), { writeDataPoint: (value) => { point = value } }, undefined, 'release-1')
    expect(point?.blobs?.slice(18)).toEqual(['release-1', 'v6-1234-5678'])
    expect(validateAnalyticsPayload({ ...payload, metricId: 'email@example.com' }).ok).toBe(false)
    expect(validateAnalyticsPayload({ ...payload, event: 'page_view' }).ok).toBe(false)
  })
})
