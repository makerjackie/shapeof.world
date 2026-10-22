// Beat grid of the soundtrack (千年之后（氛围版）, 和乐府, 3:01), measured for films/ai-real-cost with tools/beats.py:
// steady 111.62 BPM, first beat 0.487 s, phase drift within ±10 ms over the whole track. One bar ≈ 2.15 s.
export const FPS = 30;
export const BPM = 111.62;
export const BEAT_S = 60 / BPM;
export const FIRST_BEAT_S = 0.487;
export const MUSIC_S = 181.91;
export const FPB = BEAT_S * FPS;

export const beatToFrame = (beat: number) => Math.round((FIRST_BEAT_S + beat * BEAT_S) * FPS);
export const barToFrame = (bar: number) => beatToFrame(bar * 4);

// The film skips whole bars of the track, only at bar lines and in multiples of the 8-bar chord cycle, so the tempo
// and phrasing never break. From film bar `at` on, film bar b plays track bar b + skip. Track sections: intro 0–8,
// main 8–40, interlude 40–48, main 48–64, climax 64–76, fade 76–84.
// 32 → 40 enters the interlude (track bar 31 vs 39, chroma similarity 0.999); 56 → 64 enters the climax (55 vs 63,
// 0.997), the same jump films/ai-real-cost makes.
export const MUSIC_EDIT = [
  { at: 0, skip: 0 },
  { at: 32, skip: 8 },
  { at: 48, skip: 16 },
];

const skipFrames = (bars: number) => Math.round(bars * 4 * FPB);

// Track frame heard at a film frame (drives the spectrum bars and background pulse).
export const musicFrame = (frame: number) => {
  let skip = MUSIC_EDIT[0].skip;
  for (const e of MUSIC_EDIT) if (frame >= barToFrame(e.at)) skip = e.skip;
  return frame + skipFrames(skip);
};

// Audio segments: [film from, film to) played from track frame `from + offset`.
export const MUSIC_SEGMENTS = MUSIC_EDIT.map((e, i) => ({
  from: i === 0 ? 0 : barToFrame(e.at),
  to: i < MUSIC_EDIT.length - 1 ? barToFrame(MUSIC_EDIT[i + 1].at) : Infinity,
  offset: skipFrames(e.skip),
}));
