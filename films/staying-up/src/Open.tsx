import React from "react";
import { AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { FONT, K, SANS, SERIF } from "./theme";
import { D0, R, SURFACE, W, rnd } from "./sim";
import { Brand, Orb, Paper } from "./Press";

// The first 15 seconds: a phone at 01:07 that won't be put down; its light lifts off as the orb
// and drifts down onto night water; the question; then the film's claim, acted out once.

export const OPEN_FRAMES = 450;
const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const EIO = Easing.inOut(Easing.cubic);
const EO = Easing.bezier(0.16, 1, 0.3, 1);

// ---------- timeline (frames @30) ----------
const SWIPES = [14, 44, 92, 118]; // each swipe moves the feed one video up
const SWIPE_LEN = 11;
const BANNER_IN = 58; // bedtime reminder drops in, swiped away with the 3rd swipe
const GATHER = 136; // screen light gathers to a point
const LIFT = 150; // the orb leaves the screen
const CAM_FROM = 156;
const CAM_TO = 222;
const TOUCH = 226; // orb settles on the water
const Q1 = 232;
const Q2 = 262;
const Q_OUT = 328;
const SLIP_AT = 340; // the red slip starts falling
const RELEASE_AT = 392; // the slip slides off, the orb springs up
const L1 = 352;
const L2 = 404;

const WORLD_WATER = 1500; // water line in world y; the camera tilts down to it
const CAM_END = WORLD_WATER - SURFACE;

// ---------- orb on the water: a small deterministic spring, as in sim.ts ----------
type St = { d: number; v: number; slipY: number; slipVy: number; slipX: number; slipVx: number; slipRot: number; slipO: number; landed: boolean; breach: number; down: number };
const SIM: St[] = (() => {
  const out: St[] = [];
  let d = D0;
  let v = 0;
  let slipY = -260; // slip bottom, screen-space relative to the settled camera (world - CAM_END)
  let slipVy = 0;
  let slipX = 960;
  let slipVx = 0;
  let slipRot = -6;
  let slipO = 0;
  let landed = false;
  let above = false;
  let breach = -1;
  let down = -1;
  for (let f = 0; f < OPEN_FRAMES; f++) {
    if (f >= TOUCH) {
      const released = f >= RELEASE_AT;
      const target = D0 + (landed && !released ? 210 : 0);
      if (f === RELEASE_AT) v -= 3;
      if (SURFACE + d < SURFACE - R * 0.6) {
        if (!above) {
          above = true;
          breach = f;
        }
        v += 1.2;
      } else {
        if (above) {
          above = false;
          down = f;
          v *= 0.45;
        }
        const k = released && f < RELEASE_AT + 30 ? 0.0115 : 0.02;
        const c = released && f < RELEASE_AT + 25 ? 0.02 : 0.15;
        v += -k * (d - target) - c * v;
      }
      d += v;
    }
    // slip
    if (f >= SLIP_AT) {
      slipO = Math.min(1, slipO + 0.15);
      const orbTop = SURFACE + d - R;
      if (!landed) {
        slipVy += 1.6;
        slipY += slipVy;
        slipRot += (-2 - slipRot) * 0.15;
        if (slipY >= orbTop) {
          landed = true;
          slipY = orbTop;
          v += 12;
        }
      } else if (f < RELEASE_AT) {
        slipY = orbTop;
        slipRot += (-2 - slipRot) * 0.2;
      } else {
        if (slipVx === 0) {
          slipVx = -13;
          slipVy = -1;
        }
        slipVy += slipY > SURFACE ? 0.32 : 0.7;
        slipVx *= 0.97;
        slipX += slipVx;
        slipY += slipVy;
        slipRot -= 0.5;
        slipO = Math.max(0, slipO - (slipY > SURFACE + 30 ? 0.04 : 0.012));
      }
    }
    out.push({ d, v, slipY, slipVy, slipX, slipVx, slipRot, slipO, landed, breach, down });
  }
  return out;
})();
const LAND = SIM.findIndex((s) => s.landed);
const BREACH = SIM[OPEN_FRAMES - 1].breach;
const DOWN = SIM[OPEN_FRAMES - 1].down;

// ---------- phone ----------
const PH_W = 400;
const PH_H = 820;
const TW = PH_W - 20; // screen size inside the bezel
const TH = PH_H - 20;
const FEED = [
  { a: "#2b5876", b: "#4e4376", blob: "#8fd3f4" },
  { a: "#c94b4b", b: "#4b134f", blob: "#ffb199" },
  { a: "#134e5e", b: "#71b280", blob: "#d4fc79" },
  { a: "#41295a", b: "#2f0743", blob: "#f093fb" },
  { a: "#e65c00", b: "#7a2b00", blob: "#ffd194" },
];

const feedPos = (f: number) => SWIPES.reduce((p, at) => p + interpolate(f, [at, at + SWIPE_LEN], [0, 1], { ...CL, easing: EIO }), 0);

const FeedTile: React.FC<{ i: number; f: number }> = ({ i, f }) => {
  const c = FEED[i % FEED.length];
  const t = f / 30;
  return (
    <div style={{ position: "absolute", left: 0, top: i * TH, width: TW, height: TH, overflow: "hidden", background: `linear-gradient(160deg, ${c.a}, ${c.b})` }}>
      <div style={{ position: "absolute", left: 60 + Math.sin(t * 1.3 + i) * 40, top: 180 + Math.cos(t + i * 2) * 50, width: 280, height: 280, borderRadius: "50%", background: c.blob, opacity: 0.55, filter: "blur(50px)" }} />
      <div style={{ position: "absolute", left: 160 + Math.cos(t * 0.9 + i) * 50, top: 420 + Math.sin(t * 1.1 + i) * 40, width: 200, height: 200, borderRadius: "50%", background: c.a, opacity: 0.7, filter: "blur(40px)" }} />
      {/* caption + side rail, abstracted */}
      <div style={{ position: "absolute", left: 26, bottom: 96, width: 120, height: 14, borderRadius: 7, background: "rgba(255,255,255,0.85)" }} />
      <div style={{ position: "absolute", left: 26, bottom: 66, width: 250, height: 11, borderRadius: 6, background: "rgba(255,255,255,0.55)" }} />
      <div style={{ position: "absolute", left: 26, bottom: 44, width: 190, height: 11, borderRadius: 6, background: "rgba(255,255,255,0.4)" }} />
      {[0, 1, 2].map((k) => (
        <div key={k} style={{ position: "absolute", right: 22, bottom: 150 + k * 78, width: 42, height: 42, borderRadius: "50%", background: "rgba(255,255,255,0.8)" }} />
      ))}
      <div style={{ position: "absolute", left: 0, bottom: 0, width: `${((t * 23 + i * 31) % 100).toFixed(1)}%`, height: 3, background: "rgba(255,255,255,0.7)" }} />
    </div>
  );
};

const Phone: React.FC<{ f: number }> = ({ f }) => {
  const pos = feedPos(f);
  const screenOff = interpolate(f, [GATHER, LIFT + 6], [1, 0], { ...CL, easing: EIO });
  const bIn = interpolate(f, [BANNER_IN, BANNER_IN + 9], [0, 1], { ...CL, easing: EO });
  const bOut = interpolate(f, [SWIPES[2], SWIPES[2] + 8], [0, 1], { ...CL, easing: EIO });
  return (
    <div style={{ position: "absolute", left: -PH_W / 2, top: -PH_H / 2, width: PH_W, height: PH_H, borderRadius: 58, background: "#0b0c0f", boxShadow: "0 0 0 2px #23262c, 0 40px 80px rgba(0,0,0,0.6)" }}>
      <div style={{ position: "absolute", inset: 10, borderRadius: 48, overflow: "hidden", background: "#000" }}>
        <div style={{ position: "absolute", left: 0, top: -pos * TH, opacity: screenOff }}>
          {FEED.map((_, i) => (
            <FeedTile key={i} i={i} f={f} />
          ))}
        </div>
        {/* status bar */}
        <div style={{ position: "absolute", left: 34, top: 18, fontFamily: FONT, fontWeight: 500, fontSize: 20, color: "#fff", opacity: screenOff }}>1:07</div>
        <div style={{ position: "absolute", right: 30, top: 22, width: 30, height: 14, borderRadius: 4, border: "1.5px solid rgba(255,255,255,0.8)", opacity: screenOff }}>
          <div style={{ width: "28%", height: "100%", background: "#ff5a5f", borderRadius: 2 }} />
        </div>
        {/* bedtime reminder */}
        {bIn > 0 && bOut < 1 && (
          <div style={{ position: "absolute", left: 14, right: 14, top: 52, transform: `translateY(${(1 - bIn) * -130 - bOut * 160}px)`, opacity: screenOff, padding: "16px 18px", borderRadius: 26, background: "rgba(40,42,48,0.86)", border: "1px solid rgba(255,255,255,0.12)", display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: 11, background: "linear-gradient(140deg,#3a3f78,#1b1e3d)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffd166", fontSize: 24 }}>☾</div>
            <div style={{ fontFamily: SANS, color: "#fff" }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>就寝时间</div>
              <div style={{ fontSize: 17, opacity: 0.8, marginTop: 2 }}>已经过了 1 小时 37 分钟</div>
            </div>
          </div>
        )}
        {/* light gathering to a point */}
        <div style={{ position: "absolute", left: "50%", top: "50%", width: 0, height: 0 }}>
          {(() => {
            const g = interpolate(f, [GATHER, LIFT], [0, 1], { ...CL, easing: EIO }) * interpolate(f, [LIFT, LIFT + 8], [1, 0], CL);
            return g > 0 ? <div style={{ position: "absolute", left: -90, top: -90, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,240,215,1) 0%, rgba(255,200,130,0.6) 25%, rgba(255,180,100,0) 65%)", transform: `scale(${0.2 + g})`, opacity: g }} /> : null;
          })()}
        </div>
      </div>
    </div>
  );
};

// ---------- water ----------
const STARS = Array.from({ length: 70 }, (_, i) => ({ x: rnd(i * 3.1) * 2400 - 240, y: rnd(i * 7.7) * 1350 - 150, r: 0.6 + rnd(i * 1.9) * 1.4, p: rnd(i * 5.3) * 6 }));

const WaterLine: React.FC<{ f: number; ox: number; d: number; ripples: { f: number; p: number }[] }> = ({ f, ox, d, ripples }) => {
  const pts: string[] = [];
  for (let x = -300; x <= W + 300; x += 12) {
    let y = SURFACE + Math.sin(x / 140 + f / 22) * 1.6 + Math.sin(x / 61 - f / 15) * 0.9;
    ripples.forEach((r) => {
      const t = f - r.f;
      if (t <= 0 || t > 90) return;
      const dist = Math.abs(x - ox);
      const front = t * 7;
      y += Math.sin((dist - front) / 18) * Math.exp(-Math.abs(dist - front) / 60) * 7 * r.p * (1 - t / 90);
    });
    pts.push(`${x},${y.toFixed(1)}`);
  }
  const near = Math.exp(-Math.abs(d) / 140);
  return (
    <>
      <svg width={W + 600} height={1} style={{ position: "absolute", left: -300, top: 0, overflow: "visible" }} viewBox={`-300 0 ${W + 600} 1`}>
        <defs>
          <linearGradient id="ol" x1="0" x2="1">
            <stop offset="0" stopColor="#b9d3ee" stopOpacity="0" />
            <stop offset="0.5" stopColor="#d7e6f5" stopOpacity="0.55" />
            <stop offset="1" stopColor="#b9d3ee" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline points={pts.join(" ")} fill="none" stroke="url(#ol)" strokeWidth={1.6} />
      </svg>
      <div style={{ position: "absolute", left: ox - 520, top: SURFACE - 26, width: 1040, height: 52, borderRadius: "50%", background: `radial-gradient(ellipse at center, rgba(255,200,130,${0.42 * near}) 0%, rgba(255,170,90,${0.12 * near}) 40%, rgba(255,160,80,0) 70%)` }} />
      {/* faint glints drifting on the surface */}
      {Array.from({ length: 26 }, (_, i) => {
        const x = ((rnd(i * 9.1) * 2200 + f * (0.3 + rnd(i) * 0.5)) % 2200) - 140;
        const y = SURFACE + 8 + rnd(i * 4.4) * 260;
        const w = 18 + rnd(i * 2.2) * 50 * (1 - (y - SURFACE) / 400);
        const o = 0.08 + 0.1 * Math.sin(f / 9 + i);
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: w, height: 1.4, borderRadius: 1, background: "rgba(200,220,245,1)", opacity: Math.max(0, o) }} />;
      })}
    </>
  );
};

// ---------- film ----------
export const Open: React.FC = () => {
  const f = useCurrentFrame();
  const s = SIM[f];

  // camera: slow push on the phone, then tilt down with the orb to the water
  const push = interpolate(f, [0, GATHER], [1, 1.07], CL);
  const tilt = interpolate(f, [CAM_FROM, CAM_TO], [0, 1], { ...CL, easing: EIO });
  const cam = tilt * CAM_END;
  const zoom = push + (1 - push) * tilt;

  // orb: leaves the screen centre, drifts down, settles on the water
  const lift = interpolate(f, [LIFT, LIFT + 14], [0, 1], { ...CL, easing: EO });
  const fallK = interpolate(f, [LIFT + 4, TOUCH], [0, 1], { ...CL, easing: Easing.bezier(0.45, 0, 0.35, 1) });
  const orbWorldY = f < TOUCH ? 540 - 70 * Math.sin(Math.min(1, (f - LIFT) / 40) * Math.PI) * lift + fallK * (WORLD_WATER + D0 - 540) : WORLD_WATER + s.d;
  const orbScreenY = orbWorldY - cam; // in the settled frame, SURFACE + s.d
  const orbState = { d: orbScreenY - SURFACE, v: f < TOUCH ? 0 : s.v, ox: 960 };

  const thought1 = interpolate(f, [22, 30, 50, 58], [0, 1, 1, 0], CL);
  const thought2 = interpolate(f, [98, 106, 132, 140], [0, 1, 1, 0], CL);
  const q1 = interpolate(f, [Q1, Q1 + 20, Q_OUT, Q_OUT + 12], [0, 1, 1, 0], { ...CL, easing: EO });
  const q2 = interpolate(f, [Q2, Q2 + 20, Q_OUT, Q_OUT + 12], [0, 1, 1, 0], { ...CL, easing: EO });
  const l1 = interpolate(f, [L1, L1 + 18], [0, 1], { ...CL, easing: EO });
  const l2 = interpolate(f, [L2, L2 + 18], [0, 1], { ...CL, easing: EO });
  const phoneGlow = interpolate(f, [0, 10, GATHER, LIFT + 6], [0, 1, 1, 0], CL);
  const feedC = FEED[Math.min(FEED.length - 1, Math.round(feedPos(f)))];

  const ripples = [
    { f: TOUCH, p: 0.5 },
    ...(LAND > 0 ? [{ f: LAND, p: 0.8 }] : []),
    ...(BREACH > 0 ? [{ f: BREACH, p: 1.2 }] : []),
    ...(DOWN > 0 ? [{ f: DOWN, p: 1 }] : []),
  ];

  const aboveClip = `polygon(-3000px -3000px, 5000px -3000px, 5000px ${SURFACE}px, -3000px ${SURFACE}px)`;
  const belowClip = `polygon(-3000px ${SURFACE}px, 5000px ${SURFACE}px, 5000px 5000px, -3000px 5000px)`;
  const settled = f >= CAM_FROM; // water exists once the camera starts down
  const waterTop = SURFACE + (CAM_END - cam); // screen y of the water line during the tilt
  const orbW = { ...orbState, d: orbScreenY - waterTop }; // the same orb, in the water world's coordinates

  const slip = s.slipO > 0 && f >= SLIP_AT ? (
    <div style={{ position: "absolute", left: s.slipX, top: s.slipY, width: 0, height: 0, transform: `rotate(${s.slipRot}deg)`, opacity: s.slipO }}>
      <div style={{ position: "absolute", left: 0, bottom: 0, transform: "translateX(-50%)" }}>
        <Paper kind="teacher" size={64} h={108} text="别浪费时间" />
      </div>
    </div>
  ) : null;

  return (
    <AbsoluteFill style={{ background: K.bg, overflow: "hidden" }}>
      {/* sky */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, #040609 0%, #060a10 60%, #0b121a 100%)" }} />
      {STARS.map((st, i) => {
        const y = st.y - cam * 0.25;
        return <div key={i} style={{ position: "absolute", left: st.x, top: y, width: st.r * 2, height: st.r * 2, borderRadius: "50%", background: "#dfe8f5", opacity: 0.25 + 0.2 * Math.sin(f / 14 + st.p) }} />;
      })}

      {/* phone scene (world y = screen y at cam 0) */}
      {f < CAM_TO + 4 && (
        <div style={{ position: "absolute", left: 0, top: 0, width: W, height: 1080, transform: `translateY(${-cam}px) scale(${zoom})`, transformOrigin: "50% 50%" }}>
          <div style={{ position: "absolute", left: 960 - 700, top: 540 - 700, width: 1400, height: 1400, borderRadius: "50%", background: `radial-gradient(circle, ${feedC.blob}22 0%, ${feedC.a}14 30%, rgba(0,0,0,0) 62%)`, opacity: phoneGlow }} />
          <div style={{ position: "absolute", left: 960, top: 540, width: 0, height: 0, opacity: interpolate(f, [LIFT + 6, CAM_FROM + 26], [1, 0], CL) }}>
            <Phone f={f} />
          </div>
          {thought1 > 0 && <div style={{ position: "absolute", left: 1210, top: 500, fontFamily: SANS, fontWeight: 500, fontSize: 44, color: K.fg, opacity: 0.8 * thought1, transform: `translateY(${(1 - thought1) * 10}px)` }}>再刷一个就睡。</div>}
          {thought2 > 0 && <div style={{ position: "absolute", left: 1210, top: 500, fontFamily: SANS, fontWeight: 500, fontSize: 44, color: K.fg, opacity: 0.8 * thought2, transform: `translateY(${(1 - thought2) * 10}px)` }}>……最后一个。</div>}
        </div>
      )}

      {/* water world: rises into frame during the tilt */}
      {settled && (
        <div style={{ position: "absolute", left: 0, top: waterTop - SURFACE, width: W, height: 1080 }}>
          <div style={{ position: "absolute", left: -600, top: SURFACE, width: W + 1200, height: 1800, background: `linear-gradient(180deg, #0a1620 0%, ${K.water} 22%, ${K.waterDeep} 70%)` }} />
          {/* stars mirrored, broken by the water */}
          {STARS.slice(0, 40).map((st, i) => {
            const y = SURFACE + (SURFACE - (st.y - CAM_END * 0.25)) * 0.6;
            if (y < SURFACE + 6) return null;
            return <div key={i} style={{ position: "absolute", left: st.x + Math.sin(f / 10 + i) * 3, top: y, width: st.r * 5, height: st.r * 0.8, borderRadius: 2, background: "#dfe8f5", opacity: 0.12 }} />;
          })}
          <div style={{ position: "absolute", inset: 0, clipPath: aboveClip }}>
            {slip}
          </div>
          <div style={{ position: "absolute", inset: 0, clipPath: belowClip }}>
            <div style={{ position: "absolute", inset: 0, filter: "blur(1.3px) saturate(0.8)", transform: `skewX(${Math.sin(f / 13) * 0.8}deg)`, transformOrigin: `50% ${SURFACE}px` }}>
              {slip}
              {f >= TOUCH - 8 && <Orb s={orbW} f={f} under flareAt={RELEASE_AT - 4} strainFrom={LAND} strainTo={RELEASE_AT} />}
              {orbW.d < -R * 0.2 && (
                <div style={{ position: "absolute", inset: 0, transform: `translateY(${2 * SURFACE}px) scaleY(-0.85)`, transformOrigin: "50% 0", opacity: 0.28, filter: "blur(3px)" }}>
                  <Orb s={orbW} f={f} under={false} flareAt={RELEASE_AT - 4} />
                </div>
              )}
            </div>
            <div style={{ position: "absolute", left: -600, top: SURFACE, width: W + 1200, height: 1800, background: "linear-gradient(180deg, rgba(8,22,34,0.30) 0%, rgba(4,12,20,0.55) 25%, rgba(2,6,10,0.88) 60%)" }} />
          </div>
          <WaterLine f={f} ox={960} d={orbW.d} ripples={ripples} />
        </div>
      )}

      {/* the orb above the water line (and in the air while it drifts down) */}
      {f >= LIFT - 2 && (
        <div style={{ position: "absolute", inset: 0, clipPath: settled ? `polygon(-3000px -3000px, 5000px -3000px, 5000px ${waterTop}px, -3000px ${waterTop}px)` : undefined }}>
          <div style={{ position: "absolute", left: 0, top: orbScreenY - (SURFACE + orbState.d), width: 0, height: 0 }}>
            <div style={{ transform: `scale(${lift})`, transformOrigin: `960px ${SURFACE + orbState.d}px` }}>
              <Orb s={orbState} f={f} under={false} flareAt={RELEASE_AT - 4} strainFrom={LAND} strainTo={RELEASE_AT} />
            </div>
          </div>
        </div>
      )}

      {/* the question */}
      {q1 > 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 150, textAlign: "center", fontFamily: SERIF, fontWeight: 700, color: K.fg }}>
          <div style={{ fontSize: 64, letterSpacing: 6, opacity: 0.82 * q1, transform: `translateY(${(1 - q1) * 18}px)` }}>明明很想早睡，</div>
          <div style={{ marginTop: 18, fontSize: 92, letterSpacing: 6, opacity: q2, transform: `translateY(${(1 - q2) * 22}px)` }}>
            为什么就是<span style={{ color: K.gold }}>放不下手机</span>？
          </div>
        </div>
      )}

      {/* the claim */}
      {l1 > 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 96, textAlign: "center", fontFamily: SERIF, fontWeight: 700, color: K.fg }}>
          <div style={{ fontSize: 76, letterSpacing: 6, opacity: l1, transform: `translateY(${(1 - l1) * 18}px)` }}>你越跟自己较劲，</div>
          <div style={{ marginTop: 18, fontSize: 76, letterSpacing: 6, opacity: l2, transform: `translateY(${(1 - l2) * 18}px)` }}>
            就<span style={{ color: K.gold }}>越放不下手机</span>。
          </div>
        </div>
      )}

      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%)", pointerEvents: "none" }} />
      <AbsoluteFill style={{ backgroundImage: `url(${staticFile("grain.svg")})`, opacity: 0.07, mixBlendMode: "overlay" }} />
      <Brand />
      <OpenSound />
    </AbsoluteFill>
  );
};

// ---------- sound ----------
const sfx = (n: string, ext = "wav") => staticFile(`sfx/${n}.${ext}`);

const OpenSound: React.FC = () => (
  <>
    <Audio src={sfx("brown")} volume={(f) => interpolate(f, [0, 12, 140, 200, 430, 450], [0, 0.16, 0.16, 0.06, 0.06, 0], CL)} />
    {SWIPES.map((at) => (
      <Sequence key={`s${at}`} from={at} durationInFrames={20}>
        <Audio src={sfx("swipe")} volume={0.5} />
      </Sequence>
    ))}
    <Sequence from={BANNER_IN} durationInFrames={40}>
      <Audio src={sfx("notify")} volume={0.45} />
    </Sequence>
    <Sequence from={GATHER} durationInFrames={70}>
      <Audio src={sfx("lift")} volume={0.6} />
    </Sequence>
    <Sequence from={LIFT} durationInFrames={70}>
      <Audio src={sfx("shimmer")} volume={0.35} />
    </Sequence>
    {/* music enters with the orb; the track's first notes sit ~1.3 s in */}
    <Sequence from={LIFT - 4} durationInFrames={450 - LIFT + 4}>
      <Audio src={sfx("music-floating", "mp3")} startFrom={36} volume={(f) => interpolate(f, [0, 30, 290 - 30, 296], [0, 0.55, 0.55, 0.0], CL)} />
    </Sequence>
    <Sequence from={CAM_FROM} durationInFrames={450 - CAM_FROM}>
      <Audio src={sfx("under")} volume={(f) => interpolate(f, [0, 40, 260, 294], [0, 0.3, 0.3, 0], CL)} />
    </Sequence>
    <Sequence from={TOUCH} durationInFrames={40}>
      <Audio src={sfx("drop")} volume={0.5} />
    </Sequence>
    {LAND > 0 && (
      <Sequence from={LAND} durationInFrames={50}>
        <Audio src={sfx("thump")} volume={0.75} />
        <Audio src={sfx("plop")} volume={0.45} />
      </Sequence>
    )}
    <Sequence from={RELEASE_AT} durationInFrames={40}>
      <Audio src={sfx("sub")} volume={0.6} />
    </Sequence>
    {BREACH > 0 && (
      <Sequence from={BREACH} durationInFrames={50}>
        <Audio src={sfx("smallsplash")} volume={0.8} />
      </Sequence>
    )}
    {DOWN > 0 && (
      <Sequence from={DOWN} durationInFrames={50}>
        <Audio src={sfx("plop")} volume={0.5} />
      </Sequence>
    )}
  </>
);
