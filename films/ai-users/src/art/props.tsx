import React from "react";
import { K } from "../theme";

// Flat vector props in the film's style: 3 px ink outline, flat fills, one soft cast shadow.
const LINE = { stroke: K.ink, strokeWidth: 3, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

// The question-setter's fountain pen: black barrel, gold clip and nib. Drawn pointing right, 300 × 46.
export const FountainPen: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <svg width={300} height={60} viewBox="0 0 300 60" style={{ overflow: "visible", ...style }}>
    <ellipse cx={150} cy={50} rx={130} ry={7} fill="rgba(70,45,15,0.18)" />
    <path d="M14 20 h170 l18 4 v14 l-18 4 h-170 a11 11 0 0 1 0 -22 z" fill="#1d2326" {...LINE} />
    <rect x={56} y={20} width={10} height={22} fill="#2f383c" />
    <path d="M202 24 L262 31 L202 38 z" fill="#d9b25a" {...LINE} />
    <path d="M216 31 L250 31" stroke={K.ink} strokeWidth={2} />
    <path d="M30 16 h70 a4 4 0 0 1 0 8 h-70 z" fill="#d9b25a" {...LINE} />
    <rect x={150} y={20} width={8} height={22} fill="#d9b25a" opacity={0.9} />
  </svg>
);

// The grader's pen: dark green barrel, green ink. Drawn pointing down-left, nib at (12, 168) of a 180 × 180 box.
export const GradingPen: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <svg width={180} height={180} viewBox="0 0 180 180" style={{ overflow: "visible", ...style }}>
    <g transform="rotate(-45 90 90)">
      <rect x={70} y={-30} width={26} height={150} rx={8} fill="#2e5d47" {...LINE} />
      <rect x={70} y={-30} width={26} height={34} rx={8} fill="#244a38" {...LINE} />
      <rect x={93} y={-24} width={7} height={52} rx={3} fill="#c9cfc8" stroke={K.ink} strokeWidth={2} />
      <path d="M72 120 L83 160 L94 120 z" fill="#e8e1d0" {...LINE} />
      <path d="M80 150 L83 162 L86 150 z" fill={K.green} />
    </g>
  </svg>
);
