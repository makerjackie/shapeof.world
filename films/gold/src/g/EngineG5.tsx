// EngineG5: v3's EngineG (header numbers, reserves table, the price line with its head at 40%, cards on the beats,
// the ounce + one-dollar-bill floor), re-cut for v5:
//  - cold open on a fixed 2001-2026 window: the title fills the frame, the line rockets through six highs, fireworks,
//    a crash with lightning, the question, then the rewind morphs into the whole line
//  - the camera serves the event: crises zoom in to daily candles (gold up / red down), big views pull out with the
//    old high drawn across ("较前高 −70%，7,697 天"), the day it is beaten flashes 解套
//  - own effects per event: lightning, glass shatter (2008), fireworks (new highs), red frame (market shut),
//    bill rain (money printing), icons (oil, ETF, virus, lock, stamp, rates, central bank, exchange)
//  - 1792-1971 in black and white with the gold line in colour; nails hold the line on the legal price; at Nixon
//    the nails pop and colour floods out from the head
import React, { useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, Audio, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { BRUSH, SANS, SERIF, fontsReady } from "./fonts6";
import type { Pt, Spec } from "./specG";
import { revealOf } from "./reveal7";
import OHLC_RAW from "./gold5_ohlc.json";
import { BW_UNTIL, COLD5, PEGS, WIRES, fwBursts } from "./gold5";
import type { Icon, P5 } from "./gold5";

const OH = OHLC_RAW as unknown as [number, number, number, number, number][]; // year, open, high, low, close

const W = 1080;
const SAFE_R = 1010;
const H = 1920;
const LS = 0.9;
const LX = 60 - 40 * LS;
const LY = 200 - 88 * LS;
const VX0 = -LX / LS;
const VX1 = (W - LX) / LS;
const VY0 = -LY / LS;
const VY1 = (H - LY) / LS;
const CX = 529;
const FULL = [VX0 - 80, VY0 - 80, VX1 - VX0 + 160, VY1 - VY0 + 160] as const;
const FPS = 30;

// ---------------- palette
const GOLD = "#ffc94d";
const RED = "#ff3b2f";
const ASH = "#d8dde0";
const WHITE = "#f6f7f8";
const MUTED = "#9aa0a6";
const SOFT = "#c4c9cd";

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
const fmtUsd = (v: number) => (v < 100 ? v.toFixed(2) : Math.round(v).toLocaleString("en-US"));
const toneCol = (tone: string) => (tone === "gold" ? GOLD : tone === "red" ? RED : tone === "ash" ? ASH : WHITE);
const MONTH_DAYS = (yr: number) => {
  const leap = (yr % 4 === 0 && yr % 100 !== 0) || yr % 400 === 0;
  return [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
};
// the data's year fraction -> [year, month, day] (the last day already reached)
const ymd = (y: number): [number, number, number] => {
  const yr = Math.floor(y + 1e-9);
  const ml = MONTH_DAYS(yr);
  const n = ml.reduce((s, x) => s + x, 0);
  let d = Math.floor((y - yr) * n + 0.01);
  let m = 0;
  while (m < 11 && d >= ml[m]) {
    d -= ml[m];
    m++;
  }
  return [yr, m + 1, d + 1];
};

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
const rrect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

// ---------------- icons: line glyphs on a dark badge (100-unit box), p = entrance 0..1
const drawIcon = (ctx: CanvasRenderingContext2D, name: Icon, cx: number, cy: number, s: number, p: number, col: string) => {
  const pop = 1 + 0.5 * (1 - eo3(p / 0.5));
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s * pop, s * pop);
  ctx.globalAlpha *= clamp(p / 0.12);
  // badge
  ctx.fillStyle = "rgba(12,12,14,0.88)";
  ctx.beginPath();
  ctx.arc(0, 0, 56, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = col;
  ctx.globalAlpha *= 1;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // entrance ring
  if (p < 1) {
    const a0 = ctx.globalAlpha;
    ctx.globalAlpha = a0 * (1 - eo3(p));
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 56 + 70 * eo3(p), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = a0;
  }
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.shadowColor = col;
  ctx.shadowBlur = 14;
  const line = (pts: number[][]) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  };
  if (name === "oil") {
    rrect(ctx, -24, -32, 48, 66, 9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-24, -11);
    ctx.quadraticCurveTo(0, -5, 24, -11);
    ctx.moveTo(-24, 12);
    ctx.quadraticCurveTo(0, 18, 24, 12);
    ctx.stroke();
    ctx.fillRect(4, -40, 12, 7);
    // a drop
    ctx.beginPath();
    ctx.moveTo(36, -2);
    ctx.quadraticCurveTo(44, 12, 36, 18);
    ctx.quadraticCurveTo(28, 12, 36, -2);
    ctx.fill();
  } else if (name === "etf") {
    rrect(ctx, -44, -24, 88, 48, 10);
    ctx.stroke();
    ctx.shadowBlur = 0;
    text(ctx, "GLD", 0, 12, 32, 900, SANS, col, { align: "center" });
    line([[-30, -36], [-10, -44], [8, -40], [30, -50]]);
  } else if (name === "virus") {
    ctx.beginPath();
    ctx.arc(0, 0, 19, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.2;
      line([[Math.cos(a) * 19, Math.sin(a) * 19], [Math.cos(a) * 32, Math.sin(a) * 32]]);
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 37, Math.sin(a) * 37, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(-6, -4, 4, 0, Math.PI * 2);
    ctx.arc(7, 6, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (name === "lock") {
    const drop = 16 * (1 - eo3((p - 0.3) / 0.25));
    ctx.beginPath();
    ctx.moveTo(-17, -4 - drop);
    ctx.lineTo(-17, -18 - drop);
    ctx.arc(0, -18 - drop, 17, Math.PI, 0);
    ctx.lineTo(17, -4 - drop);
    ctx.stroke();
    rrect(ctx, -28, -6, 56, 42, 7);
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(0, 11, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-2.5, 12, 5, 13);
  } else if (name === "stamp") {
    const slam = 1 + 0.9 * (1 - eo3(p / 0.22));
    ctx.rotate(-0.2);
    ctx.scale(slam, slam);
    ctx.lineWidth = 4;
    rrect(ctx, -46, -27, 92, 54, 6);
    ctx.stroke();
    ctx.lineWidth = 2;
    rrect(ctx, -40, -21, 80, 42, 4);
    ctx.stroke();
    ctx.shadowBlur = 0;
    text(ctx, "AA+", 0, 13, 36, 900, SANS, col, { align: "center" });
  } else if (name === "rateUp" || name === "rateDown") {
    ctx.shadowBlur = 10;
    text(ctx, "%", -10, 24, 70, 900, SANS, col, { align: "center" });
    const up = name === "rateUp";
    line([[30, up ? 26 : -28], [30, up ? -26 : 24]]);
    line(up ? [[19, -14], [30, -28], [41, -14]] : [[19, 12], [30, 26], [41, 12]]);
  } else if (name === "vault") {
    ctx.beginPath();
    ctx.moveTo(-40, -14);
    ctx.lineTo(0, -38);
    ctx.lineTo(40, -14);
    ctx.closePath();
    ctx.stroke();
    for (const x of [-26, -9, 9, 26]) line([[x, -6], [x, 20]]);
    line([[-40, 28], [40, 28]]);
    ctx.lineWidth = 4;
    line([[-46, 36], [46, 36]]);
  } else if (name === "exchange") {
    const bar = (dy: number, w: number) => {
      ctx.beginPath();
      ctx.moveTo(-w, dy + 12);
      ctx.lineTo(w, dy + 12);
      ctx.lineTo(w - 9, dy - 8);
      ctx.lineTo(-w + 9, dy - 8);
      ctx.closePath();
      ctx.stroke();
    };
    bar(18, 38);
    bar(-10, 26);
  }
  ctx.restore();
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
export const createFilm5 = (S: Spec) => {
  const tr = (s: string) => s;
  const DUR = S.music.dur;
  const NF = Math.ceil(DUR * FPS) + 2;
  const EV = S.events as P5[];
  const [B0] = S.body;
  const END = S.ending.t0;
  const OUT = S.ending.credits?.t0 ?? S.ending.card;
  const SER = S.series;
  const FIRST = SER[0].y;
  const LAST = SER[SER.length - 1].y;
  const BEATS = S.music.beats;
  const LAST_REAL = LAST;
  const SPAN_ALL = (LAST - FIRST) * 1.06;
  const NIX = EV.find((e) => e.fx?.includes("snap"))!;

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
  const ohIdx = (y: number) => {
    let lo = 0;
    let hi = OH.length;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (OH[m][0] < y) lo = m + 1;
      else hi = m;
    }
    return lo;
  };
  const kindAt = (y: number): Pt["kind"] => (y < 1967.99 ? "a" : y < 2000.66 ? "m" : "d");
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
  const evAt = (t: number): P5 | null => {
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
  const CK = COLD5.keys;
  const coldCur = (t: number) => {
    if (t <= CK[0][0]) return CK[0][1];
    for (let i = 1; i < CK.length; i++) {
      if (t <= CK[i][0]) {
        const [ta, ya] = CK[i - 1];
        const [tb, yb] = CK[i];
        const x = (t - ta) / (tb - ta);
        return ya + (yb - ya) * Math.pow(x, 1.3);
      }
    }
    return CK[CK.length - 1][1];
  };
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
  const RWM = RW0 + 0.42 * (RW1 - RW0); // the cold window has morphed into the whole line by here
  const Y_RW = CK[CK.length - 1][1];
  const rewindCur = (t: number) => {
    const k = clamp((t - RW0) / (RW1 - RW0));
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    return Y_RW - (Y_RW - FIRST) * e;
  };
  const CUR = (t: number) => (t < RW0 ? coldCur(t) : t < RW1 ? rewindCur(t) : t < B0 ? FIRST : t >= END ? EV[EV.length - 1].y : bodyCur(t));

  // ---------- mapping: the body (head at 40%), the log overview (lg), the cold window (cw)
  const HX_BODY = 0.4 * W;
  type Cam = { c: number; cx: number; ppy: number; hxw: number; lo: number; hi: number; top: number; bot: number; lg: number; sp: number; lgCold: number; cw: number; ca: number; span: number };
  const CWX0 = 70;
  const CWX1 = SAFE_R - 56;
  const CWT = 640;
  const CWB = 1330;
  const L0 = Math.log10(S.log[0]);
  const L1 = Math.log10(S.log[1]);
  const X = (k: Cam, y: number) => {
    let xb = k.hxw - (k.cx - y) * k.ppy;
    if (k.lg > 0) {
      const xe = 70 + ((y - FIRST) / (LAST - FIRST)) * (SAFE_R - 50 - 70);
      xb = xb + (xe - xb) * ease(k.lg);
    }
    if (k.cw > 0) {
      const xc = CWX0 + ((y - COLD5.win[0]) / (COLD5.win[1] - COLD5.win[0])) * (CWX1 - CWX0);
      xb = xb + (xc - xb) * ease(k.cw);
    }
    return xb;
  };
  const Yv = (k: Cam, v: number) => {
    let yl = k.bot - ((v - k.lo) / (k.hi - k.lo)) * (k.bot - k.top);
    if (k.lg > 0) {
      const top = k.lgCold ? 660 : 640;
      const bot = k.lgCold ? 1000 : 1255;
      const yg = bot - ((Math.log10(Math.max(v, S.log[0])) - L0) / (L1 - L0)) * (bot - top);
      yl = yl + (yg - yl) * ease(k.lg);
    }
    if (k.cw > 0) {
      const yc = CWB - (v / COLD5.vmax) * (CWB - CWT);
      yl = yl + (yc - yl) * ease(k.cw);
    }
    return yl;
  };
  const CAM: Cam[] = [];
  {
    const SPAN0 = EV[0].span ?? 60;
    let span = SPAN0;
    let lo = 0;
    let hi = 1;
    let lgK = 0;
    let prevX = 0;
    let prevY = 0;
    for (let f = 0; f < NF; f++) {
      const t = f / FPS;
      const c = CUR(t);
      let target = span;
      if (t < RW1) target = SPAN_ALL;
      else if (t < B0) {
        const k = ease(clamp((t - RW1) / (B0 - RW1)));
        target = Math.exp(Math.log(SPAN_ALL) * (1 - k) + Math.log(SPAN0) * k);
      } else {
        let cur: P5 | null = null;
        for (let i = 0; i < EV.length && EV[i].t0 <= t; i++) {
          if (EV[i].span) target = EV[i].span!;
          cur = EV[i];
        }
        // close-ups keep pushing in while the days crawl by
        if (cur && target < 1 && t < END) target *= Math.exp(-0.3 * clamp((t - cur.t0) / (cur.t1 - cur.t0)));
      }
      span = t < B0 ? target : Math.exp(Math.log(span) + (Math.log(target) - Math.log(span)) * 0.09);
      const cold = t < RW1;
      const rw = t >= RW1 && t < B0 ? clamp((t - RW1) / (B0 - RW1)) : t >= B0 ? 1 : 0;
      const cx = cold ? LAST : c;
      const hxw = cold ? 1012 : 1012 + (HX_BODY - 1012) * ease(rw);
      const ppy = cold ? 952 / (LAST - FIRST) : (W * 0.5) / span;
      // visible range; a close-up keeps the real swing big, an event can ask to keep an old high in frame
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
      const e = t >= B0 && t < END ? (() => {
        let lo2 = 0;
        for (let q = 0; q < EV.length && EV[q].t0 <= t; q++) lo2 = q;
        return EV[lo2];
      })() : null;
      if (e?.fit) mx = Math.max(mx, e.fit * 1.03);
      const kk = c < 1968 ? 1.0 : clamp(0.035 + 0.03 * span, 0.05, 0.45);
      const r = Math.max(mx - mn, mx * kk);
      const tlo = Math.max(0, mn - 0.3 * r);
      const thi = mx + 0.14 * r;
      if (f === 0 || t < B0 + 0.05) {
        lo = tlo;
        hi = thi;
      } else {
        lo += (tlo - lo) * (tlo < lo ? 0.12 : 0.16);
        hi += (thi - hi) * (thi > hi ? 0.3 : 0.08);
      }
      lgK = t < RW1 ? 1 : t < B0 ? 1 - ease(clamp((t - RW1) / (B0 - RW1))) : lgK + ((t >= END ? 1 : 0) - lgK) * 0.09;
      const cw = t < RW0 ? 1 : t < RWM ? 1 - ease((t - RW0) / (RWM - RW0)) : 0;
      const pxd = ppy / 365.25;
      const ca = t >= B0 && t < END && lgK < 0.05 && c > 2000.7 ? clamp((pxd - 1.8) / 1.6) : 0;
      const k: Cam = { c, cx, ppy, hxw, lo, hi, top: 610, bot: 1010, lg: lgK, sp: 0, lgCold: t < B0 ? 1 : 0, cw, ca, span };
      const hx = X(k, c);
      const hy = Yv(k, val(c));
      k.sp = f === 0 ? 0 : Math.hypot(hx - prevX, hy - prevY) * FPS;
      prevX = hx;
      prevY = hy;
      CAM.push(k);
    }
  }
  const camAt = (t: number) => CAM[clamp(Math.round(t * FPS), 0, CAM.length - 1)];
  const headAt = (t: number) => {
    const k = camAt(t);
    return { x: X(k, k.c), y: Yv(k, val(k.c)) };
  };

  // ---------- hits (one per event + the cold-open highs and the crash)
  type Hit = { t: number; kind: string; big: boolean; tone: string; e?: P5; fw?: boolean };
  const HITS: Hit[] = [
    ...COLD5.marks.map((m) => ({ t: m.at, kind: "mile", big: !!m.top, tone: "gold", fw: !!m.top })),
    { t: COLD5.crash.at, kind: "crash", big: true, tone: "red" },
    ...EV.map((e) => ({ t: e.t0, kind: e.k, big: !!e.big, tone: KIND_TONE[e.k], e, fw: !!e.fx?.some((f) => f === "fw" || f === "fwBig") })),
  ];
  const shakeAt = (t: number) =>
    HITS.reduce((m, h) => {
      if (t < h.t - 0.05 || t > h.t + 1.5) return m;
      const sh = h.e?.fx?.includes("shatter") ? 1.2 : 0;
      const k = Math.max(sh, h.kind === "mile" ? (h.big ? 0.55 : 0.3) : h.kind === "crash" ? (h.big ? 1 : 0.6) : h.kind === "war" ? (h.big ? 0.8 : 0.4) : h.kind === "split" ? (h.big ? 0.9 : 0.5) : h.kind === "peak" || h.kind === "unite" ? (h.big ? 0.45 : 0.25) : h.kind === "turn" ? 0.2 : 0.12);
      return Math.max(m, k * env(t, h.t, 0.02, h.big ? 0.32 : 0.2));
    }, 0);

  // ---------- black and white: before Nixon (the gold line keeps its colour), and the first weeks of the pandemic
  const GR = new Float32Array(NF);
  {
    let g = 0;
    for (let f = 0; f < NF; f++) {
      const t = f / FPS;
      const c = CAM[f].c;
      let target = t >= RW0 && t < END && t < NIX.t0 && c < BW_UNTIL - 1e-4 ? 1 : 0;
      for (const e of EV) if (e.fx?.includes("bw") && t >= e.t0 && t < e.t1 - 0.2) target = 0.92;
      g += (target - g) * (1 - Math.exp(-1 / FPS / (target > g ? 0.1 : 0.22)));
      if (t >= NIX.t0 && t < NIX.t0 + 0.75) g = 1;
      else if (t >= NIX.t0 + 0.75 && t < NIX.t0 + 0.8) g = 0;
      GR[f] = g;
    }
  }
  const gradeAt = (t: number) => GR[clamp(Math.round(t * FPS), 0, NF - 1)];

  // ---------- the floor: one ounce of gold, and the one-dollar bills it takes to buy it (1 icon = 10 bills)
  const FL = { x0: 262, x1: SAFE_R, y0: 1088, y1: 1414, iw: 21, ih: 10, gx: 4, gy: 4 };
  const COLS = Math.floor((FL.x1 - FL.x0 + FL.gx) / (FL.iw + FL.gx));
  const ROWS = Math.floor((FL.y1 - FL.y0 + FL.gy) / (FL.ih + FL.gy));
  const BILLS = new Float32Array(NF);
  for (let f = 0; f < NF; f++) BILLS[f] = val(CAM[f].c) / 10;
  const floorOn = (t: number) => (t < B0 - 0.5 ? 0 : t >= END ? 1 - clamp((t - END) / 0.5) : clamp((t - (B0 - 0.5)) / 0.5));
  const beatPulse = (t: number) => {
    let m = 0;
    for (const b of BEATS) {
      if (b.t > t) break;
      m = Math.max(m, env(t, b.t, 0.01, 0.12) * (b.down ? 1 : 0.5));
    }
    return m;
  };
  const ingot = (ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, shine: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s, s);
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
          const k = clamp((i - was) / Math.max(1, fresh));
          y -= 26 * k * k * k;
          fill = k > 0.5 ? "#e9c45a" : "#9fbf6a";
          edge = "rgba(255,240,190,0.9)";
        }
      } else {
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
  const segTone = (a: Pt) => toneOf(SER.indexOf(a));
  const drawCandles = (ctx: CanvasRenderingContext2D, k: Cam, yL: number, yR: number, alpha: number) => {
    const pxd = k.ppy / 365.25;
    const bw = clamp(pxd * 1.45 * 0.64, 2, 20);
    ctx.save();
    for (let i = Math.max(0, ohIdx(yL) - 1); i < OH.length; i++) {
      const [y, o, h, l, c] = OH[i];
      if (y > yR + 1e-6) break;
      const x = X(k, y);
      if (x < -30) continue;
      if (x > W + 30) break;
      const up = c >= o;
      const col = up ? GOLD : RED;
      const yo = Yv(k, o);
      const yc = Yv(k, c);
      const yh = Yv(k, h);
      const yl = Yv(k, l);
      const fresh = clamp(1 - (k.c - y) * 365.25 / 1.2);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 6 + 14 * fresh;
      ctx.fillRect(x - 1.2, yh, 2.4, Math.max(1, yl - yh));
      ctx.fillRect(x - bw / 2, Math.min(yo, yc), bw, Math.max(2.5, Math.abs(yc - yo)));
      if (fresh > 0.02) {
        ctx.globalAlpha = alpha * fresh * 0.5;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x - bw / 2, Math.min(yo, yc), bw, Math.max(2.5, Math.abs(yc - yo)));
      }
    }
    ctx.restore();
  };
  // the dates under a close-up: month starts and the 15th
  const drawDates = (ctx: CanvasRenderingContext2D, k: Cam, yL: number, yR: number, alpha: number) => {
    const pxd = k.ppy / 365.25;
    const mid = pxd * 14 > 120;
    ctx.save();
    ctx.globalAlpha = alpha;
    let lastX = -1e9;
    let pm = -1;
    let pmid = -1;
    for (let i = Math.max(0, ohIdx(yL - 0.1)); i < OH.length; i++) {
      const y = OH[i][0];
      if (y > yR + 0.05) break;
      const [, m, d] = ymd(y);
      let lab = "";
      if (m !== pm) lab = `${m} 月`;
      else if (mid && d >= 15 && pmid !== m) lab = `${m} 月 ${d} 日`;
      if (m !== pm) pm = m;
      if (d >= 15) pmid = m;
      if (!lab) continue;
      const x = X(k, y);
      if (x < 50 || x > SAFE_R - 20 || x - lastX < 110) continue;
      lastX = x;
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(x - 0.5, k.bot + 8, 1, 10);
      text(ctx, lab, x, k.bot + 44, 21, 600, SANS, "rgba(255,255,255,0.55)", { align: "center" });
    }
    ctx.restore();
  };
  const drawChart = (ctx: CanvasRenderingContext2D, t: number, alpha: number, lineOnly = false) => {
    if (alpha <= 0.01) return;
    const k = camAt(t);
    const c = k.c;
    const yL = k.lg > 0.01 || k.cw > 0.01 ? Math.min(FIRST, COLD5.win[0]) : k.cx - k.hxw / k.ppy - 2;
    const yR = t >= END ? LAST : c;
    ctx.save();
    ctx.globalAlpha = alpha;
    const range = k.hi - k.lo;
    if (!lineOnly) {
      if (k.cw > 0.5) {
        // the cold window: round dollars and years
        ctx.globalAlpha = alpha * clamp((k.cw - 0.5) * 2);
        for (const v of [1000, 2000, 3000, 4000, 5000]) {
          const y = Yv(k, v);
          ctx.strokeStyle = "rgba(255,255,255,0.09)";
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 8]);
          ctx.beginPath();
          ctx.moveTo(40, y);
          ctx.lineTo(SAFE_R, y);
          ctx.stroke();
          ctx.setLineDash([]);
          text(ctx, "$" + v.toLocaleString("en-US"), 44, y - 8, 21, 600, SANS, "rgba(255,255,255,0.4)");
        }
        for (const yy of [2005, 2010, 2015, 2020, 2025]) {
          const x = X(k, yy);
          ctx.fillStyle = "rgba(255,255,255,0.3)";
          ctx.fillRect(x - 0.5, CWB + 8, 1, 12);
          text(ctx, String(yy), x, CWB + 46, 22, 600, SANS, "rgba(255,255,255,0.45)", { align: "center" });
        }
        // the whole 25 years, faint, before the line runs over it
        if (t < RW0 + 0.3) {
          ctx.globalAlpha = alpha * 0.24 * clamp((k.cw - 0.5) * 2);
          ctx.strokeStyle = GOLD;
          ctx.lineWidth = 3;
          ctx.beginPath();
          let lx = -1e9;
          let first = true;
          for (let i = segOf(COLD5.win[0] + 0.01); i < SER.length && SER[i].y <= Y_RW + 1e-6; i++) {
            const x = X(k, SER[i].y);
            if (x - lx < 1.5 && SER[i].kind !== "p") continue;
            lx = x;
            const y = Yv(k, SER[i].v);
            if (first) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            first = false;
          }
          ctx.stroke();
        }
        ctx.globalAlpha = alpha;
      } else if (k.lg < 0.5) {
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
        if (k.ca > 0.01) drawDates(ctx, k, k.cx - k.hxw / k.ppy, c, alpha * k.ca);
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
    }
    // candles in a close-up
    if (k.ca > 0.01 && !lineOnly) drawCandles(ctx, k, k.cx - k.hxw / k.ppy - 0.01, c, alpha * k.ca);
    const la = 1 - 0.72 * k.ca;
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
      const base = t < B0 || k.lg > 0.5 ? (k.cw > 0.5 ? CWB : Yv(k, S.log[0])) : k.bot;
      const g = ctx.createLinearGradient(0, k.cw > 0.5 ? CWT : k.top, 0, base);
      g.addColorStop(0, `rgba(255,190,60,${0.2 * la})`);
      g.addColorStop(1, "rgba(255,190,60,0.0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(P[0].x, base);
      for (const q of P) ctx.lineTo(q.x, q.y);
      ctx.lineTo(P[P.length - 1].x, base);
      ctx.closePath();
      ctx.fill();
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
        ctx.globalAlpha = alpha * 0.22 * la;
        ctx.lineWidth = 16;
        path();
        ctx.stroke();
        ctx.globalAlpha = alpha * la;
        ctx.lineWidth = 5.5 - 2.5 * k.ca;
        ctx.shadowColor = col;
        ctx.shadowBlur = 14;
        path();
        ctx.stroke();
        ctx.shadowBlur = 0;
        if (col === GOLD) {
          ctx.globalAlpha = alpha * 0.7 * la;
          ctx.strokeStyle = "#fff4cf";
          ctx.lineWidth = 1.6;
          path();
          ctx.stroke();
        }
        ctx.globalAlpha = alpha;
        s = e;
      }
    }
    if (k.lg < 0.5 && k.cw < 0.5 && k.ca < 0.3)
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

  const drawHead = (ctx: CanvasRenderingContext2D, t: number, alpha: number) => {
    if (alpha <= 0.01 || t >= END) return;
    const h = headAt(t);
    const e = evAt(t);
    const tone = e ? KIND_TONE[e.k] : t >= COLD5.crash.at && t < RW0 ? "red" : "gold";
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
      const y = clamp(h.y + (r() - 0.5) * 560, 560, k.cw > 0.5 ? CWB : k.bot);
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

  // ---------- the law's prices: nails on the line while it sits on them; at Nixon they pop out
  const drawPegs = (ctx: CanvasRenderingContext2D, t: number) => {
    if (t < B0 || t > NIX.t0 + 1.4) return;
    const k = camAt(t);
    if (k.lg > 0.05) return;
    const c = k.c;
    ctx.save();
    PEGS.forEach((pg, pi) => {
      const last = pi === PEGS.length - 1;
      const yEnd = Math.min(pg.y1, c);
      if (yEnd <= pg.y0) return;
      const xa = Math.max(X(k, pg.y0), 30);
      const xb = Math.min(X(k, yEnd), SAFE_R);
      const yv = Yv(k, pg.v);
      if (yv < k.top - 40 || yv > k.bot + 40) return;
      let labelled = false;
      const fly = last && t >= NIX.t0 ? t - NIX.t0 : -1;
      for (let x = xa + 24; x < xb - 10; x += 70) {
        const yy = k.cx - (k.hxw - x) / k.ppy;
        if (Math.abs(val(yy) - pg.v) > 0.6) continue;
        let nx = x;
        let ny = Yv(k, val(yy));
        let rot = 0;
        let al = 1;
        if (fly >= 0) {
          const r = rng(Math.round(x * 13) + 5);
          const vx = (r() - 0.5) * 520;
          const vy = -700 - r() * 500;
          nx += vx * fly;
          ny += vy * fly + 0.5 * 2600 * fly * fly;
          rot = (r() - 0.5) * 18 * fly;
          al = clamp(1 - fly / 1.2);
        }
        ctx.globalAlpha = al;
        ctx.save();
        ctx.translate(nx, ny);
        ctx.rotate(rot);
        // the shaft into the line, the head above it
        ctx.fillStyle = "#8d949b";
        ctx.fillRect(-1.5, -10, 3, 16);
        ctx.fillStyle = "#d9dde1";
        ctx.beginPath();
        ctx.ellipse(0, -11, 9, 3.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-4, -13, 4, 1.5);
        ctx.restore();
        if (!labelled && fly < 0) {
          labelled = true;
          ctx.globalAlpha = clamp((xb - x - 40) / 80);
          text(ctx, `法律钉死：${pg.v.toFixed(2)} 美元`, x - 6, ny - 26, 25, 900, SERIF, WHITE, { glow: "rgba(0,0,0,0.95)", glowBlur: 10 });
        }
      }
    });
    ctx.restore();
  };

  // ---------- old highs across the chart, with the gap and the days; the day it is beaten: 解套
  const solveT = (v: number) => EV.find((e) => e.fx?.includes("solve") && e.fit === v)?.t0 ?? Infinity;
  const fmtN = (n: number) => Math.round(n).toLocaleString("en-US");
  const drawWires = (ctx: CanvasRenderingContext2D, t: number) => {
    if (t < B0 || t >= END) return;
    const k = camAt(t);
    if (k.lg > 0.05) return;
    const c = k.c;
    const h = headAt(t);
    ctx.save();
    for (const w of WIRES) {
      const ts = solveT(w.v);
      if (c < w.show || t > ts + 1.5) continue;
      const on = clamp((c - w.show) / 0.3) * (t > ts + 0.9 ? 1 - (t - ts - 0.9) / 0.6 : 1);
      if (on <= 0.01) continue;
      const wy = Yv(k, w.v);
      const v = val(c);
      const gap = v / w.v - 1;
      const days = (c - w.y0) * 365.2425;
      const solved = t >= ts;
      const pinned = wy < k.top - 24;
      if (pinned && !solved) {
        // the old high is above the frame: a reminder at the top
        ctx.globalAlpha = on * 0.9;
        text(ctx, `▲ ${w.name} · 较前高 ${gap < 0 ? "−" : "+"}${Math.round(Math.abs(gap) * 100)}%，${fmtN(days)} 天`, 52, k.top - 10, 24, 700, SANS, "#d6b6b0", { glow: "rgba(0,0,0,0.95)", glowBlur: 8, maxW: 880 });
        continue;
      }
      const xa = clamp(X(k, w.y0), 40, SAFE_R);
      const xb = SAFE_R;
      const col = solved ? GOLD : "rgba(255,255,255,0.75)";
      ctx.globalAlpha = on;
      ctx.strokeStyle = col;
      ctx.lineWidth = solved ? 4 : 2.5;
      ctx.shadowColor = solved ? GOLD : "rgba(255,255,255,0.5)";
      ctx.shadowBlur = solved ? 18 : 6;
      ctx.setLineDash(solved ? [] : [14, 10]);
      ctx.beginPath();
      ctx.moveTo(xa, wy);
      ctx.lineTo(xb, wy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;
      if (X(k, w.y0) > 40) {
        ctx.fillStyle = WHITE;
        ctx.beginPath();
        ctx.arc(X(k, w.y0), wy, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      text(ctx, w.name, xa + 10, wy - 14, 24, 700, SANS, solved ? GOLD : SOFT, { glow: "rgba(0,0,0,0.95)", glowBlur: 8 });
      if (!solved) {
        // the drop from the old high to the head, and how far and how long
        const dcol = gap < -0.2 ? RED : ASH;
        ctx.strokeStyle = dcol;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([3, 6]);
        ctx.beginPath();
        ctx.moveTo(h.x, wy);
        ctx.lineTo(h.x, h.y - 14);
        ctx.stroke();
        ctx.setLineDash([]);
        const lab = `较前高 ${gap < 0 ? "−" : "+"}${Math.round(Math.abs(gap) * 100)}%，${fmtN(days)} 天`;
        const ly = clamp(wy + 46, k.top + 30, h.y - 30);
        text(ctx, lab, h.x - 14, ly, 32, 900, SANS, dcol, { align: "right", glow: "rgba(0,0,0,0.95)", glowBlur: 10, maxW: h.x - 60 });
      } else {
        // a light runs along the line, the stamp lands
        const d = t - ts;
        const sx = xa + (xb - xa) * eo3(d / 0.45);
        const g = ctx.createLinearGradient(sx - 120, 0, sx + 20, 0);
        g.addColorStop(0, "rgba(255,255,255,0)");
        g.addColorStop(1, "rgba(255,255,255,0.95)");
        ctx.fillStyle = g;
        ctx.globalAlpha = on * clamp(1 - d / 0.6);
        ctx.fillRect(sx - 120, wy - 4, 140, 8);
        const s = 1 + 0.7 * (1 - eo3(d / 0.18));
        ctx.globalAlpha = on * clamp(d / 0.05);
        ctx.save();
        ctx.translate(clamp(h.x - 150, 140, 700), wy - 70);
        ctx.rotate(-0.1);
        ctx.scale(s, s);
        ctx.fillStyle = "rgba(20,14,4,0.85)";
        rrect(ctx, -92, -50, 184, 76, 8);
        ctx.fill();
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 4;
        rrect(ctx, -92, -50, 184, 76, 8);
        ctx.stroke();
        text(ctx, "解套", 0, 10, 58, 900, SERIF, GOLD, { align: "center", glow: "rgba(255,201,77,0.7)", glowBlur: 18 });
        ctx.restore();
      }
    }
    ctx.restore();
  };

  // ---------- hits on the chart: lightning, shockwave, sparks
  const bolt = (ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, seed: number, w: number) => {
    const r = rng(seed);
    const pts: [number, number][] = [[x0, y0]];
    const n = 16;
    for (let i = 1; i < n; i++) {
      const u = i / n;
      pts.push([x0 + (x1 - x0) * u + (r() - 0.5) * 110 * (1 - u * 0.6), y0 + (y1 - y0) * u]);
    }
    pts.push([x1, y1]);
    ctx.lineWidth = w;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    for (let b = 0; b < 4; b++) {
      const s = pts[3 + Math.floor(r() * 10)];
      ctx.lineWidth = w * 0.45;
      ctx.beginPath();
      ctx.moveTo(s[0], s[1]);
      let x = s[0];
      let y = s[1];
      for (let i = 0; i < 5; i++) {
        x += (r() - 0.5) * 90 + (r() < 0.5 ? -34 : 34);
        y += 30 + r() * 55;
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
      const isBolt = hit.kind === "crash" || (hit.kind === "split" && hit.big) || (hit.kind === "war" && hit.big);
      if (isBolt) {
        if (d < 0.26) {
          // lightning: the main bolt into the head, two more around it on the big ones
          const a = d < 0.08 ? 1 : 1 - (d - 0.08) / 0.18;
          ctx.save();
          ctx.globalAlpha = clamp(a);
          ctx.strokeStyle = "#f2f7ff";
          ctx.shadowColor = hit.tone === "red" || hit.kind === "war" || hit.kind === "crash" ? "#ff5a4a" : "#9ec8ff";
          ctx.shadowBlur = 34;
          const seed = Math.round(hit.t * 100);
          const flick = Math.floor(d * 30);
          const sx = hc.x + (rng(seed)() - 0.5) * 260;
          bolt(ctx, sx, VY0, hc.x, hc.y, seed + flick, hit.big ? 8 : 5.5);
          if (hit.big) {
            ctx.globalAlpha = clamp(a) * 0.6;
            bolt(ctx, hc.x - 260 + rng(seed + 3)() * 120, VY0, hc.x - 120, hc.y + 120, seed + 11 + flick, 4);
            bolt(ctx, hc.x + 160 + rng(seed + 5)() * 160, VY0, hc.x + 220, hc.y + 220, seed + 17 + flick, 3.5);
          }
          ctx.shadowBlur = 0;
          ctx.restore();
        }
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
      if ((grow || hit.kind === "mile") && hit.big && d < 0.9) {
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
      if ((grow || hit.kind === "mile") && !hit.fw) {
        const r = rng(Math.round(hit.t * 100) + 9);
        ctx.save();
        for (let i = 0; i < (grow && hit.big ? 110 : 46); i++) {
          const ang = r() * Math.PI * 2;
          const sp = 160 + r() * 520;
          const x = h.x + Math.cos(ang) * sp * d;
          const y = h.y - Math.abs(Math.sin(ang)) * sp * d * 1.2 + 260 * d * d;
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

  // ---------- fireworks on new highs: a rocket from the head, then bursts that fall and twinkle
  const FW = HITS.filter((h) => h.fw).map((h) => ({ t0: h.t, big: !!h.big || !!h.e?.fx?.includes("fwBig") }));
  const FW_OFF = [
    [-150, -250],
    [170, -330],
    [-340, -140],
  ];
  const FW_COL = [
    ["#ffd66b", "#fff3c8"],
    ["#ffffff", "#ffc94d"],
    ["#ffae42", "#ffe39a"],
  ];
  const drawFireworks = (ctx: CanvasRenderingContext2D, t: number) => {
    for (const fw of FW) {
      const bursts = fwBursts(fw.t0, fw.big);
      if (t < fw.t0 - 0.02 || t > bursts[bursts.length - 1] + 1.6) continue;
      const h0 = headAt(fw.t0 + 0.01);
      bursts.forEach((tb, bi) => {
        const [ox, oy] = FW_OFF[bi % 3];
        const cx = clamp(h0.x + ox, 150, 920);
        const cy = clamp(h0.y + oy, 520, Math.max(540, h0.y - 80));
        const r = rng(Math.round(fw.t0 * 1000) + bi * 77);
        const launch = tb - 0.16;
        ctx.save();
        if (t >= launch && t < tb) {
          // the rocket
          const u = (t - launch) / (tb - launch);
          const x = h0.x + (cx - h0.x) * eo3(u);
          const y = h0.y + (cy - h0.y) * eo3(u);
          const g = ctx.createLinearGradient(h0.x, h0.y, x, y);
          g.addColorStop(0, "rgba(255,220,140,0)");
          g.addColorStop(1, "rgba(255,240,200,0.95)");
          ctx.strokeStyle = g;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(h0.x + (x - h0.x) * 0.4, h0.y + (y - h0.y) * 0.4);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
        const tau = t - tb;
        if (tau >= 0 && tau < 1.6) {
          // flash at the centre
          if (tau < 0.2) {
            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 160);
            g.addColorStop(0, `rgba(255,245,210,${0.85 * (1 - tau / 0.2)})`);
            g.addColorStop(1, "rgba(255,245,210,0)");
            ctx.fillStyle = g;
            ctx.fillRect(cx - 160, cy - 160, 320, 320);
          }
          const n = fw.big ? 84 : 64;
          const cols = FW_COL[bi % 3];
          ctx.lineCap = "round";
          for (let i = 0; i < n; i++) {
            const ang = (i / n) * Math.PI * 2 + (r() - 0.5) * 0.12;
            const sp = (fw.big ? 360 : 300) * (0.7 + 0.45 * r());
            const tw = r() * 6.28;
            const ci = r() < 0.35 ? 1 : 0;
            const pos = (q: number) => {
              const dd = (1 - Math.exp(-q * 2.4)) / 2.4;
              return [cx + Math.cos(ang) * sp * dd, cy + Math.sin(ang) * sp * dd + 150 * q * q] as const;
            };
            const life = 1.1 + 0.45 * r();
            if (tau > life) continue;
            let a = Math.pow(1 - tau / life, 1.1);
            if (tau > 0.55) a *= 0.55 + 0.45 * Math.sin(tau * 38 + tw);
            const [x1, y1] = pos(tau);
            const [x0, y0] = pos(Math.max(0, tau - 0.08));
            ctx.globalAlpha = clamp(a);
            ctx.strokeStyle = cols[ci];
            ctx.shadowColor = cols[0];
            ctx.shadowBlur = 8;
            ctx.lineWidth = 3.2;
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.stroke();
          }
          ctx.shadowBlur = 0;
        }
        ctx.restore();
      });
    }
  };

  // ---------- money printing: one-dollar bills flutter down through the frame
  const BILL_EVS = EV.filter((e) => e.fx?.includes("bills"));
  const drawBillRain = (ctx: CanvasRenderingContext2D, t: number) => {
    for (const e of BILL_EVS) {
      const d = t - e.t0;
      if (d < 0 || d > 2.6) continue;
      const r = rng(Math.round(e.t0 * 100) + 3);
      ctx.save();
      for (let i = 0; i < 46; i++) {
        const x0 = VX0 + r() * (VX1 - VX0);
        const y0 = VY0 - 60 - r() * 900;
        const vy = 560 + r() * 420;
        const ph = r() * 6.28;
        const w1 = 3 + r() * 4;
        const w2 = 2 + r() * 3;
        const y = y0 + vy * d;
        if (y < VY0 - 80 || y > VY1 + 80) continue;
        const x = x0 + Math.sin(d * 1.8 + ph) * 60;
        const rot = Math.sin(d * w1 + ph) * 0.7;
        const sy = Math.max(0.12, Math.abs(Math.cos(d * w2 + ph)));
        ctx.globalAlpha = clamp(d / 0.12) * clamp((2.6 - d) / 0.5) * 0.92;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.scale(1, sy);
        const g = ctx.createLinearGradient(-52, -22, 52, 22);
        g.addColorStop(0, "#2f5d3a");
        g.addColorStop(1, "#5f9a6a");
        ctx.fillStyle = g;
        ctx.fillRect(-52, -22, 104, 44);
        ctx.strokeStyle = "rgba(200,235,195,0.75)";
        ctx.lineWidth = 2;
        ctx.strokeRect(-47, -17, 94, 34);
        ctx.fillStyle = "rgba(220,240,210,0.8)";
        ctx.beginPath();
        ctx.ellipse(0, 0, 13, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        text(ctx, "$", 0, 7, 20, 900, SANS, "#2f5d3a", { align: "center" });
        text(ctx, "1", -38, -4, 14, 900, SANS, "rgba(220,240,210,0.9)", { align: "center" });
        text(ctx, "1", 38, 12, 14, 900, SANS, "rgba(220,240,210,0.9)", { align: "center" });
        ctx.restore();
      }
      ctx.restore();
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

  // ---------- the title: it fills the first frame, then flies into the header
  const [TI0, TI1] = COLD5.title;
  const drawIntro = (ctx: CanvasRenderingContext2D, t: number, hx: number) => {
    const k = ease(clamp((t - TI0) / (TI1 - TI0)));
    const big = 168;
    const size = big + (30 - big) * k;
    ctx.font = `900 ${size}px ${SERIF}`;
    const w = ctx.measureText(S.brand).width;
    const x = CX - w / 2 + (hx - (CX - w / 2)) * k;
    const y = 560 + (127 - 560) * k;
    const pop = 1 + 0.08 * env(t, 0.05, 0.01, 0.3);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pop, pop);
    text(ctx, S.brand, 0, 0, size, 900, SERIF, GOLD, { ls: 2 + 10 * (1 - k), glow: "rgba(255,201,77,0.55)", glowBlur: 40 * (1 - k) + 4 });
    ctx.restore();
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
    if (t >= TI1) text(ctx, S.brand, 114 + w1 + 30, 127, 30, 900, SERIF, GOLD, { ls: 2 });
    else drawIntro(ctx, t, 114 + w1 + 30);
    const nums = clamp((t - TI1 + 0.15) / 0.25);
    if (nums <= 0) {
      ctx.restore();
      return;
    }
    ctx.globalAlpha = fade * nums;
    const c = k.c;
    const rw = t >= RW0 && t < B0;
    text(ctx, rw ? S.rewindLabel ?? "倒回……" : t < RW0 ? "最近 25 年" : S.era(c), 58, 186, 30, 700, SERIF, SOFT, { maxW: 560 });
    const yNum = Math.floor(c + 1e-6);
    let x = 56;
    const blur = Math.min(4, k.sp / 900);
    if (blur > 0.4) ctx.filter = `blur(${blur.toFixed(1)}px)`;
    x += tabular(ctx, String(yNum), x, 300, 116, WHITE);
    ctx.filter = "none";
    const span = (W * 0.5) / k.ppy;
    const [, mo, dd] = ymd(c);
    const tail = t >= B0 && k.ca > 0.5 ? `年 ${mo} 月 ${dd} 日` : t >= B0 && span < 40 && yNum >= 1968 ? `年 ${mo} 月` : t < RW0 && t >= COLD5.marks[4].at ? `年 ${mo} 月` : "年";
    text(ctx, tail, x + 6, 300, 46, 900, SERIF, WHITE);
    const v = val(c);
    const slope = val(c) - val(c - Math.max(0.0025, span / 200));
    const e = evAt(t);
    const red = (e && e.k === "crash" && slope < 0) || (t >= COLD5.crash.at && t < RW0);
    const col = red ? RED : slope < -v * 0.002 ? ASH : GOLD;
    if (!rw) {
      const nw = tabular(ctx, fmtUsd(v), 58, 404, 86, col, { glow: col + "55" });
      text(ctx, "美元 / 盎司", 58 + nw + 10, 404, 34, 900, SERIF, col);
      const rate = cnyAt(c);
      const chips = [S.kindLabel[kindAt(c)]];
      if (rate > 0) chips.unshift(`≈ ${Math.round((v * rate) / 31.1035).toLocaleString("en-US")} 元/克`);
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
  const drawTable = (ctx: CanvasRenderingContext2D, t: number) => {
    if (!S.table || t < B0 - 0.3 || t >= END) return;
    const c = camAt(t).c;
    if (c < (S.tableFrom ?? -1e9) - 0.01) return;
    const rows = S.table(c).filter((r) => r.v > 0);
    const was = S.table(c - (S.tableBack ?? 60));
    const NR = S.tableRows ?? rows.length;
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
    text(ctx, S.tableTitle ?? "", 640, 168, 22, 700, SERIF, MUTED);
    rows.forEach((r, i) => {
      const p = pos[i];
      if (p > NR - 0.02) return;
      ctx.globalAlpha = a * clamp(NR - p);
      const y = 214 + p * 50;
      ctx.fillStyle = r.c;
      ctx.fillRect(640, y - 22, 6, 28);
      text(ctx, r.n, 656, y, 26, 900, SERIF, WHITE);
      if (r.tag) {
        ctx.font = `900 26px ${SERIF}`;
        if (r.tag === "*") text(ctx, "*", 660 + ctx.measureText(r.n).width, y + 2, 28, 900, SANS, GOLD);
        else text(ctx, r.tag, 662 + ctx.measureText(r.n).width, y - 2, 16, 700, SANS, MUTED);
      }
      text(ctx, Math.round(r.v).toLocaleString("en-US"), 862, y, 25, 900, SANS, WHITE, { align: "right" });
      const w0 = was.find((x) => x.n === r.n);
      const ch = w0 && w0.v > 1 ? r.v / w0.v - 1 : 0;
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

  // ---------- swing ticks
  const PCT_YEARS = EV.filter((e) => e.pct).map((e) => e.y);
  const PIV = SER.map((p, i) => (p.kind === "p" ? i : -1)).filter((i) => i >= 0);
  const drawTicks = (ctx: CanvasRenderingContext2D, t: number) => {
    if (t < B0 || t >= END) return;
    const k = camAt(t);
    if (k.lg > 0.05 || k.ca > 0.3) return;
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
      const col = up ? GOLD : segTone(pr) === RED ? RED : ASH;
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
      const lab = `${up ? "+" : "−"}${Math.round(Math.abs(ch) * 100)}%`;
      ctx.globalAlpha = a * clamp((x - 12 - measure(ctx, lab, 30 * pop, 900, SANS) - 40) / 30);
      text(ctx, lab, x - 12, (y0 + y1) / 2 + 10, 30 * pop, 900, SANS, col, { align: "right", glow: "rgba(0,0,0,0.95)", glowBlur: 10 });
    }
    ctx.restore();
  };

  // ---------- the card at the head: (icon), tag, title, number, sub; each line lands on its own beat
  const REV = new Map(EV.map((e) => [e.i, revealOf(e, BEATS)]));
  const CX_OFF = 60;
  const ICON_H = 128;
  const wrap2 = (ctx: CanvasRenderingContext2D, s: string, size: number, maxW: number) => {
    if (measure(ctx, s, size, 900, SERIF) <= maxW) return [s];
    const cut = s.indexOf("，");
    if (cut > 0 && cut < s.length - 1) return [s.slice(0, cut + 1), s.slice(cut + 1)];
    return [s];
  };
  const cardBox = (ctx: CanvasRenderingContext2D, e: P5, maxW: number) => {
    const TS = e.n ? 60 : 72;
    const lines = e.t ? wrap2(ctx, e.t, TS, maxW) : [];
    const NS = e.n ? (e.n.length > 8 ? 84 : 118) : 0;
    const h = 46 + lines.length * TS * 1.18 + (e.n ? NS * 1.02 : 0) + (e.s ? 46 : 0) + (e.icon ? ICON_H : 0);
    return { TS, lines, NS, h };
  };
  const drawOne = (ctx: CanvasRenderingContext2D, e: P5, t: number, fade: number, lift: number) => {
    const k = camAt(t);
    const h0 = headAt(e.t0 + 0.01);
    const hx = headAt(t).x;
    const x0 = hx + CX_OFF;
    const maxW = SAFE_R - x0;
    const tone = KIND_TONE[e.k];
    const col = toneCol(tone);
    const bottom = Math.min(k.bot + 40, 1450);
    const R = REV.get(e.i)!;
    const B = cardBox(ctx, e, maxW);
    let y = clamp(h0.y - B.h * 0.42, 590, bottom - B.h) - lift;
    const slide = (r: number) => (1 - eo3((t - r) / 0.12)) * 46;
    const on = (r: number) => clamp((t - r) / 0.06) * fade;
    if (e.icon) {
      ctx.save();
      ctx.globalAlpha = fade;
      drawIcon(ctx, e.icon, x0 + 58, y + 62, 1, (t - e.t0) / 0.6, e.icon === "stamp" ? RED : col);
      ctx.restore();
      y += ICON_H;
    }
    ctx.globalAlpha = on(R.title);
    let tx = x0 + slide(R.title);
    y += 34;
    const lab = e.lab ?? KIND_LABEL[e.k];
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
    const prev = e.i > 0 ? EV[e.i - 1] : null;
    const d = t - e.t0;
    if (prev && d < 0.1) drawOne(ctx, prev, t, Math.pow(1 - d / 0.1, 2), eo3(d / 0.1) * 70);
    drawOne(ctx, e, t, 1, 0);
    ctx.restore();
  };

  // ---------- frames: red alarm (crashes, wars, the market shut), gold (the biggest highs); drawn over the grade
  const drawAlarm = (ctx: CanvasRenderingContext2D, t: number) => {
    const e = evAt(t);
    if (!e) return;
    const closed = !!e.fx?.includes("closed");
    const gold = !!e.big && (e.k === "peak" || e.k === "unite" || e.k === "grow");
    if (!closed && (!e.big || !(gold || e.k === "war" || e.k === "crash" || e.k === "split"))) return;
    const d = t - e.t0;
    const life = e.t1 - e.t0;
    const a = clamp(d / 0.06) * clamp((life - d) / 0.15) * (0.75 + 0.25 * Math.sin(t * (closed ? 18 : 12)));
    ctx.save();
    const fcx = (W / 2 - LX) / LS;
    const fcy = (H / 2 - LY) / LS;
    const g = ctx.createRadialGradient(fcx, fcy, (H * 0.3) / LS, fcx, fcy, (H * 0.75) / LS);
    g.addColorStop(0, "rgba(120,0,0,0)");
    g.addColorStop(1, gold ? `rgba(150,105,10,${0.42 * a})` : `rgba(150,8,4,${0.55 * a})`);
    ctx.fillStyle = g;
    ctx.fillRect(...FULL);
    ctx.globalAlpha = a;
    ctx.strokeStyle = gold ? "rgba(255,201,77,0.9)" : "rgba(255,70,55,0.9)";
    ctx.lineWidth = closed ? 6 : 3;
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
    ctx.fillStyle = gold ? "rgba(255,201,77,0.95)" : "rgba(255,59,47,0.95)";
    const lab = closed ? "伦敦金市 · 关闭" : gold ? (e.lab === "改价" ? "美元贬值" : "金价暴涨") : e.k === "crash" ? "金价暴跌" : e.k === "split" ? "脱钩" : e.lab ?? "战争";
    ctx.font = `900 ${closed ? 30 : 26}px ${SERIF}`;
    const lw = ctx.measureText(lab).width + 44;
    ctx.fillRect(CX - lw / 2, closed ? 518 : 522, lw, closed ? 44 : 38);
    text(ctx, lab, CX, closed ? 551 : 550, closed ? 30 : 26, 900, SERIF, gold ? "#111" : "#fff", { align: "center" });
    ctx.restore();
  };
  const drawFlash = (ctx: CanvasRenderingContext2D, t: number) => {
    for (const h of HITS) {
      const d = t - h.t;
      if (d < 0 || d > 0.25) continue;
      const gf = h.big && (h.kind === "peak" || h.kind === "unite" || h.kind === "grow" || h.kind === "mile");
      if (!(gf || h.kind === "crash" || (h.big && (h.kind === "war" || h.kind === "split")))) continue;
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
    for (let i = 0; i < 7; i++) {
      ctx.globalAlpha = a * (0.05 + 0.08 * r());
      ctx.fillStyle = "#cfe6ff";
      ctx.fillRect(FULL[0], VY0 + r() * (VY1 - VY0), FULL[2], 3 + r() * 26);
    }
    ctx.globalAlpha = a;
    const jx = (r() - 0.5) * 8;
    ctx.fillStyle = WHITE;
    for (const ox of [0, 62]) {
      ctx.beginPath();
      ctx.moveTo(CX - 160 + ox + jx, 455 + 80);
      ctx.lineTo(CX - 100 + ox + jx, 420 + 80);
      ctx.lineTo(CX - 100 + ox + jx, 490 + 80);
      ctx.closePath();
      ctx.fill();
    }
    text(ctx, tr("倒回"), CX + 10 + jx, 482 + 80, 72, 900, SERIF, WHITE, { glow: "rgba(150,200,255,0.8)", glowBlur: 20 });
    const yNow = Math.max(Math.floor(FIRST), Math.floor(CUR(t)));
    text(ctx, `${yNow} 年`, CX + jx, 640, 44, 900, SANS, "#cfe6ff", { align: "center", glow: "rgba(0,0,0,0.9)", glowBlur: 10 });
    ctx.restore();
  };
  const drawSource = (ctx: CanvasRenderingContext2D, t: number) => {
    if (!S.src || t < B0 - 0.2 || t >= OUT) return;
    const c = camAt(t).c;
    const e = evAt(t);
    let line = tr("数据：") + S.src(t >= END ? LAST_REAL : c);
    if (k_ca(t) > 0.5) line = "数据：COMEX 黄金期货日线（开盘、最高、最低、收盘）";
    if (t >= END) line = S.srcEnd ?? "";
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
  const k_ca = (t: number) => camAt(t).ca;

  // ---------- cold open: the highs named on the beats, ×21, the crash, the question
  const drawCold = (ctx: CanvasRenderingContext2D, t: number) => {
    if (t >= RW0 + 0.1) return;
    const k = camAt(t);
    const fadeOut = 1 - clamp((t - (RW0 - 0.12)) / 0.22);
    const L = S.cold.lines[0];
    const quiet = 1 - 0.7 * clamp((t - L.t0) / 0.2); // the question takes the frame
    ctx.save();
    // where it starts
    {
      const xs = X(k, CK[0][1]);
      const ys = Yv(k, val(CK[0][1]));
      ctx.globalAlpha = fadeOut * quiet * clamp((t - TI1 + 0.2) / 0.3);
      text(ctx, "2001 年", xs - 4, ys - 66, 24, 700, SERIF, SOFT);
      text(ctx, `${fmtUsd(val(CK[0][1]))} 美元`, xs - 4, ys - 28, 34, 900, SANS, WHITE, { glow: "rgba(0,0,0,0.9)", glowBlur: 8 });
    }
    let newest = -1;
    COLD5.marks.forEach((m, i) => {
      if (t >= m.at - 0.01) newest = i;
    });
    COLD5.marks.forEach((m, i) => {
      if (t < m.at - 0.01) return;
      const x = X(k, m.y);
      const y = Yv(k, val(m.y));
      const isNew = i === newest && t < COLD5.crash.at;
      const pop = 1 + 0.5 * env(t, m.at, 0.01, 0.12);
      ctx.globalAlpha = fadeOut * (isNew ? 1 : 0.8) * quiet;
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(x, y, 8 * pop, 0, Math.PI * 2);
      ctx.fill();
      const sb = isNew ? (m.top ? 50 : 42) : 30;
      const sa = isNew ? 26 : 21;
      const lx = Math.min(x - 22, SAFE_R - 60);
      ctx.save();
      ctx.translate(lx, y - 24);
      ctx.scale(pop, pop);
      text(ctx, m.b, 0, 0, sb, 900, SANS, GOLD, { align: "right", glow: "rgba(0,0,0,0.95)", glowBlur: 12 });
      text(ctx, m.a, 0, -sb - 4, sa, 700, SERIF, isNew ? WHITE : SOFT, { align: "right", glow: "rgba(0,0,0,0.95)", glowBlur: 8 });
      ctx.restore();
    });
    // ×21 after the top
    const top = COLD5.marks[COLD5.marks.length - 1];
    if (t >= top.at) {
      const s = 1 + 0.4 * env(t, top.at, 0.01, 0.14);
      ctx.globalAlpha = fadeOut * clamp((t - top.at) / 0.08) * (1 - clamp((t - COLD5.crash.at) / 0.12));
      text(ctx, "2001 → 2026", 84, 820, 30, 700, SANS, SOFT, { glow: "rgba(0,0,0,0.9)", glowBlur: 8 });
      ctx.save();
      ctx.translate(76, 985);
      ctx.scale(s, s);
      text(ctx, "×21", 0, 0, 170, 900, SANS, GOLD, { glow: "rgba(255,201,77,0.6)", glowBlur: 30 });
      ctx.restore();
    }
    // the crash the next day
    const cr = COLD5.crash;
    if (t >= cr.at) {
      const s = 1 + 0.45 * env(t, cr.at, 0.01, 0.12);
      ctx.globalAlpha = fadeOut * clamp((t - cr.at) / 0.05) * (1 - 0.8 * clamp((t - L.t0) / 0.2));
      text(ctx, "2026 年 1 月 30 日，一天", CX + 70, 812, 32, 900, SERIF, WHITE, { align: "center", glow: "rgba(0,0,0,0.95)", glowBlur: 10 });
      ctx.save();
      ctx.translate(CX + 70, 960);
      ctx.scale(s, s);
      text(ctx, cr.b, 0, 0, 160, 900, SANS, RED, { align: "center", glow: "rgba(255,59,47,0.7)", glowBlur: 30 });
      ctx.restore();
    }
    // the question
    if (t >= L.t0 && t <= L.t1) {
      const d = t - L.t0;
      const s = 1 + 0.3 * env(t, L.t0, 0.01, 0.1);
      ctx.globalAlpha = clamp(d / 0.06) * clamp((L.t1 - t) / 0.1);
      const back = ctx.createLinearGradient(0, 470, 0, 690);
      back.addColorStop(0, "rgba(6,5,4,0)");
      back.addColorStop(0.5, "rgba(6,5,4,0.8)");
      back.addColorStop(1, "rgba(6,5,4,0)");
      ctx.fillStyle = back;
      ctx.fillRect(FULL[0], 470, FULL[2], 220);
      ctx.save();
      ctx.translate(CX, 548);
      ctx.scale(s, s);
      text(ctx, L.a, 0, 0, 54, 900, SERIF, WHITE, { align: "center", maxW: 880 / s, glow: "rgba(0,0,0,0.9)", glowBlur: 16 });
      ctx.restore();
      const tb = L.t0 + (L.bBeats ?? 1) * (60 / 130);
      if (L.b && t >= tb) {
        const s2 = 1 + 0.25 * env(t, tb, 0.01, 0.1);
        ctx.save();
        ctx.translate(CX, 640);
        ctx.scale(s2, s2);
        text(ctx, L.b, 0, 0, 74, 900, SERIF, GOLD, { align: "center", maxW: 900 / s2, glow: "rgba(255,201,77,0.45)", glowBlur: 20 });
        ctx.restore();
      }
    }
    ctx.restore();
  };

  // ---------- eras under the whole line
  const RIB_Y = 1340;
  const drawRibbon = (ctx: CanvasRenderingContext2D, t: number, alpha: number) => {
    const k = camAt(t);
    const a = ease(k.lg) * alpha * (1 - k.cw);
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

  // ---------- ending (v3)
  const drawEnding = (ctx: CanvasRenderingContext2D, t: number) => {
    if (t < END) return;
    const k = camAt(t);
    const cardA = clamp((t - S.ending.card) / 0.6);
    const CR = S.ending.credits;
    const credA = CR ? clamp((t - CR.t0) / 0.5) : 0;
    ctx.save();
    ctx.globalAlpha = 1 - Math.max(cardA, credA);
    S.ending.troughs.forEach((tr2, i) => {
      const ta = END + 0.3 + i * 0.4654;
      if (t < ta) return;
      const x = X(k, tr2.y);
      const y = Yv(k, val(tr2.y));
      const s = 1 + 0.5 * env(t, ta, 0.01, 0.1);
      const tc = tr2.tone === "gold" ? GOLD : RED;
      ctx.fillStyle = tc;
      ctx.beginPath();
      ctx.arc(x, y, 7 * s, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, tr2.t, x + (tr2.dx ?? 0), y + (tr2.dy ?? (tr2.tone === "gold" ? -24 : 46)), 28 * s, 900, SERIF, WHITE, { align: "center", glow: "rgba(0,0,0,0.9)", glowBlur: 8 });
    });
    const xe = X(k, LAST_REAL);
    const ye = Yv(k, val(LAST_REAL));
    ctx.fillStyle = WHITE;
    ctx.beginPath();
    ctx.arc(xe, ye, 9 + 4 * beatPulse(t), 0, Math.PI * 2);
    ctx.fill();
    for (const L of S.ending.lines) {
      if (t < L.t0 || t > L.t1) continue;
      const dd = t - L.t0;
      const a = clamp(dd / 0.1) * clamp((L.t1 - t) / 0.2);
      const s = 1 + 0.25 * env(t, L.t0, 0.01, 0.12);
      ctx.globalAlpha = a;
      const col = toneCol(L.tone ?? "white");
      ctx.save();
      ctx.translate(CX, L.brush ? 520 : 470);
      ctx.scale(s, s);
      if (L.brush) text(ctx, L.text, 0, 0, 132, 400, BRUSH, col, { align: "center", maxW: 900, glow: col + "88", glowBlur: 30 });
      else text(ctx, L.text, 0, 0, 72, 900, SERIF, col, { align: "center", maxW: 900, glow: "rgba(0,0,0,0.9)", glowBlur: 14 });
      ctx.restore();
      if (L.text2) {
        const t2 = L.t0 + 4 * (60 / 130);
        if (t >= t2) {
          ctx.globalAlpha = a * clamp((t - t2) / 0.1);
          text(ctx, L.text2, CX, 560, 50, 900, SERIF, SOFT, { align: "center", maxW: 900 });
        }
      }
    }
    ctx.restore();
    if (CR && credA > 0 && cardA < 1) {
      ctx.save();
      ctx.globalAlpha = credA * (1 - cardA);
      ctx.fillStyle = "rgba(5,6,8,0.92)";
      ctx.fillRect(...FULL);
      text(ctx, CR.title ?? "信息来源", CX, 640, 44, 900, SERIF, GOLD, { align: "center", ls: 6 });
      CR.lines.forEach((ln, i) => text(ctx, ln, CX, 740 + i * 64, 33, 700, SERIF, SOFT, { align: "center", maxW: 880 }));
      ctx.restore();
    }
    if (cardA > 0) {
      ctx.save();
      ctx.globalAlpha = cardA;
      ctx.fillStyle = "rgba(5,6,8,1)";
      ctx.fillRect(...FULL);
      const logo = IMGS["mark-disc.png"];
      if (logo) ctx.drawImage(logo, CX - 70, 760, 140, 140);
      text(ctx, tr("世界的形状"), CX, 990, 64, 900, SANS, WHITE, { align: "center", ls: 6 });
      if (S.ending.slogan) {
        text(ctx, S.ending.slogan, CX, 1066, 40, 700, SERIF, SOFT, { align: "center", ls: 8 });
        if (S.ending.maker) text(ctx, S.ending.maker, CX, (1400 - LY) / LS, 30, 700, SANS, MUTED, { align: "center", ls: 2 });
      }
      ctx.restore();
    }
  };

  // ---------- gold dust
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

  // ---------- 2008: the glass breaks from the head; pieces of the picture fall away, the cracks stay a moment
  const SHATTER = EV.filter((e) => e.fx?.includes("shatter")).map((e) => {
    const r = rng(Math.round(e.t0 * 1000) + 41);
    const NR = 18;
    const RADII = [46, 130, 260, 460, 760, 1250, 2000];
    const ang = Array.from({ length: NR }, (_, i) => ((i + 0.25 + 0.5 * r()) / NR) * Math.PI * 2);
    const rad = RADII.map((R0) => ang.map(() => R0 * (0.82 + 0.36 * r())));
    const len = ang.map(() => 3 + Math.floor(r() * 4)); // how many rings each ray crosses
    const cells: { i: number; j: number; fall: boolean; delay: number; spin: number; vx: number }[] = [];
    for (let i = 0; i < NR; i++)
      for (let j = 1; j < RADII.length - 1; j++) cells.push({ i, j, fall: j <= 4 && r() < 0.52, delay: 0.14 + 0.22 * r() + 0.04 * j, spin: (r() - 0.5) * 3.2, vx: (r() - 0.5) * 160 });
    return { t0: e.t0, ang, rad, len, cells, NR };
  });
  const drawShatter = (ctx: CanvasRenderingContext2D, t: number, src: HTMLCanvasElement) => {
    for (const sh of SHATTER) {
      const d = t - sh.t0;
      if (d < -0.01 || d > 2.4) continue;
      const hp = headAt(sh.t0 + 0.01);
      const px = LX + LS * hp.x;
      const py = LY + LS * hp.y;
      const pt = (i: number, j: number) => {
        const ii = ((i % sh.NR) + sh.NR) % sh.NR;
        const R0 = sh.rad[j][ii];
        return [px + Math.cos(sh.ang[ii]) * R0, py + Math.sin(sh.ang[ii]) * R0] as const;
      };
      const grow = eo3(d / 0.12) * 2100;
      ctx.save();
      // falling pieces: the hole goes dark for a moment, the piece (with the picture on it) drops and turns
      for (const c of sh.cells) {
        if (!c.fall) continue;
        const dt = d - c.delay;
        if (dt < 0 || dt > 1.3) continue;
        const poly = [pt(c.i, c.j), pt(c.i + 1, c.j), pt(c.i + 1, c.j + 1), pt(c.i, c.j + 1)];
        const cx = poly.reduce((s, p) => s + p[0], 0) / 4;
        const cy = poly.reduce((s, p) => s + p[1], 0) / 4;
        const path = () => {
          ctx.beginPath();
          poly.forEach(([x, y], q) => (q ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          ctx.closePath();
        };
        ctx.globalAlpha = 0.75 * clamp(1 - (dt - 0.5) / 0.6);
        ctx.fillStyle = "#020203";
        path();
        ctx.fill();
        const ox = Math.sign(cx - px) * 90 * dt + c.vx * dt;
        const oy = -160 * dt + 0.5 * 3000 * dt * dt;
        ctx.save();
        ctx.globalAlpha = clamp(1 - dt / 1.1);
        ctx.translate(cx + ox, cy + oy);
        ctx.rotate(c.spin * dt);
        ctx.translate(-cx, -cy);
        path();
        ctx.save();
        ctx.clip();
        ctx.drawImage(src, 0, 0);
        const g = ctx.createLinearGradient(cx - 80, cy - 80, cx + 80, cy + 80);
        g.addColorStop(0, "rgba(255,255,255,0.28)");
        g.addColorStop(0.5, "rgba(255,255,255,0)");
        g.addColorStop(1, "rgba(255,255,255,0.12)");
        ctx.fillStyle = g;
        ctx.fillRect(cx - 400, cy - 400, 800, 800);
        ctx.restore();
        ctx.strokeStyle = "rgba(235,245,255,0.9)";
        ctx.lineWidth = 2;
        path();
        ctx.stroke();
        ctx.restore();
      }
      // the cracks
      const ca = d < 1.2 ? 1 : clamp(1 - (d - 1.2) / 1.0);
      ctx.globalAlpha = ca;
      ctx.lineCap = "round";
      for (const pass of [0, 1]) {
        ctx.strokeStyle = pass ? "rgba(240,248,255,0.95)" : "rgba(0,0,0,0.55)";
        ctx.lineWidth = pass ? 2.2 : 3.4;
        ctx.shadowColor = "rgba(200,230,255,0.9)";
        ctx.shadowBlur = pass ? 8 : 0;
        ctx.beginPath();
        for (let i = 0; i < sh.NR; i++) {
          let [x0, y0] = [px, py];
          for (let j = 0; j < sh.len[i] && j < sh.rad.length; j++) {
            const R0 = sh.rad[j][i];
            if (R0 > grow) break;
            const [x1, y1] = pt(i, j);
            ctx.moveTo(x0 + pass, y0 + pass);
            ctx.lineTo(x1 + pass, y1 + pass);
            [x0, y0] = [x1, y1];
          }
          for (let j = 1; j < 5; j++) {
            if (j >= sh.len[i] || j >= sh.len[(i + 1) % sh.NR]) continue;
            if (sh.rad[j][i] > grow) continue;
            const [xa, ya] = pt(i, j);
            const [xb, yb] = pt(i + 1, j);
            ctx.moveTo(xa + pass, ya + pass);
            ctx.lineTo(xb + pass, yb + pass);
          }
        }
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      // the impact
      if (d < 0.3) {
        const g = ctx.createRadialGradient(px, py, 0, px, py, 220);
        g.addColorStop(0, `rgba(255,255,255,${0.9 * (1 - d / 0.3)})`);
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.globalAlpha = 1;
        ctx.fillStyle = g;
        ctx.fillRect(px - 220, py - 220, 440, 440);
      }
      ctx.restore();
    }
  };

  // ---------- old film over the black-and-white years: flicker, scratches, specks
  const drawOldFilm = (ctx: CanvasRenderingContext2D, t: number, g: number) => {
    const r = rng(Math.round(t * FPS) * 17 + 1);
    ctx.save();
    ctx.globalAlpha = g * (0.03 + 0.05 * r());
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 2 + Math.floor(r() * 2); i++) {
      ctx.globalAlpha = g * (0.08 + 0.12 * r());
      ctx.fillStyle = r() < 0.5 ? "#f4efe2" : "#1a1714";
      ctx.fillRect(r() * W, 0, 1 + r() * 1.5, H);
    }
    for (let i = 0; i < 14; i++) {
      ctx.globalAlpha = g * (0.15 + 0.3 * r());
      ctx.fillStyle = r() < 0.6 ? "#f4efe2" : "#0e0c0a";
      ctx.beginPath();
      ctx.ellipse(r() * W, r() * H, 1 + r() * 3, 1 + r() * 2, r() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  // ---------- the stage
  let BUF: HTMLCanvasElement | null = null;
  let CBUF: HTMLCanvasElement | null = null;
  let FBUF: HTMLCanvasElement | null = null;
  let LBUF: HTMLCanvasElement | null = null;
  const mk = () => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    return c;
  };
  const draw = (ctx: CanvasRenderingContext2D, t: number) => {
    BUF ??= mk();
    CBUF ??= mk();
    FBUF ??= mk();
    LBUF ??= mk();
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
    drawPegs(cb, t);
    drawWires(cb, t);
    drawBillRain(cb, t);
    drawStreaks(cb, t);
    drawHead(cb, t, chartA);
    drawTicks(cb, t);
    drawHits(cb, t);
    drawFireworks(cb, t);
    drawCold(cb, t);
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.globalAlpha = 1;
    b.drawImage(CBUF, 0, 0);
    // the frame, with shake
    const sh = shakeAt(t);
    const r = rng(Math.round(t * 30) * 13 + 5);
    const sx = (r() - 0.5) * 44 * sh;
    const sy = (r() - 0.5) * 44 * sh;
    const z = 1 + 0.045 * sh;
    const f = FBUF.getContext("2d")!;
    f.setTransform(1, 0, 0, 1, 0, 0);
    f.clearRect(0, 0, W, H);
    f.save();
    f.translate(W / 2 + sx, H * 0.5 + sy);
    f.scale(z, z);
    f.drawImage(BUF, -W / 2, -H * 0.5);
    const rwg = t >= RW0 && t < RW1 ? 0.6 : 0;
    if (rwg > 0 || sh > 0.35) {
      f.globalCompositeOperation = "lighter";
      f.globalAlpha = rwg > 0 ? 0.22 : (sh - 0.35) * 0.28;
      const o = rwg > 0 ? 14 : 10 * sh;
      f.drawImage(BUF, -W / 2 + o, -H * 0.5);
      f.drawImage(BUF, -W / 2 - o, -H * 0.5 + 3);
      f.globalCompositeOperation = "source-over";
      f.globalAlpha = 1;
    }
    f.restore();
    f.save();
    f.translate(sx * 0.35, sy * 0.35);
    f.transform(LS, 0, 0, LS, LX, LY);
    drawPct(f, t);
    drawHeader(f, t);
    drawTable(f, t);
    drawCard(f, t);
    drawEnding(f, t);
    drawRewind(f, t);
    drawSource(f, t);
    f.restore();
    // out: black and white with the gold line in colour; colour floods back at Nixon
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const g = gradeAt(t);
    if (g > 0.003) {
      ctx.filter = `grayscale(${g.toFixed(3)}) sepia(${(0.32 * g).toFixed(3)}) contrast(${(1 + 0.12 * g).toFixed(3)}) brightness(${(1 - 0.05 * g).toFixed(3)})`;
      ctx.drawImage(FBUF, 0, 0);
      ctx.filter = "none";
      const l = LBUF.getContext("2d")!;
      l.setTransform(1, 0, 0, 1, 0, 0);
      l.clearRect(0, 0, W, H);
      l.setTransform(LS, 0, 0, LS, LX, LY);
      drawChart(l, t, chartA, true);
      drawHead(l, t, chartA);
      ctx.save();
      ctx.translate(W / 2 + sx, H * 0.5 + sy);
      ctx.scale(z, z);
      ctx.drawImage(LBUF, -W / 2, -H * 0.5);
      ctx.restore();
      if (t < NIX.t0 + 0.75) drawOldFilm(ctx, t, g);
      if (t >= NIX.t0 && t < NIX.t0 + 0.75) {
        const hp = headAt(NIX.t0 + 0.01);
        const px = LX + LS * hp.x;
        const py = LY + LS * hp.y;
        const R0 = eo3((t - NIX.t0) / 0.7) * 2300;
        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, R0, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(FBUF, 0, 0);
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = 0.9 * (1 - (t - NIX.t0) / 0.75);
        ctx.strokeStyle = GOLD;
        ctx.shadowColor = GOLD;
        ctx.shadowBlur = 30;
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(px, py, R0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    } else ctx.drawImage(FBUF, 0, 0);
    ctx.save();
    ctx.translate(sx * 0.35, sy * 0.35);
    ctx.transform(LS, 0, 0, LS, LX, LY);
    drawAlarm(ctx, t);
    ctx.restore();
    drawShatter(ctx, t, FBUF);
    drawFlash(ctx, t);
  };
  return { draw, frames: Math.round(DUR * FPS), CUR, val, evAt, HITS };
};

// =====================================================================================================================
export const EngineG5: React.FC<{ film: ReturnType<typeof createFilm5>; audio: string }> = ({ film, audio }) => {
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
      <canvas ref={ref} width={1080} height={1920} style={{ position: "absolute", inset: 0 }} />
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
