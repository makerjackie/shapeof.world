// Publishing covers for 两千年中国人口: the whole line with its 8 falls, the title above it.
// Same fonts, colours and data as the film (china7.ts). Stills: Cover34 (1200x1600), Cover43 (1600x1200).
import React, { useEffect, useRef, useState } from "react";
import { AbsoluteFill, Composition, cancelRender, continueRender, delayRender, staticFile } from "remotion";
import { SANS, SERIF, fontsReady } from "../v6/fonts6";
import { CHINA, SERIES } from "../v6/china7";

const GOLD = "#ffc94d";
const RED = "#ff3b2f";
const WHITE = "#f3f4f7";
const BG = "#050608";

type L = {
  W: number;
  H: number;
  title: [number, number, number]; // x, baseline, size
  sub: [number, number, number];
  chart: [number, number, number, number]; // x0, y0 (top), x1, y1 (bottom)
  rib: number; // ribbon y
  lab: number; // crash label size
  end: number; // end number size
  center: boolean;
};
const L34: L = { W: 1200, H: 1600, title: [600, 360, 150], sub: [600, 470, 62], chart: [110, 640, 1040, 1370], rib: 1478, lab: 32, end: 76, center: true };
const L43: L = { W: 1600, H: 1200, title: [800, 290, 148], sub: [800, 390, 60], chart: [130, 520, 1420, 1010], rib: 1100, lab: 32, end: 76, center: true };

const LAST = 2025;
// where each fall's name sits relative to its trough, so the close ones don't collide
const OFF: Record<number, [number, number]> = {
  57: [0, 1],
  263: [0, 1],
  639: [-26, 1],
  760: [30, 2.25],
  1290: [0, 1],
  1682: [0, 1],
  1880: [-20, 1],
  1960: [66, 1],
};

const fmt = (v: number) => v.toLocaleString("en-US");

const draw = (ctx: CanvasRenderingContext2D, l: L, logo: HTMLImageElement) => {
  const { W, H } = l;
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  const [x0, y0, x1, y1] = l.chart;
  const pts = SERIES.filter((p) => p.y <= LAST);
  const vmin = Math.log10(600);
  const vmax = Math.log10(160000);
  const X = (y: number) => x0 + ((y - 2) / (LAST - 2)) * (x1 - x0);
  const Y = (v: number) => y1 - ((Math.log10(v) - vmin) / (vmax - vmin)) * (y1 - y0);
  const val = (y: number) => pts.find((p) => p.y === y)?.v ?? 0;

  // a warm glow behind the modern climb
  const g = ctx.createRadialGradient(X(1990), Y(120000), 10, X(1990), Y(120000), W * 0.55);
  g.addColorStop(0, "rgba(255,201,77,0.16)");
  g.addColorStop(1, "rgba(255,201,77,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const txt = (s: string, x: number, y: number, size: number, color: string, o: { font?: string; w?: number; align?: CanvasTextAlign; glow?: string; blur?: number; ls?: number } = {}) => {
    ctx.save();
    ctx.font = `${o.w ?? 900} ${size}px ${o.font ?? SERIF}`;
    ctx.textAlign = o.align ?? "left";
    ctx.textBaseline = "alphabetic";
    if (o.ls) (ctx as any).letterSpacing = `${o.ls}px`;
    ctx.shadowColor = o.glow ?? "rgba(0,0,0,0.9)";
    ctx.shadowBlur = o.blur ?? 10;
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
    const w = ctx.measureText(s).width;
    ctx.restore();
    return w;
  };

  // brand, top-left
  ctx.drawImage(logo, 56, 54, 52, 52);
  txt("世界的形状", 122, 92, 32, WHITE, { font: SANS, ls: 2, blur: 0 });

  // title
  const [tx, ty, ts] = l.title;
  txt("两千年中国人口", tx, ty, ts, GOLD, { align: "center", ls: 6, glow: "rgba(255,201,77,0.45)", blur: 36 });
  // sub: the red count, then the promise
  const [sx, sy, ss] = l.sub;
  ctx.font = `900 ${ss}px ${SERIF}`;
  const a = "8";
  const b = " 次人口大跌，看尽王朝兴衰";
  const wa = ctx.measureText(a).width * 1.25;
  const wb = ctx.measureText(b).width;
  const sx0 = sx - (wa + wb) / 2;
  txt(a, sx0, sy, ss * 1.25, RED, { glow: "rgba(255,59,47,0.7)", blur: 22 });
  txt(b, sx0 + wa, sy, ss, WHITE);

  // the line: gold where it grows, red where it falls; dashed across the gaps between records
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1];
    const q = pts[i];
    const fall = q.v < p.v;
    const gap = q.y - p.y > 40 || p.kind === "est" || q.kind === "est";
    ctx.save();
    ctx.strokeStyle = fall ? RED : GOLD;
    ctx.lineWidth = fall ? 6 : 5;
    ctx.shadowColor = fall ? "rgba(255,59,47,0.6)" : "rgba(255,201,77,0.5)";
    ctx.shadowBlur = 12;
    if (gap) ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.moveTo(X(p.y), Y(p.v));
    ctx.lineTo(X(q.y), Y(q.v));
    ctx.stroke();
    ctx.restore();
  }

  // the 8 falls: a red dot on each trough, name and size under it
  for (const c of CHINA.cold.crashes) {
    const xv = X(c.y);
    const yv = Y(val(c.y));
    ctx.save();
    ctx.fillStyle = RED;
    ctx.shadowColor = "rgba(255,59,47,0.9)";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(xv, yv, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    const [dx, k] = OFF[c.y] ?? [0, 1];
    const lx = xv + dx;
    const ly = yv + (k > 0 ? 46 + (k - 1) * 72 : -40 + (k + 1) * 72);
    const name = c.t === "1960" ? "1960" : c.t;
    txt(name, lx, ly, l.lab, WHITE, { align: "center", font: c.t === "1960" ? SANS : SERIF });
    txt(c.p ?? "", lx, ly + l.lab + 6, l.lab, RED, { align: "center", font: SANS });
  }

  // start and end
  const v0 = pts[0].v;
  txt("公元 2 年", X(2) - 4, Y(v0) - 74, 30, WHITE, { font: SANS });
  txt(`${fmt(Math.round(v0))} 万`, X(2) - 4, Y(v0) - 26, 40, WHITE, { font: SANS });
  const ve = val(LAST);
  ctx.save();
  ctx.fillStyle = GOLD;
  ctx.shadowColor = GOLD;
  ctx.shadowBlur = 30;
  ctx.beginPath();
  ctx.arc(X(LAST), Y(ve), 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const es = `${(ve / 10000).toFixed(2)} 亿`;
  ctx.font = `900 ${l.end}px ${SANS}`;
  const ew = ctx.measureText(es).width;
  const ex = Math.min(X(LAST) - 10, W - 60) - ew;
  txt(es, ex, Y(ve) - 40, l.end, GOLD, { font: SANS, glow: "rgba(255,201,77,0.6)", blur: 26 });
  txt(`${LAST} 年`, ex + ew, Y(ve) - 40 - l.end - 4, 30, WHITE, { font: SANS, align: "right" });

  // the dynasty ribbon
  const dyn = CHINA.dyn ?? [];
  for (const [a0, a1, name, kind] of dyn) {
    const xa = X(Math.max(2, a0));
    const xb = X(Math.min(LAST, a1));
    if (xb <= xa) continue;
    ctx.fillStyle = kind === 1 ? GOLD : kind === 2 ? WHITE : "#5b6068";
    ctx.globalAlpha = kind === 1 ? 0.9 : 0.75;
    ctx.fillRect(xa + 1, l.rib, xb - xa - 2, 10);
    ctx.globalAlpha = 1;
    if (name) txt(name, (xa + xb) / 2, l.rib + 50, 28, kind === 1 ? GOLD : "#aab0b8", { align: "center", blur: 0 });
  }
};

const Cover: React.FC<{ l: L }> = ({ l }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [handle] = useState(() => delayRender("cover fonts", { timeoutInMilliseconds: 60000 }));
  useEffect(() => {
    const logo = new Image();
    const img = new Promise<void>((res, rej) => {
      logo.onload = () => res();
      logo.onerror = rej;
    });
    logo.src = staticFile("mark-disc.png");
    Promise.all([fontsReady(), img]).then(
      () => {
        const ctx = ref.current!.getContext("2d")!;
        draw(ctx, l, logo);
        continueRender(handle);
      },
      (e) => cancelRender(e),
    );
  }, [handle, l]);
  return (
    <AbsoluteFill style={{ background: BG }}>
      <canvas ref={ref} width={l.W} height={l.H} />
    </AbsoluteFill>
  );
};

export const CoverRoot: React.FC = () => (
  <>
    <Composition id="Cover34" component={() => <Cover l={L34} />} durationInFrames={1} fps={30} width={L34.W} height={L34.H} />
    <Composition id="Cover43" component={() => <Cover l={L43} />} durationInFrames={1} fps={30} width={L43.W} height={L43.H} />
  </>
);
