import redirects from '../data/redirects.compiled.json' with { type: 'json' }

export function redirectRequest(request) {
  const incoming = new URL(request.url)
  const rule = redirects.find((candidate) => candidate.source === incoming.hostname.toLowerCase())

  if (!rule) return new Response('Not found', { status: 404 })

  const destination = new URL(rule.destination)
  destination.pathname = incoming.pathname
  destination.search = incoming.search

  return Response.redirect(destination, rule.status)
}

export default {
  fetch(request) {
    return redirectRequest(request)
  },
}
