import React from "react";
import { K } from "../theme";

// Flat people for the scenes: 3 px ink outlines, flat fills, no faces beyond an eye and a mouth line.
const L = { stroke: K.ink, strokeWidth: 3, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

// A seated person in profile facing right, drawn in a 320 × 440 box with the seat at y = 300.
// tilt: head angle (positive looks down); arm: 0 = hands on the keyboard in front, 1 = hands resting;
// type: −1…1 small finger motion; coat/shirt colours make the doctor; glasses optional.
export const SeatedRight: React.FC<{
  tilt?: number;
  arm?: number;
  type?: number;
  coat?: string;
  shirt?: string;
  hair?: string;
  skin?: string;
  steth?: boolean;
  glasses?: boolean;
  smile?: number;
  style?: React.CSSProperties;
}> = ({ tilt = 0, arm = 0, type = 0, coat = K.coat, shirt = "#9db7c9", hair = K.hair, skin = K.skin, steth = false, glasses = false, smile = 0, style }) => {
  const hx = 150;
  const hy = 92;
  const reach = 1 - arm; // 1 = forward to the keyboard
  const handX = 150 + 120 * reach + type * 4;
  const handY = 226 + 30 * arm;
  return (
    <svg width={320} height={440} viewBox="0 0 320 440" style={{ overflow: "visible", ...style }}>
      {/* chair */}
      <rect x={70} y={300} width={140} height={18} rx={6} fill="#8a6b4c" {...L} />
      <path d="M90 318 L84 430 M190 318 L198 430" {...L} fill="none" />
      <path d="M70 300 L56 180" {...L} fill="none" strokeWidth={6} />
      {/* legs */}
      <path d={`M110 300 L230 302 L232 408`} fill="none" stroke={K.ink} strokeWidth={36} strokeLinecap="round" strokeLinejoin="round" />
      <path d={`M110 300 L230 302 L232 408`} fill="none" stroke="#3b4a5c" strokeWidth={30} strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx={246} cy={420} rx={26} ry={10} fill="#2a2f35" {...L} />
      {/* torso */}
      <path d="M100 150 C 96 210, 100 270, 112 304 L 214 304 C 222 262, 214 196, 196 150 Z" fill={coat} {...L} />
      <path d="M150 152 L 150 300" stroke={K.ink} strokeWidth={2} opacity={0.35} />
      <path d="M150 152 L 132 196 M150 152 L 168 196" stroke={K.ink} strokeWidth={2.5} fill="none" />
      <path d="M134 154 L 150 176 L 166 154 Z" fill={shirt} {...L} />
      {steth ? <path d="M132 160 C 120 210, 150 230, 170 210 C 182 196, 178 170, 168 160" fill="none" stroke="#31373c" strokeWidth={5} strokeLinecap="round" /> : null}
      {steth ? <circle cx={170} cy={214} r={8} fill="#c9cfd4" {...L} /> : null}
      {/* arm */}
      <path d={`M160 168 C 150 208, 150 222, ${handX - 34} ${handY - 4}`} fill="none" stroke={K.ink} strokeWidth={36} strokeLinecap="round" />
      <path d={`M160 168 C 150 208, 150 222, ${handX - 34} ${handY - 4}`} fill="none" stroke={coat} strokeWidth={30} strokeLinecap="round" />
      <circle cx={handX - 18} cy={handY - 2} r={13} fill={skin} {...L} />
      {/* head */}
      <g transform={`rotate(${tilt} ${hx} ${hy + 40})`}>
        <rect x={hx - 14} y={hy + 30} width={28} height={30} fill={skin} {...L} />
        <circle cx={hx} cy={hy} r={44} fill={skin} {...L} />
        <path d={`M${hx - 46} ${hy - 4} C ${hx - 46} ${hy - 58}, ${hx + 40} ${hy - 62}, ${hx + 44} ${hy - 12} C ${hx + 20} ${hy - 30}, ${hx - 10} ${hy - 24}, ${hx - 14} ${hy + 6} C ${hx - 26} ${hy + 4}, ${hx - 40} ${hy + 14}, ${hx - 46} ${hy - 4} Z`} fill={hair} {...L} />
        <circle cx={hx + 26} cy={hy + 2} r={4.5} fill={K.ink} />
        {glasses ? <rect x={hx + 14} y={hy - 9} width={26} height={20} rx={6} fill="none" stroke={K.ink} strokeWidth={3} /> : null}
        <path d={`M${hx + 22} ${hy + 24} Q ${hx + 30} ${hy + 26 + smile * 6} ${hx + 38} ${hy + 22}`} fill="none" stroke={K.ink} strokeWidth={3} strokeLinecap="round" />
        <path d={`M${hx + 42} ${hy + 4} L ${hx + 50} ${hy + 14} L ${hx + 42} ${hy + 16}`} fill={skin} stroke={K.ink} strokeWidth={3} strokeLinejoin="round" />
      </g>
    </svg>
  );
};

// The same person mirrored to face left (the patient across the desk).
export const SeatedLeft: React.FC<React.ComponentProps<typeof SeatedRight>> = ({ style, ...p }) => (
  <div style={{ ...style, transform: `${style?.transform ?? ""} scaleX(-1)` }}>
    <SeatedRight {...p} />
  </div>
);
