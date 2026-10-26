// v15 kit: the two carriers the user picked. E: streams of light, one per model, whose length is the number.
// D: split-flap rows for the title, the formula and the few numbers that deserve a mechanical moment.
import React, { useLayoutEffect, useState } from "react";
import { continueRender, delayRender, Easing } from "remotion";
import { FONT, MONO } from "../v10/theme";

export { FONT, MONO };
export const EO = Easing.bezier(0.16, 1, 0.3, 1);
export const EIO = Easing.bezier(0.65, 0, 0.35, 1);
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const ramp = (x: number, a: number, z: number, e: (v: number) => number = EIO) => e(clamp01((x - a) / (z - a)));
export const hash = (a: number, b = 0, c = 0) => {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 1440670441);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};
export const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
export const GOLD = "#ffb23e";
export const INK = "#f3f0e8";

/** Holds the render until every glyph we draw is loaded. */
export const useFonts = (specs: string[], text: string) => {
  const [h] = useState(() => delayRender("v15 fonts"));
  useLayoutEffect(() => {
    Promise.all(specs.map((s) => document.fonts.load(s, text)))
      .catch(() => undefined)
      .then(() => continueRender(h));
  }, [h]); // eslint-disable-line react-hooks/exhaustive-deps
};

// ---------- E: a stream of light ----------

type StreamProps = { t: number; x0: number; y: number; len: number; color: string; level: number; seed: number; h?: number };

/** A glowing bar with light flowing along it towards a white-hot tip. Its length is the value. */
export const Stream: React.FC<StreamProps> = ({ t, x0, y, len, color, level, seed, h = 40 }) => {
  const L = Math.max(0, len);
  if (L < 1 || level <= 0.001) return null;
  const n = Math.floor(L / 12);
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x0 - 80,
          top: y - 70,
          width: L + 220,
          height: 140 + h,
          background: `radial-gradient(ellipse 50% 50% at ${L > 300 ? 72 : 60}% 50%, ${rgba(color, 0.18 * level)}, rgba(0,0,0,0) 70%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: x0,
          top: y - h / 2,
          width: L,
          height: h,
          borderRadius: h / 2,
          opacity: level,
          background: `linear-gradient(90deg, ${rgba(color, 0.1)} 0%, ${rgba(color, 0.62)} ${L > 120 ? 72 : 40}%, ${rgba("#ffffff", 0.95)} 100%)`,
          boxShadow: `0 0 26px ${rgba(color, 0.45)}, inset 0 1px 0 rgba(255,255,255,0.35)`,
          overflow: "hidden",
        }}
      >
        {Array.from({ length: n }, (_, k) => {
          const sp = 40 + hash(seed, k, 2) * 90;
          const x = (hash(seed, k) * L + t * sp) % L;
          return (
            <div
              key={k}
              style={{
                position: "absolute",
                left: x,
                top: 6 + hash(seed, k, 3) * (h - 12),
                width: 3,
                height: 3,
                borderRadius: 2,
                background: "#fff",
                opacity: 0.2 + 0.65 * (x / L),
              }}
            />
          );
        })}
      </div>
    </>
  );
};

// ---------- D: split flaps ----------

export type Change = { at: number; ch: string };
const POOL_L = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$.";
const POOL_C = "价格模型时间费用倍数单量包月你的真实一道题差距大到是集文字";
export const isCJK = (c: string) => /[　-鿿＀-￯]/.test(c);
export const FLAP_POOL = POOL_L + POOL_C;
const FLIP = 0.055;

const charAt = (changes: Change[], t: number, seed: number) => {
  let prev = " ";
  for (let i = 0; i < changes.length; i++) {
    const c = changes[i];
    const next = changes[i + 1];
    if (t < c.at) return [prev, prev, -1] as const;
    if (!next || t < next.at) {
      if (c.ch === prev) return [prev, prev, -1] as const;
      const n = 3 + Math.floor(hash(seed, i) * 5);
      const k = Math.floor((t - c.at) / FLIP);
      if (k >= n) return [c.ch, c.ch, -1] as const;
      const pool = isCJK(c.ch) || isCJK(prev) ? POOL_C : POOL_L;
      const mid = (j: number) => pool[Math.floor(hash(seed, i, j) * pool.length)];
      return [k === 0 ? prev : mid(k - 1), k === n - 1 ? c.ch : mid(k), ((t - c.at) % FLIP) / FLIP] as const;
    }
    prev = c.ch;
  }
  return [prev, prev, -1] as const;
};

type Size = { w: number; h: number; fs: number };
const Half: React.FC<{ ch: string; top: boolean; color: string; s: Size; style?: React.CSSProperties }> = ({ ch, top, color, s, style }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: top ? 0 : s.h / 2,
      width: s.w,
      height: s.h / 2,
      overflow: "hidden",
      borderRadius: top ? `${s.w * 0.09}px ${s.w * 0.09}px 0 0` : `0 0 ${s.w * 0.09}px ${s.w * 0.09}px`,
      background: top ? "linear-gradient(180deg, #2a2a2a, #222)" : "linear-gradient(180deg, #1c1c1c, #181818)",
      ...style,
    }}
  >
    <div
      style={{
        position: "absolute",
        left: 0,
        top: top ? 0 : -s.h / 2,
        width: s.w,
        height: s.h,
        lineHeight: `${s.h}px`,
        textAlign: "center",
        fontFamily: FONT,
        fontWeight: isCJK(ch) ? 900 : 700,
        fontSize: isCJK(ch) ? s.fs * 0.88 : s.fs,
        color,
      }}
    >
      {ch === " " ? "" : ch}
    </div>
  </div>
);

export const Flap: React.FC<{ x: number; y: number; changes: Change[]; t: number; seed: number; color: string; s: Size }> = ({ x, y, changes, t, seed, color, s }) => {
  const [from, to, ph] = charAt(changes, t, seed);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: s.w, height: s.h, perspective: s.h * 5, boxShadow: "0 3px 8px rgba(0,0,0,0.6)", borderRadius: s.w * 0.09 }}>
      <Half ch={to} top color={color} s={s} />
      <Half ch={ph < 0 ? to : from} top={false} color={color} s={s} />
      {ph >= 0 && ph < 0.5 && (
        <Half ch={from} top color={color} s={s} style={{ transformOrigin: "50% 100%", transform: `rotateX(${-180 * ph}deg)`, filter: `brightness(${1 - ph * 0.9})`, zIndex: 2 }} />
      )}
      {ph >= 0.5 && (
        <Half ch={to} top={false} color={color} s={s} style={{ transformOrigin: "50% 0%", transform: `rotateX(${180 * (1 - ph)}deg)`, filter: `brightness(${0.4 + (ph - 0.5) * 1.2})`, zIndex: 2 }} />
      )}
      <div style={{ position: "absolute", left: 0, right: 0, top: s.h / 2 - 1, height: 2, background: "#080808", zIndex: 3 }} />
    </div>
  );
};

/** A row of flaps that shows a sequence of strings over time, each change rattling across left to right. */
export const FlapRow: React.FC<{
  t: number;
  x: number;
  y: number;
  n: number;
  s: Size;
  gap?: number;
  states: { at: number; text: string[] }[];
  color: (i: number, t: number) => string;
  seed: number;
  stagger?: number;
}> = ({ t, x, y, n, s, gap = 6, states, color, seed, stagger = 0.03 }) => (
  <>
    {Array.from({ length: n }, (_, i) => (
      <Flap
        key={i}
        x={x + i * (s.w + gap)}
        y={y}
        t={t}
        seed={seed * 100 + i}
        color={color(i, t)}
        s={s}
        changes={states.map((st) => ({ at: st.at + i * stagger, ch: st.text[i] ?? " " }))}
      />
    ))}
  </>
);

/** Splits a string into flap cells: one cell per character, padded or centred to n cells. */
export const cells = (s: string, n: number, align: "left" | "center" = "left") => {
  const a = [...s];
  const pad = align === "center" ? Math.floor((n - a.length) / 2) : 0;
  return [...Array(Math.max(0, pad)).fill(" "), ...a, ...Array(n).fill(" ")].slice(0, n);
};

// ---------- texture ----------

export const Grain: React.FC<{ frame: number; amount?: number }> = ({ frame, amount = 0.05 }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: amount, mixBlendMode: "screen", pointerEvents: "none" }}>
    <filter id="v15-grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={frame % 97} />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <rect width="100%" height="100%" filter="url(#v15-grain)" />
  </svg>
);
export const Vignette: React.FC = () => (
  <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 78% 72% at 50% 50%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.6) 100%)" }} />
);
