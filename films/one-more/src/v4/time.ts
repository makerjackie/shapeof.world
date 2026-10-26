// The film runs on 千年之后（氛围版）(和乐府) from the downbeat of its main section: film 0 = track time 8 bars, so the
// first beat of track bar 8 lands at film 0.487 s and the film opens on the full band. 111.62 BPM, one bar ≈ 2.150 s.
// Track sections: main 8–40, interlude 40–48, main 48–64, climax 64–76, fade 76–84 (the track ends at 181.9 s).
// One bar of silence is inserted before track bar 30, the step into the lab (tools/music8.py builds the file).
export const FPS = 30;
export const BPM = 111.62;
export const BEAT = 60 / BPM;
export const BAR = 4 * BEAT;
export const FIRST = 0.487;
export const START_BAR = 8;
export const BREAK_AT = 30;
export const BREAK_BARS = 1;
export const TRACK_END = 181.9;

// Film seconds at a track bar, and at a beat counted from the film's first downbeat (track bar 8; before the break).
export const T = (tb: number) => FIRST + (tb - START_BAR) * BAR + (tb >= BREAK_AT ? BREAK_BARS * BAR : 0);
export const beat = (n: number) => FIRST + n * BEAT;
export const fr = (s: number) => Math.round(s * FPS);

export const FILM_S = TRACK_END - START_BAR * BAR + BREAK_BARS * BAR;
export const FILM_FRAMES = Math.ceil(FILM_S * 30);
