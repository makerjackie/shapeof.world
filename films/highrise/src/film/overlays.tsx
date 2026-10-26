// Scene pieces drawn over the 3D world (v8). No boxes: numbers sit on soft scrims, figures are drawn in thin
// warm lines, colours carry meaning (gold money, cyan machinery, red danger, green yes).
import React from "react";
import { FONT, K, SERIF } from "../theme";
import { clamp01, EIO, EO, lerp, ramp, sf as b, track } from "../timing";
import { Cam, toScreen } from "../world/camera";
import { FH, heroHH } from "../world/city";
import { HOMES, NEED, passShares, T, YES_MAX, yesCount } from "./state";
import { fmt, SHADOW, useT } from "./ui";

const fadeIO = (t: number, at: number, out: number, fi = 0.4, fo = 0.35) => Math.min(ramp(t, at, at + fi, EO), 1 - ramp(t, out - fo, out));
const SUB = "rgba(244,240,232,0.72)";
const HAIR = "rgba(244,240,232,0.28)";
// a soft pool of shade behind a group of numbers, so they never sit on busy windows
const pool = (w: number, h: number): React.CSSProperties => ({
  position: "absolute",
  left: -w * 0.35,
  top: -h * 0.3,
  width: w * 1.7,
  height: h * 1.6,
  background: "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(3,5,10,0.72), rgba(3,5,10,0.45) 45%, rgba(3,5,10,0) 72%)",
  zIndex: -1,
});
const Label: React.FC<{ children: React.ReactNode; c?: string; size?: number; style?: React.CSSProperties }> = ({ children, c = SUB, size = 30, style }) => (
  <div style={{ fontSize: size, fontWeight: 700, color: c, letterSpacing: 1, ...style }}>{children}</div>
);

// ---------- the year and the building's age ----------

export const YearBadge: React.FC<{ at: number; out: number; keys: [number, number][]; base?: number; style?: React.CSSProperties }> = ({ at, out, keys, base = 2010, style }) => {
  const t = useT();
  const o = fadeIO(t, at, out);
  if (o <= 0) return null;
  const y = Math.round(track(t, keys, (x) => x));
  const a = y - base;
  return (
    <div style={{ position: "absolute", right: 120, bottom: 120, textAlign: "right", opacity: o, fontFamily: FONT, color: K.fg, textShadow: SHADOW, ...style }}>
      <div style={pool(360, 200)} />
      <div style={{ fontSize: 132, fontWeight: 900, letterSpacing: -2, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
        {y}
        <span style={{ fontSize: 48, fontWeight: 700, marginLeft: 8 }}>年</span>
      </div>
      <div style={{ fontSize: 42, fontWeight: 800, color: a >= 15 ? K.amber : SUB, marginTop: 8, fontVariantNumeric: "tabular-nums" }}>楼龄 {a} 年</div>
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
    return { r: 30 + ph * 520, a: (1 - ph) * 0.7 };
  });
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: o }}>
      {rings.map((r, k) => (
        <ellipse key={k} cx={sx} cy={sy} rx={r.r * 0.75} ry={r.r} fill="none" stroke={K.red} strokeOpacity={r.a} strokeWidth={3} />
      ))}
    </svg>
  );
};

// ---------- the morning rush ----------

export const RushCounter: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const t = useT();
  const o = fadeIO(t, at, out);
  if (o <= 0) return null;
  const n = Math.round(lerp(0, 335, ramp(t, at + 0.2, at + 2.2, EO)));
  return (
    <div style={{ position: "absolute", right: 130, top: 300, textAlign: "right", fontFamily: FONT, color: K.fg, textShadow: SHADOW, opacity: o }}>
      <div style={pool(380, 260)} />
      <Label>早上 8 点，要下楼的人</Label>
      <div style={{ fontSize: 150, fontWeight: 900, lineHeight: 1.05, fontVariantNumeric: "tabular-nums" }}>
        {n}
        <span style={{ fontSize: 56, fontWeight: 800, marginLeft: 10 }}>人</span>
      </div>
      <div style={{ height: 2, background: HAIR, margin: "10px 0 14px" }} />
      <div style={{ fontSize: 50, fontWeight: 900, color: K.cyan }}>2 部电梯</div>
    </div>
  );
};

// ---------- 哈尔滨: a crack climbing a load-bearing wall ----------

export const Crack: React.FC<{ cam: Cam; at: number; out: number; from: number; to: number; run: [number, number] }> = ({ cam, at, out, from, to, run }) => {
  const t = useT();
  const o = fadeIO(t, at, out, 0.3, 0.4);
  if (o <= 0) return null;
  const k = ramp(t, run[0], run[1], (x) => x);
  const pts: [number, number][] = [];
  const N = 90;
  for (let i = 0; i <= N; i++) {
    const f = lerp(from, to, i / N);
    if ((i / N) > k) break;
    const jit = Math.sin(i * 2.3) * 0.7 + Math.sin(i * 5.7 + 1) * 0.45 + (((i * 0.618) % 1) - 0.5) * 0.9;
    const [sx, sy] = toScreen(cam, -1.55 + jit, f * FH + 1.2, 6.9);
    pts.push([sx, sy]);
  }
  if (pts.length < 2) return null;
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const tip = pts[pts.length - 1];
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: o }}>
      <path d={d} fill="none" stroke={K.red} strokeOpacity={0.35} strokeWidth={14} strokeLinejoin="round" style={{ filter: "blur(6px)" }} />
      <path d={d} fill="none" stroke="#ffb3a8" strokeWidth={3.2} strokeLinejoin="round" />
      {k < 1 ? <circle cx={tip[0]} cy={tip[1]} r={9} fill="#fff1e6" style={{ filter: "blur(2px)" }} /> : null}
    </svg>
  );
};

// ---------- 上海: 1.3 万 estates checked, 578 with fire systems that would not start ----------

export const ShanghaiDots: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const t = useT();
  const o = fadeIO(t, at, out, 0.5, 0.4);
  if (o <= 0) return null;
  const k1 = ramp(t, at + 0.2, at + 1.0, EO);
  const k2 = ramp(t, at + 1.4, at + 2.6, EIO);
  const W = 1040;
  const H = 400;
  const x0 = (1920 - W) / 2;
  const y0 = 470;
  const n578 = Math.round(578 * k2);
  const reds = [];
  for (let i = 0; i < n578; i++) {
    const px = ((i * 0.6180339 + 0.11) % 1) * W;
    const py = ((i * 0.7548776 + 0.37) % 1) * H;
    reds.push(<circle key={i} cx={x0 + px} cy={y0 + py} r={3.6} fill={K.red} />);
  }
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o, fontFamily: FONT, color: K.fg, textShadow: SHADOW }}>
      <div
        style={{
          position: "absolute",
          left: x0,
          top: y0,
          width: W * k1,
          height: H,
          backgroundImage: "radial-gradient(circle, rgba(244,240,232,0.62) 1.3px, rgba(0,0,0,0) 1.9px)",
          backgroundSize: "6px 6px",
          maskImage: "linear-gradient(90deg, #000 85%, transparent)",
        }}
      />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <g style={{ filter: "drop-shadow(0 0 6px rgba(255,90,95,0.8))" }}>{reds}</g>
      </svg>
      <div style={{ position: "absolute", left: x0, top: y0 + H + 26, display: "flex", gap: 70, alignItems: "baseline" }}>
        <div style={{ opacity: k1 }}>
          <span style={{ fontSize: 72, fontWeight: 900 }}>1.3 万</span>
          <span style={{ fontSize: 32, fontWeight: 700, color: SUB, marginLeft: 12 }}>个住宅小区，全部排查</span>
        </div>
        <div style={{ opacity: ramp(t, at + 1.4, at + 1.9, EO) }}>
          <span style={{ fontSize: 72, fontWeight: 900, color: K.red, fontVariantNumeric: "tabular-nums" }}>{n578}</span>
          <span style={{ fontSize: 32, fontWeight: 700, color: SUB, marginLeft: 12 }}>个高层小区被盯着整改</span>
        </div>
      </div>
    </div>
  );
};

// ---------- a quotation from a document ----------

export const Quote: React.FC<{ at: number; out: number; lead: string; parts: string[]; src: string }> = ({ at, out, lead, parts, src }) => {
  const t = useT();
  const o = fadeIO(t, at, out, 0.5, 0.4);
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 300, display: "flex", flexDirection: "column", alignItems: "center", opacity: o, color: K.fg, textShadow: SHADOW }}>
      <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 700, color: SUB, opacity: ramp(t, at, at + 0.5, EO) }}>{lead}</div>
      <div style={{ display: "flex", gap: 46, marginTop: 40, fontFamily: SERIF }}>
        {parts.map((p, i) => {
          const k = ramp(t, at + 0.6 + i * 0.45, at + 1.2 + i * 0.45, EO);
          return (
            <div key={i} style={{ fontSize: 88, fontWeight: 900, opacity: k, transform: `translateY(${(1 - k) * 24}px)`, color: i === 1 ? K.gold : K.fg }}>
              {p}
            </div>
          );
        })}
      </div>
      <div style={{ width: 520 * ramp(t, at + 1.8, at + 2.6, EO), height: 2, background: HAIR, margin: "40px 0 18px" }} />
      <div style={{ fontFamily: FONT, fontSize: 26, fontWeight: 600, color: "rgba(244,240,232,0.6)", opacity: ramp(t, at + 2.0, at + 2.6, EO) }}>{src}</div>
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
  const newShare = clamp01((n - 301) / n);
  return (
    <div style={{ position: "absolute", right: 130, bottom: 150, textAlign: "right", fontFamily: FONT, color: K.fg, textShadow: SHADOW, opacity: o }}>
      <div style={pool(520, 260)} />
      <Label>全国电梯 · {year} 年底</Label>
      <div style={{ fontSize: 150, fontWeight: 900, lineHeight: 1.05, color: K.cyan, fontVariantNumeric: "tabular-nums" }}>
        {fmt(Math.floor(n), 0)}
        <span style={{ fontSize: 60, fontWeight: 800, marginLeft: 10, color: K.fg }}>万台</span>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
        <div style={{ width: 520, height: 14, background: "rgba(244,240,232,0.18)", borderRadius: 7, overflow: "hidden", display: "flex" }}>
          <div style={{ width: `${(1 - newShare) * 100}%`, background: "rgba(244,240,232,0.6)" }} />
          <div style={{ flex: 1, background: K.amber, boxShadow: `0 0 12px ${K.amber}` }} />
        </div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: K.amber, marginTop: 10, opacity: ramp(t, run[1] - 0.4, run[1] + 0.2) }}>2014 年以后装的，约四分之三</div>
    </div>
  );
};

// ---------- Japan, twenty years ahead ----------

export const Japan: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const t = useT();
  const o = fadeIO(t, at, out, 0.5, 0.4);
  if (o <= 0) return null;
  const k1 = ramp(t, at + 0.5, at + 1.1, EO);
  const k2 = ramp(t, at + 1.1, at + 2.3, EIO);
  const k3 = ramp(t, at + 2.6, at + 3.2, EO);
  const n = lerp(136.9, 463.8, k2);
  const Wb = 980;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o, fontFamily: FONT, color: K.fg, textShadow: SHADOW }}>
      <div style={{ position: "absolute", left: 220, top: 210, fontFamily: SERIF, fontSize: 64, fontWeight: 900 }}>日本，已经走到了这一步。</div>
      <div style={{ position: "absolute", left: 220, top: 340, opacity: k1 }}>
        <Label>楼龄 40 年以上的老公寓（户）</Label>
        <div style={{ display: "flex", alignItems: "center", gap: 30, marginTop: 16 }}>
          <div style={{ width: (Wb * n) / 463.8, height: 34, background: `linear-gradient(90deg, rgba(244,240,232,0.75) ${(136.9 / n) * 100}%, ${K.amber} ${(136.9 / n) * 100}%)`, borderRadius: 4 }} />
          <div style={{ fontSize: 66, fontWeight: 900, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{Math.round(n)} 万</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", width: Wb, marginTop: 10, fontSize: 28, fontWeight: 700, color: SUB }}>
          <span>2023 年</span>
          <span style={{ opacity: k2 }}>2043 年（预测）</span>
        </div>
      </div>
      <div style={{ position: "absolute", left: 220, top: 620, opacity: k3, display: "flex", alignItems: "center", gap: 34 }}>
        <svg width={260} height={90}>
          {[0, 1, 2, 3].map((i) => (
            <g key={i} transform={`translate(${i * 64 + 10},6)`} opacity={i === 0 ? 1 : 0.4}>
              <circle cx={22} cy={16} r={13} fill={i === 0 ? K.grey : K.fg} />
              <path d="M0 80 Q0 36 22 36 Q44 36 44 80 Z" fill={i === 0 ? K.grey : K.fg} />
            </g>
          ))}
        </svg>
        <div>
          <div style={{ fontSize: 54, fontWeight: 900 }}>四户里有一户，户主 70 岁以上</div>
          <div style={{ fontSize: 30, fontWeight: 700, color: SUB, marginTop: 6 }}>2023 年 25.9%；2003 年只有 10.2%</div>
        </div>
      </div>
    </div>
  );
};

// ---------- money: one building, one year ----------

export const Budget: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const t = useT();
  const o = fadeIO(t, at, out, 0.4, 0.4);
  if (o <= 0) return null;
  const k1 = ramp(t, at + 0.3, at + 1.3, EO);
  const k2 = ramp(t, at + 1.5, at + 2.5, EO);
  const W = 560;
  return (
    <div style={{ position: "absolute", right: 140, top: 330, width: W, fontFamily: FONT, color: K.fg, textShadow: SHADOW, opacity: o }}>
      <div style={pool(W, 320)} />
      <Label c={K.fg} size={34} style={{ fontWeight: 800, marginBottom: 22 }}>一栋楼，一年</Label>
      <Label>收进来的物业费</Label>
      <div style={{ display: "flex", alignItems: "center", gap: 18, margin: "10px 0 26px" }}>
        <div style={{ width: W * 0.6 * k1, height: 22, background: K.gold, borderRadius: 3, boxShadow: `0 0 14px ${K.gold}` }} />
        <div style={{ fontSize: 52, fontWeight: 900, opacity: k1 }}>约 15 万</div>
      </div>
      <Label>两部老电梯，光维保</Label>
      <div style={{ display: "flex", alignItems: "center", gap: 18, margin: "10px 0 22px" }}>
        <div style={{ width: W * 0.6 * 0.4 * k2, height: 22, background: K.red, borderRadius: 3, boxShadow: `0 0 14px ${K.red}` }} />
        <div style={{ fontSize: 52, fontWeight: 900, opacity: k2 }}>约 6 万</div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: SUB, opacity: k2 }}>剩下的，要付水泵电费、保洁、保安……</div>
    </div>
  );
};

// ---------- the vote ----------

export const Tally: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const t = useT();
  const o = fadeIO(t, at, out);
  if (o <= 0) return null;
  const n = yesCount(t);
  const W = 540;
  const stall = n >= YES_MAX && t > b(T.vote + 2.7);
  return (
    <div style={{ position: "absolute", right: 130, top: 420, width: W, fontFamily: FONT, color: K.fg, textShadow: SHADOW, opacity: o }}>
      <div style={pool(W, 260)} />
      <Label>同意再凑钱</Label>
      <div style={{ fontSize: 118, fontWeight: 900, lineHeight: 1.05, color: K.green, fontVariantNumeric: "tabular-nums" }}>
        {n}
        <span style={{ fontSize: 46, color: K.fg, fontWeight: 800 }}> / {HOMES} 户</span>
      </div>
      <div style={{ position: "relative", height: 14, marginTop: 22, background: "rgba(244,240,232,0.16)", borderRadius: 7 }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: (W * n) / HOMES, background: K.green, borderRadius: 7, boxShadow: `0 0 14px ${K.green}` }} />
        <div style={{ position: "absolute", left: (W * NEED) / HOMES - 1.5, top: -14, width: 3, height: 42, background: K.fg }} />
      </div>
      <div style={{ position: "relative", height: 60 }}>
        <div style={{ position: "absolute", left: (W * NEED) / HOMES, top: 16, transform: "translateX(-50%)", fontSize: 32, fontWeight: 800, whiteSpace: "nowrap", color: stall ? K.red : K.fg }}>
          {stall ? `还差 ${NEED - YES_MAX} 户` : "四分之三"}
        </div>
      </div>
    </div>
  );
};

// ---------- Beijing's oldest towers: one owner, or twenty ----------

const OWNER_HUES = Array.from({ length: 20 }, (_, i) => `hsl(${Math.round((i * 137.5) % 360)}, 50%, 66%)`);

export const Archive: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const t = useT();
  const o = fadeIO(t, at, out, 0.5, 0.5);
  if (o <= 0) return null;
  const L = at + 0.6; // the left building
  const R = at + 3.6; // the right building
  const kL = ramp(t, L, L + 1.0, EIO);
  const kR = ramp(t, R, R + 1.4, EIO);
  const ground = 760;
  // 安化楼: 9 floors, long and low, a two-storey portico in the middle
  const lw = 420;
  const lx = 300;
  const lh = 9 * 30;
  const ltop = ground - lh;
  // 安苑北里: 25 floors, a tower
  const rw = 170;
  const rx = 1260;
  const rh = 25 * 20;
  const rtop = ground - rh;
  const stamps = [
    { y: 0.86, text: "初代 · 推拉门", at: L + 1.1 },
    { y: 0.55, text: "约 2000 年 · 第二次更换", at: L + 1.6 },
    { y: 0.24, text: "2015–2016 年 · 第三次", at: L + 2.1 },
  ];
  const lwin: React.ReactNode[] = [];
  for (let f = 0; f < 9; f++)
    for (let c = 0; c < 14; c++) {
      if (f < 2 && c >= 6 && c <= 7) continue;
      const vis = ramp(t, L + 0.3 + f * 0.05, L + 0.7 + f * 0.05, EO);
      lwin.push(<rect key={`${f}-${c}`} x={lx + 16 + c * 28.5} y={ground - (f + 1) * 30 + 9} width={15} height={13} fill={K.gold} opacity={0.85 * vis} />);
    }
  const rwin: React.ReactNode[] = [];
  for (let f = 0; f < 25; f++)
    for (let c = 0; c < 4; c++) {
      const owner = Math.floor(((f * 4 + c) * 0.6180339 * 7.3) % 20);
      const vis = ramp(t, R + 0.4 + f * 0.03, R + 0.8 + f * 0.03, EO);
      rwin.push(<rect key={`${f}-${c}`} x={rx + 14 + c * 38 + (c >= 2 ? 10 : 0)} y={ground - (f + 1) * 20 + 5} width={22} height={10} fill={OWNER_HUES[owner]} opacity={0.9 * vis} />);
    }
  const caption = (x: number, at0: number, lines: { t: string; c?: string }[]) => (
    <div style={{ position: "absolute", left: x, top: ground + 34, fontFamily: FONT, color: K.fg, textShadow: SHADOW }}>
      {lines.map((l, i) => {
        const k = ramp(t, at0 + i * 0.5, at0 + 0.5 + i * 0.5, EO);
        return (
          <div key={i} style={{ fontSize: i === 0 ? 40 : 34, fontWeight: i === 0 ? 900 : 700, color: l.c ?? (i === 0 ? K.fg : SUB), opacity: k, transform: `translateY(${(1 - k) * 12}px)`, lineHeight: 1.45, whiteSpace: "nowrap" }}>
            {l.t}
          </div>
        );
      })}
    </div>
  );
  const stroke = "rgba(244,240,232,0.85)";
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 70% at 50% 55%, rgba(4,6,10,0.55), rgba(4,6,10,0.2))" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 64, textAlign: "center", fontFamily: SERIF, fontSize: 60, fontWeight: 900, color: K.fg, textShadow: SHADOW, opacity: ramp(t, at, at + 0.6, EO) }}>北京最老的一批高层，已经五六十岁</div>
      <div style={{ position: "absolute", inset: 0, transform: "scale(1.22)", transformOrigin: "960px 670px" }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <line x1={160} y1={ground} x2={1760} y2={ground} stroke={HAIR} strokeWidth={2} />
        {/* 安化楼 */}
        <g opacity={kL}>
          <rect x={lx} y={ltop} width={lw} height={lh} fill="rgba(255,207,90,0.06)" stroke={stroke} strokeWidth={2} />
          {[0, 1, 2, 3].map((i) => (
            <line key={i} x1={lx + 181 + i * 19} y1={ground} x2={lx + 181 + i * 19} y2={ground - 60} stroke={stroke} strokeWidth={2} />
          ))}
          <line x1={lx + 170} y1={ground - 60} x2={lx + 250} y2={ground - 60} stroke={stroke} strokeWidth={2} />
          {lwin}
          <rect x={lx + 203} y={ltop + 4} width={14} height={lh - 64} fill="rgba(255,207,90,0.25)" stroke={K.gold} strokeWidth={1.5} />
        </g>
        {stamps.map((s, i) => {
          const k = ramp(t, s.at, s.at + 0.4, EO);
          const y = ltop + lh * (1 - s.y);
          return (
            <g key={i} opacity={k}>
              <circle cx={lx + 210} cy={y} r={7 + 8 * (1 - k)} fill={K.gold} style={{ filter: "drop-shadow(0 0 8px #ffcf5a)" }} />
              <line x1={lx + 220} y1={y} x2={lx + lw + 30} y2={y} stroke={K.gold} strokeWidth={1.5} strokeOpacity={0.7} />
              <text x={lx + lw + 40} y={y + 10} fill={K.gold} fontSize={28} fontWeight={800} fontFamily={FONT}>
                {s.text}
              </text>
            </g>
          );
        })}
        {/* 安苑北里 */}
        <g opacity={kR}>
          <rect x={rx} y={rtop} width={rw} height={rh} fill="rgba(244,240,232,0.03)" stroke={stroke} strokeWidth={2} />
          {rwin}
          <rect x={rx + 79} y={rtop + 4} width={12} height={rh - 8} fill="rgba(80,170,120,0.35)" stroke="#6fbf8f" strokeWidth={1.5} />
        </g>
        <g opacity={ramp(t, R + 1.6, R + 2.1, EO)}>
          <line x1={rx + 78} y1={rtop + rh * 0.18} x2={rx - 40} y2={rtop + rh * 0.18} stroke="#6fbf8f" strokeWidth={1.5} strokeOpacity={0.8} />
          <text x={rx - 50} y={rtop + rh * 0.18 + 10} fill="#8fd6aa" fontSize={28} fontWeight={800} fontFamily={FONT} textAnchor="end">
            1989 年的老电梯，还在跑
          </text>
        </g>
      </svg>
      {caption(lx, L + 2.2, [{ t: "安化楼 · 1960 年 · 9 层" }, { t: "电梯换了三轮，住户没掏过钱" }, { t: "它只有一个主人：公家", c: K.gold }])}
      {caption(rx - 120, R + 1.4, [{ t: "安苑北里 · 1989 年 · 25 层" }, { t: "一栋楼的产权单位，最多 20 家" }, { t: "有的改了制，有的已经不在了", c: "#8fd6aa" }])}
      </div>
    </div>
  );
};

// ---------- 212 estates whose managers left, 35% of them under five years old ----------

export const ExodusGrid: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const t = useT();
  const o = fadeIO(t, at, out, 0.4, 0.4);
  if (o <= 0) return null;
  const k = ramp(t, at + 0.2, at + 1.6, EO);
  const k2 = ramp(t, at + 1.8, at + 2.7, EO);
  const n = Math.round(212 * k);
  const cols = 20;
  const s = 26;
  return (
    <div style={{ position: "absolute", right: 130, top: 300, fontFamily: FONT, color: K.fg, textShadow: SHADOW, opacity: o }}>
      <div style={pool(cols * s, 420)} />
      <Label c={K.fg} size={34} style={{ fontWeight: 800 }}>物业撤场的住宅小区</Label>
      <Label size={26} style={{ marginBottom: 18 }}>2025 年初 – 2026 年 3 月 · 中指研究院监测</Label>
      <svg width={cols * s} height={Math.ceil(212 / cols) * s}>
        {Array.from({ length: n }, (_, i) => {
          const young = i < 74;
          return <circle key={i} cx={(i % cols) * s + s / 2} cy={Math.floor(i / cols) * s + s / 2} r={7.5} fill={young && k2 > 0 ? K.red : "rgba(244,240,232,0.6)"} opacity={young ? 0.5 + 0.5 * k2 : 1} />;
        })}
      </svg>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: 14 }}>
        <span style={{ fontSize: 76, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{n}</span>
        <span style={{ fontSize: 30, fontWeight: 700 }}>个</span>
        <span style={{ fontSize: 34, fontWeight: 800, color: K.red, opacity: k2, marginLeft: 18 }}>三成五，楼龄不到 5 年</span>
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
    ["空着", p.empty, "#5b616a"],
  ];
  return (
    <div style={{ position: "absolute", right: 150, top: 330, fontFamily: FONT, color: K.fg, textShadow: SHADOW, opacity: o }}>
      <div style={pool(420, 300)} />
      {rows.map(([label, n, c], i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16 }}>
          <div style={{ width: 22, height: 22, borderRadius: 11, background: c, boxShadow: i < 3 ? `0 0 14px ${c}` : "none" }} />
          <div style={{ width: 190, fontSize: 40, fontWeight: 800 }}>{label}</div>
          <div style={{ width: 110, textAlign: "right", fontSize: 54, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{n}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: SUB }}>户</div>
        </div>
      ))}
      <div style={{ fontSize: 22, fontWeight: 500, color: "rgba(244,240,232,0.5)", marginTop: 6 }}>示意</div>
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
    <div style={{ position: "absolute", right: 150, top: 300, textAlign: "right", fontFamily: FONT, color: K.fg, textShadow: SHADOW, opacity: o }}>
      <div style={pool(420, 300)} />
      <Label>
        {year} 年 · 楼龄 {year - 2010} 年
      </Label>
      <div style={{ height: 2, background: HAIR, margin: "14px 0 10px" }} />
      <Label>第一批业主</Label>
      <div style={{ fontSize: 168, fontWeight: 900, lineHeight: 1.0, color: age > 60 ? K.grey : K.fg, fontVariantNumeric: "tabular-nums" }}>
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
  const k1 = ramp(t, at + 0.3, at + 1.2, EO);
  const k2 = ramp(t, at + 1.3, at + 2.3, EO);
  const Wmax = 1100;
  const row = (label: string, v: number, k: number, c: string, y: number) => (
    <div style={{ position: "absolute", left: 300, top: y, width: 1400 }}>
      <Label size={34} style={{ opacity: k }}>{label}</Label>
      <div style={{ display: "flex", alignItems: "center", gap: 28, marginTop: 12 }}>
        <div style={{ width: (Wmax * v * k) / 2400, height: 46, background: c, borderRadius: 4, boxShadow: `0 0 18px ${c}` }} />
        <div style={{ fontSize: 76, fontWeight: 900, color: c, fontVariantNumeric: "tabular-nums", opacity: k, whiteSpace: "nowrap" }}>
          {fmt(Math.round(v * k), 0)}
          <span style={{ fontSize: 34, color: K.fg, marginLeft: 10 }}>万人出生</span>
        </div>
      </div>
    </div>
  );
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: FONT, color: K.fg, textShadow: SHADOW, opacity: o }}>
      {row("1990 年前后，每年", 2400, k1, K.lit, 440)}
      {row("2025 年", 792, k2, K.red, 640)}
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
  const pulse = 1 + 0.04 * Math.sin((t - at) * 2.4);
  const r = 70 * pulse * (0.6 + 0.4 * o);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: o }}>
      <ellipse cx={sx} cy={sy} rx={r * 1.5} ry={r * 0.62} fill="none" stroke={K.gold} strokeWidth={4} />
      <ellipse cx={sx} cy={sy} rx={r * 1.5 + 16} ry={r * 0.62 + 12} fill="none" stroke={K.gold} strokeOpacity={0.3} strokeWidth={2} />
    </svg>
  );
};

// ---------- v9: the circle, Japan's fund, fifty years of bills ----------

// A loop of causes, drawn as a ring of nodes with a comet running round it, faster each turn. "bad" spins the
// tower down (red), "good" is the same loop turning the other way (gold).
export const Loop: React.FC<{ at: number; out: number; cx: number; cy: number; r: number; nodes: string[]; color: string; center: string; turns?: number; size?: number }> = ({
  at,
  out,
  cx,
  cy,
  r,
  nodes,
  color,
  center,
  turns = 2.2,
  size = 34,
}) => {
  const t = useT();
  const o = fadeIO(t, at, out, 0.5, 0.4);
  if (o <= 0) return null;
  const n = nodes.length;
  const dur = out - at - 0.4;
  // accelerating: angle grows with the square of time
  const u = clamp01((t - at - 0.3) / Math.max(0.1, dur));
  const ang = turns * Math.PI * 2 * (0.35 * u + 0.65 * u * u);
  const pos = (a: number, rr = r): [number, number] => [cx + rr * Math.sin(a), cy - rr * Math.cos(a)];
  const arcs: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2 + 0.32;
    const a1 = ((i + 1) / n) * Math.PI * 2 - 0.32;
    const [x0, y0] = pos(a0);
    const [x1, y1] = pos(a1);
    const k = ramp(t, at + 0.25 + i * 0.12, at + 0.7 + i * 0.12, EO);
    const [hx, hy] = pos(a1, r);
    const tang = a1 + Math.PI / 2;
    arcs.push(
      <g key={i} opacity={k}>
        <path d={`M${x0},${y0} A${r},${r} 0 0 1 ${x1},${y1}`} fill="none" stroke={color} strokeOpacity={0.55} strokeWidth={3} />
        <path d={`M${hx},${hy} l${-14 * Math.cos(tang - 0.5)},${-14 * Math.sin(tang - 0.5)} M${hx},${hy} l${-14 * Math.cos(tang + 0.5)},${-14 * Math.sin(tang + 0.5)}`} stroke={color} strokeOpacity={0.8} strokeWidth={3} fill="none" />
      </g>,
    );
  }
  const trail: React.ReactNode[] = [];
  for (let j = 0; j < 14; j++) {
    const [x, y] = pos(ang - j * 0.05);
    trail.push(<circle key={j} cx={x} cy={y} r={10 - j * 0.6} fill={color} opacity={(1 - j / 14) * 0.9 * clamp01(u * 8)} />);
  }
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o, fontFamily: FONT, color: K.fg, textShadow: SHADOW }}>
      <div style={{ position: "absolute", left: cx - r * 1.9, top: cy - r * 1.7, width: r * 3.8, height: r * 3.4, background: "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(3,5,10,0.75), rgba(3,5,10,0.4) 55%, rgba(3,5,10,0) 75%)" }} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {arcs}
        <g style={{ filter: `drop-shadow(0 0 10px ${color})` }}>{trail}</g>
      </svg>
      {nodes.map((label, i) => {
        const a = (i / n) * Math.PI * 2;
        const [x, y] = pos(a);
        const k = ramp(t, at + 0.2 + i * 0.12, at + 0.6 + i * 0.12, EO);
        // lit when the comet passes
        let d = (((ang - a) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        if (u <= 0) d = 9;
        const hot = Math.exp(-d * 2.2);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              transform: `translate(-50%, -50%) scale(${0.92 + 0.08 * k + 0.08 * hot})`,
              opacity: k,
              fontSize: size,
              fontWeight: 900,
              whiteSpace: "nowrap",
              padding: "8px 18px",
              borderRadius: 30,
              background: `rgba(4,6,10,${0.55 + 0.25 * hot})`,
              border: `2px solid ${color}`,
              boxShadow: `0 0 ${10 + 26 * hot}px ${color}`,
              color: hot > 0.4 ? "#fff" : K.fg,
            }}
          >
            {label}
          </div>
        );
      })}
      <div style={{ position: "absolute", left: cx, top: cy, transform: "translate(-50%, -50%)", fontFamily: SERIF, fontSize: size * 1.05, fontWeight: 900, color, opacity: ramp(t, at + 0.9, at + 1.4, EO), whiteSpace: "nowrap" }}>{center}</div>
    </div>
  );
};

// Japan's fund guideline against the one-off deposit here, for one 100 m² flat.
export const JapanFund: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const t = useT();
  const o = fadeIO(t, at, out, 0.5, 0.4);
  if (o <= 0) return null;
  const kA = ramp(t, at + 0.6, at + 1.1, EO);
  const run = ramp(t, at + 1.2, at + 3.6, (x) => x);
  const years = Math.max(1, Math.round(run * 30));
  const kB = ramp(t, at + 2.0, at + 2.5, EO);
  const kC = ramp(t, at + 4.4, at + 4.9, EO);
  const W = 1240; // px for 57 万
  const perYear = 1.9;
  const x0 = 340;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o, fontFamily: FONT, color: K.fg, textShadow: SHADOW }}>
      <div style={{ position: "absolute", left: x0, top: 170, fontFamily: SERIF, fontSize: 60, fontWeight: 900, opacity: ramp(t, at, at + 0.5, EO) }}>日本的公寓，是怎么准备这笔钱的？</div>
      <div style={{ position: "absolute", left: x0, top: 320, opacity: kA }}>
        <Label c={K.gold} size={32}>日本 · 国土交通省建议（20 层以上的公寓）</Label>
        <div style={{ fontSize: 54, fontWeight: 900, marginTop: 8 }}>每个月存，每平米 338 日元</div>
        <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 18 }}>
          <svg width={W} height={40}>
            {Array.from({ length: years }, (_, i) => (
              <rect key={i} x={(i * W) / 30 + 1} y={2} width={W / 30 - 3} height={36} rx={3} fill={K.gold} opacity={0.55 + 0.45 * (i === years - 1 ? 1 : 0.6)} />
            ))}
          </svg>
        </div>
        <div style={{ display: "flex", gap: 30, alignItems: "baseline", marginTop: 10 }}>
          <span style={{ fontSize: 38, fontWeight: 800 }}>一套 100 平，一年约 1.9 万元</span>
          <span style={{ fontSize: 40, fontWeight: 900, color: K.gold, fontVariantNumeric: "tabular-nums" }}>
            {years} 年：约 {Math.round(years * perYear)} 万
          </span>
        </div>
      </div>
      <div style={{ position: "absolute", left: x0, top: 640, opacity: kB }}>
        <Label c={K.cyan} size={32}>我们 · 南京高层的首期标准</Label>
        <div style={{ fontSize: 54, fontWeight: 900, marginTop: 8 }}>买房时交一次，每平米 120 元</div>
        <svg width={W} height={40} style={{ marginTop: 18 }}>
          <rect x={1} y={2} width={(W / 57) * 1.2} height={36} rx={3} fill={K.cyan} />
        </svg>
        <div style={{ fontSize: 38, fontWeight: 800, marginTop: 10 }}>一套 100 平，约 1.2 万元，要管几十年</div>
      </div>
      <div style={{ position: "absolute", left: x0, top: 905, opacity: kC, fontSize: 38, fontWeight: 800, color: K.amber }}>就算这样，日本仍有 36.6% 的公寓，修缮金不够。</div>
    </div>
  );
};

// Fifty years of bills along a ribbon at the foot of the frame; each pops as the year passes.
export const BillRibbon: React.FC<{ at: number; out: number; yearAt: (t: number) => number; bills: { y: number; k: string; t: string }[] }> = ({ at, out, yearAt, bills }) => {
  const t = useT();
  const o = fadeIO(t, at, out, 0.4, 0.4);
  if (o <= 0) return null;
  const x0 = 200;
  const x1 = 1720;
  const y = 940;
  const X = (yr: number) => x0 + ((yr - 2013) / 50) * (x1 - x0);
  const now = yearAt(t);
  const col = (k: string) => (k === "lift" ? K.cyan : k === "alarm" ? K.red : k === "roof" ? K.water : K.gold);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o, fontFamily: FONT, color: K.fg, textShadow: SHADOW }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: y - 180, height: 300, background: "linear-gradient(rgba(3,5,10,0), rgba(3,5,10,0.7) 45%, rgba(3,5,10,0.8))" }} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <line x1={x0} y1={y} x2={x1} y2={y} stroke="rgba(244,240,232,0.25)" strokeWidth={3} />
        <line x1={x0} y1={y} x2={X(Math.min(2063, now))} y2={y} stroke={K.fg} strokeWidth={3} />
        {[2013, 2023, 2033, 2043, 2053, 2063].map((yr) => (
          <g key={yr}>
            <line x1={X(yr)} y1={y - 8} x2={X(yr)} y2={y + 8} stroke="rgba(244,240,232,0.5)" strokeWidth={2} />
            <text x={X(yr)} y={y + 42} fill="rgba(244,240,232,0.6)" fontSize={24} fontWeight={700} textAnchor="middle" fontFamily={FONT}>
              {yr}
            </text>
          </g>
        ))}
        {bills.map((e, i) => {
          if (now < e.y) return null;
          const k = clamp01((now - e.y) / 1.5);
          const up = i % 2 === 0 ? 1 : 2;
          const yy = y - 34 - (up - 1) * 52;
          const c = col(e.k);
          return (
            <g key={i} opacity={0.35 + 0.65 * k}>
              <circle cx={X(e.y)} cy={y} r={8 + 10 * (1 - k)} fill={c} style={{ filter: `drop-shadow(0 0 8px ${c})` }} />
              <line x1={X(e.y)} y1={y - 10} x2={X(e.y)} y2={yy + 8} stroke={c} strokeWidth={2} strokeOpacity={0.7} />
              <text x={X(e.y)} y={yy} fill={c} fontSize={30} fontWeight={900} textAnchor="middle" fontFamily={FONT}>
                {e.t}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
