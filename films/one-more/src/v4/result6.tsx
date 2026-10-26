// The result screen as the player sees it, full screen (screen pixels, 1110 × 520; visible x ≈ 93…1017): the frozen,
// greyed match behind, the defeat banner, the rank stars, 返回大厅 and a glowing 再来一局; then 匹配中.
import React from "react";
import { clamp01, EO, star } from "../kit";
import { HAN, K, NUM } from "../theme";
import { FightScreen } from "./fight";

export const AGAIN = { x: 735, y: 430, w: 230, h: 66 }; // the 再来一局 button (screen pixels, centre)

export const ResultScreen6: React.FC<{ t: number; k: number; beatPhase: number; press: number; tap: number; matching: number; matchT: number }> = ({ t, k, beatPhase, press, tap, matching, matchT }) => {
  const glow = 0.45 + 0.55 * Math.exp(-beatPhase * 5);
  const e = EO(clamp01(k));
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <FightScreen t={t} />
      <div style={{ position: "absolute", inset: 0, background: "#05070d", opacity: 0.35 * k }} />
      {/* rank: one star left, one just lost */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 334, display: "flex", justifyContent: "center", gap: 18, opacity: e, transform: `translateY(${(1 - e) * 20}px)` }}>
        <span style={{ fontFamily: HAN, fontWeight: 800, fontSize: 22, color: "#c9cfdb", alignSelf: "center", marginRight: 6 }}>段位</span>
        <svg width={5 * 52} height={50}>
          {Array.from({ length: 5 }, (_, i) => (
            <path key={i} d={star(26 + i * 52, 25, 20)} fill={i < 1 ? K.cyan : "none"} stroke={i < 1 ? "#fff" : i === 1 ? "#ff8ab8" : "#5a6378"} strokeWidth={2.5} opacity={i === 1 ? 0.5 + 0.5 * Math.sin(t * 9) : 1} />
          ))}
        </svg>
        <span style={{ fontFamily: NUM, fontWeight: 900, fontSize: 24, color: "#ff8ab8", alignSelf: "center" }}>−1</span>
      </div>
      {/* the two buttons */}
      <div style={{ position: "absolute", left: 375 - 105, top: AGAIN.y - AGAIN.h / 2, width: 210, height: AGAIN.h, borderRadius: 14, background: "linear-gradient(180deg, #3a4256, #232838)", border: "2px solid #6a7488", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: HAN, fontWeight: 800, fontSize: 26, color: "#aab3c5", opacity: e }}>返回大厅</div>
      <div style={{ position: "absolute", left: AGAIN.x - AGAIN.w / 2, top: AGAIN.y - AGAIN.h / 2, width: AGAIN.w, height: AGAIN.h, opacity: e, transform: `scale(${1 - 0.06 * press})` }}>
        <div style={{ position: "absolute", inset: -14, borderRadius: 24, background: K.want, opacity: 0.18 * glow }} />
        <div style={{ position: "absolute", inset: 0, borderRadius: 14, background: "linear-gradient(180deg, #ffe7a0 0%, #f2b638 55%, #c9821a 100%)", border: "2px solid #fff3c4", boxShadow: `0 0 ${18 + 22 * glow}px rgba(255,79,154,${0.35 + 0.35 * glow}), inset 0 -5px 0 rgba(120,60,0,0.35)`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: HAN, fontWeight: 900, fontSize: 30, color: "#4a2600", letterSpacing: 2 }}>再来一局</div>
      </div>
      {/* the tap */}
      {tap > 0 ? (
        <svg width={1110} height={520} style={{ position: "absolute", inset: 0 }}>
          <circle cx={AGAIN.x} cy={AGAIN.y} r={14 + 80 * (1 - tap)} fill="none" stroke="#fff" strokeWidth={4} opacity={tap} />
          <circle cx={AGAIN.x} cy={AGAIN.y} r={16} fill="#fff" opacity={0.6 * tap} />
        </svg>
      ) : null}
      {/* matchmaking */}
      {matching > 0 ? (
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 80% at 50% 50%, #16233f 0%, #070b16 80%)", opacity: matching }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 200, textAlign: "center", fontFamily: HAN, fontWeight: 900, fontSize: 46, color: "#e8f4ff", letterSpacing: 4 }}>匹配中…</div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 268, textAlign: "center", fontFamily: NUM, fontWeight: 700, fontSize: 30, color: K.cyan, fontVariantNumeric: "tabular-nums" }}>00:0{Math.min(9, Math.max(0, Math.floor(matchT)))}</div>
          <svg width={1110} height={520} style={{ position: "absolute", inset: 0 }}>
            {Array.from({ length: 10 }, (_, i) => {
              const a = (i / 10) * Math.PI * 2 + matchT * 2.4;
              return <circle key={i} cx={555 + Math.cos(a) * 120} cy={250 + Math.sin(a) * 120} r={6} fill={K.cyan} opacity={0.25 + 0.75 * ((i / 10 + matchT * 0.4) % 1)} />;
            })}
          </svg>
        </div>
      ) : null}
    </div>
  );
};

// The phone's status bar across the top of the frame: the time, the battery running low.
export const StatusBar: React.FC<{ o: number }> = ({ o }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 64, opacity: o, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 150px 0 420px", background: "linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0))" }}>
      <span style={{ fontFamily: NUM, fontWeight: 700, fontSize: 30, color: "#fff", fontVariantNumeric: "tabular-nums" }}>01:47</span>
      <span style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: NUM, fontWeight: 700, fontSize: 26, color: "#ff5a6e" }}>
        <svg width={34} height={22}>
          <path d="M 2 18 h 5 v -6 h -5 Z M 10 18 h 5 v -10 h -5 Z M 18 18 h 5 v -14 h -5 Z M 26 18 h 5 v -17 h -5 Z" fill="#fff" />
        </svg>
        12%
        <svg width={44} height={22}>
          <rect x={1} y={2} width={36} height={18} rx={5} fill="none" stroke="#fff" strokeOpacity={0.8} strokeWidth={2} />
          <rect x={39} y={8} width={4} height={6} rx={1.5} fill="#fff" opacity={0.8} />
          <rect x={4} y={5} width={5} height={12} rx={2} fill="#ff5a6e" />
        </svg>
      </span>
    </div>
  );

// A notification sliding down from the top: tomorrow's alarm.
export const AlarmNote: React.FC<{ k: number }> = ({ k }) =>
  k <= 0 ? null : (
    <div style={{ position: "absolute", left: 960 - 330, top: -130 + 220 * EO(clamp01(k)), width: 660, height: 96, borderRadius: 26, transform: "scale(1.3)", transformOrigin: "50% 0%", background: "rgba(40,44,56,0.92)", boxShadow: "0 12px 40px rgba(0,0,0,0.5)", display: "flex", alignItems: "center", gap: 20, padding: "0 26px", boxSizing: "border-box" }}>
      <div style={{ width: 54, height: 54, borderRadius: 14, background: "linear-gradient(180deg, #ff9a3d, #ff6a2a)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width={34} height={34} viewBox="0 0 34 34">
          <circle cx={17} cy={18} r={11} fill="none" stroke="#fff" strokeWidth={3} />
          <path d="M 17 12 v 6 l 4 3" stroke="#fff" strokeWidth={3} fill="none" strokeLinecap="round" />
          <path d="M 6 7 l 4 -3 M 28 7 l -4 -3" stroke="#fff" strokeWidth={3} strokeLinecap="round" />
        </svg>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontFamily: HAN, fontWeight: 800, fontSize: 24, color: "#fff" }}>闹钟</span>
        <span style={{ fontFamily: HAN, fontWeight: 600, fontSize: 24, color: "rgba(255,255,255,0.8)" }}>
          明天 <span style={{ fontFamily: NUM }}>07:30</span> · 起床
        </span>
      </div>
    </div>
  );
