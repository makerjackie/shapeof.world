import React from "react";
import { AbsoluteFill, interpolate, interpolateColors } from "remotion";
import { Branch, EMPTY, GBr, LIFE, LifeGrid, RG, RIGHT, tintFor, Trunk } from "../grid";
import { CL, EBACK, EIO, EO, In, progAt } from "../fx";
import { useBeatFrame } from "../kit";
import { FONT, K } from "../theme";
import { FPB } from "../timing";
import { Box, Head, Pill, Src } from "../ui";
import { BrLabel } from "./ch1";

const TY = 800; // trunk height in the two free-standing scenes

// 43 s: a branch you love; "should" tags hang on it and its colour drains.
export const Should: React.FC = () => {
  const frame = useBeatFrame();
  const grow = progAt(frame, 0.3, 2.2, EIO);
  const drain = progAt(frame, 5.5, 4, EIO);
  const color = interpolateColors(drain, [0, 1], [K.theme, "#5a5c5f"]);
  const b = { x0: 220, x1: 1700, y: TY, dy: -260, color, grow, w: 7 - 4 * drain };
  const flatY = TY - 260;
  const TAGS: [string, number, number][] = [
    ["打卡", 760, 3],
    ["考核", 1060, 3.8],
    ["必须", 1360, 4.6],
  ];
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        <Trunk x0={-20} x1={1940} y={TY} glow={0.4} w={5} />
        <Branch b={b} />
      </svg>
      <div style={{ position: "absolute", left: 560, top: flatY - 64, opacity: 1 - 0.5 * drain }}>
        <In at={1.5} from="fade">
          <div style={{ fontFamily: FONT, fontSize: 34, fontWeight: 900, color }}>喜欢的事</div>
        </In>
      </div>
      {TAGS.map(([t, x, at]) => {
        const p = progAt(frame, at, 1, EBACK);
        if (p <= 0) return null;
        const swing = Math.sin((frame - at * FPB) / 9) * 5 * Math.max(0, 1 - (frame - at * FPB) / 60);
        return (
          <div key={t} style={{ position: "absolute", left: x, top: flatY, transformOrigin: "50% 0", transform: `translateY(${(1 - p) * -120}px) rotate(${swing}deg)`, opacity: Math.min(1, p * 2) }}>
            <div style={{ position: "absolute", left: 47, top: 0, width: 2, height: 28, background: K.sub }} />
            <div style={{ marginTop: 28, padding: "8px 18px", borderRadius: 10, background: "#22262c", border: `2px solid ${K.steel}`, fontFamily: FONT, fontSize: 30, fontWeight: 900, color: K.steelHi, whiteSpace: "nowrap" }}>{t}</div>
          </div>
        );
      })}
      <Box x={130} y={150} style={{ gap: 16 }}>
        <Head at={0} parts={["把喜欢的事，变成", { t: "“应该”", c: K.steelHi }, "，"]} size={76} />
        <Head at={5.5} parts={["兴趣", { t: "可能会变淡", c: K.sub }, "。"]} size={76} />
      </Box>
      <Src>Deci、Koestner、Ryan 1999 · 128 项实验的元分析：与任务挂钩的奖励，降低自发投入 · 有争议：Cameron & Pierce 认为总体影响很小</Src>
    </AbsoluteFill>
  );
};

// 50 s: the branch nobody pushed runs all the way to the end, lights along the way.
const LOVE: Omit<GBr, "grow"> = { from: 12, to: 79, dy: 20, color: K.theme };
const SPARKS = [24, 33, 41, 50, 58, 66, 74];

export const Far: React.FC = () => {
  const frame = useBeatFrame();
  const grow = progAt(frame, 0.5, 8, EIO);
  const love: GBr = { ...LOVE, grow, w: 5 };
  const bs: GBr[] = [{ ...LIFE.school, grow: 1, o: 0.35 }, { ...LIFE.work, grow: 1, o: 0.35 }, { ...LIFE.money, grow: 1, o: 0.35 }, love];
  // The loved branch's weeks win the tint where it overlaps work.
  const tint = tintFor([love, ...bs.slice(0, 3)]);
  const reach = LOVE.from + (LOVE.to - LOVE.from) * grow;
  const y = RG.trunkY + LOVE.dy * RIGHT.pitch;
  return (
    <AbsoluteFill>
      <LifeGrid {...RIGHT} paint={tint} branches={bs} glow={0.5}>
        {SPARKS.map((a, i) => {
          const t = interpolate(reach, [a, a + 3], [0, 1], CL);
          if (t <= 0) return null;
          return <circle key={i} cx={RG.ageX(a)} cy={y} r={4 + 10 * (1 - t) + 3} fill={K.themeHi} opacity={0.5 + 0.5 * (1 - t)} />;
        })}
      </LifeGrid>
      <BrLabel b={LOVE} at={1}>真正喜欢的事</BrLabel>
      <Box x={130} y={330} style={{ gap: 18 }}>
        <Head at={0} parts={["真感兴趣的时候，"]} size={76} />
        <Head at={3} parts={[{ t: "不用催", c: K.theme }, "，"]} size={76} />
        <Head at={4.5} parts={["自己就走远了。"]} size={76} />
      </Box>
      <Src>Cerasoli 等 2014 · 183 项研究、约 21 万人：发自内心的动机与表现中到强相关 · 相关，不是因果</Src>
    </AbsoluteFill>
  );
};

// 58 s: the fair word. Some things you do anyway.
export const Fair: React.FC = () => (
  <AbsoluteFill>
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, opacity: 0.5 }}>
      <Trunk x0={-20} x1={1940} y={TY} glow={0.3} w={4} />
    </svg>
    <Box x={960} y={270} cx style={{ gap: 40 }}>
      <Head at={0} parts={["有些事，", { t: "不喜欢也得做", c: K.steelHi }, "。"]} size={84} />
      <div style={{ display: "flex", gap: 30 }}>
        {["房租", "家人", "生计"].map((t, i) => (
          <In key={t} at={1.8 + i * 0.5} from="up" dist={30}>
            <Pill color={K.steel} size={44}>{t}</Pill>
          </In>
        ))}
      </div>
      <div style={{ height: 10 }} />
      <Head at={4.5} parts={["没关系，", { t: "那是支线", c: K.steelHi }, "。"]} size={84} />
    </Box>
  </AbsoluteFill>
);

// 63 s: a branch breaks; the trunk carries on.
export const Break: React.FC = () => {
  const frame = useBeatFrame();
  const fall = progAt(frame, 5, 3, EIO);
  const glow = 0.5 + 0.5 * progAt(frame, 7.5, 1, EO);
  const bs: GBr[] = [
    { ...LIFE.school, grow: 1, o: 0.7 },
    { ...LIFE.work, grow: 1, cut: frame >= 5 * FPB ? 45 : undefined, fall },
    { ...LIFE.money, grow: 1, o: 0.7 },
  ];
  // The fallen piece takes its tint with it; those weeks go back to empty squares.
  const tint = tintFor(bs);
  const paint = (c: number, r: number) => {
    const p = tint(c, r);
    if (p && p.c === K.steel && c >= 45) return fall > 0.5 ? EMPTY : { ...p, o: p.o + (EMPTY.o - p.o) * fall * 2 };
    return p;
  };
  const crack = progAt(frame, 5, 0.6, EO);
  return (
    <AbsoluteFill>
      <LifeGrid {...RIGHT} paint={paint} branches={bs} glow={glow}>
        {crack > 0 && crack < 1 ? <circle cx={RG.ageX(45) + 7} cy={RG.trunkY + LIFE.work.dy * RIGHT.pitch} r={6 + 40 * crack} fill="none" stroke={K.fg} strokeOpacity={0.6 * (1 - crack)} strokeWidth={2} /> : null}
      </LifeGrid>
      <BrLabel b={LIFE.work} at={0} o={1 - fall}>工作</BrLabel>
      <Box x={130} y={300} style={{ gap: 18 }}>
        <Head at={0} parts={["别把支线，"]} size={76} />
        <Head at={1.2} parts={["当成活着的意义。"]} size={76} />
        <div style={{ height: 40 }} />
        <Head at={5.5} parts={[{ t: "支线会断，", c: K.steelHi }]} size={76} />
        <Head at={7.5} parts={[{ t: "主线一直在", c: K.theme }, "。"]} size={76} />
      </Box>
    </AbsoluteFill>
  );
};
