import assert from 'node:assert/strict'
import test from 'node:test'

import { redirectRequest } from './index.js'

test('redirects the short domain and preserves path and query parameters', () => {
  const response = redirectRequest(new Request('https://world.01mvp.com/explore/cell-architecture?cell=plant'))

  assert.equal(response.status, 308)
  assert.equal(
    response.headers.get('location'),
    'https://shapeof.world/explore/cell-architecture?cell=plant',
  )
})

test('redirects the former primary domain and preserves path and query parameters', () => {
  const response = redirectRequest(new Request('https://oneworld.01mvp.com/worlds?domain=physics'))

  assert.equal(response.status, 308)
  assert.equal(response.headers.get('location'), 'https://shapeof.world/worlds?domain=physics')
})

test('does not redirect an unknown hostname', async () => {
  const response = redirectRequest(new Request('https://example.com/'))

  assert.equal(response.status, 404)
  assert.equal(await response.text(), 'Not found')
})
