import React from "react";
import { Composition, Still } from "remotion";
import { Cover } from "./Cover";
import { CoverMockG } from "./CoverMock";
import { Film } from "./Film";
import { FILM_FRAMES, FPS } from "./timing";

export const Root: React.FC = () => (
  <>
    <Composition id="Film" component={Film} durationInFrames={FILM_FRAMES} fps={FPS} width={1920} height={1080} />
    <Still id="cover-16x9" component={Cover} width={1920} height={1080} defaultProps={{ tall: false }} />
    <Still id="cover-3x4" component={Cover} width={1080} height={1440} defaultProps={{ tall: true }} />
    {/* the series cover template that films/DIRECTOR.md points to (G) */}
    <Still id="mock-G-16x9" component={CoverMockG} width={1920} height={1080} defaultProps={{ tall: false }} />
    <Still id="mock-G-3x4" component={CoverMockG} width={1080} height={1440} defaultProps={{ tall: true }} />
  </>
);
