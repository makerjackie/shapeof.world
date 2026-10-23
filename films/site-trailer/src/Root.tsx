import React from "react";
import { Composition } from "remotion";
import { FILM_FRAMES, FPS } from "./edl";
import { Film } from "./Film";
import { Loop, LOOP_FRAMES } from "./Loop";

export const Root: React.FC = () => (
  <>
    <Composition id="Film" component={Film} durationInFrames={FILM_FRAMES} fps={FPS} width={1920} height={1080} />
    <Composition id="Loop" component={Loop} durationInFrames={LOOP_FRAMES} fps={FPS} width={1920} height={1080} />
  </>
);
