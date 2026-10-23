import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile } from "remotion";
import { Task, TASK_STEPS, Usage } from "./ai";
import { Balance, Cohort, EndCard, Final, Narrower, Quiet, RamAgain } from "./future";
import { Hook, HOOK_STEPS, leaveAt, PULL, Title } from "./hook";
import { CL, Corner, END, fr, FRAMES, Scene } from "./kit";
import { Capex, Nvidia } from "./money";
import { Devs, Finding, Jobless, Who } from "./people";
import { Chips, Power } from "./world";

// 《AI 到底改变了什么》 v2 · 1:56, one dark kinetic look. Every scene is one to six 2-second bars long; every cut is on a
// bar line of the 120 BPM grid (0.08 + 2b s). Music: 《有序运动 · 40》 from its 2.0 s (band in at 0:02, tonic end 0:55.9);
// two bars of near-silence (room tone) carry the recap; then 《有序运动 · 90》 from its bar 16 (32.07 s) on 1:00.08, still
// on the grid, under "可是". Its quiet bar 20 is the "who?" beat (1:08), its biggest re-entry is the finding (1:16), its
// near-silent bar 35 is the quiet scene (1:38), its last tonic is the end card (1:52). See SCRIPT.md.

type Ev = [number, string, number];
const TU = (f: string) => `tuned/${f}`;

// Caption lines (start times): a card slide just before, a tap on the first character.
const LINES = [3.08, 6.58, 12.08, 15.08, 18.08, 22.08, 26.08, 30.08, 34.08, 38.08, 42.08, 46.08, 50.08, 56.08, 60.08, 70.08, 76.08, 84.08, 88.08, 92.08, 100.08, 104.08, 108.08];

const EVENTS: Ev[] = [
  ...LINES.flatMap((s): Ev[] => [
    [s - 0.25, "sfx-foley-02.wav", 0.4],
    [s, "sfx-ui-01.wav", 0.45],
  ]),
  // hook
  [0.08, TU("sfx-impact-08.wav"), 0.6],
  ...HOOK_STEPS.slice(1, 4).map(([s]): Ev => [s - 0.14, "sfx-mechanical-13.wav", 0.8]),
  ...HOOK_STEPS.slice(1, 4).map(([s]): Ev => [s, TU("sfx-impact-03.wav"), 0.35]),
  [1.0, "sfx-transition-02.wav", 0.45],
  [2.08, TU("sfx-impact-08.wav"), 1],
  [2.08, TU("sfx-impact-06.wav"), 0.6],
  [2.58, TU("sfx-impact-11.wav"), 0.55],
  [3.08, "sfx-mechanical-13.wav", 0.6],
  [3.1, TU("sfx-game-01.wav"), 0.35],
  [3.58, TU("sfx-notification-02.wav"), 0.4],
  [PULL[0] - 0.1, "sfx-transition-02.wav", 0.7],
  ...[0, 1, 2, 3].map((k): Ev => [6.5 + k * 0.12, "sfx-ui-01.wav", 0.15]),
  [7.08, TU("sfx-impact-06.wav"), 0.5],
  ...Array.from({ length: 10 }, (_, i): Ev => [leaveAt(i), "sfx-mechanical-01.wav", 0.28]),
  // title
  [10.08, TU("sfx-impact-08.wav"), 0.75],
  [10.58, TU("sfx-notification-18.wav"), 0.35],
  // nvidia
  ...[12.58, 13.08, 13.58, 14.08, 14.58].map((s): Ev => [s, "sfx-ui-01.wav", 0.18]),
  [15.08, TU("sfx-impact-05.wav"), 0.5],
  [15.08, TU("sfx-notification-18.wav"), 0.3],
  // capex
  ...[0, 1, 2, 3].map((k): Ev => [18.08 + k * 0.12, "sfx-ui-01.wav", 0.3]),
  ...Array.from({ length: 14 }, (_, k): Ev => [18.33 + k * 0.25, "sfx-mechanical-01.wav", 0.16]),
  [20.08, TU("sfx-impact-05.wav"), 0.4],
  [22.0, "sfx-transition-02.wav", 0.55],
  ...[22.58, 23.08, 23.58, 24.08, 24.58].map((s): Ev => [s, TU("sfx-impact-03.wav"), 0.3]),
  [25.08, TU("sfx-impact-11.wav"), 0.45],
  // chips
  ...[26.58, 27.08, 27.58, 28.08, 28.58].flatMap((s): Ev[] => [
    [s, TU("sfx-impact-06.wav"), 0.42],
    [s, "sfx-impact-01.wav", 0.3],
  ]),
  ...Array.from({ length: 6 }, (_, i): Ev => [29.08 + i * 0.16 + 0.23, "sfx-mechanical-13.wav", 0.4]),
  [30.0, "sfx-transition-02.wav", 0.45],
  ...Array.from({ length: 10 }, (_, k): Ev => [30.58 + k * 0.1, "sfx-ui-01.wav", 0.12]),
  [31.58, TU("sfx-impact-05.wav"), 0.4],
  // power
  [35.08, "sfx-mechanical-01.wav", 0.4],
  [37.08, TU("sfx-impact-03.wav"), 0.35],
  [38.08, TU("sfx-impact-08.wav"), 0.65],
  [39.08, TU("sfx-notification-18.wav"), 0.3],
  // task
  [42.58, TU("sfx-notification-02.wav"), 0.4],
  [44.0, "sfx-transition-02.wav", 0.6],
  ...TASK_STEPS.slice(1, 3).map((s): Ev => [s.at, TU("sfx-impact-03.wav"), 0.35]),
  [46.08, TU("sfx-impact-06.wav"), 0.6],
  [46.08, TU("sfx-impact-05.wav"), 0.3],
  // usage
  ...Array.from({ length: 12 }, (_, k): Ev => [51.08 + k * 0.08, "sfx-ui-01.wav", 0.22]),
  [53.08, TU("sfx-impact-03.wav"), 0.3],
  // jobless: the recap in the silence, one curve a bar; B comes in on 可是; the drop to the floor
  [56.1, "sfx-transition-02.wav", 0.22],
  ...[56.58, 57.58, 58.58, 59.58].map((s): Ev => [s, TU("sfx-impact-03.wav"), 0.34]),
  [61.58, "sfx-mechanical-13.wav", 0.4],
  [64.0, "sfx-transition-02.wav", 0.35],
  [64.58, TU("sfx-impact-05.wav"), 0.4],
  // who
  ...[69.08, 71.08, 73.08].map((s): Ev => [s, "sfx-mechanical-01.wav", 0.3]),
  [74.08, TU("sfx-notification-18.wav"), 0.3],
  // finding
  [76.08, TU("sfx-impact-05.wav"), 0.9],
  [76.08, TU("sfx-impact-08.wav"), 0.7],
  [76.58, TU("sfx-impact-03.wav"), 0.4],
  [77.08, TU("sfx-notification-18.wav"), 0.35],
  [78.0, "sfx-transition-02.wav", 0.35],
  [78.58, TU("sfx-impact-03.wav"), 0.35],
  // devs
  [85.08, "sfx-mechanical-13.wav", 0.4],
  [85.58, "sfx-ui-01.wav", 0.3],
  [85.7, "sfx-ui-01.wav", 0.3],
  // RAM again
  ...[89.08, 89.58].flatMap((s): Ev[] => [
    [s - 0.05, "sfx-transition-02.wav", 0.3],
    [s, TU("sfx-impact-03.wav"), 0.3],
  ]),
  // narrower
  [92.08, TU("sfx-impact-03.wav"), 0.3],
  [92.58, TU("sfx-impact-03.wav"), 0.3],
  [93.08, TU("sfx-impact-11.wav"), 0.3],
  // cohort
  ...[100.58, 101.08, 101.58, 102.08].map((s): Ev => [s, TU("sfx-impact-03.wav"), 0.3]),
  [102.58, TU("sfx-notification-18.wav"), 0.4],
  // balance
  [105.0, "sfx-transition-02.wav", 0.5],
  [105.58, TU("sfx-notification-18.wav"), 0.4],
  // final
  [108.5, "sfx-transition-02.wav", 0.35],
  [109.58, TU("sfx-impact-05.wav"), 0.55],
  // end card
  [112.08, TU("sfx-impact-06.wav"), 0.4],
];

const B_AT = 60.08;
const B_TRIM = 32.07;

const Sound: React.FC = () => (
  <>
    <Audio src={staticFile("lib/scene-minimalism-40.mp3")} trimBefore={fr(2.0)} volume={0.7} />
    <Sequence from={fr(B_AT)} durationInFrames={FRAMES - fr(B_AT)}>
      <Audio src={staticFile("lib/scene-minimalism-90.mp3")} trimBefore={fr(B_TRIM)} volume={0.72} />
    </Sequence>
    {/* machine hum, J-cut half a bar before each data-hall picture */}
    {(
      [
        [6.6, 10.2, 0.3],
        [17.58, 26.2, 0.22],
        [33.58, 42.2, 0.3],
      ] as [number, number, number][]
    ).map(([a, b, v]) => (
      <Sequence key={a} from={fr(a)} durationInFrames={fr(b - a)}>
        <Audio src={staticFile("lib/ambience-machine-02.wav")} volume={(f) => v * interpolate(f, [0, 15, fr(b - a) - 12, fr(b - a)], [0, 1, 1, 0], CL)} />
      </Sequence>
    ))}
    {/* room tone under the seam between the tracks and the two quiet beats */}
    {(
      [
        [55.5, 60.4, 0.45],
        [67.9, 70.4, 0.4],
        [95.9, 100.3, 0.45],
      ] as [number, number, number][]
    ).map(([a, b, v]) => (
      <Sequence key={a} from={fr(a)} durationInFrames={fr(b - a)}>
        <Audio src={staticFile("lib/ambience-room-01.wav")} volume={(f) => v * interpolate(f, [0, 12, fr(b - a) - 12, fr(b - a)], [0, 1, 1, 0], CL)} />
      </Sequence>
    ))}
    {EVENTS.map(([s, f, v], i) => (
      <Sequence key={i} from={Math.max(0, fr(s))} durationInFrames={45}>
        <Audio src={staticFile(`lib/${f}`)} volume={v} />
      </Sequence>
    ))}
  </>
);

const SCENES: [number, number, React.FC, ("scale" | "up" | "none")?, ("scale" | "fade" | "none")?][] = [
  [10.08, 12.08, Title],
  [12.08, 18.08, Nvidia],
  [18.08, 26.08, Capex],
  [26.08, 34.08, Chips],
  [34.08, 42.08, Power],
  [42.08, 50.08, Task],
  [50.08, 56.08, Usage],
  [56.08, 68.08, Jobless],
  [68.08, 76.08, Who],
  [76.08, 84.08, Finding],
  [84.08, 88.08, Devs],
  [88.08, 92.08, RamAgain],
  [92.08, 96.08, Narrower],
  [96.08, 100.08, Quiet, "scale", "none"],
  [100.08, 104.08, Cohort, "none"],
  [104.08, 108.08, Balance],
  [108.08, 112.08, Final],
  [112.08, END + 1, EndCard],
];

export const FilmV2: React.FC = () => (
  <AbsoluteFill style={{ background: "#07090b", overflow: "hidden" }}>
    <Scene from={0} to={10.08} inMove="none">
      <Hook />
    </Scene>
    {SCENES.map(([a, b, S, inMove, outMove]) => (
      <Scene key={a} from={a} to={b} inMove={inMove ?? "scale"} outMove={outMove ?? (b > END ? "none" : "scale")}>
        <S />
      </Scene>
    ))}
    <Corner until={112.08} />
    <Sound />
  </AbsoluteFill>
);
