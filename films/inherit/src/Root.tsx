import React from "react";
import { Composition } from "remotion";
import { Cover } from "./Cover";
import { Film } from "./film";
import { Open } from "./open";
import { FILM_FRAMES, FPS, SAMPLE_FRAMES } from "./timing";

export const Root: React.FC = () => (
  <>
    <Composition id="Film" component={Film} durationInFrames={FILM_FRAMES} fps={FPS} width={1920} height={1080} />
    {(["A", "B"] as const).map((v) => (
      <React.Fragment key={v}>
        <Composition id={`Cover169${v}`} component={Cover} durationInFrames={1} fps={FPS} width={1920} height={1080} defaultProps={{ w: 1920, h: 1080, v }} />
        <Composition id={`Cover43${v}`} component={Cover} durationInFrames={1} fps={FPS} width={1440} height={1080} defaultProps={{ w: 1440, h: 1080, v }} />
        <Composition id={`Cover34${v}`} component={Cover} durationInFrames={1} fps={FPS} width={1080} height={1440} defaultProps={{ w: 1080, h: 1440, v }} />
      </React.Fragment>
    ))}
    <Composition id="Sample" component={Open} durationInFrames={SAMPLE_FRAMES} fps={FPS} width={1920} height={1080} />
  </>
);
