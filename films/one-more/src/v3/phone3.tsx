// v3 phone: a living 5v5 match on the screen (map, river, lane, towers, minions, heroes, skills), the result banner,
// the round 再来一局 button and a thumb. Self-drawn; it stands for any mobile MOBA and copies none.
// World units; the button sits at the origin, the screen spans x −555…555, y −410…110.
import React from "react";
import { Cam, camG, w2s } from "../cam";
import { clamp01, EO, star } from "../kit";
import { HAN, K, NUM, SERIF } from "../theme";
import { BEAT } from "./time";

export const SCREEN = { x0: -555, y0: -410, x1: 555, y1: 110, r: 40 };
export const BTN_R = 70;
const BLUE = "#4fb8ff";
const RED = "#ff5d70";
const THUMB = "M -62 0 C -62 -86, 62 -86, 62 0 L 74 900 L -74 900 Z";

export const rnd = (seed: number, i: number) => {
  const x = Math.sin(seed * 127.1 + i * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export type PhoneView = {
  o: number;
  mode: "battle" | "result" | "idle";
  seed: number; // which match
  age: number; // seconds into the battle
  win: boolean;
  resultK: number; // 0..1 banner in
  stars: number; // lit stars on the result screen
  ui?: number; // 0..1 the screen content (fades for the rings)
  thumb?: { x: number; y: number; s: number; o: number };
  press?: number; // 0..1 the button sinks
  ripples?: { r: number; o: number; c: string }[];
  beatPhase?: number; // 0..1 within the current beat (button heartbeat)
  hole?: number;
};

// ---------- the match ----------
const lanePt = (u: number): [number, number] => {
  // the mid lane, bottom-left base to top-right base
  const x = -620 + 1240 * u;
  const y = 90 - 500 * u - 60 * Math.sin(u * Math.PI);
  return [x, y];
};

const Battle: React.FC<{ seed: number; age: number }> = ({ seed, age }) => {
  const els: React.ReactNode[] = [];
  const shakeK = Math.exp(-((age % (BEAT / 2)) / 0.08)) * (age > 0.05 ? 1 : 0);
  const sx = (rnd(seed, Math.floor(age / (BEAT / 2))) - 0.5) * 10 * shakeK;
  const sy = (rnd(seed + 3, Math.floor(age / (BEAT / 2))) - 0.5) * 10 * shakeK;
  // ground
  els.push(<rect key="g" x={SCREEN.x0} y={SCREEN.y0} width={1110} height={520} fill="url(#p3-ground)" />);
  for (let i = 0; i < 16; i++) els.push(<line key={`gx${i}`} x1={-560 + i * 74} x2={-560 + i * 74 + 200} y1={SCREEN.y0} y2={SCREEN.y1} stroke="#9fe0c0" strokeOpacity={0.035} strokeWidth={2} />);
  // grass
  [
    [-380, -250, 130, 60],
    [330, -10, 150, 55],
    [-160, 70, 100, 40],
    [170, -340, 120, 45],
    [-470, -40, 90, 50],
  ].forEach(([x, y, rx, ry], i) => els.push(<ellipse key={`gr${i}`} cx={x + sx} cy={y + sy} rx={rx} ry={ry} fill="#0e3a2b" opacity={0.9} />));
  // the lane
  const lane = Array.from({ length: 21 }, (_, i) => lanePt(i / 20)).map(([x, y]) => `${(x + sx).toFixed(1)},${(y + sy).toFixed(1)}`);
  els.push(<path key="ln0" d={`M ${lane.join(" L ")}`} stroke="#5b5440" strokeWidth={96} fill="none" strokeLinecap="round" opacity={0.55} />);
  els.push(<path key="ln1" d={`M ${lane.join(" L ")}`} stroke="#8c8262" strokeWidth={60} fill="none" strokeLinecap="round" opacity={0.28} />);
  // the river, crossing the other way, with light running on it
  const river = `M ${-620 + sx} ${-330 + sy} C ${-220 + sx} ${-250 + sy}, ${80 + sx} ${-30 + sy}, ${620 + sx} ${70 + sy}`;
  els.push(<path key="rv0" d={river} stroke="#16557c" strokeWidth={130} fill="none" opacity={0.9} />);
  els.push(<path key="rv1" d={river} stroke="#2f8fc4" strokeWidth={56} fill="none" opacity={0.45} />);
  els.push(<path key="rv2" d={river} stroke="#bfefff" strokeWidth={3} fill="none" opacity={0.5} strokeDasharray="18 40" strokeDashoffset={-age * 120} />);
  // towers
  const tower = (x: number, y: number, c: string, key: string) => (
    <g key={key}>
      <circle cx={x} cy={y} r={70} fill={c} opacity={0.1} />
      <path d={`M ${x - 30} ${y + 18} L ${x - 30} ${y - 4} L ${x} ${y - 20} L ${x + 30} ${y - 4} L ${x + 30} ${y + 18} L ${x} ${y + 32} Z`} fill="#2a2e3a" stroke={c} strokeWidth={2.5} />
      <path d={`M ${x} ${y - 58} L ${x + 13} ${y - 30} L ${x} ${y - 8} L ${x - 13} ${y - 30} Z`} fill={c} />
      <circle cx={x} cy={y - 32} r={26} fill={c} opacity={0.25} />
    </g>
  );
  els.push(tower(310 + sx, -270 + sy, RED, "tr"));
  els.push(tower(-340 + sx, 10 + sy, BLUE, "tb"));
  // minions walking down the lane towards the fight
  for (let i = 0; i < 5; i++) {
    const ub = clamp01(0.08 + ((age * 0.05 + i * 0.045) % 0.36));
    const ur = clamp01(0.92 - ((age * 0.05 + i * 0.045) % 0.36));
    const [bx, by] = lanePt(ub);
    const [rx, ry] = lanePt(ur);
    els.push(<circle key={`mb${i}`} cx={bx + sx} cy={by + sy + (i % 2) * 12} r={8} fill={BLUE} stroke="#d8f1ff" strokeWidth={1.5} />);
    els.push(<circle key={`mr${i}`} cx={rx + sx} cy={ry + sy + (i % 2) * 12} r={8} fill={RED} stroke="#ffe0e4" strokeWidth={1.5} />);
  }
  // heroes: three a side, around the clash in mid
  const cx = -20 + (rnd(seed, 1) - 0.5) * 120;
  const cy = -170 + (rnd(seed, 2) - 0.5) * 60;
  const heroes: { x: number; y: number; c: string; hp: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const blue = i < 3;
    const a = (i % 3) * 1.7 + rnd(seed, 10 + i) * 0.8;
    const dist = 70 + rnd(seed, 20 + i) * 60;
    const side = blue ? -1 : 1;
    const x = cx + side * (60 + Math.cos(a) * dist * 0.6) + Math.sin(age * 3 + i) * 10;
    const y = cy + Math.sin(a) * dist * 0.7 + Math.cos(age * 2.6 + i) * 8;
    heroes.push({ x: x + sx, y: y + sy, c: blue ? BLUE : RED, hp: 0.25 + 0.7 * rnd(seed, 30 + i) - (blue ? 0 : 0.15 * Math.floor(age / (BEAT / 2))) });
  }
  // skill effects: every half beat a blue hero lands something on a red one
  const nHits = Math.floor(age / (BEAT / 2)) + 1;
  for (let h = Math.max(0, nHits - 3); h < nHits; h++) {
    const hAge = age - h * (BEAT / 2);
    if (hAge < 0 || hAge > 0.6) continue;
    const from = heroes[h % 3];
    const to = heroes[3 + ((h + 1) % 3)];
    const k = EO(clamp01(hAge / 0.6));
    const kind = Math.floor(rnd(seed, 40 + h) * 3);
    const c = [K.gold, "#8ff0ff", "#c38bff"][kind];
    if (kind === 0) els.push(<line key={`fx${h}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={c} strokeWidth={10 * (1 - k) + 2} opacity={1 - k} strokeLinecap="round" />);
    els.push(<circle key={`fr${h}`} cx={to.x} cy={to.y} r={18 + 80 * k} fill="none" stroke={c} strokeWidth={6 * (1 - k) + 1} opacity={1 - k} />);
    els.push(<circle key={`fc${h}`} cx={to.x} cy={to.y} r={30 * (1 - k)} fill={c} opacity={0.5 * (1 - k)} />);
    if (kind === 2) els.push(<path key={`fs${h}`} d={`M ${to.x - 60} ${to.y + 30} Q ${to.x} ${to.y - 70 * k - 20} ${to.x + 60} ${to.y + 30}`} stroke="#fff" strokeWidth={5 * (1 - k)} fill="none" opacity={1 - k} />);
  }
  heroes.forEach((h, i) => {
    els.push(
      <g key={`h${i}`}>
        <ellipse cx={h.x} cy={h.y + 20} rx={22} ry={8} fill="#000" opacity={0.35} />
        <circle cx={h.x} cy={h.y} r={22} fill={h.c} opacity={0.2} />
        <circle cx={h.x} cy={h.y} r={17} fill={i < 3 ? "#123a5c" : "#5c1a2a"} stroke={h.c} strokeWidth={3.5} />
        <circle cx={h.x} cy={h.y - 3} r={6} fill="#f4f0e8" opacity={0.85} />
        <rect x={h.x - 22} y={h.y - 36} width={44} height={6} rx={3} fill="#0a0d14" opacity={0.85} />
        <rect x={h.x - 22} y={h.y - 36} width={44 * clamp01(h.hp)} height={6} rx={3} fill={i < 3 ? "#5df08a" : RED} />
      </g>,
    );
  });
  // HUD: joystick, skill buttons, minimap
  els.push(<circle key="js" cx={-440} cy={20} r={62} fill="#fff" opacity={0.06} stroke="#fff" strokeOpacity={0.25} strokeWidth={2} />);
  els.push(<circle key="jk" cx={-440 + Math.sin(age * 2) * 18} cy={20 + Math.cos(age * 2.3) * 14} r={26} fill="#fff" opacity={0.22} />);
  [
    [440, 30, 52],
    [330, 64, 30],
    [352, -32, 30],
    [446, -82, 30],
  ].forEach(([x, y, r], i) => {
    const lit = i > 0 && Math.floor(age / (BEAT / 2)) % 3 === i - 1;
    els.push(<circle key={`sk${i}`} cx={x} cy={y} r={r} fill={lit ? "#fff" : "#0b1220"} opacity={lit ? 0.35 : 0.55} stroke="#e8f4ff" strokeOpacity={0.6} strokeWidth={2.5} />);
  });
  els.push(<rect key="mm" x={-540} y={-396} width={118} height={118} rx={8} fill="#08121c" opacity={0.8} stroke="#e8f4ff" strokeOpacity={0.25} />);
  els.push(<path key="mml" d="M -532 -286 L -430 -388" stroke="#8c8262" strokeWidth={6} opacity={0.6} />);
  els.push(<circle key="mmb" cx={-488} cy={-332} r={4} fill={BLUE} />);
  els.push(<circle key="mmr" cx={-474} cy={-346} r={4} fill={RED} />);
  return <g>{els}</g>;
};

// ---------- the result screen ----------
const Result: React.FC<{ win: boolean; k: number; stars: number; age: number }> = ({ win, k, stars, age }) => {
  const els: React.ReactNode[] = [];
  els.push(<rect key="ov" x={SCREEN.x0} y={SCREEN.y0} width={1110} height={520} fill="#05080f" opacity={0.78 * k} />);
  if (win) {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + age * 0.6;
      const r1 = 90;
      const r2 = 420;
      const w = 0.07;
      els.push(
        <path
          key={`ray${i}`}
          d={`M ${Math.cos(a - w) * r1} ${-250 + Math.sin(a - w) * r1} L ${Math.cos(a) * r2} ${-250 + Math.sin(a) * r2} L ${Math.cos(a + w) * r1} ${-250 + Math.sin(a + w) * r1} Z`}
          fill={K.gold}
          opacity={0.12 * k}
        />,
      );
    }
    els.push(<circle key="halo" cx={0} cy={-250} r={170} fill={K.gold} opacity={0.12 * k} />);
  } else {
    els.push(<line key="cr1" x1={-190} y1={-300} x2={-40} y2={-215} stroke="#9aa6bd" strokeWidth={3} opacity={0.5 * k} />);
    els.push(<line key="cr2" x1={-40} y1={-215} x2={60} y2={-275} stroke="#9aa6bd" strokeWidth={3} opacity={0.5 * k} />);
    els.push(<line key="cr3" x1={60} y1={-275} x2={210} y2={-205} stroke="#9aa6bd" strokeWidth={3} opacity={0.5 * k} />);
  }
  for (let i = 0; i < 5; i++) {
    const on = i < stars;
    els.push(<path key={`st${i}`} d={star(-140 + i * 70, -132, 22)} fill={on ? (win ? K.gold : K.cyan) : "none"} stroke={on ? "#fff3c4" : "#5a6378"} strokeWidth={2.5} opacity={k} />);
  }
  els.push(<rect key="home" x={-380} y={-28} width={170} height={56} rx={28} fill="none" stroke="#6a7488" strokeWidth={2} opacity={k} />);
  return <g>{els}</g>;
};

export const Phone3Svg: React.FC<{ cam: Cam; v: PhoneView; t: number }> = ({ cam, v, t }) => {
  if (v.o <= 0) return null;
  const ui = v.ui ?? 1;
  const glow = 0.45 + 0.55 * Math.exp(-(v.beatPhase ?? 0) * 5);
  const btnK = v.mode === "result" ? clamp01(v.resultK * 1.4) : v.mode === "idle" ? 1 : 0;
  const press = v.press ?? 0;
  return (
    <g transform={camG(cam)} opacity={v.o}>
      <defs>
        <linearGradient id="p3-ground" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#173d34" />
          <stop offset="55%" stopColor="#12302b" />
          <stop offset="100%" stopColor="#0d2224" />
        </linearGradient>
        <radialGradient id="p3-btn" cx="0.42" cy="0.34" r="0.78">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#ffe6f0" />
          <stop offset="100%" stopColor="#f2a9c9" />
        </radialGradient>
        <linearGradient id="p3-edge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8a96ad" />
          <stop offset="18%" stopColor="#2a303d" />
          <stop offset="60%" stopColor="#151922" />
          <stop offset="100%" stopColor="#5a6478" />
        </linearGradient>
        <linearGradient id="p3-glass" x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.09} />
          <stop offset="35%" stopColor="#ffffff" stopOpacity={0.02} />
          <stop offset="36%" stopColor="#ffffff" stopOpacity={0} />
        </linearGradient>
        <clipPath id="p3-clip">
          <rect x={SCREEN.x0} y={SCREEN.y0} width={1110} height={520} rx={SCREEN.r} />
        </clipPath>
        <radialGradient id="p3-spill">
          <stop offset="0%" stopColor="#3f78c0" stopOpacity={0.45} />
          <stop offset="60%" stopColor="#3f78c0" stopOpacity={0.08} />
          <stop offset="100%" stopColor="#3f78c0" stopOpacity={0} />
        </radialGradient>
      </defs>
      {/* the light the screen throws around it */}
      <ellipse cx={0} cy={-150} rx={1100} ry={720} fill="url(#p3-spill)" opacity={ui} />
      <g opacity={ui}>
        <rect x={-600} y={-445} width={1200} height={590} rx={78} fill="#07090e" stroke="url(#p3-edge)" strokeWidth={6} />
        <rect x={-593} y={-438} width={1186} height={576} rx={72} fill="none" stroke="#000" strokeWidth={4} opacity={0.6} />
        <g clipPath="url(#p3-clip)">
          {v.mode === "battle" || v.mode === "result" ? <Battle seed={v.seed} age={v.age} /> : <rect x={SCREEN.x0} y={SCREEN.y0} width={1110} height={520} fill="#0b1324" />}
          {v.mode === "result" ? <Result win={v.win} k={v.resultK} stars={v.stars} age={t} /> : null}
          {v.mode === "idle" ? <Result win={false} k={1} stars={v.stars} age={t} /> : null}
          <rect x={SCREEN.x0} y={SCREEN.y0} width={1110} height={520} fill="url(#p3-glass)" />
        </g>
        <circle cx={560} cy={-150} r={9} fill="#11151d" stroke="#2a303d" strokeWidth={2} />
      </g>
      {/* the button */}
      {btnK > 0 ? (
        <g opacity={btnK} transform={`scale(${1 - 0.08 * press})`}>
          <circle cx={0} cy={0} r={BTN_R + 50} fill={K.want} opacity={0.07 * glow} />
          <circle cx={0} cy={0} r={BTN_R + 24} fill={K.want} opacity={0.16 * glow} />
          <circle cx={0} cy={0} r={BTN_R + 7} fill="none" stroke={K.want} strokeWidth={5} opacity={0.5 + 0.5 * glow} />
          <circle cx={0} cy={4} r={BTN_R} fill="#b85a85" />
          <circle cx={0} cy={0} r={BTN_R} fill="url(#p3-btn)" />
          <ellipse cx={-14} cy={-30} rx={38} ry={18} fill="#fff" opacity={0.45} />
          {v.hole ? <circle cx={0} cy={0} r={BTN_R * 0.94 * v.hole} fill="#020306" /> : null}
        </g>
      ) : null}
      {(v.ripples ?? []).map((rp, i) => (
        <circle key={i} cx={0} cy={0} r={rp.r} fill="none" stroke={rp.c} strokeWidth={3} opacity={rp.o} />
      ))}
      {v.thumb && v.thumb.o > 0 ? (
        <g opacity={v.thumb.o} transform={`translate(${v.thumb.x} ${v.thumb.y}) rotate(-34) scale(${v.thumb.s})`}>
          <path d={THUMB} transform="translate(20 34)" fill="#000" opacity={0.35} />
          <path d={THUMB} fill="#130f13" opacity={0.95} />
          <path d={THUMB} fill="none" stroke="#ffd2bf" strokeOpacity={0.45} strokeWidth={3} />
          <rect x={-36} y={-40} width={72} height={88} rx={32} fill="#2b2329" stroke="#ffd2bf" strokeOpacity={0.24} strokeWidth={2} />
        </g>
      ) : null}
    </g>
  );
};

// Type on the phone, projected through the camera.
export const Phone3Html: React.FC<{ cam: Cam; v: PhoneView }> = ({ cam, v }) => {
  if (v.o <= 0) return null;
  const ui = v.ui ?? 1;
  const z = cam.z;
  const at = (wx: number, wy: number, size: number, style: React.CSSProperties, text: React.ReactNode, key: string) => {
    const [sx, sy] = w2s(cam, wx, wy);
    return (
      <div key={key} style={{ position: "absolute", left: sx, top: sy, transform: "translate(-50%, -50%)", fontSize: size * z, whiteSpace: "nowrap", lineHeight: 1, ...style }}>
        {text}
      </div>
    );
  };
  const k = v.mode === "result" ? v.resultK : v.mode === "idle" ? 1 : 0;
  const battle = v.mode === "battle" || (v.mode === "result" && v.resultK < 1);
  const hitN = Math.floor(v.age / (BEAT / 2));
  const dmg = 120 + Math.floor(rnd(v.seed, 50 + hitN) * 880);
  const dAge = v.age - hitN * (BEAT / 2);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: v.o }}>
      <div style={{ opacity: ui }}>
        {battle
          ? [
              at(0, -388, 24, { fontFamily: NUM, fontWeight: 800, color: "#e8f4ff", letterSpacing: 2 * z, opacity: 1 - k }, <><span style={{ color: BLUE }}>{8 + (v.seed % 7)}</span> : <span style={{ color: RED }}>{6 + ((v.seed * 3) % 9)}</span></>, "score"),
              at(0, -360, 18, { fontFamily: NUM, fontWeight: 600, color: "rgba(232,244,255,0.7)", opacity: 1 - k }, `${String(9 + (v.seed % 9)).padStart(2, "0")}:${String(Math.floor(10 + v.age * 7) % 60).padStart(2, "0")}`, "clock"),
              dAge < 0.45 ? at(60 + rnd(v.seed, 60 + hitN) * 120, -230 - dAge * 90, 30, { fontFamily: NUM, fontWeight: 900, color: hitN % 3 === 0 ? K.gold : "#fff", opacity: (1 - dAge / 0.45) * (1 - k), textShadow: "0 2px 6px #000" }, `-${dmg}`, "dmg") : null,
            ]
          : null}
        {k > 0
          ? [
              at(0, -250, 132, { fontFamily: SERIF, fontWeight: 900, letterSpacing: 0.25 * 132 * z, color: v.win || v.mode === "idle" ? (v.win ? K.gold : "#d6dbe6") : "#d6dbe6", opacity: k, transform: `translate(-50%, -50%) scale(${1.4 - 0.4 * EO(clamp01(k))})`, textShadow: v.win ? `0 0 ${40 * z}px rgba(255,209,102,0.6)` : "none" }, v.win ? "胜利" : "失败", "banner"),
              at(-295, 0, 25, { fontFamily: HAN, fontWeight: 700, color: "#7d879c", opacity: k }, "返回大厅", "home"),
            ]
          : null}
      </div>
      {k > 0 ? at(0, 0, 28, { fontFamily: HAN, fontWeight: 900, color: K.ink, opacity: clamp01(k * 1.4) * (v.hole ? 1 - v.hole * 3 : 1) }, "再来一局", "again") : null}
    </div>
  );
};

