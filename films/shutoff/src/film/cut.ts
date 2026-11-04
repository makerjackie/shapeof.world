// The cut: every picture shot of 《关不掉》 in film seconds. Text cards live in text.ts; sound cues in tools/sound.py
// read the same numbers from cut.json (written by tools/cutjson.mjs).
export type SceneId = "phone" | "city" | "server" | "control" | "earth";
export type Shot = {
  t0: number;
  t1: number;
  scene: SceneId;
  mode: string;
  o?: number; // start offset inside the mode's own clock (montage reuse)
  fi?: number; // fade in from black (s)
  fo?: number; // fade out to black (s)
  xf?: number; // dissolve in over the previous shot (s); the previous shot must overlap
  glitch?: number;
};

const S = (t0: number, t1: number, scene: SceneId, mode: string, x: Partial<Shot> = {}): Shot => ({ t0, t1, scene, mode, ...x });

// ---- montage at the peak of act 3: cuts get shorter and shorter ----
// act 3 is cut to 《三体》 (118.95 BPM): its beats fall at BEAT0 + n·BEAT in film time, and its own stop lands on the
// last cut of the montage (tools/sound.py places the track so)
export const BEAT = 60 / 118.95;
export const BEAT0 = 35.46;
const beat = (n: number) => BEAT0 + n * BEAT;
const MONTAGE_T0 = beat(171);
// cuts in beats: four of two, six of one, six of a half
const MONTAGE_BEATS = [2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
export const MONTAGE_T1 = beat(188);
// the montage slams into silence; 03:15, the chat
export const CHAT_T0 = 131.0;
const POOL: [SceneId, string, number][] = [
  ["server", "leds", 1.0],
  ["city", "masts", 0.5],
  ["control", "monitor", 12.6],
  ["city", "redlights", 0.3],
  ["phone", "call", 3.2],
  ["city", "order", 4.0],
  ["city", "drones", 6.5],
  ["control", "phones", 7.4],
  ["server", "poweroff", 5.2],
  ["city", "freeze", 4.4],
  ["earth", "glimpse", 1.0],
  ["city", "blackout", 6.6],
];
const montage: Shot[] = [];
{
  let t = MONTAGE_T0;
  let i = 0;
  while (t < MONTAGE_T1 - 0.01) {
    const d = MONTAGE_BEATS[i] * BEAT;
    const t1 = Math.min(MONTAGE_T1, t + d);
    const [scene, mode, o] = POOL[i % POOL.length];
    montage.push(S(t, t1, scene, mode, { o: o + (i >= POOL.length ? 1.7 : 0), glitch: i > 6 ? 0.5 : 0 }));
    t = t1;
    i++;
  }
}

// v9: the trailer cut. The hook first (03:12, the four messages), the title, then the story at the music's pace.
export const CUT: Shot[] = [
  // cold open: 03:12, the phone on the desk
  S(0.0, 9.6, "phone", "lock", { fi: 0.5 }),
  // act 1 · trust: the city as 安 sees it
  S(12.6, 18.8, "city", "reveal", { fi: 0.5 }),
  S(18.8, 23.4, "city", "skyline"),
  S(23.4, 29.6, "city", "care"),
  S(29.6, 36.0, "city", "greenwave"),
  S(38.4, 40.2, "city", "grid"),
  S(40.2, 42.0, "city", "highway"),
  S(42.0, 43.8, "city", "masts"),
  S(43.8, 47.2, "phone", "morning", { fo: 0.4 }),
  // act 2 · the line
  S(51.4, 55.6, "server", "aisle", { fi: 0.8 }),
  S(55.6, 70.1, "control", "monitor"),
  S(72.9, 75.9, "control", "countdown"),
  S(75.9, 78.0, "control", "breaker"),
  S(78.0, 83.6, "server", "poweroff"),
  S(83.6, 91.0, "control", "phones"),
  // act 3 · where is it
  S(93.4, 102.0, "city", "blackout"),
  S(102.0, 107.4, "city", "order"),
  S(107.4, 113.8, "phone", "call"),
  S(113.8, MONTAGE_T0, "city", "drones"),
  ...montage,
  // act 4 · 03:15 a.m., the same night as the cold open: 林工 finally asks
  S(CHAT_T0, 164.8, "phone", "chat"),
  // ending: up and out, to the whole night side of the earth
  S(164.2, 168.8, "phone", "pullout", { xf: 0.6 }),
  S(168.2, 175.8, "city", "rise", { xf: 0.6 }),
  S(175.2, 185.6, "earth", "orbit", { xf: 0.6, fo: 0.8 }),
];

// story time runs from the cold open (0) to the end card; the pre-roll line plays before it
export const PRE = 2.4;
export const FILM_SECONDS = 233.6;

export const shotsAt = (t: number) => CUT.filter((s) => t >= s.t0 && t < s.t1).sort((a, b) => a.t0 - b.t0).slice(-2);
