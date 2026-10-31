// The night city every scene stands in, a tower with windows, and the listing card that opens and closes the film.
import React from "react";
import { AbsoluteFill } from "remotion";
import { clamp01, lerp } from "./kit";
import { FONT, K, NUM } from "./theme";

// Deterministic hash → [0, 1).
export const rnd = (i: number, j = 0) => {
  const s = Math.sin(i * 127.1 + j * 311.7 + 74.7) * 43758.5453;
  return s - Math.floor(s);
};

// Sky, a few stars, a far hazy skyline on the horizon and a wet ground that mirrors the light.
export const Sky: React.FC<{ t: number; dim?: number; horizon?: number }> = ({ t, dim = 0, horizon = 930 }) => {
  const far: React.ReactNode[] = [];
  let x = -20;
  for (let i = 0; x < 1960; i++) {
    const w = 18 + rnd(i, 1) * 46;
    const h = 30 + rnd(i, 2) * 120 + (rnd(i, 3) > 0.9 ? 90 : 0);
    far.push(<rect key={i} x={x} y={horizon - h} width={w} height={h} fill="#0b1224" />);
    for (let r = 0; r < h / 11 - 1; r++)
      for (let c = 0; c < w / 9 - 1; c++)
        if (rnd(i * 31 + r, c) > 0.86) far.push(<rect key={`${i}-${r}-${c}`} x={x + 4 + c * 9} y={horizon - h + 6 + r * 11} width={3} height={4} fill={K.win} opacity={0.18 + 0.2 * rnd(r, c + i)} />);
    x += w + 2 + rnd(i, 4) * 10;
  }
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={K.sky0} />
            <stop offset="0.62" stopColor={K.sky1} />
            <stop offset="0.86" stopColor={K.sky2} />
            <stop offset="1" stopColor="#2a2a40" />
          </linearGradient>
          <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#10162a" />
            <stop offset="1" stopColor="#04060b" />
          </linearGradient>
          <radialGradient id="cityglow" cx="0.5" cy="1" r="0.7">
            <stop offset="0" stopColor="#ff9d4d" stopOpacity={0.16} />
            <stop offset="1" stopColor="#ff9d4d" stopOpacity={0} />
          </radialGradient>
        </defs>
        <rect width={1920} height={1080} fill="url(#sky)" />
        {Array.from({ length: 70 }, (_, i) => (
          <circle key={i} cx={rnd(i, 7) * 1920} cy={rnd(i, 8) * 520} r={0.6 + rnd(i, 9) * 1.1} fill="#dfe6ff" opacity={(0.25 + 0.5 * rnd(i, 10)) * (0.75 + 0.25 * Math.sin(t * 1.3 + i))} />
        ))}
        <rect x={0} y={horizon - 420} width={1920} height={420} fill="url(#cityglow)" />
        <g opacity={0.9}>{far}</g>
        <rect x={0} y={horizon} width={1920} height={1080 - horizon} fill="url(#ground)" />
      </svg>
      {dim > 0 ? <AbsoluteFill style={{ background: "#03050a", opacity: dim }} /> : null}
    </AbsoluteFill>
  );
};

// A tower standing on (x, base): width w, height h. `lit` (0–1) is how many windows glow; `glass` is the top part drawn
// as an empty, glowing shell (期待). `seed` keeps each tower's window pattern its own.
export const Tower: React.FC<{
  x: number;
  base: number;
  w: number;
  h: number;
  seed: number;
  lit?: number;
  roof?: number; // 0–1 gold roof glow
  glass?: number; // fraction of the height (from the top) that is hollow 期待
  o?: number;
  tone?: string;
}> = ({ x, base, w, h, seed, lit = 0.75, roof = 0, glass = 0, o = 1, tone = K.tower }) => {
  if (h <= 0.5 || o <= 0) return null;
  const top = base - h;
  const solidTop = top + h * glass;
  const cols = Math.max(1, Math.floor((w - 6) / 9));
  const cw = (w - 6) / cols;
  const rows = Math.max(0, Math.floor((base - solidTop - 6) / 12));
  const wins: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const v = rnd(seed * 97 + r, c);
      if (v > lit) continue;
      wins.push(<rect key={`${r}-${c}`} x={x - w / 2 + 3 + c * cw + cw * 0.2} y={base - 10 - r * 12} width={cw * 0.6} height={6} fill={v < lit * 0.25 ? K.winHi : K.win} opacity={0.55 + 0.45 * rnd(seed + r, c * 3)} />);
    }
  return (
    <g opacity={o}>
      {glass > 0 ? (
        <g>
          <rect x={x - w / 2} y={top} width={w} height={h * glass} fill={K.hope} opacity={0.12} />
          <rect x={x - w / 2} y={top} width={w} height={h * glass} fill="none" stroke={K.hopeHi} strokeWidth={Math.max(1.5, w / 60)} strokeDasharray={w > 60 ? "10 7" : undefined} opacity={0.85} />
        </g>
      ) : null}
      <rect x={x - w / 2} y={solidTop} width={w} height={base - solidTop} fill={tone} />
      <rect x={x - w / 2} y={solidTop} width={Math.max(2, w * 0.18)} height={base - solidTop} fill="#ffffff" opacity={0.035} />
      {wins}
      {roof > 0 ? (
        <g opacity={roof}>
          <rect x={x - w / 2 - 2} y={top - 3} width={w + 4} height={5} fill={K.gold} />
          <ellipse cx={x} cy={top} rx={w * 0.9 + 10} ry={14 + w * 0.1} fill={K.gold} opacity={0.18} />
        </g>
      ) : null}
    </g>
  );
};

// A simple floor plan, drawn in thin ink lines, for the listing card thumbnail and the subsidy comparison.
export const Plan: React.FC<{ w: number; h: number; color?: string; sw?: number }> = ({ w, h, color = K.ink, sw = 2 }) => (
  <svg width={w} height={h} viewBox="0 0 100 70" preserveAspectRatio="none" style={{ display: "block" }}>
    <g fill="none" stroke={color} strokeWidth={sw} vectorEffect="non-scaling-stroke">
      <rect x={2} y={2} width={96} height={66} />
      <path d="M 40 2 V 40 M 2 40 H 40 M 70 2 V 30 M 70 30 H 98 M 40 52 H 70 V 68 M 55 30 H 70" vectorEffect="non-scaling-stroke" />
    </g>
  </svg>
);

// The listing card. price in 万; tags are "降价" stickers that have popped so far (each with its own appear time).
export const ListingCard: React.FC<{
  x: number;
  y: number;
  s?: number;
  price: number;
  unit?: string;
  tags?: { at: number; text: string }[];
  t: number;
  note?: string;
  o?: number;
  flip?: number; // 0 = sale side, 1 = rental side
  rent?: string;
  buttons?: number; // the 租 / 买 buttons at the end
  hover?: number;
}> = ({ x, y, s = 1, price, unit, tags = [], t, note, o = 1, flip = 0, rent = "?", buttons = 0, hover = 0 }) => {
  const side = flip < 0.5 ? 0 : 1;
  const sx = Math.abs(Math.cos(flip * Math.PI));
  const W = 620;
  const H = 360;
  return (
    <div style={{ position: "absolute", left: x - (W * s) / 2, top: y - (H * s) / 2, width: W, height: H, transform: `scale(${s}) scaleX(${sx})`, transformOrigin: "0 0", opacity: o }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 26, background: K.card, boxShadow: "0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.4) inset", overflow: "hidden", fontFamily: FONT, color: K.ink }}>
        {side === 0 ? (
          <>
            <div style={{ position: "absolute", left: 28, top: 28, width: 230, height: 170, borderRadius: 14, background: "#e7e1d3", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Plan w={190} h={133} color="#3b4150" />
            </div>
            <div style={{ position: "absolute", left: 286, top: 30, fontSize: 32, fontWeight: 800 }}>3室2厅 · 100㎡</div>
            <div style={{ position: "absolute", left: 286, top: 80, fontSize: 22, fontWeight: 500, color: "#6b6f7a" }}>南北通透 · 近地铁 · 满五年</div>
            <div style={{ position: "absolute", left: 286, top: 122, display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontFamily: NUM, fontSize: 76, fontWeight: 900, color: K.tag, letterSpacing: -2 }}>{Math.round(price)}</span>
              <span style={{ fontSize: 32, fontWeight: 800, color: K.tag }}>万</span>
            </div>
            <div style={{ position: "absolute", left: 286, top: 214, fontSize: 22, fontWeight: 500, color: "#6b6f7a" }}>{unit ?? `${(price / 100).toFixed(2)} 万/㎡`}</div>
            {note ? <div style={{ position: "absolute", left: 28, bottom: 26, fontSize: 24, fontWeight: 700, color: "#3b4150" }}>{note}</div> : null}
          </>
        ) : (
          <>
            <div style={{ position: "absolute", left: 28, top: 28, padding: "4px 14px", borderRadius: 8, background: K.ink, color: K.card, fontSize: 22, fontWeight: 800 }}>整租</div>
            <div style={{ position: "absolute", left: 28, top: 80, fontSize: 32, fontWeight: 800 }}>同一套 · 3室2厅 · 100㎡</div>
            <div style={{ position: "absolute", left: 28, top: 140, display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontSize: 30, fontWeight: 700, color: "#6b6f7a" }}>一年房租</span>
              <span style={{ fontFamily: NUM, fontSize: 76, fontWeight: 900, color: "#c77a1a" }}>{rent}</span>
            </div>
            <div style={{ position: "absolute", left: 28, bottom: 30, fontSize: 24, fontWeight: 600, color: "#6b6f7a" }}>押一付三 · 拎包入住</div>
          </>
        )}
        {buttons > 0 ? (
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 92, display: "flex", gap: 18, padding: "0 28px 22px", alignItems: "center", opacity: buttons, background: K.card }}>
            {["租", "买"].map((b, i) => (
              <div key={b} style={{ flex: 1, height: 66, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 900, letterSpacing: 8, color: i ? K.card : K.ink, background: i ? K.ink : "#e7e1d3", boxShadow: `0 0 0 ${3 * hover}px ${K.gold}55` }}>
                {b}
              </div>
            ))}
          </div>
        ) : null}
      </div>
      {side === 0
        ? tags.map((g, i) => {
            const k = clamp01((t - g.at) / 0.18);
            if (k <= 0) return null;
            const fade = i < tags.length - 2 ? clamp01(1 - (t - tags[i + 2].at) / 0.3) : 1;
            if (fade <= 0) return null;
            const sc = lerp(1.6, 1, k);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: 440 + (i % 2) * 14,
                  top: 236 + (i % 2) * 50,
                  transform: `scale(${sc}) rotate(${(rnd(i, 3) - 0.5) * 10}deg)`,
                  opacity: k * fade,
                  padding: "6px 14px",
                  borderRadius: 10,
                  background: K.tag,
                  color: "#fff",
                  fontFamily: FONT,
                  fontWeight: 900,
                  fontSize: 24,
                  whiteSpace: "nowrap",
                  boxShadow: "0 6px 18px rgba(255,80,40,0.35)",
                }}
              >
                {g.text}
              </div>
            );
          })
        : null}
    </div>
  );
};
