import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { GameWorld } from "./game";
import { BrandMark, EndCard, EO, ramp, Sources, useT, win } from "./kit";
import { LifeWorld } from "./life";
import { MindWorld } from "./mind";
import { CUES } from "./sfx";
import { K } from "./theme";
import { A_END, B, C, FILM_FRAMES, fr, sA, sB, sC } from "./timing";

// Night air: three tints, one per chapter (cool blue, indigo, and a faint warmth at the end).
const Backdrop: React.FC = () => {
  const t = useT();
  const a = 1 - ramp(t, A_END - 0.6, A_END);
  const b = win(t, B.start - 0.2, C.start + 3, 0.6, 2.5);
  const c = ramp(t, C.start, C.start + 3);
  const warm = ramp(t, sC(17), sC(21));
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: K.bg }} />
      <AbsoluteFill style={{ opacity: a, background: "radial-gradient(ellipse 70% 80% at 66% 48%, #12213f 0%, #0a1224 45%, #05070b 100%)" }} />
      <AbsoluteFill style={{ opacity: b, background: "radial-gradient(ellipse 70% 80% at 62% 52%, #1a1436 0%, #0d0b1f 50%, #05060b 100%)" }} />
      <AbsoluteFill style={{ opacity: c * (1 - warm), background: "radial-gradient(ellipse 70% 80% at 62% 50%, #10203a 0%, #0a1122 50%, #05070b 100%)" }} />
      <AbsoluteFill style={{ opacity: c * warm, background: "radial-gradient(ellipse 70% 80% at 60% 50%, #2a1a22 0%, #120c14 50%, #05060a 100%)" }} />
    </AbsoluteFill>
  );
};

// Slow dust in the dark, so even a quiet frame moves.
const DUST = Array.from({ length: 80 }, (_, i) => {
  const r = (n: number) => {
    const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  return { x: r(1) * 1920, y: r(2) * 1080, s: 0.8 + r(3) * 2.2, v: 4 + r(4) * 14, o: 0.05 + r(5) * 0.22, p: r(6) * 6.28 };
});
const Dust: React.FC = () => {
  const t = useT();
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      {DUST.map((d, i) => {
        const y = (((d.y - t * d.v) % 1080) + 1080) % 1080;
        const x = d.x + Math.sin(t * 0.3 + d.p) * 12;
        return <circle key={i} cx={x} cy={y} r={d.s} fill="#dfe8ff" opacity={d.o * (0.6 + 0.4 * Math.sin(t * 1.3 + d.p))} />;
      })}
    </svg>
  );
};

const Grain: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ backgroundImage: `url(${staticFile("grain.svg")})`, backgroundSize: "256px 256px", backgroundPosition: `${(f * 37) % 256}px ${(f * 53) % 256}px`, opacity: 0.07, mixBlendMode: "overlay" }} />;
};

const Vignette: React.FC = () => <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 75% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)", pointerEvents: "none" }} />;

const CHAPTERS = [
  { from: sA(10), to: A_END - 0.4, n: "1", t: "游戏里" },
  { from: sB(0.1), to: sB(16.9), n: "2", t: "脑子里" },
  { from: sC(0.9), to: sC(17.3), n: "3", t: "不只是游戏" },
];
const SOURCES_AT = sC(21.55);
const END_AT = sC(23.0);

const Hud: React.FC = () => {
  const t = useT();
  const o = 1 - ramp(t, SOURCES_AT - 0.2, SOURCES_AT + 0.2);
  const ch = CHAPTERS.find((c) => t >= c.from - 0.1 && t < c.to);
  const k = ch ? Math.min(ramp(t, ch.from, ch.from + 0.5, EO), 1 - ramp(t, ch.to - 0.4, ch.to)) : 0;
  return <BrandMark o={o} chapter={ch ? { n: ch.n, t: ch.t, k } : undefined} />;
};

const GAIN = 0.8;

const Sound: React.FC = () => (
  <>
    <Audio src={staticFile("score.wav")} volume={GAIN} />
    {CUES.map((c, i) => (
      <Sequence key={i} from={fr(c.t)} durationInFrames={fr(4)}>
        <Audio src={staticFile(`sfx/${c.id}.wav`)} volume={c.v} />
      </Sequence>
    ))}
  </>
);

export const Film: React.FC = () => {
  const t = useT();
  const fadeOut = ramp(t, (FILM_FRAMES - 18) / 30, (FILM_FRAMES - 1) / 30);
  return (
    <AbsoluteFill style={{ background: K.bg, overflow: "hidden" }}>
      <Sound />
      <Backdrop />
      <Dust />
      <GameWorld />
      <MindWorld />
      <LifeWorld />
      <Hud />
      <Sources at={SOURCES_AT} out={END_AT + 0.3} />
      <EndCard at={END_AT} />
      <Vignette />
      <Grain />
      {fadeOut > 0 ? <AbsoluteFill style={{ background: "#000", opacity: fadeOut }} /> : null}
    </AbsoluteFill>
  );
};
