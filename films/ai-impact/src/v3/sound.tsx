import React from "react";
import { Audio, interpolate, Sequence, staticFile } from "remotion";
import { CL } from "./kit";
import { leaveAt, PULL1, PULL2, Q, Q1_AT, REPLY_AT, REWIND, STEPS, USER_AT } from "./opening";
import { CPS, line2At } from "./kit";
import { raceMonthAt, SHUTTER_AT } from "./ch1";
import { BOUNCE_AT, CRACK_AT } from "./ch2";
import { NUKE_AT } from "./ch3";
import { GROW } from "./ch4";
import { humanAt, MONTH_AT } from "./finale";
import { BOWL_AT, SLAM_AT } from "./truth";
import { bar, BAR, BEAT, beat, FRAMES, fr, MUSIC_EDIT } from "./timing";

// v3 sound: 《千年之后》 cut on bar lines (timing.ts), room tone in the two quiet beats, machine hum J-cut before the data
// hall, and one sound for every key action. Pitched effects are retuned to the F-major triad (F, A, C) of the track
// (tools/tune_sfx.py --triad F; files in public/lib/tunedF).

export const GAIN = 0.76;
// Whole-mix headroom so the raw render never clips; the master step (tpmaster.py) brings loudness back up.
export const MIX = 0.56;
type Ev = [number, string, number];
const TF = (f: string) => `tunedF/${f}`;

// A caption starts with a paper slide just before and a tap on its first character.
const captionTaps = (at: number): Ev[] => [
  [at - 0.22, "sfx-foley-02.wav", 0.32],
  [at, "sfx-ui-01.wav", 0.38],
];

export const EVENTS: Ev[] = [
  // ── opening ──
  [0.03, TF("sfx-impact-06.wav"), 0.55],
  [0.08, "sfx-mechanical-13.wav", 0.7],
  ...STEPS.slice(1, 4).map(([s]): Ev => [s - 0.12, "sfx-mechanical-13.wav", 0.6]),
  ...STEPS.slice(1, 4).map(([s]): Ev => [s, TF("sfx-impact-03.wav"), 0.34]),
  [beat(2) - 0.08, "sfx-transition-02.wav", 0.35],
  [bar(1), TF("sfx-impact-08.wav"), 0.95],
  [bar(1), TF("sfx-impact-06.wav"), 0.55],
  [bar(1) + 60 / 111.62, TF("sfx-impact-11.wav"), 0.5],
  ...captionTaps(Q1_AT + 0.22),
  ...captionTaps(bar(2)),
  ...captionTaps(bar(4)),
  ...captionTaps(bar(6)),
  [PULL1[0] - 0.1, "sfx-transition-05.wav", 0.6],
  [bar(2) + 0.5, TF("sfx-notification-18.wav"), 0.3],
  ...Array.from({ length: 10 }, (_, i): Ev => [leaveAt(i), "sfx-mechanical-01.wav", 0.24]),
  ...[0, 1, 2, 3, 4].map((k): Ev => [bar(3) + k * 0.09, TF("sfx-impact-03.wav"), 0.26]),
  [PULL2[0] - 0.1, "sfx-transition-05.wav", 0.5],
  ...[bar(4) + 1.2, bar(4) + 1.2 + 60 / 111.62, bar(5), bar(5) + 120 / 111.62].map((s): Ev => [s, "sfx-ui-01.wav", 0.18]),
  [bar(5), TF("sfx-impact-05.wav"), 0.28],
  [REWIND + 0.2, "sfx-transition-02-rev.wav", 0.6],
  [REWIND + 1.0, TF("sfx-notification-02.wav"), 0.32],
  ...[0, 1].map((k): Ev => [USER_AT + k * 0.25, "sfx-mechanical-03.wav", 0.3]),
  [USER_AT + 0.7, TF("sfx-ui-19.wav"), 0.4],
  ...Array.from({ length: 6 }, (_, k): Ev => [REPLY_AT + k * 0.21, "sfx-ui-01.wav", 0.1]),
  // ── title ──
  [bar(8), TF("sfx-impact-08.wav"), 0.8],
  [bar(8) + 0.5, TF("sfx-notification-18.wav"), 0.3],
  // ── 01 惊奇 ──
  ...[10, 12, 14, 16, 18].flatMap((b) => captionTaps(bar(b))),
  ...Array.from({ length: 9 }, (_, k): Ev => [bar(10) + 0.1 + Math.pow((k + 1) / 9, 1 / 2.4) * BAR * 0.85, "sfx-ui-01.wav", 0.12 + k * 0.012]),
  ...[1, 2, 3, 4, 5].map((k): Ev => [bar(10) + 0.2 + ((k - 1) / 5) * BAR * 0.8, "sfx-mechanical-14.wav", 0.28]),
  [bar(11) - 0.12, "sfx-transition-02.wav", 0.4],
  [raceMonthAt(2), TF("sfx-notification-18.wav"), 0.35],
  [raceMonthAt(2) + 0.05, TF("sfx-impact-11.wav"), 0.42],
  [raceMonthAt(9), TF("sfx-impact-03.wav"), 0.25],
  [bar(12) + 0.05, TF("sfx-impact-01.wav"), 0.5],
  [bar(12) + 0.5, TF("sfx-impact-01.wav"), 0.35],
  [bar(12) + 2 * BEAT, "sfx-foley-07.wav", 0.8],
  [bar(12) + 2 * BEAT + 0.35, "sfx-ui-01.wav", 0.2],
  ...[0, 2, 4].flatMap((k): Ev[] => [
    [bar(14) + k * BEAT + 0.25, TF("sfx-impact-06.wav"), 0.42],
    [bar(14) + k * BEAT + 0.55, TF("sfx-impact-05.wav"), 0.22],
  ]),
  [bar(16) - 0.1, "sfx-transition-02.wav", 0.3],
  [SHUTTER_AT, "sfx-mechanical-12.wav", 0.7],
  [SHUTTER_AT + 0.35, TF("sfx-notification-02.wav"), 0.45],
  ...[0, 1, 2, 3, 4].map((r): Ev => [bar(18) + 0.4 + r * BEAT * 0.75, "sfx-ui-01.wav", 0.22]),
  [bar(18) + 1.5, TF("sfx-notification-18.wav"), 0.25],
  // ── 02 狂热 ──
  ...[20, 22, 24, 26, 28, 30, 32, 34].flatMap((b) => captionTaps(bar(b))),
  ...Array.from({ length: 12 }, (_, k): Ev => [bar(20) + 0.6 + k * 0.13, TF("sfx-game-01.wav"), 0.1]),
  ...Array.from({ length: 5 }, (_, k): Ev => [bar(20) + 0.9 + k * 0.44, "sfx-ui-01.wav", 0.14]),
  [bar(22) + 0.15, "sfx-transition-02.wav", 0.35],
  [bar(22) + 0.2 + BAR * 1.1, TF("sfx-impact-05.wav"), 0.4],
  [bar(22) + 0.2 + BAR * 1.1, TF("sfx-notification-18.wav"), 0.3],
  [bar(22) + 2 * BEAT, TF("sfx-impact-11.wav"), 0.3],
  ...[0, 1, 2, 3, 4].map((i): Ev => [bar(24) + 0.3 + i * BEAT * 0.9 + 0.25, TF("sfx-impact-09.wav"), 0.5]),
  [BOUNCE_AT - 0.45, "sfx-transition-02.wav", 0.3],
  [BOUNCE_AT, TF("sfx-impact-04.wav"), 0.55],
  ...[0, 1, 2, 3, 4].map((i): Ev => [bar(26) + 0.3 + i * 0.2, "sfx-ui-01.wav", 0.18]),
  [bar(26) + 1.35, "sfx-transition-02.wav", 0.3],
  ...[0, 1, 2, 3, 4].map((i): Ev => [bar(26) + 1.8 + i * 0.2, "sfx-ui-01.wav", 0.18]),
  [bar(26) + 3.0, TF("sfx-impact-11.wav"), 0.45],
  [bar(28) + 0.15, "sfx-impact-14.wav", 0.45],
  ...Array.from({ length: 6 }, (_, k): Ev => [bar(28) + 0.25 + k * 0.12, "sfx-mechanical-14.wav", 0.18]),
  [CRACK_AT, "sfx-impact-15.wav", 0.75],
  [CRACK_AT, TF("sfx-impact-16.wav"), 0.6],
  [CRACK_AT + 0.25, "sfx-transition-02-rev.wav", 0.25],
  ...Array.from({ length: 8 }, (_, k): Ev => [bar(32) + 0.2 + k * 0.45, "sfx-ui-01.wav", 0.1]),
  [bar(32) + 0.6 + BAR * 0.9, TF("sfx-notification-18.wav"), 0.35],
  [bar(32) + 0.6 + BAR * 0.9, TF("sfx-impact-05.wav"), 0.3],
  [bar(34) + 0.3, "sfx-scifi-11.wav", 0.22],
  [bar(34) + 0.3 + BAR * 1.3 * 0.55, TF("sfx-impact-05.wav"), 0.35],
  [bar(34) + 0.3 + BAR * 1.3, "sfx-impact-14.wav", 0.35],
  // ── 03 账单 ──
  ...[36, 38, 40, 42, 44].flatMap((b) => captionTaps(bar(b))),
  ...[0, 1, 2].map((k): Ev => [bar(36) + 0.3 + k * BEAT, "sfx-scifi-11.wav", 0.18]),
  [bar(38) + 0.2, "sfx-transition-02.wav", 0.3],
  [NUKE_AT, TF("sfx-impact-16.wav"), 0.6],
  [NUKE_AT + 0.05, TF("sfx-notification-18.wav"), 0.25],
  [bar(40) + 0.5, "sfx-scifi-11.wav", 0.22],
  [bar(40) + 0.5 + BAR * 1.1, TF("sfx-impact-05.wav"), 0.35],
  ...Array.from({ length: 8 }, (_, k): Ev => [bar(42) + 0.3 + k * 0.22, "sfx-mechanical-13.wav", 0.16]),
  [bar(42) + 1.6, TF("sfx-notification-02.wav"), 0.4],
  [bar(44) + 0.05, TF("sfx-impact-08.wav"), 0.55],
  [bar(44) + 1.0, "sfx-ui-01.wav", 0.2],
  [bar(44) + 1.4, "sfx-ui-01.wav", 0.2],
  // ── 04 害怕 ──
  ...[46, 48, 50, 52, 54].flatMap((b) => captionTaps(bar(b))),
  ...[GROW.m39, GROW.h1, GROW.h3, GROW.h12, GROW.h17].map((s0, k): Ev => [s0, "sfx-foley-07.wav", 0.65 + k * 0.05]),
  [GROW.h17 + 0.1, TF("sfx-notification-18.wav"), 0.3],
  ...Array.from({ length: 10 }, (_, k): Ev => [bar(50) + 0.2 + k * 0.32, "sfx-foley-01.wav", 0.18]),
  ...Array.from({ length: 8 }, (_, k): Ev => [bar(52) + 0.3 + k * 0.28, "sfx-foley-01.wav", 0.16]),
  ...Array.from({ length: 6 }, (_, k): Ev => [bar(52) + 0.3 + k * 0.4, "sfx-mechanical-14.wav", 0.16]),
  ...Array.from({ length: 10 }, (_, k): Ev => [bar(54) + 0.1 + k * 0.3, "sfx-foley-01.wav", 0.18]),
  ...[0, 1, 2, 3].map((k): Ev => [bar(54) + 1.6 + k * BEAT, "sfx-ui-01.wav", 0.16]),
  [bar(56) - 1.95, "sfx-transition-07.wav", 0.4],
  // ── 间奏 ──
  [bar(56) + 0.25, TF("sfx-impact-06.wav"), 0.28],
  ...captionTaps(bar(58)),
  [bar(58) + 0.2, "sfx-scifi-11.wav", 0.14],
  ...captionTaps(bar(60)),
  ...Array.from({ length: 6 }, (_, k): Ev => [bar(60) + 0.4 + k * 0.62, "sfx-footstep-11.wav", 0.16]),
  // ── 05 真相 ──
  [SLAM_AT, TF("sfx-impact-16.wav"), 0.85],
  [SLAM_AT + 0.03, TF("sfx-impact-01.wav"), 0.75],
  [SLAM_AT + 0.03, TF("sfx-impact-08.wav"), 0.55],
  ...captionTaps(SLAM_AT + 0.15).slice(1),
  ...[66, 68, 70, 72, 74, 76, 78].flatMap((b) => captionTaps(bar(b))),
  [bar(66) + 2 * BEAT, "sfx-transition-02-rev.wav", 0.22],
  [bar(66) + 3 * BEAT, "sfx-ui-01.wav", 0.25],
  ...Array.from({ length: 6 }, (_, k): Ev => [bar(68) + 0.1 + k * 0.05, TF("sfx-foley-17.wav"), 0.12]),
  [BOWL_AT, "sfx-transition-02-rev.wav", 0.25],
  ...Array.from({ length: 10 }, (_, k): Ev => [bar(70) + 0.2 + k * 0.14, "sfx-ui-01.wav", 0.1]),
  [bar(72) + 0.4, "sfx-foley-02.wav", 0.35],
  [bar(72) + 0.4 + 2 * BEAT, "sfx-foley-02.wav", 0.35],
  [bar(74) + 0.2, "sfx-transition-03.wav", 0.45],
  [bar(74) + 0.6, "sfx-scifi-11.wav", 0.16],
  ...[0, 1, 2, 3].map((k): Ev => [bar(76) + 0.2 + (k * BAR * 1.8) / 4, "sfx-mechanical-14.wav", 0.22]),
  [bar(78) + 1.3, TF("sfx-notification-18.wav"), 0.3],
  // ── 06 未知 ──
  ...[80, 82, 84].flatMap((b) => captionTaps(bar(b))),
  [MONTH_AT, "sfx-foley-07.wav", 0.6],
  ...[0, 1, 2, 3, 4].map((i): Ev => [bar(82) + 0.4 + i * 0.45, "sfx-ui-01.wav", 0.2]),
  ...[0, 1].map((i): Ev => [bar(84) + 0.6 + i * BEAT * 2, TF("sfx-impact-09.wav"), 0.35]),
  [bar(84) + 0.3, "sfx-scifi-11.wav", 0.14],
  [bar(86) + 0.3, "sfx-ui-01.wav", 0.2],
  // ── 升华 ──
  ...captionTaps(bar(88)),
  ...[0, 1, 2, 3, 4, 5].map((i): Ev => [bar(88) + 0.2 + i * 0.12, "sfx-foley-07.wav", 0.25]),
  [bar(88) + 1.2, TF("sfx-impact-05.wav"), 0.4],
  ...captionTaps(bar(90)),
  ...Array.from({ length: 20 }, (_, i): Ev => [humanAt(i + 3), "sfx-foley-07.wav", 0.16 + (i % 5 === 4 ? 0.12 : 0)]),
  [humanAt(22) + 0.1, TF("sfx-notification-18.wav"), 0.25],
  [bar(96) + 0.1, TF("sfx-impact-06.wav"), 0.3],
  ...captionTaps(bar(96)),
  ...[0, 1, 2].map((k): Ev => [bar(98) + 0.15 + k * 0.32, "sfx-footstep-11.wav", 0.18]),
  [bar(98) + 1.2, "sfx-foley-07.wav", 0.7],
  // ── 收尾 ──
  ...Array.from({ length: 9 }, (_, k): Ev => [bar(100) + 0.2 + k * 0.06, "sfx-mechanical-03.wav", 0.12]),
  [bar(100) + 0.9, TF("sfx-ui-19.wav"), 0.3],
];

// Ambience beds [from, to, file, volume].
const BEDS: [number, number, string, number][] = [
  [bar(2) - BAR / 2, bar(4) + 0.6, "ambience-machine-02.wav", 0.24],
  [REWIND + 0.3, bar(8) + 0.3, "ambience-room-01.wav", 0.32],
  [bar(36) - BAR / 2, bar(38) + 0.4, "ambience-machine-02.wav", 0.2],
  [bar(56), bar(64) + 0.2, "ambience-room-01.wav", 0.4],
  [bar(86), bar(88) + 0.2, "ambience-room-01.wav", 0.32],
];

// Music ducking for the two real silences (DIRECTOR 七、声音): "可是" (bars 56–58) drops to room tone, the music
// creeps back under the doors (58–64) and is full again on the slam (bar 64, the track's own re-entry); "那我们呢？"
// (bars 86–88) takes a breath before the climax.
const DUCK: [number, number][] = [
  [bar(56) - 0.15, 1],
  [bar(56) + 0.35, 0.22],
  [bar(58), 0.22],
  [bar(60), 0.6],
  [bar(64) - 0.06, 0.6],
  [bar(64), 1],
  [bar(86), 1],
  [bar(86) + 0.4, 0.5],
  [bar(88) - 0.05, 0.5],
  [bar(88) + 0.05, 1],
];
export const duckAt = (t: number) => {
  if (t <= DUCK[0][0]) return 1;
  for (let i = 1; i < DUCK.length; i++) {
    const [t0, v0] = DUCK[i - 1];
    const [t1, v1] = DUCK[i];
    if (t <= t1) return v0 + (v1 - v0) * ((t - t0) / Math.max(1e-6, t1 - t0));
  }
  return 1;
};

const Music: React.FC = () => (
  <>
    {MUSIC_EDIT.map((e, i) => {
      const from = i === 0 ? 0 : fr(bar(e.at)) - 1;
      const to = i < MUSIC_EDIT.length - 1 ? fr(bar(MUSIC_EDIT[i + 1].at)) + 1 : FRAMES;
      const len = to - from;
      const trackFrom = Math.max(0, from + fr(e.skip * BAR));
      // two-frame equal crossfade on each seam
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

export const Sound: React.FC<{ until?: number }> = ({ until = Infinity }) => (
  <>
    <Music />
    {BEDS.filter(([a]) => a < until).map(([a, b, f, v]) => (
      <Sequence key={a} from={fr(a)} durationInFrames={fr(b - a)}>
        <Audio src={staticFile(`lib/${f}`)} volume={(k) => MIX * v * interpolate(k, [0, 15, fr(b - a) - 15, fr(b - a)], [0, 1, 1, 0], CL)} />
      </Sequence>
    ))}
    {EVENTS.filter(([s]) => s < until).map(([s, f, v], i) => (
      <Sequence key={i} from={Math.max(0, fr(s))} durationInFrames={60}>
        <Audio src={staticFile(`lib/${f}`)} volume={MIX * v} />
      </Sequence>
    ))}
  </>
);

// Caption cue times, for the reading-time audit.
export const CAPTIONS: [number, string, string, number][] = [
  [Q1_AT, Q.q1[0], Q.q1[1], bar(2) - 0.05],
  [bar(2), Q.q2[0], Q.q2[1], bar(4) - 0.05],
  [bar(4), Q.q3[0], Q.q3[1], bar(6) - 0.05],
  [bar(6), Q.q4[0], Q.q4[1], bar(8) + 0.02],
];
export const captionEnd = (at: number, a: string, b: string) => line2At(at, a) + Array.from(b).length / CPS;
