// 2D overlays that sit on the 3D city: the year counter, the 50-year lease bar, rents, the payback timeline, the
// deal's scales and the 亿元楼 counter. Timing in film bars.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { FONT, K, MONO, SERIF } from "../theme";
import { barAt, bf, clamp01, EIO, EO, ramp } from "./bars";
import { yearAt } from "./world";
import { fade, fmt, runNum, SHADOW } from "./ui";

const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const NUM = `${MONO}`;

// ---------- Year counter (time travel) ----------

export const YearCounter: React.FC = () => {
  const bar = barAt(useCurrentFrame());
  const o = Math.max(fade(bar, 10.1, 20.1, 0.3), fade(bar, 20.3, 24.6, 0.3));
  if (o <= 0) return null;
  const y = Math.round(yearAt(bar));
  return (
    <div style={{ position: "absolute", right: 72, top: 52, textAlign: "right", opacity: o, fontFamily: FONT, color: K.fg, textShadow: SHADOW }}>
      <div style={{ fontFamily: NUM, fontSize: 108, fontWeight: 700, letterSpacing: -2, lineHeight: 1 }}>{y}</div>
      <div style={{ fontSize: 24, fontWeight: 600, color: "rgba(244,240,232,0.7)", marginTop: 6 }}>年</div>
    </div>
  );
};

// ---------- Skyline counter (200 m+ towers) ----------

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
  const o = fade(bar, 21.0, 24.6, 0.3);
  if (o <= 0) return null;
  const y = yearAt(bar);
  const row = SKY.filter((r) => r[0] <= Math.floor(y + 0.001)).pop() ?? SKY[0];
  return (
    <div style={{ position: "absolute", right: 72, top: 230, textAlign: "right", opacity: o, fontFamily: FONT, color: K.fg, textShadow: SHADOW }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: "rgba(244,240,232,0.78)" }}>深圳 200 米以上的楼</div>
      <div style={{ fontFamily: NUM, fontSize: 96, fontWeight: 700, color: K.gold, lineHeight: 1.05 }}>
        {row[1]}
        <span style={{ fontFamily: FONT, fontSize: 34, marginLeft: 8, color: K.fg }}>栋</span>
      </div>
    </div>
  );
};

// ---------- The 50-year lease, planted when the land is bought ----------

const AX0 = 2008;
const AX1 = 2062;

const Axis: React.FC<{ x: number; w: number; y: number; o: number; ticks: number[] }> = ({ x, w, y, o, ticks }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: 40, opacity: o }}>
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 2, background: "rgba(244,240,232,0.35)" }} />
    {ticks.map((t) => (
      <div key={t} style={{ position: "absolute", left: ((t - AX0) / (AX1 - AX0)) * w, top: 0 }}>
        <div style={{ width: 2, height: 10, background: "rgba(244,240,232,0.5)" }} />
        <div style={{ position: "absolute", top: 14, transform: "translateX(-50%)", fontFamily: NUM, fontSize: 22, color: "rgba(244,240,232,0.7)" }}>{t}</div>
      </div>
    ))}
  </div>
);

const Bar: React.FC<{ x: number; w: number; y: number; from: number; to: number; grow: number; color: string; h?: number; label?: React.ReactNode; labelColor?: string; o?: number; over?: number }> = ({
  x,
  w,
  y,
  from,
  to,
  grow,
  color,
  h = 30,
  label,
  labelColor,
  o = 1,
  over,
}) => {
  const px = (yr: number) => ((yr - AX0) / (AX1 - AX0)) * w;
  const end = from + (to - from) * grow;
  const split = over !== undefined && end > over ? over : end;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, opacity: o }}>
      <div style={{ position: "absolute", left: px(from), width: Math.max(0, px(split) - px(from)), top: 0, bottom: 0, background: color, borderRadius: 4, boxShadow: `0 0 24px ${color}55` }} />
      {over !== undefined && end > over ? (
        <div style={{ position: "absolute", left: px(over), width: px(end) - px(over), top: 0, bottom: 0, background: K.red, borderRadius: 4, boxShadow: `0 0 30px ${K.red}` }} />
      ) : null}
      {label ? (
        <div style={{ position: "absolute", left: px(end) + 16, top: "50%", transform: "translateY(-50%)", whiteSpace: "nowrap", fontFamily: FONT, fontSize: 30, fontWeight: 800, color: labelColor ?? color, textShadow: SHADOW, opacity: clamp01(grow * 3) }}>
          {label}
        </div>
      ) : null}
    </div>
  );
};

export const LeaseBar: React.FC = () => {
  const frame = useCurrentFrame();
  const bar = barAt(frame);
  const o = fade(bar, 14.6, 16.4, 0.3);
  if (o <= 0) return null;
  const g = ramp(bar, 14.9, 15.7, EIO);
  const x = 230;
  const w = 1460;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <Axis x={x} w={w} y={968} o={1} ticks={[2008, 2018, 2028, 2038, 2048, 2058]} />
      <Bar x={x} w={w} y={920} from={2008} to={2058} grow={g} color="#7f9bbf" label="50 年使用权" labelColor={K.fg} />
    </div>
  );
};

// ---------- Rents ----------

export const Rent: React.FC = () => {
  const frame = useCurrentFrame();
  const bar = barAt(frame);
  const o = fade(bar, 27.4, 30.2, 0.3);
  if (o <= 0) return null;
  const k = ramp(bar, 28.3, 29.2, EIO);
  const v = runNum(bar, [
    [28.3, 2.77],
    [29.2, 1.42],
  ]);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o, fontFamily: FONT, color: K.fg, textShadow: SHADOW }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 560, textAlign: "center" }}>
        <div style={{ fontSize: 34, fontWeight: 700, color: "rgba(244,240,232,0.85)" }}>全市平均，租 100 平方米的写字楼，一个月</div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 40, marginTop: 18 }}>
          <div style={{ fontSize: 42, fontWeight: 700, color: "rgba(244,240,232,0.55)", textDecoration: k > 0.05 ? "line-through" : undefined, textDecorationColor: K.red }}>
            2018 年 <span style={{ fontFamily: NUM, fontSize: 64 }}>2.77</span> 万
          </div>
          <div style={{ fontSize: 46, fontWeight: 700, opacity: clamp01(k * 3) }}>
            今天 <span style={{ fontFamily: NUM, fontSize: 132, fontWeight: 700, color: K.gold }}>{v.toFixed(2)}</span> 万
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------- This tower's rent ----------

export const OwnRent: React.FC = () => {
  const frame = useCurrentFrame();
  const bar = barAt(frame);
  const o = fade(bar, 31.4, 33.2, 0.3);
  if (o <= 0) return null;
  const stamp = interpolate(frame, [bf(32.2), bf(32.2) + 7], [0, 1], { ...CL, easing: EO });
  return (
    <div style={{ position: "absolute", right: 110, top: 640, width: 660, padding: "22px 30px", borderRadius: 16, background: "rgba(5,6,8,0.55)", opacity: o, fontFamily: FONT, color: K.fg, textShadow: SHADOW }}>
      <div style={{ fontSize: 26, fontWeight: 600, color: "rgba(244,240,232,0.75)" }}>南塔出租楼层 · 每平方米每月</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 22, marginTop: 6 }}>
        <span style={{ fontSize: 26, color: "rgba(244,240,232,0.6)" }}>2018 年</span>
        <span style={{ fontFamily: NUM, fontSize: 62, fontWeight: 700, color: "rgba(244,240,232,0.6)" }}>228.51</span>
        <span style={{ fontSize: 40 }}>→</span>
        <span style={{ fontSize: 26, color: "rgba(244,240,232,0.8)" }}>2023 年</span>
        <span style={{ fontFamily: NUM, fontSize: 80, fontWeight: 700, color: K.fg }}>215</span>
      </div>
      <div
        style={{
          display: "inline-block",
          marginTop: 22,
          padding: "6px 20px",
          border: `5px solid ${K.red}`,
          borderRadius: 10,
          color: K.red,
          fontSize: 50,
          fontWeight: 900,
          letterSpacing: 6,
          transform: `rotate(-6deg) scale(${1 + (1 - stamp) * 1.4})`,
          opacity: stamp,
          textShadow: "none",
          background: "rgba(5,6,8,0.35)",
        }}
      >
        五年不涨
      </div>
    </div>
  );
};

// ---------- The account: payback vs the lease ----------

export const Account: React.FC = () => {
  const frame = useCurrentFrame();
  const bar = barAt(frame);
  const o = fade(bar, 34.4, 51.0, 0.4);
  if (o <= 0) return null;
  const x = 200;
  const w = 1480;
  const y0 = 640;
  const lease = ramp(bar, 38.3, 39.3, EIO);
  const end = ramp(bar, 39.3, 39.9, EO);
  const cut = ramp(bar, 40.2, 40.9, EIO);
  const p22 = ramp(bar, 35.6, 36.8, EIO) * (1 - ramp(bar, 42.2, 42.9, EIO));
  const p33 = ramp(bar, 46.0, 46.9, EO);
  const p41 = ramp(bar, 46.4, 47.6, EO);
  const px = (yr: number) => x + ((yr - AX0) / (AX1 - AX0)) * w;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o, fontFamily: FONT, color: K.fg }}>
      <div style={{ position: "absolute", left: 0, top: y0 - 40, width: 1920, height: 460, background: "linear-gradient(rgba(5,6,8,0), rgba(5,6,8,0.55) 22%, rgba(5,6,8,0.7))" }} />
      {/* the lease */}
      <Bar x={x} w={w} y={y0} from={2008} to={2058} grow={lease} color="#7f9bbf" h={26} o={lease > 0 ? 1 : 0} label="地：50 年" labelColor={K.fg} />
      {cut > 0 ? (
        <div style={{ position: "absolute", left: px(2018) - 1, top: y0 - 16, width: 3, height: 58 + 210 * cut, background: K.fg, opacity: cut }}>
          <div style={{ position: "absolute", left: 12, top: -8, whiteSpace: "nowrap", fontSize: 26, fontWeight: 800, textShadow: SHADOW }}>2018 盖好 · 只剩 40 年</div>
        </div>
      ) : null}
      {/* the land runs out in 2058 */}
      {end > 0 ? (
        <div style={{ position: "absolute", left: px(2058) - 1, top: y0 - 14, width: 3, height: 240 * end, background: `repeating-linear-gradient(${K.red} 0 10px, transparent 10px 18px)`, opacity: 0.95 }}>
          <div style={{ position: "absolute", left: 10, top: 236 * end - 4, whiteSpace: "nowrap", fontSize: 24, fontWeight: 800, color: K.red, textShadow: SHADOW, transform: "translateY(-100%)" }}>2058 地到期</div>
        </div>
      ) : null}
      {/* payback bars from 2018 */}
      <Bar x={x} w={w} y={y0 + 70} from={2018} to={2040} grow={p22} color={K.green} label={<span>约 22 年<span style={{ fontSize: 22, fontWeight: 600, marginLeft: 10, color: "rgba(244,240,232,0.75)" }}>按 2018 年的租金</span></span>} />
      <Bar x={x} w={w} y={y0 + 70} from={2018} to={2051} grow={p33} color={K.theme} over={2058} label={<span>33 年<span style={{ fontSize: 22, fontWeight: 600, marginLeft: 10, color: "rgba(244,240,232,0.75)" }}>按今天福田的租金</span></span>} />
      <Bar x={x} w={w} y={y0 + 130} from={2018} to={2059} grow={p41} color={K.theme} over={2058} label={<span>41 年<span style={{ fontSize: 22, fontWeight: 600, marginLeft: 10, color: "rgba(244,240,232,0.75)" }}>按今天全市的租金</span></span>} labelColor={K.red} />
      <Axis x={x} w={w} y={y0 + 200} o={1} ticks={[2008, 2018, 2028, 2038, 2048, 2058]} />
      <div style={{ position: "absolute", left: x, top: y0 + 62, fontSize: 22, fontWeight: 600, color: "rgba(244,240,232,0.6)", transform: "translateY(-100%)" }}>{bar > 35.4 ? "假如整栋出租，收回 29 亿要……" : ""}</div>
    </div>
  );
};

// ---------- The deal: land money vs promised taxes ----------

export const Deal: React.FC = () => {
  const frame = useCurrentFrame();
  const bar = barAt(frame);
  const o = fade(bar, 58.5, 60.3, 0.25);
  if (o <= 0) return null;
  const k = ramp(bar, 58.9, 59.6, EO);
  const H = 300;
  const a = 9.65;
  const b = 15;
  return (
    <div style={{ position: "absolute", right: 170, top: 330, width: 560, height: 470, opacity: o, fontFamily: FONT, color: K.fg, textShadow: SHADOW }}>
      {[
        { v: a, t: "地价", c: "#7f9bbf", x: 40, g: 1 },
        { v: b, t: "5 年要交的税", c: K.gold, x: 300, g: k },
      ].map((q, i) => (
        <div key={i} style={{ position: "absolute", left: q.x, bottom: 70, width: 190, textAlign: "center" }}>
          <div style={{ fontFamily: NUM, fontSize: 56, fontWeight: 700, color: q.c, opacity: clamp01(q.g * 2) }}>
            {fmt(q.v, q.v % 1 ? 2 : 0)}
            <span style={{ fontFamily: FONT, fontSize: 28 }}> 亿</span>
          </div>
          <div style={{ height: (q.v / b) * H * q.g, background: q.c, borderRadius: 6, marginTop: 10, boxShadow: `0 0 26px ${q.c}66` }} />
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 14, color: "rgba(244,240,232,0.85)" }}>{q.t}</div>
        </div>
      ))}
    </div>
  );
};

// ---------- 亿元楼 counter ----------

export const TaxCount: React.FC = () => {
  const frame = useCurrentFrame();
  const bar = barAt(frame);
  const o = fade(bar, 62.6, 66.4, 0.3);
  if (o <= 0) return null;
  const n = Math.round(runNum(bar, [
    [62.8, 0],
    [64.4, 50],
    [64.9, 50],
    [65.7, 159],
  ]));
  const yr = bar < 64.9 ? "2011 年" : "今天";
  return (
    <div style={{ position: "absolute", left: 120, top: 330, opacity: o, fontFamily: FONT, color: K.fg, textShadow: SHADOW }}>
      <div style={{ fontSize: 30, fontWeight: 700, color: "rgba(244,240,232,0.85)" }}>{yr}</div>
      <div style={{ fontFamily: NUM, fontSize: 168, fontWeight: 700, color: K.gold, lineHeight: 1 }}>
        {bar < 64.9 && n >= 50 ? "50+" : n}
        <span style={{ fontFamily: FONT, fontSize: 44, marginLeft: 10, color: K.fg }}>栋</span>
      </div>
    </div>
  );
};

export const QuestionDim: React.FC = () => {
  const bar = barAt(useCurrentFrame());
  const o = fade(bar, 5.35, 6.2, 0.2);
  return o > 0 ? <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 50%, rgba(5,6,8,${0.45 * o}), rgba(5,6,8,${0.2 * o}))` }} /> : null;
};

export const Serif = SERIF;
