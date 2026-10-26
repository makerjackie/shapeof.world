// v4 opening (0:00–0:21): a full-screen teamfight takes the enemy crystal to 1% and loses; the camera pulls back to a
// phone in the dark at 01:47 and the thumb presses 再来一局 at once; the question; then "差一点" panels fly out of the
// phone on the beat and multiply into a wall.
import React from "react";
import { Cam, camAt, CamKey } from "../cam";
import { Box, EIN, EIO, EO, ESO, lerp, ramp, Say, useT, win } from "../kit";
import { HAN, K, NUM } from "../theme";
import { Cards, Wall, WALL_AT } from "./cards";
import { FightScreen, ResultScreen } from "./fight";
import { BTN_R, Hands, PhoneBody, PhoneScreen, PhoneTop } from "./phone4";
import { BEAT, beat } from "./time";

export const PRESS = beat(9);
const FULL: Cam = { cx: 0, cy: -150, z: 2.1 };
const TEXT: Cam = { cx: -330, cy: -150, z: 0.95 };
const CENTER: Cam = { cx: 0, cy: -150, z: 0.62 };

const cam4 = (t: number) => {
  const keys: CamKey[] = [
    [0, FULL],
    [beat(7.2), FULL],
    [beat(8.8), TEXT, ESO],
    [beat(15.4), { cx: -320, cy: -150, z: 0.97 }, EIO],
    [beat(16.3), CENTER, ESO],
    [WALL_AT, { cx: 0, cy: -150, z: 0.66 }, EIO],
    [WALL_AT + 0.6, { cx: 0, cy: -150, z: 0.3 }, EIN],
  ];
  return camAt(t, keys, ESO);
};

const NightClock: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, beat(7.8), beat(15.8), 0.4, 0.4);
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", right: 120, top: 70, display: "flex", alignItems: "baseline", gap: 12, opacity: o }}>
      <span style={{ fontFamily: HAN, fontWeight: 700, fontSize: 28, color: K.sub }}>凌晨</span>
      <span style={{ fontFamily: NUM, fontWeight: 200, fontSize: 92, color: K.fg, fontVariantNumeric: "tabular-nums" }}>01:47</span>
    </div>
  );
};

export const Open4: React.FC = () => {
  const t = useT();
  if (t > WALL_AT + BEAT * 8) return null;
  const cam = cam4(t);
  const beatPhase = (((t - beat(0)) / BEAT) % 1 + 1) % 1;
  const result = ramp(t, beat(7.4), beat(7.9), EIO);
  const matching = ramp(t, PRESS + 0.1, PRESS + 0.35, EO);
  const press = Math.exp(-Math.max(0, t - PRESS) / 0.09) * (t >= PRESS ? 1 : 0);
  // the thumb: in from the lower right, a short hover, the press, away again
  const hover: [number, number] = [96, 90];
  const btn: [number, number] = [8, 10];
  const kIn = ramp(t, beat(8.0), beat(8.6), EO);
  const kDown = ramp(t, PRESS - 0.25, PRESS, EIN);
  const kOut = ramp(t, PRESS + 0.2, PRESS + 0.8, EIN);
  const rest: [number, number] = [430, 40];
  const tip: [number, number] = [lerp(lerp(lerp(rest[0], hover[0], kIn), btn[0], kDown), rest[0], kOut), lerp(lerp(lerp(rest[1], hover[1], kIn), btn[1], kDown), rest[1], kOut)];
  const ripples: { r: number; o: number; c: string }[] = [];
  for (let k = 0; k < 5; k++) {
    const age = t - PRESS - k * 0.22;
    if (age < 0 || age > 1.6) continue;
    ripples.push({ r: BTN_R + 8 + 520 * EO(age / 1.6), o: 0.5 * (1 - age / 1.6), c: k % 2 ? K.cyan : K.want });
  }
  const phoneO = 1 - ramp(t, WALL_AT, WALL_AT + 0.45);
  const handsO = phoneO * ramp(t, beat(6.9), beat(7.8));
  const [gx, gy] = [960 + cam.z * (0 - cam.cx), 540 + cam.z * (-150 - cam.cy)];
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* the screen's light on the blanket */}
      <div style={{ position: "absolute", left: gx - 1500 * cam.z, top: gy - 1000 * cam.z, width: 3000 * cam.z, height: 2000 * cam.z, background: "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(80,130,220,0.42) 0%, rgba(50,90,180,0.16) 40%, rgba(20,40,90,0) 70%)", opacity: phoneO }} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <Hands cam={cam} o={handsO} />
        <PhoneBody cam={cam} o={phoneO * ramp(t, beat(6.8), beat(7.6))} />
      </svg>
      <PhoneScreen cam={cam} o={phoneO}>
        {result < 1 ? <FightScreen t={t} /> : null}
        {result > 0 ? <ResultScreen k={result} t={t - PRESS} matching={matching} /> : null}
      </PhoneScreen>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: phoneO }}>
        <PhoneTop cam={cam} btn={result * (1 - matching * 0.85)} beatPhase={beatPhase} press={press} ripples={ripples} leftThumb={handsO} thumb={{ x: tip[0], y: tip[1], s: 1.06 - 0.06 * press, o: handsO }} />
      </svg>
      {result > 0 && matching < 1 ? <BtnLabel cam={cam} o={result * (1 - matching)} /> : null}
      <NightClock t={t} />
      <Cards t={t} />
      <Wall t={t} />
      <Open4Text />
    </div>
  );
};

const BtnLabel: React.FC<{ cam: Cam; o: number }> = ({ cam, o }) => (
  <div style={{ position: "absolute", left: 960 + cam.z * (0 - cam.cx), top: 540 + cam.z * (0 - cam.cy), transform: "translate(-50%, -50%)", fontFamily: HAN, fontWeight: 900, fontSize: 28 * cam.z, color: K.ink, opacity: o, whiteSpace: "nowrap" }}>再来一局</div>
);

const want = (s: string) => ({ t: s, c: K.want });

const Open4Text: React.FC = () => (
  <>
    <Box x={960} y={790} align="center">
      <Say at={beat(6)} out={beat(7.6)} size={116} weight={900} parts={["就差", want("一点"), "。"]} />
    </Box>
    <Box x={110} y={350} gap={16}>
      <Say at={beat(10)} out={beat(15.6)} size={72} weight={900} parts={["为什么差一点输掉，"]} />
      <Say at={beat(10.8)} out={beat(15.6)} size={72} weight={900} parts={["反而更想", want("再来一局"), "？"]} />
    </Box>
    <Box x={960} y={810} align="center">
      <Say at={beat(17)} out={WALL_AT - 0.1} size={56} weight={900} parts={["游戏里，到处都是", want("“差一点”"), "。"]} />
    </Box>
    <Box x={960} y={420} align="center" gap={18}>
      <Say at={WALL_AT + BEAT * 1.5} out={WALL_AT + BEAT * 8} size={84} weight={900} parts={["每一个", want("“差一点”"), "，"]} style={{ background: "rgba(5,7,12,0.55)", padding: "4px 28px", borderRadius: 18 }} />
      <Say at={WALL_AT + BEAT * 2.5} out={WALL_AT + BEAT * 8} size={84} weight={900} parts={["都在等你再来一局。"]} style={{ background: "rgba(5,7,12,0.55)", padding: "4px 28px", borderRadius: 18 }} />
    </Box>
  </>
);

export const OPEN4_END = WALL_AT + BEAT * 8;
