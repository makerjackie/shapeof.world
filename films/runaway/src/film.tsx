// 一句普通的话 (full film). Cold open → Friday → the weekend → the cut → Monday → the pull-back → "是编的" → the
// stamps → why → the landing → sources → the end card. Timing in time.ts.
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { BrandMark, EndCard, ramp, useT } from "./kit";
import { END_AT, Land } from "./land";
import { Monday, Zoom } from "./monday";
import { HIT_END, Open } from "./open";
import { Stamps } from "./stamps";
import { at, CUT, FILM_FRAMES, fr, MONDAY, REWIND } from "./time";
import { Weekend } from "./weekend";
import { Why } from "./why";

type Cue = { t: number; id: string; v: number };
const B1 = (tt: number) => at("B1", tt);
const B2 = (tt: number) => at("B2", tt);
const E = (tt: number) => at("E", tt);
const CUES: Cue[] = [
  // cold open
  { t: 0.05, id: "sfx-notification-05", v: 0.5 },
  { t: at("A", 87.31), id: "sfx-notification-03", v: 0.4 },
  ...[89.46, 90.77, 92.06].map((tt) => ({ t: at("A", tt), id: "sfx-notification-15", v: 0.32 })),
  { t: HIT_END + 0.05, id: "sfx-impact-16", v: 0.55 },
  // Friday: typing, send, reply, the lid
  ...Array.from({ length: 22 }, (_, i) => ({ t: B1(0.76) + i / 8.5, id: i % 3 ? "sfx-mechanical-03" : "sfx-mechanical-04", v: 0.16 })),
  { t: B1(3.84), id: "sfx-ui-19", v: 0.45 },
  { t: B1(5.71), id: "sfx-notification-04", v: 0.4 },
  { t: B1(6.6), id: "sfx-foley-16", v: 0.45 },
  { t: B1(8.0), id: "sfx-transition-08", v: 0.35 },
  // the steps: card in, ✓
  ...[B1(10.1), B1(17.2), B1(26.6), B2(53.69), B2(59.88), B2(70.75), B2(74.17), B2(80.4)].map((t) => ({ t, id: "sfx-ui-07", v: 0.35 })),
  ...[B1(16.31), B1(25.53), B1(30.5), B2(58.21), B2(69.13), B2(73.4), B2(79.37), B2(84.19)].map((t) => ({ t, id: "sfx-notification-01", v: 0.42 })),
  { t: B2(53.69) - 0.05, id: "sfx-transition-10", v: 0.4 }, // masks the music seam
  ...Array.from({ length: 10 }, (_, i) => ({ t: B2(55.0) + i * 0.32, id: "sfx-ui-01", v: 0.22 })),
  ...[63.36, 64.64, 65.59, 66.59].map((tt) => ({ t: B2(tt), id: "sfx-impact-08", v: 0.4 })),
  { t: B2(74.9), id: "sfx-scifi-09", v: 0.35 },
  { t: B2(76.99), id: "sfx-magic-07", v: 0.3 },
  { t: B2(80.89), id: "sfx-notification-18", v: 0.45 },
  // the flood: ✓ after ✓, faster and faster
  ...Array.from({ length: 34 }, (_, i) => ({ t: B2(85.01) + (-14 + Math.sqrt(196 + 36 * i * 6)) / 18, id: "sfx-notification-01", v: 0.18 })),
  // Monday
  { t: at("C", 98.25), id: "sfx-notification-05", v: 0.45 },
  { t: at("C", 100.84), id: "sfx-ui-19", v: 0.35 },
  { t: at("C", 106.09), id: "sfx-notification-02", v: 0.45 },
  { t: at("C", 116.35), id: "sfx-transition-08", v: 0.3 },
  { t: at("D1", 122.0), id: "sfx-transition-05", v: 0.5 },
  { t: at("D2", 142.85) - 0.1, id: "sfx-transition-12", v: 0.3 }, // masks the music seam
  ...[123.5, 124.3, 125.1, 125.9, 126.6].map((tt) => ({ t: at("D1", tt), id: "sfx-ui-04", v: 0.25 })),
  // the stamps
  { t: E(53.7), id: "sfx-transition-03", v: 0.35 },
  ...[55.6, 59.88, 65.59, 69.13, 72.91].flatMap((tt) => [
    { t: E(tt), id: "sfx-impact-16", v: 0.6 },
    { t: E(tt) + 0.02, id: "sfx-impact-20", v: 0.5 },
  ]),
  // why
  { t: at("F", 99.4), id: "sfx-water-20", v: 0.35 },
  { t: at("F", 110.64), id: "sfx-impact-08", v: 0.4 },
  { t: at("F", 118.6), id: "sfx-transition-03", v: 0.4 },
  // the end
  { t: END_AT, id: "sfx-impact-20", v: 0.5 },
];

const Grain: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ backgroundImage: `url(${staticFile("grain.svg")})`, backgroundSize: "256px 256px", backgroundPosition: `${(f * 37) % 256}px ${(f * 53) % 256}px`, opacity: 0.045, mixBlendMode: "overlay" }} />;
};
const Vignette: React.FC = () => <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 75% at 50% 50%, transparent 60%, rgba(0,0,0,0.45) 100%)", pointerEvents: "none" }} />;

export const Film: React.FC = () => {
  const t = useT();
  const black = t >= CUT && t < MONDAY; // the cut
  const rewinding = t >= REWIND && t < at("B1", 0);
  const brand = t < END_AT ? (black ? 0 : 1) * (rewinding ? 0.4 : 1) : 0;
  const fadeOut = ramp(t, (FILM_FRAMES - 20) / 30, (FILM_FRAMES - 1) / 30);
  return (
    <AbsoluteFill style={{ background: "#05070b", overflow: "hidden" }}>
      <Audio src={staticFile("score.wav")} volume={0.9} />
      {CUES.map((c, i) => (
        <Sequence key={i} from={Math.max(0, fr(c.t))} durationInFrames={fr(4)}>
          <Audio src={staticFile(`sfx/${c.id}.wav`)} volume={c.v} />
        </Sequence>
      ))}
      <Open />
      <Weekend />
      <Monday />
      <Zoom />
      <Stamps />
      <Why />
      <Land />
      {black ? <AbsoluteFill style={{ background: "#000" }} /> : null}
      <BrandMark o={brand} />
      <EndCard at={END_AT} />
      <Vignette />
      <Grain />
      {fadeOut > 0 ? <AbsoluteFill style={{ background: "#000", opacity: fadeOut }} /> : null}
    </AbsoluteFill>
  );
};
export { FILM_FRAMES };
