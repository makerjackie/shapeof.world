// Engine4: 金价两百年 v4. The look test 3 stage (a 3D price wall, a perspective floor, a camera that chases the head on a
// spring, 红涨绿跌 numbers, red/green candles in close-ups, each period's move as a red/green bar on the floor) running the
// whole v3 story from gold4.ts: a gold cold open (the full line, eight spikes on eight beats, the question, the rewind),
// five acts with a camera per event, threshold wires (the legal prices, the 1980 high), FX per event, the ending.
// Safe area: x 60..940, y 200..1440.
import React, { useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, Audio, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { SANS, SERIF, fontsReady } from "./fonts6";
import DATA from "./gold4_data.json";
import { cursorFrom } from "./time6";
import { ACT, A, BAR, CARD_T, COLD, COLD_Q, CRED_T, END_T, ENDING, MUSIC, PLACED, REWIND, SERIES_SRC, WIRES, Fx, P4, View } from "./gold4";

const W = 1080;
const H = 1920;
const FPS = 30;
export const FRAMES4 = Math.round(MUSIC.dur * FPS);
const SL = 70;
const SR = 930;

const GOLD = "#ffc94d";
const GOLD_RGB = "255,201,77";
const UP = "#ff4a3d";
const UP_RGB = "255,74,61";
const DN = "#1fd17a";
const DN_RGB = "31,209,122";
const WAR = "#ff8a3d";
const WAR_RGB = "255,138,61";
const ICE_RGB = "140,200,255";
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
const fmt = (v: number) => (v < 100 ? v.toFixed(2) : Math.round(v).toLocaleString("en-US"));
const fmt0 = (v: number) => Math.round(v).toLocaleString("en-US");

// ---------------- data
type DJ = { p: number[][]; res: Record<string, [number, number][]>; walcl: [number, number][]; fed: [number, number][]; cpi: [number, number][] };
const DJS = DATA as unknown as DJ;
const P = DJS.p; // [year, close US$, kind 0 annual / 1 monthly / 2 trading day, open, high, low, 元/克]
const NP = P.length;
const PY = Float64Array.from(P.map((p) => p[0]));
const FIRST_Y = PY[0];
const LAST_Y = PY[NP - 1];
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
  return lerp(P[i][1], P[i + 1][1], P[i + 1][2] === 2 ? eo3(u) : u);
};
const dateOf = (y: number) => {
  const yr = Math.floor(y);
  const days = yr % 4 === 0 ? 366 : 365;
  const d = new Date(Date.UTC(yr, 0, Math.round((y - yr) * days + 0.5)));
  return [yr, d.getUTCMonth() + 1, d.getUTCDate()] as const;
};
const stepAt = <T extends [number, number]>(s: T[], y: number) => {
  let v = s[0][1];
  for (const [yy, x] of s) if (yy <= y) v = x;
  return v;
};
const resAt = (name: string, y: number) => {
  const s = DJS.res[name];
  if (y < s[0][0] - 1) return 0;
  if (y <= s[0][0]) return s[0][1];
  for (let i = 1; i < s.length; i++) if (y <= s[i][0]) return s[i - 1][1] + ((s[i][1] - s[i - 1][1]) * (y - s[i - 1][0])) / (s[i][0] - s[i - 1][0]);
  return s[s.length - 1][1];
};
const COUNTRIES = Object.keys(DJS.res);
const RC: Record<string, string> = {
  美国: "#6fa8dc", 德国: "#9aa5b1", 法国: "#7f9bd6", 意大利: "#b5c46a", 瑞士: "#d27a92", 英国: "#a98bd6", 荷兰: "#e0a35f", 比利时: "#c2a24f",
  中国: "#ffc94d", 俄罗斯: "#c9605e", 日本: "#e39a4f", 印度: "#6cbfa0", 加拿大: "#5fb7aa", 葡萄牙: "#7fc27a", 委内瑞拉: "#58b368",
  土耳其: "#d9b36c", 波兰: "#8e83d6", 西班牙: "#e0a35f", 奥地利: "#5aa1b8",
};
// period move: vs the previous data point of the same kind
const pctAt = (i: number) => (i > 0 ? P[i][1] / P[i - 1][1] - 1 : 0);

// ---------------- the clock
const BODY_KEYS = [{ t: REWIND[1], y: PLACED[0].y, p: 1 }, ...PLACED.map((e) => ({ t: e.t0, y: e.y, p: e.go === "slam" ? 2.6 : 1.4 }))];
const CURSOR = cursorFrom(BODY_KEYS);
const headAt = (t: number) => {
  if (t < REWIND[0]) return LAST_Y;
  if (t < REWIND[1]) return lerp(LAST_Y, PLACED[0].y, smooth((t - REWIND[0]) / (REWIND[1] - REWIND[0])));
  if (t >= END_T) return LAST_Y;
  return CURSOR(t);
};
const evAt = (t: number) => {
  let e: P4 | null = null;
  for (const x of PLACED) if (x.t0 <= t + 1e-6) e = x;
  return e;
};

// ---------------- views: log overview (cold open, ending) or a window per event, changing on the lunge into the beat
type VS = { x?: [number, number]; span?: number; m?: number; log?: boolean };
const LOGV: VS = { x: [1786, 2029], log: true };
const VKEYS: { t: number; s: VS }[] = (() => {
  const out: { t: number; s: VS }[] = [{ t: 0, s: LOGV }, { t: REWIND[0] + 0.3, s: LOGV }, { t: REWIND[1], s: PLACED[0].v ?? { span: 60 } }];
  PLACED.forEach((e, k) => {
    if (k === 0) return;
    const prev = PLACED[k - 1];
    const tr = clamp((e.t0 - prev.t0) * 0.55, 0.35, 1.1);
    out.push({ t: Math.max(prev.t0 + 0.2, e.t0 - tr), s: prev.v ?? { span: 8 } });
    out.push({ t: e.t0, s: e.v ?? { span: 8 } });
  });
  out.push({ t: END_T, s: PLACED[PLACED.length - 1].v ?? { span: 2 } });
  out.push({ t: END_T + 1.6, s: LOGV });
  out.push({ t: 1e9, s: LOGV });
  return out;
})();
const LOG0 = Math.log(12);
const LOG1 = Math.log(9000);
const rawX = (s: VS, h: number): [number, number] => {
  if (s.x) return s.x;
  const sp = s.span ?? 8;
  const m = s.m ?? 0.12;
  return [h - sp * (1 - m), h + sp * m];
};
const fitY = (x0: number, x1: number, h: number): [number, number] => {
  const i0 = idxAt(Math.max(FIRST_Y, x0));
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
  const rmin = mx * (h < 1968 ? 1.0 : h < 2000.6 ? 0.3 : 0.05);
  const r = Math.max(mx - mn, rmin);
  const mid = mx - mn < rmin ? (mx + mn) / 2 : NaN;
  if (!isNaN(mid)) return [Math.max(0, mid - r * 0.55), mid + r * 0.75];
  return [Math.max(0, mn - 0.14 * r), mx + 0.38 * r];
};
const viewAt = (t: number, h: number) => {
  let k = 0;
  while (k < VKEYS.length - 2 && t >= VKEYS[k + 1].t) k++;
  const a = VKEYS[k];
  const b = VKEYS[k + 1];
  const u = smooth(clamp((t - a.t) / Math.max(1e-6, b.t - a.t)));
  const xa = rawX(a.s, h);
  const xb = rawX(b.s, h);
  const x0 = lerp(xa[0], xb[0], u);
  const x1 = lerp(xa[1], xb[1], u);
  const lg = lerp(a.s.log ? 1 : 0, b.s.log ? 1 : 0, u);
  const fw = lerp(a.s.x ? 1 : 0, b.s.x ? 1 : 0, u);
  const [y0, y1] = fitY(x0, x1, h);
  return { x0, x1, y0, y1, lg, fw };
};

// ---------------- per frame: head, view (y smoothed), the camera's spring, shake, the hit times
const hitOf = (e: P4) => (e.k === "crash" ? (e.big ? 1.15 : 0.5) : e.k === "war" ? 0.55 : e.k === "split" ? 1.0 : e.k === "peak" ? (e.big ? 0.6 : 0.25) : 0.12);
const HITS: { t: number; g: number }[] = [...COLD.map((c) => ({ t: c.at, g: 0.3 })), ...PLACED.map((e) => ({ t: e.t0, g: hitOf(e) }))];
const PH = 760;
const PW = 1500;
const Y_F = -PH / 2 - 24;
const NF = FRAMES4 + 2;
const SIM = (() => {
  const head: number[] = [];
  const view: { x0: number; x1: number; y0: number; y1: number; lg: number; fw: number }[] = [];
  const camY: number[] = [];
  const camX: number[] = [];
  const shake: number[] = [];
  let sy0 = 0;
  let sy1 = 0;
  let cy = 0;
  let cv = 0;
  let cx = 0;
  let e = 0;
  for (let f = 0; f < NF; f++) {
    const t = f / FPS;
    const h = headAt(t);
    const v = viewAt(t, h);
    if (f === 0) {
      sy0 = v.y0;
      sy1 = v.y1;
    } else {
      const k = 1 - Math.exp(-1 / FPS / 0.18);
      sy0 += (v.y0 - sy0) * k;
      sy1 += (v.y1 - sy1) * k;
    }
    const vv = { ...v, y0: sy0, y1: sy1 };
    head.push(h);
    view.push(vv);
    // where the camera looks on the wall: the head (spring on its height) or the middle of an overview;
    // in the cold open it travels to each spike
    const Vh = lerp((priceAt(h) - sy0) / (sy1 - sy0), (Math.log(Math.max(1, priceAt(h))) - LOG0) / (LOG1 - LOG0), vv.lg);
    let tx = lerp(-PW / 2 + ((h - v.x0) / (v.x1 - v.x0)) * PW - 150, 0, v.fw);
    let ty = lerp(-PH / 2 + Vh * PH, 0, v.fw);
    if (t < REWIND[0]) {
      let ci = -1;
      for (let i = 0; i < COLD.length; i++) if (t >= COLD[i].at - 0.25) ci = i;
      const cyv = ci >= 0 ? COLD[ci].y : 1900;
      tx = 0.6 * (-PW / 2 + ((cyv - v.x0) / (v.x1 - v.x0)) * PW);
      ty = 0;
    }
    if (f === 0) {
      cy = ty;
      cx = tx;
    }
    const k = 70;
    const z = 0.45;
    for (let s = 0; s < 6; s++) {
      const dt = 1 / (FPS * 6);
      cv += (k * (ty - cy) - 2 * Math.sqrt(k) * z * cv) * dt;
      cy += cv * dt;
    }
    cx += (tx - cx) * (1 - Math.exp(-1 / FPS / 0.35));
    camY.push(cy);
    camX.push(cx);
    e *= Math.exp(-1 / FPS / 0.22);
    for (const hh of HITS) if (hh.t >= t - 1 / FPS && hh.t < t) e += hh.g;
    if (f > 0 && t > REWIND[1]) {
      const ip = idxAt(head[f - 1]);
      const ic = idxAt(h);
      for (let i = ip + 1; i <= ic && i - ip < 40; i++) if (P[i][2] === 2) e += Math.max(0, Math.abs(pctAt(i)) - 0.02) * 6;
    }
    shake.push(Math.min(e, 1.4));
  }
  return { head, view, camY, camX, shake };
})();
const reachT = (y: number) => {
  for (let f = 1; f < NF; f++) if (SIM.head[f] >= y && SIM.head[f - 1] < y && f / FPS > REWIND[1]) return f / FPS;
  return -1;
};
// all-time highs (US$) the head runs through, from 1972 on: a small 新高 flash each
const RECS = (() => {
  let mx = 0;
  const out: number[] = [];
  for (let i = 0; i < NP; i++) {
    if (P[i][1] > mx) {
      if (PY[i] > 1972) out.push(PY[i]);
      mx = P[i][1];
    }
  }
  return out.map((y) => [y, reachT(y)] as const).filter(([, t]) => t > 0);
})();
const WIRE_T = WIRES.map((w) => ({ snap: w.snapAt ? reachT(w.snapAt) : -1, lit: w.litAt ? reachT(w.litAt) : -1 }));

// ---------------- camera
type Pr = (x: number, y: number, z: number) => [number, number, number] | null;
const keyed = (t: number, ks: [number, number][]) => {
  if (t <= ks[0][0]) return ks[0][1];
  for (let k = 0; k < ks.length - 1; k++) if (t < ks[k + 1][0]) return lerp(ks[k][1], ks[k + 1][1], smooth((t - ks[k][0]) / (ks[k + 1][0] - ks[k][0])));
  return ks[ks.length - 1][1];
};
const camera = (t: number, f: number) => {
  const fi = Math.min(f, NF - 1);
  const v = SIM.view[fi];
  const close = clamp((PW / (v.x1 - v.x0) / 252 - 2) / 6); // how close (daily candles) we are
  const cold = t < REWIND[1] ? 1 - smooth((t - REWIND[0]) / (REWIND[1] - REWIND[0])) : 0;
  const ending = smooth((t - END_T) / 1.6);
  const over = Math.max(v.fw, cold, ending);
  const hit = HITS.reduce((m, hh) => Math.max(m, hh.g * env(t, hh.t, 0.03, 0.5)), 0);
  const Tx = SIM.camX[fi];
  const Ty = SIM.camY[fi] + 30;
  const dist = lerp(lerp(1300, 1150, close), 1700, over) - 150 * hit + 60 * Math.sin(t * 0.21);
  const theta = (lerp(lerp(34, 42, close), cold > 0.5 ? 20 : 26, over) + 3 * Math.sin(t * 0.13) * (1 - close) * 0 + (cold > 0 ? -6 * Math.sin(t * 0.5) * 0 : 0)) * (Math.PI / 180);
  const phi = (lerp(9, 11, over) * Math.PI) / 180;
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
  const sh = SIM.shake[fi];
  const r = rng(f * 31 + 7);
  const cxs = lerp(480, 520, over) + (r() - 0.5) * 44 * sh;
  const cys = 905 + (r() - 0.5) * 44 * sh;
  const proj: Pr = (x, y, z) => {
    const dx = x - cpx;
    const dy = y - cpy;
    const dz = z - cpz;
    const zc = dx * fx + dy * fy + dz * fz;
    if (zc < 40) return null;
    return [cxs + (FOC * (dx * rx + dz * rz)) / zc, cys - (FOC * (dx * ux + dy * uy + dz * uz)) / zc, zc];
  };
  return { proj, keyed };
};

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
const tab = (ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string, glow?: string) => {
  ctx.font = `900 ${size}px ${SANS}`;
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
const chip = (ctx: CanvasRenderingContext2D, s: string, x: number, y: number, col: string, size = 20) => {
  ctx.font = `900 ${size}px ${SANS}`;
  const w = ctx.measureText(s).width + 16;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.roundRect(x, y - size - 4, w, size + 12, 3);
  ctx.fill();
  text(ctx, s, x + 8, y + 1, size, 900, SANS, "#120d03");
  return w;
};
const KIND: Record<string, [string, string]> = {
  peak: ["新高", UP], grow: ["上涨", UP], crash: ["暴跌", DN], war: ["战争", WAR], policy: ["政策", "#8fb4ff"], split: ["脱钩", GOLD], turn: ["转折", GOLD], stat: ["数据", "#b8bec4"], note: ["背景", "#b8bec4"],
};
const nCol = (e: P4) => (e.k === "crash" ? DN : e.k === "peak" ? UP : e.k === "war" ? WAR : GOLD);

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
const DUST = (() => {
  const r = rng(77);
  return Array.from({ length: 240 }, () => [lerp(-1100, 1100, r()), lerp(Y_F, 560, r()), lerp(-700, 1700, r()), r()] as const);
})();
const AMP = (p: number) => 175 * (1 - Math.exp(-Math.abs(p) / 0.03));

// =====================================================================================================================
let CH: HTMLCanvasElement | null = null;
const draw = (ctx0: CanvasRenderingContext2D, f: number) => {
  let ctx = ctx0;
  const t = f / FPS;
  const fi = Math.min(f, NF - 1);
  const h = SIM.head[fi];
  const { x0, x1, y0, y1, lg } = SIM.view[fi];
  const { proj } = camera(t, f);
  const U = (yr: number) => (yr - x0) / (x1 - x0);
  const V = (v: number) => lerp((v - y0) / (y1 - y0), (Math.log(Math.max(1, v)) - LOG0) / (LOG1 - LOG0), lg);
  const WX = (u: number) => -PW / 2 + u * PW;
  const WY = (v: number) => -PH / 2 + v * PH;
  const ptAt = (yr: number, v: number) => proj(WX(U(yr)), WY(V(v)), 0);
  const price = priceAt(h);
  const ih = idxAt(h);
  const cold = t < REWIND[1];
  const inCold = t < REWIND[0];
  const ending = t >= END_T;
  const ev = !cold && !ending ? evAt(t) : null;

  // ---- background
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
  const credA = smooth((t - CRED_T) / 0.6);
  const cardA = smooth((t - CARD_T) / 0.6);

  // ================= the stage
  CH ??= document.createElement("canvas");
  CH.width = W;
  CH.height = H;
  ctx = CH.getContext("2d")!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const xa = WX(-0.2);
  const xb = WX(1.15);
  // floor grid
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
  // price grid on the wall (linear: nice steps; log: 20 / 35 / 100 / 1,000 / 5,000)
  {
    let levels: number[] = [];
    if (lg > 0.5) levels = [20, 35, 100, 300, 1000, 2000, 5000];
    else {
      const span = y1 - y0;
      const raw = span / 5;
      const mag = Math.pow(10, Math.floor(Math.log10(raw)));
      const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => s >= raw) ?? raw;
      for (let v = Math.ceil(y0 / step) * step; v <= y1 + span * 0.1; v += step) levels.push(v);
    }
    for (const v of levels) {
      const a = proj(xa, WY(V(v)), 0);
      const b = proj(WX(Math.min(1.06, Math.max(0.2, U(h) + 0.06))), WY(V(v)), 0);
      if (!a || !b) continue;
      ctx.strokeStyle = "rgba(255,255,255,0.07)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
      if (b[1] > 610 && b[1] < 1270 && b[0] < SR) text(ctx, `$${fmt0(v)}`, b[0] + 8, b[1] + 6, 20, 500, SANS, MUTED, { alpha: 0.75 });
    }
  }
  // time marks at the wall's foot
  {
    const spanY = x1 - x0;
    const marks: [number, string][] = [];
    const every = spanY > 120 ? 50 : spanY > 50 ? 20 : spanY > 14 ? 10 : spanY > 6 ? 2 : spanY > 1.6 ? 1 : 0;
    if (every) for (let y = Math.ceil(x0 / every) * every; y <= x1; y += every) marks.push([y, `${y}`]);
    else if (spanY > 0.7) for (let k = Math.ceil(x0 * 4); k <= x1 * 4; k++) marks.push([k / 4, k % 4 === 0 ? `${Math.floor(k / 4)}` : `${(k % 4) * 3 + 1} 月`]);
    else
      for (let k = Math.floor(x0 * 12); k <= x1 * 12; k++) {
        const mm = (((k % 12) + 12) % 12) + 1;
        marks.push([k / 12, mm === 1 ? `${Math.floor(k / 12)}` : `${mm} 月`]);
      }
    for (const [yy, lab] of marks) {
      if (yy > Math.max(h, inCold ? LAST_Y : h) + 0.0001 || yy < Math.max(x0, FIRST_Y - 1)) continue;
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
  // threshold wires
  if (!cold && !ending) {
    WIRES.forEach((w, k) => {
      const fl = w.v > 1000 ? 0.12 : 0.3;
      if (h < w.y0 || h > w.y1 + fl) return;
      const fade = 1 - smooth((h - w.y1) / fl);
      const { snap, lit } = WIRE_T[k];
      const snapped = snap > 0 && t >= snap;
      const age = snapped ? t - snap : 0;
      if (snapped && age > 1.0) return;
      const a = ptAt(Math.max(w.y0, x0 - (x1 - x0) * 0.1), w.v);
      const xe = Math.min(h, w.y1) + (x1 - x0) * 0.06;
      const b = ptAt(xe, w.v);
      if (!a || !b) return;
      const isLit = lit > 0 && t >= lit;
      const col = w.tone === "gold" ? GOLD_RGB : "235,235,235";
      ctx.save();
      ctx.globalAlpha = fade * (snapped ? 1 - age : 1);
      if (snapped) {
        // the peg breaks at the head: the two halves fall away
        const hp = ptAt(h, w.v) ?? b;
        const drop = 600 * age * age;
        ctx.strokeStyle = `rgba(${col},0.9)`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1] + drop * 0.3);
        ctx.lineTo(hp[0] - 20 - 60 * age, hp[1] + drop);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(hp[0] + 20 + 80 * age, hp[1] + drop * 1.2);
        ctx.lineTo(hp[0] + 140 + 80 * age, hp[1] + drop * 1.4);
        ctx.stroke();
      } else {
        ctx.strokeStyle = isLit ? GOLD : `rgba(${col},0.75)`;
        ctx.lineWidth = isLit ? 3.5 : 2;
        if (!isLit) ctx.setLineDash([12, 9]);
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
        ctx.setLineDash([]);
        const lx = clamp(a[0] + 8, SL, SR - 300);
        text(ctx, w.label, lx, a[1] - 12 + (lx - a[0]) * ((b[1] - a[1]) / Math.max(1, b[0] - a[0])), 20, 900, SANS, `rgb(${col})`, { alpha: 0.9, maxW: 520 });
        if (isLit) {
          const pu = (t - lit) / 0.55;
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
        }
      }
      ctx.restore();
    });
  }
  // the series up to the head (in the cold open: all of it)
  const hEnd = inCold ? LAST_Y : h;
  const iEnd = idxAt(hEnd);
  const i0 = Math.max(0, idxAt(x0 - (x1 - x0) * 0.2) - 1);
  const unitsPerDay = PW / (x1 - x0) / 252;
  const candleK = smooth((unitsPerDay - 5) / 4) * (cold || ending ? 0 : 1);
  const pts: [number, number, number][] = [];
  {
    let lx = -1e9;
    let ly = -1e9;
    for (let i = i0; i <= iEnd; i++) {
      const p = ptAt(PY[i], P[i][1]);
      if (!p) continue;
      if (i < iEnd && Math.abs(p[0] - lx) < 0.9 && Math.abs(p[1] - ly) < 0.9) continue;
      pts.push([p[0], p[1], i]);
      lx = p[0];
      ly = p[1];
    }
    const hp = ptAt(hEnd, priceAt(hEnd));
    if (hp) pts.push([hp[0], hp[1], -1]);
  }
  const hp = ptAt(hEnd, priceAt(hEnd));
  // curtain
  if (pts.length > 1 && hp) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (const q of pts) ctx.lineTo(q[0], q[1]);
    for (let k = pts.length - 1; k >= 0; k--) {
      const yy = pts[k][2] >= 0 ? PY[pts[k][2]] : hEnd;
      const b = proj(WX(U(yy)), Y_F, 0);
      if (b) ctx.lineTo(b[0], b[1]);
    }
    ctx.closePath();
    const fl = proj(WX(U(hEnd)), Y_F, 0);
    const g = ctx.createLinearGradient(0, hp[1] - 220, 0, fl ? fl[1] : hp[1] + 500);
    g.addColorStop(0, `rgba(${GOLD_RGB},0.28)`);
    g.addColorStop(0.6, `rgba(${GOLD_RGB},0.08)`);
    g.addColorStop(1, `rgba(${GOLD_RGB},0.03)`);
    ctx.fillStyle = g;
    ctx.fill();
  }
  // each period's move as a bar on the floor, red up / green down (fades out when candles take over)
  if (candleK < 0.98 && !cold) {
    ctx.save();
    ctx.globalAlpha = (1 - candleK) * (1 - smooth((t - END_T) / 1.2));
    for (let i = Math.max(1, idxAt(x0)); i <= iEnd; i++) {
      const kind = P[i][2];
      const per = kind === 2 ? unitsPerDay : kind === 1 ? (unitsPerDay * 252) / 12 : unitsPerDay * 252;
      if (per < 0.9) continue;
      const pc = pctAt(i) / (kind === 2 ? 1 : kind === 1 ? 2.2 : 4);
      const grow = i === iEnd ? clamp(((h - PY[i]) * 252) / (kind === 2 ? 1 : kind === 1 ? 21 : 252) * 1.5 + 0.2) : 1;
      const x = WX(U(PY[i]));
      const b = proj(x, Y_F, -70);
      const tp = proj(x, Y_F + AMP(pc) * grow, -70);
      if (!b || !tp) continue;
      const w = Math.max(1, (clamp(per * 0.55, 0.8, 22) * 1000) / b[2]);
      ctx.fillStyle = pc >= 0 ? `rgba(${UP_RGB},0.85)` : `rgba(${DN_RGB},0.85)`;
      ctx.fillRect(b[0] - w / 2, tp[1], w, b[1] - tp[1]);
    }
    ctx.restore();
  }
  // the line: molten gold, crash days glow green
  if (pts.length > 1) {
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.globalCompositeOperation = "lighter";
    const la = 1 - 0.75 * candleK;
    const crashYs = PLACED.filter((e) => e.k === "crash" && e.big).map((e) => e.y);
    for (const pass of [0, 1]) {
      for (let k = 1; k < pts.length; k++) {
        const a = pts[k - 1];
        const b = pts[k];
        const yy = b[2] >= 0 ? PY[b[2]] : hEnd;
        const crash = crashYs.some((c) => yy > c - 1.5 / 252 && yy <= c + 0.0001);
        const wd = clamp((5.2 * 1300) / Math.max(400, b.length ? (proj(WX(U(yy)), 0, 0)?.[2] ?? 1300) : 1300), 1.2, 8);
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
  // candles in close-ups: 红涨绿跌
  if (candleK > 0) {
    ctx.save();
    ctx.globalAlpha = candleK;
    for (let i = Math.max(0, idxAt(x0)); i <= ih; i++) {
      const pp = P[i];
      if (pp[2] !== 2) continue;
      const isHead = i === ih;
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
      const w = clamp((unitsPerDay * 0.62 * 1000) / top[2], 2, 30);
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
  if (hp && !inCold) {
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
  // new highs flash on the line
  for (const [yy, tr] of RECS) {
    const age = t - tr;
    if (age < 0 || age > 0.6) continue;
    const at = ptAt(yy, priceAt(yy));
    if (!at) continue;
    const a = 1 - age / 0.6;
    ctx.globalCompositeOperation = "lighter";
    const rg = ctx.createRadialGradient(at[0], at[1], 0, at[0], at[1], 30);
    rg.addColorStop(0, `rgba(${UP_RGB},${0.7 * a})`);
    rg.addColorStop(1, `rgba(${UP_RGB},0)`);
    ctx.fillStyle = rg;
    ctx.fillRect(at[0] - 30, at[1] - 30, 60, 60);
    ctx.globalCompositeOperation = "source-over";
    text(ctx, "新高", at[0], at[1] - 22 - 30 * eo3(age / 0.6), 22, 900, SANS, UP, { align: "center", alpha: a });
  }
  // cold open: the eight spikes, one per beat; ending: the named turns
  const spikeLabel = (yy: number, name: string, p: string, a: number, col: string) => {
    const at = ptAt(yy, priceAt(yy));
    if (!at || a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(at[0], at[1], 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(at[0], at[1] - 10);
    ctx.lineTo(at[0], at[1] - 70);
    ctx.stroke();
    text(ctx, name, at[0], at[1] - 104, 34, 900, SANS, WHITE, { align: "center", glow: "rgba(0,0,0,0.9)", blur: 12 });
    if (p) text(ctx, p, at[0], at[1] - 76, 26, 900, SANS, col, { align: "center", glow: "rgba(0,0,0,0.9)", blur: 12 });
    ctx.restore();
  };
  if (inCold) {
    COLD.forEach((c, i) => {
      const next = COLD[i + 1]?.at ?? COLD_Q[0];
      const a = smooth((t - c.at + 0.04) / 0.1) * (1 - smooth((t - next + 0.05) / 0.15));
      spikeLabel(c.y, c.t, c.p, a, UP);
    });
  }
  if (ending && credA < 1) {
    ENDING.troughs.forEach((tr, i) => {
      const a = smooth((t - END_T - 0.8 - i * 0.25) / 0.3) * (1 - credA);
      spikeLabel(tr.y, tr.t, "", a * 0.9, tr.dn ? DN : UP);
    });
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
  ctx.globalAlpha = 1 - 0.8 * credA;
  ctx.drawImage(CH, 0, 0);
  ctx.globalAlpha = 1;

  // ================= FX at the event's point
  const fxList: { t: number; y: number; fx: Fx[]; big: boolean; k: string }[] = [
    ...COLD.map((c) => ({ t: c.at, y: c.y, fx: ["bigspark"] as Fx[], big: false, k: "peak" })),
    ...PLACED.map((e) => ({ t: e.t0, y: e.y, fx: e.fx ?? [], big: !!e.big, k: e.k })),
  ];
  for (const fe of fxList) {
    const age = t - fe.t;
    if (age < 0 || age > 3.2) continue;
    const at = ptAt(fe.y, priceAt(fe.y));
    if (!at) continue;
    const has = (k: Fx) => fe.fx.includes(k);
    if (has("spark") || has("bigspark")) {
      const big = has("bigspark");
      const r = rng(Math.round(fe.t * 1000));
      const n = big ? 120 : 55;
      ctx.globalCompositeOperation = "lighter";
      for (let k = 0; k < n; k++) {
        const ang = -Math.PI / 2 + (r() - 0.5) * (big ? 2.4 : 1.8);
        const sp = (big ? 540 : 360) * (0.35 + r());
        const life = 0.7 + r() * 0.9;
        const a2 = age - r() * 0.12;
        if (a2 < 0 || a2 > life) continue;
        const x = at[0] + Math.cos(ang) * sp * a2;
        const y = at[1] + Math.sin(ang) * sp * a2 + 0.5 * 900 * a2 * a2;
        const fade = 1 - a2 / life;
        ctx.fillStyle = k % 3 === 0 ? `rgba(255,${Math.round(lerp(60, 120, fade))},50,${fade})` : `rgba(255,${Math.round(lerp(150, 230, fade))},${Math.round(lerp(40, 140, fade))},${fade})`;
        const s = 1.5 + r() * 2.8;
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      }
      const u = clamp(age / 0.7);
      ctx.strokeStyle = `rgba(${UP_RGB},${(1 - u) * 0.8})`;
      ctx.lineWidth = 3 * (1 - u) + 0.5;
      ctx.beginPath();
      ctx.arc(at[0], at[1], 14 + (big ? 180 : 110) * eo3(u), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
    }
    if (has("drip")) {
      const r = rng(Math.round(fe.t * 777));
      const flo = proj(WX(U(fe.y)), Y_F, -120);
      const floorY = flo ? flo[1] : 1250;
      ctx.globalCompositeOperation = "lighter";
      for (let k = 0; k < (fe.big ? 80 : 40); k++) {
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
          const sa = a2 - Math.sqrt((2 * Math.max(0, floorY - yStart)) / 1700);
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
    if (has("crack")) {
      const r = rng(Math.round(fe.t * 991));
      const a = (age < 0.05 ? age / 0.05 : 1) * (1 - smooth((age - 0.9) / 0.6));
      if (a > 0) {
        const warm = fe.k === "war";
        const glowRgb = warm ? WAR_RGB : DN_RGB;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const len = eo3(age / 0.22);
        const paths: [number, number][][] = [];
        for (let b = 0; b < 7; b++) {
          const L = (110 + r() * 170) * len;
          let x = at[0];
          let y = at[1];
          let ang = (b / 7) * Math.PI * 2 + (r() - 0.5) * 0.6;
          const path: [number, number][] = [[x, y]];
          for (let k = 0; k < 7; k++) {
            ang += (r() - 0.5) * 0.9;
            x += (Math.cos(ang) * L) / 7;
            y += (Math.sin(ang) * L) / 7;
            path.push([x, y]);
            if (r() < 0.3) {
              const fa = ang + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.6);
              const fl2 = (L / 7) * (1 + r() * 1.5);
              paths.push([[x, y], [x + Math.cos(fa) * fl2, y + Math.sin(fa) * fl2]]);
            }
          }
          paths.push(path);
        }
        for (const [lw, col] of [
          [8, `rgba(${glowRgb},${0.3 * a})`],
          [2.2, warm ? `rgba(255,236,210,${0.95 * a})` : `rgba(230,255,240,${0.95 * a})`],
        ] as const) {
          ctx.strokeStyle = col;
          ctx.lineWidth = lw;
          for (const path of paths) {
            ctx.beginPath();
            path.forEach(([px, py], k) => (k ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
            ctx.stroke();
          }
        }
        ctx.restore();
      }
    }
    if (has("lock") || has("freeze")) {
      const ice = has("freeze");
      const pop = eo3(age / 0.25);
      const a = (1 - smooth((age - 1.6) / 0.5)) * clamp(age / 0.08);
      if (a > 0) {
        const s = 1 + 0.4 * (1 - pop);
        const col = ice ? `rgb(${ICE_RGB})` : GOLD;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(at[0], at[1] - 90);
        ctx.scale(s, s);
        ctx.shadowColor = ice ? `rgba(${ICE_RGB},0.8)` : `rgba(${GOLD_RGB},0.8)`;
        ctx.shadowBlur = 24;
        ctx.strokeStyle = col;
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.arc(0, -18, 24, Math.PI, 0);
        ctx.lineTo(24, 0);
        ctx.moveTo(-24, 0);
        ctx.lineTo(-24, -18);
        ctx.stroke();
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.roundRect(-38, -4, 76, 58, 8);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#120d03";
        ctx.beginPath();
        ctx.arc(0, 20, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-3, 22, 6, 16);
        ctx.restore();
        if (ice) {
          // frost spreads from the point
          const u = clamp(age / 1.2);
          const rr = rng(4711);
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.strokeStyle = `rgba(${ICE_RGB},${0.5 * a * (1 - u * 0.5)})`;
          ctx.lineWidth = 1.4;
          for (let k = 0; k < 40; k++) {
            const ang = rr() * Math.PI * 2;
            const L = (40 + rr() * 260) * eo3(u);
            const x2 = at[0] + Math.cos(ang) * L;
            const y2 = at[1] + Math.sin(ang) * L * 0.6;
            ctx.beginPath();
            ctx.moveTo(at[0] + Math.cos(ang) * L * 0.3, at[1] + Math.sin(ang) * L * 0.18);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x2 + Math.cos(ang + 0.6) * 18, y2 + Math.sin(ang + 0.6) * 12);
            ctx.stroke();
          }
          ctx.restore();
        }
      }
    }
    if (has("bills") && age < 3.2) {
      const r = rng(Math.round(fe.t * 4242));
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
  }

  // ================= overlays
  const shk = SIM.shake[fi];
  ctx.save();
  ctx.translate(shk * 5 * Math.sin(t * 90), 0);
  ctx.globalAlpha = 1 - cardA;
  // brand row + act
  if (MARK) ctx.drawImage(MARK, SL, 208, 28, 28);
  let bx = SL + 36;
  bx += text(ctx, "世界的形状", bx, 230, 22, 900, SANS, WHITE) + 10;
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(bx, 212, 1.5, 22);
  text(ctx, "金价两百年", bx + 12, 230, 22, 900, SANS, GOLD);
  const bodyA = !cold && !ending ? 1 : 0;
  if (bodyA) text(ctx, ACT(h), SL, 266, 22, 500, SANS, MUTED);
  // the numbers: the focus year (in the cold open: the spike on this beat)
  let fy = h;
  if (inCold) {
    fy = LAST_Y;
    for (const c of COLD) if (t >= c.at - 0.02) fy = c.y;
  }
  const hdA = 1 - credA;
  if (hdA > 0) {
    ctx.save();
    ctx.globalAlpha *= hdA;
    const fi2 = idxAt(fy);
    const iShow = fy - PY[fi2] > 0.5 / 252 && fi2 < NP - 1 && P[fi2 + 1][2] === 2 ? fi2 + 1 : fi2;
    const kind = P[iShow][2];
    const [yy, mm, dd] = dateOf(PY[iShow]);
    const dateS = kind === 0 ? `${yy} 年` : kind === 1 ? `${yy} 年 ${mm} 月` : `${yy} 年 ${mm} 月 ${dd} 日`;
    text(ctx, dateS, SL, 314, 36, 500, SANS, MUTED);
    const pr = inCold ? P[iShow][1] : priceAt(fy);
    const pc = pctAt(iShow);
    const col = Math.abs(pc) < 0.0005 ? WHITE : pc > 0 ? UP : DN;
    const useCny = fy >= 2002;
    const cny = useCny ? P[iShow][6] * (pr / P[iShow][1]) : 0;
    const pw = tab(ctx, useCny ? fmt0(cny) : fmt(pr), SL, 428, 118, col);
    text(ctx, useCny ? "元/克" : "美元/盎司", SL + pw + 12, 428, 40, 900, SANS, col);
    text(ctx, useCny ? `≈ ${fmt0(pr)} 美元/盎司` : SERIES_SRC(fy), SL, 474, 28, 500, SANS, MUTED);
    // chips: the period's move, then what money buys
    let x = SL;
    if (Math.abs(pc) >= 0.0005) {
      const s = `${pc >= 0 ? "+" : "−"}${Math.abs(pc * 100).toFixed(1)}%`;
      const lab = kind === 0 ? "当年" : kind === 1 ? "当月" : "当日";
      x += text(ctx, lab, x, 524, 22, 500, SANS, MUTED) + 8;
      ctx.font = `900 30px ${SANS}`;
      const w = ctx.measureText(s).width + 26;
      ctx.fillStyle = `rgba(${pc >= 0 ? UP_RGB : DN_RGB},0.22)`;
      ctx.beginPath();
      ctx.roundRect(x, 492, w, 44, 6);
      ctx.fill();
      text(ctx, s, x + 13, 525, 30, 900, SANS, col);
      x += w + 14;
    }
    if (useCny) {
      x += text(ctx, "1 万元能买", x, 524, 22, 500, SANS, MUTED) + 8;
      x += text(ctx, `${(10000 / cny).toFixed(1)} 克`, x, 525, 28, 900, SANS, GOLD) + 16;
    } else {
      x += text(ctx, "买 1 盎司要", x, 524, 22, 500, SANS, MUTED) + 8;
      x += text(ctx, `${fmt0(pr)} 张 1 美元`, x, 525, 28, 900, SANS, GOLD) + 16;
    }
    if (fy >= 2024 && !inCold) {
      const n = RECS.filter(([y2, tr]) => y2 >= 2024 && tr <= t).length;
      if (n > 0 && x < 640) text(ctx, `新高 ×${n}`, x, 524, 24, 900, SANS, UP);
    }
    ctx.restore();
  }
  // the central-bank table (from 1950)
  if (bodyA && h >= 1950) {
    const rows = COUNTRIES.map((k) => ({ k, v: resAt(k, h), was: resAt(k, h - 10) }))
      .sort((a, b) => b.v - a.v)
      .slice(0, 6);
    const tx = 640;
    text(ctx, "各国央行黄金储备 · 吨", tx, 236, 18, 500, SANS, MUTED);
    rows.forEach((r, k) => {
      const y = 272 + k * 34;
      ctx.fillStyle = RC[r.k] ?? GOLD;
      ctx.fillRect(tx, y - 18, 3.5, 22);
      const star = r.k === "中国" && h > 2001.5 && h < 2016 ? "*" : "";
      text(ctx, r.k + star, tx + 12, y, 21, 900, SERIF, WHITE);
      text(ctx, fmt0(r.v), tx + 175, y, 21, 900, SERIF, WHITE, { align: "right" });
      if (r.was > 1) {
        const pcR = Math.round((r.v / r.was - 1) * 100);
        text(ctx, pcR === 0 ? "0%" : `${pcR > 0 ? "▲" : "▼"}${Math.abs(pcR)}%`, SR, y, 17, 900, SANS, pcR === 0 ? MUTED : pcR > 0 ? UP : DN, { align: "right" });
      }
    });
    const note = h < 1992 ? "* 苏联不公布黄金储备，不在表中" : h > 2001.5 && h < 2016 ? "* 中国 2009、2015 年才一次性公布多年增持" : "";
    if (note) text(ctx, note, tx, 482, 15, 500, SANS, MUTED, { alpha: 0.8, maxW: SR - tx });
  }
  // macro chip (the event's own, kept for two more events)
  if (ev) {
    const k = PLACED.indexOf(ev);
    let mac: P4 | null = null;
    for (let j = k; j >= Math.max(0, k - 2); j--) if (PLACED[j].macro) {
      mac = PLACED[j];
      break;
    }
    if (mac) {
      const a = smooth((t - mac.t0) / 0.3);
      const val = mac.macro === "cpi" ? `${stepAt(DJS.cpi, h).toFixed(1)}%` : mac.macro === "fed" ? `${stepAt(DJS.fed, h).toFixed(2)}%` : `${stepAt(DJS.walcl, h).toFixed(1)} 万亿美元`;
      const lab = mac.macro === "cpi" ? "美国物价涨幅（一年）" : mac.macro === "fed" ? "美联储利率" : "美联储资产";
      const rgb = mac.macro === "walcl" ? BILL_RGB : mac.macro === "cpi" ? UP_RGB : "143,180,255";
      ctx.save();
      ctx.globalAlpha *= a;
      const xx = 640;
      ctx.fillStyle = "rgba(10,8,4,0.65)";
      ctx.strokeStyle = `rgba(${rgb},0.8)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(xx, 498, SR - xx, 46, 4);
      ctx.fill();
      ctx.stroke();
      text(ctx, lab, xx + 12, 528, 18, 500, SANS, MUTED);
      text(ctx, val, SR - 12, 531, 26, 900, SANS, `rgb(${rgb})`, { align: "right" });
      ctx.restore();
    }
  }
  // the card
  if (ev && !inCold) {
    const k = PLACED.indexOf(ev);
    const next = PLACED[k + 1]?.t0 ?? END_T;
    const age = t - ev.t0;
    const inU = eo3(age / 0.22);
    const outU = smooth((t - (next - 0.16)) / 0.16);
    ctx.save();
    ctx.globalAlpha *= inU * (1 - outU);
    ctx.translate(-30 * (1 - inU), -16 * outU);
    const [lab, lc] = ev.lab ? [ev.lab, ev.lab === "冻结" ? `rgb(${ICE_RGB})` : GOLD] : KIND[ev.k] ?? ["", MUTED];
    let x = SL;
    if (lab) x += chip(ctx, lab, x, 612, lc, 20) + 10;
    if (ev.tag) text(ctx, ev.tag, x, 612, 22, 700, SANS, WHITE, { alpha: 0.88, maxW: SR - x });
    text(ctx, ev.t, SL, 676, 52, 900, SANS, WHITE, { maxW: 860, glow: "rgba(0,0,0,0.9)", blur: 16 });
    let y = 676;
    if (ev.n) {
      const pop = 1 + 0.18 * (1 - eo3(age / 0.3));
      ctx.save();
      ctx.translate(SL, 766);
      ctx.scale(pop, pop);
      text(ctx, ev.n, 0, 0, 84, 900, SANS, nCol(ev), { maxW: 860, glow: "rgba(0,0,0,0.85)", blur: 18 });
      ctx.restore();
      y = 766;
    }
    if (ev.s) text(ctx, ev.s, SL, y + 46, 30, 500, SANS, WHITE, { alpha: 0.9, maxW: 860, glow: "rgba(0,0,0,0.9)", blur: 12 });
    ctx.restore();
    // the big change next to the head
    if (ev.pct) {
      const pa = smooth((age - 0.15) / 0.15) * (1 - outU);
      const pop = 1 + 0.3 * (1 - eo3((age - 0.15) / 0.3));
      const c = ev.pct.startsWith("−") ? DN : UP;
      const rgb = c === DN ? DN_RGB : UP_RGB;
      ctx.save();
      ctx.globalAlpha *= pa;
      ctx.translate(300, 1080);
      ctx.scale(pop, pop);
      text(ctx, ev.pct, 0, 0, 120, 900, SANS, c, { align: "center", glow: `rgba(${rgb},0.55)`, blur: 30 });
      ctx.restore();
    }
  }
  // cold open: title on the first frames, then the question
  if (cold) {
    const ta = 1 - smooth((t - A(1.2)) / 0.4);
    if (ta > 0) {
      ctx.save();
      ctx.globalAlpha *= ta;
      text(ctx, "金价两百年", 540, 700, 132, 900, SANS, GOLD, { align: "center", glow: `rgba(${GOLD_RGB},0.55)`, blur: 34, ls: 6 });
      text(ctx, "1 盎司黄金 · 1792—2026", 540, 776, 36, 500, SANS, WHITE, { align: "center", alpha: 0.85 });
      ctx.restore();
    }
    const [q0, q1] = COLD_Q;
    if (t >= q0 && t < q1) {
      const a = smooth((t - q0) / 0.2) * (1 - smooth((t - q1 + 0.15) / 0.15));
      ctx.save();
      ctx.globalAlpha *= a;
      ctx.fillStyle = "rgba(6,5,4,0.66)";
      ctx.fillRect(0, 590, W, 280);
      text(ctx, "战争、印钞、危机", 540, 694, 58, 900, SANS, WHITE, { align: "center" });
      ctx.globalAlpha *= smooth((t - q0 - 0.46) / 0.2);
      text(ctx, "金子没变，金价凭什么涨？", 540, 800, 76, 900, SANS, GOLD, { align: "center", maxW: 880, glow: `rgba(${GOLD_RGB},0.5)`, blur: 26 });
      ctx.restore();
    }
    if (t >= REWIND[0]) {
      const a = smooth((t - REWIND[0]) / 0.15) * (1 - smooth((t - REWIND[1] + 0.15) / 0.15));
      ctx.save();
      ctx.globalAlpha *= a;
      const r = rng(f);
      ctx.globalCompositeOperation = "lighter";
      for (let k = 0; k < 26; k++) {
        ctx.fillStyle = `rgba(${GOLD_RGB},${0.08 + r() * 0.12})`;
        ctx.fillRect(r() * W, 600 + r() * 640, 160 + r() * 260, 2);
      }
      ctx.globalCompositeOperation = "source-over";
      text(ctx, "倒回 1792 年……", 540, 760, 56, 900, SANS, WHITE, { align: "center" });
      ctx.restore();
    }
  }
  // crash / split frame
  for (const e of PLACED) {
    if (!e.fx?.includes("frame")) continue;
    const age = t - e.t0;
    if (age < 0 || age > 1.6) continue;
    const isSplit = e.k === "split";
    const c = isSplit ? GOLD : DN;
    ctx.save();
    ctx.globalAlpha *= (age < 0.06 ? age / 0.06 : 1) * (1 - smooth((age - 1.2) / 0.4));
    ctx.strokeStyle = c;
    ctx.lineWidth = 3;
    ctx.strokeRect(62, 580, 876, 660);
    const lab = isSplit ? "美元与黄金脱钩" : "金价暴跌";
    ctx.font = `900 19px ${SANS}`;
    const lw = ctx.measureText(lab).width + 28;
    ctx.fillStyle = c;
    ctx.fillRect(540 - lw / 2, 568, lw, 26);
    text(ctx, lab, 540, 588, 19, 900, SANS, "#0b0802", { align: "center" });
    ctx.restore();
  }
  // ending lines
  for (const l of ENDING.lines) {
    if (t < l.t0 || t > l.t1) continue;
    const a = smooth((t - l.t0) / 0.3) * (1 - smooth((t - l.t1 + 0.25) / 0.25));
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.fillStyle = "rgba(6,5,4,0.6)";
    ctx.fillRect(0, 590, W, 280);
    text(ctx, l.a, 540, 694, 56, 900, SANS, WHITE, { align: "center", maxW: 880 });
    ctx.globalAlpha *= smooth((t - l.t0 - 0.5) / 0.3);
    text(ctx, l.b, 540, 800, 72, 900, SANS, l.gold ? GOLD : WHITE, { align: "center", maxW: 880, glow: l.gold ? `rgba(${GOLD_RGB},0.5)` : undefined, blur: 24 });
    ctx.restore();
  }
  // credits
  if (credA > 0 && cardA < 1) {
    ctx.save();
    ctx.globalAlpha *= credA;
    text(ctx, "信息来源", 540, 640, 40, 900, SANS, GOLD, { align: "center" });
    ENDING.credits.forEach((c, i) => text(ctx, c, 540, 720 + i * 56, 30, 500, SANS, WHITE, { align: "center", alpha: 0.9, maxW: 860 }));
    ctx.restore();
  }
  // source line
  if (credA < 1) text(ctx, `数据：${ev?.src ?? SERIES_SRC(inCold ? LAST_Y : h)}`, SL, 1432, 18, 500, SANS, MUTED, { alpha: 0.7 * (1 - credA), maxW: 860 });
  ctx.restore();
  // end card
  if (cardA > 0) {
    ctx.save();
    ctx.globalAlpha = cardA;
    ctx.fillStyle = "#060504";
    ctx.fillRect(0, 0, W, H);
    if (MARK) ctx.drawImage(MARK, 540 - 70, 640, 140, 140);
    text(ctx, "世界的形状", 540, 880, 72, 900, SANS, WHITE, { align: "center", ls: 8 });
    text(ctx, "看见世界如何运行", 540, 950, 34, 500, SANS, GOLD, { align: "center", ls: 4 });
    text(ctx, "MakerJackie", 540, 1030, 26, 500, SANS, MUTED, { align: "center" });
    ctx.restore();
  }
  // flashes on the hits
  for (const e of PLACED) {
    const age = t - e.t0;
    if (age < 0 || age > 0.45) continue;
    const g = hitOf(e);
    if (g < 0.3) continue;
    const rgb = e.k === "crash" ? DN_RGB : e.k === "war" ? WAR_RGB : e.lab === "冻结" ? ICE_RGB : e.k === "split" ? GOLD_RGB : UP_RGB;
    ctx.fillStyle = `rgba(${rgb},${0.28 * Math.min(1, g) * Math.exp(-age / 0.11)})`;
    ctx.fillRect(0, 0, W, H);
  }
};

// =====================================================================================================================
export const Engine4: React.FC<{ audio: string }> = ({ audio }) => {
  const f = useCurrentFrame();
  const [handle] = useState(() => delayRender("gold4 fonts + mark", { timeoutInMilliseconds: 180000 }));
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
      <Audio src={staticFile(audio)} />
    </AbsoluteFill>
  );
};
