// Beat grid of the soundtrack (千年之后（氛围版）, 3:01). Measured with tools/beats.py:
// steady 111.62 BPM, phase drift within ±10 ms over the whole track.
export const FPS = 30;
export const BPM = 111.62;
export const BEAT_S = 60 / BPM;
export const FIRST_BEAT_S = 0.487;
export const MUSIC_S = 181.91;
export const FPB = BEAT_S * FPS;

export const beatToFrame = (beat: number) => Math.round((FIRST_BEAT_S + beat * BEAT_S) * FPS);
export const barToFrame = (bar: number) => beatToFrame(bar * 4);

// The 2-minute cut skips whole bars of the track. From film bar `at` on, film bar b plays track bar b + skip.
// Both jumps land where the track's 8-bar chord cycle continues (tools/beats.py chroma check: the bar before
// each cut matches the bar that normally precedes its target), so the tempo and phrasing never break:
// 24 → 40 enters the breakdown exactly as the track does, 56 → 64 enters the peak.
export const MUSIC_EDIT = [
  { at: 0, skip: 2 },
  { at: 22, skip: 18 },
  { at: 38, skip: 26 },
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
