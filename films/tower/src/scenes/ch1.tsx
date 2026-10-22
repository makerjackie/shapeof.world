import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { EnergyTower, Ground } from "../art";
import { CL, EBACK, EO, In, Odometer, progAt } from "../fx";
import { Stamp, useBeatFrame } from "../kit";
import { FONT, K } from "../theme";
import { Box, Cap, Head, Pill, Src } from "../ui";

const GROUND = 960;
const TX = 1400; // the tower's centre in this chapter

// 2008: an empty plot, and the city has already drawn what goes on it.
export const Plot: React.FC = () => {
  const frame = useBeatFrame();
  const bp = progAt(frame, 1, 4, EO);
  return (
    <AbsoluteFill>
      <Ground y={GROUND} />
      <div style={{ position: "absolute", left: TX - 300, top: GROUND, width: 600, height: 26, background: "repeating-linear-gradient(90deg, #3a2f22 0 18px, #2a231a 18px 36px)", opacity: 0.8 }} />
      <EnergyTower cx={TX} ground={GROUND} progress={0} blueprint={bp} crane={false} />
      <Box x={130} y={250}>
        <In at={0} from="left">
          <Pill size={34}>2008 · 福田</Pill>
        </In>
        <Head at={0.5} parts={["楼还没影，"]} size={76} />
        <Head at={1.5} parts={["城市已经画好了："]} size={76} />
        <div style={{ display: "flex", gap: 18, marginTop: 20 }}>
          <In at={4} from="up"><Pill size={42}>盖办公楼</Pill></In>
          <In at={5} from="up"><Pill size={42}>9.6 万㎡</Pill></In>
          <In at={6} from="up"><Pill size={42}>用 50 年</Pill></In>
        </div>
      </Box>
      <Src>深圳能源《关于竞买公司总部大楼用地的公告》2008 · 宗地 B119-0053，计容面积 96,420㎡，年限 50 年</Src>
    </AbsoluteFill>
  );
};

const RULES: { t: string; hot?: boolean }[] = [
  { t: "必须是能源企业", hot: true },
  { t: "净资产 40 亿以上" },
  { t: "上一年在深圳纳税 3 亿以上" },
  { t: "建成后六成自用，10 年不准卖" },
];

// Who may bid: the conditions written into the land sale.
export const Buyers: React.FC = () => (
  <AbsoluteFill>
    <Ground y={GROUND} />
    <EnergyTower cx={TX} ground={GROUND} progress={0} blueprint={1} crane={false} />
    <Box x={130} y={190} style={{ gap: 26 }}>
      <Head at={0} parts={["谁能买？"]} size={84} />
      {RULES.map((r, i) => (
        <div key={r.t} style={{ display: "flex", alignItems: "center", gap: 26, height: 84 }}>
          <div style={{ width: 84, display: "flex", justifyContent: "center" }}>
            <Stamp at={2 + i} color={K.theme} size={44} rotate={-8} style={{ padding: "2px 14px", borderWidth: 5 }}>✓</Stamp>
          </div>
          <In at={1.6 + i} from="left">
            <div style={{ fontFamily: FONT, fontSize: r.hot ? 58 : 48, fontWeight: r.hot ? 900 : 700, color: r.hot ? K.theme : K.fg, whiteSpace: "nowrap" }}>{r.t}</div>
          </In>
        </div>
      ))}
    </Box>
    <Src>深圳能源《关于竞买公司总部大楼用地的公告》2008 · 竞买条件摘录</Src>
  </AbsoluteFill>
);

// Sold for 6.7 亿; the plot gets its name.
export const Sold: React.FC = () => {
  const frame = useBeatFrame();
  const v = interpolate(frame, [0, 1.6 * 15], [0, 6.7], { ...CL, easing: EO });
  const sign = progAt(frame, 3, 1, EBACK);
  return (
    <AbsoluteFill>
      <Ground y={GROUND} />
      <EnergyTower cx={TX} ground={GROUND} progress={0} blueprint={1} crane={false} />
      <div style={{ position: "absolute", left: TX - 150, top: GROUND - 170 * sign, width: 300, opacity: Math.min(1, sign * 2) }}>
        <div style={{ background: K.paper, color: K.ink, fontFamily: FONT, fontWeight: 900, fontSize: 34, textAlign: "center", padding: "14px 0", borderRadius: 8 }}>深圳能源大厦</div>
        <div style={{ margin: "0 auto", width: 10, height: 120 * sign, background: K.paper, opacity: 0.8 }} />
      </div>
      <Box x={130} y={260}>
        <Cap at={0} size={44} color={K.sub}>2008 年 4 月，成交</Cap>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <Odometer value={v} decimals={1} size={200} color={K.fg} />
          <span style={{ fontFamily: FONT, fontSize: 90, fontWeight: 900 }}>亿</span>
        </div>
        <Cap at={2} size={44} color={K.fg}>买家：深圳能源</Cap>
        <Cap at={3} size={44} color={K.sub}>这栋楼，就是后来的深圳能源大厦</Cap>
      </Box>
      <Src>深圳能源《关于竞得公司总部大楼用地的公告》2008-04-25</Src>
    </AbsoluteFill>
  );
};

// 2025: the same deal, on today's terms.
export const Today: React.FC = () => (
  <AbsoluteFill>
    <Box x={960} y={170} cx style={{ gap: 24 }}>
      <Head at={0} parts={["今天还是这么卖。"]} size={76} />
      <Cap at={0.8} size={42} color={K.sub}>2025 年，南山一块总部地，字节跳动旗下公司拿下</Cap>
      <In at={1.5} from="scale">
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 6 }}>
          <span style={{ fontFamily: FONT, fontSize: 180, fontWeight: 900, letterSpacing: -5 }}>9.65</span>
          <span style={{ fontFamily: FONT, fontSize: 84, fontWeight: 900 }}>亿</span>
        </div>
      </In>
      <div style={{ display: "flex", gap: 22, marginTop: 10 }}>
        <In at={2.5} from="up"><Pill size={42}>条件：5 年在深圳形成地方财力 15 亿以上</Pill></In>
        <In at={3.5} from="up"><Pill size={42}>楼不能卖</Pill></In>
      </div>
    </Box>
    <Src>澎湃新闻 2025-10-12（K602-0016 出让公告）· IT之家 2026 · 按起始价成交</Src>
  </AbsoluteFill>
);

// The scale tips: the land is the cheaper side of the deal.
export const Scale: React.FC = () => {
  const frame = useBeatFrame();
  const tilt = progAt(frame, 0, 1.4, EBACK) * 9;
  const cx = 960;
  const cy = 330;
  const arm = 380;
  const rad = (tilt * Math.PI) / 180;
  const lx = cx - Math.cos(rad) * arm;
  const ly = cy - Math.sin(rad) * arm;
  const rx = cx + Math.cos(rad) * arm;
  const ry = cy + Math.sin(rad) * arm;
  const pan = (x: number, y: number, label: string, value: string, color: string, big: number) => (
    <div style={{ position: "absolute", left: x - 170, top: y + 40, width: 340, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ width: 2, height: 40, background: K.muted, marginTop: -40 }} />
      <div style={{ width: 340, height: 14, borderRadius: 7, background: color }} />
      <div style={{ fontFamily: FONT, fontSize: 34, fontWeight: 700, color: K.sub, marginTop: 16 }}>{label}</div>
      <div style={{ fontFamily: FONT, fontSize: big, fontWeight: 900, color, whiteSpace: "nowrap" }}>{value}</div>
    </div>
  );
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: cx - 4, top: cy, width: 8, height: 260, background: K.muted, borderRadius: 4 }} />
      <div style={{ position: "absolute", left: cx - 90, top: cy + 255, width: 180, height: 14, background: K.muted, borderRadius: 7 }} />
      <div style={{ position: "absolute", left: cx - arm, top: cy - 5, width: arm * 2, height: 10, background: K.fg, borderRadius: 5, transform: `rotate(${tilt}deg)` }} />
      <div style={{ position: "absolute", left: cx - 14, top: cy - 14, width: 28, height: 28, borderRadius: "50%", background: K.fg }} />
      {pan(lx, ly, "地价", "9.65 亿", K.green, 72)}
      {pan(rx, ry, "承诺的地方财力", "15 亿", K.theme, 96)}
      <Box x={960} y={720} cx style={{ gap: 16 }}>
        <Head at={4} parts={["城市卖的不是地，", { t: "是以后的税", c: K.theme }, "。"]} size={80} />
        <Cap at={7} size={42} color={K.fg}>这些税，会变成路、地铁和学校。</Cap>
      </Box>
      <Src at={7}>地方财力：企业交的税里留在深圳的部分 · 澎湃新闻 2025</Src>
    </AbsoluteFill>
  );
};
