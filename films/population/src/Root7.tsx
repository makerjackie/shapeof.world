import React from "react";
import { Composition } from "remotion";
import { CHINA } from "./v6/china7";
import { CHINA as CHINA_S } from "./v6/china7s";
import { WORLD, WORLD_INTL } from "./v6/world7";
import { WORLD as WORLD_EN } from "./v6/world7e";
import MAPW from "./v6/map_world.json";
import MAPC from "./v6/map_china.json";
import { createFilm, Engine7, MapJ } from "./v6/Engine7";

const china = createFilm(CHINA, MAPC as unknown as MapJ);
const China7: React.FC = () => <Engine7 film={china} audio="film6_china7.wav" />;
const chinaS = createFilm(CHINA_S, MAPC as unknown as MapJ); // special internal version: no 1959-1961 famine
const China7S: React.FC = () => <Engine7 film={chinaS} audio="film6_china7s.wav" />;
const world = createFilm(WORLD, MAPW as unknown as MapJ);
const World7: React.FC = () => <Engine7 film={world} audio="film6_world7.wav" />; // domestic cut
const worldO = createFilm(WORLD_INTL.WORLD, MAPW as unknown as MapJ);
const World7O: React.FC = () => <Engine7 film={worldO} audio="film6_world7o.wav" />; // overseas cut (with 1959-61)
const worldE = createFilm(WORLD_EN, MAPW as unknown as MapJ);
const World7E: React.FC = () => <Engine7 film={worldE} audio="film6_world7e.wav" />; // English overseas cut

export const Root7: React.FC = () => (
  <>
    <Composition id="China7" component={China7} durationInFrames={china.frames} fps={30} width={1080} height={1920} />
    <Composition id="China7S" component={China7S} durationInFrames={chinaS.frames} fps={30} width={1080} height={1920} />
    <Composition id="World7" component={World7} durationInFrames={world.frames} fps={30} width={1080} height={1920} />
    <Composition id="World7O" component={World7O} durationInFrames={worldO.frames} fps={30} width={1080} height={1920} />
    <Composition id="World7E" component={World7E} durationInFrames={worldE.frames} fps={30} width={1080} height={1920} />
  </>
);
