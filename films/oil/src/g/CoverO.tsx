// Covers for 油价一百六十年, to the house rule (films/DIRECTOR.md 封面和标题): the question in plain words, the film's
// own picture (the whole 1859-2026 line on a log scale, zero and below on the floor, over the engraved oil field), a
// cream brand bar on top (mark + 世界的形状 left, 看见世界如何运行 right, ~6% of the height). One design, laid out per
// ratio: 16:9 (1920x1080, words left, line right), 4:3 (1440x1080) and 3:4 (1080x1440) with the words centred so a
// platform's centre crop keeps them whole.
import React, { useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, cancelRender, continueRender, delayRender, staticFile } from "remotion";
import { SANS, SERIF, fontsReady } from "./fonts6";
import { SERIES } from "./oil";

const GOLD = "#ffc94d";
const RED = "#ff3b2f";
const WHITE = "#f6f7f8";
const PEAK = { y: 2008.5027, v: 145.29 };
const NOW = { y: 2026.263, v: 112.95 };
const NEG = { y: 2020.3, v: -37.63 };
const Q1 = "1 桶油的价格";
const Q2 = "到底谁说了算？";

type L = { W: number; H: number; align: CanvasTextAlign; tx: number; q1: number; q2: number; qs: number; cx0: number; cx1: number; cy0: number; cy1: number; ls: number };
const L34: L = { W: 1080, H: 1440, align: "center", tx: 540, q1: 330, q2: 482, qs: 128, cx0: 80, cx1: 1000, cy0: 690, cy1: 1150, ls: 1 };
const L43: L = { W: 1440, H: 1080, align: "center", tx: 720, q1: 230, q2: 356, qs: 108, cx0: 130, cx1: 1310, cy0: 480, cy1: 860, ls: 0.95 };
const L169: L = { W: 1920, H: 1080, align: "left", tx: 120, q1: 400, q2: 552, qs: 130, cx0: 960, cx1: 1800, cy0: 270, cy1: 800, ls: 0.95 };

const txt = (ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, w: number, fam: string, col: string | CanvasGradient, align: CanvasTextAlign = "left", glow?: string, blur = 0) => {
  ctx.font = `${w} ${size}px ${fam}`;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = col;
  ctx.shadowColor = glow ?? "transparent";
  ctx.shadowBlur = blur;
  ctx.fillText(s, x, y);
  ctx.shadowBlur = 0;
  return ctx.measureText(s).width;
};

// the house brand bar: cream, dark brown words, the round mark
const brandBar = (ctx: CanvasRenderingContext2D, W: number, H: number, logo: HTMLImageElement | null) => {
  const h = Math.round(H * 0.06);
  ctx.fillStyle = "#efe6d2";
  ctx.fillRect(0, 0, W, h);
  const pad = h * 0.6;
  const ms = h * 0.72;
  if (logo) ctx.drawImage(logo, pad, (h - ms) / 2, ms, ms);
  ctx.textBaseline = "middle";
  ctx.font = `700 ${h * 0.42}px ${SERIF}`;
  ctx.fillStyle = "#1d160e";
  ctx.textAlign = "left";
  (ctx as unknown as { letterSpacing: string }).letterSpacing = "2px";
  ctx.fillText("世界的形状", pad + ms + h * 0.22, h / 2 + 1);
  ctx.font = `700 ${h * 0.32}px ${SERIF}`;
  ctx.textAlign = "right";
  (ctx as unknown as { letterSpacing: string }).letterSpacing = `${Math.round(h * 0.18)}px`;
  ctx.fillText("看见世界如何运行", W - pad, h / 2 + 1);
  (ctx as unknown as { letterSpacing: string }).letterSpacing = "0px";
  ctx.textBaseline = "alphabetic";
};

const draw = (ctx: CanvasRenderingContext2D, l: L, logo: HTMLImageElement | null, field: HTMLImageElement | null) => {
  const { W, H } = l;
  const wide = l.align === "left";
  const bg = ctx.createRadialGradient(W * 0.55, H * 0.55, 50, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
  bg.addColorStop(0, "#1d160b");
  bg.addColorStop(1, "#050403");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  // the engraved oil field along the bottom, under the line
  if (field) {
    const fw = W * (wide ? 0.62 : W > H ? 0.95 : 1.15);
    const fh = (fw * field.height) / field.width;
    ctx.globalAlpha = 0.36;
    ctx.drawImage(field, (wide ? (l.cx0 + l.cx1) / 2 : W / 2) - fw / 2, H - fh * 0.62, fw, fh);
    ctx.globalAlpha = 1;
  }
  // the line: log scale, 1859 to now
  const y0 = 1859.5;
  const y1 = SERIES[SERIES.length - 1].y;
  const L0 = Math.log10(0.3);
  const L1 = Math.log10(300);
  const X = (y: number) => l.cx0 + ((y - y0) / (y1 - y0)) * (l.cx1 - l.cx0);
  const Y = (v: number) => l.cy1 - ((Math.log10(Math.max(v, 0.3)) - L0) / (L1 - L0)) * (l.cy1 - l.cy0);
  const pts: [number, number][] = [];
  let lx = -1e9;
  for (const p of SERIES) {
    const px = X(p.y);
    if (px - lx < 1 && p.kind !== "p" && p.v > 0) continue;
    lx = px;
    pts.push([px, Y(p.v)]);
  }
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 10]);
  for (const v of [1, 10, 100]) {
    ctx.beginPath();
    ctx.moveTo(l.cx0, Y(v));
    ctx.lineTo(l.cx1, Y(v));
    ctx.stroke();
    if (v !== 10) txt(ctx, "$" + v, l.cx0 + 4, Y(v) - 10, 24 * l.ls, 500, SANS, "rgba(255,255,255,0.35)");
  }
  ctx.setLineDash([]);
  const fill = ctx.createLinearGradient(0, l.cy0, 0, l.cy1 + 40);
  fill.addColorStop(0, "rgba(255,190,60,0.28)");
  fill.addColorStop(1, "rgba(255,190,60,0)");
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], l.cy1 + 40);
  pts.forEach(([a, b]) => ctx.lineTo(a, b));
  ctx.lineTo(pts[pts.length - 1][0], l.cy1 + 40);
  ctx.closePath();
  ctx.fill();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const path = () => {
    ctx.beginPath();
    pts.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)));
  };
  ctx.strokeStyle = "rgba(255,201,77,0.25)";
  ctx.lineWidth = 20;
  path();
  ctx.stroke();
  ctx.strokeStyle = GOLD;
  ctx.shadowColor = GOLD;
  ctx.shadowBlur = 18;
  ctx.lineWidth = 7;
  path();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#fff4cf";
  ctx.lineWidth = 2;
  path();
  ctx.stroke();
  const dot = (y: number, v: number, col: string, r: number) => {
    ctx.fillStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(X(y), Y(v), r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  };
  const S = l.ls;
  dot(1859.5, 16, WHITE, 9);
  txt(ctx, "1859 年 · 16 美元", X(1859.5) + 4, Y(16) - 26, 34 * S, 900, SERIF, WHITE, "left", "rgba(0,0,0,0.9)", 8);
  dot(1861.5, 0.49, RED, 9);
  txt(ctx, "1861 · 0.49", X(1861.5) + 16, Y(0.49) + 12, 30 * S, 900, SANS, "#ff8a80", "left", "rgba(0,0,0,0.9)", 8);
  dot(1980.29, 39.5, GOLD, 9);
  txt(ctx, "1980 · 39.50", X(1980.29) - 18, Y(39.5) - 24, 30 * S, 900, SANS, GOLD, "right", "rgba(0,0,0,0.9)", 8);
  dot(NEG.y, 0.3, RED, 11);
  txt(ctx, "2020 · −37.63", X(NEG.y) - 18, Y(0.3) + 8, 36 * S, 900, SANS, "#ff6a5e", "right", "rgba(0,0,0,0.95)", 10);
  dot(PEAK.y, PEAK.v, GOLD, 9);
  txt(ctx, "2008 · 145", X(PEAK.y) - 18, Y(PEAK.v) - 24, 30 * S, 900, SANS, GOLD, "right", "rgba(0,0,0,0.9)", 8);
  const px = X(NOW.y);
  const py = Y(NOW.v);
  const halo = ctx.createRadialGradient(px, py, 0, px, py, 150);
  halo.addColorStop(0, "rgba(255,240,200,0.9)");
  halo.addColorStop(0.25, "rgba(255,201,77,0.45)");
  halo.addColorStop(1, "rgba(255,201,77,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(px - 150, py - 150, 300, 300);
  ctx.strokeStyle = "rgba(255,230,160,0.85)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(px + Math.cos(a) * 34, py + Math.sin(a) * 34);
    ctx.lineTo(px + Math.cos(a) * (60 + (i % 2) * 26), py + Math.sin(a) * (60 + (i % 2) * 26));
    ctx.stroke();
  }
  dot(NOW.y, NOW.v, WHITE, 11);
  txt(ctx, "2026 · 113", px + 40, py - 96, 40 * S, 900, SANS, GOLD, "right", "rgba(0,0,0,0.95)", 10);
  for (const yy of [1900, 1950, 2000]) txt(ctx, String(yy), X(yy), l.cy1 + 66, 28 * S, 600, SANS, "rgba(255,255,255,0.45)", "center");
  // the question: white, then gold
  if (wide) {
    const sh = ctx.createLinearGradient(0, 0, W * 0.55, 0);
    sh.addColorStop(0, "rgba(5,4,3,0.75)");
    sh.addColorStop(1, "rgba(5,4,3,0)");
    ctx.fillStyle = sh;
    ctx.fillRect(0, 0, W * 0.55, H);
  }
  ctx.font = `900 ${l.qs}px ${SERIF}`;
  const room = wide ? l.cx0 - l.tx - 60 : W - 2 * 70;
  const qs = Math.min(l.qs, (l.qs * room) / ctx.measureText(Q2).width);
  txt(ctx, Q1, l.tx, l.q1, qs * 0.86, 900, SERIF, WHITE, l.align, "rgba(0,0,0,0.85)", 30);
  const tg = ctx.createLinearGradient(0, l.q2 - qs, 0, l.q2);
  tg.addColorStop(0, "#fff1b8");
  tg.addColorStop(0.55, GOLD);
  tg.addColorStop(1, "#c98a12");
  txt(ctx, Q2, l.tx, l.q2, qs, 900, SERIF, tg, l.align, "rgba(255,190,60,0.5)", 36);
  brandBar(ctx, W, H, logo);
};

const Cover: React.FC<{ l: L }> = ({ l }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [handle] = useState(() => delayRender("cover fonts"));
  useLayoutEffect(() => {
    const load = (src: string) =>
      new Promise<HTMLImageElement | null>((res) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = () => res(null);
        im.src = staticFile(src);
      });
    Promise.all([fontsReady(), load("mark-disc.png"), load("art/field.png")]).then(
      ([, logo, field]) => {
        draw(ref.current!.getContext("2d")!, l, logo, field);
        continueRender(handle);
      },
      (e) => cancelRender(e),
    );
  }, [handle, l]);
  return (
    <AbsoluteFill style={{ background: "#060504" }}>
      <canvas ref={ref} width={l.W} height={l.H} />
    </AbsoluteFill>
  );
};
export const Cover34: React.FC = () => <Cover l={L34} />;
export const Cover43: React.FC = () => <Cover l={L43} />;
export const Cover169: React.FC = () => <Cover l={L169} />;
