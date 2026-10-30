import React from "react";
import { Composition } from "remotion";
import { Lab, SHOTS } from "./Lab";
import { FPS } from "./timing";

export const Root: React.FC = () => (
  <>
    <Composition id="Lab" component={Lab} durationInFrames={SHOTS.length} fps={FPS} width={1920} height={1080} />
  </>
);
