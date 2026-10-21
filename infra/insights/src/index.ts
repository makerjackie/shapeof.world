import {
  createSessionToken,
  expiredSessionCookie,
  passwordMatches,
  readCookie,
  sessionCookie,
  sessionCookieName,
  verifySessionToken,
} from './auth'
import { buildDashboardData, createAnalyticsQuery, normalizeDays } from './analytics'
import { appReportResponse } from './app-report-route'
import { runArchive } from './archive'
import { generateAiAnswer, generateAiReport, parseChatRequest } from './report'

type RuntimeEnv = Pick<
  InsightsEnv,
  | 'ANALYTICS_DATASET'
  | 'ASSETS'
  | 'CLOUDFLARE_ACCOUNT_ID'
  | 'CLOUDFLARE_ANALYTICS_TOKEN'
  | 'DEEPSEEK_BASE_URL'
  | 'DEEPSEEK_MODEL'
  | 'INSIGHTS_AI_RATE_LIMITER'
  | 'INSIGHTS_CHAT_RATE_LIMITER'
  | 'INSIGHTS_AUTH_RATE_LIMITER'
  | 'INSIGHTS_PASSWORD'
  | 'INSIGHTS_SESSION_SECRET'
  | 'PUBLIC_SITE_ORIGIN'
> & { DEEPSEEK_API_KEY?: string }

const apiHeaders = {
  'Cache-Control': 'private, no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
} as const

function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return Response.json(body, { status, headers: { ...apiHeaders, ...headers } })
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  return origin !== null && origin === new URL(request.url).origin
}

async function isAuthenticated(request: Request, env: RuntimeEnv): Promise<boolean> {
  const token = readCookie(request.headers.get('cookie'), sessionCookieName)
  return verifySessionToken(token, env.INSIGHTS_SESSION_SECRET)
}

function aiConfiguration(env: RuntimeEnv) {
  return {
    configured: Boolean(env.DEEPSEEK_API_KEY),
    model: env.DEEPSEEK_MODEL,
    provider: 'DeepSeek',
  }
}

function reportCacheKey(request: Request, days: number, dataThrough: string, model: string): Request {
  const hour = dataThrough.slice(0, 13).replace(/[^0-9]/gu, '') || 'empty'
  return new Request(`${new URL(request.url).origin}/__report-cache/${days}/${hour}/${model}`)
}

async function reportCache(): Promise<Cache | null> {
  try {
    return typeof caches === 'undefined' ? null : caches.default
  } catch {
    return null
  }
}

function withSecurityHeaders(response: Response, request: Request): Response {
  const headers = new Headers(response.headers)
  headers.set('Content-Security-Policy', [
    "default-src 'self'",
    "base-uri 'none'",
    "connect-src 'self' https://cloudflareinsights.com",
    "font-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' https://shapeof.world data:",
    "object-src 'none'",
    "script-src 'self' https://static.cloudflareinsights.com",
    "style-src 'self'",
  ].join('; '))
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()')
  headers.set('Referrer-Policy', 'no-referrer')
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-Frame-Options', 'DENY')
  headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
  if (new URL(request.url).pathname === '/' || headers.get('content-type')?.includes('text/html')) {
    headers.set('Cache-Control', 'private, no-store')
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

async function readLoginPassword(request: Request): Promise<string | null> {
  const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase()
  if (contentType !== 'application/json') return null
  const length = Number(request.headers.get('content-length') ?? 0)
  if (Number.isFinite(length) && length > 512) return null
  try {
    const body = await request.json<unknown>()
    if (!body || typeof body !== 'object' || Array.isArray(body)) return null
    const password = (body as Record<string, unknown>).password
    return typeof password === 'string' && password.length <= 128 ? password : null
  } catch {
    return null
  }
}

async function readBoundedJson(request: Request, maximumBytes: number): Promise<unknown | null> {
  const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase()
  if (contentType !== 'application/json') return null
  const declaredLength = request.headers.get('content-length')
  if (declaredLength && (!/^\d+$/u.test(declaredLength) || Number(declaredLength) > maximumBytes)) return null
  if (!request.body) return null
  const reader = request.body.getReader()
  const chunks: Array<Uint8Array> = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maximumBytes) {
        await reader.cancel()
        return null
      }
      chunks.push(value)
    }
  } catch {
    return null
  } finally {
    reader.releaseLock()
  }
  const body = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(body)) as unknown
  } catch {
    return null
  }
}

export async function handleInsightsRequest(
  request: Request,
  env: RuntimeEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const url = new URL(request.url)

  if (url.pathname === '/api/session' && request.method === 'GET') {
    const authenticated = await isAuthenticated(request, env)
    return json({ authenticated, ai: authenticated ? aiConfiguration(env) : undefined })
  }

  if (url.pathname === '/api/login' && request.method === 'POST') {
    if (!sameOrigin(request)) return json({ error: '请求来源无效。' }, 403)
    let rateLimitAllowed = false
    try {
      const result = await env.INSIGHTS_AUTH_RATE_LIMITER.limit({ key: 'shared-password-login' })
      rateLimitAllowed = result.success
    } catch {
      return json({ error: '登录服务暂时不可用，请稍后重试。' }, 503)
    }
    if (!rateLimitAllowed) return json({ error: '尝试次数过多，请稍后再试。' }, 429)

    const password = await readLoginPassword(request)
    if (!password || !(await passwordMatches(password, env.INSIGHTS_PASSWORD))) {
      return json({ error: '访问密码不正确。' }, 401)
    }
    const token = await createSessionToken(env.INSIGHTS_SESSION_SECRET)
    return json(
      { authenticated: true },
      200,
      { 'Set-Cookie': sessionCookie(token) },
    )
  }

  if (url.pathname === '/api/logout' && request.method === 'POST') {
    if (!sameOrigin(request)) return json({ error: '请求来源无效。' }, 403)
    return json(
      { authenticated: false },
      200,
      { 'Set-Cookie': expiredSessionCookie() },
    )
  }

  if (url.pathname === '/app/' && request.method === 'GET') {
    if (!(await isAuthenticated(request, env))) return Response.redirect(`${url.origin}/`, 302)
    return appReportResponse(url, env, fetchImpl)
  }

  if (url.pathname === '/api/data' && request.method === 'GET') {
    if (!(await isAuthenticated(request, env))) return json({ error: '需要登录。' }, 401)
    const days = normalizeDays(url.searchParams.get('days'))
    try {
      const query = createAnalyticsQuery(env, fetchImpl)
      const data = await buildDashboardData(query, days)
      return json({ ...data, meta: { ...data.meta, ai: aiConfiguration(env) } })
    } catch (error) {
      console.error(JSON.stringify({
        type: 'insights_data_error',
        message: error instanceof Error ? error.message.slice(0, 360) : String(error).slice(0, 360),
        days,
      }))
      return json({ error: '实时数据暂时不可用，请稍后重试。' }, 503)
    }
  }

  if (url.pathname === '/api/report' && (request.method === 'GET' || request.method === 'POST')) {
    if (!(await isAuthenticated(request, env))) return json({ error: '需要登录。' }, 401)
    if (request.method === 'POST' && !sameOrigin(request)) return json({ error: '请求来源无效。' }, 403)
    if (!env.DEEPSEEK_API_KEY) {
      return json({
        error: 'AI 分析尚未配置 DeepSeek API Key。',
        code: 'ai_not_configured',
        ...aiConfiguration(env),
      }, 503)
    }

    const days = normalizeDays(url.searchParams.get('days'))
    const forceRefresh = request.method === 'POST'
    try {
      const query = createAnalyticsQuery(env, fetchImpl)
      const data = await buildDashboardData(query, days)
      const cache = await reportCache()
      const cacheKey = reportCacheKey(request, days, data.meta.latestEventAt, env.DEEPSEEK_MODEL)
      if (!forceRefresh && cache) {
        const cached = await cache.match(cacheKey)
        if (cached) return json(await cached.json())
      }

      const rateLimit = await env.INSIGHTS_AI_RATE_LIMITER.limit({ key: `report:${days}` })
      if (!rateLimit.success) {
        return json({ error: 'AI 报告刚刚更新过，请稍后再试。', code: 'ai_rate_limited' }, 429)
      }
      const report = await generateAiReport(data, env, fetchImpl)
      if (cache) {
        await cache.put(cacheKey, Response.json(report, {
          headers: { 'Cache-Control': 'public, max-age=3600' },
        }))
      }
      return json(report)
    } catch (error) {
      console.error(JSON.stringify({
        type: 'insights_report_error',
        message: error instanceof Error ? error.message.slice(0, 360) : String(error).slice(0, 360),
        days,
      }))
      return json({ error: 'AI 分析暂时生成失败，请稍后重试。', code: 'ai_generation_failed' }, 502)
    }
  }

  if (url.pathname === '/api/chat' && request.method === 'POST') {
    if (!(await isAuthenticated(request, env))) return json({ error: '需要登录。' }, 401)
    if (!sameOrigin(request)) return json({ error: '请求来源无效。' }, 403)
    if (!env.DEEPSEEK_API_KEY) {
      return json({ error: 'AI 分析尚未配置。', code: 'ai_not_configured' }, 503)
    }
    const input = parseChatRequest(await readBoundedJson(request, 16_384))
    if (!input) return json({ error: '问题或对话内容无效。', code: 'invalid_chat_request' }, 400)

    const sessionToken = readCookie(request.headers.get('cookie'), sessionCookieName) ?? 'shared'
    try {
      const rateLimit = await env.INSIGHTS_CHAT_RATE_LIMITER.limit({ key: `chat:${sessionToken.slice(-24)}` })
      if (!rateLimit.success) {
        return json({ error: '提问有些频繁，请稍后再试。', code: 'ai_rate_limited' }, 429)
      }
      const days = normalizeDays(url.searchParams.get('days'))
      const query = createAnalyticsQuery(env, fetchImpl)
      const data = await buildDashboardData(query, days)
      return json(await generateAiAnswer(data, input.question, input.history, env, fetchImpl))
    } catch (error) {
      console.error(JSON.stringify({
        type: 'insights_chat_error',
        message: error instanceof Error ? error.message.slice(0, 360) : String(error).slice(0, 360),
      }))
      return json({ error: 'AI 暂时无法回答，请稍后重试。', code: 'ai_generation_failed' }, 502)
    }
  }

  if (url.pathname.startsWith('/api/')) return json({ error: 'Not found' }, 404)

  const assetResponse = await env.ASSETS.fetch(request)
  return withSecurityHeaders(assetResponse, request)
}

export default {
  fetch(request, env) {
    return handleInsightsRequest(request, env)
  },
  // Every 10 minutes: copy the oldest not yet archived Analytics Engine days into D1.
  async scheduled(_controller, env) {
    const { failures } = await runArchive(env)
    if (failures > 0) throw new Error(`Analytics archive run had ${failures} failure(s); see archive_*_error logs.`)
  },
} satisfies ExportedHandler<InsightsEnv>
