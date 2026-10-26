// v18 style frames: three directions for the opening, three moments each (the Three-Body books, the price
// comparison, the $200), as stills to pick from before any motion. A: keynote type (huge numbers, thin lines).
// B: an editorial sheet laid in perspective (printed type and bars, red stamps). C: a clean isometric geometric scene.
// No modelled objects: books are type or simple blocks. Frame k of the composition is still k (0–8).
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { FONT, MONO, SERIF } from "../v10/theme";
import { Id, M, PRICE } from "../v13/data";
import { Grain, rgba, useFonts } from "../v15/kit";

const YUAN: Record<Id, number> = { deepseek: 8, glm: 30, kimi: 68, claude: 134, chatgpt: 336 };
const ORDER = [...M].sort((a, b) => PRICE[a.id] - PRICE[b.id]);
const TXT =
  "让 AI 写一整套《三体》要多少钱？全三册 · 约 88 万字写一整套《三体》，各家 AI 收多少钱最便宜和最贵有人每个月花还说：这是最便宜的 AI约 1,344 元每月/ 月" +
  "第一部 三体第二部 黑暗森林第三部 死神永生88 万字最便宜？差了倍单位：元智谱DeepSeekClaudeChatGPTKimi¥$0123456789×.,";

export const FRAMES18 = 9;

export const Frames18: React.FC = () => {
  const f = useCurrentFrame();
  useFonts([`700 200px ${SERIF}`, `900 120px ${FONT}`, `500 36px ${FONT}`, `700 60px ${MONO}`, `700 40px ${FONT}`], TXT);
  const k = Math.min(8, f);
  const style = Math.floor(k / 3);
  const shot = k % 3;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {style === 0 && <Keynote shot={shot} />}
      {style === 1 && <Editorial shot={shot} />}
      {style === 2 && <Iso shot={shot} />}
      <Tag label={["A 发布会大字", "B 编辑排版", "C 等距小场景"][style]} />
      <Grain frame={f} amount={0.04} />
    </AbsoluteFill>
  );
};

const Tag: React.FC<{ label: string }> = ({ label }) => (
  <div style={{ position: "absolute", right: 30, bottom: 24, fontFamily: FONT, fontWeight: 700, fontSize: 22, color: "rgba(255,255,255,0.35)" }}>{label}</div>
);

// ---------- A: keynote type ----------
const grad = (a: string, b: string): React.CSSProperties => ({ background: `linear-gradient(180deg, ${a}, ${b})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" });

const Keynote: React.FC<{ shot: number }> = ({ shot }) => (
  <AbsoluteFill style={{ background: "radial-gradient(ellipse 60% 55% at 50% 45%, #121318 0%, #000 75%)" }}>
    {shot === 0 && (
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 46, color: "#8d8d92", letterSpacing: "0.08em" }}>让 AI 写一整套</div>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 250, lineHeight: "300px", ...grad("#ffffff", "#8e8e93") }}>《三体》</div>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 64, color: "#f2f2f2", marginTop: 10 }}>要多少钱？</div>
        <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 28, color: "#6e6e73", marginTop: 28, letterSpacing: "0.12em" }}>全三册 · 约 88 万字</div>
      </div>
    )}
    {shot === 1 && (
      <>
        <div style={{ position: "absolute", left: 150, top: 130, fontFamily: FONT, fontWeight: 700, fontSize: 40, color: "#8d8d92" }}>写一整套《三体》，各家 AI 收多少钱</div>
        {ORDER.map((m, i) => {
          const y = 230 + i * 150;
          const w = (YUAN[m.id] / 336) * 1000;
          const hi = m.id === "deepseek" || m.id === "chatgpt";
          return (
            <React.Fragment key={m.id}>
              <div style={{ position: "absolute", left: 150, top: y, fontFamily: MONO, fontWeight: 700, fontSize: 34, color: hi ? "#e8e8ed" : "#6e6e73" }}>{m.name}</div>
              <div style={{ position: "absolute", left: 150, top: y + 54, width: Math.max(10, w), height: 10, borderRadius: 5, background: hi ? `linear-gradient(90deg, ${rgba(m.color, 0.5)}, ${m.color})` : "#3a3a3c" }} />
              <div style={{ position: "absolute", left: 150 + Math.max(10, w) + 28, top: y + 24, fontFamily: MONO, fontWeight: 700, fontSize: 56, color: hi ? "#f5f5f7" : "#6e6e73" }}>¥{YUAN[m.id]}</div>
            </React.Fragment>
          );
        })}
        <div style={{ position: "absolute", right: 120, top: 560, textAlign: "right" }}>
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 240, lineHeight: "240px", ...grad("#ffffff", "#7c7c80") }}>42×</div>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 34, color: "#a1a1a6", marginTop: 10 }}>最便宜和最贵，差了 40 多倍</div>
        </div>
      </>
    )}
    {shot === 2 && (
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 44, color: "#8d8d92" }}>有人每个月花</div>
        <div style={{ display: "flex", alignItems: "baseline" }}>
          <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 320, lineHeight: "340px", ...grad("#ffe3a0", "#b8862f") }}>$200</span>
          <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: 90, color: "#b8862f", marginLeft: 16 }}>/ 月</span>
        </div>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 60, color: "#f2f2f2", marginTop: 10 }}>还说：这是最便宜的 AI</div>
      </div>
    )}
  </AbsoluteFill>
);

// ---------- B: an editorial sheet in perspective ----------
const PAPER = "#121a2b";
const INKB = "#efe6d4";
const RED = "#e5322d";
const GOLDB = "#f2c35c";
const Sheet: React.FC<{ children: React.ReactNode; rx?: number; rz?: number }> = ({ children, rx = 24, rz = -9 }) => (
  <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 70% at 50% 45%, #1a2436 0%, #0a0f19 60%, #05070c 100%)", perspective: 1800 }}>
    <div style={{ position: "absolute", left: -200, top: -150, width: 2320, height: 1380, transform: `rotateX(${rx}deg) rotateZ(${rz}deg)`, transformOrigin: "50% 55%" }}>
      {/* the paper reaches past every edge of the frame */}
      <div style={{ position: "absolute", left: -900, top: -700, width: 4100, height: 2800, background: PAPER }} />
      {/* paper texture: faint ruled lines */}
      {Array.from({ length: 40 }, (_, i) => (
        <div key={i} style={{ position: "absolute", left: 0, right: 0, top: i * 36, height: 1, background: "rgba(239,230,212,0.035)" }} />
      ))}
      {children}
    </div>
  </AbsoluteFill>
);
const Stamp: React.FC<{ x: number; y: number; rot: number; size: number; children: React.ReactNode }> = ({ x, y, rot, size, children }) => (
  <div style={{ position: "absolute", left: x, top: y, transform: `rotate(${rot}deg)`, border: `${size * 0.07}px solid ${RED}`, borderRadius: 8, padding: `${size * 0.08}px ${size * 0.3}px`, color: RED, fontFamily: FONT, fontWeight: 900, fontSize: size, lineHeight: 1.1, opacity: 0.92 }}>
    {children}
  </div>
);
const Editorial: React.FC<{ shot: number }> = ({ shot }) => (
  <Sheet>
    {shot === 0 && (
      <>
        <div style={{ position: "absolute", left: 520, top: 360, fontFamily: FONT, fontWeight: 900, fontSize: 64, color: INKB }}>让 AI 写一整套</div>
        <div style={{ position: "absolute", left: 500, top: 440, fontFamily: SERIF, fontWeight: 700, fontSize: 300, lineHeight: "330px", color: INKB }}>《三体》</div>
        <div style={{ position: "absolute", left: 1640, top: 470, fontFamily: MONO, fontWeight: 700, fontSize: 30, lineHeight: "54px", color: "rgba(239,230,212,0.75)" }}>
          第一部 三体<br />第二部 黑暗森林<br />第三部 死神永生
        </div>
        <div style={{ position: "absolute", left: 520, top: 800, fontFamily: FONT, fontWeight: 900, fontSize: 80, color: GOLDB }}>要多少钱？</div>
        <Stamp x={1560} y={700} rot={-8} size={70}>88 万字</Stamp>
      </>
    )}
    {shot === 1 && (
      <>
        <div style={{ position: "absolute", left: 420, top: 300, fontFamily: MONO, fontWeight: 700, fontSize: 30, color: "rgba(239,230,212,0.7)", letterSpacing: "0.06em" }}>写一整套《三体》· 各家 AI 的价格 · 单位：元</div>
        {ORDER.map((m, i) => {
          const y = 380 + i * 118;
          const w = (YUAN[m.id] / 336) * 1100;
          const hi = m.id === "deepseek" || m.id === "chatgpt";
          return (
            <React.Fragment key={m.id}>
              <div style={{ position: "absolute", left: 420, top: y + 6, width: 220, fontFamily: MONO, fontWeight: 700, fontSize: 34, color: INKB }}>{m.name}</div>
              <div style={{ position: "absolute", left: 660, top: y, width: Math.max(14, w), height: 60, background: hi ? GOLDB : "rgba(239,230,212,0.55)" }} />
              <div style={{ position: "absolute", left: 660 + Math.max(14, w) + 24, top: y - 2, fontFamily: MONO, fontWeight: 700, fontSize: 56, color: hi ? GOLDB : INKB }}>¥{YUAN[m.id]}</div>
            </React.Fragment>
          );
        })}
        <Stamp x={1500} y={430} rot={-10} size={110}>差 42 倍</Stamp>
      </>
    )}
    {shot === 2 && (
      <>
        <div style={{ position: "absolute", left: 560, top: 380, fontFamily: FONT, fontWeight: 900, fontSize: 70, color: INKB }}>有人每个月花</div>
        <div style={{ position: "absolute", left: 540, top: 460, fontFamily: MONO, fontWeight: 700, fontSize: 330, lineHeight: "350px", color: GOLDB }}>$200</div>
        <div style={{ position: "absolute", left: 560, top: 830, fontFamily: FONT, fontWeight: 900, fontSize: 70, color: INKB }}>还说：这是最便宜的 AI</div>
        <Stamp x={1480} y={520} rot={-12} size={120}>最便宜？</Stamp>
      </>
    )}
  </Sheet>
);

// ---------- C: a clean isometric scene (CSS 3D, orthographic) ----------
const Box: React.FC<{ x: number; y: number; w: number; d: number; h: number; top: string; left: string; right: string; children?: React.ReactNode }> = ({ x, y, w, d, h, top, left, right, children }) => (
  // x, y on the ground plane; w along x, d along y, h up
  <div style={{ position: "absolute", left: x, top: y, width: w, height: d, transformStyle: "preserve-3d" }}>
    <div style={{ position: "absolute", left: 0, top: 0, width: w, height: d, background: top, transform: `translateZ(${h}px)` }}>{children}</div>
    <div style={{ position: "absolute", left: 0, top: d, width: w, height: h, background: left, transformOrigin: "0 0", transform: "rotateX(-90deg)" }} />
    <div style={{ position: "absolute", left: w, top: 0, width: h, height: d, background: right, transformOrigin: "0 0", transform: "rotateY(90deg)" }} />
  </div>
);
const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.round(Math.min(255, v * k));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
};
const IsoWorld: React.FC<{ children: React.ReactNode; scale?: number; dx?: number; dy?: number }> = ({ children, scale = 1, dx = 0, dy = 0 }) => (
  <AbsoluteFill style={{ background: "radial-gradient(ellipse 70% 60% at 50% 50%, #161b26 0%, #090b10 70%)" }}>
    <div style={{ position: "absolute", left: 960 + dx, top: 560 + dy, transformStyle: "preserve-3d", transform: `scale(${scale}) rotateX(58deg) rotateZ(-45deg)` }}>{children}</div>
  </AbsoluteFill>
);
const Iso: React.FC<{ shot: number }> = ({ shot }) => {
  const books = [
    { c: "#3a2f24", h: 230, d: 40 },
    { c: "#2f3a4a", h: 240, d: 52 },
    { c: "#4a2c2c", h: 246, d: 58 },
  ];
  const plate = <Box x={-420} y={-300} w={840} d={600} h={14} top="#1d2230" left="#141823" right="#10131b" />;
  return (
    <>
      {shot === 0 && (
        <>
          <IsoWorld scale={1.35} dy={60}>
            {plate}
            {books.map((b, i) => (
              <div key={i} style={{ position: "absolute", left: 0, top: 0, transformStyle: "preserve-3d", transform: "translateZ(14px)" }}>
                <Box x={-150 + i * 62} y={-110} w={b.d} d={170} h={b.h} top="#d8ccb4" left={shade(b.c, 1.25)} right={b.c} />
              </div>
            ))}
          </IsoWorld>
          <div style={{ position: "absolute", left: 130, top: 300, fontFamily: FONT, fontWeight: 900, fontSize: 76, lineHeight: 1.25, color: "#f2f2f2" }}>
            让 AI 写一整套
            <br />
            <span style={{ fontFamily: SERIF, fontSize: 120 }}>《三体》</span>
            <br />
            要多少钱？
          </div>
          <div style={{ position: "absolute", right: 170, top: 820, fontFamily: FONT, fontWeight: 700, fontSize: 30, color: "#8d93a1" }}>全三册 · 约 88 万字</div>
        </>
      )}
      {shot === 1 && (
        <>
          <IsoWorld scale={0.95} dx={-40} dy={70}>
            <Box x={-560} y={-260} w={1120} d={520} h={10} top="#1d2230" left="#141823" right="#10131b" />
            {ORDER.map((m, i) => {
              const h = Math.max(8, (YUAN[m.id] / 336) * 520);
              return (
                <div key={m.id} style={{ position: "absolute", left: 0, top: 0, transformStyle: "preserve-3d", transform: "translateZ(10px)" }}>
                  <Box x={-440 + i * 190} y={-60} w={110} d={110} h={h} top={shade(m.color, 1.15)} left={shade(m.color, 0.85)} right={shade(m.color, 0.6)} />
                </div>
              );
            })}
          </IsoWorld>
          {/* labels laid out flat, tied to each column's base */}
          {ORDER.map((m, i) => {
            const h = Math.max(8, (YUAN[m.id] / 336) * 520) * 0.95 * Math.sin((58 * Math.PI) / 180);
            const bx = 960 - 40 + (-440 + i * 190 + 55) * 0.95 * 0.707 - (-60 + 55) * 0.95 * 0.707;
            const by = 560 + 70 + ((-440 + i * 190 + 55) * 0.707 + (-60 + 55) * 0.707) * 0.95 * Math.cos((58 * Math.PI) / 180) - h;
            return (
              <div key={m.id} style={{ position: "absolute", left: bx - 90, width: 180, top: by - 92, textAlign: "center" }}>
                <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 22, color: m.color }}>{m.name}</div>
                <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 46, color: "#f2f2f2" }}>¥{YUAN[m.id]}</div>
              </div>
            );
          })}
          <div style={{ position: "absolute", left: 120, top: 110, fontFamily: FONT, fontWeight: 900, fontSize: 62, color: "#f2f2f2" }}>
            最便宜和最贵，差了 <span style={{ fontFamily: MONO, color: "#f2c35c" }}>42</span> 倍
          </div>
        </>
      )}
      {shot === 2 && (
        <>
          <IsoWorld scale={1.2} dx={260} dy={80}>
            {plate}
            <div style={{ position: "absolute", left: 0, top: 0, transformStyle: "preserve-3d", transform: "translateZ(14px)" }}>
              <Box x={-160} y={-100} w={320} d={200} h={22} top="linear-gradient(135deg, #f6d98c, #b8862f)" left="#9c7027" right="#7d5a1f">
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontWeight: 700, fontSize: 70, color: "#2a1d08" }}>$200</div>
              </Box>
            </div>
          </IsoWorld>
          <div style={{ position: "absolute", left: 130, top: 330, fontFamily: FONT, fontWeight: 900, fontSize: 70, lineHeight: 1.3, color: "#f2f2f2" }}>
            有人每个月花
            <br />
            <span style={{ fontFamily: MONO, fontSize: 150, color: "#f2c35c" }}>$200</span>
            <br />
            还说：这是最便宜的 AI
          </div>
        </>
      )}
    </>
  );
};
