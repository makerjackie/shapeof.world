import React from "react";
import { Audio, interpolate, Sequence, staticFile } from "remotion";
import { CL } from "./kit";
import { leaveAt, PULL1, PULL2, Q, Q1_AT, REPLY_AT, REWIND, STEPS, USER_AT } from "./opening";
import { line2At } from "./kit";
import { bar, BAR, beat, FRAMES, fr, MUSIC_EDIT } from "./timing";

// v3 sound: 《千年之后》 cut on bar lines (timing.ts), room tone in the two quiet beats, machine hum J-cut before the data
// hall, and one sound for every key action. Pitched effects are retuned to the F-major triad (F, A, C) of the track
// (tools/tune_sfx.py --triad F; files in public/lib/tunedF).

export const GAIN = 0.76;
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
  [PULL1[0] - 0.1, "sfx-transition-02.wav", 0.65],
  [bar(2) + 0.5, TF("sfx-notification-18.wav"), 0.3],
  ...Array.from({ length: 10 }, (_, i): Ev => [leaveAt(i), "sfx-mechanical-01.wav", 0.24]),
  ...[0, 1, 2, 3, 4].map((k): Ev => [bar(3) + k * 0.09, TF("sfx-impact-03.wav"), 0.26]),
  [PULL2[0] - 0.1, "sfx-transition-02.wav", 0.55],
  ...[bar(4) + 1.2, bar(4) + 1.2 + 60 / 111.62, bar(5), bar(5) + 120 / 111.62].map((s): Ev => [s, "sfx-ui-01.wav", 0.18]),
  [bar(5), TF("sfx-impact-05.wav"), 0.28],
  [REWIND + 0.2, "sfx-transition-02-rev.wav", 0.6],
  [REWIND + 1.0, TF("sfx-notification-02.wav"), 0.32],
  ...[0, 1].map((k): Ev => [USER_AT + k * 0.25, "sfx-ui-01.wav", 0.22]),
  [USER_AT + 0.7, TF("sfx-notification-18.wav"), 0.26],
  ...Array.from({ length: 6 }, (_, k): Ev => [REPLY_AT + k * 0.21, "sfx-ui-01.wav", 0.1]),
  // ── title ──
  [bar(8), TF("sfx-impact-08.wav"), 0.8],
  [bar(8) + 0.5, TF("sfx-notification-18.wav"), 0.3],
];

// Ambience beds [from, to, file, volume].
const BEDS: [number, number, string, number][] = [
  [bar(2) - BAR / 2, bar(4) + 0.6, "ambience-machine-02.wav", 0.24],
  [REWIND + 0.3, bar(8) + 0.3, "ambience-room-01.wav", 0.32],
];

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
        return GAIN * v;
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
        <Audio src={staticFile(`lib/${f}`)} volume={(k) => v * interpolate(k, [0, 15, fr(b - a) - 15, fr(b - a)], [0, 1, 1, 0], CL)} />
      </Sequence>
    ))}
    {EVENTS.filter(([s]) => s < until).map(([s, f, v], i) => (
      <Sequence key={i} from={Math.max(0, fr(s))} durationInFrames={60}>
        <Audio src={staticFile(`lib/${f}`)} volume={v} />
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
export const captionEnd = (at: number, a: string, b: string) => line2At(at, a) + Array.from(b).length / 18;
