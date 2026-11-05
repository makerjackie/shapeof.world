// 金价两百年 v4 · look test (about 25 s). The v3 brand (header, act label, serif numbers, the central-bank table, tag chips,
// the red 金价暴跌 frame) on a new stage: the price chart stands on a tilted plane, a dotted world map lies in front of it as a
// floor with a gold column for each central bank. The clock is not linear: it runs fast through calm stretches and slows to single
// trading days at the events, every event on a bar of 「兴衰」. The camera follows the story: in close for a crash, out for a
// 28-year wait. Our own FX: 金花 sparks on new highs, molten drips on crashes, a crisis ripple across the map, a 解套 wire, bill rain.
// Safe area: x 60..940, y 200..1440.
import React, { useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, Audio, Sequence, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { SANS, SERIF, fontsReady } from "./fonts6";
import DATA from "./sample2_data.json";

const W = 1080;
const H = 1920;
const FPS = 30;
const BAR = (k: number) => 0.05 + 4 * (60 / 130) * k;
const LB = (k: number) => BAR(4 + k); // part B: the score from its bar 40 on
const T_END = LB(9) + 0.7;
export const SAMPLE2_FRAMES = Math.round(T_END * FPS);
const SL = 70;
const SR = 930;

// ---------------- palette (v3)
const GOLD = "#ffc94d";
const GOLD_RGB = "255,201,77";
const RED = "#ff3b2f";
const RED_RGB = "255,59,47";
const ASH = "#d8dde0";
const ASH_RGB = "216,221,224";
const WHITE = "#f6f7f8";
const MUTED = "#9aa0a6";
const BILL_RGB = "118,176,128";

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const eo3 = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const env = (t: number, t0: number, a = 0.02, d = 0.3) => (t < t0 - a ? 0 : t < t0 ? (t - t0 + a) / a : Math.exp(-(t - t0) / d));
const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let q = a;
    q = Math.imul(q ^ (q >>> 15), q | 1);
    q ^= q + Math.imul(q ^ (q >>> 7), q | 61);
    return ((q ^ (q >>> 14)) >>> 0) / 4294967296;
  };
};
const yf = (y: number, m: number, d: number) => {
  const doy = (Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000 + 1;
  return y + (doy - 0.5) / (y % 4 === 0 ? 366 : 365);
};
const fmt = (v: number) => Math.round(v).toLocaleString("en-US");

// ---------------- data
type DJ = { p: number[][]; res: Record<string, [number, number][]>; walcl: [number, number][]; map: { lon0: number; lat0: number; step: number; cols: number; rows: number; i: string; j: string; w: string } };
const DJS = DATA as unknown as DJ;
const P = DJS.p; // [year, close, kind 0 annual/1 monthly/2 daily, o, h, l, 元/克]
const NP = P.length;
const PY = Float64Array.from(P.map((p) => p[0]));
const idxAt = (y: number) => {
  let lo = 0;
  let hi = NP - 1;
  if (y <= PY[0]) return 0;
  if (y >= PY[hi]) return hi;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (PY[m] <= y) lo = m;
    else hi = m;
  }
  return lo;
};
const priceAt = (y: number) => {
  const i = idxAt(y);
  if (i >= NP - 1 || y <= PY[0]) return P[i][1];
  const u = (y - PY[i]) / (PY[i + 1] - PY[i]);
  return lerp(P[i][1], P[i + 1][1], P[i + 1][2] === 2 ? eo3(u) : u); // trading days land with a jolt
};
const cnyAt = (y: number) => P[idxAt(y)][6];
const dateOf = (y: number) => {
  const yr = Math.floor(y);
  const days = yr % 4 === 0 ? 366 : 365;
  const d = new Date(Date.UTC(yr, 0, Math.round((y - yr) * days + 0.5)));
  return [yr, d.getUTCMonth() + 1, d.getUTCDate()] as const;
};
const resAt = (name: string, y: number) => {
  const s = DJS.res[name];
  let v = 0;
  for (const [yy, t] of s) if (yy <= y + 1e-6) v = t;
  return v;
};
const walclAt = (y: number) => {
  let v = DJS.walcl[0][1];
  for (const [yy, x] of DJS.walcl) if (yy <= y) v = x;
  return v;
};
// Fed funds target (upper bound), 2008: 2.00 → 1.50 (10-08) → 1.00 (10-29) → 0.25 (12-16)
const FED: [number, number][] = [
  [yf(2008, 4, 30), 2.0],
  [yf(2008, 10, 8), 1.5],
  [yf(2008, 10, 29), 1.0],
  [yf(2008, 12, 16), 0.25],
];
const fedAt = (y: number) => {
  let v = FED[0][1];
  for (const [yy, r] of FED) if (yy <= y) v = r;
  return v;
};

// ---------------- dates that matter
const D = {
  a0: yf(2026, 1, 16),
  pk26: yf(2026, 1, 29),
  cr26: yf(2026, 1, 30),
  b0: yf(2007, 6, 1),
  y1980: 1980.05464,
  fix: yf(2008, 1, 2),
  k1000: yf(2008, 3, 17),
  lehman: yf(2008, 9, 15),
  up9: yf(2008, 9, 17),
  oct23: yf(2008, 10, 23),
  low08: yf(2008, 11, 13),
  qe: yf(2008, 11, 25),
  zero: yf(2008, 12, 16),
  y09: yf(2009, 12, 31),
  sp: yf(2011, 8, 5),
  pk11: yf(2011, 8, 22),
};

// ---------------- the clock: head (year) against time; ease kinds: m mixed, s smooth
const HK: [number, number, "m" | "s"][] = [
  [0, D.a0, "m"],
  [BAR(1), D.pk26, "m"],
  [BAR(2) - 0.03, D.pk26, "m"],
  [BAR(2) + 0.16, D.cr26, "m"],
  [BAR(3.5), D.cr26, "m"],
  [BAR(4) - 0.06, D.b0, "s"],
  [LB(1), D.fix, "m"],
  [LB(2), D.k1000, "m"],
  [LB(3), D.lehman, "m"],
  [LB(3.5), D.up9, "m"],
  [LB(4), D.oct23, "m"],
  [LB(4.6), D.low08, "m"],
  [LB(5), D.qe, "m"],
  [LB(5.5), D.zero, "m"],
  [LB(6.5), D.y09, "m"],
  [LB(7.5), D.sp, "m"],
  [LB(8), D.pk11, "m"],
  [999, D.pk11, "m"],
];
const headAt = (t: number) => {
  for (let k = 0; k < HK.length - 1; k++) {
    const [t0, y0] = HK[k];
    const [t1, y1, kind] = HK[k + 1];
    if (t < t1) {
      const u = clamp((t - t0) / (t1 - t0));
      return lerp(y0, y1, kind === "s" ? smooth(u) : 0.55 * u + 0.45 * smooth(u));
    }
  }
  return HK[HK.length - 1][1];
};

// ---------------- the view window (years × US$), keyed per scene
type VSpec = { f?: [number, number]; x?: [number, number]; y: "a" | [number, number] };
const VK: [number, VSpec][] = [
  [0, { f: [0.095, 0.014], y: "a" }],
  [BAR(2) - 0.25, { f: [0.08, 0.014], y: "a" }],
  [BAR(2) + 0.45, { f: [0.062, 0.016], y: "a" }],
  [BAR(3) - 0.1, { x: [2024.85, 2026.3], y: "a" }],
  [BAR(3.55), { x: [2024.85, 2026.3], y: "a" }],
  [BAR(4) - 0.06, { x: [1968, 2008.95], y: [0, 1150] }],
  [LB(1) + 0.25, { x: [1968, 2008.95], y: [0, 1150] }],
  [LB(1.9), { x: [2006.8, 2008.95], y: "a" }],
  [LB(2.7), { f: [0.5, 0.06], y: "a" }],
  [LB(3), { f: [0.3, 0.045], y: "a" }],
  [LB(5.6), { f: [0.34, 0.05], y: "a" }],
  [LB(6.6), { f: [1.7, 0.2], y: "a" }],
  [LB(7.9), { x: [2007.4, 2012.0], y: [500, 2060] }],
  [999, { x: [2007.4, 2012.0], y: [500, 2060] }],
];
const rawX = (s: VSpec, h: number): [number, number] => (s.f ? [h - s.f[0], h + s.f[1]] : s.x!);
const fitY = (x0: number, x1: number, h: number): [number, number] => {
  const i0 = idxAt(x0);
  const i1 = idxAt(Math.min(x1, h));
  let mn = Infinity;
  let mx = -Infinity;
  for (let i = i0; i <= i1; i++) {
    const p = P[i];
    const hi = p[2] === 2 ? p[4] : p[1];
    const lo = p[2] === 2 ? p[5] : p[1];
    if (hi > mx) mx = hi;
    if (lo < mn) mn = lo;
  }
  const hp = priceAt(h);
  mn = Math.min(mn, hp);
  mx = Math.max(mx, hp);
  const r = Math.max(mx - mn, mx * 0.04);
  return [mn - 0.16 * r, mx + 0.34 * r];
};
const viewRaw = (t: number, h: number) => {
  let k = 0;
  while (k < VK.length - 2 && t >= VK[k + 1][0]) k++;
  const [t0, a] = VK[k];
  const [t1, b] = VK[k + 1];
  const u = smooth(clamp((t - t0) / (t1 - t0)));
  const xa = rawX(a, h);
  const xb = rawX(b, h);
  const x0 = lerp(xa[0], xb[0], u);
  const x1 = lerp(xa[1], xb[1], u);
  const ya = a.y === "a" ? fitY(x0, x1, h) : a.y;
  const yb = b.y === "a" ? fitY(x0, x1, h) : b.y;
  return [x0, x1, lerp(ya[0], yb[0], u), lerp(ya[1], yb[1], u)] as const;
};

// ---------------- events: cards, stats and FX, each on a bar
type Tag = "新高" | "暴跌" | "危机" | "解套" | "印钞" | "政策" | "回看";
type Ev = {
  t: number;
  t1?: number;
  y: number;
  tag?: Tag;
  date?: string;
  title?: string;
  sub?: string;
  stat?: string;
  statSub?: string;
  statTone?: "gold" | "red";
  fx?: ("spark" | "bigspark" | "drip" | "frame" | "ripple" | "bills" | "wire" | "question" | "rewind")[];
  hit?: number; // shake + dolly
};
const TAG_COL: Record<Tag, string> = { 新高: GOLD, 暴跌: RED, 危机: RED, 解套: GOLD, 印钞: "#7fbf8a", 政策: "#8fb4ff", 回看: MUTED };
const c1000 = Math.round(cnyAt(D.k1000));
const EVS: Ev[] = [
  { t: BAR(1), y: D.pk26, tag: "新高", date: "2026 年 1 月 29 日", title: "历史最高", sub: `1 克 ${fmt(cnyAt(D.pk26))} 元 · ${fmt(priceAt(D.pk26))} 美元/盎司`, fx: ["bigspark"], hit: 0.35 },
  { t: BAR(2), y: D.cr26, tag: "暴跌", date: "2026 年 1 月 30 日", title: `一天跌了 ${Math.round(cnyAt(D.pk26) - cnyAt(D.cr26))} 元`, sub: "−10.8%，1983 年以来最大单日跌幅", fx: ["drip", "frame"], hit: 1.2 },
  { t: BAR(3), t1: BAR(3.5) + 0.1, y: D.cr26, fx: ["question"] },
  { t: BAR(3.5) + 0.1, t1: BAR(4) - 0.05, y: D.cr26, fx: ["rewind"] },
  { t: LB(0) + 0.05, y: D.b0, tag: "回看", date: "1980 年 1 月 21 日 · 850 美元", title: "在最高点买金的人", sub: "要等多少年，才能回本？", fx: ["wire"] },
  { t: LB(1), y: D.fix, tag: "解套", date: "2008 年 1 月 2 日 · 857 美元", title: "终于回本了", sub: "从 1980 年的高点算起", stat: "28 年", statTone: "gold", fx: ["spark"], hit: 0.45 },
  { t: LB(2), y: D.k1000, tag: "新高", date: "2008 年 3 月 17 日", title: "第一次破 1,000 美元", sub: `1 克约 ${c1000} 元`, fx: ["spark"], hit: 0.3 },
  { t: LB(3), y: D.lehman, tag: "危机", date: "2008 年 9 月 15 日", title: "雷曼兄弟破产", sub: "全球金融危机，从纽约传遍世界", fx: ["ripple"], hit: 0.6 },
  { t: LB(3.5), y: D.up9, stat: "+9%", statSub: "一天：危机来了，先买黄金", statTone: "gold", fx: ["spark"], hit: 0.4 },
  { t: LB(4), y: D.oct23, tag: "暴跌", date: "2008 年 10 月", title: "什么都在卖", sub: "黄金也被卖掉换现金", stat: "−29%", statSub: "较 3 月高点", statTone: "red", fx: ["drip", "frame"], hit: 1.1 },
  { t: LB(5), y: D.qe, tag: "印钞", date: "2008 年 11 月 25 日", title: "美联储开始印钱", sub: "3 个月：资产从 0.9 涨到 2.2 万亿美元", fx: ["bills"], hit: 0.4 },
  { t: LB(5.5), y: D.zero, tag: "政策", date: "2008 年 12 月 16 日", title: "利率降到零", sub: "钱，从没这么便宜过", hit: 0.3 },
  { t: LB(7.5), y: D.sp, tag: "危机", date: "2011 年 8 月 5 日", title: "美国国债被降级", sub: "标普：AAA → AA+", hit: 0.5 },
  { t: LB(8), y: D.pk11, tag: "新高", date: "2011 年 8 月 22 日 · 1,889 美元", title: "3 年，涨了 168%", sub: "从 2008 年 11 月的 705 美元算起", stat: "+168%", statTone: "gold", fx: ["bigspark"], hit: 0.6 },
];
const hasFx = (e: Ev, k: NonNullable<Ev["fx"]>[number]) => !!e.fx?.includes(k);

// ---------------- precompute per frame: head, view (smoothed), shake/dolly, the time each new high is reached
const NF = SAMPLE2_FRAMES + 2;
const SIM = (() => {
  const head: number[] = [];
  const view: [number, number, number, number][] = [];
  const shake: number[] = [];
  let sy0 = 0;
  let sy1 = 0;
  let e = 0;
  for (let f = 0; f < NF; f++) {
    const t = f / FPS;
    const h = headAt(t);
    const [x0, x1, y0, y1] = viewRaw(t, h);
    if (f === 0) {
      sy0 = y0;
      sy1 = y1;
    } else {
      const k = 1 - Math.exp(-1 / FPS / 0.16);
      sy0 += (y0 - sy0) * k;
      sy1 += (y1 - sy1) * k;
    }
    head.push(h);
    view.push([x0, x1, sy0, sy1]);
    e *= Math.exp(-1 / FPS / 0.22);
    for (const ev of EVS) if (ev.hit && ev.t >= t - 1 / FPS && ev.t < t) e += ev.hit;
    shake.push(Math.min(e, 1.4));
  }
  return { head, view, shake };
})();
// new highs (US$ closes) crossed during the opening run: small sparks
const RECS = (() => {
  let mx = 0;
  const out: number[] = [];
  for (let i = 0; i < NP; i++) {
    if (P[i][1] > mx) {
      if (P[i][0] > D.a0 && P[i][0] < D.pk26 - 0.001) out.push(P[i][0]);
      mx = P[i][1];
    }
  }
  return out;
})();
const reachT = (y: number) => {
  for (let f = 1; f < NF; f++) if (SIM.head[f] >= y && SIM.head[f - 1] < y) return f / FPS;
  return -1;
};
const REC_T = RECS.map((y) => [y, reachT(y)] as const).filter(([, t]) => t >= 0 && t < BAR(2));

// ---------------- the 3D stage
const PW = 1000;
const PH = 640;
const Y_F = -360; // the floor
type V3 = [number, number, number];
type Pr = (x: number, y: number, z: number) => V3 | null;
const keyed = (t: number, ks: [number, number][]) => {
  if (t <= ks[0][0]) return ks[0][1];
  for (let k = 0; k < ks.length - 1; k++) if (t < ks[k + 1][0]) return lerp(ks[k][1], ks[k + 1][1], smooth((t - ks[k][0]) / (ks[k + 1][0] - ks[k][0])));
  return ks[ks.length - 1][1];
};
const camera = (t: number, f: number) => {
  const hitDolly = EVS.reduce((m, ev) => (ev.hit ? Math.max(m, ev.hit * env(t, ev.t, 0.03, 0.5)) : m), 0);
  const cxp = keyed(t, [[0, 330], [BAR(3), 250], [BAR(4), 140], [LB(2), 230], [LB(3), 300], [LB(6), 250], [LB(8), 180]]);
  const cyp = keyed(t, [[0, 420], [BAR(4), 470], [LB(3), 400], [LB(8), 440]]);
  const czp = keyed(t, [[0, -1430], [BAR(2), -1360], [BAR(3), -1500], [BAR(4), -1560], [LB(2), -1480], [LB(3), -1420], [LB(6), -1500]]) + 150 * hitDolly;
  const tg: V3 = [keyed(t, [[0, 60], [BAR(4), 20], [LB(3), 50]]), -60, 0];
  const pos: V3 = [cxp, cyp, czp];
  let fx = tg[0] - pos[0];
  let fy = tg[1] - pos[1];
  let fz = tg[2] - pos[2];
  const fl = Math.hypot(fx, fy, fz);
  fx /= fl;
  fy /= fl;
  fz /= fl;
  let rx = fz;
  let rz = -fx;
  const rl = Math.hypot(rx, rz);
  rx /= rl;
  rz /= rl;
  const ux = fy * rz;
  const uy = fz * rx - fx * rz;
  const uz = -fy * rx;
  const FOC = 1300;
  const sh = SIM.shake[Math.min(f, NF - 1)];
  const r = rng(f * 31 + 7);
  const cx = 540 + (r() - 0.5) * 40 * sh;
  const cy = 890 + (r() - 0.5) * 40 * sh;
  const proj: Pr = (x, y, z) => {
    const dx = x - pos[0];
    const dy = y - pos[1];
    const dz = z - pos[2];
    const zc = dx * fx + dy * fy + dz * fz;
    if (zc < 40) return null;
    return [cx + (FOC * (dx * rx + dz * rz)) / zc, cy - (FOC * (dx * ux + dy * uy + dz * uz)) / zc, zc];
  };
  return { proj, sh, sx: cx - 540, sy: cy - 890 };
};

// ---------------- the map floor: land dots + a gold column per central bank
const b64 = (s: string) => {
  const bin = atob(s);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
};
const MAP = (() => {
  const M = DJS.map;
  const CI = new Uint16Array(b64(M.i).buffer);
  const CJ = new Uint16Array(b64(M.j).buffer);
  const n = CI.length;
  const lon = new Float32Array(n);
  const lat = new Float32Array(n);
  for (let q = 0; q < n; q++) {
    lon[q] = M.lon0 + CI[q] * M.step;
    lat[q] = M.lat0 + CJ[q] * M.step;
  }
  return { n, lon, lat };
})();
const MX = (lon: number) => (lon - 5.5) * 3.15;
const MZ = (lat: number) => -40 - (77 - lat) * 4.4;
const LOC: Record<string, [number, number]> = {
  美国: [-98, 39], 德国: [10.4, 51], 意大利: [12.5, 42.5], 法国: [2.5, 46.5], 俄罗斯: [45, 56], 中国: [104, 35], 瑞士: [8.2, 46.8], 日本: [138, 36.5],
  印度: [79, 22], 荷兰: [5.3, 52.2], 土耳其: [35, 39], 中国台湾: [121, 23.7], 葡萄牙: [-8, 39.5], 沙特: [45, 24], 英国: [-2, 53.5], 黎巴嫩: [35.8, 33.9],
  西班牙: [-3.7, 40.2], 奥地利: [14.5, 47.5], 比利时: [4.5, 50.6], 哈萨克斯坦: [67, 48], 乌兹别克斯坦: [64, 41], 波兰: [19.4, 52], 巴西: [-51, -10],
  加拿大: [-100, 56], 委内瑞拉: [-66, 7], 南非: [25, -29],
};
const NY: [number, number] = [-74, 40.7];
const COUNTRIES = Object.keys(DJS.res).filter((k) => LOC[k]);
const TABLE_COL: Record<string, string> = { 美国: "#5b97d9", 德国: "#c9605e", 意大利: "#7fb67a", 法国: "#8e83d6", 瑞士: "#e39a4f", 中国: "#ff5a4f", 俄罗斯: "#6fb0c4", 日本: "#d47aa8", 荷兰: "#e3a94f", 印度: "#b9bd57" };

// ---------------- text helpers (canvas only)
type TO = { align?: CanvasTextAlign; maxW?: number; alpha?: number; glow?: string; blur?: number; ls?: number };
const text = (ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, weight: number, fam: string, color: string, o: TO = {}) => {
  let sz = size;
  ctx.font = `${weight} ${sz}px ${fam}`;
  (ctx as any).letterSpacing = `${o.ls ?? 0}px`;
  if (o.maxW) {
    const w = ctx.measureText(s).width;
    if (w > o.maxW) {
      sz = (sz * o.maxW) / w;
      ctx.font = `${weight} ${sz}px ${fam}`;
    }
  }
  ctx.textAlign = o.align ?? "left";
  ctx.textBaseline = "alphabetic";
  const a0 = ctx.globalAlpha;
  ctx.globalAlpha = a0 * (o.alpha ?? 1);
  if (o.glow) {
    ctx.shadowColor = o.glow;
    ctx.shadowBlur = o.blur ?? 20;
  }
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = a0;
  const w = ctx.measureText(s).width;
  (ctx as any).letterSpacing = "0px";
  return w;
};
const tab = (ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string, fam = SERIF, glow?: string) => {
  ctx.font = `900 ${size}px ${fam}`;
  (ctx as any).letterSpacing = "0px";
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "center";
  const dw = ctx.measureText("0").width;
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = 24;
  }
  ctx.fillStyle = color;
  let cx = x;
  for (const ch of s) {
    const cw = /[0-9]/.test(ch) ? dw : ctx.measureText(ch).width;
    ctx.fillText(ch, cx + cw / 2, y);
    cx += cw;
  }
  ctx.shadowBlur = 0;
  return cx - x;
};
const chip = (ctx: CanvasRenderingContext2D, s: string, x: number, y: number, col: string, filled: boolean, size = 20) => {
  ctx.font = `900 ${size}px ${SANS}`;
  const w = ctx.measureText(s).width + 16;
  ctx.fillStyle = filled ? col : "rgba(0,0,0,0.35)";
  ctx.strokeStyle = col;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y - size - 4, w, size + 12, 3);
  if (filled) ctx.fill();
  else {
    ctx.fill();
    ctx.stroke();
  }
  text(ctx, s, x + 8, y + 1, size, 900, SANS, filled ? "#160f02" : col);
  return w;
};

// ---------------- images
let MARK: HTMLImageElement | null = null;
let IMG_P: Promise<void> | null = null;
const imagesReady = () =>
  (IMG_P ??= new Promise<void>((res, rej) => {
    const im = new Image();
    im.onload = () => im.decode().then(() => res(), () => res());
    im.onerror = () => rej(new Error("mark"));
    im.src = staticFile("mark-disc.png");
    MARK = im;
  }));

// =====================================================================================================================
let CH: HTMLCanvasElement | null = null;
const draw = (ctx0: CanvasRenderingContext2D, f: number) => {
  let ctx = ctx0;
  const t = f / FPS;
  const fi = Math.min(f, NF - 1);
  const h = SIM.head[fi];
  const [x0, x1, y0, y1] = SIM.view[fi];
  const { proj, sh } = camera(t, f);
  const price = priceAt(h);
  const partB = t >= BAR(4) - 0.06;

  // ---- background (canvas): v3's warm dark
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#060504";
  ctx.fillRect(0, 0, W, H);
  {
    ctx.save();
    ctx.translate(540, 820);
    ctx.scale(1, 1.1);
    const bg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1080);
    bg.addColorStop(0, "#1a140b");
    bg.addColorStop(0.7, "#060504");
    bg.addColorStop(1, "#060504");
    ctx.fillStyle = bg;
    ctx.fillRect(-600, -1000, 1200, 2000);
    ctx.restore();
  }
  // crash tint on the whole frame
  const redT = EVS.reduce((m, ev) => (hasFx(ev, "frame") ? Math.max(m, env(t, ev.t, 0.02, 0.6)) : m), 0);
  if (redT > 0.01) {
    ctx.fillStyle = `rgba(${RED_RGB},${0.1 * redT})`;
    ctx.fillRect(0, 0, W, H);
  }

  // plane mapping: (year, US$) -> plane -> screen
  const U = (yr: number) => (yr - x0) / (x1 - x0);
  const V = (v: number) => (v - y0) / (y1 - y0);
  const onPlane = (u: number, v: number, dz = 0) => proj(-PW / 2 + u * PW, -PH / 2 + v * PH, dz);
  const ptAt = (yr: number, v: number) => onPlane(U(yr), V(v));

  // ================= the floor: map dots, the crisis ripple, central-bank columns
  {
    const rip = EVS.find((ev) => hasFx(ev, "ripple") && t >= ev.t - 0.05 && t < ev.t + 3.2);
    const rr = rip ? (t - rip.t) * 95 : -1; // degrees per second
    const { n, lon, lat } = MAP;
    for (let q = 0; q < n; q++) {
      const p = proj(MX(lon[q]), Y_F, MZ(lat[q]));
      if (!p || p[1] > H + 10 || p[0] < -20 || p[0] > W + 20) continue;
      const fog = clamp(1 - (p[2] - 900) / 1300);
      let a = 0.1 + 0.32 * fog;
      let col = "150,140,120";
      if (rr >= 0) {
        const d = Math.hypot((lon[q] - NY[0]) * Math.cos((lat[q] * Math.PI) / 180), lat[q] - NY[1]);
        const front = rr - d;
        if (front > 0) {
          const k = front < 10 ? 1 - front / 10 : 0;
          const after = clamp(1 - (t - rip!.t - d / 95) / 2.2) * 0.5;
          const m = Math.max(k, after);
          if (m > 0) {
            col = `${Math.round(lerp(150, 255, m))},${Math.round(lerp(140, 70, m))},${Math.round(lerp(120, 55, m))}`;
            a = lerp(a, 0.95, k) + after * 0.25;
          }
        }
      }
      const s = clamp(2.6 * (1200 / p[2]), 1.1, 3.4);
      ctx.fillStyle = `rgba(${col},${a})`;
      ctx.fillRect(p[0] - s / 2, p[1] - s / 2, s, s);
    }
    // columns, far to near
    const yr = h;
    const cols = COUNTRIES.map((k) => {
      const tn = resAt(k, yr);
      const was = resAt(k, yr - 1);
      const [lo, la] = LOC[k];
      return { k, tn, was, x: MX(lo), z: MZ(la) };
    })
      .filter((c) => c.tn > 30)
      .sort((a, b) => b.z - a.z);
    const top = [...cols].sort((a, b) => b.tn - a.tn);
    const labelSet = new Set([top[0]?.k, top[1]?.k, "中国", "俄罗斯"]);
    for (const c of cols) {
      const hgt = 1.45 * Math.sqrt(c.tn);
      const b = proj(c.x, Y_F, c.z);
      const tp = proj(c.x, Y_F + hgt, c.z);
      if (!b || !tp) continue;
      const buy = c.tn > c.was * 1.02 + 2;
      const sell = c.tn < c.was * 0.98 - 2;
      const w = clamp(15 * (1200 / b[2]), 5, 20);
      const g = ctx.createLinearGradient(0, b[1], 0, tp[1]);
      const rgb = sell ? ASH_RGB : GOLD_RGB;
      g.addColorStop(0, `rgba(${rgb},0.12)`);
      g.addColorStop(1, `rgba(${rgb},${buy ? 0.95 : 0.6})`);
      ctx.fillStyle = g;
      ctx.fillRect(tp[0] - w / 2, tp[1], w, b[1] - tp[1]);
      ctx.fillStyle = buy ? "#fff1c4" : sell ? ASH : GOLD;
      ctx.beginPath();
      ctx.ellipse(tp[0], tp[1], w / 2, w / 5, 0, 0, Math.PI * 2);
      ctx.fill();
      if (buy) {
        ctx.globalCompositeOperation = "lighter";
        const rg = ctx.createRadialGradient(tp[0], tp[1], 0, tp[0], tp[1], 26);
        rg.addColorStop(0, `rgba(${GOLD_RGB},0.55)`);
        rg.addColorStop(1, `rgba(${GOLD_RGB},0)`);
        ctx.fillStyle = rg;
        ctx.fillRect(tp[0] - 26, tp[1] - 26, 52, 52);
        ctx.globalCompositeOperation = "source-over";
      }
      if (labelSet.has(c.k) && tp[1] > 1140) {
        text(ctx, c.k, tp[0], tp[1] - 26, 20, 900, SANS, buy ? GOLD : WHITE, { align: "center", alpha: 0.9 });
        text(ctx, `${fmt(c.tn)} 吨`, tp[0], tp[1] - 8, 16, 500, SANS, MUTED, { align: "center" });
      }
    }
    // the floor's label
    const lp = proj(MX(-165), Y_F, MZ(-50));
    if (lp && lp[1] < 1435) text(ctx, "各国央行金库", Math.max(SL, lp[0]), lp[1], 18, 500, SANS, MUTED, { alpha: 0.7 });
  }

  // ================= the chart on its plane
  CH ??= document.createElement("canvas");
  CH.width = W;
  CH.height = H;
  ctx = CH.getContext("2d")!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const c00 = onPlane(0, 0);
  const c10 = onPlane(1, 0);
  const c11 = onPlane(1, 1.12);
  const c01 = onPlane(0, 1.12);
  if (c00 && c10 && c11 && c01) {
    // the plane: faint glass + border
    ctx.beginPath();
    ctx.moveTo(c00[0], c00[1]);
    ctx.lineTo(c10[0], c10[1]);
    ctx.lineTo(c11[0], c11[1]);
    ctx.lineTo(c01[0], c01[1]);
    ctx.closePath();
    ctx.fillStyle = "rgba(255,214,140,0.025)";
    ctx.fill();
    ctx.save();
    ctx.clip();
    // price grid
    const span = y1 - y0;
    const raw = span / 5;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => s >= raw) ?? raw;
    for (let v = Math.ceil(y0 / step) * step; v <= y1 + span * 0.12; v += step) {
      const a = ptAt(x0, v);
      const b = ptAt(x1, v);
      if (!a || !b) continue;
      ctx.strokeStyle = "rgba(255,255,255,0.07)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
    // the 解套 wire: 850 from 1980-01-21
    const wireEv = EVS.find((e) => hasFx(e, "wire"))!;
    const fixEv = EVS.find((e) => e.tag === "解套")!;
    const wireA = smooth((t - wireEv.t + 0.1) / 0.4) * (1 - smooth((t - LB(2.2)) / 0.5));
    if (wireA > 0) {
      const a = ptAt(D.y1980, 850);
      const draw1 = eo3((t - wireEv.t) / 0.8);
      const xe = lerp(D.y1980, Math.max(h, D.y1980), 1) + (x1 - x0) * 0.04;
      const b = ptAt(lerp(D.y1980, xe, draw1), 850);
      if (a && b) {
        const lit = t >= fixEv.t;
        ctx.save();
        ctx.globalAlpha = wireA;
        ctx.strokeStyle = lit ? GOLD : `rgba(${GOLD_RGB},0.7)`;
        ctx.lineWidth = lit ? 3 : 2;
        if (!lit) ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
        ctx.setLineDash([]);
        // the pulse runs along the wire when the price crosses it
        const pu = (t - fixEv.t) / 0.55;
        if (pu > 0 && pu < 1) {
          const px = lerp(a[0], b[0], 1 - pu);
          const py = lerp(a[1], b[1], 1 - pu);
          ctx.globalCompositeOperation = "lighter";
          const rg = ctx.createRadialGradient(px, py, 0, px, py, 46);
          rg.addColorStop(0, "rgba(255,240,200,1)");
          rg.addColorStop(1, `rgba(${GOLD_RGB},0)`);
          ctx.fillStyle = rg;
          ctx.fillRect(px - 46, py - 46, 92, 92);
          ctx.globalCompositeOperation = "source-over";
        }
        ctx.restore();
      }
    }
    // 2008 trough → 2011 peak: the baseline under the +168%
    {
      const ev = EVS[EVS.length - 1];
      const a = smooth((t - ev.t + 0.2) / 0.3);
      if (a > 0) {
        const p0 = ptAt(D.low08, 704.9);
        const p1 = ptAt(D.pk11, 704.9);
        const p2 = ptAt(D.pk11, priceAt(D.pk11));
        if (p0 && p1 && p2) {
          ctx.save();
          ctx.globalAlpha = a;
          ctx.strokeStyle = `rgba(${GOLD_RGB},0.8)`;
          ctx.setLineDash([6, 6]);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(p0[0], p0[1]);
          ctx.lineTo(p1[0], p1[1]);
          ctx.lineTo(p2[0], p2[1]);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }
      }
    }
    // the series up to the head: fill, then line or candles
    const i0 = Math.max(0, idxAt(x0) - 1);
    const i1 = idxAt(h);
    const ppy = PW / (x1 - x0); // plane units per year (~px)
    const candle = ppy / 252 > 4.2;
    const pts: [number, number, number][] = [];
    let lx = -1e9;
    for (let i = i0; i <= i1; i++) {
      const p = ptAt(PY[i], P[i][1]);
      if (!p) continue;
      if (i < i1 && Math.abs(p[0] - lx) < 1) continue;
      pts.push([p[0], p[1], i]);
      lx = p[0];
    }
    const hp = ptAt(h, price);
    if (hp) pts.push([hp[0], hp[1], -1]);
    if (pts.length > 1) {
      // fill down to the plane floor
      const base0 = ptAt(PY[pts[0][2] >= 0 ? pts[0][2] : i0], y0);
      const baseH = ptAt(h, y0);
      if (base0 && baseH) {
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (const q of pts) ctx.lineTo(q[0], q[1]);
        ctx.lineTo(baseH[0], baseH[1]);
        ctx.lineTo(base0[0], base0[1]);
        ctx.closePath();
        const g = ctx.createLinearGradient(0, hp ? hp[1] - 80 : 600, 0, baseH[1]);
        g.addColorStop(0, `rgba(${GOLD_RGB},0.28)`);
        g.addColorStop(1, `rgba(${GOLD_RGB},0.02)`);
        ctx.fillStyle = g;
        ctx.fill();
      }
      const crashOn = EVS.filter((e) => hasFx(e, "drip")).map((e) => e.y);
      if (candle) {
        const cw = clamp((ppy / 252) * 0.62, 2, 26);
        for (let i = i0; i <= i1; i++) {
          const pp = P[i];
          if (pp[2] !== 2 || PY[i] < x0 - 0.01) continue;
          const isHead = i === i1;
          const c = isHead ? price : pp[1];
          const o = pp[3];
          const hi = isHead ? Math.max(o, c, lerp(o, pp[4], clamp((h - PY[i]) * 252))) : pp[4];
          const lo = isHead ? Math.min(o, c, lerp(o, pp[5], clamp((h - PY[i]) * 252))) : pp[5];
          const top = ptAt(PY[i], Math.max(o, c));
          const bot = ptAt(PY[i], Math.min(o, c));
          const wt = ptAt(PY[i], hi);
          const wb = ptAt(PY[i], lo);
          if (!top || !bot || !wt || !wb) continue;
          const crash = crashOn.some((y) => Math.abs(PY[i] - y) < 0.002) && c < o;
          const up = c >= o;
          const col = crash ? RED : up ? GOLD : ASH;
          ctx.strokeStyle = col;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(wt[0], wt[1]);
          ctx.lineTo(wb[0], wb[1]);
          ctx.stroke();
          const bh = Math.max(2, bot[1] - top[1]);
          if (up) {
            ctx.fillStyle = col;
            ctx.fillRect(top[0] - cw / 2, top[1], cw, bh);
          } else {
            ctx.fillStyle = crash ? `rgba(${RED_RGB},0.85)` : "rgba(216,221,224,0.18)";
            ctx.fillRect(top[0] - cw / 2, top[1], cw, bh);
            ctx.strokeRect(top[0] - cw / 2, top[1], cw, bh);
          }
        }
        // a thin close line on top of the candles
        ctx.strokeStyle = `rgba(${GOLD_RGB},0.35)`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        pts.forEach((q, k) => (k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
        ctx.stroke();
      } else {
        // molten line: glow, core, highlight
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.globalCompositeOperation = "lighter";
        for (const [wdt, col] of [
          [12, `rgba(${GOLD_RGB},0.10)`],
          [5, `rgba(${GOLD_RGB},0.35)`],
          [2.4, "rgba(255,226,150,0.95)"],
        ] as const) {
          ctx.strokeStyle = col;
          ctx.lineWidth = wdt;
          ctx.beginPath();
          pts.forEach((q, k) => (k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
          ctx.stroke();
        }
        ctx.globalCompositeOperation = "source-over";
      }
    }
    ctx.restore();
    // labels outside the plane: price on the right edge, time along the bottom
    for (let v = Math.ceil(y0 / step) * step; v <= y1; v += step) {
      const p = onPlane(1.01, V(v));
      if (p && p[1] > 560 && p[1] < 1130) text(ctx, `$${fmt(v)}`, Math.min(p[0] + 4, SR + 4), p[1] + 6, 17, 500, SANS, MUTED, { alpha: 0.75 });
    }
    {
      const spanY = x1 - x0;
      const marks: [number, string][] = [];
      if (spanY > 12) for (let y = Math.ceil(x0 / 10) * 10; y <= x1; y += 10) marks.push([y, `${y}`]);
      else if (spanY > 1.5) for (let y = Math.ceil(x0); y <= x1; y++) marks.push([y, `${y}`]);
      else if (spanY > 0.75)
        for (let k = Math.ceil(x0 * 4); k <= x1 * 4; k++) {
          const yy = Math.floor(k / 4);
          const q = k % 4;
          marks.push([k / 4, q === 0 ? `${yy}` : `${q * 3 + 1} 月`]);
        }
      else
        for (let k = Math.floor(x0 * 12); k <= x1 * 12; k++) {
          const yy = Math.floor(k / 12);
          const mm = (k % 12) + 1;
          marks.push([k / 12, mm === 1 ? `${yy}` : `${mm} 月`]);
        }
      for (const [yy, lab] of marks) {
        if (yy > h + 0.0001 && spanY < 30) continue;
        const p = onPlane(U(yy), -0.035);
        if (p && p[0] > SL - 20 && p[0] < SR + 10) text(ctx, lab, p[0], p[1] + 8, 17, 500, SANS, MUTED, { align: "center", alpha: 0.7 });
      }
    }
    // the head
    const hp2 = ptAt(h, price);
    if (hp2) {
      ctx.globalCompositeOperation = "lighter";
      const rg = ctx.createRadialGradient(hp2[0], hp2[1], 0, hp2[0], hp2[1], 60);
      rg.addColorStop(0, "rgba(255,240,190,0.95)");
      rg.addColorStop(0.3, `rgba(${GOLD_RGB},0.4)`);
      rg.addColorStop(1, `rgba(${GOLD_RGB},0)`);
      ctx.fillStyle = rg;
      ctx.fillRect(hp2[0] - 60, hp2[1] - 60, 120, 120);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#fff6dc";
      ctx.beginPath();
      ctx.arc(hp2[0], hp2[1], 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // fade the chart buffer at its top so it slips under the header
  ctx.globalCompositeOperation = "destination-in";
  {
    const mk = ctx.createLinearGradient(0, 0, 0, H);
    mk.addColorStop(0, "rgba(0,0,0,0)");
    mk.addColorStop(500 / H, "rgba(0,0,0,0)");
    mk.addColorStop(575 / H, "rgba(0,0,0,1)");
    mk.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = mk;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.globalCompositeOperation = "source-over";
  ctx = ctx0;
  ctx.drawImage(CH, 0, 0);

  // ================= FX in screen space, anchored to the chart
  const hpS = ptAt(h, price);
  for (const ev of EVS) {
    const age = t - ev.t;
    if (age < 0 || age > 2.4) continue;
    const at = ptAt(ev.y, priceAt(ev.y));
    if (!at) continue;
    // 金花: molten sparks up and out from the point
    if (hasFx(ev, "spark") || hasFx(ev, "bigspark")) {
      const big = hasFx(ev, "bigspark");
      const r = rng(Math.round(ev.t * 1000));
      const n = big ? 120 : 55;
      ctx.globalCompositeOperation = "lighter";
      for (let k = 0; k < n; k++) {
        const ang = -Math.PI / 2 + (r() - 0.5) * (big ? 2.4 : 1.8);
        const sp = (big ? 520 : 360) * (0.35 + r());
        const life = 0.7 + r() * 0.9;
        const delay = r() * 0.12;
        const a2 = age - delay;
        if (a2 < 0 || a2 > life) continue;
        const x = at[0] + Math.cos(ang) * sp * a2;
        const y = at[1] + Math.sin(ang) * sp * a2 + 0.5 * 900 * a2 * a2;
        const fade = 1 - a2 / life;
        ctx.fillStyle = `rgba(255,${Math.round(lerp(150, 230, fade))},${Math.round(lerp(40, 140, fade))},${fade})`;
        const s = 1.5 + r() * 2.5;
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      }
      // ring
      const u = clamp(age / 0.7);
      ctx.strokeStyle = `rgba(${GOLD_RGB},${(1 - u) * 0.8})`;
      ctx.lineWidth = 3 * (1 - u) + 0.5;
      ctx.beginPath();
      ctx.arc(at[0], at[1], 14 + (big ? 170 : 110) * eo3(u), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
    }
    // molten drips: the cliff sheds gold that falls onto the map floor and splashes
    if (hasFx(ev, "drip")) {
      const r = rng(Math.round(ev.t * 777));
      const flo = proj(-PW / 2 + U(ev.y) * PW, Y_F, -120);
      const floorY = flo ? flo[1] : 1250;
      ctx.globalCompositeOperation = "lighter";
      for (let k = 0; k < 70; k++) {
        const t0 = r() * 0.7;
        const x = at[0] + (r() - 0.5) * 50;
        const yStart = at[1] - r() * 60;
        const a2 = age - t0;
        const vx = (r() - 0.5) * 40;
        const sz = 2 + r() * 3.5;
        if (a2 < 0) continue;
        const yy = yStart + 0.5 * 1700 * a2 * a2;
        if (yy < floorY) {
          const hot = clamp(1 - a2 / 0.8);
          ctx.fillStyle = `rgba(255,${Math.round(lerp(90, 200, hot))},${Math.round(lerp(30, 90, hot))},0.95)`;
          ctx.beginPath();
          ctx.ellipse(x + vx * a2, yy, sz * 0.7, sz * 1.5, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const tHit = Math.sqrt((2 * (floorY - yStart)) / 1700);
          const sa = a2 - tHit;
          if (sa < 0.6) {
            const u = sa / 0.6;
            ctx.strokeStyle = `rgba(255,140,60,${(1 - u) * 0.8})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(x + vx * tHit, floorY, 4 + 26 * u, 1.5 + 6 * u, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }
      ctx.globalCompositeOperation = "source-over";
    }
  }
  // small sparks on each new high during the opening run
  for (const [yy, tr] of REC_T) {
    const age = t - tr;
    if (age < 0 || age > 0.8) continue;
    const at = ptAt(yy, priceAt(yy));
    if (!at) continue;
    const r = rng(Math.round(yy * 1e5));
    ctx.globalCompositeOperation = "lighter";
    for (let k = 0; k < 18; k++) {
      const ang = -Math.PI / 2 + (r() - 0.5) * 1.6;
      const sp = 220 * (0.4 + r());
      const life = 0.4 + r() * 0.4;
      if (age > life) continue;
      const x = at[0] + Math.cos(ang) * sp * age;
      const y = at[1] + Math.sin(ang) * sp * age + 450 * age * age;
      ctx.fillStyle = `rgba(255,214,120,${1 - age / life})`;
      ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
    }
    ctx.globalCompositeOperation = "source-over";
    text(ctx, "新高", at[0], at[1] - 22 - 40 * eo3(age / 0.8), 20, 900, SANS, GOLD, { align: "center", alpha: 1 - age / 0.8 });
  }

  // QE: bills rain down past the chart onto the floor
  for (const ev of EVS) {
    if (!hasFx(ev, "bills")) continue;
    const age = t - ev.t;
    if (age < 0 || age > 3.2) continue;
    const r = rng(4242);
    for (let k = 0; k < 150; k++) {
      const t0 = r() * 1.5;
      const x = 60 + r() * 960;
      const land = 1150 + r() * 260;
      const vy = 520 + r() * 380;
      const rot0 = r() * Math.PI;
      const spin = (r() - 0.5) * 6;
      const a2 = age - t0;
      if (a2 < 0) continue;
      const yy = -40 + vy * a2;
      const fade = yy > land ? clamp(1 - (a2 - (land + 40) / vy) / 0.5) : 1;
      if (fade <= 0) continue;
      ctx.save();
      ctx.translate(x + Math.sin(a2 * 3 + k) * 24, Math.min(yy, land));
      ctx.rotate(yy > land ? rot0 * 0.2 : rot0 + spin * a2);
      ctx.globalAlpha = fade * 0.9;
      ctx.fillStyle = `rgba(${BILL_RGB},0.85)`;
      ctx.fillRect(-17, -8, 34, 16);
      ctx.strokeStyle = "rgba(220,240,220,0.7)";
      ctx.lineWidth = 1;
      ctx.strokeRect(-14, -5.5, 28, 11);
      ctx.restore();
    }
  }

  // ================= overlays: header, table, chips, cards, stats, frame
  ctx.save();
  ctx.translate(SIM.shake[fi] * 4 * Math.sin(t * 90), 0);
  // brand row (v3)
  if (MARK) ctx.drawImage(MARK, SL, 208, 28, 28);
  let bx = SL + 36;
  bx += text(ctx, "世界的形状", bx, 230, 22, 900, SANS, WHITE) + 10;
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(bx, 212, 1.5, 22);
  text(ctx, "金价两百年", bx + 12, 230, 22, 900, SANS, GOLD);
  // act label
  const act = partB ? "第四幕 · 危机与印钞" : "";
  if (act) text(ctx, act, SL, 270, 22, 500, SANS, MUTED, { alpha: smooth((t - BAR(4)) / 0.3) });
  // date: year big (serif), then 年 M 月 D 日
  const [yy, mm, dd] = dateOf(h);
  const yw = tab(ctx, `${yy}`, SL, 352, 84, WHITE);
  text(ctx, `年 ${mm} 月 ${dd} 日`, SL + yw + 8, 352, 32, 700, SERIF, WHITE);
  // price: 元/克 big in gold, US$ in the chip
  const cny = cnyAt(h) * (price / P[idxAt(h)][1]);
  const pw = tab(ctx, fmt(cny), SL, 432, 62, GOLD, SERIF, `rgba(${GOLD_RGB},0.35)`);
  text(ctx, "元 / 克", SL + pw + 8, 432, 26, 700, SERIF, GOLD);
  let cxp = SL;
  cxp += chip(ctx, `≈ ${fmt(price)} 美元/盎司`, cxp, 478, GOLD, false, 19) + 10;
  chip(ctx, "COMEX 期货 · 收盘价", cxp, 478, MUTED, false, 17);

  // the central-bank table (v3): top 6, change over 10 years
  {
    const rows = COUNTRIES.map((k) => ({ k, v: resAt(k, h), was: resAt(k, h - 10) }))
      .sort((a, b) => b.v - a.v)
      .slice(0, 6);
    const tx = 640;
    text(ctx, "各国央行黄金储备 · 吨", tx, 236, 18, 500, SANS, MUTED);
    rows.forEach((r, k) => {
      const y = 272 + k * 36;
      ctx.fillStyle = TABLE_COL[r.k] ?? GOLD;
      ctx.fillRect(tx, y - 18, 3.5, 22);
      text(ctx, r.k, tx + 12, y, 21, 900, SERIF, WHITE);
      text(ctx, fmt(r.v), tx + 175, y, 21, 900, SERIF, WHITE, { align: "right" });
      if (r.was > 1) {
        const ch = r.v / r.was - 1;
        const s = `${ch >= 0 ? "▲" : "▼"}${Math.abs(Math.round(ch * 100))}%`;
        text(ctx, s, SR, y, 17, 900, SANS, ch >= 0 ? GOLD : RED, { align: "right" });
      }
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(tx + 12, y + 7, 280, 1);
    });
  }
  // macro chips (part B, from Lehman on): the Fed's rate and its balance sheet
  if (t >= LB(3) - 0.1) {
    const a = smooth((t - LB(3) + 0.1) / 0.3);
    ctx.save();
    ctx.globalAlpha = a;
    const rate = fedAt(h);
    const wl = walclAt(h);
    const box = (y: number, lab: string, val: string, hot: number, col: string) => {
      const x = 640;
      ctx.fillStyle = "rgba(10,8,4,0.6)";
      ctx.strokeStyle = `rgba(${col},${0.35 + 0.6 * hot})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x, y - 30, SR - x, 44, 4);
      ctx.fill();
      ctx.stroke();
      text(ctx, lab, x + 12, y - 2, 18, 500, SANS, MUTED);
      text(ctx, val, SR - 12, y + 1, 26, 900, SERIF, hot > 0.3 ? `rgb(${col})` : WHITE, { align: "right" });
    };
    const rHot = Math.max(...FED.map(([yy2]) => env(t, reachTime(yy2), 0.02, 0.5)));
    box(520, "美联储利率", rate < 0.5 ? "0～0.25%" : `${rate.toFixed(2)}%`, rHot, "143,180,255");
    const qeEv = EVS.find((e) => hasFx(e, "bills"))!;
    box(572, "美联储资产", `${wl.toFixed(1)} 万亿美元`, env(t, qeEv.t, 0.02, 0.8), BILL_RGB);
    ctx.restore();
  }

  // cards: tag chip + date, title, sub (serif), one at a time
  const cards = EVS.filter((e) => e.title);
  const breaks = EVS.filter((e) => e.title || hasFx(e, "question") || hasFx(e, "rewind")).map((e) => e.t);
  for (let k = 0; k < cards.length; k++) {
    const ev = cards[k];
    const nextT = breaks.find((x) => x > ev.t + 0.01) ?? 999;
    const end = Math.min(ev.t1 ?? 999, nextT - 0.02, ev.t + 3.6);
    const age = t - ev.t;
    if (age < 0 || t > end) continue;
    const inU = eo3(age / 0.22);
    const outU = smooth((t - (end - 0.16)) / 0.16);
    const a = inU * (1 - outU);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(-30 * (1 - inU), -20 * outU);
    const cy = 668;
    let x = SL;
    if (ev.tag) x += chip(ctx, ev.tag, x, cy, TAG_COL[ev.tag], true, 19) + 10;
    if (ev.date) text(ctx, ev.date, x, cy, 20, 700, SANS, WHITE, { alpha: 0.85, maxW: SR - x });
    const tc = ev.tag === "暴跌" || ev.tag === "危机" ? "#ff6a5f" : WHITE;
    text(ctx, ev.title!, SL, cy + 62, 50, 900, SERIF, tc, { maxW: 560, glow: "rgba(0,0,0,0.9)", blur: 16 });
    if (ev.sub) text(ctx, ev.sub, SL, cy + 104, 28, 700, SERIF, WHITE, { alpha: 0.88, maxW: 560, glow: "rgba(0,0,0,0.9)", blur: 12 });
    ctx.restore();
  }
  // big stats beside the head
  for (const ev of EVS) {
    if (!ev.stat) continue;
    const next = EVS.find((e) => e.t > ev.t + 0.01)?.t ?? 999;
    const age = t - ev.t;
    if (age < 0 || t > next - 0.02) continue;
    const a = smooth(age / 0.12) * (1 - smooth((t - (next - 0.2)) / 0.18));
    const pop = 1 + 0.3 * (1 - eo3(age / 0.3));
    const col = ev.statTone === "red" ? RED : GOLD;
    const sx = 330;
    const sy = 1000;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(sx, sy);
    ctx.scale(pop, pop);
    text(ctx, ev.stat, 0, 0, 118, 900, SERIF, col, { align: "center", glow: `rgba(${ev.statTone === "red" ? RED_RGB : GOLD_RGB},0.55)`, blur: 30 });
    if (ev.statSub) text(ctx, ev.statSub, 0, 46, 26, 700, SERIF, WHITE, { align: "center", alpha: 0.9 });
    ctx.restore();
  }
  // the long wait counter while the wire is up (part B, before 解套)
  {
    const wireEv = EVS.find((e) => hasFx(e, "wire"))!;
    const fixEv = EVS.find((e) => e.tag === "解套")!;
    const a = smooth((t - wireEv.t - 0.3) / 0.3) * (1 - smooth((t - fixEv.t + 0.05) / 0.12));
    if (a > 0) {
      const yrs = Math.max(0, h - D.y1980);
      ctx.save();
      ctx.globalAlpha = a;
      text(ctx, "已经等了", 330, 950, 26, 700, SERIF, WHITE, { align: "center" });
      tab(ctx, `${Math.floor(yrs)}`, 300, 1050, 110, GOLD, SERIF, `rgba(${GOLD_RGB},0.4)`);
      text(ctx, "年", 395, 1050, 40, 900, SERIF, GOLD);
      ctx.restore();
    }
  }
  // the question (opening)
  for (const ev of EVS) {
    if (!hasFx(ev, "question")) continue;
    const age = t - ev.t;
    if (age < 0 || t > ev.t1!) continue;
    const a = smooth(age / 0.2) * (1 - smooth((t - ev.t1! + 0.15) / 0.15));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = "rgba(6,5,4,0.62)";
    ctx.fillRect(0, 610, W, 260);
    text(ctx, "金子一点没变", 540, 712, 52, 900, SERIF, WHITE, { align: "center" });
    const q2 = smooth((age - 0.35) / 0.2);
    ctx.globalAlpha = a * q2;
    text(ctx, "金价凭什么大起大落？", 540, 812, 74, 900, SERIF, GOLD, { align: "center", maxW: 860, glow: `rgba(${GOLD_RGB},0.5)`, blur: 26 });
    ctx.restore();
  }
  // rewind
  for (const ev of EVS) {
    if (!hasFx(ev, "rewind")) continue;
    const age = t - ev.t;
    if (age < 0 || t > ev.t1!) continue;
    const a = smooth(age / 0.12) * (1 - smooth((t - ev.t1! + 0.12) / 0.12));
    ctx.save();
    ctx.globalAlpha = a;
    const r = rng(f);
    ctx.globalCompositeOperation = "lighter";
    for (let k = 0; k < 26; k++) {
      const y = 560 + r() * 600;
      const x = r() * W;
      ctx.fillStyle = `rgba(${GOLD_RGB},${0.08 + r() * 0.12})`;
      ctx.fillRect(x, y, 160 + r() * 260, 2);
    }
    ctx.globalCompositeOperation = "source-over";
    text(ctx, "倒回 2007 年……", 540, 780, 50, 900, SERIF, WHITE, { align: "center" });
    ctx.restore();
  }
  // the red frame (v3): 金价暴跌
  for (const ev of EVS) {
    if (!hasFx(ev, "frame")) continue;
    const age = t - ev.t;
    if (age < 0 || age > 1.6) continue;
    const a = (age < 0.06 ? age / 0.06 : 1) * (1 - smooth((age - 1.2) / 0.4));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = RED;
    ctx.lineWidth = 3;
    ctx.strokeRect(62, 596, 876, 520);
    const lw = 120;
    ctx.fillStyle = RED;
    ctx.fillRect(540 - lw / 2, 584, lw, 26);
    text(ctx, "金价暴跌", 540, 604, 19, 900, SANS, WHITE, { align: "center" });
    ctx.restore();
  }
  // source line (v3)
  text(ctx, partB ? "数据：COMEX 黄金期货收盘价 · 1980 年前为伦敦金价 · 美联储 · 国际货币基金组织" : "数据：COMEX 黄金期货收盘价 · 美联储汇率 · 国际货币基金组织", SL, 1432, 17, 500, SANS, MUTED, { alpha: 0.7, maxW: 860 });
  ctx.restore();

  // flashes
  for (const ev of EVS) {
    const age = t - ev.t;
    if (age < 0 || age > 0.4 || !ev.hit) continue;
    const red = hasFx(ev, "frame");
    const a = (red ? 0.28 : 0.12) * Math.exp(-age / 0.1) * Math.min(1, ev.hit);
    ctx.fillStyle = red ? `rgba(${RED_RGB},${a})` : `rgba(${GOLD_RGB},${a})`;
    ctx.fillRect(0, 0, W, H);
  }
  // fade out at the end
  const endA = smooth((t - (T_END - 0.55)) / 0.55);
  if (endA > 0) {
    ctx.fillStyle = `rgba(0,0,0,${endA})`;
    ctx.fillRect(0, 0, W, H);
  }
  void sh;
  void hpS;
};
// the time the head reaches a date (for chip flashes)
const REACH: Map<number, number> = new Map();
const reachTime = (y: number) => {
  if (!REACH.has(y)) REACH.set(y, reachT(y));
  return REACH.get(y)!;
};

// =====================================================================================================================
export const SampleG2: React.FC = () => {
  const f = useCurrentFrame();
  const [handle] = useState(() => delayRender("sample2 fonts + mark", { timeoutInMilliseconds: 180000 }));
  const [ready, setReady] = useState(false);
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    Promise.all([fontsReady(), imagesReady()]).then(
      () => {
        setReady(true);
        continueRender(handle);
      },
      (e) => cancelRender(e),
    );
  }, [handle]);
  useLayoutEffect(() => {
    if (!ready || !ref.current) return;
    draw(ref.current.getContext("2d")!, f);
  }, [f, ready]);
  const cut = Math.round(BAR(4) * FPS);
  return (
    <AbsoluteFill style={{ background: "#060504", overflow: "hidden" }}>
      <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0 }} />
      <AbsoluteFill
        style={{
          opacity: 0.05,
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          backgroundPosition: `${(f * 37) % 220}px ${(f * 53) % 220}px`,
          mixBlendMode: "overlay",
        }}
      />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 85% 75% at 50% 50%, transparent 60%, rgba(0,0,0,0.7) 100%)", pointerEvents: "none" }} />
      {/* the score: its opening (bars 0-4), then its bars 40-49 (the 2001-2011 part of the film) */}
      <Sequence from={0} durationInFrames={cut}>
        <Audio src={staticFile("score_world8.wav")} volume={(fr) => clamp((cut - fr) / 3)} />
      </Sequence>
      <Sequence from={cut} durationInFrames={SAMPLE2_FRAMES - cut}>
        <Audio src={staticFile("score_world8.wav")} startFrom={Math.round(BAR(40) * FPS)} volume={(fr) => clamp(fr / 3) * clamp((SAMPLE2_FRAMES - cut - fr) / 18)} />
      </Sequence>
    </AbsoluteFill>
  );
};
