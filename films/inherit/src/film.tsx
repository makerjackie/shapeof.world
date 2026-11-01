// The full film. Every scene reads film seconds; the score (public/score.wav, tools/music.py) follows SB in timing.ts.
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { BrandMark, EIO, EndCard, ramp, useT } from "./kit";
import { Open } from "./open";
import { Abroad, Bang, Jiangnan } from "./act2";
import { Money, Sayings } from "./act1";
import { Reform, USA } from "./act3";
import { Climb, Ending, Keep, Mech, Sources } from "./act4";
import { K } from "./theme";
import { BEAT, S, SB, fr } from "./timing";
import { Paper } from "./world";

type Hit = { at: number; id: string; v: number; len?: number };
const a1 = S(SB.say);
const HITS: Hit[] = [
  // 俗话: three slips land
  ...[0, 0.75, 2].map((b) => ({ at: a1 + S(b), id: "sfx-foley-01", v: 0.7 })),
  ...[0, 0.75, 2].map((b) => ({ at: a1 + S(b) + 0.12, id: "sfx-impact-08", v: 0.45 })),
  // 钱留不住: plates go out, grandchildren lose their gold
  { at: S(SB.money) + S(1.5), id: "sfx-magic-19", v: 0.25, len: 2.2 },
  { at: S(SB.money) + S(6), id: "sfx-foley-01", v: 0.5 },
  // 金榜 unrolls, 13 names light
  { at: S(SB.bang) + S(1), id: "sfx-foley-01", v: 0.7 },
  { at: S(SB.bang) + S(1.5), id: "sfx-magic-19", v: 0.3, len: 2.2 },
  // 日本: the sword
  { at: S(SB.abroad), id: "sfx-impact-13", v: 0.35 },
  // 土改: the survey cuts the holding
  ...[0, 1, 2].map((k) => ({ at: S(SB.reform) + S(2.4) + k * BEAT * 1.6, id: "sfx-impact-09", v: 0.45 })),
  // reveal on the downbeat after the dip; the big line; China and the US side by side
  { at: S(SB.reveal), id: "sfx-impact-16", v: 0.8, len: 1.5 },
  { at: S(SB.reveal) + S(2.7), id: "sfx-impact-08", v: 0.55 },
  { at: S(SB.reveal) + S(4.6) + 1.0, id: "sfx-impact-11", v: 0.35 },
  // 美国: the ledger, the winning slip, the big line
  { at: S(SB.usa) + 0.4, id: "sfx-impact-01", v: 0.4 },
  { at: S(SB.usa) + S(3.3) + 0.9, id: "sfx-game-01", v: 0.35 },
  { at: S(SB.usa) + S(5), id: "sfx-impact-08", v: 0.55 },
  // 分家: three splits; then the camera pulls back
  ...[0, 1, 2].map((k) => ({ at: S(SB.mech) + 0.1 + (k + 1) * 0.55, id: "sfx-impact-12", v: 0.35 })),
  { at: S(SB.mech) + S(4.2), id: "sfx-magic-19", v: 0.3, len: 2.4 },
  // 家教分不走
  { at: S(SB.keep) + S(3.5), id: "sfx-impact-08", v: 0.55 },
  // the last line on the climax downbeat
  { at: S(SB.end), id: "sfx-impact-16", v: 0.6, len: 1.5 },
];

export const Film: React.FC = () => {
  const t = useT();
  const openO = 1 - ramp(t, S(SB.say) - 0.3, S(SB.say) + 0.05, EIO);
  return (
    <AbsoluteFill style={{ background: K.bg, overflow: "hidden" }}>
      <Paper />
      {openO > 0 ? (
        <AbsoluteFill style={{ opacity: openO }}>
          <Open sound={false} brand={false} />
        </AbsoluteFill>
      ) : null}
      <Sayings t={t} />
      <Money t={t} />
      <Bang t={t} />
      <Abroad t={t} />
      <Jiangnan t={t} />
      <Reform t={t} />
      <USA t={t} />
      <Mech t={t} />
      <Keep t={t} />
      <Climb t={t} />
      <Ending t={t} />
      <BrandMark o={1 - ramp(t, S(SB.src) - 0.3, S(SB.src), EIO)} />
      <Sources />
      <EndCard at={S(SB.card)} />

      <Audio src={staticFile("score.wav")} />
      {HITS.map((h, i) => (
        <Sequence key={i} from={fr(h.at)} durationInFrames={fr(h.len ?? 1.2)}>
          <Audio src={staticFile(`sfx/${h.id}.wav`)} volume={h.v} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
