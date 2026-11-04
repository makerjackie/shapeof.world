// Publishing covers for 两千年世界人口: the whole line (log scale), its two falls in red, six catastrophes on leader lines.
// Same fonts, colours and data as the film (world7.ts). Stills: CoverW34 (1200x1600), CoverW43 (1600x1200);
// English (overseas): CoverWE34 (1200x1600), CoverWE169 (1920x1080, YouTube).
import React, { useEffect, useRef, useState } from "react";
import { AbsoluteFill, Composition, cancelRender, continueRender, delayRender, staticFile } from "remotion";
import { SANS, SERIF, fontsReady } from "../v6/fonts6";
import { SERIES, WORLD } from "../v6/world7";

const GOLD = "#ffc94d";
const RED = "#ff3b2f";
const WHITE = "#f3f4f7";
const BG = "#050608";
type Side = "left" | "center" | "right";
// m: per-layout placement overrides by year: row, side, and for row 0 the drop below the dot
type L = { en?: boolean; W: number; H: number; title: [number, number, number]; sub: [number, number, number]; chart: [number, number, number, number]; rib: number; lab: number; end: number; rowH: number; m: Record<number, [number, Side, number?]> };
const L34: L = { W: 1200, H: 1600, title: [600, 360, 142], sub: [600, 468, 60], chart: [110, 600, 1040, 1380], rib: 1478, lab: 30, end: 80, rowH: 92, m: { 1520: [-1, "center"], 1939: [0, "right", -4] } };
const L43: L = { W: 1600, H: 1200, title: [800, 280, 140], sub: [800, 380, 58], chart: [130, 470, 1420, 1030], rib: 1100, lab: 30, end: 80, rowH: 84, m: { 1520: [2, "right"], 1939: [0, "right", -4] } };
const LE34: L = { ...L34, en: true, title: [600, 330, 100], sub: [600, 462, 50] }; // two-line title
const LE169: L = { en: true, W: 1920, H: 1080, title: [960, 200, 104], sub: [960, 292, 50], chart: [160, 420, 1760, 880], rib: 960, lab: 30, end: 80, rowH: 72, m: { 1520: [-1, "center"], 1939: [0, "right", -4] } };
const LAST = 2025;
// English words
const EN: Record<string, string> = {
  安东尼瘟疫: "Antonine Plague", "500—1,000 万": "5–10 million", 查士丁尼瘟疫: "Plague of Justinian", "1,500 万—1 亿": "15–100 million",
  蒙古征服: "Mongol conquests", "2,000—6,000 万": "20–60 million", 黑死病: "Black Death", "欧洲 −30%—60%": "Europe −30–60%",
  美洲天花: "Smallpox", "美洲 −83%": "Americas −83%", 两次世界大战: "Two World Wars", "约 1 亿": "~100 million",
  古代: "Ancient", 中世纪: "Medieval", 近代: "Modern", 世界的形状: "Shape of the World",
};
// the catastrophes on the cover: year, name, toll, row above the line (1 = nearest), side of the text
const MARKS: [number, string, string, number, "left" | "center" | "right"][] = [
  [165, "安东尼瘟疫", "500—1,000 万", 1, "left"],
  [541, "查士丁尼瘟疫", "1,500 万—1 亿", 2, "center"],
  [1219, "蒙古征服", "2,000—6,000 万", 3, "right"],
  [1347, "黑死病", "欧洲 −30%—60%", 1, "center"],
  [1520, "美洲天花", "美洲 −83%", 2, "center"],
  [1939, "两次世界大战", "约 1 亿", 0, "right"], // row 0: beside the dot, on its left
];

const draw = (ctx: CanvasRenderingContext2D, l: L, logo: HTMLImageElement) => {
  const { W, H } = l;
  const w = (z: string) => (l.en ? EN[z] ?? z : z);
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  const [x0, y0, x1, y1] = l.chart;
  const pts = SERIES.filter((p) => p.y <= LAST && p.y >= 0);
  const vmin = Math.log10(14000);
  const vmax = Math.log10(1000000);
  const X = (y: number) => x0 + (y / LAST) * (x1 - x0);
  const Y = (v: number) => y1 - ((Math.log10(v) - vmin) / (vmax - vmin)) * (y1 - y0);
  const val = (y: number) => {
    for (let i = 1; i < pts.length; i++) if (pts[i].y >= y) return pts[i - 1].v + ((pts[i].v - pts[i - 1].v) * (y - pts[i - 1].y)) / (pts[i].y - pts[i - 1].y);
    return pts[pts.length - 1].v;
  };
  const g = ctx.createRadialGradient(X(1980), Y(500000), 10, X(1980), Y(500000), W * 0.6);
  g.addColorStop(0, "rgba(255,201,77,0.18)");
  g.addColorStop(1, "rgba(255,201,77,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const txt = (s: string, x: number, y: number, size: number, color: string, o: { font?: string; w?: number; align?: CanvasTextAlign; glow?: string; blur?: number; ls?: number } = {}) => {
    ctx.save();
    ctx.font = `${o.w ?? 900} ${size}px ${o.font ?? SERIF}`;
    ctx.textAlign = o.align ?? "left";
    if (o.ls) (ctx as any).letterSpacing = `${o.ls}px`;
    ctx.shadowColor = o.glow ?? "rgba(0,0,0,0.9)";
    ctx.shadowBlur = o.blur ?? 10;
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
    const w = ctx.measureText(s).width;
    ctx.restore();
    return w;
  };
  ctx.drawImage(logo, 56, 54, 52, 52);
  txt(w("世界的形状"), 122, 92, 32, WHITE, { font: SANS, ls: 2, blur: 0 });
  const [tx, ty, ts] = l.title;
  if (l.en && W < 1500) {
    txt("2,000 Years of", tx, ty - 62, ts, GOLD, { align: "center", ls: 1, glow: "rgba(255,201,77,0.45)", blur: 36 });
    txt("World Population", tx, ty + 46, ts, GOLD, { align: "center", ls: 1, glow: "rgba(255,201,77,0.45)", blur: 36 });
  } else txt(l.en ? "2,000 Years of World Population" : "两千年世界人口", tx, ty, ts, GOLD, { align: "center", ls: l.en ? 1 : 6, glow: "rgba(255,201,77,0.45)", blur: 36 });
  const [sx, sy, ss] = l.sub;
  ctx.font = `900 ${ss}px ${SERIF}`;
  const a = l.en ? "It fell only " : "只减少过 ";
  const n = "2";
  const b = l.en ? " times in 2,000 years" : " 次，看尽人类兴衰";
  const wa = ctx.measureText(a).width;
  const wb = ctx.measureText(b).width;
  ctx.font = `900 ${ss * 1.3}px ${SANS}`;
  const wn = ctx.measureText(n).width;
  const s0 = sx - (wa + wn + wb) / 2;
  txt(a, s0, sy, ss, WHITE);
  txt(n, s0 + wa, sy, ss * 1.3, RED, { font: SANS, glow: "rgba(255,59,47,0.7)", blur: 22 });
  txt(b, s0 + wa + wn, sy, ss, WHITE);

  // leader lines and labels first (under the line)
  for (const [y, name, toll, row0, side0] of MARKS) {
    const [row, side, dy = 0] = l.m[y] ?? [row0, side0];
    const xv = X(y);
    const yv = Y(val(y));
    if (row === 0) {
      txt(w(name), xv - 26, yv + dy, l.lab, WHITE, { align: "right" });
      txt(w(toll), xv - 26, yv + dy + 6 + l.lab, l.lab * 0.86, RED, { align: "right", font: SANS });
      continue;
    }
    if (row < 0) {
      // below the line, on a short leader
      ctx.save();
      ctx.strokeStyle = "rgba(255,59,47,0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(xv, yv + 12);
      ctx.lineTo(xv, yv + 44);
      ctx.stroke();
      ctx.restore();
      txt(w(name), xv, yv + 44 + l.lab + 6, l.lab, WHITE, { align: "center" });
      txt(w(toll), xv, yv + 44 + 2 * l.lab + 14, l.lab * 0.86, RED, { align: "center", font: SANS });
      continue;
    }
    const top = yv - 34 - row * l.rowH;
    ctx.save();
    ctx.strokeStyle = "rgba(255,59,47,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xv, yv - 12);
    ctx.lineTo(xv, top + 12);
    ctx.stroke();
    ctx.restore();
    const lx = side === "left" ? xv - 6 : side === "right" ? xv + 6 : xv;
    const al: CanvasTextAlign = side === "left" ? "left" : side === "right" ? "right" : "center";
    txt(w(name), lx, top - l.lab - 10, l.lab, WHITE, { align: al });
    txt(w(toll), lx, top, l.lab * 0.86, RED, { align: al, font: SANS });
  }
  // the line: gold, red where the world got smaller
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1];
    const q = pts[i];
    const fall = q.v < p.v;
    ctx.save();
    ctx.strokeStyle = fall ? RED : GOLD;
    ctx.lineWidth = fall ? 8 : 6;
    ctx.shadowColor = fall ? "rgba(255,59,47,0.7)" : "rgba(255,201,77,0.5)";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(X(p.y), Y(p.v));
    ctx.lineTo(X(q.y), Y(q.v));
    ctx.stroke();
    ctx.restore();
  }
  for (const [y] of MARKS) {
    ctx.save();
    ctx.fillStyle = RED;
    ctx.shadowColor = "rgba(255,59,47,0.9)";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(X(y), Y(val(y)), 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // start and end
  const v0 = val(1);
  txt(l.en ? "AD 1" : "公元 1 年", X(1) + 2, Y(v0) + 52, 30, WHITE, { font: SANS });
  txt(l.en ? `${Math.round(v0 / 100)} million` : `${(v0 / 10000).toFixed(1)} 亿`, X(1) + 2, Y(v0) + 100, 40, WHITE, { font: SANS });
  const ve = val(LAST);
  ctx.save();
  ctx.fillStyle = GOLD;
  ctx.shadowColor = GOLD;
  ctx.shadowBlur = 30;
  ctx.beginPath();
  ctx.arc(X(LAST), Y(ve), 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const es = l.en ? `${(ve / 100000).toFixed(1)} billion` : `${Math.round(ve / 10000)} 亿`;
  ctx.font = `900 ${l.end}px ${SANS}`;
  const ew = ctx.measureText(es).width;
  const ex = X(LAST) - 34 - ew;
  txt(es, ex, Y(ve) + 30, l.end, GOLD, { font: SANS, glow: "rgba(255,201,77,0.6)", blur: 26 });
  txt(l.en ? `${LAST}` : `${LAST} 年`, ex + ew, Y(ve) + 30 - l.end - 4, 30, WHITE, { font: SANS, align: "right" });
  // the era ribbon
  for (const [a0, a1, name, kind] of WORLD.dyn ?? []) {
    const xa = X(Math.max(0, a0));
    const xb = X(Math.min(LAST, a1));
    if (xb <= xa) continue;
    ctx.fillStyle = kind === 1 ? GOLD : kind === 2 ? WHITE : "#5b6068";
    ctx.globalAlpha = kind === 1 ? 0.9 : 0.75;
    ctx.fillRect(xa + 1, l.rib, xb - xa - 2, 10);
    ctx.globalAlpha = 1;
    if (name) txt(w(name), (xa + xb) / 2, l.rib + 50, 28, kind === 1 ? GOLD : "#aab0b8", { align: "center", blur: 0 });
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
        draw(ref.current!.getContext("2d")!, l, logo);
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

export const WorldCovers: React.FC = () => (
  <>
    <Composition id="CoverW34" component={() => <Cover l={L34} />} durationInFrames={1} fps={30} width={L34.W} height={L34.H} />
    <Composition id="CoverW43" component={() => <Cover l={L43} />} durationInFrames={1} fps={30} width={L43.W} height={L43.H} />
    <Composition id="CoverWE34" component={() => <Cover l={LE34} />} durationInFrames={1} fps={30} width={LE34.W} height={LE34.H} />
    <Composition id="CoverWE169" component={() => <Cover l={LE169} />} durationInFrames={1} fps={30} width={LE169.W} height={LE169.H} />
  </>
);
