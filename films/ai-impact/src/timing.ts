// Beat grid of the soundtrack (千年之后（氛围版）, 和乐府, 3:01), measured for films/ai-real-cost with tools/beats.py:
// steady 111.62 BPM, phase drift within ±10 ms. Track energy: intro 0–8, main 8–40, breakdown 40–48, main 48–64,
// peak 64–76, settling 76–78, fade 78–84.
export const FPS = 30;
export const BPM = 111.62;
export const BEAT_S = 60 / BPM;
export const FIRST_BEAT_S = 0.487;
export const MUSIC_S = 181.91;
export const FPB = BEAT_S * FPS;

export const beatToFrame = (beat: number) => Math.round((FIRST_BEAT_S + beat * BEAT_S) * FPS);
export const barToFrame = (bar: number) => beatToFrame(bar * 4);

// The film plays the whole track once, plus one extra pass of eight main-section bars. Film bar b plays track bar
// b + skip: from the start, film bar = track bar; at film bar 32 the track jumps from bar 32 back to bar 24. The
// main section repeats every four bars, and the bars on both sides of the jump match (chroma similarity 1.000, same
// RMS), so the tempo and phrasing never break. Film bar 8 = track bar 8 (main section, title), film bar 56 = track
// bar 48 (the music comes back after the breakdown), film bar 72 = track bar 64 (the peak).
export const MUSIC_EDIT = [
  { at: 0, skip: 0 },
  { at: 32, skip: -8 },
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
