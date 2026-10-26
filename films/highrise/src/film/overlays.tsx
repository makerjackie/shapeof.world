// Scene pieces drawn over the 3D world: counters, the floor plan, the noise rings, the cost meter, the vote
// tally, the change-of-hands legend, ages and births, photographs.
import React from "react";
import { Img, staticFile } from "remotion";
import { FONT, K, SERIF } from "../theme";
import { clamp01, EIO, EO, lerp, ramp, sf as b, track } from "../timing";
import { Cam, toScreen } from "../world/camera";
import { heroHH } from "../world/city";
import { NEED, passShares, YES_MAX, yesCount } from "./state";
import { fmt, SHADOW, useT } from "./ui";

const fadeIO = (t: number, at: number, out: number, fi = 0.4, fo = 0.35) => Math.min(ramp(t, at, at + fi, EO), 1 - ramp(t, out - fo, out));

// ---------- the year and the building's age ----------

export const YearBadge: React.FC<{ at: number; out: number; keys: [number, number][] }> = ({ at, out, keys }) => {
  const t = useT();
  const o = fadeIO(t, at, out);
  if (o <= 0) return null;
  const y = Math.round(track(t, keys, (x) => x));
  const a = y - 2010;
  return (
    <div style={{ position: "absolute", right: 110, top: 96, textAlign: "right", opacity: o, fontFamily: FONT, color: K.fg, textShadow: SHADOW }}>
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
    <div style={{ position: "absolute", right: 120, top: 330, textAlign: "right", fontFamily: FONT, color: K.fg, textShadow: SHADOW, opacity: o }}>
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
      <div style={{ position: "absolute", left: x0, top: y0 - 70, fontSize: 36, fontWeight: 800 }}>一层楼，从上往下看</div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <g opacity={k1}>
          {units.map(([a, c], i) => (
            <rect key={i} x={x0 + a * S + 4} y={y0 + 4} width={(c - a) * S - 8} height={H - 8} fill="rgba(255,217,160,0.16)" stroke="rgba(244,240,232,0.85)" strokeWidth={3} />
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
  const n = Math.round(lerp(0, 346, ramp(t, at + 0.2, at + 2.4, EO)));
  return (
    <div style={{ position: "absolute", right: 110, top: 280, textAlign: "right", fontFamily: FONT, color: K.fg, textShadow: SHADOW, opacity: o }}>
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
  const v = track(t, [[steps[0].at, 0], [steps[0].at + 0.8, 30], [steps[1].at, 30], [steps[1].at + 0.8, 52], [steps[2].at, 52], [steps[2].at + 0.9, 85]], EO);
  const cur = t >= steps[2].at ? steps[2] : t >= steps[1].at ? steps[1] : steps[0];
  const Hb = 520;
  const col = v > 70 ? K.red : v > 45 ? K.amber : K.gold;
  return (
    <div style={{ position: "absolute", right: 150, top: 250, width: 520, fontFamily: FONT, color: K.fg, textShadow: SHADOW, opacity: o }}>
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
  const stall = n >= YES_MAX && t > b(71.5);
  return (
    <div style={{ position: "absolute", right: 110, top: 300, width: W, fontFamily: FONT, color: K.fg, textShadow: SHADOW, opacity: o }}>
      <div style={{ fontSize: 40, fontWeight: 700, color: "rgba(244,240,232,0.8)" }}>同意再凑钱</div>
      <div style={{ fontSize: 118, fontWeight: 900, lineHeight: 1.05, color: K.green, fontVariantNumeric: "tabular-nums" }}>
        {n}
        <span style={{ fontSize: 50, color: K.fg, fontWeight: 800 }}> / 132 户</span>
      </div>
      <div style={{ position: "relative", height: 26, marginTop: 22, background: "rgba(244,240,232,0.14)", borderRadius: 13 }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: (W * n) / 132, background: K.green, borderRadius: 13, boxShadow: `0 0 18px ${K.green}` }} />
        <div style={{ position: "absolute", left: (W * NEED) / 132 - 2, top: -16, width: 4, height: 58, background: K.fg }} />
      </div>
      <div style={{ position: "relative", height: 60 }}>
        <div style={{ position: "absolute", left: (W * NEED) / 132, top: 14, transform: "translateX(-50%)", fontSize: 34, fontWeight: 800, whiteSpace: "nowrap", color: stall ? K.red : K.fg }}>
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
  const own = 132 - p.rented - p.sub - p.empty;
  const rows: [string, number, string][] = [
    ["自住", own, "#ffb36b"],
    ["出租", p.rented, "#cfe0ff"],
    ["隔成群租", p.sub, "#9ad7ff"],
    ["空着", p.empty, "#555b63"],
  ];
  return (
    <div style={{ position: "absolute", right: 120, top: 300, fontFamily: FONT, color: K.fg, textShadow: SHADOW, opacity: o }}>
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
    <div style={{ position: "absolute", right: 120, top: 280, textAlign: "right", fontFamily: FONT, color: K.fg, textShadow: SHADOW, opacity: o }}>
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
    <div style={{ position: "absolute", left: x, bottom: 170, width: 220, textAlign: "center" }}>
      <div style={{ fontSize: 64, fontWeight: 900, color: c, fontVariantNumeric: "tabular-nums", opacity: k }}>{fmt(Math.round(v * k), 0)}</div>
      <div style={{ fontSize: 30, fontWeight: 700, color: "rgba(244,240,232,0.75)", marginBottom: 12, opacity: k }}>万人出生</div>
      <div style={{ margin: "0 auto", width: 150, height: (Hmax * v * k) / 2400, background: c, borderRadius: "8px 8px 0 0", boxShadow: `0 0 22px ${c}` }} />
      <div style={{ fontSize: 40, fontWeight: 800, marginTop: 14 }}>{label}</div>
    </div>
  );
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: FONT, color: K.fg, textShadow: SHADOW, opacity: o }}>
      {bar("1990 年前后", 2400, k1, K.lit, 1200)}
      {bar("2025 年", 792, k2, K.red, 1500)}
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
}> = ({ src, at, out, zoom = [1.0, 1.1], focus = [50, 50], darken = 0, flash, caption, credit }) => {
  const t = useT();
  const o = Math.min(ramp(t, at, at + (flash ? 0.12 : 0.6), EO), 1 - ramp(t, out - 0.5, out));
  if (o <= 0) return null;
  const k = ramp(t, at, out, (v) => v);
  const s = lerp(zoom[0], zoom[1], k) * (flash ? 1 + 0.05 * (1 - ramp(t, at, at + 0.5, EO)) : 1);
  const fl = flash ? 0.6 * (1 - ramp(t, at, at + 0.45)) : 0;
  const W = 1060;
  const H = 706;
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
            <div style={{ fontSize: 42, fontWeight: 800, maxWidth: 520, lineHeight: 1.3 }}>{it.text}</div>
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
