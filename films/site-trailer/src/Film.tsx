import React from "react";
import { AbsoluteFill, Audio, Easing, Freeze, Img, interpolate, OffthreadVideo, random, Sequence, staticFile, useCurrentFrame } from "remotion";
import { b2f, CARD_AT, FILM_FRAMES, FPS, GRID, GRID_AT, GRID_LABEL, GRID_ORDER, Label, LINES, Shot, SHOTS, Tile } from "./edl";
import { FONT, K, MONO, SERIF } from "./theme";

const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const EO = Easing.bezier(0.16, 1, 0.3, 1);
const EIO = Easing.bezier(0.65, 0, 0.35, 1);
const EIN = Easing.bezier(0.55, 0, 0.9, 0.4);
const EBACK = Easing.bezier(0.34, 1.56, 0.64, 1);

// Source time (s) of a shot at local frame f, with the optional speed ramp.
const srcTime = (s: Shot, f: number) => {
  const r = s.rate ?? 1;
  if (!s.ramp || f < s.ramp.at) return s.src + (f / FPS) * r;
  return s.src + (s.ramp.at / FPS) * r + ((f - s.ramp.at) / FPS) * s.ramp.rate;
};

// One frame of a clip at an exact source time. Inside <Freeze frame={1}> the video sees frame 1 + `from` of the
// enclosing <Sequence>, and asks for media time frame × playbackRate / fps; so playbackRate = t·fps / (1 + from)
// makes Remotion fetch time t, and ramps and odd start points stay frame-accurate.
const Frame: React.FC<{ id: string; t: number; from: number; fit?: "cover" | "fill" }> = ({ id, t, from, fit = "cover" }) => (
  <Freeze frame={1}>
    <OffthreadVideo muted src={staticFile(`footage/${id}.mp4`)} playbackRate={Math.max(0.0001, (t * FPS) / (1 + from))} style={{ width: "100%", height: "100%", objectFit: fit }} />
  </Freeze>
);

const ShotView: React.FC<{ s: Shot; from: number; frames: number }> = ({ s, from, frames }) => {
  const f = useCurrentFrame();
  const [z0, z1] = s.zoom ?? [1, 1];
  const z = interpolate(f, [0, Math.max(1, frames - 1)], [z0, z1], { ...CL, easing: Easing.bezier(0.33, 0, 0.67, 1) });
  const [ox, oy] = s.origin ?? [0.5, 0.5];
  return (
    <AbsoluteFill style={{ transform: `scale(${z})`, transformOrigin: `${ox * 100}% ${oy * 100}%` }}>
      <Frame id={s.id} t={srcTime(s, f)} from={from} />
    </AbsoluteFill>
  );
};

// Tiny HUD label, bottom left: index and English in mono, the Chinese line under it. Wipes in from the left.
const Hud: React.FC<{ label: Label; n: number }> = ({ label, n }) => {
  const f = useCurrentFrame();
  const a = interpolate(f, [0, 6], [0, 1], { ...CL, easing: EO });
  const b = interpolate(f, [2, 9], [0, 1], { ...CL, easing: EO });
  return (
    <div style={{ position: "absolute", left: 72, bottom: 66, display: "flex", flexDirection: "column", gap: 8, textShadow: "0 1px 14px rgba(0,0,0,0.65)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: MONO, fontSize: 15, letterSpacing: 3, color: K.fg, clipPath: `inset(0 ${(1 - a) * 100}% 0 0)` }}>
        <span style={{ color: K.gold }}>{n ? String(n).padStart(2, "0") : "3×3"}</span>
        <span style={{ width: 26, height: 1, background: "rgba(244,240,232,0.55)" }} />
        <span style={{ opacity: 0.75 }}>{label[1]}</span>
      </div>
      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 30, letterSpacing: 2, color: K.fg, whiteSpace: "nowrap", clipPath: `inset(0 ${(1 - b) * 100}% 0 0)` }}>{label[0]}</div>
    </div>
  );
};

// The grid: 3×3 tiles pop in on sixteenths from the middle outwards; on the last beat the frame pushes into the
// middle tile, which becomes the next full-frame shot.
const GW = (1920 - 4 * 6) / 3;
const GH = (1080 - 4 * 6) / 3;
const TileView: React.FC<{ tile: Tile; i: number; k: number }> = ({ tile, i, k }) => {
  const f = useCurrentFrame();
  const start = Math.round(k * 3.5);
  const p = interpolate(f, [start, start + 6], [0, 1], { ...CL, easing: EO });
  const col = i % 3, row = Math.floor(i / 3);
  const [ox, oy] = tile.origin ?? [0.5, 0.5];
  return (
    <div style={{ position: "absolute", left: 6 + col * (GW + 6), top: 6 + row * (GH + 6), width: GW, height: GH, overflow: "hidden", opacity: p, transform: `scale(${0.9 + 0.1 * p})` }}>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${tile.zoom ?? 1})`, transformOrigin: `${ox * 100}% ${oy * 100}%` }}>
        <Frame id={tile.id} t={tile.src + f / FPS} from={b2f(GRID_AT)} />
      </div>
    </div>
  );
};
const Grid: React.FC = () => {
  const f = useCurrentFrame();
  const push = interpolate(f, [b2f(3), b2f(4)], [0, 1], { ...CL, easing: EIN });
  const S = Math.max(1920 / GW, 1080 / GH);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill style={{ transform: `scale(${1 + (S - 1) * push})`, transformOrigin: "50% 50%" }}>
        {GRID.map((t, i) => (
          <TileView key={i} tile={t} i={i} k={GRID_ORDER.indexOf(i)} />
        ))}
      </AbsoluteFill>
      <div style={{ opacity: 1 - push }}>
        <Hud label={GRID_LABEL} n={0} />
      </div>
    </AbsoluteFill>
  );
};

// The closing line: big, on the dark left third of the black-hole shot, each character rising in from the beat.
const Line: React.FC<{ zh: string; en: string; frames: number }> = ({ zh, en, frames }) => {
  const f = useCurrentFrame();
  const out = interpolate(f, [frames - 6, frames], [1, 0], CL);
  const chars = Array.from(zh);
  return (
    <div style={{ position: "absolute", left: 132, top: 430, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 18, opacity: out }}>
      <div style={{ display: "flex", fontFamily: FONT, fontWeight: 900, fontSize: 76, letterSpacing: 6, color: K.fg, textShadow: "0 2px 30px rgba(0,0,0,0.7)" }}>
        {chars.map((c, i) => {
          const p = interpolate(f, [i * 1.4, i * 1.4 + 8], [0, 1], { ...CL, easing: EO });
          return (
            <span key={i} style={{ display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * 24}px)`, whiteSpace: "pre" }}>
              {c}
            </span>
          );
        })}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 17, letterSpacing: 6, color: K.fg, opacity: 0.6 * interpolate(f, [8, 18], [0, 1], CL) }}>{en}</div>
    </div>
  );
};

// Brand card: the trailer's title flips into 世界的形状 while the orb lands on the audio logo, then the slogan,
// the address and the signature.
const FROM = Array.from("可以玩的世界");
const TO = Array.from("世界的形状");
const SIZE = 120;
const Card: React.FC = () => {
  const f = useCurrentFrame();
  const at = (beat: number, len = 10, e = EO) => interpolate(f, [b2f(beat), b2f(beat) + len], [0, 1], { ...CL, easing: e });
  const dark = at(0, 12, EIO);
  const mark = at(0, 18, EBACK);
  const halo = at(0.5, 24);
  const slogan = at(4, 12);
  const url = at(4.5, 12);
  const sign = at(5, 12);
  const row = (chars: string[], font: string, weight: number, q: (i: number) => number, inward: boolean) => (
    <div style={{ position: "absolute", left: 0, right: 0, top: 450, display: "flex", justifyContent: "center", gap: 4, perspective: 1400 }}>
      {chars.map((ch, i) => {
        const p = q(i);
        const ang = inward ? (1 - p) * 90 : -p * 90;
        const vis = inward ? p > 0 : p < 1;
        return (
          <div key={i} style={{ width: SIZE * 1.02, height: SIZE * 1.25, display: "flex", alignItems: "center", justifyContent: "center", transform: `rotateX(${ang}deg)`, opacity: vis ? 1 : 0 }}>
            <span style={{ fontFamily: font, fontWeight: weight, fontSize: SIZE, color: K.fg, lineHeight: 1 }}>{ch}</span>
          </div>
        );
      })}
    </div>
  );
  const fromIn = at(0, 8);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "#05070a", opacity: 0.84 * dark }} />
      <div style={{ position: "absolute", left: 960 - 100, top: 190, width: 200, height: 200 }}>
        <div style={{ position: "absolute", inset: -80, borderRadius: "50%", background: `radial-gradient(circle, rgba(255,209,102,${0.2 * halo}) 0%, rgba(140,196,212,${0.07 * halo}) 45%, transparent 70%)` }} />
        <Img src={staticFile("mark-disc.png")} style={{ width: 200, height: 200, opacity: Math.min(1, mark * 1.5), transform: `translateY(${(1 - mark) * -50}px) scale(${0.7 + 0.3 * mark})` }} />
      </div>
      <div style={{ opacity: fromIn }}>{row(FROM, FONT, 900, (i) => at(2 + i * 0.16, 9, EIO), false)}</div>
      {row(TO, SERIF, 700, (i) => at(2.6 + i * 0.2, 10, EIO), true)}
      <div style={{ position: "absolute", left: 0, right: 0, top: 650, display: "flex", justifyContent: "center", opacity: slogan, transform: `translateY(${(1 - slogan) * 16}px)` }}>
        <div style={{ fontFamily: SERIF, fontSize: 46, fontWeight: 600, color: K.sub, letterSpacing: 10, whiteSpace: "nowrap" }}>看见世界如何运行</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 740, display: "flex", justifyContent: "center", opacity: url, transform: `translateY(${(1 - url) * 12}px)` }}>
        <div style={{ fontFamily: MONO, fontSize: 30, color: K.gold, letterSpacing: 4, whiteSpace: "nowrap" }}>shapeof.world</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 84, display: "flex", justifyContent: "center", opacity: sign }}>
        <div style={{ fontFamily: FONT, fontSize: 26, fontWeight: 700, color: K.muted, letterSpacing: 4, whiteSpace: "nowrap" }}>MakerJackie</div>
      </div>
    </AbsoluteFill>
  );
};

// Brand corner (DIRECTOR.md hard rule 1): orb + 世界的形状, top left, from frame 0 until the brand card.
const Corner: React.FC = () => {
  const f = useCurrentFrame();
  const o = 0.6 * interpolate(f, [b2f(CARD_AT) - 8, b2f(CARD_AT)], [1, 0], CL);
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 56, top: 50, display: "flex", alignItems: "center", gap: 12, opacity: o }}>
      <Img src={staticFile("mark-disc.png")} style={{ width: 38, height: 38 }} />
      <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 24, color: K.fg, letterSpacing: 2, textShadow: "0 1px 10px rgba(0,0,0,0.6)" }}>世界的形状</span>
    </div>
  );
};

export const Grain: React.FC<{ o?: number }> = ({ o = 0.06 }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `url(${staticFile("grain.svg")})`,
        backgroundSize: "256px 256px",
        backgroundPosition: `${Math.floor(random(`gx${f}`) * 256)}px ${Math.floor(random(`gy${f}`) * 256)}px`,
        opacity: o,
        mixBlendMode: "overlay",
        pointerEvents: "none",
      }}
    />
  );
};
export const Vignette: React.FC = () => <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 58%, rgba(0,0,0,0.5) 100%)", pointerEvents: "none" }} />;

export const Shots: React.FC<{ shots: Shot[]; labels?: boolean }> = ({ shots, labels = true }) => {
  let n = 0;
  return (
    <>
      {shots.map((s, i) => {
        const from = b2f(s.at);
        const frames = b2f(s.at + s.len) - from;
        const num = s.label ? ++n : 0;
        return (
          <Sequence key={i} from={from} durationInFrames={frames} premountFor={20}>
            <ShotView s={s} from={from} frames={frames} />
            {labels && s.label ? <Hud label={s.label} n={num} /> : null}
          </Sequence>
        );
      })}
    </>
  );
};

export const Film: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <Audio src={staticFile("score.wav")} volume={(f) => interpolate(f, [FILM_FRAMES - 15, FILM_FRAMES - 1], [1, 0], CL)} />
      <Shots shots={SHOTS} />
      <Sequence from={b2f(GRID_AT)} durationInFrames={b2f(4)} premountFor={20}>
        <Grid />
      </Sequence>
      {LINES.map((l, i) => (
        <Sequence key={i} from={b2f(l.at)} durationInFrames={b2f(l.until) - b2f(l.at)}>
          <Line zh={l.zh} en={l.en} frames={b2f(l.until) - b2f(l.at)} />
        </Sequence>
      ))}
      <Sequence from={b2f(CARD_AT)}>
        <Card />
      </Sequence>
      <Corner />
      <Vignette />
      <Grain />
      <AbsoluteFill style={{ background: "#000", opacity: interpolate(frame, [FILM_FRAMES - 12, FILM_FRAMES - 1], [0, 1], CL), pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};
