import { Composition } from "remotion";
import { Open, OPEN_FRAMES } from "./Open";
import { Open2, OPEN2_FRAMES } from "./Open2";
import { Film, FILM_FRAMES } from "./film/Film";
import { Press, PRESS_FRAMES } from "./Press";

export const Root: React.FC = () => (
  <>
    <Composition id="Film" component={Film} durationInFrames={FILM_FRAMES} fps={30} width={1920} height={1080} />
    <Composition id="Open2" component={Open2} durationInFrames={OPEN2_FRAMES} fps={30} width={1920} height={1080} />
    <Composition id="Open" component={Open} durationInFrames={OPEN_FRAMES} fps={30} width={1920} height={1080} />
    <Composition id="Press" component={Press} durationInFrames={PRESS_FRAMES} fps={30} width={1920} height={1080} />
  </>
);
