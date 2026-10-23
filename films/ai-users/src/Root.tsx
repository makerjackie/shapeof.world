import React from "react";
import { Composition } from "remotion";
import { Cover } from "./Cover";
import { Film } from "./Film";
import { FILM_FRAMES } from "./scenes";
import { FPS } from "./timing";

export const Root: React.FC = () => (
  <>
    <Composition id="Film" component={Film} durationInFrames={FILM_FRAMES} fps={FPS} width={1920} height={1080} />
    <Composition id="cover-16x9" component={Cover} defaultProps={{ tall: false }} durationInFrames={1} fps={FPS} width={1920} height={1080} />
    <Composition id="cover-3x4" component={Cover} defaultProps={{ tall: true }} durationInFrames={1} fps={FPS} width={1080} height={1440} />
  </>
);
