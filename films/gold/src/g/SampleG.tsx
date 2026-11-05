// 金价 · 15-second look test. One protagonist (a 1-gram gold bean, priced in 元), then the price line in a 3D space:
// the camera rides the head with a spring, so every daily jump is felt as a jolt; a seismograph strip draws each day's move.
// Colours follow the Chinese market: 红涨绿跌. Safe area: x 60..940, y 200..1440.
import React, { useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, Audio, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { SANS, SERIF, fontsReady } from "./fonts6";
import DATA from "./sample_data.json";

const W = 1080;
const H = 1920;
const FPS = 30;
const BAR = (k: number) => 0.05 + 4 * (60 / 130) * k;
export const SAMPLE_FRAMES = Math.round((BAR(8) + 0.6) * FPS);
const SL = 70; // safe left (text)
const SR = 930; // safe right (text)

const GOLD = "#ffc94d";
const GOLD_RGB = "255,201,77";
const UP = "#ff4a3d"; // 红涨
const UP_RGB = "255,74,61";
const DN = "#1fd17a"; // 绿跌
const DN_RGB = "31,209,122";
const WHITE = "#f6f7f8";
const MUTED = "#9aa0a6";

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const eo3 = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
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

// ---------------- data: [year, 元/克, US$/oz] per trading day, 2002-01-02 .. 2026-11-04
const D = (DATA as { d: [number, number, number][] }).d;
const N = D.length;
const LAST = N - 1;
const CNY = D.map((r) => r[1]);
const USD = D.map((r) => r[2]);
const PCT = D.map((r, i) => (i ? r[1] / D[i - 1][1] - 1 : 0));
const DATE = D.map(([y]) => {
  const yr = Math.floor(y);
  const days = yr % 4 === 0 ? 366 : 365;
  const d = new Date(Date.UTC(yr, 0, Math.round((y - yr) * days + 0.5)));
  return [yr, d.getUTCMonth() + 1, d.getUTCDate()] as const;
});
const KEY = DATE.map(([y, m, d]) => y * 10000 + m * 100 + d);
const iOf = (k: number) => KEY.findIndex((x) => x >= k);
const REC: boolean[] = [];
{
  let mx = 0;
  for (let i = 0; i < N; i++) {
    REC.push(USD[i] > mx && i > 0);
    mx = Math.max(mx, USD[i]);
  }
}
const I = { s: iOf(20250930), e1: iOf(20251007), e2: iOf(20251021), e3: iOf(20251222), pk: iOf(20260129), cr: iOf(20260130) };

// ---------------- the clock: head position (fractional day index) against time, landing events on the bars
const HK: [number, number, "s" | "m"][] = [
  [0, 0, "m"],
  [BAR(1), 0, "s"],
  [BAR(2) + 0.2, LAST, "m"],
  [BAR(3.5), LAST, "s"],
  [BAR(4), I.s, "m"],
  [BAR(4.5), I.e1, "m"],
  [BAR(5), I.e2, "m"],
  [BAR(6), I.e3, "m"],
  [BAR(6.5), I.pk, "m"],
  [BAR(7) - 0.03, I.pk, "m"],
  [BAR(7) + 0.15, I.cr, "m"],
  [999, I.cr, "m"],
];
const headAt = (t: number) => {
  for (let k = 0; k < HK.length - 1; k++) {
    const [t0, h0] = HK[k];
    const [t1, h1, kind] = HK[k + 1];
    if (t < t1) {
      const u = clamp((t - t0) / (t1 - t0));
      const s = kind === "s" ? smooth(u) : 0.55 * u + 0.45 * smooth(u);
      return lerp(h0, h1, s);
    }
  }
  return HK[HK.length - 1][1];
};
const priceAt = (h: number) => {
  const i = Math.min(Math.floor(h), LAST);
  if (i >= LAST) return CNY[LAST];
  return lerp(CNY[i], CNY[i + 1], eo3(h - i));
};

// ---------------- world: x = time (the past before 2024 compressed), y = 元, z = depth
const SX = 2400; // units per year from 2024
const SXP = 260; // units per year before 2024
const SY = 2.3; // units per 元
const Y_FLOOR = 760 * SY; // the floor the price wall stands on
const X = (y: number) => (y >= 2024 ? (y - 2025) * SX : (2024 - 2025) * SX - (2024 - y) * SXP);
const XI = D.map((r) => X(r[0]));
const headX = (h: number) => {
  const i = Math.min(Math.floor(h), LAST);
  return i >= LAST ? XI[LAST] : lerp(XI[i], XI[i + 1], h - i);
};

// ---------------- events (the cards) and hits
type Ev = { t: number; title: string; sub: string; tone: "gold" | "dn" | "white"; fx: "ring" | "drop" | "big" | "peak" | "crash"; big?: string; i: number };
const EVS: Ev[] = [
  { t: BAR(4.5), i: I.e1, title: "国际金价 破 4,000 美元", sub: `1 克 ≈ ${Math.round(CNY[I.e1])} 元`, tone: "gold", fx: "ring" },
  { t: BAR(5), i: I.e2, title: "一天暴跌 5.7%", sub: "12 年来最大单日跌幅", tone: "dn", fx: "drop" },
  { t: BAR(6), i: I.e3, title: "1 克黄金 破 1,000 元", sub: "按国际金价折算", tone: "gold", fx: "big", big: "1,000" },
  { t: BAR(6.5), i: I.pk, title: "历史最高", sub: `1 克 ${Math.round(CNY[I.pk]).toLocaleString("en-US")} 元`, tone: "gold", fx: "peak" },
  { t: BAR(7), i: I.cr, title: `一天暴跌 ${Math.round(CNY[I.pk] - CNY[I.cr])} 元`, sub: "特朗普提名沃什执掌美联储", tone: "dn", fx: "crash" },
];

// ---------------- per-frame simulation (camera spring, shake, the time each day is reached)
const NF = SAMPLE_FRAMES + 2;
const SIM = (() => {
  const camY: number[] = [];
  const shake: number[] = [];
  const reachT = new Float32Array(N).fill(-1);
  let y = priceAt(LAST) * SY;
  let v = 0;
  let e = 0;
  let prevH = 0;
  const SUB = 8;
  for (let f = 0; f < NF; f++) {
    const t = f / FPS;
    for (let s = 0; s < SUB; s++) {
      const ts = t - (SUB - 1 - s) / (FPS * SUB);
      const target = priceAt(headAt(ts)) * SY;
      if (ts < BAR(3)) {
        y = target;
        v = 0;
        continue;
      }
      const k = ts < BAR(4) ? 260 : 70;
      const z = ts < BAR(4) ? 1 : 0.42;
      const c = 2 * Math.sqrt(k) * z;
      const dt = 1 / (FPS * SUB);
      v += (k * (target - y) - c * v) * dt;
      y += v * dt;
    }
    camY.push(y);
    const h = headAt(t);
    // shake from the days crossed this frame (ride only), plus the event hits
    e *= Math.exp(-1 / FPS / 0.2);
    if (t >= BAR(4)) {
      for (let i = Math.floor(prevH) + 1; i <= Math.floor(h); i++) e += Math.max(0, Math.abs(PCT[i]) - 0.012) * 12;
    }
    for (const ev of EVS) if (ev.t >= t - 1 / FPS && ev.t < t) e += ev.fx === "crash" ? 1.3 : ev.fx === "drop" ? 0.7 : 0.22;
    e = Math.min(e, 1.5);
    shake.push(e);
    if (t >= BAR(4)) for (let i = Math.floor(prevH) + 1; i <= Math.floor(h); i++) if (reachT[i] < 0) reachT[i] = t;
    prevH = h;
  }
  return { camY, shake, reachT };
})();
const RIDE_REC = (() => {
  const out: number[] = [];
  for (let i = I.s + 1; i <= I.pk; i++) if (REC[i]) out.push(i);
  return out;
})();

// ---------------- camera
type Proj = (x: number, y: number, z: number) => [number, number, number] | null;
const keyed = (t: number, ks: [number, number][]) => {
  if (t <= ks[0][0]) return ks[0][1];
  for (let k = 0; k < ks.length - 1; k++) {
    if (t < ks[k + 1][0]) return lerp(ks[k][1], ks[k + 1][1], smooth((t - ks[k][0]) / (ks[k + 1][0] - ks[k][0])));
  }
  return ks[ks.length - 1][1];
};
const camAt = (t: number, f: number) => {
  const h = headAt(t);
  const dist = keyed(t, [[BAR(3), 520], [BAR(3.5), 2300], [BAR(4), 1350], [BAR(6), 1350], [BAR(6.5), 1500], [BAR(7) - 0.1, 820], [BAR(7) + 0.5, 980], [BAR(8.5), 1100]]);
  const theta = (keyed(t, [[BAR(3), 6], [BAR(3.5), 16], [BAR(4), 38], [BAR(6.5), 40], [BAR(7) - 0.1, 54], [BAR(8.5), 44]]) * Math.PI) / 180;
  const phi = (keyed(t, [[BAR(3), 2], [BAR(4), 12], [BAR(7), 14], [BAR(8.5), 12]]) * Math.PI) / 180;
  const back = keyed(t, [[BAR(3), 0], [BAR(4), 0.11], [BAR(7), 0.06]]) * SX;
  const Tx = headX(h) - back;
  const Ty = SIM.camY[Math.min(f, SIM.camY.length - 1)] + 40;
  const Tz = 0;
  const cpx = Tx + dist * Math.sin(theta) * Math.cos(phi);
  const cpy = Ty + dist * Math.sin(phi);
  const cpz = Tz - dist * Math.cos(theta) * Math.cos(phi);
  let fx = Tx - cpx;
  let fy = Ty - cpy;
  let fz = Tz - cpz;
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
  const cx = 470;
  const cy = keyed(t, [[BAR(3.5), 930], [BAR(4), 880], [BAR(6.5), 880], [BAR(7) - 0.1, 1050]]);
  const proj: Proj = (x, y, z) => {
    const dx = x - cpx;
    const dy = y - cpy;
    const dz = z - cpz;
    const zc = dx * fx + dy * fy + dz * fz;
    if (zc < 30) return null;
    const xc = dx * rx + dz * rz;
    const yc = dx * ux + dy * uy + dz * uz;
    return [cx + (FOC * xc) / zc, cy - (FOC * yc) / zc, zc];
  };
  return { proj, h, dist };
};

// ---------------- text helpers (canvas only)
const text = (
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  size: number,
  weight: number,
  fam: string,
  color: string,
  o: { align?: CanvasTextAlign; maxW?: number; alpha?: number; glow?: string; blur?: number; ls?: number } = {},
) => {
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
// digits in fixed cells, so a counting number never jitters sideways
const tab = (ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string, align: "left" | "center" | "right", glow?: string) => {
  ctx.font = `900 ${size}px ${SANS}`;
  (ctx as any).letterSpacing = "0px";
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "center";
  const dw = ctx.measureText("0").width;
  const ws = [...s].map((ch) => (/[0-9]/.test(ch) ? dw : ctx.measureText(ch).width));
  const tw = ws.reduce((a, b) => a + b, 0);
  let cx = align === "left" ? x : align === "center" ? x - tw / 2 : x - tw;
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = 26;
  }
  ctx.fillStyle = color;
  [...s].forEach((ch, k) => {
    ctx.fillText(ch, cx + ws[k] / 2, y);
    cx += ws[k];
  });
  ctx.shadowBlur = 0;
  return tw;
};
const fmt = (v: number) => Math.round(v).toLocaleString("en-US");
const dayColor = (i: number) => (PCT[i] >= 0 ? UP : DN);

// ---------------- images
let BEAN: HTMLImageElement | null = null;
let CH: HTMLCanvasElement | null = null;
let IMG_P: Promise<void> | null = null;
const imagesReady = () =>
  (IMG_P ??= new Promise<void>((res, rej) => {
    const im = new Image();
    im.onload = () => im.decode().then(() => res(), () => res());
    im.onerror = () => rej(new Error("bean image"));
    im.src = staticFile("sample_bean.png");
    BEAN = im;
  }));

// 3D dust that parallaxes as the camera moves
const DUST = (() => {
  const r = rng(77);
  return Array.from({ length: 260 }, () => [lerp(X(2025.55), X(2026.25), r()), lerp(760 * 2.3, 1500 * 2.3, r()), lerp(-500, 1600, r()), r()] as const);
})();

// =====================================================================================================================
const draw = (ctx0: CanvasRenderingContext2D, f: number) => {
  let ctx = ctx0;
  const t = f / FPS;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // the background lives in the canvas, so the bean (black plate, added with "lighter") blends into it
  ctx.fillStyle = "#060504";
  ctx.fillRect(0, 0, W, H);
  {
    ctx.save();
    ctx.translate(540, 864);
    ctx.scale(1, 1152 / 1080);
    const bg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1080);
    bg.addColorStop(0, "#18130b");
    bg.addColorStop(0.72, "#060504");
    bg.addColorStop(1, "#060504");
    ctx.fillStyle = bg;
    ctx.fillRect(-600, -1000, 1200, 2000);
    ctx.restore();
  }
  const { proj, h } = camAt(t, f);
  const hi = Math.min(Math.floor(h), LAST);
  const hd = Math.min(h - hi > 0.5 ? hi + 1 : hi, LAST); // the day the header shows
  const price = priceAt(h);
  const sh = SIM.shake[Math.min(f, SIM.shake.length - 1)];
  const r = rng(f * 13 + 5);
  const sx = (r() - 0.5) * 46 * sh;
  const sy = (r() - 0.5) * 46 * sh;
  ctx.save();
  ctx.translate(sx, sy);

  // ================= the chart (from the bean's exit on)
  const chartA = smooth((t - BAR(3) - 0.1) / 0.45);
  const main = ctx;
  if (chartA > 0) {
    CH ??= document.createElement("canvas");
    CH.width = W;
    CH.height = H;
    ctx = CH.getContext("2d")!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = chartA;
    const hx = headX(h);
    const hy = price * SY;
    // the floor: a perspective grid under the wall, fading with depth
    {
      const seg = (x0: number, z0: number, x1: number, z1: number, a: number) => {
        const p = proj(x0, Y_FLOOR, z0);
        const q = proj(x1, Y_FLOOR, z1);
        if (!p || !q) return;
        const fog = clamp(1 - ((p[2] + q[2]) / 2 - 500) / 4200);
        if (fog <= 0) return;
        ctx.strokeStyle = `rgba(${GOLD_RGB},${a * fog})`;
        ctx.beginPath();
        ctx.moveTo(p[0], p[1]);
        ctx.lineTo(q[0], q[1]);
        ctx.stroke();
      };
      ctx.lineWidth = 1.2;
      const xa = hx - 1.4 * SX;
      const xb = hx + 0.35 * SX;
      for (let z = -200; z <= 2800; z += 200) seg(xa, z, xb, z, z === 0 ? 0.3 : 0.11);
      const mStep = SX / 12;
      for (let x = Math.floor(xa / mStep) * mStep; x <= xb; x += mStep) seg(x, -200, x, 2800, 0.11);
    }
    // price grid on the line's plane, every 100 元 around the head
    const g0 = Math.floor((price - 450) / 100) * 100;
    for (let p = Math.max(100, g0); p <= price + 350; p += 100) {
      const a = proj(hx - 1.15 * SX, p * SY, 0);
      const b = proj(hx + 0.12 * SX, p * SY, 0);
      if (!a || !b) continue;
      const near = 1 - clamp(Math.abs(p - price) / 500);
      ctx.strokeStyle = `rgba(255,255,255,${0.05 + 0.07 * near})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
      if (b[0] > SL && b[0] < SR && b[1] > 520 && b[1] < 1220) text(ctx, `${p.toLocaleString("en-US")} 元`, b[0] + 10, b[1] + 9, 24, 500, SANS, MUTED, { alpha: 0.55 + 0.4 * near });
    }
    // month walls: a faint vertical at each month start, labelled at its foot
    {
      const [y0, m0] = DATE[hi];
      for (let k = 0; k < 16; k++) {
        let yy = y0;
        let mm = m0 - k;
        while (mm < 1) {
          mm += 12;
          yy -= 1;
        }
        const xm = X(yy + (mm - 1) / 12);
        if (xm > hx) continue;
        const a = proj(xm, Y_FLOOR, 0);
        const b = proj(xm, (price + 300) * SY, 0);
        if (!a || !b) continue;
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
        const lab = mm === 1 ? `${yy} 年` : `${mm} 月`;
        const sz = clamp(26 * (1000 / a[2]) * 1.2, 12, 30);
        if (a[1] < 1225 && a[0] > SL - 10) text(ctx, lab, a[0], a[1] - 8, sz, mm === 1 ? 900 : 500, SANS, mm === 1 ? GOLD : MUTED, { align: "center", alpha: 0.7 });
      }
    }
    // dust
    for (const [dx, dy, dz, k] of DUST) {
      const p = proj(dx, dy, dz);
      if (!p) continue;
      const rad = clamp((2.2 * 1000) / p[2], 0.5, 4);
      ctx.fillStyle = `rgba(${GOLD_RGB},${0.12 + 0.25 * k})`;
      ctx.beginPath();
      ctx.arc(p[0], p[1], rad, 0, Math.PI * 2);
      ctx.fill();
    }
    // the line: project, thin in screen space
    const pts: [number, number, number, number][] = [];
    let lx = -1e9;
    let ly = -1e9;
    for (let i = 0; i <= hi; i++) {
      const p = proj(XI[i], CNY[i] * SY, 0);
      if (!p) continue;
      if (i < hi - 2 && Math.abs(p[0] - lx) < 0.8 && Math.abs(p[1] - ly) < 0.8) continue;
      pts.push([p[0], p[1], p[2], i]);
      lx = p[0];
      ly = p[1];
    }
    const hp = proj(hx, hy, 0);
    if (hp) pts.push([hp[0], hp[1], hp[2], h]);
    // curtain under the recent line
    {
      const from = pts.findIndex((q) => q[3] >= hi - 300);
      if (from >= 0 && hp) {
        ctx.beginPath();
        let ok = false;
        for (let k = from; k < pts.length; k++) {
          const q = pts[k];
          if (!ok) ctx.moveTo(q[0], q[1]);
          else ctx.lineTo(q[0], q[1]);
          ok = true;
        }
        for (let k = pts.length - 1; k >= from; k--) {
          const ii = Math.min(Math.floor(pts[k][3]), LAST);
          const bp = proj(ii === hi ? hx : XI[ii], Y_FLOOR, 0);
          if (bp) ctx.lineTo(bp[0], bp[1]);
        }
        ctx.closePath();
        const fl = proj(hx, Y_FLOOR, 0);
        const gr = ctx.createLinearGradient(0, hp[1] - 200, 0, fl ? fl[1] : hp[1] + 500);
        gr.addColorStop(0, `rgba(${GOLD_RGB},0.3)`);
        gr.addColorStop(0.6, `rgba(${GOLD_RGB},0.09)`);
        gr.addColorStop(1, `rgba(${GOLD_RGB},0.03)`);
        ctx.fillStyle = gr;
        ctx.fill();
      }
    }
    // glow + core, width by depth; the crash day glows green
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.globalCompositeOperation = "lighter";
    for (const pass of [0, 1]) {
      for (let k = 1; k < pts.length; k++) {
        const a = pts[k - 1];
        const b = pts[k];
        const wd = clamp((5.6 * 1000) / b[2], 1, 9);
        const isCrash = b[3] > I.pk && b[3] <= I.cr + 0.001;
        const rgb = isCrash ? DN_RGB : GOLD_RGB;
        ctx.strokeStyle = pass === 0 ? `rgba(${rgb},0.16)` : isCrash ? DN : `rgba(255,214,120,0.95)`;
        ctx.lineWidth = pass === 0 ? wd * 4.2 : wd;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = "source-over";
    // new highs flash on the line as the head passes them
    let recN = 0;
    for (const i of RIDE_REC) {
      const tr = SIM.reachT[i];
      if (tr < 0 || tr > t) continue;
      recN++;
      const age = t - tr;
      if (age > 0.55) continue;
      const p = proj(XI[i], CNY[i] * SY, 0);
      if (!p) continue;
      const a = 1 - age / 0.55;
      ctx.globalCompositeOperation = "lighter";
      const rg = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], 34);
      rg.addColorStop(0, `rgba(${UP_RGB},${0.7 * a})`);
      rg.addColorStop(1, `rgba(${UP_RGB},0)`);
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(p[0], p[1], 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      text(ctx, "新高", p[0], p[1] - 22 - 30 * eo3(age / 0.55), 26, 900, SANS, UP, { align: "center", alpha: a });
    }
    // the head
    if (hp) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 9);
      ctx.globalCompositeOperation = "lighter";
      const rg = ctx.createRadialGradient(hp[0], hp[1], 0, hp[0], hp[1], 70);
      rg.addColorStop(0, `rgba(255,236,170,${0.9})`);
      rg.addColorStop(0.25, `rgba(${GOLD_RGB},${0.45 + 0.15 * pulse})`);
      rg.addColorStop(1, `rgba(${GOLD_RGB},0)`);
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(hp[0], hp[1], 70, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#fff6dc";
      ctx.beginPath();
      ctx.arc(hp[0], hp[1], 6.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // the peak pin, once passed
    if (t >= BAR(6.5) - 0.05) {
      const p = proj(XI[I.pk], CNY[I.pk] * SY, 0);
      if (p) {
        const a = smooth((t - BAR(6.5) + 0.05) / 0.25);
        text(ctx, `${fmt(CNY[I.pk])} 元`, p[0] + 18, p[1] + 12, 34, 900, SANS, GOLD, { alpha: a, glow: `rgba(${GOLD_RGB},0.6)` });
      }
    }
    // hits: rings at the head
    for (const ev of EVS) {
      const age = t - ev.t;
      if (age < 0 || age > 0.9 || !hp) continue;
      const col = ev.tone === "dn" ? DN_RGB : GOLD_RGB;
      for (const [d0, mul] of [[0, 1], [0.12, 0.6]] as const) {
        const u = clamp((age - d0) / 0.75);
        if (u <= 0) continue;
        ctx.strokeStyle = `rgba(${col},${(1 - u) * 0.8})`;
        ctx.lineWidth = 6 * (1 - u) + 1;
        ctx.beginPath();
        ctx.arc(hp[0], hp[1], 20 + 260 * mul * eo3(u), 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    // the crash: gold dust falls off the cliff
    if (t >= BAR(7) && hp) {
      const rr = rng(991);
      const pk = proj(XI[I.pk], CNY[I.pk] * SY, 0);
      for (let k = 0; k < 90; k++) {
        const t0 = BAR(7) + rr() * 0.5;
        const age = t - t0;
        const vx = (rr() - 0.3) * 120;
        const vy = -rr() * 160;
        const sz = 1.5 + rr() * 3;
        if (age < 0 || age > 1.6 || !pk) continue;
        const x = pk[0] + vx * age;
        const y = pk[1] + vy * age + 0.5 * 1100 * age * age;
        ctx.fillStyle = `rgba(${GOLD_RGB},${(1 - age / 1.6) * 0.9})`;
        ctx.fillRect(x, y, sz, sz);
      }
    }
    ctx.restore();
    // the band the chart may use: fade out above the cards and above the seismograph
    ctx.globalCompositeOperation = "destination-in";
    const mk = ctx.createLinearGradient(0, 0, 0, H);
    mk.addColorStop(0, "rgba(0,0,0,0)");
    mk.addColorStop(470 / H, "rgba(0,0,0,0)");
    mk.addColorStop(560 / H, "rgba(0,0,0,1)");
    mk.addColorStop(1150 / H, "rgba(0,0,0,1)");
    mk.addColorStop(1235 / H, "rgba(0,0,0,0)");
    mk.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = mk;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
    ctx = main;
    ctx.drawImage(CH, 0, 0);
  }

  // ================= the hook: one gram of gold
  const hookA = 1 - smooth((t - BAR(3)) / 0.5);
  if (hookA > 0 && BEAN) {
    const inA = 0.8 + 0.2 * smooth(t / 0.4); // the very first frame already shows the bean
    const u = smooth((t - BAR(3)) / (BAR(3.5) - BAR(3)));
    // the bean shrinks into the line's head
    const { proj: p2 } = camAt(Math.max(t, BAR(3)), f);
    const hp = p2(headX(LAST), CNY[LAST] * SY, 0) ?? [470, 930, 1];
    const s0 = 0.8 + 0.05 * (t / BAR(3));
    const sc = lerp(s0, 0.035, u);
    const speed = t > BAR(1) && t < BAR(2) + 0.2 ? Math.sin(Math.PI * clamp((t - BAR(1)) / (BAR(2) + 0.2 - BAR(1)))) : 0;
    const jr = rng(f * 7 + 3);
    const jx = (jr() - 0.5) * 9 * speed;
    const jy = (jr() - 0.5) * 9 * speed;
    const bx = lerp(540, hp[0], u) + jx;
    const by = lerp(800, hp[1], u) + jy;
    const iw = BEAN.naturalWidth;
    const ih = BEAN.naturalHeight;
    const dw = W * sc;
    const dh = (dw * ih) / iw;
    ctx.save();
    ctx.globalAlpha = inA * (1 - smooth((u - 0.7) / 0.3));
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(BEAN, bx - dw / 2, by - dh / 2, dw, dh);
    // a light sweep across the gold
    const sw = ((t * 0.55) % 1.6) - 0.3;
    if (sw > 0 && sw < 1 && u < 0.3) {
      const gx = bx - dw * 0.3 + dw * 0.6 * sw;
      const lg = ctx.createLinearGradient(gx - 60, by - 200, gx + 60, by + 200);
      lg.addColorStop(0, "rgba(255,240,200,0)");
      lg.addColorStop(0.5, `rgba(255,240,200,${0.16 * (1 - u)})`);
      lg.addColorStop(1, "rgba(255,240,200,0)");
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.ellipse(bx, by, dw * 0.22, dw * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // date, price (红涨绿跌 as it counts), label
    const ta = inA * (1 - smooth((t - BAR(3)) / 0.3));
    const qA = smooth((t - BAR(2)) / 0.3);
    if (ta > 0) {
      ctx.save();
      ctx.globalAlpha = ta;
      const counting = t > BAR(1) && t < BAR(2) + 0.2;
      const hh = Math.round(h);
      const [yy, mm] = DATE[Math.min(hh, LAST)];
      text(ctx, `${yy} 年 ${mm} 月`, 540, 1200, 44, 500, SANS, MUTED, { align: "center" });
      const col = counting ? dayColor(Math.min(hh, LAST)) : t >= BAR(2) + 0.2 ? GOLD : WHITE;
      const pw = tab(ctx, fmt(CNY[Math.min(hh, LAST)]), 520, 1345, 190, col, "center", counting ? undefined : `rgba(${GOLD_RGB},0.45)`);
      text(ctx, "元", 520 + pw / 2 + 14, 1345, 70, 900, SANS, col);
      text(ctx, "1 克黄金的价格", 540, 1412, 34, 500, SANS, MUTED, { align: "center" });
      // the question
      if (qA > 0) {
        text(ctx, "这颗金豆，一点没变", 540, 330, 62, 900, SANS, WHITE, { align: "center", alpha: qA, maxW: 860 });
        const q2 = smooth((t - BAR(2.5)) / 0.25);
        const pop = 1 + 0.25 * (1 - eo3((t - BAR(2.5)) / 0.3));
        if (q2 > 0) {
          ctx.save();
          ctx.translate(540, 445);
          ctx.scale(pop, pop);
          text(ctx, "凭什么贵了 10 多倍？", 0, 0, 84, 900, SANS, GOLD, { align: "center", alpha: q2, maxW: 860, glow: `rgba(${GOLD_RGB},0.5)`, blur: 26 });
          ctx.restore();
        }
      } else {
        text(ctx, "1 克黄金", 540, 330, 56, 900, SANS, WHITE, { align: "center" });
      }
      ctx.restore();
    }
  }

  // ================= rewind label
  {
    const a = smooth((t - BAR(3.5)) / 0.15) * (1 - smooth((t - BAR(4) + 0.1) / 0.2));
    if (a > 0) text(ctx, "倒回 2025 年秋……", 540, 600, 50, 900, SANS, WHITE, { align: "center", alpha: a });
  }

  // ================= header: date, price in 元/克, US$, the day's move, what 1 万元 buys
  const hdA = smooth((t - BAR(3.5)) / 0.3);
  if (hdA > 0) {
    ctx.save();
    ctx.globalAlpha = hdA;
    // left: the date, the price in 元/克 (红涨绿跌), the US$ price under it
    const [yy, mm, dd] = DATE[hd];
    text(ctx, `${yy} 年 ${mm} 月 ${dd} 日`, SL, 268, 38, 500, SANS, MUTED);
    const pc = PCT[hd];
    const col = t < BAR(4) ? WHITE : pc >= 0 ? UP : DN;
    const pw = tab(ctx, fmt(price), SL, 398, 128, col, "left");
    text(ctx, "元/克", SL + pw + 12, 398, 42, 900, SANS, col);
    text(ctx, `≈ ${fmt(USD[hd])} 美元/盎司`, SL, 452, 30, 500, SANS, MUTED);
    // right: the day's move, then what 1 万元 buys
    if (t >= BAR(4)) {
      const s = `${pc >= 0 ? "+" : "−"}${Math.abs(pc * 100).toFixed(1)}%`;
      const bw = 168;
      text(ctx, "当日涨跌", SR, 268, 24, 500, SANS, MUTED, { align: "right" });
      ctx.fillStyle = `rgba(${pc >= 0 ? UP_RGB : DN_RGB},0.2)`;
      ctx.beginPath();
      ctx.roundRect(SR - bw, 286, bw, 62, 10);
      ctx.fill();
      tab(ctx, s, SR - bw / 2, 332, 42, pc >= 0 ? UP : DN, "center");
    }
    text(ctx, "1 万元能买", SR, 400, 24, 500, SANS, MUTED, { align: "right" });
    const cw = text(ctx, "克", SR, 452, 28, 900, SANS, GOLD, { align: "right" });
    tab(ctx, (10000 / price).toFixed(1), SR - cw - 8, 452, 46, GOLD, "right");
    // new-high counter while riding
    if (t >= BAR(4)) {
      let n = 0;
      for (const i of RIDE_REC) if (SIM.reachT[i] >= 0 && SIM.reachT[i] <= t) n++;
      const last = RIDE_REC.filter((i) => SIM.reachT[i] >= 0 && SIM.reachT[i] <= t).pop();
      const kick = last !== undefined ? 1 - clamp((t - SIM.reachT[last]) / 0.25) : 0;
      ctx.save();
      ctx.translate(SL, 508);
      ctx.scale(1 + 0.15 * kick, 1 + 0.15 * kick);
      text(ctx, `创新高 ×${n}`, 0, 0, 30, 900, SANS, UP, { alpha: 0.95 });
      ctx.restore();
    }
    ctx.restore();
  }

  // ================= cards: one event at a time, on the bar
  for (let k = 0; k < EVS.length; k++) {
    const ev = EVS[k];
    const next = EVS[k + 1]?.t ?? 999;
    const age = t - ev.t;
    if (age < 0 || t > next) continue;
    const inU = eo3(age / 0.22);
    const outU = smooth((t - (next - 0.14)) / 0.14); // gone before the next card lands
    const a = inU * (1 - outU);
    const col = ev.tone === "dn" ? DN : ev.tone === "gold" ? GOLD : WHITE;
    ctx.save();
    ctx.translate(-40 * (1 - inU), -30 * outU);
    const big = ev.fx === "crash";
    text(ctx, ev.title, SL, big ? 616 : 600, big ? 76 : 64, 900, SANS, col, { alpha: a, maxW: 860, glow: ev.tone === "dn" ? `rgba(${DN_RGB},0.45)` : undefined });
    text(ctx, ev.sub, SL, big ? 676 : 656, 36, 500, SANS, WHITE, { alpha: a * 0.85, maxW: 860 });
    ctx.restore();
  }
  // the big number (破 1,000 元)
  for (const ev of EVS) {
    if (!ev.big) continue;
    const age = t - ev.t;
    if (age < -0.05 || age > 0.85) continue;
    const a = smooth((age + 0.05) / 0.1) * (1 - smooth((age - 0.5) / 0.35));
    const sc = 1.35 - 0.35 * eo3(age / 0.3);
    ctx.save();
    ctx.translate(500, 860);
    ctx.scale(sc, sc);
    ctx.globalAlpha = a;
    tab(ctx, ev.big, 0, 0, 220, GOLD, "center", `rgba(${GOLD_RGB},0.8)`);
    ctx.restore();
  }

  // ================= the seismograph: each trading day's move, 红涨绿跌
  if (hdA > 0) {
    ctx.save();
    ctx.globalAlpha = hdA;
    const y0 = 1340;
    const x1 = 905;
    const step = 13.5;
    const n = 60;
    const AMP = (p: number) => Math.sign(p) * 92 * (1 - Math.exp(-Math.abs(p) / 0.03)); // compressed: 1% ≈ 26 px, 10% ≈ 89 px
    text(ctx, "每日涨跌", SL, 1262, 26, 500, SANS, MUTED);
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(SL, y0);
    ctx.lineTo(x1 + 10, y0);
    ctx.stroke();
    for (const lv of [-0.05, 0.05]) {
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(SL, y0 - AMP(lv));
      ctx.lineTo(x1, y0 - AMP(lv));
      ctx.stroke();
      ctx.setLineDash([]);
      text(ctx, lv > 0 ? "+5%" : "−5%", x1 + 14, y0 - AMP(lv) + 8, 20, 500, SANS, MUTED, { alpha: 0.6 });
    }
    const frac = h - hi;
    for (let k = 0; k < n; k++) {
      const i = hi - k;
      if (i <= 0 || t < BAR(4) - 0.2) break;
      const x = x1 - (k + 1 - frac) * step;
      if (x < SL) break;
      const grow = k === 0 ? eo3(frac * 1.4 + 0.3) : 1;
      const v = AMP(PCT[i]) * grow;
      const isUp = PCT[i] >= 0;
      const fresh = k < 2 ? 1 : 0.75;
      ctx.fillStyle = `rgba(${isUp ? UP_RGB : DN_RGB},${fresh})`;
      ctx.fillRect(x - 4.5, isUp ? y0 - v : y0, 9, Math.abs(v) + 0.5);
    }
    // the needle
    const pv = t >= BAR(4) - 0.2 ? PCT[hd] : 0;
    ctx.strokeStyle = WHITE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y0 - 96);
    ctx.lineTo(x1, y0 + 96);
    ctx.stroke();
    ctx.fillStyle = pv >= 0 ? UP : DN;
    ctx.beginPath();
    ctx.arc(x1, y0 - AMP(pv), 7, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, "数据：COMEX 黄金期货收盘价，按美联储公布的当日汇率折合人民币", SL, 1436, 20, 500, SANS, MUTED, { alpha: 0.6, maxW: 860 });
    ctx.restore();
  }
  ctx.restore();

  // ================= flashes (green on the drops)
  for (const ev of EVS) {
    const age = t - ev.t;
    if (age < 0 || age > 0.5) continue;
    if (ev.fx === "crash" || ev.fx === "drop") {
      const a = (ev.fx === "crash" ? 0.34 : 0.18) * Math.exp(-age / 0.12);
      ctx.fillStyle = `rgba(${DN_RGB},${a})`;
      ctx.fillRect(0, 0, W, H);
      if (ev.fx === "crash" && age < 0.06) {
        ctx.fillStyle = `rgba(255,255,255,${0.35 * (1 - age / 0.06)})`;
        ctx.fillRect(0, 0, W, H);
      }
    } else if (ev.fx === "big" || ev.fx === "peak") {
      ctx.fillStyle = `rgba(${GOLD_RGB},${0.12 * Math.exp(-age / 0.15)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }
  // fade to black at the end
  const endA = smooth((t - (SAMPLE_FRAMES / FPS - 0.5)) / 0.5);
  if (endA > 0) {
    ctx.fillStyle = `rgba(0,0,0,${endA})`;
    ctx.fillRect(0, 0, W, H);
  }
};

// =====================================================================================================================
export const SampleG: React.FC = () => {
  const f = useCurrentFrame();
  const [handle] = useState(() => delayRender("sample fonts + bean", { timeoutInMilliseconds: 180000 }));
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
      <Audio src={staticFile("score_world8.wav")} volume={(fr) => clamp((SAMPLE_FRAMES - fr) / 18)} />
    </AbsoluteFill>
  );
};
