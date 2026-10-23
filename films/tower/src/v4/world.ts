// The whole film's 3D world as a function of the frame: one camera path through one city, from blue hour to
// night. Scenes add props (the plot, the stacked floor area, vacancy columns, land-price columns, people) and
// per-building states on top. SCRIPT.md has the bar table this follows.
import { Cam, mixCam } from "../geo/cam";
import { Bldg, CITY } from "../geo/data";
import { toScreen } from "../world/camera";
import { Box, Poly, WorldState } from "../world/engine";
import { barAt, clamp01, EO, EIO, ESO, lerp, ramp, track, tween, window01 } from "./bars";

// ---------- Places (local metres, see src/geo/data.ts) ----------

export const HERO = { x: -128.9, y: -808.2 };
export const PLACES = {
  pingan: { x: -989, y: -378 },
  expo: { x: -548, y: -702 },
  civic: { x: -563, y: 692 },
  lianhua: { x: -584, y: 1784 },
  cbd: { x: -653, y: 148 },
  houhai: { x: -12523, y: -2070 },
  yuehai: { x: -12513, y: -2930 },
};

// Office districts with their Q2 2026 vacancy (莱坊 Knight Frank), anchored on the old map's points.
export const DISTRICTS = [
  { name: "福田 CBD", x: -653, y: 148, vac: 18.0 },
  { name: "车公庙", x: -3839, y: -128, vac: 20.4 },
  { name: "罗湖", x: 5543, y: 268, vac: 27.9 },
  { name: "科技园", x: -12154, y: -1089, vac: 13.8 },
  { name: "后海", x: -12523, y: -2070, vac: 33.1 },
  { name: "前海", x: -17194, y: 34, vac: 25.5 },
  { name: "蛇口", x: -15406, y: -5735, vac: 23.3 },
  { name: "宝安中心区", x: -18268, y: 1951, vac: 27.9 },
];

// The parcel B119-0053: the three footprints' outline, scaled about its centre to the official 6,427.7 m² (示意).
const PARCEL = (() => {
  const r = CITY.hero.parcel;
  const xs = [r[0], r[2], r[4], r[6]];
  const ys = [r[1], r[3], r[5], r[7]];
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const w = Math.max(...xs) - Math.min(...xs);
  const d = Math.max(...ys) - Math.min(...ys);
  const k = Math.sqrt(6427.7 / (w * d));
  return { x: cx, y: cy, w: w * k, d: d * k };
})();
export { PARCEL };

// A standard pitch (105 × 68 m) laid next to the parcel, for scale.
const PITCH = { x: PARCEL.x + 120, y: PARCEL.y + 10, w: 68, d: 105 };
const rect = (x: number, y: number, w: number, d: number) => [x - w / 2, y - d / 2, x + w / 2, y - d / 2, x + w / 2, y + d / 2, x - w / 2, y + d / 2];

// CTBUH towers we light up as headquarters (nearest tower to each named point).
const nearestTower = (x: number, y: number) => {
  let best = 0;
  let bd = Infinity;
  CITY.towers.forEach((t, i) => {
    const d = Math.hypot(t[0] - x, t[1] - y);
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  return best;
};
const poiXY = (name: string) => CITY.pois.find((p) => p.name === name)!;
export const HQ = [
  { label: "腾讯滨海大厦", ...poiXY("腾讯滨海大厦") },
  { label: "华润大厦", ...poiXY("华润大厦(春笋)") },
  { label: "招商银行全球总部", ...poiXY("招商银行全球总部大厦") },
  { label: "平安金融中心", ...poiXY("平安金融中心") },
];
const HQ_TOWERS = new Set(HQ.map((h) => nearestTower(h.x, h.y)));
const PINGAN_OSM = CITY.buildings.findIndex((b) => b.name === "平安金融中心");

// ---------- Camera ----------

type Key = { bar: number; cam: Cam; ease?: (t: number) => number };
const c = (x: number, y: number, z: number, bearing: number, tilt: number, oy = 540, ox = 960): Cam => ({ x, y, z, bearing, tilt, ox, oy });
const LIN = (t: number) => t;

// Story bars: track bar − 2 up to bar 62; bars 62–70 replay track bars 56–64; from bar 70 on, track bar − 6
// (src/v4/bars.ts). Sections: intro → 6, main 6–38, interlude 38–46, main 46–70, climax 70–82, outro 82→.
const CUT = (t: number) => (t > 0 ? 1 : 0);
const KEYS: Key[] = [
  // the question: blue hour over Futian, looking west into the afterglow; one slow push
  { bar: 1.7, cam: c(-760, -430, 1.25, -82, 82, 760) },
  { bar: 4.3, cam: c(-860, -400, 1.55, -86, 81.5, 740), ease: LIN },
  // still building: hard cut to Nanshan's 后海, the newest towers rise out of the ground
  { bar: 4.32, cam: c(-12720, -2620, 0.95, -32, 75, 760), ease: CUT },
  { bar: 6.0, cam: c(-12720, -2540, 1.04, -25, 75, 760), ease: LIN },
  // the answer is in one tower: cut above Futian, dive onto it
  { bar: 6.02, cam: c(HERO.x, HERO.y, 0.55, -10, 52, 700), ease: CUT },
  { bar: 7.3, cam: c(HERO.x, HERO.y, 2.3, -32, 64, 760) },
  { bar: 8.05, cam: c(HERO.x, HERO.y, 2.4, -24, 65, 760), ease: LIN },
  // where it is
  { bar: 8.9, cam: c(-460, 420, 0.36, 0, 30, 560) },
  { bar: 10.05, cam: c(-450, 380, 0.38, 2, 32, 560), ease: LIN },
  // 2008: the plot, the stack, the price
  { bar: 10.9, cam: c(PARCEL.x + 40, PARCEL.y - 10, 2.0, -26, 52, 600) },
  { bar: 12.05, cam: c(PARCEL.x + 40, PARCEL.y - 10, 2.05, -18, 54, 600), ease: LIN },
  { bar: 12.8, cam: c(PARCEL.x + 10, PARCEL.y + 30, 2.5, -16, 74, 820) },
  { bar: 14.05, cam: c(PARCEL.x + 10, PARCEL.y + 30, 2.6, -6, 74, 820), ease: LIN },
  { bar: 14.7, cam: c(PARCEL.x, PARCEL.y, 1.6, 8, 58, 520) },
  { bar: 16.05, cam: c(PARCEL.x, PARCEL.y, 1.65, 14, 58, 520), ease: LIN },
  // ten years of building, orbiting the tower; then the money
  { bar: 16.8, cam: c(HERO.x, HERO.y, 2.1, -48, 70, 700) },
  { bar: 20.95, cam: c(HERO.x, HERO.y, 2.25, 34, 69, 700), ease: LIN },
  // the whole city building at once
  { bar: 21.6, cam: c(-6800, -2600, 0.085, 0, 58, 640) },
  { bar: 24.3, cam: c(-6500, -2400, 0.088, 5, 59, 640), ease: LIN },
  // vacancy by district
  { bar: 25.0, cam: c(-7600, -1300, 0.082, -8, 58, 640) },
  { bar: 27.2, cam: c(-7400, -1200, 0.085, -4, 58, 640), ease: LIN },
  // rents: the CBD at dusk behind the numbers
  { bar: 27.9, cam: c(-720, -620, 0.62, 30, 72, 420) },
  { bar: 33.4, cam: c(-660, -470, 0.72, 52, 73, 420), ease: LIN },
  // the account: the CBD seen low from across the river, the dark ground below carries the charts
  { bar: 34.0, cam: c(HERO.x + 120, HERO.y + 300, 0.82, -6, 82.5, 420) },
  { bar: 45.9, cam: c(HERO.x + 60, HERO.y + 300, 0.9, 4, 82.5, 420), ease: LIN },
  { bar: 46.6, cam: c(HERO.x + 40, HERO.y + 300, 0.98, 6, 82.5, 420) },
  { bar: 48.8, cam: c(HERO.x + 30, HERO.y + 300, 1.0, 8, 82.5, 420), ease: LIN },
  // why still building: the CBD at night; the city has braked
  { bar: 49.4, cam: c(-600, 200, 0.42, 10, 62, 640) },
  { bar: 53.6, cam: c(-620, 160, 0.46, 18, 63, 640), ease: LIN },
  // what is being finished now was decided years ago: 后海 and 深超总, towers rise as the years run
  { bar: 54.2, cam: c(-11250, -2050, 0.4, -8, 70, 700) },
  { bar: 57.8, cam: c(-11150, -2000, 0.43, 0, 70.5, 700), ease: LIN },
  // many towers were never built to rent: its own floors, then headquarters across the city
  { bar: 58.3, cam: c(HERO.x, HERO.y + 40, 2.1, -18, 68, 760) },
  { bar: 59.0, cam: c(HERO.x, HERO.y + 40, 2.15, -14, 68, 760), ease: LIN },
  { bar: 59.7, cam: c(-7200, -1500, 0.1, -6, 62, 620) },
  { bar: 60.6, cam: c(-7100, -1440, 0.102, -4, 62, 620), ease: LIN },
  // 后海: the new headquarters lit, the towers their tenants left go dark
  { bar: 61.1, cam: c(-12560, -2420, 0.62, -24, 74, 760) },
  { bar: 62.9, cam: c(-12560, -2380, 0.68, -18, 74, 760), ease: LIN },
  // 粤海: housing land vs headquarters land, and the condition
  { bar: 63.5, cam: c(-12520, -2860, 0.3, 14, 64, 700) },
  { bar: 68.0, cam: c(-12520, -2860, 0.335, 26, 64, 700), ease: LIN },
  // the taxes become roads, metro, schools
  { bar: 68.6, cam: c(-4500, 1500, 0.03, 0, 34, 520) },
  { bar: 70.05, cam: c(-4450, 1500, 0.0305, 1, 34.5, 520), ease: LIN },
  // zoom out: land money nationwide, as two columns of light standing in 深圳湾
  { bar: 70.9, cam: c(-9400, -3900, 0.13, -6, 72, 880) },
  { bar: 76.2, cam: c(-9300, -3800, 0.14, 4, 72.5, 880), ease: LIN },
  // offices empty elsewhere too: the whole city at night
  { bar: 76.6, cam: c(-6000, -1500, 0.06, 0, 58, 620) },
  { bar: 77.9, cam: c(-5900, -1450, 0.061, 2, 58.5, 620), ease: LIN },
  // the bet lost: 深超总
  { bar: 78.5, cam: c(-9850, -1800, 0.55, -20, 72, 720) },
  { bar: 82.0, cam: c(-9800, -1750, 0.6, -12, 72, 720), ease: LIN },
  // Shenzhen's bet: the next companies, lights coming on across the city
  { bar: 82.6, cam: c(-7000, -1300, 0.09, -4, 62, 620) },
  { bar: 86.0, cam: c(-6800, -1200, 0.095, 2, 63, 620), ease: LIN },
  // 升华: Futian lights up, the trains, the people, back to the first shot
  { bar: 86.9, cam: c(-650, -320, 0.78, -22, 74, 640) },
  { bar: 90.3, cam: c(-620, -300, 0.84, 6, 74, 640), ease: LIN },
  { bar: 90.9, cam: c(-470, -600, 1.2, -24, 68, 660) },
  { bar: 94.5, cam: c(-450, -580, 1.32, -14, 68, 660), ease: LIN },
  { bar: 95.2, cam: c(-760, -430, 1.25, -82, 82, 760) },
  { bar: 102, cam: c(-840, -410, 1.45, -86, 81.6, 750), ease: LIN },
];

const camAtBar = (bar: number): Cam => {
  if (bar <= KEYS[0].bar) return KEYS[0].cam;
  for (let i = 1; i < KEYS.length; i++) {
    const k = KEYS[i];
    if (bar <= k.bar) {
      const p = KEYS[i - 1];
      const t = clamp01((bar - p.bar) / (k.bar - p.bar));
      return mixCam(p.cam, k.cam, (k.ease ?? ESO)(t));
    }
  }
  return KEYS[KEYS.length - 1].cam;
};

// ---------- Time on screen (the year the city shows) ----------

// 后海's newest towers rise in the hook; Futian rewinds to 2008 for the plot and grows back to 2018 while the tower
// is built; the whole city rewinds again and grows 2008 → 2018 → 2026; 后海 and 深超总 rewind to 2016 for the
// towers decided years ago.
export const yearAt = (bar: number) =>
  bar < 8
    ? track(bar, [
        [4.3, 2023.2],
        [4.45, 2023.2],
        [5.2, 2026],
      ], LIN)
    : bar < 20.2
    ? track(bar, [
        [10.2, 2026],
        [10.8, 2008],
        [16.6, 2008],
        [19.0, 2018],
      ], LIN)
    : bar < 40
    ? track(bar, [
        [20.9, 2018],
        [21.6, 2008],
        [23.0, 2018],
        [23.5, 2018],
        [24.3, 2026],
      ], LIN)
    : track(bar, [
        [53.75, 2026],
        [53.85, 2016],
        [54.3, 2016],
        [57.2, 2026],
      ], LIN);

// ---------- Props ----------

const GOLD = "#ffd166";
const ORANGE = "#ff8a3d";

const props = (bar: number, frame: number): { boxes: Box[]; polys: Poly[] } => {
  const boxes: Box[] = [];
  const polys: Poly[] = [];
  // the plot, glowing on the ground from 2008 until the tower covers it
  const plotO = window01(bar, 10.4, 19.2, 0.4);
  if (plotO > 0) {
    boxes.push({ x: PARCEL.x, y: PARCEL.y, w: PARCEL.w, d: PARCEL.d, h: 1.2, color: ORANGE, o: 0.75 * plotO });
    polys.push({ pts: rect(PARCEL.x, PARCEL.y, PARCEL.w, PARCEL.d), color: ORANGE, width: 2.2, o: plotO, closed: true, h: 1.4 });
  }
  // a football pitch beside it
  const pitchO = window01(bar, 10.9, 12.4, 0.3);
  if (pitchO > 0) polys.push({ pts: rect(PITCH.x, PITCH.y, PITCH.w, PITCH.d), color: "#9fe3b0", width: 1.8, o: pitchO, closed: true, h: 1.4, dash: 5 });
  // 15 times the plot: the floor area the plan allows, stacked
  const stackO = window01(bar, 12.3, 16.6, 0.4);
  if (stackO > 0) {
    const n = Math.round(lerp(0, 15, ramp(bar, 12.5, 13.7, EIO)));
    for (let i = 0; i < 15; i++) {
      const show = i < n ? 1 : 0;
      const fade = ramp(bar, 16.0, 16.6); // the stack hands over to the tower as it starts to rise
      const o = show * stackO * (1 - fade);
      if (o <= 0) continue;
      boxes.push({ x: PARCEL.x, y: PARCEL.y, w: PARCEL.w, d: PARCEL.d, h: 1.2, base: 4 + i * 8.5, color: ORANGE, o: 0.13 * o });
      polys.push({ pts: rect(PARCEL.x, PARCEL.y, PARCEL.w, PARCEL.d), color: ORANGE, width: 1.2, o, closed: true, h: 5.6 + i * 8.5 });
    }
  }
  // vacancy columns over the office districts
  const vacO = window01(bar, 24.6, 27.3, 0.4);
  if (vacO > 0) {
    DISTRICTS.forEach((d, i) => {
      const g = ramp(bar, 24.9 + i * 0.12, 25.9 + i * 0.12, EIO);
      const hot = clamp01((d.vac - 13) / 20);
      const col = hot > 0.75 ? "#ff5a5f" : hot > 0.45 ? "#ff8a3d" : "#ffd166";
      boxes.push({ x: d.x, y: d.y, w: 520, d: 520, h: d.vac * 45 * g, color: col, o: 0.55 * vacO, add: true });
    });
  }
  // land price per m² of floor area in 粤海: housing 10.86 万 (2026) vs headquarters 1.11 万 (2025), 1 万 = 90 m
  const priceO = window01(bar, 63.0, 68.3, 0.3);
  if (priceO > 0) {
    const g1 = ramp(bar, 63.6, 64.4, EIO);
    const g2 = ramp(bar, 64.2, 64.7, EIO);
    boxes.push({ x: PLACES.yuehai.x - 260, y: PLACES.yuehai.y + 120, w: 140, d: 140, h: 10.86 * 90 * g1, color: "#ff5a5f", o: 0.65 * priceO, add: true });
    boxes.push({ x: PLACES.yuehai.x + 120, y: PLACES.yuehai.y - 40, w: 140, d: 140, h: 1.11 * 90 * g2, color: ORANGE, o: 0.85 * priceO, add: true });
  }
  // gold glints over the towers that pass a hundred million in tax (亮起的楼为示意)
  // the city has braked: office land planned for sale, 2021 (52.3 ha) vs 2026 (10 ha), as plates of real size
  // floating over the CBD
  const brakeO = window01(bar, 50.4, 53.7, 0.3);
  if (brakeO > 0) {
    const p1 = ramp(bar, 50.9, 51.6, EO);
    const p2 = ramp(bar, 51.7, 52.4, EO);
    for (const [x, y, side, k, col] of [
      [-1050, -250, Math.sqrt(523000), p1, "#a9c1e0"],
      [420, -250, Math.sqrt(100000), p2, ORANGE],
    ] as [number, number, number, number, string][]) {
      if (k <= 0) continue;
      const sd = side * (0.6 + 0.4 * k);
      boxes.push({ x, y, w: sd, d: sd, h: 3, base: 300, color: col, o: 0.28 * k * brakeO, add: true });
      polys.push({ pts: rect(x, y, sd, sd), color: col, width: 6, o: k * brakeO, closed: true, h: 303 });
    }
  }
  // land money nationwide: 2021 vs 2025, 1 万亿 = 300 m, standing in 深圳湾
  const landO = window01(bar, 70.6, 76.4, 0.4);
  if (landO > 0) {
    const g1 = ramp(bar, 71.0, 71.9, EIO);
    const g2 = ramp(bar, 71.7, 72.5, EIO);
    boxes.push({ x: LAND_COLS[0].x, y: LAND_COLS[0].y, w: 900, d: 900, h: 8.7051 * 300 * g1, color: GOLD, o: 0.6 * landO, add: true });
    boxes.push({ x: LAND_COLS[1].x, y: LAND_COLS[1].y, w: 900, d: 900, h: 4.1518 * 300 * g2, color: ORANGE, o: 0.8 * landO, add: true });
  }
  // people walking from the metro into the tower
  const pplO = window01(bar, 90.6, 94.8, 0.4);
  if (pplO > 0) {
    // from the metro stations (会展中心、岗厦、购物公园、福民) into the towers around them (示意)
    const routes = [
      [-418, -281, -330, -520, -150, -735],
      [303, -267, 120, -560, -112, -760],
      [314, -1343, 60, -1040, -112, -850],
      [-1064, -290, -1020, -330, -990, -380],
      [-418, -281, -700, -320, -960, -370],
      [-418, -281, -300, -100, -132, -94],
      [303, -267, 100, -400, -132, -564],
    ];
    routes.forEach((r, ri) => {
      for (let k = 0; k < 34; k++) {
        const t = (((frame * 0.0036 + k / 34 + ri * 0.17) % 1) + 1) % 1;
        const seg = t < 0.6 ? 0 : 1;
        const u = seg === 0 ? t / 0.6 : (t - 0.6) / 0.4;
        const x = lerp(r[seg * 2], r[seg * 2 + 2], u);
        const y = lerp(r[seg * 2 + 1], r[seg * 2 + 3], u);
        boxes.push({ x, y, w: 6, d: 6, h: 6, base: 0.5, color: "#ffe2b0", o: pplO * Math.min(1, t * 8) * Math.min(1, (1 - t) * 8), add: true });
      }
    });
  }
  return { boxes, polys };
};

export const LAND_COLS = [
  { x: -10200, y: -5600 },
  { x: -8600, y: -5600 },
];
// 深圳湾超级总部基地 (深超总), around the 招商银行全球总部 tower
export const SCZ = { x: -9600, y: -1700 };
// The tower whose dark floors come back on in the last shot: the tallest block near the middle of that frame.
let RELIGHT = -1;
const relightId = () => {
  if (RELIGHT >= 0) return RELIGHT;
  const cam = KEYS[KEYS.length - 1].cam;
  let best = 0;
  let score = -Infinity;
  CITY.buildings.forEach((b, i) => {
    if (b.h < 120) return;
    const [sx, sy, vis] = toScreen(cam, b.cx, b.cy, b.h * 0.5);
    if (!vis || sx < 500 || sx > 1420 || sy < 300 || sy > 1000) return;
    const sc = b.h - Math.abs(sx - 960) * 0.4;
    if (sc > score) {
      score = sc;
      best = i;
    }
  });
  RELIGHT = best;
  return best;
};

const hash01 = (i: number) => {
  const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
};

// Buildings that light up gold in the 亿元楼 count (示意): a fixed random pick of Futian's tall blocks.
const GOLD_PICK: number[] = (() => {
  const tall = CITY.buildings.map((b, i) => [i, b.h] as [number, number]).filter(([, h]) => h >= 60);
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  return tall
    .map(([i]) => [i, rnd()] as [number, number])
    .sort((a, b) => a[1] - b[1])
    .map(([i]) => i);
})();

// ---------- The world at a frame ----------

export const worldAt = (frame: number): WorldState => {
  const bar = barAt(frame);
  const cam = camAtBar(bar);
  const year = yearAt(bar);
  const night = track(bar, [
    [1.7, 0.22],
    [4.3, 0.32],
    [6.0, 0.42],
    [10.2, 0.4],
    [16.6, 0.4],
    [21.0, 0.6],
    [33.6, 0.86],
    [70, 0.92],
  ]);
  // share of windows lit
  const lights = track(bar, [
    [1.7, 0.7],
    [6.0, 0.7],
    [10.2, 0.6],
    [10.9, 0.25],
    [16.6, 0.25],
    [19, 0.6],
    [85.8, 0.7],
    [86.6, 0.3],
    [90.3, 0.3],
    [91.0, 0.55],
    [94.6, 0.55],
    [95.2, 0.85],
  ]);
  // a quarter of the office floors go dark: in the hook, and again in the last shot
  const vacancy = Math.max(
    track(bar, [
      [3.15, 0],
      [3.95, 0.27],
      [4.3, 0.27],
      [4.32, 0],
      [95.9, 0],
      [96.6, 0.25],
    ], LIN),
    window01(bar, 61.3, 62.9, 0.6) * 0.45,
  );
  const built = track(bar, [
    [10.2, 1],
    [10.8, 0],
    [16.6, 0],
    [18.9, 1],
  ], LIN);
  const heroTint = Math.max(window01(bar, 6.4, 8.6, 0.5) * 0.55, window01(bar, 8.3, 10.2, 0.3) * 0.85, window01(bar, 16.5, 19.4, 0.4) * 0.3);
  const goldN = Math.round(track(bar, [
    [86.6, 0],
    [87.4, 50],
    [88.4, 50],
    [89.5, 159],
  ], LIN));
  const goldSet = new Set(GOLD_PICK.slice(0, Math.round((goldN / 159) * Math.min(GOLD_PICK.length, 120))));
  const goldO = window01(bar, 86.4, 94.6, 0.6);

  const { boxes, polys } = props(bar, frame);
  // offices lit floor after floor, so the empty quarter shows when it goes dark
  const full = Math.max(track(bar, [
    [1.7, 0.85],
    [4.3, 0.85],
    [4.32, 0],
  ]), track(bar, [
    [94.9, 0],
    [95.3, 0.8],
  ]));
  // the whole-city shots: towers stand as light needles, twice their height (the screen says so)
  const cityScale = Math.max(window01(bar, 21.0, 27.5, 0.6), window01(bar, 59.4, 60.7, 0.4), window01(bar, 68.2, 70.6, 0.5), window01(bar, 70.6, 78.1, 0.4), window01(bar, 82.4, 86.2, 0.4));
  const hqO = window01(bar, 59.4, 60.7, 0.3);
  // the next companies: tall buildings across the city light up gold, one after another
  const nextFade = window01(bar, 82.5, 86.3, 0.4);
  const nextCo = nextFade > 0 ? ramp(bar, 82.8, 85.6, EIO) * 0.55 : 0;
  // the last shot: after 你会来, the dark floors of 平安金融中心 come back on
  const relight = ramp(bar, 96.95, 97.9, EIO);
  // 后海: the newest towers (headquarters) lit, older towers lose tenants
  const moveOut = window01(bar, 60.9, 62.95, 0.3);

  const exposure =
    1.05 *
    track(bar, [
      [5.3, 1],
      [5.55, 0.66],
      [6.0, 0.66],
      [6.05, 1],
      [33.6, 1],
      [34.6, 0.85],
      [48.6, 0.85],
      [49.2, 0.8],
      [53.6, 0.8],
      [54.2, 1],
      [98.0, 1],
      [100.4, 0.22],
      [101.2, 0],
    ]);

  // while the years run, blocks that just went up flash gold
  const growing = Math.max(window01(bar, 4.35, 5.6, 0.2), window01(bar, 21.6, 24.5, 0.2), window01(bar, 54.2, 57.6, 0.2));
  const bState = (i: number, b: Bldg): [number, number, number, number] => {
    const hs = b.year ? clamp01(year - b.year + 1) : 1;
    let tint = b.year && growing > 0 && year >= b.year - 1 ? growing * clamp01(1.6 - (year - b.year)) * 0.9 : 0;
    if (goldO > 0 && goldSet.has(i)) tint = 0.75 * goldO;
    if (hqO > 0 && i === PINGAN_OSM) tint = hqO;
    if (nextCo > 0 && b.h >= 70 && hash01(i) < nextCo) tint = Math.max(tint, 0.85 * nextFade);
    // its empty floors fill back in and the whole tower warms up, so the moment reads from across the frame
    if (i === relightId() && relight > 0) return [1 + 1.5 * relight, Math.max(tint, 0.55 * relight), hs, 1 - relight];
    if (moveOut > 0 && i >= CITY.buildings.length && b.h >= 60) {
      if (b.year && b.year >= 2023) return [1, moveOut * 0.85, hs, 0];
      return [1, tint, hs, 1];
    }
    return [1, tint, hs, 1];
  };

  return {
    cam,
    night,
    lights,
    vacancy,
    rise: 1,
    roads: 1,
    traffic: frame * 0.55,
    metro: Math.max(window01(bar, 68.3, 70.7, 0.4), window01(bar, 86.4, 94.8, 0.6), window01(bar, 8.4, 10.2, 0.3) * 0.35),
    metroFlow: (bar > 68.2 && bar < 70.8) || (bar > 86.3 && bar < 95) ? frame * 2.2 : undefined,
    led: Math.max(tween(bar, 68, 71, 0, 0.8) * (1 - ramp(bar, 70.6, 71.2)), tween(bar, 84, 87, 0, 0.8)),
    sz: Math.max(window01(bar, 21.0, 27.4, 0.5), window01(bar, 59.4, 60.7, 0.4), window01(bar, 68.2, 70.6, 0.5), window01(bar, 70.6, 78.1, 0.4), window01(bar, 82.4, 86.2, 0.4)) * 0.8,
    cityRoads: Math.max(window01(bar, 21.0, 27.5, 0.5), window01(bar, 53.9, 57.9, 0.4) * 0.7, window01(bar, 59.4, 60.7, 0.4), window01(bar, 70.6, 78.1, 0.4), window01(bar, 82.4, 86.2, 0.4), window01(bar, 68.2, 70.6, 0.5)),
    towers: {
      year,
      ex: 1 + cityScale,
      beacon: 1.1 * cityScale,
      fresh: growing,
      on: 1,
      tint: (i) => (hqO > 0 && HQ_TOWERS.has(i) ? hqO : 0),
    },
    hero: {
      built,
      tint: heroTint,
      hl: window01(bar, 57.9, 59.3, 0.3) > 0 ? { part: 2, from: 29, to: 41, amt: window01(bar, 57.9, 59.3, 0.3) } : undefined,
    },
    tint: (bar > 82.3 && bar < 95) || growing > 0 ? GOLD : ORANGE,
    boxes,
    polys,
    exposure,
    bState,
    full,
    time: frame / 30,
  };
};

export const camAt = (frame: number) => camAtBar(barAt(frame));
