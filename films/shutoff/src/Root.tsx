import React from "react";
import { Composition } from "remotion";
import { Film } from "./film/Film";
import { FILM_SECONDS } from "./film/cut";

export const Root: React.FC = () => (
  <>
    <Composition id="Film" component={Film} durationInFrames={Math.round(FILM_SECONDS * 30)} fps={30} width={1920} height={1080} />
  </>
);
