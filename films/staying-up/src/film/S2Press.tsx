import React from "react";
import { AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { K, FONT } from "../theme";
import { Phone } from "../phone";
import { SWIPES } from "../Open2";
import { Orb } from "../Press";
import { CL, CardSpec, Dressing, EIO, EO, Say, StackCards, WaterScene, cardH, ripplesFrom } from "./kit";
import { D0, SURFACE, simulateStack } from "./stack";

// 15.0–31.5 s. The screen's light becomes the orb, drifts down onto the water; your own notifications
// press it under; the stack slips and it springs out of the water, landing on the music's first lift.

export const S2_LEN = 495;
const PX = 760; // where the phone was left by the opening
const GATHER = 12;
const LIFT = 34;
const TILT_FROM = 64;
const TILT_TO = 122;
const TOUCH = 126; // the orb settles on the water
const CAM_END = 900;
export const S2_RELEASE = 440;

const CARDS: CardSpec[] = [
  { kind: "notice", text: "不许再刷了。", size: 52 },
  { kind: "notice", text: "你怎么又这样。", size: 52 },
  { kind: "notice", text: "明天一定早睡。", size: 52 },
  { kind: "notice", text: "再这样下去，就完了。", size: 52 },
];
const SIM = simulateStack({
  frames: S2_LEN + 40,
  startD: D0,
  cards: [
    { at: TOUCH + 40, h: cardH(CARDS[0]), weight: 62, dx: -8, rot: -1.6 },
    { at: TOUCH + 92, h: cardH(CARDS[1]), weight: 58, dx: 12, rot: 1.2 },
    { at: TOUCH + 136, h: cardH(CARDS[2]), weight: 54, dx: -10, rot: -1.0 },
    { at: TOUCH + 172, h: cardH(CARDS[3]), weight: 50, dx: 6, rot: 1.4 },
  ],
  release: S2_RELEASE,
  relK: 0.0105,
  trembleFrom: 380,
  trembleTo: S2_RELEASE,
});
export const S2_END_STATE = SIM.frames[S2_LEN - 1];
export const S2_EVENTS = SIM.events;

export const S2Press: React.FC = () => {
  const f = useCurrentFrame();
  const s = SIM.frames[f];

  const tilt = interpolate(f, [TILT_FROM, TILT_TO], [0, 1], { ...CL, easing: EIO });
  const cam = tilt * CAM_END; // looking down from the phone to the water
  const lift = interpolate(f, [LIFT, LIFT + 14], [0, 1], { ...CL, easing: EO });
  const fall = interpolate(f, [LIFT + 8, TOUCH], [0, 1], { ...CL, easing: Easing.bezier(0.45, 0, 0.35, 1) });

  // orb position in screen space while it travels; afterwards it is the stack simulation
  const orbX = f < TOUCH ? PX + (960 - PX) * interpolate(f, [LIFT, TOUCH], [0, 1], { ...CL, easing: EIO }) : s.ox;
  const worldY = f < TOUCH ? 540 - 60 * Math.sin(Math.min(1, Math.max(0, f - LIFT) / 40) * Math.PI) * lift + fall * (CAM_END + SURFACE + D0 - 540) : CAM_END + SURFACE + s.d;
  const screenY = worldY - cam;
  const waterTop = SURFACE + (CAM_END - cam);

  const phoneO = interpolate(f, [LIFT + 6, TILT_FROM + 20], [1, 0], CL);
  const gather = interpolate(f, [GATHER, LIFT], [0, 1], { ...CL, easing: EIO }) * interpolate(f, [LIFT, LIFT + 8], [1, 0], CL);

  const clock = interpolate(f, [S2_RELEASE + 18, S2_RELEASE + 30], [0, 1], { ...CL, easing: EO });

  return (
    <AbsoluteFill style={{ background: K.bg }}>
      {/* water world, rising into frame with the tilt */}
      {f >= TILT_FROM - 4 && (
        <AbsoluteFill style={{ transform: `translateY(${waterTop - SURFACE}px)` }}>
          <WaterScene
            f={f}
            orbs={f >= TOUCH - 6 ? [{ x: orbX, d: screenY - waterTop, v: s.v }] : []}
            ripples={[{ f: TOUCH, x: 960, p: 0.5 }, ...ripplesFrom(SIM.events, 960)]}
            render={() => <StackCards fr={s} specs={CARDS} />}
            flareAt={S2_RELEASE + 6}
            strain={[380, S2_RELEASE]}
          />
        </AbsoluteFill>
      )}
      {f < TILT_FROM - 4 && <AbsoluteFill style={{ background: "linear-gradient(180deg, #040609 0%, #060a10 60%, #0a1018 100%)" }} />}

      {/* the phone, dimmed as the opening left it, scrolling away upward */}
      {phoneO > 0 && (
        <div style={{ position: "absolute", left: PX, top: 540 - cam, width: 0, height: 0, opacity: phoneO }}>
          <Phone f={f + 450} swipes={SWIPES} clock="3:02" dim={0.22 * (1 - gather)} />
          {gather > 0 && <div style={{ position: "absolute", left: -90, top: -90, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,240,215,1) 0%, rgba(255,200,130,0.6) 25%, rgba(255,180,100,0) 65%)", transform: `scale(${0.2 + gather})`, opacity: gather }} />}
        </div>
      )}

      {/* the orb in the air before it reaches the water */}
      {f >= LIFT - 2 && f < TOUCH - 6 + 12 && (
        <div style={{ position: "absolute", inset: 0, clipPath: `polygon(-3000px -3000px, 5000px -3000px, 5000px ${waterTop}px, -3000px ${waterTop}px)` }}>
          <div style={{ transform: `scale(${lift})`, transformOrigin: `${orbX}px ${screenY}px` }}>
            <Orb s={{ d: screenY - SURFACE, v: 0, ox: orbX }} f={f} under={false} flareAt={-999}  strainFrom={-2} strainTo={-1} />
          </div>
        </div>
      )}

      <Say f={f} at={26} out={110} text="那个「再刷一个」的念头，" top={160} size={64} weight={600} dim={0.85} />
      <Say f={f} at={52} out={116} text="就像这一点光。" top={250} size={84} />
      <Say f={f} at={TOUCH + 60} out={S2_RELEASE + 4} text="你越用力把它按下去——" top={130} size={76} />
      <Say f={f} at={S2_RELEASE + 16} text="它就弹得越高。" gold="弹得越高" top={130} size={84} />

      {/* the night runs on: the lock-screen clock jumps when it springs back */}
      {clock > 0 && (
        <div style={{ position: "absolute", right: 120, top: 120, textAlign: "right", color: K.fg, opacity: clock * interpolate(f, [S2_LEN - 10, S2_LEN], [1, 0.6], CL) }}>
          <div style={{ fontFamily: FONT, fontWeight: 300, fontSize: 30, letterSpacing: 6, opacity: 0.6 }}>凌晨</div>
          <div style={{ fontFamily: FONT, fontWeight: 300, fontSize: 96, transform: `scale(${1 + (1 - clock) * 0.25})`, transformOrigin: "100% 50%" }}>03:24</div>
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
      <Sequence from={GATHER} durationInFrames={70}>
        <Audio src={sfx("lift")} volume={0.5} />
      </Sequence>
      <Sequence from={LIFT} durationInFrames={70}>
        <Audio src={sfx("shimmer")} volume={0.3} />
      </Sequence>
      <Sequence from={TILT_FROM} durationInFrames={S2_LEN - TILT_FROM}>
        <Audio src={sfx("under")} volume={(t) => interpolate(t, [0, 40], [0, 0.28], CL)} />
      </Sequence>
      <Sequence from={TOUCH} durationInFrames={40}>
        <Audio src={sfx("drop")} volume={0.5} />
      </Sequence>
      {ev
        .filter((e) => e.kind === "land")
        .map((e) => (
          <Sequence key={e.f} from={e.f} durationInFrames={50}>
            <Audio src={sfx("thump")} volume={0.6} />
            <Audio src={sfx("plop")} volume={0.35} />
          </Sequence>
        ))}
      <Sequence from={S2_RELEASE - 50} durationInFrames={56}>
        <Audio src={sfx("swell")} volume={0.5} />
      </Sequence>
      <Sequence from={S2_RELEASE} durationInFrames={40}>
        <Audio src={sfx("sub")} volume={0.7} />
      </Sequence>
      {breach && (
        <Sequence from={breach.f} durationInFrames={50}>
          <Audio src={sfx("splash")} volume={0.9} />
          <Audio src={sfx("smallsplash")} volume={0.5} />
        </Sequence>
      )}
      {down && down.f < S2_LEN && (
        <Sequence from={down.f} durationInFrames={Math.min(50, S2_LEN - down.f)}>
          <Audio src={sfx("plop")} volume={0.5} />
        </Sequence>
      )}
    </>
  );
};
