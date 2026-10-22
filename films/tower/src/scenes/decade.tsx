import React from "react";
import { AbsoluteFill, interpolate, random } from "remotion";
import { actBar, Subs, track } from "../act";
import { ELEV, Elevation } from "../art/Elevation";
import { TOWERS } from "../art/mansion";
import { CL, EBACK, EIO, EO, In, Odometer, progAt } from "../fx";
import { useBeatFrame } from "../kit";
import { FONT, K } from "../theme";
import { FPB } from "../timing";
import { Head, Src } from "../ui";

// 02 十年 (film bars 24–34): the design, the skin, the ten years and the money, on one standing elevation of the
// tower so the building never leaves the screen.
const ACT = 24;
const B = (bar: number) => actBar(ACT, bar);

const GROUND = 985;
const S = 3.55;
const BX = 1220;

// Construction progress by date. Start 2012 (CTBUH, year only), completion 2017-10-20 (SZAD), the south tower a
// year ahead of the north; the in-between floors are a drawing assumption (示意).
const builtAt = (year: number) => ({
  S: TOWERS.S.floors * interpolate(year, [2012.4, 2016.6], [0, 1], { ...CL, easing: EIO }),
  N: TOWERS.N.floors * interpolate(year, [2012.4, 2017.8], [0, 1], { ...CL, easing: EIO }),
});

const YEAR0 = 2008;
const YEAR1 = 2018.6;
const AX0 = 130;
const AX1 = 1060;
const AY = 860;
const AXX = (y: number) => AX0 + ((y - YEAR0) / (YEAR1 - YEAR0)) * (AX1 - AX0);

const MILESTONES: [number, string, number][] = [
  [2008.3, "拿地", 0],
  [2009.4, "竞赛 · 立项", 1],
  [2010.4, "方案批复", 0],
  [2010.99, "批准投资", 1],
  [2012.4, "开工", 0],
  [2017.8, "竣工", 1],
  [2018.45, "交付", 0],
];

// Construction in progress each year (亿元, excluding land): 深圳能源 2011–2018 annual reports.
const SPEND: [number, number][] = [
  [2011, 0.196],
  [2012, 0.302],
  [2013, 0.761],
  [2014, 1.906],
  [2015, 2.116],
  [2016, 4.142],
  [2017, 4.616],
  [2018, 4.099],
];

const Stage: React.FC = () => {
  const f = useBeatFrame();
  // 0 → plan lines draw; 1 → skin on; then the site is cleared and the tower rises with the calendar.
  const draw = track(f, [
    [0, 0],
    [2.5 * FPB, 1],
  ]);
  const skin = track(f, [
    [B(26) - 4, 0],
    [B(26) + 1.5 * FPB, 1],
  ]);
  const clear = track(f, [
    [B(28) - 6, 0],
    [B(28) + 2, 1],
  ]);
  const year = track(
    f,
    [
      [B(28) + 1 * FPB, 2008],
      [B(28) + 2 * FPB, 2010],
      [B(28) + 9 * FPB, 2017.9],
      [B(28) + 10 * FPB, 2018.6],
    ],
    (t) => t,
  );
  const plan = clear < 1 && skin < 0.5;
  const look = plan ? "plan" : "dusk";
  const growing = clear >= 1;
  const built = growing ? builtAt(year) : { S: TOWERS.S.floors * draw, N: TOWERS.N.floors * draw };
  const dim = growing ? 0 : clear;
  const lit = (_t: string, fl: number, i: number) => (random(`d${fl}-${i}`) < 0.18 ? 0.5 : 0);
  return (
    <>
      {/* ground line and site */}
      <div style={{ position: "absolute", left: BX - 60, top: GROUND, width: (ELEV.sW + ELEV.gap + ELEV.nW) * S + 120, height: 2, background: K.line }} />
      <Elevation x={BX} ground={GROUND} s={S} built={built} look={look} dim={dim} crane={growing && year < 2017.8} lit={look === "dusk" ? lit : undefined} />
    </>
  );
};

// ---------- S13 设计 ----------
const Dim: React.FC<{ x: number; top: number; bottom: number; at: number; label: string; sub: string }> = ({ x, top, bottom, at, label, sub }) => {
  const f = useBeatFrame();
  const p = progAt(f, at, 1, EO);
  return (
    <>
      <div style={{ position: "absolute", left: x, top: bottom - (bottom - top) * p, width: 2, height: (bottom - top) * p, background: K.steel }} />
      <div style={{ position: "absolute", left: x - 8, top, width: 18, height: 2, background: K.steel, opacity: p }} />
      <div style={{ position: "absolute", left: x + 18, top: top - 8, fontFamily: FONT, opacity: p, whiteSpace: "nowrap" }}>
        <div style={{ fontSize: 40, fontWeight: 900, color: K.fg }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: K.sub }}>{sub}</div>
      </div>
    </>
  );
};

const Design: React.FC = () => (
  <AbsoluteFill>
    <div style={{ position: "absolute", left: 130, top: 250, display: "flex", flexDirection: "column", gap: 22 }}>
      <In at={0} from="up">
        <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 700, color: K.sub }}>2009 年，市规划局办国际设计竞赛</div>
      </In>
      <Head at={0.6} parts={["丹麦 ", { t: "BIG", c: K.theme }, " 中标"]} size={84} />
      <In at={2.4} from="up">
        <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 700, color: K.fg, marginTop: 20 }}>两栋塔楼，一个裙楼</div>
      </In>
      <In at={3} from="up">
        <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 700, color: K.fg }}>
          总建筑面积 <span style={{ fontWeight: 900, fontSize: 56 }}>14.25 万㎡</span>
        </div>
      </In>
    </div>
    <Dim x={BX + (ELEV.sW + ELEV.gap + ELEV.nW) * S + 30} top={GROUND - 218 * S} bottom={GROUND} at={1.2} label="北塔 218 米" sub="41 层" />
    <Dim x={BX - 40} top={GROUND - 116 * S} bottom={GROUND} at={1.8} label="" sub="" />
    <div style={{ position: "absolute", left: BX - 330, top: GROUND - 116 * S - 8, width: 270, textAlign: "right", fontFamily: FONT }}>
      <In at={1.8} from="right">
        <div style={{ fontSize: 40, fontWeight: 900, color: K.fg }}>南塔 116 米</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: K.sub }}>19 层</div>
      </In>
    </div>
    <Src>深圳市建筑设计研究总院 · 能源大厦项目页；深圳能源 · 投资深圳国际能源大厦项目公告 · 2010</Src>
  </AbsoluteFill>
);

// ---------- S14 表皮 ----------
// Plan section of the skin: the facade folds in a sawtooth, each glazed face turned 45°.
const Fold: React.FC<{ x: number; y: number; at: number }> = ({ x, y, at }) => {
  const f = useBeatFrame();
  const p = progAt(f, at, 1.4, EO);
  const n = 6;
  const w = 74;
  const pts: string[] = [];
  const glass: React.ReactNode[] = [];
  const arrows: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const ax = x + i * w;
    pts.push(`${ax},${y}`, `${ax + w * 0.5},${y - w * 0.5}`);
    // glazed face: from the peak back down to the next base point, facing north-east at 45°
    glass.push(<line key={i} x1={ax + w * 0.5} y1={y - w * 0.5} x2={ax + w} y2={y} stroke="#8fc6e0" strokeWidth={6} opacity={p} />);
    const mx = ax + w * 0.75;
    const my = y - w * 0.25;
    const L = 64 * p;
    arrows.push(
      <g key={`a${i}`} opacity={progAt(f, at + 1, 0.8, EO)}>
        <line x1={mx} y1={my} x2={mx + L * 0.707} y2={my - L * 0.707} stroke={K.theme} strokeWidth={3} />
        <polygon points={`${mx + L * 0.707},${my - L * 0.707} ${mx + L * 0.707 - 14},${my - L * 0.707 + 2} ${mx + L * 0.707 - 2},${my - L * 0.707 + 14}`} fill={K.theme} />
      </g>,
    );
  }
  pts.push(`${x + n * w},${y}`);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
      <line x1={x} y1={y} x2={x + n * w} y2={y} stroke={K.muted} strokeWidth={2} strokeDasharray="8 8" opacity={p * 0.7} />
      <polyline points={pts.join(" ")} fill="none" stroke={K.fg} strokeWidth={4} opacity={p} />
      {glass}
      {arrows}
    </svg>
  );
};

const Skin: React.FC = () => (
  <AbsoluteFill>
    <div style={{ position: "absolute", left: 130, top: 210, display: "flex", flexDirection: "column", gap: 18 }}>
      <Head at={0} parts={["外墙是一层", { t: "折起来的皮", c: K.theme }]} size={76} />
      <In at={1.6} from="up">
        <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 700, color: K.fg }}>每一折把窗口转 45°，避开北面挡视线的楼</div>
      </In>
      <In at={2.6} from="up">
        <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 700, color: K.fg }}>整面墙看上去像涟漪</div>
      </In>
    </div>
    <Fold x={150} y={700} at={0.8} />
    <div style={{ position: "absolute", left: 150, top: 726, fontFamily: FONT, fontSize: 24, color: K.muted, whiteSpace: "nowrap" }}>
      <In at={1.2} from="fade">平面示意：白线是墙，蓝线是玻璃，橙色是视线</In>
    </div>
    <div style={{ position: "absolute", left: 150, top: 790, display: "flex", gap: 14 }}>
      {["LEED 金级", "国家二星级绿色建筑", "2019 CTBUH 全球最佳高层建筑"].map((t, i) => (
        <In key={t} at={3 + i * 0.3} from="up">
          <div style={{ fontFamily: FONT, fontSize: 26, fontWeight: 700, color: K.sub, padding: "6px 16px", border: `1.5px solid ${K.line}`, borderRadius: 999 }}>{t}</div>
        </In>
      ))}
    </div>
    <Src>深圳市建筑设计研究总院 · 能源大厦项目页</Src>
  </AbsoluteFill>
);

// ---------- S15 十年 ----------
const Decade: React.FC = () => {
  const f = useBeatFrame();
  const axis = progAt(f, 0, 1, EO);
  const year = interpolate(f, [1 * FPB, 2 * FPB, 9 * FPB, 10 * FPB], [2008, 2010, 2017.9, 2018.6], CL);
  const bar = progAt(f, 9.5, 1, EO);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 130, top: 190 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <Odometer value={Math.floor(Math.max(2008, year))} size={150} />
          <span style={{ fontFamily: FONT, fontSize: 48, fontWeight: 900, color: K.sub }}>年</span>
        </div>
      </div>
      {/* the axis */}
      <div style={{ position: "absolute", left: AX0, top: AY, width: (AX1 - AX0) * axis, height: 3, background: K.sub, opacity: 0.6 }} />
      <div style={{ position: "absolute", left: AX0, top: AY - 5, width: (AXX(Math.max(2008, year)) - AX0) * axis, height: 13, background: K.theme, borderRadius: 6 }} />
      {MILESTONES.map(([y, t, up]) => {
        const on = year >= y ? 1 : 0;
        return (
          <div key={t} style={{ position: "absolute", left: AXX(y), top: up ? AY - 86 : AY + 22, transform: "translateX(-50%)", textAlign: "center", fontFamily: FONT, opacity: 0.25 + 0.75 * on }}>
            {up ? null : <div style={{ width: 2, height: 14, background: K.sub, margin: "0 auto 4px" }} />}
            <div style={{ fontSize: 26, fontWeight: 700, color: on ? K.fg : K.muted, whiteSpace: "nowrap" }}>{t}</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: K.muted }}>{Math.floor(y)}</div>
            {up ? <div style={{ width: 2, height: 14, background: K.sub, margin: "4px auto 0" }} /> : null}
          </div>
        );
      })}
      {/* 25 working days vs 10 years 2 months */}
      <div style={{ position: "absolute", left: 130, top: 420, display: "flex", flexDirection: "column", gap: 18, fontFamily: FONT }}>
        <In at={9.4} from="left">
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ width: (AXX(2008.1) - AX0) * bar + 2, height: 34, background: K.green, borderRadius: 4 }} />
            <span style={{ fontSize: 36, fontWeight: 700, color: K.fg }}>
              政府审批时限，加起来 <b style={{ fontSize: 48 }}>25 个工作日</b>
            </span>
          </div>
        </In>
        <In at={10} from="left">
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ width: (AX1 - AX0 - 380) * bar, height: 34, background: K.theme, borderRadius: 4 }} />
            <span style={{ fontSize: 36, fontWeight: 700, color: K.fg }}>
              拿地到交付 <b style={{ fontSize: 56, color: K.theme }}>10 年零 2 个月</b>
            </span>
          </div>
        </In>
      </div>
      <Src at={1}>深圳能源公告、年报 2008–2018；深圳市政府令第 329 号（2020）；开工年份：CTBUH · 楼层逐年长高为示意</Src>
    </AbsoluteFill>
  );
};

// ---------- S16 钱 ----------
const Money: React.FC = () => {
  const f = useBeatFrame();
  const maxH = 230;
  const split = progAt(f, 6.5, 1.2, EIO);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 130, top: 170, display: "flex", flexDirection: "column", gap: 10 }}>
        <Head at={0} parts={["钱，也是一年年花出去的"]} size={64} />
        <In at={2.6} from="up">
          <div style={{ fontFamily: FONT, fontSize: 38, fontWeight: 700, color: K.sub }}>
            前三年 <b style={{ color: K.fg }}>1.26 亿</b>，最后三年 <b style={{ color: K.theme, fontSize: 48 }}>12.86 亿</b>
          </div>
        </In>
      </div>
      {SPEND.map(([y, v], i) => {
        const p = progAt(f, 0.6 + i * 0.25, 0.9, EBACK);
        const h = (v / 4.616) * maxH * p;
        const x = AXX(y + 0.5);
        return (
          <div key={y}>
            <div style={{ position: "absolute", left: x - 34, top: AY - h, width: 68, height: h, background: i >= 5 ? K.theme : K.steel, opacity: 0.9, borderRadius: "6px 6px 0 0" }} />
            <div style={{ position: "absolute", left: x, top: AY - h - 40, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 26, fontWeight: 800, color: K.fg, opacity: p, whiteSpace: "nowrap" }}>
              {v.toFixed(v < 1 ? 2 : 1)}
            </div>
          </div>
        );
      })}
      {/* budget split: land vs building */}
      <div style={{ position: "absolute", left: 130, top: 330, width: 930, fontFamily: FONT, opacity: progAt(f, 6, 0.6, EO) }}>
        <div style={{ fontSize: 34, fontWeight: 700, color: K.sub, marginBottom: 10 }}>
          预算 <b style={{ color: K.fg, fontSize: 48 }}>29.36 亿</b>
        </div>
        <div style={{ position: "relative", height: 56, display: "flex", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ width: `${22.8 * split + (1 - split) * 0}%`, background: K.green, display: "flex", alignItems: "center", paddingLeft: split > 0.5 ? 14 : 0, fontSize: 28, fontWeight: 900, color: K.bg, whiteSpace: "nowrap" }}>
            地 6.7 亿
          </div>
          <div style={{ flex: 1, background: K.theme, display: "flex", alignItems: "center", paddingLeft: 14, fontSize: 28, fontWeight: 900, color: K.bg, whiteSpace: "nowrap" }}>楼 22.66 亿</div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 130, top: 470 }}>
        <Head at={8} parts={["地只占", { t: "不到四分之一", c: K.green }]} size={64} />
      </div>
      <Src at={1}>深圳能源 2011–2018 年报 · 在建工程每年增加额，单位亿元，不含地价；预算 2,935,596,300 元</Src>
    </AbsoluteFill>
  );
};

export const Act2: React.FC = () => (
  <AbsoluteFill>
    <Stage />
    <Subs
      act={ACT}
      subs={[
        { from: 24, to: 26, C: Design },
        { from: 26, to: 28, C: Skin },
        { from: 28, to: 31, C: Decade },
        { from: 31, to: 34, C: Money },
      ]}
    />
  </AbsoluteFill>
);
