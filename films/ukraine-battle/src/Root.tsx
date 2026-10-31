import React from "react";
import { Composition } from "remotion";
import { Film } from "./film/Film";
import { FILM_SECONDS } from "./film/text";
import { Lab, SHOTS } from "./Lab";
import { Cover } from "./film/Cover";
import { SampleA, SampleB, SampleC } from "./samples/Samples";
import { Still } from "remotion";
import { SampleD, D_FPS, D_FRAMES } from "./samples/Trench";
import { SampleE, E_FPS, E_FRAMES } from "./samples/Field";

export const Root: React.FC = () => (
  <>
    <Composition id="Film" component={Film} durationInFrames={Math.round(FILM_SECONDS * 30)} fps={30} width={1920} height={1080} />
    <Composition id="Lab" component={Lab} durationInFrames={SHOTS.length} fps={30} width={1920} height={1080} />
    <Still id="cover-16x9" component={Cover} width={1920} height={1080} defaultProps={{ tall: false }} />
    <Still id="cover-3x4" component={Cover} width={1080} height={1440} defaultProps={{ tall: true }} />
    <Composition id="SampleA" component={SampleA} durationInFrames={300} fps={30} width={1920} height={1080} />
    <Composition id="SampleB" component={SampleB} durationInFrames={300} fps={30} width={1920} height={1080} />
    <Composition id="SampleC" component={SampleC} durationInFrames={300} fps={30} width={1920} height={1080} />
    <Composition id="SampleD" component={SampleD} durationInFrames={D_FRAMES} fps={D_FPS} width={1920} height={1080} />
    <Composition id="SampleE" component={SampleE} durationInFrames={E_FRAMES} fps={E_FPS} width={1920} height={1080} />
  </>
);
