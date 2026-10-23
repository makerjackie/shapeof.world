import React from "react";
import { FONT } from "../theme";
import { Face, MiniRam, Pointer, RamKit } from "./art";
import { Ambience, Caption, captionEvents, Corner, EBACK, EIO, EO, Ev, Frame, lerp, Music, P, pr, Sounds, Source, useT } from "./common";

// Sample B · 购物车: your own cart. A click on 结算 on the first beat; the price balloons beat by beat, lands on the
// bar-1 downbeat as the band comes in, a 余额不足 toast drops, the buyer's face falls. Then an AI data centre's order
// panel slides over and fills with memory while your item sells out. A generic cart, not any real store's interface.

const STEPS: [number, number][] = [
  [0.0, 900],
  [0.58, 1500],
  [1.08, 2300],
  [1.58, 3000],
  [2.08, 3800],
];
const priceAt = (t: number) => {
  let v = STEPS[0][1];
  for (let i = 1; i < STEPS.length; i++) {
    const [s, val] = STEPS[i];
    const p = pr(t, s - 0.12, 0.2, EO);
    v = lerp(v, val, p);
  }
  return Math.round(v / 10) * 10;
};

const EVENTS: Ev[] = [
  [0.08, "sfx-mechanical-01.wav", 0.8],
  [0.08, "sfx-ui-01.wav", 0.5],
  ...STEPS.slice(1, 4).map(([s]): Ev => [s - 0.12, "sfx-mechanical-13.wav", 0.75]),
  [2.08, "sfx-impact-08.wav", 0.95],
  [2.08, "sfx-impact-06.wav", 0.55],
  [2.58, "sfx-notification-02.wav", 0.6],
  ...captionEvents(2.08),
  [3.08, "sfx-impact-05.wav", 0.45],
  [5.5, "sfx-transition-02.wav", 0.7],
  ...captionEvents(6.08),
  ...Array.from({ length: 16 }, (_, i): Ev => [6.08 + i * 0.094, i % 2 ? "sfx-ui-01.wav" : "sfx-impact-01.wav", 0.28]),
  [7.08, "sfx-impact-05.wav", 0.5],
  [7.58, "sfx-notification-18.wav", 0.45],
];

const WIN = { x: 720, y: 300, w: 1080, h: 690 };

export const SampleB: React.FC = () => {
  const t = useT();
  const price = priceAt(t);
  const heat = Math.min(1, (price - 900) / 2900);
  const landed = t >= 2.08;
  const hit = landed ? Math.max(0, 1 - (t - 2.08) / 0.45) : 0;
  const shock = pr(t, 2.08, 0.18, EBACK);
  const toast = pr(t, 2.58, 0.35, EBACK);
  const press = Math.max(0, 1 - Math.abs(t - 0.1) / 0.1);
  const panel = pr(t, 5.58, 0.5, EIO);
  const soldOut = t >= 7.58;
  // pointer: glides in, clicks, then hesitates
  const px = t < 0.08 ? lerp(1700, 1660, t / 0.08) : 1660 + Math.sin((t - 0.08) * 2.6) * 26 * pr(t, 2.3, 0.6) - 70 * pr(t, 2.1, 0.5);
  const py = t < 0.08 ? lerp(1010, 905, t / 0.08) : 905 + Math.cos((t - 0.08) * 2.1) * 14 * pr(t, 2.3, 0.6) + 40 * pr(t, 2.1, 0.5);
  const dateFlip = Math.min(4, Math.floor(Math.max(0, t - 0.46) / 0.5) + (t >= 0.46 ? 1 : 0));
  const months = ["2025 年 6 月", "2025 年 10 月", "2026 年 1 月", "2026 年 4 月", "2026 年 7 月"];
  const priceColor = `rgb(${Math.round(lerp(212, 229, heat))},${Math.round(lerp(82, 72, heat))},${Math.round(lerp(28, 77, heat))})`;
  return (
    <Frame bg="radial-gradient(ellipse 90% 80% at 30% 30%, #fbf5ea 0%, #f0e6d4 65%, #e7d9c0 100%)">
      {/* soft background shapes so the frame never sits still */}
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ position: "absolute", left: 200 + i * 520 + Math.sin(t * 0.7 + i) * 30, top: 80 + i * 160 + Math.cos(t * 0.6 + i) * 20, width: 520, height: 520, borderRadius: "50%", background: "rgba(212,82,28,0.05)" }} />
      ))}
      {/* the buyer */}
      <div style={{ position: "absolute", left: 210, top: 520 + Math.sin(t * 2) * 3, transform: `scale(${1 + 0.06 * hit})`, transformOrigin: "50% 100%" }}>
        <Face size={360} shock={shock} sweat={pr(t, 2.58, 1.2, (x) => x)} />
        <div style={{ position: "absolute", left: 140, top: 300, fontFamily: FONT, fontSize: 30, fontWeight: 900, color: P.paper, background: P.ink, padding: "2px 18px", borderRadius: 10 }}>你</div>
      </div>
      {/* the cart window */}
      <div style={{ position: "absolute", left: WIN.x, top: WIN.y, width: WIN.w, height: WIN.h, borderRadius: 30, background: "#fffdf8", boxShadow: "0 30px 70px rgba(60,40,10,0.22)", overflow: "hidden", fontFamily: FONT, color: P.ink }}>
        <div style={{ position: "absolute", left: 44, top: 30, fontSize: 42, fontWeight: 900 }}>
          购物车 <span style={{ fontSize: 30, color: "#8a8a85" }}>(1)</span>
        </div>
        <div style={{ position: "absolute", right: 40, top: 32, padding: "6px 18px", borderRadius: 999, background: landed ? "#fde8e0" : "#efe9dd", color: landed ? P.orange : "#6b6a66", fontSize: 26, fontWeight: 800, transform: `translateY(${t >= 0.46 && (t - 0.46) % 0.5 < 0.08 ? -4 : 0}px)` }}>
          {months[dateFlip]}
        </div>
        <div style={{ position: "absolute", left: 40, right: 40, top: 100, height: 2, background: "#efe8da" }} />
        {/* product row */}
        <div style={{ position: "absolute", left: 40, top: 128, width: 230, height: 168, borderRadius: 18, background: "#f1ecdf", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 20, top: 44 }}>
            <RamKit w={180} id="b" />
          </div>
        </div>
        <div style={{ position: "absolute", left: 300, top: 138, fontSize: 38, fontWeight: 800 }}>DDR5 内存条 32GB</div>
        <div style={{ position: "absolute", left: 300, top: 194, fontSize: 25, color: "#7d7b75", fontWeight: 600 }}>16G×2 · 6000MHz · 台式机</div>
        <div style={{ position: "absolute", left: 300, top: 240, padding: "3px 14px", borderRadius: 8, background: soldOut ? "#fde4e2" : "#e2f4ea", color: soldOut ? P.red : P.green, fontSize: 24, fontWeight: 800 }}>{soldOut ? "被抢光" : "有货"}</div>
        <div style={{ position: "absolute", right: 44, top: 196, fontSize: lerp(72, 104, heat) * (1 + 0.15 * hit), fontWeight: 900, color: priceColor, letterSpacing: -2, fontVariantNumeric: "tabular-nums", lineHeight: 1, transform: "translateY(-50%)" }}>
          ¥{price.toLocaleString("en-US")}
        </div>
        {/* last year vs now */}
        <div style={{ position: "absolute", left: 40, right: 40, top: 330, height: 2, background: "#efe8da" }} />
        <div style={{ position: "absolute", left: 44, top: 350, fontSize: 26, fontWeight: 800, color: "#6b6a66" }}>同一套内存条</div>
        {[
          { k: "2025 年 6 月", v: 900, c: "#b9b2a4", at: 0.6 },
          { k: "2026 年 7 月", v: 3800, c: P.red, at: 2.08 },
        ].map((b, i) => {
          const g = b.v === 900 ? pr(t, 0.2, 0.5) : pr(t, 2.08, 0.5, EO);
          const w = (b.v / 3800) * 640 * g;
          return (
            <div key={b.k} style={{ position: "absolute", left: 44, top: 398 + i * 70 }}>
              <div style={{ position: "absolute", left: 0, top: 6, width: 180, fontSize: 24, fontWeight: 700, color: "#6b6a66" }}>{b.k}</div>
              <div style={{ position: "absolute", left: 190, top: 4, width: Math.max(4, w), height: 40, borderRadius: 8, background: b.c }} />
              <div style={{ position: "absolute", left: 200 + Math.max(4, w), top: 2, fontSize: 32, fontWeight: 900, color: i ? P.red : "#6b6a66", opacity: g > 0.05 ? 1 : 0, whiteSpace: "nowrap" }}>¥{b.v.toLocaleString("en-US")}</div>
            </div>
          );
        })}
        {/* footer */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 150, background: "#f7f1e6" }} />
        <div style={{ position: "absolute", left: 44, bottom: 50, fontSize: 30, fontWeight: 800, color: "#6b6a66" }}>合计</div>
        <div style={{ position: "absolute", left: 120, bottom: 34, fontSize: 64, fontWeight: 900, color: priceColor, fontVariantNumeric: "tabular-nums", letterSpacing: -1 }}>¥{price.toLocaleString("en-US")}</div>
        <div
          style={{
            position: "absolute",
            right: 40,
            bottom: 28,
            width: 270,
            height: 96,
            borderRadius: 48,
            background: landed ? "#c9c3b8" : P.orange,
            color: "#fff",
            fontSize: 38,
            fontWeight: 900,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${1 - press * 0.08})`,
          }}
        >
          {landed ? "买不起了" : "结算"}
        </div>
        {/* toast */}
        {toast > 0 ? (
          <div style={{ position: "absolute", left: "50%", top: lerp(-80, 26, toast), transform: "translateX(-50%)", padding: "14px 34px", borderRadius: 16, background: P.ink, color: P.paper, fontSize: 34, fontWeight: 900, boxShadow: "0 14px 30px rgba(0,0,0,0.3)", whiteSpace: "nowrap" }}>
            ⚠ 余额不足
          </div>
        ) : null}
      </div>
      {/* the AI data centre's order panel */}
      {panel > 0 ? <AiOrder t={t} x={lerp(1960, 1180, panel)} /> : null}
      <div style={{ position: "absolute", left: px, top: py }}>
        <Pointer press={press} />
      </div>
      <Caption text="内存条，一年涨到 4 倍多。" kw="4 倍多" kwAt={3.08} start={2.08} end={5.58} x={110} y={150} />
      <Caption text="AI 在抢内存。" kw="抢内存" kwAt={7.08} start={6.08} x={110} y={150} />
      <Corner />
      <Source>价格：央视财经 2026 年 7 月 · 深圳华强北 · 32GB DDR5 内存套装 · "4 倍多"为推算（3800 ÷ 900）· 购物车为示意</Source>
      <Music gain={0.7} />
      <Ambience file="ambience-machine-02.wav" from={5.08} level={0.3} />
      <Sounds ev={EVENTS} />
    </Frame>
  );
};

const AiOrder: React.FC<{ t: number; x: number }> = ({ t, x }) => {
  const n = Math.max(0, Math.min(16, Math.floor((t - 6.08) / 0.094) + 1));
  return (
    <div style={{ position: "absolute", left: x, top: 330, width: 640, height: 640, borderRadius: 30, background: "linear-gradient(180deg, #232a36, #171b22)", boxShadow: "0 30px 70px rgba(0,0,0,0.35)", fontFamily: FONT, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 36, top: 28, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 54, height: 54, borderRadius: 12, background: "#2f3848", display: "flex", flexDirection: "column", justifyContent: "center", gap: 6, padding: "0 10px", boxSizing: "border-box" }}>
          {[0, 1, 2].map((k) => (
            <div key={k} style={{ height: 8, borderRadius: 4, background: Math.sin(t * 9 + k * 2) > 0 ? "#3ddc97" : "#4dd4ff" }} />
          ))}
        </div>
        <div style={{ fontSize: 40, fontWeight: 900, color: "#e6f7ff" }}>AI 数据中心的订单</div>
      </div>
      <div style={{ position: "absolute", left: 36, right: 36, top: 112, height: 2, background: "#323b4b" }} />
      {Array.from({ length: 16 }).map((_, i) => {
        if (i >= n) return null;
        const age = Math.min(1, (t - (6.08 + i * 0.094)) / 0.2);
        const col = i % 4;
        const row = Math.floor(i / 4);
        return (
          <div key={i} style={{ position: "absolute", left: 40 + col * 142, top: 140 + row * 112, width: 128, height: 92, borderRadius: 14, background: "#2a3240", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${lerp(0.4, 1, EO(age))})`, opacity: age }}>
            <MiniRam w={92} color="#cfe9ff" fill="#3c4656" />
          </div>
        );
      })}
    </div>
  );
};
