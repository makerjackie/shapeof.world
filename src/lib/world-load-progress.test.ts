import { describe, expect, it } from 'vitest'
import { isWorldLoadStalled, timingBytes, WorldLoadMeter } from './world-load-progress'

const origin = 'https://shapeof.world'
const timing = (path: string, transferSize: number, responseEnd = 1000, encodedBodySize = transferSize - 300) => ({
  name: `${origin}${path}`, transferSize, encodedBodySize, decodedBodySize: 4000, responseEnd,
})

describe('world download accounting', () => {
  it('counts each allowlisted code/style file once, including shared dependencies', () => {
    const meter = new WorldLoadMeter(0, origin)
    meter.setManifest({ files: [['/world.js', 2000], ['/shared.js', 4000], ['/world.css', 1000]] })
    meter.record(timing('/world.js', 2300))
    meter.record(timing('/world.js', 2300, 2000))
    meter.record(timing('/other-world.js', 9000))
    meter.record(timing('/poster.webp', 9000))
    expect(meter.snapshot()).toEqual({ loaded: 2300, total: 7900 })
    expect(meter.lastActivity).toBe(1000)
  })

  it('uses actual transfer bytes for compression and encoded bytes for cached files', () => {
    const meter = new WorldLoadMeter(0, origin)
    meter.setManifest({ files: [['/world.js', 4000], ['/shared.js', 4000]] })
    meter.setEncodedSize(`${origin}/world.js`, 1000)
    expect(meter.snapshot().total).toBe(5600)
    meter.record(timing('/world.js', 1300, 1000, 1000))
    meter.record(timing('/shared.js', 0, 900, 1200))
    expect(meter.snapshot()).toEqual({ loaded: 2500, total: 2500 })
    expect(timingBytes(timing('/world.js', 300, 1000, 4000))).toBe(300) // Revalidation headers.
  })

  it('falls back to downloaded bytes without a known denominator', () => {
    const meter = new WorldLoadMeter(0, origin)
    expect(meter.snapshot()).toEqual({ loaded: 0, total: undefined })
    meter.setManifest({ files: [['/a.js'], ['/b.css']] })
    meter.record(timing('/a.js', 1300))
    expect(meter.snapshot()).toEqual({ loaded: 1300, total: undefined })
  })

  it('ignores failed responses, media and other origins', () => {
    const meter = new WorldLoadMeter(0, origin)
    meter.setManifest({ files: [['/a.js', 1000], ['/a.webp', 2000], ['https://other.test/a.js', 4000]] })
    meter.record({ ...timing('/a.js', 300), responseStatus: 404 })
    expect(meter.snapshot()).toEqual({ loaded: 0, total: 1300 })
  })

  it('counts an opaque cache hit as available, without claiming new network activity', () => {
    const meter = new WorldLoadMeter(2000, origin)
    meter.setManifest({ files: [['/a.js', 1000]] })
    meter.record({ ...timing('/a.js', 0, 1000, 0), decodedBodySize: 0 })
    expect(meter.snapshot()).toEqual({ loaded: 1300, total: 1300 })
    expect(meter.lastActivity).toBe(2000)
  })

  it('waits 20 full seconds since the last byte, including within one large response', () => {
    const meter = new WorldLoadMeter(1000, origin)
    expect(isWorldLoadStalled(meter.lastActivity, 20_999)).toBe(false)
    expect(isWorldLoadStalled(meter.lastActivity, 21_000)).toBe(true)
    meter.activity(1024, 20_999)
    expect(isWorldLoadStalled(meter.lastActivity, 40_998)).toBe(false)
    meter.activity(0, 40_998)
    expect(isWorldLoadStalled(meter.lastActivity, 40_999)).toBe(true)
    // Stream chunks never manufacture displayed Resource Timing bytes.
    expect(meter.snapshot().loaded).toBe(0)
  })
})
