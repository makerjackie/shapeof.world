// sb 0–17: a listing price falling on every beat, the question, 70 cities back to 2016 (35 back before 2010); then the
// two camps (北上广深 up seven months, 59 cities still falling), the forecasts flying past, and the new question.
import React from "react";
import { AbsoluteFill } from "remotion";
import data from "./data.json";
import { Box, CL, EO, lerp, Note, ramp, Say, useT, win } from "./kit";
import { FONT, K, NUM } from "./theme";
import { BEAT, S } from "./time";
import { ListingCard } from "./world";

const DROPS = [12, 8, 15, 6, 10, 9, 7, 11, 8, 6]; // 400 → 308, the 70-city average fall (−23%)
export const TAGS = DROPS.map((d, i) => ({ at: 0.15 + i * BEAT, text: `降价 ${d} 万` }));
export const priceAt = (t: number) => {
  let p = 400;
  DROPS.forEach((d, i) => {
    p -= d * ramp(t, TAGS[i].at, TAGS[i].at + 0.22, EO);
  });
  return p;
};
// The year whose 70-city average second-hand level equals this price (400 = the July 2021 peak).
const yearOf = (price: number) => {
  const lv = (price / 400) * Math.max(...data.avg);
  for (let i = 0; i < data.months.length; i++) if (data.avg[i] >= lv) return Number(data.months[i].slice(0, 4));
  return 2021;
};

const GX = 147;
const GY = 318;
const CW = 150;
const CH = 80;
const GAP = 14;
const cell = (i: number) => ({ x: GX + (i % 10) * (CW + GAP), y: GY + Math.floor(i / 10) * (CH + GAP) });
const TIER1 = ["北京", "上海", "广州", "深圳"];

const Grid: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, S(3) + 0.1, S(15.2), 0.4, 0.5);
  if (o <= 0) return null;
  const old = ramp(t, S(5.6), S(6.3));
  const up = ramp(t, S(8.3), S(8.9));
  const down = ramp(t, S(10.6), S(11.3));
  const dimAll = 1 - 0.75 * ramp(t, S(12.4), S(12.9));
  return (
    <AbsoluteFill style={{ opacity: o * dimAll }}>
      {data.cities.map((c, i) => {
        const { x, y } = cell(i);
        const k = ramp(t, S(3.1) + i * 0.012, S(3.1) + i * 0.012 + 0.45, EO);
        const isOld = c.lv < 1;
        const isUp = TIER1.includes(c.c);
        const isDown = c.mom < 100;
        const glowUp = isUp ? up : 0;
        const dark = isOld ? old * (1 - up) : 0;
        const bg = glowUp > 0 ? `rgba(255,179,71,${0.12 + 0.2 * glowUp})` : dark > 0 ? `rgba(10,14,26,${0.6 + 0.3 * dark})` : "rgba(246,243,236,0.08)";
        return (
          <div key={c.c} style={{ position: "absolute", left: x, top: y, width: CW, height: CH, borderRadius: 12, background: bg, border: `1.5px solid ${glowUp > 0 ? K.up : isOld && dark > 0 ? "rgba(127,156,201,0.5)" : "rgba(246,243,236,0.16)"}`, opacity: k, transform: `translateY(${(1 - k) * 16}px)`, fontFamily: FONT, padding: "10px 14px", boxSizing: "border-box" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: K.fg }}>{c.c}</div>
            <div style={{ position: "absolute", left: 14, bottom: 9, fontFamily: NUM, fontSize: 20, fontWeight: 700, color: dark > 0.5 ? K.down : K.sub }}>
              {dark > 0.5 ? "< 2010 年" : `${c.drop.toFixed(0)}%`}
            </div>
            {glowUp > 0 ? <div style={{ position: "absolute", right: 12, top: 8, fontSize: 40, fontWeight: 900, color: K.up, opacity: glowUp }}>↑</div> : null}
            {isDown && down > 0 && !isUp ? <div style={{ position: "absolute", right: 12, top: 8, fontSize: 40, fontWeight: 900, color: K.down, opacity: down }}>↓</div> : null}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const QUOTES = [
  { who: "高盛（2025 年 6 月）", what: "2027 年触底前，可能再跌约 10%" },
  { who: "摩根士丹利（2025 年 12 月）", what: "一线和强二线，2027 年下半年才企稳" },
  { who: "惠誉", what: "2026 年跌 4%–6%，2027 年再跌 2%–4%" },
  { who: "易居研究院 丁祖昱", what: "2026 年是“筑底完成年”" },
];
export const QUOTE_AT = (i: number) => S(12.6) + i * BEAT * 1.6;

const Danmaku: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, S(12.5), S(16), 0.3, 0.4);
  if (o <= 0) return null;
  const grey = ramp(t, S(14.9), S(15.3));
  return (
    <AbsoluteFill style={{ opacity: o }}>
      {QUOTES.map((q, i) => {
        const a = QUOTE_AT(i);
        const k = ramp(t, a, a + 0.6, EO);
        const x = lerp(1960, 260 + (i % 2) * 220, k) - (t - a) * 18;
        return (
          <div key={i} style={{ position: "absolute", left: x, top: 330 + i * 130, display: "flex", alignItems: "baseline", gap: 18, padding: "16px 30px", borderRadius: 999, background: `rgba(14,20,38,${0.85})`, border: `1.5px solid ${grey > 0.5 ? K.dim : "rgba(244,240,232,0.25)"}`, fontFamily: FONT, whiteSpace: "nowrap", opacity: t < a ? 0 : 1 - 0.8 * grey }}>
            <span style={{ fontSize: 30, fontWeight: 800, color: grey > 0.5 ? K.muted : K.ice }}>{q.who}</span>
            <span style={{ fontSize: 40, fontWeight: 800, color: grey > 0.5 ? K.muted : K.fg }}>{q.what}</span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const Open: React.FC = () => {
  const t = useT();
  if (t > S(18.4)) return null;
  // The card: big on the right, then it folds into the grid (its own city cell is the first one).
  const fold = ramp(t, S(2.7), S(3.3), EO);
  const cardO = 1 - ramp(t, S(3.05), S(3.35));
  const price = priceAt(t);
  const yr = yearOf(price);
  return (
    <AbsoluteFill>
      {cardO > 0 ? (
        <ListingCard x={lerp(1300, GX + CW / 2, fold)} y={lerp(560, GY + CH / 2, fold)} s={lerp(1.45, 0.24, fold)} price={price} tags={TAGS} t={t} o={cardO} note={`这个价，回到了 ${yr} 年`} />
      ) : null}
      <Box x={120} y={380}>
        <Say at={0.55} out={S(2.85)} size={118} weight={900} parts={["房价，"]} />
        <Say at={0.85} out={S(2.85)} size={118} weight={900} parts={["到底了吗？"]} />
      </Box>
      <Grid t={t} />
      <Box x={147} y={120} gap={6}>
        <Say at={S(3.2)} out={S(5.45)} size={40} weight={700} color={K.sub} parts={["按统计局 70 座城市的二手房价格"]} />
        <Say at={S(3.75)} out={S(4.75)} size={66} parts={["从 2021 年的最高点，平均跌了约 ", { t: "23%", c: K.down, num: true }]} />
        <Say at={S(4.8)} out={S(5.45)} size={66} parts={["跌回了 ", { t: "2016 年", c: K.down }]} />
      </Box>
      <Box x={147} y={150}>
        <Say at={S(5.6)} out={S(7.9)} size={66} parts={["其中 ", { t: "35 座城市", c: K.down }, "，跌回了 2010 年以前"]} />
      </Box>
      <Note at={S(3.2)} out={S(7.9)}>按统计局 70 城二手住宅价格指数的月度环比连乘，约数；平均为 70 城简单平均。卡片上的房子为示意</Note>
      <Box x={147} y={120} gap={6}>
        <Say at={S(8.1)} out={S(10.4)} size={44} weight={700} color={K.up} parts={["有人说，到底了"]} />
        <Say at={S(8.5)} out={S(10.4)} size={60} parts={["北上广深的二手房，", { t: "连涨 7 个月", c: K.up }]} />
      </Box>
      <Note at={S(8.5)} out={S(10.4)}>2026 年 3–9 月，一线城市二手住宅价格环比连续上涨；上海 9 月比一年前涨 0.8%（统计局）</Note>
      <Box x={147} y={120} gap={6}>
        <Say at={S(10.6)} out={S(12.4)} size={44} weight={700} color={K.down} parts={["有人说，还早"]} />
        <Say at={S(10.95)} out={S(12.4)} size={60} parts={["70 座城市里，", { t: "59 座", c: K.down }, "上个月还在跌"]} />
      </Box>
      <Box x={147} y={150}>
        <Say at={S(12.5)} out={S(14.9)} size={52} weight={800} parts={["各家机构，各说各的"]} />
      </Box>
      <Danmaku t={t} />
      <Box x={960} y={430} align="center">
        <Say at={S(15.15)} out={S(16.1)} size={84} weight={900} parts={["底在哪，没人能提前看到。"]} />
      </Box>
      <Box x={960} y={360} align="center" gap={20}>
        <Say at={S(16.15)} out={S(18.3)} size={52} weight={700} color={K.sub} parts={["先不猜。换个问法："]} />
        <Say at={S(16.5)} out={S(18.3)} size={92} weight={900} parts={["什么时候，买房才", { t: "不算亏", c: K.ice }, "？"]} />
      </Box>
    </AbsoluteFill>
  );
};

export { CL };
