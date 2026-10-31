// sb 0–10. Seventy cities as towers at their July 2021 peak (height = second-hand price, Dec 2010 = the dashed line);
// the calendar runs to Sept 2026 and they sink, 35 below the line. Then the forecasts slam in, and "use a ruler".
import React from "react";
import { AbsoluteFill } from "remotion";
import d from "./data2.json";
import { Box, EO, lerp, Note, ramp, Say, useT, win } from "./kit";
import { FONT, K, NUM } from "./theme";
import { BEAT, S } from "./time";
import { Tower } from "./world";

const BASE = 930;
const UNIT = 250; // px per 1.0 (the Dec 2010 price)
const N = d.cities.length;
const xOf = (i: number) => 60 + (i * 1800) / (N - 1);
export const RUN0 = 0.25;
export const RUN1 = S(3.1);

export const QUOTES = [
  { who: "高盛", what: "全国的底，在 2027 年", at: S(6.15) },
  { who: "摩根士丹利", what: "一线和强二线，2027 年下半年才企稳", at: S(6.15) + 2 * BEAT },
  { who: "国内机构", what: "2026 年，筑底完成", at: S(6.15) + 4 * BEAT },
];

export const Hook: React.FC = () => {
  const t = useT();
  if (t > S(10.4)) return null;
  const k = ramp(t, RUN0, RUN1, (x) => x * x * (3 - 2 * x));
  const mi = k * (d.months.length - 1);
  const m0 = Math.floor(mi);
  const fm = mi - m0;
  const lvAt = (lv: number[]) => lerp(lv[m0], lv[Math.min(m0 + 1, lv.length - 1)], fm);
  const avg = lvAt(d.avg) / d.avg[0] - 1;
  const ym = d.months[Math.round(mi)];
  const below = d.cities.filter((c) => lvAt(c.lv) < 1).length;
  const o = 1 - ramp(t, S(9.6), S(10.3));
  const dimQ = 0.65 * win(t, S(6), S(10.3), 0.3, 0.3);
  const lineGlow = ramp(t, S(3), S(3.4));
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        <g opacity={1 - dimQ}>
          {d.cities.map((c, i) => {
            const lv = lvAt(c.lv);
            const under = lv < 1 ? 1 : 0;
            return <Tower key={c.c} x={xOf(i)} base={BASE} w={20} h={lv * UNIT} seed={i + 7} lit={0.62} tone={under ? "#1a2540" : K.tower} roof={under * lineGlow * 0.6} />;
          })}
          <line x1={30} x2={1890} y1={BASE - UNIT} y2={BASE - UNIT} stroke={K.down} strokeWidth={2 + 2 * lineGlow} strokeDasharray="10 8" opacity={0.7 + 0.3 * lineGlow} />
        </g>
      </svg>
      <div style={{ position: "absolute", left: 40, top: BASE - UNIT + 10, fontFamily: FONT, fontSize: 24, fontWeight: 700, color: K.down, opacity: 1 - dimQ }}>2010 年底的房价</div>
      {/* the calendar and the running average */}
      <div style={{ position: "absolute", left: 120, top: 300, fontFamily: NUM, opacity: (1 - dimQ) * (1 - ramp(t, S(4.3), S(4.6))) }}>
        <div style={{ fontSize: 120, fontWeight: 900, color: K.fg, letterSpacing: -2, lineHeight: 1 }}>{ym.replace("-", ".")}</div>
        <div style={{ marginTop: 14, fontFamily: FONT, fontSize: 40, fontWeight: 800, color: K.sub }}>
          70 城二手房，平均 <span style={{ fontFamily: NUM, color: avg < -0.005 ? K.down : K.fg, fontSize: 56 }}>{(avg * 100).toFixed(1)}%</span>
        </div>
        <div style={{ marginTop: 6, fontFamily: FONT, fontSize: 40, fontWeight: 800, color: K.sub }}>
          跌回 2010 年的城市：<span style={{ fontFamily: NUM, color: K.down, fontSize: 56 }}>{below}</span> 座
        </div>
      </div>
      <Box x={120} y={120}>
        <Say at={0.1} out={S(4.3)} size={84} weight={900} stagger={0.6} parts={["房价跌了 5 年。"]} />
      </Box>
      <Box x={120} y={300} gap={10}>
        <Say at={S(4.4)} out={S(6)} size={64} parts={["一半城市，跌回了 ", { t: "2010 年", c: K.down }]} />
        <Say at={S(4.9)} out={S(6)} size={110} weight={900} parts={["到底了吗？"]} />
      </Box>
      <Note at={0.3} out={S(6)}>统计局 70 个大中城市二手住宅价格指数，环比连乘，以 2010 年 12 月为 1；平均为 70 城简单平均，约数</Note>
      {/* the forecasts */}
      {QUOTES.map((q, i) => {
        const a = q.at;
        const kk = ramp(t, a, a + 0.25, EO);
        const out = 1 - ramp(t, S(8.7), S(9));
        if (t < a || out <= 0) return null;
        return (
          <div key={i} style={{ position: "absolute", left: 120 + i * 60, top: 250 + i * 150, transform: `scale(${lerp(1.5, 1, kk)})`, transformOrigin: "0 50%", opacity: kk * out, display: "flex", alignItems: "baseline", gap: 24, padding: "20px 36px", borderRadius: 18, background: "rgba(14,20,38,0.92)", border: "1.5px solid rgba(244,240,232,0.25)", fontFamily: FONT, whiteSpace: "nowrap" }}>
            <span style={{ fontSize: 40, fontWeight: 900, color: K.ice }}>{q.who}</span>
            <span style={{ fontSize: 54, fontWeight: 800, color: K.fg }}>{q.what}</span>
          </div>
        );
      })}
      <Note at={S(6.15)} out={S(9)}>高盛（2025 年 6 月研报）、摩根士丹利（2025 年 12 月展望），据路透、SCMP 等报道；国内机构：易居研究院丁祖昱</Note>
      <Box x={960} y={420} align="center" gap={16}>
        <Say at={S(8.8)} out={S(10.2)} size={64} weight={700} color={K.sub} parts={["别猜了。"]} />
        <Say at={S(9.15)} out={S(10.2)} size={92} weight={900} parts={["用一把尺子，量一量。"]} />
      </Box>
    </AbsoluteFill>
  );
};
