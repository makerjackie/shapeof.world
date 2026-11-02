// 两千年中国人口 — full film, 史书 style. Timing in seconds on the reference soundtrack.
import React, { useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, Img, staticFile, useCurrentFrame } from "remotion";
import { loadFont as loadSerif } from "@remotion/google-fonts/NotoSerifSC";
import { rng } from "../Chart";
import { FONT_CN, FONT_LAT, FONT_NUM } from "../theme";
import MAP from "../v2/popmap.json";
import WTOP from "./world_top.json";
import {
  BIGS, BURSTS, CALLOUTS, CUR, DUR, HX, INKS, MAP_LABELS, MILESTONES, OPEN_END, QING_CRASHES, QUOTES, REWIND, SEALS, SPAN, Tone,
} from "./plan";
import { DYNS, FIRST, MING_REG, SERIES, dynAt, fmtPop, ganzhi, gapAt, isGap, kindAt, pointAt, reignAt, val } from "./series";

const serif = loadSerif("normal", { weights: ["700", "900"], ignoreTooManyRequestsWarning: true });
const SERIF = `${serif.fontFamily}, "Songti SC", serif`;
const W = 1080;
const H = 1920;
const FPS = 30;
export const FILM3_FRAMES = Math.round(DUR * FPS);

// palette: gold = growth, 素白 = loss (white is mourning), vermilion/blood = accents only
const GOLD = "#ffcf5c";
const GOLD_RGB = "255,207,92";
const GOLD_HI = "255,233,175";
const ASH = "#d3d8d6";
const ASH_RGB = "211,216,214";
const ASH_HI = "245,247,246";
const RED = "#c42d1d";
const PAPER = "#f4efe2";
const MUTED = "#a59f8f";

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const easeOut3 = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
const vis = (t: number, a: number, b: number, fi = 0.12, fo = 0.18) =>
  t < a || t > b + fo ? 0 : t < a + fi ? (t - a) / fi : t > b ? 1 - (t - b) / fo : 1;
const env = (t: number, t0: number, a = 0.02, d = 0.3) => (t < t0 - a ? 0 : t < t0 ? (t - t0 + a) / a : Math.exp(-(t - t0) / d));
const rewinding = (t: number) => t > 5.72 && t < OPEN_END;
const ending = (t: number) => t >= 216;

// ---------------- camera
const Y_TOP = 800;
const Y_BOT = 1640;
type Cam = { c: number; span: number; hx: number; lo: number; hi: number };
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
const camAt = (t: number): Cam => {
  let lo = 0;
  let hi = 0;
  let n = 0;
  for (let i = 0; i < 10; i++) {
    const tt = t - i * 0.05;
    if (tt < 0) break;
    if (rewinding(t) !== rewinding(tt)) break;
    const [l, h] = rawRange(tt);
    lo += l;
    hi += h;
    n++;
  }
  lo /= n;
  hi /= n;
  const r = Math.max(hi - lo, hi * 0.16);
  const floor = ending(t) ? 0 : lo - 0.32 * r;
  return { c: CUR(t), span: SPAN(t), hx: HX(t), lo: Math.max(0, floor), hi: hi + 0.1 * r };
};
const ppy = (k: Cam) => (W * 0.9) / k.span;
const X = (k: Cam, y: number) => k.hx * W - (k.c - y) * ppy(k);
const Yv = (k: Cam, v: number) => Y_BOT - ((v - k.lo) / (k.hi - k.lo)) * (Y_BOT - Y_TOP);
const headAt = (t: number) => {
  const k = camAt(t);
  return { x: X(k, k.c), y: Yv(k, val(k.c)), up: val(k.c) >= val(k.c - 0.4) - 0.01 };
};

// ---------------- map floor (ISIMIP/HYDE 1860 grid; neighbours drawn too, so no border is implied)
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
    return { ...projM(lon, lat), b, loss, off, j: r() };
  });
})();
const drawMap = (ctx: CanvasRenderingContext2D, t: number, alpha: number) => {
  if (alpha <= 0) return;
  const c = CUR(t);
  const v = val(c);
  const scale = 0.3 + 0.7 * Math.min(1, v / 45000);
  const growing = val(c) > val(c - 0.6) + 0.5;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const d of DOTS) {
    if (d.y > H + 20 || d.x < -20 || d.x > W + 20) continue;
    let a = d.b * 1.15 - (1 - scale) * 0.75;
    if (a <= 0.02) continue;
    a = Math.min(1, a);
    let col = "255,222,160";
    let sz = 11 * d.s;
    let hit = false;
    for (const q of QING_CRASHES) {
      const t0 = q.t0 + d.off * q.d * 2.2;
      if (t < t0 || t > q.t0 + 7) continue;
      hit = true;
      const dt = t - t0;
      const rec = q.t0 + 7 - t < 2 ? (q.t0 + 7 - t) / 2 : 1;
      if (dt < 0.3) {
        col = "255,120,110";
        a = Math.min(1, a + 0.6 * (1 - dt / 0.3));
        sz *= 1.6 - dt * 2;
      } else {
        col = ASH_RGB;
        a *= 1 - d.loss * rec;
      }
    }
    if (!hit && growing && d.j < 0.012) {
      const ph = (t * 3 + d.j * 500) % 1;
      if (ph < 0.25) {
        col = "255,240,200";
        a = Math.min(1, a + 0.7 * (1 - ph / 0.25));
      }
    }
    ctx.fillStyle = `rgba(${col},${Math.min(1, a * 0.78) * alpha})`;
    ctx.fillRect(d.x - sz * 0.36, d.y - sz * 0.24, sz * 0.72, sz * 0.48);
    if (d.b > 0.72) {
      ctx.fillStyle = `rgba(${col},${0.06 * a * alpha})`;
      ctx.fillRect(d.x - sz * 1.3, d.y - sz * 0.8, sz * 2.6, sz * 1.6);
    }
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
    ctx.scale(1, 0.8);
    ctx.font = `900 ${Math.round((L.big ? 66 : 46) * p.s)}px ${SERIF}`;
    ctx.shadowColor = "rgba(196,45,29,0.9)";
    ctx.shadowBlur = 18;
    ctx.fillStyle = `rgba(255,236,226,${la})`;
    ctx.fillText(L.txt, 0, 0);
    ctx.restore();
  }
  ctx.font = `500 21px ${SERIF}`;
  ctx.textAlign = "left";
  ctx.fillStyle = `rgba(165,159,143,${0.7 * alpha})`;
  ctx.fillText("光点：人口分布（HYDE，1860 年格局示意）", 60, 1480);
  ctx.restore();
};

// ---------------- chart: bamboo slips + brush line
const LANDING = new Map<number, number>();
SERIES.forEach((q, i) => {
  if (i > 0 && isGap(i - 1)) LANDING.set(q.y, i);
});
const drawChart = (ctx: CanvasRenderingContext2D, t: number, alpha: number) => {
  if (alpha <= 0) return;
  const k = camAt(t);
  const p = ppy(k);
  const c = k.c;
  const x0 = Math.max(FIRST, Math.floor(c - k.span * k.hx * 1.12));
  ctx.save();
  ctx.globalAlpha = alpha;
  // grid
  const rng_ = k.hi - k.lo;
  const step = rng_ > 60000 ? 20000 : rng_ > 25000 ? 10000 : rng_ > 12000 ? 5000 : rng_ > 5000 ? 2000 : 1000;
  ctx.font = `600 22px ${FONT_NUM}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  for (let v = Math.ceil(k.lo / step) * step; v < k.hi; v += step) {
    const y = Yv(k, v);
    ctx.strokeStyle = "rgba(200,190,160,0.07)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
    ctx.fillStyle = "rgba(190,180,160,0.38)";
    ctx.fillText(v >= 10000 ? `${(v / 10000).toFixed(v % 10000 ? 1 : 0)}亿` : `${v / 1000}千万`, 20, y - 14);
  }
  // slips
  const bw = Math.min(26, Math.max(1.6, p * 0.66));
  const giant = (x: number, from: number, to: number) => {
    const a = Yv(k, from);
    const b = Yv(k, to);
    const up = to >= from;
    const w = Math.max(14, Math.min(40, p * 3));
    const rgb = up ? GOLD_RGB : ASH_RGB;
    const gg = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    gg.addColorStop(0, `rgba(${rgb},0.95)`);
    gg.addColorStop(0.5, `rgba(${rgb},0.55)`);
    gg.addColorStop(1, `rgba(${rgb},0.95)`);
    ctx.save();
    ctx.shadowColor = up ? GOLD : ASH;
    ctx.shadowBlur = 22;
    ctx.fillStyle = gg;
    ctx.fillRect(x - w / 2, Math.min(a, b), w, Math.abs(a - b) + 2);
    ctx.restore();
  };
  for (let y = x0; y <= Math.floor(c); y++) {
    if (y < FIRST) continue;
    const li = LANDING.get(y);
    if (li !== undefined) {
      giant(X(k, y), SERIES[li - 1].v, SERIES[li].v);
      continue;
    }
    if (gapAt(y - 0.001)) continue;
    const v = val(y);
    const x = X(k, y);
    const top = Yv(k, v);
    const kind = kindAt(y);
    const up = v >= val(y - 1) - 0.01;
    const rgb = up ? GOLD_RGB : ASH_RGB;
    const w = Math.max(1.4, bw * 0.84);
    if (kind === "un") {
      ctx.strokeStyle = `rgba(${ASH_RGB},0.45)`;
      ctx.lineWidth = 1;
      ctx.strokeRect(x - w / 2, top, w, H - top);
      continue;
    }
    const grd = ctx.createLinearGradient(0, top, 0, H);
    const k0 = kind === "est" ? 0.32 : 0.5;
    grd.addColorStop(0, `rgba(${rgb},${k0})`);
    grd.addColorStop(0.35, `rgba(${rgb},${k0 * 0.32})`);
    grd.addColorStop(1, `rgba(${rgb},0.03)`);
    ctx.fillStyle = grd;
    ctx.fillRect(x - w / 2, top, w, H - top);
    if (w > 6) {
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(x - 0.6, top + 4, 1.2, H - top);
    }
    ctx.fillStyle = `rgba(${up ? GOLD_HI : ASH_HI},0.85)`;
    ctx.fillRect(x - w / 2, top - 1, w, 2.5);
  }
  // a gap landing in progress: the giant slip forms at the head
  const gNow = gapAt(c);
  if (gNow && Math.abs(val(c) - gNow.a.v) > 0.5) giant(X(k, c), gNow.a.v, val(c));
  for (const cy of [1330, 1600]) {
    ctx.fillStyle = "rgba(8,6,4,0.6)";
    ctx.fillRect(0, cy, W, 4);
    ctx.fillStyle = "rgba(255,230,180,0.07)";
    ctx.fillRect(0, cy - 1, W, 1);
  }
  // the Ming register line: flat while the real population climbed
  if (c > 1381) {
    ctx.save();
    ctx.setLineDash([3, 6]);
    ctx.strokeStyle = "rgba(245,240,225,0.75)";
    ctx.lineWidth = 2;
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
    if (last && c < 1700) {
      ctx.setLineDash([]);
      ctx.font = `700 24px ${SERIF}`;
      ctx.fillStyle = "rgba(245,240,225,0.85)";
      ctx.textAlign = "left";
      ctx.fillText("户口册", last[0] + 10, last[1] + 4);
    }
    ctx.restore();
  }
  // brush line
  const stepY = Math.max(0.25, k.span / 700);
  const pts: [number, number, number][] = [];
  for (let y = x0; y <= c; y += stepY) pts.push([y, X(k, y), Yv(k, val(y))]);
  pts.push([c, X(k, c), Yv(k, val(c))]);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = 1; i < pts.length; i++) {
    const [ya, xa, pa] = pts[i - 1];
    const [yb, xb, pb] = pts[i];
    const g = gapAt((ya + yb) / 2);
    const holding = g && Math.abs(pb - pa) < 0.5;
    const up = pb <= pa + 0.01;
    const kind = kindAt(yb);
    if (holding || kind === "un") {
      ctx.setLineDash(kind === "un" ? [8, 8] : [12, 10]);
      ctx.strokeStyle = kind === "un" ? `rgba(${ASH_RGB},0.7)` : "rgba(225,215,190,0.5)";
      ctx.lineWidth = 2;
      ctx.shadowBlur = 0;
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
    ctx.strokeStyle = up ? `rgba(${GOLD_HI},0.96)` : `rgba(${ASH_HI},0.96)`;
    ctx.shadowColor = up ? GOLD : ASH;
    ctx.shadowBlur = 12;
    ctx.lineWidth = wd;
    ctx.beginPath();
    ctx.moveTo(xa, pa);
    ctx.lineTo(xb, pb);
    ctx.stroke();
    ctx.shadowBlur = 0;
    if (len > 6) {
      const nx = -dy / len;
      const ny = dx / len;
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = up ? `rgba(${GOLD_RGB},0.4)` : `rgba(${ASH_RGB},0.4)`;
      for (const off of [-0.95, 0.85, 1.35]) {
        if ((Math.round(ya * 3) + Math.round(off * 10)) % 5 === 0) continue;
        ctx.beginPath();
        ctx.moveTo(xa + nx * wd * off, pa + ny * wd * off);
        ctx.lineTo(xb + nx * wd * off, pb + ny * wd * off);
        ctx.stroke();
      }
    }
  }
  // the 公元 2 年 base line
  const ba = vis(t, 6.72, 11.0, 0.3, 0.6);
  if (ba > 0) {
    const y = Yv(k, 5959.4);
    ctx.strokeStyle = `rgba(${GOLD_RGB},${0.9 * ba})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(X(k, 2) - 40, y);
    ctx.lineTo(X(k, 2) + (W - X(k, 2) + 40) * ease((t - 6.72) / 0.5), y);
    ctx.stroke();
    ctx.font = `700 26px ${SERIF}`;
    ctx.fillStyle = `rgba(${GOLD_RGB},${ba})`;
    ctx.textAlign = "right";
    ctx.fillText("基点 5,959 万", W - 60, y - 22);
  }
  ctx.restore();
};

// ---------------- head, bursts, ink
const drawHead = (ctx: CanvasRenderingContext2D, t: number, alpha: number) => {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 16; i++) {
    const tb = Math.floor(t * 30) / 30 - i / 30;
    if (tb < 0 || rewinding(tb) !== rewinding(t)) continue;
    const hb = headAt(tb);
    const r = rng(Math.round(tb * 30) * 7 + 3);
    for (let j = 0; j < 3; j++) {
      const dt = t - tb;
      const x = hb.x + (r() - 0.7) * 200 * dt;
      const y = hb.y + (r() - 0.6) * 240 * dt + 240 * dt * dt;
      const a = (1 - dt / 0.55) * 0.9 * alpha;
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
  g.addColorStop(0.35, `rgba(${rgb},${0.22 * alpha})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(h.x - 90, h.y - 90, 180, 180);
  ctx.restore();
};
const drawBursts = (ctx: CanvasRenderingContext2D, t: number) => {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  BURSTS.forEach((t0, bi) => {
    const dt = t - t0;
    if (dt < 0 || dt > 1.3) return;
    const h = headAt(t0);
    const r = rng(100 + bi);
    for (let i = 0; i < 130; i++) {
      const ang = r() * Math.PI * 2;
      const sp = 600 * (0.25 + r() * 0.85);
      const life = 1.3 * (0.45 + r() * 0.55);
      if (dt > life) continue;
      const drag = Math.exp(-dt * 2.2);
      const x = h.x + (Math.cos(ang) * sp * (1 - drag)) / 2.2;
      const y = h.y + (Math.sin(ang) * sp * (1 - drag)) / 2.2 + 0.2 * 400 * dt * dt;
      ctx.fillStyle = `rgba(${r() < 0.2 ? "255,120,90" : GOLD_HI},${1 - dt / life})`;
      const s = 2 + r() * 3;
      ctx.fillRect(x, y, s, s);
    }
  });
  ctx.restore();
};
const drawInk = (ctx: CanvasRenderingContext2D, t: number) => {
  INKS.forEach((t0, si) => {
    const dt = t - t0;
    if (dt < 0 || dt > 2.4) return;
    const h = headAt(t0);
    const grow = 1 - Math.pow(1 - Math.min(1, dt / 0.16), 3);
    const fade = dt < 1.3 ? 1 : Math.max(0, 1 - (dt - 1.3) / 1.1);
    const seed = 31 + si * 7;
    const r = rng(seed * 11);
    const R0 = 150 * grow;
    ctx.save();
    ctx.globalAlpha = fade;
    for (let i = 0; i < 22; i++) {
      const a = r() * Math.PI * 2;
      const len = R0 * (1.3 + r() * 1.6);
      const wd = 6 + r() * 14;
      const ex = h.x + Math.cos(a) * len;
      const ey = h.y + Math.sin(a) * len * 0.8;
      ctx.fillStyle = "rgba(120,10,18,0.92)";
      ctx.beginPath();
      ctx.moveTo(h.x + Math.cos(a + Math.PI / 2) * wd, h.y + Math.sin(a + Math.PI / 2) * wd);
      ctx.lineTo(ex, ey);
      ctx.lineTo(h.x + Math.cos(a - Math.PI / 2) * wd, h.y + Math.sin(a - Math.PI / 2) * wd);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ex, ey, (2 + r() * 6) * grow, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    const N = 72;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      const n = 0.72 + 0.18 * Math.sin(a * 5 + seed) + 0.1 * Math.sin(a * 13 + seed * 2) + 0.12 * r();
      const x = h.x + Math.cos(a) * R0 * n;
      const y = h.y + Math.sin(a) * R0 * n * 0.85;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    const g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, R0 * 1.1 + 1);
    g.addColorStop(0, "rgba(28,2,5,0.97)");
    g.addColorStop(0.6, "rgba(70,4,10,0.95)");
    g.addColorStop(1, "rgba(150,16,26,0.92)");
    ctx.fillStyle = g;
    ctx.shadowColor = "rgba(200,30,40,0.8)";
    ctx.shadowBlur = 30;
    ctx.fill();
    ctx.shadowBlur = 0;
    for (let i = 0; i < 70; i++) {
      const a = r() * Math.PI * 2;
      const d = R0 * (1.1 + r() * 2.6);
      ctx.fillStyle = `rgba(${130 + Math.floor(r() * 60)},${10 + Math.floor(r() * 12)},20,0.9)`;
      ctx.beginPath();
      ctx.arc(h.x + Math.cos(a) * d, h.y + Math.sin(a) * d * 0.8 + 40 * dt * dt, (1 + r() * 5) * grow, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 9; i++) {
      const x = h.x + (r() - 0.5) * R0 * 1.4;
      const y0 = h.y + R0 * (0.3 + r() * 0.4);
      const len = Math.max(0, dt - 0.15) * (120 + r() * 260);
      const wd = 3 + r() * 6;
      ctx.fillStyle = "rgba(95,6,14,0.9)";
      ctx.fillRect(x - wd / 2, y0, wd, len);
      ctx.beginPath();
      ctx.arc(x, y0 + len, wd * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });
};

// ---------------- canvas stage
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
    const mapA = (1 - vis(t, 5.72, 6.62, 0.25, 0.4)) * (1 - vis(t, 215, 999, 1.5, 0) * 0.7) * (1 - vis(t, 224, 999, 1.0, 0));
    drawMap(b, t, mapA);
    const chartA = 1 - vis(t, 224, 999, 1.0, 0);
    drawChart(b, t, chartA);
    drawHead(b, t, rewinding(t) ? 0.3 : chartA);
    drawBursts(b, t);
    const ctx = ref.current.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);
    if (rewinding(t) || (t > 5.6 && t < 6.9)) {
      const p = Math.min(1, (t - 5.6) / 0.25) * (t > 6.6 ? Math.max(0, 1 - (t - 6.6) / 0.3) : 1);
      const N = 12;
      for (let i = 0; i < N; i++) {
        const s = 1 + (i / N) * 0.55 * p;
        ctx.globalAlpha = (i === 0 ? 1 : 0.22) * (1 - i / (N + 2));
        ctx.drawImage(BUF, W / 2 - (W * s) / 2, H * 0.55 - H * s * 0.55, W * s, H * s);
      }
      ctx.globalAlpha = 1;
    } else if (t > 2.0 && t < 2.3) {
      const r = rng(Math.floor(t * 30) * 17);
      ctx.drawImage(BUF, 0, 0);
      for (let i = 0; i < 9; i++) {
        const y = r() * H;
        const h = 20 + r() * 120;
        ctx.drawImage(BUF, 0, y, W, h, (r() - 0.5) * 160, y, W, h);
      }
    } else ctx.drawImage(BUF, 0, 0);
    drawInk(ctx, t);
  }, [t, ready]);
  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0 }} />;
};

// ---------------- seals
const Seal: React.FC<{ t: number; t0: number; t1: number; chars: string; x: number; y: number; size: number; rot?: number; id: string }> = ({ t, t0, t1, chars, x, y, size, rot = -7, id }) => {
  if (t < t0 || t > t1 + 0.2) return null;
  const k = (t - t0) / 0.13;
  const s = k < 1 ? 2.3 - 1.3 * easeOut3(k) : 1;
  const o = (k < 1 ? 0.35 + 0.65 * k : 1) * (t > t1 ? 1 - (t - t1) / 0.2 : 1);
  const ch = [...chars];
  const ink = "#140806";
  let body: React.ReactNode;
  if (ch.length === 1) body = <text x={50} y={71} textAnchor="middle" style={{ font: `900 62px ${SERIF}`, fill: ink }}>{ch[0]}</text>;
  else if (ch.length === 2)
    body = (
      <>
        <text x={50} y={46} textAnchor="middle" style={{ font: `900 38px ${SERIF}`, fill: ink }}>{ch[0]}</text>
        <text x={50} y={86} textAnchor="middle" style={{ font: `900 38px ${SERIF}`, fill: ink }}>{ch[1]}</text>
      </>
    );
  else
    body = (
      <>
        <text x={70} y={46} textAnchor="middle" style={{ font: `900 34px ${SERIF}`, fill: ink }}>{ch[0]}</text>
        <text x={70} y={86} textAnchor="middle" style={{ font: `900 34px ${SERIF}`, fill: ink }}>{ch[1]}</text>
        <text x={30} y={78} textAnchor="middle" style={{ font: `900 52px ${SERIF}`, fill: ink }}>{ch[2]}</text>
      </>
    );
  return (
    <div style={{ position: "absolute", left: x, top: y, width: size, height: size, transform: `translate(-50%,-50%) rotate(${rot}deg) scale(${s})`, opacity: o }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <defs>
          <filter id={`rough-${id}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed={(id.length * 7) % 97} />
            <feDisplacementMap in="SourceGraphic" scale="4" />
          </filter>
        </defs>
        <g filter={`url(#rough-${id})`}>
          <rect x={5} y={5} width={90} height={90} rx={7} fill={RED} />
          {body}
        </g>
      </svg>
    </div>
  );
};

// ---------------- HUD
const toneCol = (tone: Tone) => (tone === "up" ? GOLD : tone === "dn" ? ASH : GOLD);
const glow = (c: string, s = 18) => `0 0 ${s}px ${c}`;
const KIND_LABEL = { rec: "户口登记", est: "学者估算", stat: "国家统计局", un: "联合国预测" } as const;

const Header: React.FC<{ t: number }> = ({ t }) => {
  const k = camAt(t);
  const v = val(k.c);
  const rw = rewinding(t);
  const g = gapAt(k.c);
  const slope = val(k.c) - val(k.c - 0.5);
  const col = slope < -0.5 ? ASH : GOLD;
  let yNum = Math.max(1, Math.floor(k.c));
  let pre = yNum < 1000 ? "公元" : "";
  if (rw) {
    const r = [...REWIND].reverse().find(([t0]) => t >= t0);
    const lab = r ? r[2] : "1880 年";
    pre = lab.startsWith("公元") ? "公元" : "";
    yNum = Number(lab.replace("公元", "").replace("年", "").trim());
  }
  const d = dynAt(k.c);
  const reign = reignAt(k.c);
  const chip = g ? `无全国统计 · ${g.b.y - g.a.y} 年` : KIND_LABEL[kindAt(k.c)];
  const ms = MILESTONES.filter((m) => t >= m.t && t < m.t + 1.8).pop();
  const fade = 1 - vis(t, 215, 999, 0.8, 0);
  if (fade <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 58, top: 150, opacity: fade, width: W - 116 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Img src={staticFile("mark-disc.png")} style={{ width: 50, height: 50 }} />
        <span style={{ font: `900 30px ${FONT_CN}`, color: "#f3f4f7", letterSpacing: 2 }}>世界的形状</span>
        <span style={{ width: 2, height: 26, background: "rgba(255,255,255,0.25)" }} />
        <span style={{ font: `900 34px ${SERIF}`, color: GOLD, letterSpacing: 2 }}>两千年中国人口</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 30, marginTop: 18 }}>
        <div>
          <div style={{ font: `700 27px ${SERIF}`, color: "#b9b2a0", height: 36, whiteSpace: "nowrap" }}>
            {rw ? "回到" : `${d.n}${reign ? " · " + reign : ""}　${ganzhi(k.c)}年`}
          </div>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            {pre && <span style={{ font: `900 44px ${SERIF}`, color: PAPER, marginRight: 6 }}>{pre}</span>}
            <span style={{ font: `900 118px ${SERIF}`, color: PAPER, lineHeight: 1 }}>{yNum}</span>
            <span style={{ font: `900 42px ${SERIF}`, color: PAPER, marginLeft: 4 }}>年</span>
          </div>
        </div>
        <div style={{ marginBottom: 10, opacity: rw ? 0.1 : 1 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ font: `900 76px ${SERIF}`, color: col, lineHeight: 1, textShadow: glow(col + "55", 20) }}>{v >= 10000 ? (v / 10000).toFixed(2) : Math.round(v).toLocaleString("en-US")}</span>
            <span style={{ font: `900 30px ${SERIF}`, color: col }}>{v >= 10000 ? "亿人" : "万人"}</span>
          </div>
          <div style={{ marginTop: 8, display: "inline-block", font: `700 21px ${SERIF}`, color: g ? "#e7d9b8" : "#9a9384", border: `1px solid ${g ? "rgba(231,217,184,0.5)" : "rgba(154,147,132,0.4)"}`, padding: "1px 10px", borderRadius: 3 }}>{chip}</div>
        </div>
      </div>
      {ms && <Seal t={t} t0={ms.t} t1={ms.t + 1.6} chars={`${["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二", "十三", "十四"][ms.n]}亿`} x={880} y={110} size={110} id={`ms${ms.n}`} rot={8} />}
    </div>
  );
};

// top-right: dynasty card (before 1740) or world table (after)
const DYN_CHANGES = (() => {
  const out: { t: number; i: number }[] = [];
  let last = -1;
  for (let f = Math.round(OPEN_END * 30); f < Math.round(216 * 30); f++) {
    const i = DYNS.indexOf(dynAt(CUR(f / 30)));
    if (i !== last) {
      out.push({ t: f / 30, i });
      last = i;
    }
  }
  return out;
})();
const DynCard: React.FC<{ t: number }> = ({ t }) => {
  const ch = [...DYN_CHANGES].reverse().find((c) => t >= c.t);
  if (!ch) return null;
  const d = DYNS[ch.i];
  const yrs = (y: number) => (y < 0 ? `前 ${-y}` : y > 2030 ? "今" : String(y));
  return (
    <div style={{ position: "absolute", right: 56, top: 470, width: 330, display: "flex", gap: 18, alignItems: "center" }}>
      <div style={{ position: "relative", width: 110, height: 110 }}>
        <Seal t={t} t0={ch.t} t1={9999} chars={d.seal} x={55} y={55} size={110} id={`dyn${ch.i}`} rot={-5} />
      </div>
      <div>
        <div style={{ font: `900 42px ${SERIF}`, color: PAPER, whiteSpace: "nowrap" }}>{d.n}</div>
        <div style={{ font: `600 22px ${FONT_NUM}`, color: MUTED, marginTop: 2 }}>{yrs(d.a)} — {yrs(d.b)}</div>
        {d.cap && <div style={{ font: `500 21px ${SERIF}`, color: MUTED, marginTop: 2 }}>{d.cap}</div>}
      </div>
    </div>
  );
};
const WT = WTOP as unknown as Record<string, [string, number][]>;
const WorldTable: React.FC<{ t: number; a: number }> = ({ t, a }) => {
  const k = camAt(t);
  const y = Math.max(1740, Math.min(2100, Math.floor(k.c)));
  const rows: [string, number][] = [["中国", val(k.c)], ...(WT[String(y)] ?? [])].sort((p, q) => q[1] - p[1]).slice(0, 5);
  return (
    <div style={{ position: "absolute", right: 56, top: 440, width: 400, opacity: a }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: `1px solid rgba(255,207,92,0.6)`, paddingBottom: 6 }}>
        <span style={{ font: `900 26px ${SERIF}`, color: GOLD }}>同年 · 世界人口</span>
        <span style={{ font: `500 16px ${SERIF}`, color: "#8a8478" }}>今国界</span>
      </div>
      {rows.map(([n, v]) => {
        const cn = n === "中国";
        return (
          <div key={n} style={{ display: "flex", alignItems: "baseline", height: 44, borderBottom: "1px solid rgba(255,255,255,0.07)", paddingTop: 8 }}>
            <span style={{ width: 130, font: `900 26px ${SERIF}`, color: cn ? PAPER : "#a8a293" }}>{n}</span>
            <span style={{ flex: 1, textAlign: "right", font: `600 23px ${FONT_NUM}`, color: cn ? PAPER : "#a8a293" }}>{fmtPop(v)}</span>
          </div>
        );
      })}
    </div>
  );
};
const TopRight: React.FC<{ t: number }> = ({ t }) => {
  if (t < OPEN_END + 0.1 || t > 215.5) {
    if (t < 5.72) return <WorldTable t={t} a={1 - vis(t, 5.6, 99, 0.12, 0)} />;
    return null;
  }
  return CUR(t) < 1740 ? <DynCard t={t} /> : <WorldTable t={t} a={1} />;
};

const Callouts: React.FC<{ t: number }> = ({ t }) => (
  <>
    {CALLOUTS.map((c, i) => {
      const a = vis(t, c.t0, c.t1, 0.1, 0.15);
      if (a <= 0) return null;
      const col = toneCol(c.tone);
      const reveal = ease((t - c.t0) / 0.22);
      return (
        <div key={i} style={{ position: "absolute", left: 56, top: 720, opacity: a, display: "flex", gap: 16, maxWidth: 600 }}>
          <div style={{ width: 5, background: c.tone === "dn" ? RED : col, borderRadius: 3 }} />
          <div style={{ clipPath: `inset(0 ${100 - reveal * 100}% 0 0)` }}>
            <div style={{ font: `700 23px ${SERIF}`, color: c.tone === "dn" ? "#e58a7c" : col, letterSpacing: 1 }}>{c.tag}</div>
            <div style={{ font: `900 56px ${SERIF}`, color: PAPER, lineHeight: 1.18, marginTop: 4, textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}>{c.title}</div>
            {c.sub && <div style={{ font: `500 26px ${SERIF}`, color: "#c9c2b0", marginTop: 6, textShadow: "0 2px 10px rgba(0,0,0,0.9)" }}>{c.sub}</div>}
          </div>
        </div>
      );
    })}
  </>
);
const Bigs: React.FC<{ t: number }> = ({ t }) => (
  <>
    {BIGS.map((b, i) => {
      const a = vis(t, b.t0, b.t1, 0.08, 0.2);
      if (a <= 0) return null;
      return (
        <div key={i} style={{ position: "absolute", left: 400, top: 880, transform: `translate(-50%,0) scale(${0.92 + 0.08 * a})`, opacity: a, textAlign: "center", whiteSpace: "nowrap" }}>
          <div style={{ font: `900 ${b.text.length > 7 ? 92 : 124}px ${SERIF}`, color: ASH, lineHeight: 1, textShadow: `0 0 26px rgba(${ASH_RGB},0.45), 0 4px 20px rgba(0,0,0,0.9)` }}>{b.text}</div>
          {b.sub && <div style={{ font: `700 32px ${SERIF}`, color: PAPER, marginTop: 12, textShadow: "0 2px 10px rgba(0,0,0,0.9)" }}>{b.sub}</div>}
          {b.sub2 && <div style={{ font: `500 24px ${SERIF}`, color: "#b9b2a0", marginTop: 6 }}>{b.sub2}</div>}
        </div>
      );
    })}
  </>
);
const OpenOverlays: React.FC<{ t: number }> = ({ t }) => {
  // the counter in the cold open
  const a2 = vis(t, 2.2, 5.65, 0.1, 0.12);
  const deaths = 11600 * ease((t - 2.1) / 2.4);
  const cnt = deaths >= 11599 ? "−1.16 亿" : `−${Math.round(deaths).toLocaleString("en-US")} 万`;
  const a3 = vis(t, 4.5, 5.65, 0.12, 0.12);
  const a4 = vis(t, 5.0, 5.65, 0.15, 0.12);
  const b1 = vis(t, 6.75, 9.3, 0.15, 0.3);
  return (
    <>
      {a2 > 0 && (
        <div style={{ position: "absolute", left: 400, top: 880, transform: "translate(-50%,0)", opacity: a2, textAlign: "center", whiteSpace: "nowrap" }}>
          <div style={{ font: `900 118px ${SERIF}`, color: ASH, lineHeight: 1, textShadow: `0 0 26px rgba(${ASH_RGB},0.45)` }}>{cnt}</div>
          <div style={{ opacity: a3, font: `700 32px ${SERIF}`, color: PAPER, marginTop: 12 }}>死于战乱、饥荒与瘟疫</div>
          <div style={{ opacity: a3, font: `500 24px ${SERIF}`, color: "#b9b2a0", marginTop: 6 }}>1851—1878 · 曹树基《中国人口史》估算</div>
          <div style={{ opacity: a4, font: `900 34px ${SERIF}`, color: GOLD, marginTop: 14 }}>接近今天整个日本的人口</div>
        </div>
      )}
      {REWIND.map(([t0, dyn, yl], i) => {
        const t1 = i < 3 ? REWIND[i + 1][0] - 0.02 : 6.72;
        if (t < t0 || t > t1 + 0.2) return null;
        return (
          <React.Fragment key={dyn}>
            <Seal t={t} t0={t0} t1={t1} chars={dyn} x={540} y={760} size={270} id={`rw${i}`} rot={i % 2 ? 6 : -6} />
            <div style={{ position: "absolute", left: 0, right: 0, top: 920, textAlign: "center", font: `900 64px ${SERIF}`, color: PAPER, opacity: t > t1 ? 1 - (t - t1) / 0.2 : 1 }}>{yl}</div>
          </React.Fragment>
        );
      })}
      {b1 > 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 560, textAlign: "center", opacity: b1 }}>
          <div style={{ font: `900 64px ${SERIF}`, color: PAPER, textShadow: glow("rgba(255,255,255,0.3)") }}>第一次全国户口统计</div>
          <div style={{ font: `900 34px ${SERIF}`, color: GOLD, marginTop: 10 }}>公元 2 年 · 西汉元始二年 · 5,959 万人</div>
          <div style={{ font: `500 28px ${SERIF}`, color: "#b9b2a0", marginTop: 8 }}>《汉书·地理志》逐郡记下的户口</div>
        </div>
      )}
    </>
  );
};
const Quotes: React.FC<{ t: number }> = ({ t }) => (
  <>
    {QUOTES.map((q, i) => {
      const a = vis(t, q.t0, q.t1, 0.4, 0.5);
      if (a <= 0) return null;
      return (
        <div key={i} style={{ position: "absolute", right: 46, top: 700, display: "flex", flexDirection: "row-reverse", gap: 14, opacity: a }}>
          {q.lines.map((l, j) => (
            <div key={j} style={{ writingMode: "vertical-rl", font: `900 46px ${SERIF}`, color: PAPER, letterSpacing: 8, textShadow: "0 0 18px rgba(0,0,0,0.9)", clipPath: `inset(0 0 ${100 - 100 * ease((t - q.t0 - j * 0.5) / 1.0)}% 0)` }}>{l}</div>
          ))}
          <div style={{ writingMode: "vertical-rl", font: `500 20px ${SERIF}`, color: "#b9b2a0", letterSpacing: 3, marginTop: 120 }}>— {q.by}</div>
        </div>
      );
    })}
  </>
);
const SourceNote: React.FC<{ t: number }> = ({ t }) => {
  if (t > 215 || rewinding(t)) return null;
  const p = pointAt(CUR(t));
  return (
    <div style={{ position: "absolute", left: 18, top: 1040, writingMode: "vertical-rl", font: `500 19px ${SERIF}`, color: "rgba(196,186,166,0.6)", letterSpacing: 4 }}>
      数据 · {p.src}
    </div>
  );
};
const Ending: React.FC<{ t: number }> = ({ t }) => {
  const a1 = vis(t, 216.0, 220.6, 0.6, 0.5);
  const a2 = vis(t, 220.9, 224.6, 0.6, 0.6);
  const card = vis(t, 224.8, 999, 0.8, 0);
  return (
    <>
      {a1 > 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 360, textAlign: "center", opacity: a1 }}>
          <div style={{ font: `900 96px ${SERIF}`, color: PAPER }}>两千年</div>
          <div style={{ font: `900 40px ${SERIF}`, color: GOLD, marginTop: 18 }}>6,000 万 → 14 亿 → 约 6 亿</div>
          <div style={{ font: `500 28px ${SERIF}`, color: "#b9b2a0", marginTop: 14 }}>大起大落，人回来过很多次</div>
        </div>
      )}
      {a2 > 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 380, textAlign: "center", opacity: a2 }}>
          <div style={{ font: `900 60px ${SERIF}`, color: PAPER, lineHeight: 1.5 }}>你出生那年</div>
          <div style={{ font: `900 60px ${SERIF}`, color: GOLD, lineHeight: 1.5 }}>在哪一根竹简上？</div>
        </div>
      )}
      {card > 0 && (
        <AbsoluteFill style={{ background: `rgba(5,4,3,${0.85 * card})`, opacity: card, alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", marginTop: -160 }}>
            <Img src={staticFile("mark-disc.png")} style={{ width: 150, height: 150 }} />
            <div style={{ font: `900 76px ${FONT_CN}`, color: "#f3f4f7", marginTop: 24, letterSpacing: 6 }}>世界的形状</div>
            <div style={{ font: `500 32px ${FONT_CN}`, color: "#a9b0bf", marginTop: 14, letterSpacing: 4 }}>看见世界如何运行</div>
            <div style={{ font: `500 24px ${FONT_LAT}`, color: "#6c7383", marginTop: 40 }}>MakerJackie</div>
            <div style={{ font: `500 19px ${SERIF}`, color: "#6c6658", marginTop: 70, lineHeight: 1.7, padding: "0 90px" }}>
              数据：正史户口 · 葛剑雄主编《中国人口史》（含曹树基、吴松弟卷）· 清实录 · 国家统计局 · 联合国《世界人口展望 2024》· HYDE 3.3 / ISIMIP · OWID
            </div>
          </div>
        </AbsoluteFill>
      )}
    </>
  );
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
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 70% at 50% 52%, transparent 55%, rgba(8,5,2,0.78) 100%)" }} />
  </AbsoluteFill>
);

const HITS: [number, number][] = [
  ...INKS.map((t) => [t, 1.0] as [number, number]),
  ...BURSTS.map((t) => [t, 0.3] as [number, number]),
  ...SEALS.map((s) => [s.t0, 0.35] as [number, number]),
];
export const Film3: React.FC<{ audio?: string }> = ({ audio = "film3.wav" }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const h = HITS.reduce((m, [t0, k]) => Math.max(m, k * env(t, t0, 0.02, 0.25)), 0);
  const r = rng(f * 13 + 5);
  const shx = (r() - 0.5) * 28 * h;
  const shy = (r() - 0.5) * 28 * h;
  const sp = 1.5 + 7 * h;
  const flash = Math.max(...INKS.map((t0) => env(t, t0, 0.01, 0.14)), env(t, 2.0, 0.01, 0.08) * 0.6);
  return (
    <AbsoluteFill style={{ background: "#060403", overflow: "hidden" }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 95% 60% at 55% 66%, #15100a 0%, #060403 74%)" }} />
      <AbsoluteFill style={{ transform: `translate(${shx}px,${shy}px)`, filter: h > 0.05 ? `drop-shadow(${sp}px 0 0 rgba(255,0,40,${0.3 * h})) drop-shadow(${-sp}px 0 0 rgba(0,200,255,${0.25 * h}))` : "none" }}>
        <Stage t={t} />
        <TopRight t={t} />
        <Header t={t} />
        <Callouts t={t} />
        <Bigs t={t} />
        <OpenOverlays t={t} />
        <Quotes t={t} />
        <SourceNote t={t} />
        {SEALS.map((s, i) => (
          <Seal key={i} t={t} t0={s.t0} t1={s.t1} chars={s.chars} x={s.x} y={s.y} size={s.size} id={`s${i}`} rot={i % 2 ? 6 : -7} />
        ))}
        <Ending t={t} />
      </AbsoluteFill>
      {flash > 0 && <AbsoluteFill style={{ background: `rgba(190,24,34,${0.3 * flash})`, mixBlendMode: "screen" }} />}
      <Paper f={f} />
      <Audio src={staticFile(audio)} />
    </AbsoluteFill>
  );
};
