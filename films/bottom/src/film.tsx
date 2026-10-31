// 房价到底了吗: the whole film. Timing in story bars (time.ts); scenes: hook.tsx (sb 0–11), story.tsx (11–69).
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { BrandMark, EndCard, keys, ramp, useT } from "./kit";
import { Hook, QUOTES, RUN0, RUN1 } from "./hook";
import { SINK, Story } from "./story";
import { BEAT, FILM_FRAMES, fr, S } from "./time";
import { Sky } from "./world";

const END_AT = S(68.2);

type Cue = { t: number; id: string; v: number };
const CUES: Cue[] = [
  // the fall: a tick per half beat while the towers sink, a hit on the 35 cities and the question
  ...Array.from({ length: Math.floor((RUN1 - RUN0) / (BEAT / 2)) }, (_, i) => ({ t: RUN0 + (i * BEAT) / 2, id: "sfx-ui-01", v: 0.16 + 0.1 * (i / 12) })),
  { t: S(4.4), id: "sfx-impact-08", v: 0.45 },
  { t: S(5.1), id: "sfx-impact-16", v: 0.5 },
  ...QUOTES.map((q) => ({ t: q.at, id: "sfx-impact-12", v: 0.42 })),
  { t: S(10.4), id: "sfx-transition-12", v: 0.35 },
  // history: one thud per place
  ...[0, 1, 2, 3, 4].map((i) => ({ t: SINK(i), id: "sfx-impact-12", v: 0.32 })),
  { t: S(17.1), id: "sfx-ui-06", v: 0.38 },
  { t: S(18.45), id: "sfx-impact-08", v: 0.42 },
  // the order
  { t: S(20.2), id: "sfx-transition-08", v: 0.38 },
  ...[21.7, 24.1, 26.5, 28.9].map((sb) => ({ t: S(sb), id: "sfx-ui-07", v: 0.38 })),
  // China on the steps
  { t: S(32.05), id: "sfx-transition-05", v: 0.32 },
  ...[33.4, 35.1, 36.8, 38.4].map((sb) => ({ t: S(sb), id: "sfx-ui-10", v: 0.34 })),
  // silence, borrowing, rent vs interest
  { t: S(41.02), id: "sfx-impact-05", v: 0.55 },
  { t: S(43.6), id: "sfx-ui-04", v: 0.3 },
  { t: S(46.2), id: "sfx-ui-06", v: 0.35 },
  { t: S(46.8), id: "sfx-ui-06", v: 0.35 },
  { t: S(49.05), id: "sfx-impact-16", v: 0.45 },
  { t: S(53.1), id: "sfx-impact-05", v: 0.5 },
  { t: S(56.3), id: "sfx-transition-08", v: 0.35 },
  { t: S(63.1), id: "sfx-transition-12", v: 0.3 },
  { t: END_AT, id: "sfx-impact-20", v: 0.5 },
];

const Grain: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ backgroundImage: `url(${staticFile("grain.svg")})`, backgroundSize: "256px 256px", backgroundPosition: `${(f * 37) % 256}px ${(f * 53) % 256}px`, opacity: 0.05, mixBlendMode: "overlay" }} />;
};
const Vignette: React.FC = () => <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 75% at 50% 50%, transparent 58%, rgba(0,0,0,0.5) 100%)", pointerEvents: "none" }} />;

export const Film: React.FC = () => {
  const t = useT();
  const dim = keys(t, [[0, 0.15], [S(10), 0.15], [S(10.5), 0.1]]);
  const fadeOut = ramp(t, (FILM_FRAMES - 12) / 30, (FILM_FRAMES - 1) / 30);
  return (
    <AbsoluteFill style={{ background: "#04060b", overflow: "hidden" }}>
      <Audio src={staticFile("score.wav")} volume={0.85} />
      {CUES.map((c, i) => (
        <Sequence key={i} from={Math.max(0, fr(c.t))} durationInFrames={fr(4)}>
          <Audio src={staticFile(`sfx/${c.id}.wav`)} volume={c.v} />
        </Sequence>
      ))}
      <Sky t={t} dim={dim} horizon={930} />
      <Hook />
      <Story />
      <BrandMark o={1 - ramp(t, END_AT - 0.2, END_AT)} />
      <EndCard at={END_AT} />
      <Vignette />
      <Grain />
      {fadeOut > 0 ? <AbsoluteFill style={{ background: "#000", opacity: fadeOut }} /> : null}
    </AbsoluteFill>
  );
};
