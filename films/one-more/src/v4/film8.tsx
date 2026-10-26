// 再来一局 (full film): one word, 差一点. Timed in story bars (time.ts): the opening (0–10), chapter 1 game (10–17), half a
// bar of silence, the lab (17–24), the discovery on the quiet interlude and the brain (24–43.5), chapter 3 not only games
// (43.5–52.5), the return and the last line (52.5–59), sources and the end card on the track's own fade.
import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { BrandMark, EndCard, EO, ramp, useT, win } from "../kit";
import { Ch1 } from "./ch1";
import { Lab } from "./lab8";
import { EVERY_AT, Life8 } from "./life8";
import { Mind8 } from "./mind8";
import { CUES7, Open7 } from "./open7";
import { BEAT, beat, FILM_FRAMES, fr, S, SIL0 } from "./time";

const END_AT = S(60.6);

const CHAPTERS = [
  { from: beat(16), to: S(16.9), n: "1", t: "游戏里" },
  { from: S(17.1), to: S(43.4), n: "2", t: "脑子里" },
  { from: S(43.6), to: S(52.4), n: "3", t: "不只是游戏" },
];
const Hud8: React.FC = () => {
  const t = useT();
  const ch = CHAPTERS.find((c) => t >= c.from - 0.1 && t < c.to);
  const k = ch ? Math.min(ramp(t, ch.from, ch.from + 0.5, EO), 1 - ramp(t, ch.to - 0.4, ch.to)) : 0;
  const o = (1 - 0.6 * win(t, beat(7.2), beat(9.4), 0.3, 0.3)) * (1 - ramp(t, S(58.9), S(59.1))) * (1 - win(t, SIL0 - 0.05, S(17) + 0.05, 0.12, 0.12));
  return <BrandMark o={o} chapter={ch ? { n: ch.n, t: ch.t, k } : undefined} />;
};

type Cue = { t: number; id: string; v: number };
const CUES8: Cue[] = [
  ...CUES7.filter((c) => c.t < S(10)),
  // chapter 1: even teams, the history, the feeling, the rank that never moves, then the silence
  { t: S(10), id: "sfx-transition-08", v: 0.45 },
  { t: S(10.25), id: "sfx-impact-20", v: 0.45 },
  ...Array.from({ length: 7 }, (_, i) => ({ t: S(12.05) + i * BEAT * 0.5, id: "sfx-ui-01", v: 0.32 })),
  { t: S(13.5), id: "sfx-impact-08", v: 0.55 },
  { t: S(14.05), id: "sfx-impact-16", v: 0.5 },
  ...Array.from({ length: 7 }, (_, i) => ({ t: S(15) + i * BEAT, id: i % 2 ? "sfx-ui-03" : "sfx-ui-02", v: 0.35 })),
  // the lab
  { t: S(17.02), id: "sfx-mechanical-01", v: 0.5 },
  { t: S(17.2), id: "sfx-mechanical-05", v: 0.4 },
  { t: S(17.6), id: "sfx-mechanical-19", v: 0.32 },
  { t: S(17.8), id: "sfx-mechanical-19", v: 0.32 },
  { t: S(18.25), id: "sfx-mechanical-19", v: 0.38 },
  { t: S(18.3), id: "sfx-ui-06", v: 0.4 },
  { t: S(18.6), id: "sfx-ui-10", v: 0.35 },
  { t: S(19.6), id: "sfx-ui-10", v: 0.35 },
  { t: S(21), id: "sfx-ui-06", v: 0.35 },
  { t: S(22.5), id: "sfx-scifi-09", v: 0.3 },
  { t: S(24), id: "sfx-impact-05", v: 0.7 }, // the one discovery
  // the brain, real near misses, one night, the thumb, knowing against wanting
  { t: S(25.5), id: "sfx-transition-08", v: 0.35 },
  { t: S(27), id: "sfx-ui-06", v: 0.35 },
  { t: S(27.4), id: "sfx-scifi-03", v: 0.28 },
  { t: S(28.5), id: "sfx-impact-16", v: 0.4 },
  ...Array.from({ length: 6 }, (_, i) => ({ t: S(30.05) + i * (BEAT / 2), id: "sfx-ui-01", v: 0.18 })),
  { t: S(30.7), id: "sfx-ui-06", v: 0.3 },
  { t: S(32.05), id: "sfx-impact-08", v: 0.4 },
  ...Array.from({ length: 9 }, (_, i) => ({ t: S(33.6) + i * BEAT * 1.2, id: "sfx-ui-07", v: 0.32 })),
  { t: S(36.5), id: "sfx-impact-08", v: 0.5 },
  ...Array.from({ length: 8 }, (_, i) => ({ t: S(37.7) + i * BEAT, id: "sfx-ui-04", v: 0.3 })),
  { t: S(39.6), id: "sfx-notification-14", v: 0.42 },
  { t: S(42), id: "sfx-impact-16", v: 0.45 },
  // not only games, the coffee card, far goals, the return, the last line
  ...Array.from({ length: 4 }, (_, i) => ({ t: EVERY_AT(i), id: "sfx-ui-07", v: 0.45 })),
  { t: S(46.1), id: "sfx-foley-02", v: 0.4 },
  ...Array.from({ length: 9 }, (_, i) => ({ t: S(46.1) + i * 0.07, id: "sfx-impact-12", v: 0.22 })),
  { t: S(49), id: "sfx-transition-12", v: 0.35 },
  { t: S(52.5), id: "sfx-transition-05", v: 0.35 },
  { t: S(57.3), id: "sfx-impact-05", v: 0.45 },
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
      <Audio src={staticFile("score9.wav")} volume={0.85} />
      {CUES8.map((c, i) => (
        <Sequence key={i} from={Math.max(0, fr(c.t))} durationInFrames={fr(4)}>
          <Audio src={staticFile(`sfx/${c.id}.wav`)} volume={c.v} />
        </Sequence>
      ))}
      {t > beat(8.8) && t < S(10.2) ? <Img src={staticFile("bed.jpg")} style={{ position: "absolute", left: -240, top: -135, width: 2400, height: 1350 }} /> : null}
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
