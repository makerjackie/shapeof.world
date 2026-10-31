// The film runs on 千年之后（氛围版）(和乐府), 111.62 BPM, one bar ≈ 2.150 s, from the downbeat of its main section.
// Everything is timed in STORY bars (sb), which run evenly through the film; tools/music.py lays the track under them:
//   sb 0–21    track bars 8–29   (main)        genes, cases, front stage
//   sb 21–25   cut (track bars 29–32 skipped: bar 32 ≈ bar 28, chroma 0.997); the story bars stay numbered
//   sb 25–32   track bars 33–40  (main)        总有人懂, xz begins
//   sb 32–40   track bars 40–48  (interlude)   xz: the backdoor, half a second
//   1 bar of silence                            "这一次，靠的是运气。"
//   sb 40–56   track bars 48–64  (main)        a nurse's shift, the yellow column
//   sb 56–64   track bars 56–64  (main again)  aviation does the opposite (bar 63 ≈ bar 55, chroma 0.98)
//   sb 64–76   track bars 64–76  (climax)      fifty years of red dots, the discovery, the "but", the last line
//   sb 76–78.5 track bars 76–78.5 (fade)       sources, the end card
export const FPS = 30;
export const BPM = 111.62;
export const BEAT = 60 / BPM;
export const BAR = 4 * BEAT;
export const FIRST = 0.487;
export const BREAK_SB = 40;
export const BREAK_BARS = 1;

// Film seconds at a story bar.
export const CUT_A = 21;
export const CUT_B = 25;
const cut = (sb: number) => (sb >= CUT_B ? CUT_B - CUT_A : sb > CUT_A ? sb - CUT_A : 0);
export const S = (sb: number) => FIRST + (sb - cut(sb)) * BAR + (sb >= BREAK_SB ? BREAK_BARS * BAR : 0);
// The silence: from the downbeat of story bar 40 (as if there were no break) until S(40).
export const SIL0 = FIRST + (BREAK_SB - (CUT_B - CUT_A)) * BAR;
export const fr = (s: number) => Math.round(s * FPS);

export const END_SB = 78.5;
export const TAIL = 0.5;
export const FILM_S = S(END_SB) + TAIL;
export const FILM_FRAMES = Math.ceil(FILM_S * FPS);
