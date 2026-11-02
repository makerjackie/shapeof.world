// 两千年中国人口 — Film5 (the v3 cut). Everything is drawn on one canvas per frame from the plan, so every render tab
// produces the same pixels: no SVG text, no CSS transforms on text, local fonts only.
import React, { useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, Audio, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import MAP from "../v2/popmap.json";
import WTOP from "../v3/world_top.json";
import DATA from "../data.json";
import TERRJ from "./territory5.json";
import { BRUSH, SANS, SERIF, fontsReady } from "./fonts";
import {
  ARTS, CUR, DUR, END_T, ENDING, F, HITS, HOOK, HX, INFOS, Info, LOGB, MAP_LABELS, MAP_ON, MARKS, MILESTONES, QING_CRASHES, QUOTES,
  REWIND_MARKS, SPAN, SPEED, TROUGHS,
} from "./plan5";
import { DYNS, FIRST, MING_REG, SERIES, dynAt, fmtPop, ganzhi, gapAt, kindAt, reignAt, val } from "./series5";

const W = 1080;
const H = 1920;
const FPS = 30;
export const FILM5_FRAMES = Math.round(DUR * FPS);

// palette: gold = growth, 素白 = loss; vermilion only on the small dynasty seal; blood only for three massacres
const GOLD = "#ffcf5c";
const GOLD_RGB = "255,207,92";
const GOLD_HI = "255,233,175";
const ASH = "#d3d8d6";
const ASH_RGB = "211,216,214";
const ASH_HI = "245,247,246";
const WHITE = "#f5f7f6";
const SEAL = "#b8291b";
const PAPER = "#f4efe2";
const MUTED = "#a59f8f";
const SOFT = "#c9c2b0";

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const easeOut3 = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
const vis = (t: number, a: number, b: number, fi = 0.12, fo = 0.18) =>
  t < a || t > b + fo ? 0 : t < a + fi ? (t - a) / fi : t > b ? 1 - (t - b) / fo : 1;
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
const ending = (t: number) => t >= END_T;
const LAND = F(6.47); // the rewind lands on 公元 2 年
const rewinding = (t: number) => t > F(5.58) && t < LAND;

// ---------------- camera
const Y_TOP = 770;
const Y_BOT = 1300;
type Cam = { c: number; span: number; hx: number; lo: number; hi: number; lg: number };
const rawRange = (t: number) => {
  const c = CUR(t);
  const span = SPAN(t);
  const a = Math.max(FIRST, c - span * 1.05);
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i <= 40; i++) {
    const v = val(a + ((c - a) * i) / 40);
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  for (const p of SERIES) {
    if (p.y < a || p.y > c) continue;
    lo = Math.min(lo, p.v);
    hi = Math.max(hi, p.v);
  }
  return [lo, hi];
};
const CAMS = new Map<number, Cam>();
const camAt = (t: number): Cam => {
  const key = Math.round(t * 1000);
  const hit = CAMS.get(key);
  if (hit) return hit;
  let lo = 0;
  let hi = 0;
  let n = 0;
  for (let i = 0; i < 10; i++) {
    const tt = t - i * 0.05;
    if (tt < 0) break;
    if (t >= LAND && tt < LAND) break; // never average across the rewind landing
    const [l, h] = rawRange(tt);
    lo += l;
    hi += h;
    n++;
  }
  lo /= n;
  hi /= n;
  const r = Math.max(hi - lo, hi * 0.16);
  const lg = LOGB(t);
  const end = clamp((t - END_T) / 1.2);
  const floor = (lo - 0.32 * r) * (1 - end);
  const k: Cam = { c: CUR(t), span: SPAN(t), hx: HX(t), lo: Math.max(0, floor), hi: (hi + 0.1 * r) * (1 - end) + 160000 * end, lg };
  if (CAMS.size > 4000) CAMS.clear();
  CAMS.set(key, k);
  return k;
};
const ppy = (k: Cam) => (W * 0.9) / k.span;
const X = (k: Cam, y: number) => k.hx * W - (k.c - y) * ppy(k);
const L0 = 3.0;
const L1 = Math.log10(160000);
const Yv = (k: Cam, v: number) => {
  const yl = Y_BOT - ((v - k.lo) / (k.hi - k.lo)) * (Y_BOT - Y_TOP);
  if (k.lg <= 0) return yl;
  const yg = Y_BOT - ((Math.log10(Math.max(v, 200)) - L0) / (L1 - L0)) * (Y_BOT - Y_TOP);
  return yl + (yg - yl) * ease(k.lg);
};
const headAt = (t: number) => {
  const k = camAt(t);
  return { x: X(k, k.c), y: Yv(k, val(k.c)), up: val(k.c) >= val(k.c - 0.4) - 0.01 };
};

// ---------------- assets
const IMGS: Record<string, HTMLImageElement> = {};
const IMG_LIST = ["mark-disc.png", ...ARTS.map((a) => a.src)];
let IMG_P: Promise<unknown> | null = null;
const imagesReady = () =>
  (IMG_P ??= Promise.all(
    IMG_LIST.map(
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

// ---------------- text helpers (canvas only)
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
// digits in fixed cells so numbers never jitter sideways while they count
const tabular = (ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string, o: { glow?: string; alpha?: number } = {}) => {
  ctx.font = `900 ${size}px ${SERIF}`;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "center";
  const cell = size * 0.6;
  const a0 = ctx.globalAlpha;
  ctx.globalAlpha = a0 * (o.alpha ?? 1);
  if (o.glow) {
    ctx.shadowColor = o.glow;
    ctx.shadowBlur = 20;
  }
  ctx.fillStyle = color;
  let cx = x;
  for (const ch of s) {
    const w = /[0-9]/.test(ch) ? cell : ctx.measureText(ch).width + size * 0.02;
    ctx.fillText(ch, cx + w / 2, y);
    cx += w;
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = a0;
  ctx.textAlign = "left";
  return cx - x;
};
const fmtWan = (v: number) => Math.round(v).toLocaleString("en-US");
const CN_NUM = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二", "十三", "十四"];

// ---------------- the population-light floor (HYDE 1860 grid), only in the Taiping passages
type MapJ = { cols: number; rows: number; lon0: number; lat0: number; step: number; dots: [number, number, number, number, string][] };
const M = MAP as unknown as MapJ;
const LATMAX = M.lat0 + (M.rows - 1) * M.step;
const TAIPING = new Set(["江苏", "浙江", "安徽", "江西", "湖北"]);
const HUI = new Set(["陕西", "甘肃", "宁夏"]);
const FAMINE = new Set(["山西", "河南"]);
const projM = (lon: number, lat: number) => {
  const v = Math.max(0, Math.min(1.08, (54 - lat) / 34));
  const z = 1 + (1 - v) * 1.4;
  return { x: 600 + ((lon - 110) * 40) / z, y: 470 + 1440 / z, s: 1 / z };
};
const DOTS = (() => {
  const r = rng(91);
  return M.dots.map(([c, rw, p60, , prov]) => {
    const lon = M.lon0 + c * M.step;
    const lat = LATMAX - rw * M.step;
    const b = clamp((Math.log10(Math.max(p60, 1)) - 3.2) / 2.7);
    let loss = 0;
    let off = Infinity;
    if (TAIPING.has(prov)) {
      loss = prov === "浙江" ? 0.52 : 0.38;
      off = r() * 0.55;
    } else if (HUI.has(prov)) {
      loss = 0.35;
      off = 0.45 + r() * 0.35;
    } else if (FAMINE.has(prov)) {
      loss = 0.3;
      off = 0.75 + r() * 0.25;
    }
    return { ...projM(lon, lat), lon, lat, b, loss, off, j: r() };
  });
})();
const mapAlpha = (t: number) => Math.max(...MAP_ON.map(([a, b]) => vis(t, a, b, 0.5, 0.6)));
const drawFloor = (ctx: CanvasRenderingContext2D, t: number) => {
  const alpha = mapAlpha(t) * 0.85;
  if (alpha <= 0.01) return;
  const v = val(CUR(t));
  const scale = 0.3 + 0.7 * Math.min(1, v / 45000);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const d of DOTS) {
    if (d.y > H + 20 || d.x < -20 || d.x > W + 20) continue;
    let a = d.b * 1.15 - (1 - scale) * 0.75;
    if (a <= 0.02) continue;
    a = Math.min(1, a);
    let col = "255,222,160";
    let sz = 11 * d.s;
    for (const q of QING_CRASHES) {
      const t0 = q.t0 + d.off * q.d * 2.2;
      if (t < t0 || t > q.t0 + 7) continue;
      const dt = t - t0;
      if (dt < 0.3) {
        col = "255,246,235";
        a = Math.min(1, a + 0.5 * (1 - dt / 0.3));
        sz *= 1.5 - dt * 1.6;
      } else {
        col = ASH_RGB;
        a *= 1 - d.loss;
      }
    }
    ctx.fillStyle = `rgba(${col},${Math.min(1, a * 0.75) * alpha})`;
    ctx.fillRect(d.x - sz * 0.36, d.y - sz * 0.24, sz * 0.72, sz * 0.48);
  }
  ctx.restore();
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const L of MAP_LABELS) {
    const la = vis(t, L.t0, L.t1, 0.15, 0.3) * alpha;
    if (la <= 0) continue;
    const p = projM(L.lon, L.lat);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(1, 0.82);
    ctx.font = `900 ${Math.round(64 * p.s)}px ${SERIF}`;
    ctx.shadowColor = "rgba(0,0,0,0.9)";
    ctx.shadowBlur = 14;
    ctx.fillStyle = `rgba(245,247,246,${la})`;
    ctx.fillText(L.txt, 0, 0);
    ctx.restore();
  }
  ctx.restore();
};

// ---------------- paintings: unrolled bright for a moment, then they stay behind the chart as the era's backdrop
const ART_TOP = 640;
const ART_H = 470;
const drawArt = (ctx: CanvasRenderingContext2D, t: number) => {
  for (const a of ARTS) {
    if (t < a.t0 - 0.05 || t > a.t1 + 0.6) continue;
    const im = IMGS[a.src];
    if (!im) continue;
    const unroll = easeOut3((t - a.t0) / 0.45);
    const bright = t < a.t0 + 1.9 ? 1 : Math.max(0, 1 - (t - a.t0 - 1.9) / 0.7);
    const out = t > a.t1 ? 1 - (t - a.t1) / 0.6 : 1;
    const alpha = (0.2 + 0.62 * bright) * out;
    // cover-fit into the band, focus point = a.focus (vertical)
    const bandW = W;
    const ih = im.naturalHeight;
    const iw = im.naturalWidth;
    let sw: number;
    let sh: number;
    let sx: number;
    let sy: number;
    if (a.pan) {
      sh = ih;
      sw = (bandW / ART_H) * ih;
      const span = iw - sw;
      const p = clamp((t - a.t0) / Math.max(0.5, a.t1 - a.t0));
      sx = span * (0.08 + 0.6 * p);
      sy = 0;
    } else if (iw / ih > bandW / ART_H) {
      sh = ih;
      sw = (bandW / ART_H) * ih;
      sx = (iw - sw) / 2;
      sy = 0;
    } else {
      sw = iw;
      sh = (ART_H / bandW) * iw;
      sx = 0;
      sy = clamp(a.focus * ih - sh / 2, 0, ih - sh);
    }
    const zoom = 1 + 0.05 * clamp((t - a.t0) / 5);
    const half = (bandW / 2) * unroll;
    ctx.save();
    ctx.beginPath();
    ctx.rect(W / 2 - half, ART_TOP, half * 2, ART_H);
    ctx.clip();
    ctx.globalAlpha = alpha;
    ctx.filter = "sepia(0.35) saturate(0.85) brightness(0.9)";
    const dw = bandW * zoom;
    const dh = ART_H * zoom;
    ctx.drawImage(im, sx, sy, sw, sh, (W - dw) / 2, ART_TOP + (ART_H - dh) / 2, dw, dh);
    ctx.filter = "none";
    // feather the top and bottom edges into the dark
    const g1 = ctx.createLinearGradient(0, ART_TOP, 0, ART_TOP + 90);
    g1.addColorStop(0, "rgba(6,4,3,1)");
    g1.addColorStop(1, "rgba(6,4,3,0)");
    ctx.globalAlpha = 1;
    ctx.fillStyle = g1;
    ctx.fillRect(0, ART_TOP, W, 90);
    const g2 = ctx.createLinearGradient(0, ART_TOP + ART_H - 120, 0, ART_TOP + ART_H);
    g2.addColorStop(0, "rgba(6,4,3,0)");
    g2.addColorStop(1, "rgba(6,4,3,1)");
    ctx.fillStyle = g2;
    ctx.fillRect(0, ART_TOP + ART_H - 120, W, 120);
    // the scroll's rods while it unrolls
    if (unroll < 1) {
      ctx.fillStyle = "rgba(120,84,40,0.9)";
      ctx.fillRect(W / 2 - half - 7, ART_TOP + 20, 7, ART_H - 40);
      ctx.fillRect(W / 2 + half, ART_TOP + 20, 7, ART_H - 40);
    }
    ctx.restore();
    // caption while it is bright
    const ca = vis(t, a.t0 + 0.3, a.t0 + 2.2, 0.25, 0.4) * out;
    if (ca > 0) {
      ctx.save();
      ctx.globalAlpha = ca;
      text(ctx, a.title, W - 56, ART_TOP + ART_H - 52, 26, 900, SERIF, PAPER, { align: "right", glow: "rgba(0,0,0,0.95)", glowBlur: 12 });
      text(ctx, a.note, W - 56, ART_TOP + ART_H - 22, 20, 500, SERIF, SOFT, { align: "right", glow: "rgba(0,0,0,0.95)", glowBlur: 12 });
      ctx.restore();
    }
  }
};
// how much the chart steps back while a painting is bright
const artDim = (t: number) => {
  let d = 0;
  for (const a of ARTS) d = Math.max(d, vis(t, a.t0, a.t0 + 1.7, 0.3, 0.6));
  return d;
};

// ---------------- big brush characters behind the chart
const markPos = (n: number, i: number) => {
  if (n === 1) return { x: 330, y: 1010, s: 520 };
  if (n === 2) return { x: 250 + i * 330, y: 1010, s: 380 };
  return { x: 200 + i * 300, y: 1010, s: 300 };
};
const drawMarks = (ctx: CanvasRenderingContext2D, t: number) => {
  for (const m of MARKS) {
    if (t < m.t0 || t > m.t1 + 0.5) continue;
    m.chars.forEach((ch, i) => {
      const t0 = m.t0 + (m.chars.length === 3 ? i * 0.455 : 0);
      if (t < t0) return;
      const dt = t - t0;
      const out = t > m.t1 ? 1 - (t - m.t1) / 0.5 : 1;
      const a = (0.085 + 0.3 * Math.exp(-dt / 0.45)) * out * (1 - 0.5 * artDim(t));
      const p = markPos(m.chars.length, i);
      const wipe = easeOut3(dt / 0.35);
      ctx.save();
      ctx.beginPath();
      // diagonal brush wipe from the top-left
      const R = p.s * 1.2;
      ctx.moveTo(p.x - R, p.y - R);
      ctx.lineTo(p.x - R + 2 * R * wipe * 1.4, p.y - R);
      ctx.lineTo(p.x - R, p.y - R + 2 * R * wipe * 1.4);
      ctx.closePath();
      ctx.clip();
      text(ctx, ch, p.x, p.y + p.s * 0.36, p.s, 400, BRUSH, PAPER, { align: "center", alpha: a });
      ctx.restore();
    });
  }
  // the rewind: dynasties flash past as the line runs backwards
  for (const [i, [yr, ch]] of REWIND_MARKS.entries()) {
    const tc = REWIND_T[i];
    if (tc === undefined) continue;
    const dt = t - tc;
    if (dt < -0.02 || dt > 0.32) continue;
    const a = dt < 0 ? 0.6 : 0.6 * (1 - dt / 0.32);
    text(ctx, ch, 540, 1080, 380 + dt * 200, 400, BRUSH, PAPER, { align: "center", alpha: a });
    void yr;
  }
};
const REWIND_T: number[] = REWIND_MARKS.map(([yr]) => {
  for (let f = Math.round(F(5.58) * 30); f <= Math.round(LAND * 30); f++) if (CUR(f / 30) <= yr) return f / 30;
  return LAND;
});

// ---------------- chart: bamboo slips + brush line (straight between counts)
const LOD = [1, 2, 5, 10, 25, 50, 100];
const drawChart = (ctx: CanvasRenderingContext2D, t: number, alpha: number, pass: "slips" | "line") => {
  if (alpha <= 0) return;
  const k = camAt(t);
  const p = ppy(k);
  const c = k.c;
  const x0 = Math.max(FIRST, c - k.span * k.hx * 1.12);
  const dim = 1 - 0.55 * artDim(t);
  ctx.save();
  ctx.globalAlpha = alpha;
  // grid (labels only above the information block)
  if (pass === "slips" && (!ending(t) || t < END_T + 0.6)) {
    const rg = k.hi - k.lo;
    const step = rg > 60000 ? 20000 : rg > 25000 ? 10000 : rg > 12000 ? 5000 : rg > 5000 ? 2000 : 1000;
    ctx.globalAlpha = alpha * (1 - clamp((t - END_T) / 0.6));
    for (let v = Math.ceil(k.lo / step) * step; v < k.hi; v += step) {
      const y = Yv(k, v);
      ctx.fillStyle = "rgba(200,190,160,0.07)";
      ctx.fillRect(0, y, W, 1);
      if (y < 1210 && y > Y_TOP - 60) text(ctx, v >= 10000 ? `${(v / 10000).toFixed(v % 10000 ? 1 : 0)} 亿` : `${v / 1000} 千万`, 22, y - 10, 21, 700, SERIF, "rgba(190,180,160,0.42)");
    }
    ctx.globalAlpha = alpha;
  }
  // slips, grouped when the camera is far out
  let N = LOD[LOD.length - 1];
  for (const n of LOD)
    if (n * p >= 6) {
      N = n;
      break;
    }
  const yStart = Math.floor(x0 / N) * N;
  for (let y = yStart; pass === "slips" && y <= c; y += N) {
    const ya = Math.max(FIRST, y);
    const yb = Math.min(y + N, c);
    if (yb <= ya - 0.001 && N > 1) continue;
    const yc = N === 1 ? y : yb;
    if (yc < FIRST) continue;
    const v = val(yc);
    const x = N === 1 ? X(k, y) : (X(k, ya) + X(k, yb)) / 2;
    const top = Yv(k, v);
    const kind = kindAt(yc);
    const up = N === 1 ? v >= val(y - 1) - 0.01 : val(yb) >= val(ya) - 0.01;
    const rgb = up ? GOLD_RGB : ASH_RGB;
    const w = Math.max(1.4, N * p * 0.7);
    const bottom = Math.min(1640, top + 420);
    if (kind === "un" || gapAt(N === 1 ? y - 0.5 : (ya + yb) / 2)) {
      ctx.strokeStyle = `rgba(${rgb},${(kind === "un" ? 0.3 : 0.15) * dim})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(x - w / 2, top, w, bottom - top);
      continue;
    }
    const grd = ctx.createLinearGradient(0, top, 0, bottom);
    const k0 = (kind === "est" ? 0.26 : 0.36) * dim;
    grd.addColorStop(0, `rgba(${rgb},${k0})`);
    grd.addColorStop(0.3, `rgba(${rgb},${k0 * 0.35})`);
    grd.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = grd;
    ctx.fillRect(x - w / 2, top, w, bottom - top);
    ctx.fillStyle = `rgba(${up ? GOLD_HI : ASH_HI},${0.8 * dim})`;
    ctx.fillRect(x - w / 2, top - 1, w, 2.5);
  }
  // the Ming register: flat for two centuries while the real population climbed
  if (pass === "line" && c > 1381 && c < 1700 && !ending(t)) {
    const ra = clamp((1700 - c) / 30);
    ctx.save();
    ctx.globalAlpha = alpha * ra;
    ctx.setLineDash([4, 7]);
    ctx.strokeStyle = "rgba(245,240,225,0.85)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    let last: [number, number] | null = null;
    for (const [y, v] of MING_REG) {
      if (y > c) break;
      const px = X(k, y);
      const py = Yv(k, v);
      if (last) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
      last = [px, py];
    }
    ctx.stroke();
    ctx.setLineDash([]);
    if (last) text(ctx, "户口册", last[0] + 12, last[1] + 8, 26, 900, SERIF, "rgba(245,240,225,0.92)", { glow: "rgba(0,0,0,0.9)", glowBlur: 10 });
    ctx.restore();
  }
  // the brush line: one straight stroke per pair of counts
  const ys: number[] = [x0];
  for (const q of SERIES) if (q.y > x0 && q.y < c) ys.push(q.y);
  ys.push(c);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = 1; pass === "line" && i < ys.length; i++) {
    const ya = ys[i - 1];
    const yb = ys[i];
    if (yb - ya < 1e-6) continue;
    const xa = X(k, ya);
    const xb = X(k, yb);
    if (xb < -40 || xa > W + 40) continue;
    const pa = Yv(k, val(ya));
    const pb = Yv(k, val(yb));
    const g = gapAt((ya + yb) / 2);
    const up = pb <= pa + 0.01;
    const kind = kindAt(yb);
    if (g || kind === "un") {
      ctx.setLineDash(kind === "un" ? [8, 9] : [15, 10]);
      ctx.strokeStyle = kind === "un" ? `rgba(${ASH_RGB},0.75)` : up ? `rgba(${GOLD_HI},0.85)` : `rgba(${ASH_HI},0.85)`;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(xa, pa);
      ctx.lineTo(xb, pb);
      ctx.stroke();
      ctx.setLineDash([]);
      continue;
    }
    const dx = xb - xa;
    const dy = pb - pa;
    const len = Math.max(1, Math.hypot(dx, dy));
    const wd = 4 + 6 * Math.min(1, Math.abs(dy) / len);
    ctx.strokeStyle = up ? `rgba(${GOLD_HI},0.97)` : `rgba(${ASH_HI},0.97)`;
    ctx.shadowColor = up ? GOLD : ASH;
    ctx.shadowBlur = 12;
    ctx.lineWidth = wd;
    ctx.beginPath();
    ctx.moveTo(xa, pa);
    ctx.lineTo(xb, pb);
    ctx.stroke();
    ctx.shadowBlur = 0;
    if (len > 8) {
      // dry-brush hairs along the stroke
      const nx = -dy / len;
      const ny = dx / len;
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = up ? `rgba(${GOLD_RGB},0.38)` : `rgba(${ASH_RGB},0.38)`;
      for (const off of [-0.95, 0.85, 1.35]) {
        ctx.beginPath();
        ctx.moveTo(xa + nx * wd * off, pa + ny * wd * off);
        ctx.lineTo(xb + nx * wd * off, pb + ny * wd * off);
        ctx.stroke();
      }
    }
  }
  // 公元 2 年 base line
  const ba = vis(t, LAND + 0.1, F(12.02) - 0.6, 0.3, 0.6);
  if (pass === "line" && ba > 0) {
    const y = Yv(k, 5959.4);
    ctx.strokeStyle = `rgba(${GOLD_RGB},${0.75 * ba})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([2, 6]);
    ctx.beginPath();
    ctx.moveTo(X(k, 2) - 40, y);
    ctx.lineTo(X(k, 2) + (W - X(k, 2) + 40) * ease((t - LAND - 0.1) / 0.5), y);
    ctx.stroke();
    ctx.setLineDash([]);
    text(ctx, "基点 5,959 万", W - 60, y - 18, 26, 700, SERIF, `rgba(${GOLD_RGB},${ba})`, { align: "right" });
  }
  ctx.restore();
};

// ---------------- speed: streaks behind the head when the years fly
const drawStreaks = (ctx: CanvasRenderingContext2D, t: number) => {
  const sp = SPEED(t) * (972 / SPAN(t)) * 0.12; // screen speed, scaled to the old years/s feel
  if (sp < 70 || ending(t)) return;
  const dir = CUR(t) >= CUR(t - 1 / 30) ? 1 : -1;
  const h = headAt(t);
  const r = rng(Math.round(t * 30) * 31 + 7);
  const n = Math.min(56, Math.round(sp / 7));
  const a = Math.min(0.6, sp / 650);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < n; i++) {
    const y = Y_TOP - 80 + r() * (Y_BOT - Y_TOP + 260);
    const len = Math.min(760, sp * (0.5 + r() * 0.9));
    const x1 = h.x - dir * (40 + r() * 160);
    const x2 = x1 - dir * len;
    const g = ctx.createLinearGradient(x1, 0, x2, 0);
    const col = dir > 0 ? GOLD_HI : ASH_HI;
    g.addColorStop(0, `rgba(${col},${a * (0.4 + r() * 0.6)})`);
    g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(Math.min(x1, x2), y, Math.abs(x2 - x1), 1 + r() * 2);
  }
  ctx.restore();
};

// ---------------- head
const drawHead = (ctx: CanvasRenderingContext2D, t: number, alpha: number) => {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 14; i++) {
    const tb = Math.floor(t * 30) / 30 - i / 30;
    if (tb < 0 || (t >= LAND && tb < LAND)) continue;
    const hb = headAt(tb);
    const r = rng(Math.round(tb * 30) * 7 + 3);
    for (let j = 0; j < 3; j++) {
      const dt = t - tb;
      const x = hb.x + (r() - 0.7) * 200 * dt;
      const y = hb.y + (r() - 0.6) * 240 * dt + 240 * dt * dt;
      const a = (1 - dt / 0.5) * 0.8 * alpha;
      if (a <= 0) continue;
      ctx.fillStyle = hb.up ? `rgba(${GOLD_HI},${a})` : `rgba(${ASH_HI},${a})`;
      ctx.fillRect(x, y, 2.5, 2.5);
    }
  }
  const h = headAt(t);
  const rgb = h.up ? GOLD_RGB : ASH_RGB;
  const g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, 90);
  g.addColorStop(0, `rgba(255,255,255,${0.95 * alpha})`);
  g.addColorStop(0.08, `rgba(${rgb},${0.9 * alpha})`);
  g.addColorStop(0.35, `rgba(${rgb},${0.2 * alpha})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(h.x - 90, h.y - 90, 180, 180);
  ctx.restore();
};

// ---------------- hits: blood ink (three massacres), ash, gold sparks, the 2022 turn
const HIT_AT = HITS.map((h) => ({ ...h, y: CUR(h.t) }));
const anchor = (t: number, year: number) => {
  const k = camAt(t);
  return { x: X(k, year), y: Yv(k, val(year)) };
};
const blobPath = (ctx: CanvasRenderingContext2D, x: number, y: number, R: number, seed: number, fingers: number, scale = 1) => {
  const r = rng(seed);
  const ph = [r() * 6.28, r() * 6.28, r() * 6.28];
  const fg = Array.from({ length: 5 }, () => ({ a: r() * Math.PI * 2, l: 0.18 + r() * 0.3, w: 0.12 + r() * 0.1 }));
  ctx.beginPath();
  const N = 140;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    let n = 1 + 0.08 * Math.sin(a * 5 + ph[0]) + 0.05 * Math.sin(a * 9 + ph[1]) + 0.03 * Math.sin(a * 17 + ph[2]);
    for (const f of fg) {
      let da = Math.abs(a - f.a);
      da = Math.min(da, Math.PI * 2 - da);
      n += fingers * f.l * Math.exp(-(da * da) / (f.w * f.w));
    }
    const rr = R * n * scale;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr * 0.84;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.closePath();
};
const drawHits = (ctx: CanvasRenderingContext2D, t: number, which: "blood" | "other") => {
  HIT_AT.forEach((h, hi) => {
    const dt = t - h.t;
    if ((h.kind === "blood") !== (which === "blood")) return;
    if (h.kind === "blood") {
      if (dt < -0.22 || dt > 5.4) return;
      const P = anchor(t, h.y);
      const sz = h.size ?? 1;
      if (dt < 0) {
        // one drop falls onto the bottom of the crash
        const q = (dt + 0.22) / 0.22;
        const y = P.y - 190 * (1 - q * q);
        ctx.save();
        ctx.fillStyle = "rgba(150,16,26,0.95)";
        ctx.beginPath();
        ctx.ellipse(P.x, y, 5.5 * sz, (8 + 14 * q) * sz, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }
      // then it soaks outwards, slowly, like ink on paper
      const R = 92 * sz * (1 - Math.exp(-dt / 0.42)) + 6;
      const fing = 1 - Math.exp(-dt / 1.1);
      const fade = (dt < 2.6 ? 1 : Math.max(0, 1 - (dt - 2.6) / 2.6)) * (h.t < LAND && t > F(5.58) ? Math.max(0, 1 - (t - F(5.58)) / 0.45) : 1);
      const seed = 400 + hi * 13;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.filter = "blur(16px)";
      blobPath(ctx, P.x, P.y, R * (0.9 + 0.25 * fing), seed, fing, 1.3);
      ctx.fillStyle = "rgba(165,18,30,0.3)";
      ctx.fill();
      ctx.filter = "blur(2px)";
      blobPath(ctx, P.x, P.y, R, seed, fing);
      const g = ctx.createRadialGradient(P.x, P.y, 0, P.x, P.y, R * 1.25 + 1);
      g.addColorStop(0, "rgba(88,6,14,0.94)");
      g.addColorStop(0.6, "rgba(128,12,24,0.9)");
      g.addColorStop(1, "rgba(160,22,34,0.86)");
      ctx.fillStyle = g;
      ctx.fill();
      ctx.filter = "none";
      ctx.lineWidth = 2;
      ctx.strokeStyle = `rgba(52,3,8,${0.5 * Math.min(1, dt / 0.6)})`;
      ctx.stroke();
      const r = rng(seed + 5);
      for (let i = 0; i < 6; i++) {
        const a = r() * Math.PI * 2;
        const d = R * (1.15 + r() * 0.5);
        const s = (1.5 + r() * 2.2) * sz * Math.min(1, dt / 0.3);
        ctx.fillStyle = "rgba(140,14,26,0.8)";
        ctx.beginPath();
        ctx.arc(P.x + Math.cos(a) * d, P.y + Math.sin(a) * d * 0.84, s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else if (h.kind === "ash") {
      if (dt < 0 || dt > 3.2) return;
      const P = anchor(t, h.y);
      const r = rng(700 + hi * 17);
      ctx.save();
      // a slow grey puff
      const pr = 40 + 150 * easeOut3(dt / 1.6);
      const pg = ctx.createRadialGradient(P.x, P.y, 0, P.x, P.y, pr);
      pg.addColorStop(0, `rgba(200,200,196,${0.22 * (1 - dt / 3.2)})`);
      pg.addColorStop(1, "rgba(200,200,196,0)");
      ctx.fillStyle = pg;
      ctx.fillRect(P.x - pr, P.y - pr, pr * 2, pr * 2);
      // ash flakes rising
      for (let i = 0; i < 70; i++) {
        const life = 1.6 + r() * 1.6;
        const x0 = (r() - 0.5) * 120;
        const vy = 40 + r() * 90;
        const ph = r() * 6.28;
        const s = 1.6 + r() * 3.8;
        const g = 150 + Math.floor(r() * 90);
        if (dt > life) continue;
        const x = P.x + x0 * (1 + dt) + Math.sin(dt * 2.4 + ph) * 18;
        const y = P.y - vy * dt + 10 * Math.sin(dt * 3 + ph);
        ctx.fillStyle = `rgba(${g},${g},${g - 6},${0.85 * (1 - dt / life)})`;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ph + dt * 2);
        ctx.fillRect(-s / 2, -s / 3, s, (s * 2) / 3);
        ctx.restore();
      }
      ctx.restore();
    } else if (h.kind === "gold") {
      if (dt < 0 || dt > 1.3) return;
      const P = anchor(t, h.y);
      const r = rng(100 + hi);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 80; i++) {
        const ang = r() * Math.PI * 2;
        const sp = 520 * (0.25 + r() * 0.85);
        const life = 1.3 * (0.45 + r() * 0.55);
        if (dt > life) continue;
        const drag = Math.exp(-dt * 2.4);
        const x = P.x + (Math.cos(ang) * sp * (1 - drag)) / 2.4;
        const y = P.y + (Math.sin(ang) * sp * (1 - drag)) / 2.4 + 70 * dt * dt;
        ctx.fillStyle = `rgba(${GOLD_HI},${1 - dt / life})`;
        const s = 2 + r() * 3;
        ctx.fillRect(x, y, s, s);
      }
      ctx.restore();
    } else if (h.kind === "turn") {
      if (dt < 0 || dt > 1.6) return;
      const P = anchor(t, 2021);
      ctx.save();
      for (const d0 of [0, 0.25]) {
        const d = dt - d0;
        if (d < 0) continue;
        ctx.strokeStyle = `rgba(${ASH_HI},${0.7 * (1 - d / 1.35)})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(P.x, P.y, 14 + 170 * easeOut3(d / 1.35), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  });
};

// ---------------- top-right: the dynasty card with its territory, the world table, the births/deaths chart
type Part = { n: string; r: [number, number][][] };
const TERR = TERRJ as unknown as Record<string, Part[]>;
const ERA_OF = (y: number) =>
  y < 9 ? "xihan" : y < 220 ? "donghan" : y < 280 ? "sanguo" : y < 317 ? "jin" : y < 589 ? "nanbei" : y < 618 ? "sui" : y < 756 ? "tang" : y < 960 ? "tang2" : y < 1127 ? "song" : y < 1279 ? "songjin" : y < 1368 ? "yuan" : y < 1644 ? "ming" : y < 1683 ? "qing1" : "qing2";
const CAPS: Record<string, [string, number, number][]> = {
  xihan: [["长安", 108.94, 34.34]], donghan: [["洛阳", 112.45, 34.62]], sanguo: [["洛阳", 112.45, 34.62], ["成都", 104.07, 30.67], ["建业", 118.8, 32.06]],
  jin: [["洛阳", 112.45, 34.62]], nanbei: [["平城", 113.3, 40.08], ["建康", 118.8, 32.06]], sui: [["大兴", 108.94, 34.34]], tang: [["长安", 108.94, 34.34]],
  tang2: [["长安", 108.94, 34.34]], song: [["开封", 114.3, 34.8]], songjin: [["临安", 120.15, 30.27], ["中都", 116.4, 39.9]], yuan: [["大都", 116.4, 39.9]],
  ming: [["北京", 116.4, 39.9]], qing1: [["北京", 116.4, 39.9]], qing2: [["北京", 116.4, 39.9]],
};
const TR_X = 640;
const TR_Y = 430;
const TR_W = 396;
const MM_Y = 512;
const MM_H = 214;
const MLON0 = 72;
const MLAT1 = 53.5;
const MS = TR_W / 70;
const mmx = (lon: number) => TR_X + (lon - MLON0) * MS;
const mmy = (lat: number) => MM_Y + (MLAT1 - lat) * MS;
let DOTL: { grey: HTMLCanvasElement; gold: HTMLCanvasElement } | null = null;
const dotLayers = () => {
  if (DOTL) return DOTL;
  const mk = (rgb: string, k: number) => {
    const cv = document.createElement("canvas");
    cv.width = W;
    cv.height = 800;
    const c = cv.getContext("2d")!;
    for (const d of DOTS) {
      const a = clamp(0.12 + d.b * 0.9) * k;
      c.fillStyle = `rgba(${rgb},${a})`;
      c.fillRect(mmx(d.lon) - 0.8, mmy(d.lat) - 0.8, 1.6, 1.6);
    }
    return cv;
  };
  DOTL = { grey: mk("150,145,132", 0.45), gold: mk(GOLD_HI, 1) };
  return DOTL;
};
const terrPath = (ctx: CanvasRenderingContext2D, part: Part) => {
  ctx.beginPath();
  for (const ring of part.r) {
    ring.forEach(([lon, lat], i) => (i ? ctx.lineTo(mmx(lon), mmy(lat)) : ctx.moveTo(mmx(lon), mmy(lat))));
    ctx.closePath();
  }
};
// the three kingdoms light up one per hit
const partLight = (era: string, i: number, t: number) => (era === "sanguo" ? clamp((t - (F(22.18) + i * 0.455)) / 0.15) : 1);
const drawTerritory = (ctx: CanvasRenderingContext2D, era: string, a: number, t: number) => {
  const L = dotLayers();
  const parts = TERR[era] ?? [];
  parts.forEach((part, i) => {
    const pl = partLight(era, i, t);
    if (pl <= 0) return;
    ctx.save();
    terrPath(ctx, part);
    ctx.clip();
    ctx.globalAlpha = a * pl * (parts.length > 1 ? [1, 0.75, 0.55][i % 3] : 1);
    ctx.drawImage(L.gold, 0, 0);
    ctx.fillStyle = `rgba(255,200,110,${0.1 * a * pl})`;
    ctx.fillRect(TR_X, MM_Y, TR_W, MM_H);
    ctx.restore();
    ctx.save();
    terrPath(ctx, part);
    ctx.strokeStyle = `rgba(255,220,160,${0.75 * a * pl})`;
    ctx.lineWidth = 1.6;
    ctx.shadowColor = "rgba(255,190,90,0.8)";
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.restore();
    if (part.n) {
      // label at the part's centre of mass
      let sx = 0;
      let sy = 0;
      let n = 0;
      for (const ring of part.r)
        for (const [lon, lat] of ring) {
          sx += lon;
          sy += lat;
          n++;
        }
      if (n) text(ctx, part.n, mmx(sx / n), mmy(sy / n) + 9, 26, 900, SERIF, PAPER, { align: "center", alpha: a * pl, glow: "rgba(0,0,0,0.95)", glowBlur: 8 });
    }
  });
  for (const [name, lon, lat] of CAPS[era] ?? []) {
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = SEAL;
    ctx.fillRect(mmx(lon) - 4, mmy(lat) - 4, 8, 8);
    ctx.restore();
    if ((CAPS[era] ?? []).length === 1) text(ctx, name, mmx(lon) + 9, mmy(lat) + 6, 18, 700, SERIF, SOFT, { alpha: a, glow: "rgba(0,0,0,0.95)", glowBlur: 6 });
  }
};
const sealBox = (ctx: CanvasRenderingContext2D, chars: string, x: number, y: number, s: number, rot: number, fill: string, ink: string, alpha = 1) => {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.fillStyle = fill;
  ctx.beginPath();
  (ctx as any).roundRect(-s / 2, -s / 2, s, s, s * 0.08);
  ctx.fill();
  ctx.strokeStyle = "rgba(20,8,6,0.5)";
  ctx.lineWidth = Math.max(1, s * 0.018);
  ctx.strokeRect(-s * 0.4, -s * 0.4, s * 0.8, s * 0.8);
  const ch = [...chars];
  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (ch.length === 1) {
    ctx.font = `900 ${s * 0.62}px ${SERIF}`;
    ctx.fillText(ch[0], 0, s * 0.03);
  } else if (ch.length === 2) {
    ctx.font = `900 ${s * 0.38}px ${SERIF}`;
    ctx.fillText(ch[0], 0, -s * 0.19);
    ctx.fillText(ch[1], 0, s * 0.21);
  } else {
    ctx.font = `900 ${s * 0.33}px ${SERIF}`;
    ctx.fillText(ch[0], s * 0.19, -s * 0.19);
    ctx.fillText(ch[1], s * 0.19, s * 0.21);
    ctx.font = `900 ${s * 0.5}px ${SERIF}`;
    ctx.fillText(ch[2], -s * 0.2, s * 0.02);
  }
  ctx.restore();
};
// dynasty changes, skipping dynasties that only flash past during a rush
const DYN_CHANGES = (() => {
  const raw: { t: number; i: number }[] = [];
  let last = -1;
  for (let f = Math.round(LAND * 30); f < Math.round(END_T * 30); f++) {
    const i = DYNS.indexOf(dynAt(CUR(f / 30)));
    if (i !== last) {
      raw.push({ t: f / 30, i });
      last = i;
    }
  }
  return raw.filter((c, j) => j === raw.length - 1 || raw[j + 1].t - c.t >= 0.45);
})();
const ERA_CHANGES = (() => {
  const raw: { t: number; e: string }[] = [];
  let last = "";
  for (let f = Math.round(LAND * 30); f < Math.round(END_T * 30); f++) {
    const e = ERA_OF(CUR(f / 30));
    if (e !== last) {
      raw.push({ t: f / 30, e });
      last = e;
    }
  }
  return raw.filter((c, j) => j === raw.length - 1 || raw[j + 1].t - c.t >= 0.45);
})();
const T1741 = (() => {
  for (let f = Math.round(LAND * 30); f < Math.round(END_T * 30); f++) if (CUR(f / 30) >= 1741) return f / 30;
  return END_T;
})();
const T1949 = (() => {
  for (let f = Math.round(LAND * 30); f < Math.round(END_T * 30); f++) if (CUR(f / 30) >= 1949) return f / 30;
  return END_T;
})();
const yrs = (y: number) => (y < 0 ? `前 ${-y}` : y > 2030 ? "今" : String(y));
const drawDynCard = (ctx: CanvasRenderingContext2D, t: number, a: number) => {
  const ch = [...DYN_CHANGES].reverse().find((c) => t >= c.t);
  if (!ch) return;
  const d = DYNS[ch.i];
  const dt = t - ch.t;
  const k = clamp(dt / 0.14);
  const s = 1.7 - 0.7 * easeOut3(k);
  ctx.save();
  ctx.globalAlpha = a;
  sealBox(ctx, d.seal, TR_X + 30, TR_Y + 30, 58 * s, -5, SEAL, "#140806", 0.4 + 0.6 * k);
  text(ctx, d.n, TR_X + 76, TR_Y + 44, 40, 900, SERIF, PAPER, { maxW: 200 });
  text(ctx, `${yrs(d.a)} — ${yrs(d.b)}`, TR_X + TR_W, TR_Y + 24, 21, 700, SERIF, MUTED, { align: "right" });
  if (d.cap) text(ctx, d.cap, TR_X + TR_W, TR_Y + 52, 20, 500, SERIF, MUTED, { align: "right", maxW: 170 });
  // the map frame (corner marks only)
  ctx.strokeStyle = "rgba(255,207,92,0.45)";
  ctx.lineWidth = 1.5;
  const cm = (x: number, y: number, dx: number, dy: number) => {
    ctx.beginPath();
    ctx.moveTo(x + dx * 18, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + dy * 18);
    ctx.stroke();
  };
  cm(TR_X - 6, MM_Y - 6, 1, 1);
  cm(TR_X + TR_W + 6, MM_Y - 6, -1, 1);
  cm(TR_X - 6, MM_Y + MM_H + 6, 1, -1);
  cm(TR_X + TR_W + 6, MM_Y + MM_H + 6, -1, -1);
  ctx.save();
  ctx.beginPath();
  ctx.rect(TR_X - 4, MM_Y - 4, TR_W + 8, MM_H + 8);
  ctx.clip();
  ctx.fillStyle = "rgba(8,6,4,0.55)";
  ctx.fillRect(TR_X - 4, MM_Y - 4, TR_W + 8, MM_H + 8);
  ctx.drawImage(dotLayers().grey, 0, 0);
  const ec = [...ERA_CHANGES].reverse().find((c) => t >= c.t);
  if (ec) {
    const j = ERA_CHANGES.indexOf(ec);
    const kk = clamp((t - ec.t) / 0.45);
    if (j > 0 && kk < 1) drawTerritory(ctx, ERA_CHANGES[j - 1].e, 1 - kk, t);
    drawTerritory(ctx, ec.e, kk, t);
  }
  ctx.restore();
  text(ctx, "疆域示意", TR_X + TR_W - 4, MM_Y + MM_H - 8, 16, 500, SERIF, "rgba(165,159,143,0.75)", { align: "right" });
  ctx.restore();
};
const WT = WTOP as unknown as Record<string, [string, number][]>;
const drawWorld = (ctx: CanvasRenderingContext2D, t: number, a: number) => {
  const c = CUR(t);
  const y = Math.max(1740, Math.min(2100, Math.floor(c)));
  const rows: [string, number][] = ([["中国", val(c)] as [string, number], ...(WT[String(y)] ?? [])] as [string, number][]).sort((p, q) => q[1] - p[1]).slice(0, 5);
  ctx.save();
  ctx.globalAlpha = a;
  text(ctx, "同年 · 世界人口", TR_X, TR_Y + 30, 27, 900, SERIF, GOLD);
  text(ctx, "今国界", TR_X + TR_W, TR_Y + 30, 17, 500, SERIF, "#8a8478", { align: "right" });
  ctx.fillStyle = "rgba(255,207,92,0.6)";
  ctx.fillRect(TR_X, TR_Y + 42, TR_W, 1);
  rows.forEach(([n, v], i) => {
    const cn = n === "中国";
    const yy = TR_Y + 84 + i * 44;
    text(ctx, n, TR_X, yy, 26, 900, SERIF, cn ? PAPER : "#a8a293", { maxW: 150 });
    text(ctx, fmtPop(v), TR_X + TR_W, yy, 24, 700, SERIF, cn ? PAPER : "#a8a293", { align: "right" });
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.fillRect(TR_X, yy + 13, TR_W, 1);
  });
  ctx.restore();
};
const BD = (DATA as any).china as { y: number; b: number; d: number }[];
const drawBD = (ctx: CanvasRenderingContext2D, t: number, a: number) => {
  const c = Math.min(2025, CUR(t));
  const X0 = TR_X;
  const Y0 = TR_Y + 50;
  const Wd = TR_W;
  const Ht = 200;
  ctx.save();
  ctx.globalAlpha = a;
  text(ctx, "每年出生", X0, TR_Y + 30, 26, 900, SERIF, GOLD);
  text(ctx, "/ 死亡", X0 + 110, TR_Y + 30, 26, 900, SERIF, ASH);
  text(ctx, "万人", X0 + TR_W, TR_Y + 30, 18, 500, SERIF, MUTED, { align: "right" });
  const bx = (y: number) => X0 + ((y - 1949) / 76) * Wd;
  const by = (v: number) => Y0 + Ht - (v / 3000) * Ht;
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(X0, Y0 + Ht, Wd, 1);
  for (const r of BD) {
    if (r.y > c) break;
    ctx.fillStyle = r.b >= r.d ? "rgba(255,207,92,0.85)" : "rgba(245,247,246,0.85)";
    ctx.fillRect(bx(r.y) - 2, by(r.b), 4, Y0 + Ht - by(r.b));
  }
  ctx.strokeStyle = ASH;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  BD.filter((r) => r.y <= c).forEach((r, i) => (i ? ctx.lineTo(bx(r.y), by(r.d)) : ctx.moveTo(bx(r.y), by(r.d))));
  ctx.stroke();
  const last = BD.filter((r) => r.y <= c).pop();
  if (last) {
    text(ctx, `出生 ${fmtWan(last.b)} 万`, Math.min(bx(last.y) + 6, X0 + Wd - 118), by(last.b) - 8, 20, 700, SERIF, GOLD);
    if (last.y >= 2022) text(ctx, "死亡 > 出生", X0 + Wd, by(1300), 22, 900, SERIF, WHITE, { align: "right" });
  }
  text(ctx, "1949", X0, Y0 + Ht + 24, 16, 500, SERIF, MUTED);
  text(ctx, "2025", X0 + Wd, Y0 + Ht + 24, 16, 500, SERIF, MUTED, { align: "right" });
  ctx.restore();
};
const drawTopRight = (ctx: CanvasRenderingContext2D, t: number) => {
  const fade = 1 - clamp((t - END_T) / 0.5);
  if (fade <= 0) return;
  if (t < F(5.58)) {
    drawWorld(ctx, t, vis(t, 0, HOOK.t0 - 0.15, 0.2, 0.15));
    return;
  }
  if (t < LAND) return;
  const aIn = clamp((t - LAND) / 0.35);
  if (t < T1741) drawDynCard(ctx, t, aIn * fade * (1 - clamp((t - (T1741 - 0.3)) / 0.3)));
  else if (t < T1949) drawWorld(ctx, t, fade * clamp((t - T1741) / 0.3) * (1 - clamp((t - (T1949 - 0.3)) / 0.3)));
  else drawBD(ctx, t, fade * clamp((t - T1949) / 0.35));
};

// ---------------- header (top-left)
const KIND_LABEL = { rec: "户口登记", est: "学者估算", stat: "国家统计局", un: "联合国预测" } as const;
const drawHeader = (ctx: CanvasRenderingContext2D, t: number) => {
  const fade = 1 - clamp((t - END_T) / 0.6);
  if (fade <= 0) return;
  ctx.save();
  ctx.globalAlpha = fade;
  const logo = IMGS["mark-disc.png"];
  if (logo) ctx.drawImage(logo, 58, 150, 50, 50);
  const w1 = text(ctx, "世界的形状", 120, 186, 30, 900, SANS, "#f3f4f7", { ls: 2 });
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(120 + w1 + 14, 163, 2, 26);
  text(ctx, "两千年中国人口", 120 + w1 + 30, 188, 34, 900, SERIF, GOLD, { ls: 2 });
  const c = CUR(t);
  const v = val(c);
  const sp = SPEED(t);
  const d = dynAt(c);
  const reign = reignAt(c);
  const rw = rewinding(t);
  const era = rw ? "回到……" : sp > 60 ? d.n : `${d.n}${reign ? " · " + reign : ""}　${ganzhi(c)}年`;
  text(ctx, era, 58, 252, 27, 700, SERIF, "#b9b2a0", { maxW: 380 });
  // the year (fixed digit cells)
  const yNum = Math.max(1, Math.floor(c));
  let x = 58;
  if (yNum < 1000) x += text(ctx, "公元", 58, 360, 44, 900, SERIF, PAPER) + 6;
  const blur = Math.min(3, sp / 250);
  if (blur > 0.4) ctx.filter = `blur(${blur.toFixed(1)}px)`;
  x += tabular(ctx, String(yNum), x, 360, 118, PAPER);
  ctx.filter = "none";
  text(ctx, "年", x + 4, 360, 42, 900, SERIF, PAPER);
  // the population
  const slope = val(c) - val(c - 0.5);
  const col = slope < -0.5 ? ASH : GOLD;
  const num = v >= 10000 ? (v / 10000).toFixed(2) : fmtWan(v);
  const nx = 470;
  if (!rw) {
    const nw = tabular(ctx, num, nx, 344, 76, col, { glow: col + "55" });
    text(ctx, v >= 10000 ? "亿人" : "万人", nx + nw + 6, 344, 30, 900, SERIF, col);
    const g = gapAt(c);
    const chip = g ? `两次统计相隔 ${g.b.y - g.a.y} 年` : KIND_LABEL[kindAt(c)];
    ctx.font = `700 21px ${SERIF}`;
    const cw = ctx.measureText(chip).width + 22;
    ctx.strokeStyle = g ? "rgba(231,217,184,0.5)" : "rgba(154,147,132,0.45)";
    ctx.lineWidth = 1;
    ctx.strokeRect(nx + 2, 362, cw, 32);
    text(ctx, chip, nx + 13, 386, 21, 700, SERIF, g ? "#e7d9b8" : "#9a9384");
  }
  ctx.restore();
};

// ---------------- gold milestone stamps (一亿 … 十四亿)
const drawStamps = (ctx: CanvasRenderingContext2D, t: number) => {
  const ms = MILESTONES.filter((m) => t >= m.t && t < m.t + 1.5).pop();
  if (!ms || ending(t)) return;
  const nxt = MILESTONES.find((m) => m.t > ms.t);
  const dt = t - ms.t;
  const k = clamp(dt / 0.13);
  const s = 1.8 - 0.8 * easeOut3(k);
  const end = Math.min(ms.t + 1.5, nxt ? nxt.t : 1e9);
  const out = t > end - 0.25 ? clamp((end - t) / 0.25) : 1;
  sealBox(ctx, `${CN_NUM[ms.n]}亿`, 930, 312, 104 * s, 7, "#d9a93a", "#1a1006", (0.35 + 0.65 * k) * out);
};

// ---------------- bottom-left information block
const INFO_X = 58;
const INFO_BOTTOM = 1548;
const INFO_W = 660;
const person = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, col: string) => {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(x, y - 78 * s, 11 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 17 * s, y - 52 * s);
  ctx.quadraticCurveTo(x - 17 * s, y - 64 * s, x, y - 64 * s);
  ctx.quadraticCurveTo(x + 17 * s, y - 64 * s, x + 17 * s, y - 52 * s);
  ctx.lineTo(x + 17 * s, y - 26 * s);
  ctx.lineTo(x + 10 * s, y - 26 * s);
  ctx.lineTo(x + 10 * s, y);
  ctx.lineTo(x - 10 * s, y);
  ctx.lineTo(x - 10 * s, y - 26 * s);
  ctx.lineTo(x - 17 * s, y - 26 * s);
  ctx.closePath();
  ctx.fill();
};
const drawInfo = (ctx: CanvasRenderingContext2D, t: number) => {
  for (const I of INFOS) {
    const a = vis(t, I.t0, I.t1 - 0.1, 0.06, 0.1);
    if (a <= 0) continue;
    const tone = I.tone === "gold" ? GOLD : ASH;
    type Line = { s: string; size: number; weight: number; fam: string; color: string; gap: number; at: number; big?: boolean; ls?: number };
    const lines: Line[] = [];
    lines.push({ s: I.tag, size: 26, weight: 700, fam: SERIF, color: I.tone === "gold" ? "#d9bf7f" : "#c3c8c6", gap: 0, at: I.t0, ls: 1 });
    if (I.title) lines.push({ s: I.title, size: 56, weight: 900, fam: SERIF, color: PAPER, gap: 14, at: I.t0 + 0.06 });
    let big = I.big;
    let bigAt = I.bigAt ?? I.t0 + 0.08;
    if (I.counter) {
      const q = clamp((t - I.counter.t0) / (I.counter.t1 - I.counter.t0));
      const v = I.counter.from + (I.counter.to - I.counter.from) * Math.pow(q, 1.6);
      big = q >= 1 ? I.counter.final : `−${fmtWan(v)} ${I.counter.unit}`;
      bigAt = I.counter.t0;
    }
    if (big) lines.push({ s: big, size: 124, weight: 900, fam: SERIF, color: I.bigTone === "gold" ? GOLD : I.bigTone === "paper" ? PAPER : WHITE, gap: 10, at: bigAt, big: true });
    if (I.sub) lines.push({ s: I.sub, size: 30, weight: 700, fam: SERIF, color: PAPER, gap: 14, at: I.subAt ?? (I.counter ? I.counter.t1 : I.t0 + 0.14) });
    if (I.sub2) lines.push({ s: I.sub2, size: 28, weight: 900, fam: SERIF, color: I.counter ? GOLD : SOFT, gap: 8, at: I.counter ? I.counter.t1 + 0.15 : I.t0 + 0.2 });
    if (I.src) lines.push({ s: I.src, size: 20, weight: 500, fam: SERIF, color: MUTED, gap: 12, at: I.t0 + 0.24 });
    // layout bottom-up
    const pos: number[] = [];
    let y = INFO_BOTTOM;
    for (let i = lines.length - 1; i >= 0; i--) {
      pos[i] = y;
      if (i > 0) y -= lines[i].size * (lines[i].big ? 0.8 : 0.86) + lines[i].gap + lines[i - 1].size * 0.2;
    }
    const top = pos[0] - lines[0].size * 0.9;
    ctx.save();
    ctx.globalAlpha = a;
    // ribbon
    const rib = easeOut3((t - I.t0) / 0.25);
    ctx.fillStyle = tone;
    ctx.fillRect(INFO_X - 18, top + 6, 4, (INFO_BOTTOM - top) * rib);
    lines.forEach((L, i) => {
      const lt = t - L.at;
      if (lt < 0) return;
      const rv = easeOut3(lt / 0.2);
      const dy = (1 - rv) * 14;
      ctx.save();
      ctx.beginPath();
      ctx.rect(INFO_X - 10, pos[i] - L.size * 1.2, (INFO_W + 40) * rv + 10, L.size * 1.6);
      ctx.clip();
      if (L.big) {
        // the big number lands with a short punch
        const pk = 1 + 0.18 * Math.exp(-lt / 0.07) * (lt < 0.3 ? 1 : 0);
        ctx.translate(INFO_X, pos[i] + dy);
        ctx.scale(pk, pk);
        text(ctx, L.s, 0, 0, L.size, L.weight, L.fam, L.color, { maxW: INFO_W, glow: L.color === GOLD ? "rgba(255,207,92,0.35)" : "rgba(245,247,246,0.25)", glowBlur: 24 });
      } else text(ctx, L.s, INFO_X, pos[i] + dy, L.size, L.weight, L.fam, L.color, { maxW: INFO_W, ls: L.ls, glow: "rgba(0,0,0,0.85)", glowBlur: 10 });
      ctx.restore();
    });
    if (I.third) {
      const tt = t - I.t0;
      for (let i = 0; i < 3; i++) {
        const k = easeOut3((tt - 0.1 - i * 0.1) / 0.25);
        if (k <= 0) continue;
        ctx.save();
        ctx.globalAlpha = a * k;
        person(ctx, INFO_X + 520 + i * 52, pos[1] + 4 + (1 - k) * 20, 0.62, i === 2 ? GOLD : "rgba(211,216,214,0.5)");
        ctx.restore();
      }
    }
    ctx.restore();
  }
};

// ---------------- vertical quotes (brush), top-left under the header
const drawQuotes = (ctx: CanvasRenderingContext2D, t: number) => {
  for (const q of QUOTES) {
    const a = vis(t, q.t0, q.t1, 0.3, 0.5);
    if (a <= 0) continue;
    ctx.save();
    ctx.globalAlpha = a;
    q.lines.forEach((line, j) => {
      const x = 196 - j * 72;
      [...line].forEach((ch, i) => {
        const ct = t - q.t0 - j * 0.6 - i * 0.11;
        if (ct < 0) return;
        const k = clamp(ct / 0.35);
        ctx.save();
        if (k < 1) ctx.filter = `blur(${((1 - k) * 6).toFixed(1)}px)`;
        text(ctx, ch, x, 488 + i * 60, 54, 400, BRUSH, PAPER, { align: "center", alpha: k, glow: "rgba(0,0,0,0.9)", glowBlur: 14 });
        ctx.restore();
      });
    });
    const by = q.by;
    const ba = clamp((t - q.t0 - 1.6) / 0.4);
    [...by].forEach((ch, i) => text(ctx, ch, 196 - q.lines.length * 72 + 10, 470 + i * 24, 19, 500, SERIF, "#b9b2a0", { align: "center", alpha: ba }));
    ctx.restore();
  }
};

// ---------------- the hook, the ending
const drawHook = (ctx: CanvasRenderingContext2D, t: number) => {
  const a = vis(t, HOOK.t0, HOOK.t1, 0.12, 0.2);
  if (a <= 0) return;
  const rv = easeOut3((t - HOOK.t0) / 0.3);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 520, W * rv, 140);
  ctx.clip();
  text(ctx, HOOK.text, W / 2, 620, 76, 900, SERIF, PAPER, { align: "center", alpha: a, ls: 6, glow: "rgba(0,0,0,0.95)", glowBlur: 24 });
  ctx.restore();
};
const drawEndingChart = (ctx: CanvasRenderingContext2D, t: number) => {
  if (t < END_T + 0.8) return;
  const k = camAt(t);
  // labels under each trough, one per beat
  TROUGHS.forEach((tr, i) => {
    const t0 = ENDING.labels[i];
    const a = clamp((t - t0) / 0.15) * (1 - clamp((t - ENDING.textB[0]) / 0.4));
    if (a <= 0) return;
    const x = X(k, tr.y);
    const y = Yv(k, val(tr.y));
    const row = i % 2;
    const ly = y + 46 + row * 34;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = "rgba(245,247,246,0.6)";
    ctx.fillRect(x - 0.5, y + 10, 1, ly - y - 30);
    text(ctx, tr.name, x, ly, 22, 900, SERIF, WHITE, { align: "center", glow: "rgba(0,0,0,0.9)", glowBlur: 8 });
    ctx.restore();
    // a small white dot on the trough
    ctx.fillStyle = `rgba(245,247,246,${a})`;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  });
  // the recoveries light up gold, one after another
  const ra = vis(t, ENDING.textA[0], ENDING.textA[1], 0.2, 0.4);
  if (ra > 0) {
    const peaks = [157, 609, 755, 1110, 1630, 1851, 1959, 2021];
    TROUGHS.forEach((tr, i) => {
      const t0 = ENDING.textA[0] + i * 0.18;
      const g = clamp((t - t0) / 0.4) * ra;
      if (g <= 0) return;
      const y1 = peaks[i] ?? 2021;
      const a0 = tr.y;
      ctx.save();
      ctx.strokeStyle = `rgba(${GOLD_HI},${0.95 * g})`;
      ctx.shadowColor = GOLD;
      ctx.shadowBlur = 22;
      ctx.lineWidth = 6;
      ctx.beginPath();
      const n = 24;
      for (let j = 0; j <= n; j++) {
        const yy = a0 + ((y1 - a0) * j) / n;
        if (yy <= a0) continue;
        const px = X(k, yy);
        const py = Yv(k, val(yy));
        if (j <= 1) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
    });
  }
  // 2022 onwards glows white
  const wa = vis(t, ENDING.textB[0], ENDING.textD[1], 0.3, 0.5);
  if (wa > 0) {
    ctx.save();
    ctx.strokeStyle = `rgba(${ASH_HI},${wa})`;
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 24;
    ctx.lineWidth = 6;
    ctx.beginPath();
    for (let yy = 2021; yy <= 2100; yy += 1) {
      const px = X(k, yy);
      const py = Yv(k, val(yy));
      if (yy === 2021) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }
  // axis note
  const na = clamp((t - END_T - 1.2) / 0.5) * (1 - clamp((t - ENDING.card) / 0.5));
  if (na > 0) {
    text(ctx, "纵轴为对数刻度：看的是涨跌幅", W - 44, Y_BOT + 96, 19, 500, SERIF, MUTED, { align: "right", alpha: na });
    text(ctx, "公元 2", X(k, 2), Y_BOT + 60, 18, 700, SERIF, MUTED, { align: "left", alpha: na });
    text(ctx, "2100", X(k, 2100), Y_BOT + 60, 18, 700, SERIF, MUTED, { align: "right", alpha: na });
  }
};
const drawEndingText = (ctx: CanvasRenderingContext2D, t: number) => {
  const A = vis(t, ENDING.textA[0], ENDING.textA[1], 0.3, 0.3);
  if (A > 0) {
    text(ctx, "跌下去，又涨回来", W / 2, 470, 74, 900, SERIF, PAPER, { align: "center", alpha: A, ls: 4, glow: "rgba(0,0,0,0.9)", glowBlur: 20 });
    text(ctx, "两千年，一次又一次", W / 2, 548, 36, 700, SERIF, GOLD, { align: "center", alpha: clamp((t - ENDING.textA[0] - 0.4) / 0.3) * A, ls: 4 });
  }
  const B = vis(t, ENDING.textB[0], ENDING.textB[1], 0.25, 0.25);
  if (B > 0) text(ctx, "2022 年，又开始往下走", W / 2, 500, 62, 900, SERIF, WHITE, { align: "center", alpha: B, ls: 2, glow: "rgba(0,0,0,0.9)", glowBlur: 20 });
  const C = vis(t, ENDING.textC[0], ENDING.textC[1], 0.25, 0.25);
  if (C > 0) {
    text(ctx, "这一次", W / 2, 440, 68, 900, SERIF, PAPER, { align: "center", alpha: C, ls: 8 });
    text(ctx, "没有战争，没有饥荒", W / 2, 530, 56, 900, SERIF, PAPER, { align: "center", alpha: clamp((t - ENDING.textC[0] - 0.35) / 0.3) * C, ls: 4 });
  }
  const D = vis(t, ENDING.textD[0], ENDING.textD[1], 0.3, 0.4);
  if (D > 0) {
    const k = clamp((t - ENDING.textD[0]) / 0.5);
    ctx.save();
    if (k < 1) ctx.filter = `blur(${((1 - k) * 8).toFixed(1)}px)`;
    text(ctx, "还会回来吗？", W / 2, 540, 128, 400, BRUSH, GOLD, { align: "center", alpha: D * k, glow: "rgba(255,190,90,0.35)", glowBlur: 30 });
    ctx.restore();
  }
  const cd = clamp((t - ENDING.card) / 0.7);
  if (cd > 0) {
    ctx.save();
    ctx.globalAlpha = cd;
    ctx.fillStyle = "rgba(5,4,3,0.9)";
    ctx.fillRect(0, 0, W, H);
    const logo = IMGS["mark-disc.png"];
    if (logo) ctx.drawImage(logo, W / 2 - 75, 640, 150, 150);
    text(ctx, "世界的形状", W / 2, 900, 76, 900, SANS, "#f3f4f7", { align: "center", ls: 6 });
    text(ctx, "看见世界如何运行", W / 2, 962, 32, 500, SANS, "#a9b0bf", { align: "center", ls: 4 });
    text(ctx, "MakerJackie", W / 2, 1032, 24, 500, SANS, "#6c7383", { align: "center" });
    const src = [
      "数据：正史户口 · 葛剑雄主编《中国人口史》（含吴松弟、曹树基卷）",
      "清实录 · 国家统计局 · 联合国《世界人口展望 2024》",
      "HYDE 3.3 / ISIMIP · historical-basemaps（疆域示意）",
      "画作：Wikimedia Commons（公有领域 / CC0）",
    ];
    src.forEach((s, i) => text(ctx, s, W / 2, 1130 + i * 32, 19, 500, SERIF, "#6c6658", { align: "center" }));
    ctx.restore();
  }
};

// ---------------- bottom-left shade so the text always reads
const drawShade = (ctx: CanvasRenderingContext2D, t: number) => {
  const a = 1 - clamp((t - END_T) / 0.6);
  if (a <= 0) return;
  const g = ctx.createLinearGradient(0, 1140, 0, 1600);
  g.addColorStop(0, "rgba(6,4,3,0)");
  g.addColorStop(0.45, `rgba(6,4,3,${0.62 * a})`);
  g.addColorStop(1, `rgba(6,4,3,${0.8 * a})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 1140, W, 780);
};

// ---------------- the shake on hits (picture only; text moves less)
const HIT_SHAKE: [number, number, number][] = [
  ...HITS.map((h) => [h.t, h.kind === "blood" ? 1 : h.kind === "ash" ? 0.6 : h.kind === "turn" ? 0.45 : 0.3, h.kind === "blood" ? 0.3 : 0.22] as [number, number, number]),
  ...MILESTONES.map((m) => [m.t, 0.18, 0.15] as [number, number, number]),
];
const shakeAt = (t: number) => HIT_SHAKE.reduce((m, [t0, k, d]) => Math.max(m, k * env(t, t0, 0.02, d)), 0);


// ---------------- the air: gold embers rise in good times, ash drifts down in bad ones (mood = the active info's tone)
const MOOD_T = (() => {
  const n = Math.ceil(DUR * FPS) + 2;
  const mood = new Float32Array(n);
  const disp = new Float32Array(n);
  let m = 1;
  let d = 0;
  for (let f = 0; f < n; f++) {
    const t = f / FPS;
    const I = INFOS.find((q) => t >= q.t0 && t < q.t1);
    const target = I ? (I.tone === "gold" ? 1 : -1) : m;
    m += (target - m) * 0.08;
    mood[f] = m;
    d += (m > 0 ? -1 : 0.55) * Math.abs(m) / FPS;
    disp[f] = d;
  }
  return { mood, disp };
})();
const AIR = (() => {
  const r = rng(77);
  return Array.from({ length: 80 }, () => ({ x: r() * W, y: r() * H, s: 30 + r() * 70, z: 0.6 + r() * 1.6, ph: r() * 6.28, a: 0.25 + r() * 0.5 }));
})();
const drawAir = (ctx: CanvasRenderingContext2D, t: number) => {
  const f = Math.max(0, Math.min(MOOD_T.mood.length - 1, Math.round(t * FPS)));
  const m = MOOD_T.mood[f];
  const D = MOOD_T.disp[f];
  const fade = 1 - clamp((t - (ENDING.card - 0.5)) / 0.8);
  if (fade <= 0) return;
  ctx.save();
  for (const p of AIR) {
    const y = (((p.y + D * p.s) % H) + H) % H;
    const x = p.x + Math.sin(t * 0.6 + p.ph) * 18 * p.z;
    const gold = (m + 1) / 2;
    const rr = Math.round(200 + 55 * gold);
    const gg = Math.round(200 + 14 * gold);
    const bb = Math.round(196 - 56 * gold);
    const a = p.a * (0.35 + 0.25 * Math.abs(m)) * fade * (y < 260 ? y / 260 : 1);
    ctx.fillStyle = `rgba(${rr},${gg},${bb},${a})`;
    const sz = p.z * (gold > 0.5 ? 1.6 : 2.2);
    if (gold > 0.5) ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
    else {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * 0.8 + p.ph);
      ctx.fillRect(-sz, -sz / 3, sz * 2, (sz * 2) / 3);
      ctx.restore();
    }
  }
  ctx.restore();
};

// ---------------- the stage
let BUF: HTMLCanvasElement | null = null;
const Stage: React.FC<{ t: number; ready: boolean }> = ({ t, ready }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    if (!ready || !ref.current) return;
    if (!BUF) {
      BUF = document.createElement("canvas");
      BUF.width = W;
      BUF.height = H;
    }
    const b = BUF.getContext("2d")!;
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.clearRect(0, 0, W, H);
    drawArt(b, t);
    drawAir(b, t);
    drawFloor(b, t);
    drawMarks(b, t);
    const chartA = 1 - clamp((t - (ENDING.card - 0.2)) / 0.8);
    drawChart(b, t, chartA, "slips");
    drawHits(b, t, "blood");
    drawChart(b, t, chartA, "line");
    drawStreaks(b, t);
    drawHead(b, t, chartA * (ending(t) ? 1 - clamp((t - END_T) / 0.8) : 1));
    drawHits(b, t, "other");
    drawEndingChart(b, t);
    const ctx = ref.current.getContext("2d")!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const h = shakeAt(t);
    const r = rng(Math.round(t * 30) * 13 + 5);
    const sx = (r() - 0.5) * 30 * h;
    const sy = (r() - 0.5) * 30 * h;
    const z = 1 + 0.03 * h;
    ctx.save();
    ctx.translate(W / 2 + sx, H * 0.55 + sy);
    ctx.scale(z, z);
    ctx.drawImage(BUF, -W / 2, -H * 0.55);
    ctx.restore();
    ctx.save();
    ctx.translate(sx * 0.3, sy * 0.3);
    drawShade(ctx, t);
    drawTopRight(ctx, t);
    drawHeader(ctx, t);
    drawStamps(ctx, t);
    drawQuotes(ctx, t);
    drawInfo(ctx, t);
    drawHook(ctx, t);
    drawEndingText(ctx, t);
    ctx.restore();
  }, [t, ready]);
  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0 }} />;
};

// ---------------- paper, grain, vignette
const Paper: React.FC<{ f: number }> = ({ f }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <AbsoluteFill
      style={{
        opacity: 0.09,
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='0.012 0.09' numOctaves='3' seed='4'/><feColorMatrix values='0 0 0 0 0.95  0 0 0 0 0.88  0 0 0 0 0.72  0 0 0 0.9 0'/></filter><rect width='100%' height='100%' filter='url(%23p)'/></svg>\")",
        mixBlendMode: "screen",
      }}
    />
    <AbsoluteFill
      style={{
        opacity: 0.06,
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        backgroundPosition: `${(f * 37) % 220}px ${(f * 53) % 220}px`,
        mixBlendMode: "overlay",
      }}
    />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 82% 72% at 50% 50%, transparent 56%, rgba(8,5,2,0.8) 100%)" }} />
  </AbsoluteFill>
);

export const Film5: React.FC<{ audio?: string }> = ({ audio = "film5.wav" }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const [handle] = useState(() => delayRender("film5 fonts + images", { timeoutInMilliseconds: 180000 }));
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    Promise.all([fontsReady(), imagesReady()]).then(
      () => {
        dotLayers();
        setReady(true);
        continueRender(handle);
      },
      (e) => cancelRender(e),
    );
  }, [handle]);
  return (
    <AbsoluteFill style={{ background: "#060403", overflow: "hidden" }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 95% 60% at 55% 62%, #15100a 0%, #060403 74%)" }} />
      <Stage t={t} ready={ready} />
      <Paper f={f} />
      <Audio src={staticFile(audio)} />
    </AbsoluteFill>
  );
};
