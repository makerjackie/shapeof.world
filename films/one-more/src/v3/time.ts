// v3 runs on one track, 千年之后（氛围版）(和乐府): 111.62 BPM, first beat 0.487 s, one bar ≈ 2.150 s, phase drift within
// ±10 ms (measured for films/ai-real-cost with tools/beats.py). Track sections: intro 0–8, main 8–40, interlude 40–48,
// main 48–64, climax 64–76, fade 76–84.
// The film starts at track bar 4, so film 0 = track time 4 bars and the main section enters at film bar 4 (≈ 9.1 s).
// One bar of silence is inserted before track bar 28: the fall through the button (tools/music3.py builds the file).
// Everything is timed in TRACK bars through T(), so picture changes land on the music.
export const FPS = 30;
export const BPM = 111.62;
export const BEAT = 60 / BPM;
export const BAR = 4 * BEAT;
export const FIRST = 0.487;
export const START_BAR = 4;
export const BREAK_AT = 28;
export const BREAK_BARS = 1;
export const END_BAR = 80; // the film ends on the track's fade

// Film seconds at a track bar (fractions allowed).
export const T = (tb: number) => FIRST + (tb - START_BAR) * BAR + (tb >= BREAK_AT ? BREAK_BARS * BAR : 0);
// Film seconds at a beat counted from film bar 0 (track bar 4).
export const beat = (n: number) => FIRST + n * BEAT;

export const FILM_S = T(END_BAR) + 0.4;
export const FILM_FRAMES = Math.ceil(FILM_S * FPS);
export const fr = (s: number) => Math.round(s * FPS);
