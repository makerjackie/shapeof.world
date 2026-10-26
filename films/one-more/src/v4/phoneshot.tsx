// The phone on the blanket at night, seen whole: the screen's glow, the device, what is on the screen, and only a thumb.
import React from "react";
import { Img, staticFile } from "remotion";
import { Cam } from "../cam";
import { FightScreen } from "./fight";
import { ScreenAlarm, ScreenStatus } from "./open7";
import { PhoneBody, PhoneScreen, PhoneTop } from "./phone4";
import { ResultScreen6 } from "./result6";

export const PHONE_CAM: Cam = { cx: -330, cy: -150, z: 0.95 };
export const BTN_W: [number, number] = [180, 20]; // the gold 再来一局, world units

export const PhoneShot: React.FC<{
  t: number;
  cam?: Cam;
  o?: number;
  screen: "fight" | "result";
  fightT?: number;
  press?: number;
  matching?: number;
  alarm?: number;
  beatPhase?: number;
  thumb?: { x: number; y: number; s: number; o: number };
  screenDim?: number;
}> = ({ t, cam = PHONE_CAM, o = 1, screen, fightT = 0, press = 0, matching = 0, alarm = 0, beatPhase = 0, thumb, screenDim = 0 }) => {
  if (o <= 0) return null;
  const gx = 960 + cam.z * (0 - cam.cx);
  const gy = 540 + cam.z * (-150 - cam.cy);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <Img src={staticFile("bed.jpg")} style={{ position: "absolute", left: -240, top: -135, width: 2400, height: 1350 }} />
      <div style={{ position: "absolute", left: gx - 1500 * cam.z, top: gy - 1000 * cam.z, width: 3000 * cam.z, height: 2000 * cam.z, background: "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(80,130,220,0.42) 0%, rgba(50,90,180,0.16) 40%, rgba(20,40,90,0) 70%)", opacity: 1 - 0.7 * screenDim }} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <PhoneBody cam={cam} o={1} />
      </svg>
      <PhoneScreen cam={cam}>
        {screen === "fight" ? <FightScreen t={fightT} /> : <ResultScreen6 t={20} k={1} beatPhase={beatPhase} press={press} tap={0} matching={matching} matchT={t % 10} />}
        <ScreenStatus o={1} />
        <ScreenAlarm k={alarm} />
        {screenDim > 0 ? <div style={{ position: "absolute", inset: 0, background: "#020306", opacity: screenDim }} /> : null}
      </PhoneScreen>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <PhoneTop cam={cam} btn={0} beatPhase={beatPhase} thumb={thumb} />
      </svg>
    </div>
  );
};
