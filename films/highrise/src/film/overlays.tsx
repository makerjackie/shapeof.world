// Scene pieces drawn over the 3D world: counters, the floor plan, the noise rings, the cost meter, the vote
// tally, the change-of-hands legend, ages and births, photographs.
import React from "react";
import { Img, staticFile } from "remotion";
import { FONT, K, SERIF } from "../theme";
import { clamp01, EIO, EO, lerp, ramp, sf as b, track } from "../timing";
import { Cam, toScreen } from "../world/camera";
import { heroHH } from "../world/city";
import { HOMES, hookYear, NEED, passShares, YES_MAX, yesCount } from "./state";
import { fmt, SHADOW, useT } from "./ui";

const fadeIO = (t: number, at: number, out: number, fi = 0.4, fo = 0.35) => Math.min(ramp(t, at, at + fi, EO), 1 - ramp(t, out - fo, out));
// dark glass behind data panels, so numbers never sit on the busy city
const PANEL: React.CSSProperties = { background: "rgba(6,8,12,0.78)", borderRadius: 18, padding: "26px 34px", boxShadow: "0 20px 60px rgba(0,0,0,0.45)", border: "1px solid rgba(244,240,232,0.08)" };

// ---------- the year and the building's age ----------

export const YearBadge: React.FC<{ at: number; out: number; keys: [number, number][] }> = ({ at, out, keys }) => {
  const t = useT();
  const o = fadeIO(t, at, out);
  if (o <= 0) return null;
  const y = Math.round(track(t, keys, (x) => x));
  const a = y - 2010;
  return (
    <div style={{ position: "absolute", right: 110, bottom: 110, textAlign: "right", opacity: o, fontFamily: FONT, color: K.fg, textShadow: SHADOW }}>
      <div style={{ fontSize: 132, fontWeight: 900, letterSpacing: -2, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
        {y}
        <span style={{ fontSize: 48, fontWeight: 700, marginLeft: 8 }}>年</span>
      </div>
      <div style={{ fontSize: 42, fontWeight: 800, color: a >= 15 ? K.amber : "rgba(244,240,232,0.78)", marginTop: 8 }}>楼龄 {a} 年</div>
    </div>
  );
};

// floors 6 → 33 and the floor area that comes with them
export const FloorsCounter: React.FC<{ at: number; out: number; from: number; to: number }> = ({ at, out, from, to }) => {
  const t = useT();
  const o = fadeIO(t, at, out);
  if (o <= 0) return null;
  const k = ramp(t, from, to, EIO);
  const floors = Math.round(lerp(6, 33, k));
  return (
    <div style={{ position: "absolute", right: 120, top: 330, textAlign: "right", fontFamily: FONT, color: K.fg, textShadow: SHADOW, opacity: o, ...PANEL }}>
      <div style={{ fontSize: 40, fontWeight: 700, color: "rgba(244,240,232,0.78)" }}>同一块地</div>
      <div style={{ fontSize: 140, fontWeight: 900, lineHeight: 1.05, fontVariantNumeric: "tabular-nums" }}>
        {floors}
        <span style={{ fontSize: 56, fontWeight: 800, marginLeft: 8 }}>层</span>
      </div>
      <div style={{ fontSize: 46, fontWeight: 800, color: K.gold, fontVariantNumeric: "tabular-nums" }}>能卖的面积 × {(floors / 6).toFixed(1)}</div>
    </div>
  );
};

// ---------- noise: rings from the flat being renovated ----------

export const NoiseRings: React.FC<{ cam: Cam; at: number; out: number; i: number }> = ({ cam, at, out, i }) => {
  const t = useT();
  const o = fadeIO(t, at, out, 0.3, 0.3);
  if (o <= 0) return null;
  const [x, y, z] = heroHH(i);
  const [sx, sy] = toScreen(cam, x, y, z + 0.5);
  const rings = [0, 1, 2, 3, 4].map((k) => {
    const ph = ((t - at) * 0.9 + k * 0.2) % 1;
    return { r: 30 + ph * 520, a: (1 - ph) * 0.8 };
  });
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: o }}>
      {rings.map((r, k) => (
        <ellipse key={k} cx={sx} cy={sy} rx={r.r * 0.75} ry={r.r} fill="none" stroke={K.red} strokeOpacity={r.a} strokeWidth={4} />
      ))}
    </svg>
  );
};

// ---------- 公摊: one floor seen from above ----------

export const FloorPlan: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const t = useT();
  const o = fadeIO(t, at, out, 0.5, 0.4);
  if (o <= 0) return null;
  const k1 = ramp(t, at + 0.4, at + 1.4, EO); // the plan draws in
  const k2 = ramp(t, at + 1.8, at + 3.2, EIO); // the shared parts light up
  const k3 = ramp(t, at + 3.4, at + 4.6, EO); // the numbers
  const S = 17; // px per metre
  const W = 44 * S;
  const H = 14 * S;
  const x0 = 1920 - W - 120;
  const y0 = 330;
  const units: [number, number][] = [
    [0, 10.25],
    [10.25, 20.5],
    [23.5, 33.75],
    [33.75, 44],
  ];
  const shared = "rgba(255,90,95,0.55)";
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o, fontFamily: FONT, color: K.fg, textShadow: SHADOW }}>
      <div style={{ position: "absolute", left: x0 - 40, top: y0 - 110, width: W + 80, height: H + 340, ...PANEL, padding: 0 }} />
      <div style={{ position: "absolute", left: x0, top: y0 - 70, fontSize: 36, fontWeight: 800 }}>一层楼，从上往下看</div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <g opacity={k1}>
          {units.map(([a, c], i) => (
            <rect key={i} x={x0 + a * S + 4} y={y0 + 4} width={(c - a) * S - 8} height={H - 8} fill="rgba(255,217,160,0.22)" stroke="rgba(244,240,232,0.85)" strokeWidth={3} />
          ))}
          <rect x={x0} y={y0} width={W} height={H} fill="none" stroke={K.fg} strokeWidth={5} />
        </g>
        {/* the core, the corridor, the walls: shared */}
        <g opacity={k2}>
          <rect x={x0 + 20.5 * S} y={y0} width={3 * S} height={H} fill={shared} />
          <rect x={x0 + 4} y={y0 + H - 2.2 * S} width={W - 8} height={2.2 * S - 4} fill={shared} />
          {units.map(([a], i) => (
            <rect key={i} x={x0 + a * S} y={y0} width={6} height={H} fill={shared} />
          ))}
        </g>
      </svg>
      <div style={{ position: "absolute", left: x0, top: y0 + H + 26, opacity: k2, fontSize: 30, fontWeight: 700, color: "#ff9a9d" }}>电梯、楼梯、走廊、墙，由每户分摊</div>
      <div style={{ position: "absolute", left: x0, top: y0 + H + 86, opacity: k3, display: "flex", alignItems: "baseline", gap: 26 }}>
        <span style={{ fontSize: 40, fontWeight: 700, color: "rgba(244,240,232,0.8)" }}>买</span>
        <span style={{ fontSize: 96, fontWeight: 900 }}>100</span>
        <span style={{ fontSize: 40, fontWeight: 700, color: "rgba(244,240,232,0.8)" }}>平方米，到手</span>
        <span style={{ fontSize: 96, fontWeight: 900, color: K.gold }}>71–75</span>
      </div>
    </div>
  );
};

// ---------- the morning rush ----------

export const RushCounter: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const t = useT();
  const o = fadeIO(t, at, out);
  if (o <= 0) return null;
  const n = Math.round(lerp(0, 335, ramp(t, at + 0.2, at + 2.4, EO)));
  return (
    <div style={{ position: "absolute", right: 110, top: 280, textAlign: "right", fontFamily: FONT, color: K.fg, textShadow: SHADOW, opacity: o, ...PANEL }}>
      <div style={{ fontSize: 40, fontWeight: 700, color: "rgba(244,240,232,0.8)" }}>早上 8 点，下楼的人</div>
      <div style={{ fontSize: 150, fontWeight: 900, lineHeight: 1.05, fontVariantNumeric: "tabular-nums" }}>
        {n}
        <span style={{ fontSize: 56, fontWeight: 800, marginLeft: 10 }}>人</span>
      </div>
      <div style={{ fontSize: 52, fontWeight: 900, color: K.lit }}>2 部电梯</div>
    </div>
  );
};

// ---------- 15 years: lifts across the country ----------

export const LiftCount: React.FC<{ at: number; out: number; run: [number, number] }> = ({ at, out, run }) => {
  const t = useT();
  const o = fadeIO(t, at, out);
  if (o <= 0) return null;
  const k = ramp(t, run[0], run[1], EIO);
  const year = Math.round(lerp(2013, 2025, k));
  const n = lerp(301, 1231.59, k);
  return (
    <div style={{ position: "absolute", right: 120, bottom: 150, textAlign: "right", fontFamily: FONT, color: K.fg, textShadow: SHADOW, opacity: o }}>
      <div style={{ fontSize: 40, fontWeight: 700, color: "rgba(244,240,232,0.75)" }}>全国电梯 · {year} 年底</div>
      <div style={{ fontSize: 150, fontWeight: 900, lineHeight: 1.05, color: K.cyan, fontVariantNumeric: "tabular-nums" }}>
        {fmt(Math.floor(n), 0)}
        <span style={{ fontSize: 60, fontWeight: 800, marginLeft: 10, color: K.fg }}>万台</span>
      </div>
    </div>
  );
};

// ---------- what maintenance eats out of every 100 yuan of fees ----------

export const CostMeter: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const t = useT();
  const o = fadeIO(t, at, out, 0.5, 0.4);
  if (o <= 0) return null;
  // midpoints of 中国物业管理协会's ranges: <5 years 25–35%, 10–15 years 45–60%, ~15 years 70–100%
  const steps = [
    { at: at + 0.4, age: "5 年内", v: 30, r: "25–35" },
    { at: at + 2.0, age: "10–15 年", v: 52, r: "45–60" },
    { at: at + 3.6, age: "15 年左右", v: 85, r: "70–100" },
  ];
  const v = track(t, [[steps[0].at, 30], [steps[0].at + 0.8, 30], [steps[1].at, 30], [steps[1].at + 0.8, 52], [steps[2].at, 52], [steps[2].at + 0.9, 85]], EO);
  const cur = t >= steps[2].at ? steps[2] : t >= steps[1].at ? steps[1] : steps[0];
  const Hb = 520;
  const col = v > 70 ? K.red : v > 45 ? K.amber : K.gold;
  return (
    <div style={{ position: "absolute", right: 120, top: 230, width: 560, fontFamily: FONT, color: K.fg, textShadow: SHADOW, opacity: o, ...PANEL }}>
      <div style={{ fontSize: 34, fontWeight: 800, marginBottom: 18 }}>每 100 元物业费里，花在维护上的</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 34 }}>
        <div style={{ position: "relative", width: 150, height: Hb, border: "3px solid rgba(244,240,232,0.7)", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: (Hb * v) / 100, background: col, boxShadow: `0 0 24px ${col}` }} />
        </div>
        <div>
          <div style={{ fontSize: 44, fontWeight: 800, color: "rgba(244,240,232,0.85)" }}>房龄 {cur.age}</div>
          <div style={{ fontSize: 140, fontWeight: 900, lineHeight: 1, color: col, fontVariantNumeric: "tabular-nums" }}>{Math.round(v)}</div>
          <div style={{ fontSize: 34, fontWeight: 700, color: "rgba(244,240,232,0.7)" }}>元左右（{cur.r}）</div>
        </div>
      </div>
    </div>
  );
};

// ---------- the vote ----------

export const Tally: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const t = useT();
  const o = fadeIO(t, at, out);
  if (o <= 0) return null;
  const n = yesCount(t);
  const W = 560;
  const stall = n >= YES_MAX && t > b(68.7);
  return (
    <div style={{ position: "absolute", right: 110, top: 300, width: W, fontFamily: FONT, color: K.fg, textShadow: SHADOW, opacity: o, ...PANEL, boxSizing: "content-box" }}>
      <div style={{ fontSize: 40, fontWeight: 700, color: "rgba(244,240,232,0.8)" }}>同意再凑钱</div>
      <div style={{ fontSize: 118, fontWeight: 900, lineHeight: 1.05, color: K.green, fontVariantNumeric: "tabular-nums" }}>
        {n}
        <span style={{ fontSize: 50, color: K.fg, fontWeight: 800 }}> / {HOMES} 户</span>
      </div>
      <div style={{ position: "relative", height: 26, marginTop: 22, background: "rgba(244,240,232,0.14)", borderRadius: 13 }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: (W * n) / HOMES, background: K.green, borderRadius: 13, boxShadow: `0 0 18px ${K.green}` }} />
        <div style={{ position: "absolute", left: (W * NEED) / HOMES - 2, top: -16, width: 4, height: 58, background: K.fg }} />
      </div>
      <div style={{ position: "relative", height: 60 }}>
        <div style={{ position: "absolute", left: (W * NEED) / HOMES, top: 14, transform: "translateX(-50%)", fontSize: 34, fontWeight: 800, whiteSpace: "nowrap", color: stall ? K.red : K.fg }}>
          {stall ? `还差 ${NEED - YES_MAX} 户` : `需要 ${NEED} 户`}
        </div>
      </div>
    </div>
  );
};

// ---------- passing the flats on ----------

export const PassLegend: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const t = useT();
  const o = fadeIO(t, at, out, 0.5, 0.4);
  if (o <= 0) return null;
  const p = passShares(t);
  const own = HOMES - p.rented - p.sub - p.empty;
  const rows: [string, number, string][] = [
    ["自住", own, "#ffb36b"],
    ["出租", p.rented, "#cfe0ff"],
    ["隔成群租", p.sub, "#9ad7ff"],
    ["空着", p.empty, "#555b63"],
  ];
  return (
    <div style={{ position: "absolute", right: 120, top: 300, fontFamily: FONT, color: K.fg, textShadow: SHADOW, opacity: o, ...PANEL }}>
      {rows.map(([label, n, c], i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 18 }}>
          <div style={{ width: 34, height: 34, borderRadius: 6, background: c, boxShadow: i < 3 ? `0 0 16px ${c}` : "none" }} />
          <div style={{ width: 200, fontSize: 42, fontWeight: 800 }}>{label}</div>
          <div style={{ width: 120, textAlign: "right", fontSize: 54, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{n}</div>
          <div style={{ fontSize: 30, fontWeight: 700, color: "rgba(244,240,232,0.7)" }}>户</div>
        </div>
      ))}
      <div style={{ fontSize: 22, fontWeight: 500, color: "rgba(244,240,232,0.55)", marginTop: 6 }}>示意</div>
    </div>
  );
};

// ---------- owners age with the building ----------

export const AgeCounter: React.FC<{ at: number; out: number; run: [number, number] }> = ({ at, out, run }) => {
  const t = useT();
  const o = fadeIO(t, at, out);
  if (o <= 0) return null;
  const k = ramp(t, run[0], run[1], EIO);
  const year = Math.round(lerp(2010, 2050, k));
  const age = Math.round(lerp(29.5, 69.5, k));
  return (
    <div style={{ position: "absolute", right: 120, top: 280, textAlign: "right", fontFamily: FONT, color: K.fg, textShadow: SHADOW, opacity: o, ...PANEL }}>
      <div style={{ fontSize: 40, fontWeight: 700, color: "rgba(244,240,232,0.8)" }}>{year} 年 · 楼龄 {year - 2010} 年</div>
      <div style={{ fontSize: 40, fontWeight: 700, color: "rgba(244,240,232,0.8)", marginTop: 6 }}>第一批业主</div>
      <div style={{ fontSize: 160, fontWeight: 900, lineHeight: 1.05, color: age > 60 ? K.grey : K.fg, fontVariantNumeric: "tabular-nums" }}>
        {age}
        <span style={{ fontSize: 60, fontWeight: 800, marginLeft: 10 }}>岁</span>
      </div>
    </div>
  );
};

// ---------- births: who takes the baton ----------

export const Births: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const t = useT();
  const o = fadeIO(t, at, out, 0.4, 0.4);
  if (o <= 0) return null;
  const k1 = ramp(t, at + 0.2, at + 1.2, EO);
  const k2 = ramp(t, at + 1.4, at + 2.4, EO);
  const Hmax = 560;
  const bar = (label: string, v: number, k: number, c: string, x: number) => (
    <div style={{ position: "absolute", left: x, bottom: 170, width: 260, textAlign: "center" }}>
      <div style={{ fontSize: 64, fontWeight: 900, color: c, fontVariantNumeric: "tabular-nums", opacity: k }}>{fmt(Math.round(v * k), 0)}</div>
      <div style={{ fontSize: 30, fontWeight: 700, color: "rgba(244,240,232,0.75)", marginBottom: 12, opacity: k }}>万人出生</div>
      <div style={{ margin: "0 auto", width: 150, height: (Hmax * v * k) / 2400, background: c, borderRadius: "8px 8px 0 0", boxShadow: `0 0 22px ${c}` }} />
      <div style={{ fontSize: 40, fontWeight: 800, marginTop: 14 }}>{label}</div>
    </div>
  );
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: FONT, color: K.fg, textShadow: SHADOW, opacity: o }}>
      <div style={{ position: "absolute", left: 1150, top: 250, width: 640, height: 700, ...PANEL, padding: 0 }} />
      {bar("1990 年前后", 2400, k1, K.lit, 1190)}
      {bar("2025 年", 792, k2, K.red, 1490)}
    </div>
  );
};

// ---------- photographs ----------

export const PhotoStage: React.FC<{
  src: string;
  at: number;
  out: number;
  zoom?: [number, number];
  focus?: [number, number];
  darken?: number;
  flash?: boolean;
  caption: string;
  credit: string;
  w?: number;
}> = ({ src, at, out, zoom = [1.0, 1.1], focus = [50, 50], darken = 0, flash, caption, credit, w = 1060 }) => {
  const t = useT();
  const o = Math.min(ramp(t, at, at + (flash ? 0.12 : 0.6), EO), 1 - ramp(t, out - 0.5, out));
  if (o <= 0) return null;
  const k = ramp(t, at, out, (v) => v);
  const s = lerp(zoom[0], zoom[1], k) * (flash ? 1 + 0.05 * (1 - ramp(t, at, at + 0.5, EO)) : 1);
  const fl = flash ? 0.6 * (1 - ramp(t, at, at + 0.45)) : 0;
  const W = w;
  const H = Math.round(w * 0.666);
  const L = 1920 - W - 96;
  const T = 292;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <div style={{ position: "absolute", left: L, top: T, width: W, height: H, padding: 9, background: "#ece8df", boxShadow: "0 30px 90px rgba(0,0,0,0.7)" }}>
        <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "#111" }}>
          <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", transformOrigin: `${focus[0]}% ${focus[1]}%`, transform: `scale(${s})` }} />
          <div style={{ position: "absolute", inset: 0, background: "#05060a", opacity: darken }} />
          <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: fl }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 90, background: "linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0.72))" }} />
          <div style={{ position: "absolute", left: 22, bottom: 16, fontFamily: FONT, color: "rgba(244,240,232,0.92)" }}>
            <span style={{ fontSize: 26, fontWeight: 800 }}>{caption}</span>
            <span style={{ fontSize: 18, fontWeight: 500, marginLeft: 16, color: "rgba(244,240,232,0.68)" }}>{credit}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// A timeline of three dates (Florida).
export const Timeline: React.FC<{ at: number; out: number; items: { at: number; date: string; text: string; c?: string }[] }> = ({ at, out, items }) => {
  const t = useT();
  const o = fadeIO(t, at, out, 0.4, 0.4);
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 110, top: 330, fontFamily: FONT, color: K.fg, textShadow: SHADOW, opacity: o }}>
      {items.map((it, i) => {
        const k = ramp(t, it.at, it.at + 0.5, EO);
        return (
          <div key={i} style={{ display: "flex", gap: 26, alignItems: "baseline", marginBottom: 30, opacity: k, transform: `translateX(${(1 - k) * -30}px)` }}>
            <div style={{ width: 230, fontSize: 46, fontWeight: 900, color: it.c ?? K.lit, fontVariantNumeric: "tabular-nums" }}>{it.date}</div>
            <div style={{ fontSize: 40, fontWeight: 800, maxWidth: 480, lineHeight: 1.3 }}>{it.text}</div>
          </div>
        );
      })}
    </div>
  );
};

// A ring round one flat: "you".
export const YouRing: React.FC<{ cam: Cam; at: number; out: number; i: number }> = ({ cam, at, out, i }) => {
  const t = useT();
  const o = fadeIO(t, at, out, 0.6, 0.3);
  if (o <= 0) return null;
  const [x, y, z] = heroHH(i);
  const [sx, sy] = toScreen(cam, x, y, z);
  const pulse = 1 + 0.05 * Math.sin((t - at) * 3);
  const r = 70 * pulse * (0.6 + 0.4 * o);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: o }}>
      <ellipse cx={sx} cy={sy} rx={r * 1.5} ry={r * 0.62} fill="none" stroke={K.gold} strokeWidth={5} />
      <ellipse cx={sx} cy={sy} rx={r * 1.5 + 16} ry={r * 0.62 + 12} fill="none" stroke={K.gold} strokeOpacity={0.35} strokeWidth={2} />
    </svg>
  );
};

export const Fade: React.FC<{ o: number; color?: string }> = ({ o, color = "#000" }) => (o <= 0 ? null : <div style={{ position: "absolute", inset: 0, background: color, opacity: o }} />);

void SERIF;
void clamp01;

// ---------- v7 pieces ----------

// The year racing in the hook (top right, big).
export const HookYear: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const t = useT();
  const o = fadeIO(t, at, out, 0.15, 0.3);
  if (o <= 0) return null;
  const y = hookYear(t);
  const a = y - 2010;
  return (
    <div style={{ position: "absolute", right: 110, top: 90, textAlign: "right", opacity: o, fontFamily: FONT, color: K.fg, textShadow: SHADOW }}>
      <div style={{ fontSize: 150, fontWeight: 900, letterSpacing: -3, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
        {y}
        <span style={{ fontSize: 54, fontWeight: 700, marginLeft: 8 }}>年</span>
      </div>
      <div style={{ fontSize: 44, fontWeight: 800, color: a >= 30 ? K.red : a >= 15 ? K.amber : "rgba(244,240,232,0.8)", marginTop: 6, fontVariantNumeric: "tabular-nums" }}>楼龄 {a} 年</div>
    </div>
  );
};

// A chapter marker: "第一笔账 · 钱" with a rule drawing out.
export const Chapter: React.FC<{ at: number; out: number; n: string; title: string; sub?: string }> = ({ at, out, n, title, sub }) => {
  const t = useT();
  const o = fadeIO(t, at, out, 0.3, 0.4);
  if (o <= 0) return null;
  const k = ramp(t, at, at + 0.9, EO);
  const k2 = ramp(t, at + 0.35, at + 1.1, EO);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 120, display: "flex", flexDirection: "column", alignItems: "center", opacity: o, fontFamily: SERIF, color: K.fg, textShadow: SHADOW }}>
      <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: 14, color: "rgba(244,240,232,0.75)", transform: `translateY(${(1 - k) * 16}px)`, opacity: k }}>{n}</div>
      <div style={{ width: 360 * k, height: 3, background: K.gold, margin: "18px 0 22px", boxShadow: `0 0 18px ${K.gold}` }} />
      <div style={{ fontSize: 150, fontWeight: 900, lineHeight: 1, letterSpacing: 10, opacity: k2, transform: `scale(${0.94 + 0.06 * k2})` }}>{title}</div>
      {sub ? <div style={{ fontFamily: FONT, fontSize: 44, fontWeight: 700, marginTop: 26, opacity: k2, color: "rgba(244,240,232,0.9)" }}>{sub}</div> : null}
    </div>
  );
};

// A building's year: what comes in (fees) and what one item already costs (the lifts' upkeep).
export const Budget: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const t = useT();
  const o = fadeIO(t, at, out, 0.4, 0.4);
  if (o <= 0) return null;
  const k1 = ramp(t, at + 0.3, at + 1.3, EO);
  const k2 = ramp(t, at + 1.6, at + 2.6, EO);
  const W = 560;
  return (
    <div style={{ position: "absolute", right: 120, top: 260, width: W, fontFamily: FONT, color: K.fg, textShadow: SHADOW, opacity: o, ...PANEL, boxSizing: "content-box" }}>
      <div style={{ fontSize: 34, fontWeight: 800, marginBottom: 20 }}>一栋楼，一年</div>
      <div style={{ fontSize: 30, fontWeight: 700, color: "rgba(244,240,232,0.8)" }}>收进来的物业费</div>
      <div style={{ display: "flex", alignItems: "center", gap: 18, margin: "8px 0 22px" }}>
        <div style={{ width: W * 0.62 * k1, height: 40, background: K.gold, borderRadius: 6, boxShadow: `0 0 16px ${K.gold}` }} />
        <div style={{ fontSize: 48, fontWeight: 900, opacity: k1 }}>约 15 万</div>
      </div>
      <div style={{ fontSize: 30, fontWeight: 700, color: "rgba(244,240,232,0.8)" }}>两部老电梯，光维保</div>
      <div style={{ display: "flex", alignItems: "center", gap: 18, margin: "8px 0 22px" }}>
        <div style={{ width: W * 0.62 * 0.4 * k2, height: 40, background: K.red, borderRadius: 6, boxShadow: `0 0 16px ${K.red}` }} />
        <div style={{ fontSize: 48, fontWeight: 900, opacity: k2 }}>约 6 万</div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "rgba(244,240,232,0.7)", opacity: k2 }}>剩下的，还要付水泵电费、保洁、保安……</div>
    </div>
  );
};

// The same lift costs about the same everywhere; homes do not.
export const PriceCompare: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const t = useT();
  const o = fadeIO(t, at, out, 0.4, 0.4);
  if (o <= 0) return null;
  const k1 = ramp(t, at + 0.3, at + 1.3, EO);
  const k2 = ramp(t, at + 1.0, at + 2.0, EO);
  const k3 = ramp(t, at + 2.2, at + 3.0, EO);
  const H = 300;
  const col = (label: string, price: number, total: string, k: number, x: number, c: string) => (
    <div style={{ position: "absolute", left: x, bottom: 0, width: 240, textAlign: "center" }}>
      <div style={{ fontSize: 52, fontWeight: 900, color: c, opacity: k, fontVariantNumeric: "tabular-nums" }}>{fmt(Math.round(price * k), 0)}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: "rgba(244,240,232,0.75)", opacity: k }}>元/平方米</div>
      <div style={{ margin: "12px auto 0", width: 130, height: (H * price * k) / 64314, background: c, borderRadius: "8px 8px 0 0", boxShadow: `0 0 18px ${c}` }} />
      <div style={{ fontSize: 34, fontWeight: 800, marginTop: 12 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: "rgba(244,240,232,0.7)", opacity: k }}>100 平：{total}</div>
    </div>
  );
  return (
    <div style={{ position: "absolute", right: 110, top: 230, width: 600, height: 760, fontFamily: FONT, color: K.fg, textShadow: SHADOW, opacity: o, ...PANEL, boxSizing: "border-box" }}>
      <div style={{ fontSize: 32, fontWeight: 800 }}>二手房均价 · 2025 年 12 月</div>
      <div style={{ position: "absolute", left: 30, right: 30, bottom: 130, height: 560 }}>
        {col("深圳", 64314, "约 643 万", k1, 10, K.lit)}
        {col("100 城平均", 13016, "约 130 万", k2, 290, K.cyan)}
      </div>
      <div style={{ position: "absolute", left: 34, right: 34, bottom: 34, fontSize: 30, fontWeight: 800, opacity: k3, lineHeight: 1.35 }}>修一次电梯，每户都要摊几千元。</div>
    </div>
  );
};

// 212 estates whose managers left, 35% of them under five years old.
export const ExodusGrid: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const t = useT();
  const o = fadeIO(t, at, out, 0.4, 0.4);
  if (o <= 0) return null;
  const k = ramp(t, at + 0.2, at + 1.6, EO);
  const k2 = ramp(t, at + 1.8, at + 2.8, EO);
  const n = Math.round(212 * k);
  const cols = 20;
  const s = 24;
  return (
    <div style={{ position: "absolute", right: 110, top: 250, fontFamily: FONT, color: K.fg, textShadow: SHADOW, opacity: o, ...PANEL }}>
      <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 6 }}>物业撤场的小区</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: "rgba(244,240,232,0.7)", marginBottom: 18 }}>2025 年初 – 2026 年 3 月</div>
      <svg width={cols * s} height={Math.ceil(212 / cols) * s}>
        {Array.from({ length: n }, (_, i) => {
          const young = i < 74;
          return <rect key={i} x={(i % cols) * s + 2} y={Math.floor(i / cols) * s + 2} width={s - 5} height={s - 5} rx={3} fill={young && k2 > 0 ? K.red : "rgba(244,240,232,0.55)"} opacity={young ? 0.45 + 0.55 * k2 : 1} />;
        })}
      </svg>
      <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 14 }}>
        <span style={{ fontSize: 72, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{n}</span>
        <span style={{ fontSize: 30, fontWeight: 700 }}>个</span>
        <span style={{ fontSize: 34, fontWeight: 800, color: K.red, opacity: k2, marginLeft: 20 }}>三成五，楼龄不到 5 年</span>
      </div>
    </div>
  );
};

// Elsewhere: three ways a block is made to keep paying.
export const Abroad: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const t = useT();
  const o = fadeIO(t, at, out, 0.4, 0.4);
  if (o <= 0) return null;
  const cards = [
    { at: at + 0.3, place: "新加坡 · 组屋", lines: ["四分之三的人同意，", "全楼一起换电梯，", "政府出大头。"] },
    { at: at + 1.2, place: "香港 · 私人楼宇", lines: ["楼龄满 30 年，", "政府每 10 年", "强制验一次楼。"] },
    { at: at + 2.1, place: "美国佛罗里达 · 公寓", lines: ["欠交管理费，", "业主协会可以申请", "拍卖你的房子。"] },
  ];
  return (
    <div style={{ position: "absolute", left: 110, right: 110, top: 330, display: "flex", gap: 34, fontFamily: FONT, color: K.fg, textShadow: SHADOW, opacity: o }}>
      {cards.map((c, i) => {
        const k = ramp(t, c.at, c.at + 0.6, EO);
        return (
          <div key={i} style={{ flex: 1, opacity: k, transform: `translateY(${(1 - k) * 30}px)`, ...PANEL, padding: "34px 36px" }}>
            <div style={{ fontSize: 34, fontWeight: 900, color: K.gold, marginBottom: 18 }}>{c.place}</div>
            {c.lines.map((l, j) => (
              <div key={j} style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.4, whiteSpace: "nowrap" }}>
                {l}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};
