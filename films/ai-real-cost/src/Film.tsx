import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { CAPTIONS } from "./captions";
import { Caption, CL, Corner, EIO, FilmTime, pr } from "./kit";
import { Answer, END_AT, EndCard, Sand } from "./scenes/coda";
import { Exam, EXAM_END, EXAM_START, Formula, FORMULA_END } from "./scenes/exam";
import { Hook, HOOK_END, Title, TITLE_END } from "./scenes/hook";
import { Plan, PLAN_END, Ruler, RULER_END } from "./scenes/plan";
import { Bill, BILL_AT, BILL_END, Desk, DESK_END, HOURS_AT, HOURS_END, Hours, LAMP_ON, Loop, LOOP_AT, LOOP_END, WALL_AT, WALL_END, Walls } from "./scenes/time";
import { EVENTS } from "./sound";
import { K } from "./theme";
import { B, barA, barB, CHORD, FILM_FRAMES, FILM_S, FPS, fr, MUTE_B } from "./timing";

// Each scene is mounted only inside its window [from, to] (film seconds); scenes handle their own in/out motion.
const SCENES: { from: number; to: number; C: React.FC }[] = [
  { from: 0, to: HOOK_END + 0.5, C: Hook },
  { from: HOOK_END - 0.6, to: TITLE_END + 0.5, C: Title },
  { from: barA(6) - 0.5, to: PLAN_END + 0.4, C: Plan },
  { from: PLAN_END - 0.5, to: RULER_END + 0.4, C: Ruler },
  { from: EXAM_START - 0.5, to: EXAM_END + 0.4, C: Exam },
  { from: barA(22) - 0.5, to: FORMULA_END, C: Formula },
  { from: LAMP_ON - 0.3, to: DESK_END + 0.4, C: Desk },
  { from: LOOP_AT - 0.5, to: LOOP_END + 0.3, C: Loop },
  { from: WALL_AT - 0.5, to: WALL_END + 0.3, C: Walls },
  { from: HOURS_AT - 0.4, to: HOURS_END + 0.2, C: Hours },
  { from: BILL_AT - 0.7, to: BILL_END + 0.3, C: Bill },
  { from: CHORD[0] - 0.4, to: CHORD[1] + 0.3, C: Answer },
  { from: CHORD[1] - 0.5, to: CHORD[3] + 0.3, C: Sand },
  { from: END_AT - 0.3, to: FILM_S, C: EndCard },
];

// Levels. Both tracks are mastered hot (about −15 dBFS RMS, peaks near −1 dBFS); the final loudness pass in
// tools/finish.sh brings the mix to about −12 LUFS with a −1.5 dBTP ceiling.
const GAIN_A = 0.62;
const GAIN_B = 0.62;

const Music: React.FC = () => (
  <>
    <Audio src={staticFile("lib/scene-chamber-40.mp3")} volume={GAIN_A} />
    <Sequence from={fr(B.at)} durationInFrames={FILM_FRAMES - fr(B.at)}>
      <Audio
        src={staticFile("lib/scene-soul-90.mp3")}
        volume={(f) => {
          const t = B.at + f / FPS;
          // stop-time: B's bar 15 is muted, back on the bar-16 downbeat
          const mute = interpolate(t, [barB(MUTE_B.from) - 0.04, barB(MUTE_B.from) + 0.03, barB(MUTE_B.to) - 0.03, barB(MUTE_B.to)], [1, 0, 0, 1], CL);
          const tail = interpolate(t, [FILM_S - 2.2, FILM_S - 0.1], [1, 0], CL);
          return GAIN_B * mute * tail;
        }}
      />
    </Sequence>
    {/* room tone under the "your time" chapter; it comes up in the two silences */}
    <Sequence from={fr(56.0)} durationInFrames={FILM_FRAMES - fr(56.0)}>
      <Audio
        src={staticFile("lib/ambience-room-01.wav")}
        loop
        volume={(f) => {
          const t = 56.0 + f / FPS;
          const base = interpolate(t, [56.0, 58.2, 60.4, 61.5, CHORD[0], FILM_S - 1], [0, 0.55, 0.55, 0.22, 0.22, 0], CL);
          const hush = interpolate(t, [barB(MUTE_B.from) - 0.1, barB(MUTE_B.from) + 0.2, barB(MUTE_B.to) - 0.1, barB(MUTE_B.to) + 0.4], [0, 0.35, 0.35, 0], CL);
          return base + hush;
        }}
      />
    </Sequence>
  </>
);

const Sfx: React.FC = () => (
  <>
    {EVENTS.map(([s, f, v], i) => (
      <Sequence key={i} from={Math.max(0, fr(s))} durationInFrames={Math.max(1, Math.min(75, FILM_FRAMES - fr(s)))}>
        <Audio src={staticFile(`lib/${f}`)} volume={v} />
      </Sequence>
    ))}
  </>
);

// Dark table: a soft warm pool of light that drifts, fine grain, vignette. No spectrum bar, no progress bar.
const Backdrop: React.FC<{ t: number }> = ({ t }) => {
  const x = 50 + Math.sin(t * 0.21) * 12;
  const y = 46 + Math.cos(t * 0.17) * 8;
  const warm = t > 58.2 && t < 60.4 ? 0.4 : 1;
  return (
    <AbsoluteFill style={{ background: K.bg }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 65% 60% at ${x}% ${y}%, rgba(64,52,40,${0.55 * warm}) 0%, rgba(20,22,26,0.6) 55%, transparent 80%)` }} />
      <AbsoluteFill style={{ backgroundImage: "linear-gradient(rgba(244,240,232,0.028) 1px, transparent 1px), linear-gradient(90deg, rgba(244,240,232,0.028) 1px, transparent 1px)", backgroundSize: "96px 96px", backgroundPosition: `${-t * 6}px ${t * 3}px` }} />
    </AbsoluteFill>
  );
};

const Vignette: React.FC = () => <AbsoluteFill style={{ background: "radial-gradient(ellipse 85% 80% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)", pointerEvents: "none" }} />;
const Grain: React.FC = () => <AbsoluteFill style={{ backgroundImage: `url(${staticFile("grain.svg")})`, opacity: 0.05, pointerEvents: "none" }} />;

export const Film: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cornerOut = pr(t, END_AT - 0.4, 0.4, EIO);
  return (
    <FilmTime.Provider value={t}>
      <AbsoluteFill style={{ background: K.bg, overflow: "hidden" }}>
        <Backdrop t={t} />
        {SCENES.map((s, i) => (
          <Sequence key={i} from={fr(s.from)} durationInFrames={fr(s.to) - fr(s.from)}>
            <s.C />
          </Sequence>
        ))}
        {CAPTIONS.map((c, i) => (t > c.at - 0.4 && t < c.end + 0.1 ? <Caption key={i} t={t} {...c} /> : null))}
        <Vignette />
        <Grain />
        <Corner opacity={1 - cornerOut} />
        <Music />
        <Sfx />
      </AbsoluteFill>
    </FilmTime.Provider>
  );
};
