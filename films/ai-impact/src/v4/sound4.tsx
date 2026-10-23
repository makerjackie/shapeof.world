import React from "react";
import { Audio, interpolate, Sequence, staticFile } from "remotion";
import { duckAt, GAIN, MIX } from "../v3/sound";
import { BAR, bar, beat, BEAT, FRAMES, fr, MUSIC_EDIT } from "../v3/timing";
import { NUKE } from "./bill4";
import { GROW4 } from "./fear4";
import { HUMAN4, MONTH4 } from "./finale4";
import { BOUNCE, CRACK } from "./mania4";
import { BOWL4, SLAM4 } from "./truth4";
import { REPLY_AT, REWIND, STEPS, USER_AT } from "./open4";
import { SHUTTER } from "./wonder4";

// v4 sound: the same 《千年之后》 cut as v3 (timing.ts) and the same ducking for the two silences; effects follow the
// v4 shots: whooshes on camera moves, impacts where things land, ticks where things multiply. Pitched effects are the
// F-major retunes in public/lib/tunedF.

type Ev = [number, string, number];
const TF = (f: string) => `tunedF/${f}`;
const B = (n: number) => bar(n);

export const EVENTS4: Ev[] = [
  // ── opening ──
  [0.03, TF("sfx-impact-06.wav"), 0.55],
  [0.08, "sfx-mechanical-13.wav", 0.7],
  ...STEPS.slice(1, 4).map(([s]): Ev => [s - 0.12, "sfx-mechanical-13.wav", 0.6]),
  ...STEPS.slice(1, 4).map(([s]): Ev => [s, TF("sfx-impact-03.wav"), 0.34]),
  [beat(2) - 0.08, "sfx-transition-02.wav", 0.35],
  [B(1), TF("sfx-impact-08.wav"), 0.95],
  [B(1), TF("sfx-impact-06.wav"), 0.55],
  [B(1) + BEAT, TF("sfx-impact-11.wav"), 0.5],
  [B(2) - 0.05, "sfx-transition-05.wav", 0.6],
  ...Array.from({ length: 14 }, (_, i): Ev => [B(2) + 0.55 + (i / 14) * 0.9, "sfx-mechanical-01.wav", 0.16]),
  ...[0, 1, 2, 3, 4].map((k): Ev => [B(2) + 0.9 + k * 0.24, TF("sfx-impact-03.wav"), 0.2]),
  [B(2) + 0.6, TF("sfx-notification-18.wav"), 0.28],
  [B(4) - 0.05, "sfx-transition-05.wav", 0.5],
  ...[B(4) + 1.2, B(4) + 1.2 + BEAT, B(5), B(5) + 2 * BEAT].map((s): Ev => [s, "sfx-ui-01.wav", 0.18]),
  [B(5) + BEAT, TF("sfx-impact-05.wav"), 0.28],
  [REWIND + 0.05, "sfx-transition-02-rev.wav", 0.7],
  ...[0, 1, 2, 3].map((k): Ev => [REWIND + 0.08 + k * 0.17 + 0.2, "sfx-mechanical-13.wav", 0.3]),
  [REWIND + 0.82, TF("sfx-notification-02.wav"), 0.34],
  ...[0, 1].map((k): Ev => [USER_AT + k * 0.25, "sfx-mechanical-03.wav", 0.3]),
  [USER_AT + 0.7, TF("sfx-ui-19.wav"), 0.4],
  ...Array.from({ length: 6 }, (_, k): Ev => [REPLY_AT + k * 0.21, "sfx-ui-01.wav", 0.1]),
  // ── title ──
  [B(8), TF("sfx-impact-08.wav"), 0.8],
  [B(8) + 0.55, TF("sfx-notification-18.wav"), 0.3],
  [B(10) - 0.35, "sfx-transition-02.wav", 0.3],
  // ── 01 惊奇 ──
  ...Array.from({ length: 16 }, (_, k): Ev => [B(10) + 0.08 + 1.75 * Math.pow((k + 1) / 17, 2), "sfx-ui-01.wav", 0.1 + k * 0.008]),
  [B(10) + 0.15, "sfx-foley-02.wav", 0.3],
  [B(11) - 0.15, "sfx-foley-02.wav", 0.3],
  [B(11) - 0.1, "sfx-transition-02.wav", 0.35],
  [B(11) - 0.05 + BAR * 0.8 * (2 / 9), TF("sfx-notification-18.wav"), 0.32],
  [B(11) - 0.05 + BAR * 0.8 * (2 / 9) + 0.12, TF("sfx-impact-11.wav"), 0.45],
  [B(11) - 0.05 + BAR * 0.8, TF("sfx-impact-03.wav"), 0.22],
  [B(12) - 0.12, "sfx-transition-05.wav", 0.55],
  [B(12.25) + 0.15, TF("sfx-impact-01.wav"), 0.45],
  [B(12.25) + 0.85, "sfx-foley-07.wav", 0.8],
  [B(12.25) + 1.2, "sfx-ui-01.wav", 0.2],
  [B(14) - 0.1, "sfx-transition-02.wav", 0.45],
  ...[0, 2, 4].flatMap((k): Ev[] => [
    [B(14) + 0.2 + k * BEAT, TF("sfx-impact-06.wav"), 0.45],
    [B(14) + 0.2 + k * BEAT + 0.3, TF("sfx-impact-05.wav"), 0.2],
  ]),
  [B(15) + 2 * BEAT, TF("sfx-impact-04.wav"), 0.35],
  [B(16) - 0.3, "sfx-transition-05.wav", 0.4],
  [SHUTTER, "sfx-mechanical-12.wav", 0.7],
  [SHUTTER + 0.3, TF("sfx-notification-02.wav"), 0.45],
  [B(18) - 0.05, "sfx-transition-02-rev.wav", 0.35],
  ...Array.from({ length: 8 }, (_, k): Ev => [B(18) + 0.7 + k * 0.12, "sfx-ui-01.wav", 0.1]),
  [B(19) + 0.2, TF("sfx-notification-18.wav"), 0.28],
  [B(20) - 0.4, "sfx-transition-02-rev.wav", 0.3],
  // ── 02 狂热 ──
  [B(20), TF("sfx-impact-08.wav"), 0.9],
  [B(20), TF("sfx-impact-06.wav"), 0.5],
  ...[0, 1, 2, 3].map((k): Ev => [B(20) + 0.3 + k * 0.1, "sfx-ui-01.wav", 0.18]),
  ...Array.from({ length: 22 }, (_, k): Ev => [B(20) + 1.0 + k * 0.12, TF("sfx-game-01.wav"), 0.07 + (k % 3) * 0.02]),
  ...Array.from({ length: 6 }, (_, k): Ev => [B(20) + 1.0 + k * 0.22, "sfx-mechanical-14.wav", 0.16]),
  [B(21) - 0.15, "sfx-foley-02.wav", 0.25],
  [B(22) - 0.25, "sfx-transition-05.wav", 0.45],
  [B(22) + 0.1, "sfx-scifi-11.wav", 0.22],
  [B(22) + 0.15 + BAR * 1.25, TF("sfx-impact-05.wav"), 0.45],
  [B(22) + 0.15 + BAR * 1.25, TF("sfx-notification-18.wav"), 0.3],
  ...Array.from({ length: 6 }, (_, k): Ev => [B(22) + BAR + 0.2 + k * 0.18, "sfx-mechanical-14.wav", 0.14]),
  [B(24) - 0.2, "sfx-transition-02.wav", 0.5],
  ...[0, 1, 2, 3, 4].map((i): Ev => [B(24) + 0.35 + i * BEAT * 0.8, TF("sfx-impact-09.wav"), 0.5]),
  [BOUNCE, TF("sfx-impact-04.wav"), 0.6],
  [BOUNCE + 0.05, TF("sfx-impact-11.wav"), 0.35],
  [B(26) + 0.05, "sfx-transition-02.wav", 0.25],
  ...[0, 1, 2, 3, 4].map((i): Ev => [B(26) + 0.15 + i * 0.2, "sfx-ui-01.wav", 0.18]),
  [B(26) + 1.3, "sfx-transition-02.wav", 0.35],
  ...[0, 1, 2, 3, 4].map((i): Ev => [B(26) + 2.0 + i * 0.2, "sfx-ui-01.wav", 0.18]),
  [B(27) + 2 * BEAT, TF("sfx-impact-11.wav"), 0.45],
  [B(27) + 2 * BEAT, TF("sfx-notification-18.wav"), 0.25],
  ...[B(28) + 0.05, B(28) + 2 * BEAT, B(29)].map((s): Ev => [s, "sfx-impact-14.wav", 0.5]),
  ...Array.from({ length: 8 }, (_, k): Ev => [B(28) + 0.1 + k * 0.17, "sfx-mechanical-14.wav", 0.12]),
  [CRACK, "sfx-impact-15.wav", 0.75],
  [CRACK, TF("sfx-impact-16.wav"), 0.6],
  [CRACK + 0.25, "sfx-transition-02-rev.wav", 0.3],
  ...Array.from({ length: 10 }, (_, k): Ev => [B(32) + 0.2 + k * 0.33, "sfx-ui-01.wav", 0.1]),
  [B(32) + 1.0, "sfx-transition-05.wav", 0.35],
  [B(32) + 1.0 + BAR * 0.8, TF("sfx-impact-05.wav"), 0.4],
  [B(32) + 1.0 + BAR * 0.8, TF("sfx-notification-18.wav"), 0.3],
  [B(34) + 0.1, "sfx-scifi-11.wav", 0.24],
  [B(34) + 1.85, TF("sfx-impact-05.wav"), 0.4],
  [B(34) + 2.55, "sfx-transition-02-rev.wav", 0.3],
  [B(35), "sfx-ui-01.wav", 0.18],
  [B(35) + 2 * BEAT, "sfx-ui-01.wav", 0.18],
  // ── 03 账单 ──
  [B(36) - 0.05, "sfx-transition-05.wav", 0.4],
  [B(36) + 0.1, TF("sfx-impact-08.wav"), 0.6],
  ...[0, 1, 2].map((k): Ev => [B(36) + 2 * BEAT + k * 2 * BEAT, TF("sfx-impact-06.wav"), 0.35]),
  ...[0, 1, 2].map((k): Ev => [B(36) + 2 * BEAT + k * 2 * BEAT + 0.05, "sfx-scifi-11.wav", 0.12]),
  [B(38) - 0.15, "sfx-transition-02.wav", 0.4],
  [NUKE, TF("sfx-impact-16.wav"), 0.6],
  [NUKE + 0.05, TF("sfx-notification-18.wav"), 0.25],
  [B(40) + 0.2, "sfx-transition-05.wav", 0.35],
  [B(40) + 0.6, "sfx-scifi-11.wav", 0.22],
  [B(40) + 0.6 + BAR * 1.1, TF("sfx-impact-05.wav"), 0.35],
  [B(42) - 0.05, "sfx-transition-02.wav", 0.3],
  ...Array.from({ length: 12 }, (_, k): Ev => [B(42) + 0.25 + k * 0.18, "sfx-mechanical-13.wav", 0.13]),
  [B(43) + 0.2, TF("sfx-notification-02.wav"), 0.4],
  [B(44) - 0.35, "sfx-transition-05.wav", 0.4],
  [B(45), TF("sfx-impact-08.wav"), 0.55],
  [B(45) + 0.2, "sfx-ui-01.wav", 0.2],
  // ── 04 害怕 ──
  ...[GROW4.m39, GROW4.h1, GROW4.h3, GROW4.h12, GROW4.h17].map((s0, k): Ev => [s0, "sfx-foley-07.wav", 0.6 + k * 0.06]),
  [GROW4.h17 + 0.1, TF("sfx-notification-18.wav"), 0.3],
  [B(48) + 0.7, "sfx-transition-02-rev.wav", 0.25],
  ...Array.from({ length: 14 }, (_, k): Ev => [B(50) + 0.2 + k * 0.14, "sfx-foley-01.wav", 0.14]),
  [B(52) + 0.1, "sfx-transition-02-rev.wav", 0.3],
  ...Array.from({ length: 8 }, (_, k): Ev => [B(52) + 0.3 + k * 0.3, "sfx-mechanical-14.wav", 0.14]),
  ...Array.from({ length: 10 }, (_, k): Ev => [B(54) + 0.1 + k * 0.28, "sfx-foley-01.wav", 0.16]),
  ...[0, 1, 2, 3, 4].map((k): Ev => [B(54) + 1.3 + k * BEAT, "sfx-ui-01.wav", 0.14]),
  [B(56) - 1.95, "sfx-transition-07.wav", 0.4],
  // ── 可是 ──
  [B(56) + 0.3, TF("sfx-impact-06.wav"), 0.26],
  [B(58) + 0.2, "sfx-scifi-11.wav", 0.12],
  ...Array.from({ length: 8 }, (_, k): Ev => [B(60) + 0.3 + k * 0.55, "sfx-footstep-11.wav", 0.15]),
  // ── 05 真相 ──
  [SLAM4, TF("sfx-impact-16.wav"), 0.85],
  [SLAM4 + 0.03, TF("sfx-impact-01.wav"), 0.75],
  [SLAM4 + 0.03, TF("sfx-impact-08.wav"), 0.55],
  [B(66) - 0.2, "sfx-transition-05.wav", 0.35],
  [B(66) + 2 * BEAT, "sfx-transition-02-rev.wav", 0.22],
  [B(66) + 3 * BEAT, "sfx-ui-01.wav", 0.25],
  ...Array.from({ length: 6 }, (_, k): Ev => [B(68) + 0.15 + k * 0.05, TF("sfx-foley-17.wav"), 0.12]),
  [BOWL4, "sfx-transition-02-rev.wav", 0.25],
  ...Array.from({ length: 10 }, (_, k): Ev => [B(70) + 0.3 + k * 0.12, "sfx-ui-01.wav", 0.1]),
  ...[0, 1, 2].map((i): Ev => [B(71) + i * BEAT * 0.8, TF("sfx-impact-03.wav"), 0.25]),
  [B(72) + 0.45, "sfx-foley-02.wav", 0.35],
  [B(73) + 0.1, "sfx-transition-02.wav", 0.3],
  [B(73) + 0.75, "sfx-foley-02.wav", 0.35],
  [B(74) + 0.1, "sfx-transition-02.wav", 0.3],
  [B(74) + 0.4, "sfx-transition-03.wav", 0.4],
  [B(74) + 0.8, "sfx-scifi-11.wav", 0.16],
  ...[0, 1, 2, 3].map((k): Ev => [B(76) + 0.2 + (k * BAR * 1.8) / 4, "sfx-mechanical-14.wav", 0.22]),
  [B(78) + 0.35, TF("sfx-impact-05.wav"), 0.3],
  [B(79), TF("sfx-notification-18.wav"), 0.3],
  // ── 06 未知 ──
  [B(80) + 0.2, "sfx-scifi-11.wav", 0.2],
  [MONTH4, "sfx-foley-07.wav", 0.6],
  [B(82) - 0.05, "sfx-transition-05.wav", 0.4],
  ...[0, 1, 2, 3, 4].map((i): Ev => [B(82) + 0.7 + i * 0.32, "sfx-ui-01.wav", 0.2]),
  ...[0, 1].map((i): Ev => [B(84) + 0.6 + i * BEAT * 2, TF("sfx-impact-09.wav"), 0.35]),
  [B(84) + 0.3, "sfx-scifi-11.wav", 0.14],
  [B(86) + 0.3, "sfx-ui-01.wav", 0.18],
  // ── 升华 ──
  ...[0, 1, 2, 3, 4, 5].map((i): Ev => [B(88) + 0.15 + i * 0.13, "sfx-foley-07.wav", 0.24]),
  [B(88) + 1.05, TF("sfx-impact-05.wav"), 0.4],
  ...Array.from({ length: 20 }, (_, i): Ev => [HUMAN4 + (i / 19) * BAR * 2.5, "sfx-foley-07.wav", 0.15 + (i % 5 === 4 ? 0.12 : 0)]),
  [HUMAN4 + BAR * 2.5 + 0.1, TF("sfx-notification-18.wav"), 0.25],
  [B(96) + 0.1, TF("sfx-impact-06.wav"), 0.3],
  ...[0, 1, 2, 3].map((k): Ev => [B(98) + 0.15 + k * 0.32, "sfx-footstep-11.wav", 0.18]),
  [B(98) + 1.45, "sfx-foley-07.wav", 0.7],
  // ── 收尾 ──
  ...Array.from({ length: 10 }, (_, k): Ev => [B(100) + 0.2 + k * 0.06, "sfx-mechanical-03.wav", 0.12]),
  [B(100) + 0.9, TF("sfx-ui-19.wav"), 0.3],
];

const BEDS4: [number, number, string, number][] = [
  [B(2) - BAR / 2, B(4) + 0.6, "ambience-machine-02.wav", 0.24],
  [REWIND + 0.3, B(8) + 0.3, "ambience-room-01.wav", 0.32],
  [B(36) - BAR / 2, B(38) + 0.4, "ambience-machine-02.wav", 0.2],
  [B(56), B(64) + 0.2, "ambience-room-01.wav", 0.4],
  [B(86), B(88) + 0.2, "ambience-room-01.wav", 0.32],
];

const Music: React.FC = () => (
  <>
    {MUSIC_EDIT.map((e, i) => {
      const from = i === 0 ? 0 : fr(bar(e.at)) - 1;
      const to = i < MUSIC_EDIT.length - 1 ? fr(bar(MUSIC_EDIT[i + 1].at)) + 1 : FRAMES;
      const len = to - from;
      const trackFrom = Math.max(0, from + fr(e.skip * BAR));
      const fadeIn = i === 0 ? 0 : 2;
      const fadeOut = i < MUSIC_EDIT.length - 1 ? 2 : 0;
      const vol = (f: number) => {
        let v = 1;
        if (fadeIn && f < fadeIn) v = f / fadeIn;
        if (fadeOut && f > len - fadeOut) v = Math.min(v, (len - f) / fadeOut);
        return MIX * GAIN * v * duckAt((from + f) / 30);
      };
      return (
        <Sequence key={i} from={from} durationInFrames={len}>
          <Audio src={staticFile("music.m4a")} trimBefore={trackFrom} volume={vol} />
        </Sequence>
      );
    })}
  </>
);

const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const Sound4: React.FC<{ until?: number }> = ({ until = Infinity }) => (
  <>
    <Music />
    {BEDS4.filter(([a]) => a < until).map(([a, b, f, v]) => (
      <Sequence key={a} from={fr(a)} durationInFrames={fr(b - a)}>
        <Audio src={staticFile(`lib/${f}`)} volume={(k) => MIX * v * interpolate(k, [0, 15, fr(b - a) - 15, fr(b - a)], [0, 1, 1, 0], CL)} />
      </Sequence>
    ))}
    {EVENTS4.filter(([s]) => s < until).map(([s, f, v], i) => (
      <Sequence key={i} from={Math.max(0, fr(s))} durationInFrames={60}>
        <Audio src={staticFile(`lib/${f}`)} volume={MIX * v} />
      </Sequence>
    ))}
  </>
);
