// Sample v3 (21 s), our own look: 世界的形状 brand, dynasty ribbon, year-as-hero, gold = growth / ice = loss,
// people grid (1 figure = 100 万人). Cut to "跃动 · 碎拍" (lib-breakbeat-motion, 152 BPM) from 23.34 s; drop at 1.58 s.
import React, { useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, Img, staticFile, useCurrentFrame } from "remotion";
import { loadFont as loadSerif } from "@remotion/google-fonts/NotoSerifSC";
import { mono } from "../plan";
import { rng } from "../Chart";
import { FONT_CN, FONT_NUM } from "../theme";
import { HAN, QING, val } from "./data2";

const serif = loadSerif("normal", { weights: ["700", "900"], ignoreTooManyRequestsWarning: true });
const FONT_SERIF = `${serif.fontFamily}, "Songti SC", serif`;

const W = 1080;
const H = 1920;
const FPS = 30;
export const T3_FRAMES = 21 * FPS;

const GOLD = "#ffcf5c";
const GOLD_RGB = "255,207,92";
const ICE = "#7fe3ff";
const ICE_RGB = "127,227,255";
const MUTED = "#8a93a6";

// ---------------- musical clock
const BEAT = 60 / 152;
const BARL = 4 * BEAT;
const D = 1.58; // the drop
const bar = (k: number) => D + k * BARL;
const beatPulse = (t: number) => {
  const ph = (((t - D) / BEAT) % 1 + 1) % 1;
  return Math.exp(-ph * 6);
};

// ---------------- timeline
const HAN_T = bar(4) - 0.02;
const QCUR = mono([[0, 1776], [1.1, 1851], [bar(0), 1851.02], [bar(2), 1880], [bar(3), 1880.15]]);
const HCUR = mono([[HAN_T, 2], [bar(5), 2], [bar(7), 57], [bar(9), 60], [bar(12), 157], [21, 160]]);
const QSPAN = mono([[0, 70], [1.1, 85], [bar(0), 85], [bar(2), 62], [bar(3), 62]]);
const QHX = mono([[0, 0.7], [1.1, 0.72], [bar(0), 0.72], [bar(2), 0.8], [bar(3), 0.8]]);
// Han: camera window [x0, x1]
const HX0 = mono([[HAN_T, -4], [bar(9), -4], [bar(12), -6], [21, -6]]);
const HX1 = mono([[HAN_T, 70], [bar(9), 70], [bar(12), 172], [21, 176]]);
const sceneOf = (t: number) => (t < HAN_T ? "qing" : "han");
const GAPS: [number, number][] = [[2, 57], [1851, 1880]];

const env = (t: number, t0: number, a = 0.02, d = 0.3) => (t < t0 - a ? 0 : t < t0 ? (t - t0 + a) / a : Math.exp(-(t - t0) / d));
const vis = (t: number, a: number, b: number, fi = 0.12, fo = 0.18) =>
  t < a || t > b + fo ? 0 : t < a + fi ? (t - a) / fi : t > b ? 1 - (t - b) / fo : 1;
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const HITS: [number, number][] = [[1.1, 0.25], [bar(0), 1.0], [bar(2), 1.0], [bar(4), 0.5], [bar(7), 1.0], [bar(10), 0.3]];
const hitAt = (t: number) => HITS.reduce((m, [t0, k]) => Math.max(m, k * env(t, t0, 0.02, 0.25)), 0);

// ---------------- camera
const Y_TOP = 690;
const Y_BOT = 1080;
const FLOOR = 1110;
type Cam = { c: number; x0: number; x1: number; lo: number; hi: number };
const rawCam = (t: number): Cam => {
  if (sceneOf(t) === "qing") {
    const c = QCUR(t);
    const span = QSPAN(t);
    const hx = QHX(t);
    const x0 = c - span * hx;
    return { c, x0, x1: x0 + span, lo: 0, hi: 0 };
  }
  return { c: HCUR(t), x0: HX0(t), x1: HX1(t), lo: 0, hi: 0 };
};
const rangeOf = (t: number) => {
  const k = rawCam(t);
  const start = sceneOf(t) === "qing" ? 1741 : 2;
  const a = Math.max(start, k.x0);
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i <= 30; i++) {
    const v = val(a + ((k.c - a) * i) / 30);
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  if (sceneOf(t) === "han") {
    lo = Math.min(lo, 1800);
    hi = Math.max(hi, 6100);
  }
  return [lo, hi];
};
const camAt = (t: number): Cam => {
  const k = rawCam(t);
  let lo = 0;
  let hi = 0;
  let n = 0;
  for (let i = 0; i < 10; i++) {
    const tt = t - i * 0.05;
    if (tt < 0 || sceneOf(tt) !== sceneOf(t)) break;
    const [l, h] = rangeOf(tt);
    lo += l;
    hi += h;
    n++;
  }
  lo /= n;
  hi /= n;
  const r = Math.max(hi - lo, hi * 0.16);
  return { ...k, lo: lo - 0.12 * r, hi: hi + 0.12 * r };
};
const X = (k: Cam, y: number) => ((y - k.x0) / (k.x1 - k.x0)) * W;
const Yv = (k: Cam, v: number) => Y_BOT - ((v - k.lo) / (k.hi - k.lo)) * (Y_BOT - Y_TOP);
const headAt = (t: number) => {
  const k = camAt(t);
  return { x: X(k, k.c), y: Yv(k, val(k.c)), up: val(k.c) >= val(k.c - 0.4) - 0.01 };
};

// ---------------- chart: area + glowing line; census gaps dashed
const drawChart = (ctx: CanvasRenderingContext2D, t: number, alpha: number) => {
  if (alpha <= 0) return;
  const k = camAt(t);
  const start = sceneOf(t) === "qing" ? 1741 : 2;
  const a = Math.max(start, k.x0 - 2);
  const c = k.c;
  ctx.save();
  ctx.globalAlpha = alpha;
  // grid
  const step = k.hi - k.lo > 12000 ? 5000 : k.hi - k.lo > 5000 ? 1000 : 500;
  ctx.font = `600 22px ${FONT_NUM}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "right";
  for (let v = Math.ceil(k.lo / step) * step; v < k.hi; v += step) {
    const y = Yv(k, v);
    ctx.strokeStyle = "rgba(170,185,210,0.07)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, y);
    ctx.lineTo(W - 60, y);
    ctx.stroke();
    ctx.fillStyle = "rgba(170,180,200,0.4)";
    ctx.fillText(v >= 10000 ? `${(v / 10000).toFixed(1)}亿` : `${v / 1000}千万`, W - 60, y - 14);
  }
  ctx.strokeStyle = "rgba(170,185,210,0.22)";
  ctx.beginPath();
  ctx.moveTo(0, FLOOR);
  ctx.lineTo(W, FLOOR);
  ctx.stroke();
  // samples
  const N = 220;
  const pts: { x: number; y: number; v: number; gap: boolean }[] = [];
  for (let i = 0; i <= N; i++) {
    const yr = a + ((c - a) * i) / N;
    const v = val(yr);
    pts.push({ x: X(k, yr), y: Yv(k, v), v, gap: GAPS.some(([g0, g1]) => yr > g0 && yr < g1 + 0.001) });
  }
  // area, coloured by slope
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1];
    const q = pts[i];
    const up = q.v >= p.v - 0.01;
    const rgb = up ? GOLD_RGB : ICE_RGB;
    const g = ctx.createLinearGradient(0, Math.min(p.y, q.y), 0, FLOOR);
    g.addColorStop(0, `rgba(${rgb},${q.gap ? 0.1 : 0.3})`);
    g.addColorStop(1, `rgba(${rgb},0.02)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x + 0.6, q.y);
    ctx.lineTo(q.x + 0.6, FLOOR);
    ctx.lineTo(p.x, FLOOR);
    ctx.fill();
  }
  // line
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (const pass of [0, 1]) {
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1];
      const q = pts[i];
      const up = q.v >= p.v - 0.01;
      ctx.setLineDash(q.gap ? [12, 10] : []);
      ctx.strokeStyle = pass === 0 ? (up ? `rgba(${GOLD_RGB},0.5)` : `rgba(${ICE_RGB},0.5)`) : up ? "#fff1cc" : "#d9f7ff";
      ctx.shadowColor = up ? GOLD : ICE;
      ctx.shadowBlur = pass === 0 ? 24 : 8;
      ctx.lineWidth = pass === 0 ? 9 : 3.2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
      ctx.stroke();
    }
  }
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;
  // census markers (records)
  const recs = sceneOf(t) === "qing" ? QING : HAN;
  ctx.font = `600 20px ${FONT_NUM}`;
  ctx.textAlign = "center";
  for (const [yr, v] of recs) {
    if (yr > c + 0.001 || yr < a) continue;
    const x = X(k, yr);
    const y = Yv(k, v);
    ctx.fillStyle = "#fff";
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-5, -5, 10, 10);
    ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.moveTo(x, y + 10);
    ctx.lineTo(x, FLOOR);
    ctx.stroke();
  }
  // year ticks on the floor
  const span = k.x1 - k.x0;
  const dstep = span > 120 ? 50 : span > 50 ? 10 : 5;
  ctx.fillStyle = "rgba(190,200,220,0.45)";
  ctx.font = `600 22px ${FONT_NUM}`;
  for (let y = Math.ceil(k.x0 / dstep) * dstep; y <= k.x1; y += dstep) {
    if (y < start) continue;
    ctx.fillText(y < 1000 ? `${y}` : `${y}`, X(k, y), FLOOR + 26);
  }
  ctx.restore();
};

// ---------------- people grid (1 figure = 200 万人)
const GC = 20;
const GR = 12;
const GX = 110;
const GY = 1196;
const CW = 40;
const CH = 31;
const FS = 1.6;
type Fig = { born: number; dead: number; revive: number };
const mkFigs = () => Array.from({ length: GC * GR }, () => ({ born: Infinity, dead: Infinity, revive: Infinity }) as Fig);
// Qing: 104 figures in 1776 → 216 in 1851; 1851–1878: 58 die (1.16 亿), 24 born → 182 in 1880 (3.64 亿)
const QF = (() => {
  const f = mkFigs();
  const r = rng(41);
  for (let i = 0; i < 216; i++) {
    // born when the population passes (i+1) 百万
    let lo = 0;
    let hi = 1.1;
    for (let n = 0; n < 20; n++) {
      const m = (lo + hi) / 2;
      if (val(QCUR(m)) / 200 < i + 1) lo = m;
      else hi = m;
    }
    f[i].born = i < 104 ? -1 : hi;
  }
  const idx = Array.from({ length: 216 }, (_, i) => i).sort(() => r() - 0.5).slice(0, 58);
  idx.forEach((i, n) => (f[i].dead = bar(0) + 0.15 + (bar(2) - bar(0) - 0.2) * ease((n + r() * 0.8) / 58)));
  for (let i = 216; i < 240; i++) f[i].born = bar(0) + 0.3 + ((bar(2) - bar(0) - 0.3) * (i - 216)) / 24;
  return f;
})();
// Han: census counts 30 figures (5,959 万) over one bar; 19 die by 57 (≈2,200 万); 17 come back by 157 (≈5,600 万)
const HF = (() => {
  const f = mkFigs();
  const r = rng(43);
  for (let i = 0; i < 30; i++) f[i].born = bar(4) + (BARL * 0.95 * i) / 30;
  const idx = Array.from({ length: 30 }, (_, i) => i).sort(() => r() - 0.5).slice(0, 19);
  idx.forEach((i, n) => {
    f[i].dead = bar(5) + (bar(7) - bar(5)) * ((n + 0.5) / 19);
    if (n < 17) f[i].revive = bar(9) + (bar(12) - bar(9)) * ((n + 0.5) / 17);
  });
  return f;
})();
const drawFigure = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number) => {
  ctx.beginPath();
  ctx.arc(x, y - 7.5 * s, 3.6 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  const w = 9.5 * s;
  const h = 11 * s;
  const r = 4 * s;
  const x0 = x - w / 2;
  const y0 = y - 2.5 * s;
  ctx.moveTo(x0 + r, y0);
  ctx.lineTo(x0 + w - r, y0);
  ctx.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
  ctx.lineTo(x0 + w, y0 + h);
  ctx.lineTo(x0, y0 + h);
  ctx.lineTo(x0, y0 + r);
  ctx.quadraticCurveTo(x0, y0, x0 + r, y0);
  ctx.fill();
};
const drawPeople = (ctx: CanvasRenderingContext2D, t: number, alpha: number) => {
  if (alpha <= 0) return;
  const figs = sceneOf(t) === "qing" ? QF : HF;
  const pulse = beatPulse(t);
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let i = 0; i < figs.length; i++) {
    const f = figs[i];
    if (t < f.born) continue;
    const x = GX + (i % GC) * CW + CW / 2;
    const yb = GY + Math.floor(i / GC) * CH + CH / 2;
    const age = t - f.born;
    const deadNow = t >= f.dead && t < f.revive;
    let col = `rgba(255,232,190,${0.5 + 0.12 * pulse})`;
    let s = 1;
    let dy = 0;
    if (age < 0.3 && f.born > 0) {
      s = 0.5 + 0.5 * ease(age / 0.3) + 0.25 * Math.sin((age / 0.3) * Math.PI);
      col = `rgba(${GOLD_RGB},${0.6 + 0.4 * (1 - age / 0.3)})`;
    }
    if (deadNow) {
      const dt = t - f.dead;
      if (dt < 0.35) {
        col = `rgba(210,250,255,${1 - dt * 1.5})`;
        s = 1 + dt;
      } else col = `rgba(${ICE_RGB},0.14)`;
      dy = Math.min(1, dt / 0.35) * 6;
    } else if (t >= f.revive && t - f.revive < 0.3) {
      col = `rgba(${GOLD_RGB},0.95)`;
      s = 1.2;
    }
    ctx.fillStyle = col;
    drawFigure(ctx, x, yb + dy * FS, s * FS);
  }
  ctx.restore();
};

// ---------------- particles, lightning
type Burst = { t: number; n: number; seed: number; col: string; sp: number; g: number; life: number };
const BURSTS: Burst[] = [
  { t: 1.1, n: 110, seed: 11, col: GOLD_RGB, sp: 620, g: 400, life: 1.0 },
  { t: bar(2), n: 240, seed: 12, col: "210,250,255", sp: 820, g: 900, life: 1.1 },
  { t: bar(4) + 0.05, n: 120, seed: 13, col: GOLD_RGB, sp: 480, g: 300, life: 1.1 },
  { t: bar(7), n: 240, seed: 14, col: "210,250,255", sp: 820, g: 900, life: 1.1 },
  { t: bar(10), n: 140, seed: 15, col: GOLD_RGB, sp: 600, g: 380, life: 1.2 },
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
      const y = h.y + (Math.sin(ang) * sp * (1 - drag)) / 2.2 + 0.25 * b.g * dt * dt;
      ctx.fillStyle = `rgba(${b.col},${1 - dt / life})`;
      const s = 2 + r() * 3;
      ctx.fillRect(x, y, s, s);
    }
  }
  ctx.restore();
};
const drawHead = (ctx: CanvasRenderingContext2D, t: number, alpha: number) => {
  if (alpha <= 0) return;
  const h = headAt(t);
  const peak = t >= 1.1 && t < bar(0);
  const rgb = peak || h.up ? GOLD_RGB : ICE_RGB;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  // trailing sparks
  for (let i = 0; i < 16; i++) {
    const tb = Math.floor(t * 30) / 30 - i / 30;
    if (tb < 0 || sceneOf(tb) !== sceneOf(t)) continue;
    const hb = headAt(tb);
    const r = rng(Math.round(tb * 30) * 7 + 3);
    for (let j = 0; j < 3; j++) {
      const dt = t - tb;
      const x = hb.x + (r() - 0.7) * 200 * dt;
      const y = hb.y + (r() - 0.6) * 240 * dt + 240 * dt * dt;
      const a = (1 - dt / 0.55) * 0.9 * alpha;
      if (a <= 0) continue;
      ctx.fillStyle = `rgba(${rgb},${a})`;
      ctx.fillRect(x, y, 2.5, 2.5);
    }
  }
  const R = 70 + 30 * beatPulse(t);
  const g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, R);
  g.addColorStop(0, `rgba(255,255,255,${alpha})`);
  g.addColorStop(0.1, `rgba(${rgb},${0.9 * alpha})`);
  g.addColorStop(0.4, `rgba(${rgb},${0.2 * alpha})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(h.x - R, h.y - R, 2 * R, 2 * R);
  // beat ring
  const ph = (((t - D) / BEAT) % 1 + 1) % 1;
  ctx.strokeStyle = `rgba(${rgb},${0.5 * (1 - ph) * alpha})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(h.x, h.y, 14 + ph * 46, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
};
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
const STRIKES = [{ t: bar(2), seed: 31 }, { t: bar(7), seed: 32 }];
const drawLightning = (ctx: CanvasRenderingContext2D, t: number) => {
  for (const s of STRIKES) {
    const dt = t - s.t;
    if (dt < -0.04 || dt > 0.7) continue;
    const h = headAt(s.t);
    const flick = dt < 0 ? 0.5 : [1, 0.35, 1, 0.8, 0.25, 0.9, 0.6, 0.4][Math.floor(dt * 30) % 8] * Math.max(0, 1 - dt / 0.7);
    const main = bolt(s.seed + Math.floor(dt * 15), h.x - 140, -60, h.x, h.y, 420);
    const r = rng(s.seed * 3);
    const paths = [main];
    for (let b = 0; b < 4; b++) {
      const i = Math.floor(main.length * (0.2 + r() * 0.6));
      const [bx, by] = main[i];
      paths.push(bolt(s.seed * 7 + b, bx, by, bx + (r() - 0.5) * 520, by + 160 + r() * 380, 200));
    }
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    paths.forEach((pts, pi) => {
      const w = pi === 0 ? 1 : 0.5;
      for (const [lw, col, blur] of [
        [14 * w, `rgba(${ICE_RGB},${0.25 * flick})`, 40],
        [5 * w, `rgba(200,245,255,${0.7 * flick})`, 20],
        [2 * w, `rgba(255,255,255,${flick})`, 6],
      ] as [number, string, number][]) {
        ctx.strokeStyle = col;
        ctx.lineWidth = lw;
        ctx.shadowColor = ICE;
        ctx.shadowBlur = blur;
        ctx.beginPath();
        pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
      }
    });
    if (dt >= 0) {
      const g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, 280);
      g.addColorStop(0, `rgba(220,250,255,${0.8 * flick})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(h.x - 280, h.y - 280, 560, 560);
      const rr = 40 + dt * 900;
      ctx.strokeStyle = `rgba(${ICE_RGB},${0.55 * Math.max(0, 1 - dt / 0.6)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(h.x, h.y, rr, rr * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
};

// rewind: time-tunnel streaks
const drawRewind = (ctx: CanvasRenderingContext2D, t: number) => {
  const a = vis(t, bar(3), bar(4) - 0.05, 0.08, 0.12);
  if (a <= 0) return;
  const r = rng(77);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 90; i++) {
    const x = r() * W;
    const sp = 2200 + r() * 2600;
    const len = 120 + r() * 380;
    const y = ((r() * H + (t - bar(3)) * sp) % (H + len)) - len;
    const g = ctx.createLinearGradient(0, y, 0, y + len);
    const rgb = r() < 0.5 ? GOLD_RGB : "255,255,255";
    g.addColorStop(0, `rgba(${rgb},0)`);
    g.addColorStop(1, `rgba(${rgb},${0.45 * a})`);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, 2 + r() * 2, len);
  }
  ctx.restore();
};

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
    const rewinding = t > bar(3) && t < bar(4);
    const chartA = sceneOf(t) === "qing" ? 1 - vis(t, bar(3), 99, 0.35, 0) : Math.min(1, (t - HAN_T) / 0.25);
    drawPeople(b, t, sceneOf(t) === "qing" ? 1 - vis(t, bar(3), 99, 0.35, 0) : 1);
    drawChart(b, t, chartA);
    drawHead(b, t, rewinding ? 0 : chartA);
    drawBursts(b, t);
    const ctx = ref.current.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);
    if (t > bar(0) && t < bar(0) + 0.3) {
      const r = rng(Math.floor(t * 30) * 17);
      ctx.drawImage(BUF, 0, 0);
      for (let i = 0; i < 9; i++) {
        const y = r() * H;
        const h = 20 + r() * 120;
        ctx.drawImage(BUF, 0, y, W, h, (r() - 0.5) * 160, y, W, h);
      }
    } else ctx.drawImage(BUF, 0, 0);
    drawRewind(ctx, t);
    drawLightning(ctx, t);
  }, [t, ready]);
  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0 }} />;
};

// ---------------- HUD
const DYN: [string, number, number][] = [
  ["西汉", -202, 8], ["新", 9, 23], ["东汉", 25, 220], ["三国", 220, 280], ["晋", 266, 420], ["南北朝", 420, 589],
  ["隋", 581, 618], ["唐", 618, 907], ["五代", 907, 960], ["宋", 960, 1279], ["元", 1271, 1368], ["明", 1368, 1644],
  ["清", 1644, 1912], ["民国", 1912, 1949], ["新中国", 1949, 2030],
];
const REIGN: [string, number, number][] = [
  ["平帝", 1, 5], ["王莽", 6, 23], ["光武帝", 25, 57], ["明帝", 58, 75], ["章帝", 76, 88], ["和帝", 89, 105],
  ["安帝", 107, 125], ["顺帝", 126, 144], ["桓帝", 147, 167],
  ["乾隆", 1736, 1795], ["嘉庆", 1796, 1820], ["道光", 1821, 1850], ["咸丰", 1851, 1861], ["同治", 1862, 1874], ["光绪", 1875, 1908],
];
const dynOf = (y: number) => {
  const d = [...DYN].reverse().find(([, a, b]) => y >= a && y <= b);
  return d ? d[0] : "";
};
const reignOf = (y: number) => REIGN.find(([, a, b]) => y >= a && y <= b + 0.999)?.[0] ?? "";
const RX0 = 70;
const RX1 = 1010;
const RY0 = -210;
const RY1 = 2030;
const rx = (y: number) => RX0 + ((y - RY0) / (RY1 - RY0)) * (RX1 - RX0);

const REW: [number, number, string][] = [
  [bar(3), 1644, "清"],
  [bar(3) + BEAT, 1368, "明"],
  [bar(3) + 2 * BEAT, 618, "唐"],
  [bar(3) + 3 * BEAT, 2, "汉"],
];
const yearNow = (t: number) => {
  if (t > bar(3) && t < HAN_T) {
    // odometer: spin from the last stop to the next
    let from = 1880;
    for (const [t0, y] of REW) {
      if (t >= t0) from = y;
    }
    return from;
  }
  return camAt(t).c;
};

const Brand: React.FC = () => (
  <div style={{ position: "absolute", left: 60, top: 150, display: "flex", alignItems: "center", gap: 14 }}>
    <Img src={staticFile("mark-disc.png")} style={{ width: 52, height: 52 }} />
    <div style={{ font: `900 32px ${FONT_CN}`, color: "#f3f4f7", letterSpacing: 2 }}>世界的形状</div>
    <div style={{ width: 2, height: 26, background: "rgba(255,255,255,0.25)" }} />
    <div style={{ font: `700 27px ${FONT_SERIF}`, color: GOLD }}>两千年 · 中国人口</div>
  </div>
);
const Ribbon: React.FC<{ t: number }> = ({ t }) => {
  const y = yearNow(t);
  const cur = dynOf(y);
  const pulse = beatPulse(t);
  return (
    <div style={{ position: "absolute", left: 0, top: 232, width: W, height: 60 }}>
      {DYN.map(([n, a, b], i) => {
        const on = n === cur;
        const x0 = rx(Math.max(a, RY0));
        const x1 = rx(Math.min(b, RY1));
        return (
          <div key={n} style={{ position: "absolute", left: x0, top: 0, width: x1 - x0 - 2, height: 38, background: on ? `rgba(${GOLD_RGB},0.85)` : i % 2 ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.14)", borderRadius: 3 }}>
            {x1 - x0 > 34 && (
              <div style={{ font: `700 ${on ? 22 : 18}px ${FONT_SERIF}`, color: on ? "#1a1205" : "rgba(220,226,238,0.6)", textAlign: "center", lineHeight: "38px", whiteSpace: "nowrap", overflow: "hidden" }}>{n}</div>
            )}
          </div>
        );
      })}
      <div style={{ position: "absolute", left: rx(y) - 1.5, top: -8, width: 3, height: 54, background: "#fff", boxShadow: `0 0 ${10 + 14 * pulse}px ${GOLD}` }} />
      <div style={{ position: "absolute", left: RX0, top: 44, font: `600 17px ${FONT_NUM}`, color: MUTED }}>前 202</div>
      <div style={{ position: "absolute", right: W - RX1, top: 44, font: `600 17px ${FONT_NUM}`, color: MUTED }}>2025</div>
    </div>
  );
};
const Hero: React.FC<{ t: number }> = ({ t }) => {
  const y = yearNow(t);
  const rewind = t > bar(3) && t < HAN_T;
  const census = t >= HAN_T && t < bar(5);
  let v = val(camAt(t).c);
  if (census) v = 5959.4 * ease((t - bar(4)) / (BARL * 0.95));
  const k = camAt(t);
  const slope = val(k.c) - val(k.c - 0.4);
  const peak = t >= 1.1 && t < bar(0);
  const col = peak ? GOLD : slope < -0.01 ? ICE : GOLD;
  const han = sceneOf(t) === "han";
  const base = han ? 5959.4 : 43216;
  const pct = (v / base - 1) * 100;
  const yi = Math.floor(y);
  const yStr = yi < 1000 ? String(Math.max(1, yi)) : String(yi);
  const sub = `${dynOf(y)}${reignOf(y) ? " · " + reignOf(y) : ""}`;
  return (
    <div style={{ position: "absolute", left: 60, top: 316, width: W - 120, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
      <div>
        <div style={{ font: `700 26px ${FONT_SERIF}`, color: MUTED, height: 34 }}>{rewind ? "回到" : sub}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          {yi < 1000 && <span style={{ font: `900 50px ${FONT_SERIF}`, color: "#fff" }}>公元</span>}
          <span style={{ font: `800 150px ${FONT_NUM}`, color: "#fff", lineHeight: 0.9, textShadow: "0 0 30px rgba(255,255,255,0.25)" }}>{yStr}</span>
          <span style={{ font: `900 44px ${FONT_SERIF}`, color: "#fff" }}>年</span>
        </div>
      </div>
      <div style={{ textAlign: "right", opacity: rewind ? 0.15 : 1, marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "flex-end", gap: 6 }}>
          <span style={{ font: `800 84px ${FONT_NUM}`, color: col, textShadow: `0 0 24px ${col}88`, lineHeight: 1 }}>
            {v >= 10000 ? (v / 10000).toFixed(2) : Math.round(v).toLocaleString("en-US")}
          </span>
          <span style={{ font: `900 32px ${FONT_SERIF}`, color: col }}>{v >= 10000 ? "亿人" : "万人"}</span>
        </div>
        <div style={{ marginTop: 6, font: `700 24px ${FONT_CN}`, color: peak ? "#1a1205" : pct >= 0 ? GOLD : ICE, background: peak ? GOLD : "rgba(255,255,255,0.06)", display: "inline-block", padding: "2px 12px", borderRadius: 4 }}>
          {peak ? "清代最高 · 占世界 1/3" : census ? "清点中…" : `较${han ? "公元 2 年" : " 1851 年"} ${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`}
        </div>
      </div>
    </div>
  );
};

const Callout: React.FC<{ t: number; t0: number; t1: number; tag: string; title: string; sub?: string; color?: string; top?: number }> = ({ t, t0, t1, tag, title, sub, color = GOLD, top = 560 }) => {
  const a = vis(t, t0, t1, 0.15, 0.2);
  if (a <= 0) return null;
  const reveal = ease((t - t0) / 0.25);
  return (
    <div style={{ position: "absolute", left: 60, top, opacity: a, display: "flex", gap: 18 }}>
      <div style={{ width: 6, background: color, borderRadius: 3, boxShadow: `0 0 14px ${color}` }} />
      <div style={{ clipPath: `inset(0 ${100 - reveal * 100}% 0 0)` }}>
        <div style={{ font: `700 22px ${FONT_NUM}`, color, letterSpacing: 2 }}>{tag}</div>
        <div style={{ font: `900 58px ${FONT_SERIF}`, color: "#fff", lineHeight: 1.15, marginTop: 4 }}>{title}</div>
        {sub && <div style={{ font: `500 26px ${FONT_CN}`, color: "#c4cad6", marginTop: 8 }}>{sub}</div>}
      </div>
    </div>
  );
};
const BigNum: React.FC<{ a: number; text: string; color: string; y: number; children?: React.ReactNode }> = ({ a, text, color, y, children }) => {
  if (a <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, textAlign: "center", opacity: a, transform: `scale(${0.9 + 0.1 * a})` }}>
      <div style={{ font: `800 136px ${FONT_NUM}`, color, lineHeight: 1, textShadow: `0 0 30px ${color}aa` }}>{text}</div>
      {children}
    </div>
  );
};
const Overlays: React.FC<{ t: number }> = ({ t }) => {
  const deaths = 11600 * ease((t - bar(0) - 0.15) / (bar(2) - bar(0) - 0.2));
  const cnt = deaths >= 11599 ? "−1.16 亿" : `−${Math.round(deaths).toLocaleString("en-US")} 万`;
  const rw = [...REW].reverse().find(([t0]) => t >= t0 && t < HAN_T);
  return (
    <>
      <Callout t={t} t0={0.25} t1={1.5} tag="1741 → 1851" title="110 年，人口变成 3 倍" sub="1.43 亿 → 4.32 亿" />
      <Callout t={t} t0={bar(0)} t1={bar(2) - 0.1} tag="1851 · 战争" title="太平天国起事" sub="此后 27 年：回民战争、丁戊奇荒接连而来" color={ICE} />
      <BigNum a={vis(t, bar(0) + 0.3, bar(3) - 0.05, 0.15, 0.15)} text={cnt} color={ICE} y={760}>
        <div style={{ opacity: vis(t, bar(2), bar(3) - 0.05, 0.1, 0.15), font: `900 40px ${FONT_SERIF}`, color: "#fff", marginTop: 10 }}>死于战乱、饥荒与瘟疫</div>
        <div style={{ opacity: vis(t, bar(2) + 2 * BEAT, bar(3) - 0.05, 0.1, 0.15), font: `700 30px ${FONT_CN}`, color: GOLD, marginTop: 10 }}>差不多是今天整个日本的人口</div>
      </BigNum>
      {rw && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 700, textAlign: "center" }}>
          <div style={{ font: `900 220px ${FONT_SERIF}`, color: "#fff", lineHeight: 1, textShadow: `0 0 40px ${GOLD}`, opacity: 1 - 0.5 * ((t - rw[0]) / BEAT) }}>{rw[2]}</div>
        </div>
      )}
      <Callout t={t} t0={bar(4)} t1={bar(5) - 0.05} tag="公元 2 年 · 西汉元始二年" title="第一次全国户口统计" sub="《汉书·地理志》逐郡记下：5,959 万人" />
      <Callout t={t} t0={bar(5)} t1={bar(7) - 0.05} tag="公元 9—23 年" title="王莽篡汉，天下大乱" sub="绿林、赤眉起兵，饥荒连年" color={ICE} />
      <BigNum a={vis(t, bar(7), bar(9) - 0.05, 0.08, 0.2)} text="−64.75%" color={ICE} y={760}>
        <div style={{ font: `900 40px ${FONT_SERIF}`, color: "#fff", marginTop: 10 }}>登记人口：5,959 万 → 2,101 万</div>
        <div style={{ font: `500 26px ${FONT_CN}`, color: "#c4cad6", marginTop: 8 }}>公元 2 年 → 公元 57 年</div>
      </BigNum>
      <Callout t={t} t0={bar(9) + 0.05} t1={bar(12)} tag="东汉 · 公元 57 → 157 年" title="一百年，人口回来了" sub="公元 157 年登记 5,649 万" />
      <div style={{ position: "absolute", left: GX, top: GY - 40, font: `600 21px ${FONT_CN}`, color: MUTED }}>
        每个人形 = 200 万人
      </div>
    </>
  );
};

const Grain: React.FC<{ f: number }> = ({ f }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <AbsoluteFill
      style={{
        opacity: 0.06,
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        backgroundPosition: `${(f * 37) % 220}px ${(f * 53) % 220}px`,
        mixBlendMode: "overlay",
      }}
    />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 85% 70% at 50% 50%, transparent 60%, rgba(0,0,0,0.7) 100%)" }} />
  </AbsoluteFill>
);

export const T3: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const h = hitAt(t);
  const r = rng(f * 13 + 5);
  const shx = (r() - 0.5) * 28 * h;
  const shy = (r() - 0.5) * 28 * h;
  const flash = Math.max(env(t, bar(2), 0.01, 0.12), env(t, bar(7), 0.01, 0.12), env(t, bar(0), 0.01, 0.08) * 0.5);
  const fadeOut = 1 - vis(t, 20.5, 99, 0.5, 0);
  return (
    <AbsoluteFill style={{ background: "#05070b", overflow: "hidden" }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 100% 55% at 50% 60%, #0e1420 0%, #05070b 72%)" }} />
      <AbsoluteFill style={{ transform: `translate(${shx}px,${shy}px)`, opacity: fadeOut }}>
        <Stage t={t} />
        <Ribbon t={t} />
        <Hero t={t} />
        <Overlays t={t} />
        <Brand />
      </AbsoluteFill>
      {flash > 0 && <AbsoluteFill style={{ background: `rgba(220,245,255,${0.35 * flash})`, mixBlendMode: "screen" }} />}
      <Grain f={f} />
      <Audio src={staticFile("t3.wav")} />
    </AbsoluteFill>
  );
};
