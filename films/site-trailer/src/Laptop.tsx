import React from "react";
import { AbsoluteFill } from "remotion";
import { MONO } from "./theme";

// A generic laptop on a dark set, drawn in CSS (no brand). The screen shows a browser: a thin bar with the address
// and a 16:9 page area. The page area is the film's frame: at camera s = FULL, cx = 960, cy = 540 it fills the
// 1920×1080 frame exactly, so a push-in can land on a full-frame shot and a pull-back can start from one.
// Layout is in composition pixels with the page area centred on (960, 500).
export const CW = 1040;
export const CH = 585;
export const FULL = 1920 / CW;
const BAR = 40;
const BEZ = 16;
const OX = 960;
const OY = 500;
const PL = OX - CW / 2;
const PT = OY - CH / 2;
const LID = { left: PL - BEZ, top: PT - BAR - BEZ, width: CW + 2 * BEZ, height: CH + BAR + 2 * BEZ };
const LID_BOTTOM = LID.top + LID.height;

export type Cam = { s: number; cx: number; cy: number; ry?: number; glare?: number };

const Browser: React.FC<{ glare: number }> = ({ glare }) => (
  <div style={{ position: "absolute", left: PL, top: PT - BAR, width: CW, height: BAR, background: "linear-gradient(#202227, #1a1c20)", borderBottom: "1px solid rgba(255,255,255,0.06)", opacity: 0.4 + 0.6 * glare }}>
    <div style={{ position: "absolute", left: 18, top: 15, display: "flex", gap: 8 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ width: 10, height: 10, borderRadius: 5, background: "#3b3e44" }} />
      ))}
    </div>
    <div style={{ position: "absolute", left: CW / 2 - 200, top: 8, width: 400, height: 24, borderRadius: 12, background: "#111215", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
      <svg width="9" height="11" viewBox="0 0 9 11">
        <rect x="0.5" y="4.5" width="8" height="6" rx="1.2" fill="#8a8a85" />
        <path d="M2.2 4.6 V3.2 a2.3 2.3 0 0 1 4.6 0 V4.6" stroke="#8a8a85" strokeWidth="1.2" fill="none" />
      </svg>
      <span style={{ fontFamily: MONO, fontSize: 13, letterSpacing: 0.5, color: "#cfcfca" }}>shapeof.world</span>
    </div>
  </div>
);

// The set: a dark studio with a soft key light from above and a floor that catches the screen's glow.
const Set: React.FC<{ s: number }> = ({ s }) => (
  <AbsoluteFill style={{ transform: `scale(${1 + (s - 1) * 0.25})`, transformOrigin: "50% 60%" }}>
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 70% 60% at 50% 42%, #1b2029 0%, #0d0f14 55%, #050608 100%)" }} />
    {/* back light behind the lid, so the graphite silhouette separates from the set */}
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 46% 40% at 50% 44%, rgba(96,118,170,0.22) 0%, rgba(60,72,110,0.08) 45%, transparent 75%)" }} />
    {/* the desk: a soft pool of key light under the laptop, falling off to black */}
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 42% 14% at 50% 80%, rgba(255,255,255,0.06) 0%, transparent 100%)" }} />
  </AbsoluteFill>
);

export const Laptop: React.FC<{ cam: Cam; children: React.ReactNode }> = ({ cam, children }) => {
  const { s, cx, cy, ry = 0, glare = 1 } = cam;
  return (
    <AbsoluteFill style={{ background: "#050608", overflow: "hidden" }}>
      <Set s={s} />
      <AbsoluteFill style={{ transformOrigin: `${OX}px ${OY}px`, transform: `translate(${cx - OX}px, ${cy - OY}px) scale(${s})` }}>
        <AbsoluteFill style={{ transformOrigin: `${OX}px ${OY}px`, transform: `perspective(2600px) rotateY(${ry}deg)` }}>
          {/* floor shadow and the screen's glow on the desk */}
          <div style={{ position: "absolute", left: OX - 760, top: LID_BOTTOM + 14, width: 1520, height: 80, borderRadius: "50%", background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.85) 0%, transparent 70%)", filter: "blur(14px)" }} />
          <div style={{ position: "absolute", left: OX - 640, top: LID_BOTTOM - 10, width: 1280, height: 120, borderRadius: "50%", background: "radial-gradient(ellipse at 50% 0%, rgba(150,170,230,0.10) 0%, transparent 70%)", filter: "blur(18px)", opacity: glare }} />
          {/* everything above the desk, mirrored faintly in its glossy surface */}
          <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: LID_BOTTOM + 42, WebkitBoxReflect: "below 2px linear-gradient(transparent 0%, transparent 78%, rgba(255,255,255,0.16) 100%)" } as React.CSSProperties}>
            {/* base: hinge, the deck's top face in perspective, its front edge and the thumb scoop */}
            <div style={{ position: "absolute", left: LID.left + 18, top: LID_BOTTOM - 1, width: LID.width - 36, height: 9, background: "linear-gradient(#0b0c0e, #1d1f23)" }} />
            <div style={{ position: "absolute", left: OX - 640, top: LID_BOTTOM + 7, width: 1280, height: 22, clipPath: "polygon(6.5% 0, 93.5% 0, 100% 100%, 0 100%)", background: "linear-gradient(#3a3d43, #24262b)" }} />
            <div style={{ position: "absolute", left: OX - 640, top: LID_BOTTOM + 29, width: 1280, height: 13, borderRadius: "0 0 14px 14px", background: "linear-gradient(#6b7079 0%, #33363c 35%, #17181b 100%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)" }} />
            <div style={{ position: "absolute", left: OX - 80, top: LID_BOTTOM + 29, width: 160, height: 6, borderRadius: "0 0 8px 8px", background: "#111215" }} />
            {/* lid: graphite frame with a hairline rim light, the camera dot, then the glass */}
            <div style={{ position: "absolute", ...LID, borderRadius: "22px 22px 10px 10px", background: "linear-gradient(160deg, #2c2f35, #15171a 60%, #101114)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1), inset 0 1.5px 0 rgba(255,255,255,0.32), 0 0 70px rgba(110,130,190,0.14), 0 40px 90px rgba(0,0,0,0.65)" }} />
            <div style={{ position: "absolute", left: OX - 3, top: LID.top + 5, width: 6, height: 6, borderRadius: 3, background: "#07080a", boxShadow: "0 0 0 1px rgba(255,255,255,0.08)" }} />
            <div style={{ position: "absolute", left: PL, top: PT - BAR, width: CW, height: CH + BAR, borderRadius: 8, overflow: "hidden", background: "#000" }}>
              <div style={{ position: "absolute", left: 0, top: BAR, width: CW, height: CH, overflow: "hidden" }}>{children}</div>
            </div>
            <Browser glare={glare} />
            {/* the glass: one soft diagonal reflection, gone when the page fills the frame */}
            <div style={{ position: "absolute", left: PL, top: PT - BAR, width: CW, height: CH + BAR, borderRadius: 8, pointerEvents: "none", opacity: glare, background: "linear-gradient(118deg, rgba(255,255,255,0.075) 0%, rgba(255,255,255,0.02) 32%, transparent 46%, transparent 100%)" }} />
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
