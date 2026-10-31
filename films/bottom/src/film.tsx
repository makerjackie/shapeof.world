// 房价的底: the whole film. Timing in story bars (time.ts); scenes: hook.tsx (sb 0–10), city.tsx (10–61).
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { BrandMark, EndCard, keys, ramp, useT } from "./kit";
import { City } from "./city";
import { Hook, QUOTES, RUN0, RUN1 } from "./hook";
import { BEAT, FILM_FRAMES, fr, S } from "./time";
import { Sky } from "./world";

const END_AT = S(60.3);

type Cue = { t: number; id: string; v: number };
const CUES: Cue[] = [
  // the fall: a tick per beat while the towers sink, a hit when half the cities are back in 2010
  ...Array.from({ length: Math.floor((RUN1 - RUN0) / (BEAT / 2)) }, (_, i) => ({ t: RUN0 + (i * BEAT) / 2, id: "sfx-ui-01", v: 0.16 + 0.1 * (i / 12) })),
  { t: S(3.05), id: "sfx-impact-08", v: 0.45 },
  { t: S(4.9), id: "sfx-impact-16", v: 0.5 },
  ...QUOTES.map((q) => ({ t: q.at, id: "sfx-impact-12", v: 0.42 })),
  { t: S(9.15), id: "sfx-transition-12", v: 0.35 },
  // the home, floor by floor
  ...Array.from({ length: 22 }, (_, i) => ({ t: S(10.7) + i * ((S(12.5) - S(10.7)) / 22), id: "sfx-ui-01", v: 0.18 })),
  { t: S(12.5), id: "sfx-ui-06", v: 0.4 },
  { t: S(14.5), id: "sfx-scifi-09", v: 0.38 },
  { t: S(18.4), id: "sfx-scifi-03", v: 0.3 },
  { t: S(19.9), id: "sfx-transition-08", v: 0.4 },
  ...Array.from({ length: 12 }, (_, i) => ({ t: S(19.95) + i * 0.1, id: "sfx-ui-01", v: 0.14 })),
  { t: S(22.1), id: "sfx-ui-07", v: 0.4 },
  { t: S(24), id: "sfx-ui-10", v: 0.38 },
  { t: S(27.6), id: "sfx-impact-05", v: 0.55 }, // the verdict
  { t: S(31.55), id: "sfx-ui-04", v: 0.3 },
  { t: S(33.05), id: "sfx-impact-05", v: 0.55 }, // the far cities rose first
  { t: S(35.5), id: "sfx-transition-05", v: 0.35 },
  { t: S(41.05), id: "sfx-impact-16", v: 0.45 },
  { t: S(45.2), id: "sfx-transition-08", v: 0.35 },
  { t: S(46.2), id: "sfx-ui-06", v: 0.35 },
  { t: S(47.3), id: "sfx-ui-06", v: 0.35 },
  { t: S(48.45), id: "sfx-impact-08", v: 0.45 },
  { t: S(50.5), id: "sfx-impact-05", v: 0.45 },
  { t: S(55.3), id: "sfx-transition-12", v: 0.3 },
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
      <City />
      <BrandMark o={1 - ramp(t, END_AT - 0.2, END_AT)} />
      <EndCard at={END_AT} />
      <Vignette />
      <Grain />
      {fadeOut > 0 ? <AbsoluteFill style={{ background: "#000", opacity: fadeOut }} /> : null}
    </AbsoluteFill>
  );
};
