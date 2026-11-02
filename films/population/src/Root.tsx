import React from "react";
import { Composition } from "remotion";
import { Film } from "./Film";
import { T2, T2_FRAMES } from "./v2/T2";
import { T3, T3_FRAMES } from "./v2/T3";
import { FILM_FRAMES, FPS, H, W } from "./time";

export const Root: React.FC = () => (
  <>
    <Composition id="T3" component={T3} durationInFrames={T3_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="T2" component={T2} durationInFrames={T2_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="Film" component={Film} durationInFrames={FILM_FRAMES} fps={FPS} width={W} height={H} />
  </>
);
