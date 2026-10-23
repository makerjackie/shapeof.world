// v3 · the beat grid of 《千年之后（氛围版）》 (和乐府, 3:01): 111.62 BPM, first beat 0.487 s, F major. Film time is in
// seconds; a film bar b starts at bar(b). The track is cut only on bar lines (SCRIPT.md, 配乐和小节):
// film 0–40 = track 0–40; film 40–80 = track 24–64 (16 bars repeated); film 80–108 = track 56–84 (8 more repeated).
// Both seams were checked by bar chroma: track bars 39/23 0.999, 63/55 0.997, same RMS.

export const FPS = 30;
export const BPM = 111.62;
export const BEAT = 60 / BPM;
export const FIRST = 0.487;
export const BAR = 4 * BEAT;
export const TRACK_S = 181.905;

export const bar = (b: number) => FIRST + b * BAR;
export const beat = (n: number) => FIRST + n * BEAT;
export const fr = (s: number) => Math.round(s * FPS);

export const MUSIC_EDIT = [
  { at: 0, skip: 0 },
  { at: 40, skip: -16 },
  { at: 80, skip: -24 },
];

// Film seconds at which the track runs out.
export const END = bar(80) + (TRACK_S - bar(56));
export const FRAMES = fr(END);

// Track seconds heard at film second t.
export const trackAt = (t: number) => {
  let skip = 0;
  for (const e of MUSIC_EDIT) if (t >= bar(e.at)) skip = e.skip;
  return t + skip * BAR;
};
