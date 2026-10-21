import { describe, expect, it } from 'vitest'

import {
  buildEpicImageUrl,
  createEpicPayload,
  EPIC_FALLBACK_PAYLOAD,
  EPIC_SOURCE_LABEL,
  getAdjacentEpicImageUrls,
  isEpicPayload,
  normalizeEpicFrames,
} from './epic'

describe('NASA EPIC metadata', () => {
  it('strictly crops, sorts and deduplicates the upstream response', () => {
    const frames = normalizeEpicFrames([
      {
        identifier: 'must-not-leak',
        caption: 'must-not-leak',
        image: 'epic_1b_20260708012319',
        date: '2026-07-08 01:18:30',
        centroid_coordinates: { lat: 14.820557, lon: 167.01416, extra: 'must-not-leak' },
        dscovr_j2000_position: { x: 1, y: 2, z: 3 },
      },
      {
        image: 'epic_1b_20260708001752',
        date: '2026-07-08 00:13:03',
        centroid_coordinates: { lat: 14.802246, lon: -176.652832 },
      },
      {
        image: 'epic_1b_20260708012319',
        date: '2026-07-08 01:18:30',
        centroid_coordinates: { lat: 14.820557, lon: 167.01416 },
      },
    ])

    expect(frames).toHaveLength(2)
    expect(frames[0]).toEqual({
      id: 'epic_1b_20260708001752',
      capturedAt: '2026-07-08T00:13:03Z',
      imageUrl: 'https://epic.gsfc.nasa.gov/archive/natural/2026/07/08/jpg/epic_1b_20260708001752.jpg',
      centroid: { latitude: 14.802246, longitude: -176.652832 },
    })
    expect(JSON.stringify(frames)).not.toContain('must-not-leak')
  })

  it('drops malformed dates, unsafe image names and invalid coordinates', () => {
    expect(normalizeEpicFrames([
      { image: '../private', date: '2026-07-08 00:13:03', centroid_coordinates: { lat: 0, lon: 0 } },
      { image: 'epic_valid', date: '2026-02-30 00:13:03', centroid_coordinates: { lat: 0, lon: 0 } },
      { image: 'epic_valid', date: '2026-07-08 00:13:03', centroid_coordinates: { lat: 91, lon: 0 } },
    ])).toEqual([])
    expect(buildEpicImageUrl('../private', '2026-07-08 00:13:03')).toBeNull()
  })

  it('keeps only the newest daily sequence if upstream mixes dates', () => {
    const frames = normalizeEpicFrames([
      { image: 'epic_old', date: '2026-07-07 23:00:00', centroid_coordinates: { lat: 1, lon: 2 } },
      { image: 'epic_new', date: '2026-07-08 00:00:00', centroid_coordinates: { lat: 3, lon: 4 } },
    ])
    expect(frames.map((frame) => frame.id)).toEqual(['epic_new'])
  })

  it('builds a small valid last-known fallback without bundling image files', () => {
    expect(EPIC_FALLBACK_PAYLOAD.mode).toBe('fallback')
    expect(EPIC_FALLBACK_PAYLOAD.frames).toHaveLength(8)
    expect(EPIC_FALLBACK_PAYLOAD.frames.every((frame) => frame.imageUrl.startsWith('https://epic.gsfc.nasa.gov/archive/'))).toBe(true)
    expect(isEpicPayload(EPIC_FALLBACK_PAYLOAD)).toBe(true)
  })

  it('validates the exact public response contract', () => {
    const frames = normalizeEpicFrames([
      { image: 'epic_frame', date: '2026-07-08 01:00:00', centroid_coordinates: { lat: 0, lon: 0 } },
    ])
    const payload = createEpicPayload(frames)
    expect(payload).toMatchObject({ mode: 'live', date: '2026-07-08', source: EPIC_SOURCE_LABEL })
    expect(isEpicPayload(payload)).toBe(true)
    expect(isEpicPayload({ ...payload, source: 'Untrusted source' })).toBe(false)
    expect(isEpicPayload({ ...payload, frames: [{ ...frames[0], imageUrl: 'https://example.com/tracker.jpg' }] })).toBe(false)
    expect(isEpicPayload({ ...payload, notice: 'upstream-unavailable' })).toBe(false)
    expect(isEpicPayload({ ...payload, frames: [{ ...frames[0], id: 'epic_different_frame' }] })).toBe(false)
  })

  it('only selects the two frames adjacent to the current image for preloading', () => {
    const frames = EPIC_FALLBACK_PAYLOAD.frames
    expect(getAdjacentEpicImageUrls(frames, 3)).toEqual([
      frames[2].imageUrl,
      frames[4].imageUrl,
    ])
    expect(getAdjacentEpicImageUrls(frames, 0)).toEqual([frames[1].imageUrl])
    expect(getAdjacentEpicImageUrls(frames, frames.length - 1)).toEqual([frames.at(-2)?.imageUrl])
  })
})
