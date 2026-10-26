// Three soundtrack sections, one per chapter, each on its own measured beat grid (tools/music.sh builds
// public/score.wav to exactly this layout). Everything in the film is timed in section bars, so picture changes
// land on the music.
//   A 游戏里    scene-game-synthwave-rest  113.99 BPM, first beat 0.033 s, film 0 = track 0, bars 0–28
//   silence    1.0 s, the camera falls through the centre
//   B 脑子里    scene-game-ambient-rest    72.01 BPM, first beat 0.000 s, bars 0–17
//   C 不只是游戏 scene-soul-90              ~100.36 BPM, first beat 0.103 s, bars 0–25, fades out at the end
export const FPS = 30;

const bar = (bpm: number) => (4 * 60) / bpm;

export const A = { start: 0, first: 0.033, bar: bar(113.99), bars: 28 };
export const SILENCE = 1.0;
export const A_END = A.start + A.first + A.bars * A.bar;
export const B = { start: A_END + SILENCE, first: 0, bar: bar(72.01), bars: 17 };
export const B_END = B.start + B.first + B.bars * B.bar;
export const C = { start: B_END, first: 0.103, bar: bar(100.36), bars: 25 };
export const C_END = C.start + C.first + C.bars * C.bar;

export const FILM_S = C_END + 0.25;
export const FILM_FRAMES = Math.ceil(FILM_S * FPS);

// Film seconds at a section bar.
export const sA = (b: number) => A.start + A.first + b * A.bar;
export const sB = (b: number) => B.start + B.first + b * B.bar;
export const sC = (b: number) => C.start + C.first + b * C.bar;
export const fr = (s: number) => Math.round(s * FPS);
