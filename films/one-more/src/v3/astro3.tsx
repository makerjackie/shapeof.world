// v3 astrolabe: five loops on five time scales around the button, drawn as instruments (double bands, fine ticks,
// lit progress with a running glint), each with a magenta gap that pulls light into it. Timed in track bars.
import React from "react";
import { Cam, camG, w2s } from "../cam";
import { arc, EIN, EIO, EO, polar, ramp, star, win } from "../kit";
import { FONT, HAN, K, NUM } from "../theme";
import { rnd } from "./phone3";
import { FPS, T } from "./time";

type Ring = { r: number; at: number; name: string; w0: number; g0: number; gapW: number };
export const RINGS3: Ring[] = [
  { r: 150, at: T(8.35), name: "一局", w0: 0, g0: -90, gapW: 0 },
  { r: 208, at: T(10), name: "段位", w0: -4.4, g0: -20, gapW: 36 },
  { r: 266, at: T(12), name: "每日任务", w0: 3.3, g0: 60, gapW: 104 },
  { r: 324, at: T(14), name: "赛季", w0: -2.3, g0: 15, gapW: 36 },
  { r: 382, at: T(16), name: "好友", w0: 1.7, g0: -40, gapW: 30 },
];
export const FALL3 = T(11.2);
const SPIN_AT = T(18);
const MM_AT = T(21.5);
export const DIVE_AT = T(26.6);

const spinF = (t: number) =>
  t < SPIN_AT ? 1 : t < SPIN_AT + 1 ? 1 + 5 * ramp(t, SPIN_AT, SPIN_AT + 1, EIO) : t < MM_AT ? 6 : t < MM_AT + 1.2 ? 6 - 4.5 * ramp(t, MM_AT, MM_AT + 1.2, EIO) : 1.5 + 9 * ramp(t, DIVE_AT, T(27.95), EIN);
const SPIN: number[] = (() => {
  const n = Math.ceil((T(28) + 1) * FPS) + 2;
  const out = new Array<number>(n);
  let acc = 0;
  for (let i = 0; i < n; i++) {
    out[i] = acc;
    acc += spinF(i / FPS) / FPS;
  }
  return out;
})();
const spin = (t: number) => SPIN[Math.max(0, Math.min(SPIN.length - 1, Math.round(t * FPS)))];
export const ringAngle = (rg: Ring, t: number) => rg.g0 + rg.w0 * spin(t);

const gapOf = (i: number, t: number) => (i === 1 ? (t < FALL3 + 0.3 ? 34 : 64) : RINGS3[i].gapW);

export const Astro3: React.FC<{ t: number; cam: Cam }> = ({ t, cam }) => {
  const els: React.ReactNode[] = [];
  RINGS3.forEach((rg, i) => {
    const draw = ramp(t, rg.at, rg.at + 0.9, EO);
    if (draw <= 0) return;
    const a = ringAngle(rg, t);
    const pulse = 0.6 + 0.4 * Math.sin(t * 5.2 + i);
    const dash = { pathLength: 1, strokeDasharray: "1 1", strokeDashoffset: 1 - draw };
    // the band: two fine circles and a faint fill
    els.push(<circle key={`bf${i}`} cx={0} cy={0} r={rg.r} fill="none" stroke={K.cyan} strokeOpacity={0.05} strokeWidth={18} {...dash} />);
    els.push(<circle key={`b0${i}`} cx={0} cy={0} r={rg.r - 10} fill="none" stroke={K.cyanHi} strokeOpacity={0.22} strokeWidth={1.2} {...dash} />);
    els.push(<circle key={`b1${i}`} cx={0} cy={0} r={rg.r + 10} fill="none" stroke={K.cyanHi} strokeOpacity={0.22} strokeWidth={1.2} {...dash} />);
    // fine ticks between the lines, a longer one every 15°
    const tickN = 120;
    const shown = Math.floor(tickN * draw);
    const ticks: string[] = [];
    for (let k = 0; k < shown; k++) {
      const ta = a + (k * 360) / tickN;
      const long = k % 10 === 0;
      const [x0, y0] = polar(0, 0, rg.r - (long ? 9 : 4), ta);
      const [x1, y1] = polar(0, 0, rg.r + (long ? 9 : 4), ta);
      ticks.push(`M ${x0.toFixed(1)} ${y0.toFixed(1)} L ${x1.toFixed(1)} ${y1.toFixed(1)}`);
    }
    els.push(<path key={`tk${i}`} d={ticks.join(" ")} stroke={K.cyanHi} strokeOpacity={0.28} strokeWidth={1.2} />);
    if (i === 0) {
      // 一局: a timer sweeps round and closes with a flash
      const p1 = ramp(t, rg.at + 0.1, T(9.6), EIO);
      if (p1 > 0 && p1 < 1) els.push(<path key="r0a" d={arc(0, 0, rg.r, -90, -90 + 359.9 * p1)} stroke="url(#a3-lit)" strokeWidth={8} fill="none" strokeLinecap="round" />);
      if (p1 >= 1) els.push(<circle key="r0c" cx={0} cy={0} r={rg.r} fill="none" stroke={K.cyan} strokeWidth={7} strokeOpacity={0.75} />);
      const flash = win(t, T(9.6), T(9.6) + 0.45, 0.05, 0.35);
      if (flash > 0) els.push(<circle key="r0f" cx={0} cy={0} r={rg.r} fill="none" stroke="#ffffff" strokeWidth={22} opacity={flash * 0.7} />);
      return;
    }
    const gapW = gapOf(i, t);
    const g0 = a - gapW / 2;
    const g1 = a + gapW / 2;
    if (i !== 2) {
      els.push(<path key={`pg${i}`} d={arc(0, 0, rg.r, g1 + 3, g0 + 357)} stroke={K.cyan} strokeOpacity={0.14} strokeWidth={22} fill="none" strokeLinecap="round" {...dash} />);
      els.push(<path key={`p${i}`} d={arc(0, 0, rg.r, g1 + 3, g0 + 357)} stroke={K.cyan} strokeOpacity={0.95} strokeWidth={5} fill="none" strokeLinecap="round" {...dash} />);
    } else {
      for (let s = 0; s < 2; s++) {
        const d = arc(0, 0, rg.r, g1 + 8 + s * 128, g1 + 128 + s * 128);
        els.push(<path key={`p2g${s}`} d={d} stroke={K.cyan} strokeWidth={24} strokeOpacity={0.14} fill="none" strokeLinecap="round" opacity={draw} />);
        els.push(<path key={`p2${s}`} d={d} stroke={K.cyan} strokeWidth={10} fill="none" strokeLinecap="round" opacity={draw} />);
      }
    }
    // a glint running along the lit part
    const ga = g1 + 3 + (((t * (40 + i * 9)) % (354 - gapW)) + (354 - gapW)) % (354 - gapW);
    els.push(<path key={`gl${i}`} d={arc(0, 0, rg.r, ga - 14, ga)} stroke="#ffffff" strokeWidth={4} strokeOpacity={0.75 * draw} fill="none" strokeLinecap="round" />);
    // the gap, and light being pulled into it
    const gd = arc(0, 0, rg.r, g0 + 2, g1 - 2);
    els.push(
      <g key={`g${i}`} opacity={draw * (0.6 + 0.4 * pulse)}>
        <path d={gd} stroke={K.want} strokeWidth={34} strokeOpacity={0.1} fill="none" strokeLinecap="round" />
        <path d={gd} stroke={K.want} strokeWidth={13} strokeOpacity={0.32} fill="none" strokeLinecap="round" />
        <path d={gd} stroke={K.wantHi} strokeWidth={4} fill="none" strokeLinecap="round" strokeDasharray={i === 2 ? "10 9" : undefined} />
      </g>,
    );
    for (let p = 0; p < 9; p++) {
      const life = ((t * 0.7 + rnd(i, p)) % 1 + 1) % 1;
      const pa = a + (rnd(i + 7, p) - 0.5) * gapW * 2.4 * (1 - life);
      const pr = rg.r + (rnd(i + 13, p) - 0.5) * 80 * (1 - life);
      const [px, py] = polar(0, 0, pr, pa);
      els.push(<circle key={`pp${i}-${p}`} cx={px} cy={py} r={2.4 + 2 * life} fill={K.wantHi} opacity={draw * Math.sin(life * Math.PI) * 0.9} />);
    }
    if (i === 1) {
      for (let s = 0; s < 5; s++) {
        const sa = a - 132 + s * 33;
        const [sx, sy] = polar(0, 0, rg.r, sa);
        if (s === 3 && t >= FALL3) {
          const dt = t - FALL3;
          const fx = sx + dt * 60;
          const fy = sy + 0.5 * 1500 * dt * dt;
          const fo = 1 - ramp(t, FALL3 + 0.35, FALL3 + 0.7);
          if (fo > 0) els.push(<path key="sf" d={star(fx, fy, 17)} fill={K.cyan} opacity={fo * draw} transform={`rotate(${dt * 260} ${fx} ${fy})`} />);
          els.push(<path key={`s${s}`} d={star(sx, sy, 16)} fill="#0a0f1c" stroke={K.wantHi} strokeWidth={2.5} opacity={draw * ramp(t, FALL3 + 0.2, FALL3 + 0.5)} />);
          continue;
        }
        const lit = s < 4;
        if (lit) els.push(<circle key={`sg${s}`} cx={sx} cy={sy} r={22} fill={K.cyan} opacity={0.18 * draw} />);
        els.push(<path key={`s${s}`} d={star(sx, sy, 16)} fill={lit ? K.cyan : "#0a0f1c"} stroke={lit ? "#ffffff" : K.wantHi} strokeWidth={lit ? 1.5 : 2.5} opacity={draw} />);
      }
    }
    if (i === 3) {
      const tickOn = t > T(14) && t < T(16.1) ? Math.exp(-((((t - T(14)) / (T(15) - T(14))) * 4) % 1) * 6) : 0;
      for (let d = 0; d < 90; d++) {
        const left = d >= 81;
        const da = left ? g0 + ((d - 81 + 0.5) * gapW) / 9 : g1 + 4 + d * ((352 - gapW) / 80);
        if (!left && d > 80) continue;
        const [x0, y0] = polar(0, 0, rg.r - 13, da);
        const [x1, y1] = polar(0, 0, rg.r + 13, da);
        els.push(<line key={`d${d}`} x1={x0} y1={y0} x2={x1} y2={y1} stroke={left ? K.wantHi : K.cyanHi} strokeWidth={left ? 3.2 : 1.6} opacity={draw * (left ? 0.75 + 0.25 * tickOn : 0.4)} />);
      }
    }
    if (i === 4) {
      for (let s = 0; s < 5; s++) {
        const sa = a - 120 + s * 30;
        const [px, py] = polar(0, 0, rg.r, sa);
        const empty = s === 4;
        els.push(
          <g key={`f${s}`} opacity={draw}>
            {!empty ? <circle cx={px} cy={py} r={28} fill={K.cyan} opacity={0.12} /> : null}
            <circle cx={px} cy={py} r={20} fill={empty ? "#0a0f1c" : "#16405a"} stroke={empty ? K.wantHi : K.cyanHi} strokeWidth={2.5} strokeDasharray={empty ? "5 5" : undefined} />
            {!empty ? (
              <>
                <circle cx={px} cy={py - 5} r={6.5} fill={K.cyanHi} />
                <path d={`M ${px - 11} ${py + 12} Q ${px} ${py - 2} ${px + 11} ${py + 12}`} fill={K.cyanHi} />
              </>
            ) : null}
          </g>,
        );
      }
    }
  });
  // matchmaking: two teams slide in around the button, a beam settles near level
  const mm = ramp(t, MM_AT + 0.1, MM_AT + 0.9, EO);
  if (mm > 0) {
    for (let s = 0; s < 10; s++) {
      const left = s < 5;
      const sa = left ? 140 + (s % 5) * 20 : -40 + (s % 5) * 20;
      const [px, py] = polar(0, 0, 108 + (1 - mm) * 500, sa);
      els.push(<circle key={`mg${s}`} cx={px} cy={py} r={16} fill={left ? "#4fb8ff" : "#ff5d70"} opacity={0.18 * mm} />);
      els.push(<circle key={`m${s}`} cx={px} cy={py} r={9} fill={left ? "#4fb8ff" : "#ff5d70"} stroke="#fff" strokeWidth={1.5} opacity={mm} />);
    }
    const wob = 9 * Math.sin((t - MM_AT - 0.5) * 4.2) * Math.exp(-Math.max(0, t - MM_AT - 0.5) * 0.45);
    const bo = mm * (1 - ramp(t, DIVE_AT + 0.4, DIVE_AT + 0.8));
    els.push(
      <g key="beam" opacity={bo} transform={`rotate(${wob})`}>
        <line x1={-130} y1={0} x2={130} y2={0} stroke={K.fg} strokeWidth={3} strokeOpacity={0.8} />
        <circle cx={-130} cy={0} r={7} fill="#4fb8ff" />
        <circle cx={130} cy={0} r={7} fill="#ff5d70" />
      </g>,
    );
  }
  return (
    <g transform={camG(cam)}>
      <defs>
        <linearGradient id="a3-lit" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor={K.cyan} />
          <stop offset="100%" stopColor="#2a7fb0" />
        </linearGradient>
      </defs>
      {els}
    </g>
  );
};

export const Astro3Labels: React.FC<{ t: number; cam: Cam }> = ({ t, cam }) => {
  const out: React.ReactNode[] = [];
  const end = DIVE_AT + 0.3;
  RINGS3.forEach((rg, i) => {
    const o = win(t, rg.at + 0.3, SPIN_AT + 0.2, 0.4, 0.4);
    const [nx, ny] = w2s(cam, 0, -rg.r + 28);
    if (o > 0)
      out.push(
        <div key={`n${i}`} style={{ position: "absolute", left: nx, top: ny, transform: "translate(-50%, -50%)", fontFamily: HAN, fontWeight: 800, fontSize: 23 * cam.z, color: "rgba(244,240,232,0.75)", opacity: o, whiteSpace: "nowrap" }}>
          {rg.name}
        </div>,
      );
    if (i === 0 || t < rg.at) return;
    const chip = i === 1 ? (t < FALL3 + 0.4 ? "还差 1 颗" : "还差 2 颗") : i === 2 ? "还差 1 局" : i === 3 ? "还剩 9 天" : "差 1 人";
    const [cx, cy] = w2s(cam, ...polar(0, 0, rg.r + 56, ringAngle(rg, t)));
    const co = win(t, rg.at + 0.7, end, 0.35, 0.4);
    out.push(
      <div key={`c${i}`} style={{ position: "absolute", left: cx, top: cy, transform: "translate(-50%, -50%)", fontFamily: FONT, fontWeight: 800, fontSize: 25 * cam.z, color: "#fff", background: "rgba(255,79,154,0.28)", border: `${1.5 * cam.z}px solid ${K.want}`, borderRadius: 999, padding: `${3 * cam.z}px ${12 * cam.z}px`, whiteSpace: "nowrap", opacity: co, boxShadow: `0 0 ${18 * cam.z}px rgba(255,79,154,0.45)` }}>
        {chip}
      </div>,
    );
  });
  const m = win(t, MM_AT + 0.6, DIVE_AT + 0.5, 0.4, 0.3);
  if (m > 0) {
    const [mx, my] = w2s(cam, 0, -120);
    out.push(
      <div key="mm" style={{ position: "absolute", left: mx, top: my, transform: "translate(-50%, -50%)", fontFamily: NUM, fontWeight: 800, fontSize: 26 * cam.z, color: K.fg, opacity: m, whiteSpace: "nowrap", letterSpacing: 1 }}>
        50 : 50
      </div>,
    );
  }
  return <>{out}</>;
};

