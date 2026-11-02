import React from "react";
import { Composition } from "remotion";
import { Film } from "./Film";
import { T2, T2_FRAMES } from "./v2/T2";
import { T3, T3_FRAMES } from "./v2/T3";
import { T4, T4_FRAMES } from "./v2/T4";
import { T5, T5_FRAMES } from "./v2/T5";
import { T6, T6_FRAMES } from "./v2/T6";
import { Film3, FILM3_FRAMES } from "./v3/Film3";
import { Film4, FILM4_FRAMES } from "./v3/Film4";
import { FILM_FRAMES, FPS, H, W } from "./time";

export const Root: React.FC = () => (
  <>
    <Composition id="Film4" component={Film4} durationInFrames={FILM4_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="Film3" component={Film3} durationInFrames={FILM3_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="T6" component={T6} durationInFrames={T6_FRAMES} fps={FPS} width={W} height={H} defaultProps={{ variant: "A", audio: "t6_mix.wav" }} />
    <Composition id="T5A" component={T5} durationInFrames={T5_FRAMES} fps={FPS} width={W} height={H} defaultProps={{ variant: "A", audio: "t5_mix.wav" }} />
    <Composition id="T5B" component={T5} durationInFrames={T5_FRAMES} fps={FPS} width={W} height={H} defaultProps={{ variant: "B", audio: "t5_mix.wav" }} />
    <Composition id="T5C" component={T5} durationInFrames={T5_FRAMES} fps={FPS} width={W} height={H} defaultProps={{ variant: "C", audio: "t5_mix.wav" }} />
    <Composition id="T4" component={T4} durationInFrames={T4_FRAMES} fps={FPS} width={W} height={H} defaultProps={{ audio: "t4_ref.wav" }} />
    <Composition id="T4B" component={T4} durationInFrames={T4_FRAMES} fps={FPS} width={W} height={H} defaultProps={{ audio: "t4_brodyaga.wav" }} />
    <Composition id="T4C" component={T4} durationInFrames={T4_FRAMES} fps={FPS} width={W} height={H} defaultProps={{ audio: "t4_funkmira.wav" }} />
    <Composition id="T3" component={T3} durationInFrames={T3_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="T2" component={T2} durationInFrames={T2_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="Film" component={Film} durationInFrames={FILM_FRAMES} fps={FPS} width={W} height={H} />
  </>
);
