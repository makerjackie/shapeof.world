// Two library tracks, measured with tools/music.py (films/DIRECTOR.md 七、音乐):
//  A 隐秘长廊 · 探索 (scene-game-minimalism-exploration): 90.00 BPM, first downbeat 1.011 s, 85.03 s long, 31 bars
//    in 4-bar phrases. Bars 16–19 and 20–23 are the same rising phrase (chroma 0.97, same loudness curve), so
//    the film plays bars 16–19 twice: 4 more bars for the programmer without a new piece of music.
//  B 温暖电路 · 90 (scene-soul-90): 100.36 BPM, first downbeat 0.103 s, 89.52 s long. Bars 0–3 are a sparse
//    piano intro, bar 4 is the one big entry (bass in, +15 dB), full in 4-bar phrases until bar 24, then the
//    highs drop out and it winds down.
// Neither track loops whole, so the film uses A, then a quiet section, then B. B stops for one bar before the
// finding and comes back in at its bar 4: the finding lands on the song's biggest entry, heard a second time
// after a real silence.
export const FPS = 30;

export const A = { id: "scene-game-minimalism-exploration", bpm: 90, down: 1.011, dur: 85.0285 };
export const B = { id: "scene-soul-90", bpm: 100.36, down: 0.103, dur: 89.5216 };

export const A_BAR = (4 * 60) / A.bpm; // 2.6667 s
export const B_BAR = (4 * 60) / B.bpm; // 2.3914 s

// Film second of A's first downbeat. A starts playing at film 0 from (A.down − A_AT) into the master.
// Film bars count straight on; from film bar A_JUMP the track is A_REP bars behind (it replays 16–19).
export const A_AT = 0.1;
export const A_JUMP = 20;
export const A_REP = 4;
export const aBar = (n: number) => A_AT + n * A_BAR;
export const A_END = A_AT + (A.dur - A.down) + A_REP * A_BAR; // film second where A runs out

// The quiet turn between A and B: A's last bar rings out, then only the room and a clock.
export const QUIET_AT = aBar(31 + A_REP);
export const B_AT = aBar(43); // film second of B's bar 0
export const bBar = (m: number) => B_AT + m * B_BAR;

// B part 1 plays bars 0 … B_STOP − 1; one bar of silence; part 2 resumes at bar B_RESUME. Bars 4–19 are heard
// twice, 16 bars: a whole number of phrases (films/DIRECTOR.md 七).
export const B_STOP = 20;
export const B_RESUME = 4;
export const B2_AT = bBar(B_STOP + 1); // film second where part 2 (track bar B_RESUME) starts
export const b2Bar = (m: number) => B2_AT + (m - B_RESUME) * B_BAR;

export const END_CARD_AT = b2Bar(25);
export const FILM_S = END_CARD_AT + 3.4; // the end card holds about 3 s (films/DIRECTOR.md 八)

export const sec = (s: number) => Math.round(s * FPS);
