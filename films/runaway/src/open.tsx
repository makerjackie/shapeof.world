// Cold open (0 → FRIDAY): the green ✓ card fills the screen, the camera pulls back to show the city behind it,
// couriers stop and go red from 飞鸟物流's depot outward, the last hit freezes it, "起因，只是一句话。" sits in the
// silence, then everything rewinds to Friday 20:14.
import React from "react";
import { AbsoluteFill } from "remotion";
import { City } from "./city";
import { clamp01, EIO, EO, lerp, ramp, SHADOW, useT } from "./kit";
import { FONT, K, NUM } from "./theme";
import { at, FRIDAY, REWIND } from "./time";
import { ChatWindow, Confetti, SuccessCard, Type } from "./ui";

export const HIT_END = at("A", 94.86); // the last hit: freeze
const PULL = at("A", 85.69);
const WAVE = at("A", 87.31);
const RED_TEXT = at("A", 88.89);
const ALERTS = [at("A", 89.46), at("A", 90.77), at("A", 92.06)];

// shared with Monday: where the window sits when it is small, over the city
export const SMALL = { x: 960, y: 470, s: 0.4 };

export const Open: React.FC = () => {
  const t = useT();
  if (t > FRIDAY + 0.05) return null;
  // rewind: scene time runs backwards fast
  const rw = ramp(t, REWIND, FRIDAY, (v) => v);
  const st = t < REWIND ? Math.min(t, HIT_END) : lerp(HIT_END, -0.3, EIO(rw));
  const pull = ramp(st, PULL, PULL + 1.6, EIO);
  const s = lerp(1, SMALL.s, pull);
  const cy = lerp(540, SMALL.y, pull);
  const freeze = t >= HIT_END && t < REWIND ? ramp(t, HIT_END, HIT_END + 0.25) : t >= REWIND ? 1 - rw : 0;
  const cityO = ramp(st, PULL, PULL + 1.0);
  return (
    <AbsoluteFill style={{ background: K.bg }}>
      <City t={st} cam={{ cx: 960, cy: 540, k: 1 }} stop={WAVE} o={cityO} depotLabel={ramp(st, WAVE, WAVE + 0.5)} />
      <div style={{ position: "absolute", left: 960 - 600, top: cy - 450, width: 1200, height: 900, transform: `scale(${s})`, transformOrigin: "50% 50%" }}>
        <ChatWindow x={0} y={0} w={1200} h={900} clock="周一 09:00" glow={`${K.ok}55`}>
          <div style={{ alignSelf: "center", marginBottom: 60 }}>
            <SuccessCard at={-0.4} w={820} />
          </div>
        </ChatWindow>
      </div>
      <Confetti at={-0.35} x={560 + 200 * pull} y={cy - 300 * s} w={800 * s} o={1 - pull} />
      {/* alerts */}
      {["飞鸟物流 · 调度系统失去地图", "骑手导航失效 · 2.1 万单滞留", "货车停在路上 · 340 辆"].map((a, i) => {
        const k = ramp(st, ALERTS[i], ALERTS[i] + 0.35, EO);
        if (k <= 0) return null;
        return (
          <div key={i} style={{ position: "absolute", right: 60, top: 140 + i * 92, opacity: k * (1 - 0.6 * freeze), transform: `translateX(${(1 - k) * 60}px)`, display: "flex", alignItems: "center", gap: 14, padding: "14px 24px", borderRadius: 14, background: "rgba(60,10,18,0.85)", border: `1.5px solid ${K.red}`, color: K.redHi, fontFamily: FONT, fontWeight: 700, fontSize: 28, boxShadow: `0 0 30px ${K.red}55` }}>
            <span style={{ color: K.red, fontSize: 30 }}>▲</span>
            {a}
          </div>
        );
      })}
      {st > RED_TEXT ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 880, textAlign: "center", opacity: (1 - freeze) * ramp(st, RED_TEXT, RED_TEXT + 0.3) }}>
          <Type at={RED_TEXT} text="同一时刻，全城几万单配送停了下来。" size={60} weight={900} color={K.fg} cps={14} style={{ display: "inline-block" }} />
        </div>
      ) : null}
      {/* the freeze */}
      <AbsoluteFill style={{ background: "#020305", opacity: 0.78 * freeze }} />
      {t >= HIT_END && t < REWIND + 0.3 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 470, textAlign: "center", opacity: 1 - ramp(t, REWIND, REWIND + 0.3) }}>
          <Type at={HIT_END + 0.05} text="起因，只是一句话。" size={100} weight={900} cps={16} style={{ display: "inline-block" }} />
        </div>
      ) : null}
      {t >= REWIND ? <Rewind k={rw} /> : null}
    </AbsoluteFill>
  );
};

// Tape-rewind overlay: streaks and the clock spinning back from Monday 09:00 to Friday 20:14.
const Rewind: React.FC<{ k: number }> = ({ k }) => {
  const total = (2 * 24 + 12) * 60 + 46; // Fri 20:14 → Mon 09:00 in minutes
  const m = Math.round(total * (1 - EO(k)));
  const abs = 20 * 60 + 14 + m;
  const day = ["周五", "周六", "周日", "周一"][Math.floor(abs / 1440)];
  const hh = String(Math.floor((abs % 1440) / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  const streaks = Array.from({ length: 14 }, (_, i) => ((i * 97 + k * 4000) % 1080));
  return (
    <AbsoluteFill>
      {streaks.map((y, i) => (
        <div key={i} style={{ position: "absolute", left: 0, right: 0, top: y, height: 2 + (i % 3), background: "rgba(220,235,255,0.18)" }} />
      ))}
      <div style={{ position: "absolute", left: 0, right: 0, top: 380, textAlign: "center", fontFamily: NUM, color: K.fg, textShadow: SHADOW, opacity: clamp01(k * 6) }}>
        <div style={{ fontFamily: FONT, fontSize: 56, fontWeight: 700, color: K.sub }}>{day}</div>
        <div style={{ fontSize: 210, fontWeight: 900, letterSpacing: 6, fontVariantNumeric: "tabular-nums" }}>{hh}:{mm}</div>
      </div>
    </AbsoluteFill>
  );
};
