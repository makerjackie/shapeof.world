import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { actBar, Subs, track } from "../act";
import { ELEV, Elevation } from "../art/Elevation";
import { Cam, CamKey, camAt, project, Proj } from "../geo/cam";
import { poi } from "../geo/data";
import { MapView } from "../geo/MapView";
import { skylineAt, TowerColumns } from "../geo/towers";
import { CL, EBACK, EIO, EO, In, Odometer, progAt } from "../fx";
import { Stamp, Strike, useBeatFrame } from "../kit";
import { FONT, K } from "../theme";
import { FPB } from "../timing";
import { Head, Src } from "../ui";
import { Scrim, Txt } from "./common";
import { AxisYears, X, Y_AXIS } from "./finding";

// 03 等人来 (film bars 34–46): while it was being built, the whole city was building; a quarter of the offices
// stand empty; rents halved; this tower's rent fell too; and, fairly, at 2018 rents it would have paid back.
const ACT = 34;
const B = (bar: number) => actBar(ACT, bar);
const at = (bar: number, beat = 0) => B(bar) + beat * FPB;

const HERO = poi("深圳能源大厦");

// The office belt from 宝安中心区 to 罗湖.
const BELT3D: Cam = { x: -6600, y: -1600, z: 0.046, bearing: 0, tilt: 46, ox: 1300, oy: 640 };
const BELT: Cam = { x: -6600, y: -1900, z: 0.04, bearing: 0, tilt: 0, ox: 1320, oy: 600 };
const KEYS: CamKey[] = [
  { at: 0, dur: 1, cam: BELT3D },
  { at: at(37), dur: 1.2 * FPB, cam: BELT },
];

// Knight Frank, Shenzhen Grade A office, 2026 Q2: vacancy and stock (thousand m²) by submarket. The anchors are
// a metro station inside each submarket (data/landmarks.geojson), not boundaries.
type Sub = { name: string; anchor: string; vac: number; stock: number; dx: number; dy: number };
const SUBS: Sub[] = [
  { name: "福田 CBD", anchor: "福田中心区", vac: 18.0, stock: 2715, dx: 10, dy: -70 },
  { name: "车公庙", anchor: "车公庙", vac: 20.4, stock: 602, dx: -10, dy: -60 },
  { name: "罗湖", anchor: "罗湖", vac: 27.9, stock: 1191, dx: 20, dy: -66 },
  { name: "科技园", anchor: "科技园", vac: 13.8, stock: 1901, dx: -20, dy: -78 },
  { name: "后海", anchor: "后海", vac: 33.1, stock: 1538, dx: 30, dy: 64 },
  { name: "前海", anchor: "前海", vac: 25.5, stock: 2011, dx: -20, dy: 74 },
  { name: "蛇口", anchor: "蛇口", vac: 23.3, stock: 250, dx: 10, dy: 50 },
  { name: "宝安中心区", anchor: "宝安中心区", vac: 27.9, stock: 492, dx: 0, dy: -60 },
];
const vacColor = (v: number) => {
  const t = Math.max(0, Math.min(1, (v - 12) / 22));
  const mix = (a: number, b: number) => Math.round(a + (b - a) * t);
  // steel → semantic red: more red = more empty
  return `rgb(${mix(127, 255)},${mix(155, 90)},${mix(191, 95)})`;
};

const Bubbles: React.FC<{ p: Proj; f: number }> = ({ p, f }) => (
  <>
    {SUBS.map((s, i) => {
      const a = poi(s.anchor);
      const [x, y] = project(p, a.x, a.y);
      const q = progAt(f - B(37), 0.8 + i * 0.4, 0.8, EBACK);
      if (q <= 0) return null;
      const r = (10 + Math.sqrt(s.stock) * 0.75) * q;
      const c = vacColor(s.vac);
      return (
        <div key={s.name}>
          <div style={{ position: "absolute", left: x - r, top: y - r, width: 2 * r, height: 2 * r, borderRadius: "50%", background: c, opacity: 0.32, border: `2.5px solid ${c}` }} />
          <div style={{ position: "absolute", left: x + s.dx, top: y + s.dy, transform: "translate(-50%, -50%)", fontFamily: FONT, whiteSpace: "nowrap", textAlign: "center", opacity: Math.min(1, q * 1.5), textShadow: "0 0 6px #07090b" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: K.sub }}>{s.name}</div>
            <div style={{ fontSize: 34, fontWeight: 900, color: c }}>{s.vac.toFixed(1)}%</div>
          </div>
        </div>
      );
    })}
  </>
);

const MapStage: React.FC = () => {
  const f = useBeatFrame();
  const cam = camAt(f, KEYS);
  const year = interpolate(f, [at(34, 0.5), at(36, 3)], [2004, 2026.99], { ...CL, easing: (t) => t });
  const towersO = track(f, [
    [at(37), 1],
    [at(37, 1), 0.22],
  ]);
  const near = (t: [number, number, number, number]) => Math.hypot(t[0] - HERO.x, t[1] - HERO.y) < 120;
  return (
    <AbsoluteFill style={{ background: "#0a0e12" }}>
      <MapView
        cam={cam}
        layers={{ prd: 1, sz: 1, metro: 0.35 }}
        labels={[]}
        over={(p) => <TowerColumns p={p} year={year} ex={10} hi={(t) => (near(t) && year >= 2018 ? K.theme : undefined)} o={towersO} />}
        html={(p) => <Bubbles p={p} f={f} />}
      />
    </AbsoluteFill>
  );
};

const Skyline: React.FC = () => {
  const f = useBeatFrame();
  const year = interpolate(f, [0.5 * FPB, 11 * FPB], [2004, 2026.99], CL);
  const [, c200] = skylineAt(year);
  return (
    <AbsoluteFill>
      <Scrim w={760} />
      <div style={{ position: "absolute", left: 120, top: 200, display: "flex", flexDirection: "column", gap: 10 }}>
        <In at={0} from="up">
          <Txt size={40} color={K.sub}>2018 年，它盖好了。可同一时间——</Txt>
        </In>
        <Head at={0.8} parts={["全城", { t: "都在盖", c: K.theme }, "。"]} size={84} />
        <div style={{ marginTop: 30, display: "flex", alignItems: "baseline", gap: 16 }}>
          <Odometer value={Math.floor(year)} size={64} sep={false} color={K.sub} />
          <Txt size={30} color={K.sub}>年</Txt>
        </div>
        <Txt size={36}>深圳 200 米以上的楼</Txt>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <Odometer value={c200} size={150} color={K.lit} />
          <Txt size={44} color={K.sub}>栋</Txt>
        </div>
      </div>
      <Src at={1}>CTBUH Skyscraper Center · 2026 · 已建成的 150 米以上塔楼，按竣工年份立起 · 高度放大 10 倍示意</Src>
    </AbsoluteFill>
  );
};

const Window: React.FC<{ dark: boolean; at: number }> = ({ dark, at: a }) => {
  const f = useBeatFrame();
  const off = dark ? progAt(f, a, 0.4, EO) : 0;
  return <div style={{ width: 54, height: 70, borderRadius: 4, background: off > 0.5 ? "#1b2430" : K.lit, opacity: off > 0.5 ? 1 : 0.85, border: `2px solid ${off > 0.5 ? K.red : "transparent"}` }} />;
};

const Vacancy: React.FC = () => (
  <AbsoluteFill>
    <Scrim w={700} />
    <div style={{ position: "absolute", left: 120, top: 210, display: "flex", flexDirection: "column", gap: 12 }}>
      <In at={0} from="up">
        <Txt size={40} color={K.sub}>深圳的甲级写字楼</Txt>
      </In>
      <div style={{ display: "flex", gap: 14, marginTop: 10 }}>
        <In at={0.3} from="up">
          <div style={{ display: "flex", gap: 14 }}>
            <Window dark={false} at={0} />
            <Window dark={false} at={0} />
            <Window dark at={4.4} />
            <Window dark={false} at={0} />
          </div>
        </In>
      </div>
      <Head at={4.6} parts={["约", { t: "每 4 间，空 1 间", c: K.red }]} size={76} />
      <In at={5.6} from="up">
        <Txt size={30} color={K.sub}>2026 年三季度，四家机构：</Txt>
        <Txt size={30} color={K.sub}>空置率 23.6%–28.7%</Txt>
      </In>
      <In at={6.2} from="up">
        <Txt size={26} color={K.muted} style={{ marginTop: 20 }}>圆越大，存量越大；越红，空得越多</Txt>
      </In>
    </div>
    <Src at={1}>莱坊 2026Q2（分片区）；高力、仲量联行、戴德梁行、第一太平戴维斯 2026Q3 · 圆心取片区内一个地铁站，不是片区边界</Src>
  </AbsoluteFill>
);

export const Act3: React.FC = () => (
  <AbsoluteFill>
    <MapStage />
    <Subs
      act={ACT}
      subs={[
        { from: 34, to: 37, C: Skyline },
        { from: 37, to: 40, C: Vacancy },
      ]}
    />
  </AbsoluteFill>
);

// ---------- rents halved (bars 40–42, the interlude) ----------
// 戴德梁行 average Grade A rent, 元/㎡/月. No yearly figures between end-2018 and mid-2025 were collected: that
// stretch is drawn dashed.
const RENT: [number, number][] = [
  [2016.99, 247.68],
  [2018.99, 276.6],
  [2025.5, 160.1],
  [2025.99, 149.4],
  [2026.5, 144.2],
  [2026.75, 142.2],
];
const CX0 = 820;
const CX1 = 1760;
const CY0 = 860;
const CY1 = 300;
const cx = (y: number) => CX0 + ((y - 2016) / (2027.5 - 2016)) * (CX1 - CX0);
const cy = (v: number) => CY0 - (v / 300) * (CY0 - CY1);

export const Rent: React.FC = () => {
  const f = useBeatFrame();
  const draw = progAt(f, 0.4, 2.4, EIO);
  const pts = RENT.map(([y, v]) => [cx(y), cy(v)] as [number, number]);
  const total = pts.length - 1;
  const upto = draw * total;
  const seg = (i: number) => {
    const t = Math.max(0, Math.min(1, upto - i));
    if (t <= 0) return null;
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    return <line key={i} x1={ax} y1={ay} x2={ax + (bx - ax) * t} y2={ay + (by - ay) * t} stroke={K.theme} strokeWidth={5} strokeDasharray={i === 1 ? "12 10" : undefined} strokeLinecap="round" />;
  };
  const drop = progAt(f, 3, 0.8, EO);
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        {[0, 100, 200, 300].map((v) => (
          <g key={v}>
            <line x1={CX0} y1={cy(v)} x2={CX1} y2={cy(v)} stroke="rgba(244,240,232,0.10)" strokeWidth={1.5} />
          </g>
        ))}
        {pts.slice(0, -1).map((_, i) => seg(i))}
        {pts.map(([x, y], i) => (i <= upto + 0.01 ? <circle key={i} cx={x} cy={y} r={i === 1 || i === total ? 9 : 5} fill={i === total && drop > 0 ? K.red : K.theme} /> : null))}
        <line x1={cx(2018.99)} y1={cy(276.6)} x2={cx(2018.99)} y2={cy(142.2)} stroke={K.red} strokeWidth={3} strokeDasharray="6 6" opacity={drop} />
        <line x1={cx(2018.99) - 14} y1={cy(142.2)} x2={cx(2026.75)} y2={cy(142.2)} stroke={K.red} strokeWidth={2} strokeDasharray="6 6" opacity={drop * 0.7} />
      </svg>
      {[0, 100, 200, 300].map((v) => (
        <div key={v} style={{ position: "absolute", left: CX0 - 70, top: cy(v) - 14, width: 56, textAlign: "right", fontFamily: FONT, fontSize: 22, color: K.muted }}>
          {v}
        </div>
      ))}
      {[2016, 2018, 2020, 2022, 2024, 2026].map((y) => (
        <div key={y} style={{ position: "absolute", left: cx(y), top: CY0 + 14, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 22, color: K.muted }}>
          {y}
        </div>
      ))}
      <div style={{ position: "absolute", left: cx(2018.99) - 40, top: cy(276.6) - 70, fontFamily: FONT, fontSize: 40, fontWeight: 900, color: K.fg, opacity: draw > 0.25 ? 1 : 0 }}>276.6</div>
      <div style={{ position: "absolute", left: cx(2026.75) - 60, top: cy(142.2) + 18, fontFamily: FONT, fontSize: 40, fontWeight: 900, color: K.red, opacity: drop }}>142.2</div>
      <div style={{ position: "absolute", left: 120, top: 230, display: "flex", flexDirection: "column", gap: 12 }}>
        <In at={0} from="up">
          <Txt size={40} color={K.sub}>平均租金（元/㎡/月）</Txt>
        </In>
        <Head at={3.2} parts={["跌了约", { t: "一半", c: K.red }]} size={96} />
        <In at={4.2} from="up">
          <Txt size={32} color={K.sub}>回到了 2011 年前后的水平</Txt>
        </In>
      </div>
      <Src at={0.6}>戴德梁行 · 深圳甲级写字楼 · 2016 年末至 2026 年三季度 · 2019–2024 年未取数，虚线连接</Src>
    </AbsoluteFill>
  );
};

// ---------- this tower's rent (bars 42–44) ----------
export const OwnRent: React.FC = () => {
  const f = useBeatFrame();
  const hl = progAt(f, 0.4, 0.8, EO);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 1150 - 60, top: 985, width: (ELEV.sW + ELEV.gap + ELEV.nW) * 3.4 + 120, height: 2, background: K.line }} />
      <Elevation x={1150} ground={985} s={3.4} look="dusk" tint={(t, fl) => (t === "S" && fl >= 10 && fl <= 19 ? K.theme : undefined)} tintAmt={hl} />
      <div style={{ position: "absolute", left: 1150 - 30, top: 985 - 76 * 3.4, transform: "translateX(-100%)", fontFamily: FONT, textAlign: "right", opacity: hl }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: K.theme }}>南塔 10–19 层</div>
        <div style={{ fontSize: 22, fontWeight: 600, color: K.sub }}>租给长城证券</div>
      </div>
      <div style={{ position: "absolute", left: 120, top: 220, display: "flex", flexDirection: "column", gap: 18 }}>
        <Head at={0} parts={["这栋楼，也降了"]} size={72} />
        <div style={{ display: "flex", alignItems: "center", gap: 40, marginTop: 30 }}>
          <In at={1} from="scale">
            <div style={{ fontFamily: FONT, textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: K.sub }}>2018 年起租</div>
              <div style={{ fontSize: 120, fontWeight: 900, color: K.muted }}>
                <Strike at={2.4} color={K.red}>228.51</Strike>
              </div>
            </div>
          </In>
          <In at={2.4} from="left">
            <div style={{ fontFamily: FONT, fontSize: 64, fontWeight: 900, color: K.muted }}>→</div>
          </In>
          <In at={2.6} from="scale">
            <div style={{ fontFamily: FONT, textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: K.sub }}>2023 年续租</div>
              <div style={{ fontSize: 150, fontWeight: 900, color: K.fg }}>215</div>
            </div>
          </In>
        </div>
        <div style={{ marginTop: 20 }}>
          <Stamp at={4} color={K.red} size={64} rotate={-5}>
            五年不涨
          </Stamp>
        </div>
      </div>
      <Src at={1}>深圳能源 · 关联租赁公告 · 2018-10-31、2023-06-01 · 元/㎡/月，含税 · 2023 年经产权交易所公开招租</Src>
    </AbsoluteFill>
  );
};

// ---------- fair play (bars 44–46): the same year axis the discovery uses ----------
export const Fair: React.FC = () => {
  const f = useBeatFrame();
  const bar = progAt(f, 1.2, 1.6, EIO);
  const yrs = interpolate(bar, [0, 1], [0, 22]);
  return (
    <AbsoluteFill>
      <AxisYears o={progAt(f, 0, 0.8, EO)} />
      <div style={{ position: "absolute", left: X(2018.45), top: 600 - 20, width: (X(2040.45) - X(2018.45)) * bar, height: 40, background: K.green, borderRadius: 6 }} />
      <div style={{ position: "absolute", left: X(2018.45) + (X(2040.45) - X(2018.45)) * bar + 18, top: 600 - 32, display: "flex", alignItems: "baseline", gap: 8, opacity: bar > 0 ? 1 : 0 }}>
        <Odometer value={yrs} size={52} color={K.green} />
        <span style={{ fontFamily: FONT, fontSize: 28, fontWeight: 700, color: K.sub }}>年 → {Math.round(2018 + yrs)}</span>
      </div>
      <div style={{ position: "absolute", left: X(2018.45) - 20, top: 600 - 18, transform: "translateX(-100%)", fontFamily: FONT, fontSize: 26, fontWeight: 700, color: K.sub, opacity: bar > 0 ? 1 : 0, whiteSpace: "nowrap" }}>
        按 2018 年的租金
      </div>
      <div style={{ position: "absolute", left: X(2018.45) - 1, top: 500, width: 2, height: Y_AXIS - 500, background: K.fg, opacity: 0.5 * bar }} />
      <div style={{ position: "absolute", left: 150, top: 150, display: "flex", flexDirection: "column", gap: 16 }}>
        <In at={0} from="up">
          <Txt size={40} color={K.sub}>说句公道话：</Txt>
        </In>
        <Head at={0.3} parts={["按 2018 年的租金整栋出租，约 ", { t: "22 年", c: K.green }, "就能回本。"]} size={58} />
        <In at={2.8} from="up">
          <Txt size={44} style={{ marginTop: 14 }}>
            可楼是十年前定的，租金<b style={{ color: K.theme }}>十年后</b>才知道。
          </Txt>
        </In>
      </div>
      <Src at={1}>估算 · 起始租金 228.51 元，整栋满租，扣运营成本、大修和各项税 · 静态，租金不涨</Src>
    </AbsoluteFill>
  );
};

