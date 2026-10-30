import React from "react";
import { Composition } from "remotion";
import { Film } from "./film/Film";
import { Lab, SHOTS } from "./Lab";
import { FILM_FRAMES, FPS } from "./timing";

export const Root: React.FC = () => (
  <>
    <Composition id="Film" component={Film} durationInFrames={FILM_FRAMES} fps={FPS} width={1920} height={1080} />
    <Composition id="Lab" component={Lab} durationInFrames={SHOTS.length} fps={FPS} width={1920} height={1080} />
  </>
);
