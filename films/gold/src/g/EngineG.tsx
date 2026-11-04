// EngineG: the population films' Engine7, re-cut for 金价两百年. Header numbers + the reserves table on top; the price line
// right under them, its head at 40% of the width; every event's card lands next to the head, line by line on the beats.
// The floor is the film's own measure: one ounce of gold, and the pile of one-dollar bills it takes to buy it (1 icon = 10 bills).
// Every event starts on a beat; every hit (shake, flash, lightning, sparks, bills) is keyed to an event start.
import React, { useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, Audio, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { BRUSH, SANS, SERIF, fontsReady } from "./fonts6";
import type { Pt, Spec } from "./specG";
import { cursorFrom, Placed } from "./time6";
import { revealOf } from "./reveal7";

const W = 1080;
const SAFE_R = 1010; // design units: the Douyin right rail starts at frame x 940
const H = 1920;
// design units -> frame. Safe area x 60..940, y 200..1440 (left 60, right 140, top 200, bottom 480):
// design x 40 -> 60, SAFE_R 1010 -> 933, design y 88 -> 200, design y 1460 -> 1435
const LS = 0.9;
const LX = 60 - 40 * LS;
const LY = 200 - 88 * LS;
const VX0 = -LX / LS; // the whole frame, in design units
const VX1 = (W - LX) / LS;
const VY0 = -LY / LS;
const VY1 = (H - LY) / LS;
const CX = 529; // centre of the safe area (frame x 500), in design units
const FULL = [VX0 - 80, VY0 - 80, VX1 - VX0 + 160, VY1 - VY0 + 160] as const;
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
  stat: "white", peak: "gold", grow: "gold", war: "red", crash: "red", plague: "ash", famine: "ash", split: "red", unite: "gold", move: "white", policy: "white", note: "white", quote: "white", turn: "white",
};
const KIND_LABEL: Record<string, string> = {
  stat: "", peak: "新高", grow: "上涨", war: "战争", crash: "暴跌", plague: "", famine: "", split: "脱钩", unite: "", move: "", policy: "政策", note: "", quote: "", turn: "转折",
};
// US$ per ounce: cents below 100 (the fixed prices 19.39, 20.67, 35.00), whole dollars above
const fmtUsd = (v: number) => (v < 100 ? v.toFixed(2) : Math.round(v).toLocaleString("en-US"));
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
export const createFilm = (S: Spec) => {
  const EN = false;
  const tr = (s: string) => s;
  const fmtV = (v: number) => ({ n: fmtUsd(v), u: "美元", s: "$" + fmtUsd(v) });
  const DUR = S.music.dur;
  const NF = Math.ceil(DUR * FPS) + 2;
  const EV = S.events;
  const [B0] = S.body;
  const END = S.ending.t0;
  const OUT = S.ending.credits?.t0 ?? S.ending.card; // where the chart and the source line leave
  const SER = S.series;
  const FIRST = SER[0].y;
  const LAST = SER[SER.length - 1].y;
  const BEATS = S.music.beats;
  const LAST_REAL = LAST;
  const SPAN_ALL = (LAST - FIRST) * 1.06;

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
  // which kind of record the head is on (the chip under the price)
  const kindAt = (y: number): Pt["kind"] => (y < 1967.99 ? "a" : y < 2000.66 ? "m" : "d");
  // trend tone: a 10% zigzag over the whole line; every segment knows if it is in a rise or a fall,
  // and a fall that holds a crash card is red (the rest of the falls are ash)
  const TREND = new Int8Array(SER.length);
  {
    const piv: number[] = [0];
    let up = SER[1].v >= SER[0].v;
    let ext = 0;
    for (let i = 1; i < SER.length; i++) {
      const v = SER[i].v;
      const e = SER[ext].v;
      if (up ? v > e : v < e) ext = i;
      else if (up ? v <= e * 0.9 : v >= e * 1.1) {
        piv.push(ext);
        up = !up;
        ext = i;
      }
    }
    piv.push(SER.length - 1);
    for (let q = 0; q < piv.length - 1; q++) {
      const a = piv[q];
      const b = piv[q + 1];
      const rise = SER[b].v >= SER[a].v;
      const red = !rise && EV.some((e) => e.k === "crash" && e.y >= SER[a].y - 0.01 && e.y <= SER[b].y + 0.3);
      for (let i = a; i < b; i++) TREND[i] = rise ? 1 : red ? -2 : -1;
    }
  }
  const cnyAt = (y: number) => {
    const C = S.cny;
    if (!C || !C.length || y < (S.cnyFrom ?? 9999)) return 0;
    if (y <= C[0][0]) return C[0][1];
    for (let i = 1; i < C.length; i++) if (y <= C[i][0]) return C[i - 1][1] + ((C[i][1] - C[i - 1][1]) * (y - C[i - 1][0])) / (C[i][0] - C[i - 1][0]);
    return C[C.length - 1][1];
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
  type Cam = { c: number; cx: number; ppy: number; hxw: number; lo: number; hi: number; top: number; bot: number; lg: number; sp: number; lgCold?: number };
  const CAM: Cam[] = [];
  {
    const SPAN0 = EV[0].span ?? 60;
    let span = SPAN0;
    let lo = 0;
    let hi = 1;
    let lgK = 0;
    let prevC = CUR(0);
    for (let f = 0; f < NF; f++) {
      const t = f / FPS;
      const c = CUR(t);
      // span target
      let target = span;
      if (t < RW1) target = SPAN_ALL;
      else if (t < B0) {
        const k = ease(clamp((t - RW1) / (B0 - RW1)));
        target = Math.exp(Math.log(SPAN_ALL) * (1 - k) + Math.log(SPAN0) * k);
      } else {
        for (let i = 0; i < EV.length && EV[i].t0 <= t; i++) if (EV[i].span) target = EV[i].span!;
      }
      span = t < B0 ? target : Math.exp(Math.log(span) + (Math.log(target) - Math.log(span)) * 0.09);
      const cold = t < RW1;
      const rw = t >= RW1 && t < B0 ? clamp((t - RW1) / (B0 - RW1)) : t >= B0 ? 1 : 0;
      const cx = cold ? LAST : c;
      const hxw = cold ? 1012 : 1012 + (HX_BODY - 1012) * ease(rw);
      const ppy = cold ? 952 / (LAST - FIRST) : (W * 0.5) / span;
      // visible range
      const yL = cx - hxw / ppy;
      let mn = Infinity;
      let mx = -Infinity;
      const a = Math.max(FIRST, yL);
      const b = Math.min(cold ? LAST : c, LAST);
      const i0 = segOf(a);
      const i1 = segOf(b) + 1;
      for (let i = i0; i <= i1 && i < SER.length; i++) {
        const v = SER[i].y < a ? val(a) : SER[i].y > b ? val(b) : SER[i].v;
        mn = Math.min(mn, v);
        mx = Math.max(mx, v);
      }
      const r = Math.max(mx - mn, mx * (c < 1968 ? 1.0 : 0.45)); // the fixed-price years stay calm: small wiggles stay small
      const tlo = Math.max(0, mn - 0.3 * r);
      const thi = mx + 0.14 * r;
      if (f === 0 || t < B0 + 0.05) {
        lo = tlo;
        hi = thi;
      } else {
        // rise fast, fall slower: a crash plunges first, then the scale catches up
        lo += (tlo - lo) * (tlo < lo ? 0.1 : 0.16);
        hi += (thi - hi) * (thi > hi ? 0.3 : 0.07);
      }
      lgK = t < RW1 ? 1 : t < B0 ? 1 - ease(clamp((t - RW1) / (B0 - RW1))) : lgK + ((t >= END ? 1 : 0) - lgK) * 0.09;
      const top = 610;
      const sp = Math.abs(c - prevC) * FPS * ppy;
      prevC = c;
      CAM.push({ c, cx, ppy, hxw, lo, hi, top, bot: 1010, lg: lgK, sp, lgCold: t < B0 ? 1 : 0 });
    }
  }
  const camAt = (t: number) => CAM[clamp(Math.round(t * FPS), 0, CAM.length - 1)];
  const L0 = Math.log10(S.log[0]);
  const L1 = Math.log10(S.log[1]);
  const X = (k: Cam, y: number) => {
    const xb = k.hxw - (k.cx - y) * k.ppy;
    if (k.lg <= 0) return xb;
    const xe = 70 + ((y - FIRST) / (LAST - FIRST)) * (SAFE_R - 50 - 70);
    return xb + (xe - xb) * ease(k.lg);
  };
  const Yv = (k: Cam, v: number) => {
    const yl = k.bot - ((v - k.lo) / (k.hi - k.lo)) * (k.bot - k.top);
    if (k.lg <= 0) return yl;
    const top = k.lgCold ? 660 : 640;
    const bot = k.lgCold ? 1000 : 1255;
    const yg = bot - ((Math.log10(Math.max(v, S.log[0])) - L0) / (L1 - L0)) * (bot - top);
    return yl + (yg - yl) * ease(k.lg);
  };
  const headAt = (t: number) => {
    const k = camAt(t);
    return { x: X(k, k.c), y: Yv(k, val(k.c)) };
  };

  // ---------- hits (one per event + the cold-open spikes)
  type Hit = { t: number; kind: string; big: boolean; tone: string; e?: Placed };
  const HITS: Hit[] = [
    ...S.cold.crashes.map((c) => ({ t: c.at, kind: c.tone === "red" ? "crash" : "mile", big: false, tone: c.tone ?? "gold" })),
    ...EV.map((e) => ({ t: e.t0, kind: e.k, big: !!e.big, tone: KIND_TONE[e.k], e })),
  ];
  const shakeAt = (t: number) =>
    HITS.reduce((m, h) => {
      if (t < h.t - 0.05 || t > h.t + 1.5) return m;
      const k = h.kind === "mile" ? 0.3 : h.kind === "crash" ? (h.big ? 1 : 0.6) : h.kind === "war" ? (h.big ? 0.8 : 0.4) : h.kind === "split" ? (h.big ? 0.9 : 0.5) : h.kind === "peak" || h.kind === "unite" ? (h.big ? 0.45 : 0.25) : h.kind === "turn" ? 0.2 : 0.12;
      return Math.max(m, k * env(t, h.t, 0.02, h.big ? 0.32 : 0.2));
    }, 0);

  // ---------- the floor: one ounce of gold, and the one-dollar bills it takes to buy it (1 icon = 10 bills)
  const FL = { x0: 262, x1: SAFE_R, y0: 1088, y1: 1414, iw: 21, ih: 10, gx: 4, gy: 4 };
  const COLS = Math.floor((FL.x1 - FL.x0 + FL.gx) / (FL.iw + FL.gx));
  const ROWS = Math.floor((FL.y1 - FL.y0 + FL.gy) / (FL.ih + FL.gy));
  const BILLS = new Float32Array(NF);
  for (let f = 0; f < NF; f++) BILLS[f] = val(CAM[f].c) / 10;
  const floorOn = (t: number) => (t < B0 - 0.5 ? 0 : t >= END ? 1 - clamp((t - END) / 0.5) : clamp((t - (B0 - 0.5)) / 0.5));
  const ingot = (ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, shine: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    // glow
    const g0 = ctx.createRadialGradient(0, 0, 10, 0, 0, 150);
    g0.addColorStop(0, `rgba(255,190,60,${0.32 + 0.3 * shine})`);
    g0.addColorStop(1, "rgba(255,190,60,0)");
    ctx.fillStyle = g0;
    ctx.fillRect(-160, -150, 320, 300);
    const front = [[-84, 30], [84, 30], [64, -18], [-64, -18]];
    const top = [[-64, -18], [64, -18], [48, -44], [-48, -44]];
    const poly = (p: number[][]) => {
      ctx.beginPath();
      p.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
    };
    const gf = ctx.createLinearGradient(0, -18, 0, 30);
    gf.addColorStop(0, "#ffe08a");
    gf.addColorStop(0.45, "#e6a91f");
    gf.addColorStop(1, "#8a5a08");
    poly(front);
    ctx.fillStyle = gf;
    ctx.fill();
    const gt = ctx.createLinearGradient(0, -44, 0, -18);
    gt.addColorStop(0, "#fff6cf");
    gt.addColorStop(1, "#f2c24a");
    poly(top);
    ctx.fillStyle = gt;
    ctx.fill();
    // a light sweep across the bar
    if (shine > 0.01) {
      ctx.save();
      poly(front);
      ctx.clip();
      const sx = -120 + 260 * (1 - shine);
      const gs = ctx.createLinearGradient(sx - 30, 0, sx + 30, 0);
      gs.addColorStop(0, "rgba(255,255,255,0)");
      gs.addColorStop(0.5, `rgba(255,255,255,${0.75 * shine})`);
      gs.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gs;
      ctx.fillRect(-90, -50, 180, 90);
      ctx.restore();
    }
    ctx.strokeStyle = "rgba(90,55,0,0.6)";
    ctx.lineWidth = 1.5;
    poly(front);
    ctx.stroke();
    text(ctx, "1 OZ", 0, 15, 22, 900, SANS, "rgba(110,66,0,0.85)", { align: "center", ls: 2 });
    ctx.restore();
  };
  const drawFloor = (ctx: CanvasRenderingContext2D, t: number) => {
    const a = floorOn(t);
    if (a <= 0.01) return;
    const fi = clamp(Math.round(t * FPS), 0, NF - 1);
    const n = BILLS[fi];
    const was = BILLS[Math.max(0, fi - 12)];
    const e = evAt(t);
    const peakHit = HITS.reduce((m, h) => (h.kind === "peak" && t >= h.t ? Math.max(m, env(t, h.t, 0.01, 0.5)) : m), 0);
    const pulse = beatPulse(t);
    ctx.save();
    ctx.globalAlpha = a;
    // the ounce
    ingot(ctx, 140, 1150, 1 + 0.04 * pulse, clamp(peakHit));
    text(ctx, "1 盎司黄金", 140, 1230, 30, 900, SERIF, GOLD, { align: "center", glow: "rgba(0,0,0,0.9)", glowBlur: 8 });
    text(ctx, "约 31.1 克", 140, 1264, 22, 600, SERIF, MUTED, { align: "center" });
    ctx.globalAlpha = a;
    text(ctx, "＝", 236, 1170, 44, 900, SANS, WHITE, { align: "center" });
    const cnt = Math.round(n * 10);
    const nw = tabular(ctx, cnt.toLocaleString("en-US"), 52, 1336, 50, WHITE, { glow: "rgba(0,0,0,0.9)" });
    text(ctx, "张", 52 + nw + 6, 1336, 28, 900, SERIF, WHITE);
    text(ctx, "1 美元钞票", 140, 1372, 24, 700, SERIF, SOFT, { align: "center" });
    text(ctx, "每格 10 张", 140, 1404, 19, 500, SERIF, MUTED, { align: "center" });
    // the pile: bottom row first, left to right
    const top = Math.ceil(Math.max(n, was));
    const fresh = Math.max(0, n - was);
    for (let i = 0; i < top; i++) {
      const row = Math.floor(i / COLS);
      if (row >= ROWS) break;
      const col = i % COLS;
      const x = FL.x0 + col * (FL.iw + FL.gx);
      let y = FL.y1 - FL.ih - row * (FL.ih + FL.gy);
      let al = 1;
      let fill = "#3d6a46";
      let edge = "rgba(170,215,160,0.55)";
      if (i < n) {
        al = clamp(n - i, 0.25, 1);
        if (i >= was && fresh > 0.05) {
          // just added: drops in with a gold glint
          const k = clamp((i - was) / Math.max(1, fresh));
          y -= 26 * k * k * k;
          fill = k > 0.5 ? "#e9c45a" : "#9fbf6a";
          edge = "rgba(255,240,190,0.9)";
        }
      } else {
        // leaving: the bills the price no longer needs lift off and go grey
        const k = clamp((i - n) / Math.max(1, was - n));
        al = 0.85 * (1 - k);
        y -= 30 * (1 - k * 0.5);
        fill = e && e.k === "crash" ? "#b8483c" : "#7b8590";
        edge = "rgba(255,255,255,0.3)";
      }
      ctx.globalAlpha = a * al;
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, FL.iw, FL.ih);
      ctx.strokeStyle = edge;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 1.5, y + 1.5, FL.iw - 3, FL.ih - 3);
      ctx.fillStyle = "rgba(220,240,210,0.45)";
      ctx.beginPath();
      ctx.ellipse(x + FL.iw / 2, y + FL.ih / 2, 3.2, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  // ---------- chart
  const toneOf = (i: number) => (TREND[Math.max(0, Math.min(SER.length - 1, i))] > 0 ? GOLD : TREND[i] === -2 ? RED : ASH);
  const segTone = (a: Pt, b: Pt) => toneOf(SER.indexOf(a));
  const drawChart = (ctx: CanvasRenderingContext2D, t: number, alpha: number) => {
    if (alpha <= 0.01) return;
    const k = camAt(t);
    const c = k.c;
    const yL = k.lg > 0.01 ? FIRST : k.cx - k.hxw / k.ppy - 2;
    const yR = t >= END ? LAST : c;
    ctx.save();
    ctx.globalAlpha = alpha;
    // grid lines with labels (linear view); round dollar levels on the log view
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
        text(ctx, "$" + (v < 100 && step < 1 ? v.toFixed(1) : Math.round(v).toLocaleString("en-US")), 44, y - 6, 19, 500, SANS, "rgba(255,255,255,0.32)");
      }
    } else {
      const ga = clamp((k.lg - 0.5) * 2) * (t < B0 ? 0.6 : 1);
      for (const v of [20, 35, 100, 1000, 5000]) {
        if (v < S.log[0] || v > S.log[1]) continue;
        const y = Yv(k, v);
        ctx.globalAlpha = alpha * ga;
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 8]);
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(SAFE_R, y);
        ctx.stroke();
        ctx.setLineDash([]);
        text(ctx, "$" + v.toLocaleString("en-US"), 44, y - 6, 19, 500, SANS, "rgba(255,255,255,0.34)");
      }
      ctx.globalAlpha = alpha;
    }
    // visible points, thinned to about one per pixel (pivots always kept)
    const i0 = Math.max(0, segOf(Math.max(FIRST, yL)) - 1);
    const P: { x: number; y: number; i: number }[] = [];
    let lastX = -1e9;
    for (let i = i0; i < SER.length; i++) {
      const p = SER[i];
      if (p.y > yR) {
        P.push({ x: X(k, yR), y: Yv(k, val(yR)), i: Math.max(0, i - 1) });
        break;
      }
      const x = X(k, p.y);
      if (x - lastX < 0.9 && p.kind !== "p" && i < SER.length - 1) continue;
      P.push({ x, y: Yv(k, p.v), i });
      lastX = x;
    }
    if (P.length > 1) {
      // molten fill under the line
      const base = t < B0 || k.lg > 0.5 ? Yv(k, S.log[0]) : k.bot;
      const g = ctx.createLinearGradient(0, k.top, 0, base);
      g.addColorStop(0, "rgba(255,190,60,0.20)");
      g.addColorStop(1, "rgba(255,190,60,0.0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(P[0].x, base);
      for (const q of P) ctx.lineTo(q.x, q.y);
      ctx.lineTo(P[P.length - 1].x, base);
      ctx.closePath();
      ctx.fill();
      // the line in runs of one tone: a wide glow, the core, and a hot thin highlight on the rises
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      let s = 0;
      while (s < P.length - 1) {
        const col = toneOf(P[s].i);
        let e = s + 1;
        while (e < P.length - 1 && toneOf(P[e].i) === col) e++;
        const path = () => {
          ctx.beginPath();
          ctx.moveTo(P[s].x, P[s].y);
          for (let q = s + 1; q <= e; q++) ctx.lineTo(P[q].x, P[q].y);
        };
        ctx.strokeStyle = col;
        ctx.globalAlpha = alpha * 0.22;
        ctx.lineWidth = 16;
        path();
        ctx.stroke();
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 5.5;
        ctx.shadowColor = col;
        ctx.shadowBlur = 14;
        path();
        ctx.stroke();
        ctx.shadowBlur = 0;
        if (col === GOLD) {
          ctx.globalAlpha = alpha * 0.7;
          ctx.strokeStyle = "#fff4cf";
          ctx.lineWidth = 1.6;
          path();
          ctx.stroke();
          ctx.globalAlpha = alpha;
        }
        s = e;
      }
    }
    // the turning points as dots
    if (k.lg < 0.5)
      for (const q of P) {
        if (SER[q.i].kind !== "p" || q.x < -10 || q.x > W + 10) continue;
        ctx.fillStyle = "#0b0d10";
        ctx.strokeStyle = WHITE;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(q.x, q.y, 6, 0, Math.PI * 2);
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
      if (hit.kind === "crash" || (hit.kind === "split" && hit.big) || (hit.kind === "war" && hit.big)) {
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
    const up = e.pct.startsWith("+") || e.pct.startsWith("×");
    const col = up ? GOLD : e.k === "crash" || e.k === "war" ? RED : ASH;
    ctx.save();
    ctx.globalAlpha = clamp(a);
    const k = camAt(t);
    text(ctx, e.pct, h.x - 34, up ? clamp(h.y - 20, 760, Math.min(k.bot + 40, 1450)) : clamp(h.y + 120, 760, Math.min(k.bot + 40, 1450)), 156 * s, 900, SANS, col, { align: "right", glow: col + "aa", glowBlur: 30, maxW: h.x - 80 });
    ctx.restore();
  };

  // ---------- the title: big in the middle, then it flies into the header
  const INTRO = [S.cold.crashes[S.cold.crashes.length - 1].at + 0.05, S.cold.crashes[S.cold.crashes.length - 1].at + 0.5];
  const drawIntro = (ctx: CanvasRenderingContext2D, t: number, hx: number) => {
    const k = ease(clamp((t - INTRO[0]) / (INTRO[1] - INTRO[0])));
    const big = EN ? 54 : 116; // the English title is long
    const size = big + (30 - big) * k;
    ctx.font = `900 ${size}px ${SERIF}`;
    const w = ctx.measureText(S.brand).width;
    const x = CX - w / 2 + (hx - (CX - w / 2)) * k;
    const y = 560 + (127 - 560) * k;
    const pop = 1 + 0.12 * env(t, 0.05, 0.01, 0.25);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pop, pop);
    text(ctx, S.brand, 0, 0, size, 900, SERIF, GOLD, { ls: EN ? 1 : 2 + 8 * (1 - k), glow: "rgba(255,201,77,0.45)", glowBlur: 30 * (1 - k) });
    ctx.restore();
    if (k < 1) {
      ctx.globalAlpha = 1 - k;
      text(ctx, S.cold.promise ?? "", CX, 630, EN ? 40 : 46, 900, SERIF, "#e8dcc0", { align: "center", ls: EN ? 1 : 6, maxW: 900, glow: "rgba(0,0,0,0.9)", glowBlur: 10 });
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
    const w1 = text(ctx, tr("世界的形状"), 114, 126, 28, 900, SANS, "#f3f4f7", { ls: 2 });
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(114 + w1 + 14, 104, 2, 26);
    if (t >= INTRO[1]) text(ctx, S.brand, 114 + w1 + 30, 127, 30, 900, SERIF, GOLD, { ls: 2 });
    else drawIntro(ctx, t, 114 + w1 + 30);
    const c = k.c;
    const rw = t >= S.cold.rewind[0] && t < B0;
    text(ctx, rw ? S.rewindLabel ?? "倒回……" : S.era(c), 58, 186, 30, 700, SERIF, SOFT, { maxW: 560 });
    // year (and the month once the camera is close)
    const yNum = Math.floor(c + 1e-6);
    let x = 56;
    const blur = Math.min(4, k.sp / 500);
    if (blur > 0.4) ctx.filter = `blur(${blur.toFixed(1)}px)`;
    x += tabular(ctx, String(yNum), x, 300, 116, WHITE);
    ctx.filter = "none";
    const span = (W * 0.5) / k.ppy;
    const mo = Math.min(12, Math.floor((c - yNum) * 12) + 1);
    text(ctx, t >= B0 && span < 40 && yNum >= 1968 ? `年 ${mo} 月` : "年", x + 6, 300, 46, 900, SERIF, WHITE);
    // price
    const v = val(c);
    const slope = val(c) - val(c - Math.max(0.02, span / 200));
    const e = evAt(t);
    const red = e && e.k === "crash" && slope < 0;
    const col = red ? RED : slope < -v * 0.002 ? ASH : GOLD;
    if (!rw) {
      const nw = tabular(ctx, fmtUsd(v), 58, 404, 86, col, { glow: col + "55" });
      text(ctx, "美元 / 盎司", 58 + nw + 10, 404, 34, 900, SERIF, col);
      const rate = cnyAt(c);
      const chips = [S.kindLabel[kindAt(c)]];
      if (rate > 0 && t >= B0) chips.unshift(`≈ ${Math.round((v * rate) / 31.1035).toLocaleString("en-US")} 元/克`);
      let cx0 = 60;
      chips.forEach((chip, i) => {
        const hot = i === 0 && chips.length > 1;
        ctx.font = `${hot ? 900 : 700} ${hot ? 26 : 22}px ${hot ? SANS : SERIF}`;
        const cw = ctx.measureText(chip).width + 24;
        ctx.strokeStyle = hot ? "rgba(255,201,77,0.7)" : "rgba(200,205,210,0.45)";
        ctx.lineWidth = hot ? 1.6 : 1;
        ctx.strokeRect(cx0, 424, cw, 36);
        text(ctx, chip, cx0 + 12, 451, hot ? 26 : 22, hot ? 900 : 700, hot ? SANS : SERIF, hot ? GOLD : "#aeb4ba");
        cx0 += cw + 10;
      });
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
    if (c < (S.tableFrom ?? -1e9) - 0.01) return;
    const rows = S.table(c).filter((r) => r.v > 0);
    const was = S.table(c - (S.tableBack ?? 60));
    const NR = S.tableRows ?? rows.length;
    // live rank: the true rank, averaged over the last 0.3 s, so two countries glide past each other and never overlap
    const rankAt = (tt: number) => {
      const m: Record<string, number> = {};
      S.table!(camAt(Math.max(0, tt)).c)
        .filter((r) => r.v > 0)
        .sort((p, q) => q.v - p.v)
        .forEach((r, i) => (m[r.n] = i));
      return m;
    };
    const RK = Array.from({ length: 8 }, (_, k) => rankAt(t - k * 0.04));
    const pos = rows.map((r) => RK.reduce((s, m) => s + (m[r.n] ?? NR + 1), 0) / RK.length);
    const vmax = Math.max(...rows.map((r) => r.v));
    const vis = clamp((c - (S.tableFrom ?? -1e9)) / 1.5);
    const a = clamp((t - (B0 - 0.3)) / 0.3) * (1 - clamp((t - (END - 0.4)) / 0.4)) * vis;
    if (a <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = a;
    text(ctx, S.tableTitle ?? "各大洲人口", 640, 168, 22, 700, SERIF, MUTED);
    rows.forEach((r, i) => {
      const p = pos[i];
      if (p > NR - 0.02) return;
      ctx.globalAlpha = a * clamp(NR - p); // the last row fades as it drops out
      const y = 214 + p * 50;
      ctx.fillStyle = r.c;
      ctx.fillRect(640, y - 22, 6, 28);
      text(ctx, r.n, 656, y, EN ? 23 : 26, 900, SERIF, WHITE, EN ? { maxW: 118 } : {});
      if (r.tag) {
        ctx.font = `900 26px ${SERIF}`;
        if (r.tag === "*") text(ctx, "*", 660 + ctx.measureText(r.n).width, y + 2, 28, 900, SANS, GOLD);
        else text(ctx, r.tag, 662 + ctx.measureText(r.n).width, y - 2, 16, 700, SANS, MUTED);
      }
      text(ctx, Math.round(r.v).toLocaleString("en-US"), 862, y, 25, 900, SANS, WHITE, { align: "right" });
      const w0 = was.find((x) => x.n === r.n);
      const ch = w0 && w0.v > 1 ? r.v / w0.v - 1 : 0; // no change shown before a country's first report
      if (Math.abs(ch) >= 0.005) {
        const down = ch < 0;
        text(ctx, `${down ? "▼" : "▲"}${Math.abs(ch * 100).toFixed(0)}%`, 946, y, 21, 900, SANS, down ? RED : GOLD, { align: "right" });
      }
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(656, y + 9, 290, 4);
      ctx.fillStyle = r.c;
      ctx.fillRect(656, y + 9, 290 * (r.v / vmax), 4);
    });
    const note = S.tableNote?.(c);
    if (note) {
      ctx.globalAlpha = a;
      text(ctx, note, 640, 214 + NR * 50 - 6, 17, 500, SANS, MUTED, { maxW: 306 });
    }
    ctx.restore();
  };

  // ---------- swing ticks: every turning point the head passes gets its change from the last turn measured on the chart
  const PCT_YEARS = EV.filter((e) => e.pct).map((e) => e.y);
  const PIV = SER.map((p, i) => (p.kind === "p" ? i : -1)).filter((i) => i >= 0);
  const drawTicks = (ctx: CanvasRenderingContext2D, t: number) => {
    if (t < B0 || t >= END) return;
    const k = camAt(t);
    if (k.lg > 0.05) return;
    const c = k.c;
    ctx.save();
    let lastX = 1e9;
    for (let q = PIV.length - 1; q >= 1; q--) {
      const i = PIV[q];
      const p = SER[i];
      if (p.y > c + 1e-6) continue;
      const pr = SER[PIV[q - 1]];
      const ch = p.v / pr.v - 1;
      if (Math.abs(ch) < 0.1) continue;
      if (PCT_YEARS.some((y) => Math.abs(y - p.y) < 0.4)) continue;
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
      ctx.globalAlpha = a * clamp((x - 12 - measure(ctx, lab, 30 * pop, 900, SANS) - 40) / 30); // gone before it leaves the safe area
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
    if (EN) {
      // English: break at the space nearest the middle
      let best = -1;
      for (let i = 0; i < s.length; i++) if (s[i] === " " && (best < 0 || Math.abs(i - s.length / 2) < Math.abs(best - s.length / 2))) best = i;
      if (best > 0) return [s.slice(0, best), s.slice(best + 1)];
    }
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
    const bottom = Math.min(k.bot + 40, 1450); // stay above the caption zone
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
    const lab = KIND_LABEL[e.k];
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
    ctx.fillRect(FULL[0], 650, FULL[2], 360);
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
    const d = t - e.t0;
    const life = e.t1 - e.t0;
    const a = clamp(d / 0.06) * clamp((life - d) / 0.15) * (0.75 + 0.25 * Math.sin(t * 12));
    ctx.save();
    const fcx = (W / 2 - LX) / LS;
    const fcy = (H / 2 - LY) / LS;
    const g = ctx.createRadialGradient(fcx, fcy, (H * 0.3) / LS, fcx, fcy, (H * 0.75) / LS);
    g.addColorStop(0, "rgba(120,0,0,0)");
    g.addColorStop(1, gold ? `rgba(150,105,10,${0.42 * a})` : plague ? `rgba(70,74,80,${0.6 * a})` : `rgba(150,8,4,${0.55 * a})`);
    ctx.fillStyle = g;
    ctx.fillRect(...FULL);
    ctx.globalAlpha = a;
    ctx.strokeStyle = gold ? "rgba(255,201,77,0.9)" : plague ? "rgba(210,215,220,0.85)" : "rgba(255,70,55,0.9)";
    ctx.lineWidth = 3;
    const FB = Math.min(camAt(t).bot + 70, 1460);
    ctx.strokeRect(44, 540, SAFE_R - 48, FB - 540);
    ctx.lineWidth = 7;
    const L = 46;
    for (const [x, y, sx, sy] of [[44, 540, 1, 1], [SAFE_R - 4, 540, -1, 1], [44, FB, 1, -1], [SAFE_R - 4, FB, -1, -1]] as const) {
      ctx.beginPath();
      ctx.moveTo(x, y + sy * L);
      ctx.lineTo(x, y);
      ctx.lineTo(x + sx * L, y);
      ctx.stroke();
    }
    ctx.fillStyle = gold ? "rgba(255,201,77,0.95)" : plague ? "rgba(210,215,220,0.95)" : "rgba(255,59,47,0.95)";
    const lab = gold ? "金价暴涨" : plague ? "" : e.k === "crash" ? "金价暴跌" : e.k === "split" ? "脱钩" : "战争";
    ctx.font = `900 26px ${SERIF}`;
    const lw = ctx.measureText(lab).width + 44;
    ctx.fillRect(CX - lw / 2, 522, lw, 38);
    text(ctx, lab, CX, 550, 26, 900, SERIF, plague || gold ? "#111" : "#fff", { align: "center" });
    ctx.restore();
  };
  const drawFlash = (ctx: CanvasRenderingContext2D, t: number) => {
    for (const h of HITS) {
      const d = t - h.t;
      if (d < 0 || d > 0.25) continue;
      const gf = h.big && (h.kind === "peak" || h.kind === "unite" || h.kind === "grow");
      if (!(gf || h.kind === "crash" || (h.big && (h.kind === "war" || h.kind === "split")))) continue;
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
      ctx.fillRect(FULL[0], VY0 + r() * (VY1 - VY0), FULL[2], 3 + r() * 26);
    }
    ctx.globalAlpha = a;
    const jx = (r() - 0.5) * 8;
    // ◀◀
    ctx.fillStyle = WHITE;
    for (const ox of [0, 62]) {
      ctx.beginPath();
      ctx.moveTo(CX - 160 + ox + jx, 455);
      ctx.lineTo(CX - 100 + ox + jx, 420);
      ctx.lineTo(CX - 100 + ox + jx, 490);
      ctx.closePath();
      ctx.fill();
    }
    text(ctx, tr("倒回"), CX + 10 + jx, 482, 72, 900, SERIF, WHITE, { glow: "rgba(150,200,255,0.8)", glowBlur: 20 });
    const yNow = Math.max(Math.floor(FIRST), Math.floor(CUR(t)));
    text(ctx, `${yNow} 年`, CX + jx, 560, 44, 900, SANS, "#cfe6ff", { align: "center", glow: "rgba(0,0,0,0.9)", glowBlur: 10 });
    ctx.restore();
  };
  const drawSource = (ctx: CanvasRenderingContext2D, t: number) => {
    if (!S.src || t < B0 - 0.2 || t >= OUT) return;
    const c = camAt(t).c;
    const e = evAt(t);
    let line = tr("数据：") + S.src(t >= END ? LAST_REAL : c);
    if (t >= END) line = S.srcEnd ?? "数据：正史户口、学者估算（葛剑雄、吴松弟、曹树基等）、国家统计局、联合国预测";
    else if (e?.src) line += "　｜　" + e.src;
    const a = clamp((t - (B0 - 0.2)) / 0.3);
    ctx.save();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const g = ctx.createLinearGradient(0, 1800, 0, H);
    g.addColorStop(0, "rgba(4,5,7,0)");
    g.addColorStop(1, `rgba(4,5,7,${0.8 * a})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 1800, W, H - 1800);
    ctx.restore();
    ctx.globalAlpha = a * 0.85;
    text(ctx, line, 40, (1430 - LY) / LS, 25, 500, SERIF, "#b3b9bf", { maxW: 960, glow: "rgba(0,0,0,0.95)", glowBlur: 8 });
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
      const above = false; // below the point: the title and its promise own the space above
      text(ctx, c.t, x + dx, above ? y - 76 * rs : y + 44 * rs, 28 * rs, 900, SERIF, isNew ? WHITE : cc, { align: "center", glow: "rgba(0,0,0,0.95)", glowBlur: 10 });
      if (c.p) text(ctx, c.p, x + dx, above ? y - 38 * rs : y + 80 * rs, 30 * rs, 900, SANS, cc, { align: "center", glow: "rgba(0,0,0,0.95)", glowBlur: 10 });
    });
    // where it starts and where it is now
    {
      const xs = X(k, FIRST);
      const ys = Yv(k, val(FIRST));
      ctx.globalAlpha = fadeOut;
      text(ctx, S.cold.start ?? "", xs - 4, ys - 74, 24, 700, SERIF, SOFT);
      text(ctx, `${fmtUsd(val(FIRST))} 美元`, xs - 4, ys - 34, 36, 900, SANS, WHITE, { glow: "rgba(0,0,0,0.9)", glowBlur: 8 });
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
        text(ctx, `${fmtUsd(val(LAST_REAL))} 美元`, 0, 0, 54, 900, SANS, GOLD, { align: "right", glow: "rgba(255,201,77,0.6)", glowBlur: 20 });
        ctx.restore();
        text(ctx, `${Math.floor(LAST_REAL)} 年`, Math.min(xe + 36, SAFE_R), ye + 108, 26, 700, SERIF, SOFT, { align: "right" });
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
      const x0 = 72;
      ctx.save();
      ctx.translate(x0 + wn / 2, 1440);
      ctx.scale(pop, pop);
      const cc2 = c.tone === "red" ? RED : GOLD;
      text(ctx, num, -wn / 2, 0, 210, 900, SANS, cc2, { glow: cc2 + "b0", glowBlur: 30 });
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
      ctx.translate(CX, 545);
      ctx.scale(s, s);
      text(ctx, L.a, 0, 0, 84, 900, SERIF, col, { align: "center", maxW: 860 / s, glow: "rgba(0,0,0,0.9)", glowBlur: 16 });
      ctx.restore();
      if (L.b) {
        const tb = L.t0 + (L.bBeats ?? 2) * 0.4654;
        if (t >= tb) {
          const s2 = 1 + 0.25 * env(t, tb, 0.01, 0.1);
          ctx.save();
          ctx.translate(CX, 618);
          ctx.scale(s2, s2);
          text(ctx, L.b, 0, 0, 52, 900, SERIF, WHITE, { align: "center", maxW: 860 / s2, glow: "rgba(0,0,0,0.9)", glowBlur: 12 });
          ctx.restore();
        }
      }
    }
    ctx.restore();
  };

  // ---------- the dynasties under the whole line: rise and fall at a glance
  const RIB_Y = 1340;
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
    const CR = S.ending.credits;
    const credA = CR ? clamp((t - CR.t0) / 0.5) : 0;
    ctx.save();
    ctx.globalAlpha = 1 - Math.max(cardA, credA);
    S.ending.troughs.forEach((tr, i) => {
      const ta = END + 0.3 + i * 0.4654;
      if (t < ta) return;
      const x = X(k, tr.y);
      const y = Yv(k, val(tr.y));
      const s = 1 + 0.5 * env(t, ta, 0.01, 0.1);
      const tc = tr.tone === "gold" ? GOLD : RED;
      ctx.fillStyle = tc;
      ctx.beginPath();
      ctx.arc(x, y, 7 * s, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, tr.t, x + (tr.dx ?? 0), y + (tr.dy ?? (tr.tone === "gold" ? -24 : 46)), 28 * s, 900, SERIF, WHITE, { align: "center", glow: "rgba(0,0,0,0.9)", glowBlur: 8 });
    });
    // the turn now
    const turnY = LAST_REAL;
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
      ctx.translate(CX, L.brush ? 520 : 470);
      ctx.scale(s, s);
      if (L.brush && EN) L.text.split("\n").forEach((ln, i, all) => text(ctx, ln, 0, (i - (all.length - 1) / 2) * 92, 78, 900, SERIF, col, { align: "center", maxW: 900, glow: col + "88", glowBlur: 26 }));
      else if (L.brush) text(ctx, L.text, 0, 0, 132, 400, BRUSH, col, { align: "center", maxW: 900, glow: col + "88", glowBlur: 30 });
      else text(ctx, L.text, 0, 0, 72, 900, SERIF, col, { align: "center", maxW: 900, glow: "rgba(0,0,0,0.9)", glowBlur: 14 });
      ctx.restore();
      if (L.text2) {
        const t2 = L.t0 + 4 * 0.4325;
        if (t >= t2) {
          ctx.globalAlpha = a * clamp((t - t2) / 0.1);
          text(ctx, L.text2, CX, 560, 50, 900, SERIF, SOFT, { align: "center", maxW: 900 });
        }
      }
    }
    ctx.restore();
    // sources page (names only)
    if (CR && credA > 0 && cardA < 1) {
      ctx.save();
      ctx.globalAlpha = credA * (1 - cardA);
      ctx.fillStyle = "rgba(5,6,8,0.92)";
      ctx.fillRect(...FULL);
      text(ctx, CR.title ?? "信息来源", CX, 640, 44, 900, SERIF, GOLD, { align: "center", ls: 6 });
      CR.lines.forEach((ln, i) => text(ctx, ln, CX, 740 + i * 64, 33, 700, SERIF, SOFT, { align: "center", maxW: 880 }));
      ctx.restore();
    }
    // end card
    if (cardA > 0) {
      ctx.save();
      ctx.globalAlpha = cardA;
      ctx.fillStyle = S.ending.slogan ? "rgba(5,6,8,1)" : "rgba(5,6,8,0.85)";
      ctx.fillRect(...FULL);
      const logo = IMGS["mark-disc.png"];
      if (logo) ctx.drawImage(logo, CX - 70, 760, 140, 140);
      text(ctx, tr("世界的形状"), CX, 990, 64, 900, SANS, WHITE, { align: "center", ls: 6 });
      if (S.ending.slogan) {
        // the standard card (films/DIRECTOR.md): mark, name, slogan, maker at the bottom
        text(ctx, S.ending.slogan, CX, 1066, 40, 700, SERIF, SOFT, { align: "center", ls: 8 });
        if (S.ending.maker) text(ctx, S.ending.maker, CX, (1400 - LY) / LS, 30, 700, SANS, MUTED, { align: "center", ls: 2 });
      } else text(ctx, S.brand, CX, 1066, 40, 900, SERIF, GOLD, { align: "center", ls: 4 });
      ctx.restore();
    }
  };
  const drawEndingQuestion = (ctx: CanvasRenderingContext2D, t: number) => {
    // the final question stays over the end card
    const L = S.ending.lines[S.ending.lines.length - 1];
    if (t < S.ending.card || !L.brush || S.ending.credits) return; // with a sources page the line has already left
    ctx.save();
    ctx.globalAlpha = 1;
    text(ctx, L.text, CX, 520, 132, 400, BRUSH, GOLD, { align: "center", maxW: 900, glow: GOLD + "88", glowBlur: 30 });
    ctx.restore();
  };

  // ---------- gold dust: slow motes drifting up through the dark, brighter while the price climbs
  const DUST = (() => {
    const r = rng(77);
    return Array.from({ length: 70 }, () => ({ x: r() * W, y: r() * H, s: 0.6 + r() * 2.2, v: 6 + r() * 22, ph: r() * 6.28, f: 0.4 + r() * 1.6 }));
  })();
  const drawDust = (ctx: CanvasRenderingContext2D, t: number) => {
    const k = camAt(t);
    const v = val(k.c);
    const rising = clamp((v / Math.max(1, val(k.c - 0.5)) - 1) * 8, 0, 1);
    ctx.save();
    for (const d of DUST) {
      const y = (((d.y - t * d.v) % H) + H) % H;
      const x = d.x + 14 * Math.sin(t * 0.3 + d.ph);
      const tw = 0.5 + 0.5 * Math.sin(t * d.f + d.ph);
      ctx.globalAlpha = (0.08 + 0.22 * tw) * (0.6 + 0.6 * rising);
      ctx.fillStyle = "#ffd77a";
      ctx.beginPath();
      ctx.arc(x, y, d.s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  // ---------- the stage
  let BUF: HTMLCanvasElement | null = null;
  let CBUF: HTMLCanvasElement | null = null;
  const draw = (ctx: CanvasRenderingContext2D, t: number) => {
    if (!BUF) {
      BUF = document.createElement("canvas");
      BUF.width = W;
      BUF.height = H;
    }
    if (!CBUF) {
      CBUF = document.createElement("canvas");
      CBUF.width = W;
      CBUF.height = H;
    }
    const b = BUF.getContext("2d")!;
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.clearRect(0, 0, W, H);
    drawDust(b, t);
    b.setTransform(LS, 0, 0, LS, LX, LY);
    drawFloor(b, t);
    const cb = CBUF.getContext("2d")!;
    cb.setTransform(1, 0, 0, 1, 0, 0);
    cb.clearRect(0, 0, W, H);
    cb.setTransform(LS, 0, 0, LS, LX, LY);
    const chartA = 1 - clamp((t - (OUT - 0.2)) / 0.8);
    drawChart(cb, t, chartA);
    drawRibbon(cb, t, chartA);
    drawStreaks(cb, t);
    drawHead(cb, t, chartA);
    drawTicks(cb, t);
    drawHits(cb, t);
    drawCold(cb, t);
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.globalAlpha = 1;
    b.drawImage(CBUF, 0, 0);
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
    ctx.transform(LS, 0, 0, LS, LX, LY);
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
  return { draw, frames: Math.round(DUR * FPS), CUR, val, evAt, HITS };
};

// =====================================================================================================================
export const EngineG: React.FC<{ film: ReturnType<typeof createFilm>; audio: string }> = ({ film, audio }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const [handle] = useState(() => delayRender("gold fonts + images", { timeoutInMilliseconds: 180000 }));
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
    <AbsoluteFill style={{ background: "#060504", overflow: "hidden" }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 100% 60% at 50% 45%, #18130b 0%, #060504 72%)" }} />
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
