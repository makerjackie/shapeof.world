// The whole film's 3D world as a function of the frame: one camera path through one city, from blue hour to
// night. Scenes add props (the plot, the stacked floor area, vacancy columns, land-price columns, people) and
// per-building states on top. SCRIPT.md has the bar table this follows.
import { Cam, mixCam } from "../geo/cam";
import { Bldg, CITY } from "../geo/data";
import { Box, Poly, WorldState } from "../world/engine";
import { barAt, clamp01, EIO, ESO, lerp, ramp, track, tween, window01 } from "./bars";

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

const KEYS: Key[] = [
  // the question: blue hour over Futian
  { bar: 0, cam: c(-900, -1560, 0.82, 6, 80, 760) },
  { bar: 2.05, cam: c(-860, -1260, 0.98, 13, 79, 740), ease: LIN },
  { bar: 2.9, cam: c(-830, -560, 1.65, 22, 74, 640) },
  { bar: 4.05, cam: c(-800, -470, 1.8, 27, 74, 640), ease: LIN },
  // still building: Nanshan's 后海 skyline, the newest towers rise out of the ground
  { bar: 4.8, cam: c(-12720, -2620, 0.95, -32, 75, 760) },
  { bar: 6.05, cam: c(-12720, -2560, 1.02, -26, 75, 760), ease: LIN },
  // the dive onto the tower
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
  // ten years of building, orbiting the tower
  { bar: 16.8, cam: c(HERO.x, HERO.y, 2.1, -48, 70, 700) },
  { bar: 20.05, cam: c(HERO.x, HERO.y, 2.25, 26, 69, 700), ease: LIN },
  // the whole city building at once
  { bar: 21.0, cam: c(-6800, -2600, 0.085, 0, 58, 640) },
  { bar: 24.05, cam: c(-6500, -2400, 0.088, 5, 59, 640), ease: LIN },
  // vacancy by district
  { bar: 24.9, cam: c(-7600, -1300, 0.082, -8, 58, 640) },
  { bar: 27.05, cam: c(-7400, -1200, 0.085, -4, 58, 640), ease: LIN },
  // rents: the CBD at dusk behind the numbers
  { bar: 27.9, cam: c(-720, -620, 0.62, 30, 72, 420) },
  { bar: 30.05, cam: c(-700, -560, 0.66, 38, 72, 420), ease: LIN },
  // this tower's rent
  { bar: 30.9, cam: c(HERO.x + 10, HERO.y - 40, 3.0, -42, 70, 620) },
  { bar: 33.05, cam: c(HERO.x + 10, HERO.y - 40, 3.1, -34, 70, 620), ease: LIN },
  // the account: the CBD seen low from across the river, the dark water and ground below carry the timeline
  { bar: 33.45, cam: c(HERO.x + 80, HERO.y + 120, 0.75, -20, 62, 520) },
  { bar: 33.9, cam: c(HERO.x + 120, HERO.y + 300, 0.82, -6, 82.5, 420) },
  { bar: 45.9, cam: c(HERO.x + 60, HERO.y + 300, 0.9, 4, 82.5, 420), ease: LIN },
  { bar: 46.6, cam: c(HERO.x + 40, HERO.y + 300, 0.98, 6, 82.5, 420) },
  { bar: 50.05, cam: c(HERO.x + 20, HERO.y + 300, 1.02, 9, 82.5, 420), ease: LIN },
  // its own headquarters
  { bar: 50.9, cam: c(HERO.x, HERO.y + 40, 2.1, -18, 68, 760) },
  { bar: 53.05, cam: c(HERO.x, HERO.y + 40, 2.2, -10, 68, 760), ease: LIN },
  // headquarters across the city
  { bar: 53.9, cam: c(-7200, -1500, 0.1, -6, 62, 620) },
  { bar: 56.05, cam: c(-7000, -1400, 0.104, -2, 62, 620), ease: LIN },
  // 粤海: housing land vs headquarters land
  { bar: 56.4, cam: c(-12520, -2860, 0.3, 14, 64, 700) },
  { bar: 60.3, cam: c(-12520, -2860, 0.33, 24, 64, 700), ease: LIN },
  // the taxes become roads, metro, schools
  { bar: 61.4, cam: c(-4500, 1500, 0.03, 0, 34, 520) },
  { bar: 62.05, cam: c(-4450, 1500, 0.0305, 1, 34.5, 520), ease: LIN },
  // 升华: Futian lights up, the trains, the people, back to the first shot
  { bar: 62.9, cam: c(-650, -320, 0.78, -22, 74, 640) },
  { bar: 66.05, cam: c(-620, -300, 0.84, 6, 74, 640), ease: LIN },
  { bar: 66.9, cam: c(-470, -600, 1.2, -24, 68, 660) },
  { bar: 70.05, cam: c(-450, -580, 1.32, -14, 68, 660), ease: LIN },
  { bar: 71.0, cam: c(-860, -1260, 0.98, 13, 79, 740) },
  { bar: 77, cam: c(-840, -1140, 1.04, 17, 79.5, 740), ease: LIN },
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

// Futian rewinds to 2008 for the plot, grows back to 2018 while the tower is built; the whole city rewinds again and
// grows 2008 → 2018 → 2026.
export const yearAt = (bar: number) =>
  bar < 8
    ? track(bar, [
        [4.2, 2026],
        [4.35, 2023.2],
        [4.75, 2023.2],
        [5.45, 2026],
      ], LIN)
    : bar < 20
    ? track(bar, [
        [10, 2026],
        [10.8, 2008],
        [16.4, 2008],
        [19.0, 2018],
      ], LIN)
    : track(bar, [
        [20.2, 2018],
        [20.9, 2008],
        [22.5, 2018],
        [23.0, 2018],
        [24.0, 2026],
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
  const pitchO = window01(bar, 10.9, 12.6, 0.3);
  if (pitchO > 0) polys.push({ pts: rect(PITCH.x, PITCH.y, PITCH.w, PITCH.d), color: "#9fe3b0", width: 1.8, o: pitchO, closed: true, h: 1.4, dash: 5 });
  // 15 times the plot: the floor area the plan allows, stacked
  const stackO = window01(bar, 12.1, 16.6, 0.4);
  if (stackO > 0) {
    const n = Math.round(lerp(0, 15, ramp(bar, 12.2, 13.6, EIO)));
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
  const vacO = window01(bar, 24.4, 27.2, 0.4);
  if (vacO > 0) {
    DISTRICTS.forEach((d, i) => {
      const g = ramp(bar, 24.6 + i * 0.12, 25.6 + i * 0.12, EIO);
      const hot = clamp01((d.vac - 13) / 20);
      const col = hot > 0.75 ? "#ff5a5f" : hot > 0.45 ? "#ff8a3d" : "#ffd166";
      boxes.push({ x: d.x, y: d.y, w: 520, d: 520, h: d.vac * 45 * g, color: col, o: 0.55 * vacO, add: true });
    });
  }
  // land price per m² of floor area in 粤海: housing 10.86 万 (2026) vs headquarters 1.11 万 (2025), 1 万 = 90 m
  const priceO = window01(bar, 55.9, 60.4, 0.3);
  if (priceO > 0) {
    const g1 = ramp(bar, 56.4, 57.3, EIO);
    const g2 = ramp(bar, 57.1, 57.7, EIO);
    boxes.push({ x: PLACES.yuehai.x - 260, y: PLACES.yuehai.y + 120, w: 140, d: 140, h: 10.86 * 90 * g1, color: "#ff5a5f", o: 0.65 * priceO, add: true });
    boxes.push({ x: PLACES.yuehai.x + 120, y: PLACES.yuehai.y - 40, w: 140, d: 140, h: 1.11 * 90 * g2, color: ORANGE, o: 0.85 * priceO, add: true });
  }
  // gold glints over the towers that pass a hundred million in tax (亮起的楼为示意)
  // people walking from the metro into the tower
  const pplO = window01(bar, 66.4, 70.6, 0.4);
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
    [0, 0.28],
    [4, 0.45],
    [8, 0.5],
    [10.4, 0.38],
    [16, 0.38],
    [20, 0.62],
    [33.5, 0.88],
    [62, 0.92],
  ]);
  // the opening: every office lit, then a quarter of the floors go dark
  const lights = track(bar, [
    [0, 0.62],
    [2.2, 0.8],
    [4.6, 0.8],
    [6, 0.6],
    [10.4, 0.6],
    [10.9, 0.25],
    [16.4, 0.25],
    [19, 0.6],
    [61.8, 0.7],
    [62.6, 0.3],
    [66.2, 0.3],
    [67.0, 0.55],
    [70.4, 0.55],
    [71.2, 0.85],
  ]);
  const vacancy = track(bar, [
    [2.5, 0],
    [3.6, 0.27],
    [5.6, 0.27],
    [6.6, 0],
    [70.9, 0],
    [71.6, 0.25],
  ], LIN);
  const built = track(bar, [
    [10.2, 1],
    [10.8, 0],
    [16.6, 0],
    [18.9, 1],
  ], LIN);
  const heroTint = Math.max(window01(bar, 6.4, 8.6, 0.5) * 0.55, window01(bar, 8.4, 10.2, 0.3) * 0.85, window01(bar, 16.5, 19.4, 0.4) * 0.3);
  const goldN = Math.round(track(bar, [
    [62.7, 0],
    [63.5, 50],
    [64.6, 50],
    [65.7, 159],
  ], LIN));
  const goldSet = new Set(GOLD_PICK.slice(0, Math.round((goldN / 159) * Math.min(GOLD_PICK.length, 120))));
  const goldO = window01(bar, 62.4, 70.8, 0.6);

  const { boxes, polys } = props(bar, frame);
  // the opening and the last shot: offices lit floor after floor, so the empty quarter shows when it goes dark
  const full = Math.max(track(bar, [
    [1.2, 0],
    [2.3, 0.85],
    [4.4, 0.85],
    [5.0, 0],
  ]), track(bar, [
    [70.2, 0],
    [70.8, 0.8],
  ]));
  // the whole-city shots: towers stand as light needles, twice their height (the screen says so)
  const cityScale = Math.max(window01(bar, 20.3, 27.4, 0.6), window01(bar, 53.4, 56.0, 0.5), window01(bar, 60.6, 62.5, 0.5));
  const hqO = window01(bar, 53.3, 55.9, 0.4);

  const exposure =
    1.05 *
    track(bar, [
      [5.3, 1],
      [5.55, 0.62],
      [6.0, 0.62],
      [6.35, 1],
      [33.6, 1],
      [34.6, 0.85],
      [49.6, 0.85],
      [50.6, 1],
      [74.2, 1],
      [76.6, 0.22],
      [77.4, 0],
    ]);

  // while the years run, blocks that just went up flash gold
  const growing = Math.max(window01(bar, 4.6, 5.7, 0.2), window01(bar, 20.9, 24.3, 0.2));
  const bState = (i: number, b: Bldg): [number, number, number, number] => {
    const hs = b.year ? clamp01(year - b.year + 1) : 1;
    let tint = b.year && growing > 0 && year >= b.year - 1 ? growing * clamp01(1.6 - (year - b.year)) * 0.9 : 0;
    if (goldO > 0 && goldSet.has(i)) tint = 0.75 * goldO;
    if (hqO > 0 && i === PINGAN_OSM) tint = hqO;
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
    metro: Math.max(window01(bar, 60.6, 70.6, 0.6), window01(bar, 8.4, 10.2, 0.3) * 0.35),
    metroFlow: bar > 60.4 && bar < 71 ? frame * 2.2 : undefined,
    led: tween(bar, 60, 63, 0, 0.8),
    sz: Math.max(window01(bar, 20.4, 27.3, 0.5), window01(bar, 53.4, 62.4, 0.5)) * 0.8,
    cityRoads: Math.max(window01(bar, 4.3, 6.4, 0.4), window01(bar, 20.3, 27.4, 0.5), window01(bar, 53.4, 62.4, 0.5)),
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
      hl: window01(bar, 30.6, 33.3, 0.3) > 0 ? { part: 1, from: 10, to: 19, amt: window01(bar, 30.6, 33.3, 0.3) } : window01(bar, 50.6, 53.3, 0.3) > 0 ? { part: 2, from: 29, to: 41, amt: window01(bar, 50.6, 53.3, 0.3) } : undefined,
    },
    tint: (bar > 61 && bar < 71) || growing > 0 ? GOLD : ORANGE,
    boxes,
    polys,
    exposure,
    bState,
    full,
  };
};

export const camAt = (frame: number) => camAtBar(barAt(frame));
