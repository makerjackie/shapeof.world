import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { FONT, K, SANS } from "../theme";
import { Phone } from "../phone";
import { CL, CardSpec, Dressing, EIO, EO, Motes, Say, Src, StackCards, WaterScene, cardH } from "./kit";
import { D0, SURFACE, simulateStack } from "./stack";

// 130–158 s. Three things to try tonight, each acted out once.

export const S6_LEN = 480;
const M2 = 160;
const M3 = 320;

const C1: CardSpec[] = [
  { kind: "notice", text: "你怎么又这样。", size: 46 },
  { kind: "notice", text: "又浪费了一天。", size: 46 },
];
const M1SIM = simulateStack({
  frames: M2,
  cards: [
    { at: 40, h: cardH(C1[0]), weight: 50, rot: -1, vanishAt: 64 },
    { at: 84, h: cardH(C1[1]), weight: 50, rot: 1, vanishAt: 106 },
  ],
});

const Title: React.FC<{ f: number; at: number; out: number; n: string; title: string; sub: string; left?: number; top?: number }> = ({ f, at, out, n, title, sub, left, top = 150 }) => {
  const k = interpolate(f, [at, at + 16, out - 12, out], [0, 1, 1, 0], { ...CL, easing: EO });
  const k2 = interpolate(f, [at + 20, at + 36, out - 12, out], [0, 1, 1, 0], { ...CL, easing: EO });
  if (k <= 0) return null;
  const align = left === undefined ? "center" : "left";
  return (
    <div style={{ position: "absolute", top, left: left ?? 0, right: left === undefined ? 0 : undefined, textAlign: align as "center" | "left", color: K.fg }}>
      <div style={{ fontFamily: FONT, fontWeight: 300, fontSize: 40, color: K.gold, opacity: k, letterSpacing: 4 }}>{n}</div>
      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 76, opacity: k, transform: `translateY(${(1 - k) * 16}px)`, marginTop: 6 }}>{title}</div>
      <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 40, color: K.sub, opacity: k2, marginTop: 18, lineHeight: 1.5, whiteSpace: "pre-line" }}>{sub}</div>
    </div>
  );
};

export const S6Methods: React.FC = () => {
  const f = useCurrentFrame();

  // --- 1: don't argue with yourself ---
  const m1 = f < M2 + 20 ? M1SIM.frames[Math.min(f, M2 - 1)] : null;
  const waterO1 = interpolate(f, [M2 - 10, M2 + 16], [1, 0], CL);

  // --- 2: give the night an ending ---
  const phoneIn = interpolate(f, [M2, M2 + 24, M3 - 16, M3 + 6], [0, 1, 1, 0], { ...CL, easing: EIO });
  const prog = interpolate(f, [M2 + 10, M2 + 80], [0.6, 1], CL);
  const done = interpolate(f, [M2 + 82, M2 + 92], [0, 1], { ...CL, easing: EO });
  const screenOff = interpolate(f, [M2 + 110, M2 + 140], [1, 0], { ...CL, easing: EIO });

  // --- 3: twenty minutes, then get up ---
  const water3 = interpolate(f, [M3 - 6, M3 + 20], [0, 1], CL);
  const timer = interpolate(f, [M3 + 24, M3 + 84], [0, 1], { ...CL, easing: EIO });
  const up = interpolate(f, [M3 + 88, M3 + 108, M3 + 128, S6_LEN - 6], [0, 1, 1, 0], { ...CL, easing: EIO });
  const away = interpolate(f, [M3 + 96, M3 + 128, S6_LEN - 6], [0, 1, 0], { ...CL, easing: EIO });
  const o3 = { x: 960 + 260 * away, d: D0 - 150 * up + Math.sin(f / 14) * 2, v: 0 };
  const minutes = Math.round(timer * 20);

  return (
    <AbsoluteFill style={{ background: K.bg }}>
      {waterO1 > 0 && m1 && (
        <AbsoluteFill style={{ opacity: waterO1 }}>
          <WaterScene
            f={f + 1980}
            orbs={[{ x: 960, d: m1.d, v: m1.v, glow: 1.1 }]}
            render={() => (
              <>
                <StackCards fr={m1} specs={C1} />
                <Motes f={f} at={64} x={960} y={m1.cards[0].bottom - 40} />
                <Motes f={f} at={106} x={960} y={m1.cards[1].bottom - 40} />
              </>
            )}
          />
        </AbsoluteFill>
      )}
      <Say f={f} at={-10} out={26} text="今晚，可以试试这三件事。" top={420} size={80} />
      <Title f={f} at={24} out={M2 - 4} n="一" title="不跟自己吵。" sub={"想刷，就承认：「我现在就是想放松一下。」"} />

      {phoneIn > 0 && (
        <AbsoluteFill style={{ opacity: phoneIn }}>
          <AbsoluteFill style={{ background: "linear-gradient(180deg, #040609 0%, #060a10 60%, #0a1018 100%)" }} />
          <div style={{ position: "absolute", left: 1340, top: 540, width: 0, height: 0 }}>
            <Phone f={f + 1000} swipes={[]} clock="00:41" dim={screenOff} />
            {/* one episode, with an end */}
            <div style={{ position: "absolute", left: -170, top: 330, width: 340, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.25)", opacity: screenOff }}>
              <div style={{ width: `${prog * 100}%`, height: "100%", borderRadius: 3, background: K.gold }} />
            </div>
            <div style={{ position: "absolute", left: -170, top: 344, width: 340, display: "flex", justifyContent: "space-between", fontFamily: FONT, fontSize: 18, color: "rgba(255,255,255,0.7)", opacity: screenOff }}>
              <span>第 12 集</span>
              <span>{prog >= 1 ? "已看完" : `${Math.round((1 - prog) * 22)} 分钟`}</span>
            </div>
            {done > 0 && (
              <div style={{ position: "absolute", left: -190, top: -400, width: 380, height: 800, borderRadius: 48, background: `rgba(5,7,10,${0.75 * done})`, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, opacity: screenOff }}>
                <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 64, color: K.fg, opacity: done }}>完</div>
                <div style={{ fontFamily: SANS, fontSize: 24, color: K.sub, opacity: done }}>今晚就到这里</div>
              </div>
            )}
          </div>
        </AbsoluteFill>
      )}
      <Title f={f} at={M2 + 8} out={M3 - 4} n="二" title="给夜晚一个结尾。" sub={"看完这一集就停。\n没有尽头的信息流，最难停下。"} left={150} top={330} />

      {water3 > 0 && (
        <AbsoluteFill style={{ opacity: water3 }}>
          <WaterScene f={f + 1980} orbs={[o3]} ripples={[{ f: M3 + 92, x: 960, p: 0.7 }, { f: S6_LEN - 10, x: 960, p: 0.5 }]} />
          {/* a twenty-minute ring round the orb while it lies there */}
          <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, opacity: interpolate(f, [M3 + 16, M3 + 26, M3 + 90, M3 + 104], [0, 1, 1, 0], CL) }}>
            <circle cx={960} cy={SURFACE + D0} r={120} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={4} />
            <circle cx={960} cy={SURFACE + D0} r={120} fill="none" stroke={K.gold} strokeWidth={4} strokeLinecap="round" strokeDasharray={`${timer * 754} 754`} transform={`rotate(-90 960 ${SURFACE + D0})`} />
          </svg>
          <div style={{ position: "absolute", left: 1110, top: SURFACE + D0 - 60, fontFamily: FONT, fontWeight: 300, fontSize: 48, color: K.fg, opacity: interpolate(f, [M3 + 20, M3 + 30, M3 + 90, M3 + 104], [0, 0.85, 0.85, 0], CL) }}>
            {minutes} 分钟
          </div>
        </AbsoluteFill>
      )}
      <Title f={f} at={M3 + 8} out={S6_LEN - 2} n="三" title="躺 20 分钟还睡不着，就起来。" sub={"去别处坐一会儿，困了再回床上。不硬睡。"} top={120} />
      <Src f={f} at={M3 + 20} out={S6_LEN - 2} text="失眠认知行为疗法（CBT-I）的常用做法" />

      <Dressing />
      {[64, 106].map((t) => (
        <Sequence key={t} from={t} durationInFrames={70}>
          <Audio src={staticFile("sfx/shimmer.wav")} volume={0.22} />
        </Sequence>
      ))}
      <Sequence from={M2 + 82} durationInFrames={30}>
        <Audio src={staticFile("sfx/tap.wav")} volume={0.5} />
      </Sequence>
      <Sequence from={M3 + 88} durationInFrames={40}>
        <Audio src={staticFile("sfx/cloth.wav")} volume={0.4} />
      </Sequence>
    </AbsoluteFill>
  );
};
