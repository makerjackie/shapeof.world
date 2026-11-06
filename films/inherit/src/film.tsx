// The full film. Every scene reads film seconds; the score (public/score.wav, tools/music.py) follows SB in timing.ts.
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { BrandMark, EIO, EndCard, ramp, useT, win } from "./kit";
import { Open } from "./open";
import { Abroad, Bang, Jiangnan } from "./act2";
import { Bridge, Money, Sayings } from "./act1";
import { Reform, USA } from "./act3";
import { Climb, Ending, Keep, Mech, Sources } from "./act4";
import { FONT, K } from "./theme";
import { BEAT, S, SB, fr } from "./timing";
import { Paper } from "./world";

type Hit = { at: number; id: string; v: number; len?: number };

// Bottom-left source line: where the numbers on screen come from (story bars, absolute).
const SRC: { from: number; to: number; text: string }[] = [
  { from: 0.5, to: 2, text: "来源：Forbes 家族财富估计（2026）" },
  { from: 2, to: 5, text: "来源：A. T. Vanderbilt II《Fortune's Children》（1989）；按 1877 年遗产占美国 GDP 的比例（约 1/87）换算" },
  { from: 5, to: 6, text: "来源：Forbes（2026）；A. T. Vanderbilt II（1989）" },
  { from: 7.5, to: 12, text: "来源：The Preston Chronicle，1868 年 2 月 1 日；日本江户川柳" },
  { from: 12, to: 18, text: "来源：Arnott, Bernstein & Wu, Cato Journal（2015）；Forbes 400" },
  { from: 18, to: 22, text: "来源：Kalsi & Ward, NBER 33355（2025）：美国 1850–1940 年普查记录" },
  { from: 22, to: 25.4, text: "来源：洛克菲勒档案中心等公开资料；照片为美国政府官方肖像（公有领域）" },
  { from: 27.5, to: 36.6, text: "来源：Hao & Clark, Social Mobility in China 1645–2012（2012）；倍数相对同地区常见姓顾、沈、钱" },
  { from: 38.4, to: 42, text: "来源：Clark & Ishii（日本，1990–2012 年论文作者）；Barone & Mocetti, Review of Economic Studies（2021）" },
  { from: 42, to: 48.6, text: "来源：Hao & Clark（2012）表 3，苏南；倍数 = 在精英里的占比 ÷ 在人口里的占比（清代为举人）" },
  { from: 51, to: 60, text: "来源：Alesina, Seror, Yang, You, Zeng, NBER 27053（2021）；田地、家谱树为示意" },
  { from: 60, to: 64, text: "来源：Alesina 等（2021）：中国家庭追踪调查 2010 年，农村县" },
  { from: 64, to: 69, text: "来源：Alesina 等（2021）表 3：中国由收入差距换算，美国由两代流动数据推算；圆点为示意" },
  { from: 69, to: 73.6, text: "来源：Ager, Boustan & Eriksson, American Economic Review（2021）：南方第 90 百分位白人家庭；账本为示意" },
  { from: 76.2, to: 80.5, text: "示意：每代按 3 个孩子画" },
  { from: 80.5, to: 86, text: "来源：Chernow（1998）、Forbes（2026）、MeasuringWorth；Hao & Clark（2012）" },
  { from: 87.8, to: 94.5, text: "来源：Alesina 等（2021）" },
  { from: 96, to: 100, text: "来源：何炳棣《明清社会史论》（1962），转引自沈登苗" },
];
const SourceLine: React.FC<{ t: number }> = ({ t }) => (
  <>
    {SRC.map((r) => {
      const o = win(t, S(r.from), S(r.to), 0.3, 0.3);
      return o <= 0 ? null : (
        <div key={r.from} style={{ position: "absolute", left: 44, bottom: 12, fontFamily: FONT, fontSize: 21, fontWeight: 500, color: "rgba(244,236,220,0.5)", opacity: o, whiteSpace: "nowrap" }}>
          {r.text}
        </div>
      );
    })}
  </>
);
const a1 = S(SB.say);
const HITS: Hit[] = [
  // 俗话: three slips land
  ...[0, 0.75, 2.1].map((b) => ({ at: a1 + S(b), id: "sfx-foley-01", v: 0.7 })),
  ...[0, 0.75, 2.1].map((b) => ({ at: a1 + S(b) + 0.12, id: "sfx-impact-08", v: 0.45 })),
  // 钱留不住: plates go out, grandchildren lose their gold
  { at: S(SB.money) + S(1.5), id: "sfx-magic-19", v: 0.25, len: 2.2 },
  { at: S(SB.money) + S(6), id: "sfx-foley-01", v: 0.5 },
  // 洛克菲勒家：offices light; the question
  { at: S(SB.bridge) + 1.0, id: "sfx-magic-19", v: 0.25, len: 2.2 },
  { at: S(SB.bridge) + S(3.4) + 0.1, id: "sfx-impact-08", v: 0.5 },
  // 金榜 unrolls, 13 names light; the closing line
  { at: S(SB.bang) + S(0.15), id: "sfx-foley-01", v: 0.7 },
  { at: S(SB.bang) + S(0.8), id: "sfx-magic-19", v: 0.3, len: 2.2 },
  { at: S(SB.bang) + S(9.1), id: "sfx-impact-08", v: 0.45 },
  // 日本、佛罗伦萨
  { at: S(SB.abroad), id: "sfx-impact-13", v: 0.35 },
  // 土改: the survey cuts the holding
  ...[0, 1, 2].map((k) => ({ at: S(SB.reform) + S(3.4) + k * BEAT * 1.6, id: "sfx-impact-09", v: 0.45 })),
  // reveal on the downbeat after the dip; the big line; China, then the US
  { at: S(SB.reveal), id: "sfx-impact-16", v: 0.8, len: 1.5 },
  { at: S(SB.reveal) + S(2.1), id: "sfx-impact-08", v: 0.55 },
  { at: S(SB.reveal) + S(4) + 0.6, id: "sfx-impact-11", v: 0.35 },
  { at: S(SB.reveal) + S(6.6) + 0.6, id: "sfx-impact-11", v: 0.35 },
  // 美国: the ledger, the big line
  { at: S(SB.usa) + 0.4, id: "sfx-impact-01", v: 0.4 },
  { at: S(SB.usa) + S(4.6), id: "sfx-impact-08", v: 0.55 },
  // 分家: three rows appear; then the camera pulls back
  ...[0, 1, 2].map((k) => ({ at: S(SB.split) + S(1.2) + k * 0.9, id: "sfx-impact-12", v: 0.35 })),
  { at: S(SB.zoom) + S(2.8), id: "sfx-magic-19", v: 0.3, len: 2.4 },
  // 家教分不走
  { at: S(SB.keep) + S(4.4), id: "sfx-impact-08", v: 0.55 },
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
      <Bridge t={t} />
      <Bang t={t} />
      <Abroad t={t} />
      <Jiangnan t={t} />
      <Reform t={t} />
      <USA t={t} />
      <Mech t={t} />
      <Keep t={t} />
      <Climb t={t} />
      <Ending t={t} />
      <SourceLine t={t} />
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
