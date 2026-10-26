// The phone on the night table: a finished match, "失败", and the round 再来一局 button that the whole film turns on.
// World units; the button sits at the origin.
import React from "react";
import { Cam, camG, w2s } from "./cam";
import { clamp01, Glow, star } from "./kit";
import { FONT, HAN, K, NUM } from "./theme";

export const PHONE = { x: 0, y: -150, w: 1180, h: 580, r: 72 };
export const BTN_R = 68;

export type PhoneState = {
  o: number; // whole phone
  ui: number; // screen UI (everything but the button)
  stamp: number; // 0..1 "失败" lands
  beat: number; // 0..1 phase within the current beat, for the button's heartbeat glow
  lit: number; // stars lit on the result screen
  touch?: { x: number; y: number; s: number; o: number };
  ripples?: { r: number; o: number; c: string }[];
  btnO?: number;
  labelO?: number; // the button's own 再来一局 (hidden under the title and in the fall)
  hole?: number; // 0..1 the button's centre opens into a dark hole (the fall into chapter 2)
};

export const PhoneSvg: React.FC<{ cam: Cam; s: PhoneState }> = ({ cam, s }) => {
  if (s.o <= 0) return null;
  const { x, y, w, h, r } = PHONE;
  const glow = 0.45 + 0.55 * Math.exp(-s.beat * 5);
  const btnO = s.btnO ?? 1;
  return (
    <g transform={camG(cam)} opacity={s.o}>
      <defs>
        <linearGradient id="ph-scr" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#13213a" />
          <stop offset="60%" stopColor="#0b1324" />
          <stop offset="100%" stopColor="#080d18" />
        </linearGradient>
        <radialGradient id="ph-btn" cx="0.42" cy="0.36" r="0.75">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#ffe3ef" />
          <stop offset="100%" stopColor="#f5b6d2" />
        </radialGradient>
        <linearGradient id="ph-edge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4a5468" />
          <stop offset="50%" stopColor="#1a1f2a" />
          <stop offset="100%" stopColor="#3a4255" />
        </linearGradient>
      </defs>
      {/* light the phone throws on the table */}
      <Glow id="ph-spill" x={x} y={y + 40} r={980} color="#3a6bb0" o={0.22 * s.ui} />
      <g opacity={s.ui}>
        <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={r} fill="#07090e" stroke="url(#ph-edge)" strokeWidth={4} />
        <rect x={x - w / 2 + 34} y={y - h / 2 + 30} width={w - 68} height={h - 60} rx={40} fill="url(#ph-scr)" />
        {/* faint diagonal texture of a game map behind the result panel */}
        {Array.from({ length: 22 }, (_, i) => (
          <line key={i} x1={x - w / 2 + 40 + i * 56} y1={y - h / 2 + 34} x2={x - w / 2 + 40 + i * 56 - 260} y2={y + h / 2 - 34} stroke="#6fd6ff" strokeOpacity={0.035} strokeWidth={2} />
        ))}
        <line x1={x - 330} x2={x + 330} y1={y - 38} y2={y - 38} stroke="#cfd5e2" strokeOpacity={0.18} strokeWidth={2} />
        {/* stars on the result screen */}
        {Array.from({ length: 5 }, (_, i) => {
          const sx = x - 140 + i * 70;
          const on = i < s.lit;
          return <path key={i} d={star(sx, y - 2, 22)} fill={on ? K.cyan : "none"} stroke={on ? K.cyanHi : "#5a6378"} strokeWidth={2.5} opacity={on ? 0.95 : 0.8} />;
        })}
        {/* the two teams of five, down both sides of the result panel */}
        {Array.from({ length: 10 }, (_, i) => {
          const left = i < 5;
          const px = left ? x - 470 : x + 470;
          const py = y - 190 + (i % 5) * 62;
          const me = i === 2;
          return (
            <g key={`tm${i}`}>
              <circle cx={px} cy={py} r={24} fill={left ? "#16324a" : "#2a2232"} stroke={me ? K.cyanHi : left ? "#3d7ea6" : "#6b4a5e"} strokeWidth={me ? 3.5 : 2} />
              <circle cx={px} cy={py - 6} r={8} fill={left ? "#7fb6d6" : "#a88a9c"} opacity={0.8} />
              <path d={`M ${px - 13} ${py + 15} Q ${px} ${py - 2} ${px + 13} ${py + 15}`} fill={left ? "#7fb6d6" : "#a88a9c"} opacity={0.8} />
              <rect x={left ? px + 34 : px - 34 - 64} y={py - 4} width={64} height={8} rx={4} fill={left ? "#3d7ea6" : "#6b4a5e"} opacity={0.55} />
            </g>
          );
        })}
        {/* the small way out */}
        <rect x={-470 + 90} y={-28} width={170} height={56} rx={28} fill="none" stroke="#5a6378" strokeWidth={2} />
      </g>
      {/* the button: heartbeat glow on every beat */}
      <g opacity={btnO}>
        <circle cx={0} cy={0} r={BTN_R + 46} fill={K.want} opacity={0.06 * glow} />
        <circle cx={0} cy={0} r={BTN_R + 22} fill={K.want} opacity={0.14 * glow} />
        <circle cx={0} cy={0} r={BTN_R + 6} fill="none" stroke={K.want} strokeWidth={5} opacity={0.5 + 0.5 * glow} />
        <circle cx={0} cy={0} r={BTN_R} fill="url(#ph-btn)" />
        {s.hole ? <circle cx={0} cy={0} r={BTN_R * 0.94 * s.hole} fill="#020306" /> : null}
      </g>
      {(s.ripples ?? []).map((rp, i) => (
        <circle key={i} cx={0} cy={0} r={rp.r} fill="none" stroke={rp.c} strokeWidth={3} opacity={rp.o} />
      ))}
      {s.touch && s.touch.o > 0 ? (
        <g opacity={s.touch.o}>
          <defs>
            <radialGradient id="ph-touch">
              <stop offset="0%" stopColor="#fff6f0" stopOpacity={0.85} />
              <stop offset="60%" stopColor="#ffd8c8" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#ffd8c8" stopOpacity={0} />
            </radialGradient>
          </defs>
          <ellipse cx={s.touch.x + 18} cy={s.touch.y + 24} rx={74 * s.touch.s} ry={86 * s.touch.s} fill="#000" opacity={0.25} />
          <ellipse cx={s.touch.x} cy={s.touch.y} rx={70 * s.touch.s} ry={82 * s.touch.s} fill="url(#ph-touch)" />
          <ellipse cx={s.touch.x} cy={s.touch.y} rx={44 * s.touch.s} ry={54 * s.touch.s} fill="none" stroke="#fff3ea" strokeOpacity={0.45} strokeWidth={2.5} />
        </g>
      ) : null}
    </g>
  );
};

// Type on the phone, projected through the camera.
export const PhoneHtml: React.FC<{ cam: Cam; s: PhoneState }> = ({ cam, s }) => {
  if (s.o <= 0) return null;
  const z = cam.z;
  const at = (wx: number, wy: number, size: number, style: React.CSSProperties, text: React.ReactNode, key: string) => {
    const [sx, sy] = w2s(cam, wx, wy);
    return (
      <div key={key} style={{ position: "absolute", left: sx, top: sy, transform: "translate(-50%, -50%)", fontSize: size * z, whiteSpace: "nowrap", lineHeight: 1, ...style }}>
        {text}
      </div>
    );
  };
  const st = clamp01(s.stamp);
  const btnO = s.btnO ?? 1;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: s.o }}>
      <div style={{ opacity: s.ui }}>
        {at(0, -250, 132, { fontFamily: HAN, fontWeight: 900, letterSpacing: 0.3 * 132 * z, color: "#d6dbe6", opacity: st, transform: `translate(-50%, -50%) scale(${1.35 - 0.35 * st})` }, "失败", "lose")}
        {at(0, -100, 28, { fontFamily: FONT, fontWeight: 600, color: "rgba(214,219,230,0.6)", letterSpacing: 2 * z }, <>本局用时 <span style={{ fontFamily: NUM }}>18:42</span></>, "time")}
        {at(-295, 0, 25, { fontFamily: HAN, fontWeight: 700, color: "#7d879c" }, "返回大厅", "home")}
      </div>
      {at(0, 0, 27, { fontFamily: HAN, fontWeight: 900, color: K.ink, opacity: btnO * (s.labelO ?? 1) }, "再来一局", "again")}
    </div>
  );
};
