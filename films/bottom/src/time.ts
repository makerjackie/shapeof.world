// The film runs on 千年之后（氛围版）(和乐府), 111.62 BPM, one bar ≈ 2.150 s, first beat 0.487 s. Everything is timed in
// STORY bars (sb); tools/music.py lays the track under them, cutting only on downbeats:
// The hook (hook.tsx) is timed in FILM bars, sb 0–5.3. Everything after it is timed in story bars that run SHIFT ahead:
// film time = story time − SHIFT (film.tsx plays ch1–ch45 in a Sequence that starts at −SHIFT). The table is story bars;
// the score starts at track bar 12 (≈ bar 8, the main theme's entry), so story sb 0–4 / track 8–12 are never heard.
//   sb   0–28  track  8–36  main        hook; 1 贵不贵 (a home = how many years of rent)
//   sb  28–56  track 12–40  main again  1 (cont.); 2 为什么涨; 3 为什么跌 (36 → 12: same bar, no audible seam)
//   sb  56–64  track 40–48  interlude   4 房子够不够
//   sb  64–80  track 48–64  main        4 (cont.); 5 到底了吗: history, the four signs
//   sb  80–88  track 56–64  main again  5: Japan
//   sb  88–96  track 64–72  climax      the answer; from a piggy bank back to a home
//   sb  96–103 track 77–84  outro       your city; sources; end card (bars 72–76 cut)
export const FPS = 30;
export const BPM = 111.62;
export const BEAT = 60 / BPM;
export const BAR = 4 * BEAT;
export const S = (sb: number) => sb * BAR;
export const fr = (s: number) => Math.round(s * FPS);

export const SHIFT = 4 * (240 / 111.62); // story − film, seconds (4 bars)
export const END_SB = 103 - 4; // film bars
export const FILM_S = S(END_SB) + 0.3;
export const FILM_FRAMES = Math.ceil(FILM_S * FPS);
