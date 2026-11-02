// One clock for picture and score: 130 BPM, 4/4. Everything is placed in bars (film seconds = bar * BAR).
export const FPS = 30;
export const BPM = 130;
export const BEAT = 60 / BPM;
export const BAR = 4 * BEAT;
export const FILM_BARS = 104;
export const FILM_SEC = FILM_BARS * BAR;
export const FILM_FRAMES = Math.round(FILM_SEC * FPS);
export const W = 1080;
export const H = 1920;
// seconds -> bars and back
export const toBar = (sec: number) => sec / BAR;
export const sec = (bar: number) => bar * BAR;
