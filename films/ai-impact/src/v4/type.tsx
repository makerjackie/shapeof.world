import React from "react";
import { FONT, SERIF } from "../theme";
import { bump, clamp01, E, lerp, pr, spring, useT } from "./engine";

// v4 type: words are part of the picture. A Words block sits wherever the shot's composition wants it (world or
// screen units), reveals in a style that fits what it says, and can colour and pop its keywords.

export type Reveal = "rise" | "pop" | "slam" | "type" | "blur" | "write";
type Props = {
  at: number;
  lines: string[];
  x: number;
  y: number;
  size: number;
  sizes?: number[];
  colors?: string[];
  align?: "left" | "center" | "right";
  serif?: boolean;
  weight?: number;
  color?: string;
  kw?: string[];
  kwColor?: string;
  kwAt?: number;
  reveal?: Reveal;
  cps?: number;
  gap?: number; // seconds between line starts; default: when the previous line has finished
  out?: number;
  outStyle?: "up" | "fade" | "blur" | "down";
  leading?: number;
  tracking?: number;
  shadow?: boolean;
  glow?: string;
  maxW?: number;
};

const cut = (s: string) => Array.from(s);

export const Words: React.FC<Props> = ({
  at,
  lines,
  x,
  y,
  size,
  sizes,
  colors,
  align = "left",
  serif = false,
  weight,
  color = "#f4f0e8",
  kw = [],
  kwColor = "#ffd166",
  kwAt,
  reveal = "rise",
  cps = 28,
  gap,
  out,
  outStyle = "up",
  leading = 1.18,
  tracking,
  shadow = true,
  glow,
}) => {
  const t = useT();
  if (t < at - 0.3) return null;
  if (out !== undefined && t > out + 0.9) return null;
  const starts: number[] = [];
  let s0 = at;
  lines.forEach((l, i) => {
    starts.push(s0);
    s0 += gap ?? cut(l).length / cps + 0.08;
  });
  const total = lines.reduce((a, l) => a + cut(l).length, 0);
  let idx = 0;
  const tx = align === "center" ? "-50%" : align === "right" ? "-100%" : "0";
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translateX(${tx})`,
        fontFamily: serif ? SERIF : FONT,
        fontWeight: weight ?? (serif ? 700 : 900),
        color,
        lineHeight: leading,
        textAlign: align,
        whiteSpace: "pre",
        textShadow: shadow ? `0 6px 36px rgba(0,0,0,0.75)${glow ? `, 0 0 40px ${glow}` : ""}` : undefined,
      }}
    >
      {lines.map((line, li) => {
        const chars = cut(line);
        const sz = sizes?.[li] ?? size;
        const la = starts[li];
        // keyword ranges in this line
        const kwMask = chars.map(() => false);
        for (const k of kw) {
          const j = line.indexOf(k);
          if (j >= 0) {
            const c0 = cut(line.slice(0, j)).length;
            for (let q = c0; q < c0 + cut(k).length; q++) kwMask[q] = true;
          }
        }
        const lastKw = kwMask.lastIndexOf(true);
        const kwTime = kwAt ?? la + (lastKw + 1) / cps + 0.2;
        const slamP = reveal === "slam" ? pr(t, la - 0.14, 0.14, E.in) : 1;
        const settle = reveal === "slam" ? 1 + 0.05 * Math.max(0, 1 - (t - la) / 0.3) * (t >= la ? 1 : 0) : 1;
        const writeP = reveal === "write" ? pr(t, la, chars.length / cps, E.lin) : 1;
        const lineStyle: React.CSSProperties =
          reveal === "slam"
            ? { transform: `scale(${lerp(2.1, 1, slamP) * settle})`, opacity: slamP, filter: slamP < 1 ? `blur(${(1 - slamP) * 14}px)` : undefined, transformOrigin: align === "center" ? "50% 60%" : align === "right" ? "100% 60%" : "0 60%" }
            : reveal === "write"
              ? { clipPath: `inset(-20% ${(1 - writeP) * 100}% -20% -2%)` }
              : {};
        return (
          <div key={li} style={{ fontSize: sz, letterSpacing: tracking ?? -sz * 0.025, color: colors?.[li] ?? color, ...lineStyle }}>
            {chars.map((c, ci) => {
              const gi = idx++;
              const ct = la + ci / cps;
              const p = pr(t, ct, 0.42, E.out);
              const isKw = kwMask[ci];
              const kwP = isKw ? pr(t, kwTime, 0.3, E.out) : 0;
              const kwB = isKw ? bump(t, kwTime + 0.05, 0.05, 0.4) : 0;
              const o = out === undefined ? 0 : pr(t, out + (gi / Math.max(1, total)) * 0.1, 0.22, E.in);
              let inner: React.CSSProperties = {};
              let wrap: React.CSSProperties = { display: "inline-block", verticalAlign: "top" };
              if (reveal === "rise") {
                wrap = { ...wrap, overflow: "hidden", paddingBottom: "0.08em", marginBottom: "-0.08em" };
                inner = { transform: `translateY(${(1 - p) * 110}%)` };
              } else if (reveal === "pop") {
                const s = spring(t, ct, 2.0, 7.5);
                inner = { transform: `scale(${lerp(0.25, 1, s)}) translateY(${(1 - clamp01(s)) * 0.2}em)`, opacity: clamp01(s * 2.5), filter: s < 0.95 ? `blur(${(1 - clamp01(s)) * 8}px)` : undefined };
              } else if (reveal === "blur") {
                inner = { opacity: p, filter: p < 1 ? `blur(${(1 - p) * 14}px)` : undefined, transform: `translateX(${(1 - p) * -0.25}em)` };
              } else if (reveal === "type") {
                inner = { opacity: t >= ct ? 1 : 0 };
              }
              const outT: React.CSSProperties =
                o > 0
                  ? outStyle === "fade"
                    ? { opacity: 1 - o }
                    : outStyle === "blur"
                      ? { opacity: 1 - o, filter: `blur(${o * 12}px)` }
                      : { opacity: 1 - o, transform: `translateY(${(outStyle === "down" ? 1 : -1) * o * 0.5}em)`, filter: `blur(${o * 8}px)` }
                  : {};
              return (
                <span key={ci} style={{ ...wrap, ...outT }}>
                  <span
                    style={{
                      display: "inline-block",
                      ...inner,
                      color: isKw && kwP > 0 ? kwColor : undefined,
                      transform: `${inner.transform ?? ""} scale(${1 + 0.14 * kwB})`,
                      textShadow: isKw && kwP > 0 ? `0 0 ${30 * kwP}px ${kwColor}66, 0 6px 36px rgba(0,0,0,0.75)` : undefined,
                    }}
                  >
                    {c}
                  </span>
                </span>
              );
            })}
            {reveal === "type" && t >= la && t < la + chars.length / cps + 0.6 && Math.floor(t * 2.4) % 2 === 0 ? (
              <span style={{ display: "inline-block", width: sz * 0.06, height: sz * 0.9, background: color, marginLeft: sz * 0.05, verticalAlign: "-0.1em" }} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

// When a Words block has finished typing (for timing things after it).
export const doneAt = (at: number, lines: string[], cps = 28, gap?: number) =>
  lines.reduce((s, l, i) => s + (i < lines.length - 1 ? (gap ?? cut(l).length / cps + 0.08) : cut(l).length / cps), at);

// A rubber stamp that slams onto the page.
export const Stamp: React.FC<{ at: number; text: string; color: string; size?: number; rot?: number; bg?: string }> = ({ at, text, color, size = 52, rot = -8, bg = "rgba(7,9,11,0.55)" }) => {
  const t = useT();
  const p = pr(t, at - 0.12, 0.12, E.in);
  if (p <= 0) return null;
  const settle = t >= at ? spring(t, at, 3, 9) : 0;
  return (
    <div
      style={{
        display: "inline-block",
        transform: `rotate(${rot}deg) scale(${lerp(2.2, 1, p) * (t >= at ? lerp(0.92, 1, settle) : 1)})`,
        opacity: p,
        padding: `${size * 0.08}px ${size * 0.38}px`,
        border: `${Math.max(3, size * 0.11)}px solid ${color}`,
        borderRadius: size * 0.26,
        color,
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: size,
        whiteSpace: "nowrap",
        background: bg,
      }}
    >
      {text}
    </div>
  );
};

// A small label with an optional leader line, for things in the scene.
export const Tag: React.FC<{ at: number; text: string; sub?: string; color?: string; size?: number; align?: "left" | "right" | "center"; o?: number }> = ({
  at,
  text,
  sub,
  color = "#f4f0e8",
  size = 30,
  align = "left",
  o = 1,
}) => {
  const t = useT();
  const p = pr(t, at, 0.4, E.out);
  if (p <= 0) return null;
  return (
    <div
      style={{
        transform: `translate(${align === "center" ? "-50%" : align === "right" ? "-100%" : "0"}, ${(1 - p) * 14}px)`,
        opacity: p * o,
        fontFamily: FONT,
        textAlign: align,
        whiteSpace: "nowrap",
        textShadow: "0 4px 24px rgba(0,0,0,0.8)",
      }}
    >
      <div style={{ fontSize: size, fontWeight: 900, color }}>{text}</div>
      {sub ? <div style={{ fontSize: size * 0.62, fontWeight: 700, color: "#b8b8b3", marginTop: 4 }}>{sub}</div> : null}
    </div>
  );
};

// Source small print, only where honesty needs it (PLAN-v4: 出处小字只在必要时上屏). Screen space, bottom left.
export const Fine: React.FC<{ at: number; out?: number; children: React.ReactNode }> = ({ at, out, children }) => {
  const t = useT();
  const o = pr(t, at, 0.5) * (out === undefined ? 1 : 1 - pr(t, out, 0.4));
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 96, width: 1500, bottom: 30, fontFamily: FONT, fontSize: 19, fontWeight: 500, lineHeight: 1.4, color: "#f4f0e8", opacity: 0.5 * o }}>{children}</div>
  );
};
