import React from "react";
import { AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { K, SANS } from "../theme";
import { Orb } from "../Press";
import { CL, Dressing, EIO, EO, Say, Src, WaterScene } from "./kit";
import { D0, SURFACE } from "./stack";
import { S2_END_STATE } from "./S2Press";

// 31.5–42.3 s. The loop drawn on the water: staying up → blaming yourself → feeling bad → the phone →
// staying up. The orb runs it faster and faster on the music's lift.

export const S3_LEN = 324;
const CX = 960;
const RX = 560;
const RY = 120;
const CY = SURFACE + 4; // the ring lies on the water
const NODES = [
  { a: Math.PI / 2, text: "熬夜" }, // front
  { a: Math.PI, text: "怪自己" }, // left
  { a: (3 * Math.PI) / 2, text: "难受" }, // back
  { a: 0, text: "刷手机" }, // right
];
const ON = 40; // the orb joins the ring
const OFF = 290; // and leaves it
const DRAW_FROM = 6;
const DRAW_TO = 40;

// angle of the orb on the ring: speeds up steadily (rad/frame from 0.035 to 0.24)
const angleAt = (f: number) => {
  let a = Math.PI / 2;
  for (let t = ON; t < Math.min(f, OFF); t++) a += 0.035 + 0.205 * Math.pow((t - ON) / (OFF - ON), 1.6);
  return a;
};
const ptAt = (a: number) => ({ x: CX + Math.cos(a) * RX, y: CY + Math.sin(a) * RY });
// lap crossings of the front node, for the whoosh
const LAPS: number[] = (() => {
  const out: number[] = [];
  let prev = angleAt(ON);
  for (let f = ON + 1; f < OFF; f++) {
    const a = angleAt(f);
    if (Math.floor((a - Math.PI / 2) / (Math.PI * 2)) > Math.floor((prev - Math.PI / 2) / (Math.PI * 2))) out.push(f);
    prev = a;
  }
  return out;
})();

export const S3Loop: React.FC = () => {
  const f = useCurrentFrame();
  const draw = interpolate(f, [DRAW_FROM, DRAW_TO], [0, 1], { ...CL, easing: EIO });
  const ringO = interpolate(f, [OFF, OFF + 24], [1, 0], CL);

  // orb: from where S2 left it, onto the front of the ring, round and round, back to the centre
  const settle = interpolate(f, [0, ON], [0, 1], { ...CL, easing: EIO });
  const a = angleAt(f);
  const onRing = ptAt(a);
  const back = interpolate(f, [OFF, OFF + 26], [0, 1], { ...CL, easing: EIO });
  const startD = S2_END_STATE.d;
  let ox = CX;
  let oy = SURFACE + startD + (D0 - startD) * settle;
  if (f >= ON) {
    ox = onRing.x + (CX - onRing.x) * back;
    oy = onRing.y - 6 + (SURFACE + D0 - (onRing.y - 6)) * back;
  } else {
    const front = ptAt(Math.PI / 2);
    ox = CX + (front.x - CX) * settle;
    oy = oy + (front.y - 6 - oy) * settle;
  }
  const speed = f >= ON && f < OFF ? 0.035 + 0.205 * Math.pow((f - ON) / (OFF - ON), 1.6) : 0;

  // trail: the last few positions
  const trail = f >= ON && f < OFF + 10 ? Array.from({ length: 22 }, (_, i) => ptAt(angleAt(f - i * 1.0))) : [];

  // which node the orb is nearest to
  const lit = (na: number) => {
    if (f < ON || f >= OFF) return 0;
    const da = Math.abs(((((a - na) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    return Math.max(0, 1 - da / 0.9);
  };

  return (
    <AbsoluteFill style={{ background: K.bg }}>
      <WaterScene
        f={f + 495}
        orbs={[]}
        ripples={[]}
        render={(under) =>
          under ? null : (
            <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: ringO }}>
              <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill="none" stroke="rgba(255,214,150,0.55)" strokeWidth={2.5} strokeDasharray={`${draw * 2300} 2300`} />
            </svg>
          )
        }
      />
      {/* ring front half drawn over the water line so it reads as lying on the surface */}
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, opacity: ringO }}>
        <defs>
          <clipPath id="front">
            <rect x={0} y={CY} width={1920} height={400} />
          </clipPath>
        </defs>
        <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill="none" stroke="rgba(255,214,150,0.7)" strokeWidth={3} clipPath="url(#front)" strokeDasharray={`${draw * 2300} 2300`} />
        {trail.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y - 6} r={Math.max(1, 22 - i)} fill="rgba(255,200,130,1)" opacity={(1 - i / 22) * 0.18 * Math.min(1, speed * 6)} />
        ))}
      </svg>

      {/* node labels */}
      {NODES.map((n, i) => {
        const p = ptAt(n.a);
        const show = interpolate(f, [DRAW_FROM + i * 8, DRAW_FROM + i * 8 + 14], [0, 1], { ...CL, easing: EO }) * ringO;
        const l = lit(n.a);
        const above = n.a === (3 * Math.PI) / 2;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: p.x,
              top: p.y + (above ? -70 : n.a === Math.PI / 2 ? 34 : -64),
              transform: "translateX(-50%)",
              padding: "8px 22px",
              borderRadius: 30,
              fontFamily: SANS,
              fontWeight: 700,
              fontSize: 40,
              color: l > 0.3 ? "#1a1208" : K.fg,
              background: `rgba(255,209,102,${0.12 + 0.88 * l})`,
              border: "1px solid rgba(255,209,102,0.45)",
              boxShadow: `0 0 ${30 * l}px rgba(255,200,120,${0.6 * l})`,
              opacity: show,
              whiteSpace: "nowrap",
            }}
          >
            {n.text}
          </div>
        );
      })}

      {/* the orb itself, above everything (it rides on the surface) */}
      <div style={{ position: "absolute", inset: 0 }}>
        <div style={{ transform: `scale(${1 + speed * 0.6})`, transformOrigin: `${ox}px ${oy}px` }}>
          <Orb s={{ d: oy - SURFACE, v: 0, ox }} f={f} under={false} flareAt={-999}  strainFrom={-2} strainTo={-1} />
        </div>
      </div>

      <Say f={f} at={36} out={120} text="怪自己，会让你难受。" top={110} size={72} />
      <Say f={f} at={126} out={226} text="难受的时候，手机是最快的止痛药。" gold="最快的止痛药" top={110} size={72} />
      <Say f={f} at={232} out={S3_LEN - 8} text="于是，越转越快。" top={110} size={84} />
      <Src f={f} at={130} out={S3_LEN - 8} text="拖延的核心，常常是在躲开坏情绪 · Sirois & Pychyl, 2013" />

      <Dressing />
      {LAPS.map((l) => (
        <Sequence key={l} from={l} durationInFrames={18}>
          <Audio src={staticFile("sfx/swipe.wav")} volume={0.35} />
        </Sequence>
      ))}
      <Audio src={staticFile("sfx/under.wav")} volume={0.22} />
    </AbsoluteFill>
  );
};

// keep eslint quiet about the unused easing import in some builds
void Easing;
