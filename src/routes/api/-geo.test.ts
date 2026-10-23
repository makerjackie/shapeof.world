import { describe, expect, it } from 'vitest'

import { handleGeoGet } from './-geo-handler'

function request(cf?: Record<string, unknown>, headers?: Record<string, string>): Request {
  const req = new Request('https://shapeof.world/api/geo', { headers })
  if (cf) Object.defineProperty(req, 'cf', { value: cf })
  return req
}

describe('geo API', () => {
  it('returns the Cloudflare country without any shared caching', async () => {
    const response = handleGeoGet(request({ country: 'CN' }), 'production')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(await response.json()).toEqual({ country: 'CN' })
  })

  it('falls back to the CF-IPCountry header, then null', async () => {
    expect(await handleGeoGet(request(undefined, { 'cf-ipcountry': 'hk' }), 'production').json()).toEqual({ country: 'HK' })
    expect(await handleGeoGet(request(), 'production').json()).toEqual({ country: null })
    expect(await handleGeoGet(request({ country: 'T1' }), 'production').json()).toEqual({ country: null })
  })

  it('honours the dev country header only in local builds', async () => {
    const faked = request({ country: 'US' }, { 'x-dev-country': 'CN' })
    expect(await handleGeoGet(faked, 'local').json()).toEqual({ country: 'CN' })
    expect(await handleGeoGet(faked, 'production').json()).toEqual({ country: 'US' })
  })
})
