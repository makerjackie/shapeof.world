import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { K, SANS } from "../theme";
import { CL, CardSpec, Dressing, EIO, Motes, Say, Src, StackCards, WaterScene, cardH, ripplesFrom } from "./kit";
import { SURFACE, simulateStack } from "./stack";

// 100–130 s. The turn. Two students who both put off revising: one keeps blaming herself, one forgives
// herself. Next exam, the one who forgave puts it off less (Wohl et al. 2010).

export const S5_LEN = 480;
const LX = 600;
const RX = 1320;
const APPEAR = 44;
const FIRST = 70; // both get the same card
const BLAME = 146; // left: more cards
const FORGIVE = 172; // right: the card dissolves
const MERGE = 400; // the two drift together into one

const C0: CardSpec = { kind: "notice", text: "考前又拖延了。", size: 44 };
const LEFT_SPECS: CardSpec[] = [C0, { kind: "notice", text: "我真没用。", size: 44 }, { kind: "notice", text: "完了完了。", size: 44 }, { kind: "notice", text: "又这样。", size: 44 }];
const LEFT = simulateStack({
  frames: S5_LEN,
  x: LX,
  cards: [
    { at: FIRST, h: cardH(C0), weight: 50, dx: 0, rot: -1.2 },
    { at: BLAME, h: cardH(LEFT_SPECS[1]), weight: 48, dx: 8, rot: 1.4 },
    { at: BLAME + 16, h: cardH(LEFT_SPECS[2]), weight: 46, dx: -6, rot: -1.0 },
    { at: BLAME + 30, h: cardH(LEFT_SPECS[3]), weight: 44, dx: 4, rot: 1.2 },
  ],
  release: MERGE - 30,
  relK: 0.02,
  trembleFrom: 230,
  trembleTo: MERGE - 30,
});
const RIGHT = simulateStack({
  frames: S5_LEN,
  x: RX,
  cards: [{ at: FIRST, h: cardH(C0), weight: 50, dx: 0, rot: 1.0, vanishAt: FORGIVE }],
  floatUpAt: FORGIVE + 10,
});

export const S5Turn: React.FC = () => {
  const f = useCurrentFrame();
  const l = LEFT.frames[f];
  const r = RIGHT.frames[f];
  const appear = interpolate(f, [APPEAR - 30, APPEAR + 10], [0, 1], { ...CL, easing: EIO });
  const merge = interpolate(f, [MERGE, S5_LEN - 10], [0, 1], { ...CL, easing: EIO });
  const lx = LX + (960 - LX) * merge;
  const rx = RX + (960 - RX) * merge;
  const rightGlow = 1 + 0.25 * interpolate(f, [FORGIVE, FORGIVE + 40], [0, 1], CL) * (1 - merge);
  const leftGlow = 1 - 0.6 * interpolate(f, [BLAME, BLAME + 90], [0, 1], CL) * (1 - merge);
  const vanishCard = RIGHT.frames[Math.min(f, FORGIVE)].cards[0];

  const label = (x: number, text: string, at: number) => {
    const k = interpolate(f, [at, at + 14, MERGE - 20, MERGE], [0, 1, 1, 0], CL);
    return k > 0 ? (
      <div style={{ position: "absolute", left: x, top: SURFACE + 150, transform: "translateX(-50%)", fontFamily: SANS, fontWeight: 600, fontSize: 36, color: K.sub, opacity: k, whiteSpace: "nowrap" }}>{text}</div>
    ) : null;
  };

  return (
    <AbsoluteFill style={{ background: K.bg }}>
      <AbsoluteFill style={{ opacity: appear }}>
        <WaterScene
          f={f + 1500}
          orbs={[
            { x: lx, d: l.d, v: l.v, glow: leftGlow },
            { x: rx, d: r.d, v: r.v, glow: Math.min(1.25, rightGlow) },
          ]}
          ripples={[...ripplesFrom(LEFT.events, LX), ...ripplesFrom(RIGHT.events, RX)]}
          render={() => (
            <>
              <StackCards fr={l} specs={LEFT_SPECS} />
              <StackCards fr={r} specs={[C0]} />
              <Motes f={f} at={FORGIVE} x={RX} y={vanishCard.bottom - 40} />
            </>
          )}
        />
        {label(LX, "一直怪自己", BLAME + 20)}
        {label(RX, "原谅了自己", FORGIVE + 20)}
      </AbsoluteFill>

      <Say f={f} at={0} out={APPEAR} text="那，怎么办？" top={420} size={110} />
      <Say f={f} at={APPEAR + 4} out={BLAME - 6} text="有研究跟踪了一群大一学生，" top={120} size={70} />
      <Say f={f} at={FIRST + 14} out={BLAME - 6} text="第一次考试前，他们都拖延了。" top={220} size={70} weight={600} dim={0.85} />
      <Say f={f} at={BLAME} out={248} text="有人一直怪自己，" top={120} size={76} />
      <Say f={f} at={FORGIVE + 6} out={248} text="有人原谅了自己。" top={220} size={76} />
      <Say f={f} at={252} out={340} text="到了第二次考试——" top={120} size={70} weight={600} dim={0.85} />
      <Say f={f} at={274} out={340} text="原谅自己的人，拖得更少。" gold="拖得更少" top={220} size={88} />
      <Src f={f} at={274} out={340} text="Wohl, Pychyl & Bennett, 2010 · 跟踪大一学生两次期中考试" />
      <Say f={f} at={346} out={410} text="对自己宽容一点，反而更容易改。" gold="更容易改" top={160} size={84} />
      <Src f={f} at={350} out={410} text="Breines & Chen, 2012 · 自我同情让人更愿意改进" />
      <Say f={f} at={414} out={S5_LEN - 2} text="跟自己较劲，换不来睡眠。" gold="换不来睡眠" top={160} size={84} />

      <Dressing />
            {[...LEFT.events, ...RIGHT.events]
        .filter((e) => e.kind === "land")
        .map((e, i) => (
          <Sequence key={i} from={e.f} durationInFrames={40}>
            <Audio src={staticFile("sfx/soft.wav")} volume={0.4} />
          </Sequence>
        ))}
      <Sequence from={FORGIVE} durationInFrames={70}>
        <Audio src={staticFile("sfx/shimmer.wav")} volume={0.25} />
      </Sequence>
    </AbsoluteFill>
  );
};
