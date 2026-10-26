// The film runs on 千年之后（氛围版）(和乐府), 111.62 BPM, one bar ≈ 2.150 s, from the downbeat of its main section.
// Everything is timed in STORY bars (sb), which run evenly through the film; tools/music9.py lays the track under them:
//   sb 0–17   track bars 8–25   (main)          the opening and chapter 1
//   ½ bar of silence before the lab
//   sb 17–24  track bars 25–32  (main)          the lab
//   sb 24–32  track bars 40–48  (interlude)     the discovery, the brain   (track 32–39 skipped: bar 31 ≈ bar 39, chroma 0.999)
//   sb 32–48  track bars 48–64  (main)          real near misses, one night, the thumb, knowing vs wanting, everyday gaps
//   sb 48–60  track bars 64–76  (climax)        the coffee card's end, far goals, the return, the last line
//   sb 60–62.5 track bars 76–78.5 (fade)       sources, the end card
export const FPS = 30;
export const BPM = 111.62;
export const BEAT = 60 / BPM;
export const BAR = 4 * BEAT;
export const FIRST = 0.487;
export const START_BAR = 8;
export const BREAK_SB = 17;
export const BREAK_BARS = 0.5;

// Film seconds at a story bar.
export const S = (sb: number) => FIRST + sb * BAR + (sb >= BREAK_SB ? BREAK_BARS * BAR : 0);
// Film seconds at a beat counted from the film's first downbeat (before the break).
export const beat = (n: number) => FIRST + n * BEAT;
// The silence: from the downbeat of story bar 17 (as if there were no break) until S(17).
export const SIL0 = FIRST + BREAK_SB * BAR;
export const fr = (s: number) => Math.round(s * FPS);

export const END_SB = 62.5;
export const TAIL = 0.5;
export const FILM_S = S(END_SB) + TAIL;
export const FILM_FRAMES = Math.ceil(FILM_S * FPS);

// Legacy: track-bar time for the earlier cuts (v4–v8 samples). Track bar tb before the silence = story bar tb − 8.
export const T = (tb: number) => S(tb - START_BAR);
