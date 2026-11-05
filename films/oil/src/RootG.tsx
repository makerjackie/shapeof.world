import React from "react";
import { Composition } from "remotion";
import { OIL } from "./g/oil";
import { createFilm5, EngineG5 } from "./g/EngineO";
const oil = createFilm5(OIL);
const Oil: React.FC = () => <EngineG5 film={oil} audio="filmG_oil.wav" />;

export const RootG: React.FC = () => (
  <>
    <Composition id="Oil" component={Oil} durationInFrames={oil.frames} fps={30} width={1080} height={1920} />
  </>
);
