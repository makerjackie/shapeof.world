// Chapter 1 (sb 9.3–32): is it dear? One floor = one year of rent. A ¥1m home renting at ¥2000 a month is built floor by
// floor (42 years); owning costs ≈ 2.6 % of the price a year in interest = 38 years of rent, THE LINE; 50
// cities; the world; the floors above the line are 期待; 2023 → today.
import React from "react";
import { AbsoluteFill } from "remotion";
import d from "./data2.json";
import { Box, EO, keys, lerp, Note, ramp, Say, useT, win } from "./kit";
import { FONT, K, NUM } from "./theme";
import { S } from "./time";
import { FloorTower } from "./world";

const BASE = 930;
const LINE = 38;
const Y = d.years as { c: string; yrs: number }[];
const N = Y.length;
const skyX = (i: number) => 78 + i * 36;
const NAMED = ["长春", "哈尔滨", "长沙", "上海", "北京", "深圳", "厦门"];

// The world, as towers (years of rent = 1 ÷ gross yield). Global Property Guide for the cities abroad; 中指 for China.
const WORLD = [
  { n: "伦敦", y: 15.4 },
  { n: "美国全国", y: 14.9 },
  { n: "香港", y: 28.9 },
  { n: "东京", y: 30.6 },
  { n: "新加坡", y: 32.7 },
  { n: "全国 50 城", y: 43.5, cn: true },
  { n: "上海", y: 54.1, cn: true },
  { n: "北京、深圳", y: 62.5, cn: true },
];

const Lbl: React.FC<{ x: number; y: number; o: number; color?: string; size?: number; children: React.ReactNode }> = ({ x, y, o, color = K.fg, size = 28, children }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%, -100%)", opacity: o, fontFamily: FONT, fontWeight: 800, fontSize: size, color, whiteSpace: "nowrap", textAlign: "center", lineHeight: 1.15, textShadow: "0 2px 10px rgba(0,0,0,0.95)" }}>
      {children}
    </div>
  );

export const Ch1: React.FC = () => {
  const t = useT();
  if (t < S(9.2) || t > S(32.2)) return null;

  // the single home: 0–41.7 floors, then the national tower (43.5) for the end of the chapter
  const homeO = Math.max(win(t, S(10.6), S(20.3), 0.4, 0.4), win(t, S(27.4), S(32), 0.4, 0.4));
  const fhHome = 11;
  const build = ramp(t, S(10.9), S(12.7), (x) => x);
  const homeF = t < S(25) ? 41.7 * build : keys(t, [[S(29.5), 43.5], [S(29.9), 50.5], [S(30.6), 50.5], [S(31.4), 43.5]], EO);
  const lineF = t < S(25) ? LINE : keys(t, [[S(29.5), LINE], [S(29.9), 25.6], [S(30.6), 25.6], [S(31.4), LINE]], EO);
  const lineO = Math.max(win(t, S(16.7), S(20.3), 0.4, 0.3), win(t, S(27.5), S(32), 0.4, 0.4));
  const glass = win(t, S(27.9), S(32), 0.4, 0.4);
  const homeLineY = BASE - lineF * fhHome;

  // the 50 cities
  const skyO = win(t, S(20.2), S(24.5), 0.4, 0.4);
  const fhSky = 8;
  const rise = (i: number) => ramp(t, S(20.3) + i * 0.02, S(20.3) + i * 0.02 + 0.6, EO);

  // the world
  const worldO = win(t, S(24.4), S(27.5), 0.4, 0.4);
  const fhW = 10;
  const wx = (i: number) => 220 + i * 210;

  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        {/* the home */}
        {homeO > 0 ? (
          <g opacity={homeO}>
            <FloorTower x={960} base={BASE} w={240} floors={homeF} fh={fhHome} seed={99} line={lineF} glass={glass} lit={0.7} />
            {lineO > 0 ? (
              <g opacity={lineO}>
                <rect x={60} y={homeLineY - 8} width={1800} height={16} fill={K.ice} opacity={0.13} />
                <rect x={60} y={homeLineY - 1.75} width={1800} height={3.5} fill={K.iceHi} />
              </g>
            ) : null}
          </g>
        ) : null}
        {/* the 50 cities */}
        {skyO > 0 ? (
          <g opacity={skyO}>
            {Y.map((c, i) => (
              <FloorTower key={c.c} x={skyX(i)} base={BASE} w={28} floors={c.yrs * rise(i)} fh={fhSky} seed={i + 3} line={LINE} glass={ramp(t, S(22.4), S(22.9))} roof={c.yrs <= LINE + 0.01 ? ramp(t, S(23.2), S(23.6)) * 0.8 : 0} lit={0.62} />
            ))}
            <rect x={40} y={BASE - LINE * fhSky - 1.75} width={1840} height={3.5} fill={K.iceHi} />
          </g>
        ) : null}
        {/* the world */}
        {worldO > 0 ? (
          <g opacity={worldO}>
            {WORLD.map((w, i) => {
              const k = ramp(t, S(24.6) + i * 0.12, S(24.6) + i * 0.12 + 0.6, EO);
              return <FloorTower key={w.n} x={wx(i)} base={BASE} w={140} floors={w.y * k} fh={fhW} seed={60 + i} lit={0.6} tone={w.cn ? K.towerHi : K.tower} roof={w.cn ? 0.5 : 0} />;
            })}
          </g>
        ) : null}
      </svg>

      {/* labels: home */}
      {(() => {
        const o = win(t, S(10.9), S(18.2), 0.2, 0.4);
        if (o <= 0) return null;
        return (
          <div style={{ position: "absolute", left: 1100, top: BASE - homeF * fhHome - 10, transform: "translateY(-50%)", opacity: o, fontFamily: FONT, fontWeight: 900, fontSize: 60, color: K.winHi, whiteSpace: "nowrap", textShadow: "0 2px 10px #000" }}>
            <span style={{ fontFamily: NUM }}>{Math.min(42, Math.ceil(homeF))}</span> 年房租
          </div>
        );
      })()}
      <Lbl x={230} y={homeLineY - 12} o={lineO * (t < S(25) ? 1 : t > S(29.5) && t < S(31.4) ? 0 : 1)} color={K.iceHi} size={30}>
        38 年：买和租一样划算
      </Lbl>
      <Lbl x={1250} y={BASE - homeF * fhHome + ((homeF - lineF) * fhHome) / 2 + 20} o={glass * (homeF > lineF + 1 ? 1 : 0)} color={K.hopeHi} size={36}>
        高出 {Math.round(homeF - lineF - 0.02)} 层
      </Lbl>
      {(() => {
        const o = win(t, S(29.6), S(32), 0.3, 0.3);
        if (o <= 0) return null;
        return (
          <div style={{ position: "absolute", left: 960 - 200, width: 400, top: BASE + 14, textAlign: "center", fontFamily: FONT, opacity: o }}>
            <div style={{ fontSize: 40, fontWeight: 900, color: K.fg }}>全国平均</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: K.sub }}>{t < S(30.6) ? "2023 年初" : t < S(31.4) ? "…" : "2026 年 9 月"}</div>
          </div>
        );
      })()}
      {/* labels: 50 cities */}
      <AbsoluteFill style={{ opacity: skyO }}>
        {Y.map((c, i) => (
          <React.Fragment key={c.c}>
            <div style={{ position: "absolute", left: skyX(i) - 12, top: BASE + 10, width: 24, writingMode: "vertical-rl", fontFamily: FONT, fontSize: 19, fontWeight: 700, color: NAMED.includes(c.c) ? K.fg : K.sub, lineHeight: 1 }}>
              {c.c}
            </div>
            <Lbl x={skyX(i)} y={BASE - c.yrs * fhSky - 8 - (["长春", "长沙", "北京", "厦门"].includes(c.c) ? 34 : 0)} o={NAMED.includes(c.c) ? ramp(t, S(21.2), S(21.6)) : 0} color={c.yrs <= LINE ? K.gold : K.hopeHi} size={24}>
              <span style={{ fontFamily: NUM }}>{Math.floor(c.yrs)}</span>
            </Lbl>
          </React.Fragment>
        ))}
      </AbsoluteFill>
      {/* labels: world */}
      <AbsoluteFill style={{ opacity: worldO }}>
        {WORLD.map((w, i) => (
          <React.Fragment key={w.n}>
            <div style={{ position: "absolute", left: wx(i) - 110, width: 220, top: BASE + 12, textAlign: "center", fontFamily: FONT, fontSize: 32, fontWeight: 900, color: w.cn ? K.gold : K.fg }}>{w.n}</div>
            <Lbl x={wx(i)} y={BASE - w.y * fhW - 10} o={ramp(t, S(24.6) + i * 0.12 + 0.4, S(24.6) + i * 0.12 + 0.8)} color={w.cn ? K.gold : K.fg} size={36}>
              <span style={{ fontFamily: NUM }}>{Math.floor(w.y)}</span> 年
            </Lbl>
          </React.Fragment>
        ))}
      </AbsoluteFill>

      {/* words */}
      <Box x={960} y={150} align="center" gap={10}>
        <Say at={S(9.4)} out={S(10.8)} size={44} weight={700} color={K.ice} parts={["第一把尺子"]} />
        <Say at={S(9.7)} out={S(10.8)} size={84} weight={900} parts={["一套房，等于几年房租？"]} />
      </Box>
      <Box x={120} y={120} gap={8}>
        <Say at={S(10.9)} out={S(13.4)} size={72} parts={["每月租 2000，要租 ", { t: "42 年", c: K.winHi }, "，才攒够房价"]} />
        <Say at={S(11.6)} out={S(13.4)} size={40} weight={700} color={K.sub} parts={["以一套 100 万的房子为例"]} />
      </Box>
      <Box x={120} y={120} gap={8}>
        <Say at={S(13.5)} out={S(16.6)} size={64} parts={["不买就得租；买了，每年也要付", { t: "利息", c: K.iceHi }]} />
        <Say at={S(14.4)} out={S(16.6)} size={40} weight={700} color={K.sub} parts={["房贷利息，加上首付本来能拿的存款利息：约房价的 2.6%"]} />
      </Box>
      <Box x={120} y={120} gap={8}>
        <Say at={S(16.7)} out={S(20.2)} size={76} parts={[{ t: "38 年", c: K.iceHi }, "以内，买比租划算"]} />
        <Say at={S(17.6)} out={S(20.2)} size={40} weight={700} color={K.sub} parts={["每年 2.6% 的利息，正好约等于 38 年房租"]} />
      </Box>
      <Note at={S(13.5)} out={S(20.2)}>首付三成按大额存单 1.55% 算少拿的利息，贷款七成按 2026 年 9 月新发房贷平均约 3.1%（人民银行）。本金不算，那是存进房子的钱。中指研究院估算购房资金成本 2.4%–2.7%（37–42 年）</Note>
      <Box x={120} y={110} gap={6}>
        <Say at={S(20.4)} out={S(24.3)} size={56} parts={["50 座城市：全国平均 ", { t: "43 年", c: K.winHi }]} />
        <Say at={S(21.2)} out={S(24.3)} size={44} weight={700} color={K.sub} parts={["北京、深圳 62 年，厦门 83 年；长春、哈尔滨 29 年"]} />
      </Box>
      <Note at={S(20.4)} out={S(24.3)}>几年房租 = 1 ÷ 租金回报率（年租金 ÷ 二手房均价）。中指研究院 2026 年 9 月，50 城 2.30%；各城按其图表读取，约数</Note>
      <Box x={120} y={110} gap={6}>
        <Say at={S(24.5)} out={S(27.4)} size={56} parts={["放到世界上：东京、香港、新加坡，", { t: "约 30 年", c: K.fg }]} />
        <Say at={S(25.5)} out={S(27.4)} size={56} parts={["北上广深，", { t: "要 60 年左右", c: K.gold }]} />
      </Box>
      <Note at={S(24.5)} out={S(27.4)}>国外：Global Property Guide 毛租金回报率（挂牌口径，2026）；中国：中指研究院。房租和房价算的是同一套房，公摊不影响年数。英美利率更高（美国 30 年房贷约 7.2%），所以年数也更短</Note>
      <Box x={120} y={120} gap={8}>
        <Say at={S(27.6)} out={S(29.4)} size={60} parts={["比 38 年高出来的那几层，买的是", { t: "对明天的期待", c: K.hopeHi }]} />
      </Box>
      <Box x={120} y={120} gap={8}>
        <Say at={S(29.5)} out={S(32)} size={52} weight={700} color={K.sub} parts={["2023 年初，全国高出 25 层"]} />
        <Say at={S(30.7)} out={S(32)} size={60} parts={["今天，只高出 ", { t: "约 5 层", c: K.hopeHi }, "：房价跌了，利息也降了"]} />
      </Box>
      <Note at={S(29.5)} out={S(32)}>2023 年初：房贷 4.26%（人民银行，2022 年 12 月新发放）、大额存单约 3.1%，资金成本约 3.9% = 26 年；租金回报率 1.98% = 50.5 年（中指研究院）</Note>
    </AbsoluteFill>
  );
};
