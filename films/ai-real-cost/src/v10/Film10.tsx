// 《AI 的真实价格 · 第 1 集》 v10: one world, the North Pacific at night. Five flagships stand as light columns in
// their makers' cities among the rest of the market; to be compared they fly to a stage in the middle of the ocean,
// where three passes change their heights (list price → one task → one task on a used-up plan). Then the gym, the
// relay, your time, the zoom-out through the years, and back to the lights of the cities. Timed in film bars on the
// 千年之后 edit (bars.ts): the reveal lands on the music's return (bar 38), the zoom-out on its peak (bar 62).
import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame } from "remotion";
import { barAt, bf, FPS, sec } from "./bars";
import { Cam, mixCam, toScreen } from "./camera";
import { MapState } from "./engine";
import { BG, CITY, COLS, ColId, GPT4_COL, HOOK_COL, PLAN, PRICE, stageSlot, TASK } from "./geo";
import { BigCounter, CheckRework, EndCard, FreeApps, Gym, NextEp, PlanBill, RelayArc, Sources, Title, TokenChips, TwoBills, win } from "./parts";
import { FONT, K, SERIF } from "./theme";
import { BrandMark, CityLabel, clamp01, ColLabel, EIO, EO, lerp, Line, money, Note, Part, SHADOW } from "./ui";
import { World } from "./World";

export const FILM10_FRAMES = bf(86.2);

const KP = 34; // km per dollar, list-price pass
const KT = 260; // km per dollar, per-task passes
const STAGE_PT = stageSlot(2);
const IQ: Record<ColId, number> = { claude: 58, kimi: 55, chatgpt: 53, glm: 45, deepseek: 45 };
const SLOT: Record<ColId, number> = { deepseek: 0, glm: 1, kimi: 2, chatgpt: 3, claude: 4 };
const FLY_OFF: Record<ColId, number> = { deepseek: 0, glm: 0.12, kimi: 0.24, chatgpt: 0.06, claude: 0.18 };

const r = (b: number, a: number, z: number, e: (v: number) => number = EIO) => e(clamp01((b - a) / (z - a)));

// ---------- camera ----------

const WIDE: Cam = { x: -250, y: 420, z: 0.124, bearing: 0, tilt: 54, oy: 600 };
const WIDE_B: Cam = { ...WIDE, z: 0.131 };
const TITLE_CAM: Cam = { x: -250, y: 520, z: 0.112, bearing: 0, tilt: 46, oy: 560 };
const CHINA: Cam = { x: -5600, y: -260, z: 0.29, bearing: 0, tilt: 61, oy: 760 };
const CHINA_B: Cam = { ...CHINA, x: -5480, z: 0.31 };
const MIDWAY: Cam = { x: 0, y: 320, z: 0.15, bearing: 0, tilt: 56, oy: 640 };
const US: Cam = { x: 5180, y: 120, z: 0.27, bearing: 0, tilt: 61, oy: 880 };
const US_B: Cam = { ...US, x: 5080, z: 0.285 };
const WIDE2: Cam = { x: -250, y: 400, z: 0.124, bearing: 0, tilt: 56, oy: 620 };
const STAGE: Cam = { x: 0, y: 260, z: 0.34, bearing: 0, tilt: 64, oy: 760 };
const STAGE_B: Cam = { ...STAGE, z: 0.355 };
const STAGE_LOW: Cam = { x: 0, y: 260, z: 0.37, bearing: 0, tilt: 67, oy: 800 };
const STAGE_MAG: Cam = { x: 0, y: 260, z: 0.33, bearing: 0, tilt: 64, oy: 880 };
const STAGE_MAG_B: Cam = { ...STAGE_MAG, z: 0.345, tilt: 66 };
const GYM: Cam = { x: 0, y: -620, z: 0.23, bearing: 0, tilt: 56, oy: 600 };
const GYM_B: Cam = { ...GYM, z: 0.24 };
const SCEN: Cam = { x: 300, y: 260, z: 0.21, bearing: 0, tilt: 60, oy: 900 };
const WIDE3: Cam = { x: -250, y: 330, z: 0.124, bearing: 0, tilt: 52, oy: 640 };
const CITYCAM: Cam = { x: -5335, y: -420, z: 0.62, bearing: 0, tilt: 52, oy: 560 };
const HIGH: Cam = { x: -250, y: 440, z: 0.118, bearing: 0, tilt: 50, oy: 600 };
const HIGH_B: Cam = { ...HIGH, z: 0.126 };
const GPT_CAM: Cam = { x: -100, y: 240, z: 0.22, bearing: 0, tilt: 58, oy: 820 };
const GPT_CAM_B: Cam = { ...GPT_CAM, z: 0.23 };
const LIGHTS: Cam = { x: -5450, y: -320, z: 0.42, bearing: 0, tilt: 52, oy: 560 };
const HOOK_END: Cam = { ...WIDE, z: 0.136 };

// [bar, camera, how we arrive from the previous key]
type Key = [number, Cam, "ease" | "lin" | "cut"];
const KEYS: Key[] = [
  [0, WIDE, "cut"],
  [3.8, WIDE_B, "lin"],
  [5.0, TITLE_CAM, "ease"],
  [5.9, TITLE_CAM, "lin"],
  [7.0, CHINA, "ease"],
  [9.6, CHINA_B, "lin"],
  [10.5, MIDWAY, "ease"],
  [11.5, US, "ease"],
  [12.4, US_B, "lin"],
  [13.5, WIDE2, "ease"],
  [14.6, WIDE2, "lin"],
  [16.6, STAGE, "ease"],
  [24.0, STAGE_B, "lin"],
  [25.0, STAGE_LOW, "ease"],
  [33.2, STAGE_LOW, "lin"],
  [34.6, STAGE_MAG, "ease"],
  [40.2, STAGE_MAG_B, "lin"],
  [41.4, GYM, "ease"],
  [46.4, GYM_B, "lin"],
  [47.3, SCEN, "ease"],
  [49.9, SCEN, "lin"],
  [51.3, WIDE3, "ease"],
  [54.4, WIDE3, "lin"],
  [55.7, CITYCAM, "ease"],
  [61.9, CITYCAM, "lin"],
  [62.8, HIGH, "ease"],
  [63.8, GPT_CAM, "ease"],
  [67.0, GPT_CAM_B, "lin"],
  [68.0, HIGH, "ease"],
  [70.0, HIGH_B, "lin"],
  [75.6, LIGHTS, "ease"],
  [76.0, WIDE, "cut"],
  [81.0, HOOK_END, "lin"],
  [87.0, HOOK_END, "lin"],
];

const camAt = (bar: number): Cam => {
  let i = 0;
  while (i < KEYS.length - 1 && KEYS[i + 1][0] <= bar) i++;
  const [b0, c0] = KEYS[i];
  const next = KEYS[i + 1];
  if (!next || next[2] === "cut") return c0;
  const [b1, c1, how] = next;
  const t = clamp01((bar - b0) / (b1 - b0));
  return mixCam(c0, c1, how === "lin" ? t : EIO(t));
};

// ---------- columns ----------

// A fall in `n` quick steps between bars a and b: [progress 0..1, flash 0..1].
const steps = (bar: number, a: number, b: number, n: number): [number, number] => {
  if (bar <= a) return [0, 0];
  if (bar >= b) return [1, 0];
  const p = ((bar - a) / (b - a)) * n;
  const i = Math.floor(p);
  const f = p - i;
  return [(i + EO(Math.min(1, f * 2.4))) / n, Math.exp(-f * 6)];
};

const FALLS: Record<ColId, [number, number, number] | null> = {
  claude: [24.8, 27.4, 6],
  chatgpt: [27.6, 29.0, 4],
  glm: [29.2, 30.4, 3],
  kimi: [30.6, 31.8, 3],
  deepseek: null,
};

type Hero = { x: number; y: number; lift: number; h: number; ghost: number; flash: number; on: number; value: number; perTask: number; stage: number };

// Claude per task when only 1% of the plan's limit is used: $200 buys $117 of API use (0.59×), so $5.98 ÷ 0.586.
const LIGHT_USE = 10.2;

const heroAt = (bar: number, c: (typeof COLS)[number], i: number): Hero => {
  const id = c.id;
  const rise = r(bar, 6.2 + i * 0.15, 6.9 + i * 0.15, EO);
  const sink = r(bar, 54.3 + i * 0.06, 55.0 + i * 0.06);
  const out = r(bar, 14.4 + FLY_OFF[id], 16.4 + FLY_OFF[id]);
  const home = r(bar, 49.9 + FLY_OFF[id], 51.7 + FLY_OFF[id]);
  const stage = out * (1 - home);
  const slot = stageSlot(SLOT[id]);
  const x = lerp(c.at[0], slot[0], stage);
  const y = lerp(c.at[1], slot[1], stage);
  const lift = Math.sin(Math.PI * out) * 260 * (1 - home) + Math.sin(Math.PI * home) * 260;

  // value in the current pass and the pass's scale
  const perTask = r(bar, 16.5, 17.4);
  let value = PRICE[id];
  let ghost = 0;
  let flash = 0;
  const fall = FALLS[id];
  let task = TASK[id];
  if (fall) {
    const [p, fl] = steps(bar, fall[0], fall[1], fall[2]);
    task = TASK[id] + (PLAN[id] - TASK[id]) * p;
    flash = bar > fall[0] && bar < fall[1] ? fl : 0;
    if (bar > fall[0] && bar < 33.8) ghost = TASK[id] * KT * (1 - r(bar, 33.2, 33.8));
  }
  if (id === "claude" && bar > 47.5) {
    // the light user: the same plan used at 1% of its limit costs more per task than paying per use
    const [up, fl] = steps(bar, 47.5, 48.4, 3);
    task = lerp(lerp(PLAN.claude, LIGHT_USE, up), PLAN.claude, r(bar, 49.4, 49.9));
    if (bar < 49.4) flash = Math.max(flash, fl);
  }
  if (id === "claude" && bar > 47.3 && bar < 50.0) ghost = TASK.claude * KT * Math.min(r(bar, 47.3, 47.6), 1 - r(bar, 49.6, 50.0));
  const zoom = 1 + 4 * r(bar, 33.4, 34.4) - 4 * r(bar, 46.0, 46.8);
  value = perTask < 0.5 ? PRICE[id] : task;
  const h = lerp(PRICE[id] * KP, task * KT * zoom, perTask) * rise * (1 - sink);
  return { x, y, lift, h, ghost: ghost * zoom * (1 - sink), flash, on: rise * (1 - sink), value, perTask, stage };
};

// ---------- the lines ----------

type L = { at: number; out: number; parts: Part[]; size?: number; weight?: number; serif?: boolean };
// A block of lines placed either on the sea (a map point, follows the camera) or on the screen.
const Block: React.FC<{ cam: Cam; sea?: [number, number]; screen?: [number, number]; lines: L[]; align?: "center" | "left" }> = ({ cam, sea, screen, lines, align = "center" }) => {
  let x = 960;
  let y = 540;
  if (sea) {
    const [sx, sy] = toScreen(cam, sea[0], sea[1], 0);
    x = Math.max(300, Math.min(1620, sx));
    y = Math.max(130, Math.min(960, sy));
  } else if (screen) [x, y] = screen;
  return (
    <div
      style={{
        position: "absolute",
        left: align === "center" ? x - 960 : x,
        top: y,
        width: align === "center" ? 1920 : undefined,
        display: "flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : "flex-start",
        gap: 10,
        transform: "translateY(-50%)",
      }}
    >
      {lines.map((l, i) => (
        <Line key={i} at={sec(l.at)} out={sec(l.out)} parts={l.parts} size={l.size ?? 60} weight={l.weight} serif={l.serif} />
      ))}
    </div>
  );
};

const g = (t: string): Part => ({ t, c: K.gold });

const APPS: { name: string; at: [number, number]; dy: number }[] = [
  { name: "豆包", at: [CITY.beijing[0] - 300, CITY.beijing[1] + 700], dy: 0 },
  { name: "DeepSeek", at: [CITY.hangzhou[0] + 900, CITY.hangzhou[1] - 250], dy: 0 },
  { name: "元宝", at: [CITY.shenzhen[0] + 300, CITY.shenzhen[1] - 500], dy: 0 },
  { name: "Kimi", at: [CITY.beijing[0] + 1000, CITY.beijing[1] + 350], dy: 0 },
  { name: "通义千问", at: [CITY.shanghai[0] + 700, CITY.shanghai[1] + 1700], dy: 0 },
  { name: "文心一言", at: [CITY.beijing[0] + 2100, CITY.beijing[1] + 1150], dy: 0 },
  { name: "ChatGPT", at: [CITY.sf[0] - 400, CITY.sf[1] + 500], dy: 0 },
  { name: "Gemini", at: [CITY.sf[0] + 300, CITY.sf[1] - 520], dy: 0 },
];

// ---------- the film ----------

export const Film10: React.FC = () => {
  const frame = useCurrentFrame();
  const bar = barAt(frame);
  const t = frame / FPS;
  const cam = camAt(bar);
  const wide = clamp01((0.26 - cam.z) / (0.26 - 0.15));

  // columns
  const cols: MapState["cols"] = {};
  const heroes = COLS.map((c, i) => [c, heroAt(bar, c, i)] as const);
  for (const [c, h] of heroes) cols[c.id] = { h: h.h, ghost: h.ghost, flash: h.flash, on: h.on, x: h.x, y: h.y, lift: h.lift, hi: c.id === "claude" && bar > 21 && bar < 41 ? 0.25 : 0 };
  const bgGlow = lerp(0.5, 0.24, r(bar, 14.4, 16.4)) + 0.08 * r(bar, 49.9, 51.3);
  BG.forEach((b, i) => {
    const on = r(bar, 6.3 + (i % 9) * 0.08, 7.0 + (i % 9) * 0.08, EO) * (1 - r(bar, 54.3, 55.0));
    cols[b.id] = { h: b.price * KP * on, on, glow: bgGlow };
  });
  const hook = r(bar, 1.3, 2.2, EO) * (1 - r(bar, 4.0, 4.6)) + r(bar, 76.2, 77.0, EO) * (1 - r(bar, 85.5, 86));
  cols[HOOK_COL.id] = { h: 1400 * hook, on: hook > 0.001 ? 1 : 0, hi: 0.4 };
  const gptRise = r(bar, 63.3, 64.1, EO) * (1 - r(bar, 69.6, 70.2));
  const year = lerp(2023.2, 2026.8, r(bar, 64.6, 67.2, (v) => v));
  const gptV = 60 / Math.pow(13, year - 2023.2);
  cols[GPT4_COL.id] = { h: gptV * KP * gptRise, on: gptRise > 0.001 ? 1 : 0, hi: 0.2, x: STAGE_PT[0], y: STAGE_PT[1] };

  const dim =
    r(bar, -0.2, 0.3, (v) => v) *
    (1 - 0.4 * r(bar, 4.0, 4.5) * (1 - r(bar, 5.6, 6.2))) *
    (1 - 0.75 * r(bar, 54.8, 55.8) * (1 - r(bar, 61.6, 62.4))) *
    (1 - 0.6 * r(bar, 80.8, 81.4));
  const spark = Math.max(r(bar, 0.1, 0.9) * (1 - r(bar, 3.4, 4.2)), 0.7 * r(bar, 50.0, 50.6) * (1 - r(bar, 51.5, 52.1)), r(bar, 67.4, 68.4) * (1 - 0.7 * r(bar, 70, 72)));
  const lights = 1 + 0.7 * r(bar, 67.4, 69.2) - 0.3 * r(bar, 70, 72) + 0.25 * r(bar, 72, 76);
  const s: MapState = { cam, cols, dim, lights, spark, land: 1, bloom: 0.62, time: t };

  const labelO = (lo: number, hi: number) => Math.min(r(bar, lo, lo + 0.25), 1 - r(bar, hi - 0.25, hi));
  const heroLabelO = labelO(6.8, 50.1) * (1 - r(bar, 40.0, 40.4) * (1 - r(bar, 46.8, 47.2)));
  const onStage = (st: number) => st > 0.98;

  // notes under the heroes' numbers, one at a time where they would crowd
  const NOTES: Partial<Record<ColId, [number, number, React.ReactNode][]>> = {
    claude: [
      [47.4, 49.6, <span>如果一个月只用了上限的 1%</span>],
    ],
    chatgpt: [[27.4, 29.4, <span>同样 $200 · 15 倍</span>]],
    glm: [[29.0, 30.8, <span>包月最多 13 倍</span>]],
    kimi: [[30.4, 32.2, <span>包月约 2.8 倍（实测）</span>]],
    deepseek: [[31.8, 33.6, <span>没有包月</span>]],
  };

  const unitO = Math.min(r(bar, 8.2, 8.5), 1 - r(bar, 16.3, 16.6));
  const taskUnitO = Math.min(r(bar, 17.2, 17.5), 1 - r(bar, 39.8, 40.2));

  return (
    <AbsoluteFill style={{ background: K.bg }}>
      <Audio src={staticFile("music-ep1.wav")} volume={(f) => 0.82 * interpolate(f, [bf(80.4), bf(82.4)], [1, 0.0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      <World s={s} />
      <AbsoluteFill>
        {/* city names in the wide shots */}
        {(
          [
            ["北京", CITY.beijing, 26],
            ["杭州", CITY.hangzhou, 22],
            ["上海", CITY.shanghai, 22],
            ["深圳", CITY.shenzhen, 22],
            ["旧金山", CITY.sf, 26],
          ] as const
        ).map(([n, p, dy]) => (
          <CityLabel key={n} cam={cam} o={wide * labelO(0.2, 85) * (1 - r(bar, 55.4, 55.8) * (1 - r(bar, 61.8, 62.4)))} x={p[0]} y={p[1]} name={n} dy={dy} />
        ))}

        {/* background models: names in the skyline tour, placed greedily so no two overlap */}
        {(() => {
          const o = labelO(7.4, 13.2) * clamp01((cam.z - 0.2) / 0.06);
          if (o <= 0.01) return null;
          const taken: [number, number, number, number][] = heroes
            .filter(([, h]) => h.on > 0.5)
            .map(([, h]) => {
              const [hx, hy] = toScreen(cam, h.x, h.y, h.h + h.lift);
              return [hx - 90, hy - 110, hx + 90, hy + 4];
            });
          const out: React.ReactNode[] = [];
          [...BG].sort((p, q) => q.price - p.price).forEach((b) => {
            const [sx, sy, vis] = toScreen(cam, b.at[0], b.at[1], b.price * KP);
            if (!vis || sx < 40 || sx > 1880 || sy < 120) return;
            const w = b.name.length * 12 + 12;
            const box: [number, number, number, number] = [sx - w / 2, sy - 36, sx + w / 2, sy - 8];
            if (taken.some((q) => box[0] < q[2] && box[2] > q[0] && box[1] < q[3] && box[3] > q[1])) return;
            taken.push(box);
            out.push(
              <div key={b.id} style={{ position: "absolute", left: sx, top: sy - 10, transform: "translate(-50%, -100%)", fontFamily: FONT, fontSize: 21, fontWeight: 600, color: "rgba(214,216,224,0.8)", whiteSpace: "nowrap", textShadow: SHADOW, opacity: o }}>
                {b.name}
              </div>,
            );
          });
          return out;
        })()}

        {/* the five */}
        {heroes.map(([c, h]) => {
          if (h.on <= 0.01) return null;
          const stageNow = onStage(h.stage);
          const flying = h.stage > 0.02 && h.stage < 0.98;
          const note = (NOTES[c.id] ?? []).find(([a, b]) => bar > a - 0.1 && bar < b + 0.1);
          const noteO = note ? Math.min(r(bar, note[0], note[0] + 0.25), 1 - r(bar, note[1] - 0.25, note[1])) : 0;
          const iqO = Math.min(r(bar, 17.6, 17.9), 1 - r(bar, 23.6, 23.9));
          const sub =
            noteO > 0 ? (
              <span style={{ opacity: noteO }}>{note![2]}</span>
            ) : iqO > 0 ? (
              <span style={{ opacity: iqO }}>智能指数 {IQ[c.id]}</span>
            ) : undefined;
          return (
            <ColLabel
              key={c.id}
              cam={cam}
              o={heroLabelO * (flying ? 0.3 : 1) * (c.id === "claude" ? 1 : 1 - Math.min(r(bar, 47.1, 47.4), 1 - r(bar, 49.7, 50.0)))}
              x={h.x}
              y={h.y}
              h={h.h + h.lift}
              name={c.name}
              value={money(h.value)}
              sub={sub}
              color={c.color}
              side={stageNow ? "center" : c.side}
              size={stageNow ? 42 : 34}
            />
          );
        })}

        {/* the per-use price, as a mark beside Claude while the light user's column passes it */}
        {(() => {
          const o = Math.min(r(bar, 47.4, 47.7), 1 - r(bar, 49.5, 49.8));
          if (o <= 0) return null;
          const [, h] = heroes[1];
          const [sx, sy] = toScreen(cam, h.x, h.y, TASK.claude * KT);
          return (
            <div style={{ position: "absolute", left: sx - 260, top: sy, width: 520, height: 0, borderTop: "2px dashed rgba(244,240,232,0.75)", opacity: o }}>
              <div style={{ position: "absolute", right: 0, top: -40, fontFamily: FONT, fontSize: 28, fontWeight: 800, color: K.fg, whiteSpace: "nowrap", textShadow: SHADOW }}>按量付钱：$5.98</div>
            </div>
          );
        })()}

        {/* the $200 column and GPT-4 */}
        {hook > 0.3 ? (
          <ColLabel cam={cam} o={Math.min(r(bar, 1.7, 2.0), 1 - r(bar, 3.9, 4.2)) + Math.min(r(bar, 76.6, 76.9), 1 - r(bar, 80.8, 81.1))} x={HOOK_COL.at[0]} y={HOOK_COL.at[1]} h={1400 * hook} name="有人的 AI 账单" value="$200 / 月" color={K.gold} size={40} />
        ) : null}
        {gptRise > 0.3 ? (
          <ColLabel cam={cam} o={Math.min(r(bar, 63.8, 64.1), 1 - r(bar, 69.4, 69.8))} x={STAGE_PT[0]} y={STAGE_PT[1]} h={gptV * KP * gptRise} name={`GPT-4 · ${Math.floor(year)} 年`} value={gptV >= 1 ? `$${gptV.toFixed(gptV >= 10 ? 0 : 1)}` : `$${gptV.toFixed(2)}`} sub={<span>每百万输出 token</span>} color="#e8e2d4" size={42} />
        ) : null}

        {/* ---- opening ---- */}
        <FreeApps cam={cam} a={0.2} b={3.0} apps={APPS} />
        <Block cam={cam} sea={[-200, -150]} lines={[{ at: 0.3, out: 2.9, parts: ["免费的 AI，到处都是"], size: 66 }]} />
        <Block cam={cam} sea={[-200, -1500]} lines={[{ at: 1.5, out: 2.9, parts: ["可有人，每个月花 ", g("200 美元"), " 用 AI"], size: 66 }]} />
        <Block cam={cam} screen={[960, 500]} lines={[{ at: 2.95, out: 4.05, parts: [g("为什么？")], size: 120, weight: 900 }]} />
        <Title a={4.15} b={5.95} />

        {/* ---- list prices ---- */}
        <Block cam={cam} screen={[1290, 190]} lines={[
          { at: 6.2, out: 8.3, parts: ["先看标价"], size: 64 },
          { at: 6.5, out: 8.3, parts: ["AI 按 token 收钱，1 个 token 大约 1 个汉字"], size: 38, weight: 700 },
        ]} />
        <TokenChips a={6.7} b={8.3} x={1290} y={330} />
        <div style={{ position: "absolute", left: 960, top: 70, transform: "translateX(-50%)", opacity: unitO, fontFamily: FONT, fontSize: 32, fontWeight: 700, color: K.sub, textShadow: SHADOW, whiteSpace: "nowrap" }}>
          每 100 万个输出 token（约 100 万字）的标价（美元）
        </div>
        <Block cam={cam} sea={[-200, -900]} lines={[{ at: 13.0, out: 14.5, parts: ["最贵的，是最便宜的 ", g("40 多倍")], size: 72 }]} />

        {/* ---- one task ---- */}
        <Block cam={cam} sea={[-200, -1100]} lines={[{ at: 14.3, out: 16.5, parts: ["可 AI 干活，不按字算，按事算"], size: 64 }]} />
        <Block cam={cam} sea={[0, -640]} lines={[{ at: 16.6, out: 19.0, parts: ["同一道难题，有的 AI 想得久、写得长，用掉的 token 多"], size: 48 }]} />
        <div style={{ position: "absolute", left: 960, top: 70, transform: "translateX(-50%)", opacity: taskUnitO, fontFamily: FONT, fontSize: 32, fontWeight: 700, color: K.sub, textShadow: SHADOW, whiteSpace: "nowrap" }}>
          做一道高难度考题的花费（美元）
        </div>
        <Block cam={cam} sea={[0, -640]} lines={[
          { at: 19.1, out: 21.0, parts: ["按量付钱，DeepSeek 便宜得没有对手"], size: 54 },
          { at: 19.6, out: 21.0, parts: ["Claude 是它的 ", g("23 倍")], size: 70, weight: 900 },
        ]} />

        {/* ---- plans ---- */}
        <Block cam={cam} sea={[0, -640]} lines={[{ at: 21.1, out: 24.4, parts: ["可天天用 AI 干活的人，大多不按量付钱，是", g("包月"), "的"], size: 56 }]} />
        <PlanBill
          a={22.2}
          b={24.6}
          left={100}
          top={150}
          rows={[
            { at: 22.3, left: "Claude 最贵的包月", right: "$200 / 月" },
            { at: 22.9, left: "每周都用到上限，能用掉", right: "$11,700" },
            { at: 23.5, left: "相当于", right: "59 倍", gold: true },
          ]}
        />
        {bar > 33.5 && bar < 46.4 ? (
          <div style={{ position: "absolute", right: 64, top: 120, fontFamily: FONT, opacity: Math.min(r(bar, 33.5, 33.9), 1 - r(bar, 45.9, 46.3)) }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: K.sub, border: `1.5px solid ${K.sub}`, borderRadius: 6, padding: "4px 14px" }}>柱高放大 5 倍</span>
          </div>
        ) : null}
        <Block cam={cam} screen={[960, 250]} lines={[
          { at: 35.2, out: 40.2, parts: ["做一道题最贵的 Claude，用满包月"], size: 54 },
          { at: 38.0, out: 40.2, parts: ["反而", g("比 DeepSeek 还便宜")], size: 84, weight: 900 },
          { at: 38.8, out: 40.2, parts: ["2026 年 10 月的价格；排名，每个月都在变"], size: 30, weight: 600 },
        ]} />

        {/* ---- the gym ---- */}
        <Gym cam={cam} a={41.6} b={47.0} dimAt={42.8} pulseAt={45.0} center={[0, -1700]} gap={230} />
        <Block cam={cam} screen={[960, 150]} lines={[{ at: 40.3, out: 41.4, parts: ["凭什么给 59 倍？"], size: 66 }]} />
        <Block cam={cam} screen={[960, 150]} lines={[{ at: 41.5, out: 42.7, parts: ["包月，其实是一张", g("健身卡")], size: 66 }]} />
        <Block cam={cam} screen={[960, 170]} lines={[
          { at: 42.8, out: 44.9, parts: ["会碰到每周上限的人，", g("不到 5%")], size: 58 },
          { at: 43.7, out: 44.9, parts: ["大多数人，办了卡，不常来"], size: 48, weight: 700 },
        ]} />
        <Block cam={cam} screen={[960, 170]} lines={[
          { at: 45.0, out: 46.9, parts: ["天天来的人，公司是亏的"], size: 58 },
          { at: 45.5, out: 46.9, parts: ["“200 美元的套餐，在亏钱。” —— OpenAI CEO 奥特曼"], size: 36, weight: 600 },
        ]} />
        <Note at={sec(42.8)} out={sec(46.9)}>Anthropic 2025 年 7 月宣布每周上限时的说明；奥特曼 2025 年 1 月</Note>
        <Block cam={cam} sea={[200, -700]} lines={[
          { at: 47.1, out: 49.9, parts: ["包月的真实价格 ＝ 月费 ÷ 你用掉的"], size: 56 },
          { at: 48.6, out: 49.9, parts: ["用不到上限的 1.7%，包月比按量付钱", g("还贵")], size: 56 },
        ]} />

        {/* ---- free quotas and relays ---- */}
        <Block cam={cam} sea={[-200, -1300]} lines={[
          { at: 50.3, out: 51.9, parts: ["各家送的免费额度，是", g("体验卡")], size: 60 },
          { at: 50.8, out: 51.9, parts: ["限量、限速，先让你进门"], size: 46, weight: 700 },
        ]} />
        <RelayArc
          cam={cam}
          a={51.9}
          b={54.6}
          from={CITY.sf}
          to={CITY.shanghai}
          peak={2600}
          tags={[
            { t: 0.06, at: 52.2, text: "官方按量价：100%", color: "#f4f0e8" },
            { t: 0.5, at: 52.7, text: "中转站：约 22%", color: "#ffb27a" },
            { t: 0.94, at: 53.2, text: "自己办卡用满：1.7%", color: K.gold },
          ]}
        />
        <Block cam={cam} sea={[-200, -1400]} lines={[
          { at: 52.0, out: 54.6, parts: ["有人专门办卡、刷满，拆开转卖：", g("中转站")], size: 54 },
          { at: 53.5, out: 54.6, parts: ["还可能封号、掺水"], size: 42, weight: 700 },
        ]} />

        {/* ---- your time ---- */}
        <Block cam={cam} screen={[960, 540]} lines={[{ at: 54.7, out: 55.7, parts: ["账单上，还漏了一行"], size: 72 }]} />
        <Block cam={cam} screen={[960, 250]} lines={[{ at: 55.8, out: 58.1, parts: ["AI 做完，你要检查；做错了，返工"], size: 52 }]} />
        <CheckRework a={55.7} b={58.1} x={960} y={600} />
        <TwoBills a={58.0} b={62.2} x={960} y={480} />
        <Block cam={cam} screen={[960, 880]} lines={[{ at: 60.4, out: 62.2, parts: ["差出来的，不是几毛钱 token，是你的 ", g("7 分钟")], size: 56 }]} />
        <Note at={sec(58.0)} out={sec(62.2)}>估算：做对比例取 Artificial Analysis Terminal-Bench 4.0（DeepSeek 34%、Claude 60%）；每次检查 5 分钟；全国城镇平均时薪约 ¥62（$9.2）</Note>

        {/* ---- zoom out ---- */}
        <Block cam={cam} sea={[-200, -900]} lines={[
          { at: 62.3, out: 63.5, parts: ["把时间拉回三年前"], size: 64 },
        ]} />
        <BigCounter a={63.4} b={67.5} x={430} y={250} text={`${Math.floor(year)}`} size={110} />
        <Block cam={cam} sea={[-200, -1100]} lines={[{ at: 63.6, out: 64.8, parts: ["2023 年，最好的 GPT-4：每百万输出 token ", g("$60")], size: 54 }]} />
        <Block cam={cam} sea={[-200, -1100]} lines={[{ at: 64.9, out: 67.4, parts: ["同样聪明的 AI，每年便宜约 ", g("13 倍")], size: 60 }]} />
        <Note at={sec(64.9)} out={sec(67.4)}>Epoch AI《The plunging price of thought》，2026 年 9 月</Note>
        <BigCounter
          a={67.5}
          b={70.1}
          x={960}
          y={250}
          text={(() => {
            const k = r(bar, 67.7, 69.2, EIO);
            const v = 1000 * Math.pow(1400, k); // 亿
            return v >= 10000 ? `${(v / 10000).toFixed(v >= 100000 ? 0 : 1)} 万亿` : `${Math.round(v).toLocaleString("en-US")} 亿`;
          })()}
          sub={<span>中国每天用掉的 token（国家数据局：2024 年初 → 2026 年 3 月）</span>}
          size={96}
          color={K.gold}
        />
        <Block cam={cam} sea={[-200, -1100]} lines={[{ at: 67.6, out: 70.1, parts: ["可全世界，用得更多了：两年涨了 ", g("1,000 多倍")], size: 58 }]} />

        {/* ---- what does not get cheaper ---- */}
        <Block cam={cam} screen={[960, 420]} lines={[{ at: 70.3, out: 71.7, parts: ["可有一样东西，不会每年便宜 13 倍"], size: 62 }]} />
        <Block cam={cam} screen={[960, 440]} lines={[{ at: 71.8, out: 73.4, parts: ["你的一小时"], size: 128, serif: true, weight: 700 }]} />
        <Block cam={cam} screen={[960, 440]} lines={[{ at: 73.5, out: 75.9, parts: ["AI 越便宜，账单上越贵的，", g("是你")], size: 70 }]} />
        <Block cam={cam} sea={[-200, -1100]} lines={[
          { at: 76.4, out: 79.5, parts: ["那个每月花 200 美元的人，不是钱多"], size: 58 },
          { at: 77.6, out: 79.5, parts: [g("对他来说，这是最便宜的 AI")], size: 72, weight: 900 },
        ]} />
        <Block cam={cam} screen={[960, 500]} lines={[{ at: 79.6, out: 81.3, parts: ["那你的一小时，值多少？"], size: 84, serif: true, weight: 700 }]} />

        <NextEp a={81.3} b={82.7} />
        <Sources a={82.6} b={84.0} />
        <EndCard at={83.9} />
        <BrandMark o={labelO(0.1, 81.2) * (1 - 0.7 * r(bar, 4.0, 4.3) * (1 - r(bar, 5.7, 6.0)))} />
        <Note at={sec(8.4)} out={sec(13.2)}>主角是五家的旗舰（官方价）；暗色的是其他模型（OpenRouter 标价）</Note>
        <Note at={sec(17.4)} out={sec(23.8)}>Artificial Analysis 智能指数：每道题的平均花费，各模型最强档（2026-10）。按量付钱＝开发者和 AI 工具调用模型的价格，聊天 App 另算</Note>
        <Note at={sec(27.2)} out={sec(33.6)}>包月按每周都用满折算：Claude、ChatGPT 取 SemiAnalysis；Kimi 取科技博主 10 月 24 日实测；智谱取各档上限</Note>
        <Note at={sec(52.1)} out={sec(54.6)}>中转站按常见的"1 元 1 美元额度、1.5 倍率"计；自己办 Claude Max 按每周都用满计</Note>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
