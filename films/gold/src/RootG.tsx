import React from "react";
import { Composition } from "remotion";
import { GOLD } from "./g/gold";
import { createFilm, EngineG } from "./g/EngineG";
import { SampleG, SAMPLE_FRAMES } from "./g/SampleG";

const gold = createFilm(GOLD);
const Gold: React.FC = () => <EngineG film={gold} audio="filmG_gold.wav" />;

export const RootG: React.FC = () => (
  <>
    <Composition id="Gold" component={Gold} durationInFrames={gold.frames} fps={30} width={1080} height={1920} />
    <Composition id="GoldSample" component={SampleG} durationInFrames={SAMPLE_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
