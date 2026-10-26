import React from "react";
import { Composition, Still } from "remotion";
import { Cover } from "./Cover";
import { Film } from "./Film";
import { Film3, FILM3_FRAMES, SAMPLE3_FRAMES } from "./v3/Film3";
import { Film4, SAMPLE4_FRAMES } from "./v4/Film4";
import { Film6, SAMPLE6_FRAMES } from "./v4/open6";
import { Film7, SAMPLE7_FRAMES } from "./v4/open7";
import { FILM_FRAMES, FPS } from "./timing";

export const Root: React.FC = () => (
  <>
    <Composition id="Film" component={Film} durationInFrames={FILM_FRAMES} fps={FPS} width={1920} height={1080} />
    <Composition id="Film3" component={Film3} durationInFrames={FILM3_FRAMES} fps={FPS} width={1920} height={1080} />
    <Composition id="Sample3" component={Film3} durationInFrames={SAMPLE3_FRAMES} fps={FPS} width={1920} height={1080} />
    <Composition id="Sample4" component={Film4} durationInFrames={SAMPLE4_FRAMES} fps={FPS} width={1920} height={1080} />
    <Composition id="Sample6" component={Film6} durationInFrames={SAMPLE6_FRAMES} fps={FPS} width={1920} height={1080} />
    <Composition id="Sample7" component={Film7} durationInFrames={SAMPLE7_FRAMES} fps={FPS} width={1920} height={1080} />
    <Still id="cover-16x9" component={Cover} width={1920} height={1080} defaultProps={{ tall: false }} />
    <Still id="cover-3x4" component={Cover} width={1080} height={1440} defaultProps={{ tall: true }} />
  </>
);
