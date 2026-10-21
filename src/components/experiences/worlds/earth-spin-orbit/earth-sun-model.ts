import { Body, Ecliptic, HelioVector } from 'astronomy-engine'
import { EARTH_RADIUS_KM } from './earth-moon-model'
export const AU_KM = 149597870.7
export const SUN_RADIUS = 695700 / EARTH_RADIUS_KM
export const EARTH_ORBIT_RADIUS = AU_KM / EARTH_RADIUS_KM
/** True ecliptic of date, cyclically permuted to the existing scene axes. All lengths are Earth radii. */
export function earthSunAt(epoch: number) {
  const v = Ecliptic(HelioVector(Body.Earth, new Date(epoch))).vec
  const unit = AU_KM / EARTH_RADIUS_KM
  return { x: v.y * unit, y: v.z * unit, z: v.x * unit, distanceKm: Math.hypot(v.x, v.y, v.z) * AU_KM }
}
