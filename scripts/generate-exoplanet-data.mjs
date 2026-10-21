/**
 * 生成「系外行星猎手」世界用的系外行星目录。
 *
 * 首选数据源：NASA Exoplanet Archive TAP API（pscomppars 表，公开免认证）。
 * 网络不可达时默认报错退出，绝不用内置清单覆盖已入库的数据集；只有显式传入
 * `--allow-fallback`（离线重建）才写入内置的著名系统清单（参数取自公开文献/档案，宁少勿错）。
 *
 * 用法：node scripts/generate-exoplanet-data.mjs [--allow-fallback]
 * 输出：public/assets/exoplanets/catalog.json
 */
import { writeFile, mkdir } from 'node:fs/promises'

const TAP_URL = 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync'
const OUTPUT_PATH = new URL('../public/assets/exoplanets/catalog.json', import.meta.url)

/**
 * TAP 正常返回的系统数下限。低于它说明上游表结构变了或响应被截断——此时
 * 覆盖已入库目录会静默退化数据，宁可失败。
 */
const MINIMUM_ARCHIVE_SYSTEMS = 200

const allowFallback = process.argv.includes('--allow-fallback')

/** R_earth / R_sun（IAU 2015 nominal solar radius 695700 km，地球赤道半径 6378 km 近似 6371 km 均可用） */
const EARTH_OVER_SUN_RADIUS = 6371 / 695700
const EARTH_MASSES_PER_JUPITER = 317.83

/** 著名系统白名单：保证历史上/科普上重要的系统一定被收录。 */
const FAMOUS_NAMES = [
  // 里程碑
  '51 Peg b', // 1995 第一颗主序星行星（视向速度）
  'PSR B1257+12 b', 'PSR B1257+12 c', 'PSR B1257+12 d', // 1992 第一批系外行星
  '47 UMa b', '70 Vir b', 'ups And b', 'ups And c',
  'HD 209458 b', // 1999 第一次凌日测光
  'HD 189733 b',
  'eps Eri b',
  // 近邻恒星（视向速度）
  'Proxima Cen b', 'Ross 128 b', "Teegarden's Star b", "Teegarden's Star c",
  'Wolf 1061 c', 'GJ 667 C c', 'GJ 581 e', 'GJ 876 d',
  'GJ 15 A b', 'HD 40307 g', 'GJ 357 d',
  // 著名凌日系统
  'TRAPPIST-1 b', 'TRAPPIST-1 c', 'TRAPPIST-1 d', 'TRAPPIST-1 e',
  'TRAPPIST-1 f', 'TRAPPIST-1 g', 'TRAPPIST-1 h',
  'Kepler-90 i', // Kepler-90 系统在档案中宿主名为 KOI-351
  'KOI-351 b', 'KOI-351 c', 'KOI-351 d', 'KOI-351 e', 'KOI-351 f', 'KOI-351 g', 'KOI-351 h',
  'Kepler-186 f', 'Kepler-452 b', 'Kepler-22 b', 'K2-18 b', 'LHS 1140 b',
  'TOI-700 d', 'TOI-700 e', '55 Cancri e', 'GJ 1214 b', 'GJ 436 b',
  'Kepler-16 b', 'Kepler-10 b', 'CoRoT-7 b', 'Kepler-11 f', 'Kepler-11 g',
  'Kepler-20 e', 'Kepler-20 f', 'Kepler-37 b', 'Kepler-42 c', 'Kepler-42 d',
  'Kepler-62 e', 'Kepler-62 f', 'Kepler-69 c', 'Kepler-138 d', 'Kepler-444 b',
  'Kepler-1649 c', 'WASP-12 b', 'WASP-17 b', 'WASP-39 b', 'WASP-96 b',
  'HAT-P-7 b', 'HAT-P-32 b', 'KELT-9 b', 'TrES-2 b', 'WASP-33 b',
  'NGTS-1 b', 'AU Mic b', 'L 98-59 b', 'L 98-59 c', 'L 98-59 d',
  'TOI-270 b', 'TOI-270 c', 'TOI-270 d', 'K2-3 b', 'K2-3 c', 'K2-3 d',
  'LTT 1445 A b', 'Wolf 503 b', 'TOI-1231 b', 'GJ 367 b', 'LHS 475 b',
  'V1298 Tau b', 'HATS-6 b', 'HD 80606 b', '55 Cnc e',
  // 直接成像
  'HR 8799 b', 'HR 8799 c', 'bet Pic b',
]

const FIELDS = 'pl_name,hostname,pl_orbper,pl_rade,pl_bmasse,sy_dist,disc_year,discoverymethod,st_rad,st_teff,st_mass'

async function tapQuery(adql, timeoutMs = 40000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const params = new URLSearchParams({ query: adql, format: 'json', maxrec: '100000' })
    const response = await fetch(`${TAP_URL}?${params}`, { signal: controller.signal })
    if (!response.ok) throw new Error(`TAP ${response.status}`)
    return await response.json()
  } finally {
    clearTimeout(timer)
  }
}

function round(value, digits) {
  if (value == null || !Number.isFinite(value)) return null
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

/** 凌日深度 (Rp/R*)^2，单位 ppm；缺半径或恒星半径时为 null。 */
function transitDepthPpm(radiusEarth, starRadiusSolar) {
  if (radiusEarth == null || starRadiusSolar == null || starRadiusSolar <= 0) return null
  const ratio = (radiusEarth * EARTH_OVER_SUN_RADIUS) / starRadiusSolar
  return Math.round(ratio * ratio * 1e6)
}

function toEntry(row, featured) {
  return {
    name: row.pl_name,
    host: row.hostname,
    periodDays: round(row.pl_orbper, 4),
    radiusEarth: round(row.pl_rade, 3),
    massEarth: round(row.pl_bmasse, 2),
    distancePc: round(row.sy_dist, 2),
    year: row.disc_year ?? null,
    method: row.discoverymethod ?? null,
    depthPpm: transitDepthPpm(row.pl_rade, row.st_rad),
    starRadiusSolar: round(row.st_rad, 3),
    starTeffK: row.st_teff != null ? Math.round(row.st_teff) : null,
    starMassSolar: round(row.st_mass, 3),
    featured,
  }
}

function selectFromArchive(famousRows, poolRows, rvRows) {
  const byName = new Map()
  for (const row of famousRows) byName.set(row.pl_name, toEntry(row, true))

  const complete = poolRows.filter(
    (row) => row.pl_orbper != null && row.pl_rade != null && row.st_rad != null && row.sy_dist != null,
  )
  const withDepth = complete.map((row) => ({
    row,
    depth: transitDepthPpm(row.pl_rade, row.st_rad) ?? 0,
  }))

  // 最近的凌日系统
  const nearest = [...withDepth].sort((a, b) => a.row.sy_dist - b.row.sy_dist).slice(0, 130)
  // 信号最强（深度/距离）的系统，补充远处深凌日目标
  const strongest = [...withDepth]
    .sort((a, b) => b.depth / b.row.sy_dist - a.depth / a.row.sy_dist)
    .slice(0, 110)
  for (const item of [...nearest, ...strongest]) {
    if (!byName.has(item.row.pl_name)) byName.set(item.row.pl_name, toEntry(item.row, false))
  }

  // 最近的视向速度系统（无半径，供摆动模式展示）
  const rv = rvRows
    .filter((row) => row.pl_orbper != null && row.pl_bmasse != null && row.sy_dist != null)
    .sort((a, b) => a.sy_dist - b.sy_dist)
    .slice(0, 30)
  for (const row of rv) {
    if (!byName.has(row.pl_name)) byName.set(row.pl_name, toEntry(row, false))
  }

  return [...byName.values()]
    .sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999) || a.name.localeCompare(b.name))
    .slice(0, 300)
}

/** 网络不可达时的手工目录（著名系统，真实参数；质量/半径缺省为 null）。 */
function fallbackEntries() {
  // [name, host, periodDays, radiusEarth, massEarth, distancePc, year, method, starRadiusSolar, starTeffK]
  const rows = [
    ['PSR B1257+12 b', 'PSR B1257+12', 25.262, null, 0.02, 710, 1992, 'Pulsar Timing', null, null],
    ['PSR B1257+12 c', 'PSR B1257+12', 66.5419, null, 4.3, 710, 1992, 'Pulsar Timing', null, null],
    ['PSR B1257+12 d', 'PSR B1257+12', 98.2114, null, 3.9, 710, 1994, 'Pulsar Timing', null, null],
    ['51 Pegasi b', '51 Pegasi', 4.230785, null, 146, 15.5, 1995, 'Radial Velocity', 1.27, 5793],
    ['47 Ursae Majoris b', '47 Ursae Majoris', 1078, null, 804, 13.9, 1996, 'Radial Velocity', 1.26, 5882],
    ['70 Virginis b', '70 Virginis', 116.6884, null, 2380, 17.9, 1996, 'Radial Velocity', 1.94, 5493],
    ['Upsilon Andromedae b', 'Upsilon Andromedae', 4.617136, null, 219, 13.47, 1996, 'Radial Velocity', 1.56, 6213],
    ['Upsilon Andromedae c', 'Upsilon Andromedae', 241.02, null, 628, 13.47, 1999, 'Radial Velocity', 1.56, 6213],
    ['HD 209458 b', 'HD 209458', 3.52474859, 15.7, 232, 48.4, 1999, 'Transit', 1.19, 6091],
    ['Epsilon Eridani b', 'Epsilon Eridani', 2502, null, 248, 3.2, 2000, 'Radial Velocity', 0.735, 5036],
    ['HD 80606 b', 'HD 80606', 111.4367, 11.2, 1320, 66.3, 2001, 'Radial Velocity', 1.0, 5645],
    ['Gliese 876 d', 'Gliese 876', 1.93778, null, 6.83, 4.69, 2005, 'Radial Velocity', 0.376, 3350],
    ['HD 189733 b', 'HD 189733', 2.21857312, 12.8, 363, 19.77, 2005, 'Transit', 0.805, 5050],
    ['TrES-2 b', 'TrES-2', 2.470613402, 13.4, 381, 230, 2006, 'Transit', 1.0, 5850],
    ['Gliese 581 e', 'Gliese 581', 3.149, null, 1.94, 6.3, 2009, 'Radial Velocity', 0.31, 3480],
    ['GJ 1214 b', 'GJ 1214', 1.58040433, 2.68, 8.17, 14.64, 2009, 'Transit', 0.215, 3252],
    ['CoRoT-7 b', 'CoRoT-7', 0.85359165, 1.58, 4.8, 150, 2009, 'Transit', 0.87, 5275],
    ['WASP-17 b', 'WASP-17', 3.735438, 22.3, 155, 406, 2009, 'Transit', 1.38, 6650],
    ['HAT-P-7 b', 'HAT-P-7', 2.204729805, 15.3, 566, 325, 2008, 'Transit', 1.84, 6389],
    ['WASP-12 b', 'WASP-12', 1.0914203, 20.9, 467, 430, 2008, 'Transit', 1.66, 6290],
    ['HR 8799 b', 'HR 8799', 170325, 13.5, 2230, 41.3, 2008, 'Imaging', 1.34, 7190],
    ['HR 8799 c', 'HR 8799', 69387, 13.5, 3180, 41.3, 2008, 'Imaging', 1.34, 7190],
    ['Beta Pictoris b', 'Beta Pictoris', 8033, 15.3, 3810, 19.44, 2008, 'Imaging', 1.8, 8040],
    ['WASP-33 b', 'WASP-33', 1.21986967, 17.9, 673, 116, 2010, 'Transit', 1.44, 7430],
    ['Kepler-11 f', 'Kepler-11', 46.68876, 2.61, 2.3, 613, 2010, 'Transit', 1.07, 5683],
    ['Kepler-11 g', 'Kepler-11', 118.38074, 3.33, 25, 613, 2010, 'Transit', 1.07, 5683],
    ['Kepler-10 b', 'Kepler-10', 0.837495, 1.47, 3.33, 186, 2011, 'Transit', 1.056, 5708],
    ['Kepler-16 b', 'Kepler-16', 228.776, 8.45, 106, 75, 2011, 'Transit', 0.65, 4450],
    ['Kepler-22 b', 'Kepler-22', 289.8623, 2.4, null, 193, 2011, 'Transit', 0.98, 5518],
    ['WASP-39 b', 'WASP-39', 4.0552941, 14.2, 89, 215, 2011, 'Transit', 0.94, 5340],
    ['Kepler-20 e', 'Kepler-20', 6.098493, 0.87, null, 290, 2011, 'Transit', 0.94, 5466],
    ['Kepler-20 f', 'Kepler-20', 19.57706, 1.03, null, 290, 2011, 'Transit', 0.94, 5466],
    ['HAT-P-32 b', 'HAT-P-32', 2.150008, 22.2, 272, 320, 2011, 'Transit', 1.36, 6201],
    ['Kepler-42 c', 'Kepler-42', 0.45328509, 0.73, null, 40, 2012, 'Transit', 0.175, 3068],
    ['Kepler-42 d', 'Kepler-42', 1.856169, 0.57, null, 40, 2012, 'Transit', 0.175, 3068],
    ['Kepler-37 b', 'Kepler-37', 13.3675, 0.32, null, 64, 2013, 'Transit', 0.77, 5357],
    ['Kepler-62 e', 'Kepler-62', 122.3874, 1.61, null, 368, 2013, 'Transit', 0.64, 4925],
    ['Kepler-62 f', 'Kepler-62', 267.291, 1.41, null, 368, 2013, 'Transit', 0.64, 4925],
    ['Kepler-69 c', 'Kepler-69', 242.4613, 1.71, null, 746, 2013, 'Transit', 0.81, 5638],
    ['Kepler-90 b', 'Kepler-90', 7.008151, 1.31, null, 779, 2013, 'Transit', 1.2, 5930],
    ['Kepler-90 h', 'Kepler-90', 331.60059, 11.32, null, 779, 2013, 'Transit', 1.2, 5930],
    ['WASP-96 b', 'WASP-96', 3.4252602, 13.4, 152, 355, 2013, 'Transit', 1.05, 5540],
    ['Kepler-186 f', 'Kepler-186', 129.9441, 1.17, null, 178.5, 2014, 'Transit', 0.47, 3755],
    ['Kepler-138 d', 'Kepler-138', 23.0883, 1.51, 2.1, 67, 2014, 'Transit', 0.53, 3871],
    ['Kapteyn c', 'Kapteyn', 121.9, null, 7.0, 3.93, 2014, 'Radial Velocity', 0.291, 3550],
    ['GJ 15 A b', 'GJ 15 A', 11.4433, null, 3.03, 3.56, 2014, 'Radial Velocity', 0.38, 3567],
    ['Kepler-452 b', 'Kepler-452', 384.843, 1.63, null, 552, 2015, 'Transit', 1.11, 5757],
    ['K2-3 b', 'K2-3', 10.05403, 2.29, null, 44, 2015, 'Transit', 0.55, 3896],
    ['K2-3 c', 'K2-3', 24.64692, 1.77, null, 44, 2015, 'Transit', 0.55, 3896],
    ['K2-3 d', 'K2-3', 44.56046, 1.54, null, 44, 2015, 'Transit', 0.55, 3896],
    ['K2-18 b', 'K2-18', 32.94488, 2.61, 8.63, 38, 2015, 'Transit', 0.47, 3457],
    ['Kepler-444 b', 'Kepler-444', 3.6001053, 0.4, null, 36, 2015, 'Transit', 0.75, 5046],
    ['Wolf 1061 c', 'Wolf 1061', 17.8719, null, 3.4, 4.31, 2015, 'Radial Velocity', 0.307, 3342],
    ['HATS-6 b', 'HATS-6', 3.3252662, 11.2, 101, 149, 2015, 'Transit', 0.57, 3724],
    ['TRAPPIST-1 b', 'TRAPPIST-1', 1.510826, 1.116, 1.374, 12.43, 2016, 'Transit', 0.1192, 2566],
    ['TRAPPIST-1 c', 'TRAPPIST-1', 2.421937, 1.097, 1.308, 12.43, 2016, 'Transit', 0.1192, 2566],
    ['TRAPPIST-1 d', 'TRAPPIST-1', 4.049219, 0.788, 0.388, 12.43, 2016, 'Transit', 0.1192, 2566],
    ['TRAPPIST-1 e', 'TRAPPIST-1', 6.101013, 0.92, 0.692, 12.43, 2016, 'Transit', 0.1192, 2566],
    ['TRAPPIST-1 f', 'TRAPPIST-1', 9.20754, 1.045, 1.039, 12.43, 2016, 'Transit', 0.1192, 2566],
    ['TRAPPIST-1 g', 'TRAPPIST-1', 12.352446, 1.129, 1.321, 12.43, 2016, 'Transit', 0.1192, 2566],
    ['TRAPPIST-1 h', 'TRAPPIST-1', 18.772866, 0.755, 0.326, 12.43, 2017, 'Transit', 0.1192, 2566],
    ['Proxima Centauri b', 'Proxima Centauri', 11.186, null, 1.07, 1.295, 2016, 'Radial Velocity', 0.1542, 3042],
    ['KELT-9 b', 'KELT-9', 1.4811235, 21.2, 915, 189, 2016, 'Transit', 2.36, 10170],
    ['LHS 1140 b', 'LHS 1140', 24.73723, 1.73, 5.6, 15, 2017, 'Transit', 0.21, 3216],
    ['Ross 128 b', 'Ross 128', 9.8658, null, 1.4, 3.37, 2017, 'Radial Velocity', 0.197, 3192],
    ['NGTS-1 b', 'NGTS-1', 2.647298, 14.9, 254, 206, 2017, 'Transit', 0.573, 3916],
    ['Kepler-90 i', 'Kepler-90', 14.44912, 1.32, null, 779, 2017, 'Transit', 1.2, 5930],
    ['55 Cnc e', '55 Cnc', 0.73654653, 1.875, 7.99, 12.59, 2004, 'Radial Velocity', 0.94, 5172],
    ['GJ 436 b', 'GJ 436', 2.64389779, 4.33, 22.2, 9.76, 2004, 'Radial Velocity', 0.455, 3586],
    ['Gliese 667 C c', 'Gliese 667 C', 28.123, null, 3.81, 7.24, 2009, 'Radial Velocity', 0.42, 3445],
    ['HD 40307 g', 'HD 40307', 197.8, null, 9.6, 12.9, 2012, 'Radial Velocity', 0.72, 4956],
    ["Teegarden's Star b", "Teegarden's Star", 4.90634, null, 1.05, 3.83, 2019, 'Radial Velocity', 0.107, 2904],
    ["Teegarden's Star c", "Teegarden's Star", 11.416, null, 1.33, 3.83, 2019, 'Radial Velocity', 0.107, 2904],
    ['L 98-59 b', 'L 98-59', 2.2530057, 0.85, 0.4, 10.62, 2019, 'Transit', 0.312, 3536],
    ['L 98-59 c', 'L 98-59', 3.6906214, 1.39, 2.22, 10.62, 2019, 'Transit', 0.312, 3536],
    ['L 98-59 d', 'L 98-59', 7.4507245, 1.61, 1.94, 10.62, 2019, 'Transit', 0.312, 3536],
    ['TOI-270 b', 'TOI-270', 3.3600798, 1.25, 1.58, 22.48, 2019, 'Transit', 0.4, 3506],
    ['TOI-270 c', 'TOI-270', 5.6595731, 2.42, 6.14, 22.48, 2019, 'Transit', 0.4, 3506],
    ['TOI-270 d', 'TOI-270', 11.3795715, 2.13, 4.78, 22.48, 2019, 'Transit', 0.4, 3506],
    ['LTT 1445 A b', 'LTT 1445 A', 5.35882, 1.3, 2.87, 6.87, 2019, 'Transit', 0.268, 3337],
    ['V1298 Tau b', 'V1298 Tau', 24.1396, 10.5, null, 108, 2019, 'Transit', 1.31, 4945],
    ['GJ 357 d', 'GJ 357', 55.661, null, 6.1, 9.44, 2019, 'Radial Velocity', 0.337, 3496],
    ['AU Mic b', 'AU Mic', 8.46321, 4.19, null, 9.71, 2020, 'Transit', 0.817, 3662],
    ['TOI-700 d', 'TOI-700', 37.42458, 1.19, 1.72, 31.13, 2020, 'Transit', 0.42, 3461],
    ['TOI-700 e', 'TOI-700', 27.8097, 0.95, null, 31.13, 2023, 'Transit', 0.42, 3461],
    ['Kepler-1649 c', 'Kepler-1649', 19.53527, 1.06, null, 92, 2020, 'Transit', 0.239, 3240],
    ['Wolf 503 b', 'Wolf 503', 6.00118, 2.05, null, 44.5, 2018, 'Transit', 0.69, 4716],
    ['TOI-1231 b', 'TOI-1231', 24.245586, 3.65, 15.4, 27.49, 2021, 'Transit', 0.48, 3553],
    ['GJ 367 b', 'GJ 367', 0.32192528, 0.72, 0.55, 9.41, 2021, 'Transit', 0.457, 3522],
    ['LHS 475 b', 'LHS 475', 2.029088, 0.955, 0.91, 12.48, 2023, 'Transit', 0.256, 3295],
  ]
  return rows.map(([name, host, periodDays, radiusEarth, massEarth, distancePc, year, method, starRadiusSolar, starTeffK]) => ({
    name,
    host,
    periodDays,
    radiusEarth,
    massEarth,
    distancePc,
    year,
    method,
    depthPpm: transitDepthPpm(radiusEarth, starRadiusSolar),
    starRadiusSolar,
    starTeffK,
    starMassSolar: null,
    featured: true,
  }))
}

async function main() {
  let planets = null
  let source = 'NASA Exoplanet Archive (TAP, pscomppars)'
  try {
    const inList = FAMOUS_NAMES.map((name) => `'${name.replace(/'/g, "''")}'`).join(',')
    const [famousRows, poolRows, rvRows] = await Promise.all([
      tapQuery(`select ${FIELDS} from pscomppars where pl_name in (${inList})`),
      tapQuery(
        `select ${FIELDS} from pscomppars where pl_orbper is not null and pl_rade is not null ` +
          `and st_rad is not null and sy_dist is not null and discoverymethod = 'Transit'`,
      ),
      tapQuery(
        `select ${FIELDS} from pscomppars where pl_orbper is not null and pl_bmasse is not null ` +
          `and pl_rade is null and sy_dist is not null and discoverymethod = 'Radial Velocity'`,
      ),
    ])
    planets = selectFromArchive(famousRows, poolRows, rvRows)
    if (planets.length < MINIMUM_ARCHIVE_SYSTEMS) {
      throw new Error(`TAP 只返回 ${planets.length} 个系统，低于下限 ${MINIMUM_ARCHIVE_SYSTEMS}`)
    }
    console.log(`TAP: famous=${famousRows.length}/${FAMOUS_NAMES.length}, pool=${poolRows.length}, rv=${rvRows.length} -> ${planets.length} systems`)
  } catch (error) {
    if (!allowFallback) {
      console.error(`TAP 拉取失败（${error.message}）。`)
      console.error('拒绝用内置手工目录覆盖已入库的系外行星数据集。如确需离线重建，请显式传入 --allow-fallback。')
      process.exitCode = 1
      return
    }
    console.warn(`TAP 拉取失败（${error.message}），按 --allow-fallback 使用内置手工目录。`)
    planets = fallbackEntries()
    source = '内置著名系统目录（参数取自 NASA Exoplanet Archive 公开值）'
  }

  const catalog = {
    generatedFrom: source,
    generatedAt: new Date().toISOString().slice(0, 10),
    note: 'depthPpm = (Rp/R*)^2，凌日深度（百万分之一）；radiusEarth/massEarth 为 null 表示未测定。',
    planets,
  }
  await mkdir(new URL('.', OUTPUT_PATH), { recursive: true })
  const json = `${JSON.stringify(catalog)}\n`
  await writeFile(OUTPUT_PATH, json)
  const kb = Math.round(Buffer.byteLength(json) / 1024)
  const withDepth = planets.filter((p) => p.depthPpm != null).length
  console.log(`Wrote ${planets.length} planets (${withDepth} with transit depth) -> ${OUTPUT_PATH.pathname} (${kb} KB)`)
  if (kb > 400) console.warn('WARNING: catalog exceeds 400 KB budget')
}

await main()
