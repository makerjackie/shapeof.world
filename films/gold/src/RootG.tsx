import React from "react";
import { Composition } from "remotion";
import { GOLD } from "./g/gold";
import { createFilm, EngineG } from "./g/EngineG";
import { SampleG, SAMPLE_FRAMES } from "./g/SampleG";
import { SampleG2, SAMPLE2_FRAMES } from "./g/SampleG2";
import { SampleG3, SAMPLE3_FRAMES } from "./g/SampleG3";
import { Engine4, FRAMES4 } from "./g/Engine4";
import { GOLD5 } from "./g/gold5";
import { createFilm5, EngineG5 } from "./g/EngineG5";
import { Cover169EN, Cover34, Cover34EN, Cover43 } from "./g/CoverG";
import { GOLD5EN } from "./g/gold5en";
const gold5 = createFilm5(GOLD5);
const Gold5: React.FC = () => <EngineG5 film={gold5} audio="filmG_gold5.wav" />;
const gold5en = createFilm5(GOLD5EN);
const Gold5EN: React.FC = () => <EngineG5 film={gold5en} audio="filmG_gold5.wav" />;
const Gold4: React.FC = () => <Engine4 audio="filmG_gold4.wav" />;

const gold = createFilm(GOLD);
const Gold: React.FC = () => <EngineG film={gold} audio="filmG_gold.wav" />;

export const RootG: React.FC = () => (
  <>
    <Composition id="GoldCover34" component={Cover34} durationInFrames={1} fps={30} width={1200} height={1600} />
    <Composition id="GoldCover34EN" component={Cover34EN} durationInFrames={1} fps={30} width={1200} height={1600} />
    <Composition id="GoldCover169EN" component={Cover169EN} durationInFrames={1} fps={30} width={1920} height={1080} />
    <Composition id="GoldCover43" component={Cover43} durationInFrames={1} fps={30} width={1600} height={1200} />
    <Composition id="Gold5EN" component={Gold5EN} durationInFrames={gold5en.frames} fps={30} width={1080} height={1920} />
    <Composition id="Gold5" component={Gold5} durationInFrames={gold5.frames} fps={30} width={1080} height={1920} />
    <Composition id="Gold" component={Gold} durationInFrames={gold.frames} fps={30} width={1080} height={1920} />
    <Composition id="Gold4" component={Gold4} durationInFrames={FRAMES4} fps={30} width={1080} height={1920} />
    <Composition id="GoldSample3" component={SampleG3} durationInFrames={SAMPLE3_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="GoldSample2" component={SampleG2} durationInFrames={SAMPLE2_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="GoldSample" component={SampleG} durationInFrames={SAMPLE_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
