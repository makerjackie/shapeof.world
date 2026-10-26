// v4 phone: the device in world units (button at the origin, screen x −555…555, y −410…110) with its screen as an HTML
// layer, so the screen can hold a whole scene and the camera can pull back from full screen to the phone in the dark.
import React from "react";
import { Cam, camG, w2s } from "../cam";
import { K } from "../theme";

export const SCR = { x: -555, y: -410, w: 1110, h: 520, r: 40 };
export const BTN_R = 70;
const THUMB = "M -62 0 C -62 -86, 62 -86, 62 0 L 74 900 L -74 900 Z";

// The device body under the screen.
export const PhoneBody: React.FC<{ cam: Cam; o: number }> = ({ cam, o }) =>
  o <= 0 ? null : (
    <g transform={camG(cam)} opacity={o}>
      <defs>
        <linearGradient id="p4-edge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#9aa6bd" />
          <stop offset="18%" stopColor="#2a303d" />
          <stop offset="60%" stopColor="#151922" />
          <stop offset="100%" stopColor="#5a6478" />
        </linearGradient>
        <radialGradient id="p4-spill">
          <stop offset="0%" stopColor="#4a86d0" stopOpacity={0.5} />
          <stop offset="60%" stopColor="#4a86d0" stopOpacity={0.08} />
          <stop offset="100%" stopColor="#4a86d0" stopOpacity={0} />
        </radialGradient>
      </defs>
      <ellipse cx={0} cy={-150} rx={1150} ry={760} fill="url(#p4-spill)" />
      <rect x={-600} y={-445} width={1200} height={590} rx={78} fill="#07090e" stroke="url(#p4-edge)" strokeWidth={6} />
      <circle cx={566} cy={-150} r={9} fill="#11151d" stroke="#2a303d" strokeWidth={2} />
    </g>
  );

// Two hands holding the phone sideways, in silhouette, rim-lit by the screen: drawn before the body so only what is
// outside the phone shows (the heels of the palms, the index fingertips on the top edge).
const RIGHT_HAND = "M 520 -330 C 630 -370, 740 -290, 760 -110 C 780 60, 770 280, 720 640 L 330 640 C 360 440, 400 260, 480 150 Z";
const LEFT_HAND = "M -520 -330 C -630 -370, -740 -290, -760 -110 C -780 60, -770 280, -720 640 L -330 640 C -360 440, -400 260, -480 150 Z";
export const Hands: React.FC<{ cam: Cam; o: number }> = ({ cam, o }) =>
  o <= 0 ? null : (
    <g transform={camG(cam)} opacity={o}>
      <defs>
        <linearGradient id="h4-skin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2c2328" />
          <stop offset="40%" stopColor="#17121a" />
          <stop offset="100%" stopColor="#07060a" />
        </linearGradient>
      </defs>
      {[RIGHT_HAND, LEFT_HAND].map((d, i) => (
        <g key={i}>
          <path d={d} fill="url(#h4-skin)" />
          <path d={d} fill="none" stroke="#a9c8ff" strokeOpacity={0.28} strokeWidth={4} />
        </g>
      ))}
      {[-470, 470].map((x) => (
        <g key={x}>
          <rect x={x - 46} y={-492} width={92} height={70} rx={34} fill="url(#h4-skin)" />
          <rect x={x - 46} y={-492} width={92} height={70} rx={34} fill="none" stroke="#a9c8ff" strokeOpacity={0.3} strokeWidth={3} />
          <rect x={x - 24} y={-486} width={48} height={30} rx={14} fill="#3a3038" opacity={0.6} />
        </g>
      ))}
    </g>
  );

// The screen: children are laid out in screen pixels (1110 × 520), clipped to the rounded screen.
export const PhoneScreen: React.FC<{ cam: Cam; o?: number; children: React.ReactNode }> = ({ cam, o = 1, children }) => {
  const [sx, sy] = w2s(cam, SCR.x, SCR.y);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: SCR.w, height: SCR.h, transform: `translate(${sx}px, ${sy}px) scale(${cam.z})`, transformOrigin: "0 0", borderRadius: SCR.r, overflow: "hidden", opacity: o, background: "#0b1324" }}>
      {children}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(115deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 34%, rgba(255,255,255,0) 35%)", pointerEvents: "none" }} />
    </div>
  );
};

// The round 再来一局 button, its heartbeat glow, ripples and the thumb, drawn above the screen.
export const PhoneTop: React.FC<{
  cam: Cam;
  btn: number;
  beatPhase: number;
  press?: number;
  hole?: number;
  ripples?: { r: number; o: number; c: string }[];
  thumb?: { x: number; y: number; s: number; o: number };
  leftThumb?: number; // the left thumb resting on the screen (0..1)
}> = ({ cam, btn, beatPhase, press = 0, hole = 0, ripples = [], thumb, leftThumb = 0 }) => {
  const glow = 0.45 + 0.55 * Math.exp(-beatPhase * 5);
  return (
    <g transform={camG(cam)}>
      <defs>
        <radialGradient id="p4-btn" cx="0.42" cy="0.34" r="0.78">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#ffe6f0" />
          <stop offset="100%" stopColor="#f2a9c9" />
        </radialGradient>
      </defs>
      {btn > 0 ? (
        <g opacity={btn} transform={`scale(${1 - 0.08 * press})`}>
          <circle cx={0} cy={0} r={BTN_R + 50} fill={K.want} opacity={0.07 * glow} />
          <circle cx={0} cy={0} r={BTN_R + 24} fill={K.want} opacity={0.16 * glow} />
          <circle cx={0} cy={0} r={BTN_R + 7} fill="none" stroke={K.want} strokeWidth={5} opacity={0.5 + 0.5 * glow} />
          <circle cx={0} cy={4} r={BTN_R} fill="#b85a85" />
          <circle cx={0} cy={0} r={BTN_R} fill="url(#p4-btn)" />
          <ellipse cx={-14} cy={-30} rx={38} ry={18} fill="#fff" opacity={0.45} />
          {hole > 0 ? <circle cx={0} cy={0} r={BTN_R * 0.94 * hole} fill="#020306" /> : null}
        </g>
      ) : null}
      {ripples.map((rp, i) => (
        <circle key={i} cx={0} cy={0} r={rp.r} fill="none" stroke={rp.c} strokeWidth={3} opacity={rp.o} />
      ))}
      {leftThumb > 0 ? (
        <g opacity={leftThumb} transform="translate(-468 12) rotate(34)">
          <path d={THUMB} transform="translate(-20 34)" fill="#000" opacity={0.35} />
          <path d={THUMB} fill="#130f13" opacity={0.95} />
          <path d={THUMB} fill="none" stroke="#ffd2bf" strokeOpacity={0.45} strokeWidth={3} />
          <rect x={-36} y={-40} width={72} height={88} rx={32} fill="#2b2329" stroke="#ffd2bf" strokeOpacity={0.24} strokeWidth={2} />
        </g>
      ) : null}
      {thumb && thumb.o > 0 ? (
        <g opacity={thumb.o} transform={`translate(${thumb.x} ${thumb.y}) rotate(-34) scale(${thumb.s})`}>
          <path d={THUMB} transform="translate(20 34)" fill="#000" opacity={0.35} />
          <path d={THUMB} fill="#130f13" opacity={0.95} />
          <path d={THUMB} fill="none" stroke="#ffd2bf" strokeOpacity={0.45} strokeWidth={3} />
          <rect x={-36} y={-40} width={72} height={88} rx={32} fill="#2b2329" stroke="#ffd2bf" strokeOpacity={0.24} strokeWidth={2} />
        </g>
      ) : null}
    </g>
  );
};
