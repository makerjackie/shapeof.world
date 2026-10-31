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
  { who: "高盛", when: "2026 年 10 月", what: "全国新房，2029 年才不再跌", at: S(7.4) },
  { who: "标普", when: "2026 年 10 月", what: "全国新房，2028 年下半年跌到头", at: S(7.4) + 2 * BEAT },
  { who: "摩根大通", when: "2026 年 4 月", what: "北上广深，今年就稳住", at: S(7.4) + 4 * BEAT },
];

export const Hook: React.FC = () => {
  const t = useT();
  if (t > S(11.5)) return null;
  const k = ramp(t, RUN0, RUN1, (x) => x * x * (3 - 2 * x));
  const mi = k * (d.months.length - 1);
  const m0 = Math.floor(mi);
  const fm = mi - m0;
  const lvAt = (lv: number[]) => lerp(lv[m0], lv[Math.min(m0 + 1, lv.length - 1)], fm);
  const avg = lvAt(d.avg) / d.avg[0] - 1;
  const ym = d.months[Math.round(mi)];
  const below = d.cities.filter((c) => lvAt(c.lv) < 1).length;
  const o = 1 - ramp(t, S(10.8), S(11.4));
  const dimQ = 0.7 * win(t, S(6.9), S(11.4), 0.3, 0.3);
  const lineGlow = ramp(t, S(3), S(3.4));
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        <g opacity={1 - dimQ}>
          {d.cities.map((c, i) => {
            const lv = lvAt(c.lv);
            const under = lv < 1 ? 1 : 0;
            return <Tower key={c.c} x={xOf(i)} base={BASE} w={20} h={lv * UNIT} seed={i + 7} lit={0.3} tone={under ? "#1a2540" : K.tower} roof={under * lineGlow * 0.6} />;
          })}
          <line x1={30} x2={1890} y1={BASE - UNIT} y2={BASE - UNIT} stroke={K.down} strokeWidth={2 + 2 * lineGlow} strokeDasharray="10 8" opacity={0.7 + 0.3 * lineGlow} />
        </g>
      </svg>
      <div style={{ position: "absolute", left: 40, top: BASE - UNIT + 10, fontFamily: FONT, fontSize: 24, fontWeight: 700, color: K.down, opacity: 1 - dimQ }}>虚线 = 2010 年底的房价</div>
      {/* the calendar and the running average */}
      <div style={{ position: "absolute", left: 120, top: 330, fontFamily: NUM, opacity: (1 - dimQ) * (1 - ramp(t, S(4.3), S(4.6))) }}>
        <div style={{ fontSize: 120, fontWeight: 900, color: K.fg, letterSpacing: -2, lineHeight: 1 }}>{ym.replace("-", ".")}</div>
        <div style={{ marginTop: 14, fontFamily: FONT, fontSize: 40, fontWeight: 800, color: K.sub }}>
          70 城二手房，平均 <span style={{ fontFamily: NUM, color: avg < -0.005 ? K.down : K.fg, fontSize: 56 }}>{(avg * 100).toFixed(1)}%</span>
        </div>
        <div style={{ marginTop: 6, fontFamily: FONT, fontSize: 40, fontWeight: 800, color: K.sub }}>
          跌回 2010 年的城市：<span style={{ fontFamily: NUM, color: K.down, fontSize: 56 }}>{below}</span> 座
        </div>
      </div>
      <Box x={120} y={100} gap={6}>
        <Say at={0.1} out={S(4.3)} size={84} weight={900} stagger={0.6} parts={["房价跌了 5 年。"]} />
        <Say at={0.5} out={S(4.3)} size={38} weight={700} color={K.sub} stagger={0.5} parts={["一栋楼 = 一座城市的二手房价，一共 70 座城市"]} />
      </Box>
      <Box x={120} y={300} gap={10}>
        <Say at={S(4.4)} out={S(6.9)} size={64} parts={[{ t: "35 座城市", c: K.down }, "，跌回了 2010 年以前"]} />
        <Say at={S(5.1)} out={S(6.9)} size={120} weight={900} parts={["到底了吗？"]} />
      </Box>
      <Note at={0.3} out={S(6.9)}>统计局 70 个大中城市二手住宅价格指数，环比连乘，以 2010 年 12 月为 1；平均为 70 城简单平均，约数</Note>
      {/* the forecasts */}
      {QUOTES.map((q, i) => {
        const a = q.at;
        const kk = ramp(t, a, a + 0.25, EO);
        const out = 1 - ramp(t, S(9.75), S(10.05));
        if (t < a || out <= 0) return null;
        return (
          <div key={i} style={{ position: "absolute", left: 120 + i * 60, top: 260 + i * 150, transform: `scale(${lerp(1.5, 1, kk)})`, transformOrigin: "0 50%", opacity: kk * out, display: "flex", alignItems: "baseline", gap: 24, padding: "20px 36px", borderRadius: 18, background: "rgba(14,20,38,0.92)", border: "1.5px solid rgba(244,240,232,0.25)", fontFamily: FONT, whiteSpace: "nowrap" }}>
            <span style={{ fontSize: 40, fontWeight: 900, color: K.ice }}>{q.who}</span>
            <span style={{ fontSize: 28, fontWeight: 700, color: K.muted }}>{q.when}预测</span>
            <span style={{ fontSize: 54, fontWeight: 800, color: K.fg }}>{q.what}</span>
          </div>
        );
      })}
      <Box x={120} y={130}>
        <Say at={S(7)} out={S(10)} size={56} weight={800} parts={["各家机构的", { t: "预测", c: K.ice }, "："]} />
      </Box>
      <Note at={S(7.4)} out={S(10)}>高盛 2026 年 10 月行业展望、标普 2026 年 10 月报告（据阿思达克、格隆汇、CNBC 转述）；摩根大通 2026 年 4 月报告（据 Mingtiandi 转述）</Note>
      <Box x={960} y={420} align="center" gap={16}>
        <Say at={S(9.85)} out={S(11.3)} size={64} weight={700} color={K.sub} parts={["预测，各说各的。"]} />
        <Say at={S(10.1)} out={S(11.3)} size={76} weight={900} parts={["先看历史：房价是怎么跌到头的？"]} />
      </Box>
    </AbsoluteFill>
  );
};
