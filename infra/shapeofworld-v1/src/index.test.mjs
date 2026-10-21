import assert from 'node:assert/strict'
import test from 'node:test'

import { proxyLegacyRequest } from './index.js'

test('requests the legacy Worker with its original host and rewrites absolute links', async () => {
  let upstreamUrl = ''
  let upstreamHost = ''
  let upstreamForwardedHost = ''
  const legacySite = {
    fetch(request) {
      upstreamUrl = request.url
      upstreamHost = request.headers.get('host') ?? ''
      upstreamForwardedHost = request.headers.get('x-forwarded-host') ?? ''
      return new Response(
        '<a href="https://shapeof.world/history/gdp-race">GDP Race</a>',
        { headers: { 'content-type': 'text/html; charset=utf-8', etag: 'stale-after-rewrite' } },
      )
    },
  }

  const response = await proxyLegacyRequest(
    new Request('https://v1.shapeof.world/history/gdp-race?year=2008'),
    legacySite,
  )

  assert.equal(upstreamUrl, 'https://shapeof.world/history/gdp-race?year=2008')
  assert.equal(upstreamHost, 'shapeof.world')
  assert.equal(upstreamForwardedHost, 'shapeof.world')
  assert.equal(
    await response.text(),
    '<a href="https://v1.shapeof.world/history/gdp-race">GDP Race</a>',
  )
  assert.equal(response.headers.get('etag'), null)
})

test('keeps redirects on the legacy hostname', async () => {
  const legacySite = {
    fetch() {
      return Response.redirect('https://shapeof.world/history/gdp-race', 301)
    },
  }

  const response = await proxyLegacyRequest(new Request('https://v1.shapeof.world/'), legacySite)

  assert.equal(response.status, 301)
  assert.equal(response.headers.get('location'), 'https://v1.shapeof.world/history/gdp-race')
})

test('passes binary responses through without rewriting them', async () => {
  const bytes = new Uint8Array([0, 1, 2, 3])
  const legacySite = {
    fetch() {
      return new Response(bytes, { headers: { 'content-type': 'application/octet-stream' } })
    },
  }

  const response = await proxyLegacyRequest(new Request('https://v1.shapeof.world/logo.bin'), legacySite)

  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes)
})

test('rewrites text across stream chunk boundaries without buffering the response', async () => {
  const encoder = new TextEncoder()
  const legacySite = {
    fetch() {
      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('<a href="https://shape'))
          controller.enqueue(encoder.encode('of.world/about">About</a>'))
          controller.close()
        },
      })
      return new Response(body, { headers: { 'content-type': 'text/html; charset=utf-8' } })
    },
  }

  const response = await proxyLegacyRequest(new Request('https://v1.shapeof.world/'), legacySite)

  assert.equal(await response.text(), '<a href="https://v1.shapeof.world/about">About</a>')
})
