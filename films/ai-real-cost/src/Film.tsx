import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { CAPTIONS } from "./captions";
import { Caption, CL, Corner, EIO, FilmTime, pr } from "./kit";
import { Answer, ANSWER_AT, END_AT, EndCard, Sand, SAND_AT } from "./scenes/coda";
import { Exam, EXAM_END, EXAM_START, Formula, FORMULA_END } from "./scenes/exam";
import { Hook, HOOK_END, Title, TITLE_END } from "./scenes/hook";
import { Plan, PLAN_END, Ruler, RULER_END } from "./scenes/plan";
import {
  Bill,
  BILL_AT,
  BILL_END,
  Desk,
  DESK_END,
  Hard,
  HARD_AT,
  HARD_END,
  HOURS_AT,
  HOURS_END,
  Hours,
  LAMP_ON,
  Loop,
  LOOP_AT,
  LOOP_END,
  Machine,
  MACH_AT,
  MACH_END,
  Price,
  PRICE_AT,
  PRICE_END,
  WALL_AT,
  WALL_END,
  Walls,
} from "./scenes/time";
import { EVENTS } from "./sound";
import { K } from "./theme";
import { BAR, FB, FILM_FRAMES, FILM_S, FPS, fr, MUSIC_EDIT, MUSIC_END, MUTE, trackTime } from "./timing";

// Each scene is mounted only inside its window [from, to] (film seconds); scenes handle their own in/out motion.
const SCENES: { from: number; to: number; C: React.FC }[] = [
  { from: 0, to: HOOK_END + 0.5, C: Hook },
  { from: HOOK_END - 0.6, to: TITLE_END + 0.5, C: Title },
  { from: FB(6) - 0.5, to: PLAN_END + 0.4, C: Plan },
  { from: PLAN_END - 0.5, to: RULER_END + 0.4, C: Ruler },
  { from: EXAM_START - 0.5, to: EXAM_END + 0.4, C: Exam },
  { from: FB(22) - 0.5, to: FORMULA_END, C: Formula },
  { from: LAMP_ON - 0.3, to: DESK_END + 0.4, C: Desk },
  { from: LOOP_AT - 0.5, to: LOOP_END + 0.3, C: Loop },
  { from: WALL_AT - 0.5, to: WALL_END + 0.3, C: Walls },
  { from: HOURS_AT - 0.4, to: HOURS_END + 0.2, C: Hours },
  { from: MACH_AT - 0.4, to: MACH_END + 0.2, C: Machine },
  { from: PRICE_AT - 0.4, to: PRICE_END + 0.2, C: Price },
  { from: BILL_AT - 0.3, to: BILL_END + 0.3, C: Bill },
  { from: HARD_AT - 0.4, to: HARD_END + 0.2, C: Hard },
  { from: ANSWER_AT - 0.4, to: SAND_AT + 0.3, C: Answer },
  { from: SAND_AT - 0.5, to: END_AT + 0.3, C: Sand },
  { from: END_AT - 0.3, to: FILM_S, C: EndCard },
];

// 《千年之后（氛围版）》, cut only on bar lines (timing.ts). Each segment overlaps its neighbours by XF frames with an
// equal-power crossfade centred on the downbeat. The two muted bars are the film's real silences; the final loudness
// pass (tools/render.sh) brings the mix to about −12 LUFS.
const GAIN = 0.75;
const XF = 2;
const muteAt = (t: number) =>
  MUTE.reduce((v, m) => v * (1 - interpolate(t, [FB(m.from) - 0.05, FB(m.from) + 0.04, FB(m.to) - 0.04, FB(m.to)], [0, 1, 1, 0], CL)), 1);

const Music: React.FC = () => (
  <>
    {MUSIC_EDIT.map((m, i) => {
      const segFrom = FB(m.at);
      const segTo = i < MUSIC_EDIT.length - 1 ? FB(MUSIC_EDIT[i + 1].at) : MUSIC_END;
      const from = Math.max(0, fr(segFrom) - XF);
      const to = Math.min(FILM_FRAMES, fr(segTo) + XF);
      return (
        <Sequence key={i} from={from} durationInFrames={to - from}>
          <Audio
            src={staticFile("music.m4a")}
            trimBefore={Math.round(trackTime(segFrom) * FPS) - (fr(segFrom) - from)}
            volume={(f) => {
              const fa = f + from;
              const t = fa / FPS;
              const fin = i === 0 ? 1 : Math.sin((Math.PI / 2) * interpolate(fa, [fr(segFrom) - XF, fr(segFrom) + XF], [0, 1], CL));
              const fout = i === MUSIC_EDIT.length - 1 ? 1 : Math.cos((Math.PI / 2) * interpolate(fa, [fr(segTo) - XF, fr(segTo) + XF], [0, 1], CL));
              return GAIN * fin * fout * muteAt(t);
            }}
          />
        </Sequence>
      );
    })}
    {/* room tone under the two silences and the quiet start of the "your time" chapter */}
    <Sequence from={fr(FB(26))} durationInFrames={fr(FB(61)) - fr(FB(26))}>
      <Audio
        src={staticFile("lib/ambience-room-01.wav")}
        loop
        volume={(f) => {
          const t = FB(26) + f / FPS;
          const a = interpolate(t, [FB(26), FB(27), FB(28), FB(28) + BAR, FB(36), FB(37)], [0, 0.55, 0.55, 0.3, 0.3, 0], CL);
          const b = interpolate(t, [FB(58), FB(59), FB(60), FB(60) + 0.5], [0, 0.5, 0.5, 0], CL);
          return a + b;
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
  const warm = (t > FB(27) && t < FB(28) + 0.3) || (t > FB(59) && t < FB(60)) ? 0.4 : 1;
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
