import { Composition } from "remotion";
import { Open, OPEN_FRAMES } from "./Open";
import { Press, PRESS_FRAMES } from "./Press";

export const Root: React.FC = () => (
  <>
    <Composition id="Open" component={Open} durationInFrames={OPEN_FRAMES} fps={30} width={1920} height={1080} />
    <Composition id="Press" component={Press} durationInFrames={PRESS_FRAMES} fps={30} width={1920} height={1080} />
  </>
);
