// Chapter 2 opens in the lab (track bars 30–42): Cambridge, 2009 (Clark et al., Neuron). Two slot machines: one
// stops one symbol short (差一点), one misses by far (差很远). Players rated the near miss less pleasant, yet wanted to
// play on more; the brain areas that light up for a win lit up too; only when players pulled the lever themselves.
// The one discovery lands on the quiet interlude: 更难受，却更想要。
import React from "react";
import { Box, clamp01, EO, Note, ramp, Say, star, useT, win } from "../kit";
import { HAN, K } from "../theme";
import { GameBack } from "./ch1";
import { T } from "./time";

const want = (s: string) => ({ t: s, c: K.want });
const like = (s: string) => ({ t: s, c: K.like });

type Sym = "star" | "seven" | "dia" | "cherry";
const STRIP: Sym[] = ["star", "seven", "dia", "cherry", "star", "dia", "seven", "cherry"];

const SymSvg: React.FC<{ s: Sym; x: number; y: number }> = ({ s, x, y }) => {
  if (s === "star") return <path d={star(x, y, 34)} fill="url(#lb-gold)" stroke="#a05a00" strokeWidth={2} />;
  if (s === "dia") return <path d={`M ${x} ${y - 34} L ${x + 26} ${y} L ${x} ${y + 34} L ${x - 26} ${y} Z`} fill="#38c6ff" stroke="#0a5a8a" strokeWidth={2} />;
  if (s === "cherry")
    return (
      <g>
        <path d={`M ${x - 10} ${y + 6} Q ${x} ${y - 30} ${x + 14} ${y - 30} M ${x + 12} ${y + 8} Q ${x + 8} ${y - 20} ${x + 14} ${y - 30}`} stroke="#3a8a2a" strokeWidth={4} fill="none" />
        <circle cx={x - 12} cy={y + 14} r={15} fill="#ff3b5c" />
        <circle cx={x + 14} cy={y + 16} r={15} fill="#e0203f" />
      </g>
    );
  return <path d={`M ${x - 22} ${y - 28} H ${x + 24} L ${x - 4} ${y + 32} H ${x - 18} L ${x + 8} ${y - 16} H ${x - 22} Z`} fill="#ff3b5c" stroke="#7a0010" strokeWidth={2} />;
};

// One machine; `stops` are the times each reel stops, `final` the strip index on the line, `off` how far below the line.
const Machine: React.FC<{ x: number; y: number; t: number; pull: number; stops: number[]; final: number[]; off: number[]; glow: number; dim: number; leverMark?: number }> = ({ x, y, t, pull, stops, final, off, glow, dim, leverMark = 0 }) => {
  const W = 560;
  const H = 430;
  const reelW = 130;
  const step = 104;
  const lever = clamp01((t - pull) / 0.25) * (1 - clamp01((t - pull - 0.35) / 0.3));
  const reels: React.ReactNode[] = [];
  for (let r = 0; r < 3; r++) {
    const rx = x - reelW - 18 + r * (reelW + 18);
    const spinning = t >= pull && t < stops[r];
    const settle = t >= stops[r] ? Math.exp(-(t - stops[r]) * 10) * Math.cos((t - stops[r]) * 30) * 0.22 : 0;
    const pos = spinning ? (t - pull) * 24 : t < pull ? 2 + r : final[r] - off[r] + settle;
    for (let k = -2; k <= 2; k++) {
      const idx = Math.floor(pos) + k;
      const frac = pos - Math.floor(pos);
      const sy = y + (k - frac) * step;
      if (Math.abs(sy - y) > 150) continue;
      reels.push(
        <g key={`${r}-${k}`} opacity={(spinning ? 0.5 : 1) * (1 - Math.abs(sy - y) / 190)}>
          <SymSvg s={STRIP[((idx % 8) + 8) % 8]} x={rx} y={sy} />
        </g>,
      );
    }
  }
  return (
    <g opacity={1 - 0.55 * dim}>
      {glow > 0 ? <rect x={x - W / 2 - 30} y={y - H / 2 - 120} width={W + 60} height={H + 210} rx={50} fill={K.want} opacity={0.14 * glow} /> : null}
      {/* body */}
      <rect x={x - W / 2} y={y - H / 2 - 90} width={W} height={H + 150} rx={40} fill="url(#lb-body)" stroke="url(#lb-gold)" strokeWidth={8} />
      {/* marquee lights */}
      {Array.from({ length: 12 }, (_, i) => (
        <circle key={i} cx={x - W / 2 + 50 + i * 42} cy={y - H / 2 - 52} r={9} fill={(Math.floor(t * 8) + i) % 2 ? "#ffd166" : "#ff4f9a"} opacity={0.9} />
      ))}
      {/* window and reels */}
      <rect x={x - W / 2 + 34} y={y - 160} width={W - 68} height={320} rx={20} fill="#fdf8ee" stroke="#a07a2a" strokeWidth={5} />
      <clipPath id={`lb-clip-${x}`}>
        <rect x={x - W / 2 + 40} y={y - 154} width={W - 80} height={308} rx={16} />
      </clipPath>
      <g clipPath={`url(#lb-clip-${x})`}>{reels}</g>
      {[0, 1].map((r) => (
        <line key={r} x1={x - reelW / 2 - 9 + r * (reelW + 18)} x2={x - reelW / 2 - 9 + r * (reelW + 18)} y1={y - 154} y2={y + 154} stroke="#d8c8a0" strokeWidth={3} />
      ))}
      <line x1={x - W / 2 + 26} x2={x + W / 2 - 26} y1={y} y2={y} stroke="#e0203f" strokeWidth={4} strokeDasharray="12 8" />
      {/* lever */}
      <line x1={x + W / 2 + 20} y1={y - 20} x2={x + W / 2 + 46} y2={y - 150 + 170 * lever} stroke="#c9cfdb" strokeWidth={10} strokeLinecap="round" />
      <circle cx={x + W / 2 + 46} cy={y - 160 + 170 * lever} r={22} fill="#ff3b5c" stroke="#fff" strokeWidth={3} />
      {leverMark > 0 ? <circle cx={x + W / 2 + 46} cy={y - 160} r={40 + 6 * Math.sin(t * 8)} fill="none" stroke={K.want} strokeWidth={4} opacity={leverMark} /> : null}
      {/* coin tray */}
      <rect x={x - 120} y={y + 196} width={240} height={36} rx={12} fill="#120c24" stroke="url(#lb-gold)" strokeWidth={4} />
    </g>
  );
};

const L = 600;
const R = 1320;
const MY = 545;

export const Lab: React.FC = () => {
  const t = useT();
  const o = win(t, T(30) - 0.05, T(42.05), 0.15, 0.4);
  if (o <= 0) return null;
  const pull = T(30.15);
  const stopsL = [T(30.75), T(31.0), T(31.5)];
  const stopsR = [T(30.8), T(31.05), T(31.5)];
  const labels = ramp(t, T(31.6), T(31.9), EO);
  const happy = ramp(t, T(32.6), T(33.0), EO);
  const again = ramp(t, T(34.6), T(35.0), EO);
  const scan = win(t, T(36.5), T(38.45), 0.3, 0.3);
  const leverMark = win(t, T(38.5), T(39.95), 0.25, 0.3);
  const gold = ramp(t, T(40), T(40.4), EO);
  const miss = ramp(t, T(31.6), T(31.9), EO);
  const mxr = L + 130 + 18; // third reel of the left machine
  const bar = (x: number, v: number, c: string, yy: number, label: string, show: number) => (
    <g opacity={show}>
      <rect x={x - 230} y={yy} width={460} height={26} rx={13} fill="#ffffff" opacity={0.08} />
      <rect x={x - 230} y={yy} width={460 * v * show} height={26} rx={13} fill={c} />
      <foreignObject x={x - 400} y={yy - 6} width={160} height={40}>
        <div style={{ fontFamily: HAN, fontWeight: 900, fontSize: 28, color: c, textAlign: "right" }}>{label}</div>
      </foreignObject>
    </g>
  );
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <GameBack />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="lb-gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff0b8" />
            <stop offset="55%" stopColor="#ffc93a" />
            <stop offset="100%" stopColor="#c07a10" />
          </linearGradient>
          <linearGradient id="lb-body" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4a2a8a" />
            <stop offset="100%" stopColor="#1a1036" />
          </linearGradient>
        </defs>
        <Machine x={L} y={MY} t={t} pull={pull} stops={stopsL} final={[0, 0, 0]} off={[0, 0, 1]} glow={ramp(t, T(34.6), T(35), EO) * (1 - gold * 0.5)} dim={gold} leverMark={leverMark} />
        <Machine x={R} y={MY} t={t} pull={pull} stops={stopsR} final={[0, 2, 1]} off={[0, 0, 0]} glow={0} dim={Math.max(gold, 0.35 * again)} />
        {miss > 0 ? (
          <g opacity={miss * (1 - gold)}>
            <circle cx={mxr} cy={MY + 104} r={48} fill="none" stroke={K.want} strokeWidth={5} />
            <path d={`M ${mxr + 70} ${MY + 100} L ${mxr + 70} ${MY + 12}`} stroke={K.wantHi} strokeWidth={4} />
            <path d={`M ${mxr + 58} ${MY + 26} L ${mxr + 70} ${MY + 8} L ${mxr + 82} ${MY + 26}`} fill="none" stroke={K.wantHi} strokeWidth={4} strokeLinejoin="round" />
          </g>
        ) : null}
        <g opacity={1 - gold}>
          {bar(L, 0.26, K.like, 868, "开心", happy)}
          {bar(R, 0.46, K.like, 868, "开心", happy)}
          {bar(L, 0.88, K.want, 920, "想再来", again)}
          {bar(R, 0.5, K.want, 920, "想再来", again)}
        </g>
      </svg>
      {/* labels over the machines */}
      <div style={{ position: "absolute", left: L - 200, top: 178, width: 400, textAlign: "center", fontFamily: HAN, fontWeight: 900, fontSize: 48, color: K.wantHi, opacity: labels * (1 - gold), textShadow: "0 3px 0 rgba(0,0,0,0.5)" }}>差一点</div>
      <div style={{ position: "absolute", left: R - 200, top: 178, width: 400, textAlign: "center", fontFamily: HAN, fontWeight: 900, fontSize: 48, color: "#aeb6c8", opacity: labels * (1 - gold), textShadow: "0 3px 0 rgba(0,0,0,0.5)" }}>差很远</div>
      <div style={{ position: "absolute", left: mxr + 90, top: MY + 20, fontFamily: HAN, fontWeight: 900, fontSize: 30, color: K.wantHi, opacity: miss * (1 - gold) }}>差一格</div>
      {/* the scan: the same regions that light up for a win */}
      {scan > 0 ? (
        <div style={{ position: "absolute", left: 960 - 170, top: 330, width: 340, height: 260, opacity: scan, borderRadius: 24, background: "rgba(8,12,26,0.9)", border: `2px solid ${K.want}`, boxShadow: `0 0 30px rgba(255,79,154,0.4)` }}>
          <svg width={340} height={260}>
            <path d="M 70 150 C 50 110, 60 70, 100 50 C 140 26, 210 24, 250 50 C 290 74, 300 120, 284 150 C 274 172, 250 180, 226 178 C 214 196, 186 204, 160 198 C 130 204, 100 196, 86 182 C 78 174, 72 164, 70 150 Z" fill="#2a1f45" stroke="#a9c3e8" strokeWidth={3} />
            <circle cx={150} cy={140} r={34} fill={K.want} opacity={0.35 + 0.25 * Math.sin(t * 9)} />
            <circle cx={150} cy={140} r={14} fill="#ffd0e6" />
            <circle cx={198} cy={128} r={22} fill={K.want} opacity={0.3 + 0.2 * Math.sin(t * 9 + 1)} />
          </svg>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 14, textAlign: "center", fontFamily: HAN, fontWeight: 800, fontSize: 22, color: "#fff" }}>大脑扫描（示意）</div>
        </div>
      ) : null}
      {gold > 0 ? <div style={{ position: "absolute", inset: 0, background: "#04060c", opacity: 0.55 * gold }} /> : null}
      <LabText />
      <Note at={T(31.7)} out={T(41.9)}>Clark 等，Neuron 2009（剑桥大学）：玩家给"差一点"的评分比"差很远"更不愉快，"想继续玩"的评分更高；只在自己动手时出现 · 条形为示意</Note>
    </div>
  );
};

const LabText: React.FC = () => (
  <>
    <Box x={960} y={60} align="center">
      <Say at={T(32.6)} out={T(36.4)} size={56} weight={900} parts={["差一点就中，比差很远", like("更难受"), "，"]} />
    </Box>
    <Box x={960} y={136} align="center">
      <Say at={T(34.6)} out={T(36.4)} size={56} weight={900} parts={["却", want("更想再来一把"), "。"]} />
    </Box>
    <Box x={960} y={60} align="center">
      <Say at={T(36.6)} out={T(38.4)} size={54} weight={900} parts={["大脑里，平时为", { t: "“赢”", c: K.gold }, "亮起的地方，也亮了。"]} />
    </Box>
    <Box x={960} y={60} align="center">
      <Say at={T(38.6)} out={T(39.95)} size={54} weight={900} parts={["而且，只有", want("自己动手拉杆"), "时才这样。"]} />
    </Box>
    <Box x={960} y={430} align="center">
      <Say at={T(40.05)} out={T(41.9)} size={112} weight={900} parts={["更难受，", { t: "却更想要。", mark: true }]} />
    </Box>
  </>
);

