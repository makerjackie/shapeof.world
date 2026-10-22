import React from "react";
import { AbsoluteFill } from "remotion";
import { actBar, Subs, track } from "../act";
import { ELEV, Elevation } from "../art/Elevation";
import { Cam, CamKey, camAt, project, Proj } from "../geo/cam";
import { CITY, poi } from "../geo/data";
import { MapView } from "../geo/MapView";
import { TowerColumns } from "../geo/towers";
import { EBACK, EIO, EO, In, progAt } from "../fx";
import { useBeatFrame } from "../kit";
import { FONT, K } from "../theme";
import { FPB } from "../timing";
import { Head, Src } from "../ui";
import { Scrim, Txt } from "./common";

// 图什么 (film bars 51–62): the owner wanted its own headquarters; across the city half the new offices are
// companies building for themselves; and the city never counted on the rent.

// ---------- S23: its own headquarters (51–54) ----------
export const Own: React.FC = () => {
  const f = useBeatFrame();
  const hl = progAt(f, 4, 1, EO);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 1150 - 60, top: 985, width: (ELEV.sW + ELEV.gap + ELEV.nW) * 3.4 + 120, height: 2, background: K.line }} />
      <Elevation x={1150} ground={985} s={3.4} look="dusk" tint={(t, fl) => (t === "N" && fl >= 29 && fl <= 41 ? K.theme : undefined)} tintAmt={hl} />
      <div style={{ position: "absolute", left: 1150 + (ELEV.sW + ELEV.gap + ELEV.nW) * 3.4 + 24, top: 985 - 190 * 3.4, fontFamily: FONT, opacity: hl }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: K.theme }}>北塔 29–41 层</div>
        <div style={{ fontSize: 22, fontWeight: 600, color: K.sub }}>公司自用</div>
      </div>
      <div style={{ position: "absolute", left: 120, top: 200, display: "flex", flexDirection: "column", gap: 18 }}>
        <Head at={0} parts={["那它图什么？"]} size={72} />
        <In at={1.2} from="up">
          <div style={{ fontFamily: FONT, fontSize: 36, fontWeight: 700, color: K.sub, lineHeight: 1.5, borderLeft: `4px solid ${K.theme}`, paddingLeft: 22, marginTop: 10 }}>
            “公司自成立以来，一直没有一栋自己的办公大楼，
            <br />
            公司总部和所属企业分散在各地办公。”
          </div>
        </In>
        <div style={{ marginTop: 30 }}>
          <Head at={4} parts={["这是它", { t: "自己的总部", c: K.theme }, "。"]} size={92} />
        </div>
      </div>
      <Src at={1}>深圳能源 · 关于投资深圳国际能源大厦项目的公告 · 2010；出让条件：六成以上自用、10 年内不得出售</Src>
    </AbsoluteFill>
  );
};

// ---------- S24–S25 on the map (54–62) ----------
const ACT = 54;
const B = (bar: number) => actBar(ACT, bar);
const at = (bar: number, beat = 0) => B(bar) + beat * FPB;

const BELT3D: Cam = { x: -7000, y: -1200, z: 0.05, bearing: 0, tilt: 50, ox: 1400, oy: 700 };
const CBD: Cam = { x: -560, y: 60, z: 0.25, bearing: 0, tilt: 0, ox: 1060, oy: 560 };
const KEYS: CamKey[] = [
  { at: 0, dur: 1, cam: BELT3D },
  { at: at(58), dur: 1.4 * FPB, cam: CBD },
];

// Company-built headquarters as examples (landmarks from data/, heights from CTBUH).
const HQS: { name: string; label: string; dx: number; dy: number }[] = [
  { name: "腾讯滨海大厦", label: "腾讯滨海大厦", dx: -70, dy: -10 },
  { name: "华润大厦(春笋)", label: "华润大厦", dx: -20, dy: -16 },
  { name: "招商银行全球总部大厦", label: "招商银行全球总部", dx: 70, dy: -16 },
  { name: "平安金融中心", label: "平安金融中心", dx: -30, dy: -16 },
  { name: "深圳能源大厦", label: "深圳能源大厦", dx: 70, dy: -10 },
];

const HqColumns: React.FC<{ p: Proj; f: number; o: number }> = ({ p, f, o }) => (
  <g opacity={o}>
    {HQS.map((h, i) => {
      const q = poi(h.name);
      const g = progAt(f, 1 + i * 0.5, 1, EBACK);
      const [x0, y0] = project(p, q.x, q.y, 0);
      const [x1, y1] = project(p, q.x, q.y, (q.h ?? 200) * 10 * g);
      return <line key={h.name} x1={x0} y1={y0} x2={x1} y2={y1} stroke={K.theme} strokeWidth={6} strokeLinecap="round" opacity={g > 0 ? 1 : 0} />;
    })}
  </g>
);

const HqLabels: React.FC<{ p: Proj; f: number; o: number }> = ({ p, f, o }) => (
  <>
    {HQS.map((h, i) => {
      const q = poi(h.name);
      const g = progAt(f, 1 + i * 0.5, 1, EBACK);
      const [x1, y1] = project(p, q.x, q.y, (q.h ?? 200) * 10 * Math.max(0, g));
      return (
        <div key={h.name} style={{ position: "absolute", left: x1 + h.dx, top: y1 + h.dy, transform: "translate(-50%, -100%)", fontFamily: FONT, textAlign: "center", opacity: o * Math.min(1, Math.max(0, g) * 2), whiteSpace: "nowrap", textShadow: "0 0 6px #07090b" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: K.fg }}>{h.label}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: K.sub }}>{q.h} 米</div>
        </div>
      );
    })}
  </>
);

// The CBD's core (approximate outline from OSM road centre lines, without 莲花山) and a year of its rent.
const Ledger: React.FC<{ f: number }> = ({ f }) => {
  const rent = progAt(f - B(58), 1.8, 1.2, EIO);
  const PX = 6.4; // px per 亿
  const base = 900;
  const v = 45;
  return (
    <div style={{ opacity: Math.min(1, rent * 3) }}>
      <div style={{ position: "absolute", left: 1440, top: 400, width: 400, height: 600, borderRadius: 24, background: "rgba(7,9,11,0.86)", border: `1px solid ${K.line}` }} />
      <div style={{ position: "absolute", left: 1555, top: base - v * PX * rent, width: 170, height: v * PX * rent, background: `linear-gradient(180deg, ${K.steel}, ${K.steel}55)`, borderRadius: "8px 8px 0 0" }} />
      <div style={{ position: "absolute", left: 1640, top: base - v * PX * rent - 84, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 64, fontWeight: 900, color: K.fg, whiteSpace: "nowrap" }}>≈45 亿</div>
      <div style={{ position: "absolute", left: 1460, top: base, width: 360, height: 3, background: K.fg, opacity: 0.6 }} />
      <div style={{ position: "absolute", left: 1640, top: base + 16, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 24, fontWeight: 700, color: K.fg, whiteSpace: "pre", textAlign: "center", lineHeight: 1.35 }}>{"福田 CBD 全部甲级写字楼\n一年的租金（估算）"}</div>
    </div>
  );
};

const CbdOutline: React.FC<{ p: Proj; o: number }> = ({ p, o }) => {
  if (o <= 0) return null;
  const r = CITY.cbd;
  let d = "";
  for (let i = 0; i < r.length; i += 2) {
    const [x, y] = project(p, r[i], r[i + 1]);
    d += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return <path d={d + "Z"} fill={K.theme} fillOpacity={0.07 * o} stroke={K.theme} strokeWidth={3} strokeDasharray="14 8" opacity={o} />;
};

const MapStage: React.FC = () => {
  const f = useBeatFrame();
  const cam = camAt(f, KEYS);
  const hq = track(f, [
    [at(57, 3), 1],
    [at(58, 1), 0],
  ]);
  const cbd = track(f, [
    [at(58, 0.5), 0],
    [at(58, 1.5), 1],
  ]);
  return (
    <AbsoluteFill style={{ background: "#0a0e12" }}>
      <MapView
        cam={cam}
        layers={{ prd: 1, sz: 1, metro: 0.3, roads: cbd * 0.8, bldg: cbd, bldgH: 0 }}
        labels={[]}
        under={(p) => <CbdOutline p={p} o={cbd} />}
        over={(p) => (
          <>
            <TowerColumns p={p} year={2026} ex={10} o={0.28 * hq} />
            <HqColumns p={p} f={f} o={hq} />
          </>
        )}
        html={(p) => (
          <>
            <HqLabels p={p} f={f} o={hq} />
            {cbd > 0 ? <Ledger f={f} /> : null}
          </>
        )}
      />
    </AbsoluteFill>
  );
};

const Hqs: React.FC = () => (
  <AbsoluteFill>
    <Scrim w={720} />
    <div style={{ position: "absolute", left: 120, top: 220, display: "flex", flexDirection: "column", gap: 14 }}>
      <Head at={0} parts={["不只它。"]} size={72} />
      <In at={1.4} from="up">
        <Txt size={40}>2025 年深圳新增的甲级写字楼项目，</Txt>
      </In>
      <Head at={2.2} parts={[{ t: "半数以上", c: K.theme }, "为"]} size={72} />
      <Head at={3.2} parts={["企业自建总部大楼。"]} size={72} />
      <In at={5} from="fade">
        <Txt size={26} color={K.muted} style={{ marginTop: 18 }}>地图上是几座企业自建的总部（举例），高度放大 10 倍</Txt>
      </In>
    </div>
    <Src at={1}>仲量联行 · 2025 年深圳房地产市场回顾 · 2026-01-20 · 地图上是几座企业自建的总部（举例），高度：CTBUH</Src>
  </AbsoluteFill>
);

const CityWants: React.FC = () => (
  <AbsoluteFill>
    <Scrim w={760} />
    <div style={{ position: "absolute", left: 120, top: 230, display: "flex", flexDirection: "column", gap: 16 }}>
      <Head at={0} parts={["城市图什么？"]} size={72} />
      <In at={1} from="up">
        <Txt size={34} color={K.sub}>福田中心区（虚线：核心区示意，不含莲花山）</Txt>
      </In>
      <In at={2} from="up">
        <Txt size={34} color={K.sub} style={{ lineHeight: 1.5 }}>
          这一片的甲级写字楼，
          <br />
          一年的租金合计约 45 亿。
        </Txt>
      </In>
      <div style={{ marginTop: 26 }}>
        <Head at={5} parts={["城市等的，从来不是", { t: "租金", c: K.theme }, "。"]} size={72} />
      </div>
    </div>
    <Src at={1}>租金为估算：莱坊 2026Q2 福田 CBD 片区 271.5 万㎡ × 出租率 82% × 168.3 元/㎡/月 × 12 · 中心区轮廓按道路中线勾画，为示意</Src>
  </AbsoluteFill>
);

export const Act4: React.FC = () => (
  <AbsoluteFill>
    <MapStage />
    <Subs
      act={ACT}
      subs={[
        { from: 54, to: 58, C: Hqs },
        { from: 58, to: 62, C: CityWants },
      ]}
    />
  </AbsoluteFill>
);
