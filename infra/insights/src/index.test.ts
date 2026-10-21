import { describe, expect, it, vi } from 'vitest'

import { createSessionToken, sessionCookieName } from './auth'
import { handleInsightsRequest } from './index'

function testEnv() {
  return {
    ANALYTICS_DATASET: 'oneworld_events',
    ASSETS: {
      fetch: vi.fn(async () => new Response('<!doctype html><title>Insights</title>', {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })),
    },
    CLOUDFLARE_ACCOUNT_ID: 'account-id',
    CLOUDFLARE_ANALYTICS_TOKEN: 'analytics-token',
    DEEPSEEK_BASE_URL: 'https://api.deepseek.com',
    DEEPSEEK_MODEL: 'deepseek-v4-flash',
    INSIGHTS_AI_RATE_LIMITER: {
      limit: vi.fn(async () => ({ success: true })),
    },
    INSIGHTS_AUTH_RATE_LIMITER: {
      limit: vi.fn(async () => ({ success: true })),
    },
    INSIGHTS_CHAT_RATE_LIMITER: {
      limit: vi.fn(async () => ({ success: true })),
    },
    INSIGHTS_PASSWORD: 'test-password',
    INSIGHTS_SESSION_SECRET: 'test-session-secret-with-enough-entropy',
    PUBLIC_SITE_ORIGIN: 'https://shapeof.world',
  } as unknown as Parameters<typeof handleInsightsRequest>[1]
}

describe('Insights Worker routes', () => {
  it('keeps analytics data behind a valid session', async () => {
    const response = await handleInsightsRequest(
      new Request('https://insights.shapeof.world/api/data?days=7'),
      testEnv(),
    )
    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: '需要登录。' })
  })

  it('rejects cross-origin login requests before checking the password', async () => {
    const env = testEnv()
    const response = await handleInsightsRequest(
      new Request('https://insights.shapeof.world/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://example.com' },
        body: JSON.stringify({ password: 'test-password' }),
      }),
      env,
    )
    expect(response.status).toBe(403)
    expect(env.INSIGHTS_AUTH_RATE_LIMITER.limit).not.toHaveBeenCalled()
  })

  it('creates an HttpOnly session only for the configured password', async () => {
    const env = testEnv()
    const request = (password: string) => new Request('https://insights.shapeof.world/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://insights.shapeof.world' },
      body: JSON.stringify({ password }),
    })

    const rejected = await handleInsightsRequest(request('wrong-password'), env)
    expect(rejected.status).toBe(401)

    const accepted = await handleInsightsRequest(request('test-password'), env)
    expect(accepted.status).toBe(200)
    expect(accepted.headers.get('set-cookie')).toContain(`${sessionCookieName}=`)
    expect(accepted.headers.get('set-cookie')).toContain('HttpOnly')
    expect(accepted.headers.get('set-cookie')).toContain('SameSite=Strict')
  })

  it('returns an empty but valid dashboard when authenticated analytics queries have no rows', async () => {
    const env = testEnv()
    const token = await createSessionToken(env.INSIGHTS_SESSION_SECRET)
    const analyticsFetch = vi.fn(async () => Response.json({ data: [] })) as unknown as typeof fetch
    const response = await handleInsightsRequest(
      new Request('https://insights.shapeof.world/api/data?days=7', {
        headers: { Cookie: `${sessionCookieName}=${token}` },
      }),
      env,
      analyticsFetch,
    )
    expect(response.status).toBe(200)
    const data = await response.json() as {
      meta: { days: number }
      worlds: unknown[]
      definitions: Record<string, string>
    }
    expect(data.meta.days).toBe(7)
    expect(data.worlds).toEqual([])
    expect(data.definitions).toMatchObject({
      visitor: expect.stringContaining('独立访客（UV）'),
      deepPlay: expect.stringContaining('30 秒'),
      returningPlayer: expect.stringContaining('两个不同自然日'),
      referrer: expect.stringContaining('直接访问'),
      lcp: expect.stringContaining('第 75 百分位'),
    })
    expect(analyticsFetch).toHaveBeenCalled()
  })

  it('adds noindex and frame protection to static assets', async () => {
    const response = await handleInsightsRequest(
      new Request('https://insights.shapeof.world/'),
      testEnv(),
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('x-robots-tag')).toContain('noindex')
    expect(response.headers.get('x-frame-options')).toBe('DENY')
    expect(response.headers.get('content-security-policy')).toContain("frame-ancestors 'none'")
  })

  it('explains that AI reports need a separately configured provider key', async () => {
    const env = testEnv()
    const token = await createSessionToken(env.INSIGHTS_SESSION_SECRET)
    const response = await handleInsightsRequest(
      new Request('https://insights.shapeof.world/api/report?days=7', {
        headers: { Cookie: `${sessionCookieName}=${token}` },
      }),
      env,
    )
    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({
      code: 'ai_not_configured',
      configured: false,
      model: 'deepseek-v4-flash',
    })
  })
})

it('protects the App report and only returns aggregated data after login', async () => {
  const env = testEnv()
  const fetcher = vi.fn(async () => Response.json({ data: [] })) as unknown as typeof fetch
  const anonymous = await handleInsightsRequest(new Request('https://insights.shapeof.world/app/'), env, fetcher)
  expect(anonymous.status).toBe(302)
  expect(fetcher).not.toHaveBeenCalled()
  const token = await createSessionToken(env.INSIGHTS_SESSION_SECRET)
  const response = await handleInsightsRequest(new Request('https://insights.shapeof.world/app/?channel=profile&days=7', { headers: { Cookie: `${sessionCookieName}=${token}` } }), env, fetcher)
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toBe('private, no-store')
  expect(await response.text()).toContain('暂无数据')
})
