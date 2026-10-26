import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Open2 } from "../Open2";
import { CL } from "./kit";
import { S2Press, S2_LEN } from "./S2Press";
import { S3Loop, S3_LEN } from "./S3Loop";
import { S4Root, S4_LEN } from "./S4Root";
import { S5Turn, S5_LEN } from "./S5Turn";
import { S6Methods, S6_LEN } from "./S6Methods";
import { S7City, S7_LEN } from "./S7City";
import { S8End, S8_LEN } from "./S8End";

// 熬夜 · the whole film. Scenes are cut on the two tracks: A 漂浮物件 from the claim to the end of the root,
// a beat of silence, then B 温暖电路 for the turn, the three things to try and the last line.

const OPEN_LEN = 450;
const XF = 20; // crossfade from the opening into scene 2
export const T = (() => {
  const s2 = OPEN_LEN;
  const s3 = s2 + S2_LEN;
  const s4 = s3 + S3_LEN;
  const s5 = s4 + S4_LEN;
  const s6 = s5 + S5_LEN;
  const s7 = s6 + S6_LEN;
  const s8 = s7 + S7_LEN;
  return { s2, s3, s4, s5, s6, s7, s8, end: s8 + S8_LEN };
})();
export const FILM_FRAMES = T.end;
const A_AT = 382; // the claim; the track's first notes sit 1.2 s in
const A_END = T.s4 + 1196; // A's own near-silence (61.6 s into the track)
const B_AT = T.s4 + 1215;

const FadeIn: React.FC<{ len: number; children: React.ReactNode }> = ({ len, children }) => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ opacity: interpolate(f, [0, len], [0, 1], CL) }}>{children}</AbsoluteFill>;
};

export const Film: React.FC = () => (
  <AbsoluteFill style={{ background: "#05070a" }}>
    <Sequence from={0} durationInFrames={OPEN_LEN + XF}>
      <Open2 music={false} />
    </Sequence>
    <Sequence from={T.s2} durationInFrames={S2_LEN}>
      <FadeIn len={XF}>
        <S2Press />
      </FadeIn>
    </Sequence>
    <Sequence from={T.s3} durationInFrames={S3_LEN}>
      <S3Loop />
    </Sequence>
    <Sequence from={T.s4} durationInFrames={S4_LEN}>
      <S4Root />
    </Sequence>
    <Sequence from={T.s5} durationInFrames={S5_LEN}>
      <S5Turn />
    </Sequence>
    <Sequence from={T.s6} durationInFrames={S6_LEN}>
      <S6Methods />
    </Sequence>
    <Sequence from={T.s7} durationInFrames={S7_LEN}>
      <FadeIn len={12}>
        <S7City />
      </FadeIn>
    </Sequence>
    <Sequence from={T.s8} durationInFrames={S8_LEN}>
      <S8End />
    </Sequence>

    <Sequence from={A_AT - 6} durationInFrames={A_END - A_AT + 6}>
      <Audio src={staticFile("sfx/music-floating.mp3")} startFrom={36} volume={(f) => interpolate(f, [0, 10, A_END - A_AT - 6, A_END - A_AT + 6], [0, 0.72, 0.72, 0], CL)} />
    </Sequence>
    <Sequence from={B_AT} durationInFrames={T.end - B_AT}>
      <Audio src={staticFile("sfx/music-warm.mp3")} volume={(f) => interpolate(f, [0, 60, T.s8 - B_AT, T.s8 - B_AT + 150], [0, 0.72, 0.72, 0], CL)} />
    </Sequence>
  </AbsoluteFill>
);
