import React from "react";
import { FONT } from "../theme";
import { P } from "./common";

// Flat 2D illustrations for the opening samples. Labels are HTML on top of the SVG (no centred SVG text).

// ── A DDR5 stick: graphite heat spreader, a paper label, the green board edge and gold contacts with the DDR5 notch ──
export const RamStick: React.FC<{ w: number; tone?: number; label?: boolean; id: string }> = ({ w, tone = 0, label = true, id }) => {
  const h = w * 0.26;
  const top = tone ? ["#2c3139", "#181b20"] : ["#3c424c", "#1f2329"];
  const pins = [];
  for (let x = 34; x < 966; x += 15) if (x < 548 || x > 572) pins.push(x);
  return (
    <div style={{ position: "relative", width: w, height: h }}>
      <svg viewBox="0 0 1000 260" width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <defs>
          <linearGradient id={`hs-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={top[0]} />
            <stop offset="1" stopColor={top[1]} />
          </linearGradient>
          <linearGradient id={`au-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f3d27a" />
            <stop offset="1" stopColor="#c68f2c" />
          </linearGradient>
          <linearGradient id={`sh-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.22" />
            <stop offset="0.45" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect x="0" y="176" width="1000" height="34" rx="6" fill="#2d6a46" />
        {pins.map((x) => (
          <rect key={x} x={x} y="206" width="10" height="44" rx="2" fill={`url(#au-${id})`} />
        ))}
        <path d="M0,18 Q0,0 18,0 L982,0 Q1000,0 1000,18 L1000,188 L0,188 Z" fill={`url(#hs-${id})`} />
        <path d="M0,18 Q0,0 18,0 L560,0 L470,70 L0,70 Z" fill="#59616d" opacity={tone ? 0.35 : 0.55} />
        <rect x="0" y="0" width="1000" height="188" rx="18" fill={`url(#sh-${id})`} />
        <rect x="0" y="180" width="1000" height="8" fill="#000" opacity="0.25" />
        {label ? <rect x="560" y="96" width="380" height="64" rx="8" fill="#ece6da" /> : null}
      </svg>
      {label ? (
        <div style={{ position: "absolute", left: w * 0.575, top: h * 0.375, width: w * 0.37, height: h * 0.24, display: "flex", alignItems: "center", gap: w * 0.012, fontFamily: FONT, color: P.ink }}>
          <span style={{ fontSize: w * 0.032, fontWeight: 900, letterSpacing: -0.5 }}>DDR5</span>
          <span style={{ fontSize: w * 0.021, fontWeight: 700, opacity: 0.75, whiteSpace: "nowrap" }}>32GB · 6000</span>
        </div>
      ) : null}
    </div>
  );
};

// Two sticks offset like a retail kit.
export const RamKit: React.FC<{ w: number; id: string }> = ({ w, id }) => (
  <div style={{ position: "relative", width: w * 1.05, height: w * 0.36 }}>
    <div style={{ position: "absolute", left: w * 0.05, top: 0 }}>
      <RamStick w={w} tone={1} label={false} id={`${id}b`} />
    </div>
    <div style={{ position: "absolute", left: 0, top: w * 0.085 }}>
      <RamStick w={w} id={`${id}f`} />
    </div>
  </div>
);

// A tiny outline stick for icons and streams.
export const MiniRam: React.FC<{ w: number; color?: string; fill?: string }> = ({ w, color = P.ink, fill = "transparent" }) => (
  <svg viewBox="0 0 100 30" width={w} height={w * 0.3} style={{ overflow: "visible" }}>
    <rect x="1" y="1" width="98" height="20" rx="3" fill={fill} stroke={color} strokeWidth="2.5" />
    {[10, 22, 34, 46, 62, 74, 86].map((x) => (
      <rect key={x} x={x} y="23" width="6" height="6" rx="1" fill={color} />
    ))}
  </svg>
);

// ── Coins: one coin = ¥100; every 10th coin is brass ──
export const COIN_W = 150;
export const COIN_T = 15;
const COIN_RY = 24;

export const Coin: React.FC<{ brass?: boolean; shade?: number }> = ({ brass, shade = 0 }) => {
  const c = brass ? { top: "#f2cf6c", rim: "#d8a83c", side: "#b9852a", line: "#e9bd52" } : { top: "#eef0f3", rim: "#c3c8cf", side: "#9fa6b0", line: "#d9dde2" };
  return (
    <svg width={COIN_W} height={COIN_RY * 2 + COIN_T} style={{ position: "absolute", left: -COIN_W / 2, top: -COIN_RY, overflow: "visible" }}>
      <path d={`M0,${COIN_RY} L0,${COIN_RY + COIN_T} A${COIN_W / 2},${COIN_RY} 0 0 0 ${COIN_W},${COIN_RY + COIN_T} L${COIN_W},${COIN_RY} Z`} fill={c.side} />
      <path d={`M0,${COIN_RY} L0,${COIN_RY + COIN_T} A${COIN_W / 2},${COIN_RY} 0 0 0 ${COIN_W},${COIN_RY + COIN_T} L${COIN_W},${COIN_RY} Z`} fill="#000" opacity={shade * 0.12} />
      <path d={`M0.5,${COIN_RY + COIN_T - 1} A${COIN_W / 2},${COIN_RY} 0 0 0 ${COIN_W - 0.5},${COIN_RY + COIN_T - 1}`} fill="none" stroke="#3b3326" strokeOpacity={0.45} strokeWidth={2.5} />
      <path d={`M1,${COIN_RY + 2} A${COIN_W / 2},${COIN_RY} 0 0 0 ${COIN_W - 1},${COIN_RY + 2}`} fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={1.5} />
      {Array.from({ length: 14 }).map((_, i) => {
        const x = 8 + i * 10.5;
        return <line key={i} x1={x} y1={COIN_RY + 3} x2={x} y2={COIN_RY + COIN_T - 1} stroke="#000" strokeOpacity={0.12} strokeWidth={2} />;
      })}
      <ellipse cx={COIN_W / 2} cy={COIN_RY} rx={COIN_W / 2} ry={COIN_RY} fill={c.rim} />
      <ellipse cx={COIN_W / 2} cy={COIN_RY} rx={COIN_W / 2 - 9} ry={COIN_RY - 5} fill={c.top} />
      <ellipse cx={COIN_W / 2} cy={COIN_RY} rx={COIN_W / 2 - 22} ry={COIN_RY - 11} fill="none" stroke={c.line} strokeWidth={3} />
    </svg>
  );
};

// ── Server rack: "AI 数据中心", blinking LEDs, an intake slot that glows while it pulls things in ──
export const ServerRack: React.FC<{ w: number; h: number; t: number; glow: number; dark?: boolean }> = ({ w, h, t, glow, dark }) => {
  const units = 7;
  const uh = (h - 150) / units;
  return (
    <div style={{ position: "relative", width: w, height: h }}>
      <div style={{ position: "absolute", left: -40, right: -40, top: 60, bottom: -30, borderRadius: 40, background: `radial-gradient(ellipse at 50% 55%, rgba(77,212,255,${0.35 * glow}) 0%, transparent 70%)` }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: 22, background: "linear-gradient(180deg, #2f3848, #1b2029)", boxShadow: dark ? "0 0 0 2px #3a4456" : "0 30px 60px rgba(30,22,10,0.35)" }} />
      <div style={{ position: "absolute", left: 20, right: 20, top: 18, height: 72, borderRadius: 12, background: "#11151c", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontWeight: 900, fontSize: w * 0.12, color: "#bfefff", letterSpacing: 2 }}>
        AI 数据中心
      </div>
      {Array.from({ length: units }).map((_, u) => (
        <div key={u} style={{ position: "absolute", left: 20, right: 20, top: 110 + u * uh, height: uh - 10, borderRadius: 8, background: u === 3 ? `rgba(77,212,255,${0.15 + 0.6 * glow})` : "#262e3b", border: "1px solid #3b4558", display: "flex", alignItems: "center", gap: 8, padding: "0 14px", boxSizing: "border-box" }}>
          {u === 3 ? (
            <div style={{ flex: 1, height: uh * 0.28, borderRadius: 6, background: "#0b0e13", boxShadow: `0 0 ${24 * glow}px rgba(77,212,255,${0.9 * glow})` }} />
          ) : (
            <>
              {Array.from({ length: 6 }).map((__, k) => {
                const on = Math.sin(t * 9 + u * 1.7 + k * 2.3) > 0.1;
                return <div key={k} style={{ width: 9, height: 9, borderRadius: 5, background: on ? (k % 3 ? "#3ddc97" : "#4dd4ff") : "#38414f", boxShadow: on ? "0 0 8px #3ddc97" : undefined }} />;
              })}
              <div style={{ flex: 1 }} />
              <div style={{ width: w * 0.28, height: 8, borderRadius: 4, background: "#323b4b" }} />
            </>
          )}
        </div>
      ))}
    </div>
  );
};

// ── A small flat person (the PC builder), feet at (0,0) ──
export const Builder: React.FC<{ s?: number; look: number; jump: number }> = ({ s = 1, look, jump }) => (
  <svg width={140 * s} height={200 * s} viewBox="-70 -200 140 200" style={{ position: "absolute", left: -70 * s, top: -200 * s, overflow: "visible", transform: `translate(${-jump * 40}px, ${-Math.sin(Math.min(1, jump) * Math.PI) * 30}px)` }}>
    <rect x="-24" y="-58" width="18" height="58" rx="8" fill="#2c3e57" />
    <rect x="6" y="-58" width="18" height="58" rx="8" fill="#2c3e57" />
    <path d="M-34,-120 Q-34,-138 -16,-138 L16,-138 Q34,-138 34,-120 L34,-56 L-34,-56 Z" fill={P.orange} />
    <rect x="-46" y={-132 + jump * 20} width="14" height="54" rx="7" fill={P.orange} transform={`rotate(${20 + jump * 60} -39 -128)`} />
    <rect x="32" y={-132 + jump * 20} width="14" height="54" rx="7" fill={P.orange} transform={`rotate(${-20 - jump * 60} 39 -128)`} />
    <g transform={`rotate(${-look * 18} 0 -150)`}>
      <circle cx="0" cy="-164" r="28" fill="#f2c9a5" />
      <path d="M-28,-170 Q-24,-196 2,-196 Q26,-194 28,-170 Q14,-182 -2,-180 Q-18,-182 -28,-170 Z" fill="#2a2420" />
      <circle cx={-9 + look * 2} cy={-166 - look * 3} r={3 + jump * 2} fill="#2a2420" />
      <circle cx={9 + look * 2} cy={-166 - look * 3} r={3 + jump * 2} fill="#2a2420" />
      {jump > 0.3 ? <ellipse cx="0" cy="-150" rx="5" ry="7" fill="#2a2420" /> : <path d="M-7,-151 Q0,-147 7,-151" stroke="#2a2420" strokeWidth="2.5" fill="none" />}
    </g>
  </svg>
);

// ── The buyer's face for the checkout sample: calm → shocked ──
export const Face: React.FC<{ size: number; shock: number; sweat: number; gaze?: number }> = ({ size, shock, sweat, gaze = 0 }) => (
  <svg width={size} height={size * 1.1} viewBox="-100 -110 200 220" style={{ overflow: "visible" }}>
    <path d="M-70,110 Q-70,40 0,40 Q70,40 70,110 Z" fill="#3a6ea5" />
    <circle cx="0" cy="-20" r="72" fill="#f2c9a5" />
    <path d={`M-74,-24 Q-70,-98 0,-98 Q70,-98 74,-24 Q58,-60 ${10 - shock * 10},-62 Q-40,-66 -74,-24 Z`} fill="#2a2420" />
    <ellipse cx="-26" cy="-22" rx={7 + shock * 6} ry={8 + shock * 9} fill="#fff" />
    <ellipse cx="26" cy="-22" rx={7 + shock * 6} ry={8 + shock * 9} fill="#fff" />
    <circle cx={-26 + gaze * 5} cy="-21" r={5 - shock * 1.5} fill="#2a2420" />
    <circle cx={26 + gaze * 5} cy="-21" r={5 - shock * 1.5} fill="#2a2420" />
    <path d={`M-38,${-44 - shock * 10} L-14,${-40 - shock * 14}`} stroke="#2a2420" strokeWidth="5" strokeLinecap="round" />
    <path d={`M38,${-44 - shock * 10} L14,${-40 - shock * 14}`} stroke="#2a2420" strokeWidth="5" strokeLinecap="round" />
    {shock > 0.3 ? <ellipse cx="0" cy="20" rx={10 + shock * 6} ry={8 + shock * 12} fill="#7a2e22" /> : <path d="M-20,14 Q0,26 20,14" stroke="#7a2e22" strokeWidth="5" fill="none" strokeLinecap="round" />}
    {sweat > 0 ? <path d={`M58,${-40 + sweat * 50} q8,14 0,20 q-8,-6 0,-20 Z`} fill="#7cc6ff" opacity={1 - Math.max(0, sweat - 0.8) * 5} transform={`scale(1.6) translate(-22 ${10})`} /> : null}
  </svg>
);

// ── A mouse pointer ──
export const Pointer: React.FC<{ press: number }> = ({ press }) => (
  <svg width="54" height="64" viewBox="0 0 27 32" style={{ overflow: "visible", transform: `scale(${1 - press * 0.15})`, transformOrigin: "4px 4px" }}>
    <path d="M3,2 L3,26 L9,20 L13,30 L17,28 L13,19 L21,19 Z" fill="#fff" stroke="#19231f" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);
