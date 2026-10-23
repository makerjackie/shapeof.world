import React from "react";
import { Composition, Still } from "remotion";
import { Cover } from "./Cover";
import { Film } from "./Film";
import { SampleA } from "./samples/SampleA";
import { SampleB } from "./samples/SampleB";
import { SampleC } from "./samples/SampleC";
import { SAMPLE_FRAMES } from "./samples/common";
import { FILM_FRAMES } from "./scenes";
import { FPS } from "./timing";

export const Root: React.FC = () => (
  <>
    <Composition id="Film" component={Film} durationInFrames={FILM_FRAMES} fps={FPS} width={1920} height={1080} />
    <Composition id="SampleA" component={SampleA} durationInFrames={SAMPLE_FRAMES} fps={FPS} width={1920} height={1080} />
    <Composition id="SampleB" component={SampleB} durationInFrames={SAMPLE_FRAMES} fps={FPS} width={1920} height={1080} />
    <Composition id="SampleC" component={SampleC} durationInFrames={SAMPLE_FRAMES} fps={FPS} width={1920} height={1080} />
    <Still id="cover-16x9" component={Cover} width={1920} height={1080} defaultProps={{ tall: false }} />
    <Still id="cover-3x4" component={Cover} width={1080} height={1440} defaultProps={{ tall: true }} />
  </>
);
