// After 2025: the whole births chart, total population with the UN projection to 2100, the world top 10 in 2100,
// the question, the end card.
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { continueRender, delayRender, Easing, Img, staticFile, useCurrentFrame } from "remotion";
import { camAt, sx, sy } from "./camera";
import { CN, CN_UN, popAt, row, Y0, Y1 } from "./data";
import { clamp01, lerp, Panel, useBar, vis } from "./Hud";
import { mono } from "./plan";
import { C, FONT_CN, FONT_LAT, FONT_NUM } from "./theme";
import { FPS, H, toBar, W } from "./time";

const EO = Easing.bezier(0.16, 1, 0.3, 1);
const EIO = Easing.bezier(0.65, 0, 0.35, 1);
const TS = "0 2px 8px rgba(0,0,0,0.9), 0 0 30px rgba(0,0,0,0.75)";

// ---------------------------------------------------------------- E1 marks on the whole births chart
export const OverviewMarks: React.FC = () => {
  const bar = useBar();
  const v = vis(bar, 79.2, 84.0, 0.3, 0.4) + vis(bar, 97.6, 101, 0.3, 0.3);
  if (v <= 0) return null;
  const cam = camAt(bar);
  const mk = (y: number, label: string, col: string, dy = -70) => (
    <div key={y} style={{ position: "absolute", left: sx(cam, y), top: sy(cam, row(y).b) + dy, transform: "translateX(-50%)", textAlign: "center", whiteSpace: "nowrap" }}>
      <div style={{ fontFamily: FONT_NUM, fontWeight: 800, fontSize: 40, color: col, textShadow: TS }}>{Math.round(row(y).b).toLocaleString("en-US")}万</div>
      <div style={{ fontFamily: FONT_NUM, fontWeight: 600, fontSize: 26, color: "#c8cdd8", textShadow: TS }}>{label}</div>
    </div>
  );
  return (
    <div style={{ position: "absolute", inset: 0, opacity: Math.min(1, v) }}>
      {mk(1963, "1963", C.upHi, -96)}
      {mk(1987, "1987", C.upHi, -96)}
      {mk(2025, "2025", C.downHi, -96)}
    </div>
  );
};

// ---------------------------------------------------------------- E2 total population + UN projection
const PX0 = 1944;
const PX1 = 2106;
const PB = 1460;
const PT = 760;
const PMAX = 160000; // 万
const px = (x: number) => ((x - PX0) / (PX1 - PX0)) * W;
const py = (v: number) => PB - (v / PMAX) * (PB - PT);
export const PCUR = mono([[84.2, 1949], [86.2, 2025], [87.0, 2025], [90.2, 2100], [104, 2100]]);
const unAt = (x: number) => {
  const y0 = Math.floor(x);
  const a = CN_UN[String(Math.min(2100, Math.max(2025, y0)))];
  const b = CN_UN[String(Math.min(2100, Math.max(2025, y0 + 1)))];
  return lerp(a, b, x - y0) * 10000;
};
const X1956 = (() => {
  const t = unAt(2100);
  for (let y = 1949; y < 2000; y++) if (row(y).pop <= t && row(y + 1).pop > t) return y + (t - row(y).pop) / (row(y + 1).pop - row(y).pop);
  return 1956;
})();

const drawPop = (ctx: CanvasRenderingContext2D, bar: number) => {
  ctx.clearRect(0, 0, W, H);
  const c = PCUR(bar);
  // grid
  ctx.font = `600 22px ${FONT_NUM}`;
  ctx.textBaseline = "middle";
  for (let v = 20000; v < PMAX; v += 20000) {
    ctx.strokeStyle = "rgba(160,175,200,0.10)";
    ctx.beginPath();
    ctx.moveTo(0, py(v));
    ctx.lineTo(W, py(v));
    ctx.stroke();
    ctx.fillStyle = "rgba(170,180,200,0.42)";
    ctx.textAlign = "left";
    ctx.fillText(`${v / 10000}亿`, 22, py(v) - 14);
  }
  ctx.strokeStyle = "rgba(170,185,210,0.28)";
  ctx.beginPath();
  ctx.moveTo(0, PB);
  ctx.lineTo(W, PB);
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.font = `600 24px ${FONT_NUM}`;
  for (let y = 1950; y <= 2100; y += 25) {
    ctx.fillStyle = y <= c ? "rgba(200,208,224,0.6)" : "rgba(200,208,224,0.2)";
    ctx.fillText(String(y), px(y), PB + 30);
  }
  // area under the real line
  const xr = Math.min(c, Y1);
  const g = ctx.createLinearGradient(0, PT, 0, PB);
  g.addColorStop(0, "rgba(255,59,87,0.32)");
  g.addColorStop(1, "rgba(255,59,87,0.02)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(px(Y0), PB);
  for (let y = Y0; y < xr; y++) ctx.lineTo(px(y), py(row(y).pop));
  ctx.lineTo(px(xr), py(popAt(xr)));
  ctx.lineTo(px(xr), PB);
  ctx.closePath();
  ctx.fill();
  // real line
  ctx.save();
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(255,60,90,1)";
  ctx.shadowBlur = 22;
  ctx.strokeStyle = "#fff1ec";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(px(Y0), py(row(Y0).pop));
  for (let y = Y0 + 1; y < xr; y++) ctx.lineTo(px(y), py(row(y).pop));
  ctx.lineTo(px(xr), py(popAt(xr)));
  ctx.stroke();
  // projection
  if (c > 2025) {
    ctx.setLineDash([14, 12]);
    ctx.shadowColor = "rgba(120,190,255,1)";
    ctx.strokeStyle = "#cfe8ff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(px(2025), py(popAt(2025)));
    for (let y = 2026; y < c; y++) ctx.lineTo(px(y), py(unAt(y)));
    ctx.lineTo(px(c), py(unAt(c)));
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
  // head
  const hx = px(c);
  const hy = py(c <= 2025 ? popAt(c) : unAt(c));
  const rg = ctx.createRadialGradient(hx, hy, 0, hx, hy, 60);
  rg.addColorStop(0, c <= 2025 ? "rgba(255,80,110,0.9)" : "rgba(120,190,255,0.9)");
  rg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(hx, hy, 60, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(hx, hy, 8, 0, Math.PI * 2);
  ctx.fill();
  // 2100 back to the 1950s
  const k = clamp01((bar - 90.4) / 1.2);
  if (k > 0) {
    const yv = py(unAt(2100));
    ctx.setLineDash([6, 8]);
    ctx.strokeStyle = `rgba(255,207,92,0.9)`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(px(2100), yv);
    ctx.lineTo(lerp(px(2100), px(X1956), EIO(k)), yv);
    ctx.stroke();
    ctx.setLineDash([]);
    if (k >= 1) {
      ctx.fillStyle = C.gold;
      ctx.beginPath();
      ctx.arc(px(X1956), yv, 9, 0, Math.PI * 2);
      ctx.fill();
    }
  }
};

export const PopChart: React.FC<{ opacity: number }> = ({ opacity }) => {
  const frame = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  const [handle] = useState(() => delayRender("pop fonts"));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    document.fonts.ready.then(() => {
      setReady(true);
      continueRender(handle);
    });
  }, [handle]);
  useLayoutEffect(() => {
    if (!ready || !ref.current || opacity <= 0) return;
    drawPop(ref.current.getContext("2d")!, toBar(frame / FPS));
  });
  if (opacity <= 0) return null;
  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0, opacity }} />;
};

export const PopText: React.FC = () => {
  const bar = useBar();
  const v = vis(bar, 84.2, 92.4, 0.3, 0.4);
  if (v <= 0) return null;
  const c = PCUR(bar);
  const proj = c > 2025.001;
  const val = proj ? unAt(c) / 10000 : popAt(c) / 10000;
  const peak = vis(bar, 85.6, 92.4, 0.3, 0.3);
  const end = vis(bar, 90.3, 92.4, 0.3, 0.3);
  const back = vis(bar, 91.0, 92.4, 0.3, 0.3);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: v }}>
      <div style={{ position: "absolute", left: 60, top: 252 }}>
        <div style={{ fontFamily: FONT_CN, fontWeight: 700, fontSize: 30, color: C.sub }}>
          中国总人口{" "}
          {proj && <span style={{ fontSize: 24, color: "#cfe8ff", border: "1px solid rgba(160,210,255,0.6)", borderRadius: 5, padding: "0 8px", marginLeft: 8 }}>联合国预测 · 中方案</span>}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontFamily: FONT_NUM, fontWeight: 800, fontSize: 150, lineHeight: 1, color: proj ? "#cfe8ff" : C.up, textShadow: proj ? "0 0 30px rgba(120,190,255,0.5)" : "0 0 30px rgba(255,59,87,0.5)" }}>{val.toFixed(2)}</span>
          <span style={{ fontFamily: FONT_CN, fontWeight: 700, fontSize: 48, color: C.fg }}>亿</span>
          <span style={{ fontFamily: FONT_NUM, fontWeight: 700, fontSize: 64, color: C.fg, marginLeft: 26 }}>{Math.floor(c)}</span>
        </div>
      </div>
      <div style={{ position: "absolute", left: px(2021), top: py(141260) - 100, transform: "translateX(-60%)", opacity: peak, textAlign: "center", whiteSpace: "nowrap" }}>
        <div style={{ fontFamily: FONT_CN, fontWeight: 900, fontSize: 36, color: C.upHi, textShadow: TS }}>峰值 14.13 亿</div>
        <div style={{ fontFamily: FONT_NUM, fontWeight: 600, fontSize: 26, color: "#c8cdd8", textShadow: TS }}>2021</div>
      </div>
      <div style={{ position: "absolute", right: 40, top: py(unAt(2100)) + 26, opacity: end, textAlign: "right", whiteSpace: "nowrap" }}>
        <div style={{ fontFamily: FONT_CN, fontWeight: 900, fontSize: 40, color: "#cfe8ff", textShadow: TS }}>2100 年 · 约 {(unAt(2100) / 10000).toFixed(1)} 亿</div>
      </div>
      <div style={{ position: "absolute", left: px(X1956) - 30, top: py(unAt(2100)) - 104, opacity: back, whiteSpace: "nowrap" }}>
        <div style={{ fontFamily: FONT_CN, fontWeight: 900, fontSize: 44, color: C.gold, textShadow: "0 0 24px rgba(255,207,92,0.6)" }}>≈ 1956 年的人口</div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- E3 world top 10, 2025 → 2100
const WCUR = mono([[92.6, 2025], [93.4, 2025], [96.0, 2100], [104, 2100]]);
export const WorldTop: React.FC = () => {
  const bar = useBar();
  const v = vis(bar, 92.4, 97.2, 0.3, 0.35);
  if (v <= 0) return null;
  const y = WCUR(bar);
  const fut = y > 2025.01;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: v, background: "rgba(4,5,7,0.82)" }}>
      <div style={{ position: "absolute", left: 90, top: 300 }}>
        <div style={{ fontFamily: FONT_CN, fontWeight: 900, fontSize: 56, color: C.fg }}>世界人口前十</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 6 }}>
          <span style={{ fontFamily: FONT_NUM, fontWeight: 800, fontSize: 96, color: fut ? "#cfe8ff" : C.fg }}>{Math.floor(y)}</span>
          <span style={{ fontFamily: FONT_CN, fontWeight: 500, fontSize: 28, color: C.sub }}>{fut ? "联合国预测 · 中方案" : "联合国估算"}</span>
        </div>
      </div>
      <div style={{ position: "absolute", left: 90, top: 540 }}>
        <Panel opacity={1} yearF={y} n={10} big />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- E4 the question
export const Question: React.FC = () => {
  const bar = useBar();
  const v = vis(bar, 97.4, 101.0, 0.35, 0.3);
  if (v <= 0) return null;
  const k = EO(clamp01((bar - 97.4) / 0.6));
  const cam = camAt(bar);
  const sweep = clamp01((bar - 98.2) / 2.4);
  const yr = lerp(Y0, Y1, EIO(sweep));
  const x = sx(cam, yr);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: v }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 360, textAlign: "center", transform: `translateY(${(1 - k) * 30}px)`, opacity: k }}>
        <div style={{ fontFamily: FONT_CN, fontWeight: 500, fontSize: 38, color: C.sub, textShadow: TS }}>1949 — 2025，77 根柱子</div>
        <div style={{ fontFamily: FONT_CN, fontWeight: 900, fontSize: 76, color: C.fg, marginTop: 16, textShadow: TS }}>你出生那年，是哪一根？</div>
      </div>
      {sweep > 0 && sweep < 1 && (
        <>
          <div style={{ position: "absolute", left: x - 1, top: 780, width: 2, height: 720, background: "linear-gradient(180deg, rgba(255,207,92,0), rgba(255,207,92,0.9))", boxShadow: "0 0 16px rgba(255,207,92,0.9)" }} />
          <div style={{ position: "absolute", left: x, top: 1530, transform: "translateX(-50%)", fontFamily: FONT_NUM, fontWeight: 800, fontSize: 40, color: C.gold }}>{Math.round(yr)}</div>
        </>
      )}
      <div style={{ position: "absolute", left: 0, right: 0, top: 1600, textAlign: "center", fontFamily: FONT_CN, fontWeight: 500, fontSize: 22, color: C.muted }}>
        数据：国家统计局 · 联合国《世界人口展望 2024》
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- end card
export const EndCard: React.FC = () => {
  const bar = useBar();
  const v = vis(bar, 101.0, 104.5, 0.4, 0.1);
  if (v <= 0) return null;
  const k = EO(clamp01((bar - 101.0) / 0.8));
  return (
    <div style={{ position: "absolute", inset: 0, background: "#040507", opacity: v }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 780, display: "flex", flexDirection: "column", alignItems: "center", transform: `scale(${0.94 + 0.06 * k})` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <Img src={staticFile("mark-disc.png")} style={{ width: 96, height: 96, borderRadius: 48 }} />
          <span style={{ fontFamily: FONT_CN, fontWeight: 900, fontSize: 76, color: C.fg, letterSpacing: 4 }}>世界的形状</span>
        </div>
        <div style={{ fontFamily: FONT_CN, fontWeight: 500, fontSize: 34, color: C.sub, marginTop: 26, letterSpacing: 6 }}>看见世界如何运行</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1420, textAlign: "center", fontFamily: FONT_LAT, fontWeight: 700, fontSize: 30, color: C.muted, letterSpacing: 3 }}>MakerJackie</div>
    </div>
  );
};
export { CN };
