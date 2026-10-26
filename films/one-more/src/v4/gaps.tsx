// "差一点", drawn so the eye sees the gap before reading anything: five stars with the fifth empty, ✓ ✓ □, six days
// ticked and tomorrow's gift locked, a picture with one tile missing, four friends and an empty seat, an hourglass nearly
// run out. Each pops up big on the beat, then they gather into a grid, then into a wall of gaps.
import React from "react";
import { clamp01, EIO, EO, lerp, star } from "../kit";
import { HAN, K } from "../theme";
import { BEAT, beat } from "./time";

export type Kind = "stars" | "checks" | "signin" | "puzzle" | "seats" | "glass";
type Gap = { kind: Kind; title: string; caption: string; c0: string; c1: string };
export const GAPS: Gap[] = [
  { kind: "stars", title: "晋级赛", caption: "再赢 1 局，就晋级", c0: "#ffe08a", c1: "#f0a020" },
  { kind: "checks", title: "每日任务", caption: "还差 1 局", c0: "#8ff0ff", c1: "#2a9fd8" },
  { kind: "signin", title: "七日签到", caption: "明天，领大奖", c0: "#b5f5a0", c1: "#3fbf5a" },
  { kind: "puzzle", title: "皮肤碎片", caption: "99/100，差 1 片", c0: "#ffb0dc", c1: "#e0409a" },
  { kind: "seats", title: "好友开黑", caption: "差一个，来不来？", c0: "#a8d4ff", c1: "#3f7fff" },
  { kind: "glass", title: "本赛季", caption: "还剩 9 天，过了就没了", c0: "#ffd59a", c1: "#ff9a2a" },
];
export const GAP_AT = (i: number) => beat(16 + 2 * i);
export const GRID_AT = beat(28);
export const GAPWALL_AT = beat(32);

// The picture inside a panel, in a 520 × 230 box. `p` pulses the missing piece (0..1).
export const Picto: React.FC<{ kind: Kind; p: number; show: number; seed?: number }> = ({ kind, p, show, seed = 0 }) => {
  const miss = K.want;
  const glow = (cx: number, cy: number, r: number) => <circle cx={cx} cy={cy} r={r} fill={miss} opacity={0.18 + 0.22 * p} />;
  if (kind === "stars")
    return (
      <g>
        {Array.from({ length: 5 }, (_, i) => {
          const x = 70 + i * 95;
          const on = i < 4;
          const k = clamp01(show * 5 - i);
          return (
            <g key={i} opacity={k} transform={`translate(${x} 115) scale(${0.6 + 0.4 * EO(k)}) translate(${-x} -115)`}>
              {on ? <circle cx={x} cy={115} r={46} fill="#ffd166" opacity={0.15} /> : glow(x, 115, 50)}
              <path d={star(x, 115, 42)} fill={on ? "url(#gp-gold)" : "none"} stroke={on ? "#fff4c8" : miss} strokeWidth={on ? 2 : 5} strokeDasharray={on ? undefined : "8 6"} />
            </g>
          );
        })}
      </g>
    );
  if (kind === "checks")
    return (
      <g>
        {[0, 1, 2].map((i) => {
          const x = 120 + i * 140;
          const on = i < 2;
          const k = clamp01(show * 3 - i);
          return (
            <g key={i} opacity={k}>
              {!on ? glow(x, 115, 66) : null}
              <rect x={x - 52} y={63} width={104} height={104} rx={20} fill={on ? "url(#gp-cyan)" : "#0b1226"} stroke={on ? "#d8fbff" : miss} strokeWidth={on ? 3 : 6} strokeDasharray={on ? undefined : "12 8"} />
              {on ? <path d={`M ${x - 26} ${115} l 18 18 l 34 -38`} stroke="#fff" strokeWidth={12} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
            </g>
          );
        })}
      </g>
    );
  if (kind === "signin")
    return (
      <g>
        {Array.from({ length: 6 }, (_, i) => {
          const x = 46 + i * 62;
          const k = clamp01(show * 7 - i);
          return (
            <g key={i} opacity={k}>
              <rect x={x - 26} y={85} width={52} height={62} rx={10} fill="#1d2a4a" stroke="#4a5a80" strokeWidth={2} />
              <path d={`M ${x - 12} ${117} l 8 8 l 16 -18`} stroke="#5df08a" strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          );
        })}
        <g opacity={clamp01(show * 7 - 6)}>
          {glow(440, 112, 80)}
          <rect x={385} y={58} width={110} height={110} rx={16} fill="url(#gp-gold)" stroke="#fff4c8" strokeWidth={3} />
          <rect x={432} y={58} width={16} height={110} fill="#c41d3a" />
          <rect x={385} y={98} width={110} height={16} fill="#c41d3a" />
          <path d="M 440 58 C 410 30, 400 52, 440 58 C 480 30, 470 52, 440 58 Z" fill="#ff5d70" />
          <circle cx={440} cy={140} r={15} fill="#0b1226" stroke={miss} strokeWidth={4} />
          <rect x={433} y={134} width={14} height={12} rx={3} fill={miss} />
        </g>
      </g>
    );
  if (kind === "puzzle") {
    const cells: React.ReactNode[] = [];
    const n = 10;
    const size = 20;
    const x0 = 260 - (n * size) / 2;
    const y0 = 115 - (n * size) / 2;
    const hole = [7, 3];
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) {
        const k = clamp01(show * 1.6 - ((r + c) / 18) * 0.6);
        if (r === hole[1] && c === hole[0]) continue;
        const d = Math.hypot(c - 4.5, r - 4.5) / 6.4;
        const hue = 320 - d * 70 + ((c * 7 + r * 3 + seed) % 5) * 4;
        cells.push(<rect key={`${r}-${c}`} x={x0 + c * size + 1} y={y0 + r * size + 1} width={size - 2} height={size - 2} rx={3} fill={`hsl(${hue}, 80%, ${66 - d * 22}%)`} opacity={k} />);
      }
    return (
      <g>
        {cells}
        <g opacity={clamp01(show * 1.6 - 0.8)}>
          {glow(x0 + hole[0] * size + size / 2, y0 + hole[1] * size + size / 2, 26)}
          <rect x={x0 + hole[0] * size + 1} y={y0 + hole[1] * size + 1} width={size - 2} height={size - 2} rx={3} fill="#0b1226" stroke={miss} strokeWidth={3} />
        </g>
      </g>
    );
  }
  if (kind === "seats")
    return (
      <g>
        {Array.from({ length: 5 }, (_, i) => {
          const x = 70 + i * 95;
          const empty = i === 4;
          const k = clamp01(show * 5 - i);
          return (
            <g key={i} opacity={k}>
              {empty ? glow(x, 112, 52) : <circle cx={x} cy={112} r={50} fill="#3f7fff" opacity={0.14} />}
              <circle cx={x} cy={112} r={40} fill={empty ? "#0b1226" : "url(#gp-blue)"} stroke={empty ? miss : "#d8ecff"} strokeWidth={empty ? 5 : 3} strokeDasharray={empty ? "9 7" : undefined} />
              {empty ? (
                <path d={`M ${x} 94 v 36 M ${x - 18} 112 h 36`} stroke={miss} strokeWidth={6} strokeLinecap="round" />
              ) : (
                <g fill="#fff">
                  <circle cx={x} cy={100} r={12} />
                  <path d={`M ${x - 22} 138 C ${x - 22} 116, ${x + 22} 116, ${x + 22} 138 Z`} />
                </g>
              )}
            </g>
          );
        })}
      </g>
    );
  // glass: nearly run out
  const k = clamp01(show * 1.5);
  return (
    <g opacity={k}>
      {glow(260, 115, 90)}
      <path d="M 200 30 h 120 M 200 200 h 120" stroke="#e8c36a" strokeWidth={10} strokeLinecap="round" />
      <path d="M 210 36 C 210 90, 250 100, 250 115 C 250 130, 210 140, 210 194 L 310 194 C 310 140, 270 130, 270 115 C 270 100, 310 90, 310 36 Z" fill="rgba(200,230,255,0.08)" stroke="#d8ecff" strokeWidth={4} />
      <path d="M 243 104 C 252 110, 268 110, 277 104 L 270 112 L 250 112 Z" fill="#ffb03a" />
      <path d="M 216 194 C 230 160, 290 160, 304 194 Z" fill="#ffb03a" />
      <line x1={260} y1={112} x2={260} y2={170} stroke="#ffb03a" strokeWidth={3} strokeDasharray="4 6" strokeDashoffset={-show * 60} />
    </g>
  );
};

const Defs: React.FC = () => (
  <defs>
    <linearGradient id="gp-gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#fff0b8" />
      <stop offset="55%" stopColor="#ffc93a" />
      <stop offset="100%" stopColor="#e08a10" />
    </linearGradient>
    <linearGradient id="gp-cyan" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#8ff0ff" />
      <stop offset="100%" stopColor="#1f86c8" />
    </linearGradient>
    <linearGradient id="gp-blue" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#8fc4ff" />
      <stop offset="100%" stopColor="#2a5fd8" />
    </linearGradient>
  </defs>
);

const PW = 620;
const PH = 380;
// grid slots (centres) for the six, three across, two down
const slot = (i: number): [number, number] => [380 + (i % 3) * 580, 330 + Math.floor(i / 3) * 330];

const Panel: React.FC<{ g: Gap; i: number; t: number }> = ({ g, i, t }) => {
  const at = GAP_AT(i);
  const d = t - at;
  if (d < 0) return null;
  const pop = EO(clamp01(d / 0.28));
  // big in the middle for its two beats, then to its slot in the grid
  const toGrid = EIO(clamp01((t - (i < GAPS.length - 1 ? GAP_AT(i + 1) : GRID_AT) + 0.02) / 0.35));
  const [sx, sy] = slot(i);
  const cx = lerp(960, sx, toGrid);
  const cy = lerp(500, sy, toGrid);
  const s = lerp(1.1, 0.82, toGrid) * (0.5 + 0.5 * pop) * (1 + 0.08 * Math.sin(Math.PI * clamp01(d / 0.35)));
  const p = 0.5 + 0.5 * Math.sin(t * 8 + i);
  const flash = Math.exp(-d / 0.12);
  return (
    <div style={{ position: "absolute", left: cx - PW / 2, top: cy - PH / 2, width: PW, height: PH, transform: `scale(${s})`, opacity: Math.min(1, d / 0.12) }}>
      <div style={{ position: "absolute", inset: -4, borderRadius: 30, background: "linear-gradient(135deg, #fff2c4 0%, #d9a440 35%, #7a5418 60%, #f5d68a 100%)", boxShadow: `0 16px 40px rgba(0,0,0,0.55), 0 0 ${40 * flash + 14}px ${g.c1}aa` }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: 26, background: "linear-gradient(180deg, #223163 0%, #121a3a 100%)", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 70, background: `linear-gradient(90deg, ${g.c1}55, ${g.c0}22)` }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 12, textAlign: "center", fontFamily: HAN, fontWeight: 900, fontSize: 40, color: "#fff", letterSpacing: 4, textShadow: "0 3px 0 rgba(0,0,0,0.45)" }}>{g.title}</div>
        <svg width={520} height={230} style={{ position: "absolute", left: 50, top: 76 }}>
          <Defs />
          <Picto kind={g.kind} p={p} show={clamp01(d / 0.6)} seed={i} />
        </svg>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 20, textAlign: "center" }}>
          <span style={{ fontFamily: HAN, fontWeight: 900, fontSize: 34, color: "#fff", background: "rgba(255,79,154,0.32)", border: `2px solid ${K.want}`, borderRadius: 999, padding: "2px 22px", boxShadow: `0 0 ${16 + 12 * p}px rgba(255,79,154,0.45)` }}>{g.caption}</span>
        </div>
      </div>
      {flash > 0.02 ? <div style={{ position: "absolute", inset: -4, borderRadius: 30, background: "#fff", opacity: 0.45 * flash }} /> : null}
    </div>
  );
};

export const Gaps: React.FC<{ t: number }> = ({ t }) => {
  if (t < GAP_AT(0) - 0.1) return null;
  const out = 1 - clamp01((t - GAPWALL_AT) / 0.35);
  if (out <= 0) return null;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: out, transform: `scale(${1 - 0.12 * (1 - out)})` }}>
      {GAPS.map((g, i) => (
        <Panel key={i} g={g} i={i} t={t} />
      ))}
    </div>
  );
};

// The wall: dozens of small gaps, every one waiting for its last piece.
const KINDS: Kind[] = ["stars", "checks", "signin", "puzzle", "seats", "glass"];
export const GapWall: React.FC<{ t: number }> = ({ t }) => {
  const d = t - GAPWALL_AT;
  if (d < -0.1) return null;
  const cols = 7;
  const rows = 6;
  const zoom = 1.25 - 0.35 * EO(clamp01(d / (BEAT * 6)));
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const dist = Math.hypot(c - (cols - 1) / 2, (r - (rows - 1) / 2) * 1.2);
      const k = clamp01((d - dist * 0.08) / 0.25);
      if (k <= 0) continue;
      const kind = KINDS[(i * 5 + r) % KINDS.length];
      const x = 80 + c * 255;
      const y = 60 + r * 165;
      cells.push(
        <g key={i} opacity={k} transform={`translate(${x} ${y}) scale(${0.42 * (0.7 + 0.3 * EO(k))})`}>
          <rect x={-10} y={-10} width={540} height={250} rx={28} fill="#16204a" stroke="#d9a440" strokeOpacity={0.7} strokeWidth={4} />
          <Picto kind={kind} p={0.5 + 0.5 * Math.sin(t * 8 + i)} show={1} seed={i} />
        </g>,
      );
    }
  return (
    <div style={{ position: "absolute", inset: 0, opacity: clamp01((d + 0.1) / 0.3) }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, transform: `scale(${zoom})`, transformOrigin: "960px 540px" }}>
        <Defs />
        {cells}
      </svg>
    </div>
  );
};

