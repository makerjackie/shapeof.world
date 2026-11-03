import React from "react";
import { Composition } from "remotion";
import { CHINA } from "./v6/china7";
import MAPC from "./v6/map_china.json";
import { createFilm, Engine7, MapJ } from "./v6/Engine7";

const china = createFilm(CHINA, MAPC as unknown as MapJ);
const China7: React.FC = () => <Engine7 film={china} audio="film6_china7.wav" />;

export const Root7: React.FC = () => (
  <>
    <Composition id="China7" component={China7} durationInFrames={china.frames} fps={30} width={1080} height={1920} />
  </>
);
