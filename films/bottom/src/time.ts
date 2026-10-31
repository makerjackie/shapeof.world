// The film runs on 千年之后（氛围版）(和乐府), 111.62 BPM, one bar ≈ 2.150 s, first beat 0.487 s. Everything is timed in
// STORY bars (sb) that run evenly through the film; tools/music.py lays the track under them, cutting only on bar lines:
//   sb  0–32  track bars  8–40  (main)        opening, the two camps, the ruler
//   sb 32–48  track bars 16–32  (main again)  the skyline, the subsidy        (bar 39 ≈ bar 15, chroma 0.999)
//   sb 48–56  track bars 40–48  (interlude)   did the cities over the line rise? rents fall too   (bar 31 ≈ 39, 0.999)
//   sb 56–92  track bars 48–84  (main → climax at sb 72 → outro from sb 86)
export const FPS = 30;
export const BPM = 111.62;
export const BEAT = 60 / BPM;
export const BAR = 4 * BEAT;
// Film time 0 is the downbeat of track bar 8, so story bar sb starts at sb × BAR.
export const S = (sb: number) => sb * BAR;
export const fr = (s: number) => Math.round(s * FPS);

export const END_SB = 92;
export const FILM_S = S(END_SB) + 0.3;
export const FILM_FRAMES = Math.ceil(FILM_S * FPS);
