// Shared timing helpers, type and brand pieces. All times are film seconds.
import React from "react";
import { Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { FONT, K, NUM, SERIF } from "./theme";
import { FPS } from "./time";

export const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const EO = Easing.bezier(0.16, 1, 0.3, 1);
export const EIO = Easing.bezier(0.65, 0, 0.35, 1);
export const ESO = Easing.bezier(0.45, 0, 0.2, 1); // camera: decisive start, long settle
export const EIN = Easing.bezier(0.55, 0, 0.9, 0.4);

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const ramp = (t: number, a: number, b: number, ease: (x: number) => number = EIO) => ease(clamp01((t - a) / (b - a)));
export const tween = (t: number, a: number, b: number, v0: number, v1: number, ease: (x: number) => number = EIO) => lerp(v0, v1, ramp(t, a, b, ease));
// Visible between a and b with fades of fi / fo seconds.
export const win = (t: number, a: number, b: number, fi = 0.35, fo = 0.35) => Math.min(clamp01((t - a) / fi), clamp01((b - t) / fo));
// Piecewise keys [[t, v], ...], eased between neighbours.
export const keys = (t: number, k: [number, number][], ease: (x: number) => number = EIO) => {
  if (t <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) if (t <= k[i][0]) return lerp(k[i - 1][1], k[i][1], ease(clamp01((t - k[i - 1][0]) / (k[i][0] - k[i - 1][0]))));
  return k[k.length - 1][1];
};

export const useT = () => useCurrentFrame() / FPS;

export const SHADOW = "0 2px 6px rgba(3,4,8,0.65), 0 0 34px rgba(3,4,8,0.85)";

export type Part = string | { t: string; c?: string; w?: number; mark?: boolean; num?: boolean };

// One line of type: characters rise in from `at`, the line lifts away at `out`. A `mark` part is gold with a gold
// stroke sweeping under it once the line is typed (the one discovery and the last line only).
export const Say: React.FC<{
  at: number;
  out?: number;
  parts: Part[];
  size?: number;
  weight?: number;
  serif?: boolean;
  color?: string;
  stagger?: number; // frames per character
  style?: React.CSSProperties;
}> = ({ at, out, parts, size = 64, weight = 800, serif, color = K.fg, stagger = 1.0, style }) => {
  const frame = useCurrentFrame();
  const f0 = at * FPS;
  if (frame < f0 - 1) return null;
  const exit = out === undefined ? 0 : interpolate(frame, [out * FPS - 7, out * FPS + 5], [0, 1], { ...CL, easing: EIO });
  if (exit >= 1) return null;
  const total = parts.reduce((n, p) => n + Array.from(typeof p === "string" ? p : p.t).length, 0);
  const typed = f0 + total * stagger + 8;
  let idx = 0;
  return (
    <div
      style={{
        fontFamily: serif ? SERIF : FONT,
        fontSize: size,
        fontWeight: weight,
        color,
        lineHeight: 1.3,
        whiteSpace: "nowrap",
        textShadow: SHADOW,
        opacity: 1 - exit,
        transform: `translateY(${-exit * 22}px)`,
        ...style,
      }}
    >
      {parts.map((p, pi) => {
        const part = typeof p === "string" ? { t: p } : p;
        const sweep = part.mark ? interpolate(frame, [typed, typed + 10], [0, 1], { ...CL, easing: EO }) : 0;
        return (
          <span key={pi} style={{ position: "relative", color: part.mark ? K.gold : part.c, fontWeight: part.w, fontFamily: part.num ? NUM : undefined }}>
            {Array.from(part.t).map((ch, ci) => {
              const s = f0 + idx++ * stagger;
              const k = interpolate(frame, [s, s + 11], [0, 1], { ...CL, easing: EO });
              return (
                <span key={ci} style={{ display: "inline-block", whiteSpace: "pre", opacity: k, transform: `translateY(${(1 - k) * 0.32}em)` }}>
                  {ch}
                </span>
              );
            })}
            {part.mark ? (
              <span style={{ position: "absolute", left: 0, bottom: "-0.06em", height: "0.09em", width: `${sweep * 100}%`, background: K.gold, borderRadius: 4, boxShadow: `0 0 18px ${K.gold}aa` }} />
            ) : null}
          </span>
        );
      })}
    </div>
  );
};

// A positioned column of lines (screen coordinates).
export const Box: React.FC<{ x: number; y: number; align?: "left" | "center" | "right"; gap?: number; children: React.ReactNode; o?: number }> = ({ x, y, align = "left", gap = 14, children, o = 1 }) => (
  <div
    style={{
      position: "absolute",
      left: align === "left" ? x : align === "center" ? x - 960 : undefined,
      right: align === "right" ? 1920 - x : undefined,
      width: align === "center" ? 1920 : undefined,
      top: y,
      display: "flex",
      flexDirection: "column",
      alignItems: align === "left" ? "flex-start" : align === "center" ? "center" : "flex-end",
      gap,
      opacity: o,
    }}
  >
    {children}
  </div>
);

// Small source / caveat line, bottom left, only where honesty needs it.
export const Note: React.FC<{ at: number; out: number; children: React.ReactNode }> = ({ at, out, children }) => {
  const t = useT();
  const o = win(t, at, out, 0.3, 0.3);
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 64, bottom: 40, maxWidth: 1700, fontFamily: FONT, fontSize: 24, fontWeight: 500, color: "rgba(244,240,232,0.62)", textShadow: SHADOW, opacity: o, lineHeight: 1.4 }}>
      {children}
    </div>
  );
};

// A small label tag in screen space.
export const Tag: React.FC<{ x: number; y: number; at: number; out: number; color: string; children: React.ReactNode; size?: number; anchor?: "left" | "center" | "right" }> = ({ x, y, at, out, color, children, size = 30, anchor = "center" }) => {
  const t = useT();
  const o = win(t, at, out, 0.3, 0.3);
  if (o <= 0) return null;
  const k = ramp(t, at, at + 0.4, EO);
  const tx = anchor === "center" ? "-50%" : anchor === "right" ? "-100%" : "0%";
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(${tx}, -50%) translateY(${(1 - k) * 10}px)`, opacity: o, fontFamily: FONT, fontWeight: 800, fontSize: size, color, whiteSpace: "nowrap", textShadow: SHADOW }}>
      {children}
    </div>
  );
};

// A neon stroke: wide faint halo, mid glow, bright core. No CSS filters (they drift between render tabs).
export const Neon: React.FC<{ d: string; color: string; width?: number; o?: number; dash?: string; offset?: number; core?: string }> = ({ d, color, width = 4, o = 1, dash, offset, core }) => (
  <g opacity={o} fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} stroke={color} strokeWidth={width * 6} strokeOpacity={0.07} strokeDasharray={dash} strokeDashoffset={offset} />
    <path d={d} stroke={color} strokeWidth={width * 2.6} strokeOpacity={0.18} strokeDasharray={dash} strokeDashoffset={offset} />
    <path d={d} stroke={core ?? color} strokeWidth={width} strokeDasharray={dash} strokeDashoffset={offset} />
  </g>
);

// A soft round glow (radial gradient) centred at (x, y).
export const Glow: React.FC<{ id: string; x: number; y: number; r: number; color: string; o?: number }> = ({ id, x, y, r, color, o = 1 }) => (
  <g opacity={o}>
    <defs>
      <radialGradient id={id}>
        <stop offset="0%" stopColor={color} stopOpacity={0.9} />
        <stop offset="35%" stopColor={color} stopOpacity={0.35} />
        <stop offset="100%" stopColor={color} stopOpacity={0} />
      </radialGradient>
    </defs>
    <circle cx={x} cy={y} r={r} fill={`url(#${id})`} />
  </g>
);

// Arc path on a circle, angles in degrees (0 = right, clockwise).
export const arc = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const p = (a: number) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  const large = Math.abs(a1 - a0) % 360 > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};
export const polar = (cx: number, cy: number, r: number, a: number): [number, number] => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];

export const star = (cx: number, cy: number, r: number) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = -90 + i * 36;
    const [x, y] = polar(cx, cy, rr, a);
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return `M ${pts.join(" L ")} Z`;
};

// ---------- Brand ----------

export const BrandMark: React.FC<{ o: number; chapter?: { n: string; t: string; k: number } }> = ({ o, chapter }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", left: 46, top: 36, display: "flex", alignItems: "center", gap: 16, opacity: o }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, opacity: 0.72 }}>
        <div style={{ position: "relative", width: 44, height: 44 }}>
          <div style={{ position: "absolute", inset: -9, borderRadius: "50%", background: "radial-gradient(circle, rgba(244,240,232,0.18) 0%, rgba(244,240,232,0.05) 55%, transparent 72%)" }} />
          <Img src={staticFile("mark-disc.png")} style={{ position: "relative", width: 44, height: 44 }} />
        </div>
        <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 28, color: K.fg, letterSpacing: 2, textShadow: SHADOW }}>世界的形状</span>
      </div>
      {chapter && chapter.k > 0 ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: FONT, opacity: chapter.k, transform: `translateX(${(1 - chapter.k) * -16}px)` }}>
          <span style={{ width: 2, height: 26, background: K.line }} />
          <span style={{ fontFamily: NUM, color: K.want, fontWeight: 900, fontSize: 22 }}>{chapter.n}</span>
          <span style={{ color: K.fg, fontWeight: 700, fontSize: 23, opacity: 0.85 }}>{chapter.t}</span>
        </div>
      ) : null}
    </div>
  );

export const EndCard: React.FC<{ at: number }> = ({ at }) => {
  const t = useT();
  const d = t - at;
  if (d < 0) return null;
  const k = ramp(d, 0, 0.8, EO);
  const k2 = ramp(d, 0.45, 1.3, EO);
  return (
    <div style={{ position: "absolute", inset: 0, background: "#050608", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: clamp01(d / 0.33) }}>
      <div style={{ display: "flex", alignItems: "center", gap: 34, opacity: k, transform: `translateY(${(1 - k) * 18}px)` }}>
        <Img src={staticFile("mark-disc.png")} style={{ width: 132, height: 132 }} />
        <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 112, color: K.fg, letterSpacing: 10 }}>世界的形状</span>
      </div>
      <div style={{ marginTop: 34, fontFamily: SERIF, fontWeight: 600, fontSize: 40, letterSpacing: 18, color: "rgba(244,240,232,0.78)", opacity: k2, transform: `translateY(${(1 - k2) * 10}px)` }}>看见世界如何运行</div>
      <div style={{ position: "absolute", bottom: 120, fontFamily: FONT, fontSize: 30, fontWeight: 600, letterSpacing: 6, color: "rgba(244,240,232,0.7)", opacity: k2 }}>MakerJackie</div>
    </div>
  );
};

export const Sources: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const t = useT();
  const o = win(t, at, out, 0.4, 0.3);
  if (o <= 0) return null;
  const rows = [
    "猴子实验：Fiorillo, Tobler, Schultz, Science 2003",
    "想要与喜欢：Berridge & Robinson, American Psychologist 2016；Peciña & Berridge, J Neurosci 2005（大鼠）",
    "老虎机实验：Clark 等, Neuron 2009（剑桥大学）",
    "需要与强迫式游戏：Przybylski, Weinstein, Ryan, Rigby, CyberPsychology & Behavior 2009",
    "游戏满足的三种需要：Ryan, Rigby, Przybylski, Motivation and Emotion 2006",
    "习惯与目标：Lei 等, Journal of Behavioral Addictions 2025",
    "游戏界面为自绘示意，不对应任何一款游戏；一夜的两条线、大脑的位置为示意",
  ];
  return (
    <div style={{ position: "absolute", inset: 0, background: `rgba(5,6,9,${0.9 * o})`, opacity: o }}>
      <div style={{ position: "absolute", left: 140, top: 150, fontFamily: FONT, color: K.fg }}>
        <div style={{ fontSize: 44, fontWeight: 800, marginBottom: 34, letterSpacing: 2 }}>信息来源</div>
        {rows.map((r, i) => (
          <div key={i} style={{ fontSize: 28, fontWeight: 500, color: "rgba(244,240,232,0.8)", lineHeight: 1.9 }}>
            {r}
          </div>
        ))}
      </div>
    </div>
  );
};
