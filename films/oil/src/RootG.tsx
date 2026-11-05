import React from "react";
import { Composition } from "remotion";
import { OIL } from "./g/oil";
import { createFilm5, EngineG5 } from "./g/EngineO";
import { Cover34, Cover43 } from "./g/CoverO";
const oil = createFilm5(OIL);
const Oil: React.FC = () => <EngineG5 film={oil} audio="filmG_oil.wav" />;

export const RootG: React.FC = () => (
  <>
    <Composition id="OilCover34" component={Cover34} durationInFrames={1} fps={30} width={1200} height={1600} />
    <Composition id="OilCover43" component={Cover43} durationInFrames={1} fps={30} width={1600} height={1200} />
    <Composition id="Oil" component={Oil} durationInFrames={oil.frames} fps={30} width={1080} height={1920} />
  </>
);
