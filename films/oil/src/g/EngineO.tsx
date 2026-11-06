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
import OHLC_RAW from "./oil_ohlc.json";
import { COIN, COLD5, MAPFX, MONTAGE, NEXT, PEGS, RATES, SHOT_BEAT, SWEEP, WIDE, WIDE_AT, WIRES, fwBursts } from "./oil";
import LAND_RAW from "./oil_land.json";
import type { Icon, P5 } from "./oil";

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
const BEAT_S = 60 / 130;

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
  stat: "", peak: "上涨", grow: "上涨", war: "战争", crash: "暴跌", plague: "", famine: "", split: "脱钩", unite: "", move: "", policy: "政策", note: "", quote: "", turn: "转折",
};
const fmtUsd = (v: number) => (v < 0 ? "−" : "") + (Math.abs(v) < 1000 ? (Math.round(Math.abs(v) * 100 + 1e-6) / 100).toFixed(2) : Math.round(Math.abs(v)).toLocaleString("en-US"));
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
const hitsBox = (o: number[], b: number[]) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1];
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

// ---------------- images
const IMGS: Record<string, HTMLImageElement> = {};
let IMG_P: Promise<unknown> | null = null;
const imagesReady = () =>
  (IMG_P ??= Promise.all(
    ["mark-disc.png", "art/fieldbg.png", "art/pj_base.png", "art/pj_beam.png", "art/pj_crank.png", "art/barrel.png",...["pumpjack", "derrick", "tanker", "refinery", "barrel", "pipeline", "flame", "tank", "pump", "exchange", "gavel", "strait", "virus", "car", "offshore"].map((n) => `art/i_${n}.png`)].map(
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

// ---------------- icons: line glyphs on a dark badge (100-unit box), p = entrance 0..1
const drawIcon = (ctx: CanvasRenderingContext2D, name: Icon, cx: number, cy: number, s: number, p: number, col: string, word = "关税") => {
  const art = IMGS[`art/i_${name}.png`];
  if (art) {
    // the engraving, popping in, on a soft dark halo so it reads over the chart or the map
    const pop = 1 + 0.35 * (1 - eo3(p / 0.4));
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s * pop, s * pop);
    ctx.globalAlpha *= clamp(p / 0.12);
    const halo = ctx.createRadialGradient(0, 0, 20, 0, 0, 78);
    halo.addColorStop(0, "rgba(8,6,4,0.75)");
    halo.addColorStop(1, "rgba(8,6,4,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(-80, -80, 160, 160);
    if (p < 1) {
      const a0 = ctx.globalAlpha;
      ctx.globalAlpha = a0 * (1 - eo3(p)) * 0.8;
      ctx.strokeStyle = col;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 60 + 60 * eo3(p), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = a0;
    }
    ctx.drawImage(art, -64, -64, 128, 128);
    ctx.restore();
    return;
  }
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
    bar(-10, 26);  } else if (name === "tariff") {
    // a crate with a tax stamp across it
    rrect(ctx, -40, -26, 80, 56, 6);
    ctx.stroke();
    line([[-40, -8], [40, -8]]);
    const slam = 1 + 0.8 * (1 - eo3((p - 0.2) / 0.2));
    if (p > 0.2) {
      ctx.save();
      ctx.translate(6, 10);
      ctx.rotate(-0.25);
      ctx.scale(slam, slam);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(12,12,14,0.9)";
      rrect(ctx, -30, -17, 60, 34, 4);
      ctx.fill();
      ctx.lineWidth = 3;
      rrect(ctx, -30, -17, 60, 34, 4);
      ctx.stroke();
      text(ctx, word, 0, 10, word.length > 3 ? 15 : 24, 900, SANS, col, { align: "center" });
      ctx.restore();
    }
  } else if (name === "gavel") {
    // a judge's gavel coming down on its block
    const sw = -0.7 * (1 - eo3((p - 0.15) / 0.2));
    line([[-40, 34], [10, 34]]);
    ctx.lineWidth = 4;
    rrect(ctx, -32, 22, 34, 10, 3);
    ctx.stroke();
    ctx.save();
    ctx.translate(30, 30);
    ctx.rotate(sw);
    ctx.translate(-30, -30);
    ctx.lineWidth = 6;
    line([[30, 30], [-6, -6]]);
    ctx.save();
    ctx.translate(-12, -12);
    ctx.rotate(-Math.PI / 4);
    rrect(ctx, -22, -12, 44, 24, 5);
    ctx.fill();
    ctx.restore();
    ctx.restore();
  } else if (name === "derrick") {
    // an oil derrick: a lattice tower, a gusher on entrance
    line([[-26, 38], [0, -40], [26, 38]]);
    line([[-17, 12], [17, 12]]);
    line([[-9, -14], [9, -14]]);
    line([[-17, 12], [9, -14]]);
    line([[17, 12], [-9, -14]]);
    line([[-38, 38], [38, 38]]);
    const gush = clamp((p - 0.15) / 0.35);
    if (gush > 0 && gush < 1) {
      ctx.globalAlpha *= 1 - gush;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.arc(i * 9 * gush * 2, -44 - 30 * gush + Math.abs(i) * 10 * gush, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (name === "pump") {
    // a petrol pump with its hose
    rrect(ctx, -30, -36, 40, 74, 6);
    ctx.stroke();
    rrect(ctx, -22, -26, 24, 18, 3);
    ctx.fill();
    line([[-38, 38], [18, 38]]);
    ctx.beginPath();
    ctx.moveTo(10, -18);
    ctx.quadraticCurveTo(34, -18, 32, 6);
    ctx.lineTo(32, 18);
    ctx.stroke();
    line([[28, 18], [40, 18]]);
  } else if (name === "strait") {
    // two coasts closing on a narrow channel, a tanker, a cross over it
    ctx.beginPath();
    ctx.moveTo(-46, -34);
    ctx.quadraticCurveTo(-4, -26, 2, -6);
    ctx.quadraticCurveTo(10, -26, 46, -30);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-46, 34);
    ctx.quadraticCurveTo(-8, 26, -2, 8);
    ctx.quadraticCurveTo(6, 28, 46, 30);
    ctx.stroke();
    ctx.lineWidth = 4;
    rrect(ctx, -16, -4, 30, 9, 3);
    ctx.fill();
    const cross = clamp((p - 0.25) / 0.2);
    if (cross > 0) {
      ctx.lineWidth = 7;
      const L = 30 * cross;
      line([[-L, -L], [L, L]]);
      line([[L, -L], [-L, L]]);
    }
  } else if (name === "tank") {
    // a storage tank with a valve, its level dropping as stock is released
    ctx.beginPath();
    ctx.ellipse(0, -24, 34, 9, 0, 0, Math.PI * 2);
    ctx.stroke();
    line([[-34, -24], [-34, 30]]);
    line([[34, -24], [34, 30]]);
    ctx.beginPath();
    ctx.ellipse(0, 30, 34, 9, 0, 0, Math.PI);
    ctx.stroke();
    const lvl = -6 + 22 * clamp((p - 0.2) / 0.6);
    ctx.globalAlpha *= 0.55;
    ctx.fillRect(-30, lvl, 60, 34 - lvl);
    ctx.globalAlpha /= 0.55;
    line([[34, 18], [46, 18]]);
    line([[46, 12], [46, 24]]);
  } else if (name === "flame") {
    // a fire: two tongues that flicker
    const f = 1 + 0.08 * Math.sin(p * 40);
    ctx.save();
    ctx.scale(1, f);
    ctx.beginPath();
    ctx.moveTo(0, 38);
    ctx.bezierCurveTo(-40, 30, -30, -8, -6, -42);
    ctx.bezierCurveTo(-6, -18, 10, -16, 12, -30);
    ctx.bezierCurveTo(34, -6, 36, 30, 0, 38);
    ctx.closePath();
    ctx.stroke();
    ctx.globalAlpha *= 0.6;
    ctx.beginPath();
    ctx.moveTo(0, 32);
    ctx.bezierCurveTo(-16, 28, -14, 6, -2, -8);
    ctx.bezierCurveTo(2, 4, 8, 6, 10, 0);
    ctx.bezierCurveTo(18, 14, 14, 30, 0, 32);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (name === "pumpjack") {
    // a nodding pumpjack
    const ang = 0.22 * Math.sin(p * 9);
    line([[-40, 36], [42, 36]]);
    line([[-12, 34], [0, -14], [12, 34]]);
    ctx.save();
    ctx.translate(0, -14);
    ctx.rotate(ang);
    line([[-38, 0], [26, 0]]);
    ctx.beginPath();
    ctx.moveTo(24, -6);
    ctx.quadraticCurveTo(40, -2, 38, 18);
    ctx.stroke();
    ctx.restore();
    line([[-34, -14 - 34 * Math.sin(ang)], [-30, 20]]);
    ctx.beginPath();
    ctx.arc(-30, 20, 8, 0, Math.PI * 2);
    ctx.fill();
    line([[36, 6], [36, 34]]);
  } else if (name === "tanker") {
    // an oil tanker on the water
    ctx.beginPath();
    ctx.moveTo(-46, 4);
    ctx.lineTo(46, 4);
    ctx.lineTo(36, 22);
    ctx.lineTo(-40, 22);
    ctx.closePath();
    ctx.stroke();
    rrect(ctx, -40, -14, 18, 18, 3);
    ctx.stroke();
    line([[-34, -14], [-34, -26]]);
    for (const x of [-12, 6, 24]) {
      ctx.beginPath();
      ctx.arc(x, 0, 5, Math.PI, 0);
      ctx.stroke();
    }
    ctx.lineWidth = 3;
    const w = Math.sin(p * 8) * 3;
    line([[-46, 32 + w], [-24, 30 - w], [0, 32 + w], [24, 30 - w], [46, 32 + w]]);
  } else if (name === "refinery") {
    // a refinery: two columns, a tank, a flare
    line([[-44, 36], [44, 36]]);
    rrect(ctx, -34, -30, 14, 66, 4);
    ctx.stroke();
    rrect(ctx, -12, -14, 14, 50, 4);
    ctx.stroke();
    rrect(ctx, 12, 8, 28, 28, 4);
    ctx.stroke();
    line([[-27, -30], [-27, -40]]);
    const fl = 1 + 0.25 * Math.sin(p * 30);
    ctx.beginPath();
    ctx.moveTo(-27, -40);
    ctx.quadraticCurveTo(-36, -50 * fl, -27, -58 * fl);
    ctx.quadraticCurveTo(-18, -50 * fl, -27, -40);
    ctx.fill();
  } else if (name === "barrel") {
    // a steel oil drum
    rrect(ctx, -26, -34, 52, 70, 8);
    ctx.stroke();
    line([[-26, -12], [26, -12]]);
    line([[-26, 12], [26, 12]]);
    ctx.beginPath();
    ctx.arc(10, -26, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.quadraticCurveTo(0, -10, 8, 0);
    ctx.quadraticCurveTo(0, 8, -8, 0);
    ctx.stroke();
  } else if (name === "pipeline") {
    // a pipeline with a valve wheel
    line([[-48, 8], [-10, 8]]);
    line([[-48, 24], [-10, 24]]);
    line([[10, 8], [48, 8]]);
    line([[10, 24], [48, 24]]);
    rrect(ctx, -12, 0, 24, 32, 4);
    ctx.stroke();
    line([[0, 0], [0, -16]]);
    const spin = p * 6;
    ctx.save();
    ctx.translate(0, -24);
    ctx.rotate(spin);
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.stroke();
    line([[-13, 0], [13, 0]]);
    line([[0, -13], [0, 13]]);
    ctx.restore();
  }
  ctx.restore();
};

// =====================================================================================================================
export const createFilm5 = (S: Spec) => {
  const tr = (s: string) => S.i18n?.[s] ?? s;
  const EN = !!S.en;
  const MON = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
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
  const kindAt = (y: number): Pt["kind"] => (y < 1946 ? "a" : y < 2000.64 ? "m" : "d");
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
  type Cam = { c: number; cx: number; ppy: number; hxw: number; lo: number; hi: number; top: number; bot: number; lg: number; sp: number; lgCold: number; cw: number; ca: number; span: number; gw: number; gi: number };
  // the pull-backs: after a big crash has been told, the camera backs out to decades (linear dollars), the drop marked
  const GT = 650;
  const GB = 1170;
  const GX0 = 70;
  const GX1 = SAFE_R - 50;
  const WIDES = WIDE.map((w) => {
    const e = EV.reduce((b, x) => (Math.abs(x.y - w.y) < Math.abs(b.y - w.y) ? x : b), EV[0]);
    const nx = EV[e.i + 1];
    const ws = WIDE_AT[WIDE.indexOf(w)];
    const xr = nx ? nx.y : e.y;
    const x1 = xr + 0.035 * (xr - w.from);
    let lo = 0;
    let hi = 0;
    for (const p of SER) {
      if (p.y < w.from || p.y > xr) continue;
      lo = Math.min(lo, p.v);
      hi = Math.max(hi, p.v);
    }
    // the high it fell from: the top of the series near w.a
    let ay = w.a ?? 0;
    if (w.a !== undefined) for (const p of SER) if (Math.abs(p.y - w.a) < 0.1 && p.v > val(ay)) ay = p.y;
    let by = e.y;
    for (const p of SER) if (Math.abs(p.y - e.y) < 0.1 && p.v < val(by)) by = p.y;
    const refs = (w.ref ?? []).map((r) => {
      let ry = r;
      for (const p of SER) if (Math.abs(p.y - r) < 0.03 && p.v > val(ry)) ry = p.y;
      return ry;
    });
    return { ...w, e, ws, we: e.t1, x0: w.from, x1, lo: lo < 0 ? lo * 1.25 : 0, hi: hi * 1.1, ay, by, refs };
  });
  const CWX0 = 70;
  const CWX1 = SAFE_R - 56;
  const CWT = 690;
  const CWB = 1250;
  const L0 = Math.log10(S.log[0]);
  const L1 = Math.log10(S.log[1]);
  const X = (k: Cam, y: number) => {
    let xb = k.hxw - (k.cx - y) * k.ppy;
    if (k.gw > 0) {
      const w = WIDES[k.gi];
      const xg = GX0 + ((y - w.x0) / (w.x1 - w.x0)) * (GX1 - GX0);
      xb = xb + (xg - xb) * ease(k.gw);
    }
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
    if (k.gw > 0) {
      const w = WIDES[k.gi];
      const yg = GB - ((v - w.lo) / (w.hi - w.lo)) * (GB - GT);
      yl = yl + (yg - yl) * ease(k.gw);
    }
    if (k.lg > 0) {
      const top = k.lgCold ? 660 : 640;
      const bot = k.lgCold ? 1000 : 1255;
      const yg = bot - ((Math.log10(Math.max(v, S.log[0])) - L0) / (L1 - L0)) * (bot - top);
      yl = yl + (yg - yl) * ease(k.lg);
    }
    if (k.cw > 0) {
      const yc = CWB - ((v - COLD5.vmin) / (COLD5.vmax - COLD5.vmin)) * (CWB - CWT);
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
    let gw = 0;
    let gi = 0;
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
      const kk = c < 1946 ? 1.0 : clamp(0.035 + 0.03 * span, 0.05, 0.45);
      const r = Math.max(mx - mn, mx * kk);
      const tlo = mn < 0 ? mn - 0.3 * r : Math.max(0, mn - 0.3 * r);
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
      const wi = WIDES.findIndex((w) => t >= w.ws && t < w.we);
      if (wi >= 0) gi = wi;
      gw += ((wi >= 0 ? 1 : 0) - gw) * (wi >= 0 ? 0.2 : 0.17);
      if (wi < 0 && gw < 0.003) gw = 0;
      const ca = (t >= B0 && t < END && lgK < 0.05 && c > 2000.7 ? clamp((pxd - 1.8) / 1.6) : 0) * (1 - clamp(gw * 2));
      const k: Cam = { c, cx, ppy, hxw, lo, hi, top: 610, bot: 1010, lg: lgK, sp: 0, lgCold: t < B0 ? 1 : 0, cw, ca, span, gw, gi };
      const hx = X(k, c);
      const hy = Yv(k, val(c));
      k.sp = f === 0 || (gw > 0.01 && gw < 0.99) ? 0 : Math.hypot(hx - prevX, hy - prevY) * FPS;
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
    ...COLD5.marks.map((m) => ({ t: m.at, kind: m.red ? "crash" : "mile", big: !!m.top || !!m.red, tone: m.red ? "red" : "gold", fw: !m.red })),
    ...EV.map((e) => ({ t: e.t0, kind: e.k, big: !!e.big, tone: KIND_TONE[e.k], e, fw: !!e.fx?.some((f) => f === "fw" || f === "fwBig") })),
  ];
  const MONT = (S as unknown as { montage?: typeof MONTAGE }).montage ?? MONTAGE;
  const montShake = (t: number) => {
    if (t >= RW0) return 0;
    let m = 0;
    for (const s of MONT) m = Math.max(m, 0.35 * env(t, s.at, 0.01, 0.1), (s.tone === "red" ? 1.05 : 0.7) * env(t, s.at + SHOT_BEAT, 0.01, 0.2));
    return m;
  };
  const shakeAt = (t: number) =>
    HITS.reduce((m, h) => {
      if (t < h.t - 0.05 || t > h.t + 1.5) return m;
      const sh = h.e?.fx?.includes("shatter") ? 1.2 : 0;
      const k = Math.max(sh, h.kind === "mile" ? (h.big ? 0.55 : 0.3) : h.kind === "crash" ? (h.big ? 1 : 0.6) : h.kind === "war" ? (h.big ? 0.8 : 0.4) : h.kind === "split" ? (h.big ? 0.9 : 0.5) : h.kind === "peak" || h.kind === "unite" ? (h.big ? 0.45 : 0.25) : h.kind === "turn" ? 0.2 : 0.12);
      return Math.max(m, k * env(t, h.t, 0.02, h.big ? 0.32 : 0.2));
    }, montShake(t));

  // ---------- black and white: before Nixon (the gold line keeps its colour), and the first weeks of the pandemic
  const GR = new Float32Array(NF);
  {
    let g = 0;
    for (let f = 0; f < NF; f++) {
      const t = f / FPS;
      const c = CAM[f].c;
      const target = 0 * c;
      g += (target - g) * (1 - Math.exp(-1 / FPS / (target > g ? 0.1 : 0.22)));
      GR[f] = g;
    }
  }
  const gradeAt = (t: number) => GR[clamp(Math.round(t * FPS), 0, NF - 1)];

  // ---------- the map: real coastlines (Natural Earth) under the whole lower picture, faint behind the chart, down to
  // the bottom edge. Producers glow by share of world output; the camera flies to each event's place and pins it with
  // its engraving and a name tag; price-only beats pull back to the world. Tankers sail out of the Gulf through Hormuz
  // and stop while it is shut in 2026. In the cold open an engraved oil field stands where the map will be.
  const MS = 4.4;
  const FXc = 540;
  const FYc = 1420;
  // coastlines only: no borders, no country shapes (borders are disputed; a data film has no business drawing them)
  const LJ = LAND_RAW as unknown as { world: number[][]; gulf: number[][] };
  let STIP: HTMLCanvasElement | null = null;
  const PLACE: Record<string, [number, number]> = {
    沙特: [49.5, 25.5], 伊朗: [49.5, 31.5], 伊拉克: [46.5, 31.5], 委内瑞拉: [-71.5, 10.5], 墨西哥: [-93, 19], 科威特: [47.8, 29.2],
    阿联酋: [54, 24], 加拿大: [-113, 56.5], 中国: [122, 46], 挪威: [3, 60], 英国: [1, 57.5], 罗马尼亚: [25.5, 45], 印尼: [101, 1],
    尼日利亚: [6, 5], 利比亚: [19, 29], 巴西: [-40, -22.5], 哈萨克斯坦: [53, 46], 卡塔尔: [51.3, 25.3], 阿尔及利亚: [6, 31],
    安哥拉: [12.5, -7], 特立尼达: [-61.3, 10.4], 阿根廷: [-68, -38], 哥伦比亚: [-73, 5], 埃及: [32, 28], 阿曼: [56, 21],
  };
  const ZH_OF: Record<string, string> = Object.fromEntries(Object.entries(S.i18n ?? {}).map(([k, v]) => [v, k]));
  const placeOf = (n: string, y: number): [number, number] => {
    n = ZH_OF[n] ?? n;
    if (n === "美国") {
      const k = clamp((y - 1900) / 30);
      return [-79.7 + (-98 + 79.7) * k, 41.6 + (31.5 - 41.6) * k];
    }
    if (n === "俄罗斯") {
      const k = clamp((y - 1955) / 15);
      return [49.9 + (72 - 49.9) * k, 40.4 + (61 - 40.4) * k];
    }
    return PLACE[n] ?? [0, 0];
  };
  const HORMUZ: [number, number] = [56.3, 26.6];
  const ROUTE: [number, number][] = [[48.6, 28.9], [50.6, 27.6], [52.6, 26.6], [54.6, 26.2], [55.8, 26.55], [56.55, 26.3], [57.3, 25.4], [58.8, 24.2], [61.5, 22.2], [66, 19.5], [72, 15.5]];
  const RS = 4;
  const routeLen = (() => {
    const L = [0];
    for (let q = 1; q < ROUTE.length; q++) L.push(L[q - 1] + Math.hypot(ROUTE[q][0] - ROUTE[q - 1][0], ROUTE[q][1] - ROUTE[q - 1][1]));
    return L;
  })();
  const routeAt = (u: number): [number, number, number] => {
    const d = u * routeLen[routeLen.length - 1];
    let q = 1;
    while (q < routeLen.length - 1 && routeLen[q] < d) q++;
    const k = (d - routeLen[q - 1]) / (routeLen[q] - routeLen[q - 1]);
    const ang = Math.atan2(-(ROUTE[q][1] - ROUTE[q - 1][1]), ROUTE[q][0] - ROUTE[q - 1][0]);
    return [ROUTE[q - 1][0] + (ROUTE[q][0] - ROUTE[q - 1][0]) * k, ROUTE[q - 1][1] + (ROUTE[q][1] - ROUTE[q - 1][1]) * k, ang];
  };
  const U_STRAIT = (routeLen[RS] + 0.5 * (routeLen[RS + 1] - routeLen[RS])) / routeLen[routeLen.length - 1];
  const WORLD = { lon: 12, lat: 18, z: 1 };
  const MCAM: { lon: number; lat: number; z: number }[] = [];
  {
    let cur = { ...WORLD };
    for (let f = 0; f < NF; f++) {
      const t = f / FPS;
      const e = t >= B0 && t < END ? evAt(t) : null;
      const tg = e && e.geo ? { lon: e.geo[0], lat: e.geo[1], z: e.mz ?? 3 } : WORLD;
      const dist = Math.hypot(tg.lon - cur.lon, tg.lat - cur.lat);
      const zt = dist > 25 ? Math.min(tg.z, 1.25) : tg.z;
      const k = f === 0 ? 1 : 0.07;
      cur = {
        lon: cur.lon + (tg.lon - cur.lon) * Math.min(1, k * 1.15),
        lat: cur.lat + (tg.lat - cur.lat) * Math.min(1, k * 1.15),
        z: Math.exp(Math.log(cur.z) + (Math.log(zt) - Math.log(cur.z)) * k),
      };
      MCAM.push(cur);
    }
  }
  const mcamAt = (t: number) => MCAM[clamp(Math.round(t * FPS), 0, NF - 1)];
  const mapProj = (t: number) => {
    const m = mcamAt(t);
    return (lon: number, lat: number): [number, number] => {
      const x = FXc + (lon - m.lon) * MS * m.z;
      const y = FYc + (m.lat - lat) * MS * m.z;
      const v = clamp((y - 900) / 1000);
      return [FXc + (x - FXc) * (0.84 + 0.16 * v), y];
    };
  };
  const MASK_TOP = 700;
  const MASK_BOT = 1990;
  const maskAt = (x: number, y: number) =>
    clamp((y - MASK_TOP) / 280) * (0.4 + 0.6 * clamp((y - 990) / 140)) * clamp((MASK_BOT - y) / 140) * clamp((x + 30) / 110) * clamp((1110 - x) / 110);
  const floorOn = (t: number) => (t < B0 - 0.5 ? 0 : t >= END ? 1 - clamp((t - END) / 0.5) : clamp((t - (B0 - 0.5)) / 0.5));
  const beatPulse = (t: number) => {
    let m = 0;
    for (const b of BEATS) {
      if (b.t > t) break;
      m = Math.max(m, env(t, b.t, 0.01, 0.12) * (b.down ? 1 : 0.5));
    }
    return m;
  };
  // the field's pumpjacks: engraved parts (base, walking beam, crank) put together and run by their cranks. The crank
  // turns about the gearbox hub, the pitman arm pulls the beam's tail, the beam rocks on the samson bearing, the
  // horsehead strokes the polished rod. Coordinates are in the 2048-px frame the parts were drawn in.
  const PJ = { piv: [1162, 594], tail: [586, 680], hub: [733, 1312], pinR: 200, pinA: Math.atan2(-42, -293), head: 620, tip: [1748, 866], carrier: 1040, rodX: 1760, well: 1522, ground: 1800 };
  const PJ_SPR: Record<string, [number, number, number, number]> = { base: [98, 542, 1852, 1273], beam: [530, 258, 1252, 621], crank: [270, 1044, 502, 446] };
  const pinAt = (phi: number): [number, number] => [PJ.hub[0] + PJ.pinR * Math.cos(phi), PJ.hub[1] + PJ.pinR * Math.sin(phi)];
  const PJ_L = (() => {
    const [px, py] = pinAt(PJ.pinA);
    return Math.hypot(PJ.tail[0] - px, PJ.tail[1] - py);
  })();
  const beamAngle = (phi: number) => {
    const [px, py] = pinAt(phi);
    const vx = PJ.tail[0] - PJ.piv[0];
    const vy = PJ.tail[1] - PJ.piv[1];
    const f = (th: number) => {
      const c = Math.cos(th);
      const s = Math.sin(th);
      const dx = PJ.piv[0] + vx * c - vy * s - px;
      const dy = PJ.piv[1] + vx * s + vy * c - py;
      return dx * dx + dy * dy - PJ_L * PJ_L;
    };
    let th = 0;
    for (let i = 0; i < 10; i++) {
      const f0 = f(th);
      const d = (f(th + 1e-4) - f0) / 1e-4;
      if (!d) break;
      th = clamp(th - f0 / d, -0.7, 0.7);
    }
    return th;
  };
  const BAR_S = 4 * BEAT_S;
  // where the generator had drawn them (field image pixels, 2304 wide), all facing left; back to front
  const RIGS = [
    { x: 132, y: 1065, s: 0.075, per: BAR_S * 1.3, ph: 0.35 },
    { x: 2003, y: 1150, s: 0.193, per: BAR_S * 1.15, ph: 0.7 },
    { x: 822, y: 1195, s: 0.252, per: BAR_S, ph: 0.5 },
    { x: 1283, y: 1505, s: 0.566, per: BAR_S, ph: 0 },
  ];
  const rodLine = (ctx: CanvasRenderingContext2D, a: number[], b: number[], w: number) => {
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.strokeStyle = "#140d05";
    ctx.lineWidth = w + 9;
    ctx.stroke();
    ctx.strokeStyle = "#c98f3e";
    ctx.lineWidth = w;
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,232,180,0.85)";
    ctx.lineWidth = Math.max(2, w * 0.24);
    ctx.stroke();
  };
  const boss = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
    ctx.fillStyle = "#140d05";
    ctx.beginPath();
    ctx.arc(x, y, r + 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e0a95a";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3a2510";
    ctx.beginPath();
    ctx.arc(x, y, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  };
  const drawRig = (ctx: CanvasRenderingContext2D, r: (typeof RIGS)[number], t: number) => {
    const ib = IMGS["art/pj_base.png"];
    const ik = IMGS["art/pj_crank.png"];
    const im = IMGS["art/pj_beam.png"];
    if (!ib || !ik || !im) return;
    // a turn of the crank per bar on the big ones: the horsehead bottoms out on the downbeat
    const phi = -Math.PI / 2 + 2 * Math.PI * ((t - 0.05) / r.per + r.ph);
    const th = beamAngle(phi);
    const c = Math.cos(th);
    const s = Math.sin(th);
    const rot = (p: number[]) => [PJ.piv[0] + (p[0] - PJ.piv[0]) * c - (p[1] - PJ.piv[1]) * s, PJ.piv[1] + (p[0] - PJ.piv[0]) * s + (p[1] - PJ.piv[1]) * c];
    const spr = (img: HTMLImageElement, b: [number, number, number, number]) => ctx.drawImage(img, b[0], b[1], b[2], b[3]);
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.scale(-r.s, r.s);
    ctx.translate(-PJ.rodX, -PJ.ground);
    spr(ib, PJ_SPR.base);
    // the crank and its counterweight
    ctx.save();
    ctx.translate(PJ.hub[0], PJ.hub[1]);
    ctx.rotate(phi - PJ.pinA);
    ctx.translate(-PJ.hub[0], -PJ.hub[1]);
    spr(ik, PJ_SPR.crank);
    ctx.restore();
    const pin = pinAt(phi);
    const tail = rot(PJ.tail);
    rodLine(ctx, pin, tail, 18);
    boss(ctx, pin[0], pin[1], 15);
    // the walking beam on its bearing
    ctx.save();
    ctx.translate(PJ.piv[0], PJ.piv[1]);
    ctx.rotate(th);
    ctx.translate(-PJ.piv[0], -PJ.piv[1]);
    spr(im, PJ_SPR.beam);
    ctx.restore();
    boss(ctx, tail[0], tail[1], 13);
    // the bridle off the horsehead, the carrier bar, the polished rod into the wellhead
    const tip = rot(PJ.tip);
    const cy = PJ.carrier + PJ.head * s;
    ctx.lineCap = "round";
    for (const o of [-7, 7]) {
      ctx.strokeStyle = "#140d05";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(tip[0] + o, tip[1]);
      ctx.lineTo(PJ.rodX + o, cy);
      ctx.stroke();
      ctx.strokeStyle = "#e3b064";
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    ctx.fillStyle = "#140d05";
    ctx.fillRect(PJ.rodX - 34, cy - 4, 68, 22);
    ctx.fillStyle = "#d39b4b";
    ctx.fillRect(PJ.rodX - 30, cy, 60, 14);
    rodLine(ctx, [PJ.rodX, cy + 14], [PJ.rodX, PJ.well], 9);
    ctx.restore();
  };
  // gold motes drifting up over the field
  const motes = (ctx: CanvasRenderingContext2D, t: number, x0: number, x1: number, y0: number, y1: number, a: number) => {
    const r = rng(4242);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 46; i++) {
      const sp = 18 + 40 * r();
      const ph = r();
      const x = x0 + (x1 - x0) * r() + 14 * Math.sin(t * (0.6 + r()) + i);
      const span = y1 - y0;
      const y = y1 - ((((t * sp) / span + ph) % 1) * span);
      const tw = 0.5 + 0.5 * Math.sin(t * (2 + 3 * r()) + i * 1.7);
      const sz = 1.2 + 2.4 * r();
      ctx.globalAlpha = a * tw * 0.7 * clamp((y - y0) / 120) * clamp((y1 - y) / 80);
      ctx.fillStyle = r() < 0.3 ? "#fff1c8" : "#ffb54a";
      ctx.beginPath();
      ctx.arc(x, y, sz, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };
  // the cold open's oil field (an engraving), pushing in slowly, its pumpjacks working, its horizon breathing on the beat
  const drawField = (ctx: CanvasRenderingContext2D, t: number) => {
    // the cold open, and again under the ending's whole line (smaller, lower) until the credits
    const end = t >= END;
    const CR0 = S.ending.credits?.t0 ?? S.ending.card;
    const a = end ? 0.75 * clamp((t - END - 0.3) / 0.8) * (1 - clamp((t - CR0 + 0.2) / 0.4)) : (t < RW0 ? 0.72 : 0.72 + 0.2 * clamp((t - RW0) / 0.3)) * (1 - clamp((t - (RW1 - 0.45)) / 0.45));
    const im = IMGS["art/fieldbg.png"];
    if (a <= 0.01 || !im) return;
    const s = end ? 1 + 0.04 * clamp((t - END) / (CR0 - END)) : 1 + 0.06 * clamp(t / RW1);
    const w = (end ? 1150 : 1420) * s;
    const h = (w * im.height) / im.width;
    const HZ = end ? 1640 : t < RW0 ? 1500 : 1500 - 100 * ease(clamp((t - RW0) / 0.6));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.drawImage(im, CX - w / 2, HZ - 0.585 * h, w, h);
    ctx.save();
    ctx.translate(CX - w / 2, HZ - 0.585 * h);
    ctx.scale(w / 2304, h / 1856);
    for (const r of RIGS) drawRig(ctx, r, t);
    ctx.restore();
    motes(ctx, t, CX - w / 2, CX + w / 2, HZ - 520, HZ + 40, a);
    const p = beatPulse(t);
    const g = ctx.createLinearGradient(0, HZ - 90, 0, HZ + 40);
    g.addColorStop(0, "rgba(255,170,70,0)");
    g.addColorStop(0.7, `rgba(255,170,70,${0.1 + 0.12 * p})`);
    g.addColorStop(1, "rgba(255,170,70,0)");
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = g;
    ctx.fillRect(FULL[0], HZ - 90, FULL[2], 130);
    ctx.restore();
  };
  let MBUF: HTMLCanvasElement | null = null;
  const drawLand = (t: number, a: number) => {
    if (!MBUF) {
      MBUF = document.createElement("canvas");
      MBUF.width = W;
      MBUF.height = H;
    }
    const m = mcamAt(t);
    const P = mapProj(t);
    const g = MBUF.getContext("2d")!;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, W, H);
    g.setTransform(LS, 0, 0, LS, LX, LY);
    // graticule
    g.strokeStyle = "rgba(255,230,190,0.06)";
    g.lineWidth = 1;
    for (let lon = -180; lon <= 180; lon += 15) {
      g.beginPath();
      for (let lat = -60; lat <= 80; lat += 5) {
        const [x, y] = P(lon, lat);
        if (lat === -60) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }
    for (let lat = -60; lat <= 80; lat += 15) {
      g.beginPath();
      for (let lon = -180; lon <= 180; lon += 5) {
        const [x, y] = P(lon, lat);
        if (lon === -180) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }
    const rings = m.z > 4.2 && Math.abs(m.lon - 56) < 22 && Math.abs(m.lat - 27) < 14 ? LJ.gulf : LJ.world;
    const ringPath = (rs: number[][], path = new Path2D()) => {
      for (const r of rs) {
        for (let q = 0; q < r.length; q += 2) {
          const [x, y] = P(r[q], r[q + 1]);
          if (q === 0) path.moveTo(x, y);
          else path.lineTo(x, y);
        }
        path.closePath();
      }
      return path;
    };
    const path = ringPath(rings);
    const [ox, oy] = P(0, 0);
    // the sea: deep petrol blue under the graticule, engraved with level wave lines that ride with the map
    g.globalCompositeOperation = "destination-over";
    const sea = g.createLinearGradient(0, 800, 0, 1950);
    sea.addColorStop(0, "#0f2d3c");
    sea.addColorStop(1, "#0a1c26");
    g.fillStyle = sea;
    g.fillRect(...FULL);
    g.globalCompositeOperation = "source-over";
    const SP = 10;
    g.strokeStyle = "rgba(150,210,230,0.13)";
    g.lineWidth = 1.2;
    for (let y = 640 + (((oy % SP) + SP) % SP); y < 2000; y += SP) {
      const li = Math.round((y - oy) / SP);
      g.beginPath();
      for (let x = FULL[0]; x <= FULL[0] + FULL[2]; x += 18) {
        const yy = y + 1.6 * Math.sin((x - ox) * 0.045 + li * 1.7 + t * 0.9);
        if (x === FULL[0]) g.moveTo(x, yy);
        else g.lineTo(x, yy);
      }
      g.stroke();
    }
    // water lines along every coast, the way old charts drew them; calm water inside the nearest
    g.lineJoin = "round";
    for (const [wd, al] of [[24, 0.08], [15, 0.13], [7.5, 0.2]] as const) {
      g.strokeStyle = `rgba(160,210,225,${al})`;
      g.lineWidth = wd * 2;
      g.stroke(path);
      g.strokeStyle = sea;
      g.lineWidth = wd * 2 - 2.2;
      g.stroke(path);
    }
    // the land: warm bronze with an engraved stipple that rides with the map
    const fill = g.createLinearGradient(0, 900, 0, 1900);
    fill.addColorStop(0, "#56432a");
    fill.addColorStop(1, "#34281a");
    g.fillStyle = fill;
    g.fill(path);
    if (!STIP) {
      STIP = document.createElement("canvas");
      STIP.width = 120;
      STIP.height = 120;
      const sc = STIP.getContext("2d")!;
      const r = rng(77);
      for (let i = 0; i < 420; i++) {
        sc.fillStyle = r() < 0.5 ? "rgba(255,214,150,0.16)" : "rgba(0,0,0,0.22)";
        sc.fillRect(r() * 120, r() * 120, 1.4, 1.4);
      }
      sc.strokeStyle = "rgba(255,214,150,0.06)";
      for (let i = -120; i < 120; i += 6) {
        sc.beginPath();
        sc.moveTo(i, 120);
        sc.lineTo(i + 120, 0);
        sc.stroke();
      }
    }
    const pat = g.createPattern(STIP, "repeat")!;
    pat.setTransform(new DOMMatrix().translateSelf(ox, oy));
    g.fillStyle = pat;
    g.fill(path);
    // the coast: a gold line with a glow
    g.strokeStyle = "rgba(255,214,140,0.8)";
    g.lineWidth = 1.3 + 0.25 * Math.sqrt(m.z);
    g.shadowColor = "rgba(255,180,80,0.7)";
    g.shadowBlur = 7;
    g.stroke(path);
    g.shadowBlur = 0;
    // fade: faint behind the chart, full below it, soft at every edge
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "destination-in";
    const vy = (y: number) => LY + LS * y;
    const mv = g.createLinearGradient(0, vy(MASK_TOP), 0, vy(MASK_BOT));
    const span = MASK_BOT - MASK_TOP;
    const st = (y: number, v: number) => mv.addColorStop(clamp((y - MASK_TOP) / span), `rgba(0,0,0,${v})`);
    st(MASK_TOP, 0);
    st(MASK_TOP + 200, 0.36);
    st(990, 0.42);
    st(1130, 1);
    st(MASK_BOT - 140, 1);
    st(MASK_BOT, 0);
    g.fillStyle = mv;
    g.fillRect(0, 0, W, H);
    const mh = g.createLinearGradient(0, 0, W, 0);
    mh.addColorStop(0, "rgba(0,0,0,0)");
    mh.addColorStop(0.08, "rgba(0,0,0,1)");
    mh.addColorStop(0.92, "rgba(0,0,0,1)");
    mh.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = mh;
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = "source-over";
    return a;
  };
  // a name tag: dark glass with a gold edge
  const tag = (ctx: CanvasRenderingContext2D, s: string, x: number, y: number, right: boolean, a: number, col: string) => {
    ctx.font = `900 30px ${SERIF}`;
    const w = ctx.measureText(s).width + 36;
    const x0 = right ? x : x - w;
    ctx.globalAlpha = a;
    ctx.fillStyle = "rgba(12,10,8,0.82)";
    rrect(ctx, x0, y - 30, w, 46, 10);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;
    rrect(ctx, x0, y - 30, w, 46, 10);
    ctx.stroke();
    text(ctx, s, x0 + 18, y + 2, 30, 900, SERIF, WHITE);
  };
  const drawFloor = (ctx: CanvasRenderingContext2D, t: number) => {
    drawField(ctx, t);
    const a = floorOn(t) * (1 - 0.55 * ease(camAt(t).gw));
    if (a <= 0.01) return;
    const c = camAt(t).c;
    const P = mapProj(t);
    const m = mcamAt(t);
    const z = m.z;
    drawLand(t, a);
    ctx.save();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = a;
    ctx.drawImage(MBUF!, 0, 0);
    ctx.restore();
    // producers glow by share of world output
    const rows = S.table ? S.table(c).filter((r) => r.v > 0.6).sort((p, q) => q.v - p.v) : [];
    ctx.globalCompositeOperation = "lighter";
    rows.forEach((r) => {
      const [x, y] = P(...placeOf(r.n, c));
      const mk = maskAt(x, y);
      if (mk <= 0.01) return;
      const R = (10 + 34 * Math.sqrt(r.v / 60)) * (0.75 + 0.25 * Math.sqrt(z)) * (1 + 0.25 * beatPulse(t));
      const gl = ctx.createRadialGradient(x, y, 0, x, y, R);
      gl.addColorStop(0, "#fff0c8cc");
      gl.addColorStop(0.35, r.c + "66");
      gl.addColorStop(1, r.c + "00");
      ctx.globalAlpha = a * mk * (z > 2 ? 0.5 : 0.9);
      ctx.fillStyle = gl;
      ctx.fillRect(x - R, y - R, 2 * R, 2 * R);
      ctx.fillStyle = "#fff6e0";
      ctx.globalAlpha = a * mk * 0.85;
      ctx.beginPath();
      ctx.arc(x, y, 2.5 + 4 * Math.sqrt(r.v / 60), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalCompositeOperation = "source-over";
    const wz = clamp((1.7 - z) / 0.5);
    if (wz > 0.01)
      rows.slice(0, 3).forEach((r, i) => {
        const [x, y] = P(...placeOf(r.n, c));
        ctx.globalAlpha = a * wz * maskAt(x, y);
        text(ctx, tr(r.n), x + 14, y - 14, i === 0 ? 28 : 24, 900, SERIF, i === 0 ? WHITE : SOFT, { glow: "rgba(0,0,0,0.95)", glowBlur: 10 });
        text(ctx, r.v.toFixed(0) + "%", x + 14, y + 14, 20, 700, SANS, r.c, { glow: "rgba(0,0,0,0.95)", glowBlur: 8 });
      });
    // tankers out of the Gulf through Hormuz (from the 1950s); stopped while the strait is shut
    const ra = clamp((c - 1950) / 8);
    if (ra > 0) {
      const closed = c >= MAPFX.closeY && c < MAPFX.openY;
      const tShut = t >= MAPFX.close && t < MAPFX.open ? t - MAPFX.close : -1;
      const te = t < MAPFX.close ? t : t < MAPFX.open ? MAPFX.close : t - (MAPFX.open - MAPFX.close);
      const near = clamp((z - 2) / 2);
      ctx.globalAlpha = a * ra * (0.25 + 0.45 * near);
      ctx.strokeStyle = closed ? "rgba(255,90,70,0.85)" : "rgba(255,214,140,0.75)";
      ctx.lineWidth = 1.5 + 1.5 * near;
      ctx.setLineDash([5, 7]);
      ctx.lineDashOffset = -t * 30;
      ctx.beginPath();
      ROUTE.forEach((p, i) => {
        const [x, y] = P(p[0], p[1]);
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
      const NT = 10;
      for (let q = 0; q < NT; q++) {
        let u = (((te * 0.06 + q / NT) % 1) + 1) % 1;
        let al = 1;
        if (tShut >= 0 && u > U_STRAIT) {
          u = Math.min(1, u + tShut * 0.06);
          al = 1 - clamp((u - U_STRAIT) / (1 - U_STRAIT) + tShut * 0.4);
        }
        const [lo, la, ang] = routeAt(u);
        const [x, y] = P(lo, la);
        const L = 8 + 12 * near;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang);
        ctx.globalAlpha = a * ra * al * maskAt(x, y);
        ctx.fillStyle = closed ? RED : "#ffd98a";
        ctx.shadowColor = closed ? RED : "#ffb347";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(L, 0);
        ctx.lineTo(L * 0.55, -L * 0.22);
        ctx.lineTo(-L, -L * 0.22);
        ctx.lineTo(-L, L * 0.22);
        ctx.lineTo(L * 0.55, L * 0.22);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      const [hx, hy] = P(...HORMUZ);
      const hz = near * clamp(1 - Math.hypot(m.lon - HORMUZ[0], m.lat - HORMUZ[1]) / 20);
      if (hz > 0.05) {
        ctx.globalAlpha = a * hz;
        text(ctx, tr("最窄处约 33 公里"), hx + 34, hy + 52, 22, 700, SERIF, SOFT, { glow: "rgba(0,0,0,0.95)", glowBlur: 8 });
        const [px, py] = P(51, 27.6);
        text(ctx, tr("波斯湾"), px, py + 6, 24, 700, SERIF, MUTED, { align: "center", glow: "rgba(0,0,0,0.9)", glowBlur: 6 });
        const [ox, oy] = P(61, 23.6);
        text(ctx, tr("阿拉伯海"), ox, oy + 30, 22, 700, SERIF, MUTED, { align: "center", glow: "rgba(0,0,0,0.9)", glowBlur: 6 });
      }
      if (closed) {
        const d = t - MAPFX.close;
        const s = 1 + 0.8 * (1 - eo3(d / 0.18));
        const L = (12 + 3.5 * z) * s;
        ctx.globalAlpha = a * clamp(d / 0.05) * (0.8 + 0.2 * Math.sin(t * 10));
        ctx.strokeStyle = RED;
        ctx.lineWidth = 5 + z;
        ctx.shadowColor = RED;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(hx - L, hy - L);
        ctx.lineTo(hx + L, hy + L);
        ctx.moveTo(hx + L, hy - L);
        ctx.lineTo(hx - L, hy + L);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }
    // the event's pin: rings where it happened, its engraving on a stem, a name tag
    const e = evAt(t);
    if (e && e.geo && e.anim) {
      ctx.save();
      const [ax, ay] = P(e.geo[0], e.geo[1]);
      drawAnims(ctx, e, t, ax, ay, a);
      ctx.restore();
    }
    if (e && e.geo && !e.anim?.includes("drill")) {
      const [x, y] = P(e.geo[0], e.geo[1]);
      const col = toneCol(KIND_TONE[e.k]);
      const d = t - e.t0;
      for (const k0 of [0, 0.5, 1.0]) {
        const u = (d - k0) / 1.0;
        if (u < 0 || u > 1) continue;
        ctx.globalAlpha = a * (1 - u) * 0.9;
        ctx.strokeStyle = col;
        ctx.lineWidth = 2.5;
        const R = 8 + 70 * eo3(u);
        ctx.beginPath();
        ctx.ellipse(x, y, R, R * 0.5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      const up = 96 * eo3(d / 0.28);
      const sg = ctx.createLinearGradient(x, y, x, y - up);
      sg.addColorStop(0, col);
      sg.addColorStop(1, col + "00");
      ctx.globalAlpha = a;
      ctx.strokeStyle = sg;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - up);
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.ellipse(x, y, 8, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      if (e.pic) {
        ctx.save();
        ctx.globalAlpha = a;
        drawIcon(ctx, e.pic, x, y - up - 30, 0.82, (t - e.t0) / 0.6, col, tr("关税"));
        ctx.restore();
      }
      if (e.place && d > 0.15) {
        const right = x < 700;
        ctx.save();
        tag(ctx, e.place, x + (right ? 62 : -62), y - up - 26, right, a * clamp((d - 0.15) / 0.12), col);
        ctx.restore();
      }
    }
    ctx.restore();
  };

  // ---------- what happens at the pin, so each kind of event is seen, not just read
  // fire: flame tongues (layered, flickering, additive) over a dark smoke column drifting with the wind
  const flames = (ctx: CanvasRenderingContext2D, x: number, y: number, sc: number, t: number, seed: number, n: number, a: number) => {
    const r = rng(seed);
    ctx.save();
    // smoke first, behind the fire
    for (let i = 0; i < 16; i++) {
      const life = 2.2 + r();
      const u = ((t + r() * life) % life) / life;
      const px = x + (r() - 0.5) * 46 * sc + u * 90 * sc;
      const py = y - 18 * sc - u * 230 * sc;
      const rad = (12 + 46 * u) * sc;
      const al = a * 0.6 * (1 - u) * Math.min(1, u * 6);
      const g = ctx.createRadialGradient(px, py, 0, px, py, rad);
      g.addColorStop(0, `rgba(24,18,12,${al})`);
      g.addColorStop(0.7, `rgba(40,30,20,${al * 0.6})`);
      g.addColorStop(1, "rgba(40,30,20,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "lighter";
    const COLS = [["rgba(255,80,20,0.7)", "rgba(255,50,10,0)"], ["rgba(255,160,40,0.8)", "rgba(255,120,20,0)"], ["rgba(255,240,190,0.9)", "rgba(255,210,120,0)"]];
    for (let i = 0; i < n; i++) {
      const ox = (r() - 0.5) * 70 * sc;
      const ph = r() * 10;
      const hh = (34 + 34 * r()) * sc;
      for (let q = 0; q < 3; q++) {
        const fl = 1 + 0.28 * Math.sin(t * (13 + 5 * r()) + ph + q * 1.3) + 0.12 * Math.sin(t * 31 + ph);
        const h = hh * fl * (1 - q * 0.3);
        const w = h * (0.34 - q * 0.05);
        const tip = Math.sin(t * 8 + ph + q) * w * 0.4;
        const g = ctx.createLinearGradient(0, y, 0, y - h);
        g.addColorStop(0, COLS[q][0]);
        g.addColorStop(1, COLS[q][1]);
        ctx.globalAlpha = a;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x + ox - w, y);
        ctx.quadraticCurveTo(x + ox - w * 0.7, y - h * 0.55, x + ox + tip, y - h);
        ctx.quadraticCurveTo(x + ox + w * 0.7, y - h * 0.55, x + ox + w, y);
        ctx.closePath();
        ctx.fill();
      }
    }
    // a glow on the ground
    const gg = ctx.createRadialGradient(x, y, 0, x, y, 90 * sc);
    gg.addColorStop(0, `rgba(255,120,40,${0.45 * a})`);
    gg.addColorStop(1, "rgba(255,120,40,0)");
    ctx.globalAlpha = 1;
    ctx.fillStyle = gg;
    ctx.fillRect(x - 90 * sc, y - 90 * sc, 180 * sc, 180 * sc);
    ctx.restore();
  };
  // air strikes: missiles arc in from the upper left with bright trails; each hit flashes, rings out, throws sparks, burns
  const bez = (a: number[], c: number[], b: number[], u: number) => [(1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * c[0] + u * u * b[0], (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * c[1] + u * u * b[1]];
  const strike = (ctx: CanvasRenderingContext2D, x: number, y: number, d: number, t: number, seed: number, a: number) => {
    const r = rng(seed);
    for (let q = 0; q < 4; q++) {
      const launch = 0.05 + q * 0.26;
      const fly = 0.42;
      const tx = x + (r() - 0.5) * 110;
      const ty = y + (r() - 0.5) * 46;
      const s0 = [tx - 420 - r() * 220, ty - 560 - r() * 160];
      const c0 = [(s0[0] + tx) / 2 + 80, Math.min(s0[1], ty) - 120];
      const u = (d - launch) / fly;
      ctx.save();
      if (u > 0 && u < 1) {
        const [hx, hy] = bez(s0, c0, [tx, ty], u);
        const [bx, by] = bez(s0, c0, [tx, ty], Math.max(0, u - 0.3));
        const g = ctx.createLinearGradient(bx, by, hx, hy);
        g.addColorStop(0, "rgba(255,230,190,0)");
        g.addColorStop(1, "rgba(255,240,210,0.95)");
        ctx.globalAlpha = a;
        ctx.strokeStyle = g;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        for (let k = 0; k <= 10; k++) {
          const [px, py] = bez(s0, c0, [tx, ty], Math.max(0, u - 0.3) + (k / 10) * Math.min(u, 0.3));
          if (k) ctx.lineTo(px, py);
          else ctx.moveTo(px, py);
        }
        ctx.stroke();
        ctx.fillStyle = "#fff6e0";
        ctx.shadowColor = "#ffb347";
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(hx, hy, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      const e = d - launch - fly;
      if (e > 0) {
        // the flash and the ring
        if (e < 0.4) {
          const R = 12 + 90 * eo3(e / 0.25);
          const g = ctx.createRadialGradient(tx, ty, 0, tx, ty, R);
          g.addColorStop(0, `rgba(255,255,240,${a * (1 - e / 0.4)})`);
          g.addColorStop(0.4, `rgba(255,170,60,${0.8 * a * (1 - e / 0.4)})`);
          g.addColorStop(1, "rgba(255,90,30,0)");
          ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = g;
          ctx.fillRect(tx - R, ty - R, 2 * R, 2 * R);
          ctx.globalCompositeOperation = "source-over";
        }
        if (e < 0.6) {
          ctx.globalAlpha = a * 0.85 * (1 - e / 0.6);
          ctx.strokeStyle = "#ffd9a0";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.ellipse(tx, ty, 16 + 150 * eo3(e / 0.6), (16 + 150 * eo3(e / 0.6)) * 0.45, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        // sparks
        const rs = rng(seed * 7 + q);
        for (let k = 0; k < 14; k++) {
          const ang = -Math.PI * rs();
          const sp = 160 + 260 * rs();
          const life = 0.5 + 0.4 * rs();
          if (e > life) continue;
          const px = tx + Math.cos(ang) * sp * e;
          const py = ty + Math.sin(ang) * sp * e + 500 * e * e;
          ctx.globalAlpha = a * (1 - e / life);
          ctx.fillStyle = rs() < 0.4 ? "#fff3d6" : "#ffb04a";
          ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
        }
        // then it burns
        if (q % 2 === 0) flames(ctx, tx, ty + 4, 0.55, t, seed + q * 13, 2, a * clamp((e - 0.1) / 0.25));
      }
      ctx.restore();
    }
  };
  // a pipeline with a valve wheel under the pin: the flow slows and stops as the wheel turns shut (a cut), or starts (a release)
  const valve = (ctx: CanvasRenderingContext2D, x: number, y: number, d: number, t: number, open: boolean, a: number) => {
    const k = eo3(clamp((d - 0.15) / 0.7));
    const flow = open ? k : 1 - k;
    // how far the oil has moved: the flow integrated over the event (so it slows, not slides back)
    let dist = 0;
    for (let q = 0; q < 24; q++) {
      const kk = eo3(clamp((((q + 0.5) / 24) * d - 0.15) / 0.7));
      dist += ((open ? kk : 1 - kk) * Math.max(0, d)) / 24;
    }
    const L = 170;
    const py = y + 52;
    ctx.save();
    ctx.globalAlpha = a * clamp(d / 0.15);
    for (const side of [-1, 1]) {
      const x0 = side < 0 ? x - L : x + 18;
      const x1 = side < 0 ? x - 18 : x + L;
      const g = ctx.createLinearGradient(0, py - 11, 0, py + 11);
      g.addColorStop(0, "#f2c77a");
      g.addColorStop(0.5, "#8a5b22");
      g.addColorStop(1, "#3a250d");
      ctx.fillStyle = "#120c05";
      ctx.fillRect(x0 - 2, py - 13, x1 - x0 + 4, 26);
      ctx.fillStyle = g;
      ctx.fillRect(x0, py - 11, x1 - x0, 22);
      // the oil inside, moving left to right
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, py - 5, x1 - x0, 10);
      ctx.clip();
      ctx.fillStyle = "rgba(20,12,4,0.9)";
      ctx.fillRect(x0, py - 5, x1 - x0, 10);
      ctx.fillStyle = `rgba(255,190,90,${0.25 + 0.6 * flow})`;
      for (let xx = x0 - 26 + ((dist * 150) % 26); xx < x1; xx += 26) ctx.fillRect(xx, py - 2, 12, 4);
      ctx.restore();
      // flanges
      ctx.fillStyle = "#d9a656";
      for (const fx of [x0, x1 - 6]) ctx.fillRect(fx, py - 15, 6, 30);
    }
    // the valve body and its wheel, turning while it shuts (or opens)
    ctx.fillStyle = "#120c05";
    ctx.fillRect(x - 20, py - 18, 40, 36);
    ctx.fillStyle = "#c48d44";
    ctx.fillRect(x - 17, py - 15, 34, 30);
    ctx.strokeStyle = "#e8b665";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, py - 15);
    ctx.lineTo(x, py - 34);
    ctx.stroke();
    ctx.save();
    ctx.translate(x, py - 44);
    ctx.rotate(k * Math.PI * 3 * (open ? -1 : 1));
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, Math.PI * 2);
    ctx.stroke();
    for (let q = 0; q < 3; q++) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(-17, 0);
      ctx.lineTo(17, 0);
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  };
  // shale: a cross-section above the pin. Drill down, turn, drill along the shale, crack it open, the oil comes back up
  const drillPanel = (ctx: CanvasRenderingContext2D, d: number, a: number, place: string) => {
    const PW = 760;
    const PH = 290;
    const px = CX - PW / 2;
    const py = 1110;
    const al = a * clamp(d / 0.15);
    if (al <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = al;
    ctx.fillStyle = "rgba(10,8,6,0.88)";
    rrect(ctx, px, py, PW, PH, 14);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,201,77,0.75)";
    ctx.lineWidth = 2;
    rrect(ctx, px, py, PW, PH, 14);
    ctx.stroke();
    ctx.save();
    rrect(ctx, px, py, PW, PH, 14);
    ctx.clip();
    const G = py + 52;
    // strata: sand (stipple), rock (hatching), shale (dark, fine lines)
    const r = rng(5);
    ctx.fillStyle = "rgba(120,90,50,0.35)";
    ctx.fillRect(px, G, PW, 70);
    ctx.fillStyle = "rgba(255,210,140,0.35)";
    for (let i = 0; i < 260; i++) ctx.fillRect(px + r() * PW, G + 4 + r() * 62, 1.6, 1.6);
    ctx.fillStyle = "rgba(90,70,45,0.4)";
    ctx.fillRect(px, G + 70, PW, 80);
    ctx.strokeStyle = "rgba(255,210,140,0.16)";
    ctx.lineWidth = 1;
    for (let xx = -80; xx < PW; xx += 12) {
      ctx.beginPath();
      ctx.moveTo(px + xx, G + 150);
      ctx.lineTo(px + xx + 80, G + 70);
      ctx.stroke();
    }
    const S0 = G + 150;
    ctx.fillStyle = "rgba(30,24,18,0.95)";
    ctx.fillRect(px, S0, PW, 70);
    ctx.strokeStyle = "rgba(200,180,150,0.14)";
    for (let yy = S0 + 8; yy < S0 + 70; yy += 9) {
      ctx.beginPath();
      ctx.moveTo(px, yy);
      ctx.lineTo(px + PW, yy);
      ctx.stroke();
    }
    ctx.restore();
    // the surface and a rig
    ctx.strokeStyle = "rgba(255,214,140,0.85)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, G);
    ctx.lineTo(px + PW, G);
    ctx.stroke();
    const WX = px + 120;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(WX - 18, G);
    ctx.lineTo(WX, G - 40);
    ctx.lineTo(WX + 18, G);
    ctx.moveTo(WX - 11, G - 14);
    ctx.lineTo(WX + 11, G - 14);
    ctx.stroke();
    // the well: down, a bend, along the shale
    const SY = S0 + 35;
    const RB = 34;
    const vEnd = SY - RB;
    const hLen = PW - 120 - 60 - RB;
    const L1 = vEnd - G;
    const L2 = (Math.PI / 2) * RB;
    const LT = L1 + L2 + hLen;
    const prog = eo3(clamp(d / 0.95)) * LT;
    const ptAt = (l: number): [number, number] => {
      if (l <= L1) return [WX, G + l];
      if (l <= L1 + L2) {
        const an = (l - L1) / RB;
        return [WX + RB - RB * Math.cos(an), vEnd + RB * Math.sin(an)];
      }
      return [WX + RB + (l - L1 - L2), SY];
    };
    ctx.strokeStyle = "#ffe0a0";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let l = 0; l <= prog; l += 6) {
      const [qx, qy] = ptAt(l);
      if (l) ctx.lineTo(qx, qy);
      else ctx.moveTo(qx, qy);
    }
    ctx.stroke();
    const [bx, by] = ptAt(prog);
    ctx.fillStyle = "#fff";
    ctx.shadowColor = GOLD;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(bx, by, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // the fractures, one stage after another, then the oil flowing back up the well
    const FX = [0.2, 0.38, 0.56, 0.74, 0.92].map((f) => WX + RB + f * hLen);
    FX.forEach((fx, i) => {
      const e = d - 1.0 - i * 0.1;
      if (e <= 0) return;
      const k = eo3(clamp(e / 0.25));
      ctx.strokeStyle = `rgba(255,190,90,${0.9})`;
      ctx.lineWidth = 2;
      const rr = rng(40 + i);
      for (let q = 0; q < 7; q++) {
        const up = q % 2 ? -1 : 1;
        const len = (16 + 20 * rr()) * k;
        const dx = (rr() - 0.5) * 22;
        ctx.beginPath();
        ctx.moveTo(fx, SY);
        ctx.lineTo(fx + dx * 0.5, SY + up * len * 0.5);
        ctx.lineTo(fx + dx, SY + up * len);
        ctx.stroke();
      }
      if (e < 0.2) {
        ctx.globalAlpha = al * (1 - e / 0.2);
        ctx.fillStyle = "#fff3d0";
        ctx.beginPath();
        ctx.arc(fx, SY, 10 + 20 * e, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = al;
      }
    });
    const fe = d - 1.5;
    if (fe > 0) {
      ctx.fillStyle = "#ffc94d";
      for (let q = 0; q < 14; q++) {
        const l = LT - (((fe * 260 + q * (LT / 14)) % LT) + 0);
        const [qx, qy] = ptAt(Math.max(0, l));
        ctx.beginPath();
        ctx.arc(qx, qy, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // three plain words
    const lab = (s: string, x: number, y: number, on: number) => {
      if (on <= 0) return;
      ctx.globalAlpha = al * clamp(on / 0.15);
      text(ctx, s, x, y, 28, 900, SERIF, WHITE, { glow: "rgba(0,0,0,0.95)", glowBlur: 8 });
      ctx.globalAlpha = al;
    };
    lab(tr("竖着钻"), WX + 22, G + 66, d - 0.1);
    lab(tr("拐弯，横着钻"), WX + RB + 150, SY - 22, d - 0.55);
    lab(tr("压裂"), FX[3] - 10, SY - 22, d - 1.05);
    lab(tr("油出来了"), WX + 30, G - 16, d - 1.6);
    text(ctx, place, px + PW - 18, py + 34, 24, 700, SERIF, SOFT, { align: "right" });
    ctx.restore();
  };
  const drawAnims = (ctx: CanvasRenderingContext2D, e: P5, t: number, x: number, y: number, a: number) => {
    const d = t - e.t0;
    const fade = a * clamp((e.t1 + 0.15 - t) / 0.3);
    const seed = e.i * 97 + 11;
    for (const an of e.anim ?? []) {
      if (an === "strike") strike(ctx, x, y, d, t, seed, fade);
      else if (an === "fire") {
        const r = rng(seed + 5);
        for (let q = 0; q < 3; q++) flames(ctx, x + (r() - 0.5) * 120, y + (r() - 0.5) * 30, 0.6, t, seed + q, 2, fade * clamp((d - 0.15 - q * 0.12) / 0.25));
      } else if (an === "gush") {
        gusher(ctx, t, e.t0 + 0.12, x, y - 4, seed, false, 0.6, y + 6);
        gusher(ctx, t, e.t0 + 0.12 + 2 * BEAT_S, x, y - 4, seed + 1, false, 0.5, y + 6);
      } else if (an === "valve" || an === "release") valve(ctx, x, y, d, t, an === "release", fade);
      else if (an === "drill") drillPanel(ctx, d, fade, e.place ?? "");
    }
  };

  // ---------- the cold open: the line races from 1973 to 2026 and is called out on the beat. The head lands on each
  // moment on the first beat (its engraving pops up at the point, the year comes in at the top); on the second beat
  // its word or number slams (shake, a flash, its effect at the point); then it races on to the next. Only the newest
  // moment has its label; the ones behind keep a dot and their year.
  const drawMontage = (ctx: CanvasRenderingContext2D, t: number) => {
    if (t >= RW0 + 0.02) return;
    let i = -1;
    MONT.forEach((m, q) => {
      if (t >= m.at - 1e-3) i = q;
    });
    if (i < 0) return;
    const k = camAt(t);
    const m = MONT[i];
    const d = t - m.at;
    const ds = d - SHOT_BEAT;
    const col = m.tone === "red" ? RED : GOLD;
    const fade = 1 - clamp((t - (RW0 - 0.12)) / 0.14);
    const pt = (y: number) => [X(k, y), Yv(k, val(y))];
    ctx.save();
    ctx.globalAlpha = fade;
    // the moments behind: a dot and the year
    for (let q = 0; q < i; q++) {
      const [x, y] = pt(MONT[q].y);
      const c = MONT[q].tone === "red" ? RED : GOLD;
      dotAt(ctx, x, y, c, 7);
      text(ctx, MONT[q].year, x, y + (MONT[q].tone === "red" ? 40 : -20), 24, 900, SANS, c, { align: "center", glow: "rgba(0,0,0,0.95)", glowBlur: 8 });
    }
    // the newest: its engraving at the point (above it when the point is low, below when it is high)
    const [px, py] = pt(m.y);
    const up = py > 900;
    const IS = 230;
    const iy = up ? py - IS * 0.62 : py + IS * 0.62;
    const ix = clamp(px, IS / 2 + 30, SAFE_R - IS / 2);
    const im = IMGS[`art/i_${m.pic}.png`];
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.globalAlpha = fade * 0.7 * clamp(d / 0.08);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(ix, up ? iy + IS * 0.42 : iy - IS * 0.42);
    ctx.stroke();
    if (im) {
      const s0 = 0.4 + 0.6 * eo3(d / 0.14) + 0.25 * env(t, m.at + SHOT_BEAT, 0.01, 0.12);
      ctx.save();
      ctx.translate(ix, iy);
      ctx.scale(s0, s0);
      ctx.globalAlpha = fade * clamp(d / 0.04);
      ctx.drawImage(im, -IS / 2, -IS / 2, IS, IS);
      ctx.restore();
    }
    ctx.globalAlpha = fade;
    dotAt(ctx, px, py, col, 10);
    // its effect, at the point
    if (m.anim === "fire") flames(ctx, px, py, 0.9, t, 31, 3, fade * clamp(d / 0.2));
    if ((m.anim === "fw" || m.anim === "rise") && ds > -0.2) gusher(ctx, t, m.at + SHOT_BEAT, px, py, 77 + i, m.anim === "fw", 0.75, 1500);
    if (m.anim === "drip" && ds >= 0 && ds < 0.22) {
      ctx.save();
      ctx.globalAlpha = fade * (1 - ds / 0.22);
      ctx.strokeStyle = "#f2f7ff";
      ctx.shadowColor = "#ff5a4a";
      ctx.shadowBlur = 30;
      bolt(ctx, px + 140, VY0, px, py, 404 + Math.floor(ds * 30), 7);
      ctx.restore();
    }
    if (m.anim === "x" && ds >= 0) {
      const kx = 1 + 0.6 * (1 - eo3(ds / 0.14));
      const L = 92 * kx;
      ctx.globalAlpha = fade * clamp(ds / 0.04);
      ctx.strokeStyle = RED;
      ctx.lineWidth = 14;
      ctx.lineCap = "round";
      ctx.shadowColor = RED;
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.moveTo(ix - L, iy - L);
      ctx.lineTo(ix + L, iy + L);
      ctx.moveTo(ix + L, iy - L);
      ctx.lineTo(ix - L, iy + L);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    // the year and where, at the top
    ctx.globalAlpha = fade;
    const ys = 1 + 0.4 * (1 - eo3(d / 0.12));
    ctx.save();
    ctx.translate(CX, 360);
    ctx.scale(ys, ys);
    text(ctx, m.year, 0, 0, 132, 900, SANS, WHITE, { align: "center", glow: "rgba(0,0,0,0.9)", glowBlur: 20 });
    ctx.restore();
    ctx.globalAlpha = fade * clamp((d - 0.04) / 0.08);
    text(ctx, m.tag, CX, 424, 40, 900, SERIF, SOFT, { align: "center", glow: "rgba(0,0,0,0.95)", glowBlur: 10 });
    // the slam
    if (ds >= 0) {
      const bs = 1 + 0.7 * (1 - eo3(ds / 0.13));
      ctx.save();
      ctx.translate(CX, 556);
      ctx.scale(bs, bs);
      ctx.globalAlpha = fade * clamp(ds / 0.03);
      if (m.anim === "stamp" || m.anim === "x") {
        ctx.rotate(-0.05);
        const bw = measure(ctx, m.big, 104, 900, SANS) + 70;
        ctx.strokeStyle = RED;
        ctx.lineWidth = 6;
        rrect(ctx, -bw / 2, -104, bw, 132, 10);
        ctx.stroke();
        ctx.lineWidth = 2.5;
        rrect(ctx, -bw / 2 + 10, -94, bw - 20, 112, 6);
        ctx.stroke();
      }
      text(ctx, m.big, 0, 0, 104, 900, SANS, col, { align: "center", glow: col + "99", glowBlur: 32, maxW: 960 });
      ctx.restore();
      if (m.sub && m.sub !== "1 桶") {
        ctx.globalAlpha = fade * clamp((ds - 0.08) / 0.1);
        text(ctx, m.sub, CX, 618, 36, 900, SERIF, SOFT, { align: "center", glow: "rgba(0,0,0,0.95)", glowBlur: 10 });
      }
      ctx.globalAlpha = fade * 0.32 * clamp(1 - ds / 0.12);
      ctx.fillStyle = m.tone === "red" ? "#ff5b45" : "#ffe39a";
      ctx.fillRect(...FULL);
    }
    if (d < 0.05) {
      ctx.globalAlpha = fade * 0.28 * (1 - d / 0.05);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(...FULL);
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
      if (m !== pm) lab = EN ? MON[m] : `${m} 月`;
      else if (mid && d >= 15 && pmid !== m) lab = EN ? `${MON[m]} ${d}` : `${m} 月 ${d} 日`;
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
  // the cold window's floor ($0): solid until the price breaks through it, then two halves bent down and flying chips
  const CEIL_T = COLD5.floor.at;
  const drawCeil = (ctx: CanvasRenderingContext2D, t: number, k: Cam) => {
    const y = Yv(k, COLD5.floor.v);
    const a0 = ctx.globalAlpha;
    const lab = tr("0 美元");
    if (t < CEIL_T) {
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(SAFE_R, y);
      ctx.stroke();
      text(ctx, lab, 44, y + 34, 28, 900, SANS, "rgba(255,255,255,0.8)");
      return;
    }
    const d = t - CEIL_T;
    const bx = X(k, COLD5.floor.y);
    const gap = 20 + 16 * eo3(d / 0.2);
    const kink = 0.55 * eo3(d / 0.22);
    const KL = 120;
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 4;
    ctx.lineJoin = "round";
    ctx.beginPath();
    const lx1 = bx - gap;
    ctx.moveTo(40, y);
    ctx.lineTo(Math.max(40, lx1 - KL), y);
    ctx.lineTo(Math.max(40, lx1 - KL) + KL * Math.cos(kink), y + KL * Math.sin(kink));
    const rx0 = bx + gap;
    ctx.moveTo(SAFE_R, y);
    ctx.lineTo(rx0 + KL, y);
    ctx.lineTo(rx0 + KL - KL * Math.cos(kink), y + KL * Math.sin(kink));
    ctx.stroke();
    text(ctx, lab, 44, y - 12, 28, 900, SANS, "rgba(255,255,255,0.8)");
    if (d < 1.4) {
      const r = rng(4242);
      ctx.fillStyle = "rgba(240,244,248,0.9)";
      for (let i = 0; i < 18; i++) {
        const vx = (r() - 0.5) * 560;
        const vy = -180 - r() * 420;
        const sz = 4 + r() * 8;
        const x = bx + vx * d;
        const yy = y + vy * d + 0.5 * 1800 * d * d;
        ctx.globalAlpha = a0 * clamp(1 - d / 1.4);
        ctx.save();
        ctx.translate(x, yy);
        ctx.rotate(d * (r() - 0.5) * 14);
        ctx.fillRect(-sz / 2, -sz / 4, sz, sz / 2);
        ctx.restore();
      }
      if (d < 0.25) {
        const g = ctx.createRadialGradient(bx, y, 0, bx, y, 200);
        g.addColorStop(0, `rgba(255,120,100,${0.9 * (1 - d / 0.25)})`);
        g.addColorStop(1, "rgba(255,120,100,0)");
        ctx.globalAlpha = a0;
        ctx.fillStyle = g;
        ctx.fillRect(bx - 200, y - 200, 400, 400);
      }
      ctx.globalAlpha = a0;
    }
  };
  const drawChart = (ctx: CanvasRenderingContext2D, t: number, alpha: number, lineOnly = false) => {
    if (alpha <= 0.01) return;
    const k = camAt(t);
    const c = k.c;
    const yL = k.lg > 0.01 || k.cw > 0.01 ? Math.min(FIRST, COLD5.win[0]) : k.gw > 0.01 ? Math.min(WIDES[k.gi].x0, k.cx - k.hxw / k.ppy - 2) : k.cx - k.hxw / k.ppy - 2;
    const yR = t >= END ? LAST : c;
    ctx.save();
    ctx.globalAlpha = alpha;
    const range = k.hi - k.lo;
    if (!lineOnly) {
      if (k.cw > 0.5) {
        // the cold window: round dollars and years
        ctx.globalAlpha = alpha * clamp((k.cw - 0.5) * 2);
        for (const v of [50, 100]) {
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
        for (const yy of [] as number[]) {
          const x = X(k, yy);
          ctx.fillStyle = "rgba(255,255,255,0.3)";
          ctx.fillRect(x - 0.5, CWB + 8, 1, 12);
          text(ctx, String(yy), x, CWB + 46, 22, 600, SANS, "rgba(255,255,255,0.45)", { align: "center" });
        }
        drawCeil(ctx, t, k);
        // the whole window, faint, before the line runs over it (only above the floor: the break is a surprise)
        if (t < RW0 + 0.3) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, W, Yv(k, COLD5.floor.v) - 2);
          ctx.clip();
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
          ctx.restore();
        }
        ctx.globalAlpha = alpha;
      } else if (k.gw > 0.5) {
        // the pull-back: round dollars and the decades
        const w = WIDES[k.gi];
        const ga = clamp((k.gw - 0.5) * 2);
        const raw = (w.hi - w.lo) / 4;
        const p10 = Math.pow(10, Math.floor(Math.log10(raw)));
        const step = [1, 2, 2.5, 5, 10].map((m) => m * p10).find((q) => q >= raw) ?? raw;
        for (let v = Math.ceil(w.lo / step) * step; v < w.hi; v += step) {
          const y = Yv(k, v);
          ctx.globalAlpha = alpha * ga;
          ctx.strokeStyle = v === 0 ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.08)";
          ctx.lineWidth = v === 0 ? 2 : 1;
          ctx.setLineDash(v === 0 ? [] : [4, 8]);
          ctx.beginPath();
          ctx.moveTo(40, y);
          ctx.lineTo(SAFE_R, y);
          ctx.stroke();
          ctx.setLineDash([]);
          text(ctx, "$" + Math.round(v).toLocaleString("en-US"), 44, y - 7, 20, 600, SANS, "rgba(255,255,255,0.4)");
        }
        const dec = w.x1 - w.x0 > 30 ? 10 : 5;
        for (let yy = Math.ceil(w.x0 / dec) * dec; yy < w.x1; yy += dec) {
          const x = X(k, yy);
          if (x < 60 || x > SAFE_R - 30) continue;
          ctx.fillStyle = "rgba(255,255,255,0.35)";
          ctx.fillRect(x - 0.5, GB + 10, 1, 12);
          text(ctx, String(yy), x, GB + 48, 22, 600, SANS, "rgba(255,255,255,0.5)", { align: "center" });
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
        for (const v of [1, 10, 100]) {
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
      const base = t < B0 || k.lg > 0.5 ? (k.cw > 0.5 ? CWB : Yv(k, S.log[0])) : k.gw > 0.5 ? GB : k.bot;
      const g = ctx.createLinearGradient(0, k.cw > 0.5 ? CWT : k.top, 0, base);
      g.addColorStop(0, `rgba(26,18,9,${0.8 * la})`);
      g.addColorStop(0.5, `rgba(18,12,6,${0.5 * la})`);
      g.addColorStop(1, "rgba(12,9,5,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(P[0].x, base);
      for (const q of P) ctx.lineTo(q.x, q.y);
      ctx.lineTo(P[P.length - 1].x, base);
      ctx.closePath();
      ctx.fill();
      // the rainbow film on crude, a little under the line, drifting
      const ir = ctx.createLinearGradient(P[0].x, 0, P[P.length - 1].x + 1, 0);
      for (let q = 0; q <= 8; q++) ir.addColorStop(q / 8, `hsla(${(q * 47 + t * 50) % 360},85%,62%,0.55)`);
      ctx.save();
      ctx.globalAlpha = alpha * 0.32 * la;
      ctx.strokeStyle = ir;
      ctx.lineWidth = 5;
      ctx.translate(0, 11);
      ctx.beginPath();
      P.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
      ctx.stroke();
      ctx.restore();
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
    const tone = e ? KIND_TONE[e.k] : t >= COLD5.neg.at && t < COLD5.neg.until ? "red" : "gold";
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
        if (Math.abs(val(yy) - pg.v) > 0.005) continue;
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
        const plab = tr(pg.label);
        const pb = pctLayout(ctx, t)?.box;
        const clash = pb && hitsBox(pb, [x - 6, ny - 52, x + measure(ctx, plab, 25, 900, SERIF), ny - 18]);
        if (!labelled && fly < 0 && !clash) {
          labelled = true;
          ctx.globalAlpha = clamp((xb - x - 40) / 80);
          text(ctx, plab, x - 6, ny - 26, 25, 900, SERIF, WHITE, { glow: "rgba(0,0,0,0.95)", glowBlur: 10 });
        }
      }
    });
    ctx.restore();
  };

  // ---------- old highs across the chart, with the gap and the days; the day it is beaten: 解套
  const solveT = (v: number) => EV.find((e) => e.fx?.includes("solve") && e.fit === v)?.t0 ?? Infinity;
  const fmtN = (n: number) => Math.round(n).toLocaleString("en-US");
  // label boxes already on the chart this frame (the swing ticks keep clear of them)
  let OCC: [number, number, number, number][] = [];
  const hitsOcc = (b: [number, number, number, number]) => OCC.some((o) => hitsBox(o, b));
  // the light along a cleared line, and the stamp
  const solvedFx = (ctx: CanvasRenderingContext2D, xa: number, xb: number, wy: number, sxStamp: number, d: number, on: number, label: string) => {
    const sx = xa + (xb - xa) * eo3(d / 0.45);
    const g = ctx.createLinearGradient(sx - 120, 0, sx + 20, 0);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(1, "rgba(255,255,255,0.95)");
    ctx.fillStyle = g;
    ctx.globalAlpha = on * clamp(1 - d / 0.6);
    ctx.fillRect(sx - 120, wy - 4, 140, 8);
    const s = 1 + 0.7 * (1 - eo3(d / 0.18));
    ctx.globalAlpha = on * clamp(d / 0.05);
    const bw = measure(ctx, label, 58, 900, SERIF) + 70;
    ctx.save();
    ctx.translate(clamp(sxStamp, bw / 2 + 30, SAFE_R - bw / 2), wy - 70);
    ctx.rotate(-0.1);
    ctx.scale(s, s);
    ctx.fillStyle = "rgba(20,14,4,0.85)";
    rrect(ctx, -bw / 2, -50, bw, 76, 8);
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 4;
    rrect(ctx, -bw / 2, -50, bw, 76, 8);
    ctx.stroke();
    text(ctx, label, 0, 10, 58, 900, SERIF, GOLD, { align: "center", glow: "rgba(255,201,77,0.7)", glowBlur: 18 });
    ctx.restore();
  };
  const drawWires = (ctx: CanvasRenderingContext2D, t: number) => {
    if (t < B0 || t >= END) return;
    const k = camAt(t);
    if (k.lg > 0.05 || k.gw > 0.05) return;
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
      text(ctx, tr(w.name), xa + 10, wy - 14, 24, 700, SANS, solved ? GOLD : SOFT, { glow: "rgba(0,0,0,0.95)", glowBlur: 8 });
      OCC.push([xa, wy - 40, xa + 20 + measure(ctx, tr(w.name), 24, 700, SANS), wy - 8]);
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
        const lab = v <= 0 ? (EN ? `below zero · ${fmtN(days)} days after the high` : `跌穿 0，离最高点 ${fmtN(days)} 天`) : EN ? `${gap < 0 ? "−" : "+"}${Math.round(Math.abs(gap) * 100)}% from the high · ${fmtN(days)} days` : `较前高 ${gap < 0 ? "−" : "+"}${Math.round(Math.abs(gap) * 100)}%，${fmtN(days)} 天`;
        const ly = clamp(wy + 46, k.top + 30, h.y - 30);
        text(ctx, lab, h.x - 14, ly, 32, 900, SANS, dcol, { align: "right", glow: "rgba(0,0,0,0.95)", glowBlur: 10, maxW: h.x - 60 });
        OCC.push([Math.max(40, h.x - 14 - measure(ctx, lab, 32, 900, SANS)), ly - 34, h.x - 6, ly + 8]);
      } else solvedFx(ctx, xa, xb, wy, clamp(h.x - 150, 140, 700), t - ts, on, tr("解套"));
    }
    ctx.restore();
  };

  // ---------- the pull-back's marks: the high, the low, the fall between them redrawn hot, its size in the empty corner;
  // or, for a new high, the old highs it is measured against
  const span1 = (yrs: number) => {
    const m = yrs * 12;
    if (EN) return m < 12 ? `${m - Math.floor(m) >= 0.3 ? "over " : ""}${Math.floor(m)} months` : `${yrs < 10 ? yrs.toFixed(1) : Math.round(yrs)} years`;
    if (m < 12) return `${Math.floor(m)} 个${m - Math.floor(m) >= 0.3 ? "多" : ""}月`;
    return `${yrs < 10 ? yrs.toFixed(1) : Math.round(yrs)} 年`;
  };
  const dotAt = (ctx: CanvasRenderingContext2D, x: number, y: number, col: string, r = 9) => {
    ctx.fillStyle = "#0b0d10";
    ctx.strokeStyle = col;
    ctx.lineWidth = 4;
    ctx.shadowColor = col;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
  };
  const drawWide = (ctx: CanvasRenderingContext2D, t: number) => {
    const k = camAt(t);
    if (k.gw < 0.35 || t < B0 || t >= END) return;
    const w = WIDES[k.gi];
    const A = clamp((k.gw - 0.45) / 0.4);
    const u = t - w.ws;
    ctx.save();
    ctx.globalAlpha = A;
    text(ctx, EN ? `Zoom out: ${w.x0}–${Math.floor(w.e.y)}` : `拉远看：${w.x0}—${Math.floor(w.e.y)} 年`, 60, 612, 30, 900, SERIF, SOFT, { glow: "rgba(0,0,0,0.9)", glowBlur: 8 });
    const yb = w.a !== undefined ? w.by : w.e.y;
    const vb = val(yb);
    const xb = X(k, yb);
    const pb = Yv(k, vb);
    if (w.a !== undefined) {
      const ya = w.ay;
      const va = val(ya);
      const xa = X(k, ya);
      const pa = Yv(k, va);
      // the fall, drawn on hot
      const q = eo3(clamp((u - 0.12) / 0.4));
      const yEnd = ya + (yb - ya) * q;
      ctx.save();
      ctx.globalAlpha = A;
      ctx.strokeStyle = RED;
      ctx.lineWidth = 7;
      ctx.lineJoin = "round";
      ctx.shadowColor = RED;
      ctx.shadowBlur = 22;
      ctx.beginPath();
      ctx.moveTo(xa, pa);
      for (let i = segOf(ya) + 1; i < SER.length && SER[i].y < yEnd; i++) ctx.lineTo(X(k, SER[i].y), Yv(k, SER[i].v));
      ctx.lineTo(X(k, yEnd), Yv(k, val(yEnd)));
      ctx.stroke();
      ctx.restore();
      // the level it fell from, and the drop to the low
      ctx.globalAlpha = A * clamp((u - 0.3) / 0.2);
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(xa, pa);
      ctx.lineTo(Math.max(xb, xa) + 34, pa);
      ctx.stroke();
      ctx.setLineDash([]);
      const ax = Math.max(xb, xa) + 34;
      const ay = pa + (pb - pa) * eo3(clamp((u - 0.35) / 0.3));
      ctx.strokeStyle = RED;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(ax, pa);
      ctx.lineTo(ax, ay);
      ctx.stroke();
      if (ay > pa + 30) {
        ctx.fillStyle = RED;
        ctx.beginPath();
        ctx.moveTo(ax, ay + 4);
        ctx.lineTo(ax - 12, ay - 16);
        ctx.lineTo(ax + 12, ay - 16);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = A;
      dotAt(ctx, xa, pa, WHITE);
      text(ctx, fmtUsd(va), xa, pa - 26, 32, 900, SANS, WHITE, { align: "center", glow: "rgba(0,0,0,0.95)", glowBlur: 10 });
      if (u > 0.5) {
        dotAt(ctx, xb, pb, RED);
        text(ctx, fmtUsd(vb), xb - 18, pb + 44, 32, 900, SANS, RED, { align: "right", glow: "rgba(0,0,0,0.95)", glowBlur: 10 });
      }
      // the size of it, big, in the empty corner the decades leave
      const d = u - 0.55;
      if (d > 0) {
        const s = 1 + 0.35 * (1 - eo3(d / 0.16));
        const big = vb <= 0 ? (EN ? "Below zero" : "跌穿 0") : `−${Math.round((1 - vb / va) * 100)}%`;
        ctx.save();
        ctx.translate(60, 752);
        ctx.scale(s, s);
        ctx.globalAlpha = A * clamp(d / 0.08);
        text(ctx, big, 0, 0, 112, 900, SANS, RED, { glow: "rgba(255,59,47,0.6)", glowBlur: 30 });
        ctx.restore();
        ctx.globalAlpha = A * clamp((d - 0.12) / 0.15);
        text(ctx, EN ? `In ${span1(yb - ya)}: $${fmtUsd(va)} → ${vb < 0 ? "−$" + fmtUsd(-vb) : "$" + fmtUsd(vb)}` : `${span1(yb - ya)}，从 ${fmtUsd(va)} 跌到 ${fmtUsd(vb)} 美元`, 62, 808, 30, 700, SERIF, SOFT, { glow: "rgba(0,0,0,0.9)", glowBlur: 8 });
      }
    } else if (w.refs.length) {
      // a new high against the old ones
      let top = w.refs[0];
      for (const ry of w.refs) if (val(ry) > val(top)) top = ry;
      w.refs.forEach((ry, i) => {
        const v = val(ry);
        const x = X(k, ry);
        const y = Yv(k, v);
        ctx.globalAlpha = A * clamp((u - 0.15 - i * 0.15) / 0.15);
        dotAt(ctx, x, y, GOLD);
        text(ctx, EN ? `${Math.floor(ry)} · $${fmtUsd(v)}` : `${Math.floor(ry)} 年 ${fmtUsd(v)}`, x, y - 26, 28, 900, SANS, GOLD, { align: "center", glow: "rgba(0,0,0,0.95)", glowBlur: 10 });
      });
      const vt = val(top);
      const yt = Yv(k, vt);
      ctx.globalAlpha = A * clamp((u - 0.45) / 0.2);
      ctx.strokeStyle = "rgba(255,201,77,0.6)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(X(k, top), yt);
      ctx.lineTo(xb + 34, yt);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = WHITE;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(xb + 34, pb);
      ctx.lineTo(xb + 34, yt);
      ctx.stroke();
      dotAt(ctx, xb, pb, WHITE);
      const d = u - 0.6;
      if (d > 0) {
        const s = 1 + 0.35 * (1 - eo3(d / 0.16));
        ctx.save();
        ctx.translate(60, 752);
        ctx.scale(s, s);
        ctx.globalAlpha = A * clamp(d / 0.08);
        text(ctx, EN ? `$${fmtUsd(vb)}` : `${fmtUsd(vb)} 美元`, 0, 0, 100, 900, SANS, WHITE, { glow: "rgba(255,255,255,0.35)", glowBlur: 24 });
        ctx.restore();
        ctx.globalAlpha = A * clamp((d - 0.12) / 0.15);
        text(ctx, EN ? `Still ${Math.round((1 - vb / vt) * 100)}% below the ${Math.floor(top)} high` : `比 ${Math.floor(top)} 年的最高点，还低 ${Math.round((1 - vb / vt) * 100)}%`, 62, 808, 30, 700, SERIF, SOFT, { glow: "rgba(0,0,0,0.9)", glowBlur: 8 });
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

  // ---------- crude oil instead of fireworks: on new highs a gusher shoots from the head; on crashes oil drips off it
  const FW = HITS.filter((h) => h.fw).map((h) => ({ t0: h.t, big: !!h.big || !!h.e?.fx?.includes("fwBig") }));
  const drop = (ctx: CanvasRenderingContext2D, x: number, y: number, vx: number, vy: number, s: number, a: number, fy = 1462) => {
    // a drop of crude: a round glossy head leading, a tail tapering behind it along the motion; black-brown with an
    // amber rim and a hot specular point; gone at the ground
    if (y > fy) return;
    const sp = Math.hypot(vx, vy);
    const L = clamp(sp * 0.03, s * 1.4, s * 6);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.atan2(vy, vx));
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(0, 0, s, -Math.PI / 2, Math.PI / 2);
    ctx.quadraticCurveTo(-L * 0.45, s * 0.75, -L - s, 0);
    ctx.quadraticCurveTo(-L * 0.45, -s * 0.75, 0, -s);
    ctx.closePath();
    ctx.shadowColor = "rgba(255,150,40,0.55)";
    ctx.shadowBlur = 7;
    ctx.fillStyle = "#140c05";
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,190,100,0.75)";
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,244,214,0.95)";
    ctx.beginPath();
    ctx.ellipse(s * 0.25, -s * 0.38, Math.max(0.8, s * 0.32), Math.max(0.6, s * 0.18), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  const gusher = (ctx: CanvasRenderingContext2D, t: number, tb: number, x0: number, y0: number, seed: number, big: boolean, up = 1, fy = 1462) => {
    const tau = t - tb;
    if (tau < 0 || tau > 1.7) return;
    const r = rng(seed);
    // the jet: a dark column with a lit edge, for the first moments
    if (tau < 0.42) {
      const hgt = (big ? 380 : 280) * eo3(tau / 0.16) * up;
      const w = (big ? 30 : 22) * (1 - tau / 0.42);
      const g = ctx.createLinearGradient(x0, y0, x0, y0 - hgt);
      g.addColorStop(0, "rgba(30,20,8,0.95)");
      g.addColorStop(0.7, "rgba(60,38,12,0.8)");
      g.addColorStop(1, "rgba(60,38,12,0)");
      ctx.save();
      ctx.shadowColor = "rgba(255,170,60,0.9)";
      ctx.shadowBlur = 18;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x0 - w, y0);
      ctx.quadraticCurveTo(x0 - w * 0.4, y0 - hgt * 0.6, x0, y0 - hgt);
      ctx.quadraticCurveTo(x0 + w * 0.4, y0 - hgt * 0.6, x0 + w, y0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    const n = big ? 90 : 56;
    for (let i = 0; i < n; i++) {
      const a0 = -Math.PI / 2 + (r() - 0.5) * (big ? 1.3 : 1.0);
      const sp = (big ? 1300 : 1050) * (0.45 + 0.7 * r());
      const delay = r() * 0.25;
      const s = 2.5 + r() * (big ? 6 : 4.5);
      const q = tau - delay;
      if (q < 0) continue;
      const vx = Math.cos(a0) * sp;
      const vy = Math.sin(a0) * sp * up;
      const g = 2600;
      const x = x0 + vx * q;
      const y = y0 + vy * q + 0.5 * g * q * q;
      const life = 1.15 + 0.4 * r();
      if (q > life) continue;
      drop(ctx, x, y, vx, vy + g * q, s, clamp(1 - Math.pow(q / life, 3)), fy);
    }
  };
  const drawFireworks = (ctx: CanvasRenderingContext2D, t: number) => {
    for (const fw of FW) {
      const bursts = fwBursts(fw.t0, fw.big);
      if (t < fw.t0 - 0.02 || t > bursts[bursts.length - 1] + 1.8) continue;
      bursts.forEach((tb, bi) => {
        const h = headAt(tb - 0.14);
        gusher(ctx, t, tb - 0.14, h.x + (bi - 1) * 26 * (fw.big ? 1 : 0), h.y, Math.round(fw.t0 * 1000) + bi * 77, fw.big);
      });
    }
    // crashes: drops fall off the head while the price slides
    const e = evAt(t);
    if (e && e.k === "crash" && t >= B0) {
      const r = rng(e.i * 131 + 7);
      for (let q = 0; q < 7; q++) {
        const td = e.t0 + 0.08 + q * 0.32 + r() * 0.12;
        const d = t - td;
        if (d < 0 || d > 1.1) continue;
        const h = headAt(td);
        const vx = (r() - 0.5) * 60;
        const y = h.y + 10 + 0.5 * 2200 * d * d;
        drop(ctx, h.x + vx * d, y, vx, 2200 * d + 40, 3.5 + r() * 3, clamp(1 - d / 1.1));
      }
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
  const pctLayout = (ctx: CanvasRenderingContext2D, t: number) => {
    const e = evAt(t);
    if (!e || !e.pct) return null;
    const d = t - e.t0;
    const life = Math.min(e.t1 - e.t0, 2.6);
    if (d > life + 0.2) return null;
    const a = (d < life ? 1 : 1 - (d - life) / 0.2) * (1 - clamp(camAt(t).gw * 2));
    if (a <= 0.01) return null;
    const h = headAt(t);
    const s = 1 + 0.5 * env(t, e.t0, 0.01, 0.1);
    const up = e.pct.startsWith("+") || e.pct.startsWith("×");
    const col = up ? GOLD : e.k === "crash" || e.k === "war" ? RED : ASH;
    const k = camAt(t);
    const y = up ? clamp(h.y - 20, 760, Math.min(k.bot + 40, 1450)) : clamp(h.y + 120, 760, Math.min(k.bot + 40, 1450));
    const w = Math.min(measure(ctx, e.pct, 156 * 1.5, 900, SANS), h.x - 80);
    return { e, a, x: h.x - 34, y, s, col, box: [h.x - 34 - w - 10, y - 150, h.x - 24, y + 14] as [number, number, number, number] };
  };
  const drawPct = (ctx: CanvasRenderingContext2D, t: number) => {
    const L = pctLayout(ctx, t);
    if (!L) return;
    const h = headAt(t);
    ctx.save();
    ctx.globalAlpha = clamp(L.a);
    text(ctx, L.e.pct!, L.x, L.y, 156 * L.s, 900, SANS, L.col, { align: "right", glow: L.col + "aa", glowBlur: 30, maxW: h.x - 80 });
    ctx.restore();
  };

  // ---------- the title: it slams in over the climbing line, holds, then flies into the header
  const [TI0, TI1] = COLD5.title;
  const TIN = COLD5.titleIn;
  const drawIntro = (ctx: CanvasRenderingContext2D, t: number, hx: number) => {
    if (t < TIN - 0.01) return;
    const k = ease(clamp((t - TI0) / (TI1 - TI0)));
    ctx.font = `900 168px ${SERIF}`;
    const big = Math.min(168, (168 * 940) / ctx.measureText(S.brand).width);
    const size = big + (30 - big) * k;
    ctx.font = `900 ${size}px ${SERIF}`;
    const w = ctx.measureText(S.brand).width;
    const x = CX - w / 2 + (hx - (CX - w / 2)) * k;
    const y = 668 + (127 - 668) * k;
    const pop = 1 + 0.45 * (1 - eo3((t - TIN) / 0.16));
    ctx.save();
    if (k < 1) {
      // a dark band so the title reads over the chart
      const back = ctx.createLinearGradient(0, 500, 0, 730);
      back.addColorStop(0, "rgba(6,5,4,0)");
      back.addColorStop(0.5, `rgba(6,5,4,${0.75 * (1 - k)})`);
      back.addColorStop(1, "rgba(6,5,4,0)");
      ctx.fillStyle = back;
      ctx.fillRect(FULL[0], 500, FULL[2], 230);
    }
    ctx.globalAlpha *= clamp((t - TIN) / 0.05);
    ctx.translate(x + (w / 2) * (1 - pop) * (1 - k), y);
    ctx.scale(pop, pop);
    text(ctx, S.brand, 0, 0, size, 900, SERIF, GOLD, { ls: EN ? 0 : 2 + 10 * (1 - k), glow: "rgba(255,201,77,0.55)", glowBlur: 40 * (1 - k) + 4 });
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
    const nums = t < RW0 ? 0 : 1;
    if (nums <= 0) {
      ctx.restore();
      return;
    }
    ctx.globalAlpha = fade * nums;
    const c = k.c;
    const rw = t >= RW0 && t < B0;
    text(ctx, rw ? S.rewindLabel ?? "倒回……" : t < RW0 ? tr(COLD5.era) : S.era(c), 58, 186, 30, 700, SERIF, SOFT, { maxW: 700 });
    const yNum = Math.floor(c + 1e-6);
    // the price leads; the date sits under it (in the rewind, with no price, the year takes the top line)
    const YB = rw ? 300 : 392;
    const YS = rw ? 116 : 62;
    let x = 56;
    const blur = Math.min(4, k.sp / 900) * (YS / 116);
    if (blur > 0.4) ctx.filter = `blur(${blur.toFixed(1)}px)`;
    const span = (W * 0.5) / k.ppy;
    const [, mo, dd] = ymd(c);
    const dayMode = t >= B0 && k.ca > 0.5;
    const monMode = (t >= B0 && span < 40 && yNum >= 1946) || t < RW0;
    if (EN && !rw && (dayMode || monMode)) {
      // English: "Jan 29, 2026" / "Jan 2026"
      ctx.filter = "none";
      x += text(ctx, dayMode ? `${MON[mo]} ${dd}, ` : `${MON[mo]} `, x, YB, YS * 0.8, 900, SANS, WHITE);
      if (blur > 0.4) ctx.filter = `blur(${blur.toFixed(1)}px)`;
    }
    x += tabular(ctx, String(yNum), x, YB, YS, WHITE);
    ctx.filter = "none";
    const tail = dayMode ? `年 ${mo} 月 ${dd} 日` : monMode ? `年 ${mo} 月` : "年";
    if (!EN) text(ctx, tail, x + 6, YB, rw ? 46 : 32, 900, SERIF, WHITE);
    const v = val(c);
    const slope = val(c) - val(c - Math.max(0.0025, span / 200));
    const e = evAt(t);
    const red = (e && e.k === "crash" && slope < 0) || (t >= COLD5.neg.at && t < COLD5.neg.until) || v < 0;
    const col = red ? RED : slope < -v * 0.002 ? ASH : GOLD;
    if (!rw) {
      const nw = tabular(ctx, fmtUsd(v), 56, 300, 116, col, { glow: col + "55" });
      text(ctx, tr("美元 / 桶"), 56 + nw + 12, 300, 40, 900, SERIF, col);
      const rate = cnyAt(c);
      const chips = [S.kindLabel[kindAt(c)]];
      if (rate > 0) chips.unshift(`≈ ${(v < 0 ? "−" : "") + Math.abs((v * rate) / 158.987).toFixed(2)} 元/升`);
      let cx0 = 60;
      // the price in yuan per gram (what a Chinese buyer reads) gets a real chip; the data kind a quiet one
      chips.forEach((chip, i) => {
        const hot = i === 0 && chips.length > 1;
        const fs = hot ? 38 : 22;
        ctx.font = `${hot ? 900 : 700} ${fs}px ${hot ? SANS : SERIF}`;
        const cw = ctx.measureText(chip).width + (hot ? 32 : 24);
        const ch = hot ? 54 : 36;
        const cy0 = hot ? 418 : 427;
        if (hot) {
          ctx.fillStyle = "rgba(255,201,77,0.1)";
          ctx.fillRect(cx0, cy0, cw, ch);
        }
        ctx.strokeStyle = hot ? "rgba(255,201,77,0.8)" : "rgba(200,205,210,0.45)";
        ctx.lineWidth = hot ? 2 : 1;
        ctx.strokeRect(cx0, cy0, cw, ch);
        text(ctx, chip, cx0 + (hot ? 16 : 12), cy0 + (hot ? 41 : 27), fs, hot ? 900 : 700, hot ? SANS : SERIF, hot ? GOLD : "#aeb4ba");
        cx0 += cw + 12;
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
    text(ctx, S.tableTitle ?? "", 790, 168, 22, 700, SERIF, MUTED);
    rows.forEach((r, i) => {
      const p = pos[i];
      if (p > NR - 0.02) return;
      ctx.globalAlpha = a * clamp(NR - p);
      const y = 214 + p * 50;
      ctx.fillStyle = r.c;
      ctx.fillRect(790, y - 22, 6, 28);
      text(ctx, tr(r.n), 806, y, 26, 900, SERIF, WHITE);
      if (r.tag) {
        ctx.font = `900 26px ${SERIF}`;
        if (r.tag === "*") text(ctx, "*", 810 + ctx.measureText(tr(r.n)).width, y + 2, 28, 900, SANS, GOLD);
        else text(ctx, r.tag, 812 + ctx.measureText(tr(r.n)).width, y - 2, 16, 700, SANS, MUTED);
      }
      text(ctx, r.v.toFixed(1) + "%", 1090, y, 25, 900, SANS, WHITE, { align: "right" });
      const w0 = was.find((x) => x.n === r.n);
      const ch = 0 * (w0 ? w0.v : 0);
      if (Math.abs(ch) >= 0.005) {
        const down = ch < 0;
        text(ctx, `${down ? "▼" : "▲"}${Math.abs(ch * 100).toFixed(0)}%`, 1096, y, 21, 900, SANS, down ? RED : GOLD, { align: "right" });
      }
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(806, y + 9, 290, 4);
      ctx.fillStyle = r.c;
      ctx.fillRect(806, y + 9, 290 * (r.v / vmax), 4);
    });
    const note = S.tableNote?.(c);
    if (note) {
      ctx.globalAlpha = a;
      text(ctx, note, 790, 214 + NR * 50 - 6, 17, 500, SANS, MUTED, { maxW: 306 });
    }
    ctx.restore();
  };

  // ---------- swing ticks
  const PCT_YEARS = EV.filter((e) => e.pct).map((e) => e.y);
  const PIV = SER.map((p, i) => (p.kind === "p" ? i : -1)).filter((i) => i >= 0);
  const drawTicks = (ctx: CanvasRenderingContext2D, t: number) => {
    if (t < B0 || t >= END) return;
    const k = camAt(t);
    if (k.lg > 0.05 || k.ca > 0.3 || k.gw > 0.05) return;
    const c = k.c;
    ctx.save();
    const pb = pctLayout(ctx, t)?.box;
    if (pb) OCC.push(pb);
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
      const lw = measure(ctx, lab, 30 * pop, 900, SANS);
      const ly = (y0 + y1) / 2 + 10;
      // keep clear of the big number and the wire labels
      if (hitsOcc([x - 18 - lw, ly - 30, x - 6, ly + 8])) continue;
      ctx.globalAlpha = a * clamp((x - 12 - lw - 40) / 30);
      text(ctx, lab, x - 12, ly, 30 * pop, 900, SANS, col, { align: "right", glow: "rgba(0,0,0,0.95)", glowBlur: 10 });
    }
    ctx.restore();
  };

  // ---------- the card at the head: (icon), tag, title, number, sub; each line lands on its own beat
  const REV = new Map(EV.map((e) => [e.i, revealOf(e, BEATS)]));
  const CX_OFF = 60;
  const ICON_H = 128;
  const wrap2 = (ctx: CanvasRenderingContext2D, s: string, size: number, maxW: number) => {
    if (measure(ctx, s, size, 900, SERIF) <= maxW) return [s];
    if (EN) {
      // English: fill each line word by word, up to three lines (the last one is squeezed if it must be)
      const out: string[] = [];
      let cur = "";
      for (const wd of s.split(" ")) {
        const nx = cur ? cur + " " + wd : wd;
        if (cur && measure(ctx, nx, size, 900, SERIF) > maxW && out.length < 2) {
          out.push(cur);
          cur = wd;
        } else cur = nx;
      }
      out.push(cur);
      return out;
    }
    const cut = s.indexOf("，") > 0 ? s.indexOf("，") : s.indexOf("：");
    if (cut > 0 && cut < s.length - 1) return [s.slice(0, cut + 1), s.slice(cut + 1)];
    // English: after a comma or colon, else at the space nearest the middle
    const c2 = Math.max(s.indexOf(", "), s.indexOf(": "));
    if (c2 > 0) return [s.slice(0, c2 + 1), s.slice(c2 + 2)];
    let best = -1;
    for (let i = 0; i < s.length; i++) if (s[i] === " " && (best < 0 || Math.abs(i - s.length / 2) < Math.abs(best - s.length / 2))) best = i;
    if (best > 0) return [s.slice(0, best), s.slice(best + 1)];
    return [s];
  };
  const cardBox = (ctx: CanvasRenderingContext2D, e: P5, maxW: number) => {
    const TS = EN ? (e.n ? 54 : 62) : e.n ? 60 : 72;
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
      drawIcon(ctx, e.icon, x0 + 58, y + 62, 1, (t - e.t0) / 0.6, e.icon === "stamp" ? RED : col, tr("关税"));
      ctx.restore();
      y += ICON_H;
    }
    ctx.globalAlpha = on(R.title);
    let tx = x0 + slide(R.title);
    y += 34;
    const lab = e.lab ?? tr(KIND_LABEL[e.k]);
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
    const wf = 1 - clamp(camAt(t).gw * 1.8);
    if (wf <= 0.01) {
      ctx.restore();
      return;
    }
    if (prev && d < 0.1) drawOne(ctx, prev, t, Math.pow(1 - d / 0.1, 2) * wf, eo3(d / 0.1) * 70);
    drawOne(ctx, e, t, wf, 0);
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
    const lab = closed ? tr(e.alarm ?? "封锁") : gold ? tr("油价暴涨") : e.k === "crash" ? tr("油价暴跌") : e.k === "split" ? e.lab ?? tr("禁运") : e.lab ?? tr("战争");
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
    ctx.restore();
  };
  const drawSource = (ctx: CanvasRenderingContext2D, t: number) => {
    if (!S.src || t < B0 - 0.2 || t >= OUT) return;
    const c = camAt(t).c;
    const e = evAt(t);
    let line = tr("数据：") + S.src(t >= END ? LAST_REAL : c);
    if (k_ca(t) > 0.5) line = EN ? "Data: NYMEX WTI crude futures, daily (open, high, low, close)" : "数据：NYMEX WTI 原油期货日线（开盘、最高、最低、收盘）";
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

  // ---------- one barrel (159 litres), held up while the question is asked: the engraved wooden barrel the unit came from
  const drawCoin = (ctx: CanvasRenderingContext2D, t: number) => {
    const im = IMGS["art/barrel.png"];
    if (!im) return;
    const d = t - COIN.t0;
    const h = 440;
    const w = (h * im.width) / im.height;
    const cx = CX;
    const cy = 1000;
    const sx = Math.max(0.02, Math.abs(Math.cos((1 - eo3(d / 0.32)) * Math.PI * 0.5)));
    const a = clamp(d / 0.08) * clamp((COIN.t1 + 0.12 - t) / 0.12);
    const lift = 30 * (1 - eo3(d / 0.32));
    ctx.save();
    ctx.globalAlpha = a;
    const pool = ctx.createRadialGradient(cx, cy, h * 0.35, cx, cy, h * 0.95);
    pool.addColorStop(0, "rgba(6,5,4,0.85)");
    pool.addColorStop(1, "rgba(6,5,4,0)");
    ctx.fillStyle = pool;
    ctx.fillRect(cx - h, cy - h, 2 * h, 2 * h);
    ctx.save();
    ctx.translate(cx, cy + lift);
    ctx.scale(sx, 1);
    ctx.drawImage(im, -w / 2, -h / 2, w, h);
    ctx.restore();
    // its size, in plain words
    const ta = clamp((d - 0.35) / 0.15);
    if (ta > 0) {
      ctx.globalAlpha = a * ta;
      text(ctx, tr("1 桶 = 159 升"), cx, cy + h / 2 + 52, 44, 900, SERIF, GOLD, { align: "center", glow: "rgba(0,0,0,0.95)", glowBlur: 14 });
    }
    ctx.restore();
  };
  // ---------- cold open: the floor breaks at -$37.63, the highs named on the beats, the question
  const drawCold = (ctx: CanvasRenderingContext2D, t: number) => {
    if (t >= RW0 + 0.1) return;
    const k = camAt(t);
    const fadeOut = 1 - clamp((t - (RW0 - 0.12)) / 0.22);
    const L = S.cold.lines[0];
    const quiet = 1 - 0.7 * clamp((t - L.t0) / 0.2);
    const NG = COLD5.neg;
    const negOn = t >= NG.at && t < NG.until + 0.2;
    ctx.save();
    let newest = -1;
    COLD5.marks.forEach((m, i) => {
      if (t >= m.at - 0.01) newest = i;
    });
    COLD5.marks.forEach((m, i) => {
      if (t < m.at - 0.01) return;
      const x = X(k, m.y);
      const y = Yv(k, val(m.y));
      const isNew = i === newest;
      const pop = 1 + 0.5 * env(t, m.at, 0.01, 0.12);
      const col = m.red ? RED : GOLD;
      ctx.globalAlpha = fadeOut * (isNew ? 1 : 0.8) * quiet;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x, y, 8 * pop, 0, Math.PI * 2);
      ctx.fill();
      // the big red number says it while it is on; the dot's own label waits
      if (m.red && negOn) return;
      const sb = isNew ? (m.top ? 50 : 42) : 30;
      const sa = isNew ? 26 : 21;
      ctx.save();
      if (m.red) {
        ctx.translate(x + 22, y + 8);
        ctx.scale(pop, pop);
        text(ctx, tr(m.b), 0, 0, sb, 900, SANS, col, { glow: "rgba(0,0,0,0.95)", glowBlur: 12 });
        text(ctx, tr(m.a), 0, -sb - 4, sa, 700, SERIF, isNew ? WHITE : SOFT, { glow: "rgba(0,0,0,0.95)", glowBlur: 8 });
      } else {
        ctx.translate(Math.min(x - 22, SAFE_R - 60), y - 24);
        ctx.scale(pop, pop);
        text(ctx, tr(m.b), 0, 0, sb, 900, SANS, col, { align: "right", glow: "rgba(0,0,0,0.95)", glowBlur: 12 });
        text(ctx, tr(m.a), 0, -sb - 4, sa, 700, SERIF, isNew ? WHITE : SOFT, { align: "right", glow: "rgba(0,0,0,0.95)", glowBlur: 8 });
      }
      ctx.restore();
    });
    // through zero: the number, big
    if (negOn) {
      const s = 1 + 0.45 * env(t, NG.at, 0.01, 0.12);
      ctx.globalAlpha = fadeOut * clamp((t - NG.at) / 0.05) * clamp((NG.until + 0.2 - t) / 0.2);
      text(ctx, tr(NG.a), CX + 40, 712, 36, 900, SERIF, WHITE, { align: "center", glow: "rgba(0,0,0,0.95)", glowBlur: 10 });
      ctx.save();
      ctx.translate(CX + 40, 868);
      ctx.scale(s, s);
      text(ctx, tr(NG.b), 0, 0, 140, 900, SANS, RED, { align: "center", maxW: 900, glow: "rgba(255,59,47,0.7)", glowBlur: 30 });
      ctx.restore();
      if (t >= NG.at + BEAT_S) {
        ctx.globalAlpha = fadeOut * clamp((t - NG.at - BEAT_S) / 0.06) * clamp((NG.until + 0.2 - t) / 0.2);
        text(ctx, tr(NG.c), CX + 40, 950, 44, 900, SERIF, WHITE, { align: "center", glow: "rgba(0,0,0,0.95)", glowBlur: 12 });
      }
    }
    if (t >= COIN.t0 && t <= COIN.t1 + 0.12) drawCoin(ctx, t);
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
      text(ctx, L.a, 0, 0, 52, 900, SERIF, WHITE, { align: "center", maxW: 900 / s, glow: "rgba(0,0,0,0.9)", glowBlur: 16 });
      ctx.restore();
      const tb = L.t0 + (L.bBeats ?? 1) * BEAT_S;
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
      // two rows, so short eras can carry long names; kept inside the frame
      const fs = 27 * pop;
      const tw = measure(ctx, name, fs, 900, SERIF);
      const mx = clamp((x0 + x1) / 2, 50 + tw / 2, SAFE_R - 6 - tw / 2);
      text(ctx, name, mx, RIB_Y + (i % 2 ? 84 : 46), fs, 900, SERIF, u === 1 ? "#ffd987" : u === 0 ? "#aeb6bf" : WHITE, { align: "center", glow: "rgba(0,0,0,0.9)", glowBlur: 8 });
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
    // two rates side by side: 179 years nailed down, 55 years free
    if (t >= RATES.t0 && t < RATES.t1 + 0.3) {
      const ra = clamp((t - RATES.t0) / 0.25) * clamp((RATES.t1 + 0.3 - t) / 0.3);
      const xs = X(k, RATES.split);
      const parts: [number, number, string[], string, number][] = [
        [X(k, FIRST), xs - 5, RATES.a, ASH, 0],
        [xs + 5, X(k, LAST_REAL), RATES.b, GOLD, 2 * (60 / 130)],
      ];
      const by = 1232;
      for (const [x0, x1, lab, col, delay] of parts) {
        const u = clamp((t - RATES.t0 - delay) / 0.3);
        if (u <= 0) continue;
        const s = 1 + 0.25 * env(t, RATES.t0 + delay, 0.01, 0.1);
        ctx.globalAlpha = ra * u;
        ctx.strokeStyle = col;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x0, by - 14);
        ctx.lineTo(x0, by);
        ctx.lineTo(x0 + (x1 - x0) * eo3(u), by);
        if (u >= 1) ctx.lineTo(x1, by - 14);
        ctx.stroke();
        const mx = (x0 + x1) / 2;
        text(ctx, tr(lab[0]), mx, by + 38, 26, 700, SERIF, SOFT, { align: "center", glow: "rgba(0,0,0,0.9)", glowBlur: 8 });
        ctx.save();
        ctx.translate(mx, by + 84);
        ctx.scale(s, s);
        text(ctx, tr(lab[1]), 0, 0, 40, 900, SANS, col, { align: "center", maxW: Math.max(200, x1 - x0) / s, glow: col === GOLD ? "rgba(255,201,77,0.5)" : "rgba(0,0,0,0.9)", glowBlur: 14 });
        ctx.restore();
      }
      ctx.globalAlpha = 1 - Math.max(cardA, credA);
    }
    // a light runs along the whole line, 1792 to now, under the last line
    if (t >= SWEEP.t0 && t < SWEEP.t0 + SWEEP.dur + 0.4) {
      const u = (t - SWEEP.t0) / SWEEP.dur;
      const sy = FIRST + (LAST_REAL - FIRST) * (u < 1 ? 1 - Math.pow(1 - u, 2) : 1);
      const tail = 40;
      const fade = clamp((SWEEP.t0 + SWEEP.dur + 0.4 - t) / 0.4);
      ctx.save();
      ctx.lineCap = "round";
      ctx.shadowColor = GOLD;
      ctx.shadowBlur = 22;
      ctx.strokeStyle = "#fff6d8";
      ctx.lineWidth = 6;
      const step = 0.6;
      for (let y = Math.max(FIRST, sy - tail); y < sy; y += step) {
        const y2 = Math.min(sy, y + step);
        ctx.globalAlpha = (1 - Math.max(cardA, credA)) * fade * Math.pow(1 - (sy - y2) / tail, 2);
        ctx.beginPath();
        ctx.moveTo(X(k, y), Yv(k, val(y)));
        ctx.lineTo(X(k, y2), Yv(k, val(y2)));
        ctx.stroke();
      }
      const hx = X(k, sy);
      const hy = Yv(k, val(sy));
      const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 60);
      g.addColorStop(0, "rgba(255,250,230,0.95)");
      g.addColorStop(1, "rgba(255,250,230,0)");
      ctx.globalAlpha = (1 - Math.max(cardA, credA)) * fade;
      ctx.shadowBlur = 0;
      ctx.fillStyle = g;
      ctx.fillRect(hx - 60, hy - 60, 120, 120);
      ctx.restore();
    }
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
      // the next episode
      const na = clamp((t - S.ending.card - 0.5) / 0.4);
      if (na > 0 && NEXT.a) {
        ctx.globalAlpha = cardA * na;
        ctx.fillStyle = "rgba(255,201,77,0.5)";
        ctx.fillRect(CX - 40, 1150, 80, 2);
        text(ctx, tr(NEXT.a), CX, 1214, 32, 700, SERIF, SOFT, { align: "center", ls: 4 });
        text(ctx, tr(NEXT.b), CX, 1280, EN ? 40 : 46, 900, SERIF, GOLD, { align: "center", glow: "rgba(255,201,77,0.4)", glowBlur: 16 });
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
      for (let j = 1; j < RADII.length - 1; j++) cells.push({ i, j, fall: j <= 3 && r() < (j === 1 ? 0.6 : 0.4), delay: 0.14 + 0.22 * r() + 0.04 * j, spin: (r() - 0.5) * 3.2, vx: (r() - 0.5) * 160 });
    // a crack wanders: two kinks per segment, and some rays fork
    const jag = RADII.map(() => ang.map(() => [(r() - 0.5) * 0.5, (r() - 0.5) * 0.5]));
    const fork = ang.map(() => (r() < 0.45 ? { j: 1 + Math.floor(r() * 3), da: (r() < 0.5 ? -1 : 1) * (0.12 + 0.18 * r()), l: 0.5 + 0.7 * r() } : null));
    const fallen = new Set(cells.filter((q) => q.fall).map((q) => q.i * 10 + q.j));
    return { t0: e.t0, ang, rad, len, cells, NR, jag, fork, fallen };
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
      // the cracks: wandering rays from the impact (some fork), and short ring pieces only where glass fell out
      const ca = d < 1.2 ? 1 : clamp(1 - (d - 1.2) / 1.0);
      ctx.globalAlpha = ca;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const seg = (x0: number, y0: number, x1: number, y1: number, ja: number, jb: number, o: number) => {
        const dx = x1 - x0;
        const dy = y1 - y0;
        const nx = -dy * 0.12;
        const ny = dx * 0.12;
        ctx.moveTo(x0 + o, y0 + o);
        ctx.lineTo(x0 + dx * 0.33 + nx * ja + o, y0 + dy * 0.33 + ny * ja + o);
        ctx.lineTo(x0 + dx * 0.66 + nx * jb + o, y0 + dy * 0.66 + ny * jb + o);
        ctx.lineTo(x1 + o, y1 + o);
      };
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
            seg(x0, y0, x1, y1, sh.jag[j][i][0], sh.jag[j][i][1], pass);
            [x0, y0] = [x1, y1];
          }
          const fk = sh.fork[i];
          if (fk && fk.j < sh.len[i] && sh.rad[fk.j][i] < grow) {
            const [xs, ys] = pt(i, fk.j);
            const R1 = sh.rad[fk.j][i] * (1 + fk.l);
            const an = sh.ang[i] + fk.da;
            seg(xs, ys, px + Math.cos(an) * R1, py + Math.sin(an) * R1, sh.jag[fk.j][i][1], sh.jag[fk.j][i][0], pass);
          }
          for (let j = 1; j < 5; j++) {
            if (j >= sh.len[i] || j >= sh.len[(i + 1) % sh.NR]) continue;
            if (sh.rad[j][i] > grow) continue;
            if (!(sh.fallen.has(i * 10 + j) || sh.fallen.has(i * 10 + j - 1))) continue;
            const [xa, ya] = pt(i, j);
            const [xb, yb] = pt(i + 1, j);
            seg(xa, ya, xb, yb, sh.jag[j][i][1] * 0.6, sh.jag[j][i][0] * 0.6, pass);
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
    OCC = [];
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
    drawWide(cb, t);
    drawHits(cb, t);
    drawFireworks(cb, t);
    drawMontage(cb, t);
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
