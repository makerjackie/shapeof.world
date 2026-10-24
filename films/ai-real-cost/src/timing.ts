// Beat grid of the soundtrack (千年之后（氛围版）, 3:01). Measured with tools/beats.py: steady 111.62 BPM; the first
// downbeat is at 0.512 s (tools/downbeats.py: every downbeat onset within ±1 frame of this grid).
export const FPS = 30;
export const BPM = 111.62;
export const BEAT_S = 60 / BPM;
export const FIRST_BEAT_S = 0.512;
export const MUSIC_S = 181.91;
export const FPB = BEAT_S * FPS;

export const beatToFrame = (beat: number) => Math.round((FIRST_BEAT_S + beat * BEAT_S) * FPS);
export const barToFrame = (bar: number) => beatToFrame(bar * 4);

// The cut skips whole bars of the track. From film bar `at` on, film bar b plays track bar b + skip. Both jumps land
// where the track continues its own phrase (tools/chroma.py: the bar before each cut matches the bar that normally
// precedes its target, 1.000 and 0.999): 16 → 24 drops one turn of the 8-bar loop, so the music still comes back
// from the breakdown (track bar 48) on the "smartest is cheapest" reveal and the peak (64) on "we use ever more";
// 73 → 77, a beat before the end card flips, hands it the track's own settling bars.
export const MUSIC_EDIT = [
  { at: 0, skip: 0 },
  { at: 16, skip: 8 },
  { at: 65, skip: 12 },
];

const skipFrames = (bars: number) => Math.round(bars * 4 * FPB);

// Track frame heard at a film frame (drives the background pulse).
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
