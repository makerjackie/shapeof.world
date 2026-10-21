const PRIMARY_ORIGIN = 'https://shapeof.world'
const LEGACY_ORIGIN = 'https://v1.shapeof.world'

const textualTypes = [
  'application/javascript',
  'application/json',
  'application/ld+json',
  'application/manifest+json',
  'application/xml',
  'text/',
]

const originReplacements = [
  [PRIMARY_ORIGIN, LEGACY_ORIGIN],
  ['//shapeof.world', '//v1.shapeof.world'],
]
const longestOriginPattern = Math.max(...originReplacements.map(([pattern]) => pattern.length))

function rewritePrimaryOrigin(value) {
  return originReplacements.reduce(
    (result, [pattern, replacement]) => result.replaceAll(pattern, replacement),
    value,
  )
}

function createOriginRewriteStream() {
  let pending = ''

  return new TransformStream({
    transform(chunk, controller) {
      pending += chunk
      const safeStartLimit = pending.length - longestOriginPattern + 1
      if (safeStartLimit <= 0) return

      let cursor = 0
      let output = ''
      while (cursor < safeStartLimit) {
        let match
        for (const [pattern, replacement] of originReplacements) {
          const index = pending.indexOf(pattern, cursor)
          if (index !== -1 && (!match || index < match.index)) {
            match = { index, pattern, replacement }
          }
        }

        if (!match || match.index >= safeStartLimit) {
          output += pending.slice(cursor, safeStartLimit)
          cursor = safeStartLimit
          break
        }

        output += pending.slice(cursor, match.index) + match.replacement
        cursor = match.index + match.pattern.length
      }

      pending = pending.slice(cursor)
      if (output) controller.enqueue(output)
    },
    flush(controller) {
      if (pending) controller.enqueue(rewritePrimaryOrigin(pending))
    },
  })
}

function rewriteTextBody(body) {
  return body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(createOriginRewriteStream())
    .pipeThrough(new TextEncoderStream())
}

function isTextualResponse(response) {
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  return textualTypes.some((type) => contentType.includes(type))
}

export async function proxyLegacyRequest(request, legacySite) {
  const upstreamUrl = new URL(request.url)
  upstreamUrl.protocol = 'https:'
  upstreamUrl.hostname = 'shapeof.world'
  upstreamUrl.port = ''

  const upstreamHeaders = new Headers(request.headers)
  upstreamHeaders.set('host', 'shapeof.world')
  upstreamHeaders.set('x-forwarded-host', 'shapeof.world')
  upstreamHeaders.set('x-forwarded-proto', 'https')

  const methodHasBody = request.method !== 'GET' && request.method !== 'HEAD'
  const upstreamRequest = new Request(upstreamUrl, {
    method: request.method,
    headers: upstreamHeaders,
    body: methodHasBody ? request.body : undefined,
    redirect: 'manual',
  })

  const upstreamResponse = await legacySite.fetch(upstreamRequest)
  const headers = new Headers(upstreamResponse.headers)
  const location = headers.get('location')

  if (location) {
    headers.set('location', rewritePrimaryOrigin(new URL(location, upstreamUrl).toString()))
  }

  if (request.method !== 'HEAD' && upstreamResponse.body && isTextualResponse(upstreamResponse)) {
    headers.delete('content-encoding')
    headers.delete('content-length')
    headers.delete('etag')
    return new Response(rewriteTextBody(upstreamResponse.body), {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers,
    })
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers,
  })
}

export default {
  fetch(request, env) {
    return proxyLegacyRequest(request, env.LEGACY_SITE)
  },
}
