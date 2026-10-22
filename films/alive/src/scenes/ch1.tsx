import React from "react";
import { AbsoluteFill, random } from "remotion";
import { GBr, LIFE, LifeGrid, RG, RIGHT, tintFor } from "../grid";
import { EBACK, EIO, EO, In, Odometer, progAt, Tag } from "../fx";
import { useBeatFrame } from "../kit";
import { FONT, K } from "../theme";
import { Box, Cap, Head, Src } from "../ui";

// 2018 time-use survey (NBS, 11 provinces, everyone 15+), minutes a day. Awake = 1440 − 559 = 881; the things you
// have to do = paid work 264 + travel 38 + unpaid work 162 = 464, 464 / 881 = 52.7 % (derived, flagged on screen).
const DAY = { sleep: 559, paid: 264, travel: 38, unpaid: 162 };
const X0 = 130;
const W = 1660;
const PX = W / 1440;
const BAR_Y = 600;
const BAR_H = 64;

export const Day: React.FC = () => {
  const frame = useBeatFrame();
  const draw = progAt(frame, 1.5, 2.5, EIO);
  const sleepDim = progAt(frame, 4, 1, EO);
  const segs = [
    { m: DAY.paid, c: K.steel, at: 5 },
    { m: DAY.travel, c: K.steelHi, at: 5.6 },
    { m: DAY.unpaid, c: K.steelLo, at: 6.2 },
  ];
  const sleepW = DAY.sleep * PX;
  const restX = X0 + (DAY.sleep + DAY.paid + DAY.travel + DAY.unpaid) * PX;
  const brace = progAt(frame, 7.5, 1, EO);
  let x = X0 + sleepW;
  return (
    <AbsoluteFill>
      <Box x={X0} y={150} style={{ gap: 14 }}>
        <Head at={0} parts={["醒着的时间里，"]} size={76} />
        <Head at={1.5} parts={[{ t: "一半多", c: K.steelHi }, "给了“要做的事”。"]} size={76} />
      </Box>
      <div style={{ position: "absolute", left: 1370, top: 150 }}>
        <In at={8} from="scale">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
            <Odometer value={53 * progAt(frame, 8, 1.6, EO)} size={190} suffix="%" color={K.steelHi} />
            <Tag color={K.sub} size={24}>推算 · 含不上班的人</Tag>
          </div>
        </In>
      </div>
      {/* The day, 24 hours from left to right, wiped in. */}
      <div style={{ position: "absolute", left: X0, top: BAR_Y, width: W * draw, height: BAR_H, overflow: "hidden", borderRadius: 10 }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: sleepW, height: BAR_H, background: K.night, opacity: 1 - 0.4 * sleepDim }} />
        <div style={{ position: "absolute", left: sleepW, top: 0, width: W - sleepW, height: BAR_H, background: `${K.theme}2e` }} />
        {segs.map((s, i) => {
          const p = progAt(frame, s.at, 0.8, EO);
          const left = x - X0;
          x += s.m * PX;
          return <div key={i} style={{ position: "absolute", left, top: 0, width: s.m * PX * p, height: BAR_H, background: s.c }} />;
        })}
      </div>
      {/* Brace over the three segments. */}
      <div style={{ position: "absolute", left: X0 + sleepW, top: BAR_Y - 30, width: (restX - X0 - sleepW) * brace, height: 16, borderTop: `3px solid ${K.steelHi}`, borderLeft: `3px solid ${K.steelHi}`, borderRight: brace > 0.98 ? `3px solid ${K.steelHi}` : undefined, borderRadius: "6px 6px 0 0", opacity: brace }} />
      <div style={{ position: "absolute", left: X0 + sleepW, top: BAR_Y - 86 }}>
        <In at={7.8} from="up" dist={20}>
          <div style={{ fontFamily: FONT, fontSize: 38, fontWeight: 700, color: K.steelHi, whiteSpace: "nowrap" }}>要做的事 · 7 小时 44 分</div>
        </In>
      </div>
      <Label x={X0 + 10} at={4} c={K.muted}>睡觉休息 9:19</Label>
      <Label x={X0 + sleepW + 10} at={5} c={K.steel}>工作 4:24</Label>
      <Label x={X0 + sleepW + DAY.paid * PX + 10} at={5.6} c={K.steelHi} row={1}>路上 0:38 · 家务和照顾家人 2:42</Label>
      <Label x={restX + 14} at={6.6} c={K.theme}>吃饭、休息、学习 6:57</Label>
      <Src>国家统计局 · 2018 年时间利用调查（11 省市，48,580 人）· 15 岁以上全体均值 · 53% =（工作 + 交通 + 无酬劳动）÷ 醒着的时间</Src>
    </AbsoluteFill>
  );
};

const Label: React.FC<{ x: number; at: number; c: string; row?: number; children: React.ReactNode }> = ({ x, at, c, row = 0, children }) => (
  <div style={{ position: "absolute", left: x, top: BAR_Y + BAR_H + 18 + row * 44 }}>
    <In at={at} from="up" dist={16}>
      <div style={{ fontFamily: FONT, fontSize: 28, fontWeight: 700, color: c, whiteSpace: "nowrap" }}>{children}</div>
    </In>
  </div>
);

// Branch labels sit just above where a branch turns flat.
export const BrLabel: React.FC<{ b: Omit<GBr, "grow">; at: number; children: React.ReactNode; o?: number }> = ({ b, at, children, o = 1 }) => {
  const x = RG.ageX(b.from) + Math.min(110, (b.to - b.from) * RIGHT.pitch * 0.3) * 2 + 8;
  const y = RG.trunkY + b.dy * RIGHT.pitch - 40;
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: o }}>
      <In at={at} from="fade">
        <div style={{ fontFamily: FONT, fontSize: 28, fontWeight: 700, color: b.color, whiteSpace: "nowrap", textShadow: "0 2px 12px rgba(0,0,0,0.9)" }}>{children}</div>
      </In>
    </div>
  );
};

export const lifeBranches = (frame: number, at: [number, number, number], o = 1): GBr[] => [
  { ...LIFE.school, grow: progAt(frame, at[0], 2, EIO), o },
  { ...LIFE.work, grow: progAt(frame, at[1], 2.4, EIO), o },
  { ...LIFE.money, grow: progAt(frame, at[2], 2.6, EIO), o },
];

// 28 s: the branches are named, then the trunk.
export const Lines: React.FC = () => {
  const frame = useBeatFrame();
  const fade = progAt(frame, 6, 1.5, EO);
  const bs = lifeBranches(frame, [0.5, 1.3, 2.1], 1 - 0.4 * fade);
  const glow = 0.4 + 0.6 * progAt(frame, 7.5, 1.2, EO);
  return (
    <AbsoluteFill>
      <LifeGrid {...RIGHT} paint={tintFor(bs)} branches={bs} glow={glow} />
      <BrLabel b={LIFE.school} at={1.5}>上学</BrLabel>
      <BrLabel b={LIFE.work} at={2.3}>工作</BrLabel>
      <BrLabel b={LIFE.money} at={3.1}>赚钱</BrLabel>
      <div style={{ position: "absolute", left: RG.ageX(0), top: RG.trunkY + 14 }}>
        <In at={7.5} from="fade">
          <div style={{ fontFamily: FONT, fontSize: 30, fontWeight: 900, color: K.theme, textShadow: "0 2px 12px rgba(0,0,0,0.9)" }}>活着</div>
        </In>
      </div>
      <Box x={130} y={280} style={{ gap: 18 }}>
        <Head at={0} parts={["上学、工作、赚钱——"]} size={68} />
        <Head at={2.5} parts={[{ t: "这些是支线", c: K.steelHi }, "。"]} size={76} />
        <div style={{ height: 30 }} />
        <Head at={6} parts={["中间这条，"]} size={68} />
        <Head at={7.5} parts={[{ t: "是主线：活着", c: K.theme }, "。"]} size={76} />
      </Box>
    </AbsoluteFill>
  );
};

// 100 workers, 20 of them engaged (Gallup 2026, 2025 data). Two dim again for East Asia's 18 %.
const ENGAGED = (() => {
  const idx = Array.from({ length: 100 }, (_, i) => i).sort((a, b) => random(`g${a}`) - random(`g${b}`));
  return { on: new Set(idx.slice(0, 20)), east: new Set(idx.slice(18, 20)) };
})();

export const Alone: React.FC = () => {
  const frame = useBeatFrame();
  const light = progAt(frame, 3, 1.6, EO);
  const dimEast = progAt(frame, 6, 0.8, EO);
  const P = 58;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 1160, top: 260 }}>
        {Array.from({ length: 100 }, (_, i) => {
          const col = i % 10;
          const row = Math.floor(i / 10);
          const pop = progAt(frame, 0.3 + (col + row) * 0.08, 0.8, EBACK);
          const on = ENGAGED.on.has(i);
          const lit = on ? light * (ENGAGED.east.has(i) ? 1 - 0.75 * dimEast : 1) : 0;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: col * P,
                top: row * P,
                width: 44,
                height: 44,
                borderRadius: 8,
                background: lit > 0.02 ? K.theme : K.fg,
                opacity: (lit > 0.02 ? 0.2 + 0.8 * lit : 0.1) * Math.min(1, pop),
                transform: `scale(${0.6 + 0.4 * pop})`,
              }}
            />
          );
        })}
      </div>
      <Box x={130} y={230} style={{ gap: 12 }}>
        <Head at={0} parts={["对工作提不起劲？"]} size={76} />
        <Cap at={1.5} size={44} color={K.sub}>全世界的员工里，真正投入的只有</Cap>
        <In at={2.7} from="up" dist={30}>
          <Odometer value={20 * light} size={190} suffix="%" color={K.theme} />
        </In>
        <Cap at={6} size={44} color={K.sub}>东亚：18%</Cap>
        <div style={{ height: 16 }} />
        <Head at={8} parts={[{ t: "你不是一个人", c: K.theme }, "。"]} size={84} />
      </Box>
      <Src>盖洛普 · 全球职场现状 2026 · 2025 年数据 · “敬业”按盖洛普的定义，自评问卷 · 东亚为区域均值</Src>
    </AbsoluteFill>
  );
};
