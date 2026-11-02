// 社会真的是个草台班子吗？ The whole film, timed in story bars (time.ts).
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { BrandMark, EndCard, ramp, useT } from "./kit";
import { Open, OPEN_END } from "./open";
import { Cases } from "./cases";
import { Front } from "./front";
import { Xz } from "./xz";
import { Nurse } from "./nurse";
import { Flight } from "./flight";
import { Climax, END_AT, SOURCES_AT } from "./climax";
import { Tabs } from "./sheet";
import { FILM_FRAMES, fr, S } from "./time";
import { CUES } from "./cues";

const Grain: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ backgroundImage: `url(${staticFile("grain.svg")})`, backgroundSize: "256px 256px", backgroundPosition: `${(f * 37) % 256}px ${(f * 53) % 256}px`, opacity: 0.05, mixBlendMode: "overlay" }} />;
};
const Vignette: React.FC = () => <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 75% at 50% 50%, transparent 58%, rgba(0,0,0,0.5) 100%)", pointerEvents: "none" }} />;
const Room: React.FC = () => <AbsoluteFill style={{ background: "radial-gradient(ellipse 70% 60% at 50% 45%, #15181c 0%, #0b0c0f 55%, #060708 100%)" }} />;

export const TAB_KEYS: [number, number][] = [
  [0, 0],
  [S(8.8), 1],
  [S(18), 2],
  [S(27), 3],
  [S(40), 4],
  [S(56), 5],
  [S(73.5), 0],
];
const tabAt = (t: number) => {
  let a = 0;
  for (const [at, i] of TAB_KEYS) if (t >= at) a = i;
  return a;
};


export const Film: React.FC = () => {
  const t = useT();
  const fadeOut = ramp(t, (FILM_FRAMES - 20) / 30, (FILM_FRAMES - 1) / 30);
  const tabsO = 1 - ramp(t, S(7.45), S(7.7)) * (1 - ramp(t, OPEN_END - 0.2, OPEN_END));
  return (
    <AbsoluteFill style={{ background: "#060708", overflow: "hidden" }}>
      <Audio src={staticFile("score.wav")} volume={0.85} />
      {CUES.map((c, i) => (
        <Sequence key={i} from={Math.max(0, fr(c.t))} durationInFrames={fr(3)}>
          <Audio src={staticFile(`sfx/${c.id}.wav`)} volume={c.v} />
        </Sequence>
      ))}
      <Room />
      <Open />
      <Cases />
      <Front />
      <Xz />
      <Nurse />
      <Flight />
      <Climax />
      <Tabs o={t < SOURCES_AT ? tabsO : 0} active={tabAt(t)} reveal={Math.max(...TAB_KEYS.filter(([a]) => t >= a).map(([, i]) => i)) + 1} />
      <BrandMark o={t < END_AT ? 1 : 0} />
      <EndCard at={END_AT} />
      <Vignette />
      <Grain />
      {fadeOut > 0 ? <AbsoluteFill style={{ background: "#000", opacity: fadeOut }} /> : null}
    </AbsoluteFill>
  );
};
