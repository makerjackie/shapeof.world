import React from "react";
import { Composition } from "remotion";
import { Film } from "./film";
import { Open } from "./open";
import { FILM_FRAMES, FPS, SAMPLE_FRAMES } from "./timing";

export const Root: React.FC = () => (
  <>
    <Composition id="Film" component={Film} durationInFrames={FILM_FRAMES} fps={FPS} width={1920} height={1080} />
    <Composition id="Sample" component={Open} durationInFrames={SAMPLE_FRAMES} fps={FPS} width={1920} height={1080} />
  </>
);
