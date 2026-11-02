// Test clip (18 s): the reference's first 18 s, beat for beat, on Chinese population.
// 0–1 boom (1776→1851) · 1 peak 见顶 · 2 crash (太平天国…) · 4.5 lightning · 5.75 rewind · 6.75 公元 2 年 · 11.5 lightning · 15 recovery
import React, { useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, Img, staticFile, useCurrentFrame } from "remotion";
import { mono } from "../plan";
import { rng } from "../Chart";
import { C, FONT_CN, FONT_LAT, FONT_NUM } from "../theme";
import { loadFont as loadSerif } from "@remotion/google-fonts/NotoSerifSC";
import WORLD_T from "./world_total.json";
const serif = loadSerif("normal", { weights: ["700", "900"], ignoreTooManyRequestsWarning: true });
const FONT_SERIF = `${serif.fontFamily}, "Songti SC", serif`;
import { fmtPop, top5, val, yearLabel } from "./data2";
import MAP from "./popmap.json";

const W = 1080;
const H = 1920;
const FPS = 30;
export const T5_FRAMES = 18 * FPS;

// ---------------- timeline
const HAN_T = 6.62; // scene switch
const QCUR = mono([[0, 1776], [1.0, 1851], [2.0, 1851.35], [4.5, 1880], [5.72, 1880.3], [6.62, 1741]]);
const HCUR = mono([[HAN_T, 2], [9.3, 2.0], [11.5, 57], [14.6, 61], [18, 157]]);
const QSPAN = mono([[0, 70], [1, 80], [2, 82], [4.5, 64], [5.72, 62], [6.62, 120]]);
const HSPAN = mono([[HAN_T, 3.2], [9.0, 12], [11.5, 62], [14.6, 64], [18, 150]]);
const QHX = mono([[0, 0.66], [1.9, 0.66], [3.0, 0.76], [4.5, 0.76], [5.72, 0.74], [6.62, 0.6]]);
const HHX = mono([[HAN_T, 0.5], [9.3, 0.62], [11.5, 0.78], [14.6, 0.78], [18, 0.7]]);
const sceneOf = (t: number) => (t < HAN_T ? "qing" : "han");
const cursor = (t: number) => (t < HAN_T ? QCUR(t) : HCUR(t));
const startYear = (t: number) => (t < HAN_T ? 1741 : 2);

// event hits (shake / RGB split)
const HITS: [number, number][] = [[1.0, 0.35], [2.0, 1.0], [4.5, 1.0], [6.5, 0.5], [6.75, 0.45], [11.5, 1.0], [16.2, 0.35]];
const env = (t: number, t0: number, a = 0.03, d = 0.45) => (t < t0 - a ? 0 : t < t0 ? (t - t0 + a) / a : Math.exp(-(t - t0) / d));
const hitAt = (t: number) => HITS.reduce((m, [t0, k]) => Math.max(m, k * env(t, t0, 0.02, 0.28)), 0);
const vis = (t: number, a: number, b: number, fi = 0.12, fo = 0.18) =>
  t < a || t > b + fo ? 0 : t < a + fi ? (t - a) / fi : t > b ? 1 - (t - b) / fo : 1;
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

// ---------------- camera
const Y_TOP = 800;
const Y_BOT = 1660;
const rawRange = (t: number) => {
  const c = cursor(t);
  const span = t < HAN_T ? QSPAN(t) : HSPAN(t);
  const a = Math.max(startYear(t), c - span * 1.05);
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i <= 24; i++) {
    const v = val(a + ((c - a) * i) / 24);
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  return [lo, hi];
};
type Cam = { c: number; span: number; hx: number; lo: number; hi: number; scene: string };
const camAt = (t: number): Cam => {
  const scene = sceneOf(t);
  let lo = 0;
  let hi = 0;
  let n = 0;
  for (let k = 0; k < 10; k++) {
    const tt = t - k * 0.05;
    if (sceneOf(tt) !== scene || tt < 0) break;
    const [l, h] = rawRange(tt);
    lo += l;
    hi += h;
    n++;
  }
  lo /= n;
  hi /= n;
  const r = Math.max(hi - lo, hi * 0.14);
  return {
    c: cursor(t),
    span: scene === "qing" ? QSPAN(t) : HSPAN(t),
    hx: scene === "qing" ? QHX(t) : HHX(t),
    lo: lo - 0.3 * r,
    hi: hi + 0.1 * r,
    scene,
  };
};
const ppy = (k: Cam) => (W * 0.9) / k.span;
const X = (k: Cam, y: number) => k.hx * W - (k.c - y) * ppy(k);
const Yv = (k: Cam, v: number) => Y_BOT - ((v - k.lo) / (k.hi - k.lo)) * (Y_BOT - Y_TOP);
const headAt = (t: number) => {
  const k = camAt(t);
  return { x: X(k, k.c), y: Yv(k, val(k.c)), up: val(k.c) >= val(k.c - 0.3) };
};

// ---------------- China population map floor (ISIMIP/HYDE grid 1860, 0.25°; China-POV mask; no borders drawn)
type MapJ = { cols: number; rows: number; lon0: number; lat0: number; step: number; dots: [number, number, number, number, string][] };
const M = MAP as unknown as MapJ;
const LATMAX = M.lat0 + (M.rows - 1) * M.step;
const TAIPING = new Set(["江苏", "浙江", "安徽", "江西", "湖北"]);
const HUI = new Set(["陕西", "甘肃", "宁夏"]);
const FAMINE = new Set(["山西", "河南"]);
const projM = (lon: number, lat: number) => {
  const v = Math.max(0, Math.min(1.08, (54 - lat) / 34));
  const z = 1 + (1 - v) * 1.4;
  return { x: 560 + ((lon - 110) * 40) / z, y: 430 + 1440 / z, s: 1 / z };
};
const DOTS = (() => {
  const r = rng(91);
  return M.dots.map(([c, rw, p60, , prov]) => {
    const lon = M.lon0 + c * M.step;
    const lat = LATMAX - rw * M.step;
    const b = Math.max(0, Math.min(1, (Math.log10(Math.max(p60, 1)) - 3.2) / 2.7));
    let loss = 0;
    let t0 = Infinity;
    if (TAIPING.has(prov)) {
      loss = prov === "浙江" ? 0.52 : 0.38;
      t0 = 2.15 + r() * 1.3;
    } else if (HUI.has(prov)) {
      loss = 0.35;
      t0 = 3.1 + r() * 0.9;
    } else if (FAMINE.has(prov)) {
      loss = 0.3;
      t0 = 3.8 + r() * 0.7;
    }
    return { ...projM(lon, lat), b, loss, t0, j: r() };
  });
})();
const MAP_LABELS = [
  { lon: 117.6, lat: 31.6, t: 2.25, txt: "太平天国", big: true },
  { lon: 120.3, lat: 29.0, t: 2.8, txt: "浙江 −52%", big: false },
  { lon: 106.0, lat: 37.0, t: 3.2, txt: "回民战争", big: true },
  { lon: 112.8, lat: 35.0, t: 3.9, txt: "丁戊奇荒", big: true },
];
const HAN_LABELS = [
  { lon: 113.0, lat: 31.2, t: 9.6, txt: "绿林", big: true },
  { lon: 118.8, lat: 35.6, t: 10.1, txt: "赤眉", big: true },
];
const drawMap = (ctx: CanvasRenderingContext2D, t: number, alpha: number) => {
  if (alpha <= 0) return;
  const han = t >= HAN_T;
  const c = han ? HCUR(t) : QCUR(t);
  const scale = han ? 0.25 + 0.45 * (val(c) / 5959.4) : Math.min(1, val(Math.min(c, 1851)) / 43216);
  const growing = han ? val(c) > val(c - 0.5) + 0.5 : t < 2.0;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const d of DOTS) {
    if (d.y > H + 20 || d.x < -20 || d.x > W + 20) continue;
    let a = d.b * 1.15 - (1 - scale) * 0.75;
    if (a <= 0.02) continue;
    a = Math.min(1, a);
    let col = "255,222,160";
    let sz = 11 * d.s;
    if (!han && t >= d.t0) {
      const dt = t - d.t0;
      if (dt < 0.3) {
        col = P.dnHiRGB;
        a = Math.min(1, a + 0.6 * (1 - dt / 0.3));
        sz *= 1.6 - dt * 2;
      } else {
        col = P.dnRGB;
        a *= 1 - d.loss;
      }
    } else if (growing && d.j < 0.012) {
      const ph = (t * 3 + d.j * 500) % 1;
      if (ph < 0.25) {
        col = "255,240,200";
        a = Math.min(1, a + 0.7 * (1 - ph / 0.25));
      }
    }
    ctx.fillStyle = `rgba(${col},${Math.min(1, a * 0.78) * alpha})`;
    ctx.fillRect(d.x - sz * 0.36, d.y - sz * 0.24, sz * 0.72, sz * 0.48);
    if (d.b > 0.72) {
      // city glow
      ctx.fillStyle = `rgba(${col},${0.06 * a * alpha})`;
      ctx.fillRect(d.x - sz * 1.3, d.y - sz * 0.8, sz * 2.6, sz * 1.6);
    }
  }
  ctx.restore();
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const L of han ? HAN_LABELS : MAP_LABELS) {
    const la = vis(t, L.t, han ? 11.4 : 5.6, 0.15, 0.3) * alpha;
    if (la <= 0) continue;
    const p = projM(L.lon, L.lat);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(1, 0.8);
    ctx.font = `900 ${Math.round((L.big ? 64 : 44) * p.s)}px ${FONT_CN}`;
    ctx.shadowColor = `rgba(${P.dnRGB},0.95)`;
    ctx.shadowBlur = 20;
    ctx.fillStyle = `rgba(${P.dnHiRGB},${la})`;
    ctx.fillText(L.txt, 0, 0);
    ctx.restore();
  }
  ctx.font = `500 22px ${FONT_CN}`;
  ctx.textAlign = "left";
  ctx.fillStyle = `rgba(160,170,190,${0.75 * alpha})`;
  ctx.fillText(han ? "光点：人口分布（按 1860 年格局示意）" : "光点：人口分布（HYDE / ISIMIP，1860）", 60, 1470);
  ctx.restore();
};

// ---------------- chart
const GAPS: [number, number][] = [[2, 57], [1851, 1880]];
const drawChart = (ctx: CanvasRenderingContext2D, t: number) => {
  const k = camAt(t);
  const p = ppy(k);
  const start = startYear(t);
  const c = k.c;
  // grid
  ctx.lineWidth = 1;
  const stepV = k.hi - k.lo > 15000 ? 5000 : k.hi - k.lo > 6000 ? 2000 : 1000;
  ctx.font = `600 22px ${FONT_NUM}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  for (let v = Math.ceil(k.lo / stepV) * stepV; v < k.hi; v += stepV) {
    const y = Yv(k, v);
    ctx.strokeStyle = "rgba(170,185,210,0.07)";
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
    ctx.fillStyle = "rgba(180,190,210,0.32)";
    ctx.fillText(fmtPop(v).replace(" ", ""), 20, y - 14);
  }
  const dstep = k.span > 90 ? 20 : k.span > 40 ? 10 : k.span > 15 ? 5 : 1;
  ctx.textAlign = "center";
  for (let y = Math.ceil((c - k.span) / dstep) * dstep; y <= c + k.span * 0.5; y += dstep) {
    if (y < start) continue;
    const x = X(k, y);
    ctx.strokeStyle = "rgba(170,185,210,0.05)";
    ctx.beginPath();
    ctx.moveTo(x, Y_TOP - 200);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  // candles: one per year where records are close; across a census gap one giant candle forms at the head
  const bw = Math.min(24, Math.max(2.2, p * 0.64));
  const gw = Math.min(46, Math.max(22, p * 2.2));
  const y0 = Math.max(start, Math.floor(c - k.span * 1.1));
  type It = { x: number; o: number; cl: number; w: number };
  const items: It[] = [];
  const pts: [number, number, boolean, boolean][] = [];
  const dashes: [number, number, number, number][] = [];
  for (let y = y0; y <= Math.floor(c) + 1; y++) {
    const g = GAPS.find(([a, b]) => y > a && y <= b);
    if (g) {
      const [a, b] = g;
      const end = Math.min(c, b);
      items.push({ x: X(k, end), o: val(a), cl: val(end), w: gw });
      dashes.push([X(k, a), Yv(k, val(a)), X(k, end), Yv(k, val(a))]);
      pts.push([X(k, end), Yv(k, val(end)), false, true]);
      if (end < b) break;
      y = b;
      continue;
    }
    const yr = Math.min(y, c);
    if (yr < start) continue;
    const o = val(Math.max(start, y - 1));
    const cl = val(yr);
    items.push({ x: X(k, Math.max(start, yr - 0.5)), o, cl, w: bw });
    pts.push([X(k, yr), Yv(k, cl), cl >= o, false]);
    if (yr >= c) break;
  }
  for (const it of items) {
    const a = Yv(k, it.o);
    const b = Yv(k, it.cl);
    const rgb = it.cl >= it.o ? P.upRGB : P.dnRGB;
    const g = ctx.createLinearGradient(0, Math.min(a, b), 0, H);
    g.addColorStop(0, `rgba(${rgb},0.22)`);
    g.addColorStop(0.5, `rgba(${rgb},0.06)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(it.x - it.w / 2, Math.min(a, b), it.w, H - Math.min(a, b));
  }
  ctx.save();
  ctx.shadowBlur = 14;
  for (const it of items) {
    const a = Yv(k, it.o);
    const b = Yv(k, it.cl);
    const up = it.cl >= it.o;
    ctx.shadowColor = up ? `rgba(${P.upRGB},0.9)` : `rgba(${P.dnRGB},0.9)`;
    ctx.fillStyle = up ? P.up : P.dn;
    if (it.w > 20) {
      // the giant candle: bright edge, glassy body
      const gg = ctx.createLinearGradient(it.x - it.w / 2, 0, it.x + it.w / 2, 0);
      gg.addColorStop(0, `rgba(${P.dnHiRGB},0.95)`);
      gg.addColorStop(0.5, `rgba(${P.dnRGB},0.75)`);
      gg.addColorStop(1, `rgba(${P.dnHiRGB},0.95)`);
      ctx.fillStyle = gg;
      ctx.shadowBlur = 30;
    }
    ctx.fillRect(it.x - it.w / 2, Math.min(a, b) - 1, it.w, Math.max(3, Math.abs(a - b) + 2));
  }
  ctx.restore();
  // dashed: no census in between
  ctx.save();
  ctx.setLineDash([10, 10]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(200,210,230,0.45)";
  for (const [x0, y0d, x1, y1] of dashes) {
    ctx.beginPath();
    ctx.moveTo(x0, y0d);
    ctx.lineTo(x1 - gw / 2, y1);
    ctx.stroke();
  }
  ctx.restore();
  // thin bright line through closes
  ctx.save();
  ctx.lineJoin = "round";
  for (let i = 1; i < pts.length; i++) {
    if (pts[i][3]) continue;
    ctx.strokeStyle = pts[i][2] ? `rgba(${P.upHiRGB},0.95)` : `rgba(${P.dnHiRGB},0.95)`;
    ctx.shadowColor = pts[i][2] ? P.up : P.dn;
    ctx.shadowBlur = 16;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pts[i - 1][0], pts[i - 1][1]);
    ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }
  ctx.restore();
  return k;
};

const drawBaseline = (ctx: CanvasRenderingContext2D, t: number) => {
  const a = vis(t, 6.72, 11.0, 0.3, 0.6);
  if (a <= 0) return;
  const k = camAt(t);
  const y = Yv(k, 5959.5);
  const x0 = X(k, 2);
  const w = Math.min(1, (t - 6.72) / 0.5);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = "rgba(255,207,92,0.9)";
  ctx.shadowColor = "#ffcf5c";
  ctx.shadowBlur = 10;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0 - 40, y);
  ctx.lineTo(x0 + (W - x0 + 40) * ease(w), y);
  ctx.stroke();
  ctx.font = `700 26px ${FONT_CN}`;
  ctx.fillStyle = "#ffcf5c";
  ctx.textAlign = "right";
  ctx.fillText("基点 5,959 万", W - 60, y - 22);
  ctx.restore();
};

// ---------------- particles
type Burst = { t: number; n: number; seed: number; col: string; sp: number; g: number; life: number };
const BURSTS: Burst[] = [
  { t: 1.0, n: 90, seed: 11, col: "UP", sp: 520, g: 380, life: 1.0 },
  { t: 4.5, n: 220, seed: 12, col: "DN", sp: 760, g: 900, life: 1.1 },
  { t: 6.75, n: 110, seed: 13, col: "UP", sp: 420, g: 300, life: 1.2 },
  { t: 11.5, n: 220, seed: 14, col: "DN", sp: 760, g: 900, life: 1.1 },
  { t: 16.2, n: 120, seed: 15, col: "255,207,92", sp: 560, g: 380, life: 1.2 },
];
const drawBursts = (ctx: CanvasRenderingContext2D, t: number) => {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const b of BURSTS) {
    const dt = t - b.t;
    if (dt < 0 || dt > b.life) continue;
    const h = headAt(b.t);
    const r = rng(b.seed);
    for (let i = 0; i < b.n; i++) {
      const ang = r() * Math.PI * 2;
      const sp = b.sp * (0.25 + r() * 0.85);
      const life = b.life * (0.45 + r() * 0.55);
      if (dt > life) continue;
      const drag = Math.exp(-dt * 2.2);
      const x = h.x + (Math.cos(ang) * sp * (1 - drag)) / 2.2;
      const y = h.y + (Math.sin(ang) * sp * (1 - drag)) / 2.2 + 0.5 * b.g * dt * dt * 0.5;
      const a = 1 - dt / life;
      ctx.fillStyle = `rgba(${b.col === "UP" ? P.upHiRGB : b.col === "DN" ? P.dnHiRGB : b.col},${a})`;
      const s = 2 + r() * 3;
      ctx.fillRect(x, y, s, s);
    }
  }
  ctx.restore();
};
// sparks leaking from the head while it moves
const drawHead = (ctx: CanvasRenderingContext2D, t: number, alpha: number) => {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 18; i++) {
    const tb = Math.floor(t * 30) / 30 - i / 30;
    if (tb < 0 || sceneOf(tb) !== sceneOf(t)) continue;
    const h = headAt(tb);
    const r = rng(Math.round(tb * 30) * 7 + 3);
    for (let j = 0; j < 3; j++) {
      const dt = t - tb;
      const vx = (r() - 0.65) * 220;
      const vy = (r() - 0.7) * 260;
      const x = h.x + vx * dt;
      const y = h.y + vy * dt + 260 * dt * dt;
      const a = (1 - dt / 0.6) * 0.9 * alpha;
      if (a <= 0) continue;
      ctx.fillStyle = h.up ? `rgba(${P.upHiRGB},${a})` : `rgba(${P.dnHiRGB},${a})`;
      ctx.fillRect(x, y, 2.5, 2.5);
    }
  }
  const h = headAt(t);
  const col = (t >= 1.0 && t < 2.0) || (t >= HAN_T && t < 9.3) ? "255,207,92" : h.up ? P.upRGB : P.dnRGB;
  const g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, 90);
  g.addColorStop(0, `rgba(255,255,255,${0.95 * alpha})`);
  g.addColorStop(0.08, `rgba(${col},${0.9 * alpha})`);
  g.addColorStop(0.35, `rgba(${col},${0.22 * alpha})`);
  g.addColorStop(1, `rgba(${col},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(h.x - 90, h.y - 90, 180, 180);
  // horizontal lens streak
  const s = ctx.createLinearGradient(h.x - 160, 0, h.x + 160, 0);
  s.addColorStop(0, `rgba(${col},0)`);
  s.addColorStop(0.5, `rgba(255,255,255,${0.5 * alpha})`);
  s.addColorStop(1, `rgba(${col},0)`);
  ctx.fillStyle = s;
  ctx.fillRect(h.x - 160, h.y - 1.5, 320, 3);
  ctx.restore();
};

// ---------------- lightning
const bolt = (seed: number, x0: number, y0: number, x1: number, y1: number, rough: number) => {
  const r = rng(seed);
  let pts: [number, number][] = [[x0, y0], [x1, y1]];
  let d = rough;
  for (let it = 0; it < 7; it++) {
    const nx: [number, number][] = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1];
      const [bx, by] = pts[i];
      nx.push([(ax + bx) / 2 + (r() - 0.5) * d, (ay + by) / 2 + (r() - 0.5) * d * 0.35]);
      nx.push(pts[i]);
    }
    pts = nx;
    d *= 0.55;
  }
  return pts;
};
const STRIKES = [
  { t: 4.5, seed: 31 },
  { t: 11.5, seed: 32 },
];
const drawLightning = (ctx: CanvasRenderingContext2D, t: number) => {
  for (const s of STRIKES) {
    const dt = t - s.t;
    if (dt < -0.04 || dt > 0.75) continue;
    const h = headAt(s.t);
    const flick = dt < 0 ? 0.5 : [1, 0.35, 1, 0.8, 0.25, 0.9, 0.6, 0.4][Math.min(7, Math.floor(dt * 30) % 8)] * Math.max(0, 1 - dt / 0.75);
    const main = bolt(s.seed + Math.floor(dt * 15), h.x + 160, -60, h.x, h.y, 420);
    const r = rng(s.seed * 3);
    const paths = [main];
    for (let b = 0; b < 4; b++) {
      const i = Math.floor(main.length * (0.2 + r() * 0.6));
      const [bx, by] = main[i];
      paths.push(bolt(s.seed * 7 + b, bx, by, bx + (r() - 0.5) * 520, by + 160 + r() * 380, 200));
    }
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineJoin = "round";
    paths.forEach((pts, pi) => {
      const w = pi === 0 ? 1 : 0.5;
      for (const [lw, col, blur] of [
        [14 * w, `rgba(120,200,255,${0.25 * flick})`, 40],
        [5 * w, `rgba(190,230,255,${0.7 * flick})`, 20],
        [2 * w, `rgba(255,255,255,${flick})`, 6],
      ] as [number, string, number][]) {
        ctx.strokeStyle = col;
        ctx.lineWidth = lw;
        ctx.shadowColor = "rgba(150,210,255,1)";
        ctx.shadowBlur = blur;
        ctx.beginPath();
        pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
      }
    });
    // impact flash + shock ring
    if (dt >= 0) {
      const g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, 260);
      g.addColorStop(0, `rgba(220,255,240,${0.8 * flick})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(h.x - 260, h.y - 260, 520, 520);
      const rr = 40 + dt * 900;
      ctx.strokeStyle = `rgba(160,255,215,${0.5 * Math.max(0, 1 - dt / 0.6)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(h.x, h.y, rr, rr * 0.35, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
};

// ---------------- the canvas, with post effects (glitch, rewind zoom-blur)
let BUF: HTMLCanvasElement | null = null;
const Stage: React.FC<{ t: number }> = ({ t }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [handle] = useState(() => delayRender("fonts"));
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    document.fonts.ready.then(() => {
      setReady(true);
      continueRender(handle);
    });
  }, [handle]);
  useLayoutEffect(() => {
    if (!ready || !ref.current) return;
    if (!BUF) {
      BUF = document.createElement("canvas");
      BUF.width = W;
      BUF.height = H;
    }
    const b = BUF.getContext("2d")!;
    b.clearRect(0, 0, W, H);
    const qing = t < HAN_T;
    drawMap(b, t, qing ? 1 - vis(t, 5.75, 9, 0.5, 0) : Math.min(1, (t - HAN_T) / 0.6));
    drawChart(b, t);
    if (!qing) drawBaseline(b, t);
    const rewinding = t > 5.72 && t < HAN_T + 0.05;
    drawHead(b, t, rewinding ? 0.4 : 1);
    drawBursts(b, t);

    const ctx = ref.current.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);
    // rewind: radial zoom streak, the past rushing in
    if (t > 5.72 && t < 6.9) {
      const p = Math.min(1, (t - 5.72) / 0.25) * (t > 6.6 ? Math.max(0, 1 - (t - 6.6) / 0.3) : 1);
      const N = 12;
      for (let i = 0; i < N; i++) {
        const s = 1 + (i / N) * 0.55 * p;
        ctx.globalAlpha = (i === 0 ? 1 : 0.22) * (1 - i / (N + 2));
        ctx.drawImage(BUF, W / 2 - (W * s) / 2, H * 0.55 - (H * s) * 0.55, W * s, H * s);
      }
      ctx.globalAlpha = 1;
    } else if (t > 2.0 && t < 2.32) {
      // crash glitch: torn horizontal slices
      const r = rng(Math.floor(t * 30) * 17);
      ctx.drawImage(BUF, 0, 0);
      for (let i = 0; i < 9; i++) {
        const y = r() * H;
        const h = 20 + r() * 120;
        const dx = (r() - 0.5) * 160;
        ctx.drawImage(BUF, 0, y, W, h, dx, y, W, h);
      }
    } else ctx.drawImage(BUF, 0, 0);
    drawLightning(ctx, t);
  }, [t, ready]);
  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0 }} />;
};

// ---------------- HUD (reference layout: brand y≈300, number, badge, date; panel right)
const glow = (c: string, s = 18) => `0 0 ${s}px ${c}`;
const Header: React.FC<{ t: number }> = ({ t }) => {
  const k = camAt(t);
  const v = val(k.c);
  const peak = t >= 1.0 && t < 2.0;
  const slope = val(k.c) - val(k.c - 0.4);
  const rewind = t > 5.72 && t < HAN_T;
  const col = peak ? C.gold : slope >= 0 ? C.up : C.down;
  let base = "较公元 2 年";
  let pct = (v / 5959.5 - 1) * 100;
  if (t >= 2.0 && t < HAN_T) {
    base = "较 1851 最高";
    pct = (v / 43216 - 1) * 100;
  }
  const dimNum = rewind ? 0.1 : 1;
  const yr = rewind ? rewindYear(t) : yearLabel(k.c);
  return (
    <div style={{ position: "absolute", left: 58, top: 160 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Img src={staticFile("mark-disc.png")} style={{ width: 54, height: 54 }} />
        <span style={{ font: `900 32px ${FONT_CN}`, color: "#f3f4f7", letterSpacing: 2 }}>世界的形状</span>
        <span style={{ width: 2, height: 28, background: "rgba(255,255,255,0.25)" }} />
        <span style={{ font: `900 36px ${FONT_CN}`, color: C.gold, letterSpacing: 2 }}>两千年中国人口</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", marginTop: 6 }}>
        <div style={{ font: `700 112px ${FONT_NUM}`, color: col, lineHeight: 0.95, textShadow: glow(col + "aa", 22), opacity: dimNum, fontVariantNumeric: "tabular-nums" }}>
          {v >= 10000 ? (v / 10000).toFixed(2) : Math.round(v).toLocaleString("en-US")}
        </div>
        <div style={{ marginLeft: 14, marginBottom: 10, opacity: dimNum }}>
          <div style={{ font: `500 21px ${FONT_CN}`, color: C.sub }}>
            {`${v >= 10000 ? "亿人" : "万人"} · ${peak ? "清代最高" : base}`}
          </div>
          <div style={{ display: "inline-block", marginTop: 4, padding: "1px 10px", borderRadius: 4, background: peak ? "rgba(255,207,92,0.95)" : pct >= 0 ? "rgba(255,59,87,0.22)" : "rgba(25,227,138,0.2)", font: `700 34px ${FONT_NUM}`, color: peak ? "#111" : pct >= 0 ? C.up : C.down }}>
            {peak ? "见顶" : `${pct >= 0 ? "▲ +" : "▼ "}${pct.toFixed(2)}%`}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: 6 }}>
        <span style={{ font: `700 52px ${FONT_NUM}`, color: "#f3f4f7" }}>{yr}</span>
        {!rewind && <span style={{ font: `700 30px ${FONT_CN}`, color: C.sub }}>{dynReign(k.c)}</span>}
      </div>
    </div>
  );
};
const DYN: [string, number, number][] = [
  ["西汉", -202, 8], ["新", 9, 23], ["东汉", 25, 220], ["清", 1644, 1912],
];
const REIGN: [string, number, number][] = [
  ["平帝", 1, 5], ["王莽", 6, 23], ["光武帝", 25, 57], ["明帝", 58, 75], ["章帝", 76, 88], ["和帝", 89, 105],
  ["安帝", 107, 125], ["顺帝", 126, 144], ["桓帝", 147, 167],
  ["乾隆", 1736, 1795], ["嘉庆", 1796, 1820], ["道光", 1821, 1850], ["咸丰", 1851, 1861], ["同治", 1862, 1874], ["光绪", 1875, 1908],
];
const dynReign = (y: number) => {
  const d = DYN.find(([, a, b]) => y >= a && y < b + 1)?.[0] ?? "";
  const r = REIGN.find(([, a, b]) => y >= a && y < b + 1)?.[0] ?? "";
  return [d, r].filter(Boolean).join(" · ");
};
const REWIND = [
  [5.72, "1644"],
  [6.0, "1368"],
  [6.25, "618"],
  [6.5, "公元 2"],
] as const;
const rewindYear = (t: number) => {
  let s = "1880 年";
  for (const [a, y] of REWIND) if (t >= a) s = y.startsWith("公元") ? `${y} 年` : `${y} 年`;
  return s;
};

const Panel: React.FC<{ t: number }> = ({ t }) => {
  const k = camAt(t);
  const a = t < HAN_T ? 1 - vis(t, 5.72, 99, 0.15, 0) : vis(t, 9.4, 99, 0.3, 0);
  if (a <= 0.01) return null;
  const rows = top5(k.c);
  const crash = t >= 2.0 && t < HAN_T;
  const han = t >= HAN_T;
  const baseY = crash ? 1851 : han ? 2 : 0;
  const mx = rows[0][1];
  return (
    <div style={{ position: "absolute", right: 70, top: 420, width: 470, opacity: a }}>
      <div style={{ textAlign: "right", font: `500 19px ${FONT_CN}`, color: C.muted, marginBottom: 10 }}>
        {crash ? "较 1851 · " : han ? "较公元 2 年 · " : "同年 · "}
        <span style={{ color: C.sub, fontWeight: 700 }}>世界人口前五</span>
        <span style={{ fontSize: 14, marginLeft: 6 }}>今国界</span>
      </div>
      {rows.map(([n, v]) => {
        const b = baseY ? top5(baseY).find((r) => r[0] === n)?.[1] : undefined;
        const ch = b ? (v / b - 1) * 100 : undefined;
        const cn = n === "中国";
        return (
          <div key={n} style={{ display: "flex", alignItems: "center", height: 44, gap: 12 }}>
            <div style={{ width: 92, font: `700 25px ${FONT_CN}`, color: cn ? "#fff" : "#c9cfdb", textAlign: "right" }}>{n}</div>
            <div style={{ flex: 1 }}>
              <div style={{ font: `600 19px ${FONT_NUM}`, color: C.muted }}>{fmtPop(v)}</div>
              <div style={{ height: 3, marginTop: 3, background: "rgba(255,255,255,0.08)" }}>
                <div style={{ height: 3, width: `${(v / mx) * 100}%`, background: cn ? (crash ? C.down : C.up) : "rgba(200,210,230,0.5)" }} />
              </div>
            </div>
            <div style={{ width: 128, textAlign: "right", font: `700 25px ${FONT_NUM}`, color: ch === undefined ? C.sub : ch >= 0 ? C.up : C.down }}>
              {ch === undefined ? "" : `${ch >= 0 ? "▲ +" : "▼ "}${ch.toFixed(1)}%`}
            </div>
          </div>
        );
      })}
    </div>
  );
};


// ---------------- three HUD styles (A 史书 · B 仪表 · C 极简); same timing, same chart
type Pal = { up: string; dn: string; upRGB: string; dnRGB: string; upHiRGB: string; dnHiRGB: string; title: string; titleW: number; split: boolean; accent: string };
const PALS: Record<string, Pal> = {
  A: { up: "#ffcf5c", dn: "#5fd3c6", upRGB: "255,207,92", dnRGB: "95,211,198", upHiRGB: "255,232,170", dnHiRGB: "185,248,238", title: FONT_SERIF, titleW: 900, split: false, accent: "#d8402c" },
  B: { up: "#ffc94d", dn: "#7fe3ff", upRGB: "255,201,77", dnRGB: "127,227,255", upHiRGB: "255,228,160", dnHiRGB: "215,248,255", title: FONT_CN, titleW: 900, split: true, accent: "#ffc94d" },
  C: { up: "#f2efe6", dn: "#e5384a", upRGB: "242,239,230", dnRGB: "229,56,74", upHiRGB: "255,255,255", dnHiRGB: "255,150,158", title: FONT_CN, titleW: 900, split: false, accent: "#e5384a" },
};
let P: Pal = PALS.A;
let VAR = "A";

const WT = WORLD_T as unknown as [number, number][];
const worldAt = (y: number) => {
  for (let i = 0; i < WT.length - 1; i++) {
    const [a, va] = WT[i];
    const [b, vb] = WT[i + 1];
    if (y >= a && y <= b) return va + ((vb - va) * (y - a)) / (b - a);
  }
  return WT[WT.length - 1][1];
};

const useHud = (t: number) => {
  const k = camAt(t);
  const v = val(k.c);
  const peak = t >= 1.0 && t < 2.0;
  const slope = val(k.c) - val(k.c - 0.4);
  const rewind = t > 5.72 && t < HAN_T;
  let base = "较公元 2 年";
  let pct = (v / 5959.4 - 1) * 100;
  if (t >= 2.0 && t < HAN_T) {
    base = "较 1851 最高";
    pct = (v / 43216 - 1) * 100;
  }
  const col = peak ? C.gold : slope >= 0 ? P.up : P.dn;
  const popStr = v >= 10000 ? (v / 10000).toFixed(2) : Math.round(v).toLocaleString("en-US");
  const unit = v >= 10000 ? "亿人" : "万人";
  let pre = "";
  let num = "";
  if (rewind) {
    const s = rewindYear(t).replace(" 年", "");
    if (s.startsWith("公元")) {
      pre = "公元";
      num = s.replace("公元", "").trim();
    } else num = s;
  } else {
    const y = Math.floor(k.c);
    if (y < 1000) pre = "公元";
    num = String(Math.max(1, y));
  }
  const isBase = t >= HAN_T && Math.abs(pct) < 0.05;
  return { k, v, peak, rewind, base, pct, col, popStr, unit, pre, num, isBase, dyn: rewind ? "" : dynReign(k.c) };
};
const BrandRow: React.FC<{ size?: number }> = ({ size = 1 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12 * size }}>
    <Img src={staticFile("mark-disc.png")} style={{ width: 50 * size, height: 50 * size }} />
    <span style={{ font: `900 ${30 * size}px ${FONT_CN}`, color: "#f3f4f7", letterSpacing: 2 }}>世界的形状</span>
    <span style={{ width: 2, height: 26 * size, background: "rgba(255,255,255,0.25)" }} />
    <span style={{ font: `900 ${34 * size}px ${VAR === "A" ? FONT_SERIF : FONT_CN}`, color: C.gold, letterSpacing: 2 }}>两千年中国人口</span>
  </div>
);

// A · 史书: serif year as hero, vermilion seal for the change
const HeaderA: React.FC<{ t: number }> = ({ t }) => {
  const h = useHud(t);
  const seal = h.peak ? "见顶" : h.isBase ? "基点" : h.pct >= 0 ? `增 ${h.pct.toFixed(1)}%` : `减 ${(-h.pct).toFixed(1)}%`;
  return (
    <div style={{ position: "absolute", left: 58, top: 150 }}>
      <BrandRow />
      <div style={{ display: "flex", alignItems: "flex-end", gap: 30, marginTop: 18 }}>
        <div>
          <div style={{ font: `700 28px ${FONT_SERIF}`, color: "#b9b2a0", height: 36 }}>{h.rewind ? "回到" : h.dyn}</div>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            {h.pre && <span style={{ font: `900 44px ${FONT_SERIF}`, color: "#f4efe2", marginRight: 6 }}>{h.pre}</span>}
            <span style={{ font: `900 118px ${FONT_SERIF}`, color: "#f4efe2", lineHeight: 1 }}>{h.num}</span>
            <span style={{ font: `900 42px ${FONT_SERIF}`, color: "#f4efe2", marginLeft: 4 }}>年</span>
          </div>
        </div>
        <div style={{ marginBottom: 10, opacity: h.rewind ? 0.1 : 1 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ font: `900 76px ${FONT_SERIF}`, color: h.col, lineHeight: 1 }}>{h.popStr}</span>
            <span style={{ font: `900 30px ${FONT_SERIF}`, color: h.col }}>{h.unit}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8 }}>
            <span style={{ font: `500 22px ${FONT_SERIF}`, color: "#9a9384" }}>{h.peak ? "清代最高" : h.base}</span>
            <span style={{ display: "inline-block", transform: "rotate(-6deg)", border: `3px solid ${P.accent}`, color: P.accent, background: "rgba(216,64,44,0.1)", padding: "1px 9px", font: `900 26px ${FONT_SERIF}`, borderRadius: 3 }}>{seal}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
const PanelA: React.FC<{ t: number }> = ({ t }) => {
  const k = camAt(t);
  const a = t < HAN_T ? 1 - vis(t, 5.72, 99, 0.15, 0) : vis(t, 9.4, 99, 0.3, 0);
  if (a <= 0.01) return null;
  const rows = top5(k.c);
  const crash = t >= 2.0 && t < HAN_T;
  const baseY = crash ? 1851 : t >= HAN_T ? 2 : 0;
  return (
    <div style={{ position: "absolute", right: 64, top: 470, width: 400, opacity: a }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: `1px solid rgba(255,207,92,0.6)`, paddingBottom: 6 }}>
        <span style={{ font: `900 26px ${FONT_SERIF}`, color: C.gold }}>同年 · 世界人口</span>
        <span style={{ font: `500 16px ${FONT_SERIF}`, color: "#8a8478" }}>今国界</span>
      </div>
      {rows.map(([n, v]) => {
        const b = baseY ? top5(baseY).find((r) => r[0] === n)?.[1] : undefined;
        const ch = b ? (v / b - 1) * 100 : undefined;
        const cn = n === "中国";
        return (
          <div key={n} style={{ display: "flex", alignItems: "baseline", height: 44, borderBottom: "1px solid rgba(255,255,255,0.07)", paddingTop: 8 }}>
            <span style={{ width: 96, font: `900 26px ${FONT_SERIF}`, color: cn ? "#f4efe2" : "#a8a293" }}>{n}</span>
            <span style={{ flex: 1, font: `600 23px ${FONT_NUM}`, color: cn ? "#f4efe2" : "#a8a293" }}>{fmtPop(v)}</span>
            <span style={{ font: `700 21px ${FONT_NUM}`, color: ch === undefined ? "#a8a293" : ch >= 0 ? P.up : P.dn }}>{ch === undefined ? "" : `${ch >= 0 ? "+" : ""}${ch.toFixed(1)}%`}</span>
          </div>
        );
      })}
    </div>
  );
};

// B · 仪表: bracketed instrument readout, monospace digits, bar race
const Brackets: React.FC<{ w: number; h: number; c: string }> = ({ w, h, c }) => (
  <>
    {[[0, 0, "Top", "Left"], [w - 26, 0, "Top", "Right"], [0, h - 26, "Bottom", "Left"], [w - 26, h - 26, "Bottom", "Right"]].map(([x, y, v, hz], i) => (
      <div key={i} style={{ position: "absolute", left: x as number, top: y as number, width: 26, height: 26, [`border${v}`]: `3px solid ${c}`, [`border${hz}`]: `3px solid ${c}` }} />
    ))}
  </>
);
const HeaderB: React.FC<{ t: number }> = ({ t }) => {
  const h = useHud(t);
  const chip = (s: string, c = "#cfd6e4") => (
    <span style={{ border: "1px solid rgba(255,255,255,0.22)", padding: "2px 10px", font: `600 22px ${FONT_LAT}`, color: c, letterSpacing: 1, background: "rgba(255,255,255,0.04)" }}>{s}</span>
  );
  return (
    <div style={{ position: "absolute", left: 46, top: 140, width: 640, height: 268 }}>
      <Brackets w={640} h={268} c="rgba(255,201,77,0.8)" />
      <div style={{ position: "absolute", left: 26, top: 20 }}>
        <BrandRow size={0.82} />
        <div style={{ font: `600 17px ${FONT_LAT}`, color: "#7c8598", letterSpacing: 4, marginTop: 12 }}>POPULATION · 中国人口</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, opacity: h.rewind ? 0.12 : 1 }}>
          <span style={{ font: `800 96px ${FONT_LAT}`, color: h.col, lineHeight: 1.05, fontVariantNumeric: "tabular-nums", letterSpacing: -2, textShadow: `0 0 20px ${h.col}66` }}>{h.popStr}</span>
          <span style={{ font: `800 30px ${FONT_CN}`, color: h.col }}>{h.unit}</span>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
          {chip(`${h.pre ? "公元 " : ""}${h.num} 年`, "#fff")}
          {h.dyn && chip(h.dyn)}
          {!h.rewind && chip(h.peak ? "峰值" : h.isBase ? "基点" : `Δ ${h.pct >= 0 ? "+" : ""}${h.pct.toFixed(2)}%`, h.peak ? C.gold : h.pct >= 0 ? P.up : P.dn)}
        </div>
      </div>
    </div>
  );
};
const PanelB: React.FC<{ t: number }> = ({ t }) => {
  const k = camAt(t);
  const a = t < HAN_T ? 1 - vis(t, 5.72, 99, 0.15, 0) : vis(t, 9.4, 99, 0.3, 0);
  if (a <= 0.01) return null;
  const rows = top5(k.c);
  const mx = rows[0][1];
  return (
    <div style={{ position: "absolute", right: 56, top: 440, width: 360, opacity: a }}>
      <div style={{ font: `600 15px ${FONT_LAT}`, color: "#7c8598", letterSpacing: 3, marginBottom: 8 }}>WORLD TOP 5 · 世界人口前五</div>
      {rows.map(([n, v]) => {
        const cn = n === "中国";
        return (
          <div key={n} style={{ position: "relative", height: 36, marginBottom: 6, background: "rgba(255,255,255,0.05)" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(v / mx) * 100}%`, background: cn ? `rgba(${P.upRGB},0.35)` : "rgba(200,210,230,0.16)", borderRight: cn ? `3px solid ${P.up}` : "none" }} />
            <span style={{ position: "absolute", left: 10, top: 4, font: `700 21px ${FONT_CN}`, color: cn ? "#fff" : "#c3cad8" }}>{n}</span>
            <span style={{ position: "absolute", right: 10, top: 5, font: `600 19px ${FONT_LAT}`, color: cn ? "#fff" : "#aab2c2", fontVariantNumeric: "tabular-nums" }}>{fmtPop(v)}</span>
          </div>
        );
      })}
    </div>
  );
};

// C · 极简: giant outlined year behind, one quiet line of numbers, a world-share ring instead of a table
const HeaderC: React.FC<{ t: number }> = ({ t }) => {
  const h = useHud(t);
  return (
    <>
      <div style={{ position: "absolute", left: 58, top: 150 }}>
        <BrandRow size={0.9} />
      </div>
      <div style={{ position: "absolute", left: 40, top: 196 }}>
        {h.pre && <div style={{ font: `700 30px ${FONT_CN}`, color: "rgba(255,255,255,0.6)", marginLeft: 16, marginBottom: -24 }}>{h.pre}</div>}
        <div style={{ font: `800 270px ${FONT_NUM}`, color: "transparent", WebkitTextStroke: "2.5px rgba(255,255,255,0.55)", lineHeight: 1, letterSpacing: -4 }}>{h.num}</div>
      </div>
      <div style={{ position: "absolute", left: 60, top: 482, display: "flex", alignItems: "baseline", gap: 14, opacity: h.rewind ? 0.12 : 1 }}>
        <span style={{ font: `800 72px ${FONT_NUM}`, color: h.col, lineHeight: 1 }}>{h.popStr}</span>
        <span style={{ font: `700 28px ${FONT_CN}`, color: h.col }}>{h.unit}</span>
        <span style={{ font: `700 28px ${FONT_NUM}`, color: h.peak ? C.gold : h.pct >= 0 ? "#cfcac0" : P.dn }}>{h.peak ? "最高点" : h.isBase ? "基点" : `${h.pct >= 0 ? "+" : ""}${h.pct.toFixed(1)}%`}</span>
        <span style={{ font: `500 24px ${FONT_CN}`, color: "#8d93a0" }}>{h.dyn}</span>
      </div>
    </>
  );
};
const PanelC: React.FC<{ t: number }> = ({ t }) => {
  const k = camAt(t);
  const a = t < HAN_T ? 1 - vis(t, 5.72, 99, 0.15, 0) : vis(t, 9.4, 99, 0.3, 0);
  if (a <= 0.01) return null;
  const share = val(k.c) / worldAt(k.c);
  const R = 82;
  const L = 2 * Math.PI * R;
  return (
    <div style={{ position: "absolute", right: 70, top: 236, width: 210, textAlign: "center", opacity: a }}>
      <svg width={210} height={210} viewBox="0 0 210 210">
        <circle cx={105} cy={105} r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={12} />
        <circle cx={105} cy={105} r={R} fill="none" stroke={P.up} strokeWidth={12} strokeDasharray={`${L * share} ${L}`} transform="rotate(-90 105 105)" strokeLinecap="round" />
        <text x={105} y={112} textAnchor="middle" style={{ font: `800 50px ${FONT_NUM}`, fill: "#fff" }}>{Math.round(share * 100)}%</text>
        <text x={105} y={142} textAnchor="middle" style={{ font: `600 18px ${FONT_CN}`, fill: "#9aa1ae" }}>占世界人口</text>
      </svg>
    </div>
  );
};
const HEADERS: Record<string, React.FC<{ t: number }>> = { A: HeaderA, B: HeaderB, C: HeaderC };
const PANELS: Record<string, React.FC<{ t: number }>> = { A: PanelA, B: PanelB, C: PanelC };

// callouts
const Big: React.FC<{ t: number; a: number; text: string; color: string; x?: number; y: number; size?: number; children?: React.ReactNode }> = ({ t, a, text, color, x = 640, y, size = 128, children }) => {
  if (a <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,0) scale(${0.92 + 0.08 * a})`, opacity: a, textAlign: "center", whiteSpace: "nowrap" }}>
      <div style={{ font: `800 ${size}px ${FONT_NUM}`, color, lineHeight: 1, textShadow: P.split ? `0 0 26px ${color}99, 4px 0 0 rgba(255,0,60,0.35), -4px 0 0 rgba(0,220,255,0.35)` : `0 0 26px ${color}88`, fontFamily: VAR === "A" ? FONT_SERIF : undefined }}>{text}</div>
      {children}
    </div>
  );
};
const Overlays: React.FC<{ t: number }> = ({ t }) => {
  // 风暴前夜
  const a1 = vis(t, 1.0, 1.95, 0.08, 0.1);
  // crash counter
  const a2 = vis(t, 2.2, 5.65, 0.1, 0.12);
  const deaths = 11600 * ease((t - 2.1) / 2.4);
  const cnt = deaths >= 11600 ? "−1.16 亿" : `−${Math.round(deaths).toLocaleString("en-US")} 万`;
  const a3 = vis(t, 4.5, 5.65, 0.12, 0.12);
  const a4 = vis(t, 5.0, 5.65, 0.15, 0.12);
  // rewind labels
  let rw: string | null = null;
  for (const [a, y] of REWIND) if (t >= a && t < 6.75) rw = y;
  const ring = vis(t, 6.45, 6.95, 0.05, 0.3);
  // birth
  const b1 = vis(t, 6.75, 9.4, 0.15, 0.3);
  // 王莽
  const c1 = vis(t, 9.4, 11.4, 0.12, 0.15);
  const c2 = vis(t, 11.5, 14.6, 0.08, 0.3);
  const c3 = vis(t, 16.2, 18.2, 0.12, 0.2);
  return (
    <>
      {a1 > 0 && (
        <div style={{ position: "absolute", left: 50, top: 600, opacity: a1 }}>
          <div style={{ font: `${P.titleW} 70px ${P.title}`, color: C.gold, textShadow: glow("rgba(255,190,60,0.8)", 24) }}>风暴前夜</div>
          <div style={{ font: `700 28px ${FONT_CN}`, color: "#fff", marginTop: 6 }}>
            1851 · 世界每 3 个人，就有 1 个在中国
          </div>
        </div>
      )}
      {vis(t, 2.0, 4.4, 0.08, 0.15) > 0 && (
        <div style={{ position: "absolute", left: 56, top: 610, opacity: vis(t, 2.0, 4.4, 0.08, 0.15) }}>
          <div style={{ display: "inline-block", padding: "2px 12px", borderRadius: 4, background: `rgba(${P.dnRGB},0.18)`, border: `1px solid rgba(${P.dnRGB},0.6)`, font: `700 24px ${FONT_CN}`, color: P.dn }}>1851 · 战争</div>
          <div style={{ font: `${P.titleW} 58px ${P.title}`, color: "#fff", marginTop: 8, textShadow: glow(`rgba(${P.dnRGB},0.5)`) }}>太平天国起事</div>
          <div style={{ font: `500 27px ${FONT_CN}`, color: C.sub, marginTop: 6 }}>此后 27 年，回民战争、丁戊奇荒接连而来</div>
        </div>
      )}
      <Big t={t} a={a2} text={cnt} color={P.dn} x={400} y={880} size={118}>
        <div style={{ opacity: a3, font: `700 32px ${FONT_CN}`, color: "#fff", marginTop: 12 }}>死于战乱、饥荒与瘟疫</div>
        <div style={{ opacity: a3, font: `500 24px ${FONT_CN}`, color: C.sub, marginTop: 6 }}>1851—1878 · 曹树基《中国人口史》估算</div>
        <div style={{ opacity: a4, font: `800 34px ${FONT_CN}`, color: C.gold, marginTop: 14, textShadow: glow("rgba(255,190,60,0.6)") }}>接近今天整个日本的人口</div>
      </Big>
      {rw && (
        <div style={{ position: "absolute", left: 0, right: 0, top: rw.startsWith("公元") ? 720 : 560, textAlign: "center", opacity: rw.startsWith("公元") ? 0.55 + 0.45 * (1 - ring) : 1 }}>
          <div style={{ font: `700 54px ${FONT_CN}`, color: "#c9cfdb" }}>回到</div>
          <div style={{ font: `800 ${rw.startsWith("公元") ? 150 : 140}px ${FONT_NUM}`, color: "#fff", lineHeight: 1.05, textShadow: glow("rgba(255,255,255,0.35)", 30) }}>
            {rw.startsWith("公元") ? <><span style={{ font: `900 110px ${FONT_CN}` }}>公元 </span>2 年</> : rw}
          </div>
        </div>
      )}
      {ring > 0 && (
        <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 46%, transparent ${18 + ring * 30}%, rgba(255,255,255,${0.1 * ring}) ${20 + ring * 30}%, rgba(0,0,0,${0.55 * ring}) ${34 + ring * 30}%, transparent ${70 + ring * 20}%)` }} />
      )}
      {b1 > 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 560, textAlign: "center", opacity: b1 }}>
          <div style={{ font: `${P.titleW} 64px ${P.title}`, color: "#fff", textShadow: glow("rgba(255,255,255,0.3)") }}>第一次全国户口统计</div>
          <div style={{ font: `800 34px ${FONT_CN}`, color: C.gold, marginTop: 10 }}>公元 2 年 · 西汉元始二年 · 5,959 万人</div>
          <div style={{ font: `500 28px ${FONT_CN}`, color: C.sub, marginTop: 8 }}>《汉书·地理志》逐郡记下的户口</div>
        </div>
      )}
      {c1 > 0 && (
        <div style={{ position: "absolute", left: 56, top: 640, opacity: c1 }}>
          <div style={{ display: "inline-block", padding: "2px 12px", borderRadius: 4, background: `rgba(${P.dnRGB},0.18)`, border: `1px solid rgba(${P.dnRGB},0.6)`, font: `700 22px ${FONT_CN}`, color: P.dn }}>两汉之际</div>
          <div style={{ font: `${P.titleW} 50px ${P.title}`, color: "#fff", marginTop: 10 }}>王莽篡汉，天下大乱</div>
          <div style={{ font: `500 26px ${FONT_CN}`, color: C.sub, marginTop: 6 }}>绿林、赤眉起兵 · 饥荒连年</div>
        </div>
      )}
      <Big t={t} a={c2} text="−64.75%" color={P.dn} x={400} y={880}>
        <div style={{ font: `700 32px ${FONT_CN}`, color: "#fff", marginTop: 12 }}>登记户口 5,959 万 → 2,101 万</div>
        <div style={{ font: `500 24px ${FONT_CN}`, color: C.sub, marginTop: 6 }}>公元 2 年 → 公元 57 年</div>
      </Big>
      {c3 > 0 && (
        <div style={{ position: "absolute", left: 56, top: 640, opacity: c3 }}>
          <div style={{ display: "inline-block", padding: "2px 12px", borderRadius: 4, background: `rgba(${P.upRGB},0.18)`, border: `1px solid rgba(${P.upRGB},0.6)`, font: `700 22px ${FONT_CN}`, color: P.up }}>东汉</div>
          <div style={{ font: `${P.titleW} 50px ${P.title}`, color: "#fff", marginTop: 10 }}>百年休养，人口回来了</div>
          <div style={{ font: `500 26px ${FONT_CN}`, color: C.sub, marginTop: 6 }}>公元 157 年 · 登记 5,649 万</div>
        </div>
      )}
    </>
  );
};

const Grain: React.FC<{ f: number }> = ({ f }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <AbsoluteFill
      style={{
        opacity: 0.07,
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        backgroundPosition: `${(f * 37) % 220}px ${(f * 53) % 220}px`,
        mixBlendMode: "overlay",
      }}
    />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 70% at 50% 52%, transparent 55%, rgba(0,0,0,0.75) 100%)" }} />
  </AbsoluteFill>
);

export const T5: React.FC<{ audio?: string; variant?: string }> = ({ audio = "t5_mix.wav", variant = "A" }) => {
  P = PALS[variant];
  VAR = variant;
  const f = useCurrentFrame();
  const t = f / FPS;
  const h = hitAt(t);
  const r = rng(f * 13 + 5);
  const shx = (r() - 0.5) * 30 * h;
  const shy = (r() - 0.5) * 30 * h;
  const sp = 2 + 10 * h;
  const flash = Math.max(env(t, 4.5, 0.01, 0.12), env(t, 11.5, 0.01, 0.12), env(t, 2.0, 0.01, 0.08) * 0.6);
  return (
    <AbsoluteFill style={{ background: "#030406", overflow: "hidden" }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 90% 55% at 55% 70%, #0d1018 0%, #030406 75%)" }} />
      <AbsoluteFill
        style={{
          transform: `translate(${shx}px,${shy}px)`,
          filter: P.split ? `drop-shadow(${sp}px 0 0 rgba(255,0,60,${0.18 + 0.4 * h})) drop-shadow(${-sp}px 0 0 rgba(0,220,255,${0.18 + 0.4 * h}))` : h > 0.05 ? `drop-shadow(${sp * 0.6}px 0 0 rgba(255,0,60,${0.3 * h})) drop-shadow(${-sp * 0.6}px 0 0 rgba(0,220,255,${0.3 * h}))` : "none",
        }}
      >
        <Stage t={t} />
        {React.createElement(PANELS[variant], { t })}
        {React.createElement(HEADERS[variant], { t })}
        <Overlays t={t} />
      </AbsoluteFill>
      {flash > 0 && <AbsoluteFill style={{ background: `rgba(220,240,255,${0.35 * flash})`, mixBlendMode: "screen" }} />}
      <Grain f={f} />
      <Audio src={staticFile(audio)} />
    </AbsoluteFill>
  );
};
