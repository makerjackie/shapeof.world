// 房价到底了吗: the whole film. Hook in film bars (sb 0–5.3); then story bars (time.ts, SHIFT): ch1.tsx (9.3–32), ch23.tsx (32–56), ch45.tsx (56–103).
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { BrandMark, EndCard, keys, ramp, useT } from "./kit";
import { Hook, QUOTES, STEPS } from "./hook";
import { Ch1 } from "./ch1";
import { Ch23 } from "./ch23";
import { BAR_AT, Ch45 } from "./ch45";
import { BEAT, FILM_FRAMES, fr, S, SHIFT } from "./time";
import { Sky } from "./world";

const END_AT = S(100.3);

const CHAPTERS = [
  { from: S(9.3), to: S(32), n: "1", t: "贵不贵" },
  { from: S(32), to: S(44), n: "2", t: "为什么涨" },
  { from: S(44), to: S(56), n: "3", t: "为什么跌" },
  { from: S(56), to: S(68), n: "4", t: "房子够不够" },
  { from: S(68), to: S(88), n: "5", t: "到底了吗" },
];

type Cue = { t: number; id: string; v: number };
const HOOK_CUES: Cue[] = [
  // the fall
  ...STEPS.map((s, i) => ({ t: s.at, id: "sfx-ui-07", v: 0.3 + 0.04 * i })),
  { t: S(2.4), id: "sfx-impact-08", v: 0.45 },
  ...QUOTES.map((q) => ({ t: q.at, id: "sfx-impact-12", v: 0.42 })),
];
// story time (see time.ts): played SHIFT earlier
const STORY_CUES: Cue[] = [
  // 1: years of rent
  { t: S(9.4), id: "sfx-transition-12", v: 0.35 },
  ...Array.from({ length: 20 }, (_, i) => ({ t: S(10.9) + i * ((S(12.7) - S(10.9)) / 20), id: "sfx-ui-01", v: 0.16 })),
  { t: S(12.7), id: "sfx-ui-06", v: 0.4 },
  { t: S(18.4), id: "sfx-scifi-09", v: 0.38 },
  { t: S(20.3), id: "sfx-transition-08", v: 0.38 },
  { t: S(24.5), id: "sfx-transition-05", v: 0.35 },
  { t: S(27.9), id: "sfx-scifi-03", v: 0.3 },
  { t: S(29.9), id: "sfx-ui-06", v: 0.35 },
  { t: S(31.4), id: "sfx-ui-06", v: 0.35 },
  // 2 and 3: the three towers
  { t: S(32.3), id: "sfx-impact-08", v: 0.45 },
  ...[33.5, 35.4, 37.4].map((sb) => ({ t: S(sb), id: "sfx-ui-07", v: 0.38 })),
  { t: S(39.4), id: "sfx-ui-10", v: 0.38 },
  { t: S(41.7), id: "sfx-impact-16", v: 0.42 },
  { t: S(44.1), id: "sfx-impact-05", v: 0.5 },
  ...[45.6, 47.4, 49.2].map((sb) => ({ t: S(sb), id: "sfx-impact-12", v: 0.38 })),
  ...[51.0, 51.6, 52.2].map((sb) => ({ t: S(sb), id: "sfx-ui-04", v: 0.3 })),
  // 4: enough homes?
  { t: S(56.3), id: "sfx-transition-12", v: 0.3 },
  ...[57.5, 59.9, 61.7, 64.1].map((sb) => ({ t: S(sb), id: "sfx-ui-06", v: 0.32 })),
  { t: S(66.1), id: "sfx-impact-16", v: 0.4 },
  // 5: has it bottomed?
  { t: S(68.05), id: "sfx-transition-08", v: 0.35 },
  ...[0, 1, 2, 3, 4, 5].map((i) => ({ t: BAR_AT(i), id: "sfx-ui-07", v: 0.28 })),
  { t: S(72.15), id: "sfx-transition-05", v: 0.32 },
  ...[74.1, 75.6, 77.1, 78.6].map((sb) => ({ t: S(sb), id: "sfx-ui-10", v: 0.34 })),
  { t: S(80.15), id: "sfx-transition-08", v: 0.32 },
  // the end
  { t: S(88.6), id: "sfx-impact-05", v: 0.5 },
  { t: S(92.5), id: "sfx-impact-16", v: 0.42 },
  { t: S(95.3), id: "sfx-impact-05", v: 0.4 },
  { t: END_AT, id: "sfx-impact-20", v: 0.5 },
];

const Hud: React.FC<{ endAt: number; chapters?: boolean }> = ({ endAt, chapters }) => {
  const t = useT();
  if (!chapters) return t < S(5.3) ? <BrandMark o={1} /> : null; // the hook, in film time
  if (t < S(9.3)) return null;
  const ch = CHAPTERS.find((c) => t >= c.from - 0.1 && t < c.to);
  const k = ch ? Math.min(ramp(t, ch.from, ch.from + 0.5), 1 - ramp(t, ch.to - 0.4, ch.to)) : 0;
  return <BrandMark o={1 - ramp(t, endAt - 0.2, endAt)} chapter={ch ? { n: ch.n, t: ch.t, k } : undefined} />;
};

const Grain: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ backgroundImage: `url(${staticFile("grain.svg")})`, backgroundSize: "256px 256px", backgroundPosition: `${(f * 37) % 256}px ${(f * 53) % 256}px`, opacity: 0.05, mixBlendMode: "overlay" }} />;
};
const Vignette: React.FC = () => <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 75% at 50% 50%, transparent 58%, rgba(0,0,0,0.5) 100%)", pointerEvents: "none" }} />;

export const Film: React.FC = () => {
  const t = useT();
  const dim = keys(t, [[0, 0.15], [S(6), 0.15], [S(6.5), 0.1]]);
  const fadeOut = ramp(t, (FILM_FRAMES - 12) / 30, (FILM_FRAMES - 1) / 30);
  return (
    <AbsoluteFill style={{ background: "#04060b", overflow: "hidden" }}>
      <Audio src={staticFile("score.wav")} volume={0.85} />
      {[...HOOK_CUES, ...STORY_CUES.map((c) => ({ ...c, t: c.t - SHIFT }))].map((c, i) => (
        <Sequence key={i} from={Math.max(0, fr(c.t))} durationInFrames={fr(4)}>
          <Audio src={staticFile(`sfx/${c.id}.wav`)} volume={c.v} />
        </Sequence>
      ))}
      <Sky t={t} dim={dim} horizon={930} />
      <Hook />
      <Hud endAt={END_AT} />
      <Sequence from={-fr(SHIFT)}>
        <Ch1 />
        <Ch23 />
        <Ch45 />
        <Hud endAt={END_AT} chapters />
        <EndCard at={END_AT} />
      </Sequence>
      <Vignette />
      <Grain />
      {fadeOut > 0 ? <AbsoluteFill style={{ background: "#000", opacity: fadeOut }} /> : null}
    </AbsoluteFill>
  );
};
