import { describe, expect, it } from 'vitest'

import {
  BEIJING,
  SAN_FRANCISCO,
  PLACES,
  daylightAt,
  isLeapYear,
  simTimeAt,
  solarCoordsAt,
  timezoneOffsetAt,
  DEC_SOLSTICE_DOY,
  JUN_SOLSTICE_DOY,
  MAR_EQUINOX_DOY,
  OBLIQUITY_DEG,
  POLAR_CIRCLE_LAT_DEG,
  SEP_EQUINOX_DOY,
  TROPIC_LAT_DEG,
  dayInfo,
  earthOrbitPosition,
  globePoseFacingLatLon,
  inertialAxis,
  isDayAt,
  applyGlobeYawPitch,
  latLonToVec3,
  orbitAngleFromDecSolstice,
  seasonFromDoy,
  solarCoords,
  timeFromYearHours,
  vec3ToLatLon,
  wrapHours,
  yawCenteringLon,
  yearHours,
} from './earth-spin-orbit-model'

describe('earth spin/orbit model', () => {
  it('puts June solstice declination near +23.44° and December near −23.44°', () => {
    const june = solarCoords(JUN_SOLSTICE_DOY, 12)
    const december = solarCoords(DEC_SOLSTICE_DOY, 12)
    expect(june.declDeg).toBeGreaterThan(OBLIQUITY_DEG - 0.4)
    expect(june.declDeg).toBeLessThan(OBLIQUITY_DEG + 0.2)
    expect(december.declDeg).toBeLessThan(-OBLIQUITY_DEG + 0.4)
    expect(december.declDeg).toBeGreaterThan(-OBLIQUITY_DEG - 0.2)
  })

  it('puts equinox declination near the equator', () => {
    expect(Math.abs(solarCoords(MAR_EQUINOX_DOY, 12).declDeg)).toBeLessThan(1.2)
    expect(Math.abs(solarCoords(SEP_EQUINOX_DOY, 12).declDeg)).toBeLessThan(1.2)
  })

  it('moves the subsolar point west by about 15° per hour', () => {
    const a = solarCoords(180, 0)
    const b = solarCoords(180, 1)
    const delta = ((b.subsolarLon - a.subsolarLon + 540) % 360) - 180
    expect(delta).toBeCloseTo(-15, 1)
  })

  it('gives Beijing a mid-latitude day length, not polar day or night', () => {
    const june = solarCoords(JUN_SOLSTICE_DOY, 12)
    const info = dayInfo(BEIJING.lat, BEIJING.lon, june.declDeg, june.eqtimeMin)
    expect(info.polar).toBeNull()
    expect(info.dayHours).toBeGreaterThan(14)
    expect(info.dayHours).toBeLessThan(16)
    expect(info.sunriseUtc).not.toBeNull()
    expect(info.sunsetUtc).not.toBeNull()
  })

  it('makes Svalbard polar day in June and polar night in December', () => {
    const june = solarCoords(JUN_SOLSTICE_DOY, 12)
    const december = solarCoords(DEC_SOLSTICE_DOY, 12)
    expect(dayInfo(78.2, 15.6, june.declDeg, june.eqtimeMin).polar).toBe('day')
    expect(dayInfo(78.2, 15.6, december.declDeg, december.eqtimeMin).polar).toBe('night')
  })

  it('keeps tropics and polar circles complementary to the tilt', () => {
    expect(TROPIC_LAT_DEG).toBeCloseTo(OBLIQUITY_DEG, 10)
    expect(POLAR_CIRCLE_LAT_DEG).toBeCloseTo(90 - OBLIQUITY_DEG, 10)
  })

  it('places Earth at +X on the December solstice and −X in June', () => {
    const dec = earthOrbitPosition(DEC_SOLSTICE_DOY, 6)
    const jun = earthOrbitPosition(JUN_SOLSTICE_DOY, 6)
    expect(dec.x).toBeGreaterThan(5.9)
    expect(Math.abs(dec.z)).toBeLessThan(0.15)
    expect(jun.x).toBeLessThan(-5.9)
    expect(Math.abs(jun.z)).toBeLessThan(0.15)
    const juneAngle = ((orbitAngleFromDecSolstice(JUN_SOLSTICE_DOY) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
    expect(juneAngle).toBeCloseTo(Math.PI, 1)
  })

  it('orbits prograde about ecliptic north throughout all four seasons', () => {
    for (const doy of [MAR_EQUINOX_DOY, JUN_SOLSTICE_DOY, SEP_EQUINOX_DOY, DEC_SOLSTICE_DOY]) {
      const position = earthOrbitPosition(doy, 6)
      const next = earthOrbitPosition(doy + 0.01, 6)
      const dx = next.x - position.x
      const dz = next.z - position.z
      const angularMomentumY = position.z * dx - position.x * dz
      expect(angularMomentumY).toBeGreaterThan(0)
    }
  })

  it('keeps the inertial axis tilted 23.44° from ecliptic north', () => {
    const axis = inertialAxis()
    const tilt = (Math.acos(axis.y) * 180) / Math.PI
    expect(tilt).toBeCloseTo(OBLIQUITY_DEG, 6)
    expect(axis.x).toBeGreaterThan(0)
  })

  it('turns Beijing toward a +Z camera, not the southern hemisphere', () => {
    const local = latLonToVec3(BEIJING.lat, BEIJING.lon)
    const pose = globePoseFacingLatLon(BEIJING.lat, BEIJING.lon)
    const facing = applyGlobeYawPitch(local, pose.pitch, pose.yaw)
    expect(facing.z).toBeGreaterThan(0.99)
    expect(Math.abs(facing.x)).toBeLessThan(0.02)
    expect(Math.abs(facing.y)).toBeLessThan(0.02)

    const sydney = latLonToVec3(-33.869, 151.209)
    const sydneyPose = globePoseFacingLatLon(-33.869, 151.209)
    const sydneyFacing = applyGlobeYawPitch(sydney, sydneyPose.pitch, sydneyPose.yaw)
    expect(sydneyFacing.z).toBeGreaterThan(0.99)

    const flipped = applyGlobeYawPitch(local, -pose.pitch, pose.yaw)
    expect(flipped.y).toBeGreaterThan(0.7)
    expect(flipped.z).toBeLessThan(0.5)
  })

  it('round-trips lat/lon through sphere coordinates', () => {
    const samples = [
      { lat: 39.904, lon: 116.407 },
      { lat: 0, lon: 0 },
      { lat: -33.9, lon: 151.2 },
      { lat: 78.2, lon: 15.6 },
    ]
    for (const sample of samples) {
      const v = latLonToVec3(sample.lat, sample.lon, 1)
      const back = vec3ToLatLon(v.x, v.y, v.z)
      expect(back.lat).toBeCloseTo(sample.lat, 5)
      expect(back.lon).toBeCloseTo(sample.lon, 5)
    }
  })

  it('marks the subsolar point as day and the antipode as night', () => {
    const solar = solarCoords(180, 8)
    expect(isDayAt(solar.subsolarLat, solar.subsolarLon, solar)).toBe(true)
    const antiLon = ((solar.subsolarLon + 180 + 540) % 360) - 180
    expect(isDayAt(-solar.subsolarLat, antiLon, solar)).toBe(false)
  })

  it('wraps a year of hours back onto day-of-year and UTC', () => {
    const hours = yearHours({ doy: 200, utcHours: 18.5 })
    const back = timeFromYearHours(hours + 365 * 24)
    expect(back.doy).toBe(200)
    expect(back.utcHours).toBeCloseTo(18.5, 8)
    expect(wrapHours(-0.25)).toBeCloseTo(23.75, 8)
  })

  it('names northern-hemisphere seasons from the solstice/equinox markers', () => {
    expect(seasonFromDoy(MAR_EQUINOX_DOY + 1)).toBe('spring')
    expect(seasonFromDoy(JUN_SOLSTICE_DOY + 1)).toBe('summer')
    expect(seasonFromDoy(SEP_EQUINOX_DOY + 1)).toBe('autumn')
    expect(seasonFromDoy(DEC_SOLSTICE_DOY + 1)).toBe('winter')
  })
})


describe('calendar-backed Earth simulation', () => {
  it('preserves leap days and year boundaries instead of wrapping a fixed 365-day year', () => {
    expect(isLeapYear(2024)).toBe(true)
    expect(isLeapYear(2100)).toBe(false)
    expect(isLeapYear(2000)).toBe(true)
    const leapDay = simTimeAt(Date.UTC(2024, 1, 29, 6, 30))
    expect(leapDay).toMatchObject({ year: 2024, doy: 60, utcHours: 6.5, live: false })
    expect(simTimeAt(Date.UTC(2024, 11, 31, 23)).doy).toBe(366)
    expect(simTimeAt(Date.UTC(2024, 11, 31, 23) + 3_600_000)).toMatchObject({ year: 2025, doy: 1, utcHours: 0 })
  })

  it('uses NOAA fractional-year scaling for leap years', () => {
    const leap = solarCoords(184, 12, 2024)
    const matchingFraction = solarCoords(1 + 183 * 365 / 366, 12, 2025)
    expect(leap.declDeg).toBeCloseTo(matchingFraction.declDeg, 10)
    expect(leap.eqtimeMin).toBeCloseTo(matchingFraction.eqtimeMin, 10)
    expect(solarCoordsAt(Date.UTC(2024, 6, 2, 12))).toEqual(leap)
  })

  it('keeps solar lighting continuous as the real clock crosses New Year', () => {
    const before = solarCoordsAt(Date.UTC(2024, 11, 31, 23, 59, 59))
    const after = solarCoordsAt(Date.UTC(2025, 0, 1))
    expect(Math.abs(before.declDeg - after.declDeg)).toBeLessThan(0.01)
    const longitudeDelta = ((after.subsolarLon - before.subsolarLon + 540) % 360) - 180
    expect(Math.abs(longitudeDelta)).toBeLessThan(0.01)
  })

  it('applies daylight saving at the actual transition and preserves fractional offsets', () => {
    expect(timezoneOffsetAt(Date.UTC(2026, 2, 8, 9, 59), SAN_FRANCISCO)).toBe(-8)
    expect(timezoneOffsetAt(Date.UTC(2026, 2, 8, 10), SAN_FRANCISCO)).toBe(-7)
    expect(timezoneOffsetAt(Date.UTC(2026, 10, 1, 8, 59), SAN_FRANCISCO)).toBe(-7)
    expect(timezoneOffsetAt(Date.UTC(2026, 10, 1, 9), SAN_FRANCISCO)).toBe(-8)
    expect(timezoneOffsetAt(Date.UTC(2026, 5, 1), { tz: 0, timeZone: 'Asia/Kathmandu' })).toBe(5.75)
    expect(timezoneOffsetAt(Date.UTC(2026, 5, 1), { tz: 5.5 })).toBe(5.5)
    expect(timezoneOffsetAt(Date.UTC(2026, 5, 1), { tz: 3, timeZone: 'invalid' })).toBe(3)
  })

  it('computes San Francisco summer events on the selected local date even after UTC midnight', () => {
    const info = daylightAt(Date.UTC(2026, 5, 22, 2), SAN_FRANCISCO)
    expect(info.localDate).toBe('2026-06-21')
    expect(info.polar).toBeNull()
    expect(info.dayHours).toBeGreaterThan(14.6)
    expect(info.dayHours).toBeLessThan(15)
    const sunriseLocal = wrapHours(info.sunriseUtc! + timezoneOffsetAt(info.sunriseEpoch!, SAN_FRANCISCO))
    const sunsetLocal = wrapHours(info.sunsetUtc! + timezoneOffsetAt(info.sunsetEpoch!, SAN_FRANCISCO))
    expect(sunriseLocal).toBeGreaterThan(5.7)
    expect(sunriseLocal).toBeLessThan(5.95)
    expect(sunsetLocal).toBeGreaterThan(20.45)
    expect(sunsetLocal).toBeLessThan(20.75)
    expect(new Date(info.sunsetEpoch!).toISOString().slice(0, 10)).toBe('2026-06-22')
  })

  it('chooses the following local date east of Greenwich and handles political date-line zones', () => {
    const beijing = daylightAt(Date.UTC(2026, 5, 21, 18), BEIJING)
    expect(beijing.localDate).toBe('2026-06-22')
    expect(new Date(beijing.sunriseEpoch! + 8 * 3_600_000).toISOString().slice(0, 10)).toBe('2026-06-22')
    const kiritimati = { id: 'kiritimati', name: 'Kiritimati', lat: 1.872, lon: -157.427, tz: 14, timeZone: 'Pacific/Kiritimati' }
    const island = daylightAt(Date.UTC(2026, 0, 1, 15), kiritimati)
    expect(island.localDate).toBe('2026-01-02')
    for (const event of [island.sunriseEpoch, island.sunsetEpoch]) {
      expect(new Date(event! + 14 * 3_600_000).toISOString().slice(0, 10)).toBe(island.localDate)
    }
  })

  it('keeps polar events absent instead of inventing midnight sunrise or sunset', () => {
    const svalbard = PLACES.find(place => place.id === 'longyearbyen')!
    expect(daylightAt(Date.UTC(2026, 5, 21, 12), svalbard)).toMatchObject({ polar: 'day', dayHours: 24, sunriseEpoch: null, sunsetEpoch: null })
    expect(daylightAt(Date.UTC(2026, 11, 21, 12), svalbard)).toMatchObject({ polar: 'night', dayHours: 0, sunriseEpoch: null, sunsetEpoch: null })
  })
})
