import { T_INSERTION, T_TLI_START, T_TLI_END, T_LOI_START, T_LOI_END, T_STABLE } from './moon-voyage/mission'

/** Editorial time is deliberately nonuniform. Every control uses this invertible map. */
export const TIME_KEYS = [
  [0, 0], [18, T_INSERTION], [28, T_TLI_START], [38, T_TLI_END],
  [50, 86400], [62, 216000], [74, T_LOI_START], [84, T_LOI_END], [100, T_STABLE + 1800],
] as const
export const JOURNEY_DURATION = 100
export function missionTimeAt(position: number): number {
  const p = Math.max(0, Math.min(JOURNEY_DURATION, position))
  for (let i = 1; i < TIME_KEYS.length; i++) {
    const [x, t] = TIME_KEYS[i]; const [x0, t0] = TIME_KEYS[i-1]
    if (p <= x) return t0 + (t-t0)*(p-x0)/(x-x0)
  }
  return TIME_KEYS[TIME_KEYS.length-1][1]
}
export function journeyPositionAt(time: number): number {
  for (let i = 1; i < TIME_KEYS.length; i++) {
    const [x, t] = TIME_KEYS[i]; const [x0, t0] = TIME_KEYS[i-1]
    if (time <= t) return Math.max(0, x0 + (x-x0)*(time-t0)/(t-t0))
  }
  return JOURNEY_DURATION
}
export const CHAPTERS = [
  { at: 0, label: '发射', title: '先向上，再向前', body: '土星五号升空后逐渐转向。烧空的级段分离，剩下的火箭继续加速。去月球，先要绕过地球。' },
  { at: 18, label: '绕地', title: '一直下坠，却落不到地上', body: '横向速度接近每秒 7.8 公里，飞船进入约 190 公里高的停泊轨道。发动机关掉，它仍在绕地球飞。' },
  { at: 28, label: '加速', title: '把圆轨道拉向月球', body: '末级再次点火约六分钟，提高速度，把轨道拉成长椭圆。目的地是三天后月球的位置，不是它现在的位置。' },
  { at: 38, label: '滑行', title: '熄火之后，旅程才刚开始', body: '飞船继续沿弯曲的轨迹前进。大部分航程靠惯性与引力，只需少量修正；指令舱、服务舱和登月舱一同奔月。' },
  { at: 62, label: '接近', title: '月球越来越大', body: '地球与月球的引力始终同时存在。靠近月球时，它对飞船的影响越来越强；但引力本身不会保证飞船留在轨道里。' },
  { at: 74, label: '刹车', title: '想留下，就得慢下来', body: '在月球背面，飞船掉头，发动机逆着运动方向推。约六分钟的制动降低轨道能量，让飞掠变成环绕。' },
  { at: 84, label: '绕月', title: '第四天，成为月球的卫星', body: '约 76 小时抵达环月轨道，随后再点火圆化到约 110 公里高。到达的是月球轨道；登陆，还需要另一段旅程。' },
] as const
export function chapterAt(position: number) {
  return CHAPTERS.reduce((index, chapter, i) => position >= chapter.at ? i : index, 0)
}
