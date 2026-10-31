// sb 59–92: why the two rulers disagree. Harbin's and Shenzhen's prices since 2010; then the same ¥1m home in each as a
// tower, filled with what a year's rent can carry at the line (Harbin: all of it; Shenzhen: about six tenths, the rest
// a glowing shell). The climax (sb 72): a price holds today's rent and tomorrow's hopes. Then back to the card: the
// bottom is only seen looking back; the cursor hovers between 租 and 买.
import React from "react";
import { AbsoluteFill } from "remotion";
import data from "./data.json";
import { Box, EO, keys, lerp, Note, ramp, Say, Sources, useT, win } from "./kit";
import { LINE } from "./skyline";
import { FONT, K, NUM } from "./theme";
import { BEAT as BEAT_, S } from "./time";
import { ListingCard, Tower } from "./world";

const M = data.months;
const SER = data.series as Record<string, number[]>;

const Chart: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, S(59.1), S(65.2), 0.5, 0.5);
  if (o <= 0) return null;
  const x0 = 220;
  const x1 = 1640;
  const yv = (v: number) => 900 - ((v - 0.5) / 2.5) * 560;
  const xm = (i: number) => x0 + ((x1 - x0) * i) / (M.length - 1);
  const draw = ramp(t, S(59.6), S(61.6), (x) => x);
  const n = Math.max(1, Math.floor(draw * (M.length - 1)));
  const path = (v: number[]) => v.slice(0, n + 1).map((y, i) => `${i ? "L" : "M"} ${xm(i).toFixed(1)} ${yv(y).toFixed(1)}`).join(" ");
  const years = [2011, 2014, 2017, 2020, 2023, 2026];
  const end = (c: string) => ({ x: xm(n), y: yv(SER[c][n]) });
  const hb = win(t, S(61.4), S(65.2), 0.3, 0.3);
  const sz = win(t, S(63), S(65.2), 0.3, 0.3);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        <line x1={x0} x2={x1} y1={yv(1)} y2={yv(1)} stroke={K.sub} strokeWidth={2} strokeDasharray="8 8" opacity={0.6} />
        {years.map((y) => {
          const i = M.indexOf(`${y}-01`);
          return <line key={y} x1={xm(i)} x2={xm(i)} y1={900} y2={910} stroke={K.muted} strokeWidth={2} />;
        })}
        <line x1={x0} x2={x1} y1={900} y2={900} stroke={K.dim} strokeWidth={2} />
        <path d={path(SER["哈尔滨"])} fill="none" stroke={K.win} strokeWidth={6} strokeLinejoin="round" opacity={hb > 0 || t < S(61.4) ? 1 : 0.6} />
        <path d={path(SER["深圳"])} fill="none" stroke={K.hopeHi} strokeWidth={6} strokeLinejoin="round" />
        <circle cx={end("哈尔滨").x} cy={end("哈尔滨").y} r={9} fill={K.win} />
        <circle cx={end("深圳").x} cy={end("深圳").y} r={9} fill={K.hopeHi} />
      </svg>
      {years.map((y) => {
        const i = M.indexOf(`${y}-01`);
        return (
          <div key={y} style={{ position: "absolute", left: xm(i) - 40, width: 80, textAlign: "center", top: 918, fontFamily: NUM, fontSize: 24, fontWeight: 700, color: K.muted }}>
            {y}
          </div>
        );
      })}
      <div style={{ position: "absolute", left: x0, top: yv(1) + 8, fontFamily: FONT, fontSize: 24, fontWeight: 700, color: K.sub }}>2010 年底的房价</div>
      <div style={{ position: "absolute", left: end("深圳").x + 22, top: end("深圳").y - 22, fontFamily: FONT, fontSize: 36, fontWeight: 800, color: K.hopeHi, whiteSpace: "nowrap" }}>深圳</div>
      <div style={{ position: "absolute", left: end("哈尔滨").x + 22, top: end("哈尔滨").y - 4, fontFamily: FONT, fontSize: 36, fontWeight: 800, color: K.win, whiteSpace: "nowrap" }}>哈尔滨</div>
      {hb > 0 ? (
        <div style={{ position: "absolute", left: end("哈尔滨").x + 22, top: end("哈尔滨").y + 44, fontFamily: NUM, fontSize: 34, fontWeight: 800, color: K.win, opacity: hb }}>
          0.93 倍
        </div>
      ) : null}
      {sz > 0 ? (
        <div style={{ position: "absolute", left: end("深圳").x + 22, top: end("深圳").y + 22, fontFamily: NUM, fontSize: 34, fontWeight: 800, color: K.hopeHi, opacity: sz }}>
          2.2 倍
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// The same ¥1m home in Harbin and Shenzhen. carried = a year's rent ÷ the line (how much of the price the rent pays for).
const TWO = [
  { c: "哈尔滨", x: 560, y: 3.4 },
  { c: "深圳", x: 1240, y: 1.6 },
];
const Twins: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, S(65.3), S(81.2), 0.5, 0.5);
  if (o <= 0) return null;
  const base = 870;
  const H = 500;
  const rise = ramp(t, S(65.6), S(66.4), EO);
  // a slow push-in through the whole passage, so the two towers are never a still picture
  const z = lerp(0.96, 1.1, ramp(t, S(65.3), S(81.2), (x) => x));
  return (
    <AbsoluteFill style={{ opacity: o, transform: `scale(${z})`, transformOrigin: "900px 870px" }}>
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        {TWO.map((b, i) => {
          const carried = Math.min(1, b.y / LINE);
          const fill = ramp(t, i ? S(68.4) : S(67.2), (i ? S(68.4) : S(67.2)) + 0.9, EO) * carried;
          const shell = win(t, S(69.8), S(81.2), 0.4, 0.4) * (1 - carried) * (t > S(72) ? 0.8 + 0.2 * Math.sin((t - S(72)) * Math.PI * 2 / (2 * BEAT_)) : 1);
          return (
            <g key={b.c}>
              <rect x={b.x - 150} y={base - H * rise} width={300} height={H * rise} fill="none" stroke={K.sub} strokeWidth={2} strokeDasharray="10 8" opacity={0.6} />
              <Tower x={b.x} base={base} w={300} h={H * fill} seed={i * 11 + 5} lit={0.82} />
              {shell > 0 ? (
                <g opacity={shell}>
                  <rect x={b.x - 150} y={base - H} width={300} height={H * (1 - carried)} fill={K.hope} opacity={0.16} />
                  <rect x={b.x - 150} y={base - H} width={300} height={H * (1 - carried)} fill="none" stroke={K.hopeHi} strokeWidth={3} />
                </g>
              ) : null}
            </g>
          );
        })}
      </svg>
      {TWO.map((b, i) => (
        <React.Fragment key={b.c}>
          <div style={{ position: "absolute", left: b.x - 200, width: 400, textAlign: "center", top: base + 20, fontFamily: FONT, fontSize: 44, fontWeight: 900, color: K.fg, opacity: rise }}>
            {b.c}
          </div>
          <div style={{ position: "absolute", left: b.x - 200, width: 400, textAlign: "center", top: base + 80, fontFamily: FONT, fontSize: 26, fontWeight: 600, color: K.muted, opacity: rise }}>
            一套 100 万的房子
          </div>
        </React.Fragment>
      ))}
      {/* side labels */}
      <SideLabel x={560 + 170} y={870 - 250} o={win(t, S(67.6), S(72), 0.3, 0.3)} color={K.winHi} text="房租撑得起整套房价" />
      <SideLabel x={1240 + 170} y={870 - 150} o={win(t, S(68.9), S(72), 0.3, 0.3)} color={K.winHi} text="房租只撑得起约六成" />
      <SideLabel x={1240 + 170} y={870 - 420} o={win(t, S(70), S(72), 0.3, 0.3)} color={K.hopeHi} text="剩下的约四成呢？" />
      <SideLabel x={1240 + 170} y={870 - 150} o={win(t, S(73.6), S(81.2), 0.3, 0.3)} color={K.winHi} text="今天的房租" big />
      <SideLabel x={1240 + 170} y={870 - 420} o={win(t, S(74.2), S(81.2), 0.3, 0.3)} color={K.hopeHi} text="明天的期待" big />
      <SideLabel x={560 + 170} y={870 - 250} o={win(t, S(73.6), S(81.2), 0.3, 0.3)} color={K.winHi} text="今天的房租" big />
    </AbsoluteFill>
  );
};
const SideLabel: React.FC<{ x: number; y: number; o: number; color: string; text: string; big?: boolean }> = ({ x, y, o, color, text, big }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", left: x, top: y, transform: `translateY(-50%) translateX(${(1 - Math.min(1, o * 1.5)) * -12}px)`, opacity: o, display: "flex", alignItems: "center", gap: 12, fontFamily: FONT, fontSize: big ? 40 : 32, fontWeight: 800, color, whiteSpace: "nowrap", textShadow: "0 2px 10px #000" }}>
      <span style={{ width: 26, height: 3, background: color }} />
      {text}
    </div>
  );

export const Insight: React.FC = () => {
  const t = useT();
  if (t < S(59)) return null;
  const cardO = win(t, S(85.5), S(89.7), 0.5, 0.4);
  const buttons = ramp(t, S(87.3), S(87.9), EO);
  const hoverX = keys(t, [[S(87.9), 0], [S(88.5), -60], [S(89), 60], [S(89.6), 0]]);
  return (
    <AbsoluteFill>
      <Chart t={t} />
      <Box x={120} y={120} gap={10}>
        <Say at={S(59.3)} out={S(61.2)} size={60} parts={["为什么？看两座城市，2010 年以来的房价"]} />
      </Box>
      <Box x={120} y={120} gap={10}>
        <Say at={S(61.3)} out={S(65.1)} size={56} parts={[{ t: "哈尔滨", c: K.win }, "：涨过三成多，又跌回了 2010 年以下"]} />
        <Say at={S(62.6)} out={S(65.1)} size={56} parts={[{ t: "深圳", c: K.hopeHi }, "：还是 2010 年的 2.2 倍，去年人口又多了 ", { t: "26 万", c: K.hopeHi }]} />
      </Box>
      <Note at={S(59.3)} out={S(65.1)}>统计局 70 城二手住宅价格指数，以 2010 年 12 月为 1 连乘；深圳 2025 年末常住人口比上年多 25.9 万（深圳统计公报）</Note>
      <Twins t={t} />
      <Box x={120} y={120} gap={8}>
        <Say at={S(65.5)} out={S(71.9)} size={54} parts={["同样 100 万的房子，按那条线，一年的房租撑得起多少房价？"]} />
      </Box>
      <Note at={S(67)} out={S(71.9)}>撑得起的房价 = 一年房租 ÷ 2.6%。哈尔滨约 3.4% ÷ 2.6% ＞ 1；深圳约 1.6% ÷ 2.6% ≈ 0.6，即约四成要靠别的来撑（按 2.4%–2.7% 算，约三到四成）</Note>
      <Box x={120} y={120} gap={8}>
        <Say at={S(72)} out={S(76)} size={64} weight={800} parts={["房价里，装着两样东西"]} />
        <Say at={S(73.2)} out={S(76)} size={80} weight={900} parts={[{ t: "今天的房租", c: K.winHi }, "，和", { t: "明天的期待", mark: true }]} />
      </Box>
      <Box x={120} y={120} gap={10}>
        <Say at={S(76.1)} out={S(78.4)} size={56} parts={["期待多的城市，人们肯", { t: "为明天多付钱", c: K.hopeHi }]} />
        <Say at={S(76.9)} out={S(78.4)} size={56} parts={["期待少的城市，房价只剩下", { t: "房租", c: K.winHi }]} />
      </Box>
      <Box x={120} y={120} gap={10}>
        <Say at={S(78.5)} out={S(81)} size={50} weight={700} color={K.sub} parts={["所以这把尺子，量的是今天："]} />
        <Say at={S(78.9)} out={S(81)} size={58} parts={["过了线，", { t: "买不比租亏", c: K.winHi }, "；没过线，", { t: "你在为明天付钱", c: K.hopeHi }]} />
      </Box>
      <Converge t={t} />
      <Box x={120} y={120} gap={10}>
        <Say at={S(81.2)} out={S(85.4)} size={46} weight={700} color={K.sub} parts={["放到全国看，房租和那条线"]} />
        <Say at={S(81.6)} out={S(85.4)} size={60} parts={["2023 年初，每 100 万还差近 ", { t: "2 万", c: K.ice }]} />
        <Say at={S(82.9)} out={S(85.4)} size={60} parts={["今天，只差约 ", { t: "0.3 万", c: K.iceHi, num: true }]} />
      </Box>
      <Box x={960} y={470} align="center">
        <Say at={S(84)} out={S(85.4)} size={84} weight={900} parts={["这几年跌掉的，更多是", { t: "期待", c: K.hopeHi }]} />
      </Box>
      <Note at={S(81.2)} out={S(85.4)}>只取两个时点。2023 年初：房贷 4.26%（人民银行，2022 年 12 月新发放）、大额存单约 3.1%（每日经济新闻），租金回报率 1.98%；2026 年 9 月：2.6% 对 2.30%（中指研究院）。中指：重点城市租金跌幅比房价缓和得多</Note>
      {cardO > 0 ? <ListingCard x={1290} y={lerp(600, 560, ramp(t, S(85.5), S(86.4), EO))} s={1.15} price={308} t={t} o={cardO} buttons={buttons} hover={Math.abs(hoverX) < 20 ? 1 : 0} note="这个价，回到了 2016 年" /> : null}
      {buttons > 0 && cardO > 0 ? <Cursor x={1290 + hoverX * 1.2} y={560 + 1.15 * 150 + 10} o={cardO * buttons} /> : null}
      <Box x={120} y={300} gap={18}>
        <Say at={S(85.7)} out={S(89.6)} size={56} weight={700} color={K.sub} parts={["底在哪，没人能提前看到。"]} />
        <Say at={S(86.3)} out={S(89.6)} size={56} weight={700} color={K.sub} parts={["但你可以算清："]} />
        <Say at={S(86.9)} out={S(89.6)} size={64} weight={900} parts={["你买下的房子里，"]} />
        <Say at={S(87.3)} out={S(89.6)} size={64} weight={900} parts={["几成是", { t: "房租", c: K.winHi }, "，几成是", { t: "期待", mark: true }, "。"]} />
      </Box>
      <Sources at={S(89.7)} out={S(91.2)} />
    </AbsoluteFill>
  );
};

const Cursor: React.FC<{ x: number; y: number; o: number }> = ({ x, y, o }) => (
  <svg width={40} height={52} viewBox="0 0 20 26" style={{ position: "absolute", left: x, top: y, opacity: o, filter: undefined }}>
    <path d="M 1 1 L 1 20 L 6 15.5 L 9.5 23.5 L 12.5 22 L 9 14.5 L 15.5 14.5 Z" fill="#fff" stroke="#111" strokeWidth={1.4} strokeLinejoin="round" />
  </svg>
);

// National: what owning costs a year against what renting it out earns, at two moments (straight lines, endpoints only).
const Converge: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, S(81.2), S(85.4), 0.4, 0.4);
  if (o <= 0) return null;
  const x0 = 420;
  const x1 = 1500;
  const yv = (v: number) => 840 - ((v - 1.5) / 2.7) * 480;
  const k = ramp(t, S(81.5), S(82.8), EO);
  const xe = lerp(x0, x1, k);
  const buy = [3.91, LINE];
  const rent = [1.98, 2.3];
  const at = (v: number[]) => lerp(v[0], v[1], k);
  const gap0 = win(t, S(81.7), S(85.4), 0.3, 0.3);
  const gap1 = win(t, S(82.9), S(85.4), 0.3, 0.3);
  return (
    <AbsoluteFill style={{ opacity: o * (1 - 0.7 * ramp(t, S(83.9), S(84.3))) }}>
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        <line x1={x0} x2={xe} y1={yv(buy[0])} y2={yv(at(buy))} stroke={K.iceHi} strokeWidth={6} strokeLinecap="round" />
        <line x1={x0} x2={xe} y1={yv(rent[0])} y2={yv(at(rent))} stroke={K.win} strokeWidth={6} strokeLinecap="round" />
        <circle cx={x0} cy={yv(buy[0])} r={10} fill={K.iceHi} />
        <circle cx={x0} cy={yv(rent[0])} r={10} fill={K.win} />
        <circle cx={xe} cy={yv(at(buy))} r={10} fill={K.iceHi} />
        <circle cx={xe} cy={yv(at(rent))} r={10} fill={K.win} />
        {gap0 > 0 ? <line x1={x0 - 40} x2={x0 - 40} y1={yv(buy[0])} y2={yv(rent[0])} stroke={K.sub} strokeWidth={3} opacity={gap0} /> : null}
        {gap1 > 0 ? <line x1={x1 + 40} x2={x1 + 40} y1={yv(buy[1])} y2={yv(rent[1])} stroke={K.sub} strokeWidth={3} opacity={gap1} /> : null}
      </svg>
      <div style={{ position: "absolute", left: x0 - 100, width: 200, textAlign: "center", whiteSpace: "nowrap", top: 870, fontFamily: FONT, fontSize: 30, fontWeight: 800, color: K.sub }}>2023 年初</div>
      <div style={{ position: "absolute", left: x1 - 90, width: 180, textAlign: "center", top: 870, fontFamily: FONT, fontSize: 30, fontWeight: 800, color: K.sub, opacity: k }}>2026 年 9 月</div>
      <div style={{ position: "absolute", left: x0 + 30, top: yv(buy[0]) - 62, fontFamily: FONT, fontSize: 32, fontWeight: 800, color: K.iceHi }}>
        买下 100 万的房子，一年的代价 <span style={{ fontFamily: NUM }}>3.9 万</span>
      </div>
      <div style={{ position: "absolute", left: x0 + 30, top: yv(rent[0]) + 18, fontFamily: FONT, fontSize: 32, fontWeight: 800, color: K.win }}>
        一年的房租 <span style={{ fontFamily: NUM }}>2.0 万</span>
      </div>
      {gap1 > 0 ? (
        <div style={{ position: "absolute", left: x1 + 60, top: yv(2.47) - 24, opacity: gap1, fontFamily: NUM, fontSize: 34, fontWeight: 800, color: K.fg, whiteSpace: "nowrap" }}>
          <span style={{ color: K.iceHi }}>2.6 万</span> / <span style={{ color: K.win }}>2.3 万</span>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
