// sb 9.6–76. History as a ranked set of bars; the four signs that come before a bottom, as stepped towers; how many
// China shows (quiet interlude); why buyers stay away: interest dearer than rent, city by city and against Tokyo and
// Hong Kong; loans shrinking; the climax (the loop); the answer; Japan; your city.
import React from "react";
import { AbsoluteFill } from "remotion";
import d from "./data2.json";
import { Box, EO, keys, lerp, Note, ramp, Say, Sources, useT, win } from "./kit";
import { FONT, K, NUM } from "./theme";
import { BEAT, S } from "./time";
import { Tower } from "./world";

const BASE = 930;
const LOW = 850;

// ---------------------------------------------------------------- history, as bars
const PLACES = [
  { n: "美国", y: "2006–2012", drop: 27, yrs: "5.5 年" },
  { n: "西班牙", y: "2007–2014", drop: 37, yrs: "6.5 年" },
  { n: "爱尔兰", y: "2007–2013", drop: 54, yrs: "6 年" },
  { n: "中国香港", y: "1997–2003", drop: 66, yrs: "6 年" },
  { n: "日本", y: "1991–2016", drop: 54, yrs: "25 年" },
  { n: "中国", y: "2021–今天", drop: 23, yrs: "5 年，还在跌" },
];
export const BAR_AT = (i: number) => S(10.7) + i * BEAT * 1.25;
const X0 = 420;
const PX = 15; // px per percentage point
const History: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, S(9.7), S(17.1), 0.4, 0.5);
  if (o <= 0) return null;
  const median = win(t, S(13.9), S(17.1), 0.4, 0.4);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      {PLACES.map((p, i) => {
        const k = ramp(t, BAR_AT(i), BAR_AT(i) + 0.6, EO);
        const cn = p.n === "中国";
        const y = 270 + i * 100;
        return (
          <div key={p.n} style={{ position: "absolute", left: 0, top: y, height: 80, width: 1920, opacity: ramp(t, BAR_AT(i) - 0.1, BAR_AT(i) + 0.2), fontFamily: FONT }}>
            <div style={{ position: "absolute", right: 1920 - X0 + 24, top: 4, textAlign: "right" }}>
              <div style={{ fontSize: 40, fontWeight: 900, color: cn ? K.gold : K.fg, lineHeight: 1.1 }}>{p.n}</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: K.muted }}>{p.y}</div>
            </div>
            <div style={{ position: "absolute", left: X0, top: 12, height: 56, width: p.drop * PX * k, borderRadius: 6, background: cn ? `linear-gradient(90deg, ${K.gold}cc, ${K.gold})` : `linear-gradient(90deg, ${K.down}88, ${K.down})`, boxShadow: cn ? `0 0 26px ${K.gold}66` : undefined }} />
            <div style={{ position: "absolute", left: X0 + p.drop * PX * k + 22, top: 10, whiteSpace: "nowrap", opacity: ramp(t, BAR_AT(i) + 0.4, BAR_AT(i) + 0.7) }}>
              <span style={{ fontFamily: NUM, fontSize: 48, fontWeight: 900, color: cn ? K.gold : K.fg }}>−{p.drop}%</span>
              <span style={{ fontSize: 32, fontWeight: 800, color: K.sub }}>　跌了 {p.yrs}</span>
            </div>
          </div>
        );
      })}
      {median > 0 ? (
        <>
          <div style={{ position: "absolute", left: X0 + 30 * PX, top: 250, width: 0, height: 600, borderLeft: `3px dashed ${K.iceHi}`, opacity: median }} />
          <div style={{ position: "absolute", left: X0 + 30 * PX + 14, top: 226, fontFamily: FONT, fontSize: 28, fontWeight: 800, color: K.iceHi, opacity: median, whiteSpace: "nowrap" }}>一般跌三成</div>
        </>
      ) : null}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- the four signs, and China on them
const STEPS = [
  { n: "① 成交回升", s: "买房的人先回来", h: 230, x: 390 },
  { n: "② 库存下降", s: "卖不掉的房子变少", h: 330, x: 770 },
  { n: "③ 大城市止跌", s: "大城市先不跌了", h: 430, x: 1150 },
  { n: "④ 全国止跌", s: "全国都不跌了", h: 530, x: 1530 },
];
const CN = [0.5, 0, 1, 0]; // 1 = there, 0.5 = halfway, 0 = not yet
const STEP_AT = [S(18.8), S(21.6), S(24.4), S(27.2)];
const CN_AT = [S(34.1), S(36.1), S(32.6), S(38.1)];
const Steps: React.FC<{ t: number }> = ({ t }) => {
  const o = Math.max(win(t, S(17.1), S(40.1), 0.5, 0.5), win(t, S(70), S(72.7), 0.5, 0.4));
  if (o <= 0) return null;
  const late = t > S(65);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        {STEPS.map((s, i) => {
          const rise = late ? 1 : ramp(t, S(17.2) + i * 0.15, S(17.2) + i * 0.15 + 0.7, EO);
          const lit = late ? 0.6 : ramp(t, STEP_AT[i], STEP_AT[i] + 0.4);
          return <Tower key={i} x={s.x} base={BASE} w={330} h={s.h * rise} seed={40 + i} lit={0.12 + 0.4 * lit} tone={lit > 0.5 ? K.towerHi : K.tower} />;
        })}
      </svg>
      {STEPS.map((s, i) => {
        const lit = late ? 1 : ramp(t, STEP_AT[i], STEP_AT[i] + 0.4);
        const st = late ? 1 : ramp(t, CN_AT[i], CN_AT[i] + 0.35, EO);
        const v = CN[i];
        const col = v === 1 ? K.gold : v === 0.5 ? K.up : K.down;
        const word = v === 1 ? "出现了" : v === 0.5 ? "一半" : "还没有";
        return (
          <React.Fragment key={i}>
            <div style={{ position: "absolute", left: s.x - 165, width: 330, top: BASE - s.h + 22, textAlign: "center", fontFamily: FONT, opacity: 0.35 + 0.65 * lit, textShadow: "0 2px 10px #000" }}>
              <div style={{ fontSize: 38, fontWeight: 900, color: K.fg }}>{s.n}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: K.sub }}>{s.s}</div>
            </div>
            {st > 0 ? (
              <div style={{ position: "absolute", left: s.x - 80, width: 160, top: BASE - s.h - 96, display: "flex", flexDirection: "column", alignItems: "center", opacity: st, transform: `scale(${lerp(1.6, 1, st)})` }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: col, boxShadow: `0 0 30px ${col}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontWeight: 900, fontSize: 32, color: K.bg }}>
                  {v === 1 ? "✓" : v === 0.5 ? "½" : "×"}
                </div>
                <div style={{ marginTop: 4, fontFamily: FONT, fontSize: 28, fontWeight: 900, color: col }}>{word}</div>
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- interest vs rent, city by city, and loans
// A year of rent per ¥1m of home price (= gross rent yield). 中指研究院 (China, Sept 2026, cities read from its chart);
// Global Property Guide (Tokyo, Hong Kong, Singapore: listing-based gross yields).
const RENTS = [
  { n: "北京、深圳", v: 1.6, cn: true },
  { n: "上海", v: 1.85, cn: true },
  { n: "全国 50 城平均", v: 2.3, cn: true },
  { n: "长沙", v: 3.1, cn: true },
  { n: "新加坡", v: 3.1, cn: false },
  { n: "香港", v: 3.5, cn: false },
  { n: "东京", v: 3.6, cn: false },
];
const LINE = 2.6;
const RX0 = 520;
const RPX = 300; // px per 万
export const RENT_AT = (i: number) => S(46.3) + i * BEAT * 0.9;
const Rent: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, S(42.1), S(50.1), 0.4, 0.4);
  if (o <= 0) return null;
  const two = 1 - ramp(t, S(45.9), S(46.3)); // first: just interest vs rent (national)
  const lineO = ramp(t, S(42.4), S(43), EO);
  const rentO = ramp(t, S(43.6), S(44.2), EO);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      {/* the interest line, a vertical rule at 2.6 */}
      <div style={{ position: "absolute", left: RX0 + LINE * RPX, top: 300, height: 640, borderLeft: `4px solid ${K.iceHi}`, boxShadow: `0 0 18px ${K.ice}`, opacity: lineO * (1 - two) }} />
      {two > 0 ? (
        <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, opacity: two, fontFamily: FONT }}>
          {[
            { n: "一年的利息", v: LINE, col: K.ice, k: lineO, y: 470 },
            { n: "一年的房租", v: 2.3, col: K.win, k: rentO, y: 590 },
          ].map((b) => (
            <div key={b.n} style={{ position: "absolute", left: 0, top: b.y, width: 1920, height: 90 }}>
              <div style={{ position: "absolute", right: 1920 - RX0 + 24, top: 14, fontSize: 42, fontWeight: 900, color: K.fg }}>{b.n}</div>
              <div style={{ position: "absolute", left: RX0, top: 10, height: 70, width: b.v * RPX * b.k, borderRadius: 8, background: b.col, boxShadow: `0 0 30px ${b.col}66` }} />
              <div style={{ position: "absolute", left: RX0 + b.v * RPX * b.k + 22, top: 8, fontFamily: NUM, fontSize: 56, fontWeight: 900, color: b.col, opacity: b.k }}>约 {b.v} 万</div>
            </div>
          ))}
        </div>
      ) : null}
      {RENTS.map((r, i) => {
        const k = ramp(t, RENT_AT(i), RENT_AT(i) + 0.5, EO);
        const y = 310 + i * 86;
        const over = r.v >= LINE;
        return (
          <div key={r.n} style={{ position: "absolute", left: 0, top: y, width: 1920, height: 80, fontFamily: FONT, opacity: ramp(t, RENT_AT(i) - 0.1, RENT_AT(i) + 0.2) * (1 - two) }}>
            <div style={{ position: "absolute", right: 1920 - RX0 + 24, top: 12, fontSize: 38, fontWeight: 900, color: r.cn ? K.fg : K.iceHi }}>{r.n}</div>
            <div style={{ position: "absolute", left: RX0, top: 12, height: 56, width: r.v * RPX * k, borderRadius: 6, background: over ? K.winHi : K.win, opacity: 0.9 }} />
            <div style={{ position: "absolute", left: RX0 + r.v * RPX * k + 18, top: 10, fontFamily: NUM, fontSize: 44, fontWeight: 900, color: K.winHi, opacity: k }}>{r.v} 万</div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: RX0 + LINE * RPX + 12, top: 940, fontFamily: FONT, fontSize: 28, fontWeight: 800, color: K.iceHi, opacity: lineO * (1 - two), whiteSpace: "nowrap" }}>一年利息 2.6 万</div>
    </AbsoluteFill>
  );
};

const Loans: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, S(50.2), S(55.9), 0.4, 0.4);
  if (o <= 0) return null;
  const k = ramp(t, S(50.6), S(52), EO);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <div style={{ position: "absolute", left: 120, top: 250, fontFamily: FONT }}>
        <div style={{ fontSize: 40, fontWeight: 800, color: K.sub }}>全国个人房贷，还没还完的总数</div>
        <div style={{ fontFamily: NUM, fontSize: 150, fontWeight: 900, color: K.fg, letterSpacing: -3 }}>
          {lerp(37.01, 35.91, k).toFixed(2)}
          <span style={{ fontSize: 70 }}> 万亿</span>
        </div>
        <div style={{ fontSize: 48, fontWeight: 900, color: K.down, opacity: k }}>今年前三季度，少了 1.1 万亿</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- the 70 cities again, under the loop and the answer
const Skyline: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, S(55.9), S(64.2), 0.5, 0.5);
  if (o <= 0) return null;
  const N = d.cities.length;
  const tier1 = ["北京", "上海", "广州", "深圳"];
  const answer = ramp(t, S(60.6), S(61.2));
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        {d.cities.map((c, i) => {
          const lv = c.lv[c.lv.length - 1];
          const t1 = tier1.includes(c.c);
          return <Tower key={c.c} x={60 + (i * 1800) / (N - 1)} base={BASE} w={20} h={lv * 250} seed={i + 7} lit={0.3} tone={t1 && answer > 0 ? K.towerHi : K.tower} roof={t1 ? answer : 0} o={1 - 0.45 * (t1 ? 0 : answer)} />;
        })}
      </svg>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- Japan
// Residential land prices (公示地价, 国土交通省): Tokyo-to peak 1988, bottom 2005 (−62%), 2025 −50%; all Japan peak 1991,
// bottom 2016 (−54%), 2025 −51%. Only these years; between them the towers are interpolated.
const JP = [
  { n: "东京", k: [[1988, 1], [2005, 0.38], [2025, 0.5]] as [number, number][], x: 760 },
  { n: "日本全国", k: [[1991, 1], [2016, 0.46], [2025, 0.49]] as [number, number][], x: 1240 },
];
const Japan: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, S(64.2), S(70.1), 0.5, 0.5);
  if (o <= 0) return null;
  const yr = lerp(1988, 2025, ramp(t, S(65), S(68.2), (x) => x));
  const H = 520;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        {JP.map((j, i) => (
          <g key={j.n}>
            <rect x={j.x - 120} y={LOW - H} width={240} height={H} fill="none" stroke={K.sub} strokeDasharray="8 7" strokeWidth={2} opacity={0.45} />
            <Tower x={j.x} base={LOW} w={240} h={H * keys(yr, j.k, (x) => x)} seed={70 + i} lit={0.3} />
          </g>
        ))}
      </svg>
      <div style={{ position: "absolute", right: 120, top: 330, fontFamily: NUM, fontSize: 120, fontWeight: 900, color: K.fg }}>{Math.round(yr)}</div>
      {JP.map((j) => (
        <div key={j.n} style={{ position: "absolute", left: j.x - 200, width: 400, top: LOW + 14, textAlign: "center", fontFamily: FONT }}>
          <div style={{ fontSize: 40, fontWeight: 900, color: K.fg }}>{j.n}</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: K.sub }}>住宅地价</div>
        </div>
      ))}
      <div style={{ position: "absolute", right: 1920 - (760 - 140), top: LOW - H + 6, fontFamily: FONT, fontSize: 26, fontWeight: 700, color: K.muted }}>虚线 = 最高时的价格</div>
    </AbsoluteFill>
  );
};

export const Story: React.FC = () => {
  const t = useT();
  if (t < S(9.5)) return null;
  return (
    <AbsoluteFill>
      <History t={t} />
      <Steps t={t} />
      <Rent t={t} />
      <Loans t={t} />
      <Skyline t={t} />
      <Japan t={t} />

      {/* history */}
      <Box x={120} y={120}>
        <Say at={S(9.75)} out={S(13.8)} size={60} parts={["历史上的房价大跌：跌了多少，跌了多久？"]} />
      </Box>
      <Box x={120} y={110} gap={6}>
        <Say at={S(13.9)} out={S(15.45)} size={46} weight={700} color={K.sub} parts={["高盛统计了 21 次房价大跌："]} />
        <Say at={S(14.2)} out={S(15.45)} size={60} parts={["一般跌 ", { t: "6 年", c: K.iceHi }, "、跌 ", { t: "三成", c: K.iceHi }, " 左右"]} />
      </Box>
      <Box x={120} y={120}>
        <Say at={S(15.55)} out={S(17.05)} size={60} parts={[{ t: "中国", c: K.gold }, "：跌了 5 年、两成多，", { t: "还没停", c: K.down }]} />
      </Box>
      <Note at={S(9.75)} out={S(17.05)}>名义价格，从最高到最低：美国 Case-Shiller 全国；西班牙、爱尔兰 BIS；香港差饷物业估价署；日本为全国住宅地价（国土交通省）；中国为统计局 70 城二手住宅指数连乘。高盛 2025 年 6 月：15 个经济体 21 次实际房价跌超两成，中位数约 6 年、−30%（扣除通胀）</Note>

      {/* the four signs */}
      <Box x={960} y={120} align="center" gap={6}>
        <Say at={S(17.2)} out={S(18.7)} size={70} weight={900} parts={["房价跌到头之前，会先出现 ", { t: "4 个信号", c: K.iceHi }]} />
      </Box>
      <Box x={120} y={120} gap={8}>
        <Say at={S(18.8)} out={S(21.5)} size={58} parts={["① 成交回升：买房的人先回来"]} />
        <Say at={S(19.4)} out={S(21.5)} size={40} weight={700} color={K.sub} parts={["美国：新房销量，比房价早一年到底"]} />
      </Box>
      <Box x={120} y={120} gap={8}>
        <Say at={S(21.6)} out={S(24.3)} size={58} parts={["② 库存下降：卖不掉的房子变少"]} />
        <Say at={S(22.2)} out={S(24.3)} size={40} weight={700} color={K.sub} parts={["美国：没卖掉的新房只够卖 5 个月时，房价到底"]} />
      </Box>
      <Box x={120} y={120} gap={8}>
        <Say at={S(24.4)} out={S(27.1)} size={58} parts={["③ 大城市先止跌"]} />
        <Say at={S(25)} out={S(27.1)} size={40} weight={700} color={K.sub} parts={["日本：东京比全国早 11 年到底"]} />
      </Box>
      <Box x={120} y={120} gap={8}>
        <Say at={S(27.2)} out={S(29.9)} size={58} parts={["④ 最后，全国才止跌"]} />
      </Box>
      <Note at={S(18.8)} out={S(29.9)}>美国：普查局新房销量 2011 年 2 月见底，Case-Shiller 全国房价 2012 年 2 月见底；新房待售月数 2009 年 1 月 12.2 个月，2012 年 2 月 4.8 个月。日本：国土交通省公示地价，东京都住宅地 2005 年、全国 2016 年最低。都柏林也比爱尔兰全国早约一年</Note>
      <Box x={960} y={130} align="center">
        <Say at={S(30)} out={S(32.45)} size={72} weight={900} parts={["这 4 个信号，", { t: "中国", c: K.gold }, "出现了几个？"]} />
      </Box>
      <Box x={120} y={120}>
        <Say at={S(32.6)} out={S(34)} size={52} parts={["③ 一线城市二手房，3 月起月月在涨"]} />
      </Box>
      <Box x={120} y={120}>
        <Say at={S(34.1)} out={S(36)} size={52} parts={["① 二手房多卖了 11%，新房少卖了 13%"]} />
      </Box>
      <Box x={120} y={120}>
        <Say at={S(36.1)} out={S(38)} size={52} parts={["② 新房要卖 27 个月，比年中还长"]} />
      </Box>
      <Box x={120} y={120}>
        <Say at={S(38.1)} out={S(40)} size={52} parts={["④ 70 座城市里，59 座的二手房还在跌"]} />
      </Box>
      <Note at={S(32.6)} out={S(40)}>统计局 2026 年 1–9 月：二手房网签面积 +10.7%（住建部），新建商品房销售面积 −13.2%；9 月 70 城二手住宅 59 城环比下跌，一线城市 3–9 月环比上涨。克而瑞：9 月末 50 城商品住宅去化周期 26.9 个月，比 6 月末长 0.6 个月</Note>

      {/* why buyers stay away */}
      <Box x={960} y={150} align="center" gap={10}>
        <Say at={S(40.05)} out={S(42)} size={76} weight={900} parts={["买房的人，为什么还不回来？"]} />
      </Box>
      <Box x={120} y={120} gap={8}>
        <Say at={S(42.1)} out={S(45.85)} size={52} weight={700} color={K.sub} parts={["算一笔账：同一套 100 万的房子"]} />
        <Say at={S(44.4)} out={S(45.85)} size={68} weight={900} parts={["光利息，就比", { t: "房租还贵", c: K.winHi }]} />
      </Box>
      <Note at={S(42.1)} out={S(45.85)}>利息：首付三成按大额存单 1.55% 算少拿的利息，贷款七成按 9 月新发房贷平均约 3.1%（人民银行）。本金不算，那是存进房子的钱。房租：中指研究院 50 城平均租金回报率 2.30%（年租金 ÷ 房价，这个比例就是“租售比”）</Note>
      <Box x={120} y={120} gap={8}>
        <Say at={S(46)} out={S(50.05)} size={52} weight={700} color={K.sub} parts={["每 100 万的房子，一年能收多少房租？"]} />
        <Say at={S(48.6)} out={S(50.05)} size={58} parts={["北上广深的房租，只有", { t: "东京、香港的一半", c: K.iceHi }]} />
      </Box>
      <Note at={S(46)} out={S(50.05)}>中国：中指研究院 2026 年 9 月（城市值按其图表读取）；东京、香港、新加坡：Global Property Guide 毛租金回报率（挂牌口径）。两边都是“一年房租 ÷ 同一套房的房价”，公摊不影响这个比例</Note>
      <Box x={120} y={120}>
        <Say at={S(50.2)} out={S(55.85)} size={60} parts={["所以，大家在", { t: "还钱", c: K.down }, "，不在借钱"]} />
      </Box>
      <Box x={120} y={700}>
        <Say at={S(52.6)} out={S(55.85)} size={56} weight={800} parts={["房价还在跌，就更没人急着买"]} />
      </Box>
      <Note at={S(50.2)} out={S(55.85)}>中国人民银行《2026 年三季度金融机构贷款投向统计报告》：9 月末个人住房贷款余额 35.91 万亿元，前三季度减少 1.10 万亿元</Note>

      {/* the climax: the loop */}
      <Box x={960} y={200} align="center" gap={24}>
        <Say at={S(56.05)} out={S(60.5)} size={84} weight={900} parts={["买房的人，在等", { t: "房价再跌", c: K.down }, "；"]} />
        <Say at={S(57.4)} out={S(60.5)} size={84} weight={900} parts={["房价，在等", { t: "买房的人回来", mark: true }, "。"]} />
      </Box>
      <Note at={S(56.05)} out={S(60.5)}>标普 2026 年 2 月：“房价下跌侵蚀购房者信心，这是一个没有简单出口的恶性循环。”</Note>

      {/* the answer */}
      <Box x={960} y={150} align="center" gap={18}>
        <Say at={S(60.6)} out={S(64.1)} size={52} weight={700} color={K.sub} parts={["所以，房价到底了吗？"]} />
        <Say at={S(61.1)} out={S(64.1)} size={68} weight={900} parts={["北上广深：", { t: "已经出现止跌信号", c: K.gold }]} />
        <Say at={S(61.9)} out={S(64.1)} size={68} weight={900} parts={["全国：4 个信号，", { t: "只出现了一个半", c: K.down }]} />
        <Say at={S(62.7)} out={S(64.1)} size={40} weight={700} color={K.sub} parts={["机构预测，全国还要两三年（仅供参考）"]} />
      </Box>
      <Note at={S(61.1)} out={S(64.1)}>机构预测：标普全国新房 2028 年三季度见底，高盛全国新房 2029 年不再下跌（均为 2026 年 10 月，据转述）。本片不构成购房建议</Note>

      {/* Japan */}
      <Box x={120} y={120} gap={8}>
        <Say at={S(64.3)} out={S(70)} size={60} parts={["就算跌到头，", { t: "也不一定会涨回去", c: K.ice }]} />
        <Say at={S(65.6)} out={S(70)} size={44} weight={700} color={K.sub} parts={["日本：东京 2005 年到底，全国又跌了 11 年"]} />
        <Say at={S(67.8)} out={S(70)} size={44} weight={700} color={K.sub} parts={["到今天，还比最高时低一半"]} />
      </Box>
      <Note at={S(64.3)} out={S(70)}>国土交通省公示地价（住宅地），年变动率连乘，只取最高、最低和 2025 年，中间为示意：东京都 1988 年最高、2005 年最低（约 −62%），2025 年仍低约 50%；全国 1991 年最高、2016 年最低（约 −54%），2025 年仍低约 51%</Note>

      {/* your city */}
      <Box x={960} y={140} align="center" gap={18}>
        <Say at={S(70.1)} out={S(72.6)} size={60} weight={800} parts={["底，是一座城市、一座城市来的。"]} />
        <Say at={S(70.9)} out={S(72.6)} size={84} weight={900} parts={["你的城市，", { t: "出现了几个信号", mark: true }, "？"]} />
      </Box>
      <Sources at={S(72.7)} out={S(74.3)} />
    </AbsoluteFill>
  );
};
