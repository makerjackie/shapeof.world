// Beat grid of the original score (music/score.js): 120 BPM, one bar = 2 s = 60 frames.
// Bar 0 starts half a second in, so the opening claim is already on screen at frame 0 and slams on the first beat.
export const FPS = 30;
export const BPM = 120;
export const BEAT_S = 60 / BPM;
export const FIRST_BEAT_S = 0.5;
export const FPB = BEAT_S * FPS;

export const beatToFrame = (beat: number) => Math.round((FIRST_BEAT_S + beat * BEAT_S) * FPS);
export const barToFrame = (bar: number) => beatToFrame(bar * 4);

// The score is rendered to the film's own length, so the music frame is the film frame.
export const musicFrame = (frame: number) => frame;
