// sb 11–69. History: five famous busts as towers sinking, and the 21-bust median. The order a bottom comes in, as four
// stepped towers. Where China is on each step (quiet interlude). Silence; the buyers who have not come back (mortgage
// balances shrinking; interest dearer than rent). The climax: the loop of waiting. The answer. Japan: a bottom is not a
// way back up. Your city.
import React from "react";
import { AbsoluteFill } from "remotion";
import d from "./data2.json";
import { Box, EO, keys, lerp, Note, ramp, Say, Sources, useT, win } from "./kit";
import { FONT, K, NUM } from "./theme";
import { BEAT, S } from "./time";
import { Tower } from "./world";

const BASE = 930;
const LOW = 850; // history and Japan stand higher so their labels clear the source line

// ---------------------------------------------------------------- history
const PLACES = [
  { n: "美国", y: "2006–2012", drop: 27, yrs: "5.5 年", x: 300 },
  { n: "西班牙", y: "2007–2014", drop: 37, yrs: "6.5 年", x: 620 },
  { n: "爱尔兰", y: "2007–2013", drop: 54, yrs: "6 年", x: 940 },
  { n: "中国香港", y: "1997–2003", drop: 66, yrs: "5.8 年", x: 1260 },
  { n: "中国", y: "2021–今天", drop: 23, yrs: "5 年，还在跌", x: 1610 },
];
const H0 = 440;
export const SINK = (i: number) => S(12.3) + i * BEAT * 1.4;

const History: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, S(11.3), S(20.1), 0.5, 0.5);
  if (o <= 0) return null;
  const median = win(t, S(16.7), S(20.1), 0.4, 0.4);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        {PLACES.map((p, i) => {
          const k = ramp(t, SINK(i), SINK(i) + 1.1, EO);
          const china = p.n === "中国";
          const h = H0 * (1 - (p.drop / 100) * k) - (china && t > SINK(i) + 1.1 ? 6 * Math.abs(Math.sin((t - SINK(i)) * 2.4)) : 0);
          const hl = china ? win(t, S(18.4), S(20.1), 0.3, 0.3) : 0;
          return (
            <g key={p.n}>
              <rect x={p.x - 95} y={LOW - H0} width={190} height={H0} fill="none" stroke={K.sub} strokeDasharray="8 7" strokeWidth={2} opacity={0.45} />
              <Tower x={p.x} base={LOW} w={190} h={h} seed={i * 5 + 2} lit={0.3} tone={china ? K.towerHi : K.tower} roof={hl} />
            </g>
          );
        })}
        {median > 0 ? <line x1={150} x2={1770} y1={LOW - H0 * 0.7} y2={LOW - H0 * 0.7} stroke={K.ice} strokeWidth={3} strokeDasharray="14 9" opacity={median} /> : null}
      </svg>
      {PLACES.map((p, i) => {
        const k = ramp(t, SINK(i), SINK(i) + 1.1, EO);
        const lo = ramp(t, SINK(i) + 0.6, SINK(i) + 1.0);
        return (
          <React.Fragment key={p.n}>
            <div style={{ position: "absolute", left: p.x - 160, width: 320, top: LOW + 14, textAlign: "center", fontFamily: FONT }}>
              <div style={{ fontSize: 40, fontWeight: 900, color: p.n === "中国" ? K.gold : K.fg }}>{p.n}</div>
              <div style={{ fontSize: 24, fontWeight: 600, color: K.muted }}>{p.y}</div>
            </div>
            <div style={{ position: "absolute", left: p.x - 160, width: 320, top: LOW - H0 * (1 - (p.drop / 100) * k) - 104, textAlign: "center", fontFamily: FONT, opacity: lo }}>
              <div style={{ fontFamily: NUM, fontSize: 52, fontWeight: 900, color: K.down }}>−{p.drop}%</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: K.sub }}>跌了 {p.yrs}</div>
            </div>
          </React.Fragment>
        );
      })}
      {median > 0 ? (
        <div style={{ position: "absolute", left: 160, top: LOW - H0 * 0.7 - 46, fontFamily: FONT, fontSize: 30, fontWeight: 800, color: K.iceHi, opacity: median }}>
          跌三成
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- the order, and where China is
const STEPS = [
  { n: "①", t: "买房的人先回来", h: 230, x: 390 },
  { n: "②", t: "卖不掉的房子变少", h: 330, x: 770 },
  { n: "③", t: "大城市先止跌", h: 430, x: 1150 },
  { n: "④", t: "全国才止跌", h: 530, x: 1530 },
];
// China's status per step: 1 = there, 0.5 = halfway, 0 = not yet
const CN = [0.5, 0, 1, 0];
const STEP_AT = [S(21.7), S(24.1), S(26.5), S(28.9)];
const CN_AT = [S(35.1), S(36.8), S(33.4), S(38.4)];

const Steps: React.FC<{ t: number }> = ({ t }) => {
  const o = Math.max(win(t, S(20.1), S(41.4), 0.5, 0.5), win(t, S(63), S(66.7), 0.5, 0.4));
  if (o <= 0) return null;
  const dim = 1 - 0.5 * win(t, S(40), S(41.4), 0.2, 0.3);
  return (
    <AbsoluteFill style={{ opacity: o * dim }}>
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        {STEPS.map((s, i) => {
          const rise = t > S(60) ? 1 : ramp(t, S(20.2) + i * 0.15, S(20.2) + i * 0.15 + 0.7, EO);
          const lit = t > S(60) ? 0.6 : ramp(t, STEP_AT[i], STEP_AT[i] + 0.4);
          return <Tower key={i} x={s.x} base={BASE} w={330} h={s.h * rise} seed={40 + i} lit={0.12 + 0.5 * lit} tone={lit > 0.5 ? K.towerHi : K.tower} />;
        })}
      </svg>
      {STEPS.map((s, i) => {
        const lit = t > S(60) ? 1 : ramp(t, STEP_AT[i], STEP_AT[i] + 0.4);
        const st = t > S(60) ? 1 : ramp(t, CN_AT[i], CN_AT[i] + 0.35, EO);
        const v = CN[i];
        const col = v === 1 ? K.gold : v === 0.5 ? K.up : K.down;
        const word = v === 1 ? "到了" : v === 0.5 ? "一半" : "还没";
        return (
          <React.Fragment key={i}>
            <div style={{ position: "absolute", left: s.x - 165, width: 330, top: BASE - s.h + 18, textAlign: "center", fontFamily: FONT, opacity: 0.35 + 0.65 * lit }}>
              <div style={{ fontSize: 40, fontWeight: 900, color: K.fg, textShadow: "0 2px 10px #000" }}>{s.n}</div>
              <div style={{ fontSize: 34, fontWeight: 900, color: K.fg, textShadow: "0 2px 10px #000" }}>{s.t}</div>
            </div>
            {st > 0 ? (
              <div style={{ position: "absolute", left: s.x - 70, width: 140, top: BASE - s.h - 92, display: "flex", flexDirection: "column", alignItems: "center", opacity: st, transform: `scale(${lerp(1.6, 1, st)})` }}>
                <div style={{ width: 54, height: 54, borderRadius: "50%", background: col, boxShadow: `0 0 30px ${col}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontWeight: 900, fontSize: 32, color: K.bg }}>
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

// ---------------------------------------------------------------- borrowing, and rent vs interest
const Ledger: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, S(43.2), S(48.9), 0.4, 0.4);
  if (o <= 0) return null;
  const loanK = ramp(t, S(43.6), S(45), EO);
  const loan = lerp(37.01, 35.91, loanK);
  const bars = ramp(t, S(45.9), S(46.8), EO);
  const unit = 150; // px per 万
  const row = (y: number, label: string, v: number, col: string, at: number) => {
    const k = ramp(t, at, at + 0.7, EO);
    return (
      <div style={{ position: "absolute", left: 120, top: y, display: "flex", alignItems: "center", gap: 24, fontFamily: FONT, opacity: bars }}>
        <div style={{ width: 360, fontSize: 40, fontWeight: 800, color: K.fg, textAlign: "right" }}>{label}</div>
        <div style={{ width: v * unit * k, height: 70, borderRadius: 8, background: col, boxShadow: `0 0 30px ${col}66` }} />
        <div style={{ fontFamily: NUM, fontSize: 52, fontWeight: 900, color: col, opacity: k }}>约 {v} 万</div>
      </div>
    );
  };
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <div style={{ position: "absolute", left: 120, top: 300, fontFamily: FONT, opacity: 1 - bars }}>
        <div style={{ fontSize: 40, fontWeight: 800, color: K.sub }}>个人住房贷款余额</div>
        <div style={{ fontFamily: NUM, fontSize: 150, fontWeight: 900, color: K.fg, letterSpacing: -3 }}>
          {loan.toFixed(2)}<span style={{ fontSize: 70 }}> 万亿</span>
        </div>
        <div style={{ fontSize: 48, fontWeight: 900, color: K.down, opacity: loanK }}>今年前三季度，少了 1.1 万亿</div>
      </div>
      {row(560, "一年要付的利息", 2.6, K.ice, S(46.2))}
      {row(680, "一年的房租", 2.3, K.win, S(46.8))}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- the 70 cities again, under the loop
const Skyline: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, S(48.9), S(56.2), 0.5, 0.5);
  if (o <= 0) return null;
  const N = d.cities.length;
  const tier1 = ["北京", "上海", "广州", "深圳"];
  const answer = ramp(t, S(52.6), S(53.2));
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
// Residential land prices (公示地价, 国土交通省), only the key years: Tokyo-to peak 1988, bottom 2005 (−62%), 2025 −50%;
// all Japan peak 1991, bottom 2016 (−54%), 2025 −51%.
const JP = [
  { n: "东京", k: [[1988, 1], [2005, 0.38], [2025, 0.5]] as [number, number][], x: 760, note: "2005 年跌到头" },
  { n: "日本全国", k: [[1991, 1], [2016, 0.46], [2025, 0.49]] as [number, number][], x: 1240, note: "2016 年才跌到头" },
];
const Japan: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, S(56.2), S(63.1), 0.5, 0.5);
  if (o <= 0) return null;
  const yr = lerp(1988, 2025, ramp(t, S(57.2), S(60.4), (x) => x));
  const H = 520;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        {JP.map((j, i) => {
          const v = keys(yr, j.k, (x) => x);
          return (
            <g key={j.n}>
              <rect x={j.x - 120} y={LOW - H} width={240} height={H} fill="none" stroke={K.sub} strokeDasharray="8 7" strokeWidth={2} opacity={0.45} />
              <Tower x={j.x} base={LOW} w={240} h={H * v} seed={70 + i} lit={0.3} />
            </g>
          );
        })}
      </svg>
      <div style={{ position: "absolute", right: 120, top: 330, fontFamily: NUM, fontSize: 120, fontWeight: 900, color: K.fg }}>{Math.round(yr)}</div>
      {JP.map((j) => (
        <div key={j.n} style={{ position: "absolute", left: j.x - 200, width: 400, top: LOW + 14, textAlign: "center", fontFamily: FONT }}>
          <div style={{ fontSize: 40, fontWeight: 900, color: K.fg }}>{j.n}</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: K.sub }}>住宅地价</div>
        </div>
      ))}
      <div style={{ position: "absolute", left: 1240 + 140, top: LOW - H + 6, fontFamily: FONT, fontSize: 26, fontWeight: 700, color: K.muted }}>虚线 = 泡沫时的最高价</div>
    </AbsoluteFill>
  );
};

export const Story: React.FC = () => {
  const t = useT();
  if (t < S(11)) return null;
  return (
    <AbsoluteFill>
      <History t={t} />
      <Steps t={t} />
      <Ledger t={t} />
      <Skyline t={t} />
      <Japan t={t} />

      {/* history */}
      <Box x={120} y={120}>
        <Say at={S(11.4)} out={S(16.35)} size={60} parts={["几次有名的房价大跌，都跌了多久、跌了多少？"]} />
      </Box>
      <Box x={120} y={110} gap={8}>
        <Say at={S(16.4)} out={S(18.35)} size={48} weight={700} color={K.sub} parts={["高盛统计了 15 个经济体的 21 次房价大跌："]} />
        <Say at={S(16.85)} out={S(18.35)} size={60} parts={["一般跌 ", { t: "6 年", c: K.iceHi }, " 左右，跌 ", { t: "三成", c: K.iceHi }, " 左右"]} />
      </Box>
      <Box x={120} y={120}>
        <Say at={S(18.45)} out={S(20.1)} size={64} parts={[{ t: "中国", c: K.gold }, "：已经跌了 5 年、两成多，", { t: "还没停", c: K.down }]} />
      </Box>
      <Note at={S(11.4)} out={S(20.1)}>名义房价，从最高到最低：美国 Case-Shiller 全国指数；西班牙、爱尔兰 BIS 住宅价格指数；香港差饷物业估价署；中国为统计局 70 城二手住宅指数连乘（BIS 口径约 −23%）。高盛 2025 年 6 月报告：21 次实际房价跌超两成的下行，中位数约 6 年、−30%（扣除通胀）</Note>

      {/* the order */}
      <Box x={960} y={130} align="center">
        <Say at={S(20.2)} out={S(21.6)} size={76} weight={900} parts={["跌到头，是有", { t: "顺序", c: K.iceHi }, "的"]} />
      </Box>
      <Box x={120} y={120} gap={8}>
        <Say at={S(21.7)} out={S(24)} size={60} parts={["① 买房的人先回来"]} />
        <Say at={S(22.2)} out={S(24)} size={40} weight={700} color={K.sub} parts={["美国：新房销量，比房价早一年跌到头"]} />
      </Box>
      <Box x={120} y={120} gap={8}>
        <Say at={S(24.1)} out={S(26.4)} size={60} parts={["② 卖不掉的房子变少"]} />
        <Say at={S(24.4)} out={S(26.4)} size={40} weight={700} color={K.sub} parts={["美国：待售新房降到只够卖 5 个月，房价才到底"]} />
      </Box>
      <Box x={120} y={120} gap={8}>
        <Say at={S(26.5)} out={S(28.8)} size={60} parts={["③ 大城市先止跌"]} />
        <Say at={S(26.85)} out={S(28.8)} size={40} weight={700} color={K.sub} parts={["日本：东京比全国早 11 年跌到头"]} />
      </Box>
      <Box x={120} y={120} gap={8}>
        <Say at={S(28.9)} out={S(31.95)} size={60} parts={["④ 最后，全国才止跌"]} />
      </Box>
      <Note at={S(21.7)} out={S(31.95)}>美国：普查局新房销量 2011 年 2 月见底，Case-Shiller 全国房价 2012 年 2 月见底；新房待售月数从 2009 年 1 月 12.2 个月降到 2012 年 2 月 4.8 个月。日本：国土交通省公示地价，东京都住宅地 2005 年、全国 2016 年为最低</Note>

      {/* China on the steps */}
      <Box x={960} y={130} align="center">
        <Say at={S(32.05)} out={S(33.3)} size={76} weight={900} parts={[{ t: "中国", c: K.gold }, "，走到了第几步？"]} />
      </Box>
      <Box x={120} y={120} gap={6}>
        <Say at={S(33.4)} out={S(35)} size={50} parts={["③ 一线城市二手房，3 月起月月在涨"]} />
      </Box>
      <Box x={120} y={120} gap={6}>
        <Say at={S(35.1)} out={S(36.7)} size={50} parts={["① 二手房多卖 11%，新房少卖 13%"]} />
      </Box>
      <Box x={120} y={120} gap={6}>
        <Say at={S(36.8)} out={S(38.3)} size={50} parts={["② 新房要卖 27 个月才卖得完"]} />
      </Box>
      <Box x={120} y={120} gap={6}>
        <Say at={S(38.4)} out={S(40)} size={50} parts={["④ 70 城里，59 城的二手房还在跌"]} />
      </Box>
      <Note at={S(33.4)} out={S(40)}>统计局 2026 年 1–9 月：二手房网签面积 +10.7%（住建部），新建商品房销售面积 −13.2%；9 月 70 城二手住宅价格 59 城环比下跌，一线城市 3–9 月环比上涨。都柏林房价也比爱尔兰全国早约一年见底（CSO）。克而瑞：50 城商品住宅去化周期 26.9 个月（9 月末）</Note>

      {/* silence, and the buyers who have not come back */}
      <Box x={960} y={300} align="center" gap={18}>
        <Say at={S(40.02)} out={S(43.1)} size={56} weight={700} color={K.sub} stagger={0.8} parts={["还有一样东西，没回来："]} />
        <Say at={S(41.02)} out={S(43.1)} size={96} weight={900} parts={["敢", { t: "借钱", c: K.ice }, "买房的人"]} />
      </Box>
      <Box x={120} y={120}>
        <Say at={S(43.3)} out={S(45.8)} size={60} parts={["大家在", { t: "还钱", c: K.down }, "，不在借钱"]} />
      </Box>
      <Note at={S(43.3)} out={S(45.8)}>中国人民银行《2026 年三季度金融机构贷款投向统计报告》：9 月末个人住房贷款余额 35.91 万亿元，前三季度减少 1.10 万亿元</Note>
      <Box x={120} y={120} gap={8}>
        <Say at={S(45.9)} out={S(48.85)} size={56} parts={["为什么？同一套 100 万的房子："]} />
        <Say at={S(47.4)} out={S(48.85)} size={56} parts={["利息比房租还贵，", { t: "不如先租", c: K.winHi }]} />
      </Box>
      <Note at={S(45.9)} out={S(48.85)}>利息：首付三成按大额存单 1.55% 算少拿的利息，贷款七成按 9 月新发房贷平均约 3.1%（人民银行），合计约房价的 2.6%。房租：中指研究院 50 城平均租金回报率 2.30%（一线 1.70%）</Note>

      {/* the climax: the loop */}
      <Box x={960} y={200} align="center" gap={24}>
        <Say at={S(49.05)} out={S(52.5)} size={84} weight={900} parts={["买房的人，在等", { t: "房价再跌", c: K.down }, "；"]} />
        <Say at={S(50.3)} out={S(52.5)} size={84} weight={900} parts={["房价，在等", { t: "买房的人回来", mark: true }, "。"]} />
      </Box>
      <Note at={S(49.05)} out={S(52.5)}>标普 2026 年 2 月：“房价下跌侵蚀购房者信心，这是一个没有简单出口的恶性循环。”</Note>

      {/* the answer */}
      <Box x={960} y={170} align="center" gap={20}>
        <Say at={S(52.6)} out={S(56.1)} size={52} weight={700} color={K.sub} parts={["所以，房价到底了吗？"]} />
        <Say at={S(53.1)} out={S(56.1)} size={72} weight={900} parts={["北上广深：", { t: "可能已经到头了", c: K.gold }]} />
        <Say at={S(54.1)} out={S(56.1)} size={72} weight={900} parts={["全国：", { t: "还没有", c: K.down }, "，大概还要两三年"]} />
      </Box>
      <Note at={S(53.1)} out={S(56.1)}>“两三年”是按历史中位数（约 6 年）和机构预测：标普 2028 年三季度、高盛全国新房 2029 年（均为 2026 年 10 月）。不构成购房建议</Note>

      {/* Japan */}
      <Box x={120} y={120} gap={8}>
        <Say at={S(56.3)} out={S(63)} size={60} parts={["但跌到头，", { t: "不等于会涨回去", c: K.ice }]} />
        <Say at={S(58)} out={S(63)} size={44} weight={700} color={K.sub} parts={["日本：东京 2005 年跌到头，全国又跌了 11 年"]} />
        <Say at={S(60.5)} out={S(63)} size={44} weight={700} color={K.sub} parts={["到今天，还比最高时低一半"]} />
      </Box>
      <Note at={S(56.3)} out={S(63)}>国土交通省公示地价（住宅地），年变动率连乘，只取最高、最低和 2025 年，中间为示意：东京都 1988 年最高、2005 年最低（约 −62%），2025 年仍低约 50%；全国 1991 年最高、2016 年最低（约 −54%），2025 年仍低约 51%</Note>

      {/* your city */}
      <Box x={960} y={150} align="center" gap={18}>
        <Say at={S(63.1)} out={S(66.5)} size={64} weight={800} parts={["底，是一座城市、一座城市来的。"]} />
        <Say at={S(64.2)} out={S(66.5)} size={84} weight={900} parts={["你的城市，", { t: "走到第几步了", mark: true }, "？"]} />
      </Box>
      <Sources at={S(66.6)} out={S(68.2)} />
    </AbsoluteFill>
  );
};
