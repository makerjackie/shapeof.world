// The film runs on 千年之后（氛围版）(和乐府), 111.62 BPM, one bar ≈ 2.150 s, first beat 0.487 s. Everything is timed in
// STORY bars (sb) that run evenly through the film; tools/music.py lays the track under them, cutting only on bar lines:
//   sb  0–32  track bars  8–40  (main)        the fall, the forecasts, history, the order a bottom comes in
//   sb 32–40  track bars 40–48  (interlude)   where China is on that order
//   sb 40–41  silence                         "还有一样东西没回来"
//   sb 41–63  track bars 56–78  (main → climax at sb 49)   borrowing, rent vs interest, hopes, the answer, Japan
//   sb 63–69  track bars 78–84  (outro)       your city; sources; end card
export const FPS = 30;
export const BPM = 111.62;
export const BEAT = 60 / BPM;
export const BAR = 4 * BEAT;
export const S = (sb: number) => sb * BAR;
export const fr = (s: number) => Math.round(s * FPS);

export const END_SB = 69.4;
export const FILM_S = S(END_SB);
export const FILM_FRAMES = Math.ceil(FILM_S * FPS);
