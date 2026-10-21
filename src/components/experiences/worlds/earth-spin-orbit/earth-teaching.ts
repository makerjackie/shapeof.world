import type { EarthSkin } from './earth-appearance'
import { Seasons } from 'astronomy-engine'
import { OBLIQUITY_DEG, POLAR_CIRCLE_LAT_DEG, solarCoordsAt, wrapHours, type SolarCoords } from './earth-spin-orbit-model'

export const TOPICS = [
  { id: 'explore', label: '自由观察', question: '一颗地球，许多看世界的方式。', hint: '拖动观察，点击大陆选择地点。时间停下时，仍然可以转动视角。' },
  { id: 'coordinates', label: '经纬定位', question: '怎样用两个角度，找到地球上的一个点？', hint: '纬度从赤道量起，经度从本初子午线量起。金色纬线与蓝色经线在所选地点相交。' },
  { id: 'daylight', label: '昼夜', question: '此刻，谁正在迎来日出？', hint: '推进一天。晨线是由夜入昼的边界，昏线是由昼入夜的边界。' },
  { id: 'seasons', label: '四季', question: '同一天，南北半球的白昼一样长吗？', hint: '地轴倾斜约23.44°。拖动一年，看两半球的昼弧如何此长彼短；地轴在一年内几乎指向同一方向。' },
  { id: 'zones', label: '地球五带', question: '回归线与极圈，为什么在这些纬度？', hint: '地轴倾角对应23.44°回归线；90°减去倾角得到66.56°极圈。点击地球比较五带。' },
  { id: 'solar', label: '太阳与影子', question: '太阳越高，影子会怎样变化？', hint: '选一处地面，推进一天。下方侧视图跟随当地太阳高度，假设地面水平、杆高一米。' },
  { id: 'time', label: '地方时', question: '同一个瞬间，为什么各地的时间不同？', hint: '比较两地的太阳时和钟表时间。每向东15°，地方太阳时约早一小时；法定时区由地区规定。' },
] as const
export type Topic = typeof TOPICS[number]['id']
export type LessonId = 'beijing' | 'sunrise' | 'hemispheres' | 'polar' | 'tropics' | 'noon' | 'clocks'
export const LESSONS: Array<{ id: LessonId; label: string; topic: Topic; lat: number; lon: number; season?: number }> = [
  { id: 'beijing', label: '北京在哪里？', topic: 'coordinates', lat: 39.904, lon: 116.407 },
  { id: 'sunrise', label: '追踪一次日出', topic: 'daylight', lat: 39.904, lon: 116.407 },
  { id: 'hemispheres', label: '北京与悉尼的夏至', topic: 'seasons', lat: 39.904, lon: 116.407, season: 1 },
  { id: 'polar', label: '北极的一整天', topic: 'daylight', lat: 85, lon: 15, season: 1 },
  { id: 'tropics', label: '从赤道走向北极', topic: 'zones', lat: 0, lon: 30 },
  { id: 'noon', label: '正午的影子', topic: 'solar', lat: 39.904, lon: 116.407, season: 1 },
  { id: 'clocks', label: '北京与伦敦的此刻', topic: 'time', lat: 39.904, lon: 116.407 },
]
export function seasonEpochs(year: number) {
  const s = Seasons(year)
  return [s.mar_equinox.date.getTime(), s.jun_solstice.date.getTime(), s.sep_equinox.date.getTime(), s.dec_solstice.date.getTime()]
}
const DEG = Math.PI / 180
/** Geometric solar altitude, with no refraction; azimuth clockwise from north. NOAA spherical geometry. */
export function localSun(lat: number, lon: number, solar: SolarCoords) {
  const phi = lat * DEG, delta = solar.declDeg * DEG, h = (lon - solar.subsolarLon) * DEG
  const up = Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.cos(h)
  const east = -Math.cos(delta) * Math.sin(h)
  const north = Math.cos(phi) * Math.sin(delta) - Math.sin(phi) * Math.cos(delta) * Math.cos(h)
  const altitude = Math.asin(Math.max(-1, Math.min(1, up))) / DEG
  const azimuth = Math.hypot(east, north) < 1e-9 || Math.abs(lat) === 90 ? null : (Math.atan2(east, north) / DEG + 360) % 360
  return { altitude, azimuth, shadow: altitude > 0 ? 1 / Math.tan(altitude * DEG) : null, solarTime: wrapHours(12 + (lon - solar.subsolarLon) / 15) }
}
/** Ideal geometric day arc: Sun's centre on horizon, no atmosphere or solar disk. */
export function geometricDayHours(lat: number, decl: number) {
  const a = Math.sin(lat * DEG) * Math.sin(decl * DEG)
  const b = Math.cos(lat * DEG) * Math.cos(decl * DEG)
  if (Math.abs(b) < 1e-12) return a > 1e-12 ? 24 : a < -1e-12 ? 0 : 12
  return 24 * Math.acos(Math.max(-1, Math.min(1, -a / b))) / Math.PI
}
export function latitudeZone(lat: number) {
  if (Math.abs(lat) <= OBLIQUITY_DEG) return '热带'
  if (lat >= POLAR_CIRCLE_LAT_DEG) return '北寒带'
  if (lat <= -POLAR_CIRCLE_LAT_DEG) return '南寒带'
  return lat > 0 ? '北温带' : '南温带'
}
export function solarNoonEpoch(epoch: number, lon: number) {
  const midnight = Math.floor(epoch / 86400000) * 86400000
  let noon = midnight + (12 - lon / 15) * 3600000
  for (let i = 0; i < 3; i++) noon = midnight + (12 - lon / 15 - solarCoordsAt(noon).eqtimeMin / 60) * 3600000
  return noon
}
export type SavedScene = { version: 1; skin?: EarthSkin; nightShade?: boolean; topic: Topic; epoch: number; lat: number; lon: number; compare: string; yaw: number; pitch: number; radius: number; layers: Record<string, boolean>; labels: boolean; projection: boolean; answers: boolean }
export function parseSavedScene(raw: string | null): SavedScene | null {
  if (!raw || raw.length > 4000) return null
  try {
    const s = JSON.parse(raw)
    if (s.version !== 1 || !TOPICS.some(t => t.id === s.topic) || !Number.isFinite(s.epoch) || s.epoch < Date.UTC(1900, 0, 1) || s.epoch > Date.UTC(2101, 0, 1)) return null
    for (const key of ['lat', 'lon', 'yaw', 'pitch', 'radius']) if (!Number.isFinite(s[key])) return null
    if (Math.abs(s.lat) > 90 || Math.abs(s.lon) > 180 || Math.abs(s.pitch) > 1.6 || Math.abs(s.yaw) > 1e8 || s.radius < 2.2 || s.radius > 5.6) return null
    if (typeof s.compare !== 'string' || !s.layers || typeof s.layers !== 'object' || Object.values(s.layers).some(v => typeof v !== 'boolean')) return null
    if (s.skin !== undefined && !['satellite', 'atlas', 'ivory'].includes(s.skin)) return null
    if (s.nightShade !== undefined && typeof s.nightShade !== 'boolean') return null
    return { ...s, skin: s.skin ?? 'satellite', nightShade: s.nightShade !== false, labels: s.labels !== false, answers: s.answers !== false, projection: s.projection === true }
  } catch { return null }
}
