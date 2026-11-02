import React from "react";
import { Composition } from "remotion";
import { Film } from "./Film";
import { FILM_FRAMES, FPS, H, W } from "./time";

export const Root: React.FC = () => (
  <>
    <Composition id="Film" component={Film} durationInFrames={FILM_FRAMES} fps={FPS} width={W} height={H} />
  </>
);
