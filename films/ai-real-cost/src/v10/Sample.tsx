// 15-second look test for v10, second pass. Both coasts stand as skylines of models (five protagonists plus the
// rest of the market, dimmed); the five fly out to a stage in the middle of the Pacific and line up side by side;
// on the stage the subscription pass drops them, then the vertical scale is magnified ten times so the small ones
// can be compared. Lines sit in the empty ocean in front of the stage, not pinned to the top of the frame.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Cam, mixCam, toScreen } from "./camera";
import { MapState } from "./engine";
import { BG, CITY, COLS, ColId, PLAN, stageSlot, TASK } from "./geo";
import { FONT, K } from "./theme";
import { BrandMark, CityLabel, clamp01, ColLabel, EIO, EO, fade, FPS, lerp, Line, money, Note, ramp } from "./ui";
import { World } from "./World";

export const SAMPLE_FRAMES = 15 * FPS;

const KM_PER_USD = 260;

// Slots on the stage keep geography: China's three on the west (left), America's two on the east (right).
const SLOT: Record<ColId, number> = { deepseek: 0, glm: 1, kimi: 2, chatgpt: 3, claude: 4 };
const FLY: Record<ColId, number> = { deepseek: 2.7, glm: 2.85, kimi: 3.0, chatgpt: 2.75, claude: 2.9 }; // start, s
const FLY_S = 2.4;

const WIDE: Cam = { x: -250, y: 420, z: 0.124, bearing: 0, tilt: 54, oy: 600 };
const STAGE_CAM: Cam = { x: 0, y: 260, z: 0.34, bearing: 0, tilt: 64, oy: 760 };
const STAGE_CLOSE: Cam = { x: 0, y: 260, z: 0.37, bearing: 0, tilt: 67, oy: 780 };

const camAt = (t: number): Cam => {
  if (t < 2.8) return WIDE;
  if (t < 5.8) return mixCam(WIDE, STAGE_CAM, ramp(t, 2.8, 5.8, EIO));
  return mixCam(STAGE_CAM, STAGE_CLOSE, ramp(t, 5.8, 15, (v) => v));
};

// A fall in `n` steps between t0 and t1: each step drops quickly, then holds. Returns [progress 0..1, flash 0..1].
const steps = (t: number, t0: number, t1: number, n: number): [number, number] => {
  if (t <= t0) return [0, 0];
  if (t >= t1) return [1, 0];
  const p = ((t - t0) / (t1 - t0)) * n;
  const i = Math.floor(p);
  const f = p - i;
  return [(i + EO(Math.min(1, f * 2.4))) / n, Math.exp(-f * 7)];
};

const FALLS: Record<ColId, [number, number, number] | null> = {
  claude: [6.6, 8.4, 6],
  chatgpt: [8.0, 9.2, 4],
  kimi: [8.8, 9.8, 3],
  glm: [9.2, 10.0, 3],
  deepseek: null,
};

// A block of lines laid on the ocean: centred on the screen position of a map point.
const OnSea: React.FC<{ cam: Cam; x: number; y: number; children: React.ReactNode }> = ({ cam, x, y, children }) => {
  const [sx, sy] = toScreen(cam, x, y, 0);
  return (
    <div
      style={{
        position: "absolute",
        left: Math.max(260, Math.min(1660, sx)) - 960,
        top: Math.max(120, Math.min(980, sy)),
        width: 1920,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        transform: "translateY(-50%)",
      }}
    >
      {children}
    </div>
  );
};

export const Sample: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cam = camAt(t);
  const wide = clamp01((0.3 - cam.z) / (0.3 - 0.15));
  const zoom = 1 + 4 * ramp(t, 11.0, 12.4, EIO); // vertical magnification after the fall (×5)

  const value = { ...TASK };
  const pos = {} as Record<ColId, [number, number, number]>;
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
      ghost = t > fall[0] ? TASK[c.id] * KM_PER_USD * (1 - ramp(t, 10.6, 11.2, EIO)) : 0;
    }
    value[c.id] = v;
    const f = ramp(t, FLY[c.id], FLY[c.id] + FLY_S, EIO);
    const slot = stageSlot(SLOT[c.id]);
    const x = lerp(c.at[0], slot[0], f);
    const y = lerp(c.at[1], slot[1], f);
    const lift = Math.sin(Math.PI * f) * 260;
    pos[c.id] = [x, y, lift];
    cols[c.id] = { h: v * KM_PER_USD * zoom, ghost, on: 1, flash, x, y, lift };
  }
  const bgGlow = 0.42 * (1 - 0.45 * ramp(t, 3.2, 5.6, EIO));
  for (const b of BG) cols[b.id] = { h: b.price * 40, on: 1, glow: bgGlow };

  const s: MapState = { cam, cols, dim: ramp(t, 0, 0.6, (v) => v) * (1 - ramp(t, 14.5, 15, (v) => v)), lights: 1, land: 1, bloom: 0.62, time: t };
  const labelO = fade(t, 0.3, 14.7, 0.4);

  const sub: Partial<Record<ColId, React.ReactNode>> = {
    claude: t > 6.0 ? <span style={{ opacity: ramp(t, 6.0, 6.4, EO) }}>包月 $200 · 用满约 $11,700 · <b style={{ color: K.gold }}>59 倍</b></span> : undefined,
    chatgpt: t > 7.7 ? <span style={{ opacity: ramp(t, 7.7, 8.0, EO) }}>包月 $200 · 15 倍</span> : undefined,
    kimi: t > 8.5 ? <span style={{ opacity: ramp(t, 8.5, 8.8, EO) }}>包月约 3 倍（网友实测）</span> : undefined,
    glm: t > 8.9 ? <span style={{ opacity: ramp(t, 8.9, 9.2, EO) }}>包月最多 13 倍</span> : undefined,
    deepseek: t > 9.6 ? <span style={{ opacity: ramp(t, 9.6, 9.9, EO) }}>没有包月</span> : undefined,
  };
  // each note shows while its column falls and a beat after, so neighbours never crowd each other
  const NOTE: Record<ColId, [number, number]> = { claude: [6.0, 8.9], chatgpt: [7.7, 9.5], kimi: [8.5, 10.1], glm: [8.9, 10.4], deepseek: [9.6, 10.8] };
  const subO = (id: ColId) => fade(t, NOTE[id][0], NOTE[id][1], 0.3);

  return (
    <AbsoluteFill style={{ background: K.bg }}>
      <World s={s} />
      <AbsoluteFill>
        <CityLabel cam={cam} o={labelO * wide} x={CITY.beijing[0]} y={CITY.beijing[1]} name="北京" dy={22} />
        <CityLabel cam={cam} o={labelO * wide} x={CITY.hangzhou[0]} y={CITY.hangzhou[1]} name="杭州" dy={20} />
        <CityLabel cam={cam} o={labelO * wide} x={CITY.sf[0]} y={CITY.sf[1]} name="旧金山" dy={22} />
        {COLS.map((c) => {
          const [x, y, lift] = pos[c.id];
          const flying = t > FLY[c.id] && t < FLY[c.id] + FLY_S;
          return (
            <ColLabel
              key={c.id}
              cam={cam}
              o={labelO * (flying ? 0.35 : 1)}
              x={x}
              y={y}
              h={cols[c.id]!.h + lift}
              name={c.name}
              value={money(value[c.id])}
              sub={sub[c.id] && subO(c.id) > 0 ? <span style={{ opacity: subO(c.id) }}>{sub[c.id]}</span> : undefined}
              color={c.color}
              side={wide > 0.5 ? c.side : "center"}
              size={wide > 0.5 ? 34 : 40}
            />
          );
        })}

        <OnSea cam={cam} x={0} y={-150}>
          <Line at={0.5} out={2.9} parts={["五家的旗舰，做同一道难题"]} size={60} />
          <Line at={1.2} out={2.9} parts={["要花多少钱？"]} size={60} />
        </OnSea>
        <OnSea cam={cam} x={0} y={-640}>
          <Line at={5.6} out={10.4} parts={["可大多数人，不按次付钱，是", { t: "包月", c: K.gold }, "的"]} size={58} />
        </OnSea>
        <OnSea cam={cam} x={0} y={-640}>
          <Line at={10.6} out={15.2} parts={["做一道题最贵的 Claude，用满包月"]} size={52} />
          <Line at={11.3} out={15.2} parts={["反而", { t: "比 DeepSeek 还便宜", c: K.gold }]} size={72} weight={900} />
        </OnSea>
        {zoom > 1.05 ? (
          <div style={{ position: "absolute", right: 64, top: 120, fontFamily: FONT, opacity: ramp(t, 11.0, 11.6, EO) * labelO }}>
            <span style={{ fontSize: 26, fontWeight: 700, color: K.sub, border: `1.5px solid ${K.sub}`, borderRadius: 6, padding: "4px 12px" }}>柱高放大 5 倍</span>
          </div>
        ) : null}
        <Note at={0.5} out={14.7}>柱高：做一道题的花费（美元）。Artificial Analysis 智能指数，各模型最强档；包月按用满折算。暗色柱是其他模型</Note>
        <BrandMark o={labelO} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
