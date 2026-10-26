// v17 opening in the studio (SCRIPT.md v15.2, section 一): the same words as v16, now with a place, light and a
// camera that never stops. A macro on the Three-Body spines pulls back; beams of light run out from the books' feet
// along the mirror floor, the camera chases the longest; it rises to compare them; a gold price tag comes down on a
// string; the lights go out on "他算错了吗？"; then the strikethrough title.
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { bf, sec } from "../v10/bars";
import { Id, M, PRICE } from "../v13/data";
import { EIO, EO, FONT, GOLD, Grain, INK, lerp, MONO, ramp, rgba, useFonts } from "../v15/kit";
import { Studio } from "./Studio";
import { BEAM_UNIT, BEAM_X0, beamZ, Cam, project, StudioState } from "./stage";

export const HOOK17_FRAMES = bf(10.9);

const BARS = {
  q1: -0.14, beam0: 1.55, ds: 1.65, big: 2.8, gap: 4.0, plan: 5.2, said: 6.6, ask: 7.6,
  title: 8.6, strike: 9.0, swap: 9.3, sub: 9.7, end0: 10.5, end1: 10.9,
} as const;
const S = Object.fromEntries(Object.entries(BARS).map(([k, v]) => [k, sec(v)])) as Record<keyof typeof BARS, number>;

const ORDER = [...M].sort((a, b) => PRICE[a.id] - PRICE[b.id]); // cheapest first
const ROW: Record<Id, number> = Object.fromEntries(ORDER.map((m, i) => [m.id, 4 - i])) as Record<Id, number>; // cheapest in front
const YUAN: Record<Id, string> = { deepseek: "8", glm: "30", kimi: "68", claude: "134", chatgpt: "336" };
const TAG = { x: 6.0, z: 1.4 };

// ---------- the camera: one continuous move through the keyframes ----------
type Key = [number, [number, number, number], [number, number, number], number];
const KEYS: Key[] = [
  [0.0, [-0.3, 1.95, 2.9], [-0.9, 1.6, 0.2], 26],
  [3.4, [-0.2, 1.5, 6.4], [-1.4, 1.1, 0.3], 30],
  [4.7, [2.4, 1.05, 6.0], [1.5, 0.25, 3.3], 30],
  [6.5, [3.8, 2.7, 7.8], [3.4, 0.2, 2.2], 32],
  [8.3, [10.0, 2.3, 6.6], [10.4, 0.15, 1.2], 32],
  [9.9, [6.1, 11.5, 6.4], [6.1, 0.0, 2.05], 34],
  [11.4, [6.3, 11.1, 6.8], [6.1, 0.0, 2.05], 34],
  [12.6, [6.2, 3.6, 8.6], [6.0, 1.7, 1.4], 32],
  [14.4, [6.9, 2.3, 6.3], [TAG.x, 1.85, TAG.z], 30],
  [16.8, [4.9, 2.1, 6.0], [TAG.x - 1.7, 1.85, TAG.z], 30],
  [19.0, [4.6, 2.0, 5.4], [TAG.x - 1.9, 1.85, TAG.z], 30],
  [24.5, [4.4, 2.0, 5.0], [TAG.x - 2.1, 1.85, TAG.z], 30],
];
const posCurve = new THREE.CatmullRomCurve3(KEYS.map((k) => new THREE.Vector3(...k[1])), false, "centripetal");
const tgtCurve = new THREE.CatmullRomCurve3(KEYS.map((k) => new THREE.Vector3(...k[2])), false, "centripetal");
const camAt = (t: number): Cam => {
  let i = 0;
  while (i < KEYS.length - 2 && t > KEYS[i + 1][0]) i++;
  const [t0, , , f0] = KEYS[i];
  const [t1, , , f1] = KEYS[i + 1];
  const u = Math.max(0, Math.min(1, (t - t0) / (t1 - t0)));
  // ease each leg a little, so the move breathes without stopping dead at a key
  const e = 0.25 * u + 0.75 * EIO(u);
  const p = (i + e) / (KEYS.length - 1);
  const pos = posCurve.getPoint(p);
  const tgt = tgtCurve.getPoint(p);
  return { pos: [pos.x, pos.y, pos.z], target: [tgt.x, tgt.y, tgt.z], fov: lerp(f0, f1, e) };
};

const TXT =
  "让 AI 写一整套《三体》那么多字，要多少钱？约 88 万字块钱差了 40 多倍可就是这些贵的 AI，有人每个月花 200 美元包月还说：这是最便宜的 AI他算错了吗？" +
  "AI 的标价真实价格第 1 集 · 文字 AI智谱DeepSeekClaudeChatGPTKimi$0123456789.一整套《三体》约 88 万字，按一个 token 约等于一个字估算 · 价格：各家官方 API 输出价，人民币按 6.72 折算 · 2026 年 10 月";

export const Hook17: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  useFonts([`900 72px ${FONT}`, `700 30px ${FONT}`, `700 44px ${MONO}`, `900 150px ${FONT}`, `500 18px ${FONT}`], TXT);
  const cam = camAt(t);

  const grow = (id: Id, k: number) =>
    id === "deepseek" ? ramp(t, S.ds, S.ds + 1.0, EO) : ramp(t, S.big + k * 0.08, S.big + k * 0.08 + 1.3, EO);
  const dimForTag = 1 - 0.82 * ramp(t, S.plan, S.plan + 0.8);
  const dark = 1 - ramp(t, S.ask - 0.3, S.ask + 0.6);
  const gap = ramp(t, S.gap, S.gap + 0.5) * (1 - ramp(t, S.plan - 0.2, S.plan + 0.3));
  const beamLevel = (id: Id) => {
    const quiet = id === "glm" || id === "kimi" ? 0.55 : 1;
    const focus = gap > 0 ? 1 - gap * (id === "deepseek" || id === "chatgpt" ? 0 : 0.6) : 1;
    return quiet * focus * dimForTag * (0.25 + 0.75 * dark) * (1 - ramp(t, S.title - 0.2, S.title + 0.6) * 0.8);
  };
  const tagDrop = ramp(t, S.plan, S.plan + 1.3, EO);
  const swingT = Math.max(0, t - S.plan - 0.9);
  const state: StudioState = {
    cam,
    time: t,
    books: 1,
    key: lerp(1, 0.3, ramp(t, S.plan, S.plan + 0.8)) * dark,
    rim: lerp(1, 0.4, ramp(t, S.plan, S.plan + 0.8)) * (0.2 + 0.8 * dark),
    beams: M.map((m) => ({ len: PRICE[m.id] * BEAM_UNIT * grow(m.id, ROW[m.id]), level: beamLevel(m.id), color: m.color, row: ROW[m.id] })),
    tag: {
      x: TAG.x,
      z: TAG.z,
      y: lerp(10, 3.0, tagDrop),
      rotY: 0.35 * Math.sin(t * 0.45) - 0.2,
      swing: 0.12 * Math.exp(-swingT * 1.2) * Math.sin(swingT * 3.4),
      on: tagDrop > 0 ? 1 : 0,
      light: ramp(t, S.plan + 0.3, S.plan + 1.2) * (0.12 + 0.88 * dark),
    },
    bloom: 0.6,
    exposure: lerp(lerp(1, 0.75, ramp(t, S.ask - 0.3, S.ask + 0.6)), 0.45, ramp(t, S.title - 0.3, S.title + 0.6)),
    env: lerp(1, 0.12, ramp(t, S.ask - 0.3, S.ask + 0.6)),
  };

  // labels at the tips of the beams, in the scene
  const tipLabel = (m: (typeof M)[number], k: number) => {
    const L = PRICE[m.id] * BEAM_UNIT * grow(m.id, k);
    const g = grow(m.id, k);
    const p = project(cam, [BEAM_X0 + L, 0.05, beamZ(ROW[m.id])]);
    const quiet = m.id === "glm" || m.id === "kimi";
    // DeepSeek's 8 yuan has the stage to itself before the others arrive
    const big = m.id === "deepseek" ? lerp(88, 60, ramp(t, S.big - 0.2, S.big + 0.4)) : 62;
    const o = ramp(g, 0.55, 0.95, (v) => v) * dimForTag * dark * (gap > 0 && quiet ? 1 - 0.6 * gap : 1) * (quiet ? 0.7 : 1);
    if (o <= 0.01 || p.behind || p.x > 1880) return null;
    return (
      <div key={m.id} style={{ position: "absolute", left: p.x + 22, top: p.y - (quiet ? 30 : big * 0.85), opacity: o, whiteSpace: "nowrap", textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}>
        <div style={{ fontFamily: m.name === "智谱" ? FONT : MONO, fontWeight: 700, fontSize: quiet ? 22 : 26, color: m.color, lineHeight: "28px" }}>{m.name}</div>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: quiet ? 34 : big, color: INK, lineHeight: `${quiet ? 40 : big * 1.1}px` }}>
          <span style={{ fontFamily: MONO, color: quiet ? INK : GOLD }}>{YUAN[m.id]}</span> 块
          <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: quiet ? 18 : 22, color: "#9aa0aa", marginLeft: 10 }}>{PRICE[m.id] >= 10 ? `$${PRICE[m.id]}` : `$${PRICE[m.id].toFixed(2)}`}</span>
        </div>
      </div>
    );
  };
  const books = project(cam, [0, 0.02, 1.0]);

  return (
    <AbsoluteFill style={{ background: "#040507", overflow: "hidden" }}>
      <Audio src={staticFile("music-ep1.wav")} volume={0.7} />
      {(
        [
          ["sfx/book.wav", 0, 0.5],
          ["sfx/data.wav", BARS.ds, 0.18],
          ["sfx/sub.wav", BARS.big, 0.3],
          ["sfx/thump.wav", BARS.plan + 0.5, 0.45],
          ["sfx/swipe.wav", BARS.strike, 0.5],
          ["sfx/reveal.wav", BARS.swap, 0.3],
        ] as [string, number, number][]
      ).map(([src, b, v], i) => (
        <Sequence key={i} from={bf(b)} layout="none">
          <Audio src={staticFile(src)} volume={v} />
        </Sequence>
      ))}

      <Studio s={state} />

      {/* words placed in the picture */}
      <Words t={t} on={S.q1} off={S.ds} x={130} y={330} size={76}>
        让 AI 写一整套《三体》
        <br />
        那么多字，要多少钱？
      </Words>
      {!books.behind && (
        <div style={{ position: "absolute", left: books.x - 120, width: 240, top: books.y + 14, textAlign: "center", fontFamily: FONT, fontWeight: 700, fontSize: 28, color: "#b9ad94", opacity: ramp(t, 1.6, 2.4) * (1 - ramp(t, S.ds - 0.4, S.ds)), textShadow: "0 2px 10px rgba(0,0,0,0.9)" }}>
          约 88 万字
        </div>
      )}
      {ORDER.map((m, k) => tipLabel(m, 4 - k))}
      <Words t={t} on={S.gap + 0.3} off={S.plan} x={0} y={110} size={72} center>
        最便宜和最贵，差了 <Num>40</Num> 多倍
      </Words>
      <Words t={t} on={S.plan + 0.7} off={S.said} x={130} y={760} size={58}>
        可就是这些贵的 AI，
        <br />
        有人每个月花 200 美元包月
      </Words>
      <Words t={t} on={S.said} off={S.ask} x={130} y={800} size={64}>
        还说：这是最便宜的 AI
      </Words>
      <Words t={t} on={S.ask + 0.2} off={S.title} x={140} y={450} size={118}>
        他算错了吗？
      </Words>

      <AbsoluteFill style={{ background: `rgba(3,4,6,${0.88 * ramp(t, S.title - 0.4, S.title + 0.5)})` }} />
      <Title t={t} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 26, textAlign: "center", fontFamily: FONT, fontWeight: 500, fontSize: 18, color: "#6a6c72", opacity: ramp(t, S.ds, S.ds + 0.6) * (1 - ramp(t, S.plan, S.plan + 0.5)) }}>
        一整套《三体》约 88 万字，按一个 token 约等于一个字估算 · 价格：各家官方 API 输出价，人民币按 6.72 折算 · 2026 年 10 月
      </div>
      <Grain frame={frame} amount={0.04} />
    </AbsoluteFill>
  );
};

const Words: React.FC<{ t: number; on: number; off: number; x: number; y: number; size: number; center?: boolean; children: React.ReactNode }> = ({ t, on, off, x, y, size, center, children }) => {
  const i = ramp(t, on, on + 0.55, EO);
  const o = 1 - ramp(t, off - 0.35, off);
  const a = i * o;
  if (a <= 0.001) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: center ? 0 : x,
        right: center ? 0 : undefined,
        top: y,
        textAlign: center ? "center" : "left",
        opacity: a,
        transform: `translateY(${(1 - i) * 26}px)`,
        filter: i < 0.99 ? `blur(${(1 - i) * 6}px)` : undefined,
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: size,
        lineHeight: 1.25,
        color: INK,
        textShadow: "0 4px 24px rgba(0,0,0,0.85)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
};
const Num: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ color: GOLD, fontSize: "1.3em", fontFamily: MONO, fontWeight: 700, textShadow: `0 0 24px ${rgba(GOLD, 0.45)}` }}>{children}</span>
);

// the strikethrough title, as in v16
const Title: React.FC<{ t: number }> = ({ t }) => {
  const on = ramp(t, S.title, S.title + 0.5, EO) * (1 - ramp(t, S.end0, S.end1));
  if (on <= 0.001) return null;
  const strike = ramp(t, S.strike, S.strike + 0.32, EIO);
  const swap = ramp(t, S.swap, S.swap + 0.6, EIO);
  const FS = 150;
  const slotW = lerp(2 * FS, 4.95 * FS, swap);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 410, display: "flex", justifyContent: "center", opacity: on }}>
      <div style={{ display: "flex", alignItems: "flex-end", fontFamily: FONT, fontWeight: 900, fontSize: FS, lineHeight: `${FS * 1.2}px`, color: INK, whiteSpace: "nowrap", textShadow: "0 6px 40px rgba(0,0,0,0.9)" }}>
        <span>AI 的</span>
        <span style={{ position: "relative", display: "inline-block", width: slotW, height: FS * 1.2 }}>
          <span style={{ position: "absolute", left: lerp(0, FS * 4.15, swap), top: 0, transform: `scale(${lerp(1, 0.4, swap)})`, transformOrigin: "left bottom", color: swap > 0.05 ? "#8e8a82" : INK }}>
            标价
            <span style={{ position: "absolute", left: -6, top: "52%", height: FS * 0.09, width: `calc((100% + 12px) * ${strike})`, background: "#e5322d", borderRadius: 4, boxShadow: "0 0 18px rgba(229,50,45,0.5)" }} />
          </span>
          <span style={{ position: "absolute", left: 0, top: 0, color: GOLD, opacity: swap, transform: `translateY(${(1 - swap) * 40}px)`, textShadow: `0 0 34px ${rgba(GOLD, 0.4)}` }}>真实价格</span>
        </span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: FS * 1.35, textAlign: "center", fontFamily: FONT, fontWeight: 700, fontSize: 40, color: "#b8b2a6", letterSpacing: "0.2em", opacity: ramp(t, S.sub, S.sub + 0.5) }}>
        第 1 集 · 文字 AI
      </div>
    </div>
  );
};
