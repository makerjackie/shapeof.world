// The film runs on 千年之后（氛围版）(和乐府), 111.62 BPM, one bar ≈ 2.150 s, first beat 0.487 s. Everything is timed in
// STORY bars (sb); tools/music.py lays the track under them, cutting only on downbeats:
//   sb   0–32  track  8–40  main        hook; 1 贵不贵 (a home = how many years of rent)
//   sb  32–56  track 16–40  main again  2 为什么涨; 3 为什么跌
//   sb  56–64  track 40–48  interlude   4 房子够不够
//   sb  64–80  track 48–64  main        4 (cont.); 5 到底了吗: history, the four signs
//   sb  80–88  track 56–64  main again  5: Japan
//   sb  88–102 track 64–78  climax      the answer; from a piggy bank back to a home; your city
//   sb 102–108 track 78–84  outro       sources; end card
export const FPS = 30;
export const BPM = 111.62;
export const BEAT = 60 / BPM;
export const BAR = 4 * BEAT;
export const S = (sb: number) => sb * BAR;
export const fr = (s: number) => Math.round(s * FPS);

export const END_SB = 108;
export const FILM_S = S(END_SB) + 0.3;
export const FILM_FRAMES = Math.ceil(FILM_S * FPS);
