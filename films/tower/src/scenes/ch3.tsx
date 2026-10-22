import React from "react";
import { AbsoluteFill, interpolate, random } from "remotion";
import { Dial, EnergyTower, Ground, Label } from "../art";
import { EBACK, EIO, EO, In, progAt } from "../fx";
import { Stamp, Strike, useBeatFrame } from "../kit";
import { FONT, K } from "../theme";
import { FPB } from "../timing";
import { Box, Cap, Head, Src } from "../ui";

// A wall of office windows; exactly one in four goes dark.
const COLS = 16;
const ROWS = 7;
const DARK = (() => {
  const ids = Array.from({ length: COLS * ROWS }, (_, i) => i).sort((a, b) => random(`vac${a}`) - random(`vac${b}`));
  return new Set(ids.slice(0, (COLS * ROWS) / 4));
})();

export const Vacancy: React.FC = () => {
  const frame = useBeatFrame();
  const on = progAt(frame, 0, 1.2, EO);
  const off = progAt(frame, 5.6, 0.8, EIO);
  const w = 88;
  const h = 56;
  const gx = 960 - (COLS * (w + 12)) / 2;
  return (
    <AbsoluteFill>
      {Array.from({ length: COLS * ROWS }).map((_, i) => {
        const c = i % COLS;
        const r = Math.floor(i / COLS);
        const lit = DARK.has(i) ? on * (1 - off) : on;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: gx + c * (w + 12),
              top: 420 + r * (h + 12),
              width: w,
              height: h,
              borderRadius: 4,
              background: lit > 0.05 ? K.lit : "#1b2430",
              opacity: lit > 0.05 ? 0.25 + 0.6 * lit : 0.9,
            }}
          />
        );
      })}
      <Box x={960} y={170} cx style={{ gap: 14 }}>
        <Cap at={0} size={46} color={K.sub}>深圳的甲级写字楼</Cap>
        <Head at={5.5} parts={["约 ", { t: "每 4 间，空 1 间", c: K.fg }]} size={92} />
      </Box>
      <Src>高力、仲量联行、戴德梁行、第一太平戴维斯 · 2026 年第三季度 · 空置率 23.6%–28.7%</Src>
    </AbsoluteFill>
  );
};

// Average rent, 2018 peak vs today: the column drops to half and leaves its old outline.
export const Rent: React.FC = () => {
  const frame = useBeatFrame();
  const rise = progAt(frame, 0.3, 1.2, EO);
  const drop = progAt(frame, 5.6, 1.4, EBACK);
  const H = 560 / 276.6;
  const v = interpolate(drop, [0, 1], [276.6, 142.2]);
  const h = v * H * rise;
  const base = 930;
  const x = 1180;
  return (
    <AbsoluteFill>
      <Ground y={base} />
      <div style={{ position: "absolute", left: x, top: base - 276.6 * H, width: 260, height: 276.6 * H, border: `3px dashed ${K.muted}`, borderBottom: "none", borderRadius: "10px 10px 0 0", opacity: drop * 0.8 }} />
      <div style={{ position: "absolute", left: x, top: base - h, width: 260, height: h, background: `linear-gradient(180deg, ${K.theme}, ${K.theme}55)`, borderRadius: "10px 10px 0 0" }} />
      <Label x={x + 130} y={base - h - 60} size={72} w={900}>{v.toFixed(1)}</Label>
      <Box x={130} y={300} style={{ gap: 22 }}>
        <Cap at={0} size={46} color={K.sub}>平均租金（元/㎡/月）</Cap>
        <Head at={0.8} parts={["2018 年最高，276.6"]} size={64} />
        <Head at={5.6} parts={["今天，142.2"]} size={64} />
        <Head at={8} parts={["跌了约", { t: "一半", c: K.theme }]} size={96} />
      </Box>
      <Src>戴德梁行 · 深圳甲级写字楼 · 2018 年高点与 2026 年第三季度</Src>
    </AbsoluteFill>
  );
};

// This tower's own rent: 228.51 in 2018, 215 from 2023, fixed for five years.
export const Price: React.FC = () => (
  <AbsoluteFill>
    <Box x={960} y={250} cx style={{ gap: 26 }}>
      <Cap at={0} size={46} color={K.sub}>深圳能源大厦 · 南塔租金（元/㎡/月）</Cap>
      <div style={{ display: "flex", alignItems: "center", gap: 60 }}>
        <In at={0.5} from="scale">
          <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 150, color: K.muted }}>
            <Strike at={2} color={K.theme}>228.51</Strike>
          </div>
        </In>
        <In at={2} from="left">
          <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 70, color: K.muted }}>→</div>
        </In>
        <In at={2.4} from="scale">
          <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 190, color: K.fg }}>215</div>
        </In>
      </div>
      <div style={{ display: "flex", gap: 160, fontFamily: FONT, fontSize: 34, fontWeight: 700, color: K.muted }}>
        <span>2018 年</span>
        <span>2023 年续租</span>
      </div>
      <div style={{ marginTop: 20 }}>
        <Stamp at={4} color={K.theme} size={70} rotate={-5}>五年不涨</Stamp>
      </div>
    </Box>
    <Src>深圳能源关联租赁公告 2018-10-31、2023-06-01 · 租户长城证券 · 2023 年经产权交易所公开招租</Src>
  </AbsoluteFill>
);

// Fair play, on the breakdown: at 2018 rents this was a good deal.
export const Fair: React.FC = () => {
  const frame = useBeatFrame();
  const arrow = progAt(frame, 9, 2, EIO);
  return (
    <AbsoluteFill>
      <Box x={130} y={230} style={{ gap: 22 }}>
        <Cap at={0} size={44} color={K.sub} out={7.5}>说句公道话：</Cap>
        <In at={0.8} out={7.5} from="up">
          <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 64, color: K.fg, whiteSpace: "nowrap", lineHeight: 1.35 }}>
            按 2018 年的租金，
            <br />
            这栋楼约 <span style={{ color: K.green, fontSize: 110 }}>22 年</span>就能回本。
          </div>
        </In>
      </Box>
      <Box x={130} y={300} style={{ gap: 30 }}>
        <Head at={8} parts={["可楼是", { t: "十年前", c: K.theme }, "决定的，"]} size={84} />
        <Head at={10} parts={["租金，", { t: "十年后", c: K.theme }, "才知道。"]} size={84} />
      </Box>
      <div style={{ position: "absolute", left: 140, top: 680, width: 1200 * arrow, height: 4, background: K.theme, opacity: arrow > 0 ? 1 : 0 }} />
      {arrow > 0.02 ? (
        <>
          <Label x={140} y={730} size={34} align="left" color={K.sub}>2008 决定买地</Label>
          <Label x={140 + 1200} y={730} size={34} align="right" color={K.sub} style={{ opacity: arrow }}>2018 开始出租</Label>
        </>
      ) : null}
      <Src at={1}>估算 · 整栋按 2018 年起始租金 228.51 元出租、满租，扣运营成本、大修和各项税，租金不涨</Src>
    </AbsoluteFill>
  );
};

// The one discovery: the payback clock against the land clock.
export const Clocks: React.FC = () => {
  const frame = useBeatFrame();
  const left = progAt(frame, 0, 2.6, EO);
  const range = progAt(frame, 2.6, 1.2, EO);
  const right = progAt(frame, 8, 2.4, EO);
  const showR = frame >= 7.6 * FPB;
  const val = 33 * left + 8 * range;
  const lit = (f: number, c: number) => (random(`clk${f}-${c}`) < 0.75 ? 0.5 : 0);
  const R = 175;
  return (
    <AbsoluteFill>
      <Ground y={1010} />
      <EnergyTower cx={960} ground={1010} s={0.82} progress={1} crane={false} lit={lit} />
      {/* payback clock */}
      <Dial cx={420} cy={470} r={R} value={val} max={50} color={K.red} />
      <Label x={420} y={470} size={100} w={900}>{Math.round(33 * left) || ""}{range > 0.05 ? `–${Math.round(33 + 8 * range)}` : ""}</Label>
      <Label x={420} y={545} size={36} color={K.sub}>年回本</Label>
      <Label x={420} y={225} size={44} w={900} color={K.fg}>回本钟</Label>
      <div style={{ position: "absolute", left: 420, top: 700, transform: "translateX(-50%)", width: 560, textAlign: "center" }}>
        <Cap at={0.5} size={34} color={K.sub} style={{ whiteSpace: "normal" }}>29.36 亿，按今天的租金整栋出租</Cap>
      </div>
      {/* land clock */}
      {showR ? (
        <>
          <Dial cx={1500} cy={470} r={R} value={40 * right} max={50} used={10} color={K.theme} />
          <Label x={1500} y={470} size={100} w={900}>{Math.round(40 * right)}</Label>
          <Label x={1500} y={545} size={36} color={K.sub}>年剩下</Label>
          <Label x={1500} y={225} size={44} w={900} color={K.fg}>土地钟</Label>
          <div style={{ position: "absolute", left: 1500, top: 700, transform: "translateX(-50%)", width: 600, textAlign: "center" }}>
            <Cap at={8.4} size={34} color={K.sub} style={{ whiteSpace: "normal" }}>这块地 50 年，交付时只剩 40 年；到期要重新申请、重新交钱</Cap>
          </div>
        </>
      ) : null}
      <div style={{ position: "absolute", left: 0, right: 0, top: 880, display: "flex", justifyContent: "center" }}>
        <In at={11.8} from="fade">
          <div style={{ background: "rgba(7,9,11,0.85)", padding: "10px 40px", borderRadius: 18 }}>
            <Head at={12} parts={["回本，要用掉这块地", { t: "几乎全部的寿命", c: K.gold }, "。"]} size={68} />
          </div>
        </In>
      </div>
      <Src at={1}>估算 · 福田平均 168 元、出租率 82% → 33 年；全市平均 140 元、75% → 41 年；租金不涨 · 续期：《城市房地产管理法》第二十二条</Src>
    </AbsoluteFill>
  );
};

