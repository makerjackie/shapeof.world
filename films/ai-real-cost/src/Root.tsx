import React from "react";
import { Composition, Still } from "remotion";
import { CoverA, CoverB } from "./Cover";
import { CoverMockG } from "./CoverMock";
import { Film } from "./Film";
import { FILM_FRAMES } from "./scenes";
import { FPS } from "./timing";
import { Sample, SAMPLE_FRAMES } from "./v10/Sample";
import { Film10, FILM10_FRAMES } from "./v10/Film10";
import { Race, RACE_FRAMES } from "./v11/Race";
import { Noir12, NOIR12_FRAMES } from "./v12/Noir12";

export const Root: React.FC = () => (
  <>
    <Composition id="Noir12" component={Noir12} durationInFrames={NOIR12_FRAMES} fps={30} width={1920} height={1080} />
    <Composition id="Race11" component={Race} durationInFrames={RACE_FRAMES} fps={30} width={1920} height={1080} />
    <Composition id="Ep1" component={Film10} durationInFrames={FILM10_FRAMES} fps={30} width={1920} height={1080} />
    <Composition id="Sample10" component={Sample} durationInFrames={SAMPLE_FRAMES} fps={30} width={1920} height={1080} />
    <Composition id="Film" component={Film} durationInFrames={FILM_FRAMES} fps={FPS} width={1920} height={1080} />
    <Still id="cover-A-16x9" component={CoverA} width={1920} height={1080} defaultProps={{ wide: true }} />
    <Still id="cover-A-4x3" component={CoverA} width={1440} height={1080} defaultProps={{ wide: false }} />
    <Still id="cover-B-16x9" component={CoverB} width={1920} height={1080} defaultProps={{ wide: true }} />
    <Still id="cover-B-4x3" component={CoverB} width={1440} height={1080} defaultProps={{ wide: false }} />
    {([["G", CoverMockG]] as const).map(([id, C]) => (
      <React.Fragment key={id}>
        <Still id={`mock-${id}-16x9`} component={C} width={1920} height={1080} defaultProps={{ tall: false }} />
        <Still id={`mock-${id}-3x4`} component={C} width={1080} height={1440} defaultProps={{ tall: true }} />
      </React.Fragment>
    ))}
  </>
);
