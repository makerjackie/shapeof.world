import React from "react";
import { Composition } from "remotion";
import { CHINA } from "./v6/china7";
import { WORLD } from "./v6/world7";
import MAPW from "./v6/map_world.json";
import MAPC from "./v6/map_china.json";
import { createFilm, Engine7, MapJ } from "./v6/Engine7";

const china = createFilm(CHINA, MAPC as unknown as MapJ);
const China7: React.FC = () => <Engine7 film={china} audio="film6_china7.wav" />;
const world = createFilm(WORLD, MAPW as unknown as MapJ);
const World7: React.FC = () => <Engine7 film={world} audio="film6_world7.wav" />;

export const Root7: React.FC = () => (
  <>
    <Composition id="China7" component={China7} durationInFrames={china.frames} fps={30} width={1080} height={1920} />
    <Composition id="World7" component={World7} durationInFrames={world.frames} fps={30} width={1080} height={1920} />
  </>
);
