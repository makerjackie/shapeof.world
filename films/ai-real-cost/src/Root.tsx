import React from "react";
import { Composition } from "remotion";
import { Film } from "./Film";
import { FILM_FRAMES } from "./scenes";
import { FPS } from "./timing";

export const Root: React.FC = () => (
  <Composition id="Film" component={Film} durationInFrames={FILM_FRAMES} fps={FPS} width={1920} height={1080} />
);
