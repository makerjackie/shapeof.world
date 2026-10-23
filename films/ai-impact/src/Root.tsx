import React from "react";
import { Composition, Still } from "remotion";
import { Cover } from "./Cover";
import { Film } from "./Film";
import { FilmV2 } from "./v2/FilmV2";
import { FRAMES as V2_FRAMES } from "./v2/kit";
import { Opening, OPENING_FRAMES } from "./samples/Opening";
import { SampleA } from "./samples/SampleA";
import { SampleB } from "./samples/SampleB";
import { SampleC } from "./samples/SampleC";
import { SAMPLE_FRAMES } from "./samples/common";
import { FILM_FRAMES } from "./scenes";
import { FPS } from "./timing";

export const Root: React.FC = () => (
  <>
    <Composition id="Film" component={Film} durationInFrames={FILM_FRAMES} fps={FPS} width={1920} height={1080} />
    <Composition id="FilmV2" component={FilmV2} durationInFrames={V2_FRAMES} fps={FPS} width={1920} height={1080} />
    <Composition id="Opening" component={Opening} durationInFrames={OPENING_FRAMES} fps={FPS} width={1920} height={1080} />
    <Composition id="SampleA" component={SampleA} durationInFrames={SAMPLE_FRAMES} fps={FPS} width={1920} height={1080} />
    <Composition id="SampleB" component={SampleB} durationInFrames={SAMPLE_FRAMES} fps={FPS} width={1920} height={1080} />
    <Composition id="SampleC" component={SampleC} durationInFrames={SAMPLE_FRAMES} fps={FPS} width={1920} height={1080} />
    <Still id="cover-16x9" component={Cover} width={1920} height={1080} defaultProps={{ tall: false }} />
    <Still id="cover-3x4" component={Cover} width={1080} height={1440} defaultProps={{ tall: true }} />
  </>
);
