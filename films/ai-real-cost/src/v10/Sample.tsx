// 12-second look test for v10: the subscription pass. The five columns stand at their per-task API cost, the camera
// flies to San Francisco, Claude's column falls step by step to its subscription price, ChatGPT follows, and the
// camera pulls back across the Pacific to show who stayed tall.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Cam, mixCam } from "./camera";
import { MapState } from "./engine";
import { CITY, COLS, ColId, PLAN, TASK } from "./geo";
import { K } from "./theme";
import { At, BrandMark, CityLabel, clamp01, ColLabel, EIO, EO, fade, FPS, lerp, Line, money, Note, ramp } from "./ui";
import { World } from "./World";

export const SAMPLE_FRAMES = 12 * FPS;

const KM_PER_USD = 260;

const WIDE: Cam = { x: -250, y: 400, z: 0.124, bearing: 0, tilt: 54, oy: 640 };
const SF: Cam = { x: 5200, y: 150, z: 0.33, bearing: -12, tilt: 66, oy: 960 };
const SF2: Cam = { ...SF, z: 0.35, bearing: -8 };
const END: Cam = { x: -120, y: 380, z: 0.122, bearing: 0, tilt: 57, oy: 650 };

const camAt = (t: number): Cam => {
  if (t < 0.8) return WIDE;
  if (t < 3.4) return mixCam(WIDE, SF, ramp(t, 0.8, 3.4, EIO));
  if (t < 6.4) return mixCam(SF, SF2, ramp(t, 3.4, 6.4, (v) => v));
  return mixCam(SF2, END, ramp(t, 6.4, 9.8, EIO));
};

// A fall in `n` steps between t0 and t1: each step drops quickly, then holds. Returns [progress 0..1, flash 0..1].
const steps = (t: number, t0: number, t1: number, n: number): [number, number] => {
  if (t <= t0) return [0, 0];
  if (t >= t1) return [1, 0];
  const p = ((t - t0) / (t1 - t0)) * n;
  const i = Math.floor(p);
  const f = p - i;
  const drop = EO(Math.min(1, f * 2.4));
  return [(i + drop) / n, Math.exp(-f * 7)];
};

const FALLS: Partial<Record<ColId, [number, number, number]>> = {
  claude: [3.8, 5.6, 6],
  chatgpt: [5.3, 6.5, 4],
  glm: [7.0, 7.9, 3],
};

// Label leaders in the wide shots, where the Beijing pair and Hangzhou crowd each other: [lift, dx] (px).
const WIDE_LEADER: Partial<Record<ColId, [number, number]>> = {
  kimi: [70, -20],
  glm: [70, 20],
  deepseek: [16, 150],
};

export const Sample: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cam = camAt(t);
  const wide = clamp01((0.3 - cam.z) / (0.3 - 0.15));

  const value: Record<ColId, number> = { ...TASK };
  const cols: MapState["cols"] = {};
  for (const c of COLS) {
    const fall = FALLS[c.id];
    let v = TASK[c.id];
    let flash = 0;
    let ghost = 0;
    if (fall) {
      const [p, fl] = steps(t, fall[0], fall[1], fall[2]);
      v = TASK[c.id] + (PLAN[c.id] - TASK[c.id]) * p;
      flash = t > fall[0] && t < fall[1] ? fl : 0;
      ghost = t > fall[0] ? TASK[c.id] * KM_PER_USD : 0;
    }
    value[c.id] = v;
    cols[c.id] = { h: v * KM_PER_USD, ghost, on: 1, flash, hi: c.id === "claude" ? 0.25 : 0 };
  }

  const s: MapState = { cam, cols, dim: ramp(t, 0, 0.6, (v) => v) * (1 - ramp(t, 11.5, 12, (v) => v)), lights: 1, land: 1, bloom: 0.62, time: t };
  const labelO = fade(t, 0.3, 11.7, 0.4);

  const sub: Partial<Record<ColId, React.ReactNode>> = {
    claude: t > 2.6 ? <span style={{ opacity: ramp(t, 2.6, 3.0, EO) * (1 - ramp(t, 6.8, 7.3, EO)) }}>包月 $200 · 用满约 $11,700 · <b style={{ color: K.gold }}>59 倍</b></span> : undefined,
    chatgpt: t > 5.0 ? <span style={{ opacity: ramp(t, 5.0, 5.4, EO) * (1 - ramp(t, 6.8, 7.3, EO)) }}>包月 $200 · 15 倍</span> : undefined,
    glm: t > 6.8 ? <span style={{ opacity: ramp(t, 6.8, 7.2, EO) }}>编程包月 最多 13 倍</span> : undefined,
    deepseek: t > 7.4 ? <span style={{ opacity: ramp(t, 7.4, 7.8, EO) }}>没有包月</span> : undefined,
    kimi: t > 7.8 ? <span style={{ opacity: ramp(t, 7.8, 8.2, EO) }}>包月能用多少：还没有公开测算</span> : undefined,
  };

  return (
    <AbsoluteFill style={{ background: K.bg }}>
      <World s={s} />
      <AbsoluteFill>
        <CityLabel cam={cam} o={labelO * wide} x={CITY.beijing[0]} y={CITY.beijing[1]} name="北京" dy={22} />
        <CityLabel cam={cam} o={labelO * wide} x={CITY.hangzhou[0]} y={CITY.hangzhou[1]} name="杭州" dy={20} />
        <CityLabel cam={cam} o={labelO * wide} x={CITY.sf[0]} y={CITY.sf[1]} name="旧金山" dy={22} />
        {COLS.map((c) => {
          const wl = WIDE_LEADER[c.id] ?? [34, 0];
          return (
            <ColLabel
              key={c.id}
              cam={cam}
              o={labelO}
              x={c.at[0]}
              y={c.at[1]}
              h={cols[c.id]!.h}
              name={c.name}
              value={money(value[c.id])}
              sub={sub[c.id]}
              color={c.color}
              side={c.side}
              lift={lerp(34, wl[0], wide)}
              dx={lerp(0, wl[1], wide)}
            />
          );
        })}
        <At x={960} y={92} align="center">
          <Line at={0.4} out={6.6} parts={["可大多数人，不按次付钱，是", { t: "包月", c: K.gold }, "的"]} size={62} />
        </At>
        <At x={960} y={84} align="center" gap={6}>
          <Line at={7.9} out={12.2} parts={["做一道题最贵的 Claude，用满包月"]} size={56} />
          <Line at={8.6} out={12.2} parts={["反而", { t: "比 DeepSeek 还便宜", c: K.gold }]} size={76} weight={900} />
        </At>
        <Note at={0.5} out={11.7}>柱高：做一道题的花费（美元）。Artificial Analysis 智能指数，各模型最强档；包月按用满折算</Note>
        <BrandMark o={fade(t, 0.3, 11.7, 0.4)} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
