import { noise2D } from "@remotion/noise";
import React from "react";
import { AbsoluteFill, interpolateColors, random, staticFile, useCurrentFrame } from "remotion";
import audio from "./audio.json";
import { K } from "./theme";
import { musicFrame } from "./timing";

const spectrum = audio.spectrum as number[][];
const bassEnv = audio.bass as number[];

// Indexed by film frame; the soundtrack is cut, so look up the track frame actually playing.
const at = (frame: number) => Math.min(spectrum.length - 1, Math.max(0, musicFrame(frame)));
export const bassAt = (frame: number) => (bassEnv[at(frame)] ?? 0) / 99;
export const bandsAt = (frame: number) => spectrum[at(frame)] ?? [];

export type Palette = [string, string, string];
export type PaletteKey = { at: number; pal: Palette };

// Crossfades scene palettes over 16 frames around each scene start.
const paletteAt = (frame: number, keys: PaletteKey[]): Palette => {
  let i = 0;
  while (i + 1 < keys.length && frame >= keys[i + 1].at - 8) i++;
  const cur = keys[i];
  const prev = keys[i - 1];
  if (!prev || frame >= cur.at + 8) return cur.pal;
  return [0, 1, 2].map((k) => interpolateColors(frame, [cur.at - 8, cur.at + 8], [prev.pal[k], cur.pal[k]])) as Palette;
};

export const Backdrop: React.FC<{ keys: PaletteKey[] }> = ({ keys }) => {
  const frame = useCurrentFrame();
  const pal = paletteAt(frame, keys);
  const bass = bassAt(frame);
  const t = frame * 0.0022;
  const blobs = pal.map((c, i) => {
    const x = 50 + noise2D(`bx${i}`, t, i) * 38;
    const y = 50 + noise2D(`by${i}`, t, i * 3) * 30;
    const r = 34 + i * 6;
    return `radial-gradient(circle at ${x}% ${y}%, ${c}${i === 0 ? "55" : "3a"} 0%, transparent ${r}%)`;
  });
  return (
    <AbsoluteFill style={{ background: K.bg }}>
      <AbsoluteFill style={{ background: blobs.join(","), opacity: 0.6 + bass * 0.4 }} />
      <AbsoluteFill style={{ overflow: "hidden", perspective: 900 }}>
        <div
          style={{
            position: "absolute",
            left: -1200,
            right: -1200,
            bottom: -260,
            height: 900,
            transform: "rotateX(72deg)",
            transformOrigin: "50% 100%",
            backgroundImage: "linear-gradient(rgba(255,255,255,0.10) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(255,255,255,0.10) 1.5px, transparent 1.5px)",
            backgroundSize: "120px 120px",
            backgroundPosition: `0 ${(frame * 0.5) % 120}px`,
            maskImage: "linear-gradient(to top, black 0%, transparent 85%)",
            WebkitMaskImage: "linear-gradient(to top, black 0%, transparent 85%)",
            opacity: 0.3,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `url(${staticFile("grain.svg")})`,
        backgroundSize: "256px 256px",
        backgroundPosition: `${Math.floor(random(`gx${frame}`) * 256)}px ${Math.floor(random(`gy${frame}`) * 256)}px`,
        opacity: 0.07,
        pointerEvents: "none",
      }}
    />
  );
};

export const Vignette: React.FC = () => (
  <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 48%, transparent 52%, rgba(0,0,0,0.72) 100%)", pointerEvents: "none" }} />
);

// Thin mirrored spectrum along the bottom edge, driven by the real soundtrack.
export const Spectrum: React.FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame();
  const bands = bandsAt(frame);
  if (!bands.length) return null;
  const vals = [...bands.slice().reverse(), ...bands];
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 14, height: 40, display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 5, pointerEvents: "none" }}>
      {vals.map((v, i) => (
        <div key={i} style={{ width: 5, height: 3 + (v / 99) ** 1.6 * 34, background: color, opacity: 0.55, borderRadius: 3 }} />
      ))}
    </div>
  );
};
