import React from "react";
import { FONT, K, MONO, SANS } from "./theme";
import { EO, Odometer, pr } from "./kit";

// Flat 2D illustrations of real objects. Text sits in HTML on top of the SVG (no centred SVG text).

const INK = "#16161c";

// ───────── Mascots: Claude's little sun and DeepSeek's whale (stylised, not the real logos) ─────────

export type Mood = "happy" | "smug" | "shock" | "sweat" | "party";

const Face: React.FC<{ mood: Mood; t: number }> = ({ mood, t }) => {
  const blink = (t * 30) % 97 < 3 && mood !== "shock";
  const eye = (x: number) => {
    if (blink) return <path key={x} d={`M${x - 10} -8 L${x + 10} -8`} stroke={INK} strokeWidth={5} strokeLinecap="round" />;
    if (mood === "smug") return <path key={x} d={`M${x - 11} -6 Q${x} -14 ${x + 11} -6`} stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" />;
    if (mood === "party") return <path key={x} d={`M${x - 10} -4 Q${x} -18 ${x + 10} -4`} stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" />;
    const r = mood === "shock" ? 14 : 11;
    return (
      <g key={x}>
        <circle cx={x} cy={-8} r={r} fill="#fff" />
        <circle cx={x + (mood === "happy" ? 2 : 0)} cy={-6} r={mood === "shock" ? 4 : 6} fill={INK} />
      </g>
    );
  };
  const mouth =
    mood === "happy" ? <path d="M-16 12 Q0 30 16 12" stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" /> :
    mood === "party" ? <path d="M-18 10 Q0 40 18 10 Z" fill={INK} /> :
    mood === "smug" ? <path d="M-14 18 Q6 26 20 10" stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" /> :
    mood === "shock" ? <ellipse cx={0} cy={20} rx={9} ry={12} fill={INK} /> :
    <path d="M-15 18 Q-7 12 0 18 Q7 24 15 18" stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" />;
  const ph = (t * 1.6) % 1;
  return (
    <g>
      {eye(-18)}
      {eye(18)}
      {mood === "sweat" ? (
        <g stroke={INK} strokeWidth={5} strokeLinecap="round">
          <path d="M-28 -26 L-10 -22" />
          <path d="M28 -26 L10 -22" />
        </g>
      ) : null}
      {mood === "happy" || mood === "party" ? (
        <g fill="#ff8fa3" opacity={0.6}>
          <circle cx={-30} cy={10} r={7} />
          <circle cx={30} cy={10} r={7} />
        </g>
      ) : null}
      {mouth}
      {mood === "sweat" ? <path d="M0 0 C-7 10 -7 18 0 18 C7 18 7 10 0 0 Z" fill="#9fd3ff" transform={`translate(44 ${-40 + ph * 30})`} opacity={1 - ph} /> : null}
    </g>
  );
};

// `beat` = seconds per beat of the music under the scene; the body squashes a little on each beat.
const bounceOf = (t: number, beat: number, amount: number) => Math.exp(-((t / beat) % 1) * 6) * amount;

export const Spark: React.FC<{ t: number; size?: number; mood?: Mood; beat?: number; bounce?: number }> = ({ t, size = 200, mood = "happy", beat = 0.5217, bounce = 1 }) => {
  const b = bounceOf(t, beat, bounce);
  return (
    <svg width={size} height={size} viewBox="-100 -100 200 200" style={{ overflow: "visible", display: "block" }}>
      <g transform={`translate(0 ${-b * 14}) scale(${1 + b * 0.07} ${1 - b * 0.07})`}>
        <g transform={`rotate(${t * 15})`}>
          {Array.from({ length: 8 }).map((_, i) => (
            <rect key={i} x={-14} y={-95} width={28} height={70} rx={14} fill={K.claude} transform={`rotate(${i * 45})`} />
          ))}
        </g>
        <circle r={56} fill={K.claude} />
        <Face mood={mood} t={t} />
      </g>
    </svg>
  );
};

export const Whale: React.FC<{ t: number; size?: number; mood?: Mood; beat?: number; bounce?: number }> = ({ t, size = 240, mood = "happy", beat = 0.5217, bounce = 1 }) => {
  const b = bounceOf(t, beat, bounce);
  const wag = Math.sin(t * 7.5) * 10;
  const spout = mood === "happy" || mood === "party" || mood === "smug";
  const f = t * 30;
  return (
    <svg width={size} height={size * 0.8} viewBox="-120 -100 240 192" style={{ overflow: "visible", display: "block" }}>
      <g transform={`translate(0 ${-b * 12}) scale(${1 + b * 0.05} ${1 - b * 0.05})`}>
        {spout ? (
          <g fill="#9fd3ff" opacity={0.9}>
            {[-14, 0, 14].map((dx, i) => (
              <circle key={i} cx={-30 + dx * (1 + ((f + i * 5) % 20) / 20)} cy={-70 - ((f + i * 5) % 20) * 1.6} r={6} />
            ))}
          </g>
        ) : null}
        <path d="M70 10 C95 0 104 -34 116 -42 C114 -18 110 -4 100 6 C112 16 118 34 116 46 C100 32 90 22 70 24 Z" fill={K.deepseek} transform={`rotate(${wag} 70 15)`} />
        <path d="M-92 12 C-92 -48 -32 -70 18 -62 C62 -54 84 -20 84 12 C84 52 32 66 -20 64 C-70 62 -92 42 -92 12 Z" fill={K.deepseek} />
        <path d="M-84 28 C-62 58 22 62 66 36 C34 54 -42 56 -84 28 Z" fill="#a9b9ff" />
        <g transform="translate(-36 4) scale(0.95)">
          <Face mood={mood} t={t} />
        </g>
      </g>
    </svg>
  );
};

// Small round badges for labels (stylised glyphs, not real logos).
export const ClaudeGlyph: React.FC<{ size: number; color?: string }> = ({ size, color = K.claude }) => (
  <svg width={size} height={size} viewBox="-50 -50 100 100" style={{ display: "block" }}>
    {Array.from({ length: 10 }).map((_, i) => (
      <rect key={i} x={-5} y={-44} width={10} height={44} rx={5} fill={color} transform={`rotate(${i * 36 + (i % 2) * 6})`} />
    ))}
  </svg>
);

export const WhaleGlyph: React.FC<{ size: number; color?: string }> = ({ size, color = K.deepseek }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block" }}>
    <path d="M12 52 C12 30 34 22 52 24 C70 26 82 38 84 50 C88 46 92 40 96 38 C95 48 92 56 86 60 C82 74 66 82 48 82 C28 82 12 70 12 52 Z" fill={color} />
    <circle cx="34" cy="48" r="4.5" fill="#fff" />
  </svg>
);

// ───────── Price tag hanging on a string, pivoting at its hole ─────────

export const PriceTag: React.FC<{
  w: number;
  color: string;
  deep: string;
  glyph: React.ReactNode;
  name: string;
  gloss: string;
  value: number;
  decimals?: number;
  priceColor?: string;
  angle: number;
  heat?: number;
  stringLen?: number;
}> = ({ w, color, deep, glyph, name, gloss, value, decimals = 0, priceColor = K.ink, angle, heat = 0, stringLen = 600 }) => {
  const h = w * 1.25;
  const notch = w * 0.16;
  return (
    <div style={{ position: "relative", width: w, height: h, transformOrigin: `${w / 2}px ${notch * 0.55}px`, transform: `rotate(${angle}deg)` }}>
      {/* string */}
      <div style={{ position: "absolute", left: w / 2 - 1.5, top: -stringLen + notch * 0.55, width: 3, height: stringLen, background: "linear-gradient(180deg, rgba(241,236,223,0), rgba(241,236,223,0.55))" }} />
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <defs>
          <linearGradient id={`tg-${name.replace(/\W/g, "")}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fbf7ee" />
            <stop offset="1" stopColor="#e6dfcf" />
          </linearGradient>
        </defs>
        <path
          d={`M${notch} 0 L${w - notch} 0 L${w} ${notch} L${w} ${h - 18} Q${w} ${h} ${w - 18} ${h} L18 ${h} Q0 ${h} 0 ${h - 18} L0 ${notch} Z`}
          fill={`url(#tg-${name.replace(/\W/g, "")})`}
          stroke="rgba(0,0,0,0.12)"
          strokeWidth={2}
        />
        <path d={`M${notch} 0 L${w - notch} 0 L${w} ${notch} L${w} ${h * 0.25} L0 ${h * 0.25} L0 ${notch} Z`} fill={color} />
        <path d={`M0 ${h * 0.25 - 8} L${w} ${h * 0.25 - 8} L${w} ${h * 0.25} L0 ${h * 0.25} Z`} fill={deep} opacity={0.5} />
        <circle cx={w / 2} cy={notch * 0.55} r={w * 0.035} fill={K.bg} stroke={deep} strokeWidth={3} />
        {heat > 0 ? <rect x={0} y={h * 0.25} width={w} height={h * 0.75 - 18} fill={K.red} opacity={0.1 * heat} /> : null}
      </svg>
      <div style={{ position: "absolute", left: w * 0.08, top: notch * 1.15, display: "flex", alignItems: "center", gap: w * 0.03 }}>
        <div style={{ width: w * 0.13, height: w * 0.13, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>{glyph}</div>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: w * 0.085, color: "#fff", whiteSpace: "nowrap" }}>{name}</div>
      </div>
      <div style={{ position: "absolute", left: w * 0.08, top: h * 0.3, fontFamily: SANS, fontWeight: 700, fontSize: w * 0.055, color: "#5d5a52", whiteSpace: "nowrap" }}>{gloss}</div>
      <div style={{ position: "absolute", left: w * 0.06, top: h * 0.42 }}>
        <Odometer value={value} decimals={decimals} size={w * 0.3} prefix="¥" color={priceColor} />
      </div>
      <div style={{ position: "absolute", left: w * 0.08, top: h * 0.8, fontFamily: SANS, fontWeight: 700, fontSize: w * 0.055, color: "#5d5a52", whiteSpace: "nowrap" }}>每百万 token · 输出</div>
    </div>
  );
};

// ───────── Receipt printer and paper (paper rises out of a slot; newest line sits just above the slot) ─────────

export type RLine =
  | { k: "head"; text: string; sub?: string }
  | { k: "row"; l: string; r: string; color?: string; big?: boolean }
  | { k: "bar"; l: string; r: string; color: string; h: number; note?: string }
  | { k: "rule" }
  | { k: "total"; l: string; r: string; color?: string };

const lineH = (ln: RLine, s: number) =>
  ln.k === "head" ? (ln.sub ? 104 : 74) * s : ln.k === "rule" ? 22 * s : ln.k === "total" ? 86 * s : ln.k === "bar" ? (ln.h + 58) * s : (ln.big ? 64 : 46) * s;

export const receiptHeight = (lines: RLine[], s = 1) => lines.reduce((a, l) => a + lineH(l, s), 0) + 44 * s;

const LineView: React.FC<{ ln: RLine; s: number; w: number; grow: number }> = ({ ln, s, w, grow }) => {
  const pad = 26 * s;
  if (ln.k === "head")
    return (
      <div style={{ height: lineH(ln, s), padding: `${12 * s}px ${pad}px 0`, borderBottom: `${2 * s}px dashed #a59f92`, boxSizing: "border-box" }}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 32 * s, color: K.ink, whiteSpace: "nowrap" }}>{ln.text}</div>
        {ln.sub ? <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 21 * s, color: "#6b665c", marginTop: 4 * s, whiteSpace: "nowrap" }}>{ln.sub}</div> : null}
      </div>
    );
  if (ln.k === "rule") return <div style={{ height: lineH(ln, s), borderBottom: `${2 * s}px dashed #a59f92`, margin: `0 ${pad}px`, boxSizing: "border-box" }} />;
  if (ln.k === "total")
    return (
      <div style={{ height: lineH(ln, s), display: "flex", alignItems: "center", justifyContent: "space-between", padding: `0 ${pad}px`, fontFamily: FONT, color: K.ink }}>
        <span style={{ fontSize: 34 * s, fontWeight: 900 }}>{ln.l}</span>
        <span style={{ fontSize: 56 * s, fontWeight: 900, color: ln.color ?? K.ink, letterSpacing: -1 }}>{ln.r}</span>
      </div>
    );
  if (ln.k === "bar")
    return (
      <div style={{ height: lineH(ln, s), padding: `${8 * s}px ${pad}px 0`, boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontFamily: FONT, color: K.ink }}>
          <span style={{ fontSize: 28 * s, fontWeight: 700 }}>{ln.l}</span>
          <span style={{ fontSize: 34 * s, fontWeight: 900, color: ln.color }}>{ln.r}</span>
        </div>
        <div style={{ position: "relative", marginTop: 6 * s, height: ln.h * s, width: w - 2 * pad, borderRadius: 6 * s, overflow: "hidden", background: "rgba(0,0,0,0.04)" }}>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${grow * 100}%`, background: `repeating-linear-gradient(0deg, ${ln.color}, ${ln.color} ${10 * s}px, ${ln.color}dd ${10 * s}px, ${ln.color}dd ${12 * s}px)` }} />
          {ln.note ? (
            <div style={{ position: "absolute", left: 14 * s, bottom: 10 * s, fontFamily: SANS, fontSize: 22 * s, fontWeight: 700, color: "#fff", opacity: grow > 0.6 ? 1 : 0, whiteSpace: "nowrap" }}>{ln.note}</div>
          ) : null}
        </div>
      </div>
    );
  return (
    <div style={{ height: lineH(ln, s), display: "flex", alignItems: "center", justifyContent: "space-between", padding: `0 ${pad}px`, fontFamily: MONO, color: K.ink }}>
      <span style={{ fontSize: (ln.big ? 30 : 24) * s, fontWeight: 700, fontFamily: ln.big ? FONT : MONO }}>{ln.l}</span>
      <span style={{ fontSize: (ln.big ? 38 : 26) * s, fontWeight: 900, color: ln.color ?? K.ink, fontFamily: FONT }}>{ln.r}</span>
    </div>
  );
};

// `printed` = number of lines out (fractional = the newest line is feeding). `barGrow` scales the newest bar line.
export const Receipt: React.FC<{ lines: RLine[]; printed: number; w: number; s?: number; accent: string; glow?: number; label?: React.ReactNode }> = ({
  lines,
  printed,
  w,
  s = 1,
  accent,
  glow = 0,
  label,
}) => {
  const n = Math.max(0, Math.min(lines.length, printed));
  const whole = Math.floor(n);
  const frac = n - whole;
  let h = 18 * s;
  const shown: { ln: RLine; grow: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (i < whole) {
      h += lineH(lines[i], s);
      shown.push({ ln: lines[i], grow: 1 });
    } else if (i === whole && frac > 0) {
      h += lineH(lines[i], s) * EO(frac);
      shown.push({ ln: lines[i], grow: EO(frac) });
    }
  }
  if (whole >= lines.length) h += 26 * s;
  const slotW = w + 50 * s;
  return (
    <div style={{ position: "relative", width: slotW, height: 0 }}>
      {/* paper */}
      <div
        style={{
          position: "absolute",
          left: 25 * s,
          bottom: 14 * s,
          width: w,
          height: h,
          background: `linear-gradient(90deg, #e9e3d4, ${K.receipt} 12%, ${K.receipt} 88%, #e4ddcc)`,
          overflow: "hidden",
          boxShadow: `0 30px 60px rgba(0,0,0,0.5)${glow > 0 ? `, 0 0 ${80 * glow}px ${accent}66` : ""}`,
          clipPath: `polygon(0 ${12 * s}px, 4% 0, 8% ${12 * s}px, 12% 0, 16% ${12 * s}px, 20% 0, 24% ${12 * s}px, 28% 0, 32% ${12 * s}px, 36% 0, 40% ${12 * s}px, 44% 0, 48% ${12 * s}px, 52% 0, 56% ${12 * s}px, 60% 0, 64% ${12 * s}px, 68% 0, 72% ${12 * s}px, 76% 0, 80% ${12 * s}px, 84% 0, 88% ${12 * s}px, 92% 0, 96% ${12 * s}px, 100% 0, 100% 100%, 0 100%)`,
        }}
      >
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
          {shown.map((x, i) => (
            <LineView key={i} ln={x.ln} s={s} w={w} grow={x.grow} />
          ))}
          <div style={{ height: 6 * s }} />
        </div>
      </div>
      {/* printer mouth */}
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: -40 * s,
          width: slotW,
          height: 58 * s,
          borderRadius: 16 * s,
          background: "linear-gradient(180deg, #2a2e34, #15181c)",
          boxShadow: `inset 0 2px 0 rgba(255,255,255,0.08), 0 20px 40px rgba(0,0,0,0.6)`,
        }}
      >
        <div style={{ position: "absolute", left: 18 * s, right: 18 * s, top: 8 * s, height: 8 * s, borderRadius: 4 * s, background: "#050607" }} />
        <div style={{ position: "absolute", right: 22 * s, bottom: 13 * s, width: 12 * s, height: 12 * s, borderRadius: "50%", background: accent, boxShadow: `0 0 ${12 * s}px ${accent}` }} />
        {label ? <div style={{ position: "absolute", left: 22 * s, bottom: 9 * s, fontFamily: FONT, fontWeight: 900, fontSize: 20 * s, color: accent, whiteSpace: "nowrap" }}>{label}</div> : null}
      </div>
    </div>
  );
};

// ───────── Membership card ─────────
export const MemberCard: React.FC<{ w: number; shine: number }> = ({ w, shine }) => {
  const h = w * 0.63;
  return (
    <div
      style={{
        position: "relative",
        width: w,
        height: h,
        borderRadius: w * 0.05,
        background: "linear-gradient(135deg, #2b2320 0%, #15110f 55%, #2a1d17 100%)",
        boxShadow: "0 40px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.12)",
        overflow: "hidden",
        fontFamily: FONT,
      }}
    >
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(115deg, transparent ${lerpPct(shine, -40, 100)}%, rgba(255,220,180,0.22) ${lerpPct(shine, -30, 110)}%, transparent ${lerpPct(shine, -20, 120)}%)` }} />
      <div style={{ position: "absolute", left: w * 0.07, top: w * 0.07, display: "flex", alignItems: "center", gap: w * 0.025 }}>
        <ClaudeGlyph size={w * 0.09} />
        <span style={{ fontSize: w * 0.065, fontWeight: 900, color: K.claudeHi, whiteSpace: "nowrap" }}>Claude Max</span>
        <span style={{ fontSize: w * 0.045, fontWeight: 900, color: "#1a1410", background: K.claudeHi, borderRadius: 6, padding: "2px 10px" }}>20x</span>
      </div>
      <div style={{ position: "absolute", left: w * 0.07, top: h * 0.4, width: w * 0.13, height: w * 0.1, borderRadius: 8, background: "linear-gradient(135deg, #f3d27a, #b8862e)" }} />
      <div style={{ position: "absolute", left: w * 0.07, bottom: h * 0.1, fontFamily: SANS, fontSize: w * 0.045, color: "#c9b8a8", fontWeight: 700, whiteSpace: "nowrap" }}>包月会员 · 每月</div>
      <div style={{ position: "absolute", right: w * 0.07, bottom: h * 0.07, fontSize: w * 0.11, color: K.fg, fontWeight: 900, whiteSpace: "nowrap", letterSpacing: -1 }}>
        <span style={{ fontSize: w * 0.05, color: "#c9b8a8", marginRight: 8 }}>约</span>¥1,344
      </div>
    </div>
  );
};
const lerpPct = (p: number, a: number, b: number) => a + (b - a) * p;

// ───────── Coins (one coin = one month of Max) ─────────
export const COIN_W = 190;
export const COIN_T = 15;
const COIN_RY = 30;

export const Coin: React.FC<{ shade?: number; gold?: boolean; w?: number }> = ({ shade = 0, gold = true, w = COIN_W }) => {
  const c = gold ? { top: "#f6d57a", rim: "#d9a840", side: "#b98429", line: "#ecc35a" } : { top: "#eef0f3", rim: "#c3c8cf", side: "#9fa6b0", line: "#d9dde2" };
  const ry = (COIN_RY * w) / COIN_W;
  return (
    <svg width={w} height={ry * 2 + COIN_T} style={{ position: "absolute", left: -w / 2, top: -ry, overflow: "visible" }}>
      <path d={`M0,${ry} L0,${ry + COIN_T} A${w / 2},${ry} 0 0 0 ${w},${ry + COIN_T} L${w},${ry} Z`} fill={c.side} />
      <path d={`M0,${ry} L0,${ry + COIN_T} A${w / 2},${ry} 0 0 0 ${w},${ry + COIN_T} L${w},${ry} Z`} fill="#000" opacity={shade * 0.15} />
      {Array.from({ length: 16 }).map((_, i) => {
        const x = 8 + i * ((w - 16) / 15);
        return <line key={i} x1={x} y1={ry + 3} x2={x} y2={ry + COIN_T - 1} stroke="#000" strokeOpacity={0.12} strokeWidth={2} />;
      })}
      <ellipse cx={w / 2} cy={ry} rx={w / 2} ry={ry} fill={c.rim} />
      <ellipse cx={w / 2} cy={ry} rx={w / 2 - 10} ry={ry - 6} fill={c.top} />
      <ellipse cx={w / 2} cy={ry} rx={w / 2 - 26} ry={ry - 13} fill="none" stroke={c.line} strokeWidth={3} />
    </svg>
  );
};

// ───────── Analog clock; `minutes` drives the hands; `arc` (0–1) draws a swept 5-minute wedge ─────────
export const Clock: React.FC<{ size: number; minutes: number; seconds?: number; arc?: number; arcFrom?: number; color?: string; face?: string }> = ({ size, minutes, seconds, arc = 0, arcFrom = 0, color = K.time, face = "#f6f2e7" }) => {
  const r = size / 2;
  const mA = (minutes % 60) * 6;
  const hA = (minutes / 60) * 30;
  const a0 = ((arcFrom % 60) * 6 - 90) * (Math.PI / 180);
  const a1 = (((arcFrom % 60) * 6 + arc * 30) - 90) * (Math.PI / 180);
  const R = r * 0.82;
  const large = arc * 30 > 180 ? 1 : 0;
  return (
    <svg width={size} height={size} viewBox={`${-r} ${-r} ${size} ${size}`} style={{ display: "block", overflow: "visible" }}>
      <circle r={r} fill="#1c1f24" />
      <circle r={r * 0.9} fill={face} />
      {arc > 0 ? <path d={`M0 0 L${R * Math.cos(a0)} ${R * Math.sin(a0)} A${R} ${R} 0 ${large} 1 ${R * Math.cos(a1)} ${R * Math.sin(a1)} Z`} fill={color} opacity={0.55} /> : null}
      {Array.from({ length: 12 }).map((_, i) => (
        <rect key={i} x={-r * 0.02} y={-r * 0.86} width={r * 0.04} height={r * (i % 3 === 0 ? 0.14 : 0.08)} fill="#2a2a30" transform={`rotate(${i * 30})`} />
      ))}
      <rect x={-r * 0.035} y={-r * 0.48} width={r * 0.07} height={r * 0.52} rx={r * 0.03} fill="#2a2a30" transform={`rotate(${hA})`} />
      <rect x={-r * 0.025} y={-r * 0.72} width={r * 0.05} height={r * 0.78} rx={r * 0.02} fill="#2a2a30" transform={`rotate(${mA})`} />
      {seconds !== undefined ? <rect x={-r * 0.012} y={-r * 0.8} width={r * 0.024} height={r * 0.95} fill={K.red} transform={`rotate(${seconds * 6})`} /> : null}
      <circle r={r * 0.06} fill={color} />
    </svg>
  );
};

// ───────── Hourglass (sand p: 0 = all on top) ─────────
export const Hourglass: React.FC<{ p: number; size?: number }> = ({ p, size = 300 }) => {
  const top = 1 - p;
  return (
    <svg width={size} height={size * 1.4} viewBox="0 0 300 420" style={{ overflow: "visible", display: "block" }}>
      <defs>
        <clipPath id="hg-top">
          <path d="M40 30 L260 30 C260 120 175 170 155 205 L145 205 C125 170 40 120 40 30 Z" />
        </clipPath>
        <clipPath id="hg-bot">
          <path d="M145 215 L155 215 C175 250 260 300 260 390 L40 390 C40 300 125 250 145 215 Z" />
        </clipPath>
      </defs>
      <rect x={20} y={10} width={260} height={20} rx={8} fill="#7a5a3c" />
      <rect x={20} y={390} width={260} height={20} rx={8} fill="#7a5a3c" />
      <rect x={40} y={205 - 175 * top} width={220} height={175 * top} fill={K.time} clipPath="url(#hg-top)" />
      <rect x={40} y={390 - 175 * p} width={220} height={175 * p} fill={K.time} clipPath="url(#hg-bot)" />
      {p > 0 && p < 1 ? <rect x={147} y={205} width={6} height={185 - 175 * p} fill={K.timeHi} opacity={0.9} /> : null}
      <path
        d="M40 30 L260 30 C260 120 175 170 155 210 C175 250 260 300 260 390 L40 390 C40 300 125 250 145 210 C125 170 40 120 40 30 Z"
        fill="rgba(255,255,255,0.06)"
        stroke="rgba(255,255,255,0.75)"
        strokeWidth={5}
      />
    </svg>
  );
};

// ───────── People ─────────

// You, at the desk (front view, shoulders up). gaze −1..1 looks left/right; worry 0..1.
export const You: React.FC<{ size: number; gaze?: number; worry?: number; blinkT?: number }> = ({ size, gaze = 0, worry = 0, blinkT = 0 }) => {
  const blink = (blinkT * 30) % 113 < 3;
  return (
    <svg width={size} height={size * 1.1} viewBox="-100 -110 200 220" style={{ overflow: "visible", display: "block" }}>
      <path d="M-78,110 Q-78,36 0,36 Q78,36 78,110 Z" fill="#3a6ea5" />
      <path d="M-20,40 L0,62 L20,40 Z" fill="#f2c9a5" />
      <circle cx="0" cy="-22" r="70" fill="#f2c9a5" />
      <path d="M-72,-26 Q-68,-98 0,-98 Q68,-98 72,-26 Q56,-62 8,-64 Q-40,-68 -72,-26 Z" fill="#2a2420" />
      {blink ? (
        <>
          <path d="M-34,-22 L-18,-22" stroke="#2a2420" strokeWidth="5" strokeLinecap="round" />
          <path d="M18,-22 L34,-22" stroke="#2a2420" strokeWidth="5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx="-26" cy="-22" rx={8} ry={9} fill="#fff" />
          <ellipse cx="26" cy="-22" rx={8} ry={9} fill="#fff" />
          <circle cx={-26 + gaze * 4} cy="-21" r="5" fill="#2a2420" />
          <circle cx={26 + gaze * 4} cy="-21" r="5" fill="#2a2420" />
        </>
      )}
      <path d={`M-38,${-42 - worry * 6} L-14,${-38 + worry * 4}`} stroke="#2a2420" strokeWidth="5" strokeLinecap="round" />
      <path d={`M38,${-42 - worry * 6} L14,${-38 + worry * 4}`} stroke="#2a2420" strokeWidth="5" strokeLinecap="round" />
      <path d={`M-18,${14 + worry * 4} Q0,${24 - worry * 16} 18,${14 + worry * 4}`} stroke="#7a2e22" strokeWidth="5" fill="none" strokeLinecap="round" />
    </svg>
  );
};

// A small programmer bust; `lens` (0–1) raises a magnifying glass, `ok` shows a thumbs-up "直接用".
export const Dev: React.FC<{ size: number; lens: number; shirt: string; hair?: string; ok?: number }> = ({ size, lens, shirt, hair = "#2a2420", ok = 0 }) => (
  <svg width={size} height={size * 1.3} viewBox="-60 -80 120 156" style={{ overflow: "visible", display: "block" }}>
    <path d="M-46,76 Q-46,20 0,20 Q46,20 46,76 Z" fill={shirt} />
    <circle cx="0" cy="-22" r="36" fill="#f2c9a5" />
    <path d="M-37,-26 Q-34,-62 0,-62 Q34,-62 37,-26 Q26,-46 2,-47 Q-22,-48 -37,-26 Z" fill={hair} />
    <circle cx="-13" cy="-20" r="4" fill="#2a2420" />
    <circle cx="13" cy="-20" r="4" fill="#2a2420" />
    <path d="M-10,-2 Q0,4 10,-2" stroke="#7a2e22" strokeWidth="4" fill="none" strokeLinecap="round" />
    {lens > 0 ? (
      <g transform={`translate(${24 - 6 * lens} ${40 - 64 * lens}) rotate(${-30 + 10 * lens})`}>
        <rect x="-4" y="14" width="8" height="34" rx="4" fill="#5b4632" />
        <circle r="18" fill="rgba(200,230,255,0.35)" stroke="#d9dde2" strokeWidth="6" />
      </g>
    ) : null}
    {ok > 0 ? (
      <g transform={`translate(34 ${34 - 30 * ok}) scale(${ok})`}>
        <rect x="-10" y="-2" width="22" height="22" rx="6" fill="#f2c9a5" />
        <rect x="-4" y="-22" width="9" height="24" rx="4.5" fill="#f2c9a5" />
      </g>
    ) : null}
  </svg>
);

// ───────── A task card (a tiny code page); state 0 = waiting, 1 = passed (green), −1 = sent back (red) ─────────
export const TaskCard: React.FC<{ w: number; state: number; flip?: number; dim?: number }> = ({ w, state, flip = 1, dim = 0 }) => {
  const h = w * 0.72;
  const bg = state > 0 ? K.green : state < 0 ? K.red : "#2b3038";
  const ln = state === 0 ? "#59616e" : "rgba(255,255,255,0.75)";
  return (
    <div style={{ width: w, height: h, borderRadius: w * 0.12, background: bg, transform: `scaleX(${Math.abs(flip) < 0.04 ? 0.04 : flip})`, opacity: 1 - dim * 0.6, boxShadow: state > 0 ? `0 0 ${w * 0.3}px ${K.green}55` : undefined, position: "relative", overflow: "hidden" }}>
      {[0.22, 0.42, 0.62].map((y, i) => (
        <div key={i} style={{ position: "absolute", left: w * (0.16 + (i === 1 ? 0.1 : 0)), top: h * y, width: w * (i === 2 ? 0.36 : 0.56), height: Math.max(2, h * 0.09), borderRadius: 2, background: ln }} />
      ))}
    </div>
  );
};

// ───────── Desk lamp light cone (behind the person) ─────────
export const LampGlow: React.FC<{ on: number; x: number; y: number }> = ({ on, x, y }) => (
  <div
    style={{
      position: "absolute",
      left: x - 900,
      top: y - 200,
      width: 1800,
      height: 1300,
      background: `radial-gradient(ellipse 40% 45% at 50% 30%, rgba(255,214,150,${0.22 * on}) 0%, rgba(255,190,120,${0.08 * on}) 45%, transparent 70%)`,
      pointerEvents: "none",
    }}
  />
);

// A count that pops a little each time it changes (for counters that follow falling objects).
export const Pop: React.FC<{ t: number; at: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ t, at, children, style }) => {
  const p = pr(t, at, 0.18, EO);
  return <div style={{ transform: `scale(${1 + 0.12 * (1 - p)})`, ...style }}>{children}</div>;
};
