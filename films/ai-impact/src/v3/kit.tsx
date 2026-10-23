import React from "react";
import { FONT } from "../theme";
import { C, clamp01, EIO, EO, pr, useT } from "../v2/kit";

export { Backdrop, C, Cam, CL, clamp01, Corner, EBACK, EIO, EO, Glass, Label, lerp, pr, Scene, Src, useT } from "../v2/kit";

// v3 keeps the v2 look (dark, big kinetic type, clean 2D objects; the user: "效果还可以"). Characters rise in at CPS a
// second, so a 17-character two-line question is fully on screen within one second and the reading rule
// (0.6 s + 0.15 s per character, films/house/tools/reading.mjs) fits inside a 2-bar scene (4.3 s).
export const CPS = 18;

// One caption line: characters rise out of a mask from `at`; the keyword gets the gold marker with ink type on `kwAt`;
// the line lifts and fades on `out`.
export const Line: React.FC<{
  at: number;
  text: string;
  size?: number;
  kw?: string;
  kwAt?: number;
  out?: number;
  color?: string;
  x?: number;
  y?: number;
  center?: boolean;
  weight?: number;
}> = ({ at, text, size = 84, kw, kwAt, out, color = C.fg, x = 120, y = 130, center = false, weight = 900 }) => {
  const t = useT();
  if (t < at - 0.05) return null;
  const chars = Array.from(text);
  const k0 = kw ? text.indexOf(kw) : -1;
  const k1 = k0 >= 0 ? Array.from(text.slice(0, k0)).length + Array.from(kw!).length : -1;
  const kk0 = k0 >= 0 ? Array.from(text.slice(0, k0)).length : -1;
  const hl = kwAt === undefined ? 0 : pr(t, kwAt, 0.3, EO);
  const o = out === undefined ? 0 : pr(t, out, 0.3, EIO);
  if (o >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: center ? 0 : x,
        width: center ? 1920 : undefined,
        textAlign: center ? "center" : undefined,
        top: y,
        fontFamily: FONT,
        fontWeight: weight,
        fontSize: size,
        color,
        whiteSpace: "nowrap",
        lineHeight: 1.15,
        letterSpacing: -1,
        opacity: 1 - o,
        transform: `translateY(${-o * 14}px)`,
      }}
    >
      {chars.map((c, i) => {
        const p = pr(t, at + i / CPS, 0.22, EO);
        const inKw = i >= kk0 && i < k1;
        const fill = inKw ? clamp01(hl * (k1 - kk0) - (i - kk0)) : 0;
        return (
          <span key={i} style={{ position: "relative", display: "inline-block", overflow: "hidden", verticalAlign: "top", whiteSpace: "pre" }}>
            {fill > 0 ? <span style={{ position: "absolute", left: 0, top: size * 0.1, bottom: size * 0.03, width: `${fill * 100}%`, background: C.gold, zIndex: 0 }} /> : null}
            <span style={{ position: "relative", zIndex: 1, display: "inline-block", transform: `translateY(${(1 - p) * 105}%)`, color: inKw && fill > 0.5 ? C.ink : undefined }}>{c}</span>
          </span>
        );
      })}
    </div>
  );
};

// A two-line caption (one sentence per screen; the second line starts when the first has risen in).
export const Lines: React.FC<{
  at: number;
  a: string;
  b?: string;
  out?: number;
  size?: number;
  x?: number;
  y?: number;
  kw?: string;
  kwAt?: number;
  kwLine?: 0 | 1;
  center?: boolean;
  color?: string;
}> = ({ at, a, b, out, size = 84, x = 120, y = 120, kw, kwAt, kwLine = 1, center, color }) => {
  const at2 = at + Array.from(a).length / CPS;
  const gap = size * 1.18;
  return (
    <>
      <Line at={at} text={a} out={out} size={size} x={x} y={y} center={center} color={color} kw={kwLine === 0 ? kw : undefined} kwAt={kwLine === 0 ? kwAt : undefined} />
      {b ? <Line at={at2} text={b} out={out} size={size} x={x} y={y + gap} center={center} color={color} kw={kwLine === 1 ? kw : undefined} kwAt={kwLine === 1 ? kwAt : undefined} /> : null}
    </>
  );
};

// Time the second line of a caption starts (for sound cues).
export const line2At = (at: number, a: string) => at + Array.from(a).length / CPS;
