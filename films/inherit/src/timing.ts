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
//   SB 0–24 track 8–32 · SB 24–43 track 36–55 (4-bar skip in the repeating main loop; interlude from SB 28;
//   reform on track 48; the last two beats before the reveal dip and darken) · SB 43–75 track 16–48 (main returns
//   on the reveal) · SB 75–87 track 60–72 (build, climax on SB.end) · SB 87–91 track 76–80, fading out
export const SB = {
  open: 0,
  say: 7.5,
  money: 11.5,
  bang: 19.5,
  abroad: 27,
  jn: 29.5,
  reform: 36,
  reveal: 43,
  usa: 50,
  mech: 56,
  keep: 64,
  climb: 73,
  build: 75,
  end: 79,
  src: 84,
  card: 87,
  total: 91,
};
export const FILM_FRAMES = fr(S(SB.total));
