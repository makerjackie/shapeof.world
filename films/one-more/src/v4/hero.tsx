// Little heroes for the teamfight: chibi figures standing on the map (feet at x, y), a weapon by role, a level badge
// and a health bar. Fallen heroes topple and turn grey. Generic shapes; no real game's characters.
import React from "react";
import { clamp01 } from "../kit";

export type Role = "sword" | "bow" | "staff" | "shield" | "dagger";
const TEAM = {
  blue: { hi: "#7fdcff", lo: "#1f6fd8", hair: "#1b2a4a", cape: "#2747a8", glow: "#5fc8ff" },
  red: { hi: "#ff9aa8", lo: "#c41d3a", hair: "#4a1420", cape: "#8e1530", glow: "#ff5d70" },
};

export const Hero: React.FC<{ x: number; y: number; team: "blue" | "red"; role: Role; hp: number; dead: number; flash?: number; level: number; id: string }> = ({ x, y, team, role, hp, dead, flash = 0, level, id }) => {
  const c = TEAM[team];
  const f = team === "blue" ? 1 : -1; // facing
  const grey = dead > 0.5;
  const body = grey ? "#6b7280" : `url(#hb-${id})`;
  const tilt = 78 * clamp01(dead) * f;
  return (
    <g>
      <defs>
        <linearGradient id={`hb-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={c.hi} />
          <stop offset="100%" stopColor={c.lo} />
        </linearGradient>
      </defs>
      <ellipse cx={x} cy={y + 2} rx={24} ry={8} fill="#000" opacity={0.35} />
      {!grey ? <ellipse cx={x} cy={y + 2} rx={30} ry={11} fill={c.glow} opacity={0.22} /> : null}
      <g transform={`rotate(${tilt} ${x} ${y})`} opacity={grey ? 0.75 : 1}>
        {/* cape */}
        <path d={`M ${x - 12} ${y - 40} L ${x + 12} ${y - 40} L ${x - 4 * f + 16 * -f} ${y - 6} L ${x - 4 * f - 16 * -f} ${y - 6} Z`} fill={grey ? "#4b5260" : c.cape} />
        {/* legs */}
        <rect x={x - 10} y={y - 16} width={8} height={16} rx={3} fill={grey ? "#3c4250" : "#22283a"} />
        <rect x={x + 2} y={y - 16} width={8} height={16} rx={3} fill={grey ? "#3c4250" : "#22283a"} />
        {/* body */}
        <rect x={x - 14} y={y - 42} width={28} height={30} rx={9} fill={body} stroke="#fff" strokeOpacity={0.7} strokeWidth={1.5} />
        <rect x={x - 14} y={y - 22} width={28} height={4} fill={grey ? "#8a8f99" : "#ffd166"} />
        {/* head */}
        <circle cx={x} cy={y - 54} r={12} fill={grey ? "#9aa0aa" : "#f7d6bd"} />
        {role === "shield" ? (
          <path d={`M ${x - 13} ${y - 54} C ${x - 13} ${y - 72}, ${x + 13} ${y - 72}, ${x + 13} ${y - 54} L ${x + 13} ${y - 58} L ${x - 13} ${y - 58} Z`} fill={grey ? "#8a8f99" : "#d8dee9"} />
        ) : (
          <path d={`M ${x - 13} ${y - 53} C ${x - 14} ${y - 70}, ${x + 14} ${y - 70}, ${x + 13} ${y - 53} C ${x + 6 * f} ${y - 60}, ${x - 6 * f} ${y - 60}, ${x - 13} ${y - 53} Z`} fill={grey ? "#5a606b" : c.hair} />
        )}
        <circle cx={x + 5 * f} cy={y - 53} r={1.8} fill="#1a1a1a" />
        {/* weapon */}
        {role === "sword" ? (
          <g>
            <line x1={x + 12 * f} y1={y - 28} x2={x + 38 * f} y2={y - 66} stroke={grey ? "#9aa0aa" : "#eef4ff"} strokeWidth={5} strokeLinecap="round" />
            <line x1={x + 8 * f} y1={y - 34} x2={x + 20 * f} y2={y - 26} stroke="#ffd166" strokeWidth={4} strokeLinecap="round" />
          </g>
        ) : null}
        {role === "bow" ? (
          <g fill="none" strokeLinecap="round">
            <path d={`M ${x + 18 * f} ${y - 64} Q ${x + 34 * f} ${y - 40} ${x + 18 * f} ${y - 16}`} stroke={grey ? "#9aa0aa" : "#c98a4a"} strokeWidth={4} />
            <line x1={x + 18 * f} y1={y - 64} x2={x + 18 * f} y2={y - 16} stroke="#fff" strokeWidth={1.2} opacity={0.8} />
          </g>
        ) : null}
        {role === "staff" ? (
          <g>
            <line x1={x + 16 * f} y1={y - 8} x2={x + 20 * f} y2={y - 72} stroke={grey ? "#7a7f88" : "#8a5a32"} strokeWidth={4} strokeLinecap="round" />
            <circle cx={x + 20 * f} cy={y - 76} r={9} fill={grey ? "#9aa0aa" : c.glow} />
            {!grey ? <circle cx={x + 20 * f} cy={y - 76} r={18} fill={c.glow} opacity={0.35} /> : null}
          </g>
        ) : null}
        {role === "shield" ? <path d={`M ${x + 12 * f} ${y - 44} L ${x + 30 * f} ${y - 44} L ${x + 30 * f} ${y - 24} Q ${x + 21 * f} ${y - 10} ${x + 12 * f} ${y - 24} Z`} fill={grey ? "#8a8f99" : "#e8c36a"} stroke="#fff" strokeWidth={1.5} /> : null}
        {role === "dagger" ? (
          <g stroke={grey ? "#9aa0aa" : "#eef4ff"} strokeWidth={4} strokeLinecap="round">
            <line x1={x + 12 * f} y1={y - 26} x2={x + 28 * f} y2={y - 44} />
            <line x1={x - 12 * f} y1={y - 26} x2={x - 2 * f} y2={y - 46} />
          </g>
        ) : null}
        {flash > 0 ? <ellipse cx={x} cy={y - 34} rx={22} ry={34} fill="#fff" opacity={flash} /> : null}
      </g>
      {/* level badge and health */}
      {!grey ? (
        <g>
          <rect x={x - 28} y={y - 96} width={56} height={9} rx={4.5} fill="#0a0d14" opacity={0.9} />
          <rect x={x - 27} y={y - 95} width={54 * clamp01(hp)} height={7} rx={3.5} fill={team === "blue" ? "#5df08a" : "#ff5d70"} />
          <rect x={x - 42} y={y - 100} width={16} height={16} rx={4} fill={team === "blue" ? "#1f6fd8" : "#c41d3a"} stroke="#fff" strokeWidth={1.2} />
          <path d={`M ${x - 38} ${y - 90} L ${x - 34} ${y - 95} L ${x - 30} ${y - 90} M ${x - 38} ${y - 86} L ${x - 34} ${y - 91} L ${x - 30} ${y - 86}`} stroke="#fff" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.6 + 0.4 * Math.min(1, level / 15)} />
        </g>
      ) : null}
    </g>
  );
};
