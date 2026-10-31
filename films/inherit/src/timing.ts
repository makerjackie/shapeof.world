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
//   SB 0–32  track 8–40 (main) · SB 32–40 track 40–48 (interlude) · SB 40–48 track 48–56 · SB 48–48.5 silence
//   SB 48.5–72.5 track 16–40 (main returns) · SB 72.5–80.5 track 40–48 (interlude) · SB 80.5–84.5 track 60–64 (build)
//   SB 84.5–92.5 track 64–72 (climax) · SB 92.5–96.5 track 76–80, fading out
export const SB = {
  open: 0,
  say: 7.5,
  money: 11.5,
  bang: 19.5,
  abroad: 27,
  jn: 32,
  reform: 40,
  silence: 48,
  reveal: 48.5,
  usa: 53.5,
  mech: 61.5,
  keep: 72.5,
  climb: 79,
  build: 80.5,
  end: 84.5,
  src: 89.5,
  card: 92.5,
  total: 96.5,
};
export const FILM_FRAMES = fr(S(SB.total));
