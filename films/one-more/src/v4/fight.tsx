// The opening teamfight, in the phone's screen pixels (1110 × 520): the enemy crystal falls to 1% on the beat, then the
// team is wiped and 失败 lands. Bright game colours on public/field.jpg (tools/battlefield.py). Self-drawn; it stands
// for any mobile 5v5 game and copies none.
import React from "react";
import { Img, staticFile } from "remotion";
import { clamp01, EO, star } from "../kit";
import { HAN, K, NUM, SERIF } from "../theme";
import { beat } from "./time";

const BLUE = "#3fb6ff";
const RED = "#ff4d63";
const CX = 640; // the crystal
const CY = 250;

export const HITS = [beat(0), beat(1), beat(2), beat(3), beat(3.5)];
const HP = [22, 15, 9, 5, 3, 1];
export const WIPE = beat(4);
export const LOSE = beat(5);

const rnd = (seed: number, i: number) => {
  const x = Math.sin(seed * 127.1 + i * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export const hpAt = (t: number) => {
  let i = 0;
  for (let k = 0; k < HITS.length; k++) if (t >= HITS[k]) i = k + 1;
  const prev = HP[Math.max(0, i - 1)];
  const k = i === 0 ? 1 : EO(clamp01((t - HITS[i - 1]) / 0.18));
  return i === 0 ? HP[0] : prev + (HP[i] - prev) * k;
};

const OURS: [number, number][] = [
  [470, 360],
  [540, 420],
  [410, 290],
  [610, 450],
  [470, 215],
];
const THEIRS: [number, number][] = [
  [860, 210],
  [900, 320],
  [850, 420],
];

const Token: React.FC<{ x: number; y: number; c: string; hp: number; dead: number; flash?: number }> = ({ x, y, c, hp, dead, flash = 0 }) => (
  <g>
    <ellipse cx={x} cy={y + 24} rx={26} ry={9} fill="#000" opacity={0.35} />
    <circle cx={x} cy={y} r={30} fill={c} opacity={0.22 * (1 - dead)} />
    <circle cx={x} cy={y} r={22} fill={dead > 0.5 ? "#555b66" : c} stroke="#fff" strokeWidth={3} />
    <circle cx={x - 6} cy={y - 7} r={7} fill="#fff" opacity={0.35} />
    {flash > 0 ? <circle cx={x} cy={y} r={24} fill="#fff" opacity={flash} /> : null}
    {dead < 0.5 ? (
      <>
        <rect x={x - 26} y={y - 42} width={52} height={8} rx={4} fill="#0a0d14" opacity={0.85} />
        <rect x={x - 26} y={y - 42} width={52 * clamp01(hp)} height={8} rx={4} fill={c === RED ? RED : "#5df08a"} />
      </>
    ) : (
      <path d={`M ${x - 10} ${y - 10} L ${x + 10} ${y + 10} M ${x + 10} ${y - 10} L ${x - 10} ${y + 10}`} stroke="#fff" strokeWidth={4} strokeLinecap="round" />
    )}
  </g>
);

export const FightScreen: React.FC<{ t: number }> = ({ t }) => {
  const ts = Math.min(t, LOSE); // the scene freezes when the match is lost
  const hp = hpAt(ts);
  const lastHit = HITS.filter((h) => h <= ts).pop();
  const since = lastHit === undefined ? 9 : ts - lastHit;
  const shakeK = Math.exp(-since / 0.09) + (ts >= WIPE ? 2.2 * Math.exp(-(ts - WIPE) / 0.12) : 0);
  const sx = (rnd(Math.floor(ts * 30), 1) - 0.5) * 16 * shakeK;
  const sy = (rnd(Math.floor(ts * 30), 2) - 0.5) * 16 * shakeK;
  const zoom = 1 + 0.06 * clamp01(ts / LOSE);
  const wiped = ts >= WIPE;
  const wipeK = wiped ? clamp01((ts - WIPE) / 0.35) : 0;
  const grey = clamp01((t - LOSE) / 0.25);
  const els: React.ReactNode[] = [];
  // crystal: aura, pedestal, faceted gem, cracks growing as it weakens, a white flash on each hit
  const hitFlash = Math.exp(-since / 0.07);
  const crack = 1 - hp / 22;
  els.push(
    <g key="crystal">
      <defs>
        <radialGradient id="f-aura">
          <stop offset="0%" stopColor="#ff6aa0" stopOpacity={0.75} />
          <stop offset="45%" stopColor={RED} stopOpacity={0.25} />
          <stop offset="100%" stopColor={RED} stopOpacity={0} />
        </radialGradient>
        <linearGradient id="f-gemL" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffd0e0" />
          <stop offset="100%" stopColor="#ff4d7a" />
        </linearGradient>
        <linearGradient id="f-gemR" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff5a85" />
          <stop offset="100%" stopColor="#8a1035" />
        </linearGradient>
      </defs>
      <ellipse cx={CX} cy={CY + 30} rx={150} ry={120} fill="url(#f-aura)" opacity={0.6 + 0.4 * hitFlash} />
      <ellipse cx={CX} cy={CY + 74} rx={66} ry={22} fill="#000" opacity={0.3} />
      <path d={`M ${CX - 56} ${CY + 60} L ${CX - 40} ${CY + 40} L ${CX + 40} ${CY + 40} L ${CX + 56} ${CY + 60} L ${CX + 40} ${CY + 80} L ${CX - 40} ${CY + 80} Z`} fill="#5c5266" stroke="#d9c38a" strokeWidth={3} />
      <g transform={`translate(0 ${Math.sin(ts * 3) * 4})`}>
        <path d={`M ${CX} ${CY - 110} L ${CX + 42} ${CY - 20} L ${CX} ${CY + 40} L ${CX - 42} ${CY - 20} Z`} fill="url(#f-gemR)" />
        <path d={`M ${CX} ${CY - 110} L ${CX - 42} ${CY - 20} L ${CX} ${CY + 40} Z`} fill="url(#f-gemL)" />
        <path d={`M ${CX} ${CY - 110} L ${CX + 14} ${CY - 20} L ${CX} ${CY + 40} L ${CX - 14} ${CY - 20} Z`} fill="#fff" opacity={0.18} />
        {crack > 0.2 ? <path d={`M ${CX - 8} ${CY - 70} L ${CX + 6} ${CY - 40} L ${CX - 4} ${CY - 10}`} stroke="#3a0716" strokeWidth={3} fill="none" opacity={clamp01(crack * 1.5)} /> : null}
        {crack > 0.5 ? <path d={`M ${CX + 18} ${CY - 40} L ${CX + 4} ${CY - 18} L ${CX + 20} ${CY + 6}`} stroke="#3a0716" strokeWidth={3} fill="none" /> : null}
        {crack > 0.8 ? <path d={`M ${CX - 24} ${CY - 18} L ${CX - 8} ${CY + 4} L ${CX - 18} ${CY + 22}`} stroke="#3a0716" strokeWidth={3} fill="none" /> : null}
        <path d={`M ${CX} ${CY - 110} L ${CX + 42} ${CY - 20} L ${CX} ${CY + 40} L ${CX - 42} ${CY - 20} Z`} fill="#fff" opacity={0.75 * hitFlash} />
      </g>
      {[0, 1, 2].map((k) => {
        const a = ts * (1.2 + k * 0.4) + k * 2;
        return <ellipse key={k} cx={CX} cy={CY - 20} rx={78 + k * 14} ry={22 + k * 4} fill="none" stroke="#ffd166" strokeWidth={2} strokeDasharray="8 14" strokeDashoffset={a * 30} opacity={0.5} />;
      })}
    </g>,
  );
  // hit effects
  HITS.forEach((h, i) => {
    const age = ts - h;
    if (age < 0 || age > 0.7) return;
    const k = EO(clamp01(age / 0.7));
    const [hx, hy] = OURS[i % OURS.length];
    const c = ["#8ff0ff", K.gold, "#c38bff", "#8ff0ff", K.gold][i];
    els.push(
      <g key={`hit${i}`} opacity={1 - k}>
        <line x1={hx} y1={hy} x2={CX} y2={CY - 30} stroke={c} strokeWidth={22 * (1 - k) + 2} strokeLinecap="round" opacity={0.35} />
        <line x1={hx} y1={hy} x2={CX} y2={CY - 30} stroke="#fff" strokeWidth={8 * (1 - k) + 1} strokeLinecap="round" />
        <circle cx={CX} cy={CY - 30} r={30 + 150 * k} fill="none" stroke={c} strokeWidth={10 * (1 - k) + 2} />
        <circle cx={CX} cy={CY - 30} r={60 * (1 - k)} fill={c} opacity={0.5} />
        {Array.from({ length: 14 }, (_, j) => {
          const a = (j / 14) * Math.PI * 2 + i;
          const r0 = 40 + 90 * k;
          const r1 = 70 + 170 * k;
          return <line key={j} x1={CX + Math.cos(a) * r0} y1={CY - 30 + Math.sin(a) * r0} x2={CX + Math.cos(a) * r1} y2={CY - 30 + Math.sin(a) * r1} stroke={c} strokeWidth={5 * (1 - k) + 1} strokeLinecap="round" />;
        })}
        <path d={`M ${CX - 110} ${CY + 10 - 60 * k} Q ${CX} ${CY - 120 - 40 * k} ${CX + 110} ${CY - 10 - 60 * k}`} stroke="#fff" strokeWidth={10 * (1 - k)} fill="none" strokeLinecap="round" />
      </g>,
    );
  });
  // our five heroes, lunging on each hit; wiped by a red shockwave
  OURS.forEach(([x, y], i) => {
    const lunge = Math.exp(-since / 0.12) * (lastHit !== undefined && HITS.indexOf(lastHit) % 5 === i ? 18 : 6);
    const dx = (CX - x) / Math.hypot(CX - x, CY - y);
    const dy = (CY - y) / Math.hypot(CX - x, CY - y);
    const dead = wiped ? clamp01((ts - WIPE - i * 0.04) / 0.12) : 0;
    els.push(<Token key={`o${i}`} x={x + dx * lunge + Math.sin(ts * 4 + i) * 4} y={y + dy * lunge + Math.cos(ts * 3 + i) * 3} c={BLUE} hp={0.35 + 0.5 * rnd(3, i) - 0.08 * Math.floor(ts / 0.5)} dead={dead} flash={wiped ? Math.exp(-(ts - WIPE) / 0.1) : 0} />);
  });
  // their defenders dash in just before the wipe
  const arrive = clamp01((ts - beat(3.4)) / 0.3);
  if (arrive > 0)
    THEIRS.forEach(([x, y], i) => {
      els.push(<Token key={`t${i}`} x={x + (1 - EO(arrive)) * 260} y={y} c={RED} hp={0.9} dead={0} />);
    });
  if (wiped) {
    els.push(<circle key="sw" cx={800} cy={320} r={40 + 900 * EO(wipeK)} fill="none" stroke={RED} strokeWidth={60 * (1 - wipeK) + 4} opacity={1 - wipeK * 0.8} />);
    els.push(<circle key="sw2" cx={800} cy={320} r={20 + 700 * EO(wipeK)} fill={RED} opacity={0.25 * (1 - wipeK)} />);
  }
  // damage numbers
  const nums = HITS.map((h, i) => {
    const age = ts - h;
    if (age < 0 || age > 0.8 || ts >= WIPE) return null;
    const big = i === 4;
    return (
      <div key={i} style={{ position: "absolute", right: 1110 - (CX - 70) + (i % 2) * 30, top: CY - 150 - age * 120 + (i % 3) * 22, fontFamily: NUM, fontWeight: 900, fontStyle: "italic", fontSize: big ? 58 : 44, color: big ? K.gold : "#fff", WebkitTextStroke: "2px #3a1300", textShadow: "0 3px 0 #3a1300", opacity: 1 - Math.max(0, age - 0.5) / 0.3, transform: `scale(${1 + 0.4 * Math.exp(-age / 0.08)})`, transformOrigin: "right center", whiteSpace: "nowrap" }}>
        {big ? <span style={{ fontFamily: HAN, fontSize: 34, marginRight: 8 }}>暴击</span> : null}-{[2384, 1966, 2710, 1542, 3105][i].toLocaleString("en-US")}
      </div>
    );
  });
  const lowPulse = hp < 2 ? 0.5 + 0.5 * Math.sin(t * 14) : 0;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#2f6b33" }}>
      <div style={{ position: "absolute", inset: 0, transform: `translate(${sx}px, ${sy}px) scale(${zoom})`, transformOrigin: `${CX}px ${CY}px` }}>
        <Img src={staticFile("field.jpg")} style={{ position: "absolute", left: -185, top: -82, width: 1320, height: 742.5 }} />
        <svg width={1110} height={520} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {els}
        </svg>
        {nums}
      </div>
      {/* a red edge when the team goes down */}
      {wiped ? <div style={{ position: "absolute", inset: 0, boxShadow: `inset 0 0 120px rgba(255,40,70,${0.7 * (1 - grey * 0.5)})` }} /> : null}
      {/* the crystal's health, top centre */}
      <div style={{ position: "absolute", left: 555 - 230, top: 22, width: 460, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontFamily: HAN, fontWeight: 900, fontSize: 18, color: "#ffe9b0", textShadow: "0 2px 0 #000", whiteSpace: "nowrap" }}>敌方水晶</span>
        <div style={{ position: "relative", flex: 1, height: 20, borderRadius: 10, background: "#1a0a10", border: "2px solid #e8c36a", boxShadow: `0 0 ${10 + 18 * lowPulse}px rgba(255,79,154,${0.3 + 0.5 * lowPulse})` }}>
          <div style={{ position: "absolute", left: 2, top: 2, bottom: 2, width: `calc(${hp}% - 2px)`, minWidth: 4, borderRadius: 8, background: "linear-gradient(90deg, #ff8aa8, #ff2d55)" }} />
        </div>
        <span style={{ fontFamily: NUM, fontWeight: 900, fontSize: 24, color: hp < 2 ? "#ff8ab8" : "#fff", textShadow: "0 2px 0 #000", width: 52, textAlign: "right" }}>{Math.max(1, Math.round(hp))}%</span>
      </div>
      {wiped && t < LOSE + 0.2 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 64, textAlign: "center", fontFamily: HAN, fontWeight: 900, fontSize: 40, color: "#fff", textShadow: "0 3px 0 #5a0010, 0 0 24px rgba(255,40,70,0.8)", opacity: clamp01((t - WIPE) / 0.1) }}>
          我方全部阵亡
        </div>
      ) : null}
      {/* the loss: colour drains, 失败 lands */}
      {grey > 0 ? <div style={{ position: "absolute", inset: 0, background: "#808080", mixBlendMode: "saturation", opacity: grey * 0.92 }} /> : null}
      {grey > 0 ? <div style={{ position: "absolute", inset: 0, background: "#05070c", opacity: grey * 0.55 }} /> : null}
      {grey > 0 ? <div style={{ position: "absolute", left: 0, right: 0, top: 330, height: 190, background: "linear-gradient(180deg, rgba(5,7,12,0) 0%, rgba(5,7,12,0.85) 45%, rgba(5,7,12,0.9) 100%)", opacity: grey }} /> : null}
      {grey > 0 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 150, textAlign: "center", fontFamily: SERIF, fontWeight: 900, fontSize: 112, letterSpacing: 26, color: "#e3e7ef", textShadow: "0 6px 0 #1a1e28, 0 0 40px rgba(0,0,0,0.6)", opacity: grey, transform: `scale(${1.5 - 0.5 * EO(grey)})` }}>
          失败
        </div>
      ) : null}
    </div>
  );
};

// The result screen that follows: 失败, the rank stars, the way out and (drawn above, by PhoneTop) 再来一局.
export const ResultScreen: React.FC<{ k: number; t: number; matching?: number }> = ({ k, t, matching = 0 }) => (
  <div style={{ position: "absolute", inset: 0, opacity: k, background: "radial-gradient(ellipse 70% 80% at 50% 40%, #1b2740 0%, #0b1324 70%)" }}>
    <svg width={1110} height={520} style={{ position: "absolute", inset: 0 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <path key={i} d={star(415 + i * 70, 262, 22)} fill={i < 1 ? K.cyan : "none"} stroke={i < 1 ? "#fff" : "#5a6378"} strokeWidth={2.5} />
      ))}
      <rect x={175} y={382} width={170} height={56} rx={28} fill="none" stroke="#6a7488" strokeWidth={2} />
    </svg>
    <div style={{ position: "absolute", left: 0, right: 0, top: 108, textAlign: "center", fontFamily: SERIF, fontWeight: 900, fontSize: 112, letterSpacing: 26, color: "#d6dbe6" }}>失败</div>
    <div style={{ position: "absolute", left: 260, top: 410, transform: "translate(-50%, -50%)", fontFamily: HAN, fontWeight: 700, fontSize: 25, color: "#7d879c" }}>返回大厅</div>
    {matching > 0 ? (
      <div style={{ position: "absolute", inset: 0, background: "rgba(5,8,15,0.82)", opacity: matching, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <div style={{ fontFamily: HAN, fontWeight: 900, fontSize: 44, color: "#e8f4ff" }}>匹配中…</div>
        <div style={{ fontFamily: NUM, fontWeight: 700, fontSize: 30, color: K.cyan, fontVariantNumeric: "tabular-nums" }}>00:0{Math.min(9, Math.floor(Math.max(0, t) % 10))}</div>
      </div>
    ) : null}
  </div>
);
