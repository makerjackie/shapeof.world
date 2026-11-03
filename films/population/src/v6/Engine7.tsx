// Film7 engine (v5 cut): the reference's layout. Header numbers + event log on top; the population line right under them,
// its head at 42% of the width; every event's card lands next to the head, line by line on the beats; the territory map is the floor below.
// Every event starts on a beat; every hit (shake, flash, lightning, sparks, map cracks) is keyed to an event start.
import React, { useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, Audio, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { BRUSH, SANS, SERIF, fontsReady } from "./fonts6";
import type { Pt, Spec } from "./spec6";
import { cursorFrom, Placed } from "./time6";
import { revealOf } from "./reveal7";

const W = 1080;
const SAFE_R = 940; // Douyin/TikTok right rail starts here
const H = 1920;
const FPS = 30;

// ---------------- palette
const GOLD = "#ffc94d";
const GOLD_RGB = "255,201,77";
const RED = "#ff3b2f";
const RED_RGB = "255,59,47";
const ASH = "#d8dde0";
const ASH_RGB = "216,221,224";
const WHITE = "#f6f7f8";
const MUTED = "#9aa0a6";
const SOFT = "#c4c9cd";
const SPLIT_COLS = ["#e39a4f", "#5fb7aa", "#c9605e", "#8e83d6", "#5b97d9", "#b9bd57", "#d47aa8", "#7fb67a", "#a58a63", "#6fb0c4", "#c99ddc", "#d9b25a"];
const FAR = "#4f5a66";

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const eo3 = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
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
const KIND_TONE: Record<string, "gold" | "red" | "ash" | "white"> = {
  stat: "white", peak: "gold", grow: "gold", war: "red", crash: "red", plague: "ash", famine: "ash", split: "red", unite: "gold", move: "white", policy: "gold", note: "white", quote: "white", turn: "white",
};
const KIND_LABEL: Record<string, string> = {
  stat: "统计", peak: "增长", grow: "增长", war: "战乱", crash: "崩塌", plague: "瘟疫", famine: "饥荒", split: "分裂", unite: "统一", move: "迁徙", policy: "政策", note: "", quote: "", turn: "转折",
};
const toneCol = (tone: string) => (tone === "gold" ? GOLD : tone === "red" ? RED : tone === "ash" ? ASH : WHITE);

// ---------------- text helpers (canvas only; never SVG text)
type TOpt = { align?: CanvasTextAlign; maxW?: number; ls?: number; alpha?: number; glow?: string; glowBlur?: number; base?: CanvasTextBaseline };
const text = (ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, weight: number | string, fam: string, color: string, o: TOpt = {}) => {
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
  ctx.textBaseline = o.base ?? "alphabetic";
  const a0 = ctx.globalAlpha;
  ctx.globalAlpha = a0 * (o.alpha ?? 1);
  if (o.glow) {
    ctx.shadowColor = o.glow;
    ctx.shadowBlur = o.glowBlur ?? 18;
  }
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = a0;
  const w = ctx.measureText(s).width;
  (ctx as any).letterSpacing = "0px";
  return w;
};
const measure = (ctx: CanvasRenderingContext2D, s: string, size: number, weight: number | string, fam: string) => {
  ctx.font = `${weight} ${size}px ${fam}`;
  (ctx as any).letterSpacing = "0px";
  return ctx.measureText(s).width;
};
// digits in fixed cells so numbers never jitter sideways while they count
const tabular = (ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string, o: { glow?: string; alpha?: number; fam?: string } = {}) => {
  ctx.font = `900 ${size}px ${o.fam ?? SANS}`;
  (ctx as any).letterSpacing = "0px";
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "center";
  const dw = ctx.measureText("0").width;
  const a0 = ctx.globalAlpha;
  ctx.globalAlpha = a0 * (o.alpha ?? 1);
  if (o.glow) {
    ctx.shadowColor = o.glow;
    ctx.shadowBlur = 22;
  }
  ctx.fillStyle = color;
  let cx = x;
  for (const ch of s) {
    const cw = /[0-9]/.test(ch) ? dw : ctx.measureText(ch).width;
    ctx.fillText(ch, cx + cw / 2, y);
    cx += cw;
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = a0;
  return cx - x;
};
const fmtPop = (v: number) => (v >= 10000 ? { n: (v / 10000).toFixed(2), u: "亿" } : { n: Math.round(v).toLocaleString("en-US"), u: "万" });

// ---------------- images
const IMGS: Record<string, HTMLImageElement> = {};
let IMG_P: Promise<unknown> | null = null;
const imagesReady = () =>
  (IMG_P ??= Promise.all(
    ["mark-disc.png"].map(
      (s) =>
        new Promise<void>((res, rej) => {
          const im = new Image();
          im.onload = () => im.decode().then(() => res(), () => res());
          im.onerror = () => rej(new Error("image " + s));
          im.src = staticFile(s);
          IMGS[s] = im;
        }),
    ),
  ));

// =====================================================================================================================
export type MapJ = { lon0: number; lat0: number; step: number; cols: number; rows: number; i: string; j: string; w: string; frames: Record<string, { p: { n: string; r: string; l: [number, number] }[]; id: string }> };
const b64 = (s: string) => {
  const bin = atob(s);
  const u = new Uint8Array(bin.length);
  for (let k = 0; k < bin.length; k++) u[k] = bin.charCodeAt(k);
  return u;
};

export const createFilm = (S: Spec, MJ: MapJ) => {
  const DUR = S.music.dur;
  const NF = Math.ceil(DUR * FPS) + 2;
  const EV = S.events;
  const [B0, B1] = S.body;
  const END = S.ending.t0;
  const SER = S.series;
  const FIRST = SER[0].y;
  const LAST = SER[SER.length - 1].y;
  const BEATS = S.music.beats;
  const LAST_REAL = 2025;

  // ---------- series
  const segOf = (y: number) => {
    if (y <= SER[0].y) return 0;
    let lo = 0;
    let hi = SER.length - 1;
    if (y >= SER[hi].y) return hi - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (SER[m].y <= y) lo = m;
      else hi = m;
    }
    return lo;
  };
  const val = (y: number) => {
    const i = segOf(y);
    const a = SER[i];
    const b = SER[i + 1];
    if (y <= a.y) return a.v;
    if (y >= b.y) return b.v;
    return a.v + ((b.v - a.v) * (y - a.y)) / (b.y - a.y);
  };
  const GAP = 25;
  const kindAt = (y: number) => {
    if (y <= 2025.01 && y >= 1949) return "stat" as const;
    const i = segOf(y);
    return y >= SER[i + 1].y - 1e-6 ? SER[i + 1].kind : SER[i + 1].kind === "un" || SER[i].kind === "un" ? "un" : SER[i + 1].kind;
  };
  const gapAt = (y: number) => {
    const i = segOf(y);
    return SER[i + 1].y - SER[i].y > GAP && y > SER[i].y + 0.5 && y < SER[i + 1].y - 0.5 ? SER[i + 1].y - SER[i].y : 0;
  };

  // ---------- event lookup
  const evAt = (t: number): Placed | null => {
    if (t < B0 || t >= END) return null;
    let lo = 0;
    let hi = EV.length - 1;
    while (lo < hi) {
      const m = (lo + hi + 1) >> 1;
      if (EV[m].t0 <= t) lo = m;
      else hi = m - 1;
    }
    return EV[lo];
  };

  // ---------- the cursor
  const coldCur = cursorFrom(S.cold.keys);
  // the head never parks: it eases out of an event and accelerates into the next beat (slam = short breath, hard lunge)
  const bodyCur = (t: number) => {
    if (t <= EV[0].t0) return EV[0].y;
    for (let i = 1; i < EV.length; i++) {
      const a = EV[i - 1];
      const b = EV[i];
      if (t > b.t0) continue;
      if (b.y === a.y) return a.y;
      const d = b.t0 - a.t0;
      const slam = b.go === "slam";
      const travel = slam ? Math.min(d, Math.max(d * 0.6, 0.7)) : d;
      const x = clamp((t - (b.t0 - travel)) / travel);
      return a.y + (b.y - a.y) * Math.pow(x, slam ? 2.6 : 1.45);
    }
    return EV[EV.length - 1].y;
  };
  const [RW0, RW1] = S.cold.rewind;
  const rewindCur = (t: number) => {
    const k = clamp((t - RW0) / (RW1 - RW0));
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    return LAST_REAL - (LAST_REAL - FIRST) * e;
  };
  const CUR = (t: number) => (t < RW0 ? coldCur(t) : t < RW1 ? rewindCur(t) : t < B0 ? FIRST : t >= END ? EV[EV.length - 1].y : bodyCur(t));

  // ---------- per-frame camera (cursor, x span, y range, layout), precomputed once
  const HX_BODY = 0.4 * W;
  const MAP_ON = (t: number) => {
    if (t >= END) return 0;
    if (t < B0) return clamp(t / 0.3);
    const y = CUR(t);
    return 1 - clamp((y - S.mapOff) / 6);
  };
  type Cam = { c: number; cx: number; ppy: number; hxw: number; lo: number; hi: number; top: number; bot: number; lg: number; sp: number; lgCold?: number };
  const CAM: Cam[] = [];
  {
    let span = 80;
    let lo = 0;
    let hi = 1;
    let mapK = 0;
    let lgK = 0;
    let prevC = CUR(0);
    for (let f = 0; f < NF; f++) {
      const t = f / FPS;
      const c = CUR(t);
      const e = evAt(t);
      // span target
      let target = span;
      if (t < RW1) target = 2150;
      else if (t < B0) {
        const k = ease(clamp((t - RW1) / (B0 - RW1)));
        target = Math.exp(Math.log(2150) * (1 - k) + Math.log(80) * k);
      } else {
        // the last span set by any event up to now
        for (let i = 0; i < EV.length && EV[i].t0 <= t; i++) if (EV[i].span) target = EV[i].span!;
      }
      span = t < B0 ? target : Math.exp(Math.log(span) + (Math.log(target) - Math.log(span)) * 0.09);
      const cold = t < RW1;
      const rw = t >= RW1 && t < B0 ? clamp((t - RW1) / (B0 - RW1)) : t >= B0 ? 1 : 0;
      const cx = cold ? 2025 : c;
      const hxw = cold ? 1012 : 1012 + (HX_BODY - 1012) * ease(rw);
      const ppy = cold ? 952 / 2025 : (W * 0.5) / span;
      // visible range
      const yL = cx - hxw / ppy;
      let mn = Infinity;
      let mx = -Infinity;
      const a = Math.max(FIRST, yL);
      const b = Math.min(cold ? 2025 : c, LAST);
      for (let q = 0; q <= 48; q++) {
        const v = val(a + ((b - a) * q) / 48);
        mn = Math.min(mn, v);
        mx = Math.max(mx, v);
      }
      for (const p of SER) if (p.y >= a && p.y <= b) {
        mn = Math.min(mn, p.v);
        mx = Math.max(mx, p.v);
      }
      if (cold) {
        mn = 0;
        mx = 150000;
      }
      const r = Math.max(mx - mn, mx * 0.18);
      const tlo = cold ? 0 : Math.max(0, mn - 0.3 * r);
      const thi = cold ? 160000 : mx + 0.14 * r;
      if (f === 0 || t < B0 + 0.05) {
        lo = tlo;
        hi = thi;
      } else {
        // rise fast, fall slower: a crash plunges first, then the scale catches up
        lo += (tlo - lo) * (tlo < lo ? 0.1 : 0.16);
        hi += (thi - hi) * (thi > hi ? 0.3 : 0.07);
      }
      mapK += (MAP_ON(t) - mapK) * 0.1;
      lgK = t < RW1 ? 1 : t < B0 ? 1 - ease(clamp((t - RW1) / (B0 - RW1))) : lgK + ((t >= END ? 1 : 0) - lgK) * 0.09;
      const top = 610;
      const sp = Math.abs(c - prevC) * FPS * ppy;
      prevC = c;
      CAM.push({ c, cx, ppy, hxw, lo, hi, top, bot: 1010 + 470 * (1 - mapK), lg: lgK, sp, lgCold: t < B0 ? 1 : 0 });
    }
  }
  const camAt = (t: number) => CAM[clamp(Math.round(t * FPS), 0, CAM.length - 1)];
  // the share of the recent peak still alive: that share of the map's dots stays lit
  const RATIO = new Float32Array(NF);
  for (let f = 0; f < NF; f++) {
    const c = CAM[f].c;
    let mx = val(c);
    for (const p of SER) if (p.y >= c - 250 && p.y <= c) mx = Math.max(mx, p.v);
    for (let q = 0; q <= 20; q++) mx = Math.max(mx, val(c - (250 * q) / 20));
    RATIO[f] = clamp(val(c) / mx);
  }
  const L0 = S.id === "world" ? 4.25 : 3;
  const L1 = Math.log10(S.id === "world" ? 1200000 : 160000);
  const X = (k: Cam, y: number) => {
    const xb = k.hxw - (k.cx - y) * k.ppy;
    if (k.lg <= 0) return xb;
    const xe = 70 + ((y - FIRST) / (LAST - FIRST)) * (SAFE_R - 70);
    return xb + (xe - xb) * ease(k.lg);
  };
  const Yv = (k: Cam, v: number) => {
    const yl = k.bot - ((v - k.lo) / (k.hi - k.lo)) * (k.bot - k.top);
    if (k.lg <= 0) return yl;
    const top = k.lgCold ? 660 : 640;
    const bot = k.lgCold ? 1000 : 1380;
    const yg = bot - ((Math.log10(Math.max(v, 1000)) - L0) / (L1 - L0)) * (bot - top);
    return yl + (yg - yl) * ease(k.lg);
  };
  const headAt = (t: number) => {
    const k = camAt(t);
    return { x: X(k, k.c), y: Yv(k, val(k.c)) };
  };

  // ---------- hits (one per event + the cold-open crashes)
  type Hit = { t: number; kind: string; big: boolean; tone: string; e?: Placed };
  const HITS: Hit[] = [
    ...S.cold.crashes.map((c) => ({ t: c.at, kind: c.tone === "gold" ? "mile" : "crash", big: c.y === 1880, tone: c.tone ?? "red" })),
    ...EV.map((e) => ({ t: e.t0, kind: e.k, big: !!e.big, tone: KIND_TONE[e.k], e })),
  ];
  const shakeAt = (t: number) =>
    HITS.reduce((m, h) => {
      if (t < h.t - 0.05 || t > h.t + 1.5) return m;
      const k = h.kind === "mile" ? 0.3 : h.kind === "crash" ? (h.big ? 1 : 0.6) : h.kind === "war" ? (h.big ? 0.8 : 0.4) : h.kind === "split" ? 0.5 : h.kind === "peak" || h.kind === "unite" ? (h.big ? 0.45 : 0.25) : h.kind === "turn" ? 0.2 : 0.12;
      return Math.max(m, k * env(t, h.t, 0.02, h.big ? 0.32 : 0.2));
    }, 0);

  // ---------- map
  const NC = MJ.cols;
  const CI = new Uint16Array(b64(MJ.i).buffer);
  const CJ = new Uint16Array(b64(MJ.j).buffer);
  const CW = b64(MJ.w);
  const N = CI.length;
  const LON = new Float32Array(N);
  const LAT = new Float32Array(N);
  const GRID = new Int32Array(MJ.cols * MJ.rows).fill(-1);
  for (let q = 0; q < N; q++) {
    LON[q] = MJ.lon0 + CI[q] * MJ.step;
    LAT[q] = MJ.lat0 + CJ[q] * MJ.step;
    GRID[CJ[q] * NC + CI[q]] = q;
  }
  const HASH = new Float32Array(N);
  for (let q = 0; q < N; q++) {
    let h = (q + 0x9e3779b9) | 0;
    h ^= h >>> 16;
    h = Math.imul(h, 0x7feb352d);
    h ^= h >>> 15;
    h = Math.imul(h, 0x846ca68b);
    h ^= h >>> 16;
    HASH[q] = (h >>> 0) / 4294967296;
  }
  // regional die-offs (an event kills a share of one region's dots; they come back slowly)
  const KILLS = EV.filter((e) => e.kill).map((e) => ({ t0: e.t0, t1: e.t0 + Math.max(6, e.t1 - e.t0 + 4), r: e.kill! }));
  const FRAMES: Record<string, { parts: { n: string; r: string; l: [number, number]; col: string }[]; id: Uint8Array }> = {};
  for (const [key, fr] of Object.entries(MJ.frames)) {
    let si = 0;
    FRAMES[key] = {
      parts: fr.p.map((p) => ({ ...p, col: p.r === "main" ? GOLD : p.r === "war" ? RED : p.r === "far" ? FAR : SPLIT_COLS[si++ % SPLIT_COLS.length] })),
      id: b64(fr.id),
    };
  }
  const KX0 = (W * 0.94) / (MJ.cols * MJ.step * Math.cos((S.map.lat * Math.PI) / 180));
  const KX = KX0;
  // map keyframe timeline from the events
  type MapCue = { t: number; key: string; from: string; e: Placed | null; split?: boolean; cold?: boolean };
  const COLDCUES: MapCue[] = [];
  {
    let cur = "none";
    const add = (t: number, key: string, split = false) => {
      if (!FRAMES[key] || key === cur) return;
      COLDCUES.push({ t, key, from: cur, e: null, split, cold: true });
      cur = key;
    };
    for (const [t, key, sp] of S.cold.maps ?? []) if (t < RW0) add(t, key, !!sp);
    // the rewind runs the territories backwards
    const YS = S.cold.mapYears ?? [];
    let last = -1;
    for (let f = Math.floor(RW0 * FPS); f <= Math.ceil(RW1 * FPS); f++) {
      const t = f / FPS;
      const y = CUR(t);
      let key = YS.length ? YS[0][1] : "none";
      for (const [y0, kk] of YS) if (y >= y0) key = kk;
      if (key !== cur && t - last > 0.1) {
        add(t, key);
        last = t;
      }
    }
    if (YS.length) add(RW1, YS[0][1]);
  }
  const MAPCUES: MapCue[] = [];
  {
    let cur = COLDCUES.length ? COLDCUES[COLDCUES.length - 1].key : "none";
    for (const e of EV)
      if (e.map && FRAMES[e.map] && e.map !== cur) {
        MAPCUES.push({ t: e.t0, key: e.map, from: cur, e });
        cur = e.map;
      }
  }
  const COLD_CUE: MapCue = { t: -100, key: "none", from: "none", e: null };
  const mapCueAt = (t: number) => {
    let c: MapCue | null = null;
    for (const m of COLDCUES) if (m.t <= t) c = m;
    if (t >= B0) for (const m of MAPCUES) if (m.t <= t) c = m;
    return c ?? COLD_CUE;
  };
  // map camera: whole map by default, events can focus
  const FIT: Record<string, { lon: number; lat: number; z: number }> = {};
  for (const [key, fr] of Object.entries(FRAMES)) {
    const lo: number[] = [];
    const la: number[] = [];
    for (let q = 0; q < N; q++) {
      const id = fr.id[q];
      if (id === 255 || !fr.parts[id] || fr.parts[id].r === "far") continue;
      lo.push(LON[q]);
      la.push(LAT[q]);
    }
    if (!lo.length) continue;
    lo.sort((a, b) => a - b);
    la.sort((a, b) => a - b);
    const pc = (a: number[], p: number) => a[Math.floor((a.length - 1) * p)];
    const l0 = pc(lo, 0.01);
    const l1 = pc(lo, 0.99);
    const a0 = pc(la, 0.01);
    const a1 = pc(la, 0.99);
    const cl = Math.cos((S.map.lat * Math.PI) / 180);
    const wpx = (l1 - l0) * cl * KX0;
    const hpx = (a1 - a0) * KX0 * Math.cos(0.62);
    FIT[key] = { lon: (l0 + l1) / 2, lat: (a0 + a1) / 2, z: clamp(Math.min(980 / wpx, 600 / hpx), 0.85, S.id === "world" ? 4 : 2.3) };
  }
  const MAPCAM: { lon: number; lat: number; z: number }[] = [];
  {
    let lon = S.map.lon;
    let lat = S.map.lat;
    let z = S.map.zoom;
    for (let f = 0; f < NF; f++) {
      const t = f / FPS;
      const e = evAt(t);
      const cue = mapCueAt(t);
      const fit = (cue && FIT[cue.key]) || { lon: S.map.lon, lat: S.map.lat, z: S.map.zoom };
      const follow = S.id === "world" && e?.at ? { lon: e.at[0] * 0.75 + fit.lon * 0.25, lat: e.at[1] * 0.75 + fit.lat * 0.25, z: Math.max(fit.z, 2.7) } : null;
      const tg = t < RW1 ? S.cold.cam ?? { lon: S.map.lon - 8, lat: S.map.lat, z: S.map.zoom * 0.66 } : e?.focus ? { lon: e.focus[0], lat: e.focus[1], z: e.focus[2] } : follow ?? (S.id === "world" ? { ...fit, z: Math.max(fit.z, 2.0) } : fit);
      if (f === 0) {
        lon = tg.lon;
        lat = tg.lat;
        z = tg.z;
      }
      const kk = t < B0 ? 0.12 : S.id === "world" ? 0.075 : 0.06;
      lon += (tg.lon - lon) * kk;
      lat += (tg.lat - lat) * kk;
      z += (tg.z - z) * kk;
      MAPCAM.push({ lon, lat, z });
    }
  }
  let MAP_CY = 1440;
  let CLIP0 = 1060;
  let CLIP1 = 1900;
  const TILT = 0.62; // radians
  const DIST = 2200;

  const proj = (mc: { lon: number; lat: number; z: number }, lon: number, lat: number) => {
    const u = (lon - mc.lon) * Math.cos((S.map.lat * Math.PI) / 180) * KX * mc.z;
    const v = (lat - mc.lat) * KX * mc.z;
    const depth = v * Math.sin(TILT);
    const s = DIST / (DIST + depth);
    return { x: W / 2 + u * s, y: MAP_CY - v * Math.cos(TILT) * s, s };
  };

  // event effects on the map
  type Fx = { t0: number; t1: number; kind: string; at: [number, number]; to?: [number, number]; r: number };
  const R0 = S.id === "world" ? 9 : 3.2;
  const FXS: Fx[] = EV.filter((e) => e.at).map((e) => ({
    t0: e.t0,
    t1: Math.max(e.t1, e.t0 + 1.2),
    kind: e.k,
    at: e.at!,
    to: e.to,
    r: R0 * (e.big ? 1.5 : 1) * (e.k === "plague" || e.k === "famine" ? 1.6 : 1),
  }));
  // borders of every keyframe (cell pairs with different owners)
  const BORDERS: Record<string, Int32Array> = {};
  for (const [key, fr] of Object.entries(FRAMES)) {
    const out: number[] = [];
    for (let q = 0; q < N; q++) {
      const a = fr.id[q];
      if (a === 255) continue;
      const r = CI[q] + 1 < NC ? GRID[CJ[q] * NC + CI[q] + 1] : -1;
      const u = CJ[q] + 1 < MJ.rows ? GRID[(CJ[q] + 1) * NC + CI[q]] : -1;
      if (r >= 0 && fr.id[r] !== a && fr.id[r] !== 255) out.push(q, r);
      if (u >= 0 && fr.id[u] !== a && fr.id[u] !== 255) out.push(q, u);
    }
    BORDERS[key] = Int32Array.from(out);
  }

  const drawMap = (ctx: CanvasRenderingContext2D, t: number) => {
    const k = camAt(t);
    const mk = clamp(MAP_ON(t) * 1.0);
    if (mk <= 0.01) return;
    {
      const g = t < RW1 ? 0 : t < B0 ? ease(clamp((t - RW1) / (B0 - RW1))) : 1;
      MAP_CY = 1250 + 190 * g;
      CLIP0 = 1060;
      CLIP1 = 1480 + 420 * g;
    }
    const cue = mapCueAt(t);
    if (!cue) return;
    const fr = FRAMES[cue.key];
    const prev = FRAMES[cue.from];
    const dt = t - cue.t;
    const mc = MAPCAM[clamp(Math.round(t * FPS), 0, MAPCAM.length - 1)];
    const origin = cue.e?.at ?? (fr.parts[0]?.l ?? [S.map.lon, S.map.lat]);
    const isSplit = cue.e ? cue.e.k === "split" || cue.e.k === "war" : !!cue.split;
    const isUnite = cue.e?.k === "unite" || cue.e?.k === "peak" || cue.e?.k === "crash";
    const sweep = cue.cold ? 0.14 : 0.5; // seconds for the change to cross the map
    const cellPx = KX * MJ.step * mc.z;
    // jolt: split pieces fly apart and settle
    const jolt = isSplit ? 16 * env(t, cue.t, 0.02, 0.35) : 0;
    const center = proj(mc, S.map.lon, S.map.lat);
    const partOff = fr.parts.map((p) => {
      const P = proj(mc, p.l[0], p.l[1]);
      const dx = P.x - center.x;
      const dy = P.y - center.y;
      const d = Math.hypot(dx, dy) || 1;
      return [(dx / d) * jolt, (dy / d) * jolt];
    });
    // active fx
    const fxs = FXS.filter((f) => t >= f.t0 - 0.05 && t < f.t1 + 3);
    const fi = clamp(Math.round(t * FPS), 0, NF - 1);
    const ratio = RATIO[fi];
    const ratioWas = RATIO[Math.max(0, fi - 14)];
    ctx.save();
    for (let q = 0; q < N; q++) {
      const P = proj(mc, LON[q], LAT[q]);
      if (P.x < -10 || P.x > W + 10 || P.y < CLIP0 || P.y > CLIP1) continue;
      const edge = clamp((P.y - CLIP0) / 70) * clamp((CLIP1 - P.y) / 120);
      const dist = Math.hypot((LON[q] - origin[0]) * Math.cos((LAT[q] * Math.PI) / 180), LAT[q] - origin[1]);
      const tq = cue.t + Math.min(sweep, (dist / 40) * sweep * (S.id === "world" ? 0.25 : 1));
      const useNew = !prev || t >= tq;
      const id = useNew ? fr.id[q] : prev.id[q];
      const parts = useNew ? fr.parts : prev.parts;
      const w = CW[q] / 255;
      const neutral = cue.key === "none";
      let col = neutral ? "#6b747e" : "#3a4048";
      let a = neutral ? 0.12 + 0.6 * w * w : 0.1 + 0.25 * w;
      let ox = 0;
      let oy = 0;
      if (id !== 255 && parts[id]) {
        col = parts[id].col;
        a = (parts[id].r === "far" ? 0.3 : 0.34) + 0.46 * w;
        if (useNew) {
          ox = partOff[id][0];
          oy = partOff[id][1];
        }
      }
      // the people: dots above the surviving share go dark (they die on the beat, a quick ember first)
      const hq = HASH[q];
      let dead = false;
      let rat = ratio;
      let ratW = ratioWas;
      for (const kk of KILLS) {
        if (t < kk.t0 || t > kk.t1 + 2) continue;
        const [lo0, la0, lo1, la1, share] = kk.r;
        if (LON[q] < lo0 || LON[q] > lo1 || LAT[q] < la0 || LAT[q] > la1) continue;
        const life = t < kk.t1 ? 1 : 1 - (t - kk.t1) / 2;
        const now = 1 - share * clamp((t - kk.t0) / 0.5) * life;
        const before = 1 - share * clamp((t - 0.45 - kk.t0) / 0.5) * life;
        rat = Math.min(rat, now);
        ratW = Math.min(ratW, before);
      }
      if (id !== 255 || KILLS.length) void 0;
      if (hq > rat && (id !== 255 || rat < ratio || cue.key === "none")) {
        dead = true;
        const was = hq <= ratW;
        if (was) {
          // dying now: flash
          const k2 = clamp((hq - rat) / Math.max(1e-3, ratW - rat));
          col = k2 < 0.5 ? "#ff6a4d" : "#7a3a30";
          a = 0.9 * (1 - k2 * 0.6);
        } else {
          col = "#2a2f36";
          a = 0.5;
        }
      } else if (hq > ratW && rat > ratW + 1e-4 && (id !== 255 || cue.key === "none")) {
        // just born: a gold spark, then it settles
        const k2 = clamp((hq - ratW) / Math.max(1e-3, rat - ratW));
        col = k2 > 0.5 ? "#fff3c4" : GOLD;
        a = 1;
      }
      void dead;
      // the switch flashes as it passes
      const flw = cue.cold ? 0.07 : 0.18;
      const fl = (prev && cue.from !== "none" && Math.abs(t - tq) < flw && (!prev || prev.id[q] !== fr.id[q]) ? 1 - Math.abs(t - tq) / flw : 0) * (cue.cold ? 0.45 : 1);
      // fx
      let fxCol: string | null = null;
      let fxA = 0;
      let dim = 1;
      for (const f of fxs) {
        const d = Math.hypot((LON[q] - f.at[0]) * Math.cos((LAT[q] * Math.PI) / 180), LAT[q] - f.at[1]);
        const grow = clamp((t - f.t0) / 0.45);
        const rr = f.r * (0.35 + 0.65 * eo3(grow));
        if (d > rr) continue;
        const life = t < f.t1 ? 1 : 1 - (t - f.t1) / 3;
        if (f.kind === "war" || f.kind === "crash" || f.kind === "split") {
          const flick = 0.75 + 0.25 * Math.sin(t * 31 + q * 1.7);
          fxCol = RED;
          fxA = Math.max(fxA, (1 - d / rr) * 0.9 * flick * clamp(life));
          dim = Math.min(dim, t > f.t1 ? 0.55 + 0.45 * (1 - clamp(life)) : 1);
        } else if (f.kind === "plague" || f.kind === "famine") {
          fxCol = "#8d9196";
          fxA = Math.max(fxA, (1 - d / rr) * 0.85 * clamp(life));
          dim = Math.min(dim, 0.45 + 0.55 * (1 - clamp(life)));
        } else if (f.kind === "peak" || f.kind === "grow" || f.kind === "unite" || f.kind === "policy") {
          fxCol = GOLD;
          fxA = Math.max(fxA, (1 - d / rr) * 0.6 * clamp(life));
        }
      }
      const sz = Math.max(1.4, cellPx * P.s * (0.56 + 0.18 * w));
      ctx.globalAlpha = clamp(a * dim * mk * edge);
      ctx.fillStyle = col;
      const x = P.x + ox;
      const y = P.y + oy;
      ctx.fillRect(x - sz / 2, y - sz * 0.42, sz, sz * 0.84);
      if (fxCol && fxA > 0.02) {
        ctx.globalAlpha = clamp(fxA * mk);
        ctx.fillStyle = fxCol;
        ctx.fillRect(x - sz / 2, y - sz * 0.42, sz, sz * 0.84);
      }
      if (fl > 0) {
        ctx.globalAlpha = clamp(fl * 0.8 * mk);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x - sz / 2, y - sz * 0.42, sz, sz * 0.84);
      }
    }
    // borders (cracks): bright when they appear, then thin
    const bd = BORDERS[cue.key];
    if (bd && bd.length) {
      const crack = isSplit ? env(t, cue.t + 0.15, 0.05, 0.5) : 0;
      ctx.globalAlpha = clamp((0.35 + 0.65 * crack) * mk);
      ctx.strokeStyle = crack > 0.05 ? `rgba(255,${Math.round(230 - 150 * crack)},${Math.round(220 - 180 * crack)},1)` : "rgba(255,255,255,0.55)";
      ctx.lineWidth = 1.2 + 2.2 * crack;
      ctx.beginPath();
      for (let q = 0; q < bd.length; q += 2) {
        const a = bd[q];
        const b = bd[q + 1];
        if (dt < sweep && prev) continue;
        const A = proj(mc, LON[a], LAT[a]);
        const B = proj(mc, LON[b], LAT[b]);
        const ida = fr.id[a];
        const idb = fr.id[b];
        const oa = partOff[ida] ?? [0, 0];
        const ob = partOff[idb] ?? [0, 0];
        const mx = (A.x + oa[0] + B.x + ob[0]) / 2;
        const my = (A.y + oa[1] + B.y + ob[1]) / 2;
        const dx = (B.y - A.y) * 0.5;
        const dy = -(B.x - A.x) * 0.5;
        ctx.moveTo(mx - dx, my - dy);
        ctx.lineTo(mx + dx, my + dy);
      }
      ctx.stroke();
    }
    // unify: a gold wave across the new extent
    if (isUnite && dt < 1.2 && prev) {
      const R = (dt / 0.9) * 900;
      const o = proj(mc, origin[0], origin[1]);
      ctx.globalAlpha = clamp((1 - dt / 1.2) * 0.8 * mk);
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(o.x, o.y, R, R * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // labels
    const many = fr.parts.length > 6;
    fr.parts.forEach((p, i) => {
      const P = proj(mc, p.l[0], p.l[1]);
      const ap = clamp((t - cue.t - (isSplit ? 0.12 + i * 0.06 : 0.05)) / 0.12);
      if (ap <= 0) return;
      const pop = 1 + 0.35 * env(t, cue.t + (isSplit ? 0.12 + i * 0.06 : 0.05), 0.01, 0.12);
      const size = (p.r === "far" ? 22 : many ? 24 : 36) * pop * (0.85 + 0.15 * mc.z);
      const o = partOff[i];
      ctx.globalAlpha = clamp(ap * mk * (p.r === "far" ? 0.7 : 1));
      text(ctx, p.n, P.x + o[0], P.y + o[1], size, 900, SERIF, p.r === "far" ? "#aab3bd" : WHITE, { align: "center", glow: "rgba(0,0,0,0.9)", glowBlur: 10 });
    });
    // migration streams
    for (const f of fxs) {
      if (f.kind !== "move" || !f.to || t > f.t1 + 0.4) continue;
      const A = proj(mc, f.at[0], f.at[1]);
      const B = proj(mc, f.to[0], f.to[1]);
      const mx = (A.x + B.x) / 2;
      const my = Math.min(A.y, B.y) - 60;
      const r = rng(Math.round(f.t0 * 100));
      const life = t < f.t1 ? clamp((t - f.t0) / 0.2) : 1 - (t - f.t1) / 0.4;
      for (let p = 0; p < 70; p++) {
        const ph = (r() + (t - f.t0) * (0.7 + 0.5 * r())) % 1;
        const jx = (r() - 0.5) * 36;
        const jy = (r() - 0.5) * 22;
        const u = ph;
        const x = (1 - u) * (1 - u) * A.x + 2 * (1 - u) * u * mx + u * u * B.x + jx * Math.sin(u * Math.PI);
        const y = (1 - u) * (1 - u) * A.y + 2 * (1 - u) * u * my + u * u * B.y + jy * Math.sin(u * Math.PI);
        ctx.globalAlpha = clamp(life * mk * (0.4 + 0.6 * Math.sin(u * Math.PI)));
        ctx.fillStyle = "#fff4d6";
        ctx.fillRect(x - 2, y - 2, 4, 4);
      }
      ctx.globalAlpha = clamp(life * mk * 0.9);
      ctx.strokeStyle = "rgba(255,244,214,0.9)";
      ctx.lineWidth = 3;
      const ang = Math.atan2(B.y - my, B.x - mx);
      ctx.beginPath();
      ctx.moveTo(B.x - 22 * Math.cos(ang - 0.45), B.y - 22 * Math.sin(ang - 0.45));
      ctx.lineTo(B.x, B.y);
      ctx.lineTo(B.x - 22 * Math.cos(ang + 0.45), B.y - 22 * Math.sin(ang + 0.45));
      ctx.stroke();
    }
    // fx rings at the spot
    for (const f of fxs) {
      const d = t - f.t0;
      if (d < 0 || d > 0.9) continue;
      const P = proj(mc, f.at[0], f.at[1]);
      const col = f.kind === "plague" || f.kind === "famine" ? ASH_RGB : f.kind === "war" || f.kind === "crash" || f.kind === "split" ? RED_RGB : GOLD_RGB;
      ctx.globalAlpha = clamp((1 - d / 0.9) * mk);
      ctx.strokeStyle = `rgba(${col},1)`;
      ctx.lineWidth = 5 * (1 - d / 0.9) + 1;
      const R = 20 + eo3(d / 0.9) * 170;
      ctx.beginPath();
      ctx.ellipse(P.x, P.y, R, R * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = clamp((1 - d / 0.5) * mk);
      ctx.fillStyle = `rgba(${col},1)`;
      ctx.beginPath();
      ctx.arc(P.x, P.y, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    // map tag (schematic)
    ctx.globalAlpha = 0.55 * mk;
    text(ctx, "疆域示意", W - 52, 1090, 20, 500, SERIF, MUTED, { align: "right" });
    ctx.restore();
  };

  // ---------- chart
  const segTone = (a: Pt, b: Pt) => {
    if (b.v >= a.v) return GOLD;
    // the fall into a crash: red when war made it, ash otherwise
    const e = EV.find((x) => x.k === "crash" && Math.abs(x.y - b.y) < 1.01);
    if (e) {
      const prevWar = EV.slice(0, e.i).reverse().find((x) => x.k === "war" || x.k === "plague" || x.k === "famine");
      if (b.y >= 1955) return ASH;
      return prevWar && prevWar.k !== "war" ? ASH : RED;
    }
    return ASH;
  };
  const drawChart = (ctx: CanvasRenderingContext2D, t: number, alpha: number) => {
    if (alpha <= 0.01) return;
    const k = camAt(t);
    const c = k.c;
    const yL = k.lg > 0.01 ? FIRST : k.cx - k.hxw / k.ppy - 2;
    const yR = t >= END ? LAST : c;
    ctx.save();
    ctx.globalAlpha = alpha;
    // grid lines with labels
    const range = k.hi - k.lo;
    if (k.lg < 0.5) {
      const raw = range / 4;
      const p10 = Math.pow(10, Math.floor(Math.log10(raw)));
      const step = [1, 2, 2.5, 5, 10].map((m) => m * p10).find((s) => s >= raw) ?? raw;
      ctx.lineWidth = 1;
      for (let v = Math.ceil(k.lo / step) * step; v < k.hi; v += step) {
        const y = Yv(k, v);
        if (y < k.top - 10 || y > k.bot + 4) continue;
        ctx.strokeStyle = "rgba(255,255,255,0.07)";
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(W - 40, y);
        ctx.stroke();
        const f = fmtPop(v);
        text(ctx, `${f.n}${f.u}`, 44, y - 6, 19, 500, SANS, "rgba(255,255,255,0.3)");
      }
    }
    // bars at every count (the texture)
    const pts = SER.filter((p) => p.y >= yL - 30 && p.y <= yR + 1e-6);
    const barA = 1 - clamp(k.lg * 3);
    const base = Yv(k, k.lo);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const x = X(k, p.y);
      if (x < -20 || x > W + 20) continue;
      const pr = SER[SER.indexOf(p) - 1];
      const up = !pr || p.v >= pr.v;
      const bw = clamp(k.ppy * 0.62, 2, 14);
      const y = Yv(k, p.v);
      const g = ctx.createLinearGradient(0, y, 0, base);
      const rgb = up ? GOLD_RGB : pr && segTone(pr, p) === RED ? RED_RGB : ASH_RGB;
      if (barA <= 0.01) continue;
      g.addColorStop(0, `rgba(${rgb},${0.42 * barA})`);
      g.addColorStop(1, `rgba(${rgb},0.02)`);
      ctx.fillStyle = g;
      ctx.fillRect(x - bw / 2, y, bw, Math.max(0, base - y));
    }
    // the line: straight; solid between close counts, dashed across long gaps
    const i0 = Math.max(0, segOf(Math.max(FIRST, yL)) - 1);
    for (let i = i0; i < SER.length - 1; i++) {
      const a = SER[i];
      const b = SER[i + 1];
      if (a.y > yR) break;
      const yb = Math.min(b.y, yR);
      const vb = b.y <= yR ? b.v : val(yR);
      const x1 = X(k, a.y);
      const x2 = X(k, yb);
      if (x2 < -30) continue;
      const y1 = Yv(k, a.v);
      const y2 = Yv(k, vb);
      const col = segTone(a, b);
      const gap = b.y - a.y > GAP;
      ctx.setLineDash(gap ? [14, 10] : b.kind === "un" ? [6, 8] : []);
      ctx.lineCap = "round";
      ctx.strokeStyle = col;
      ctx.lineWidth = gap ? 4 : 5.5;
      ctx.shadowColor = col;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.setLineDash([]);
    // counts as dots
    for (const p of pts) {
      const pi = SER.indexOf(p);
      if (pi > 0 && p.y - SER[pi - 1].y < 4) continue;
      const x = X(k, p.y);
      const y = Yv(k, p.v);
      if (x < -10 || x > W + 10) continue;
      ctx.fillStyle = p.kind === "est" ? "#0b0d10" : WHITE;
      ctx.strokeStyle = WHITE;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  };

  // the head: glow, beat pulse, the level guide to the right
  const beatPulse = (t: number) => {
    let m = 0;
    for (const b of BEATS) {
      if (b.t > t) break;
      m = Math.max(m, env(t, b.t, 0.01, 0.12) * (b.down ? 1 : 0.5));
    }
    return m;
  };
  const drawHead = (ctx: CanvasRenderingContext2D, t: number, alpha: number) => {
    if (alpha <= 0.01 || t >= END) return;
    const k = camAt(t);
    const h = headAt(t);
    const v = val(k.c);
    const e = evAt(t);
    const tone = e ? KIND_TONE[e.k] : "gold";
    const col = tone === "red" ? RED : tone === "ash" ? ASH : GOLD;
    const pulse = beatPulse(t);
    ctx.save();
    ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, 70 + 40 * pulse);
    g.addColorStop(0, col);
    g.addColorStop(0.25, col + "88");
    g.addColorStop(1, col + "00");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(h.x, h.y, 70 + 40 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(h.x, h.y, 9 + 3 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.globalAlpha = alpha * (0.3 + 0.7 * pulse);
    ctx.beginPath();
    ctx.arc(h.x, h.y, 18 + 26 * (1 - pulse), 0, Math.PI * 2);
    ctx.stroke();
    void v;
    ctx.restore();
  };

  // speed streaks behind the head
  const drawStreaks = (ctx: CanvasRenderingContext2D, t: number) => {
    const k = camAt(t);
    const sp = k.sp;
    if (sp < 300 || t >= END) return;
    const h = headAt(t);
    const r = rng(Math.round(t * FPS) * 7 + 3);
    const back = t >= RW0 && t < RW1;
    const n = Math.min(70, Math.round(sp / (back ? 14 : 40)));
    const a = clamp(sp / 2200, 0, 0.7);
    ctx.save();
    for (let i = 0; i < n; i++) {
      const y = clamp(h.y + (r() - 0.5) * 560, 560, k.bot);
      const len = 120 + r() * Math.min(900, sp * 0.5);
      if (back) {
        const x = h.x + r() * 200;
        const g = ctx.createLinearGradient(x, 0, x + len, 0);
        g.addColorStop(0, `rgba(190,225,255,${Math.max(a, 0.5) * (0.3 + 0.7 * r())})`);
        g.addColorStop(1, "rgba(190,225,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x, y, len, 1.5 + r() * 2.5);
        continue;
      }
      const x = h.x - r() * 300;
      const g = ctx.createLinearGradient(x - len, 0, x, 0);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(1, `rgba(255,240,210,${a * (0.3 + 0.7 * r())})`);
      ctx.fillStyle = g;
      ctx.fillRect(x - len, y, len, 1.5 + r() * 2);
    }
    ctx.restore();
  };

  // ---------- hits on the chart: lightning, shockwave, sparks
  const bolt = (ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, seed: number, w: number) => {
    const r = rng(seed);
    const pts: [number, number][] = [[x0, y0]];
    const n = 14;
    for (let i = 1; i < n; i++) {
      const u = i / n;
      pts.push([x0 + (x1 - x0) * u + (r() - 0.5) * 90 * (1 - u * 0.6), y0 + (y1 - y0) * u]);
    }
    pts.push([x1, y1]);
    ctx.lineWidth = w;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    // branches
    for (let b = 0; b < 3; b++) {
      const s = pts[3 + Math.floor(r() * 8)];
      ctx.lineWidth = w * 0.45;
      ctx.beginPath();
      ctx.moveTo(s[0], s[1]);
      let x = s[0];
      let y = s[1];
      for (let i = 0; i < 4; i++) {
        x += (r() - 0.5) * 80 + (r() < 0.5 ? -30 : 30);
        y += 30 + r() * 50;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  };
  const drawHits = (ctx: CanvasRenderingContext2D, t: number) => {
    for (const hit of HITS) {
      const d = t - hit.t;
      if (d < -0.02 || d > 1.4) continue;
      const h = headAt(hit.t + 0.01);
      const hc = headAt(t);
      if (hit.kind === "crash" || (hit.kind === "war" && hit.big)) {
        // lightning on the hit frame and the next few
        if (d < 0.2 && (hit.big || hit.kind === "crash")) {
          const a = d < 0.07 ? 1 : 1 - (d - 0.07) / 0.13;
          ctx.save();
          ctx.globalAlpha = clamp(a);
          ctx.strokeStyle = "#e9f2ff";
          ctx.shadowColor = hit.tone === "red" || hit.kind === "war" ? "#ff5a4a" : "#9ec8ff";
          ctx.shadowBlur = 30;
          const sx = hc.x + (rng(Math.round(hit.t * 100))() - 0.5) * 260;
          bolt(ctx, sx, 0, hc.x, hc.y, Math.round(hit.t * 100) + Math.floor(d * 30), 5);
          ctx.shadowBlur = 0;
          ctx.restore();
        }
        // shockwave
        if (d < 0.8) {
          ctx.save();
          ctx.globalAlpha = clamp(1 - d / 0.8) * 0.8;
          ctx.strokeStyle = hit.kind === "crash" ? RED : "#ffb4a8";
          ctx.lineWidth = 6 * (1 - d / 0.8) + 1;
          ctx.beginPath();
          ctx.arc(hc.x, hc.y, 20 + eo3(d / 0.8) * 260, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
      const grow = hit.kind === "peak" || hit.kind === "unite" || hit.kind === "grow";
      if (grow && hit.big && d < 0.9) {
        // gold shockwave
        ctx.save();
        ctx.globalAlpha = clamp(1 - d / 0.9) * 0.85;
        ctx.strokeStyle = GOLD;
        ctx.shadowColor = GOLD;
        ctx.shadowBlur = 20;
        ctx.lineWidth = 7 * (1 - d / 0.9) + 1;
        ctx.beginPath();
        ctx.arc(hc.x, hc.y, 24 + eo3(d / 0.9) * 300, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      if (grow || hit.kind === "mile") {
        // sparks
        const r = rng(Math.round(hit.t * 100) + 9);
        ctx.save();
        for (let i = 0; i < (grow && hit.big ? 110 : 46); i++) {
          const ang = r() * Math.PI * 2;
          const sp = 160 + r() * 520;
          const x = h.x + Math.cos(ang) * sp * d;
          const y = grow ? h.y - Math.abs(Math.sin(ang)) * sp * d * 1.2 + 260 * d * d : h.y + Math.sin(ang) * sp * d + 420 * d * d;
          const a = clamp(1 - d / (0.6 + r() * 0.7));
          if (a <= 0) continue;
          ctx.globalAlpha = a;
          ctx.fillStyle = r() < 0.3 ? "#fff6dc" : GOLD;
          ctx.fillRect(x - 2, y - 2, 3.5, 3.5);
        }
        ctx.restore();
      }
    }
  };
  // the change shown big next to the head
  const drawPct = (ctx: CanvasRenderingContext2D, t: number) => {
    const e = evAt(t);
    if (!e || !e.pct) return;
    const d = t - e.t0;
    const life = Math.min(e.t1 - e.t0, 2.6);
    if (d > life + 0.2) return;
    const a = d < life ? 1 : 1 - (d - life) / 0.2;
    const h = headAt(t);
    const s = 1 + 0.5 * env(t, e.t0, 0.01, 0.1);
    const up = e.pct.startsWith("+");
    const col = up ? GOLD : e.k === "crash" || e.k === "war" ? RED : ASH;
    ctx.save();
    ctx.globalAlpha = clamp(a);
    const k = camAt(t);
    text(ctx, e.pct, h.x - 34, up ? clamp(h.y - 20, 760, Math.min(k.bot + 40, 1470)) : clamp(h.y + 120, 760, Math.min(k.bot + 40, 1470)), 156 * s, 900, SANS, col, { align: "right", glow: col + "aa", glowBlur: 30, maxW: h.x - 60 });
    ctx.restore();
  };

  // ---------- the title: big in the middle, then it flies into the header
  const INTRO = [S.cold.crashes[S.cold.crashes.length - 1].at + 0.05, S.cold.crashes[S.cold.crashes.length - 1].at + 0.5];
  const drawIntro = (ctx: CanvasRenderingContext2D, t: number, hx: number) => {
    const k = ease(clamp((t - INTRO[0]) / (INTRO[1] - INTRO[0])));
    const size = 116 + (30 - 116) * k;
    ctx.font = `900 ${size}px ${SERIF}`;
    const w = ctx.measureText(S.brand).width;
    const x = W / 2 - w / 2 + (hx - (W / 2 - w / 2)) * k;
    const y = 560 + (127 - 560) * k;
    const pop = 1 + 0.12 * env(t, 0.05, 0.01, 0.25);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pop, pop);
    text(ctx, S.brand, 0, 0, size, 900, SERIF, GOLD, { ls: 2 + 8 * (1 - k), glow: "rgba(255,201,77,0.45)", glowBlur: 30 * (1 - k) });
    ctx.restore();
    if (k < 1) {
      ctx.globalAlpha = 1 - k;
      text(ctx, S.cold.promise ?? "", W / 2, 630, 46, 900, SERIF, "#e8dcc0", { align: "center", ls: 6, glow: "rgba(0,0,0,0.9)", glowBlur: 10 });
      ctx.globalAlpha = 1;
    }
  };

  // ---------- header
  const drawHeader = (ctx: CanvasRenderingContext2D, t: number) => {
    const fade = 1 - clamp((t - END) / 0.6);
    if (fade <= 0) return;
    const k = camAt(t);
    ctx.save();
    ctx.globalAlpha = fade;
    const logo = IMGS["mark-disc.png"];
    if (logo) ctx.drawImage(logo, 56, 92, 46, 46);
    const w1 = text(ctx, "世界的形状", 114, 126, 28, 900, SANS, "#f3f4f7", { ls: 2 });
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(114 + w1 + 14, 104, 2, 26);
    if (t >= INTRO[1]) text(ctx, S.brand, 114 + w1 + 30, 127, 30, 900, SERIF, GOLD, { ls: 2 });
    else drawIntro(ctx, t, 114 + w1 + 30);
    const c = k.c;
    const rw = t >= S.cold.rewind[0] && t < B0;
    text(ctx, rw ? "回到两千年前……" : S.era(c), 58, 186, 30, 700, SERIF, SOFT, { maxW: 520 });
    // year
    const yNum = Math.max(1, Math.floor(c + 1e-6));
    let x = 56;
    if (yNum < 1000) x += text(ctx, "公元", 58, 300, 48, 900, SERIF, WHITE) + 8;
    const blur = Math.min(4, k.sp / 500);
    if (blur > 0.4) ctx.filter = `blur(${blur.toFixed(1)}px)`;
    x += tabular(ctx, String(yNum), x, 300, 116, WHITE);
    ctx.filter = "none";
    text(ctx, "年", x + 6, 300, 46, 900, SERIF, WHITE);
    if (c > LAST_REAL + 0.5 && t < END) {
      // projection: say it loudly
      const bx = x + 70;
      ctx.font = `900 34px ${SERIF}`;
      const bw = ctx.measureText("联合国预测").width + 30;
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 5]);
      ctx.strokeRect(bx, 244, bw, 54);
      ctx.setLineDash([]);
      text(ctx, "联合国预测", bx + 15, 283, 34, 900, SERIF, GOLD);
    }
    // population
    const v = val(c);
    const slope = val(c) - val(c - 0.6);
    const e = evAt(t);
    const red = e && (e.k === "crash" || e.k === "war") && slope < 0;
    const col = red ? RED : slope < -0.5 ? ASH : GOLD;
    const f = fmtPop(v);
    if (!rw) {
      const nw = tabular(ctx, f.n, 58, 404, 86, col, { glow: col + "55" });
      text(ctx, `${f.u}人`, 58 + nw + 8, 404, 36, 900, SERIF, col);
      const g = gapAt(c);
      const chip = g && !S.noGapChip ? `两次统计相隔 ${g} 年` : S.kindLabel[kindAt(c)];
      ctx.font = `700 22px ${SERIF}`;
      const cw = ctx.measureText(chip).width + 24;
      ctx.strokeStyle = "rgba(200,205,210,0.45)";
      ctx.lineWidth = 1;
      ctx.strokeRect(60, 424, cw, 34);
      text(ctx, chip, 72, 449, 22, 700, SERIF, "#aeb4ba");
    }
    ctx.restore();
  };
  // the event log (top-right): the last few events stack up, newest on top
  const drawLog = (ctx: CanvasRenderingContext2D, t: number) => {
    if (S.table || t < B0 || t >= END) return;
    const e = evAt(t);
    if (!e) return;
    const list = EV.slice(Math.max(0, e.i - 5), e.i + 1).reverse();
    ctx.save();
    list.forEach((x, i) => {
      const enter = i === 0 ? eo3((t - x.t0) / 0.15) : 1;
      const y = 196 + i * 50 - (1 - enter) * 30;
      const a = (i === 0 ? 1 : 0.62 - i * 0.09) * enter;
      if (a <= 0) return;
      ctx.globalAlpha = a;
      const tone = KIND_TONE[x.k];
      ctx.fillStyle = toneCol(tone);
      ctx.fillRect(640, y - 26, 5, 32);
      const yr = x.tag ? x.tag.split(" · ")[0] : "";
      text(ctx, yr, 658, y, 22, 700, SANS, SOFT, { maxW: 150 });
      text(ctx, x.t || x.n || "", 812, y, 26, 900, SERIF, i === 0 ? WHITE : "#c9ced3", { maxW: SAFE_R - 812 });
    });
    ctx.restore();
  };
  // the population table (world): regions, with their change
  const drawTable = (ctx: CanvasRenderingContext2D, t: number) => {
    if (!S.table || t < B0 - 0.3 || t >= END) return;
    const c = camAt(t).c;
    const rows = S.table(c);
    const was = S.table(c - 60);
    const tot = rows.reduce((s, r) => s + r.v, 0);
    const a = clamp((t - (B0 - 0.3)) / 0.3) * (1 - clamp((t - (END - 0.4)) / 0.4));
    ctx.save();
    ctx.globalAlpha = a;
    text(ctx, "各大洲人口", 640, 168, 22, 700, SERIF, MUTED);
    rows.forEach((r, i) => {
      const y = 214 + i * 50;
      ctx.fillStyle = r.c;
      ctx.fillRect(640, y - 22, 6, 28);
      text(ctx, r.n, 656, y, 26, 900, SERIF, WHITE);
      const f = fmtPop(r.v);
      text(ctx, `${f.n}${f.u}`, 920, y, 25, 900, SANS, WHITE, { align: "right" });
      const ch = r.v / Math.max(1, was[i].v) - 1;
      if (Math.abs(ch) >= 0.005) {
        const down = ch < 0;
        text(ctx, `${down ? "▼" : "▲"}${Math.abs(ch * 100).toFixed(0)}%`, 1034, y, 21, 900, SANS, down ? RED : GOLD, { align: "right" });
      }
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(656, y + 9, 378, 4);
      ctx.fillStyle = r.c;
      ctx.fillRect(656, y + 9, 378 * (r.v / tot), 4);
    });
    ctx.restore();
  };

  // ---------- swing ticks: every recorded count the head passes gets its change measured on the chart (pinned, scrolls away)
  const PCT_YEARS = EV.filter((e) => e.pct).map((e) => e.y);
  const drawTicks = (ctx: CanvasRenderingContext2D, t: number) => {
    if (t < B0 || t >= END) return;
    const k = camAt(t);
    if (k.lg > 0.05) return;
    const c = k.c;
    ctx.save();
    let lastX = 1e9;
    let iTop = 1;
    while (iTop < SER.length && SER[iTop].y <= c + 1e-6) iTop++;
    // newest first, so the tick being passed always shows; older ones too close to it are skipped
    for (let i = iTop - 1; i >= 1; i--) {
      const p = SER[i];
      if (p.kind === "stat" || p.kind === "un") continue;
      const pr = SER[i - 1];
      const ch = p.v / pr.v - 1;
      if (Math.abs(ch) < 0.03) continue;
      if (PCT_YEARS.some((y) => Math.abs(y - p.y) < 1.01)) continue;
      const pxd = (c - p.y) * k.ppy;
      const a = 1 - clamp((pxd - 380) / 140);
      if (a <= 0) continue;
      const x = X(k, p.y);
      if (lastX - x < 84) continue;
      if (x < -60) break;
      lastX = x;
      const y0 = Yv(k, pr.v);
      const y1 = Yv(k, p.v);
      const up = ch > 0;
      const col = up ? GOLD : segTone(pr, p) === RED ? RED : ASH;
      const pop = 1 + 0.45 * clamp(1 - pxd / 30);
      ctx.globalAlpha = a * 0.8;
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 6]);
      ctx.beginPath();
      ctx.moveTo(Math.max(X(k, pr.y), x - 170), y0);
      ctx.lineTo(x, y0);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y1);
      ctx.stroke();
      ctx.globalAlpha = a;
      const lab = `${up ? "+" : "−"}${Math.round(Math.abs(ch) * 100)}%`;
      text(ctx, lab, x - 12, (y0 + y1) / 2 + 10, 30 * pop, 900, SANS, col, { align: "right", glow: "rgba(0,0,0,0.95)", glowBlur: 10 });
    }
    ctx.restore();
  };

  // ---------- the card at the head: tag, title, number, sub; each line lands on its own beat
  const REV = new Map(EV.map((e) => [e.i, revealOf(e, BEATS)]));
  const CX_OFF = 60;
  const wrap2 = (ctx: CanvasRenderingContext2D, s: string, size: number, maxW: number) => {
    if (measure(ctx, s, size, 900, SERIF) <= maxW) return [s];
    const cut = s.indexOf("，");
    if (cut > 0 && cut < s.length - 1) return [s.slice(0, cut + 1), s.slice(cut + 1)];
    return [s];
  };
  const cardBox = (ctx: CanvasRenderingContext2D, e: Placed, maxW: number) => {
    const TS = e.n ? 60 : 72;
    const lines = e.t ? wrap2(ctx, e.t, TS, maxW) : [];
    const NS = e.n ? (e.n.length > 8 ? 84 : 118) : 0;
    const h = 46 + lines.length * TS * 1.18 + (e.n ? NS * 1.02 : 0) + (e.s ? 46 : 0);
    return { TS, lines, NS, h };
  };
  const drawOne = (ctx: CanvasRenderingContext2D, e: Placed, t: number, fade: number, lift: number) => {
    const k = camAt(t);
    const h0 = headAt(e.t0 + 0.01);
    const hx = headAt(t).x;
    const x0 = hx + CX_OFF;
    const maxW = SAFE_R - x0;
    const tone = KIND_TONE[e.k];
    const col = toneCol(tone);
    const bottom = Math.min(k.bot + 40, 1470); // stay above the caption zone
    // stacked list (same st id): every line stays, newest bright and at the bottom
    if (e.st) {
      const grp = EV.filter((x) => x.st === e.st && x.i <= e.i);
      const RH = 60;
      const y0 = clamp(h0.y - (grp.length * RH) / 2, 590, bottom - grp.length * RH);
      grp.forEach((x, i) => {
        const y = y0 + (i + 1) * RH - lift;
        const newest = i === grp.length - 1;
        const enter = eo3((t - x.t0) / 0.1);
        ctx.globalAlpha = fade * enter * (newest ? 1 : 0.55);
        const c = toneCol(KIND_TONE[x.k]);
        ctx.fillStyle = c;
        ctx.fillRect(x0, y - 40, 6, 46);
        const yr = x.tag ? x.tag.split(" · ")[0] : "";
        const w = text(ctx, yr, x0 + 18, y, 26, 700, SANS, SOFT);
        const s = newest ? 1 + 0.25 * env(t, x.t0, 0.01, 0.1) : 1;
        text(ctx, x.t, x0 + 30 + Math.max(w, 128), y, 44 * s, 900, SERIF, newest ? WHITE : "#c9ced3", { maxW: maxW - 30 - Math.max(w, 128) });
      });
      return;
    }
    const R = REV.get(e.i)!;
    const B = cardBox(ctx, e, maxW);
    let y = clamp(h0.y - B.h * 0.42, 590, bottom - B.h) - lift;
    const slide = (r: number) => (1 - eo3((t - r) / 0.12)) * 46;
    const on = (r: number) => clamp((t - r) / 0.06) * fade;
    // tag row
    ctx.globalAlpha = on(R.title);
    let tx = x0 + slide(R.title);
    y += 34;
    const lab = e.y > LAST_REAL + 0.5 ? "预测" : KIND_LABEL[e.k];
    if (lab) {
      ctx.font = `900 24px ${SERIF}`;
      const cw = ctx.measureText(lab).width + 22;
      ctx.fillStyle = col;
      ctx.globalAlpha = on(R.title) * 0.95;
      ctx.fillRect(tx, y - 27, cw, 35);
      text(ctx, lab, tx + 11, y - 1, 24, 900, SERIF, "#0a0b0d");
      tx += cw + 12;
      ctx.globalAlpha = on(R.title);
    }
    if (e.tag) text(ctx, e.tag, tx, y, 29, 700, SANS, SOFT, { maxW: x0 + maxW - tx });
    y += 12;
    // title
    const ts = 1 + 0.22 * env(t, R.title, 0.01, 0.09) * (e.n ? 0.5 : 1);
    for (const L of B.lines) {
      y += B.TS * 1.18;
      ctx.save();
      ctx.translate(x0 + slide(R.title), y - B.TS * 0.18);
      ctx.scale(ts, ts);
      ctx.globalAlpha = on(R.title);
      text(ctx, L, 0, 0, B.TS, 900, SERIF, e.n ? WHITE : col, { maxW: maxW / ts, glow: "rgba(0,0,0,0.9)", glowBlur: 12 });
      ctx.restore();
    }
    // number
    if (e.n) {
      y += B.NS * 1.02;
      if (t >= R.num - 0.001) {
        const s = 1 + 0.4 * env(t, R.num, 0.01, 0.09);
        ctx.save();
        ctx.translate(x0, y - B.NS * 0.06);
        ctx.scale(s, s);
        ctx.globalAlpha = on(R.num);
        text(ctx, e.n, 0, 0, B.NS, 900, SANS, col, { glow: col + "77", glowBlur: 28, maxW: maxW / s });
        ctx.restore();
      }
    }
    // sub line
    if (e.s) {
      y += 46;
      if (t >= R.sub - 0.001) {
        ctx.globalAlpha = on(R.sub);
        text(ctx, e.s, x0 + slide(R.sub) * 0.6, y, 31, 700, SERIF, SOFT, { maxW, glow: "rgba(0,0,0,0.9)", glowBlur: 8 });
      }
    }
  };
  const drawCard = (ctx: CanvasRenderingContext2D, t: number) => {
    const e = evAt(t);
    if (!e) return;
    ctx.save();
    // the previous card lifts away as the new one lands
    const prev = e.i > 0 ? EV[e.i - 1] : null;
    const d = t - e.t0;
    if (prev && d < 0.1 && prev.k !== "quote" && !(prev.st && prev.st === e.st)) drawOne(ctx, prev, t, Math.pow(1 - d / 0.1, 2), eo3(d / 0.1) * 70);
    if (e.k !== "quote") drawOne(ctx, e, t, 1, 0);
    ctx.restore();
  };
  // a line from the sources: brush, over the chart
  const drawQuote = (ctx: CanvasRenderingContext2D, t: number) => {
    const e = evAt(t);
    if (!e || e.k !== "quote") return;
    const d = t - e.t0;
    const a = clamp(d / 0.12) * clamp((e.t1 - t) / 0.12);
    ctx.save();
    ctx.globalAlpha = a * 0.75;
    const g = ctx.createLinearGradient(0, 650, 0, 1010);
    g.addColorStop(0, "rgba(4,5,7,0)");
    g.addColorStop(0.5, "rgba(4,5,7,0.85)");
    g.addColorStop(1, "rgba(4,5,7,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 650, W, 360);
    ctx.globalAlpha = a;
    const s = 1 + 0.15 * env(t, e.t0, 0.01, 0.12);
    const parts = e.t.split("，");
    parts.forEach((p, i) => {
      const tb = i === 0 ? e.t0 : (BEATS.find((b) => b.t > e.t0 + 0.05)?.t ?? e.t0);
      if (t < tb) return;
      ctx.globalAlpha = a * clamp((t - tb) / 0.08);
      text(ctx, p + (i < parts.length - 1 ? "，" : ""), (60 + SAFE_R) / 2, 800 + i * 110, 96 * (i === 0 ? s : 1 + 0.15 * env(t, tb, 0.01, 0.12)), 400, BRUSH, WHITE, { align: "center", maxW: SAFE_R - 80, glow: "rgba(0,0,0,0.9)" });
    });
    if (e.s) text(ctx, "—— " + e.s, SAFE_R - 10, 1000, 30, 700, SERIF, SOFT, { align: "right" });
    ctx.restore();
  };

  // ---------- red alarm frame (the biggest wars and crashes)
  const drawAlarm = (ctx: CanvasRenderingContext2D, t: number) => {
    const e = evAt(t);
    const gold = !!e && !!e.big && (e.k === "peak" || e.k === "unite" || e.k === "grow");
    if (!e || !e.big || !(gold || e.k === "war" || e.k === "crash" || e.k === "split" || e.k === "plague")) return;
    const plague = e.k === "plague";
    if (e.k === "crash" && e.y >= 1955) return;
    const d = t - e.t0;
    const life = e.t1 - e.t0;
    const a = clamp(d / 0.06) * clamp((life - d) / 0.15) * (0.75 + 0.25 * Math.sin(t * 12));
    ctx.save();
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
    g.addColorStop(0, "rgba(120,0,0,0)");
    g.addColorStop(1, gold ? `rgba(150,105,10,${0.42 * a})` : plague ? `rgba(70,74,80,${0.6 * a})` : `rgba(150,8,4,${0.55 * a})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = a;
    ctx.strokeStyle = gold ? "rgba(255,201,77,0.9)" : plague ? "rgba(210,215,220,0.85)" : "rgba(255,70,55,0.9)";
    ctx.lineWidth = 3;
    const FB = camAt(t).bot + 70;
    ctx.strokeRect(24, 540, W - 48, FB - 540);
    ctx.lineWidth = 7;
    const L = 46;
    for (const [x, y, sx, sy] of [[24, 540, 1, 1], [W - 24, 540, -1, 1], [24, FB, 1, -1], [W - 24, FB, -1, -1]] as const) {
      ctx.beginPath();
      ctx.moveTo(x, y + sy * L);
      ctx.lineTo(x, y);
      ctx.lineTo(x + sx * L, y);
      ctx.stroke();
    }
    ctx.fillStyle = gold ? "rgba(255,201,77,0.95)" : plague ? "rgba(210,215,220,0.95)" : "rgba(255,59,47,0.95)";
    const small = S.id === "world" && !!e.pct && Math.abs(parseFloat(e.pct.replace("−", "-"))) < 10; // a few percent of the world is a fall, not a collapse
    const lab = gold ? "人口激增" : plague ? "瘟疫" : e.k === "crash" ? (small ? "人口减少" : "人口崩塌") : "战乱";
    ctx.font = `900 26px ${SERIF}`;
    const lw = ctx.measureText(lab).width + 44;
    ctx.fillRect(W / 2 - lw / 2, 522, lw, 38);
    text(ctx, lab, W / 2, 550, 26, 900, SERIF, plague || gold ? "#111" : "#fff", { align: "center" });
    ctx.restore();
  };
  const drawFlash = (ctx: CanvasRenderingContext2D, t: number) => {
    for (const h of HITS) {
      const d = t - h.t;
      if (d < 0 || d > 0.25) continue;
      const gf = h.big && (h.kind === "peak" || h.kind === "unite" || h.kind === "grow");
      if (!(gf || h.kind === "crash" || (h.big && h.kind === "war"))) continue;
      if (!h.e && !h.big) continue;
      const a = (gf ? 0.6 : 1) * (d < 0.034 ? 0.55 : 0.55 * (1 - (d - 0.034) / 0.2));
      ctx.save();
      ctx.globalAlpha = clamp(a);
      ctx.fillStyle = gf ? "#ffe39a" : h.big ? "#fff3f0" : "#ffffff";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  };

  // ---------- the rewind: tape running backwards
  const drawRewind = (ctx: CanvasRenderingContext2D, t: number) => {
    if (t < RW0 - 0.05 || t > RW1 + 0.12) return;
    const a = clamp((t - (RW0 - 0.05)) / 0.08) * clamp((RW1 + 0.12 - t) / 0.12);
    const r = rng(Math.round(t * FPS) * 31 + 7);
    ctx.save();
    // scan bands
    for (let i = 0; i < 7; i++) {
      ctx.globalAlpha = a * (0.05 + 0.08 * r());
      ctx.fillStyle = "#cfe6ff";
      ctx.fillRect(0, r() * H, W, 3 + r() * 26);
    }
    ctx.globalAlpha = a;
    const jx = (r() - 0.5) * 8;
    // ◀◀
    ctx.fillStyle = WHITE;
    for (const ox of [0, 62]) {
      ctx.beginPath();
      ctx.moveTo(W / 2 - 160 + ox + jx, 455);
      ctx.lineTo(W / 2 - 100 + ox + jx, 420);
      ctx.lineTo(W / 2 - 100 + ox + jx, 490);
      ctx.closePath();
      ctx.fill();
    }
    text(ctx, "倒回", W / 2 + 10 + jx, 482, 72, 900, SERIF, WHITE, { glow: "rgba(150,200,255,0.8)", glowBlur: 20 });
    const yNow = Math.max(Math.max(1, FIRST), Math.floor(CUR(t)));
    text(ctx, `公元 ${yNow} 年`, W / 2 + jx, 560, 44, 900, SANS, "#cfe6ff", { align: "center", glow: "rgba(0,0,0,0.9)", glowBlur: 10 });
    ctx.restore();
  };
  const drawSource = (ctx: CanvasRenderingContext2D, t: number) => {
    if (!S.src || t < B0 - 0.2 || t >= S.ending.card) return;
    const c = camAt(t).c;
    const e = evAt(t);
    let line = "数据：" + S.src(t >= END ? LAST_REAL : c);
    if (t >= END) line = S.srcEnd ?? "数据：正史户口、学者估算（葛剑雄、吴松弟、曹树基等）、国家统计局、联合国预测";
    else if (e?.src) line += "　｜　" + e.src;
    const a = clamp((t - (B0 - 0.2)) / 0.3);
    ctx.save();
    const g = ctx.createLinearGradient(0, 1800, 0, H);
    g.addColorStop(0, "rgba(4,5,7,0)");
    g.addColorStop(1, `rgba(4,5,7,${0.8 * a})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 1800, W, H - 1800);
    ctx.globalAlpha = a * 0.75;
    text(ctx, line, 40, 1872, 22, 500, SERIF, "#a7adb3", { maxW: W - 80 });
    ctx.restore();
  };
  // actual | projection: a marker on the chart once the head passes the last count
  const drawProjMark = (ctx: CanvasRenderingContext2D, t: number) => {
    const k = camAt(t);
    if (k.c <= LAST_REAL + 0.2 && t < END) return;
    if (t >= S.ending.card) return;
    const x = X(k, LAST_REAL);
    if (x < 20 || x > W - 20) return;
    const top = t >= END ? 600 : k.top - 20;
    const bot = t >= END ? 1400 : k.bot;
    ctx.save();
    ctx.globalAlpha = 0.85 * (t >= END ? clamp((t - END) / 0.5) * (1 - clamp((t - (S.ending.card - 0.4)) / 0.4)) : 1);
    if (t < END) {
      ctx.fillStyle = "rgba(255,201,77,0.05)";
      ctx.fillRect(x, top, Math.max(0, headAt(t).x - x), bot - top);
    }
    ctx.strokeStyle = "rgba(255,201,77,0.7)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bot);
    ctx.stroke();
    ctx.setLineDash([]);
    text(ctx, "实际", x - 12, top + 30, 26, 900, SERIF, SOFT, { align: "right" });
    text(ctx, "预测", x + 12, top + 30, 26, 900, SERIF, GOLD);
    ctx.restore();
  };

  // ---------- cold open
  const drawCold = (ctx: CanvasRenderingContext2D, t: number) => {
    if (t >= B0) return;
    const k = camAt(t);
    ctx.save();
    // crash labels on the troughs: the newest one big, the older ones settle small
    const P1 = 0.4654;
    const L0t = S.cold.lines[0]?.t0 ?? RW0;
    let newest = -1;
    S.cold.crashes.forEach((c, i) => {
      if (t >= c.at - 0.01) newest = i;
    });
    const fadeOut = 1 - clamp((t - (RW0 - 0.3)) / 0.3);
    S.cold.crashes.forEach((c, i) => {
      if (t < c.at - 0.01 || t > RW0) return;
      const v = val(c.y);
      const x = X(k, c.y);
      const y = Yv(k, v);
      const isNew = i === newest && t < c.at + 0.9 && t < L0t;
      const grow = isNew ? 1 + 0.45 * (1 - clamp((t - c.at - 0.45) / 0.3)) : 1;
      const s = grow * (1 + 0.6 * env(t, c.at, 0.01, 0.1));
      // roll call while the first line says "8 次"
      const rc = L0t + (i * P1) / 2;
      const roll = env(t, rc, 0.01, 0.25);
      ctx.globalAlpha = fadeOut;
      const cc = c.tone === "gold" ? GOLD : RED;
      ctx.fillStyle = cc;
      ctx.beginPath();
      ctx.arc(x, y, 8 * s, 0, Math.PI * 2);
      ctx.fill();
      if (roll > 0.02) {
        ctx.save();
        ctx.globalAlpha = fadeOut * roll;
        ctx.strokeStyle = cc;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x, y, 10 + 46 * (1 - roll), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      let dx = S.ending.troughs.find((q) => Math.abs(q.y - c.y) < 2)?.dx ?? 0;
      const rs = s * (1 + 0.25 * roll);
      if (S.cold.soloLabels) {
        if (!isNew) return;
        ctx.font = `900 ${28 * rs}px ${SERIF}`;
        let hw = ctx.measureText(c.t).width / 2;
        ctx.font = `900 ${30 * rs}px ${SANS}`;
        if (c.p) hw = Math.max(hw, ctx.measureText(c.p).width / 2);
        dx = clamp(x, 60 + hw, SAFE_R - hw) - x;
      }
      text(ctx, c.t, x + dx, y + 44 * rs, 28 * rs, 900, SERIF, isNew ? WHITE : cc, { align: "center", glow: "rgba(0,0,0,0.95)", glowBlur: 10 });
      if (c.p) text(ctx, c.p, x + dx, y + 80 * rs, 30 * rs, 900, SANS, cc, { align: "center", glow: "rgba(0,0,0,0.95)", glowBlur: 10 });
    });
    // where it starts and where it is now
    {
      const xs = X(k, FIRST);
      const ys = Yv(k, val(FIRST));
      ctx.globalAlpha = fadeOut;
      text(ctx, S.cold.start ?? "公元 2 年", xs - 4, ys - 74, 24, 700, SERIF, SOFT);
      const f0 = fmtPop(val(FIRST));
      text(ctx, `${f0.n} ${f0.u}`, xs - 4, ys - 34, 36, 900, SANS, WHITE, { glow: "rgba(0,0,0,0.9)", glowBlur: 8 });
      const tEnd = S.cold.crashes[S.cold.crashes.length - 1].at + P1;
      const mk = S.cold.mark;
      const endTo = mk ? mk.t0 : S.cold.rings?.length ? Math.min(...S.cold.rings.map((r) => r.t0)) : RW0;
      if (t >= tEnd - 0.01 && t < endTo) {
        const xe = X(k, LAST_REAL);
        const ye = Yv(k, val(LAST_REAL));
        const s = 1 + 0.5 * env(t, tEnd, 0.01, 0.12);
        ctx.globalAlpha = clamp((endTo - t) / 0.15);
        ctx.save();
        ctx.translate(Math.min(xe + 36, SAFE_R), ye + 70);
        ctx.scale(s, s);
        const fe = fmtPop(val(LAST_REAL));
        text(ctx, `${fe.n} ${fe.u}`, 0, 0, 54, 900, SANS, GOLD, { align: "right", glow: "rgba(255,201,77,0.6)", glowBlur: 20 });
        ctx.restore();
        text(ctx, `${LAST_REAL} 年`, Math.min(xe + 36, SAFE_R), ye + 108, 26, 700, SERIF, SOFT, { align: "right" });
      }
      // the turn now: a calm white ring, no lightning
      if (mk && t >= mk.t0 && t < mk.t1 + 0.2) {
        const xm = X(k, mk.y);
        const ym = Yv(k, val(mk.y));
        const p = beatPulse(t);
        ctx.globalAlpha = clamp((t - mk.t0) / 0.15) * clamp((mk.t1 + 0.2 - t) / 0.2) * fadeOut;
        const mc = mk.tone === "red" ? RED : WHITE;
        ctx.strokeStyle = mc;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(xm, ym, 24 + 10 * p, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = mc;
        ctx.beginPath();
        ctx.arc(xm, ym, 9, 0, Math.PI * 2);
        ctx.fill();
        if (mk.label) text(ctx, mk.label, xm + 30, ym + 70, 30, 900, SANS, WHITE, { align: "right", glow: "rgba(0,0,0,0.9)", glowBlur: 8 });
      }
    }
    const cl = S.cold.ceiling;
    if (cl && t >= cl.t0 && t < RW0) {
      const yv = Yv(k, cl.v);
      const xa = X(k, cl.y0);
      const xb = X(k, cl.y1);
      const grow = eo3((t - cl.t0) / 0.35);
      ctx.globalAlpha = fadeOut;
      ctx.strokeStyle = WHITE;
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 9]);
      ctx.beginPath();
      ctx.moveTo(xa, yv);
      ctx.lineTo(xa + (xb - xa) * grow, yv);
      ctx.stroke();
      ctx.setLineDash([]);
      cl.peaks.forEach(([py, pt], i) => {
        if (t < pt) return;
        const xp = X(k, py);
        const yp = Yv(k, val(py));
        const pa = clamp((t - pt) / 0.08);
        const pop = 1 + 0.5 * env(t, pt, 0.01, 0.12);
        ctx.globalAlpha = fadeOut * pa;
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(xp, yp, 20 * pop, 0, Math.PI * 2);
        ctx.stroke();
        text(ctx, cl.names[i], xp, yp - 34 * pop, 30 * pop, 900, SERIF, GOLD, { align: "center", glow: "rgba(0,0,0,0.95)", glowBlur: 10 });
      });
    }
    for (const r of S.cold.rings ?? []) {
      if (t < r.t0 || t > r.t1 + 0.2 || t >= RW0) continue;
      const xp = X(k, r.y);
      const yp = Yv(k, val(r.y));
      const pop = 1 + 0.5 * env(t, r.t0, 0.01, 0.12);
      const col = r.tone === "gold" ? GOLD : WHITE;
      ctx.globalAlpha = fadeOut * clamp((t - r.t0) / 0.08) * clamp((r.t1 + 0.2 - t) / 0.2);
      ctx.strokeStyle = col;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(xp, yp, 20 * pop, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(xp, yp, 8, 0, Math.PI * 2);
      ctx.fill();
      const dx = r.dx ?? 0;
      const al: CanvasTextAlign = dx < 0 ? "right" : dx > 0 ? "left" : "center";
      if (r.label) text(ctx, r.label, xp + dx * pop, yp + (r.dy ?? -40) * pop, 40 * pop, 900, SANS, col, { align: al, glow: "rgba(0,0,0,0.95)", glowBlur: 12 });
    }
    for (const sp of S.cold.spans ?? []) {
      if (t < sp.t0 || t > sp.t1 + 0.2 || t >= RW0) continue;
      const xa = X(k, sp.y0);
      const xb = X(k, sp.y1);
      const grow = eo3((t - sp.t0) / 0.3);
      const xg = xa + (xb - xa) * grow;
      const yb = 1036;
      const col = sp.tone === "gold" ? GOLD : WHITE;
      ctx.globalAlpha = fadeOut * clamp((sp.t1 + 0.2 - t) / 0.2);
      ctx.strokeStyle = col;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(xa, yb - 12);
      ctx.lineTo(xa, yb);
      ctx.lineTo(xg, yb);
      if (grow > 0.98) ctx.lineTo(xb, yb - 12);
      ctx.stroke();
      const s2 = 1 + 0.35 * env(t, sp.t0 + 0.3, 0.01, 0.12);
      ctx.globalAlpha *= clamp((t - sp.t0 - 0.2) / 0.1);
      const lx = clamp((xa + xb) / 2, 120, SAFE_R - 60);
      text(ctx, sp.label, lx, yb + 44, 36 * s2, 900, SERIF, col, { align: "center", glow: "rgba(0,0,0,0.95)", glowBlur: 12 });
    }
    // the counter: one more fall on every hit
    if (S.cold.counter && newest >= 0 && t < L0t + 0.15) {
      const c = S.cold.crashes[newest];
      const pop = 1 + 0.45 * env(t, c.at, 0.01, 0.13);
      ctx.globalAlpha = clamp((L0t + 0.15 - t) / 0.15);
      const num = String(newest + 1);
      ctx.font = `900 210px ${SANS}`;
      const wn = ctx.measureText(num).width;
      ctx.font = `900 64px ${SERIF}`;
      const wl = ctx.measureText(S.cold.counter).width;
      const x0 = 60;
      ctx.save();
      ctx.translate(x0 + wn / 2, 1440);
      ctx.scale(pop, pop);
      text(ctx, num, -wn / 2, 0, 210, 900, SANS, RED, { glow: "rgba(255,59,47,0.7)", glowBlur: 30 });
      ctx.restore();
      text(ctx, S.cold.counter, x0 + wn + 24, 1430, 64, 900, SERIF, WHITE, { glow: "rgba(0,0,0,0.9)", glowBlur: 10 });
    }
    // the lines
    for (const L of S.cold.lines) {
      if (t < L.t0 || t > L.t1) continue;
      const d = t - L.t0;
      const s = 1 + 0.3 * env(t, L.t0, 0.01, 0.1);
      const col = toneCol(L.tone ?? "white");
      ctx.globalAlpha = clamp(d / 0.06) * clamp((L.t1 - t) / 0.1);
      ctx.save();
      ctx.translate(W / 2, 545);
      ctx.scale(s, s);
      text(ctx, L.a, 0, 0, 84, 900, SERIF, col, { align: "center", maxW: 960 / s, glow: "rgba(0,0,0,0.9)", glowBlur: 16 });
      ctx.restore();
      if (L.b) {
        const tb = L.t0 + 2 * 0.4654;
        if (t >= tb) {
          const s2 = 1 + 0.25 * env(t, tb, 0.01, 0.1);
          ctx.save();
          ctx.translate(W / 2, 618);
          ctx.scale(s2, s2);
          text(ctx, L.b, 0, 0, 52, 900, SERIF, WHITE, { align: "center", maxW: 960 / s2, glow: "rgba(0,0,0,0.9)", glowBlur: 12 });
          ctx.restore();
        }
      }
    }
    ctx.restore();
  };

  // ---------- the dynasties under the whole line: rise and fall at a glance
  const RIB_Y = 1560;
  const drawRibbon = (ctx: CanvasRenderingContext2D, t: number, alpha: number) => {
    const k = camAt(t);
    const a = ease(k.lg) * alpha;
    if (!S.dyn || a <= 0.01 || t < B0) return;
    const lit = t >= END ? LAST_REAL : k.c;
    ctx.save();
    S.dyn.forEach(([y0, y1, name, u], i) => {
      const x0 = X(k, Math.max(FIRST, y0)) + 1;
      const x1 = X(k, Math.min(LAST_REAL, y1)) - 1;
      if (x1 <= x0) return;
      const xl = X(k, Math.max(FIRST, Math.min(lit, y1)));
      const col = u === 1 ? (i % 2 ? "255,214,120" : "255,190,60") : u === 0 ? "150,160,172" : "235,238,242";
      ctx.globalAlpha = a * 0.22;
      ctx.fillStyle = `rgb(${col})`;
      ctx.fillRect(x0, RIB_Y, x1 - x0, 12);
      if (xl > x0) {
        ctx.globalAlpha = a * (u === 0 ? 0.75 : 0.95);
        ctx.fillRect(x0, RIB_Y, Math.min(x1, xl) - x0, 12);
      }
      if (!name) return;
      const on = lit >= y0;
      const pop = on && t < END ? 1 + 0.35 * clamp(1 - (k.c - Math.max(y0, FIRST)) / 60) : 1;
      ctx.globalAlpha = a * (on ? 1 : 0.3);
      text(ctx, name, (x0 + x1) / 2, RIB_Y + 52, 32 * pop, 900, SERIF, u === 1 ? "#ffd987" : u === 0 ? "#aeb6bf" : WHITE, { align: "center", glow: "rgba(0,0,0,0.9)", glowBlur: 8 });
    });
    ctx.restore();
  };

  // ---------- ending: the whole line on a log axis, the troughs named, the lines
  const drawEnding = (ctx: CanvasRenderingContext2D, t: number) => {
    if (t < END) return;
    const k = camAt(t);
    const d = t - END;
    const cardA = clamp((t - S.ending.card) / 0.6);
    ctx.save();
    ctx.globalAlpha = 1 - cardA;
    S.ending.troughs.forEach((tr, i) => {
      const ta = END + 0.3 + i * 0.4654;
      if (t < ta) return;
      const x = X(k, tr.y);
      const y = Yv(k, val(tr.y));
      const s = 1 + 0.5 * env(t, ta, 0.01, 0.1);
      ctx.fillStyle = RED;
      ctx.beginPath();
      ctx.arc(x, y, 7 * s, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, tr.t, x + (tr.dx ?? 0), y + 46, 28 * s, 900, SERIF, WHITE, { align: "center", glow: "rgba(0,0,0,0.9)", glowBlur: 8 });
    });
    // the turn now
    const turnY = S.id === "world" ? 2084 : 2022;
    const xe = X(k, turnY);
    const ye = Yv(k, val(turnY));
    ctx.fillStyle = WHITE;
    ctx.beginPath();
    ctx.arc(xe, ye, 9 + 4 * beatPulse(t), 0, Math.PI * 2);
    ctx.fill();
    void d;
    for (const L of S.ending.lines) {
      if (t < L.t0 || t > L.t1) continue;
      if (L.brush && t >= S.ending.card) continue; // the end card carries it from here
      const dd = t - L.t0;
      const a = clamp(dd / 0.1) * clamp((L.t1 - t) / 0.2);
      const s = 1 + 0.25 * env(t, L.t0, 0.01, 0.12);
      ctx.globalAlpha = a;
      const col = toneCol(L.tone ?? "white");
      ctx.save();
      ctx.translate(W / 2, L.brush ? 520 : 470);
      ctx.scale(s, s);
      if (L.brush) text(ctx, L.text, 0, 0, 132, 400, BRUSH, col, { align: "center", maxW: 1000, glow: col + "88", glowBlur: 30 });
      else text(ctx, L.text, 0, 0, 72, 900, SERIF, col, { align: "center", maxW: 980, glow: "rgba(0,0,0,0.9)", glowBlur: 14 });
      ctx.restore();
      if (L.text2) {
        const t2 = L.t0 + 4 * 0.4325;
        if (t >= t2) {
          ctx.globalAlpha = a * clamp((t - t2) / 0.1);
          text(ctx, L.text2, W / 2, 560, 50, 900, SERIF, SOFT, { align: "center", maxW: 980 });
        }
      }
    }
    ctx.restore();
    // end card
    if (cardA > 0) {
      ctx.save();
      ctx.globalAlpha = cardA;
      ctx.fillStyle = "rgba(5,6,8,0.85)";
      ctx.fillRect(0, 0, W, H);
      const logo = IMGS["mark-disc.png"];
      if (logo) ctx.drawImage(logo, W / 2 - 70, 760, 140, 140);
      text(ctx, "世界的形状", W / 2, 990, 64, 900, SANS, WHITE, { align: "center", ls: 6 });
      text(ctx, S.brand, W / 2, 1066, 40, 900, SERIF, GOLD, { align: "center", ls: 4 });
      ctx.restore();
    }
  };
  const drawEndingQuestion = (ctx: CanvasRenderingContext2D, t: number) => {
    // the final question stays over the end card
    const L = S.ending.lines[S.ending.lines.length - 1];
    if (t < S.ending.card || !L.brush) return;
    ctx.save();
    ctx.globalAlpha = 1;
    text(ctx, L.text, W / 2, 520, 132, 400, BRUSH, GOLD, { align: "center", maxW: 1000, glow: GOLD + "88", glowBlur: 30 });
    ctx.restore();
  };

  // ---------- the stage
  let BUF: HTMLCanvasElement | null = null;
  const draw = (ctx: CanvasRenderingContext2D, t: number) => {
    if (!BUF) {
      BUF = document.createElement("canvas");
      BUF.width = W;
      BUF.height = H;
    }
    const b = BUF.getContext("2d")!;
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.clearRect(0, 0, W, H);
    drawMap(b, t);
    const chartA = 1 - clamp((t - (S.ending.card - 0.2)) / 0.8);
    drawChart(b, t, chartA);
    drawRibbon(b, t, chartA);
    drawStreaks(b, t);
    drawHead(b, t, chartA);
    drawTicks(b, t);
    drawProjMark(b, t);
    drawHits(b, t);
    drawCold(b, t);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const sh = shakeAt(t);
    const r = rng(Math.round(t * 30) * 13 + 5);
    const sx = (r() - 0.5) * 44 * sh;
    const sy = (r() - 0.5) * 44 * sh;
    const z = 1 + 0.045 * sh;
    ctx.save();
    ctx.translate(W / 2 + sx, H * 0.5 + sy);
    ctx.scale(z, z);
    ctx.drawImage(BUF, -W / 2, -H * 0.5);
    // ghost (RGB split feel) on hard hits
    const rwg = t >= RW0 && t < RW1 ? 0.6 : 0;
    if (rwg > 0) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.22;
      ctx.drawImage(BUF, -W / 2 + 14, -H * 0.5);
      ctx.drawImage(BUF, -W / 2 - 14, -H * 0.5 + 3);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    }
    if (sh > 0.35) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = (sh - 0.35) * 0.28;
      ctx.drawImage(BUF, -W / 2 + 10 * sh, -H * 0.5);
      ctx.drawImage(BUF, -W / 2 - 10 * sh, -H * 0.5 + 4 * sh);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    ctx.save();
    ctx.translate(sx * 0.35, sy * 0.35);
    drawAlarm(ctx, t);
    drawPct(ctx, t);
    drawHeader(ctx, t);
    drawLog(ctx, t);
    drawTable(ctx, t);
    drawCard(ctx, t);
    drawQuote(ctx, t);
    drawEnding(ctx, t);
    drawEndingQuestion(ctx, t);
    drawRewind(ctx, t);
    drawSource(ctx, t);
    ctx.restore();
    drawFlash(ctx, t);
  };
  return { draw, frames: Math.round(DUR * FPS), CUR, val, evAt, HITS, MAPCUES };
};

// =====================================================================================================================
export const Engine7: React.FC<{ film: ReturnType<typeof createFilm>; audio: string }> = ({ film, audio }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const [handle] = useState(() => delayRender("film7 fonts + images", { timeoutInMilliseconds: 180000 }));
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
    film.draw(ref.current.getContext("2d")!, t);
  }, [t, ready, film]);
  return (
    <AbsoluteFill style={{ background: "#050608", overflow: "hidden" }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 100% 60% at 50% 45%, #10141a 0%, #050608 72%)" }} />
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
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 85% 75% at 50% 50%, transparent 60%, rgba(0,0,0,0.75) 100%)", pointerEvents: "none" }} />
      <Audio src={staticFile(audio)} />
    </AbsoluteFill>
  );
};
