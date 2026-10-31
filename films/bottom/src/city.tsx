// sb 10–61, one world. One floor = one year of rent. A home is built floor by floor (the 50-city average: 43.5 years);
// owning it costs ≈ 2.6 % a year = 38 years of rent, THE LINE; floors above it are a glowing shell (期待). Then 50
// cities as towers; the verdict; silence; the far cities rose first; Shenzhen and Harbin; the climax; the whole
// country, 2023 → today; the answer; your city.
import React from "react";
import { AbsoluteFill } from "remotion";
import d from "./data2.json";
import { Box, EO, keys, lerp, Note, ramp, Say, Sources, useT, win } from "./kit";
import { FONT, K, NUM } from "./theme";
import { BEAT, S } from "./time";
import { FloorTower } from "./world";

const BASE = 930;
const LINE = 38;
const NAT = 43.5;
const Y = d.years as { c: string; yrs: number; mom: number | null }[];
const N = Y.length;
const UNDER = Y.filter((y) => y.yrs <= LINE + 0.01).map((y) => y.c); // 14 cities
const TIER1 = ["北京", "上海", "广州", "深圳"];
const FAR = ["厦门", "北京", "深圳", "广州", "上海"];
const LEFT3 = ["长春", "哈尔滨", "长沙"];
const skyX = (i: number) => 78 + i * 36;
const TWIN: Record<string, number> = { 哈尔滨: 640, 深圳: 1270 };

const fhAt = (t: number) => keys(t, [[S(19.52), 14], [S(20.67), 8], [S(35.5), 8], [S(36.5), 10], [S(44.8), 10], [S(45.6), 12], [S(54.8), 12], [S(55.6), 8]]);
const lineAt = (t: number) => keys(t, [[S(45.7), LINE], [S(46.2), 25.6], [S(47.2), 25.6], [S(48.4), LINE]], EO);
const natFloors = (t: number) => keys(t, [[S(45.7), NAT], [S(46.2), 50.5], [S(47.2), 50.5], [S(48.4), NAT]], EO);
const camAt = (t: number) => {
  const zl = keys(t, [[S(21.92), 1], [S(22.42), 1.7], [S(23.68), 1.7], [S(24.07), 1]]);
  const zr = keys(t, [[S(23.92), 1], [S(24.35), 1.2], [S(25.42), 1.2], [S(25.76), 1]]);
  return zl > 1.0001 ? { z: zl, ax: 60 } : { z: zr, ax: 1860 };
};

const Tag: React.FC<{ x: number; y: number; o: number; color?: string; size?: number; children: React.ReactNode }> = ({ x, y, o, color = K.fg, size = 28, children }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%, -100%)", opacity: o, fontFamily: FONT, fontWeight: 800, fontSize: size, color, whiteSpace: "nowrap", textAlign: "center", lineHeight: 1.15, textShadow: "0 2px 10px rgba(0,0,0,0.95)" }}>
      {children}
    </div>
  );

export const City: React.FC = () => {
  const t = useT();
  if (t < S(10)) return null;
  const fh = fhAt(t);
  const lineF = lineAt(t);
  const lineY = BASE - lineF * fh;
  const cam = camAt(t);
  const X = (x: number) => cam.ax + (x - cam.ax) * cam.z;
  const Yc = (y: number) => BASE + (y - BASE) * cam.z;

  // the single home (sb 10–18) that comes back as the country (sb 45–55)
  const build = ramp(t, S(10.7), S(12.5), (x) => x);
  const homeO = Math.max(win(t, S(10.1), S(20.49), 0.3, 0.6), win(t, S(45.2), S(55.2), 0.5, 0.5));
  const homeF = t < S(30) ? NAT * build : natFloors(t);
  const homeW = t < S(30) ? lerp(200, 28, ramp(t, S(19.52), S(20.49))) : 240;
  const homeGlass = Math.max(win(t, S(18.2), S(20.4), 0.4, 0.4), win(t, S(45.8), S(55.2), 0.4, 0.4));
  const lineO = Math.max(ramp(t, S(14.5), S(15.53), EO), 0) * (t > S(58.6) ? 1 - ramp(t, S(58.6), S(59)) : 1);
  const lineW = ramp(t, S(14.5), S(15.53), EO);

  // the skyline
  const skyIn = (i: number) => (t < S(40) ? ramp(t, S(19.9) + i * 0.025, S(19.9) + i * 0.025 + 0.6, EO) : ramp(t, S(55.2) + i * 0.02, S(55.2) + i * 0.02 + 0.5, EO));
  const skyO = t < S(45) ? 1 - ramp(t, S(35.5), S(36.3)) : win(t, S(55.1), S(61), 0.3, 0.3);
  const twinK = ramp(t, S(35.5), S(36.5), EO);
  const twinO = t < S(35.5) ? 0 : 1 - ramp(t, S(44.8), S(45.4));
  const dim = Math.max(0.68 * win(t, S(27), S(31.5), 0.4, 0.4), 0.55 * win(t, S(49.9), S(55.1), 0.4, 0.4), 0.45 * win(t, S(48.4), S(50), 0.3, 0.3));
  const roofOn = win(t, S(22.1), S(32), 0.3, 0.4);
  const glassOn = Math.max(win(t, S(24.0), S(36), 0.4, 0.4), win(t, S(55.6), S(61), 0.4, 0.3));
  const pulse = t > S(41) && t < S(45) ? 0.75 + 0.25 * Math.sin(((t - S(41)) * Math.PI * 2) / (2 * BEAT)) : 1;

  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        <g transform={`translate(${cam.ax} ${BASE}) scale(${cam.z}) translate(${-cam.ax} ${-BASE})`} opacity={1 - dim}>
          {/* skyline */}
          {Y.map((c, i) => {
            const tw = c.c in TWIN && t >= S(35.5) && t < S(45.5);
            const k = tw ? 1 : skyIn(i);
            const x = tw ? lerp(skyX(i), TWIN[c.c], twinK) : skyX(i);
            const w = tw ? lerp(28, 230, twinK) : 28;
            const o = tw ? twinO : skyO;
            const under = c.yrs <= LINE + 0.01;
            const roof = under ? roofOn * (t < S(23.92) ? 1 : 0.5) : 0;
            const g = tw && c.c === "深圳" ? Math.max(glassOn, twinO) * pulse : glassOn;
            return <FloorTower key={c.c} x={x} base={BASE} w={w} floors={c.yrs * k} fh={fh} seed={i + 3} line={lineF} glass={g} roof={roof} o={o} lit={tw && c.c === "哈尔滨" && t > S(41) ? 0.45 : 0.62} />;
          })}
          {/* the home / the country */}
          <FloorTower x={960} base={BASE} w={homeW} floors={homeF} fh={fh} seed={99} line={lineF} glass={homeGlass} o={homeO} lit={0.7} />
          {/* the line */}
          {lineO > 0 ? (
            <g opacity={lineO}>
              <rect x={960 - 940 * lineW} y={lineY - 8} width={1880 * lineW} height={16} fill={K.ice} opacity={0.13} />
              <rect x={960 - 940 * lineW} y={lineY - 1.75} width={1880 * lineW} height={3.5} fill={K.iceHi} />
            </g>
          ) : null}
          {/* the national average, on the skyline */}
          {(() => {
            const o = win(t, S(25.7), S(27), 0.3, 0.3);
            return o > 0 ? <line x1={40} x2={1880} y1={BASE - NAT * fh} y2={BASE - NAT * fh} stroke={K.hopeHi} strokeWidth={2.5} strokeDasharray="12 8" opacity={o} /> : null;
          })()}
        </g>
      </svg>

      {/* line label */}
      <Tag x={230} y={lineY - 10} o={lineO * (1 - dim) * (1 - ramp(t, S(55.4), S(55.8))) * (t < S(45) || t > S(48.4) ? 1 : 0) * (t > S(35.5) && t < S(45) ? 1 : 1)} color={K.iceHi} size={30}>
        38 年房租 · 买和租一样划算
      </Tag>
      {/* the counter beside the home */}
      {(() => {
        const o = win(t, S(10.7), S(19.52), 0.2, 0.4);
        if (o <= 0) return null;
        const top = BASE - homeF * fh;
        return (
          <div style={{ position: "absolute", left: 1080, top: top - 8, transform: "translateY(-50%)", opacity: o, fontFamily: FONT, fontWeight: 900, fontSize: 64, color: K.winHi, whiteSpace: "nowrap", textShadow: "0 2px 10px #000" }}>
            <span style={{ fontFamily: NUM }}>{Math.min(43, Math.floor(homeF))}</span> 年房租
          </div>
        );
      })()}
      {/* skyline labels */}
      {Y.map((c, i) => {
        const top = Yc(BASE - c.yrs * fh);
        const left3 = LEFT3.includes(c.c) ? win(t, S(22.34), S(23.76), 0.25, 0.3) : 0;
        const far = FAR.includes(c.c) ? win(t, S(24.28), S(25.49), 0.25, 0.3) : 0;
        const down = UNDER.includes(c.c) ? win(t, S(31.6), S(33.1), 0.2, 0.3) : 0;
        const up = TIER1.includes(c.c) ? win(t, S(33.05), S(35.4), 0.2, 0.3) : 0;
        const stagger = (FAR.indexOf(c.c) % 2) * 58;
        return (
          <React.Fragment key={c.c}>
            <Tag x={X(skyX(i))} y={top - 12 - (LEFT3.indexOf(c.c) % 2) * 60} o={left3} color={K.gold} size={30}>
              {c.c}
              <br />
              <span style={{ fontFamily: NUM }}>{Math.floor(c.yrs)}</span> 年
            </Tag>
            <Tag x={X(skyX(i))} y={top - 12 - stagger} o={far} color={K.hopeHi} size={30}>
              {c.c}
              <br />
              <span style={{ fontFamily: NUM }}>{Math.floor(c.yrs)}</span> 年
            </Tag>
            <Tag x={X(skyX(i))} y={top - 10} o={down} color={(c.mom ?? 100) < 100 ? K.down : K.sub} size={34}>
              {(c.mom ?? 100) < 100 ? "↓" : "–"}
            </Tag>
            <Tag x={X(skyX(i))} y={top - 6} o={win(t, S(56) + i * 0.02, S(58.7), 0.3, 0.3)} color={c.yrs <= LINE + 0.01 ? K.gold : K.hopeHi} size={17}>
              <span style={{ fontFamily: NUM }}>{Math.floor(c.yrs)}</span>
            </Tag>
            <Tag x={X(skyX(i))} y={top - 12 - (i % 2) * 40} o={up} color={K.up} size={30}>
              ↑ {c.c}
            </Tag>
          </React.Fragment>
        );
      })}
      {/* city names under the skyline */}
      <AbsoluteFill style={{ opacity: Math.max(win(t, S(20.49), S(35.6), 0.4, 0.4), win(t, S(55.4), S(61), 0.4, 0.3)) * (1 - dim) }}>
        {Y.map((c, i) => (
          <div key={c.c} style={{ position: "absolute", left: X(skyX(i)) - 12, top: Yc(BASE) + 10, width: 24, writingMode: "vertical-rl", fontFamily: FONT, fontSize: 20 * Math.min(cam.z, 1.3), fontWeight: 700, color: UNDER.includes(c.c) && roofOn > 0.5 ? K.gold : K.sub, lineHeight: 1 }}>
            {c.c}
          </div>
        ))}
      </AbsoluteFill>
      {/* twin labels */}
      {(() => {
        const o = twinO * ramp(t, S(36.3), S(36.8));
        if (o <= 0) return null;
        return (
          <>
            {Object.entries(TWIN).map(([c, x]) => {
              const yrs = Y.find((v) => v.c === c)!.yrs;
              return (
                <div key={c} style={{ position: "absolute", left: x - 200, width: 400, top: BASE - yrs * fh - 110, textAlign: "center", fontFamily: FONT, opacity: o }}>
                  <div style={{ fontSize: 46, fontWeight: 900, color: K.fg }}>{c}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: K.sub }}>
                    一套房 = <span style={{ fontFamily: NUM }}>{Math.floor(yrs)}</span> 年房租
                  </div>
                </div>
              );
            })}
            <Tag x={1270 + 175} y={BASE - 50 * fh + 24} o={o * win(t, S(41), S(45), 0.3, 0.3)} color={K.hopeHi} size={44}>
              期待
            </Tag>
          </>
        );
      })()}
      {/* the country, 2023 → today */}
      {(() => {
        const o = win(t, S(45.6), S(50), 0.3, 0.3);
        if (o <= 0) return null;
        const yr = t < S(47.2) ? "2023 年初" : t < S(48.4) ? "…" : "2026 年 9 月";
        const gap = natFloors(t) - lineF;
        return (
          <>
            <div style={{ position: "absolute", right: 1920 - 820, top: BASE - 160, textAlign: "right", fontFamily: FONT, opacity: o }}>
              <div style={{ fontSize: 44, fontWeight: 900, color: K.fg }}>全国平均</div>
              <div style={{ fontSize: 30, fontWeight: 700, color: K.sub }}>{yr}</div>
            </div>
            <div style={{ position: "absolute", left: 960 + 140, top: BASE - (lineF + gap / 2) * fh, transform: "translateY(-50%)", opacity: o, fontFamily: FONT, fontSize: 40, fontWeight: 900, color: K.hopeHi, whiteSpace: "nowrap" }}>
              高出 <span style={{ fontFamily: NUM }}>{Math.round(gap - 0.02)}</span> 层
            </div>
          </>
        );
      })()}

      {/* ---------------- words ---------------- */}
      <Box x={120} y={120}>
        <Say at={S(10.15)} out={S(12.6)} size={84} weight={900} parts={["一套房，值几年", { t: "房租", c: K.winHi }, "？"]} />
      </Box>
      <Box x={120} y={120} gap={8}>
        <Say at={S(12.55)} out={S(14.1)} size={64} parts={["全国平均：约 ", { t: "43 年房租", c: K.winHi }]} />
      </Box>
      <Note at={S(10.2)} out={S(14.1)}>一层 = 一年房租。几年房租 = 二手住宅均价 ÷ 一年租金 = 1 ÷ 租金回报率；50 城平均租金回报率 2.30%（中指研究院，2026 年 9 月）</Note>
      <Box x={120} y={120} gap={10}>
        <Say at={S(14.15)} out={S(16.35)} size={50} weight={700} color={K.sub} parts={["买下它，每年要付的利息"]} />
        <Say at={S(14.6)} out={S(16.35)} size={64} parts={["≈ 房价的 2.6%，等于 ", { t: "38 年房租", c: K.iceHi }]} />
      </Box>
      <Note at={S(14.15)} out={S(19.77)}>首付三成，存款按大额存单 1.55%，房贷按 2026 年 9 月新发放平均约 3.1%（人民银行）。本金不算：那是存进房子里的钱。中指估算资金成本 2.4%–2.7%，即 37–42 年</Note>
      <Box x={120} y={120} gap={10}>
        <Say at={S(16.45)} out={S(18.35)} size={58} parts={["低于这条线：", { t: "买，比租划算", c: K.winHi }]} />
        <Say at={S(16.9)} out={S(18.35)} size={58} parts={["高出这条线：", { t: "租，更划算", c: K.iceHi }]} />
      </Box>
      <Box x={120} y={120}>
        <Say at={S(18.45)} out={S(20.25)} size={60} parts={["高出来的这几层，买的是", { t: "对明天的期待", c: K.hopeHi }]} />
      </Box>
      <Box x={120} y={120} gap={8}>
        <Say at={S(20.4)} out={S(22.0)} size={66} parts={["50 座城市，同一把尺子。", { t: "找找你的城市", c: K.winHi }]} />
      </Box>
      <Note at={S(20.4)} out={S(26.92)}>各城租金回报率按中指研究院《2026 三季度中国住房租赁市场总结》图表读取，约数</Note>
      <Box x={760} y={150} gap={8}>
        <Say at={S(22.14)} out={S(23.84)} size={60} parts={["已经到线：", { t: "14 座城市", c: K.gold }]} />
        <Say at={S(22.5)} out={S(23.84)} size={40} weight={700} color={K.sub} parts={["不到 38 年房租，就能买下一套"]} />
      </Box>
      <Box x={120} y={120} gap={8}>
        <Say at={S(24.0)} out={S(25.56)} size={60} parts={["离线最远：", { t: "厦门 83 年，北京、深圳 62 年", c: K.hopeHi }]} />
      </Box>
      <Box x={120} y={120} gap={8}>
        <Say at={S(25.7)} out={S(26.95)} size={60} parts={["全国平均 43 年，高出线 ", { t: "约 5 层", c: K.hopeHi }]} />
      </Box>
      <Box x={960} y={250} align="center" gap={22}>
        <Say at={S(27.1)} out={S(31.45)} size={50} weight={700} color={K.sub} parts={["所以，到底了吗？按房租算："]} />
        <Say at={S(27.6)} out={S(31.45)} size={100} weight={900} parts={["全国：", { t: "还差最后一成", mark: true }]} />
        <Say at={S(28.8)} out={S(31.45)} size={52} parts={["长春、哈尔滨、长沙等 14 城：", { t: "已经到了", c: K.gold }]} />
        <Say at={S(29.6)} out={S(31.45)} size={52} parts={["北上广深：", { t: "还差三到四成", c: K.hopeHi }]} />
      </Box>
      <Note at={S(27.6)} out={S(31.45)}>“差多少” = 房价要跌多少才到线：全国 43.5 → 38 年约 13%，按 2.4%–2.7% 算约 4%–15%；一线平均约 59 年，约 29%–37%。是算术，不是预测</Note>
      <Box x={960} y={180} align="center">
        <Say at={S(31.55)} out={S(33.05)} size={64} weight={800} parts={["但是，已经到线的 14 城，", { t: "12 座还在跌", c: K.down }]} />
      </Box>
      <Box x={960} y={150} align="center" gap={12}>
        <Say at={S(33.08)} out={S(35.45)} size={80} weight={900} parts={["离线最远的", { t: "北上广深，先止跌了。", mark: true }]} />
        <Say at={S(33.8)} out={S(35.45)} size={44} weight={700} color={K.sub} parts={["二手房价格，连涨 7 个月"]} />
      </Box>
      <Note at={S(32.02)} out={S(35.45)}>统计局 2026 年 9 月二手住宅价格：已到线的 14 城中 12 城环比下跌，沈阳持平、大连微涨；一线城市 3–9 月环比连涨</Note>
      <Box x={120} y={120}>
        <Say at={S(35.6)} out={S(36.6)} size={84} weight={900} parts={["为什么？"]} />
      </Box>
      <Box x={120} y={120} gap={8}>
        <Say at={S(36.7)} out={S(39.6)} size={56} parts={[{ t: "深圳", c: K.hopeHi }, "：62 年房租才买得起，"]} />
        <Say at={S(37.3)} out={S(39.6)} size={56} parts={["去年人口还多了 ", { t: "26 万", c: K.hopeHi }]} />
        <Say at={S(37.9)} out={S(39.6)} size={56} parts={[{ t: "哈尔滨", c: K.winHi }, "：29 年房租就能买，房价还在跌"]} />
      </Box>
      <Note at={S(36.7)} out={S(39.6)}>深圳 2025 年末常住人口比上年多 25.9 万（深圳统计公报）；哈尔滨 9 月二手房价比一年前低 4.4%（统计局）</Note>
      <Box x={120} y={120}>
        <Say at={S(39.7)} out={S(40.95)} size={72} weight={900} parts={["房价里，不只有房租。"]} />
      </Box>
      <Box x={120} y={120} gap={14}>
        <Say at={S(41.05)} out={S(44.9)} size={68} weight={900} parts={[{ t: "期待还在", c: K.hopeHi }, "，再贵也涨得动；"]} />
        <Say at={S(42.6)} out={S(44.9)} size={68} weight={900} parts={[{ t: "期待没了", c: K.down }, "，再便宜也还在跌。"]} />
      </Box>
      <Box x={120} y={120} gap={10}>
        <Say at={S(45.2)} out={S(48.35)} size={50} weight={700} color={K.sub} parts={["放到全国看"]} />
        <Say at={S(45.9)} out={S(47.2)} size={64} parts={["2023 年初：高出线 ", { t: "25 层", c: K.hopeHi }]} />
        <Say at={S(47.3)} out={S(48.35)} size={64} parts={["今天：只高出 ", { t: "约 5 层", c: K.hopeHi }]} />
      </Box>
      <Note at={S(45.2)} out={S(48.35)}>2023 年初：房贷 4.26%（人民银行，2022 年 12 月新发放）、大额存单约 3.1%，资金成本约 3.9% = 26 年房租；租金回报率 1.98% = 50.5 年（中指研究院）</Note>
      <Box x={960} y={300} align="center">
        <Say at={S(48.45)} out={S(49.9)} size={96} weight={900} parts={["这几年跌掉的，", { t: "大多是期待", c: K.hopeHi }]} />
      </Box>
      <Box x={960} y={240} align="center" gap={20}>
        <Say at={S(50.05)} out={S(54.9)} size={52} weight={700} color={K.sub} parts={["所以，房价到底了吗？"]} />
        <Say at={S(50.5)} out={S(54.9)} size={100} weight={900} parts={["全国，", { t: "还差最后一成", mark: true }, "。"]} />
        <Say at={S(51.9)} out={S(54.9)} size={56} parts={["这一成，要么靠房价再跌，"]} />
        <Say at={S(52.6)} out={S(54.9)} size={56} parts={["要么靠人们", { t: "重新相信明天", c: K.hopeHi }, "。"]} />
      </Box>
      <Box x={960} y={150} align="center" gap={14}>
        <Say at={S(55.3)} out={S(58.5)} size={84} weight={900} parts={["你的城市，房价是", { t: "几年房租", mark: true }, "？"]} />
        <Say at={S(56.2)} out={S(58.5)} size={42} weight={700} color={K.sub} parts={["低于 38 年，买比租划算；高出来的，是期待"]} />
      </Box>
      <Sources at={S(58.6)} out={S(60.3)} />
    </AbsoluteFill>
  );
};
