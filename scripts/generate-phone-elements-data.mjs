/**
 * Bake the "phone elements" atlas: element × phone compartment × producing country.
 *
 * Sources (all public / permissively licensed — see DATA_SOURCES.md):
 * 1. Per-device element masses: Bookhagen, B. (2020) "Metallic resources in smartphones",
 *    PhD thesis, University of Vienna, doi:10.25365/thesis.66189, Appendix IIa
 *    (three smartphones of the 2012–2017 generation, n = 3, averaged triplicates,
 *    ICP-MS/ICP-OES, batteries excluded for safety reasons). Also published as
 *    Bookhagen et al. (2020), Resources Policy 68, 101750.
 * 2. Compartment attribution: same work — the PCB holds 90 % of measured Au, 98 % Cu,
 *    99 % Pd, 86 % In, 93 % Ta; NdFeB magnets (loudspeaker, camera, vibration motor,
 *    1.03 g per device) hold 96 % of measured rare earths and 40 % of Ga, and assay
 *    19–21 wt-% Nd, 6 wt-% Pr, ~2 wt-% Gd, ~1 wt-% Dy.
 * 3. Country production shares: USGS Mineral Commodity Summaries 2025 (U.S. Government
 *    work, public domain), production year 2024 (estimated). Shares are rounded to whole
 *    percent; the basis (mine / smelter / refinery) is stored per element because USGS
 *    only publishes refinery output for several by-product metals.
 * 4. Crustal abundance: CRC Handbook of Chemistry and Physics, "Abundance of Elements in
 *    the Earth's Crust and in the Sea", ppm by mass.
 * 5. Country outlines and label points: Natural Earth 1:110m Admin 0 Countries
 *    (public domain), already vendored at public/assets/flow/countries.geojson.
 *
 * Run: node scripts/generate-phone-elements-data.mjs
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const countriesPath = resolve(root, 'public/assets/flow/countries.geojson')
const outputPath = resolve(root, 'public/assets/phone-elements/atlas.json')

/* ------------------------------------------------------------------ parts */

/** Compartments of a generic smartphone. Masses are indicative, not brand data. */
const parts = [
  { id: 'glass', zh: '盖板玻璃', en: 'Cover glass', tagZh: '铝硅酸盐', tagEn: 'Aluminosilicate' },
  { id: 'display', zh: '显示模组', en: 'Display module', tagZh: '氧化铟锡透明电极', tagEn: 'Indium tin oxide electrode' },
  { id: 'frame', zh: '金属中框', en: 'Metal frame', tagZh: '铝镁合金 / 不锈钢', tagEn: 'Al–Mg alloy / stainless steel' },
  { id: 'board', zh: '主板', en: 'Logic board', tagZh: '全机金属最密集的一层', tagEn: 'The densest metal layer in the phone' },
  { id: 'soc', zh: '主芯片', en: 'Main chip', tagZh: '硅晶圆与化合物半导体', tagEn: 'Silicon wafer and compound semiconductors' },
  { id: 'camera', zh: '摄像头模组', en: 'Camera module', tagZh: '对焦与防抖靠钕磁体', tagEn: 'Focus and stabilisation ride on NdFeB magnets' },
  { id: 'speaker', zh: '扬声器', en: 'Speaker', tagZh: '全机最大的一块钕磁体', tagEn: 'The largest NdFeB magnet in the phone' },
  { id: 'motor', zh: '振动马达', en: 'Vibration motor', tagZh: '高密度配重', tagEn: 'High-density counterweight' },
  { id: 'battery', zh: '电池', en: 'Battery', tagZh: '钴酸锂正极 · 石墨负极', tagEn: 'Lithium cobalt oxide cathode · graphite anode' },
  { id: 'antenna', zh: '天线与接口', en: 'Antenna and connectors', tagZh: '镀金触点与焊料', tagEn: 'Gold-plated contacts and solder' },
]

/* ------------------------------------------------------- producer records */

/**
 * top: [ISO alpha-2, share of world production in %] — USGS Mineral Commodity
 * Summaries 2025, production year 2024 (estimated), rounded to whole percent.
 * basis: mine = mine production; smelter = smelter/plant output; refinery = refinery
 * output (the only series USGS publishes for several by-product metals).
 */
const production = {
  Co: { basis: 'mine', top: [['CD', 76], ['ID', 10], ['RU', 3]] },
  REE: { basis: 'mine', top: [['CN', 69], ['US', 12], ['MM', 8]] },
  Ga: { basis: 'refinery', top: [['CN', 98], ['JP', 1], ['KR', 1]] },
  W: { basis: 'mine', top: [['CN', 80], ['VN', 4], ['RU', 2]] },
  Ta: { basis: 'mine', top: [['CD', 40], ['RW', 20], ['BR', 12]] },
  In: { basis: 'refinery', top: [['CN', 57], ['KR', 21], ['JP', 13]] },
  Si: { basis: 'smelter', top: [['CN', 68], ['RU', 7], ['BR', 4]] },
  Mg: { basis: 'smelter', top: [['CN', 89], ['US', 4], ['BR', 2]] },
  Li: { basis: 'mine', top: [['AU', 37], ['CL', 20], ['CN', 17]] },
  Ni: { basis: 'mine', top: [['ID', 59], ['PH', 9], ['RU', 5]] },
  Cu: { basis: 'mine', top: [['CL', 23], ['CD', 14], ['PE', 11]] },
  Au: { basis: 'mine', top: [['CN', 12], ['RU', 9], ['AU', 9]] },
  Ag: { basis: 'mine', top: [['MX', 25], ['CN', 13], ['PE', 12]] },
  Pd: { basis: 'mine', top: [['RU', 43], ['ZA', 35], ['CA', 8]] },
  Pt: { basis: 'mine', top: [['ZA', 67], ['RU', 11], ['ZW', 9]] },
  Sn: { basis: 'mine', top: [['CN', 23], ['ID', 17], ['MM', 9]] },
  Ti: { basis: 'mine', top: [['CN', 35], ['MZ', 12], ['ZA', 10]] },
  Fe: { basis: 'mine', top: [['AU', 35], ['BR', 17], ['CN', 11]] },
  Al: { basis: 'smelter', top: [['CN', 59], ['IN', 6], ['RU', 5]] },
  Cr: { basis: 'mine', top: [['ZA', 44], ['TR', 14], ['KZ', 13]] },
  Zn: { basis: 'mine', top: [['CN', 33], ['PE', 11], ['AU', 10]] },
  Mn: { basis: 'mine', top: [['ZA', 36], ['GA', 19], ['AU', 13]] },
  Ba: { basis: 'mine', top: [['CN', 32], ['IN', 21], ['MA', 12]] },
  Zr: { basis: 'mine', top: [['AU', 34], ['ZA', 25], ['CN', 11]] },
  Mo: { basis: 'mine', top: [['CN', 41], ['CL', 15], ['US', 13]] },
  Nb: { basis: 'mine', top: [['BR', 91], ['CA', 8]] },
  Bi: { basis: 'refinery', top: [['CN', 80], ['LA', 8], ['KR', 4]] },
  Sb: { basis: 'mine', top: [['CN', 48], ['TJ', 21], ['TR', 6]] },
  Ge: { basis: 'refinery', top: [['CN', 60], ['RU', 10], ['US', 7]] },
  Pb: { basis: 'mine', top: [['CN', 42], ['AU', 10], ['US', 6]] },
  V: { basis: 'mine', top: [['CN', 70], ['RU', 16], ['ZA', 7]] },
  C: { basis: 'mine', top: [['CN', 78], ['MG', 6], ['MZ', 5]] },
}

/* --------------------------------------------------------------- elements */

/**
 * mg   — measured average content of one device WITHOUT its battery
 *        (Bookhagen 2020, Appendix IIa; rare earths split by the measured
 *        NdFeB magnet assay). `est: true` marks a stoichiometric estimate.
 * crust — crustal abundance in ppm by mass (CRC Handbook).
 * parts — compartments the element sits in.
 */
const elements = [
  { z: 26, sym: 'Fe', zh: '铁', en: 'Iron', mg: 16411, crust: 56300, parts: ['frame', 'board', 'speaker', 'motor'] },
  { z: 14, sym: 'Si', zh: '硅', en: 'Silicon', mg: 9272, crust: 282000, parts: ['soc', 'board', 'glass', 'display'] },
  { z: 12, sym: 'Mg', zh: '镁', en: 'Magnesium', mg: 7237, crust: 23300, parts: ['frame', 'board', 'glass'] },
  { z: 13, sym: 'Al', zh: '铝', en: 'Aluminium', mg: 6686, crust: 82300, parts: ['frame', 'board', 'glass', 'display', 'battery'] },
  { z: 29, sym: 'Cu', zh: '铜', en: 'Copper', mg: 6610, crust: 60, parts: ['board', 'antenna', 'speaker', 'motor', 'soc', 'battery'] },
  { z: 28, sym: 'Ni', zh: '镍', en: 'Nickel', mg: 2605, crust: 84, parts: ['board', 'frame', 'antenna'] },
  { z: 24, sym: 'Cr', zh: '铬', en: 'Chromium', mg: 2024, crust: 102, parts: ['frame', 'board'] },
  { z: 30, sym: 'Zn', zh: '锌', en: 'Zinc', mg: 652, crust: 70, parts: ['board', 'frame'] },
  { z: 50, sym: 'Sn', zh: '锡', en: 'Tin', mg: 639, crust: 2.3, parts: ['board', 'antenna', 'display'] },
  { z: 38, sym: 'Sr', zh: '锶', en: 'Strontium', mg: 445, crust: 370, parts: ['board', 'speaker'] },
  { z: 56, sym: 'Ba', zh: '钡', en: 'Barium', mg: 351, crust: 425, parts: ['board'] },
  { z: 74, sym: 'W', zh: '钨', en: 'Tungsten', mg: 232, crust: 1.25, parts: ['motor', 'board', 'soc'] },
  { z: 60, sym: 'Nd', zh: '钕', en: 'Neodymium', mg: 206, crust: 41.5, parts: ['speaker', 'camera', 'motor'] },
  { z: 25, sym: 'Mn', zh: '锰', en: 'Manganese', mg: 187, crust: 950, parts: ['board', 'frame', 'battery'] },
  { z: 22, sym: 'Ti', zh: '钛', en: 'Titanium', mg: 115, crust: 5650, parts: ['board', 'frame', 'soc'] },
  { z: 59, sym: 'Pr', zh: '镨', en: 'Praseodymium', mg: 62, crust: 9.2, parts: ['speaker', 'camera', 'motor'] },
  { z: 27, sym: 'Co', zh: '钴', en: 'Cobalt', mg: 55, crust: 25, parts: ['board', 'soc', 'battery'] },
  { z: 73, sym: 'Ta', zh: '钽', en: 'Tantalum', mg: 40, crust: 2, parts: ['board', 'soc'] },
  { z: 40, sym: 'Zr', zh: '锆', en: 'Zirconium', mg: 38, crust: 165, parts: ['board'] },
  { z: 42, sym: 'Mo', zh: '钼', en: 'Molybdenum', mg: 38, crust: 1.2, parts: ['board'] },
  { z: 64, sym: 'Gd', zh: '钆', en: 'Gadolinium', mg: 21, crust: 6.2, parts: ['speaker', 'camera', 'motor'] },
  { z: 79, sym: 'Au', zh: '金', en: 'Gold', mg: 16.8, crust: 0.004, parts: ['board', 'antenna', 'soc', 'camera'] },
  { z: 23, sym: 'V', zh: '钒', en: 'Vanadium', mg: 12.6, crust: 120, parts: ['board'] },
  { z: 47, sym: 'Ag', zh: '银', en: 'Silver', mg: 11.2, crust: 0.075, parts: ['board', 'antenna'] },
  { z: 66, sym: 'Dy', zh: '镝', en: 'Dysprosium', mg: 10, crust: 5.2, parts: ['speaker', 'camera', 'motor'] },
  { z: 82, sym: 'Pb', zh: '铅', en: 'Lead', mg: 9.9, crust: 14, parts: ['board'] },
  { z: 31, sym: 'Ga', zh: '镓', en: 'Gallium', mg: 8.4, crust: 19, parts: ['soc', 'speaker', 'camera', 'motor', 'board'] },
  { z: 41, sym: 'Nb', zh: '铌', en: 'Niobium', mg: 4.2, crust: 20, parts: ['board'] },
  { z: 33, sym: 'As', zh: '砷', en: 'Arsenic', mg: 3.4, crust: 1.8, parts: ['soc', 'board'] },
  { z: 49, sym: 'In', zh: '铟', en: 'Indium', mg: 2.6, crust: 0.25, parts: ['board', 'display'] },
  { z: 46, sym: 'Pd', zh: '钯', en: 'Palladium', mg: 1.9, crust: 0.015, parts: ['board', 'antenna'] },
  { z: 3, sym: 'Li', zh: '锂', en: 'Lithium', mg: 0.91, crust: 20, parts: ['board', 'battery'] },
  { z: 72, sym: 'Hf', zh: '铪', en: 'Hafnium', mg: 0.61, crust: 3, parts: ['soc', 'board'] },
  { z: 83, sym: 'Bi', zh: '铋', en: 'Bismuth', mg: 0.55, crust: 0.009, parts: ['board', 'antenna'] },
  { z: 51, sym: 'Sb', zh: '锑', en: 'Antimony', mg: 0.51, crust: 0.2, parts: ['board'] },
  { z: 78, sym: 'Pt', zh: '铂', en: 'Platinum', mg: 0.48, crust: 0.005, parts: ['board'] },
  { z: 32, sym: 'Ge', zh: '锗', en: 'Germanium', mg: 0.35, crust: 1.5, parts: ['soc', 'board'] },
  { z: 80, sym: 'Hg', zh: '汞', en: 'Mercury', mg: 0.04, crust: 0.085, parts: ['board'] },
  // Battery: not part of the ICP measurement (cells were excluded for safety).
  // Stoichiometric estimate for a ~12 Wh LiCoO2 / graphite cell — marked as such.
  { z: 6, sym: 'C', zh: '碳（石墨）', en: 'Carbon (graphite)', mg: 8000, est: true, crust: 200, parts: ['battery'] },
  { z: 27, sym: 'Co', battery: true, mg: 6500, est: true, parts: ['battery'] },
  { z: 3, sym: 'Li', battery: true, mg: 850, est: true, parts: ['battery'] },
]

/**
 * Why an element is there — one plain sentence, shown when it is selected.
 * Only elements with a well-documented function get a line.
 */
const roles = {
  Fe: ['钢制屏蔽罩、螺丝与磁体的骨架', 'Steel shields, screws and the backbone of every magnet'],
  Si: ['晶圆、玻璃与几乎所有芯片的基底', 'Wafers, glass, and the substrate under almost every chip'],
  Mg: ['轻量中框合金，也在玻璃里', 'Lightweight frame alloy, and inside the glass'],
  Al: ['中框、屏幕背板与电池集流体', 'Frame, display backplate and battery current collector'],
  Cu: ['所有导线、线圈与主板铜箔', 'Every wire, coil and the copper foil of the board'],
  Ni: ['镀层与屏蔽罩，防止接点氧化', 'Plating and shielding that keeps contacts from corroding'],
  Cr: ['不锈钢部件的抗锈成分', 'What keeps the stainless-steel parts from rusting'],
  Zn: ['压铸小结构件与镀层', 'Die-cast micro-structures and plating'],
  Sn: ['焊料：把上千个元件焊在板上', 'Solder: what fixes a thousand components to the board'],
  Sr: ['玻璃与陶瓷电容中的碱土成分', 'An alkaline-earth ingredient of glass and ceramic capacitors'],
  Ba: ['陶瓷电容的钛酸钡介质', 'Barium titanate, the dielectric inside ceramic capacitors'],
  W: ['振动马达的高密度配重', 'The high-density counterweight that makes the phone buzz'],
  Nd: ['钕铁硼永磁体的主角', 'The lead role in every NdFeB permanent magnet'],
  Mn: ['合金与电池正极的添加元素', 'An additive in alloys and in battery cathodes'],
  Ti: ['颜料、镀层与芯片阻挡层', 'Pigment, plating and the barrier layers inside chips'],
  Pr: ['与钕一起进入磁体，便宜一些', 'Rides into the magnet beside neodymium, a little cheaper'],
  Co: ['电池正极；主板上只有几十毫克', 'The battery cathode; the board itself holds only tens of milligrams'],
  Ta: ['钽电容：体积极小、容量极大', 'Tantalum capacitors: tiny volume, large capacitance'],
  Zr: ['陶瓷元件与耐热涂层', 'Ceramic components and heat-resistant coatings'],
  Mo: ['薄膜电极与合金强化', 'Thin-film electrodes and alloy strengthening'],
  Gd: ['提高磁体的温度稳定性', 'Keeps the magnet stable when it heats up'],
  Au: ['触点镀金，因为它不会氧化', 'Contacts are gold-plated because gold does not corrode'],
  V: ['钢材与合金的强化元素', 'A strengthener in steels and alloys'],
  Ag: ['导电胶与银浆走线', 'Conductive adhesive and printed silver traces'],
  Dy: ['让磁体在发热时不退磁', 'Stops the magnet from demagnetising when it gets hot'],
  Pb: ['旧焊料残留与合金杂质', 'Left over from older solders and alloy impurities'],
  Ga: ['砷化镓射频芯片与 LED', 'Gallium arsenide radio chips and LEDs'],
  Nb: ['电容与合金中的微量元素', 'A trace element in capacitors and alloys'],
  As: ['砷化镓射频器件的另一半', 'The other half of gallium arsenide radio parts'],
  In: ['氧化铟锡：透明又导电的触摸层', 'Indium tin oxide: the touch layer that is transparent and conducts'],
  Pd: ['多层陶瓷电容的内电极', 'The inner electrodes of multilayer ceramic capacitors'],
  Li: ['电池里往返穿梭的那颗离子', 'The ion that shuttles back and forth inside the battery'],
  Hf: ['芯片栅极的高介电常数薄膜', 'The high-k film under a transistor gate'],
  Bi: ['无铅焊料的低熔点成分', 'The low-melting ingredient of lead-free solder'],
  Sb: ['阻燃剂与半导体掺杂', 'Flame retardant and semiconductor dopant'],
  Pt: ['触点与传感器上的极薄镀层', 'An extremely thin plating on contacts and sensors'],
  Ge: ['高速晶体管的硅锗合金', 'Silicon-germanium alloy in high-speed transistors'],
  Hg: ['痕量杂质，早已不是设计成分', 'A trace impurity, no longer a design ingredient'],
  C: ['电池负极的石墨层', 'The graphite layers of the battery anode'],
}

/* ---------------------------------------------- Natural Earth: land + pins */

const wanted = new Set()
for (const record of Object.values(production)) for (const [code] of record.top) wanted.add(code)

/** Natural Earth ships the long official Chinese form for a few states; map-label length wins. */
const shortNameZh = { CN: '中国', CD: '刚果（金）', KR: '韩国' }

const geo = JSON.parse(readFileSync(countriesPath, 'utf8'))

/** Douglas–Peucker on lon/lat degrees; tolerance in degrees. */
function simplify(points, tolerance) {
  if (points.length < 3) return points
  let index = 0
  let maxDistance = 0
  const [ax, ay] = points[0]
  const [bx, by] = points[points.length - 1]
  const dx = bx - ax
  const dy = by - ay
  const length = Math.hypot(dx, dy) || 1
  for (let i = 1; i < points.length - 1; i += 1) {
    const [px, py] = points[i]
    const distance = Math.abs(dy * px - dx * py + bx * ay - by * ax) / length
    if (distance > maxDistance) {
      maxDistance = distance
      index = i
    }
  }
  if (maxDistance <= tolerance) return [points[0], points[points.length - 1]]
  return [
    ...simplify(points.slice(0, index + 1), tolerance).slice(0, -1),
    ...simplify(points.slice(index), tolerance),
  ]
}

/**
 * Douglas–Peucker degenerates on a closed ring (first point === last point, so the
 * baseline has zero length). Split the ring at the vertex farthest from its start,
 * simplify both halves, then stitch them back together.
 */
function simplifyRing(ring, tolerance) {
  const closed = ring.length > 1
    && ring[0][0] === ring[ring.length - 1][0]
    && ring[0][1] === ring[ring.length - 1][1]
  const points = closed ? ring.slice(0, -1) : ring.slice()
  if (points.length < 6) return closed ? [...points, points[0]] : points
  let far = 0
  let farDistance = -1
  for (let i = 1; i < points.length; i += 1) {
    const distance = Math.hypot(points[i][0] - points[0][0], points[i][1] - points[0][1])
    if (distance > farDistance) {
      farDistance = distance
      far = i
    }
  }
  const head = simplify(points.slice(0, far + 1), tolerance)
  const tail = simplify([...points.slice(far), points[0]], tolerance)
  const merged = [...head.slice(0, -1), ...tail]
  return merged
}

function ringArea(points) {
  let area = 0
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    area += (points[j][0] - points[i][0]) * (points[j][1] + points[i][1])
  }
  return Math.abs(area / 2)
}

const land = []
const countries = {}

for (const feature of geo.features) {
  const properties = feature.properties ?? {}
  const code = properties.ISO_A2_EH ?? properties.ISO_A2
  if (wanted.has(code) && !countries[code]) {
    countries[code] = {
      zh: shortNameZh[code] ?? String(properties.NAME_ZH ?? properties.NAME),
      en: String(properties.NAME ?? properties.NAME_EN),
      lon: Number(properties.LABEL_X),
      lat: Number(properties.LABEL_Y),
    }
  }
  const polygons = feature.geometry?.type === 'Polygon'
    ? [feature.geometry.coordinates]
    : feature.geometry?.type === 'MultiPolygon'
      ? feature.geometry.coordinates
      : []
  for (const polygon of polygons) {
    const outer = polygon[0]
    if (!outer || outer.length < 4) continue
    if (ringArea(outer) < 1.2) continue
    const simplified = simplifyRing(outer.map(([lon, lat]) => [lon, lat]), 0.55)
    if (simplified.length < 4) continue
    land.push(simplified.flatMap(([lon, lat]) => [Math.round(lon * 10) / 10, Math.round(lat * 10) / 10]))
  }
}

for (const code of wanted) {
  const record = countries[code]
  if (!record || !Number.isFinite(record.lon) || !Number.isFinite(record.lat)) {
    throw new Error(`Missing Natural Earth record for country code ${code}`)
  }
}

/* ------------------------------------------------------------------ build */

const partIds = new Set(parts.map((part) => part.id))
const rows = []
for (const element of elements) {
  for (const part of element.parts) {
    if (!partIds.has(part)) throw new Error(`${element.sym}: unknown compartment ${part}`)
  }
  const key = ['Nd', 'Pr', 'Dy', 'Gd'].includes(element.sym) ? 'REE' : element.sym
  const record = production[key]
  const role = roles[element.sym]
  rows.push({
    z: element.z,
    sym: element.sym,
    zh: element.zh,
    en: element.en,
    mg: element.mg,
    ...(element.est ? { est: 1 } : {}),
    ...(element.battery ? { battery: 1 } : {}),
    ...(element.crust === undefined ? {} : { crust: element.crust }),
    parts: element.parts,
    ...(role ? { roleZh: role[0], roleEn: role[1] } : {}),
    ...(record ? { basis: record.basis, top: record.top } : {}),
  })
}

// Merge the battery rows into their element so the UI holds one card per element.
const merged = []
for (const row of rows) {
  if (!row.battery) {
    merged.push(row)
    continue
  }
  const host = merged.find((candidate) => candidate.sym === row.sym)
  if (!host) throw new Error(`Battery row for ${row.sym} has no measured host row`)
  host.batteryMg = row.mg
  host.parts = [...new Set([...host.parts, ...row.parts])]
}

merged.sort((left, right) => (right.mg + (right.batteryMg ?? 0)) - (left.mg + (left.batteryMg ?? 0)))

const atlas = {
  meta: {
    /** Measured device mass without the battery, Bookhagen 2020. */
    deviceMassG: 110.76,
    magnetMassG: 1.03,
    boardMassG: 15.73,
    measuredMetals: 53,
    devicesPerTonne: 10800,
    /** Au in a whole device is 34× richer than rich primary gold ore; on the PCB, 234×. */
    goldOreFactorDevice: 34,
    goldOreFactorBoard: 234,
    productionYear: 2024,
    productionRelease: 'USGS Mineral Commodity Summaries 2025',
    measurementYears: '2012–2017',
  },
  parts,
  elements: merged,
  countries,
  land,
}

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, `${JSON.stringify(atlas)}\n`)

const bytes = Buffer.byteLength(JSON.stringify(atlas))
const withProduction = merged.filter((row) => row.top).length
console.log(
  `phone-elements atlas: ${merged.length} elements (${withProduction} with production data), `
  + `${parts.length} compartments, ${Object.keys(countries).length} countries, ${land.length} land rings, `
  + `${(bytes / 1024).toFixed(1)} KiB`,
)
