// Chapter 4 (sb 56–68): are there enough homes? Homes vs households, homes nobody lives in, fewer buyers, and the
// split between cities. Chapter 5 (sb 68–88): has it bottomed? History as bars, the four signs and China on them,
// Japan. The end (sb 88–104): the answer; from a piggy bank back to a home; your city; sources.
import React from "react";
import { AbsoluteFill } from "remotion";
import d from "./data2.json";
import { Box, EO, keys, lerp, Note, ramp, Say, Sources, useT, win } from "./kit";
import { FONT, K, NUM } from "./theme";
import { BEAT, S } from "./time";
import { Tower } from "./world";

const BASE = 860;

// ---------------------------------------------------------------- chapter 4
const Pair: React.FC<{ t: number; at: number; out: number; a: { n: string; v: number; u: string; s?: string }; b: { n: string; v: number; u: string; s?: string }; unit: number; dark?: number }> = ({ t, at, out, a, b, unit, dark = 0 }) => {
  const o = win(t, at, out, 0.4, 0.4);
  if (o <= 0) return null;
  const ka = ramp(t, at + 0.1, at + 0.8, EO);
  const kb = ramp(t, at + 0.5, at + 1.2, EO);
  const cols = [
    { ...a, x: 720, k: ka },
    { ...b, x: 1200, k: kb },
  ];
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        {cols.map((c, i) => (
          <Tower key={c.n} x={c.x} base={BASE} w={300} h={c.v * unit * c.k} seed={120 + i} lit={i === 0 && dark > 0 ? 0.62 * (1 - 0.3 * dark) : 0.62} />
        ))}
        {dark > 0 ? <rect x={720 - 150} y={BASE - a.v * unit * ka} width={300} height={a.v * unit * ka * 0.21} fill={K.bg} opacity={0.85 * dark} /> : null}
      </svg>
      {cols.map((c) => (
        <React.Fragment key={c.n}>
          <div style={{ position: "absolute", left: c.x - 200, width: 400, top: BASE + 12, textAlign: "center", fontFamily: FONT }}>
            <div style={{ fontSize: 36, fontWeight: 900, color: K.fg }}>{c.n}</div>
            {c.s ? <div style={{ fontSize: 26, fontWeight: 700, color: K.sub }}>{c.s}</div> : null}
          </div>
          <div style={{ position: "absolute", left: c.x - 200, width: 400, top: BASE - c.v * unit * c.k - 70, textAlign: "center", fontFamily: NUM, fontSize: 52, fontWeight: 900, color: K.winHi, opacity: c.k }}>
            {c.v}
            <span style={{ fontFamily: FONT, fontSize: 36 }}> {c.u}</span>
          </div>
        </React.Fragment>
      ))}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- chapter 5: history
const PLACES = [
  { n: "美国", y: "2006–2012", drop: 27, yrs: "5.5 年" },
  { n: "西班牙", y: "2007–2014", drop: 37, yrs: "6.5 年" },
  { n: "爱尔兰", y: "2007–2013", drop: 54, yrs: "6 年" },
  { n: "中国香港", y: "1997–2003", drop: 66, yrs: "6 年" },
  { n: "日本", y: "1991–2016", drop: 54, yrs: "25 年" },
  { n: "中国", y: "2021–今天", drop: 23, yrs: "5 年，还在跌" },
];
export const BAR_AT = (i: number) => S(68.5) + i * BEAT * 0.9;
const X0 = 420;
const PX = 15;
const History: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, S(68), S(72.1), 0.4, 0.5);
  if (o <= 0) return null;
  const median = win(t, S(70.4), S(72.1), 0.4, 0.4);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      {PLACES.map((p, i) => {
        const k = ramp(t, BAR_AT(i), BAR_AT(i) + 0.5, EO);
        const cn = p.n === "中国";
        return (
          <div key={p.n} style={{ position: "absolute", left: 0, top: 270 + i * 100, height: 80, width: 1920, opacity: ramp(t, BAR_AT(i) - 0.1, BAR_AT(i) + 0.2), fontFamily: FONT }}>
            <div style={{ position: "absolute", right: 1920 - X0 + 24, top: 4, textAlign: "right" }}>
              <div style={{ fontSize: 40, fontWeight: 900, color: cn ? K.gold : K.fg, lineHeight: 1.1 }}>{p.n}</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: K.muted }}>{p.y}</div>
            </div>
            <div style={{ position: "absolute", left: X0, top: 12, height: 56, width: p.drop * PX * k, borderRadius: 6, background: cn ? K.gold : `linear-gradient(90deg, ${K.down}88, ${K.down})` }} />
            <div style={{ position: "absolute", left: X0 + p.drop * PX * k + 22, top: 10, whiteSpace: "nowrap", opacity: ramp(t, BAR_AT(i) + 0.3, BAR_AT(i) + 0.6) }}>
              <span style={{ fontFamily: NUM, fontSize: 48, fontWeight: 900, color: cn ? K.gold : K.fg }}>−{p.drop}%</span>
              <span style={{ fontSize: 32, fontWeight: 800, color: K.sub }}>　跌了 {p.yrs}</span>
            </div>
          </div>
        );
      })}
      {median > 0 ? (
        <>
          <div style={{ position: "absolute", left: X0 + 30 * PX, top: 250, height: 600, borderLeft: `3px dashed ${K.iceHi}`, opacity: median }} />
          <div style={{ position: "absolute", left: X0 + 30 * PX + 14, top: 226, fontFamily: FONT, fontSize: 28, fontWeight: 800, color: K.iceHi, opacity: median, whiteSpace: "nowrap" }}>一般跌三成</div>
        </>
      ) : null}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- chapter 5: the four signs
const STEPS = [
  { n: "① 成交回升", s: "买房的人先回来", h: 230, x: 390 },
  { n: "② 库存下降", s: "卖不掉的房子变少", h: 330, x: 770 },
  { n: "③ 大城市止跌", s: "大城市先不跌了", h: 430, x: 1150 },
  { n: "④ 全国止跌", s: "全国都不跌了", h: 530, x: 1530 },
];
const CN = [0.5, 0, 1, 0];
const CN_AT = [S(75.6), S(77.1), S(74.1), S(78.6)];
const SB = 930;
const Steps: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, S(72.1), S(80.1), 0.5, 0.5);
  if (o <= 0) return null;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        {STEPS.map((s, i) => {
          const rise = ramp(t, S(72.2) + i * 0.15, S(72.2) + i * 0.15 + 0.7, EO);
          return <Tower key={i} x={s.x} base={SB} w={330} h={s.h * rise} seed={40 + i} lit={0.45} tone={K.towerHi} />;
        })}
      </svg>
      {STEPS.map((s, i) => {
        const st = ramp(t, CN_AT[i], CN_AT[i] + 0.35, EO);
        const v = CN[i];
        const col = v === 1 ? K.gold : v === 0.5 ? K.up : K.down;
        return (
          <React.Fragment key={i}>
            <div style={{ position: "absolute", left: s.x - 165, width: 330, top: SB - s.h + 22, textAlign: "center", fontFamily: FONT, textShadow: "0 2px 10px #000" }}>
              <div style={{ fontSize: 38, fontWeight: 900, color: K.fg }}>{s.n}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: K.sub }}>{s.s}</div>
            </div>
            {st > 0 ? (
              <div style={{ position: "absolute", left: s.x - 80, width: 160, top: SB - s.h - 96, display: "flex", flexDirection: "column", alignItems: "center", opacity: st, transform: `scale(${lerp(1.6, 1, st)})` }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: col, boxShadow: `0 0 30px ${col}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontWeight: 900, fontSize: 32, color: K.bg }}>
                  {v === 1 ? "✓" : v === 0.5 ? "½" : "×"}
                </div>
                <div style={{ marginTop: 4, fontFamily: FONT, fontSize: 28, fontWeight: 900, color: col }}>{v === 1 ? "出现了" : v === 0.5 ? "一半" : "还没有"}</div>
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- chapter 5: Japan
const JP = [
  { n: "东京", k: [[1988, 1], [2005, 0.38], [2025, 0.5]] as [number, number][], x: 1180 },
  { n: "日本全国", k: [[1991, 1], [2016, 0.46], [2025, 0.49]] as [number, number][], x: 1560 },
];
const Japan: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, S(80.1), S(88), 0.5, 0.5);
  if (o <= 0) return null;
  const yr = lerp(1988, 2025, ramp(t, S(80.6), S(83.4), (x) => x));
  const H = 480;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        {JP.map((j, i) => (
          <g key={j.n}>
            <rect x={j.x - 110} y={BASE - H} width={220} height={H} fill="none" stroke={K.sub} strokeDasharray="8 7" strokeWidth={2} opacity={0.45} />
            <Tower x={j.x} base={BASE} w={220} h={H * keys(yr, j.k, (x) => x)} seed={70 + i} lit={0.3} />
          </g>
        ))}
      </svg>
      <div style={{ position: "absolute", left: 1180 - 110, top: BASE - H - 130, fontFamily: NUM, fontSize: 96, fontWeight: 900, color: K.fg }}>{Math.round(yr)}</div>
      {JP.map((j) => (
        <div key={j.n} style={{ position: "absolute", left: j.x - 180, width: 360, top: BASE + 12, textAlign: "center", fontFamily: FONT }}>
          <div style={{ fontSize: 38, fontWeight: 900, color: K.fg }}>{j.n}</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: K.sub }}>住宅地价 · 虚线 = 最高时</div>
        </div>
      ))}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- the end: 70 cities again; the windows light up
const Skyline: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, S(88), S(98.9), 0.5, 0.5);
  if (o <= 0) return null;
  const N = d.cities.length;
  const tier1 = ["北京", "上海", "广州", "深圳"];
  const answer = win(t, S(88.6), S(91.6), 0.3, 0.4);
  const home = ramp(t, S(93.4), S(95.2), (x) => x);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        {d.cities.map((c, i) => {
          const lv = c.lv[c.lv.length - 1];
          const t1 = tier1.includes(c.c);
          const lit = 0.3 + 0.55 * clampLit(home * 1.6 - (i % 7) * 0.08);
          return <Tower key={c.c} x={60 + (i * 1800) / (N - 1)} base={930} w={20} h={lv * 250} seed={i + 7} lit={lit} tone={t1 && answer > 0 ? K.towerHi : K.tower} roof={t1 ? answer : 0} o={1 - 0.45 * (t1 ? 0 : answer)} />;
        })}
      </svg>
    </AbsoluteFill>
  );
};
const clampLit = (v: number) => Math.max(0, Math.min(1, v));

export const Ch45: React.FC = () => {
  const t = useT();
  if (t < S(56)) return null;
  return (
    <AbsoluteFill>
      <Pair t={t} at={S(57.5)} out={S(59.6)} a={{ n: "城镇的房子", v: 3.77, u: "亿套" }} b={{ n: "城镇的家庭", v: 3.52, u: "亿户" }} unit={110} />
      <Pair t={t} at={S(59.7)} out={S(61.6)} a={{ n: "城镇的房子", v: 3.77, u: "亿套", s: "2017 年约五分之一没人住" }} b={{ n: "城镇的家庭", v: 3.52, u: "亿户" }} unit={110} dark={ramp(t, S(59.9), S(60.4))} />
      <Pair t={t} at={S(61.7)} out={S(64)} a={{ n: "2016 年出生", v: 1786, u: "万人" }} b={{ n: "2025 年出生", v: 792, u: "万人" }} unit={0.25} />
      <History t={t} />
      <Steps t={t} />
      <Japan t={t} />
      <Skyline t={t} />

      {/* chapter 4 */}
      <Box x={960} y={200} align="center" gap={10}>
        <Say at={S(56.05)} out={S(57.4)} size={44} weight={700} color={K.ice} parts={["房子够不够"]} />
        <Say at={S(56.3)} out={S(57.4)} size={80} weight={900} parts={["中国的房子，到底多不多？"]} />
      </Box>
      <Box x={120} y={110} gap={6}>
        <Say at={S(57.5)} out={S(59.6)} size={56} parts={["房子够住了：", { t: "每户略多于一套", c: K.winHi }]} />
        <Say at={S(58.2)} out={S(59.6)} size={40} weight={700} color={K.sub} parts={["跟成熟国家差不多"]} />
      </Box>
      <Box x={120} y={110} gap={6}>
        <Say at={S(59.7)} out={S(61.6)} size={56} parts={["2017 年，城镇约", { t: "五分之一", c: K.down }, "的房子没人住"]} />
        <Say at={S(60.4)} out={S(61.6)} size={40} weight={700} color={K.sub} parts={["大多是第二套、第三套"]} />
      </Box>
      <Note at={S(57.5)} out={S(61.6)}>城镇住宅约 3.77 亿套、套户比 1.07：任泽平团队《中国住房存量报告 2026》（研究测算，非统计局）；家庭户数按此推算。空置：西南财经大学中国家庭金融调查《2017 中国城镇住房空置分析》，城镇空置率 21.4%，其中 18.0 个百分点来自多套房家庭</Note>
      <Box x={120} y={110} gap={6}>
        <Say at={S(61.7)} out={S(64)} size={56} parts={["买房的人在变少：出生人口少了一半多"]} />
        <Say at={S(62.5)} out={S(64)} size={40} weight={700} color={K.sub} parts={["25–29 岁的人，五年少了约 1700 万"]} />
      </Box>
      <Note at={S(61.7)} out={S(64)}>出生人口：统计局，2016 年 1786 万、2025 年 792 万。25–29 岁：按七普分年龄人口推算，2020 年 25–29 岁约 9185 万，20–24 岁约 7494 万</Note>
      <Box x={120} y={110} gap={6}>
        <Say at={S(64.1)} out={S(66)} size={56} parts={["但人还在往大城市走：深圳去年多了 ", { t: "26 万人", c: K.winHi }]} />
        <Say at={S(64.8)} out={S(66)} size={44} weight={700} color={K.sub} parts={["东北，已经每户 1.3 套"]} />
      </Box>
      <Note at={S(64.1)} out={S(66)}>深圳 2025 年统计公报；东北套户比 1.31：任泽平团队测算</Note>
      <Box x={960} y={330} align="center" gap={14}>
        <Say at={S(66.1)} out={S(67.95)} size={64} weight={900} parts={["不缺房子，缺的是", { t: "人和房子在同一座城市", c: K.winHi }]} />
      </Box>

      {/* chapter 5: history */}
      <Box x={120} y={120}>
        <Say at={S(68.05)} out={S(70.3)} size={56} parts={["到底了吗？先看历史上的房价大跌"]} />
      </Box>
      <Box x={120} y={110} gap={6}>
        <Say at={S(70.4)} out={S(72.05)} size={56} parts={["一般跌 ", { t: "6 年", c: K.iceHi }, "、跌 ", { t: "三成", c: K.iceHi }, "；中国跌了 5 年、两成多"]} />
      </Box>
      <Note at={S(68.05)} out={S(72.05)}>名义价格从最高到最低：美国 Case-Shiller 全国；西班牙、爱尔兰 BIS；香港差饷物业估价署；日本全国住宅地价（国土交通省）；中国为统计局 70 城二手住宅指数连乘。高盛 2025 年 6 月：15 个经济体 21 次实际房价跌超两成，中位数约 6 年、−30%（扣除通胀）</Note>
      {/* chapter 5: the four signs */}
      <Box x={120} y={110} gap={6}>
        <Say at={S(72.15)} out={S(74)} size={56} parts={["历史上，房价跌到头之前，会先出现 ", { t: "4 个信号", c: K.iceHi }]} />
        <Say at={S(72.8)} out={S(74)} size={40} weight={700} color={K.sub} parts={["美国新房销量比房价早一年到底；东京比日本全国早 11 年"]} />
      </Box>
      <Box x={120} y={120}>
        <Say at={S(74.1)} out={S(75.5)} size={50} parts={["③ 一线城市二手房，3 月起月月在涨"]} />
      </Box>
      <Box x={120} y={120}>
        <Say at={S(75.6)} out={S(77)} size={50} parts={["① 二手房多卖了 11%，新房少卖了 13%"]} />
      </Box>
      <Box x={120} y={120}>
        <Say at={S(77.1)} out={S(78.5)} size={50} parts={["② 新房要卖 27 个月，比年中还长"]} />
      </Box>
      <Box x={120} y={120}>
        <Say at={S(78.6)} out={S(80.05)} size={50} parts={["④ 70 座城市里，59 座的二手房还在跌"]} />
      </Box>
      <Note at={S(72.15)} out={S(80.05)}>美国：普查局新房销量 2011 年 2 月见底，Case-Shiller 2012 年 2 月见底。日本：东京都住宅地 2005 年、全国 2016 年最低。中国：统计局 2026 年 1–9 月二手房网签 +10.7%、新房销售面积 −13.2%；9 月 70 城二手住宅 59 城环比下跌；克而瑞 50 城去化周期 26.9 个月</Note>
      {/* chapter 5: Japan */}
      <Box x={120} y={120} gap={8}>
        <Say at={S(80.15)} out={S(84)} size={56} parts={["日本为什么跌了这么久？"]} />
        <Say at={S(80.9)} out={S(84)} size={42} weight={700} color={K.sub} parts={["人在变少，房子太多：空屋占 13.8%"]} />
        <Say at={S(81.9)} out={S(84)} size={42} weight={700} color={K.sub} parts={["银行坏账拖了十年，不敢放贷"]} />
        <Say at={S(82.9)} out={S(84)} size={42} weight={700} color={K.sub} parts={["东京 2005 年到底，全国到 2016 年"]} />
      </Box>
      <Box x={120} y={120} gap={8}>
        <Say at={S(84.1)} out={S(87.95)} size={56} parts={["到今天，还比最高时", { t: "低一半", c: K.down }]} />
        <Say at={S(85.2)} out={S(87.95)} size={42} weight={700} color={K.sub} parts={["中国不一样的地方：城镇每年还在多出上千万人"]} />
        <Say at={S(86.3)} out={S(87.95)} size={42} weight={700} color={K.sub} parts={["一样的地方：房子太多的城市，拆不掉，只能慢慢消化"]} />
      </Box>
      <Note at={S(80.15)} out={S(87.95)}>日本：总务省 2023 年住宅·土地统计调查，空屋率 13.8%；主要银行不良债权比率 2001 年度 8.4%（内阁府）；国土交通省公示地价，只取最高、最低和 2025 年，中间为示意。中国 2025 年城镇常住人口增加 1030 万（统计局）。Rogoff & Yang（NBER，2026）</Note>

      {/* the end */}
      <Box x={960} y={150} align="center" gap={16}>
        <Say at={S(88.1)} out={S(91.55)} size={50} weight={700} color={K.sub} parts={["所以，房价到底了吗？"]} />
        <Say at={S(88.6)} out={S(91.55)} size={66} weight={900} parts={["北上广深：", { t: "止跌的信号出现了", c: K.gold }]} />
        <Say at={S(89.3)} out={S(91.55)} size={66} weight={900} parts={["全国：4 个信号，", { t: "只到了一个半", c: K.down }]} />
        <Say at={S(90.1)} out={S(91.55)} size={40} weight={700} color={K.sub} parts={["机构预测：全国大概还要两三年（仅供参考）"]} />
      </Box>
      <Note at={S(88.6)} out={S(91.55)}>机构预测：标普全国新房 2028 年三季度见底，高盛全国新房 2029 年不再下跌（2026 年 10 月，据转述）。本片不构成购房建议</Note>
      <Box x={960} y={220} align="center" gap={22}>
        <Say at={S(91.65)} out={S(95.9)} size={64} weight={800} parts={["过去二十年，房子是一家人", { t: "最大的存钱罐", c: K.iceHi }]} />
        <Say at={S(93.3)} out={S(95.9)} size={84} weight={900} parts={["现在，它在慢慢", { t: "变回一个家", mark: true }, "。"]} />
      </Box>
      <Box x={960} y={260} align="center" gap={18}>
        <Say at={S(96)} out={S(98.9)} size={56} weight={700} color={K.sub} parts={["一套房，值几年房租？"]} />
        <Say at={S(96.6)} out={S(98.9)} size={80} weight={900} parts={["你的城市，", { t: "是多少年", mark: true }, "？"]} />
      </Box>
      <Sources at={S(99)} out={S(101.4)} />
    </AbsoluteFill>
  );
};
