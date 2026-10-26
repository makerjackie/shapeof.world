// v6 opening, seen as the player sees it: never leaving the screen. The teamfight loses at 1%; the result screen with
// the phone's status bar (01:47, 12%) and tomorrow's alarm sliding down; a tap on 再来一局; matchmaking; the question;
// the post-match pop-ups, each one step short, cascading on the beat; the wall.
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Cam } from "../cam";
import { BrandMark, Box, clamp01, EO, ramp, Say, useT, win } from "../kit";
import { K } from "../theme";
import { CARD_AT, Cards, Wall, WALL_AT } from "./cards";
import { HITS, LOSE, WIPE } from "./fight";
import { PhoneScreen } from "./phone4";
import { AlarmNote, ResultScreen6, StatusBar } from "./result6";
import { BEAT, beat, fr } from "./time";

const FULL: Cam = { cx: 0, cy: -150, z: 2.1 };
export const PRESS6 = beat(9.5);
const ALARM_IN = beat(7.9);
const ALARM_OUT = beat(9.1);

const Open6: React.FC = () => {
  const t = useT();
  if (t > WALL_AT + BEAT * 8) return null;
  const beatPhase = (((t - beat(0)) / BEAT) % 1 + 1) % 1;
  const result = ramp(t, beat(7.2), beat(7.7), EO);
  const press = t >= PRESS6 ? Math.exp(-(t - PRESS6) / 0.09) : 0;
  const tap = t >= PRESS6 ? 1 - clamp01((t - PRESS6) / 0.45) : 0;
  const matching = ramp(t, PRESS6 + 0.15, PRESS6 + 0.4, EO);
  const alarm = Math.min(clamp01((t - ALARM_IN) / 0.35), 1 - clamp01((t - ALARM_OUT) / 0.3));
  const dimForCards = ramp(t, CARD_AT(0) - 0.2, CARD_AT(0) + 0.4);
  const out = 1 - ramp(t, WALL_AT, WALL_AT + 0.4);
  // a small push on each hit of the fight
  const lastHit = [...HITS, WIPE].filter((h) => h <= t && t < LOSE + 0.2).pop();
  const punch = lastHit === undefined ? 0 : Math.exp(-(t - lastHit) / 0.1) * 0.03;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, opacity: out, transform: `scale(${1 + punch})` }}>
        <PhoneScreen cam={FULL}>
          <ResultScreen6 t={t} k={result} beatPhase={beatPhase} press={press} tap={tap} matching={matching} matchT={t - PRESS6} />
        </PhoneScreen>
      </div>
      {dimForCards > 0 ? <AbsoluteFill style={{ background: "#04060c", opacity: 0.82 * dimForCards * out }} /> : null}
      <StatusBar o={result * out} />
      <AlarmNote k={alarm} />
      <Cards t={t} full />
      <Wall t={t} />
      <Open6Text />
    </AbsoluteFill>
  );
};

const want = (s: string) => ({ t: s, c: K.want });

const Open6Text: React.FC = () => (
  <>
    <Box x={960} y={780} align="center">
      <Say at={beat(6)} out={beat(7.25)} size={116} weight={900} parts={["就差", want("一点"), "。"]} />
    </Box>
    <Box x={960} y={640} align="center" gap={14}>
      <Say at={beat(10.4)} out={beat(15.6)} size={76} weight={900} parts={["为什么差一点输掉，"]} />
      <Say at={beat(11.2)} out={beat(15.6)} size={76} weight={900} parts={["反而更想", want("再来一局"), "？"]} />
    </Box>
    <Box x={960} y={935} align="center">
      <Say at={beat(17)} out={WALL_AT - 0.1} size={52} weight={900} parts={["游戏里，到处都是", want("“差一点”"), "。"]} />
    </Box>
    <Box x={960} y={420} align="center" gap={18}>
      <Say at={WALL_AT + BEAT * 1.5} out={WALL_AT + BEAT * 8} size={84} weight={900} parts={["每一个", want("“差一点”"), "，"]} style={{ background: "rgba(5,7,12,0.6)", padding: "4px 28px", borderRadius: 18 }} />
      <Say at={WALL_AT + BEAT * 2.5} out={WALL_AT + BEAT * 8} size={84} weight={900} parts={["都在等你再来一局。"]} style={{ background: "rgba(5,7,12,0.6)", padding: "4px 28px", borderRadius: 18 }} />
    </Box>
  </>
);

type Cue = { t: number; id: string; v: number };
const CUES6: Cue[] = [
  ...HITS.slice(0, 4).map((h) => ({ t: h, id: "sfx-impact-13", v: 0.42 })),
  { t: HITS[4], id: "sfx-magic-16", v: 0.5 },
  { t: WIPE, id: "sfx-impact-16", v: 0.7 },
  { t: LOSE, id: "sfx-impact-11", v: 0.6 },
  { t: ALARM_IN, id: "sfx-notification-14", v: 0.45 },
  { t: PRESS6, id: "sfx-ui-04", v: 0.75 },
  ...Array.from({ length: 8 }, (_, i) => ({ t: CARD_AT(i), id: "sfx-ui-07", v: 0.45 })),
  { t: WALL_AT, id: "sfx-transition-11", v: 0.45 },
];

const Grain: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ backgroundImage: `url(${staticFile("grain.svg")})`, backgroundSize: "256px 256px", backgroundPosition: `${(f * 37) % 256}px ${(f * 53) % 256}px`, opacity: 0.05, mixBlendMode: "overlay" }} />;
};

const Hud6: React.FC = () => {
  const t = useT();
  const k = ramp(t, beat(16), beat(16.8), EO);
  return <BrandMark o={1 - 0.6 * win(t, beat(7.2), beat(16), 0.3, 0.3)} chapter={k > 0 ? { n: "1", t: "游戏里", k } : undefined} />;
};

export const Film6: React.FC = () => (
  <AbsoluteFill style={{ background: "#05070b", overflow: "hidden" }}>
    <Audio src={staticFile("score4.wav")} volume={0.85} />
    {CUES6.map((c, i) => (
      <Sequence key={i} from={Math.max(0, fr(c.t))} durationInFrames={fr(4)}>
        <Audio src={staticFile(`sfx/${c.id}.wav`)} volume={c.v} />
      </Sequence>
    ))}
    <Open6 />
    <Hud6 />
    <Grain />
  </AbsoluteFill>
);

export const SAMPLE6_FRAMES = fr(WALL_AT + BEAT * 8 + 0.4);
