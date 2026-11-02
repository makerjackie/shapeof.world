// Chapters 2 and 3 (sb 32–56): why prices rose for twenty years and fell for five. Three towers — local government,
// developers, households — stand on one glowing plinth, 房价. Each tower lights with how it bet on prices; the plinth
// turns gold ("只涨不跌"); then it cracks (三道红线, 恒大, 停贷) and the three towers sink by their own numbers.
import React from "react";
import { AbsoluteFill } from "remotion";
import { Box, EO, keys, lerp, Note, ramp, Say, useT, win } from "./kit";
import { FONT, K, NUM } from "./theme";
import { S } from "./time";
import { Tower } from "./world";

const BASE = 860;
const COLS = [
  { n: "地方政府", s: "卖地", x: 480, h: 420, lit: S(33.5), sink: 0.48, from: "卖地 8.7 万亿", to: "4.2 万亿", at: S(51.0) },
  { n: "开发商", s: "盖楼、卖房", x: 960, h: 470, lit: S(35.4), sink: 0.46, from: "卖房 18.2 万亿", to: "8.4 万亿", at: S(51.6) },
  { n: "家庭", s: "借钱买房", x: 1440, h: 400, lit: S(37.4), sink: 0.94, from: "房贷 38.2 万亿", to: "35.9 万亿", at: S(52.2) },
];

export const Ch23: React.FC = () => {
  const t = useT();
  if (t < S(32) || t > S(56.2)) return null;
  const o = win(t, S(33.3), S(56), 0.5, 0.4);
  const gold = ramp(t, S(39.4), S(40), EO) * (1 - ramp(t, S(44.1), S(44.6)));
  const crack = ramp(t, S(44.1), S(44.7), EO);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: o }}>
        <svg width={1920} height={1080} style={{ position: "absolute" }}>
          {/* the plinth: 房价 */}
          <rect x={260} y={BASE} width={1400} height={34} rx={6} fill={gold > 0 ? K.gold : K.iceHi} opacity={0.22 + 0.5 * gold} />
          <rect x={260} y={BASE} width={1400} height={4} fill={gold > 0 ? K.gold : K.iceHi} opacity={0.8} />
          {crack > 0 ? (
            <g opacity={crack} stroke={K.bg} strokeWidth={6} fill="none">
              <path d={`M ${720} ${BASE} l 18 14 l -12 10 l 16 12`} />
              <path d={`M ${1200} ${BASE} l -14 12 l 18 10 l -10 12`} />
            </g>
          ) : null}
          {COLS.map((c, i) => {
            const lit = ramp(t, c.lit, c.lit + 0.4);
            const sink = ramp(t, c.at, c.at + 0.9, EO);
            const h = c.h * lerp(1, c.sink, sink);
            return <Tower key={c.n} x={c.x} base={BASE} w={260} h={h} seed={80 + i} lit={0.15 + 0.5 * lit * (1 - 0.4 * sink)} tone={lit > 0.5 ? K.towerHi : K.tower} roof={gold * 0.8} />;
          })}
        </svg>
        <div style={{ position: "absolute", left: 260, width: 1400, top: BASE + 40, textAlign: "center", fontFamily: FONT, fontSize: 32, fontWeight: 900, color: gold > 0.5 ? K.gold : K.iceHi, letterSpacing: 6 }}>
          {gold > 0.5 ? "房价 · 只涨不跌" : "房价"}
        </div>
        {COLS.map((c) => {
          const sink = ramp(t, c.at, c.at + 0.9, EO);
          const h = c.h * lerp(1, c.sink, sink);
          const num = ramp(t, c.at, c.at + 0.4);
          return (
            <React.Fragment key={c.n}>
              <div style={{ position: "absolute", left: c.x - 150, width: 300, top: BASE - h + 24, textAlign: "center", fontFamily: FONT, textShadow: "0 2px 10px #000" }}>
                <div style={{ fontSize: 40, fontWeight: 900, color: K.fg }}>{c.n}</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: K.sub }}>{c.s}</div>
              </div>
              {num > 0 ? (
                <div style={{ position: "absolute", left: c.x - 200, width: 400, top: BASE - h - 110, textAlign: "center", fontFamily: FONT, opacity: num }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: K.sub }}>{c.from} →</div>
                  <div style={{ fontFamily: NUM, fontSize: 52, fontWeight: 900, color: K.down }}>{c.to}</div>
                </div>
              ) : null}
            </React.Fragment>
          );
        })}
      </AbsoluteFill>

      {/* chapter 2: why it rose */}
      <Box x={960} y={190} align="center" gap={10}>
        <Say at={S(32.05)} out={S(33.4)} size={44} weight={700} color={K.ice} parts={["为什么涨了二十年"]} />
        <Say at={S(32.3)} out={S(33.4)} size={80} weight={900} parts={["房价，凭什么能贵到 60 年房租？"]} />
      </Box>
      <Box x={120} y={110} gap={6}>
        <Say at={S(33.5)} out={S(35.3)} size={54} parts={[{ t: "地方政府", c: K.iceHi }, "：靠卖地。2021 年卖地收了 8.7 万亿"]} />
        <Say at={S(34.2)} out={S(35.3)} size={40} weight={700} color={K.sub} parts={["最多时，相当于地方自己收入的八成多"]} />
      </Box>
      <Box x={120} y={110} gap={6}>
        <Say at={S(35.4)} out={S(37.3)} size={54} parts={[{ t: "开发商", c: K.iceHi }, "：房子还没盖，先卖"]} />
        <Say at={S(36.1)} out={S(37.3)} size={40} weight={700} color={K.sub} parts={["开发商一半的钱，来自买房人提前交的房款"]} />
      </Box>
      <Box x={120} y={110} gap={6}>
        <Say at={S(37.4)} out={S(39.3)} size={54} parts={[{ t: "家庭", c: K.iceHi }, "：借钱买。欠的钱从 GDP 的 18% 涨到 61%"]} />
        <Say at={S(38.1)} out={S(39.3)} size={40} weight={700} color={K.sub} parts={["房子占了城镇家庭资产的近六成"]} />
      </Box>
      <Note at={S(33.5)} out={S(39.3)}>卖地：财政部，2021 年国有土地使用权出让收入 87051 亿元；2020 年出让收入相当于地方一般公共预算本级收入的 84%。开发商：统计局，2021 年到位资金中定金及预收款 + 个人按揭占 52.9%。家庭：BIS 居民债务 / GDP，2008 年末 17.6%，2020 年末 60.6%；人民银行 2019 年城镇家庭调查，住房占总资产 59.1%</Note>
      <Box x={120} y={110} gap={6}>
        <Say at={S(39.4)} out={S(41.6)} size={54} parts={["2008、2015 年，房价一跌，就有政策托住"]} />
        <Say at={S(40.2)} out={S(41.6)} size={46} weight={800} color={K.gold} parts={["大家学会了：房价只会涨"]} />
      </Box>
      <Note at={S(39.4)} out={S(41.6)}>2008 年下调首付和房贷利率；2015–2016 年棚户区改造货币化安置（2015 年货币化比例 28%，住建部）</Note>
      <Box x={960} y={200} align="center" gap={14}>
        <Say at={S(41.7)} out={S(43.95)} size={72} weight={900} parts={["三家，押在同一样东西上：", { t: "房价", c: K.gold }]} />
        <Say at={S(42.6)} out={S(43.95)} size={44} weight={700} color={K.sub} parts={["房价越涨，越多人借钱买；越多人买，房价越涨"]} />
      </Box>

      {/* chapter 3: why it fell */}
      <Box x={960} y={200} align="center" gap={10}>
        <Say at={S(44.05)} out={S(45.5)} size={44} weight={700} color={K.ice} parts={["为什么跌了五年"]} />
        <Say at={S(44.3)} out={S(45.5)} size={80} weight={900} parts={["2020 年，这个圈被卡住了"]} />
      </Box>
      <Box x={120} y={110} gap={6}>
        <Say at={S(45.6)} out={S(47.3)} size={56} parts={["“三道红线”：不准开发商再大举借钱"]} />
      </Box>
      <Box x={120} y={110} gap={6}>
        <Say at={S(47.4)} out={S(49.1)} size={54} parts={["2021 年，恒大还不上钱：欠了 2.58 万亿"]} />
        <Say at={S(48.1)} out={S(49.1)} size={40} weight={700} color={K.sub} parts={["其中近 1 万亿，是卖了还没交的房"]} />
      </Box>
      <Box x={120} y={110} gap={6}>
        <Say at={S(49.2)} out={S(50.9)} size={54} parts={["2022 年，烂尾楼业主停贷"]} />
        <Say at={S(49.8)} out={S(50.9)} size={44} weight={800} color={K.sub} parts={["大家发现：买期房，等于先把钱借给开发商"]} />
      </Box>
      <Note at={S(45.6)} out={S(50.9)}>三道红线：2020 年 8 月人民银行、住建部重点房企座谈会（剔除预收款的资产负债率 &gt; 70%、净负债率 &gt; 100%、现金短债比 &lt; 1）。恒大：2021 年末负债总额 25801.5 亿元，其中合同负债（已售未交付）9743.5 亿元（恒大 2021 年年报）</Note>
      <Box x={120} y={110} gap={6}>
        <Say at={S(51)} out={S(53.4)} size={56} parts={["没人敢买期房，钱就转不起来了"]} />
        <Say at={S(51.7)} out={S(53.4)} size={40} weight={700} color={K.sub} parts={["2021 → 2025 年"]} />
      </Box>
      <Note at={S(51)} out={S(55.9)}>统计局：新建商品房销售额 2021 年 181930 亿元，2025 年 83937 亿元。财政部：土地出让收入 87051 → 41518 亿元。人民银行：个人住房贷款余额 2023 年末 38.17 万亿元，2026 年 9 月末 35.91 万亿元；2025 年住户存款增加 14.64 万亿元</Note>
      <Box x={120} y={110} gap={6}>
        <Say at={S(53.5)} out={S(55.9)} size={56} parts={["家庭在还房贷、存钱：去年存款多了 ", { t: "14.6 万亿", c: K.iceHi }]} />
        <Say at={S(54.3)} out={S(55.9)} size={44} weight={800} color={K.sub} parts={["越跌越等：跌一成等两成，跌两成等三成"]} />
      </Box>
    </AbsoluteFill>
  );
};

export { keys };
