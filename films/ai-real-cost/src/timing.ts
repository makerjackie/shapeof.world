// Music grid (film seconds). Both tracks are measured with tools/beats.py and tools/downbeats.py; the library's own
// bpm field is a generation target and is not used.
//
// A: 《小小发明 · 40》 scene-chamber-40, 115.00 BPM, first beat 0.114 s, F major, 28 bars in 4-bar phrases, no phase
//    drift. Starts at film 0. Bar 4 is the full entry; its own button ending hits on bar 27 beat 3 (57.506 s) and has
//    died away by 58.3 s.
// B: 《温暖电路 · 90》 scene-soul-90, 100.37 BPM, first beat 0.131 s, F major. Starts at film 60.000. Bars 0–3 are
//    chords only (bar 3 nearly silent), bar 4 is the full entry, bar 16 the strongest downbeat, and from bar 24 on it
//    is sustained chords without a steady pulse, so the coda follows the measured chord onsets (CHORD).
export const FPS = 30;

export const A = { bpm: 115.0, first: 0.114, at: 0 };
export const B = { bpm: 100.37, first: 0.131, at: 60.0 };
export const BEAT_A = 60 / A.bpm;
export const BEAT_B = 60 / B.bpm;

// Film second of bar k (fractional k allowed: k + 0.25 is the second beat).
export const barA = (k: number) => A.at + A.first + k * 4 * BEAT_A;
export const barB = (k: number) => B.at + B.first + k * 4 * BEAT_B;

export const A_END_HIT = A.at + 57.506;
export const CHORD = [57.545, 62.433, 67.262, 72.069, 76.881, 81.786].map((s) => B.at + s);
// Extra measured chord onsets inside the coda, used for the second caption line of a pair.
export const CHORD_SUB = { c0b: B.at + 59.687, c1b: B.at + 64.877, c2b: B.at + 69.358 };

// The bar of B that is muted for the second silence (stop-time before the receipts print).
export const MUTE_B = { from: 15, to: 16 };

export const FILM_S = CHORD[4] + 3.3;
export const FILM_FRAMES = Math.round(FILM_S * FPS);

export const fr = (s: number) => Math.round(s * FPS);
