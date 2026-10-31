import React from "react";
import { Composition } from "remotion";
import { Open } from "./open";
import { FPS, SAMPLE_FRAMES } from "./timing";

export const Root: React.FC = () => (
  <>
    <Composition id="Sample" component={Open} durationInFrames={SAMPLE_FRAMES} fps={FPS} width={1920} height={1080} />
  </>
);
