// v3 chapter 1 (film 0:00–1:00): nine matches on the beat, faster and faster, the clock running to 01:47; the freeze
// and the question; the tenth press on the downbeat where the main section enters; the astrolabe of open loops.
import React from "react";
import { Cam, camAt, CamKey } from "../cam";
import { Box, clamp01, EIN, EIO, EO, ESO, lerp, ramp, Say, useT, win } from "../kit";
import { HAN, K, NUM } from "../theme";
import { Astro3, Astro3Labels, DIVE_AT } from "./astro3";
import { BTN_R, Phone3Html, Phone3Svg, PhoneView } from "./phone3";
import { BEAT, beat, T } from "./time";

// ---------- the night, match by match ----------
type Match = { start: number; result: number; win: boolean; clock: string; happy: number; stars: number };
export const MATCHES: Match[] = [
  { start: -1.2, result: beat(1.1), win: true, clock: "22:03", happy: 0.92, stars: 4 },
  { start: beat(2), result: beat(3.1), win: false, clock: "22:24", happy: 0.84, stars: 3 },
  { start: beat(4), result: beat(5.1), win: true, clock: "22:46", happy: 0.76, stars: 4 },
  { start: beat(6), result: beat(7.1), win: false, clock: "23:10", happy: 0.66, stars: 3 },
  { start: beat(8), result: beat(8.5), win: false, clock: "23:34", happy: 0.55, stars: 2 },
  { start: beat(9), result: beat(9.5), win: true, clock: "23:58", happy: 0.47, stars: 3 },
  { start: beat(10), result: beat(10.5), win: false, clock: "00:27", happy: 0.37, stars: 2 },
  { start: beat(11), result: beat(11.5), win: false, clock: "00:56", happy: 0.27, stars: 1 },
  { start: beat(12), result: beat(13), win: false, clock: "01:28", happy: 0.16, stars: 1 },
];
export const FREEZE = beat(13); // 失败, 01:47
export const PRESS10 = T(8); // the tenth press, on the downbeat where the main section enters
const SKILLS: [number, number][] = [
  [440, 30],
  [330, 64],
  [352, -32],
  [446, -82],
];

const matchAt = (t: number) => {
  let i = 0;
  for (let k = 0; k < MATCHES.length; k++) if (t >= MATCHES[k].start) i = k;
  return i;
};

const viewAt = (t: number): PhoneView => {
  const i = matchAt(t);
  const m = MATCHES[i];
  const next = i + 1 < MATCHES.length ? MATCHES[i + 1].start : PRESS10;
  const beatPhase = (((t - beat(0)) / BEAT) % 1 + 1) % 1;
  const inResult = t >= m.result;
  // thumb: on the skills in a fight, on the button for the result, pressing on each new match
  const onSkill = SKILLS[Math.floor(Math.max(0, t - m.start) / (BEAT / 2)) % 4];
  const hover: [number, number] = [96, 90];
  const btn: [number, number] = [8, 10];
  let tip: [number, number];
  if (t < FREEZE) {
    const toBtn = ramp(t, m.result, Math.min(next - 0.05, m.result + 0.22), EO);
    tip = [lerp(onSkill[0], btn[0], toBtn), lerp(onSkill[1], btn[1], toBtn)];
    if (next - m.start <= BEAT * 1.05) tip = btn; // the fast matches: the thumb never leaves the button
  } else if (t < PRESS10) {
    const k1 = ramp(t, FREEZE, FREEZE + 0.35, EO);
    const k2 = ramp(t, PRESS10 - 0.45, PRESS10, EIN);
    tip = [lerp(lerp(onSkill[0], hover[0], k1), btn[0], k2), lerp(lerp(onSkill[1], hover[1], k1), btn[1], k2)];
  } else {
    const k = ramp(t, PRESS10 + 0.15, PRESS10 + 0.7, EIN);
    tip = [btn[0] + 260 * k, btn[1] + 360 * k];
  }
  const sincePress = Math.min(...[...MATCHES.map((q) => q.start), PRESS10].map((s) => (t >= s ? t - s : 99)));
  const halfBeat = (t - m.start) % (BEAT / 2);
  const tap = !inResult && t < FREEZE ? Math.exp(-halfBeat / 0.06) : 0;
  const pressK = Math.exp(-sincePress / 0.09);
  const ripples: { r: number; o: number; c: string }[] = [];
  for (let k = 0; k < 8; k++) {
    const age = t - PRESS10 - k * 0.3;
    if (age < 0 || age > 2.2) continue;
    ripples.push({ r: BTN_R + 8 + 900 * EO(age / 2.2), o: 0.55 * (1 - age / 2.2), c: k % 2 ? K.cyan : K.want });
  }
  return {
    o: 1,
    mode: t >= FREEZE ? "result" : inResult ? "result" : "battle",
    seed: i + 1,
    age: Math.max(0, (inResult ? m.result : t) - m.start),
    win: t >= FREEZE ? false : m.win,
    resultK: t >= FREEZE ? ramp(t, FREEZE, FREEZE + 0.3, EO) : ramp(t, m.result, m.result + 0.18, EO),
    stars: m.stars,
    ui: 1 - ramp(t, PRESS10 + 0.15, T(8.5)),
    thumb: { x: tip[0], y: tip[1], s: 1.06 - 0.06 * Math.max(tap, pressK), o: 1 - ramp(t, PRESS10 + 0.3, PRESS10 + 0.8) },
    press: pressK,
    ripples,
    beatPhase,
    hole: ramp(t, T(27.2), T(28) - 0.25, EIO),
  };
};

const HOOK_CAM: Cam = { cx: 0, cy: -150, z: 1.24 };
const TEXT_CAM: Cam = { cx: -330, cy: -150, z: 0.95 };
const camA = (t: number) => {
  const keys: CamKey[] = [
    [0, HOOK_CAM],
    [FREEZE - 0.05, { cx: 0, cy: -150, z: 1.32 }, (u) => u],
    [FREEZE + 0.9, TEXT_CAM, ESO],
    [PRESS10 - 0.1, { cx: -322, cy: -146, z: 0.98 }, EIO],
    [T(8.35), { cx: 0, cy: 0, z: 2.3 }, EIN],
    [T(9.0), { cx: -176, cy: 0, z: 1.7 }, ESO],
    [T(10), { cx: -178, cy: 0, z: 1.68 }, EIO],
    [T(10) + 1.2, { cx: -200, cy: 0, z: 1.5 }, ESO],
    [T(12), { cx: -203, cy: 0, z: 1.48 }, EIO],
    [T(12) + 1.2, { cx: -227, cy: 0, z: 1.32 }, ESO],
    [T(14), { cx: -230, cy: 0, z: 1.3 }, EIO],
    [T(14) + 1.2, { cx: -254, cy: 0, z: 1.18 }, ESO],
    [T(16), { cx: -257, cy: 0, z: 1.16 }, EIO],
    [T(16) + 1.2, { cx: -283, cy: 0, z: 1.06 }, ESO],
    [T(18), { cx: -291, cy: 0, z: 1.03 }, EIO],
    [T(21.5), { cx: -284, cy: 0, z: 1.09 }, EIO],
    [T(25.4), { cx: -172, cy: 0, z: 1.72 }, ESO],
    [DIVE_AT, { cx: -150, cy: 0, z: 1.9 }, EIO],
    [T(28) - 0.05, { cx: 0, cy: 0, z: 42 }, EIN],
  ];
  const c = camAt(t, keys, ESO);
  // a small kick on every press in the montage
  if (t < FREEZE) {
    const s = Math.min(...MATCHES.map((q) => (t >= q.start ? t - q.start : 99)));
    const kick = Math.exp(-s / 0.12) * 0.025;
    return { ...c, z: c.z * (1 + kick) };
  }
  return c;
};

// The night's HUD above the phone: which match, the time, how much fun is left.
const NightHud: React.FC<{ t: number }> = ({ t }) => {
  const o = 1 - ramp(t, PRESS10 - 0.2, PRESS10 + 0.3);
  if (o <= 0) return null;
  const i = matchAt(t);
  const m = MATCHES[i];
  const frozen = t >= FREEZE;
  const clock = frozen ? "01:47" : m.clock;
  const happy = frozen ? lerp(m.happy, 0.04, ramp(t, FREEZE, FREEZE + 0.6, EO)) : lerp(i > 0 ? MATCHES[i - 1].happy : 1, m.happy, ramp(t, m.start, m.start + 0.25, EO));
  const bump = Math.exp(-Math.max(0, t - m.start) / 0.15);
  const move = ramp(t, FREEZE, FREEZE + 0.9, ESO);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <div style={{ position: "absolute", left: lerp(150, 110, move), top: lerp(96, 150, move), display: "flex", alignItems: "baseline", gap: 18, opacity: 1 - move }}>
        <span style={{ fontFamily: HAN, fontWeight: 900, fontSize: 60, color: K.fg, transform: `scale(${1 + 0.12 * bump})`, transformOrigin: "left center", display: "inline-block" }}>
          第 <span style={{ fontFamily: NUM }}>{i + 1}</span> 局
        </span>
      </div>
      <div style={{ position: "absolute", right: lerp(150, 120, move), top: lerp(84, 60, move), display: "flex", alignItems: "baseline", gap: 12 }}>
        <span style={{ fontFamily: HAN, fontWeight: 700, fontSize: 28, color: K.sub }}>凌晨</span>
        <span style={{ fontFamily: NUM, fontWeight: 200, fontSize: 92, color: frozen ? K.fg : "rgba(244,240,232,0.9)", fontVariantNumeric: "tabular-nums", transform: `scale(${1 + 0.06 * bump})`, display: "inline-block", transformOrigin: "right center" }}>{clock}</span>
      </div>
      <div style={{ position: "absolute", left: 760, top: 118, display: "flex", alignItems: "center", gap: 16, opacity: 1 - move }}>
        <span style={{ fontFamily: HAN, fontWeight: 800, fontSize: 28, color: K.like }}>开心</span>
        <div style={{ position: "relative", width: 360, height: 16, borderRadius: 99, background: "rgba(255,176,122,0.14)", border: "1px solid rgba(255,176,122,0.4)" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${clamp01(happy) * 100}%`, borderRadius: 99, background: `linear-gradient(90deg, ${K.like}, ${K.likeHi})`, boxShadow: `0 0 16px ${K.like}` }} />
        </div>
      </div>
    </div>
  );
};

export const Game3: React.FC = () => {
  const t = useT();
  if (t > T(28) + 0.05) return null;
  const cam = camA(t);
  const v = viewAt(t);
  const blackout = ramp(t, T(28) - 0.35, T(28), EIO);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <Phone3Svg cam={cam} v={v} t={t} />
        <Astro3 t={t} cam={cam} />
      </svg>
      <Phone3Html cam={cam} v={v} />
      <Astro3Labels t={t} cam={cam} />
      <NightHud t={t} />
      <Game3Text />
      {blackout > 0 ? <div style={{ position: "absolute", inset: 0, background: "#020306", opacity: blackout }} /> : null}
    </div>
  );
};

const want = (s: string) => ({ t: s, c: K.want });

const Game3Text: React.FC = () => (
  <>
    <Box x={110} y={330} gap={22}>
      <Say at={FREEZE + 0.1} out={PRESS10 + 0.15} size={70} weight={900} parts={["其实，早就", { t: "不好玩", c: K.like }, "了。"]} />
      <Say at={beat(14)} out={PRESS10 + 0.15} size={80} weight={900} parts={["为什么还是"]} />
      <Say at={beat(14) + 0.25} out={PRESS10 + 0.15} size={80} weight={900} parts={[want("停不下来"), "？"]} />
    </Box>
    <Box x={110} y={380} gap={14}>
      <Say at={T(8.3)} out={T(9.95)} size={64} parts={["一局，十几分钟。"]} />
      <Say at={T(8.8)} out={T(9.95)} size={52} weight={700} color={K.sub} parts={["“再来一局”，从来不贵。"]} />
    </Box>
    <Box x={110} y={380} gap={14}>
      <Say at={T(10.05)} out={T(11.95)} size={64} parts={["差一颗星，就升段。"]} />
      <Say at={T(11.25)} out={T(11.95)} size={54} weight={700} color={K.sub} parts={["掉一颗，比赢一颗", { t: "更疼", c: K.wantHi }, "。"]} />
    </Box>
    <Box x={110} y={410} gap={14}>
      <Say at={T(12.05)} out={T(13.95)} size={64} parts={["每日任务：", want("还差 1 局"), "。"]} />
    </Box>
    <Box x={110} y={390} gap={14}>
      <Say at={T(14.05)} out={T(15.95)} size={64} parts={["赛季", want("还剩 9 天"), "。"]} />
      <Say at={T(14.8)} out={T(15.95)} size={54} weight={700} color={K.sub} parts={["过了，奖励就没了。"]} />
    </Box>
    <Box x={110} y={390} gap={14}>
      <Say at={T(16.05)} out={T(17.95)} size={48} weight={700} color={K.sub} parts={["好友发来："]} />
      <Say at={T(16.3)} out={T(17.95)} size={68} parts={["“差一个，来不来？”"]} />
    </Box>
    <Box x={110} y={390} gap={16}>
      <Say at={T(19.2)} out={T(21.4)} size={64} parts={["你想停的那一刻，"]} />
      <Say at={T(19.7)} out={T(21.4)} size={64} parts={["总有一个圈，", want("还差一点"), "。"]} />
    </Box>
    <Box x={110} y={370} gap={16}>
      <Say at={T(21.6)} out={T(25.3)} size={54} weight={700} parts={["每一局，系统都会找"]} />
      <Say at={T(22.0)} out={T(25.3)} size={54} weight={700} parts={["和你差不多强的对手。"]} />
      <Say at={T(23.0)} out={T(25.3)} size={64} parts={["输赢，大概", { t: "一半一半", c: K.fg, w: 900 }, "。"]} style={{ marginTop: 18 }} />
    </Box>
    <Box x={110} y={430} gap={16}>
      <Say at={T(25.45)} out={T(27.7)} size={68} weight={900} parts={["为什么一半一半，"]} />
      <Say at={T(25.85)} out={T(27.7)} size={68} weight={900} parts={["最让人", want("上头"), "？"]} />
    </Box>
  </>
);

