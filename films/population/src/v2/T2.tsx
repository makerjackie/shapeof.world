// Test clip (18 s): the reference's first 18 s, beat for beat, on Chinese population.
// 0–1 boom (1776→1851) · 1 peak 见顶 · 2 crash (太平天国…) · 4.5 lightning · 5.75 rewind · 6.75 公元 2 年 · 11.5 lightning · 15 recovery
import React, { useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { mono } from "../plan";
import { rng } from "../Chart";
import { C, FONT_CN, FONT_LAT, FONT_NUM } from "../theme";
import { fmtPop, top5, val, yearLabel } from "./data2";

const W = 1080;
const H = 1920;
const FPS = 30;
export const T2_FRAMES = 18 * FPS;

// ---------------- timeline
const HAN_T = 6.62; // scene switch
const QCUR = mono([[0, 1776], [1.0, 1851], [2.0, 1851.35], [4.5, 1880], [5.72, 1880.3], [6.62, 1741]]);
const HCUR = mono([[HAN_T, 2], [9.3, 2.4], [11.5, 57], [14.6, 61], [18, 157]]);
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

// ---------------- people floor (1 dot = 10 万人)
const COLS = 36;
const ROWS = 52;
const PK = Math.round(COLS * ROWS * 0.9); // alive tiles at the 1851 peak
const KILL = Math.round((PK * 11600) / 43216); // 1.16 亿 of 4.32 亿
const BR = Math.round((PK * 4830) / 43216); // births during the crash so the floor ends at 3.645 亿
const NS = COLS * ROWS;
const SLOT = (() => {
  const r = rng(7);
  const s = [] as { u: number; v: number; birth: number; kill: number; j: number }[];
  for (let j = 0; j < ROWS; j++)
    for (let i = 0; i < COLS; i++) s.push({ u: (i + 0.5) / COLS * 2 - 1, v: (j + 0.5) / ROWS, birth: r(), kill: Infinity, j: r() });
  // birth order: random rank
  const order = s.map((_, i) => i).sort((a, b) => s[a].birth - s[b].birth);
  order.forEach((idx, rank) => (s[idx].birth = rank));
  // war zones: Taiping (江南, two lobes) → 回民 (西北) → 丁戊奇荒 (华北); deaths fall cluster by cluster
  const zones = [
    { u: 0.42, v: 0.58, r: 0.34, ph: 0.0 },
    { u: 0.18, v: 0.42, r: 0.26, ph: 0.12 },
    { u: -0.52, v: 0.5, r: 0.3, ph: 0.45 },
    { u: -0.08, v: 0.22, r: 0.28, ph: 0.72 },
  ];
  const score = s.map((p, i) => {
    let best = 9;
    for (const z of zones) {
      const d = Math.hypot((p.u - z.u) / z.r, (p.v - z.v) / (z.r * 0.8));
      if (d < 1.15) best = Math.min(best, z.ph + d * 0.22 + p.j * 0.08);
    }
    return [best, i] as [number, number];
  });
  const alive1851 = score.filter(([, i]) => s[i].birth < PK && score[i][0] < 9).sort((a, b) => a[0] - b[0]);
  alive1851.slice(0, KILL).forEach(([, i], n) => (s[i].kill = n));
  return s;
})();
const FLOOR_LABELS = [
  { u: 0.46, v: 0.62, t: 2.7, txt: "浙江 −52%" },
  { u: 0.4, v: 0.86, t: 3.1, txt: "湖州府 −79%" },
  { u: 0.2, v: 0.78, t: 3.5, txt: "嘉兴府 −66%" },
  { u: 0.32, v: 0.4, t: 3.9, txt: "绍兴府 −61%" },
];
const HORIZON = 330;
const NEAR = 2050;
const proj = (u: number, v: number, lift = 0) => {
  const z = 1 + (1 - v) * 1.55;
  return { x: W * 0.52 + (u * 930) / z, y: HORIZON + (NEAR - HORIZON) / z - lift / z, s: 1 / z };
};
// births / deaths so far (in dots)
const killTime = (kIdx: number) => {
  // inverse of K(t)=1160*ease((t-2.1)/2.4)
  const target = kIdx / KILL;
  let a = 0;
  let b = 1;
  for (let i = 0; i < 18; i++) {
    const m = (a + b) / 2;
    if (ease(m) < target) a = m;
    else b = m;
  }
  return 2.1 + 2.4 * a;
};
const birthTime = (rank: number) => {
  // boom: B(t)=val(QCUR(t))/10 ; crash: 4322+483p
  if (rank >= PK + BR) return Infinity;
  if (rank < PK) {
    let a = 0;
    let b = 2;
    for (let i = 0; i < 18; i++) {
      const m = (a + b) / 2;
      if ((val(QCUR(m)) / 43216) * PK < rank) a = m;
      else b = m;
    }
    return a;
  }
  const target = (rank - PK) / BR;
  let a = 0;
  let b = 1;
  for (let i = 0; i < 18; i++) {
    const m = (a + b) / 2;
    if (ease(m) < target) a = m;
    else b = m;
  }
  return 2.1 + 2.4 * a;
};
const SLOT_T = SLOT.map((s) => ({ born: birthTime(s.birth), dead: s.kill === Infinity ? Infinity : killTime(s.kill) }));

const drawFloor = (ctx: CanvasRenderingContext2D, t: number, alpha: number) => {
  if (alpha <= 0) return;
  for (let i = 0; i < NS; i++) {
    const s = SLOT[i];
    const T = SLOT_T[i];
    if (T.born > t) continue;
    const p = proj(s.u, s.v);
    if (p.y > H + 80 || p.x < -80 || p.x > W + 80) continue;
    const dead = t >= T.dead;
    let col: string;
    let a: number;
    let grow = 1;
    if (dead) {
      const dt = t - T.dead;
      if (dt < 0.3) {
        col = "125,255,192";
        a = 0.95 - dt;
        grow = 1.5 - dt;
      } else {
        col = "25,227,138";
        a = 0.2;
      }
    } else {
      const age = t - T.born;
      col = age < 0.35 && t < 2.05 ? "255,140,155" : "255,59,87";
      a = age < 0.35 && t < 2.05 ? 0.9 : 0.13 + 0.2 * s.j * s.j + (s.j > 0.93 ? 0.25 : 0);
      grow = age < 0.25 ? 0.4 + age * 2.4 : 1;
    }
    const du = (1 / COLS) * 0.82 * grow;
    const dv = (0.5 / ROWS) * 0.8 * grow;
    const q = [proj(s.u - du, s.v + dv), proj(s.u + du, s.v + dv), proj(s.u + du, s.v - dv), proj(s.u - du, s.v - dv)];
    ctx.fillStyle = `rgba(${col},${a * alpha})`;
    ctx.beginPath();
    ctx.moveTo(q[0].x, q[0].y);
    for (let n = 1; n < 4; n++) ctx.lineTo(q[n].x, q[n].y);
    ctx.fill();
  }
  // labels lying on the floor
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const L of FLOOR_LABELS) {
    const a = vis(t, L.t, 5.6, 0.15, 0.3) * alpha;
    if (a <= 0) continue;
    const p = proj(L.u, L.v);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(1, 0.78);
    ctx.font = `800 ${Math.round(58 * p.s)}px ${FONT_NUM}`;
    ctx.shadowColor = "rgba(25,227,138,0.9)";
    ctx.shadowBlur = 18;
    ctx.fillStyle = `rgba(150,255,205,${a})`;
    ctx.fillText(L.txt, 0, 0);
    ctx.restore();
  }
};

// Han floor (stateless): lit by the census sweep, alive while its rank is under the population
const PKH = Math.round(NS * 0.62);
const HAN_SLOT = (() => {
  const r = rng(21);
  const pick = SLOT.map((_, i) => [r(), i] as [number, number]).sort((a, b) => a[0] - b[0]).slice(0, PKH).map(([, i]) => i);
  const sweep = [...pick].sort((a, b) => SLOT[a].v + r() * 0.08 - (SLOT[b].v + r() * 0.08));
  const life = [...pick].sort(() => r() - 0.5);
  const m = new Map<number, { sw: number; rk: number }>();
  pick.forEach((i) => m.set(i, { sw: sweep.indexOf(i), rk: life.indexOf(i) }));
  return m;
})();
const drawFloorHan = (ctx: CanvasRenderingContext2D, t: number, alpha: number) => {
  if (alpha <= 0) return;
  const lit = PKH * ease((t - 6.85) / 1.6);
  const alive = (val(HCUR(t)) / 5959.5) * PKH;
  HAN_SLOT.forEach(({ sw, rk }, i) => {
    if (sw >= lit) return;
    const s = SLOT[i];
    const fresh = Math.max(0, 1 - (lit - sw) / (PKH * 0.08));
    let col = "255,59,87";
    let a = 0.13 + 0.2 * s.j * s.j + (s.j > 0.93 ? 0.25 : 0);
    if (fresh > 0) {
      col = "255,207,92";
      a = 0.25 + 0.7 * fresh;
    }
    if (rk >= alive) {
      const just = Math.max(0, 1 - (rk - alive) / (PKH * 0.05));
      col = just > 0 ? "125,255,192" : "25,227,138";
      a = just > 0 ? 0.3 + 0.65 * just : 0.18;
    }
    const du = (1 / COLS) * 0.82;
    const dv = (0.5 / ROWS) * 0.8;
    const q = [proj(s.u - du, s.v + dv), proj(s.u + du, s.v + dv), proj(s.u + du, s.v - dv), proj(s.u - du, s.v - dv)];
    if (q[0].y > H + 80) return;
    ctx.fillStyle = `rgba(${col},${a * alpha})`;
    ctx.beginPath();
    ctx.moveTo(q[0].x, q[0].y);
    for (let n = 1; n < 4; n++) ctx.lineTo(q[n].x, q[n].y);
    ctx.fill();
  });
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
    const rgb = it.cl >= it.o ? "255,59,87" : "25,227,138";
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
    ctx.shadowColor = up ? "rgba(255,59,87,0.9)" : "rgba(25,227,138,0.9)";
    ctx.fillStyle = up ? "#ff4762" : "#1fe892";
    if (it.w > 20) {
      // the giant candle: bright edge, glassy body
      const gg = ctx.createLinearGradient(it.x - it.w / 2, 0, it.x + it.w / 2, 0);
      gg.addColorStop(0, "rgba(120,255,200,0.95)");
      gg.addColorStop(0.5, "rgba(25,227,138,0.75)");
      gg.addColorStop(1, "rgba(120,255,200,0.95)");
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
    ctx.strokeStyle = pts[i][2] ? "rgba(255,150,165,0.95)" : "rgba(140,255,200,0.95)";
    ctx.shadowColor = pts[i][2] ? "#ff3b57" : "#19e38a";
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
  { t: 1.0, n: 90, seed: 11, col: "255,90,110", sp: 520, g: 380, life: 1.0 },
  { t: 4.5, n: 220, seed: 12, col: "150,255,210", sp: 760, g: 900, life: 1.1 },
  { t: 6.75, n: 110, seed: 13, col: "255,120,130", sp: 420, g: 300, life: 1.2 },
  { t: 11.5, n: 220, seed: 14, col: "150,255,210", sp: 760, g: 900, life: 1.1 },
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
      ctx.fillStyle = `rgba(${b.col},${a})`;
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
      ctx.fillStyle = h.up ? `rgba(255,110,125,${a})` : `rgba(120,255,190,${a})`;
      ctx.fillRect(x, y, 2.5, 2.5);
    }
  }
  const h = headAt(t);
  const col = (t >= 1.0 && t < 2.0) || (t >= HAN_T && t < 9.3) ? "255,207,92" : h.up ? "255,70,95" : "40,240,150";
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
    if (qing) drawFloor(b, t, 1 - vis(t, 5.75, 9, 0.6, 0));
    else drawFloorHan(b, t, 1);
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
    <div style={{ position: "absolute", left: 58, top: 288 }}>
      <div style={{ font: `700 25px ${FONT_CN}`, color: "#e8ebf2", letterSpacing: 1 }}>
        中国人口 <span style={{ font: `500 19px ${FONT_LAT}`, color: C.muted }}>China Population</span>
        <span style={{ color: C.muted, margin: "0 8px" }}>|</span>世界的形状
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", marginTop: 6 }}>
        <div style={{ font: `700 112px ${FONT_NUM}`, color: col, lineHeight: 0.95, textShadow: glow(col + "aa", 22), opacity: dimNum, fontVariantNumeric: "tabular-nums" }}>
          {Math.round(v).toLocaleString("en-US")}
        </div>
        <div style={{ marginLeft: 14, marginBottom: 10, opacity: dimNum }}>
          <div style={{ font: `500 21px ${FONT_CN}`, color: C.sub }}>
            {peak ? "万人 · 清代最高" : `万人 · ${base}`}
          </div>
          <div style={{ display: "inline-block", marginTop: 4, padding: "1px 10px", borderRadius: 4, background: peak ? "rgba(255,207,92,0.95)" : pct >= 0 ? "rgba(255,59,87,0.22)" : "rgba(25,227,138,0.2)", font: `700 34px ${FONT_NUM}`, color: peak ? "#111" : pct >= 0 ? C.up : C.down }}>
            {peak ? "见顶" : `${pct >= 0 ? "▲ +" : "▼ "}${pct.toFixed(2)}%`}
          </div>
        </div>
      </div>
      <div style={{ font: `700 52px ${FONT_NUM}`, color: "#f3f4f7", marginTop: 6, fontFamily: FONT_NUM }}>{yr}</div>
    </div>
  );
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
    <div style={{ position: "absolute", right: 70, top: 470, width: 470, opacity: a }}>
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

// callouts
const Big: React.FC<{ t: number; a: number; text: string; color: string; x?: number; y: number; size?: number; children?: React.ReactNode }> = ({ t, a, text, color, x = 640, y, size = 128, children }) => {
  if (a <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,0) scale(${0.92 + 0.08 * a})`, opacity: a, textAlign: "center", whiteSpace: "nowrap" }}>
      <div style={{ font: `800 ${size}px ${FONT_NUM}`, color, lineHeight: 1, textShadow: `0 0 26px ${color}99, 4px 0 0 rgba(255,0,60,0.35), -4px 0 0 rgba(0,220,255,0.35)` }}>{text}</div>
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
          <div style={{ font: `900 70px ${FONT_CN}`, color: C.gold, textShadow: glow("rgba(255,190,60,0.8)", 24) }}>风暴前夜</div>
          <div style={{ font: `700 28px ${FONT_CN}`, color: "#fff", marginTop: 6 }}>
            1851 · 世界每 3 个人，就有 1 个在中国
          </div>
        </div>
      )}
      <Big t={t} a={a2} text={cnt} color={C.down} x={400} y={880} size={118}>
        <div style={{ opacity: a3, font: `700 32px ${FONT_CN}`, color: "#fff", marginTop: 12 }}>死于战乱、饥荒与瘟疫</div>
        <div style={{ opacity: a3, font: `500 24px ${FONT_CN}`, color: C.sub, marginTop: 6 }}>太平天国 · 回民战争 · 丁戊奇荒　1851—1878</div>
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
          <div style={{ font: `900 64px ${FONT_CN}`, color: "#fff", textShadow: glow("rgba(255,255,255,0.3)") }}>第一次全国户口统计</div>
          <div style={{ font: `800 34px ${FONT_CN}`, color: C.gold, marginTop: 10 }}>公元 2 年 · 西汉元始二年 · 5,959 万人</div>
          <div style={{ font: `500 28px ${FONT_CN}`, color: C.sub, marginTop: 8 }}>《汉书·地理志》逐郡记下的户口</div>
        </div>
      )}
      {c1 > 0 && (
        <div style={{ position: "absolute", left: 56, top: 640, opacity: c1 }}>
          <div style={{ display: "inline-block", padding: "2px 12px", borderRadius: 4, background: "rgba(25,227,138,0.18)", border: "1px solid rgba(25,227,138,0.6)", font: `700 22px ${FONT_CN}`, color: C.down }}>两汉之际</div>
          <div style={{ font: `900 50px ${FONT_CN}`, color: "#fff", marginTop: 10 }}>王莽篡汉，天下大乱</div>
          <div style={{ font: `500 26px ${FONT_CN}`, color: C.sub, marginTop: 6 }}>绿林、赤眉起兵 · 饥荒连年</div>
        </div>
      )}
      <Big t={t} a={c2} text="−64.75%" color={C.down} x={400} y={880}>
        <div style={{ font: `700 32px ${FONT_CN}`, color: "#fff", marginTop: 12 }}>登记户口 5,959 万 → 2,101 万</div>
        <div style={{ font: `500 24px ${FONT_CN}`, color: C.sub, marginTop: 6 }}>公元 2 年 → 公元 57 年</div>
      </Big>
      {c3 > 0 && (
        <div style={{ position: "absolute", left: 56, top: 640, opacity: c3 }}>
          <div style={{ display: "inline-block", padding: "2px 12px", borderRadius: 4, background: "rgba(255,59,87,0.18)", border: "1px solid rgba(255,59,87,0.6)", font: `700 22px ${FONT_CN}`, color: C.up }}>东汉</div>
          <div style={{ font: `900 50px ${FONT_CN}`, color: "#fff", marginTop: 10 }}>百年休养，人口回来了</div>
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

export const T2: React.FC = () => {
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
          filter: `drop-shadow(${sp}px 0 0 rgba(255,0,60,${0.18 + 0.4 * h})) drop-shadow(${-sp}px 0 0 rgba(0,220,255,${0.18 + 0.4 * h}))`,
        }}
      >
        <Stage t={t} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 1230, textAlign: "center", font: `700 40px ${FONT_CN}`, color: "rgba(255,255,255,0.1)" }}>@世界的形状</div>
        <Panel t={t} />
        <Header t={t} />
        <Overlays t={t} />
      </AbsoluteFill>
      {flash > 0 && <AbsoluteFill style={{ background: `rgba(220,240,255,${0.35 * flash})`, mixBlendMode: "screen" }} />}
      <Grain f={f} />
      <Audio src={staticFile("test_ref.wav")} />
    </AbsoluteFill>
  );
};
