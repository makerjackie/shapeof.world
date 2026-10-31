// The film runs on 千年之后（氛围版）(和乐府), 111.62 BPM, one bar ≈ 2.150 s, first beat 0.487 s. Everything is timed in
// STORY bars (sb) that run evenly through the film; tools/music.py lays the track under them, cutting only on bar lines:
//   sb  0–32  track bars  8–40  (main)      the fall, the forecasts, the ruler, the skyline, the verdict
//   sb 32–33  silence                       "但是，已经到线的城市，房价还在跌"
//   sb 33–55  track bars 56–78  (main → climax at sb 41)   the far cities rose first; hopes; the country; the answer
//   sb 55–61  track bars 78–84  (outro)     your city; sources; end card
export const FPS = 30;
export const BPM = 111.62;
export const BEAT = 60 / BPM;
export const BAR = 4 * BEAT;
export const S = (sb: number) => sb * BAR;
export const fr = (s: number) => Math.round(s * FPS);

export const END_SB = 61.4;
export const FILM_S = S(END_SB);
export const FILM_FRAMES = Math.ceil(FILM_S * FPS);
