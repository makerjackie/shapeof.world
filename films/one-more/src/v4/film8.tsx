// 再来一局 (full film): one word, 差一点. Opening (track bars 8–18), chapter 1 game (18–30), a bar of silence, chapter 2
// brain (30–64, the discovery on the quiet interlude at 40), chapter 3 not only games (64–74), the return and the last
// line (74–80), sources and the end card on the track's own fade.
import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { BrandMark, EndCard, EO, ramp, useT, win } from "../kit";
import { Ch1 } from "./ch1";
import { Lab } from "./lab8";
import { Life8 } from "./life8";
import { Mind8 } from "./mind8";
import { CUES7, Open7 } from "./open7";
import { BEAT, beat, FILM_FRAMES, fr, T } from "./time";

const END_AT = T(81.5);

const CHAPTERS = [
  { from: beat(16), to: T(29.6), n: "1", t: "游戏里" },
  { from: T(30.1), to: T(63.9), n: "2", t: "脑子里" },
  { from: T(64.1), to: T(73.9), n: "3", t: "不只是游戏" },
];
const Hud8: React.FC = () => {
  const t = useT();
  const ch = CHAPTERS.find((c) => t >= c.from - 0.1 && t < c.to);
  const k = ch ? Math.min(ramp(t, ch.from, ch.from + 0.5, EO), 1 - ramp(t, ch.to - 0.4, ch.to)) : 0;
  const o = (1 - 0.6 * win(t, beat(7.2), beat(9.4), 0.3, 0.3)) * (1 - ramp(t, T(79.4), T(79.7))) * (1 - win(t, T(29.65), T(30.05), 0.15, 0.15));
  return <BrandMark o={o} chapter={ch ? { n: ch.n, t: ch.t, k } : undefined} />;
};

type Cue = { t: number; id: string; v: number };
const CUES8: Cue[] = [
  ...CUES7.filter((c) => c.t < T(18)),
  // chapter 1: even teams, the history, the feeling, into the dark
  { t: T(18), id: "sfx-transition-08", v: 0.45 },
  { t: T(18.5), id: "sfx-impact-20", v: 0.45 },
  ...Array.from({ length: 7 }, (_, i) => ({ t: T(22.1) + i * BEAT * 0.75, id: "sfx-ui-01", v: 0.32 })),
  { t: T(25), id: "sfx-impact-08", v: 0.55 },
  { t: T(26), id: "sfx-impact-16", v: 0.5 },
  { t: T(27.15), id: "sfx-transition-12", v: 0.35 },
  // the lab (after one bar of silence)
  { t: T(30), id: "sfx-mechanical-01", v: 0.5 },
  { t: T(30.15), id: "sfx-mechanical-05", v: 0.4 },
  { t: T(30.75), id: "sfx-mechanical-19", v: 0.32 },
  { t: T(31.0), id: "sfx-mechanical-19", v: 0.32 },
  { t: T(31.5), id: "sfx-mechanical-19", v: 0.38 },
  { t: T(31.6), id: "sfx-ui-06", v: 0.4 },
  { t: T(32.6), id: "sfx-ui-10", v: 0.35 },
  { t: T(34.6), id: "sfx-ui-10", v: 0.35 },
  { t: T(36.5), id: "sfx-scifi-09", v: 0.3 },
  { t: T(38.5), id: "sfx-ui-06", v: 0.35 },
  { t: T(40), id: "sfx-impact-05", v: 0.7 }, // the one discovery
  // the brain, one night, the thumb, knowing against wanting
  { t: T(42), id: "sfx-transition-08", v: 0.35 },
  { t: T(44), id: "sfx-ui-06", v: 0.35 },
  { t: T(44.8), id: "sfx-scifi-03", v: 0.28 },
  { t: T(46), id: "sfx-impact-16", v: 0.4 },
  ...Array.from({ length: 8 }, (_, i) => ({ t: T(48) + i * (BEAT / 2), id: "sfx-ui-01", v: 0.18 })),
  ...Array.from({ length: 9 }, (_, i) => ({ t: T(50.2) + i * BEAT * 1.6, id: "sfx-ui-07", v: 0.32 })),
  { t: T(54.5), id: "sfx-impact-08", v: 0.5 },
  ...Array.from({ length: 13 }, (_, i) => ({ t: T(56.3) + i * BEAT, id: "sfx-ui-04", v: 0.3 })),
  { t: T(60.4), id: "sfx-notification-14", v: 0.42 },
  { t: T(62.5), id: "sfx-impact-16", v: 0.45 },
  // not only games, the coffee card, far goals, the return, the last line
  ...Array.from({ length: 6 }, (_, i) => ({ t: T(64.3) + i * BEAT * 2, id: "sfx-ui-07", v: 0.45 })),
  { t: T(68), id: "sfx-foley-02", v: 0.4 },
  ...Array.from({ length: 9 }, (_, i) => ({ t: T(68.1) + i * 0.08, id: "sfx-impact-12", v: 0.22 })),
  { t: T(71.6), id: "sfx-transition-12", v: 0.35 },
  { t: T(74), id: "sfx-transition-05", v: 0.35 },
  { t: T(76.6), id: "sfx-foley-20", v: 0.3 },
  { t: T(78), id: "sfx-impact-05", v: 0.45 },
  { t: END_AT, id: "sfx-impact-20", v: 0.55 },
];

const Grain: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ backgroundImage: `url(${staticFile("grain.svg")})`, backgroundSize: "256px 256px", backgroundPosition: `${(f * 37) % 256}px ${(f * 53) % 256}px`, opacity: 0.05, mixBlendMode: "overlay" }} />;
};
const Vignette: React.FC = () => <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 75% at 50% 50%, transparent 58%, rgba(0,0,0,0.5) 100%)", pointerEvents: "none" }} />;

export const Film8: React.FC = () => {
  const t = useT();
  const fadeOut = ramp(t, (FILM_FRAMES - 20) / 30, (FILM_FRAMES - 1) / 30);
  return (
    <AbsoluteFill style={{ background: "#05070b", overflow: "hidden" }}>
      <Audio src={staticFile("score8.wav")} volume={0.85} />
      {CUES8.map((c, i) => (
        <Sequence key={i} from={Math.max(0, fr(c.t))} durationInFrames={fr(4)}>
          <Audio src={staticFile(`sfx/${c.id}.wav`)} volume={c.v} />
        </Sequence>
      ))}
      {t > beat(8.8) && t < T(18.2) ? <Img src={staticFile("bed.jpg")} style={{ position: "absolute", left: -240, top: -135, width: 2400, height: 1350 }} /> : null}
      <Open7 />
      <Ch1 />
      <Lab />
      <Mind8 />
      <Life8 />
      <Hud8 />
      <EndCard at={END_AT} />
      <Vignette />
      <Grain />
      {fadeOut > 0 ? <AbsoluteFill style={{ background: "#000", opacity: fadeOut }} /> : null}
    </AbsoluteFill>
  );
};

export const FILM8_FRAMES = FILM_FRAMES;
