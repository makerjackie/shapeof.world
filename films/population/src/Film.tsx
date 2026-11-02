import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { Chart, rng } from "./Chart";
import { EndCard, OverviewMarks, PopChart, PopText, Question, WorldTop } from "./Ending";
import { Brand, Events, Header, hits, Panel, useBar, vis } from "./Hud";
import { CURSOR, TILT, TILTX } from "./plan";
import { C } from "./theme";

const Background: React.FC = () => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse 90% 60% at 60% 62%, #10131b 0%, ${C.bg} 70%)` }}>
    <AbsoluteFill
      style={{
        backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1.4px)",
        backgroundSize: "36px 36px",
        maskImage: "radial-gradient(ellipse 80% 55% at 55% 62%, black 20%, transparent 80%)",
      }}
    />
  </AbsoluteFill>
);

const Grain: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          opacity: 0.06,
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          backgroundPosition: `${(f * 37) % 220}px ${(f * 53) % 220}px`,
          mixBlendMode: "overlay",
        }}
      />
      <AbsoluteFill style={{ background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0px, rgba(0,0,0,0.12) 1px, transparent 1px, transparent 3px)", opacity: 0.35 }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 75% 70% at 50% 50%, transparent 55%, rgba(0,0,0,0.7) 100%)" }} />
    </AbsoluteFill>
  );
};

export const Film: React.FC = () => {
  const bar = useBar();
  const frame = useCurrentFrame();
  const h = hits(bar);
  const r = rng(frame * 13 + 5);
  const shx = (r() - 0.5) * 34 * h.shake;
  const shy = (r() - 0.5) * 34 * h.shake;
  // chart visibility: dim under the title, gone for the projection and the world table, back for the question
  const title = vis(bar, 6.5, 8.0, 0.15, 0.25);
  const chartA = Math.max(0, 1 - vis(bar, 84.0, 97.4, 0.8, 0.6)) * (1 - title * 0.75);
  const hud = vis(bar, -1, 84.2, 0.1, 0.4);
  const rewind = vis(bar, 4.5, 6.5, 0.1, 0.2);
  const tilt = TILT(bar);
  const tiltX = TILTX(bar);
  const split = h.split;
  const c = CURSOR(bar);
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <Background />
      <AbsoluteFill
        style={{
          transform: `translate(${shx}px, ${shy}px)`,
          filter: split > 0.03 ? `drop-shadow(${10 * split}px 0 0 rgba(255,0,60,${0.55 * split})) drop-shadow(${-10 * split}px 0 0 rgba(0,220,255,${0.55 * split}))` : undefined,
        }}
      >
        <AbsoluteFill style={{ transform: `perspective(1900px) rotateY(${tilt}deg) rotateX(${tiltX}deg) scale(1.1)`, transformOrigin: "55% 62%", filter: rewind > 0 ? `blur(${rewind * 3}px)` : undefined }}>
          <Chart alpha={chartA} colAlpha={1} lineAlpha={1} showHeads={bar < 78.8} overview={0} />
        </AbsoluteFill>
        <OverviewMarks />
        <PopChart opacity={vis(bar, 84.0, 97.0, 0.6, 0.6) * (1 - vis(bar, 92.6, 97.2, 0.3, 0.3) * 0.75)} />
        <PopText />
        <Header opacity={hud} />
        <Panel opacity={hud * (1 - title)} yearF={c - 0.9} />
        <Events />
        <WorldTop />
        <Question />
      </AbsoluteFill>
      {rewind > 0 && (
        <AbsoluteFill style={{ opacity: rewind * 0.5, background: "repeating-linear-gradient(90deg, rgba(255,255,255,0.0) 0px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0) 40px)" }} />
      )}
      <AbsoluteFill style={{ background: "#fff", opacity: h.flash * 0.6, mixBlendMode: "screen" }} />
      <Grain />
      {bar < 101.2 && <Brand opacity={1} />}
      <EndCard />
      <Audio src={staticFile("score.wav")} />
    </AbsoluteFill>
  );
};
