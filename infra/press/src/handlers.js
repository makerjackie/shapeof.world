// Request handlers for the press Worker, kept out of index.js because the
// Workers runtime treats every named export of the main module as an entrypoint.
export const SECURITY_HEADERS = {
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
}

export function withHeaders(response, extra = {}) {
  const res = new Response(response.body, response)
  for (const [key, value] of Object.entries({ ...SECURITY_HEADERS, ...extra })) res.headers.set(key, value)
  return res
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...SECURITY_HEADERS },
  })
}

// Writes must come from the page itself.
export function sameOrigin(request) {
  return request.headers.get('Origin') === new URL(request.url).origin
}

// Title, description and cover picks per kit, one KV record.
export const PICKS_KEY = 'press-picks:v1'
const PICK_FIELDS = new Set(['title', 'description', 'cover'])

export async function handlePicks(request, env) {
  const read = async () => {
    const value = await env.PRESS_PICKS.get(PICKS_KEY)
    return value ? JSON.parse(value) : { kits: {}, updatedAt: null }
  }
  if (request.method === 'GET') return json(await read())
  if (request.method !== 'PUT') return json({ error: 'method not allowed' }, 405)
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403)
  const text = await request.text()
  if (text.length > 2000) return json({ error: 'too large' }, 413)
  let body
  try {
    body = JSON.parse(text)
  } catch {
    return json({ error: 'bad json' }, 400)
  }
  const { kit, field, value } = body || {}
  if (typeof kit !== 'string' || !/^\d{4}-\d{2}-\d{2}-[a-z0-9-]{1,60}$/.test(kit)) return json({ error: 'bad kit' }, 400)
  if (!PICK_FIELDS.has(field)) return json({ error: 'bad field' }, 400)
  if (typeof value !== 'string' || !/^[a-z0-9-]{1,40}$/.test(value)) return json({ error: 'bad value' }, 400)
  const record = await read()
  const now = new Date().toISOString()
  record.kits[kit] = { ...(record.kits[kit] || {}), [field]: value, updatedAt: now }
  record.updatedAt = now
  await env.PRESS_PICKS.put(PICKS_KEY, JSON.stringify(record))
  return json(record)
}

// One byte range: "a-b", "a-" or "-n" as an R2 range; anything else is the
// whole file (null). An inverted range comes back as { invalid: true }.
export function parseRange(header) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header || '')
  if (!m || (m[1] === '' && m[2] === '')) return null
  if (m[1] === '') return { suffix: Number(m[2]) }
  if (m[2] === '') return { offset: Number(m[1]) }
  const length = Number(m[2]) - Number(m[1]) + 1
  return length > 0 ? { offset: Number(m[1]), length } : { invalid: true }
}

// Upload files from the PRESS_MEDIA bucket, with byte ranges so the player can
// seek. ?download=<file name> turns the response into a download.
export async function handleMedia(request, env, url) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('method not allowed', { status: 405, headers: SECURITY_HEADERS })
  const key = decodeURIComponent(url.pathname.slice('/media/'.length))
  if (!/^[A-Za-z0-9][A-Za-z0-9/._-]{0,200}$/.test(key) || key.includes('..')) return new Response('not found', { status: 404, headers: SECURITY_HEADERS })
  const want = parseRange(request.headers.get('Range'))
  if (want?.invalid) return new Response(null, { status: 416, headers: SECURITY_HEADERS })
  let object
  try {
    object = await env.PRESS_MEDIA.get(key, { ...(want ? { range: want } : {}), onlyIf: request.headers })
  } catch {
    return new Response(null, { status: 416, headers: SECURITY_HEADERS }) // range outside the file
  }
  if (object === null) return new Response('not found', { status: 404, headers: SECURITY_HEADERS })
  const headers = new Headers(SECURITY_HEADERS)
  object.writeHttpMetadata(headers)
  headers.set('ETag', object.httpEtag)
  headers.set('Accept-Ranges', 'bytes')
  headers.set('Cache-Control', 'public, max-age=3600')
  const name = (url.searchParams.get('download') || '').replace(/[\\/\r\n"]/g, '')
  if (name) headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(name)}`)
  // A failed precondition comes back without a body.
  if (!object.body) {
    const cached = request.headers.has('If-None-Match') || request.headers.has('If-Modified-Since')
    return new Response(null, { status: cached ? 304 : 412, headers })
  }
  let status = 200
  if (want) {
    const size = object.size
    const offset = 'suffix' in want ? Math.max(0, size - want.suffix) : want.offset
    const length = 'suffix' in want ? size - offset : Math.min(want.length ?? size - offset, size - offset)
    headers.set('Content-Range', `bytes ${offset}-${offset + length - 1}/${size}`)
    headers.set('Content-Length', String(length))
    status = 206
  } else {
    headers.set('Content-Length', String(object.size))
  }
  return new Response(request.method === 'HEAD' ? null : object.body, { status, headers })
}
