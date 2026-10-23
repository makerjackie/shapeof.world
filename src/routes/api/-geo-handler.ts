import { webBuild } from '~/lib/web-build'

function countryCode(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const country = value.toUpperCase()
  return /^[A-Z]{2}$/.test(country) ? country : null
}

/**
 * The viewer's country, for choosing a film player in the browser. Pages are
 * cached for everyone, so the answer must never be shared: private, no-store.
 * Local builds accept an x-dev-country header to fake a location.
 */
export function handleGeoGet(request: Request, channel = webBuild.channel): Response {
  const devCountry = channel === 'local' ? countryCode(request.headers.get('x-dev-country')) : null
  const country = devCountry ?? countryCode(request.cf?.country) ?? countryCode(request.headers.get('cf-ipcountry'))
  return Response.json({ country }, { headers: { 'cache-control': 'private, no-store' } })
}
