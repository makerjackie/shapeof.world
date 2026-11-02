// Type over the chart: header (brand + total population ticker), world top-5 panel, callouts, big numbers,
// alarms, year slams and milestone chips.
import React from "react";
import { Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { births, CN_UN, deaths, popAt, WORLD } from "./data";
import { ALL_EVENTS, CURSOR, Ev } from "./plan";
import { C, FONT_CN, FONT_LAT, FONT_NUM } from "./theme";
import { BAR, FPS } from "./time";

export const useBar = () => useCurrentFrame() / FPS / BAR;
const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const EO = Easing.bezier(0.16, 1, 0.3, 1);
const EIO = Easing.bezier(0.65, 0, 0.35, 1);
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
// 0..1..0 visibility of [a, b] (bars), fade lengths in bars
export const vis = (bar: number, a: number, b: number, fi = 0.12, fo = 0.18) => Math.min(clamp01((bar - a) / fi), clamp01((b - bar) / fo));
const sec = (bars: number) => bars * BAR;
const TS = "0 2px 8px rgba(0,0,0,0.9), 0 0 30px rgba(0,0,0,0.75)";

// ---------------------------------------------------------------- brand line (always on until the end card)
export const Brand: React.FC<{ title?: string; opacity?: number }> = ({ title = "中国人口", opacity = 1 }) => (
  <div style={{ position: "absolute", left: 64, top: 196, display: "flex", alignItems: "center", gap: 12, opacity }}>
    <Img src={staticFile("mark-disc.png")} style={{ width: 38, height: 38, borderRadius: 19 }} />
    <span style={{ fontFamily: FONT_CN, fontWeight: 700, fontSize: 27, color: C.fg, letterSpacing: 1 }}>世界的形状</span>
    <span style={{ width: 2, height: 22, background: "rgba(255,255,255,0.3)", margin: "0 4px" }} />
    <span style={{ fontFamily: FONT_CN, fontWeight: 700, fontSize: 27, color: "#d9dde6" }}>{title}</span>
    <span style={{ fontFamily: FONT_LAT, fontWeight: 500, fontSize: 19, color: C.muted, marginTop: 3 }}>China Population</span>
  </div>
);

// ---------------------------------------------------------------- header ticker
export const Header: React.FC<{ opacity: number; proj?: number }> = ({ opacity, proj }) => {
  const bar = useBar();
  if (opacity <= 0) return null;
  const c = CURSOR(bar);
  let pop = popAt(c);
  let year = Math.floor(c + 1e-6);
  const nat = births(c) - deaths(c);
  let up = nat >= 0;
  let tag = "自然增长";
  let badge = `${up ? "▲ +" : "▼ −"}${Math.abs(Math.round(nat)).toLocaleString("en-US")}万`;
  if (proj !== undefined) {
    // UN medium variant, scaled to keep the NBS 2025 value at 2025
    const y = proj;
    const y0 = Math.floor(y);
    const f = y - y0;
    const v = lerp(CN_UN[String(Math.min(2100, y0))], CN_UN[String(Math.min(2100, y0 + 1))], f);
    pop = y <= 2025 ? popAt(y) : v * 10000 * (popAt(2025) / (CN_UN["2025"] * 10000));
    year = Math.floor(y);
    up = false;
    tag = "联合国预测";
    badge = `较峰值 ${Math.round(((pop - 141260) / 141260) * 100)}%`;
  }
  // milestone glow
  let glow = 0;
  for (const e of ALL_EVENTS) if (e.k === "mile") glow = Math.max(glow, 1 - clamp01((bar - e.at) / 0.8) - (bar < e.at ? 1 : 0));
  glow = Math.max(0, glow);
  const col = proj !== undefined ? "#c9ced9" : up ? C.up : C.down;
  const hi = up ? "255,59,87" : "25,227,138";
  return (
    <div style={{ position: "absolute", left: 60, top: 244, opacity }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
        <div
          style={{
            fontFamily: FONT_NUM,
            fontWeight: 800,
            fontSize: 136,
            lineHeight: 0.92,
            color: glow > 0.05 ? `color-mix(in srgb, ${C.gold} ${Math.round(glow * 100)}%, ${col})` : col,
            textShadow: `0 0 ${24 + glow * 40}px rgba(${glow > 0.05 ? "255,207,92" : hi},${0.45 + glow * 0.4})`,
            letterSpacing: -1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {Math.round(pop).toLocaleString("en-US")}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingBottom: 8 }}>
          <span style={{ fontFamily: FONT_CN, fontWeight: 500, fontSize: 21, color: C.sub }}>万人 · {tag}</span>
          <span
            style={{
              fontFamily: FONT_NUM,
              fontWeight: 700,
              fontSize: 30,
              color: proj !== undefined ? "#e6e9f0" : up ? "#ffd9de" : "#d6ffe9",
              background: proj !== undefined ? "rgba(140,150,170,0.25)" : `rgba(${hi},0.28)`,
              border: `1px solid ${proj !== undefined ? "rgba(200,205,215,0.4)" : `rgba(${hi},0.7)`}`,
              borderRadius: 6,
              padding: "1px 10px",
              whiteSpace: "nowrap",
            }}
          >
            {badge}
          </span>
        </div>
      </div>
      <div style={{ marginTop: 10, display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontFamily: FONT_NUM, fontWeight: 700, fontSize: 64, color: C.fg, textShadow: TS }}>{year}</span>
        <span style={{ fontFamily: FONT_CN, fontWeight: 700, fontSize: 30, color: C.sub }}>年</span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- world top 5
const rankAt = (y: number) => {
  const list = WORLD[String(Math.max(1950, Math.min(2100, y)))];
  const m = new Map<string, { v: number; r: number }>();
  list.forEach(([n, v], i) => m.set(n, { v, r: i }));
  return m;
};
export const Panel: React.FC<{ opacity: number; yearF: number; n?: number; big?: boolean }> = ({ opacity, yearF, n = 5, big }) => {
  if (opacity <= 0) return null;
  const yf = Math.max(1950, Math.min(2100, yearF));
  const y0 = Math.floor(yf);
  const f = EIO(clamp01((yf - y0) / 1));
  const A = rankAt(y0);
  const B = rankAt(y0 + 1);
  const names = new Set([...A.keys(), ...B.keys()]);
  const rows = [...names].map((name) => {
    const a = A.get(name);
    const b = B.get(name);
    const v = lerp(a ? a.v : (b?.v ?? 0) * 0.98, b ? b.v : a!.v, f);
    const r = lerp(a ? a.r : 11, b ? b.r : 11, f);
    return { name, v, r };
  });
  const vmax = Math.max(...rows.map((r) => r.v));
  const RH = big ? 92 : 54;
  const W0 = big ? 900 : 410;
  return (
    <div
      style={{
        position: big ? "relative" : "absolute",
        right: big ? undefined : 56,
        top: big ? undefined : 486,
        width: W0,
        opacity,
      }}
    >
      {!big && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.14)", paddingBottom: 6 }}>
          <span style={{ fontFamily: FONT_CN, fontWeight: 700, fontSize: 24, color: "#dfe3ea" }}>世界人口前五</span>
          <span style={{ fontFamily: FONT_CN, fontWeight: 500, fontSize: 18, color: C.muted }}>联合国估算 · {Math.round(yf)}</span>
        </div>
      )}
      <div style={{ position: "relative", height: RH * n }}>
        {rows.map((r) => {
          const o = clamp01(n - 0.4 - r.r);
          if (o <= 0) return null;
          const cn = r.name === "中国";
          const ind = r.name === "印度";
          return (
            <div key={r.name} style={{ position: "absolute", left: 0, right: 0, top: r.r * RH, height: RH, opacity: o }}>
              <div style={{ display: "flex", alignItems: "center", height: RH - (big ? 22 : 12), gap: big ? 20 : 12 }}>
                <span style={{ fontFamily: FONT_NUM, fontWeight: 700, fontSize: big ? 40 : 24, color: C.muted, width: big ? 50 : 26 }}>{Math.round(r.r) + 1}</span>
                <span
                  style={{
                    fontFamily: FONT_CN,
                    fontWeight: cn ? 900 : 700,
                    fontSize: big ? 46 : 26,
                    color: cn ? C.upHi : ind ? "#ffd38a" : "#e7eaf0",
                    flex: 1,
                  }}
                >
                  {r.name}
                </span>
                <span style={{ fontFamily: FONT_NUM, fontWeight: 700, fontSize: big ? 50 : 28, color: cn ? C.upHi : C.fg, fontVariantNumeric: "tabular-nums" }}>
                  {r.v.toFixed(2)}
                  <span style={{ fontFamily: FONT_CN, fontSize: big ? 28 : 18, color: C.sub, marginLeft: 3 }}>亿</span>
                </span>
              </div>
              <div style={{ height: big ? 8 : 4, borderRadius: 4, background: "rgba(255,255,255,0.06)" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${(r.v / vmax) * 100}%`,
                    borderRadius: 4,
                    background: cn ? "linear-gradient(90deg,#ff3b57,#ff8a9a)" : ind ? "linear-gradient(90deg,#ff9f3b,#ffd38a)" : "linear-gradient(90deg,#4b5468,#8a93a8)",
                    boxShadow: cn ? "0 0 12px rgba(255,59,87,0.7)" : undefined,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- events
const Glitch: React.FC<{ k: number; children: React.ReactNode }> = ({ k, children }) => {
  // k: 0 = calm; while >0 the block splits into offset red / cyan copies
  if (k <= 0.01) return <>{children}</>;
  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, transform: `translateX(${-8 * k}px)`, opacity: 0.7 * k, filter: "sepia(1) saturate(8) hue-rotate(-50deg)", mixBlendMode: "screen" }}>{children}</div>
      <div style={{ position: "absolute", inset: 0, transform: `translateX(${8 * k}px)`, opacity: 0.7 * k, filter: "sepia(1) saturate(8) hue-rotate(140deg)", mixBlendMode: "screen" }}>{children}</div>
      <div style={{ position: "relative" }}>{children}</div>
    </div>
  );
};

const Callout: React.FC<{ e: Extract<Ev, { k: "call" }>; bar: number }> = ({ e, bar }) => {
  const v = vis(bar, e.at, e.out, 0.14, 0.2);
  if (v <= 0) return null;
  const inK = EO(clamp01((bar - e.at) / 0.3));
  const g = clamp01(1 - (bar - e.at) / 0.12);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 806,
        padding: "22px 60px 26px 60px",
        background: "linear-gradient(90deg, rgba(4,5,8,0.82) 0%, rgba(4,5,8,0.62) 62%, rgba(4,5,8,0) 100%)",
        opacity: v,
        transform: `translateX(${(1 - inK) * -50}px)`,
        maxWidth: 900,
      }}
    >
      <Glitch k={g}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <span
            style={{
              fontFamily: FONT_CN,
              fontWeight: 700,
              fontSize: 22,
              color: e.tc,
              border: `1.5px solid ${e.tc}`,
              background: `${e.tc}22`,
              borderRadius: 5,
              padding: "1px 10px",
            }}
          >
            {e.tag}
          </span>
        </div>
        <div style={{ fontFamily: FONT_CN, fontWeight: 900, fontSize: 54, color: C.fg, lineHeight: 1.2, textShadow: TS, whiteSpace: "nowrap" }}>{e.title}</div>
        {(e.sub || []).map((s, i) => {
          const k = EO(clamp01((bar - e.at - 0.12 - i * 0.1) / 0.3));
          return (
            <div key={i} style={{ fontFamily: FONT_CN, fontWeight: 500, fontSize: 30, color: "#c3c9d6", marginTop: 6, opacity: k, transform: `translateY(${(1 - k) * 10}px)`, textShadow: TS, whiteSpace: "nowrap" }}>
              {s}
            </div>
          );
        })}
      </Glitch>
    </div>
  );
};

const Big: React.FC<{ e: Extract<Ev, { k: "big" }>; bar: number }> = ({ e, bar }) => {
  const v = vis(bar, e.at, e.out, 0.06, 0.25);
  if (v <= 0) return null;
  const k = EO(clamp01((bar - e.at) / 0.22));
  const col = e.c === "up" ? C.up : e.c === "down" ? C.down : C.gold;
  const hi = e.c === "up" ? "255,59,87" : e.c === "down" ? "25,227,138" : "255,207,92";
  const big = e.text.length > 6 ? 128 : 150;
  return (
    <div style={{ position: "absolute", left: 60, top: e.y ?? 1010, opacity: v, transform: `scale(${1.35 - 0.35 * k})`, transformOrigin: "0% 50%", filter: `blur(${(1 - k) * 10}px)` }}>
      <Glitch k={clamp01(1 - (bar - e.at) / 0.15)}>
        <div style={{ fontFamily: FONT_NUM, fontWeight: 800, fontSize: big, color: col, lineHeight: 1, textShadow: `0 0 40px rgba(${hi},0.7), ${TS}`, whiteSpace: "nowrap" }}>{e.text}</div>
      </Glitch>
      {e.sub && <div style={{ fontFamily: FONT_CN, fontWeight: 700, fontSize: 32, color: "#dfe4ec", marginTop: 10, textShadow: TS, whiteSpace: "nowrap" }}>{e.sub}</div>}
    </div>
  );
};

const Alarm: React.FC<{ e: Extract<Ev, { k: "alarm" }>; bar: number }> = ({ e, bar }) => {
  const v = vis(bar, e.at, e.out, 0.02, 0.25);
  if (v <= 0) return null;
  const dt = bar - e.at;
  const blink = dt < 0.4 ? (Math.floor(dt * 30) % 2 === 0 ? 1 : 0.25) : 0.75 + 0.25 * Math.cos((dt % 0.25) * Math.PI * 8);
  const k = EO(clamp01(dt / 0.25));
  return (
    <div style={{ position: "absolute", inset: 0, opacity: v }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 55%, rgba(120,0,15,0) 40%, rgba(150,0,20,0.55) 100%)", opacity: blink }} />
      <div
        style={{
          position: "absolute",
          left: 40,
          right: 40,
          top: 150,
          bottom: 330,
          border: "3px solid rgba(255,70,90,0.95)",
          borderRadius: 10,
          boxShadow: "0 0 40px rgba(255,40,70,0.8), inset 0 0 60px rgba(255,40,70,0.45)",
          opacity: blink,
        }}
      />
      <div style={{ position: "absolute", left: 0, right: 0, top: 132, display: "flex", justifyContent: "center" }}>
        <span style={{ fontFamily: FONT_CN, fontWeight: 700, fontSize: 24, color: "#fff", background: "#e0213f", padding: "3px 16px", borderRadius: 4, boxShadow: "0 0 20px rgba(255,40,70,0.9)" }}>● 人口警报</span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1010, textAlign: "center", transform: `scale(${1.25 - 0.25 * k})`, filter: `blur(${(1 - k) * 8}px)` }}>
        <Glitch k={clamp01(1 - dt / 0.2)}>
          <div style={{ fontFamily: FONT_CN, fontWeight: 900, fontSize: 84, color: "#fff", textShadow: "0 0 30px rgba(255,40,70,0.95), 0 0 80px rgba(255,40,70,0.6)" }}>{e.title}</div>
        </Glitch>
        <div style={{ fontFamily: FONT_CN, fontWeight: 700, fontSize: 34, color: "#ffd5db", marginTop: 14, textShadow: TS }}>{e.sub}</div>
      </div>
    </div>
  );
};

const Slam: React.FC<{ e: Extract<Ev, { k: "slam" }>; bar: number }> = ({ e, bar }) => {
  const v = vis(bar, e.at, e.out, 0.04, 0.12);
  if (v <= 0) return null;
  const k = EO(clamp01((bar - e.at) / 0.18));
  const title = e.big.includes("→");
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: title ? 860 : 900, textAlign: "center", opacity: v, transform: `scale(${1.5 - 0.5 * k})`, filter: `blur(${(1 - k) * 14}px)` }}>
      <div style={{ fontFamily: FONT_CN, fontWeight: 700, fontSize: title ? 64 : 44, color: title ? C.fg : C.sub, textShadow: TS }}>{e.small}</div>
      <div style={{ fontFamily: e.big.match(/\d/) ? FONT_NUM : FONT_CN, fontWeight: 800, fontSize: title ? 132 : e.big.match(/\d/) ? 200 : 110, color: "#fff", lineHeight: 1.05, textShadow: "0 0 50px rgba(255,255,255,0.35), " + TS }}>{e.big}</div>
      {title && <div style={{ fontFamily: FONT_CN, fontWeight: 500, fontSize: 36, color: C.sub, marginTop: 18, textShadow: TS }}>每一年，有多少人出生，多少人离开</div>}
    </div>
  );
};

const Mile: React.FC<{ e: Extract<Ev, { k: "mile" }>; bar: number }> = ({ e, bar }) => {
  const v = vis(bar, e.at, e.out, 0.05, 0.3);
  if (v <= 0) return null;
  const k = EO(clamp01((bar - e.at) / 0.25));
  return (
    <div style={{ position: "absolute", left: 300, top: 420, opacity: v, transform: `scale(${1.4 - 0.4 * k})`, transformOrigin: "0% 50%" }}>
      <span
        style={{
          fontFamily: FONT_CN,
          fontWeight: 900,
          fontSize: 46,
          color: C.gold,
          textShadow: "0 0 24px rgba(255,207,92,0.8)",
          border: "2px solid rgba(255,207,92,0.8)",
          borderRadius: 8,
          padding: "0 16px 4px",
          background: "rgba(60,40,0,0.45)",
        }}
      >
        突破 {e.v / 10000} 亿
      </span>
    </div>
  );
};

export const Events: React.FC<{ until?: number }> = ({ until = 1e9 }) => {
  const bar = useBar();
  return (
    <>
      {ALL_EVENTS.filter((e) => e.at <= until).map((e, i) => {
        if (e.k === "call") return <Callout key={i} e={e} bar={bar} />;
        if (e.k === "big") return <Big key={i} e={e} bar={bar} />;
        if (e.k === "alarm") return <Alarm key={i} e={e} bar={bar} />;
        if (e.k === "slam") return <Slam key={i} e={e} bar={bar} />;
        if (e.k === "mile") return <Mile key={i} e={e} bar={bar} />;
        return null;
      })}
    </>
  );
};

// hit envelopes for shake / flash / colour split
export const hits = (bar: number) => {
  let shake = 0;
  let flash = 0;
  let split = 0;
  for (const e of ALL_EVENTS) {
    const dt = (bar - e.at) * BAR; // seconds
    if (dt < 0 || dt > 1) continue;
    if (e.k === "bolt") {
      shake = Math.max(shake, Math.exp(-dt * 7));
      flash = Math.max(flash, dt < 0.05 ? 0.85 : Math.exp(-(dt - 0.05) * 14) * 0.6 * (Math.floor(dt * 20) % 3 === 1 ? 0.3 : 1));
      split = Math.max(split, Math.exp(-dt * 5));
    }
    if (e.k === "alarm" || e.k === "slam") split = Math.max(split, Math.exp(-dt * 9) * 0.8);
    if (e.k === "fire") flash = Math.max(flash, Math.exp(-dt * 10) * 0.18);
    if (e.k === "big") split = Math.max(split, Math.exp(-dt * 10) * 0.5);
  }
  return { shake, flash, split };
};
export { sec };
