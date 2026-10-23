import React from "react";
import { AbsoluteFill } from "remotion";
import { SERIF } from "../theme";
import { Exam, FirstMark, Medals, Rush, Seven } from "./ch1";
import { Charts, Climb, Crack, Panic, Pour, Rebound, Wall, ZhipuChart } from "./ch2";
import { CartAgain, Eats, Factory, JapanPower, Nuclear } from "./ch3";
import { Asking, Climbing, Notices, Quiet } from "./ch4";
import { Answer, EndCard, Guesses, Hungrier, Month, TwoFrames, Us } from "./finale";
import { Bowls, But, Coders, Countries, DoorsPan, Faster, Flat, Handoff, Seasons, Slam, Textbook } from "./truth";
import { C, Corner, EIO, EO, pr, Scene, useT } from "./kit";
import { Opening, Title3 } from "./opening";
import { Sound } from "./sound";
import { bar, END } from "./timing";

// 《AI 到底改变了什么》 v3 · 剧本 v3.5（SCRIPT.md）· 《千年之后》, 108 bars, about 3:53. Scenes sit on bar lines.
// Built chapter by chapter; each chapter is rendered and reviewed on its own (render with --frames).

type Row = [number, number, React.FC, ("scale" | "up" | "none")?, ("scale" | "fade" | "none")?];
const SCENES: Row[] = [
  [0, bar(8) + 0.4, Opening, "none", "none"],
  [bar(8), bar(10), Title3, "none"],
  // 01 惊奇
  [bar(10), bar(12), Rush],
  [bar(12), bar(14), FirstMark],
  [bar(14), bar(16), Medals],
  [bar(16), bar(18), Exam],
  [bar(18), bar(20), Seven],
  // 02 狂热
  [bar(20), bar(22), Pour],
  [bar(22), bar(24), Climb],
  [bar(24), bar(26), Wall],
  [bar(26), bar(28), Charts],
  [bar(28), bar(30), Panic],
  [bar(30), bar(32), Crack],
  [bar(32), bar(34), Rebound],
  [bar(34), bar(36), ZhipuChart],
  // 03 账单
  [bar(36), bar(38), Eats],
  [bar(38), bar(40), Nuclear],
  [bar(40), bar(42), JapanPower],
  [bar(42), bar(44), Factory],
  [bar(44), bar(46), CartAgain],
  // 04 害怕
  [bar(46), bar(50), Climbing],
  [bar(50), bar(52), Asking],
  [bar(52), bar(54), Quiet],
  [bar(54), bar(56), Notices],
  // 间奏：可是
  [bar(56), bar(58), But, "none"],
  [bar(58), bar(60), Flat],
  [bar(60), bar(64), DoorsPan],
  // 05 真相
  [bar(64), bar(66), Slam, "none"],
  [bar(66), bar(68), Coders],
  [bar(68), bar(70), Bowls],
  [bar(70), bar(72), Countries],
  [bar(72), bar(74), Handoff],
  [bar(74), bar(76), Textbook],
  [bar(76), bar(78), Seasons],
  [bar(78), bar(80), Faster],
  // 06 未知
  [bar(80), bar(82), Month],
  [bar(82), bar(84), Guesses],
  [bar(84), bar(86), Hungrier],
  [bar(86), bar(88), Us],
  // 升华
  [bar(88), bar(100), TwoFrames],
  // 收尾
  [bar(100), bar(104), Answer],
  [bar(104), END + 1, EndCard, "scale", "none"],
];

// Chapter names, next to the brand corner (SCRIPT.md, 画面).
const CHAPTERS: [number, number, string][] = [
  [bar(10), bar(20), "惊奇"],
  [bar(20), bar(36), "狂热"],
  [bar(36), bar(46), "账单"],
  [bar(46), bar(56), "害怕"],
  [bar(64), bar(80), "真相"],
  [bar(80), bar(88), "未知"],
];

const ChapterTag: React.FC = () => {
  const t = useT();
  const ch = CHAPTERS.find(([a, b]) => t >= a - 0.1 && t < b + 0.3);
  if (!ch) return null;
  const [a, b, name] = ch;
  const o = pr(t, a + 0.2, 0.5, EO) * (1 - pr(t, b - 0.2, 0.4, EIO));
  return (
    <div style={{ position: "absolute", left: 262, top: 42, display: "flex", alignItems: "center", gap: 14, opacity: 0.75 * o, fontFamily: SERIF, fontWeight: 600, fontSize: 26, letterSpacing: "0.12em", color: C.sub, whiteSpace: "nowrap" }}>
      <span style={{ width: 1, height: 22, background: C.muted }} />
      {name}
    </div>
  );
};

export const FilmV3: React.FC<{ until?: number }> = ({ until = END }) => (
  <AbsoluteFill style={{ background: "#07090b", overflow: "hidden" }}>
    {SCENES.map(([a, b, S, inMove, outMove]) => (
      <Scene key={a} from={a} to={b} inMove={inMove ?? "scale"} outMove={outMove ?? "scale"}>
        <S />
      </Scene>
    ))}
    <Corner until={bar(104)} />
    <ChapterTag />
    <Sound until={until} />
  </AbsoluteFill>
);

export const SAMPLE_END = bar(10) + 0.4;
export const SampleV3: React.FC = () => <FilmV3 until={SAMPLE_END} />;
