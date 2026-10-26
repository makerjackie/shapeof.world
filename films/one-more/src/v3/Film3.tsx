import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { BrandMark, EO, ramp, useT } from "../kit";
import { K } from "../theme";
import { Game3 } from "./game3";
import { CUES3 } from "./sfx3";
import { FILM_FRAMES, fr, T } from "./time";

// The night sky (tools/texture.py), drifting slowly, with a soft light behind the subject.
const Backdrop3: React.FC = () => {
  const t = useT();
  const s = 1.06 + 0.0006 * t;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: K.bg }} />
      <Img src={staticFile("nebula.jpg")} style={{ position: "absolute", left: -240, top: -135, width: 2400, height: 1350, transform: `scale(${s}) translate(${-t * 1.2}px, ${-t * 0.4}px)`, opacity: 0.9 }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 55% 60% at 64% 52%, rgba(40,90,170,0.22) 0%, rgba(20,40,90,0.08) 45%, transparent 75%)" }} />
    </AbsoluteFill>
  );
};

const DUST = Array.from({ length: 90 }, (_, i) => {
  const r = (n: number) => {
    const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  return { x: r(1) * 1920, y: r(2) * 1080, s: 0.8 + r(3) * 2.4, v: 4 + r(4) * 16, o: 0.05 + r(5) * 0.25, p: r(6) * 6.28 };
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
const Vignette: React.FC = () => <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 75% at 50% 50%, transparent 55%, rgba(0,0,0,0.6) 100%)", pointerEvents: "none" }} />;

const CHAPTERS3 = [{ from: T(8.4), to: T(27.6), n: "1", t: "游戏里" }];
const Hud3: React.FC = () => {
  const t = useT();
  const ch = CHAPTERS3.find((c) => t >= c.from - 0.1 && t < c.to);
  const k = ch ? Math.min(ramp(t, ch.from, ch.from + 0.5, EO), 1 - ramp(t, ch.to - 0.4, ch.to)) : 0;
  return <BrandMark o={1} chapter={ch ? { n: ch.n, t: ch.t, k } : undefined} />;
};

const Sound3: React.FC = () => (
  <>
    <Audio src={staticFile("score3.wav")} volume={0.85} />
    {CUES3.map((c, i) => (
      <Sequence key={i} from={fr(c.t)} durationInFrames={fr(4)}>
        <Audio src={staticFile(`sfx/${c.id}.wav`)} volume={c.v} />
      </Sequence>
    ))}
  </>
);

export const Film3: React.FC = () => (
  <AbsoluteFill style={{ background: K.bg, overflow: "hidden" }}>
    <Sound3 />
    <Backdrop3 />
    <Dust />
    <Game3 />
    <Hud3 />
    <Vignette />
    <Grain />
  </AbsoluteFill>
);

export const FILM3_FRAMES = FILM_FRAMES;
export const SAMPLE3_FRAMES = fr(T(16.6));
