import React from "react";
import { AbsoluteFill, Img, random, staticFile } from "remotion";
import { Hourglass, Receipt, RLine } from "../art";
import { EBACK, EIN, EIO, EO, keys, lerp, pr, useT } from "../kit";
import { FONT, K, SERIF } from "../theme";
import { FB, FILM_S } from "../timing";

export const ANSWER_AT = FB(72);
export const SAND_AT = FB(74);
export const LINE2_AT = FB(75.5);

// ───────── 12. The answer: the formula receipt comes back with its fourth line printed, biggest of all ─────────

const FULL: RLine[] = [
  { k: "head", text: "AI 的真实价格", sub: "单价 × 用量 ÷ 包月" },
  { k: "row", l: "单价 · 用量 · 包月", r: "token 钱", big: true },
  { k: "bar", l: "+ 你的时间", r: "最贵的一项", color: K.time, h: 260 },
];

export const Answer: React.FC = () => {
  const t = useT();
  const c0 = ANSWER_AT;
  const enter = pr(t, c0 - 0.3, 0.7, EO);
  const exit = pr(t, SAND_AT - 0.65, 0.45, EIN);
  const printed = pr(t, c0 - 0.1, 0.15, (z) => z) + pr(t, c0 + 0.1, 0.2, (z) => z) + pr(t, c0 + 0.45, 1.3, (z) => z);
  const head = pr(t, c0 + 0.6, 0.7, EBACK);
  const sub = pr(t, c0 + 1.5, 0.6, EO);
  const cam = keys(t, [[c0, 1.05], [SAND_AT, 0.98]], EIO);
  return (
    <AbsoluteFill style={{ opacity: Math.min(enter, 1 - exit), transform: `scale(${cam})`, transformOrigin: "960px 600px" }}>
      <div style={{ position: "absolute", left: 110, top: 930 }}>
        <Receipt lines={FULL} printed={printed} w={640} s={1.2} accent={K.time} glow={0.4} label="真实价格" />
      </div>
      <div style={{ position: "absolute", left: 930, top: 300, transform: `scale(${0.6 + 0.4 * head})`, transformOrigin: "0 50%", opacity: Math.min(1, head * 2) }}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 112, color: K.fg, lineHeight: 1.18, letterSpacing: -3, whiteSpace: "nowrap" }}>
          最聪明的 AI，
          <br />
          反而<span style={{ color: K.green }}>最便宜</span>。
        </div>
      </div>
      <div style={{ position: "absolute", left: 940, top: 610, opacity: sub, transform: `translateY(${(1 - sub) * 20}px)` }}>
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 40, color: K.sub, whiteSpace: "nowrap" }}>
          前提：包月用满，算上<span style={{ color: K.timeHi }}>你的时间</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ───────── 13. Tokens multiply; your time doesn't (hourglass in a flood of tokens) ─────────

const TOKEN_COLORS = [K.claude, K.gold, K.deepseek, K.fg, K.green];

export const Sand: React.FC = () => {
  const t = useT();
  const c1 = SAND_AT;
  const enter = pr(t, c1 - 0.15, 0.7, EO);
  const exit = pr(t, END_AT - 0.5, 0.7, EIN);
  const n = Math.round(keys(t, [[c1, 90], [LINE2_AT, 300], [END_AT, 420]], EIO));
  const sand = pr(t, c1, END_AT - c1, (z) => z);
  const cam = keys(t, [[c1, 1.1], [END_AT, 1.0]], EIO);
  return (
    <AbsoluteFill style={{ opacity: Math.min(enter, 1 - exit), transform: `scale(${cam})`, transformOrigin: "960px 600px" }}>
      {Array.from({ length: n }).map((_, i) => {
        const speed = 50 + random(`v${i}`) * 260;
        const size = 6 + random(`s${i}`) * 14;
        const y = 120 + random(`y${i}`) * 900;
        const x = ((random(`x${i}`) * 2300 + (t - c1) * speed) % 2300) - 190;
        const dx = x - 960;
        const dy = y - 600;
        const push = Math.max(0, 1 - Math.hypot(dx / 300, dy / 330));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y + Math.sign(dy || 1) * push * 260,
              width: size,
              height: size,
              borderRadius: 3,
              background: TOKEN_COLORS[i % TOKEN_COLORS.length],
              opacity: 0.16 + random(`o${i}`) * 0.3,
            }}
          />
        );
      })}
      <div style={{ position: "absolute", left: 960 - 150, top: 600 - 210 + Math.sin(t * 1.3) * 4, transform: "scale(1.35)", transformOrigin: "150px 230px" }}>
        <div style={{ position: "absolute", left: -120, top: -80, width: 540, height: 580, borderRadius: "50%", background: `radial-gradient(circle, ${K.time}33 0%, transparent 65%)` }} />
        <Hourglass p={0.15 + 0.7 * sand} />
      </div>
    </AbsoluteFill>
  );
};

// ───────── 14. End card: "AI 的真实价格" rolls into "世界的形状"; the round ball lands above; MakerJackie ─────────

const SIZE = 168;

const Slot: React.FC<{ from: string; to: string; wFrom: number; wTo: number; q: number }> = ({ from, to, wFrom, wTo, q }) => (
  <span style={{ display: "inline-block", position: "relative", width: lerp(wFrom, wTo, q), height: SIZE * 1.3, overflow: "hidden", verticalAlign: "top" }}>
    <span style={{ position: "absolute", left: 0, right: 0, textAlign: "center", top: -q * SIZE * 1.35 }}>{from}</span>
    <span style={{ position: "absolute", left: 0, right: 0, textAlign: "center", top: (1 - q) * SIZE * 1.35 }}>{to}</span>
  </span>
);

export const END_AT = FB(77.5);
export const FLIP_AT = END_AT + 1.4;
export const BALL_AT = FB(79);

export const EndCard: React.FC = () => {
  const t = useT();
  const settle = pr(t, END_AT - 0.2, 0.9, EO);
  const q1 = pr(t, FLIP_AT, 0.8, EIO);
  const q2 = pr(t, FLIP_AT + 0.2, 0.8, EIO);
  const ball = pr(t, FLIP_AT + 0.9, BALL_AT - FLIP_AT - 0.75, EO);
  const glow = Math.max(0, 1 - Math.abs(t - BALL_AT) / 0.6);
  const maker = pr(t, BALL_AT + 0.35, 0.6, EO);
  const push = pr(t, END_AT, FILM_S - END_AT, (z) => z);
  const fade = pr(t, FILM_S - 1.1, 1.0, EIO);
  return (
    <AbsoluteFill style={{ opacity: 1 - fade, transform: `scale(${1 + 0.035 * push})`, transformOrigin: "960px 520px" }}>
      <div style={{ position: "absolute", left: 960, top: 300, transform: "translate(-50%, -50%)" }}>
        <div style={{ position: "absolute", left: -260, top: -260, width: 520, height: 520, borderRadius: "50%", opacity: Math.min(1, ball * 1.4), background: `radial-gradient(circle, rgba(241,236,223,0.16) 0%, rgba(241,236,223,0.06) 38%, transparent 62%)` }} />
        <div style={{ position: "absolute", left: -260, top: -260, width: 520, height: 520, borderRadius: "50%", background: `radial-gradient(circle, rgba(255,209,102,${0.4 * glow}) 0%, transparent 62%)` }} />
        <div style={{ position: "absolute", left: -2, top: -2 + (1 - ball) * -160, width: 224, height: 224, borderRadius: "50%", boxShadow: "0 0 0 2px rgba(241,236,223,0.35)", opacity: Math.min(1, ball * 1.4), transform: `scale(${0.6 + 0.4 * ball})` }} />
        <Img
          src={staticFile("mark-disc.png")}
          style={{ width: 220, height: 220, display: "block", opacity: Math.min(1, ball * 1.4), transform: `translateY(${(1 - ball) * -160}px) scale(${0.6 + 0.4 * ball})` }}
        />
      </div>
      <div style={{ position: "absolute", left: 960, top: 600, transform: `translate(-50%, -50%) scale(${1.12 - 0.12 * settle})`, opacity: settle }}>
        <div style={{ display: "flex", fontFamily: SERIF, fontSize: SIZE, fontWeight: 900, color: K.fg, letterSpacing: 6, whiteSpace: "nowrap", lineHeight: 1.3 }}>
          <Slot from="AI" to="世界" wFrom={SIZE * 1.3} wTo={SIZE * 2.1} q={q1} />
          <span>的</span>
          <Slot from="真实价格" to="形状" wFrom={SIZE * 4.15} wTo={SIZE * 2.1} q={q2} />
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 90, textAlign: "center", opacity: maker, fontFamily: FONT, fontWeight: 700, fontSize: 40, letterSpacing: 4, color: K.sub }}>MakerJackie</div>
    </AbsoluteFill>
  );
};
