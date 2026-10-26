// Concept B: taxi meters at night. AI is billed like a cab: the meter runs while it works (按量), a monthly plan is
// chartering the car (包车), and the waiting fee is your time. Five red LED meters on a dashboard, the city's lights
// sliding past behind them.
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { FONT, MONO } from "../v10/theme";
import { Grain, useFonts, Vignette } from "../v12/noir";
import { clamp01, EO, hash, Id, lerp, M, PRICE, ramp, rgba, TASK } from "./data";

const RED = "#ff3d2e";
const OFF = "#2a0d0b";
const T = { title: 0.3, titleUp: 1.9, label1: 2.1, run1: 2.4, hi1: 4.6, cap1: 4.8, reset: 6.6, label2: 6.8, run2: 7.2, hi2: 9.5, cap2: 9.7 };
const RUN = 1.7;

// ---------- seven-segment digits ----------
const SEG: Record<string, string> = {
  "0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc", "5": "afgcd", "6": "afgedc", "7": "abc", "8": "abcdefg", "9": "abcdfg", " ": "",
};
const DW = 46;
const DH = 82;
const TH = 9;
const segPath = (s: string) => {
  const w = DW;
  const h = DH;
  const m = h / 2;
  const k = TH / 2;
  const hz = (y: number) => `M${k + 2},${y} L${k * 2 + 2},${y - k} L${w - k * 2 - 2},${y - k} L${w - k - 2},${y} L${w - k * 2 - 2},${y + k} L${k * 2 + 2},${y + k} Z`;
  const vt = (x: number, y0: number, y1: number) => `M${x},${y0 + 2} L${x + k},${y0 + k + 2} L${x + k},${y1 - k - 2} L${x},${y1 - 2} L${x - k},${y1 - k - 2} L${x - k},${y0 + k + 2} Z`;
  switch (s) {
    case "a": return hz(k);
    case "g": return hz(m);
    case "d": return hz(h - k);
    case "f": return vt(k, k, m);
    case "b": return vt(w - k, k, m);
    case "e": return vt(k, m, h - k);
    default: return vt(w - k, m, h - k); // c
  }
};
const Digit: React.FC<{ ch: string; x: number; lit: number }> = ({ ch, x, lit }) => (
  <g transform={`translate(${x},0) skewX(-6)`}>
    {"abcdefg".split("").map((s) => {
      const on = SEG[ch]?.includes(s);
      return <path key={s} d={segPath(s)} fill={on ? RED : OFF} opacity={on ? 0.35 + 0.65 * lit : 1} />;
    })}
  </g>
);
const Display: React.FC<{ value: number; lit: number }> = ({ value, lit }) => {
  const s = value.toFixed(2).padStart(5, " "); // "50.00", " 1.19"
  const chars = s.replace(".", "").split(""); // 4 digits
  return (
    <svg width={4 * (DW + 10) + 30} height={DH + 10} style={{ overflow: "visible" }}>
      <defs>
        <filter id="led-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#led-glow)" transform="translate(4,4)">
        {chars.map((c, i) => (
          <Digit key={i} ch={c} x={i * (DW + 10) + (i >= 2 ? 16 : 0)} lit={lit} />
        ))}
        <circle cx={2 * (DW + 10) + 2} cy={DH - 5} r={5} fill={RED} opacity={0.35 + 0.65 * lit} />
      </g>
    </svg>
  );
};

// ---------- the city sliding past ----------
const BOKEH = Array.from({ length: 80 }, (_, i) => ({
  x0: hash(i, 1) * 2400,
  y: 80 + hash(i, 2) * 620,
  r: 16 + hash(i, 3) ** 2 * 110,
  v: 60 + hash(i, 4) * 260,
  c: ["#ffb347", "#ff6b3d", "#ffd27a", "#fff1d6", "#6ec3ff", "#ff4d6d", "#ffa94d"][Math.floor(hash(i, 5) * 7)],
  a: 0.06 + hash(i, 6) * 0.22,
}));
const City: React.FC<{ t: number }> = ({ t }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const g = ref.current!.getContext("2d")!;
    g.clearRect(0, 0, 1920, 1080);
    for (const b of BOKEH) {
      const x = ((((b.x0 - t * b.v) % 2400) + 2400) % 2400) - 240;
      const gr = g.createRadialGradient(x, b.y, 0, x, b.y, b.r);
      gr.addColorStop(0, rgba(b.c, b.a * 0.7));
      gr.addColorStop(0.82, rgba(b.c, b.a));
      gr.addColorStop(1, rgba(b.c, 0));
      g.fillStyle = gr;
      g.beginPath();
      g.arc(x, b.y, b.r, 0, Math.PI * 2);
      g.fill();
    }
  });
  return <canvas ref={ref} width={1920} height={1080} style={{ position: "absolute", inset: 0, filter: "blur(3px)" }} />;
};

const UW = 330;
const UH = 214;
const UGAP = 22;
const UX0 = (1920 - (5 * UW + 4 * UGAP)) / 2;
const UY = 430;

export const Meter: React.FC = () => {
  const frame = useCurrentFrame();
  useFonts([`900 120px ${FONT}`, `700 34px ${FONT}`, `700 26px ${MONO}`, `500 19px ${FONT}`], "AI 的真实价格每 100 万 token，打表多少钱（美元）做一道难题按单价：Claude 是 DeepSeek 的倍差距拉大到智谱价格：各家官方 API 输出价；花费：Artificial Analysis 评测实测 · 2026 年 10 月CLAUDECHATGPTKIMIDEEPSEEKOpus 5.5GPT-6 AstraK3.1 ProGLM-5.3V4.1 Flash$0123456789");
  const t = frame / 30;
  const star = (id: Id) => id === "claude" || id === "deepseek";
  const hi = Math.max(ramp(t, T.hi1, T.hi1 + 0.4) * (1 - ramp(t, T.reset - 0.2, T.reset + 0.1)), ramp(t, T.hi2, T.hi2 + 0.4));
  const lap2 = t >= T.reset;
  // a streetlight sweeping across the dashboard every few seconds
  const sweepX = ((t * 900) % 3600) - 800;
  const titleUp = ramp(t, T.titleUp, T.titleUp + 0.6);

  return (
    <AbsoluteFill style={{ background: "#07080b", overflow: "hidden" }}>
      <Audio src={staticFile("music-ep1.wav")} volume={0.55} />
      {[T.run1, T.run2].map((at, i) => (
        <Sequence key={i} from={Math.round(at * 30)} layout="none">
          <Audio src={staticFile("sfx/meter.wav")} volume={0.6} />
        </Sequence>
      ))}
      <Sequence from={Math.round(T.reset * 30)} layout="none">
        <Audio src={staticFile("sfx/switch.wav")} volume={0.5} />
      </Sequence>

      <AbsoluteFill style={{ background: "linear-gradient(180deg, #0a1020 0%, #0b0b12 55%, #050506 100%)" }} />
      <City t={t} />
      {/* windshield haze */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(5,6,9,0) 30%, rgba(5,6,9,0.75) 62%, #050506 76%)" }} />

      {/* title, then the lap label */}
      <div style={{ position: "absolute", left: 0, right: 0, top: lerp(250, 150, titleUp), textAlign: "center", opacity: ramp(t, T.title, T.title + 0.6) }}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: lerp(120, 64, titleUp), color: "#fff", letterSpacing: "0.05em", textShadow: "0 0 30px rgba(255,200,150,0.35)" }}>AI 的真实价格</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 260, textAlign: "center", fontFamily: FONT, fontWeight: 700, fontSize: 34, color: "#d9d4ca", letterSpacing: "0.06em" }}>
        <span style={{ opacity: ramp(t, T.label1, T.label1 + 0.4) * (1 - ramp(t, T.reset - 0.3, T.reset)) }}>每 100 万 token，打表多少钱（美元）</span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 260, textAlign: "center", fontFamily: FONT, fontWeight: 700, fontSize: 34, color: "#d9d4ca", letterSpacing: "0.06em", opacity: ramp(t, T.label2, T.label2 + 0.4) }}>
        做一道难题，打表多少钱（美元）
      </div>

      {/* the dashboard */}
      <div style={{ position: "absolute", left: 0, right: 0, top: UY + UH + 10, height: 400, background: "linear-gradient(180deg, #121316 0%, #08090b 40%)", boxShadow: "0 -1px 0 rgba(255,255,255,0.06)" }} />

      {M.map((m, i) => {
        const x = UX0 + i * (UW + UGAP);
        const start = (lap2 ? T.run2 : T.run1) + i * 0.12;
        const p = ramp(t, start, start + RUN, EO);
        const target = lap2 ? TASK[m.id] : PRICE[m.id];
        const flash = lap2 && t < T.run2 ? (Math.floor(t * 10) % 2 === 0 ? 1 : 0.3) : 1;
        const value = Math.floor(target * p * 100) / 100;
        const dim = 1 - hi * (star(m.id) ? 0 : 0.7);
        const sheen = clamp01(1 - Math.abs(sweepX - x - UW / 2) / 380);
        return (
          <div key={m.id} style={{ position: "absolute", left: x, top: UY, width: UW, height: UH, opacity: ramp(t, 1.6 + i * 0.08, 2.1 + i * 0.08) }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 16,
                background: "linear-gradient(180deg, #1b1c20, #0e0f12)",
                border: "1px solid #2b2c31",
                boxShadow: "0 20px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            />
            <div style={{ position: "absolute", left: 22, top: 16, fontFamily: MONO, fontWeight: 700, fontSize: 26, color: rgba("#ffffff", 0.9 * dim), letterSpacing: "0.04em" }}>
              {m.name === "智谱" ? <span style={{ fontFamily: FONT, fontWeight: 900 }}>智谱</span> : m.name.toUpperCase()}
            </div>
            <div style={{ position: "absolute", right: 22, top: 22, fontFamily: MONO, fontWeight: 700, fontSize: 15, color: rgba("#ffffff", 0.45 * dim) }}>{m.model}</div>
            {/* glass window */}
            <div style={{ position: "absolute", left: 18, right: 18, top: 62, bottom: 18, borderRadius: 8, background: "#050404", boxShadow: "inset 0 2px 10px rgba(0,0,0,0.9)" }}>
              <div style={{ position: "absolute", left: 12, top: 8, fontFamily: MONO, fontWeight: 700, fontSize: 22, color: rgba(RED, 0.35 + 0.65 * dim) }}>$</div>
              <div style={{ position: "absolute", left: 34, top: 22, opacity: dim * flash }}>
                <Display value={value} lit={dim} />
              </div>
              <div style={{ position: "absolute", inset: 0, borderRadius: 8, background: `linear-gradient(115deg, rgba(255,255,255,${0.04 + 0.12 * sheen}) 0%, rgba(255,255,255,0) 45%)` }} />
            </div>
            {/* reflection on the dash */}
            <div style={{ position: "absolute", left: 40, right: 40, top: UH + 18, height: 50, background: `radial-gradient(ellipse 50% 60% at 50% 0%, ${rgba(RED, 0.22 * dim * p)}, rgba(0,0,0,0) 70%)` }} />
          </div>
        );
      })}

      {/* the takeaways */}
      <Caption t={t} on={T.cap1} off={T.reset - 0.2} pre="按单价：" mid="Claude 是 DeepSeek 的 " num="17" post=" 倍" />
      <Caption t={t} on={T.cap2} pre="做一道难题：" mid="差距拉大到 " num="23" post=" 倍" />

      <div style={{ position: "absolute", left: 0, right: 0, bottom: 34, textAlign: "center", fontFamily: FONT, fontWeight: 500, fontSize: 19, color: "#5f6068", opacity: clamp01((t - 2.6) * 2) }}>
        价格：各家官方 API 输出价；花费：Artificial Analysis 评测实测 · 2026 年 10 月
      </div>
      <Vignette k={0.8} />
      <Grain frame={frame} amount={0.06} />
    </AbsoluteFill>
  );
};

const Caption: React.FC<{ t: number; on: number; off?: number; pre: string; mid: string; num: string; post: string }> = ({ t, on, off, pre, mid, num, post }) => {
  const o = ramp(t, on, on + 0.5, EO) * (off === undefined ? 1 : 1 - ramp(t, off, off + 0.3));
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 800, textAlign: "center", opacity: o, transform: `translateY(${(1 - o) * 24}px)`, fontFamily: FONT, fontWeight: 900, fontSize: 58, color: "#fff", whiteSpace: "nowrap" }}>
      <span style={{ color: "#bdb8ae", fontWeight: 700, fontSize: 40 }}>{pre}</span>
      {mid}
      <span style={{ color: RED, fontSize: 84, textShadow: `0 0 24px ${rgba(RED, 0.6)}` }}>{num}</span>
      {post}
    </div>
  );
};
