// Small deterministic helpers shared by every scene. Everything is a pure function of time so any frame can be
// rendered in any order by any Remotion tab.
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const sstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const ease = (t: number) => {
  t = clamp(t);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = (t: number) => Math.pow(clamp(t), 3);
export const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(t)));
// critically-damped-ish spring 0→1 with a small overshoot
export const spring = (t: number, k = 9) => {
  if (t <= 0) return 0;
  return 1 - Math.exp(-k * t) * Math.cos(k * 0.55 * t);
};

export const mulberry = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
export const hash1 = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
export const hash2 = (x: number, y: number) => hash1(x * 17.13 + y * 113.7);

// smooth 1D value noise
export const noise1 = (x: number) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash1(i), hash1(i + 1), u) * 2 - 1;
};
// handheld-style drift: sum of a few noise octaves, deterministic in t
export const drift = (t: number, seed: number, amp = 1) =>
  (noise1(t * 0.37 + seed * 11.1) * 0.6 + noise1(t * 0.91 + seed * 5.3) * 0.3 + noise1(t * 2.3 + seed * 2.7) * 0.1) * amp;

// piecewise keyframes [t, value] with easing between keys
export const keys = (t: number, k: [number, number][], e: (x: number) => number = ease) => {
  if (t <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) {
    if (t <= k[i][0]) return lerp(k[i - 1][1], k[i][1], e((t - k[i - 1][0]) / (k[i][0] - k[i - 1][0])));
  }
  return k[k.length - 1][1];
};
