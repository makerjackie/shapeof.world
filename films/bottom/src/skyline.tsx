// sb 18–59, one continuous world. The card flips (buy or rent?); a year of owning a ¥1m home is built as a column
// (0.47 + 2.17 = 2.6万) and its top becomes THE LINE; Changsha's and Shenzhen's rent rise beside it; the camera pulls
// out to 50 cities as towers (height = a year's rent per ¥1m, i.e. the rent yield); the subsidy drops the line; quiet:
// the cities over the line are all still falling; the music returns: the four cities furthest below it rose first.
import React from "react";
import { AbsoluteFill } from "remotion";
import data from "./data.json";
import { Box, EO, keys, lerp, Note, ramp, Say, useT, win } from "./kit";
import { FONT, K, NUM } from "./theme";
import { BEAT, S } from "./time";
import { ListingCard, Plan, Tower } from "./world";

export const LINE = 0.3 * 1.55 + 0.7 * 3.1; // 2.635 %
const LINE_SUB = 0.3 * 1.55 + 0.7 * 2.1; // 1.935 %
const Y = data.yields as { c: string; y: number; mom: number | null }[];
const N = Y.length;
const TOP6 = ["长春", "贵阳", "哈尔滨", "乌鲁木齐", "西宁", "长沙"];
const TIER1 = ["北京", "上海", "广州", "深圳"];
const FAR3 = ["厦门", "深圳", "北京"];
const BUY_X = 520;
const RX: Record<string, number> = { 长沙: 1290, 深圳: 1570 };
const skyX = (i: number) => 95 + (i * 1730) / (N - 1);

// Camera: zoom z about (ox, oy).
const camAt = (t: number) => {
  // right end (the cities over the line), left end (the furthest below it), right end again (still falling)
  const zr = keys(t, [[S(33.5), 1], [S(34.1), 1.4], [S(35.7), 1.4], [S(36.2), 1], [S(50.9), 1], [S(51.5), 1.7], [S(53.3), 1.7], [S(53.8), 1]]);
  const zl = keys(t, [[S(37.9), 1], [S(38.6), 1.55], [S(39.9), 1.55], [S(40.5), 1]]);
  return zr > 1 ? { z: zr, ox: 1840, oy: 930 } : { z: zl, ox: 95, oy: 930 };
};

const Label: React.FC<{ x: number; y: number; o: number; children: React.ReactNode; color?: string; size?: number; anchor?: "center" | "left" | "right" }> = ({ x, y, o, children, color = K.fg, size = 30, anchor = "center" }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(${anchor === "center" ? "-50%" : anchor === "right" ? "-100%" : "0"}, -100%)`, opacity: o, fontFamily: FONT, fontWeight: 800, fontSize: size, color, whiteSpace: "nowrap", textShadow: "0 2px 10px rgba(0,0,0,0.9)" }}>
      {children}
    </div>
  );

export const Skyline: React.FC = () => {
  const t = useT();
  if (t < S(18) || t > S(59.6)) return null;
  const sceneO = win(t, S(18), S(59.3), 0.3, 0.5);
  const p = ramp(t, S(31), S(33), EO); // columns → skyline
  const scale = lerp(150, 120, p); // px per % (= per 万 of a ¥1m home's year)
  const base = lerp(860, 930, p);
  const cam = camAt(t);
  const X = (x: number) => cam.ox + (x - cam.ox) * cam.z;
  const Yp = (y: number) => cam.oy + (y - cam.oy) * cam.z;
  const subsidy = keys(t, [[S(42.2), 0], [S(43), 1], [S(47.8), 1], [S(48.4), 0]], EO);
  const lineV = lerp(LINE, LINE_SUB, subsidy);
  const lineY = base - lineV * scale;
  const lineDraw = ramp(t, S(24.7), S(25.6), EO); // from the buy column's top out to the right
  const lineX0 = lerp(BUY_X - 85, 40, p);
  const lineX1 = lerp(BUY_X + 85, 1880, Math.max(lineDraw * 0.999, p));
  const band = win(t, S(36), S(38), 0.4, 0.4);
  const quiet = win(t, S(48), S(56.1), 0.6, 0.3); // the interlude: everything but the line dims
  const rentDim = win(t, S(53.6), S(56.1), 0.4, 0.4);

  // The buy column: 0.47 (deposit's lost interest) + 2.17 (loan interest).
  const buyO = 1 - ramp(t, S(31), S(31.8));
  const h1 = 0.465 * scale * ramp(t, S(20.7), S(21.4), EO);
  const h2 = 2.17 * scale * ramp(t, S(22.6), S(23.4), EO);
  const colsO = win(t, S(20.2), S(59.3), 0.4, 0.5);

  const towers = Y.map((c, i) => {
    const ruler = c.c in RX;
    const rise = ruler ? ramp(t, c.c === "长沙" ? S(28.6) : S(29.3), (c.c === "长沙" ? S(28.6) : S(29.3)) + 0.7, EO) : ramp(t, S(31.4) + i * 0.03, S(31.4) + i * 0.03 + 0.7, EO);
    const x = ruler ? lerp(RX[c.c], skyX(i), p) : skyX(i);
    const w = ruler ? lerp(170, 26, p) : 26;
    const h = c.y * scale * rise;
    const over = c.y >= lineV - 1e-6;
    const tier1 = TIER1.includes(c.c);
    const roofK = (t > S(33.2) && t < S(48) ? (over ? ramp(t, S(33.2) + (N - i) * 0.03, S(33.2) + (N - i) * 0.03 + 0.3) : 0) : 0) * (1 - quiet);
    const upK = tier1 ? win(t, S(56), S(59.3), 0.3, 0.3) : 0;
    return { ...c, i, x, w, h, over, tier1, roofK, upK };
  });

  return (
    <AbsoluteFill style={{ opacity: sceneO }}>
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        <g transform={`translate(${cam.ox} ${cam.oy}) scale(${cam.z}) translate(${-cam.ox} ${-cam.oy})`}>
          {/* the buy column */}
          {buyO > 0 && colsO > 0 ? (
            <g opacity={buyO * colsO}>
              <rect x={BUY_X - 85} y={base - h1} width={170} height={h1} fill={K.ice} opacity={0.35} />
              <rect x={BUY_X - 85} y={base - h1 - h2} width={170} height={h2} fill={K.ice} opacity={0.75} />
              {Array.from({ length: Math.floor((h1 + h2) / (0.1 * scale)) }, (_, k) => (
                <rect key={k} x={BUY_X - 85} y={base - (k + 1) * 0.1 * scale} width={170} height={1} fill={K.bg} opacity={0.35} />
              ))}
            </g>
          ) : null}
          {/* towers */}
          <g opacity={1 - 0.55 * quiet}>
            {towers.map((c) => (
              <Tower key={c.c} x={c.x} base={base} w={c.w} h={c.h} seed={c.i + 3} lit={(c.c in RX && p < 1 ? 0.8 : 0.55 + 0.35 * (c.y / 3.5)) * (1 - 0.45 * rentDim) * (1 + 0.6 * c.upK)} roof={Math.max(c.roofK, c.upK)} o={c.c in RX ? colsO : 1} tone={c.upK > 0 ? K.towerHi : K.tower} />
            ))}
          </g>
          {/* the 2.4–2.7 band */}
          {band > 0 ? <rect x={40} y={base - 2.7 * scale} width={1840} height={0.3 * scale} fill={K.ice} opacity={0.12 * band} /> : null}
          {/* the line, and its snapped-back pieces over the four cities the subsidy barely reaches */}
          {lineDraw > 0 ? (
            <g>
              <rect x={lineX0} y={lineY - 7} width={lineX1 - lineX0} height={14} fill={K.ice} opacity={0.12} />
              <rect x={lineX0} y={lineY - 1.75} width={lineX1 - lineX0} height={3.5} fill={K.iceHi} />
              {towers
                .filter((c) => c.tier1)
                .map((c) => {
                  const k = win(t, S(46.6), S(48.2), 0.4, 0.3);
                  return k > 0 ? <rect key={c.c} x={c.x - 22} y={base - LINE * scale - 2} width={44} height={4} fill={K.iceHi} opacity={k} /> : null;
                })}
            </g>
          ) : null}
        </g>
      </svg>
      {/* city names under every tower (vertical) */}
      <AbsoluteFill style={{ opacity: ramp(t, S(31.6), S(32.4)) * (1 - 0.5 * quiet) }}>
        {towers.map((c) => (
          <div key={c.c} style={{ position: "absolute", left: X(c.x) - 12, top: Yp(base) + 10, width: 24, writingMode: "vertical-rl", fontFamily: FONT, fontSize: 20 * Math.min(cam.z, 1.3), fontWeight: 700, color: c.roofK > 0.5 || c.upK > 0.5 ? K.fg : K.sub, lineHeight: 1 }}>
            {c.c}
          </div>
        ))}
      </AbsoluteFill>

      {/* ---------------- columns: labels ---------------- */}
      <Label x={BUY_X} y={base + 62} o={colsO * buyO} size={40}>买</Label>
      <Label x={BUY_X + 100} y={base - h1 / 2 + 22} o={win(t, S(20.8), S(31), 0.3, 0.4)} anchor="left" size={30} color={K.sub}>
        首付 30 万，本来能存银行：一年少拿约 <span style={{ color: K.iceHi, fontFamily: NUM }}>0.47 万</span>
      </Label>
      <Label x={BUY_X + 100} y={base - h1 - h2 / 2 + 22} o={win(t, S(22.7), S(31), 0.3, 0.4)} anchor="left" size={30} color={K.sub}>
        贷款 70 万：一年利息约 <span style={{ color: K.iceHi, fontFamily: NUM }}>2.17 万</span>
      </Label>
      <Label x={BUY_X} y={lineY - 18} o={win(t, S(24.6), S(28.4), 0.3, 0.3)} size={56} color={K.iceHi}>
        <span style={{ fontFamily: NUM }}>2.6 万</span>
      </Label>
      {(["长沙", "深圳"] as const).map((c) => {
        const row = towers.find((x) => x.c === c)!;
        const a = c === "长沙" ? S(28.6) : S(29.3);
        return (
          <React.Fragment key={c}>
            <Label x={RX[c]} y={base + 62} o={win(t, a, S(31.2), 0.3, 0.3)} size={40}>
              租 · {c}
            </Label>
            <Label x={RX[c]} y={base - row.h - 16} o={win(t, a + 0.4, S(31.2), 0.3, 0.3)} size={52} color={K.winHi}>
              <span style={{ fontFamily: NUM }}>{c === "长沙" ? "3.1" : "1.6"} 万</span>
            </Label>
          </React.Fragment>
        );
      })}
      {/* the gap under the line over Shenzhen */}
      {(() => {
        const o = win(t, S(30.1), S(31.1), 0.3, 0.3);
        if (o <= 0) return null;
        const top = base - LINE * scale;
        const bot = base - 1.6 * scale;
        return (
          <div style={{ position: "absolute", left: RX["深圳"] + 100, top, height: bot - top, borderLeft: `3px solid ${K.ice}`, opacity: o, display: "flex", alignItems: "center" }}>
            <span style={{ marginLeft: 16, fontFamily: FONT, fontWeight: 800, fontSize: 32, color: K.iceHi, whiteSpace: "nowrap" }}>差约 1 万</span>
          </div>
        );
      })()}

      {/* ---------------- skyline: labels ---------------- */}
      {towers
        .filter((c) => TOP6.includes(c.c))
        .map((c, k) => (
          <Label key={c.c} x={X(c.x)} y={Yp(base - c.h) - 24 - (k % 3) * 40} o={win(t, S(34.1) + k * BEAT * 0.5, S(36), 0.25, 0.3)} size={32} color={K.gold}>
            {c.c}
          </Label>
        ))}
      {towers
        .filter((c) => FAR3.includes(c.c))
        .map((c, k) => (
          <Label key={c.c} x={X(c.x)} y={Yp(base - c.h) - 24 - k * 38} o={win(t, S(38.7) + k * BEAT, S(40), 0.25, 0.3)} size={34} color={K.ice}>
            {c.c}
          </Label>
        ))}
      {towers
        .filter((c) => TOP6.includes(c.c))
        .map((c, k) => {
          const o = win(t, S(51.2) + k * BEAT * 0.4, S(53.5), 0.25, 0.3);
          return (
            <Label key={c.c} x={X(c.x)} y={Yp(base - c.h) - 20 - (k % 3) * 44} o={o} size={30} color={K.down}>
              ↓{((100 - (c.mom ?? 100)) ).toFixed(1)}%
            </Label>
          );
        })}
      {towers
        .filter((c) => c.tier1)
        .map((c, k) => (
          <Label key={c.c} x={X(c.x)} y={Yp(base - c.h) - 26 - (k % 2) * 44} o={c.upK} size={30} color={K.up}>
            ↑ {c.c}
          </Label>
        ))}

      {/* ---------------- words ---------------- */}
      <ListingCard x={960} y={lerp(560, 300, ramp(t, S(20), S(20.6), EO))} s={lerp(1.05, 0.4, ramp(t, S(20), S(20.6), EO))} price={keys(t, [[S(19.7), 308], [S(20.1), 100]], EO)} t={t} flip={keys(t, [[S(18.9), 0], [S(19.25), 1], [S(19.55), 1], [S(19.8), 2]], EO)} o={win(t, S(18.4), S(20.6), 0.3, 0.3)} rent="?" unit="按 100 万算" />
      <Box x={120} y={120}>
        <Say at={S(18.4)} out={S(19.95)} size={60} parts={["同一套房，可以", { t: "买", c: K.ice }, "，也可以", { t: "租", c: K.winHi }]} />
      </Box>
      <Box x={120} y={120}>
        <Say at={S(20.1)} out={S(24.4)} size={56} parts={["按每 100 万的房价算，", { t: "买下它", c: K.ice }, "，一年要花多少？"]} />
      </Box>
      <Box x={120} y={120}>
        <Say at={S(24.6)} out={S(26.6)} size={64} parts={["买下它，一年的代价：约 ", { t: "2.6 万", c: K.iceHi, num: true }]} />
        <Say at={S(25.3)} out={S(26.6)} size={36} weight={600} color={K.sub} parts={["本金不算：那是存进房子里的钱"]} />
      </Box>
      <Note at={S(24.6)} out={S(28.4)}>首付三成；存款按国有大行三年期大额存单 1.55%；房贷按 2026 年 9 月新发放平均利率约 3.1%（人民银行）。中指研究院估算的购房资金成本约 2.4%–2.7%。未算物业费、维修和房价涨跌</Note>
      <Box x={120} y={120} gap={10}>
        <Say at={S(26.6)} out={S(28.4)} size={52} parts={["房租比这条线高：", { t: "买，比租划算", c: K.winHi }]} />
        <Say at={S(27.0)} out={S(28.4)} size={52} parts={["房租比这条线低：", { t: "租，比买划算", c: K.ice }]} />
      </Box>
      <Box x={120} y={120} gap={10}>
        <Say at={S(28.5)} out={S(31.1)} size={52} weight={700} color={K.sub} parts={["同样 100 万的房子，一年的房租"]} />
        <Say at={S(29.6)} out={S(31.2)} size={56} parts={["长沙：房租过线，", { t: "买更划算", c: K.winHi }, "　深圳：还差 1 万，", { t: "租更划算", c: K.ice }]} />
      </Box>
      <Note at={S(28.6)} out={S(31.1)}>一年房租 = 租金回报率 × 100 万；长沙约 3.1%、深圳约 1.6%（中指研究院，2026 年 9 月）</Note>
      <Box x={120} y={120} gap={8}>
        <Say at={S(31.3)} out={S(33.6)} size={66} parts={["50 座城市，同一把尺子。", { t: "找找你的城市", c: K.winHi }]} />
        <Say at={S(31.7)} out={S(33.65)} size={34} weight={600} color={K.sub} parts={["楼越高，同样 100 万的房子，一年的房租越多"]} />
      </Box>
      <Box x={120} y={120} gap={8}>
        <Say at={S(33.7)} out={S(36)} size={60} parts={["过线最多的 ", { t: "6 座城市", c: K.gold }]} />
        <Say at={S(34.4)} out={S(36)} size={36} weight={600} color={K.sub} parts={["100 万的房子，一年房租都超过 3 万"]} />
      </Box>
      <Box x={120} y={120}>
        <Say at={S(36.1)} out={S(38)} size={60} parts={["碰到线的，约 ", { t: "20 座", c: K.ice }, "：重庆、南昌……"]} />
      </Box>
      <Note at={S(33.7)} out={S(38)}>租金房价比 = 9 月住宅平均租金 × 12 ÷ 二手住宅均价；超过 3% 和“20 个城市在 2.4% 及以上”见中指报告，其余各城高度按报告图表读取，约数</Note>
      <Box x={1800} y={150} align="right">
        <Say at={S(38.3)} out={S(39.85)} size={64} parts={["离线最远的：", { t: "厦门、深圳、北京", c: K.ice }]} />
      </Box>
      <Box x={120} y={120} gap={10}>
        <Say at={S(39.9)} out={S(42.1)} size={52} weight={700} color={K.sub} parts={["一线城市，100 万的房子一年房租平均只有 ", { t: "1.7 万", num: true, c: K.fg }, "。要碰到这条线："]} />
        <Say at={S(40.2)} out={S(42.1)} size={60} parts={["房价再跌", { t: "三到四成", c: K.ice }, "，或者房租涨", { t: "四到六成", c: K.winHi }]} />
      </Box>
      <Note at={S(39.9)} out={S(42.1)}>按资金成本 2.4%–2.7% 算出来的差距，是算术，不是预测</Note>
      <Box x={120} y={120} gap={10}>
        <Say at={S(42.2)} out={S(44.5)} size={52} weight={700} color={K.sub} parts={["10 月 1 日起，首套房贷款每年贴息 1 个百分点"]} />
        <Say at={S(42.8)} out={S(44.5)} size={60} parts={["这条线降到约 ", { t: "1.9 万", c: K.iceHi, num: true }, "，一大半城市过了线"]} />
      </Box>
      <Note at={S(42.2)} out={S(47.9)}>财金〔2026〕95 号：商业贷款买首套，建筑面积 ≤ 120㎡、总价 ≤ 150 万，按本金年化贴息 1 个百分点，最长 5 年；政策暂定 1 年。150 万能买的面积按中指 2026 年 9 月新房样本均价</Note>
      <SubsidyPlans t={t} />
      <Box x={120} y={120}>
        <Say at={S(46.55)} out={S(48)} size={54} parts={["在北上广深，150 万买不到几平米，这条线几乎没动"]} />
      </Box>
      <Box x={960} y={230} align="center" gap={18}>
        <Say at={S(48.4)} out={S(51)} size={52} weight={700} color={K.sub} stagger={1.6} parts={["划算，不等于会涨。"]} />
        <Say at={S(49.3)} out={S(51)} size={76} weight={900} stagger={1.6} parts={["过了线的城市，房价涨了吗？"]} />
      </Box>
      <Box x={960} y={150} align="center" gap={12}>
        <Say at={S(51.1)} out={S(53.5)} size={62} parts={["过线最多的 6 座城市，", { t: "全都还在跌", c: K.down }]} />
        <Say at={S(51.6)} out={S(53.5)} size={40} weight={600} color={K.sub} parts={["长沙比一年前低 5.5%　哈尔滨低 4.4%"]} />
      </Box>
      <Box x={960} y={150} align="center" gap={12}>
        <Say at={S(53.6)} out={S(56)} size={54} parts={["房租自己也在降：三季度，50 座城市里 ", { t: "39 座", c: K.down }]} />
        <Say at={S(54.4)} out={S(56)} size={44} weight={700} color={K.sub} parts={["房租降了，过了线的楼，也会掉回线下"]} />
      </Box>
      <Box x={960} y={150} align="center" gap={12}>
        <Say at={S(56.05)} out={S(59.2)} size={76} weight={900} parts={["离线最远的", { t: "北上广深，先止跌了。", mark: true }]} />
        <Say at={S(56.9)} out={S(59.2)} size={42} weight={700} color={K.sub} parts={["二手房价格，连涨 7 个月"]} />
      </Box>
      <Note at={S(51.1)} out={S(56)}>房价：统计局 2026 年 9 月二手住宅环比与同比；房租：中指研究院三季度 50 城住宅租金</Note>
    </AbsoluteFill>
  );
};

// 150 万 in Changsha and in Shenzhen, drawn to the same scale.
const SubsidyPlans: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, S(44.6), S(46.6), 0.35, 0.35);
  if (o <= 0) return null;
  const k = 21; // px per sqrt(㎡) at aspect 1.4
  const dims = (a: number) => ({ w: Math.sqrt(a * 1.4) * k, h: Math.sqrt(a / 1.4) * k });
  const cs = dims(155);
  const sz = dims(28);
  const g = ramp(t, S(45.1), S(45.6), EO);
  return (
    <div style={{ position: "absolute", left: 120, top: 120, opacity: o, fontFamily: FONT }}>
      <div style={{ fontSize: 56, fontWeight: 800, color: K.fg, textShadow: "0 2px 10px #000" }}>可贴息只给 150 万以下的房子。150 万能买：</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 70, marginTop: 30 }}>
        <div>
          <div style={{ width: cs.w, height: cs.h, background: "rgba(246,243,236,0.92)", borderRadius: 6, transform: `scale(${g})`, transformOrigin: "0 100%" }}>
            <Plan w={cs.w} h={cs.h} color="#3b4150" />
          </div>
          <div style={{ marginTop: 12, fontSize: 40, fontWeight: 800, color: K.fg }}>
            长沙 约 <span style={{ fontFamily: NUM, color: K.winHi }}>155</span>㎡
          </div>
        </div>
        <div>
          <div style={{ width: sz.w, height: sz.h, background: "rgba(246,243,236,0.92)", borderRadius: 4, transform: `scale(${g})`, transformOrigin: "0 100%" }}>
            <Plan w={sz.w} h={sz.h} color="#3b4150" />
          </div>
          <div style={{ marginTop: 12, fontSize: 40, fontWeight: 800, color: K.fg }}>
            深圳 约 <span style={{ fontFamily: NUM, color: K.ice }}>28</span>㎡
          </div>
        </div>
      </div>
    </div>
  );
};
