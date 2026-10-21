export type ApproximateEarthLocation = {
  latitude: number
  longitude: number
  timeZone: string | null
}

export async function getApproximateEarthLocation(signal: AbortSignal): Promise<ApproximateEarthLocation | null> {
  const response = await fetch('/api/earth-location', { signal, cache: 'no-store' })
  if (!response.ok) return null
  const payload = await response.json() as { location?: ApproximateEarthLocation | null }
  return payload.location ?? null
}
