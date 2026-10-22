// Beat grid of the soundtrack (千年之后（氛围版）, 和乐府, 3:01), measured in films/ai-real-cost (tools/beats.py):
// steady 111.62 BPM, first beat 0.487 s, phase drift within ±10 ms over the whole track.
// Track sections (bars): intro 0–8, main 8–40, interlude 40–48, main 48–64, climax 64–76, outro 76–84.
export const FPS = 30;
export const BPM = 111.62;
export const BEAT_S = 60 / BPM;
export const FIRST_BEAT_S = 0.487;
export const MUSIC_S = 181.91;
export const FPB = BEAT_S * FPS;

export const beatToFrame = (beat: number) => Math.round((FIRST_BEAT_S + beat * BEAT_S) * FPS);
export const barToFrame = (bar: number) => beatToFrame(bar * 4);

// The film plays the track in one piece from its bar 2, so film bar b is track bar b + 2: the title lands on
// track bar 8 (main section), the one discovery on track bar 48 (the biggest re-entry), the 升华 on the climax
// (track 64–76) and the brand card on the fade. No cuts inside the track (STYLE.md 三、5).
export const MUSIC_SKIP_BARS = 2;
export const MUSIC_OFFSET = Math.round(MUSIC_SKIP_BARS * 4 * FPB);

// Track frame heard at a film frame (drives the spectrum bars and background pulse).
export const musicFrame = (frame: number) => frame + MUSIC_OFFSET;

// Film length: the track runs out at its own end.
export const MUSIC_END_FRAME = Math.floor(MUSIC_S * FPS) - MUSIC_OFFSET;
