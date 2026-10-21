import { describe, expect, it } from 'vitest'
import { geometricDayHours, latitudeZone, localSun, parseSavedScene, seasonEpochs, solarNoonEpoch } from './earth-teaching'
import { solarCoordsAt } from './earth-spin-orbit-model'
const equinox = { declDeg: 0, subsolarLat: 0, subsolarLon: 0, eqtimeMin: 0 }
describe('teaching geography', () => {
  it('places the Sun overhead, on the eastern morning horizon, and below the night horizon', () => {
    expect(localSun(0, 0, equinox).altitude).toBeCloseTo(90)
    expect(localSun(0, 0, equinox).azimuth).toBeNull()
    expect(localSun(0, -90, equinox).azimuth).toBeCloseTo(90)
    expect(localSun(0, -90, equinox).solarTime).toBeCloseTo(6)
    expect(localSun(0, 180, equinox).shadow).toBeNull()
    expect(localSun(45, 0, equinox).shadow).toBeCloseTo(1)
  })
  it('keeps geometric equinox days equal and gives opposite polar seasons', () => {
    expect(geometricDayHours(60, 0)).toBeCloseTo(12)
    expect(geometricDayHours(85, 23.44)).toBe(24)
    expect(geometricDayHours(-85, 23.44)).toBe(0)
    expect(geometricDayHours(90, 0)).toBe(12)
    expect(geometricDayHours(40, 23.44) + geometricDayHours(-40, 23.44)).toBeCloseTo(24)
  })
  it('uses ephemeris seasonal instants and a converged local solar noon', () => {
    const seasons = seasonEpochs(2026)
    expect(seasons.map(t => new Date(t).getUTCMonth())).toEqual([2, 5, 8, 11])
    const noon = solarNoonEpoch(seasons[1], 116.407)
    expect(localSun(39.904, 116.407, solarCoordsAt(noon)).solarTime).toBeCloseTo(12, 4)
  })
  it('classifies all five zones and rejects invalid shared scenes', () => {
    expect([-80, -40, 0, 40, 80].map(latitudeZone)).toEqual(['南寒带', '南温带', '热带', '北温带', '北寒带'])
    expect(parseSavedScene('{"version":1,"topic":"bad"}')).toBeNull()
    expect(parseSavedScene('not json')).toBeNull()
  })
  it('restores old links with default appearance and preserves explicit full illumination', () => {
    const scene = { version: 1, topic: 'coordinates', epoch: Date.UTC(2026, 5, 21), lat: 30, lon: 120, yaw: 0, pitch: 0, radius: 4.3, compare: '', layers: {} }
    expect(parseSavedScene(JSON.stringify(scene))).toMatchObject({ skin: 'satellite', nightShade: true })
    expect(parseSavedScene(JSON.stringify({ ...scene, skin: 'ivory', nightShade: false }))).toMatchObject({ skin: 'ivory', nightShade: false, epoch: scene.epoch })
    expect(parseSavedScene(JSON.stringify({ ...scene, skin: 'unknown' }))).toBeNull()
    expect(parseSavedScene(JSON.stringify({ ...scene, nightShade: 'false' }))).toBeNull()
  })

})
