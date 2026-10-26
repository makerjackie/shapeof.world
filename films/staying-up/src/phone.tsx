import React from "react";
import { Easing, interpolate } from "remotion";
import { FONT, SANS } from "./theme";

// A phone at night showing a vertical video feed. Swipes, the status-bar clock and the bedtime
// reminder are all driven by props so different scenes can pace them differently.

const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const EIO = Easing.inOut(Easing.cubic);
const EO = Easing.bezier(0.16, 1, 0.3, 1);

export const PH_W = 400;
export const PH_H = 820;
const TW = PH_W - 20; // screen inside the bezel
const TH = PH_H - 20;

export const FEED = [
  { a: "#2b5876", b: "#4e4376", blob: "#8fd3f4" },
  { a: "#c94b4b", b: "#4b134f", blob: "#ffb199" },
  { a: "#134e5e", b: "#71b280", blob: "#d4fc79" },
  { a: "#41295a", b: "#2f0743", blob: "#f093fb" },
  { a: "#e65c00", b: "#7a2b00", blob: "#ffd194" },
  { a: "#0f2027", b: "#2c5364", blob: "#7ee8fa" },
  { a: "#614385", b: "#516395", blob: "#c3a6ff" },
];

export const feedPos = (f: number, swipes: number[], len = 11) =>
  swipes.reduce((p, at, i) => p + interpolate(f, [at, at + Math.max(6, len - i * 0.6)], [0, 1], { ...CL, easing: EIO }), 0);

const FeedTile: React.FC<{ i: number; f: number }> = ({ i, f }) => {
  const c = FEED[i % FEED.length];
  const t = f / 30;
  return (
    <div style={{ position: "absolute", left: 0, top: i * TH, width: TW, height: TH, overflow: "hidden", background: `linear-gradient(160deg, ${c.a}, ${c.b})` }}>
      <div style={{ position: "absolute", left: 60 + Math.sin(t * 1.3 + i) * 40, top: 180 + Math.cos(t + i * 2) * 50, width: 280, height: 280, borderRadius: "50%", background: c.blob, opacity: 0.55, filter: "blur(50px)" }} />
      <div style={{ position: "absolute", left: 160 + Math.cos(t * 0.9 + i) * 50, top: 420 + Math.sin(t * 1.1 + i) * 40, width: 200, height: 200, borderRadius: "50%", background: c.a, opacity: 0.7, filter: "blur(40px)" }} />
      <div style={{ position: "absolute", left: 26, bottom: 96, width: 120, height: 14, borderRadius: 7, background: "rgba(255,255,255,0.85)" }} />
      <div style={{ position: "absolute", left: 26, bottom: 66, width: 250, height: 11, borderRadius: 6, background: "rgba(255,255,255,0.55)" }} />
      <div style={{ position: "absolute", left: 26, bottom: 44, width: 190, height: 11, borderRadius: 6, background: "rgba(255,255,255,0.4)" }} />
      {[0, 1, 2].map((k) => (
        <div key={k} style={{ position: "absolute", right: 22, bottom: 150 + k * 78, width: 42, height: 42, borderRadius: "50%", background: "rgba(255,255,255,0.8)" }} />
      ))}
      <div style={{ position: "absolute", left: 0, bottom: 0, width: `${((t * 23 + i * 31) % 100).toFixed(1)}%`, height: 3, background: "rgba(255,255,255,0.7)" }} />
    </div>
  );
};

export const Phone: React.FC<{
  f: number;
  swipes: number[];
  clock: string;
  bannerIn?: number; // bedtime reminder drops in here...
  bannerOut?: number; // ...and is swiped away here
  dim?: number; // 0..1 screen brightness
}> = ({ f, swipes, clock, bannerIn = -1, bannerOut = -1, dim = 1 }) => {
  const pos = feedPos(f, swipes);
  const bIn = bannerIn < 0 ? 0 : interpolate(f, [bannerIn, bannerIn + 9], [0, 1], { ...CL, easing: EO });
  const bOut = bannerOut < 0 ? 0 : interpolate(f, [bannerOut, bannerOut + 8], [0, 1], { ...CL, easing: EIO });
  return (
    <div style={{ position: "absolute", left: -PH_W / 2, top: -PH_H / 2, width: PH_W, height: PH_H, borderRadius: 58, background: "#0b0c0f", boxShadow: "0 0 0 2px #23262c, 0 40px 80px rgba(0,0,0,0.6)" }}>
      <div style={{ position: "absolute", inset: 10, borderRadius: 48, overflow: "hidden", background: "#000" }}>
        <div style={{ position: "absolute", left: 0, top: -pos * TH, opacity: dim }}>
          {Array.from({ length: swipes.length + 1 }, (_, i) => (
            <FeedTile key={i} i={i} f={f} />
          ))}
        </div>
        <div style={{ position: "absolute", left: 34, top: 18, fontFamily: FONT, fontWeight: 500, fontSize: 20, color: "#fff", opacity: dim }}>{clock}</div>
        <div style={{ position: "absolute", right: 30, top: 22, width: 30, height: 14, borderRadius: 4, border: "1.5px solid rgba(255,255,255,0.8)", opacity: dim }}>
          <div style={{ width: "22%", height: "100%", background: "#ff5a5f", borderRadius: 2 }} />
        </div>
        {bIn > 0 && bOut < 1 && (
          <div style={{ position: "absolute", left: 14, right: 14, top: 52, transform: `translateY(${(1 - bIn) * -130 - bOut * 160}px)`, opacity: dim, padding: "16px 18px", borderRadius: 26, background: "rgba(40,42,48,0.86)", border: "1px solid rgba(255,255,255,0.12)", display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: 11, background: "linear-gradient(140deg,#3a3f78,#1b1e3d)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffd166", fontSize: 24 }}>☾</div>
            <div style={{ fontFamily: SANS, color: "#fff" }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>就寝时间</div>
              <div style={{ fontSize: 17, opacity: 0.8, marginTop: 2 }}>已经过了 1 小时 37 分钟</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
