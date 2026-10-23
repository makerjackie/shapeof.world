// Music grid. 《千年之后（氛围版）》 by 和乐府 (3:01), measured with tools/beats.py: steady 111.62 BPM, first beat
// 0.512 s (tools/downbeats.py: every downbeat onset within ±1 frame of this grid). Track sections (energy per bar):
// intro 0–8, main 8–40 (bars 16–40 are one 8-bar cycle three times, chroma similarity 1.000), breakdown 40–48,
// main 48–64, peak 64–77, settling 78–79, fade 80–84.
//
// The film never changes tempo; it only cuts the track on bar lines (MUSIC_EDIT), so one uniform grid runs through
// the whole film: film bar f starts at f × BAR seconds. Film 0 = track bar 4 (the last half of the intro).
//   film 0–28  = track 4–32   (hook, title, subscription, tokens, formula)
//   film 28–52 = track 40–64  (cut 32 → 40: the bar before the cut matches the bar before 40, chroma 0.999;
//                              the breakdown opens the "your time" chapter)
//   film 52–80 = track 56–84  (cut 64 → 56: an 8-bar repeat of the main section, chroma 0.997, so the chapter has room;
//                              film bar 60 = track 64, the peak's re-entry, lands on the bill)
export const FPS = 30;
export const BPM = 111.62;
export const BEAT = 60 / BPM;
export const BAR = 4 * BEAT;
export const TRACK_FIRST = 0.512;
export const TRACK_S = 181.91;

export const FB = (f: number) => f * BAR;

export const MUSIC_EDIT = [
  { at: 0, trackBar: 4 },
  { at: 28, trackBar: 40 },
  { at: 52, trackBar: 56 },
];
// Track second played at film second t.
export const trackTime = (t: number) => {
  let e = MUSIC_EDIT[0];
  for (const m of MUSIC_EDIT) if (t >= FB(m.at)) e = m;
  return TRACK_FIRST + (e.trackBar - e.at) * BAR + t;
};

// Film bars muted to make the two real silences: before the turn into "your time", and before the bill.
export const MUTE = [
  { from: 27, to: 28 },
  { from: 59, to: 60 },
];

// The track fades out by itself (track bar 84.4); the end card holds 1.4 s of silence after it.
export const MUSIC_END = TRACK_S - (TRACK_FIRST + 4 * BAR);
export const FILM_S = MUSIC_END + 1.4;
export const FILM_FRAMES = Math.round(FILM_S * FPS);

export const fr = (s: number) => Math.round(s * FPS);
