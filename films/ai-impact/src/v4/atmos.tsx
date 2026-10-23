import React from "react";
import { AbsoluteFill } from "remotion";
import { bar } from "../v3/timing";
import { clamp01, lerp, rnd, useT } from "./engine";

// The colour of the night, as one timeline for the whole film (PLAN-v4: 色温就是情绪曲线). Shots draw on a transparent
// ground over this sky.

type Sky = { top: string; bot: string; glow: string; g: number; dust: string };
const KEYS: [number, Sky][] = [
  [0, { top: "#07080a", bot: "#0d0b0c", glow: "#ff5a5f", g: 0.1, dust: "#ffffff" }],
  [bar(2), { top: "#060a0e", bot: "#0b141c", glow: "#4dd4ff", g: 0.14, dust: "#bfe6ff" }],
  [bar(4), { top: "#080c16", bot: "#1a2030", glow: "#f0a868", g: 0.14, dust: "#ffffff" }],
  [bar(6) + 0.6, { top: "#020203", bot: "#040506", glow: "#4dd4ff", g: 0.04, dust: "#ffffff" }],
  [bar(9.5), { top: "#03060d", bot: "#071224", glow: "#4dd4ff", g: 0.1, dust: "#bfe6ff" }],
  [bar(19.5), { top: "#040a18", bot: "#0b1d3a", glow: "#4dd4ff", g: 0.16, dust: "#bfe6ff" }],
  [bar(20.2), { top: "#0b0804", bot: "#1d1408", glow: "#ffb347", g: 0.2, dust: "#ffd166" }],
  [bar(35.6), { top: "#0b0804", bot: "#1d1408", glow: "#ffb347", g: 0.2, dust: "#ffd166" }],
  [bar(36.3), { top: "#0f0605", bot: "#260c08", glow: "#ff6a3d", g: 0.2, dust: "#ffb08a" }],
  [bar(45.6), { top: "#0f0605", bot: "#260c08", glow: "#ff6a3d", g: 0.2, dust: "#ffb08a" }],
  [bar(46.4), { top: "#060c13", bot: "#0f1d2c", glow: "#7fc8ff", g: 0.14, dust: "#cfe8ff" }],
  [bar(55.7), { top: "#060c13", bot: "#0f1d2c", glow: "#7fc8ff", g: 0.12, dust: "#cfe8ff" }],
  [bar(56.4), { top: "#020202", bot: "#050505", glow: "#ffffff", g: 0.02, dust: "#ffffff" }],
  [bar(63.9), { top: "#020202", bot: "#060505", glow: "#ffd166", g: 0.04, dust: "#ffffff" }],
  [bar(64.2), { top: "#0d0906", bot: "#21160c", glow: "#ffbf69", g: 0.18, dust: "#ffd9a0" }],
  [bar(79.6), { top: "#0d0906", bot: "#21160c", glow: "#ffbf69", g: 0.18, dust: "#ffd9a0" }],
  [bar(80.4), { top: "#040714", bot: "#101838", glow: "#8fa8ff", g: 0.14, dust: "#dfe6ff" }],
  [bar(88), { top: "#050818", bot: "#121a3a", glow: "#8fa8ff", g: 0.12, dust: "#dfe6ff" }],
  [bar(96), { top: "#141a3f", bot: "#8a5a6e", glow: "#ffb38a", g: 0.24, dust: "#fff1e0" }],
  [bar(100), { top: "#1d2552", bot: "#c9876a", glow: "#ffc59a", g: 0.28, dust: "#fff1e0" }],
  [bar(102), { top: "#07090b", bot: "#0d1014", glow: "#4dd4ff", g: 0.08, dust: "#ffffff" }],
];

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, k: number) => {
  const x = hex(a);
  const y = hex(b);
  return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], k))).join(",")})`;
};

export const skyAt = (t: number): Sky => {
  if (t <= KEYS[0][0]) return KEYS[0][1];
  for (let i = 1; i < KEYS.length; i++) {
    const [t0, a] = KEYS[i - 1];
    const [t1, b] = KEYS[i];
    if (t <= t1) {
      const k = clamp01((t - t0) / (t1 - t0));
      const s = k * k * (3 - 2 * k);
      return { top: mix(a.top, b.top, s), bot: mix(a.bot, b.bot, s), glow: mix(a.glow, b.glow, s), g: lerp(a.g, b.g, s), dust: mix(a.dust, b.dust, s) };
    }
  }
  return KEYS[KEYS.length - 1][1];
};

export const SkyBg: React.FC<{ glowAt?: [number, number] }> = ({ glowAt = [50, 62] }) => {
  const t = useT();
  const s = skyAt(t);
  const g = Math.round(s.g * 255)
    .toString(16)
    .padStart(2, "0");
  const glowHex = s.glow.startsWith("rgb") ? s.glow.replace("rgb(", "rgba(").replace(")", `,${s.g})`) : `${s.glow}${g}`;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${s.top} 0%, ${s.bot} 100%)` }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 60% at ${glowAt[0]}% ${glowAt[1]}%, ${glowHex} 0%, transparent 70%)` }} />
    </AbsoluteFill>
  );
};

// Air: slow dust that drifts upward and twinkles, in screen space, tinted by the sky.
export const Dust: React.FC<{ n?: number; o?: number; seed?: string; speed?: number }> = ({ n = 70, o = 1, seed = "d", speed = 1 }) => {
  const t = useT();
  const s = skyAt(t);
  if (o <= 0) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: n }).map((_, i) => {
        const x0 = rnd(`${seed}x${i}`) * 1920;
        const y0 = rnd(`${seed}y${i}`) * 1080;
        const v = (8 + rnd(`${seed}v${i}`) * 26) * speed;
        const r = 1 + rnd(`${seed}r${i}`) * 2.6;
        const y = (((y0 - t * v) % 1140) + 1140) % 1140 - 30;
        const x = x0 + Math.sin(t * 0.4 + i) * 18;
        const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * (1 + rnd(`${seed}w${i}`) * 2) + i * 1.7));
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: r * 2, height: r * 2, borderRadius: "50%", background: s.dust, opacity: 0.22 * tw * o, boxShadow: r > 2.6 ? `0 0 ${r * 4}px ${s.dust}` : undefined }} />;
      })}
    </AbsoluteFill>
  );
};
