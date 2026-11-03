// Scene starts in seconds. Everything (camera, coins, captions, sound) keys off these.
export const FPS = 30;

// Score (tools/music.py): A 信用火花 from film 0 to ~126; B 核心坍缩 from track 15.6 s at film 122.5, so its pause
// (track 82–86 s) is film 188.9–192.9: the question "那些一下子变富的人呢？" sits in the silence and the wave starts
// when the music comes back. C 安静的账本 from track 79.5 s at film 247: its full silence (track 131–132.5 s) is
// film 298.5–300, just before the last line.
export const T = {
  hook: 0,
  c1: 11, // the bill: the restaurant splits the 100
  c2: 52, // every share keeps moving
  c3: 92, // the whole country
  c4: 124, // where it stops
  c5: 156, // the biggest river: the house
  c6: 188.9, // the waves (question in the music's pause)
  wave: 192.9, // the housing river starts on the music's return
  c7: 245, // the world
  c8: 262, // but: owning is also risk
  c9: 280, // ending
  last: 300.1, // last line, after the music's silence
  sources: 306,
  card: 314,
  end: 322,
};

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const ss = (x: number) => {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
};
export const ramp = (t: number, a: number, b: number) => ss((t - a) / (b - a));
// 0 → 1 over [a, a+fi], 1 → 0 over [b-fo, b]
export const win = (t: number, a: number, b: number, fi = 0.6, fo = 0.6) => Math.min(ramp(t, a, a + fi), 1 - ramp(t, b - fo, b));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// time of day: 1 = midday, 0 = night. Day through the explanations, evening over the waves, night for the ending.
export const dayAt = (t: number) => {
  if (t < T.c4) return 1;
  if (t < T.c7) return lerp(1, 0.55, ramp(t, T.c4, T.c7));
  if (t < T.c9) return lerp(0.55, 0.12, ramp(t, T.c7, T.c9));
  return lerp(0.12, 0.0, ramp(t, T.c9, T.c9 + 12));
};
