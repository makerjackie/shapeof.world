import { Body, GeoMoon, Illumination, MoonPhase, RotateVector, Rotation_EQJ_EQD, SiderealTime } from 'astronomy-engine'
import { latLonToVec3 } from './earth-spin-orbit-model'

export const EARTH_RADIUS_KM = 6371
export const MOON_RADIUS = 1737.4 / EARTH_RADIUS_KM
const AU_KM = 149597870.7
/** Calendar ephemeris, expressed in Earth-fixed coordinates and Earth radii. */
export function earthMoonAt(epoch: number) {
  const date = new Date(epoch)
  const equatorial = RotateVector(Rotation_EQJ_EQD(date), GeoMoon(date))
  const distanceKm = Math.hypot(equatorial.x, equatorial.y, equatorial.z) * AU_KM
  const lat = Math.asin(equatorial.z * AU_KM / distanceKm) * 180 / Math.PI
  const lon = Math.atan2(equatorial.y, equatorial.x) * 180 / Math.PI - SiderealTime(date) * 15
  return {
    moon: latLonToVec3(lat, lon, distanceKm / EARTH_RADIUS_KM),
    distanceKm,
    illumination: Illumination(Body.Moon, date).phase_fraction,
    phase: MoonPhase(date) / 360,
  }
}
export function phaseName(phase: number) {
  if (phase < 0.015 || phase > 0.985) return '新月'
  if (phase < 0.235) return '娥眉月'
  if (phase < 0.265) return '上弦月'
  if (phase < 0.485) return '盈凸月'
  if (phase < 0.515) return '满月'
  if (phase < 0.735) return '亏凸月'
  if (phase < 0.765) return '下弦月'
  return '残月'
}

/** One sidereal month's geocentric trajectory, all samples in a single frozen terrestrial frame.
 * Rotating each sample with its own sidereal time would incorrectly wind the path daily.
 */
export function moonOrbitAt(epoch: number, segments = 160) {
  const frame = Rotation_EQJ_EQD(new Date(epoch))
  const siderealDegrees = SiderealTime(new Date(epoch)) * 15
  return Array.from({ length: segments + 1 }, (_, i) => {
    const sample = new Date(epoch + (i / segments - 0.5) * 27.321661 * 86400000)
    const v = RotateVector(frame, GeoMoon(sample))
    const radius = Math.hypot(v.x, v.y, v.z)
    return latLonToVec3(Math.asin(v.z / radius) * 180 / Math.PI,
      Math.atan2(v.y, v.x) * 180 / Math.PI - siderealDegrees, radius * AU_KM / EARTH_RADIUS_KM)
  })
}
