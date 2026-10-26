import { Composition } from "remotion";
import { Press, PRESS_FRAMES } from "./Press";

export const Root: React.FC = () => (
  <Composition id="Press" component={Press} durationInFrames={PRESS_FRAMES} fps={30} width={1920} height={1080} />
);
