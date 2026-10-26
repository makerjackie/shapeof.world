import React from "react";
import { Composition } from "remotion";
import { FILM_FRAMES, FPS } from "./edl";
import { Film } from "./Film";
import { Loop, LOOP_FRAMES } from "./Loop";
import { Bookend3D, Intro3D } from "./Story3D";
import { b2f, BOOKEND, INTRO } from "./edl";

export const Root: React.FC = () => (
  <>
    <Composition id="Film" component={Film} durationInFrames={FILM_FRAMES} fps={FPS} width={1920} height={1080} />
    {/* the 3D laptop on its own, for look development */}
    <Composition id="Intro3D" component={Intro3D} durationInFrames={b2f(INTRO)} fps={FPS} width={1920} height={1080} />
    <Composition id="Bookend3D" component={Bookend3D} defaultProps={{ from: 0 }} durationInFrames={b2f(BOOKEND.len)} fps={FPS} width={1920} height={1080} />
    <Composition id="Loop" component={Loop} durationInFrames={LOOP_FRAMES} fps={FPS} width={1920} height={1080} />
  </>
);
