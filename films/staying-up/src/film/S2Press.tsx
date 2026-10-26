import React from "react";
import { AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { K, FONT } from "../theme";
import { Phone } from "../phone";
import { SWIPES } from "../Open2";
import { Orb } from "../Press";
import { CL, CardSpec, Dressing, EIO, EO, Say, StackCards, WaterScene, cardH, ripplesFrom } from "./kit";
import { D0, SURFACE, simulateStack } from "./stack";

// 15–24 s. The screen's light becomes the orb and drops onto the water; your own notifications slam it
// under, one after another; the stack slips and it springs out of the water.

export const S2_LEN = 270;
const PX = 760; // where the phone was left by the opening
const GATHER = 0;
const LIFT = 14;
const TILT_FROM = 30;
const TILT_TO = 74;
const TOUCH = 78; // the orb lands on the water
const CAM_END = 900;
export const S2_RELEASE = 196;

const CARDS: CardSpec[] = [
  { kind: "notice", text: "不许再刷了。", size: 60 },
  { kind: "notice", text: "你怎么又这样。", size: 60 },
  { kind: "notice", text: "明天一定早睡。", size: 60 },
  { kind: "notice", text: "再这样下去，就完了。", size: 60 },
];
const SIM = simulateStack({
  frames: S2_LEN + 40,
  startD: D0,
  cards: [
    { at: TOUCH + 14, h: cardH(CARDS[0]), weight: 66, dx: -8, rot: -1.6 },
    { at: TOUCH + 30, h: cardH(CARDS[1]), weight: 62, dx: 12, rot: 1.2 },
    { at: TOUCH + 44, h: cardH(CARDS[2]), weight: 58, dx: -10, rot: -1.0 },
    { at: TOUCH + 56, h: cardH(CARDS[3]), weight: 54, dx: 6, rot: 1.4 },
  ],
  release: S2_RELEASE,
  relK: 0.0115,
  trembleFrom: 160,
  trembleTo: S2_RELEASE,
});
export const S2_END_STATE = SIM.frames[S2_LEN - 1];

export const S2Press: React.FC = () => {
  const f = useCurrentFrame();
  const s = SIM.frames[f];

  const tilt = interpolate(f, [TILT_FROM, TILT_TO], [0, 1], { ...CL, easing: EIO });
  const cam = tilt * CAM_END;
  const lift = interpolate(f, [LIFT, LIFT + 10], [0, 1], { ...CL, easing: EO });
  const fall = interpolate(f, [LIFT + 6, TOUCH], [0, 1], { ...CL, easing: Easing.bezier(0.5, 0, 0.6, 1) });

  const orbX = f < TOUCH ? PX + (960 - PX) * interpolate(f, [LIFT, TOUCH], [0, 1], { ...CL, easing: EIO }) : s.ox;
  const worldY = f < TOUCH ? 540 - 40 * Math.sin(Math.min(1, Math.max(0, f - LIFT) / 24) * Math.PI) * lift + fall * (CAM_END + SURFACE + D0 - 540) : CAM_END + SURFACE + s.d;
  const screenY = worldY - cam;
  const waterTop = SURFACE + (CAM_END - cam);

  const phoneO = interpolate(f, [LIFT + 4, TILT_FROM + 14], [1, 0], CL);
  const gather = interpolate(f, [GATHER, LIFT], [0, 1], { ...CL, easing: EIO }) * interpolate(f, [LIFT, LIFT + 6], [1, 0], CL);
  const clock = interpolate(f, [S2_RELEASE + 16, S2_RELEASE + 26], [0, 1], { ...CL, easing: EO });
  // a slow push while the stack builds
  const zoom = 1 + 0.05 * interpolate(f, [TOUCH, S2_RELEASE], [0, 1], { ...CL, easing: EIO }) * (1 - interpolate(f, [S2_RELEASE, S2_RELEASE + 20], [0, 1], CL));

  return (
    <AbsoluteFill style={{ background: K.bg }}>
      {f >= TILT_FROM - 4 && (
        <AbsoluteFill style={{ transform: `translateY(${waterTop - SURFACE}px)` }}>
          <WaterScene
            f={f}
            zoom={zoom}
            zoomY={SURFACE}
            orbs={f >= TOUCH - 4 ? [{ x: orbX, d: screenY - waterTop, v: s.v }] : []}
            ripples={[{ f: TOUCH, x: 960, p: 0.7 }, ...ripplesFrom(SIM.events, 960)]}
            render={() => <StackCards fr={s} specs={CARDS} />}
            flareAt={S2_RELEASE + 6}
            strain={[160, S2_RELEASE]}
          />
        </AbsoluteFill>
      )}
      {f < TILT_FROM - 4 && <AbsoluteFill style={{ background: "linear-gradient(180deg, #040609 0%, #060a10 60%, #0a1018 100%)" }} />}

      {phoneO > 0 && (
        <div style={{ position: "absolute", left: PX, top: 540 - cam, width: 0, height: 0, opacity: phoneO }}>
          <Phone f={f + 450} swipes={SWIPES} clock="3:02" dim={0.22 * (1 - gather)} />
          {gather > 0 && <div style={{ position: "absolute", left: -90, top: -90, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,240,215,1) 0%, rgba(255,200,130,0.6) 25%, rgba(255,180,100,0) 65%)", transform: `scale(${0.2 + gather})`, opacity: gather }} />}
        </div>
      )}

      {f >= LIFT - 2 && f < TOUCH + 4 && (
        <div style={{ position: "absolute", inset: 0, clipPath: `polygon(-3000px -3000px, 5000px -3000px, 5000px ${waterTop}px, -3000px ${waterTop}px)` }}>
          <div style={{ transform: `scale(${lift})`, transformOrigin: `${orbX}px ${screenY}px` }}>
            <Orb s={{ d: screenY - SURFACE, v: 0, ox: orbX }} f={f} under={false} flareAt={-999} strainFrom={-2} strainTo={-1} />
          </div>
        </div>
      )}

      <Say f={f} at={18} out={TOUCH} text="那个「再刷一个」的念头，" top={150} size={62} weight={600} dim={0.85} />
      <Say f={f} at={30} out={TOUCH + 4} text="就是这一点光。" top={240} size={88} />
      <Say f={f} at={TOUCH + 18} out={S2_RELEASE + 2} text="你越用力把它按下去——" top={120} size={80} />
      <Say f={f} at={S2_RELEASE + 14} text="它就弹得越高。" gold="弹得越高" top={120} size={92} />

      {clock > 0 && (
        <div style={{ position: "absolute", right: 110, top: 250, textAlign: "right", color: K.fg, opacity: clock }}>
          <div style={{ fontFamily: FONT, fontWeight: 300, fontSize: 28, letterSpacing: 6, opacity: 0.6 }}>凌晨</div>
          <div style={{ fontFamily: FONT, fontWeight: 300, fontSize: 92, transform: `scale(${1 + (1 - clock) * 0.3})`, transformOrigin: "100% 50%" }}>03:24</div>
        </div>
      )}

      <Dressing />
      <S2Sound />
    </AbsoluteFill>
  );
};

const sfx = (n: string) => staticFile(`sfx/${n}.wav`);

const S2Sound: React.FC = () => {
  const ev = SIM.events;
  const breach = ev.find((e) => e.kind === "breach");
  const down = ev.find((e) => e.kind === "splashdown");
  return (
    <>
      <Sequence from={TOUCH} durationInFrames={40}>
        <Audio src={sfx("drop")} volume={0.45} />
      </Sequence>
      {ev
        .filter((e) => e.kind === "land")
        .map((e) => (
          <Sequence key={e.f} from={e.f} durationInFrames={30}>
            <Audio src={sfx("soft")} volume={0.55} />
          </Sequence>
        ))}
      {breach && (
        <Sequence from={breach.f} durationInFrames={50}>
          <Audio src={sfx("splash")} volume={0.8} />
        </Sequence>
      )}
      {down && down.f < S2_LEN && (
        <Sequence from={down.f} durationInFrames={Math.min(40, S2_LEN - down.f)}>
          <Audio src={sfx("smallsplash")} volume={0.4} />
        </Sequence>
      )}
    </>
  );
};
