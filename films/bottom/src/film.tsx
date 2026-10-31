// 房价的底: the whole film. Timing in story bars (time.ts); scenes: open.tsx (sb 0–17), skyline.tsx (18–59.6),
// insight.tsx (59–92).
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { BrandMark, EndCard, EO, keys, lerp, ramp, useT } from "./kit";
import { Insight } from "./insight";
import { Open, QUOTE_AT, TAGS } from "./open";
import { Skyline } from "./skyline";
import { BEAT, FILM_FRAMES, fr, S } from "./time";
import { Sky } from "./world";

const END_AT = S(91.2);

type Cue = { t: number; id: string; v: number };
const CUES: Cue[] = [
  ...TAGS.map((g, i) => ({ t: g.at, id: i % 2 ? "sfx-ui-03" : "sfx-ui-02", v: 0.4 })),
  { t: 0.85, id: "sfx-impact-16", v: 0.4 },
  { t: S(3.05), id: "sfx-transition-08", v: 0.4 },
  ...Array.from({ length: 8 }, (_, i) => ({ t: S(3.1) + i * BEAT * 0.25, id: "sfx-ui-01", v: 0.18 })),
  { t: S(4.8), id: "sfx-impact-08", v: 0.45 },
  { t: S(5.6), id: "sfx-impact-16", v: 0.45 },
  { t: S(8.3), id: "sfx-ui-06", v: 0.4 },
  { t: S(10.6), id: "sfx-ui-10", v: 0.4 },
  ...[0, 1, 2, 3].map((i) => ({ t: QUOTE_AT(i), id: "sfx-notification-14", v: 0.3 })),
  { t: S(15.15), id: "sfx-impact-08", v: 0.45 },
  { t: S(16.5), id: "sfx-transition-12", v: 0.35 },
  { t: S(18.9), id: "sfx-transition-05", v: 0.35 },
  { t: S(20.7), id: "sfx-ui-07", v: 0.4 },
  { t: S(22.6), id: "sfx-ui-07", v: 0.4 },
  { t: S(24.7), id: "sfx-scifi-09", v: 0.35 },
  { t: S(28.6), id: "sfx-ui-06", v: 0.38 },
  { t: S(29.3), id: "sfx-ui-06", v: 0.38 },
  { t: S(31), id: "sfx-transition-08", v: 0.4 },
  ...Array.from({ length: 12 }, (_, i) => ({ t: S(31.4) + i * 0.12, id: "sfx-ui-01", v: 0.15 })),
  { t: S(33.2), id: "sfx-impact-12", v: 0.35 },
  { t: S(38), id: "sfx-transition-12", v: 0.3 },
  { t: S(42.2), id: "sfx-scifi-03", v: 0.35 },
  { t: S(45.1), id: "sfx-ui-07", v: 0.35 },
  { t: S(46.6), id: "sfx-ui-10", v: 0.35 },
  { t: S(51.2), id: "sfx-ui-04", v: 0.28 },
  { t: S(56), id: "sfx-impact-05", v: 0.6 }, // the one discovery
  { t: S(59.3), id: "sfx-transition-08", v: 0.35 },
  { t: S(65.6), id: "sfx-transition-05", v: 0.35 },
  { t: S(67.2), id: "sfx-ui-06", v: 0.35 },
  { t: S(68.4), id: "sfx-ui-06", v: 0.35 },
  { t: S(72), id: "sfx-impact-05", v: 0.5 },
  { t: S(83), id: "sfx-transition-12", v: 0.3 },
  { t: S(88), id: "sfx-impact-16", v: 0.35 },
  { t: END_AT, id: "sfx-impact-20", v: 0.5 },
];

const Grain: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ backgroundImage: `url(${staticFile("grain.svg")})`, backgroundSize: "256px 256px", backgroundPosition: `${(f * 37) % 256}px ${(f * 53) % 256}px`, opacity: 0.05, mixBlendMode: "overlay" }} />;
};
const Vignette: React.FC = () => <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 75% at 50% 50%, transparent 58%, rgba(0,0,0,0.5) 100%)", pointerEvents: "none" }} />;

export const Film: React.FC = () => {
  const t = useT();
  const horizon = t > S(18) && t < S(33.5) ? lerp(860, 930, ramp(t, S(31), S(33), EO)) : 930;
  const dim = keys(t, [[S(0), 0.45], [S(17), 0.45], [S(18.5), 0.1], [S(59), 0.1], [S(59.6), 0.4], [S(65), 0.4], [S(66), 0.1], [S(83), 0.1], [S(84), 0.3]]);
  const fadeOut = ramp(t, (FILM_FRAMES - 12) / 30, (FILM_FRAMES - 1) / 30);
  return (
    <AbsoluteFill style={{ background: "#04060b", overflow: "hidden" }}>
      <Audio src={staticFile("score.wav")} volume={0.85} />
      {CUES.map((c, i) => (
        <Sequence key={i} from={Math.max(0, fr(c.t))} durationInFrames={fr(4)}>
          <Audio src={staticFile(`sfx/${c.id}.wav`)} volume={c.v} />
        </Sequence>
      ))}
      <Sky t={t} dim={dim} horizon={horizon} />
      <Open />
      <Skyline />
      <Insight />
      <BrandMark o={1 - ramp(t, END_AT - 0.2, END_AT)} />
      <EndCard at={END_AT} />
      <Vignette />
      <Grain />
      {fadeOut > 0 ? <AbsoluteFill style={{ background: "#000", opacity: fadeOut }} /> : null}
    </AbsoluteFill>
  );
};
