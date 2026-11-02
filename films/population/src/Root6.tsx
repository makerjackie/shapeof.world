import React from "react";
import { Composition } from "remotion";
import { CHINA } from "./v6/china6";
import { WORLD } from "./v6/world6";
import MAPC from "./v6/map_china.json";
import MAPW from "./v6/map_world.json";
import { createFilm, Engine6, MapJ } from "./v6/Engine6";

const china = createFilm(CHINA, MAPC as unknown as MapJ);
const world = createFilm(WORLD, MAPW as unknown as MapJ);
const China6: React.FC = () => <Engine6 film={china} audio="film6_china.wav" />;
const World6: React.FC = () => <Engine6 film={world} audio="film6_world.wav" />;

export const Root6: React.FC = () => (
  <>
    <Composition id="China6" component={China6} durationInFrames={china.frames} fps={30} width={1080} height={1920} />
    <Composition id="World6" component={World6} durationInFrames={world.frames} fps={30} width={1080} height={1920} />
  </>
);
