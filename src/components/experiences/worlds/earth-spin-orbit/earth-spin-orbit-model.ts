/**
 * Earth spin + orbit model.
 *
 * Lighting and sunrise use NOAA solar-position formulas (declination and
 * equation of time). Axial tilt, day length and orbital markers follow the
 * NASA Earth Fact Sheet. The Sun-centred view uses the separate
 * earth-sun-model Astronomy Engine ephemeris and a single physical scale.
 *
 * Sources:
 * - NASA Earth Fact Sheet (obliquity 23.44°, sidereal day 23.9345 h, tropical year 365.242 d)
 * - NOAA Global Monitoring Laboratory solar calculation notes
 */

export const OBLIQUITY_DEG = 23.44
export const TROPIC_LAT_DEG = OBLIQUITY_DEG
export const POLAR_CIRCLE_LAT_DEG = 90 - OBLIQUITY_DEG
export const TROPICAL_YEAR_DAYS = 365.242
export const SIDEREAL_DAY_HOURS = 23.9345
export const SOLAR_DAY_HOURS = 24
/** Approximate day-of-year of the December solstice in a non-leap year. */
export const DEC_SOLSTICE_DOY = 355.25
export const JUN_SOLSTICE_DOY = 172.25
export const MAR_EQUINOX_DOY = 80.25
export const SEP_EQUINOX_DOY = 266.15
export const BEIJING = { id: 'beijing', name: '北京', lat: 39.904, lon: 116.407, tz: 8, timeZone: 'Asia/Shanghai' } as const
export const SAN_FRANCISCO = { id: 'sanfrancisco', name: '旧金山', lat: 37.7749, lon: -122.4194, tz: -8, timeZone: 'America/Los_Angeles' } as const

export type Place = {
  id: string
  name: string
  lat: number
  lon: number
  /** Fallback UTC offset for points without a known civil time zone. */
  tz: number
  timeZone?: string
}

export const PLACES: Array<Place> = [
  SAN_FRANCISCO,
  BEIJING,
  { id: 'london', name: '伦敦', lat: 51.507, lon: -0.128, tz: 0, timeZone: 'Europe/London' },
  { id: 'newyork', name: '纽约', lat: 40.713, lon: -74.006, tz: -5, timeZone: 'America/New_York' },
  { id: 'cairo', name: '开罗', lat: 30.044, lon: 31.236, tz: 2, timeZone: 'Africa/Cairo' },
  { id: 'capetown', name: '开普敦', lat: -33.925, lon: 18.424, tz: 2, timeZone: 'Africa/Johannesburg' },
  { id: 'sydney', name: '悉尼', lat: -33.869, lon: 151.209, tz: 10, timeZone: 'Australia/Sydney' },
  { id: 'longyearbyen', name: '朗伊尔城', lat: 78.223, lon: 15.646, tz: 1, timeZone: 'Arctic/Longyearbyen' },
]

export type SolarCoords = {
  declDeg: number
  eqtimeMin: number
  subsolarLat: number
  subsolarLon: number
}

export type DayInfo = {
  polar: 'day' | 'night' | null
  dayHours: number
  sunriseUtc: number | null
  sunsetUtc: number | null
}

export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter'

export type SimTime = {
  /** Fractional UTC hours in [0, 24). */
  utcHours: number
  /** Integer UTC day of year, 1–365 or 1–366 in leap years. */
  doy: number
  live: boolean
  year?: number
  epoch?: number
}

export function wrapHours(hours: number) {
  return ((hours % 24) + 24) % 24
}

export function wrapDoy(doy: number) {
  const span = 365
  return ((((doy - 1) % span) + span) % span) + 1
}

export function yearHours(time: Pick<SimTime, 'doy' | 'utcHours'>) {
  return (time.doy - 1) * 24 + time.utcHours
}

export function timeFromYearHours(hours: number): Pick<SimTime, 'doy' | 'utcHours'> {
  const wrapped = ((hours % (365 * 24)) + 365 * 24) % (365 * 24)
  const doy = Math.floor(wrapped / 24) + 1
  return { doy, utcHours: wrapped - (doy - 1) * 24 }
}

export function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

export function simTimeAt(epoch: number, live = false): SimTime & { year: number; epoch: number } {
  const date = new Date(epoch)
  const year = date.getUTCFullYear()
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600 + date.getUTCMilliseconds() / 3_600_000
  const doy = Math.floor((epoch - Date.UTC(year, 0, 1)) / 86_400_000) + 1
  return { utcHours, doy, live, year, epoch }
}

export function nowSimTime(): SimTime {
  return simTimeAt(Date.now(), true)
}

export function solarCoordsAt(epoch: number): SolarCoords {
  const time = simTimeAt(epoch)
  return solarCoords(time.doy, time.utcHours, time.year)
}

/**
 * NOAA solar-position formulas.
 * Declination and equation of time from day-of-year + UTC hours.
 * Subsolar longitude: 180 − 15·utcHours − eqtime/4, east-positive.
 */
export function solarCoords(doy: number, utcHours: number, year = 2025): SolarCoords {
  const gamma = ((2 * Math.PI) / (isLeapYear(year) ? 366 : 365)) * (doy - 1 + (utcHours - 12) / 24)
  const eqtimeMin =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma))
  const declRad =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma)
  const declDeg = (declRad * 180) / Math.PI
  let subsolarLon = 180 - 15 * utcHours - eqtimeMin / 4
  subsolarLon = ((subsolarLon + 540) % 360) - 180
  return { declDeg, eqtimeMin, subsolarLat: declDeg, subsolarLon }
}

/**
 * Day length and sunrise/sunset for a geographic point.
 * Sunrise/sunset use solar zenith 90.833° (upper limb + refraction).
 * Returned times are UTC hours; add the place timezone for civil clocks.
 */
export function dayInfo(latDeg: number, lonDeg: number, declDeg: number, eqtimeMin: number): DayInfo {
  const lat = (latDeg * Math.PI) / 180
  const decl = (declDeg * Math.PI) / 180
  const zenith = (90.833 * Math.PI) / 180
  const cosH = (Math.cos(zenith) - Math.sin(lat) * Math.sin(decl)) / (Math.cos(lat) * Math.cos(decl))
  if (cosH > 1) return { polar: 'night', dayHours: 0, sunriseUtc: null, sunsetUtc: null }
  if (cosH < -1) return { polar: 'day', dayHours: 24, sunriseUtc: null, sunsetUtc: null }
  const hDeg = (Math.acos(cosH) * 180) / Math.PI
  const dayHours = (2 * hDeg) / 15
  const solarOffset = lonDeg / 15 + eqtimeMin / 60
  return {
    polar: null,
    dayHours,
    sunriseUtc: 12 - hDeg / 15 - solarOffset,
    sunsetUtc: 12 + hDeg / 15 - solarOffset,
  }
}

const zoneFormatters = new Map<string, Intl.DateTimeFormat>()

/** Offset at the simulated instant, including the civil zone's DST rules. */
export function timezoneOffsetAt(epoch: number, place: Pick<Place, 'tz' | 'timeZone'>) {
  if (!place.timeZone) return place.tz
  try {
    let formatter = zoneFormatters.get(place.timeZone)
    if (!formatter) {
      formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: place.timeZone, timeZoneName: 'longOffset',
      })
      zoneFormatters.set(place.timeZone, formatter)
    }
    const label = formatter.formatToParts(epoch).find(part => part.type === 'timeZoneName')?.value
    if (label === 'GMT' || label === 'UTC') return 0
    const match = label?.match(/GMT([+−-])(\d{1,2}):(\d{2})/)
    if (match) return (match[1] === '+' ? 1 : -1) * (Number(match[2]) + Number(match[3]) / 60)
  } catch {
    // Offline browsers can lack a particular IANA zone; use the explicit fallback.
  }
  return place.tz
}

export type LocalDayInfo = DayInfo & {
  localDate: string
  sunriseEpoch: number | null
  sunsetEpoch: number | null
}

/** Events for the selected place's civil date, not the UTC date of the clock. */
export function daylightAt(epoch: number, place: Place): LocalDayInfo {
  const local = new Date(epoch + timezoneOffsetAt(epoch, place) * 3_600_000)
  const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate())
  const localDate = new Date(midnight).toISOString().slice(0, 10)
  let solarNoon = midnight + (12 - place.lon / 15) * 3_600_000
  // Political zones can put the civil date on the other side of the date line.
  const noonLocalDay = Math.floor((solarNoon + timezoneOffsetAt(solarNoon, place) * 3_600_000) / 86_400_000)
  const solarDayBase = midnight + (Math.floor(midnight / 86_400_000) - noonLocalDay) * 86_400_000
  solarNoon += solarDayBase - midnight
  const solar = solarCoordsAt(solarNoon)
  const noonInfo = dayInfo(place.lat, place.lon, solar.declDeg, solar.eqtimeMin)
  if (noonInfo.polar) return { ...noonInfo, localDate, sunriseEpoch: null, sunsetEpoch: null }
  const refine = (kind: 'sunriseUtc' | 'sunsetUtc') => {
    let hours = noonInfo[kind]!
    for (let i = 0; i < 3; i++) {
      const eventSolar = solarCoordsAt(solarDayBase + hours * 3_600_000)
      const event = dayInfo(place.lat, place.lon, eventSolar.declDeg, eventSolar.eqtimeMin)[kind]
      if (event === null) return null
      hours = event
    }
    return solarDayBase + hours * 3_600_000
  }
  const sunriseEpoch = refine('sunriseUtc')
  const sunsetEpoch = refine('sunsetUtc')
  return {
    polar: null,
    dayHours: sunriseEpoch !== null && sunsetEpoch !== null ? (sunsetEpoch - sunriseEpoch) / 3_600_000 : noonInfo.dayHours,
    sunriseUtc: sunriseEpoch === null ? null : (sunriseEpoch - midnight) / 3_600_000,
    sunsetUtc: sunsetEpoch === null ? null : (sunsetEpoch - midnight) / 3_600_000,
    sunriseEpoch,
    sunsetEpoch,
    localDate,
  }
}

export function isDayAt(latDeg: number, lonDeg: number, solar: SolarCoords) {
  const lat = (latDeg * Math.PI) / 180
  const decl = (solar.declDeg * Math.PI) / 180
  const hourAngleDeg = (lonDeg - solar.subsolarLon)
  const ha = (hourAngleDeg * Math.PI) / 180
  const sinAlt = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(ha)
  return sinAlt > 0
}

export function seasonFromDoy(doy: number): SeasonId {
  const d = wrapDoy(doy)
  if (d >= MAR_EQUINOX_DOY && d < JUN_SOLSTICE_DOY) return 'spring'
  if (d >= JUN_SOLSTICE_DOY && d < SEP_EQUINOX_DOY) return 'summer'
  if (d >= SEP_EQUINOX_DOY && d < DEC_SOLSTICE_DOY) return 'autumn'
  return 'winter'
}

export function northernSeasonLabel(season: SeasonId) {
  if (season === 'spring') return '北半球春季'
  if (season === 'summer') return '北半球夏季'
  if (season === 'autumn') return '北半球秋季'
  return '北半球冬季'
}

/** Unit sphere, Y-up, matching Three.js SphereGeometry UV (u=0 at 180°W). */
export function latLonToVec3(latDeg: number, lonDeg: number, radius = 1) {
  const lat = (latDeg * Math.PI) / 180
  const lon = (lonDeg * Math.PI) / 180
  return {
    x: radius * Math.cos(lat) * Math.cos(lon),
    y: radius * Math.sin(lat),
    z: -radius * Math.cos(lat) * Math.sin(lon),
  }
}

export function vec3ToLatLon(x: number, y: number, z: number) {
  const r = Math.hypot(x, y, z) || 1
  const lat = (Math.asin(y / r) * 180) / Math.PI
  const lon = (Math.atan2(-z, x) * 180) / Math.PI
  return { lat, lon }
}

/** Camera yaw that puts longitude `lonDeg` in front of a +Z-facing camera. */
export function yawCenteringLon(lonDeg: number) {
  return ((-90 - lonDeg) * Math.PI) / 180
}

/**
 * Camera pitch for Euler order XYZ that lifts latitude `latDeg` onto the
 * camera axis. Northern latitudes are positive; the opposite sign aims
 * the camera at the southern hemisphere.
 */
export function pitchCenteringLat(latDeg: number) {
  return (latDeg * Math.PI) / 180
}

/** XYZ yaw/pitch that puts `latDeg`,`lonDeg` on the +Z camera axis, north-up. */
export function globePoseFacingLatLon(latDeg: number, lonDeg: number) {
  return {
    yaw: yawCenteringLon(lonDeg),
    pitch: pitchCenteringLat(latDeg),
  }
}

/**
 * Rotate a local sphere point by the same XYZ yaw/pitch the globe uses:
 * yaw around Y, then pitch around X.
 */
export function applyGlobeYawPitch(
  point: { x: number; y: number; z: number },
  pitch: number,
  yaw: number,
) {
  const cy = Math.cos(yaw)
  const sy = Math.sin(yaw)
  const y1 = point.y
  const x1 = point.x * cy + point.z * sy
  const z1 = -point.x * sy + point.z * cy
  const cx = Math.cos(pitch)
  const sx = Math.sin(pitch)
  return {
    x: x1,
    y: y1 * cx - z1 * sx,
    z: y1 * sx + z1 * cx,
  }
}

/**
 * Inertial north-pole direction in the sun-centered frame.
 * +Y is ecliptic north. The axis is tilted toward +X so that Earth at +X
 * (December solstice) leans away from the Sun at the origin.
 */
export function inertialAxis() {
  const e = (OBLIQUITY_DEG * Math.PI) / 180
  return { x: Math.sin(e), y: Math.cos(e), z: 0 }
}

/**
 * Circular-orbit Earth position in the ecliptic (XZ) plane.
 * Angle 0 at the December solstice: Earth at +X, north pole leaning away.
 * Negative Z progression makes orbital angular momentum point toward ecliptic north (+Y).
 */
export function earthOrbitPosition(doy: number, radius: number) {
  const theta = orbitAngleFromDecSolstice(doy)
  return { x: Math.cos(theta) * radius, y: 0, z: -Math.sin(theta) * radius, theta }
}

export function orbitAngleFromDecSolstice(doy: number) {
  return (2 * Math.PI * (wrapDoy(doy) - DEC_SOLSTICE_DOY)) / TROPICAL_YEAR_DAYS
}

export function formatHHMM(hours: number) {
  const wrapped = wrapHours(hours)
  const h = Math.floor(wrapped)
  const m = Math.round((wrapped - h) * 60)
  const hh = m === 60 ? (h + 1) % 24 : h
  const mm = m === 60 ? 0 : m
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

export function formatLatLon(lat: number, lon: number) {
  const la = `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}`
  const lo = `${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'}`
  return `${la} · ${lo}`
}

export function timezoneLabel(tz: number) {
  if (tz === 0) return 'UTC'
  const sign = tz > 0 ? '+' : '−'
  const abs = Math.abs(tz)
  const h = Math.floor(abs)
  const m = Math.round((abs - h) * 60)
  return m === 0 ? `UTC${sign}${h}` : `UTC${sign}${h}:${String(m).padStart(2, '0')}`
}

export function dayLengthLabel(info: DayInfo) {
  if (info.polar === 'day') return '极昼'
  if (info.polar === 'night') return '极夜'
  const h = Math.floor(info.dayHours)
  const m = Math.round((info.dayHours - h) * 60)
  return { hours: h, minutes: m === 60 ? 0 : m, extraHour: m === 60 }
}
