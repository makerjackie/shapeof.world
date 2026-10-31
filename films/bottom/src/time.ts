// The film runs on 千年之后（氛围版）(和乐府), 111.62 BPM, one bar ≈ 2.150 s, first beat 0.487 s, uncut from track bar 8.
// Everything is timed in STORY bars (sb); story bar sb = track bar sb + 8:
//   sb  0–32  main          the fall, the forecasts, history, the world, the four signs
//   sb 32–40  interlude     how many of the four signs China shows
//   sb 40–56  main          why buyers stay away: rent vs interest, city by city, loans
//   sb 56–70  climax        the loop; the answer; Japan
//   sb 70–76  outro         your city; sources; end card
export const FPS = 30;
export const BPM = 111.62;
export const BEAT = 60 / BPM;
export const BAR = 4 * BEAT;
export const S = (sb: number) => sb * BAR;
export const fr = (s: number) => Math.round(s * FPS);

export const END_SB = 76.2;
export const FILM_S = S(END_SB);
export const FILM_FRAMES = Math.ceil(FILM_S * FPS);
