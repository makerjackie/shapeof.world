// 金价两百年 · look test 3 (about 25 s). The first look test's stage, which the user liked: the price stands as a wall in 3D,
// a perspective floor in front of it, the camera chases the head on a spring so every day's move is felt, 红涨绿跌 numbers.
// Taken from look test 2: the clock is not linear (fast through calm stretches, single trading days at the events, every event
// on a bar of 「兴衰」), the camera serves the event (in close for a crash, out for a 28-year wait), and each event has its own FX
// (金花 sparks, molten drips, a crack through the wall, the 解套 wire, bill rain). In close-ups the line becomes daily candles,
// red up and green down; each day's move also stands on the floor as a red or green bar. Brand row, act label and the
// central-bank table stay. Safe area: x 60..940, y 200..1440.
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
export const SAMPLE3_FRAMES = Math.round(T_END * FPS);
const SL = 70;
const SR = 930;

const GOLD = "#ffc94d";
const GOLD_RGB = "255,201,77";
const UP = "#ff4a3d"; // 红涨
const UP_RGB = "255,74,61";
const DN = "#1fd17a"; // 绿跌
const DN_RGB = "31,209,122";
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

// ---------------- events: cards, stats and FX, each on a bar (红涨绿跌)
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
  statTone?: "up" | "dn" | "gold";
  fx?: ("spark" | "bigspark" | "drip" | "frame" | "crack" | "bills" | "wire" | "question" | "rewind")[];
  hit?: number; // shake + dolly
};
const TAG_COL: Record<Tag, string> = { 新高: UP, 暴跌: DN, 危机: DN, 解套: GOLD, 印钞: "#7fbf8a", 政策: "#8fb4ff", 回看: MUTED };
const c1000 = Math.round(cnyAt(D.k1000));
const EVS: Ev[] = [
  { t: BAR(1), y: D.pk26, tag: "新高", date: "2026 年 1 月 29 日", title: "历史最高", sub: `1 克 ${fmt(cnyAt(D.pk26))} 元 · ${fmt(priceAt(D.pk26))} 美元/盎司`, fx: ["bigspark"], hit: 0.35 },
  { t: BAR(2), y: D.cr26, tag: "暴跌", date: "2026 年 1 月 30 日", title: `一天跌了 ${Math.round(cnyAt(D.pk26) - cnyAt(D.cr26))} 元`, sub: "−10.8%，1983 年以来最大单日跌幅", fx: ["drip", "frame"], hit: 1.2 },
  { t: BAR(3), t1: BAR(3.5) + 0.1, y: D.cr26, fx: ["question"] },
  { t: BAR(3.5) + 0.1, t1: BAR(4) - 0.05, y: D.cr26, fx: ["rewind"] },
  { t: LB(0) + 0.05, y: D.b0, tag: "回看", date: "1980 年 1 月 21 日 · 850 美元", title: "在最高点买金的人", sub: "要等多少年，才能回本？", fx: ["wire"] },
  { t: LB(1), y: D.fix, tag: "解套", date: "2008 年 1 月 2 日 · 857 美元", title: "终于回本了", sub: "从 1980 年的高点算起", stat: "28 年", statTone: "gold", fx: ["spark"], hit: 0.45 },
  { t: LB(2), y: D.k1000, tag: "新高", date: "2008 年 3 月 17 日", title: "第一次破 1,000 美元", sub: `1 克约 ${c1000} 元`, fx: ["spark"], hit: 0.3 },
  { t: LB(3), y: D.lehman, tag: "危机", date: "2008 年 9 月 15 日", title: "雷曼兄弟破产", sub: "全球金融危机爆发", fx: ["crack"], hit: 0.8 },
  { t: LB(3.5), y: D.up9, stat: "+9%", statSub: "一天：危机来了，先买黄金", statTone: "up", fx: ["spark"], hit: 0.4 },
  { t: LB(4), y: D.oct23, tag: "暴跌", date: "2008 年 10 月", title: "什么都在卖", sub: "黄金也被卖掉换现金", stat: "−29%", statSub: "较 3 月高点", statTone: "dn", fx: ["drip", "frame"], hit: 1.1 },
  { t: LB(5), y: D.qe, tag: "印钞", date: "2008 年 11 月 25 日", title: "美联储开始印钱", sub: "3 个月：资产从 0.9 涨到 2.2 万亿美元", fx: ["bills"], hit: 0.4 },
  { t: LB(5.5), y: D.zero, tag: "政策", date: "2008 年 12 月 16 日", title: "利率降到零", sub: "钱，从没这么便宜过", hit: 0.3 },
  { t: LB(7.5), y: D.sp, tag: "危机", date: "2011 年 8 月 5 日", title: "美国国债被降级", sub: "标普：AAA → AA+", fx: ["crack"], hit: 0.5 },
  { t: LB(8), y: D.pk11, tag: "新高", date: "2011 年 8 月 22 日 · 1,889 美元", title: "3 年，涨了 168%", sub: "从 2008 年 11 月的 705 美元算起", stat: "+168%", statTone: "up", fx: ["bigspark"], hit: 0.6 },
];
const hasFx = (e: Ev, k: NonNullable<Ev["fx"]>[number]) => !!e.fx?.includes(k);

// ---------------- the stage: the price wall (the view window mapped onto it), the floor in front
const PW = 1500;
const PH = 760;
const Y_F = -PH / 2 - 24;
const keyed = (t: number, ks: [number, number][]) => {
  if (t <= ks[0][0]) return ks[0][1];
  for (let k = 0; k < ks.length - 1; k++) if (t < ks[k + 1][0]) return lerp(ks[k][1], ks[k + 1][1], smooth((t - ks[k][0]) / (ks[k + 1][0] - ks[k][0])));
  return ks[ks.length - 1][1];
};
// how much the view is a fixed overview (1) rather than following the head (0)
const fixedW = (t: number) => {
  let k = 0;
  while (k < VK.length - 2 && t >= VK[k + 1][0]) k++;
  const [t0, a] = VK[k];
  const [t1, b] = VK[k + 1];
  return lerp(a.x ? 1 : 0, b.x ? 1 : 0, smooth(clamp((t - t0) / (t1 - t0))));
};

// ---------------- precompute per frame: head, view (smoothed), the camera's spring on the head, shake
const NF = SAMPLE3_FRAMES + 2;
const SIM = (() => {
  const head: number[] = [];
  const view: [number, number, number, number][] = [];
  const shake: number[] = [];
  const camY: number[] = [];
  let sy0 = 0;
  let sy1 = 0;
  let e = 0;
  let cy = 0;
  let cv = 0;
  const SUB = 6;
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
    // the camera's target height: the head on the wall (followed on a loose spring), or the wall's middle in an overview
    const fw = fixedW(t);
    const headWY = -PH / 2 + ((priceAt(h) - sy0) / (sy1 - sy0)) * PH;
    const target = lerp(headWY, 0, fw);
    if (f === 0) cy = target;
    const k = t > BAR(3.4) && t < BAR(4.2) ? 300 : 75;
    const z = t > BAR(3.4) && t < BAR(4.2) ? 1 : 0.42;
    for (let s = 0; s < SUB; s++) {
      const dt = 1 / (FPS * SUB);
      cv += (k * (target - cy) - 2 * Math.sqrt(k) * z * cv) * dt;
      cy += cv * dt;
    }
    camY.push(cy);
    e *= Math.exp(-1 / FPS / 0.22);
    for (const ev of EVS) if (ev.hit && ev.t >= t - 1 / FPS && ev.t < t) e += ev.hit;
    // big daily moves shake a little on their own
    if (f > 0) {
      const ip = idxAt(head[f - 1]);
      const ic = idxAt(h);
      for (let i = ip + 1; i <= ic; i++) if (P[i][2] === 2 && i > 0) e += Math.max(0, Math.abs(P[i][1] / P[i - 1][1] - 1) - 0.015) * 8;
    }
    shake.push(Math.min(e, 1.4));
  }
  return { head, view, shake, camY };
})();
// US$ record closes; the time the head reaches a date
const RECS = (() => {
  let mx = 0;
  const out: number[] = [];
  for (let i = 0; i < NP; i++) {
    if (P[i][1] > mx) {
      out.push(PY[i]);
      mx = P[i][1];
    }
  }
  return out;
})();
const reachT = (y: number) => {
  for (let f = 1; f < NF; f++) if (SIM.head[f] >= y && SIM.head[f - 1] < y) return f / FPS;
  return -1;
};
const REC_T = RECS.filter((y) => y > 2000).map((y) => [y, reachT(y)] as const).filter(([, t]) => t >= 0);
const REACH: Map<number, number> = new Map();
const reachTime = (y: number) => {
  if (!REACH.has(y)) REACH.set(y, reachT(y));
  return REACH.get(y)!;
};

type V3 = [number, number, number];
type Pr = (x: number, y: number, z: number) => V3 | null;
const camera = (t: number, f: number, uHead: number) => {
  const fw = fixedW(t);
  const hitDolly = EVS.reduce((m, ev) => (ev.hit ? Math.max(m, ev.hit * env(t, ev.t, 0.03, 0.5)) : m), 0);
  const back = keyed(t, [[0, 150], [BAR(3), 120], [LB(3), 110]]);
  const Tx = lerp(-PW / 2 + uHead * PW - back, 0, fw);
  const Ty = SIM.camY[Math.min(f, NF - 1)] + 30;
  const dist = lerp(keyed(t, [[0, 1350], [BAR(2), 1200], [BAR(2.6), 1300], [LB(3), 1250], [LB(4), 1150], [LB(4.8), 1300]]), 1600, fw) - 160 * hitDolly;
  const theta = (lerp(keyed(t, [[0, 36], [BAR(2), 42], [BAR(3), 36], [LB(3), 38], [LB(4), 44], [LB(5), 36]]), 28, fw) * Math.PI) / 180;
  const phi = (keyed(t, [[0, 9], [LB(0), 11], [LB(4), 8]]) * Math.PI) / 180;
  const cpx = Tx + dist * Math.sin(theta) * Math.cos(phi);
  const cpy = Ty + dist * Math.sin(phi);
  const cpz = -dist * Math.cos(theta) * Math.cos(phi);
  let fx = Tx - cpx;
  let fy = Ty - cpy;
  let fz = -cpz;
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
  const FOC = 1000;
  const sh = SIM.shake[Math.min(f, NF - 1)];
  const r = rng(f * 31 + 7);
  const cx = lerp(480, 520, fw) + (r() - 0.5) * 44 * sh;
  const cy = 905 + (r() - 0.5) * 44 * sh;
  const proj: Pr = (x, y, z) => {
    const dx = x - cpx;
    const dy = y - cpy;
    const dz = z - cpz;
    const zc = dx * fx + dy * fy + dz * fz;
    if (zc < 40) return null;
    return [cx + (FOC * (dx * rx + dz * rz)) / zc, cy - (FOC * (dx * ux + dy * uy + dz * uz)) / zc, zc];
  };
  return { proj, sh };
};

// central-bank table (v3 brand)
const COUNTRIES = Object.keys(DJS.res);
const TABLE_COL: Record<string, string> = { 美国: "#5b97d9", 德国: "#c9605e", 意大利: "#7fb67a", 法国: "#8e83d6", 瑞士: "#e39a4f", 中国: "#ff5a4f", 俄罗斯: "#6fb0c4", 日本: "#d47aa8", 荷兰: "#e3a94f", 印度: "#b9bd57" };

// 3D dust around the wall, for depth
const DUST = (() => {
  const r = rng(77);
  return Array.from({ length: 240 }, () => [lerp(-1000, 1000, r()), lerp(Y_F, 520, r()), lerp(-700, 1600, r()), r()] as const);
})();

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
const AMP = (p: number) => 175 * (1 - Math.exp(-Math.abs(p) / 0.03)); // a day's move as a bar on the floor (plane units)
const draw = (ctx0: CanvasRenderingContext2D, f: number) => {
  let ctx = ctx0;
  const t = f / FPS;
  const fi = Math.min(f, NF - 1);
  const h = SIM.head[fi];
  const [x0, x1, y0, y1] = SIM.view[fi];
  const U = (yr: number) => (yr - x0) / (x1 - x0);
  const V = (v: number) => (v - y0) / (y1 - y0);
  const { proj } = camera(t, f, U(h));
  const price = priceAt(h);
  const partB = t >= BAR(4) - 0.06;
  const ih = idxAt(h);
  const hd = h - PY[ih] > 0.5 / 252 && ih < NP - 1 ? ih + 1 : ih; // the day the header shows
  const pct = hd > 0 ? P[hd][1] / P[hd - 1][1] - 1 : 0;
  const WX = (u: number) => -PW / 2 + u * PW;
  const WY = (v: number) => -PH / 2 + v * PH;
  const ptAt = (yr: number, v: number) => proj(WX(U(yr)), WY(V(v)), 0);

  // ---- background (canvas)
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#060504";
  ctx.fillRect(0, 0, W, H);
  {
    ctx.save();
    ctx.translate(540, 860);
    ctx.scale(1, 1.07);
    const bg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1080);
    bg.addColorStop(0, "#18130b");
    bg.addColorStop(0.72, "#060504");
    bg.addColorStop(1, "#060504");
    ctx.fillStyle = bg;
    ctx.fillRect(-600, -1000, 1200, 2000);
    ctx.restore();
  }

  // ================= the 3D stage, drawn into a buffer and faded under the header
  CH ??= document.createElement("canvas");
  CH.width = W;
  CH.height = H;
  ctx = CH.getContext("2d")!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const xa = WX(-0.15);
  const xb = WX(1.12);
  // the floor: a perspective grid fading with depth
  {
    const seg = (ax: number, az: number, bx: number, bz: number, a: number) => {
      const p = proj(ax, Y_F, az);
      const q = proj(bx, Y_F, bz);
      if (!p || !q) return;
      const fog = clamp(1 - ((p[2] + q[2]) / 2 - 600) / 4200);
      if (fog <= 0) return;
      ctx.strokeStyle = `rgba(${GOLD_RGB},${a * fog})`;
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(q[0], q[1]);
      ctx.stroke();
    };
    ctx.lineWidth = 1.2;
    for (let z = -600; z <= 2400; z += 150) seg(xa, z, xb, z, z === 0 ? 0.3 : 0.1);
    for (let x = Math.floor(xa / 125) * 125; x <= xb; x += 125) seg(x, -600, x, 2400, 0.1);
  }
  // price grid on the wall
  const span = y1 - y0;
  const raw = span / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => s >= raw) ?? raw;
  for (let v = Math.ceil(y0 / step) * step; v <= y1 + span * 0.1; v += step) {
    const a = proj(xa, WY(V(v)), 0);
    const b = proj(WX(Math.min(1.04, U(h) + 0.06)), WY(V(v)), 0);
    if (!a || !b) continue;
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
    if (b[1] > 600 && b[1] < 1250 && b[0] < SR) text(ctx, `$${fmt(v)}`, b[0] + 8, b[1] + 6, 20, 500, SANS, MUTED, { alpha: 0.75 });
  }
  // time marks at the wall's foot
  {
    const spanY = x1 - x0;
    const marks: [number, string][] = [];
    if (spanY > 12) for (let y = Math.ceil(x0 / 10) * 10; y <= x1; y += 10) marks.push([y, `${y}`]);
    else if (spanY > 1.5) for (let y = Math.ceil(x0); y <= x1; y++) marks.push([y, `${y}`]);
    else if (spanY > 0.75)
      for (let k = Math.ceil(x0 * 4); k <= x1 * 4; k++) marks.push([k / 4, k % 4 === 0 ? `${Math.floor(k / 4)}` : `${(k % 4) * 3 + 1} 月`]);
    else
      for (let k = Math.floor(x0 * 12); k <= x1 * 12; k++) {
        const mm = (((k % 12) + 12) % 12) + 1;
        marks.push([k / 12, mm === 1 ? `${Math.floor(k / 12)}` : `${mm} 月`]);
      }
    for (const [yy, lab] of marks) {
      if (yy > h + 0.0001 || yy < x0) continue;
      const a = proj(WX(U(yy)), Y_F, 0);
      const b = proj(WX(U(yy)), WY(1.05), 0);
      if (!a || !b) continue;
      ctx.strokeStyle = "rgba(255,255,255,0.045)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
      const sz = clamp((22 * 1300) / a[2], 13, 24);
      if (a[0] > SL - 30 && a[0] < SR && a[1] < 1420) text(ctx, lab, a[0], a[1] + sz + 4, sz, lab.includes("月") ? 500 : 900, SANS, lab.includes("月") ? MUTED : GOLD, { align: "center", alpha: 0.8 });
    }
  }
  // dust
  for (const [dx, dy, dz, k] of DUST) {
    const p = proj(dx, dy, dz);
    if (!p) continue;
    ctx.fillStyle = `rgba(${GOLD_RGB},${0.1 + 0.22 * k})`;
    ctx.beginPath();
    ctx.arc(p[0], p[1], clamp(2200 / p[2], 0.5, 4), 0, Math.PI * 2);
    ctx.fill();
  }
  // the 解套 wire: 850 from 1980-01-21
  const wireEv = EVS.find((e) => hasFx(e, "wire"))!;
  const fixEv = EVS.find((e) => e.tag === "解套")!;
  {
    const wireA = smooth((t - wireEv.t + 0.1) / 0.4) * (1 - smooth((t - LB(2.2)) / 0.5));
    if (wireA > 0) {
      const a = ptAt(D.y1980, 850);
      const xe = Math.max(h, D.y1980) + (x1 - x0) * 0.05;
      const b = ptAt(lerp(D.y1980, xe, eo3((t - wireEv.t) / 0.8)), 850);
      if (a && b) {
        const lit = t >= fixEv.t;
        ctx.save();
        ctx.globalAlpha = wireA;
        ctx.strokeStyle = lit ? GOLD : `rgba(${GOLD_RGB},0.75)`;
        ctx.lineWidth = lit ? 3.5 : 2;
        if (!lit) ctx.setLineDash([12, 9]);
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
        ctx.setLineDash([]);
        text(ctx, "1980 年 · 850 美元", a[0] + 6, a[1] - 12, 20, 900, SANS, GOLD, { alpha: 0.9 });
        const pu = (t - fixEv.t) / 0.55;
        if (pu > 0 && pu < 1) {
          const px = lerp(a[0], b[0], 1 - pu);
          const py = lerp(a[1], b[1], 1 - pu);
          ctx.globalCompositeOperation = "lighter";
          const rg = ctx.createRadialGradient(px, py, 0, px, py, 50);
          rg.addColorStop(0, "rgba(255,240,200,1)");
          rg.addColorStop(1, `rgba(${GOLD_RGB},0)`);
          ctx.fillStyle = rg;
          ctx.fillRect(px - 50, py - 50, 100, 100);
          ctx.globalCompositeOperation = "source-over";
        }
        ctx.restore();
      }
    }
  }
  // 2008 trough → 2011 peak: the bracket under the +168%
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
        ctx.strokeStyle = `rgba(${UP_RGB},0.85)`;
        ctx.setLineDash([7, 6]);
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
  // the series up to the head
  const i0 = Math.max(0, idxAt(x0 - (x1 - x0) * 0.15) - 1);
  const i1 = ih;
  const unitsPerDay = PW / (x1 - x0) / 252;
  const candleK = smooth((unitsPerDay - 5) / 4); // candles fade in as the camera closes in
  const pts: [number, number, number][] = [];
  {
    let lx = -1e9;
    let ly = -1e9;
    for (let i = i0; i <= i1; i++) {
      const p = ptAt(PY[i], P[i][1]);
      if (!p) continue;
      if (i < i1 && Math.abs(p[0] - lx) < 0.9 && Math.abs(p[1] - ly) < 0.9) continue;
      pts.push([p[0], p[1], i]);
      lx = p[0];
      ly = p[1];
    }
    const hp = ptAt(h, price);
    if (hp) pts.push([hp[0], hp[1], -1]);
  }
  const hp = ptAt(h, price);
  // curtain: from the line down to the floor
  if (pts.length > 1 && hp) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (const q of pts) ctx.lineTo(q[0], q[1]);
    for (let k = pts.length - 1; k >= 0; k--) {
      const yy = pts[k][2] >= 0 ? PY[pts[k][2]] : h;
      const b = proj(WX(U(yy)), Y_F, 0);
      if (b) ctx.lineTo(b[0], b[1]);
    }
    ctx.closePath();
    const fl = proj(WX(U(h)), Y_F, 0);
    const g = ctx.createLinearGradient(0, hp[1] - 220, 0, fl ? fl[1] : hp[1] + 500);
    g.addColorStop(0, `rgba(${GOLD_RGB},0.28)`);
    g.addColorStop(0.6, `rgba(${GOLD_RGB},0.08)`);
    g.addColorStop(1, `rgba(${GOLD_RGB},0.03)`);
    ctx.fillStyle = g;
    ctx.fill();
  }
  // each day's move as a bar on the floor, red up / green down
  if (unitsPerDay > 0.9 && candleK < 0.98) {
    ctx.save();
    ctx.globalAlpha = 1 - candleK;
    const bw = clamp(unitsPerDay * 0.55, 0.8, 22);
    for (let i = Math.max(1, idxAt(x0)); i <= i1; i++) {
      if (P[i][2] !== 2) continue;
      const pc = P[i][1] / P[i - 1][1] - 1;
      const grow = i === i1 ? clamp((h - PY[i]) * 252 * 1.5 + 0.2) : 1;
      const x = WX(U(PY[i]));
      const b = proj(x, Y_F, -70);
      const tp = proj(x, Y_F + AMP(pc) * grow, -70);
      if (!b || !tp) continue;
      const w = Math.max(1, (bw * 1000) / b[2]);
      ctx.fillStyle = pc >= 0 ? `rgba(${UP_RGB},0.85)` : `rgba(${DN_RGB},0.85)`;
      ctx.fillRect(b[0] - w / 2, tp[1], w, b[1] - tp[1]);
    }
    ctx.restore();
  }
  // the line: molten gold (fades when candles take over)
  if (pts.length > 1) {
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.globalCompositeOperation = "lighter";
    const la = 1 - 0.75 * candleK;
    const crashYs = EVS.filter((e) => hasFx(e, "drip")).map((e) => e.y);
    for (const pass of [0, 1]) {
      for (let k = 1; k < pts.length; k++) {
        const a = pts[k - 1];
        const b = pts[k];
        const yy = b[2] >= 0 ? PY[b[2]] : h;
        const crash = crashYs.some((c) => yy > c - 1.5 / 252 && yy <= c + 0.0001);
        const wd = clamp((5.2 * 1300) / Math.max(400, proj(WX(U(yy)), 0, 0)?.[2] ?? 1300), 1.2, 8);
        ctx.strokeStyle = pass === 0 ? `rgba(${crash ? DN_RGB : GOLD_RGB},${0.16 * la})` : crash ? DN : `rgba(255,214,120,${0.95 * la})`;
        ctx.lineWidth = pass === 0 ? wd * 4 : wd;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = "source-over";
  }
  // candles in close-up: 红涨绿跌
  if (candleK > 0) {
    ctx.save();
    ctx.globalAlpha = candleK;
    for (let i = Math.max(0, idxAt(x0)); i <= i1; i++) {
      const pp = P[i];
      if (pp[2] !== 2) continue;
      const isHead = i === i1;
      const o = pp[3];
      const c = isHead ? price : pp[1];
      const grow = clamp((h - PY[i]) * 252);
      const hi = isHead ? Math.max(o, c, lerp(o, pp[4], grow)) : pp[4];
      const lo = isHead ? Math.min(o, c, lerp(o, pp[5], grow)) : pp[5];
      const x = WX(U(PY[i]));
      const top = proj(x, WY(V(Math.max(o, c))), 0);
      const bot = proj(x, WY(V(Math.min(o, c))), 0);
      const wt = proj(x, WY(V(hi)), 0);
      const wb = proj(x, WY(V(lo)), 0);
      if (!top || !bot || !wt || !wb) continue;
      const up = c >= o;
      const col = up ? UP : DN;
      const w = clamp(((unitsPerDay * 0.62) * 1000) / top[2], 2, 30);
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(wt[0], wt[1]);
      ctx.lineTo(wb[0], wb[1]);
      ctx.stroke();
      ctx.shadowColor = up ? `rgba(${UP_RGB},0.6)` : `rgba(${DN_RGB},0.6)`;
      ctx.shadowBlur = 10;
      ctx.fillStyle = col;
      ctx.fillRect(top[0] - w / 2, top[1], w, Math.max(2, bot[1] - top[1]));
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }
  // the head
  if (hp) {
    ctx.globalCompositeOperation = "lighter";
    const rg = ctx.createRadialGradient(hp[0], hp[1], 0, hp[0], hp[1], 66);
    rg.addColorStop(0, "rgba(255,240,190,0.95)");
    rg.addColorStop(0.28, `rgba(${GOLD_RGB},0.45)`);
    rg.addColorStop(1, `rgba(${GOLD_RGB},0)`);
    ctx.fillStyle = rg;
    ctx.fillRect(hp[0] - 66, hp[1] - 66, 132, 132);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#fff6dc";
    ctx.beginPath();
    ctx.arc(hp[0], hp[1], 6.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // new highs flash on the line as the head passes them
  for (const [yy, tr] of REC_T) {
    const age = t - tr;
    if (age < 0 || age > 0.7) continue;
    const at = ptAt(yy, priceAt(yy));
    if (!at) continue;
    const a = 1 - age / 0.7;
    ctx.globalCompositeOperation = "lighter";
    const rg = ctx.createRadialGradient(at[0], at[1], 0, at[0], at[1], 34);
    rg.addColorStop(0, `rgba(${UP_RGB},${0.7 * a})`);
    rg.addColorStop(1, `rgba(${UP_RGB},0)`);
    ctx.fillStyle = rg;
    ctx.fillRect(at[0] - 34, at[1] - 34, 68, 68);
    ctx.globalCompositeOperation = "source-over";
    text(ctx, "新高", at[0], at[1] - 24 - 34 * eo3(age / 0.7), 24, 900, SANS, UP, { align: "center", alpha: a });
  }
  // fade the stage under the header
  ctx.globalCompositeOperation = "destination-in";
  {
    const mk = ctx.createLinearGradient(0, 0, 0, H);
    mk.addColorStop(0, "rgba(0,0,0,0)");
    mk.addColorStop(560 / H, "rgba(0,0,0,0)");
    mk.addColorStop(640 / H, "rgba(0,0,0,1)");
    mk.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = mk;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.globalCompositeOperation = "source-over";
  ctx = ctx0;
  ctx.drawImage(CH, 0, 0);

  // ================= FX, anchored to the event's point
  for (const ev of EVS) {
    const age = t - ev.t;
    if (age < 0 || age > 2.4) continue;
    const at = ptAt(ev.y, priceAt(ev.y));
    if (!at) continue;
    if (hasFx(ev, "spark") || hasFx(ev, "bigspark")) {
      const big = hasFx(ev, "bigspark");
      const r = rng(Math.round(ev.t * 1000));
      const n = big ? 130 : 60;
      ctx.globalCompositeOperation = "lighter";
      for (let k = 0; k < n; k++) {
        const ang = -Math.PI / 2 + (r() - 0.5) * (big ? 2.4 : 1.8);
        const sp = (big ? 560 : 380) * (0.35 + r());
        const life = 0.7 + r() * 0.9;
        const a2 = age - r() * 0.12;
        if (a2 < 0 || a2 > life) continue;
        const x = at[0] + Math.cos(ang) * sp * a2;
        const y = at[1] + Math.sin(ang) * sp * a2 + 0.5 * 900 * a2 * a2;
        const fade = 1 - a2 / life;
        const red = k % 3 === 0;
        ctx.fillStyle = red ? `rgba(255,${Math.round(lerp(60, 120, fade))},50,${fade})` : `rgba(255,${Math.round(lerp(150, 230, fade))},${Math.round(lerp(40, 140, fade))},${fade})`;
        const s = 1.5 + r() * 2.8;
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      }
      const u = clamp(age / 0.7);
      ctx.strokeStyle = `rgba(${UP_RGB},${(1 - u) * 0.8})`;
      ctx.lineWidth = 3 * (1 - u) + 0.5;
      ctx.beginPath();
      ctx.arc(at[0], at[1], 14 + (big ? 190 : 120) * eo3(u), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
    }
    if (hasFx(ev, "drip")) {
      const r = rng(Math.round(ev.t * 777));
      const flo = proj(WX(U(ev.y)), Y_F, -120);
      const floorY = flo ? flo[1] : 1250;
      ctx.globalCompositeOperation = "lighter";
      for (let k = 0; k < 80; k++) {
        const t0 = r() * 0.7;
        const x = at[0] + (r() - 0.5) * 60;
        const yStart = at[1] - r() * 70;
        const vx = (r() - 0.5) * 50;
        const sz = 2 + r() * 3.5;
        const a2 = age - t0;
        if (a2 < 0) continue;
        const yy = yStart + 0.5 * 1700 * a2 * a2;
        if (yy < floorY) {
          const hot = clamp(1 - a2 / 0.8);
          ctx.fillStyle = `rgba(255,${Math.round(lerp(120, 210, hot))},${Math.round(lerp(40, 100, hot))},0.95)`;
          ctx.beginPath();
          ctx.ellipse(x + vx * a2, yy, sz * 0.7, sz * 1.6, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const sa = a2 - Math.sqrt((2 * (floorY - yStart)) / 1700);
          if (sa < 0.6) {
            const u = sa / 0.6;
            ctx.strokeStyle = `rgba(255,170,70,${(1 - u) * 0.8})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(x + vx * (a2 - sa), floorY, 4 + 28 * u, 1.5 + 6 * u, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }
      ctx.globalCompositeOperation = "source-over";
    }
    // a crack runs through the wall from the point
    if (hasFx(ev, "crack")) {
      const r = rng(Math.round(ev.t * 991));
      const a = (age < 0.05 ? age / 0.05 : 1) * (1 - smooth((age - 0.9) / 0.6));
      if (a > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const len = eo3(age / 0.22);
        const paths: [number, number][][] = [];
        const nB = 7;
        for (let b = 0; b < nB; b++) {
          const ang0 = (b / nB) * Math.PI * 2 + (r() - 0.5) * 0.6;
          const L = (110 + r() * 170) * len;
          let x = at[0];
          let y = at[1];
          let ang = ang0;
          const path: [number, number][] = [[x, y]];
          const segs = 7;
          for (let k = 0; k < segs; k++) {
            ang += (r() - 0.5) * 0.9;
            x += Math.cos(ang) * (L / segs);
            y += Math.sin(ang) * (L / segs);
            path.push([x, y]);
            if (r() < 0.3) {
              // a fork
              const fa = ang + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.6);
              const fl = (L / segs) * (1 + r() * 1.5);
              paths.push([[x, y], [x + Math.cos(fa) * fl, y + Math.sin(fa) * fl]]);
            }
          }
          paths.push(path);
        }
        for (const [lw, col] of [
          [8, `rgba(${DN_RGB},${0.28 * a})`],
          [2.2, `rgba(230,255,240,${0.95 * a})`],
        ] as const) {
          ctx.strokeStyle = col;
          ctx.lineWidth = lw;
          ctx.lineJoin = "miter";
          for (const path of paths) {
            ctx.beginPath();
            path.forEach(([px, py], k) => (k ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
            ctx.stroke();
          }
        }
        // the impact point
        const rg = ctx.createRadialGradient(at[0], at[1], 0, at[0], at[1], 60);
        rg.addColorStop(0, `rgba(230,255,240,${0.9 * a * (1 - clamp(age / 0.4))})`);
        rg.addColorStop(1, "rgba(230,255,240,0)");
        ctx.fillStyle = rg;
        ctx.fillRect(at[0] - 60, at[1] - 60, 120, 120);
        ctx.restore();
      }
    }
  }
  // QE: bills rain down past the wall onto the floor
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

  // ================= overlays
  ctx.save();
  // brand row + act label
  if (MARK) ctx.drawImage(MARK, SL, 208, 28, 28);
  let bx = SL + 36;
  bx += text(ctx, "世界的形状", bx, 230, 22, 900, SANS, WHITE) + 10;
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(bx, 212, 1.5, 22);
  text(ctx, "金价两百年", bx + 12, 230, 22, 900, SANS, GOLD);
  if (partB) text(ctx, "第四幕 · 危机与印钞", SL, 266, 22, 500, SANS, MUTED, { alpha: smooth((t - BAR(4)) / 0.3) });
  // date, price in 元/克 (红涨绿跌), US$ under it
  const [yy, mm, dd] = dateOf(PY[hd]);
  text(ctx, `${yy} 年 ${mm} 月 ${dd} 日`, SL, 314, 36, 500, SANS, MUTED);
  const col = pct >= 0 ? UP : DN;
  const cny = cnyAt(h) * (price / P[ih][1]);
  const pw = tab(ctx, fmt(cny), SL, 428, 118, col, SANS);
  text(ctx, "元/克", SL + pw + 12, 428, 40, 900, SANS, col);
  text(ctx, `≈ ${fmt(price)} 美元/盎司`, SL, 474, 28, 500, SANS, MUTED);
  // chips: the day's move, what 1 万元 buys, new highs so far
  {
    let x = SL;
    const s = `${pct >= 0 ? "+" : "−"}${Math.abs(pct * 100).toFixed(1)}%`;
    ctx.font = `900 30px ${SANS}`;
    const w = ctx.measureText(s).width + 26;
    ctx.fillStyle = `rgba(${pct >= 0 ? UP_RGB : DN_RGB},0.22)`;
    ctx.beginPath();
    ctx.roundRect(x, 492, w, 44, 6);
    ctx.fill();
    text(ctx, s, x + 13, 525, 30, 900, SANS, col);
    x += w + 12;
    x += text(ctx, "1 万元能买", x, 524, 22, 500, SANS, MUTED) + 8;
    x += text(ctx, `${(10000 / cny).toFixed(1)} 克`, x, 525, 28, 900, SANS, GOLD) + 18;
    const part0 = partB ? BAR(4) : 0;
    const n = REC_T.filter(([, tr]) => tr >= part0 && tr <= t).length;
    if (n > 0) text(ctx, `创新高 ×${n}`, x, 524, 24, 900, SANS, UP);
  }
  // the central-bank table (v3): top 6, change over 10 years
  {
    const rows = COUNTRIES.map((k) => ({ k, v: resAt(k, h), was: resAt(k, h - 10) }))
      .sort((a, b) => b.v - a.v)
      .slice(0, 6);
    const tx = 640;
    text(ctx, "各国央行黄金储备 · 吨", tx, 236, 18, 500, SANS, MUTED);
    rows.forEach((r, k) => {
      const y = 272 + k * 34;
      ctx.fillStyle = TABLE_COL[r.k] ?? GOLD;
      ctx.fillRect(tx, y - 18, 3.5, 22);
      text(ctx, r.k, tx + 12, y, 21, 900, SERIF, WHITE);
      text(ctx, fmt(r.v), tx + 175, y, 21, 900, SERIF, WHITE, { align: "right" });
      if (r.was > 1) {
        const ch = r.v / r.was - 1;
        const pc = Math.round(ch * 100);
        const s = pc === 0 ? "0%" : `${ch >= 0 ? "▲" : "▼"}${Math.abs(pc)}%`;
        text(ctx, s, SR, y, 17, 900, SANS, pc === 0 ? MUTED : ch >= 0 ? UP : DN, { align: "right" });
      }
    });
  }
  // macro chips (part B, from Lehman on)
  if (t >= LB(3) - 0.1) {
    const a = smooth((t - LB(3) + 0.1) / 0.3);
    ctx.save();
    ctx.globalAlpha = a;
    const rate = fedAt(h);
    const wl = walclAt(h);
    const box = (y: number, lab: string, val: string, hot: number, rgb: string) => {
      const x = 640;
      ctx.fillStyle = "rgba(10,8,4,0.6)";
      ctx.strokeStyle = `rgba(${rgb},${0.35 + 0.6 * hot})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x, y - 30, SR - x, 42, 4);
      ctx.fill();
      ctx.stroke();
      text(ctx, lab, x + 12, y - 3, 18, 500, SANS, MUTED);
      text(ctx, val, SR - 12, y, 25, 900, SANS, hot > 0.3 ? `rgb(${rgb})` : WHITE, { align: "right" });
    };
    const rHot = Math.max(...FED.map(([y2]) => env(t, reachTime(y2), 0.02, 0.5)));
    box(500, "美联储利率", rate < 0.5 ? "0～0.25%" : `${rate.toFixed(2)}%`, rHot, "143,180,255");
    const qeEv = EVS.find((e) => hasFx(e, "bills"))!;
    box(550, "美联储资产", `${wl.toFixed(1)} 万亿美元`, env(t, qeEv.t, 0.02, 0.8), BILL_RGB);
    ctx.restore();
  }
  // cards: tag chip + date, title, sub
  const cards = EVS.filter((e) => e.title);
  const breaks = EVS.filter((e) => e.title || hasFx(e, "question") || hasFx(e, "rewind")).map((e) => e.t);
  for (const ev of cards) {
    const nextT = breaks.find((x) => x > ev.t + 0.01) ?? 999;
    const end = Math.min(ev.t1 ?? 999, nextT - 0.02, ev.t + 3.6);
    const age = t - ev.t;
    if (age < 0 || t > end) continue;
    const inU = eo3(age / 0.22);
    const outU = smooth((t - (end - 0.16)) / 0.16);
    ctx.save();
    ctx.globalAlpha = inU * (1 - outU);
    ctx.translate(-30 * (1 - inU), -20 * outU);
    const cy = 628;
    let x = SL;
    if (ev.tag) x += chip(ctx, ev.tag, x, cy, TAG_COL[ev.tag], true, 20) + 10;
    if (ev.date) text(ctx, ev.date, x, cy, 22, 700, SANS, WHITE, { alpha: 0.85, maxW: SR - x });
    const tc = ev.tag === "暴跌" || ev.tag === "危机" ? DN : ev.tag === "新高" ? UP : WHITE;
    text(ctx, ev.title!, SL, cy + 66, 58, 900, SANS, tc, { maxW: 820, glow: "rgba(0,0,0,0.9)", blur: 16 });
    if (ev.sub) text(ctx, ev.sub, SL, cy + 112, 32, 500, SANS, WHITE, { alpha: 0.9, maxW: 820, glow: "rgba(0,0,0,0.9)", blur: 12 });
    ctx.restore();
  }
  // big stats
  for (const ev of EVS) {
    if (!ev.stat) continue;
    const next = EVS.find((e) => e.t > ev.t + 0.01)?.t ?? 999;
    const age = t - ev.t;
    if (age < 0 || t > next - 0.02) continue;
    const a = smooth(age / 0.12) * (1 - smooth((t - (next - 0.2)) / 0.18));
    const pop = 1 + 0.3 * (1 - eo3(age / 0.3));
    const c = ev.statTone === "dn" ? DN : ev.statTone === "up" ? UP : GOLD;
    const rgb = ev.statTone === "dn" ? DN_RGB : ev.statTone === "up" ? UP_RGB : GOLD_RGB;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(310, 1010);
    ctx.scale(pop, pop);
    text(ctx, ev.stat, 0, 0, 124, 900, SANS, c, { align: "center", glow: `rgba(${rgb},0.55)`, blur: 30 });
    if (ev.statSub) text(ctx, ev.statSub, 0, 48, 28, 700, SANS, WHITE, { align: "center", alpha: 0.9 });
    ctx.restore();
  }
  // the long-wait counter while the wire is up
  {
    const a = smooth((t - wireEv.t - 0.3) / 0.3) * (1 - smooth((t - fixEv.t + 0.05) / 0.12));
    if (a > 0) {
      ctx.save();
      ctx.globalAlpha = a;
      text(ctx, "已经等了", 310, 940, 30, 700, SANS, WHITE, { align: "center" });
      const tw = tab(ctx, `${Math.floor(Math.max(0, h - D.y1980))}`, 270, 1050, 120, GOLD, SANS, `rgba(${GOLD_RGB},0.4)`);
      text(ctx, "年", 270 + tw + 8, 1050, 44, 900, SANS, GOLD);
      ctx.restore();
    }
  }
  // the question
  for (const ev of EVS) {
    if (!hasFx(ev, "question")) continue;
    const age = t - ev.t;
    if (age < 0 || t > ev.t1!) continue;
    const a = smooth(age / 0.2) * (1 - smooth((t - ev.t1! + 0.15) / 0.15));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = "rgba(6,5,4,0.62)";
    ctx.fillRect(0, 600, W, 270);
    text(ctx, "金子一点没变", 540, 704, 56, 900, SANS, WHITE, { align: "center" });
    ctx.globalAlpha = a * smooth((age - 0.35) / 0.2);
    text(ctx, "金价凭什么大起大落？", 540, 808, 80, 900, SANS, GOLD, { align: "center", maxW: 860, glow: `rgba(${GOLD_RGB},0.5)`, blur: 26 });
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
      ctx.fillStyle = `rgba(${GOLD_RGB},${0.08 + r() * 0.12})`;
      ctx.fillRect(r() * W, 600 + r() * 640, 160 + r() * 260, 2);
    }
    ctx.globalCompositeOperation = "source-over";
    text(ctx, "倒回 2007 年……", 540, 780, 54, 900, SANS, WHITE, { align: "center" });
    ctx.restore();
  }
  // the crash frame: green, 金价暴跌
  for (const ev of EVS) {
    if (!hasFx(ev, "frame")) continue;
    const age = t - ev.t;
    if (age < 0 || age > 1.6) continue;
    ctx.save();
    ctx.globalAlpha = (age < 0.06 ? age / 0.06 : 1) * (1 - smooth((age - 1.2) / 0.4));
    ctx.strokeStyle = DN;
    ctx.lineWidth = 3;
    ctx.strokeRect(62, 580, 876, 640);
    ctx.fillStyle = DN;
    ctx.fillRect(480, 568, 120, 26);
    text(ctx, "金价暴跌", 540, 588, 19, 900, SANS, "#04140b", { align: "center" });
    ctx.restore();
  }
  text(ctx, partB ? "数据：COMEX 黄金期货 · 1980 年前为伦敦金价 · 美联储 · 国际货币基金组织" : "数据：COMEX 黄金期货 · 美联储汇率 · 国际货币基金组织", SL, 1432, 18, 500, SANS, MUTED, { alpha: 0.7, maxW: 860 });
  ctx.restore();

  // flashes: green on drops, red-gold on highs
  for (const ev of EVS) {
    const age = t - ev.t;
    if (age < 0 || age > 0.45 || !ev.hit) continue;
    const dn = hasFx(ev, "frame") || hasFx(ev, "crack");
    const a = (dn ? 0.3 : 0.12) * Math.exp(-age / 0.11) * Math.min(1, ev.hit);
    ctx.fillStyle = dn ? `rgba(${DN_RGB},${a})` : `rgba(${UP_RGB},${a})`;
    ctx.fillRect(0, 0, W, H);
  }
  const endA = smooth((t - (T_END - 0.55)) / 0.55);
  if (endA > 0) {
    ctx.fillStyle = `rgba(0,0,0,${endA})`;
    ctx.fillRect(0, 0, W, H);
  }
};

// =====================================================================================================================
export const SampleG3: React.FC = () => {
  const f = useCurrentFrame();
  const [handle] = useState(() => delayRender("sample3 fonts + mark", { timeoutInMilliseconds: 180000 }));
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
      <Sequence from={0} durationInFrames={cut}>
        <Audio src={staticFile("score_world8.wav")} volume={(fr) => clamp((cut - fr) / 3)} />
      </Sequence>
      <Sequence from={cut} durationInFrames={SAMPLE3_FRAMES - cut}>
        <Audio src={staticFile("score_world8.wav")} startFrom={Math.round(BAR(40) * FPS)} volume={(fr) => clamp(fr / 3) * clamp((SAMPLE3_FRAMES - cut - fr) / 18)} />
      </Sequence>
    </AbsoluteFill>
  );
};
