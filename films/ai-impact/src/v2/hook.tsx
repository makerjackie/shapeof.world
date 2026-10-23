import React from "react";
import { AbsoluteFill, random } from "remotion";
import { Odometer } from "../fx";
import { MiniRam, Pointer, RamKit } from "../samples/art";
import { FONT, SERIF } from "../theme";
import { DataHall } from "./art";
import { Backdrop, C, Cam, EBACK, EIO, EO, Glass, Label, lerp, Line, pr, Src, useT } from "./kit";

// 0:00–0:10 · The hook. The price jumps on every beat, flies into your cart on beat 2 and keeps jumping there, and
// slams into ¥3,800 as the band comes in (2.08). The 4 倍多 stamp, the click, 余额不足. On the bar-3 downbeat the camera
// pulls back: yours is one cart of many, and the memory in all of them streams up into an AI data hall.

export const HOOK_STEPS: [number, number][] = [
  [0.0, 900],
  [0.58, 1600],
  [1.08, 2400],
  [1.58, 3100],
  [2.08, 3800],
];
const STEPS = HOOK_STEPS;
const valueAt = (t: number) => {
  let v = STEPS[0][1];
  for (let i = 1; i < STEPS.length; i++) v = lerp(v, STEPS[i][1], pr(t, STEPS[i][0] - 0.12, 0.18, EO));
  return v;
};

// The cart card in the un-zoomed frame, the price slot (right edge, vertical centre of the number) and the pulled-back
// grid it becomes one tile of (scale 0.28).
const CARD = { x: 760, y: 300, w: 1040, h: 560 };
const SLOT = { x: CARD.x + 990, y: CARD.y + 360 };
const TILE = 0.28;
const TW = CARD.w * TILE;
const TH = CARD.h * TILE;
const GX = (1920 - (5 * TW + 4 * 28)) / 2;
const GY = 668;
const tilePos = (i: number) => ({ x: GX + (i % 5) * (TW + 28), y: GY + Math.floor(i / 5) * (TH + 26) });
const MINE = 2; // our tile: column 2, row 0
export const PULL = [6.08, 6.98] as const;
// Camera end key that puts the card's centre on our tile's centre.
const CAM_END: [number, number, number, number] = [
  PULL[1],
  tilePos(MINE).x + TW / 2 - 960 - TILE * (CARD.x + CARD.w / 2 - 960),
  tilePos(MINE).y + TH / 2 - 540 - TILE * (CARD.y + CARD.h / 2 - 540),
  TILE,
];
// Each cart's memory leaves for the data hall on its own eighth-beat (a ripple, 7.58 → 8.66).
export const leaveAt = (i: number) => 7.58 + ((i * 3) % 10) * 0.12;

type CardProps = {
  t: number;
  price: number;
  priceColor: string;
  priceScale: number;
  showPrice: boolean;
  broke: boolean;
  click: number;
  month: string;
  stock: string;
  ramGone: number;
  id: string;
};

const CartCard: React.FC<CardProps> = ({ t, price, priceColor, priceScale, showPrice, broke, click, month, stock, ramGone, id }) => (
  <Glass x={0} y={0} w={CARD.w} h={CARD.h} glow={broke ? C.red : undefined}>
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
    <div style={{ position: "absolute", left: 320, top: 192, fontSize: 24, color: C.muted, fontWeight: 600, whiteSpace: "nowrap" }}>16G×2 · 6000MHz · 台式机</div>
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
    {showPrice ? (
      <div
        style={{
          position: "absolute",
          right: 50,
          top: 360 - 71,
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
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 130, background: "rgba(255,255,255,0.04)", borderTop: `1px solid ${C.line}` }} />
    <div style={{ position: "absolute", left: 40, bottom: 46, fontSize: 28, fontWeight: 800, color: C.sub }}>合计</div>
    <div style={{ position: "absolute", left: 112, bottom: 34, fontSize: 52, fontWeight: 900, color: priceColor, fontVariantNumeric: "tabular-nums" }}>¥{Math.round(price).toLocaleString("en-US")}</div>
    <div
      style={{
        position: "absolute",
        right: 36,
        bottom: 22,
        width: 250,
        height: 86,
        borderRadius: 43,
        background: broke ? "rgba(255,90,95,0.2)" : C.orange,
        border: broke ? `2px solid ${C.red}` : "2px solid transparent",
        color: broke ? C.red : "#1a1208",
        fontSize: 34,
        fontWeight: 900,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${1 - click * 0.08}) translateX(${broke ? Math.sin((t - 3.08) * 60) * 6 * Math.max(0, 1 - (t - 3.08) / 0.35) : 0}px)`,
      }}
    >
      {broke ? "余额不足" : "结算"}
    </div>
  </Glass>
);

export const Hook: React.FC = () => {
  const t = useT();
  const v = valueAt(t);
  const heat = Math.min(1, (v - 900) / 2900);
  const pump = STEPS.slice(1).reduce((a, [s]) => a + Math.max(0, 1 - Math.abs(t - s) / 0.16) * 0.08, 0);
  const slam = t >= 2.08 ? Math.max(0, 1 - (t - 2.08) / 0.4) : 0;
  const intro = pr(t, 0, 0.3, EO);
  const fly = pr(t, 1.08, 0.42, EIO); // centre → the cart's price slot
  const cardIn = pr(t, 0.83, 0.5, EO);
  const numColor = `rgb(${Math.round(lerp(244, 255, heat))},${Math.round(lerp(240, 90, heat))},${Math.round(lerp(232, 95, heat))})`;
  const size = lerp(300, 132, fly) * (1 + pump) * lerp(1.25, 1, intro);
  const nx = lerp(960, SLOT.x, fly);
  const ny = lerp(520, SLOT.y, fly);
  const ax = lerp(-50, -100, fly);
  const stamp = pr(t, 2.58, 0.3, EBACK);
  const click = Math.max(0, 1 - Math.abs(t - 3.1) / 0.1);
  const broke = t >= 3.08;
  const stock = t < 3.58 ? "有货" : t < leaveAt(MINE) + 0.3 ? "库存紧张" : "缺货";
  const pull = pr(t, PULL[0], PULL[1] - PULL[0], EIO);
  const hall = pr(t, 7.08, 0.5, EBACK);
  const card = {
    t,
    price: v,
    priceColor: numColor,
    priceScale: 1 + pump + 0.18 * slam,
    showPrice: fly >= 1,
    broke,
    click,
    month: t >= 2.08 ? "2026 年 7 月" : "2025 年",
  };
  return (
    <AbsoluteFill>
      <Backdrop glow={pull > 0.5 ? C.cyan : C.red} at={pull > 0.5 ? [50, 34] : [62, 52]} strength={pull > 0.5 ? 0.16 : 0.06 + 0.2 * heat} />
      <Cam keys={[[0, 0, 0, 1], [PULL[0], 0, 0, 1], CAM_END]}>
        {cardIn > 0 ? (
          <div style={{ position: "absolute", left: CARD.x, top: CARD.y, transform: `translateX(${(1 - cardIn) * 360}px)`, opacity: cardIn }}>
            <CartCard {...card} stock={stock} ramGone={pr(t, leaveAt(MINE), 0.3)} id="v2mine" />
          </div>
        ) : null}
        {/* the number in flight; once it lands, the card's own price slot carries it on */}
        {fly < 1 ? (
          <div style={{ position: "absolute", left: nx, top: ny, transform: `translate(${ax}%, -50%)` }}>
            <Odometer value={v} size={size} prefix="¥" color={numColor} />
          </div>
        ) : null}
        {stamp > 0 ? (
          <div
            style={{
              position: "absolute",
              left: CARD.x + 690,
              top: CARD.y + 140,
              transform: `rotate(-9deg) scale(${1 + (1 - stamp) * 1.3})`,
              opacity: Math.min(1, stamp * 2),
              padding: "4px 20px",
              border: `6px solid ${C.red}`,
              borderRadius: 14,
              color: C.red,
              fontFamily: FONT,
              fontWeight: 900,
              fontSize: 60,
              whiteSpace: "nowrap",
              background: "rgba(7,9,11,0.6)",
            }}
          >
            4 倍多
          </div>
        ) : null}
        {/* sparks on each jump */}
        {STEPS.slice(1).map(([s0], i) => {
          const p = pr(t, s0, 0.35, EO);
          if (p <= 0 || p >= 1) return null;
          const cx = i < 2 ? nx : SLOT.x - 230;
          const cy = i < 2 ? ny : SLOT.y;
          return Array.from({ length: 12 }).map((_, k) => {
            const a = random(`h${i}-${k}`) * Math.PI * 2;
            const d = (i < 2 ? 240 : 170) + random(`hd${i}-${k}`) * 160;
            return (
              <div
                key={`${i}-${k}`}
                style={{ position: "absolute", left: cx + Math.cos(a) * d * p, top: cy + Math.sin(a) * d * p * 0.6, width: 16, height: 5, borderRadius: 3, background: i === 3 ? C.gold : numColor, transform: `rotate(${a}rad)`, opacity: 1 - p }}
              />
            );
          });
        })}
        {t >= 2.55 && t < PULL[0] ? (
          <div style={{ position: "absolute", left: lerp(1900, CARD.x + CARD.w - 150, pr(t, 2.55, 0.45, EIO)), top: lerp(1100, CARD.y + CARD.h - 70, pr(t, 2.55, 0.45, EIO)) }}>
            <Pointer press={click} />
          </div>
        ) : null}
      </Cam>
      {/* the pulled-back world: every other cart, the data hall, the memory streaming up */}
      {pull > 0 ? (
        <>
          {Array.from({ length: 10 }).map((_, i) => {
            if (i === MINE) return null;
            const p = pr(t, 6.48 + ((i * 7) % 10) * 0.05, 0.4, EO);
            const { x, y } = tilePos(i);
            return (
              <div key={i} style={{ position: "absolute", left: x, top: y, width: CARD.w, height: CARD.h, transformOrigin: "0 0", transform: `scale(${TILE * lerp(0.9, 1, p)})`, opacity: p }}>
                <CartCard {...card} price={3800} priceColor={C.red} priceScale={1} showPrice broke={false} click={0} stock={t < leaveAt(i) + 0.3 ? "库存紧张" : "缺货"} ramGone={pr(t, leaveAt(i), 0.3)} id={`v2t${i}`} />
              </div>
            );
          })}
          {hall > 0 ? (
            <div style={{ position: "absolute", left: 300, top: 330, opacity: Math.min(1, hall * 2), transform: `translateY(${(1 - hall) * -80}px)` }}>
              <DataHall w={1320} h={290} n={10} lit={pr(t, 7.58, 1.6, EIO)} t={t} />
            </div>
          ) : null}
          {Array.from({ length: 30 }).map((_, j) => {
            const i = j % 10;
            const k = Math.floor(j / 10);
            const p = pr(t, leaveAt(i) + k * 0.1, 0.62, EIO);
            if (p <= 0 || p >= 1) return null;
            const { x, y } = tilePos(i);
            const x0 = x + 30 + k * 12;
            const y0 = y + 46;
            const x1 = 350 + i * 128 + k * 20;
            const y1 = 500;
            return (
              <div key={`r${j}`} style={{ position: "absolute", left: lerp(x0, x1, p), top: lerp(y0, y1, p) - Math.sin(p * Math.PI) * 90, transform: `rotate(${(1 - p) * -25 + k * 8}deg)`, opacity: Math.min(1, (1 - p) * 5) }}>
                <MiniRam w={lerp(100, 56, p)} color={C.cyan} fill="#1c2733" />
              </div>
            );
          })}
        </>
      ) : null}
      <Label x={960} y={268} anchor="center" size={42} color={C.sub} at={-1}>
        <span style={{ opacity: 1 - pr(t, 0.9, 0.25) }}>去年 · 一套 32GB 内存条</span>
      </Label>
      <Line at={3.08} text="你的购物车，结不了账了。" out={6.3} />
      <Line at={6.58} text="因为 AI，在抢内存。" kw="在抢内存" kwAt={7.58} out={9.83} />
      <Src at={0.3}>价格：央视财经 2026 年 7 月，深圳华强北，32GB DDR5 内存套装 · "4 倍多"为推算（3800 ÷ 900 ≈ 4.2）· 购物车为示意</Src>
    </AbsoluteFill>
  );
};

// 0:10–0:12 · Title: the name rises in, the four-colour rule draws (钱 · 芯片 · 电 · 工作, the four threads that follow).
export const Title: React.FC = () => {
  const t = useT();
  const chars = Array.from("AI 到底改变了什么");
  const rule = pr(t, 10.58, 0.8, EO);
  const sub = pr(t, 11.08, 0.6, EO);
  return (
    <AbsoluteFill>
      <Backdrop glow={C.cyan} strength={0.12} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 380, display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
        <div style={{ fontFamily: FONT, fontSize: 150, fontWeight: 900, letterSpacing: -5, color: C.fg, whiteSpace: "pre", display: "flex" }}>
          {chars.map((c, i) => {
            const p = pr(t, 10.08 + i * 0.045, 0.4, EO);
            return (
              <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top" }}>
                <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 105}%)` }}>{c}</span>
              </span>
            );
          })}
        </div>
        <div style={{ display: "flex", width: 900 * rule, height: 6, borderRadius: 3, overflow: "hidden" }}>
          {[C.orange, C.cyan, C.violet, "#f472b6"].map((c) => (
            <div key={c} style={{ flex: 1, background: c }} />
          ))}
        </div>
        <div style={{ fontFamily: SERIF, fontSize: 40, fontWeight: 600, color: C.sub, opacity: sub, letterSpacing: 6, whiteSpace: "nowrap" }}>钱 · 芯片 · 电 · 工作</div>
      </div>
    </AbsoluteFill>
  );
};
