import React from "react";
import { Composition, Still } from "remotion";
import { Cover } from "./Cover";
import { Film } from "./Film";
import { FILM_FRAMES } from "./scenes";
import { FPS } from "./timing";

export const Root: React.FC = () => (
  <>
    <Composition id="Film" component={Film} durationInFrames={FILM_FRAMES} fps={FPS} width={1920} height={1080} />
    <Still id="cover-16x9" component={Cover} width={1920} height={1080} defaultProps={{ shape: "16x9" as const }} />
    <Still id="cover-4x3" component={Cover} width={1440} height={1080} defaultProps={{ shape: "4x3" as const }} />
    <Still id="cover-3x4" component={Cover} width={1080} height={1440} defaultProps={{ shape: "3x4" as const }} />
  </>
);
