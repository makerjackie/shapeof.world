import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { EnergyTower, Ground, Label } from "../art";
import { CL, EIO, EO, In, progAt } from "../fx";
import { useBeatFrame } from "../kit";
import { FONT, K } from "../theme";
import { FPB } from "../timing";
import { Box, Cap, Head, Src } from "../ui";

// Approvals: 63 items, 25 working days of government time. The calendar flips 25 pages.
export const Calendar: React.FC = () => {
  const frame = useBeatFrame();
  const day = Math.max(1, Math.min(25, Math.floor(interpolate(frame, [1 * FPB, 5.4 * FPB], [1, 25.99], CL))));
  const flip = ((frame - FPB) / ((4.4 * FPB) / 25)) % 1;
  const turning = frame > FPB && frame < 5.4 * FPB;
  const page = (n: number, extra?: React.CSSProperties) => (
    <div style={{ position: "absolute", inset: 0, background: K.paper, borderRadius: 18, display: "flex", flexDirection: "column", alignItems: "center", overflow: "hidden", ...extra }}>
      <div style={{ width: "100%", height: 70, background: K.theme, color: K.bg, fontFamily: FONT, fontWeight: 900, fontSize: 34, display: "flex", alignItems: "center", justifyContent: "center" }}>工作日</div>
      <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 190, color: K.ink, lineHeight: "250px", fontVariantNumeric: "tabular-nums" }}>{n}</div>
    </div>
  );
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 1180, top: 300, width: 380, height: 330, perspective: 1200 }}>
        {page(day)}
        {turning && day < 25 ? page(day, { transformOrigin: "50% 0%", transform: `rotateX(${flip * 100}deg)`, opacity: 1 - flip * 0.6 }) : null}
      </div>
      <Box x={130} y={300} style={{ gap: 26 }}>
        <Head at={0} parts={["审批 63 项"]} size={84} />
        <Cap at={2} size={44} color={K.sub}>政府办理时限，加起来</Cap>
        <In at={5} from="scale">
          <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 150, color: K.fg, whiteSpace: "nowrap", lineHeight: 1 }}>
            25 <span style={{ fontSize: 70 }}>个工作日</span>
          </div>
        </In>
      </Box>
      <Src>深圳市政府令第 329 号（2020）：用地规划 2 + 工程规划 10 + 施工许可 3 + 竣工验收 10 · 审批事项目录（2018）</Src>
    </AbsoluteFill>
  );
};

const MILESTONES = [
  { y: 2008, t: "拿地", at: 0.5 },
  { y: 2009, t: "立项", at: 1.2 },
  { y: 2010, t: "方案", at: 1.9 },
  { y: 2012, t: "开工", at: 2.6 },
  { y: 2018, t: "交付", at: 7 },
];

// Ten years and two months from land to the first tenant.
export const Timeline: React.FC = () => {
  const frame = useBeatFrame();
  const x0 = 130;
  const x1 = 1130;
  const yAxis = 820;
  const X = (y: number) => x0 + ((y - 2008) / 10) * (x1 - x0);
  const axis = progAt(frame, 0, 7, EIO);
  const grow = progAt(frame, 2.8, 4.2, EIO);
  return (
    <AbsoluteFill>
      <Ground y={960} />
      <EnergyTower cx={1450} ground={960} progress={grow} blueprint={1 - grow} />
      <div style={{ position: "absolute", left: x0, top: yAxis, width: (x1 - x0) * axis, height: 4, background: K.theme, borderRadius: 2 }} />
      {MILESTONES.map((m) => {
        const p = progAt(frame, m.at, 0.6, EO);
        return (
          <div key={m.y} style={{ position: "absolute", left: X(m.y), top: yAxis, opacity: p }}>
            <div style={{ position: "absolute", left: -9, top: -7, width: 18, height: 18, borderRadius: 9, background: K.theme }} />
            <div style={{ position: "absolute", left: 0, top: 26, transform: "translateX(-50%)", fontFamily: FONT, fontWeight: 900, fontSize: 28, color: K.fg, whiteSpace: "nowrap" }}>{m.y}</div>
            <div style={{ position: "absolute", left: 0, top: 66, transform: "translateX(-50%)", fontFamily: FONT, fontWeight: 700, fontSize: 28, color: K.sub, whiteSpace: "nowrap" }}>{m.t}</div>
          </div>
        );
      })}
      <Box x={130} y={250} style={{ gap: 20 }}>
        <Head at={0} parts={["可这栋楼，从拿地到交付："]} size={64} />
        <In at={8} from="slam">
          <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 150, color: K.theme, whiteSpace: "nowrap", lineHeight: 1.05 }}>
            10 年<span style={{ fontSize: 96 }}>零 2 个月</span>
          </div>
        </In>
      </Box>
      <Src>深圳能源公告（2008、2010、2018）· 开工年份：CTBUH · 首批租户 2018 年 6 月交付</Src>
    </AbsoluteFill>
  );
};

// Construction spending per year (在建工程增加额, 亿元, excluding land).
const SPEND = [
  { y: 2011, v: 0.1964 },
  { y: 2012, v: 0.3024 },
  { y: 2013, v: 0.7605 },
  { y: 2014, v: 1.906 },
  { y: 2015, v: 2.116 },
  { y: 2016, v: 4.142 },
  { y: 2017, v: 4.616 },
  { y: 2018, v: 4.099 },
];

export const Money: React.FC = () => {
  const frame = useBeatFrame();
  const base = 900;
  const x0 = 140;
  const step = 128;
  const H = 440 / 4.616;
  const bracket = (from: number, to: number, at: number, label: string, color: string, top: number) => {
    const p = progAt(frame, at, 0.8, EO);
    const l = x0 + from * step - 10;
    const w = (to - from + 1) * step - 40;
    return (
      <div style={{ position: "absolute", left: l, top, width: w, opacity: p }}>
        <div style={{ height: 16, borderTop: `3px solid ${color}`, borderLeft: `3px solid ${color}`, borderRight: `3px solid ${color}`, borderRadius: "6px 6px 0 0" }} />
        <div style={{ position: "absolute", left: w / 2, top: -64, transform: "translateX(-50%)", fontFamily: FONT, fontWeight: 900, fontSize: 44, color, whiteSpace: "nowrap" }}>{label}</div>
      </div>
    );
  };
  const budget = progAt(frame, 8, 1, EO);
  return (
    <AbsoluteFill>
      <Ground y={base} />
      {SPEND.map((d, i) => {
        const p = progAt(frame, 0.4 + i * 0.4, 1.2, EO);
        const h = Math.max(4, d.v * H * p);
        return (
          <React.Fragment key={d.y}>
            <div style={{ position: "absolute", left: x0 + i * step, top: base - h, width: step - 40, height: h, background: i >= 5 ? K.theme : `${K.theme}88`, borderRadius: "6px 6px 0 0" }} />
            <Label x={x0 + i * step + (step - 40) / 2} y={base + 34} size={28} color={K.sub}>{d.y}</Label>
          </React.Fragment>
        );
      })}
      {bracket(0, 2, 4, "前三年 1.26 亿", K.sub, base - 0.7605 * H - 40)}
      {bracket(5, 7, 5.5, "最后三年 12.86 亿", K.theme, base - 4.616 * H - 40)}
      <Box x={130} y={150}>
        <Head at={0} parts={["钱也是一年年花出去的"]} size={64} />
      </Box>
      <div style={{ position: "absolute", right: 120, top: 330, opacity: budget, transform: `translateY(${(1 - budget) * 30}px)`, textAlign: "right", fontFamily: FONT }}>
        <div style={{ fontSize: 40, fontWeight: 700, color: K.sub }}>预算</div>
        <div style={{ fontSize: 56, fontWeight: 900, color: K.muted, whiteSpace: "nowrap" }}>24.66 亿 →</div>
        <div style={{ fontSize: 120, fontWeight: 900, color: K.fg, whiteSpace: "nowrap", lineHeight: 1 }}>29.36 亿</div>
      </div>
      <Src>深圳能源 2011–2018 年报 · 在建工程每年增加额，不含地价 · 预算：2010 年投资公告、2014 年起年报</Src>
    </AbsoluteFill>
  );
};

const ROLL: [string, string][] = [
  ["业主", "深圳能源集团"],
  ["", "股东大会 · 董事会"],
  ["审批", "市规划局 · 市发改局"],
  ["", "市政府常务会议"],
  ["", "审批事项 63 项"],
  ["设计", "BIG · 深圳市建筑设计研究总院"],
  ["顾问", "Arup · Aurecon · Transsolar"],
  ["施工", "中建二局"],
  ["幕墙", "方大"],
  ["电梯", "KONE · 16 部"],
  ["工人", "高峰约 1,000 人"],
  ["资金", "自有资金 50% · 银行贷款 50%"],
  ["租户", "长城证券 ……"],
];

// The building's end credits.
export const Credits: React.FC = () => {
  const frame = useBeatFrame();
  const rowH = 74;
  const total = ROLL.length * rowH + 700;
  const y = interpolate(frame, [0.6 * FPB, 8.4 * FPB], [1080, 1080 - total + 300], CL);
  const endP = progAt(frame, 8, 1, EO);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: y, opacity: 1 - endP }}>
        {ROLL.map(([r, n], i) => (
          <div key={i} style={{ display: "flex", height: rowH, alignItems: "center", fontFamily: FONT }}>
            <div style={{ width: 900, textAlign: "right", paddingRight: 40, fontSize: 34, fontWeight: 700, color: K.theme }}>{r}</div>
            <div style={{ fontSize: 44, fontWeight: 700, color: K.fg, whiteSpace: "nowrap" }}>{n}</div>
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 90, height: 170, background: `linear-gradient(180deg, ${K.bg} 55%, transparent)` }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 150, display: "flex", justifyContent: "center" }}>
        <Head at={0} parts={["一栋楼的片尾字幕"]} size={64} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 470, display: "flex", justifyContent: "center", opacity: endP, transform: `scale(${0.9 + 0.1 * endP})` }}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 96, color: K.fg, whiteSpace: "nowrap" }}>
          上百家单位，<span style={{ color: K.theme }}>十年</span>。
        </div>
      </div>
      <Src>深圳能源公告 · CTBUH · 工人数和单位数为估算</Src>
    </AbsoluteFill>
  );
};

// The tower is finished; every window is dark.
export const Done: React.FC = () => (
  <AbsoluteFill>
    <Ground y={960} />
    <EnergyTower cx={1400} ground={960} progress={1} crane={false} />
    <Box x={130} y={360} style={{ gap: 30 }}>
      <Head at={0} parts={["2018 年，楼盖好了。"]} size={80} />
      <Head at={3} parts={["接下来——", { t: "等人来", c: K.theme }, "。"]} size={92} />
    </Box>
  </AbsoluteFill>
);

