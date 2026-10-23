import React from "react";
import { FONT } from "../theme";
import { MiniRam, RamKit } from "./art";
import { EO, lerp, P } from "./common";

// The shopping cart from sample B as a component with explicit state, so a scene can drive it beat by beat.
// A generic cart, not any real store's interface.

export const WIN = { x: 720, y: 300, w: 1080, h: 690 };
// Where the price sits inside the window (right edge, vertical centre), for the hand-off from the big number.
export const PRICE_SLOT = { right: WIN.x + WIN.w - 44, cy: WIN.y + 196 };

export type CartState = {
  price: number;
  priceColor: string;
  priceSize: number; // px
  showPrice: boolean;
  month: string;
  hot: boolean; // date chip in alarm colours
  bar900: number; // 0–1 growth of the comparison bars
  bar3800: number;
  stock: "有货" | "库存紧张" | "被抢光";
  bell: number; // 0–1 the price-drop alert switched on
  press: number; // 0–1 button press
  unaffordable: boolean;
  toast: number; // 0–1 toast in, can go back to 0
  dim: number; // 0–1 the window dims when the data centre takes over
};

const STOCK = { 有货: ["#e2f4ea", P.green], 库存紧张: ["#fdebd8", P.orange], 被抢光: ["#fde4e2", P.red] } as const;

export const Cart: React.FC<{ s: CartState; t: number }> = ({ s, t }) => (
  <div style={{ position: "absolute", left: WIN.x, top: WIN.y, width: WIN.w, height: WIN.h, borderRadius: 30, background: "#fffdf8", boxShadow: "0 30px 70px rgba(60,40,10,0.22)", overflow: "hidden", fontFamily: FONT, color: P.ink }}>
    <div style={{ position: "absolute", left: 44, top: 30, fontSize: 42, fontWeight: 900 }}>
      购物车 <span style={{ fontSize: 30, color: "#8a8a85" }}>(1)</span>
    </div>
    <div style={{ position: "absolute", right: 40, top: 32, padding: "6px 18px", borderRadius: 999, background: s.hot ? "#fde8e0" : "#efe9dd", color: s.hot ? P.orange : "#6b6a66", fontSize: 26, fontWeight: 800 }}>{s.month}</div>
    <div style={{ position: "absolute", left: 40, right: 40, top: 100, height: 2, background: "#efe8da" }} />
    <div style={{ position: "absolute", left: 40, top: 128, width: 230, height: 168, borderRadius: 18, background: "#f1ecdf", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 20, top: 44 }}>
        <RamKit w={180} id="cart" />
      </div>
    </div>
    <div style={{ position: "absolute", left: 300, top: 138, fontSize: 38, fontWeight: 800 }}>DDR5 内存条 32GB</div>
    <div style={{ position: "absolute", left: 300, top: 194, fontSize: 25, color: "#7d7b75", fontWeight: 600 }}>16G×2 · 6000MHz · 台式机</div>
    <div style={{ position: "absolute", left: 300, top: 240, display: "flex", gap: 12, alignItems: "center" }}>
      <div style={{ padding: "3px 14px", borderRadius: 8, background: STOCK[s.stock][0], color: STOCK[s.stock][1], fontSize: 24, fontWeight: 800 }}>{s.stock}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 14px", borderRadius: 8, border: `2px solid ${s.bell > 0.5 ? P.orange : "#d9d2c4"}`, color: s.bell > 0.5 ? P.orange : "#8a8a85", fontSize: 22, fontWeight: 800, transform: `rotate(${Math.sin(t * 40) * 8 * Math.max(0, 1 - Math.abs(s.bell - 0.5) * 2)}deg)` }}>
        <svg width="20" height="22" viewBox="0 0 20 22">
          <path d="M10,2 C5,2 4,6 4,10 L4,14 L2,17 L18,17 L16,14 L16,10 C16,6 15,2 10,2 Z" fill={s.bell > 0.5 ? P.orange : "none"} stroke="currentColor" strokeWidth="2" />
          <circle cx="10" cy="19.5" r="2" fill="currentColor" />
        </svg>
        {s.bell > 0.5 ? "已开降价提醒" : "降价提醒"}
      </div>
    </div>
    {s.showPrice ? (
      <div style={{ position: "absolute", right: 44, top: 196, fontSize: s.priceSize, fontWeight: 900, color: s.priceColor, letterSpacing: -2, fontVariantNumeric: "tabular-nums", lineHeight: 1, transform: "translateY(-50%)" }}>¥{s.price.toLocaleString("en-US")}</div>
    ) : null}
    <div style={{ position: "absolute", left: 40, right: 40, top: 330, height: 2, background: "#efe8da" }} />
    <div style={{ position: "absolute", left: 44, top: 350, fontSize: 26, fontWeight: 800, color: "#6b6a66" }}>同一套内存条</div>
    {[
      { k: "2025 年 6 月", v: 900, c: "#b9b2a4", g: s.bar900 },
      { k: "2026 年 7 月", v: 3800, c: P.red, g: s.bar3800 },
    ].map((b, i) => {
      const w = (b.v / 3800) * 640 * b.g;
      return (
        <div key={b.k} style={{ position: "absolute", left: 44, top: 398 + i * 70 }}>
          <div style={{ position: "absolute", left: 0, top: 6, width: 180, fontSize: 24, fontWeight: 700, color: "#6b6a66" }}>{b.k}</div>
          <div style={{ position: "absolute", left: 190, top: 4, width: Math.max(4, w), height: 40, borderRadius: 8, background: b.c }} />
          <div style={{ position: "absolute", left: 200 + Math.max(4, w), top: 2, fontSize: 32, fontWeight: 900, color: i ? P.red : "#6b6a66", opacity: b.g > 0.05 ? 1 : 0, whiteSpace: "nowrap" }}>¥{b.v.toLocaleString("en-US")}</div>
        </div>
      );
    })}
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 150, background: "#f7f1e6" }} />
    <div style={{ position: "absolute", left: 44, bottom: 50, fontSize: 30, fontWeight: 800, color: "#6b6a66" }}>合计</div>
    <div style={{ position: "absolute", left: 120, bottom: 34, fontSize: 64, fontWeight: 900, color: s.priceColor, fontVariantNumeric: "tabular-nums", letterSpacing: -1, opacity: s.showPrice ? 1 : 0 }}>¥{s.price.toLocaleString("en-US")}</div>
    <div style={{ position: "absolute", right: 40, bottom: 28, width: 270, height: 96, borderRadius: 48, background: s.unaffordable ? "#c9c3b8" : P.orange, color: "#fff", fontSize: 38, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${1 - s.press * 0.08})` }}>
      {s.unaffordable ? "买不起了" : "结算"}
    </div>
    {s.toast > 0 ? (
      <div style={{ position: "absolute", left: "50%", top: lerp(-80, 26, s.toast), transform: "translateX(-50%)", padding: "14px 34px", borderRadius: 16, background: P.ink, color: P.paper, fontSize: 34, fontWeight: 900, boxShadow: "0 14px 30px rgba(0,0,0,0.3)", whiteSpace: "nowrap" }}>⚠ 余额不足</div>
    ) : null}
    {s.dim > 0 ? <div style={{ position: "absolute", inset: 0, background: "#e9dfcf", opacity: s.dim * 0.45 }} /> : null}
  </div>
);

// The data centre's order: tiles of memory keep arriving; after the panel fills, the list scrolls so the order never ends.
export const AiOrder: React.FC<{ t: number; x: number; start: number; every?: number }> = ({ t, x, start, every = 0.094 }) => {
  const nf = (t - start) / every + 1; // tiles so far, continuous
  const n = Math.max(0, Math.floor(nf));
  const scroll = Math.max(0, nf / 4 - 4) * 112; // after four full rows the list scrolls at the arrival rate
  return (
    <div style={{ position: "absolute", left: x, top: 330, width: 640, height: 640, borderRadius: 30, background: "linear-gradient(180deg, #232a36, #171b22)", boxShadow: "0 30px 70px rgba(0,0,0,0.35)", fontFamily: FONT, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 120, bottom: 0, overflow: "hidden" }}>
        {Array.from({ length: n }).map((_, i) => {
          const age = Math.min(1, (t - (start + i * every)) / 0.2);
          const col = i % 4;
          const row = Math.floor(i / 4);
          const y = 20 + row * 112 - scroll;
          if (y < -120 || y > 640) return null;
          return (
            <div key={i} style={{ position: "absolute", left: 40 + col * 142, top: y, width: 128, height: 92, borderRadius: 14, background: "#2a3240", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${lerp(0.4, 1, EO(age))})`, opacity: age }}>
              <MiniRam w={92} color="#cfe9ff" fill="#3c4656" />
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 118, background: "#1d232d" }} />
      <div style={{ position: "absolute", left: 36, top: 28, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 54, height: 54, borderRadius: 12, background: "#2f3848", display: "flex", flexDirection: "column", justifyContent: "center", gap: 6, padding: "0 10px", boxSizing: "border-box" }}>
          {[0, 1, 2].map((k) => (
            <div key={k} style={{ height: 8, borderRadius: 4, background: Math.sin(t * 9 + k * 2) > 0 ? "#3ddc97" : "#4dd4ff" }} />
          ))}
        </div>
        <div style={{ fontSize: 40, fontWeight: 900, color: "#e6f7ff" }}>AI 数据中心的订单</div>
      </div>
      <div style={{ position: "absolute", left: 36, right: 36, top: 116, height: 2, background: "#323b4b" }} />
    </div>
  );
};
