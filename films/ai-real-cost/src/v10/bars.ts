// Film bars on the 千年之后 grid (111.62 BPM, first beat 0.487 s; one bar = 2.150 s). The music is
// public/music-ep1.wav (tools/music-edit.sh): the track's breakdown sits on film bars 30–38, its return on 38 and its
// peak on 62, so the film's reveal and its zoom-out land on them. Everything in Film10 is timed in film bars.
export const FPS = 30;
export const BAR_S = (4 * 60) / 111.62;
export const FIRST_BEAT_S = 0.487;
export const MUSIC_S = 177.6;

export const sec = (bar: number) => FIRST_BEAT_S + bar * BAR_S; // film bar → seconds
export const bf = (bar: number) => Math.round(sec(bar) * FPS); // film bar → frame
export const barAt = (frame: number) => (frame / FPS - FIRST_BEAT_S) / BAR_S;
