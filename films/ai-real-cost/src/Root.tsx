import React from "react";
import { Composition, Still } from "remotion";
import { CoverA, CoverB } from "./Cover";
import { Film } from "./Film";
import { FILM_FRAMES } from "./scenes";
import { FPS } from "./timing";

export const Root: React.FC = () => (
  <>
    <Composition id="Film" component={Film} durationInFrames={FILM_FRAMES} fps={FPS} width={1920} height={1080} />
    <Still id="cover-A-16x9" component={CoverA} width={1920} height={1080} defaultProps={{ wide: true }} />
    <Still id="cover-A-4x3" component={CoverA} width={1440} height={1080} defaultProps={{ wide: false }} />
    <Still id="cover-B-16x9" component={CoverB} width={1920} height={1080} defaultProps={{ wide: true }} />
    <Still id="cover-B-4x3" component={CoverB} width={1440} height={1080} defaultProps={{ wide: false }} />
  </>
);
