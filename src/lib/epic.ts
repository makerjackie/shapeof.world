export const EPIC_API_URL = 'https://epic.gsfc.nasa.gov/api/natural'
export const EPIC_SOURCE_URL = 'https://epic.gsfc.nasa.gov/'
export const EPIC_SOURCE_LABEL = 'NASA / NOAA DSCOVR EPIC'

const EPIC_ARCHIVE_ORIGIN = 'https://epic.gsfc.nasa.gov'
const EPIC_IMAGE_PATTERN = /^epic_[A-Za-z0-9_]+$/
const EPIC_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/
const EPIC_ARCHIVE_PATTERN = /^https:\/\/epic\.gsfc\.nasa\.gov\/archive\/natural\/\d{4}\/\d{2}\/\d{2}\/jpg\/epic_[A-Za-z0-9_]+\.jpg$/
const MAX_EPIC_FRAMES = 36

type UnknownRecord = Record<string, unknown>

export type EpicFrame = {
  id: string
  capturedAt: string
  imageUrl: string
  centroid: {
    latitude: number
    longitude: number
  }
}

export type EpicPayload = {
  mode: 'live' | 'fallback'
  date: string
  frames: Array<EpicFrame>
  source: typeof EPIC_SOURCE_LABEL
  sourceUrl: typeof EPIC_SOURCE_URL
  notice?: 'upstream-unavailable'
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseEpicDate(value: unknown): { capturedAt: string; path: string } | null {
  if (typeof value !== 'string') return null
  const match = EPIC_DATE_PATTERN.exec(value)
  if (!match) return null

  const [, year, month, day, hour, minute, second] = match
  const capturedAt = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`
  const timestamp = Date.parse(capturedAt)
  if (!Number.isFinite(timestamp)) return null

  // Date.parse normalizes impossible dates such as February 30. Reject those
  // instead of silently pointing at an archive path that cannot exist.
  if (new Date(timestamp).toISOString().slice(0, 19) !== capturedAt.slice(0, 19)) return null
  return { capturedAt, path: `${year}/${month}/${day}` }
}

function isCoordinate(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum
}

export function buildEpicImageUrl(image: string, date: string): string | null {
  if (!EPIC_IMAGE_PATTERN.test(image)) return null
  const parsedDate = parseEpicDate(date)
  if (!parsedDate) return null
  return `${EPIC_ARCHIVE_ORIGIN}/archive/natural/${parsedDate.path}/jpg/${image}.jpg`
}

export function normalizeEpicFrames(payload: unknown): Array<EpicFrame> {
  if (!Array.isArray(payload)) return []

  const frames = payload.flatMap((item): Array<EpicFrame> => {
    if (!isRecord(item)) return []
    const image = item.image
    const date = item.date
    const coordinates = item.centroid_coordinates
    if (typeof image !== 'string' || typeof date !== 'string' || !isRecord(coordinates)) return []
    if (!isCoordinate(coordinates.lat, -90, 90) || !isCoordinate(coordinates.lon, -180, 180)) return []

    const parsedDate = parseEpicDate(date)
    const imageUrl = buildEpicImageUrl(image, date)
    if (!parsedDate || !imageUrl) return []

    return [{
      id: image,
      capturedAt: parsedDate.capturedAt,
      imageUrl,
      centroid: {
        latitude: coordinates.lat,
        longitude: coordinates.lon,
      },
    }]
  })

  frames.sort((left, right) => left.capturedAt.localeCompare(right.capturedAt))

  const uniqueFrames = Array.from(new Map(frames.map((frame) => [frame.id, frame])).values())
  const latestDate = uniqueFrames.at(-1)?.capturedAt.slice(0, 10)
  if (!latestDate) return []

  return uniqueFrames
    .filter((frame) => frame.capturedAt.startsWith(latestDate))
    .slice(-MAX_EPIC_FRAMES)
}

export function createEpicPayload(frames: Array<EpicFrame>): EpicPayload | null {
  if (frames.length === 0) return null
  return {
    mode: 'live',
    date: frames[0].capturedAt.slice(0, 10),
    frames,
    source: EPIC_SOURCE_LABEL,
    sourceUrl: EPIC_SOURCE_URL,
  }
}

export function getAdjacentEpicImageUrls(frames: Array<EpicFrame>, currentIndex: number): Array<string> {
  return [frames[currentIndex - 1], frames[currentIndex + 1]]
    .filter((frame): frame is EpicFrame => Boolean(frame))
    .map((frame) => frame.imageUrl)
}

function fallbackFrame(image: string, date: string, latitude: number, longitude: number): EpicFrame {
  const parsedDate = parseEpicDate(date)
  const imageUrl = buildEpicImageUrl(image, date)
  if (!parsedDate || !imageUrl) throw new Error('Invalid checked-in EPIC fallback metadata')
  return {
    id: image,
    capturedAt: parsedDate.capturedAt,
    imageUrl,
    centroid: { latitude, longitude },
  }
}

// A small, verified sequence from the most recent day available while this
// experience was built. It is metadata only; the imagery remains on NASA's
// archive and is never bundled into OneWorld.
export const EPIC_FALLBACK_PAYLOAD: EpicPayload = {
  mode: 'fallback',
  date: '2026-07-08',
  source: EPIC_SOURCE_LABEL,
  sourceUrl: EPIC_SOURCE_URL,
  notice: 'upstream-unavailable',
  frames: [
    fallbackFrame('epic_1b_20260708001752', '2026-07-08 00:13:03', 14.802246, -176.652832),
    fallbackFrame('epic_1b_20260708033413', '2026-07-08 03:29:25', 14.765625, 134.318848),
    fallbackFrame('epic_1b_20260708065036', '2026-07-08 06:45:47', 14.772949, 85.26123),
    fallbackFrame('epic_1b_20260708100658', '2026-07-08 10:02:09', 14.72168, 36.23291),
    fallbackFrame('epic_1b_20260708132320', '2026-07-08 13:18:31', 14.729004, -12.839355),
    fallbackFrame('epic_1b_20260708163941', '2026-07-08 16:34:53', 14.714355, -61.882324),
    fallbackFrame('epic_1b_20260708195604', '2026-07-08 19:51:15', 14.641113, -110.910645),
    fallbackFrame('epic_1b_20260708231226', '2026-07-08 23:07:37', 14.626465, -160.041504),
  ],
}

export function isEpicPayload(value: unknown): value is EpicPayload {
  if (!isRecord(value)) return false
  if (value.mode !== 'live' && value.mode !== 'fallback') return false
  if (typeof value.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.date)) return false
  if (value.source !== EPIC_SOURCE_LABEL || value.sourceUrl !== EPIC_SOURCE_URL) return false
  if (!Array.isArray(value.frames) || value.frames.length === 0 || value.frames.length > MAX_EPIC_FRAMES) return false
  if (value.mode === 'fallback' && value.notice !== 'upstream-unavailable') return false
  if (value.mode === 'live' && value.notice !== undefined) return false

  return value.frames.every((frame) => {
    if (!isRecord(frame) || typeof frame.id !== 'string' || !EPIC_IMAGE_PATTERN.test(frame.id)) return false
    if (typeof frame.capturedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(frame.capturedAt)) return false
    if (!frame.capturedAt.startsWith(`${value.date}T`)) return false
    const upstreamDate = frame.capturedAt.replace('T', ' ').replace('Z', '')
    const expectedImageUrl = buildEpicImageUrl(frame.id, upstreamDate)
    if (typeof frame.imageUrl !== 'string' || !EPIC_ARCHIVE_PATTERN.test(frame.imageUrl) || frame.imageUrl !== expectedImageUrl) return false
    if (!isRecord(frame.centroid)) return false
    return isCoordinate(frame.centroid.latitude, -90, 90) && isCoordinate(frame.centroid.longitude, -180, 180)
  })
}
