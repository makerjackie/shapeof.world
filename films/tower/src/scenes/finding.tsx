import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { CL, EBACK, EIO, EO, In, Odometer, progAt } from "../fx";
import { useBeatFrame } from "../kit";
import { FONT, K } from "../theme";
import { FPB } from "../timing";
import { Head, Src } from "../ui";

// The one discovery, on the track's biggest re-entry: one year axis, the land's 50 years on top, the payback
// below. Delivered in 2018 with 40 years left; at today's rents the money comes back in 2051 or 2059, and the
// second one runs past the end of the land.
const Y0 = 2006;
const Y1 = 2064;
const X0 = 150;
const X1 = 1770;
export const X = (y: number) => X0 + ((y - Y0) / (Y1 - Y0)) * (X1 - X0);
export const Y_AXIS = 800;
const YEARS = [2008, 2018, 2028, 2038, 2048, 2058];

// The year axis shared with the fair-play screen just before, so the cut between them keeps every mark in place.
export const AxisYears: React.FC<{ o: number }> = ({ o }) => (
  <>
    <div style={{ position: "absolute", left: X0, top: Y_AXIS, width: (X1 - X0) * o, height: 2, background: K.line }} />
    {YEARS.map((y) => (
      <div key={y} style={{ position: "absolute", left: X(y), top: Y_AXIS + 14, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 24, fontWeight: 700, color: K.muted, opacity: o, fontVariantNumeric: "tabular-nums" }}>
        {y}
      </div>
    ))}
  </>
);

const LAND_FROM = 2008.3; // contract signed 2008-04-23
const LAND_TO = 2058.3;
const DELIVERED = 2018.45; // first tenants, June 2018

const Bar: React.FC<{ y: number; from: number; to: number; p: number; color: string; h?: number; o?: number }> = ({ y, from, to, p, color, h = 46, o = 1 }) => {
  const w = (X(to) - X(from)) * p;
  return <div style={{ position: "absolute", left: X(from), top: y - h / 2, width: Math.max(0, w), height: h, background: color, borderRadius: 6, opacity: o }} />;
};

const Tick: React.FC<{ x: number; top: number; bottom: number; color: string; o: number; dash?: boolean; w?: number }> = ({ x, top, bottom, color, o, dash, w = 2 }) => (
  <div style={{ position: "absolute", left: x - w / 2, top, width: w, height: bottom - top, background: dash ? `repeating-linear-gradient(180deg, ${color} 0 10px, transparent 10px 18px)` : color, opacity: o }} />
);

const Txt: React.FC<{ x: number; y: number; size?: number; color?: string; w?: number; align?: "left" | "right" | "center"; o?: number; children: React.ReactNode }> = ({
  x,
  y,
  size = 30,
  color = K.fg,
  w = 700,
  align = "left",
  o = 1,
  children,
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      transform: align === "right" ? "translateX(-100%)" : align === "center" ? "translateX(-50%)" : undefined,
      fontFamily: FONT,
      fontSize: size,
      fontWeight: w,
      color,
      whiteSpace: "nowrap",
      opacity: o,
      fontVariantNumeric: "tabular-nums",
    }}
  >
    {children}
  </div>
);

export const Finding: React.FC = () => {
  const f = useBeatFrame();
  const land = progAt(f, 0, 1.6, EIO);
  const cut = progAt(f, 2, 1, EO);
  const pay1 = progAt(f, 4.5, 2.2, EIO);
  const pay2 = progAt(f, 5, 2.8, EIO);
  const over = progAt(f, 7.8, 0.6, EBACK);
  const end = progAt(f, 1.4, 0.8, EO);
  const yearsLeft = interpolate(f, [2 * FPB, 3.2 * FPB], [50, 40], { ...CL, easing: EO });
  const y33 = interpolate(pay1, [0, 1], [0, 33]);
  const y41 = interpolate(pay2, [0, 1], [0, 41]);

  const LAND_Y = 430;
  const P1_Y = 610;
  const P2_Y = 700;
  return (
    <AbsoluteFill>
      <AxisYears o={1} />
      {/* land */}
      <Txt x={X0} y={LAND_Y - 74} size={30} color={K.sub} o={land}>
        这块地 · 50 年
      </Txt>
      <Bar y={LAND_Y} from={LAND_FROM} to={LAND_TO} p={land} color={K.steel} o={0.35} />
      <Bar y={LAND_Y} from={DELIVERED} to={LAND_TO} p={land * cut} color={K.steel} o={0.95} />
      <Txt x={X(LAND_FROM) + 14} y={LAND_Y - 18} size={26} color={K.fg} w={700} o={cut}>
        盖楼 10 年
      </Txt>
      <Txt x={X((DELIVERED + LAND_TO) / 2)} y={LAND_Y - 26} size={40} color={K.bg} w={900} align="center" o={cut}>
        只剩 {yearsLeft.toFixed(0)} 年
      </Txt>
      <Tick x={X(DELIVERED)} top={LAND_Y - 60} bottom={800} color={K.fg} o={cut * 0.7} />
      <Txt x={X(DELIVERED)} y={LAND_Y - 98} size={26} color={K.fg} align="center" o={cut}>
        2018 交付
      </Txt>
      <Tick x={X(LAND_TO)} top={LAND_Y - 60} bottom={800} color={K.red} o={end * 0.9} dash />
      <Txt x={X(LAND_TO)} y={LAND_Y - 98} size={26} color={K.red} align="center" o={end}>
        2058 到期
      </Txt>
      {/* payback */}
      <Txt x={X0} y={P1_Y - 64} size={30} color={K.sub} o={progAt(f, 4, 0.6, EO)}>
        回本 · 按今天的租金整栋出租
      </Txt>
      <Bar y={P1_Y} from={DELIVERED} to={DELIVERED + 33} p={pay1} color={K.theme} h={40} />
      <Bar y={P2_Y} from={DELIVERED} to={DELIVERED + 41} p={pay2} color={K.theme} h={40} o={0.85} />
      {over > 0 ? <Bar y={P2_Y} from={LAND_TO} to={DELIVERED + 41} p={1} color={K.red} h={40 + 10 * (1 - over)} o={over} /> : null}
      <Txt x={X(DELIVERED) - 20} y={P1_Y - 22} size={26} color={K.sub} align="right" o={pay1 > 0 ? 1 : 0}>
        福田平均
      </Txt>
      <Txt x={X(DELIVERED) - 20} y={P2_Y - 22} size={26} color={K.sub} align="right" o={pay2 > 0 ? 1 : 0}>
        全市平均
      </Txt>
      <div style={{ position: "absolute", left: X(DELIVERED + 33 * pay1) + 18, top: P1_Y - 32, display: "flex", alignItems: "baseline", gap: 8, opacity: pay1 > 0 ? 1 : 0 }}>
        <Odometer value={y33} size={52} />
        <span style={{ fontFamily: FONT, fontSize: 28, fontWeight: 700, color: K.sub }}>年 → {Math.round(2018 + y33)}</span>
      </div>
      <div style={{ position: "absolute", left: X(DELIVERED + 41 * pay2) + 18, top: P2_Y - 32, display: "flex", alignItems: "baseline", gap: 8, opacity: pay2 > 0 ? 1 : 0 }}>
        <Odometer value={y41} size={52} color={over > 0.5 ? K.red : K.fg} />
        <span style={{ fontFamily: FONT, fontSize: 28, fontWeight: 700, color: over > 0.5 ? K.red : K.sub }}>年 → {Math.round(2018 + y41)}</span>
      </div>
      <Txt x={X(LAND_TO) + 14} y={P2_Y + 30} size={26} color={K.red} o={over}>
        地已经到期
      </Txt>
      {/* headline */}
      <div style={{ position: "absolute", left: X0, top: 130, display: "flex", flexDirection: "column", gap: 14 }}>
        <Head at={0.3} parts={["这块地 50 年，交付时", { t: "只剩 40 年", c: K.steel }, "。"]} size={56} />
        <Head at={4.5} parts={["按今天的租金，回本要 ", { t: "33–41 年", c: K.theme }, "。"]} size={56} />
      </div>
      <div style={{ position: "absolute", left: X0, top: 900 }}>
        <Head at={10} parts={["回本，要用掉这块地", { t: "几乎全部的寿命", c: K.gold }, "。"]} size={72} />
      </div>
      <Src at={4}>估算 · 福田 CBD 平均 168 元、出租率 82% → 33 年；全市平均 140 元、75% → 41 年；租金不涨 · 到期须申请续期、重交出让金（《城市房地产管理法》第二十二条）</Src>
    </AbsoluteFill>
  );
};
