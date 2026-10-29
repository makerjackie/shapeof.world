// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { handleWorldAsset } from './world-assets'

function bucketWith(object: Partial<R2ObjectBody> | null) {
  return { get: vi.fn().mockResolvedValue(object) }
}
const stored = {
  size: 4, httpEtag: '"car"', body: new Response('glb!').body!,
  writeHttpMetadata: (headers: Headers) => headers.set('content-type', 'model/gltf-binary'),
}

describe('world assets from R2', () => {
  it('serves files under a listed versioned prefix with long-lived caching', async () => {
    const bucket = bucketWith(stored)
    const result = await handleWorldAsset(new Request('https://shapeof.world/assets/car-teardown/v2/car.glb'), bucket)
    expect(bucket.get.mock.calls[0][0]).toBe('car-teardown/v2/car.glb')
    expect(result.status).toBe(200)
    expect(result.headers.get('content-type')).toBe('model/gltf-binary')
    expect(result.headers.get('cache-control')).toContain('immutable')
    expect(await result.text()).toBe('glb!')
  })
  it.each(['/assets/car-teardown/v1/car.glb', '/assets/human-atlas/v2/a.json', '/assets/car-teardown/v2/../secret', '/assets/posters/x.png'])(
    'rejects paths outside the listed prefixes: %s', async path => {
      const bucket = bucketWith(stored)
      expect((await handleWorldAsset(new Request(`https://shapeof.world${path}`), bucket)).status).toBe(404)
      expect(bucket.get).not.toHaveBeenCalled()
    },
  )
  it('answers 304 when the precondition fails and 404 for missing keys', async () => {
    const { body: _body, ...metadataOnly } = stored
    expect((await handleWorldAsset(new Request('https://shapeof.world/assets/car-teardown/v2/car.glb'), bucketWith(metadataOnly))).status).toBe(304)
    expect((await handleWorldAsset(new Request('https://shapeof.world/assets/car-teardown/v2/none.glb'), bucketWith(null))).status).toBe(404)
  })
  it('refuses writes', async () => {
    expect((await handleWorldAsset(new Request('https://shapeof.world/assets/car-teardown/v2/car.glb', { method: 'PUT' }), bucketWith(stored))).status).toBe(405)
  })
})
