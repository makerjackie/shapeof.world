import React from "react";
import { AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { FONT, K, SANS, SERIF } from "./theme";
import { Brand } from "./Press";
import { FEED, Phone, feedPos } from "./phone";

// The first 15 seconds, kept in the real world: one night on the phone. The excuses turn into
// self-blame, every line of blame is answered by another swipe, faster and faster, the clock runs on.
// Then silence, the question, and the claim the viewer has just watched happen.

export const OPEN2_FRAMES = 450;
const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const EO = Easing.bezier(0.16, 1, 0.3, 1);
const EIO = Easing.inOut(Easing.cubic);

// ---------- timeline (frames @30) ----------
export const SWIPES = [14, 44, 92, 118, 160, 194, 222, 244, 261, 274]; // gaps shrink: the spiral speeds up
const BANNER_IN = 58;
const STOP = 286; // the swiping stops; silence
const DIM = 300; // the phone dims, the question comes up
const Q1 = 306;
const Q2 = 326;
const Q_OUT = 376;
const C1 = 388; // the claim, with the music
const C2 = 408;

// the status-bar clock after each swipe from the 5th on
const TIMES: [number, string][] = [
  [0, "1:07"],
  [165, "1:26"],
  [199, "1:48"],
  [227, "2:13"],
  [249, "2:31"],
  [266, "2:47"],
  [279, "3:02"],
];
const clockAt = (f: number) => TIMES.filter(([at]) => f >= at).pop()![1];

// what goes through your head: two excuses, then the blame, each line answered by a swipe
const EXCUSES = [
  { from: 22, to: 58, time: "1:07", text: "再刷一个就睡。" },
  { from: 98, to: 140, time: "1:07", text: "……最后一个。" },
];
const BLAME = [
  { at: 148, time: "1:26", text: "又这么晚了。", size: 58 },
  { at: 182, time: "1:48", text: "你怎么又这样。", size: 62 },
  { at: 210, time: "2:13", text: "明天一定早睡。", size: 66 },
  { at: 236, time: "2:31", text: "再这样下去，就完了。", size: 70 },
];
// each thought is answered by the next swipe
const answer = (at: number) => SWIPES.find((s) => s > at) ?? at + 10;

const PX = 760; // phone centre x, left of centre to leave room for the thoughts
const TX = 1020; // thought column

const Line: React.FC<{ time: string; text: string; size: number; o: number; y: number; dx: number; bold?: boolean }> = ({ time, text, size, o, y, dx, bold }) => (
  <div style={{ position: "absolute", left: TX + dx, top: y, display: "flex", alignItems: "baseline", gap: 22, opacity: o, whiteSpace: "nowrap" }}>
    <span style={{ fontFamily: FONT, fontWeight: 300, fontSize: Math.round(size * 0.5), color: K.muted, letterSpacing: 1 }}>{time}</span>
    <span style={{ fontFamily: SANS, fontWeight: bold ? 700 : 500, fontSize: size, color: K.fg }}>{text}</span>
  </div>
);

export const Open2: React.FC<{ music?: boolean }> = ({ music = true }) => {
  const f = useCurrentFrame();

  // camera: a slow push toward the phone while the spiral tightens, eased back for the question
  const push = interpolate(f, [0, STOP], [1, 1.08], { ...CL, easing: Easing.in(Easing.quad) });
  const back = interpolate(f, [DIM, DIM + 40], [0, 1], { ...CL, easing: EIO });
  const zoom = push + (1.02 - push) * back;

  // while a thought is "said" the screen sinks and the line takes the frame; the swipe takes it back
  const thinking = [...EXCUSES.map((e) => e.from), ...BLAME.map((b) => b.at)].reduce((m, at) => {
    const back = answer(at);
    return Math.max(m, interpolate(f, [at, at + 5, back, back + 5], [0, 1, 1, 0], CL));
  }, 0);
  const dim = interpolate(f, [DIM, DIM + 24], [1, 0.22], { ...CL, easing: EIO }) * (1 - 0.6 * thinking);
  const thoughtsO = interpolate(f, [DIM, DIM + 24], [1, 0.0], CL);
  const feedC = FEED[Math.min(FEED.length - 1, Math.round(feedPos(f, SWIPES)) % FEED.length)];

  const q1 = interpolate(f, [Q1, Q1 + 18, Q_OUT, Q_OUT + 10], [0, 1, 1, 0], { ...CL, easing: EO });
  const q2 = interpolate(f, [Q2, Q2 + 18, Q_OUT, Q_OUT + 10], [0, 1, 1, 0], { ...CL, easing: EO });
  const c1 = interpolate(f, [C1, C1 + 16], [0, 1], { ...CL, easing: EO });
  const c2 = interpolate(f, [C2, C2 + 16], [0, 1], { ...CL, easing: EO });

  return (
    <AbsoluteFill style={{ background: K.bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, #040609 0%, #060a10 60%, #0a1018 100%)" }} />

      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: "50% 50%" }}>
        {/* the screen's light on the dark around it */}
        <div style={{ position: "absolute", left: PX - 700, top: 540 - 700, width: 1400, height: 1400, borderRadius: "50%", background: `radial-gradient(circle, ${feedC.blob}26 0%, ${feedC.a}16 30%, rgba(0,0,0,0) 62%)`, opacity: dim }} />
        <div style={{ position: "absolute", left: PX, top: 540, width: 0, height: 0 }}>
          <Phone f={f} swipes={SWIPES} clock={clockAt(f)} bannerIn={BANNER_IN} bannerOut={SWIPES[2]} dim={dim} />
        </div>

        {/* excuses, one at a time */}
        {EXCUSES.map((e, i) => {
          const o = interpolate(f, [e.from, e.from + 8, e.to - 8, e.to], [0, 1, 1, 0], CL);
          return o > 0 ? <Line key={i} time={e.time} text={e.text} size={58} o={o * (0.55 + 0.45 * thinking)} y={490 + (1 - o) * 10} dx={0} /> : null;
        })}

        {/* blame, piling up: each new line pushes the older ones up and dims them */}
        {BLAME.map((b, i) => {
          if (f < b.at) return null;
          const k = interpolate(f, [b.at, b.at + 10], [0, 1], { ...CL, easing: EO });
          const newer = BLAME.filter((n) => f >= n.at).length - 1 - i; // how many lines came after this one
          const lift = BLAME.slice(i + 1).reduce((s, n) => s + interpolate(f, [n.at, n.at + 10], [0, 1], { ...CL, easing: EO }) * 96, 0);
          const said = interpolate(f, [answer(b.at), answer(b.at) + 8], [1, 0.55], CL);
          const o = k * (newer === 0 ? said : Math.max(0.22, 0.45 - (newer - 1) * 0.1)) * thoughtsO;
          return <Line key={i} time={b.time} text={b.text} size={b.size} o={o} y={490 - lift + (1 - k) * 16} dx={0} bold={i === BLAME.length - 1} />;
        })}
      </AbsoluteFill>

      {/* the question, over the dimmed phone */}
      {q1 > 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 400, textAlign: "center", fontFamily: SERIF, fontWeight: 700, color: K.fg }}>
          <div style={{ fontSize: 60, letterSpacing: 6, opacity: 0.82 * q1, transform: `translateY(${(1 - q1) * 16}px)` }}>明明很想早睡，</div>
          <div style={{ marginTop: 20, fontSize: 92, letterSpacing: 6, opacity: q2, transform: `translateY(${(1 - q2) * 20}px)` }}>
            为什么就是<span style={{ color: K.gold }}>放不下手机</span>？
          </div>
        </div>
      )}

      {/* the claim */}
      {c1 > 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 400, textAlign: "center", fontFamily: SERIF, fontWeight: 700, color: K.fg }}>
          <div style={{ fontSize: 84, letterSpacing: 6, opacity: c1, transform: `translateY(${(1 - c1) * 16}px)` }}>你越跟自己较劲，</div>
          <div style={{ marginTop: 22, fontSize: 84, letterSpacing: 6, opacity: c2, transform: `translateY(${(1 - c2) * 16}px)` }}>
            就<span style={{ color: K.gold }}>越放不下手机</span>。
          </div>
        </div>
      )}

      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%)", pointerEvents: "none" }} />
      <AbsoluteFill style={{ backgroundImage: `url(${staticFile("grain.svg")})`, opacity: 0.07, mixBlendMode: "overlay" }} />
      <Brand />
      <Open2Sound music={music} />
    </AbsoluteFill>
  );
};

// ---------- sound ----------
const sfx = (n: string, ext = "wav") => staticFile(`sfx/${n}.${ext}`);

const Open2Sound: React.FC<{ music: boolean }> = ({ music }) => (
  <>
    {/* room tone, cut to near nothing at the stop */}
    <Audio src={sfx("brown")} volume={(f) => interpolate(f, [0, 12, STOP - 2, STOP + 2, C1, 450], [0, 0.08, 0.1, 0.0, 0.0, 0.0], CL)} />
    {SWIPES.map((at, i) => (
      <Sequence key={`s${at}`} from={at} durationInFrames={20}>
        <Audio src={sfx("swipe")} volume={0.42 + i * 0.03} />
      </Sequence>
    ))}
    {/* the video's own sound leaking from the speaker: a new clip with every swipe, ducked while a thought is said */}
    {[0, ...SWIPES].map((at, i) => {
      const next = i < SWIPES.length ? SWIPES[i] : STOP;
      const len = Math.max(4, (i < SWIPES.length ? next : STOP) - at);
      const thoughts = [...EXCUSES.map((e) => e.from), ...BLAME.map((b) => b.at)].filter((t) => t >= at && t < at + len);
      return (
        <Sequence key={`b${i}`} from={at + 4} durationInFrames={Math.max(4, len - 2)}>
          <Audio
            src={sfx(`bleed-${(i % 6) + 1}`)}
            volume={(t) => {
              const duck = thoughts.reduce((m, th) => Math.max(m, interpolate(t + at + 4, [th, th + 5, th + 30], [0, 1, 1], CL)), 0);
              return interpolate(t, [0, 3], [0, 0.32], CL) * (1 - 0.65 * duck);
            }}
          />
        </Sequence>
      );
    })}
    <Sequence from={BANNER_IN} durationInFrames={40}>
      <Audio src={sfx("notify")} volume={0.45} />
    </Sequence>
    {/* tension rising under the spiral, cut dead at the stop */}
    <Sequence from={STOP - 58} durationInFrames={58}>
      <Audio src={sfx("swell")} volume={(f) => interpolate(f, [0, 50, 57], [0.15, 0.7, 0], CL)} />
    </Sequence>
    {/* the music comes in with the claim */}
    {music && <Sequence from={C1 - 6} durationInFrames={450 - C1 + 6}>
      <Audio src={sfx("music-floating", "mp3")} startFrom={36} volume={(f) => interpolate(f, [0, 10, 62], [0, 0.6, 0.6], CL)} />
    </Sequence>}
    <Sequence from={C1} durationInFrames={40}>
      <Audio src={sfx("sub")} volume={0.45} />
    </Sequence>
  </>
);
