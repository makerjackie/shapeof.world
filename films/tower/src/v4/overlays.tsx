// 2D overlays that sit on the 3D city: the year counter, the 50-year lease, rents, the returns chart, the land the
// city still sells, the deal's two columns and the 亿元楼 counter. Timing in story bars (src/v4/bars.ts).
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { FONT, K, MONO, SERIF } from "../theme";
import { barAt, bf, clamp01, EIO, EO, ramp } from "./bars";
import { fade, fmt, runNum, SHADOW } from "./ui";
import { yearAt } from "./world";

const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const NUM = MONO;
const SUB = "rgba(244,240,232,0.78)";

// ---------- Year counter (time travel) ----------

export const YearCounter: React.FC = () => {
  const bar = barAt(useCurrentFrame());
  const o = Math.max(fade(bar, 10.2, 20.3, 0.3), fade(bar, 21.2, 24.9, 0.3), fade(bar, 53.9, 57.8, 0.3));
  if (o <= 0) return null;
  const y = Math.round(yearAt(bar));
  return (
    <div style={{ position: "absolute", right: 80, top: 56, textAlign: "right", opacity: o, fontFamily: FONT, color: K.fg, textShadow: SHADOW }}>
      <div style={{ fontFamily: NUM, fontSize: 132, fontWeight: 700, letterSpacing: -2, lineHeight: 1 }}>
        {y}
        <span style={{ fontFamily: FONT, fontSize: 40, marginLeft: 8 }}>年</span>
      </div>
    </div>
  );
};

// ---------- Skyline counter (200 m+ towers, CTBUH) ----------

const SKY: [number, number][] = [
  [2008, 17],
  [2009, 17],
  [2010, 20],
  [2011, 22],
  [2012, 24],
  [2013, 30],
  [2014, 31],
  [2015, 37],
  [2016, 48],
  [2017, 58],
  [2018, 75],
  [2019, 95],
  [2020, 104],
  [2021, 120],
  [2022, 135],
  [2023, 162],
  [2024, 183],
  [2025, 199],
  [2026, 200],
];

export const SkylineCount: React.FC = () => {
  const bar = barAt(useCurrentFrame());
  const o = fade(bar, 21.5, 24.9, 0.3);
  if (o <= 0) return null;
  const y = yearAt(bar);
  const row = SKY.filter((r) => r[0] <= Math.floor(y + 0.001)).pop() ?? SKY[0];
  return (
    <div style={{ position: "absolute", right: 80, top: 230, textAlign: "right", opacity: o, fontFamily: FONT, color: K.fg, textShadow: SHADOW }}>
      <div style={{ fontSize: 34, fontWeight: 700, color: SUB }}>深圳 200 米以上的楼</div>
      <div style={{ fontFamily: NUM, fontSize: 120, fontWeight: 700, color: K.gold, lineHeight: 1.05 }}>
        {row[1]}
        <span style={{ fontFamily: FONT, fontSize: 44, marginLeft: 8, color: K.fg }}>栋</span>
      </div>
    </div>
  );
};

// ---------- Timelines ----------

const AX0 = 2008;
const AX1 = 2062;

const Axis: React.FC<{ x: number; w: number; y: number; ticks: number[] }> = ({ x, w, y, ticks }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: 40 }}>
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 2, background: "rgba(244,240,232,0.4)" }} />
    {ticks.map((t) => (
      <div key={t} style={{ position: "absolute", left: ((t - AX0) / (AX1 - AX0)) * w, top: 0 }}>
        <div style={{ width: 2, height: 12, background: "rgba(244,240,232,0.55)" }} />
        <div style={{ position: "absolute", top: 16, transform: "translateX(-50%)", fontFamily: NUM, fontSize: 28, color: "rgba(244,240,232,0.75)" }}>{t}</div>
      </div>
    ))}
  </div>
);

const Span: React.FC<{ x: number; w: number; y: number; from: number; to: number; grow: number; color: string; h?: number; label?: React.ReactNode }> = ({ x, w, y, from, to, grow, color, h = 40, label }) => {
  const px = (yr: number) => ((yr - AX0) / (AX1 - AX0)) * w;
  const end = from + (to - from) * grow;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h }}>
      <div style={{ position: "absolute", left: px(from), width: Math.max(0, px(end) - px(from)), top: 0, bottom: 0, background: color, borderRadius: 5, boxShadow: `0 0 26px ${color}55` }} />
      {label ? (
        <div style={{ position: "absolute", left: px(end) + 18, top: "50%", transform: "translateY(-50%)", whiteSpace: "nowrap", fontFamily: FONT, fontSize: 36, fontWeight: 800, color: K.fg, textShadow: SHADOW, opacity: clamp01(grow * 3) }}>
          {label}
        </div>
      ) : null}
    </div>
  );
};

// The plot's 50 years, planted when the land is bought.
export const LeaseBar: React.FC = () => {
  const bar = barAt(useCurrentFrame());
  const o = fade(bar, 14.6, 16.4, 0.3);
  if (o <= 0) return null;
  const g = ramp(bar, 15.0, 15.8, EIO);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 820, height: 260, background: "linear-gradient(rgba(5,6,8,0), rgba(5,6,8,0.75))" }} />
      <Axis x={200} w={1400} y={960} ticks={[2008, 2018, 2028, 2038, 2048, 2058]} />
      <Span x={200} w={1400} y={900} from={2008} to={2058} grow={g} color="#7f9bbf" label="50 年使用权" />
    </div>
  );
};

// In the account: the land runs out in 2058; the tower is finished in 2018 with 40 years left.
export const LeaseLeft: React.FC = () => {
  const bar = barAt(useCurrentFrame());
  const o = fade(bar, 35.6, 38.6, 0.3);
  if (o <= 0) return null;
  const x = 200;
  const w = 1400;
  const y0 = 700;
  const px = (yr: number) => x + ((yr - AX0) / (AX1 - AX0)) * w;
  const g = ramp(bar, 35.9, 36.6, EIO);
  const cut = ramp(bar, 36.7, 37.2, EO);
  const end = ramp(bar, 37.3, 37.8, EO);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o, fontFamily: FONT, color: K.fg }}>
      <div style={{ position: "absolute", left: 0, top: y0 - 140, width: 1920, height: 560, background: "linear-gradient(rgba(5,6,8,0), rgba(5,6,8,0.8) 28%, rgba(5,6,8,0.9))" }} />
      <Span x={x} w={w} y={y0} from={2008} to={2058} grow={g} color="#7f9bbf" label="地：50 年" />
      <div style={{ position: "absolute", left: px(2008), width: (px(2018) - px(2008)) * cut, top: y0, height: 40, background: "rgba(5,6,8,0.72)", borderRadius: 5 }} />
      {cut > 0 ? (
        <div style={{ position: "absolute", left: px(2018) - 2, top: y0 - 22, width: 4, height: 84, background: K.fg, opacity: cut }}>
          <div style={{ position: "absolute", left: 14, top: -48, whiteSpace: "nowrap", fontSize: 34, fontWeight: 800, textShadow: SHADOW }}>2018 盖好 · 只剩 40 年</div>
        </div>
      ) : null}
      {end > 0 ? (
        <div style={{ position: "absolute", left: px(2058) - 2, top: y0 - 22, width: 4, height: 84 + 40 * end, background: `repeating-linear-gradient(${K.red} 0 10px, transparent 10px 18px)` }}>
          <div style={{ position: "absolute", left: 14, top: 96, whiteSpace: "nowrap", fontSize: 34, fontWeight: 800, color: K.red, textShadow: SHADOW, opacity: end }}>2058 到期</div>
        </div>
      ) : null}
      <Axis x={x} w={w} y={y0 + 70} ticks={[2008, 2018, 2028, 2038, 2048, 2058]} />
    </div>
  );
};

// ---------- Rents ----------

export const Rent: React.FC = () => {
  const bar = barAt(useCurrentFrame());
  const o = fade(bar, 27.5, 30.5, 0.3);
  if (o <= 0) return null;
  const k = ramp(bar, 28.3, 29.2, EIO);
  const v = runNum(bar, [
    [28.3, 277],
    [29.2, 142],
  ]);
  const tag = ramp(bar, 29.3, 29.8, EO);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 470, textAlign: "center", opacity: o, fontFamily: FONT, color: K.fg, textShadow: SHADOW }}>
      <div style={{ fontSize: 38, fontWeight: 700, color: SUB }}>写字楼每平方米的月租（全市平均）</div>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 48, marginTop: 14 }}>
        <div style={{ fontSize: 44, fontWeight: 700, color: "rgba(244,240,232,0.6)" }}>
          2018 年 <span style={{ fontFamily: NUM, fontSize: 80, textDecoration: k > 0.05 ? "line-through" : undefined, textDecorationColor: K.red }}>277</span> 元
        </div>
        <div style={{ fontSize: 50, fontWeight: 700, opacity: clamp01(k * 3) }}>
          今天 <span style={{ fontFamily: NUM, fontSize: 150, fontWeight: 700, color: K.gold }}>{Math.round(v)}</span> 元
        </div>
      </div>
      <div style={{ marginTop: 16, fontSize: 42, fontWeight: 800, color: K.fg, opacity: tag, transform: `translateY(${(1 - tag) * 14}px)` }}>跌回了 2011 年的水平</div>
    </div>
  );
};

// The rent's whole arc: up about 70 % from 2011 to 2018, then back down to the 2011 level.
const ARC: [number, number][] = [
  [2011, 160],
  [2018, 276.6],
  [2026.7, 142.2],
];

export const RentArc: React.FC = () => {
  const bar = barAt(useCurrentFrame());
  const o = fade(bar, 30.6, 33.6, 0.3);
  if (o <= 0) return null;
  const X0 = 360;
  const W = 1200;
  const Y0 = 880;
  const Hh = 340;
  const px = (y: number) => X0 + ((y - 2010) / 17) * W;
  const py = (v: number) => Y0 - ((v - 100) / 200) * Hh;
  const up = ramp(bar, 30.9, 31.8, EIO);
  const down = ramp(bar, 32.2, 32.9, EIO);
  const pts = (t0: [number, number], t1: [number, number], k: number) => {
    const out: string[] = [];
    for (let i = 0; i <= 24; i++) {
      const u = (i / 24) * k;
      const e = 0.5 - 0.5 * Math.cos(Math.PI * u);
      out.push(`${px(t0[0] + (t1[0] - t0[0]) * u).toFixed(1)},${py(t0[1] + (t1[1] - t0[1]) * e).toFixed(1)}`);
    }
    return out.join(" ");
  };
  const lbl = (y: number, v: number, text: string, k: number, color: string, dy = -70) => (
    <div style={{ position: "absolute", left: px(y), top: py(v) + dy, transform: "translateX(-50%)", textAlign: "center", opacity: k, fontFamily: FONT, color, textShadow: SHADOW, whiteSpace: "nowrap" }}>
      <div style={{ fontFamily: NUM, fontSize: 56, fontWeight: 700 }}>{text}</div>
    </div>
  );
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <div style={{ position: "absolute", left: 0, top: 480, width: 1920, height: 600, background: "linear-gradient(rgba(5,6,8,0), rgba(5,6,8,0.8) 30%, rgba(5,6,8,0.88))" }} />
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        <line x1={X0} y1={Y0} x2={X0 + W} y2={Y0} stroke="rgba(244,240,232,0.4)" strokeWidth={2} />
        <polyline points={pts(ARC[0], ARC[1], up)} fill="none" stroke={K.green} strokeWidth={8} strokeLinecap="round" />
        {down > 0 ? <polyline points={pts(ARC[1], ARC[2], down)} fill="none" stroke={K.red} strokeWidth={8} strokeLinecap="round" /> : null}
      </svg>
      {[2011, 2018, 2026].map((y) => (
        <div key={y} style={{ position: "absolute", left: px(y), top: Y0 + 14, transform: "translateX(-50%)", fontFamily: NUM, fontSize: 30, color: "rgba(244,240,232,0.75)" }}>
          {y === 2026 ? "今天" : y}
        </div>
      ))}
      {lbl(2011, 160, "约 160", clamp01(up * 4), K.fg, 20)}
      {lbl(2018, 276.6, "277", ramp(bar, 31.7, 32.0), K.green)}
      {lbl(2026.7, 142.2, "142", ramp(bar, 32.8, 33.1), K.red, 20)}
      <div style={{ position: "absolute", left: px(2014.5), top: py(225) - 40, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 44, fontWeight: 800, color: K.green, textShadow: SHADOW, opacity: ramp(bar, 31.5, 31.9), whiteSpace: "nowrap" }}>涨了约七成</div>
    </div>
  );
};

// ---------- Returns: what 29 亿 earns a year, land expiry counted, against government bonds ----------

// Row 2 starts at the 2018 return and slides down with the rent, year by year, to today's Futian rent.
const RET = [
  { at: 38.7, v: 3.38, t: "按 2018 年的租金", c: K.green },
  { at: 40.75, v: 0.92, t: "按今天福田的租金", c: K.theme, slide: true },
  { at: 46.3, v: 0.05, t: "按今天全市的租金", c: K.red, note: "40 年收不回 29 亿" },
];
const BOND = 1.62;

export const Returns: React.FC = () => {
  const bar = barAt(useCurrentFrame());
  const o = fade(bar, 38.5, 48.9, 0.3);
  if (o <= 0) return null;
  const x0 = 820;
  const per = 240; // px per 1 %
  const rowH = 104;
  const y0 = 620;
  const bond = ramp(bar, 46.1, 46.7, EO);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o, fontFamily: FONT, color: K.fg }}>
      <div style={{ position: "absolute", left: 0, top: y0 - 150, width: 1920, height: 620, background: "linear-gradient(rgba(5,6,8,0), rgba(5,6,8,0.82) 24%, rgba(5,6,8,0.9))" }} />
      <div style={{ position: "absolute", left: x0 - 1, top: y0 - 24, width: 2, height: rowH * 3 + 10, background: "rgba(244,240,232,0.45)" }} />
      {bond > 0 ? (
        <div style={{ position: "absolute", left: x0 + BOND * per - 2, top: y0 - 60, width: 4, height: (rowH * 3 + 50) * bond, background: "repeating-linear-gradient(#a9c1e0 0 12px, transparent 12px 20px)" }}>
          <div style={{ position: "absolute", left: 14, top: -10, whiteSpace: "nowrap", fontSize: 34, fontWeight: 800, color: "#a9c1e0", textShadow: SHADOW }}>今天买国债：一年约 1.6%</div>
        </div>
      ) : null}
      {RET.map((r, i) => {
        const g = ramp(bar, r.at, r.at + 0.7, EO);
        if (g <= 0) return null;
        // the sliding row: from the 2018 return down to today's, as the years tick 2018 → 2026
        const sl = r.slide ? ramp(bar, 41.0, 45.6, EIO) : 1;
        const val = r.slide ? 3.38 + (r.v - 3.38) * sl : r.v * g;
        const w = val * per * (r.slide ? g : 1);
        const label = r.slide && sl < 1 ? `按 ${2018 + Math.round(sl * 8)} 年的租金` : r.t;
        const col = r.slide && sl < 1 ? K.gold : r.c;
        return (
          <div key={i} style={{ position: "absolute", left: 0, top: y0 + i * rowH, width: 1920, height: 64, opacity: clamp01(g * 2.5) }}>
            <div style={{ position: "absolute", right: 1920 - x0 + 30, top: "50%", transform: "translateY(-50%)", fontSize: 40, fontWeight: 700, color: SUB, whiteSpace: "nowrap", textShadow: SHADOW }}>{label}</div>
            <div style={{ position: "absolute", left: x0, width: Math.max(6, w), top: 6, bottom: 6, background: col, borderRadius: 5, boxShadow: `0 0 26px ${col}66` }} />
            <div style={{ position: "absolute", left: x0 + Math.max(6, w) + 22, top: "50%", transform: "translateY(-50%)", whiteSpace: "nowrap", textShadow: SHADOW }}>
              {r.note ? (
                <span style={{ fontSize: 44, fontWeight: 800, color: K.red }}>{r.note}</span>
              ) : (
                <>
                  <span style={{ fontFamily: NUM, fontSize: 60, fontWeight: 700, color: col }}>{val.toFixed(1)}%</span>
                  <span style={{ fontSize: 32, fontWeight: 700, marginLeft: 10, color: SUB }}>一年</span>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ---------- The city has braked: office land planned for sale, 2021 vs 2026 ----------

export const Brake: React.FC = () => {
  const bar = barAt(useCurrentFrame());
  const o = fade(bar, 50.4, 53.7, 0.3);
  if (o <= 0) return null;
  const a = ramp(bar, 50.9, 51.6, EO);
  const b = ramp(bar, 51.7, 52.4, EO);
  const S = 360; // 52.3 公顷
  const s = S * Math.sqrt(10 / 52.3);
  const sq = (size: number, k: number, color: string, label: string, sub: string, left: number) => (
    <div style={{ position: "absolute", left, top: 820 - size, width: 520, height: size + 140, opacity: k }}>
      <div style={{ position: "absolute", left: (520 - size * k) / 2, bottom: 140, width: size * k, height: size * k, border: `4px solid ${color}`, background: `${color}33`, boxShadow: `0 0 40px ${color}55` }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 64, textAlign: "center", fontFamily: NUM, fontSize: 64, fontWeight: 700, color, textShadow: SHADOW }}>{label}</div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 18, textAlign: "center", fontFamily: FONT, fontSize: 34, fontWeight: 700, color: SUB, textShadow: SHADOW }}>{sub}</div>
    </div>
  );
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      {sq(S, a, "#a9c1e0", "52.3 公顷", "2021 年", 380)}
      {sq(s, b, K.theme, "10 公顷", "2026 年", 1020)}
    </div>
  );
};

// ---------- The deal: land money vs promised taxes ----------

export const Deal: React.FC = () => {
  const bar = barAt(useCurrentFrame());
  const o = fade(bar, 66.1, 68.2, 0.25);
  if (o <= 0) return null;
  const k = ramp(bar, 66.6, 67.3, EO);
  const H = 320;
  const b = 15;
  return (
    <div style={{ position: "absolute", right: 150, top: 300, width: 620, height: 520, opacity: o, fontFamily: FONT, color: K.fg, textShadow: SHADOW }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: -110, textAlign: "center", fontSize: 32, fontWeight: 700, color: SUB }}>例：南山粤海一块总部用地（2025）</div>
      {[
        { v: 9.65, t: "地价", c: "#7f9bbf", x: 40, g: 1 },
        { v: b, t: "5 年要交的税", c: K.gold, x: 330, g: k },
      ].map((q, i) => (
        <div key={i} style={{ position: "absolute", left: q.x, bottom: 70, width: 220, textAlign: "center" }}>
          <div style={{ fontFamily: NUM, fontSize: 68, fontWeight: 700, color: q.c, opacity: clamp01(q.g * 2) }}>
            {fmt(q.v, q.v % 1 ? 2 : 0)}
            <span style={{ fontFamily: FONT, fontSize: 34 }}> 亿</span>
          </div>
          <div style={{ height: (q.v / b) * H * q.g, background: q.c, borderRadius: 6, marginTop: 10, boxShadow: `0 0 26px ${q.c}66` }} />
          <div style={{ fontSize: 34, fontWeight: 700, marginTop: 14, color: SUB }}>{q.t}</div>
        </div>
      ))}
    </div>
  );
};

// ---------- 亿元楼 counter ----------

export const TaxCount: React.FC = () => {
  const bar = barAt(useCurrentFrame());
  const o = fade(bar, 70.5, 74.5, 0.3);
  if (o <= 0) return null;
  const n = Math.round(
    runNum(bar, [
      [72.4, 50],
      [73.5, 159],
    ]),
  );
  const yr = bar < 72.4 ? "2011 年" : "今天";
  return (
    <div style={{ position: "absolute", left: 120, top: 330, opacity: o, fontFamily: FONT, color: K.fg, textShadow: SHADOW }}>
      <div style={{ fontSize: 44, fontWeight: 700, color: SUB }}>{yr}</div>
      <div style={{ fontFamily: NUM, fontSize: 210, fontWeight: 700, color: K.gold, lineHeight: 1 }}>
        {bar < 72.4 ? "50+" : n}
        <span style={{ fontFamily: FONT, fontSize: 56, marginLeft: 12, color: K.fg }}>栋</span>
      </div>
    </div>
  );
};

// Legend for the 后海 shot: lit orange = new headquarters, dark = the towers their tenants left.
export const MoveOutKey: React.FC = () => {
  const bar = barAt(useCurrentFrame());
  const o = fade(bar, 61.2, 62.9, 0.25);
  if (o <= 0) return null;
  const row = (c: string, t: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <span style={{ width: 30, height: 30, borderRadius: 4, background: c, boxShadow: `0 0 16px ${c}` }} />
      <span>{t}</span>
    </div>
  );
  return (
    <div style={{ position: "absolute", right: 90, top: 300, display: "flex", flexDirection: "column", gap: 14, opacity: o, fontFamily: FONT, fontSize: 36, fontWeight: 700, color: K.fg, textShadow: SHADOW }}>
      {row(K.theme, "新盖好的总部")}
      {row("#2a3140", "原来租的楼，灯暗下来")}
    </div>
  );
};

export const QuestionDim: React.FC = () => {
  const bar = barAt(useCurrentFrame());
  const o = Math.max(fade(bar, 5.3, 6.05, 0.15), fade(bar, 48.8, 50.5, 0.25));
  return o > 0 ? <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 50%, rgba(5,6,8,${0.5 * o}), rgba(5,6,8,${0.25 * o}))` }} /> : null;
};

export const Serif = SERIF;
