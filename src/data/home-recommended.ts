/**
 * 用户确认的首页精选池：前 10 个为首选，其余为次选。
 * 精选卡片、海报球与精选连续探索共用本名单；完整目录保持独立。
 */
export const recommendedWorldIds = [
  'equation-wormhole',
  'black-hole-flyby',
  'periodic-table',
  'formula-bloom',
  'eclipses',
  'cow-anatomy',
  'kakeya-needle',
  'galaxy-collision',
  'aurora',
  'butterfly-effect',
  'moon-voyage',
  'fluid-sim',
  'mandelbrot-zoom',
  'fourier',
  'riemann-primes',
] as const

export const HOME_PRIMARY_COUNT = 10

export const recommendedWorldRank = new Map<string, number>(
  recommendedWorldIds.map((worldId, index) => [worldId, index]),
)
