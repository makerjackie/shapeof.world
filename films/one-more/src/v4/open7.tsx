// v7 opening: the teamfight and the result screen full screen (with the phone's status bar and tomorrow's alarm); the
// camera pulls back to the phone on a blanket and a thumb (only a thumb) presses 再来一局; the question; then the gaps.
import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Cam, camAt, CamKey } from "../cam";
import { BrandMark, Box, clamp01, EIN, EIO, EO, ESO, lerp, ramp, Say, useT, win } from "../kit";
import { HAN, K, NUM } from "../theme";
import { HITS, LOSE, WIPE } from "./fight";
import { GAP_AT, GapWall, Gaps, GAPWALL_AT, GRID_AT } from "./gaps";
import { PhoneBody, PhoneScreen, PhoneTop } from "./phone4";
import { ResultScreen6 } from "./result6";
import { BEAT, beat, fr } from "./time";

export const PRESS7 = beat(11.5);
const ALARM_IN = beat(7.9);
const ALARM_OUT = beat(10.4);
const FULL: Cam = { cx: 0, cy: -150, z: 2.1 };
const TEXT: Cam = { cx: -330, cy: -150, z: 0.95 };
const CENTER: Cam = { cx: 0, cy: -150, z: 0.66 };
const BTN: [number, number] = [180, 20]; // the gold 再来一局 in world units

const cam7 = (t: number) => {
  const keys: CamKey[] = [
    [0, FULL],
    [beat(9.3), FULL],
    [beat(11.0), TEXT, ESO],
    [beat(15.5), { cx: -320, cy: -150, z: 0.97 }, EIO],
    [beat(16.2), CENTER, ESO],
  ];
  return camAt(t, keys, ESO);
};

// The phone's own status bar and notification, drawn inside the screen so they ride the camera.
export const ScreenStatus: React.FC<{ o: number }> = ({ o }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 34, opacity: o, background: "linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0))" }}>
      <span style={{ position: "absolute", left: 112, top: 7, fontFamily: NUM, fontWeight: 700, fontSize: 15, color: "#fff" }}>01:47</span>
      <span style={{ position: "absolute", right: 104, top: 6, display: "flex", alignItems: "center", gap: 6, fontFamily: NUM, fontWeight: 700, fontSize: 13, color: "#ff5a6e" }}>
        12%
        <svg width={22} height={12}>
          <rect x={0.5} y={1} width={18} height={10} rx={3} fill="none" stroke="#fff" strokeOpacity={0.85} strokeWidth={1.2} />
          <rect x={19.5} y={4} width={2} height={4} rx={1} fill="#fff" />
          <rect x={2} y={2.6} width={3} height={6.8} rx={1.2} fill="#ff5a6e" />
        </svg>
      </span>
    </div>
  );

export const ScreenAlarm: React.FC<{ k: number }> = ({ k }) =>
  k <= 0 ? null : (
    <div style={{ position: "absolute", left: 555 - 170, top: -60 + 96 * EO(clamp01(k)), width: 340, height: 52, borderRadius: 14, background: "rgba(40,44,56,0.94)", boxShadow: "0 8px 22px rgba(0,0,0,0.5)", display: "flex", alignItems: "center", gap: 10, padding: "0 14px", boxSizing: "border-box" }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(180deg, #ff9a3d, #ff6a2a)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width={18} height={18} viewBox="0 0 34 34">
          <circle cx={17} cy={18} r={11} fill="none" stroke="#fff" strokeWidth={3.5} />
          <path d="M 17 12 v 6 l 4 3" stroke="#fff" strokeWidth={3.5} fill="none" strokeLinecap="round" />
        </svg>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <span style={{ fontFamily: HAN, fontWeight: 800, fontSize: 13, color: "#fff" }}>闹钟</span>
        <span style={{ fontFamily: HAN, fontWeight: 600, fontSize: 13, color: "rgba(255,255,255,0.82)" }}>
          明天 <span style={{ fontFamily: NUM }}>07:30</span> · 起床
        </span>
      </div>
    </div>
  );

export const Open7: React.FC = () => {
  const t = useT();
  if (t > GAPWALL_AT + BEAT * 8) return null;
  const cam = cam7(t);
  const beatPhase = (((t - beat(0)) / BEAT) % 1 + 1) % 1;
  const result = ramp(t, beat(7.2), beat(7.7), EO);
  const press = t >= PRESS7 ? Math.exp(-(t - PRESS7) / 0.09) : 0;
  const matching = ramp(t, PRESS7 + 0.15, PRESS7 + 0.4, EO);
  const alarm = Math.min(clamp01((t - ALARM_IN) / 0.35), 1 - clamp01((t - ALARM_OUT) / 0.3));
  // the thumb: up from below once the phone is in view, a hover, the press, back down
  const rest: [number, number] = [540, 470];
  const hover: [number, number] = [262, 108];
  const kIn = ramp(t, beat(10.2), beat(10.9), EO);
  const kDown = ramp(t, PRESS7 - 0.22, PRESS7, EIN);
  const kOut = ramp(t, PRESS7 + 0.25, PRESS7 + 0.9, EIN);
  const tip: [number, number] = [lerp(lerp(lerp(rest[0], hover[0], kIn), BTN[0], kDown), rest[0], kOut), lerp(lerp(lerp(rest[1], hover[1], kIn), BTN[1], kDown), rest[1], kOut)];
  const thumbO = kIn * (1 - kOut);
  const phoneDim = ramp(t, GAP_AT(0) - 0.2, GAP_AT(0) + 0.3);
  const phoneO = 1 - ramp(t, GAPWALL_AT, GAPWALL_AT + 0.4);
  const [gx, gy] = [960 + cam.z * (0 - cam.cx), 540 + cam.z * (-150 - cam.cy)];
  // a small push on each hit of the fight
  const lastHit = [...HITS, WIPE].filter((h) => h <= t && t < LOSE + 0.2).pop();
  const punch = lastHit === undefined ? 0 : Math.exp(-(t - lastHit) / 0.1) * 0.03;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: gx - 1500 * cam.z, top: gy - 1000 * cam.z, width: 3000 * cam.z, height: 2000 * cam.z, background: "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(80,130,220,0.42) 0%, rgba(50,90,180,0.16) 40%, rgba(20,40,90,0) 70%)", opacity: phoneO }} />
      <div style={{ position: "absolute", inset: 0, opacity: phoneO, transform: `scale(${1 + punch})` }}>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          <PhoneBody cam={cam} o={ramp(t, beat(9.2), beat(9.8))} />
        </svg>
        <PhoneScreen cam={cam}>
          <ResultScreen6 t={t} k={result} beatPhase={beatPhase} press={press} tap={0} matching={matching} matchT={t - PRESS7} />
          <ScreenStatus o={result} />
          <ScreenAlarm k={alarm} />
        </PhoneScreen>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          <PhoneTop cam={cam} btn={0} beatPhase={beatPhase} thumb={{ x: tip[0], y: tip[1], s: 1.06 - 0.06 * press, o: thumbO }} />
        </svg>
      </div>
      {phoneDim > 0 ? <AbsoluteFill style={{ background: "#04060c", opacity: 0.7 * phoneDim * phoneO }} /> : null}
      <Gaps t={t} />
      <GapWall t={t} />
      <Open7Text />
    </AbsoluteFill>
  );
};

const want = (s: string) => ({ t: s, c: K.want });

const Open7Text: React.FC = () => (
  <>
    <Box x={960} y={780} align="center">
      <Say at={beat(6)} out={beat(7.25)} size={116} weight={900} parts={["就差", want("一点"), "。"]} />
    </Box>
    <Box x={110} y={360} gap={16}>
      <Say at={beat(12)} out={beat(15.6)} size={72} weight={900} parts={["为什么差一点就赢，"]} />
      <Say at={beat(12.8)} out={beat(15.6)} size={72} weight={900} parts={["反而更想", want("再来一局"), "？"]} />
    </Box>
    <Box x={960} y={905} align="center">
      <Say at={GRID_AT + 0.2} out={GAPWALL_AT - 0.1} size={60} weight={900} parts={["游戏里，到处都是", want("“差一点”"), "。"]} />
    </Box>
    <Box x={960} y={420} align="center" gap={18}>
      <Say at={GAPWALL_AT + BEAT * 1.5} out={GAPWALL_AT + BEAT * 8} size={84} weight={900} parts={["每一个", want("“差一点”"), "，"]} style={{ background: "rgba(5,7,12,0.62)", padding: "4px 28px", borderRadius: 18 }} />
      <Say at={GAPWALL_AT + BEAT * 2.5} out={GAPWALL_AT + BEAT * 8} size={84} weight={900} parts={["都在等你再来一局。"]} style={{ background: "rgba(5,7,12,0.62)", padding: "4px 28px", borderRadius: 18 }} />
    </Box>
  </>
);

type Cue = { t: number; id: string; v: number };
export const CUES7: Cue[] = [
  ...HITS.slice(0, 4).map((h) => ({ t: h, id: "sfx-impact-13", v: 0.42 })),
  { t: HITS[4], id: "sfx-magic-16", v: 0.5 },
  { t: WIPE, id: "sfx-impact-16", v: 0.7 },
  { t: LOSE, id: "sfx-impact-11", v: 0.6 },
  { t: ALARM_IN, id: "sfx-notification-14", v: 0.45 },
  { t: beat(9.3), id: "sfx-transition-05", v: 0.4 },
  { t: PRESS7, id: "sfx-ui-04", v: 0.75 },
  ...Array.from({ length: 6 }, (_, i) => ({ t: GAP_AT(i), id: "sfx-ui-07", v: 0.5 })),
  { t: GAPWALL_AT, id: "sfx-transition-11", v: 0.45 },
];

const Grain: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ backgroundImage: `url(${staticFile("grain.svg")})`, backgroundSize: "256px 256px", backgroundPosition: `${(f * 37) % 256}px ${(f * 53) % 256}px`, opacity: 0.05, mixBlendMode: "overlay" }} />;
};
const Vignette: React.FC = () => <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 75% at 50% 50%, transparent 58%, rgba(0,0,0,0.5) 100%)", pointerEvents: "none" }} />;

const Hud7: React.FC = () => {
  const t = useT();
  const k = ramp(t, beat(16), beat(16.8), EO);
  return <BrandMark o={1 - 0.6 * win(t, beat(7.2), beat(9.4), 0.3, 0.3)} chapter={k > 0 ? { n: "1", t: "游戏里", k } : undefined} />;
};

export const Film7: React.FC = () => (
  <AbsoluteFill style={{ background: "#05070b", overflow: "hidden" }}>
    <Audio src={staticFile("score4.wav")} volume={0.85} />
    {CUES7.map((c, i) => (
      <Sequence key={i} from={Math.max(0, fr(c.t))} durationInFrames={fr(4)}>
        <Audio src={staticFile(`sfx/${c.id}.wav`)} volume={c.v} />
      </Sequence>
    ))}
    <Img src={staticFile("bed.jpg")} style={{ position: "absolute", left: -240, top: -135, width: 2400, height: 1350 }} />
    <Open7 />
    <Hud7 />
    <Vignette />
    <Grain />
  </AbsoluteFill>
);

export const SAMPLE7_FRAMES = fr(GAPWALL_AT + BEAT * 8 + 0.4);
