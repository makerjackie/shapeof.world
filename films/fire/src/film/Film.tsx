import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import "../theme";
import { K } from "../theme";
import { FPS } from "../timing";
import { World } from "../world/World";
import { shot } from "./director";
import { Brand, Counter, EndCard, Line, Sources, TagView } from "./overlays";
import { SFX } from "./sfx";

export const Film: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const s = shot(t);
  return (
    <AbsoluteFill style={{ background: K.bg }}>
      <World s={s.world} />
      {(s.scrim ?? 0) > 0 && <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(8,6,5,0.78) 0%, rgba(8,6,5,0.35) 26%, rgba(8,6,5,0) 40%, rgba(8,6,5,0) 80%, rgba(8,6,5,0.55) 100%)", opacity: s.scrim }} />}
      {(s.veil ?? 0) > 0 && <AbsoluteFill style={{ background: "rgba(8,6,5,1)", opacity: s.veil }} />}
      <AbsoluteFill>
        {s.tags.map((g, i) => (
          <TagView key={`g${i}`} g={g} t={t} cam={s.world.cam} />
        ))}
        {s.nums.map((x, i) => (
          <Counter key={`n${i}`} x={x} t={t} />
        ))}
        {s.texts.map((x, i) => (
          <Line key={`t${i}`} x={x} t={t} />
        ))}
      </AbsoluteFill>
      {(s.dark ?? 0) > 0 && <AbsoluteFill style={{ background: K.bg, opacity: s.dark }} />}
      {(s.sources ?? 0) > 0 && <Sources vis={s.sources!} />}
      {(s.card ?? 0) > 0 && <EndCard vis={s.card!} t={t} />}
      <Brand vis={1 - Math.max(s.card ?? 0, s.sources ?? 0)} />
      <Audio src={staticFile("music.wav")} volume={0.82} />
      {SFX.map(([at, file, vol], i) => (
        <Sequence key={`s${i}`} from={Math.max(0, Math.round(at * FPS))} durationInFrames={Math.round(3 * FPS)}>
          <Audio src={staticFile(`sfx/${file}.wav`)} volume={vol} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
