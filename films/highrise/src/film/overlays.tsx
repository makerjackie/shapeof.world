// Scene pieces drawn over the 3D world: the Zhihu question card, counters, the vote tally, the spiral of decline,
// photo plates and the night-lights map of China.
import React from "react";
import { Img, interpolate, staticFile } from "remotion";
import { FONT, K, SERIF } from "../theme";
import { clamp01, EIO, EO, ESO, lerp, ramp, sa, sb, track, win } from "../timing";
import { Cam, toScreen } from "../world/camera";
import { NEED, YES_MAX, yesCount } from "./state";
import { fmt, SHADOW, useT } from "./ui";

const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// ---------- the question ----------

const Q_LINES = ["都说高层住宅几十年后会变成贫民窟，", "但是我国几乎全是高层住宅，", "总不能全变成贫民窟吧？"];

export const QuestionCard: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const t = useT();
  const o = Math.min(ramp(t, at, at + 0.5, EO), 1 - ramp(t, out - 0.4, out));
  if (o <= 0) return null;
  const k = ramp(t, at, at + 0.7, EO);
  let idx = 0;
  return (
    <div style={{ position: "absolute", left: 960 - 560, top: 250, width: 1120, opacity: o, transform: `translateY(${(1 - k) * 30}px) scale(${0.97 + 0.03 * k})` }}>
      <div style={{ fontFamily: FONT, fontSize: 30, fontWeight: 700, color: "rgba(244,240,232,0.75)", letterSpacing: 4, marginBottom: 18, textShadow: SHADOW }}>知乎上，有个问题——</div>
      <div
        style={{
          background: "rgba(246,243,236,0.95)",
          borderRadius: 18,
          padding: "40px 54px 44px",
          boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
        }}
      >
        {Q_LINES.map((l, li) => (
          <div key={li} style={{ fontFamily: SERIF, fontSize: 56, fontWeight: 700, color: "#1a1d22", lineHeight: 1.45, whiteSpace: "nowrap" }}>
            {Array.from(l).map((ch, ci) => {
              const s = at + 0.45 + idx++ * 0.055;
              const v = clamp01((t - s) / 0.12);
              return (
                <span key={ci} style={{ opacity: v }}>
                  {ch}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------- counters ----------

export const YearBadge: React.FC<{ at: number; out: number; keys: [number, number][]; age?: boolean }> = ({ at, out, keys, age }) => {
  const t = useT();
  const o = Math.min(ramp(t, at, at + 0.4, EO), 1 - ramp(t, out - 0.35, out));
  if (o <= 0) return null;
  const y = Math.round(track(t, keys, (x) => x));
  const a = y - 2010;
  return (
    <div style={{ position: "absolute", right: 110, top: 96, textAlign: "right", opacity: o, fontFamily: FONT, color: K.fg, textShadow: SHADOW }}>
      <div style={{ fontSize: 132, fontWeight: 900, letterSpacing: -2, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
        {y}
        <span style={{ fontSize: 48, fontWeight: 700, marginLeft: 8 }}>年</span>
      </div>
      {age ? <div style={{ fontSize: 40, fontWeight: 700, color: a >= 15 ? K.amber : "rgba(244,240,232,0.75)", marginTop: 8 }}>楼龄 {a} 年</div> : null}
    </div>
  );
};

// "要爬约 ___ 级台阶": the count follows the lit stairway.
export const StairLine: React.FC<{ at: number; out: number; from: number; to: number }> = ({ at, out, from, to }) => {
  const t = useT();
  const o = Math.min(ramp(t, at, at + 0.35, EO), 1 - ramp(t, out - 0.3, out));
  if (o <= 0) return null;
  const n = Math.round(580 * ramp(t, from, to, (x) => x));
  return (
    <div style={{ fontFamily: FONT, fontSize: 76, fontWeight: 800, color: K.fg, textShadow: SHADOW, opacity: o, whiteSpace: "nowrap" }}>
      要爬约 <span style={{ color: K.lit, fontVariantNumeric: "tabular-nums", display: "inline-block", minWidth: 150, textAlign: "right" }}>{n}</span> 级台阶。
    </div>
  );
};

// 2013 → 2025: 301 万 → 1231 万 lifts.
export const LiftCount: React.FC<{ at: number; out: number; run: [number, number] }> = ({ at, out, run }) => {
  const t = useT();
  const o = Math.min(ramp(t, at, at + 0.4, EO), 1 - ramp(t, out - 0.35, out));
  if (o <= 0) return null;
  const k = ramp(t, run[0], run[1], EIO);
  const year = Math.round(lerp(2013, 2025, k));
  const n = lerp(301, 1231.59, k);
  return (
    <div style={{ position: "absolute", right: 120, bottom: 150, textAlign: "right", fontFamily: FONT, color: K.fg, textShadow: SHADOW, opacity: o }}>
      <div style={{ fontSize: 40, fontWeight: 700, color: "rgba(244,240,232,0.75)" }}>全国电梯 · {year} 年底</div>
      <div style={{ fontSize: 150, fontWeight: 900, lineHeight: 1.05, color: K.cyan, fontVariantNumeric: "tabular-nums" }}>
        {fmt(n, 0)}
        <span style={{ fontSize: 60, fontWeight: 800, marginLeft: 10, color: K.fg }}>万台</span>
      </div>
    </div>
  );
};

// The second vote: yes count against the 99 needed.
export const Tally: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const t = useT();
  const o = Math.min(ramp(t, at, at + 0.4, EO), 1 - ramp(t, out - 0.35, out));
  if (o <= 0) return null;
  const n = yesCount(t);
  const W = 560;
  const stall = n >= YES_MAX && t > sa(61.2);
  return (
    <div style={{ position: "absolute", right: 110, top: 300, width: W, fontFamily: FONT, color: K.fg, textShadow: SHADOW, opacity: o }}>
      <div style={{ fontSize: 40, fontWeight: 700, color: "rgba(244,240,232,0.8)" }}>同意再交钱</div>
      <div style={{ fontSize: 118, fontWeight: 900, lineHeight: 1.05, color: K.green, fontVariantNumeric: "tabular-nums" }}>
        {n}
        <span style={{ fontSize: 50, color: K.fg, fontWeight: 800 }}> / 132 户</span>
      </div>
      <div style={{ position: "relative", height: 26, marginTop: 22, background: "rgba(244,240,232,0.14)", borderRadius: 13 }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: (W * n) / 132, background: K.green, borderRadius: 13, boxShadow: `0 0 18px ${K.green}` }} />
        <div style={{ position: "absolute", left: (W * NEED) / 132 - 2, top: -16, width: 4, height: 58, background: K.fg }} />
      </div>
      <div style={{ position: "relative", height: 60 }}>
        <div style={{ position: "absolute", left: (W * NEED) / 132, top: 14, transform: "translateX(-50%)", fontSize: 34, fontWeight: 800, whiteSpace: "nowrap", color: stall ? K.red : K.fg }}>需要 {NEED} 户</div>
      </div>
    </div>
  );
};

// 36 万 updated vs 1231 万 in use.
export const LiftBars: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const t = useT();
  const o = Math.min(ramp(t, at, at + 0.4, EO), 1 - ramp(t, out - 0.35, out));
  if (o <= 0) return null;
  const k1 = ramp(t, at + 0.2, at + 1.0, EO);
  const k2 = ramp(t, at + 1.4, at + 2.6, EIO);
  const W = 1300;
  const row = (label: string, v: number, k: number, c: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 18 }}>
      <div style={{ width: 300, textAlign: "right", fontSize: 38, fontWeight: 800 }}>{label}</div>
      <div style={{ width: (W * v * k) / 1231.59, minWidth: 6, height: 40, background: c, borderRadius: 6, boxShadow: `0 0 16px ${c}` }} />
      <div style={{ fontSize: 40, fontWeight: 900, fontVariantNumeric: "tabular-nums", opacity: k }}>{fmt(v * k, 0)} 万台</div>
    </div>
  );
  return (
    <div style={{ position: "absolute", left: 60, bottom: 130, fontFamily: FONT, color: K.fg, textShadow: SHADOW, opacity: o }}>
      {row("已帮着更新", 36, k1, K.gold)}
      {row("全国在用", 1231.59, k2, K.cyan)}
    </div>
  );
};

// ---------- the spiral of decline ----------

const STEPS = ["人走了", "交钱的人少了", "没钱修", "更没人想住"];

export const Spiral: React.FC<{ cam: Cam; at: number; out: number }> = ({ cam, at, out }) => {
  const t = useT();
  const o = Math.min(ramp(t, at, at + 0.5, EO), 1 - ramp(t, out - 0.4, out));
  if (o <= 0) return null;
  const [cx, cy] = toScreen(cam, 0, 52, 0);
  const R = 360;
  const rx = R * 1.35;
  const ry = R * 0.95;
  const dur = out - at - 0.8;
  const prog = clamp01((t - at - 0.3) / dur) * 4; // one turn of the loop, step by step
  const pos = (i: number) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 2;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] as const;
  };
  const arc = (i: number) => {
    const a0 = -Math.PI / 2 + (i * Math.PI) / 2 + 0.32;
    const a1 = a0 + Math.PI / 2 - 0.64;
    const k = clamp01(prog - i - 0.4);
    const a1k = lerp(a0, a1, EIO(k));
    const p0 = [cx + rx * Math.cos(a0), cy + ry * Math.sin(a0)];
    const p1 = [cx + rx * Math.cos(a1k), cy + ry * Math.sin(a1k)];
    if (k <= 0) return null;
    const large = 0;
    return (
      <g key={i}>
        <path d={`M ${p0[0]} ${p0[1]} A ${rx} ${ry} 0 ${large} 1 ${p1[0]} ${p1[1]}`} fill="none" stroke={K.red} strokeOpacity={0.85} strokeWidth={5} strokeLinecap="round" />
        {k > 0.95 ? <circle cx={p1[0]} cy={p1[1]} r={8} fill={K.red} /> : null}
      </g>
    );
  };
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {[0, 1, 2, 3].map(arc)}
      </svg>
      {STEPS.map((s, i) => {
        const [x, y] = pos(i);
        const k = clamp01((prog - i) * 2.5);
        const hot = prog >= i && prog < i + 1.2;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              transform: `translate(-50%, -50%) scale(${0.9 + 0.1 * k})`,
              opacity: k,
              fontFamily: FONT,
              fontSize: 44,
              fontWeight: 900,
              color: hot ? K.fg : "rgba(244,240,232,0.75)",
              background: hot ? "rgba(255,90,95,0.85)" : "rgba(20,22,28,0.72)",
              padding: "10px 24px",
              borderRadius: 40,
              whiteSpace: "nowrap",
              boxShadow: hot ? "0 0 30px rgba(255,90,95,0.6)" : "none",
            }}
          >
            {s}
          </div>
        );
      })}
    </div>
  );
};

// ---------- photo plates ----------

export const Photo: React.FC<{ src: string; at: number; out: number; x: number; y: number; w: number; rot?: number; caption: string; credit: string; from?: number; to?: number }> = ({
  src,
  at,
  out,
  x,
  y,
  w,
  rot = 0,
  caption,
  credit,
  from = 1.0,
  to = 1.08,
}) => {
  const t = useT();
  const o = Math.min(ramp(t, at, at + 0.5, EO), 1 - ramp(t, out - 0.4, out));
  if (o <= 0) return null;
  const k = ramp(t, at, out, (v) => v);
  const s = lerp(from, to, k);
  const enter = ramp(t, at, at + 0.7, EO);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, opacity: o, transform: `translateY(${(1 - enter) * 40}px) rotate(${rot}deg)` }}>
      <div style={{ padding: 10, background: "#f2efe8", boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}>
        <div style={{ overflow: "hidden", width: w - 20, aspectRatio: "4 / 3" }}>
          <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${s})` }} />
        </div>
        <div style={{ fontFamily: FONT, fontSize: 26, fontWeight: 800, color: "#1a1d22", marginTop: 10 }}>{caption}</div>
        <div style={{ fontFamily: FONT, fontSize: 17, fontWeight: 500, color: "#5a5e66", marginTop: 2 }}>{credit}</div>
      </div>
    </div>
  );
};

// ---------- China at night ----------

// china-lights.jpg: NASA Black Marble 2016, lon 73–136 E, lat 15–54 N, 37.5 px per degree.
const MAP_W = 2363;
const MAP_H = 1462;
const px = (lon: number, lat: number) => [(lon - 73) * 37.5, (54 - lat) * 37.5] as const;

type Region = { lon: number; lat: number; r: number; dim: number };
// Provinces whose population fell 2010–2020 (census): the three north-eastern ones, Inner Mongolia, Shanxi, Gansu.
const SHRINK: Region[] = [
  { lon: 126.5, lat: 46.5, r: 300, dim: 0.62 },
  { lon: 125.5, lat: 43.6, r: 200, dim: 0.62 },
  { lon: 122.6, lat: 41.4, r: 190, dim: 0.75 },
  { lon: 112.0, lat: 41.6, r: 260, dim: 0.75 },
  { lon: 112.4, lat: 37.6, r: 130, dim: 0.78 },
  { lon: 103.8, lat: 36.4, r: 170, dim: 0.75 },
];

export const ChinaMap: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const t = useT();
  const o = Math.min(ramp(t, at, at + 0.9, EIO), 1 - ramp(t, out - 0.9, out, EIO));
  if (o <= 0) return null;
  // camera on the map: start wide, ease towards the east
  const k = ramp(t, at, out, ESO);
  const scale = lerp(0.98, 1.22, k);
  const [fx, fy] = px(lerp(108, 116, k), lerp(35.5, 37, k));
  const tx = 960 - fx * scale;
  const ty = 560 - fy * scale;
  const shrink = ramp(t, sb(28.8), sb(30.4), EIO);
  const grow = ramp(t, sb(30.6), sb(32), EIO);
  const later = ramp(t, sb(33), sb(35), EIO);
  const pin = (lon: number, lat: number) => {
    const [x, y] = px(lon, lat);
    return [tx + x * scale, ty + y * scale] as const;
  };
  const [nx, ny] = pin(126.0, 45.0);
  const [gx, gy] = pin(113.3, 23.1);
  return (
    <div style={{ position: "absolute", inset: 0, background: "#020307", opacity: o, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: MAP_W, height: MAP_H, transformOrigin: "0 0", transform: `translate(${tx}px, ${ty}px) scale(${scale})` }}>
        <Img src={staticFile("map/china-lights.jpg")} style={{ position: "absolute", left: 0, top: 0, width: MAP_W, height: MAP_H, opacity: 1 - 0.5 * later }} />
        {SHRINK.map((r, i) => {
          const [x, y] = px(r.lon, r.lat);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x - r.r,
                top: y - r.r,
                width: r.r * 2,
                height: r.r * 2,
                borderRadius: "50%",
                background: `radial-gradient(circle, rgba(2,3,7,${r.dim * shrink}) 0%, rgba(2,3,7,${r.dim * shrink * 0.7}) 45%, rgba(2,3,7,0) 72%)`,
              }}
            />
          );
        })}
        {(() => {
          const [x, y] = px(113.3, 23.2);
          return (
            <div
              style={{
                position: "absolute",
                left: x - 150,
                top: y - 150,
                width: 300,
                height: 300,
                borderRadius: "50%",
                mixBlendMode: "screen",
                background: `radial-gradient(circle, rgba(255,190,110,${0.55 * grow}) 0%, rgba(255,160,80,${0.25 * grow}) 30%, rgba(0,0,0,0) 65%)`,
              }}
            />
          );
        })()}
      </div>
      <MapLabel x={nx} y={ny} at={sb(29)} out={out} text="东北三省" sub="10 年少了约 1100 万人" color="#9fb4d6" />
      <MapLabel x={gx} y={gy} at={sb(30.8)} out={out} text="广东" sub="10 年多了约 2171 万人" color={K.lit} />
      <div style={{ position: "absolute", right: 70, bottom: 34, fontFamily: FONT, fontSize: 20, color: "rgba(244,240,232,0.5)" }}>NASA Black Marble 2016 · 明暗变化为按人口增减所作示意</div>
    </div>
  );
};

const MapLabel: React.FC<{ x: number; y: number; at: number; out: number; text: string; sub: string; color: string }> = ({ x, y, at, out, text, sub, color }) => {
  const t = useT();
  const o = Math.min(ramp(t, at, at + 0.4, EO), 1 - ramp(t, out - 0.8, out));
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%)`, opacity: o, textAlign: "center", fontFamily: FONT, textShadow: SHADOW }}>
      <div style={{ fontSize: 46, fontWeight: 900, color }}>{text}</div>
      <div style={{ fontSize: 30, fontWeight: 700, color: K.fg }}>{sub}</div>
    </div>
  );
};

// A ring round one window: "you".
export const YouRing: React.FC<{ cam: Cam; at: number; out: number; p: [number, number, number] }> = ({ cam, at, out, p }) => {
  const t = useT();
  const o = Math.min(ramp(t, at, at + 0.6, EO), 1 - ramp(t, out - 0.3, out));
  if (o <= 0) return null;
  const [x, y] = toScreen(cam, p[0], p[1], p[2]);
  const pulse = 1 + 0.06 * Math.sin((t - at) * 3);
  const r = 46 * pulse * (0.6 + 0.4 * o);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: o }}>
      <circle cx={x} cy={y} r={r} fill="none" stroke={K.gold} strokeWidth={4} />
      <circle cx={x} cy={y} r={r + 14} fill="none" stroke={K.gold} strokeOpacity={0.35} strokeWidth={2} />
    </svg>
  );
};

export const Fade: React.FC<{ o: number; color?: string }> = ({ o, color = "#000" }) => (o <= 0 ? null : <div style={{ position: "absolute", inset: 0, background: color, opacity: o }} />);

export const useWin = (a: number, b: number, f = 0.4) => win(useT(), a, b, f);
export { interpolate, CL };
