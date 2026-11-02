// Film5 has its own entry so its bundle loads no Google fonts at all (src/theme.ts is never imported).
import React from "react";
import { Composition } from "remotion";
import { Film5, FILM5_FRAMES } from "./v5/Film5";

export const Root5: React.FC = () => (
  <>
    <Composition id="Film5" component={Film5} durationInFrames={FILM5_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
