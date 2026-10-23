import React from "react";
import { Composition, Still } from "remotion";
import { Cover } from "./Cover";
import { Cover4 } from "./v4/Cover4";
import { Film } from "./Film";
import { Lab, SHOTS } from "./Lab";
import { FILM_FRAMES } from "./scenes";
import { FPS } from "./timing";
import { Film4, FILM4_FRAMES } from "./v4/Film4";

export const Root: React.FC = () => (
  <>
    <Composition id="Film" component={Film4} durationInFrames={FILM4_FRAMES} fps={FPS} width={1920} height={1080} />
    <Composition id="FilmV2" component={Film} durationInFrames={FILM_FRAMES} fps={FPS} width={1920} height={1080} />
    <Composition id="Lab" component={Lab} durationInFrames={SHOTS.length} fps={FPS} width={1920} height={1080} />
    <Still id="cover-16x9" component={Cover4} width={1920} height={1080} defaultProps={{ tall: false }} />
    <Still id="cover-3x4" component={Cover4} width={1080} height={1440} defaultProps={{ tall: true }} />
    <Still id="cover2-16x9" component={Cover} width={1920} height={1080} defaultProps={{ tall: false }} />
  </>
);
