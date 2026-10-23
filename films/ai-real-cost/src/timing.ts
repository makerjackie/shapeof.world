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
// Film second of film bar `bar` (fractions allowed).
export const barS = (bar: number) => FIRST_BEAT_S + bar * 4 * BEAT_S;

// The cut skips whole bars of the track. From film bar `at` on, film bar b plays track bar b + skip. Both jumps land
// where the track continues its own phrase (tools/chroma.py: the bar before each cut matches the bar that normally
// precedes its target, 0.990 and 0.998): 20 → 40 enters the breakdown, which opens "your time"; 56 → 64 enters the
// peak, which lands on the bill.
export const MUSIC_EDIT = [
  { at: 0, skip: 2 },
  { at: 18, skip: 22 },
  { at: 34, skip: 30 },
];

// Film bars that are muted whole: the two real silences (before "your time" is named, and before the bill).
export const MUTE = [17, 33];

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
