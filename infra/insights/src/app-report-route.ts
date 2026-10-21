import { aggregate, query, renderHtml } from './app-report.mjs'

export async function appReportResponse(url: URL, env: { CLOUDFLARE_ACCOUNT_ID: string; CLOUDFLARE_ANALYTICS_TOKEN: string }, fetchImpl: typeof fetch): Promise<Response> {
  const days = Number(url.searchParams.get('days') ?? 7)
  const channel = url.searchParams.get('channel') ?? 'release'
  let sql: string
  try { sql = query(days, channel) } catch { return new Response('查询参数无效。', { status: 400 }) }
  try {
    const response = await fetchImpl(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/analytics_engine/sql`, {
      method: 'POST', headers: { Authorization: `Bearer ${env.CLOUDFLARE_ANALYTICS_TOKEN}` }, body: sql, signal: AbortSignal.timeout(30000),
    })
    if (!response.ok) throw new Error('Analytics unavailable')
    const result = await response.json<{ data?: unknown[] }>()
    if (!Array.isArray(result.data) || result.data.length >= 100001) throw new Error('Incomplete result')
    const links = `<nav><a href="/">网站统计</a> · ${['release', 'testflight', 'profile', 'debug'].map(c => `<a href="?channel=${c}&days=${days}">${c}</a>`).join(' · ')} · ${[1, 7, 30, 90].map(d => `<a href="?channel=${channel}&days=${d}">${d} 天</a>`).join(' · ')}</nav>`
    return new Response(renderHtml(aggregate(result.data, channel)).replace('<body>', `<body>${links}<p>查询范围：最近 ${days} 天</p>`), { headers: {
      'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
      'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'X-Robots-Tag': 'noindex, nofollow, noarchive',
    } })
  } catch { return new Response('App 统计暂时不可用，请稍后重试。', { status: 503, headers: { 'Cache-Control': 'private, no-store' } }) }
}
