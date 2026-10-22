import React from "react";
import { interpolate, random } from "remotion";
import { CL, EBACK, EO, progAt } from "../fx";
import { useBeatFrame } from "../kit";
import { FONT, K, SERIF } from "../theme";

// ---------- The exam paper: the film's one prop ----------

// A sheet of exam paper: 纸色 with faint ruling and the 密封线 strip down the left edge.
export const Sheet: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  rot?: number;
  seal?: boolean;
  shadow?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ x, y, w, h, rot = 0, seal = true, shadow = 1, style, children }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      transform: rot ? `rotate(${rot}deg)` : undefined,
      background: `linear-gradient(180deg, ${K.paperHi} 0%, ${K.paper} 55%, ${K.paperLo} 100%)`,
      borderRadius: 6,
      boxShadow: `0 ${30 * shadow}px ${80 * shadow}px rgba(0,0,0,${0.55 * shadow}), 0 2px 0 rgba(255,255,255,0.4) inset`,
      overflow: "hidden",
      fontFamily: SERIF,
      color: K.ink,
      ...style,
    }}
  >
    {seal ? <SealStrip h={h} /> : null}
    {children}
  </div>
);

// 密封线: the dashed binding line every Chinese exam paper carries, with its warning printed sideways.
const SealStrip: React.FC<{ h: number }> = ({ h }) => (
  <div style={{ position: "absolute", left: 0, top: 0, width: 44, height: h, borderRight: `2px dashed ${K.inkFaint}` }}>
    <div
      style={{
        position: "absolute",
        left: 8,
        top: 0,
        height: h,
        writingMode: "vertical-rl",
        display: "flex",
        justifyContent: "center",
        fontFamily: SERIF,
        fontSize: 15,
        letterSpacing: 18,
        color: K.inkFaint,
      }}
    >
      密封线内不要答题
    </div>
  </div>
);

// Section heading inside a sheet: "二、答题" plus a chip saying who does it.
export const Section: React.FC<{ n: string; title: string; who: "人" | "AI"; size?: number; style?: React.CSSProperties }> = ({ n, title, who, size = 30, style }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, ...style }}>
    <span style={{ fontFamily: SERIF, fontWeight: 900, fontSize: size, color: K.ink }}>
      {n}、{title}
    </span>
    <Who who={who} size={size * 0.62} />
  </div>
);

export const Who: React.FC<{ who: "人" | "AI"; size?: number }> = ({ who, size = 20 }) => {
  const ai = who === "AI";
  return (
    <span
      style={{
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: size,
        lineHeight: 1,
        padding: `${size * 0.28}px ${size * 0.55}px`,
        borderRadius: 6,
        background: ai ? K.aiInk : K.ink,
        color: ai ? "#fff" : K.paper,
        letterSpacing: ai ? 1 : 0,
      }}
    >
      {who}
    </span>
  );
};

// ---------- AI handwriting ----------

type Stroke = { pts: [number, number][]; len: number };

// Cursive-looking loops for one line of "answer", seeded so every render is identical.
const makeLine = (seed: string, w: number, h: number): Stroke[] => {
  const words: Stroke[] = [];
  let x = 4 + random(`${seed}-x0`) * 10;
  let wi = 0;
  while (x < w - 30) {
    const ww = Math.min(w - x - 4, 40 + random(`${seed}-w${wi}`) * 120);
    const loops = Math.max(2, Math.round(ww / 15));
    const pts: [number, number][] = [];
    const amp = h * (0.22 + random(`${seed}-a${wi}`) * 0.14);
    const steps = loops * 10;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const ang = t * loops * Math.PI * 2;
      const px = x + t * ww - Math.cos(ang) * 4.5 + 4.5;
      const tall = random(`${seed}-t${wi}-${Math.floor(t * loops)}`) < 0.18 ? 1.7 : 1;
      const py = h * 0.62 - Math.max(0, Math.sin(ang)) * amp * tall + Math.sin(t * 7 + wi) * 1.5;
      pts.push([px, py]);
    }
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    words.push({ pts, len });
    x += ww + 14 + random(`${seed}-g${wi}`) * 16;
    wi++;
  }
  return words;
};

const cache = new Map<string, Stroke[][]>();
const getLines = (seed: string, n: number, w: number, lineH: number) => {
  const key = `${seed}|${n}|${w}|${lineH}`;
  if (!cache.has(key)) cache.set(key, Array.from({ length: n }, (_, i) => makeLine(`${seed}-${i}`, i === n - 1 ? w * 0.6 : w, lineH)));
  return cache.get(key)!;
};

// Lines of AI 紫 handwriting; `progress` counts finished lines (fractions write the current one).
export const Scribble: React.FC<{
  w: number;
  lines: number;
  lineH?: number;
  progress: number;
  seed: string;
  color?: string;
  width?: number;
  style?: React.CSSProperties;
}> = ({ w, lines, lineH = 40, progress, seed, color = K.aiInk, width = 2.6, style }) => {
  const all = getLines(seed, lines, w, lineH);
  return (
    <svg width={w} height={lines * lineH} style={{ display: "block", overflow: "visible", ...style }}>
      {all.map((words, li) => {
        const p = Math.max(0, Math.min(1, progress - li));
        if (p <= 0) return null;
        const total = words.reduce((s, wd) => s + wd.len, 0);
        let budget = p * total;
        return (
          <g key={li} transform={`translate(0 ${li * lineH})`}>
            {words.map((wd, wi) => {
              if (budget <= 0) return null;
              const show = Math.min(wd.len, budget);
              budget -= wd.len;
              const d = `M${wd.pts.map(([px, py]) => `${px.toFixed(1)} ${py.toFixed(1)}`).join(" L")}`;
              return (
                <path
                  key={wi}
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeWidth={width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={`${wd.len} ${wd.len}`}
                  strokeDashoffset={wd.len - show}
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
};

// ---------- Grading marks ----------

// A hand-drawn tick (passed) drawn on beat `at`.
export const Tick: React.FC<{ at: number; size?: number; color?: string; width?: number; style?: React.CSSProperties }> = ({
  at,
  size = 120,
  color = K.greenInk,
  width,
  style,
}) => {
  const p = progAt(useBeatFrame(), at, 0.6, EO);
  if (p <= 0) return null;
  const len = 160;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: "visible", ...style }}>
      <path
        d="M8 54 C 20 62, 30 74, 38 86 C 52 58, 70 30, 96 8"
        fill="none"
        stroke={color}
        strokeWidth={width ?? 9}
        strokeLinecap="round"
        strokeDasharray={`${len} ${len}`}
        strokeDashoffset={len * (1 - p)}
      />
    </svg>
  );
};

// A hand-drawn cross (rejected).
export const Cross: React.FC<{ at: number; size?: number; color?: string; style?: React.CSSProperties }> = ({ at, size = 100, color = K.redInk, style }) => {
  const frame = useBeatFrame();
  const a = progAt(frame, at, 0.35, EO);
  const b = progAt(frame, at + 0.3, 0.35, EO);
  if (a <= 0) return null;
  const len = 120;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: "visible", ...style }}>
      <path d="M12 10 C 40 40, 62 66, 90 92" fill="none" stroke={color} strokeWidth={9} strokeLinecap="round" strokeDasharray={`${len} ${len}`} strokeDashoffset={len * (1 - a)} />
      <path d="M90 12 C 62 38, 38 64, 10 90" fill="none" stroke={color} strokeWidth={9} strokeLinecap="round" strokeDasharray={`${len} ${len}`} strokeDashoffset={len * (1 - b)} />
    </svg>
  );
};

// A round seal with a name, stamped on beat `at` (阅卷章).
export const Seal: React.FC<{ at: number; name: string; size?: number; color?: string; rot?: number; style?: React.CSSProperties }> = ({
  at,
  name,
  size = 78,
  color = K.greenInk,
  rot = 0,
  style,
}) => {
  const frame = useBeatFrame();
  const p = progAt(frame, at, 0.5, EBACK);
  if (p <= 0) return null;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `${Math.max(2, size * 0.05)}px solid ${color}`,
        boxShadow: `inset 0 0 0 ${size * 0.05}px transparent, inset 0 0 0 ${size * 0.085}px ${color}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `rotate(${rot}deg) scale(${1.7 - 0.7 * p})`,
        opacity: Math.min(1, p * 2.2) * 0.92,
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: size * (name.length > 6 ? 0.13 : 0.17),
        letterSpacing: 0.5,
        color,
        textTransform: "uppercase",
        ...style,
      }}
    >
      {name}
    </div>
  );
};

// A rectangular ink stamp ("人工核验 ✓", "退回") slammed on beat `at`.
export const InkStamp: React.FC<{ at: number; children: React.ReactNode; color?: string; size?: number; rot?: number; style?: React.CSSProperties }> = ({
  at,
  children,
  color = K.greenInk,
  size = 40,
  rot = -8,
  style,
}) => {
  const p = progAt(useBeatFrame(), at, 0.45, EBACK);
  if (p <= 0) return null;
  return (
    <div
      style={{
        display: "inline-block",
        padding: `${size * 0.16}px ${size * 0.45}px`,
        border: `${size * 0.1}px solid ${color}`,
        outline: `${size * 0.04}px solid ${color}`,
        outlineOffset: size * 0.08,
        borderRadius: size * 0.16,
        color,
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: size,
        lineHeight: 1.1,
        whiteSpace: "nowrap",
        transform: `rotate(${rot}deg) scale(${1.8 - 0.8 * p})`,
        opacity: Math.min(1, p * 2.5) * 0.9,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// Printed exam text (serif ink), entering on beat `at`.
export const Print: React.FC<{ at?: number; size?: number; w?: number; color?: string; style?: React.CSSProperties; children: React.ReactNode }> = ({
  at,
  size = 30,
  w = 500,
  color = K.ink,
  style,
  children,
}) => {
  const frame = useBeatFrame();
  const p = at === undefined ? 1 : progAt(frame, at, 0.6, EO);
  if (p <= 0) return null;
  return (
    <div style={{ fontFamily: SERIF, fontSize: size, fontWeight: w, color, lineHeight: 1.45, opacity: p, transform: `translateY(${(1 - p) * 10}px)`, ...style }}>
      {children}
    </div>
  );
};

// Answer-blank underline that fills with AI ink.
export const Blank: React.FC<{ w: number; style?: React.CSSProperties }> = ({ w, style }) => (
  <span style={{ display: "inline-block", width: w, borderBottom: `2px solid ${K.ink}`, margin: "0 6px", transform: "translateY(-6px)", ...style }} />
);

export const clamp01 = (v: number) => interpolate(v, [0, 1], [0, 1], CL);
