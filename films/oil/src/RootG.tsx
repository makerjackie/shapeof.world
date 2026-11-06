import React from "react";
import { Composition } from "remotion";
import { OIL } from "./g/oil";
import { OILEN } from "./g/oilen";
import { createFilm5, EngineG5 } from "./g/EngineO";
import { Cover169, Cover169EN, Cover34, Cover34EN, Cover43 } from "./g/CoverO";
const oil = createFilm5(OIL);
const oilEn = createFilm5(OILEN);
const Oil: React.FC = () => <EngineG5 film={oil} audio="filmG_oil.wav" />;
const OilEN: React.FC = () => <EngineG5 film={oilEn} audio="filmG_oil.wav" />;

// covers to the house rule: 16:9 (Bilibili, YouTube), 4:3 (Bilibili 4:3, Douyin landscape), 3:4 (Channels, Douyin portrait)
export const RootG: React.FC = () => (
  <>
    <Composition id="OilCover169" component={Cover169} durationInFrames={1} fps={30} width={1920} height={1080} />
    <Composition id="OilCover43" component={Cover43} durationInFrames={1} fps={30} width={1440} height={1080} />
    <Composition id="OilCover34" component={Cover34} durationInFrames={1} fps={30} width={1080} height={1440} />
    <Composition id="Oil" component={Oil} durationInFrames={oil.frames} fps={30} width={1080} height={1920} />
    <Composition id="OilEN" component={OilEN} durationInFrames={oilEn.frames} fps={30} width={1080} height={1920} />
    <Composition id="OilCover169EN" component={Cover169EN} durationInFrames={1} fps={30} width={1920} height={1080} />
    <Composition id="OilCover34EN" component={Cover34EN} durationInFrames={1} fps={30} width={1080} height={1440} />
  </>
);
