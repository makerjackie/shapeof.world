export type EarthLocation = {
  latitude: number
  longitude: number
  timeZone: string | null
}

function coarseCoordinate(value: unknown, limit: number): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  if (typeof value === 'string' && !/^[+-]?\d+(?:\.\d+)?$/.test(value)) return null
  const coordinate = Number(value)
  if (!Number.isFinite(coordinate) || Math.abs(coordinate) > limit) return null
  return Math.round(coordinate) || 0
}

function validTimeZone(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 100 || !/^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)*$/.test(value)) return null
  try {
    return new Intl.DateTimeFormat('en', { timeZone: value }).resolvedOptions().timeZone
  } catch {
    return null
  }
}

export function handleEarthLocationGet(request: Request): Response {
  const latitude = coarseCoordinate(request.cf?.latitude, 90)
  const longitude = coarseCoordinate(request.cf?.longitude, 180)
  const location: EarthLocation | null = latitude === null || longitude === null
    ? null
    : { latitude, longitude, timeZone: validTimeZone(request.cf?.timezone) }

  return Response.json({ location }, { headers: { 'cache-control': 'private, no-store' } })
}
