// Covers for 油价一百六十年: the whole 1859-2026 line on a log scale (zero and below sit on the floor), the title, the swing, the question.
// Cover34 = 1200x1600 (vertical main cover), Cover43 = 1600x1200 (Bilibili / horizontal cover).
import React, { useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, cancelRender, continueRender, delayRender, staticFile } from "remotion";
import { SANS, SERIF, fontsReady } from "./fonts6";
import { SERIES } from "./oil";

const GOLD = "#ffc94d";
const RED = "#ff3b2f";
const SOFT = "#c4c9cd";
const WHITE = "#f6f7f8";
const PEAK = { y: 2008.5027, v: 145.29 };
const NOW = { y: 2026.2630, v: 112.95 };
const NEG = { y: 2020.3, v: -37.63 };

type L = { W: number; H: number; tx: number; ty: number; ts: number; align: CanvasTextAlign; cx0: number; cx1: number; cy0: number; cy1: number; sub: number; q: number };
const L34: L = { W: 1200, H: 1600, tx: 600, ty: 330, ts: 200, align: "center", cx0: 90, cx1: 1080, cy0: 760, cy1: 1420, sub: 450, q: 540 };
const L169: L = { W: 1920, H: 1080, tx: 110, ty: 230, ts: 150, align: "left", cx0: 110, cx1: 1800, cy0: 470, cy1: 940, sub: 340, q: 420 };
type Tx = { brand: string; title: string; parts: [string, number, string][]; q: string; start: string; years: string };
const ZH: Tx = {
  brand: "世界的形状",
  title: "油价一百六十年",
  parts: [
    ["1 桶原油：", 56, WHITE],
    ["−37", 92, RED],
    [" 美元 → ", 56, WHITE],
    ["113", 92, GOLD],
    [" 美元", 56, WHITE],
  ],
  q: "油价，到底是谁定的？",
  start: "1859 年 · 16 美元",
  years: "",
};
const ENX: Tx = ZH;
const L43: L = { W: 1600, H: 1200, tx: 110, ty: 270, ts: 150, align: "left", cx0: 110, cx1: 1470, cy0: 560, cy1: 1060, sub: 360, q: 440 };

const txt = (ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, w: number, fam: string, col: string, align: CanvasTextAlign = "left", glow?: string, blur = 0) => {
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

const draw = (ctx: CanvasRenderingContext2D, l: L, logo: HTMLImageElement | null, X0: Tx) => {
  const { W, H } = l;
  const bg = ctx.createRadialGradient(W * 0.55, H * 0.55, 50, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
  bg.addColorStop(0, "#1d160b");
  bg.addColorStop(1, "#050403");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  // brand
  {
    ctx.font = `900 30px ${SANS}`;
    const bw = 56 + ctx.measureText(X0.brand).width;
    const bx = l.align === "center" ? W / 2 - bw / 2 : l.tx;
    if (logo) ctx.drawImage(logo, bx, 70, 44, 44);
    txt(ctx, X0.brand, bx + 56, 104, 30, 900, SANS, "#e9ebee");
  }
  // title, the price span, the question
  const tg = ctx.createLinearGradient(0, l.ty - l.ts, 0, l.ty);
  tg.addColorStop(0, "#fff1b8");
  tg.addColorStop(0.55, GOLD);
  tg.addColorStop(1, "#c98a12");
  ctx.font = `900 ${l.ts}px ${SERIF}`;
  const ts = Math.min(l.ts, (l.ts * (W - 2 * 90)) / ctx.measureText(X0.title).width);
  txt(ctx, X0.title, l.tx, l.ty, ts, 900, SERIF, tg as unknown as string, l.align, "rgba(255,190,60,0.55)", 40);
  // 1 盎司黄金：19 美元 → 5,318 美元 (5,318 big and gold)
  const parts = X0.parts;
  let tw = 0;
  for (const [s, size] of parts) {
    ctx.font = `900 ${size}px ${size > 60 ? SANS : SERIF}`;
    tw += ctx.measureText(s).width;
  }
  let x = l.align === "center" ? W / 2 - tw / 2 : l.tx;
  for (const [s, size, col] of parts) x += txt(ctx, s, x, l.sub, size, 900, size > 60 ? SANS : SERIF, col, "left", col === GOLD ? "rgba(255,201,77,0.5)" : undefined, col === GOLD ? 18 : 0);
  ctx.font = `900 58px ${SERIF}`;
  const qs = Math.min(58, (58 * (W - 2 * 90)) / ctx.measureText(X0.q).width);
  txt(ctx, X0.q, l.align === "center" ? W / 2 : l.tx, l.q, qs, 900, SERIF, SOFT, l.align);
  // the line: log scale, 1792 to now
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
    if (px - lx < 1 && p.kind !== "p") continue;
    lx = px;
    pts.push([px, Y(p.v)]);
  }
  // grid
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 10]);
  for (const v of [1, 10, 100]) {
    const lab = v !== 10;
    ctx.beginPath();
    ctx.moveTo(l.cx0, Y(v));
    ctx.lineTo(l.cx1, Y(v));
    ctx.stroke();
    if (lab) txt(ctx, "$" + v.toLocaleString("en-US"), l.cx0 + 4, Y(v) - 10, 24, 500, SANS, "rgba(255,255,255,0.35)");
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
  // marks: where it starts, Nixon, the 1980 high, the 2001 low, the top
  const dot = (y: number, v: number, col: string, r: number) => {
    ctx.fillStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(X(y), Y(v), r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  };
  dot(1859.5, 16, WHITE, 9);
  txt(ctx, X0.start, X(1859.5) + 4, Y(16) - 26, 34, 900, SERIF, WHITE, "left", "rgba(0,0,0,0.9)", 8);
  dot(1861.5, 0.49, RED, 9);
  txt(ctx, "1861 · 0.49", X(1861.5) + 16, Y(0.49) + 12, 30, 900, SANS, "#ff8a80", "left", "rgba(0,0,0,0.9)", 8);
  dot(1980.29, 39.5, GOLD, 9);
  txt(ctx, "1980 · 39.50", X(1980.29) - 18, Y(39.5) - 24, 30, 900, SANS, GOLD, "right", "rgba(0,0,0,0.9)", 8);
  dot(NEG.y, 0.3, RED, 11);
  txt(ctx, "2020 · −37.63", X(NEG.y) - 18, Y(0.3) + 8, 34, 900, SANS, "#ff6a5e", "right", "rgba(0,0,0,0.95)", 10);
  dot(PEAK.y, PEAK.v, GOLD, 9);
  txt(ctx, "2008 · 145", X(PEAK.y) - 18, Y(PEAK.v) - 24, 30, 900, SANS, GOLD, "right", "rgba(0,0,0,0.9)", 8);
  // the top, with a burst
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
  txt(ctx, "2026 · 113", px - 30, py + 130, 40, 900, SANS, GOLD, "right", "rgba(0,0,0,0.95)", 10);
  // years along the bottom
  for (const yy of [1900, 1950, 2000]) txt(ctx, String(yy), X(yy), l.cy1 + 70, 28, 600, SANS, "rgba(255,255,255,0.45)", "center");
};

const Cover: React.FC<{ l: L; x?: Tx }> = ({ l, x = ZH }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [handle] = useState(() => delayRender("cover fonts"));
  useLayoutEffect(() => {
    const logo = new Image();
    const img = new Promise<HTMLImageElement | null>((res) => {
      logo.onload = () => res(logo);
      logo.onerror = () => res(null);
      logo.src = staticFile("mark-disc.png");
    });
    Promise.all([fontsReady(), img]).then(
      ([, im]) => {
        draw(ref.current!.getContext("2d")!, l, im, x);
        continueRender(handle);
      },
      (e) => cancelRender(e),
    );
  }, [handle, l, x]);
  return (
    <AbsoluteFill style={{ background: "#060504" }}>
      <canvas ref={ref} width={l.W} height={l.H} />
    </AbsoluteFill>
  );
};
export const Cover34: React.FC = () => <Cover l={L34} />;
export const Cover43: React.FC = () => <Cover l={L43} />;
void ENX;
void L169;
