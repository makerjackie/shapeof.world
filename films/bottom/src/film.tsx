// 房价到底了吗: the whole film. Timing in story bars (time.ts); scenes: hook.tsx (sb 0–9.8), story.tsx (9.5–76).
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { BrandMark, EndCard, keys, ramp, useT } from "./kit";
import { Hook, QUOTES, RUN0, RUN1 } from "./hook";
import { BAR_AT, RENT_AT, Story } from "./story";
import { BEAT, FILM_FRAMES, fr, S } from "./time";
import { Sky } from "./world";

const END_AT = S(74.3);

type Cue = { t: number; id: string; v: number };
const CUES: Cue[] = [
  // the fall: a tick per half beat while the towers sink, hits on the 35 cities and the question
  ...Array.from({ length: Math.floor((RUN1 - RUN0) / (BEAT / 2)) }, (_, i) => ({ t: RUN0 + (i * BEAT) / 2, id: "sfx-ui-01", v: 0.16 + 0.1 * (i / 12) })),
  { t: S(3.6), id: "sfx-impact-08", v: 0.45 },
  { t: S(4.6), id: "sfx-impact-16", v: 0.5 },
  ...QUOTES.map((q) => ({ t: q.at, id: "sfx-impact-12", v: 0.42 })),
  // history: one per bar
  { t: S(9.75), id: "sfx-transition-12", v: 0.32 },
  ...[0, 1, 2, 3, 4, 5].map((i) => ({ t: BAR_AT(i), id: "sfx-ui-07", v: 0.3 })),
  { t: S(14.2), id: "sfx-ui-06", v: 0.38 },
  { t: S(15.55), id: "sfx-impact-08", v: 0.42 },
  // the four signs
  { t: S(17.2), id: "sfx-transition-08", v: 0.38 },
  ...[18.8, 21.6, 24.4, 27.2].map((sb) => ({ t: S(sb), id: "sfx-ui-07", v: 0.38 })),
  { t: S(30), id: "sfx-impact-16", v: 0.38 },
  ...[32.6, 34.1, 36.1, 38.1].map((sb) => ({ t: S(sb), id: "sfx-ui-10", v: 0.34 })),
  // why buyers stay away
  { t: S(40.05), id: "sfx-impact-05", v: 0.5 },
  { t: S(42.4), id: "sfx-ui-06", v: 0.35 },
  { t: S(43.6), id: "sfx-ui-06", v: 0.35 },
  { t: S(44.4), id: "sfx-impact-08", v: 0.45 },
  ...[0, 1, 2, 3, 4, 5, 6].map((i) => ({ t: RENT_AT(i), id: "sfx-ui-01", v: 0.22 })),
  { t: S(48.6), id: "sfx-impact-12", v: 0.4 },
  { t: S(50.6), id: "sfx-ui-04", v: 0.3 },
  { t: S(56.05), id: "sfx-impact-16", v: 0.45 },
  { t: S(61.1), id: "sfx-impact-05", v: 0.5 },
  { t: S(64.3), id: "sfx-transition-08", v: 0.35 },
  { t: S(70.1), id: "sfx-transition-12", v: 0.3 },
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
