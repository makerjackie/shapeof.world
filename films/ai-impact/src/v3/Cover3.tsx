import React from "react";
import { AbsoluteFill } from "remotion";
import { Bar } from "../Cover";
import { FONT } from "../theme";

// v3 covers (DIRECTOR 三): brand bar, the sentence the user chose, and a picture drawn for the cover: a kid in his
// door frame with slow, even pencil marks stares across at the AI frame, whose marks burst through the lintel.

const GOLD = "#ffd166";
const CYAN = "#4dd4ff";
const PAPER = "#f4f0e8";
const SKIN = "#f1c7a0";
const HAIR = "#2b2320";

type Lay = { W: number; H: number; bar: number; floor: number; fh: number; fw: number; hx: number; ax: number; kid: number };

const Kid: React.FC<{ cx: number; floor: number; h: number }> = ({ cx, floor, h }) => {
  const s = h / 200;
  return (
    <g transform={`translate(${cx - 50 * s}, ${floor - h}) scale(${s})`}>
      <ellipse cx={38} cy={196} rx={13} ry={5} fill="#1d2230" />
      <ellipse cx={62} cy={196} rx={13} ry={5} fill="#1d2230" />
      <rect x={31} y={138} width={15} height={58} rx={6} fill="#34456b" />
      <rect x={54} y={138} width={15} height={58} rx={6} fill="#34456b" />
      <rect x={13} y={90} width={13} height={50} rx={6.5} fill={GOLD} />
      <rect x={74} y={90} width={13} height={50} rx={6.5} fill={GOLD} />
      <circle cx={19.5} cy={143} r={6} fill={SKIN} />
      <circle cx={80.5} cy={143} r={6} fill={SKIN} />
      <rect x={24} y={84} width={52} height={64} rx={16} fill={GOLD} />
      {/* head tilted back toward the AI frame, eyes up and to the right, mouth open */}
      <g transform="rotate(7 50 82)">
        <circle cx={18} cy={54} r={6} fill={SKIN} />
        <circle cx={82} cy={54} r={6} fill={SKIN} />
        <circle cx={50} cy={50} r={32} fill={SKIN} />
        <path d="M18,50 C18,22 34,12 50,12 C70,12 84,24 82,48 C74,36 62,30 50,32 C40,33 30,38 18,50 Z" fill={HAIR} />
        <path d="M35,37 Q41,31 47,36" stroke={HAIR} strokeWidth={2.8} fill="none" strokeLinecap="round" />
        <path d="M55,35 Q61,29 67,34" stroke={HAIR} strokeWidth={2.8} fill="none" strokeLinecap="round" />
        <ellipse cx={42} cy={50} rx={7} ry={8.5} fill="#fff" />
        <ellipse cx={62} cy={50} rx={7} ry={8.5} fill="#fff" />
        <circle cx={44.6} cy={46.4} r={4.3} fill="#1b1b1f" />
        <circle cx={64.6} cy={46.4} r={4.3} fill="#1b1b1f" />
        <circle cx={45.8} cy={45.1} r={1.4} fill="#fff" />
        <circle cx={65.8} cy={45.1} r={1.4} fill="#fff" />
        <circle cx={31} cy={62} r={5} fill="#f28c8c" opacity={0.45} />
        <circle cx={71} cy={62} r={5} fill="#f28c8c" opacity={0.45} />
        <ellipse cx={55} cy={68} rx={4.2} ry={5.4} fill="#7a2e2e" />
      </g>
    </g>
  );
};

const Frame: React.FC<{ x: number; floor: number; w: number; h: number; wood: [string, string]; id: string; crack?: boolean }> = ({ x, floor, w, h, wood, id, crack }) => {
  const k = w / 300;
  const J = 34 * k;
  const L = 42 * k;
  const top = floor - h;
  const beam = (x0: number, x1: number) => <rect x={x0} y={top} width={x1 - x0} height={L} rx={4 * k} fill={`url(#${id})`} />;
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={wood[0]} />
          <stop offset="100%" stopColor={wood[1]} />
        </linearGradient>
      </defs>
      <rect x={x} y={top + L} width={J} height={h - L} fill={`url(#${id})`} />
      <rect x={x + w - J} y={top + L} width={J} height={h - L} fill={`url(#${id})`} />
      {crack ? (
        <>
          <g transform={`rotate(-13 ${x - 12 * k} ${top + L})`}>{beam(x - 12 * k, x + w / 2 - 10 * k)}</g>
          <g transform={`rotate(13 ${x + w + 12 * k} ${top + L})`}>{beam(x + w / 2 + 10 * k, x + w + 12 * k)}</g>
          {[
            [-34, -70, 14, 20],
            [26, -96, 10, 25],
            [-10, -132, 9, -15],
            [44, -40, 12, 40],
            [-58, -30, 8, -30],
          ].map(([dx, dy, s, r], i) => (
            <rect key={i} x={x + w / 2 + dx * k} y={top + dy * k} width={s * k} height={s * k * 0.7} fill={wood[1]} transform={`rotate(${r} ${x + w / 2 + dx * k} ${top + dy * k})`} />
          ))}
        </>
      ) : (
        beam(x - 12 * k, x + w + 12 * k)
      )}
    </g>
  );
};

const Picture: React.FC<{ l: Lay }> = ({ l }) => {
  const { floor, fh, fw, hx, ax, kid, bar } = l;
  const k = fw / 300;
  const top = floor - fh;
  const inner = fh - 42 * k;
  const J = 34 * k;
  // the AI marks: each step further apart, then out through the top
  const aiIn = [0.06, 0.12, 0.21, 0.35, 0.56, 0.86].map((f) => floor - f * inner);
  const aiOut = [top - (top - bar) * 0.3, top - (top - bar) * 0.68];
  // the kid's marks: even, slow, the last one right on top of his head
  const huMarks = [0.42, 0.53, 0.64, 0.74, 0.83, 0.92, 1].map((f) => floor - f * kid);
  const pencil = fw / 2 - J + 14;
  return (
    <svg width={l.W} height={l.H} style={{ position: "absolute", left: 0, top: 0 }}>
      <defs>
        <radialGradient id="aiGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={CYAN} stopOpacity={0.32} />
          <stop offset="100%" stopColor={CYAN} stopOpacity={0} />
        </radialGradient>
        <radialGradient id="huGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={GOLD} stopOpacity={0.2} />
          <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
        </radialGradient>
        <linearGradient id="beamUp" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={CYAN} stopOpacity={0.9} />
          <stop offset="100%" stopColor={CYAN} stopOpacity={0} />
        </linearGradient>
        <linearGradient id="aiDoor" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={CYAN} stopOpacity={0.05} />
          <stop offset="100%" stopColor={CYAN} stopOpacity={0.22} />
        </linearGradient>
        <linearGradient id="huDoor" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={GOLD} stopOpacity={0.16} />
          <stop offset="100%" stopColor={GOLD} stopOpacity={0.03} />
        </linearGradient>
      </defs>
      <ellipse cx={ax + fw / 2} cy={top + 40 * k} rx={fw * 1.3} ry={fh * 0.75} fill="url(#aiGlow)" />
      <ellipse cx={hx + fw / 2} cy={floor - kid * 0.6} rx={fw * 1.1} ry={kid * 0.9} fill="url(#huGlow)" />
      <line x1={0} x2={l.W} y1={floor} y2={floor} stroke="rgba(244,240,232,0.14)" strokeWidth={3} />
      {/* human frame, kid, pencil marks and the pencil on his head */}
      <rect x={hx + J} y={top + 42 * k} width={fw - 2 * J} height={inner} fill="url(#huDoor)" />
      <Frame x={hx} floor={floor} w={fw} h={fh} wood={["#ead6ae", "#c8ad7c"]} id="huWood" />
      {huMarks.map((y, i) => (
        <line key={i} x1={hx + fw - J - 16 * k} x2={hx + fw - 3 * k} y1={y} y2={y} stroke="#3b3631" strokeWidth={5 * k} strokeLinecap="round" opacity={0.55 + 0.45 * (i / (huMarks.length - 1))} />
      ))}
      <Kid cx={hx + fw / 2 - 18 * k} floor={floor} h={kid} />
      <g transform={`translate(${hx + fw / 2 - 30 * k}, ${floor - kid - 9 * k})`}>
        <rect x={0} y={0} width={pencil} height={14 * k} rx={3 * k} fill="#f2a93b" />
        <rect x={0} y={0} width={14 * k} height={14 * k} rx={3 * k} fill="#e86f6f" />
        <polygon points={`${pencil},0 ${pencil + 22 * k},${7 * k} ${pencil},${14 * k}`} fill="#e9cfa2" />
        <polygon points={`${pencil + 14 * k},${3 * k} ${pencil + 22 * k},${7 * k} ${pencil + 14 * k},${11 * k}`} fill="#3b3631" />
      </g>
      {/* AI frame: marks spread apart, break the lintel and keep going */}
      <rect x={ax + J} y={top + 42 * k} width={fw - 2 * J} height={inner} fill="url(#aiDoor)" />
      <rect x={ax + fw / 2 - 7 * k} y={bar + 24} width={14 * k} height={top + 60 * k - bar - 24} fill="url(#beamUp)" />
      <polygon points={`${ax + fw / 2 - 30 * k},${bar + 70} ${ax + fw / 2},${bar + 24} ${ax + fw / 2 + 30 * k},${bar + 70}`} fill={CYAN} opacity={0.9} />
      <Frame x={ax} floor={floor} w={fw} h={fh} wood={["#b9c6d6", "#7f90a8"]} id="aiWood" crack />
      <g style={{ filter: `drop-shadow(0 0 ${10 * k}px ${CYAN})` }}>
        {/* height marks on the jamb facing the kid (not rungs across the doorway, which read as a ladder) */}
        {aiIn.map((y, i) => (
          <line key={i} x1={ax + 3 * k} x2={ax + J + 64 * k} y1={y} y2={y} stroke={CYAN} strokeWidth={(5 + i * 0.8) * k} strokeLinecap="round" />
        ))}
        {aiOut.map((y, i) => (
          <line key={i} x1={ax + fw / 2 - (56 + 14 * i) * k} x2={ax + fw / 2 + (56 + 14 * i) * k} y1={y} y2={y} stroke={CYAN} strokeWidth={(10 + 3 * i) * k} strokeLinecap="round" />
        ))}
      </g>
    </svg>
  );
};

const Big: React.FC<{ size: number; children: React.ReactNode }> = ({ size, children }) => (
  <div style={{ fontFamily: FONT, fontSize: size, fontWeight: 900, color: PAPER, lineHeight: 1.06, letterSpacing: -size * 0.02, whiteSpace: "nowrap", textShadow: "0 8px 40px rgba(0,0,0,0.7)" }}>{children}</div>
);
const KW: React.FC<{ children: React.ReactNode }> = ({ children }) => <span style={{ color: GOLD }}>{children}</span>;

export const Cover3: React.FC<{ tall: boolean }> = ({ tall }) => {
  const l: Lay = tall
    ? { W: 1080, H: 1440, bar: 100, floor: 880, fh: 520, fw: 290, hx: 90, ax: 660, kid: 330 }
    : { W: 1920, H: 1080, bar: 76, floor: 1040, fh: 540, fw: 300, hx: 470, ax: 1420, kid: 340 };
  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 70% 30%, #12202b 0%, #0a0c10 55%, #07090b 100%)" }}>
      <Picture l={l} />
      <Bar h={l.bar} w={l.W} />
      {tall ? (
        <div style={{ position: "absolute", left: 72, top: 935 }}>
          <Big size={140}>ChatGPT</Big>
          <Big size={140}>四岁了，</Big>
          <Big size={128}>
            世界<KW>变了什么</KW>？
          </Big>
        </div>
      ) : (
        <div style={{ position: "absolute", left: 96, top: 128 }}>
          <Big size={140}>ChatGPT 四岁了，</Big>
          <Big size={176}>
            世界<KW>变了什么</KW>？
          </Big>
        </div>
      )}
    </AbsoluteFill>
  );
};
