import { describe, expect, it } from 'vitest'
import { webBuild } from '~/lib/web-build'
import { healthResponse } from './-health-handler'

describe('release health endpoint', () => {
  it('returns the tag required by deployment verification and uncached metadata', async () => {
    const version = { id: 'deployment-id', tag: 'git-123456789abc', timestamp: '2026-09-15T00:00:00Z' }
    const response = healthResponse(version, 197)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ status: 'ok', version, worldCount: 197, release: webBuild })
  })
  it('supports local runtimes without version metadata', async () => {
    expect(await healthResponse(undefined, 197).json()).toEqual({ status: 'ok', worldCount: 197, release: webBuild })
  })
})
