// 千年之后（氛围版）: 111.62 BPM, first beat 0.487 s, one bar 2.150 s (measured for films/one-more).
// The sample starts on the downbeat of track bar 8, so film 0 = track 0.487 + 8 bars.
export const FPS = 30;
export const BAR = 240 / 111.62;
export const BEAT = BAR / 4;
export const MUSIC_FROM = 0.487 + 8 * BAR; // seconds into the track
// Film seconds at story bar b (0 = the first downbeat).
export const S = (b: number) => b * BAR;
export const fr = (s: number) => Math.round(s * FPS);
export const SAMPLE_S = S(7.5);
export const SAMPLE_FRAMES = fr(SAMPLE_S);
