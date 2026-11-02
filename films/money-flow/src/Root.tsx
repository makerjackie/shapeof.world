import React from "react";
import { Composition } from "remotion";
import { Film } from "./Film";
import { FPS, T } from "./timing";

export const Root: React.FC = () => (
  <>
    <Composition id="Film" component={Film} durationInFrames={Math.round(T.end * FPS)} fps={FPS} width={1920} height={1080} />
  </>
);
