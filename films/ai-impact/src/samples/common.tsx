import React from "react";
import { AbsoluteFill, Audio, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { FONT, SERIF } from "../theme";

// Shared parts of the three 2D opening samples (films/DIRECTOR.md, films/brand/README.md).
// Music: 《有序运动 · 40》 (scene-minimalism-40, music.shapeof.world, commercial use cleared), measured 120 BPM; on the
// ffmpeg-decoded master the beats fall at 0.08 s + n × 0.5 s and the full band enters at 4.08 s. The samples start the
// track at 2.0 s, so film beats fall at 0.08 + n × 0.5 and the band enters on the bar-1 downbeat, 2.08 s.

export const SFPS = 30;
export const SAMPLE_FRAMES = 252; // 8.4 s: four bars and a short tail
export const MUSIC_START = 2.0;
export const BEAT0 = 0.08;
export const beat = (n: number) => BEAT0 + n * 0.5; // seconds
export const bar = (n: number) => beat(n * 4);
export const fr = (s: number) => Math.round(s * SFPS);

export const P = { paper: "#f1ecdf", ink: "#19231f", gold: "#ffd166", orange: "#d4521c", red: "#e5484d", green: "#2f9e6a", cream: "#f5ecdc", sand: "#eadcc4", walnut: "#7a4b2f" };
export const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const EO = Easing.bezier(0.16, 1, 0.3, 1);
export const EIO = Easing.bezier(0.65, 0, 0.35, 1);
export const EBACK = Easing.bezier(0.34, 1.56, 0.64, 1);

export const useT = () => useCurrentFrame() / SFPS;
// 0 → 1 from second `a` over `d` seconds.
export const pr = (t: number, a: number, d: number, e = EO) => interpolate(t, [a, a + d], [0, 1], { ...CL, easing: e });
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ── Brand corner (hard rule 1): the round ball only, 46 px, + 世界的形状, 80% opacity, 48 px / 38 px from the edges ──
export const Corner: React.FC<{ dark?: boolean }> = ({ dark }) => (
  <div style={{ position: "absolute", left: 48, top: 38, display: "flex", alignItems: "center", gap: 12, opacity: 0.8 }}>
    <Img src={staticFile("brand/mark-disc.png")} style={{ width: 46, height: 46 }} />
    <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 28, letterSpacing: "0.08em", color: dark ? P.paper : P.ink }}>世界的形状</span>
  </div>
);

// ── Sound: one-shot events and the music bed ──
export type Ev = [number, string, number]; // [seconds, file in public/lib, volume]

export const Sounds: React.FC<{ ev: Ev[]; gain?: number }> = ({ ev, gain = 1 }) => (
  <>
    {ev.map(([s, f, v], i) => (
      <Sequence key={i} from={Math.max(0, fr(s))} durationInFrames={SAMPLE_FRAMES}>
        <Audio src={staticFile(`lib/${f}`)} volume={v * gain} />
      </Sequence>
    ))}
  </>
);

export const Music: React.FC<{ gain?: number; duckFrom?: number }> = ({ gain = 0.75 }) => (
  <Audio
    src={staticFile("lib/scene-minimalism-40.mp3")}
    trimBefore={fr(MUSIC_START)}
    volume={(f) => gain * interpolate(f, [SAMPLE_FRAMES - 9, SAMPLE_FRAMES - 1], [1, 0], CL)}
  />
);

// Room tone or machine hum that fades in at `from` (a J-cut when it starts before its picture).
export const Ambience: React.FC<{ file: string; from: number; to?: number; level: number }> = ({ file, from, to = 8.4, level }) => (
  <Sequence from={fr(from)} durationInFrames={SAMPLE_FRAMES}>
    <Audio src={staticFile(`lib/${file}`)} volume={(f) => level * interpolate(f, [0, 18, fr(to - from) - 8, fr(to - from)], [0, 1, 1, 0], CL)} />
  </Sequence>
);

// ── Narrative caption: big paper strip, typed at 14 characters a second, first character on the beat; the keyword gets
// the gold highlighter on the next beat after typing ends. Sounds for the slide and the first key are returned by
// captionEvents(). ──
export const CPS = 14;

export const Caption: React.FC<{ text: string; start: number; end?: number; kw?: string; kwAt?: number; x: number; y: number; size?: number; dark?: boolean }> = ({
  text,
  start,
  end,
  kw,
  kwAt,
  x,
  y,
  size = 84,
}) => {
  const t = useT();
  const slide = pr(t, start - 0.25, 0.25, EO);
  if (slide <= 0) return null;
  const out = end === undefined ? 0 : pr(t, end - 0.3, 0.3, EIO);
  if (out >= 1) return null;
  const chars = Array.from(text);
  const shown = t < start ? 0 : Math.floor((t - start) * CPS) + 1;
  const k0 = kw ? text.indexOf(kw) : -1;
  const k1 = k0 >= 0 ? k0 + Array.from(kw!).length : -1;
  const hl = kwAt === undefined ? 0 : pr(t, kwAt, 0.3, EO);
  const a0 = k0 >= 0 ? k0 : chars.length;
  const a1 = k0 >= 0 ? k1 : chars.length;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        opacity: Math.min(1, slide * 1.5) * (1 - out),
        transform: `translateX(${(1 - slide) * -60}px) translateY(${-out * 12}px)`,
        background: P.paper,
        borderLeft: `10px solid ${P.ink}`,
        padding: `${size * 0.2}px ${size * 0.42}px ${size * 0.24}px ${size * 0.36}px`,
        boxShadow: "0 18px 40px rgba(40,28,10,0.22), 0 2px 0 rgba(0,0,0,0.04)",
        fontFamily: SERIF,
        fontWeight: 700,
        fontSize: size,
        lineHeight: 1.12,
        color: P.ink,
        whiteSpace: "nowrap",
      }}
    >
      {[chars.slice(0, a0), chars.slice(a0, a1), chars.slice(a1)].map((seg, si) => {
        const off = si === 0 ? 0 : si === 1 ? a0 : a1;
        const spans = seg.map((c, j) => (
          <span key={j} style={{ position: "relative", zIndex: 1, color: off + j < shown ? P.ink : "transparent" }}>
            {c}
          </span>
        ));
        if (si !== 1) return <React.Fragment key={si}>{spans}</React.Fragment>;
        return (
          <span key={si} style={{ position: "relative", display: "inline-block" }}>
            <span style={{ position: "absolute", left: -6, bottom: size * 0.05, height: size * 0.44, width: `calc(${hl * 100}% + ${hl * 12}px)`, background: P.gold, borderRadius: 4, zIndex: 0 }} />
            {spans}
          </span>
        );
      })}
    </div>
  );
};

// The brand sounds that go with a caption: card slide as the strip enters, a tap on the first character.
export const captionEvents = (start: number): Ev[] => [
  [start - 0.25, "sfx-foley-02.wav", 0.55],
  [start, "sfx-ui-01.wav", 0.6],
];

// Small source line under the scene (Noto Sans SC 19 px, 60%).
export const Source: React.FC<{ children: React.ReactNode; dark?: boolean; x?: number; y?: number }> = ({ children, dark, x = 96, y = 1030 }) => (
  <div style={{ position: "absolute", left: x, top: y, fontFamily: FONT, fontSize: 19, fontWeight: 500, color: dark ? P.paper : P.ink, opacity: 0.6, whiteSpace: "nowrap" }}>{children}</div>
);

export const Frame: React.FC<{ bg: string; children: React.ReactNode }> = ({ bg, children }) => <AbsoluteFill style={{ background: bg, overflow: "hidden" }}>{children}</AbsoluteFill>;
