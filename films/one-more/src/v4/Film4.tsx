import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { BrandMark, EO, ramp, useT } from "../kit";
import { K } from "../theme";
import { CARD_AT, WALL_AT } from "./cards";
import { HITS, LOSE, WIPE } from "./fight";
import { Open4, OPEN4_END, PRESS } from "./open4";
import { beat, fr } from "./time";

// Night sky behind the phone once the camera pulls back (the teamfight fills the screen before that).
const Backdrop4: React.FC = () => {
  const t = useT();
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: K.bg }} />
      <Img src={staticFile("nebula.jpg")} style={{ position: "absolute", left: -240, top: -135, width: 2400, height: 1350, transform: `scale(${1.06 + 0.0006 * t}) translate(${-t * 1.2}px, ${-t * 0.4}px)`, opacity: 0.9 }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 55% 60% at 55% 50%, rgba(40,90,170,0.22) 0%, rgba(20,40,90,0.08) 45%, transparent 75%)" }} />
    </AbsoluteFill>
  );
};

const Grain: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ backgroundImage: `url(${staticFile("grain.svg")})`, backgroundSize: "256px 256px", backgroundPosition: `${(f * 37) % 256}px ${(f * 53) % 256}px`, opacity: 0.06, mixBlendMode: "overlay" }} />;
};
const Vignette: React.FC = () => <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 75% at 50% 50%, transparent 58%, rgba(0,0,0,0.5) 100%)", pointerEvents: "none" }} />;

const Hud4: React.FC = () => {
  const t = useT();
  const k = ramp(t, beat(16), beat(16.8), EO);
  return <BrandMark o={1} chapter={k > 0 ? { n: "1", t: "游戏里", k } : undefined} />;
};

type Cue = { t: number; id: string; v: number };
export const CUES4: Cue[] = [
  ...HITS.slice(0, 4).map((h) => ({ t: h, id: "sfx-impact-13", v: 0.42 })),
  { t: HITS[4], id: "sfx-magic-16", v: 0.5 },
  { t: WIPE, id: "sfx-impact-16", v: 0.7 },
  { t: LOSE, id: "sfx-impact-11", v: 0.6 },
  { t: beat(7.2), id: "sfx-transition-05", v: 0.45 },
  { t: PRESS, id: "sfx-ui-04", v: 0.75 },
  ...Array.from({ length: 8 }, (_, i) => ({ t: CARD_AT(i), id: "sfx-ui-07", v: 0.45 })),
  { t: WALL_AT, id: "sfx-transition-11", v: 0.45 },
];

const Sound4: React.FC = () => (
  <>
    <Audio src={staticFile("score4.wav")} volume={0.85} />
    {CUES4.map((c, i) => (
      <Sequence key={i} from={Math.max(0, fr(c.t))} durationInFrames={fr(4)}>
        <Audio src={staticFile(`sfx/${c.id}.wav`)} volume={c.v} />
      </Sequence>
    ))}
  </>
);

export const Film4: React.FC = () => (
  <AbsoluteFill style={{ background: K.bg, overflow: "hidden" }}>
    <Sound4 />
    <Backdrop4 />
    <Open4 />
    <Hud4 />
    <Vignette />
    <Grain />
  </AbsoluteFill>
);

export const SAMPLE4_FRAMES = fr(OPEN4_END + 0.4);
