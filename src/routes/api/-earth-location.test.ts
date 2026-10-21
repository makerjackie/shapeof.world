import { describe, expect, it } from 'vitest'

import { handleEarthLocationGet } from './-earth-location-handler'

function requestWithCf(cf?: Record<string, unknown>): Request {
  const request = new Request('https://shapeof.world/api/earth-location')
  if (cf) Object.defineProperty(request, 'cf', { value: cf })
  return request
}

describe('earth location API', () => {
  it('returns only whole-degree coordinates and a validated time zone without caching', async () => {
    const response = handleEarthLocationGet(requestWithCf({
      latitude: '37.7749', longitude: '-122.4194', timezone: 'America/Los_Angeles', city: 'San Francisco',
    }))
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(await response.json()).toEqual({
      location: { latitude: 38, longitude: -122, timeZone: 'America/Los_Angeles' },
    })
  })

  it('returns null when Cloudflare metadata is absent', async () => {
    expect(await handleEarthLocationGet(requestWithCf()).json()).toEqual({ location: null })
  })

  it.each([null, undefined, '', ' ', 'invalid', '38 degrees', '0x10', '91', '-91', Infinity, NaN, true])(
    'rejects invalid latitude %s', async (latitude) => {
      expect(await handleEarthLocationGet(requestWithCf({ latitude, longitude: '0' })).json())
        .toEqual({ location: null })
    },
  )

  it.each(['181', '-181', '', null])('rejects invalid longitude %s', async (longitude) => {
    expect(await handleEarthLocationGet(requestWithCf({ latitude: '0', longitude })).json())
      .toEqual({ location: null })
  })

  it.each(['Mars/Olympus', '+08:00', '', null])('omits an invalid time zone %s', async (timezone) => {
    expect(await handleEarthLocationGet(requestWithCf({ latitude: '0', longitude: '0', timezone })).json())
      .toEqual({ location: { latitude: 0, longitude: 0, timeZone: null } })
  })

  it('accepts geographical boundaries and numeric metadata', async () => {
    expect(await handleEarthLocationGet(requestWithCf({ latitude: -90, longitude: 180, timezone: 'UTC' })).json())
      .toEqual({ location: { latitude: -90, longitude: 180, timeZone: 'UTC' } })
  })
})
