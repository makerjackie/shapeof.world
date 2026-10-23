import React from "react";
import { AbsoluteFill, random } from "remotion";
import { Odometer } from "../fx";
import { MiniRam, RamKit } from "../samples/art";
import { FONT, SERIF } from "../theme";
import { ChatBox, Crowd, DateTag, DcBuilding, GpuHall, hallSlot, Skyline, Streak } from "./art";
import { Backdrop, C, Cam, clamp01, EBACK, EIO, EO, Glass, lerp, Lines, pr, Src, useT } from "./kit";
import { bar, beat } from "./timing";

// 片中 0–8 · The opening, one continuous pull-back (the signature shot). Three questions, each at a bigger scale:
// your cart (bar 0) → the data hall full of graphics cards (bar 2) → the city and its crowd (bar 4). On bar 6 three
// streaks run back into one empty chat box (quiet one); on bar 7 someone types 你好; the title lands on bar 8.

export const Q = {
  q1: ["一根电脑内存条，", "怎么涨到了 3,800？"],
  q2: ["做显卡的公司，", "怎么成了全球最值钱？"],
  q3: ["都说 AI 要抢饭碗，", "它到底抢了谁的？"],
  q4: ["这一切，", "都从四年前的一个聊天框开始。"],
} as const;

export const STEPS: [number, number][] = [
  [0.0, 900],
  [beat(1), 1600],
  [beat(2), 2400],
  [beat(3), 3100],
  [bar(1), 3800],
];
const valueAt = (t: number) => {
  let v = STEPS[0][1];
  for (let i = 1; i < STEPS.length; i++) v = lerp(v, STEPS[i][1], pr(t, STEPS[i][0] - 0.12, 0.18, EO));
  return v;
};

export const CARD = { x: 780, y: 360, w: 1000, h: 560 };
const SLOT = { x: CARD.x + CARD.w - 50, y: CARD.y + 352 };
const TILE = 0.24;
const TW = CARD.w * TILE;
const TH = CARD.h * TILE;
const GX = (1920 - (5 * TW + 4 * 24)) / 2;
const GY = 720;
const tilePos = (i: number) => ({ x: GX + (i % 5) * (TW + 24), y: GY + Math.floor(i / 5) * (TH + 22) });
const MINE = 2;
export const PULL1: [number, number] = [bar(2), bar(2) + 0.9];
const CAM_END: [number, number, number, number] = [
  PULL1[1],
  tilePos(MINE).x + TW / 2 - 960 - TILE * (CARD.x + CARD.w / 2 - 960),
  tilePos(MINE).y + TH / 2 - 540 - TILE * (CARD.y + CARD.h / 2 - 540),
  TILE,
];
export const leaveAt = (i: number) => bar(2) + 2 * (60 / 111.62) + ((i * 3) % 10) * 0.11;
const HALL = { x: 300, y: 380, w: 1320, h: 300 };

// Stage C: everything above shrinks into one lit building on the skyline.
export const PULL2: [number, number] = [bar(4), bar(4) + 1.1];
const GROUND = 880;
const DC = { w: 600, h: 250 };
// the hall (1320 wide) shrinks onto the building's glass front (w − 40 wide, centred 50 + (h − 92)/2 from its top)
const S2 = (DC.w - 40) / 1320;
const ANCHOR = { x: 960, y: 380 + 150 };
const TO = { x: 960, y: GROUND - DC.h + 50 + (DC.h - 92) / 2 };

// Stage D: the rewind into the chat box.
export const REWIND = bar(6);
export const BOX = { w: 860, h: 330, cx: 960, cy: 612 };
// The first caption starts with the first frame (before the first beat at 0.487 s) so a 20-character question still
// gets its full reading time inside bars 0–2.
export const Q1_AT = 0.1;
export const USER_AT = bar(7);
export const REPLY_AT = bar(7) + 0.82;

type CardProps = { price: number; priceColor: string; priceScale: number; showPrice: boolean; month: string; stock: string; ramGone: number; struck: number; id: string };

export const CartCard: React.FC<CardProps> = ({ price, priceColor, priceScale, showPrice, month, stock, ramGone, struck, id }) => (
  <Glass x={0} y={0} w={CARD.w} h={CARD.h}>
    <div style={{ position: "absolute", left: 40, top: 28, fontSize: 40, fontWeight: 900 }}>
      购物车 <span style={{ fontSize: 28, color: C.muted }}>(1)</span>
    </div>
    <div
      style={{
        position: "absolute",
        right: 40,
        top: 34,
        padding: "4px 16px",
        borderRadius: 999,
        background: month === "2025 年" ? "rgba(255,255,255,0.08)" : "rgba(255,90,95,0.18)",
        color: month === "2025 年" ? C.sub : C.red,
        fontSize: 24,
        fontWeight: 800,
      }}
    >
      {month}
    </div>
    <div style={{ position: "absolute", left: 40, right: 40, top: 98, height: 1, background: C.line }} />
    <div style={{ position: "absolute", left: 40, top: 130, width: 250, height: 160, borderRadius: 16, background: "rgba(255,255,255,0.06)" }}>
      <div style={{ position: "absolute", left: 24, top: 44, opacity: 1 - ramGone, transform: `translateY(${-ramGone * 60}px)` }}>
        <RamKit w={196} id={id} />
      </div>
    </div>
    <div style={{ position: "absolute", left: 320, top: 138, fontSize: 38, fontWeight: 800, whiteSpace: "nowrap" }}>DDR5 内存条 32GB</div>
    <div style={{ position: "absolute", left: 320, top: 192, fontSize: 24, color: C.muted, fontWeight: 600, whiteSpace: "nowrap" }}>16G×2 · 台式机电脑用</div>
    <div
      style={{
        position: "absolute",
        left: 320,
        top: 238,
        padding: "3px 14px",
        borderRadius: 8,
        fontSize: 22,
        fontWeight: 800,
        background: stock === "有货" ? "rgba(61,220,151,0.15)" : "rgba(255,90,95,0.18)",
        color: stock === "有货" ? C.green : C.red,
      }}
    >
      {stock}
    </div>
    <div style={{ position: "absolute", right: 54, top: 250, fontSize: 30, fontWeight: 800, color: C.muted, whiteSpace: "nowrap" }}>
      去年 <span style={{ position: "relative" }}>
        ¥900
        <span style={{ position: "absolute", left: -4, right: -4, top: "52%", height: 4, background: C.red, transform: `scaleX(${struck})`, transformOrigin: "0 50%" }} />
      </span>
    </div>
    {showPrice ? (
      <div
        style={{
          position: "absolute",
          right: 50,
          top: 352 - 71,
          fontSize: 132,
          fontWeight: 900,
          color: priceColor,
          fontVariantNumeric: "tabular-nums",
          lineHeight: "142px",
          letterSpacing: -2.6,
          transform: `scale(${priceScale})`,
          transformOrigin: "100% 50%",
        }}
      >
        ¥{Math.round(price).toLocaleString("en-US")}
      </div>
    ) : null}
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 112, background: "rgba(255,255,255,0.04)", borderTop: `1px solid ${C.line}` }} />
    <div style={{ position: "absolute", left: 40, bottom: 38, fontSize: 28, fontWeight: 800, color: C.sub }}>合计</div>
    <div style={{ position: "absolute", left: 112, bottom: 26, fontSize: 52, fontWeight: 900, color: priceColor, fontVariantNumeric: "tabular-nums" }}>¥{Math.round(price).toLocaleString("en-US")}</div>
    <div style={{ position: "absolute", right: 36, bottom: 18, width: 220, height: 76, borderRadius: 38, background: C.orange, color: "#1a1208", fontSize: 32, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>结算</div>
  </Glass>
);

export const Opening: React.FC = () => {
  const t = useT();
  const v = valueAt(t);
  const heat = Math.min(1, (v - 900) / 2900);
  const pump = STEPS.slice(1).reduce((a, [s]) => a + Math.max(0, 1 - Math.abs(t - s) / 0.16) * 0.08, 0);
  const slam = t >= bar(1) ? Math.max(0, 1 - (t - bar(1)) / 0.4) : 0;
  const intro = pr(t, 0, 0.3, EO);
  const fly = pr(t, beat(2) - 0.05, 0.42, EIO);
  const cardIn = pr(t, beat(2) - 0.05, 0.42, EO);
  const numColor = `rgb(${Math.round(lerp(244, 255, heat))},${Math.round(lerp(240, 90, heat))},${Math.round(lerp(232, 95, heat))})`;
  const size = lerp(280, 132, fly) * (1 + pump) * lerp(1.25, 1, intro);
  const nx = lerp(960, SLOT.x, fly);
  const ny = lerp(600, SLOT.y, fly);
  const ax = lerp(-50, -100, fly);
  const stamp = pr(t, bar(1) + 60 / 111.62, 0.3, EBACK);
  const struck = pr(t, bar(1), 0.3, EO);
  const stock = t < bar(1) + 0.6 ? "有货" : t < leaveAt(MINE) + 0.3 ? "库存紧张" : "缺货";
  const pull1 = pr(t, PULL1[0], PULL1[1] - PULL1[0], EIO);
  const hall = pr(t, bar(2) + 0.5, 0.5, EBACK);
  const pull2 = pr(t, PULL2[0], PULL2[1] - PULL2[0], EIO);
  const tilesOut = pr(t, bar(4), 0.5, EIO);
  const toBuilding = pr(t, PULL2[0] + 0.6, 0.5, EIO);
  const city = pr(t, bar(4) + 0.3, 1.4, EO);
  const crowd = pr(t, bar(4) + 0.9, 0.6, EO);
  const rw = pr(t, REWIND + 0.25, 0.75, EIO);
  const worldO = 1 - pr(t, REWIND + 0.55, 0.6, EIO);
  const boxIn = pr(t, REWIND + 1.0, 0.5, EBACK);
  const card = { price: v, priceColor: numColor, priceScale: 1 + pump + 0.18 * slam, showPrice: fly >= 1, month: t >= bar(1) ? "2026 年 7 月" : "2025 年", struck };
  const s2 = lerp(1, S2, pull2);
  const tx = lerp(0, TO.x - S2 * ANCHOR.x, pull2);
  const ty = lerp(0, TO.y - S2 * ANCHOR.y, pull2);
  const lit = Array.from({ length: 10 }, (_, i) => pr(t, leaveAt(i) + 0.62, 0.4, EO));
  const glow = t < PULL1[0] + 0.4 ? C.red : t < PULL2[0] + 0.5 ? C.cyan : "#6f8fd0";
  const glowAt: [number, number] = t < PULL1[0] + 0.4 ? [62, 52] : t < PULL2[0] + 0.5 ? [50, 40] : [50, 74];
  const glowS = t < PULL1[0] + 0.4 ? 0.06 + 0.2 * heat : t < PULL2[0] + 0.5 ? 0.16 : 0.12;
  return (
    <AbsoluteFill>
      <Backdrop glow={glow} at={glowAt} strength={glowS * (0.4 + 0.6 * worldO)} />
      {/* the world: carts and the hall, then the city around them */}
      <AbsoluteFill style={{ opacity: worldO }}>
        <Skyline t={t} open={city} ground={GROUND} dawn={pr(t, bar(4) + 0.6, 3, EO)} />
        {toBuilding > 0 ? (
          <div style={{ position: "absolute", left: TO.x - DC.w / 2, top: GROUND - DC.h }}>
            <DcBuilding w={DC.w} h={DC.h} t={t} o={toBuilding} />
          </div>
        ) : null}
        <AbsoluteFill style={{ transformOrigin: "0 0", transform: `translate(${tx}px, ${ty}px) scale(${s2})`, opacity: 1 - toBuilding }}>
          <Cam keys={[[0, 0, 0, 1], [PULL1[0], 0, 0, 1], CAM_END]}>
            {cardIn > 0 ? (
              <div style={{ position: "absolute", left: CARD.x, top: CARD.y, transform: `translateX(${(1 - cardIn) * 360}px)`, opacity: cardIn * (1 - tilesOut) }}>
                <CartCard {...card} stock={stock} ramGone={pr(t, leaveAt(MINE), 0.3)} id="v3mine" />
              </div>
            ) : null}
            {fly < 1 ? (
              <div style={{ position: "absolute", left: nx, top: ny, transform: `translate(${ax}%, -50%)` }}>
                <Odometer value={v} size={size} prefix="¥" color={numColor} />
              </div>
            ) : null}
            {stamp > 0 && pull1 < 1 ? (
              <div
                style={{
                  position: "absolute",
                  left: CARD.x + 52,
                  top: CARD.y + 318,
                  transform: `rotate(-8deg) scale(${1 + (1 - stamp) * 1.3})`,
                  transformOrigin: "50% 50%",
                  opacity: Math.min(1, stamp * 2),
                  padding: "4px 20px",
                  border: `6px solid ${C.red}`,
                  borderRadius: 14,
                  color: C.red,
                  fontFamily: FONT,
                  fontWeight: 900,
                  fontSize: 52,
                  whiteSpace: "nowrap",
                  background: "rgba(7,9,11,0.6)",
                }}
              >
                涨到 4 倍多
              </div>
            ) : null}
            {STEPS.slice(1).map(([s0], i) => {
              const p = pr(t, s0, 0.35, EO);
              if (p <= 0 || p >= 1) return null;
              const cx = i < 2 ? nx : SLOT.x - 230;
              const cy = i < 2 ? ny : SLOT.y;
              return Array.from({ length: 12 }).map((_, k) => {
                const a = random(`h3${i}-${k}`) * Math.PI * 2;
                const d = (i < 2 ? 240 : 170) + random(`hd3${i}-${k}`) * 160;
                return (
                  <div
                    key={`${i}-${k}`}
                    style={{ position: "absolute", left: cx + Math.cos(a) * d * p, top: cy + Math.sin(a) * d * p * 0.6, width: 16, height: 5, borderRadius: 3, background: i === 3 ? C.gold : numColor, transform: `rotate(${a}rad)`, opacity: 1 - p }}
                  />
                );
              });
            })}
          </Cam>
          {pull1 > 0 ? (
            <>
              {Array.from({ length: 10 }).map((_, i) => {
                if (i === MINE) return null;
                const p = pr(t, PULL1[0] + 0.4 + ((i * 7) % 10) * 0.05, 0.4, EO);
                const { x, y } = tilePos(i);
                return (
                  <div key={i} style={{ position: "absolute", left: x, top: y, width: CARD.w, height: CARD.h, transformOrigin: "0 0", transform: `scale(${TILE * lerp(0.9, 1, p)})`, opacity: p * (1 - tilesOut) }}>
                    <CartCard {...card} price={3800} priceColor={C.red} priceScale={1} showPrice struck={1} stock={t < leaveAt(i) + 0.3 ? "库存紧张" : "缺货"} ramGone={pr(t, leaveAt(i), 0.3)} id={`v3t${i}`} />
                  </div>
                );
              })}
              {hall > 0 ? (
                <div style={{ position: "absolute", left: HALL.x, top: HALL.y, opacity: Math.min(1, hall * 2), transform: `translateY(${(1 - hall) * -80}px)` }}>
                  <GpuHall w={HALL.w} h={HALL.h} t={t} lit={lit} />
                </div>
              ) : null}
              {Array.from({ length: 30 }).map((_, j) => {
                const i = j % 10;
                const k = Math.floor(j / 10);
                const p = pr(t, leaveAt(i) + k * 0.1, 0.62, EIO);
                if (p <= 0 || p >= 1) return null;
                const { x, y } = tilePos(i);
                const slot = hallSlot(i, HALL.w, HALL.h);
                const x0 = x + 30 + k * 12;
                const y0 = y + 46;
                const x1 = HALL.x + slot.x - 28 + k * 14;
                const y1 = HALL.y + slot.y;
                return (
                  <div key={`r${j}`} style={{ position: "absolute", left: lerp(x0, x1, p), top: lerp(y0, y1, p) - Math.sin(p * Math.PI) * 90, transform: `rotate(${(1 - p) * -25 + k * 8}deg)`, opacity: Math.min(1, (1 - p) * 5) }}>
                    <MiniRam w={lerp(100, 56, p)} color={C.cyan} fill="#1c2733" />
                  </div>
                );
              })}
            </>
          ) : null}
        </AbsoluteFill>
        <Crowd t={t} ground={GROUND} open={crowd} asks={[bar(4) + 1.2, bar(4) + 1.2 + 60 / 111.62, bar(5), bar(5) + 120 / 111.62]} />
      </AbsoluteFill>
      {/* the rewind: three streaks run back into one empty chat box */}
      {t >= REWIND ? (
        <>
          <Streak p={rw} x0={TO.x} y0={GROUND - DC.h / 2} x1={BOX.cx} y1={BOX.cy} color={C.cyan} bend={-160} />
          <Streak p={pr(t, REWIND + 0.32, 0.75, EIO)} x0={360} y0={960} x1={BOX.cx - 120} y1={BOX.cy + 40} color={C.gold} bend={-220} />
          <Streak p={pr(t, REWIND + 0.4, 0.75, EIO)} x0={1580} y0={950} x1={BOX.cx + 120} y1={BOX.cy + 40} color={C.red} bend={-200} />
        </>
      ) : null}
      {boxIn > 0 && t < bar(8) ? (
        <div style={{ position: "absolute", left: BOX.cx - BOX.w / 2, top: BOX.cy - BOX.h / 2, transform: `scale(${lerp(0.7, 1, boxIn)})`, opacity: clamp01(boxIn * 1.4) }}>
          <ChatBox t={t} w={BOX.w} h={BOX.h} userAt={USER_AT} replyAt={REPLY_AT} />
        </div>
      ) : null}
      {boxIn > 0 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: BOX.cy + BOX.h / 2 + 36, display: "flex", justifyContent: "center" }}>
          <DateTag text="2022.11.30" o={pr(t, REWIND + 1.4, 0.6)} />
        </div>
      ) : null}
      <Lines at={Q1_AT} a={Q.q1[0]} b={Q.q1[1]} out={bar(2) - 0.05} />
      <Lines at={bar(2)} a={Q.q2[0]} b={Q.q2[1]} out={bar(4) - 0.05} />
      <Lines at={bar(4)} a={Q.q3[0]} b={Q.q3[1]} kw="谁的" kwAt={bar(5)} out={bar(6) - 0.05} />
      <Lines at={bar(6)} a={Q.q4[0]} b={Q.q4[1]} out={bar(8) + 0.02} />
      <Src at={0.3}>
        <span style={{ opacity: 1 - pr(t, PULL1[0], 0.3) }}>价格：央视财经 2026 年 7 月，深圳华强北，32GB DDR5 内存套装；10 月中旬报价仍在 3,300–3,900 元（什么值得买）· "4 倍多"为推算</span>
      </Src>
    </AbsoluteFill>
  );
};

// 片中 8–10 · The title lands as the main section comes in: the chat box opens out, the name rises.
export const Title3: React.FC = () => {
  const t = useT();
  const chars = Array.from("AI 到底改变了什么");
  const open = pr(t, bar(8), 0.55, EIO);
  const sub = pr(t, bar(8) + 0.9, 0.6, EO);
  const rule = pr(t, bar(8) + 0.5, 0.8, EO);
  return (
    <AbsoluteFill>
      <Backdrop glow={C.cyan} strength={0.12} />
      {open < 1 ? (
        <div style={{ position: "absolute", left: BOX.cx - BOX.w / 2, top: BOX.cy - BOX.h / 2, transform: `scale(${lerp(1, 1.9, open)})`, opacity: 1 - open }}>
          <ChatBox t={t} w={BOX.w} h={BOX.h} userAt={USER_AT} replyAt={REPLY_AT} />
        </div>
      ) : null}
      <div style={{ position: "absolute", left: 0, right: 0, top: 386, display: "flex", flexDirection: "column", alignItems: "center", gap: 34 }}>
        <div style={{ fontFamily: FONT, fontSize: 150, fontWeight: 900, letterSpacing: -5, color: C.fg, whiteSpace: "pre", display: "flex" }}>
          {chars.map((c, i) => {
            const p = pr(t, bar(8) + 0.1 + i * 0.045, 0.4, EO);
            return (
              <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top" }}>
                <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 105}%)` }}>{c}</span>
              </span>
            );
          })}
        </div>
        <div style={{ width: 760 * rule, height: 4, borderRadius: 2, background: `linear-gradient(90deg, transparent, ${C.cyan}, transparent)` }} />
        <div style={{ fontFamily: SERIF, fontSize: 38, fontWeight: 600, color: C.sub, opacity: sub, letterSpacing: 4, whiteSpace: "nowrap" }}>ChatGPT 四年 · 2022.11.30 – 2026.11.30</div>
      </div>
    </AbsoluteFill>
  );
};
