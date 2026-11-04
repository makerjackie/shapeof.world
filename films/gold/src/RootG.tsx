import React from "react";
import { Composition } from "remotion";
import { GOLD } from "./g/gold";
import { createFilm, EngineG } from "./g/EngineG";

const gold = createFilm(GOLD);
const Gold: React.FC = () => <EngineG film={gold} audio="filmG_gold.wav" />;

export const RootG: React.FC = () => (
  <>
    <Composition id="Gold" component={Gold} durationInFrames={gold.frames} fps={30} width={1080} height={1920} />
  </>
);
