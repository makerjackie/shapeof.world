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

// Full film, in story bars (film seconds = S(bar)). tools/music.py lays the score under this:
//   SB 0–60 track 8–32, 28–64 (a 4-bar repeat; the last two beats dip and darken before the reveal) · SB 60–96 track
//   16–32, 28–48 (main returns on the reveal) · SB 96–108 track 60–72 (build, climax on SB.end) · SB 108–112 track 76–80
export const SB = {
  open: 0,
  say: 7.5,
  money: 12,
  bridge: 22,
  bang: 27.5,
  abroad: 38,
  jn: 42,
  reform: 51,
  reveal: 60,
  usa: 69,
  split: 75,
  zoom: 80.5,
  keep: 86,
  climb: 96,
  build: 96,
  end: 100,
  src: 105,
  card: 108,
  total: 112,
};
export const FILM_FRAMES = fr(S(SB.total));
