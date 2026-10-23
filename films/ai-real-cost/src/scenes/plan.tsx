import React from "react";
import { AbsoluteFill } from "remotion";
import { ClaudeGlyph, Coin, COIN_T, MemberCard, Spark, WhaleGlyph } from "../art";
import { drift, EBACK, EIN, EIO, EO, keys, Lab, lerp, Odometer, pr, Source, Stamp, swing, useT } from "../kit";
import { FONT, K, SANS } from "../theme";
import { barA, BEAT_A } from "../timing";

// ───────── 3. Subscription: one month of Max = one coin; at list price it is worth a tower of 36 ─────────

export const COINS = 36;
// Coin i lands at COIN_AT(i): starts slow, speeds up, all down a beat before bar 10.
export const COIN_AT = (i: number) => barA(8.25) + (barA(9.75) - barA(8.25)) * Math.pow(i / (COINS - 1), 0.72);
const VALUE = 47850; // $7,121 × 6.7195

export const PLAN_END = barA(12);

export const Plan: React.FC = () => {
  const t = useT();
  const t0 = barA(6);
  const enter = pr(t, t0 - 0.2, 0.7, EBACK);
  const toCoin = pr(t, barA(8), 0.5, EIO); // the card shrinks into the first coin
  const exit = pr(t, PLAN_END - 0.3, 0.5, EIN);
  const landed = Array.from({ length: COINS }, (_, i) => t >= COIN_AT(i)).filter(Boolean).length;
  const towerTop = 860 - landed * COIN_T;
  const camY = keys(t, [[t0, 0], [barA(8), 0], [barA(10), -20]], EIO);
  const camS = keys(t, [[t0, 1.0], [barA(8), 1.16], [barA(9.9), 0.95], [PLAN_END, 0.92]], EIO);
  const shine = pr(t, t0 + 0.4, 1.2, EIO);
  const value = Math.min(VALUE, (landed / COINS) * VALUE);
  const lastLand = landed > 0 ? COIN_AT(landed - 1) : -9;
  const s36 = barA(10.5);
  return (
    <AbsoluteFill style={{ transform: `translateX(${-exit * 1900}px)` }}>
      <AbsoluteFill style={{ transform: `translateY(${camY}px) scale(${camS})`, transformOrigin: "1100px 880px" }}>
        {/* the card, then the single coin you pay */}
        <div
          style={{
            position: "absolute",
            left: lerp(lerp(2000, 1080, enter), 380, toCoin),
            top: lerp(330, 640, toCoin) + drift(t, 3, 6),
            transform: `rotate(${lerp(-6, 0, toCoin) + swing(t, t0 + 0.3, 2, 0.8, 2)}deg) scale(${lerp(1, 0.35, toCoin)})`,
            transformOrigin: "0 0",
            opacity: 1 - pr(t, barA(8) + 0.35, 0.2),
          }}
        >
          <MemberCard w={620} shine={shine} />
        </div>
        {toCoin > 0.5 ? (
          <div style={{ position: "absolute", left: 560, top: 860 - COIN_T }}>
            <div style={{ transform: `scale(${pr(t, barA(8) + 0.3, 0.3, EBACK)})` }}>
              <Coin />
            </div>
          </div>
        ) : null}
        {toCoin > 0.6 ? (
          <div style={{ position: "absolute", left: 420, top: 930, opacity: pr(t, barA(8) + 0.4, 0.4) }}>
            <Lab size={34} color={K.fg}>你付的：1 个月</Lab>
            <Lab size={26} color={K.sub} w={500} style={{ marginTop: 6 }}>Max 会员 约 ¥1,344</Lab>
          </div>
        ) : null}
        {/* the tower */}
        {Array.from({ length: landed + 1 }).map((_, i) => {
          if (i >= COINS) return null;
          const at = COIN_AT(i);
          const fall = pr(t, at - 0.28, 0.28, EIN);
          if (fall <= 0) return null;
          const yRest = 860 - i * COIN_T - COIN_T;
          const y = lerp(yRest - 700, yRest, fall);
          return (
            <div key={i} style={{ position: "absolute", left: 1260, top: y }}>
              <Coin shade={i % 2 ? 0.3 : 0} />
            </div>
          );
        })}
        {landed > 0 ? (
          <div style={{ position: "absolute", left: 1380, top: towerTop - 150, transform: `scale(${1 + 0.06 * Math.max(0, 1 - (t - lastLand) / 0.15)})`, transformOrigin: "0 100%" }}>
            <Lab size={28} color={K.sub} w={500}>按 API 原价，用满一个月</Lab>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontFamily: FONT, fontSize: 40, fontWeight: 700, color: K.sub }}>约</span>
              <Odometer value={value} size={96} prefix="¥" color={K.claudeHi} />
            </div>
          </div>
        ) : null}
        <div style={{ position: "absolute", left: 1500, top: 900 - COINS * COIN_T * 0.55 }}>
          <Stamp t={t} at={s36} color={K.gold} size={100} rot={-8}>
            36 倍
          </Stamp>
        </div>
        <div style={{ position: "absolute", left: 140, top: lerp(1200, 690, pr(t, barA(9), 0.5, EBACK)) }}>
          <Spark t={t} size={150} mood={t > s36 ? "party" : "happy"} beat={BEAT_A} />
        </div>
      </AbsoluteFill>
      <Source o={1 - exit}>
        Claude Max 20x 官方价 $200/月 · 用满一个月按 API 原价值 $7,121：wokey.ai 17 个用满账号的中位数（2026-10）· 按 2026-10-22 中间价 6.7195 换算 · 只对用得满的人成立
      </Source>
    </AbsoluteFill>
  );
};

// ───────── 4. The per-token price, slid down a price ruler: ¥134 → ¥3.7, next to DeepSeek's off-peak ¥4 ─────────

const Y_TOP = 300;
const Y_BOT = 900;
const LMAX = Math.log(150);
const LMIN = Math.log(3.2);
const yOf = (v: number) => Y_TOP + ((LMAX - Math.log(v)) / (LMAX - LMIN)) * (Y_BOT - Y_TOP);

const MARKS = [
  { v: 134, l: "Claude Opus 5.5 · 原价", c: K.claude },
  { v: 67, l: "GPT-6.1 · Claude Sonnet 5.5", c: K.sub },
  { v: 27, l: "DeepSeek V4 Pro", c: K.deepseekHi },
  { v: 8, l: "DeepSeek V4.1 Flash · 高峰", c: K.deepseekHi },
];

export const DROP_AT = barA(12.25);
export const DROP_LEN = barA(13) - barA(12.25);
export const RULER_END = barA(14);
// When the falling tag passes each mark (for the ticks in the sound list).
export const passTime = (v: number) => {
  const target = (Math.log(134) - Math.log(v)) / (Math.log(134) - Math.log(3.73));
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (EIO(mid) < target) lo = mid;
    else hi = mid;
  }
  return DROP_AT + DROP_LEN * lo;
};

export const Ruler: React.FC = () => {
  const t = useT();
  const t0 = PLAN_END;
  const enter = pr(t, t0 - 0.3, 0.6, EO);
  const exit = pr(t, RULER_END - 0.3, 0.5, EIN);
  const p = pr(t, DROP_AT, DROP_LEN, EIO);
  const v = Math.exp(lerp(Math.log(134), Math.log(3.73), p));
  const land = DROP_AT + DROP_LEN;
  const bounce = t > land ? -Math.sin((t - land) * 14) * 18 * Math.exp(-(t - land) * 6) : 0;
  const yTag = yOf(v) + bounce;
  const won = pr(t, land, 0.4);
  return (
    <AbsoluteFill style={{ transform: `translateX(${(1 - enter) * 1900 - exit * 1900}px)` }}>
      {/* the ruler */}
      <div style={{ position: "absolute", left: 700, top: Y_TOP - 40, width: 14, height: Y_BOT - Y_TOP + 120, borderRadius: 7, background: "linear-gradient(180deg, #2c3036, #1a1d21)" }} />
      {MARKS.map((m, i) => {
        const y = yOf(m.v);
        const passed = yTag >= y - 2;
        const e = pr(t, t0 + i * 0.12, 0.4);
        return (
          <div key={m.v} style={{ position: "absolute", left: 0, top: y, width: 1920, opacity: e }}>
            <div style={{ position: "absolute", left: 640, width: 140, borderTop: `3px solid ${passed ? m.c : "rgba(244,240,232,0.25)"}` }} />
            <div style={{ position: "absolute", left: 350, top: -38, width: 270, textAlign: "right", fontFamily: FONT, fontWeight: 900, fontSize: 58, color: passed ? m.c : K.muted }}>¥{m.v}</div>
            <div style={{ position: "absolute", left: 800, top: -26, fontFamily: SANS, fontWeight: 700, fontSize: 36, color: passed ? K.fg : K.muted, whiteSpace: "nowrap" }}>{m.l}</div>
          </div>
        );
      })}
      {/* DeepSeek off-peak, waiting at the bottom */}
      <div style={{ position: "absolute", left: 1330, top: yOf(4) - 84, opacity: pr(t, t0 + 0.6, 0.5) }}>
        <SmallTag color={K.deepseek} glyph={<WhaleGlyph size={30} />} title="DeepSeek 闲时价" price="¥4" />
      </div>
      {/* the falling Opus tag */}
      <div style={{ position: "absolute", left: 790, top: yTag - 84 }}>
        <SmallTag color={won > 0.5 ? K.green : K.claude} glyph={<ClaudeGlyph size={30} />} title={won > 0.5 ? "Opus · 包月用满" : "Claude Opus 5.5"} price={`¥${v < 10 ? v.toFixed(1) : Math.round(v)}`} glow={won} />
      </div>
      <div style={{ position: "absolute", left: 1235, top: yOf(4) - 52, fontFamily: FONT, fontWeight: 900, fontSize: 84, color: K.green, opacity: won }}>≈</div>
      <Source o={1 - exit}>输出价 · 每百万 token · Opus 包月用满 = 原价 ÷ 36（推算）· 原价按 2026-10-22 中间价 6.7195 换算 · DeepSeek 用它自己的人民币标价 · 纵轴为对数刻度</Source>
    </AbsoluteFill>
  );
};

const SmallTag: React.FC<{ color: string; glyph: React.ReactNode; title: string; price: string; glow?: number }> = ({ color, glyph, title, price, glow = 0 }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 18,
      padding: "20px 32px",
      borderRadius: 22,
      background: K.receipt,
      borderLeft: `14px solid ${color}`,
      boxShadow: `0 24px 50px rgba(0,0,0,0.55)${glow > 0 ? `, 0 0 ${60 * glow}px ${K.green}88` : ""}`,
      fontFamily: FONT,
      whiteSpace: "nowrap",
    }}
  >
    <div style={{ width: 46, height: 46, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>{glyph}</div>
    <div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "#5d5a52" }}>{title}</div>
      <div style={{ fontSize: 84, fontWeight: 900, color: K.ink, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{price}</div>
    </div>
  </div>
);

