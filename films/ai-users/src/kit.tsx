import React, { createContext, useContext } from "react";
import { AbsoluteFill, Audio, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { FONT, K, SANS, SERIF } from "./theme";
import { FPS } from "./timing";

// ---------- Beats ----------

// Each scene runs on its own music grid: `at` is the frame (inside the scene's Sequence) of its beat 0,
// `fpb` the frames per beat of whatever is playing (A 20, B 17.94; the quiet section keeps A's grid).
export const Beat = createContext({ at: 0, fpb: 20 });

export const useBeatCtx = () => useContext(Beat);
export const useLocal = () => useCurrentFrame() - useContext(Beat).at;
export const useBeat = () => {
  const { at, fpb } = useContext(Beat);
  return (useCurrentFrame() - at) / fpb;
};

export const EO = Easing.bezier(0.16, 1, 0.3, 1);
export const EIO = Easing.bezier(0.65, 0, 0.35, 1);
export const EIN = Easing.bezier(0.55, 0, 1, 0.45);
export const EBACK = Easing.bezier(0.34, 1.56, 0.64, 1);
export const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// 0 → 1 between beats `a` and `a + d` of the current scene.
export const useProg = (a: number, d = 1, easing = EO) => {
  const b = useBeat();
  return interpolate(b, [a, a + d], [0, 1], { ...CL, easing });
};
export const progOf = (b: number, a: number, d = 1, easing = EO) => interpolate(b, [a, a + d], [0, 1], { ...CL, easing });

// ---------- Sound ----------

// A sound effect from public/audio (tools/fetch-audio.sh) on beat `at` of the current scene.
export const Sfx: React.FC<{ at: number; id: string; vol?: number; rate?: number }> = ({ at, id, vol = 0.6, rate = 1 }) => {
  const { at: zero, fpb } = useBeatCtx();
  const from = Math.round(zero + at * fpb);
  return (
    <Sequence from={from} durationInFrames={FPS * 3} layout="none">
      <Audio src={staticFile(`audio/${id}.wav`)} volume={vol} playbackRate={rate} />
    </Sequence>
  );
};

// ---------- Narration: a paper slip, typed in (films/brand/README.md 一) ----------

export type Part = string | { t: string; k?: boolean };
const CPS = 14; // characters per second
const FPC = FPS / CPS;

const chars = (line: Part[]) => line.reduce((n, p) => n + Array.from(typeof p === "string" ? p : p.t).length, 0);

// One narration: up to two lines, typed from beat `at` (first character on the beat), keywords brushed with
// brand gold on the next beat after the typing ends, slip leaves on beat `out`.
export const Say: React.FC<{
  at: number;
  out: number;
  lines: Part[][];
  x?: number;
  y?: number;
  size?: number;
  src?: string;
  quiet?: boolean;
}> = ({ at, out, lines, x = 96, y, size = 82, src, quiet = false }) => {
  const frame = useLocal();
  const { fpb } = useBeatCtx();
  const t0 = at * fpb;
  const total = lines.reduce((n, l) => n + chars(l), 0);
  const typedEnd = t0 + total * FPC;
  const hlAt = Math.ceil(typedEnd / fpb) * fpb;
  const hl = interpolate(frame, [hlAt, hlAt + 0.3 * FPS], [0, 1], { ...CL, easing: EIO });
  const slide = interpolate(frame, [t0 - 0.25 * FPS, t0], [0, 1], { ...CL, easing: EO });
  const leave = interpolate(frame, [out * fpb - 0.25 * FPS, out * fpb], [0, 1], { ...CL, easing: EIO });
  if (slide <= 0 || leave >= 1) {
    return quiet ? null : (
      <>
        <Sfx at={at - 0.25 * (FPS / fpb)} id="sfx-foley-02" vol={0.32} />
        <Sfx at={at} id="sfx-ui-01" vol={0.35} />
      </>
    );
  }
  let k = 0;
  // Default: the slip's bottom edge sits about 240 px above the frame's bottom, big enough to be part of the picture.
  const top = y ?? 1080 - 240 - lines.length * size * 1.32 - size * 0.34;
  return (
    <>
      {quiet ? null : (
        <>
          <Sfx at={at - 0.25 * (FPS / fpb)} id="sfx-foley-02" vol={0.32} />
          <Sfx at={at} id="sfx-ui-01" vol={0.35} />
        </>
      )}
      <div
        style={{
          position: "absolute",
          left: x,
          top,
          transform: `translateX(${(1 - slide) * -60 - leave * 30}px)`,
          opacity: Math.min(slide * 1.5, 1) * (1 - leave),
        }}
      >
        <div
          style={{
            display: "inline-block",
            background: K.paper,
            borderLeft: `8px solid ${K.ink}`,
            boxShadow: "0 14px 34px rgba(60,40,15,0.20), 0 2px 6px rgba(60,40,15,0.12)",
            padding: `${size * 0.16}px ${size * 0.38}px ${size * 0.18}px ${size * 0.32}px`,
            fontFamily: SERIF,
            fontWeight: 700,
            fontSize: size,
            lineHeight: 1.32,
            color: K.ink,
            whiteSpace: "nowrap",
          }}
        >
          {lines.map((line, li) => (
            <div key={li}>
              {line.map((p, pi) => {
                const part = typeof p === "string" ? { t: p, k: false } : p;
                const cs = Array.from(part.t);
                const start = k;
                k += cs.length;
                const body = cs.map((c, ci) => {
                  const on = frame >= t0 + (start + ci) * FPC;
                  return (
                    <span key={ci} style={{ opacity: on ? 1 : 0 }}>
                      {c}
                    </span>
                  );
                });
                return part.k ? (
                  <span
                    key={pi}
                    style={{
                      backgroundImage: `linear-gradient(transparent 56%, ${K.gold} 56%, ${K.gold} 94%, transparent 94%)`,
                      backgroundSize: `${hl * 100}% 100%`,
                      backgroundRepeat: "no-repeat",
                    }}
                  >
                    {body}
                  </span>
                ) : (
                  <span key={pi}>{body}</span>
                );
              })}
            </div>
          ))}
        </div>
        {src ? (
          <div style={{ marginTop: 12, fontFamily: SANS, fontSize: 19, fontWeight: 500, color: K.ink, opacity: 0.6 * Math.min(1, (frame - typedEnd) / 10), whiteSpace: "nowrap" }}>{src}</div>
        ) : null}
      </div>
    </>
  );
};

// Seconds a narration needs on screen (films/DIRECTOR.md 四): typing, then 0.6 s + 0.15 s per character.
export const needSeconds = (lines: Part[][]) => {
  const n = lines.reduce((s, l) => s + chars(l), 0);
  return n / CPS + Math.max(1.2, 0.6 + 0.15 * n);
};

// ---------- Brand corner (films/brand/README.md 一) ----------

export const Corner: React.FC<{ chapter?: string; dark?: boolean; o?: number }> = ({ chapter, dark = false, o = 1 }) => {
  const c = dark ? K.paper : K.ink;
  return (
    <div style={{ position: "absolute", left: 48, top: 38, display: "flex", alignItems: "center", gap: 14, opacity: 0.8 * o }}>
      <Img src={staticFile("mark-disc.png")} style={{ width: 46, height: 46 }} />
      <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 28, letterSpacing: "0.08em", color: c }}>世界的形状</span>
      {chapter ? (
        <>
          <span style={{ width: 2, height: 26, background: c, opacity: 0.35, marginLeft: 4 }} />
          <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 22, color: c }}>{chapter}</span>
        </>
      ) : null}
    </div>
  );
};

// ---------- The desk: a warm, lit surface everything sits on ----------

export const Desk: React.FC<{ dim?: number }> = ({ dim = 0 }) => (
  <AbsoluteFill style={{ background: K.desk }}>
    <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 60% at 46% 42%, ${K.deskHi} 0%, ${K.desk} 55%, ${K.deskLo} 100%)` }} />
    <AbsoluteFill style={{ backgroundImage: `url(${staticFile("grain.svg")})`, backgroundSize: "300px 300px", opacity: 0.09, mixBlendMode: "multiply" }} />
    {dim > 0 ? <AbsoluteFill style={{ background: K.night, opacity: dim }} /> : null}
  </AbsoluteFill>
);

// ---------- Camera ----------

export type Key = { b: number; x: number; y: number; s: number; r?: number };

// Moves a 1920 × 1080 world under a fixed frame: (x, y) is the world point at the centre of the screen.
export const Cam: React.FC<{ keys: Key[]; children: React.ReactNode }> = ({ keys, children }) => {
  const b = useBeat();
  let i = 0;
  while (i + 1 < keys.length && b >= keys[i + 1].b) i++;
  const a = keys[i];
  const n = keys[Math.min(i + 1, keys.length - 1)];
  const p = n === a ? 0 : interpolate(b, [a.b, n.b], [0, 1], { ...CL, easing: EIO });
  const x = a.x + (n.x - a.x) * p;
  const y = a.y + (n.y - a.y) * p;
  const s = a.s + (n.s - a.s) * p;
  const r = (a.r ?? 0) + ((n.r ?? 0) - (a.r ?? 0)) * p;
  return (
    <AbsoluteFill style={{ transformOrigin: "0 0", transform: `translate(960px, 540px) scale(${s}) rotate(${r}deg) translate(${-x}px, ${-y}px)` }}>
      {children}
    </AbsoluteFill>
  );
};

// ---------- Numbers ----------

export const fmt = (v: number, d = 0) => v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export const Src: React.FC<{ children: React.ReactNode; x?: number; y?: number; o?: number }> = ({ children, x = 96, y = 1028, o = 1 }) => (
  <div style={{ position: "absolute", left: x, top: y, fontFamily: SANS, fontSize: 19, fontWeight: 500, color: K.ink, opacity: 0.6 * o, whiteSpace: "nowrap" }}>{children}</div>
);

export { FONT };
