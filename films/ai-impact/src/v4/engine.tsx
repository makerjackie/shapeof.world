import React from "react";
import { AbsoluteFill, Easing, random, staticFile, useCurrentFrame } from "remotion";
import { FPS } from "../v3/timing";

// v4 engine (PLAN-v4.md): film time in seconds, a camera that moves through a world, planes at different depths for
// parallax, and automatic directional blur when the camera moves fast. Shots are positioned in world units; one
// world unit is one pixel at zoom 1.

export const useT = () => useCurrentFrame() / FPS;
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const E = {
  out: Easing.bezier(0.16, 1, 0.3, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  in: Easing.bezier(0.55, 0, 0.9, 0.4),
  back: Easing.bezier(0.34, 1.56, 0.64, 1),
  expo: Easing.bezier(0.87, 0, 0.13, 1),
  lin: (x: number) => x,
};
// progress 0 → 1 over [a, a + d], eased
export const pr = (t: number, a: number, d: number, e: (x: number) => number = E.out) => (d <= 0 ? (t >= a ? 1 : 0) : e(clamp01((t - a) / d)));
// damped spring 0 → 1 that overshoots once and settles; for things that land
export const spring = (t: number, a: number, hz = 2.4, damp = 6.5) => {
  if (t <= a) return 0;
  const s = t - a;
  return 1 - Math.exp(-damp * s) * Math.cos(hz * 2 * Math.PI * s);
};
// a quick bump 0 → 1 → 0 around time a (impacts, flashes)
export const bump = (t: number, a: number, up = 0.04, down = 0.35) => (t < a - up ? 0 : t < a ? (t - (a - up)) / up : Math.max(0, 1 - (t - a) / down));
export const rnd = (k: string) => random(k);

// ── camera ──
export type Cam = { x: number; y: number; z: number; r: number };
export type Key = [number, Partial<Cam>, ((x: number) => number)?];

// Keys are [time, fields, easing into this key]. Missing fields carry over. Zoom is interpolated in log space so a
// pull-back feels even all the way.
export const camAt = (t: number, keys: Key[]): Cam => {
  const full: [number, Cam, (x: number) => number][] = [];
  let cur: Cam = { x: 0, y: 0, z: 1, r: 0 };
  for (const [kt, f, e] of keys) {
    cur = { ...cur, ...f };
    full.push([kt, cur, e ?? E.inOut]);
  }
  if (t <= full[0][0]) return full[0][1];
  for (let i = 1; i < full.length; i++) {
    const [t0, c0] = full[i - 1];
    const [t1, c1, e] = full[i];
    if (t <= t1) {
      const k = e(clamp01((t - t0) / Math.max(1e-6, t1 - t0)));
      return {
        x: lerp(c0.x, c1.x, k),
        y: lerp(c0.y, c1.y, k),
        z: Math.exp(lerp(Math.log(c0.z), Math.log(c1.z), k)),
        r: lerp(c0.r, c1.r, k),
      };
    }
  }
  return full[full.length - 1][1];
};

type Ctx = { cam: Cam; t: number };
const CamCtx = React.createContext<Ctx>({ cam: { x: 0, y: 0, z: 1, r: 0 }, t: 0 });
export const useCam = () => React.useContext(CamCtx);

// A shot's stage: the camera for everything inside, plus directional blur from the camera's screen speed. `drift` is a
// slow zoom (per second) on top of the keys, so a held shot never sits still.
const drifted = (t: number, keys: Key[], drift: number): Cam => {
  const c = camAt(t, keys);
  return { ...c, z: c.z * Math.exp(drift * Math.max(0, t - keys[0][0])) };
};
export const Stage: React.FC<{ keys: Key[]; children: React.ReactNode; blur?: number; shake?: number; drift?: number }> = ({ keys, children, blur = 0.2, shake = 0, drift = 0.02 }) => {
  const t = useT();
  const cam = drifted(t, keys, drift);
  const prev = drifted(t - 1 / FPS, keys, drift);
  const vx = Math.abs(cam.x - prev.x) * cam.z;
  const vy = Math.abs(cam.y - prev.y) * cam.z;
  const vz = Math.abs(Math.log(cam.z) - Math.log(prev.z)) * 900;
  const bx = Math.min(28, Math.max(0, vx - 14) * blur);
  const by = Math.min(28, Math.max(0, vy - 14) * blur);
  const bz = Math.min(5, Math.max(0, vz - 20) * 0.06);
  const id = `mb${Math.round(t * FPS)}`;
  const sh = shake > 0 ? { x: (rnd(`sx${Math.round(t * FPS)}`) - 0.5) * shake, y: (rnd(`sy${Math.round(t * FPS)}`) - 0.5) * shake } : { x: 0, y: 0 };
  const c = { ...cam, x: cam.x + sh.x / cam.z, y: cam.y + sh.y / cam.z };
  const dir = bx > 0.5 || by > 0.5;
  return (
    <CamCtx.Provider value={{ cam: c, t }}>
      {dir ? (
        <svg width={0} height={0} style={{ position: "absolute" }}>
          <filter id={id} x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation={`${bx} ${by}`} />
          </filter>
        </svg>
      ) : null}
      <AbsoluteFill style={{ filter: dir ? `url(#${id})` : bz > 0.3 ? `blur(${bz}px)` : undefined }}>{children}</AbsoluteFill>
    </CamCtx.Provider>
  );
};

// A plane at depth d: d = 1 is the main plane; d < 1 is further away (moves and zooms less), d > 1 is nearer.
export const Plane: React.FC<{ d?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ d = 1, children, style }) => {
  const { cam } = useCam();
  const z = Math.pow(cam.z, d);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        transformOrigin: "0 0",
        transform: `translate(960px, 540px) rotate(${cam.r}deg) scale(${z}) translate(${-cam.x * d}px, ${-cam.y * d}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// World-positioned box (left/top in world units).
export const At: React.FC<{ x: number; y: number; children: React.ReactNode; o?: number; s?: number; r?: number; anchor?: "tl" | "c" | "b"; style?: React.CSSProperties }> = ({
  x,
  y,
  children,
  o = 1,
  s = 1,
  r = 0,
  anchor = "tl",
  style,
}) =>
  o <= 0 ? null : (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        opacity: o,
        transform: `${anchor === "c" ? "translate(-50%, -50%) " : anchor === "b" ? "translate(-50%, -100%) " : ""}rotate(${r}deg) scale(${s})`,
        transformOrigin: anchor === "tl" ? "0 0" : anchor === "b" ? "50% 100%" : "50% 50%",
        ...style,
      }}
    >
      {children}
    </div>
  );

// A clip: children only exist between a and b (film seconds).
export const Clip: React.FC<{ a: number; b: number; children: React.ReactNode }> = ({ a, b, children }) => {
  const t = useT();
  return t >= a && t < b ? <>{children}</> : null;
};

// ── finishing: film grain and vignette over everything ──
export const Finish: React.FC<{ vignette?: number }> = ({ vignette = 0.75 }) => {
  const f = useCurrentFrame();
  return (
    <>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 75% 70% at 50% 48%, transparent 55%, rgba(0,0,0,${vignette}) 100%)`, pointerEvents: "none" }} />
      <AbsoluteFill
        style={{
          backgroundImage: `url(${staticFile("grain.svg")})`,
          backgroundSize: "512px 512px",
          backgroundPosition: `${(f * 137) % 512}px ${(f * 71) % 512}px`,
          opacity: 0.07,
          mixBlendMode: "overlay",
          pointerEvents: "none",
        }}
      />
    </>
  );
};
