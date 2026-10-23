import React from "react";
import { AbsoluteFill } from "remotion";
import { Corner, Scene } from "./kit";
import { Opening, Title3 } from "./opening";
import { Sound } from "./sound";
import { bar, END } from "./timing";

// 《AI 到底改变了什么》 v3 · 剧本 v3.3（SCRIPT.md）· 《千年之后》, 108 bars, about 3:53. Scenes are placed on bar lines.
// Built in passes: the opening sample (bars 0–10) first, reviewed internally, then the rest.

type Row = [number, number, React.FC, ("scale" | "up" | "none")?, ("scale" | "fade" | "none")?];
const SCENES: Row[] = [
  [0, bar(8) + 0.4, Opening, "none", "none"],
  [bar(8), bar(10), Title3, "none"],
];

export const FilmV3: React.FC<{ until?: number }> = ({ until = END }) => (
  <AbsoluteFill style={{ background: "#07090b", overflow: "hidden" }}>
    {SCENES.map(([a, b, S, inMove, outMove]) => (
      <Scene key={a} from={a} to={b} inMove={inMove ?? "scale"} outMove={outMove ?? "scale"}>
        <S />
      </Scene>
    ))}
    <Corner until={bar(104)} />
    <Sound until={until} />
  </AbsoluteFill>
);

export const SAMPLE_END = bar(10) + 0.4;
export const SampleV3: React.FC = () => <FilmV3 until={SAMPLE_END} />;
