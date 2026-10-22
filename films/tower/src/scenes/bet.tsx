import React from "react";
import { AbsoluteFill, interpolate, random } from "remotion";
import { actBar, Subs, track } from "../act";
import { Cam, CamKey, camAt, project, Proj } from "../geo/cam";
import { CITY, poi } from "../geo/data";
import { MapView } from "../geo/MapView";
import { CL, EIO, EO, In, Odometer, progAt } from "../fx";
import { useBeatFrame } from "../kit";
import { FONT, K } from "../theme";
import { FPB } from "../timing";
import { Head, Src } from "../ui";
import { Txt } from "./common";

// 升华 on the track's climax (film bars 62–74). Futian goes from dusk to night while the buildings whose companies
// pay over 1 亿 a year light up — over 50 in 2011, 86 in 2018, 159 in 2024 (福田区政府工作报告 2012, 2019, 2025) —
// then the camera comes down to the tower as
// the trains run and people walk in, and ends on the first shot of the film, every window lit.
const ACT = 62;
const B = (bar: number) => actBar(ACT, bar);
const at = (bar: number, beat = 0) => B(bar) + beat * FPB;

const HERO = poi("深圳能源大厦");

const CBD_FLAT: Cam = { x: -560, y: 60, z: 0.25, bearing: 0, tilt: 0, ox: 1060, oy: 560 };
const DUSK: Cam = { x: -600, y: -40, z: 0.46, bearing: -16, tilt: 57, ox: 1200, oy: 660 };
const CLOSE: Cam = { x: -230, y: -560, z: 1.2, bearing: -30, tilt: 60, ox: 1180, oy: 690 };
const NIGHT: Cam = { x: -420, y: -470, z: 0.8, bearing: 18, tilt: 66, oy: 810 };
const KEYS: CamKey[] = [
  { at: 0, dur: 1, cam: CBD_FLAT },
  { at: at(62), dur: 2.2 * FPB, cam: DUSK },
  { at: at(66), dur: 1.8 * FPB, cam: CLOSE },
  { at: at(70), dur: 2.2 * FPB, cam: NIGHT },
];

// 159 tall buildings in view light up in a shuffled order. Which buildings they are is not known (the district
// does not name them, and they are spread over all of 福田), so the screen says the lit ones are illustrative.
const LIT = (() => {
  const idx = CITY.buildings
    .map((b, i) => ({ b, i }))
    .filter(({ b }) => b.h >= 45 && b.cx > -2400 && b.cx < 700 && b.cy > -1300 && b.cy < 1500 && Math.hypot(b.cx - HERO.x, b.cy - HERO.y) > 80)
    .sort((a, b) => random(`lit-${a.i}`) - random(`lit-${b.i}`))
    .slice(0, 159);
  const rank = new Map<number, number>();
  idx.forEach(({ i }, r) => rank.set(i, r));
  return rank;
})();

// Count lit by frame: 50+ (2011) → 86 (2018) → 159 (2024), each step on its own beats.
const litCount = (f: number) =>
  interpolate(f, [at(62, 1), at(62, 3), at(63, 1), at(63, 2), at(64, 1), at(64, 3)], [0, 50, 50, 86, 86, 159], { ...CL, easing: EIO });

// People walk from the two nearest metro exits to the tower.
const PATHS: number[][] = [
  [-418, -281, -418, -600, -175, -610, -160, -770],
  [303, -267, 300, -610, -105, -620, -118, -770],
  [-418, -281, -560, -420, -560, -640, -170, -650, -165, -775],
];
const pathLen = (p: number[]) => {
  let L = 0;
  for (let i = 2; i < p.length; i += 2) L += Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1]);
  return L;
};
const pointAt = (p: number[], s: number): [number, number] => {
  for (let i = 2; i < p.length; i += 2) {
    const l = Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1]);
    if (s <= l) return [p[i - 2] + ((p[i] - p[i - 2]) * s) / l, p[i - 1] + ((p[i + 1] - p[i - 1]) * s) / l];
    s -= l;
  }
  return [p[p.length - 2], p[p.length - 1]];
};

const People: React.FC<{ p: Proj; f: number }> = ({ p, f }) => {
  const on = track(f, [
    [at(66, 1), 0],
    [at(66, 2.5), 1],
  ]);
  if (on <= 0) return null;
  const dots: string[] = [];
  PATHS.forEach((path, k) => {
    const L = pathLen(path);
    for (let i = 0; i < 70; i++) {
      const speed = 1.6 + random(`ps${k}-${i}`) * 1.4; // m per frame (sped up)
      const s = ((f - at(66)) * speed + random(`po${k}-${i}`) * L) % L;
      const [x, y] = pointAt(path, s);
      const side = (random(`pl${k}-${i}`) - 0.5) * 10;
      const [sx, sy] = project(p, x + side, y + side * 0.3, 0);
      const fade = s > L - 40 ? (L - s) / 40 : 1;
      if (fade <= 0.05) continue;
      dots.push(`M${(sx - 2.6).toFixed(1)} ${sy.toFixed(1)}a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0 -5.2 0`);
    }
  });
  return <path d={dots.join("")} fill={K.fg} opacity={0.85 * on} />;
};

// A short beam above each building as it lights.
const Beams: React.FC<{ p: Proj; f: number }> = ({ p, f }) => {
  const n = litCount(f);
  const n0 = litCount(f - 12);
  const out: React.ReactNode[] = [];
  CITY.buildings.forEach((b, i) => {
    const r = LIT.get(i);
    if (r === undefined) return;
    const k = Math.max(0, Math.min(1, n - r)) - Math.max(0, Math.min(1, n0 - r));
    if (k <= 0.02) return;
    const [x0, y0] = project(p, b.cx, b.cy, b.h);
    const [x1, y1] = project(p, b.cx, b.cy, b.h + 140);
    out.push(<line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={K.gold} strokeWidth={3} strokeLinecap="round" opacity={k} />);
  });
  return <>{out}</>;
};

const Stage: React.FC = () => {
  const f = useBeatFrame();
  const cam = camAt(f, KEYS);
  const rise = track(f, [
    [at(62), 0],
    [at(62, 2.5), 1],
  ]);
  const night = track(f, [
    [at(62), 0.12],
    [at(65, 2), 0.55],
    [at(66, 1), 1],
  ]);
  const n = litCount(f);
  const allLit = track(f, [
    [at(65, 3), 0],
    [at(66, 2), 1],
  ]);
  const flowOn = track(f, [
    [at(66), 0],
    [at(66, 1), 1],
  ]);
  return (
    <AbsoluteFill style={{ background: "#0a0e12" }}>
      <MapView
        cam={cam}
        layers={{
          sz: 1,
          roads: 0.7,
          metro: 0.4 + 0.6 * flowOn,
          metroFlow: flowOn > 0 ? (f - at(66)) * 2.4 : undefined,
          bldg: 1,
          bldgH: rise,
          night,
          lit: (b, i) => {
            const r = LIT.get(i);
            const base = allLit * night * (0.35 + 0.65 * random(`nl${i}`));
            if (r === undefined) return base;
            return Math.max(base, Math.max(0, Math.min(1, n - r)));
          },
          bldgTint: (b, i) => {
            const r = LIT.get(i);
            return r !== undefined && n - r > 0 && allLit < 0.5 ? "#3a3222" : undefined;
          },
          hero: 1,
          heroLook: night > 0.5 ? "night" : "dusk",
        }}
        labels={[]}
        over={(p) => (
          <>
            <Beams p={p} f={f} />
            <People p={p} f={f} />
          </>
        )}
      />
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 600, opacity: night, background: "linear-gradient(180deg, #07090b 0%, rgba(7,9,11,0.85) 40%, rgba(7,9,11,0) 100%)" }} />
    </AbsoluteFill>
  );
};

const Lights: React.FC = () => {
  const f = useBeatFrame();
  const n = interpolate(f, [1 * FPB, 3 * FPB, 5 * FPB, 6 * FPB, 9 * FPB, 11 * FPB], [0, 50, 50, 86, 86, 159], { ...CL, easing: EIO });
  const y = f < 5 * FPB ? 2011 : f < 9 * FPB ? 2018 : 2024;
  // The year (and 超) shows only once the count has settled on that year's figure, never on a number in between.
  const settled = (f >= 3 * FPB && f < 5 * FPB) || (f >= 6 * FPB && f < 9 * FPB) || f >= 11 * FPB;
  const lab = settled ? 1 : 0;
  const top = progAt(f, 11.6, 0.8, EO);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 520, background: "linear-gradient(180deg, rgba(7,9,11,0.92) 0%, rgba(7,9,11,0.7) 55%, rgba(7,9,11,0) 100%)" }} />
      <div style={{ position: "absolute", left: 120, top: 150, display: "flex", flexDirection: "column", gap: 6 }}>
        <In at={0.2} from="up">
          <Txt size={40} color={K.sub}>福田，楼里的企业每年交税过亿的楼</Txt>
        </In>
        <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
          {y === 2011 ? <Txt size={56} w={900} color={K.gold} style={{ opacity: lab }}>超</Txt> : null}
          <Odometer value={n} size={190} color={K.gold} />
          <Txt size={56} w={900}>栋</Txt>
          <div style={{ marginLeft: 20, fontFamily: FONT, fontSize: 44, fontWeight: 900, color: K.sub, fontVariantNumeric: "tabular-nums", opacity: lab }}>{y} 年</div>
        </div>
        <div style={{ opacity: top, transform: `translateY(${(1 - top) * 20}px)`, marginTop: 4, fontFamily: FONT, fontSize: 40, fontWeight: 900, color: K.gold }}>全国区县最多</div>
      </div>
      <Src at={1}>福田区政府工作报告 2012（超 50 栋）、2019（86 栋）、2025（159 栋）· 示意：亮起的楼不对应具体楼宇，159 栋分布在福田全区</Src>
    </AbsoluteFill>
  );
};

const Bet: React.FC = () => (
  <AbsoluteFill>
    <div style={{ position: "absolute", left: 120, top: 160, display: "flex", flexDirection: "column", gap: 18 }}>
      <Head at={0.6} parts={["你每天走进去的那栋楼，"]} size={76} />
      <Head at={2.6} parts={["是一座城市", { t: "十年前下的注", c: K.theme }, "。"]} size={76} />
    </div>
  </AbsoluteFill>
);

const Final: React.FC = () => (
  <AbsoluteFill>
    <div style={{ position: "absolute", left: 120, top: 150, display: "flex", flexDirection: "column", gap: 22 }}>
      <Head at={1} parts={["高楼不是盖来收租的。"]} size={84} />
      <Head at={3} parts={["它赌的，", { t: "是你会来", c: K.gold }, "。"]} size={120} />
    </div>
  </AbsoluteFill>
);

export const Act5: React.FC = () => (
  <AbsoluteFill>
    <Stage />
    <Subs
      act={ACT}
      subs={[
        { from: 62, to: 66, C: Lights },
        { from: 66, to: 70, C: Bet },
        { from: 70, to: 74, C: Final },
      ]}
    />
  </AbsoluteFill>
);

