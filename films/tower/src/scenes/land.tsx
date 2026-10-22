import React from "react";
import { AbsoluteFill, interpolate, random } from "remotion";
import { actBar, Subs, track } from "../act";
import { Cam, CamKey, camAt, project, Proj } from "../geo/cam";
import { CITY, ll, poi, WORLD } from "../geo/data";
import { Label, MapView } from "../geo/MapView";
import { CL, EBACK, EIO, EO, In, Odometer, progAt, Shockwave } from "../fx";
import { Stamp, useBeatFrame } from "../kit";
import { FONT, K } from "../theme";
import { FPB } from "../timing";
import { Head, Src } from "../ui";
import { Scrim, Txt } from "./common";

// Opening and 01 一块地 (film bars 0–24): one continuous camera over the real city. Futian at night → 粤海 (the
// hook) → the delta (title) → Shenzhen and its land → the CBD → parcel B119-0053 → back to 粤海 for the answer.
const ACT = 0;
const B = (bar: number) => actBar(ACT, bar);
const at = (bar: number, beat = 0) => B(bar) + beat * FPB;

// Places, local metres (src/geo/data.ts).
const HERO = { x: -129, y: -808 };
const CIVIC = { x: -566, y: 696 };
const EXPO = { x: -548, y: -702 };
const PINGAN = { x: -995, y: -369 };
const YUEHAI = poi("K602-0016"); // 南山粤海 K602-0016, estimated from its road corner (~100 m)

// ---------- camera ----------
const NIGHT: Cam = { x: -420, y: -470, z: 0.8, bearing: 18, tilt: 66, oy: 810 };
const NANSHAN: Cam = { x: -12500, y: 1500, z: 0.034, bearing: 0, tilt: 0, ox: 1180 };
const SZ_WIDE: Cam = { x: 9000, y: 9000, z: 0.0165, bearing: 0, tilt: 0, ox: 1080 };
const DELTA: Cam = { x: -6000, y: 26000, z: 0.0062, bearing: 0, tilt: 0 };
const SZ: Cam = { x: 12500, y: 10200, z: 0.0152, bearing: 0, tilt: 0, ox: 1300, oy: 560 };
const SZ_DOTS: Cam = { ...SZ, ox: 820 };
const CBD_FLAT: Cam = { x: -420, y: 120, z: 0.36, bearing: 0, tilt: 0, ox: 1240 };
const CBD_3D: Cam = { x: -470, y: -60, z: 0.5, bearing: -18, tilt: 52, ox: 1220, oy: 600 };
const PARCEL: Cam = { x: HERO.x, y: HERO.y + 10, z: 3.3, bearing: -38, tilt: 50, ox: 1250, oy: 640 };
const PARCEL_UP: Cam = { ...PARCEL, z: 2.2, oy: 760 };

const KEYS: CamKey[] = [
  { at: 0, dur: 1, cam: NIGHT },
  { at: at(2), dur: 1.1 * FPB, cam: NANSHAN },
  { at: at(4), dur: 1.4 * FPB, cam: SZ_WIDE },
  { at: at(6), dur: 1.2 * FPB, cam: DELTA },
  { at: at(8), dur: 1.4 * FPB, cam: SZ },
  { at: at(10, 1.5), dur: 1.5 * FPB, cam: SZ_DOTS },
  { at: at(14), dur: 1.6 * FPB, cam: CBD_FLAT },
  { at: at(15), dur: 2 * FPB, cam: CBD_3D },
  { at: at(16), dur: 1.6 * FPB, cam: PARCEL },
  { at: at(18, 2), dur: 2 * FPB, cam: PARCEL_UP },
  { at: at(20), dur: 1.8 * FPB, cam: NANSHAN },
  { at: at(22), dur: 1.6 * FPB, cam: SZ },
];

// ---------- 1 dot = 1 km² ----------
// Grid points inside the land polygons, trimmed to exactly 1,997 (the city's area in km²).
const pip = (x: number, y: number, r: number[]) => {
  let c = false;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
    const xi = r[i];
    const yi = r[i + 1];
    const xj = r[j];
    const yj = r[j + 1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const DOTS = (() => {
  const out: { x: number; y: number }[] = [];
  const step = 980;
  for (let x = -33000; x < 58500; x += step)
    for (let y = -16000; y < 36500; y += step)
      if (WORLD.sz.some((d) => d.bbox[0] <= x && x <= d.bbox[2] && d.bbox[1] <= y && y <= d.bbox[3] && d.rings.some((r) => pip(x, y, r)))) out.push({ x, y });
  // Shuffled: a dot's cell in the ledger has nothing to do with where it sat on the map.
  const keep = out.map((p, i) => ({ p, k: random(`dot${i}`) })).sort((a, b) => a.k - b.k);
  const pts = keep.slice(0, 1997).map((q) => q.p);
  while (pts.length < 1997) pts.push(out[pts.length % out.length]);
  return pts;
})();
const ECO = 974.5; // km² inside 基本生态控制线 when it was drawn in 2005 (深圳政府在线 2023; research/06 §4.1)
const COLS = 50;
const CELL = 13;
const WAF = { x: 1120, y: 250 };
const cellOf = (i: number) => ({ x: WAF.x + (i % COLS) * CELL, y: WAF.y + Math.floor(i / COLS) * CELL });

const Dots: React.FC<{ p: Proj; f: number }> = ({ p, f }) => {
  const appear = interpolate(f, [at(10), at(10, 1)], [0, 1], { ...CL, easing: EO });
  const leave = interpolate(f, [at(12, 0.2), at(12, 1.2)], [1, 0], CL);
  if (appear <= 0 || leave <= 0) return null;
  const eco = interpolate(f, [at(11), at(11, 2.5)], [0, ECO], { ...CL, easing: EIO });
  const rects: string[] = ["", "", ""];
  DOTS.forEach((d, i) => {
    const [gx, gy] = project(p, d.x, d.y);
    const c = cellOf(i);
    const t0 = at(10, 1.5) + (i / DOTS.length) * 0.9 * FPB;
    const t = EIO(interpolate(f, [t0, t0 + 1.1 * FPB], [0, 1], CL));
    const x = gx + (c.x - gx) * t;
    const y = gy + (c.y - gy) * t;
    const kind = t >= 1 && i < Math.floor(eco) ? 1 : t >= 1 && i < eco ? 2 : 0;
    const s = 4.4 + 4 * t;
    rects[kind] += `M${(x - s / 2).toFixed(1)} ${(y - s / 2).toFixed(1)}h${s.toFixed(1)}v${s.toFixed(1)}h${(-s).toFixed(1)}z`;
  });
  return (
    <g opacity={appear * leave}>
      <path d={rects[0]} fill={K.fg} opacity={0.62} />
      <path d={rects[1]} fill={K.eco} />
      <path d={rects[2]} fill={K.eco} opacity={0.5} />
    </g>
  );
};

// ---------- the parcel and its plot ratio ----------
// B119-0053 is 6,427.7 m². The outline drawn is the box around the tower footprints, widened to that area (示意).
const PARCEL_RING = (() => {
  const r = CITY.hero.parcel;
  const cx = (r[0] + r[2]) / 2;
  const cy = (r[1] + r[5]) / 2;
  const w = r[2] - r[0];
  const h = r[5] - r[1];
  const k = Math.sqrt(6427.7 / (w * h));
  return [cx - (w * k) / 2, cy - (h * k) / 2, cx + (w * k) / 2, cy - (h * k) / 2, cx + (w * k) / 2, cy + (h * k) / 2, cx - (w * k) / 2, cy + (h * k) / 2];
})();
const ringD = (p: Proj, r: number[], h = 0) => r.reduce((d, _, i) => (i % 2 ? d : d + `${i ? "L" : "M"}${project(p, r[i], r[i + 1], h)[0].toFixed(1)} ${project(p, r[i], r[i + 1], h)[1].toFixed(1)}`), "") + "Z";

const Parcel: React.FC<{ p: Proj; f: number }> = ({ p, f }) => {
  const on = track(f, [
    [at(16) - 6, 0],
    [at(16, 1), 1],
    [at(20), 1],
    [at(20, 1), 0],
  ]);
  if (on <= 0) return null;
  const slabs = Math.floor(interpolate(f, [at(16, 3), at(17, 2.5)], [0, 15], CL));
  const toTower = interpolate(f, [at(18, 1.5), at(18, 3)], [0, 1], CL);
  const pulse = 0.55 + 0.45 * Math.sin(f / 5);
  return (
    <g opacity={on}>
      <path d={ringD(p, PARCEL_RING)} fill={K.theme} fillOpacity={0.16 + 0.1 * pulse} stroke={K.theme} strokeWidth={3} strokeDasharray="12 7" />
      {Array.from({ length: slabs }).map((_, i) => (
        <path key={i} d={ringD(p, PARCEL_RING, 6 + i * 6.2)} fill={K.theme} fillOpacity={0.12 * (1 - toTower)} stroke={K.themeHi} strokeOpacity={0.85 * (1 - toTower)} strokeWidth={1.6} />
      ))}
    </g>
  );
};

// ---------- the hook's two columns at 粤海 ----------
const Columns: React.FC<{ p: Proj; f: number }> = ({ p, f }) => {
  const on = track(f, [
    [at(2, 0.8), 0],
    [at(2, 1.2), 1],
    [at(3, 3.5), 1],
    [at(4), 0],
  ]);
  if (on <= 0) return null;
  const [x, y] = project(p, YUEHAI.x, YUEHAI.y);
  const res = progAt(f - B(2), 1.2, 1.4, EBACK);
  const off = progAt(f - B(2), 2.4, 1, EBACK);
  const PX = 34; // px per 万元
  const col = (cx: number, v: number, p2: number, color: string, label: string, value: string) => (
    <div style={{ position: "absolute", left: cx - 60, top: y - v * PX * p2, width: 120, height: v * PX * p2, background: `linear-gradient(180deg, ${color}, ${color}66)`, borderRadius: "8px 8px 0 0" }}>
      <div style={{ position: "absolute", left: "50%", top: -78, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 56, fontWeight: 900, color, whiteSpace: "nowrap", opacity: p2 }}>{value}</div>
      <div style={{ position: "absolute", left: "50%", top: v * PX * p2 + 14, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 30, fontWeight: 700, color: K.fg, whiteSpace: "nowrap" }}>{label}</div>
    </div>
  );
  return (
    <div style={{ position: "absolute", inset: 0, opacity: on }}>
      {col(x - 110, 10.86, res, K.red, "住宅地 · 2026", "10.86 万")}
      {col(x + 110, 1.11, off, K.green, "写字楼地 · 2025", "1.11 万")}
      <div style={{ position: "absolute", left: x - 260, top: y, width: 520, height: 3, background: K.fg, opacity: 0.6 }} />
      <div style={{ position: "absolute", left: x - 260, top: y + 62, width: 520, textAlign: "center", fontFamily: FONT, fontSize: 24, fontWeight: 700, color: K.sub, letterSpacing: 2 }}>南山 · 粤海街道</div>
    </div>
  );
};

// ---------- labels ----------
const CITIES: [string, number, number][] = [
  ["广州", 113.264, 23.129],
  ["佛山", 113.122, 23.021],
  ["东莞", 113.752, 23.02],
  ["惠州", 114.416, 23.111],
  ["中山", 113.392, 22.517],
  ["珠海", 113.577, 22.271],
  ["江门", 113.082, 22.579],
  ["香港", 114.17, 22.35],
  ["澳门", 113.55, 22.19],
  ["深圳", 114.06, 22.64],
];
const prdLabels: Label[] = CITIES.map(([text, lon, lat]) => {
  const [x, y] = ll(lon, lat);
  return { text, x, y, kind: "city", zMax: 0.009 };
});
const szLabels: Label[] = WORLD.sz.map((d) => ({ text: d.name ?? "", x: d.c[0], y: d.c[1], kind: "district", zMin: 0.012, zMax: 0.06 }));
const roadLabels: Label[] = [
  { text: "深南大道", x: -2300, y: -150, along: "深南大道" },
  { text: "滨河大道", x: -1900, y: -780, along: "滨河大道" },
  { text: "金田路", x: -60, y: 200, along: "金田路" },
  { text: "益田路", x: -930, y: 300, along: "益田路" },
  { text: "福华路", x: 900, y: -100, along: "福华路" },
  { text: "福中路", x: -1300, y: 820, along: "福中路" },
  { text: "红荔路", x: -1500, y: 900, along: "红荔路" },
  { text: "彩田路", x: 120, y: 1600, along: "彩田路" },
  { text: "新洲路", x: -1900, y: -1600, along: "新洲路" },
].map((l) => ({ ...l, kind: "road" as const, zMin: 0.25, zMax: 1.6 }));
const placeLabels: Label[] = [
  { text: "市民中心", x: CIVIC.x, y: CIVIC.y, h: 60, kind: "poi", zMin: 0.25, zMax: 1.8, dot: true },
  { text: "会展中心", x: EXPO.x, y: EXPO.y, h: 40, kind: "poi", zMin: 0.25, zMax: 1.8, dot: true },
  { text: "平安金融中心 599 米", x: PINGAN.x, y: PINGAN.y, h: 640, kind: "poi", zMin: 0.25, zMax: 1.8 },
  { text: "莲花山", x: -520, y: 2050, kind: "poi", zMin: 0.25, zMax: 1.2, color: K.sub },
  { text: "深圳湾", x: -6500, y: -3200, kind: "note", zMin: 0.012, zMax: 0.05, color: "#6f8fa8", size: 24 },
  { text: "香港", x: 4000, y: -9000, kind: "note", zMin: 0.012, zMax: 0.05, color: "#6f8fa8", size: 24 },
];
const stationLabels: Label[] = ["会展中心", "市民中心", "岗厦", "岗厦北", "购物公园", "福田"].map((n) => {
  const s = CITY.stations.find((q) => q.name === n)!;
  return { text: `${n}站`, x: s.x, y: s.y, kind: "station" as const, zMin: 0.3, zMax: 0.9, dot: true };
});
const heroLabel: Label = { text: "深圳能源大厦", x: HERO.x, y: HERO.y, h: 236, kind: "poi", color: K.theme, zMin: 0.3, zMax: 1.4, dot: true, size: 26 };

// ---------- scale bar ----------
const ScaleBar: React.FC<{ z: number; o: number }> = ({ z, o }) => {
  const nice = [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000];
  const m = nice.find((n) => n * z >= 90) ?? 50000;
  const w = m * z;
  return (
    <div style={{ position: "absolute", right: 64, bottom: 64, opacity: o, fontFamily: FONT, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: K.sub }}>{m >= 1000 ? `${m / 1000} 公里` : `${m} 米`}</div>
      <div style={{ width: w, height: 8, borderLeft: `2px solid ${K.sub}`, borderRight: `2px solid ${K.sub}`, borderBottom: `2px solid ${K.sub}` }} />
    </div>
  );
};

// ---------- the stage ----------
const Stage: React.FC = () => {
  const f = useBeatFrame();
  const cam = camAt(f, KEYS);
  const night = track(f, [
    [0, 0.75],
    [B(0) + 3, 1],
    [at(2), 1],
    [at(2, 1), 0],
  ]);
  const prd = track(f, [
    [at(2), 0],
    [at(2, 1), 1],
  ]);
  const bldg = track(f, [
    [at(2), 1],
    [at(2, 1), 0],
    [at(14, 1), 0],
    [at(14, 2), 1],
    [at(20, 0.5), 1],
    [at(20, 1.5), 0],
  ]);
  const bldgH = track(f, [
    [at(2), 1],
    [at(2, 1), 0],
    [at(15), 0],
    [at(15, 2.5), 1],
  ]);
  const roads = track(f, [
    [at(2), 1],
    [at(2, 1), 0],
    [at(14), 0],
    [at(14, 1.5), 1],
    [at(20, 0.5), 1],
    [at(20, 1.5), 0],
  ]);
  const hero = track(f, [
    [at(2), 1],
    [at(2, 1), 0],
    [at(15, 2), 0],
    [at(15, 3), 1],
    [at(16), 1],
    [at(16, 0.8), 0],
    [at(18, 3.2), 0],
    [at(18, 3.4), 1],
    [at(20, 0.5), 1],
    [at(20, 1.5), 0],
  ]);
  const heroBuilt = track(f, [
    [at(2), 1],
    [at(2, 0.5), 0],
    [at(18, 3.4), 0],
    [at(19, 3), 1],
  ]);
  const szDim = track(f, [
    [at(10), 1],
    [at(10, 1.5), 0.35],
    [at(13, 3), 0.35],
    [at(14), 1],
  ]);
  const metro = track(f, [
    [0, 0.5],
    [at(2), 0.5],
    [at(2, 1), 0.35],
    [at(6), 0],
    [at(14), 0],
    [at(14, 1.5), 1],
    [at(20), 1],
    [at(22, 2), 0.4],
    [at(22, 4), 1],
  ]);
  const ns = track(f, [
    [at(2), 0],
    [at(2, 1), 0.28],
    [at(3, 3), 0.28],
    [at(4), 0],
    [at(20), 0],
    [at(20, 1), 0.28],
    [at(22), 0],
  ]);
  const ft = track(f, [
    [at(14), 0],
    [at(14, 1), 0.14],
    [at(15), 0],
  ]);
  const title = track(f, [
    [at(6) - 4, 0],
    [at(6, 1), 1],
    [at(7, 3), 1],
    [at(8, 0.5), 0],
  ]);
  const szHi = track(f, [
    [at(5, 3), 0],
    [at(6, 1), 0.3],
    [at(8), 0.3],
    [at(8, 1.2), 0],
  ]);
  const scale = track(f, [
    [at(4), 0],
    [at(4, 1), 1],
  ]);
  return (
    <AbsoluteFill style={{ background: "#0a0e12" }}>
      <MapView
        cam={cam}
        layers={{
          prd,
          szTint: { color: K.theme, a: szHi },
          sz: szDim,
          szFill: { 南山区: { color: K.theme, a: ns * 0.45 }, 福田区: { color: K.theme, a: ft } },
          roads,
          metro,
          bldg,
          bldgH,
          night,
          hero,
          heroBuilt,
          heroLook: night > 0.5 ? "night" : "dusk",
        }}
        labels={[
          ...prdLabels.map((l) => (l.text === "深圳" ? { ...l, color: K.theme, size: 34 } : { ...l, o: 1 - 0.65 * title })),
          ...szLabels.map((l) => ({ ...l, o: Math.max(0, (szDim - 0.35) / 0.65) * (1 - ns / 0.28) })),
          ...roadLabels.map((l) => ({ ...l, o: 1 - 0.5 * night })),
          ...placeLabels.map((l) => (l.text.startsWith("平安") ? { ...l, o: 1 - night } : l.text === "深圳湾" || l.text === "香港" ? { ...l, o: 1 - ns / 0.28 } : l)),
          ...stationLabels,
          { ...heroLabel, o: hero * (1 - track(f, [[at(16) - 6, 0], [at(16), 1], [at(18, 2), 1], [at(18, 3), 0]])) },
        ]}
        under={(p) => (
          <>
            <Parcel p={p} f={f} />
          </>
        )}
        over={(p) => <Dots p={p} f={f} />}
        html={(p) => <Columns p={p} f={f} />}
      />
      {/* night sky: the far city sinks into the dark under the headline */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 640, opacity: night, background: "linear-gradient(180deg, #07090b 0%, rgba(7,9,11,0.9) 38%, rgba(7,9,11,0) 100%)" }} />
      <ScaleBar z={cam.z} o={scale} />
    </AbsoluteFill>
  );
};

// ---------- screens ----------
// S01: the whole claim is on screen from frame 0 (no entrance), and slams on the first beat.
const Claim: React.FC = () => {
  const f = useBeatFrame();
  const hit = f < 0 ? 0 : Math.max(0, 1 - f / 10);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 120, top: 150, transform: `scale(${1 + 0.06 * hit})`, transformOrigin: "left center" }}>
        <Txt size={104} w={900}>深圳的高楼，</Txt>
        <Txt size={104} w={900}>
          <span style={{ color: K.theme }}>不是盖来收租的。</span>
        </Txt>
      </div>
      <Shockwave at={0} x={560} y={300} color={K.theme} size={1500} />
    </AbsoluteFill>
  );
};

const Hook: React.FC = () => (
  <AbsoluteFill>
    <Scrim w={760} />
    <div style={{ position: "absolute", left: 120, top: 210, display: "flex", flexDirection: "column", gap: 16 }}>
      <In at={0.3} from="up">
        <Txt size={44} color={K.sub}>同一个街道</Txt>
      </In>
      <In at={0.6} from="up">
        <Txt size={44} color={K.sub}>每平方米楼面地价</Txt>
      </In>
      <div style={{ marginTop: 40 }}>
        <Stamp at={3} color={K.green} size={84} rotate={-5}>
          便宜约 10 倍
        </Stamp>
      </div>
      <In at={3.4} from="fade">
        <Txt size={30} color={K.sub} style={{ marginTop: 24 }}>写字楼地反而便宜</Txt>
      </In>
    </div>
    <Src at={0.5}>第一财经 2026 · 粤海街道住宅地 57.72 亿元；澎湃新闻 2025 · K602-0016 总部用地 9.65 亿元 · 楼面地价为估算：成交价 ÷ 规定建筑面积 · 位置为估算</Src>
  </AbsoluteFill>
);

const Why: React.FC = () => (
  <AbsoluteFill>
    <Scrim w={1000} />
    <div style={{ position: "absolute", left: 120, top: 300, display: "flex", flexDirection: "column", gap: 26 }}>
      <Head at={0} parts={["同一个街道，", { t: "凭什么", c: K.theme }, "差 10 倍？"]} size={78} />
      <Head at={1.6} parts={["盖楼的人，又", { t: "图什么", c: K.theme }, "？"]} size={78} />
      <In at={3} from="fade">
        <Txt size={36} color={K.sub} style={{ marginTop: 20 }}>跟着一栋楼，从一块地走到今天。</Txt>
      </In>
    </div>
  </AbsoluteFill>
);

const Title: React.FC = () => {
  const f = useBeatFrame();
  const p = progAt(f, 0, 1, EBACK);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, rgba(7,9,11,0.75) 0%, rgba(7,9,11,0.2) 60%, transparent 80%)" }} />
      <div style={{ textAlign: "center", transform: `scale(${1.25 - 0.25 * p})`, opacity: Math.min(1, p * 2) }}>
        <Txt size={176} w={900}>高楼的形状</Txt>
      </div>
      <In at={1} from="fade">
        <Txt size={40} color={K.sub} style={{ marginTop: 26, letterSpacing: 12 }}>世界的形状</Txt>
      </In>
    </AbsoluteFill>
  );
};

const Shenzhen: React.FC = () => (
  <AbsoluteFill>
    <Scrim w={720} />
    <div style={{ position: "absolute", left: 120, top: 260, display: "flex", flexDirection: "column", gap: 8 }}>
      <In at={0.5} from="up">
        <Txt size={52}>深圳</Txt>
      </In>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
        <Odometer value={interpolate(useBeatFrame(), [0.8 * FPB, 2.6 * FPB], [0, 1997], { ...CL, easing: EO })} size={130} />
        <Txt size={44} color={K.sub}>平方公里</Txt>
      </div>
      <In at={2.4} from="up">
        <Txt size={34} color={K.sub}>9 个区 + 大鹏新区</Txt>
      </In>
    </div>
    <Src at={1}>深圳统计年鉴 2024 · 陆域面积 1,997.47 平方公里，不含深汕 · 区界与海岸线：© OpenStreetMap contributors</Src>
  </AbsoluteFill>
);

const Eco: React.FC = () => {
  const f = useBeatFrame();
  const eco = interpolate(f, [1 * FPB, 3.5 * FPB], [0, ECO], { ...CL, easing: EIO });
  return (
    <AbsoluteFill>
      <Scrim w={760} />
      <div style={{ position: "absolute", left: 120, top: 230, display: "flex", flexDirection: "column", gap: 10 }}>
        <In at={0} from="up">
          <Txt size={36} color={K.sub}>1 个点 = 1 平方公里</Txt>
        </In>
        <In at={1} from="up">
          <Txt size={44}>2005 年划进基本生态控制线的</Txt>
        </In>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <Odometer value={eco} size={140} decimals={1} color={K.eco} />
          <Txt size={40} color={K.sub}>平方公里</Txt>
        </div>
        <In at={2.6} from="up">
          <Txt size={32} color={K.sub}>线内除道路、市政、公园等，禁止建设</Txt>
        </In>
        <div style={{ marginTop: 24 }}>
          <Head at={3.2} parts={["全市", { t: "一半的土地", c: K.eco }, "，不能盖楼。"]} size={66} />
        </div>
      </div>
      <Src at={1}>深圳市基本生态控制线管理规定（市政府令第 145 号）· 2005；深圳政府在线 · 2023 · 点阵为面积示意，不代表位置</Src>
    </AbsoluteFill>
  );
};

// One km² dot, opened up: 100 hectares, and the year's office-and-shop land is 10 of them.
const Supply: React.FC = () => {
  const f = useBeatFrame();
  const open = progAt(f, 0.2, 1.2, EIO);
  const hi = interpolate(f, [2.4 * FPB, 3.4 * FPB], [0, 10], CL);
  const G = 44;
  return (
    <AbsoluteFill>
      <Scrim w={800} />
      <div style={{ position: "absolute", left: 120, top: 210, display: "flex", flexDirection: "column", gap: 12 }}>
        <In at={0} from="up">
          <Txt size={40} color={K.sub}>2026 年，全市计划供地 1,068 公顷</Txt>
        </In>
        <In at={1.6} from="up">
          <Txt size={44}>商业和办公用地只有</Txt>
        </In>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <Odometer value={hi} size={150} color={K.theme} />
          <Txt size={44} color={K.sub}>公顷</Txt>
        </div>
        <In at={3} from="up">
          <Txt size={36} color={K.fg}>
            = 一个点的<b style={{ color: K.theme }}>十分之一</b>，占全年的 0.94%
          </Txt>
        </In>
        <In at={4.2} from="up">
          <Txt size={30} color={K.sub} style={{ marginTop: 12 }}>
            原文："严控商办用地新增供应"
          </Txt>
        </In>
      </div>
      {/* the opened dot: 10 × 10 hectares */}
      <div style={{ position: "absolute", left: 1120 + 60 * open, top: 250 + 40 * open, width: G * 10, height: G * 10, transform: `scale(${0.03 + 0.97 * open})`, transformOrigin: "0 0", display: "grid", gridTemplateColumns: `repeat(10, ${G}px)`, border: `2px solid ${K.fg}`, opacity: Math.min(1, open * 3) }}>
        {Array.from({ length: 100 }).map((_, i) => (
          <div key={i} style={{ width: G - 4, height: G - 4, margin: 2, background: i < hi ? K.theme : "rgba(244,240,232,0.14)", borderRadius: 3 }} />
        ))}
      </div>
      <div style={{ position: "absolute", left: 1180, top: 290 + G * 10 + 18, opacity: open, fontFamily: FONT, fontSize: 26, fontWeight: 700, color: K.sub }}>放大一个点：1 平方公里 = 100 公顷</div>
      <Src at={1}>深圳市规划和自然资源局 · 2026 年度建设用地供应计划（含深汕）· 商服用地 10 公顷</Src>
    </AbsoluteFill>
  );
};

const Cbd: React.FC = () => (
  <AbsoluteFill>
    <Scrim w={780} />
    <div style={{ position: "absolute", left: 120, top: 230, display: "flex", flexDirection: "column", gap: 14 }}>
      <In at={0.3} from="up">
        <Txt size={52}>福田中心区</Txt>
      </In>
      <In at={0.9} from="up">
        <Txt size={34} color={K.sub}>1980 年代初，规划就把市中心定在这里</Txt>
      </In>
      <In at={1.5} from="up">
        <Txt size={34} color={K.sub}>中轴线：莲花山 → 市民中心 → 会展中心</Txt>
      </In>
      <In at={2.1} from="up">
        <Txt size={34} color={K.sub}>图则范围 6.19 平方公里，地上可建约 1,100 万㎡</Txt>
      </In>
      <div style={{ marginTop: 26 }}>
        <Head at={3.2} parts={["楼还没影，", { t: "城市已经画好了", c: K.theme }, "。"]} size={64} />
      </div>
    </div>
    <Src at={1}>陈一新 2025；ISOCARP 2012；福田中心区法定图则 2018（含莲花山）· 道路、地铁、建筑：© OpenStreetMap contributors</Src>
  </AbsoluteFill>
);

const Fact: React.FC<{ k: string; v: React.ReactNode; at: number }> = ({ k, v, at: a }) => (
  <In at={a} from="left">
    <div style={{ display: "flex", alignItems: "baseline", gap: 18, fontFamily: FONT }}>
      <span style={{ width: 150, fontSize: 30, fontWeight: 700, color: K.sub }}>{k}</span>
      <span style={{ fontSize: 46, fontWeight: 900, color: K.fg, whiteSpace: "nowrap" }}>{v}</span>
    </div>
  </In>
);

const Plot: React.FC = () => {
  const f = useBeatFrame();
  const n = Math.floor(interpolate(f, [3 * FPB, 6.5 * FPB], [0, 15], CL));
  return (
    <AbsoluteFill>
      <Scrim w={820} />
      <div style={{ position: "absolute", left: 120, top: 190, display: "flex", flexDirection: "column", gap: 14 }}>
        <In at={0} from="up">
          <Txt size={34} color={K.sub}>滨河大道与金田路交汇处 · 东北角</Txt>
        </In>
        <Head at={0.4} parts={["宗地 ", { t: "B119-0053", c: K.theme }]} size={70} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
          <Fact k="用地" v="6,427.7 ㎡" at={1.2} />
          <Fact k="用途" v="商业性办公" at={1.6} />
          <Fact k="年限" v="50 年" at={2} />
          <Fact k="容积率" v={<span>15 <span style={{ fontSize: 30, color: K.sub }}>× 地块面积 = 楼面上限</span></span>} at={2.6} />
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 10 }}>
          <Txt size={34} color={K.sub}>叠 {n} 层 →</Txt>
          <Odometer value={Math.round((96420 * n) / 15)} size={86} color={K.theme} />
          <Txt size={34} color={K.sub}>㎡</Txt>
        </div>
      </div>
      <Src at={1}>深圳能源 · 关于竞买公司总部大楼用地的公告 · 2008 · 计容建筑面积 96,420㎡ · 地块轮廓为示意</Src>
    </AbsoluteFill>
  );
};

const RULES = ["能源类企业", "净资产 40 亿以上", "2007 年在深圳交税 3 亿以上", "建成后六成自用，10 年不准卖"];

const Buyers: React.FC = () => (
  <AbsoluteFill>
    <Scrim w={860} />
    <div style={{ position: "absolute", left: 120, top: 190, display: "flex", flexDirection: "column", gap: 16 }}>
      <Head at={0} parts={["谁能买？"]} size={72} />
      {RULES.map((r, i) => (
        <In key={r} at={0.6 + i * 0.35} from="left">
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: FONT }}>
            <span style={{ width: 34, height: 34, borderRadius: 8, border: `3px solid ${K.theme}`, color: K.theme, fontSize: 26, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>✓</span>
            <span style={{ fontSize: 44, fontWeight: 700, color: K.fg, whiteSpace: "nowrap" }}>{r}</span>
          </div>
        </In>
      ))}
      <In at={2.4} from="up">
        <div style={{ marginTop: 30, fontFamily: FONT, display: "flex", alignItems: "baseline", gap: 18 }}>
          <span style={{ fontSize: 34, fontWeight: 700, color: K.sub }}>2008 年 4 月 23 日</span>
          <span style={{ fontSize: 96, fontWeight: 900, color: K.theme }}>6.7 亿</span>
          <span style={{ fontSize: 34, fontWeight: 700, color: K.sub }}>成交</span>
        </div>
      </In>
      <In at={3.4} from="up">
        <Txt size={44}>买家：深圳能源</Txt>
      </In>
    </div>
    <Src at={1}>深圳能源 · 关于竞买 / 竞得公司总部大楼用地的公告 · 2008-03-26、2008-04-25</Src>
  </AbsoluteFill>
);

// A balance in its own dark panel: the land price on the left pan, the promised local tax on the right.
const Balance: React.FC<{ tip: number; o: number }> = ({ tip, o }) => {
  if (o <= 0) return null;
  const cx = 1490;
  const cy = 500;
  const L = 250;
  const ang = (10 * tip * Math.PI) / 180; // right side goes down
  const ends = [-1, 1].map((k) => [cx + k * L * Math.cos(ang), cy + k * L * Math.sin(ang)]);
  const pan = (x: number, y: number, color: string) => (
    <>
      <line x1={x} y1={y} x2={x - 90} y2={y + 120} stroke={K.sub} strokeWidth={2} />
      <line x1={x} y1={y} x2={x + 90} y2={y + 120} stroke={K.sub} strokeWidth={2} />
      <path d={`M${x - 110} ${y + 120} L${x + 110} ${y + 120} Q${x} ${y + 175} ${x - 110} ${y + 120}Z`} fill={color} fillOpacity={0.85} />
    </>
  );
  const label = (x: number, y: number, top: string, big: string, color: string) => (
    <div style={{ position: "absolute", left: x - 160, top: y + 182, width: 320, fontFamily: FONT, textAlign: "center", whiteSpace: "nowrap" }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: K.sub }}>{top}</div>
      <div style={{ fontSize: 60, fontWeight: 900, color }}>{big}</div>
    </div>
  );
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <div style={{ position: "absolute", left: 1150, top: 380, width: 680, height: 520, borderRadius: 24, background: "rgba(7,9,11,0.86)", border: `1px solid ${K.line}` }} />
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        <line x1={cx} y1={cy} x2={cx} y2={cy + 330} stroke={K.sub} strokeWidth={8} strokeLinecap="round" />
        <path d={`M${cx - 70} ${cy + 340} L${cx + 70} ${cy + 340}`} stroke={K.sub} strokeWidth={8} strokeLinecap="round" />
        <line x1={ends[0][0]} y1={ends[0][1]} x2={ends[1][0]} y2={ends[1][1]} stroke={K.fg} strokeWidth={8} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={11} fill={K.fg} />
        {pan(ends[0][0], ends[0][1], K.fg)}
        {pan(ends[1][0], ends[1][1], K.theme)}
      </svg>
      {label(ends[0][0], ends[0][1], "地价", "9.65 亿", K.fg)}
      {label(ends[1][0], ends[1][1], "承诺 5 年地方财力", "15 亿", K.theme)}
    </div>
  );
};

// Back at 粤海: the answer to the hook.
const Tax: React.FC = () => {
  const f = useBeatFrame();
  const tip = progAt(f, 2.6, 1.4, EBACK);
  return (
    <AbsoluteFill>
      <Scrim w={900} />
      <div style={{ position: "absolute", left: 120, top: 170, display: "flex", flexDirection: "column", gap: 12 }}>
        <In at={0} from="up">
          <Txt size={40} color={K.sub}>今天还是这么卖。2025 年，粤海街道一块总部地：</Txt>
        </In>
        <In at={0.6} from="up">
          <Txt size={44}>抖音以 9.65 亿元拿下，条件是——</Txt>
        </In>
        <In at={1.4} from="up">
          <Txt size={44}>
            5 年在深圳形成地方财力 <b style={{ color: K.theme, fontSize: 60 }}>15 亿</b> 以上
          </Txt>
        </In>
        <In at={2} from="up">
          <Txt size={44}>办公楼不得转让</Txt>
        </In>
        <div style={{ marginTop: 40 }}>
          <Head at={8} parts={["城市卖的不是地，", { t: "是以后的税", c: K.theme }, "。"]} size={72} />
        </div>
        <In at={10.5} from="up">
          <Txt size={40} color={K.sub} style={{ marginTop: 6 }}>这些税，会变成路、地铁和学校。</Txt>
        </In>
      </div>
      {/* the balance: the promised tax outweighs the land price */}
      <Balance tip={tip} o={progAt(f, 1, 0.8, EO) * (1 - progAt(f, 7.6, 0.6, EIO))} />
      <Src at={1}>澎湃新闻 · 转述 K602-0016 出让公告 · 2025-10 · 地方财力：企业交的税里留在深圳的部分</Src>
    </AbsoluteFill>
  );
};

export const Act1: React.FC = () => (
  <AbsoluteFill>
    <Stage />
    <Subs
      act={ACT}
      subs={[
        { from: 0, to: 2, C: Claim },
        { from: 2, to: 4, C: Hook },
        { from: 4, to: 6, C: Why },
        { from: 6, to: 8, C: Title },
        { from: 8, to: 10, C: Shenzhen },
        { from: 10, to: 12, C: Eco },
        { from: 12, to: 14, C: Supply },
        { from: 14, to: 16, C: Cbd },
        { from: 16, to: 18, C: Plot },
        { from: 18, to: 20, C: Buyers },
        { from: 20, to: 24, C: Tax },
      ]}
    />
  </AbsoluteFill>
);

